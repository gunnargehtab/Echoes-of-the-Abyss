/**
 * The coral tower — 15 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the Kelp Forest's living
 * coral stone between the kelp columns.
 *
 * "Kelp Forest | env-coral-tower | 15 m | 25–35 m | ≤ 600 | none ... kelp
 * props are the forty-metre columns of world-map.md's terraces, with
 * env-coral-tower as living coral stone" (docs/asset-prompts-3d.md,
 * Block 4), under ENV STYLE: "Natural or ruined form — stone, coral ...
 * pressure-scarred and ancient; nothing manufactured ... low-poly with
 * crisp facets, at most two materials", and no light of any kind. One
 * material, 588 triangles, 27.41 m tall at its 15 m by intake's box
 * (`sizeM.height`) and 27.06 m by its vertices, which is what the runtime
 * draws (#876); 32 m raw, which is the frame every figure below is in,
 * before the root's fit.
 *
 * A port of the approved export (docs/concept-art/models/env-coral-tower.glb
 * as committed before #869), part for part in its order, every number the
 * export's own. What the file is made of, all in the tower's own
 * `coral_stone` (#171D19 at roughness 1 — seabed.mjs `coralStoneLiving`,
 * not the ruins' #3A2B24): thirteen dodecahedra and five plates
 * (13 × 36 + 5 × 24 = 588). The dodecahedra are three's own at radius 1
 * under a scale triple the generator baked into the buffer (seabed.mjs
 * `dodeca`) — a base mound 7.36 by 2.53 by 6.21 and a spur beside it, six
 * lobes stacked from 4 m to 27.8 m and shrinking as they climb, a crown at
 * 30.2 m stretched tall, and four flat shelves let into the flanks between
 * 21 and 27.4 m — each on a node that carries a small tilt and its own
 * yaw. Between the lobes sit five plates, three's six-facet cylinder at
 * 0.72 of its base radius on top, of base radius 5.4 m on the lowest
 * (10.8 m across) down to 2.7 m on the top, kept exactly as three built
 * them: indexed, smooth-shaded, each torso vertex normal 21–24° off its
 * own face where the neighbouring facets are 42.5–47.7° apart (seabed.mjs
 * `kept`), which `parts.mjs` prints without the "non-indexed" it prints
 * for everything else here.
 *
 * Seven of the file's Euler triples print flipped — every node whose yaw
 * is past π/2: `lobe_2` as (−3.02, 1.54, −3.06), which is (0.12, 1.6,
 * 0.08), and `plate_2`, `lobe_4`, `lobe_5`, `plate_5`, `crown` and
 * `shelf_3` the same way — and the script writes the plain form, since the
 * quaternion, and so the matrix the file carries, is the same.
 *
 * The root is the export's — `env_coral_tower`, at the origin and *not*
 * grounded: the base mound's lowest vertex sits at y = −0.41668 and the file
 * leaves it there — and, new in the port, held at 15 m by the measure intake
 * takes: three's loose `Box3.setFromObject`, which took the export at
 * 17.8572 across and baked it at ×0.840 with a rescale warning, so the root
 * carries that one factor and nothing else (seabed.mjs `stand`, with no
 * lift, since the file's root has none). `diff.mjs env-coral-tower
 * 1856135` — the pre-port binary, which is also the default rev — divides
 * the factor out and lists nothing else.
 */
import { THREE, add, cyl, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 15;
const DRAWN = 17.8572;

const coral = seabed.ground.coralStoneLiving();

const tower = new THREE.Group();
tower.name = 'env_coral_tower';

/** A plate: six facets, the top at 0.72 of the base radius, as three cuts and shades it. */
const plate = (r, h) => seabed.kept(cyl(0.72 * r, r, h, 6));

// The base: a mound and a spur, both low and wide.
add(tower, 'base_mound', seabed.dodeca([7.36, 2.53, 6.21]), coral, [0, 2.1, 0], [0, 0.5, 0.06]);
add(tower, 'base_spur', seabed.dodeca([3.12, 1.2, 2.4]), coral, [5.2, 1, -2.4], [0, 1.2, 0.1]);

// The column: lobe, plate, lobe, plate ... to the crown, leaning a little
// to +x and +z as it climbs. Every lobe tilts (0.12, ·, 0.08), every plate
// (0.04, ·, −0.03); the yaws are the file's own.
add(tower, 'lobe_1', seabed.dodeca([4.2, 2.94, 3.99]), coral, [0, 4, 0], [0.12, 0.3, 0.08]);
add(tower, 'plate_1', plate(5.4, 1.4), coral, [0.3, 7.2, 0.2], [0.04, 0.8, -0.03]);
add(tower, 'lobe_2', seabed.dodeca([3.6, 2.7, 3.24]), coral, [0.5, 9.6, 0.4], [0.12, 1.6, 0.08]);
add(tower, 'plate_2', plate(4.7, 1.2), coral, [0.7, 12.4, 0.5], [0.04, 2.3, -0.03]);
add(
  tower,
  'lobe_3',
  seabed.dodeca([2.945, 2.48, 2.79]),
  coral,
  [0.9, 14.8, 0.7],
  [0.12, 0.1, 0.08]
);
add(tower, 'plate_3', plate(4, 1.1), coral, [1.1, 17.4, 0.8], [0.04, 1.2, -0.03]);
add(tower, 'lobe_4', seabed.dodeca([2.47, 2.21, 2.21]), coral, [1.3, 19.6, 1], [0.12, 2.7, 0.08]);
add(tower, 'plate_4', plate(3.4, 1), coral, [1.5, 22, 1.1], [0.04, 0.4, -0.03]);
add(tower, 'lobe_5', seabed.dodeca([1.98, 1.98, 1.87]), coral, [1.7, 24, 1.2], [0.12, 1.9, 0.08]);
add(tower, 'plate_5', plate(2.7, 0.9), coral, [1.9, 26, 1.3], [0.04, 2.9, -0.03]);
add(tower, 'lobe_6', seabed.dodeca([1.53, 1.7, 1.445]), coral, [2, 27.8, 1.4], [0.12, 0.9, 0.08]);
add(tower, 'crown', seabed.dodeca([0.96, 1.68, 0.96]), coral, [2.1, 30.2, 1.5], [0.12, 2.2, 0.08]);

// Four shelves let into the flanks, flat dodecahedra tilted (0.1, ·, −0.12).
add(
  tower,
  'shelf_1',
  seabed.dodeca([3.9, 0.728, 2.34]),
  coral,
  [4.3, 21.2, 1.6],
  [0.1, 0.2, -0.12]
);
add(
  tower,
  'shelf_2',
  seabed.dodeca([3.08, 0.616, 1.87]),
  coral,
  [-1.4, 23.6, 3.4],
  [0.1, 1.4, -0.12]
);
add(tower, 'shelf_3', seabed.dodeca([3, 0.52, 1.6]), coral, [3.8, 25.4, -1.6], [0.1, 2.6, -0.12]);
add(tower, 'shelf_4', seabed.dodeca([2.24, 0.4, 1.28]), coral, [0.4, 27.4, 3.2], [0.1, 0.7, -0.12]);

// Held at 15 m by intake's measure; the root is otherwise the file's identity.
const { drawn, k } = seabed.stand(tower, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env_coral_tower: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(tower, 'env-coral-tower.glb');
