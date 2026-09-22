/**
 * The open-water boulder — 12 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), "a boulder now and then, so
 * the plain is not a void".
 *
 * "Open Water | env-open-boulder | 12 m | 6 m | ≤ 300 | none"
 * (docs/asset-prompts-3d.md, Block 4), under ENV STYLE: "Natural or ruined
 * form — stone ... pressure-scarred and ancient; nothing manufactured ...
 * low-poly with crisp facets, at most two materials", and no light of any
 * kind. One material, 160 triangles, 6 m tall by the export's own fit.
 *
 * A port of the approved export (docs/concept-art/models/env-open-boulder.glb
 * as committed before #869), part for part in its order, every number the
 * export's own. What the file is made of, all in `stone_silt`: the
 * boulder, an orb on ten meridians and six rings whose every ring vertex
 * the generator pushed out or in about its axis — the poles stay on it,
 * the ring heights are the orb's own, and the underside is flattened to
 * 0.7 of the top's 3.5 m — so a table in three's own vertex order under
 * seabed.mjs `orb` (kit.mjs `tabled` says how the pole rows and the torn
 * seam read); a `crack` across its crown, which with crag A's three ledges
 * is one of the four parts of the five stone props that is a formula
 * rather than a table: a 5.5 × 1.2 × 0.45 box with its top face pinched to
 * 0.15 of its depth (`wedge`), yawed 0.9 and tipped a few degrees; and a
 * `silt_skirt` round its foot, a twelve-facet drum 0.55 m thick torn the
 * same way as the crags' base.
 *
 * The root is the export's — `env_open_boulder`, and unlike the other
 * four it carries a non-uniform scale: (0.91879, 1.00840, 0.91879) with a
 * lift of 0.25210, which is the raw model held to 12 m across its longer
 * plan axis and to the table's 6 m tall, then sat on y = 0. Every one of
 * those digits is `Box3.setFromObject` over the raw parts — `RAW` below,
 * 13.0607 by 5.9500 by 11.0183, which the script measures and refuses to
 * differ from, since a fit to 12 m would hide a mistyped row — so they are
 * derived rather than typed, and seabed.mjs `stand` finds the result
 * already footprint-true and leaves it exactly as it is: intake reported
 * ×1.000 on this one file before the port, and reports it after.
 */
import { THREE, add, exportGlb, rep } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 12;
const HEIGHT = 6;
/** The raw model's extents before the export's own fit, x by y by z. */
const RAW = [13.0607, 5.95, 11.0183];

const silt = seabed.ground.stoneSilt();

const boulder = new THREE.Group();
boulder.name = 'env_open_boulder';

// The orb: rows from the top pole down, eleven a row with the seam vertex
// doubled and torn. The pole rows are one point each and each has the one
// vertex three never references, written as the pole too.
const BOULDER = [
  // top pole row
  ...rep(11, [0, 3.5, 0]),
  // ring 1
  [-2.63393, 3.03109, 0],
  [-2.07152, 3.03109, 0.83614],
  [-0.82608, 3.03109, 1.41245],
  [0.8035, 3.03109, 1.37385],
  [2.24141, 3.03109, 0.90471],
  [2.70555, 3.03109, 0],
  [2.13602, 3.03109, -0.86217],
  [0.85638, 3.03109, -1.46425],
  [-0.85843, 3.03109, -1.46776],
  [-2.08393, 3.03109, -0.84115],
  [-2.58909, 3.03109, 0],
  // ring 2
  [-4.47902, 1.75, 0],
  [-3.62354, 1.75, 1.46259],
  [-1.47857, 1.75, 2.5281],
  [1.46318, 1.75, 2.50178],
  [3.90623, 1.75, 1.57669],
  [4.85088, 1.75, 0],
  [3.58181, 1.75, -1.44574],
  [1.48828, 1.75, -2.54469],
  [-1.41446, 1.75, -2.41848],
  [-3.66995, 1.75, -1.48132],
  [-4.82277, 1.75, 0],
  // ring 3, the waist
  [-5.68904, 0, 0],
  [-4.2006, 0, 1.69551],
  [-1.6602, 0, 2.83865],
  [1.75643, 0, 3.00319],
  [4.1133, 0, 1.66027],
  [5.48588, 0, 0],
  [4.61974, 0, -1.86469],
  [1.59432, 0, -2.72601],
  [-1.62555, 0, -2.77941],
  [-4.43636, 0, -1.79067],
  [-5.65116, 0, 0],
  // ring 4, flattened to 0.7
  [-4.79565, -1.225, 0],
  [-4.00138, -1.225, 1.61509],
  [-1.51398, -1.225, 2.58864],
  [1.40576, -1.225, 2.40361],
  [3.63862, -1.225, 1.46867],
  [4.89701, -1.225, 0],
  [3.74993, -1.225, -1.5136],
  [1.46022, -1.225, -2.49671],
  [-1.48827, -1.225, -2.54467],
  [-3.67951, -1.225, -1.48518],
  [-4.80553, -1.225, 0],
  // ring 5
  [-2.80588, -2.12176, 0],
  [-2.30157, -2.12176, 0.92899],
  [-0.86477, -2.12176, 1.47861],
  [0.81207, -2.12176, 1.3885],
  [2.17993, -2.12176, 0.87989],
  [2.56741, -2.12176, 0],
  [2.23295, -2.12176, -0.9013],
  [0.8011, -2.12176, -1.36974],
  [-0.79233, -2.12176, -1.35474],
  [-2.17185, -2.12176, -0.87663],
  [-2.61999, -2.12176, 0],
  // bottom pole row
  ...rep(11, [0, -2.45, 0]),
];
add(boulder, 'boulder', seabed.orb(BOULDER, 10, 6), silt, [0, 2.2, 0], [0, 0.35, 0]);

