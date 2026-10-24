/**
 * The Banding Ground — docs/mission-intake.md §11; docs/maps.md, "Mission maps".
 *
 * The upper Ninth above Sufficiency and below the duct: the doorway between
 * Mid-Water and the Abyssal, 1,500 m at the ascent's foot to 2,400 m in the
 * throat, and the whole map sits in it. Three facts about this water decide
 * the mission and all three are ground rather than script.
 *
 * **The map is where the Directorate's income lives.** A cohort economy is
 * fauna, fauna stop at 2,700 m, and the attending galleries stand below that —
 * so the banding ground is *above* the city, in the one band of the Rift the
 * Hollow guards (§1). The map's depth and the mission's subject are the same
 * choice.
 *
 * **The overhangs are the map's one piece of gameplay geometry and they are
 * not a fence.** They stand at 2,150 m against a bench floor of 2,250 — a
 * hundred metres of lift, which is nothing, and that is the point: nothing on
 * this map stops the intake going anywhere. The outer Hollows on the two stand
 * four kilometres apart, two of them open bench, and four kilometres is the
 * whole problem.
 * The map is not difficult. It is *large*, and the intake is twelve (§11).
 *
 * **Every useful move is upward.** The Hollows sit 200 m above the muster, the
 * ascent is 400 m above that, and ascent is slow and silent — the exact
 * inverse of the galleries, one mission earlier, where the decision was a
 * dive (§11).
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, not balanced, resolved by mission id and
 * nothing else. Every creature on it is authored, because the default seeder
 * is a skirmish roster and cannot put eight ambushers in named places (§13).
 *
 * **The ground is shared's** (`BANDING_GROUND_GROUND`, #1598), as Sorrowgate's
 * is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { BANDING_GROUND_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const BANDING_GROUND: MapDefinition = {
  id: 'banding-ground',
  name: 'The Banding Ground',
  idealUse:
    'Intake, mission two. The upper Ninth above Sufficiency, and eight animals on its walls.',
  seats: 1,
  doc: 'docs/mission-intake.md §11; docs/maps.md — Mission maps',
  ...BANDING_GROUND_GROUND,
  // One spawn, at the muster (§11). The offsets address a pre-built Foundry a
  // mission never places: the intake is twelve hulls and there is nothing to
  // build.
  spawns: [{ x: 2500, y: 750, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no resources, no hazard sites, no second spawn. The money is eight
  // animals, and they are the mission's to place.
  resources: [],
  hazards: [],
};
