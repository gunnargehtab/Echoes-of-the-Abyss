/**
 * The round-trip check: every model script rebuilds, and the build must be
 * the committed GLB; every modelled kind's plan outline regenerates, and it
 * must be the committed TypeScript.
 *
 *   node tools/hull-models/check.mjs              # npm run check:models
 *   node tools/hull-models/check.mjs slipway foundry-hadron   # only the scripts named
 *
 * A name filter runs only the scripts whose file name contains one of the
 * words given — the way `--only=` narrows `npm run gates` — because four
 * ports written in parallel each want to know about their own scripts and
 * not about a neighbour's half-written one (#652). The outline check still
 * runs, since it reads the committed files rather than the scripts. Without
 * a filter every script runs, which is what CI does.
 *
 * A script and its binary can disagree silently — edit a faction module,
 * forget to re-run one of its hulls, and nothing downstream notices, because
 * intake and the map bake read the file and never the script. This is what
 * notices. It walks every script directory — `hulls/`, `structures/` since
 * #553 and `props/` since #869 — because a shared module feeds more than one
 * of them, and a script left un-run is exactly the silent disagreement this
 * exists to catch. Each script runs as its own process with `HULL_MODELS_OUT` pointing
 * at a scratch directory (kit.mjs `outputPath`), so the committed files are
 * never touched; the scratch GLB and the committed one are then read back
 * (glb.mjs) and compared part by part — name, material, finish, triangle
 * count, bounds to the centimetre and every corner's normal to a degree —
 * which is close enough to catch any edit that moves a vertex and loose
 * enough not to care which three.js wrote the bytes.
 *
 * The normals are compared because the conn view lights a hull by the
 * file's own (`rosterModels.ts` keeps them), and a buffer can change under
 * triangles that do not. Until #911 only positions were read, so a file
 * whose normals its script no longer wrote passed: #897's Antiphon file from
 * 4a243b5, the first cut of its sheared ridge, reads 55° off on all 72
 * corners of `blade_spine_aft` against the script that fixed it, and now
 * fails. What still passes is a wrong buffer committed with the script that
 * wrote it — 4a243b5 itself, whose script and file agree. That is a fault in
 * the buffer rather than drift from it, and a reviewer reading the buffer is
 * still what catches it. A degree is well above what a float32 buffer
 * written twice disagrees by, which is zero on every model committed, and
 * fifty-five times under the fault #897 shipped.
 *
 * The finish is the material's values under its name, in `finishFields`'
 * printed precision. Until #888 only the name was compared, so an ink edited
 * in a faction module and never re-run passed: the one edit Phase 6 of #540
 * exists to make was the one edit this could not see. Last, the committed
 * files are read as a set, and a name carrying two values inside one navy
 * fails (finishes.mjs) — every file can agree with its script while two of
 * them disagree with each other.
 *
 * The fix for drift is always the same and the report says so: re-run the
 * script (or outlines.mjs) and commit what it wrote. The one exception is a
 * normal the script itself builds as NaN, and its line says so (#911).
 * Light-audit warnings
 * from the rebuilds print through but do not fail the check — they are the
 * kit's word to the author, not a gate on a model already approved.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGlb, boundsOf, finishFields } from './glb.mjs';
import { OUTLINE_FILE, renderSource } from '../hull-maps/outlines.mjs';
import { NAVIES, splitsIn } from './finishes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const models = join(repo, 'docs/concept-art/models');

const cm = (v) => Math.round(v * 100) / 100;
const summarise = (parts) =>
  parts.map((p) => {
    const { min, max } = boundsOf(p);
    const finish = p.finish ? finishFields(p.finish) : null;
    return {
      name: p.name,
      material: p.material,
      finish,
      tris: p.tris,
      min: min.map(cm),
      max: max.map(cm),
      normals: p.normals,
    };
  });

const TURN_DEG = 1;

/**
 * How far a part's normals turned between the file and the build, corner by
 * corner, as a phrase for the report; null when every corner is within
 * `TURN_DEG`. Only asked of parts whose triangles already agree, so the two
 * buffers are the same length and the k-th corner of each is the same
 * vertex. The angle is atan2(|a × b|, a · b), not acos(a · b): two copies
 * of one float32 normal dot to a hair under 1, and acos reads that as a
 * fiftieth of a degree.
 *
 * A corner that is not a number on either side is its own failure, since
 * NaN is never greater than a degree and would otherwise pass as unturned.
 * GLTFExporter writes one through unchanged — its unit-length test is false
 * for NaN too — so a hand-built normal that divided by zero reaches the file.
 * Which side it is on decides the fix: in the file alone, re-running the
 * script clears it; in the build, the script writes it, and the line says so
 * rather than leave the report's re-run advice standing.
 */
