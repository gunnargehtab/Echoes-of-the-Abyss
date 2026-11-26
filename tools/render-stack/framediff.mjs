/**
 * Two frames in, the figures a look claim quotes out (#1952): the one script
 * dev-loop's "Look work" names for a claim a script can measure, so a critic
 * re-runs this rather than a round's own diff.py.
 *
 *   node tools/render-stack/framediff.mjs <main.png> <branch.png> \
 *     [--floor=<main-again.png>] [--area=world|frame|x0,y0,x1,y1] [--over=2] \
 *     [--box=<name>:x0,y0,x1,y1 ...] [--out=<diff.png>] [--json]
 *   node tools/render-stack/framediff.mjs <frame.png> [<frame.png> ...] \
 *     --profile=x0,y0,x1,y1 [--json]
 *
 * A pair is read as docs/screenshots/issue-1800/README.md reads one, so every
 * figure quoted since stays comparable: each pixel's largest channel
 * difference, out of 255; their mean over the area; the share that moved by
 * more than `--over`; and the box those pixels span. `--area=world`, the
 * default, is the world area that README reads, cropped as
 * docs/screenshots/issue-1801/low-control/diff.py crops it: under the top strip
 * and over the console, rows 52 to 870 of a 1080-row frame, scaled to the
 * frame's height —
 * the HUD's log and marks move between two takes of one build, and a reading
 * that counts them reads the match, not the change.
 *
 * `--floor` is a second take of the first frame's build. A live match never
 * frames alike twice, so a Low-unchanged figure means nothing without the
 * noise beside it, and it goes in the same table: the floor row first, the
 * pair under it. Before this script one round's floor quoted a take of `main`
 * that was never committed, and two critics could not reproduce it (#1892).
 *
 * `--box` reads a named box as well, clipped to the area. A box, given or
 * printed, is frame pixels with x1 and y1 exclusive as a crop is, so a box
 * that moved can be pasted back as a `--box`; a profile's line runs from one
 * pixel to another, both included.
 * `--out` writes the first frame's area dimmed to half, red where the pair
 * moved by more than `--over`, as diff.py drew it; with `--floor`, the floor's
 * map beside it as `<out>-floor.png`.
 *
 * `--profile` reads across an edge: luma at each pixel step from (x0, y0) to
 * (x1, y1) in every frame given, and the edge's 10–90 width — how many steps
 * the luma takes to cross from 10% to 90% of its range. Luma is Pillow's `L`,
 * in its own fixed point, so a profile agrees with the Python the earlier
 * rounds quoted. A hard edge reads 1 step, a soft one more; a toothed edge
 * reads differently along two parallel lines, so take more than one.
 *
 * Not a gate: it measures what a claim says, and a person or a critic judges
 * the claim. test/framediff.test.mjs holds its arithmetic, under
 * npm run test:render-stack.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { decodeRgb, encodeRgb } from '../hull-models/png.mjs';

/** diff.py's world area, as fractions of the frame's height. */
const WORLD_TOP = 52 / 1080;
const WORLD_BOTTOM = 870 / 1080;

/** `{ width, height, pixels }`, three bytes a pixel, from a PNG on disk. */
export function readFrame(path) {
  return decodeRgb(readFileSync(path));
}

/** The world area of a `width` × `height` frame, as diff.py cropped it. */
export function worldArea(width, height) {
  return [0, Math.trunc(height * WORLD_TOP), width, Math.trunc(height * WORLD_BOTTOM)];
}

/** `[x0, y0, x1, y1]` from `x0,y0,x1,y1`, or a throw that names the text. */
export function parseBox(text) {
  const n = text.split(',').map(Number);
  if (n.length !== 4 || !n.every(Number.isInteger))
    throw new Error(`a box is x0,y0,x1,y1 in whole pixels, not ${text}`);
  return n;
}

/** A box clipped to another; empty when they do not meet. */
function clip([x0, y0, x1, y1], [cx0, cy0, cx1, cy1]) {
  const box = [Math.max(x0, cx0), Math.max(y0, cy0), Math.min(x1, cx1), Math.min(y1, cy1)];
  return box[2] > box[0] && box[3] > box[1] ? box : null;
}

function sameSize(a, b) {
  if (a.width !== b.width || a.height !== b.height)
    throw new Error(`the frames are ${a.width}×${a.height} and ${b.width}×${b.height}`);
}

/** Each pixel's largest channel difference, one byte a pixel over the whole frame. */
export function largestDifference(a, b) {
  sameSize(a, b);
  const out = new Uint8Array(a.width * a.height);
  for (let i = 0; i < out.length; i++) {
    const k = i * 3;
    out[i] = Math.max(
      Math.abs(a.pixels[k] - b.pixels[k]),
      Math.abs(a.pixels[k + 1] - b.pixels[k + 1]),
      Math.abs(a.pixels[k + 2] - b.pixels[k + 2])
    );
  }
  return out;
}

