/**
 * The ruin dome shard — 40 m of footprint (`ENVIRONMENT_PROPS`,
 * packages/frontend/src/game/environment.ts), the largest thing standing
 * in the Coral Ruins.
 *
 * "Coral Ruins | env-ruin-dome-shard | 40 m | 16 m | ≤ 600 | none ... ruin
 * props carry the geometric patterns of art-direction.md's 'Environmental
 * Shapes' — right angles, terraces, a civilisation's worth of coral growth
 * over them" (docs/asset-prompts-3d.md, Block 4), under ENV STYLE: "Natural
 * or ruined form — stone, coral ... pressure-scarred and ancient; nothing
 * manufactured ... low-poly with crisp facets, at most two materials", no
 * light of any kind, and the checklist's "nothing that could be mistaken
 * for a structure". Two materials, 508 triangles, 15.78 m tall by 40 by
 * 15.6 across at its 40 m by intake's measure (`sizeM`); the row's height
 * is this file's (#883).
 *
 * Authored here rather than ported (#883, decided on #879). The approved
 * export was a whole closed dome, sixteen meridians all the way round and
 * double-walled, which the slug and the checklist both refuse: a Bastion
 * is "a large pressure dome", and an intact one on the seabed is a
 * structure until proved otherwise. What stands now is a broken piece of
 * one, and no part of it is a table: every number below is a formula of
 * the dome it was cut from, so the piece can be re-cut by editing `TEAR`.
 *
 * - The dome: a spheroid of radius 22.07 m at the foot and 15.9 m at the
 *   crown (0.72 of the radius), a 44 m dome, of which the shard keeps 130°
 *   of the foot, ±65° about its middle. The chord of that arc is the
 *   footprint, 40 m to the float, so the two ends of the arc are the widest
 *   thing in the file and `stand` finds ×1.000. The dome's axis sits 15.6 m
 *   behind the middle of the foot and the shell leans in toward it as it
 *   rises, so at the 55° camera the piece reads as a bowl fragment from any
 *   yaw — convex outside, concave in — and never as a wall.
 * - `shell`, in `stone_dark`: a closed solid 1.3 m thick — an outer skin,
 *   an inner skin 1.3 m inside it, the torn top between the two, the two
 *   cut ends of the arc, and the foot facing down. Thirteen meridians 10.8°
 *   apart, rings every fifth of the way to the crown (`LEVEL`), and the
 *   tear is one height a meridian (`TEAR`, as a fraction of the way to the
 *   crown): 0.74 at the fifth meridian, down to 0.17 and 0.12 at the two
 *   ends, a notch at the seventh and a tooth at the eleventh. A column's
 *   skin between two full rings is two triangles; above the last ring both
 *   its meridians share it is one polygon fanned from the lower meridian's
 *   torn top (`cap`), so a tear that climbs three rings inside one column
 *   is three facets and not a sliver. Above the foot every ring is pushed
 *   in or out by up to 0.35 m a meridian (`SCAR`), the pressure scarring;
 *   the foot is the spheroid's own, and the four rib meridians are left
 *   unpushed so a rib lies flat on its skin.
 * - Four `rib_*` and one `band`, in `stone_dark`: stone courses 2.2 by 1.3 m
 *   in section lofted up a meridian, 1.7 by 1.1 m round the parallel at
 *   0.43, each one bar of stations stitched into four walls and two caps
 *   (`bar`) and buried a quarter metre in the skin, so a course follows its
 *   curve without a step at a joint. Each rib stops its own way, which is
 *   what says "broken" at the camera's distance: `rib_a` (−43°) a ring
 *   under the tear, `rib_b` (−11°) two metres past it, standing proud of
 *   the torn edge, `rib_c` (+33°) broken off a fifth of the way up with
 *   bare shell above it, `rib_d` (+11°) a ring and a half short. The band
 *   runs from the third column to halfway across the eighth and ends short
 *   of the shell at both ends.
 * - The fallen pieces, in `stone_dark`: two chunks of shell and a length of
 *   rib inside the arc, one chunk outside it — a box tipped on the ground
 *   and grounded on its lowest corner (`fallen`) — and two tetrahedral
 *   shards grounded the same way.
 * - Nine `coral_NN`, in `coral_stone`: four icosahedra and five octahedra
 *   squashed flat and laid on a surface with their flat axis along its
 *   normal (`crust`): four round the foot outside, two on the torn edge,
 *   one on `rib_b`, one on the inner skin, one on the largest fallen chunk.
 *
 * Every face faces its surface — the outer skin out, the inner in, the tear
 * up its meridian, the ends along the arc, the foot down, every brick and
 * shard a positive volume — and the script checks each triangle of the
 * shell against the dome it was cut from before it writes anything.
 * Intake's bake is single-sided, and #878 found 64 wrong-facing triangles
 * in the old file that its two-sided `stone_dark` had hidden at runtime;
 * the material is one-sided here for that reason (seabed.mjs `stoneDark`),
 * so a fault the check misses shows in the maps rather than in nothing.
 *
 * The root is `env_ruin_dome_shard`, an identity: every placement is baked
 * into its buffer as the ruin exports were (seabed.mjs `bake`), the whole
 * centred on its plan box and standing on y = 0, then held at 40 m
 * (seabed.mjs `stand`, with nothing to do). `diff.mjs env-ruin-dome-shard`
 * against the pre-#883 binary lists every part, which is the point.
 */
