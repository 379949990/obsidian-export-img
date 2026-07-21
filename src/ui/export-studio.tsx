import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { createRoot } from 'preact/compat/client';
import {
  Modal,
  Notice,
  type App,
  type FrontMatterCache,
  type TFile,
} from 'obsidian';
import type ExportImgPlugin from '../main';
import { t } from '../i18n';
import { cloneSettings, scaleToNumber } from '../settings';
import type {
  ExportImgSettings,
  PaddingSettings,
  SettleDiagnostic,
} from '../types';
import { captureElement } from '../pipeline/capture';
import { readReadingViewPadding } from '../pipeline/document-padding';
import {
  prepareEmbedLayout,
  waitForNextPaint,
} from '../pipeline/overflow';
import { createRenderHost, type RenderHostHandle } from '../pipeline/render-host';
import { settleElement } from '../pipeline/settle-gate';
import { copyBlobToClipboard, saveBlob, saveMultipleBlobs } from '../pipeline/output';
import {
  applyPageBlocks,
  defaultSplitHeight,
  getAtomicBlocks,
  paginateBlocks,
  resetPageBlocks,
  resolveSplitHeight,
} from '../pipeline/split';
import { AppContext } from './app-context';
import { FidelityPanel } from './fidelity-panel';
import { PreviewPane } from './preview-pane';

function createStudioDraft(plugin: ExportImgPlugin): ExportImgSettings {
  const draft = cloneSettings(plugin.settings);
  if (draft.split.height <= 0) {
    draft.split.height = defaultSplitHeight(draft.width);
  }
  return draft;
}

export interface StudioOpenArgs {
  app: App;
  plugin: ExportImgPlugin;
  markdown: string;
  file: TFile;
  frontmatter?: FrontMatterCache;
  type: 'file' | 'selection';
}

function getRenderSignature(settings: ExportImgSettings): string {
  return JSON.stringify({
    width: settings.width,
    themeMode: settings.themeMode,
    showFilename: settings.showFilename,
    showMetadata: settings.showMetadata,
    padding: settings.padding,
    embedMaxHeight: settings.embedMaxHeight,
    embedAlign: settings.embedAlign,
    watermark: settings.watermark,
    author: settings.author,
    settleTimeoutMs: settings.settleTimeoutMs,
  });
}

function getCaptureSignature(settings: ExportImgSettings): string {
  // Scale is export-only — preview always captures at 1× for speed.
  return JSON.stringify({
    format: settings.format,
    split: settings.split,
  });
}

function getExportCacheKey(settings: ExportImgSettings): string {
  return JSON.stringify({
    render: getRenderSignature(settings),
    format: settings.format,
    scale: settings.scale,
    split: settings.split,
  });
}

const RENDER_DEBOUNCE_MS = 400;

function updateModalTitle(titleEl: HTMLElement, settle: SettleDiagnostic | null): void {
  titleEl.empty();
  titleEl.addClass('export-img-modal-titlebar');

  const left = titleEl.createDiv({ cls: 'export-img-modal-title-left' });
  left.createSpan({ cls: 'export-img-modal-title-text', text: t('studio.title') });

  const status = left.createDiv({ cls: 'export-img-modal-title-status' });
  if (!settle) {
    status.createSpan({
      cls: 'export-img-title-pill is-idle',
      text: t('studio.settle.idle'),
    });
  } else {
    status.createSpan({
      cls: `export-img-title-pill is-${settle.status}`,
      text: t(`studio.settle.${settle.status}`),
    });
    if (settle.status === 'ready' || settle.status === 'timed_out') {
      status.createSpan({
        cls: 'export-img-title-meta',
        text: `${settle.elapsedMs}ms`,
      });
    }
  }
}

