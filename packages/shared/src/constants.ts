/**
 * Tuning constants for the Echo Layer and Depth systems.
 *
 * Values marked SPEC are taken directly from the design docs and should only
 * change when the docs change. Values marked TUNABLE are prototype numbers the
 * docs do not pin down; they exist so the simulation can run and are expected
 * to move during playtesting (see docs/units.md "Playtest plan").
 */

import { Biome, DepthBand, HarvestThrottle, ResourceKind } from './types.js';

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
 * Derived — the loudest water on the map. The Echo Layer's broadphase must
 * bound the audible range of a path it has not walked yet, and the only safe
 * bound is "the whole path is trench". Derived so a new biome cannot
 * silently break the bound.
 */
export const MAX_PROPAGATION_FACTOR = Math.max(...Object.values(PROPAGATION_FACTOR));

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

/**
 * Depth as an ordered state. docs/systems-depth.md §2.
 *
 * The *asymmetry* is SPEC and load-bearing — "descent is fast and deafening,
 * ascent is slow and silent" — because it is what makes depth the axis of
 * commitment (§5): a raid that goes deep arrives announced and cannot leave in
 * a hurry. The numbers realising it are TUNABLE; the doc pins the shape only.
 *
 * DESCENT_SIG is a *floor* rather than a replacement value: blowing ballast is
 * the loudest thing a hull does short of an active ping, and it must never
 * make a unit that was already louder somehow quieter. It sits above every
 * cruise SIG in the roster (loudest: Cruiser, 65) and below the ping's 95.
 */
