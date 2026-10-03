/**
 * Regenerate the frontend's hull maps from the committed 3D unit models.
 *
 * The sprite baker in packages/frontend/src/game/hullTextures.ts used to guess
 * a hull's relief with a distance transform, because there was no geometry to
 * ask. There is now: docs/concept-art/models/*.glb, approved through the
 * hull-intake skill. This script renders each model to the flat maps the baker
 * consumes at load time, so the 3D work stays offline and the client keeps
 * shipping nothing heavier than PNGs.
 *
 * Not an npm workspace — run it directly, like tools/echo-sim:
 *   node tools/hull-maps/build.mjs                 every model in models.mjs
 *   node tools/hull-maps/build.mjs derrick bastion  only those, by table slug
 *   node tools/hull-maps/build.mjs derrick-bathyarch    or by model file name
 *   node tools/hull-maps/build.mjs --help
 *
 * A full run bakes all 94 models through Chromium, minutes for a change to one
 * GLB, so a slug list bakes just those (#1055). Either way the plan outlines
 * are rewritten at the end: outlines.mjs reads the 44 unit models without a
 * browser, which is cheap.
 *
 * The model table it bakes from is models.mjs, shared with outlines.mjs —
 * the second committed output of the same GLBs, which this script refreshes
 * at the end of a run and check.mjs (tools/hull-models) holds to the files.
 *
 * MAP_PPM is the contract with hullTextures.ts: the maps carry no metadata, so
 * their pixel dimensions divided by this constant ARE the hull's metre extents.
 * Change it in both places or sprites will scale wrong.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UNITS, STRUCTURES } from './models.mjs';
import { writeOutlines } from './outlines.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MAP_PPM = 4;
/**
 * Structures bake at lower density: they are an order of magnitude larger
 * than hulls, and 1.5 px/m keeps the Bastion's maps in the same memory class
 * as its procedural bake. Contract with STRUCT_MAP_PPM in structureMaps.ts.
 */
const STRUCT_PPM = 1.5;
const PASSES = ['albedo', 'height', 'emissive'];

/**
 * Glow is spec'd, not inherited: every emissive map is calibrated onto the
 * gate-3 target curve in docs/graphics-standards.md, E(SIG) = 0.45·e^(SIG/14),
 * from the idle/cruise SIG in docs/units.md (SPEC). The models keep their own
 * light placement; only intensity is normalised — without this, each
 * generation run's arbitrary emissive levels would leak into the Echo Layer's
 * visual law (quiet subs outshining loud cruisers, sister hulls 7× apart).
 */
const glowTarget = (sig) => 0.45 * Math.exp(sig / 14);

const JOBS = [
  { entries: UNITS, ppm: MAP_PPM, outDir: join(repo, 'packages/frontend/src/assets/hulls/maps') },
  {
    entries: STRUCTURES,
    ppm: STRUCT_PPM,
    outDir: join(repo, 'packages/frontend/src/assets/structures/maps'),
  },
];

// --- arguments ---------------------------------------------------------------
// A name matches a table slug (`derrick`) or a model file without its
// extension (`derrick-bathyarch`): the first is what hullMaps.ts and the
// outlines call the kind, the second is what diff.mjs, contacts.mjs and
// inspect.mjs call the file, and a person arrives from either.
const usage = () => {
  const names = (entries) => entries.map((e) => e.slug).join(', ');
  console.log(
    [
      'usage: node tools/hull-maps/build.mjs [--help] [<slug>...]',
      '',
      'Bakes the albedo, height and emissive maps of every model in models.mjs,',
      'or only the named ones, then rewrites the plan outlines. A slug is a',
      'table slug or a model file name without .glb.',
      '',
      `units:      ${names(UNITS)}`,
      `structures: ${names(STRUCTURES)}`,
    ].join('\n')
  );
};
const args = process.argv.slice(2);
if (args.some((a) => a === '--help' || a === '-h')) {
  usage();
  process.exit(0);
}
const unknownFlag = args.find((a) => a.startsWith('-'));
if (unknownFlag) {
  console.error(`unknown option ${unknownFlag}\n`);
  usage();
  process.exit(2);
}
const matches = (entry, name) => entry.slug === name || entry.model === `${name}.glb`;
const missing = args.filter((name) => !JOBS.some((j) => j.entries.some((e) => matches(e, name))));
if (missing.length) {
  console.error(`no such model: ${missing.join(', ')}\n`);
  usage();
  process.exit(2);
}
const wanted = (entries) =>
  args.length ? entries.filter((e) => args.some((name) => matches(e, name))) : entries;

// A fresh scratch directory per run, in the OS temp dir rather than the repo:
// two bakes at once used to share .hull-maps-tmp/ under the tree, and the
// first to finish removed it from under the second (#1055).
const tmpRoot = mkdtempSync(join(tmpdir(), 'hull-maps-'));
let baked = 0;
let failed = null;
try {
  jobs: for (const job of JOBS) {
    mkdirSync(job.outDir, { recursive: true });
    for (const entry of wanted(job.entries)) {
      const model = join(repo, 'docs/concept-art/models', entry.model);
      const tmp = join(tmpRoot, entry.slug);
      const result = spawnSync(
        'node',
        [
          join(repo, '.claude/skills/hull-intake/scripts/bake.mjs'),
          model,
          '--length-m',
          String(entry.lengthM),
          '--ppm',
          String(job.ppm),
          '--glow-e',
          String(glowTarget(entry.sig)),
          '--out',
          tmp,
        ],
        { stdio: 'inherit' }
      );
      if (result.status !== 0) {
        // Not process.exit here: that would skip the finally and leave the
        // scratch directory behind, which is the litter #1055 found.
        failed = entry.slug;
        break jobs;
      }
      for (const pass of PASSES) {
        copyFileSync(join(tmp, `${pass}.png`), join(job.outDir, `${entry.slug}-${pass}.png`));
      }
      console.log(`${entry.slug}: wrote ${PASSES.length} maps (${job.ppm} px/m)`);
      baked += 1;
    }
  }
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}
if (failed) {
  console.error(`bake failed for ${failed}`);
  process.exit(1);
}
console.log(
  `\ndone: ${baked} model(s), units at ${MAP_PPM} px/m, structures at ${STRUCT_PPM} px/m`
);

// The plan outlines are the other committed output of the same models, so
// one run of this script leaves both current.
await writeOutlines();
