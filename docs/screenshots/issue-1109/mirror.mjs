/**
 * #1109's mirror measure: how far a navy's trim sheet, as a model lays it,
 * is from bilaterally symmetric. Kept beside the readings because the
 * Knights' table and the Responsory's header quote it, and no gate runs it.
 *
 *   node docs/screenshots/issue-1109/mirror.mjs <model.glb> <sheet.png> [box]
 *
 * Every triangle of a tagged material is sampled at seven interior points.
 * Each point is mirrored z → −z (port is −z, kit.mjs `bothSides`) onto the
 * same surface of its twin — `_s` ↔ `_p`, `_s1` ↔ `_p1`, else the part itself
 * — and the sheet is read at both points' UV0 through a box of `box` texels
 * (16 by default: about a pixel of the Knights' 9 m wrap at the conn view's
 * ~3 px/m), bilinear, wrapped, in linear light. Reported: each part's share
 * of samples more than 2 and 8 sRGB levels off its mirror, and the tagged
 * area, all and up-facing, that is.
 */
import { readFileSync } from 'node:fs';
import { readGlb } from '../../../tools/hull-models/glb.mjs';
import { decodeGray } from '../../../tools/hull-models/png.mjs';

const [file, sheetFile, boxArg = '16'] = process.argv.slice(2);
if (!file || !sheetFile) {
  console.error('usage: mirror.mjs <model.glb> <sheet.png> [box]');
  process.exit(1);
}
const glb = readGlb(file);
const sheet = decodeGray(readFileSync(sheetFile));
const N = sheet.width;
const box = Number(boxArg);

const lin = Float64Array.from(sheet.pixels, (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
const wrap = (i) => ((i % N) + N) % N;
let F = lin;
if (box > 1) {
  F = new Float64Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let s = 0;
      for (let j = 0; j < box; j++)
        for (let i = 0; i < box; i++)
          s += lin[wrap(y + j - (box >> 1)) * N + wrap(x + i - (box >> 1))];
      F[y * N + x] = s / (box * box);
    }
}
const sample = (u, v) => {
  const x = u * N - 0.5;
  const y = v * N - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (i, j) => F[wrap(j) * N + wrap(i)];
  const lo = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
  const hi = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
  return lo * (1 - fy) + hi * fy;
};
const toSrgb = (L) => 255 * (L <= 0.0031308 ? 12.92 * L : 1.055 * L ** (1 / 2.4) - 0.055);

const twin = (n) =>
  n
    .replace(/_s(\d?)$/, '_P$1')
    .replace(/_p(\d?)$/, '_s$1')
    .replace(/_P(\d?)$/, '_p$1');
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const lerp3 = (a, b, t) => [
  a[0] + t * (b[0] - a[0]),
  a[1] + t * (b[1] - a[1]),
  a[2] + t * (b[2] - a[2]),
];
const tri = (p, t) =>
  [0, 1, 2].map((c) => [...p.positions.subarray(t * 9 + c * 3, t * 9 + c * 3 + 3)]);
const uvs = (p, t) => [0, 1, 2].map((c) => [p.uv0[t * 6 + c * 2], p.uv0[t * 6 + c * 2 + 1]]);
const normal = (T) => {
  const n = cross(sub(T[1], T[0]), sub(T[2], T[0]));
  const l = Math.hypot(...n) || 1;
  return n.map((c) => c / l);
};

/** The closest point on a triangle and its barycentrics (Ericson, 5.1.5). */
function closest(P, [a, b, c]) {
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(P, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return [a, [1, 0, 0]];
  const bp = sub(P, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return [b, [0, 1, 0]];
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return [lerp3(a, b, v), [1 - v, v, 0]];
  }
  const cp = sub(P, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return [c, [0, 0, 1]];
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return [lerp3(a, c, w), [1 - w, 0, w]];
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return [lerp3(b, c, w), [0, 1 - w, w]];
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den;
  const w = vc * den;
  const X = [0, 1, 2].map((i) => a[i] + ab[i] * v + ac[i] * w);
  return [X, [1 - v - w, v, w]];
}

const BARY = [
  [1 / 3, 1 / 3, 1 / 3],
  [0.6, 0.2, 0.2],
  [0.2, 0.6, 0.2],
  [0.2, 0.2, 0.6],
  [0.45, 0.45, 0.1],
  [0.1, 0.45, 0.45],
  [0.45, 0.1, 0.45],
];
const tagged = new Set(glb.trim?.materials ?? []);
const byName = new Map(glb.parts.map((p) => [p.name, p]));
const area = { all: [0, 0, 0], up: [0, 0, 0] };
console.log(`box ${box} texels; |sheet(P) − sheet(mirror of P)| in sRGB levels`);
for (const p of glb.parts) {
  if (!tagged.has(p.material)) continue;
  const q = byName.get(twin(p.name));
  if (!q) {
    console.log(`${p.name}: no twin`);
    continue;
  }
  const d = [];
  for (let t = 0; t < p.tris; t++) {
    const T = tri(p, t);
    const U = uvs(p, t);
    const n = normal(T);
    const e = cross(sub(T[1], T[0]), sub(T[2], T[0]));
    const share = Math.hypot(...e) / 2 / BARY.length;
    for (const b of BARY) {
      const P = [0, 1, 2].map((i) => b[0] * T[0][i] + b[1] * T[1][i] + b[2] * T[2][i]);
      const uv = [0, 1].map((i) => b[0] * U[0][i] + b[1] * U[1][i] + b[2] * U[2][i]);
      const M = [P[0], P[1], -P[2]];
      const nm = [n[0], n[1], -n[2]];
      let best = null;
      let bestD = Infinity;
      for (let s = 0; s < q.tris; s++) {
        const Tm = tri(q, s);
        if (dot(normal(Tm), nm) < 0.95) continue;
        const [X, bb] = closest(M, Tm);
        const dd = Math.hypot(...sub(X, M));
        if (dd < bestD) [bestD, best] = [dd, [s, bb]];
      }
      if (!best || bestD > 0.02) continue;
      const Um = uvs(q, best[0]);
      const uvm = [0, 1].map((i) => best[1].reduce((s, w, c) => s + w * Um[c][i], 0));
      const diff = Math.abs(toSrgb(sample(...uv)) - toSrgb(sample(...uvm)));
      d.push(diff);
      for (const k of n[1] > 0.2 ? ['all', 'up'] : ['all']) {
        area[k][0] += share;
        if (diff > 2) area[k][1] += share;
        if (diff > 8) area[k][2] += share;
      }
    }
  }
  d.sort((x, y) => x - y);
  const over = (k) => ((100 * d.filter((x) => x > k).length) / (d.length || 1)).toFixed(0);
  const max = (d[d.length - 1] ?? 0).toFixed(1);
  console.log(
    `${p.name.padEnd(18)} ${p.material.padEnd(14)} samples ${String(d.length).padStart(4)}  ` +
      `max ${max.padStart(5)}  >2 ${over(2).padStart(3)}%  >8 ${over(8).padStart(3)}%`
  );
}
for (const k of ['all', 'up']) {
  const [all, two, eight] = area[k];
  const pct = (x) => ((100 * x) / all).toFixed(1);
  console.log(
    `${k}: ${all.toFixed(1)} m², >2 levels ${pct(two)} %, ` +
      `>8 levels ${pct(eight)} % (${eight.toFixed(1)} m²)`
  );
}
