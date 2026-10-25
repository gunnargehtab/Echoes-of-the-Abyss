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
 *
 * **The ground is shared's** (`HOLDING_BOARD_GROUND`, #1623), as the Rim's
 * is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { HOLDING_BOARD_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const HOLDING_BOARD: MapDefinition = {
  id: 'holding-board',
  name: 'Board Country',
  idealUse: 'The Ledger, mission seven. Nine items, one chamber, and the ninth.',
  seats: 1,
  doc: 'docs/mission-item-nine.md §11; docs/maps.md — Mission maps',
  ...HOLDING_BOARD_GROUND,
  // One spawn, at the rail. The offsets address a pre-built Foundry the
  // mission never places; the flight is seated in the constructor.
  spawns: [{ x: 2000, y: 1900, foundryOffsetX: 0, foundryOffsetY: 0 }],
  resources: [],
  hazards: [],
};
