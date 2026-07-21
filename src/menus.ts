import { TFile, TFolder } from 'obsidian';
import type ExportImgPlugin from './main';
import { t } from './i18n';
import { exportFile, exportSelection } from './commands';
import { exportFolderAsImages } from './folder-export';

function isMarkdown(file: TFile): boolean {
  return file.extension === 'md' || file.extension === 'markdown';
}

export function registerMenus(plugin: ExportImgPlugin): void {
  plugin.registerEvent(
    plugin.app.workspace.on('file-menu', (menu, file) => {
      if (file instanceof TFile && isMarkdown(file)) {
        menu.addItem((item) => {
          item
            .setTitle(t('menu.exportNote'))
            .setIcon('image-down')
            .onClick(() => {
              void exportFile(plugin, file);
            });
        });
      } else if (file instanceof TFolder) {
        menu.addItem((item) => {
          item
            .setTitle(t('menu.exportFolder'))
            .setIcon('image-down')
            .onClick(() => {
              void exportFolderAsImages(plugin.app, plugin, file);
            });
        });
      }
    }),
  );

  plugin.registerEvent(
    plugin.app.workspace.on('editor-menu', (menu, editor, info) => {
      const file =
        (info && 'file' in info ? info.file : null) ??
        plugin.app.workspace.getActiveFile();
      if (!file || !isMarkdown(file)) return;

      if (editor.somethingSelected()) {
        menu.addItem((item) => {
          item
            .setTitle(t('menu.exportSelection'))
            .setIcon('text-select')
            .onClick(() => {
              void exportSelection(plugin, editor, file);
            });
        });
      }

      menu.addItem((item) => {
        item
          .setTitle(t('menu.exportNote'))
          .setIcon('image-down')
          .onClick(() => {
            void exportFile(plugin, file);
          });
      });
    }),
  );
}
