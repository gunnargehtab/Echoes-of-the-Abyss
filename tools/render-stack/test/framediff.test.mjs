import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { decodeRgb, encodeRgb } from '../../hull-models/png.mjs';
import { edgeWidth, lineSteps, luma, main, profile, readPairs, worldArea } from '../framediff.mjs';

/** A `w` × `h` frame of one colour, three bytes a pixel. */
function flat(w, h, [r, g, b]) {
  const pixels = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) pixels.set([r, g, b], i * 3);
  return { width: w, height: h, pixels };
}

/** A copy of `frame` with one box painted. */
function paint(frame, [x0, y0, x1, y1], rgb) {
  const out = { ...frame, pixels: frame.pixels.slice() };
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) out.pixels.set(rgb, (y * frame.width + x) * 3);
  return out;
}

const dir = mkdtempSync(join(tmpdir(), 'framediff-'));
const save = (name, f) => {
  const path = join(dir, name);
  writeFileSync(path, encodeRgb(f.width, f.height, f.pixels));
  return path;
};

test("the world area is the issue-1800 README's rows 52 to 870 of 1080", () => {
  assert.deepEqual(worldArea(1920, 1080), [0, 52, 1920, 870]);
  // diff.py's int() of the scaled rows, at a frame half the size.
  assert.deepEqual(worldArea(960, 540), [0, 26, 960, 435]);
});

test('two identical frames read zero, with no box that moved', () => {
  const a = flat(20, 10, [40, 80, 120]);
  const { rows } = readPairs({ a, b: a, area: [0, 0, 20, 10] });
  assert.equal(rows.length, 1);
  assert.deepEqual(
    { mean: rows[0].mean, over: rows[0].over, changed: rows[0].changed },
    { mean: 0, over: 0, changed: null }
  );
});

test("a pixel's difference is its largest channel's, not their sum", () => {
  const a = flat(10, 10, [100, 100, 100]);
  // One pixel moves 30 in red and 50 in blue: it reads 50.
  const b = paint(a, [3, 4, 4, 5], [130, 100, 50]);
  const [row] = readPairs({ a, b, area: [0, 0, 10, 10] }).rows;
  assert.equal(row.mean, 50 / 100);
  assert.equal(row.moved, 1);
  assert.deepEqual(row.changed, [3, 4, 3, 4]);
});

test('the threshold counts pixels that moved by more than it, not by it', () => {
  const a = flat(4, 1, [0, 0, 0]);
  const b = { ...a, pixels: Uint8Array.from([2, 0, 0, 3, 0, 0, 0, 9, 0, 0, 0, 0]) };
  const [row] = readPairs({ a, b, area: [0, 0, 4, 1], over: 2 }).rows;
  assert.equal(row.moved, 2);
  assert.equal(row.over, 0.5);
  assert.deepEqual(row.changed, [1, 0, 2, 0]);
  assert.equal(readPairs({ a, b, area: [0, 0, 4, 1], over: 3 }).rows[0].moved, 1);
});

test('the floor row comes first, and each named box is read clipped to the area', () => {
  const a = flat(40, 20, [10, 10, 10]);
  const again = paint(a, [0, 0, 1, 1], [14, 10, 10]); // one noisy pixel
  const b = paint(a, [30, 5, 35, 10], [200, 10, 10]);
  const { rows } = readPairs({
    a,
    b,
    floor: again,
    area: [0, 2, 40, 20],
    boxes: [{ name: 'vent', box: [28, 0, 50, 12] }],
  });
  assert.deepEqual(
    rows.map((r) => [r.region, r.pair]),
    [
      ['area', 'floor'],
      ['area', 'pair'],
      ['vent', 'floor'],
      ['vent', 'pair'],
    ]
  );
  // The noisy pixel sits above the area, so the floor reads nothing inside it.
  assert.equal(rows[0].moved, 0);
  assert.deepEqual(rows[1].changed, [30, 5, 34, 9]);
  assert.deepEqual(rows[2].box, [28, 2, 40, 12]);
  assert.equal(rows[3].moved, 25);
  assert.equal(rows[3].mean, (25 * 190) / (12 * 10));
});

test('a box outside the area is refused, not read as nothing', () => {
  const a = flat(10, 10, [0, 0, 0]);
  assert.throws(
    () => readPairs({ a, b: a, area: [0, 0, 10, 5], boxes: [{ name: 'low', box: [0, 6, 4, 9] }] }),
    /box low .* outside the area/
  );
});

test('frames of two sizes are refused', () => {
  assert.throws(
    () => readPairs({ a: flat(4, 4, [0, 0, 0]), b: flat(4, 5, [0, 0, 0]), area: [0, 0, 4, 4] }),
    /4×4 and 4×5/
  );
});

test("luma is Pillow's L, in its fixed point", () => {
  // Image.new('RGB', (1, 1), c).convert('L').getpixel((0, 0)) under Pillow 13.
  assert.equal(luma(255, 255, 255), 255);
  assert.equal(luma(0, 0, 0), 0);
  assert.equal(luma(255, 0, 0), 76);
  assert.equal(luma(0, 255, 0), 150);
  assert.equal(luma(0, 0, 255), 29);
  assert.equal(luma(10, 200, 37), 125);
});

