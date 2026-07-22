/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyCapturePadding,
  prepareEmbedLayout,
} from '../src/pipeline/overflow';
import { installObsidianDomHelpers, stubBox } from './helpers/obsidian-dom';

beforeEach(() => {
  installObsidianDomHelpers();
  document.body.replaceChildren();
});

function stubNaturalSize(img: HTMLImageElement, w: number, h: number): void {
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: w });
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: h });
  Object.defineProperty(img, 'width', { configurable: true, value: w });
  Object.defineProperty(img, 'height', { configurable: true, value: h });
}

function buildHost(opts?: {
  withEmbedImg?: { w: number; h: number };
  withBadgeRow?: boolean;
  withWidePre?: boolean;
}): HTMLElement {
  const root = document.createElement('div');
  root.className = 'export-img-host';
  const capture = document.createElement('div');
  capture.className = 'export-img-capture';
  const preview = document.createElement('div');
  preview.className = 'markdown-preview-view export-img-preview';
  const sizer = document.createElement('div');
  sizer.className = 'markdown-preview-sizer';
  const content = document.createElement('div');
  content.className = 'export-img-content';

  if (opts?.withEmbedImg) {
    const wrap = document.createElement('div');
    wrap.className = 'internal-embed image-embed';
    const img = document.createElement('img');
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    stubNaturalSize(img, opts.withEmbedImg.w, opts.withEmbedImg.h);
    wrap.appendChild(img);
    sizer.appendChild(wrap);
  }

  if (opts?.withBadgeRow) {
    const p = document.createElement('p');
    p.setAttribute('align', 'center');
    for (let i = 0; i < 3; i++) {
      const img = document.createElement('img');
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      stubNaturalSize(img, 80, 20);
      p.appendChild(img);
    }
    sizer.appendChild(p);
  }

  if (opts?.withWidePre) {
    const pre = document.createElement('pre');
    pre.textContent = 'wide';
    stubBox(pre, { scrollWidth: 1200, scrollHeight: 200 });
    sizer.appendChild(pre);
  }

  preview.appendChild(sizer);
  content.appendChild(preview);
  capture.appendChild(content);
  root.appendChild(capture);
  document.body.appendChild(root);

  stubBox(root, { width: 800 });
  stubBox(capture, { width: 800 });
  stubBox(content, { width: 800 });
  stubBox(sizer, { width: 800 });
  return root;
}

describe('applyCapturePadding', () => {
  it('sets padding CSS variables on the capture element', () => {
    const el = document.createElement('div');
    applyCapturePadding(el, { top: 10, right: 20, bottom: 30, left: 40 });
    expect(el.style.getPropertyValue('--export-img-pad-t')).toBe('10px');
    expect(el.style.getPropertyValue('--export-img-pad-r')).toBe('20px');
    expect(el.style.getPropertyValue('--export-img-pad-b')).toBe('30px');
    expect(el.style.getPropertyValue('--export-img-pad-l')).toBe('40px');
  });
});

describe('prepareEmbedLayout', () => {
  it('unlocks overflow and marks layout prepared', () => {
    const root = buildHost();
    const capture = root.querySelector('.export-img-capture') as HTMLElement;
    prepareEmbedLayout(capture, 0, 'center');
    expect(capture.classList.contains('is-layout-prepared')).toBe(true);
    const preview = root.querySelector('.markdown-preview-view') as HTMLElement;
    expect(preview.classList.contains('export-img-unlock-overflow')).toBe(true);
  });

  it('aligns embeds that reach max height', () => {
    const root = buildHost({ withEmbedImg: { w: 800, h: 1200 } });
    const capture = root.querySelector('.export-img-capture') as HTMLElement;
    prepareEmbedLayout(capture, 360, 'center');
    const img = root.querySelector('img') as HTMLElement;
    expect(img.classList.contains('export-img-embed-constrained')).toBe(true);
    expect(img.classList.contains('export-img-align-center')).toBe(true);
    expect(img.classList.contains('export-img-embed-block')).toBe(true);
    expect(img.parentElement!.classList.contains('export-img-text-align-center')).toBe(
      true,
    );
  });

  it('does not force align on short embeds under the max height', () => {
    const root = buildHost({ withEmbedImg: { w: 400, h: 200 } });
    const capture = root.querySelector('.export-img-capture') as HTMLElement;
    prepareEmbedLayout(capture, 360, 'center');
    const img = root.querySelector('img') as HTMLElement;
    expect(img.classList.contains('export-img-embed-constrained')).toBe(true);
    expect(img.classList.contains('export-img-align-center')).toBe(false);
    expect(img.parentElement!.classList.contains('export-img-text-align-center')).toBe(
      false,
    );
  });

  it('does not force block layout on raw HTML badge rows', () => {
    const root = buildHost({ withBadgeRow: true });
    const capture = root.querySelector('.export-img-capture') as HTMLElement;
    prepareEmbedLayout(capture, 360, 'center');
    const imgs = Array.from(root.querySelectorAll('img'));
    expect(imgs).toHaveLength(3);
    for (const img of imgs) {
      expect(img.classList.contains('export-img-embed-block')).toBe(false);
    }
  });

  it('applies left align when a tall embed is height-capped', () => {
    const root = buildHost({ withEmbedImg: { w: 800, h: 900 } });
    const capture = root.querySelector('.export-img-capture') as HTMLElement;
    prepareEmbedLayout(capture, 360, 'left');
    const img = root.querySelector('img') as HTMLElement;
    expect(img.classList.contains('export-img-align-left')).toBe(true);
    expect(img.parentElement!.classList.contains('export-img-text-align-left')).toBe(true);
  });

  it('wraps and scales wide pre blocks to content width without align when under max height', () => {
    const root = buildHost({ withWidePre: true });
    const capture = root.querySelector('.export-img-capture') as HTMLElement;
    prepareEmbedLayout(capture, 0, 'center');
    const pre = root.querySelector('pre') as HTMLElement;
    expect(pre.classList.contains('export-img-fit-target')).toBe(true);
    expect(pre.classList.contains('is-scaled')).toBe(true);
    const wrap = pre.parentElement!;
    expect(wrap.classList.contains('export-img-fit-wrap')).toBe(true);
    expect(wrap.classList.contains('is-scaled')).toBe(true);
    expect(wrap.classList.contains('is-align-center')).toBe(false);
    expect(Number(pre.style.getPropertyValue('--export-img-fit-scale'))).toBeCloseTo(
      800 / 1200,
      5,
    );
  });

  it('aligns scaled blocks when height is capped', () => {
    const root = buildHost({ withWidePre: true });
    const pre = root.querySelector('pre') as HTMLElement;
    stubBox(pre, { scrollWidth: 1200, scrollHeight: 800 });
    const capture = root.querySelector('.export-img-capture') as HTMLElement;
    prepareEmbedLayout(capture, 200, 'center');
    const wrap = root.querySelector('.export-img-fit-wrap') as HTMLElement;
    expect(wrap.classList.contains('is-align-center')).toBe(true);
  });
});
