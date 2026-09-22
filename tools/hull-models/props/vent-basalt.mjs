/**
 * The vent basalt — 15 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the low prop of the Thermal
 * Veins floor.
 *
 * "Thermal Veins | env-vent-basalt | 15 m | 8 m | ≤ 400 | none ... vent
 * props are basalt and magma glass, cracked and heat-scorched"
 * (docs/asset-prompts-3d.md, Block 4), under ENV STYLE: "Natural or ruined
 * form — stone ... pressure-scarred and ancient; nothing manufactured ...
 * low-poly with crisp facets, at most two materials", and no light of any
 * kind. One material, 270 triangles, 8.8 m tall.
 *
 * A port of the approved export (docs/concept-art/models/env-vent-basalt.glb
 * as committed before #869), every number the export's own. The file is one
 * part, `slab` in `basalt` — the vent pair's #121517, not the trench pair's
 * #14171A (seabed.mjs `ground.basaltVent`) — on an identity node under an
 * identity root, and the part is one buffer the generator stitched by hand
 * (kit.mjs `faceted`), twenty-three bodies with no constructor behind any:
 * a mound of three ten-cornered rings from a 16.5 m foot at y = 0 up to a
 * rim between 4 and 7.5 m, stitched corner by corner rather than band by
 * band and fanned to a crown at (0, 5.95, 0), with no cap below; and stood
 * in it twenty-two pillars, the columnar basalt, each a square-topped
 * four-walled chunk open at the foot where it sinks into the mound. The
 * pillars stand on a 2.5 m grid of six by four with the two +z corners
 * empty; every top is a square on its cell to the digit, 1.7 to 2.25 m
 * across, but the four corners of each top take their own heights and the
 * four feet were pushed off the square by hand, so a pillar is its eight
 * points, top four then feet, in the file's order. Both stitches are the
 * file's own (`mound` and `pillar` below) and give its 270 triangles in
 * its order.
 *
 * The root is the export's — `env_vent_basalt`, at the origin with the
 * mound's foot already on y = 0 — and, new in the port, held at 15 m by the
 * measure intake takes: the export measured 16.5047 on X, the mound's
 * −x rim to the far pillar's foot on +x, and baked at ×0.909 with a
 * rescale warning, so the root carries that one factor (seabed.mjs
 * `stand`). `diff.mjs env-vent-basalt HEAD` divides it out and lists
 * nothing else.
 */
import { THREE, add, faceted, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 15;
const DRAWN = 16.5047;

const basalt = seabed.ground.basaltVent();

/**
 * The mound's stitch: `rings` are equal-length index rings from the foot
 * up, `crown` the index of the cap's centre. Each band's quad [l_i, l_i+1,
 * u_i+1, u_i] is cut (l_i, l_i+1, u_i+1), (l_i, u_i+1, u_i) — seabed.mjs
 * `column`'s band — but corner by corner, one corner's whole column of
 * quads before the next corner's, which is the other loop order from
 * `column`'s and the one the file has; then the top ring fanned to the
 * crown, (t_i, t_i+1, crown). No foot cap: the foot is in the ground.
 */
function mound(rings, crown) {
  const out = [];
  const n = rings[0].length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    for (let b = 0; b + 1 < rings.length; b++) {
      const l = rings[b];
      const u = rings[b + 1];
      out.push([l[i], l[j], u[j]], [l[i], u[j], u[i]]);
    }
  }
  const top = rings[rings.length - 1];
  for (let i = 0; i < n; i++) out.push([top[i], top[(i + 1) % n], crown]);
  return out;
}

/**
 * A pillar's stitch: `t` its four top corners and `b` its four feet, the
 * same sense round. The top cut from its first corner, (t0, t1, t2),
 * (t0, t2, t3), then the four walls [b_k, b_k+1, t_k+1, t_k] on `column`'s
 * band. Open at the foot, which is inside the mound.
 */
function pillar(t, b) {
  const out = [
    [t[0], t[1], t[2]],
    [t[0], t[2], t[3]],
  ];
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4;
    out.push([b[k], b[j], t[j]], [b[k], t[j], t[k]]);
  }
  return out;
}

/** Indices `from` to `from + n − 1`. */
const run = (from, n) => Array.from({ length: n }, (_, i) => from + i);

const pile = new THREE.Group();
pile.name = 'env_vent_basalt';

