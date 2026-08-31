/**
 * The Third's Outer Formations — docs/mission-aptitude.md §11; docs/maps.md,
 * "Mission maps".
 *
 * The shallow Resonance Fields on the east slope, below the thermocline and
 * above the Abyssal line. **Three regions, which is the shortest table in the
 * bible**, and §1 is the argument for it: every other mission map hands the
 * player terrain to be quiet in — the prologue's occluded districts, Face Six's
 * vent line, the plateau's kelp, the Ninth's benches — and this one hands them
 * 0.70 water in every direction and one strip that is worse. The doctrine is
 * the only cover on the map, so a fourth region would be an alternative to the
 * thing the mission is teaching.
 *
 * **Two systems are arranged to have nothing to say, and both by ground.**
 * Every metre here is Mid-Water — 1,450 m at the shallowest, 1,750 at the
 * deepest, against a 400–1,800 m band — so `requiredPressureRating` returns 2
 * everywhere, the party is PR-2, and nothing crushes (docs/systems-depth.md
 * §1). And the thermocline duct bottoms out at 1,300 m, which is 150 m above
 * the shallowest ground on the map, so every pair is Below-to-Below and the
 * layer's factor is 1 on all of them (docs/systems-echo.md §3). One system per
 * mission means the other two axes have to be arranged to say nothing, and the
 * cleanest way to arrange that is ground on which they have nothing to say.
 *
 * **The formations are not here.** They are authored points on the mission
 * rather than terrain — the same choice the taps are
 * (docs/mission-asset-recovery.md §6) — because crystal standing 250 m off the
 * floor would *lift* a hull that crossed it, which is a real mechanic
 * (docs/systems-depth.md §2) with nothing to say in a mission where every depth
 * is safe. A marked position and a 400 m sounding radius says everything the
 * mission needs and no more.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, no hazard sites, not balanced, resolved by
 * mission id and nothing else.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const OUTER_FORMATIONS: MapDefinition = {
  id: 'outer-formations',
  name: "The Third's Outer Formations",
  idealUse:
    'The Second Chord, mission one. Crystal country with no cover in it, and one strip that carries.',
  seats: 1,
  widthM: 5000,
  heightM: 4000,
  doc: 'docs/mission-aptitude.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1700,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the Fields be painted whole and
  // the Approach cut into the north-east corner of them. Every rectangle lands
  // on the 250 m cell grid and paints exactly the metres it reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.ResonanceField,
      floorM: 1700,
      note: 'The Fields — crystal country. PF 0.70, scattered; painted first, and almost nothing is cut into it',
    },
    {
      x: 3750,
      y: 0,
      widthM: 1250,
      heightM: 1000,
      biome: Biome.ResonanceField,
      floorM: 1450,
      note: "The Third's Approach — the chapter-house's own water. The spawn, and the region the party returns to",
    },
    {
      x: 0,
      y: 3500,
      widthM: 5000,
      heightM: 500,
      biome: Biome.AbyssalTrench,
      floorM: 1750,
      note: 'The Seam — where crystal country breaks toward the trenches. PF 1.60, and the one strip of ground on this map that carries',
    },
  ],
  // One spawn, in the Approach at 1,450 m. The Foundry offsets address a
  // structure a tuning never places: no economy here, and maintenance is not a
  // works order (§3).
  spawns: [{ x: 4500, y: 500, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources, no hazard sites, no second spawn: a tuning party produces
  // nothing and spends nothing, and nothing on this map hunts.
  resources: [],
  hazards: [],
};
