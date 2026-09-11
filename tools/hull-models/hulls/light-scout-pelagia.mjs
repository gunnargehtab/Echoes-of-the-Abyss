/**
 * The Light Scout, the Commune's — 60 m (docs/units.md; the Light Scout
 * block of docs/asset-prompts-3d.md Block 3, which pairs the kind with
 * Pelagia).
 *
 * "Tiny, very fast recon vessel, fragile and nearly silent (SIG 6 idle).
 * Sleek darting silhouette built for kelp and thermal-vein cover; nearly
 * black, navigation marks only." A swimming thing: a squashed pod of a hull,
 * wider than it is tall and grown a little lopsided; a ballast lobe under
 * the belly; four growth rings that lean as they grew; a feeler curling
 * forward off the brow to the one light at its tip; a dorsal blade, two
 * pectorals of different sizes raked forward and down, a peduncle and two
 * tail flukes; and five buds of biolight, which is the whole resting light
 * of the quietest hull in the roster.
 *
 * A port of the approved export (docs/concept-art/models/light-scout-pelagia.glb
 * at 3a303c9), part for part in its order, every number the export's own,
 * read off its nodes and its buffers. Every part comes from
 * `factions/pelagia.mjs`; the hull is the one part that is a table rather
 * than a construction, and `grownBody` says why. Nothing here is a shape
 * decision; where the export is odd the script is odd with it — the parts
 * named `_port` sit at the export's +x, which is the kit's -z once the file
 * is turned onto its length, and they stay there.
 *
 * THE SCALE DECISION, made here once for the six shared kinds (#588) and
 * followed by the Corvette, Cruiser, Abyssal Submersible, Harvester and
 * Chorister ports:
 *
 *   Build metre-true at the design length along +X, centred.
 *
 * The approved exports of the shared kinds are drawn along Z, off-centre,
 * at arbitrary scales — this one 5.30 units long for a 60 m hull, the
 * Order's 23.95, the Klaxon's 23.20, the Directorate's 28.22. Nothing
 * downstream ever read those units: the bake and the runtime both yaw a
 * Z-long file onto +X (x' = z, z' = -x), rescale its length to the model
 * table's `lengthM` and centre it on its bounding box (hull-intake's
 * page.html, rosterModels.ts), so a port that does the same three things in
 * the script moves nothing anyone can see — and it makes `lightAudit`
 * measure lamps in square metres instead of in the square of a unit nobody
 * chose. So:
 *
 * - Every part keeps the export's numbers: its primitive as the buffer holds
 *   it, and its node's translation, XYZ Euler and scale as the file carries
 *   them, passed through kit.mjs `drawn` — the one place the yaw lives — and
 *   `part`, which turns the primitive with it. A line audits against
 *   `parts.mjs`; a side comes from the file, never from a name.
 * - The root carries the one scale, `L / DRAWN`, and the one shift: the
 *   length centred on x = 0 and the export's hull datum brought to y = 0
 *   (kit.mjs `metreTrue`, which measures the built length and refuses a hull
 *   that does not match `DRAWN`). `diff.mjs` divides both out, so a correct
 *   port reads as "unchanged beyond the root scale and shift".
 * - `DRAWN` is the export's length *as intake and the runtime measure a
 *   length*: three's `Box3` over the parts' own boxes, which a rotated
 *   plate's box overhangs. Tip to tip this hull's vertices span 5.3033 units
 *   (the upper fluke's trailing tip to the feeler light); its raked flukes'
 *   boxes make the measure 5.3776, 1.4 % more. Scaling to the measure rather
 *   than the vertices is what leaves both consumers' own rescale at exactly
 *   1 and the maps where the approved export put them — the measure is
 *   homogeneous, so they would normalise either file to the same size, and
 *   the only thing the choice moves is intake's warning. `outlines.mjs` and
 *   `diff.mjs` measure vertices and normalise, and see no difference. The
 *   Order's and the Klaxon's scouts have no overhanging box at either end,
 *   so their `DRAWN` is their vertex extent; the Directorate's rostrum,
 *   yawed 0.04, overhangs its bow by 0.04 units. `DATUM` is the height the
 *   export drew its hull axis at: 0 here, 2.6 on the other three.
 */