function normalsTurned(built, committed) {
  if (!built || !committed)
    return built === committed
      ? null
      : `normals ${built ? 'built, none in the file' : 'in the file, none built'}`;
  const corners = built.length / 3;
  let turned = 0;
  let inFile = 0;
  let inBuild = 0;
  let worst = 0;
  for (let k = 0; k < built.length; k += 3) {
    const [ax, ay, az] = built.subarray(k, k + 3);
    const [bx, by, bz] = committed.subarray(k, k + 3);
    const cross = Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
    const deg = (Math.atan2(cross, ax * bx + ay * by + az * bz) * 180) / Math.PI;
    if (Number.isNaN(deg)) {
      if (Number.isNaN(ax + ay + az)) inBuild++;
      else inFile++;
    } else if (deg > TURN_DEG) {
      turned++;
      worst = Math.max(worst, deg);
    }
  }
  const out = [];
  if (turned) out.push(`normals turned at ${turned} of ${corners} corners, up to ${worst.toFixed(1)}°`);
  if (inFile) out.push(`${inFile} of ${corners} corners' normals not a number in the file`);
  if (inBuild)
    out.push(
      `${inBuild} of ${corners} corners' normals not a number in the build — ` +
        'the script writes them, so re-running it will not clear this'
    );
  return out.length ? out.join('; ') : null;
}

/** Lines describing how `built` differs from `committed`; empty when they agree. */
export function diffParts(built, committed) {
  const out = [];
  // A finish lives on a material, not a part, so it is reported once a name:
  // an ink edited under forty parts is one line, not forty.
  const refinished = new Set();
  const n = Math.max(built.length, committed.length);
  if (built.length !== committed.length)
    out.push(`${committed.length} parts committed, ${built.length} built`);
  for (let i = 0; i < n && out.length < 12; i++) {
    const a = built[i];
    const b = committed[i];
    if (!a || !b) {
      out.push(`part ${i}: ${b ? `\`${b.name}\` missing from build` : `\`${a.name}\` not in file`}`);
      continue;
    }
    if (a.name !== b.name) out.push(`part ${i}: \`${b.name}\` is now \`${a.name}\``);
    else if (a.material !== b.material)
      out.push(`\`${a.name}\`: material ${b.material} → ${a.material}`);
    else if (a.tris !== b.tris) out.push(`\`${a.name}\`: ${b.tris} tris → ${a.tris}`);
    else if (a.min.join() !== b.min.join() || a.max.join() !== b.max.join())
      out.push(
        `\`${a.name}\`: bounds [${b.min}]..[${b.max}] → [${a.min}]..[${a.max}]`
      );
    else {
      // Last in the chain: a part whose shape moved has had its line, and a
      // normal buffer is the one change left that moves no bound.
      const turned = normalsTurned(a.normals, b.normals);
      if (turned) out.push(`\`${a.name}\`: ${turned}`);
    }
    // Beside the chain rather than in it, so a part whose finish moved still
    // has its triangles and bounds read.
    if (
      a.material === b.material &&
      !refinished.has(a.material) &&
      JSON.stringify(a.finish) !== JSON.stringify(b.finish)
    ) {
      refinished.add(a.material);
      const moved = Object.keys({ ...a.finish, ...b.finish })
        .filter((k) => a.finish?.[k] !== b.finish?.[k])
        .map((k) => `${k} ${b.finish?.[k]} → ${a.finish?.[k]}`);
      out.push(`\`${a.material}\` (first on \`${a.name}\`): ${moved.join(', ')}`);
    }
  }
  return out;
}

