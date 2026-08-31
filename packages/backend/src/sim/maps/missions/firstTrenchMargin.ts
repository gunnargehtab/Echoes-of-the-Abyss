/**
 * The Western Margin — docs/mission-exposure.md §11; docs/maps.md, "Mission
 * maps".
 *
 * The top step of the trench country, west end: a shelf lane above the layer,
 * a long slope through it, and the worked ground along the First Trench's rim
 * painted with the trench's own carrying acoustics — the margin carries its
 * own economy to anyone listening, which is the entire mission. One vent
 * pocket (the Hollow) is the only masked water on the Directorate's side of
 * the door.
 *
 * The worked ground stops at 1,750 m — fifty metres above the Abyssal band —
 * so the survey transits everything on its PR-2 rating and mission 5 keeps
 * its own lesson.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — one seat, no
 * resources, not balanced, resolved by mission id and nothing else.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const FIRST_TRENCH_MARGIN: MapDefinition = {
  id: 'first-trench-margin',
  name: 'The Western Margin',
  idealUse: "The Ledger, mission four. Somebody else's economy, standing in the water.",
  seats: 1,
  widthM: 5000,
  heightM: 3000,
  doc: 'docs/mission-exposure.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1500,
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 3000,
      biome: Biome.OpenWater,
      floorM: 1500,
      note: 'The Margin — the base water. Painted first; everything else is cut into it',
    },
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 750,
      biome: Biome.OpenWater,
      floorM: 1050,
      note: "The Shelf Lane — the muster and the way home, above the layer's duct: the return line",
    },
    {
      x: 0,
      y: 750,
      widthM: 5000,
      heightM: 750,
      biome: Biome.OpenWater,
      floorM: 1450,
      note: 'The Slope — the crossing: the layer passes through this band, and so does everything that matters',
    },
    {
      x: 0,
      y: 1500,
      widthM: 5000,
      heightM: 750,
      biome: Biome.OpenWater,
      floorM: 1600,
      note: "The Listening Ground — below the layer: the survey's working water, open and honest about it",
    },
    {
      x: 750,
      y: 1500,
      widthM: 250,
      heightM: 250,
      biome: Biome.ThermalVein,
      floorM: 1600,
      note: "The Hollow — one vent pocket on the listening ground's edge: the survey's cover, and the only masked water on this side of the door",
    },
    {
      x: 0,
      y: 2250,
      widthM: 5000,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 1750,
      note: "The Worked Ground — the rim: rendering row, freight axis, the six points, and the watch's beat. Trench paint at Mid-Water depth",
    },
  ],
  // One spawn, on the shelf lane. The offsets address a pre-built Foundry the
  // mission never places; the survey is seated in the constructor.
  spawns: [{ x: 2500, y: 375, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources: a charter, not a works order (§11).
  resources: [],
  // No hazard sites: the weather here is the roster (§11).
  hazards: [],
};
