/**
 * Face Six — docs/mission-asset-recovery.md §11; docs/maps.md, "Mission maps".
 *
 * The Ninefold Vein's sixth face, fallen, with a wound in its masking ground.
 * Two facts about the water decide the whole mission and both are ground
 * rather than script: the Field is Thermal Vein at PF 0.45 — the roar that
 * has hidden Consortium industry for two centuries — and the blowout channel
 * through it is raw rock at PF 1.6. The one place the column must work is the
 * one place the whole field hears it, and the border between those two waters
 * is where the work is (§1).
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — Sorrowgate's
 * argument, unchanged: one seat, no resources, not balanced, resolved by
 * mission id and nothing else. The Scar's trench paint at Mid-Water depth is
 * the same authoring freedom Sorrowgate's Commit uses in the other direction:
 * biome is acoustics, not band.
 *
 * Drawn in shapes since #1141 (#1139): in rectangles the field read as a
 * checkerboard from the survey dolly. The shapes moved outlines, not the
 * mission. Every placed hull, beat point, eruption site and the taps stand on
 * the cell they stood on, the road from the Rail Head to the fall crosses the
 * same five grounds in the same order, and `missionAssetRecovery.test.ts`
 * holds both.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const NINEFOLD_FACE_SIX: MapDefinition = {
  id: 'ninefold-face-six',
  name: 'Face Six',
  idealUse: 'The Ledger, mission one. A dying field, a fallen face, and a recovery writ.',
  seats: 1,
  widthM: 4000,
  heightM: 3000,
  doc: 'docs/mission-asset-recovery.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1000,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the Field be painted whole and
  // the wound cut into it — and the fall cut into the wound. Every number a
  // shape states is a whole 250 m cell, and a cell is its region's when the
  // shape holds its centre (docs/maps.md, "How a map is written").
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 3000,
      biome: Biome.ThermalVein,
      floorM: 1000,
      note: "The Field — the Vein's masked working ground. Painted first; everything else is cut into it. A box because it is the whole map",
    },
    {
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      biome: Biome.ThermalVein,
      floorM: 700,
      note: "The Rail Head — staging, the writ's delivery point, the extraction point. A built yard, so a box, and the same box the writ counts deliveries in",
    },
    {
      shape: 'polygon',
      points: [
        [0, 750],
        [250, 500],
        [500, 500],
        [750, 250],
        [1250, 250],
        [1500, 500],
        [2500, 500],
        [2750, 250],
        [3250, 250],
        [3500, 500],
        [3750, 500],
        [4000, 750],
        [4000, 1000],
        [3750, 1000],
        [3250, 1500],
        [750, 1500],
        [250, 1000],
        [0, 1000],
      ],
      biome: Biome.ThermalVein,
      floorM: 850,
      note: "The Terrace — the herd's feeding ground and the road's shallow shoulder. It rises about each of the vent line's two eruption sites, sags into an apron below each, and thins to the map's edges",
    },
    {
      shape: 'polygon',
      points: [
        [1500, 1250],
        [2500, 1250],
        [2750, 1750],
        [2750, 2000],
        [1000, 2000],
      ],
      biome: Biome.ThermalVein,
      floorM: 1100,
      note: "The Works — the descent road, leaving the Terrace's lip under the Rail Head and fanning west into the old workings where it meets the Scar. PF 0.45: the column's own ground protects it here, and nothing tells the player this",
    },
    {
      shape: 'polygon',
      points: [
        [1000, 2000],
        [2500, 2000],
        [3000, 2500],
        [2500, 2750],
        [2250, 2750],
        [2250, 3000],
        [1750, 3000],
        [1750, 2750],
        [1000, 2750],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 1150,
      note: "The Scar — the blowout channel, torn east to a point and down past the fall to the field's south edge, where the vent line under the face blew out. Raw rock, PF 1.6, the wound that carries. Trench paint at Mid-Water depth: biome is acoustics, not band",
    },
    {
      x: 1750,
      y: 2250,
      widthM: 500,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1150,
      note: 'Face Six — the fall itself: collapsed structure, hard acoustic shadows, the chamber inside. Cut into the Scar, painted after it. A box because the mission closes the fall as this rectangle (§8), and on four cells an ellipse paints the same four',
    },
  ],
  // One spawn, at the Rail Head. The offsets address a pre-built Foundry a
  // mission never places: no economy here and nothing to build — the mission
  // seats its own column in the constructor.
  spawns: [{ x: 2000, y: 250, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources: the field is under a recovery writ, not a works order (§3).
  resources: [],
  // Two geothermal sites on the Terrace's vent line, visible from the first
  // frame and erupting on the published interval — the 07:30 stampede is hung
  // on one of them (§7, docs/hazards.md). The plume radius is the roster's
  // standard 700 m, the figure the telegraph was sized against.
  hazards: [
    { x: 1000, y: 875, radiusM: 700, kind: 'geothermal-eruption' },
    { x: 3000, y: 875, radiusM: 700, kind: 'geothermal-eruption' },
  ],
};
