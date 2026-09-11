/**
 * The Harvester, the Commune's — 75 m (docs/units.md; the Harvester block
 * of docs/asset-prompts-3d.md Block 3, read with the Pelagia FACTION block).
 *
 * "Industrial nodule-mining vessel (SIG 18 idle; mining follows the
 * throttle, up to 68 at Overdrive). Wide cargo body, external intake dredge
 * gear; dim at rest, with floodlit mining machinery that reads as its loud
 * state" — said the Commune's way: a grazing thing. A pod of a hull pushed
 * out of round as it grew, the widest body in the navy's shared kinds; two
 * cargo lobes slung under the flanks, different sizes at different heights,
 * each rolled its own way; five growth rings leaned each its own way; an
 * intake scoop under the jaw with seven baleen plates raked across its
 * mouth, each rolled a little further than the last, and three feed
 * tendrils hanging from it, no two alike; a dorsal blade, two paddles of
 * different sizes raked forward and down; a peduncle and two tail flukes;
 * and five buds of biolight — brow, two flanks, one under the port cargo
 * lobe, the tail — with two points of glow inside the hull.
 *
 * A port of the approved export (docs/concept-art/models/harvester-pelagia.glb
 * at 3e15409), part for part in its order, every number the export's own,
 * read off its nodes and its buffers with tools/hull-models/parts.mjs.
 * Every part comes from `factions/pelagia.mjs`: the hull is a table
 * (`grownBody`; its two orphan pole vertices carry the exporter's stand-in
 * normal in this frame rather than the export's, and nothing renders from
 * them), the lobes, rings, membranes, peduncle and buds the scout's
 * builders at the Harvester's numbers, and the Harvester's own vocabulary —
 * `cargoLobes`, `baleen`, `tendrils` — read off this file before any port
 * and extended here to take the file's frame; the tendrils are one rule
 * that reproduces all eighteen stations to the float. Nothing here is a
 * shape decision; where the export is odd the script is odd with it:
 *
 * - The `_port` parts sit at the export's +x, which is the kit's -z once the
 *   file is turned onto its length, and -z is port (#642) — except the two
 *   outer feed tendrils, which the export named the other way round: its
 *   `feed_tendril_port` hangs at x −0.46, to starboard, and its
 *   `feed_tendril_starboard` at x +0.52, to port. Neither crosses the keel.
 *   They are relabelled as #642 relabelled the eleven `bothSides` hulls:
 *   every buffer stays in the file's order and only the two names turn
 *   round, so the tendril that was `feed_tendril_port` is written
 *   `feed_tendril_starboard` and the other `feed_tendril_port`.
 * - `tail_fluke_lower` carries a reflection in its node, written as the file
 *   decomposes it.
 * - The export carries two `KHR_lights_punctual` point lights as its last
 *   two nodes, unnamed; they are kept (`glow`). No map can see them.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, hull axis at y = 0; built here metre-true at
 * 75 m along +X, centred on its length. `DRAWN` is the export's length as
 * intake measures it — three's `Box3` over the parts' own boxes — which
 * the raked tail flukes' boxes overhang astern: tip to tip the vertices
 * span 4.7026 units, the middle feed tendril's end forward to the upper
 * fluke's trailing tip, and the flukes' boxes make the measure 4.7903,
 * 1.9 % more. `DATUM` is 0.
 */
