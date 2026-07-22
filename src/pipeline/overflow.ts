import type { EmbedAlign, PaddingSettings } from '../types';

const WIDE_BLOCK_SELECTOR = [
  '.mermaid',
  'pre',
  'table',
  '.table-wrapper',
  '.cm-preview-code-block',
  '.mjx-container',
  '.MathJax',
].join(',');

const UNLOCK_OVERFLOW_SELECTOR = [
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

export function applyCapturePadding(el: HTMLElement, padding: PaddingSettings): void {
  el.setCssProps({
    '--export-img-pad-t': `${padding.top}px`,
    '--export-img-pad-r': `${padding.right}px`,
    '--export-img-pad-b': `${padding.bottom}px`,
    '--export-img-pad-l': `${padding.left}px`,
  });
}

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

  const styled = Number.parseInt(getComputedStyle(root).width, 10);
  return Number.isFinite(styled) && styled > 0 ? styled : 1;
}

function unlockOverflow(root: HTMLElement): void {
  root.addClass('is-layout-prepared');
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(UNLOCK_OVERFLOW_SELECTOR))) {
    el.addClass('export-img-unlock-overflow');
  }
}

function applyAlignClass(el: Element, align: EmbedAlign): void {
  el.classList.remove('export-img-align-left', 'export-img-align-center');
  el.classList.add(align === 'center' ? 'export-img-align-center' : 'export-img-align-left');
}

function clearAlignClasses(el: Element): void {
  el.classList.remove(
    'export-img-align-left',
    'export-img-align-center',
    'export-img-text-align-left',
    'export-img-text-align-center',
  );
}

/** True Obsidian embeds get block layout; raw HTML / badge rows stay inline. */
function isObsidianEmbedImage(img: HTMLImageElement): boolean {
  return !!img.closest('.image-embed, .internal-embed, .media-embed');
}

function applyTextAlign(wrap: HTMLElement | null, align: EmbedAlign): void {
  if (!wrap) return;
  wrap.removeClass('export-img-text-align-left');
  wrap.removeClass('export-img-text-align-center');
  wrap.addClass(
    align === 'left' ? 'export-img-text-align-left' : 'export-img-text-align-center',
  );
}

/** Whether an image would exceed maxHeight when fitted to content width. */
function imageReachesMaxHeight(
  img: HTMLImageElement,
  maxHeight: number,
  contentWidth: number,
): boolean {
  if (!(maxHeight > 0)) return false;
  const natW = img.naturalWidth || img.width || 0;
  const natH = img.naturalHeight || img.height || 0;
  if (natW > 0 && natH > 0) {
    const fitW = contentWidth > 0 ? Math.min(natW, contentWidth) : natW;
    const fittedH = (natH / natW) * fitW;
    return fittedH >= maxHeight - 0.5;
  }
  return img.clientHeight >= maxHeight - 1;
}

