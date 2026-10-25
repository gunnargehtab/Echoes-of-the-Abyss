/**
 * The Attending Galleries — docs/mission-attendance.md §11; docs/maps.md,
 * "Mission maps".
 *
 * Sufficiency's southern face at the head of the Ninth Trench: a city cut into
 * the top of a trench, and the trench aimed at the Mouth's approach. Two facts
 * about this water decide the mission and both are ground rather than script.
 *
 * **The whole map is below the thermocline**, so the layer never enters into
 * it — a fleet at 3,000 m and a fleet at 400 m are on different maps
 * (docs/systems-depth.md §1), and this mission is entirely on the far one.
 * Every pair on this map is Below-to-Below, which is the one row of the
 * thermocline table that is simply 1.
 *
 * **The benches and the channel are geometry nothing stands on.** They are
 * authored at 3,200 and 4,100 m against a ruleset ceiling of 3,000
 * (`DEPTH.MAX_M`), so every hull here holds 3,000 m over water it never
 * touches: nothing is lifted, nothing crushes, and the channel is a corridor
 * for sound rather than for movement. The floor under it is a number the
 * return comes up out of (docs/world-map.md §3, "The Ninth, head to Mouth";
 * #421), and a map may author a floor below the ceiling for exactly that.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, not balanced, resolved by mission id and
 * nothing else. This is also the first mission map in the bible with nothing
 * alive on it but the player: no fauna seeded, and no authored creature.
 *
 * **The ground is shared's** (`ATTENDING_GALLERIES_GROUND`, #1624), as Board
 * Country's is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { ATTENDING_GALLERIES_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const ATTENDING_GALLERIES: MapDefinition = {
  id: 'attending-galleries',
  name: 'The Attending Galleries',
  idealUse: 'The Attending, mission one. A gallery of sleepers, and the Ninth aimed at the Mouth.',
  seats: 1,
  doc: 'docs/mission-attendance.md §11; docs/maps.md — Mission maps',
  ...ATTENDING_GALLERIES_GROUND,
  // One spawn, at the gallery face. The offsets address a pre-built Foundry a
  // mission never places: no economy here, and a shift produces nothing.
  spawns: [{ x: 2500, y: 1000, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources, no hazard sites, no second spawn: the stake is a page.
  resources: [],
  hazards: [],
};
