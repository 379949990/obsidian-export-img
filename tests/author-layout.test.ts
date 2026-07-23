/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from 'vitest';
import { layoutAuthorBar } from '../src/pipeline/render-host';
import { installObsidianDomHelpers } from './helpers/obsidian-dom';

beforeEach(() => {
  installObsidianDomHelpers();
  document.body.replaceChildren();
});

function stubRect(
  el: HTMLElement,
  box: { top: number; left?: number; width: number; height: number },
): void {
  const left = box.left ?? 0;
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        top: box.top,
        left,
        width: box.width,
        height: box.height,
        bottom: box.top + box.height,
        right: left + box.width,
        x: left,
        y: box.top,
        toJSON: () => ({}),
      }) as DOMRect,
  });
  Object.defineProperty(el, 'offsetHeight', {
    configurable: true,
    get: () => box.height,
  });
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    get: () => box.height,
  });
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    get: () => box.height,
  });
  Object.defineProperty(el, 'offsetTop', {
    configurable: true,
    get: () => Math.max(0, box.top - 100),
  });
}

describe('layoutAuthorBar', () => {
  it('extends sizer min-height so author can flow below painted content', () => {
    const contentEl = document.createElement('div');
    contentEl.className = 'export-img-content';
    stubRect(contentEl, { top: 100, width: 400, height: 10 });

    const preview = document.createElement('div');
    preview.className = 'export-img-preview markdown-preview-view';
    stubRect(preview, { top: 100, width: 400, height: 40 });

    const sizer = document.createElement('div');
    sizer.className = 'markdown-preview-sizer';
    stubRect(sizer, { top: 100, width: 400, height: 40 });

    const blockA = document.createElement('p');
    stubRect(blockA, { top: 100, width: 400, height: 80 });
    const table = document.createElement('table');
    // Table paints far below the collapsed sizer box.
    stubRect(table, { top: 100 + 400, width: 400, height: 200 });

    sizer.append(blockA, table);
    preview.append(sizer);

    const author = document.createElement('div');
    author.className = 'export-img-author';
    stubRect(author, { top: 100, width: 400, height: 40 });

    contentEl.append(preview, author);
    document.body.appendChild(contentEl);

    layoutAuthorBar(contentEl);

    // (100+400+200) - 100 = 600
    expect(sizer.hasClass('is-sized-for-author')).toBe(true);
    expect(sizer.style.getPropertyValue('--export-img-sizer-min-h').trim()).toBe('600px');
    expect(author.classList.contains('is-laid-out')).toBe(false);
    expect(author.style.marginTop).toBe('');
    expect(author.style.top).toBe('');
  });
});
