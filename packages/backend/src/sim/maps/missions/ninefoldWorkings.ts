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
 *
 * **The ground is shared's** (`UPPER_WORKINGS_GROUND`, #1626), as the Shallow
 * Band's is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn and the
 * nodule fields.
 */

import { ResourceKind, UPPER_WORKINGS_GROUND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const NINEFOLD_WORKINGS: MapDefinition = {
  id: 'ninefold-workings',
  name: 'The Upper Workings',
  idealUse: 'The Ledger, mission two. A dying face, a filed audit, and one shift to thread them.',
  seats: 1,
  doc: 'docs/mission-shift-change.md §11; docs/maps.md — Mission maps',
  ...UPPER_WORKINGS_GROUND,
  // One spawn, at Face Two's muster. The offsets address a pre-built Foundry
  // the mission never places; the shift is seated in the constructor.
  spawns: [{ x: 875, y: 2250, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // Two nodule fields, below the layer — a dying face still reports, and a
  // shift makes its number where the number is (§11). Both amounts clear the
  // quota with weather in them, and Two's is authored thin on purpose: the
  // seam is done, and a player who works only the seam runs it out.
  //
  // Seated at the working level, the refinery's 1,300 m, 50 m off the faces'
  // floor. At the default 600 m every harvester climbed through the layer to
  // mine, and the half of the map §4 says is masked was the half the shift
  // was not working in (#1282).
  resources: [
    {
      x: 875,
      y: 2250,
      kind: ResourceKind.Nodule,
      amount: 1800,
      depthM: 1300,
      note: "Face Two's last seam",
    },
    {
      x: 3125,
      y: 2250,
      kind: ResourceKind.Nodule,
      amount: 6000,
      depthM: 1300,
      note: "Face Five's rich field",
    },
  ],
  // No hazard sites: this field's weather is the audit (§11).
  hazards: [],
};
