/**
 * The Nodule Refinery, Bathyarch Consortium — 280 m of footprint (2 ×
 * `radiusM` 140, packages/shared/src/structures.ts), SIG 65 sustained.
 *
 * "A rank of upright silos with conveyor and crusher machinery,
 * seabed-anchored (SIG 65 sustained — the loudest permanent thing a player
 * owns). Burning bright: floodlit working surfaces, visible machinery
 * light" (docs/asset-prompts-3d.md, STRUCTURE — Nodule Refinery). One
 * prompt block, four scripts; the Klaxon's is from the earlier authoring
 * pass its Sentinel Turret came from and shares nothing with the other
 * three navies' Refineries, so it ports from `factions/bathyarch.mjs`
 * alone, as the turret did (#639).
 *
 * A port of the approved export
 * (docs/concept-art/models/refinery-bathyarch.glb at f7cce0f), part for
 * part in its order, every number the export's own, read off parts.mjs.
 * The platform on its skirt with the working apron, two lit stripes and a
 * pad; four silos in a rank, each capped, banded and lamped, and a patch on
 * the second; the crusher hall with its roof, lit intake, two ranks of
 * teeth, a leaning stack and its lamp; two conveyors with a lit line down
 * each, on three legs; four flood masts; a banded ballast tank; three
 * pipes; and five apron lamps. Its five materials are `ink`'s: the three
 * claddings, `work_lamp` at 2.4 and `port_glow`, the same amber banked to
 * 1.1, which the Bastion carries too. The claddings were the turret's
 * `structureInk` until #888 — the same hexes at 0.3/0.45, 0.3/0.52 and
 * 0.1/0.75 — and are the hulls' finish now, one value a name. Nothing here
 * is a shape decision; where the export is odd the script is odd with it:
 *
 * - The silos alternate short, tall, short, tall (2.6, 2.9, 2.6, 2.9) on
 *   one base; each cap is centred 0.22 above its silo's top, so its base
 *   sits 0.005 into it; each band is 0.55 of the height up, each lamp 0.5
 *   above the top.
 * - The crusher stack leans 0.12 radians to port and its lamp stands 0.07
 *   off the stack's axis, not on it.
 * - The conveyors are placed by three's `lookAt` up the belt — not by
 *   `setFromUnitVectors` like the pipes — with the belt's width kept level;
 *   each lit line is 0.96 of its belt's length, 0.4 of its width and 0.09
 *   straight up, and each belt's midpoint is the mean of its round ends,
 *   which is where the file's 0.14999999999999997 comes from.
 * - The silo flood mast writes its bank before its post, alone of the four;
 *   two banks are yawed past a right angle (−2.2 and 2.2), which parts.mjs
 *   prints as the wrapped triple.
 * - Every pipe stands between two round points by the turret's `feed_pipe`
 *   rule: the ballast pipe from (2.6, 0.9, −1.5) to (0.4, 1, −0.6), the
 *   crusher pipe from (−1, 1.9, 0.9) to (0, 2.2, −1.4), the silo pipe from
 *   (−2.6, 2.4, −1.2) to (−2.6, 1.1, 0.6).
 * - Of the nineteen lamps, the two apron stripes, the four silo lamps, the
 *   stack lamp, the two belt lines, the four flood banks and the five
 *   apron lamps face up; the crusher intake is a vertical face, so the
 *   export warns on it, as the approved bake never saw it either.
 *
 * THE FRAME: an X-long export (7.35 along x, the skirt's edge to the
 * ballast tank's end, against 6.9 across z), so nothing is yawed: every
 * part is placed by kit `add` in the file's own frame —
 * `factions/bathyarch.mjs`'s `inFrame` — the primitive un-turned, the
 * node's translation and XYZ Euler verbatim. The footprint is held at 280
 * m the Vent Taps' way (#608): `fitFootprint` measures the plan by three's
 * `Box3.setFromObject`, `DRAWN` 7.35 on x (intake's `rawSize.x` on the
 * approved file), and scales the root to it, so intake reports ×1.000 and
 * no rotation on the port's output and the shipped maps re-bake where the
 * approved bake put them.
 */
