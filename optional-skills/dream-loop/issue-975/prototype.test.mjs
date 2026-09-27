import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import test from 'node:test';
import * as THREE from 'three';
import { readArchive, RESOURCE_NAMES } from './archive.mjs';
import { createPreviewServer } from './serve.mjs';
import { batchStatic, mergeUV } from './prototype/geometry.mjs';

test('the two supplied targets remain byte-for-byte unchanged', async () => {
  for (const [file, expected] of [
    ['target.png', '462678f2e22615643bfefc6f17be3400b248339a23d456fbdbeeda3b15664e04'],
    ['target.html', 'ce3ea0af8efe9e13ad298b7212e61b86b8d0aa9849dfd98f4364cbd9b0c5bfaf'],
  ]) {
    const bytes = await readFile(new URL(file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, file);
  }
});

test('the archived renderer and authored scene decode without evaluating the unpacker', async () => {
  const resources = await readArchive();
  assert.deepEqual([...resources.keys()].sort(), [...RESOURCE_NAMES].sort());
  assert.match(resources.get('threeCore'), /const REVISION = '184'/);
  assert.match(resources.get('three'), /SPDX-License-Identifier: MIT/);
  assert.match(resources.get('main'), /buildCarrier/);
  assert.match(resources.get('main'), /fishSchool/);
  assert.match(resources.get('tex'), /normalMap/);
});

test('preview serves only its own scene and embedded runtime, never the game or target PNG', async (t) => {
  const server = await createPreviewServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  );
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of [
    '/',
    '/main.mjs',
    '/viewer.mjs',
    '/geometry.mjs',
    '/vendor/three.mjs',
    '/reference/main.mjs',
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    await response.arrayBuffer();
  }
  assert.match(await (await fetch(base + '/main.mjs')).text(), /mountViewer/);
  assert.doesNotMatch(await (await fetch(base + '/reference/main.mjs')).text(), /mountViewer/);
  for (const path of [
    '/target.png',
    '/target.html',
    '/package.json',
    '/.env',
    '/packages/frontend/src/main.tsx',
    '/%2e%2e/%2e%2e/CLAUDE.md',
  ]) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});

test('UV merge preserves indexed triangle positions, normals and UVs', () => {
  const indexed = new THREE.BoxGeometry(2, 3, 4);
  const expected = indexed.toNonIndexed();
  const merged = mergeUV([indexed, indexed]);
  for (const name of ['position', 'normal', 'uv']) {
    const source = [...expected.attributes[name].array];
    assert.deepEqual([...merged.attributes[name].array], [...source, ...source], name);
  }
});

test('static batches keep world bounds, material, UVs and shadow state without losing geometry', () => {
  const root = new THREE.Group();
  root.position.set(5, -3, 7);
  root.rotation.y = 0.4;
  const parent = new THREE.Group();
  parent.rotation.set(0.2, -0.3, 0.1);
  root.add(parent);
  const material = new THREE.MeshStandardMaterial();
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 4), material);
    mesh.position.set(i * 5, i, -i);
    mesh.scale.set(1 + i * 0.2, 1.4, 0.7);
    mesh.name = `plate-${i}`;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
  }
  const before = new THREE.Box3().setFromObject(root, true);
  const report = batchStatic(root);
  const after = new THREE.Box3().setFromObject(root, true);
  assert.equal(report.sourceMeshes, 3);
  assert.equal(report.batchedMeshes, 1);
  assert.equal(report.triangles, 36);
  assert.ok(before.min.distanceTo(after.min) < 1e-5);
  assert.ok(before.max.distanceTo(after.max) < 1e-5);
  const batch = root.children.find((object) => object.isMesh);
  assert.equal(batch.material, material);
  assert.equal(batch.castShadow, true);
  assert.equal(batch.receiveShadow, true);
  assert.deepEqual(batch.userData.sourceNames, ['plate-0', 'plate-1', 'plate-2']);
  assert.equal(batch.geometry.attributes.uv.count, 108);
});

test('moving craft, transparent shaders, per-vertex colours and existing instances are not flattened', () => {
  const root = new THREE.Group();
  const moving = new THREE.Group();
  root.add(moving);
  const material = new THREE.MeshStandardMaterial();
  const geometry = new THREE.BoxGeometry();
  moving.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  const transparent = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true }));
  const shader = new THREE.Mesh(geometry, new THREE.ShaderMaterial());
  const instance = new THREE.InstancedMesh(geometry, material, 2);
  const coloured = geometry.clone();
  coloured.setAttribute('color', new THREE.BufferAttribute(new Float32Array(72), 3));
  const vertex = new THREE.Mesh(coloured, material);
  root.add(transparent, shader, instance, vertex);
  assert.equal(batchStatic(root, [moving]).savedDraws, 0);
  assert.equal(moving.children.length, 2);
  for (const object of [transparent, shader, instance, vertex]) assert.equal(object.parent, root);
});

test('batches do not mix shadow casters, volume exclusions, layers or render order', () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  for (let state = 0; state < 4; state++) {
    for (let copy = 0; copy < 2; copy++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
      mesh.castShadow = state === 0;
      mesh.userData.noVol = state === 1;
      mesh.layers.set(state === 2 ? 1 : 0);
      mesh.renderOrder = state === 3 ? 2 : 0;
      root.add(mesh);
    }
  }
  assert.equal(batchStatic(root).batchedMeshes, 4);
  assert.equal(root.children.filter((mesh) => mesh.castShadow).length, 1);
  assert.equal(root.children.filter((mesh) => mesh.userData.noVol).length, 1);
  assert.equal(root.children.filter((mesh) => mesh.layers.mask === 2).length, 1);
  assert.equal(root.children.filter((mesh) => mesh.renderOrder === 2).length, 1);
});
