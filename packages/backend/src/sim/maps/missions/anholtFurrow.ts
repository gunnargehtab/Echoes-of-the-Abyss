/**
 * The Furrow — docs/mission-deep-furrow.md §11; docs/maps.md, "Mission maps".
 *
 * A cleft under the north shoulder, cut from no archetype: the Mid-Water
 * freight lanes below the plateaus' drop, two walls of rock, and the one road
 * between them falling to a garden and then to a sill. North is shallow and
 * home; south is the sill and the Directorate's water, as everywhere in the
 * Rift (docs/world-map.md). Three facts about this water decide both missions
 * played on it, and all three are ground rather than script.
 *
 * **The base floor is the duct's top.** 1,100 m, so the lanes end where the
 * layer begins (`THERMOCLINE.DEPTH_M` is 1,200 and the duct is ±100). The Foot
 * at 900 m and the sill at 2,600 are therefore on different maps until the day
 * dives, and the plateau's whole way of being safe — being heard from home —
 * is switched off at the duct rather than by a rule the mission invents. A
 * dive is loud and fixed, so *where* you cross is the lesson (§4), and the
 * cleft is the only place there is to cross.
 *
 * **The walls are solid and the cleft is 1,500 m wide.** Rock in the map's
 * own spelling, `{ floorM: 0, ceilingM: 1 }` — the Fourth Trench's
 * (docs/mission-baffle.md §11) — so the middle of the road is 750 m from
 * either wall and 650 m from either Hollow. That distance is not a fence and
 * is not meant to be one: it is the reason a hull down the middle passes
 * nothing and a hull hugging a wall passes both figures a Hollow strikes on.
 *
 * **The furrows are painted Kelp Forest on a trench floor.** PF 0.55 against
 * the cleft's 1.6, because seeded ground absorbs — a hull is roughly three
 * times as audible the moment it leaves the garden, which is the whole of what
 * ten years of tending bought. And the furrows' 2,200 m lies fifty metres
 * under the floor of the Hollows' band, so the garden is the only water in
 * this cleft where a quiet hull is beyond the reach of everything that hunts.
 *
 * The Second Furrow is bare rock in the literal and is Abyssal Trench in
 * `ANHOLT_FURROW_GROUND` on purpose. Both missions turn it Kelp Forest with a
 * `ground` beat — *Deep Furrow* when the sowing completes, *In Writing*
 * restating it at 00:00 — and a map literal cannot carry a mission's repaint
 * (docs/campaign.md §2 rule 5). The literal is the ground before anyone sowed
 * it, once, and the missions say what happened to it.
 *
 * **Shared by two missions, and owned by one.** docs/mission-deep-furrow.md
 * §11 owns this literal; docs/mission-in-writing.md §11 reuses it unchanged,
 * region for region, and adds only markers, structures, parties and that
 * ground beat — never geometry. Where the two documents' tables could ever
 * disagree, deep-furrow is the owner and in-writing is the reuse. It is the
 * second such pair, after Marr Plateau under *Tend* and *Convocation*.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, not balanced, resolved by mission id and
 * nothing else. Every creature on it is authored and `fauna` is off, because
 * the default seeder is a skirmish roster and cannot put two ambushers on two
 * named walls (docs/mission-intake.md §13).
 *
 * **The ground is shared's** (`ANHOLT_FURROW_GROUND`, #1638), as the Kell
 * Shoulder's is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { ANHOLT_FURROW_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const ANHOLT_FURROW: MapDefinition = {
  id: 'anholt-furrow',
  name: 'The Furrow',
  idealUse:
    'The Second Seeding, missions four and five. Two walls of rock, one road, and a garden fifty metres under the Hollows.',
  seats: 1,
  doc: 'docs/mission-deep-furrow.md §11; docs/maps.md — Mission maps',
  ...ANHOLT_FURROW_GROUND,
  // One spawn, at the Foot (§11). The offsets address a pre-built Foundry
  // neither mission places: the working day is seated in the constructor and
  // there is nothing here to build with.
  spawns: [{ x: 2000, y: 250, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no nodule fields and no crystal: the day earns nothing, because the
  // work today is being somewhere.
  resources: [],
  // No bloom-share nodes, and not for want of a garden: a bloom must stand on
  // Shelf ground (docs/economy.md §6; maps.test.ts) and the shallowest water
  // on this map is 900 m. Nor does the map seat anything in the Furrow. In
  // Deep Furrow it is a grant, the mission region `standing-furrow`, and that
  // mission seats no structure at all; In Writing seats Spore Veils in it.
  // What stands there is a mission's business and not the map's.
  // No hazard sites: the weather here is the walls.
  hazards: [],
};
