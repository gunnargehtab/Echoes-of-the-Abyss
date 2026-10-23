/**
 * The nodule bed — 12 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the seabed presence of a
 * resource field (#1555): a patch of the polymetallic nodules every navy
 * mines ("Polymetallic seabed nodules — hulls, plate, structures",
 * docs/economy.md §2). A field is 80 m of mining range and 60–140 m on the
 * chart, so several beds stand inside one; a bed is a piece of a field and
 * never the field.
 *
 * "Resource field (any biome) | env-nodule-bed | 12 m | 2 m | ≤ 240 |
 * `ore-trace`, glint facets" (docs/asset-prompts-3d.md, Block 4), under ENV
 * STYLE: "Natural or ruined form — stone ... pressure-scarred and ancient;
 * nothing manufactured ... low-poly with crisp facets, at most two
 * materials (three for env-coral-growth and env-nodule-bed: two stones
 * under a light)". Three materials, 240 triangles, 1.61 m tall by 12 by
 * 6.0 across at its 12 m by intake's measure (`sizeM`), which takes
 * `--world-light ore --max-materials 3` for this row.
 *
 * Authored as a formula rather than ported: there is no export. Every
 * number below is drawn from one seeded stream (seabed.mjs `seeded`, seed
 * 1555) in the order the parts are built, so the file is the same on every
 * machine and `npm run check:models` holds the script to it. The whole is
 * built at a nominal size and held at the footprint by ×1.0591 before the
 * bake (seabed.mjs `bake`), so the root is an identity and seabed.mjs
 * `stand` finds ×1.000; the figures below are the file's, after that fit.
 * What stands:
 *
 * - `mound`, in `silt_drift`: a low drift of silt, three rings of ten
 *   corners from a foot at y = 0 up to a crown at 1.27 m — an ellipse
 *   10.6 by 5.3 m at the foot, a shoulder at 0.32 m pulled along +x and a
 *   little toward −z, a top ring at 0.85 m pulled further, so the drift
 *   lies down-current rather than sitting as a disc; every corner pushed in
 *   or out by up to 16 % of its radius at the foot and 14 and 12 % above,
 *   and lifted or dropped by up to 0.1 m on the shoulder and 0.08 m on the
 *   top, which hummocks the flank and breaks the foot's outline. The foot's
 *   ±x corners are unpushed, so the drift is its own length. The bands are
 *   seabed.mjs `column`'s with its foot cap dropped (the foot is in the
 *   ground) and the top ring fanned to the crown; the script checks every
 *   facet faces out of the drift before it writes. 50 triangles. The drift
 *   is the paler of the two materials — `silt-drift` is 1.73× `stone-silt`
 *   in linear luminance, a token added for it — because the runtime scales
 *   a prop's brightest material to its ceiling and the rest by ratio
 *   (environmentModels.ts `ENV_LUMINANCE_CEILING`): on `stone_silt` the
 *   lumps came out 18 % brighter than the drift and read as pale boulders;
 *   now they sit at 0.68 of it, dark ore on silt.
 * - Twenty-three `nodule_NN`, in `stone_dark`, every one an octahedron
 *   (seabed.mjs `octa`, 8 triangles): eight at 1.2 m across, three at
 *   1.15, then 1.1, 1.0, 0.9 and 0.8 — the fifteen on the drift — and
 *   eight loose from 0.55 m down to 0.3 — each squashed to 0.7–0.9 of its
 *   width, stretched up to 15 % one way, yawed and tipped up to 0.25 rad so
 *   no two show the same facets. 184 triangles. A lump whose centre would
 *   stand in plan within nine tenths of the pair's mean width of one
 *   already set is redrawn a bearing on; `contacts.mjs` lists no pair of
 *   lumps that meet, only the mound against each of the fifteen on it and
 *   against `nodule_21`, which touches its skirt from outside.
 *   - The fifteen on the drift are set at a bearing that steps round by the
 *     golden angle, ±0.5 rad drawn, and at a radius the stream draws biased
 *     to the centre (r ∝ u^0.75) and capped nearer the centre the larger
 *     the lump, so the biggest crowd the crown; then sunk 25–40 % of their
 *     own height into the drift's surface where they stand (a ray down
 *     onto the mound's facets), but never under y = 0 — `nodule_05` and
 *     `nodule_15` stand where the skirt is thinner than their sink and so
 *     rest on the floor.
 *   - The eight loose lumps, the smallest third, are spaced evenly round
 *     the foot from +x, ±0.3 rad drawn, every one with its bottom on y = 0.
 *     The pair off the ends (`nodule_16` at x 5.50–6.03, `nodule_20` at
 *     −5.97 to −5.67) lie at 1.1 of the foot's radius and are what makes the
 *     footprint 12 m; the other six are drawn at 0.85–1.1 of it and stepped
 *     out by 5 % of the foot at a time until half their height stands clear
 *     of the skirt, so none is buried in it. `nodule_17`, `_18` and `_19`
 *     lie past the foot's +z side and `_22` and `_23` past its −z side, on
 *     the floor, which is the edge thinning to loose lumps and the outline
 *     breaking. Ten lumps in all touch the floor.
 * - Three `nodule_NN_glint`, in `ore_trace`: the licensed light,
 *   docs/style-neon-noir.md "World light" `ore-trace` — "a dull glint in
 *   the crust of a few nodules on each bed: facets the size of a lump,
 *   never a lit drift" — at 0.08 effective emissive luminance (#7A5634 is
 *   0.1104 linear, at a strength of 0.725), the dimmest family, under the
 *   ember (rule 2), static (rule 4). On the first, fourth and seventh of
 *   the eight largest lumps (`nodule_01`, `_04`, `_07`), a seam over one
 *   ridge each: the lump's most upward-facing facet and its most
 *   upward-facing neighbour, two triangles, each inset within its own
 *   facet's outline — the shared ridge shortened by 6 % at each end, the
 *   far corner pulled 12 % of the way to the ridge's middle — and 2 cm
 *   proud of both facets (the ridge corners along the two normals'
 *   bisector). No corner leaves its facet: every corner stands 0.024 to
 *   0.026 m off its own lump, and the nearest corner to the drift is
 *   0.06 m from it (`nodule_04`), so `contacts.mjs` lists no glint pair.
 *   Nothing on the drift and nothing on the loose floor lumps. kit.mjs
 *   `lightAudit` at the export reads 1.0 m² facing up over the three,
 *   0.30 to 0.33 m² of plan each, none hidden and none floating; the lit
 *   share of the bed's plan is 2.2 %. Nothing draws from the stream for a
 *   glint, so the scatter is the one the review measured.
 *
 * Measured from the conn camera (tools/hull-renders/inspect.mjs, bearing
 * 90, elevation 55): the lumps are 24.5–25.1 % of the bed's pixels by the
 * two masks taken of it, the review's and this script's own (5.9 % at the
 * commit before this). The lumps' value against the drift's is two
 * measures: 0.68× by linear material luminance (`stone_dark` 0.00892 over
 * `silt_drift` 0.01306, the ratio the runtime's ceiling keeps), and 0.64×
 * as mean sRGB luma on the lit sheet, 0.48× linear there, where shading
 * widens the gap.
 *
 * The root is `env_nodule_bed`, an identity: every placement and the fit
 * are baked into the buffers as the ruins' are, the whole standing on y = 0
 * at the foot ring and the loose lumps. Nothing in it is a table, so the
 * bed can be re-drifted by editing `SEED` or the rings.
 */
