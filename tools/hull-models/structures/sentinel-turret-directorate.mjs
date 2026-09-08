/**
 * The Sentinel Turret, Abyssal Directorate — 120 m of footprint (2 × `radiusM`
 * 60, packages/shared/src/structures.ts), SIG 12 idle.
 *
 * "Compact static-defence mount and barrel on a reinforced base. Nearly black
 * — an ambush predator, navigation marks only until it fires"
 * (docs/asset-prompts-3d.md, STRUCTURE — Sentinel Turret). One prompt block,
 * four scripts; the per-navy difference is docs/art-direction.md's.
 *
 * The Directorate's is the carapace laid down: a mound plated in scutes, a
 * browed head with its antennae, and a segmented stinger for a gun. The claw
 * rank runs 0, 1, 2, 4, 5 — the gap is the approved turret's and it stays,
 * because "asymmetric, yet regimented" is what a regular rule with a hole in
 * its result looks like.
 *
 * The frame is the one every turret here shares: metre-true at 120 m with the
 * muzzle on +X, because that is what both the bake and the runtime
 * canonicalise to (see sentinel-turret-hadron.mjs for why). x runs -60 to +60
 * across the footprint the table prices.
 */
import { exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const MOUND_X = -5.3;
const MOUND_Z = -0.15;

const violet = directorate.ink.chitinViolet();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const red = directorate.structureInk.chitinRedDark();
const crimson = directorate.ink.biolightCrimson();

const root = new directorate.THREE.Group();
root.name = 'directorate_sentinel_turret';

// The mound, the skirt where it meets the ground, the collar the head turns in.
directorate.carapaceMound(
  root,
  { violet, black, steel },
  {
    x: MOUND_X,
    z: MOUND_Z,
    y: 21.1,
    r: [42.4, 14.7, 48],
    skirt: { r: 41, t: 2, y: 10.5 },
    collar: { r: 26.8, t: 3.25, y: 28.15 },
  }
);

// Five scutes plated round the mound — a regular rule, never a regular result.
directorate.baseScutes(root, [black, red], {
  x: MOUND_X,
  z: MOUND_Z,
  y: 17,
  scutes: [
    [-72, 32, [30, 21, 37]],
    [8, 29, [39, 20, 30]],
    [70, 32, [36, 25, 44]],
    [131, 31, [33, 20, 34]],
    [-164, 28, [42, 22, 34]],
  ],
});

// The head: pod, brow, three antennae, and the spike that counters the stinger.
directorate.browHead(
  root,
  { red, black, violet },
  {
    x: -3.85,
    y: 38.9,
    z: 0.25,
    podR: [24.35, 18.4, 28.95],
    brow: { at: [-3.35, 49.45, 6.35], r: [31.95, 13.65, 21.05], tilt: 0.06 },
    antennae: [
      [-8.0, 9.0, 22, 0.26],
      [-6.5, -1.8, 27, 0.04],
      [-5.2, -13.0, 19, -0.22],
    ],
    counter: { at: [-10, 48, 22.7], r: 6, length: 20, rake: 1.0 },
  }
);

// The gun as a stinger: three barbed segments closing on the tip.
directorate.stingerBarrel(
  root,
  { steel, violet, black, pip: crimson },
  { from: [0, 41, -9], to: [57.1, 97.5, -51.5], r: 9, segments: 3 }
);

// The claw rank on the seabed, gap and all.
directorate.clawGrips(root, [red, black], {
  x: MOUND_X,
  z: MOUND_Z,
  y: 6.7,
  grips: [
    [0, -61, 49.5, [13, 14, 19]],
    [1, 6.4, 45, [18, 11, 6.5]],
    [2, 68, 49.5, [11, 12, 19]],
    [4, 174.5, 45.1, [17, 10, 6.5]],
    [5, -127, 48, [14, 11, 15.5]],
  ],
});

// One magazine, on the flank, feeding up into the collar.
directorate.magazine(
  root,
  { steel, red },
  {
    pod: { at: [16.05, 8.2, 39.3], r: [16.05, 8.2, 11.3], roll: -0.14 },
    pipe: { from: [11, 10, 34.5], to: [7, 32, 19.5], r: 3, sag: 1.5 },
    flangeAt: { at: [7.6, 31.2, 19.75], r: 3.35, t: 1.4 },
  }
);

// The whole resting light budget: three photophores on upward faces — two on
// scute crowns, one on the brow. Everything else stays dark until it fires.
// `photophores` is the navy's own light builder and refuses a mirrored pair,
// which is why the marks are placed rather than ranked.
directorate.photophores(root, crimson, {
  size: 4.2,
  h: 0.6,
  spots: [
    ['nav_mark_0', 6.5, 30.5, -31.5],
    ['nav_mark_1', 5.0, 33.0, 30.5],
    ['nav_mark_2', -24.5, 56.5, -3.9],
  ],
});

await exportGlb(root, 'sentinel-turret-directorate.glb');
