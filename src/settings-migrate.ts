/**
 * Apply one-shot settings migrations. Pure: returns next settings + whether to persist.
 * Versioned so padding heuristics never re-run after the first upgrade.
 */
import { cloneSettings, DEFAULT_SETTINGS, SETTINGS_VERSION } from './settings';
import type { EmbedAlign, ExportImgSettings, PaddingSettings } from './types';

export type RawSettingsData = Partial<ExportImgSettings> & {
  previewMaxHeight?: number;
  previewAlign?: 'left' | 'center';
  settingsVersion?: number;
  embedAlign?: EmbedAlign | 'default' | string;
};

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

function normalizeEmbedAlign(value: unknown): EmbedAlign {
  return value === 'center' ? 'center' : 'left';
}

export function migrateLoadedSettings(data: RawSettingsData | null): {
  settings: ExportImgSettings;
  shouldSave: boolean;
} {
  const {
    previewMaxHeight: legacyPreviewMaxHeight,
    previewAlign: legacyPreviewAlign,
    settingsVersion: loadedVersion,
    ...rest
  } = data ?? {};

  const fromVersion = typeof loadedVersion === 'number' ? loadedVersion : 0;
  let shouldSave = fromVersion < SETTINGS_VERSION;

  let padding = { ...DEFAULT_SETTINGS.padding, ...rest.padding };
  // Only rewrite known shipped defaults when upgrading from unversioned data.
  if (fromVersion < 1 && isLegacyPaddingDefault(padding)) {
    padding = { ...DEFAULT_SETTINGS.padding };
    shouldSave = true;
  }

  const settings = cloneSettings({
    ...DEFAULT_SETTINGS,
    ...rest,
    settingsVersion: SETTINGS_VERSION,
    locale: rest.locale ?? DEFAULT_SETTINGS.locale,
    embedMaxHeight:
      rest.embedMaxHeight ?? legacyPreviewMaxHeight ?? DEFAULT_SETTINGS.embedMaxHeight,
    embedAlign: normalizeEmbedAlign(
      rest.embedAlign ?? legacyPreviewAlign ?? DEFAULT_SETTINGS.embedAlign,
    ),
    padding,
    split: { ...DEFAULT_SETTINGS.split, ...rest.split },
    watermark: { ...DEFAULT_SETTINGS.watermark, ...rest.watermark },
    author: { ...DEFAULT_SETTINGS.author, ...rest.author },
  });

  if (legacyPreviewMaxHeight !== undefined || legacyPreviewAlign !== undefined) {
    shouldSave = true;
  }

  return { settings, shouldSave };
}