test('a line steps one pixel at a time along its longer axis, both ends included', () => {
  assert.deepEqual(lineSteps([2, 5, 6, 5]), [
    [2, 5],
    [3, 5],
    [4, 5],
    [5, 5],
    [6, 5],
  ]);
  assert.deepEqual(lineSteps([0, 0, 2, 4]).length, 5);
  assert.deepEqual(lineSteps([3, 3, 3, 3]), [[3, 3]]);
});

test('a hard edge reads one step, a ramp its length, either way round', () => {
  assert.equal(edgeWidth([0, 0, 0, 255, 255]).width, 1);
  assert.equal(edgeWidth([255, 255, 0, 0]).width, 1);
  assert.equal(edgeWidth([255, 255, 0, 0]).rising, false);
  // 0 to 100 over ten steps of 10: 10% is reached at step 1, 90% at step 9.
  const ramp = Array.from({ length: 11 }, (_, i) => i * 10);
  assert.equal(edgeWidth(ramp).width, 8);
  assert.equal(edgeWidth([...ramp].reverse()).width, 8);
  assert.equal(edgeWidth([7, 8, 7, 8]), null);
});

test('a profile reads each frame along the line, and refuses a line off the frame', () => {
  const dark = flat(10, 4, [0, 0, 0]);
  const lit = paint(dark, [5, 0, 10, 4], [255, 255, 255]);
  const p = profile(lit, [1, 2, 8, 2]);
  assert.deepEqual(p.values, [0, 0, 0, 0, 255, 255, 255, 255]);
  assert.equal(p.edge.width, 1);
  assert.throws(() => profile(lit, [1, 2, 10, 2]), /leaves the 10×4 frame at 10,2/);
});

test('the command line prints the table and writes the diff and floor maps', () => {
  const a = flat(1920, 1080, [20, 30, 40]);
  const pathA = save('main.png', a);
  const pathFloor = save('main-again.png', paint(a, [100, 10, 110, 20], [90, 30, 40]));
  const pathB = save('branch.png', paint(a, [500, 400, 520, 410], [20, 30, 140]));
  const out = join(dir, 'diff.png');
  const lines = [];
  main(
    [pathA, pathB, `--floor=${pathFloor}`, '--box=pool:490,390,530,420', `--out=${out}`],
    (line) => lines.push(line)
  );
  const text = lines.join('\n');
  assert.match(text, /area: x 0 to 1920, y 52 to 870 \(world\)/);
  // The floor's noise sits in the top strip, outside the world area.
  assert.match(text, /\| area \| floor \| 0\.00 \| 0\.00% \| nothing moved \|/);
  assert.match(text, /\| area \| pair \| 0\.01 \| 0\.01% \| x 500 to 519, y 400 to 409 \|/);
  assert.match(text, /\| pool \| pair \| 16\.67 \| 16\.67% \| x 500 to 519, y 400 to 409 \|/);

  const map = decodeRgb(readFileSync(out));
  assert.deepEqual([map.width, map.height], [1920, 818]);
  const px = (x, y) =>
    Array.from(map.pixels.subarray((y * map.width + x) * 3, (y * map.width + x) * 3 + 3));
  assert.deepEqual(px(505, 400 - 52), [255, 0, 0]);
  assert.deepEqual(px(0, 0), [10, 15, 20]);
  assert.ok(readFileSync(join(dir, 'diff-floor.png')).length > 0);
});

test('--json carries the same rows, and --area=frame reads the whole frame', () => {
  const a = flat(100, 100, [0, 0, 0]);
  const pathA = save('small-a.png', a);
  const pathB = save('small-b.png', paint(a, [0, 0, 10, 1], [9, 9, 9]));
  const lines = [];
  main([pathA, pathB, '--area=frame', '--json'], (line) => lines.push(line));
  const record = JSON.parse(lines.join('\n'));
  assert.equal(record.rows.length, 1);
  assert.deepEqual(record.rows[0].box, [0, 0, 100, 100]);
  assert.equal(record.rows[0].moved, 10);
  assert.deepEqual(record.rows[0].changed, [0, 0, 9, 0]);
});

test('the profile mode prints each frame’s edge and one row a step', () => {
  const dark = flat(30, 10, [0, 0, 0]);
  const hard = save('hard.png', paint(dark, [15, 0, 30, 10], [200, 200, 200]));
  const lines = [];
  main([hard, '--profile=10,5,20,5'], (line) => lines.push(line));
  assert.match(lines[0], /line: 10,5 to 20,5, 11 steps/);
  assert.match(lines[1], /edge 1 step\(s\), rising 0 to 200, steps 4 to 5/);
  assert.equal(lines.filter((l) => /^\| \d+ \|/.test(l)).length, 11);
});

test('a bad call names what is wrong', () => {
  assert.throws(() => main(['one.png']), /a pair is two frames/);
  assert.throws(() => main(['a.png', 'b.png', '--box=1,2,3,4']), /--box is <name>:x0,y0,x1,y1/);
  assert.throws(() => main(['a.png', 'b.png', '--over=2.5']), /--over is a whole number/);
  assert.throws(() => main(['a.png', 'b.png', '--frobnicate']), /unknown option --frobnicate/);
});
