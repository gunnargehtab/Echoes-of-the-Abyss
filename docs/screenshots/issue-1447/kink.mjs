/**
 * #1447's kink measure: how far a joint laid across a tapering facet jogs
 * at the facet's diagonal, over every laid model. Kept beside the frames
 * because art-direction.md quotes it, and no gate runs it.
 *
 *   node docs/screenshots/issue-1447/kink.mjs [<model file prefix>] [-v]
 *
 * Every planar trapezoid facet of a tagged part — two coplanar triangles on
 * a shared diagonal, the off-diagonal edges parallel — is read two ways.
 * The first triangle's affine map is carried to the fourth corner and
 * compared with the UV the second triangle gives it, in u texels of a 4,096
 * sheet, the units the issue counts in: a facet laid by angle at each
 * corner is a rectangle on the sheet and a trapezoid on the hull, so the
 * two triangles' maps differ by the taper. The joint's jog at the diagonal
 * is a quarter of the chord difference, in metres and at the conn view's
 * 3 px/m. A pair whose mismatch is over six tenths of its part's whole u
 * span is a wrap: the two triangles took the cut's two sides, a plate
 * apart, which `facetMids` in trim.mjs now prevents: it lists none on the
 * re-exported models. Closing one edge out, it still listed the cap fans
 * of squat drums `roundAxis` unrolls about the wrong axis (#1501), every
 * triangle coplanar with the next; the flood reads a fan as one facet.
 */
