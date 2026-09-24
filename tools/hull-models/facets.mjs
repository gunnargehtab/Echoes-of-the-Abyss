/**
 * Facet counts and panel density — Phase 6's last axis (#919), measured over
 * the committed files the way docs/asset-prompts-3d.md Block 2c states them.
 *
 *   node tools/hull-models/facets.mjs                 # the table, every navy
 *   node tools/hull-models/facets.mjs hadron          # one navy, and what is off its rule
 *   node tools/hull-models/facets.mjs --rings <slug>  # every ring on one model
 *   node tools/hull-models/facets.mjs --panels <slug> # every unlit part's plan area on one
 *   node tools/hull-models/facets.mjs --chords        # the chord each navy's rings imply
 *
 * Exit 1 while any ring is off its navy's rule or any model outside its
 * band, as finishes.mjs exits on a split — but not a gate: check.mjs does
 * not run it, and will not until the pass that brings the fleet onto the
 * rule has landed, since a gate on a rule no model yet meets is only red.
 *
 * Every approved model is three.js primitives, and a round primitive is a
 * grid: rows of vertices closed on a seam copy, quads between the rows.
 * `ringsOf` finds that grid in the file's own index — the rows may run
 * either way, since the Commune's ridge rings are laid out profile-first —
 * and reads each round part as the counts a script would give it:
 *
 * - a cylinder's, cone's, lathe's or capsule's **rim**: one count, at the
 *   widest rim's radius;
 * - a sphere's **parallels** and **meridians**: two counts, both at the
 *   orb's radius;
 * - a torus's **ring** and **tube**: two counts, at the ring's and the
 *   tube's radius.
 *
 * Each of those is a *ring* here — a section count a turn, and a radius in
 * metres. A count is what a full turn would carry, so a half torus of nine
 * segments is 18 a turn: the chord is what the rule is about, and a chord
 * does not care how far round it goes. The radius is measured in world
 * space through the node's transform, which is why a squashed pod's rim
 * reads at its mean radius rather than at the unit orb it was built from.
 * A part with no grid — a box, a plate, an extrusion, a hand-pushed table
 * — carries no ring, and a Consortium rivet at 0.45 m carries one.
 *
 * Panel density is the other measure. A panel is an unlit part, read from
 * above the way the chart's bake reads it: `topDown` at the unit maps' own
 * 4 px/m, which is where a hull's texture is a player's to see. A part that
 * shows no cell from above — a keel, a part sealed under a deck — is no
 * panel there. A model's **panel edge** is the square root of the median
 * plan area of the panels it shows, and a navy's is the median over its
 * hulls, and separately over its structures, because a settlement's plates
 * are several times a hull's. The edge holds across a hull's length where
 * a count per square metre does not: the Spark and the Bulwark, 20 m and
 * 150 m of hull, read 0.9 m and 1.0 m.
 *
 * The rule is each faction module's `facets` and `panels`, applied by
 * kit.mjs `facetsFor`. A ring is off it when its count a turn is not what
 * `facetsFor` gives its radius, unless the count is one of the navy's
 * `sections` — a shape, not a round thing approximated, which stays — or
 * the part is a lamp, which #919 leaves to #907's axis. A model is outside
 * its band when its panel edge is. The per-navy report groups a series
 * (`rivet_0..54`) on one line.
 *
 * `--chords` prints the chord — 2πr ÷ count — each navy's rings imply, by
 * radius, which is what Block 2c's `edge` was read off. A count with no
 * method drifts (finishes.mjs, #891), so the table in the doc is what this
 * prints, and a number that moves moves here first.
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGlb, topDown } from './glb.mjs';
import { NAVIES } from './finishes.mjs';
import { facetsFor } from './kit.mjs';
import * as bathyarch from './factions/bathyarch.mjs';
import * as pelagia from './factions/pelagia.mjs';
import * as directorate from './factions/directorate.mjs';
import * as hadron from './factions/hadron.mjs';
import { STRUCTURES } from '../hull-maps/models.mjs';

/** Each navy's rule and band, as its module holds them (Block 2c). */
export const RULES = {
  bathyarch: { facets: bathyarch.facets, panels: bathyarch.panels },
  pelagia: { facets: pelagia.facets, panels: pelagia.panels },
  directorate: { facets: directorate.facets, panels: directorate.panels },
  hadron: { facets: hadron.facets, panels: hadron.panels },
};

