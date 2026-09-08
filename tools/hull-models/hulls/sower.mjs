/**
 * The Sower — the Commune's terraformer, 90 m (docs/units.md, "The siege
 * hulls").
 *
 * "A leaf, the one hull in the roster wider at the bow than at the waist (SIG
 * 20 idle, 45 while seeding; no weapon; PR 2, grown for the water it plants).
 * A broad flat bloom-bed forward with radial ribs and pale seed pods, a
 * pressure bladder at the node, a narrow grown stem aft with a caudal fin. Dim
 * accent veins along the ribs and one lit bud at the node; the bloom flares
 * when it seeds."
 *
 * A leaf is the whole hull, so the parts read the way a leaf's do: a node
 * where the bed meets the stem, a midrib forward from it, three ribs a side
 * fanning off it, and a margin that is the widest thing on the hull. Every
 * part comes from `factions/pelagia.mjs`.
 *
 * Two things are the navy's rules made load-bearing here rather than decorative:
 *
 * - **Beam is body.** The 54 m of beam is the bed itself — one membrane plate,
 *   no wing anywhere on the hull. It is also why the bed's margin is bevelled:
 *   a hard rim on the largest flat surface in the game reads as sheet metal,
 *   and this navy is grown.
 * - **Light is a vein.** Fifteen lit parts and every one of them is a strip on
 *   an upward face — seven rib veins, six margin lights, one on the stem, and
 *   the single bud at the node. Nothing on this hull points a lamp at anything.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, leaf tip to stem.
 *
 * The two disagree because the tip was measured off the bed rather than off
 * the point, so intake and the runtime have both been squeezing this hull by
 * 0.947 since it landed. The numbers below are the approved model's own — they
 * are what `pelagia.mjs`'s header transcribes — and the root carries that one
 * squeeze, which makes the file metre-true (kit.mjs) and leaves the shipped
 * maps exactly where they were.
 */
const L = 90;
const DRAWN = 95;

/** Where the ribs spring from, and where the bladder and the bud sit with them. */
const NODE_X = -8;

/** A rib as its tip: the approved model draws them to a point, not to a bearing. */
const ribTo = (x, z) => [Math.hypot(x - NODE_X, z), Math.atan2(z, x - NODE_X)];

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const spore = pelagia.ink.sporePod();
const vein = pelagia.ink.bioVein();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_sower';
root.scale.setScalar(L / DRAWN);

// The bloom bed, and with it the hull's whole beam. Widest at x = 18, a third
// of the way aft of the tip — the one plan outline in the roster that is
// broader forward than amidships.
pelagia.bloomBed(root, { membrane, chitin }, {
  outline: [
    [-14, -9],
    [4, -21],
    [18, -26],
    [30, -23],
    [40, -14],
    [47, -2],
    [47, 2],
    [40, 14],
    [30, 23],
    [18, 26],
    [4, 21],
    [-14, 9],
  ],
  depth: 3,
  bevel: 1,
  underside: {
    outline: [
      [-12, -7],
      [4, -17],
      [18, -22],
      [28, -19],
      [36, -12],
      [42, -2],
      [42, 2],
      [36, 12],
      [28, 19],
      [18, 22],
      [4, 17],
      [-12, 7],
    ],
    depth: 2,
    y: -2.6,
  },
});

// Midrib and three ribs a side, drawn to their tips. Venation is the one
// Commune series that is bilateral, because a leaf's is.
pelagia.ribFan(root, { ridge, vein }, {
  node: [NODE_X, 0],
  y: 1.9,
  r: 1.1,
  midrib: 54,
  port: [ribTo(38, 14), ribTo(26, 22), ribTo(10, 22)],
});

// The pressure bladder at the node — 18 m across and 9 m tall, the flattest
// body in the navy — and the one lit bud riding on it.
pelagia.bladder(root, { chitin, ridge }, {
  x: -6,
  y: 2.5,
  r: 9,
  squash: 0.5,
  rings: [
    [0, 6.4],
    [-3, 7.4],
  ],
});
pelagia.bud(root, light, { x: -2, y: 6.4, r: 2.6 });

// Six seed pods grown on the bed, each its own size and none in a rank.
pelagia.seedPods(root, { skin: spore, cap: ridge }, {
  pods: [
    [26, 3.2, 9, 3.2],
    [16, 2.9, -12, 2.6],
    [30, 2.7, -6, 2.2],
    [10, 2.8, 14, 2.4],
    [34, 2.5, 3, 1.8],
    [20, 2.6, 0, 2.0],
  ],
});

// The stem: 35 m of narrow grown body aft of the node, ringed three times,
// with a keel blade on its back and the caudal fin trailing off its end.
pelagia.stem(root, { chitin, ridge }, {
  from: -45,
  to: -10,
  r: 4.2,
  y: 0.6,
  squash: 0.78,
  rings: [-36, -28, -20],
  keel: { from: -38, to: -22, height: 3 },
});
pelagia.fins(root, membrane, {
  y: 0.65,
  pairs: [
    [
      'caudal',
      [
        [-36, 2],
        [-40, 1.5],
        [-45, 9],
        [-41, 9],
      ],
    ],
  ],
});
pelagia.nose(root, ridge, { tip: 50, y: 0.2, r: 1.5, length: 6 });

// Three margin lights a side and one on the stem: dim accents, all of them
// flat on an upward face where the top-down maps can see them.
pelagia.edgeLights(root, light, {
  y: 1.8,
  spots: [
    [8, 21],
    [20, 19.5],
    [32, 18],
  ],
});
pelagia.navMarks(root, light, { marks: [['stem_light', -32, 4.4]], w: 1.2, d: 0.8 });

await exportGlb(root, 'sower-pelagia.glb');
