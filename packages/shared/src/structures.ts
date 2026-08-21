/**
 * Prototype structure roster — the base-building half of the classic RTS loop.
 *
 * Structures follow the same acoustic law as units: everything that pays is
 * loud (docs/economy.md §4 puts the refinery at 55-75 SIG *sustained*, the
 * loudest permanent thing a player owns). A base is therefore not a safe rear
 * area but a broadcast tower — which is the whole design.
 *
 * SIG figures marked SPEC come from docs/economy.md; the rest are TUNABLE
 * prototype numbers in the same spirit as units.ts.
 */

import { StructureKind, UnitKind } from './types.js';

export interface StructureStats {
  kind: StructureKind;
  name: string;
  /** Sustained acoustic signature once commissioned and idle. */
  sigIdle: number;
  /** Sustained signature while working (refining runs always; producing counts). */
  sigActive: number;
  /** Passive listening sensitivity. Structures are anchored hydrophone arrays. */
  hyd: number;
  maxHp: number;
  cost: number;
  buildTimeS: number;
  /** Footprint radius in metres, for placement checks and rendering. */
  radiusM: number;
  /** Harvesters may dock and deposit here. */
  acceptsDeposits: boolean;
  /** May be queued for construction. The Bastion deliberately cannot. */
  constructible: boolean;
  /** Armed structures only (the Sentinel Turret). */
  attackDamage?: number;
  attackRangeM?: number;
  attackCooldownS?: number;
  /** Additive SIG burst while firing, same contract as UnitStats. */
  sigFiringBurst?: number;
}

export const STRUCTURE_STATS: Record<StructureKind, StructureStats> = {
  [StructureKind.Bastion]: {
    kind: StructureKind.Bastion,
    name: 'Bastion',
    // TUNABLE — a settlement hums; it can never be silent-run.
    sigIdle: 35,
    sigActive: 35,
    // A base mounts the largest fixed arrays a faction owns.
    hyd: 60,
    maxHp: 5000,
    cost: 0, // Never purchased; you start with exactly one, and it is the stake.
    buildTimeS: 0,
    radiusM: 220,
    acceptsDeposits: true,
    constructible: false,
  },
  [StructureKind.Refinery]: {
    kind: StructureKind.Refinery,
    name: 'Nodule Refinery',
    // SPEC — docs/economy.md §4: refining is 55-75 SIG sustained. A refinery
    // is loud whether or not a harvester is docked; that is its identity.
    sigIdle: 65,
    sigActive: 65,
    hyd: 30,
    maxHp: 1500,
    cost: 300,
    buildTimeS: 45,
    radiusM: 140,
    acceptsDeposits: true,
    constructible: true,
  },
  [StructureKind.Foundry]: {
    kind: StructureKind.Foundry,
    name: 'Foundry',
    // TUNABLE — construction is loud (docs/systems-echo.md §2); an idle line
    // merely hums.
    sigIdle: 25,
    sigActive: 55,
    hyd: 30,
    maxHp: 2000,
    cost: 400,
    buildTimeS: 60,
    radiusM: 160,
    acceptsDeposits: false,
    constructible: true,
  },
  [StructureKind.SentinelTurret]: {
    kind: StructureKind.SentinelTurret,
    name: 'Sentinel Turret',
    // TUNABLE — a turret is an ambush predator: near-silent until it fires,
    // then a firing spike like any other weapon.
    sigIdle: 12,
    sigActive: 12,
    hyd: 55,
    maxHp: 1000,
    cost: 250,
    buildTimeS: 30,
    radiusM: 60,
    acceptsDeposits: false,
    constructible: true,
    attackDamage: 24,
    attackRangeM: 700,
    attackCooldownS: 1.5,
    sigFiringBurst: 30,
  },
};

export function structureStatsFor(kind: StructureKind): StructureStats {
  return STRUCTURE_STATS[kind];
}

/**
 * What each structure kind is allowed to produce — the classic tech split:
 * the Bastion can always rebuild an economy; combat hulls need a Foundry.
 * Shared because the server validates against it and the client's command
 * bar renders from it; two copies would eventually disagree.
 */
export const PRODUCIBLE: Partial<Record<StructureKind, readonly UnitKind[]>> = {
  [StructureKind.Bastion]: [UnitKind.Harvester],
  [StructureKind.Foundry]: [
    UnitKind.LightScout,
    UnitKind.Corvette,
    UnitKind.Cruiser,
    UnitKind.AbyssalSubmersible,
    UnitKind.Harvester,
  ],
};