// The mound: ten corners a ring, three rings from the foot up, then the
// crown. The foot ring is at y = 0 exactly; above it every corner has a
// height of its own, the rim climbing from 3.9 m on −x to 7.5 on +x.
// Then the pillars, one per grid cell from (−6.25, −3.75) across in z then
// x, each its top four corners then its four feet.
const MOUND = [
  // ring 0
  [6.52547, 0, 0],
  [5.94736, 0, 3.54323],
  [2.32714, 0, 5.873],
  [-2.29255, 0, 5.78571],
  [-5.37063, 0, 3.19963],
  [-8.2577, 0, 0],
  [-6.47768, 0, -3.85918],
  [-2.41242, 0, -6.08823],
  [2.5018, 0, -6.31378],
  [6.67639, 0, -3.97756],
  // ring 1
  [6.94227, 3.11065, -0.12086],
  [6.29755, 3.02395, 3.56692],
  [2.57241, 2.8775, 6.24718],
  [-2.24287, 2.16014, 6.02335],
  [-5.71373, 2.33575, 3.45489],
  [-8.6678, 1.84324, -0.02564],
  [-6.56093, 1.83418, -3.89585],
  [-2.50526, 2.41763, -6.34386],
  [2.42539, 2.71662, -6.46286],
  [6.83965, 3.32105, -4.08251],
  // ring 2
  [6.02973, 7.47048, 0.18581],
  [5.27523, 7.43007, 3.20217],
  [1.87675, 6.95993, 5.08274],
  [-2.31407, 5.33115, 5.40354],
  [-5.0223, 5.24388, 3.10617],
  [-7.70538, 3.93949, 0.08413],
  [-6.12688, 4.34557, -3.23925],
  [-2.11963, 5.56551, -5.59144],
  [2.1019, 6.61748, -5.49477],
  [5.93717, 7.50281, -3.70807],
  // the crown
  [0, 5.95, 0],
];

