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
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { PLATES, bandsOf, drawTrimSheet, layoutTrim } from '../trim.mjs';
import { readGlb, sceneParts } from '../glb.mjs';
import { stripImages } from '../images.mjs';
import { TRIM } from '../factions/bathyarch.mjs';
import { TRIM as DIRECTORATE } from '../factions/directorate.mjs';
import { TRIM as HADRON } from '../factions/hadron.mjs';
import { TRIM as PELAGIA } from '../factions/pelagia.mjs';
import { navyTrims, repo, sheetPath } from '../sheets.mjs';

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

test('the Directorate draws repeatable grey chitin without changing the Consortium sheet', async () => {
  const trims = await navyTrims();
  assert.equal(trims.get('directorate'), DIRECTORATE);
  const sheet = drawTrimSheet(DIRECTORATE);
  assert.deepEqual(sheet.png, drawTrimSheet(DIRECTORATE).png);
  assert.equal(sheet.png[25], 0, 'PNG must have one grey channel, not faction colour');
  assert.ok(sheet.mean >= 0.85 && sheet.mean < 0.98, `mean ${sheet.mean}`);
  assert.equal(sheet.wrapM, 16);
  assert.notDeepEqual(sheet.pixels, drawTrimSheet(SPEC).pixels);
  assert.deepEqual(drawTrimSheet(SPEC).png, readFileSync(sheetPath('bathyarch')));
});

test('tergite seams arch across strakes, with an overlap shadow rather than a rectangular grid', () => {
  const sheet = drawTrimSheet({ ...DIRECTORATE, tone: 0, grain: 0, growth: 0 });
  const four = band(4);
  const h = ((four.v1 - four.v0) * sheet.size) / four.rows;
  const y = Math.floor(four.v0 * sheet.size + h / 2);
  const seamX = sheet.size / 2 - DIRECTORATE.archPx;
  const at = (x, row = y) => sheet.pixels[row * sheet.size + x];
  assert.ok(at(seamX) < at(sheet.size / 2) - 40, 'the seam did not bow off the plate grid');
  assert.ok(at(seamX + 5) < at(seamX - 5) - 5, 'the overlap has no directional shadow');
  assert.ok(at(128, four.v0 * sheet.size) > 240, 'a longitudinal strake seam draws a grid');
  assert.ok(Math.abs(at(0) - at(sheet.size - 1)) <= 2, 'the horizontal wrap does not close');
  const grown = drawTrimSheet({ ...DIRECTORATE, tone: 0, grain: 0 });
  assert.ok(grown.mean < sheet.mean, 'growth lines have no luminance');
});

test('the Directorate layout changes only UVs and tags, never shape, finish or lamps', () => {
  const { root, lamp, haze } = yard();
  const before = sceneParts(root).parts;
  const finishes = root.children.map((m) => m.material.toJSON());
  const laid = layoutTrim(root, drawTrimSheet(DIRECTORATE), DIRECTORATE);
  sceneParts(root).parts.forEach((p, i) => {
    assert.deepEqual(p.positions, before[i].positions, `${p.name} moved`);
    assert.deepEqual(p.normals, before[i].normals, `${p.name} normals changed`);
    assert.equal(p.tris, before[i].tris);
    assert.ok(p.uv0 && p.uv0.length === p.tris * 6, `${p.name} has no UV0`);
  });
  assert.deepEqual([...laid.materials], ['steel']);
  assert.equal(root.children[0].material.userData.trim, 'directorate');
  assert.equal(lamp.material.userData.trim, undefined);
  assert.equal(haze.material.userData.trim, undefined);
  root.children.forEach((m, i) => {
    const finish = m.material.toJSON();
    delete finish.userData;
    assert.deepEqual(finish, finishes[i], `${m.name} finish changed`);
  });
});

