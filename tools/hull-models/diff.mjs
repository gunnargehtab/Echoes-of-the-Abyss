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
 *   so it is load-bearing — but it is its own finding, not a reshape. A name
 *   a file uses more than once — the Vent Tap's draw arm repeats its eleven
 *   parts four times under the same names (#608) — is matched by occurrence,
 *   the k-th `anchor_foot` of one file to the k-th of the other.
 * - **Subtract the root scale before judging.** A port is metre-true where its
 *   approved model was not, so the whole hull is expected to move by one
 *   uniform factor (`hulls/sower.mjs` documents its 0.947). Reporting that as
 *   47 changed parts buries the one part that really moved. The factor is
 *   measured off the whole-model extents and divided out; what survives is
 *   shape.
 * - **Canonicalise as the bake and the runtime do, then subtract the one
 *   translation too.** Both yaw a Z-long export onto +X and centre it on its
 *   bounding box before anything reads it (`rosterModels.ts`,
 *   hull-intake's `page.html`), so a port that builds bow-on-X and centred —
 *   the four Light Scouts were drawn along Z, off-centre, at four arbitrary
 *   scales (#588) — has changed nothing either of them can see. Each file is
 *   yawed here the same way when its Z extent is the longer, and the
 *   whole-hull shift is measured as the per-axis median of the parts' centre
 *   moves, for the reason the scale is a median, and divided out. Both are
 *   printed, because a yaw or a shift is still worth a sentence in the PR.
 *
 * - **Compare surface area as well as bounds.** A drum and a frustum of the
 *   same length and larger radius have the same axis-aligned bounds and the
 *   same triangle count, so a nose cone flattened into a cylinder passes
 *   every check above — the Tender's four ballast caps did (#587 review, F1).
 *   Area is the cheapest measure of a part's shape that bounds cannot stand
 *   in for; it is compared per part, divided by the root scale squared, and
 *   a change over a quarter of a percent is listed with the part.
 * - **Compare the surface centroid too.** A cone built the wrong way round
 *   has the bounds, the triangle count *and* the area of the right one; only
 *   where its surface sits inside that box changes. The Dredge's telson and
 *   both tail spines shipped reversed through two ports and one review that
 *   way (#630). The area-weighted centroid of each part's triangles moves by
 *   a third of the cone's length when it flips, so it is compared beside the
 *   bounds and listed when it moves more than the bounds did.
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

/**
 * The bake's yaw, applied when a file is longer along Z than X: `x' = z,
 * `z' = -x`, which is +π/2 about Y as `rosterModels.ts` and the intake page
 * apply it. Returns the parts rotated, and whether it had to.
 */
function yawOntoX(parts) {
  const { min, max } = boundsOf(parts);
  if (max[2] - min[2] <= max[0] - min[0]) return { parts, yawed: false };
  return {
    yawed: true,
    parts: parts.map((p) => {
      const a = Float32Array.from(p.positions);
      for (let i = 0; i < a.length; i += 3) {
        const x = a[i];
        a[i] = a[i + 2];
        a[i + 2] = -x;
      }
      return { ...p, positions: a };
    }),
  };
}

/** Per-axis median of `values` (an array of `[x, y, z]`), or zeros when empty. */
function medianAxis(values) {
  return [0, 1, 2].map((axis) => {
    const v = values.map((r) => r[axis]).sort((x, y) => x - y);
    if (!v.length) return 0;
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  });
}

/**
 * Surface area of a part, from its triangles, in the file's own units
 * squared — and the area-weighted centroid of that surface.
 */
function surface(part) {
  const a = part.positions;
  let sum = 0;
  const c = [0, 0, 0];
  for (let t = 0; t < a.length; t += 9) {
    const ux = a[t + 3] - a[t], uy = a[t + 4] - a[t + 1], uz = a[t + 5] - a[t + 2];
    const vx = a[t + 6] - a[t], vy = a[t + 7] - a[t + 1], vz = a[t + 8] - a[t + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const tri = Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
    sum += tri;
    for (let d = 0; d < 3; d++) c[d] += (tri * (a[t + d] + a[t + 3 + d] + a[t + 6 + d])) / 3;
  }
  return { area: sum, centroid: sum > 0 ? c.map((v) => v / sum) : c };
}

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
 * Parts thinner than a hundredth of the hull on an axis are skipped for that
 * axis: a 4 cm seam that lands 1 cm thicker is a 25% ratio and pure noise.
 * The threshold is a fraction of the model's own longest extent rather than a
 * metre, because the file's units are the thing in question — the approved
 * turrets were drawn ten times under scale and the Light Scouts up to
 * eleven, and against a fixed metre no part of theirs qualifies, the scale
 * silently defaults to 1 and every part reads as moved.
 */
/**
 * A part's key: its name, and which occurrence of that name it is in the
 * file — so that a repeated arm's fourth `valve_block` matches the fourth.
 */
function keyed(parts) {
  const seen = new Map();
  return parts.map((p) => {
    const n = (seen.get(p.name) ?? 0) + 1;
    seen.set(p.name, n);
    return { ...p, key: n === 1 ? p.name : `${p.name}#${n}` };
  });
}

function rootScale(before, after) {
  const afterByName = new Map(after.map((p) => [p.key, p]));
  const floor = Math.max(...box(before).extent) / 100;
  return [0, 1, 2].map((axis) => {
    const ratios = [];
    for (const p of before) {
      const q = afterByName.get(p.key);
      if (!q) continue;
      const a = box(p).extent[axis];
      const b = box(q).extent[axis];
      if (a >= floor) ratios.push(b / a);
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
  const b0 = yawOntoX(readGlb(beforePath).parts);
  const a0 = yawOntoX(readGlb(afterPath).parts);
  const before = keyed(b0.parts);
  const after = keyed(a0.parts);
  const scale = rootScale(before, after);
  const uniform = Math.max(...scale) / Math.min(...scale) - 1;

  console.log(label);
  console.log(`  parts   ${before.length} → ${after.length}`);
  console.log(
    `  tris    ${before.reduce((s, p) => s + p.tris, 0)} → ${after.reduce((s, p) => s + p.tris, 0)}`
  );
  if (b0.yawed || a0.yawed)
    console.log(
      `  yaw     ${b0.yawed ? 'before' : ''}${b0.yawed && a0.yawed ? ' and ' : ''}${a0.yawed ? 'after' : ''}` +
        ' drawn along Z — yawed onto +X as the bake does, before comparing'
    );
  const scaleNote =
    uniform < 1e-3
      ? '(uniform — divided out below)'
      : `⚠ not uniform, ${(uniform * 100).toFixed(2)}% apart: reproportioned, not rescaled`;
  console.log(`  scale   ${scale.map((v) => v.toFixed(4)).join('  ')}  ${scaleNote}`);

  const beforeByName = new Map(before.map((p) => [p.key, p]));
  const afterByName = new Map(after.map((p) => [p.key, p]));

  // The one translation the whole hull moved by — a port that centres a hull
  // the approved export left off-centre moves every part by the same vector,
  // which the bake and the runtime undo and which is therefore not shape.
  const shift = medianAxis(
    before
      .filter((p) => afterByName.has(p.key))
      .map((p) => {
        const a = box(p).centre;
        const b = box(afterByName.get(p.key)).centre;
        return [0, 1, 2].map((i) => b[i] - a[i] * scale[i]);
      })
  );
  if (shift.some((v) => Math.abs(v) > 0.005))
    console.log(
      `  shift   ${shift.map((v) => v.toFixed(3)).join('  ')}  (whole hull, m — divided out below)`
    );

  const gone = before.filter((p) => !afterByName.has(p.key)).map((p) => p.key);
  const added = after.filter((p) => !beforeByName.has(p.key)).map((p) => p.key);
  if (gone.length) console.log(`  removed ${gone.length}: ${gone.join(' ')}`);
  if (added.length) console.log(`  added   ${added.length}: ${added.join(' ')}`);

  // Order is its own finding: check.mjs compares in order, so a reorder is a
  // real change to the file even when every part kept its shape.
  const beforeNames = before.map((p) => p.key);
  const afterNames = after.map((p) => p.key);
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
    const q = afterByName.get(p.key);
    if (!q) continue;
    const a = box(p);
    const b = box(q);
    const d = Math.max(
      ...[0, 1, 2].map((i) => Math.abs(b.extent[i] - a.extent[i] * scale[i])),
      ...[0, 1, 2].map((i) => Math.abs(b.centre[i] - shift[i] - a.centre[i] * scale[i]))
    );
    const note = [];
    if (p.tris !== q.tris) note.push(`tris ${p.tris}→${q.tris}`);
    if (p.material !== q.material) note.push(`material ${p.material}→${q.material}`);
    // Area is a scalar, so the root scale enters squared; one axis's factor
    // stands for all three, since a non-uniform scale is already flagged above.
    const sa = surface(p);
    const sb = surface(q);
    const areaA = sa.area * scale[0] * scale[1];
    const areaPct = areaA > 0 ? ((sb.area - areaA) / areaA) * 100 : 0;
    if (Math.abs(areaPct) > 0.25)
      note.push(`area ${areaPct > 0 ? '+' : ''}${areaPct.toFixed(1)}%`);
    // The surface centroid, under the same scale and shift as the bounds. A
    // move here beyond what the bounds moved is a part re-laid inside its box.
    const cd = Math.max(
      ...[0, 1, 2].map((i) => Math.abs(sb.centroid[i] - shift[i] - sa.centroid[i] * scale[i]))
    );
    if (cd > 0.005 && cd > d + 0.005) note.push(`centroid ${cd.toFixed(3)} m`);
    if (d > 0.005 || note.length) moved.push({ name: p.key, d: Math.max(d, cd), note: note.join(', ') });
  }
  moved.sort((x, y) => y.d - x.d);

  if (!moved.length) {
    console.log('  shape   unchanged beyond the root scale and shift — every part is where it was');
    return;
  }
  console.log(`  shape   ${moved.length} of ${before.length} parts differ beyond the root scale and shift:`);
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
