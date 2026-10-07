/**
 * The Rim — docs/mission-prospect.md §11; docs/maps.md, "Mission maps".
 *
 * The Mouth's northern edge: staging, slopes, crystal terraces, and the lip.
 * South of the map is the depression, and the map declines to author it
 * (docs/culture.md §6). The whole map lies below the thermocline — the
 * campaign's first — so the expedition is acoustically alone from the first
 * tick, per docs/systems-echo.md §3's argument about the deep field.
 *
 * No resources authored, deliberately: the writ proves the field; it does
 * not open it, and a map that carried minable crystal would be arguing with
 * its own mission.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — one seat, not
 * balanced, resolved by mission id and nothing else.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const MOUTH_RIM: MapDefinition = {
  id: 'mouth-rim',
  name: 'The Rim',
  idealUse: 'The Ledger, mission six. The only candidate field, and everyone already on it.',
  seats: 1,
  widthM: 6000,
  heightM: 4000,
  doc: 'docs/mission-prospect.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 2600,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones; every number a shape states is a whole 250 m cell,
  // and a cell is its region's when the shape holds its centre (#1146). Every
  // point the five missions on this map seat, sound, order or drive, and every
  // cell of their mission regions, stands on the ground it stood on when these
  // were all rectangles, every scripted move is routed as it was, and
  // `missionProspect.test.ts` pins both.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 6000,
      heightM: 4000,
      biome: Biome.OpenWater,
      floorM: 2600,
      note: "The Deep Water — the base water. Painted first; everything else is cut into it. It shows where the slopes' foot is cut back, at the terraces' depth",
    },
    // A box, because three missions restate it as a `staging` region, this
    // same rectangle: the return line is the water drawn.
    {
      x: 0,
      y: 0,
      widthM: 6000,
      heightM: 1000,
      biome: Biome.OpenWater,
      floorM: 1500,
      note: 'The Staging — the approach and the way home: below the layer, above the commitment. The return line',
    },
    // Its top row runs the map's whole width under the staging, so every way
    // south from the return line crosses it. Its foot is cut back in two
    // places, where the Deep Water shows at 2,600 m: a bay at the west edge
    // and the south-east corner. Between x 1,250 and x 5,500 m it stays
    // straight. A gully there pulled the Second Seeding's 20:30 ascent off its
    // route: a leg the ground refuses is planned toward the reachable cell
    // nearest its order, and the gully's head was nearer (#1146). Further east
    // readers ordered to 2,500 m cross it, node-one's grant reaches into its
    // last row, and First Arrival's reconnaissance and party stand on it.
    {
      shape: 'polygon',
      points: [
        [0, 1000],
        [6000, 1000],
        [6000, 1250],
        [5500, 2000],
        [1250, 2000],
        [750, 1500],
        [250, 1500],
        [0, 1750],
      ],
      biome: Biome.OpenWater,
      floorM: 2200,
      note: "The Slopes — the descent's ground: two thousand metres of arriving",
    },
    // A box, because First Arrival's hold is this same rectangle.
    {
      x: 0,
      y: 2000,
      widthM: 6000,
      heightM: 1000,
      biome: Biome.ResonanceField,
      floorM: 2600,
      note: 'The Terraces — crystal country at the rim: the six faces, and the ring that never settles',
    },
    // A box, because it is the whole southern kilometre at PF 1.60: moving
    // its edge anywhere moves trench water, and all five missions seat or
    // send something onto it.
    {
      x: 0,
      y: 3000,
      widthM: 6000,
      heightM: 1000,
      biome: Biome.AbyssalTrench,
      floorM: 3100,
      note: "The Lip — the depression's edge: it carries like a trench, because it is the beginning of one with no far wall. The attendants are here",
    },
  ],
  // One spawn, at the staging. The offsets address a pre-built Foundry the
  // mission never places; the expedition is seated in the constructor.
  spawns: [{ x: 3000, y: 500, foundryOffsetX: 0, foundryOffsetY: 0 }],
  resources: [],
  // No hazard sites: the hazard is the address (§11).
  hazards: [],
};
