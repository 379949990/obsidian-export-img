import { Platform } from 'obsidian';
import type { ExportImgSettings, ScaleMode, SplitMode } from '../types';
import { scaleToNumber } from '../settings';
import { defaultSplitHeight } from './split';

/** Soft cap for a single capture canvas height on phones (CSS px). */
export const MOBILE_MAX_PAGE_HEIGHT = 2400;

/**
 * Soft pixel budget for one capture canvas (width × height × scale²).
 * ~8M keeps RGBA backing stores near ~32MB before encoder overhead.
 */
export const MOBILE_MAX_CANVAS_PIXELS = 8_000_000;

/** Prefer shorter settle waits on mobile to reduce hangs before OOM. */
export function resolveSettleTimeoutMs(settingsTimeoutMs: number): number {
  if (!Platform.isMobile) return settingsTimeoutMs;
  return Math.min(settingsTimeoutMs, 5000);
}

/** Export scale on mobile: never above 2× (3× canvases OOM easily). */
export function clampMobileExportScale(scale: ScaleMode): ScaleMode {
  if (!Platform.isMobile) return scale;
  if (scale === '3x') return '2x';
  return scale;
}

/** Max CSS height that fits the canvas pixel budget at the given width/scale. */
export function maxHeightForCanvasBudget(width: number, scale: number): number {
  const w = Math.max(1, width);
  const s = Math.max(1, scale);
  const raw = Math.floor(MOBILE_MAX_CANVAS_PIXELS / (w * s * s));
  return Math.max(200, Math.min(MOBILE_MAX_PAGE_HEIGHT, raw));
}

export function canvasPixelCount(width: number, height: number, scale: number): number {
  return Math.max(0, width) * Math.max(0, height) * Math.max(1, scale) ** 2;
}

export function resolveCaptureScale(
  settings: ExportImgSettings,
  kind: 'preview' | 'export',
): number {
  if (kind === 'preview') return 1;
  return scaleToNumber(clampMobileExportScale(settings.scale));
}

/**
 * Drop export scale until the tallest page fits the pixel budget (mobile only).
 * Returns the numeric scale to use for capture.
 */
export function resolveBudgetedCaptureScale(
  width: number,
  tallestPageHeight: number,
  preferredScale: number,
): { scale: number; reduced: boolean } {
  if (!Platform.isMobile) {
    return { scale: preferredScale, reduced: false };
  }
  let scale = Math.max(1, preferredScale);
  while (
    scale > 1 &&
    canvasPixelCount(width, tallestPageHeight, scale) > MOBILE_MAX_CANVAS_PIXELS
  ) {
    scale -= 1;
  }
  return { scale, reduced: scale < preferredScale };
}

export interface MobileSplitPlan {
  mode: SplitMode;
  height: number;
  autoSplit: boolean;
}

/**
 * For tall notes with split off, force fixed-height pages on mobile so
 * capture never builds one giant canvas (common crash on iPhone).
 * Page height is also capped by the canvas pixel budget at the preferred scale.
 */
export function resolveMobileSplitPlan(
  settings: ExportImgSettings,
  contentHeightPx: number,
  preferredScale = 1,
): MobileSplitPlan {
  const budgetH = maxHeightForCanvasBudget(settings.width, preferredScale);

  if (!Platform.isMobile || settings.split.mode !== 'none') {
    const baseH =
      settings.split.height > 0
        ? settings.split.height
        : defaultSplitHeight(settings.width);
    return {
      mode: settings.split.mode,
      height: Platform.isMobile ? Math.min(baseH, budgetH) : baseH,
      autoSplit: false,
    };
  }

  if (contentHeightPx <= budgetH) {
    return {
      mode: 'none',
      height: settings.split.height,
      autoSplit: false,
    };
  }

  const height = Math.min(
    budgetH,
    settings.split.height > 0
      ? settings.split.height
      : defaultSplitHeight(settings.width),
  );

  return {
    mode: 'fixed',
    height: Math.max(200, height),
    autoSplit: true,
  };
}

/** True when any atomic block alone exceeds the mobile page budget. */
export function hasMobileMegaBlock(
  blockHeights: number[],
  maxPageHeight: number,
): boolean {
  if (!Platform.isMobile) return false;
  return blockHeights.some((h) => h > maxPageHeight + 0.5);
}
