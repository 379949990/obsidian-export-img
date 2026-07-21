import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, cloneSettings } from '../src/settings';
import {
  assertNonEmptyCapture,
  getCaptureSignature,
  getExportCacheKey,
  getRenderSignature,
  getWorkSignature,
  resolvePreviewPhase,
} from '../src/ui/studio-pipeline';

describe('studio signatures', () => {
  it('changes render sig when width changes, not when format changes', () => {
    const a = cloneSettings(DEFAULT_SETTINGS);
    const b = cloneSettings(DEFAULT_SETTINGS);
    b.format = 'jpg';
    expect(getRenderSignature(a)).toBe(getRenderSignature(b));
    expect(getCaptureSignature(a)).not.toBe(getCaptureSignature(b));

    b.width = a.width + 10;
    expect(getRenderSignature(a)).not.toBe(getRenderSignature(b));
  });

  it('includes scale only in export cache key', () => {
    const a = cloneSettings(DEFAULT_SETTINGS);
    const b = cloneSettings(DEFAULT_SETTINGS);
    b.scale = '3x';
    expect(getCaptureSignature(a)).toBe(getCaptureSignature(b));
    expect(getExportCacheKey(a)).not.toBe(getExportCacheKey(b));
    expect(getWorkSignature(a)).toBe(getWorkSignature(b));
  });
});

describe('resolvePreviewPhase', () => {
  it('rebuilds when host is missing or render sig drifted', () => {
    const settings = cloneSettings(DEFAULT_SETTINGS);
    const sig = getRenderSignature(settings);
    expect(resolvePreviewPhase(null, '', settings).phase).toBe('rebuild');
    expect(resolvePreviewPhase({} as never, 'stale', settings)).toEqual({
      phase: 'rebuild',
      renderSig: sig,
    });
    expect(resolvePreviewPhase({} as never, sig, settings)).toEqual({
      phase: 'recapture',
      renderSig: sig,
    });
  });
});

describe('assertNonEmptyCapture', () => {
  it('accepts a non-trivial blob', () => {
    expect(() =>
      assertNonEmptyCapture([{ blob: new Blob([new Uint8Array(64)]) }], 'preview'),
    ).not.toThrow();
  });

  it('rejects missing or tiny blobs', () => {
    expect(() => assertNonEmptyCapture([], 'export')).toThrow(/empty image/);
    expect(() =>
      assertNonEmptyCapture([{ blob: new Blob([new Uint8Array(8)]) }], 'export'),
    ).toThrow(/empty image/);
  });
});
