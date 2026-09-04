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
 * this chart is Shelf water, no floor is authored toward the surface, and the
 * Directorate's shallow-water penalty — a different word, one mission earlier
 * — cannot be triggered anywhere on it.
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
  // Every rectangle lands on the 250 m cell grid and paints exactly the metres
  // it reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: 'The First — the trench. PF 1.60, painted first; everything else is cut into it',
    },
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 750,
      biome: Biome.CoralRuins,
      floorM: 1750,
      note: "The Rim — the worked rim, docs/mission-exposure.md's worked ground continuing east. Cut structure and hard acoustic shadow, for ground that is worked rather than ruined",
    },
    {
      x: 750,
      y: 750,
      widthM: 3000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1850,
      note: 'The Rendering Row — the yards cut into the north wall under the rim: the plant, the dome and the grower, west to east, and the apron a grown hull is delivered onto',
    },
    {
      x: 3750,
      y: 750,
      widthM: 1000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1900,
      note: "The Stalls — the reassigned's berths, heard as maintenance. The emitter stands here, off the player's party",
    },
    {
      x: 0,
      y: 1250,
      widthM: 1250,
      heightM: 1500,
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: "The West Overhang — trench wall and overhang. Hollow country, and half the band's income",
    },
    {
      x: 3750,
      y: 1250,
      widthM: 1250,
      heightM: 1500,
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: 'The East Overhang — the other half, four kilometres from the first',
    },
    {
      x: 1250,
      y: 1250,
      widthM: 2500,
      heightM: 2750,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: "The Axis — the channel: freight water, and the colossus's corridor",
    },
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
