/**
 * Apply one-shot settings migrations. Pure: returns next settings + whether to persist.
 * Versioned so padding heuristics never re-run after the first upgrade.
 */
import { Platform } from 'obsidian';
import { cloneSettings, DEFAULT_SETTINGS, SETTINGS_VERSION } from './settings';
import type { EmbedAlign, ExportImgSettings, PaddingSettings, SplitMode } from './types';

export type RawSettingsData = Partial<ExportImgSettings> & {
  previewMaxHeight?: number;
  previewAlign?: string;
  settingsVersion?: number;
  split?: Partial<ExportImgSettings['split']> & { overlap?: number; mode?: string };
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

function normalizeSplitMode(value: unknown): SplitMode {
  if (value === 'hr' || value === 'fixed' || value === 'none') return value;
  // Legacy `auto` used the same pagination as `fixed`.
  if (value === 'auto') return 'fixed';
  return DEFAULT_SETTINGS.split.mode;
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

  const rawSplit = rest.split ?? {};
  const { overlap: _overlap, mode: rawMode, ...splitRest } = rawSplit as {
    overlap?: number;
    mode?: string;
    height?: number;
  };
  if (_overlap !== undefined || rawMode === 'auto') {
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
    split: {
      ...DEFAULT_SETTINGS.split,
      ...splitRest,
      mode: normalizeSplitMode(rawMode ?? DEFAULT_SETTINGS.split.mode),
    },
    watermark: { ...DEFAULT_SETTINGS.watermark, ...rest.watermark },
    author: { ...DEFAULT_SETTINGS.author, ...rest.author },
  });

  // v4: decoration toggles are Studio session-only — clear persisted checked state.
  if (fromVersion < 4) {
    settings.watermark.enable = false;
    settings.author.show = false;
    shouldSave = true;
  }

  // v5: fill platform default only when the key was missing (do not clobber user choice).
  if (fromVersion < 5 && typeof rest.autoRerenderPreview !== 'boolean') {
    settings.autoRerenderPreview = !Platform.isMobile;
    shouldSave = true;
  }

  if (legacyPreviewMaxHeight !== undefined || legacyPreviewAlign !== undefined) {
    shouldSave = true;
  }

  return { settings, shouldSave };
}
