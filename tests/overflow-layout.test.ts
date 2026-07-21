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

function buildHost(opts?: { withImg?: boolean; withWidePre?: boolean }): HTMLElement {
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

  if (opts?.withImg) {
    const wrap = document.createElement('p');
    const img = document.createElement('img');
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    wrap.appendChild(img);
    sizer.appendChild(wrap);
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

  it('constrains images and applies center align classes', () => {
    const root = buildHost({ withImg: true });
    const capture = root.querySelector('.export-img-capture') as HTMLElement;
    prepareEmbedLayout(capture, 360, 'center');
    const img = root.querySelector('img') as HTMLElement;
    expect(img.classList.contains('export-img-embed-constrained')).toBe(true);
    expect(img.classList.contains('export-img-align-center')).toBe(true);
    expect(img.classList.contains('export-img-embed-block')).toBe(true);
    expect(img.style.getPropertyValue('--export-img-embed-max-h')).toBe('360px');
    const wrap = img.parentElement!;
    expect(wrap.classList.contains('export-img-text-align-center')).toBe(true);
  });

  it('applies left align without height clamp when maxHeight is 0', () => {
    const root = buildHost({ withImg: true });
    const capture = root.querySelector('.export-img-capture') as HTMLElement;
    prepareEmbedLayout(capture, 0, 'left');
    const img = root.querySelector('img') as HTMLElement;
    expect(img.classList.contains('export-img-embed-constrained')).toBe(false);
    expect(img.classList.contains('export-img-align-left')).toBe(true);
    expect(img.parentElement!.classList.contains('export-img-text-align-left')).toBe(true);
  });

  it('wraps and scales wide pre blocks to content width', () => {
    const root = buildHost({ withWidePre: true });
    const capture = root.querySelector('.export-img-capture') as HTMLElement;
    prepareEmbedLayout(capture, 0, 'center');
    const pre = root.querySelector('pre') as HTMLElement;
    expect(pre.classList.contains('export-img-fit-target')).toBe(true);
    expect(pre.classList.contains('is-scaled')).toBe(true);
    const wrap = pre.parentElement!;
    expect(wrap.classList.contains('export-img-fit-wrap')).toBe(true);
    expect(wrap.classList.contains('is-scaled')).toBe(true);
    expect(wrap.classList.contains('is-align-center')).toBe(true);
    expect(Number(pre.style.getPropertyValue('--export-img-fit-scale'))).toBeCloseTo(
      800 / 1200,
      5,
    );
  });
});
