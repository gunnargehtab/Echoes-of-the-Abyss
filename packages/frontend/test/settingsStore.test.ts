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
  UI_SCALE_MAX,
  UI_SCALE_MIN,
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

  it('loads a record written before the speech bus with speech at unity', () => {
    // The trim exists so the channel can be turned down with nothing lost —
    // the log is the caption (docs/audio-direction.md §13). A record that
    // predates it must not load the bus muted: a player who never had the
    // slider never turned it down.
    backing.set(
      'echoes.settings',
      JSON.stringify({
        version: 1,
        busVolumes: { music: 0.5, world: 1, contact: 1, self: 1, ui: 1 },
      })
    );
    const loaded = loadSettings();
    assert.equal(loaded.busVolumes.speech, 1);
    assert.equal(loaded.busVolumes.music, 0.5);
    assert.equal(DEFAULT_SETTINGS.busVolumes.speech, 1);

    saveSettings({ busVolumes: { ...loaded.busVolumes, speech: 0 } });
    assert.equal(loadSettings().busVolumes.speech, 0, 'and it can be taken to zero');
    backing.set('echoes.settings', JSON.stringify({ version: 1, busVolumes: { speech: 7 } }));
    assert.equal(loadSettings().busVolumes.speech, 1, 'but never above unity');
  });

  it('clamps the UI scale to the range §11 specifies', () => {
    for (const [stored, expected] of [
      [5, UI_SCALE_MAX],
      [0.1, UI_SCALE_MIN],
      [1.35, 1.35],
      [Number.NaN, 1],
      ['big', 1],
    ] as const) {
      backing.set('echoes.settings', JSON.stringify({ version: 1, uiScale: stored }));
      assert.equal(loadSettings().uiScale, expected, `uiScale ${String(stored)}`);
    }
  });

  it('falls back to the standard palette rather than to a name it cannot draw', () => {
    backing.set('echoes.settings', JSON.stringify({ version: 1, palette: 'tritanopia' }));
    assert.equal(loadSettings().palette, 'tritanopia');
    for (const junk of ['monochrome', '', 7, null]) {
      backing.set('echoes.settings', JSON.stringify({ version: 1, palette: junk }));
      assert.equal(loadSettings().palette, 'standard', `palette ${String(junk)}`);
    }
  });

  it('takes reduced motion from the OS until the player has answered for themselves', () => {
    const media = (matches: boolean) => {
      (globalThis as { matchMedia?: unknown }).matchMedia = (query: string) => ({
        matches: query.includes('reduce') && matches,
      });
    };
    try {
      // No record at all, and a record that predates the setting: the OS answers.
      media(true);
      assert.equal(loadSettings().reducedMotion, true);
      backing.set('echoes.settings', JSON.stringify({ version: 1, masterVolume: 0.5 }));
      assert.equal(loadSettings().reducedMotion, true);

      // An explicit answer outranks the OS in *both* directions — a player who
      // turned it off should not have it turned back on every reload.
      saveSettings({ reducedMotion: false });
      assert.equal(loadSettings().reducedMotion, false);

      media(false);
      backing.delete('echoes.settings');
      assert.equal(loadSettings().reducedMotion, false);
    } finally {
      delete (globalThis as { matchMedia?: unknown }).matchMedia;
    }
  });

  it('survives a browser that throws on matchMedia instead of answering', () => {
    (globalThis as { matchMedia?: unknown }).matchMedia = () => {
      throw new Error('blocked');
    };
    try {
      assert.equal(loadSettings().reducedMotion, false);
    } finally {
      delete (globalThis as { matchMedia?: unknown }).matchMedia;
    }
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
