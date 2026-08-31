/**
 * The Drift — docs/bestiary.md.
 *
 * Fauna are **listeners and contacts**, not decoration. §2 evaluates them with
 * the same detection maths as units, and §3 makes every creature on the map a
 * false positive waiting to happen: at Tier 1 and Tier 2 there is nothing that
 * distinguishes a grazer from a cruiser. That ambiguity is the point — it is
 * where `CLAUDE.md`'s "dread, not confusion" comes from, because the player
 * can reason about it.
 *
 * The single rule that makes the Drift a *strategic* object rather than
 * wildlife is §2's last line: **fauna attack the loudest thing, not the
 * nearest.** A Consortium column can pull a swarm off a Commune harvester
 * simply by existing nearby, and both players know it.
 *
 * Three species are implemented, one per behaviour class. The rest of the
 * roster is listed in the doc with a status marker.
 */

export enum FaunaSpecies {
  /** Grazer — armoured vent-field herd. Slow, tough, reluctant. */
  Ashgrazer = 0,
  /** Predator — pack that shadows industry and answers a careless economy. */
  Draymaw = 1,
  /** Megafauna — the colossus that answers pings. */
  Sounder = 2,
  /** Scavenger — the swarm drawn to Echo Marks, not live units. */
  Rasp = 3,
}

/**
 * Where a creature is in §2's aggro ladder.
 *
 * Interest and Commit are *perceived loudness* thresholds, so terrain protects
 * you from fauna exactly as it protects you from players — a herd on the far
 * side of a kelp bed does not hear your harvester.
 */
export enum FaunaStage {
  Ambient = 0,
  Interested = 1,
  Committed = 2,
  Cooling = 3,
}

export interface FaunaStats {
  species: FaunaSpecies;
  name: string;
  /** SIG at rest, and while acting. Both SPEC — docs/bestiary.md §4. */
  sigIdle: number;
  sigActive: number;
  hyd: number;
  /** Perceived loudness that starts it paying attention. */
  interest: number;
  /** Perceived loudness that makes it attack. */
  commit: number;
  /** Directorate harvest yield on a kill (docs/economy.md §2). */
  biomass: number;
  maxHp: number;
  speed: number;
  /** Hull damage per second while committed. */
  damagePerS: number;
  attackRangeM: number;
  /** Individuals that spawn together. A herd is many entities, not one. */
  groupSize: number;
  /** Rough body length, for the renderer. */
  lengthM: number;
  /**
   * The depth this species works at, in metres — docs/bestiary.md §4.
   *
   * SPEC in the sense that the *habitat* is: §4's roster names where each
   * animal lives, and this is that sentence as a number. The numbers
   * themselves are TUNABLE.
   */
  workingDepthM: number;
  /**
   * How far above or below its working depth a creature will chase, in metres.
   *
   * A limit on pursuit, not on where it sits. A herd is tied to its feeding
   * ground and barely leaves it; a migratory colossus ranges nearly three
   * times as far. This is what makes depth cover from part of the Drift and
   * exposure to the rest (§4, "Where the Drift lives").
   */
  depthBandM: number;
}

/** SPEC — docs/bestiary.md §4 stat blocks, transcribed. */
export const FAUNA_STATS: Record<FaunaSpecies, FaunaStats> = {
  [FaunaSpecies.Ashgrazer]: {
    species: FaunaSpecies.Ashgrazer,
    // "Thermal Veins" (§4). A herd grazes a fixed vent field and barely
    // leaves it, so the band is the tightest in the roster.
    workingDepthM: 600,
    depthBandM: 250,
    name: 'Ashgrazer',
    sigIdle: 14,
    // A committed herd is a stampede, and a stampede is loud.
    sigActive: 45,
    hyd: 35,
    interest: 30,
    commit: 65,
    biomass: 12,
    maxHp: 220,
    // TUNABLE — "slow, tough and reluctant".
    speed: 22,
    damagePerS: 26,
    attackRangeM: 120,
    groupSize: 8,
    lengthM: 22,
  },
  [FaunaSpecies.Draymaw]: {
    species: FaunaSpecies.Draymaw,
    // "Mid-water, follows industry" (§4) — which puts the nodule fields at
    // 600 m and the thermocline duct both inside its reach, and the crystal
    // at 2,400 m well outside it.
    workingDepthM: 900,
    depthBandM: 400,
    name: 'Draymaw',
    sigIdle: 26,
    sigActive: 40,
    hyd: 65,
    // "Low commit threshold: they are the animal most likely to answer a
    // careless economy." The staple predator, and a soft tax on greed.
    interest: 22,
    commit: 45,
    biomass: 22,
    maxHp: 380,
    speed: 58,
    damagePerS: 34,
    attackRangeM: 160,
    groupSize: 5,
    lengthM: 12,
  },
  [FaunaSpecies.Sounder]: {
    species: FaunaSpecies.Sounder,
    // "Between deep basins" (§4). The band reaches the Resonance Crystal at
    // 2,400 m and up into the thermocline duct: the deep economy has a
    // predator, and it is this one.
    workingDepthM: 2000,
    depthBandM: 700,
    name: 'Sounder',
    sigIdle: 45,
    // "100 calling" — one of the largest sustained emissions on the map.
    sigActive: 100,
    hyd: 90,
    interest: 55,
    commit: 75,
    biomass: 260,
    maxHp: 9000,
    speed: 30,
    // "It destroys structures by transit, ignores small units."
    damagePerS: 220,
    attackRangeM: 260,
    groupSize: 1,
    lengthM: 75,
  },
  [FaunaSpecies.Rasp]: {
    species: FaunaSpecies.Rasp,
    // "No habitat, only the working ocean where things die" (§4). Wrecks are
    // wherever fighting was, so the band is the widest non-megafauna one in
    // the table.
    workingDepthM: 800,
    depthBandM: 500,
    name: 'Rasp',
    // "20 swarm" — the whole swarm is one entity, and this is its resting hum.
    sigIdle: 20,
    // TUNABLE — feeding is "a loud, unmissable Tier-3 announcement", so the
    // active figure sits in harvest-cycle territory (§5's SIG 45-60).
    sigActive: 55,
    hyd: 55,
    interest: 25,
    commit: 40,
    biomass: 18,
    maxHp: 300,
    // TUNABLE — sized with DRIFT.SCAVENGE_RANGE_M so §4's "roughly 40 s after
    // the battle" falls out of distance over speed rather than a timer: a
    // swarm at the edge of its smell covers ~2,000 m at 48 m/s in ~42 s.
    speed: 48,
    damagePerS: 28,
    attackRangeM: 90,
    // "20-40 individuals treated as one entity" — a swarm is one entity, so a
    // group of them is not a thing that exists.
    groupSize: 1,
    // The cloud the renderer draws, not any one fry.
    lengthM: 9,
  },
};

export function faunaStatsFor(species: FaunaSpecies): FaunaStats {
  return FAUNA_STATS[species];
}
