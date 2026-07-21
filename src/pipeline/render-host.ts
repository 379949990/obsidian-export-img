import {
  Component,
  MarkdownRenderer,
  type App,
  type FrontMatterCache,
} from 'obsidian';
import type { ExportImgSettings, ThemeMode } from '../types';
import { prepareMarkdown } from './prepare';
import { hydrateRemoteImages, revokeHydratedImages } from './remote-images';

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
  remoteWarnings: string[];
  destroy: () => void;
}

function applyThemeMode(el: HTMLElement, mode: ThemeMode): void {
  el.classList.remove('theme-light', 'theme-dark');
  if (mode === 'light') {
    el.classList.add('theme-light');
  } else if (mode === 'dark') {
    el.classList.add('theme-dark');
  }
}

function renderMetadata(
  container: HTMLElement,
  frontmatter: FrontMatterCache | undefined,
): void {
  if (!frontmatter || Object.keys(frontmatter).length === 0) return;

  const meta = container.createDiv({ cls: 'metadata-container export-img-metadata' });
  const content = meta.createDiv({ cls: 'metadata-content' });

  for (const [key, value] of Object.entries(frontmatter)) {
    if (key === 'position') continue;
    const row = content.createDiv({ cls: 'metadata-property' });
    const keyEl = row.createDiv({ cls: 'metadata-property-key' });
    keyEl.createSpan({ cls: 'metadata-property-name', text: key });
    const valEl = row.createDiv({ cls: 'metadata-property-value' });
    const text = Array.isArray(value) ? value.join(', ') : String(value ?? '');
    valEl.setText(text);
  }
}

function renderAuthorBar(container: HTMLElement, settings: ExportImgSettings): void {
  if (!settings.author.show) return;
  const bar = container.createDiv({ cls: 'export-img-author' });
  bar.style.justifyContent =
    settings.author.align === 'left'
      ? 'flex-start'
      : settings.author.align === 'center'
        ? 'center'
        : 'flex-end';

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
  layer.style.opacity = String(settings.watermark.opacity);
  layer.style.transform = `rotate(${settings.watermark.rotate}deg)`;

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
    text.style.fontSize = `${settings.watermark.fontSize}px`;
    text.style.color = settings.watermark.color;
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
  rootEl.style.width = `${width}px`;
  applyThemeMode(rootEl, themeMode);

  const captureEl = rootEl.createDiv({ cls: 'export-img-capture' });
  captureEl.style.position = 'relative';
  captureEl.style.overflow = 'visible';
  // Padding must live on the captured node (root padding would be clipped out of the bitmap).
  const { padding } = settings;
  captureEl.style.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  captureEl.style.boxSizing = 'border-box';
  captureEl.style.background = 'var(--background-primary)';

  const contentEl = captureEl.createDiv({ cls: 'export-img-content' });

  const preview = contentEl.createDiv({
    cls: 'markdown-preview-view markdown-rendered export-img-preview',
  });

  if (settings.showFilename) {
    preview.createDiv({ cls: 'inline-title export-img-title', text: title });
  }

  if (settings.showMetadata) {
    renderMetadata(preview, frontmatter);
  }

  const sizer = preview.createDiv({ cls: 'markdown-preview-sizer' });
  const content = prepareMarkdown(markdown, frontmatter);
  await MarkdownRenderer.render(app, content, sizer, sourcePath, component);

  renderAuthorBar(contentEl, settings);

  const remoteWarnings = await hydrateRemoteImages(captureEl);
  renderWatermark(captureEl, settings);

  return {
    rootEl,
    captureEl,
    contentEl,
    component,
    remoteWarnings,
    destroy: () => {
      revokeHydratedImages(captureEl);
      component.unload();
      mountEl.empty();
    },
  };
}
