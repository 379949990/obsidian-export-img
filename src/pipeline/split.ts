import type {
  PaddingSettings,
  SplitMode,
  SplitSettings,
} from '../types';
import { applyCapturePadding } from './overflow';

export interface SplitBlock {
  el: HTMLElement;
  height: number;
}

/** A4 portrait ratio (height / width) ≈ √2. */
export const SPLIT_HEIGHT_RATIO = 1.414;

export function defaultSplitHeight(width: number): number {
  return Math.max(200, Math.round(width * SPLIT_HEIGHT_RATIO));
}

/** Max content height per page (padding is applied outside this budget). */
export function resolveSplitHeight(settings: SplitSettings, width: number): number {
  if (settings.height > 0) return Math.max(200, settings.height);
  return defaultSplitHeight(width);
}

/**
 * Atomic units for pagination: title/metadata, each sizer child, author.
 * Nested nodes are not split independently so list items stay with their list.
 */
export function getAtomicBlocks(contentEl: HTMLElement): SplitBlock[] {
  const blocks: SplitBlock[] = [];
  const preview =
    contentEl.querySelector<HTMLElement>('.export-img-preview, .markdown-preview-view') ??
    contentEl;

  for (const el of Array.from(
    preview.querySelectorAll<HTMLElement>(':scope > .export-img-title, :scope > .inline-title, :scope > .export-img-metadata'),
  )) {
    const height = el.getBoundingClientRect().height;
    if (height > 0) blocks.push({ el, height });
  }

  const sizer = preview.querySelector<HTMLElement>('.markdown-preview-sizer');
  if (sizer) {
    for (const child of Array.from(sizer.children)) {
      if (!child.instanceOf(HTMLElement)) continue;
      const height = child.getBoundingClientRect().height;
      if (height < 1) continue;
      blocks.push({ el: child, height });
    }
  }

  const author = contentEl.querySelector<HTMLElement>(':scope > .export-img-author');
  if (author) {
    const height = author.getBoundingClientRect().height;
    if (height > 0) blocks.push({ el: author, height });
  }

  return blocks;
}

function isHrBlock(block: SplitBlock): boolean {
  return (
    block.el.matches('hr, .hr') ||
    !!block.el.querySelector(':scope > hr, :scope > .hr')
  );
}

/** Pack blocks into pages — each block appears on exactly one page (never clipped). */
export function paginateBlocks(
  blocks: SplitBlock[],
  maxContentHeight: number,
  mode: SplitMode,
): SplitBlock[][] {
  if (blocks.length === 0) return [[]];

  if (mode === 'hr') {
    const pages: SplitBlock[][] = [];
    let current: SplitBlock[] = [];
    for (const block of blocks) {
      if (isHrBlock(block)) {
        if (current.length > 0) {
          pages.push(current);
          current = [];
        }
        continue;
      }
      current.push(block);
    }
    if (current.length > 0) pages.push(current);
    return pages.length > 0 ? pages : [blocks];
  }

  if (mode === 'none') {
    return [blocks];
  }

  const pages: SplitBlock[][] = [];
  let current: SplitBlock[] = [];
  let used = 0;

  for (const block of blocks) {
    // Keep oversized single blocks intact on their own page (no clipping).
    if (current.length > 0 && used + block.height > maxContentHeight) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(block);
    used += block.height;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

/** Show only this page's blocks; others are not rendered (display:none). */
export function applyPageBlocks(
  allBlocks: SplitBlock[],
  pageBlocks: SplitBlock[],
  captureEl: HTMLElement,
  padding: PaddingSettings,
): void {
  const visible = new Set(pageBlocks.map((b) => b.el));
  for (const block of allBlocks) {
    if (visible.has(block.el)) {
      block.el.removeClass('export-img-page-hidden');
    } else {
      block.el.addClass('export-img-page-hidden');
    }
  }

  applyCapturePadding(captureEl, padding);
}

export function resetPageBlocks(
  allBlocks: SplitBlock[],
  captureEl: HTMLElement,
  padding: PaddingSettings,
): void {
  for (const block of allBlocks) {
    block.el.removeClass('export-img-page-hidden');
  }
  applyCapturePadding(captureEl, padding);
}
