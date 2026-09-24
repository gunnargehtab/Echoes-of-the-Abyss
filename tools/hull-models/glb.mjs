/**
 * Read a committed GLB back as what it is: named parts, each with its
 * material and its triangles in world space.
 *
 * Two things want this and neither can use three's GLTFLoader, which reads
 * through `fetch`, `self` and an image decoder Node does not have: the
 * round-trip check (check.mjs) compares a script's build against the file
 * it last wrote, and the outline step (tools/hull-maps/outlines.mjs) takes a
 * hull's plan section off the model that clads it. Every approved model is
 * GLTFExporter output — one buffer, float32 positions, indexed triangles,
 * no skins or morphs — so the parser is short, and it says so when handed
 * anything else rather than guessing.
 *
 * `sceneParts` produces the same shape from a live three.js scene, which is
 * what makes a build and its file comparable at all.
 */
import { readFileSync } from 'node:fs';

const MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

/**
 * A material's *values*, as glTF carries them and with glTF's own defaults
 * filled in — an omitted `metallicFactor` is 1, not absent. A name is not a
 * finish: #553's turret ports kept every material name and moved the values
 * under them (the Knights' `shadow_indigo` from #2C2244/0.25 to #3B2E5A/0.35,
 * emissive strengths written at 1 over files carrying 0.8 to 2.4), and every
 * tool that compared materials by name alone read that as no change (#646).
 * Colour is linear here, as the file has it; `diff.mjs` renders it sRGB.
 */
function finishOf(m) {
  const pbr = m.pbrMetallicRoughness ?? {};
  const base = pbr.baseColorFactor ?? [1, 1, 1, 1];
  return {
    colour: base.slice(0, 3),
    opacity: base[3] ?? 1,
    metalness: pbr.metallicFactor ?? 1,
    roughness: pbr.roughnessFactor ?? 1,
    emissive: m.emissiveFactor ?? [0, 0, 0],
    strength: m.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1,
    doubleSided: m.doubleSided === true,
    alpha: m.alphaMode ?? 'OPAQUE',
  };
}

/**
 * Whether a finish hides what is under it. A part alpha-blended at under
 * half opacity is more see-through than not — the Sounding Spire's
 * `heat_shimmer_sheath` at six percent, the Spore Veil's gill haze at
 * sixteen — and a top-down reading that counts it solid reports the lamp
 * under it as hidden when the chart shows the lamp through it (#894: the
 * Spire's `crystal_core`, its largest light in the conn view, read as 0 m²
 * from above). The bake blends such a part at its own opacity; this is the
 * same rule for the readers that cannot blend, `topDown` and the resting
 * measure in kit.mjs `lightAudit`, and it lives here so the two agree. A
 * MASK cutout is solid where it is drawn, so only BLEND is read.
 */
const TRANSLUCENT = 0.5;
export const occludes = (finish) =>
  !(finish && finish.alpha === 'BLEND' && finish.opacity < TRANSLUCENT);

/**
 * A part: `{ name, material, finish, tris, positions, mirrored }` —
 * `material` the name, `finish` the values behind it — positions 9 floats a
 * triangle, world space; `mirrored` when the node's transform has a
 * negative determinant (a reflection, the Spire's `frame_blade_l`), which
 * turns every triangle's winding round, so a reader taking a normal off the
 * winding has to turn it back.
 */
