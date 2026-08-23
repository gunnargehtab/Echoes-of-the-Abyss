/**
 * The Precedence Law — docs/audio-direction.md §2.
 *
 * Two separate ideas share the name, and both live here because both are
 * about the same thing: what reaches the player first, and what wins when
 * several things want their attention at once.
 *
 * **In time.** The Echo Layer ticks at 5 Hz, so a detection can be 200 ms old
 * before the client learns of it. Within a tick the *ear must beat the eye*:
 * a voice starts inside 30 ms, and the marks fade in behind it. The fade-in is
 * not decoration — it is the budget that keeps the law true on a machine whose
 * audio device has its own output latency. A mark that pops instantly races
 * the sound and will sometimes win.
 *
 * The doc names the failure mode plainly: if the eye leads, players stop
 * listening within one match, the mix becomes ambience, and the Echo Layer
 * degrades into conventional fog of war with a nice soundtrack.
 *
 * **In level.** When several things sound at once, the order is fixed rather
 * than "whichever started last". Exposure outranks everything, because §5
 * makes it the loudest event in the game and §12 leaves headroom specifically
 * for it; contacts outrank self-noise, because contacts are the information
 * and self-noise is the atmosphere; music is last, always.
 */

/** Onset budget, in milliseconds after the snapshot is applied. */
export interface PrecedenceTiming {
  /** A contact voice must have started by here. */
  VOICE_ONSET: number;
  /** The minimap mark may not begin to appear before here... */
  MINIMAP_FADE_START: number;
  /** ...nor reach full opacity before here. */
  MINIMAP_FADE_FULL: number;
  /** The world-space mark may not begin to appear before here. */
  WORLD_FADE_START: number;
}

/** SPEC — §2's table, in milliseconds after the snapshot is applied. */
export const PRECEDENCE_MS: PrecedenceTiming = {
  VOICE_ONSET: 30,
  MINIMAP_FADE_START: 150,
  MINIMAP_FADE_FULL: 400,
  WORLD_FADE_START: 250,
};

/**
 * Visual-first preset (§11): inverts the law so marks arrive at ≤ 30 ms and
 * audio follows. One toggle, no other behavioural change — which is why it is
 * a second table rather than a branch scattered through the renderer.
 */
export const VISUAL_FIRST_MS: PrecedenceTiming = {
  VOICE_ONSET: 30,
  MINIMAP_FADE_START: 0,
  MINIMAP_FADE_FULL: 30,
  WORLD_FADE_START: 0,
};

export type PrecedenceMode = 'ear-first' | 'visual-first';

export function precedenceTiming(mode: PrecedenceMode): PrecedenceTiming {
  return mode === 'visual-first' ? VISUAL_FIRST_MS : PRECEDENCE_MS;
}

/**
 * Opacity of a mark, given how long ago its snapshot was applied.
 *
 * Returns 0 before the fade starts, ramps linearly to 1, and stays there. The
 * renderer multiplies this into whatever alpha the tier already earned, so a
 * stale Tier-1 ghost fading out and a fresh Tier-1 mark fading in compose
 * rather than fight.
 */
export function markOpacity(ageMs: number, startMs: number, fullMs: number): number {
  if (ageMs <= startMs) return 0;
  if (ageMs >= fullMs) return 1;
  return (ageMs - startMs) / (fullMs - startMs);
}

/**
 * Bus priority, highest first.
 *
 * The level half of the law. Every rung below the loudest one is attenuated
 * while something above it is sounding, which is what makes the order audible
 * rather than merely documented.
 */
export const BUS_PRIORITY = ['self-exposure', 'contact', 'self', 'world', 'music'] as const;

export type BusRung = (typeof BUS_PRIORITY)[number];

/**
 * How far each rung ducks while `active` is sounding, as a linear gain.
 *
 * 1 means untouched. A rung never ducks itself or anything above it: the
 * exposure cue arriving must not quieten the contact that arrives with it,
 * because both are information and the player is owed both.
 */
export function duckFor(rung: BusRung, active: BusRung | null): number {
  if (active === null) return 1;
  const activeRank = BUS_PRIORITY.indexOf(active);
  const rank = BUS_PRIORITY.indexOf(rung);
  if (rank <= activeRank) return 1;

  // One step down is a clear but recoverable dip; further down is decisive.
  // Chosen so the exposure cue leaves music barely present without muting it
  // — silence would read as a bug, and §11 needs the mix to stay legible.
  const steps = rank - activeRank;
  return steps === 1 ? 0.55 : 0.3;
}
