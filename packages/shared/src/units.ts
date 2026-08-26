/**
 * Prototype unit roster, transcribed from docs/units.md.
 *
 * SIG is a triple (idle / cruise / firing burst) because a unit's loudness is a
 * function of what it is doing, not what it is — that is the whole premise of
 * the Echo Layer.
 *
 * The `hyd` figures are SPEC — authored per unit in docs/units.md (issue #35),
 * alongside the design note there settling that HYD is a flat hull property
 * (Silent Running changes SIG, never hearing) and that the Directorate's
 * listening doctrine is carried by these numbers rather than a special case.
 */

import { Faction, UnitKind } from './types.js';
import { FACTION_PRESSURE_BASELINE } from './constants.js';

export interface UnitStats {
  kind: UnitKind;
  name: string;
  /** Acoustic signature when powered but stationary. */
  sigIdle: number;
  /** Acoustic signature at cruise speed. */
  sigCruise: number;
  /** Additive burst while firing. */
  sigFiringBurst: number;
  /** Hydrophone rating — passive listening sensitivity. PROTOTYPE VALUE. */
  hyd: number;
  /** Pressure rating; below this depth the unit takes crush attrition. */
  pressureRating: number;
  maxHp: number;
  /** Metres per second. */
  speed: number;
  /**
   * Hull length in metres.
   *
   * Lives here rather than in the renderer because both sides need to agree:
   * the client draws the silhouette at this length, and the simulation keeps
   * hulls from occupying the same water using half of it as a radius. A hull
   * that looked one size and collided at another would be a bug nobody could
   * see.
   */
  hullLengthM: number;
  cost: number;
  /**
   * Resonance Crystal cost, when the hull is crystal-locked. The Abyssal
   * Submersible is: it is the hull built to live where the crystal is, so it
   * is the one the crystal pays for (docs/economy.md §2, §7).
   */
  crystalCost?: number;
  buildTimeS: number;
  /**
   * Weapon stats.
   *
   * TUNABLE, but **within the time-to-kill bands of docs/systems-combat.md §9**,
   * which are SPEC. The bands fix what a fight feels like — a Corvette falls to
   * another in eight to ten seconds, an anchor does not fall to chip damage —
   * and these numbers are solved from them rather than chosen. There is a test
   * that holds every band, including under the Consortium's Klaxon bonus, which
   * is the constraint that decided the Corvette's figure: at any more than 51,
   * a loud Consortium Corvette kills a Cruiser inside the 25 s floor §9 sets.
   *
   * A damage of 0 means unarmed.
   */
  attackDamage: number;
  attackRangeM: number;
  attackCooldownS: number;
  /**
   * Does this hull carry torpedo tubes? docs/systems-combat.md §5.
   *
   * A stat rather than a list in the ordnance system, because "which hulls can
   * launch" is a roster fact the design bible owns — and because a list kept
   * beside the weapon would be the second place the roster is written down.
   *
   * The Light Scout does not: docs/units.md gives it a sensor suite for a hull
   * and says it "finds things, it does not fight them", and a scout that could
   * one-shot a Corvette from a Tier-2 bearing would be doing both.
   */
  carriesTorpedoes: boolean;
}

/** Half a hull's length: the radius the simulation keeps clear around it. */
export function unitRadiusM(kind: UnitKind): number {
  return UNIT_STATS[kind].hullLengthM / 2;
}

