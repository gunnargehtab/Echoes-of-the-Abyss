/**
 * Board Country — docs/mission-item-nine.md §11; docs/maps.md, "Mission
 * maps".
 *
 * The bottom of the Holding: the wall's deep berths, the registry's open
 * arrays, and the Underway — Asset 002, the Surface Age hull the concern was
 * chartered inside, and the one Coral Ruins chamber the Consortium owns. The
 * whole map sits in and just under the thermocline's duct, which is Board
 * country's actual address: the chamber's sounds carry to everyone present,
 * a little, and no further than the wall.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — one seat, no
 * resources, resolved by mission id and nothing else.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const HOLDING_BOARD: MapDefinition = {
  id: 'holding-board',
  name: 'Board Country',
  idealUse: 'The Ledger, mission seven. Nine items, one chamber, and the ninth.',
  seats: 1,
  widthM: 3000,
  heightM: 2500,
  doc: 'docs/mission-item-nine.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1350,
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 3000,
      heightM: 2500,
      biome: Biome.ThermalVein,
      floorM: 1350,
      note: "The Wall — Board country's water: the grid's hum at its deepest and most settled. Painted first",
    },
    {
      x: 0,
      y: 0,
      widthM: 1000,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 1250,
      note: 'The Registry — the open arrays and their watch: the ears that make a record a record',
    },
    {
      x: 1500,
      y: 1500,
      widthM: 1000,
      heightM: 750,
      biome: Biome.CoralRuins,
      floorM: 1350,
      note: 'The Underway — Asset 002: the Surface Age hull the concern was chartered inside. Occluded, honest, and listening',
    },
  ],
  // One spawn, at the rail. The offsets address a pre-built Foundry the
  // mission never places; the flight is seated in the constructor.
  spawns: [{ x: 2000, y: 1900, foundryOffsetX: 0, foundryOffsetY: 0 }],
  resources: [],
  hazards: [],
};