export function readGlb(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== MAGIC || buf.readUInt32LE(4) !== 2)
    throw new Error(`${path}: not a glTF 2 binary`);
  let off = 12;
  let json = null;
  let bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === CHUNK_JSON) json = JSON.parse(body.toString('utf8'));
    else if (type === CHUNK_BIN) bin = body;
    off += 8 + len;
  }
  if (!json || !bin) throw new Error(`${path}: missing JSON or BIN chunk`);

  const accessor = (i) => {
    const a = json.accessors[i];
    const bv = json.bufferViews[a.bufferView];
    const start = bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const Ctor = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[
      a.componentType
    ];
    if (!Ctor) throw new Error(`${path}: accessor ${i} has component type ${a.componentType}`);
    if (bv.byteStride && bv.byteStride !== n * Ctor.BYTES_PER_ELEMENT)
      throw new Error(`${path}: interleaved accessor ${i} — not GLTFExporter output`);
    return { data: new Ctor(bin.buffer, start, a.count * n), n, count: a.count };
  };

  // Node world matrices, column-major like glTF and three.
  const world = new Array(json.nodes.length);
  const compose = (n) => {
    if (n.matrix) return n.matrix.slice();
    const [tx, ty, tz] = n.translation ?? [0, 0, 0];
    const [qx, qy, qz, qw] = n.rotation ?? [0, 0, 0, 1];
    const [sx, sy, sz] = n.scale ?? [1, 1, 1];
    const xx = qx * qx, yy = qy * qy, zz = qz * qz;
    const xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
    return [
      (1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0,
      2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0,
      2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0,
      tx, ty, tz, 1,
    ];
  };
  const mul = (a, b) => {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
  };
  const walk = (i, parent) => {
    const m = compose(json.nodes[i]);
    world[i] = parent ? mul(parent, m) : m;
    for (const c of json.nodes[i].children ?? []) walk(c, world[i]);
  };
  for (const i of json.scenes[json.scene ?? 0].nodes) walk(i, null);

  const parts = [];
  json.nodes.forEach((node, i) => {
    if (node.mesh === undefined) return;
    const m = world[i];
    const mesh = json.meshes[node.mesh];
    const out = [];
    let material = null;
    let finish = null;
    for (const prim of mesh.primitives) {
      if (prim.mode !== undefined && prim.mode !== 4)
        throw new Error(`${path}: ${node.name} is not a triangle list`);
      const pos = accessor(prim.attributes.POSITION);
      const idx = prim.indices !== undefined ? accessor(prim.indices).data : null;
      const count = idx ? idx.length : pos.count;
      for (let k = 0; k < count; k++) {
        const v = idx ? idx[k] : k;
        const x = pos.data[v * 3], y = pos.data[v * 3 + 1], z = pos.data[v * 3 + 2];
        out.push(
          m[0] * x + m[4] * y + m[8] * z + m[12],
          m[1] * x + m[5] * y + m[9] * z + m[13],
          m[2] * x + m[6] * y + m[10] * z + m[14]
        );
      }
      if (material === null && prim.material !== undefined) {
        material = json.materials[prim.material].name;
        finish = finishOf(json.materials[prim.material]);
      }
    }
    parts.push({
      name: node.name,
      material,
      finish,
      tris: out.length / 9,
      positions: Float32Array.from(out),
      mirrored: det3(m) < 0,
    });
  });
  return { name: json.nodes[json.scenes[json.scene ?? 0].nodes[0]]?.name ?? null, parts };
}

/** The determinant of a column-major 4×4's upper 3×3: the sign of its handedness. */
const det3 = (m) =>
  m[0] * (m[5] * m[10] - m[9] * m[6]) -
  m[4] * (m[1] * m[10] - m[9] * m[2]) +
  m[8] * (m[1] * m[6] - m[5] * m[2]);

/**
 * A linear colour as the sRGB hex a person authored. glTF carries colour
 * linear, `kit.mjs`'s `hex()` converts on the way in, and a reviewer holding
 * the design doc is looking for `#2C2244` — so the report converts back
 * rather than printing five decimals of linear.
 */
