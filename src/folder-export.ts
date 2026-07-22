import {
  Notice,
  TFile,
  TFolder,
  type App,
} from 'obsidian';
import type ExportImgPlugin from './main';
import { t } from './i18n';
import { cloneSettings } from './settings';
import { createRenderHost } from './pipeline/render-host';
import { waitForNextPaint } from './pipeline/overflow';
import { settleElement } from './pipeline/settle-gate';
import { resolveSettleTimeoutMs } from './pipeline/mobile-limits';
import { saveMultipleBlobs } from './pipeline/output';
import {
  assertNonEmptyCapture,
  captureStudioPages,
} from './ui/studio-pipeline';

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

  const settings = cloneSettings(plugin.settings);
  // One note → one logical export; mobile auto-split still applies inside capture.
  settings.split = { ...settings.split, mode: 'none' };
  const holder = document.body.createDiv({ cls: 'export-img-offscreen' });
  const items: {
    blob: Blob;
    title: string;
    format: typeof settings.format;
    index?: number;
  }[] = [];

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
        settings,
        mountEl: holder,
        width: settings.width,
        themeMode: settings.themeMode,
      });
      await host.hydrateRemotes();
      await waitForNextPaint();
      await settleElement(host.captureEl, {
        timeoutMs: resolveSettleTimeoutMs(settings.settleTimeoutMs),
      });
      const captured = await captureStudioPages(host, settings, 'export', {
        skipPrepare: false,
      });
      assertNonEmptyCapture(captured.parts, 'Folder export');
      for (const part of captured.parts) {
        items.push({
          blob: part.blob,
          title: file.basename,
          format: settings.format,
          index: part.index,
        });
      }
      host.destroy();
      holder.empty();
    }

    const saved = await saveMultipleBlobs(app, items, folder.name);
    if (saved) {
      new Notice(t('notice.batchDone', { count: files.length }));
    }
  } catch (error) {
    console.error(error);
    new Notice(t('notice.exportFail'));
  } finally {
    holder.remove();
  }
}
