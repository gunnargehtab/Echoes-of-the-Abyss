/**
 * The vent chimney — 12 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the tall prop of the Thermal
 * Veins and the one prop of the fourteen that is licensed a light.
 *
 * "Thermal Veins | env-vent-chimney | 12 m | 25–40 m | ≤ 800 | `vent-ember`,
 * tip only ... vent props are basalt and magma glass, cracked and
 * heat-scorched" (docs/asset-prompts-3d.md, Block 4), under ENV STYLE:
 * "Natural or ruined form — stone ... pressure-scarred and ancient; nothing
 * manufactured ... low-poly with crisp facets, at most two materials", the
 * light `vent-ember` #E06A2B at 0.7 (docs/style-neon-noir.md "World light",
 * seabed.mjs `ground.ember`) and nothing else lit. Two materials, 434
 * triangles, 34.91 m tall at its 12 m by intake's measure (`sizeM.height`);
 * 35.1 m raw, which is the frame every figure below is in, before the
 * root's fit.
 *
 * A port of the approved export (docs/concept-art/models/env-vent-chimney.glb
 * as committed before #869), part for part in its order, every number the
 * export's own. Five parts on identity nodes under an identity root, every
 * placement baked into its buffer, and not one buffer a three constructor
 * accounts for: each is a polyhedron the generator stitched by hand (kit.mjs
 * `faceted`). What the file is made of — the `stack` in `basalt`, the vent
 * pair's #121517 rather than the trench pair's (seabed.mjs
 * `ground.basaltVent`): a hollow tube of thirteen nine-cornered rings from a
 * 12 m foot at y = 0 to a rim at 34 and a lip at 35, whose last ring turns
 * back down inside the lip to 32.6 — so the mouth is a throat open to the
 * water, and the foot is open too, buried in the ground. Three `spout`s in
 * the same basalt, the same tube on six seven-cornered rings, each rooted
 * inside the stack's wall and reaching out and up to a lip and throat of
 * its own (15, 18 and 23 m). And the `ember_cracks` in `ember`: four
 * separate two-triangle quads stood on the lip, the magma glass the row's
 * light comes from, single-sided as the file flags them. The stitch on all
 * four basalt parts is seabed.mjs `column`'s band with no foot cap, turned
 * round: every ring here runs from +x toward +z, clockwise seen from
 * above, where the spire's run the other way, so the band that faces the
 * spire outward faced all four of these tubes inward, and the four cracks
 * faced into the lip's wall. The file was inside out — every triangle of
 * every part, the vent pair the only props with negative signed volume —
 * and the port reproduced it until #878 turned each triangle round on its
 * own three corners (`tube` and `crack` below).
 *
 * Every ring is a table: the generator kept no radius and no formula, every
 * corner has a height of its own, and each ring is transcribed in the order
 * the file stitches it. The cracks are sixteen points, and not one of the
 * four quads is a parallelogram, so none is a plane under a transform.
 *
 * The root is the export's — `env_vent_chimney`, at the origin with the
 * stack's foot already on y = 0 — and, new in the port, held at 12 m by the
 * measure intake takes: the export measured 12.0613 on Z, the first spout's
 * lip against the stack's far wall, and baked at ×0.995 with a rescale
 * warning, so the root carries that one factor (seabed.mjs `stand`).
 * `diff.mjs env-vent-chimney 7445218` — the pre-port binary — divides it
 * out and lists one thing else: every part with all of its triangles in the
 * opposite order, which is the #878 fix and nothing moved.
 */
