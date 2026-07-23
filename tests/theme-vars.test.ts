/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyHostTheme,
  readBodyThemeVars,
  resolveThemeScheme,
} from '../src/pipeline/theme-vars';
import { installObsidianDomHelpers } from './helpers/obsidian-dom';

beforeEach(() => {
  installObsidianDomHelpers();
  document.body.className = '';
  document.body.replaceChildren();
  document.body.style.cssText = '';
});

describe('resolveThemeScheme', () => {
  it('maps current to the body shell', () => {
    document.body.classList.add('theme-dark');
    expect(resolveThemeScheme('current')).toBe('dark');
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    expect(resolveThemeScheme('current')).toBe('light');
  });

  it('honors explicit light/dark', () => {
    document.body.classList.add('theme-dark');
    expect(resolveThemeScheme('light')).toBe('light');
    expect(resolveThemeScheme('dark')).toBe('dark');
  });
});

describe('applyHostTheme', () => {
  it('copies shell tokens onto the host for the same scheme', () => {
    document.body.classList.add('theme-dark');
    document.body.style.setProperty('--code-background', 'rgb(30, 30, 30)');
    document.body.style.setProperty('--text-normal', 'rgb(220, 220, 220)');

    const host = document.createElement('div');
    document.body.appendChild(host);
    applyHostTheme(host, 'dark');

    expect(host.classList.contains('theme-dark')).toBe(true);
    expect(host.style.getPropertyValue('--code-background')).toBe('rgb(30, 30, 30)');
    expect(host.style.getPropertyValue('--text-normal')).toBe('rgb(220, 220, 220)');
    // color-scheme is stylesheet-driven via .export-img-host.theme-* (not inline).
    expect(host.style.colorScheme).toBe('');
  });

  it('applies opposite scheme on the host and leaves the app shell unchanged', () => {
    document.body.classList.add('theme-dark');
    document.body.style.setProperty('--code-background', 'rgb(30, 30, 30)');

    const host = document.createElement('div');
    document.body.appendChild(host);
    applyHostTheme(host, 'light');

    expect(host.classList.contains('theme-light')).toBe(true);
    expect(host.classList.contains('theme-dark')).toBe(false);
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    expect(document.body.classList.contains('theme-light')).toBe(false);
  });

  it('reads current-scheme vars without leaving a swapped class', () => {
    document.body.classList.add('theme-dark');
    document.body.style.setProperty('--table-border-color', 'rgb(1, 2, 3)');
    const vars = readBodyThemeVars('dark');
    expect(vars['--table-border-color']).toBe('rgb(1, 2, 3)');
    expect(document.body.classList.contains('theme-dark')).toBe(true);
  });
});