import { THREE, fitFootprint, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 280;
const DRAWN = 7.35;

const black = bathyarch.ink.hullBlack();
const rust = bathyarch.ink.oxideRust();
const grey = bathyarch.ink.ironGrey();
const lampM = bathyarch.ink.workLamp(2.4);
const glow = bathyarch.ink.portGlow(1.1);
const put = bathyarch.inFrame;

const root = new THREE.Group();
root.name = 'bathyarch_nodule_refinery';

// The platform, its skirt, the working apron with its two lit stripes and
// the pad between them.
bathyarch.refineryPlatform(
  root,
  put,
  { black, rust, grey, lampM },
  {
    platform: { size: [6.4, 0.5, 4.8], at: [-0.4, 0.25, -0.4] },
    skirt: { size: [6.8, 0.22, 5.2], at: [-0.4, 0.11, -0.4] },
    apron: { size: [3, 0.36, 2.6], at: [1.6, 0.18, 2.6] },
    stripes: { size: [0.14, 0.03, 2.5], x: [0.5, 2.7], y: 0.38, z: 2.6 },
    pad: { size: [1.7, 0.05, 2.2], at: [1.6, 0.38, 2.6] },
  }
);

// "A rank of upright silos": four on the platform top, short and tall by
// turns, and the patch on the second.
bathyarch.siloRank(
  root,
  put,
  { grey, black, rust, lampM },
  {
    silos: [
      { x: -2.6, h: 2.6 },
      { x: -1.3, h: 2.9 },
      { x: 0, h: 2.6 },
      { x: 1.3, h: 2.9 },
    ],
    z: -1.6,
    base: 0.5,
    radii: [0.55, 0.6],
    cap: { r: 0.58, h: 0.45, lift: 0.22 },
    band: { R: 0.58, t: 0.05, at: 0.55 },
    lamp: { r: 0.07, above: 0.5 },
    patch: { size: [0.7, 0.9, 0.06], at: [-1.3, 1.6, -1.02] },
  }
);

// "Crusher machinery": the hall, its lit intake between two ranks of
// teeth, the leaning stack and its lamp.
bathyarch.crusherHall(
  root,
  put,
  { black, rust, glow, grey, lampM },
  {
    hall: { size: [2.2, 1.7, 1.8], at: [-1.6, 1.35, 0.9] },
    roof: { size: [2.4, 0.18, 2], at: [-1.6, 2.3, 0.9] },
    intake: { size: [1.1, 0.8, 0.1], at: [-1.6, 1.15, 1.82] },
    teeth: { size: [1.2, 0.14, 0.14], x: -1.6, top: 1.62, bot: 0.68, z: 1.84 },
    stack: { radii: [0.18, 0.22], h: 1.2, at: [-2.3, 2.9, 0.5], lean: 0.12 },
    lamp: { r: 0.06, at: [-2.37, 3.55, 0.5] },
  }
);

// Two conveyors, the apron's up to the crusher and the crusher's up to
// the silos, a lit line down each, on three legs.
bathyarch.conveyorRun(
  root,
  put,
  { belt: black, line: glow },
  { name: 'apron', from: [1.2, 0.55, 2.4], to: [-0.9, 1.15, 1.3], width: 0.5 }
);
bathyarch.conveyorRun(
  root,
  put,
  { belt: black, line: glow },
  { name: 'silos', from: [-2.1, 1.5, 0.3], to: [-2, 2.1, -1.2], width: 0.42 }
);
bathyarch.conveyorLegs(root, put, grey, {
  width: 0.12,
  legs: [
    [[0.2, 0.95, 1.9], 0.9],
    [[-0.6, 1.175, 1.5], 1.35],
    [[-2.05, 1.4, -0.5], 1.8],
  ],
});

// "Floodlit working surfaces": four flood masts — two over the apron, one
// over the yard, one over the silos, whose bank the file writes first.
const mast = { radii: [0.05, 0.06], h: 1.6, y: 1.3 };
const bank = { size: [0.55, 0.22, 0.12], y: 2.15 };
bathyarch.floodMast(
  root,
  put,
  { black, lampM },
  { tag: 'apron_a', at: [3, 0, 3.6], mast, bank: { ...bank, rot: [0.5, -0.7, 0] } }
);
bathyarch.floodMast(
  root,
  put,
  { black, lampM },
  { tag: 'apron_b', at: [0.2, 0, 3.5], mast, bank: { ...bank, rot: [0.5, 0.6, 0] } }
);
bathyarch.floodMast(
  root,
  put,
  { black, lampM },
  { tag: 'yard', at: [2.4, 0, -0.9], mast, bank: { ...bank, rot: [0.5, -2.2, 0] } }
);
bathyarch.floodMast(
  root,
  put,
  { black, lampM },
  {
    tag: 'silo',
    at: [-3.4, 0, -0.4],
    mast: { radii: [0.05, 0.07], h: 2, y: 1.5 },
    bank: { size: [0.8, 0.2, 0.12], y: 2.5, rot: [0.4, 2.2, 0] },
    bankFirst: true,
  }
);

// The ballast tank, banded, laid along x; then the three pipes, each
// stood between two round points.
bathyarch.bandedTank(
  root,
  put,
  { tank: rust, band: grey },
  {
    name: 'ballast',
    at: [2.6, 0.92, -1.9],
    r: 0.42,
    length: 1.9,
    rot: [0, 0, Math.PI / 2],
    band: { R: 0.44, t: 0.05 },
  }
);
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_ballast',
  from: [2.6, 0.9, -1.5],
  to: [0.4, 1, -0.6],
  r: 0.08,
});
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_crusher',
  from: [-1, 1.9, 0.9],
  to: [0, 2.2, -1.4],
  r: 0.07,
});
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_silo',
  from: [-2.6, 2.4, -1.2],
  to: [-2.6, 1.1, 0.6],
  r: 0.07,
});

// Five work lamps along the apron's outer edge.
bathyarch.lampRow(root, put, lampM, {
  name: 'apron_lamp',
  r: 0.06,
  from: 0.35,
  pitch: 0.62,
  count: 5,
  y: 0.45,
  z: 3.82,
});

const size = fitFootprint(root, L);
if (Math.abs(size.x - DRAWN) > 1e-3)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(4)} units across; the header says ${DRAWN}`
  );
await exportGlb(root, 'refinery-bathyarch.glb');
