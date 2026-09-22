/**
 * The rock crag, A — 30 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the first of the two
 * jagged-rock props that dress a mesa's edge anywhere on the map.
 *
 * "Rock (any biome) | env-rock-crag-a / -b | 30 m | 30–50 m | ≤ 500 | none
 * ... Crags are the jagged-rock vocabulary for mesa edges anywhere on the
 * map" (docs/asset-prompts-3d.md, Block 4), under ENV STYLE: "Natural or
 * ruined form — stone ... pressure-scarred and ancient; nothing
 * manufactured ... low-poly with crisp facets, at most two materials", and
 * no light of any kind. One material, 228 triangles, 46 m tall.
 *
 * A port of the approved export (docs/concept-art/models/env-rock-crag-a.glb
 * as committed before #869), part for part in its order, every number the
 * export's own. What the file is made of, all in `stone_dark`: a base and
 * four peaks, each a drum whose every vertex the generator pushed by hand,
 * and three ledges it left as plain boxes. The base is a nine-facet drum
 * 5 m tall; the two tall peaks are six-facet drums on three height rows
 * (46 m and 36 m), the two short ones five-facet drums on two (27 m and
 * 19 m), each with both caps and each yawed on its node. So each of the
 * five is a table in three's own vertex order under seabed.mjs `drum` —
 * seam duplicates and cap centres included, because the export jittered
 * by index and tore them apart (kit.mjs `tabled` says how to read one).
 * The ledges are 7 × 1.6 × 4.5, 5.5 × 1.4 × 4 and 4.5 × 1.2 × 3.5, yawed
 * and rolled on their nodes, in the files' flat-shaded finish (`block`).
 *
 * The root is the export's — `env_rock_crag_a`, lifted 0.14956 so the
 * lowest vertex, the main peak's torn bottom rim, sits on y = 0 — and,
 * new in the port, held at 30 m by the measure intake takes: the export
 * measured 31.2619 across its parts' boxes and baked at ×0.960 with a
 * rescale warning, so the root carries that one factor (seabed.mjs
 * `stand`). `diff.mjs env-rock-crag-a HEAD` divides it out and lists
 * nothing else.
 */
import { THREE, add, exportGlb, rep } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 30;
const DRAWN = 31.2619;

const stone = seabed.ground.stoneDark();

const crag = new THREE.Group();
crag.name = 'env_rock_crag_a';

// The base: nine facets, one height row, both caps. Rows in three's order —
// torso top ring, torso bottom ring, top cap centres and ring, bottom cap
// centres and ring. The top is untouched at y = 2.5 (its nine centre
// copies are one point); the bottom rim and its centres each took their own
// y, which is what sits the crag into the ground.
const BASE = [
  // torso row 0
  [-0.9449, 2.5, 10.29525],
  [5.70814, 2.5, 6.73036],
  [9.78918, 2.5, 1.71149],
  [7.90464, 2.5, -4.27362],
  [3.73128, 2.5, -8.84609],
  [-2.90046, 2.5, -8.6702],
  [-7.62857, 2.5, -5.23761],
  [-9.59338, 2.5, 2.04259],
  [-5.73218, 2.5, 6.43427],
  [0.34759, 2.5, 9.43932],
  // torso row 1
  [0.20698, -2.61089, 13.65063],
  [8.68403, -2.44458, 10.54895],
  [13.36534, -2.37887, 2.38219],
  [11.89143, -2.5484, -6.8126],
  [4.78249, -2.60214, -12.76805],
  [-4.71643, -2.56031, -12.7209],
  [-11.47709, -2.43259, -6.72189],
  [-13.10976, -2.56659, 2.12798],
  [-8.64792, -2.5231, 10.34591],
  [-0.15045, -2.63087, 13.7004],
  // top cap centres
  ...rep(9, [0, 2.5, 0]),
  // top cap ring
  [-0.25427, 2.5, 9.20539],
  [6.41724, 2.5, 8.07944],
  [9.38375, 2.5, 1.01755],
  [8.04887, 2.5, -5.15901],
  [2.99301, 2.5, -9.07081],
  [-3.56563, 2.5, -8.86724],
  [-8.0117, 2.5, -5.25419],
  [-8.5874, 2.5, 1.56997],
  [-5.42039, 2.5, 7.53282],
  [0.25392, 2.5, 9.5307],
  // bottom cap centres
  [0, -2.49854, 0],
  [0, -2.44444, 0],
  [0, -2.37077, 0],
  [0, -2.53036, 0],
  [0, -2.43878, 0],
  [0, -2.57317, 0],
  [0, -2.47446, 0],
  [0, -2.54393, 0],
  [0, -2.5498, 0],
  // bottom cap ring
  [-0.0532, -2.389, 13.64441],
  [8.48706, -2.62415, 10.498],
  [13.24924, -2.6241, 2.1745],
  [11.93448, -2.46108, -6.8872],
  [4.44296, -2.47268, -12.70687],
  [-4.79475, -2.38694, -12.47913],
  [-11.49996, -2.38012, -6.56124],
  [-13.16695, -2.64392, 2.23421],
  [-8.80097, -2.64653, 10.13386],
  [0.05725, -2.4291, 13.36837],
];
add(crag, 'base', seabed.drum(BASE, 9, 1), stone, [0, 2.5, 0], [0, 0.2, 0]);

