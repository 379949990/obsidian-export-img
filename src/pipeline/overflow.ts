import type { EmbedAlign } from '../types';

const WIDE_BLOCK_SELECTOR = [
  '.mermaid',
  'pre',
  'table',
  '.table-wrapper',
  '.cm-preview-code-block',
  '.mjx-container',
  '.MathJax',
].join(',');

function contentTargetWidth(root: HTMLElement): number {
  const sizer = root.querySelector<HTMLElement>('.markdown-preview-sizer');
  const content = root.querySelector<HTMLElement>('.export-img-content');
  const capture = root.classList.contains('export-img-capture')
    ? root
    : root.querySelector<HTMLElement>('.export-img-capture');
  const measured = Math.max(
    sizer?.clientWidth ?? 0,
    content?.clientWidth ?? 0,
    capture?.clientWidth ?? 0,
    root.clientWidth,
  );
  if (measured > 1) return measured;

  const styled = Number.parseInt(root.style.width, 10);
  return Number.isFinite(styled) && styled > 0 ? styled : 1;
}

function unlockOverflow(root: HTMLElement): void {
  const selectors = [
    '.markdown-preview-view',
    '.markdown-preview-sizer',
    '.export-img-content',
    '.export-img-capture',
    '.table-wrapper',
    '.cm-preview-code-block',
    '.mermaid',
    'pre',
    '.internal-embed',
    '.image-embed',
  ].join(',');

  for (const el of Array.from(root.querySelectorAll<HTMLElement>(selectors))) {
    el.style.setProperty('overflow', 'visible', 'important');
    el.style.setProperty('overflow-x', 'visible', 'important');
    el.style.setProperty('overflow-y', 'visible', 'important');
  }
}

function applyAlign(el: HTMLElement | SVGElement, align: EmbedAlign): void {
  if (align === 'center') {
    el.style.setProperty('margin-left', 'auto', 'important');
    el.style.setProperty('margin-right', 'auto', 'important');
  } else {
    el.style.setProperty('margin-left', '0', 'important');
    el.style.setProperty('margin-right', 'auto', 'important');
  }
}

function constrainImages(root: HTMLElement, maxHeight: number, align: EmbedAlign): void {
  const alignValue = align === 'left' ? 'left' : 'center';
  const images = root.querySelectorAll<HTMLImageElement>(
    'img, .image-embed img, .internal-embed img, .media-embed img',
  );

  for (const img of Array.from(images)) {
    if (img.closest('.export-img-watermark, .export-img-author')) continue;

    if (maxHeight > 0) {
      img.style.setProperty('max-height', `${maxHeight}px`, 'important');
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('object-fit', 'contain', 'important');
    }

    const wrap = img.closest<HTMLElement>(
      '.image-embed, .internal-embed, .media-embed, p, div',
    );
    if (wrap) {
      wrap.style.textAlign = alignValue;
    }
    applyAlign(img, align);
    img.style.setProperty('display', 'block', 'important');
  }
}

function readSvgNaturalSize(svg: SVGSVGElement): { w: number; h: number } {
  try {
    const box = svg.getBBox();
    if (box.width > 0 && box.height > 0) {
      return { w: box.width, h: box.height };
    }
  } catch {
    // Not rendered yet.
  }

  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    return { w: vb.width, h: vb.height };
  }

  const attrW = Number(svg.getAttribute('width'));
  const attrH = Number(svg.getAttribute('height'));
  if (Number.isFinite(attrW) && Number.isFinite(attrH) && attrW > 0 && attrH > 0) {
    return { w: attrW, h: attrH };
  }

  return {
    w: svg.scrollWidth || svg.clientWidth || 0,
    h: svg.scrollHeight || svg.clientHeight || 0,
  };
}

function fitSvgToWidth(
  svg: SVGSVGElement,
  targetWidth: number,
  maxHeight: number,
  align: EmbedAlign,
): void {
  const { w: natW, h: natH } = readSvgNaturalSize(svg);
  if (!(natW > 0) || !(natH > 0)) return;

  let w = targetWidth;
  let h = (natH / natW) * w;
  if (maxHeight > 0 && h > maxHeight) {
    h = maxHeight;
    w = (natW / natH) * h;
  }

  svg.setAttribute('width', String(Math.round(w)));
  svg.setAttribute('height', String(Math.round(h)));
  svg.style.setProperty('width', `${w}px`, 'important');
  svg.style.setProperty('height', `${h}px`, 'important');
  svg.style.setProperty('max-width', '100%', 'important');
  svg.style.setProperty('max-height', maxHeight > 0 ? `${maxHeight}px` : 'none', 'important');
  svg.style.setProperty('display', 'block', 'important');
  applyAlign(svg, align);

  const wrap = svg.closest<HTMLElement>('.mermaid') ?? svg.parentElement;
  if (wrap) {
    wrap.style.setProperty('width', '100%', 'important');
    wrap.style.setProperty('max-width', '100%', 'important');
    wrap.style.setProperty('overflow', 'visible', 'important');
    wrap.style.setProperty('text-align', align === 'left' ? 'left' : 'center', 'important');
  }
}

