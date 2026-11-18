import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkDependencies, satisfies } from '../preflight.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}

/** A root with one workspace, and the installed copies named in `installed`. */
function fixture({ rootDeps = {}, appDeps = {}, installed = {} }) {
  const dir = mkdtempSync(join(tmpdir(), 'preflight-'));
  writeJson(join(dir, 'package.json'), {
    name: 'root',
    workspaces: ['packages/app'],
    devDependencies: rootDeps,
  });
  writeJson(join(dir, 'packages/app/package.json'), { name: '@x/app', dependencies: appDeps });
  for (const [where, version] of Object.entries(installed)) {
    writeJson(join(dir, where, 'package.json'), { version });
  }
  return dir;
}

describe('satisfies', () => {
  it('fixes the leftmost non-zero part of a caret range, as npm does', () => {
    assert.equal(satisfies('8.4.1', '^8.0.0'), true);
    assert.equal(satisfies('9.0.0', '^8.0.0'), false);
    assert.equal(satisfies('7.9.9', '^8.0.0'), false);
    assert.equal(satisfies('0.187.3', '^0.187.0'), true);
    assert.equal(satisfies('0.188.0', '^0.187.0'), false);
    assert.equal(satisfies('0.169.0', '^0.187.0'), false);
    assert.equal(satisfies('0.0.4', '^0.0.4'), true);
    assert.equal(satisfies('0.0.5', '^0.0.4'), false);
  });

  it('reads an exact version and the wildcard', () => {
    assert.equal(satisfies('0.169.0', '0.169.0'), true);
    assert.equal(satisfies('0.169.1', '0.169.0'), false);
    assert.equal(satisfies('0.0.1', '*'), true);
  });

  it('admits a prerelease only to the exact range that names it', () => {
    assert.equal(satisfies('8.1.0-rc.1', '^8.0.0'), false);
    assert.equal(satisfies('8.1.0-rc.1', '8.1.0-rc.1'), true);
    assert.equal(satisfies('8.1.0-rc.1', '8.1.0'), false);
  });

  it('ignores build metadata', () => {
    assert.equal(satisfies('1.2.3+abc', '^1.2.0'), true);
  });

  it('returns null for a form it does not read, rather than guessing', () => {
    for (const range of ['~1.2.3', '>=1.0.0', '^1.2', '1.x', '1.0.0 || 2.0.0', 'file:../x']) {
      assert.equal(satisfies('1.2.3', range), null, range);
    }
  });
});

describe('checkDependencies', () => {
  it('fails a workspace whose own copy is gone and the root pins another (#1828)', () => {
    const dir = fixture({
      rootDeps: { three: '0.169.0' },
      appDeps: { three: '^0.187.0' },
      installed: { 'node_modules/three': '0.169.0' },
    });
    try {
      const { missing, outOfRange } = checkDependencies(dir);
      assert.deepEqual(missing, []);
      assert.deepEqual(outOfRange, ['three 0.169.0, wants ^0.187.0  (@x/app)']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes when the workspace keeps its own copy beside the root one', () => {
    const dir = fixture({
      rootDeps: { three: '0.169.0' },
      appDeps: { three: '^0.187.0' },
      installed: {
        'node_modules/three': '0.169.0',
        'packages/app/node_modules/three': '0.187.0',
      },
    });
    try {
      assert.deepEqual(checkDependencies(dir), { missing: [], outOfRange: [], unreadable: [] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('still reports a declared package that is nowhere on the walk', () => {
    const dir = fixture({ appDeps: { react: '^18.3.1' } });
    try {
      assert.deepEqual(checkDependencies(dir).missing, ['react  (@x/app)']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports a manifest that does not parse as not installed, not as a throw', () => {
    const dir = fixture({ appDeps: { react: '^18.3.1' } });
    try {
      const manifest = join(dir, 'node_modules/react/package.json');
      mkdirSync(dirname(manifest), { recursive: true });
      writeFileSync(manifest, '{"version": "18.3');
      assert.deepEqual(checkDependencies(dir).missing, [
        'react  (@x/app; its package.json does not parse)',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads every range this repository declares', () => {
    // An unreadable range is checked for presence alone, so a new form landing
    // here would quietly drop out of the range check: extend `satisfies` instead.
    assert.deepEqual(checkDependencies(repo).unreadable, []);
  });
});
