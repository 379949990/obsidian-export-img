import {
  Notice,
  TFile,
  TFolder,
  type App,
} from 'obsidian';
import type ExportImgPlugin from './main';
import { t } from './i18n';
import { scaleToNumber } from './settings';
import { createRenderHost } from './pipeline/render-host';
import { prepareEmbedLayout, waitForNextPaint } from './pipeline/overflow';
import { settleElement } from './pipeline/settle-gate';
import { captureElement } from './pipeline/capture';
import {
  clampMobileExportScale,
  resolveSettleTimeoutMs,
} from './pipeline/mobile-limits';
import { saveMultipleBlobs } from './pipeline/output';

function isMarkdownFile(file: TFile): boolean {
  return file.extension === 'md' || file.extension === 'markdown';
}

function collectMarkdownFiles(folder: TFolder, recursive: boolean): TFile[] {
  const out: TFile[] = [];
  for (const child of folder.children) {
    if (child instanceof TFile && isMarkdownFile(child)) {
      out.push(child);
    } else if (recursive && child instanceof TFolder) {
      out.push(...collectMarkdownFiles(child, true));
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export async function exportFolderAsImages(
  app: App,
  plugin: ExportImgPlugin,
  folder: TFolder,
): Promise<void> {
  const files = collectMarkdownFiles(folder, true);
  if (files.length === 0) {
    new Notice(t('notice.noActiveFile'));
    return;
  }

  const settings = plugin.settings;
  const holder = document.body.createDiv({ cls: 'export-img-offscreen' });
  const items: { blob: Blob; title: string; format: typeof settings.format }[] = [];

  try {
    for (const file of files) {
      const markdown = await app.vault.cachedRead(file);
      const cache = app.metadataCache.getFileCache(file);
      const host = await createRenderHost({
        app,
        markdown,
        sourcePath: file.path,
        title: file.basename,
        frontmatter: cache?.frontmatter,
        settings: { ...settings, split: { ...settings.split, mode: 'none' } },
        mountEl: holder,
        width: settings.width,
        themeMode: settings.themeMode,
      });
      await host.hydrateRemotes();
      prepareEmbedLayout(host.rootEl, settings.embedMaxHeight, settings.embedAlign);
      await waitForNextPaint();
      await settleElement(host.captureEl, {
        timeoutMs: resolveSettleTimeoutMs(settings.settleTimeoutMs),
      });
      const blob = await captureElement(host.captureEl, {
        scale: scaleToNumber(clampMobileExportScale(settings.scale)),
        format: settings.format,
      });
      items.push({ blob, title: file.basename, format: settings.format });
      host.destroy();
      holder.empty();
    }

    await saveMultipleBlobs(app, items, folder.name);
    new Notice(t('notice.batchDone', { count: items.length }));
  } catch (error) {
    console.error(error);
    new Notice(t('notice.exportFail'));
  } finally {
    holder.remove();
  }
}
