/**
 * The Rest — docs/mission-nineteen.md §11; docs/maps.md, "Mission maps".
 *
 * A trench head cut across crystal country on the Fields' southern margin, and
 * the ground the Order renamed for an interval in 211 PC. The Head at 1,600 m
 * is the shallowest metre on the map and the floor falls away from it in every
 * direction: a trench head is a cut rather than a slope, so both shoulders are
 * the same crystal at the same depth and the Rift's north-shallow gradient runs
 * *across* this map instead of down it. Three facts about this water decide the
 * mission, they are the three facts of §1, and all three are ground rather than
 * script.
 *
 * **The floor is four hundred metres under the bench, everywhere.** The party
 * is PR-2 and Mid-Water ends at 1,800 m, so it works from 1,750 m — the last
 * fifty metres of its own rating — over a floor of 2,150 m, and 2,400 m where
 * the trench falls into the Deep End under the last three names. The nineteen
 * are uniformly out of reach, and the regions are arranged so that a player who
 * goes looking for a corner where the arithmetic improves finds the floor
 * getting further away rather than nearer. A map with such a corner would be
 * arguing with its own mission.
 *
 * **The walls are Hollow ground and the vertical offset is fifty metres.** A
 * placed Hollow holds its species' working depth of 1,700 m and no other
 * (`fauna.ts`; §13), which is fifty metres above the water the party has to
 * work in — so the strike's 500 m in three dimensions is spent almost entirely
 * on the ground: 497 m horizontal, and a Corvette classifies a coil with less
 * than a metre to spare. The walls are painted at 2,050 m, 250 m in plan from
 * each sounding row, because that offset *is* the number the mission turns on.
 * Move either row 150 m toward the axis and every coil falls outside the reach
 * and the walls are scenery.
 *
 * **The trench carries and nothing here is private.** PF 1.60 axial down the
 * whole 5 km of it, so a sounding held at 80 is a Classification to the watch
 * from 5,404 m — more map than there is. The shoulders ring at 0.70 behind the
 * party and say nothing. And the shallowest ground is 1,600 m against a duct
 * that ends at 1,300, so every pair on this map is Below-to-Below and the
 * thermocline's factor is 1 throughout: the mission's one system is the only
 * system talking.
 *
 * Nothing on this map crushes anybody — the bench is fifty metres inside the
 * rating — and that is the third argument rather than an omission. The floor is
 * 350 m outside it for eighteen minutes, and the map neither asks for a descent
 * order nor blocks one.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, not balanced, resolved by mission id and
 * nothing else. Every animal on it is authored, because the default seeder is a
 * skirmish roster and cannot put seven ambushers on two named walls (§13).
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const THE_REST: MapDefinition = {
  id: 'the-rest',
  name: 'The Rest',
  idealUse:
    'Nineteen, mission three. A trench the party stands over for eighteen minutes and may not enter.',
  seats: 1,
  widthM: 5000,
  heightM: 4000,
  doc: 'docs/mission-nineteen.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1700,
  // One row per row of §11's table, in the document's order: the walls and the
  // Deep End cut into the trench, and the trench cuts into the shoulders. Every
  // rectangle lands on the 250 m cell grid and paints exactly the metres it
  // reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.ResonanceField,
      floorM: 1700,
      note: 'The Shoulders — crystal country, PF 0.70. Painted first; the far shoulder south of the trench survives as this, and nobody has a reason to be on it',
    },
    {
      x: 2000,
      y: 0,
      widthM: 1000,
      heightM: 750,
      biome: Biome.ResonanceField,
      floorM: 1600,
      note: "The Head — the spawn, and the bench the party climbs back to. The shallowest ground on the map, where the Order's 211 PC chart begins",
    },
    {
      x: 0,
      y: 1000,
      widthM: 5000,
      heightM: 2000,
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: 'The Rest — the trench. PF 1.60 axial, "no secrets, only distances". The nineteen are on this floor and both sounding rows run 400 m above it',
    },
    {
      x: 0,
      y: 1000,
      widthM: 5000,
      heightM: 500,
      biome: Biome.AbyssalTrench,
      floorM: 2050,
      note: 'The North Wall — Hollow ground. Four coil here at 1,700 m, 250 m in plan from the northern row and fifty metres above it',
    },
    {
      x: 0,
      y: 2500,
      widthM: 5000,
      heightM: 500,
      biome: Biome.AbyssalTrench,
      floorM: 2050,
      note: 'The South Wall — Hollow ground. The other three, on the same offset from the southern row',
    },
    {
      x: 4250,
      y: 1250,
      widthM: 750,
      heightM: 1500,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: "The Deep End — where the trench falls east toward Directorate country. The basin's water and the watch's station, and 650 m under the last three names",
    },
  ],
  // One spawn, at the Head (§11). The offsets address a pre-built Foundry a
  // mission never places: construction is the single `AbilityLock` this mission
  // authors, because a committal builds nothing.
  spawns: [{ x: 2500, y: 375, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no resources, no hazard sites, no second spawn. The Order is not
  // cutting anything today, and the only place on the map is a marker over
  // ground the party is forbidden.
  resources: [],
  hazards: [],
};
