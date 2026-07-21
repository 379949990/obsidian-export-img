/**
 * Expand elements that scroll horizontally (Mermaid, wide tables, code blocks)
 * so capture includes the full content instead of a clipped viewport.
 */
export function expandHorizontalOverflow(root: HTMLElement): void {
  const candidates = root.querySelectorAll<HTMLElement>(
    [
      '.mermaid',
      'pre',
      'pre code',
      'table',
      '.table-wrapper',
      '.cm-preview-code-block',
      '.internal-embed',
      '.image-embed',
      'svg',
      '.math',
      '.MathJax',
      '.mjx-container',
    ].join(','),
  );

  let maxContentWidth = root.clientWidth;

  for (const el of Array.from(candidates)) {
    const scrollW = el.scrollWidth;
    const clientW = el.clientWidth;
    if (scrollW > clientW + 1) {
      el.style.setProperty('width', `${scrollW}px`, 'important');
      el.style.setProperty('max-width', 'none', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      maxContentWidth = Math.max(maxContentWidth, scrollW);
    }
  }

  // Also check direct overflow on content containers.
  for (const el of Array.from(
    root.querySelectorAll<HTMLElement>(
      '.markdown-preview-sizer, .markdown-preview-view, .export-img-content',
    ),
  )) {
    if (el.scrollWidth > el.clientWidth + 1) {
      maxContentWidth = Math.max(maxContentWidth, el.scrollWidth);
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-width', 'none', 'important');
    }
  }

  // Grow host/capture so expanded children are not clipped by the configured width.
  if (maxContentWidth > root.clientWidth + 1) {
    root.style.width = `${maxContentWidth}px`;
    const capture = root.classList.contains('export-img-capture')
      ? root
      : root.querySelector<HTMLElement>('.export-img-capture');
    if (capture) {
      capture.style.width = `${maxContentWidth}px`;
      capture.style.overflow = 'visible';
    }
  }
}

export function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
