/**
 * The coral growth — 12 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the low prop of the Coral
 * Ruins that also stands in the Kelp Forest: a civilisation's worth of
 * coral over a block of its masonry.
 *
 * "Coral Ruins | env-coral-growth | 12 m | 9 m | ≤ 400 | none ... ruin
 * props carry the geometric patterns of art-direction.md's "Environmental
 * Shapes" — right angles, terraces, a civilisation's worth of coral growth
 * over them" (docs/asset-prompts-3d.md, Block 4), under ENV STYLE:
 * "Natural or ruined form — stone, coral ... pressure-scarred and ancient;
 * nothing manufactured ... low-poly with crisp facets, at most two
 * materials", and no light of any kind. Two materials, 184 triangles,
 * 9.45 m tall at its 12 m by intake's measure (`sizeM.height`), which the
 * row has carried since #879 moved it from 8 m; 8 m raw, the old row's
 * figure and the frame every figure below is in, before `K` and the root's
 * fit.
 *
 * A port of the approved export (docs/concept-art/models/env-coral-growth.glb
 * as committed before #869), part for part in its order, every number the
 * export's own. What the file is made of: in `stone_dark`, a masonry block
 * 8.2 by 3 by 6 and a lip 3.8 by 1.3 by 2.4 beside it, three's boxes kept
 * indexed (seabed.mjs `kept`); in the ruins' `coral_stone` (#3A2B24 at
 * roughness 0.95 — `coralStoneRuin`, not the tower's #171D19), six lobes
 * that are icosahedra under scale triples (`ico`), three plates that are
 * flattened octahedra (`octa`), and four branches that are three's
 * four-facet cone open at the foot, kept indexed and *smooth-shaded* with
 * three's own normals, each 44° off its own face where the neighbouring
 * facets are 88° apart — which is why `parts.mjs` prints them as "10 v
 * 4 t" with no constructor: an open cone to a point drops its four apex
 * triangles.
 *
 * Every node in the file is an identity, and every buffer carries its
 * part's whole transform: the generator placed the fifteen parts at the
 * round numbers below (a lobe at (−0.2, 3.6, 0.1), tilted (0.2, 0.4, 0.1),
 * 4.05 by 2.7 by 3.6), then scaled the lot by 0.8587186, sat it on the
 * ground, and baked the result into the buffers. The factor is the
 * export's own and matches no measure of the raw scene — 12 over its
 * vertex box is 1.019, over its loose box 0.951, 8 over its height 0.863 —
 * so it is cited rather than derived; the lift is derived, as the file
 * evidently did, from the vertex floor (three's precise `Box3`), which puts
 * the block's lowest corner on y = 0 to the last digit.
 *
 * The root is the export's — `env_coral_growth`, an identity, the lift
 * already in the buffers — and, new in the port, held at 12 m by the
 * measure intake takes: the export measured 10.1139 across and baked at
 * ×1.186 with a rescale warning, so the root carries that one factor and
 * nothing else (seabed.mjs `stand`, with no lift, since the file's root
 * has none). `diff.mjs env-coral-growth 1856135` — the pre-port binary,
 * which is also the default rev — divides it out and lists nothing else.
 */
import { THREE, add, box, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 12;
const DRAWN = 10.1139;
/** The export's own factor over the round numbers below; see the header. */
const K = 0.8587186;

const stone = seabed.ground.stoneDark();
const coral = seabed.ground.coralStoneRuin();

const growth = new THREE.Group();
growth.name = 'env_coral_growth';

/** A branch: three's cone to a point on four facets, open at the foot, as three shades it. */
const branch = (r, h) => seabed.kept(new THREE.CylinderGeometry(0, r, h, 4, 1, true));

// The masonry: a block, tilted as if settled, and a lip off its −x, +z corner.
add(
  growth,
  'masonry_block',
  seabed.kept(box(8.2, 3, 6)),
  stone,
  [0.6, 1.5, -0.2],
  [0.06, 0.35, -0.1]
);
add(
  growth,
  'masonry_lip',
  seabed.kept(box(3.8, 1.3, 2.4)),
  stone,
  [-3.9, 1.2, 2.8],
  [0, -0.4, 0.12]
);

// The coral over it: six lobes, largest on top of the block.
add(growth, 'lobe_01', seabed.ico([4.05, 2.7, 3.6]), coral, [-0.2, 3.6, 0.1], [0.2, 0.4, 0.1]);
add(growth, 'lobe_02', seabed.ico([3, 1.8, 2.64]), coral, [2.8, 2.6, 1.5], [0.5, 1.1, 0.2]);
add(growth, 'lobe_03', seabed.ico([2.99, 1.61, 2.645]), coral, [-2.9, 2.5, -1.7], [0.1, 0.7, 0.4]);
add(growth, 'lobe_04', seabed.ico([2.47, 1.235, 1.9]), coral, [0.7, 2.2, -3.1], [0.4, 0.2, 0.6]);
add(growth, 'lobe_05', seabed.ico([2.16, 1.26, 2.34]), coral, [-1.3, 2.1, 3.1], [0.3, 1.4, 0.1]);
add(growth, 'lobe_06', seabed.ico([1.82, 0.91, 1.54]), coral, [3.4, 1.5, -1.9], [0.6, 0.3, 0.9]);

// Three plates, flat octahedra laid over the lobes.
add(
  growth,
  'plate_01',
  seabed.octa([3.08, 0.484, 2.42]),
  coral,
  [1.6, 5.1, -0.8],
  [0.25, 0.3, 0.15]
);
add(growth, 'plate_02', seabed.octa([2.47, 0.38, 2.28]), coral, [-2.2, 4.4, 1.2], [-0.2, 0.9, 0.3]);
add(growth, 'plate_03', seabed.octa([1.92, 0.32, 1.6]), coral, [3.6, 3.7, 0.6], [0.35, 0.2, -0.3]);

// Four branches standing off the top, the tallest to 8 m raw.
add(growth, 'branch_01', branch(0.7, 3.4), coral, [-0.4, 7.1, 0.2], [0.12, 0.3, -0.08]);
add(growth, 'branch_02', branch(0.55, 2.6), coral, [1.4, 6.3, 1.1], [0.35, 0, 0.2]);
add(growth, 'branch_03', branch(0.5, 2.2), coral, [-1.9, 5.8, -0.9], [-0.25, 0.6, -0.3]);
add(growth, 'branch_04', branch(0.45, 1.8), coral, [0.9, 5.6, -2.1], [-0.4, 0.2, 0.15]);

// The generator's last step, and the file's: the lot scaled by K, sat on
// the ground by its vertex floor, and baked into the buffers under identity
// nodes, the root's included (seabed.mjs `bake`). `applyMatrix4` carries
// the normals through the normal matrix, which is what keeps the branches'
// smooth shading the file's.
growth.scale.setScalar(K);
growth.updateMatrixWorld(true);
growth.position.y = -new THREE.Box3().setFromObject(growth, true).min.y;
seabed.bake(growth);

// Held at 12 m by intake's measure; the root is otherwise the file's identity.
const { drawn, k } = seabed.stand(growth, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env_coral_growth: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(growth, 'env-coral-growth.glb');
