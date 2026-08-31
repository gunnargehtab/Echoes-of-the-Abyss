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
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 6000,
      heightM: 4000,
      biome: Biome.OpenWater,
      floorM: 2600,
      note: 'The Deep Water — the base water. Painted first; everything else is cut into it',
    },
    {
      x: 0,
      y: 0,
      widthM: 6000,
      heightM: 1000,
      biome: Biome.OpenWater,
      floorM: 1500,
      note: 'The Staging — the approach and the way home: below the layer, above the commitment. The return line',
    },
    {
      x: 0,
      y: 1000,
      widthM: 6000,
      heightM: 1000,
      biome: Biome.OpenWater,
      floorM: 2200,
      note: "The Slopes — the descent's ground: two thousand metres of arriving",
    },
    {
      x: 0,
      y: 2000,
      widthM: 6000,
      heightM: 1000,
      biome: Biome.ResonanceField,
      floorM: 2600,
      note: 'The Terraces — crystal country at the rim: the six faces, and the ring that never settles',
    },
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
