/**
 * Why the lamp halo is or is not drawing, for Settings to read
 * (docs/art-direction.md "Lamp halo — SPEC", "Off, and when it is unavailable").
 *
 * The SPEC has the view refuse the halo on a display that fails its
 * capability check, keep the player's choice, and have Settings say "Not
 * available on this display". Settings is a shell screen with no handle on
 * the view, and the view has no handle on the shell, so the state crosses
 * here: the view writes it whenever the halo turns on, off or is refused,
 * and the screen subscribes the way it subscribes to the settings store.
 * One value and no history, because the screen asks one question: is the
 * choice the player made the one the water is showing?
 *
 * Three-free, like `lampHalo.ts`, so the screen's test holds it without a
 * context: the view never passes an object out, only the state string the
 * pass already reports to the probe.
 */

import type { LampHaloState } from './lampHaloPass.ts';

type Listener = (state: LampHaloState) => void;
const listeners = new Set<Listener>();
let current: LampHaloState = 'off';

/** The state the view last published; `off` before any view has mounted. */
export function lampHaloStatus(): LampHaloState {
  return current;
}

/** Published by the view after every change; the probe reads the same string. */
export function publishLampHaloStatus(state: LampHaloState): void {
  if (state === current) return;
  current = state;
  for (const listener of listeners) listener(state);
}

/** Subscribe to changes; returns the unsubscribe, `useSyncExternalStore`'s shape. */
export function subscribeLampHaloStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The reason a refused display gave, or null while the halo is not refused. */
export function lampHaloUnavailableReason(state: LampHaloState = current): string | null {
  return state.startsWith('unavailable: ') ? state.slice('unavailable: '.length) : null;
}
