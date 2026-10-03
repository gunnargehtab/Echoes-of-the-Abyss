/**
 * trim.mjs lays a model's UV0 out in metres and draws the sheet it reads
 * (#1005). What a reader of that file relies on: a flat face takes the band
 * whose strakes come nearest the navy's over its cross extent, and runs its
 * plates along its longer side from its own edge; a round part unrolls at
 * whole plates so its seam closes on a seam; every corner gets a UV and no
 * vertex moves; two layouts of one scene are one layout, since check.mjs
 * compares them; the sheet stays bright enough that the register the conn
 * view puts a navy on hardly moves; and the file comes back through glb.mjs
 * with the sheet on its solid unlit materials and the layout on every part,
 * and through images.mjs without it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { PLATES, bandsOf, drawTrimSheet, layoutTrim } from '../trim.mjs';
import { readGlb, sceneParts } from '../glb.mjs';
import { stripImages } from '../images.mjs';
import { TRIM } from '../factions/bathyarch.mjs';

/** The Klaxon's own sheet: the seam is given in texels, so a smaller one would not be it. */
const SPEC = TRIM;

const steel = () => {
  const m = new THREE.MeshStandardMaterial();
  m.name = 'steel';
  return m;
};

/** A slab, a drum standing on it, a lamp on the drum, and a haze over all. */
function yard() {
  const root = new THREE.Group();
  root.name = 'yard';
  const mat = steel();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 60), mat);
  slab.name = 'slab';
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 10, 12), mat);
  drum.name = 'drum';
  drum.position.set(0, 12, 0);
  const lampMat = new THREE.MeshStandardMaterial({ emissive: 0xffaa00 });
  lampMat.name = 'lamp';
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lampMat);
  lamp.name = 'lamp';
  lamp.position.set(0, 17.5, 0);
  const hazeMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.1 });
  hazeMat.name = 'haze';
  const haze = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 70), hazeMat);
  haze.name = 'haze';
  haze.position.y = 20;
  root.add(slab, drum, lamp, haze);
  return { root, slab, drum, lamp, haze };
}

/** The UVs at the corners of `mesh` whose world normal passes `where`. */
function uvsAt(mesh, where) {
  mesh.updateMatrixWorld(true);
  const g = mesh.geometry;
  const nrm = g.attributes.normal;
  const uv = g.attributes.uv;
  const idx = g.index;
  const count = idx ? idx.count : uv.count;
  const n = new THREE.Vector3();
  const out = [];
  for (let k = 0; k < count; k++) {
    const i = idx ? idx.getX(k) : k;
    n.fromBufferAttribute(nrm, i).transformDirection(mesh.matrixWorld);
    if (where(n)) out.push([uv.getX(i), uv.getY(i)]);
  }
  assert.ok(out.length > 0, 'no corner matched');
  return out;
}

const band = (rows) => bandsOf().find((b) => b.rows === rows);
const inBand = (uvs, rows) =>
  uvs.every(([, v]) => v >= band(rows).v0 - 1e-6 && v <= band(rows).v1 + 1e-6);

test('a flat face takes the band its cross extent asks for, plates along its longer side', () => {
  const { root, slab } = yard();
  const sheet = drawTrimSheet(SPEC);
  layoutTrim(root, sheet, SPEC);
  // The deck: 60 m along z, 24 m across x — four strakes of 6 m, and two
  // and a half wraps of 24 m from the deck's own edge.
  const deck = uvsAt(slab, (n) => n.y > 0.9);
  assert.ok(inBand(deck, 4), 'the deck is not on the four-strake band');
  const us = deck.map(([u]) => u);
  assert.ok(Math.min(...us) > -1e-6 && Math.abs(Math.max(...us) - 2.5) < 1e-6, `deck u ${us}`);
  // A flank: 60 m along z, 14 m up — two strakes of 7 m.
  const flank = uvsAt(slab, (n) => n.x > 0.9);
  assert.ok(inBand(flank, 2), 'the flank is not on the two-strake band');
  // The bow: 24 m across, 14 m up — two strakes again, one wrap along.
  const bow = uvsAt(slab, (n) => n.z > 0.9);
  assert.ok(inBand(bow, 2));
  assert.ok(Math.abs(Math.max(...bow.map(([u]) => u)) - 1) < 1e-6);
});

