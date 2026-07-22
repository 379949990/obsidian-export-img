import { describe, expect, it } from 'vitest';
import {
  isDataImageSrc,
  isHttpImageSrc,
  isVaultImageExtension,
} from '../src/pipeline/image-source';

describe('image-source helpers', () => {
  it('detects http and data image sources', () => {
    expect(isHttpImageSrc('https://example.com/a.png')).toBe(true);
    expect(isHttpImageSrc('data:image/png;base64,xx')).toBe(false);
    expect(isDataImageSrc('data:image/png;base64,xx')).toBe(true);
    expect(isDataImageSrc('https://example.com/a.png')).toBe(false);
  });

  it('accepts common vault image extensions', () => {
    expect(isVaultImageExtension('png')).toBe(true);
    expect(isVaultImageExtension('JPG')).toBe(true);
    expect(isVaultImageExtension('md')).toBe(false);
  });
});
