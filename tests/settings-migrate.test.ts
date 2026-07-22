import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '../src/settings';
import { migrateLoadedSettings } from '../src/settings-migrate';

describe('migrateLoadedSettings', () => {
  it('stamps settingsVersion and preserves intentional padding when already non-legacy', () => {
    const { settings, shouldSave } = migrateLoadedSettings({
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
    });
    expect(settings.settingsVersion).toBe(SETTINGS_VERSION);
    expect(settings.padding).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
    expect(shouldSave).toBe(true);
  });

  it('rewrites legacy padding defaults only when unversioned', () => {
    const { settings } = migrateLoadedSettings({
      padding: { top: 128, right: 64, bottom: 128, left: 64 },
    });
    expect(settings.padding).toEqual(DEFAULT_SETTINGS.padding);
  });

  it('rewrites the alternate legacy 128-all padding shape when unversioned', () => {
    const { settings, shouldSave } = migrateLoadedSettings({
      padding: { top: 128, right: 128, bottom: 128, left: 128 },
    });
    expect(settings.padding).toEqual(DEFAULT_SETTINGS.padding);
    expect(shouldSave).toBe(true);
  });

  it('does not rewrite legacy-looking padding once at current version', () => {
    const intentional = { top: 128, right: 64, bottom: 128, left: 64 };
    const { settings, shouldSave } = migrateLoadedSettings({
      settingsVersion: SETTINGS_VERSION,
      padding: intentional,
    });
    expect(settings.padding).toEqual(intentional);
    expect(shouldSave).toBe(false);
  });

  it('maps previewMaxHeight → embedMaxHeight once', () => {
    const { settings, shouldSave } = migrateLoadedSettings({
      previewMaxHeight: 240,
      previewAlign: 'left',
    });
    expect(settings.embedMaxHeight).toBe(240);
    expect(settings.embedAlign).toBe('left');
    expect(shouldSave).toBe(true);
  });

  it('uses defaults for null loadData and still stamps version', () => {
    const { settings, shouldSave } = migrateLoadedSettings(null);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(shouldSave).toBe(true);
  });

  it('merges partial nested watermark and author without dropping defaults', () => {
    const { settings } = migrateLoadedSettings({
      settingsVersion: SETTINGS_VERSION,
      watermark: { enable: true, text: 'WM' },
      author: { show: true, name: 'Ada' },
    } as Parameters<typeof migrateLoadedSettings>[0]);
    expect(settings.watermark.enable).toBe(true);
    expect(settings.watermark.text).toBe('WM');
    expect(settings.watermark.opacity).toBe(DEFAULT_SETTINGS.watermark.opacity);
    expect(settings.author.show).toBe(true);
    expect(settings.author.name).toBe('Ada');
    expect(settings.author.align).toBe(DEFAULT_SETTINGS.author.align);
  });

  it('does not require save when already at current version without legacy keys', () => {
    const { shouldSave } = migrateLoadedSettings({
      ...DEFAULT_SETTINGS,
      settingsVersion: SETTINGS_VERSION,
    });
    expect(shouldSave).toBe(false);
  });

  it('fills autoRerenderPreview default when upgrading from v2 without the key', () => {
    const { settings, shouldSave } = migrateLoadedSettings({
      settingsVersion: 2,
      width: 800,
    } as Parameters<typeof migrateLoadedSettings>[0]);
    // Desktop mock → on; mobile installs get off via Platform.isMobile.
    expect(settings.autoRerenderPreview).toBe(true);
    expect(settings.watermark.enable).toBe(false);
    expect(settings.author.show).toBe(false);
    expect(settings.settingsVersion).toBe(SETTINGS_VERSION);
    expect(shouldSave).toBe(true);
  });

  it('preserves explicit autoRerenderPreview when upgrading to v5', () => {
    const { settings, shouldSave } = migrateLoadedSettings({
      settingsVersion: 4,
      autoRerenderPreview: false,
    } as Parameters<typeof migrateLoadedSettings>[0]);
    expect(settings.autoRerenderPreview).toBe(false);
    expect(settings.settingsVersion).toBe(SETTINGS_VERSION);
    expect(shouldSave).toBe(true);
  });

  it('fills platform autoRerender default when upgrading to v5 without the key', () => {
    const { settings, shouldSave } = migrateLoadedSettings({
      settingsVersion: 4,
      width: 800,
    } as Parameters<typeof migrateLoadedSettings>[0]);
    expect(settings.autoRerenderPreview).toBe(true);
    expect(settings.settingsVersion).toBe(SETTINGS_VERSION);
    expect(shouldSave).toBe(true);
  });

  it('clears persisted watermark/author toggles when upgrading to v4', () => {
    const { settings, shouldSave } = migrateLoadedSettings({
      settingsVersion: 3,
      watermark: { enable: true, text: 'WM' },
      author: { show: true, name: 'Ada' },
    } as Parameters<typeof migrateLoadedSettings>[0]);
    expect(settings.watermark.enable).toBe(false);
    expect(settings.author.show).toBe(false);
    expect(settings.watermark.text).toBe('WM');
    expect(settings.author.name).toBe('Ada');
    expect(settings.settingsVersion).toBe(SETTINGS_VERSION);
    expect(shouldSave).toBe(true);
  });

  it('maps legacy split.auto to fixed and drops overlap', () => {
    const { settings, shouldSave } = migrateLoadedSettings({
      settingsVersion: 1,
      split: { mode: 'auto', height: 900, overlap: 40 } as never,
    });
    expect(settings.split.mode).toBe('fixed');
    expect(settings.split.height).toBe(900);
    expect('overlap' in settings.split).toBe(false);
    expect(shouldSave).toBe(true);
  });
});