// The main peak: six facets on three height rows, 46 m from a rim that is
// 6.5 m across to a crown pushed to within 2 m of its axis and left at
// y = 23. The rows run from the top: crown ring, two middle rings, bottom
// rim, then the caps.
const PEAK_MAIN = [
  // torso row 0
  [-0.02154, 23, 1.57974],
  [0.50878, 23, 1.37373],
  [0.50293, 23, -0.85526],
  [0.79841, 23, -1.9728],
  [-1.06098, 23, -1.60649],
  [-0.20292, 23, 0.87729],
  [0.85479, 23, 0.23002],
  // torso row 1
  [0.61008, 8.09556, 2.39107],
  [2.58216, 7.45281, 1.70688],
  [2.05984, 7.7256, -1.87721],
  [-0.68267, 7.85031, -2.4558],
  [-2.15614, 7.23912, -1.4361],
  [-3.07689, 7.32881, 2.07235],
  [0.28649, 7.24308, 3.46603],
  // torso row 2
  [0.39271, -7.36363, 4.90373],
  [4.39163, -7.71611, 2.53817],
  [3.6679, -7.4316, -2.03331],
  [-0.10424, -7.72516, -4.80522],
  [-3.52932, -7.75803, -2.20642],
  [-3.80143, -7.76813, 2.50743],
  [0.23083, -7.85201, 4.45415],
  // torso row 3
  [-0.09885, -22.84434, 6.45488],
  [5.43887, -22.86823, 3.2954],
  [5.21162, -23.11485, -3.02376],
  [-0.00134, -22.91451, -6.16988],
  [-5.13533, -23.09855, -3.10941],
  [-5.39736, -22.94878, 2.9247],
  [0.0114, -22.99788, 6.2323],
  // top cap centres
  ...rep(6, [0, 23, 0]),
  // top cap ring
  [0.52072, 23, 0.92147],
  [1.54726, 23, -0.35981],
  [0.63187, 23, -0.51558],
  [-0.60192, 23, -0.74857],
  [-1.46265, 23, -1.13518],
  [-0.7161, 23, 0.45657],
  [-0.85999, 23, 1.75259],
  // bottom cap centres
  [0, -22.8983, 0],
  [0, -22.86913, 0],
  [0, -22.87084, 0],
  [0, -22.94302, 0],
  [0, -22.85545, 0],
  [0, -23.14956, 0],
  // bottom cap ring
  [0.13754, -22.92943, 6.25305],
  [5.57841, -23.11467, 2.85693],
  [5.149, -23.13077, -3.30568],
  [-0.25751, -22.85959, -6.14485],
  [-5.53105, -23.0938, -3.29234],
  [-5.27753, -23.01375, 2.96521],
  [0.25933, -22.94527, 6.15937],
];
add(crag, 'peak_main', seabed.drum(PEAK_MAIN, 6, 3), stone, [1.5, 23, -1.5], [0, 0.3, 0]);

