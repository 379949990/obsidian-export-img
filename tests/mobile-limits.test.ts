import { afterEach, describe, expect, it } from 'vitest';
import { Platform } from 'obsidian';
import {
  MOBILE_MAX_CANVAS_PIXELS,
  MOBILE_MAX_PAGE_HEIGHT,
  canvasPixelCount,
  clampMobileExportScale,
  hasMobileMegaBlock,
  maxHeightForCanvasBudget,
  resolveBudgetedCaptureScale,
  resolveCaptureScale,
  resolveMobileSplitPlan,
  resolveSettleTimeoutMs,
} from '../src/pipeline/mobile-limits';
import { DEFAULT_SETTINGS, cloneSettings } from '../src/settings';

afterEach(() => {
  (Platform as { isMobile: boolean }).isMobile = false;
});

describe('mobile-limits (desktop)', () => {
  it('does not clamp scale or settle timeout', () => {
    (Platform as { isMobile: boolean }).isMobile = false;
    expect(clampMobileExportScale('3x')).toBe('3x');
    expect(resolveSettleTimeoutMs(8000)).toBe(8000);
    expect(resolveCaptureScale(cloneSettings(DEFAULT_SETTINGS), 'export')).toBe(2);
  });

  it('does not auto-split tall notes', () => {
    (Platform as { isMobile: boolean }).isMobile = false;
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.split.mode = 'none';
    const plan = resolveMobileSplitPlan(settings, MOBILE_MAX_PAGE_HEIGHT + 500);
    expect(plan.autoSplit).toBe(false);
    expect(plan.mode).toBe('none');
  });

  it('does not budget-reduce scale', () => {
    (Platform as { isMobile: boolean }).isMobile = false;
    const result = resolveBudgetedCaptureScale(720, 4000, 3);
    expect(result).toEqual({ scale: 3, reduced: false });
  });
});

describe('mobile-limits (mobile)', () => {
  it('caps export scale at 2× and shortens settle timeout', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    expect(clampMobileExportScale('3x')).toBe('2x');
    expect(clampMobileExportScale('2x')).toBe('2x');
    expect(resolveSettleTimeoutMs(8000)).toBe(5000);
    expect(resolveSettleTimeoutMs(3000)).toBe(3000);
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.scale = '3x';
    expect(resolveCaptureScale(settings, 'export')).toBe(2);
    expect(resolveCaptureScale(settings, 'preview')).toBe(1);
  });

  it('auto-splits tall unsplit notes using pixel budget height', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.split.mode = 'none';
    settings.split.height = 0;
    settings.width = 720;
    const plan = resolveMobileSplitPlan(settings, MOBILE_MAX_PAGE_HEIGHT + 100, 2);
    expect(plan.autoSplit).toBe(true);
    expect(plan.mode).toBe('fixed');
    expect(plan.height).toBeLessThanOrEqual(maxHeightForCanvasBudget(720, 2));
    expect(plan.height).toBeGreaterThanOrEqual(200);
  });

  it('keeps explicit user split mode but caps height to budget', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.split.mode = 'hr';
    settings.split.height = 5000;
    settings.width = 720;
    const plan = resolveMobileSplitPlan(settings, MOBILE_MAX_PAGE_HEIGHT + 100, 2);
    expect(plan.autoSplit).toBe(false);
    expect(plan.mode).toBe('hr');
    expect(plan.height).toBeLessThanOrEqual(maxHeightForCanvasBudget(720, 2));
  });

  it('reduces scale until the page fits the canvas budget', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    const width = 720;
    const height = 3000;
    expect(canvasPixelCount(width, height, 2)).toBeGreaterThan(MOBILE_MAX_CANVAS_PIXELS);
    const result = resolveBudgetedCaptureScale(width, height, 2);
    expect(result.reduced).toBe(true);
    expect(result.scale).toBe(1);
    expect(canvasPixelCount(width, height, result.scale)).toBeLessThanOrEqual(
      MOBILE_MAX_CANVAS_PIXELS,
    );
  });

  it('flags mega-blocks taller than one page', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    expect(hasMobileMegaBlock([100, 2500], 2400)).toBe(true);
    expect(hasMobileMegaBlock([100, 200], 2400)).toBe(false);
  });
});
