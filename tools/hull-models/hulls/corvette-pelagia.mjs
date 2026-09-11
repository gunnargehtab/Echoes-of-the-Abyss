/**
 * The Corvette, the Commune's — 80 m (docs/units.md; the Corvette block of
 * docs/asset-prompts-3d.md Block 3, read with the Pelagia FACTION block).
 *
 * "Small fast-attack skirmisher (SIG 28 cruise). Compact aggressive
 * silhouette, visible torpedo hardpoints; dim accent running lights along
 * the hull line" — said the Commune's way: the scout's swimming thing grown
 * to a fighter. A squashed pod of a hull pushed out of round as it grew; a
 * jaw lobe under the bow; three growth rings leaned each its own way; three
 * seed launchers rolled out from the flanks — two to port, one to starboard,
 * each a sheath of ridge with a row of pale seeds along its back, four, three
 * and four; a dorsal blade, two pectorals of different sizes raked forward
 * and down, a keel blade under the stern; a peduncle and two tail flukes;
 * and seven buds of biolight — one at the bow, three down the port hull
 * line, two down the starboard, one at the tail — with two points of glow
 * inside the hull behind them.
 *
 * A port of the approved export (docs/concept-art/models/corvette-pelagia.glb
 * at 3e15409), part for part in its order, every number the export's own,
 * read off its nodes and its buffers with tools/hull-models/parts.mjs.
 * Every part comes from `factions/pelagia.mjs`; the hull is a table
 * (`grownBody`, whose two orphan pole vertices carry the exporter's stand-in
 * normal in this frame rather than the export's — the one normal a
 * world-space comparison finds moved, and nothing renders from it), the launchers one rule that reproduces all eleven seed
 * nodes to the double (`seedLauncher`), and the rest the scout's builders
 * at the Corvette's numbers. Nothing here is a shape decision; where the
 * export is odd the script is odd with it:
 *
 * - The `_port` parts sit at the export's +x, which is the kit's -z once the
 *   file is turned onto its length, and -z is port (#642), so the names are
 *   right and stay. The starboard launcher is one, the port ones two.
 * - `keel_blade` and `tail_fluke_lower` carry a reflection in their nodes
 *   (a scale of -1 beside the rotation), written as the file decomposes it.
 * - The export carries two `KHR_lights_punctual` point lights as its last
 *   two nodes, unnamed; they are kept (`glow`), since the conn view loads
 *   them with the file. No map can see them.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, hull axis at y = 0; built here metre-true at
 * 80 m along +X, centred on its length. `DRAWN` is the export's length as
 * intake measures it — three's `Box3` over the parts' own boxes — which
 * the raked tail flukes' boxes overhang astern: tip to tip the vertices
 * span 5.5919 units, the bow light to the upper fluke's trailing tip, and
 * the flukes' boxes make the measure 5.6912, 1.8 % more. `DATUM` is 0.
 */
