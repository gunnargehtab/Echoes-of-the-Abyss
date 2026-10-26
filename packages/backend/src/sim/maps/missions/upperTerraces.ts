/**
 * The Upper Terraces — docs/mission-conclave-attending.md §11; docs/maps.md,
 * "Mission maps".
 *
 * The head of the Ninth from above rather than from the face: two terraces cut
 * into its walls facing each other across open trench, the attending galleries
 * under the southern one, and the channel leaving south between the galleries'
 * two benches. North is shallow and south is deep, as everywhere in the Rift
 * (docs/world-map.md). Three facts about this water decide the mission, and all
 * three are ground rather than script.
 *
 * **The crossing carries at 1.60 and the terraces do not.** Cut structure is
 * Coral Ruins at 0.80 either side of trench water at 1.60 (docs/habitats.md §8;
 * docs/systems-echo.md §3), and during a conclave the terraces are the quieter
 * half — so a cohort under way between them is the only sound there is. A
 * Chorister cruising at 24 is contact at 4,515 m and this chart is 4,000 m from
 * the Undermarshalcy's back wall to the sill: there is no station on it from
 * which a crossing is inaudible. That is the whole mission, and it is a biome
 * and a rectangle rather than a rule.
 *
 * **The Cantorate's terrace stands between the crossing and the axis at
 * 2,800 m, and that floor decides what can come up the trench.** Ground refuses
 * a driven creature exactly as it refuses a hull — `faunaSystem` moves every
 * creature through `Terrain.resolveStep`, and a step into water the mover's own
 * depth does not fit is not taken — so along the channel 2,800 m is the deepest
 * line that reaches the crossing at all, and a colossus authored at 3,000 would
 * stall against the terrace's face at y 3,250 and never arrive. Both arrivals
 * are driven at the terrace's own floor for that reason (§11, §13), and the
 * dome is seated a hundred metres deeper than the line that grinds it.
 *
 * **Nothing here is near the layer, and most of it is water nobody stands in.**
 * The shallowest floor authored is 2,750 m and the shallowest water any hull
 * holds is 2,700 — fourteen hundred metres under the duct's own floor, which
 * `THERMOCLINE` puts at 1,300 — so every pair is Below-to-Below and each path
 * is priced by the biome alone. And `DEPTH.MAX_M` refuses a depth order below
 * 3,000 m, and a hull following the floor stops there too (#1185), so the
 * head's 3,400 m is scenery with a number on it — while the arrivals' 2,800 m
 * is a hundred metres under the seat the called hold, and is the one depth on
 * this chart where the column and the thing in the trench are in the same
 * water.
 *
 * **The galleries are one region and two benches, and the axis is what makes
 * the difference.** §11 authors the stalls whole and carries the channel's head
 * the last five hundred metres *between* them: Attendance's stalls are "open on
 * the axis" (docs/mission-attendance.md §11), and read from above, open on the
 * axis means the axis goes between them. That is a stated deviation from the
 * chart `attendingGalleries.ts` built — that literal cuts the channel north
 * only as far as the galleries' southern edge and does not run through them —
 * and §11 states it rather than quietly agreeing, calling it the row a reviewer
 * should overrule first if either chart has to move. Painted in the document's
 * order the one row becomes two 750 m benches either side of a 1,000 m strip,
 * which is exactly what the mission addresses as `galleries-west` and
 * `galleries-east`.
 *
 * **This is the ground before the dome came down.** At 11:00 the mission takes
 * both benches to floor 2,900 and Abyssal Trench, one `ground` beat each at one
 * tick: the shadows go, 0.80 becomes 1.60, and a hundred metres of rubble
 * stands where the stalls were. A map literal cannot carry a mission's repaint
 * (docs/campaign.md §2 rule 5), so the benches are authored here as they stood
 * at 00:00 and the beats say what happened to them — the Furrow's literal makes
 * the same argument in the other direction, a garden arriving where this one
 * has a building leave (docs/mission-deep-furrow.md §11). The strip between
 * them is named by neither beat and keeps its 3,400 m floor, which is the
 * second reason the channel is cut through the galleries rather than drawn
 * around them: a raised floor under a driven line moves that line, and this is
 * the door the return comes through every cycle and the door the column leaves
 * by at the close.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, no hazard sites, not balanced, resolved by
 * mission id and nothing else. `fauna` is off with it, because both colossi are
 * authored `creature` beats and the default seeder is a skirmish roster that
 * cannot put an animal at a named sill at a named tick (docs/mission-intake.md
 * §13).
 *
 * **The ground is shared's** (`UPPER_TERRACES_GROUND`, #1624), as the
 * galleries' is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { UPPER_TERRACES_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const UPPER_TERRACES: MapDefinition = {
  id: 'upper-terraces',
  name: 'The Upper Terraces',
  idealUse:
    'The Attending, mission six. Two terraces facing each other, and the water between them that carries.',
  seats: 1,
  doc: 'docs/mission-conclave-attending.md §11; docs/maps.md — Mission maps',
  ...UPPER_TERRACES_GROUND,
  // One spawn, on the Undermarshalcy's terrace (§11), and irrelevant: every
  // party on this map is seated directly. The offsets address a pre-built
  // Foundry a mission never places — nothing is built during a calling (§2).
  spawns: [{ x: 2500, y: 375, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no resources, no hazard sites, no second spawn. There is no economy
  // on a chart whose whole stake is who crossed the middle of it.
  resources: [],
  hazards: [],
};
