import {
  MarkdownView,
  Notice,
  TFile,
  TFolder,
  type Editor,
  type MarkdownFileInfo,
} from 'obsidian';
import type ExportImgPlugin from './main';
import { t } from './i18n';
import { openExportStudio, quickCopySelection } from './ui/export-studio';
import { exportFolderAsImages } from './folder-export';

function getFrontmatter(plugin: ExportImgPlugin, file: TFile) {
  return plugin.app.metadataCache.getFileCache(file)?.frontmatter;
}

async function exportActiveNote(plugin: ExportImgPlugin): Promise<void> {
  const file = plugin.app.workspace.getActiveFile();
  if (!file || !['md', 'markdown'].includes(file.extension)) {
    new Notice(t('notice.noActiveFile'));
    return;
  }
  const markdown = await plugin.app.vault.cachedRead(file);
  await openExportStudio({
    app: plugin.app,
    plugin,
    markdown,
    file,
    frontmatter: getFrontmatter(plugin, file),
    type: 'file',
  });
}

async function exportSelection(
  plugin: ExportImgPlugin,
  editor: Editor,
  file: TFile,
): Promise<void> {
  const selection = editor.getSelection();
  if (!selection) {
    new Notice(t('notice.noSelection'));
    return;
  }
  const args = {
    app: plugin.app,
    plugin,
    markdown: selection,
    file,
    frontmatter: getFrontmatter(plugin, file),
    type: 'selection' as const,
  };
  if (plugin.settings.quickExportSelection) {
    await quickCopySelection(args);
    return;
  }
  await openExportStudio(args);
}

export function registerCommands(plugin: ExportImgPlugin): void {
  plugin.addCommand({
    id: 'export-note-as-image',
    name: t('command.exportNote'),
    checkCallback: (checking) => {
      const file = plugin.app.workspace.getActiveFile();
      const ok = !!file && ['md', 'markdown'].includes(file.extension);
      if (ok && !checking) {
        void exportActiveNote(plugin);
      }
      return ok;
    },
  });

  plugin.addCommand({
    id: 'export-selection-as-image',
    name: t('command.exportSelection'),
    editorCheckCallback: (checking, editor, ctx) => {
      const file = getFileFromCtx(plugin, ctx);
      if (!file || !editor.somethingSelected()) return false;
      if (!checking) {
        void exportSelection(plugin, editor, file);
      }
      return true;
    },
  });

  plugin.addCommand({
    id: 'export-folder-as-images',
    name: t('command.exportFolder'),
    checkCallback: (checking) => {
      const file = plugin.app.workspace.getActiveFile();
      const folder = file?.parent;
      const ok = folder instanceof TFolder;
      if (ok && !checking) {
        void exportFolderAsImages(plugin.app, plugin, folder);
      }
      return ok;
    },
  });
}

function getFileFromCtx(
  plugin: ExportImgPlugin,
  ctx: MarkdownView | MarkdownFileInfo,
): TFile | null {
  if (ctx instanceof MarkdownView) {
    return ctx.file;
  }
  return ctx.file ?? plugin.app.workspace.getActiveFile();
}

export async function exportFile(plugin: ExportImgPlugin, file: TFile): Promise<void> {
  const markdown = await plugin.app.vault.cachedRead(file);
  await openExportStudio({
    app: plugin.app,
    plugin,
    markdown,
    file,
    frontmatter: getFrontmatter(plugin, file),
    type: 'file',
  });
}

export { exportSelection, exportActiveNote };
