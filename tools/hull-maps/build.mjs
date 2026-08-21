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
 * MAP_PPM is the contract with hullTextures.ts: the maps carry no metadata, so
 * their pixel dimensions divided by this constant ARE the hull's metre extents.
 * Change it in both places or sprites will scale wrong.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * Which model clads which unit, and the design length it is baked against
 * (HULL_LENGTH_M in packages/frontend/src/game/silhouettes.ts). A unit absent
 * here keeps the distance-transform fallback — that is the intended state for
 * hulls whose model has not been approved yet.
 */
const UNITS = [
  { slug: 'light-scout', model: 'light-scout-pelagia.glb', lengthM: 60 },
  { slug: 'corvette', model: 'corvette-pelagia.glb', lengthM: 80 },
  { slug: 'cruiser', model: 'cruiser-pelagia.glb', lengthM: 130 },
  { slug: 'harvester', model: 'harvester-pelagia.glb', lengthM: 75 },
  { slug: 'abyssal-submersible', model: 'abyssal-submersible-directorate.glb', lengthM: 95 },
];

/**
 * Structure models, baked against the footprint diameter (2 × radiusM in
 * packages/shared/src/structures.ts). Absent structures keep the procedural
 * architecture bake in structureTextures.ts.
 */
const STRUCTURES = [
  { slug: 'bastion', model: 'bastion-bathyarch.glb', lengthM: 440 },
  { slug: 'refinery', model: 'refinery-bathyarch.glb', lengthM: 280 },
  { slug: 'foundry', model: 'foundry-bathyarch.glb', lengthM: 320 },
];

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
