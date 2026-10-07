/**
 * The Attending Galleries — docs/mission-attendance.md §11; docs/maps.md,
 * "Mission maps".
 *
 * Sufficiency's southern face at the head of the Ninth Trench: a city cut into
 * the top of a trench, and the trench aimed at the Mouth's approach. Two facts
 * about this water decide the mission and both are ground rather than script.
 *
 * **The whole map is below the thermocline**, so the layer never enters into
 * it — a fleet at 3,000 m and a fleet at 400 m are on different maps
 * (docs/systems-depth.md §1), and this mission is entirely on the far one.
 * Every pair on this map is Below-to-Below, which is the one row of the
 * thermocline table that is simply 1.
 *
 * **The benches and the channel are geometry nothing stands on.** They are
 * authored at 3,200 and 4,100 m against a ruleset ceiling of 3,000
 * (`DEPTH.MAX_M`), so every hull here holds 3,000 m over water it never
 * touches: nothing is lifted, nothing crushes, and the channel is a corridor
 * for sound rather than for movement. The floor under it is a number the
 * return comes up out of (docs/world-map.md §3, "The Ninth, head to Mouth";
 * #421), and a map may author a floor below the ceiling for exactly that.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, not balanced, resolved by mission id and
 * nothing else. This is also the first mission map in the bible with nothing
 * alive on it but the player: no fauna seeded, and no authored creature.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const ATTENDING_GALLERIES: MapDefinition = {
  id: 'attending-galleries',
  name: 'The Attending Galleries',
  idealUse: 'The Attending, mission one. A gallery of sleepers, and the Ninth aimed at the Mouth.',
  seats: 1,
  widthM: 5000,
  heightM: 4000,
  doc: 'docs/mission-attendance.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 3400,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the trench be painted whole and
  // the city cut into the top of it. Every number a shape states is a whole
  // 250 m cell, and a cell is its region's when the shape holds its centre
  // (#1149). Only the Step and the two benches are shapes, and they trade
  // cells between 3,200 and 3,400 m of Abyssal Trench and nothing else; every
  // seat, the dome, every arrival and both mission regions stand on the ground
  // they stood on when these were all rectangles, and
  // `missionAttendance.test.ts` pins it.
  regions: [
    // A box, because it is the whole map's base.
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.AbyssalTrench,
      floorM: 3400,
      note: 'The Ninth — the trench. PF 1.60, painted first; everything else is cut into it',
    },
    // A box, because it is built: the city's terraces, cut to a line.
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 750,
      biome: Biome.CoralRuins,
      floorM: 2750,
      note: "Sufficiency's Lower Rows — the city's lowest terraces. Cut structure and hard acoustic shadows, for a city that is not ruined",
    },
    // A box, because it is built, and the mission's `galleries` region is this
    // same rectangle: the stalls the watch is seated in are the stalls drawn.
    {
      x: 1250,
      y: 750,
      widthM: 2500,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 3000,
      note: 'The Attending Galleries — the southern face: the stalls, open on the axis. The spawn, and where the dome stands',
    },
    // Its north edge runs on a slant from the galleries' lower corners out to
    // the map's edges, so north of it the Ninth's 3,400 m shows only in a
    // wedge beside each end of the galleries rather than as two boxes.
    {
      shape: 'polygon',
      points: [
        [0, 750],
        [1250, 1250],
        [3750, 1250],
        [5000, 750],
        [5000, 2000],
        [0, 2000],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 3200,
      note: "The Step — the slope's last bench before the channel",
    },
    // Each bench's outer south corner is cut on a slant, and the Ninth's floor
    // shows there beside the sill. Both are mirror images across x 2,500.
    {
      shape: 'polygon',
      points: [
        [0, 2000],
        [2000, 2000],
        [2000, 4000],
        [1000, 4000],
        [0, 3000],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 3200,
      note: "The West Bench — the channel's shoulder",
    },
    {
      shape: 'polygon',
      points: [
        [3000, 2000],
        [5000, 2000],
        [5000, 3000],
        [4000, 4000],
        [3000, 4000],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 3200,
      note: 'The East Bench — the other shoulder',
    },
    // A box: with the Sill below it, it is the mission's `axis` region, the
    // same rectangle, and every arrival stands on its line at x 2,500.
    //
    // It is cut north to the galleries' own edge rather than starting below
    // the Step, and §11's row says so, because §6 row 1 is the sentence that
    // decides the geometry: the first arrival "arrives in the stalls' own
    // water". A channel whose head began a kilometre south of the stalls could
    // not deliver that, and an arrival in it would be a smudge from the face on
    // the first tick of the mission. The Step is still the bench either side;
    // the channel cuts through it, which is what "everything else is cut into
    // it" describes.
    {
      x: 2000,
      y: 1250,
      widthM: 1000,
      heightM: 2500,
      biome: Biome.AbyssalTrench,
      floorM: 4100,
      note: "The Axis — the Ninth's channel proper, aimed at the Mouth's approach. Every arrival is on this line",
    },
    // A box, for the Axis's reason.
    {
      x: 2000,
      y: 3750,
      widthM: 1000,
      heightM: 250,
      biome: Biome.AbyssalTrench,
      floorM: 4100,
      note: 'The Sill — where the axis leaves the map southward. Everything arrives through it',
    },
  ],
  // One spawn, at the gallery face. The offsets address a pre-built Foundry a
  // mission never places: no economy here, and a shift produces nothing.
  spawns: [{ x: 2500, y: 1000, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources, no hazard sites, no second spawn: the stake is a page.
  resources: [],
  hazards: [],
};
