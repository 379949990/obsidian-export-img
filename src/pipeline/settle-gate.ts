import type { SettleDiagnostic, SettleStatus } from '../types';

export interface SettleOptions {
  timeoutMs: number;
  stableMs?: number;
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
    const timer = setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
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
  const imgs = Array.from(root.querySelectorAll('img'));
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

          if (typeof img.decode === 'function') {
            img.decode().then(onReady, onError);
            img.addEventListener('error', onError, { once: true });
          } else if (img.complete) {
            onReady();
          } else {
            img.addEventListener('load', onReady, { once: true });
            img.addEventListener('error', onError, { once: true });
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

async function waitForFonts(signal: AbortSignal): Promise<boolean> {
  try {
    if (document.fonts?.ready) {
      await Promise.race([
        document.fonts.ready,
        delay(60_000, signal),
      ]);
    }
    return false;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return true;
  }
}

function waitForLayoutStable(
  root: HTMLElement,
  stableMs: number,
  signal: AbortSignal,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let timer: number | undefined;

    const cleanup = () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    };

    const finish = (stable: boolean) => {
      cleanup();
      resolve(stable);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const observer = new ResizeObserver(() => {
      if (signal.aborted) {
        onAbort();
        return;
      }
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => finish(true), stableMs);
    });

    observer.observe(root);
    signal.addEventListener('abort', onAbort, { once: true });
    timer = window.setTimeout(() => finish(true), stableMs);
  });
}

export async function settleElement(
  root: HTMLElement,
  options: SettleOptions,
): Promise<SettleDiagnostic> {
  const started = performance.now();
  const stableMs = options.stableMs ?? 180;
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
      // After a final status, ignore late "ready" updates from abandoned work.
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
    const fontPending = await waitForFonts(controller.signal);
    const imageResult = await waitForImages(root, controller.signal);
    warnings.push(...imageResult.warnings);

    await delay(80, controller.signal);
    const layoutStable = await waitForLayoutStable(root, stableMs, controller.signal);

    if (settled) {
      // Timeout already won; do not downgrade/upgrade status.
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
        layoutStable,
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
      // Caller aborted (remount) — report idle-ish timeout without spamming.
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
