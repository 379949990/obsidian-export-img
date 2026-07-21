import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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
import type { ExportImgSettings, SettleDiagnostic } from '../types';
import { captureElement } from '../pipeline/capture';
import { readReadingViewPadding } from '../pipeline/document-padding';
import { createRenderHost, type RenderHostHandle } from '../pipeline/render-host';
import { settleElement } from '../pipeline/settle-gate';
import { copyBlobToClipboard, saveBlob, saveMultipleBlobs } from '../pipeline/output';
import {
  applyClip,
  calculateSplitPositions,
  getElementMeasures,
  resetClip,
} from '../pipeline/split';
import { AppContext } from './app-context';
import { FidelityPanel } from './fidelity-panel';
import { PreviewPane } from './preview-pane';

function createStudioDraft(plugin: ExportImgPlugin): ExportImgSettings {
  const draft = cloneSettings(plugin.settings);
  draft.padding = readReadingViewPadding();
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
    watermark: settings.watermark,
    author: settings.author,
    settleTimeoutMs: settings.settleTimeoutMs,
  });
}

/** Capture-only options that still refresh the preview bitmap. */
function getPreviewSignature(settings: ExportImgSettings): string {
  return JSON.stringify({
    render: getRenderSignature(settings),
    format: settings.format,
    scale: settings.scale,
    split: settings.split,
  });
}

const RENDER_DEBOUNCE_MS = 280;

function updateModalTitle(titleEl: HTMLElement, settle: SettleDiagnostic | null): void {
  titleEl.empty();
  titleEl.addClass('export-img-modal-titlebar');
  titleEl.createSpan({ cls: 'export-img-modal-title-text', text: t('studio.title') });
  const right = titleEl.createDiv({ cls: 'export-img-modal-title-status' });
  if (!settle) {
    right.createSpan({
      cls: 'export-img-title-pill is-idle',
      text: t('studio.settle.idle'),
    });
    return;
  }
  right.createSpan({
    cls: `export-img-title-pill is-${settle.status}`,
    text: t(`studio.settle.${settle.status}`),
  });
  right.createSpan({
    cls: 'export-img-title-meta',
    text: `${settle.elapsedMs}ms`,
  });
}

function StudioApp(
  props: StudioOpenArgs & { onClose: () => void; titleEl: HTMLElement },
) {
  const { app, plugin, markdown, file, frontmatter, type, titleEl } = props;
  const [draft, setDraft] = useState<ExportImgSettings>(() => createStudioDraft(plugin));
  const [settle, setSettle] = useState<SettleDiagnostic | null>(null);
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewSignature = getPreviewSignature(draft);
  const [debouncedSignature, setDebouncedSignature] = useState(previewSignature);
  const hostRef = useRef<RenderHostHandle | null>(null);
  const renderSlotRef = useRef<HTMLDivElement | null>(null);
  const renderToken = useRef(0);
  const settleAbortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);
  const previewUrlRef = useRef<string | null>(null);
  draftRef.current = draft;

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSignature(previewSignature);
    }, RENDER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [previewSignature]);

  const rerender = useCallback(async () => {
    const slot = renderSlotRef.current;
    if (!slot) return;
    const settings = draftRef.current;
    const token = ++renderToken.current;
    setRendering(true);
    setSettle({
      status: 'waiting',
      pendingImages: 0,
      pendingFonts: false,
      layoutStable: false,
      elapsedMs: 0,
      warnings: [],
    });

    destroyHost();
    const settleAbort = new AbortController();
    settleAbortRef.current = settleAbort;

    try {
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
      if (token !== renderToken.current || settleAbort.signal.aborted) {
        host.destroy();
        return;
      }
      hostRef.current = host;

      const diag = await settleElement(host.captureEl, {
        timeoutMs: settings.settleTimeoutMs,
        signal: settleAbort.signal,
        onUpdate: (d) => {
          if (token === renderToken.current) {
            setSettle({
              ...d,
              warnings: [...host.remoteWarnings, ...d.warnings],
            });
          }
        },
      });
      if (token !== renderToken.current) return;

      setSettle({
        ...diag,
        warnings: [...host.remoteWarnings, ...diag.warnings],
      });

      // Build a real bitmap preview (PNG @ 1x for speed/clarity in the viewer).
      const blob = await captureElement(host.captureEl, {
        scale: 1,
        format: 'png',
      });
      if (token !== renderToken.current) return;

      revokePreviewUrl();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setRendering(false);
    } catch (error) {
      console.error(error);
      if (token === renderToken.current) {
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
  }, [app, markdown, file, frontmatter, type, debouncedSignature]);

  useEffect(() => {
    void rerender();
    return () => {
      renderToken.current++;
      destroyHost();
    };
  }, [rerender]);

  useEffect(() => () => revokePreviewUrl(), []);

  const onChange = (patch: Partial<ExportImgSettings>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const onNestedChange = <K extends keyof ExportImgSettings>(
    key: K,
    patch: Partial<ExportImgSettings[K]>,
  ) => {
    setDraft((prev) => {
      const current = prev[key];
      if (current && typeof current === 'object') {
        return {
          ...prev,
          [key]: { ...(current as object), ...patch },
        };
      }
      return { ...prev, [key]: patch as ExportImgSettings[K] };
    });
  };

  const onResetPadding = () => {
    setDraft((prev) => ({
      ...prev,
      padding: readReadingViewPadding(),
    }));
  };

  const captureAll = async (): Promise<{ blob: Blob; index?: number }[]> => {
    const host = hostRef.current;
    if (!host) throw new Error('Host not ready');

    const scale = scaleToNumber(draft.scale);
    const { captureEl, contentEl } = host;
    const totalHeight = contentEl.scrollHeight;
    const measures = getElementMeasures(contentEl, draft.split.mode);
    const positions = calculateSplitPositions(draft.split, totalHeight, measures);

    if (positions.length === 1 && draft.split.mode === 'none') {
      const blob = await captureElement(captureEl, {
        scale,
        format: draft.format,
      });
      return [{ blob }];
    }

    const results: { blob: Blob; index?: number }[] = [];

    try {
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i]!;
        applyClip(captureEl, contentEl, pos.startY, pos.height);
        await new Promise((r) => setTimeout(r, 30));
        const blob = await captureElement(captureEl, {
          scale,
          format: draft.format,
        });
        results.push({ blob, index: positions.length > 1 ? i + 1 : undefined });
      }
    } finally {
      resetClip(captureEl, contentEl);
    }

    return results;
  };

  const onCopy = async () => {
    setBusy(true);
    try {
      const parts = await captureAll();
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
      const parts = await captureAll();
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
      <PreviewPane imageUrl={previewUrl} rendering={rendering || busy} />
      <FidelityPanel
        draft={draft}
        busy={busy || rendering}
        onChange={onChange}
        onNestedChange={onNestedChange}
        onResetPadding={onResetPadding}
        onCopy={() => void onCopy()}
        onSave={() => void onSave()}
      />
    </div>
  );
}

export class ExportStudioModal extends Modal {
  private root: Root | null = null;
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
      <StrictMode>
        <AppContext.Provider value={{ app: this.args.app, plugin: this.args.plugin }}>
          <StudioApp
            {...this.args}
            titleEl={this.titleEl}
            onClose={() => this.close()}
          />
        </AppContext.Provider>
      </StrictMode>,
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
  settings.padding = readReadingViewPadding();

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