import { THREE, add, faceted, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 40;
const DRAWN = 40;
const MAX_TRIS = 600;

const stone = seabed.ground.stoneDark();
const coral = seabed.ground.coralStoneRuin();

const shard = new THREE.Group();
shard.name = 'env_ruin_dome_shard';

// The dome the shard is a piece of, with its axis on the origin and the
// piece on +z, and the piece: the arc, the rings, the tear, the scarring.
const ARC_DEG = 65;
const R = FOOTPRINT / 2 / Math.sin((ARC_DEG * Math.PI) / 180);
const H = 0.72 * R;
const T = 1.3;
const M = 12;
const LEVEL = 0.2;
const TEAR = [0.17, 0.31, 0.52, 0.67, 0.74, 0.69, 0.57, 0.65, 0.47, 0.36, 0.45, 0.28, 0.12];
const SCAR = [0.15, -0.3, 0, 0.35, -0.2, 0, 0.3, 0, -0.35, 0, 0.25, -0.15, 0.1];

const v3 = (p) => new THREE.Vector3(...p);
/** Bearing of column `j` (fractions allowed), from the middle of the arc. */
const theta = (j) => ((-ARC_DEG + (2 * ARC_DEG * j) / M) * Math.PI) / 180;
/** The scarring at (j, u): a meridian's push, ramped in over the first quarter of the height. */
function scar(j, u) {
  const a = Math.floor(j);
  const f = j - a;
  const s = f === 0 ? SCAR[a] : SCAR[a] * (1 - f) + SCAR[a + 1] * f;
  return s * Math.min(1, u / 0.25);
}
/** A point on a skin at bearing `j` and height fraction `u`: `inset` 0 for the outer, T for the inner. */
function skin(j, u, inset = 0) {
  const phi = (u * Math.PI) / 2;
  const r = (R - inset) * Math.cos(phi) + scar(j, u);
  const y = (H - inset) * Math.sin(phi);
  return [r * Math.sin(theta(j)), y, r * Math.cos(theta(j))];
}
/** The spheroid's outward normal at (j, u). */
function normal(j, u) {
  const [x, y, z] = skin(j, u);
  return new THREE.Vector3(x / (R * R), y / (H * H), z / (R * R)).normalize();
}
/** Up the meridian at (j, u), toward the crown. */
function upward(j, u) {
  const phi = (u * Math.PI) / 2;
  const t = theta(j);
  return new THREE.Vector3(
    -R * Math.sin(phi) * Math.sin(t),
    H * Math.cos(phi),
    -R * Math.sin(phi) * Math.cos(t)
  ).normalize();
}
/** Along the parallel at bearing `j`, toward +j. */
const along = (j) => new THREE.Vector3(Math.cos(theta(j)), 0, -Math.sin(theta(j)));

// ---------------------------------------------------------------------------
// The shell: a point per meridian per ring on each skin, then the stitch.
// ---------------------------------------------------------------------------
const pts = [];
const P = (p) => pts.push(p) - 1;
const kmax = TEAR.map((t) => Math.floor(t / LEVEL));
const O = [];
const I = [];
const TO = [];
const TI = [];
for (let j = 0; j <= M; j++) {
  O[j] = [];
  I[j] = [];
  for (let k = 0; k <= kmax[j]; k++) {
    O[j][k] = P(skin(j, k * LEVEL));
    I[j][k] = P(skin(j, k * LEVEL, T));
  }
  TO[j] = P(skin(j, TEAR[j]));
  TI[j] = P(skin(j, TEAR[j], T));
}

const tris = [];
const group = [];
const emit = (name, list) => {
  for (const t of list) {
    tris.push(t);
    group.push(name);
  }
};
const flip = ([a, b, c]) => [a, c, b];

/**
 * A column's skin above the last ring both its meridians share, as one
 * polygon — anticlockwise in (bearing, height) — fanned from the torn top
 * of the lower meridian, the one corner no other corner is in line with.
 */
function cap(j, S, TT) {
  const m = Math.min(kmax[j], kmax[j + 1]);
  const poly = [S[j][m], S[j + 1][m]];
  for (let k = m + 1; k <= kmax[j + 1]; k++) poly.push(S[j + 1][k]);
  poly.push(TT[j + 1], TT[j]);
  for (let k = kmax[j]; k > m; k--) poly.push(S[j][k]);
  const apex = poly.indexOf(kmax[j] <= kmax[j + 1] ? TT[j] : TT[j + 1]);
  const out = [];
  const n = poly.length;
  for (let i = 1; i + 1 < n; i++)
    out.push([poly[apex], poly[(apex + i) % n], poly[(apex + i + 1) % n]]);
  return out;
}

// Column by column: the outer skin's quads (foot to the last shared ring,
// wound outward, anticlockwise seen from above along the arc), the inner
// skin's the other way, each skin's cap, the torn top between the skins,
// and the foot between them facing down.
for (let j = 0; j < M; j++) {
  const m = Math.min(kmax[j], kmax[j + 1]);
  for (let k = 0; k < m; k++) {
    emit('outer', [
      [O[j][k], O[j + 1][k], O[j + 1][k + 1]],
      [O[j][k], O[j + 1][k + 1], O[j][k + 1]],
    ]);
    emit('inner', [
      flip([I[j][k], I[j + 1][k], I[j + 1][k + 1]]),
      flip([I[j][k], I[j + 1][k + 1], I[j][k + 1]]),
    ]);
  }
  emit('outer', cap(j, O, TO));
  emit('inner', cap(j, I, TI).map(flip));
  emit('tear', [
    [TO[j], TO[j + 1], TI[j + 1]],
    [TO[j], TI[j + 1], TI[j]],
  ]);
  emit('foot', [
    [O[j][0], I[j + 1][0], O[j + 1][0]],
    [O[j][0], I[j][0], I[j + 1][0]],
  ]);
}
// The two cut ends of the arc, ring by ring up to the torn top; the first
// faces back along the arc and the last forward.
function end(j, outward) {
  const co = [...O[j], TO[j]];
  const ci = [...I[j], TI[j]];
  const out = [];
  for (let k = 0; k + 1 < co.length; k++) {
    const a = [co[k], co[k + 1], ci[k + 1]];
    const b = [co[k], ci[k + 1], ci[k]];
    out.push(outward ? a : flip(a), outward ? b : flip(b));
  }
  return out;
}
emit('end0', end(0, true));
emit('endM', end(M, false));

add(shard, 'shell', faceted(pts, tris), stone);

// ---------------------------------------------------------------------------
// Bars and bricks: the ribs, the band and the fallen pieces.
// ---------------------------------------------------------------------------
/**
 * A bar lofted along its stations — each a centre and the two full-width
 * section vectors, `ex` across and `ey` through — stitched by seabed.mjs
 * `chunk`'s faces: four walls a segment and a cap at each end. The
 * stations' frames are right-handed with the bar's direction, which is
 * what `chunk`'s winding assumes, and the volume check below holds it to.
 */
function bar(stations) {
  const corners = [];
  for (const [c, ex, ey] of stations) {
    const C = v3(c);
    const X = v3(ex);
    const Y = v3(ey);
    // Round the section the way `chunk` reads a ring: clockwise seen from
    // the bar's far end.
    for (const [sx, sy] of [
      [-1, -1],
      [-1, 1],
      [1, 1],
      [1, -1],
    ])
      corners.push(
        C.clone()
          .addScaledVector(X, sx / 2)
          .addScaledVector(Y, sy / 2)
          .toArray()
      );
  }
  const ring = (i) => [4 * i, 4 * i + 1, 4 * i + 2, 4 * i + 3];
  const faces = [];
  for (let s = 0; s + 1 < stations.length; s++) {
    const f = seabed.chunk(ring(s), ring(s + 1));
    if (s === 0) faces.push(f[2]);
    faces.push(f[0], f[1], f[4], f[5]);
    if (s + 2 === stations.length) faces.push(f[3]);
  }
  return faceted(corners, seabed.fan(faces));
}
/** A rib's stations up meridian `j` at heights `us`, laid on the outer skin. */
function rib(name, j, us, { w = 2.2, th = 1.3, bury = 0.25 } = {}) {
  const stations = us.map((u) => {
    const n = normal(j, u);
    const c = v3(skin(j, u)).addScaledVector(n, th / 2 - bury);
    const ex = n.clone().cross(upward(j, u)).normalize().multiplyScalar(w);
    return [c.toArray(), ex.toArray(), n.clone().multiplyScalar(th).toArray()];
  });
  add(shard, name, bar(stations), stone);
}
/** A band's stations along the parallel at `u` through columns `js`. */
function band(name, js, u, { w = 1.7, th = 1.1, bury = 0.25 } = {}) {
  const stations = js.map((j) => {
    const n = normal(j, u);
    const c = v3(skin(j, u)).addScaledVector(n, th / 2 - bury);
    const ex = n.clone().cross(along(j)).normalize().multiplyScalar(w);
    return [c.toArray(), ex.toArray(), n.clone().multiplyScalar(th).toArray()];
  });
  add(shard, name, bar(stations), stone);
}
/** A box fallen on the ground: its size, where in plan, its tilt; its lowest corner on y = 0. */
function fallen(name, [w, h, d], [x, z], euler) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...euler));
  const ex = new THREE.Vector3(w, 0, 0).applyMatrix4(m);
  const ey = new THREE.Vector3(0, h, 0).applyMatrix4(m);
  const ez = new THREE.Vector3(0, 0, d).applyMatrix4(m);
  const drop = (Math.abs(ex.y) + Math.abs(ey.y) + Math.abs(ez.y)) / 2;
  const centre = new THREE.Vector3(x, drop, z);
  add(
    shard,
    name,
    bar([
      [centre.clone().addScaledVector(ez, -0.5).toArray(), ex.toArray(), ey.toArray()],
      [centre.clone().addScaledVector(ez, 0.5).toArray(), ex.toArray(), ey.toArray()],
    ]),
    stone
  );
  return { centre, ex, ey, ez };
}
/** A tetrahedral shard, grounded on its lowest corner. */
function shardPiece(name, size, [x, z], tilt) {
  const mesh = add(shard, name, seabed.tetra(size), stone, [x, 0, z], tilt);
  mesh.updateMatrixWorld(true);
  mesh.position.y -= new THREE.Box3().setFromObject(mesh, true).min.y;
}