// The second peak: the same drum at 36 m, yawed 1.1.
const PEAK_SECOND = [
  // torso row 0
  [0.51851, 18, 0.80511],
  [0.70809, 18, -0.32937],
  [0.35597, 18, 0.08144],
  [0.89655, 18, -1.6569],
  [-0.06176, 18, -0.48351],
  [-1.58014, 18, -0.04786],
  [0.19394, 18, 0.3773],
  // torso row 1
  [-0.60053, 6.12515, 2.07651],
  [2.15832, 6.42172, 1.17243],
  [1.47387, 5.84154, -1.32324],
  [-0.70574, 5.9261, -3.10291],
  [-2.66011, 6.36215, -1.57826],
  [-1.68354, 5.94606, 1.57567],
  [0.5052, 6.25702, 3.05821],
  // torso row 2
  [0.15483, -6.08723, 3.86904],
  [3.20193, -6.00297, 1.8971],
  [3.3554, -5.90522, -1.68785],
  [0.12706, -5.77929, -3.58095],
  [-2.96067, -6.03555, -1.43291],
  [-3.30328, -5.7273, 2.33741],
  [-0.13606, -6.09025, 3.39745],
  // torso row 3
  [0.1875, -17.93, 5.30211],
  [4.72637, -18.08612, 2.74063],
  [4.37503, -18.11639, -2.45374],
  [0.20362, -17.96025, -5.05291],
  [-4.39972, -18.01675, -2.58242],
  [-4.32103, -17.89013, 2.63106],
  [-0.11241, -18.0194, 5.29146],
  // top cap centres
  ...rep(6, [0, 18, 0]),
  // top cap ring
  [-0.19829, 18, 0.40941],
  [1.03434, 18, -0.00757],
  [1.61984, 18, 0.10869],
  [-0.30619, 18, -0.65439],
  [-0.15278, 18, -1.22591],
  [-1.22954, 18, 1.29555],
  [-0.94251, 18, 0.30413],
  // bottom cap centres
  [0, -18.0302, 0],
  [0, -18.14066, 0],
  [0, -17.9433, 0],
  [0, -17.88303, 0],
  [0, -18.09615, 0],
  [0, -18.08466, 0],
  // bottom cap ring
  [0.21919, -18.0955, 5.29792],
  [4.31558, -18.14231, 2.66203],
  [4.65616, -17.92617, -2.55512],
  [-0.18225, -17.93684, -5.28268],
  [-4.28036, -17.97407, -2.57656],
  [-4.36738, -17.9313, 2.69922],
  [0.0478, -18.13366, 5.00413],
];
add(crag, 'peak_second', seabed.drum(PEAK_SECOND, 6, 3), stone, [-6.5, 18, 3.5], [0, 1.1, 0]);

