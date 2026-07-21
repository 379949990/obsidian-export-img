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
});
