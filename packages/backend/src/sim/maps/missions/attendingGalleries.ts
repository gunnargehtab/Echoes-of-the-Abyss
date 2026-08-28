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
 * **The benches are the map's only gameplay geometry and they are not a
 * fence.** They stand at 3,200 m against a channel floor of 4,100, so a hull
 * that strays off the axis onto one is *lifted* — terrain may raise a hull and
 * may never lower one — and getting back down costs a dive. The channel is a
 * corridor for movement for the same reason it is a corridor for sound, and
 * nothing had to be made solid to say so.
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
  // the city cut into the top of it. Every rectangle lands on the 250 m cell
  // grid and paints exactly the metres it reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.AbyssalTrench,
      floorM: 3400,
      note: 'The Ninth — the trench. PF 1.60, painted first; everything else is cut into it',
    },
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 750,
      biome: Biome.CoralRuins,
      floorM: 2750,
      note: "Sufficiency's Lower Rows — the city's lowest terraces. Cut structure and hard acoustic shadows, for a city that is not ruined",
    },
    {
      x: 1250,
      y: 750,
      widthM: 2500,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 3000,
      note: 'The Attending Galleries — the southern face: the stalls, open on the axis. The spawn, and where the dome stands',
    },
    {
      x: 0,
      y: 1250,
      widthM: 5000,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 3200,
      note: "The Step — the slope's last bench before the channel",
    },
    {
      x: 0,
      y: 2000,
      widthM: 2000,
      heightM: 2000,
      biome: Biome.AbyssalTrench,
      floorM: 3200,
      note: "The West Bench — the channel's shoulder",
    },
    {
      x: 3000,
      y: 2000,
      widthM: 2000,
      heightM: 2000,
      biome: Biome.AbyssalTrench,
      floorM: 3200,
      note: 'The East Bench — the other shoulder',
    },
    {
      x: 2000,
      y: 1250,
      widthM: 1000,
      heightM: 2500,
      biome: Biome.AbyssalTrench,
      floorM: 4100,
      // §11's table starts the channel at y 2,000, below the Step. It is cut
      // north to the galleries' own edge here, and the document's §11 row moves
      // with it, because §6 row 1 is the sentence that decides the geometry:
      // the first arrival "arrives in the stalls' own water". A channel whose
      // head began a kilometre south of the stalls could not deliver that, and
      // an arrival in it would be a smudge from the face on the first tick of
      // the mission. The Step is still the bench either side; the channel cuts
      // through it, which is what "everything else is cut into it" describes.
      note: "The Axis — the Ninth's channel proper, aimed at the Mouth's approach. Every arrival is on this line",
    },
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
