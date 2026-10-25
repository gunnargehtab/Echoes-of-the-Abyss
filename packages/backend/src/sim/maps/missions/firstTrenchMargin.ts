/**
 * The Western Margin — docs/mission-exposure.md §11; docs/maps.md, "Mission
 * maps".
 *
 * The top step of the trench country, west end: a shelf lane above the layer,
 * a long slope through it, and the worked ground along the First Trench's rim
 * painted with the trench's own carrying acoustics — the margin carries its
 * own economy to anyone listening, which is the entire mission. One vent
 * pocket (the Hollow) is the only masked water on the Directorate's side of
 * the door.
 *
 * The worked ground stops at 1,750 m — fifty metres above the Abyssal band —
 * so the survey transits everything on its PR-2 rating and mission 5 keeps
 * its own lesson.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — one seat, no
 * resources, not balanced, resolved by mission id and nothing else.
 *
 * **The ground is shared's** (`WESTERN_MARGIN_GROUND`, #1612), as Sorrowgate's
 * and the Banding Ground's are: the continuous world draws this map before any
 * room exists (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { WESTERN_MARGIN_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const FIRST_TRENCH_MARGIN: MapDefinition = {
  id: 'first-trench-margin',
  name: 'The Western Margin',
  idealUse: "The Ledger, mission four. Somebody else's economy, standing in the water.",
  seats: 1,
  doc: 'docs/mission-exposure.md §11; docs/maps.md — Mission maps',
  ...WESTERN_MARGIN_GROUND,
  // One spawn, on the shelf lane. The offsets address a pre-built Foundry the
  // mission never places; the survey is seated in the constructor.
  spawns: [{ x: 2500, y: 375, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources: a charter, not a works order (§11).
  resources: [],
  // No hazard sites: the weather here is the roster (§11).
  hazards: [],
};