const here = dirname(fileURLToPath(import.meta.url));
const models = resolve(here, '../../docs/concept-art/models');

/** The maps' own resolution, and so the smallest panel the chart can show. */
export const PANEL_PPM = 4;
/** The radius band the table's median is read in: the fleet's drums, domes and pods. */
export const BAND_M = [1.5, 4];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const median = (xs) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * The grid a three primitive's index lays out — `{ L, R, caps }`, L points
 * a row with the seam copy, R rows, and `caps` the fans a cylinder adds past
 * the grid (2L − 1 vertices each) — or null for a buffer that is no grid.
 * The test is the index alone: every triangle inside the grid spans two
 * adjacent rows and two adjacent columns, and every triangle past it is a
 * cap fan. Counts alone cannot tell a lathe from a torus from a plane, and
 * a hand-laid ring (factions/pelagia.mjs `ridgeRing`) from any of them;
 * the index can, and it does not mind a displaced vertex.
 */
export function gridOf(positions, index) {
  if (!index) return null;
  const v = positions.length / 3;
  for (let L = 2; L <= 66; L++)
    for (let caps = 0; caps <= 2; caps++) {
      const rest = v - caps * (2 * L - 1);
      if (rest < 2 * L || rest % L) continue;
      const R = rest / L;
      // 2(R − 1)(L − 1) quads' triangles, less the fan a pole row drops
      // (three skips a degenerate triangle at a sphere's pole and a cone's
      // point), plus a cap's L − 1.
      const quads = 2 * (R - 1) * (L - 1) + caps * (L - 1);
      const t = index.length / 3;
      if (t !== quads && t !== quads - (L - 1) && t !== quads - 2 * (L - 1)) continue;
      const grid = R * L;
      let ok = true;
      for (let t = 0; t < index.length && ok; t += 3) {
        const a = index[t];
        const b = index[t + 1];
        const c = index[t + 2];
        if (a >= grid || b >= grid || c >= grid) {
          if (a < grid || b < grid || c < grid) ok = false;
          continue;
        }
        const ra = Math.floor(a / L), rb = Math.floor(b / L), rc = Math.floor(c / L);
        const ca = a % L, cb = b % L, cc = c % L;
        if (Math.max(ra, rb, rc) - Math.min(ra, rb, rc) !== 1) ok = false;
        else if (Math.max(ca, cb, cc) - Math.min(ca, cb, cc) !== 1) ok = false;
      }
      if (ok) return { L, R, caps };
    }
  return null;
}

/**
 * One sequence of the grid read as a turn: `{ kind, centre, radius, segs,
 * count, wobble }` with `kind` one of `pole` (every point the same),
 * `closed` (first is last: a ring of `segs` distinct points), `arc` (open,
 * on one circle, `count` what a full turn would carry) or `profile` (open
 * and not on a circle — a lathe's outline, a cone's slant, a capsule's
 * side). A closed sequence is a ring whatever its wobble, because the seam
 * is the evidence: the Commune's grown bodies push every vertex off round
 * and keep the seam.
 */
