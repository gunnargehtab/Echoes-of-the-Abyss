/**
 * The Kell Shoulder — docs/mission-thin-water.md §11; docs/maps.md, "Mission maps".
 *
 * The bare rise between two Commune garden terraces, and the one map in the
 * campaign whose central fact is a propagation factor rather than a shape:
 * the Shoulder is painted Open Water, PF 1.0, and §1's whole argument is that
 * an 18-SIG tender carries eighteen here where it carries 9.9 at home. The
 * column does not get louder. The water stops taking anything back.
 *
 * Three of the seven regions are cut into that rise and each is a lever the
 * mission pulls:
 *
 * - **The Grid Spur** — the closed corridor, crossing the map east to west at
 *   420 m. Getting across it is the mission.
 * - **The Vent Under-run** — Thermal Vein at 0.45, the map's one mask, and it
 *   lies *below* the corridor rather than beside it. The quiet way is the deep
 *   way, it is 280 m down off the shoulder's floor, and it is longer than the
 *   time the pump housings are counting out (§7).
 * - **The Kell Slope** — Abyssal Trench paint at the Shelf's southern edge,
 *   which is Asset Recovery's authoring freedom used again: biome is
 *   acoustics, not band (docs/mission-asset-recovery.md §11). Nothing the
 *   column wants is down there and everything that hears it is.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, not balanced, resolved by mission id and nothing else.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const KELL_SHOULDER: MapDefinition = {
  id: 'kell-shoulder',
  name: 'The Kell Shoulder',
  idealUse: 'Thin Water, mission two. Four kilometres of bare rock and a corridor across it.',
  seats: 1,
  widthM: 5000,
  heightM: 3000,
  doc: 'docs/mission-thin-water.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 340,
  // One row per row of §11's table, in the document's order. Every rectangle
  // lands on the 250 m cell grid and paints exactly the metres it reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 3000,
      biome: Biome.OpenWater,
      floorM: 340,
      note: "The Shoulder — the bare rise. Painted first; everything else is cut into it. PF 1.0, the thin water, and the mission's whole argument",
    },
    {
      x: 0,
      y: 1250,
      widthM: 5000,
      heightM: 500,
      biome: Biome.OpenWater,
      floorM: 420,
      note: 'The Grid Spur — the closed corridor: pipe, cable, tension frame, seven pump housings. It crosses the map east to west and getting across it is the mission',
    },
    {
      x: 0,
      y: 2500,
      widthM: 5000,
      heightM: 500,
      biome: Biome.AbyssalTrench,
      floorM: 900,
      note: "The Kell Slope — the shoulder's southern edge falling away. Trench paint at Shelf's edge: nothing the column wants is down there, and everything that hears it is",
    },
    {
      x: 1750,
      y: 1750,
      widthM: 1000,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 620,
      note: "The Vent Under-run — the geothermal field the spur draws from. PF 0.45, the map's one mask, and it lies below the corridor: the quiet way is the deep way",
    },
    {
      x: 3750,
      y: 1750,
      widthM: 1250,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 300,
      note: "Kell Face — the replanted terrace's working face and the early bloom. The spawn, and the last water in which the column's own numbers are true",
    },
    {
      x: 0,
      y: 250,
      widthM: 2000,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 280,
      note: "The Marr Approach — home terrace's outer rows. The first water where 18 means 18 again",
    },
    {
      x: 250,
      y: 0,
      widthM: 1000,
      heightM: 250,
      biome: Biome.KelpForest,
      floorM: 260,
      note: 'The Holdfast Gate — the extraction region. The count is taken here',
    },
  ],
  // One spawn, at the Kell face (§11). The offsets address a pre-built Foundry
  // a mission never places: the load is already aboard and there is nothing to
  // build with.
  spawns: [{ x: 4375, y: 2125, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no nodule fields, no crystal, nothing to build. The column carries
  // what it came for and the weather is other people.
  resources: [],
  hazards: [],
};
