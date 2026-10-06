/**
 * kit.mjs `exportGlb` writes a part built exactly like an earlier one once,
 * and both nodes point at it (#1125). What a reader of the file relies on:
 * the parts read back where the scene put them, each under its own name and
 * material; a geometry that differs in anything the exporter writes — a
 * vertex, or the `userData` it copies into the primitive's extras — keeps
 * its own buffers; and the scene the script built is handed back as it was,
 * since the census and the light audit read it after the export.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
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

/** Five boxes: two alike, a third alike in another material, one wider, one tagged. */
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
  return root;
}

const gltfOf = (path) => {
  const bytes = readFileSync(path);
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
};

test('a part built like an earlier one is written once, and the scene comes back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'share-'));
  process.env.HULL_MODELS_OUT = dir;
  try {
    // kit.mjs shims FileReader for the exporter at import, as occlusion.test.mjs says.
    const { exportGlb } = await import('../kit.mjs');
    const root = yard();
    const before = root.children.map((mesh) => mesh.geometry);
    await exportGlb(root, 'yard.glb');
    assert.deepEqual(
      root.children.map((mesh) => mesh.geometry),
      before,
      'the export handed the scene back with other geometries'
    );

    const gltf = gltfOf(join(dir, 'yard.glb'));
    const node = (name) => gltf.nodes.find((n) => n.name === name);
    const primitive = (name) => gltf.meshes[node(name).mesh].primitives[0];
    // One material: one mesh, both nodes on it.
    assert.equal(node('bitt_port').mesh, node('bitt_starboard').mesh);
    // Another material: its own mesh, on the same accessors.
    assert.notEqual(node('bitt_lamp').mesh, node('bitt_port').mesh);
    assert.deepEqual(primitive('bitt_lamp').attributes, primitive('bitt_port').attributes);
    assert.equal(primitive('bitt_lamp').indices, primitive('bitt_port').indices);
    // A vertex apart, or a tag in the extras, and the buffers are its own.
    const port = primitive('bitt_port').attributes.POSITION;
    for (const other of ['bitt_wide', 'bitt_tagged']) {
      assert.notEqual(primitive(other).attributes.POSITION, port, `${other} shares the port's`);
    }
    assert.deepEqual(primitive('bitt_tagged').extras, { tag: 'kept' });
    // Three sets of buffers for five boxes: the three alike, the wide, the tagged.
    const positions = new Set(gltf.meshes.map((m) => m.primitives[0].attributes.POSITION));
    assert.equal(positions.size, 3);

    // Every part reads back where the scene put it, under its own name and material.
    const file = readGlb(join(dir, 'yard.glb'));
    const live = sceneParts(yard()).parts;
    assert.deepEqual(
      file.parts.map((p) => [p.name, p.material]),
      [
        ['bitt_port', 'steel'],
        ['bitt_starboard', 'steel'],
        ['bitt_lamp', 'lamp'],
        ['bitt_wide', 'steel'],
        ['bitt_tagged', 'steel'],
      ]
    );
    for (const part of file.parts) {
      const built = live.find((p) => p.name === part.name);
      assert.deepEqual(part.positions, built.positions, `${part.name} moved`);
      assert.deepEqual(part.normals, built.normals, `${part.name} normals`);
    }
  } finally {
    delete process.env.HULL_MODELS_OUT;
    rmSync(dir, { recursive: true, force: true });
  }
});
