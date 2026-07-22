import { Plugin } from 'obsidian';
import { setLocalePreference } from './i18n';
import { cloneSettings, DEFAULT_SETTINGS } from './settings';
import { migrateLoadedSettings } from './settings-migrate';
import type { ExportImgSettings } from './types';
import { registerCommands } from './commands';
import { registerMenus } from './menus';
import { ExportImgSettingTab } from './setting-tab';
import { clearRemoteImageCache } from './pipeline/remote-images';

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
    clearRemoteImageCache();
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Parameters<typeof migrateLoadedSettings>[0];
    const { settings, shouldSave } = migrateLoadedSettings(data);
    this.settings = settings;
    if (shouldSave) {
      await this.saveSettings();
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