/**
 * A pair's reading over one box of its difference map: the mean, the share
 * that moved by more than `over`, and the box those pixels span, x1 and y1
 * exclusive, or null when none did.
 */
export function readBox(diff, width, [x0, y0, x1, y1], over) {
  let sum = 0;
  let moved = 0;
  let span = null;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const v = diff[y * width + x];
      sum += v;
      if (v > over) {
        moved++;
        if (!span) span = [x, y, x, y];
        else {
          span[0] = Math.min(span[0], x);
          span[1] = Math.min(span[1], y);
          span[2] = Math.max(span[2], x);
          span[3] = Math.max(span[3], y);
        }
      }
    }
  const n = (x1 - x0) * (y1 - y0);
  if (span) {
    span[2]++;
    span[3]++;
  }
  return { mean: sum / n, over: moved / n, moved, changed: span };
}

/**
 * Every row of the table: for each region (the area, then each named box) and
 * each pair (the floor first, when there is one), a reading.
 */
export function readPairs({ a, b, floor = null, area, boxes = [], over = 2 }) {
  const pairs = [];
  if (floor) pairs.push({ pair: 'floor', diff: largestDifference(a, floor) });
  pairs.push({ pair: 'pair', diff: largestDifference(a, b) });
  const regions = [{ name: 'area', box: area }];
  for (const { name, box } of boxes) {
    const inside = clip(box, area);
    if (!inside) throw new Error(`box ${name} (${box.join(',')}) lies outside the area`);
    regions.push({ name, box: inside });
  }
  const rows = [];
  for (const region of regions)
    for (const { pair, diff } of pairs)
      rows.push({
        region: region.name,
        box: region.box,
        pair,
        ...readBox(diff, a.width, region.box, over),
      });
  return { rows, maps: Object.fromEntries(pairs.map(({ pair, diff }) => [pair, diff])) };
}

/** The first frame's area dimmed to half, red where the pair moved by more than `over`. */
export function diffImage(a, diff, [x0, y0, x1, y1], over) {
  const w = x1 - x0;
  const h = y1 - y0;
  const out = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const src = (y0 + y) * a.width + x0 + x;
      const dst = (y * w + x) * 3;
      if (diff[src] > over) {
        out[dst] = 255;
        out[dst + 1] = 0;
        out[dst + 2] = 0;
      } else for (let c = 0; c < 3; c++) out[dst + c] = a.pixels[src * 3 + c] >> 1;
    }
  return encodeRgb(w, h, out);
}

/** Pillow's `L` of one RGB pixel, in its own fixed point (Convert.c, L24). */
export function luma(r, g, b) {
  return (r * 19595 + g * 38470 + b * 7471 + 0x8000) >> 16;
}

/** The pixel steps from (x0, y0) to (x1, y1), both ends included. */
export function lineSteps([x0, y0, x1, y1]) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  const steps = [];
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    steps.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t)]);
  }
  return steps;
}

/**
 * The steps luma takes to cross from 10% to 90% of its range along a profile,
 * rising or falling: between the last step still on the near side of 10% and
 * the first past 90%. Null when the range is under 2 of 255: no edge to read.
 */
export function edgeWidth(values) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (hi - lo < 2) return null;
  const rising = values.indexOf(lo) < values.indexOf(hi);
  const f = rising ? values : values.map((v) => lo + hi - v);
  const p10 = lo + 0.1 * (hi - lo);
  const p90 = lo + 0.9 * (hi - lo);
  const end = f.findIndex((v) => v >= p90);
  let start = 0;
  for (let i = 0; i < end; i++) if (f[i] <= p10) start = i;
  return { width: end - start, from: start, to: end, rising, lo, hi };
}

/** Luma at each step of the line in one frame, and its edge. */
export function profile(frame, line) {
  const steps = lineSteps(line);
  for (const [x, y] of steps)
    if (x < 0 || y < 0 || x >= frame.width || y >= frame.height)
      throw new Error(`the line leaves the ${frame.width}×${frame.height} frame at ${x},${y}`);
  const values = steps.map(([x, y]) => {
    const k = (y * frame.width + x) * 3;
    return luma(frame.pixels[k], frame.pixels[k + 1], frame.pixels[k + 2]);
  });
  return { steps, values, edge: edgeWidth(values) };
}

