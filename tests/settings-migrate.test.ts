import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/settings';
import { migrateLoadedSettings } from '../src/settings-migrate';

describe('migrateLoadedSettings', () => {
  it('stamps settingsVersion and preserves intentional padding when already non-legacy', () => {
    const { settings, shouldSave } = migrateLoadedSettings({
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
    });
    expect(settings.settingsVersion).toBe(1);
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

  it('does not rewrite legacy-looking padding once versioned', () => {
    const intentional = { top: 128, right: 64, bottom: 128, left: 64 };
    const { settings, shouldSave } = migrateLoadedSettings({
      settingsVersion: 1,
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
      settingsVersion: 1,
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

  it('does not require save when already migrated without legacy keys', () => {
    const { shouldSave } = migrateLoadedSettings({
      ...DEFAULT_SETTINGS,
      settingsVersion: 1,
    });
    expect(shouldSave).toBe(false);
  });
});
