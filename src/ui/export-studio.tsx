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
  // Prefer live reading-view padding over stored fallback.
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

/** Fields that require rebuilding the reading-view host (not capture-only options). */
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

const RENDER_DEBOUNCE_MS = 280;

function StudioApp(props: StudioOpenArgs & { onClose: () => void }) {
  const { app, plugin, markdown, file, frontmatter, type } = props;
  const [draft, setDraft] = useState<ExportImgSettings>(() => createStudioDraft(plugin));
  const [settle, setSettle] = useState<SettleDiagnostic | null>(null);
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState(false);
  const renderSignature = getRenderSignature(draft);
  const [debouncedSignature, setDebouncedSignature] = useState(renderSignature);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<RenderHostHandle | null>(null);
  const renderToken = useRef(0);
  const settleAbortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const destroyHost = () => {
    settleAbortRef.current?.abort();
    settleAbortRef.current = null;
    hostRef.current?.destroy();
    hostRef.current = null;
  };

  // Debounce preview rebuilds so typing width/watermark does not thrash MarkdownRenderer.
  // format / scale / split are capture-only and intentionally omitted from the signature.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSignature(renderSignature);
    }, RENDER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [renderSignature]);

  const rerender = useCallback(async () => {
    const mount = mountRef.current;
    if (!mount) return;
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
        mountEl: mount,
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
      if (token === renderToken.current) {
        setSettle({
          ...diag,
          warnings: [...host.remoteWarnings, ...diag.warnings],
        });
        setRendering(false);
      }
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
      // Persist studio choices as new defaults
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
      <PreviewPane mountRef={mountRef} rendering={rendering || busy} />
      <FidelityPanel
        draft={draft}
        settle={settle}
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
    this.setTitle(t('studio.title'));
    this.modalEl.addClass('export-img-modal');
    this.root = createRoot(this.contentEl);
    this.root.render(
      <StrictMode>
        <AppContext.Provider value={{ app: this.args.app, plugin: this.args.plugin }}>
          <StudioApp {...this.args} onClose={() => this.close()} />
        </AppContext.Provider>
      </StrictMode>,
    );
  }

  onClose(): void {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}

export async function openExportStudio(args: StudioOpenArgs): Promise<void> {
  new ExportStudioModal(args).open();
}

/** Quick path: render offscreen and copy without opening studio. */
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
