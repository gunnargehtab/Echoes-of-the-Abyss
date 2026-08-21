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
];

const outDir = join(repo, 'packages/frontend/src/assets/hulls/maps');
const tmpRoot = join(repo, '.hull-maps-tmp');
mkdirSync(outDir, { recursive: true });

for (const unit of UNITS) {
  const model = join(repo, 'docs/concept-art/models', unit.model);
  const tmp = join(tmpRoot, unit.slug);
  const result = spawnSync(
    'node',
    [
      join(repo, '.claude/skills/hull-intake/scripts/bake.mjs'),
      model,
      '--length-m',
      String(unit.lengthM),
      '--ppm',
      String(MAP_PPM),
      '--out',
      tmp,
    ],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) {
    console.error(`bake failed for ${unit.slug}`);
    process.exit(1);
  }
  for (const pass of PASSES) {
    copyFileSync(join(tmp, `${pass}.png`), join(outDir, `${unit.slug}-${pass}.png`));
  }
  console.log(`${unit.slug}: wrote ${PASSES.length} maps`);
}

rmSync(tmpRoot, { recursive: true, force: true });
console.log(`\nmaps in ${outDir} (${MAP_PPM} px/m)`);