export const UNIT_STATS: Record<UnitKind, UnitStats> = {
  [UnitKind.LightScout]: {
    kind: UnitKind.LightScout,
    name: 'Light Scout',
    sigIdle: 6,
    sigCruise: 12,
    sigFiringBurst: 15,
    hyd: 70,
    pressureRating: 1,
    maxHp: 180,
    speed: 120,
    hullLengthM: 60,
    cost: 50,
    buildTimeS: 12,
    attackDamage: 18,
    attackRangeM: 400,
    attackCooldownS: 1,
    carriesTorpedoes: false,
  },
  [UnitKind.Corvette]: {
    kind: UnitKind.Corvette,
    name: 'Corvette',
    sigIdle: 28,
    sigCruise: 28,
    sigFiringBurst: 25,
    hyd: 50,
    pressureRating: 2,
    maxHp: 420,
    speed: 85,
    hullLengthM: 80,
    cost: 120,
    buildTimeS: 30,
    attackDamage: 50,
    attackRangeM: 550,
    attackCooldownS: 1.2,
    carriesTorpedoes: true,
  },
  [UnitKind.Cruiser]: {
    kind: UnitKind.Cruiser,
    name: 'Cruiser',
    sigIdle: 55,
    sigCruise: 65,
    sigFiringBurst: 30,
    // "Heavy sensors" per docs/units.md — the roster's best listener.
    hyd: 65,
    pressureRating: 2,
    maxHp: 1200,
    speed: 45,
    hullLengthM: 130,
    cost: 420,
    buildTimeS: 90,
    attackDamage: 150,
    attackRangeM: 900,
    attackCooldownS: 2.5,
    carriesTorpedoes: true,
  },
  [UnitKind.AbyssalSubmersible]: {
    kind: UnitKind.AbyssalSubmersible,
    name: 'Abyssal Submersible',
    sigIdle: 22,
    sigCruise: 28,
    sigFiringBurst: 20,
    // Directorate are "The Listeners" — best HYD by a wide margin.
    hyd: 85,
    pressureRating: 3,
    maxHp: 520,
    speed: 60,
    hullLengthM: 95,
    cost: 260,
    crystalCost: 80,
    buildTimeS: 45,
    attackDamage: 80,
    attackRangeM: 650,
    attackCooldownS: 1.8,
    carriesTorpedoes: true,
  },
  [UnitKind.Harvester]: {
    kind: UnitKind.Harvester,
    name: 'Harvester',
    sigIdle: 18,
    // Mining is loud: economy is a noise source by design.
    sigCruise: 40,
    sigFiringBurst: 0,
    hyd: 30,
    /**
     * SPEC — docs/units.md gives the Harvester "PR: 1-2 (variant)", and this
     * has to be the 2.
     *
     * Nodule fields sit at 600 m, which is Mid-Water, which requires PR-2. At
     * PR-1 the standard worker took 4 HP/s of unhealable crush the entire time
     * it stood on the standard working ground, and died after seventy-five
     * seconds of doing its job — so every economy in every match collapsed at
     * about the two-minute mark, on both sides, without anything having
     * happened. docs/economy.md §7 calls Mid-Water "standard refits, standard
     * risk"; a band that eats the hull that works it is neither.
     *
     * PR-2 still leaves the crystal gate exactly where §7 wants it: the
     * Abyssal band is 1,800 m down and needs PR-3, so a Harvester cannot
     * follow the crystal, and going deep stays a decision somebody makes.
     */
    pressureRating: 2,
    maxHp: 300,
    speed: 40,
    hullLengthM: 75,
    cost: 80,
    buildTimeS: 20,
    attackDamage: 0,
    attackRangeM: 0,
    attackCooldownS: 0,
    carriesTorpedoes: false,
  },
};

export function statsFor(kind: UnitKind): UnitStats {
  return UNIT_STATS[kind];
}

/**
 * The largest radius in the roster, for sizing separation queries.
 *
 * Derived from the roster rather than written down: separation queries a
 * broadphase for neighbours within `ownRadius + this`, so a hull longer than
 * the hardcoded figure would simply not be found by the hulls it was
 * overlapping — a collision bug that reads as an unrelated formation glitch.
 */
export const MAX_UNIT_RADIUS_M =
  Math.max(...Object.values(UNIT_STATS).map((stats) => stats.hullLengthM)) / 2;

/**
 * The Pressure Rating a hull of this kind actually carries for this faction.
 *
 * The hull's own rating or its navy's baseline, whichever is greater
 * (docs/systems-depth.md §3). Every reader of a unit's rating should come
 * through here rather than `statsFor(kind).pressureRating`, which is the
 * roster number and not what the hull in the water has.
 *
 * Aura grants — the Sounding Spire's +1 — are *on top* of this and live in
 * `Pressure.bonus`, because a rented rating has to be able to evaporate and a
 * baseline never does.
 */
export function effectivePressureRating(kind: UnitKind, faction: Faction): number {
  return Math.max(UNIT_STATS[kind].pressureRating, FACTION_PRESSURE_BASELINE[faction]);
}
