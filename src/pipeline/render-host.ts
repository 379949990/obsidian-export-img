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

function renderWatermark(container: HTMLElement, settings: ExportImgSettings): void {
  if (!settings.watermark.enable) return;
  const layer = container.createDiv({ cls: 'export-img-watermark' });
  layer.setCssProps({
    '--export-img-wm-opacity': String(settings.watermark.opacity),
    '--export-img-wm-rotate': `${settings.watermark.rotate}deg`,
  });

  if (settings.watermark.type === 'image' && settings.watermark.imageSrc) {
    layer.createEl('img', {
      attr: { src: settings.watermark.imageSrc, alt: '' },
      cls: 'export-img-watermark-image',
    });
  } else if (settings.watermark.text) {
    const text = layer.createDiv({
      cls: 'export-img-watermark-text',
      text: settings.watermark.text,
    });
    text.setCssProps({
      '--export-img-wm-font-size': `${settings.watermark.fontSize}px`,
      '--export-img-wm-color': settings.watermark.color,
    });
  }
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
  renderWatermark(captureEl, settings);

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
