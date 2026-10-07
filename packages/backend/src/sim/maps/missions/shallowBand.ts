/**
 * The Shallow Band — docs/mission-trench-awakening.md §11; docs/maps.md,
 * "Mission maps".
 *
 * The First Trench at 1,800 m: the Directorate's shallowest holding, the
 * posting the eight per cent who cannot hold their band are reassigned to, and
 * the row that renders what the trench brings down its length
 * (docs/habitats.md §6). North is shallow and south is deep, as everywhere in
 * the Rift — the worked rim at 1,750 m, the yards cut into the north wall
 * under it at 1,850, and the axis falling away to 2,400.
 *
 * **The name is a place and not a band, and the floors here say so.** The
 * Directorate's cities stand at 2,750–4,000 m, which is the only sense in
 * which any of this is shallow; 1,800 m is the *first metre of the Abyssal*
 * (docs/glossary.md, "The Shallow Band"; docs/systems-depth.md §3). Nothing on
 * this chart is Shelf water and no floor is authored toward the surface, so
 * the Directorate's shallow-water penalty — a different word, one mission
 * earlier — never fires: the shallowest metre this mission authors is a grown
 * hull's 600 m, which is Mid-Water (§10). The ground does not forbid it,
 * because no ground can; `DEPTH.MIN_M` is the surface and a ceiling of 0
 * admits every depth above the floor. Nothing is *seated* in that water.
 *
 * Three facts about this water decide the mission and all three are ground
 * rather than script.
 *
 * **The band is the doorway, and the Hollow guards doorways.** The overhangs
 * stand at 2,150 m either side of the axis and the animals that pay this row
 * live on them, 1,552 m out — against a submersible's 1,231 m of Contact, so
 * the row opens the tide unable to hear a single thing it is there to earn
 * (§5). Four kilometres of trench separate the two walls. Neither is fenced
 * off and neither needs to be: the distance is the whole cost.
 *
 * **The trench carries at 1.60 and there is nothing down its length but
 * distance.** Every rendering announces itself across the whole map, and a
 * colossus calling at the sill is heard from outside it. The one shadow on the
 * chart is the worked ground at 0.80 — the rim, and the yards and the stalls
 * cut under it — which is why the grower producing reads 7,011 m in trench
 * water and 4,546 m in its own yard (§11). The row's strip of quiet is exactly
 * the shape of the row.
 *
 * **The floor plan is the pay slip.** Drift Health is a 4 × 4 grid, so on a
 * 5,000 × 4,000 m map its cells are 1,250 × 1,000 m — and the plant, the dome
 * and the grower are authored at 1000, 1500 and 2750 so that they fall in
 * three different ones (§3). A rendering pays 35, 26.25, 8.75 or nothing
 * depending on which cell the animal died in, and the coordinates in this file
 * are what decide that. None of it is authored anywhere else; the ledger's own
 * arithmetic does the rest.
 *
 * No `SOLID` anywhere, no resources, no hazard sites and `fauna` off: the
 * Directorate mines nodules poorly and the band renders (docs/economy.md §2),
 * so the opening stock is the yard's own and all eight animals are authored by
 * `creature` beats (§13).
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, not balanced, resolved by mission id and
 * nothing else.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const SHALLOW_BAND: MapDefinition = {
  id: 'shallow-band',
  name: 'The Shallow Band',
  idealUse:
    'The Attending, mission five. A rendering row, two walls of income, and a door at the bottom.',
  seats: 1,
  widthM: 5000,
  heightM: 4000,
  doc: 'docs/mission-trench-awakening.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 2400,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the trench be painted whole and
  // the rim, the yards and the stalls cut into its north wall afterwards.
  // Every number a shape states is a whole 250 m cell, and a cell is its
  // region's when the shape holds its centre (#1155). Only the two overhangs
  // are shapes, and they trade cells between 2,150 and 2,400 m of Abyssal
  // Trench and nothing else; every hull, structure, emitter, Hollow and
  // colossus point stands on the ground it stood on when these were all
  // rectangles, and `missionTrenchAwakening.test.ts` pins it.
  regions: [
    // A box, because it is the whole map's base.
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: 'The First — the trench. PF 1.60, painted first; everything else is cut into it',
    },
    // A box, because it is worked ground, cut to a line.
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 750,
      biome: Biome.CoralRuins,
      floorM: 1750,
      note: "The Rim — the worked rim, docs/mission-exposure.md's worked ground continuing east. Cut structure and hard acoustic shadow, for ground that is worked rather than ruined",
    },
    // A box, because it is built.
    {
      x: 750,
      y: 750,
      widthM: 3000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1850,
      note: 'The Rendering Row — the yards cut into the north wall under the rim: the plant, the dome and the grower, west to east, and the apron a grown hull is delivered onto',
    },
    // A box, because it is built.
    {
      x: 3750,
      y: 750,
      widthM: 1000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1900,
      note: "The Stalls — the reassigned's berths, heard as maintenance. The emitter stands here, off the player's party",
    },
    // Its north end reaches north on a slant to meet the rim at the map's west
    // edge, rather than leaving a box of the First's water beside the row's
    // end; its inner south corner is cut on a
    // slant toward the axis. Every Hollow on it stands on 2,150 m as before.
    {
      shape: 'polygon',
      points: [
        [0, 750],
        [750, 1250],
        [1250, 1250],
        [1250, 1750],
        [750, 2750],
        [0, 2750],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: "The West Overhang — trench wall and overhang. Hollow country, and half the band's income",
    },
    // The West Overhang's south corner mirrored across x 2,500. Its north end
    // reaches north into one of the two cells beside the stalls, leaving the
    // other, against the rim, to the First: the stalls are built and reach to
    // x 4,750, so the slant has one column to run in.
    {
      shape: 'polygon',
      points: [
        [3750, 1250],
        [4750, 1250],
        [5000, 750],
        [5000, 2750],
        [4250, 2750],
        [3750, 1750],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: 'The East Overhang — the other half, four kilometres from the first',
    },
    // A box: it paints the First's own biome and floor, clear of both
    // overhangs, so its outline changes no cell and is a name.
    {
      x: 1250,
      y: 1250,
      widthM: 2500,
      heightM: 2750,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: "The Axis — the channel: freight water, and the colossus's corridor",
    },
    // A box, for the Axis's reason.
    {
      x: 2000,
      y: 3750,
      widthM: 1000,
      heightM: 250,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: "The Sill — where the First leaves the map southward toward the Second. It carries the axis's own biome and floor and repaints nothing; it is on the chart so the door has a name",
    },
  ],
  // One spawn, at the row (§11). A formality: every party is seated directly,
  // and the offsets address a pre-built Foundry the mission does not use — the
  // grower is a `MissionStructure` at 2750, 1000, one of three placed to land
  // in three different Drift ledger cells (§3).
  spawns: [{ x: 2500, y: 1000, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no resources and no hazard sites. The income is eight animals on two
  // walls, and the weather is what answers the sounding.
  resources: [],
  hazards: [],
};
