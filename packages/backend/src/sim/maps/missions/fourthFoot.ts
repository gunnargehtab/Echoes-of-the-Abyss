/**
 * The Fourth's Foot — docs/mission-the-dome.md §11; docs/maps.md, "Mission maps".
 *
 * The Fourth Trench and the kilometre past it. North is the freight shortcut
 * closed to chartered traffic while the inquiry runs; south of the Deep Yard
 * the pipe opens, falls from 1,700 m to 2,400 m and stops being a corridor —
 * the Fan, the Foot, and the cohort galleries cut into the fan's east wall.
 * This is *Baffle*'s tide from the side that is counting (§1).
 *
 * Three facts about this water decide the mission, and none of them is a fence
 * — which is why all three are ground and not one of them is a beat:
 *
 * - **The trench is a five-hundred-metre pipe that carries at 1.6.** No
 *   secrets down its length, only distances: a picket standing in it hears the
 *   convoy enter, transit and arrive, and is never out of a Cruiser's
 *   nine-hundred-metre gun while the convoy passes. Each gate is therefore a
 *   decision rather than a wall, and it is the paint that makes it one.
 * - **The only quiet water on the map belongs to the concern.** Two vent
 *   pockets at PF 0.45, chartered, with a Baffle station moored in each. The
 *   picket has no cover anywhere and the mission does not pretend it wants
 *   any.
 * - **The foot is outside the Ledger's chart and outside the convoy's guns.**
 *   The dome stands on the last bench a thousand metres south of the yard's
 *   berth, and the array under it at 950 m — fifty metres past a Cruiser's
 *   reach. In a chart the Cantorate drew that is not a coincidence, and
 *   nobody in the water ever mentions it.
 *
 * **What it shares with `fourth-trench`, and what it does not.** Rows 2–8 —
 * the Staging, both walls, the Trench, both lay-bys and the Deep Yard — are
 * `fourthTrench.ts`'s shapes, biomes and floors to the metre, and the
 * Margin is that map's base water run a thousand metres further south
 * (docs/mission-baffle.md §11). The last three regions are ground *Baffle*
 * never had a reason to draw: that chart's last 250 m are the head of the Fan
 * and the shelf either side of it here, which is where it ran out of paper
 * rather than out of water (§11). The seat moves too — the spawn is at the
 * mouth here, not at the staging, because the staging is the convoy's muster
 * and the convoy is somebody else's party in this mission.
 *
 * A second literal rather than a longer first one, deliberately: `fourth-trench`
 * is a shipped mission's ground, and growing it southward would move *Baffle*'s
 * own map under *Baffle*'s own feet. The duplication is the seam the two
 * documents are written to have no seam across.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, not balanced, resolved by mission id and
 * nothing else.
 *
 * **The ground is shared's** (`FOURTH_FOOT_GROUND`, #1628), as the Shallow
 * Band's is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { FOURTH_FOOT_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const FOURTH_FOOT: MapDefinition = {
  id: 'fourth-foot',
  name: "The Fourth's Foot",
  idealUse:
    "The Attending, mission three. The Ledger's trench from the counting side, and the deep it opens into.",
  seats: 1,
  doc: 'docs/mission-the-dome.md §11; docs/maps.md — Mission maps',
  ...FOURTH_FOOT_GROUND,
  // One spawn, at the mouth (§11) — irrelevant to play, since every party is
  // seated directly, and authored because a map needs one seat. The offsets
  // address a pre-built Foundry the mission never places: a closure re-rigs
  // nothing, by anyone.
  spawns: [{ x: 1500, y: 4000, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources: a closure mines nothing (§11).
  resources: [],
  // No hazard sites. The corridor's weather is the convoy, and the foot's is a
  // decision the player has not made yet (§7).
  hazards: [],
};
