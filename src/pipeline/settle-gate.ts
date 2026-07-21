import type { SettleDiagnostic, SettleStatus } from '../types';
import { waitForNextPaint } from './overflow';

export interface SettleOptions {
  timeoutMs: number;
  onUpdate?: (diag: SettleDiagnostic) => void;
  /** Optional abort signal from the caller (e.g. remount). */
  signal?: AbortSignal;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function waitForImages(
  root: HTMLElement,
  signal: AbortSignal,
): Promise<{ pending: number; warnings: string[] }> {
  const imgs = Array.from(root.querySelectorAll('img')).filter(
    (img) => !img.closest('.export-img-watermark'),
  );
  const warnings: string[] = [];
  let pending = 0;

  await Promise.all(
    imgs.map(async (img) => {
      if (signal.aborted) return;
      if (img.complete && img.naturalWidth > 0) return;
      pending++;
      try {
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
          signal.addEventListener('abort', onAbort, { once: true });

          const cleanup = () => signal.removeEventListener('abort', onAbort);

          const onError = () => {
            cleanup();
            reject(new Error('img error'));
          };
          const onReady = () => {
            cleanup();
            resolve();
          };

          // Cap per-image wait — hanging decode should not dominate settle.
          const timeout = window.setTimeout(onReady, 1200);

          if (typeof img.decode === 'function') {
            img.decode().then(
              () => {
                window.clearTimeout(timeout);
                onReady();
              },
              () => {
                window.clearTimeout(timeout);
                onError();
              },
            );
            img.addEventListener(
              'error',
              () => {
                window.clearTimeout(timeout);
                onError();
              },
              { once: true },
            );
          } else if (img.complete) {
            window.clearTimeout(timeout);
            onReady();
          } else {
            img.addEventListener(
              'load',
              () => {
                window.clearTimeout(timeout);
                onReady();
              },
              { once: true },
            );
            img.addEventListener(
              'error',
              () => {
                window.clearTimeout(timeout);
                onError();
              },
              { once: true },
            );
          }
        });
      } catch (error) {
        if (isAbortError(error)) return;
        warnings.push(`Image failed: ${img.getAttribute('src')?.slice(0, 80) ?? 'unknown'}`);
      } finally {
        pending = Math.max(0, pending - 1);
      }
    }),
  );

  return { pending, warnings };
}

/** Cap font wait — Obsidian may keep document.fonts.ready pending for unused faces. */
async function waitForFonts(signal: AbortSignal): Promise<boolean> {
  try {
    if (!document.fonts) return false;
    if (document.fonts.status !== 'loading') return false;
    await Promise.race([document.fonts.ready, delay(160, signal)]);
    return document.fonts.status === 'loading';
  } catch (error) {
    if (isAbortError(error)) throw error;
    return true;
  }
}

/** Brief wait for Mermaid/MathJax SVG nodes without a long ResizeObserver loop. */
async function waitForAsyncDiagrams(root: HTMLElement, signal: AbortSignal): Promise<void> {
  const hasPendingMermaid = () =>
    Array.from(root.querySelectorAll('.mermaid')).some((el) => !el.querySelector('svg'));

  if (!hasPendingMermaid()) return;
  const deadline = performance.now() + 400;
  while (performance.now() < deadline) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (!hasPendingMermaid()) return;
    await delay(32, signal);
  }
}

export async function settleElement(
  root: HTMLElement,
  options: SettleOptions,
): Promise<SettleDiagnostic> {
  const started = performance.now();
  const warnings: string[] = [];
  const controller = new AbortController();
  let settled = false;

  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort, { once: true });
  if (options.signal?.aborted) {
    controller.abort();
  }

  const emit = (status: SettleStatus, extra?: Partial<SettleDiagnostic>): SettleDiagnostic | null => {
    if (settled && status !== 'timed_out') {
      return null;
    }
    const diag: SettleDiagnostic = {
      status,
      pendingImages: 0,
      pendingFonts: false,
      layoutStable: false,
      elapsedMs: Math.round(performance.now() - started),
      warnings: [...warnings],
      ...extra,
    };
    if (status === 'ready' || status === 'timed_out') {
      settled = true;
    }
    options.onUpdate?.(diag);
    return diag;
  };

  emit('waiting');

  const timeoutId = window.setTimeout(() => {
    if (!settled) {
      controller.abort();
      emit('timed_out', {
        layoutStable: false,
        warnings: [...warnings, 'Settle timed out'],
      });
    }
  }, options.timeoutMs);

  try {
    const [fontPending, imageResult] = await Promise.all([
      waitForFonts(controller.signal),
      waitForImages(root, controller.signal),
    ]);
    warnings.push(...imageResult.warnings);

    await waitForAsyncDiagrams(root, controller.signal);
    await waitForNextPaint();

    if (settled) {
      return {
        status: 'timed_out',
        pendingImages: imageResult.pending,
        pendingFonts: fontPending,
        layoutStable: false,
        elapsedMs: Math.round(performance.now() - started),
        warnings: [...warnings, 'Settle timed out'],
      };
    }

    return (
      emit('ready', {
        pendingImages: imageResult.pending,
        pendingFonts: fontPending,
        layoutStable: true,
        warnings: [...warnings],
      }) ?? {
        status: 'timed_out',
        pendingImages: imageResult.pending,
        pendingFonts: fontPending,
        layoutStable: false,
        elapsedMs: Math.round(performance.now() - started),
        warnings: [...warnings],
      }
    );
  } catch (error) {
    if (isAbortError(error)) {
      if (settled) {
        return {
          status: 'timed_out',
          pendingImages: 0,
          pendingFonts: false,
          layoutStable: false,
          elapsedMs: Math.round(performance.now() - started),
          warnings: [...warnings, 'Settle timed out'],
        };
      }
      return (
        emit('timed_out', {
          warnings: [...warnings],
        }) ?? {
          status: 'timed_out',
          pendingImages: 0,
          pendingFonts: false,
          layoutStable: false,
          elapsedMs: Math.round(performance.now() - started),
          warnings: [...warnings],
        }
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}
