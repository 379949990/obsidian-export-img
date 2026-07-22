import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { createRoot } from 'preact/compat/client';
import {
  Modal,
  Notice,
  Platform,
  type App,
  type FrontMatterCache,
  type TFile,
} from 'obsidian';
import type ExportImgPlugin from '../main';
import { t } from '../i18n';
import { cloneSettings } from '../settings';
import type {
  ExportImgSettings,
  PaddingSettings,
  SettleDiagnostic,
} from '../types';
import { readReadingViewPadding } from '../pipeline/document-padding';
import {
  prepareEmbedLayout,
  waitForNextPaint,
} from '../pipeline/overflow';
import { createRenderHost, type RenderHostHandle } from '../pipeline/render-host';
import type { RemoteHydrateProgress } from '../pipeline/remote-images';
import { settleElement } from '../pipeline/settle-gate';
import { copyBlobToClipboard, saveBlob, saveMultipleBlobs } from '../pipeline/output';
import { defaultSplitHeight } from '../pipeline/split';
import { resolveSettleTimeoutMs } from '../pipeline/mobile-limits';
import { AppContext } from './app-context';
import { FidelityPanel } from './fidelity-panel';
import { PreviewPane, type PreviewRenderProgress } from './preview-pane';
import {
  assertNonEmptyCapture,
  captureStudioPages,
  getExportCacheKey,
  getRenderSignature,
  getWorkSignature,
  resolvePreviewPhase,
  type CapturePagePart,
  type CaptureStudioResult,
} from './studio-pipeline';

function createStudioDraft(plugin: ExportImgPlugin): ExportImgSettings {
  const draft = cloneSettings(plugin.settings);
  // Studio toggles are session-only — never open with watermark/author pre-checked.
  draft.watermark.enable = false;
  draft.author.show = false;
  if (draft.split.height <= 0) {
    draft.split.height = defaultSplitHeight(draft.width);
  }
  return draft;
}

/** Persist preconfig from Studio without carrying session decoration toggles. */
function settingsToPersist(draft: ExportImgSettings): ExportImgSettings {
  const next = cloneSettings(draft);
  next.watermark.enable = false;
  next.author.show = false;
  return next;
}

export interface StudioOpenArgs {
  app: App;
  plugin: ExportImgPlugin;
  markdown: string;
  file: TFile;
  frontmatter?: FrontMatterCache;
  type: 'file' | 'selection';
}

const RENDER_DEBOUNCE_MS = 400;

interface TitlebarState {
  settle: SettleDiagnostic | null;
  remoteHint: string | null;
}

function notifyMobileCaptureFlags(
  result: CaptureStudioResult,
  flags: {
    megaBlock: boolean;
    canvasRisk: boolean;
  },
): void {
  if (result.mobileMegaBlock) {
    if (!flags.megaBlock) {
      flags.megaBlock = true;
      new Notice(t('notice.mobileMegaBlock'), 8000);
    }
  } else {
    flags.megaBlock = false;
  }
  if (result.mobileCanvasRisk) {
    if (!flags.canvasRisk) {
      flags.canvasRisk = true;
      new Notice(t('notice.mobileCanvasRisk'), 8000);
    }
  } else {
    flags.canvasRisk = false;
  }
}

function updateModalTitle(titleEl: HTMLElement, state: TitlebarState): void {
  titleEl.empty();
  titleEl.addClass('export-img-modal-titlebar');

  const left = titleEl.createDiv({ cls: 'export-img-modal-title-left' });
  left.createSpan({ cls: 'export-img-modal-title-text', text: t('studio.title') });

  const status = left.createDiv({ cls: 'export-img-modal-title-status' });
  if (!state.settle) {
    status.createSpan({
      cls: 'export-img-title-pill is-idle',
      text: t('studio.settle.idle'),
    });
  } else {
    status.createSpan({
      cls: `export-img-title-pill is-${state.settle.status}`,
      text: t(`studio.settle.${state.settle.status}`),
    });
    if (state.settle.status === 'ready' || state.settle.status === 'timed_out') {
      status.createSpan({
        cls: 'export-img-title-meta',
        text: `${state.settle.elapsedMs}ms`,
      });
    }
  }

  if (state.remoteHint) {
    status.createSpan({
      cls: 'export-img-title-meta is-remote-loading',
      text: state.remoteHint,
    });
  }
}

