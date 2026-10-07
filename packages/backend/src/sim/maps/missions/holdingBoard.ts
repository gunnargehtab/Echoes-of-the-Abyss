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
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones; every number a shape states is a whole 250 m cell,
  // and a cell is its region's when the shape holds its centre (#1147). Every
  // spawn, hull and item the mission places stands on the ground it stood on
  // when these were all rectangles, and `missionItemNine.test.ts` pins it.
  regions: [
    // A box, because it is the whole map.
    {
      x: 0,
      y: 0,
      widthM: 3000,
      heightM: 2500,
      biome: Biome.ThermalVein,
      floorM: 1350,
      note: "The Wall — Board country's water: the grid's hum at its deepest and most settled. Painted first",
    },
    // A box, because it is built: the array floor the open arrays stand on.
    {
      x: 0,
      y: 0,
      widthM: 1000,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 1250,
      note: 'The Registry — the open arrays and their watch: the ears that make a record a record',
    },
    // The hall's long vault, round at both ends, with the rail midway along it.
    // Its frame is a cell longer at each end than the box it was, and holds
    // every cell centre the box held: the two it adds, at either end of its
    // middle row, were the Wall's Thermal Vein on the same floor, and no line
    // from the flight to an item or the registry watch crosses either.
    {
      shape: 'ellipse',
      x: 1250,
      y: 1500,
      widthM: 1500,
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
