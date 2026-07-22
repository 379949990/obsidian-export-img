import type { ThemeMode } from '../types';

export type ResolvedThemeScheme = 'light' | 'dark';

/**
 * Tokens that commonly drive Reading-view chrome (code, tables, callouts).
 * Used when `getComputedStyle` enumeration skips custom properties (some engines).
 */
const THEME_VAR_FALLBACK = [
  '--background-primary',
  '--background-primary-alt',
  '--background-secondary',
  '--background-secondary-alt',
  '--background-modifier-border',
  '--background-modifier-border-hover',
  '--background-modifier-border-focus',
  '--background-modifier-form-field',
  '--background-modifier-hover',
  '--text-normal',
  '--text-muted',
  '--text-faint',
  '--text-on-accent',
  '--text-selection',
  '--text-highlight-bg',
  '--text-accent',
  '--text-accent-hover',
  '--interactive-normal',
  '--interactive-hover',
  '--interactive-accent',
  '--interactive-accent-hover',
  '--code-background',
  '--code-normal',
  '--code-comment',
  '--code-function',
  '--code-important',
  '--code-keyword',
  '--code-operator',
  '--code-property',
  '--code-punctuation',
  '--code-string',
  '--code-tag',
  '--code-value',
  '--table-background',
  '--table-border-color',
  '--table-header-background',
  '--table-header-background-hover',
  '--table-row-background-hover',
  '--table-row-alt-background',
  '--table-selection',
  '--blockquote-background',
  '--blockquote-border-thickness',
  '--blockquote-border-color',
  '--callout-radius',
  '--callout-padding',
  '--callout-title-color',
  '--callout-blend-mode',
  '--embed-background',
  '--embed-border-left',
  '--embed-border-right',
  '--embed-border-top',
  '--embed-border-bottom',
  '--embed-padding',
  '--hr-color',
  '--hr-thickness',
  '--checkbox-color',
  '--checkbox-color-hover',
  '--checkbox-border-color',
  '--tag-background',
  '--tag-background-hover',
  '--tag-color',
  '--tag-color-hover',
  '--link-color',
  '--link-color-hover',
  '--link-external-color',
  '--link-external-color-hover',
  '--link-unresolved-color',
  '--metadata-background',
  '--metadata-padding',
  '--metadata-border-width',
  '--metadata-border-color',
  '--metadata-gap',
  '--metadata-label-text-color',
  '--metadata-input-text-color',
  '--metadata-input-background',
  '--metadata-input-background-hover',
] as const;

/** Resolve Studio themeMode against the live app shell. */
export function resolveThemeScheme(mode: ThemeMode): ResolvedThemeScheme {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof document === 'undefined') return 'light';
  return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
}

function collectThemeVars(computed: CSSStyleDeclaration): Record<string, string> {
  const vars: Record<string, string> = {};
  const take = (name: string) => {
    const value = computed.getPropertyValue(name).trim();
    if (value) vars[name] = value;
  };

  for (let i = 0; i < computed.length; i++) {
    const name = computed.item(i);
    if (name.startsWith('--')) take(name);
  }
  for (const name of THEME_VAR_FALLBACK) take(name);
  return vars;
}

/**
 * Read computed `--*` theme tokens from `document.body` for a color scheme.
 * Briefly swaps body.theme-* when the app shell differs so Obsidian / community
 * theme rules (usually `body.theme-light|dark`) resolve the correct values.
 * Swap is synchronous — no await — to avoid a visible UI flash.
 */
export function readBodyThemeVars(scheme: ResolvedThemeScheme): Record<string, string> {
  const body = document.body;
  const wasDark = body.classList.contains('theme-dark');
  const wasLight = body.classList.contains('theme-light');
  const wantDark = scheme === 'dark';
  const swapped = wasDark !== wantDark;

  if (swapped) {
    body.classList.toggle('theme-dark', wantDark);
    body.classList.toggle('theme-light', !wantDark);
    // Force cascade before reading computed styles.
    void body.offsetHeight;
  }

  try {
    return collectThemeVars(getComputedStyle(body));
  } finally {
    if (swapped) {
      // Restore the exact prior class presence (do not invent theme-light).
      body.classList.toggle('theme-dark', wasDark);
      body.classList.toggle('theme-light', wasLight);
    }
  }
}

/**
 * Pin theme class + CSS variables on the export host so code blocks, tables,
 * callouts, etc. follow the chosen scheme instead of the app shell.
 */
export function applyHostTheme(host: HTMLElement, mode: ThemeMode): ResolvedThemeScheme {
  const scheme = resolveThemeScheme(mode);
  host.classList.remove('theme-light', 'theme-dark');
  host.classList.add(scheme === 'dark' ? 'theme-dark' : 'theme-light');
  host.style.colorScheme = scheme;

  const vars = readBodyThemeVars(scheme);
  for (const [name, value] of Object.entries(vars)) {
    host.style.setProperty(name, value);
  }

  return scheme;
}