export function turnOf(pts) {
  const n = pts.length;
  const scale = Math.max(1e-6, ...pts.map(len));
  const c0 = pts
    .reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0])
    .map((x) => x / n);
  if (pts.every((p) => len(sub(p, c0)) < 1e-4 * scale)) return { kind: 'pole', centre: c0 };
  const closed = n >= 4 && len(sub(pts[0], pts[n - 1])) < 1e-5 * scale;
  if (!closed && n < 4) return { kind: 'profile' };
  const distinct = closed ? pts.slice(0, n - 1) : pts;
  let centre;
  if (closed) {
    centre = distinct
      .reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0])
      .map((x) => x / distinct.length);
  } else {
    // The circle through the first, middle and last point.
    const A = pts[0], B = pts[(n - 1) >> 1], C = pts[n - 1];
    const ab = sub(B, A), ac = sub(C, A);
    const x = cross(ab, ac);
    const d = 2 * dot(x, x);
    if (d < 1e-18 * scale ** 6) return { kind: 'profile' };
    const t1 = cross(x, ab).map((k) => k * dot(ac, ac));
    const t2 = cross(ac, x).map((k) => k * dot(ab, ab));
    centre = [0, 1, 2].map((k) => A[k] + (t1[k] + t2[k]) / d);
  }
  const radii = distinct.map((p) => len(sub(p, centre)));
  const radius = radii.reduce((a, b) => a + b, 0) / radii.length;
  const wobble = Math.max(...radii.map((r) => Math.abs(r - radius))) / radius;
  const normal = [0, 0, 0];
  for (let i = 0; i + 1 < distinct.length; i++) {
    const x = cross(sub(distinct[i], centre), sub(distinct[i + 1], centre));
    normal[0] += x[0];
    normal[1] += x[1];
    normal[2] += x[2];
  }
  const nl = len(normal);
  if (nl < 1e-12) return { kind: 'profile' };
  const nn = normal.map((k) => k / nl);
  const steps = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = sub(pts[i], centre), b = sub(pts[i + 1], centre);
    steps.push(Math.abs(Math.atan2(dot(cross(a, b), nn), dot(a, b))));
  }
  const angle = steps.reduce((a, b) => a + b, 0);
  const segs = n - 1;
  if (!closed) {
    // An arc is a regular polygon's: on one circle, in one plane, and in
    // equal steps — measured against the arc's own span, so that a spindle's
    // profile, which the circle through its three points fits within a
    // percent of a 200 m radius, still reads as the profile it is.
    const span = Math.max(...pts.map((p) => len(sub(p, pts[0]))));
    const step = angle / segs;
    if (
      Math.max(...radii.map((r) => Math.abs(r - radius))) > 1e-3 * span ||
      pts.some((p) => Math.abs(dot(sub(p, centre), nn)) > 1e-3 * span) ||
      steps.some((s) => Math.abs(s - step) > 0.01 * step)
    )
      return { kind: 'profile' };
  }
  const count = closed ? segs : Math.round((2 * Math.PI * segs) / angle);
  return { kind: closed ? 'closed' : 'arc', centre, radius, segs, count, wobble, points: pts };
}

/** A local point through a column-major world matrix. */
const through = (m, q) => [
  m[0] * q[0] + m[4] * q[1] + m[8] * q[2] + m[12],
  m[1] * q[0] + m[5] * q[1] + m[9] * q[2] + m[13],
  m[2] * q[0] + m[6] * q[1] + m[10] * q[2] + m[14],
];

/** A turn's radius in metres: the mean distance of its points from its centre, in world space. */
function metres(part, turn) {
  const c = through(part.matrix, turn.centre);
  const pts = turn.points.filter((p) => len(sub(p, turn.centre)) > 1e-9);
  return pts.reduce((s, p) => s + len(sub(through(part.matrix, p), c)), 0) / pts.length;
}

/**
 * The rings of one part — `{ kind, rings }`, `kind` one of `cylinder`,
 * `cone`, `sphere` or `torus` and each ring `{ role, count, radius, segs }`
 * with `role` one of `rim`, `parallels`, `meridians`, `ring`, `tube` — or
 * null for a part with no round grid in it. The header says what each is.
 */