rib('rib_a', 2, [0.02, 0.18, 0.34, 0.49]);
rib('rib_b', 5, [0.02, 0.2, 0.39, 0.58, 0.76]);
rib('rib_c', 9, [0.02, 0.21]);
rib('rib_d', 7, [0.02, 0.18, 0.34, 0.5]);
band('band', [2.3, 3.5, 4.8, 6.2, 7.5], 0.43);

const chunkA = fallen('chunk_a', [5.6, 1.3, 4.2], [-7.5, 14.5], [0.18, 0.6, -0.12]);
fallen('chunk_b', [3.6, 1.2, 2.8], [6, 16.5], [-0.1, -0.4, 0.25]);
fallen('chunk_c', [2.8, 1.1, 2.2], [13.5, 20.5], [0.14, 0.9, -0.2]);
fallen('rib_fallen', [1.9, 1.2, 5.4], [11.5, 13], [0.08, 1.1, 0.05]);
shardPiece('shard_a', 1.5, [-13, 12.5], [0.4, 0.3, 0.9]);
shardPiece('shard_b', 1.1, [2, 12], [1.1, 0.2, 0.3]);

// ---------------------------------------------------------------------------
// The coral crusts: a unit polyhedron, squashed flat, laid on a surface with
// its flat axis along the surface's normal and spun about it.
// ---------------------------------------------------------------------------
function crust(name, shape, size, at, n, spin) {
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    n.clone().normalize()
  );
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  add(shard, name, shape(), coral, at.toArray(), [e.x, e.y, e.z], size);
}
const onOuter = (j, u, lift = 0.15) => v3(skin(j, u)).addScaledVector(normal(j, u), lift);
const onInner = (j, u, lift = 0.15) => v3(skin(j, u, T)).addScaledVector(normal(j, u), -lift);
const onTear = (j) =>
  v3(skin(j, TEAR[j]))
    .add(v3(skin(j, TEAR[j], T)))
    .multiplyScalar(0.5);

