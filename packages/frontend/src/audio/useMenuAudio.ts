/**
 * The shell's half of the mix — docs/audio-direction.md §10, docs/ui-ux.md §14.
 *
 * ## Who owns the AudioContext
 *
 * `GameCanvas` opens one engine per match and closes it on the way out,
 * because an AudioContext is a device handle and browsers cap how many a page
 * may hold *open*. The shell needs one too, and the two must never both be
 * holding a device for long: the screen union in `App.tsx` makes that easy to
 * guarantee, because `match` and every menu screen are mutually exclusive.
 * So this hook is active exactly when the match screen is not, and its
 * teardown closes the device before the match opens its own.
 *
 * The engine is the real one rather than a cut-down player, which is the point
 * of doing it this way: the bed rides the `music` bus, so the master volume
 * and the Music slider reach it without the bed knowing they exist — and
 * moving that slider on the settings screen is now *audible while you move
 * it*, which is the only way a volume control can honestly be judged.
 *
 * ## When it starts
 *
 * Never before a gesture. Autoplay policy blocks a context created without
 * one, and a game whose primary channel is audio cannot afford to look broken
 * on the title screen. The first click or keypress anywhere in the shell is
 * the unlock, and the bed fades in from there rather than arriving — see
 * `MenuBed.start` for why that matters when the gesture was a menu click.
 */

import { useEffect } from 'react';
import { AudioEngine } from './engine.ts';
import { ensureNoiseBuffer } from './contactVoice.ts';
import { MenuBed } from './menuBed.ts';
import { loadSettings, subscribeSettings, type Settings } from '../settings/store.ts';

/**
 * Hold the port's music for as long as `active`.
 *
 * Pass `screen.kind !== 'match'`: the shell is everything before a room is
 * joined and after one is left, and the ocean has its own mix.
 */
export function useMenuAudio(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const engine = new AudioEngine();
    let bed: MenuBed | null = null;
    /** The effect may be torn down while `unlock()` is still in flight. */
    let disposed = false;

    const apply = (settings: Settings) => {
      engine.setMasterVolume(settings.masterVolume);
      engine.setBusTrim('music', settings.busVolumes.music);
    };
    apply(loadSettings());
    // Live, so the Music and Master sliders can be heard as they move. The
    // in-match engine subscribes for the same reason; this one is the first
    // place the subscription actually changes something a player can hear.
    const unsubscribe = subscribeSettings(apply);

    const unlock = () => {
      void engine.unlock().then(() => {
        const context = engine.audioContext;
        const graph = engine.graph;
        if (disposed || bed !== null || context === null || graph === null) return;
        bed = new MenuBed(context, graph.music, ensureNoiseBuffer(context));
        bed.start();
      });
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    // A read-only window into the port's mix, for the headless harness — the
    // same shape and the same rule as `GameCanvas`'s: it reports state and can
    // neither drive the engine nor reach anything else. Without it "is the
    // menu actually making a sound" is only answerable by a human with
    // speakers, and this is a piece of music nobody can see.
    (window as unknown as { __menuAudioProbe?: () => unknown }).__menuAudioProbe = () => ({
      state: engine.state,
      playing: bed !== null,
      master: engine.masterVolumeValue,
      music: engine.busTrim('music'),
      ...(bed?.report ?? {}),
    });

    return () => {
      disposed = true;
      unsubscribe();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      delete (window as unknown as { __menuAudioProbe?: () => unknown }).__menuAudioProbe;
      // Fade first, then release the device. Closing a context mid-note is a
      // click, and the transition this most often runs on — Descend — is the
      // one the player is meant to feel as going under, not as a glitch.
      // Nothing was ever unlocked means nothing to fade, and the device goes
      // back immediately so a match can take it.
      const waitS = bed?.stop() ?? 0;
      if (waitS <= 0) {
        void engine.destroy();
        return;
      }
      setTimeout(() => void engine.destroy(), waitS * 1000);
    };
  }, [active]);
}
