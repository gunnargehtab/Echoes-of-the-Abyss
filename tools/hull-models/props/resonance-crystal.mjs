/**
 * The resonance crystal — 12 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the lit prop of the Resonance
 * Field.
 *
 * "Resonance Field | env-resonance-crystal | 12 m | 18–30 m | ≤ 600 |
 * `crystal-seam` ... resonance props are faceted crystal and the toppled
 * remains of older instruments" (docs/asset-prompts-3d.md, Block 4), under
 * ENV STYLE: "Natural or ruined form — stone, coral, kelp, crystal ...
 * low-poly with crisp facets, at most two materials" — the one prop of the
 * fourteen whose light is `crystal-seam`, at 1.2 on its plates and nowhere
 * else. Two materials, 330 triangles, 27.27 m tall at its 12 m by intake's
 * measure (`sizeM.height`, the loose box, which the tilted shard frames'
 * boxes overhang; the vertices reach 27.07); 28.6 m raw, which is the
 * frame every figure below is in, before the root's fit.
 *
 * A port of the approved export
 * (docs/concept-art/models/env-resonance-crystal.glb as committed before
 * #869), part for part in its order, every number the export's own but one
 * seam's place on its shard (#890, below). What
 * the file is made of: a `base_mound` in `abyss_stone`, a nine-facet drum
 * 2.9 m high whose twenty corners the generator pushed one by one with the
 * seams held (seabed.mjs `drumOf`); four boulders on it, dodecahedra
 * pushed the same way (`dodecahedronOf`), their lowest corners on y = 0;
 * and five shards, each a frame at its own tilt on the root — three
 * standing, two broken. A standing shard is a six-facet tube from a radius
 * R at the foot to 0.92 R at its top, twelve corners pushed (`drumOf`,
 * open), under a `_tip`: a six-facet cone three built and the generator
 * left alone but for its point, moved (0.25 R, −0.15 R) off the axis —
 * exact to the float, so written as the formula (`tip` below). A broken
 * shard is a closed six-facet drum from R to 0.95 R with the break's six
 * corners and its centre each at their own height and everything else
 * three's own (`brokenShard`). The seams that light it are 0.05 m plates,
 * 1.84 R by 1.5 R, in `violet_seam` — plain boxes (seabed.mjs `block`)
 * tilted on their nodes by round XYZ triples — on the three shards that
 * carry one. 1.7, 1.25, 1, 1.35 and 0.8 are the five R.
 *
 * The shard frames' own tilts are round in no Euler order — a seeded
 * random, by the look of them — so each carries the XYZ triple parts.mjs
 * reads off the file's matrix, at its five decimals. The root is the
 * export's — `env_resonance_crystal`, identity, the mound's foot already on
 * y = 0 — and, new in the port, held at 12 m by the measure intake takes:
 * three's `Box3.setFromObject`, which unions each part's own box turned by
 * its node and so reaches 6.47 on +x where the farthest corner is 6.42.
 * The export measured 12.6845 on X that way and baked at ×0.946 with a
 * rescale warning, so the root carries that one factor and no lift
 * (seabed.mjs `stand`, with no lift, since the file's root has none).
 * `diff.mjs env-resonance-crystal a1c694f` — the pre-port binary, which is
 * also the default rev — divides it out and lists one part, the seam below.
 *
 * The light audit (#890, kit.mjs `lightAudit`). Block 4 licenses
 * `crystal-seam` on this prop and docs/style-neon-noir.md "World light" has
 * it as "a dull internal seam in the crystal props", so all four seams stay
 * lit and none is clad. The export's plate on shard 2 sat on the shard's
 * axis, and at R = 1.25 a 1.84 R by 1.5 R plate is all but inside a
 * six-facet body of that radius: the audit read 0.19 m² of it from above,
 * the corners that break the facets, where shard 1's and shard 4's larger
 * plates read 0.31 to 0.63. Its tilt already faced up — 0.81 of its normal
 * on world y — so the fix is a move and not a turn: `shard_2_seam_1` sits
 * 0.25 m along the shard's own x and 0.2 m along its z. That is the flank
 * of the shard that faces up: the shard leans to +x −z in the world, so
 * its −x +z flank is the upward one, which is (0.77, 0.64) in the shard's
 * own x and z. The plate surfaces there as a ledge a hand deep, the way the
 * other three seams do on theirs, and reads 0.50 m². Its tilt, height,
 * size and material are the export's, and the shard's extents are nowhere
 * near the root's, so `DRAWN` is unchanged.
 */