import { readdirSync } from 'node:fs';
import { readGlb } from '../../../tools/hull-models/glb.mjs';
const DIR = new URL('../../concept-art/models/', import.meta.url).pathname;
const args = process.argv.slice(2);
const verbose = args.includes('-v');
const only = args.find((a) => !a.startsWith('-'));
const PX = 3;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a) => Math.hypot(...a);
const key = (p) => p.map((c) => c.toFixed(4)).join(',');
const S = 4096;
const all = [];
for (const f of readdirSync(DIR)
  .filter((f) => f.endsWith('.glb'))
  .sort()) {
  if (only && !f.startsWith(only)) continue;
  const glb = readGlb(DIR + f);
  if (!glb.trim) continue;
  const tagged = new Set(glb.trim.materials ?? []);
  const rows = [];
  for (const p of glb.parts) {
    if (!tagged.has(p.material)) continue;
    const tri = (t) =>
      [0, 1, 2].map((c) => [...p.positions.subarray(t * 9 + c * 3, t * 9 + c * 3 + 3)]);
    const uv = (t) => [0, 1, 2].map((c) => [p.uv0[t * 6 + c * 2], p.uv0[t * 6 + c * 2 + 1]]);
    let uMin = Infinity,
      uMax = -Infinity;
    for (let i = 0; i < p.tris * 3; i++) {
      const u = p.uv0[i * 2];
      if (u < uMin) uMin = u;
      if (u > uMax) uMax = u;
    }
    const partSpan = uMax - uMin;
    const edges = new Map();
    const N = [];
    for (let t = 0; t < p.tris; t++) {
      const T = tri(t);
      const n = cross(sub(T[1], T[0]), sub(T[2], T[0]));
      const l = len(n);
      N.push(l > 1e-9 ? n.map((c) => c / l) : null);
      for (let e = 0; e < 3; e++) {
        const k = [key(T[e]), key(T[(e + 1) % 3])].sort().join('|');
        if (!edges.has(k)) edges.set(k, []);
        edges.get(k).push(t);
      }
    }
    for (const ts of edges.values()) {
      if (ts.length !== 2) continue;
      const [t1, t2] = ts;
      if (!N[t1] || !N[t2] || dot(N[t1], N[t2]) < 0.99999) continue;
      const A = tri(t1),
        UA = uv(t1),
        B = tri(t2),
        UB = uv(t2);
      const ka = A.map(key),
        kb = B.map(key);
      const di = B.findIndex((v) => !ka.includes(key(v)));
      const ai = A.findIndex((v) => !kb.includes(key(v)));
      if (di < 0 || ai < 0) continue;
      const D = B[di],
        C = A[ai];
      const shared = A.filter((_, i) => i !== ai);
      // a trapezoid: C–shared[i] parallel to D–shared[j] for one pairing
      const e = (a, b) => len(sub(a, b));
      const par = (a, b, c, d) => Math.abs(dot(sub(a, b), sub(c, d))) / (e(a, b) * e(c, d) || 1);
      let chords = null;
      if (par(C, shared[0], D, shared[1]) > 0.9999) chords = [e(C, shared[0]), e(D, shared[1])];
      else if (par(C, shared[1], D, shared[0]) > 0.9999)
        chords = [e(C, shared[1]), e(D, shared[0])];
      if (!chords) continue;
      const v0 = sub(A[1], A[0]),
        v1 = sub(A[2], A[0]),
        v2 = sub(D, A[0]);
      const d00 = dot(v0, v0),
        d01 = dot(v0, v1),
        d11 = dot(v1, v1),
        d20 = dot(v2, v0),
        d21 = dot(v2, v1);
      const den = d00 * d11 - d01 * d01;
      if (Math.abs(den) < 1e-10) continue;
      const bv = (d11 * d20 - d01 * d21) / den,
        bw = (d00 * d21 - d01 * d20) / den,
        bu = 1 - bv - bw;
      // A sliver at a lathe's pole extrapolates its map across the model:
      // a fourth corner far outside its triangle is not a facet's.
      if (Math.max(Math.abs(bu), Math.abs(bv), Math.abs(bw)) > 4) continue;
      const pu = bu * UA[0][0] + bv * UA[1][0] + bw * UA[2][0];
      const du = Math.abs(pu - UB[di][0]);
      const tex = du * S;
      if (tex < 0.5) continue;
      const wrap = du > 0.6 * partSpan;
      const kinkM = Math.abs(chords[0] - chords[1]) / 4;
      rows.push({ part: p.name, wrap, tex, plates: Math.round(du * 2), kinkM, px: kinkM * PX });
    }
  }
  const taper = rows.filter((r) => !r.wrap);
  const wrap = rows.filter((r) => r.wrap);
  const parts = (rs) => [...new Set(rs.map((r) => r.part))];
  const worst = taper.reduce((m, r) => (r.px > (m?.px ?? -1) ? r : m), null);
  const over = (k) => taper.filter((r) => r.px > k).length;
  console.log(
    `${f.padEnd(34)} taper ${String(taper.length).padStart(4)} facets/${String(parts(taper).length).padStart(2)} parts, ` +
      `>0.5px ${String(over(0.5)).padStart(3)} >1px ${String(over(1)).padStart(3)}, worst ${(worst?.px ?? 0).toFixed(2)} px ${worst?.part ?? ''} (${(worst?.tex ?? 0).toFixed(0)}/4096)` +
      (wrap.length
        ? `  | wrap on a diagonal: ${parts(wrap)
            .map(
              (n) =>
                `${n}(${[...new Set(wrap.filter((r) => r.part === n).map((r) => r.plates))].join('/')} pl)`
            )
            .join(' ')}`
        : '')
  );
  if (verbose) {
    const agg = new Map();
    for (const r of taper) {
      const a = agg.get(r.part) ?? { n: 0, tex: 0, px: 0 };
      a.n++;
      a.tex = Math.max(a.tex, r.tex);
      a.px = Math.max(a.px, r.px);
      agg.set(r.part, a);
    }
    for (const [part, a] of [...agg].sort((x, y) => y[1].px - x[1].px))
      console.log(
        `    ${part.padEnd(22)} ${String(a.n).padStart(3)} facets  max ${a.tex.toFixed(0).padStart(4)}/4096  jog ${a.px.toFixed(2)} px`
      );
  }
  for (const r of rows) all.push({ model: f, ...r });
}
const t = all.filter((r) => !r.wrap);
const w = all.filter((r) => r.wrap);
console.log(
  `\ntaper facets ${t.length}: >0.25px ${t.filter((r) => r.px > 0.25).length}, >0.5px ${t.filter((r) => r.px > 0.5).length}, >1px ${t.filter((r) => r.px > 1).length}, >2px ${t.filter((r) => r.px > 2).length}`
);
console.log(
  `wrap-on-diagonal facets ${w.length}, odd plates (visible) ${w.filter((r) => r.plates % 2).length}, models ${new Set(w.filter((r) => r.plates % 2).map((r) => r.model)).size}`
);
console.log('top jogs:');
for (const r of [...t].sort((a, b) => b.px - a.px).slice(0, 15))
  console.log(
    `  ${r.model.padEnd(32)} ${r.part.padEnd(20)} ${r.px.toFixed(2)} px  ${r.tex.toFixed(0)}/4096`
  );
