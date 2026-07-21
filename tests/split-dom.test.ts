/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyPageBlocks,
  getAtomicBlocks,
  resetPageBlocks,
} from '../src/pipeline/split';
import { installObsidianDomHelpers, stubBox } from './helpers/obsidian-dom';

beforeEach(() => {
  installObsidianDomHelpers();
  document.body.replaceChildren();
});

function buildContent(): {
  contentEl: HTMLElement;
  captureEl: HTMLElement;
  title: HTMLElement;
  blockA: HTMLElement;
  blockB: HTMLElement;
  author: HTMLElement;
} {
  const captureEl = document.createElement('div');
  captureEl.className = 'export-img-capture';
  const contentEl = document.createElement('div');
  contentEl.className = 'export-img-content';
  const preview = document.createElement('div');
  preview.className = 'export-img-preview markdown-preview-view';
  const title = document.createElement('div');
  title.className = 'export-img-title inline-title';
  title.textContent = 'Title';
  stubBox(title, { height: 40 });
  const sizer = document.createElement('div');
  sizer.className = 'markdown-preview-sizer';
  const blockA = document.createElement('p');
  blockA.textContent = 'A';
  stubBox(blockA, { height: 100 });
  const blockB = document.createElement('p');
  blockB.textContent = 'B';
  stubBox(blockB, { height: 120 });
  sizer.append(blockA, blockB);
  preview.append(title, sizer);
  const author = document.createElement('div');
  author.className = 'export-img-author';
  stubBox(author, { height: 30 });
  contentEl.append(preview, author);
  captureEl.appendChild(contentEl);
  document.body.appendChild(captureEl);
  return { contentEl, captureEl, title, blockA, blockB, author };
}

describe('getAtomicBlocks', () => {
  it('collects title, sizer children, and author', () => {
    const { contentEl, title, blockA, blockB, author } = buildContent();
    const blocks = getAtomicBlocks(contentEl);
    expect(blocks.map((b) => b.el)).toEqual([title, blockA, blockB, author]);
    expect(blocks.map((b) => b.height)).toEqual([40, 100, 120, 30]);
  });
});

describe('applyPageBlocks / resetPageBlocks', () => {
  it('hides non-page blocks and restores them', () => {
    const { contentEl, captureEl, title, blockA, blockB, author } = buildContent();
    const all = getAtomicBlocks(contentEl);
    const page1 = all.filter((b) => b.el === title || b.el === blockA);

    applyPageBlocks(all, page1, captureEl, {
      top: 1,
      right: 2,
      bottom: 3,
      left: 4,
    });

    expect(title.classList.contains('export-img-page-hidden')).toBe(false);
    expect(blockA.classList.contains('export-img-page-hidden')).toBe(false);
    expect(blockB.classList.contains('export-img-page-hidden')).toBe(true);
    expect(author.classList.contains('export-img-page-hidden')).toBe(true);
    expect(captureEl.style.getPropertyValue('--export-img-pad-t')).toBe('1px');
    expect(captureEl.style.getPropertyValue('--export-img-pad-l')).toBe('4px');

    resetPageBlocks(all, captureEl, {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    });
    expect(blockB.classList.contains('export-img-page-hidden')).toBe(false);
    expect(author.classList.contains('export-img-page-hidden')).toBe(false);
    expect(captureEl.style.getPropertyValue('--export-img-pad-t')).toBe('10px');
  });
});
