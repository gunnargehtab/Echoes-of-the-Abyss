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
 * this map stops the intake going anywhere. What separates the two overhangs
 * is four kilometres of open bench, and four kilometres is the whole problem.
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
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const BANDING_GROUND: MapDefinition = {
  id: 'banding-ground',
  name: 'The Banding Ground',
  idealUse:
    'Intake, mission two. The upper Ninth above Sufficiency, and eight animals on its walls.',
  seats: 1,
  widthM: 5000,
  heightM: 4000,
  doc: 'docs/mission-intake.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 2400,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the trench be painted whole and
  // the halls, the ascent and the muster cut into its north wall. Every
  // rectangle lands on the 250 m cell grid and paints exactly the metres it
  // reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: 'The Upper Ninth — the trench. PF 1.60, painted first; everything else is cut into it',
    },
    {
      x: 1500,
      y: 0,
      widthM: 2000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1750,
      note: "The Cohort Halls — the year's berths, cut into the north wall. Structure and hard acoustic shadow, for a place that is not ruined",
    },
    {
      x: 2250,
      y: 0,
      widthM: 500,
      heightM: 250,
      biome: Biome.CoralRuins,
      floorM: 1500,
      note: "The Ascent — the stair north out of the map, toward the shallows. The roll's region. Its floor is the shallowest metre this mission authors, and it is 1,100 m below mission 4's line",
    },
    {
      x: 1750,
      y: 500,
      widthM: 1500,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1900,
      note: 'The Muster — the banding ground proper. The spawn',
    },
    {
      x: 1500,
      y: 1250,
      widthM: 2000,
      heightM: 1500,
      biome: Biome.AbyssalTrench,
      floorM: 2250,
      note: "The Bench — the open middle, and the Sounder's line",
    },
    {
      x: 250,
      y: 1250,
      widthM: 1250,
      heightM: 1500,
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: "The West Overhang — trench wall and overhang. Hollow country, and half the year's income",
    },
    {
      x: 3500,
      y: 1250,
      widthM: 1250,
      heightM: 1500,
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: 'The East Overhang — the other half, four kilometres from the first',
    },
    {
      x: 2000,
      y: 3250,
      widthM: 1000,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: 'The Throat — where the Ninth leaves the map southward toward Sufficiency. The Sounder arrives through it',
    },
  ],
  // One spawn, at the muster (§11). The offsets address a pre-built Foundry a
  // mission never places: the intake is twelve hulls and there is nothing to
  // build.
  spawns: [{ x: 2500, y: 750, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no resources, no hazard sites, no second spawn. The money is eight
  // animals, and they are the mission's to place.
  resources: [],
  hazards: [],
};