export function srgbHex(rgb) {
  const channel = (c) => {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${rgb.map(channel).join('').toUpperCase()}`;
}

/**
 * A finish rendered the way it is reported — and compared in exactly that
 * form, so that every line printed shows a difference the reader can see and
 * nothing below the printed precision is reported at all. A float that
 * survived a JSON round-trip a bit-width apart is not a material change.
 * `diff.mjs` reports in it and `check.mjs` compares in it, so the round-trip
 * check and the reader agree on what counts as a finish moving (#888).
 */
export function finishFields(f) {
  return {
    colour: srgbHex(f.colour),
    metalness: f.metalness.toFixed(3),
    roughness: f.roughness.toFixed(3),
    emissive: srgbHex(f.emissive),
    strength: f.strength.toFixed(3),
    opacity: f.opacity.toFixed(3),
    'two-sided': String(f.doubleSided),
    alpha: f.alpha,
  };
}

/** The same shape from a live three.js scene, in the order the meshes were added. */
export function sceneParts(root) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const pos = g.attributes.position;
    const idx = g.index;
    const count = idx ? idx.count : pos.count;
    const out = new Float32Array(count * 3);
    const m = o.matrixWorld.elements;
    for (let k = 0; k < count; k++) {
      const v = idx ? idx.getX(k) : k;
      const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      out[k * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
      out[k * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      out[k * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    }
    const mat = o.material;
    parts.push({
      name: o.name,
      material: mat?.name ?? null,
      // The same record the file side reads, off the live material — three's
      // own defaults, and `side === 2` is THREE.DoubleSide without importing
      // three into a parser that deliberately has no dependency on it.
      finish: mat
        ? {
            colour: mat.color?.toArray() ?? [1, 1, 1],
            opacity: mat.opacity ?? 1,
            metalness: mat.metalness ?? 1,
            roughness: mat.roughness ?? 1,
            emissive: mat.emissive?.toArray() ?? [0, 0, 0],
            strength: mat.emissiveIntensity ?? 1,
            doubleSided: mat.side === 2,
            // GLTFExporter's own mapping: transparent is BLEND, a cutout MASK.
            alpha: mat.transparent ? 'BLEND' : mat.alphaTest > 0 ? 'MASK' : 'OPAQUE',
          }
        : null,
      tris: count / 3,
      positions: out,
      mirrored: o.matrixWorld.determinant() < 0,
    });
  });
  return { name: root.name, parts };
}

/**
 * The nearest point on any of `parts` to `point`: `{ point, normal,
 * distance, part }`, the normal the triangle's own by its winding, turned
 * back on a mirrored part, so it faces out of a closed primitive whatever
 * side of the surface `point` is on. A part `occludes` reads false on is
 * skipped, as `topDown` skips it: a bud cannot rest on a haze.
 *
 * Ericson, *Real-Time Collision Detection* §5.1.5, region by region. Every
 * triangle is tried; a lamp's fifty vertices against a hull's ten
 * thousand triangles is a few million tests and well under a second, and a
 * builder seating one lamp asks once.
 */
export function closestPoint(parts, [px, py, pz], { skip = null } = {}) {
  let best = Infinity;
  let hit = null;
  for (const part of Array.isArray(parts) ? parts : [parts]) {
    if (part === skip || !occludes(part.finish)) continue;
    const a = part.positions;
    for (let t = 0; t < a.length; t += 9) {
      // The triangle's box first: a corner further than the best so far on
      // any axis cannot hold a nearer point.
      const r = Math.sqrt(best);
      if (
        Math.min(a[t], a[t + 3], a[t + 6]) > px + r ||
        Math.max(a[t], a[t + 3], a[t + 6]) < px - r ||
        Math.min(a[t + 1], a[t + 4], a[t + 7]) > py + r ||
        Math.max(a[t + 1], a[t + 4], a[t + 7]) < py - r ||
        Math.min(a[t + 2], a[t + 5], a[t + 8]) > pz + r ||
        Math.max(a[t + 2], a[t + 5], a[t + 8]) < pz - r
      )
        continue;
      const q = closestOnTriangle(px, py, pz, a, t);
      const d = (px - q[0]) ** 2 + (py - q[1]) ** 2 + (pz - q[2]) ** 2;
      if (d < best) {
        best = d;
        hit = { point: q, part, t };
      }
    }
  }
  if (!hit) return null;
  const { part, t } = hit;
  return { point: hit.point, normal: windingNormal(part, t), distance: Math.sqrt(best), part };
}

/**
 * The highest point of any of `parts` straight under (x, z), as `topDown`
 * would read the cell — `{ point, normal, part }` with the triangle's
 * outward normal as `closestPoint` gives it — or null when nothing lies at
 * that station. What a lamp laid on a plate rests on: the plate's facet
 * under its own station, not the nearest facet, which from a station a
 * metre over a slope is downhill of it.
 */
export function topAt(parts, x, z) {
  let best = -Infinity;
  let hit = null;
  for (const part of Array.isArray(parts) ? parts : [parts]) {
    if (!occludes(part.finish)) continue;
    const a = part.positions;
    for (let t = 0; t < a.length; t += 9) {
      const x0 = a[t], y0 = a[t + 1], z0 = a[t + 2];
      const x1 = a[t + 3], y1 = a[t + 4], z1 = a[t + 5];
      const x2 = a[t + 6], y2 = a[t + 7], z2 = a[t + 8];
      const det = (x1 - x0) * (z2 - z0) - (x2 - x0) * (z1 - z0);
      if (Math.abs(det) < 1e-12) continue;
      const l1 = ((x - x0) * (z2 - z0) - (x2 - x0) * (z - z0)) / det;
      const l2 = ((x1 - x0) * (z - z0) - (x - x0) * (z1 - z0)) / det;
      const l0 = 1 - l1 - l2;
      if (l0 < -1e-9 || l1 < -1e-9 || l2 < -1e-9) continue;
      const y = l0 * y0 + l1 * y1 + l2 * y2;
      if (y > best) {
        best = y;
        hit = { part, t, point: [x, y, z] };
      }
    }
  }
  if (!hit) return null;
  return { point: hit.point, normal: windingNormal(hit.part, hit.t), part: hit.part };
}

/** A triangle's unit normal by its winding, turned back on a mirrored part. */
function windingNormal(part, t) {
  const a = part.positions;
  const ux = a[t + 3] - a[t], uy = a[t + 4] - a[t + 1], uz = a[t + 5] - a[t + 2];
  const vx = a[t + 6] - a[t], vy = a[t + 7] - a[t + 1], vz = a[t + 8] - a[t + 2];
  const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const len = Math.hypot(...n) || 1;
  const sgn = part.mirrored ? -1 : 1;
  return n.map((c) => (sgn * c) / len);
}

/**
 * How far `part` stands from the rest of the model: the least distance
 * between its surface and any other solid part's, and nothing at all when
 * the two meet — an edge of one crossing a face of the other, or a vertex
 * of `part` inside the other (a throat sealed in a crystal, a cone's base
 * sunk in its horn). The distance between two triangle meshes that do not
 * meet is taken at a vertex against a face, either way round; the
 * edge-against-edge case a box corner over a plate's rim can make is not
 * tried, so a gap can read a little long there and never short, which is
 * the safe way round for a warning.
 *
 * The inside test is ray parity straight up, which is right for a closed
 * primitive and undefined for an open shell — a cowl, an open rim — where
 * a vertex under it counts as inside and its lamp as resting. That is the
 * lamp-under-a-deck case, which `topDown` already names.
 */
export function gapBetween(part, parts, { skip = part } = {}) {
  const { min, max } = boundsOf(part);
  const a = part.positions;
  let best = Infinity;
  for (const q of Array.isArray(parts) ? parts : [parts]) {
    if (q === skip || !occludes(q.finish)) continue;
    const qb = boundsOf(q);
    const r = Math.sqrt(best);
    if (qb.min.some((c, i) => c > max[i] + r) || qb.max.some((c, i) => c < min[i] - r)) continue;
    const b = q.positions;
    // A vertex of the part inside the other: the part is sunk in it.
    for (let i = 0; i < a.length; i += 3)
      if (
        a[i] >= qb.min[0] && a[i] <= qb.max[0] &&
        a[i + 2] >= qb.min[2] && a[i + 2] <= qb.max[2] &&
        a[i + 1] >= qb.min[1] && a[i + 1] <= qb.max[1] &&
        inside(b, a[i], a[i + 1], a[i + 2])
      )
        return 0;
    // An edge of either crossing a face of the other: the two meet.
    for (let t = 0; t < a.length; t += 9)
      for (let u = 0; u < b.length; u += 9)
        if (
          Math.min(a[t], a[t + 3], a[t + 6]) <= Math.max(b[u], b[u + 3], b[u + 6]) &&
          Math.max(a[t], a[t + 3], a[t + 6]) >= Math.min(b[u], b[u + 3], b[u + 6]) &&
          Math.min(a[t + 1], a[t + 4], a[t + 7]) <= Math.max(b[u + 1], b[u + 4], b[u + 7]) &&
          Math.max(a[t + 1], a[t + 4], a[t + 7]) >= Math.min(b[u + 1], b[u + 4], b[u + 7]) &&
          Math.min(a[t + 2], a[t + 5], a[t + 8]) <= Math.max(b[u + 2], b[u + 5], b[u + 8]) &&
          Math.max(a[t + 2], a[t + 5], a[t + 8]) >= Math.min(b[u + 2], b[u + 5], b[u + 8]) &&
          (edgesCross(a, t, b, u) || edgesCross(b, u, a, t))
        )
          return 0;
    // Apart: the nearest vertex to a face, either way round.
    const near = (from, to) => {
      for (let i = 0; i < from.length; i += 3) {
        const hit = closestPoint({ positions: to, finish: null, mirrored: false }, [
          from[i],
          from[i + 1],
          from[i + 2],
        ]);
        if (hit && hit.distance ** 2 < best) best = hit.distance ** 2;
      }
    };
    near(a, b);
    near(b, a);
  }
  return Math.sqrt(best);
}

/** Whether any edge of triangle `t` of `a` passes through triangle `u` of `b`. */
function edgesCross(a, t, b, u) {
  for (let e = 0; e < 3; e++) {
    const i = t + e * 3;
    const j = t + ((e + 1) % 3) * 3;
    if (segmentHits(a[i], a[i + 1], a[i + 2], a[j], a[j + 1], a[j + 2], b, u)) return true;
  }
  return false;
}

/** Möller–Trumbore, the segment from p to q against triangle `u` of `b`. */
function segmentHits(px, py, pz, qx, qy, qz, b, u) {
  const dx = qx - px, dy = qy - py, dz = qz - pz;
  const e1x = b[u + 3] - b[u], e1y = b[u + 4] - b[u + 1], e1z = b[u + 5] - b[u + 2];
  const e2x = b[u + 6] - b[u], e2y = b[u + 7] - b[u + 1], e2z = b[u + 8] - b[u + 2];
  const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
  const det = e1x * hx + e1y * hy + e1z * hz;
  if (Math.abs(det) < 1e-12) return false;
  const inv = 1 / det;
  const sx = px - b[u], sy = py - b[u + 1], sz = pz - b[u + 2];
  const v = (sx * hx + sy * hy + sz * hz) * inv;
  if (v < 0 || v > 1) return false;
  const cx = sy * e1z - sz * e1y, cy = sz * e1x - sx * e1z, cz = sx * e1y - sy * e1x;
  const w = (dx * cx + dy * cy + dz * cz) * inv;
  if (w < 0 || v + w > 1) return false;
  const s = (e2x * cx + e2y * cy + e2z * cz) * inv;
  return s >= 0 && s <= 1;
}

/** Ray parity straight up from (x, y, z) through the triangles of `b`. */
function inside(b, x, y, z) {
  let crossings = 0;
  for (let u = 0; u < b.length; u += 9) {
    // Barycentrics in plan, as `topDown` takes them.
    const x0 = b[u], y0 = b[u + 1], z0 = b[u + 2];
    const x1 = b[u + 3], y1 = b[u + 4], z1 = b[u + 5];
    const x2 = b[u + 6], y2 = b[u + 7], z2 = b[u + 8];
    const det = (x1 - x0) * (z2 - z0) - (x2 - x0) * (z1 - z0);
    if (Math.abs(det) < 1e-12) continue;
    const l1 = ((x - x0) * (z2 - z0) - (x2 - x0) * (z - z0)) / det;
    const l2 = ((x1 - x0) * (z - z0) - (x - x0) * (z1 - z0)) / det;
    const l0 = 1 - l1 - l2;
    if (l0 < 0 || l1 < 0 || l2 < 0) continue;
    if (l0 * y0 + l1 * y1 + l2 * y2 > y) crossings++;
  }
  return crossings % 2 === 1;
}

function closestOnTriangle(px, py, pz, a, t) {
  const A = [a[t], a[t + 1], a[t + 2]];
  const B = [a[t + 3], a[t + 4], a[t + 5]];
  const C = [a[t + 6], a[t + 7], a[t + 8]];
  const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const ac = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const along = (P, e, s) => [P[0] + e[0] * s, P[1] + e[1] * s, P[2] + e[2] * s];
  const ap = [px - A[0], py - A[1], pz - A[2]];
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return A;
  const bp = [px - B[0], py - B[1], pz - B[2]];
  const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return B;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return along(A, ab, d1 / (d1 - d3));
  const cp = [px - C[0], py - C[1], pz - C[2]];
  const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return C;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return along(A, ac, d2 / (d2 - d6));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0)
    return along(B, [C[0] - B[0], C[1] - B[1], C[2] - B[2]], (d4 - d3) / (d4 - d3 + (d5 - d6)));
  const denom = 1 / (va + vb + vc);
  return along(along(A, ab, vb * denom), ac, vc * denom);
}

/** Axis-aligned bounds of a part or a whole model, `{ min: [x,y,z], max: [x,y,z] }`. */
export function boundsOf(parts) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of Array.isArray(parts) ? parts : [parts]) {
    const a = p.positions;
    for (let i = 0; i < a.length; i += 3)
      for (let d = 0; d < 3; d++) {
        if (a[i + d] < min[d]) min[d] = a[i + d];
        if (a[i + d] > max[d]) max[d] = a[i + d];
      }
  }
  return { min, max };
}

/**
 * Rasterise a model from above at `ppm` cells a metre: which part is on top
 * at every cell, and how high. This is the bake's camera without the
 * browser — a top-down orthographic view where a vertical face has no area
 * and a lamp under a deck does not exist — and it is what the light audit
 * reads off. A part `occludes` reads false on owns no cell: the bake draws
 * the Spire's sheath at six percent over its core, so the core is what is
 * on top here too (#894).
 */
export function topDown(parts, ppm = 4) {
  const { min, max } = boundsOf(parts);
  const w = Math.max(1, Math.ceil((max[0] - min[0]) * ppm) + 1);
  const h = Math.max(1, Math.ceil((max[2] - min[2]) * ppm) + 1);
  const height = new Float32Array(w * h).fill(-Infinity);
  const owner = new Int32Array(w * h).fill(-1);
  parts.forEach((part, pi) => {
    if (!occludes(part.finish)) return;
    const a = part.positions;
    for (let t = 0; t < a.length; t += 9) {
      const x0 = a[t], y0 = a[t + 1], z0 = a[t + 2];
      const x1 = a[t + 3], y1 = a[t + 4], z1 = a[t + 5];
      const x2 = a[t + 6], y2 = a[t + 7], z2 = a[t + 8];
      const det = (x1 - x0) * (z2 - z0) - (x2 - x0) * (z1 - z0);
      if (Math.abs(det) < 1e-9) continue; // edge-on from above: no plan area
      const cx0 = Math.max(0, Math.floor((Math.min(x0, x1, x2) - min[0]) * ppm));
      const cx1 = Math.min(w - 1, Math.ceil((Math.max(x0, x1, x2) - min[0]) * ppm));
      const cz0 = Math.max(0, Math.floor((Math.min(z0, z1, z2) - min[2]) * ppm));
      const cz1 = Math.min(h - 1, Math.ceil((Math.max(z0, z1, z2) - min[2]) * ppm));
      for (let cz = cz0; cz <= cz1; cz++) {
        const pz = min[2] + (cz + 0.5) / ppm;
        for (let cx = cx0; cx <= cx1; cx++) {
          const px = min[0] + (cx + 0.5) / ppm;
          // Barycentrics from the two edge cross products: the weight on
          // vertex 1 is cross(P - P0, P2 - P0) / det and the weight on
          // vertex 2 is cross(P1 - P0, P - P0) / det; inside when the third
          // weight is also non-negative. The first cut had the two
          // exchanged. The inside test is symmetric and never noticed, but
          // the height read off a sloped face was weighted towards its wrong
          // corner, so a lamp beside a frustum's wall could be told the wall
          // stood over it (#639, the Knights' turret's `nav_mark_fore_r`).
          const l1 = ((px - x0) * (z2 - z0) - (x2 - x0) * (pz - z0)) / det;
          const l2 = ((x1 - x0) * (pz - z0) - (px - x0) * (z1 - z0)) / det;
          const l0 = 1 - l1 - l2;
          if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
          const y = l0 * y0 + l1 * y1 + l2 * y2;
          const i = cz * w + cx;
          if (y > height[i]) {
            height[i] = y;
            owner[i] = pi;
          }
        }
      }
    }
  });
  return { w, h, ppm, min, max, height, owner, cellArea: 1 / (ppm * ppm) };
}
