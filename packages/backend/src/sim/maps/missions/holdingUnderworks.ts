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
 *
 * **The ground is shared's** (`HOLDING_UNDERWORKS_GROUND`, #1623), as Board
 * Country's is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { HOLDING_UNDERWORKS_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const HOLDING_UNDERWORKS: MapDefinition = {
  id: 'holding-underworks',
  name: 'The Underworks',
  idealUse:
    'The Ledger, mission five. One casting, two apertures, and a ledger that does not heal.',
  seats: 1,
  doc: 'docs/mission-tolerance.md §11; docs/maps.md — Mission maps',
  ...HOLDING_UNDERWORKS_GROUND,
  // One spawn, at the works yard. The offsets address a pre-built Foundry the
  // mission never places; the column is seated in the constructor.
  spawns: [{ x: 2000, y: 1000, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources: a breach writ (§11).
  resources: [],
  // No hazard sites: the hazard is the map (§11).
  hazards: [],
};
