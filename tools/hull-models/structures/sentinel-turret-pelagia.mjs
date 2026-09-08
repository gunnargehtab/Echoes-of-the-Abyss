/**
 * The Sentinel Turret, Pelagia Commune — 120 m of footprint (2 × `radiusM` 60,
 * packages/shared/src/structures.ts), SIG 12 idle.
 *
 * "Compact static-defence mount and barrel on a reinforced base. Nearly black
 * — an ambush predator, navigation marks only until it fires"
 * (docs/asset-prompts-3d.md, STRUCTURE — Sentinel Turret). One prompt block,
 * four scripts; the per-navy difference is docs/art-direction.md's.
 *
 * The Commune's is grown rather than founded: a mound held down by five
 * unequal roots, a pod under a cowl for a head, and a limb for a gun. Nothing
 * is a matched pair — `rootGrips` refuses one outright — and the magazine is
 * single, on the side it grew.
 *
 * The frame is the one every turret here shares: metre-true at 120 m with the
 * muzzle on +X, because that is what both the bake and the runtime
 * canonicalise to (see sentinel-turret-hadron.mjs for why). x runs -60 to +60
 * across the footprint the table prices; the mound sits aft of centre because
 * the limb overhangs forward.
 */
import { exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const MOUND_X = -6.2;

const body = pelagia.structureInk.deepChlorophyll();
const steel = pelagia.structureInk.grownSteel();
const algae = pelagia.structureInk.algaeHull();
const bio = pelagia.structureInk.biolightGreen();

const root = new pelagia.THREE.Group();
root.name = 'pelagia_sentinel_turret';

// The mound, its growth ring, and the collar the head turns in.
pelagia.grownMound(
  root,
  { body, ring: algae, collar: steel },
  {
    x: MOUND_X,
    z: 0.35,
    y: 29.6,
    r: [44.7, 14.9, 50.9],
    ringAt: { r: 45, t: 2.05, y: 18.85 },
    collarAt: { r: 27, t: 3.25, y: 36.75 },
  }
);

// Five holdfasts on the seabed, no two alike.
pelagia.rootGrips(root, [algae, body], {
  x: MOUND_X,
  z: 0.35,
  y: 8.3,
  grips: [
    [-70, 40, [28, 14, 18]],
    [13, 40, [22, 15.2, 34]],
    [74, 40, [26, 14.4, 20]],
    [155, 40, [24, 15.2, 32]],
    [-130, 40, [30, 16.6, 26]],
  ],
});

// The head: a pod, a cowl grown over it off-centre, four quills on the crown.
pelagia.grownHead(
  root,
  { pod: algae, cowl: body },
  {
    x: -4.65,
    y: 47.6,
    z: 0.1,
    podR: [23.9, 19.8, 27.8],
    cowlR: [30.6, 14.2, 19.8],
    cowlAt: [-4.2, 58, 6.8],
    quills: [
      [-8.6, 11.4, 14.2, 0.22],
      [-6.4, 2.0, 13.4, 0.1],
      [-4.2, -6.6, 15.1, -0.06],
      [-1.6, -15.3, 13.8, -0.2],
    ],
  }
);

// The gun as a limb, raked up and off the beam the way it grew.
pelagia.grownBarrel(
  root,
  { rootMat: steel, mid: algae, tip: steel, iris: body, pip: bio },
  { from: [9.75, 59.6, -17.4], to: [55, 105.5, -52], r: 7.5, ribs: 3 }
);

// One magazine, on the flank it grew on, feeding up into the collar.
pelagia.magazine(
  root,
  { pipe: steel, pod: steel, flange: algae },
  {
    pod: { at: [15.5, 16.6, 39.3], r: [16.3, 8.4, 11.5], roll: 0.18 },
    pipe: { from: [11, 17.5, 34.5], to: [7, 40, 19.5], r: 3.1, sag: 1.6 },
    flangeAt: { at: [7, 39.9, 19.5], r: 3.4, t: 1.45 },
  }
);

// The whole resting light budget: three marks on upward faces — two on the
// mound's own crown, one on the cowl. On the growth ring they would be under
// the mound's overhang, which `lightAudit` measures rather than assumes.
pelagia.navMarks(root, bio, {
  w: 4.2,
  d: 4.2,
  marks: [
    ['nav_mark_0', 11.5, 36.3, -41.0],
    ['nav_mark_1', -30.2, 35.8, 38.5],
    ['nav_mark_2', -25.6, 64.5, -4.4],
  ],
});

await exportGlb(root, 'sentinel-turret-pelagia.glb');
