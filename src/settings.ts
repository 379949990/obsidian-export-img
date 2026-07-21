import type { ExportImgSettings } from './types';

export const DEFAULT_SETTINGS: ExportImgSettings = {
  width: 680,
  scale: '2x',
  format: 'png',
  showFilename: true,
  showMetadata: false,
  themeMode: 'current',
  settleTimeoutMs: 8000,
  quickExportSelection: false,
  padding: {
    top: 24,
    right: 28,
    bottom: 24,
    left: 28,
  },
  split: {
    mode: 'none',
    height: 1200,
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
