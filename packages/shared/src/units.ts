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

import { UnitKind } from './types.js';

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
   * Weapon stats. TUNABLE — docs/units.md authors each unit's firing-burst SIG
   * but not damage numbers; these exist so the combat loop can run. A damage of
   * 0 means unarmed.
   */
  attackDamage: number;
  attackRangeM: number;
  attackCooldownS: number;
}

/** Half a hull's length: the radius the simulation keeps clear around it. */
export function unitRadiusM(kind: UnitKind): number {
  return UNIT_STATS[kind].hullLengthM / 2;
}

/** The largest radius in the roster, for sizing separation queries. */
export const MAX_UNIT_RADIUS_M = 130 / 2;

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
    attackDamage: 8,
    attackRangeM: 400,
    attackCooldownS: 1,
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
    attackDamage: 22,
    attackRangeM: 550,
    attackCooldownS: 1.2,
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
    attackDamage: 60,
    attackRangeM: 900,
    attackCooldownS: 2.5,
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
    attackDamage: 35,
    attackRangeM: 650,
    attackCooldownS: 1.8,
  },
  [UnitKind.Harvester]: {
    kind: UnitKind.Harvester,
    name: 'Harvester',
    sigIdle: 18,
    // Mining is loud: economy is a noise source by design.
    sigCruise: 40,
    sigFiringBurst: 0,
    hyd: 30,
    pressureRating: 1,
    maxHp: 300,
    speed: 40,
    hullLengthM: 75,
    cost: 80,
    buildTimeS: 20,
    attackDamage: 0,
    attackRangeM: 0,
    attackCooldownS: 0,
  },
};

export function statsFor(kind: UnitKind): UnitStats {
  return UNIT_STATS[kind];
}
