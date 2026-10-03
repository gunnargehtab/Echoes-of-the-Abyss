/**
 * #1002's bevel-coverage audit: what the model library is built from, by
 * primitive, and how many of its extruded plates carry a bevel.
 *
 *   node tools/render-stack/bevels.mjs            # a table by navy
 *   node tools/render-stack/bevels.mjs --models   # and every model's own line
 *   node tools/render-stack/bevels.mjs --json
 *
 * A GLB cannot answer this — a chamfer is triangles like any other — so the
 * scripts are run, every one under hulls/, structures/ and props/, into a
 * scratch directory the way check.mjs runs them, and each export's own
 * `primitives:` and `plates:` lines (kit.mjs `census`) are summed. The navy
 * is the file's suffix, `-<navy>.glb`, which check.mjs requires of every
 * model that is not an `env-` prop. docs/art-direction.md quotes the
 * table; it reads the library as it stands, so the counts move whenever a
 * model does. Not a gate.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const models = resolve(here, '../hull-models');
const args = new Set(process.argv.slice(2));

const scripts = ['hulls', 'structures', 'props'].flatMap((dir) =>
  readdirSync(join(models, dir))
    .filter((f) => f.endsWith('.mjs'))
    .sort()
    .map((file) => [dir, file])
);

/** One script, run under HULL_MODELS_OUT: the GLB it wrote and the two census lines. */
function run(dir, file, out) {
  return new Promise((done) => {
    const child = spawn('node', [join(models, dir, file)], {
      env: { ...process.env, HULL_MODELS_OUT: out },
    });
    let stdout = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', () => {});
    child.on('close', (status) => {
      const glb = stdout.match(/^(\S+\.glb):/m)?.[1] ?? null;
      const prims = stdout.match(/^ {2}primitives: (.*)$/m)?.[1] ?? '';
      const plates = stdout.match(/^ {2}plates: (\d+) extruded, (\d+) bevelled$/m);
      done({
        script: `${dir}/${file}`,
        status,
        glb,
        primitives: Object.fromEntries(
          prims
            .split(', ')
            .filter(Boolean)
            .map((s) => s.split(' '))
            .map(([n, k]) => [k, Number(n)])
        ),
        plates: plates ? Number(plates[1]) : 0,
        bevelled: plates ? Number(plates[2]) : 0,
      });
    });
  });
}

const navyOf = (glb) =>
  glb.startsWith('env-') ? 'props' : (glb.match(/-([a-z]+)\.glb$/)?.[1] ?? 'unknown');

const scratch = mkdtempSync(join(tmpdir(), 'bevels-'));
const results = [];
try {
  // Four at a time: a script is a fraction of a second and there are over a
  // hundred, and the machine running check.mjs has the cores for it.
  const queue = scripts.slice();
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const [dir, file] = next;
        results.push(await run(dir, file, join(scratch, file.replace(/\.mjs$/, ''))));
      }
    })
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
results.sort((a, b) => a.script.localeCompare(b.script));

const failed = results.filter((r) => r.status !== 0 || !r.glb);
for (const r of failed) console.error(`✗ ${r.script}: exited ${r.status}, no census read`);

const rows = new Map();
for (const r of results) {
  if (r.status !== 0 || !r.glb) continue;
  const navy = navyOf(r.glb);
  const row = rows.get(navy) ?? {
    navy,
    models: 0,
    withPlates: 0,
    parts: 0,
    plates: 0,
    bevelled: 0,
    primitives: {},
  };
  rows.set(navy, row);
  row.models++;
  if (r.plates > 0) row.withPlates++;
  row.plates += r.plates;
  row.bevelled += r.bevelled;
  for (const [k, n] of Object.entries(r.primitives)) {
    row.parts += n;
    row.primitives[k] = (row.primitives[k] ?? 0) + n;
  }
}
const order = ['bathyarch', 'pelagia', 'directorate', 'hadron', 'props', 'unknown'];
const table = [...rows.values()].sort((a, b) => order.indexOf(a.navy) - order.indexOf(b.navy));
const total = table.reduce(
  (t, r) => {
    t.models += r.models;
    t.withPlates += r.withPlates;
    t.parts += r.parts;
    t.plates += r.plates;
    t.bevelled += r.bevelled;
    for (const [k, n] of Object.entries(r.primitives)) t.primitives[k] = (t.primitives[k] ?? 0) + n;
    return t;
  },
  { navy: 'all', models: 0, withPlates: 0, parts: 0, plates: 0, bevelled: 0, primitives: {} }
);

if (args.has('--json')) {
  console.log(JSON.stringify({ rows: [...table, total], models: results }, null, 2));
} else {
  const pct = (n, d) => (d ? `${Math.round((100 * n) / d)} %` : '—');
  console.log('| Navy | Models | With plates | Parts | Plates | Bevelled | Of plates | Of parts |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of [...table, total])
    console.log(
      `| ${r.navy} | ${r.models} | ${r.withPlates} | ${r.parts} | ${r.plates} | ${r.bevelled} | ` +
        `${pct(r.bevelled, r.plates)} | ${pct(r.plates, r.parts)} |`
    );
  console.log('');
  console.log('Parts by primitive, whole library:');
  for (const [k, n] of Object.entries(total.primitives).sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(5)} ${k}`);
  if (args.has('--models')) {
    console.log('');
    console.log('| Model | Parts | Plates | Bevelled |');
    console.log('| --- | --- | --- | --- |');
    for (const r of results) {
      if (!r.glb) continue;
      const parts = Object.values(r.primitives).reduce((a, b) => a + b, 0);
      console.log(`| ${r.glb.replace(/\.glb$/, '')} | ${parts} | ${r.plates} | ${r.bevelled} |`);
    }
  }
}
process.exitCode = failed.length ? 1 : 0;
