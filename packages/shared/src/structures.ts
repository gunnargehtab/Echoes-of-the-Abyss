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

import { Faction, StructureKind, UnitKind } from './types.js';

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
  /**
   * Resonance Crystal cost, when the thing is crystal-locked.
   *
   * The four faction signature structures are exactly the "upper tech tier"
   * docs/economy.md §2 says every faction gates behind crystal — one per navy,
   * and each is the structure that expresses that navy's doctrine.
   */
  crystalCost?: number;
  buildTimeS: number;
  /** Footprint radius in metres, for placement checks and rendering. */
  radiusM: number;
  /** Harvesters may dock and deposit here. */
  acceptsDeposits: boolean;
  /** May be queued for construction. The Bastion deliberately cannot. */
  constructible: boolean;
  /**
   * Faction signature structures: only this faction may build it. Absent on
   * the core four, which every navy fields (docs/units.md).
   */
  faction?: Faction;
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
  [StructureKind.BaffleBarge]: {
    kind: StructureKind.BaffleBarge,
    name: 'Baffle Barge',
    // SPEC — docs/units.md: SIG 30 idle / 40 active; cost 600; build 120 s.
    // The Consortium's answer to being the loudest navy afloat: it does not
    // get quieter, it buys a bubble where loudness carries less.
    sigIdle: 30,
    sigActive: 40,
    hyd: 40,
    maxHp: 1400,
    cost: 600,
    crystalCost: 120,
    buildTimeS: 120,
    radiusM: 90,
    acceptsDeposits: false,
    constructible: true,
    faction: Faction.Bathyarch,
  },
  [StructureKind.Cantor]: {
    kind: StructureKind.Cantor,
    name: 'Cantor',
    // SPEC — docs/units.md: SIG 35 idle; cost 300; build 80 s. The dome's
    // +25 HYD (cap 95) aura is in STRUCTURE_AURAS.
    sigIdle: 35,
    sigActive: 35,
    // The dome itself is one of the fixed arrays it grants everyone else.
    hyd: 80,
    maxHp: 1200,
    cost: 300,
    crystalCost: 120,
    buildTimeS: 80,
    radiusM: 80,
    acceptsDeposits: false,
    constructible: true,
    faction: Faction.Directorate,
  },
  [StructureKind.SoundingSpire]: {
    kind: StructureKind.SoundingSpire,
    name: 'Sounding Spire',
    // SPEC — docs/units.md: SIG 80 when active (directional); cost 750;
    // build 150 s. Idle hum is TUNABLE — the doc authors only the active
    // figure. Active means projecting depth access (any allied unit riding
    // the PR aura), which is why deep play under a spire is never quiet.
    sigIdle: 30,
    sigActive: 80,
    hyd: 45,
    maxHp: 1800,
    cost: 750,
    crystalCost: 120,
    buildTimeS: 150,
    radiusM: 70,
    acceptsDeposits: false,
    constructible: true,
    faction: Faction.Hadron,
  },
  [StructureKind.SporeVeil]: {
    kind: StructureKind.SporeVeil,
    name: 'Spore Veil',
    // SPEC — docs/units.md: SIG 20 idle; cost 450; build 90 s. The cloud's
    // symmetric quiet-and-blind effect is in STRUCTURE_AURAS.
    sigIdle: 20,
    sigActive: 20,
    // The bed's own hydrophones sit inside its own cloud — blind by design.
    hyd: 30,
    maxHp: 900,
    cost: 450,
    crystalCost: 120,
    buildTimeS: 90,
    radiusM: 85,
    acceptsDeposits: false,
    constructible: true,
    faction: Faction.Pelagia,
  },
};

/**
 * The signature structure each navy adds to the core four. Together they
 * cover the detection formula's four levers: PF (Barge), HYD (Cantor),
 * PR (Spire), and SIG itself (Veil) — docs/units.md, faction structures.
 */
export const FACTION_STRUCTURE: Partial<Record<Faction, StructureKind>> = {
  [Faction.Bathyarch]: StructureKind.BaffleBarge,
  [Faction.Pelagia]: StructureKind.SporeVeil,
  [Faction.Directorate]: StructureKind.Cantor,
  [Faction.Hadron]: StructureKind.SoundingSpire,
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
