/**
 * The ruin dome shard — 40 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the largest thing standing
 * in the Coral Ruins.
 *
 * "Coral Ruins | env-ruin-dome-shard | 40 m | 20 m | ≤ 600 | none ... ruin
 * props carry the geometric patterns of art-direction.md's 'Environmental
 * Shapes' — right angles, terraces, a civilisation's worth of coral growth
 * over them" (docs/asset-prompts-3d.md, Block 4), under ENV STYLE:
 * "Natural or ruined form — stone, coral ... pressure-scarred and ancient;
 * nothing manufactured ... low-poly with crisp facets, at most two
 * materials", and no light of any kind. Two materials, 544 triangles,
 * 14.26 m tall by 40 by 28.9 across at its 40 m by intake's measure
 * (`sizeM`); 14.1 m tall by 39.6 across raw, which is the frame every
 * figure below is in, before the root's fit. The table's 20 m of height
 * is not in the file, which is a finding for the docs, not for a port.
 *
 * A port of the approved export
 * (docs/concept-art/models/env-ruin-dome-shard.glb as committed before
 * #869), part for part in its order, every number the export's own. The
 * whole file is a design drawn round a dome and then stretched 1.42 times
 * along X — the one factor under which every coral crust in it is an
 * icosahedron or an octahedron scaled and turned and nothing else, exact
 * to the float — so the design is written here un-stretched, x the file's
 * over 1.42 and y and z the file's, and the stretch goes on the root and
 * is baked into every buffer as the export baked it (seabed.mjs, "The
 * ruins"). What the file is made of:
 *
 * - `shell`, in `stone_dark` two-sided as the file flags it — not because
 *   a dome is seen from inside, since nothing inside a closed double-walled
 *   shell can be seen. The flag had a job: 64 of the file's 256 triangles
 *   were wound against their skins and `doubleSided` kept the crown closed
 *   at runtime, until #878 turned them round (`lattice` below); it stays as
 *   the file's own value, since dropping it is a material change and not a
 *   winding fix. The shell is not a shard of a dome but a whole one,
 *   double-walled, an outer skin and an inner one 0.9 of its radius, each
 *   an apex over four rings of sixteen meridians, stitched into 256
 *   triangles by one rule column by column (`lattice` below). The lattice
 *   is a formula the generator then pushed about — ten of the sixteen
 *   meridians hold their rings' heights to the float and six sag toward
 *   the crown, every vertex has its own bearing and radius, and the two
 *   apexes sit 0.47 m off the axis together — and kept no random for, so
 *   its 130 vertices are a table, ring by ring from the apex down, outer
 *   skin then inner, as the crags' drums are tables (kit.mjs `faceted`).
 * - Nine `rib_i_j` and six `band_i`, in `stone_dark`: three ribs down each
 *   of three meridians, a course of six bands round one latitude, boxes
 *   laid along the dome — every rib 1.667 by 1.079 in section and every
 *   band 1.47 by 0.88, in the un-stretched frame the table below is
 *   written in; in the file's frame the stretch makes a section depend on
 *   its bearing, ribs 0 and 1 1.91 wide and the three `rib_2_*` across it
 *   2.34. The generator laid them by a basis it built from the lattice
 *   and never orthogonalised, so each is a parallelepiped rigid to a part
 *   in ten thousand and no further: its centre and three edge vectors
 *   (seabed.mjs `skewed`), the file's own.
 * - Nine `coral_NN`, in `coral_stone`: four icosahedra and five octahedra
 *   squashed flat and turned, six round the foot at y = 3.2, three on the
 *   skin — a unit polyhedron with its size, tilt and place on the node.
 *
 * The root is the export's — `env_ruin_dome_shard`, an identity: the file
 * is centred on its plan box and grounded on y = 0 in the buffers, to the
 * bit, which the table carries — and, new in the port, held at 40 m by the
 * measure intake takes: the export measured 39.5714 across on X and baked
 * at ×1.011 with a rescale warning, so the root carries that one factor
 * and no lift (seabed.mjs `stand`, with no lift, since the file's root has
 * none). `diff.mjs env-ruin-dome-shard 400797b` — the pre-port binary —
 * divides it out and lists one thing else: `shell` with 64 of its 256
 * triangles in the opposite order, which is the #878 fix and nothing moved.
 */
