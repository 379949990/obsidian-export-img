import { describe, expect, it } from 'vitest';
import {
  resolveWatermarkTileStep,
  WATERMARK_MAX_TILES,
} from '../src/pipeline/watermark-stamp';

describe('resolveWatermarkTileStep', () => {
  it('keeps designed steps for a normal page diagonal', () => {
    // ~800×1131 preview page
    const diag = Math.hypot(800, 1131);
    const step = resolveWatermarkTileStep(180, 84, diag);
    expect(step.stepX).toBe(180);
    expect(step.stepY).toBe(84);
  });

  it('grows steps only when tile count would exceed the budget', () => {
    const step = resolveWatermarkTileStep(10, 10, 50_000, WATERMARK_MAX_TILES);
    const span = 2 * 50_000;
    const nx = Math.ceil(span / step.stepX) + 1;
    const ny = Math.ceil(span / step.stepY) + 1;
    expect(nx * ny).toBeLessThanOrEqual(WATERMARK_MAX_TILES);
    expect(step.stepX).toBeGreaterThan(10);
    expect(step.stepY).toBeGreaterThan(10);
  });
});
