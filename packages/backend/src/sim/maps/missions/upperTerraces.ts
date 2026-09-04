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
 * The shallowest floor authored is 2,750 m, fourteen hundred under the duct's
 * own floor, so every pair is Below-to-Below and each path is priced by the
 * biome alone. And `DEPTH.MAX_M` refuses a hull below 3,000 m rather than
 * clamping it, so the head's 3,400 m is scenery with a number on it — while the
 * arrivals' 2,800 m is a hundred metres under the seat the called hold, and is
 * the one depth on this chart where the column and the thing in the trench are
 * in the same water.
 *
 * **The galleries are one region and two benches, and the axis is what makes
 * the difference.** §11 authors the stalls whole and cuts the channel's head
 * through the middle of them: the same choice `attendingGalleries.ts` made from
 * the face, read from above, where "open on the axis" means the axis goes
 * between them. The two documents' charts of this trench disagree about those
 * five hundred metres and §11 says so rather than quietly agreeing. Painted in
 * the document's order the one row becomes two 750 m benches either side of a
 * 1,000 m strip, which is exactly what the mission addresses as
 * `galleries-west` and `galleries-east`.
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
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const UPPER_TERRACES: MapDefinition = {
  id: 'upper-terraces',
  name: 'The Upper Terraces',
  idealUse:
    'The Attending, mission six. Two terraces facing each other, and the water between them that carries.',
  seats: 1,
  widthM: 5000,
  heightM: 4000,
  doc: 'docs/mission-conclave-attending.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 3400,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the galleries be painted whole
  // and the channel cut through the middle of them — the axis last, so the
  // stalls become the two benches the ground beat addresses. Every rectangle
  // lands on the 250 m cell grid and paints exactly the metres it reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.AbyssalTrench,
      floorM: 3400,
      note: 'The Head — the head of the Ninth. PF 1.60, painted first; everything else is cut into it',
    },
    {
      x: 1000,
      y: 0,
      widthM: 3000,
      heightM: 750,
      biome: Biome.CoralRuins,
      floorM: 2750,
      note: "The Undermarshalcy — the north terrace: command, the city's shallowest water, and where the called are seated",
    },
    {
      x: 1000,
      y: 750,
      widthM: 3000,
      heightM: 1750,
      biome: Biome.AbyssalTrench,
      floorM: 3400,
      note: "The Crossing — the open water between the terraces. It takes the head's own biome and floor and repaints nothing; it is on the chart because it is the water the mission is about, and a hull under way in it is the only sound there is, the length of the trench",
    },
    {
      x: 1000,
      y: 2500,
      widthM: 3000,
      heightM: 750,
      biome: Biome.CoralRuins,
      floorM: 2800,
      note: "The Cantorate — the south terrace, standing over the galleries: Ossary's seat, the cells, and where a calling is attended or is not. Its floor is the line both arrivals run, because it is the deepest one the terrace admits",
    },
    {
      x: 1250,
      y: 3250,
      widthM: 2500,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 3000,
      note: "The Attending Galleries — the stalls' benches and the dome, Attendance's room seen from above. Painted whole and cut in two by the axis; this is the bench as it stood at 00:00, and the 11:00 ground beat is what takes each half to 2,900 and trench",
    },
    {
      x: 2000,
      y: 3250,
      widthM: 1000,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 3400,
      note: "The Axis — the Ninth's channel, leaving south between the galleries' benches. Painted last, which is what makes them two; named by neither ground beat, and still 3,400 m after 11:00",
    },
  ],
  // One spawn, on the Undermarshalcy's terrace (§11), and irrelevant: every
  // party on this map is seated directly. The offsets address a pre-built
  // Foundry a mission never places — nothing is built during a calling (§2).
  spawns: [{ x: 2500, y: 375, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no resources, no hazard sites, no second spawn. There is no economy
  // on a chart whose whole stake is who crossed the middle of it.
  resources: [],
  hazards: [],
};
