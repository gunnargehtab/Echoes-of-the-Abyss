/**
 * Tuning constants for the Echo Layer and Depth systems.
 *
 * Values marked SPEC are taken directly from the design docs and should only
 * change when the docs change. Values marked TUNABLE are prototype numbers the
 * docs do not pin down; they exist so the simulation can run and are expected
 * to move during playtesting (see docs/units.md "Playtest plan").
 */

import { Biome, DepthBand, HarvestThrottle } from './types.js';

/** SPEC — docs/systems-depth.md §1. Metres. */
export const DEPTH_BANDS: Record<DepthBand, { min: number; max: number }> = {
  [DepthBand.Shelf]: { min: 0, max: 400 },
  [DepthBand.MidWater]: { min: 400, max: 1800 },
  [DepthBand.Abyssal]: { min: 1800, max: Number.POSITIVE_INFINITY },
};

/**
 * SPEC — docs/systems-echo.md §3. Multiplied into SIG when resolving detection.
 * Below 1.0 masks the emitter; above 1.0 carries them further than open water.
 */
export const PROPAGATION_FACTOR: Record<Biome, number> = {
  [Biome.OpenWater]: 1.0,
  [Biome.ThermalVein]: 0.45,
  [Biome.KelpForest]: 0.55,
  [Biome.AbyssalTrench]: 1.6,
  [Biome.ResonanceField]: 0.7,
  [Biome.CoralRuins]: 0.8,
};

/**
 * SPEC — docs/systems-echo.md §4. A contact resolves to a tier when the
 * perceived loudness reaches this multiple of the listener's threshold.
 */
export const TIER_THRESHOLD_MULTIPLIER = {
  CONTACT: 1.0,
  BEARING: 1.5,
  CLASSIFICATION: 2.5,
  TRACK: 4.0,
} as const;

/** SPEC — docs/systems-echo.md §5. The big red button. */
export const ACTIVE_SONAR = {
  /** Instant Tier-4 resolution inside this radius, in metres. */
  REVEAL_RADIUS_M: 900,
  /** ...and every enemy listener this far away resolves YOU to Tier 4. */
  SELF_REVEAL_RADIUS_M: 2400,
  /** Omnidirectional SIG emitted by the pinger. */
  EMITTER_SIG: 95,
  /** How long the reveal lasts, seconds. */
  REVEAL_DURATION_S: 3,
  /** SIG contribution to fauna aggro is tripled for a ping. */
  FAUNA_AGGRO_MULTIPLIER: 3,
  /** Offensive incentive so the button is worth pressing. */
  ALLY_ACCURACY_BONUS: 0.2,
} as const;

/** SPEC — docs/systems-echo.md §6. */
export const SILENT_RUNNING = {
  /** Movement speed multiplier while silent (-45%). */
  SPEED_MULTIPLIER: 0.55,
  /** Pelagia pay only -20%. See docs/factions.md. */
  PELAGIA_SPEED_MULTIPLIER: 0.8,
  SIG_MIN: 3,
  SIG_MAX: 8,
  /** Breaking silence to fire is the loudest moment of an ambush. */
  BREAK_SILENCE_SIG_SPIKE: 40,
  BREAK_SILENCE_DURATION_S: 2,
} as const;

/** SPEC — docs/systems-echo.md §4 and §7. Seconds. */
export const PERSISTENCE = {
  /** Tier 1-2 contacts linger as ghost markers, then fade. */
  GHOST_MARKER_DECAY_S: 20,
  /** Echo Marks: acoustic residue left on the terrain layer. */
  BATTLE_SITE_S: 90,
  DESTROYED_STRUCTURE_S: 180,
  /** Minimum HYD required to read Echo Marks at all. */
  ECHO_MARK_MIN_HYD: 40,
} as const;

/**
 * TUNABLE — the propagation model itself.
 *
 * docs/systems-echo.md gives the detection *relationship*
 * (`SIG x PF >= Threshold(distance, HYD)`) and the tier multipliers, but never
 * defines Threshold(). This is our prototype implementation of it; see echo.ts
 * for the formula.
 */
const REFERENCE_DISTANCE_M = 100;
const ATTENUATION_EXPONENT = 1.6;
const BASELINE_HYD = 50;

/**
 * The model's single free parameter — the perceived loudness a baseline
 * listener needs to register Tier 1.
 *
 * Rather than picking a number and hoping, it is *derived* from a figure the
 * design docs do pin down: active sonar reveals the pinger at Tier 4 to
 * listeners exactly 2,400 m away (docs/systems-echo.md §5). Solving the
 * propagation formula for that case fixes the threshold and makes the spec'd
 * ping radii fall out of the general model instead of being special-cased.
 *
 * Consequence: changing REFERENCE_DISTANCE_M or ATTENUATION_EXPONENT
 * automatically recalibrates the whole detection curve to keep the ping honest.
 */
