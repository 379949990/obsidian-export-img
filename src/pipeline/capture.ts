import { domToBlob } from 'modern-screenshot';
import type { CaptureOptions, ExportFormat } from '../types';

export function getMime(format: ExportFormat): string {
  if (format === 'jpg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

export function getExtension(format: ExportFormat): string {
  return format === 'jpg' ? 'jpg' : format;
}

/**
 * Capture DOM to bitmap.
 * `scale` drives canvas pixel ratio (DPI ≈ 96 * scale). Explicit dpi keeps
 * print metadata aligned so 2x/3x exports are measurably sharper when zoomed.
 */
export async function captureElement(
  el: HTMLElement,
  options: CaptureOptions,
): Promise<Blob> {
  const type = getMime(options.format);
  const quality = options.quality ?? (options.format === 'png' ? 1 : 0.92);
  const scale = Math.max(1, options.scale);

  const blob = await domToBlob(el, {
    scale,
    type,
    quality,
    backgroundColor: getComputedStyle(el).backgroundColor || undefined,
    // Prefer WOFF2 embeds when available — sharper text at high scale.
    font: { preferredFormat: 'woff2' },
  });

  if (!blob) {
    throw new Error('Capture returned empty blob');
  }
  return blob;
}

export async function detectFormats(): Promise<ExportFormat[]> {
  const formats: ExportFormat[] = ['png', 'jpg'];
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ok = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    if (ok) formats.push('webp');
  } catch {
    // ignore
  }
  return formats;
}