test('a round part unrolls at whole plates round its girth', () => {
  const { root, drum } = yard();
  const sheet = drawTrimSheet(SPEC);
  layoutTrim(root, sheet, SPEC);
  // A 2 m drum is 12.6 m round: one 12 m plate, half a wrap of the sheet.
  const side = uvsAt(drum, (n) => Math.abs(n.y) < 0.1);
  const us = side.map(([u]) => u);
  assert.ok(Math.abs(Math.max(...us) - Math.min(...us) - 1 / PLATES) < 1e-6, `side u ${us}`);
  // Ten metres tall: two strakes along its length.
  assert.ok(inBand(side, 2), 'the side is not on the two-strake band');
  // Its caps lie flat: a 4 m disc on the one-strake band.
  const cap = uvsAt(drum, (n) => n.y > 0.9);
  assert.ok(inBand(cap, 1), 'the cap is not on the one-strake band');
});

test('every corner gets a UV, no vertex moves, and two layouts are one', () => {
  const { root } = yard();
  const before = sceneParts(root).parts.map((p) => Float32Array.from(p.positions));
  const sheet = drawTrimSheet(SPEC);
  const laid = layoutTrim(root, sheet, SPEC);
  const after = sceneParts(root).parts;
  after.forEach((p, i) => {
    assert.deepEqual(p.positions, before[i], `${p.name} moved`);
    assert.ok(p.uv0 && p.uv0.length === p.tris * 6, `${p.name} has no uv0`);
  });
  assert.ok(laid.split > 0, 'the drum seam splits no vertex');
  assert.deepEqual([...laid.materials], ['steel']);
  const again = yard().root;
  layoutTrim(again, drawTrimSheet(SPEC), SPEC);
  sceneParts(again).parts.forEach((p, i) => assert.deepEqual(p.uv0, after[i].uv0));
});

test('the sheet is bright, seamed, and the same twice', () => {
  const a = drawTrimSheet(SPEC);
  const b = drawTrimSheet(SPEC);
  assert.ok(a.mean >= 0.85, `mean ${a.mean}`);
  assert.deepEqual(a.pixels, b.pixels);
  assert.ok(a.png.equals(b.png));
  // The eight-strake band: a strake's middle is lighter than its edge.
  const eight = band(8);
  const strakeH = ((eight.v1 - eight.v0) * a.size) / 8;
  const y0 = Math.floor(eight.v0 * a.size);
  const mid = a.pixels[Math.floor(y0 + strakeH / 2) * a.size + Math.floor(a.size / 4)];
  const edge = a.pixels[y0 * a.size + Math.floor(a.size / 4)];
  assert.ok(mid > edge + 40, `strake middle ${mid}, edge ${edge}`);
});

test('the export carries the sheet on the solid unlit materials, and glb.mjs reads it back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'trim-'));
  process.env.HULL_MODELS_OUT = dir;
  try {
    const { exportGlb } = await import('../kit.mjs');
    const { root } = yard();
    await exportGlb(root, 'yard.glb', { trim: SPEC });
    const file = readGlb(join(dir, 'yard.glb'));
    assert.ok(file.trim, 'no trim sheet in the file');
    assert.equal(file.trim.width, SPEC.size);
    assert.equal(file.trim.texCoord, 0);
    assert.deepEqual(file.trim.materials, ['steel']);
    assert.equal(file.occlusion, null);
    assert.equal(file.parts.length, 4);
    for (const p of file.parts) assert.ok(p.uv0 && p.uv0.length === p.tris * 6, `${p.name} uv0`);
    assert.deepEqual(file.trim.pixels, drawTrimSheet(SPEC).pixels);
    // Beside an occlusion map, both land, each in its slot.
    await exportGlb(yard().root, 'both.glb', { trim: SPEC, occlusion: { size: 64, reach: 6 } });
    const both = readGlb(join(dir, 'both.glb'));
    assert.ok(both.trim && both.occlusion);
    assert.equal(both.occlusion.texCoord, 1);
    // And stripped, neither.
    const { readFileSync, writeFileSync } = await import('node:fs');
    writeFileSync(join(dir, 'bare.glb'), Buffer.from(stripImages(readFileSync(join(dir, 'both.glb')))));
    const bare = readGlb(join(dir, 'bare.glb'));
    assert.equal(bare.trim, null);
    assert.equal(bare.occlusion, null);
    assert.equal(bare.parts.length, 4);
  } finally {
    delete process.env.HULL_MODELS_OUT;
    rmSync(dir, { recursive: true, force: true });
  }
});
