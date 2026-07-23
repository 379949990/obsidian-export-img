import {
  PluginSettingTab,
  Setting,
  type App,
  type SettingDefinitionItem,
} from 'obsidian';
import { createRoot } from 'preact/compat/client';
import type ExportImgPlugin from './main';
import { setLocalePreference, t } from './i18n';
import { cloneSettings, DEFAULT_SETTINGS } from './settings';
import type {
  ExportFormat,
  PluginLocale,
  ScaleMode,
  ThemeMode,
  WatermarkType,
} from './types';
import { ImageSourceField } from './ui/image-source-field';

/**
 * Prefer setDestructive (1.13+) without raising minAppVersion; fall back to setWarning.
 */
function applyDestructiveButton(btn: {
  setWarning: () => unknown;
}): void {
  const setDestructive = Reflect.get(btn, 'setDestructive');
  if (typeof setDestructive === 'function') {
    (setDestructive as () => unknown).call(btn);
    return;
  }
  btn.setWarning(); // community-review-allow: minAppVersion < 1.13 fallback
}

export class ExportImgSettingTab extends PluginSettingTab {
  plugin: ExportImgPlugin;
  private imageRoots: ReturnType<typeof createRoot>[] = [];

  constructor(app: App, plugin: ExportImgPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private clearImageRoots(): void {
    for (const root of this.imageRoots) {
      root.unmount();
    }
    this.imageRoots = [];
  }

  private mountImageField(
    setting: Setting,
    value: string,
    onChange: (next: string) => void | Promise<void>,
    opts?: { avatar?: boolean },
  ): void {
    setting.controlEl.empty();
    setting.controlEl.addClass('export-img-setting-image-source');
    if (opts?.avatar) setting.controlEl.addClass('is-avatar');
    const root = createRoot(setting.controlEl);
    this.imageRoots.push(root);
    root.render(
      <ImageSourceField
        app={this.app}
        value={value}
        avatar={opts?.avatar}
        onChange={(next) => {
          void onChange(next);
        }}
      />,
    );
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
        heading: t('setting.heading.author'),
        items: [
          {
            name: t('setting.authorAvatar'),
            desc: t('setting.authorPreconfigDesc'),
            render: (setting) => this.renderAuthorAvatar(setting),
          },
          {
            name: t('setting.authorName'),
            render: (setting) => this.renderAuthorName(setting),
          },
          {
            name: t('setting.authorRemark'),
            render: (setting) => this.renderAuthorRemark(setting),
          },
          {
            name: t('setting.authorAlign'),
            render: (setting) => this.renderAuthorAlign(setting),
          },
        ],
      },
      {
        type: 'group',
        heading: t('setting.heading.watermark'),
        items: [
          {
            name: t('setting.watermarkType'),
            desc: t('setting.watermarkPreconfigDesc'),
            render: (setting) => this.renderWatermarkType(setting),
          },
          {
            name: t('setting.watermarkText'),
            render: (setting) => this.renderWatermarkText(setting),
          },
          {
            name: t('setting.watermarkImage'),
            render: (setting) => this.renderWatermarkImage(setting),
          },
          {
            name: t('setting.watermarkColor'),
            render: (setting) => this.renderWatermarkColor(setting),
          },
          {
            name: t('setting.watermarkOpacity'),
            render: (setting) => this.renderWatermarkOpacity(setting),
          },
          {
            name: t('setting.watermarkRotate'),
            render: (setting) => this.renderWatermarkRotate(setting),
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
          {
            name: t('setting.autoRerenderPreview'),
            desc: t('setting.autoRerenderPreviewDesc'),
            control: { type: 'toggle', key: 'autoRerenderPreview' },
          },
          {
            name: t('setting.restoreDefaults'),
            desc: t('setting.restoreDefaultsDesc'),
            render: (setting) => {
              setting.addButton((btn) => {
                btn.setButtonText(t('setting.restoreDefaults'));
                applyDestructiveButton(btn);
                btn.onClick(() => {
                  void this.restoreDefaultSettings();
                });
              });
            },
          },
        ],
      },
    ];
  }

