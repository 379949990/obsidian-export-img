import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from './settings';
import type { ExportImgSettings } from './types';
import { registerCommands } from './commands';
import { registerMenus } from './menus';
import { ExportImgSettingTab } from './setting-tab';

export default class ExportImgPlugin extends Plugin {
  settings: ExportImgSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();
    registerCommands(this);
    registerMenus(this);
    this.addSettingTab(new ExportImgSettingTab(this.app, this));
  }

  onunload(): void {
    // React roots are cleaned up when modals close.
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Partial<ExportImgSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...data,
      padding: { ...DEFAULT_SETTINGS.padding, ...data?.padding },
      split: { ...DEFAULT_SETTINGS.split, ...data?.split },
      watermark: { ...DEFAULT_SETTINGS.watermark, ...data?.watermark },
      author: { ...DEFAULT_SETTINGS.author, ...data?.author },
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
