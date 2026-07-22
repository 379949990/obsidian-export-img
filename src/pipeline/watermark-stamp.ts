import type { ExportFormat, WatermarkSettings } from '../types';
import { getMime } from './capture';

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode capture for watermark'));
    };
    img.src = url;
  });
}

function loadImageSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load watermark image'));
    img.src = src;
  });
}

/**
 * Draw watermark onto a captured bitmap.
 * DOM overlays are unreliable with modern-screenshot (transform/opacity clones);
 * canvas stamping guarantees the mark appears in Studio preview and export.
 */
export async function stampWatermarkOnBlob(
  blob: Blob,
  watermark: WatermarkSettings,
  format: ExportFormat,
  /** Capture pixel ratio already baked into the blob (1 for preview). */
  pixelRatio = 1,
): Promise<Blob> {
  if (!watermark.enable) return blob;

  const hasImage = watermark.type === 'image' && !!watermark.imageSrc;
  const hasText = watermark.type === 'text' && !!watermark.text.trim();
  if (!hasImage && !hasText) return blob;

  const base = await blobToImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = base.naturalWidth || base.width;
  canvas.height = base.naturalHeight || base.height;
  if (!(canvas.width > 0) || !(canvas.height > 0)) return blob;

  const ctx = canvas.getContext('2d');
  if (!ctx) return blob;

  ctx.drawImage(base, 0, 0);
  const pr = Math.max(1, pixelRatio);
  const opacity = Math.min(1, Math.max(0.05, watermark.opacity));
  const rotateRad = (watermark.rotate * Math.PI) / 180;
  // After rotation, axis-aligned loops must cover the diagonal AABB.
  const diag = Math.hypot(canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotateRad);

  if (hasImage) {
    try {
      const mark = await loadImageSrc(watermark.imageSrc);
      const maxW = Math.min(canvas.width, canvas.height) * 0.35;
      const scale = Math.min(maxW / mark.naturalWidth, maxW / mark.naturalHeight, 1);
      const w = Math.max(1, mark.naturalWidth * scale);
      const h = Math.max(1, mark.naturalHeight * scale);
      const stepX = w * 1.8 * 1.5;
      const stepY = h * 1.8 * 1.5;
      for (let y = -diag; y <= diag; y += stepY) {
        for (let x = -diag; x <= diag; x += stepX) {
          ctx.drawImage(mark, x - w / 2, y - h / 2, w, h);
        }
      }
    } catch {
      ctx.restore();
      return blob;
    }
  } else {
    const fontPx = Math.max(10, Math.round(watermark.fontSize * pr));
    ctx.font = `400 ${fontPx}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = watermark.color || '#888888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = watermark.text.trim();
    const metrics = ctx.measureText(text);
    const stepX = Math.max(metrics.width * 1.35, fontPx * 5) * 1.5;
    const stepY = Math.max(fontPx * 3.2, 56 * pr) * 1.5;

    for (let y = -diag; y <= diag; y += stepY) {
      for (let x = -diag; x <= diag; x += stepX) {
        ctx.fillText(text, x, y);
      }
    }
  }

  ctx.restore();

  const type = getMime(format);
  const quality = format === 'png' ? 1 : 0.92;
  const stamped = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), type, quality);
  });
  return stamped && stamped.size > 0 ? stamped : blob;
}
