import { Biome, FREE_WATER_DUEL_MAP_ID, FREE_WATER_MAP_ID, UnitKind } from '@echoes/shared';
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
  // §9, "Toward a vertical multiplayer match": the owner lifted §2's three
  // planar limits on this ground, and on no other (#1754).
  volumetric: true,
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

/** Heading east, in the sim's convention: `Heading.rad` is `atan2(y, x)`. */
const EAST = 0;
const WEST = Math.PI;

/**
 * One seat's opening fleet, on its rim at 300 m (docs/free-water-slice.md §9,
 * "Toward a vertical multiplayer match"). Every core hull band the crater
 * argues about: a PR 1 scout for the Shelf garden, a Corvette and a Cruiser
 * rated to Mid-Water, and a PR 3 Abyssal Submersible, the one hull that can
 * hold the pocket without crush. Every one is armed, so each carries the
 * rack any armed hull drops a depth charge from (docs/systems-combat.md §8).
 */
function seatFleet(seat: number, x: number, heading: number) {
  return [
    { seat, kind: UnitKind.LightScout, x, y: 1875, depth: 300, heading },
    { seat, kind: UnitKind.Corvette, x, y: 2125, depth: 300, heading },
    { seat, kind: UnitKind.Cruiser, x, y: 2375, depth: 300, heading },
    { seat, kind: UnitKind.AbyssalSubmersible, x, y: 2625, depth: 300, heading },
  ];
}

/**
 * The crater's two-seat fight (§9; #1754). The study's ground, unchanged, with
 * two seats mirrored across the bowl's own axis, x = 2,250 m: a fleet on each
 * outer rim at 300 m, over the 600 m Coral Ruins, and a Bastion on each side
 * of the bowl's 1,500 m floor, between the pocket and the rim. The garden and
 * the roofed cut are centred on x = 2,000 m, so they are not mirrored.
 */
export const FREE_WATER_DUEL: MapDefinition = {
  ...FREE_WATER_SLICE,
  id: FREE_WATER_DUEL_MAP_ID,
  name: 'Free Water — Crater Duel',
  idealUse: 'Development-only two-player fight across depth bands.',
  seats: 2,
  doc: 'docs/free-water-slice.md §9',
  spawns: [
    { x: 1250, y: 2250, foundryOffsetX: 0, foundryOffsetY: 0 },
    { x: 3250, y: 2250, foundryOffsetX: 0, foundryOffsetY: 0 },
  ],
  openingFleet: [...seatFleet(0, 625, EAST), ...seatFleet(1, 3875, WEST)],
  openingBastion: true,
};

/** Reject before constructing a world; an opt-in fixture never falls back to a live map. */
export function freeWaterMap(
  id: string | undefined,
  environment: string | undefined
): MapDefinition | null {
  if (id !== FREE_WATER_MAP_ID && id !== FREE_WATER_DUEL_MAP_ID) return null;
  if (environment === 'production') throw new Error('Free Water is available only in development.');
  return id === FREE_WATER_DUEL_MAP_ID ? FREE_WATER_DUEL : FREE_WATER_SLICE;
}
