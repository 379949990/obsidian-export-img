import { describe, expect, it } from 'vitest';
import { parseCssBox } from '../src/pipeline/document-padding';

describe('parseCssBox', () => {
  it('returns null for empty input', () => {
    expect(parseCssBox('')).toBeNull();
    expect(parseCssBox('   ')).toBeNull();
  });

  it('parses 1–4 value shorthands', () => {
    expect(parseCssBox('10px')).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
    expect(parseCssBox('10px 20px')).toEqual({ top: 10, right: 20, bottom: 10, left: 20 });
    expect(parseCssBox('10px 20px 30px')).toEqual({
      top: 10,
      right: 20,
      bottom: 30,
      left: 20,
    });
    expect(parseCssBox('10px 20px 30px 40px')).toEqual({
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
    });
  });

  it('rounds and clamps non-finite parts to 0', () => {
    expect(parseCssBox('10.6px')).toEqual({ top: 11, right: 11, bottom: 11, left: 11 });
  });
});
