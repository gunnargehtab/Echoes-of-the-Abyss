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
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones; every number a shape states is a whole 250 m cell,
  // and a cell is its region's when the shape holds its centre (#1144). Every
  // spawn, hull, emitter, beat point and leg the mission authors, and every
  // cell of its shelf-lane region, stands on the ground it stood on when these
  // were all rectangles, and `missionExposure.test.ts` pins it.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 3000,
      biome: Biome.OpenWater,
      floorM: 1500,
      note: "The Margin — the base water. Painted first; everything else is cut into it. A bench at the slope's foot at either end",
    },
    // A box, because the mission's `shelf-lane` region is this same
    // rectangle: the water the record comes home to is the water drawn.
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 750,
      biome: Biome.OpenWater,
      floorM: 1050,
      note: "The Shelf Lane — the muster and the way home, above the layer's duct: the return line",
    },
    // Its top row runs the map's whole width, so every way down from the
    // shelf lane crosses it. Its foot is ragged: a spur runs down south of the
    // muster, between the two canyons the listening ground cuts into it.
    {
      shape: 'polygon',
      points: [
        [0, 750],
        [5000, 750],
        [5000, 1500],
        [4500, 1750],
        [2500, 1750],
        [2250, 1500],
        [0, 1500],
      ],
      biome: Biome.OpenWater,
      floorM: 1450,
      note: 'The Slope — the crossing: the layer passes through this band, and so does everything that matters',
    },
    // A basin rather than a band: it reaches up the slope in two canyons, the
    // western one opening beside the Hollow, and pulls back from the map's
    // edges at the slope's foot. Its southern edge is the rim, straight,
    // because the worked ground below it is.
    {
      shape: 'polygon',
      points: [
        [0, 2250],
        [0, 2000],
        [500, 2000],
        [750, 1500],
        [1250, 1500],
        [1500, 1000],
        [2000, 1000],
        [2500, 1750],
        [3500, 1750],
        [3750, 1250],
        [4250, 1250],
        [4500, 1750],
        [5000, 2000],
        [5000, 2250],
      ],
      biome: Biome.OpenWater,
      floorM: 1600,
      note: "The Listening Ground — below the layer: the survey's working water, open and honest about it",
    },
    // A box, because it is one cell: any shape drawn in this frame paints the
    // cell or nothing, and a larger one would widen the only cover on this
    // side of the door.
    {
      x: 750,
      y: 1500,
      widthM: 250,
      heightM: 250,
      biome: Biome.ThermalVein,
      floorM: 1600,
      note: "The Hollow — one vent pocket on the listening ground's edge: the survey's cover, and the only masked water on this side of the door",
    },
    // A box, because its northern row is held: the watch's beat, and the turn
    // the recall sends it on from anywhere along that beat, cross 14 of the
    // row's 20 cells, and moving the edge anywhere moves PF 1.6 water — the
    // acoustics the mission is about.
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