const PILLARS = [
  // 0: at (-6.25, -3.75), 2.25 across, top 5.17
  [
    [-7.37252, 5.10031, -4.87252],
    [-5.12748, 5.10031, -4.87252],
    [-5.12748, 4.78465, -2.62748],
    [-7.37252, 5.17422, -2.62748],
    [-7.83822, 4.08096, -5.26376],
    [-5.41935, 4.01823, -5.05197],
    [-5.38643, 3.61875, -2.78756],
    [-7.86224, 3.99952, -2.78037],
  ],
  // 1: at (-6.25, -1.25), 1.99 across, top 5.73
  [
    [-7.24633, 5.72554, -2.24633],
    [-5.25367, 5.72554, -2.24633],
    [-5.25367, 4.89695, -0.25367],
    [-7.24633, 5.2495, -0.25367],
    [-7.7624, 4.67675, -2.26667],
    [-5.44544, 4.72818, -2.46348],
    [-5.48654, 3.9709, -0.31424],
    [-7.56794, 4.15257, -0.26726],
  ],
  // 2: at (-6.25, 1.25), 2.02 across, top 5.60
  [
    [-7.25845, 5.60201, 0.24155],
    [-5.24155, 5.60201, 0.24155],
    [-5.24155, 5.32361, 2.25845],
    [-7.25845, 5.16406, 2.25845],
    [-7.58158, 4.69461, 0.27643],
    [-5.57018, 4.51716, 0.16517],
    [-5.64842, 4.23975, 2.35505],
    [-7.81299, 3.97822, 2.42254],
  ],
  // 3: at (-3.75, -3.75), 1.73 across, top 5.58
  [
    [-4.61297, 5.57904, -4.61297],
    [-2.88703, 5.57904, -4.61297],
    [-2.88703, 5.01279, -2.88703],
    [-4.61297, 5.2794, -2.88703],
    [-5.01186, 4.42611, -4.7898],
    [-3.20893, 4.65659, -4.90858],
    [-3.02792, 3.85967, -3.06123],
    [-4.97561, 4.18128, -3.17373],
  ],
  // 4: at (-3.75, -1.25), 1.71 across, top 6.09
  [
    [-4.60585, 6.00701, -2.10585],
    [-2.89415, 6.00701, -2.10585],
    [-2.89415, 6.08763, -0.39415],
    [-4.60585, 5.94806, -0.39415],
    [-4.97136, 5.04315, -2.29419],
    [-3.0325, 5.03485, -2.20439],
    [-3.07307, 4.9861, -0.44888],
    [-4.87864, 4.80328, -0.52462],
  ],
  // 5: at (-3.75, 1.25), 2.18 across, top 5.86
  [
    [-4.83818, 5.86271, 0.16182],
    [-2.66182, 5.86271, 0.16182],
    [-2.66182, 4.85342, 2.33818],
    [-4.83818, 5.77323, 2.33818],
    [-5.00945, 4.81051, 0.29995],
    [-2.91486, 4.88152, 0.2901],
    [-2.7666, 3.7226, 2.3491],
    [-5.18825, 4.60934, 2.61404],
  ],
  // 6: at (-3.75, 3.75), 1.94 across, top 5.66
  [
    [-4.7208, 5.23416, 2.7792],
    [-2.7792, 5.23416, 2.7792],
    [-2.7792, 5.66213, 4.7208],
    [-4.7208, 5.15154, 4.7208],
    [-5.13399, 4.19763, 3.05317],
    [-3.08751, 4.27327, 2.89361],
    [-2.84252, 4.70561, 4.93737],
    [-5.11969, 4.00097, 4.86044],
  ],
  // 7: at (-1.25, -3.75), 2.23 across, top 6.24
  [
    [-2.36457, 5.55048, -4.86457],
    [-0.13543, 5.55048, -4.86457],
    [-0.13543, 6.24406, -2.63543],
    [-2.36457, 5.66412, -2.63543],
    [-2.63624, 4.59751, -5.08028],
    [-0.08756, 4.46774, -5.10106],
    [-0.10989, 5.24074, -2.81421],
    [-2.55757, 4.61641, -2.75908],
  ],
  // 8: at (-1.25, -1.25), 2.04 across, top 6.68
  [
    [-2.26969, 6.17988, -2.26969],
    [-0.23031, 6.17988, -2.26969],
    [-0.23031, 6.67631, -0.23031],
    [-2.26969, 6.06575, -0.23031],
    [-2.37541, 5.10382, -2.43906],
    [-0.10349, 5.08182, -2.27162],
    [-0.3322, 5.52585, -0.13067],
    [-2.50381, 4.97339, -0.20748],
  ],
  // 9: at (-1.25, 1.25), 1.81 across, top 6.89
  [
    [-2.15547, 6.89256, 0.34453],
    [-0.34453, 6.89256, 0.34453],
    [-0.34453, 6.6747, 2.15547],
    [-2.15547, 6.24012, 2.15547],
    [-2.13684, 5.815, 0.35529],
    [-0.43281, 5.88365, 0.2215],
    [-0.48037, 5.72753, 2.34422],
    [-2.39175, 5.28426, 2.2595],
  ],
  // 10: at (-1.25, 3.75), 2.05 across, top 6.83
  [
    [-2.27717, 6.83428, 2.72283],
    [-0.22283, 6.83428, 2.72283],
    [-0.22283, 6.01551, 4.77717],
    [-2.27717, 6.67459, 4.77717],
    [-2.27557, 5.73321, 2.94064],
    [-0.13818, 5.69797, 3.02253],
    [-0.28821, 4.92606, 5.06185],
    [-2.56196, 5.67862, 5.08093],
  ],
  // 11: at (1.25, -3.75), 2.16 across, top 7.58
  [
    [0.17148, 7.26598, -4.82852],
    [2.32852, 7.26598, -4.82852],
    [2.32852, 6.83091, -2.67148],
    [0.17148, 7.57918, -2.67148],
    [0.0373, 6.3578, -4.97606],
    [2.48245, 6.09763, -4.9834],
    [2.36543, 5.90168, -2.87283],
    [0.31047, 6.38622, -2.77478],
  ],
  // 12: at (1.25, -1.25), 2.02 across, top 7.35
  [
    [0.23984, 7.35365, -2.26016],
    [2.26016, 7.35365, -2.26016],
    [2.26016, 7.03723, -0.23984],
    [0.23984, 7.17286, -0.23984],
    [0.29306, 6.26766, -2.3919],
    [2.26183, 6.29856, -2.4336],
    [2.27141, 6.03353, -0.26706],
    [0.34576, 6.24801, -0.31428],
  ],
  // 13: at (1.25, 1.25), 2.15 across, top 6.74
  [
    [0.17595, 5.99832, 0.17595],
    [2.32405, 5.99832, 0.17595],
    [2.32405, 6.74066, 2.32405],
    [0.17595, 6.57091, 2.32405],
    [0.32047, 4.95423, 0.20621],
    [2.43695, 5.02929, 0.13924],
    [2.50289, 5.69567, 2.51719],
    [0.30341, 5.48309, 2.60516],
  ],
  // 14: at (1.25, 3.75), 1.79 across, top 6.84
  [
    [0.35477, 6.83897, 2.85477],
    [2.14523, 6.83897, 2.85477],
    [2.14523, 6.45448, 4.64523],
    [0.35477, 6.4088, 4.64523],
    [0.39893, 5.74762, 3.05112],
    [2.22629, 5.71243, 3.06696],
    [2.34884, 5.39106, 4.78511],
    [0.49069, 5.30034, 4.9661],
  ],
  // 15: at (3.75, -3.75), 1.89 across, top 7.77
  [
    [2.80705, 7.22985, -4.69295],
    [4.69295, 7.22985, -4.69295],
    [4.69295, 7.57649, -2.80705],
    [2.80705, 7.77083, -2.80705],
    [2.89137, 6.09205, -4.9942],
    [4.82822, 6.31633, -4.92442],
    [4.88789, 6.59791, -2.85281],
    [3.06434, 6.81224, -3.00998],
  ],
  // 16: at (3.75, -1.25), 1.84 across, top 7.79
  [
    [2.83049, 7.12415, -2.16951],
    [4.66951, 7.12415, -2.16951],
    [4.66951, 7.78574, -0.33049],
    [2.83049, 7.64896, -0.33049],
    [2.85756, 6.08104, -2.39461],
    [5.05553, 5.99831, -2.44285],
    [4.9971, 6.75789, -0.36172],
    [3.1118, 6.50137, -0.21132],
  ],
  // 17: at (3.75, 1.25), 2.05 across, top 7.98
  [
    [2.72394, 7.64825, 0.22394],
    [4.77606, 7.64825, 0.22394],
    [4.77606, 7.73801, 2.27606],
    [2.72394, 7.98022, 2.27606],
    [2.82186, 6.70473, 0.37789],
    [4.99466, 6.7388, 0.23798],
    [5.04967, 6.60556, 2.4371],
    [2.93604, 6.84831, 2.46012],
  ],
  // 18: at (3.75, 3.75), 1.82 across, top 7.85
  [
    [2.83789, 7.84947, 2.83789],
    [4.66211, 7.84947, 2.83789],
    [4.66211, 7.44507, 4.66211],
    [2.83789, 7.69659, 4.66211],
    [3.00831, 6.66977, 3.13723],
    [4.92782, 6.86997, 2.87997],
    [4.98646, 6.4961, 4.94626],
    [2.89665, 6.69755, 4.99722],
  ],
  // 19: at (6.25, -3.75), 2.25 across, top 8.83
  [
    [5.12537, 8.83325, -4.87463],
    [7.37463, 8.83325, -4.87463],
    [7.37463, 8.06875, -2.62537],
    [5.12537, 8.40268, -2.62537],
    [5.2994, 7.84234, -5.09586],
    [7.83693, 7.73379, -5.20619],
    [7.75908, 7.12919, -2.82296],
    [5.42611, 7.48603, -2.93219],
  ],
  // 20: at (6.25, -1.25), 1.79 across, top 8.07
  [
    [5.35588, 7.82175, -2.14412],
    [7.14412, 7.82175, -2.14412],
    [7.14412, 7.49613, -0.35588],
    [5.35588, 8.06854, -0.35588],
    [5.56576, 6.8999, -2.40106],
    [7.68217, 6.89725, -2.21558],
    [7.71042, 6.46632, -0.39804],
    [5.82391, 6.95899, -0.32055],
  ],
  // 21: at (6.25, 1.25), 2.02 across, top 8.13
  [
    [5.24124, 7.60674, 0.24124],
    [7.25876, 7.60674, 0.24124],
    [7.25876, 8.12599, 2.25876],
    [5.24124, 7.71079, 2.25876],
    [5.49265, 6.64143, 0.15064],
    [7.55997, 6.45437, 0.31981],
    [7.60119, 6.93544, 2.37529],
    [5.46802, 6.64019, 2.48787],
  ],
];

// One buffer: the mound's 31 points then each pillar's eight, faced in the
// same order.
const POINTS = [...MOUND, ...PILLARS.flat()];
const FACES = [
  ...mound([run(0, 10), run(10, 10), run(20, 10)], 30),
  ...PILLARS.flatMap((_, i) => pillar(run(31 + 8 * i, 4), run(35 + 8 * i, 4))),
];
add(pile, 'slab', faceted(POINTS, FACES), basalt);

const { drawn, k } = seabed.stand(pile, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env_vent_basalt: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(pile, 'env-vent-basalt.glb');
