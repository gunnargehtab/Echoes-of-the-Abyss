/**
 * The build gate on the runtime model manifest (#624).
 *
 * The gate itself runs inside `vite build`, so CI's `build` job and the image
 * build both fail on an empty manifest rather than shipping one. What this file
 * holds is the arithmetic underneath it, which a passing build cannot
 * distinguish from a gate that is quietly asserting nothing:
 *
 *  - the expectation comes from the tables, so adding a model needs no edit here;
 *  - every expected file is actually on disk, so the repository's own art and its
 *    table agree;
 *  - an empty manifest is the loudest possible answer, never a sanctioned one;
 *  - and a GLB with no row stays quiet, because gate 1's unmodelled hulls must
 *    not be confused with art the build has lost (graphics-standards.md).
 *
 * Plain JS, and in `.mjs` on purpose: the module under test is the one the Vite
 * config loads, and the config tree is not part of the package's TypeScript
 * program.
 */

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { STRUCTURES, UNITS } from '../../../tools/hull-maps/models.mjs';
import { ENVIRONMENT_PROPS } from '../src/game/environment.ts';
import {
  emittedModelFiles,
  expectedModelFiles,
  missingModelFiles,
} from '../vite/modelManifest.mjs';

const MODELS_DIR = fileURLToPath(new URL('../../../docs/concept-art/models/', import.meta.url));

describe('the model manifest gate: what the build must carry', () => {
  it('expects one file per row of the tables that define the roster', () => {
    const expected = expectedModelFiles();
    assert.equal(expected.length, UNITS.length + STRUCTURES.length + ENVIRONMENT_PROPS.length);
    assert.equal(new Set(expected).size, expected.length, 'and no row is counted twice');
  });

  it('expects nothing the repository does not actually hold', () => {
    const absent = expectedModelFiles().filter((file) => !existsSync(MODELS_DIR + file));
    assert.deepEqual(absent, [], 'a row whose GLB is not committed');
  });
});

describe('the model manifest gate: what it calls a failure', () => {
  it('calls an empty manifest a total loss rather than a fallback', () => {
    assert.deepEqual(missingModelFiles([]), expectedModelFiles());
  });

  it('passes a manifest that carries every row', () => {
    assert.deepEqual(missingModelFiles(expectedModelFiles()), []);
  });

  it('names the one file that went missing, and only it', () => {
    const expected = expectedModelFiles();
    const carried = expected.filter((file) => file !== 'env-kelp-cluster.glb');
    assert.deepEqual(missingModelFiles(carried, expected), ['env-kelp-cluster.glb']);
  });

  /**
   * Gate 1's sanctioned state. A hull with no approved model has no row, so it
   * is never expected; an approved GLB that has landed ahead of its wiring has a
   * file and no row, and is equally not this gate's business.
   */
  it('says nothing about a model the tables do not claim', () => {
    const expected = expectedModelFiles();
    assert.deepEqual(missingModelFiles([...expected, 'unmodelled-hull.glb'], expected), []);
  });
});

describe('the model manifest gate: reading a built bundle', () => {
  it('reads the authored name off a fingerprinted asset, and ignores the rest', () => {
    const bundle = {
      'assets/index-DEADBEEF.js': { type: 'chunk', fileName: 'assets/index-DEADBEEF.js' },
      'assets/corvette-pelagia-B1uE.glb': {
        type: 'asset',
        fileName: 'assets/corvette-pelagia-B1uE.glb',
        name: 'corvette-pelagia.glb',
        originalFileName: 'docs/concept-art/models/corvette-pelagia.glb',
      },
      'assets/hull-CAFE.png': {
        type: 'asset',
        fileName: 'assets/hull-CAFE.png',
        name: 'hull.png',
        originalFileName: 'packages/frontend/src/assets/hull.png',
      },
    };
    assert.deepEqual(emittedModelFiles(bundle), ['corvette-pelagia.glb']);
  });

  it('falls back to the emitted name when rollup reports no source path', () => {
    const bundle = {
      'assets/tender-bathyarch-9xQ.glb': {
        type: 'asset',
        fileName: 'assets/tender-bathyarch-9xQ.glb',
        name: 'tender-bathyarch.glb',
        originalFileName: null,
      },
    };
    assert.deepEqual(emittedModelFiles(bundle), ['tender-bathyarch.glb']);
  });
});