function constrainImages(root: HTMLElement, maxHeight: number, align: EmbedAlign): void {
  const images = root.querySelectorAll<HTMLImageElement>(
    'img, .image-embed img, .internal-embed img, .media-embed img',
  );
  const contentWidth = contentTargetWidth(root);

  for (const img of Array.from(images)) {
    if (img.closest('.export-img-watermark, .export-img-author')) continue;

    if (maxHeight > 0) {
      img.addClass('export-img-embed-constrained');
      img.setCssProps({ '--export-img-embed-max-h': `${maxHeight}px` });
    } else {
      img.removeClass('export-img-embed-constrained');
    }

    const embed = isObsidianEmbedImage(img);
    if (embed) {
      img.addClass('export-img-embed-block');
    } else {
      img.removeClass('export-img-embed-block');
    }

    const wrap = img.closest<HTMLElement>(
      '.image-embed, .internal-embed, .media-embed, p, div',
    );
    clearAlignClasses(img);
    if (wrap) {
      wrap.removeClass('export-img-text-align-left');
      wrap.removeClass('export-img-text-align-center');
    }

    // Align only media that hits the height cap.
    if (!imageReachesMaxHeight(img, maxHeight, contentWidth)) continue;

    applyTextAlign(wrap, align);
    if (embed) {
      applyAlignClass(img, align);
    }
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
  let heightCapped = false;
  if (maxHeight > 0 && h > maxHeight) {
    h = maxHeight;
    w = (natW / natH) * h;
    heightCapped = true;
  }

  svg.setAttribute('width', String(Math.round(w)));
  svg.setAttribute('height', String(Math.round(h)));
  svg.classList.add('export-img-mermaid-svg');
  clearAlignClasses(svg);
  if (heightCapped) {
    applyAlignClass(svg, align);
  }

  const wrapEl = svg.closest('.mermaid') ?? svg.parentElement;
  if (!(wrapEl instanceof HTMLElement)) return;
  wrapEl.addClass('export-img-mermaid-wrap');
  wrapEl.removeClass('export-img-text-align-left');
  wrapEl.removeClass('export-img-text-align-center');
  if (heightCapped) {
    applyTextAlign(wrapEl, align);
  }
  wrapEl.setCssProps({
    '--export-img-embed-max-h': maxHeight > 0 ? `${maxHeight}px` : 'none',
  });
}

function ensureFitWrap(el: HTMLElement): HTMLElement {
  const parent = el.parentElement;
  if (parent?.hasClass('export-img-fit-wrap')) {
    return parent;
  }
  if (!parent) return el;

  const wrap = createDiv({ cls: 'export-img-fit-wrap' });
  parent.insertBefore(wrap, el);
  wrap.appendChild(el);
  return wrap;
}

function setFitWrapAlign(wrap: HTMLElement, align: EmbedAlign, apply: boolean): void {
  wrap.removeClass('is-align-left');
  wrap.removeClass('is-align-center');
  if (!apply) return;
  wrap.addClass(align === 'left' ? 'is-align-left' : 'is-align-center');
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

  el.removeClass('is-scaled');
  el.removeClass('is-capped');
  el.addClass('export-img-fit-target');

  const natW = el.scrollWidth;
  const natH = el.scrollHeight;
  if (!(natW > 0) || !(natH > 0)) return;

  const needsWidthFit = natW > targetWidth + 1;
  const needsHeightFit = maxHeight > 0 && natH > maxHeight;

  if (!needsWidthFit && !needsHeightFit) {
    el.addClass('is-capped');
    const wrap = ensureFitWrap(el);
    wrap.removeClass('is-scaled');
    setFitWrapAlign(wrap, align, false);
    return;
  }

  let scale = needsWidthFit ? targetWidth / natW : 1;
  if (maxHeight > 0) {
    scale = Math.min(scale, maxHeight / natH);
  }
  const heightCapped = maxHeight > 0 && natH * scale <= maxHeight + 0.5 && natH > maxHeight;
  if (scale >= 0.999) {
    el.addClass('is-capped');
    const wrap = ensureFitWrap(el);
    wrap.removeClass('is-scaled');
    setFitWrapAlign(wrap, align, heightCapped || needsHeightFit);
    return;
  }

  const wrap = ensureFitWrap(el);
  const scaledH = natH * scale;
  wrap.addClass('is-scaled');
  setFitWrapAlign(wrap, align, maxHeight > 0 && scaledH <= maxHeight + 0.5 && natH > maxHeight);
  wrap.setCssProps({ '--export-img-fit-h': `${scaledH}px` });

  el.addClass('is-scaled');
  el.setCssProps({
    '--export-img-fit-scale': String(scale),
    '--export-img-fit-nat-w': `${natW}px`,
  });
}

/**
 * Prepare embeds for capture:
 * - Wide / horizontally scrollable blocks fit to content width (100%).
 * - Height optionally clamped by embedMaxHeight.
 * - embedAlign applies only to media that reaches that height cap.
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
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}
