import { Plugin } from 'obsidian';
import { setLocalePreference } from './i18n';
import { cloneSettings, DEFAULT_SETTINGS } from './settings';
import type { ExportImgSettings } from './types';
import { registerCommands } from './commands';
import { registerMenus } from './menus';
import { ExportImgSettingTab } from './setting-tab';

export default class ExportImgPlugin extends Plugin {
  settings: ExportImgSettings = cloneSettings(DEFAULT_SETTINGS);

  async onload(): Promise<void> {
    await this.loadSettings();
    setLocalePreference(this.settings.locale);
    registerCommands(this);
    registerMenus(this);
    this.addSettingTab(new ExportImgSettingTab(this.app, this));
  }

  onunload(): void {
    // React roots are cleaned up when modals close.
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as
      | (Partial<ExportImgSettings> & {
          previewMaxHeight?: number;
          previewAlign?: 'left' | 'center';
        })
      | null;
    const {
      previewMaxHeight: legacyPreviewMaxHeight,
      previewAlign: legacyPreviewAlign,
      ...rest
    } = data ?? {};
    this.settings = cloneSettings({
      ...DEFAULT_SETTINGS,
      ...rest,
      locale: rest.locale ?? DEFAULT_SETTINGS.locale,
      // Migrate older preview* keys → embed* (document media, not studio viewport).
      embedMaxHeight:
        rest.embedMaxHeight ?? legacyPreviewMaxHeight ?? DEFAULT_SETTINGS.embedMaxHeight,
      embedAlign: rest.embedAlign ?? legacyPreviewAlign ?? DEFAULT_SETTINGS.embedAlign,
      padding: { ...DEFAULT_SETTINGS.padding, ...rest.padding },
      split: { ...DEFAULT_SETTINGS.split, ...rest.split },
      watermark: { ...DEFAULT_SETTINGS.watermark, ...rest.watermark },
      author: { ...DEFAULT_SETTINGS.author, ...rest.author },
    });
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
