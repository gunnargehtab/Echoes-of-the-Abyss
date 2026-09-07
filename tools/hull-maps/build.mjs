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
 *   node tools/hull-maps/build.mjs
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
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
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

const tmpRoot = join(repo, '.hull-maps-tmp');
for (const job of JOBS) {
  mkdirSync(job.outDir, { recursive: true });
  for (const entry of job.entries) {
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
      console.error(`bake failed for ${entry.slug}`);
      process.exit(1);
    }
    for (const pass of PASSES) {
      copyFileSync(join(tmp, `${pass}.png`), join(job.outDir, `${entry.slug}-${pass}.png`));
    }
    console.log(`${entry.slug}: wrote ${PASSES.length} maps (${job.ppm} px/m)`);
  }
}

rmSync(tmpRoot, { recursive: true, force: true });
console.log(`\ndone: units at ${MAP_PPM} px/m, structures at ${STRUCT_PPM} px/m`);

// The plan outlines are the other committed output of the same models, so
// one run of this script leaves both current.
await writeOutlines();