// The third and fourth peaks: five facets on two height rows, 27 m and 19 m.
const PEAK_THIRD = [
  // torso row 0
  [0.1835, 13.5, 0.45431],
  [0.9874, 13.5, -0.12539],
  [0.08033, 13.5, -0.53369],
  [-0.31924, 13.5, -0.22133],
  [-1.278, 13.5, 0.93506],
  [-0.72453, 13.5, 1.20892],
  // torso row 1
  [-0.09514, 0.09771, 2.84781],
  [2.73596, 0.25671, 0.38474],
  [1.49972, -0.04594, -1.73358],
  [-1.12523, 0.139, -1.76657],
  [-2.00921, -0.18956, 1.15332],
  [0.2241, -0.22935, 2.19768],
  // torso row 2
  [0.18843, -13.61177, 4.39101],
  [3.81676, -13.38894, 1.1979],
  [2.62399, -13.55619, -3.20611],
  [-2.59543, -13.5076, -3.59537],
  [-3.96948, -13.54458, 1.14733],
  [-0.008, -13.61215, 4.08524],
  // top cap centres
  ...rep(5, [0, 13.5, 0]),
  // top cap ring
  [-0.73809, 13.5, 0.24149],
  [1.0655, 13.5, 0.22619],
  [1.02822, 13.5, -0.35856],
  [-0.51154, 13.5, -0.40349],
  [-1.03734, 13.5, 0.46178],
  [0.75369, 13.5, 1.33842],
  // bottom cap centres
  [0, -13.38357, 0],
  [0, -13.4467, 0],
  [0, -13.47395, 0],
  [0, -13.42372, 0],
  [0, -13.58286, 0],
  // bottom cap ring
  [-0.18252, -13.46303, 4.29516],
  [3.96553, -13.52849, 1.31669],
  [2.46636, -13.60928, -3.55667],
  [-2.64545, -13.53915, -3.4591],
  [-4.12038, -13.59439, 1.35664],
  [-0.18808, -13.41538, 3.99067],
];
add(crag, 'peak_third', seabed.drum(PEAK_THIRD, 5, 2), stone, [6.5, 13.5, 5.5], [0, 0.6, 0]);

const PEAK_FOURTH = [
  // torso row 0
  [0.49877, 9.5, 0.08498],
  [1.02774, 9.5, -0.02908],
  [0.27959, 9.5, -0.01527],
  [-0.01083, 9.5, -1.22565],
  [0.00028, 9.5, -0.18128],
  [0.19285, 9.5, 0.60221],
  // torso row 1
  [-0.39677, 0.13022, 1.7718],
  [2.16545, 0.18235, 0.42023],
  [1.47143, -0.02079, -1.81324],
  [-1.37591, 0.19458, -1.8682],
  [-1.63514, -0.00078, 0.78495],
  [0.3117, 0.15968, 2.3218],
  // torso row 2
  [0.09124, -9.45982, 3.56462],
  [3.15848, -9.53689, 1.12489],
  [2.12587, -9.42748, -2.86862],
  [-1.94299, -9.50694, -2.64006],
  [-3.13009, -9.59606, 1.16575],
  [-0.09386, -9.60009, 3.29343],
  // top cap centres
  ...rep(5, [0, 9.5, 0]),
  // top cap ring
  [0.10469, 9.5, 1.12107],
  [0.83742, 9.5, 0.69346],
  [0.90482, 9.5, -0.14319],
  [-0.8064, 9.5, -0.48198],
  [-0.72013, 9.5, 0.0625],
  [0.05159, 9.5, 1.03897],
  // bottom cap centres
  [0, -9.4963, 0],
  [0, -9.5244, 0],
  [0, -9.50007, 0],
  [0, -9.5536, 0],
  [0, -9.4573, 0],
  // bottom cap ring
  [0.09508, -9.55154, 3.32909],
  [3.27349, -9.40798, 1.06874],
  [2.02239, -9.47895, -2.81496],
  [-1.97271, -9.48507, -2.70311],
  [-3.35207, -9.58016, 0.94871],
  [-0.05829, -9.42133, 3.44688],
];
// A yaw of 1.8, which `parts.mjs` prints as the XYZ triple (−π, 1.34, −π).
add(crag, 'peak_fourth', seabed.drum(PEAK_FOURTH, 5, 2), stone, [-3.5, 9.5, -8], [0, 1.8, 0]);

// Three ledges the generator left as boxes, each yawed and rolled a little.
add(crag, 'ledge_a', seabed.block(7, 1.6, 4.5), stone, [5, 12, -5], [0, 0.4, 0.12]);
add(crag, 'ledge_b', seabed.block(5.5, 1.4, 4), stone, [-8, 9, -2.5], [0, -0.5, -0.1]);
add(crag, 'ledge_c', seabed.block(4.5, 1.2, 3.5), stone, [2, 22, 3.5], [0, 0.9, 0.08]);

const { drawn, k } = seabed.stand(crag, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env_rock_crag_a: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(crag, 'env-rock-crag-a.glb');
