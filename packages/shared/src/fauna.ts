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
}

/** SPEC — docs/bestiary.md §4 stat blocks, transcribed. */
export const FAUNA_STATS: Record<FaunaSpecies, FaunaStats> = {
  [FaunaSpecies.Ashgrazer]: {
    species: FaunaSpecies.Ashgrazer,
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
};

export function faunaStatsFor(species: FaunaSpecies): FaunaStats {
  return FAUNA_STATS[species];
}
