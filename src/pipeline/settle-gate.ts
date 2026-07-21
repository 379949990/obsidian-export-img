import type { SettleDiagnostic, SettleStatus } from '../types';

export interface SettleOptions {
  timeoutMs: number;
  stableMs?: number;
  onUpdate?: (diag: SettleDiagnostic) => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForImages(root: HTMLElement, signal: { timedOut: boolean }): Promise<{ pending: number; warnings: string[] }> {
  const imgs = Array.from(root.querySelectorAll('img'));
  const warnings: string[] = [];
  let pending = 0;

  await Promise.all(
    imgs.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return;
      pending++;
      try {
        if (typeof img.decode === 'function') {
          await Promise.race([
            img.decode(),
            new Promise((_, reject) => {
              img.addEventListener('error', () => reject(new Error('img error')), { once: true });
            }),
          ]);
        } else {
          await new Promise<void>((resolve, reject) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => reject(new Error('img error')), { once: true });
          });
        }
      } catch {
        warnings.push(`Image failed: ${img.getAttribute('src')?.slice(0, 80) ?? 'unknown'}`);
      } finally {
        pending = Math.max(0, pending - 1);
      }
      if (signal.timedOut) return;
    }),
  );

  return { pending, warnings };
}

async function waitForFonts(): Promise<boolean> {
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    return false;
  } catch {
    return true;
  }
}

function waitForLayoutStable(root: HTMLElement, stableMs: number, signal: { timedOut: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    let lastHeight = root.scrollHeight;
    let timer: number | undefined;

    const finish = (stable: boolean) => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
      resolve(stable);
    };

    const observer = new ResizeObserver(() => {
      if (signal.timedOut) {
        finish(false);
        return;
      }
      lastHeight = root.scrollHeight;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => finish(true), stableMs);
    });

    observer.observe(root);
    timer = window.setTimeout(() => finish(true), stableMs);

    // Also poke once after a short delay for async blocks (mermaid/math)
    void delay(120).then(() => {
      if (!signal.timedOut && root.scrollHeight !== lastHeight) {
        lastHeight = root.scrollHeight;
      }
    });
  });
}

export async function settleElement(
  root: HTMLElement,
  options: SettleOptions,
): Promise<SettleDiagnostic> {
  const started = performance.now();
  const stableMs = options.stableMs ?? 180;
  const signal = { timedOut: false };
  const warnings: string[] = [];

  const emit = (status: SettleStatus, extra?: Partial<SettleDiagnostic>) => {
    const diag: SettleDiagnostic = {
      status,
      pendingImages: 0,
      pendingFonts: false,
      layoutStable: false,
      elapsedMs: Math.round(performance.now() - started),
      warnings: [...warnings],
      ...extra,
    };
    options.onUpdate?.(diag);
    return diag;
  };

  emit('waiting');

  const timeoutPromise = delay(options.timeoutMs).then(() => {
    signal.timedOut = true;
  });

  const work = (async () => {
    const fontPending = await waitForFonts();
    const imageResult = await waitForImages(root, signal);
    warnings.push(...imageResult.warnings);

    // Give mermaid / math / callouts a moment, then wait for layout calm
    await delay(80);
    const layoutStable = await waitForLayoutStable(root, stableMs, signal);

    return emit(signal.timedOut ? 'timed_out' : 'ready', {
      pendingImages: imageResult.pending,
      pendingFonts: fontPending,
      layoutStable,
      warnings: [...warnings],
    });
  })();

  const result = await Promise.race([
    work,
    timeoutPromise.then(() =>
      emit('timed_out', {
        layoutStable: false,
        warnings: [...warnings, 'Settle timed out'],
      }),
    ),
  ]);

  return result;
}
