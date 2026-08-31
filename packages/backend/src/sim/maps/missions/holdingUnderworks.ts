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
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 3000,
      biome: Biome.ThermalVein,
      floorM: 1300,
      note: "The Face — the wall, the grid's humming ground. Painted first; everything else is cut into it",
    },
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 1050,
      note: "The Upper Berths — the city's lower berth band. Sector Vayle's frame stands here",
    },
    {
      x: 1500,
      y: 750,
      widthM: 1000,
      heightM: 500,
      biome: Biome.ThermalVein,
      floorM: 1200,
      note: 'The Works Yard — the casting yard: the pour, the muster, the tungsten',
    },
    {
      x: 1750,
      y: 1500,
      widthM: 500,
      heightM: 250,
      biome: Biome.ThermalVein,
      floorM: 2100,
      note: "The Throat — the one open shaft into the Underworks: the dive, and the ledger's first page",
    },
    {
      x: 0,
      y: 1750,
      widthM: 4000,
      heightM: 1250,
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
