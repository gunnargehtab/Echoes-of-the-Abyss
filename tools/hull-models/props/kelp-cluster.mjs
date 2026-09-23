/**
 * The kelp cluster — 18 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the forty-metre columns of
 * the Kelp Forest and the one prop that moves: `swayM` 4 at the tip.
 *
 * "Kelp Forest | env-kelp-cluster | 18 m | 60–80 m | ≤ 400 |
 * flora-biolight, tip points ... kelp props are the forty-metre columns of
 * world-map.md's terraces" (docs/asset-prompts-3d.md, Block 4), under ENV
 * STYLE: "Natural or ruined form — stone, coral, kelp ... nothing
 * manufactured ... low-poly with crisp facets, at most two materials", the
 * one licensed light being `flora-biolight` at the tips. Two materials, 388
 * triangles, 64.5 m tall at its 18 m (intake's `sizeM.height`, and what the
 * runtime draws since #876); 78 m raw, which is the frame every figure
 * below is in, before the root's fit.
 *
 * A port of the approved export (docs/concept-art/models/env-kelp-cluster.glb
 * as committed before #869), part for part in its order, every number the
 * export's own but the tips' size (#890, below). What the file is made of,
 * in `kelp` (two-sided, as the file
 * flags it — a frond is seen from both faces): two holdfasts, icosahedra
 * under scale triples (seabed.mjs `ico`), 4.86 by 2.232 by 3.96 and 2.64 by
 * 1.21 by 2.2, each yawed on its node and sitting with its lowest vertex on
 * y = 0 — the file's 1.89865 and 1.02929 are 0.85065 (a unit icosahedron's
 * reach) times 2.232 and 1.21, derived below rather than typed; six stipes,
 * each a column of six five-cornered rings from the ground to 78, 70, 63,
 * 57, 50 and 42 m, leaning to +x as they climb, every corner pushed by the
 * generator's own hand (the rings' heights wander a tenth of a metre) and
 * stitched ring to ring by the trench spire's band rule (seabed.mjs
 * `column`) with no cap at either end — so a table under kit.mjs
 * `faceted`; and twelve blades, each five points cut as a quad fanned from
 * its first corner and a tip triangle off the quad's far edge, a leaf 2 to
 * 10 m long standing off a stipe. Then in `biolight`, three tips: three's
 * tetrahedron (`tetra`, at `TIP`), one at the head of each of the three
 * tallest stipes, at 78, 70 and 63 m on the stipe's own axis — the axis the
 * generator bent the stipe along and jittered the rings about, so the tip
 * sits a few centimetres off the ring's centroid and its position is the
 * file's own number.
 *
 * The light audit (#890, kit.mjs `lightAudit`). Block 4 licenses
 * `flora-biolight` at the "tip points" and docs/style-neon-noir.md "World
 * light" has them as "dim tips on kelp stalks — points and short lines", so
 * all three tips stay lit and there is no lamp to clad (#890, review
 * rulings, ruling 1). The export's tips were tetrahedra at 0.42, and at
 * that size a tip is a sub-cell dot. Three's tetrahedron stands on a
 * square plan of side 1.155 r — 0.485 m raw at 0.42, 0.40 m in the file —
 * so 0.235 m² raw and 0.16 m² as the audit measures it, after the root's
 * ×0.823; its four-cells-a-metre raster read the three at 0.13, 0.25 and
 * 0.06 m², biolight_2 clearing the 0.25 m² floor by where the grid fell on
 * it, not by its size. `TIP` is 0.6, the smallest radius that clears the
 * floor with a margin on every tip: 0.48 m² raw and 0.325 m² measured, a
 * third over the floor, on a plan square of 0.693 m raw (0.57 m in the
 * file). On this file's grid they read 0.38, 0.25 and 0.56 m², biolight_2
 * at the floor exactly — two cells a side — and passing. That reading is
 * the grid's as much as the tip's: a 0.57 m square holds two cells a side
 * wherever it falls, but a stipe's open head rises above its tip's low
 * corners and can take a corner cell, so a model change that moved the
 * grid — anything that moves the plan's extents — could read a tip under
 * the floor (the review's sweep of 256 alignments found 2, 2 and 1 that
 * read 0.19 m²), and the export's audit would then say so. (Three cells a
 * side, a square over 0.75 m in the file, is a radius of 0.79 — the knob
 * 0.8 was, which the review sent back.) All three grow together
 * because they are one fixture at one size, as the generator made them; a
 * set at two sizes would be a shape decision nothing in the row licenses.
 * A tip at 0.6 is 0.98 m on an edge raw, 0.81 m in the file, on a stipe
 * head 0.4 to 0.5 m across raw (ring 5's span) and 64 m up — a point
 * still, at the row's "tip points" and nowhere near a canopy. Nothing else
 * moved: the tips sit inside the plan the stipes and blades draw, so
 * `DRAWN` and the root's factor are the export's, and the height at 18 m
 * is 64.5 m, the export's to the tenth.
 *
 * `biolight` is `flora-biolight` #2E8C74 at `KHR_materials_emissive_strength`
 * 0.55 over a #0B1D19 base at roughness 1 (seabed.mjs `ground.biolight`),
 * the file's values to the digit.
 *
 * The sway (`environmentModels.ts`) is a vertex weight computed at load from
 * each vertex's height over the prop's, after the runtime has scaled the
 * whole file to its footprint and set its base at y = 0 — so a uniform root
 * factor moves no weight, and a port that keeps the geometry keeps the sway.
 *
 * The root is the export's — `env_kelp_cluster`, at the origin and *not*
 * grounded: stipe_1's foot ring dips to y = −0.09462 and the file leaves it
 * there — and, new in the port, held at 18 m by the measure intake takes:
 * three's loose `Box3.setFromObject`, which took the export at 21.8766
 * across and baked it at ×0.823 with a rescale warning, so the root carries
 * that one factor and nothing else (seabed.mjs `stand`, with no lift, since
 * the file's root has none). `diff.mjs env-kelp-cluster 1856135` — the
 * pre-port binary, which is also the default rev — divides the factor out
 * and lists the three tips, grown as above, and nothing else.
 */
