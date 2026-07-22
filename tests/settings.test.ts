import { describe, expect, it } from 'vitest';
import { cloneSettings, DEFAULT_SETTINGS, scaleToNumber } from '../src/settings';

describe('scaleToNumber', () => {
  it('maps scale modes', () => {
    expect(scaleToNumber('1x')).toBe(1);
    expect(scaleToNumber('2x')).toBe(2);
    expect(scaleToNumber('3x')).toBe(3);
  });
});

describe('cloneSettings', () => {
  it('deep-clones nested objects', () => {
    const clone = cloneSettings(DEFAULT_SETTINGS);
    clone.padding.top = 1;
    clone.split.mode = 'hr';
    clone.watermark.text = 'x';
    clone.author.name = 'y';
    expect(DEFAULT_SETTINGS.padding.top).toBe(96);
    expect(DEFAULT_SETTINGS.split.mode).toBe('none');
    expect(DEFAULT_SETTINGS.watermark.text).toBe('Watermark');
    expect(DEFAULT_SETTINGS.author.name).toBe('Your Name');
    expect(DEFAULT_SETTINGS.author.remark).toBe('The Description');
  });
});

describe('DEFAULT_SETTINGS decorations', () => {
  it('leaves watermark and author off by default', () => {
    expect(DEFAULT_SETTINGS.watermark.enable).toBe(false);
    expect(DEFAULT_SETTINGS.author.show).toBe(false);
    expect(DEFAULT_SETTINGS.watermark.rotate).toBe(30);
    expect(DEFAULT_SETTINGS.watermark.text).toBe('Watermark');
    expect(DEFAULT_SETTINGS.author.name).toBe('Your Name');
    expect(DEFAULT_SETTINGS.author.remark).toBe('The Description');
    // Desktop mock: Platform.isMobile === false → auto re-render on.
    expect(DEFAULT_SETTINGS.autoRerenderPreview).toBe(true);
  });
});
