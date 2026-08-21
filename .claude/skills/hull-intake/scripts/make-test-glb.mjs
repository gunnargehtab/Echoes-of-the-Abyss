/**
 * Writes a tiny synthetic hull GLB so the intake harness can be verified
 * end-to-end before (or without) a real Claude Design export. The model is
 * deliberately shaped like the real deliveries: an elongated hull body with a
 * plain PBR material, plus a small emissive "navigation light" primitive —
 * exactly the two channels bake.mjs must keep apart. Built in file units of
 * length 4, so a run against it also exercises the metre rescale.
 *
 * Usage: node make-test-glb.mjs <out.glb>
 */

import { writeFileSync } from 'node:fs';

// One axis-aligned box: 24 verts (per-face normals), 36 indices.
function box(sx, sy, sz, cx, cy, cz) {
  const x = sx / 2,
    y = sy / 2,
    z = sz / 2;
  // face -> [normal, four corners CCW seen from outside]
  const faces = [
    [[1, 0, 0], [[x, -y, -z], [x, y, -z], [x, y, z], [x, -y, z]]],
    [[-1, 0, 0], [[-x, -y, z], [-x, y, z], [-x, y, -z], [-x, -y, -z]]],
    [[0, 1, 0], [[-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z]]],
    [[0, -1, 0], [[-x, -y, z], [-x, -y, -z], [x, -y, -z], [x, -y, z]]],
    [[0, 0, 1], [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]],
    [[0, 0, -1], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]],
  ];
  const positions = [],
    normals = [],
    indices = [];
  for (const [n, corners] of faces) {
    const base = positions.length / 3;
    for (const c of corners) {
      positions.push(c[0] + cx, c[1] + cy, c[2] + cz);
      normals.push(...n);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, indices };
}

// Hull: long on X. Light: a stub on the spine, aft of centre.
const hull = box(4, 0.8, 1, 0, 0, 0);
const light = box(0.3, 0.3, 0.3, -1, 0.55, 0);

function minMax(arr) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < arr.length; i += 3)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], arr[i + a]);
      max[a] = Math.max(max[a], arr[i + a]);
    }
  return { min, max };
}

// Binary buffer: [hull pos | hull nrm | light pos | light nrm | hull idx | light idx]
const f32 = (a) => Buffer.from(new Float32Array(a).buffer);
const u16 = (a) => Buffer.from(new Uint16Array(a).buffer);
const parts = [
  f32(hull.positions),
  f32(hull.normals),
  f32(light.positions),
  f32(light.normals),
  u16(hull.indices),
  u16(light.indices),
];
let offset = 0;
const views = parts.map((p, i) => {
  const v = { buffer: 0, byteOffset: offset, byteLength: p.length, target: i < 4 ? 34962 : 34963 };
  offset += p.length;
  return v;
});
let bin = Buffer.concat(parts);
while (bin.length % 4) bin = Buffer.concat([bin, Buffer.from([0])]);

const gltf = {
  asset: { version: '2.0', generator: 'hull-intake test fixture' },
  scene: 0,
  scenes: [{ nodes: [0, 1] }],
  nodes: [
    { mesh: 0, name: 'hull' },
    { mesh: 1, name: 'nav-light' },
  ],
  meshes: [
    { primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 4, material: 0 }] },
    { primitives: [{ attributes: { POSITION: 2, NORMAL: 3 }, indices: 5, material: 1 }] },
  ],
  materials: [
    {
      name: 'chitin',
      pbrMetallicRoughness: {
        baseColorFactor: [0.12, 0.65, 0.48, 1], // algae teal-ish
        metallicFactor: 0.1,
        roughnessFactor: 0.8,
      },
    },
    {
      name: 'biolight',
      pbrMetallicRoughness: { baseColorFactor: [0, 0, 0, 1] },
      emissiveFactor: [0.56, 0.89, 0.42], // bioluminescent green
    },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', ...minMax(hull.positions) },
    { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' },
    { bufferView: 2, componentType: 5126, count: 24, type: 'VEC3', ...minMax(light.positions) },
    { bufferView: 3, componentType: 5126, count: 24, type: 'VEC3' },
    { bufferView: 4, componentType: 5123, count: 36, type: 'SCALAR' },
    { bufferView: 5, componentType: 5123, count: 36, type: 'SCALAR' },
  ],
  bufferViews: views,
  buffers: [{ byteLength: bin.length }],
};

let json = Buffer.from(JSON.stringify(gltf));
while (json.length % 4) json = Buffer.concat([json, Buffer.from(' ')]);

const header = Buffer.alloc(12);
header.write('glTF', 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(json.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(bin.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN'

const out = process.argv[2];
if (!out) {
  console.error('usage: node make-test-glb.mjs <out.glb>');
  process.exit(1);
}
writeFileSync(out, Buffer.concat([header, jsonHeader, json, binHeader, bin]));
console.log(`wrote ${out}`);
