/**
 * One canned match, for the renderer smoke test (#443).
 *
 * A snapshot is only worth booting a renderer against if it reaches the
 * branches that actually differ, so this one is awkward on purpose: contacts
 * at every resolution tier including the fauna, structure and ordnance
 * variants; a structure mid-build with a production queue; a hull below its
 * Pressure Rating carrying crush attrition; a silent runner; a harvester with
 * cargo and a queued order; hazards in three phases; marks of two kinds; a
 * scattered shoal beside an unscattered one. A snapshot of four idle corvettes
 * in open water would exercise a fifth of the frame.
 *
 * The ground is deliberately small — 16 x 16 cells, 4 km square — because the
 * seabed bake is 32 px per cell and the test has no reason to shade a
 * megabyte.
 */

import {
  Biome,
  EchoMarkKind,
  Faction,
  FaunaSpecies,
  HarvestThrottle,
  HazardPhase,
  OrdnanceKind,
  ResolutionTier,
  ResourceKind,
  SelfEventKind,
  StructureKind,
  UnitKind,
  type EchoSnapshot,
  type ResourceNodeInfo,
} from '@echoes/shared';
import type { MapPayload, TerrainPayload } from '../../src/net/GameClient.ts';

export const CELL_M = 250;
export const COLS = 16;
export const ROWS = 16;

/**
 * Ground with something to say: a kelp patch, a trench, a thermal vein, a
 * roofed rock block, and a floor that actually varies so the heightfield is
 * not a plane.
 */
export function cannedTerrain(): TerrainPayload {
  const biomes = new Array<number>(COLS * ROWS).fill(Biome.OpenWater);
  const floor = new Array<number>(COLS * ROWS);
  const ceiling = new Array<number>(COLS * ROWS).fill(0);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = row * COLS + col;
      // A shelf in the north-west falling away to a trench in the south-east.
      floor[i] = 1100 + row * 90 + col * 45;
      if (row >= 3 && row <= 6 && col >= 2 && col <= 5) biomes[i] = Biome.KelpForest;
      if (row >= 10 && col >= 10) {
        biomes[i] = Biome.AbyssalTrench;
        floor[i] = 3200;
      }
      if (row === 8 && col >= 4 && col <= 9) biomes[i] = Biome.ThermalVein;
      if (row <= 1 && col >= 12) biomes[i] = Biome.CoralRuins;
    }
  }

  // A roofed passage: the one thing that makes ground blocking depth-dependent.
  for (const [row, col] of [
    [5, 12],
    [5, 13],
    [6, 12],
    [6, 13],
  ] as const) {
    const i = row * COLS + col;
    ceiling[i] = 1600;
    floor[i] = 2600;
  }

  return { cols: COLS, rows: ROWS, cellM: CELL_M, biomes, floor, ceiling };
}

export function cannedMap(): MapPayload {
  return {
    id: 'smoke-basin',
    name: 'Smoke Basin',
    idealUse: 'Renderer smoke test',
    widthM: COLS * CELL_M,
    heightM: ROWS * CELL_M,
    seats: 2,
    hazards: [
      { x: 1500, y: 1500, radiusM: 400, kind: 'geothermal-eruption', simulated: true },
      { x: 3000, y: 900, radiusM: 300, kind: 'toxic-brine', note: 'site only', simulated: false },
    ],
  };
}

export function cannedNodes(): ResourceNodeInfo[] {
  return [
    { id: 1, x: 700, y: 700, kind: ResourceKind.Nodule, depth: 1400, initialAmount: 5000 },
    { id: 2, x: 2600, y: 2400, kind: ResourceKind.Nodule, depth: 2100, initialAmount: 5000 },
    {
      id: 3,
      x: 3400,
      y: 3400,
      kind: ResourceKind.ResonanceCrystal,
      depth: 3200,
      initialAmount: 800,
    },
  ];
}

/**
 * The snapshot itself. `tick` is a parameter so a test can advance the match
 * without rebuilding the world — the renderer keys several of its caches on
 * the snapshot sequence, and two identical snapshots are a different thing to
 * it than one snapshot twice.
 */
