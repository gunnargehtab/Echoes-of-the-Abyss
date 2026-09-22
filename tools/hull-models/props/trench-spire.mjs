/**
 * The trench spire — 20 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the tall prop of the
 * Abyssal Trench floor.
 *
 * "Abyssal Trench | env-trench-spire | 20 m | 40–60 m | ≤ 600 | none ...
 * trench props are blackened, pressure-eroded, knife-edged"
 * (docs/asset-prompts-3d.md, Block 4), under ENV STYLE: "Natural or ruined
 * form — stone ... pressure-scarred and ancient; nothing manufactured ...
 * low-poly with crisp facets, at most two materials", and no light of any
 * kind. One material, 146 triangles, 54 m tall.
 *
 * A port of the approved export (docs/concept-art/models/env-trench-spire.glb
 * as committed before #869), every number the export's own. The file is
 * one part, `trench_spire` in `basalt`, on an identity node under an
 * identity root, and the part is one buffer the generator stitched by hand
 * (kit.mjs `faceted`): a column of nine six-cornered rings from a 20 m
 * foot at y = 0 up to a 5 m crown at 46, each corner its own, capped at
 * the foot and stitched ring to ring (seabed.mjs `column`); a split tip
 * over the last ring, the main point to 54 m and a second to 50.5,
 * twelve triangles the generator laid one by one; four six-cornered
 * shelves let into the column's flanks at 11, 19, 24 and 30 m, two on the
 * +x side and two on −x with the mirrored stitch; and an open-bottomed
 * buttress block at the foot on +x, whose far corner at x = 12 is the
 * prop's whole reach that way. Everything after the column is a table of
 * triangles as the file cuts them; nothing there is a rule worth a
 * builder.
 *
 * The root is the export's — `env-trench-spire`, hyphenated as the file
 * has it, at the origin with the buffer already sitting on y = 0 — and,
 * new in the port, held at 20 m by the measure intake takes: the export
 * measured 20.1012 on Z, its longer plan axis, and baked at ×0.995, so
 * the root carries that one factor (seabed.mjs `stand`).
 * `diff.mjs env-trench-spire HEAD` divides it out and lists nothing else.
 */
