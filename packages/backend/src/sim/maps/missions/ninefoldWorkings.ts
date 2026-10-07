/**
 * The Upper Workings — docs/mission-shift-change.md §11; docs/maps.md,
 * "Mission maps".
 *
 * The producing Vein, straddling the layer. The thermocline at 1,200 m is on
 * every map; this one is *placed* against it deliberately — floors above it
 * north of the workings, floors below it south, and no region whose water
 * spans it, so every crossing is a climb somebody ordered. The faces can run
 * any throttle they like at the road's ears; what crosses the layer is what
 * the player sends across it (§1).
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — Sorrowgate's
 * argument, unchanged: one seat, not balanced, resolved by mission id and
 * nothing else. Unusually for a mission map it authors resources, because the
 * mission's cover story is a working economy and the economy is real (§8).
 */

import { Biome, ResourceKind } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const NINEFOLD_WORKINGS: MapDefinition = {
  id: 'ninefold-workings',
  name: 'The Upper Workings',
  idealUse: 'The Ledger, mission two. A dying face, a filed audit, and one shift to thread them.',
  seats: 1,
  widthM: 4000,
  heightM: 3000,
  doc: 'docs/mission-shift-change.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1100,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones; every number a shape states is a whole 250 m cell,
  // and a cell is its region's when the shape holds its centre (#1142). Every
  // spawn, field, hull and beat the mission places stands on the cell it stood
  // on when these were all rectangles, and `missionShiftChange.test.ts` pins it.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 3000,
      biome: Biome.ThermalVein,
      floorM: 1100,
      note: "The Field — the Vein's masked working ground. Painted first; everything else is cut into it",
    },
    // A box, because it is built: and the mission's extract region is this same
    // rectangle, so the berths the watches are counted in are the berths drawn.
    {
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      biome: Biome.ThermalVein,
      floorM: 850,
      note: 'The Rail Head — the Fivewell rail transfer: berths, registry office, the transfer point. Above the layer',
    },
    // A box, because it is built: a graded freight road, and both passes walk
    // its whole length on lines that cross every cell of it.
    {
      x: 0,
      y: 500,
      widthM: 4000,
      heightM: 500,
      biome: Biome.ThermalVein,
      floorM: 950,
      note: "The High Road — the audit's ground: the freight road along the workings' shoulder, above the layer",
    },
    // A basin rather than a band: its ends rise back to the Field's shoulder,
    // and it dips south between the faces, where the refinery and the roads
    // between them stand. Its northern rim never enters the shoulder row, so
    // the climb to the road is as long as it was.
    {
      shape: 'ellipse',
      x: 0,
      y: 1250,
      widthM: 4000,
      heightM: 1000,
      biome: Biome.ThermalVein,
      floorM: 1300,
      note: 'The Downworks — the working level below the layer: the refinery, the roads between faces, and the pack',
    },
    // An old cut, worked down the slope past the last seam.
    {
      shape: 'polygon',
      points: [
        [250, 2000],
        [1250, 2000],
        [1250, 2500],
        [750, 2750],
        [500, 2500],
      ],
      biome: Biome.ThermalVein,
      floorM: 1350,
      note: 'Face Two — the dying face: the muster, the last seam, and the thin field',
    },
    // A fresh, round working opening off the Downworks' dip.
    {
      shape: 'ellipse',
      x: 2500,
      y: 2000,
      widthM: 1250,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 1350,
      note: 'Face Five — the producing face the quota leans on: the rich field',
    },
  ],
  // One spawn, at Face Two's muster. The offsets address a pre-built Foundry
  // the mission never places; the shift is seated in the constructor.
  spawns: [{ x: 875, y: 2250, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // Two nodule fields, below the layer — a dying face still reports, and a
  // shift makes its number where the number is (§11). Both amounts clear the
  // quota with weather in them, and Two's is authored thin on purpose: the
  // seam is done, and a player who works only the seam runs it out.
  resources: [
    { x: 875, y: 2250, kind: ResourceKind.Nodule, amount: 1800, note: "Face Two's last seam" },
    { x: 3125, y: 2250, kind: ResourceKind.Nodule, amount: 6000, note: "Face Five's rich field" },
  ],
  // No hazard sites: this field's weather is the audit (§11).
  hazards: [],
};
