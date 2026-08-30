/**
 * The live half of gate 3 — docs/graphics-standards.md, docs/three-layer-ocean.md §8.
 *
 * A model's resting light budget is approved at intake against its SIG band;
 * at runtime the lamps swing around that resting strength with the hull's
 * *live* SIG, along the spec curve's own exponent. Pure math, kept apart from
 * the model loader so node:test can hold it without a bundler in the room.
 */

/**
 * SPEC — docs/graphics-standards.md gate 3. The e-folding of the glow energy
 * curve E(SIG) = 0.45·e^(SIG/14); a ratio of two points on the curve needs
 * only the exponent, so the 0.45 cancels. The offline bake
 * (tools/hull-maps/build.mjs) transcribes the same doc.
 */
export const SIG_GLOW_EFOLD = 14;

/** TUNABLE — how far live SIG may swing a lamp from its approved resting
 * strength. The floor keeps navigation marks from vanishing entirely; the
 * ceiling keeps a ping flare from white-clipping the whole hull. */
export const GLOW_FACTOR_MIN = 0.05;
export const GLOW_FACTOR_MAX = 6;

/** The multiplier on a lamp's resting intensity for a hull's live SIG. */
export function glowFactor(liveSig: number, restSig: number): number {
  return Math.min(
    GLOW_FACTOR_MAX,
    Math.max(GLOW_FACTOR_MIN, Math.exp((liveSig - restSig) / SIG_GLOW_EFOLD))
  );
}