import { THREE, add, group, flatShaded, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 12;
const DRAWN = 12.6845;

const stone = seabed.ground.abyssStone();
const seam = seabed.ground.violetSeam();

const crystal = new THREE.Group();
crystal.name = 'env_resonance_crystal';

// The mound: nine facets, one height row, both caps. The crown ring, then
// the foot ring on y = 0, then the two centres — the crown's pushed off the
// axis like every other corner, the foot's where the generator set the
// drum down.
add(
  crystal,
  'base_mound',
  seabed.drumOf(
    [
      [
        [0.26171, 2.85987, 3.05511],
        [2.03803, 2.03379, 2.98888],
        [3.22192, 2.55489, 0.70511],
        [2.68144, 2.24884, -2.10365],
        [1.47488, 2.81915, -3.82488],
        [-1.32154, 2.91794, -3.55538],
        [-3.56893, 2.14514, -1.83077],
        [-3.65225, 2.48209, 0.8396],
        [-2.40702, 2.23887, 2.30701],
      ],
      [
        [0.19333, 0, 5.74474],
        [3.45869, 0, 4.16574],
        [6.41991, 0, 1.23411],
        [4.74164, 0, -3.32582],
        [2.49961, 0, -5.12737],
        [-2.32787, 0, -6.11106],
        [-5.33231, 0, -3.20509],
        [-6.21373, 0, 1.49932],
        [-3.71785, 0, 4.33155],
      ],
    ],
    [
      [0.1842, 2.00678, -0.12515],
      [-0.55, 0, -0.55],
    ]
  ),
  stone
);

// Four boulders, each twenty corners in the order three's dodecahedron
// first reaches them, sitting where the generator left them.
const BOULDERS = [
  [
    [5.02932, 0.29547, 4.36951],
    [4.92161, 1.36745, 3.14847],
    [3.94414, 0.9272, 4.62694],
    [3.88389, 2.61799, 3.25323],
    [2.72635, 1.82159, 3.71723],
    [5.78353, 1.13774, 1.78611],
    [4.6485, 1.31012, 0.8526],
    [4.13672, 2.54927, 1.99851],
    [3.85586, 0.2728, 0.57306],
    [2.77068, 0.90453, 0.83049],
    [2.91806, 2.11344, 1.6709],
    [2.87839, 0, 2.05153],
    [2.01647, 0.06226, 3.41389],
    [1.94914, 1.19995, 2.82731],
    [3.91611, 0, 1.94677],
    [3.66328, 0, 3.20149],
    [3.1515, 0, 4.3474],
    [4.88194, 0, 3.5291],
    [5.07365, 0, 1.48277],
    [5.85086, 0.00005, 2.37269],
  ],
  [
    [-3.71754, 1.69633, -0.76374],
    [-4.22128, 0.97173, 0.22164],
    [-2.98708, 1.5761, -1.12948],
    [-3.55082, 0, -0.23677],
    [-2.58964, 0.05542, -0.47803],
    [-5.22831, 0.64101, -0.56975],
    [-5.51631, 0, -0.58899],
    [-3.88067, 0, -0.51161],
    [-5.21292, 0, -1.67052],
    [-4.48246, 0, -2.03626],
    [-3.86607, 0, -1.53734],
    [-3.97872, 0.02827, -3.02164],
    [-2.97169, 0.35899, -2.23025],
    [-2.66479, 0, -1.61784],
    [-4.64918, 1.07236, -2.56323],
    [-4.31933, 1.77766, -2.28839],
    [-2.68369, 1.31559, -2.21101],
    [-4.33393, 2.30424, -1.26266],
    [-5.61035, 0.94458, -2.32197],
    [-5.53521, 1.10205, -1.18216],
  ],
  [
    [-2.8801, 0.26447, 3.8211],
    [-2.6269, 0, 4.24414],
    [-2.85874, 0.65599, 4.67793],
    [-2.18076, 0, 5.16426],
    [-2.34854, 0.26906, 5.29189],
    [-1.69286, 0, 3.69861],
    [-1.18487, 0, 4.08004],
    [-1.35579, 0, 4.94061],
    [-0.34126, 0.14401, 3.72207],
    [-0.3199, 0.53553, 4.5789],
    [-0.63551, 0.41074, 5.11615],
    [-0.5731, 1.50755, 4.15586],
    [-1.50714, 1.6412, 4.70139],
    [-1.22449, 1.02815, 5.35879],
    [-1.01924, 1.13042, 3.23574],
    [-1.84421, 1.52705, 3.45939],
    [-2.01513, 1.65816, 4.31996],
    [-2.56449, 0.38926, 3.28385],
    [-0.85146, 0.53094, 3.1081],
    [-1.97551, 0, 3.04121],
  ],
  [
    [3.42635, 0.61682, -3.47405],
    [2.88259, 1.31778, -3.55165],
    [3.20219, 0.10501, -2.84322],
    [2.19943, 1.37165, -2.98293],
    [2.37877, 0.54562, -2.60995],
    [2.76553, 1.65763, -4.36641],
    [1.874, 1.8468, -4.21479],
    [1.53168, 1.76037, -3.31929],
    [1.19781, 0.89499, -5.15678],
    [0.97365, 0.38318, -4.52595],
    [0.85303, 0.45506, -3.61278],
    [1.51741, 0, -4.44835],
    [1.63447, 0, -3.63359],
    [1.18519, 0, -3.04838],
    [2.20057, 0, -5.01707],
    [2.86832, 0, -4.68071],
    [2.526, 0, -3.78521],
    [3.54697, 0.54494, -4.38722],
    [2.02123, 0.45438, -5.39005],
    [3.21481, 1.25042, -4.95162],
  ],
];
BOULDERS.forEach((corners, i) =>
  add(crystal, `boulder_${i + 1}`, seabed.dodecahedronOf(corners), stone)
);

/**
 * A standing shard's point: three's six-facet cone, open at its base, from
 * 0.92 R at `H` to a point `h` higher that the generator moved off the axis
 * to (0.25 R, −0.15 R) — every corner the file's to the float.
 */
function tip(R, H, h) {
  const geo = new THREE.CylinderGeometry(0, 0.92 * R, h, 6, 1, true);
  geo.translate(0, H + h / 2, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++)
    if (pos.getY(i) > H + h / 2) pos.setXYZ(i, 0.25 * R, H + h, -0.15 * R);
  return flatShaded(geo);
}

/**
 * A broken shard: three's closed six-facet drum from R at the foot to
 * 0.95 R at the break, `H` tall, with the break's six corners and its
 * centre written to their own heights — the only corners the generator
 * touched; the foot ring, the break's plan and every seam copy are three's
 * to the float. Shard 5's foot sits 2.4e-8 above zero in the file, which is
 * float32(1.9) + 1.9 and how its 3.8 was read; shard 4's sits on zero,
 * which any H with an exact half does.
 */
function brokenShard(R, H, breakYs, crownY) {
  const geo = new THREE.CylinderGeometry(0.95 * R, R, H, 6, 1);
  geo.translate(0, H / 2, 0);
  const pos = geo.attributes.position;
  // three's layout: torso rows break (0–6) and foot (7–13), then the
  // break cap's six centres (14–19) and its ring (20–26), then the foot's.
  for (let i = 0; i < 7; i++) pos.setY(i, breakYs[i % 6]);
  for (let i = 14; i < 20; i++) pos.setY(i, crownY);
  for (let i = 20; i < 27; i++) pos.setY(i, breakYs[(i - 20) % 6]);
  return flatShaded(geo);
}

/** A seam plate, 0.05 m thick, on a shard of radius R. */
const plate = (R) => seabed.block(1.84 * R, 0.05, 1.5 * R);

// Shard 1: R = 1.7, the tallest, 23 m to its tip's base and 27.5 to its
// point, two seams. Its body's crown ring first, then its foot ring.
const shard1 = group(crystal, 'shard_1', {
  at: [0.6, 1.4, -0.6],
  rot: [-3.09206, 0.61337, -3.01831],
});
add(
  shard1,
  'shard_1_body',
  seabed.drumOf([
    [
      [0.0224, 23.07449, 1.65558],
      [1.30573, 23.09613, 0.72234],
      [1.38062, 22.92432, -0.68022],
      [-0.02646, 22.92698, -1.60817],
      [-1.36833, 23.07643, -0.71342],
      [-1.37875, 23.09403, 0.84215],
    ],
    [
      [-0.00367, 0, 1.63892],
      [1.49165, 0, 0.81507],
      [1.44934, 0, -0.93653],
      [0.00367, 0, -1.63892],
      [-1.49165, 0, -0.81507],
      [-1.44934, 0, 0.93653],
    ],
  ]),
  stone
);
add(shard1, 'shard_1_tip', tip(1.7, 23, 4.5), stone);
add(shard1, 'shard_1_seam_1', plate(1.7), seam, [0, 6.5, 0], [0.36, 0.4, 0.25]);
add(shard1, 'shard_1_seam_2', plate(1.7), seam, [0, 13, 0], [-0.48, 0.8, 0.25]);

// Shard 2: R = 1.25, 14.5 m to the tip's base, one seam — off the axis
// toward the flank that faces up (#890, the header's last paragraph).
const shard2 = group(crystal, 'shard_2', {
  at: [-2.4, 1.5, 1],
  rot: [-0.93563, -1.32146, -0.67662],
});
add(
  shard2,
  'shard_2_body',
  seabed.drumOf([
    [
      [-0.03483, 14.52302, 1.18586],
      [0.94859, 14.56185, 0.64088],
      [1.03607, 14.45132, -0.54333],
      [-0.00794, 14.5387, -1.15517],
      [-0.94156, 14.55313, -0.59703],
      [-0.9426, 14.49569, 0.62067],
    ],
    [
      [0.00121, 0, 1.22457],
      [1.12609, 0, 0.55585],
      [1.0121, 0, -0.65363],
      [-0.00121, 0, -1.22457],
      [-1.10151, 0, -0.61902],
      [-1.02825, 0, 0.68133],
    ],
  ]),
  stone
);
add(shard2, 'shard_2_tip', tip(1.25, 14.5, 3.2), stone);
add(shard2, 'shard_2_seam_1', plate(1.25), seam, [0.25, 7.5, 0.2], [0.54, 0.4, 0.25]);

// Shard 3: R = 1, 10 m to the tip's base, unlit.
const shard3 = group(crystal, 'shard_3', {
  at: [2.4, 1.3, 1.6],
  rot: [-0.04199, 0.42721, 0.46969],
});
add(
  shard3,
  'shard_3_body',
  seabed.drumOf([
    [
      [0.0557, 10.05877, 0.89815],
      [0.79872, 10.02606, 0.48541],
      [0.83567, 9.99236, -0.40249],
      [-0.04728, 9.97531, -0.9691],
      [-0.78755, 9.95252, -0.42682],
      [-0.75159, 10.0261, 0.41039],
    ],
    [
      [-0.0381, 0, 1.03125],
      [0.91499, 0, 0.55021],
      [0.87473, 0, -0.44848],
      [0.0381, 0, -1.03125],
      [-0.91499, 0, -0.55021],
      [-0.87473, 0, 0.44848],
    ],
  ]),
  stone
);
add(shard3, 'shard_3_tip', tip(1, 10, 2.4), stone);

// Shard 4: R = 1.35, broken 6 m up, one seam. Its break ring runs
// 5.66–6.84 m, so H is not a number read off the file: 6 is one of the
// several values with an exact half that put the foot on zero, as
// `brokenShard` says, and any of them gives the same bytes.
const shard4 = group(crystal, 'shard_4', {
  at: [-1.8, 1.4, -2.9],
  rot: [-0.16003, -0.11405, 0.33264],
});
add(
  shard4,
  'shard_4_broken',
  brokenShard(1.35, 6, [5.95889, 6.84065, 6.29187, 5.66049, 6.36849, 5.8041], 6.75351),
  stone
);
add(shard4, 'shard_4_seam_1', plate(1.35), seam, [0, 4.5, 0], [-0.3, 0.4, 0.25]);

// Shard 5: R = 0.8, broken 3.8 m up, unlit, leaning hardest.
const shard5 = group(crystal, 'shard_5', {
  at: [3.3, 1.1, -1.9],
  rot: [-2.53069, -0.12283, -2.43602],
});
add(
  shard5,
  'shard_5_broken',
  brokenShard(0.8, 3.8, [3.96113, 3.38025, 3.55685, 3.84807, 3.84418, 3.64803], 3.5949),
  stone
);

const { drawn, k } = seabed.stand(crystal, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env_resonance_crystal: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(crystal, 'env-resonance-crystal.glb');