// The crack across the crown: a knife-edged slab let into the top.
add(
  boulder,
  'crack',
  seabed.wedge(5.5, 1.2, 0.45, 0.15),
  silt,
  [0.2, 4.95, -0.3],
  [0.05, 0.9, -0.06]
);

// The silt skirt: twelve facets, one height row, both caps, in the same
// row order as the crags' base; the heights are the drum's own ±0.275 and
// only the rings were pushed about.
const SILT_SKIRT = [
  // torso row 0
  [0, 0.275, 2.72567],
  [2.1653, 0.275, 2.41097],
  [3.91629, 0.275, 1.45355],
  [4.71682, 0.275, 0],
  [3.71218, 0.275, -1.37779],
  [2.28047, 0.275, -2.53922],
  [0, 0.275, -2.78554],
  [-2.26638, 0.275, -2.52352],
  [-4.02472, 0.275, -1.49379],
  [-4.31077, 0.275, 0],
  [-3.99241, 0.275, 1.4818],
  [-2.36843, 0.275, 2.63715],
  [0, 0.275, 2.85631],
  // torso row 1
  [0, -0.275, 3.71701],
  [2.89039, -0.275, 3.21833],
  [4.90634, -0.275, 1.82101],
  [5.42606, -0.275, 0],
  [4.8133, -0.275, -1.78647],
  [2.9338, -0.275, -3.26667],
  [0, -0.275, -3.86504],
  [-2.87067, -0.275, -3.19638],
  [-4.69779, -0.275, -1.7436],
  [-5.41708, -0.275, 0],
  [-4.6903, -0.275, 1.74082],
  [-2.76138, -0.275, 3.07469],
  [0, -0.275, 3.81208],
  // top cap centres
  ...rep(12, [0, 0.275, 0]),
  // top cap ring
  [0, 0.275, 2.81483],
  [2.18692, 0.275, 2.43505],
  [3.85086, 0.275, 1.42926],
  [4.69431, 0.275, 0],
  [3.81238, 0.275, -1.41498],
  [2.35086, 0.275, -2.6176],
  [0, 0.275, -2.85846],
  [-2.15124, 0.275, -2.39532],
  [-3.9636, 0.275, -1.4711],
  [-4.60792, 0.275, 0],
  [-3.88922, 0.275, 1.4435],
  [-2.27194, 0.275, 2.52972],
  [0, 0.275, 2.88816],
  // bottom cap centres
  ...rep(12, [0, -0.275, 0]),
  // bottom cap ring
  [0, -0.275, 3.71235],
  [2.94674, -0.275, 3.28108],
  [4.85354, -0.275, 1.80141],
  [5.63497, -0.275, 0],
  [5.10855, -0.275, -1.89606],
  [2.78669, -0.275, -3.10288],
  [0, -0.275, -3.52306],
  [-3.03739, -0.275, -3.38201],
  [-4.73353, -0.275, -1.75687],
  [-5.46627, -0.275, 0],
  [-4.94342, -0.275, 1.83477],
  [-2.98584, -0.275, 3.32461],
  [0, -0.275, 3.65313],
];
add(boulder, 'silt_skirt', seabed.drum(SILT_SKIRT, 12, 1), silt, [0, 0.275, 0], [0, 0.35, 0]);

// The export's own root fit, derived as the header says: the raw model
// held to 12 m across and 6 m tall by the boxes of its parts. The raw
// extents are checked against `RAW` first, because after the fit the
// footprint is 12 whatever the table says.
boulder.updateMatrixWorld(true);
const raw = new THREE.Box3().setFromObject(boulder).getSize(new THREE.Vector3());
raw.toArray().forEach((v, i) => {
  if (Math.abs(v - RAW[i]) > 1e-3)
    throw new Error(
      `env_open_boulder: raw ${'xyz'[i]} extent ${v.toFixed(4)}; the header says ${RAW[i]}`
    );
});
const across = FOOTPRINT / Math.max(raw.x, raw.z);
boulder.scale.set(across, HEIGHT / raw.y, across);

const { drawn, k } = seabed.stand(boulder, FOOTPRINT, { ground: true });
console.log(
  `env_open_boulder: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(boulder, 'env-open-boulder.glb');
