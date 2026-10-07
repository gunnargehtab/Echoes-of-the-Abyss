/**
 * kit.mjs `exportGlb` writes a part built exactly like an earlier one once,
 * and both nodes point at it (#1125); a part alike only in some attributes
 * or its index points at the earlier accessors for those (#1129). What a
 * reader of the file relies on: the parts read back where the scene put
 * them, each under its own name and material; a geometry that differs in
 * anything the exporter writes — a vertex, or the `userData` it copies into
 * the primitive's extras — keeps its own primitive; no two accessors in the
 * file carry one buffer's bytes, except an index and a vertex attribute,
 * whose buffer views carry different targets; and the scene the script
 * built is handed back as it was, since the census and the light audit read
 * it after the export.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { readGlb, sceneParts } from '../glb.mjs';

function material(name) {
  const m = new THREE.MeshStandardMaterial();
  m.name = name;
  return m;
}

/**
 * Six boxes: two alike, a third alike in another material, one wider, one
 * tagged, and one carrying a vertex attribute whose bytes are its index's.
 */
function yard() {
  const root = new THREE.Group();
  root.name = 'yard';
  const steel = material('steel');
  const box = (name, at, width, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 1, 1), mat);
    mesh.name = name;
    mesh.position.set(...at);
    root.add(mesh);
    return mesh;
  };
  box('bitt_port', [0, 0, -3], 2, steel);
  box('bitt_starboard', [0, 0, 3], 2, steel);
  box('bitt_lamp', [4, 0, 0], 2, material('lamp'));
  box('bitt_wide', [-4, 0, 0], 3, steel);
  box('bitt_tagged', [8, 0, 0], 2, steel).geometry.userData = { tag: 'kept' };
  // 24 corners, 36 index entries: the first 24 entries as a per-corner slot.
  const slotted = box('bitt_slotted', [12, 0, 0], 4, steel).geometry;
  const slot = Uint16Array.from(slotted.index.array.subarray(0, 24));
  slotted.setAttribute('slot', new THREE.BufferAttribute(slot, 1));
  slotted.setIndex(new THREE.BufferAttribute(slot.slice(), 1));
  return root;
}

const fileOf = (path) => {
  const bytes = readFileSync(path);
  const length = bytes.readUInt32LE(12);
  return {
    gltf: JSON.parse(bytes.subarray(20, 20 + length).toString()),
    bin: bytes.subarray(20 + length + 8),
  };
};

/** Each accessor's target, type, component type and bytes, as a digest. */
function accessorDigests({ gltf, bin }) {
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const size = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
  return gltf.accessors.map((a) => {
    const view = gltf.bufferViews[a.bufferView];
    const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const end = start + a.count * width[a.type] * size[a.componentType];
    return createHash('sha256')
      .update(`${view.target} ${a.type} ${a.componentType};`)
      .update(bin.subarray(start, end))
      .digest('hex');
  });
}

test('a part built like an earlier one is written once, and the scene comes back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'share-'));
  process.env.HULL_MODELS_OUT = dir;
  try {
    // kit.mjs shims FileReader for the exporter at import, as occlusion.test.mjs says.
    const { exportGlb } = await import('../kit.mjs');
    const root = yard();
    const held = (mesh) => [mesh.geometry, { ...mesh.geometry.attributes }, mesh.geometry.index];
    const before = root.children.map(held);
    await exportGlb(root, 'yard.glb');
    assert.deepEqual(
      root.children.map(held),
      before,
      'the export handed the scene back with other geometries, attributes or indices'
    );

    const file = fileOf(join(dir, 'yard.glb'));
    const { gltf } = file;
    const node = (name) => gltf.nodes.find((n) => n.name === name);
    const primitive = (name) => gltf.meshes[node(name).mesh].primitives[0];
    const port = primitive('bitt_port');
    // One material: one mesh, both nodes on it.
    assert.equal(node('bitt_port').mesh, node('bitt_starboard').mesh);
    // Another material: its own mesh, on the same accessors.
    assert.notEqual(node('bitt_lamp').mesh, node('bitt_port').mesh);
    assert.deepEqual(primitive('bitt_lamp').attributes, port.attributes);
    assert.equal(primitive('bitt_lamp').indices, port.indices);
    // A tag in the extras: its own primitive, on the same accessors (#1129).
    assert.notEqual(node('bitt_tagged').mesh, node('bitt_port').mesh);
    assert.deepEqual(primitive('bitt_tagged').extras, { tag: 'kept' });
    assert.deepEqual(primitive('bitt_tagged').attributes, port.attributes);
    assert.equal(primitive('bitt_tagged').indices, port.indices);
    // A box's normals, UVs and index are alike at any width; its corners are not.
    const wide = primitive('bitt_wide');
    assert.notEqual(wide.attributes.POSITION, port.attributes.POSITION);
    assert.equal(wide.attributes.NORMAL, port.attributes.NORMAL);
    assert.equal(wide.attributes.TEXCOORD_0, port.attributes.TEXCOORD_0);
    assert.equal(wide.indices, port.indices);
    // An index never shares a vertex attribute's accessor, bytes alike or not.
    const slotted = primitive('bitt_slotted');
    assert.notEqual(slotted.attributes._SLOT, slotted.indices);
    const target = (accessor) => gltf.bufferViews[gltf.accessors[accessor].bufferView].target;
    assert.notEqual(target(slotted.attributes._SLOT), target(slotted.indices));
    // No two accessors carry one buffer's bytes for one target.
    const digests = accessorDigests(file);
    assert.equal(new Set(digests).size, digests.length, 'two accessors are byte-identical');

    // Every part reads back where the scene put it, under its own name and material.
    const read = readGlb(join(dir, 'yard.glb'));
    const live = sceneParts(yard()).parts;
    assert.deepEqual(
      read.parts.map((p) => [p.name, p.material]),
      [
        ['bitt_port', 'steel'],
        ['bitt_starboard', 'steel'],
        ['bitt_lamp', 'lamp'],
        ['bitt_wide', 'steel'],
        ['bitt_tagged', 'steel'],
        ['bitt_slotted', 'steel'],
      ]
    );
    for (const part of read.parts) {
      const built = live.find((p) => p.name === part.name);
      assert.deepEqual(part.positions, built.positions, `${part.name} moved`);
      assert.deepEqual(part.normals, built.normals, `${part.name} normals`);
      assert.deepEqual(part.uv0, built.uv0, `${part.name} UVs`);
    }
  } finally {
    delete process.env.HULL_MODELS_OUT;
    rmSync(dir, { recursive: true, force: true });
  }
});
