import type { PaddingSettings } from '../types';

function parsePx(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/** Parse CSS margin/padding shorthand into four sides. */
export function parseCssBox(value: string): PaddingSettings | null {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parsePx);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    const v = parts[0]!;
    return { top: v, right: v, bottom: v, left: v };
  }
  if (parts.length === 2) {
    return { top: parts[0]!, right: parts[1]!, bottom: parts[0]!, left: parts[1]! };
  }
  if (parts.length === 3) {
    return { top: parts[0]!, right: parts[1]!, bottom: parts[2]!, left: parts[1]! };
  }
  return {
    top: parts[0]!,
    right: parts[1]!,
    bottom: parts[2]!,
    left: parts[3]!,
  };
}

/**
 * Read padding that matches the current reading-view note chrome.
 * Prefers a live preview element; falls back to --file-margins.
 */
export function readReadingViewPadding(): PaddingSettings {
  const preview =
    document.querySelector<HTMLElement>(
      '.markdown-reading-view .markdown-preview-view, .markdown-preview-view.is-readable-line-width, .markdown-preview-view',
    ) ?? null;

  if (preview) {
    const style = getComputedStyle(preview);
    const fromEl: PaddingSettings = {
      top: parsePx(style.paddingTop),
      right: parsePx(style.paddingRight),
      bottom: parsePx(style.paddingBottom),
      left: parsePx(style.paddingLeft),
    };
    if (fromEl.top + fromEl.right + fromEl.bottom + fromEl.left > 0) {
      return fromEl;
    }
  }

  const fileMargins = getComputedStyle(document.body)
    .getPropertyValue('--file-margins')
    .trim();
  const fromVar = fileMargins ? parseCssBox(fileMargins) : null;
  if (fromVar && fromVar.top + fromVar.right + fromVar.bottom + fromVar.left > 0) {
    return fromVar;
  }

  // Obsidian-like readable defaults when nothing measurable is available.
  return { top: 20, right: 30, bottom: 20, left: 30 };
}