function StudioApp(
  props: StudioOpenArgs & { onClose: () => void; titleEl: HTMLElement },
) {
  const { app, plugin, markdown, file, frontmatter, type, titleEl } = props;
  const presetPaddingRef = useRef<PaddingSettings>({ ...plugin.settings.padding });
  const [draft, setDraft] = useState<ExportImgSettings>(() => createStudioDraft(plugin));
  const [paddingMode, setPaddingMode] = useState<'preset' | 'document'>('preset');
  const [settle, setSettle] = useState<SettleDiagnostic | null>(null);
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const workSignature = `${getRenderSignature(draft)}@@${getCaptureSignature(draft)}`;
  const [debouncedWorkSig, setDebouncedWorkSig] = useState(workSignature);

  const hostRef = useRef<RenderHostHandle | null>(null);
  const renderSlotRef = useRef<HTMLDivElement | null>(null);
  const workToken = useRef(0);
  const settleAbortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);
  const previewUrlsRef = useRef<string[]>([]);
  const exportBlobsRef = useRef<{ blob: Blob; index?: number }[] | null>(null);
  const exportSigRef = useRef<string | null>(null);
  const appliedRenderSigRef = useRef<string>('');
  draftRef.current = draft;

  const revokePreviewUrls = () => {
    for (const url of previewUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    previewUrlsRef.current = [];
  };

  const destroyHost = () => {
    settleAbortRef.current?.abort();
    settleAbortRef.current = null;
    hostRef.current?.destroy();
    hostRef.current = null;
  };

  useEffect(() => {
    updateModalTitle(titleEl, settle);
  }, [titleEl, settle]);

  const firstWorkPass = useRef(true);
  useEffect(() => {
    if (firstWorkPass.current) {
      firstWorkPass.current = false;
      setDebouncedWorkSig(workSignature);
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedWorkSig(workSignature);
    }, RENDER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [workSignature]);

  const capturePages = useCallback(
    async (
      kind: 'preview' | 'export',
      opts?: { skipPrepare?: boolean },
    ): Promise<{ blob: Blob; index?: number }[]> => {
      const host = hostRef.current;
      if (!host) throw new Error('Host not ready');
      const settings = draftRef.current;
      const { captureEl, contentEl } = host;

      if (!opts?.skipPrepare) {
        prepareEmbedLayout(host.rootEl, settings.embedMaxHeight, settings.embedAlign);
        await waitForNextPaint();
      }

      const scale = kind === 'preview' ? 1 : scaleToNumber(settings.scale);
      const skipFontEmbed = kind === 'preview';
      const captureOpts = { scale, format: settings.format };

      if (settings.split.mode === 'none') {
        const blob = await captureElement(captureEl, captureOpts, { skipFontEmbed });
        return [{ blob }];
      }

      const maxH = resolveSplitHeight(settings.split, settings.width);
      const allBlocks = getAtomicBlocks(contentEl);
      const pages = paginateBlocks(allBlocks, maxH, settings.split.mode);
      const results: { blob: Blob; index?: number }[] = [];

      try {
        for (let i = 0; i < pages.length; i++) {
          const pageBlocks = pages[i]!;
          if (pageBlocks.length === 0) continue;
          applyPageBlocks(allBlocks, pageBlocks, captureEl, settings.padding);
          await waitForNextPaint();
          const blob = await captureElement(captureEl, captureOpts, { skipFontEmbed });
          results.push({
            blob,
            index: pages.length > 1 ? i + 1 : undefined,
          });
        }
      } finally {
        resetPageBlocks(allBlocks, captureEl, settings.padding);
      }

      return results.length > 0
        ? results
        : [
            {
              blob: await captureElement(captureEl, captureOpts, { skipFontEmbed }),
            },
          ];
    },
    [],
  );

  const publishPreview = useCallback((parts: { blob: Blob; index?: number }[]) => {
    revokePreviewUrls();
    const urls = parts.map((p) => URL.createObjectURL(p.blob));
    previewUrlsRef.current = urls;
    setPreviewUrls(urls);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = ++workToken.current;

    const run = async () => {
      await waitForNextPaint();
      if (cancelled || token !== workToken.current) return;

      const settings = draftRef.current;
      const renderSig = getRenderSignature(settings);
      const needsRebuild =
        !hostRef.current || appliedRenderSigRef.current !== renderSig;

      setRendering(true);
      if (needsRebuild) {
        setPreviewUrls([]);
        exportBlobsRef.current = null;
        exportSigRef.current = null;
      }
      setSettle({
        status: 'waiting',
        pendingImages: 0,
        pendingFonts: false,
        layoutStable: false,
        elapsedMs: 0,
        warnings: [],
      });

      const startedAt = performance.now();

      try {
        if (needsRebuild) {
          destroyHost();
          const slot = renderSlotRef.current;
          if (!slot) return;

          const settleAbort = new AbortController();
          settleAbortRef.current = settleAbort;

          const host = await createRenderHost({
            app,
            markdown,
            sourcePath: file.path,
            title: file.basename,
            frontmatter: type === 'selection' ? undefined : frontmatter,
            settings,
            mountEl: slot,
            width: settings.width,
            themeMode: settings.themeMode,
          });
          if (cancelled || token !== workToken.current || settleAbort.signal.aborted) {
            host.destroy();
            return;
          }
          hostRef.current = host;

          await waitForNextPaint();

          const diag = await settleElement(host.captureEl, {
            timeoutMs: settings.settleTimeoutMs,
            signal: settleAbort.signal,
            onUpdate: (d) => {
              if (token === workToken.current) {
                setSettle({
                  ...d,
                  status: d.status === 'timed_out' ? 'timed_out' : 'waiting',
                  elapsedMs: 0,
                  warnings: [...host.remoteWarnings, ...d.warnings],
                });
              }
            },
          });
          if (cancelled || token !== workToken.current) return;

          prepareEmbedLayout(host.rootEl, settings.embedMaxHeight, settings.embedAlign);
          await waitForNextPaint();
          appliedRenderSigRef.current = renderSig;

          const parts = await capturePages('preview', { skipPrepare: true });
          if (cancelled || token !== workToken.current) return;
          if (!parts[0]?.blob || parts[0].blob.size < 32) {
            throw new Error('Preview capture returned an empty image');
          }

          exportBlobsRef.current = null;
          exportSigRef.current = null;
          publishPreview(parts);
          setSettle({
            ...diag,
            status: diag.status === 'timed_out' ? 'timed_out' : 'ready',
            elapsedMs: Math.round(performance.now() - startedAt),
            warnings: [...host.remoteWarnings, ...diag.warnings],
          });
          setRendering(false);
          return;
        }

        // Capture-only path: reuse settled DOM (format / split changes).
        const host = hostRef.current!;
        const parts = await capturePages('preview');
        if (cancelled || token !== workToken.current) return;
        if (!parts[0]?.blob || parts[0].blob.size < 32) {
          throw new Error('Preview capture returned an empty image');
        }
        exportBlobsRef.current = null;
        exportSigRef.current = null;
        publishPreview(parts);
        setSettle({
          status: 'ready',
          pendingImages: 0,
          pendingFonts: false,
          layoutStable: true,
          elapsedMs: Math.round(performance.now() - startedAt),
          warnings: [...host.remoteWarnings],
        });
        setRendering(false);
      } catch (error) {
        console.error(error);
        if (token === workToken.current) {
          setRendering(false);
          setSettle({
            status: 'timed_out',
            pendingImages: 0,
            pendingFonts: false,
            layoutStable: false,
            elapsedMs: 0,
            warnings: [String(error)],
          });
          new Notice(t('notice.exportFail'));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      workToken.current++;
      settleAbortRef.current?.abort();
    };
  }, [debouncedWorkSig, app, markdown, file, frontmatter, type, capturePages, publishPreview]);

  useEffect(
    () => () => {
      destroyHost();
      revokePreviewUrls();
    },
    [],
  );

  const onChange = (patch: Partial<ExportImgSettings>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (typeof patch.width === 'number' && patch.width !== prev.width) {
        const prevDefault = defaultSplitHeight(prev.width);
        if (
          (prev.split.mode === 'fixed' || prev.split.mode === 'auto') &&
          prev.split.height === prevDefault
        ) {
          next.split = { ...prev.split, height: defaultSplitHeight(patch.width) };
        }
      }
      return next;
    });
    if (patch.padding) setPaddingMode('preset');
  };

  const onNestedChange = <K extends keyof ExportImgSettings>(
    key: K,
    patch: Partial<ExportImgSettings[K]>,
  ) => {
    setDraft((prev) => {
      const current = prev[key];
      let nextVal: ExportImgSettings[K];
      if (current && typeof current === 'object') {
        nextVal = { ...(current as object), ...patch } as ExportImgSettings[K];
      } else {
        nextVal = patch as ExportImgSettings[K];
      }
      const next = { ...prev, [key]: nextVal };
      if (key === 'split') {
        const splitPatch = patch as Partial<ExportImgSettings['split']>;
        if (splitPatch.mode === 'fixed' || splitPatch.mode === 'auto') {
          // Preserve an explicit height; only fill A4 default when unset.
          if (!(next.split.height > 0)) {
            next.split = {
              ...next.split,
              height: defaultSplitHeight(next.width),
            };
          }
        }
      }
      return next;
    });
    if (key === 'padding') setPaddingMode('preset');
  };

  const onTogglePadding = () => {
    if (paddingMode === 'preset') {
      setDraft((prev) => ({
        ...prev,
        padding: readReadingViewPadding(),
      }));
      setPaddingMode('document');
    } else {
      setDraft((prev) => ({
        ...prev,
        padding: { ...presetPaddingRef.current },
      }));
      setPaddingMode('preset');
    }
  };

  useEffect(() => {
    if (paddingMode === 'preset') {
      presetPaddingRef.current = { ...draft.padding };
    }
  }, [draft.padding, paddingMode]);

  const onCopy = async () => {
    setBusy(true);
    try {
      const sig = getExportCacheKey(draft);
      let parts = exportBlobsRef.current;
      if (!parts || exportSigRef.current !== sig) {
        // Reuse settled DOM — no Markdown re-render; capture at export scale with fonts.
        parts = await capturePages('export');
        exportBlobsRef.current = parts;
        exportSigRef.current = sig;
      }
      if (parts.length !== 1) {
        new Notice(t('notice.copyFail'));
        return;
      }
      await copyBlobToClipboard(parts[0]!.blob);
    } catch (error) {
      console.error(error);
      new Notice(t('notice.copyFail'));
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    setBusy(true);
    try {
      const sig = getExportCacheKey(draft);
      let parts = exportBlobsRef.current;
      if (!parts || exportSigRef.current !== sig) {
        parts = await capturePages('export');
        exportBlobsRef.current = parts;
        exportSigRef.current = sig;
      }
      if (parts.length === 1) {
        await saveBlob(app, parts[0]!.blob, file.basename, draft.format);
      } else {
        await saveMultipleBlobs(
          app,
          parts.map((p) => ({
            blob: p.blob,
            title: file.basename,
            format: draft.format,
            index: p.index,
          })),
          file.basename,
        );
      }
      plugin.settings = cloneSettings(draft);
      presetPaddingRef.current = { ...draft.padding };
      await plugin.saveSettings();
    } catch (error) {
      console.error(error);
      new Notice(t('notice.saveFail'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="export-img-studio">
      <div className="export-img-render-slot" ref={renderSlotRef} aria-hidden="true" />
      <PreviewPane imageUrls={previewUrls} rendering={rendering || busy} />
      <FidelityPanel
        draft={draft}
        busy={busy || rendering}
        paddingMode={paddingMode}
        onChange={onChange}
        onNestedChange={onNestedChange}
        onTogglePadding={onTogglePadding}
        onCopy={() => void onCopy()}
        onSave={() => void onSave()}
      />
    </div>
  );
}

export class ExportStudioModal extends Modal {
  private root: ReturnType<typeof createRoot> | null = null;
  private readonly args: StudioOpenArgs;

  constructor(args: StudioOpenArgs) {
    super(args.app);
    this.args = args;
  }

  onOpen(): void {
    this.modalEl.addClass('export-img-modal');
    this.titleEl.addClass('export-img-modal-titlebar');
    updateModalTitle(this.titleEl, null);
    this.root = createRoot(this.contentEl);
    this.root.render(
      <AppContext.Provider value={{ app: this.args.app, plugin: this.args.plugin }}>
        <StudioApp
          {...this.args}
          titleEl={this.titleEl}
          onClose={() => this.close()}
        />
      </AppContext.Provider>,
    );
  }

  onClose(): void {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
    this.titleEl.empty();
  }
}

export async function openExportStudio(args: StudioOpenArgs): Promise<void> {
  new ExportStudioModal(args).open();
}

export async function quickCopySelection(args: StudioOpenArgs): Promise<void> {
  const { app, plugin, markdown, file } = args;
  const settings = cloneSettings(plugin.settings);
  settings.showFilename = false;
  settings.showMetadata = false;
  settings.split = { ...settings.split, mode: 'none' };

  const holder = document.body.createDiv({ cls: 'export-img-offscreen' });
  try {
    const host = await createRenderHost({
      app,
      markdown,
      sourcePath: file.path,
      title: file.basename,
      settings,
      mountEl: holder,
      width: settings.width,
      themeMode: settings.themeMode,
    });
    await settleElement(host.captureEl, { timeoutMs: settings.settleTimeoutMs });
    prepareEmbedLayout(host.rootEl, settings.embedMaxHeight, settings.embedAlign);
    await waitForNextPaint();
    const blob = await captureElement(host.captureEl, {
      scale: scaleToNumber(settings.scale),
      format: settings.format,
    });
    await copyBlobToClipboard(blob);
    host.destroy();
  } catch (error) {
    console.error(error);
    new Notice(t('notice.copyFail'));
  } finally {
    holder.remove();
  }
}