import { THREE, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 60;
const DRAWN = 5.3776;
const DATUM = 0;

const chitin = pelagia.scoutInk.chitinHull();
const ridge = pelagia.scoutInk.growthRidge();
const membrane = pelagia.scoutInk.algaeMembrane();
const light = pelagia.scoutInk.bioLight();

const root = new THREE.Group();
root.name = 'light_scout';

/**
 * The hull's orb, radius 1, as the export left it: a 16 × 10 sphere pushed
 * out of round point by point (`grownBody` says what is known of the rule),
 * then squashed to 0.5 across, 0.34 tall and 1.8 long by its node. The top
 * pole, nine rings from the top down at φ = 0° to 337.5°, the bottom pole.
 */
const HULL = [
  // the top pole
  [0, 0.98811, 0],
  // ring 1
  [-0.30855, 0.94963, 0],
  [-0.28833, 0.98549, 0.1203],
  [-0.21709, 0.9883, 0.22144],
  [-0.1145, 0.97368, 0.28761],
  [0, 0.96034, 0.30902],
  [0.11304, 0.96125, 0.28338],
  [0.21473, 0.97755, 0.21557],
  [0.29036, 0.99241, 0.11622],
  [0.31878, 0.9811, 0],
  [0.28692, 0.93094, -0.11622],
  [0.21013, 0.87256, -0.21557],
  [0.10872, 0.82424, -0.28338],
  [0, 0.79399, -0.30902],
  [-0.10414, 0.78947, -0.28761],
  [-0.19729, 0.81924, -0.22144],
  [-0.27137, 0.88048, -0.1203],
  // ring 2
  [-0.61353, 0.84445, 0],
  [-0.56636, 0.88351, 0.23246],
  [-0.40713, 0.85069, 0.42702],
  [-0.20836, 0.80926, 0.55177],
  [0, 0.77366, 0.58779],
  [0.19656, 0.76345, 0.53431],
  [0.38838, 0.81152, 0.40423],
  [0.56845, 0.88677, 0.21741],
  [0.65052, 0.89536, 0],
  [0.56797, 0.80629, -0.21741],
  [0.4038, 0.72825, -0.40423],
  [0.20715, 0.68552, -0.53431],
  [0, 0.64184, -0.58779],
  [-0.18245, 0.60379, -0.55177],
  [-0.34438, 0.62109, -0.42702],
  [-0.50525, 0.71725, -0.23246],
  // ring 3
  [-0.8741, 0.63507, 0],
  [-0.77096, 0.64326, 0.3242],
  [-0.5353, 0.59399, 0.596],
  [-0.28644, 0.58152, 0.76833],
  [0, 0.56227, 0.80902],
  [0.26508, 0.53817, 0.72653],
  [0.52999, 0.5881, 0.54812],
  [0.81041, 0.67618, 0.295],
  [0.94418, 0.68599, 0],
  [0.78692, 0.5811, -0.295],
  [0.56241, 0.53166, -0.54812],
  [0.30648, 0.54152, -0.72653],
  [0, 0.51196, -0.80902],
  [-0.25423, 0.4492, -0.76833],
  [-0.47165, 0.44587, -0.596],
  [-0.70055, 0.51732, -0.3242],
  // ring 4
  [-1.02418, 0.33278, 0],
  [-0.85216, 0.32012, 0.38455],
  [-0.5747, 0.28418, 0.70916],
  [-0.32199, 0.28716, 0.91885],
  [0, 0.30262, 0.95106],
  [0.33066, 0.2949, 0.83847],
  [0.66223, 0.32747, 0.63583],
  [0.98088, 0.36847, 0.34335],
  [1.12104, 0.36425, 0],
  [0.8868, 0.29063, -0.34335],
  [0.63842, 0.27102, -0.63583],
  [0.3651, 0.29437, -0.83847],
  [0, 0.29372, -0.95106],
  [-0.31436, 0.25346, -0.91885],
  [-0.59509, 0.25263, -0.70916],
  [-0.83801, 0.27464, -0.38455],
  // ring 5, the waist
  [-1.03966, 0, 0],
  [-0.84717, 0, 0.40564],
  [-0.57782, 0, 0.74953],
  [-0.32378, 0, 0.97931],
  [0, 0, 1.04243],
  [0.40587, 0, 0.86845],
  [0.73838, 0, 0.66468],
  [1.0288, 0, 0.35972],
  [1.14674, 0, 0],
  [0.89041, 0, -0.35972],
  [0.65761, 0, -0.66468],
  [0.3804, 0, -0.86845],
  [0, 0, -0.94308],
  [-0.38054, 0, -0.97931],
  [-0.66673, 0, -0.74953],
  [-0.87418, 0, -0.40564],
  // ring 6
  [-0.95836, -0.31139, 0],
  [-0.81611, -0.30657, 0.38455],
  [-0.59295, -0.29321, 0.70916],
  [-0.3565, -0.31794, 0.91885],
  [0, -0.31236, 0.95106],
  [0.36517, -0.32568, 0.83847],
  [0.68048, -0.33649, 0.63583],
  [0.94483, -0.35493, 0.34335],
  [1.05521, -0.34286, 0],
  [0.85075, -0.27882, -0.34335],
  [0.65667, -0.27877, -0.63583],
  [0.39961, -0.3222, -0.83847],
  [0, -0.30277, -0.95106],
  [-0.34887, -0.28128, -0.91885],
  [-0.61334, -0.26037, -0.70916],
  [-0.80196, -0.26283, -0.38455],
  // ring 7
  [-0.82466, -0.59915, 0],
  [-0.74925, -0.62514, 0.3242],
  [-0.55798, -0.61916, 0.596],
  [-0.31082, -0.63103, 0.76833],
  [0, -0.603, 0.80902],
  [0.28947, -0.58769, 0.72653],
  [0.55267, -0.61327, 0.54812],
  [0.7887, -0.65806, 0.295],
  [0.89474, -0.65007, 0],
  [0.76521, -0.56506, -0.295],
  [0.58509, -0.5531, -0.54812],
  [0.33087, -0.58461, -0.72653],
  [0, -0.54798, -0.80902],
  [-0.27862, -0.49229, -0.76833],
  [-0.49433, -0.46731, -0.596],
  [-0.67884, -0.50128, -0.3242],
  // ring 8
  [-0.63462, -0.87348, 0],
  [-0.59548, -0.92894, 0.23246],
  [-0.44493, -0.92968, 0.42702],
  [-0.23471, -0.91162, 0.55177],
  [0, -0.88118, 0.58779],
  [0.22292, -0.86582, 0.53431],
  [0.42618, -0.89051, 0.40423],
  [0.59757, -0.9322, 0.21741],
  [0.67161, -0.9244, 0],
  [0.5971, -0.84763, -0.21741],
  [0.4416, -0.79643, -0.40423],
  [0.23351, -0.77274, -0.53431],
  [0, -0.73348, -0.58779],
  [-0.20881, -0.69101, -0.55177],
  [-0.38218, -0.68926, -0.42702],
  [-0.53437, -0.75859, -0.23246],
  // ring 9
  [-0.35686, -1.09829, 0],
  [-0.33422, -1.14232, 0.1203],
  [-0.25441, -1.15821, 0.22144],
  [-0.13579, -1.15467, 0.28761],
  [0, -1.1455, 0.30902],
  [0.13432, -1.14225, 0.28338],
  [0.25205, -1.14745, 0.21557],
  [0.33624, -1.14924, 0.11622],
  [0.36708, -1.12976, 0],
  [0.3328, -1.07982, -0.11622],
  [0.24745, -1.02754, -0.21557],
  [0.13001, -0.9856, -0.28338],
  [0, -0.95789, -0.30902],
  [-0.12542, -0.95083, -0.28761],
  [-0.23461, -0.97422, -0.22144],
  [-0.31725, -1.02936, -0.1203],
  // the bottom pole
  [0, -1.1983, 0],
];

// The body, and the ballast lobe slung under its belly a little to one side,
// rolled 0.22 the same way.
pelagia.grownBody(root, chitin, {
  name: 'hull',
  buffer: HULL,
  ...drawn([0, 0, 0], [0, 0, 0], [0.5, 0.34, 1.8]),
});
pelagia.lobe(root, chitin, {
  name: 'ballast_lobe',
  ...drawn([0.13, -0.22, -0.2], [0, 0, 0.22], [0.24, 0.18, 0.68]),
});

// Four growth rings on the hull's own profile — 0.5 across and 0.34 tall on
// a length of 1.8 — 8 % proud of it across and 16 % over, each 1.6 deep
// along the keel, each leaned its own way off square and each tube its own
// thickness: no two alike, which is what grown means here.
const profile = (z) => Math.sqrt(1 - (z / 1.8) ** 2);
const ring = (tube, at, lean) => ({
  tube,
  ...drawn(at, [...lean, 0], [0.5 * 1.08 * profile(at[2]), 0.34 * 1.16 * profile(at[2]), 1.6]),
});
pelagia.grownRings(root, ridge, {
  rings: [
    ring(0.06683, [0, -0.02, -1.2], [0.06712, 0.1]),
    ring(0.05083, [0.01282, -0.02, -0.5], [0.11319, -0.06663]),
    ring(0.03233, [-0.02318, -0.02, 0.3], [-0.09629, -0.01122]),
    ring(0.06701, [0.0291, -0.02, 1.0], [-0.08838, 0.08157]),
  ],
});

// The feeler, from the brow forward and up to the light at its tip.
pelagia.feeler(root, ridge, {
  through: [
    [0.02, 0.02, 1.6],
    [0.1, 0.15, 2.0],
    [0.24, 0.34, 2.2],
  ].map((p) => drawn(p).at),
});

// The membranes: the dorsal blade standing on the back, and the two
// pectorals, each its own size, raked forward and down off the belly — the
// starboard one's node is written as the file decomposes it.
pelagia.membranes(root, membrane, {
  fins: [
    {
      name: 'dorsal_blade',
      span: 1.3,
      depth: 0.5,
      ...drawn([0.02, 0.26, 0.75], [0.16, Math.PI / 2, 0]),
    },
    {
      name: 'pectoral_port',
      span: 1.0,
      depth: 0.4,
      ...drawn([0.4, -0.04, 0.65], [-1.35, 0.55, -0.1]),
    },
    {
      name: 'pectoral_starboard',
      span: 0.66,
      depth: 0.28,
      ...drawn([-0.38, -0.1, 0.45], [Math.PI - 1.8, 0.55, 0.1 - Math.PI]),
    },
  ],
});

// The tail: a peduncle leaned 0.08 off the keel line, and the two flukes
// standing off it — the lower one the upper's mirror in its node's scale.
pelagia.stalk(root, chitin, {
  radii: [0.1, 0.16],
  length: 0.7,
  ...drawn([0.02, 0.02, -1.95], [Math.PI / 2 + 0.08, 0, 0]),
});
pelagia.membranes(root, membrane, {
  fins: [
    {
      name: 'tail_fluke_upper',
      span: 0.95,
      depth: 0.32,
      ...drawn([0, 0.05, -2.25], [0.42, Math.PI / 2, 0]),
    },
    {
      name: 'tail_fluke_lower',
      span: 0.7,
      depth: 0.26,
      ...drawn([0.02, -0.02, -2.27], [-0.45, Math.PI / 2, 0], [1, -1, 1]),
    },
  ],
});

// "Nearly black, navigation marks only": five buds, and that is the whole
// resting light of a hull that idles at SIG 6.
pelagia.lightBuds(root, light, {
  buds: [
    ['feeler_tip_light', 0.045, drawn([0.24, 0.34, 2.2])],
    ['flank_light_port', 0.035, drawn([0.44, 0.1, 0.9])],
    ['flank_light_starboard', 0.035, drawn([-0.42, 0.06, 0.85])],
    ['throat_light', 0.035, drawn([0, -0.28, 1.3])],
    ['tail_light', 0.03, drawn([0, 0.12, -2.5])],
  ],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'light-scout-pelagia.glb');