function parseArgs(argv) {
  const opts = { frames: [], boxes: [], area: 'world', over: 2, json: false };
  for (const arg of argv) {
    const [key, ...rest] = arg.split('=');
    const value = rest.join('=');
    if (!arg.startsWith('--')) opts.frames.push(arg);
    else if (key === '--floor') opts.floor = value;
    else if (key === '--area') opts.area = value;
    else if (key === '--over') opts.over = Number(value);
    else if (key === '--out') opts.out = value;
    else if (key === '--profile') opts.profile = parseBox(value);
    else if (key === '--json') opts.json = true;
    else if (key === '--box') {
      const at = value.indexOf(':');
      if (at < 1) throw new Error(`--box is <name>:x0,y0,x1,y1, not ${value}`);
      opts.boxes.push({ name: value.slice(0, at), box: parseBox(value.slice(at + 1)) });
    } else throw new Error(`unknown option ${key}`);
  }
  if (!Number.isInteger(opts.over) || opts.over < 0 || opts.over > 254)
    throw new Error('--over is a whole number of 255, 0 to 254');
  return opts;
}

const at = (span) =>
  span ? `x ${span[0]} to ${span[2]}, y ${span[1]} to ${span[3]}` : 'nothing moved';

function runPairs(opts, print) {
  if (opts.frames.length !== 2) throw new Error('a pair is two frames: <main.png> <branch.png>');
  const [a, b] = opts.frames.map(readFrame);
  const floor = opts.floor ? readFrame(opts.floor) : null;
  const frameBox = [0, 0, a.width, a.height];
  const area =
    opts.area === 'world'
      ? worldArea(a.width, a.height)
      : opts.area === 'frame'
        ? frameBox
        : clip(parseBox(opts.area), frameBox);
  if (!area) throw new Error(`--area ${opts.area} lies outside the frame`);
  const { rows, maps } = readPairs({ a, b, floor, area, boxes: opts.boxes, over: opts.over });
  const written = [];
  if (opts.out) {
    writeFileSync(opts.out, diffImage(a, maps.pair, area, opts.over));
    written.push(opts.out);
    if (floor) {
      const path = opts.out.replace(/(\.png)?$/i, '-floor.png');
      writeFileSync(path, diffImage(a, maps.floor, area, opts.over));
      written.push(path);
    }
  }
  if (opts.json) {
    print(
      JSON.stringify(
        { frames: opts.frames, floor: opts.floor ?? null, over: opts.over, rows, written },
        null,
        2
      )
    );
    return;
  }
  const names = {
    floor: `${opts.frames[0]} v ${opts.floor}`,
    pair: `${opts.frames[0]} v ${opts.frames[1]}`,
  };
  for (const [pair, name] of Object.entries(names)) if (maps[pair]) print(`${pair}: ${name}`);
  print(
    `area: x ${area[0]} to ${area[2]}, y ${area[1]} to ${area[3]} (${opts.area}); every box's x1 and y1 exclusive`
  );
  print('');
  print(`| Region | Pair | Mean of 255 | Moved over ${opts.over} | Box that moved |`);
  print('| --- | --- | --- | --- | --- |');
  for (const r of rows)
    print(
      `| ${r.region} | ${r.pair} | ${r.mean.toFixed(2)} | ${(r.over * 100).toFixed(2)}% | ${at(r.changed)} |`
    );
  for (const path of written) print(`wrote ${path}`);
}

function runProfile(opts, print) {
  if (opts.frames.length < 1) throw new Error('--profile reads one frame or more');
  const read = opts.frames.map((path) => ({ path, ...profile(readFrame(path), opts.profile) }));
  if (opts.json) {
    print(JSON.stringify({ line: opts.profile, frames: read }, null, 2));
    return;
  }
  const [x0, y0, x1, y1] = opts.profile;
  print(`line: ${x0},${y0} to ${x1},${y1}, ${read[0].steps.length} steps, luma of 255`);
  for (const r of read) {
    const e = r.edge;
    print(
      `${r.path}: ` +
        (e
          ? `edge ${e.width} step(s), ${e.rising ? 'rising' : 'falling'} ${e.lo} to ${e.hi}, steps ${e.from} to ${e.to}`
          : 'no edge: luma spans under 2')
    );
  }
  print('');
  print(`| Step | x,y | ${read.map((r) => r.path).join(' | ')} |`);
  print(`| --- | --- |${read.map(() => ' --- |').join('')}`);
  read[0].steps.forEach(([x, y], i) =>
    print(`| ${i} | ${x},${y} | ${read.map((r) => r.values[i]).join(' | ')} |`)
  );
}

/** The command line, with its output handed to `print`; throws on a bad call. */
export function main(argv, print = console.log) {
  const opts = parseArgs(argv);
  if (opts.profile) {
    // A pair's options mean nothing to a profile: refuse them rather than
    // leave a critic waiting on an --out that was never written.
    const pairOnly = [
      opts.floor && '--floor',
      opts.out && '--out',
      opts.boxes.length && '--box',
      opts.area !== 'world' && '--area',
      opts.over !== 2 && '--over',
    ].filter(Boolean);
    if (pairOnly.length) throw new Error(`--profile takes no ${pairOnly.join(', ')}`);
    runProfile(opts, print);
  } else runPairs(opts, print);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`framediff: ${err.message}`);
    process.exit(1);
  }
}
