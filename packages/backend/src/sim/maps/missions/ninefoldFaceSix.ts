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
  // the wound cut into it — and the fall cut into the wound. Every rectangle
  // lands on the 250 m cell grid and paints exactly the metres it reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 3000,
      biome: Biome.ThermalVein,
      floorM: 1000,
      note: "The Field — the Vein's masked working ground. Painted first; everything else is cut into it",
    },
    {
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      biome: Biome.ThermalVein,
      floorM: 700,
      note: "Staging, the writ's delivery point, the extraction point — the Rail Head",
    },
    {
      x: 0,
      y: 500,
      widthM: 4000,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 850,
      note: "The Terrace — the herd's feeding ground and the road's shallow shoulder. The vent line's two eruption sites sit on it",
    },
    {
      x: 1250,
      y: 1250,
      widthM: 1500,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 1100,
      note: "The Works — the descent road. PF 0.45: the column's own ground protects it here, and nothing tells the player this",
    },
    {
      x: 1000,
      y: 2000,
      widthM: 2000,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 1150,
      note: 'The Scar — the blowout channel. Raw rock, PF 1.6, the wound that carries. Trench paint at Mid-Water depth: biome is acoustics, not band',
    },
    {
      x: 1750,
      y: 2250,
      widthM: 500,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1150,
      note: 'Face Six — the fall itself: collapsed structure, hard acoustic shadows, the chamber inside. Cut into the Scar, painted after it',
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
