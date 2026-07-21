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

export async function captureElement(
  el: HTMLElement,
  options: CaptureOptions,
): Promise<Blob> {
  const type = getMime(options.format);
  const quality = options.quality ?? (options.format === 'png' ? 1 : 0.92);

  const blob = await domToBlob(el, {
    scale: options.scale,
    type,
    quality,
    backgroundColor: getComputedStyle(el).backgroundColor || undefined,
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
