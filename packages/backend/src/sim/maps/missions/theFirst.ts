/**
 * The First — docs/mission-the-three.md §11; docs/maps.md, "Mission maps".
 *
 * The deepest chapter-house in the Order, at 2,900 m where the Resonance
 * Fields break toward the trenches (docs/habitats.md §5): a shrine, a hospice
 * and a sealed room, cut into crystal, with the First Chord still aimed down
 * the trench axis and still tuned. Twelve minutes, no combat, nothing armed on
 * either side. Three facts about this water decide the mission and all three
 * are ground rather than script.
 *
 * **The house is four ceilings, each deeper than the last** — 2,600 over the
 * approach, 2,700 over the chord, 2,750 over the hospice, 2,800 over the
 * sealed room. So the building is entered by diving under rock four times and
 * every room of it is water nobody reaches by accident. Nothing enforces that:
 * `Terrain.admits` refuses a hull above a roof, and there is no beat, no
 * predicate and no fence anywhere in the mission that says the same thing. The
 * escort's courtesies are the player's; the roofs are the map's.
 *
 * **The foot's floor is 2,700 and not 2,300, and the roof is the reason.** Two
 * cells connect only at a depth both admit, so a foot floored at the party's
 * own 2,300 m under an approach roofed at 2,600 would leave three hundred
 * metres of rock between the escort and the house and no way in at all. The
 * deeper foot buys the dive its water: the party drops to 2,650 while still
 * over the foot, crosses in, and goes on down. §11 records the number rather
 * than leaving it to be discovered here.
 *
 * **The Axis carries, and it carries the wrong way.** One strip of Abyssal
 * Trench along the south edge at PF 1.60, into a house whose instrument has
 * been pointed down it for thirty-six years — so the only loud water on the
 * map is the water the First is listening to. Its floor is 3,100 m, one
 * hundred metres below `DEPTH.MAX_M`, which is the deepest a hull can be
 * *ordered* (`match.ts`, `applyDepth`): the trench bottom is deliberately
 * somewhere the player cannot go, exactly as `mouth-rim`'s Lip is. It is also
 * the second way in — a hull that dived to 2,900 over the trench could come up
 * into the chord from the south — and the mission does not fence that either.
 * It is longer, it is 1.60 water, and a dive at 72 SIG on that bearing is the
 * loudest thing anybody could do on this map.
 *
 * That door is under all three rooms and not only under the chord. The trench
 * runs the map's whole width and the rooms stop at y = 2500, so the hospice
 * shares 2,750–2,900 m of column with it and the sealed room 2,800–2,900: the
 * cells and the case are both reachable from the south without crossing the
 * hall. §11 names the chord because that is the approach it expects, and the
 * map fences none of the three — §6's hospice is heard and never entered
 * because the escort declines to go in, not because the ground refused it.
 *
 * Everything else the systems could have said, this ground refuses to let them
 * say. The shallowest seat is 2,300 m, so every hull is Abyssal from the first
 * tick and the four PR-3 refits in §3 cover the whole map — depth costs
 * nothing here and means one thing only, which is what the certificates cost.
 * The duct's bottom is 1,300 m, fourteen hundred metres above the shallowest
 * ground, so the thermocline's factor is 1 on every pair on the map. One
 * system per mission (docs/mission-aptitude.md §11), and the other axes are
 * given nothing to say.
 *
 * The sealed room is cut off the chord's **east** end rather than off the
 * hospice, which is a change to docs/habitats.md §5 that §13 names rather than
 * smuggles: a room behind the hospice would make the only route to the case a
 * transit through the Three's cells, and §6's whole argument is that the
 * hospice is heard and never entered.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, not balanced, resolved by mission id and
 * nothing else. No blooms and no hazard sites either, and nothing to seed:
 * below 2,700 m the column holds nothing at all (docs/bestiary.md §4), so the
 * mission runs with `fauna: false` and authors no creature.
 *
 * **The ground is shared's** (`THE_FIRST_GROUND`, #1625), as the Outer Formations' is: the
 * continuous world draws this map before any room exists (docs/world-map.md
 * §7.9), so its regions are authored once, in `@echoes/shared`, and spread in
 * here. What stays here is the spawn.
 */

import { THE_FIRST_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const THE_FIRST: MapDefinition = {
  id: 'the-first',
  name: 'The First',
  idealUse: 'The Second Chord, mission five. A house in working order, and nothing in it is safe.',
  seats: 1,
  doc: 'docs/mission-the-three.md §11; docs/maps.md — Mission maps',
  ...THE_FIRST_GROUND,
  // One spawn, at the foot (§11). The offsets address a pre-built Foundry the
  // mission never places: construction is locked, `startingNodules` is 0, and
  // there is nothing on this map to build or to buy.
  spawns: [{ x: 2000, y: 375, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no resources, because the First is finished. No hazard sites and no
  // blooms: the only thing that happens on this map is a house keeping its
  // hours.
  resources: [],
  hazards: [],
};
