/**
 * The Bastion, Bathyarch Consortium — 440 m of footprint (2 × `radiusM`
 * 220, packages/shared/src/structures.ts), SIG 35 sustained.
 *
 * "The HQ — a large pressure dome with visible reinforcement ribs, docking
 * collars and external pipework, anchored to the seabed (SIG 35 sustained,
 * the settlement's constant hum). Sustained glow from ports and working
 * lights; the one building that can never run silent"
 * (docs/asset-prompts-3d.md, STRUCTURE — Bastion). One prompt block, four
 * scripts; the Klaxon's shares nothing with the other three navies'
 * Bastions — each navy's module holds its own — and is from the earlier
 * authoring pass its Sentinel Turret came from, so it ports from
 * `factions/bathyarch.mjs` alone, as the turret did (#639): "no curve
 * unless a pressure vessel demanded it", and this is the one that did.
 *
 * A port of the approved export
 * (docs/concept-art/models/bastion-bathyarch.glb at f7cce0f), part for
 * part in its order, every number the export's own, read off parts.mjs.
 * The ten-facet foundation and skirt, the dome — a hemisphere squashed
 * 0.92 in height and yawed 0.26 — six ribs over it, the cap and the
 * beacon; ten portholes round the skirt; three docking collars, each with
 * its ring and its lamp; three modules with two patches and four windows;
 * the jib crane; two ballast tanks, one banded; four pipes; and eight
 * perimeter posts with a lamp each. Its five materials are the turret's
 * `structureInk` — the three claddings and `work_lamp` at 2.4 — and
 * `port_glow` at 1.1, the Refinery's. Nothing here is a shape decision;
 * where the export is odd the script is odd with it:
 *
 * - The portholes are placed round the skirt at 2.74 from 0.31 radians,
 *   a tenth of a turn apart, and each is turned `[π/2, 0, π/2 − a]` in
 *   XYZ order, which stands its disc's axis on (−cos a, 0, sin a) — the
 *   radial mirrored across z, 2a off it folded into a right angle — so
 *   the two ports nearest ±z face out and the other eight face 0.62 to
 *   1.27 radians off their bearings. The three docking collars carry the
 *   same Euler and the same mirrored axis at 3.4 on bearings 0.4, 2.3 and
 *   4.4 — spaced in nothing — and lie 0.80, 1.46 and 0.62 radians off the
 *   rings they feed, which face radially 0.408 further out; each lamp is
 *   0.34 out and up at 1.35.
 * - The six ribs are half tori centred 0.02 above the dome's foot, yawed
 *   a sixth of a half turn apart, squashed with the dome; parts.mjs prints
 *   the fifth and sixth as the wrapped triple.
 * - The modules are yawed 0.5, −0.35 and 0.2, each patch with its module;
 *   the four windows are not yawed with theirs.
 * - The second ballast tank lies at `[π/2, 0.4, 0]`, pitched over and then
 *   yawed, with no band.
 * - Every pipe stands between two round points by the turret's `feed_pipe`
 *   rule: the refinery pipe from (2.4, 1.6, −1.9) to (1.4, 2.1, −0.9), the
 *   quarters pipe from (−2.5, 1, 1.2) to (−1.6, 1.5, 0.7), the ballast pipe
 *   from (−2.2, 1, −1.6) to (−1.2, 1.4, −0.8), the ring pipe from (3, 0.9,
 *   0.9) to (2.2, 1.3, 1.8).
 * - Of the twenty-seven lamps, the beacon, the dock and crane lamps, the
 *   windows and most of the portholes and perimeter lamps show a face or
 *   an edge from above; the fifth porthole and the fourth and eighth
 *   perimeter lamps sit under the quarters and refinery modules' overhang,
 *   so the export warns on those three, as the approved bake never saw
 *   them either.
 *
 * THE FRAME: a Z-long export by the measure the bake takes — 8.7012 along
 * z, the third dock ring's yawed box to the jib's tip, against 7.7194
 * across x — so every number goes through kit.mjs `drawn` and `part`
 * (`factions/bathyarch.mjs`'s `alongZ`) and `metreTrue` holds the
 * footprint at 440 m on that extent, `DRAWN` 8.7012 by three's
 * `Box3.setFromObject` (intake's `rawSize.z` on the approved file, wider
 * than the vertices by the ring's turned box, #647), the export's own
 * y = 0 kept as the ground, which is the foundation's underside. Intake
 * then reports ×1.000 and no rotation on the port's output, and the
 * shipped maps re-bake where the approved bake put them.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 440;
const DRAWN = 8.7012;

const black = bathyarch.structureInk.hullBlack();
const grey = bathyarch.structureInk.ironGrey();
const rust = bathyarch.structureInk.oxideRust();
const lampM = bathyarch.structureInk.workLamp(2.4);
const glow = bathyarch.structureInk.portGlow(1.1);
const put = bathyarch.alongZ;

const root = new THREE.Group();
root.name = 'bathyarch_bastion';

// "A large pressure dome with visible reinforcement ribs": foundation,
// skirt, the dome, six ribs, the cap and the beacon.
bathyarch.ribbedDome(
  root,
  put,
  { black, grey, rust, lampM },
  {
    foundation: { radii: [3.4, 3.8], h: 0.5, y: 0.25 },
    skirt: { radii: [2.5, 2.9], h: 0.9, y: 0.95 },
    dome: { r: 2.4, y: 1.4, yaw: 0.26, squash: 0.92 },
    ribs: { count: 6, R: 2.42, t: 0.09, y: 1.42 },
    cap: { radii: [0.5, 0.66], h: 0.5, y: 3.7 },
    beacon: { r: 0.16, y: 4.05 },
  }
);

// "Sustained glow from ports": ten round the skirt.
bathyarch.portholes(root, put, glow, {
  count: 10,
  phase: 0.31,
  r: 2.74,
  y: 1.15,
  disc: { r: 0.14, h: 0.1 },
});

// "Docking collars": three, each with its ring and its lamp.
bathyarch.dockingCollars(
  root,
  put,
  { grey, rust, lampM },
  {
    bearings: [0.4, 2.3, 4.4],
    r: 3.4,
    y: 0.85,
    collar: { radii: [0.55, 0.62], h: 0.7 },
    ring: { out: 0.408, R: 0.58, t: 0.08 },
    lamp: { out: 0.34, y: 1.35, r: 0.08 },
  }
);

// The modules round the dome, their patches, and their windows.
bathyarch.bastionModules(
  root,
  put,
  { black, grey, rust, glow },
  {
    modules: [
      {
        name: 'refinery',
        plate: 'black',
        size: [1.7, 1.3, 1.2],
        at: [2.7, 1.15, -2.2],
        yaw: 0.5,
        patch: { size: [0.9, 0.7, 0.06], at: [2.35, 1.2, -1.55] },
      },
      {
        name: 'quarters',
        plate: 'grey',
        size: [1.3, 1, 1.6],
        at: [-3, 1, 1.4],
        yaw: -0.35,
        patch: { size: [0.06, 0.6, 0.8], at: [-2.35, 1.1, 1.15] },
      },
      { name: 'store', plate: 'rust', size: [1, 0.8, 1], at: [-1.6, 0.9, -3], yaw: 0.2 },
    ],
    windows: {
      size: [0.16, 0.12, 0.05],
      at: [
        ['refinery_1', [3.1, 1.5, -1.75]],
        ['refinery_2', [2.6, 1.5, -1.5]],
        ['quarters_1', [-2.6, 1.25, 2.1]],
        ['quarters_2', [-2.9, 1.25, 2.25]],
      ],
    },
  }
);

// The jib crane on the +z flank.
bathyarch.jibCrane(
  root,
  put,
  { grey, rust, black, lampM },
  {
    mast: { size: [0.22, 3.4, 0.22], at: [1.9, 2.2, 2.6] },
    jib: { size: [0.16, 0.16, 2.6], at: [1.9, 3.75, 3.5], pitch: 0.08 },
    counter: { size: [0.4, 0.3, 0.6], at: [1.9, 3.6, 1.9] },
    cable: { r: 0.02, h: 1.7, at: [1.9, 2.9, 4.55] },
    hook: { size: [0.3, 0.24, 0.3], at: [1.9, 2, 4.55] },
    lamp: { r: 0.07, at: [1.9, 3.85, 4.7] },
  }
);

// Two ballast tanks, the first banded and laid along x, the second
// pitched over and yawed 0.4; then "external pipework", four pipes each
// stood between two round points.
bathyarch.bandedTank(
  root,
  put,
  { tank: grey, band: rust },
  {
    name: 'ballast_a',
    at: [-2.2, 1, -1.6],
    r: 0.5,
    length: 2.4,
    rot: [0, 0, Math.PI / 2],
    band: { R: 0.52, t: 0.05 },
  }
);
bathyarch.bandedTank(
  root,
  put,
  { tank: rust },
  { name: 'ballast_b', at: [3.2, 0.9, 0.9], r: 0.4, length: 1.8, rot: [Math.PI / 2, 0.4, 0] }
);
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_refinery',
  from: [2.4, 1.6, -1.9],
  to: [1.4, 2.1, -0.9],
  r: 0.09,
});
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_quarters',
  from: [-2.5, 1, 1.2],
  to: [-1.6, 1.5, 0.7],
  r: 0.09,
});
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_ballast',
  from: [-2.2, 1, -1.6],
  to: [-1.2, 1.4, -0.8],
  r: 0.07,
});
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_ring',
  from: [3, 0.9, 0.9],
  to: [2.2, 1.3, 1.8],
  r: 0.07,
});

// "Working lights": eight posts round the foundation's edge, a lamp each.
bathyarch.perimeterPosts(
  root,
  put,
  { black, lampM },
  {
    count: 8,
    phase: 0.15,
    r: 3.65,
    post: { radii: [0.04, 0.05], h: 0.55, y: 0.78 },
    lamp: { r: 0.07, y: 1.1 },
  }
);

metreTrue(root, L, { drawn: DRAWN });
await exportGlb(root, 'bastion-bathyarch.glb');
