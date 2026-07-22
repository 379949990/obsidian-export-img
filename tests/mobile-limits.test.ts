import { afterEach, describe, expect, it } from 'vitest';
import { Platform } from 'obsidian';
import {
  MOBILE_ADVISORY_CANVAS_PIXELS,
  MOBILE_ADVISORY_PAGE_HEIGHT,
  canvasPixelCount,
  clampMobileExportScale,
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
    expect(clampMobileExportScale('3x')).toBe('3x');
    expect(clampMobileExportScale('2x')).toBe('2x');
    expect(resolveSettleTimeoutMs(8000)).toBe(5000);
    expect(resolveSettleTimeoutMs(3000)).toBe(3000);
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.scale = '3x';
    expect(resolveCaptureScale(settings, 'export')).toBe(3);
    expect(resolveCaptureScale(settings, 'preview')).toBe(1);
  });

  it('never force-auto-splits tall notes', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.split.mode = 'none';
    settings.split.height = 0;
    const plan = resolveMobileSplitPlan(settings, MOBILE_ADVISORY_PAGE_HEIGHT + 100, 2);
    expect(plan.autoSplit).toBe(false);
    expect(plan.mode).toBe('none');
  });

  it('honors explicit user split mode', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.split.mode = 'hr';
    settings.split.height = 1800;
    const plan = resolveMobileSplitPlan(settings, 5000, 2);
    expect(plan.autoSplit).toBe(false);
    expect(plan.mode).toBe('hr');
    expect(plan.height).toBe(1800);
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
    expect(hasMobileMegaBlock([100, 2500], 2400)).toBe(true);
    expect(hasMobileMegaBlock([100, 200], 2400)).toBe(false);
  });
});
