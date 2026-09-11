/**
 * The build gate on the runtime model manifest (#624).
 *
 * `rosterModels.ts` and `environmentModels.ts` reach the approved GLBs through
 * `import.meta.glob('../../../../docs/concept-art/models/*.glb')`. A glob whose
 * target directory is not in the build's reach resolves to `{}` and Vite says
 * nothing — which is how an image shipped with none of the 77 approved models
 * and nobody noticed: hulls fall back to the sprite, which is a *sanctioned*
 * register (graphics-standards.md gate 1), and environment props have no
 * fallback at all and simply vanish from the seabed.
 *
 * So the manifest is asserted rather than trusted, and against the table that
 * defines it rather than against a number typed in here: every `model` field of
 * `UNITS` + `STRUCTURES` in tools/hull-maps/models.mjs, plus one `env-<slug>.glb`
 * per row of `ENVIRONMENT_PROPS`. Adding a model updates the expectation by
 * adding its row, which is the same edit.
 *
 * The check is arithmetic on that table and on the emitted bundle — a count of
 * files, never a stopwatch — and it runs inside `vite build`, so it holds every
 * path that produces a shippable bundle: CI's `npm run build`, a hand build, and
 * the image build at packages/frontend/Dockerfile.
 *
 * What it deliberately does **not** say: a roster slug with no row in
 * `models.mjs` is gate 1's unmodelled state and stays quiet, and a GLB on disk
 * with no row is art that has landed ahead of its wiring. Only a row whose file
 * the client cannot see is a build that lost its art.
 */

import { STRUCTURES, UNITS } from '../../../tools/hull-maps/models.mjs';
import { ENVIRONMENT_PROPS } from '../src/game/environment.ts';

/**
 * Every GLB filename the built client must be able to reach, sorted.
 *
 * Arguments are injectable so a test can ask the question of a table it
 * controls; the defaults are the real ones.
 *
 * @param {{ model: string }[]} [units]
 * @param {{ model: string }[]} [structures]
 * @param {{ slug: string }[]} [props]
 * @returns {string[]}
 */
export function expectedModelFiles(
  units = UNITS,
  structures = STRUCTURES,
  props = ENVIRONMENT_PROPS
) {
  return [
    ...units.map((row) => row.model),
    ...structures.map((row) => row.model),
    ...props.map((row) => `${row.slug}.glb`),
  ].sort();
}

/**
 * The rows whose file the manifest does not carry, sorted. Empty means the
 * client can see every approved model.
 *
 * @param {Iterable<string>} manifest GLB filenames the bundle emitted.
 * @param {string[]} [expected]
 * @returns {string[]}
 */
export function missingModelFiles(manifest, expected = expectedModelFiles()) {
  const carried = new Set(manifest);
  return expected.filter((file) => !carried.has(file));
}

/**
 * Every GLB the bundle emitted, by the name it was authored under rather than
 * by its hashed output name.
 *
 * Rollup keeps both: `originalFileName` is the path the asset was read from and
 * `name` is what Vite asked it to be called. Either answers "which model is
 * this", and taking whichever is present keeps the gate off the fingerprint.
 *
 * @param {Record<string, { type: string, fileName: string, name?: string | null, originalFileName?: string | null }>} bundle
 * @returns {string[]}
 */
export function emittedModelFiles(bundle) {
  const files = [];
  for (const output of Object.values(bundle)) {
    if (output.type !== 'asset') continue;
    const source = output.originalFileName ?? output.name ?? output.fileName;
    if (!source.endsWith('.glb')) continue;
    files.push(source.slice(source.lastIndexOf('/') + 1));
  }
  return files;
}

/**
 * The plugin. Build only — `vite dev` serves the docs tree off disk and the
 * test suite runs with an empty manifest on purpose
 * (test/support/viteAssetHooks.mjs), so neither is a build that could ship.
 *
 * @returns {import('vite').Plugin}
 */
export function modelManifestGate() {
  return {
    name: 'echoes:model-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const emitted = emittedModelFiles(bundle);
      const expected = expectedModelFiles();
      const missing = missingModelFiles(emitted, expected);
      if (missing.length === 0) return;
      this.error(
        `the build carries ${emitted.length} of ${expected.length} approved models — ` +
          `${missing.length} missing.\n\n` +
          `Every one has a row in tools/hull-maps/models.mjs or in ENVIRONMENT_PROPS, so the\n` +
          `art exists and the build cannot see it. The usual cause is a build context that\n` +
          `does not carry docs/concept-art/models/ — see packages/frontend/Dockerfile and\n` +
          `.dockerignore. A missing model is not gate 1's unmodelled state: hulls would fall\n` +
          `back to the sprite and every environment prop would silently vanish.\n\n` +
          `Missing: ${missing.join(', ')}`
      );
    },
  };
}
