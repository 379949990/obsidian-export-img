import { Platform } from 'obsidian';
import type { ExportImgSettings, SplitMode } from '../types';
import { scaleToNumber } from '../settings';
import { defaultSplitHeight } from './split';

/**
 * Advisory soft caps for mobile memory risk notices (do not force-reduce
 * user scale or auto-split — capabilities stay intact).
 */
export const MOBILE_ADVISORY_PAGE_HEIGHT = 2400;
export const MOBILE_ADVISORY_CANVAS_PIXELS = 8_000_000;

/** Prefer shorter settle waits on mobile to reduce hangs before OOM. */
export function resolveSettleTimeoutMs(settingsTimeoutMs: number): number {
  if (!Platform.isMobile) return settingsTimeoutMs;
  return Math.min(settingsTimeoutMs, 5000);
}

export function canvasPixelCount(width: number, height: number, scale: number): number {
  return Math.max(0, width) * Math.max(0, height) * Math.max(1, scale) ** 2;
}

export function resolveCaptureScale(
  settings: ExportImgSettings,
  kind: 'preview' | 'export',
): number {
  if (kind === 'preview') return 1;
  return scaleToNumber(settings.scale);
}

/** True when a capture is likely heavy on mobile (advisory only). */
export function isMobileCanvasRisk(
  width: number,
  height: number,
  scale: number,
): boolean {
  if (!Platform.isMobile) return false;
  return (
    height > MOBILE_ADVISORY_PAGE_HEIGHT ||
    canvasPixelCount(width, height, scale) > MOBILE_ADVISORY_CANVAS_PIXELS
  );
}

export interface MobileSplitPlan {
  mode: SplitMode;
  height: number;
}

/** Resolve split settings for capture — honors the user's Split mode / height. */
export function resolveMobileSplitPlan(settings: ExportImgSettings): MobileSplitPlan {
  const baseH =
    settings.split.height > 0
      ? settings.split.height
      : defaultSplitHeight(settings.width);
  return {
    mode: settings.split.mode,
    height: baseH,
  };
}

/** True when any atomic block alone exceeds an advisory page height. */
export function hasMobileMegaBlock(
  blockHeights: number[],
  maxPageHeight: number,
): boolean {
  if (!Platform.isMobile) return false;
  const limit =
    maxPageHeight > 0 ? maxPageHeight : MOBILE_ADVISORY_PAGE_HEIGHT;
  return blockHeights.some((h) => h > limit + 0.5);
}
