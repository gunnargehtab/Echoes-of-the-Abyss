/**
 * The settings store (#186).
 *
 * Everything here defends one promise: storage can be absent, hostile or
 * stale, and the shell still boots with usable settings. The store's error
 * handling is not a nicety — a player whose localStorage holds last year's
 * JSON must get defaults, not a blank screen.
 */
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  subscribeSettings,
} from '../src/settings/store.ts';

/** A minimal in-memory localStorage, installed per test. */
function installStorage(): Map<string, string> {
  const backing = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => void backing.set(key, value),
    removeItem: (key: string) => void backing.delete(key),
  };
  return backing;
}

describe('the settings store', () => {
  let backing: Map<string, string>;

  beforeEach(() => {
    backing = installStorage();
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('loads defaults from empty storage, and with no storage at all', () => {
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
    delete (globalThis as { localStorage?: unknown }).localStorage;
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  });

  it('round-trips a save', () => {
    saveSettings({ profileName: 'Ahab', masterVolume: 0.7, mono: true });
    const loaded = loadSettings();
    assert.equal(loaded.profileName, 'Ahab');
    assert.equal(loaded.masterVolume, 0.7);
    assert.equal(loaded.mono, true);
    // Untouched fields keep their defaults.
    assert.equal(loaded.visualFirst, false);
    assert.deepEqual(loaded.busVolumes, DEFAULT_SETTINGS.busVolumes);
  });

  it('treats corrupt JSON as defaults, not as an error', () => {
    backing.set('echoes.settings', '{not json');
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
    backing.set('echoes.settings', '"a string"');
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  });

  it('refuses a foreign version whole, but tolerates unknown extra fields', () => {
    // A version bump means field meanings may have changed — defaults.
    backing.set('echoes.settings', JSON.stringify({ version: 2, masterVolume: 0.1 }));
    assert.equal(loadSettings().masterVolume, 1);
    // Same version with a field from a newer build: keep what we understand.
    backing.set(
      'echoes.settings',
      JSON.stringify({ version: 1, masterVolume: 0.4, futureField: 'x' })
    );
    const loaded = loadSettings();
    assert.equal(loaded.masterVolume, 0.4);
    assert.ok(!('futureField' in loaded));
  });

  it('clamps hostile numbers into range', () => {
    backing.set(
      'echoes.settings',
      JSON.stringify({
        version: 1,
        masterVolume: 4,
        contactBoostDb: 900,
        busVolumes: { music: -2, contact: Number.NaN },
      })
    );
    const loaded = loadSettings();
    assert.equal(loaded.masterVolume, 1);
    assert.equal(loaded.contactBoostDb, 12);
    assert.equal(loaded.busVolumes.music, 0);
    assert.equal(loaded.busVolumes.contact, 1);
  });

  it('notifies subscribers on save, and unsubscribe stops it', () => {
    let seen = 0;
    const unsubscribe = subscribeSettings(() => seen++);
    saveSettings({ mono: true });
    assert.equal(seen, 1);
    unsubscribe();
    saveSettings({ mono: false });
    assert.equal(seen, 1);
  });
});
