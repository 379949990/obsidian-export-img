import type {
  PaddingSettings,
  SplitMode,
  SplitPosition,
  SplitSettings,
} from '../types';

interface MeasuredBlock {
  top: number;
  height: number;
}

const BLOCK_SELECTOR =
  'h1, h2, h3, h4, h5, h6, p, ul, ol, pre, blockquote, table, .callout, .internal-embed, .mermaid, .math, section, li';

export function resolveSplitHeight(settings: SplitSettings, width: number): number {
  if (settings.height > 0) return Math.max(200, settings.height);
  return Math.max(200, Math.round(width * 1.5));
}

export function getElementMeasures(root: HTMLElement, mode: SplitMode): MeasuredBlock[] {
  if (mode === 'none') return [];

  const selector = mode === 'hr' ? 'hr, .hr' : BLOCK_SELECTOR;
  const rootRect = root.getBoundingClientRect();
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
  return nodes
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top - rootRect.top + root.scrollTop,
        height: rect.height,
      };
    })
    .filter((m) => m.height > 0)
    .sort((a, b) => a.top - b.top);
}

function splitWithBlockSnap(
  totalHeight: number,
  maxH: number,
  elements: MeasuredBlock[],
): SplitPosition[] {
  const positions: SplitPosition[] = [];
  let startY = 0;
  let cursor = 0;

  while (startY < totalHeight - 4) {
    let endY = Math.min(startY + maxH, totalHeight);

    for (let i = cursor; i < elements.length; i++) {
      const el = elements[i]!;
      const elBottom = el.top + el.height;
      if (el.top <= startY + 1) continue;
      if (el.top > endY) break;
      // Prefer cutting before a block that would be sliced mid-element.
      if (elBottom > endY && el.top > startY + 48) {
        endY = el.top;
        cursor = i;
        break;
      }
    }

    if (endY <= startY) endY = Math.min(startY + maxH, totalHeight);
    positions.push({ startY, height: endY - startY });
    startY = endY;
  }

  return positions.length > 0 ? positions : [{ startY: 0, height: totalHeight }];
}

export function calculateSplitPositions(
  settings: SplitSettings,
  totalHeight: number,
  elements: MeasuredBlock[],
  width = 800,
): SplitPosition[] {
  if (settings.mode === 'none' || totalHeight <= 0) {
    return [{ startY: 0, height: totalHeight || 1 }];
  }

  if (settings.mode === 'hr' && elements.length > 0) {
    const cuts = [0, ...elements.map((e) => e.top), totalHeight];
    const unique = [...new Set(cuts.map((n) => Math.round(n)))].sort((a, b) => a - b);
    const positions: SplitPosition[] = [];
    for (let i = 0; i < unique.length - 1; i++) {
      const startY = unique[i]!;
      const endY = unique[i + 1]!;
      const height = endY - startY;
      if (height > 8) positions.push({ startY, height });
    }
    return positions.length > 0 ? positions : [{ startY: 0, height: totalHeight }];
  }

  const page = resolveSplitHeight(settings, width);

  // fixed + auto: snap to block boundaries when possible.
  if ((settings.mode === 'fixed' || settings.mode === 'auto') && elements.length > 0) {
    return splitWithBlockSnap(totalHeight, page, elements);
  }

  // fixed without measures — naive pages.
  const overlap = Math.max(0, Math.min(settings.overlap, page / 2));
  const positions: SplitPosition[] = [];
  let startY = 0;
  while (startY < totalHeight - 4) {
    const height = Math.min(page, totalHeight - startY);
    positions.push({ startY, height });
    if (startY + height >= totalHeight) break;
    startY += height - overlap;
  }
  return positions.length > 0 ? positions : [{ startY: 0, height: totalHeight }];
}

/** Clip one page of content; each page keeps its own padding chrome. */
export function applyPageClip(
  captureEl: HTMLElement,
  contentEl: HTMLElement,
  startY: number,
  contentHeight: number,
  padding: PaddingSettings,
): void {
  captureEl.style.boxSizing = 'border-box';
  captureEl.style.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  captureEl.style.height = `${contentHeight + padding.top + padding.bottom}px`;
  captureEl.style.overflow = 'hidden';
  contentEl.style.transform = `translateY(-${startY}px)`;
}

export function resetPageClip(
  captureEl: HTMLElement,
  contentEl: HTMLElement,
  padding: PaddingSettings,
): void {
  captureEl.style.height = '';
  captureEl.style.overflow = 'visible';
  captureEl.style.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  contentEl.style.transform = '';
}

/** @deprecated Use applyPageClip */
export function applyClip(
  clipEl: HTMLElement,
  contentEl: HTMLElement,
  startY: number,
  height: number,
): void {
  applyPageClip(clipEl, contentEl, startY, height, {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
}

/** @deprecated Use resetPageClip */
export function resetClip(clipEl: HTMLElement, contentEl: HTMLElement): void {
  resetPageClip(clipEl, contentEl, { top: 0, right: 0, bottom: 0, left: 0 });
}
