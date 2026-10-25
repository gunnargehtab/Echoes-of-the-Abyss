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
 *
 * **The ground is shared's** (`MOUTH_RIM_GROUND`, #1640), as the Furrow's is:
 * the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { MOUTH_RIM_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const MOUTH_RIM: MapDefinition = {
  id: 'mouth-rim',
  name: 'The Rim',
  idealUse: 'The Ledger, mission six. The only candidate field, and everyone already on it.',
  seats: 1,
  doc: 'docs/mission-prospect.md §11; docs/maps.md — Mission maps',
  ...MOUTH_RIM_GROUND,
  // One spawn, at the staging. The offsets address a pre-built Foundry the
  // mission never places; the expedition is seated in the constructor.
  spawns: [{ x: 3000, y: 500, foundryOffsetX: 0, foundryOffsetY: 0 }],
  resources: [],
  // No hazard sites: the hazard is the address (§11).
  hazards: [],
};
