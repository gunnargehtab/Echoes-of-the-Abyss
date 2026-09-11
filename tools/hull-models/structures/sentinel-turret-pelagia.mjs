/**
 * The Sentinel Turret, Pelagia Commune — 120 m of footprint (2 × `radiusM` 60,
 * packages/shared/src/structures.ts), SIG 12 idle.
 *
 * "Compact static-defence mount and barrel on a reinforced base. Nearly black
 * — an ambush predator, navigation marks only until it fires"
 * (docs/asset-prompts-3d.md, STRUCTURE — Sentinel Turret). One prompt block,
 * four scripts; the per-navy difference is docs/art-direction.md's.
 *
 * The Commune's is grown rather than founded: a mound cut off short of the
 * ground and held down by five unequal roots, a pod under a half-shell of a
 * cowl for a head with four quills on its crown, and a limb of three swelling
 * joints for a gun, ribbed at the root, with an iris and one lit bud at the
 * muzzle. Nothing is a matched pair, and the magazine is single, on the side
 * it grew.
 *
 * A port of the approved export (docs/concept-art/models/sentinel-turret-
 * pelagia.glb at 0522b01~1), part for part in its order, every number the
 * export's own, read off its nodes and its buffers (#639). Every part comes
 * from `factions/pelagia.mjs`. Nothing here is a shape decision; where the
 * export is odd the script is odd with it: the roots lie *across* the mound's
 * radius rather than out along it, two of the three nav marks sit low on the
 * flank rather than on the crown, the recoil ribs wear the cowl's ink, and
 * the lamp burns at 0.953 of full strength.
 *
 * THE FRAME is the one every turret here shares, and the one the Light Scouts
 * state for the shared kinds (hulls/light-scout-pelagia.mjs): the export is
 * drawn along Z, 7.73 units long for a 120 m footprint, ground at y = 0; it
 * is built here metre-true at 120 m along +X, centred on its length, the
 * ground kept at y = 0 — which is where the bake and the runtime put a Z-long
 * file anyway. Every placement goes through kit.mjs `drawn`; the export's two
 * frames — `turret_head`, trained 0.3 rad off the mound, and `barrel_group`,
 * yawed 0.35 and pitched 0.9 off the head — through kit.mjs `group`; the one
 * scale and shift through `metreTrue`. `DRAWN` is the export's length as
 * intake measures it, three's `Box3` over the parts' own boxes, which the
 * leaned roots' boxes overhang, so that both consumers' own rescale is
 * exactly 1 and the maps stay where the approved export put them. Where a
 * node's rotation is round in another Euler order than XYZ it is written in
 * that order through `eulerXYZ`; the roots' yaws are the file's node matrices
 * decomposed, to nine places.
 *
 * What the first port (#553) had decided, and this puts back: the roots as
 * radial orbs; the nav marks lifted onto the crown as flat strips; the limb
 * drawn from a from–to line; the pipe as a sagging cable; the pod and the
 * roots as orbs; the mound and the cowl as closed orbs; every facet count;
 * the collar behind the ring and the pod ahead of the pipe in the order; and
 * the ribs in steel.
 */