crust('coral_01', seabed.ico, [1.6, 0.45, 1.3], onOuter(1.4, 0.12), normal(1.4, 0.12), 0.4);
crust('coral_02', seabed.octa, [1.4, 0.5, 1.0], onOuter(3.6, 0.15), normal(3.6, 0.15), 1.2);
crust('coral_03', seabed.ico, [1.3, 0.4, 1.5], onOuter(8.4, 0.11), normal(8.4, 0.11), 2.1);
crust('coral_04', seabed.octa, [1.3, 0.55, 1.3], onOuter(10.7, 0.13), normal(10.7, 0.13), 0.7);
crust('coral_05', seabed.octa, [1.3, 0.4, 0.9], onTear(4), upward(4, TEAR[4]), 0.3);
crust('coral_06', seabed.octa, [1.0, 0.4, 1.0], onTear(9), upward(9, TEAR[9]), 1.9);
crust('coral_07', seabed.octa, [1.0, 0.35, 0.85], onOuter(5, 0.31, 1.15), normal(5, 0.31), 2.6);
crust('coral_08', seabed.ico, [0.9, 0.3, 1.0], onInner(5.5, 0.16), normal(5.5, 0.16).negate(), 1.4);
crust(
  'coral_09',
  seabed.ico,
  [0.9, 0.3, 1.1],
  chunkA.centre
    .clone()
    .addScaledVector(chunkA.ey, 0.5)
    .addScaledVector(chunkA.ey.clone().normalize(), 0.1),
  chunkA.ey,
  0.9
);

