/**
 * PropagationFactor as a DSP chain — docs/audio-direction.md §9.
 *
 * "PF is a number in the detection maths and a DSP chain in the mix. The two
 * must agree; a biome that masks you mechanically but sounds open is a lie."
 *
 * That sentence is the whole contract. The Echo Layer already prices sound by
 * the water it crossed; this makes the same water audible, so a player who has
 * learned what a kelp bed sounds like has learned something true about where
 * they can hide.
 */

import { Biome } from '@echoes/shared';

export interface BiomeVoicing {
  /** Low-pass corner, Hz. Below the reference means audibly duller. */
  cutoffHz: number;
  /** Resonance at the corner. */
  q: number;
  /** Broadband noise floor this biome adds, 0-1. */
  noiseFloor: number;
  /**
   * A second arrival, in seconds, or 0 for none.
   *
   * The trench's signature: "contacts arrive *twice*; the second arrival is
   * the trench, not a second unit". Getting this wrong would manufacture
   * phantom contacts, so it is deliberately a short, quiet, obviously-coupled
   * repeat rather than anything a player could mistake for a separate hull.
   */
  delayS: number;
  /** Feedback on that delay, for the Resonance Field's comb. */
  delayFeedback: number;
  /** Overall level trim, so masking reads as masking. */
  gain: number;
}

/**
 * Voicings per biome, transcribed from §9's table.
 *
 * Two rows in that table have no counterpart here and are not modelled:
 * the thermocline boundary, which the simulation has no biome for, and the
 * Abyssal Trench's *axial* behaviour — the trench is neutral on-axis and
 * loses highs off-axis, which needs PF as a function of bearing. The
 * simulation does not model that either (see the note in sim/terrain.ts), so
 * voicing it would be the mix claiming to know something the game does not.
 */
export const BIOME_VOICING: Record<Biome, BiomeVoicing> = {
  [Biome.OpenWater]: {
    cutoffHz: 4000,
    q: 0.7,
    noiseFloor: 0,
    delayS: 0,
    delayFeedback: 0,
    gain: 1,
  },
  // "Masking is audible as masking — you can hear that you cannot hear."
  [Biome.ThermalVein]: {
    cutoffHz: 2600,
    q: 0.8,
    noiseFloor: 0.5,
    delayS: 0,
    delayFeedback: 0,
    gain: 0.72,
  },
  // "Everything sounds close and dead": steep HF absorption, no tail.
  [Biome.KelpForest]: {
    cutoffHz: 900,
    q: 0.5,
    noiseFloor: 0.05,
    delayS: 0,
    delayFeedback: 0,
    gain: 0.8,
  },
  // The acoustic highway: carries fully, and repeats down its length.
  [Biome.AbyssalTrench]: {
    cutoffHz: 5200,
    q: 0.7,
    noiseFloor: 0,
    delayS: 0.26,
    delayFeedback: 0.18,
    gain: 1.12,
  },
  // "Returns from wrong bearings": a comb, from a short delay fed back.
  [Biome.ResonanceField]: {
    cutoffHz: 3200,
    q: 1.4,
    noiseFloor: 0.08,
    delayS: 0.011,
    delayFeedback: 0.55,
    gain: 0.9,
  },
  // Hard shadows: occluded, with strong early reflection.
  [Biome.CoralRuins]: {
    cutoffHz: 1800,
    q: 1.1,
    noiseFloor: 0.03,
    delayS: 0.035,
    delayFeedback: 0.12,
    gain: 0.85,
  },
};

export function voicingFor(biome: Biome): BiomeVoicing {
  return BIOME_VOICING[biome] ?? BIOME_VOICING[Biome.OpenWater];
}
