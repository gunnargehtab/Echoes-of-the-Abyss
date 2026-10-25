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
 *
 * **The ground is shared's** (`KELL_SHOULDER_GROUND`, #1633), as Marr
 * Plateau's is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { KELL_SHOULDER_GROUND } from '@echoes/shared';
import type { MapDefinition, MapRect } from '../types.ts';

export const KELL_SHOULDER: MapDefinition<MapRect> = {
  id: 'kell-shoulder',
  name: 'The Kell Shoulder',
  idealUse: 'Thin Water, mission two. Four kilometres between gardens and a corridor across it.',
  seats: 1,
  doc: 'docs/mission-thin-water.md §11; docs/maps.md — Mission maps',
  ...KELL_SHOULDER_GROUND,
  // One spawn, at the Kell face (§11). The offsets address a pre-built Foundry
  // a mission never places: the load is already aboard and there is nothing to
  // build with.
  spawns: [{ x: 4375, y: 2125, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no nodule fields, no crystal, nothing to build. The column carries
  // what it came for and the weather is other people.
  resources: [],
  hazards: [],
};
