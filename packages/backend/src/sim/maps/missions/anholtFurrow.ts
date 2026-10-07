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
 * The Second Furrow is bare rock in the literal and is Abyssal Trench here on
 * purpose. Both missions turn it Kelp Forest with a `ground` beat — *Deep
 * Furrow* when the sowing completes, *In Writing* restating it at 00:00 — and
 * a map literal cannot carry a mission's repaint (docs/campaign.md §2 rule 5).
 * The literal is the ground before anyone sowed it, once, and the missions say
 * what happened to it.
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
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

/** Solid rock, as a region: no depth satisfies ceiling <= D <= floor. */
const ROCK = { floorM: 0, ceilingM: 1 } as const;

export const ANHOLT_FURROW: MapDefinition = {
  id: 'anholt-furrow',
  name: 'The Furrow',
  idealUse:
    'The Second Seeding, missions four and five. Two walls of rock, one road, and a garden fifty metres under the Hollows.',
  seats: 1,
  widthM: 4000,
  heightM: 3000,
  doc: 'docs/mission-deep-furrow.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1100,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the lanes be painted whole and
  // the Foot, the walls, the cleft, the furrows and the sill cut into them.
  // Every number a shape states is a whole 250 m cell, and a cell is its
  // region's when the shape holds its centre (#1153). Only the walls and the
  // sill are shapes, and they open twelve cells that were rock and close none.
  // Every authored point and mission region of both missions stands on the
  // ground it stood on when these were all rectangles, every scripted leg
  // routes as it did, and `missionDeepFurrow.test.ts` pins both.
  regions: [
    // A box, because it is the whole map's base.
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 3000,
      biome: Biome.OpenWater,
      floorM: 1100,
      note: "The Lanes — the freight lanes Tend heard from above. Painted first; everything else is cut into them. The floor is the duct's top, so the lanes end where the layer begins",
    },
    // A box, because both missions' `the-foot` is this same rectangle: home is
    // the water drawn as home.
    {
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      biome: Biome.OpenWater,
      floorM: 900,
      note: "The Foot — the drop's foot, where the plateau's lane comes down. The seat, at 900 m, above the layer, and the region home means",
    },
    // The face on the road is straight at x 1,250 from the mouth to the sill,
    // so the road is 1,500 m wide the whole way and the Hollow is 100 m off it.
    // The outer north corner is cut on a slant, letting the lanes reach south
    // along the map's edge, and the foot gives way on a slant to the sill. The
    // East Wall is its mirror image across x 2,000.
    {
      shape: 'polygon',
      points: [
        [0, 1000],
        [750, 500],
        [1250, 500],
        [1250, 2500],
        [500, 3000],
        [0, 3000],
      ],
      biome: Biome.OpenWater,
      ...ROCK,
      note: 'The West Wall — solid. The cleft is the only road',
    },
    {
      shape: 'polygon',
      points: [
        [2750, 500],
        [3250, 500],
        [4000, 1000],
        [4000, 3000],
        [3500, 3000],
        [2750, 2500],
      ],
      biome: Biome.OpenWater,
      ...ROCK,
      note: 'The East Wall — solid',
    },
    // A box, because its sides are the walls' straight faces.
    {
      x: 1250,
      y: 500,
      widthM: 1500,
      heightM: 1250,
      biome: Biome.AbyssalTrench,
      floorM: 1800,
      note: 'The Cleft — the descent and the doorway. PF 1.6: it carries like a trench because it is one. Hollow country, with the duct at 1,200 across its upper water. 1,500 m wide, so the middle is 750 m from either wall and 650 from either Hollow',
    },
    // A box, because the mission's `standing-furrow` is this same rectangle:
    // the grant lands on the ground drawn.
    {
      x: 1250,
      y: 1750,
      widthM: 1000,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 2200,
      note: "The Furrow — the 204 PC ground, ten years grown: a trench floor painted kelp, because seeded ground absorbs. Deep Furrow's zone: `standing-furrow` is the grant that makes it one. The map seats nothing in it, and what stands in it is a mission's to seat",
    },
    // A box, because `second-furrow`, which the ground beat repaints, is this
    // same rectangle.
    {
      x: 2250,
      y: 1750,
      widthM: 500,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 2200,
      note: "Second Furrow — bare rock at 00:00, and the sowing's ground. Repainted Kelp Forest by a mission ground beat, which is why it is trench paint here",
    },
    // Where the cleft opens to the deep: its sides run out on a slant from the
    // furrows' corners, so it is 2,000 m of water across its north row and
    // 2,500 m across its south row. The six cells it opens at the walls' feet
    // carry at 1.6 where the rock's paint was 1.0, and no line between two
    // authored positions of either mission crosses one.
    {
      shape: 'polygon',
      points: [
        [1250, 2500],
        [2750, 2500],
        [3500, 3000],
        [500, 3000],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2600,
      note: "The Sill — where the cleft opens to the deep. The observer's station, and the line's seat. Nothing the plateaus own is rated for it",
    },
  ],
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
