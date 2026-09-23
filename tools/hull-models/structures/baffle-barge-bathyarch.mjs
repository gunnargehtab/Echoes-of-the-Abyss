/**
 * The Baffle Barge, Bathyarch Consortium — 180 m of footprint (2 ×
 * `radiusM` 90, packages/shared/src/structures.ts), SIG 30 idle.
 *
 * "Moored noise-masking support barge, boxy and over-engineered, ringed
 * with baffle vanes and acoustic dampening panels (SIG 30 idle). Dim amber
 * running lights" (docs/asset-prompts-3d.md, STRUCTURE — Baffle Barge).
 * The Klaxon's signature structure, one navy's alone, so it ports from
 * `factions/bathyarch.mjs` alone.
 *
 * A port of the approved export
 * (docs/concept-art/models/baffle-barge-bathyarch.glb at f7cce0f), part
 * for part in its order, every number the export's own, read off
 * parts.mjs. A box of a hull on its skirt under a deck plate with a
 * gunwale a side; a pontoon at each corner, capped, footed and bolted six
 * times; six foam vanes on a rail down each flank and three across each
 * end; four dampening pads and three patch plates; the emitter mast — base,
 * trunk, collar, drum, eight fins and the beacon; the winch, two vent
 * stacks, two capstans and the deck pipe; a mooring chain and anchor block
 * at each corner; three running lights a side, a dome on each pontoon, and
 * two `KHR_lights_punctual` point lights either beam. Its six materials
 * are `ink`'s hyphenated set: the Submersible's four to the value and the
 * name — `amber-running-light` on #1A1206, at the export's 2.6 — and the
 * foam and the hazard paint of its own (`bargeInk` until #888). Nothing
 * here is a shape decision; where the export is odd the script is odd with
 * it:
 *
 * - Port is −z already: `gunwale-port` at −1.4, `pad-flank-p` at −1.58,
 *   `pontoon-ap` at −1.85, the port vanes at −1.92, `glow-port` at −1.6
 *   (#642). No relabel; every name stays.
 * - The pontoons and the corner domes come aft port, aft starboard, fore
 *   port, fore starboard; the moorings come aft port, fore port, aft
 *   starboard, fore starboard. Both orders are the file's.
 * - Each mooring chain hangs from a point under its pontoon, (2.15, −1.5,
 *   1.85) mirrored to its corner, to its anchor block at (3.8, −3.1, 2.7),
 *   and is turned by three's `lookAt` at the block and then a quarter turn
 *   about its own x — not by `setFromUnitVectors` like every pipe on the
 *   Refinery and the Bastion — which keeps the cylinder's x horizontal;
 *   `moorings` says how that was read off the four matrices. The four
 *   anchor blocks are all yawed 0.4 the same way, not mirrored.
 * - The flank pads are not a pair: port 1.6 by 0.9 at x 0.8, starboard
 *   1.3 by 0.8 at −1.2; the second deck pad is yawed a tenth; the third
 *   patch plate is hazard paint on the port bow, below the waterline.
 * - The mast collar sits at 1.75, below the trunk's middle at 2.15.
 * - The two point lights are #F2B233 at intensity 4 and range 4, with no
 *   mesh; the port writes them back as the file has them, last.
 * - Of the eleven lamps, the beacon, the six running lights and the four
 *   corner domes all face up; the export warns on none.
 *
 * THE FRAME: an X-long export (8.3863 along x, anchor block to anchor
 * block by their yawed boxes, against 6.1863 across z), so nothing is
 * yawed: every part is placed by kit `add` in the file's own frame —
 * `factions/bathyarch.mjs`'s `inFrame` — the primitive un-turned, the
 * node's translation and XYZ Euler verbatim, and the hull box at the
 * origin with no transform at all, as the file has it. The footprint is
 * held at 180 m the Vent Taps' way (#608): `fitFootprint` measures the
 * plan by three's `Box3.setFromObject`, `DRAWN` 8.3863 on x (intake's
 * `rawSize.x` on the approved file), and scales the root to it, so intake
 * reports ×1.000 and no rotation on the port's output and the shipped
 * maps re-bake where the approved bake put them.
 */