import { THREE, add, faceted, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 18;
const DRAWN = 21.8766;
// A tip's tetrahedron, at the radius three takes: 0.42 in the export, 0.6
// since #890 so that each shows over the audit's 0.25 m² from above.
const TIP = 0.6;

const kelp = seabed.ground.kelp();
const biolight = seabed.ground.biolight();

const cluster = new THREE.Group();
cluster.name = 'env_kelp_cluster';

// The holdfasts, each sat on the ground at its own half-height.
const holdfast = (name, s, x, z, yaw) => {
  const geo = seabed.ico(s);
  geo.computeBoundingBox();
  add(cluster, name, geo, kelp, [x, -geo.boundingBox.min.y, z], [0, yaw, 0]);
};
holdfast('holdfast_main', [4.86, 2.232, 3.96], 0.3, 0.2, 0.4);
holdfast('holdfast_lobe', [2.64, 1.21, 2.2], -3.4, 2.1, 1.7);

// A stipe's stitch: the spire's band rule, ring to ring, with the foot cap
// `column` adds (n − 2 triangles of `fan`) taken off — a stipe is open at
// both ends. Rings are five corners each, six rings, foot first.
const RING = 5;
const RINGS = 6;
const stipeCut = () => {
  const rings = Array.from({ length: RINGS }, (_, b) =>
    Array.from({ length: RING }, (_, i) => b * RING + i)
  );
  return seabed.column(rings).slice(RING - 2);
};
const STIPE_CUT = stipeCut();

// Six stipes, in ring order from the foot; the tallest first.
const STIPES = [
  [
    // ring 0
    [0.59901, -0.01209, -0.76994],
    [-0.82221, 0.11173, -0.0635],
    [-0.08461, 0.06596, 1.3465],
    [1.47976, -0.05947, 1.61346],
    [1.70871, -0.09462, 0.03847],
    // ring 1
    [1.55769, 15.8342, -0.90238],
    [0.39398, 15.94406, 0.1018],
    [1.42088, 15.85633, 1.24742],
    [2.95046, 15.71734, 1.12207],
    [2.79009, 15.7249, -0.41054],
    // ring 2
    [3.21077, 31.65438, -0.59536],
    [2.4186, 31.73603, 0.54165],
    [3.56055, 31.56051, 1.31116],
    [4.86219, 31.39236, 0.85899],
    [4.38875, 31.48871, -0.44238],
    // ring 3
    [5.42128, 47.37338, 0.91785],
    [5.00659, 47.29966, 1.97015],
    [6.05663, 47.08897, 2.3413],
    [7.00391, 47.02376, 1.72232],
    [6.38412, 47.24038, 0.79838],
    // ring 4
    [8.20902, 62.81807, 3.46661],
    [8.10778, 62.71992, 4.23057],
    [8.86497, 62.5574, 4.29199],
    [9.39069, 62.53994, 3.7203],
    [8.82747, 62.73131, 3.22063],
    // ring 5
    [11.72483, 78.05643, 6.18689],
    [11.76087, 77.99918, 6.498],
    [12.06969, 77.94318, 6.44448],
    [12.22258, 77.9558, 6.1655],
    [11.94741, 78.03551, 6.0266],
  ],
  [
    // ring 0
    [-1.60043, -0.00573, -2.29198],
    [-2.92788, 0.09791, -1.63262],
    [-2.23969, 0.05293, -0.31657],
    [-0.77898, -0.05597, -0.06739],
    [-0.56452, -0.07992, -1.53744],
    // ring 1
    [-0.8289, 14.18649, -2.37784],
    [-1.91675, 14.26821, -1.44056],
    [-0.95855, 14.18256, -0.37139],
    [0.47028, 14.06718, -0.48848],
    [0.3218, 14.08957, -1.91888],
    // ring 2
    [0.37762, 28.3819, -1.53005],
    [-0.36858, 28.38551, -0.47089],
    [0.6973, 28.20992, 0.24444],
    [1.91764, 28.10381, -0.17764],
    [1.47973, 28.2461, -1.38868],
    // ring 3
    [2.08906, 42.42153, 0.21356],
    [1.70438, 42.33936, 1.1956],
    [2.68766, 42.15442, 1.53926],
    [3.57181, 42.11106, 0.96001],
    [2.98929, 42.31147, 0.09999],
    // ring 4
    [4.52213, 56.28661, 2.0777],
    [4.44116, 56.25305, 2.79746],
    [5.14788, 56.10083, 2.85318],
    [5.62781, 56.03802, 2.31331],
    [5.09417, 56.18295, 1.84431],
    // ring 5
    [7.88954, 70.04865, 3.06215],
    [7.92936, 70.02202, 3.35542],
    [8.21584, 69.96197, 3.3042],
    [8.3526, 69.94784, 3.04076],
    [8.09358, 70.01289, 2.91046],
  ],
  [
    // ring 0
    [2.40162, 0.02555, -2.81368],
    [1.16674, 0.08832, -2.20159],
    [1.80387, 0.01703, -0.97992],
    [3.16091, -0.07483, -0.74861],
    [3.36294, -0.0531, -2.11324],
    // ring 1
    [2.93112, 12.79171, -2.48005],
    [1.91869, 12.83233, -1.61002],
    [2.80761, 12.73615, -0.61794],
    [4.13571, 12.64728, -0.72685],
    [3.99988, 12.7025, -2.05431],
    // ring 2
    [3.8565, 25.54117, -1.41176],
    [3.16325, 25.52549, -0.42863],
    [4.15432, 25.36403, 0.23402],
    [5.28855, 25.28156, -0.15855],
    [4.88104, 25.42358, -1.28157],
    // ring 3
    [5.42967, 38.16363, -0.29916],
    [5.08462, 38.16769, 0.62056],
    [5.99964, 38.00866, 0.94058],
    [6.81213, 37.91192, 0.39701],
    [6.26244, 38.04033, -0.40693],
    // ring 4
    [7.83914, 50.6907, 0.21761],
    [7.77458, 50.72276, 0.88702],
    [8.42943, 50.57615, 0.94173],
    [8.8658, 50.46445, 0.44132],
    [8.36518, 50.56617, 0.00275],
    // ring 5
    [11.07417, 63.0422, -0.13493],
    [11.11541, 63.04276, 0.13791],
    [11.37973, 62.97841, 0.09172],
    [11.50233, 62.94013, -0.15251],
    [11.2607, 62.99273, -0.27493],
  ],
  [
    // ring 0
    [-3.001, -0.01286, 0.66409],
    [-4.13826, 0.083, 1.22921],
    [-3.54772, 0.05287, 2.35717],
    [-2.29573, -0.04111, 2.57073],
    [-2.11277, -0.07268, 1.31079],
    // ring 1
    [-2.36304, 11.54726, 0.50638],
    [-3.29469, 11.62751, 1.30973],
    [-2.47284, 11.56134, 2.22622],
    [-1.24843, 11.45858, 2.12593],
    [-1.37661, 11.46583, 0.89984],
    // ring 2
    [-1.33564, 23.11433, 0.9918],
    [-1.97347, 23.13892, 1.90056],
    [-1.05944, 22.99629, 2.51496],
    [-0.01459, 22.89287, 2.15319],
    [-0.39133, 22.99571, 1.11358],
    // ring 3
    [0.05633, 34.57052, 2.39404],
    [-0.27579, 34.48826, 3.23377],
    [0.56675, 34.32973, 3.5291],
    [1.32634, 34.30196, 3.03465],
    [0.82866, 34.48071, 2.29805],
    // ring 4
    [1.94077, 45.84609, 4.22618],
    [1.86618, 45.79046, 4.84067],
    [2.47316, 45.66589, 4.88871],
    [2.88937, 45.63691, 4.42808],
    [2.43402, 45.77207, 4.02729],
    // ring 5
    [4.51215, 57.04185, 5.61949],
    [4.54408, 57.00778, 5.86988],
    [4.79079, 56.96189, 5.82627],
    [4.91045, 56.96203, 5.60141],
    [4.68877, 57.0198, 5.49007],
  ],
  [
    // ring 0
    [1.40076, 0.01158, 1.74208],
    [0.35636, 0.07271, 2.26011],
    [0.89614, 0.02347, 3.29407],
    [2.04441, -0.05411, 3.48984],
    [2.21451, -0.04956, 2.33489],
    // ring 1
    [1.83221, 10.14354, 1.87638],
    [0.97593, 10.1848, 2.61267],
    [1.72846, 10.10994, 3.4524],
    [2.85214, 10.03311, 3.36032],
    [2.73666, 10.07041, 2.23679],
    // ring 2
    [2.53331, 20.27187, 2.74356],
    [1.94568, 20.24801, 3.57447],
    [2.78421, 20.11056, 4.13506],
    [3.74473, 20.04872, 3.80359],
    [3.40058, 20.17579, 2.85401],
    // ring 3
    [3.68389, 30.28538, 3.86567],
    [3.38788, 30.25673, 4.64185],
    [4.16248, 30.12288, 4.91199],
    [4.8534, 30.06697, 4.45329],
    [4.39037, 30.1939, 3.77477],
    // ring 4
    [5.47852, 40.22021, 4.58173],
    [5.42298, 40.23865, 5.14841],
    [5.97801, 40.11846, 5.19364],
    [6.34853, 40.03313, 4.76938],
    [5.92469, 40.12113, 4.39901],
    // ring 5
    [7.98776, 50.03515, 4.41152],
    [8.02251, 50.0332, 4.64239],
    [8.24659, 49.98086, 4.60283],
    [8.35068, 49.95163, 4.39589],
    [8.14596, 49.99583, 4.29269],
  ],
  [
    // ring 0
    [-4.19815, 0.03134, 2.22063],
    [-5.14866, 0.06858, 2.69123],
    [-4.65917, 0.00172, 3.63052],
    [-3.61516, -0.06722, 3.80836],
    [-3.4589, -0.03412, 2.75916],
    // ring 1
    [-3.90973, 8.54604, 2.59215],
    [-4.68903, 8.56739, 3.26121],
    [-4.00549, 8.48698, 4.02391],
    [-2.98361, 8.42272, 3.94004],
    [-3.0876, 8.4763, 2.91939],
    // ring 2
    [-3.31252, 17.04745, 3.32899],
    [-3.8447, 17.04364, 4.0861],
    [-3.08191, 16.92209, 4.59582],
    [-2.21004, 16.85366, 4.29316],
    [-2.52451, 16.95587, 3.42881],
    // ring 3
    [-2.20376, 25.46112, 3.85896],
    [-2.46386, 25.50092, 4.56731],
    [-1.75984, 25.38083, 4.81415],
    [-1.139, 25.27857, 4.39572],
    [-1.56509, 25.35393, 3.77625],
    // ring 4
    [-0.49337, 33.8129, 3.88937],
    [-0.54134, 33.85076, 4.40366],
    [-0.03827, 33.73562, 4.44715],
    [0.29567, 33.6378, 4.06355],
    [-0.08987, 33.71024, 3.72542],
    // ring 5
    [1.73228, 42.03225, 3.50066],
    [1.76449, 42.03714, 3.7104],
    [1.96744, 41.98566, 3.67553],
    [2.06113, 41.9515, 3.48816],
    [1.87528, 41.99096, 3.39352],
  ],
];
STIPES.forEach((rings, i) => add(cluster, `stipe_${i + 1}`, faceted(rings, STIPE_CUT), kelp));

// A blade's five points: the two corners at its root on the stipe first
// and last of the quad, its two wide corners between, then the tip.
const BLADE_CUT = [
  [0, 1, 2],
  [0, 2, 3],
  [1, 4, 2],
];
const BLADES = [
  [
    [3.51834, 33.15155, 0.21411],
    [1.58072, 34.65, 0.58863],
    [2.10597, 34.5078, 2.72027],
    [3.62338, 33.12311, 0.64044],
    [0.84404, 36.02047, 2.70218],
  ],
  [
    [7.12608, 51.81916, 2.24967],
    [12.50976, 52.98193, 2.40471],
    [11.5929, 53.44741, 0.23614],
    [6.94271, 51.91225, 1.81596],
    [16.33142, 54.56363, 0.91958],
  ],
  [
    [9.82849, 68.84835, 5.13095],
    [11.16945, 70.35162, 9.00427],
    [13.10751, 69.98805, 8.67],
    [10.2161, 68.77564, 5.06409],
    [14.13568, 71.52768, 11.88694],
  ],
  [
    [1.46011, 35.29462, -0.43784],
    [0.34916, 36.65805, -2.16552],
    [-0.62391, 36.58912, -0.19362],
    [1.2655, 35.28083, -0.04346],
    [-0.96498, 37.95945, -1.78659],
  ],
  [
    [5.11932, 56.18877, 2.7471],
    [9.07281, 57.50814, 5.906],
    [10.36911, 57.36916, 4.0112],
    [5.37858, 56.16097, 2.36814],
    [13.57397, 58.70243, 6.9361],
  ],
  [
    [4.4803, 24.13849, -0.97491],
    [7.78509, 25.25788, -2.75612],
    [6.01732, 25.51377, -3.65586],
    [4.12674, 24.18967, -1.15486],
    [9.20405, 26.60756, -4.76781],
  ],
  [
    [7.11225, 46.8975, 0.74979],
    [6.56588, 48.24356, 3.59604],
    [8.53407, 47.85003, 4.4968],
    [7.50589, 46.81879, 0.92994],
    [8.08219, 49.23544, 6.61647],
  ],
  [
    [0.0068, 31.60129, 2.08359],
    [-0.24312, 32.71431, 0.02998],
    [-1.61862, 32.70089, 1.48181],
    [-0.2683, 31.5986, 2.37396],
    [-1.25914, 33.81525, -0.26993],
  ],
  [
    [3.03712, 49.14715, 5.23659],
    [5.21138, 50.34325, 8.37125],
    [6.79879, 50.1169, 7.35199],
    [3.3546, 49.10188, 5.03274],
    [8.49014, 51.33564, 10.08369],
  ],
  [
    [4.48808, 30.15839, 4.26582],
    [8.38139, 31.11953, 3.79195],
    [7.32116, 31.40981, 2.24222],
    [4.27603, 30.21645, 3.95588],
    [10.82529, 32.34192, 2.26211],
  ],
  [
    [6.58053, 45.09314, 4.67944],
    [5.37218, 46.17526, 5.53773],
    [6.29649, 46.01706, 7.07416],
    [6.76539, 45.0615, 4.98673],
    [5.46701, 47.115, 7.49528],
  ],
  [
    [-1.40296, 29.58043, 4.03327],
    [-2.6138, 30.54225, 3.40119],
    [-2.71882, 30.59757, 5.19727],
    [-1.42397, 29.59149, 4.39248],
    [-3.37009, 31.55386, 4.41769],
  ],
];
BLADES.forEach((pts, i) => add(cluster, `blade_${i + 1}`, faceted(pts, BLADE_CUT), kelp));

// The three lit tips, at the heads of the three tallest stipes.
const TIPS = [
  [11.94058, 78, 6.25778],
  [8.09186, 70, 3.12847],
  [11.26238, 63, -0.07226],
];
TIPS.forEach((at, i) => add(cluster, `biolight_${i + 1}`, seabed.tetra(TIP), biolight, at));

// Held at 18 m by intake's measure; the root is otherwise the file's identity.
const { drawn, k } = seabed.stand(cluster, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env_kelp_cluster: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(cluster, 'env-kelp-cluster.glb');
