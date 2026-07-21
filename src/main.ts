import { Plugin } from 'obsidian';
import { setLocalePreference } from './i18n';
import { cloneSettings, DEFAULT_SETTINGS } from './settings';
import type { ExportImgSettings, PaddingSettings } from './types';
import { registerCommands } from './commands';
import { registerMenus } from './menus';
import { ExportImgSettingTab } from './setting-tab';

function isLegacyPaddingDefault(padding: PaddingSettings): boolean {
  return (
    (padding.top === 128 &&
      padding.bottom === 128 &&
      padding.left === 64 &&
      padding.right === 64) ||
    (padding.top === 128 &&
      padding.bottom === 128 &&
      padding.left === 128 &&
      padding.right === 128)
  );
}

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

    let padding = { ...DEFAULT_SETTINGS.padding, ...rest.padding };
    const migratePadding = isLegacyPaddingDefault(padding);
    if (migratePadding) {
      padding = { ...DEFAULT_SETTINGS.padding };
    }

    this.settings = cloneSettings({
      ...DEFAULT_SETTINGS,
      ...rest,
      locale: rest.locale ?? DEFAULT_SETTINGS.locale,
      // Migrate older preview* keys → embed* (document media, not studio viewport).
      embedMaxHeight:
        rest.embedMaxHeight ?? legacyPreviewMaxHeight ?? DEFAULT_SETTINGS.embedMaxHeight,
      embedAlign: rest.embedAlign ?? legacyPreviewAlign ?? DEFAULT_SETTINGS.embedAlign,
      padding,
      split: { ...DEFAULT_SETTINGS.split, ...rest.split },
      watermark: { ...DEFAULT_SETTINGS.watermark, ...rest.watermark },
      author: { ...DEFAULT_SETTINGS.author, ...rest.author },
    });

    if (migratePadding) {
      await this.saveSettings();
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