export function ringsOf(part) {
  const { positions: pos, index } = part.local;
  const g = gridOf(pos, index);
  if (!g) return null;
  const p = (i) => [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]];
  const rows = [];
  for (let k = 0; k < g.R; k++) {
    const pts = [];
    for (let i = 0; i < g.L; i++) pts.push(p(k * g.L + i));
    rows.push(turnOf(pts));
  }
  const cols = [];
  for (let i = 0; i < g.L; i++) {
    const pts = [];
    for (let k = 0; k < g.R; k++) pts.push(p(k * g.L + i));
    cols.push(turnOf(pts));
  }
  const live = (seq) => seq.filter((t) => t.kind !== 'pole');
  const round = (seq) => {
    const l = live(seq);
    return l.length > 0 && l.every((t) => t.kind === 'closed' || t.kind === 'arc');
  };
  const roundRows = round(rows);
  const roundCols = round(cols);
  if (!roundRows && !roundCols) return null;
  const poles = rows.some((t) => t.kind === 'pole') || cols.some((t) => t.kind === 'pole');
  const ring = (role, turns) => {
    const t = turns.reduce((a, b) => (b.radius > a.radius ? b : a));
    return { role, count: t.count, segs: t.segs, radius: metres(part, t) };
  };
  const mean = (turns) => {
    const rs = turns.map((t) => metres(part, t));
    return rs.reduce((a, b) => a + b, 0) / rs.length;
  };
  if (roundRows && roundCols) {
    const a = live(rows), b = live(cols);
    // Arcs the other way's rings thread are meridians when those rings
    // are parallels — a pole at either end, or radii that swell from one
    // to the next — and the part is an orb; a torus's sections keep one
    // radius along the whole of its arc.
    const arcs = a.every((t) => t.kind === 'arc') ? a : b.every((t) => t.kind === 'arc') ? b : null;
    const swells = (turns) => {
      const rs = turns.map((t) => t.radius);
      return (Math.max(...rs) - Math.min(...rs)) / Math.max(...rs) > 0.1;
    };
    if (arcs && (poles || swells(arcs === a ? b : a))) {
      const parallels = arcs === a ? b : a;
      const t = ring('parallels', parallels);
      return {
        kind: 'sphere',
        rings: [
          { ...t, radius: mean([arcs[0]]) },
          { role: 'meridians', count: arcs[0].count, segs: arcs[0].segs, radius: mean([arcs[0]]) },
        ],
      };
    }
    // The ring's radius is the middle of its widest and narrowest turns —
    // the tube's crown and its throat sit a tube either side of it — and
    // not their mean, which a seam row counted twice would pull.
    const middle = (turns) => {
      const rs = turns.map((t) => metres(part, t));
      return (Math.max(...rs) + Math.min(...rs)) / 2;
    };
    const big = middle(a) >= middle(b) ? a : b;
    const small = big === a ? b : a;
    return {
      kind: 'torus',
      rings: [
        { role: 'ring', count: big[0].count, segs: big[0].segs, radius: middle(big) },
        { role: 'tube', count: small[0].count, segs: small[0].segs, radius: mean(small) },
      ],
    };
  }
  const rims = live(roundRows ? rows : cols);
  return { kind: poles ? 'cone' : 'cylinder', rings: [ring('rim', rims)] };
}

/** Every ring on a model's parts, each tagged with its part's name. */
export function modelRings(parts) {
  const out = [];
  for (const part of parts) {
    const r = ringsOf(part);
    if (!r) continue;
    const lit = Boolean(part.finish && part.finish.emissive.some((c) => c > 0));
    for (const ring of r.rings) out.push({ ...ring, kind: r.kind, part: part.name, lit });
  }
  return out;
}

/**
 * A model's panels: every unlit part's plan area from above, in m², for
 * the parts that show any at `PANEL_PPM`, and the model's panel edge — the
 * square root of their median. A lit part is a lamp, not a panel.
 */
export function panelsOf(parts) {
  const td = topDown(parts, PANEL_PPM);
  const owned = new Map();
  for (let i = 0; i < td.owner.length; i++)
    if (td.owner[i] >= 0) owned.set(td.owner[i], (owned.get(td.owner[i]) ?? 0) + td.cellArea);
  const panels = [];
  parts.forEach((part, i) => {
    const lit = part.finish && part.finish.emissive.some((c) => c > 0);
    const area = owned.get(i) ?? 0;
    if (lit || area === 0) return;
    panels.push({ part: part.name, area });
  });
  return { panels, edge: Math.sqrt(median(panels.map((p) => p.area))) };
}

const isStructure = (slug) => STRUCTURES.some((s) => s.model === `${slug}.glb`);

/** Every model of a navy: `[{ slug, structure, parts }]`. */
export function modelsIn(navy, dir = models) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(`-${navy}.glb`))
    .sort()
    .map((file) => {
      const slug = file.replace(/\.glb$/, '');
      return { slug, structure: isStructure(slug), parts: readGlb(join(dir, file)).parts };
    });
}

/**
 * The table's row for one navy: `{ rings, distinct, band: { median, min,
 * max, n }, hulls: { edge, models }, structures: { edge, models } }`, the
 * edges in metres and each model `{ slug, edge, panels }`.
 */
