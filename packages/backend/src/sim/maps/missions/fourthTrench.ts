/**
 * The Fourth Trench — docs/mission-baffle.md §11; docs/maps.md, "Mission maps".
 *
 * A corridor map for one convoy: the freight shortcut between the west wall
 * and the deep, walls of rock, and the only road the one that carries
 * everything (PF 1.6). Two vent pockets notch the walls — the chartered
 * lay-bys, PF 0.45 against the axis — and the Baffle stations moor in them,
 * which is the whole mission: the loudest corridor in the region holds
 * exactly two chambers of quiet water, and everybody knows where they are.
 *
 * The trench floor stops at 1,700 m — Mid-Water's last hundred metres — so a
 * PR-2 convoy transits it whole and the crush ledger stays shut until
 * mission 5. Trench paint at Mid-Water depth, Face Six's argument: biome is
 * acoustics, not band.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — one seat, no
 * resources, not balanced, resolved by mission id and nothing else.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

/** Solid rock, as a region: no depth satisfies ceiling <= D <= floor. */
const ROCK = { floorM: 0, ceilingM: 1 } as const;

export const FOURTH_TRENCH: MapDefinition = {
  id: 'fourth-trench',
  name: 'The Fourth Trench',
  idealUse: 'The Ledger, mission three. A closed shortcut, two quiet chambers, and one road.',
  seats: 1,
  widthM: 3000,
  heightM: 5000,
  doc: 'docs/mission-baffle.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1450,
  // One row per row of §11's table, in the document's order. The lay-bys are
  // painted after the walls they notch, which is what carves water back out
  // of rock — the same order-of-paint argument as everywhere else.
  //
  // Drawn in shapes since #1143: the two walls end in slopes that fall away
  // from the trench's mouth to the margin. Every number is a whole 250 m cell,
  // and a cell is a region's when its shape holds the cell's centre (#157).
  // Twelve cells of wall became margin; every spawn, hull, station, emitter,
  // order and creature stands on the ground it stood on, and
  // `missionBaffle.test.ts` pins it. `fourthFoot.ts` repeats rows 2–8 to the
  // metre, so a change here is a change there.
  regions: [
    // A box because it is the whole map, painted first.
    {
      x: 0,
      y: 0,
      widthM: 3000,
      heightM: 5000,
      biome: Biome.OpenWater,
      floorM: 1450,
      note: 'The Margin — the base water. Painted first; everything else is cut into it',
    },
    // A box because the apron runs the whole north edge at 1,100 m, and any
    // cell it gave up would be the margin's 1,450: water below the layer beside
    // the muster, where entering the trench is meant to be the crossing.
    {
      x: 0,
      y: 0,
      widthM: 3000,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 1100,
      note: "The Staging — the north mouth: the grid's masked apron, the muster, above the layer's duct",
    },
    // A ridge whose face along the trench runs its whole length, and whose
    // seaward end slopes away from the mouth to the margin. Its north face and
    // its outer edge stay on the apron and the map edge, so no water opens
    // between the staging and the south but the trench.
    {
      shape: 'polygon',
      points: [
        [0, 750],
        [1250, 750],
        [1250, 4250],
        [1000, 4250],
        [0, 3250],
      ],
      biome: Biome.OpenWater,
      ...ROCK,
      note: 'The West Wall — solid. The trench is the only road',
    },
    // The west wall's mirror image about the trench's axis.
    {
      shape: 'polygon',
      points: [
        [1750, 750],
        [3000, 750],
        [3000, 3250],
        [2000, 4250],
        [1750, 4250],
      ],
      biome: Biome.OpenWater,
      ...ROCK,
      note: 'The East Wall — solid',
    },
    // A box because every cell of it is the road: two columns, 500 m wide from
    // the apron to the yard, and both watches' legs and the pack's drive cross
    // both columns.
    {
      x: 1250,
      y: 750,
      widthM: 500,
      heightM: 3500,
      biome: Biome.AbyssalTrench,
      floorM: 1700,
      note: 'The Trench — the shortcut itself: PF 1.6, no secrets down its length, only distances',
    },
    // A box because a pocket is one cell: the smallest thing the grid holds.
    {
      x: 1000,
      y: 1750,
      widthM: 250,
      heightM: 250,
      biome: Biome.ThermalVein,
      // Cut into the wall's rock, whose ceiling (1 m) would otherwise survive
      // under the new floor and roof the pocket over: §11 gives a floor only
      // (#1105).
      floorM: 1700,
      ceilingM: 0,
      note: 'Lay-by One — the first chartered vent pocket, notched into the west wall. The northern station moors here',
    },
    {
      x: 1750,
      y: 3000,
      widthM: 250,
      heightM: 250,
      biome: Biome.ThermalVein,
      floorM: 1700,
      ceilingM: 0,
      note: 'Lay-by Two — the second pocket, east wall. The southern station',
    },
    // A box because it is built, and the mission's `yard-berth` region, where
    // the plant is delivered, is this same rectangle.
    {
      x: 750,
      y: 4250,
      widthM: 1500,
      heightM: 500,
      biome: Biome.OpenWater,
      floorM: 1650,
      note: 'The Deep Yard — berths, the failing plant, forty-one souls, the delivery point',
    },
  ],
  // One spawn, at the staging. The offsets address a pre-built Foundry the
  // mission never places; the convoy is seated in the constructor.
  spawns: [{ x: 1500, y: 375, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources: a relief writ, not a works order (§11).
  resources: [],
  // No hazard sites: the corridor's weather is the picket and the pack (§11).
  hazards: [],
};