import { THREE, hex, fitFootprint, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 180;
const DRAWN = 8.3863;

const black = bathyarch.ink.hullBlackHeavy();
const brown = bathyarch.ink.oxideBrown();
const grey = bathyarch.ink.ironGreyHeavy();
const foam = bathyarch.ink.baffleFoam();
const paint = bathyarch.ink.hazardPaint();
const lampM = bathyarch.ink.runningLight(2.6);
const put = bathyarch.inFrame;

const root = new THREE.Group();
root.name = 'bathyarch-baffle-barge';

// "Boxy and over-engineered": the hull box, its skirt, the deck plate and
// a gunwale a side.
bathyarch.bargeHull(
  root,
  put,
  { black, brown, grey },
  {
    hull: { size: [5, 1.5, 3] },
    skirt: { size: [5.3, 0.4, 3.3], at: [0, -0.65, 0] },
    deck: { size: [4.6, 0.14, 2.6], at: [0, 0.82, 0] },
    gunwales: { size: [4.8, 0.22, 0.18], y: 1, z: 1.4 },
  }
);

// A pontoon at each corner, capped, footed and bolted.
bathyarch.pontoons(
  root,
  put,
  { grey, brown, black },
  {
    x: 2.15,
    z: 1.85,
    y: -0.25,
    r: 0.55,
    h: 2.2,
    cap: { r: 0.62, h: 0.24, y: 0.95 },
    foot: { radii: [0.4, 0.62], h: 0.3, y: -1.45 },
    bolts: { r: 0.06, h: 0.1, radius: 0.5, y: 1.08 },
  }
);

// "Ringed with baffle vanes": six a flank on a rail, three across each end.
bathyarch.baffleVanes(
  root,
  put,
  { foam, brown },
  {
    flank: {
      stations: [-1.75, -1.05, -0.35, 0.35, 1.05, 1.75],
      size: [0.12, 1.1, 0.7],
      y: 0.05,
      z: 1.92,
      yaw: 0.5,
    },
    rail: { size: [4.4, 0.14, 0.14], y: 0.65, z: 1.92 },
    ends: { stations: [-0.8, 0, 0.8], size: [0.7, 1, 0.12], x: 2.92, y: 0, yaw: 0.5 },
  }
);

// "Acoustic dampening panels": two pads on the deck, one on each flank;
// and three patch plates, none in the same plate.
bathyarch.dampeningPads(root, put, foam, {
  pads: [
    ['pad-deck-1', [1.4, 0.16, 1], [-1.5, 0.97, -0.6]],
    ['pad-deck-2', [1.1, 0.16, 0.9], [0.2, 0.97, 0.7], 0.1],
    ['pad-flank-p', [1.6, 0.9, 0.14], [0.8, 0.1, -1.58]],
    ['pad-flank-s', [1.3, 0.8, 0.14], [-1.2, 0.15, 1.58]],
  ],
});
bathyarch.patchPlates(
  root,
  put,
  { brown, grey, paint },
  {
    plates: [
      ['brown', [1.2, 0.1, 0.8], [1.7, 0.91, -0.7], 0.12],
      ['grey', [0.8, 0.7, 0.1], [-2.1, 0.2, 1.56]],
      ['paint', [0.9, 0.5, 0.1], [2.2, -0.3, -1.56]],
    ],
  }
);

// The emitter mast amidships, eight fins round its drum, the beacon on top.
bathyarch.emitterMast(
  root,
  put,
  { grey, brown, black, foam, lampM },
  {
    x: -0.4,
    base: { size: [1, 0.5, 1], y: 1.15 },
    trunk: { radii: [0.18, 0.24], h: 1.6, y: 2.15 },
    collar: { r: 0.3, h: 0.2, y: 1.75 },
    drum: { r: 0.55, h: 0.5, y: 3.05 },
    fins: { r: 0.75, y: 3.05, size: [0.5, 0.4, 0.08] },
    beacon: { radii: [0.14, 0.17], h: 0.16, y: 3.41 },
  }
);

// The deck gear: winch, vent stacks, capstans and the pipe run.
bathyarch.deckGear(
  root,
  put,
  { brown, grey },
  {
    winch: {
      house: { size: [1.1, 0.7, 0.9], at: [1.6, 1.25, 0.5] },
      drum: { r: 0.26, h: 0.7, at: [1.6, 1.7, 0.5] },
    },
    vents: {
      stacks: [
        { radii: [0.16, 0.2], h: 0.7, at: [-1.9, 1.2, 0.8] },
        { radii: [0.13, 0.16], h: 0.55, at: [-2.2, 1.13, 0.45] },
      ],
      elbow: { size: [0.26, 0.26, 0.26], at: [-1.9, 1.6, 0.8] },
    },
    capstans: { radii: [0.2, 0.26], h: 0.4, fore: 2.2, aft: -2.2, y: 1.05, z: -0.9 },
    pipe: {
      r: 0.09,
      length: 3.2,
      at: [0.2, 0.93, -1.15],
      elbow: { size: [0.2, 0.2, 0.2] },
      elbowA: [1.85, 0.93, -1.15],
      riser: { h: 0.5, at: [1.85, 1.2, -1.15] },
      elbowB: [-1.45, 0.93, -1.15],
    },
  }
);

// "Moored": a chain and an anchor block at each corner.
bathyarch.moorings(
  root,
  put,
  { brown, black },
  {
    chain: { from: [2.15, -1.5, 1.85], to: [3.8, -3.1, 2.7], r: 0.06 },
    block: { size: [0.6, 0.5, 0.6], x: 3.8, y: -3.3, z: 2.7, yaw: 0.4 },
  }
);

// "Dim amber running lights": three a side, a dome on each pontoon, and
// the two point lights the export carries beside its meshes.
bathyarch.hullLights(root, lampM, {
  running: { size: [0.55, 0.09, 0.07], stations: [-1.4, 0, 1.4], y: 1.13, z: 1.4 },
});
bathyarch.cornerDomes(root, put, lampM, {
  x: 2.15,
  z: 1.85,
  y: 1.14,
  radii: [0.11, 0.13],
  h: 0.12,
});
bathyarch.glowLamps(root, {
  color: hex('#F2B233'),
  intensity: 4,
  range: 4,
  lamps: [
    ['glow-port', [0, 1.2, -1.6]],
    ['glow-stb', [0, 1.2, 1.6]],
  ],
});

const size = fitFootprint(root, L);
if (Math.abs(size.x - DRAWN) > 1e-3)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(4)} units across; the header says ${DRAWN}`
  );
await exportGlb(root, 'baffle-barge-bathyarch.glb');
