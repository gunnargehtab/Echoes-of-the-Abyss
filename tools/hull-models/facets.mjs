/**
 * Facet counts and panel density, a navy at a time — the last axis of #540's
 * Phase 6, measured before any of it is tuned.
 *
 *   node tools/hull-models/facets.mjs                # every navy, and the props
 *   node tools/hull-models/facets.mjs directorate    # one
 *   node tools/hull-models/facets.mjs --parts        # every ring off its navy's rule, by name
 *
 * A committed GLB cannot say how many facets a part was meant to have — a
 * twelve-sided cylinder and a twelve-sided prism are the same triangles — so
 * this runs every script, the way check.mjs does, and reads each primitive's
 * rings off the live scene before the exporter flattens it. Every model came
 * over from an approved export (Phase 3) or was built beside one (Phase 4),
 * so each part carries whatever count its first author picked: the ports
 * copied it faithfully, and Phase 3 kept facet counts out of scope on
 * purpose. The result is a navy whose cylinders run from four sides to
 * twenty-eight with no rule a reader can state.
 *
 * **A ring** is any closed run of facets round an axis: a cylinder's or a
 * lathe's rim, a sphere's parallels and meridians, a torus's ring and its
 * tube, a tube's section. Each is read in world metres through its node's
 * transform, so the root scale a metre-true port carries is inside the
 * figure. Its size is the radius of the circle its widest facet is a chord
 * of, `r = c / (2 sin(θ / 2N))`, which is exact for a round part and the
 * major radius for one scaled flat; its count is the facets it would carry
 * round a whole turn, so a half-cylinder's six is a twelve.
 *
 * **The rule** is each navy's `facets` export, beside its `ink` table
 * (docs/asset-prompts-3d.md Block 2c): a facet's target edge in metres, a
 * floor and a ceiling, a step every count is a multiple of, and the counts
 * that are sections rather than circles — a four-sided spar is a square, and
 * no chord rule should round it. `facetsFor` is the rule, one line, and the
 * pass that follows the table builds through it. A navy that exports no
 * `facets` is measured and not judged.
 *
 * **Panel density** is how finely the chart sees a model's surface divided:
 * the unlit parts that own at least a quarter of a square metre from above
 * (glb.mjs `topDown`, at the maps' four cells a metre, the light audit's own
 * floor), and the edge of the median one, `√(median area)`. A lamp is light,
 * not panel, and a part a deck hides is not detail anyone sees. The edge
 * rather than a count per area, because a count per area is a statement
 * about size: the Consortium's 20 m Spark reads 28.7 panels a hundred square
 * metres and its Bastion 0.03, for the same riveted plate. The median edge
 * holds across a hull's length and reads as its navy — about a metre on a
 * Consortium hull, four on a Knights' — so it is the figure a navy's
 * `panels` export bands, by class, since a structure's pads are not a hull's
 * plates. A model outside its band is named.
 *
 * Advisory, like the light audit: it exits 0 whatever it finds, because it
 * reports what the pass has left to do rather than gating a model already
 * approved. Polyhedra, boxes and extrusions carry no ring and are counted as
 * parts only.
 */
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { sceneParts, topDown, occludes } from './glb.mjs';
import { NAVIES } from './finishes.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * A navy's facet count for a round part of radius `radiusM`: the count whose
 * facet edge is nearest `chordM`, in multiples of `step`, held between `min`
 * and `max`. Every round primitive a navy's module builds takes its count
 * from here once the pass lands, which is what makes re-faceting a fleet one
 * edit.
 */
export function facetsFor({ chordM, min, max, step = 1 }, radiusM) {
  const n = step * Math.round((2 * Math.PI * radiusM) / chordM / step);
  return Math.min(max, Math.max(min, n));
}

/* --------------------------------------------------------------------------
 * Reading rings off the live scene. Each reader knows its primitive's vertex
 * layout in three r169, which is the only thing that says where one facet
 * ends and the next begins.
 * ------------------------------------------------------------------------ */

const TAU = 2 * Math.PI;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Vertex `k` of `mesh` in world metres. */
function worldAt(mesh, k) {
  const p = mesh.geometry.attributes.position;
  const m = mesh.matrixWorld.elements;
  const x = p.getX(k),
    y = p.getY(k),
    z = p.getZ(k);
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * The widest facet on a family of rings: `rows` rings of `n` facets, the
 * `i`th vertex of ring `j` at `index(j, i)`. The widest is the one a reader
 * sees first, and the one a chord rule is about.
 */
function widest(mesh, rows, n, index) {
  let c = 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < n; i++)
      c = Math.max(c, dist(worldAt(mesh, index(j, i)), worldAt(mesh, index(j, i + 1))));
  return c;
}

