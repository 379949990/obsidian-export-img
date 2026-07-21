import { PluginSettingTab, Setting, type App } from 'obsidian';
import type ExportImgPlugin from './main';
import { setLocalePreference, t } from './i18n';
import type { ExportFormat, PluginLocale, ScaleMode, ThemeMode } from './types';

export class ExportImgSettingTab extends PluginSettingTab {
  plugin: ExportImgPlugin;

  constructor(app: App, plugin: ExportImgPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName(t('setting.heading.language')).setHeading();

    new Setting(containerEl)
      .setName(t('setting.locale'))
      .setDesc(t('setting.localeDesc'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('auto', t('setting.locale.auto'))
          .addOption('en', t('setting.locale.en'))
          .addOption('zh', t('setting.locale.zh'))
          .setValue(this.plugin.settings.locale)
          .onChange(async (value) => {
            this.plugin.settings.locale = value as PluginLocale;
            setLocalePreference(this.plugin.settings.locale);
            await this.plugin.saveSettings();
            this.display();
          }),
      );

    new Setting(containerEl).setName(t('setting.heading.defaults')).setHeading();

    new Setting(containerEl)
      .setName(t('setting.width'))
      .setDesc(t('setting.widthDesc'))
      .addText((text) =>
        text.setValue(String(this.plugin.settings.width)).onChange(async (value) => {
          const n = Number(value);
          if (!Number.isFinite(n) || n < 240) return;
          this.plugin.settings.width = n;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('setting.scale'))
      .setDesc(t('setting.scaleDesc'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('1x', '1x')
          .addOption('2x', '2x')
          .addOption('3x', '3x')
          .setValue(this.plugin.settings.scale)
          .onChange(async (value) => {
            this.plugin.settings.scale = value as ScaleMode;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('setting.format'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('png', 'PNG')
          .addOption('jpg', 'JPEG')
          .addOption('webp', 'WebP')
          .setValue(this.plugin.settings.format)
          .onChange(async (value) => {
            this.plugin.settings.format = value as ExportFormat;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('setting.themeMode'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('current', t('studio.theme.current'))
          .addOption('light', t('studio.theme.light'))
          .addOption('dark', t('studio.theme.dark'))
          .setValue(this.plugin.settings.themeMode)
          .onChange(async (value) => {
            this.plugin.settings.themeMode = value as ThemeMode;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('setting.showFilename'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showFilename).onChange(async (value) => {
          this.plugin.settings.showFilename = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('setting.showMetadata'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showMetadata).onChange(async (value) => {
          this.plugin.settings.showMetadata = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('setting.padding'))
      .setDesc(t('setting.paddingDesc'));

    const pad = this.plugin.settings.padding;
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      new Setting(containerEl)
        .setName(t(`studio.padding.${side}`))
        .addText((text) =>
          text.setValue(String(pad[side])).onChange(async (value) => {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 0) return;
            this.plugin.settings.padding[side] = Math.round(n);
            await this.plugin.saveSettings();
          }),
        );
    }

    new Setting(containerEl)
      .setName(t('setting.previewMaxHeight'))
      .setDesc(t('setting.previewMaxHeightDesc'))
      .addText((text) =>
        text
          .setPlaceholder('auto')
          .setValue(
            this.plugin.settings.previewMaxHeight > 0
              ? String(this.plugin.settings.previewMaxHeight)
              : '',
          )
          .onChange(async (value) => {
            const raw = value.trim();
            if (raw === '') {
              this.plugin.settings.previewMaxHeight = 0;
              await this.plugin.saveSettings();
              return;
            }
            const n = Number(raw);
            if (!Number.isFinite(n) || n < 0) return;
            this.plugin.settings.previewMaxHeight = Math.round(n);
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('setting.previewAlign'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('center', t('studio.previewAlign.center'))
          .addOption('left', t('studio.previewAlign.left'))
          .setValue(this.plugin.settings.previewAlign)
          .onChange(async (value) => {
            this.plugin.settings.previewAlign = value as 'left' | 'center';
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl).setName(t('setting.heading.behavior')).setHeading();

    new Setting(containerEl)
      .setName(t('setting.settleTimeout'))
      .setDesc(t('setting.settleTimeoutDesc'))
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.settleTimeoutMs))
          .onChange(async (value) => {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 500) return;
            this.plugin.settings.settleTimeoutMs = n;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('setting.quickExportSelection'))
      .setDesc(t('setting.quickExportSelectionDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.quickExportSelection)
          .onChange(async (value) => {
            this.plugin.settings.quickExportSelection = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