// ---------------------------------------------------------------------------
// Bake, centre on the plan box, check every face, hold the footprint.
// ---------------------------------------------------------------------------
seabed.bake(shard);
const planBox = new THREE.Box3().setFromObject(shard);
const axis = planBox.getCenter(new THREE.Vector3()); // the dome's axis lands at (−axis.x, ·, −axis.z)
shard.traverse((o) => o.isMesh && o.geometry.translate(-axis.x, 0, -axis.z));
if (Math.abs(planBox.min.y) > 1e-4)
  throw new Error(
    `env_ruin_dome_shard: the lowest point sits at y = ${planBox.min.y}, not the ground`
  );

// Every face of the shell against the dome it was cut from, by group.
{
  const shell = shard.getObjectByName('shell').geometry.attributes.position;
  let bad = 0;
  let volume = 0;
  for (let t = 0; t < tris.length; t++) {
    const a = new THREE.Vector3().fromBufferAttribute(shell, 3 * t);
    const b = new THREE.Vector3().fromBufferAttribute(shell, 3 * t + 1);
    const c = new THREE.Vector3().fromBufferAttribute(shell, 3 * t + 2);
    volume += a.dot(b.clone().cross(c)) / 6;
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const ctr = a
      .clone()
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3);
    const x = ctr.x + axis.x; // back in the dome's frame, axis on the origin
    const z = ctr.z + axis.z;
    const th = Math.atan2(x, z);
    const N = new THREE.Vector3(x / (R * R), ctr.y / (H * H), z / (R * R)).normalize();
    const phi = Math.asin(Math.min(1, ctr.y / H));
    const up = new THREE.Vector3(
      -R * Math.sin(phi) * Math.sin(th),
      H * Math.cos(phi),
      -R * Math.sin(phi) * Math.cos(th)
    ).normalize();
    const arc = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
    const ok = {
      outer: n.dot(N) > 0,
      inner: n.dot(N) < 0,
      tear: n.dot(up) > 0,
      foot: n.y < 0,
      end0: n.dot(arc) < 0,
      endM: n.dot(arc) > 0,
    }[group[t]];
    if (!ok) {
      bad++;
      console.error(`  shell triangle ${t} (${group[t]}) faces the wrong way`);
    }
  }
  if (bad || volume <= 0)
    throw new Error(`env_ruin_dome_shard: ${bad} shell triangles wrong-facing, volume ${volume}`);
  console.log(`env_ruin_dome_shard: shell ${tris.length} tris, ${volume.toFixed(1)} m³ enclosed`);
}
// Every bar and shard is a convex solid wound outward: a positive volume.
shard.traverse((o) => {
  if (!o.isMesh || o.name === 'shell' || o.material === coral) return;
  const p = o.geometry.attributes.position;
  let volume = 0;
  for (let t = 0; t < p.count / 3; t++) {
    const a = new THREE.Vector3().fromBufferAttribute(p, 3 * t);
    const b = new THREE.Vector3().fromBufferAttribute(p, 3 * t + 1);
    const c = new THREE.Vector3().fromBufferAttribute(p, 3 * t + 2);
    volume += a.dot(b.clone().cross(c)) / 6;
  }
  if (volume <= 0)
    throw new Error(`env_ruin_dome_shard: ${o.name} is wound inside out (${volume})`);
});

let total = 0;
shard.traverse((o) => o.isMesh && (total += o.geometry.attributes.position.count / 3));
if (total > MAX_TRIS)
  throw new Error(`env_ruin_dome_shard: ${total} tris over the row's ${MAX_TRIS}`);

const { drawn, k } = seabed.stand(shard, FOOTPRINT, { drawn: DRAWN });
const size = new THREE.Box3().setFromObject(shard).getSize(new THREE.Vector3());
console.log(
  `env_ruin_dome_shard: drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)}), ` +
    `${size.y.toFixed(2)} m tall, ${size.z.toFixed(2)} m deep, ${total} tris`
);
await exportGlb(shard, 'env-ruin-dome-shard.glb');
