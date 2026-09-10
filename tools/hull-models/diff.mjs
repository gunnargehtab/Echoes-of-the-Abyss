/**
 * What a port changed about a hull's shape — the one question `check.mjs`
 * cannot answer.
 *
 *   node tools/hull-models/diff.mjs <slug> [<rev>]
 *   node tools/hull-models/diff.mjs <before.glb> <after.glb>
 *
 * The round-trip check compares a script's build against the committed GLB.
 * After a port that comparison is a tautology: the port *replaces* the
 * hand-exported binary with the script's own output, so the script is being
 * checked against itself and any shape it moved moved in both halves at once.
 * The only witness left to what the hull used to be is the pre-port binary in
 * git history, which is what this reads.
 *
 * That gap is not theoretical. #594 shipped three shape decisions — a cradle
 * straightened to bilateral, wing lamps lifted half a metre, every Order wing
 * redrawn — green on every gate, because every gate it passed was reading the
 * file the port had already rewritten.
 *
 * Two subtleties this encodes so that a review does not have to re-derive
 * them, and get them wrong the way an eyeball diff does:
 *
 * - **Match by name, never by index.** A port may legitimately reorder parts
 *   (the Sower's moved `stem_keel` ahead of its caudal pair), and an
 *   index-matched diff reports that single reorder as three separate parts
 *   changing shape. Order is worth reporting — `check.mjs` compares in order,
 *   so it is load-bearing — but it is its own finding, not a reshape.
 * - **Subtract the root scale before judging.** A port is metre-true where its
 *   approved model was not, so the whole hull is expected to move by one
 *   uniform factor (`hulls/sower.mjs` documents its 0.947). Reporting that as
 *   47 changed parts buries the one part that really moved. The factor is
 *   measured off the whole-model extents and divided out; what survives is
 *   shape.
 *
 * Nothing here is a gate and nothing here exits non-zero on a difference: a
 * port is allowed to move a bound, and only a person reading the report can
 * say whether a given millimetre was a transcription or a decision. It exists
 * to make that reading possible, and to make it cost a minute.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGlb, boundsOf } from './glb.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const models = 'docs/concept-art/models';

/** Extents and centre of a part or a whole model, in the file's own units. */
function box(parts) {
  const { min, max } = boundsOf(parts);
  return {
    extent: [0, 1, 2].map((i) => max[i] - min[i]),
    centre: [0, 1, 2].map((i) => (max[i] + min[i]) / 2),
  };
}

/**
 * The single factor the whole hull moved by, per axis — the **median** of the
 * per-part extent ratios, not the ratio of the whole-model extents.
 *
 * Whole-model extents are set by whichever part reaches furthest, so one
 * antenna moved outward rescales the entire prediction and every other part
 * then reads as displaced. The Dredge is the case that showed it: measured off
 * the bounding box its port looks like a 1.6% reproportion with all 62 parts
 * moved, and measured off the parts it is one uniform squeeze with a handful of
 * genuine movers. A median ignores the outliers, which is the whole job.
 *
 * Parts thinner than a metre on an axis are skipped for that axis: a 4 cm seam
 * that lands 1 cm thicker is a 25% ratio and pure noise.
 */
function rootScale(before, after) {
  const afterByName = new Map(after.map((p) => [p.name, p]));
  return [0, 1, 2].map((axis) => {
    const ratios = [];
    for (const p of before) {
      const q = afterByName.get(p.name);
      if (!q) continue;
      const a = box(p).extent[axis];
      const b = box(q).extent[axis];
      if (a >= 1) ratios.push(b / a);
    }
    if (!ratios.length) return 1;
    ratios.sort((x, y) => x - y);
    const m = ratios.length >> 1;
    return ratios.length % 2 ? ratios[m] : (ratios[m - 1] + ratios[m]) / 2;
  });
}

/** The last commit that touched a path, so the default `rev` needs no lookup. */
function lastRevTouching(path) {
  const out = execFileSync('git', ['log', '-1', '--format=%H', '--', path], {
    cwd: repo,
    encoding: 'utf8',
  }).trim();
  if (!out) throw new Error(`${path}: no commit in history touches it`);
  return `${out}~1`;
}

