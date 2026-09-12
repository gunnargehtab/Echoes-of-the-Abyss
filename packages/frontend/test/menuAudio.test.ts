/**
 * The port's own mix — docs/audio-direction.md §10 and §11.
 *
 * `useMenuAudio` opens a second `AudioEngine`, because an AudioContext is a
 * device handle and the shell and a match never hold one at the same time.
 * Two engines is the right shape and it is also the trap: anything set on the
 * output rather than on a bus has to be set on *both*, and nothing in the type
 * system says so.
 *
 * §11's speaker profile was set in `GameCanvas` alone when it landed (#663),
 * which left the port unprofiled on the one device the profile exists for —
 * and the port is where a player forms their first impression of the mix.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { act, create } from 'react-test-renderer';
import { createElement } from 'react';
import { installHeadlessAudio, uninstallHeadlessAudio } from './support/headlessAudio.ts';
import { clearStorage, installStorage } from './support/headless.ts';
import { useMenuAudio } from '../src/audio/useMenuAudio.ts';
import { DEFAULT_SETTINGS, saveSettings } from '../src/settings/store.ts';

/** A component that is nothing but the hook. */
function Port(): null {
  useMenuAudio(true);
  return null;
}

interface Probe {
  master: number;
  music: number;
  speakerProfile: boolean;
}

function probe(): Probe {
  const read = (window as unknown as { __menuAudioProbe?: () => Probe }).__menuAudioProbe;
  assert.ok(read !== undefined, 'the port opened no engine');
  return read();
}

describe('the port carries the same output settings as a match', () => {
  it('applies the speaker profile to the menu engine, not only to the match one', () => {
    installHeadlessAudio();
    // The settings the hook reads at mount come off `localStorage`, which the
    // runner has none of — without this the test would be asserting against
    // the defaults and would pass whatever the hook did.
    installStorage();
    saveSettings({ ...DEFAULT_SETTINGS, speakerProfile: true, masterVolume: 0.5 });
    let tree: ReturnType<typeof create> | null = null;
    try {
      act(() => {
        tree = create(createElement(Port));
      });
      const reading = probe();
      assert.equal(
        reading.speakerProfile,
        true,
        'the port plays unprofiled while the match it leads into is profiled'
      );
      // Asserted beside a bus setting that was never in doubt, so a failure
      // here reads as "the profile specifically" rather than as "the hook
      // stopped applying settings at all".
      assert.equal(reading.master, 0.5, 'the port did not take the master volume either');
    } finally {
      act(() => {
        tree?.unmount();
      });
      saveSettings(DEFAULT_SETTINGS);
      clearStorage();
      uninstallHeadlessAudio();
    }
  });

  it('follows the setting when it changes while the port is open', () => {
    // The sliders are heard as they move (that is why the hook subscribes),
    // and the profile is a toggle in the same screen.
    installHeadlessAudio();
    installStorage();
    saveSettings({ ...DEFAULT_SETTINGS, speakerProfile: false });
    let tree: ReturnType<typeof create> | null = null;
    try {
      act(() => {
        tree = create(createElement(Port));
      });
      assert.equal(probe().speakerProfile, false);
      act(() => {
        saveSettings({ ...DEFAULT_SETTINGS, speakerProfile: true });
      });
      assert.equal(probe().speakerProfile, true, 'the port ignored the toggle until a restart');
    } finally {
      act(() => {
        tree?.unmount();
      });
      saveSettings(DEFAULT_SETTINGS);
      clearStorage();
      uninstallHeadlessAudio();
    }
  });
});
