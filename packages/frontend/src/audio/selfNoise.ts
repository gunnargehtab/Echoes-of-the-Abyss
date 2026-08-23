/**
 * Your own loudness — docs/audio-direction.md §4.
 *
 * "The SIG meter is the readout. The self-noise bed is the feeling."
 *
 * The rule this file exists to protect is the one §4 states outright:
 * **being loud makes you deaf.** That is a *mix* behaviour, not a simulated
 * hydrophone limitation — detection maths is untouched, and the server does
 * not know this module exists. A player at SIG 80 is, correctly, having
 * trouble hearing, and they feel the cost of noise before they understand it.
 *
 * Which makes the world-bus attenuation below load-bearing rather than
 * flavour: remove it and the economy of noise stops being felt at all.
 */

import { SILENT_RUNNING } from '@echoes/shared';

/**
 * SPEC — §4's table. Each band gives the self bed's level and what it does to
 * the rest of the mix, as linear gains.
 *
 * The world-bus figures are the doc's decibels converted once, here, rather
 * than scattered as magic numbers: −3 dB is 0.708, −8 dB is 0.398.
 */
export interface SelfBand {
  /** Upper bound of the band, inclusive. */
  maxSig: number;
  /** Level of the self-noise bed, linear. */
  selfGain: number;
  /** What the world bus is attenuated to while in this band, linear. */
  worldGain: number;
  /** Low-pass corner on the bed, Hz — the plant gets brighter as it works. */
  cutoffHz: number;
  /** Machinery layer: rhythmic content enters partway up the scale. */
  rateHz: number;
  /** Label, for the HUD's visual equivalent (§11). */
  label: string;
}

export const SELF_BANDS: readonly SelfBand[] = [
  {
    maxSig: 15,
    selfGain: 0.18,
    worldGain: 1,
    cutoffHz: 220,
    rateHz: 0,
    label: 'hull creak',
  },
  {
    maxSig: 40,
    selfGain: 0.32,
    worldGain: 1,
    cutoffHz: 340,
    rateHz: 0,
    label: 'drive hum',
  },
  {
    maxSig: 65,
    selfGain: 0.52,
    // −3 dB. "You are starting to drown yourself out."
    worldGain: 0.708,
    cutoffHz: 620,
    rateHz: 2.2,
    label: 'machinery',
  },
  {
    maxSig: 100,
    selfGain: 0.78,
    // −8 dB. The contact band is partially masked, on purpose.
    worldGain: 0.398,
    cutoffHz: 1100,
    rateHz: 3.4,
    label: 'full plant',
  },
];

/**
 * Silent Running inverts the whole scale (§4).
 *
 * "The world gets louder because you got quieter, and the first time a player
 * toggles it the map audibly fills with things that were always there. That
 * moment is the sales pitch for the entire system." So these two numbers are
 * not a polish pass — they are the demonstration the mechanic makes of itself.
 */
export const SILENT_MIX = {
  /** −18 dB on the self bus. */
  SELF_GAIN: 0.126,
  /** +6 dB on the world bus. */
  WORLD_GAIN: 1.995,
  /** Seconds to cross-fade, so the reveal is felt as a change, not a cut. */
  RAMP_S: 0.6,
} as const;

export function bandFor(sig: number): SelfBand {
  for (const band of SELF_BANDS) {
    if (sig <= band.maxSig) return band;
  }
  return SELF_BANDS[SELF_BANDS.length - 1]!;
}

/**
 * The mix your own noise produces: what your bed sounds like, and what it
 * costs you in hearing.
 *
 * Pure, so the whole of §4 is assertable without an AudioContext — including
 * the inversion, which is the part a refactor is most likely to get subtly
 * backwards.
 */
export interface SelfMix {
  selfGain: number;
  worldGain: number;
  cutoffHz: number;
  rateHz: number;
  label: string;
}

export function selfMixFor(sig: number, silentRunning: boolean): SelfMix {
  const band = bandFor(sig);
  if (silentRunning) {
    return {
      selfGain: SILENT_MIX.SELF_GAIN,
      worldGain: SILENT_MIX.WORLD_GAIN,
      // Running silent is not merely quiet, it is *narrow*: the plant is shut
      // down to the hull, so the bed loses its top as well as its level.
      cutoffHz: SELF_BANDS[0]!.cutoffHz,
      rateHz: 0,
      label: 'silent running',
    };
  }
  return {
    selfGain: band.selfGain,
    worldGain: band.worldGain,
    cutoffHz: band.cutoffHz,
    rateHz: band.rateHz,
    label: band.label,
  };
}

/**
 * How long the break-silence transient lasts, seconds.
 *
 * Matched to the simulation's own spike duration rather than chosen: the sound
 * and the SIG penalty are the same event, and a mix that finished before the
 * cost did would be lying about how long the player is exposed.
 */
export const BREAK_SILENCE_S = SILENT_RUNNING.BREAK_SILENCE_DURATION_S;
