/**
 * The nodule bed — 12 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the seabed presence of a
 * resource field (#1555): a patch of the polymetallic nodules every navy
 * mines ("Polymetallic seabed nodules — hulls, plate, structures",
 * docs/economy.md §2). A field is 80 m of mining range and 60–140 m on the
 * chart, so several beds stand inside one; a bed is a piece of a field and
 * never the field.
 *
 * "Resource field (any biome) | env-nodule-bed | 12 m | 2 m | ≤ 240 | none"
 * (docs/asset-prompts-3d.md, Block 4), under ENV STYLE: "Natural or ruined
 * form — stone ... pressure-scarred and ancient; nothing manufactured ...
 * low-poly with crisp facets, at most two materials", and no light of any
 * kind. Two materials, 194 triangles, 1.75 m tall by 12 by 9.0 across at
 * its 12 m by intake's measure (`sizeM`).
 *
 * Authored as a formula rather than ported: there is no export. Every
 * number below is drawn from one seeded stream (seabed.mjs `seeded`, seed
 * 1555) in the order the parts are built, so the file is the same on every
 * machine and `npm run check:models` holds the script to it. What stands:
 *
 * - `mound`, in `stone_silt`: a low drift of silt, three rings of ten
 *   corners from a foot at y = 0 up to a crown at 1.42 m — an ellipse 12
 *   by 8.8 m at the foot, a shoulder at 0.7 m pulled 0.5 m along +x and
 *   0.3 m toward −z, a top ring at 1.2 m pulled 0.9 and 0.2, so the drift
 *   lies down-current rather than sitting as a disc; every corner pushed
 *   in or out by up to 16 % of its radius at the foot and 14 and 12 %
 *   above, and lifted or dropped by up to 0.2 m on the shoulder and
 *   0.08 m on the top, which is what breaks the foot's outline and
 *   hummocks the flank. The foot's ±x corners are pinned to ±6 so the
 *   foot is the footprint to the float and seabed.mjs `stand` finds
 *   ×1.000. The bands are seabed.mjs `column`'s with its foot cap dropped
 *   (the foot is in the ground) and the top ring fanned to the crown; the
 *   script checks every facet faces out of the drift before it writes.
 *   50 triangles.
 * - Twelve `nodule_NN`, in `stone_dark`: the lumps, 1.2 m down to 0.3 m
 *   across — 1.2, 1.05, 0.9 and 0.8 m as icosahedra and the eight from
 *   0.7 m down as octahedra (seabed.mjs `ico`, `octa`) — each squashed to
 *   0.6–0.8 of its width, stretched up to 15 % one way, yawed and tipped
 *   up to 0.25 rad so no two show the same facets. Each is set on the
 *   drift at a bearing that steps round by the golden angle, ±0.5 rad
 *   drawn, so the twelve spread rather than bunch, and at a radius the
 *   stream draws biased to the centre (r ∝ u^0.75) and capped nearer the
 *   centre the larger the lump; then sunk 30–45 % of its own height into
 *   the drift's surface where it stands (a ray down onto the mound's
 *   facets), but never under y = 0: at the foot the drift is a few
 *   centimetres thick, so the small lumps there lie on the floor, loose,
 *   which is the edge thinning out. A lump whose centre would stand in
 *   plan within nine tenths of the pair's mean width of one already set is
 *   redrawn a bearing on; the test is on centres, so two stretched lumps
 *   can still touch, and `contacts.mjs` lists one such pair (`nodule_01`
 *   and `nodule_08`, a clump at the crown) beside the twelve mounts on the
 *   mound. 144 triangles.
 *
 * The root is `env_nodule_bed`, an identity: every placement is baked
 * into its buffer as the ruins' are (seabed.mjs `bake`), the whole
 * standing on y = 0 at the foot ring, then held at 12 m (seabed.mjs
 * `stand`, with nothing to do). Nothing in it is a table, so the bed can
 * be re-drifted by editing `SEED` or the rings.
 */