import { THREE, drawn, eulerXYZ, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 120;
const DRAWN = 7.9848;
const DATUM = 0;

// A torus is born in the XY plane; every ring on this turret lies flat.
const FLAT = [Math.PI / 2, 0, 0];
// The roots lie 0.13 rad short of flat, each yawed its own way.
const LAID = Math.PI / 2 - 0.13;

const body = pelagia.structureInk.deepChlorophyll();
const steel = pelagia.structureInk.grownSteel();
const algae = pelagia.structureInk.algaeHull();
const bio = pelagia.structureInk.biolightGreen(0.9533138767058983);

const root = new THREE.Group();
root.name = 'sentinel_turret';

// The mound — an orb cut off 0.42 of the way down, wider than it is deep —
// the collar the head turns in, and the growth ring at its foot.
pelagia.grownMound(
  root,
  { body, ring: algae, collar: steel },
  {
    mound: {
      r: 3,
      facets: [11, 6],
      down: 0.42,
      ...drawn([0.15, 0, -0.1], [0, 0, 0], [1.15, 0.85, 1]),
    },
    collar: { R: 1.55, tube: 0.22, facets: [5, 11], ...drawn([0.1, 2.05, 0], FLAT) },
    ring: { R: 2.6, tube: 0.13, facets: [4, 16], ...drawn([0.15, 0.9, -0.1], FLAT, [1.12, 1, 1]) },
  }
);

// The head, trained 0.3 rad off the mound's axis: a pod; the cowl grown over
// it, a half-shell open 0.525 of a turn, laid on its side and rolled 0.12;
// and four quills on the cowl's crown, each its own height and lean.
const head = pelagia.grownHead(
  root,
  { pod: algae, cowl: body },
  {
    ...drawn([0.1, 2.75, 0], [0, 0.3, 0]),
    pod: { r: 1.5, facets: [10, 6], ...drawn([0, 0, 0], [0, 0, 0], [1.25, 0.85, 1]) },
    cowl: {
      r: 1.68,
      facets: [10, 5],
      round: 0.525,
      down: 0.5,
      ...drawn([0, 0, 0], eulerXYZ([0, -Math.PI / 2, -0.12], 'YXZ'), [1.22, 0.95, 1]),
    },
    quills: [
      {
        r: 0.09,
        length: 0.94407546,
        ...drawn([-0.6472244771156741, 1.5449121528506677, -0.5], [-0.2, 0, 0.4]),
      },
      {
        r: 0.09,
        length: 0.83783376,
        ...drawn([-0.10788483685838317, 1.5985607678361786, -0.18], [-0.08, 0, 0.064]),
      },
      {
        r: 0.09,
        length: 1.0900805,
        ...drawn([0.4502075743900994, 1.5742395994877558, 0.14], [0.04, 0, -0.272]),
      },
      {
        r: 0.09,
        length: 1.27068018,
        ...drawn([0.9300439508992443, 1.4761762048334073, 0.46], [0.16, 0, -0.608]),
      },
    ],
  }
);

// The gun as a limb, in a frame of its own off the head — yawed 0.35 and
// pitched 0.9 — three joints swelling toward the root, the iris and the one
// lit bud at the muzzle, and three ribs banding the root in the cowl's ink.
pelagia.grownBarrel(
  head,
  { rootMat: steel, mid: algae, tip: steel, iris: body, rib: body, pip: bio },
  {
    ...drawn([0.55, 0.15, 0.45], eulerXYZ([0.9, 0.35, 0], 'YXZ')),
    root: { radii: [0.34, 0.46], length: 2.2, facets: 7, ...drawn([0, 1.1, 0]) },
    mid: { radii: [0.22, 0.32], length: 2.4, facets: 7, ...drawn([0, 3.2, 0]) },
    tip: { radii: [0.13, 0.2], length: 1.6, facets: 6, ...drawn([0, 5.1, 0]) },
    iris: { R: 0.19, tube: 0.07, facets: [4, 8], ...drawn([0, 5.92, 0], FLAT) },
    pip: { r: 0.08, facets: [5, 4], ...drawn([0, 5.9, 0]) },
    ribs: [
      { R: 0.5, tube: 0.06, facets: [4, 9], ...drawn([0, 0.5, 0], FLAT) },
      { R: 0.47, tube: 0.06, facets: [4, 9], ...drawn([0, 1.15, 0], FLAT) },
      { R: 0.44, tube: 0.06, facets: [4, 9], ...drawn([0, 1.8, 0], FLAT) },
    ],
  }
);

// "Navigation marks only": three buds of biolight — two low on the flank, one
// on the cowl — which with the pip at the muzzle are the whole resting light.
pelagia.lightBuds(root, bio, {
  facets: [5, 4],
  buds: [
    ['nav_mark_0', 0.08, drawn([2.9, 0.75, 1.1])],
    ['nav_mark_1', 0.08, drawn([-2.3, 1.15, -1.6])],
    ['nav_mark_2', 0.08, drawn([0.4, 3.55, -1.35])],
  ],
});

// Five holdfasts on the seabed, no two alike: capsules laid over 0.13 short
// of flat, each yawed its own way, lying across the mound's radius.
pelagia.rootGrips(root, [algae, body], {
  facets: [3, 6],
  grips: [
    {
      r: 0.38352045,
      length: 1.112319,
      ...drawn([2.9690042055939774, 0.22, 0.947048385683312], [0, 1.192326271, LAID]),
    },
    {
      r: 0.3883763,
      length: 1.59932828,
      ...drawn([-0.5900423011380956, 0.22, 2.797975606173658], [0, -0.234886344, LAID]),
    },
    {
      r: 0.3391729,
      length: 1.93526434,
      ...drawn([-2.991084262107794, 0.22, 0.7887610694964543], [0, -1.278131747, LAID]),
    },
    {
      r: 0.37829553,
      length: 1.77474868,
      ...drawn([-1.2184146463197347, 0.22, -2.8472884042206683], [0, -2.704463839, LAID]),
    },
    {
      r: 0.41969737,
      length: 1.81824696,
      ...drawn([2.534259678239497, 0.22, -2.1662189043234585], [0, 2.316454649, LAID]),
    },
  ],
});

// One magazine, on the flank it grew on: the feed leaning up into the collar,
// the pod — a capsule laid on its side and rolled 0.4 — and the flange.
pelagia.magazine(
  root,
  { pipe: steel, pod: steel, flange: algae },
  {
    pipe: { radii: [0.13, 0.16], length: 2.3, facets: 6, ...drawn([-1.5, 1.6, 0.9], [0.25, 0, 0.55]) },
    pod: { r: 0.55, length: 1.1, facets: [3, 7], ...drawn([-2.4, 0.75, 1.3], [Math.PI / 2, 0, 0.4]) },
    flange: {
      R: 0.18,
      tube: 0.05,
      facets: [4, 9],
      ...drawn([-1.15, 2.25, 0.75], [Math.PI / 2 + 0.25, 0, 0.55]),
    },
  }
);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'sentinel-turret-pelagia.glb');
