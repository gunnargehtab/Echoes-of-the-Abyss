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
 * `fourthTrench.ts`'s rectangles, biomes and floors to the metre, and the
 * Margin is that map's base water run a thousand metres further south
 * (docs/mission-baffle.md §11). The last three regions are ground *Baffle*
 * never had a reason to draw: that chart's last 250 m are the head of the Fan
 * here, which is where it ran out of paper rather than out of water (§11). The
 * seat moves too — the spawn is at the mouth here, not at the staging, because
 * the staging is the convoy's muster and the convoy is somebody else's party in
 * this mission.
 *
 * A second literal rather than a longer first one, deliberately: `fourth-trench`
 * is a shipped mission's ground, and growing it southward would move *Baffle*'s
 * own map under *Baffle*'s own feet. The duplication is the seam the two
 * documents are written to have no seam across.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, not balanced, resolved by mission id and
 * nothing else.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

/** Solid rock, as a region: no depth satisfies ceiling <= D <= floor. */
const ROCK = { floorM: 0, ceilingM: 1 } as const;

export const FOURTH_FOOT: MapDefinition = {
  id: 'fourth-foot',
  name: "The Fourth's Foot",
  idealUse:
    "The Attending, mission three. The Ledger's trench from the counting side, and the deep it opens into.",
  seats: 1,
  widthM: 3000,
  heightM: 6000,
  doc: 'docs/mission-the-dome.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1450,
  // One row per row of §11's table, in the document's order. The lay-bys are
  // painted after the walls they notch and the Foot after the Fan it stands
  // at the bottom of, which is what carves water back out of rock and the last
  // bench out of the slope — the same order-of-paint argument as everywhere
  // else. Every rectangle lands on the 250 m cell grid and paints exactly the
  // metres it reads.
  //
  // A pocket states a floor and no ceiling, so it keeps the metre of rock the
  // wall painted over it — `fourth-trench`'s ground exactly, inherited rather
  // than tidied. It costs nothing here: the shallowest thing this mission
  // seats is the muster at 1,000 m, and a lay-by admits everything below 1 m.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 3000,
      heightM: 6000,
      biome: Biome.OpenWater,
      floorM: 1450,
      note: "The Margin — the base water. Painted first; everything else is cut into it. Baffle's margin, run a thousand metres south",
    },
    {
      x: 0,
      y: 0,
      widthM: 3000,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 1100,
      note: "The Staging — the north mouth: the grid's masked apron, above the layer's duct. The concern's muster, and the reason entering the trench is also a crossing",
    },
    {
      x: 0,
      y: 750,
      widthM: 1250,
      heightM: 3500,
      biome: Biome.OpenWater,
      ...ROCK,
      note: 'The West Wall — solid. The trench is the only road',
    },
    {
      x: 1750,
      y: 750,
      widthM: 1250,
      heightM: 3500,
      biome: Biome.OpenWater,
      ...ROCK,
      note: 'The East Wall — solid',
    },
    {
      x: 1250,
      y: 750,
      widthM: 500,
      heightM: 3500,
      biome: Biome.AbyssalTrench,
      floorM: 1700,
      note: 'The Trench — the shortcut: PF 1.6, no secrets down its length, only distances. Trench paint at Mid-Water depth, so a PR-2 convoy transits it whole',
    },
    {
      x: 1000,
      y: 1750,
      widthM: 250,
      heightM: 250,
      biome: Biome.ThermalVein,
      floorM: 1700,
      note: 'Lay-by One — the northern chartered pocket, notched into the west wall. `baffle-north` moors here, and the picket takes it off the chart at 13:00',
    },
    {
      x: 1750,
      y: 3000,
      widthM: 250,
      heightM: 250,
      biome: Biome.ThermalVein,
      floorM: 1700,
      note: 'Lay-by Two — the southern pocket, east wall. `baffle-south`. Half the quiet water on the map, and the other half is the first one',
    },
    {
      x: 750,
      y: 4250,
      widthM: 1500,
      heightM: 500,
      biome: Biome.OpenWater,
      floorM: 1650,
      note: "The Deep Yard — berths, a failing plant, forty-one souls. The concern's, and not the inquiry's. Its floor is the one place a hull is seated on the bottom rather than over it",
    },
    {
      x: 0,
      y: 4750,
      widthM: 3000,
      heightM: 1250,
      biome: Biome.AbyssalTrench,
      floorM: 2000,
      note: 'The Fan — where the shortcut meets the deep: the trench opens and falls away. The walls have stopped, so this is the first water with no road in it. The Call is sounded here',
    },
    {
      x: 750,
      y: 5250,
      widthM: 1500,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: 'The Foot — the last bench: the dome, the array, and what deep basins hold. Painted over the Fan because it is the bottom of it',
    },
    {
      x: 2250,
      y: 5000,
      widthM: 750,
      heightM: 1000,
      biome: Biome.CoralRuins,
      floorM: 2900,
      note: "The Freight Galleries — the 4th Trench Cohort's berths, cut into the fan's east wall. Tessen's water: structure, and hard acoustic shadow at PF 0.80",
    },
  ],
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