import { THREE, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 80;
const DRAWN = 5.6912;
const DATUM = 0;

const chitin = pelagia.fleetInk.chitinHull();
const ridge = pelagia.fleetInk.growthRidge();
const spore = pelagia.fleetInk.sporePod();
const membrane = pelagia.fleetInk.algaeMembrane();
const light = pelagia.fleetInk.bioLight(1.3);

const root = new THREE.Group();
root.name = 'corvette';

/**
 * The hull's orb, radius 1, as the export left it: a 16 × 11 sphere pushed
 * out of round point by point, then squashed to 0.42 across, 0.4 tall and
 * 2.15 long by its node. The top pole, ten rings from the top down at
 * φ = 0° to 337.5°, the bottom pole.
 */
const HULL = [
  // the top pole
  [0, 1.05422, 0],
  // ring 1
  [-0.28872, 1.02157, 0],
  [-0.26457, 1.03331, 0.10894],
  [-0.19791, 1.02407, 0.20083],
  [-0.10435, 1.00539, 0.26145],
  [0, 0.99162, 0.28173],
  [0.10305, 0.99288, 0.25912],
  [0.19518, 1.00996, 0.1976],
  [0.26406, 1.0313, 0.10669],
  [0.29365, 1.03903, 0],
  [0.27341, 1.02422, -0.10669],
  [0.20861, 1.00087, -0.1976],
  [0.11157, 0.97589, -0.25912],
  [0, 0.95681, -0.28173],
  [-0.10875, 0.95118, -0.26145],
  [-0.20081, 0.96345, -0.20083],
  [-0.26443, 0.99055, -0.10894],
  // ring 2
  [-0.57375, 0.92753, 0],
  [-0.51635, 0.93528, 0.21112],
  [-0.36866, 0.88802, 0.38862],
  [-0.18591, 0.83134, 0.50426],
  [0, 0.79236, 0.54064],
  [0.177, 0.79149, 0.49472],
  [0.35035, 0.84391, 0.37596],
  [0.50853, 0.92113, 0.20267],
  [0.59192, 0.95691, 0],
  [0.55416, 0.92818, -0.20267],
  [0.41901, 0.88269, -0.37596],
  [0.22014, 0.83753, -0.49472],
  [0, 0.79723, -0.54064],
  [-0.20431, 0.7773, -0.50426],
  [-0.3801, 0.80072, -0.38862],
  [-0.51452, 0.8618, -0.21112],
  // ring 3
  [-0.8289, 0.74622, 0],
  [-0.71619, 0.72952, 0.29765],
  [-0.48432, 0.65284, 0.54791],
  [-0.24009, 0.5944, 0.7095],
  [0, 0.55778, 0.75575],
  [0.22299, 0.55208, 0.68694],
  [0.46215, 0.62296, 0.52088],
  [0.71935, 0.73273, 0.28077],
  [0.86441, 0.77818, 0],
  [0.79804, 0.73096, -0.28077],
  [0.59416, 0.67711, -0.52088],
  [0.31259, 0.64361, -0.68694],
  [0, 0.60598, -0.75575],
  [-0.27806, 0.5725, -0.7095],
  [-0.52777, 0.60146, -0.54791],
  [-0.73798, 0.67595, -0.29765],
  // ring 4
  [-1.00724, 0.4779, 0],
  [-0.82374, 0.44461, 0.36058],
  [-0.52802, 0.37411, 0.66482],
  [-0.26288, 0.33814, 0.86198],
  [0, 0.32818, 0.90963],
  [0.25219, 0.32439, 0.8188],
  [0.54899, 0.38897, 0.62159],
  [0.88016, 0.47506, 0.33562],
  [1.05867, 0.50231, 0],
  [0.94868, 0.45217, -0.33562],
  [0.69128, 0.40853, -0.62159],
  [0.36972, 0.39742, -0.8188],
  [0, 0.38508, -0.90963],
  [-0.32859, 0.35321, -0.86198],
  [-0.64811, 0.38302, -0.66482],
  [-0.91383, 0.43556, -0.36058],
  // ring 5
  [-1.07723, 0.16091, 0],
  [-0.84936, 0.14465, 0.39376],
  [-0.53107, 0.11806, 0.72734],
  [-0.25705, 0.10302, 0.94872],
  [0, 0.10794, 0.98982],
  [0.28535, 0.11436, 0.88023],
  [0.61642, 0.13703, 0.67247],
  [0.9643, 0.16423, 0.36382],
  [1.13813, 0.17001, 0],
  [0.99951, 0.14902, -0.36382],
  [0.72352, 0.13375, -0.67247],
  [0.38279, 0.12945, -0.88023],
  [0, 0.13285, -0.98982],
  [-0.37528, 0.12691, -0.94872],
  [-0.73824, 0.13647, -0.72734],
  [-1.00789, 0.15027, -0.39376],
  // ring 6
  [-1.04714, -0.15642, 0],
  [-0.83594, -0.14237, 0.39376],
  [-0.54407, -0.12095, 0.72734],
  [-0.28021, -0.1123, 0.94872],
  [0, -0.10864, 0.98982],
  [0.30851, -0.12364, 0.88023],
  [0.62943, -0.13992, 0.67247],
  [0.95089, -0.16194, 0.36382],
  [1.10804, -0.16552, 0],
  [0.98542, -0.14692, -0.36382],
  [0.73876, -0.13657, -0.67247],
  [0.41272, -0.13957, -0.88023],
  [0, -0.13366, -0.98982],
  [-0.40522, -0.13703, -0.94872],
  [-0.75347, -0.13929, -0.72734],
  [-0.9938, -0.14816, -0.39376],
  // ring 7
  [-0.94956, -0.45054, 0],
  [-0.79865, -0.43107, 0.36058],
  [-0.5504, -0.38997, 0.66482],
  [-0.28563, -0.36742, 0.86198],
  [0, -0.33535, 0.90963],
  [0.27495, -0.35367, 0.8188],
  [0.57137, -0.40482, 0.62159],
  [0.85507, -0.46152, 0.33562],
  [1.00099, -0.47494, 0],
  [0.92252, -0.4397, -0.33562],
  [0.71689, -0.42367, -0.62159],
  [0.3981, -0.42793, -0.8188],
  [0, -0.39288, -0.90963],
  [-0.35698, -0.38372, -0.86198],
  [-0.67372, -0.39816, -0.66482],
  [-0.88768, -0.42309, -0.36058],
  // ring 8
  [-0.80409, -0.72388, 0],
  [-0.71231, -0.72556, 0.29765],
  [-0.50739, -0.68395, 0.54791],
  [-0.25697, -0.6362, 0.7095],
  [0, -0.59, 0.75575],
  [0.23988, -0.59388, 0.68694],
  [0.48523, -0.65407, 0.52088],
  [0.71546, -0.72877, 0.28077],
  [0.8396, -0.75585, 0],
  [0.79405, -0.7273, -0.28077],
  [0.61954, -0.70604, -0.52088],
  [0.33236, -0.68429, -0.68694],
  [0, -0.63813, -0.75575],
  [-0.29782, -0.61319, -0.7095],
  [-0.55315, -0.63038, -0.54791],
  [-0.73398, -0.67229, -0.29765],
  // ring 9
  [-0.60168, -0.97269, 0],
  [-0.54791, -0.99245, 0.21112],
  [-0.40094, -0.96578, 0.38862],
  [-0.20557, -0.91924, 0.50426],
  [0, -0.88077, 0.54064],
  [0.19666, -0.8794, 0.49472],
  [0.38263, -0.92167, 0.37596],
  [0.5401, -0.9783, 0.20267],
  [0.61985, -1.00206, 0],
  [0.58619, -0.98184, -0.20267],
  [0.45294, -0.95418, -0.37596],
  [0.24151, -0.91885, -0.49472],
  [0, -0.87954, -0.54064],
  [-0.22568, -0.85862, -0.50426],
  [-0.41403, -0.87221, -0.38862],
  [-0.54656, -0.91546, -0.21112],
  // ring 10
  [-0.32834, -1.16178, 0],
  [-0.30172, -1.17841, 0.10894],
  [-0.22724, -1.17583, 0.20083],
  [-0.12061, -1.16209, 0.26145],
  [0, -1.15, 0.28173],
  [0.11931, -1.14959, 0.25912],
  [0.22451, -1.16172, 0.1976],
  [0.30121, -1.1764, 0.10669],
  [0.33328, -1.17923, 0],
  [0.31072, -1.16396, -0.10669],
  [0.23834, -1.14354, -0.1976],
  [0.12822, -1.12152, -0.25912],
  [0, -1.10354, -0.28173],
  [-0.1254, -1.09681, -0.26145],
  [-0.23054, -1.10612, -0.20083],
  [-0.30173, -1.13029, -0.10894],
  // the bottom pole
  [0, -1.2395, 0],
];

// The body, and the jaw lobe slung under the bow, pitched 0.15 down.
pelagia.grownBody(root, chitin, {
  name: 'hull',
  facets: [16, 11],
  buffer: HULL,
  ...drawn([0, 0, 0], [0, 0, 0], [0.42, 0.4, 2.15]),
});
pelagia.lobe(root, chitin, {
  name: 'jaw_lobe',
  facets: [8, 6],
  ...drawn([0.03, -0.16, 1.7], [-0.15, 0, 0], [0.14, 0.1, 0.5]),
});

// Three growth rings on the hull's own profile — 0.42 across and 0.4 tall
// on a length of 2.15 — 8 % proud of it across and 14 % over, each 1.5
// deep along the keel, each leaned its own way off square and each tube
// its own thickness, by the scout's own wobble.
const profile = (z) => Math.sqrt(1 - (z / 2.15) ** 2);
const ring = (tube, at, lean) => ({
  tube,
  ...drawn(at, [...lean, 0], [0.42 * 1.08 * profile(at[2]), 0.4 * 1.14 * profile(at[2]), 1.5]),
});
pelagia.grownRings(root, ridge, {
  rings: [
    ring(0.05762, [0, -0.01, -1.35], [0.22, 0.07]),
    ring(0.04562, [0.01068, -0.01, -0.6], [0.29933, -0.04664]),
    ring(0.03175, [-0.01932, -0.01, 0.35], [0.19956, -0.00785]),
  ],
});

// "Visible torpedo hardpoints": three seed launchers, each a frame rolled
// out from the flank — the forward port one 0.5 rad, the after port one
// 0.9, the starboard one 0.7 the other way — in the export's order.
pelagia.seedLauncher(
  root,
  { sheath: ridge, seed: spore },
  {
    name: 'launcher_port_fwd',
    length: 0.575,
    seeds: 4,
    ...drawn([0.42, 0.12, 0.55], [0, 0, -0.5]),
  }
);
pelagia.seedLauncher(
  root,
  { sheath: ridge, seed: spore },
  {
    name: 'launcher_port_aft',
    length: 0.5,
    seeds: 3,
    ...drawn([0.4, -0.1, -0.55], [0, 0, -0.9]),
  }
);
pelagia.seedLauncher(
  root,
  { sheath: ridge, seed: spore },
  {
    name: 'launcher_starboard',
    length: 0.55,
    seeds: 4,
    ...drawn([-0.42, 0.02, 0.1], [0, 0, 0.7]),
  }
);

// The membranes: the dorsal blade standing on the back, the two pectorals,
// each its own size, raked forward and down off the belly, and the keel
// blade under the stern — the starboard pectoral's and the keel's nodes
// written as the file decomposes them.
pelagia.membranes(root, membrane, {
  thickness: 0.03,
  fins: [
    {
      name: 'dorsal_blade',
      span: 1.5,
      depth: 0.42,
      ...drawn([0.02, 0.3, 0.4], [0.45, Math.PI / 2, 0]),
    },
    {
      name: 'pectoral_port',
      span: 0.95,
      depth: 0.3,
      ...drawn([0.32, -0.1, 0.85], [-1.25, 0.85, -0.15]),
    },
    {
      name: 'pectoral_starboard',
      span: 0.7,
      depth: 0.24,
      ...drawn([-0.3, -0.14, 0.7], [Math.PI - 1.85, 0.85, 0.15 - Math.PI]),
    },
    {
      name: 'keel_blade',
      span: 0.6,
      depth: 0.22,
      ...drawn([0.02, -0.28, -0.9], [Math.PI - 0.4, Math.PI / 2, 0], [-1, 1, 1]),
    },
  ],
});

// The tail: a peduncle leaned 0.06 off the keel line, and the two flukes
// standing off it — the lower one carrying its reflection in its node.
pelagia.stalk(root, chitin, {
  radii: [0.08, 0.18],
  length: 0.9,
  ...drawn([0.01, 0.01, -2.25], [Math.PI / 2 + 0.06, 0, 0]),
});
pelagia.membranes(root, membrane, {
  thickness: 0.03,
  fins: [
    {
      name: 'tail_fluke_upper',
      span: 1.05,
      depth: 0.3,
      ...drawn([0, 0.04, -2.6], [0.65, Math.PI / 2, 0]),
    },
    {
      name: 'tail_fluke_lower',
      span: 0.85,
      depth: 0.26,
      ...drawn([0.02, -0.02, -2.62], [Math.PI - 0.6, Math.PI / 2, 0], [-1, 1, 1]),
    },
  ],
});

// "Dim accent running lights along the hull line": a bud at the bow, three
// down the port line and two down the starboard — no two answering each
// other across the keel — and one at the tail.
pelagia.lightBuds(root, light, {
  buds: [
    ['bow_light', 0.04, drawn([0.06, 0.08, 2.2])],
    ['hullline_port_1', 0.032, drawn([0.36, 0.16, 1.15])],
    ['hullline_port_2', 0.032, drawn([0.42, 0.14, 0])],
    ['hullline_port_3', 0.032, drawn([0.34, 0.1, -1.1])],
    ['hullline_starboard_1', 0.032, drawn([-0.34, 0.12, 0.9])],
    ['hullline_starboard_2', 0.032, drawn([-0.37, 0.08, -0.5])],
    ['tail_light', 0.03, drawn([0, 0.1, -2.85])],
  ],
});

// The export's two point lights, unnamed, one forward and one aft.
pelagia.glow(root, { intensity: 1.1, range: 2.4, at: drawn([0, 0.3, 1]).at });
pelagia.glow(root, { intensity: 0.6, range: 2, at: drawn([0, 0.15, -2.2]).at });

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'corvette-pelagia.glb');
