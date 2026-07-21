import type { ExportImgSettings, PluginLocale, EmbedAlign } from './types';

/** Bump when adding a migration step that must run exactly once per install. */
export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: ExportImgSettings = {
  settingsVersion: SETTINGS_VERSION,
  width: 800,
  scale: '2x',
  format: 'png',
  showFilename: true,
  showMetadata: false,
  themeMode: 'current',
  settleTimeoutMs: 8000,
  quickExportSelection: false,
  locale: 'auto',
  /** Default export padding — Studio opens with these values. */
  padding: {
    top: 96,
    right: 48,
    bottom: 96,
    left: 48,
  },
  /**
   * Max rendered height for embedded images, Mermaid, and other wide/scrollable blocks.
   * 0 = no height clamp.
   */
  embedMaxHeight: 360,
  embedAlign: 'center',
  split: {
    mode: 'none',
    /** 0 = auto (width × 1.414, A4 ratio) when resolving fixed/auto pages. */
    height: 0,
    overlap: 40,
  },
  watermark: {
    enable: false,
    type: 'text',
    text: '',
    fontSize: 28,
    color: '#cccccc',
    imageSrc: '',
    opacity: 0.18,
    rotate: -30,
  },
  author: {
    show: false,
    name: '',
    remark: '',
    avatarSrc: '',
    align: 'right',
  },
};

/** Deep-clone settings so Studio draft state cannot mutate plugin.settings in place. */
export function cloneSettings(settings: ExportImgSettings): ExportImgSettings {
  return {
    ...settings,
    padding: { ...settings.padding },
    split: { ...settings.split },
    watermark: { ...settings.watermark },
    author: { ...settings.author },
  };
}

export function scaleToNumber(scale: ExportImgSettings['scale']): number {
  if (scale === '3x') return 3;
  if (scale === '2x') return 2;
  return 1;
}

export type { PluginLocale, EmbedAlign };
