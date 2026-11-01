import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  BASELINE,
  BLOCKED_PATHS,
  DRAWN,
  OPEN,
  RULES,
  blockedHeadings,
  blockedPaths,
} from '../lib/rules.mjs';

const kinds = (paths) => blockedPaths(paths).map(({ path, entry }) => [path, entry.kind]);

test("each kind of change steward §9 keeps a person's is caught", () => {
  assert.deepEqual(
    kinds([
      'packages/frontend/src/App.css',
      'tools/hull-models/kit.mjs',
      'docs/concept-art/models/bulwark-tidewright.glb',
      'docs/screenshots/issue-1668/after-panel-clear-of-readout.png',
      'tools/balance/baselines/skirmish.json',
      '.claude/skills/steward/SKILL.md',
      '.github/workflows/ci.yml',
    ]),
    [
      ['packages/frontend/src/App.css', DRAWN],
      ['tools/hull-models/kit.mjs', DRAWN],
      ['docs/concept-art/models/bulwark-tidewright.glb', DRAWN],
      ['docs/screenshots/issue-1668/after-panel-clear-of-readout.png', DRAWN],
      ['tools/balance/baselines/skirmish.json', BASELINE],
      ['.claude/skills/steward/SKILL.md', RULES],
      ['.github/workflows/ci.yml', RULES],
    ]
  );
});

test('the guard is on its own list, so no pull request can loosen it unseen', () => {
  assert.deepEqual(kinds(['tools/automerge-guard/lib/rules.mjs']), [
    ['tools/automerge-guard/lib/rules.mjs', RULES],
  ]);
});

test('what the roadmap sync and a docs or backend change touch stays clear', () => {
  assert.deepEqual(
    blockedPaths([
      'docs/ROADMAP.md',
      'docs/world-atlas.md',
      'packages/backend/src/sim/match.ts',
      'packages/shared/src/constants.ts',
      'tools/balance/run.mjs',
      'tools/hull-maps/build.mjs',
      'tools/prose-budget/check.mjs',
    ]),
    []
  );
});

test('a prefix stops at its own directory', () => {
  assert.deepEqual(
    blockedPaths([
      'packages/frontend-notes.md',
      'docs/screenshots.md',
      '.githubx/config',
      '.claude-old/notes.md',
      'tools/balance/baselines.md',
    ]),
    []
  );
});

test('a model file is caught wherever it sits, in any case, and nothing else is', () => {
  assert.deepEqual(kinds(['scratch/X.GLB']), [['scratch/X.GLB', DRAWN]]);
  assert.deepEqual(blockedPaths(['docs/model.glb.md', 'docs/glb-notes.md']), []);
});

test('every entry is either a directory prefix or a suffix', () => {
  for (const entry of BLOCKED_PATHS) {
    const prefix = typeof entry.prefix === 'string' && entry.prefix.endsWith('/');
    const suffix = typeof entry.suffix === 'string' && entry.suffix.startsWith('.');
    assert.ok(prefix !== suffix, JSON.stringify(entry));
  }
});

test('both headings are caught at any level, in any case, singular or plural', () => {
  const body = [
    '## Problem',
    'Something.',
    '## Open findings',
    '- one',
    '### screenshots',
    '#### Screenshot (links)',
    '  ## Open finding',
  ].join('\n');
  assert.deepEqual(
    blockedHeadings(body).map(({ line, entry }) => [line, entry.kind]),
    [
      ['## Open findings', OPEN],
      ['### screenshots', DRAWN],
      ['#### Screenshot (links)', DRAWN],
      ['## Open finding', OPEN],
    ]
  );
});

test('a heading written on Windows line endings is still a heading', () => {
  assert.equal(blockedHeadings('## Solution\r\nDone.\r\n## Screenshots\r\nA link.').length, 1);
});

test('only a heading counts: a mention, an indented block or a longer word does not', () => {
  const body = [
    'Nothing under `## Screenshots` here, and no open findings.',
    '    ## Screenshots',
    '##Screenshots',
    '## Screenshotsmith',
    '## Options',
  ].join('\n');
  assert.deepEqual(blockedHeadings(body), []);
});

test('the unedited pull request template is clear, though its comment names both', () => {
  const template = readFileSync(
    new URL('../../../.github/PULL_REQUEST_TEMPLATE.md', import.meta.url),
    'utf8'
  );
  assert.match(template, /## Open findings/);
  assert.match(template, /## Screenshots/);
  assert.deepEqual(blockedHeadings(template), []);
});

test('an empty or missing body has no headings', () => {
  assert.deepEqual(blockedHeadings(''), []);
  assert.deepEqual(blockedHeadings(undefined), []);
});
