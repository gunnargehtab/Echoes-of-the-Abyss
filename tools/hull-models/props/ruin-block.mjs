/**
 * The ruin block — 25 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the terraced stone of the
 * Coral Ruins, the largest biome on two of the three skirmish maps.
 *
 * "Coral Ruins | env-ruin-block | 25 m | 15–25 m | ≤ 400 | none ... ruin
 * props carry the geometric patterns of art-direction.md's 'Environmental
 * Shapes' — right angles, terraces, a civilisation's worth of coral growth
 * over them" (docs/asset-prompts-3d.md, Block 4), under ENV STYLE:
 * "Natural or ruined form — stone, coral ... pressure-scarred and ancient;
 * nothing manufactured ... low-poly with crisp facets, at most two
 * materials", and no light of any kind. Two materials, 376 triangles,
 * 24.97 m tall at its 25 m by intake's measure (`sizeM.height`); 17.8 m
 * raw, which with the grid below is the frame every figure here is in,
 * before the root's fit.
 *
 * A port of the approved export (docs/concept-art/models/env-ruin-block.glb
 * as committed before #869), part for part in its order, every number the
 * export's own. What the file is made of, all of it three's primitives
 * placed and then baked into their buffers under identity nodes
 * (seabed.mjs, "The ruins"): in `stone_dark`, three tiers of plain boxes —
 * a main block with a wing on each of the lower two, stepped back as they
 * rise — a broken lip on the first tier's edge, five rubble boxes and
 * three tetrahedral shards fallen at its foot, each tipped a little; and
 * in `coral_stone` seventeen crusts, nine icosahedra and eight octahedra
 * squashed flat and turned, on the tiers' edges and among the rubble.
 *
 * Every coordinate in the file is a multiple of one number, 0.86653253:
 * the generator drew the block on a unit grid — tier 1 is 18 by 7 by 10
 * units, a rubble box 3.2 by 1.5 by 3, a coral crust 1.92 by 0.88 by 1.92
 * — with angles to two decimals, then scaled the whole scene by that
 * factor. So the design is written here in its grid, `GRID` is applied on
 * the root, and `bake` folds the two into each buffer the way the export
 * did: against the pre-port binary, every axis-aligned coordinate and
 * nineteen in twenty of the rest reproduce to the float32 bit, and of the
 * 2,988 floats the remainder are 164 one ulp off, 3 two ulp (`shard_a`)
 * and 8 four ulp (`coral_05`, `coral_17`). What the factor is a ratio of
 * was not recovered; it is neither a footprint fit nor a height fit
 * against any extent this design has. Then the generator
 * lifted the buffers — not the root — so that the lowest corner,
 * rubble_d's, sits on y = 0: 0.31989 m, the tiers' floor, derived here
 * from the same box.
 *
 * The root is the export's — `env_ruin_block`, an identity — and, new in
 * the port, held at 25 m by the measure intake takes: the export measured
 * 17.8652 across on X and baked at ×1.399 with a rescale warning, so the
 * root carries that one factor and no lift (seabed.mjs `stand`, with no
 * lift, since the file's root has none). `diff.mjs env-ruin-block 400797b`
 * — the pre-port binary, which is also the default rev — divides it out
 * and lists nothing else.
 */