export function measure(navy, dir = models) {
  const rings = [];
  const hulls = [];
  const structures = [];
  for (const { slug, structure, parts } of modelsIn(navy, dir)) {
    for (const r of modelRings(parts)) rings.push({ ...r, slug });
    const { panels, edge } = panelsOf(parts);
    (structure ? structures : hulls).push({ slug, edge, panels: panels.length });
  }
  const inBand = rings.filter((r) => r.radius >= BAND_M[0] && r.radius <= BAND_M[1]);
  const counts = inBand.map((r) => r.count);
  return {
    rings,
    distinct: new Set(rings.map((r) => r.count)).size,
    band: { median: median(counts), min: Math.min(...counts), max: Math.max(...counts), n: inBand.length },
    hulls: { edge: median(hulls.map((m) => m.edge)), models: hulls },
    structures: { edge: median(structures.map((m) => m.edge)), models: structures },
  };
}

/**
 * What is off a navy's rule in the committed files: `{ rings, models,
 * kept, lamps }` — each ring `{ slug, part, role, count, want, radius }`
 * whose count is not what `facetsFor` gives its radius, each model
 * `{ slug, structure, edge, band }` whose panel edge is outside its band,
 * `kept` the rings whose count is one of the navy's `sections` (a shape,
 * and never asked), and `lamps` the rings on lit parts, which this axis
 * does not touch (#919: "Not: silhouette, finish, lamps").
 */
export function offRule(navy, dir = models) {
  const { facets, panels } = RULES[navy];
  const m = measure(navy, dir);
  const rings = [];
  let kept = 0;
  let lamps = 0;
  for (const r of m.rings) {
    if (r.lit) {
      lamps++;
      continue;
    }
    if (r.count in facets.sections) {
      kept++;
      continue;
    }
    const want = facetsFor(facets, r.radius);
    if (want !== r.count) rings.push({ ...r, want });
  }
  const outside = (list, band, structure) =>
    list
      .filter(({ edge }) => !(edge >= band[0] && edge <= band[1]))
      .map(({ slug, edge }) => ({ slug, structure, edge, band }));
  return {
    measured: m,
    rings,
    models: [
      ...outside(m.hulls.models, panels.hulls, false),
      ...outside(m.structures.models, panels.structures, true),
    ],
    kept,
    lamps,
  };
}

const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '—');
const n = (x) => x.toLocaleString('en');

/** A part's name with its series index and side stripped: `rivet_s_12` → `rivet`. */
const stem = (name) => name.replace(/(_(\d+|[sp]|port|starboard|stb|[lrabf]))+$/, '');

function printOff(navy) {
  const { measured, rings, models: outside, kept, lamps } = offRule(navy);
  const { facets, panels } = RULES[navy];
  const unlit = measured.rings.length - lamps;
  const parts = new Set(rings.map((r) => `${r.slug}:${r.part}`)).size;
  console.log(
    `${navy}: edge ${facets.edge} m, floor ${facets.floor}, ceiling ${facets.ceiling}, step ${facets.step}; ` +
      `sections ${Object.keys(facets.sections).join(', ')}; panels ${panels.hulls.join('–')} m on a hull, ${panels.structures.join('–')} m on a structure`
  );
  console.log(
    `  ${n(rings.length)} of ${n(unlit)} unlit rings off the rule, on ${n(parts)} parts; ${n(kept)} sections kept, ${n(lamps)} lamps not read`
  );
  const byModel = new Map();
  for (const r of rings) {
    const lines = byModel.get(r.slug) ?? new Map();
    byModel.set(r.slug, lines);
    const key = `${stem(r.part)} ${r.role} ${r.count} → ${r.want}`;
    const line = lines.get(key) ?? { n: 0, lo: Infinity, hi: 0 };
    line.n++;
    line.lo = Math.min(line.lo, r.radius);
    line.hi = Math.max(line.hi, r.radius);
    lines.set(key, line);
  }
  for (const [slug, lines] of byModel) {
    const total = [...lines.values()].reduce((s, l) => s + l.n, 0);
    console.log(`  ${slug}: ${total} off`);
    for (const [key, l] of lines) {
      const r = l.hi - l.lo > 0.05 ? `${l.lo.toFixed(1)}–${l.hi.toFixed(1)}` : l.lo.toFixed(1);
      console.log(`    ${key}${l.n > 1 ? ` ×${l.n}` : ''} (r ${r} m)`);
    }
  }
  const hulls = outside.filter((o) => !o.structure);
  const structures = outside.filter((o) => o.structure);
  console.log(
    `  ${hulls.length} of ${measured.hulls.models.length} hulls and ${structures.length} of ${measured.structures.models.length} structures outside the band`
  );
  for (const o of outside)
    console.log(`    ${o.slug}: panel edge ${o.edge.toFixed(2)} m, band ${o.band[0]}–${o.band[1]} m`);
  return rings.length + outside.length;
}