test('the Knights draw a grey facet sheet, bright, and the same twice', async () => {
  const trims = await navyTrims();
  assert.equal(trims.get('hadron'), HADRON);
  const sheet = drawTrimSheet(HADRON);
  assert.deepEqual(sheet.png, drawTrimSheet(HADRON).png);
  assert.deepEqual(sheet.png, readFileSync(sheetPath('hadron')));
  assert.equal(sheet.png[25], 0, 'PNG must have one grey channel, not faction colour');
  // Held bright for the register the conn view puts a navy on: a polished
  // navy no darker than riveted plate.
  assert.ok(sheet.mean >= drawTrimSheet(SPEC).mean && sheet.mean < 0.98, `mean ${sheet.mean}`);
  assert.equal(sheet.wrapM, PLATES * HADRON.plateM);
});

test('a facet grid is aligned, and every band turned over is itself', () => {
  const sheet = drawTrimSheet(HADRON);
  const n = sheet.size;
  const at = (x, y) => sheet.pixels[y * n + x];
  for (const b of bandsOf()) {
    // v -> v0 + v1 - v, which is how the layout lands port against starboard.
    const y0 = b.v0 * n;
    const y1 = b.v1 * n;
    let worst = 0;
    for (let y = y0; y < (y0 + y1) / 2; y++)
      for (let x = 0; x < n; x++)
        worst = Math.max(worst, Math.abs(at(x, y) - at(x, y0 + y1 - 1 - y)));
    assert.ok(worst <= 1, `the ${b.rows}-strake band differs from itself turned over by ${worst}`);
    // No stagger: every strake's butts are at the wrap's halves (u 0 and ½), none at its
    // quarters.
    const h = (y1 - y0) / b.rows;
    for (let s = 0; s < b.rows; s++) {
      const y = Math.floor(y0 + h * s + h / 2);
      for (const x of [0, n / 2]) assert.ok(at(x, y) < 200, `no butt at ${x} on strake ${s}`);
      for (const x of [n / 4, (3 * n) / 4]) assert.ok(at(x, y) > 240, `a butt at ${x}, ${s}`);
    }
  }
  const mid = Math.floor(band(8).v0 * n + n / 32);
  assert.ok(Math.abs(at(0, mid) - at(n - 1, mid)) <= 1, 'the horizontal wrap does not close');
});

test('a facet joint is a hairline lit on both sides, as wide in metres both ways', () => {
  const sheet = drawTrimSheet(HADRON);
  const n = sheet.size;
  const at = (x, y) => sheet.pixels[y * n + x];
  const eight = band(8);
  const strakeH = ((eight.v1 - eight.v0) * n) / 8;
  const y0 = eight.v0 * n;
  const texU = sheet.wrapM / n;
  const texV = HADRON.strakeM / strakeH;
  const row = Math.floor(y0 + strakeH / 2);
  const panel = at(n / 4, row);
  const dark = (v) => v < panel - 40;
  // Out from the butt at u 0.5 both ways along the strake's middle, and out
  // from the first strake's top both ways down the first plate's middle.
  const run = (x, y, dx, dy) => {
    let k = 0;
    while (dark(at(x + k * dx, y + k * dy))) k++;
    return { k, past: at(x + k * dx, y + k * dy) };
  };
  const left = run(n / 2 - 1, row, -1, 0);
  const right = run(n / 2, row, 1, 0);
  const below = run(n / 4, y0 + strakeH - 1, 0, -1);
  const above = run(n / 4, y0 + strakeH, 0, 1);
  assert.ok(Math.abs(left.k - right.k) <= 1, `butt ${left.k} texels one side, ${right.k} other`);
  assert.ok(Math.abs(below.k - above.k) <= 1, `strake seam ${below.k} below, ${above.k} above`);
  for (const [k, tex] of [
    [left.k + right.k, texU],
    [below.k + above.k, texV],
  ])
    assert.ok(
      Math.abs(k * tex - HADRON.seamM) <= tex,
      `${k} texels of ${tex} m for ${HADRON.seamM}`
    );
  // The chamfer: past the hairline on every side, lighter than the panel.
  for (const side of [left, right, below, above])
    assert.ok(side.past > panel, `${side.past} past the seam, the panel ${panel}`);
  // Between its chamfers a panel is one value: no grain, grime, ramp or rivet.
  const inU = Math.ceil((HADRON.seamM / 2 + HADRON.chamferM) / texU) + 1;
  const inV = Math.ceil((HADRON.seamM / 2 + HADRON.chamferM) / texV) + 1;
  const values = new Set();
  for (let y = y0 + inV; y < y0 + strakeH - inV; y++)
    for (let x = inU; x < n / 2 - inU; x++) values.add(at(x, y));
  assert.deepEqual([...values], [panel]);
});