function ensureFitWrap(el: HTMLElement): HTMLElement {
  const parent = el.parentElement;
  if (parent?.classList.contains('export-img-fit-wrap')) {
    return parent;
  }
  if (!parent) return el;

  const wrap = document.createElement('div');
  wrap.className = 'export-img-fit-wrap';
  parent.insertBefore(wrap, el);
  wrap.appendChild(el);
  return wrap;
}

function fitBlockToWidth(
  el: HTMLElement,
  targetWidth: number,
  maxHeight: number,
  align: EmbedAlign,
): void {
  if (el.tagName === 'SVG' && el.closest('.callout-icon, .lucide, .svg-icon')) {
    return;
  }

  const svg =
    el.tagName === 'SVG'
      ? (el as unknown as SVGSVGElement)
      : el.querySelector<SVGSVGElement>('svg');

  if (svg && (el.classList.contains('mermaid') || el.tagName === 'SVG' || svg.closest('.mermaid'))) {
    fitSvgToWidth(svg, targetWidth, maxHeight, align);
    return;
  }

  el.style.removeProperty('transform');
  el.style.removeProperty('transform-origin');
  el.style.setProperty('max-width', 'none', 'important');
  el.style.setProperty('overflow', 'visible', 'important');

  const natW = el.scrollWidth;
  const natH = el.scrollHeight;
  if (!(natW > 0) || !(natH > 0)) return;

  const needsWidthFit = natW > targetWidth + 1;
  const needsHeightFit = maxHeight > 0 && natH > maxHeight;

  if (!needsWidthFit && !needsHeightFit) {
    el.style.setProperty('max-width', '100%', 'important');
    // Still honor alignment for blocks narrower than the content width.
    const wrap = ensureFitWrap(el);
    wrap.style.width = '100%';
    wrap.style.height = 'auto';
    wrap.style.overflow = 'visible';
    wrap.style.display = 'flex';
    wrap.style.justifyContent = align === 'left' ? 'flex-start' : 'center';
    return;
  }

  let scale = needsWidthFit ? targetWidth / natW : 1;
  if (maxHeight > 0) {
    scale = Math.min(scale, maxHeight / natH);
  }
  if (scale >= 0.999) {
    el.style.setProperty('max-width', '100%', 'important');
    const wrap = ensureFitWrap(el);
    wrap.style.width = '100%';
    wrap.style.display = 'flex';
    wrap.style.justifyContent = align === 'left' ? 'flex-start' : 'center';
    return;
  }

  const wrap = ensureFitWrap(el);
  const scaledH = natH * scale;
  wrap.style.width = '100%';
  wrap.style.height = `${scaledH}px`;
  wrap.style.overflow = 'hidden';
  wrap.style.display = 'flex';
  wrap.style.justifyContent = align === 'left' ? 'flex-start' : 'center';
  wrap.style.alignItems = 'flex-start';

  el.style.setProperty('transform', `scale(${scale})`, 'important');
  el.style.setProperty('transform-origin', 'top left', 'important');
  el.style.setProperty('width', `${natW}px`, 'important');
  el.style.setProperty('max-width', 'none', 'important');
  el.style.setProperty('flex', '0 0 auto', 'important');
}

/**
 * Prepare embeds for capture:
 * - Wide / horizontally scrollable blocks fit to content width (100%).
 * - Height optionally clamped by embedMaxHeight.
 * - embedAlign always applies (even when below max height).
 */
export function prepareEmbedLayout(
  root: HTMLElement,
  maxHeight: number,
  align: EmbedAlign,
): void {
  unlockOverflow(root);
  constrainImages(root, maxHeight, align);

  const targetWidth = contentTargetWidth(root);
  const blocks = root.querySelectorAll<HTMLElement>(WIDE_BLOCK_SELECTOR);

  for (const el of Array.from(blocks)) {
    if (el.closest('.export-img-watermark, .export-img-author')) continue;
    if (el.matches('svg') && el.closest('.mermaid')) continue;
    fitBlockToWidth(el, targetWidth, maxHeight, align);
  }
}

export function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