/** A blob out of git history, written where glb.mjs can read it as a file. */
function extract(rev, path, dir) {
  const buf = execFileSync('git', ['show', `${rev}:${path}`], {
    cwd: repo,
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = join(dir, `${rev.replace(/[^\w]/g, '_')}.glb`);
  writeFileSync(out, buf);
  return out;
}

function report(beforePath, afterPath, label) {
  const before = readGlb(beforePath).parts;
  const after = readGlb(afterPath).parts;
  const scale = rootScale(before, after);
  const uniform = Math.max(...scale) / Math.min(...scale) - 1;

  console.log(label);
  console.log(`  parts   ${before.length} → ${after.length}`);
  console.log(
    `  tris    ${before.reduce((s, p) => s + p.tris, 0)} → ${after.reduce((s, p) => s + p.tris, 0)}`
  );
  const scaleNote =
    uniform < 1e-3
      ? '(uniform — divided out below)'
      : `⚠ not uniform, ${(uniform * 100).toFixed(2)}% apart: reproportioned, not rescaled`;
  console.log(`  scale   ${scale.map((v) => v.toFixed(4)).join('  ')}  ${scaleNote}`);

  const beforeByName = new Map(before.map((p) => [p.name, p]));
  const afterByName = new Map(after.map((p) => [p.name, p]));

  const gone = before.filter((p) => !afterByName.has(p.name)).map((p) => p.name);
  const added = after.filter((p) => !beforeByName.has(p.name)).map((p) => p.name);
  if (gone.length) console.log(`  removed ${gone.length}: ${gone.join(' ')}`);
  if (added.length) console.log(`  added   ${added.length}: ${added.join(' ')}`);

  // Order is its own finding: check.mjs compares in order, so a reorder is a
  // real change to the file even when every part kept its shape.
  const beforeNames = before.map((p) => p.name);
  const afterNames = after.map((p) => p.name);
  const reordered = [];
  if (gone.length === 0 && added.length === 0) {
    beforeNames.forEach((n, i) => {
      if (afterNames[i] !== n) reordered.push(`[${i}] ${n} → ${afterNames[i]}`);
    });
  }
  if (reordered.length)
    console.log(`  reordered ${reordered.length}:\n    ${reordered.join('\n    ')}`);

  // What survives the root scale is shape. Reported in metres of the *after*
  // file, because that is the hull the reviewer is looking at.
  const moved = [];
  for (const p of before) {
    const q = afterByName.get(p.name);
    if (!q) continue;
    const a = box(p);
    const b = box(q);
    const d = Math.max(
      ...[0, 1, 2].map((i) => Math.abs(b.extent[i] - a.extent[i] * scale[i])),
      ...[0, 1, 2].map((i) => Math.abs(b.centre[i] - a.centre[i] * scale[i]))
    );
    const note = [];
    if (p.tris !== q.tris) note.push(`tris ${p.tris}→${q.tris}`);
    if (p.material !== q.material) note.push(`material ${p.material}→${q.material}`);
    if (d > 0.005 || note.length) moved.push({ name: p.name, d, note: note.join(', ') });
  }
  moved.sort((x, y) => y.d - x.d);

  if (!moved.length) {
    console.log('  shape   unchanged beyond the root scale — every part is where it was');
    return;
  }
  console.log(`  shape   ${moved.length} of ${before.length} parts differ beyond the root scale:`);
  for (const m of moved)
    console.log(`    ${m.name.padEnd(22)} ${m.d.toFixed(3)} m${m.note ? `  ${m.note}` : ''}`);
  console.log(
    '\n  A port transcribes; it does not decide. Every line above is a shape\n' +
      '  decision somebody made, and each one needs a reason in the PR or a fix.'
  );
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: node tools/hull-models/diff.mjs <slug> [<rev>]');
  console.error('       node tools/hull-models/diff.mjs <before.glb> <after.glb>');
  process.exit(2);
}

const scratch = mkdtempSync(join(tmpdir(), 'hull-diff-'));
try {
  if (args.length === 2 && args.every((a) => a.endsWith('.glb') && existsSync(a))) {
    report(args[0], args[1], `${args[0]} → ${args[1]}`);
  } else {
    const slug = args[0].replace(/\.glb$/, '');
    const path = `${models}/${slug}.glb`;
    if (!existsSync(join(repo, path))) throw new Error(`${path}: no such model`);
    const rev = args[1] ?? lastRevTouching(path);
    report(extract(rev, path, scratch), join(repo, path), `${slug}: ${rev} → working tree`);
  }
} catch (err) {
  // A reviewer runs this; a stack trace tells them nothing they can act on.
  console.error(`diff.mjs: ${err.message.trim().split('\n')[0]}`);
  process.exit(2);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
