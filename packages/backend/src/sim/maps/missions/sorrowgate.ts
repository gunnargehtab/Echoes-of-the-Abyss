/**
 * Sorrowgate — docs/mission-sorrowgate.md §11; docs/maps.md, "Mission maps".
 *
 * The terminus of a pre-collapse civic transit line, and the line ran out over
 * a deep basin. Two facts about the water decide the whole mission and both are
 * ground rather than script: the chamber sits at 1,500 m and the thermocline
 * sits at 1,200 m, so nothing said in the court carries upward; and the basin
 * underneath is Abyssal Trench at PF 1.6, which is how a ping fired in the
 * chamber reaches something living in it.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately.** The public
 * catalogue is what the setup screen renders and what `maps.test.ts` holds to
 * two-to-four seats, a crystal field and a nodule field per spawn — every one
 * of which a one-seat chamber with no economy fails, and rightly. A mission
 * owns its own water: this map is resolved by mission id and cannot be chosen
 * in a skirmish. It is also why the six header fields are authored inline here
 * instead of spread from a shared header — there is no public half of it.
 *
 * Cut from Map Type 5's shape (multi-layered ruins, collapsed domes, a tunnel
 * beneath the main lane) without being a Sunken Metropolis: that archetype
 * promises a four-seat competitive layout and this is a room the player is
 * scripted into.
 *
 * **The ground is shared's** (`SORROWGATE_GROUND`, #1456): the continuous
 * world draws this map before any room exists (docs/world-map.md §7), so its
 * regions are authored once, in `@echoes/shared`, and spread in here. What
 * stays here is what a client has not earned before a match — the spawn and,
 * in the missions, every force and script.
 */

import { SORROWGATE_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const SORROWGATE: MapDefinition = {
  id: 'sorrowgate',
  name: 'Sorrowgate',
  idealUse: 'Prologue only. A court, a gate, and the water underneath it.',
  seats: 1,
  doc: 'docs/mission-sorrowgate.md §11; docs/maps.md — Mission maps',
  ...SORROWGATE_GROUND,
  // One spawn, at the arch. The offsets address a pre-built Foundry that a
  // mission never places: there is no economy here and nothing to build, and
  // the mission seats its own order of battle in the constructor.
  spawns: [{ x: 2550, y: 2150, foundryOffsetX: 0, foundryOffsetY: 0 }],
  resources: [],
  hazards: [],
};
