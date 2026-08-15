/**
 * Prototype unit roster, transcribed from docs/units.md.
 *
 * SIG is a triple (idle / cruise / firing burst) because a unit's loudness is a
 * function of what it is doing, not what it is — that is the whole premise of
 * the Echo Layer.
 *
 * CAVEAT: docs/units.md lists SIG, PR, cost, build time and speed, but its
 * "Next steps" section explicitly notes that per-unit HYD values are not yet
 * authored. The `hyd` figures below are prototype values invented for this
 * scaffold so detection can run at all. They are the least trustworthy numbers
 * here and should be replaced when the design doc catches up.
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
  cost: number;
  buildTimeS: number;
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
    cost: 50,
    buildTimeS: 12,
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
    cost: 120,
    buildTimeS: 30,
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
    cost: 420,
    buildTimeS: 90,
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
    cost: 260,
    buildTimeS: 45,
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
    cost: 80,
    buildTimeS: 20,
  },
};

export function statsFor(kind: UnitKind): UnitStats {
  return UNIT_STATS[kind];
}