export function cannedSnapshot(tick = 300): EchoSnapshot {
  return {
    tick,
    units: [
      {
        id: 11,
        kind: UnitKind.Corvette,
        x: 800,
        y: 900,
        depth: 1200,
        hp: 180,
        maxHp: 220,
        heading: 0.6,
        sig: 48,
        silentRunning: false,
        pressureBonus: 0,
        unhealableDamage: 0,
        torpedoes: 2,
      },
      {
        id: 12,
        kind: UnitKind.LightScout,
        x: 1400,
        y: 1800,
        depth: 900,
        hp: 60,
        maxHp: 60,
        heading: -1.2,
        sig: 12,
        silentRunning: true,
        pressureBonus: 0,
        unhealableDamage: 0,
        holding: true,
      },
      {
        id: 13,
        kind: UnitKind.Harvester,
        x: 760,
        y: 640,
        depth: 1400,
        hp: 140,
        maxHp: 140,
        heading: 2.4,
        sig: 62,
        silentRunning: false,
        pressureBonus: 0,
        unhealableDamage: 0,
        cargo: 220,
        cargoKind: ResourceKind.Nodule,
        throttle: HarvestThrottle.Standard,
      },
      {
        // Below its Pressure Rating: the crush-attrition read-out, and the one
        // hull whose bar carries unhealable damage.
        id: 14,
        kind: UnitKind.AbyssalSubmersible,
        x: 3300,
        y: 3300,
        depth: 3100,
        hp: 90,
        maxHp: 200,
        heading: 0.1,
        sig: 30,
        silentRunning: false,
        pressureBonus: 0,
        unhealableDamage: 45,
        engaging: { x: 3600, y: 3600 },
      },
    ],
    structures: [
      {
        id: 21,
        kind: StructureKind.Bastion,
        x: 600,
        y: 600,
        depth: 1300,
        hp: 2000,
        maxHp: 2000,
        sig: 35,
        buildProgress: 1,
        queue: [UnitKind.Corvette, UnitKind.LightScout],
        queueProgress: 0.4,
        rally: { x: 1100, y: 1000 },
      },
      {
        // Mid-build: the construction-site path, which draws differently and
        // never takes a roster model.
        id: 22,
        kind: StructureKind.Refinery,
        x: 1000,
        y: 500,
        depth: 1250,
        hp: 300,
        maxHp: 900,
        sig: 20,
        buildProgress: 0.35,
        queue: [],
        queueProgress: 0,
      },
    ],
    ordnance: [
      {
        id: 31,
        kind: OrdnanceKind.Torpedo,
        x: 1600,
        y: 1500,
        depth: 1200,
        heading: 0.9,
        sig: 70,
        remainingS: 8,
      },
      {
        id: 32,
        kind: OrdnanceKind.Noisemaker,
        x: 1200,
        y: 2000,
        depth: 1000,
        heading: 0,
        sig: 85,
        remainingS: 20,
      },
    ],
    contacts: [
      // Tier 1: a directionless haze, and nothing else is known.
      { id: 101, tier: ResolutionTier.Contact, x: 2400, y: 800, tick },
      // Tier 2: a bearing.
      { id: 102, tier: ResolutionTier.Bearing, x: 2600, y: 1600, depth: 1500, tick },
      // Tier 3: classified, so kind and faction are drawn.
      {
        id: 103,
        tier: ResolutionTier.Classification,
        x: 3000,
        y: 2200,
        depth: 2000,
        kind: UnitKind.Cruiser,
        faction: Faction.Directorate,
        tick,
      },
      // Tier 4: a full track, with a health bar and a heading.
      {
        id: 104,
        tier: ResolutionTier.Track,
        x: 2800,
        y: 2600,
        depth: 2400,
        kind: UnitKind.Corvette,
        faction: Faction.Hadron,
        hp: 120,
        maxHp: 220,
        heading: -0.4,
        tick,
      },
      // A structure contact, a fauna contact and an ordnance contact: three
      // more mark vocabularies on the same layer.
      {
        id: 105,
        tier: ResolutionTier.Classification,
        x: 3600,
        y: 600,
        depth: 1100,
        structure: StructureKind.SentinelTurret,
        faction: Faction.Pelagia,
        tick,
      },
      {
        id: 106,
        tier: ResolutionTier.Classification,
        x: 1900,
        y: 3000,
        depth: 2600,
        fauna: FaunaSpecies.Draymaw,
        tick,
      },
      {
        id: 107,
        tier: ResolutionTier.Track,
        x: 2000,
        y: 1200,
        depth: 1100,
        ordnance: OrdnanceKind.Torpedo,
        heading: 2.1,
        tick,
      },
    ],
    peakSig: 62,
    nodules: 1750,
    crystal: 120,
    biomass: 60,
    berths: { used: 4, granted: 12 },
    exposure: { tier: ResolutionTier.Bearing, trackedCount: 2 },
    selfEvents: [{ kind: SelfEventKind.Damaged, unitId: 14 }],
    draw: { capacity: 40, demand: 34, satisfaction: 1 },
    driftHealth: [88, 74, 61, 95, 90, 40, 12, 77, 66, 80, 55, 34, 99, 21, 70, 58],
    hazards: [
      {
        id: 41,
        kind: 'geothermal-eruption',
        x: 1500,
        y: 1500,
        radiusM: 400,
        phase: HazardPhase.Warning,
        progress: 0.5,
        remainingS: 6,
      },
      {
        id: 42,
        kind: 'toxic-brine',
        x: 3000,
        y: 900,
        radiusM: 300,
        phase: HazardPhase.Active,
        progress: 0.2,
        remainingS: 14,
        flowRad: 1.1,
      },
      {
        id: 43,
        kind: 'cold-shock',
        x: 900,
        y: 3200,
        radiusM: 500,
        phase: HazardPhase.Dormant,
        progress: 0,
        remainingS: 60,
      },
    ],
    marks: [
      { id: 51, x: 2200, y: 2200, kind: EchoMarkKind.Battle, intensity: 0.8 },
      { id: 52, x: 1000, y: 2800, kind: EchoMarkKind.IndustrialHum, intensity: 0.3 },
    ],
    shoals: [
      { id: 61, x: 2500, y: 3400, depth: 2800, scattered: false },
      { id: 62, x: 3300, y: 1400, depth: 1800, scattered: true },
    ],
    jellies: [
      { id: 71, x: 1800, y: 2400, depth: 2000 },
      { id: 72, x: 2000, y: 2500, depth: 2050 },
    ],
  };
}