import { THREE, add, faceted, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 40;
const DRAWN = 39.5714;
const STRETCH = 1.42;

const stone = seabed.ground.stoneDark({ twoSided: true });
const coral = seabed.ground.coralStoneRuin();

const shard = new THREE.Group();
shard.name = 'env_ruin_dome_shard';

// The two skins: apex, then four rings of sixteen, from the crown down.
// The un-pushed rings sit at y = 12.29733, 9.44401, 5.15255 and 0.04791
// outside and 11.02448, 8.45649, 4.59417 and 0 inside; the six pushed
// meridians are columns 2, 3, 7, 8, 11 and 14 of each ring.
const OUTER = [
  [-0.34077, 13.29696, 0.33003],
  // ring 1
  [4.80152, 12.29733, 0.39174],
  [4.42602, 12.29733, 2.25996],
  [2.92634, 12.48942, 3.62337],
  [1.46897, 12.38514, 4.9048],
  [-0.27905, 12.29733, 5.47231],
  [-2.34672, 12.29733, 5.06533],
  [-3.9626, 12.29733, 3.98095],
  [-4.49023, 12.54903, 1.99074],
  [-5.14785, 12.42759, 0.40695],
  [-5.08405, 12.29733, -1.65697],
  [-3.94797, 12.29733, -3.33536],
  [-2.21165, 12.44844, -4.0377],
  [-0.25849, 12.29733, -4.81197],
  [1.60822, 12.29733, -4.429],
  [3.20555, 12.36355, -3.16],
  [4.39453, 12.29733, -1.67593],
  // ring 2
  [9.19493, 9.44401, 0.44446],
  [8.49861, 9.44401, 3.90884],
  [5.80907, 10.16179, 6.52926],
  [3.03831, 9.77081, 8.87187],
  [-0.22633, 9.44401, 9.86572],
  [-4.06055, 9.44401, 9.11101],
  [-7.05698, 9.44401, 7.10018],
  [-8.18755, 10.38674, 3.47049],
  [-9.34609, 9.92957, 0.47412],
  [-9.13656, 9.44401, -3.3546],
  [-7.02984, 9.44401, -6.46694],
  [-3.85126, 10.00778, -7.86549],
  [-0.18819, 9.44401, -9.20513],
  [3.27338, 9.44401, -8.49497],
  [6.26963, 9.69026, -6.17544],
  [8.44022, 9.44401, -3.38975],
  // ring 3
  [12.19963, 5.15255, 0.48052],
  [11.28391, 5.15255, 5.03653],
  [7.96829, 6.58792, 8.70582],
  [4.15877, 5.80126, 11.70425],
  [-0.19027, 5.15255, 12.87042],
  [-5.23265, 5.15255, 11.87791],
  [-9.17326, 5.15255, 9.23346],
  [-11.02986, 7.04569, 4.60806],
  [-12.40376, 6.11931, 0.52305],
  [-11.90812, 5.15255, -4.51563],
  [-9.13757, 5.15255, -8.60867],
  [-5.05691, 6.27667, -10.68018],
  [-0.14011, 5.15255, -12.20966],
  [4.4122, 5.15255, -11.27572],
  [8.43479, 5.64061, -8.30624],
  [11.20711, 5.15255, -4.56186],
  // ring 4, the foot
  [13.37804, 0.04791, 0.49466],
  [12.37627, 0.04791, 5.47879],
  [9.14997, 2.18826, 9.89699],
  [4.68151, 1.00379, 13.02569],
  [-0.17613, 0.04791, 14.04883],
  [-5.69234, 0.04791, 12.96305],
  [-10.00324, 0.04791, 10.07011],
  [-12.70747, 2.88995, 5.27947],
  [-13.93358, 1.47939, 0.54753],
  [-12.9951, 0.04791, -4.97097],
  [-9.9642, 0.04791, -9.44863],
  [-5.67957, 1.71636, -12.13382],
  [-0.12126, 0.04791, -13.38801],
  [4.85883, 0.04791, -12.36631],
  [9.40662, 0.76529, -9.26264],
  [12.29226, 0.04791, -5.02155],
];
const INNER = [
  [-0.34077, 11.92414, 0.33003],
  // ring 1
  [4.28729, 11.02448, 0.38556],
  [3.94934, 11.02448, 2.06697],
  [2.59963, 11.19735, 3.29404],
  [1.288, 11.10351, 4.44733],
  [-0.28523, 11.02448, 4.95808],
  [-2.14613, 11.02448, 4.5918],
  [-3.60042, 11.02448, 3.61586],
  [-4.07528, 11.25101, 1.82467],
  [-4.66714, 11.14171, 0.39925],
  [-4.60972, 11.02448, -1.45827],
  [-3.58725, 11.02448, -2.96882],
  [-2.02456, 11.16048, -3.60093],
  [-0.26671, 11.02448, -4.29777],
  [1.41333, 11.02448, -3.9531],
  [2.85092, 11.08408, -2.811],
  [3.92101, 11.02448, -1.47533],
  // ring 2
  [8.24136, 8.45649, 0.43302],
  [7.61468, 8.45649, 3.55096],
  [5.19409, 9.10249, 5.90934],
  [2.7004, 8.75061, 8.01769],
  [-0.23777, 8.45649, 8.91215],
  [-3.68857, 8.45649, 8.23291],
  [-6.38536, 8.45649, 6.42317],
  [-7.40287, 9.30494, 3.15645],
  [-8.44556, 8.8935, 0.45971],
  [-8.25698, 8.45649, -2.98614],
  [-6.36093, 8.45649, -5.78724],
  [-3.50021, 8.96388, -7.04594],
  [-0.20345, 8.45649, -8.25162],
  [2.91196, 8.45649, -7.61247],
  [5.60859, 8.67812, -5.52489],
  [7.56212, 8.45649, -3.01778],
  // ring 3
  [10.94559, 4.59417, 0.46547],
  [10.12144, 4.59417, 4.56588],
  [7.13738, 5.886, 7.86824],
  [3.70881, 5.17801, 10.56683],
  [-0.20532, 4.59417, 11.61638],
  [-4.74346, 4.59417, 10.72312],
  [-8.29001, 4.59417, 8.34312],
  [-9.96095, 6.29801, 4.18025],
  [-11.19746, 5.46426, 0.50375],
  [-10.75138, 4.59417, -4.03106],
  [-8.25789, 4.59417, -7.7148],
  [-4.5853, 5.60589, -9.57916],
  [-0.16018, 4.59417, -10.95569],
  [3.9369, 4.59417, -10.11515],
  [7.55724, 5.03343, -7.44261],
  [10.05233, 4.59417, -4.07267],
  // ring 4, the foot, on the ground
  [12.00616, 0, 0.4782],
  [11.10456, 0, 4.96392],
  [8.20089, 1.92631, 8.94029],
  [4.17929, 0.86029, 11.75612],
  [-0.19259, 0, 12.67695],
  [-5.15718, 0, 11.69975],
  [-9.03699, 0, 9.0961],
  [-11.47079, 2.55783, 4.78453],
  [-12.5743, 1.28834, 0.52578],
  [-11.72966, 0, -4.44087],
  [-9.00186, 0, -8.47077],
  [-5.14569, 1.50161, -10.88743],
  [-0.14321, 0, -12.01621],
  [4.33887, 0, -11.09668],
  [8.43188, 0.64564, -8.30337],
  [11.02896, 0, -4.48639],
];

/**
 * The generator's stitch, meridian by meridian round the dome: for each
 * column, the outer apex triangle, the inner one, then band by band the
 * outer quad and the inner quad, then the quad across the foot between the
 * skins — sixteen triangles a column, 256 in the file's own order. The
 * outer quads are cut on seabed.mjs `column`'s diagonal and wound outward,
 * and the inner quads are the same two triangles wound the other way, so
 * the inner skin faces in — 192 triangles the file had the right way
 * round. The other 64 it wound against their skins: the outer crown fan
 * (16, facing down into the dome), the inner crown fan (16, facing up into
 * the wall) and the foot ring between the skins (32, facing up), which a
 * single-sided bake shows as a see-through ring round the crown. #878
 * turned each of the three groups round on its own corners — the outer fan
 * up, the inner fan down, the foot ring down — so the shell is a closed
 * solid wall, and `diff.mjs` reads the 64 as reversed at the same vertices.
 */
function lattice(outer, inner) {
  const N = 16;
  const O = 0;
  const I = outer.length;
  const o = (k, j) => 1 + k * N + (j % N);
  const i = (k, j) => I + 1 + k * N + (j % N);
  const tris = [];
  for (let j = 0; j < N; j++) {
    tris.push([O, o(0, j + 1), o(0, j)], [I, i(0, j), i(0, j + 1)]);
    for (let k = 0; k < 3; k++)
      tris.push(
        [o(k, j), o(k, j + 1), o(k + 1, j + 1)],
        [o(k, j), o(k + 1, j + 1), o(k + 1, j)],
        [i(k, j), i(k + 1, j), i(k + 1, j + 1)],
        [i(k, j), i(k + 1, j + 1), i(k, j + 1)]
      );
    tris.push([o(3, j), i(3, j + 1), i(3, j)], [o(3, j), o(3, j + 1), i(3, j + 1)]);
  }
  return faceted([...outer, ...inner], tris);
}
add(shard, 'shell', lattice(OUTER, INNER), stone);

// The ribs and bands: centre, then the edge vectors along the box's own x,
// y and z — its width across the meridian, its thickness off the skin and
// its length along the dome. Ribs 0 and 1 run down the +z face of the
// dome either side of x = 0, ribs 2 down its −z face; the bands sit round
// y = 11.19 at six of eight bearings.
const LAID = [
  [
    'rib_0_0',
    [4.11926, 12.58061, 3.29723],
    [0.92452, 0.00189, -1.387],
    [0.34311, 0.9964, 0.23],
    [3.89951, -1.94231, 2.59666],
  ],
  [
    'rib_0_1',
    [7.66862, 9.83815, 5.65859],
    [0.92538, 0.00102, -1.3863],
    [0.61462, 0.78543, 0.41063],
    [3.07224, -3.47573, 2.04862],
  ],
  [
    'rib_0_2',
    [10.17859, 5.76302, 7.32845],
    [0.92587, -0.00028, -1.38583],
    [0.80618, 0.47267, 0.53808],
    [1.84622, -4.55764, 1.23566],
  ],
  [
    'rib_1_0',
    [-4.71758, 12.62411, 3.22927],
    [0.92172, -0.00191, 1.38886],
    [-0.33674, 0.99976, 0.2248],
    [-3.74041, -1.81759, 2.47989],
  ],
  [
    'rib_1_1',
    [-8.1477, 10.07175, 5.5014],
    [0.92256, -0.0011, 1.38818],
    [-0.59915, 0.80338, 0.39862],
    [-3.00425, -3.2306, 1.99436],
  ],
  [
    'rib_1_2',
    [-10.6535, 6.27588, 7.16126],
    [0.92307, 0.00011, 1.38771],
    [-0.79045, 0.51201, 0.52534],
    [-1.91234, -4.26071, 1.27349],
  ],
  [
    'rib_2_0',
    [-1.43685, 12.44485, -5.23856],
    [-1.63563, 0.00034, 0.3217],
    [-0.08424, 0.98592, -0.42933],
    [-1.01671, -2.33682, -5.1668],
  ],
  [
    'rib_2_1',
    [-2.33988, 9.1006, -9.82633],
    [-1.63565, 0.00014, 0.32153],
    [-0.15333, 0.72868, -0.78037],
    [-0.75103, -4.24774, -3.81869],
  ],
  [
    'rib_2_2',
    [-2.90925, 4.16547, -12.71899],
    [-1.63564, -0.00014, 0.32147],
    [-0.1968, 0.34982, -1.00116],
    [-0.35985, -5.44969, -1.83326],
  ],
  [
    'band_0',
    [3.94391, 11.19384, 6.89705],
    [-0.66477, 0.82549, -1.01965],
    [0.27009, 0.73042, 0.41517],
    [5.15219, 0.003, -3.35668],
  ],
  [
    'band_1',
    [-1.95463, 11.19384, 8.00333],
    [0.25045, 0.82554, -1.1913],
    [-0.10172, 0.73041, 0.48477],
    [6.01838, -0.00105, 1.26453],
  ],
  [
    'band_2',
    [-6.90779, 11.19384, 4.6147],
    [1.0193, 0.82536, -0.66556],
    [-0.41409, 0.73044, 0.2716],
    [3.36539, -0.00545, 5.14703],
  ],
  [
    'band_3',
    [-8.01407, 11.19384, -1.28384],
    [1.1919, 0.82459, 0.2489],
    [-0.48471, 0.73058, -0.09917],
    [-1.24918, -0.0124, 6.02147],
  ],
  [
    'band_4',
    [-4.62544, 11.19384, -6.237],
    [0.66497, 0.82549, 1.01965],
    [-0.27009, 0.73042, -0.41517],
    [-5.15219, 0.003, 3.35754],
  ],
  [
    'band_5',
    [1.2731, 11.19384, -7.34328],
    [-0.25042, 0.82554, 1.1913],
    [0.10172, 0.73041, -0.48477],
    [-6.01838, -0.00105, -1.26441],
  ],
];
for (const [name, centre, ex, ey, ez] of LAID)
  add(shard, name, seabed.skewed(centre, ex, ey, ez), stone);

// The coral crusts: a unit polyhedron, its size, its place and its XYZ
// tilt on the node. Six at the foot on y = 3.22, one on a band, one on
// the crown by rib_0_0, one on the −z face by rib_2_1.
const CORAL = [
  [
    'coral_01',
    seabed.ico,
    [2.80447, 0.90606, 2.37301],
    [12.83293, 3.2196, 2.97784],
    [-1.05749, -0.32784, -1.60771],
  ],
  [
    'coral_02',
    seabed.octa,
    [2.47107, 0.95313, 1.76505],
    [2.23227, 3.61662, 13.40213],
    [-1.65915, -0.84139, -2.86063],
  ],
  [
    'coral_03',
    seabed.ico,
    [2.15728, 0.70602, 2.74563],
    [-9.80418, 3.2196, 9.86946],
    [2.20148, -0.73612, 1.16071],
  ],
  [
    'coral_04',
    seabed.octa,
    [2.23573, 1.11786, 2.23573],
    [-11.46836, 3.2196, -7.20216],
    [1.50165, -0.35795, 2.11944],
  ],
  [
    'coral_05',
    seabed.octa,
    [2.3534, 0.65895, 1.56893],
    [2.35972, 3.2196, -12.83297],
    [1.99912, -0.67154, -2.89125],
  ],
  [
    'coral_06',
    seabed.octa,
    [1.76505, 0.70602, 1.76505],
    [10.76151, 3.51769, -7.08828],
    [2.83623, -0.48762, -2.016],
  ],
  [
    'coral_07',
    seabed.octa,
    [1.78466, 0.65895, 1.5101],
    [-8.27547, 10.91147, 5.58604],
    [-2.81936, -0.17385, 2.5663],
  ],
  [
    'coral_08',
    seabed.ico,
    [1.52971, 0.45891, 1.65718],
    [4.67341, 13.09549, 3.66591],
    [-2.96623, 0.18239, -2.79004],
  ],
  [
    'coral_09',
    seabed.octa,
    [1.40223, 0.68837, 1.78466],
    [-2.71149, 7.84866, -11.71426],
    [2.21159, 0.23321, 2.97628],
  ],
];
for (const [name, shape, size, at, tilt] of CORAL) add(shard, name, shape(), coral, at, tilt, size);

// The stretch on the root, baked with each placement into its buffer. The
// export was then centred on its plan box and grounded, and the table
// carries both; a slip in it fails here rather than in the maps.
shard.scale.set(STRETCH, 1, 1);
seabed.bake(shard);
const bb = new THREE.Box3().setFromObject(shard);
if (Math.abs(bb.min.x + bb.max.x) > 1e-4 || Math.abs(bb.min.z + bb.max.z) > 1e-4 || bb.min.y !== 0)
  throw new Error(
    `env_ruin_dome_shard: not centred and grounded as the file is: ${JSON.stringify(bb)}`
  );

const { drawn, k } = seabed.stand(shard, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env_ruin_dome_shard: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(shard, 'env-ruin-dome-shard.glb');