test('the facet layout lays port as starboard turned over, not shifted', () => {
  // Plates whose long side runs across the beam, where a layout measured
  // from each part's own lowest z puts the port twin's joints at other
  // distances from the keel (#1109): a starboard plate, its port twin, and
  // one plate across the keel, 4 m wide so its face takes the one-strake
  // band, the one band whose two plates differ in tone. There a joint on
  // the centreline would swap the plates either side of it, and show.
  const root = new THREE.Group();
  const mat = steel();
  const plate = (name, z0, z1, wide = 10) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(wide, 0.5, z1 - z0), mat);
    m.name = name;
    m.position.set(0, 0, (z0 + z1) / 2);
    root.add(m);
    return m;
  };
  const star = plate('seam_s', 3.5, 14.6);
  const port = plate('seam_p', -14.6, -3.5);
  const keel = plate('seam_0', -7.3, 7.3, 4);
  const sheet = drawTrimSheet(HADRON);
  layoutTrim(root, sheet, HADRON);
  // A flat face's UV is affine in position, so one top triangle gives the
  // whole top face's map.
  const topMap = (mesh) => {
    mesh.updateMatrixWorld(true);
    const g = mesh.geometry;
    const tri = [];
    for (let k = 0; k < g.index.count && tri.length < 3; k += 3) {
      const ids = [0, 1, 2].map((c) => g.index.getX(k + c));
      if (ids.every((i) => g.attributes.normal.getY(i) > 0.9)) tri.push(...ids);
    }
    const p = tri.map((i) =>
      new THREE.Vector3()
        .fromBufferAttribute(g.attributes.position, i)
        .applyMatrix4(mesh.matrixWorld)
    );
    const uv = tri.map((i) => [g.attributes.uv.getX(i), g.attributes.uv.getY(i)]);
    // Solve [x z 1] · [a b c] = uv for each channel.
    const m = new THREE.Matrix3().set(p[0].x, p[0].z, 1, p[1].x, p[1].z, 1, p[2].x, p[2].z, 1);
    const inv = m.clone().invert();
    const coef = (ch) => new THREE.Vector3(uv[0][ch], uv[1][ch], uv[2][ch]).applyMatrix3(inv);
    const [cu, cv] = [coef(0), coef(1)];
    return (x, z) => [cu.x * x + cu.y * z + cu.z, cv.x * x + cv.y * z + cv.z];
  };
  const texel = ([u, v]) => {
    const n = sheet.size;
    const x = Math.floor((((u % 1) + 1) % 1) * n);
    const y = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    return sheet.pixels[y * n + x];
  };
  const [s, p, k] = [star, port, keel].map(topMap);
  let worst = 0;
  let joints = 0;
  const tones = new Set();
  // An irrational step, so no sample sits on a texel's edge, and every
  // sample on its plate: the twins' 10 by 11.1 m, the keel's 4 by 14.6.
  for (let i = 0; i < 400; i++) {
    const a = (i * 0.6180339887) % 1;
    const b = (i * 0.7548776662) % 1;
    const [x, z] = [-4.9 + a * 9.8, 3.6 + b * 10.9];
    const [xk, zk] = [-1.95 + a * 3.9, 0.05 + b * 7.2];
    const pair = [
      [texel(s(x, z)), texel(p(x, -z))],
      [texel(k(xk, zk)), texel(k(xk, -zk))],
    ];
    for (const [one, other] of pair) worst = Math.max(worst, Math.abs(one - other));
    if (texel(s(x, z)) < 200) joints++;
    const t = texel(k(xk, zk));
    if (t > 230 && t < 255) tones.add(t);
  }
  assert.ok(joints > 0, 'no sample fell on a joint, so the pairs prove nothing');
  assert.ok(tones.size > 1, `the keel plate's panels are one tone, ${[...tones]}: parity hides`);
  assert.ok(worst <= 1, `a point and its mirror differ by ${worst} grey levels`);
});

