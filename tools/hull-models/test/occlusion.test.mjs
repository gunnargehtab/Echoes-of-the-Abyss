/**
 * occlusion.mjs bakes a model's ambient occlusion onto an atlas on `uv1`
 * and embeds it in the GLB (#1002). What a reader of that file relies on:
 * a lone convex body reads open everywhere; a face under another part
 * reads shaded, and the open plate beside it does not; every corner gets a
 * UV inside the atlas and no vertex moves; two bakes of one scene are one
 * bake, since check.mjs compares them; and the file comes back through
 * glb.mjs with the map on its solid materials and the UVs on its parts.
 * png.mjs's round trip is held here too, since nothing else reads it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { bakeOcclusion } from '../occlusion.mjs';
import { encodeGray, decodeGray } from '../png.mjs';
import { readGlb, sceneParts } from '../glb.mjs';

const steel = () => {
  const m = new THREE.MeshStandardMaterial();
  m.name = 'steel';
  return m;
};

/** A 20 m plate with a 4 m box standing on it and a ball floating clear. */
function yard() {
  const root = new THREE.Group();
  root.name = 'yard';
  const mat = steel();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 20), mat);
  plate.name = 'plate';
  const box = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), mat);
  box.name = 'box';
  // A hand over the plate, not on it: faces that coincide are a case no
  // hull makes on purpose and no bake can read.
  box.position.set(3, 2.7, 0);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 6), mat);
  ball.name = 'ball';
  ball.position.set(-5, 30, -4);
  root.add(plate, box, ball);
  return { root, plate, box, ball };
}

/** The map's mean value at the corners of `mesh` whose world position and normal pass `where`. */
function readAt(ao, mesh, where) {
  mesh.updateMatrixWorld(true);
  const g = mesh.geometry;
  const p = g.attributes.position;
  const nrm = g.attributes.normal;
  const uv = g.attributes.uv1;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const values = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
    n.fromBufferAttribute(nrm, i);
    if (!where(v, n)) continue;
    const x = Math.min(ao.size - 1, Math.floor(uv.getX(i) * ao.size));
    const y = Math.min(ao.size - 1, Math.floor(uv.getY(i) * ao.size));
    values.push(ao.pixels[y * ao.size + x]);
  }
  assert.ok(values.length > 0, 'no corner matched');
  return values.reduce((a, b) => a + b, 0) / values.length;
}

test('a lone convex body reads open, and a face under a box reads shaded', () => {
  const { root, plate, box, ball } = yard();
  const ao = bakeOcclusion(root, { size: 128, reach: 6 });
  // The ball floats 30 m up with a reach of 6: nothing it casts to is there.
  assert.ok(readAt(ao, ball, () => true) >= 250, 'the ball should read open');
  // The box's underside faces the plate 0.2 m away: as shaded as it gets.
  const under = readAt(ao, box, (v, n) => n.y < -0.5);
  assert.ok(under <= 40, `the box's underside reads ${under}`);
  // The plate's far corner, 9 m from the box, is open sky.
  const far = readAt(ao, plate, (v, n) => n.y > 0.5 && v.x < -9 && v.z < -9);
  assert.ok(far >= 235, `the plate's far corner reads ${far}`);
  assert.ok(far - under > 150, 'the shaded face must read darker than the open one');
});

test('every corner lands inside the atlas, and no vertex moves', () => {
  const { root } = yard();
  const before = sceneParts(root).parts.map((p) => Float32Array.from(p.positions));
  bakeOcclusion(root, { size: 64 });
  const after = sceneParts(root).parts;
  after.forEach((p, i) => {
    assert.deepEqual(p.positions, before[i], `${p.name} moved`);
    assert.ok(p.uv1, `${p.name} has no uv1`);
    for (const c of p.uv1) assert.ok(c >= 0 && c <= 1, `${p.name} uv1 ${c} outside the atlas`);
  });
});

test('two bakes of one scene are one bake', () => {
  const a = bakeOcclusion(yard().root, { size: 64 });
  const b = bakeOcclusion(yard().root, { size: 64 });
  assert.deepEqual(a.pixels, b.pixels);
  assert.equal(a.charts, b.charts);
  assert.ok(a.png.equals(b.png));
});

test('a haze neither shades nor carries the map', () => {
  const { root } = yard();
  const haze = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.1 });
  haze.name = 'haze';
  const veil = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 30), haze);
  veil.name = 'veil';
  veil.position.y = 3;
  root.add(veil);
  const ao = bakeOcclusion(root, { size: 128, reach: 6 });
  assert.ok(!ao.materials.has('haze'));
  assert.ok(ao.materials.has('steel'));
  // The plate's far corner lies under the veil and still reads open.
  const far = readAt(
    ao,
    root.getObjectByName('plate'),
    (v, n) => n.y > 0.5 && v.x < -9 && v.z < -9
  );
  assert.ok(far >= 235, `the plate under a haze reads ${far}`);
});

test('the export carries the map, and glb.mjs reads it back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'occlusion-'));
  process.env.HULL_MODELS_OUT = dir;
  try {
    // kit.mjs shims FileReader for the exporter at import, so it is imported
    // here rather than at the top: the tests above want no exporter.
    const { exportGlb } = await import('../kit.mjs');
    const { root } = yard();
    await exportGlb(root, 'yard.glb', { occlusion: { size: 64, reach: 6 } });
    const file = readGlb(join(dir, 'yard.glb'));
    assert.ok(file.occlusion, 'no occlusion map in the file');
    assert.equal(file.occlusion.width, 64);
    assert.equal(file.occlusion.texCoord, 1);
    assert.deepEqual(file.occlusion.materials, ['steel']);
    assert.equal(file.parts.length, 3);
    for (const p of file.parts) assert.ok(p.uv1 && p.uv1.length === p.tris * 6, `${p.name} uv1`);
    // What the loader will sample is what was baked.
    const live = bakeOcclusion(yard().root, { size: 64, reach: 6 });
    assert.deepEqual(file.occlusion.pixels, live.pixels);
  } finally {
    delete process.env.HULL_MODELS_OUT;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('png.mjs round-trips a grey image', () => {
  const w = 37;
  const h = 11;
  const pixels = Uint8Array.from({ length: w * h }, (_, i) => (i * 37) % 256);
  const back = decodeGray(encodeGray(w, h, pixels));
  assert.equal(back.width, w);
  assert.equal(back.height, h);
  assert.deepEqual(back.pixels, pixels);
});
