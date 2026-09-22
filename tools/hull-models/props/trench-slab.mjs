/**
 * The trench slab — 25 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the low prop of the Abyssal
 * Trench floor.
 *
 * "Abyssal Trench | env-trench-slab | 25 m | 10 m | ≤ 300 | none ...
 * trench props are blackened, pressure-eroded, knife-edged"
 * (docs/asset-prompts-3d.md, Block 4), under ENV STYLE: "Natural or ruined
 * form — stone ... pressure-scarred and ancient; nothing manufactured ...
 * low-poly with crisp facets, at most two materials", and no light of any
 * kind. One material, 72 triangles, 13.3 m tall.
 *
 * A port of the approved export (docs/concept-art/models/env-trench-slab.glb
 * as committed before #869), every number the export's own. The file is
 * one part, `trench_slab` in `basalt`, on an identity node under an
 * identity root, and the part is one buffer the generator stitched by hand
 * — five bodies with no constructor behind any of them, their caps up to
 * five metres off plane: a hexagonal prism lying tilted, the slab itself,
 * 24 m across; a pentagonal prism on its back rising to 13.3 m, the ridge;
 * and three eight-cornered chunks lying on a shelf at y = 9.5675, the
 * boulders on top. So the part is a point table under kit.mjs `faceted`,
 * with the faces from seabed.mjs `prism` and `chunk` cut by its `fan`
 * rule, which is the generator's own on all 34 faces and gives the file's
 * 72 triangles in its order.
 *
 * The root is the export's — `env-trench-slab`, hyphenated as the file
 * has it, at the origin with the buffer already sitting on y = 0 — and,
 * new in the port, held at 25 m by the measure intake takes: the export
 * measured 24.4740 on X and baked at ×1.021 with a rescale warning, so the
 * root carries that one factor (seabed.mjs `stand`, with no lift, since
 * the file's root has none). `diff.mjs env-trench-slab dce68ef` — the
 * pre-port binary, which is also the default rev — divides it out and
 * lists nothing else.
 */
import { THREE, add, faceted, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 25;
const DRAWN = 24.474;

const basalt = seabed.ground.basaltTrench();

const slab = new THREE.Group();
slab.name = 'env-trench-slab';

// Corners, body by body: each prism's bottom ring then its top ring, the
// same sense round; each chunk's four bottom corners then its four top.
const POINTS = [
  // the slab: hexagonal prism, bottom ring
  [-12.1913, 0.1113, -8.12902],
  [-5.05026, 4.00632, -10.0678],
  [-3.48554, 4.7383, -9.84979],
  [2.28164, 4.94332, 8.13785],
  [1.34294, 4.62085, 8.31957],
  [-9.65106, 0, 6.4833],
  // the slab: top ring
  [-13.57698, 3.64411, -7.70129],
  [-6.30126, 7.40253, -9.99834],
  [-4.70269, 8.18137, -9.59595],
  [1.03009, 8.39569, 8.26772],
  [-0.42767, 7.83406, 8.73205],
  [-10.98986, 3.01701, 6.59706],
  // the ridge: pentagonal prism, bottom ring
  [-2.64468, 5.05698, -9.78563],
  [4.99097, 8.11535, -8.69497],
  [10.89705, 10.15747, -3.04398],
  [9.59685, 8.39305, 5.02768],
  [3.04853, 5.43363, 8.16748],
  // the ridge: top ring
  [-4.27687, 8.29828, -9.59479],
  [3.67836, 11.45548, -8.15272],
  [9.28823, 13.30766, -2.54507],
  [8.03931, 12.14942, 5.2379],
  [1.41711, 8.47565, 8.50918],
  // first boulder: bottom, top
  [8.04895, 9.56752, -9.23258],
  [10.67168, 9.56752, -9.31444],
  [10.33011, 9.56752, -6.82814],
  [8.03252, 9.56752, -6.50714],
  [7.61532, 10.85696, -8.76269],
  [10.67898, 10.62488, -9.04389],
  [10.02601, 10.8084, -6.56028],
  [7.26241, 10.9969, -7.33598],
  // second boulder
  [-11.64139, 9.56752, -4.5957],
  [-10.18435, 9.56752, -4.18466],
  [-9.75397, 9.56752, -1.73154],
  [-12.51397, 9.56752, -1.35293],
  [-11.79566, 10.52362, -4.35643],
  [-9.47634, 10.51096, -3.87784],
  [-9.48354, 10.20643, -1.27949],
  [-12.47567, 10.47826, -1.67984],
  // third boulder
  [-6.7637, 9.56752, 8.20794],
  [-5.15154, 9.56752, 7.84651],
  [-5.25658, 9.56752, 9.61801],
  [-7.23489, 9.56752, 10.02604],
  [-6.88518, 10.22737, 8.00054],
  [-5.31781, 10.30732, 8.42387],
  [-5.21296, 10.13135, 9.62487],
  [-6.95223, 10.03702, 9.76007],
];

/** Indices `from` to `from + n − 1`. */
const run = (from, n) => Array.from({ length: n }, (_, i) => from + i);

const FACES = [
  ...seabed.prism(run(0, 6), run(6, 6)),
  ...seabed.prism(run(12, 5), run(17, 5)),
  ...seabed.chunk(run(22, 4), run(26, 4)),
  ...seabed.chunk(run(30, 4), run(34, 4)),
  ...seabed.chunk(run(38, 4), run(42, 4)),
];
add(slab, 'trench_slab', faceted(POINTS, seabed.fan(FACES)), basalt);

const { drawn, k } = seabed.stand(slab, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env-trench-slab: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(slab, 'env-trench-slab.glb');