/** The Commune's sheet as it ships, drawn once: sixteen samples a texel take seconds. */
let grownSheet = null;
const grown = () => (grownSheet ??= drawTrimSheet(PELAGIA));

test('the Commune draws a grey grown sheet, bright, and the one sheets.mjs wrote', async () => {
  const trims = await navyTrims();
  assert.equal(trims.get('pelagia'), PELAGIA);
  const sheet = grown();
  // The committed file is an earlier draw, so this is the same sheet twice.
  assert.deepEqual(sheet.png, readFileSync(sheetPath('pelagia')));
  assert.equal(sheet.png[25], 0, 'PNG must have one grey channel, not faction colour');
  // A matte grown skin: over riveted plate, under the Directorate's chitin,
  // which carries one seam a tergite where this carries a line an increment.
  assert.ok(sheet.mean >= 0.9 && sheet.mean < 0.93, `mean ${sheet.mean}`);
  assert.equal(sheet.wrapM, PLATES * PELAGIA.plateM);
});

test('grown lines run along the strake, no joint crosses them, and every plate repeats', () => {
  // The lines alone: no grain, tone or mottle to blur what runs which way.
  const bare = drawTrimSheet({ ...PELAGIA, tone: 0, mottle: 0, grain: 0, samples: 2 });
  const n = bare.size;
  const at = (x, y) => bare.pixels[y * n + x];
  let along = 0;
  let across = 0;
  for (let y = 0; y < n - 1; y++)
    for (let x = 0; x < n - 1; x++) {
      along += Math.abs(at(x + 1, y) - at(x, y));
      across += Math.abs(at(x, y + 1) - at(x, y));
    }
  assert.ok(across > 10 * along, `lines change ${across} across the strake, ${along} along it`);
  // A butt is a column dark through its strake; here every column of a band
  // crosses about as much line as every other.
  for (const b of bandsOf()) {
    const y0 = b.v0 * n;
    const y1 = b.v1 * n;
    const means = [];
    for (let x = 0; x < n; x++) {
      let sum = 0;
      for (let y = y0; y < y1; y++) sum += at(x, y);
      means.push(sum / (y1 - y0));
    }
    const spread = Math.max(...means) - Math.min(...means);
    assert.ok(spread <= 8, `a column of the ${b.rows}-strake band stands ${spread} levels out`);
  }
  // A round part unrolls at whole plates, one plate being half a wrap, so
  // its unroll's two edges meet a plate apart in `u`: everything that varies
  // along the strake repeats every plate, or a one-plate stem wears a seam
  // down one beam (#1110, at review).
  const plate = n / PLATES;
  let apart = 0;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < plate; x++) apart = Math.max(apart, Math.abs(at(x, y) - at(x + plate, y)));
  assert.ok(apart <= 1, `a plate along, the sheet differs by ${apart} levels`);
  // As shipped, the wrap closes: the step from the last column to the first
  // is no bigger than a step inside the sheet's own grain.
  const sheet = grown();
  let wrap = 0;
  for (let y = 0; y < n; y++)
    wrap = Math.max(wrap, Math.abs(sheet.pixels[y * n] - sheet.pixels[y * n + n - 1]));
  assert.ok(wrap <= 2, `the horizontal wrap opens by ${wrap} levels`);
});

