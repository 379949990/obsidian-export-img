import { afterEach, describe, expect, it } from 'vitest';
import { Platform } from 'obsidian';
import {
  MOBILE_MAX_PAGE_HEIGHT,
  clampMobileExportScale,
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

  it('auto-splits tall unsplit notes', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.split.mode = 'none';
    settings.split.height = 0;
    const plan = resolveMobileSplitPlan(settings, MOBILE_MAX_PAGE_HEIGHT + 100);
    expect(plan.autoSplit).toBe(true);
    expect(plan.mode).toBe('fixed');
    expect(plan.height).toBeLessThanOrEqual(MOBILE_MAX_PAGE_HEIGHT);
    expect(plan.height).toBeGreaterThanOrEqual(200);
  });

  it('keeps explicit user split mode', () => {
    (Platform as { isMobile: boolean }).isMobile = true;
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.split.mode = 'hr';
    const plan = resolveMobileSplitPlan(settings, MOBILE_MAX_PAGE_HEIGHT + 100);
    expect(plan.autoSplit).toBe(false);
    expect(plan.mode).toBe('hr');
  });
});