function StudioApp(
  props: StudioOpenArgs & { titleEl: HTMLElement },
) {
  const { app, plugin, markdown, file, frontmatter, type, titleEl } = props;
  const presetPaddingRef = useRef<PaddingSettings>({ ...plugin.settings.padding });
  const [draft, setDraft] = useState<ExportImgSettings>(() => createStudioDraft(plugin));
  const [paddingMode, setPaddingMode] = useState<'preset' | 'document'>('preset');
  const [settle, setSettle] = useState<SettleDiagnostic | null>(null);
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [remoteHint, setRemoteHint] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [exportDespiteTimeout, setExportDespiteTimeout] = useState(false);
  /** Forces re-render when Obsidian shell theme flips and themeMode is `current`. */
  const [shellThemeTick, setShellThemeTick] = useState(0);

  const workSignature = getWorkSignature(draft);
  // Re-render on shell theme tick so themeScheme inside the signature refreshes.
  void shellThemeTick;
  const [debouncedWorkSig, setDebouncedWorkSig] = useState(workSignature);

  const hostRef = useRef<RenderHostHandle | null>(null);
  const renderSlotRef = useRef<HTMLDivElement | null>(null);
  const workToken = useRef(0);
  const settleAbortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);
  const previewUrlsRef = useRef<string[]>([]);
  const exportBlobsRef = useRef<CapturePagePart[] | null>(null);
  const exportSigRef = useRef<string | null>(null);
  const mobileNoticeFlagsRef = useRef({
    megaBlock: false,
    canvasRisk: false,
  });
  const [previewStale, setPreviewStale] = useState(false);
  const [renderProgress, setRenderProgress] = useState<PreviewRenderProgress | null>(null);
  const appliedRenderSigRef = useRef<string>('');
  const commitTimerRef = useRef<number | null>(null);
  const previewWaitersRef = useRef<Array<(ok: boolean) => void>>([]);
  const busyRef = useRef(false);
  const autoRerender = plugin.settings.autoRerenderPreview;
  draftRef.current = draft;

  const resolvePreviewWaiters = (ok: boolean) => {
    const waiters = previewWaitersRef.current;
    if (waiters.length === 0) return;
    previewWaitersRef.current = [];
    for (const resolve of waiters) resolve(ok);
  };

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

  const onRefreshPreview = useCallback(() => {
    if (rendering) return;
    if (commitTimerRef.current != null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    appliedRenderSigRef.current = '';
    setPreviewStale(false);
    setDebouncedWorkSig(getWorkSignature(draftRef.current));
    // Do not reset pan/zoom — only first open + double-click/tap re-fit.
    setRefreshNonce((n) => n + 1);
  }, [rendering]);

  /** Kick (or await) a preview pass so host DOM matches the current draft. */
  const ensureHostMatchesDraft = useCallback((): Promise<boolean> => {
    const want = getRenderSignature(draftRef.current);
    const hostReady =
      !!hostRef.current &&
      appliedRenderSigRef.current === want &&
      !previewStale;

    if (hostReady && !rendering) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      previewWaitersRef.current.push(resolve);
      if (!hostReady) {
        if (commitTimerRef.current != null) {
          window.clearTimeout(commitTimerRef.current);
          commitTimerRef.current = null;
        }
        if (appliedRenderSigRef.current !== want) {
          appliedRenderSigRef.current = '';
        }
        // Keep previewStale until the work effect succeeds — banner stays accurate.
        setDebouncedWorkSig(getWorkSignature(draftRef.current));
        setRefreshNonce((n) => n + 1);
      }
      // else: an in-flight render for this draft will resolve waiters when done
    });
  }, [previewStale, rendering]);

  const onCommitPreview = useCallback(() => {
    if (commitTimerRef.current != null) {
      window.clearTimeout(commitTimerRef.current);
    }
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      setPreviewStale(false);
      setDebouncedWorkSig(getWorkSignature(draftRef.current));
    }, RENDER_DEBOUNCE_MS);
  }, []);

  const invalidateExportCache = () => {
    exportBlobsRef.current = null;
    exportSigRef.current = null;
  };

  useEffect(() => {
    updateModalTitle(titleEl, {
      settle,
      remoteHint,
    });
  }, [titleEl, settle, remoteHint]);

  // When following the app theme, rebuild when Obsidian toggles light/dark.
  useEffect(() => {
    if (draft.themeMode !== 'current') return;
    const onCssChange = () => {
      setShellThemeTick((n) => n + 1);
      invalidateExportCache();
      if (plugin.settings.autoRerenderPreview) {
        onCommitPreview();
      } else {
        setPreviewStale(true);
      }
    };
    const ref = app.workspace.on('css-change', onCssChange);
    return () => {
      app.workspace.offref(ref);
    };
  }, [app, draft.themeMode, onCommitPreview, plugin.settings.autoRerenderPreview]);

  const publishPreview = useCallback((parts: CapturePagePart[]) => {
    revokePreviewUrls();
    const urls = parts.map((p) => URL.createObjectURL(p.blob));
    previewUrlsRef.current = urls;
    setPreviewUrls(urls);
  }, []);

  const firstWorkPass = useRef(true);
  useEffect(() => {
    if (firstWorkPass.current) {
      firstWorkPass.current = false;
      setDebouncedWorkSig(workSignature);
      return;
    }
    // Config changed: mark stale until refresh (or until panel commits when auto-on).
    invalidateExportCache();
    if (!autoRerender) {
      setPreviewStale(true);
    }
  }, [workSignature, autoRerender]);

  useEffect(() => {
    let cancelled = false;
    const token = ++workToken.current;

    const setProgress = (ratio: number, label: string) => {
      if (token !== workToken.current) return;
      setRenderProgress({ ratio, label });
    };

    const run = async () => {
      await waitForNextPaint();
      if (cancelled || token !== workToken.current) return;

      const settings = draftRef.current;
      const { phase, renderSig } = resolvePreviewPhase(
        hostRef.current,
        appliedRenderSigRef.current,
        settings,
      );

      setRendering(true);
      setRenderProgress({ ratio: 0.02, label: t('studio.progress.render') });
      setRemoteHint(null);
      setExportDespiteTimeout(false);
      if (phase === 'rebuild') {
        invalidateExportCache();
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
        if (phase === 'rebuild') {
          destroyHost();
          const slot = renderSlotRef.current;
          if (!slot) {
            resolvePreviewWaiters(false);
            setRendering(false);
            setRenderProgress(null);
            return;
          }

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

          const onRemoteProgress = (progress: RemoteHydrateProgress) => {
            if (token !== workToken.current) return;
            if (progress.loading && progress.total > 0) {
              const frac = progress.done / progress.total;
              setProgress(0.05 + frac * 0.35, t('studio.progress.hydrate', {
                done: progress.done,
                total: progress.total,
              }));
              setRemoteHint(
                t('studio.remote.loading', {
                  done: progress.done,
                  total: progress.total,
                }),
              );
            } else {
              setRemoteHint(null);
            }
          };

          // Hydrate remotes (session-cached) before the first preview capture.
          if (host.remotePending > 0) {
            setProgress(0.05, t('studio.progress.hydrate', {
              done: 0,
              total: host.remotePending,
            }));
            setRemoteHint(
              t('studio.remote.loading', {
                done: 0,
                total: host.remotePending,
              }),
            );
          } else {
            setProgress(0.4, t('studio.progress.settle'));
          }
          const hydrateResult = await host.hydrateRemotes({
            onProgress: onRemoteProgress,
          });
          if (cancelled || token !== workToken.current || settleAbort.signal.aborted) {
            return;
          }
          setRemoteHint(null);
          if (hydrateResult.warnings.length > 0) {
            new Notice(
              t('notice.remotePartial', { count: hydrateResult.warnings.length }),
            );
          }

          prepareEmbedLayout(host.rootEl, settings.embedMaxHeight, settings.embedAlign);
          await waitForNextPaint();
          setProgress(0.45, t('studio.progress.settle'));

          const diag = await settleElement(host.captureEl, {
            timeoutMs: resolveSettleTimeoutMs(settings.settleTimeoutMs),
            signal: settleAbort.signal,
            onUpdate: (d) => {
              if (token === workToken.current) {
                setProgress(0.5, t('studio.progress.settle'));
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

          setProgress(0.75, t('studio.progress.capture'));

          const captured = await captureStudioPages(host, settings, 'preview', {
            skipPrepare: true,
            onProgress: (p) => {
              const frac = p.total > 0 ? p.page / p.total : 1;
              setProgress(0.75 + frac * 0.24, t('studio.progress.capturePage', {
                page: p.page,
                total: p.total,
              }));
            },
          });
          if (cancelled || token !== workToken.current) return;
          assertNonEmptyCapture(captured.parts, 'Preview capture');
          notifyMobileCaptureFlags(captured, mobileNoticeFlagsRef.current);

          appliedRenderSigRef.current = renderSig;
          invalidateExportCache();
          publishPreview(captured.parts);
          setPreviewStale(false);
          setSettle({
            ...diag,
            status: diag.status === 'timed_out' ? 'timed_out' : 'ready',
            elapsedMs: Math.round(performance.now() - startedAt),
            warnings: [...host.remoteWarnings, ...diag.warnings],
          });
          setRenderProgress(null);
          setRendering(false);
          resolvePreviewWaiters(true);
          return;
        }

        // recapture: reuse settled DOM (format / split changes).
        const host = hostRef.current!;
        setProgress(0.55, t('studio.progress.capture'));
        const captured = await captureStudioPages(host, settings, 'preview', {
          onProgress: (p) => {
            const frac = p.total > 0 ? p.page / p.total : 1;
            setProgress(0.55 + frac * 0.4, t('studio.progress.capturePage', {
              page: p.page,
              total: p.total,
            }));
          },
        });
        if (cancelled || token !== workToken.current) return;
        assertNonEmptyCapture(captured.parts, 'Preview capture');
        notifyMobileCaptureFlags(captured, mobileNoticeFlagsRef.current);
        invalidateExportCache();
        publishPreview(captured.parts);
        setPreviewStale(false);
        setSettle({
          status: 'ready',
          pendingImages: 0,
          pendingFonts: false,
          layoutStable: true,
          elapsedMs: Math.round(performance.now() - startedAt),
          warnings: [...host.remoteWarnings],
        });
        setRenderProgress(null);
        setRendering(false);
        resolvePreviewWaiters(true);
      } catch (error) {
        console.error(error);
        if (token === workToken.current) {
          appliedRenderSigRef.current = '';
          setRendering(false);
          setRenderProgress(null);
          setRemoteHint(null);
          setSettle({
            status: 'timed_out',
            pendingImages: 0,
            pendingFonts: false,
            layoutStable: false,
            elapsedMs: 0,
            warnings: [String(error)],
          });
          resolvePreviewWaiters(false);
          new Notice(t('notice.exportFail'));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      workToken.current++;
      settleAbortRef.current?.abort();
      // Do not resolve waiters here — a successor effect (or unmount cleanup) owns them.
    };
  }, [
    debouncedWorkSig,
    refreshNonce,
    app,
    markdown,
    file,
    frontmatter,
    type,
    publishPreview,
  ]);

  useEffect(
    () => () => {
      if (commitTimerRef.current != null) {
        window.clearTimeout(commitTimerRef.current);
      }
      resolvePreviewWaiters(false);
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
          (prev.split.mode === 'fixed') &&
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
        if (splitPatch.mode === 'fixed') {
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

  const ensureExportParts = async (): Promise<CapturePagePart[]> => {
    const host = hostRef.current;
    if (!host) throw new Error('Host not ready');
    const settings = draftRef.current;
    const sig = getExportCacheKey(settings);
    let parts = exportBlobsRef.current;
    if (!parts || exportSigRef.current !== sig) {
      // Export path: reuse settled DOM; capture at export scale with fonts.
      const captured = await captureStudioPages(host, settings, 'export');
      notifyMobileCaptureFlags(captured, mobileNoticeFlagsRef.current);
      parts = captured.parts;
      exportBlobsRef.current = parts;
      exportSigRef.current = sig;
    }
    return parts;
  };

  const onCopy = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const ready = await ensureHostMatchesDraft();
      if (!ready) {
        new Notice(t('notice.copyFail'));
        return;
      }
      const parts = await ensureExportParts();
      if (parts.length !== 1) {
        new Notice(t('notice.copyFail'));
        return;
      }
      await copyBlobToClipboard(parts[0]!.blob);
    } catch (error) {
      console.error(error);
      new Notice(t('notice.copyFail'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const ready = await ensureHostMatchesDraft();
      if (!ready) {
        new Notice(t('notice.saveFail'));
        return;
      }
      const settings = draftRef.current;
      const parts = await ensureExportParts();
      let saved = false;
      if (parts.length === 1) {
        const path = await saveBlob(app, parts[0]!.blob, file.basename, settings.format);
        saved = path !== undefined;
      } else {
        saved = await saveMultipleBlobs(
          app,
          parts.map((p) => ({
            blob: p.blob,
            title: file.basename,
            format: settings.format,
            index: p.index,
          })),
          file.basename,
        );
      }
      if (!saved) return;
      plugin.settings = settingsToPersist(settings);
      presetPaddingRef.current = { ...settings.padding };
      await plugin.saveSettings();
    } catch (error) {
      console.error(error);
      new Notice(t('notice.saveFail'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="export-img-studio">
      <div className="export-img-render-slot" ref={renderSlotRef} aria-hidden="true" />
      <PreviewPane
        imageUrls={previewUrls}
        rendering={rendering}
        renderProgress={renderProgress}
        onRefresh={onRefreshPreview}
      />
      <FidelityPanel
        draft={draft}
        busy={busy || rendering}
        settleStatus={settle?.status ?? null}
        exportDespiteTimeout={exportDespiteTimeout}
        onExportDespiteTimeout={setExportDespiteTimeout}
        previewStale={previewStale}
        autoRerender={autoRerender}
        paddingMode={paddingMode}
        onChange={onChange}
        onNestedChange={onNestedChange}
        onTogglePadding={onTogglePadding}
        onCommitPreview={onCommitPreview}
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
    if (Platform.isMobile) {
      this.modalEl.addClass('is-mobile');
    }
    this.titleEl.addClass('export-img-modal-titlebar');
    updateModalTitle(this.titleEl, {
      settle: null,
      remoteHint: null,
    });
    if (Platform.isMobile) {
      new Notice(t('notice.mobileHint'), 8000);
    }
    this.root = createRoot(this.contentEl);
    this.root.render(
      <AppContext.Provider value={{ app: this.args.app, plugin: this.args.plugin }}>
        <StudioApp
          {...this.args}
          titleEl={this.titleEl}
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
  const settings = createStudioDraft(plugin);
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
    await host.hydrateRemotes();
    prepareEmbedLayout(host.rootEl, settings.embedMaxHeight, settings.embedAlign);
    await waitForNextPaint();
    const settle = await settleElement(host.captureEl, {
      timeoutMs: resolveSettleTimeoutMs(settings.settleTimeoutMs),
    });
    if (settle.status === 'timed_out') {
      new Notice(t('notice.settleTimeout'));
      host.destroy();
      return;
    }
    const captured = await captureStudioPages(host, settings, 'export', {
      skipPrepare: true,
    });
    if (captured.parts.length !== 1) {
      new Notice(t('notice.copyFail'));
      host.destroy();
      return;
    }
    await copyBlobToClipboard(captured.parts[0]!.blob);
    host.destroy();
  } catch (error) {
    console.error(error);
    new Notice(t('notice.copyFail'));
  } finally {
    holder.remove();
  }
}