test('grown increments wander, space themselves unevenly, and come in two weights', () => {
  const bare = drawTrimSheet({ ...PELAGIA, tone: 0, mottle: 0, grain: 0, samples: 2 });
  const n = bare.size;
  const at = (x, y) => bare.pixels[y * n + x];
  /** Each dark run down column `x` of a band: its middle row and its darkest level. */
  const lines = (x, b) => {
    const out = [];
    let start = -1;
    let darkest = 255;
    for (let y = b.v0 * n; y <= b.v1 * n; y++) {
      const dark = y < b.v1 * n && at(x, y) < 245;
      if (dark) {
        if (start < 0) start = y;
        darkest = Math.min(darkest, at(x, y));
      } else if (start >= 0) {
        out.push({ y: (start + y - 1) / 2, darkest });
        start = -1;
        darkest = 255;
      }
    }
    return out;
  };
  const two = band(2);
  const here = lines(0, two).map((l) => l.y);
  const there = lines(n / (2 * PLATES), two).map((l) => l.y);
  // Half a plate along, a straight line would sit on the same row.
  const moved = here.filter((y) => there.every((z) => Math.abs(z - y) > 1));
  assert.ok(moved.length > 0, `every line at u 0 is half a plate on too: ${here} / ${there}`);
  // A jig spaces its rings evenly; a grown strake does not.
  const gaps = here.slice(1).map((y, i) => y - here[i]);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) > 2, `even gaps ${gaps}`);
  // The checks are darker than the fine lines and fewer: two weights of line.
  const all = bandsOf().flatMap((b) => lines(0, b));
  const checks = all.filter((l) => l.darkest < 210);
  const fine = all.filter((l) => l.darkest >= 215);
  assert.ok(checks.length > 0 && fine.length > checks.length, `${checks.length} / ${fine.length}`);
});

test('`untagged` lays a cladding out and leaves it bare', () => {
  const { root, slab, drum } = yard();
  const stone = new THREE.MeshStandardMaterial();
  stone.name = HADRON.untagged[0];
  drum.material = stone;
  const laid = layoutTrim(root, drawTrimSheet(HADRON), HADRON);
  assert.deepEqual([...laid.materials], ['steel']);
  assert.equal(slab.material.userData.trim, 'hadron');
  assert.equal(stone.userData.trim, undefined);
  const part = sceneParts(root).parts.find((p) => p.name === 'drum');
  assert.ok(part.uv0 && part.uv0.length === part.tris * 6, 'the drum was not laid out');
});

test('the Responsory is on the Knights sheet with its crystal bare', () => {
  const file = readGlb(join(repo, 'docs/concept-art/models/responsory-hadron.glb'));
  assert.equal(file.trim.sheet, HADRON.name);
  assert.deepEqual([...file.trim.materials].sort(), ['pale_alloy', 'shadow_indigo']);
  assert.ok(file.parts.some((p) => p.material === 'resonance_crystal'), 'no crystal to keep bare');
  for (const p of file.parts) assert.ok(p.uv0 && p.uv0.length === p.tris * 6, `${p.name} uv0`);
});

test('the Reed is on the Commune sheet with its unlit vein bare', () => {
  const file = readGlb(join(repo, 'docs/concept-art/models/reed-pelagia.glb'));
  assert.equal(file.trim.sheet, PELAGIA.name);
  assert.deepEqual(
    [...file.trim.materials].sort(),
    ['algae_membrane', 'chitin_hull', 'growth_ridge', 'spore_pod']
  );
  assert.ok(file.parts.some((p) => p.material === 'bio_vein_unlit'), 'no vein to keep bare');
  for (const p of file.parts) assert.ok(p.uv0 && p.uv0.length === p.tris * 6, `${p.name} uv0`);
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