/** A ring as the report reads it: facets a full turn, and the radius its widest facet implies. */
function ring(kind, n, arc, chord) {
  if (!(chord > 1e-6)) return null; // a cone's apex, a sphere's pole
  return {
    kind,
    n,
    turn: Math.round((n * TAU) / arc),
    radiusM: chord / (2 * Math.sin(arc / (2 * n))),
    chordM: chord,
  };
}

/** Every ring on one mesh; none for a primitive that has no axis. */
export function ringsOf(mesh) {
  const g = mesh.geometry;
  const p = g.parameters;
  if (!p) return [];
  switch (g.type) {
    case 'CylinderGeometry':
    case 'ConeGeometry': {
      const n = p.radialSegments;
      // The torso's rows first, top to bottom: the two rims are rows 0 and
      // heightSegments, and an intermediate row is never wider than both.
      const rows = [0, p.heightSegments];
      const c = Math.max(...rows.map((y) => widest(mesh, 1, n, (_, i) => y * (n + 1) + i)));
      return [ring('cylinder', n, p.thetaLength, c)].filter(Boolean);
    }
    case 'SphereGeometry': {
      const w = p.widthSegments;
      const h = p.heightSegments;
      const at = (iy, ix) => iy * (w + 1) + ix;
      const round = widest(mesh, h + 1, w, (iy, ix) => at(iy, ix));
      const meridian = widest(mesh, w + 1, h, (ix, iy) => at(iy, ix));
      return [
        ring('sphere round', w, p.phiLength, round),
        ring('sphere meridian', h, p.thetaLength, meridian),
      ].filter(Boolean);
    }
    case 'LatheGeometry': {
      const len = p.points.length;
      const c = widest(mesh, len, p.segments, (j, i) => i * len + j);
      return [ring('lathe', p.segments, p.phiLength, c)].filter(Boolean);
    }
    case 'TorusGeometry': {
      const t = p.tubularSegments;
      const r = p.radialSegments;
      const at = (j, i) => j * (t + 1) + i;
      return [
        ring(
          'torus ring',
          t,
          p.arc,
          widest(mesh, r + 1, t, (j, i) => at(j, i))
        ),
        ring(
          'torus tube',
          r,
          TAU,
          widest(mesh, t + 1, r, (i, j) => at(j, i))
        ),
      ].filter(Boolean);
    }
    case 'TubeGeometry': {
      const r = p.radialSegments;
      const c = widest(mesh, p.tubularSegments + 1, r, (i, j) => i * (r + 1) + j);
      return [ring('tube', r, TAU, c)].filter(Boolean);
    }
    default:
      return [];
  }
}

/**
 * Panels from above: the unlit parts owning at least `minM2` of plan, and the
 * edge of the median one. Lit is read the way the light audit reads it, off
 * the live material's emissive.
 */
export function panelsOf(root, { ppm = 4, minM2 = 0.25 } = {}) {
  const lit = [];
  root.traverse((o) => {
    if (o.isMesh) lit.push(Boolean(o.material?.emissive && o.material.emissive.getHex() !== 0));
  });
  const { parts } = sceneParts(root);
  const td = topDown(parts, ppm);
  const cells = new Map();
  for (const o of td.owner) if (o >= 0) cells.set(o, (cells.get(o) ?? 0) + 1);
  const areas = [...cells]
    .filter(([k]) => !lit[k] && occludes(parts[k].finish))
    .map(([, n]) => n * td.cellArea)
    .filter((m2) => m2 >= minM2);
  return { panels: areas.length, edgeM: areas.length ? Math.sqrt(median(areas)) : 0 };
}

/* --------------------------------------------------------------------------
 * Running every script in-process: one import each, the exporter watched for
 * the root it is handed, the file itself written to scratch and thrown away.
 * ------------------------------------------------------------------------ */

async function measureAll(only) {
  const roots = [];
  const parseAsync = GLTFExporter.prototype.parseAsync;
  GLTFExporter.prototype.parseAsync = function (input, options) {
    roots.push(input);
    return parseAsync.call(this, input, options);
  };
  const scratch = mkdtempSync(join(tmpdir(), 'hull-facets-'));
  const quiet = { log: console.log, warn: console.warn };
  const models = [];
  try {
    for (const dir of ['hulls', 'structures', 'props']) {
      for (const file of readdirSync(join(here, dir))
        .filter((f) => f.endsWith('.mjs'))
        .sort()) {
        const out = join(scratch, `${dir}-${file}`);
        process.env.HULL_MODELS_OUT = out;
        roots.length = 0;
        console.log = console.warn = () => {};
        try {
          await import(pathToFileURL(join(here, dir, file)).href);
        } finally {
          Object.assign(console, quiet);
        }
        const [glb] = readdirSync(out).filter((f) => f.endsWith('.glb'));
        const slug = glb.replace(/\.glb$/, '');
        const navy = NAVIES.find((n) => slug.endsWith(`-${n}`)) ?? 'env';
        if (only.length && !only.includes(navy)) continue;
        const [root] = roots;
        root.updateMatrixWorld(true);
        const rings = [];
        root.traverse((o) => {
          if (o.isMesh) for (const r of ringsOf(o)) rings.push({ ...r, part: o.name });
        });
        const kind = { hulls: 'hull', structures: 'structure', props: 'prop' }[dir];
        models.push({ slug, navy, kind, rings, ...panelsOf(root) });
      }
    }
  } finally {
    GLTFExporter.prototype.parseAsync = parseAsync;
    delete process.env.HULL_MODELS_OUT;
    rmSync(scratch, { recursive: true, force: true });
  }
  return models;
}

