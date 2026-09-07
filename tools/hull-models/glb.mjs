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

/** A part: `{ name, material, tris, positions }`, positions 9 floats a triangle, world space. */
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
      material ??= prim.material !== undefined ? json.materials[prim.material].name : null;
    }
    parts.push({ name: node.name, material, tris: out.length / 9, positions: Float32Array.from(out) });
  });
  return { name: json.nodes[json.scenes[json.scene ?? 0].nodes[0]]?.name ?? null, parts };
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
    parts.push({ name: o.name, material: o.material?.name ?? null, tris: count / 3, positions: out });
  });
  return { name: root.name, parts };
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
 * and a lamp under a deck does not exist — and it is what both the light
 * audit and the plan outline read off.
 */
export function topDown(parts, ppm = 4) {
  const { min, max } = boundsOf(parts);
  const w = Math.max(1, Math.ceil((max[0] - min[0]) * ppm) + 1);
  const h = Math.max(1, Math.ceil((max[2] - min[2]) * ppm) + 1);
  const height = new Float32Array(w * h).fill(-Infinity);
  const owner = new Int32Array(w * h).fill(-1);
  parts.forEach((part, pi) => {
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
          const l1 = ((x1 - x0) * (pz - z0) - (px - x0) * (z1 - z0)) / det;
          const l2 = ((px - x0) * (z2 - z0) - (x2 - x0) * (pz - z0)) / det;
          // Barycentrics from the two edge cross products: inside when the
          // third weight is also non-negative.
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
