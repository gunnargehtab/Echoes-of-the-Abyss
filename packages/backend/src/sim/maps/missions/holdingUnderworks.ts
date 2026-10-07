/**
 * The Underworks — docs/mission-tolerance.md §11; docs/maps.md, "Mission
 * maps".
 *
 * The Holding's wall face and the pre-Collapse works beneath it. The one
 * ground fact the whole mission stands on is the roof: the Underworks admit
 * water only between 1,900 and 2,100 m, reached only by the throat, so the
 * root aperture cannot be approached, hovered over, or cheated from above —
 * everything that stands in its water has crossed the line at 1,800 m and
 * started the crush ledger. The choice is authored as terrain.
 *
 * Coral Ruins under the overhang because that is what it is: the Surface
 * Age's vent works, the drowned fabric the Holding grew on
 * (docs/world-map.md; docs/environments.md).
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — one seat, no
 * resources, not balanced, resolved by mission id and nothing else.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const HOLDING_UNDERWORKS: MapDefinition = {
  id: 'holding-underworks',
  name: 'The Underworks',
  idealUse:
    'The Ledger, mission five. One casting, two apertures, and a ledger that does not heal.',
  seats: 1,
  widthM: 4000,
  heightM: 3000,
  doc: 'docs/mission-tolerance.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1300,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones; every number a shape states is a whole 250 m cell,
  // and a cell is its region's when the shape holds its centre (#1145). The
  // reshape is new content, never a lever: eight cells moved, and every spawn,
  // hull, emitter, marker, pack and mission region stands on the ground it
  // stood on in rectangles. `missionUnderworks.test.ts` pins it.
  regions: [
    // A box because it is the whole map, painted first.
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 3000,
      biome: Biome.ThermalVein,
      floorM: 1300,
      note: "The Face — the wall, the grid's humming ground. Painted first; everything else is cut into it",
    },
    // The band, with Vayle's sector hanging a row further down the wall under
    // its frame's own three columns (x 500-1,250). Thermal Vein like the Face
    // it was cut from, so only the floor under those three cells moved.
    {
      shape: 'polygon',
      points: [
        [0, 0],
        [4000, 0],
        [4000, 750],
        [1500, 750],
        [1000, 1000],
        [750, 1000],
        [500, 750],
        [0, 750],
      ],
      biome: Biome.ThermalVein,
      floorM: 1050,
      note: "The Upper Berths — the city's lower berth band. Sector Vayle's frame stands here",
    },
    // A box because it is built, and the mission's `the-yard`, where the pour
    // is held, is this same rectangle.
    {
      x: 1500,
      y: 750,
      widthM: 1000,
      heightM: 500,
      biome: Biome.ThermalVein,
      floorM: 1200,
      note: 'The Works Yard — the casting yard: the pour, the muster, the tungsten',
    },
    // A box: the one opening in the overhang, two cells over the root
    // aperture's two. A shape that painted other cells would move the dive,
    // and one that did not would paint these same two.
    {
      x: 1750,
      y: 1500,
      widthM: 500,
      heightM: 250,
      biome: Biome.ThermalVein,
      floorM: 2100,
      note: "The Throat — the one open shaft into the Underworks: the dive, and the ledger's first page",
    },
    // The overhang's lip climbs a row up the wall across the five columns west
    // of x 1,250, toward Vayle, and holds the throat's row from there east. The
    // five cells it took were open Face at PF 0.45; no line from the column's
    // seats, a marker or a mission region to the alarm, the complaint or a
    // pack's authored position crosses them, and the throat is still the only
    // water that opens into the works.
    {
      shape: 'polygon',
      points: [
        [0, 1500],
        [1000, 1500],
        [1500, 1750],
        [4000, 1750],
        [4000, 3000],
        [0, 3000],
      ],
      biome: Biome.CoralRuins,
      floorM: 2100,
      ceilingM: 1900,
      note: "The Underworks — the Surface Age's vent works under the city's overhang: water only between roof and floor, reached only by the throat, priced only in crush",
    },
  ],
  // One spawn, at the works yard. The offsets address a pre-built Foundry the
  // mission never places; the column is seated in the constructor.
  spawns: [{ x: 2000, y: 1000, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources: a breach writ (§11).
  resources: [],
  // No hazard sites: the hazard is the map (§11).
  hazards: [],
};
