import { afterEach, describe, expect, it } from 'vitest';
import { Platform } from 'obsidian';
import {
  MOBILE_ADVISORY_CANVAS_PIXELS,
  MOBILE_ADVISORY_PAGE_HEIGHT,
  canvasPixelCount,
  hasMobileMegaBlock,
  isMobileCanvasRisk,
  resolveCaptureScale,
  resolveMobileSplitPlan,
  resolveSettleTimeoutMs,
} from '../src/pipeline/mobile-limits';
import { DEFAULT_SETTINGS, cloneSettings } from '../src/settings';

afterEach(() => {
  (Platform as { isMobile: boolean }).isMobile = false;
});

describe('mobile-limits (desktop)', () => {
  it('does not shorten settle timeout', () => {
    (Platform as { isMobile: boolean }).isMobile = false;
    expect(resolveSettleTimeoutMs(8000)).toBe(8000);
    expect(resolveCaptureScale(cloneSettings(DEFAULT_SETTINGS), 'export')).toBe(2);
  });

  it('does not flag canvas risk', () => {
    (Platform as { isMobile: boolean }).isMobile = false;
    expect(isMobileCanvasRisk(720, 5000, 3)).toBe(false);
  });
});

describe('mobile-limits (mobile)', () => {
  it('keeps full scale including 3× and shortens settle timeout', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    expect(resolveSettleTimeoutMs(8000)).toBe(5000);
    expect(resolveSettleTimeoutMs(3000)).toBe(3000);
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.scale = '3x';
    expect(resolveCaptureScale(settings, 'export')).toBe(3);
    expect(resolveCaptureScale(settings, 'preview')).toBe(1);
  });

  it('honors user split mode without forcing pagination', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    const off = cloneSettings(DEFAULT_SETTINGS);
    off.split.mode = 'none';
    expect(resolveMobileSplitPlan(off).mode).toBe('none');

    const hr = cloneSettings(DEFAULT_SETTINGS);
    hr.split.mode = 'hr';
    hr.split.height = 1800;
    expect(resolveMobileSplitPlan(hr)).toEqual({ mode: 'hr', height: 1800 });
  });

  it('advises high canvas risk without changing scale', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    const width = 720;
    const height = 3000;
    expect(canvasPixelCount(width, height, 2)).toBeGreaterThan(MOBILE_ADVISORY_CANVAS_PIXELS);
    expect(isMobileCanvasRisk(width, height, 2)).toBe(true);
    expect(isMobileCanvasRisk(width, 400, 1)).toBe(false);
  });

  it('flags mega-blocks taller than advisory page height', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    expect(hasMobileMegaBlock([100, 2500], MOBILE_ADVISORY_PAGE_HEIGHT)).toBe(true);
    expect(hasMobileMegaBlock([100, 200], MOBILE_ADVISORY_PAGE_HEIGHT)).toBe(false);
  });
});
