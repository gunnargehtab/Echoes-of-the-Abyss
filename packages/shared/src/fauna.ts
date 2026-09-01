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
 * Which of the roster is simulated is tracked in the doc's Implementation
 * Status table, not here.
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
  /** Ambient — the schooling fry whose scatter is the tell silence cannot buy off. */
  Lampfry = 4,
  /** Ambient — the drifting absorber. Living terrain: a cluster lowers local PF. */
  Tetherjelly = 5,
  /** Predator — the ambusher. A trigger model, not a dwell model. */
  Hollow = 6,
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
  /**
   * How far either side of the working depth a *population* is seeded, in
   * metres — §4's "Seeded across" column, and the other of that table's two
   * independent answers about depth.
   *
   * Zero for every hunter: a pack chases immediately, so where it starts
   * barely matters, and "at depth" is the honest word for it. Non-zero only
   * for the ambient species, whose whole mechanic is being somewhere — their
   * vertical extent is entirely a property of how they are seeded, because
   * they never pursue anything.
   */
  seedSpreadM: number;
}

/** SPEC — docs/bestiary.md §4 stat blocks, transcribed. */
export const FAUNA_STATS: Record<FaunaSpecies, FaunaStats> = {
  [FaunaSpecies.Ashgrazer]: {
    species: FaunaSpecies.Ashgrazer,
    // "Thermal Veins" (§4). A herd grazes a fixed vent field and barely
    // leaves it, so the band is the tightest in the roster.
    workingDepthM: 600,
    depthBandM: 250,
    seedSpreadM: 0,
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
    seedSpreadM: 0,
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
    seedSpreadM: 0,
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
    seedSpreadM: 0,
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
  [FaunaSpecies.Lampfry]: {
    species: FaunaSpecies.Lampfry,
    // "150-350 m — the Shelf, floored by the Lid and going no deeper" (§4).
    // No pursuit band at all: the species never commits, so its vertical
    // extent is entirely a property of how it is seeded.
    workingDepthM: 250,
    depthBandM: 0,
    seedSpreadM: 100,
    name: 'Lampfry',
    // SIG 4 at rest and 4 scattered — the scatter is a purely visual tell
    // with no acoustic component, which is the entire species (§4).
    sigIdle: 4,
    sigActive: 4,
    hyd: 60,
    // "Never commits." Infinity rather than a large number, so no modifier
    // table, spike or multiplier can ever add up to a shoal attacking.
    interest: Number.POSITIVE_INFINITY,
    commit: Number.POSITIVE_INFINITY,
    biomass: 0,
    maxHp: 5,
    // A shoal holds its water; it does not travel. Scatter is a state, not a
    // move order.
    speed: 0,
    damagePerS: 0,
    attackRangeM: 0,
    // One entity is one shoal, like the Rasp's swarm.
    groupSize: 1,
    // The glow the renderer draws — the shoal cloud, not a fry.
    lengthM: 14,
  },
  [FaunaSpecies.Tetherjelly]: {
    species: FaunaSpecies.Tetherjelly,
    // "1,100-1,300 m — the duct itself, the boundary it is named for" (§4).
    // §4's open question — the doc names Kelp Forest too — is resolved for
    // now as the thermocline; a Kelp population would need a second seeding
    // depth per map, and is flagged in the doc rather than invented here.
    workingDepthM: 1200,
    depthBandM: 0,
    seedSpreadM: 100,
    name: 'Tetherjelly',
    // SIG 1 — quieter than anything a player can field. The species' output
    // is subtraction, not sound.
    sigIdle: 1,
    sigActive: 1,
    hyd: 20,
    // "Never commits", the Lampfry's argument: Infinity so no modifier can
    // ever add up to living terrain attacking somebody.
    interest: Number.POSITIVE_INFINITY,
    commit: Number.POSITIVE_INFINITY,
    biomass: 2,
    maxHp: 40,
    // A cluster is moored water. It does not travel, chase, or flee.
    speed: 0,
    damagePerS: 0,
    attackRangeM: 0,
    // One entity is one cluster; a field is several clusters, and how many
    // is exactly how much masking the field is worth.
    groupSize: 1,
    lengthM: 16,
  },
  [FaunaSpecies.Hollow]: {
    species: FaunaSpecies.Hollow,
    // "1,250-2,150 m — trench walls, and the descent that arrives at them"
    // (§4). The band straddles the Mid-Water/Abyssal line on purpose: what a
    // Hollow threatens is the descent, not the basement.
    workingDepthM: 1700,
    depthBandM: 450,
    seedSpreadM: 0,
    name: 'Hollow',
    // "3 idle / 60 striking" — the dual-SIG state that makes it the Drift's
    // own Silent Running. Striking is the only loud state; even disengaging
    // is done at rest volume (§4's trigger-model note).
    sigIdle: 3,
    sigActive: 60,
    hyd: 80,
    // Interest coils it; Commit inside DRIFT.HOLLOW_TRIGGER_RANGE_M fires
    // the strike. Both read against the same detection ratio as every other
    // creature — the Hollow differs in what the thresholds *do*, not in how
    // they are measured.
    interest: 45,
    commit: 70,
    biomass: 35,
    maxHp: 640,
    // TUNABLE — a lunge, not a cruise: the fastest thing in the roster over
    // the few hundred metres a strike covers.
    speed: 75,
    damagePerS: 55,
    attackRangeM: 110,
    // Solitary, like everything about it.
    groupSize: 1,
    lengthM: 18,
  },
};

export function faunaStatsFor(species: FaunaSpecies): FaunaStats {
  return FAUNA_STATS[species];
}
