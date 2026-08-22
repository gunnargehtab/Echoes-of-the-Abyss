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
 * Glow is spec'd, not inherited: every emissive map is calibrated onto the
 * gate-3 target curve in docs/graphics-standards.md, E(SIG) = 0.45·e^(SIG/14),
 * from the idle/cruise SIG in docs/units.md (SPEC). The models keep their own
 * light placement; only intensity is normalised — without this, each
 * generation run's arbitrary emissive levels would leak into the Echo Layer's
 * visual law (quiet subs outshining loud cruisers, sister hulls 7× apart).
 */
const glowTarget = (sig) => 0.45 * Math.exp(sig / 14);

/**
 * Which model clads which unit, the design length it is baked against
 * (HULL_LENGTH_M in packages/frontend/src/game/silhouettes.ts), and the
 * idle/cruise SIG its glow is calibrated to (docs/units.md). A unit absent
 * here keeps the distance-transform fallback — that is the intended state for
 * hulls whose model has not been approved yet.
 */
const UNITS = [
  { slug: 'light-scout', model: 'light-scout-pelagia.glb', lengthM: 60, sig: 6 },
  { slug: 'corvette', model: 'corvette-pelagia.glb', lengthM: 80, sig: 28 },
  { slug: 'cruiser', model: 'cruiser-pelagia.glb', lengthM: 130, sig: 55 },
  { slug: 'harvester', model: 'harvester-pelagia.glb', lengthM: 75, sig: 18 },
  { slug: 'abyssal-submersible', model: 'abyssal-submersible-directorate.glb', lengthM: 95, sig: 22 },
  // Faction variants: same kind, another navy's shape language. The slug's
  // faction suffix pairs with VARIANT_MAP_URL in hullMaps.ts.
  { slug: 'light-scout-bathyarch', model: 'light-scout-bathyarch.glb', lengthM: 60, sig: 6 },
  { slug: 'corvette-bathyarch', model: 'corvette-bathyarch.glb', lengthM: 80, sig: 28 },
  { slug: 'harvester-bathyarch', model: 'harvester-bathyarch.glb', lengthM: 75, sig: 18 },
  { slug: 'cruiser-bathyarch', model: 'cruiser-bathyarch.glb', lengthM: 130, sig: 55 },
  {
    slug: 'light-scout-directorate',
    model: 'light-scout-directorate.glb',
    lengthM: 60,
    sig: 6,
  },
  { slug: 'corvette-directorate', model: 'corvette-directorate.glb', lengthM: 80, sig: 28 },
  { slug: 'harvester-directorate', model: 'harvester-directorate.glb', lengthM: 75, sig: 18 },
  { slug: 'cruiser-directorate', model: 'cruiser-directorate.glb', lengthM: 130, sig: 55 },
  { slug: 'light-scout-hadron', model: 'light-scout-hadron.glb', lengthM: 60, sig: 6 },
  { slug: 'corvette-hadron', model: 'corvette-hadron.glb', lengthM: 80, sig: 28 },
  { slug: 'cruiser-hadron', model: 'cruiser-hadron.glb', lengthM: 130, sig: 55 },
  { slug: 'harvester-hadron', model: 'harvester-hadron.glb', lengthM: 75, sig: 18 },
  {
    slug: 'abyssal-submersible-hadron',
    model: 'abyssal-submersible-hadron.glb',
    lengthM: 95,
    sig: 22,
  },
];

/**
 * Structure models, baked against the footprint diameter (2 × radiusM in
 * packages/shared/src/structures.ts); SIG is the idle figure in docs/units.md.
 * Absent structures keep the procedural architecture bake in
 * structureTextures.ts.
 */
const STRUCTURES = [
  { slug: 'bastion', model: 'bastion-bathyarch.glb', lengthM: 440, sig: 35 },
  { slug: 'refinery', model: 'refinery-bathyarch.glb', lengthM: 280, sig: 65 },
  { slug: 'foundry', model: 'foundry-bathyarch.glb', lengthM: 320, sig: 25 },
  { slug: 'sentinel-turret', model: 'sentinel-turret-bathyarch.glb', lengthM: 120, sig: 12 },
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