  /**
   * Obsidian &lt; 1.13 fallback when declarative defs are unavailable.
   * Path B: keep `display()` while minAppVersion is 1.5.7 (1.13 SettingTab APIs
   * are still Catalyst). Prefer {@link getSettingDefinitions} on 1.13+.
   */
  display(): void {
    this.clearImageRoots();
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

    new Setting(containerEl)
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

    new Setting(containerEl)
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

    new Setting(containerEl).setName(t('setting.heading.author')).setHeading();
    this.renderAuthorBlock(containerEl);

    new Setting(containerEl).setName(t('setting.heading.watermark')).setHeading();
    this.renderWatermarkBlock(containerEl);

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

    new Setting(containerEl)
      .setName(t('setting.autoRerenderPreview'))
      .setDesc(t('setting.autoRerenderPreviewDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoRerenderPreview)
          .onChange(async (value) => {
            this.plugin.settings.autoRerenderPreview = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('setting.restoreDefaults'))
      .setDesc(t('setting.restoreDefaultsDesc'))
      .addButton((btn) => {
        btn.setButtonText(t('setting.restoreDefaults'));
        applyDestructiveButton(btn);
        btn.onClick(() => {
          void this.restoreDefaultSettings();
        });
      });
  }

  /**
   * Refresh settings UI after locale change.
   * Uses Reflect so we do not reference SettingTab.update in typed form
   * (1.13+ API; blocked by no-unsupported-api at minAppVersion 1.5.7).
   */
  private refreshSettingsUi(): void {
    this.clearImageRoots();
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

  private renderAuthorBlock(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t('setting.authorAvatar'))
      .setDesc(t('setting.authorPreconfigDesc'))
      .then((setting) => this.renderAuthorAvatar(setting));
    new Setting(containerEl)
      .setName(t('setting.authorName'))
      .then((setting) => this.renderAuthorName(setting));
    new Setting(containerEl)
      .setName(t('setting.authorRemark'))
      .then((setting) => this.renderAuthorRemark(setting));
    new Setting(containerEl)
      .setName(t('setting.authorAlign'))
      .then((setting) => this.renderAuthorAlign(setting));
  }

  private renderWatermarkBlock(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t('setting.watermarkType'))
      .setDesc(t('setting.watermarkPreconfigDesc'))
      .then((setting) => this.renderWatermarkType(setting));

    if (this.plugin.settings.watermark.type === 'image') {
      new Setting(containerEl)
        .setName(t('setting.watermarkImage'))
        .then((setting) => this.renderWatermarkImage(setting));
    } else {
      new Setting(containerEl)
        .setName(t('setting.watermarkText'))
        .then((setting) => this.renderWatermarkText(setting));
      new Setting(containerEl)
        .setName(t('setting.watermarkColor'))
        .then((setting) => this.renderWatermarkColor(setting));
    }

    new Setting(containerEl)
      .setName(t('setting.watermarkOpacity'))
      .then((setting) => this.renderWatermarkOpacity(setting));
    new Setting(containerEl)
      .setName(t('setting.watermarkRotate'))
      .then((setting) => this.renderWatermarkRotate(setting));
  }

  private renderAuthorAvatar(setting: Setting): void {
    this.mountImageField(
      setting,
      this.plugin.settings.author.avatarSrc,
      async (next) => {
        this.plugin.settings.author.avatarSrc = next;
        await this.plugin.saveSettings();
        this.refreshSettingsUi();
      },
      { avatar: true },
    );
  }

  private renderAuthorName(setting: Setting): void {
    setting.addText((text) =>
      text.setValue(this.plugin.settings.author.name).onChange(async (value) => {
        this.plugin.settings.author.name = value;
        await this.plugin.saveSettings();
      }),
    );
  }

  private renderAuthorRemark(setting: Setting): void {
    setting.addText((text) =>
      text.setValue(this.plugin.settings.author.remark).onChange(async (value) => {
        this.plugin.settings.author.remark = value;
        await this.plugin.saveSettings();
      }),
    );
  }

  private renderAuthorAlign(setting: Setting): void {
    setting.addDropdown((dropdown) =>
      dropdown
        .addOption('left', t('studio.authorAlign.left'))
        .addOption('center', t('studio.authorAlign.center'))
        .addOption('right', t('studio.authorAlign.right'))
        .setValue(this.plugin.settings.author.align)
        .onChange(async (value) => {
          this.plugin.settings.author.align = value as 'left' | 'center' | 'right';
          await this.plugin.saveSettings();
        }),
    );
  }

  private renderWatermarkType(setting: Setting): void {
    setting.addDropdown((dropdown) =>
      dropdown
        .addOption('text', t('setting.watermarkType.text'))
        .addOption('image', t('setting.watermarkType.image'))
        .setValue(this.plugin.settings.watermark.type)
        .onChange(async (value) => {
          this.plugin.settings.watermark.type = value as WatermarkType;
          await this.plugin.saveSettings();
          this.refreshSettingsUi();
        }),
    );
  }

  private renderWatermarkText(setting: Setting): void {
    setting.addText((text) =>
      text.setValue(this.plugin.settings.watermark.text).onChange(async (value) => {
        this.plugin.settings.watermark.text = value;
        await this.plugin.saveSettings();
      }),
    );
  }

  private renderWatermarkImage(setting: Setting): void {
    this.mountImageField(setting, this.plugin.settings.watermark.imageSrc, async (next) => {
      this.plugin.settings.watermark.imageSrc = next;
      await this.plugin.saveSettings();
      this.refreshSettingsUi();
    });
  }

  private renderWatermarkColor(setting: Setting): void {
    setting.controlEl.empty();
    const input = setting.controlEl.createEl('input', {
      type: 'color',
      attr: { value: this.plugin.settings.watermark.color },
    });
    input.value = this.plugin.settings.watermark.color;
    input.addEventListener('change', () => {
      void (async () => {
        this.plugin.settings.watermark.color = input.value;
        await this.plugin.saveSettings();
      })();
    });
  }

  private renderWatermarkOpacity(setting: Setting): void {
    const pct = Math.round(this.plugin.settings.watermark.opacity * 100);
    setting.setName(`${t('setting.watermarkOpacity')} (${pct}%)`);
    setting.addSlider((slider) =>
      slider
        .setLimits(5, 60, 1)
        .setValue(pct)
        .onChange(async (value) => {
          this.plugin.settings.watermark.opacity = value / 100;
          setting.setName(`${t('setting.watermarkOpacity')} (${value}%)`);
          await this.plugin.saveSettings();
        }),
    );
  }

  private renderWatermarkRotate(setting: Setting): void {
    const deg = this.plugin.settings.watermark.rotate;
    setting.setName(`${t('setting.watermarkRotate')} (${deg}°)`);
    setting.addSlider((slider) =>
      slider
        .setLimits(-90, 90, 1)
        .setValue(deg)
        .onChange(async (value) => {
          this.plugin.settings.watermark.rotate = value;
          setting.setName(`${t('setting.watermarkRotate')} (${value}°)`);
          await this.plugin.saveSettings();
        }),
    );
  }

  private async restoreDefaultSettings(): Promise<void> {
    this.plugin.settings = cloneSettings(DEFAULT_SETTINGS);
    setLocalePreference(this.plugin.settings.locale);
    await this.plugin.saveSettings();
    this.refreshSettingsUi();
  }
}