import { THREE, add, faceted, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 20;
const DRAWN = 20.1012;

const basalt = seabed.ground.basaltTrench();

const spire = new THREE.Group();
spire.name = 'env-trench-spire';

// The rings, six corners each in the same sense round, foot first.
const RINGS = [
  [
    [-0.52494, 0, 10.25246],
    [3.9787, 0, 3.32633],
    [3.60084, 0, -3.98037],
    [-0.17922, 0, -9.84877],
    [-3.09217, 0, -4.37429],
    [-4.00626, 0, 3.58155],
  ],
  [
    [-0.04177, 3, 9.50168],
    [3.43702, 3, 3.6983],
    [3.33307, 3, -3.90352],
    [0.70237, 3, -9.54877],
    [-2.24617, 3, -3.12921],
    [-3.98195, 3, 3.26217],
  ],
  [
    [-0.20413, 8, 9.02391],
    [2.99566, 8, 3.52907],
    [3.20568, 8, -2.92163],
    [0.97831, 8, -8.6913],
    [-1.43384, 8, -4.04122],
    [-3.13697, 8, 2.86004],
  ],
  [
    [-0.65656, 14, 8.30447],
    [2.74425, 14, 3.47513],
    [2.97155, 14, -2.52584],
    [1.32881, 14, -7.95683],
    [-1.01545, 14, -2.6297],
    [-2.32157, 14, 2.6498],
  ],
  [
    [-0.35975, 21, 7.31138],
    [2.08924, 21, 3.1721],
    [2.82415, 21, -1.95803],
    [2.03107, 21, -6.80816],
    [-0.21806, 21, -3.17262],
    [-1.64984, 21, 2.52628],
  ],
  [
    [-0.46605, 28, 6.6155],
    [2.00082, 28, 2.91072],
    [2.85549, 28, -1.60545],
    [2.49939, 28, -5.43345],
    [0.28007, 28, -1.5343],
    [-0.96448, 28, 2.41095],
  ],
  [
    [-0.00895, 35, 5.58363],
    [1.91709, 35, 2.65092],
    [2.68077, 35, -1.06642],
    [2.53663, 35, -4.24845],
    [1.07389, 35, -1.78146],
    [-0.47127, 35, 2.21126],
  ],
  [
    [0.106, 41, 4.60082],
    [1.73582, 41, 2.31315],
    [2.68269, 41, -0.5578],
    [2.70239, 41, -3.06856],
    [1.08916, 41, -0.31917],
    [0.11611, 41, 1.98902],
  ],
  [
    [0.61086, 46, 3.79799],
    [1.85943, 46, 2.18745],
    [2.52113, 46, -0.07441],
    [2.5934, 46, -1.933],
    [1.66081, 46, -0.83624],
    [0.6961, 46, 1.64297],
  ],
];

// What stands on and against the column, numbered on from the rings'
// 54 corners (48–53 are the crown ring).
const REST = [
  // the tip: 54 the point, 55–56 a step on the crown, 57 the second point
  [2.22, 54, 3.24],
  [2.02, 46.3, 1.34],
  [1.62, 46.3, 0.84],
  [1.32, 50.5, -0.56],
  // shelf at 11 m, +x: 58–63
  [2.065, 11, -2.25655],
  [4.665, 11.4, 3.18345],
  [2.065, 11, 4.14345],
  [4.665, 11.4, -0.97655],
  [2.065, 13.2, 3.82345],
  [2.065, 13.2, -1.93655],
  // shelf at 19 m, −x: 64–69
  [-0.665, 19, -2.25192],
  [-0.665, 19, 2.94808],
  [-2.865, 19.4, 2.16808],
  [-2.865, 19.4, -1.21192],
  [-0.665, 20.8, 2.68808],
  [-0.665, 20.8, -1.99192],
  // shelf at 30 m, +x: 70–75
  [1.855, 30, -0.83742],
  [3.555, 30.4, 2.56258],
  [1.855, 30, 3.16258],
  [3.555, 30.4, -0.03742],
  [1.855, 31.4, 2.96258],
  [1.855, 31.4, -0.63742],
  // shelf at 24 m, −x: 76–81
  [-0.21, 24, -1.90585],
  [-0.21, 24, 1.29415],
  [-1.61, 24.4, 0.81415],
  [-1.61, 24.4, -1.26585],
  [-0.21, 25.1, 1.13415],
  [-0.21, 25.1, -1.74585],
  // the buttress: 82–85 its top, 86–89 its foot
  [7.5, 1.6, -3.2],
  [11.5, 1.4, -1.2],
  [10.8, 1.1, 2.4],
  [8, 1.9, 2],
  [6.5, 0, -4],
  [7.5, 0, 2.5],
  [12, 0, -1.5],
  [11, 0, 3],
];
const POINTS = [...RINGS.flat(), ...REST];

/** A shelf's six triangles as the +x shelves cut them, and as the −x ones do, mirrored. */
const shelfRight = (b) => [
  [b, b + 1, b + 2],
  [b, b + 3, b + 1],
  [b + 2, b + 1, b + 4],
  [b, b + 5, b + 3],
  [b + 3, b + 4, b + 1],
  [b + 3, b + 5, b + 4],
];
const shelfLeft = (b) => [
  [b, b + 1, b + 2],
  [b, b + 2, b + 3],
  [b + 1, b + 4, b + 2],
  [b, b + 3, b + 5],
  [b + 3, b + 2, b + 4],
  [b + 3, b + 4, b + 5],
];

const TRIANGLES = [
  // the column: foot cap and eight bands
  ...seabed.column(RINGS.map((_, r) => Array.from({ length: 6 }, (_, i) => 6 * r + i))),
  // the tip, over the crown ring 48–53
  [48, 49, 54],
  [49, 55, 54],
  [53, 48, 54],
  [56, 53, 54],
  [50, 51, 57],
  [51, 52, 57],
  [52, 56, 57],
  [55, 50, 57],
  [49, 50, 55],
  [52, 53, 56],
  [55, 56, 54],
  [56, 55, 57],
  // the four shelves
  ...shelfRight(58),
  ...shelfLeft(64),
  ...shelfRight(70),
  ...shelfLeft(76),
  // the buttress: its top, then four walls round from −z
  [82, 83, 84],
  [82, 84, 85],
  [86, 82, 85],
  [86, 85, 87],
  [88, 83, 82],
  [88, 82, 86],
  [89, 84, 83],
  [89, 83, 88],
  [87, 85, 84],
  [87, 84, 89],
];
add(spire, 'trench_spire', faceted(POINTS, TRIANGLES), basalt);

const { drawn, k } = seabed.stand(spire, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env-trench-spire: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(spire, 'env-trench-spire.glb');
