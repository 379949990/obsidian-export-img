/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRemoteImageCache,
  countRemoteImages,
  hydrateRemoteImages,
  remoteImageCacheSize,
} from '../src/pipeline/remote-images';
import { installObsidianDomHelpers } from './helpers/obsidian-dom';

beforeEach(() => {
  installObsidianDomHelpers();
  document.body.replaceChildren();
  clearRemoteImageCache();
});

function mountRemoteImg(src: string): { root: HTMLElement; img: HTMLImageElement } {
  const root = document.createElement('div');
  const img = document.createElement('img');
  img.src = src;
  root.appendChild(img);
  document.body.appendChild(root);
  return { root, img };
}

describe('countRemoteImages', () => {
  it('counts http(s) images outside author/watermark', () => {
    const { root } = mountRemoteImg('https://example.com/a.png');
    expect(countRemoteImages(root)).toBe(1);
  });
});

describe('hydrateRemoteImages', () => {
  it('fetches once and caches blob urls for later hydrates', async () => {
    const first = mountRemoteImg('https://example.com/cached.png');
    const progress: Array<{ done: number; total: number; loading: boolean }> = [];

    const result1 = await hydrateRemoteImages(first.root, {
      onProgress: (p) => progress.push({ ...p }),
    });
    expect(result1.total).toBe(1);
    expect(result1.hydrated).toBe(1);
    expect(result1.cacheHits).toBe(0);
    expect(first.img.getAttribute('src')?.startsWith('blob:')).toBe(true);
    expect(remoteImageCacheSize()).toBe(1);
    expect(progress.some((p) => p.loading && p.total === 1)).toBe(true);
    expect(progress.at(-1)).toEqual({ total: 1, done: 1, loading: false });

    const second = mountRemoteImg('https://example.com/cached.png');
    const result2 = await hydrateRemoteImages(second.root);
    expect(result2.cacheHits).toBe(1);
    expect(result2.hydrated).toBe(1);
    expect(second.img.getAttribute('src')).toBe(first.img.getAttribute('src'));
  });

  it('does not leave placeholder loading classes on images', async () => {
    const { root, img } = mountRemoteImg('https://example.com/b.png');
    await hydrateRemoteImages(root);
    expect(img.classList.contains('export-img-remote-loading')).toBe(false);
    expect(img.getAttribute('src')?.startsWith('blob:')).toBe(true);
  });
});
