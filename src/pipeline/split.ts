import type { SplitMode, SplitPosition, SplitSettings } from '../types';

interface MeasuredBlock {
  top: number;
  height: number;
}

export function getElementMeasures(root: HTMLElement, mode: SplitMode): MeasuredBlock[] {
  if (mode === 'none' || mode === 'fixed') return [];

  const selector =
    mode === 'hr'
      ? 'hr, .hr'
      : 'h1, h2, h3, h4, h5, h6, p, ul, ol, pre, blockquote, table, .callout, .internal-embed, section';

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

export function calculateSplitPositions(
  settings: SplitSettings,
  totalHeight: number,
  elements: MeasuredBlock[],
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

  if (settings.mode === 'auto' && elements.length > 0) {
    const maxH = Math.max(200, settings.height);
    const positions: SplitPosition[] = [];
    let startY = 0;
    let cursor = 0;

    while (startY < totalHeight - 4) {
      let endY = Math.min(startY + maxH, totalHeight);
      // Prefer cutting before a block that would be split
      for (let i = cursor; i < elements.length; i++) {
        const el = elements[i]!;
        const elBottom = el.top + el.height;
        if (el.top <= startY) continue;
        if (el.top > endY) break;
        if (elBottom > endY && el.top > startY + 40) {
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

  // fixed
  const page = Math.max(200, settings.height);
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

export function applyClip(
  clipEl: HTMLElement,
  contentEl: HTMLElement,
  startY: number,
  height: number,
): void {
  clipEl.style.height = `${height}px`;
  clipEl.style.overflow = 'hidden';
  contentEl.style.transform = `translateY(-${startY}px)`;
}

export function resetClip(clipEl: HTMLElement, contentEl: HTMLElement): void {
  clipEl.style.height = '';
  clipEl.style.overflow = '';
  contentEl.style.transform = '';
}