const BASE_THRESHOLD =
  (ACTIVE_SONAR.EMITTER_SIG *
    Math.pow(REFERENCE_DISTANCE_M / ACTIVE_SONAR.SELF_REVEAL_RADIUS_M, ATTENUATION_EXPONENT)) /
  TIER_THRESHOLD_MULTIPLIER.TRACK;

export const PROPAGATION_MODEL = {
  /** Distance at which SIG is taken at face value, metres. */
  REFERENCE_DISTANCE_M,
  /** Attenuation exponent. 2.0 is inverse-square; water carries sound better. */
  ATTENUATION_EXPONENT,
  /** Derived — see above. */
  BASE_THRESHOLD,
  /** HYD at which BASE_THRESHOLD applies; higher HYD lowers the threshold. */
  BASELINE_HYD,
  /** Ceiling used to size broadphase queries conservatively. */
  MAX_EXPECTED_HYD: 90,
} as const;

/** SPEC — docs/tech-stack.md "Echo Layer Implementation Notes". */
export const SIM = {
  /** Fixed simulation step. */
  TICK_HZ: 60,
  /** The Echo Layer runs far slower than the sim; detection is not per-frame. */
  ECHO_HZ: 5,
  /** Hard budget for a full detection pass, milliseconds. */
  ECHO_BUDGET_MS: 2,
  /** Spatial hash cell size, metres. TUNABLE. */
  SPATIAL_CELL_M: 600,
} as const;

/** TUNABLE — Tier 2 reports position blurred by this fraction. SPEC says 15%. */
export const BEARING_BLUR_FRACTION = 0.15;

/**
 * The classic RTS economic loop: node -> mine (loudly) -> haul home -> deposit.
 * All TUNABLE except where noted; the *shape* — that income is a continuous
 * noise source — is SPEC (docs/economy.md §1).
 */
export const ECONOMY = {
  /** Nodules each player holds at match start. */
  STARTING_NODULES: 600,
  /** Nodules a harvester can carry per trip. */
  CARGO_CAPACITY_NODULES: 50,
  /** Fill rate at Standard throttle, nodules per second on the node. */
  MINING_RATE_PER_S: 10,
  /** Close enough to a node to mine it, metres. */
  MINING_RANGE_M: 80,
  /** Extra reach beyond a depot structure's footprint to dock and deposit. */
  DEPOSIT_RANGE_M: 60,
  /** Nodules in a field at match start. */
  NODE_STARTING_AMOUNT: 3000,
} as const;

/**
 * SPEC — docs/economy.md §3, the noise curve: yield and SIG are tied by rate,
 * and a harvester that works slower is quieter. SIG values are the mid-points
 * of the doc's bands.
 */
export const HARVEST_THROTTLE: Record<HarvestThrottle, { yieldMultiplier: number; sig: number }> = {
  [HarvestThrottle.Idle]: { yieldMultiplier: 0, sig: 12 },
  [HarvestThrottle.Trickle]: { yieldMultiplier: 0.4, sig: 25 },
  [HarvestThrottle.Standard]: { yieldMultiplier: 1.0, sig: 45 },
  [HarvestThrottle.Overburden]: { yieldMultiplier: 1.4, sig: 68 },
};

/** Base building. Construction is loud — SPEC in kind (docs/systems-echo.md §2), TUNABLE in number. */
export const CONSTRUCTION = {
  /** Sustained SIG at the site while a structure is being commissioned. */
  SITE_SIG: 70,
  /** New structures must rise within this range of an existing own structure. */
  BUILD_RADIUS_M: 1200,
  /** Fraction of max HP a structure has the moment the site is placed. */
  INITIAL_HP_FRACTION: 0.1,
} as const;

/**
 * Faction signature structure auras (docs/units.md, faction structures).
 * Each is an argument about sound or depth: the Barge bends propagation, the
 * Cantor sharpens ears, the Spire rents out depth. All apply to completed,
 * allied structures only — a construction site projects nothing.
 */
export const STRUCTURE_AURAS = {
  /** SPEC — Baffle Barge: allied units inside emit through PF × this. */
  BAFFLE_BARGE: {
    RADIUS_M: 400,
    PF_FACTOR: 0.6,
  },
  /** SPEC — Cantor: allied units inside listen at HYD + bonus, capped. */
  CANTOR: {
    RADIUS_M: 1200,
    HYD_BONUS: 25,
    HYD_CAP: 95,
  },
  /** SPEC — Sounding Spire: allied units inside operate at PR + 1. */
  SOUNDING_SPIRE: {
    RADIUS_M: 600,
    PR_BONUS: 1,
  },
  /**
   * SPEC — Spore Veil (docs/systems-echo.md §8): SYMMETRIC, unlike the other
   * three — everything inside, friend or foe, emits at SIG_FACTOR and
   * listens at BLIND_HYD. It hides them from you and you from them.
   */
  SPORE_VEIL: {
    /** TUNABLE — the cloud's reach; the doc pins the effect, not the size. */
    RADIUS_M: 350,
    SIG_FACTOR: 0.4,
    /** Hydrophone-blind: threshold 10× baseline; deaf past point blank. */
    BLIND_HYD: 5,
  },
} as const;
