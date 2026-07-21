import { afterEach, describe, expect, it } from 'vitest';
import {
  getLocalePreference,
  resolveLocale,
  setLocalePreference,
  t,
} from '../src/i18n';

describe('i18n', () => {
  const previous = getLocalePreference();

  afterEach(() => {
    setLocalePreference(previous);
  });

  it('resolveLocale honors explicit en / zh', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('zh')).toBe('zh');
  });

  it('interpolates notice templates', () => {
    setLocalePreference('en');
    expect(t('notice.saveSuccess', { path: 'a/b.png' })).toBe('Saved: a/b.png');
  });

  it('falls back to the key when missing', () => {
    setLocalePreference('en');
    expect(t('does.not.exist')).toBe('does.not.exist');
  });
});