const scratch = mkdtempSync(join(tmpdir(), 'hull-models-'));
let failed = 0;
try {
  const only = process.argv.slice(2);
  const scripts = ['hulls', 'structures', 'props'].flatMap((dir) =>
    readdirSync(join(here, dir))
      .filter((f) => f.endsWith('.mjs'))
      .filter((f) => only.length === 0 || only.some((word) => f.includes(word)))
      .sort()
      .map((file) => [dir, file])
  );
  if (only.length && scripts.length === 0) {
    console.error(`no script under hulls/, structures/ or props/ matches ${only.join(', ')}`);
    process.exit(2);
  }
  for (const [dir, script] of scripts) {
    const out = join(scratch, script.replace(/\.mjs$/, ''));
    const run = spawnSync('node', [join(here, dir, script)], {
      env: { ...process.env, HULL_MODELS_OUT: out },
      encoding: 'utf8',
    });
    if (run.status !== 0) {
      failed++;
      console.error(`✗ ${dir}/${script}: exited ${run.status}\n${run.stderr}`);
      continue;
    }
    const written = readdirSync(out).filter((f) => f.endsWith('.glb'));
    if (written.length !== 1) {
      failed++;
      console.error(`✗ ${dir}/${script}: wrote ${written.length} GLBs, expected one`);
      continue;
    }
    const [file] = written;
    const built = summarise(readGlb(join(out, file)).parts);
    let committed;
    try {
      committed = summarise(readGlb(join(models, file)).parts);
    } catch {
      failed++;
      console.error(
        `✗ ${dir}/${script}: ${file} is not committed — run the script and commit it`
      );
      continue;
    }
    const drift = diffParts(built, committed);
    const warnings = (run.stderr.match(/WARNING/g) ?? []).length;
    if (drift.length) {
      failed++;
      console.error(
        `✗ ${dir}/${script} → ${file} drifted:\n    ${drift.join('\n    ')}\n` +
          `  run \`node tools/hull-models/${dir}/${script}\` and commit the GLB`
      );
    } else {
      console.log(
        `✓ ${dir}/${script} → ${file}: ${built.length} parts agree` +
          (warnings ? ` (${warnings} light warnings)` : '')
      );
    }
  }

  const want = await renderSource();
  let have = null;
  try {
    have = readFileSync(OUTLINE_FILE, 'utf8');
  } catch {
    /* missing counts as drift */
  }
  if (have !== want) {
    failed++;
    console.error(
      `✗ ${OUTLINE_FILE.slice(repo.length + 1)} ${have === null ? 'is missing' : 'disagrees with the models'}\n` +
        '  run `node tools/hull-maps/outlines.mjs` and commit it'
    );
  } else {
    console.log(`✓ ${OUTLINE_FILE.slice(repo.length + 1)} agrees with the models`);
  }

  // One name, one value, across a navy (asset-prompts-3d.md Block 2b rule 3).
  // Every script can agree with its own file while two files give one name
  // two values, which is how the ports left 19 names split until #888; so this
  // reads the committed files as a set, and runs whatever the filter.
  // finishes.mjs places a model in a navy by its `-<navy>.glb` suffix, so a
  // file with none would be read by no navy and pass unread: every model names
  // one, or is an `env-` prop, which belongs to none.
  const unplaced = readdirSync(models).filter(
    (f) => f.endsWith('.glb') && !f.startsWith('env-') && !NAVIES.some((n) => f.endsWith(`-${n}.glb`))
  );
  if (unplaced.length) {
    failed++;
    console.error(
      `✗ ${unplaced.join(', ')} name${unplaced.length > 1 ? '' : 's'} no navy, so no split check reads ${unplaced.length > 1 ? 'them' : 'it'}\n` +
        `  name a model <slug>-<${NAVIES.join('|')}>.glb, or env-<thing>.glb for a prop`
    );
  }
  for (const navy of NAVIES) {
    const splits = splitsIn(navy, models);
    if (!splits.length) {
      console.log(`✓ ${navy}: one value a name`);
      continue;
    }
    failed++;
    const lines = splits.map(
      ({ name, values }) =>
        `\`${name}\`: ${values.map(({ value, slugs }) => `${value} (${slugs.join(', ')})`).join('\n      or ')}`
    );
    console.error(
      `✗ ${navy} gives ${splits.length} name${splits.length > 1 ? 's' : ''} two values:\n    ${lines.join('\n    ')}\n` +
        `  bring each onto the navy's one \`ink\` value (node tools/hull-models/finishes.mjs ${navy})`
    );
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failed) {
  console.error(`\n${failed} drifted or split`);
  process.exit(1);
}
console.log('\nevery script matches its file');
