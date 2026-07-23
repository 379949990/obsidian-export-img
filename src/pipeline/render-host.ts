import {
  Component,
  MarkdownRenderer,
  parseYaml,
  type App,
  type FrontMatterCache,
} from 'obsidian';
import type { ExportImgSettings, ThemeMode } from '../types';
import { prepareMarkdown } from './prepare';
import {
  hydrateRemoteImages,
  countRemoteImages,
  type RemoteHydrateProgress,
  type RemoteHydrateResult,
} from './remote-images';
import { applyCapturePadding } from './overflow';
import { applyHostTheme } from './theme-vars';

export interface RenderHostOptions {
  app: App;
  markdown: string;
  sourcePath: string;
  title: string;
  frontmatter?: FrontMatterCache;
  settings: ExportImgSettings;
  mountEl: HTMLElement;
  width: number;
  themeMode?: ThemeMode;
}

export interface RenderHostHandle {
  rootEl: HTMLElement;
  captureEl: HTMLElement;
  contentEl: HTMLElement;
  component: Component;
  /** Populated after hydrateRemotes(); empty until then. */
  remoteWarnings: string[];
  /** Count of http(s) images present after Markdown render. */
  remotePending: number;
  hydrateRemotes: (opts?: {
    onProgress?: (progress: RemoteHydrateProgress) => void;
    timeoutMs?: number;
  }) => Promise<RemoteHydrateResult>;
  destroy: () => void;
}

function formatMetaValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => formatMetaValue(v)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.displayText === 'string') return rec.displayText;
    if (typeof rec.path === 'string') return rec.path;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function resolveFrontmatter(
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

function renderMetadata(
  container: HTMLElement,
  frontmatter: Record<string, unknown>,
): void {
  const entries = Object.entries(frontmatter).filter(([key]) => key !== 'position');
  if (entries.length === 0) return;

  const meta = container.createDiv({
    cls: 'metadata-container export-img-metadata',
  });

  const content = meta.createDiv({ cls: 'metadata-content export-img-metadata-content' });

  for (const [key, value] of entries) {
    const row = content.createDiv({ cls: 'metadata-property export-img-metadata-row' });
    const keyEl = row.createDiv({ cls: 'metadata-property-key export-img-metadata-key' });
    keyEl.createSpan({ cls: 'metadata-property-name', text: key });
    const valEl = row.createDiv({
      cls: 'metadata-property-value export-img-metadata-value',
    });
    valEl.setText(formatMetaValue(value));
  }
}

function renderAuthorBar(container: HTMLElement, settings: ExportImgSettings): void {
  if (!settings.author.show) return;
  const alignClass =
    settings.author.align === 'left'
      ? 'is-align-left'
      : settings.author.align === 'center'
        ? 'is-align-center'
        : 'is-align-right';
  const bar = container.createDiv({ cls: `export-img-author ${alignClass}` });

  if (settings.author.avatarSrc) {
    const avatar = bar.createDiv({ cls: 'export-img-author-avatar' });
    avatar.createEl('img', { attr: { src: settings.author.avatarSrc, alt: '' } });
  }
  const text = bar.createDiv({ cls: 'export-img-author-text' });
  if (settings.author.name) {
    text.createDiv({ cls: 'export-img-author-name', text: settings.author.name });
  }
  if (settings.author.remark) {
    text.createDiv({ cls: 'export-img-author-remark', text: settings.author.remark });
  }
}

/**
 * Keep author as a normal-flow sibling after the preview (v1.0.4 model).
 * Host CSS forces sizer children out of reading-view `position:absolute`
 * so the preview box grows with content. This pass clears prior layout
 * experiments and extends the sizer when overflow (tables/code) still
 * paints past the box.
 */
export function layoutAuthorBar(contentEl: HTMLElement): void {
  const preview =
    contentEl.querySelector<HTMLElement>(
      ':scope > .export-img-preview, :scope > .markdown-preview-view',
    ) ?? null;
  const sizer = preview?.querySelector<HTMLElement>('.markdown-preview-sizer') ?? null;
  const author = contentEl.querySelector<HTMLElement>(':scope > .export-img-author');

  if (preview) {
    preview.removeClass('is-height-forced');
    preview.setCssProps({
      '--export-img-preview-h': '',
    });
  }
  if (author) {
    author.removeClass('is-laid-out');
    author.setCssProps({
      '--export-img-author-top': '',
      top: '',
      'margin-top': '',
    });
  }
  contentEl.removeClass('has-author-layout');
  contentEl.setCssProps({
    '--export-img-content-min-h': '',
  });

  if (!sizer) return;

  // Drop Obsidian / prior-pass absolute-section padding so flow height wins.
  sizer.removeClass('is-sized-for-author');
  sizer.setCssProps({
    '--export-img-sizer-min-h': '',
    height: '',
    'min-height': '',
    'padding-bottom': '0',
  });

  const sizerTop = sizer.getBoundingClientRect().top;
  let maxBottom = Math.max(sizer.scrollHeight, sizer.offsetHeight, 0);

  // Prefer section boxes; only probe common overflow media (not every descendant).
  const overflowSel =
    'table, pre, .cm-preview-code-block, .mermaid, .internal-embed, .image-embed, img, svg';

  for (const child of Array.from(sizer.children)) {
    if (!child.instanceOf(HTMLElement)) continue;
    if (child.hasClass('export-img-page-hidden')) continue;

    const cr = child.getBoundingClientRect();
    if (cr.height >= 1) {
      maxBottom = Math.max(maxBottom, cr.bottom - sizerTop);
    }
    maxBottom = Math.max(
      maxBottom,
      (child.offsetTop || 0) + Math.max(child.scrollHeight, child.offsetHeight, 0),
    );

    for (const node of Array.from(child.querySelectorAll(overflowSel))) {
      if (!node.instanceOf(HTMLElement)) continue;
      if (node.closest('.export-img-page-hidden')) continue;
      const r = node.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      maxBottom = Math.max(maxBottom, r.bottom - sizerTop);
    }
  }

  if (!(maxBottom > 0)) {
    sizer.setCssProps({ '--export-img-sizer-min-h': '' });
    sizer.removeClass('is-sized-for-author');
    return;
  }

  const height = Math.ceil(maxBottom);
  sizer.addClass('is-sized-for-author');
  sizer.setCssProps({
    '--export-img-sizer-min-h': `${height}px`,
  });
}

export async function createRenderHost(options: RenderHostOptions): Promise<RenderHostHandle> {
  const {
    app,
    markdown,
    sourcePath,
    title,
    frontmatter,
    settings,
    mountEl,
    width,
  } = options;
  const themeMode = options.themeMode ?? settings.themeMode;

  mountEl.empty();

  const component = new Component();
  component.load();

  const rootEl = mountEl.createDiv({ cls: 'export-img-host markdown-reading-view' });
  rootEl.setCssProps({ '--export-img-width': `${width}px` });
  // Copy body theme tokens (with a sync light/dark swap when needed) so code,
  // tables, and callouts do not keep the app-shell palette.
  applyHostTheme(rootEl, themeMode);

  const captureEl = rootEl.createDiv({ cls: 'export-img-capture' });
  applyCapturePadding(captureEl, settings.padding);

  const contentEl = captureEl.createDiv({ cls: 'export-img-content' });

  const preview = contentEl.createDiv({
    cls: 'markdown-preview-view markdown-rendered export-img-preview',
  });

  if (settings.showFilename) {
    preview.createDiv({ cls: 'inline-title export-img-title', text: title });
  }

  if (settings.showMetadata) {
    renderMetadata(preview, resolveFrontmatter(markdown, frontmatter));
  }

  const sizer = preview.createDiv({ cls: 'markdown-preview-sizer' });
  const content = prepareMarkdown(markdown, frontmatter);
  await MarkdownRenderer.render(app, content, sizer, sourcePath, component);

  renderAuthorBar(contentEl, settings);

  const remotePending = countRemoteImages(captureEl);
  const remoteWarnings: string[] = [];
  const defaultTimeout = Math.max(10_000, Math.min(settings.settleTimeoutMs, 30_000));

  return {
    rootEl,
    captureEl,
    contentEl,
    component,
    remoteWarnings,
    remotePending,
    hydrateRemotes: async (opts) => {
      const result = await hydrateRemoteImages(captureEl, {
        onProgress: opts?.onProgress,
        timeoutMs: opts?.timeoutMs ?? defaultTimeout,
      });
      remoteWarnings.splice(0, remoteWarnings.length, ...result.warnings);
      return result;
    },
    destroy: () => {
      component.unload();
      mountEl.empty();
    },
  };
}
