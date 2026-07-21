import { describe, expect, it } from 'vitest';
import { getExtension, getMime } from '../src/pipeline/capture';

describe('getMime / getExtension', () => {
  it('maps export formats', () => {
    expect(getMime('png')).toBe('image/png');
    expect(getMime('jpg')).toBe('image/jpeg');
    expect(getMime('webp')).toBe('image/webp');
    expect(getExtension('png')).toBe('png');
    expect(getExtension('jpg')).toBe('jpg');
    expect(getExtension('webp')).toBe('webp');
  });
});
