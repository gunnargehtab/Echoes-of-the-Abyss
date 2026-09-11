/**
 * The Cruiser, the Commune's — 130 m (docs/units.md; the Cruiser block of
 * docs/asset-prompts-3d.md Block 3, read with the Pelagia FACTION block).
 *
 * "Heavy fleet anchor and command vessel (SIG 55 sustained with systems
 * live). Large layered hull, prominent sensor arrays and fixed hydrophone
 * masts; sustained glow from vents, sensor arrays and lit ports — this is a
 * loud ship and it looks it" — said the Commune's way: the Corvette's
 * swimming thing grown to a whale, and lit like one. A pod of a hull pushed
 * out of round as it grew; a keel lobe under the stern and a jaw pouch under
 * the bow; six growth rings leaned each its own way, every one with a lit
 * vein riding its crest; four lit veins the length of the flanks, two high
 * and two low, each waving its own way; four crests of ridge down the back;
 * three lit hydrophone frills at the bow, two to port and one to starboard;
 * two hydrophone masts raked aft off the back to a bud each; three seed
 * launchers rolled out from the flanks, two to port and one to starboard,
 * with five, four and five seeds; two pectorals of different sizes, a dorsal
 * blade, a peduncle and two tail flukes; and seven buds of biolight — bow,
 * two a flank, the crest, the tail — with three points of glow inside. Six
 * lit rings, four veins, three frills, two mast tips and seven buds: the
 * loudest resting light in the navy, and it is all veins.
 *
 * A port of the approved export (docs/concept-art/models/cruiser-pelagia.glb
 * at 3e15409), part for part in its order, every number the export's own,
 * read off its nodes and its buffers with tools/hull-models/parts.mjs.
 * Every part comes from `factions/pelagia.mjs`: the hull is a table
 * (`grownBody`; its two orphan pole vertices carry the exporter's stand-in
 * normal in this frame rather than the export's, and nothing renders from
 * them); the launchers, the veins and the masts are each one rule
 * recovered from the file — the seed rule reproduces all fourteen seed
 * nodes to the double, the vein rule all eighty-four stations and the mast
 * rule all fourteen to the float — and the rest the scout's builders at the
 * Cruiser's numbers. Nothing here is a shape decision; where the export is
 * odd the script is odd with it:
 *
 * - The `_port` parts sit at the export's +x, which is the kit's -z once the
 *   file is turned onto its length, and -z is port (#642), so the names are
 *   right and stay.
 * - `tail_fluke_lower` carries a reflection in its node, written as the file
 *   decomposes it; the starboard frill's and pectoral's nodes are written as
 *   the file decomposes them.
 * - The export carries three `KHR_lights_punctual` point lights as its last
 *   three nodes, unnamed; they are kept (`glow`). No map can see them.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, hull axis at y = 0; built here metre-true at
 * 130 m along +X, centred on its length. `DRAWN` is the export's length as
 * intake measures it — three's `Box3` over the parts' own boxes — which
 * the raked tail flukes' boxes overhang astern: tip to tip the vertices
 * span 7.4193 units, the bow light to the upper fluke's trailing tip, and
 * the flukes' boxes make the measure 7.5452, 1.7 % more. `DATUM` is 0.
 */
