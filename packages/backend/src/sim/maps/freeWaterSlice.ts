import { Biome, FREE_WATER_MAP_ID, UnitKind } from '@echoes/shared';
import type { MapDefinition } from './types.ts';

/** docs/free-water-slice.md §§3–4. Not a skirmish or mission catalogue entry. */
export const FREE_WATER_SLICE: MapDefinition = {
  id: FREE_WATER_MAP_ID,
  name: 'Free Water — Crater and Kelp',
  idealUse: 'Development-only command and movement study.',
  seats: 1,
  widthM: 4000,
  heightM: 4000,
  cellM: 250,
  floorM: 600,
  doc: 'docs/free-water-slice.md §§3–4',
  regions: [
    { x: 0, y: 0, widthM: 4000, heightM: 4000, biome: Biome.CoralRuins, floorM: 600, ceilingM: 0 },
    {
      shape: 'ellipse',
      x: 1000,
      y: 1000,
      widthM: 2500,
      heightM: 2500,
      biome: Biome.KelpForest,
      floorM: 1500,
      ceilingM: 0,
    },
    {
      shape: 'ellipse',
      x: 1500,
      y: 1500,
      widthM: 1500,
      heightM: 1500,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      ceilingM: 0,
    },
    {
      x: 1000,
      y: 500,
      widthM: 2000,
      heightM: 1000,
      biome: Biome.KelpForest,
      floorM: 400,
      ceilingM: 0,
    },
    {
      x: 1000,
      y: 3000,
      widthM: 2000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 200,
      ceilingM: 3000,
    },
    {
      x: 1750,
      y: 3000,
      widthM: 500,
      heightM: 500,
      biome: Biome.AbyssalTrench,
      floorM: 1500,
      ceilingM: 800,
    },
    {
      x: 1000,
      y: 3500,
      widthM: 2000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1500,
      ceilingM: 0,
    },
  ],
  spawns: [{ x: 625, y: 1875, foundryOffsetX: 0, foundryOffsetY: 0 }],
  openingFleet: [
    { kind: UnitKind.LightScout, x: 625, y: 1875, depth: 300, heading: 0 },
    { kind: UnitKind.Corvette, x: 625, y: 2125, depth: 300, heading: 0 },
    { kind: UnitKind.Harvester, x: 375, y: 1875, depth: 300, heading: 0 },
  ],
  resources: [],
  hazards: [],
};

/** Reject before constructing a world; an opt-in fixture never falls back to a live map. */
export function freeWaterMap(
  id: string | undefined,
  environment: string | undefined
): MapDefinition | null {
  if (id !== FREE_WATER_MAP_ID) return null;
  if (environment === 'production') throw new Error('Free Water is available only in development.');
  return FREE_WATER_SLICE;
}
