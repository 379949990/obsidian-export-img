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

export interface CaptureExtraOptions {
  /** Skip font embedding — much faster preview; use for studio bitmap only. */
  skipFontEmbed?: boolean;
}

/**
 * Capture DOM to bitmap.
 * `scale` drives canvas pixel ratio (DPI ≈ 96 * scale).
 * Preview should use scale=1 + skipFontEmbed; export keeps fonts for sharpness.
 */
export async function captureElement(
  el: HTMLElement,
  options: CaptureOptions,
  extra?: CaptureExtraOptions,
): Promise<Blob> {
  const type = getMime(options.format);
  const quality = options.quality ?? (options.format === 'png' ? 1 : 0.92);
  const scale = Math.max(1, options.scale);

  const blob = await domToBlob(el, {
    scale,
    type,
    quality,
    backgroundColor: getComputedStyle(el).backgroundColor || undefined,
    // Font embedding dominates capture time; keep for export, skip for preview.
    font: extra?.skipFontEmbed ? false : { preferredFormat: 'woff2' },
    // Faster image draw loop when many embeds are present.
    drawImageInterval: 0,
  });

  if (!blob) {
    throw new Error('Capture returned empty blob');
  }
  return blob;
}

export async function detectFormats(): Promise<ExportFormat[]> {
  const formats: ExportFormat[] = ['png', 'jpg'];
  try {
    const canvas = createEl('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ok = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    if (ok) formats.push('webp');
  } catch {
    // ignore
  }
  return formats;
}
