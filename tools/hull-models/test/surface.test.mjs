/**
 * surface.mjs draws a navy material's tiling relief, and the conn view reads
 * it at the High graphics quality (#1811). What a reader of the image relies
 * on: it tiles on both axes, since the client repeats it over a hull; level
 * ground is byte 128 in both slope channels, and a slope reads back as the
 * rise the pattern drew; no navy's table clips a slope; the draw is the same
 * every time, since check.mjs compares it with the committed file; and the
 * committed images and the generated scales are the draw's own.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LEVEL, drawSurface, hash, surfaceHeight } from '../surface.mjs';
import { decodeRgb, encodeRgb } from '../png.mjs';
import { SURFACE_FILE, drawAll, navySurfaces, renderSource, surfacePath } from '../surfaces.mjs';

/** Rings alone: a sine along `u`, nothing along `v`. */
const RINGS = {
  pattern: 'banded',
  size: 64,
  tileM: 8,
  slope: 1,
  bands: 2,
  bandM: 0.5,
  driftRad: 0,
  driftCells: 1,
  fibre: [1, 1],
  fibreM: 0,
};

const channel = (drawn, k) => drawn.pixels.filter((_, i) => i % 3 === k);

test('an RGB image comes back from its own bytes', () => {
  const pixels = Uint8Array.from({ length: 5 * 3 * 3 }, (_, i) => (i * 37) % 256);
  const back = decodeRgb(encodeRgb(5, 3, pixels));
  assert.equal(back.width, 5);
  assert.equal(back.height, 3);
  assert.deepEqual(back.pixels, pixels);
});

test('the hash moves as far along its last integer as along its first', () => {
  // trim.mjs `hash` moves a hundredth a step along its last, which is why
  // this file has one of its own: a lattice built on that runs in streaks.
  let first = 0;
  let last = 0;
  for (let i = 0; i < 400; i++) {
    first += Math.abs(hash(7, i + 1, 3) - hash(7, i, 3));
    last += Math.abs(hash(7, 3, i + 1) - hash(7, 3, i));
  }
  // Two uniform draws differ by a third on average.
  for (const mean of [first / 400, last / 400]) assert.ok(mean > 0.28 && mean < 0.39, `${mean}`);
});

test('level ground is byte 128 in both slope channels', () => {
  const flat = drawSurface({ ...RINGS, bandM: 0 });
  assert.ok(channel(flat, 0).every((b) => b === LEVEL));
  assert.ok(channel(flat, 1).every((b) => b === LEVEL));
  assert.equal(flat.reliefM, 0);
});

test('a slope reads back as the rise the pattern drew', () => {
  const drawn = drawSurface(RINGS);
  assert.equal(drawn.clipped, 0);
  // Nothing varies along v, so green is level everywhere.
  assert.ok(channel(drawn, 1).every((b) => b === LEVEL));
  const texelM = RINGS.tileM / RINGS.size;
  const k = (2 * Math.PI * RINGS.bands) / RINGS.tileM;
  for (let x = 0; x < RINGS.size; x++) {
    const u = (x + 0.5) * texelM;
    // The draw takes a central difference over two texels.
    const rise =
      (RINGS.bandM * (Math.sin(k * (u + texelM)) - Math.sin(k * (u - texelM)))) / (2 * texelM);
    const read = ((drawn.pixels[x * 3] - LEVEL) / 127) * RINGS.slope;
    assert.ok(Math.abs(read - rise) < 1 / 127, `column ${x}: ${read} for ${rise}`);
  }
  // Blue spans the relief: a crest at 255, a trough at 0.
  assert.ok(Math.abs(drawn.reliefM - 2 * RINGS.bandM) < 0.01);
  assert.equal(Math.max(...channel(drawn, 2)), 255);
  assert.equal(Math.min(...channel(drawn, 2)), 0);
});

test('a slope past the table is held to it and counted', () => {
  const steep = drawSurface({ ...RINGS, slope: 0.1 });
  assert.ok(steep.clipped > 0);
  assert.equal(Math.max(...channel(steep, 0)), LEVEL + 127);
  assert.equal(Math.min(...channel(steep, 0)), LEVEL - 127);
});

test('an unknown pattern is refused', () => {
  assert.throws(
    () => drawSurface({ ...RINGS, pattern: 'riveted' }),
    /no surface pattern named riveted/
  );
});

test("every navy's surface tiles, clips nothing and draws the same twice", async () => {
  const navies = await navySurfaces();
  assert.ok(navies.has('pelagia'));
  for (const [navy, surface] of navies)
    for (const [material, table] of Object.entries(surface.materials)) {
      const drawn = drawSurface(table);
      const name = `${navy}-${material}`;
      assert.equal(drawn.clipped, 0, `${name} clips ${drawn.clipped} slopes`);
      assert.deepEqual(drawSurface(table).pixels, drawn.pixels, `${name} drew two ways`);
      // One tile on, either way, the relief is where it was: the client
      // repeats the image over a hull, and a field that did not close would
      // draw its edge down every hull as a crease.
      const height = surfaceHeight(table);
      const T = table.tileM;
      for (let i = 0; i < 200; i++) {
        const u = hash(1, i) * T;
        const v = hash(2, i) * T;
        const here = height(u, v);
        assert.ok(Math.abs(height(u + T, v) - here) < 1e-9, `${name} seams along u`);
        assert.ok(Math.abs(height(u, v + T) - here) < 1e-9, `${name} seams along v`);
        assert.ok(Math.abs(height(u - T, v - T) - here) < 1e-9, `${name} seams behind 0`);
      }
      const n = drawn.size;
      // Slopes about level: a tile that closes on itself rises as much as it falls.
      for (const k of [0, 1]) {
        const mean = channel(drawn, k).reduce((a, b) => a + b, 0) / (n * n);
        assert.ok(Math.abs(mean - LEVEL) < 0.5, `${name} channel ${k} leans: ${mean}`);
      }
    }
});

test('the committed images and the generated scales are the draw', async () => {
  const rows = await drawAll();
  for (const { name, drawn } of rows) {
    const committed = decodeRgb(readFileSync(surfacePath(name)));
    assert.equal(committed.width, drawn.size);
    assert.deepEqual(committed.pixels, drawn.pixels, `${name}.png is not its draw`);
  }
  assert.equal(readFileSync(SURFACE_FILE, 'utf8'), await renderSource(rows));
});