import { THREE, add, faceted, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 12;
const MAX_TRIS = 240;
const SEED = 1555;

const silt = seabed.ground.stoneSilt();
const stone = seabed.ground.stoneDark();

const bed = new THREE.Group();
bed.name = 'env_nodule_bed';

const draw = seabed.seeded(SEED);

// --- the drift --------------------------------------------------------------
// Rings from the foot up: semi-axes `a` on x and `b` on z, the ring's centre
// `cx` along x, and how far the stream may push a corner (`jitter` of its
// radius, `lift` in metres). The foot is unlifted and its ±x corners
// unpushed, so the footprint is the ellipse's own.
const FACETS = 10;
const RINGS = [
  { y: 0, a: 6, b: 4.4, cx: 0, cz: 0, jitter: 0.16, lift: 0 },
  { y: 0.7, a: 4.1, b: 2.9, cx: 0.5, cz: -0.3, jitter: 0.14, lift: 0.2 },
  { y: 1.2, a: 1.8, b: 1.2, cx: 0.9, cz: -0.2, jitter: 0.12, lift: 0.08 },
];
const CROWN = [1.1, 1.42, -0.1];

// Corners run from +x toward −z, the sense seabed.mjs `column` faces out.
const ringPoints = RINGS.map((ring, n) =>
  Array.from({ length: FACETS }, (_, k) => {
    const t = (-2 * Math.PI * k) / FACETS;
    const pinned = n === 0 && (k === 0 || k === FACETS / 2);
    const push = pinned ? 1 : 1 + draw.between(-ring.jitter, ring.jitter);
    const lift = pinned ? 0 : draw.between(-ring.lift, ring.lift);
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
  const inside = new THREE.Vector3(0.5, 0.3, 0);
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
/** The foot ellipse's radius at bearing `t`. */
const foot = (t) => {
  const { a, b } = RINGS[0];
  return (a * b) / Math.hypot(b * Math.cos(t), a * Math.sin(t));
};

// --- the nodules -------------------------------------------------------------
// Widths across, largest first; the stream draws each lump's place and
// shape in this order. An icosahedron at radius 1 spans 1.7019 between its
// widest corners, an octahedron 2 along its axes.
const WIDTHS = [1.2, 1.05, 0.9, 0.8, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.38, 0.3];
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const ICO_SPAN = 2 * (1.618034 / Math.hypot(1, 1.618034));
const set = [];
WIDTHS.forEach((width, i) => {
  // Bearing and radius, redrawn while the lump would crowd one already set.
  let x;
  let z;
  for (let tries = 0; ; tries++) {
    const t = i * GOLDEN + draw.between(-0.5, 0.5) + tries;
    const reach = 0.95 - 0.3 * (width / WIDTHS[0]);
    const r = (0.05 + reach * draw() ** 0.75) * foot(t);
    x = r * Math.cos(t);
    z = r * Math.sin(t);
    const clear = set.every((s) => Math.hypot(s.x - x, s.z - z) > 0.9 * ((s.width + width) / 2));
    if (clear) break;
    if (tries > 40) throw new Error(`env_nodule_bed: nowhere to set nodule ${i + 1}`);
  }
  const unit = width >= 0.75 ? ICO_SPAN : 2;
  const s = width / unit;
  const squash = draw.between(0.6, 0.8);
  const stretch = draw.between(0.85, 1.15);
  const scale = [s * stretch, s * squash, s / stretch];
  const geo = width >= 0.75 ? seabed.ico(scale) : seabed.octa(scale);
  const yaw = draw() * 2 * Math.PI;
  const tip = [draw.between(-0.25, 0.25), yaw, draw.between(-0.25, 0.25)];
  const sink = draw.between(0.3, 0.45);
  const name = `nodule_${String(i + 1).padStart(2, '0')}`;
  const lump = add(bed, name, geo, stone, [x, 0, z], tip);
  // Sunk `sink` of its height into the drift where it stands, never under the floor.
  lump.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(lump, true);
  const height = box.max.y - box.min.y;
  const bottom = Math.max(surface(x, z) - sink * height, 0);
  lump.position.y = bottom - box.min.y;
  set.push({ x, z, width });
});

// --- checks, then out ----------------------------------------------------------
seabed.bake(bed);
let total = 0;
let lowest = Infinity;
bed.traverse((o) => {
  if (!o.isMesh) return;
  const p = o.geometry.attributes.position;
  total += p.count / 3;
  for (let i = 0; i < p.count; i++) lowest = Math.min(lowest, p.getY(i));
});
if (total > MAX_TRIS) throw new Error(`env_nodule_bed: ${total} tris over the row's ${MAX_TRIS}`);
if (Math.abs(lowest) > 1e-6)
  throw new Error(`env_nodule_bed: lowest vertex at ${lowest}, not on the floor`);

const { drawn, k } = seabed.stand(bed, FOOTPRINT, { drawn: FOOTPRINT });
const size = new THREE.Box3().setFromObject(bed).getSize(new THREE.Vector3());
console.log(
  `env_nodule_bed: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)}), ` +
    `${size.y.toFixed(2)} m tall, ${size.z.toFixed(2)} m deep, ${total} tris`
);
await exportGlb(bed, 'env-nodule-bed.glb');
