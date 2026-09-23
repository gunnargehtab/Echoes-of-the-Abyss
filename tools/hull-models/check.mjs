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
 * count and bounds to the centimetre — which is close enough to catch any
 * edit that moves a vertex and loose enough not to care which three.js wrote
 * the bytes.
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
 * script (or outlines.mjs) and commit what it wrote. Light-audit warnings
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
    };
  });

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