import { THREE, add, faceted, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 12;
const MAX_TRIS = 240;
const SEED = 1555;

const silt = seabed.ground.siltDrift();
const stone = seabed.ground.stoneDark();
const glint = seabed.ground.oreTrace();

const bed = new THREE.Group();
bed.name = 'env_nodule_bed';

const draw = seabed.seeded(SEED);

// --- the drift --------------------------------------------------------------
// Rings from the foot up: semi-axes `a` on x and `b` on z, the ring's centre
// `cx`, `cz`, and how far the stream may push a corner (`jitter` of its
// radius, `lift` in metres). Every corner is pushed; the loose lumps past
// the foot are what set the footprint, not the foot.
const FACETS = 10;
const RINGS = [
  { y: 0, a: 5.0, b: 2.5, cx: 0, cz: 0, jitter: 0.16, lift: 0 },
  { y: 0.3, a: 3.8, b: 1.9, cx: 0.4, cz: -0.2, jitter: 0.14, lift: 0.1 },
  { y: 0.8, a: 1.7, b: 0.9, cx: 0.8, cz: -0.15, jitter: 0.12, lift: 0.08 },
];
const CROWN = [0.9, 1.2, -0.1];

// Corners run from +x toward −z, the sense seabed.mjs `column` faces out.
const ringPoints = RINGS.map((ring, n) =>
  Array.from({ length: FACETS }, (_, k) => {
    const t = (-2 * Math.PI * k) / FACETS;
    const pinned = n === 0 && (k === 0 || k === FACETS / 2);
    const push = pinned ? 1 : 1 + draw.between(-ring.jitter, ring.jitter);
    const lift = ring.lift ? draw.between(-ring.lift, ring.lift) : 0;
    return [
      ring.cx + ring.a * push * Math.cos(t),
      ring.y + lift,
      ring.cz + ring.b * push * Math.sin(t),
    ];
  })
);
const points = [...ringPoints.flat(), CROWN];
const index = (n) => Array.from({ length: FACETS }, (_, k) => n * FACETS + k);
const crown = points.length - 1;
const top = index(RINGS.length - 1);
const faces = [
  // `column` caps the foot first, FACETS − 2 triangles; the foot is in the ground.
  ...seabed.column(RINGS.map((_, n) => index(n))).slice(FACETS - 2),
  ...top.map((i, k) => [i, top[(k + 1) % FACETS], crown]),
];
const mound = add(bed, 'mound', faceted(points, faces), silt);

// Every facet faces out of the drift: its normal points away from a point
// inside it, which for a star-shaped mound is one test.
{
  const inside = new THREE.Vector3(0.5, 0.2, 0);
  const p = mound.geometry.attributes.position;
  const nrm = mound.geometry.attributes.normal;
  for (let t = 0; t < p.count / 3; t++) {
    const c = new THREE.Vector3();
    for (let k = 0; k < 3; k++) c.add(new THREE.Vector3().fromBufferAttribute(p, 3 * t + k));
    c.divideScalar(3);
    const n = new THREE.Vector3().fromBufferAttribute(nrm, 3 * t);
    if (n.dot(c.sub(inside)) <= 0)
      throw new Error(`env_nodule_bed: mound facet ${t} faces into the drift`);
  }
}

/** The drift's surface height at (x, z): a ray down onto the mound's facets, 0 off it. */
const caster = new THREE.Raycaster();
function surface(x, z) {
  caster.set(new THREE.Vector3(x, 10, z), new THREE.Vector3(0, -1, 0));
  const hit = caster.intersectObject(mound, false)[0];
  return hit ? hit.point.y : 0;
}
/** The foot ellipse's radius at bearing `t`, before the corners' push. */
const foot = (t) => {
  const { a, b } = RINGS[0];
  return (a * b) / Math.hypot(b * Math.cos(t), a * Math.sin(t));
};

// --- the nodules -------------------------------------------------------------
// Widths across, largest first; the stream draws each lump's shape, then
// its place, in this order. An octahedron at radius 1 spans 2 on each axis.
const WIDTHS = [
  1.1336, 1.1336, 1.1336, 1.1336, 1.1336, 1.1336, 1.1336, 1.1336, 1.0863, 1.0863, 1.0863, 1.0391,
  0.9446, 0.8502, 0.7557, 0.5196, 0.4723, 0.4251, 0.3968, 0.359, 0.3306, 0.3023, 0.2834,
];
// The smallest third lie loose at the edge, from this index on.
const EDGE = 15;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const set = [];
WIDTHS.forEach((width, i) => {
  const s = width / 2;
  const squash = draw.between(0.7, 0.9);
  const stretch = draw.between(0.85, 1.15);
  const yaw = draw() * 2 * Math.PI;
  const tip = [draw.between(-0.25, 0.25), yaw, draw.between(-0.25, 0.25)];
  const name = `nodule_${String(i + 1).padStart(2, '0')}`;
  const lump = add(
    bed,
    name,
    seabed.octa([s * stretch, s * squash, s / stretch]),
    stone,
    [0, 0, 0],
    tip
  );
  lump.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(lump, true);
  const height = box.max.y - box.min.y;
  const edge = i >= EDGE;
  // Bearing and radius, redrawn while the lump would crowd one already set.
  let x;
  let z;
  for (let tries = 0; ; tries++) {
    // Loose lumps are spaced evenly round the foot from +x, so one lies off
    // each end of the drift and the pair carry the footprint; the rest step
    // round by the golden angle.
    const t = edge
      ? ((i - EDGE) * 2 * Math.PI) / (WIDTHS.length - EDGE) + draw.between(-0.3, 0.3) + tries
      : i * GOLDEN + draw.between(-0.5, 0.5) + tries;
    let r;
    if (edge) {
      // Out at the foot — the end pair at 1.1 of it, so the footprint is the
      // drift's length plus one loose lump each end — then stepped outward
      // until half its height stands clear of the skirt, so a loose lump is
      // never buried in it.
      const end = (i - EDGE) % ((WIDTHS.length - EDGE) / 2) === 0;
      r = (end ? 1.1 : draw.between(0.85, 1.1)) * foot(t);
      while (surface(r * Math.cos(t), r * Math.sin(t)) > 0.5 * height) r += 0.05 * foot(t);
    } else {
      const reach = 0.9 - 0.3 * (width / WIDTHS[0]);
      r = (0.05 + reach * draw() ** 0.75) * foot(t);
    }
    x = r * Math.cos(t);
    z = r * Math.sin(t);
    const clear = set.every((o) => Math.hypot(o.x - x, o.z - z) > 0.9 * ((o.width + width) / 2));
    if (clear) break;
    if (tries > 40) throw new Error(`env_nodule_bed: nowhere to set nodule ${i + 1}`);
  }
  // On the drift, sunk `sink` of its height into it where it stands and never
  // under the floor; at the edge, on the floor.
  const bottom = edge ? 0 : Math.max(surface(x, z) - draw.between(0.25, 0.4) * height, 0);
  lump.position.set(x, bottom - box.min.y, z);
  set.push({ x, z, width, lump });
});

// --- the glints ------------------------------------------------------------------
// `ore-trace` on three of the eight largest lumps, the first, fourth and
// seventh set, as a seam over one ridge each: the lump's most upward-facing
// facet and its most upward-facing neighbour, each facet's triangle inset
// within its own outline (the ridge shortened by RIDGE_IN at each end, the
// far corner pulled FAR_IN of the way to the ridge's middle), the two
// sharing the inset ridge, and the whole 2 cm proud of both facets. No
// corner leaves its facet, so the glint is the crust and not a card.
// Nothing draws from the stream here, so the scatter above is unchanged.
const GLINTS = [0, 3, 6];
const RIDGE_IN = 0.06;
const FAR_IN = 0.12;
const PROUD = 0.02;
for (const i of GLINTS) {
  const { lump } = set[i];
  lump.updateMatrixWorld(true);
  const p = lump.geometry.attributes.position;
  const facets = [];
  for (let t = 0; t < p.count / 3; t++) {
    const corners = [0, 1, 2].map((k) =>
      new THREE.Vector3().fromBufferAttribute(p, 3 * t + k).applyMatrix4(lump.matrixWorld)
    );
    const n = new THREE.Vector3()
      .subVectors(corners[1], corners[0])
      .cross(new THREE.Vector3().subVectors(corners[2], corners[0]))
      .normalize();
    facets.push({ corners, n });
  }
  const shared = (f, g) => f.corners.filter((c) => g.corners.some((d) => d.distanceTo(c) < 1e-6));
  const top = facets.reduce((a, f) => (f.n.y > a.n.y ? f : a));
  const next = facets
    .filter((f) => f !== top && shared(f, top).length === 2)
    .reduce((a, f) => (f.n.y > a.n.y ? f : a));
  const [e0, e1] = shared(top, next);
  const far = (f) =>
    f.corners.find((c) => c !== e0 && c !== e1 && !shared(f, { corners: [e0, e1] }).includes(c));
  const r0 = e0.clone().lerp(e1, RIDGE_IN);
  const r1 = e1.clone().lerp(e0, RIDGE_IN);
  const mid = r0.clone().add(r1).multiplyScalar(0.5);
  // 2 cm off both facets at the ridge: along the normals' bisector, which
  // stands at half the dihedral to each.
  const bisector = top.n.clone().add(next.n).normalize();
  const lift = PROUD / bisector.dot(top.n);
  const ridge = [r0, r1].map((v) => v.addScaledVector(bisector, lift).toArray());
  const tip = (f) => far(f).clone().lerp(mid, FAR_IN).addScaledVector(f.n, PROUD).toArray();
  const points = [ridge[0], ridge[1], tip(top), tip(next)];
  // Wind each triangle with its facet.
  const wound = (a, b, c, n) => {
    const [A, B, C] = [a, b, c].map((k) => new THREE.Vector3(...points[k]));
    const out = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A));
    return out.dot(n) > 0 ? [a, b, c] : [a, c, b];
  };
  add(
    bed,
    `${lump.name}_glint`,
    faceted(points, [wound(0, 1, 2, top.n), wound(1, 0, 3, next.n)]),
    glint
  );
}