import { THREE, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 130;
const DRAWN = 7.5452;
const DATUM = 0;

const chitin = pelagia.fleetInk.chitinHull();
const ridge = pelagia.fleetInk.growthRidge();
const spore = pelagia.fleetInk.sporePod();
const membrane = pelagia.fleetInk.algaeMembrane();
const light = pelagia.fleetInk.bioLight(1.6);
const vein = pelagia.fleetInk.bioVeinLit();
const frill = pelagia.fleetInk.sensorFrillLit();

const root = new THREE.Group();
root.name = 'cruiser';

/** The hull's scale by its node: 1.05 across, 0.85 tall, 2.9 long. */
const HULL_SCALE = [1.05, 0.85, 2.9];

/**
 * The hull's orb, radius 1, as the export left it: a 20 × 13 sphere pushed
 * out of round point by point, then squashed to the scale above by its
 * node. The top pole, twelve rings from the top down at φ = 0° to 342°, the
 * bottom pole.
 */
const HULL = [
  // the top pole
  [0, 0.99483, 0],
  // ring 1
  [-0.23122, 0.9696, 0],
  [-0.22496, 1.0002, 0.07463],
  [-0.19366, 1.01908, 0.14177],
  [-0.14124, 1.02779, 0.19472],
  [-0.07421, 1.02998, 0.22829],
  [0, 1.029, 0.23932],
  [0.07401, 1.02725, 0.22691],
  [0.14091, 1.02544, 0.1925],
  [0.19413, 1.02153, 0.13957],
  [0.22738, 1.01095, 0.07328],
  [0.23601, 0.98968, 0],
  [0.21903, 0.95691, -0.07328],
  [0.18117, 0.92233, -0.13957],
  [0.12821, 0.89194, -0.1925],
  [0.066, 0.8692, -0.22691],
  [0, 0.85596, -0.23932],
  [-0.06486, 0.85424, -0.22829],
  [-0.12452, 0.86623, -0.19472],
  [-0.1753, 0.89246, -0.14177],
  [-0.21276, 0.92952, -0.07463],
  // ring 2
  [-0.46072, 0.90729, 0],
  [-0.45492, 0.95659, 0.14617],
  [-0.39004, 0.97424, 0.27743],
  [-0.28269, 0.97728, 0.3804],
  [-0.14782, 0.9741, 0.44481],
  [0, 0.96502, 0.46472],
  [0.14498, 0.95541, 0.43915],
  [0.27605, 0.95431, 0.37154],
  [0.38575, 0.96353, 0.26889],
  [0.46032, 0.96792, 0.14104],
  [0.47878, 0.94285, 0],
  [0.43568, 0.88575, -0.14104],
  [0.35428, 0.83168, -0.26889],
  [0.24951, 0.79468, -0.37154],
  [0.12792, 0.76802, -0.43915],
  [0, 0.74434, -0.46472],
  [-0.12124, 0.72791, -0.44481],
  [-0.2294, 0.73064, -0.3804],
  [-0.32542, 0.76393, -0.27743],
  [-0.40807, 0.82961, -0.14617],
  // ring 3
  [-0.67817, 0.79118, 0],
  [-0.66956, 0.83858, 0.2102],
  [-0.56842, 0.84625, 0.39886],
  [-0.41594, 0.85467, 0.54639],
  [-0.22027, 0.85988, 0.63733],
  [0, 0.84586, 0.66312],
  [0.21144, 0.82543, 0.62401],
  [0.39921, 0.82029, 0.52657],
  [0.56142, 0.83583, 0.38069],
  [0.68391, 0.85655, 0.19963],
  [0.71493, 0.83407, 0],
  [0.63869, 0.76282, -0.19963],
  [0.52172, 0.71386, -0.38069],
  [0.37833, 0.69897, -0.52657],
  [0.19725, 0.6857, -0.62401],
  [0, 0.65527, -0.66312],
  [-0.17938, 0.62357, -0.63733],
  [-0.3315, 0.61244, -0.54639],
  [-0.46246, 0.63277, -0.39886],
  [-0.5851, 0.6988, -0.2102],
  // ring 4
  [-0.85833, 0.61235, 0],
  [-0.83337, 0.64066, 0.26255],
  [-0.69541, 0.63463, 0.49846],
  [-0.51686, 0.64801, 0.68307],
  [-0.28088, 0.66605, 0.7955],
  [0, 0.65307, 0.82298],
  [0.26565, 0.62994, 0.76991],
  [0.50456, 0.63259, 0.64854],
  [0.71122, 0.64906, 0.46902],
  [0.87569, 0.67319, 0.24608],
  [0.91496, 0.65274, 0],
  [0.80014, 0.58037, -0.24608],
  [0.66286, 0.54771, -0.46902],
  [0.49765, 0.55417, -0.64854],
  [0.2646, 0.55483, -0.76991],
  [0, 0.5212, -0.82298],
  [-0.23199, 0.48646, -0.7955],
  [-0.43291, 0.48208, -0.68307],
  [-0.59397, 0.49079, -0.49846],
  [-0.73654, 0.53424, -0.26255],
  // ring 5
  [-0.97432, 0.38191, 0],
  [-0.92026, 0.3896, 0.29967],
  [-0.74413, 0.37324, 0.56949],
  [-0.55327, 0.37957, 0.78187],
  [-0.31221, 0.40355, 0.91172],
  [0, 0.40619, 0.93502],
  [0.30186, 0.39017, 0.86678],
  [0.58394, 0.40061, 0.73102],
  [0.81739, 0.40998, 0.52968],
  [1.00784, 0.42668, 0.2782],
  [1.04741, 0.41056, 0],
  [0.89573, 0.35524, -0.2782],
  [0.74937, 0.33742, -0.52968],
  [0.57182, 0.34704, -0.73102],
  [0.31086, 0.35594, -0.86678],
  [0, 0.33242, -0.93502],
  [-0.26999, 0.30914, -0.91172],
  [-0.52527, 0.31879, -0.78187],
  [-0.70809, 0.31884, -0.56949],
  [-0.8452, 0.3352, -0.29967],
  // ring 6
  [-1.01445, 0.12731, 0],
  [-0.934, 0.12673, 0.31894],
  [-0.72592, 0.11654, 0.60658],
  [-0.52809, 0.11566, 0.83458],
  [-0.29348, 0.12084, 0.97927],
  [0, 0.13714, 0.99271],
  [0.33052, 0.13609, 0.90897],
  [0.62328, 0.13651, 0.77166],
  [0.85515, 0.13729, 0.56042],
  [1.05827, 0.1436, 0.29459],
  [1.09684, 0.13765, 0],
  [0.92436, 0.11708, -0.29459],
  [0.77849, 0.11178, -0.56042],
  [0.59413, 0.11505, -0.77166],
  [0.31916, 0.11678, -0.90897],
  [0, 0.11362, -0.99271],
  [-0.30846, 0.11286, -0.97927],
  [-0.59377, 0.11498, -0.83458],
  [-0.77492, 0.11127, -0.60658],
  [-0.89204, 0.11298, -0.31894],
  // ring 7
  [-0.98891, -0.12411, 0],
  [-0.9081, -0.12322, 0.31894],
  [-0.70088, -0.11252, 0.60658],
  [-0.51319, -0.1124, 0.83458],
  [-0.29073, -0.11971, 0.97927],
  [0, -0.12961, 0.99271],
  [0.32777, -0.13496, 0.90897],
  [0.60838, -0.13324, 0.77166],
  [0.83011, -0.13327, 0.56042],
  [1.03237, -0.14008, 0.29459],
  [1.0713, -0.13445, 0],
  [0.90475, -0.11459, -0.29459],
  [0.77149, -0.11078, -0.56042],
  [0.60011, -0.11621, -0.77166],
  [0.33237, -0.12161, -0.90897],
  [0, -0.12087, -0.99271],
  [-0.32166, -0.11769, -0.97927],
  [-0.59975, -0.11614, -0.83458],
  [-0.76792, -0.11026, -0.60658],
  [-0.87243, -0.1105, -0.31894],
  // ring 8
  [-0.9183, -0.35995, 0],
  [-0.86285, -0.36529, 0.29967],
  [-0.68661, -0.34439, 0.56949],
  [-0.51401, -0.35264, 0.78187],
  [-0.29618, -0.38282, 0.91172],
  [0, -0.37999, 0.93502],
  [0.28582, -0.36944, 0.86678],
  [0.54468, -0.37368, 0.73102],
  [0.75986, -0.38113, 0.52968],
  [0.95043, -0.40237, 0.2782],
  [0.99139, -0.3886, 0],
  [0.85395, -0.33867, -0.2782],
  [0.73681, -0.33176, -0.52968],
  [0.58618, -0.35576, -0.73102],
  [0.33054, -0.37847, -0.86678],
  [0, -0.35715, -0.93502],
  [-0.28967, -0.33167, -0.91172],
  [-0.53964, -0.32751, -0.78187],
  [-0.69553, -0.31318, -0.56949],
  [-0.80342, -0.31863, -0.29967],
  // ring 9
  [-0.81617, -0.58226, 0],
  [-0.78832, -0.60603, 0.26255],
  [-0.64606, -0.58959, 0.49846],
  [-0.47602, -0.5968, 0.68307],
  [-0.2606, -0.61797, 0.7955],
  [0, -0.6055, 0.82298],
  [0.24537, -0.58185, 0.76991],
  [0.46371, -0.58138, 0.64854],
  [0.66187, -0.60402, 0.46902],
  [0.83064, -0.63856, 0.24608],
  [0.87279, -0.62266, 0],
  [0.77276, -0.56051, -0.24608],
  [0.66344, -0.54819, -0.46902],
  [0.52023, -0.57931, -0.64854],
  [0.28582, -0.59934, -0.76991],
  [0, -0.57173, -0.82298],
  [-0.25322, -0.53097, -0.7955],
  [-0.45549, -0.50722, -0.68307],
  [-0.59456, -0.49127, -0.49846],
  [-0.70916, -0.51438, -0.26255],
  // ring 10
  [-0.68057, -0.79398, 0],
  [-0.6678, -0.83637, 0.2102],
  [-0.55917, -0.83248, 0.39886],
  [-0.40178, -0.82559, 0.54639],
  [-0.21075, -0.82272, 0.63733],
  [0, -0.80686, 0.66312],
  [0.20192, -0.78827, 0.62401],
  [0.38505, -0.7912, 0.52657],
  [0.55216, -0.82206, 0.38069],
  [0.68215, -0.85435, 0.19963],
  [0.71733, -0.83687, 0],
  [0.6502, -0.77656, -0.19963],
  [0.54733, -0.7489, -0.38069],
  [0.41097, -0.75927, -0.52657],
  [0.22027, -0.76575, -0.62401],
  [0, -0.74254, -0.66312],
  [-0.2024, -0.70362, -0.63733],
  [-0.36414, -0.67275, -0.54639],
  [-0.48806, -0.66781, -0.39886],
  [-0.5966, -0.71254, -0.2102],
  // ring 11
  [-0.49954, -0.98374, 0],
  [-0.48955, -1.02939, 0.14617],
  [-0.41665, -1.04073, 0.27743],
  [-0.29884, -1.0331, 0.3804],
  [-0.15482, -1.02026, 0.44481],
  [0, -1.00749, 0.46472],
  [0.15199, -1.00157, 0.43915],
  [0.2922, -1.01014, 0.37154],
  [0.41237, -1.03002, 0.26889],
  [0.49494, -1.04072, 0.14104],
  [0.5176, -1.0193, 0],
  [0.47697, -0.96968, -0.14104],
  [0.39585, -0.92926, -0.26889],
  [0.28524, -0.90847, -0.37154],
  [0.14902, -0.89473, -0.43915],
  [0, -0.87592, -0.46472],
  [-0.14234, -0.85462, -0.44481],
  [-0.26513, -0.84443, -0.3804],
  [-0.36699, -0.86151, -0.27743],
  [-0.44935, -0.91354, -0.14617],
  // ring 12
  [-0.2679, -1.12337, 0],
  [-0.25913, -1.15213, 0.07463],
  [-0.22222, -1.16936, 0.14177],
  [-0.16161, -1.17604, 0.19472],
  [-0.08475, -1.17632, 0.22829],
  [0, -1.17456, 0.23932],
  [0.08456, -1.1736, 0.22691],
  [0.16129, -1.17369, 0.1925],
  [0.22269, -1.1718, 0.13957],
  [0.26155, -1.16288, 0.07328],
  [0.27268, -1.14345, 0],
  [0.25492, -1.11371, -0.07328],
  [0.21284, -1.08358, -0.13957],
  [0.15211, -1.05818, -0.1925],
  [0.07892, -1.03938, -0.22691],
  [0, -1.02764, -0.23932],
  [-0.07778, -1.02443, -0.22829],
  [-0.14841, -1.03247, -0.19472],
  [-0.20697, -1.05372, -0.14177],
  [-0.24865, -1.08632, -0.07463],
  // the bottom pole
  [0, -1.18162, 0],
];

// The body, the keel lobe slung under the stern and rolled 0.18, and the
// jaw pouch under the bow.
pelagia.grownBody(root, chitin, {
  name: 'hull',
  facets: [20, 13],
  buffer: HULL,
  ...drawn([0, 0, 0], [0, 0, 0], HULL_SCALE),
});
pelagia.lobe(root, chitin, {
  name: 'keel_lobe',
  facets: [10, 7],
  ...drawn([0.15, -0.5, -0.4], [0, 0, 0.18], [0.5, 0.4, 1.3]),
});
pelagia.lobe(root, chitin, {
  name: 'jaw_pouch',
  facets: [9, 6],
  ...drawn([-0.06, -0.42, 1.6], [0, 0, 0], [0.42, 0.3, 0.8]),
});

// Six growth rings on the hull's own profile — 6 % proud of it across and
// 12 % over, each 1.7 deep along the keel, each leaned its own way off
// square and each tube its own thickness, by the scout's own wobble — and a
// lit vein riding every one, 10 % and 17 % proud, a shade wider than the
// ridge it lights. "Sustained glow from vents": the rings are the vents.
const profile = (z) => Math.sqrt(1 - (z / 2.9) ** 2);
const ring = (tube, at, lean) => {
  const p = profile(at[2]);
  return {
    tube,
    vein: drawn([0, 0, 0], [0, 0, 0], [1.05 * 1.1 * p, 0.85 * 1.17 * p, 1.7]).scale,
    ...drawn(at, [...lean, 0], [1.05 * 1.06 * p, 0.85 * 1.12 * p, 1.7]),
  };
};
pelagia.grownRings(root, ridge, {
  facets: [5, 24],
  lit: { mat: vein, tube: 0.022, facets: [5, 26] },
  rings: [
    ring(0.10104, [0, -0.03, -2.1], [0.04794, 0.07]),
    ring(0.08104, [0.02137, -0.03, -1.4], [0.08085, -0.04664]),
    ring(0.05791, [-0.03864, -0.03, -0.7], [-0.06878, -0.00785]),
    ring(0.10126, [0.04849, -0.03, 0.05], [-0.06313, 0.0571]),
    ring(0.08062, [-0.04905, -0.03, 0.8], [0.08504, -0.06824]),
    ring(0.05811, [0.04019, -0.03, 1.55], [0.04121, 0.03383]),
  ],
});

// Four veins the length of the flanks, on the hull's own ellipsoid a tenth
// proud of it: the dorsal pair high on the back, the flank pair low along
// the sides, each from its own stern station to its own bow station and
// each waving its own way.
pelagia.hullVeins(root, vein, {
  hull: HULL_SCALE,
  veins: [
    { name: 'vein_dorsal_port', from: -0.85, to: 0.9, base: 1.2, phase: 0 },
    { name: 'vein_dorsal_starboard', from: -0.8, to: 0.85, base: 1.95, phase: 1.2 },
    { name: 'vein_flank_port', from: -0.75, to: 0.88, base: 0.3, phase: 2.2 },
    { name: 'vein_flank_starboard', from: -0.7, to: 0.8, base: 2.85, phase: 3.3 },
  ],
});

// Four crests of ridge down the back, each smaller than the last from the
// stern forward, all pitched 0.3, each a hundredth or two off the keel
// line its own way; and "prominent sensor arrays": three lit hydrophone
// frills at the bow, two to port and one to starboard, each its own size
// and each hung at its own angle.
pelagia.membranes(root, ridge, {
  thickness: 0.045,
  fins: [
    {
      name: 'dorsal_crest_1',
      span: 0.55,
      depth: 0.24,
      ...drawn([0, 0.78, -0.9], [0.3, Math.PI / 2, 0]),
    },
    {
      name: 'dorsal_crest_2',
      span: 0.49,
      depth: 0.22,
      ...drawn([0.01726, 0.75, -0.35], [0.3, Math.PI / 2, 0]),
    },
    {
      name: 'dorsal_crest_3',
      span: 0.43,
      depth: 0.2,
      ...drawn([-0.01743, 0.72, 0.2], [0.3, Math.PI / 2, 0]),
    },
    {
      name: 'dorsal_crest_4',
      span: 0.37,
      depth: 0.18,
      ...drawn([0.00034, 0.69, 0.75], [0.3, Math.PI / 2, 0]),
    },
  ],
});
pelagia.membranes(root, frill, {
  thickness: 0.02,
  fins: [
    {
      name: 'hydrophone_frill_port_1',
      span: 0.5,
      depth: 0.2,
      ...drawn([0.55, 0.55, 1.3], [0.2, 0.9, 0.5]),
    },
    {
      name: 'hydrophone_frill_port_2',
      span: 0.42,
      depth: 0.17,
      ...drawn([0.62, 0.4, 1.05], [0.2, 0.8, 0.2]),
    },
    {
      name: 'hydrophone_frill_starboard',
      span: 0.4,
      depth: 0.16,
      ...drawn([-0.5, 0.5, 1.2], [0.2 - Math.PI, 0.9, Math.PI - 0.45]),
    },
  ],
});

// "Fixed hydrophone masts": two, raked aft off the back from the bow, the
// port one the longer, each swaying its own way to a lit bud at its tip.
pelagia.hydrophoneMasts(
  root,
  { mast: ridge, tip: light },
  {
    masts: [
      { name: 'antenna_port', x: 0.2, phase: 0.6, y: 0.7, from: 1.5, to: -1.1 },
      { name: 'antenna_starboard', x: -0.18, phase: -0.8, y: 0.72, from: 1.5, to: -0.7 },
    ],
  }
);

// Three seed launchers, each a frame rolled out from the flank — the
// forward port one 0.6 rad, the after port one a full radian, the starboard
// one 0.75 the other way — in the export's order.
pelagia.seedLauncher(
  root,
  { sheath: ridge, seed: spore },
  {
    name: 'launcher_port_fwd',
    length: 0.9,
    seeds: 5,
    ...drawn([0.98, 0.15, 0.35], [0, 0, -0.6]),
  }
);
pelagia.seedLauncher(
  root,
  { sheath: ridge, seed: spore },
  {
    name: 'launcher_port_aft',
    length: 0.75,
    seeds: 4,
    ...drawn([0.9, -0.15, -1.15], [0, 0, -1]),
  }
);
pelagia.seedLauncher(
  root,
  { sheath: ridge, seed: spore },
  {
    name: 'launcher_starboard',
    length: 0.85,
    seeds: 5,
    ...drawn([-0.98, 0, -0.3], [0, 0, 0.75]),
  }
);

// The membranes: two pectorals, each its own size, raked forward and down
// off the belly, and the dorsal blade standing on the back astern of the
// crests.
pelagia.membranes(root, membrane, {
  thickness: 0.035,
  fins: [
    {
      name: 'pectoral_port',
      span: 1.6,
      depth: 0.6,
      ...drawn([0.9, -0.35, 0.6], [-1.3, 0.65, -0.15]),
    },
    {
      name: 'pectoral_starboard',
      span: 1.3,
      depth: 0.5,
      ...drawn([-0.88, -0.42, 0.45], [Math.PI - 1.8, 0.65, 0.15 - Math.PI]),
    },
    {
      name: 'dorsal_blade',
      span: 1.1,
      depth: 0.42,
      ...drawn([0.03, 0.62, -1.1], [0.35, Math.PI / 2, 0]),
    },
  ],
});

// The tail: an eight-sided peduncle leaned 0.08 off the keel line, and the
// two flukes standing off it — the lower one carrying its reflection.
pelagia.stalk(root, chitin, {
  radii: [0.22, 0.42],
  length: 1.1,
  facets: 8,
  ...drawn([0.02, 0, -3], [Math.PI / 2 + 0.08, 0, 0]),
});
pelagia.membranes(root, membrane, {
  thickness: 0.035,
  fins: [
    {
      name: 'tail_fluke_upper',
      span: 1.25,
      depth: 0.44,
      ...drawn([0, 0.06, -3.45], [0.55, Math.PI / 2, 0]),
    },
    {
      name: 'tail_fluke_lower',
      span: 1.0,
      depth: 0.38,
      ...drawn([0.02, -0.03, -3.47], [Math.PI - 0.55, Math.PI / 2, 0], [-1, 1, 1]),
    },
  ],
});

// "Lit ports": a bud at the bow, two down each flank at different heights,
// one on the crest, one at the tail.
pelagia.lightBuds(root, light, {
  buds: [
    ['bow_light', 0.06, drawn([0, 0.35, 2.95])],
    ['flank_light_port_fwd', 0.045, drawn([0.95, 0.3, 1])],
    ['flank_light_port_aft', 0.045, drawn([1, 0.2, -0.9])],
    ['flank_light_starboard_fwd', 0.045, drawn([-0.95, 0.25, 0.6])],
    ['flank_light_starboard_aft', 0.045, drawn([-0.9, 0.15, -1.2])],
    ['crest_light', 0.045, drawn([0.03, 0.95, -0.35])],
    ['tail_light', 0.04, drawn([0, 0.12, -3.75])],
  ],
});

// The export's three point lights, unnamed: forward high, aft low, and one
// to port amidships.
pelagia.glow(root, { intensity: 2, range: 4, at: drawn([0, 0.7, 1.2]).at });
pelagia.glow(root, { intensity: 1.2, range: 3.5, at: drawn([0, 0.2, -2.4]).at });
pelagia.glow(root, { intensity: 1, range: 3, at: drawn([0.6, -0.4, 0.2]).at });

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'cruiser-pelagia.glb');
