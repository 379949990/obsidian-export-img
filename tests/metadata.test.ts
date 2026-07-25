/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  formatMetaValue,
  inferMetaKind,
  parseWikiLink,
  renderMetadata,
  resolveFrontmatter,
} from '../src/pipeline/metadata';
import { installObsidianDomHelpers } from './helpers/obsidian-dom';

beforeEach(() => {
  installObsidianDomHelpers();
  document.body.replaceChildren();
  installCreateHelpers();
});

function installCreateHelpers(): void {
  const proto = HTMLElement.prototype as unknown as {
    createDiv?: (opts?: {
      cls?: string;
      text?: string;
      attr?: Record<string, string>;
    }) => HTMLDivElement;
    createSpan?: (opts?: { cls?: string; text?: string }) => HTMLSpanElement;
    createEl?: (
      tag: string,
      opts?: { cls?: string; text?: string; attr?: Record<string, string> },
    ) => HTMLElement;
    setText?: (text: string) => void;
    addClass?: (cls: string) => void;
  };
  if (!proto.createDiv) {
    proto.createDiv = function createDiv(
      this: HTMLElement,
      opts?: { cls?: string; text?: string; attr?: Record<string, string> },
    ) {
      const el = document.createElement('div');
      if (opts?.cls) el.className = opts.cls;
      if (opts?.text) el.textContent = opts.text;
      if (opts?.attr) {
        for (const [k, v] of Object.entries(opts.attr)) el.setAttribute(k, v);
      }
      this.appendChild(el);
      return el;
    };
  }
  if (!proto.createSpan) {
    proto.createSpan = function createSpan(
      this: HTMLElement,
      opts?: { cls?: string; text?: string },
    ) {
      const el = document.createElement('span');
      if (opts?.cls) el.className = opts.cls;
      if (opts?.text) el.textContent = opts.text;
      this.appendChild(el);
      return el;
    };
  }
  if (!proto.createEl) {
    proto.createEl = function createEl(
      this: HTMLElement,
      tag: string,
      opts?: { cls?: string; text?: string; attr?: Record<string, string> },
    ) {
      const el = document.createElement(tag);
      if (opts?.cls) el.className = opts.cls;
      if (opts?.text) el.textContent = opts.text;
      if (opts?.attr) {
        for (const [k, v] of Object.entries(opts.attr)) el.setAttribute(k, v);
      }
      this.appendChild(el);
      return el;
    };
  }
  if (!proto.setText) {
    proto.setText = function setText(this: HTMLElement, text: string) {
      this.textContent = text;
    };
  }
  if (!proto.addClass) {
    proto.addClass = function addClass(this: HTMLElement, cls: string) {
      this.classList.add(cls);
    };
  }
}

describe('formatMetaValue / parseWikiLink / inferMetaKind', () => {
  it('formats arrays and wiki-link objects', () => {
    expect(formatMetaValue(['pet', 'self'])).toBe('pet, self');
    expect(formatMetaValue({ displayText: '本人基线（草稿）' })).toBe('本人基线（草稿）');
    expect(parseWikiLink('[[本人基线（草稿）]]')).toEqual({
      link: '本人基线（草稿）',
      display: '本人基线（草稿）',
    });
  });

  it('infers tags / links / text kinds for the pet note shape', () => {
    expect(inferMetaKind('tags', ['pet', 'self'])).toBe('tags');
    expect(inferMetaKind('links', ['[[本人基线（草稿）]]'])).toBe('links');
    expect(inferMetaKind('title', '白起（猫）')).toBe('text');
  });
});

describe('resolveFrontmatter', () => {
  it('prefers metadataCache entries', () => {
    expect(
      resolveFrontmatter('---\ntitle: FromFile\n---\n', {
        title: 'FromCache',
        position: {
          start: { line: 0, col: 0, offset: 0 },
          end: { line: 0, col: 0, offset: 0 },
        },
      }),
    ).toEqual({ title: 'FromCache' });
  });
});

describe('renderMetadata', () => {
  it('builds native metadata DOM with heading, pills, and link chips', () => {
    const preview = document.createElement('div');
    const count = renderMetadata(preview, {
      title: '白起（猫）',
      tags: ['pet', 'self'],
      links: ['[[本人基线（草稿）]]'],
    });

    expect(count).toBe(3);
    const meta = preview.querySelector('.metadata-container.export-img-metadata');
    expect(meta).toBeTruthy();
    expect(meta?.getAttribute('data-property-count')).toBe('3');
    expect(meta?.querySelector('.metadata-properties-title')?.textContent).toMatch(
      /Properties|笔记属性/,
    );
    expect(meta?.querySelectorAll('.multi-select-pill').length).toBeGreaterThanOrEqual(3);
    expect(meta?.querySelector('.internal-link')?.textContent).toBe('本人基线（草稿）');
    expect(meta?.textContent).toContain('白起（猫）');
  });

  it('returns 0 for empty frontmatter', () => {
    const preview = document.createElement('div');
    expect(renderMetadata(preview, {})).toBe(0);
    expect(preview.querySelector('.export-img-metadata')).toBeNull();
  });
});
