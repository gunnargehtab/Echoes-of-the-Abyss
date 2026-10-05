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

/** The Klaxon's own sheet, as the navy draws it. */
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

test('the sheet is bright, lapped, and the same twice', () => {
  const a = drawTrimSheet(SPEC);
  const b = drawTrimSheet(SPEC);
  assert.ok(a.mean >= 0.85, `mean ${a.mean}`);
  assert.deepEqual(a.pixels, b.pixels);
  assert.ok(a.png.equals(b.png));
  // The eight-strake band's first strake, down the middle of its first
  // plate: the seam's shadow falls on the strake's top, and its foot is the
  // lap's lit lip.
  const eight = band(8);
  const strakeH = ((eight.v1 - eight.v0) * a.size) / 8;
  const y0 = Math.floor(eight.v0 * a.size);
  const x = Math.floor(a.size / 4);
  const at = (row) => a.pixels[row * a.size + x];
  const mid = at(Math.floor(y0 + strakeH / 2));
  const top = at(y0 + strakeH - 1);
  const foot = at(y0);
  assert.ok(mid > top + 40, `strake middle ${mid}, top ${top}`);
  assert.ok(foot > mid, `lip ${foot}, middle ${mid}`);
});

test('a seam is as wide in metres along a plate as across a strake', () => {
  const a = drawTrimSheet(SPEC);
  const eight = band(8);
  const strakeH = ((eight.v1 - eight.v0) * a.size) / 8;
  const y0 = Math.floor(eight.v0 * a.size);
  const texU = (PLATES * SPEC.plateM) / a.size;
  const texV = SPEC.strakeM / strakeH;
  // Texels darker than halfway between the plate and its seam, counted
  // back from a joint: along the strake's middle row from the butt at
  // u 0.5, and up the first plate's middle from the strake's top.
  const plate = a.pixels[Math.floor(y0 + strakeH / 2) * a.size + Math.floor(a.size / 4)];
  const dark = (v) => v < plate - 40;
  let along = 0;
  for (let x = a.size / 2 - 1; dark(a.pixels[Math.floor(y0 + strakeH / 2) * a.size + x]); x--)
    along++;
  let across = 0;
  for (let y = y0 + strakeH - 1; dark(a.pixels[y * a.size + Math.floor(a.size / 4)]); y--) across++;
  for (const [n, tex] of [
    [along, texU],
    [across, texV],
  ])
    assert.ok(Math.abs(n * tex - SPEC.seamM) <= tex, `${n} texels of ${tex} m for ${SPEC.seamM} m`);
});

test('a rivet is drawn at its area in metres, not grown to fill its texels', () => {
  const a = drawTrimSheet(SPEC);
  const bare = drawTrimSheet({ ...SPEC, rivet: 0 });
  const eight = band(8);
  const strakeH = ((eight.v1 - eight.v0) * a.size) / 8;
  const y0 = Math.floor(eight.v0 * a.size);
  const texU = (PLATES * SPEC.plateM) / a.size;
  const texV = SPEC.strakeM / strakeH;
  const lin = (b) => {
    const c = b / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  // One rivet of the first strake's foot row, near its first plate's middle:
  // the texels it darkens, each by the share of it the disc covers.
  const pitch = SPEC.rivetPitchM;
  const centre = (Math.floor(SPEC.plateM / 2 / pitch) - 0.5) * pitch;
  let covered = 0;
  const rows = new Set();
  const cols = new Set();
  for (let y = y0; y < y0 + strakeH / 2; y++)
    for (let x = Math.floor((centre - pitch / 2) / texU); x < (centre + pitch / 2) / texU; x++) {
      const i = y * a.size + x;
      const dark = lin(bare.pixels[i]) - lin(a.pixels[i]);
      if (dark <= 0) continue;
      covered += dark / (lin(bare.pixels[i]) * (1 - SPEC.rivet));
      rows.add(y);
      cols.add(x);
    }
  const disc = Math.PI * SPEC.rivetM ** 2;
  const area = covered * texU * texV;
  assert.ok(
    Math.abs(area - disc) <= 0.25 * disc,
    `${area.toFixed(4)} m² for a ${disc.toFixed(4)} m² disc`
  );
  // No wider than the disc on either axis, plus the texel it starts in.
  assert.ok(rows.size <= Math.ceil((2 * SPEC.rivetM) / texV) + 1, `${rows.size} rows`);
  assert.ok(cols.size <= Math.ceil((2 * SPEC.rivetM) / texU) + 1, `${cols.size} columns`);
});

test('a table with no metre keys draws what it drew before them', async () => {
  // The Consortium's table as #1005 shipped it, and the sha of the sheet it drew.
  const { createHash } = await import('node:crypto');
  const before = { size: 512, strakeM: 6, plateM: 12, seamPx: 1.5, weatherPx: 6 };
  const sheet = drawTrimSheet({ ...before, light: 0.98, seam: 0.45, weather: 0.1, tone: 0.08 });
  assert.equal(
    createHash('sha256').update(sheet.png).digest('hex'),
    '1a28249729f5caf96a5f8f4e1b24d2108ee9ba292e2a9dbebe3e40b9ec7818a7'
  );
});

test('the export tags the solid unlit materials for the sheet, and glb.mjs reads it back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'trim-'));
  process.env.HULL_MODELS_OUT = dir;
  try {
    const { exportGlb } = await import('../kit.mjs');
    const { root } = yard();
    await exportGlb(root, 'yard.glb', { trim: SPEC });
    const file = readGlb(join(dir, 'yard.glb'));
    assert.deepEqual(file.trim, { sheet: SPEC.name, materials: ['steel'] });
    assert.equal(file.occlusion, null);
    assert.equal(file.parts.length, 4);
    for (const p of file.parts) assert.ok(p.uv0 && p.uv0.length === p.tris * 6, `${p.name} uv0`);
    // The sheet itself is not in the file: no image at all.
    const { readFileSync, writeFileSync } = await import('node:fs');
    const bytes = readFileSync(join(dir, 'yard.glb'));
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    assert.equal(json.images, undefined);
    assert.equal(json.materials.find((m) => m.name === 'steel').extras.trim, SPEC.name);
    // Beside an occlusion map, the tag and the map both land.
    await exportGlb(yard().root, 'both.glb', { trim: SPEC, occlusion: { size: 64, reach: 6 } });
    const both = readGlb(join(dir, 'both.glb'));
    assert.ok(both.trim && both.occlusion);
    assert.equal(both.occlusion.texCoord, 1);
    // Stripped of its image, the file keeps the layout and the tag.
    writeFileSync(
      join(dir, 'bare.glb'),
      Buffer.from(stripImages(readFileSync(join(dir, 'both.glb'))))
    );
    const bare = readGlb(join(dir, 'bare.glb'));
    assert.deepEqual(bare.trim, both.trim);
    assert.equal(bare.occlusion, null);
    assert.equal(bare.parts.length, 4);
  } finally {
    delete process.env.HULL_MODELS_OUT;
    rmSync(dir, { recursive: true, force: true });
  }
});