export const DEPTH = {
  /** Metres per second while diving. */
  DESCENT_RATE_MPS: 45,
  /** Metres per second while rising — deliberately a third of the descent. */
  ASCENT_RATE_MPS: 15,
  /** Sustained SIG floor while descending. Ascent adds nothing at all. */
  DESCENT_SIG: 72,
  /** Close enough to the ordered depth to count as arrived, metres. */
  ARRIVAL_EPSILON_M: 2,
  /** Shallowest orderable depth: the surface. */
  MIN_M: 0,
  /**
   * Deepest orderable depth — the map floor. TUNABLE, and temporary: it
   * belongs to the map rather than to the ruleset, and moves into map data
   * when authored maps land (see docs/ROADMAP.md, Phase 3).
   */
  MAX_M: 3000,
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

/**
 * TUNABLE — how loud a piece of acoustic residue is, and how it merges.
 *
 * Echo Marks are priced through the same propagation model as everything else
 * (docs/systems-echo.md §7): a mark is an emitter whose SIG is its intensity
 * times the figure below, so a mark in a Thermal Vein is as hard to find as a
 * unit in one. Anything else would make residue a second, parallel detection
 * system that biomes did not apply to.
 *
 * The SIG figures are low on purpose, and the rule behind them is that
 * **residue is always quieter than the thing that made it**. An idle Corvette
 * is audible to a Light Scout at roughly 3.3 km; the echo of a destroyed
 * building reaches about 2.5 km, and a battle site under 2 km. A mark must be
 * findable by a scout that *goes there* and invisible to one that does not —
 * the doc calls this "the scouting economy", and it stops being one if the map
 * announces every fight to every base.
 *
 * The first draft had these at 32/46, which made the echo of a fight carry
 * further than the ships that fought it. That is not faint residue; that is a
 * second, louder detection system.
 */
export const ECHO_MARKS = {
  /** SIG a fresh battle site radiates at full intensity. ~1.9 km to HYD 70. */
  BATTLE_SIG: 12,
  /** A destroyed structure: bigger event, longer memory, ~2.5 km. */
  DESTROYED_STRUCTURE_SIG: 18,
  /**
   * Ceiling for the industrial hum.
   *
   * docs/economy.md §5 wants a listener to "estimate income within roughly
   * ±20% without ever seeing a structure", so the hum has to be loud enough to
   * find and its intensity has to mean something. It is capped below a
   * destroyed structure because an economy is a state, not an event.
   */
  HUM_SIG: 14,
  /**
   * Intensity one delivered cargo adds to the hum, as a fraction of full.
   *
   * Throughput, not existence: a refinery nobody hauls to is quiet, and
   * throttling to Trickle collapses the hum within seconds because the
   * deposits stop arriving. That is the counter-play docs/economy.md §5
   * promises, and it falls out of hooking this to the deposit rather than to
   * the building.
   */
  HUM_PER_DELIVERY: 0.12,
  /** Seconds for an unreinforced hum to fade from full to nothing. */
  HUM_DECAY_S: 45,
  /**
   * Marks of one kind within this radius reinforce rather than accumulate.
   *
   * Without it a long fight leaves hundreds of overlapping marks and the
   * residue layer becomes both a performance problem and an unreadable smear.
   */
  MERGE_RADIUS_M: 320,
  /** Hard cap on live marks, so a pathological match cannot unbound the pass. */
  MAX_MARKS: 256,
} as const;

/**
 * Environmental hazards — docs/hazards.md §1 and §5.
 *
 * TUNABLE throughout: the doc specifies behaviour and faction interactions,
 * not numbers. The one figure that is a *design* constraint rather than a
 * tuning knob is the warning duration, and it is long on purpose — `CLAUDE.md`
 * makes the target emotion dread rather than confusion, and a hazard the
 * player cannot walk out of is confusion.
 */
export const HAZARDS = {
  ERUPTION: {
    /** Quiet between eruptions. */
    DORMANT_S: 55,
    /**
     * Telegraph.
     *
     * Sized against the *slowest* hull in the roster clearing the *largest*
     * authored plume: a Harvester at 40 m/s needs 17.5 s to cross 700 m from
     * the centre. The first draft was 9 s, which meant a Harvester parked on a
     * vent could not escape however early it started — a warning nobody can
     * act on is not a warning, and `CLAUDE.md` calls that confusion rather
     * than dread. There is a test that keeps this honest.
     */
    WARNING_S: 20,
    /** Erupting. */
    ACTIVE_S: 4,
    /** Subsiding: damage tapers rather than stopping dead. */
    DECAY_S: 5,
    /** Hull damage per second at the centre, falling off to the rim. */
    DAMAGE_PER_S: 90,
    /** Structures "take reduced damage (but still vulnerable)" — doc §1. */
    STRUCTURE_DAMAGE_MULTIPLIER: 0.35,
    /** Metres per second a caught hull is pushed outward. */
    KNOCKBACK_MPS: 110,
    /**
     * SIG added to a hull caught in the plume.
     *
     * The reason an eruption is an *acoustic* event and not just damage: a
     * unit battered by a vent rings like a struck bell, and the whole map can
     * hear it. Being hurt and being found are the same moment.
     */
    CAUGHT_SIG: 55,
    /** Pelagia "suffers extra damage (organic hulls)" — doc §1. */
    PELAGIA_DAMAGE_MULTIPLIER: 1.5,
    /** Directorate "units resist knockback" — doc §1. */
    DIRECTORATE_KNOCKBACK_MULTIPLIER: 0.25,
    /** Hadron "can predict eruptions via resonance sensors" — doc §1. */
    HADRON_WARNING_BONUS_S: 6,
    /** Bathyarch "can stabilize vents for energy boosts" — doc §1. */
    BATHYARCH_STABILISE_S: 30,
    BATHYARCH_ENERGY_PER_S: 1.5,
  },
  STORM: {
    DORMANT_S: 100,
    WARNING_S: 12,
    ACTIVE_S: 30,
    DECAY_S: 8,
    /**
     * What the storm multiplies PropagationFactor by inside its area.
     *
     * Below 1, so sound scatters and resolution collapses: the storm is an
     * attack on *information*, not on hulls, which is what makes it a
     * different shape of hazard from an eruption. It reaches the Echo Layer as
     * a write to the per-cell PF array rather than as a new code path, so
     * biome and storm compose for free.
     */
    PF_MULTIPLIER: 0.35,
    /** Light damage from "random sonic shockwaves" — doc §5. */
    DAMAGE_PER_S: 12,
    STRUCTURE_DAMAGE_MULTIPLIER: 0.35,
    /** Hadron Knights "gain temporary buffs" — doc §5. Added HYD. */
    HADRON_HYD_BONUS: 25,
    /** Pelagia "organic tech becomes unstable" — doc §5. Added SIG. */
    PELAGIA_SIG_PENALTY: 20,
    /** Bathyarch "machinery malfunctions" — doc §5. Speed multiplier. */
    BATHYARCH_SPEED_MULTIPLIER: 0.7,
  },
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

/**
 * Keeping hulls out of each other's water.
 *
 * TUNABLE throughout — the docs never specify collision, and they would not,
 * because this is not a mechanic. What it protects *is* spec'd, though: a
 * stack of hulls at one coordinate is one acoustic position, which would let
 * the renderer and the Echo Layer disagree with each other about how large a
 * force is (docs/systems-echo.md §4).
 */
export const SEPARATION = {
  /**
   * Fraction of an overlap resolved per tick. Below 1 so a crowd settles
   * instead of oscillating; high enough that a fleet spreads within a second.
   */
  STIFFNESS: 0.45,
  /** Closer than this counts as exactly stacked, with no axis to push along. */
  COINCIDENT_EPSILON_M: 0.01,
  /** Spatial-hash cell for the separation query. A few hull lengths. */
  CELL_M: 200,
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
 * Per-resource extraction character. docs/economy.md §2 and §7.
 *
 * The crystal's whole argument is depth: it is worth having only because
 * reaching it costs a commitment. So it is slower to cut, louder to cut, and
 * lives in water that bills you for standing in it — SPEC in shape, TUNABLE in
 * number.
 *
 * `miningSigPremium` is added to whatever the throttle is already emitting
 * (§3), which lands Standard-throttle crystal work at 65 SIG — the middle of
 * the doc's 60-70 band — while keeping the throttle a live decision surface
 * rather than something the resource overrides.
 */
export const RESOURCE: Record<
  ResourceKind,
  { name: string; miningSigPremium: number; rateMultiplier: number }
> = {
  [ResourceKind.Nodule]: { name: 'Nodule', miningSigPremium: 0, rateMultiplier: 1 },
  [ResourceKind.ResonanceCrystal]: {
    name: 'Resonance Crystal',
    miningSigPremium: 20,
    rateMultiplier: 0.45,
  },
};

/**
 * The Abyssal crystal economy. docs/economy.md §7 — "a round trip with a clock
 * on it", run as raids rather than expansions by everyone but the Directorate.
 */
export const CRYSTAL = {
  /** Working depth of a crystal field. Abyssal band, so PR-3 or crush. */
  FIELD_DEPTH_M: 2400,
  /** Units in a crystal field at match start. Scarcity is the match clock. */
  FIELD_STARTING_AMOUNT: 900,
  /** A hold carries less crystal than nodules — it is dense, awkward cargo. */
  CARGO_CAPACITY: 20,
  /** Crystal nodes ignore the depth check within this tolerance, metres. */
  WORKING_DEPTH_TOLERANCE_M: 60,
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
