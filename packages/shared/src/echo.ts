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
  DIRECTIONAL_CONE_COS,
  DIRECTIONAL_SIGNATURE,
  DIRECTIONAL_WAKE_COS,
  PROPAGATION_MODEL,
  TIER_THRESHOLD_MULTIPLIER,
  BEARING_BLUR_FRACTION,
  DEPTH_BANDS,
  THERMOCLINE_DUCT_TOP_M,
  THERMOCLINE_DUCT_BOTTOM_M,
  THERMOCLINE_PAIR_FACTOR,
  DIRECTORATE_SHALLOW,
  DIRECTORATE_SHALLOW_BLEED_PER_S,
  LID,
  SCATTER,
  SIM,
} from './constants.js';
import { ResolutionTier, DepthBand, Faction, ThermoclineZone } from './types.js';

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

/**
 * One round of a 32-bit integer mix.
 *
 * The same multiply-xorshift shape as `stableJitter` above, written as a
 * chain so that any number of small integers can be folded into one hash.
 * Explicit `Math.imul` / `>>> 0` throughout, for the reason sim/rng.ts gives:
 * this has to be *identical everywhere*, and the engine's number tower is not
 * a party to that promise.
 */
function mix(h: number, v: number): number {
  h = Math.imul((h ^ v) >>> 0, 0x85ebca6b);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Deterministic hash of a seed and three integers onto [0, 1).
 *
 * The Echo Layer's source of "randomness" for everything scattered water
 * does, in place of `world.rng`. Two reasons it is a hash and not a draw:
 * a replay must agree with the match it records, and the number of contacts
 * resolved in a pass varies with the match — a stream advanced once per
 * contact would move every later die roll in the simulation by however many
 * hulls happened to be audible. Hashing the inputs costs nothing anyone
 * else can notice.
 */
export function stableUnit(seed: number, key: number, salt: number, step: number): number {
  let h = mix((seed >>> 0) ^ 0x9e3779b9, key | 0);
  h = mix(h, salt | 0);
  h = mix(h, step | 0);
  return h / 4294967296;
}

/** The two channels a scattered contact lies on. Salts into `stableUnit`. */
const SCATTER_SALT_BEARING = 1;
const SCATTER_SALT_RANGE = 2;
/** The `step` reserved for the half of the lie that never moves. */
const SCATTER_STANDING_STEP = -1;

/**
 * The lie one observer is told about one emitter at one tick, in [-1, 1].
 *
 * Half of it stands for the whole match, per pair, and half of it drifts —
 * value noise on a lattice `periodTicks` apart, eased between lattice points
 * so the reported bearing slides rather than jumps. Neither half alone is a
 * wall: a standing offset can be solved from two Echo ticks of a moving
 * listener, and pure drift averages back to the truth given a long enough
 * watch. Summed, the long-run mean is the standing half, which is itself a
 * lie, and no run of samples from one listener recovers the truth. Two
 * listeners on a cross bearing do — the "two ears" rule in
 * docs/systems-echo.md §3 — and that lives in the Echo pass, which is the
 * only place that knows how many ears a slot has on an emitter.
 *
 * `key` is the pair — the observer folded with the emitter's *match-local*
 * id, never its entity id, for the reason the Tier-2 blur learned the hard
 * way (echoLayer.ts): entity ids are process-global and a replay would lie
 * somewhere else.
 */
export function scatterLie(
  seed: number,
  key: number,
  salt: number,
  tick: number,
  periodTicks: number
): number {
  const standing = stableUnit(seed, key, salt, SCATTER_STANDING_STEP) * 2 - 1;
  const lattice = Math.floor(tick / periodTicks);
  const u = (tick - lattice * periodTicks) / periodTicks;
  const a = stableUnit(seed, key, salt, lattice) * 2 - 1;
  const b = stableUnit(seed, key, salt, lattice + 1) * 2 - 1;
  // Smoothstep: continuous in value and in slope across a lattice point, so
  // there is no tick on which the contact visibly changes its mind.
  const eased = u * u * (3 - 2 * u);
  const drift = a + (b - a) * eased;
  return SCATTER.STANDING_FRACTION * standing + (1 - SCATTER.STANDING_FRACTION) * drift;
}

/**
 * Where a listener in scattered water is told a contact is —
 * docs/systems-echo.md §3 "Scattered water".
 *
 * Takes the position the pass would otherwise have reported (the truth at
 * Tier 3+, the blurred ghost at Tier 2) and the listener that resolved it,
 * and returns that point rotated about the listener by up to
 * `SCATTER.MAX_BEARING_ERROR_RAD` and pushed outward by up to
 * `SCATTER.MAX_RANGE_STRETCH` — never inward. Both scale with `fraction`, the
 * share of the listener-to-emitter path that crossed scattered cells, so
 * open water (fraction 0) returns the input untouched and a path that is all
 * crystal lies by the full figure.
 *
 * Pure, so the client can run it for a preview it is entitled to — how far
 * its *own* contact picture can be trusted in the water it is standing in —
 * without ever being handed an enemy position to run it on.
 */
export function scatterContact(
  x: number,
  y: number,
  listenerX: number,
  listenerY: number,
  fraction: number,
  seed: number,
  observer: number,
  emitterKey: number,
  tick: number
): { x: number; y: number } {
  if (fraction <= 0) return { x, y };
  const dx = x - listenerX;
  const dy = y - listenerY;
  const range = Math.hypot(dx, dy);
  if (range === 0) return { x, y };

  const f = fraction > 1 ? 1 : fraction;
  const key = mix(observer | 0, emitterKey | 0);
  const periodTicks = SCATTER.DRIFT_PERIOD_S * SIM.TICK_HZ;
  const bearing =
    Math.atan2(dy, dx) +
    SCATTER.MAX_BEARING_ERROR_RAD *
      f *
      scatterLie(seed, key, SCATTER_SALT_BEARING, tick, periodTicks);
  // [-1, 1] folded onto [0, 1]: the stretch is outward only.
  const stretch =
    SCATTER.MAX_RANGE_STRETCH *
    f *
    (0.5 + 0.5 * scatterLie(seed, key, SCATTER_SALT_RANGE, tick, periodTicks));
  const reported = range * (1 + stretch);
  return {
    x: listenerX + Math.cos(bearing) * reported,
    y: listenerY + Math.sin(bearing) * reported,
  };
}

/**
 * Relative slack on the sector compares, in units of the cosine.
 *
 * Twelve orders of magnitude below the boundary values, so it can only ever
 * decide a case that is already exactly on a boundary — about a nanoradian's
 * worth of angle, which no hull position can meaningfully occupy on purpose.
 */
const SECTOR_EDGE_EPSILON = 1e-12;

/**
 * The directional term for a pair whose emitter has a bow — docs/systems-echo.md §8.
 *
 * Takes the dot product of the emitter's unit bow vector with the vector *from*
 * the emitter *to* the listener, and that vector's length. Phrased this way
 * rather than as an angle because the Echo pass has both numbers already and an
 * `acos` per pair is exactly the cost §8 promises this does not have: the
 * comparison `dot ≥ cos(45°) · distance` decides the sector with one multiply
 * and one compare, no divide and no trigonometry.
 *
 * A listener at the emitter's own position reads `dot = 0` against a boundary
 * of `0`, so it lands in the cone. That is the right answer for the degenerate
 * case — point blank is point blank — and it falls out rather than needing a
 * branch.
 *
 * **This is the emitter's term.** See `DIRECTIONAL_SIGNATURE` for why it must
 * never be applied symmetrically the way `thermoclineFactor` is.
 */
export function directionalSectorFactor(bowDotToListener: number, distanceM: number): number {
  // The slack is not a fudge — it is what makes §8's boundaries mean what §8
  // says they mean. "Within 45° either side" is inclusive, and a listener at
  // exactly 45° gives `dot = 100` against `cos(45°) x distance =
  // 100.00000000000001`: the sector the document puts in the cone lands one
  // unit in the last place outside it. Scaled by distance so it stays the same
  // *angle* at every range rather than a widening wedge near the emitter.
  const slack = SECTOR_EDGE_EPSILON * distanceM;
  if (bowDotToListener >= DIRECTIONAL_CONE_COS * distanceM - slack) {
    return DIRECTIONAL_SIGNATURE.CONE;
  }
  if (bowDotToListener <= DIRECTIONAL_WAKE_COS * distanceM + slack) {
    return DIRECTIONAL_SIGNATURE.WAKE;
  }
  return DIRECTIONAL_SIGNATURE.FLANK;
}

/**
 * The same term, for callers that hold two positions and a heading rather than
 * a precomputed bow — the detection sites outside the Echo pass's hot loop.
 *
 * `headingRad` is the emitter's bow, measured the way every other bearing in
 * this simulation is: `atan2(y, x)`, +x is 0.
 */
export function directionalFactor(
  headingRad: number,
  emitterX: number,
  emitterY: number,
  listenerX: number,
  listenerY: number
): number {
  const vx = listenerX - emitterX;
  const vy = listenerY - emitterY;
  return directionalSectorFactor(
    Math.cos(headingRad) * vx + Math.sin(headingRad) * vy,
    Math.hypot(vx, vy)
  );
}

/** Which vertical band a depth falls in. docs/systems-depth.md §1. */
export function depthBandFor(depthM: number): DepthBand {
  if (depthM < DEPTH_BANDS[DepthBand.Shelf].max) return DepthBand.Shelf;
  if (depthM < DEPTH_BANDS[DepthBand.MidWater].max) return DepthBand.MidWater;
  return DepthBand.Abyssal;
}

/** Which side of the thermocline a depth sits on. docs/systems-echo.md §3. */
export function thermoclineZone(depthM: number): ThermoclineZone {
  if (depthM < THERMOCLINE_DUCT_TOP_M) return ThermoclineZone.Above;
  if (depthM > THERMOCLINE_DUCT_BOTTOM_M) return ThermoclineZone.Below;
  return ThermoclineZone.Duct;
}

/**
 * PropagationFactor multiplier for a path between two depths — the thermocline
 * row of docs/systems-echo.md §3, which is the one row that is not a biome.
 *
 * Symmetric, because a path is a property of the pair: the layer hides them
 * from you exactly as much as it hides you from them. Two float compares per
 * call and no per-sample work, which is why the layer can exist at all inside
 * the Echo pass's budget.
 */
export function thermoclineFactor(depthA: number, depthB: number): number {
  return THERMOCLINE_PAIR_FACTOR[thermoclineZone(depthA) * 3 + thermoclineZone(depthB)]!;
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

/**
 * True while a hull is in water the Abyssal Directorate cannot tolerate: the
 * Shelf — above DEPTH_BANDS' 400 m line (docs/factions.md, docs/systems-depth.md §3).
 *
 * Expressed as a band test rather than a depth compare on purpose. The
 * Directorate's weakness and the Shelf are the same fact stated twice, so they
 * should move together; a hard 400 here would let one drift from the other.
 */
export function inDirectorateShallows(faction: Faction, depthM: number): boolean {
  return faction === Faction.Directorate && depthBandFor(depthM) === DepthBand.Shelf;
}

/**
 * Unhealable shallow-water attrition per second for a Directorate hull, in HP.
 * Zero for everyone else, and zero at any depth the Shelf does not cover.
 *
 * Scaled by max hull, because the doc prices this as a *fraction* — 15% of a
 * Cruiser is not 15% of a scout, and a flat DPS would make the penalty a
 * rounding error for the one and lethal for the other.
 *
 * The floor is not applied here: this is a rate, and the caller owns the hp it
 * would take. See `pressureSystem`, which clamps the bite so a hull lands *on*
 * DIRECTORATE_SHALLOW.HULL_FLOOR rather than stepping through it by whatever
 * fraction of a tick was left over.
 */
export function directorateShallowAttritionPerSecond(
  faction: Faction,
  depthM: number,
  maxHp: number
): number {
  if (!inDirectorateShallows(faction, depthM)) return 0;
  return maxHp * DIRECTORATE_SHALLOW_BLEED_PER_S;
}

/**
 * The hull a Directorate unit keeps no matter how long it loiters shallow.
 * Shallow water takes 15% and stops, so it can bleed a fleet but never kill it
 * — the penalty is a cost, not a countdown.
 */
export function directorateShallowHullFloor(maxHp: number): number {
  return maxHp * DIRECTORATE_SHALLOW.HULL_FLOOR;
}

/**
 * True while a hull is inside the Lid — the sour top of the ocean
 * (docs/systems-depth.md §2, docs/world.md). A depth compare rather than a
 * band test, unlike the Directorate's shallows, because the Lid is not a band:
 * it is a world fact with its own boundary, and the Shelf line moving would
 * not move the poison.
 */
export function inLid(depthM: number): boolean {
  return depthM < LID.DEPTH_M;
}

/**
 * Unhealable sour bleed per second once a hull's grace is spent, in HP.
 *
 * Scaled by max hull for the reason the Directorate's bleed is: the doc prices
 * the Lid as a fraction, and a flat DPS would be a rounding error for a
 * Cruiser and a death sentence for a scout. Unlike that bleed it has no floor
 * — the caller lets it run to zero, because sour water is allowed to kill
 * (docs/systems-depth.md §2).
 */
export function lidBleedPerSecond(maxHp: number): number {
  return maxHp * LID.BLEED_FRACTION_PER_S;
}
