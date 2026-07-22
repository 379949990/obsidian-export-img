import { Platform } from 'obsidian';
import type { ExportImgSettings, ScaleMode, SplitMode } from '../types';
import { scaleToNumber } from '../settings';
import { defaultSplitHeight } from './split';

/** Soft cap for a single capture canvas height on phones (px). */
export const MOBILE_MAX_PAGE_HEIGHT = 2400;

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

export function resolveCaptureScale(
  settings: ExportImgSettings,
  kind: 'preview' | 'export',
): number {
  if (kind === 'preview') return 1;
  return scaleToNumber(clampMobileExportScale(settings.scale));
}

export interface MobileSplitPlan {
  mode: SplitMode;
  height: number;
  autoSplit: boolean;
}

/**
 * For tall notes with split off, force fixed-height pages on mobile so
 * capture never builds one giant canvas (common crash on iPhone).
 */
export function resolveMobileSplitPlan(
  settings: ExportImgSettings,
  contentHeightPx: number,
): MobileSplitPlan {
  if (!Platform.isMobile || settings.split.mode !== 'none') {
    return {
      mode: settings.split.mode,
      height:
        settings.split.height > 0
          ? settings.split.height
          : defaultSplitHeight(settings.width),
      autoSplit: false,
    };
  }

  if (contentHeightPx <= MOBILE_MAX_PAGE_HEIGHT) {
    return {
      mode: 'none',
      height: settings.split.height,
      autoSplit: false,
    };
  }

  const height = Math.min(
    MOBILE_MAX_PAGE_HEIGHT,
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