import { THREE, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 75;
const DRAWN = 4.7903;
const DATUM = 0;

const chitin = pelagia.fleetInk.chitinHull();
const ridge = pelagia.fleetInk.growthRidge();
const membrane = pelagia.fleetInk.algaeMembrane();
const light = pelagia.fleetInk.bioLight(0.9);

const root = new THREE.Group();
root.name = 'harvester';

/**
 * The hull's orb, radius 1, as the export left it: an 18 × 12 sphere pushed
 * out of round point by point, then squashed to 0.95 across, 0.72 tall and
 * 1.7 long by its node. The top pole, eleven rings from the top down at
 * φ = 0° to 340°, the bottom pole.
 */
const HULL = [
  // the top pole
  [0, 0.97826, 0],
  // ring 1
  [-0.25456, 0.95003, 0],
  [-0.24178, 0.97239, 0.0896],
  [-0.19701, 0.98218, 0.16804],
  [-0.12764, 0.982, 0.22563],
  [-0.04397, 0.97759, 0.25548],
  [0.04384, 0.97469, 0.25429],
  [0.12689, 0.97626, 0.22266],
  [0.19665, 0.98037, 0.16469],
  [0.24386, 0.98074, 0.08744],
  [0.26016, 0.97093, 0],
  [0.24112, 0.94553, -0.08744],
  [0.1924, 0.9155, -0.16469],
  [0.12264, 0.88727, -0.22266],
  [0.04173, 0.86599, -0.25429],
  [-0.04125, 0.85604, -0.25548],
  [-0.11902, 0.86109, -0.22563],
  [-0.18538, 0.88206, -0.16804],
  [-0.23327, 0.91473, -0.0896],
  // ring 2
  [-0.50656, 0.87739, 0],
  [-0.48326, 0.91207, 0.17509],
  [-0.38704, 0.91172, 0.32789],
  [-0.24487, 0.89212, 0.43902],
  [-0.08246, 0.8682, 0.49486],
  [0.08105, 0.85334, 0.48995],
  [0.23644, 0.86143, 0.42701],
  [0.37821, 0.89092, 0.31489],
  [0.48628, 0.91778, 0.16693],
  [0.52746, 0.91359, 0],
  [0.48277, 0.86854, -0.16693],
  [0.37724, 0.81727, -0.31489],
  [0.23571, 0.77428, -0.42701],
  [0.07835, 0.73816, -0.48995],
  [-0.07549, 0.71121, -0.49486],
  [-0.21569, 0.70852, -0.43902],
  [-0.3425, 0.74202, -0.32789],
  [-0.44833, 0.80658, -0.17509],
  // ring 3
  [-0.7401, 0.7401, 0],
  [-0.69854, 0.76783, 0.25013],
  [-0.54645, 0.75131, 0.46834],
  [-0.34261, 0.72612, 0.62607],
  [-0.11471, 0.70002, 0.70232],
  [0.1105, 0.67436, 0.69041],
  [0.3231, 0.68478, 0.59868],
  [0.53447, 0.73484, 0.4407],
  [0.71279, 0.78349, 0.23356],
  [0.7819, 0.7819, 0],
  [0.70195, 0.72242, -0.23356],
  [0.54222, 0.67015, -0.4407],
  [0.34173, 0.64267, -0.59868],
  [0.11341, 0.61411, -0.69041],
  [-0.10569, 0.57232, -0.70232],
  [-0.29579, 0.55627, -0.62607],
  [-0.47516, 0.58727, -0.46834],
  [-0.64012, 0.65879, -0.25013],
  // ring 4
  [-0.92108, 0.53179, 0],
  [-0.8475, 0.54109, 0.30882],
  [-0.64539, 0.5148, 0.5789],
  [-0.40854, 0.49931, 0.77455],
  [-0.14136, 0.49507, 0.86515],
  [0.13353, 0.46765, 0.84059],
  [0.39589, 0.48384, 0.72545],
  [0.66834, 0.53311, 0.53444],
  [0.90175, 0.57573, 0.28358],
  [0.98379, 0.56799, 0],
  [0.85848, 0.50681, -0.28358],
  [0.65767, 0.46675, -0.53444],
  [0.42592, 0.46307, -0.72545],
  [0.1457, 0.45858, -0.84059],
  [-0.13062, 0.41114, -0.86515],
  [-0.36586, 0.39778, -0.77455],
  [-0.59203, 0.42016, -0.5789],
  [-0.79679, 0.47039, -0.30882],
  // ring 5
  [-1.01918, 0.27309, 0],
  [-0.91286, 0.27142, 0.34625],
  [-0.67781, 0.25127, 0.65019],
  [-0.42729, 0.24143, 0.87338],
  [-0.15696, 0.2532, 0.97712],
  [0.14892, 0.24023, 0.92538],
  [0.46743, 0.26412, 0.79965],
  [0.77348, 0.28673, 0.59158],
  [1.0233, 0.30426, 0.31448],
  [1.09719, 0.29399, 0],
  [0.93149, 0.25426, -0.31448],
  [0.70775, 0.23275, -0.59158],
  [0.46375, 0.23501, -0.79965],
  [0.16803, 0.2475, -0.92538],
  [-0.14473, 0.21318, -0.97712],
  [-0.43271, 0.21928, -0.87338],
  [-0.68663, 0.22581, -0.65019],
  [-0.89597, 0.24456, -0.34625],
  // ring 6
  [-1.02949, 0, 0],
  [-0.91457, 0, 0.35912],
  [-0.6795, 0, 0.67493],
  [-0.42962, 0, 0.90933],
  [-0.15004, 0, 1.03405],
  [0.18056, 0, 0.93557],
  [0.52077, 0, 0.82272],
  [0.81705, 0, 0.61065],
  [1.05251, 0, 0.32492],
  [1.1131, 0, 0],
  [0.93641, 0, -0.32492],
  [0.71697, 0, -0.61065],
  [0.47495, 0, -0.82272],
  [0.16887, 0, -0.93557],
  [-0.17036, 0, -1.03405],
  [-0.4825, 0, -0.90933],
  [-0.72643, 0, -0.67493],
  [-0.91723, 0, -0.35912],
  // ring 7
  [-1.01713, -0.27254, 0],
  [-0.89923, -0.26737, 0.34625],
  [-0.68298, -0.25318, 0.65019],
  [-0.45285, -0.25587, 0.87338],
  [-0.17018, -0.27453, 0.97712],
  [0.16214, -0.26155, 0.92538],
  [0.49299, -0.27856, 0.79965],
  [0.77865, -0.28865, 0.59158],
  [1.00966, -0.30021, 0.31448],
  [1.09514, -0.29344, 0],
  [0.95347, -0.26026, -0.31448],
  [0.74265, -0.24423, -0.59158],
  [0.50439, -0.2556, -0.79965],
  [0.18708, -0.27556, -0.92538],
  [-0.16378, -0.24124, -0.97712],
  [-0.47335, -0.23988, -0.87338],
  [-0.72153, -0.23729, -0.65019],
  [-0.91795, -0.25056, -0.34625],
  // ring 8
  [-0.94924, -0.54804, 0],
  [-0.85185, -0.54387, 0.30882],
  [-0.66263, -0.52855, 0.5789],
  [-0.43771, -0.53495, 0.77455],
  [-0.15303, -0.53594, 0.86515],
  [0.1452, -0.50852, 0.84059],
  [0.42505, -0.51948, 0.72545],
  [0.68558, -0.54686, 0.53444],
  [0.90609, -0.5785, 0.28358],
  [1.01194, -0.58424, 0],
  [0.92094, -0.54367, -0.28358],
  [0.72906, -0.51741, -0.53444],
  [0.48395, -0.52617, -0.72545],
  [0.16633, -0.52352, -0.84059],
  [-0.15125, -0.47607, -0.86515],
  [-0.4239, -0.46088, -0.77455],
  [-0.66342, -0.47083, -0.5789],
  [-0.85924, -0.50725, -0.30882],
  // ring 9
  [-0.82261, -0.82261, 0],
  [-0.75056, -0.82501, 0.25013],
  [-0.58914, -0.81, 0.46834],
  [-0.37793, -0.80098, 0.62607],
  [-0.12839, -0.78352, 0.70232],
  [0.12419, -0.75787, 0.69041],
  [0.35842, -0.75964, 0.59868],
  [0.57716, -0.79353, 0.4407],
  [0.76481, -0.84068, 0.23356],
  [0.86441, -0.86441, 0],
  [0.8126, -0.8363, -0.23356],
  [0.64896, -0.80207, -0.4407],
  [0.41617, -0.78266, -0.59868],
  [0.13949, -0.75533, -0.69041],
  [-0.13177, -0.71355, -0.70232],
  [-0.37023, -0.69626, -0.62607],
  [-0.5819, -0.71919, -0.46834],
  [-0.75077, -0.77266, -0.25013],
  // ring 10
  [-0.62132, -1.07615, 0],
  [-0.57289, -1.08124, 0.17509],
  [-0.45308, -1.06727, 0.32789],
  [-0.28762, -1.04788, 0.43902],
  [-0.09756, -1.02715, 0.49486],
  [0.09615, -1.01229, 0.48995],
  [0.2792, -1.01719, 0.42701],
  [0.44425, -1.04647, 0.31489],
  [0.57592, -1.08695, 0.16693],
  [0.64222, -1.11235, 0],
  [0.61084, -1.09895, -0.16693],
  [0.49286, -1.06776, -0.31489],
  [0.31446, -1.03298, -0.42701],
  [0.10603, -0.99888, -0.48995],
  [-0.10317, -0.97193, -0.49486],
  [-0.29444, -0.96722, -0.43902],
  [-0.45812, -0.9925, -0.32789],
  [-0.5764, -1.03699, -0.17509],
  // ring 11
  [-0.33912, -1.2656, 0],
  [-0.31529, -1.26802, 0.0896],
  [-0.2532, -1.26235, 0.16804],
  [-0.16284, -1.25285, 0.22563],
  [-0.05597, -1.24442, 0.25548],
  [0.05584, -1.24153, 0.25429],
  [0.1621, -1.24712, 0.22266],
  [0.25284, -1.26054, 0.16469],
  [0.31736, -1.27638, 0.08744],
  [0.34472, -1.2865, 0],
  [0.32671, -1.28113, -0.08744],
  [0.26626, -1.26693, -0.16469],
  [0.17258, -1.24857, -0.22266],
  [0.05936, -1.23175, -0.25429],
  [-0.05888, -1.2218, -0.25548],
  [-0.16896, -1.22239, -0.22563],
  [-0.25923, -1.23349, -0.16804],
  [-0.31886, -1.25033, -0.0896],
  // the bottom pole
  [0, -1.34327, 0],
];

// The body, and the two cargo lobes slung under its flanks — the port one
// the larger and lower, rolled 0.3 outboard; the starboard one rolled 0.24
// the other way. Ten by seven, as the file draws them.
pelagia.grownBody(root, chitin, {
  name: 'hull',
  facets: [18, 12],
  buffer: HULL,
  ...drawn([0, 0, 0], [0, 0, 0], [0.95, 0.72, 1.7]),
});
pelagia.cargoLobes(root, chitin, {
  facets: [10, 7],
  lobes: [
    { side: 'port', ...drawn([0.62, -0.28, -0.35], [0, 0, 0.3], [0.42, 0.34, 0.85]) },
    { side: 'starboard', ...drawn([-0.6, -0.3, -0.15], [0, 0, -0.24], [0.32, 0.26, 0.7]) },
  ],
});

// Five growth rings on the hull's own profile — 0.95 across and 0.72 tall
// on a length of 1.7 — 7 % proud of it across and 14 % over, each 1.6 deep
// along the keel, each leaned its own way off square and each tube its own
// thickness, by the scout's own wobble.
const profile = (z) => Math.sqrt(1 - (z / 1.7) ** 2);
const ring = (tube, at, lean) => ({
  tube,
  ...drawn(at, [...lean, 0], [0.95 * 1.07 * profile(at[2]), 0.72 * 1.14 * profile(at[2]), 1.6]),
});
pelagia.grownRings(root, ridge, {
  facets: [5, 22],
  rings: [
    ring(0.09104, [0, -0.03, -1.25], [0.05753, 0.08]),
    ring(0.07104, [0.0171, -0.03, -0.7], [0.09702, -0.0533]),
    ring(0.04791, [-0.03091, -0.03, -0.15], [-0.08253, -0.00897]),
    ring(0.09126, [0.0388, -0.03, 0.45], [-0.07575, 0.06526]),
    ring(0.07062, [-0.03924, -0.03, 1], [0.10205, -0.07799]),
  ],
});

// "External intake dredge gear": the scoop under the jaw, a crescent 1.24
// across extruded 0.55 forward; seven baleen plates raked 0.35 across its
// mouth, the middle one the tallest and each rolled 0.045 further than the
// last; and three feed tendrils hanging from it, exported in the file's
// order — the starboard one first, then the middle, then the port — under
// their right names (see the header).
pelagia.intakeScoop(root, ridge, {
  halfWidth: 0.62,
  outer: 0.34,
  inner: 0.12,
  depth: 0.55,
  ...drawn([0, -0.32, 1.15]),
});
pelagia.baleen(root, ridge, {
  rank: {
    count: 7,
    pitch: 0.15,
    at: [0, -0.28, 1.5],
    t: 0.045,
    h: 0.3,
    taper: 0.015,
    d: 0.34,
    rake: -0.35,
    splay: 0.045,
  },
});
pelagia.tendrils(root, ridge, {
  tendrils: [
    { name: 'starboard', x: -0.5, droop: 0.45, phase: 0.4, length: 0.495 },
    { name: 'mid', x: 0.05, droop: 0.55, phase: 1.9, length: 0.605 },
    { name: 'port', x: 0.52, droop: 0.4, phase: 3.1, length: 0.44 },
  ],
});

// The membranes: the dorsal blade standing on the back, and the two
// paddles, each its own size, raked forward and down off the belly — the
// starboard one's node written as the file decomposes it.
pelagia.membranes(root, membrane, {
  thickness: 0.035,
  fins: [
    {
      name: 'dorsal_blade',
      span: 0.9,
      depth: 0.4,
      ...drawn([0.03, 0.62, 0.35], [0.2, Math.PI / 2, 0]),
    },
    {
      name: 'paddle_port',
      span: 1.15,
      depth: 0.5,
      ...drawn([0.85, -0.2, 0.35], [-1.3, 0.7, -0.15]),
    },
    {
      name: 'paddle_starboard',
      span: 0.95,
      depth: 0.42,
      ...drawn([-0.82, -0.26, 0.25], [Math.PI - 1.75, 0.7, 0.15 - Math.PI]),
    },
  ],
});

// The tail: a peduncle leaned 0.1 off the keel line, and the two flukes
// standing off it — the lower one carrying its reflection in its node.
pelagia.stalk(root, chitin, {
  radii: [0.16, 0.3],
  length: 0.75,
  ...drawn([0.02, 0, -1.85], [Math.PI / 2 + 0.1, 0, 0]),
});
pelagia.membranes(root, membrane, {
  thickness: 0.035,
  fins: [
    {
      name: 'tail_fluke_upper',
      span: 0.75,
      depth: 0.34,
      ...drawn([0, 0.04, -2.15], [0.5, Math.PI / 2, 0]),
    },
    {
      name: 'tail_fluke_lower',
      span: 0.6,
      depth: 0.3,
      ...drawn([0.02, -0.02, -2.17], [Math.PI - 0.5, Math.PI / 2, 0], [-1, 1, 1]),
    },
  ],
});

// "Dim at rest": a bud on the brow, one on each flank at different heights,
// one under the port cargo lobe where the hold is worked, one at the tail.
pelagia.lightBuds(root, light, {
  buds: [
    ['brow_light', 0.05, drawn([0, 0.55, 1.35])],
    ['flank_light_port', 0.04, drawn([0.9, 0.15, 0.1])],
    ['flank_light_starboard', 0.04, drawn([-0.85, 0.1, 0.05])],
    ['cargo_light', 0.04, drawn([0.6, -0.5, -0.7])],
    ['tail_light', 0.035, drawn([0, 0.1, -2.35])],
  ],
});

// The export's two point lights, unnamed, one forward and one aft.
pelagia.glow(root, { intensity: 0.9, range: 2.6, at: drawn([0, 0.5, 0.9]).at });
pelagia.glow(root, { intensity: 0.5, range: 2.2, at: drawn([0, 0.1, -1.9]).at });

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'harvester-pelagia.glb');
