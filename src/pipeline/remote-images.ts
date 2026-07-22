import { requestUrl } from 'obsidian';

const REMOTE_FETCH_MS = 10_000;
/** Reject remote payloads larger than this (bytes). */
const REMOTE_MAX_BYTES = 12 * 1024 * 1024;
/** Cap concurrent remote fetches to limit memory spikes. */
const REMOTE_FETCH_CONCURRENCY = 3;
/** Soft bound on session cache entries (oldest evicted). */
const REMOTE_CACHE_MAX_ENTRIES = 48;

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

/** Sniff common image signatures when Content-Type is missing or untrusted. */
export function sniffImageMime(bytes: ArrayBuffer): string | null {
  const u8 = new Uint8Array(bytes);
  if (u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    u8.length >= 8 &&
    u8[0] === 0x89 &&
    u8[1] === 0x50 &&
    u8[2] === 0x4e &&
    u8[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    u8.length >= 6 &&
    u8[0] === 0x47 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x38
  ) {
    return 'image/gif';
  }
  if (
    u8.length >= 12 &&
    u8[0] === 0x52 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x46 &&
    u8[8] === 0x57 &&
    u8[9] === 0x45 &&
    u8[10] === 0x42 &&
    u8[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (u8.length >= 2 && u8[0] === 0x42 && u8[1] === 0x4d) {
    return 'image/bmp';
  }
  // SVG / XML preamble
  const head = new TextDecoder('utf-8', { fatal: false })
    .decode(u8.slice(0, Math.min(256, u8.length)))
    .trimStart()
    .toLowerCase();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) {
    return 'image/svg+xml';
  }
  return null;
}

function cachePut(src: string, objectUrl: string): void {
  if (remoteImageCache.has(src)) {
    remoteImageCache.delete(src);
  }
  remoteImageCache.set(src, objectUrl);
  while (remoteImageCache.size > REMOTE_CACHE_MAX_ENTRIES) {
    const oldest = remoteImageCache.keys().next().value;
    if (oldest === undefined) break;
    const url = remoteImageCache.get(oldest);
    remoteImageCache.delete(oldest);
    if (url) URL.revokeObjectURL(url);
  }
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
    // Refresh LRU order.
    cachePut(src, cached);
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
  const headerMime = normalizeMime(response.headers['content-type']);
  if (headerMime && !isImageMime(headerMime)) {
    throw new Error(`not an image (${headerMime})`);
  }
  const sniffed = sniffImageMime(response.arrayBuffer);
  if (!headerMime && !sniffed) {
    throw new Error('not an image (unknown type)');
  }
  if (headerMime && sniffed && headerMime !== 'image/svg+xml' && !sniffed.startsWith('image/')) {
    throw new Error(`not an image (${headerMime})`);
  }
  const mime = headerMime || sniffed || 'image/png';
  const blob = new Blob([response.arrayBuffer], { type: mime });
  const objectUrl = URL.createObjectURL(blob);
  cachePut(src, objectUrl);
  return { objectUrl, fromCache: false };
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, concurrency);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index]!);
    }
  });
  await Promise.all(runners);
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

  await mapPool(imgs, REMOTE_FETCH_CONCURRENCY, async (img) => {
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
  });

  report(false);
  return {
    warnings,
    total,
    hydrated: total - warnings.length,
    cacheHits,
  };
}

/** Host destroy must not revoke cache-owned blob URLs — session cache owns them. */
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
