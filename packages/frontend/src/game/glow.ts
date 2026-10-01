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

/**
 * Gate 3's lamp core: the resting intensity at which a lamp's brightest
 * channel rests at most at white (1.0), the most the 8-bit canvas shows.
 *
 * An export that rests past white would otherwise clip channel by channel,
 * the red of an amber ink first, and draw a different hue (#1021: the
 * Consortium scout's #F2B233 drew yellow, and lamps far past white drew white
 * in every state, so a quieted hull never dimmed). Held at white along its ink
 * instead, its live states are still rest × `glowFactor`, so a quiet lamp dims
 * by the curve's own ratio. A lamp resting under white keeps its intensity
 * exactly. `peak` is the brightest channel of the recoloured emissive colour.
 */
export function lampCoreRest(peak: number, intensity: number): number {
  return peak * intensity > 1 ? 1 / peak : intensity;
}
