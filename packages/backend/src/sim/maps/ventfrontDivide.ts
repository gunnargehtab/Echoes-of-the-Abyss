/**
 * The Ventfront Divide — docs/maps.md, Map Type 1.
 *
 * "A geothermal battlefield split by erupting thermal veins."
 *
 * The map's argument is **masking**. The vent line down the middle is PF 0.45,
 * the lowest in the game, so the contested ground is also the ground where
 * nobody can hear anything — an army can be assembled inside it and only be
 * heard when it leaves. The trenches north and south are PF 1.6, which means
 * the flanking routes are the loud ones: you can go quietly through the middle
 * or quickly around the outside, never both.
 */

import { Biome, ResourceKind } from '@echoes/shared';
import type { MapDefinition } from './types.ts';

const W = 8000;
const H = 8000;

export const VENTFRONT_DIVIDE: MapDefinition = {
  id: 'ventfront-divide',
  name: 'The Ventfront Divide',
  doc: 'docs/maps.md — Map Type 1',
  idealUse: 'Competitive 1v1 or 2v2; high-pressure mid-control gameplay.',
  widthM: W,
  heightM: H,
  cellM: 250,
  regions: [
    // "Center: Thermal Veins (hot, bright, dangerous)". A broad band rather
    // than a line: it has to be wide enough to hide an army in, or the map's
    // whole proposition collapses into a corridor fight.
    {
      x: 0,
      y: 3200,
      widthM: W,
      heightM: 1600,
      biome: Biome.ThermalVein,
      note: 'The vent line. PF 0.45 — the quiet road, and the dangerous one.',
    },
    // "North/South: Abyssal Trenches". The loud way round.
    { x: 0, y: 0, widthM: W, heightM: 900, biome: Biome.AbyssalTrench, note: 'North trench' },
    {
      x: 0,
      y: H - 900,
      widthM: W,
      heightM: 900,
      biome: Biome.AbyssalTrench,
      note: 'South trench',
    },
    // "East/West: Kelp Forest Plateaus" — the base aprons, quiet enough to
    // build on without announcing every structure.
    { x: 0, y: 1400, widthM: 2000, heightM: 1400, biome: Biome.KelpForest, note: 'West plateau' },
    {
      x: W - 2000,
      y: 1400,
      widthM: 2000,
      heightM: 1400,
      biome: Biome.KelpForest,
      note: 'East plateau',
    },
    { x: 0, y: 5200, widthM: 2000, heightM: 1400, biome: Biome.KelpForest },
    { x: W - 2000, y: 5200, widthM: 2000, heightM: 1400, biome: Biome.KelpForest },
    // "Multiple narrow crossing points": coral pillars break the vent band up
    // so crossing it is a choice of lane rather than a straight line.
    {
      x: 2400,
      y: 3200,
      widthM: 500,
      heightM: 1600,
      biome: Biome.CoralRuins,
      note: 'Crossing divider — hard acoustic shadow',
    },
    { x: 5100, y: 3200, widthM: 500, heightM: 1600, biome: Biome.CoralRuins },
  ],
  // Four corners, facing in. The doc calls this a 1v1 or 2v2 map, so the
  // spawns are symmetric across both axes.
  spawns: [
    { x: 1200, y: 1200, foundryOffsetX: 450, foundryOffsetY: 0 },
    { x: W - 1200, y: 1200, foundryOffsetX: -450, foundryOffsetY: 0 },
    { x: 1200, y: H - 1200, foundryOffsetX: 450, foundryOffsetY: 0 },
    { x: W - 1200, y: H - 1200, foundryOffsetX: -450, foundryOffsetY: 0 },
  ],
  resources: [
    { x: 1900, y: 1450, kind: ResourceKind.Nodule, note: 'Home field, NW' },
    { x: W - 1900, y: 1450, kind: ResourceKind.Nodule },
    { x: 1900, y: H - 1450, kind: ResourceKind.Nodule },
    { x: W - 1900, y: H - 1450, kind: ResourceKind.Nodule },
    // "Toxic brine pockets near mining rigs" — the contested fields sit inside
    // the vent band, so working them is quiet and dangerous at once.
    { x: 4000, y: 3500, kind: ResourceKind.Nodule, amount: 6000, note: 'Contested, in the vents' },
    { x: 4000, y: 4500, kind: ResourceKind.Nodule, amount: 6000 },
    {
      x: 4000,
      y: 4000,
      kind: ResourceKind.ResonanceCrystal,
      note: 'Dead centre and deep — nobody works it without committing',
    },
  ],
  hazards: [
    {
      x: 4000,
      y: 3500,
      radiusM: 700,
      kind: 'geothermal-eruption',
      note: 'Predictable intervals (doc); the mid fields sit inside it',
    },
    { x: 4000, y: 4500, radiusM: 700, kind: 'geothermal-eruption' },
    { x: 1900, y: 1450, radiusM: 400, kind: 'toxic-brine', note: 'Near mining rigs' },
    { x: W - 1900, y: H - 1450, radiusM: 400, kind: 'toxic-brine' },
  ],
};