// --- the fit, checks, then out ---------------------------------------------------
// Held at the footprint here, before the bake, so the root stays an identity
// and `stand` below finds nothing to do.
bed.updateMatrixWorld(true);
const extent = new THREE.Box3().setFromObject(bed, true).getSize(new THREE.Vector3());
const fit = FOOTPRINT / Math.max(extent.x, extent.z);
bed.scale.setScalar(fit);
seabed.bake(bed);
let total = 0;
let lowest = Infinity;
let onFloor = 0;
bed.traverse((o) => {
  if (!o.isMesh) return;
  const p = o.geometry.attributes.position;
  total += p.count / 3;
  let low = Infinity;
  for (let i = 0; i < p.count; i++) low = Math.min(low, p.getY(i));
  lowest = Math.min(lowest, low);
  if (o.name.startsWith('nodule') && low < 1e-6) onFloor++;
});
if (total > MAX_TRIS) throw new Error(`env_nodule_bed: ${total} tris over the row's ${MAX_TRIS}`);
if (Math.abs(lowest) > 1e-6)
  throw new Error(`env_nodule_bed: lowest vertex at ${lowest}, not on the floor`);
if (onFloor < WIDTHS.length - EDGE)
  throw new Error(`env_nodule_bed: ${onFloor} lumps on the floor, not ${WIDTHS.length - EDGE}`);

const { drawn, k } = seabed.stand(bed, FOOTPRINT, { drawn: FOOTPRINT });
const size = new THREE.Box3().setFromObject(bed).getSize(new THREE.Vector3());
console.log(
  `env_nodule_bed: fit ×${fit.toFixed(4)}, drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)}), ` +
    `${size.y.toFixed(2)} m tall, ${size.z.toFixed(2)} m deep, ${total} tris, ${onFloor} lumps on the floor`
);
await exportGlb(bed, 'env-nodule-bed.glb');