import { THREE, add, box, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 25;
const DRAWN = 17.8652;
const GRID = 0.86653253;

const stone = seabed.ground.stoneDark();
const coral = seabed.ground.coralStoneRuin();

const block = new THREE.Group();
block.name = 'env_ruin_block';

// The three tiers, each a main block and — on the lower two — a wing on
// its +z side, axis-aligned on the grid: 7 units tall, then 6, then 6.
add(block, 'tier1_main', seabed.kept(box(18, 7, 10)), stone, [0, 3.5, -3]);
add(block, 'tier1_wing', seabed.kept(box(12, 7, 6)), stone, [-3, 3.5, 5]);
add(block, 'tier2_main', seabed.kept(box(13, 6, 7)), stone, [-0.5, 10, -2.5]);
add(block, 'tier2_wing', seabed.kept(box(8, 6, 4)), stone, [-3, 10, 3]);
add(block, 'tier3', seabed.kept(box(8, 6, 7)), stone, [-1, 16, -0.5]);

// The broken lip on the first tier's +x, +z corner, and the rubble at its
// foot: five boxes tipped by two-decimal angles, the last two the smallest.
add(
  block,
  'tier1_broken_lip',
  seabed.kept(box(2.6, 2.2, 3)),
  stone,
  [4.2, 5.9, 3.4],
  [0.08, 0.2, -0.28]
);
add(block, 'rubble_a', seabed.kept(box(3.2, 1.5, 3)), stone, [5.6, 1.6, 5.2], [0.1, 0.5, 0.15]);
add(block, 'rubble_b', seabed.kept(box(2.4, 1.2, 2.2)), stone, [8, 0.6, 3], [0, -0.3, 0.12]);
add(block, 'rubble_c', seabed.kept(box(2, 1, 1.6)), stone, [4.6, 0.5, 8.4], [0.2, 0.9, 0]);
add(block, 'rubble_d', seabed.kept(box(1.8, 1.4, 1.8)), stone, [7.6, 0.7, 6.8], [-0.15, 0.2, 0.35]);
add(block, 'rubble_e', seabed.kept(box(1.2, 0.8, 1.2)), stone, [9.4, 0.4, 5.6], [0.3, 1.1, 0.1]);

// Three shards among the rubble: tetrahedra of 1.3, 1 and 1.6 units.
add(block, 'shard_a', seabed.tetra(1.3), stone, [6.2, 2, 7.6], [0.4, 0.3, 0.9]);
add(block, 'shard_b', seabed.tetra(1), stone, [3.6, 0.8, 5.9], [1.1, 0.2, 0.3]);
add(block, 'shard_c', seabed.tetra(1.6), stone, [7.2, 3.6, 4.4], [0.7, 1.4, 0.2]);

// The coral crusts: unit polyhedra with their size on the node, squashed
// to a third or a half of their spread, on the tier tops' edges (y = 7,
// 13 and 19 are the three tier tops), two on the tiers' faces (16 and 17,
// thin on x) and three among the rubble (13 to 15).
const CORAL = [
  ['coral_01', seabed.ico, [1.92, 0.88, 1.92], [-8.6, 7.1, -7.6], [0.3, 0.2, 0.1]],
  ['coral_02', seabed.ico, [1.82, 0.7, 1.4], [-3, 7, -8.1], [0.1, 0.8, 0]],
  ['coral_03', seabed.octa, [1.68, 0.72, 1.44], [6.5, 7, -7.4], [0.2, 0.4, 0.1]],
  ['coral_04', seabed.ico, [1.65, 0.75, 2.1], [-8.7, 7.1, 6.8], [0.5, 0.1, 0.2]],
  ['coral_05', seabed.octa, [0.78, 0.91, 2.08], [8.6, 6.9, -2], [0, 0.6, 0.3]],
  ['coral_06', seabed.ico, [1.69, 0.715, 1.43], [-6.7, 13, -5.7], [0.2, 0.9, 0.1]],
  ['coral_07', seabed.octa, [1.32, 0.77, 1.32], [5.6, 13, -5.4], [0.4, 0.2, 0]],
  ['coral_08', seabed.ico, [1.2, 0.6, 1.68], [-6.8, 13.1, 4.4], [0.1, 0.4, 0.5]],
  ['coral_09', seabed.octa, [1.5, 0.6, 1], [0.6, 13, 4.6], [0.3, 0.1, 0.2]],
  ['coral_10', seabed.ico, [1.68, 0.84, 1.68], [-4.6, 19.1, -3.6], [0.6, 0.3, 0.1]],
  ['coral_11', seabed.octa, [1.43, 0.88, 1.21], [2.6, 19, 2.5], [0.2, 0.7, 0.4]],
  ['coral_12', seabed.ico, [1.6, 0.45, 1], [-1, 19.1, 2.7], [0.1, 0.1, 0.1]],
  ['coral_13', seabed.octa, [1.54, 1.26, 1.54], [2.9, 7.6, 3.6], [0.4, 0.6, 0.2]],
  ['coral_14', seabed.ico, [1.68, 0.6, 1.44], [6.1, 0.9, 5.4], [0, 0.3, 0.6]],
  ['coral_15', seabed.octa, [1, 1, 1.3], [7.9, 1.7, 3.6], [0.5, 0, 0.3]],
  ['coral_16', seabed.octa, [0.48, 1.44, 1.8], [9, 3.4, -5], [0, 0.2, 0]],
  ['coral_17', seabed.octa, [0.44, 1.43, 1.43], [-9, 4.2, -1.5], [0, 0.1, 0.3]],
];
for (const [name, shape, size, at, tilt] of CORAL) add(block, name, shape(), coral, at, tilt, size);

// The grid factor on the root, baked with each placement into its buffer;
// then the lift, in the buffers, off the lowest corner.
block.scale.setScalar(GRID);
seabed.bake(block);
const floor = new THREE.Box3().setFromObject(block).min.y;
block.traverse((o) => o.isMesh && o.geometry.translate(0, -floor, 0));

const { drawn, k } = seabed.stand(block, FOOTPRINT, { drawn: DRAWN });
console.log(
  `env_ruin_block: lifted ${(-floor).toFixed(5)}, drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)})`
);
await exportGlb(block, 'env-ruin-block.glb');
