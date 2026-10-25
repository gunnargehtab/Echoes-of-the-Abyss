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
 * the ground they stood on, the road from the Rail Head to the fall crosses the
 * same five grounds in the same order, and `missionAssetRecovery.test.ts`
 * holds both.
 *
 * **The ground is shared's** (`FACE_SIX_GROUND`, #1626), as the Shallow
 * Band's is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn and the
 * eruption sites.
 */

import { FACE_SIX_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const NINEFOLD_FACE_SIX: MapDefinition = {
  id: 'ninefold-face-six',
  name: 'Face Six',
  idealUse: 'The Ledger, mission one. A dying field, a fallen face, and a recovery writ.',
  seats: 1,
  doc: 'docs/mission-asset-recovery.md §11; docs/maps.md — Mission maps',
  ...FACE_SIX_GROUND,
  // One spawn, at the Rail Head. The offsets address a pre-built Foundry a
  // mission never places: no economy here and nothing to build — the mission
  // seats its own column in the constructor.
  spawns: [{ x: 2000, y: 250, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No resources: the field is under a recovery writ, not a works order (§3).
  resources: [],
  // Two geothermal sites on the Terrace's vent line, visible from the first
  // frame and erupting on the published interval — the 07:30 stampede is hung
  // on the east one, phased so one of its eruptions lands on the beat (§7,
  // docs/hazards.md, #1312). The plume radius is the roster's standard 700 m,
  // the figure the telegraph was sized against.
  hazards: [
    { x: 1000, y: 875, radiusM: 700, kind: 'geothermal-eruption' },
    { x: 3000, y: 875, radiusM: 700, kind: 'geothermal-eruption', activeAtS: 7 * 60 + 30 },
  ],
};