/** A navy's rule tables, from its module, or `{}` for a navy that has none yet. */
async function rulesOf(navy) {
  const file = navy === 'env' ? join(here, 'seabed.mjs') : join(here, 'factions', `${navy}.mjs`);
  const mod = await import(pathToFileURL(file).href);
  return { facets: mod.facets ?? null, panels: mod.panels ?? null };
}

/** Whether a ring keeps its navy's rule; a section count is its own shape and always does. */
export function keeps(rule, r) {
  if (rule.sections?.includes(r.turn)) return true;
  return r.turn === facetsFor(rule, r.radiusM);
}

const BANDS = [
  ['< 0.5 m', 0, 0.5],
  ['0.5–1.5 m', 0.5, 1.5],
  ['1.5–4 m', 1.5, 4],
  ['4–10 m', 4, 10],
  ['≥ 10 m', 10, Infinity],
];

const f1 = (v) => (Math.round(v * 10) / 10).toString();

function report(navy, models, rules, listParts) {
  const rings = models.flatMap((m) => m.rings.map((r) => ({ ...r, slug: m.slug })));
  const kinds = new Map();
  for (const r of rings) kinds.set(r.kind, (kinds.get(r.kind) ?? 0) + 1);
  console.log(
    `${navy}: ${models.length} models, ${rings.length} rings (` +
      [...kinds].map(([k, n]) => `${n} ${k}`).join(', ') +
      ')'
  );
  console.log('  radius        rings  facets a turn: median (range)   facet edge: median');
  for (const [label, lo, hi] of BANDS) {
    const band = rings.filter((r) => r.radiusM >= lo && r.radiusM < hi);
    if (!band.length) continue;
    const turns = band.map((r) => r.turn);
    console.log(
      `  ${label.padEnd(12)} ${String(band.length).padStart(6)}  ` +
        `${f1(median(turns))} (${Math.min(...turns)}–${Math.max(...turns)})`.padEnd(32) +
        `${median(band.map((r) => r.chordM)).toFixed(2)} m`
    );
  }
  const distinct = new Set(rings.map((r) => r.turn)).size;
  console.log(`  ${distinct} distinct counts a turn`);

  const { facets, panels } = rules;
  if (facets) {
    const off = rings.filter((r) => !keeps(facets, r));
    const sections = facets.sections?.length ? `, sections ${facets.sections.join('/')}` : '';
    console.log(
      `  rule: ${facets.chordM} m a facet, ${facets.min}–${facets.max}, step ${facets.step ?? 1}${sections}` +
        ` — ${off.length} of ${rings.length} rings off it`
    );
    if (listParts)
      for (const r of off)
        console.log(
          `    ${r.slug} ${r.part} (${r.kind}): ${r.turn} a turn at r ${r.radiusM.toFixed(2)} m, rule ${facetsFor(facets, r.radiusM)}`
        );
  } else {
    console.log('  rule: none yet — the module exports no `facets`');
  }

  for (const kind of ['hull', 'structure', 'prop']) {
    const mine = models.filter((m) => m.kind === kind);
    if (!mine.length) continue;
    const edges = mine.map((m) => m.edgeM);
    const band = panels?.[kind];
    const out = band ? mine.filter((m) => m.edgeM < band[0] || m.edgeM > band[1]) : [];
    console.log(
      `  panels, ${mine.length} ${kind}s: median edge ${f1(median(edges))} m ` +
        `(${f1(Math.min(...edges))}–${f1(Math.max(...edges))})` +
        (band ? ` — band ${band[0]}–${band[1]} m, ${out.length} outside it` : ' — no band yet')
    );
    for (const m of out) console.log(`    ${m.slug}: ${f1(m.edgeM)} m over ${m.panels} panels`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const listParts = process.argv.includes('--parts');
  const asked = process.argv.slice(2).filter((a) => a !== '--parts');
  const known = [...NAVIES, 'env'];
  const unknown = asked.filter((n) => !known.includes(n));
  if (unknown.length) {
    console.error(`not a navy: ${unknown.join(', ')} (one of ${known.join(', ')})`);
    process.exit(2);
  }
  const models = await measureAll(asked);
  for (const navy of asked.length ? asked : known) {
    const mine = models.filter((m) => m.navy === navy);
    if (mine.length) report(navy, mine, await rulesOf(navy), listParts);
  }
}
