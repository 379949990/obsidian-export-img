import { parseYaml, setIcon, type FrontMatterCache } from 'obsidian';
import { t } from '../i18n';

export type MetaValueKind = 'text' | 'tags' | 'links' | 'list';

const WIKILINK_RE = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/;

/** Format a frontmatter value as plain text (tests / fallbacks). */
export function formatMetaValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((v) => formatMetaValue(v)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.displayText === 'string') return rec.displayText;
    if (typeof rec.path === 'string') return rec.path;
    if (typeof rec.link === 'string') return rec.link;
    const format = Reflect.get(rec, 'format');
    if (typeof format === 'function') {
      try {
        const formatted = (format as (fmt: string) => unknown).call(rec, 'YYYY-MM-DDTHH:mm:ss[Z]');
        if (typeof formatted === 'string') return formatted;
      } catch {
        // fall through
      }
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return '';
}

export function unwrapMetaItem(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.displayText === 'string') return rec.displayText;
    if (typeof rec.link === 'string') return rec.link;
    if (typeof rec.path === 'string') return rec.path;
  }
  return formatMetaValue(value);
}

export function parseWikiLink(raw: string): { link: string; display: string } | null {
  const m = raw.trim().match(WIKILINK_RE);
  if (!m) return null;
  const link = (m[1] ?? '').trim();
  const display = (m[2] ?? link).trim();
  return link ? { link, display } : null;
}

export function inferMetaKind(key: string, value: unknown): MetaValueKind {
  const lower = key.toLowerCase();
  if (
    lower === 'tags' ||
    lower === 'tag' ||
    lower === 'cssclasses' ||
    lower === 'cssclass' ||
    lower === 'aliases' ||
    lower === 'alias'
  ) {
    return 'tags';
  }

  const items = Array.isArray(value) ? value : value == null ? [] : [value];
  const texts: string[] = [];
  let wikiCount = 0;
  for (const item of items) {
    const text = unwrapMetaItem(item);
    if (!text) continue;
    texts.push(text);
    if (parseWikiLink(text) || looksLikeLinkObject(item)) wikiCount += 1;
  }
  if (texts.length === 0) return 'text';

  if (lower === 'links' || lower.endsWith('_links') || (wikiCount > 0 && wikiCount >= texts.length)) {
    return 'links';
  }
  if (Array.isArray(value) && texts.length > 1) {
    return 'list';
  }
  return 'text';
}

function looksLikeLinkObject(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return typeof rec.link === 'string' || typeof rec.displayText === 'string';
}

/**
 * Prefer metadataCache frontmatter; fall back to parsing the YAML fence in
 * the raw markdown (e.g. when cache is cold).
 */
export function resolveFrontmatter(
  markdown: string,
  frontmatter?: FrontMatterCache,
): Record<string, unknown> {
  const fromCache = frontmatter
    ? Object.fromEntries(
        Object.entries(frontmatter).filter(([key]) => key !== 'position'),
      )
    : {};
  if (Object.keys(fromCache).length > 0) return fromCache;

  if (markdown.startsWith('---')) {
    const end = markdown.indexOf('\n---', 3);
    if (end !== -1) {
      try {
        const parsed: unknown = parseYaml(markdown.slice(3, end));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  return {};
}

function iconForKind(kind: MetaValueKind): string {
  if (kind === 'tags') return 'tags';
  if (kind === 'links' || kind === 'list') return 'list';
  return 'align-left';
}

function appendPill(parent: HTMLElement, text: string, opts?: { link?: boolean }): void {
  const pill = parent.createSpan({ cls: 'multi-select-pill' });
  if (opts?.link) {
    pill.addClass('mod-link');
    const a = pill.createEl('a', {
      cls: 'multi-select-pill-content internal-link',
      text,
      attr: { href: text, 'data-href': text, tabindex: '-1' },
    });
    a.addClass('export-img-meta-link');
  } else {
    pill.createSpan({ cls: 'multi-select-pill-content', text });
  }
}

function renderValue(valEl: HTMLElement, key: string, value: unknown): MetaValueKind {
  const kind = inferMetaKind(key, value);
  const items = Array.isArray(value) ? value : [value];

  if (kind === 'tags' || kind === 'list') {
    const wrap = valEl.createDiv({ cls: 'multi-select-container' });
    for (const item of items) {
      const text = unwrapMetaItem(item);
      if (!text) continue;
      appendPill(wrap, text);
    }
    return kind;
  }

  if (kind === 'links') {
    const wrap = valEl.createDiv({ cls: 'multi-select-container' });
    for (const item of items) {
      const raw = unwrapMetaItem(item);
      if (!raw) continue;
      const wiki = parseWikiLink(raw);
      const display = wiki?.display ?? raw;
      appendPill(wrap, display, { link: true });
    }
    return kind;
  }

  const text = formatMetaValue(value);
  valEl.createSpan({ cls: 'metadata-input metadata-input-longtext', text });
  return kind;
}

/**
 * Render a Reading-view-like Properties strip using Obsidian metadata DOM
 * hooks so theme CSS applies. Caller must add `.show-properties` on the
 * preview and force `--metadata-display-reading: block` on the host.
 */
export function renderMetadata(
  container: HTMLElement,
  frontmatter: Record<string, unknown>,
): number {
  const entries = Object.entries(frontmatter).filter(([key]) => key !== 'position');
  if (entries.length === 0) return 0;

  const meta = container.createDiv({
    cls: 'metadata-container export-img-metadata',
  });
  meta.setAttribute('data-property-count', String(entries.length));

  const heading = meta.createDiv({ cls: 'metadata-properties-heading' });
  heading.createDiv({
    cls: 'metadata-properties-title',
    text: t('studio.metadataHeading'),
  });

  const content = meta.createDiv({ cls: 'metadata-content' });
  const props = content.createDiv({ cls: 'metadata-properties' });

  for (const [key, value] of entries) {
    const kind = inferMetaKind(key, value);
    const row = props.createDiv({
      cls: 'metadata-property',
      attr: {
        'data-property-key': key,
        'data-property-type': kind === 'text' ? 'text' : 'multitext',
      },
    });

    const keyEl = row.createDiv({ cls: 'metadata-property-key' });
    const icon = keyEl.createSpan({ cls: 'metadata-property-icon' });
    setIcon(icon, iconForKind(kind));
    keyEl.createSpan({ cls: 'metadata-property-name', text: key });

    const valEl = row.createDiv({ cls: 'metadata-property-value' });
    renderValue(valEl, key, value);
  }

  return entries.length;
}
