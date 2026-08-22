/**
 * The Echo Layer — acoustic detection math.
 *
 * This module is deliberately pure and dependency-free: the server runs it to
 * decide what each player is allowed to know, and the client runs the *same*
 * functions for previews it is entitled to compute about itself (its own SIG
 * meter, its own detection rings, the ping-cost overlay). The client never
 * uses it to resolve enemies — it has no enemy data to resolve.
 *
 * See docs/systems-echo.md.
 */

import {
  PROPAGATION_MODEL,
  TIER_THRESHOLD_MULTIPLIER,
  BEARING_BLUR_FRACTION,
  DEPTH_BANDS,
} from './constants.js';
import { ResolutionTier, DepthBand } from './types.js';

const { REFERENCE_DISTANCE_M, ATTENUATION_EXPONENT, BASE_THRESHOLD, BASELINE_HYD } =
  PROPAGATION_MODEL;

/**
 * How loud an emitter of `sig` reads at `distanceM`, through terrain of
 * propagation factor `pf`.
 *
 * Inside the reference distance sound does not attenuate further — this both
 * matches intuition (point blank is point blank) and avoids a singularity at
 * distance 0.
 */
export function perceivedLoudness(sig: number, pf: number, distanceM: number): number {
  const d = Math.max(distanceM, REFERENCE_DISTANCE_M);
  return sig * pf * Math.pow(REFERENCE_DISTANCE_M / d, ATTENUATION_EXPONENT);
}

/**
 * The minimum perceived loudness a listener registers at all.
 * Higher HYD means a lower threshold, i.e. sharper ears.
 */
export function detectionThreshold(hyd: number): number {
  return BASE_THRESHOLD * (BASELINE_HYD / Math.max(hyd, 1));
}

/**
 * Ratio of perceived loudness to the listener's threshold.
 * 1.0 is exactly detectable; the tier table keys off multiples of this.
 */
export function detectionRatio(sig: number, pf: number, distanceM: number, hyd: number): number {
  return perceivedLoudness(sig, pf, distanceM) / detectionThreshold(hyd);
}

/**
 * The tier a detection ratio resolves to — the §4 table, keyed off multiples
 * of the listener's threshold. Split out so a caller that already has the
 * ratio (the Echo Layer computes it incrementally per pair) need not pay the
 * propagation pow twice.
 */
export function tierFromRatio(ratio: number): ResolutionTier {
  if (ratio >= TIER_THRESHOLD_MULTIPLIER.TRACK) return ResolutionTier.Track;
  if (ratio >= TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION) return ResolutionTier.Classification;
  if (ratio >= TIER_THRESHOLD_MULTIPLIER.BEARING) return ResolutionTier.Bearing;
  if (ratio >= TIER_THRESHOLD_MULTIPLIER.CONTACT) return ResolutionTier.Contact;
  return ResolutionTier.Silent;
}

/**
 * Resolve what a listener learns about an emitter. The core of the game.
 * Returns ResolutionTier.Silent when the emitter is below threshold.
 */
export function resolveTier(
  sig: number,
  pf: number,
  distanceM: number,
  hyd: number
): ResolutionTier {
  return tierFromRatio(detectionRatio(sig, pf, distanceM, hyd));
}

/**
 * Inverse of the propagation model: the furthest distance at which `sig` is
 * still detectable by a listener of `hyd`.
 *
 * The Echo Layer uses this to size its spatial-hash queries — an emitter only
 * needs to consider listeners inside this radius, which is what keeps the
 * detection pass off an O(n^2) all-pairs comparison.
 */
export function maxAudibleRangeM(sig: number, pf: number, hyd: number): number {
  const numerator = hyd * sig * pf;
  const denominator = BASE_THRESHOLD * BASELINE_HYD;
  if (numerator <= 0) return 0;
  const ratioAtReference = numerator / denominator;
  if (ratioAtReference <= 1) {
    // Inaudible even at the reference distance.
    return ratioAtReference <= 0 ? 0 : REFERENCE_DISTANCE_M;
  }
  return REFERENCE_DISTANCE_M * Math.pow(ratioAtReference, 1 / ATTENUATION_EXPONENT);
}

/**
 * Deterministic per-entity jitter in [-1, 1].
 *
 * Tier 2 reports a blurred position, but the blur must be *stable* — a blob
 * that jitters every tick reads as noise rather than as uncertainty, and would
 * also let a client average successive frames to recover the true position.
 */
function stableJitter(seed: number, salt: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ salt, 0xc2b2ae35);
  h ^= h >>> 16;
  // Map to [-1, 1].
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/**
 * Blur a true position into what a Tier-2 listener is told: the right
 * direction and roughly the right distance, wrong by ~15%.
 */
export function blurBearing(
  x: number,
  y: number,
  listenerX: number,
  listenerY: number,
  seed: number
): { x: number; y: number } {
  const dx = x - listenerX;
  const dy = y - listenerY;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x, y };
  const error = distance * BEARING_BLUR_FRACTION;
  return {
    x: x + stableJitter(seed, 1) * error,
    y: y + stableJitter(seed, 2) * error,
  };
}

/** Which vertical band a depth falls in. docs/systems-depth.md §1. */
export function depthBandFor(depthM: number): DepthBand {
  if (depthM < DEPTH_BANDS[DepthBand.Shelf].max) return DepthBand.Shelf;
  if (depthM < DEPTH_BANDS[DepthBand.MidWater].max) return DepthBand.MidWater;
  return DepthBand.Abyssal;
}

/**
 * Effective pressure rating required to operate at a depth.
 * PR-1 covers the Shelf, PR-2 Mid-Water, PR-3 the Abyssal.
 */
export function requiredPressureRating(depthM: number): number {
  return depthBandFor(depthM) + 1;
}

/**
 * Unhealable crush attrition per second for a unit below its Pressure Rating.
 * Zero when the unit is rated for the depth it is at. docs/systems-depth.md §2.
 *
 * TUNABLE: the docs establish that attrition exists and ignores repair, but not
 * its magnitude.
 */
export function crushAttritionPerSecond(pressureRating: number, depthM: number): number {
  const deficit = requiredPressureRating(depthM) - pressureRating;
  if (deficit <= 0) return 0;
  // Each full band of overreach hurts disproportionately more.
  return 4 * deficit * deficit;
}
