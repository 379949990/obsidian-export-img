import {
  PluginSettingTab,
  Setting,
  type App,
  type SettingDefinitionItem,
} from 'obsidian';
import type ExportImgPlugin from './main';
import { setLocalePreference, t } from './i18n';
import type { ExportFormat, PluginLocale, ScaleMode, ThemeMode } from './types';

export class ExportImgSettingTab extends PluginSettingTab {
  plugin: ExportImgPlugin;

  constructor(app: App, plugin: ExportImgPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Obsidian 1.13+: declarative defs (search + render). Skips {@link display}.
   * Older versions ignore this and call {@link display}.
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: 'group',
        heading: t('setting.heading.language'),
        items: [
          {
            name: t('setting.locale'),
            desc: t('setting.localeDesc'),
            render: (setting) => {
              // Avoid a typed `this.update()` call: SettingTab.update is 1.13+ and
              // trips obsidianmd/no-unsupported-api while minAppVersion stays 1.5.7
              // (1.13 is still Catalyst). Runtime refresh still works on 1.13+.
              this.renderLocaleSetting(setting, () => this.refreshSettingsUi());
            },
          },
        ],
      },
      {
        type: 'group',
        heading: t('setting.heading.defaults'),
        items: [
          {
            name: t('setting.width'),
            desc: t('setting.widthDesc'),
            control: {
              type: 'number',
              key: 'width',
              min: 240,
              validate: (value) =>
                Number.isFinite(value) && value >= 240
                  ? undefined
                  : t('setting.widthDesc'),
            },
          },
          {
            name: t('setting.scale'),
            desc: t('setting.scaleDesc'),
            control: {
              type: 'dropdown',
              key: 'scale',
              options: { '1x': '1x', '2x': '2x', '3x': '3x' },
            },
          },
          {
            name: t('setting.format'),
            control: {
              type: 'dropdown',
              key: 'format',
              options: { png: 'PNG', jpg: 'JPEG', webp: 'WebP' },
            },
          },
          {
            name: t('setting.themeMode'),
            control: {
              type: 'dropdown',
              key: 'themeMode',
              options: {
                current: t('studio.theme.current'),
                light: t('studio.theme.light'),
                dark: t('studio.theme.dark'),
              },
            },
          },
          {
            name: t('setting.showFilename'),
            control: { type: 'toggle', key: 'showFilename' },
          },
          {
            name: t('setting.showMetadata'),
            control: { type: 'toggle', key: 'showMetadata' },
          },
          {
            name: t('setting.padding'),
            desc: t('setting.paddingDesc'),
            render: (setting) => {
              this.renderPaddingSetting(setting);
            },
          },
        ],
      },
      {
        type: 'group',
        heading: t('setting.heading.media'),
        items: [
          {
            name: t('setting.embedMaxHeight'),
            desc: t('setting.embedMaxHeightDesc'),
            control: {
              type: 'number',
              key: 'embedMaxHeight',
              min: 0,
              placeholder: t('studio.embedMaxHeightPlaceholder'),
              validate: (value) =>
                Number.isFinite(value) && value >= 0
                  ? undefined
                  : t('setting.embedMaxHeightDesc'),
            },
          },
          {
            name: t('setting.embedAlign'),
            desc: t('setting.embedAlignDesc'),
            control: {
              type: 'dropdown',
              key: 'embedAlign',
              options: {
                left: t('studio.embedAlign.left'),
                center: t('studio.embedAlign.center'),
              },
            },
          },
        ],
      },
      {
        type: 'group',
        heading: t('setting.heading.behavior'),
        items: [
          {
            name: t('setting.settleTimeout'),
            desc: t('setting.settleTimeoutDesc'),
            control: {
              type: 'number',
              key: 'settleTimeoutMs',
              min: 500,
              validate: (value) =>
                Number.isFinite(value) && value >= 500
                  ? undefined
                  : t('setting.settleTimeoutDesc'),
            },
          },
          {
            name: t('setting.quickExportSelection'),
            desc: t('setting.quickExportSelectionDesc'),
            control: { type: 'toggle', key: 'quickExportSelection' },
          },
        ],
      },
    ];
  }

  /** Obsidian &lt; 1.13 fallback when declarative defs are unavailable. */
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName(t('setting.heading.language')).setHeading();

    new Setting(containerEl)
      .setName(t('setting.locale'))
      .setDesc(t('setting.localeDesc'))
      .then((setting) => {
        this.renderLocaleSetting(setting, () => this.display());
      });

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
      .setDesc(t('setting.paddingDesc'))
      .then((setting) => {
        this.renderPaddingSetting(setting);
      });

    new Setting(containerEl).setName(t('setting.heading.media')).setHeading();

    const mediaBlock = containerEl.createDiv({ cls: 'export-img-setting-block' });

    new Setting(mediaBlock)
      .setName(t('setting.embedMaxHeight'))
      .setDesc(t('setting.embedMaxHeightDesc'))
      .addText((text) =>
        text
          .setPlaceholder(t('studio.embedMaxHeightPlaceholder'))
          .setValue(
            this.plugin.settings.embedMaxHeight > 0
              ? String(this.plugin.settings.embedMaxHeight)
              : '',
          )
          .onChange(async (value) => {
            const raw = value.trim();
            if (raw === '') {
              this.plugin.settings.embedMaxHeight = 0;
              await this.plugin.saveSettings();
              return;
            }
            const n = Number(raw);
            if (!Number.isFinite(n) || n < 0) return;
            this.plugin.settings.embedMaxHeight = Math.round(n);
            await this.plugin.saveSettings();
          }),
      );

    new Setting(mediaBlock)
      .setName(t('setting.embedAlign'))
      .setDesc(t('setting.embedAlignDesc'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('left', t('studio.embedAlign.left'))
          .addOption('center', t('studio.embedAlign.center'))
          .setValue(this.plugin.settings.embedAlign)
          .onChange(async (value) => {
            this.plugin.settings.embedAlign = value as 'left' | 'center';
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

  /**
   * Refresh settings UI after locale change.
   * Uses Reflect so we do not reference SettingTab.update in typed form
   * (1.13+ API; blocked by no-unsupported-api at minAppVersion 1.5.7).
   */
  private refreshSettingsUi(): void {
    const updateFn = Reflect.get(this, 'update');
    if (typeof updateFn === 'function') {
      (updateFn as () => void).call(this);
      return;
    }
    this.display();
  }

  private renderLocaleSetting(setting: Setting, refresh: () => void): void {
    setting.addDropdown((dropdown) =>
      dropdown
        .addOption('auto', t('setting.locale.auto'))
        .addOption('en', t('setting.locale.en'))
        .addOption('zh', t('setting.locale.zh'))
        .setValue(this.plugin.settings.locale)
        .onChange(async (value) => {
          this.plugin.settings.locale = value as PluginLocale;
          setLocalePreference(this.plugin.settings.locale);
          await this.plugin.saveSettings();
          refresh();
        }),
    );
  }

  private renderPaddingSetting(setting: Setting): void {
    setting.controlEl.empty();
    setting.controlEl.addClass('export-img-setting-padding-controls');

    const pad = this.plugin.settings.padding;
    const rows: { key: 'vertical' | 'horizontal'; value: number }[] = [
      { key: 'vertical', value: pad.top },
      { key: 'horizontal', value: pad.left },
    ];

    for (const row of rows) {
      const line = setting.controlEl.createDiv({
        cls: 'export-img-setting-padding-row',
      });
      line.createSpan({
        text: t(`studio.padding.${row.key}`),
        cls: 'export-img-setting-padding-label',
      });
      const input = line.createEl('input', {
        type: 'number',
        cls: 'export-img-setting-padding-input',
        attr: {
          min: '0',
          max: '400',
          value: String(row.value),
        },
      });
      input.addEventListener('change', () => {
        void (async () => {
          const n = Number(input.value);
          if (!Number.isFinite(n) || n < 0) return;
          const v = Math.round(n);
          if (row.key === 'vertical') {
            this.plugin.settings.padding.top = v;
            this.plugin.settings.padding.bottom = v;
          } else {
            this.plugin.settings.padding.left = v;
            this.plugin.settings.padding.right = v;
          }
          await this.plugin.saveSettings();
        })();
      });
    }
  }
}