import { THREE, add, faceted, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 12;
const DRAWN = 12.0613;

const basalt = seabed.ground.basaltVent();
const ember = seabed.ground.ember();

/**
 * A tube: a column of equal-length index rings stitched into bands and
 * nothing else — seabed.mjs `column`'s band on the same diagonal, each quad
 * [l_i, l_i+1, u_i+1, u_i] cut (l_i, u_i+1, l_i+1), (l_i, u_i, u_i+1),
 * without its foot cap, because the stack's foot is in the ground, a
 * spout's root is inside the stack's wall, and every mouth is a throat.
 * Each triangle is `column`'s with its last two corners swapped: `column`
 * faces outward on rings that run from +x toward −z, the spire's way, and
 * these rings run the other way, so `column`'s order faced every band here
 * inward (#878). Here rather than in seabed.mjs because one prop needs it.
 */
function tube(rings) {
  const out = [];
  for (let b = 0; b + 1 < rings.length; b++) {
    const l = rings[b];
    const u = rings[b + 1];
    for (let i = 0; i < l.length; i++) {
      const j = (i + 1) % l.length;
      out.push([l[i], u[j], l[j]], [l[i], u[i], u[j]]);
    }
  }
  return out;
}

/** A table laid out ring by ring, `n` corners each, as the index rings `tube` takes. */
const ringsOf = (table, n) =>
  Array.from({ length: table.length / n }, (_, r) =>
    Array.from({ length: n }, (_, i) => r * n + i)
  );

/**
 * A crack's two triangles, cut from the quad's first corner (q0, q2, q1),
 * (q0, q3, q2) — seabed.mjs `fan`'s rule. The file carried the other
 * winding on all four, each quad facing into the lip's wall, which is why
 * the export's light audit saw no ember from above (#878).
 */
const crack = (q) => seabed.fan([q]);

const chimney = new THREE.Group();
chimney.name = 'env_vent_chimney';

// The stack: nine corners a ring, thirteen rings from the foot up. The foot
// ring is the one at y = 0 exactly; every ring above has each corner at a
// height of its own. Rings 10 and 11 are the rim and the lip, and ring 12
// is the same nine corners drawn back inside and down — the throat.
const STACK = [
  // ring 0, the foot at y = 0
  [4.92012, 0, 0],
  [5.29249, 0, 4.44092],
  [0.96284, 0, 5.46052],
  [-2.6874, 0, 4.6547],
  [-6.10372, 0, 2.22157],
  [-5.70456, 0, -2.07629],
  [-2.81566, 0, -4.87686],
  [1.13643, 0, -6.44501],
  [5.01833, 0, -4.21088],
  // ring 1
  [5.37737, 3.56739, 1.31351],
  [3.48309, 3.68736, 4.59451],
  [-0.14284, 3.2859, 5.18417],
  [-3.79164, 3.57967, 4.4239],
  [-4.64749, 3.56684, 0.83497],
  [-4.50629, 3.7832, -2.65853],
  [-1.78032, 3.05784, -5.40045],
  [2.06227, 3.7839, -4.84778],
  [5.05157, 3.53041, -2.49164],
  // ring 2
  [4.82773, 7.11839, 0.33879],
  [4.05469, 6.70127, 3.63367],
  [0.88996, 7.06057, 4.6601],
  [-2.06397, 6.53151, 4.13539],
  [-3.94966, 6.74472, 1.82293],
  [-3.94632, 7.13792, -1.14414],
  [-2.20895, 6.97718, -3.70893],
  [1.01129, 6.4589, -4.67061],
  [3.42832, 6.84685, -2.43051],
  // ring 3
  [4.11218, 10.14853, 1.28285],
  [2.48265, 10.46796, 3.27902],
  [0.16886, 10.11185, 3.88185],
  [-2.20771, 10.30773, 3.24176],
  [-4.03292, 10.20973, 1.07726],
  [-2.70966, 10.13816, -1.40315],
  [-0.84414, 10.11119, -3.01437],
  [1.71786, 10.0903, -3.06902],
  [3.76202, 10.27472, -1.37717],
  // ring 4
  [3.65804, 13.83219, 0.55922],
  [3.0858, 13.80735, 2.7189],
  [1.12474, 13.67674, 4.03426],
  [-1.19573, 13.60283, 3.5171],
  [-2.85203, 13.85108, 1.78363],
  [-2.59056, 13.71894, -0.57002],
  [-1.06953, 13.64961, -2.18007],
  [1.0777, 13.50324, -2.64904],
  [3.03738, 13.76834, -1.55982],
  // ring 5
  [4.04466, 16.80398, 1.28817],
  [2.81205, 16.78718, 3.17381],
  [0.69803, 16.8254, 3.51843],
  [-0.97013, 17.25009, 2.56443],
  [-1.9379, 17.06671, 0.98328],
  [-1.49072, 16.97838, -0.83291],
  [-0.15117, 16.81745, -2.3289],
  [2.05657, 17.19382, -2.51162],
  [3.73852, 17.19415, -0.96394],
  // ring 6
  [4.04885, 20.51406, 0.58431],
  [3.01847, 20.18618, 2.15047],
  [1.57167, 20.21482, 2.96435],
  [0.03342, 20.45104, 2.52174],
  [-1.10744, 20.50533, 1.40668],
  [-1.28392, 20.48191, -0.30229],
  [-0.05265, 20.5669, -1.50221],
  [1.57001, 20.34494, -1.78632],
  [3.3636, 20.2333, -1.27144],
  // ring 7
  [3.81097, 23.60795, 0.99468],
  [3.14777, 23.85291, 2.53993],
  [1.47824, 23.61491, 3.0882],
  [-0.14339, 23.67949, 2.41862],
  [-1.00855, 23.82522, 0.88004],
  [-0.48048, 23.70969, -0.7621],
  [0.91243, 23.68753, -1.49971],
  [2.44513, 23.62703, -1.65306],
  [3.75198, 23.87755, -0.64332],
  // ring 8
  [4.22088, 27.19938, 0.40528],
  [3.41293, 27.06579, 1.55059],
  [2.44575, 27.07283, 2.661],
  [0.96908, 27.33536, 2.27402],
  [0.37133, 27.33195, 1.01554],
  [-0.07329, 27.3697, -0.36681],
  [0.89262, 27.29123, -1.5959],
  [2.39597, 27.11329, -1.56813],
  [3.7185, 27.33163, -0.99644],
  // ring 9
  [4.39756, 30.51533, 0.64021],
  [3.7306, 30.72353, 1.71377],
  [2.5246, 30.55258, 2.18652],
  [1.2774, 30.67498, 1.71644],
  [0.7974, 30.67188, 0.50864],
  [1.01556, 30.5038, -0.72864],
  [2.03582, 30.75497, -1.45531],
  [3.40223, 30.64227, -1.74897],
  [4.44443, 30.73353, -0.72853],
  // ring 10, the rim
  [4.80277, 34.04269, 0.08467],
  [4.40372, 33.99925, 1.09471],
  [3.50877, 34.07979, 1.83577],
  [2.21579, 33.99473, 1.78938],
  [1.69959, 33.98432, 0.63078],
  [1.70928, 34.04781, -0.45791],
  [2.31968, 34.01809, -1.44009],
  [3.50446, 34.0756, -1.64199],
  [4.48895, 34.07376, -0.99688],
  // ring 11, the lip
  [4.39994, 34.81768, 0.25505],
  [4.17178, 34.77837, 1.24382],
  [3.1406, 34.81444, 1.701],
  [2.28345, 34.9653, 1.01793],
  [1.71292, 34.72622, 0.209],
  [1.7277, 35.03212, -0.92],
  [2.63347, 35.06778, -1.7436],
  [3.82686, 35.08778, -1.55153],
  [4.28267, 35.0072, -0.57566],
  // ring 12, the throat, turned down into the mouth
  [4.12183, 32.62904, 0],
  [3.95533, 32.54, 0.6338],
  [3.34263, 32.5456, 0.80889],
  [2.79231, 32.5462, 0.70614],
  [2.45384, 32.61361, 0.27158],
  [2.2638, 32.56009, -0.34075],
  [2.78957, 32.56141, -0.71089],
  [3.36284, 32.56673, -0.92353],
  [3.88222, 32.66402, -0.57245],
];

add(chimney, 'stack', faceted(STACK, tube(ringsOf(STACK, 9))), basalt);

// The three spouts: seven corners a ring, six rings each, from a root ring
// inside the stack's wall out and up to a lip, then the throat ring turned
// down inside it. Each spout is where the file put it, its placement in
// its own points; the first leans out over +z, the second over −z and the
// third over +x, and they climb the stack in that order.
const SPOUT_1 = [
  // ring 0, the root, inside the stack
  [-2.99354, 6.07339, 3.46195],
  [-3.95342, 5.95644, 1.72807],
  [-2.80324, 5.81464, 0.11589],
  [-1.00778, 6.12995, -0.06948],
  [0.77694, 5.85319, 0.8921],
  [0.62377, 6.00368, 3.07091],
  [-1.2399, 5.87756, 3.76867],
  // ring 1
  [-3.72245, 8.12997, 3.59455],
  [-3.63017, 8.1672, 2.00863],
  [-2.7522, 8.27044, 0.66569],
  [-1.08979, 8.42991, 0.92521],
  [-0.44784, 8.21846, 2.33116],
  [-0.79866, 8.06936, 3.78087],
  [-2.23584, 8.21847, 4.12267],
  // ring 2
  [-3.48154, 10.41861, 4.23816],
  [-4.3664, 10.58497, 3.1029],
  [-3.55887, 10.48066, 1.7937],
  [-2.06625, 10.64162, 1.4975],
  [-0.94236, 10.54956, 2.53498],
  [-1.12951, 10.45346, 3.99351],
  [-2.29843, 10.49907, 4.72994],
  // ring 3
  [-4.09738, 12.76673, 4.57426],
  [-4.32427, 12.79098, 3.43306],
  [-3.47203, 12.80682, 2.60873],
  [-2.25433, 12.83566, 2.63773],
  [-1.52958, 12.73463, 3.69131],
  [-2.09225, 12.86346, 4.77522],
  [-3.1626, 12.7147, 5.35686],
  // ring 4, the lip
  [-4.01024, 14.97011, 5.18541],
  [-4.54893, 15.03961, 4.48436],
  [-4.05606, 15.08652, 3.6777],
  [-3.14031, 14.94432, 3.50786],
  [-2.60148, 15.05674, 4.19937],
  [-2.6827, 15.07899, 4.96471],
  [-3.25759, 15.0257, 5.61631],
  // ring 5, the throat, turned down into the mouth
  [-3.87317, 14.30213, 4.82598],
  [-3.90314, 14.3221, 4.39018],
  [-3.61035, 14.3222, 4.07532],
  [-3.19272, 14.31109, 4.14385],
  [-2.9547, 14.29377, 4.48639],
  [-3.10761, 14.30529, 4.87097],
  [-3.48662, 14.32369, 5.0126],
];

const SPOUT_2 = [
  // ring 0, the root, inside the stack
  [-0.12148, 10.94712, -4.04402],
  [1.36101, 11.12318, -3.45332],
  [1.57055, 10.93722, -2.01399],
  [1.11542, 10.83723, -0.54753],
  [-0.40622, 10.96647, -0.76501],
  [-1.27003, 11.06295, -1.70488],
  [-1.53405, 10.89326, -3.19995],
  // ring 1
  [0.32775, 12.87593, -4.24072],
  [1.47643, 12.65855, -3.69606],
  [1.31385, 12.78564, -2.44721],
  [0.47636, 12.83781, -1.73922],
  [-0.73948, 12.8207, -1.68518],
  [-1.16903, 12.7025, -2.83879],
  [-0.93769, 12.87811, -4.08239],
  // ring 2
  [0.02732, 14.52087, -4.91467],
  [1.11637, 14.54792, -4.62026],
  [1.48401, 14.52309, -3.52313],
  [0.73968, 14.39242, -2.7612],
  [-0.25394, 14.4349, -2.46561],
  [-1.0258, 14.44106, -3.25333],
  [-0.78355, 14.5284, -4.26863],
  // ring 3
  [0.39503, 16.30999, -5.44382],
  [1.02866, 16.32776, -4.86841],
  [1.02686, 16.28657, -4.098],
  [0.51135, 16.30599, -3.48851],
  [-0.36516, 16.30842, -3.55343],
  [-0.6379, 16.33044, -4.35761],
  [-0.44164, 16.31193, -5.15373],
  // ring 4, the lip
  [0.23057, 18.0538, -5.90364],
  [0.90544, 18.03336, -5.75308],
  [1.17373, 18.05261, -5.06506],
  [0.68108, 18.03227, -4.57826],
  [0.0897, 17.94496, -4.51943],
  [-0.51137, 18.0668, -4.87263],
  [-0.24157, 17.93786, -5.51086],
  // ring 5, the throat, turned down into the mouth
  [0.37123, 17.32023, -5.52154],
  [0.67155, 17.32096, -5.36452],
  [0.65351, 17.28615, -5.02574],
  [0.41403, 17.29862, -4.82986],
  [0.09395, 17.28355, -4.84353],
  [-0.05382, 17.29913, -5.13684],
  [0.0703, 17.27957, -5.42858],
];

const SPOUT_3 = [
  // ring 0, the root, inside the stack
  [3.50973, 16.89854, 1.14566],
  [2.8522, 16.992, 2.01682],
  [1.65199, 17.05694, 1.87193],
  [1.18399, 17.05002, 0.77685],
  [1.65856, 17.0283, -0.22746],
  [2.74784, 17.06755, -0.75735],
  [3.79817, 17.0528, 0.00097],
  // ring 1
  [4.09541, 18.56517, 1.66553],
  [3.1909, 18.40645, 1.95013],
  [2.24972, 18.53159, 1.70033],
  [2.11696, 18.50964, 0.70706],
  [2.71426, 18.4988, -0.02495],
  [3.61111, 18.40664, 0.05721],
  [4.13204, 18.46862, 0.72726],
  // ring 2
  [4.7244, 19.94574, 1.5293],
  [4.16515, 19.93222, 2.1287],
  [3.42743, 19.90981, 1.83561],
  [2.85694, 20.06686, 1.23144],
  [3.36738, 20.04852, 0.5763],
  [4.05454, 19.98232, 0.3065],
  [4.83585, 20.0537, 0.67189],
  // ring 3
  [5.12979, 21.57234, 1.81396],
  [4.62713, 21.52095, 2.10594],
  [4.04296, 21.43155, 1.88161],
  [3.95721, 21.53744, 1.26464],
  [4.26321, 21.46321, 0.67157],
  [4.9907, 21.54597, 0.64589],
  [5.325, 21.49402, 1.25138],
  // ring 4, the lip
  [5.86597, 22.97229, 1.86097],
  [5.53894, 23.04156, 2.2799],
  [5.00033, 22.99983, 2.14951],
  [4.70896, 23.03592, 1.67971],
  [4.93648, 23.02928, 1.1648],
  [5.47941, 23.02149, 0.98512],
  [5.84059, 23.02382, 1.38777],
  // ring 5, the throat, turned down into the mouth
  [5.58317, 22.31278, 1.82292],
  [5.3629, 22.31212, 1.9206],
  [5.12663, 22.31109, 1.8369],
  [5.0783, 22.31038, 1.58428],
  [5.22547, 22.28394, 1.36749],
  [5.48096, 22.28931, 1.39796],
  [5.61958, 22.30272, 1.58793],
];

add(chimney, 'spout_1', faceted(SPOUT_1, tube(ringsOf(SPOUT_1, 7))), basalt);
add(chimney, 'spout_2', faceted(SPOUT_2, tube(ringsOf(SPOUT_2, 7))), basalt);
add(chimney, 'spout_3', faceted(SPOUT_3, tube(ringsOf(SPOUT_3, 7))), basalt);

// The ember cracks: four quads a metre and a half tall stood in the mouth
// between the lip and the throat, y = 33.1 to 34.5, each its own four
// corners in the file's order.
const EMBER_CRACKS = [
  // crack 0
  [4.3213, 34.3108, 0.39006],
  [4.18917, 34.28917, 0.94475],
  [4.07308, 33.05807, 0.60561],
  [4.16907, 33.10704, 0.24735],
  // crack 1
  [2.27331, 34.40169, 0.82787],
  [1.95314, 34.2702, 0.37154],
  [2.36246, 33.10826, 0.4106],
  [2.55454, 33.07118, 0.65781],
  // crack 2
  [1.98567, 34.48007, -0.94235],
  [2.49406, 34.49968, -1.40375],
  [2.5754, 33.12118, -0.83296],
  [2.27937, 33.12045, -0.62217],
  // crack 3
  [3.84561, 34.52242, -1.28777],
  [4.10605, 34.4781, -0.74325],
  [3.88289, 33.18935, -0.74456],
  [3.58838, 33.13584, -0.94329],
];

add(
  chimney,
  'ember_cracks',
  faceted(
    EMBER_CRACKS,
    [0, 4, 8, 12].flatMap((q) => crack([q, q + 1, q + 2, q + 3]))
  ),
  ember
);

const { drawn, k } = seabed.stand(chimney, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env_vent_chimney: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(chimney, 'env-vent-chimney.glb');
