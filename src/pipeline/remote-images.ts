import { requestUrl } from 'obsidian';

const REMOTE_FETCH_MS = 10_000;
/** Reject remote payloads larger than this (bytes). */
const REMOTE_MAX_BYTES = 12 * 1024 * 1024;

/**
 * Session-scoped remote image cache (URL → object URL).
 * Survives Studio rebuilds so repeat previews skip the network.
 * Blob URLs are owned by the cache — do not revoke per-host destroy.
 */
const remoteImageCache = new Map<string, string>();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function normalizeMime(header: string | undefined): string {
  const raw = (header ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  return raw;
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

export interface RemoteHydrateProgress {
  total: number;
  done: number;
  loading: boolean;
}

export interface RemoteHydrateResult {
  warnings: string[];
  total: number;
  hydrated: number;
  cacheHits: number;
}

function collectRemoteImages(root: HTMLElement): HTMLImageElement[] {
  return Array.from(root.querySelectorAll('img')).filter((img) => {
    const src = img.getAttribute('src') ?? '';
    return /^https?:\/\//i.test(src);
  });
}

export function countRemoteImages(root: HTMLElement): number {
  return collectRemoteImages(root).length;
}

async function resolveRemoteObjectUrl(
  src: string,
  timeoutMs: number,
): Promise<{ objectUrl: string; fromCache: boolean }> {
  const cached = remoteImageCache.get(src);
  if (cached) {
    return { objectUrl: cached, fromCache: true };
  }

  const response = await withTimeout(
    requestUrl({ url: src, method: 'GET' }),
    timeoutMs,
  );
  const bytes = response.arrayBuffer.byteLength;
  if (bytes > REMOTE_MAX_BYTES) {
    throw new Error(`too large (${bytes} bytes)`);
  }
  const mime = normalizeMime(response.headers['content-type']);
  if (mime && !isImageMime(mime)) {
    throw new Error(`not an image (${mime || 'unknown type'})`);
  }
  const blob = new Blob([response.arrayBuffer], {
    type: mime || 'image/png',
  });
  const objectUrl = URL.createObjectURL(blob);
  remoteImageCache.set(src, objectUrl);
  return { objectUrl, fromCache: false };
}

/**
 * Rewrite remote <img src="http(s):..."> to cached blob URLs via Obsidian
 * requestUrl so screenshot capture is not blocked by canvas CORS.
 * Does not use visual placeholders — callers should wait for this before
 * the first preview capture.
 */
export async function hydrateRemoteImages(
  root: HTMLElement,
  opts?: {
    onProgress?: (progress: RemoteHydrateProgress) => void;
    timeoutMs?: number;
  },
): Promise<RemoteHydrateResult> {
  const warnings: string[] = [];
  const imgs = collectRemoteImages(root);
  const total = imgs.length;
  const timeoutMs = opts?.timeoutMs ?? REMOTE_FETCH_MS;
  let done = 0;
  let cacheHits = 0;

  const report = (loading: boolean) => {
    opts?.onProgress?.({ total, done, loading });
  };

  if (total === 0) {
    report(false);
    return { warnings, total: 0, hydrated: 0, cacheHits: 0 };
  }

  report(true);

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') ?? '';
      try {
        const { objectUrl, fromCache } = await resolveRemoteObjectUrl(src, timeoutMs);
        if (fromCache) cacheHits += 1;
        img.setAttribute('src', objectUrl);
        img.dataset.exportImgRemoteUrl = src;
        img.dataset.exportImgCached = '1';
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        warnings.push(`Remote image failed (${reason}): ${src.slice(0, 80)}`);
      } finally {
        done += 1;
        report(done < total);
      }
    }),
  );

  report(false);
  return {
    warnings,
    total,
    hydrated: total - warnings.length,
    cacheHits,
  };
}

/** Host destroy must not revoke cache-owned blob URLs. */
export function revokeHydratedImages(_root: HTMLElement): void {
  // Session cache owns object URLs for remote images.
}

/** Drop the session cache (e.g. plugin unload). */
export function clearRemoteImageCache(): void {
  for (const objectUrl of remoteImageCache.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  remoteImageCache.clear();
}

/** Test helper — current cache size. */
export function remoteImageCacheSize(): number {
  return remoteImageCache.size;
}