function printTable(navies) {
  console.log(
    '| navy | rings | distinct counts a turn | 1.5–4 m radius: median (range) | hull panel edge | structure panel edge | off the rule | outside the band |'
  );
  console.log('| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: |');
  let off = 0;
  for (const navy of navies) {
    const { measured: m, rings, models: outside } = offRule(navy);
    off += rings.length + outside.length;
    console.log(
      `| ${navy} | ${n(m.rings.length)} | ${m.distinct} | ${m.band.median} (${m.band.min}–${m.band.max}) | ` +
        `${f1(m.hulls.edge)} m | ${f1(m.structures.edge)} m | ${n(rings.length)} | ${outside.length} of ${m.hulls.models.length + m.structures.models.length} |`
    );
  }
  return off;
}

function printRings(slug) {
  const navy = NAVIES.find((n) => slug.endsWith(`-${n}`));
  const { parts } = readGlb(join(models, `${slug}.glb`));
  const rings = modelRings(parts);
  console.log(`${slug}: ${rings.length} rings on ${parts.length} parts${navy ? '' : ' (no navy)'}`);
  for (const r of rings)
    console.log(
      `  ${r.part.padEnd(32)} ${r.kind.padEnd(9)} ${r.role.padEnd(10)} ${String(r.count).padStart(3)} a turn` +
        `${r.segs !== r.count ? ` (${r.segs} segs)` : ''}  r ${r.radius.toFixed(2)} m`
    );
}

function printPanels(slug) {
  const { parts } = readGlb(join(models, `${slug}.glb`));
  const { panels, edge } = panelsOf(parts);
  console.log(`${slug}: ${panels.length} panels showing from above, edge ${edge.toFixed(2)} m`);
  for (const p of [...panels].sort((a, b) => a.area - b.area))
    console.log(`  ${p.part.padEnd(32)} ${p.area.toFixed(2).padStart(9)} m²  edge ${Math.sqrt(p.area).toFixed(2)} m`);
}

function printChords(navies) {
  for (const navy of navies) {
    const { rings } = measure(navy);
    const bands = [
      [0, 0.5],
      [0.5, 1.5],
      [1.5, 4],
      [4, 10],
      [10, Infinity],
    ];
    console.log(`${navy}: ${rings.length} rings`);
    for (const [lo, hi] of bands) {
      const rs = rings.filter((r) => r.radius >= lo && r.radius < hi);
      if (!rs.length) continue;
      const chords = rs.map((r) => (2 * Math.PI * r.radius) / r.count);
      const q = (p) => {
        const s = [...chords].sort((a, b) => a - b);
        return s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2);
      };
      const counts = {};
      for (const r of rs) counts[r.count] = (counts[r.count] ?? 0) + 1;
      console.log(
        `  r ${lo}–${hi === Infinity ? '' : hi} m: ${String(rs.length).padStart(4)} rings, chord median ${q(0.5)} m (quartiles ${q(0.25)}–${q(0.75)}); counts ${Object.entries(counts)
          .sort((a, b) => a[0] - b[0])
          .map(([c, n]) => `${c}×${n}`)
          .join(' ')}`
      );
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? (args[i + 1] ?? true) : null;
  };
  if (flag('--rings')) printRings(flag('--rings'));
  else if (flag('--panels')) printPanels(flag('--panels'));
  else {
    const asked = args.filter((a) => !a.startsWith('--'));
    const unknown = asked.filter((n) => !NAVIES.includes(n));
    if (unknown.length) {
      console.error(`not a navy: ${unknown.join(', ')} (one of ${NAVIES.join(', ')})`);
      process.exit(2);
    }
    const navies = asked.length ? asked : NAVIES;
    if (flag('--chords')) printChords(navies);
    else if (asked.length) {
      let off = 0;
      for (const navy of navies) off += printOff(navy);
      process.exit(off ? 1 : 0);
    } else process.exit(printTable(navies) ? 1 : 0);
  }
}
