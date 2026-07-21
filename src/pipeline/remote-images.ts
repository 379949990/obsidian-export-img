import { requestUrl } from 'obsidian';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Rewrite remote <img src="http(s):..."> to blob URLs via Obsidian requestUrl
 * so screenshot capture is not blocked by canvas CORS.
 */
export async function hydrateRemoteImages(root: HTMLElement): Promise<string[]> {
  const warnings: string[] = [];
  const imgs = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src || !/^https?:\/\//i.test(src)) return;
      try {
        const response = await withTimeout(
          requestUrl({ url: src, method: 'GET' }),
          1500,
        );
        const mime = response.headers['content-type'] || 'image/png';
        const blob = new Blob([response.arrayBuffer], { type: mime });
        const objectUrl = URL.createObjectURL(blob);
        img.setAttribute('src', objectUrl);
        img.dataset.exportImgBlob = '1';
      } catch {
        warnings.push(`Remote image failed: ${src.slice(0, 80)}`);
      }
    }),
  );

  return warnings;
}

export function revokeHydratedImages(root: HTMLElement): void {
  for (const img of Array.from(root.querySelectorAll('img[data-export-img-blob="1"]'))) {
    const src = img.getAttribute('src');
    if (src?.startsWith('blob:')) {
      URL.revokeObjectURL(src);
    }
  }
}
