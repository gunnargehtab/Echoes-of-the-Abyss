import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  candidatePaths,
  globToRegExp,
  ignoreQueries,
  makeResolver,
  unresolvedPaths,
  unusedAllowances,
} from '../lib/paths.mjs';

test('a backticked repository path is a candidate', () => {
  assert.deepEqual(candidatePaths('See `packages/shared/src/constants.ts` for the number.'), [
    'packages/shared/src/constants.ts',
  ]);
  assert.deepEqual(candidatePaths('`docs/` is the design bible.'), ['docs/']);
});

test('backticks that are not repository paths are left alone', () => {
  // The five prefixes are the whole rule. A type name, a command, a constant
  // and a root file are all backticked constantly and none of them is a path
  // this gate can settle.
  assert.deepEqual(candidatePaths('`Match` runs `npm run gates` against `SIM.TICK_HZ`.'), []);
  assert.deepEqual(candidatePaths('`README.md` and `dist/` sit at the root.'), []);
});

test('a span is deduplicated and kept in source order', () => {
  const found = candidatePaths('`tools/a.mjs` then `docs/b.md` then `tools/a.mjs` again');
  assert.deepEqual(found, ['tools/a.mjs', 'docs/b.md']);
});

test('a command whose first word is a path resolves on that word', () => {
  // `tools/gates.mjs --only=docs:lint` is one span. Reading the whole of it
  // looks for a filename with a space in it and reports a miss that is not one.
  assert.deepEqual(candidatePaths('Run `tools/gates.mjs --only=docs:lint` while iterating.'), [
    'tools/gates.mjs',
  ]);
});

test('a line citation is not part of the filename', () => {
  assert.deepEqual(candidatePaths('`packages/frontend/src/game/EchoRenderer.ts:279` draws it.'), [
    'packages/frontend/src/game/EchoRenderer.ts',
  ]);
  assert.deepEqual(candidatePaths('`docs/economy.md:12-18` says so.'), ['docs/economy.md']);
});

test('angle brackets mean a template, not a path', () => {
  // Six such spans exist under .claude/. None is meant to exist, and one rule
  // is cheaper than six declared exemptions.
  assert.deepEqual(candidatePaths('Capture into `docs/screenshots/issue-<n>/`.'), []);
  assert.deepEqual(candidatePaths('`docs/mission-<name>.md`, beat by beat'), []);
});

test('a fenced block is a command, not a claim about the tree', () => {
  const body = 'Run it:\n\n```bash\nnode tools/echo-sim/sim.js `docs/nope.md`\n```\n\nThen `docs/yes.md`.';
  assert.deepEqual(candidatePaths(body), ['docs/yes.md']);
});

test('globToRegExp distinguishes one segment from many', () => {
  assert.ok(globToRegExp('packages/*/Dockerfile').test('packages/backend/Dockerfile'));
  assert.ok(!globToRegExp('packages/*/Dockerfile').test('packages/a/b/Dockerfile'));
  assert.ok(globToRegExp('packages/**').test('packages/a/b/c.ts'));
  assert.ok(globToRegExp('tools/**/*.{js,json}').test('tools/echo-sim/sim.js'));
  assert.ok(globToRegExp('tools/**/*.{js,json}').test('tools/a/b/package.json'));
  assert.ok(!globToRegExp('tools/**/*.{js,json}').test('tools/echo-sim/sim.mjs'));
});

test('a glob that matches nothing does not resolve', () => {
  // The reason globs are expanded rather than skipped: skipping would let a
  // pattern naming files that no longer exist pass unread.
  const resolves = makeResolver(['packages/backend/Dockerfile']);
  assert.ok(resolves('packages/*/Dockerfile'));
  assert.ok(!resolves('packages/*/Containerfile'));
});

test('a directory resolves through the files tracked inside it', () => {
  const resolves = makeResolver(['tools/balance/run.mjs', 'docs/economy.md']);
  assert.ok(resolves('tools/balance'));
  assert.ok(resolves('tools/balance/'));
  assert.ok(resolves('docs/economy.md'));
  assert.ok(!resolves('tools/balance/baselines'));
});

test('a generated path resolves, and an absent one does not', () => {
  // packages/shared/dist is gitignored, real, and the subject of CLAUDE.md's
  // build-order section. Tracking cannot see it and existsSync would answer
  // differently before and after a build.
  const resolves = makeResolver(['packages/shared/src/index.ts'], new Set(['packages/shared/dist']));
  assert.ok(resolves('packages/shared/dist'));
  assert.ok(resolves('packages/shared/dist/'));
  assert.ok(!resolves('packages/shared/build'));
});

test('a broken path is reported with the file that names it', () => {
  const resolves = makeResolver(['docs/economy.md']);
  const documents = [
    { file: 'CLAUDE.md', text: 'Read `docs/economy.md` and then `docs/gone.md`.' },
    { file: 'CONTRIBUTING.md', text: 'All fine: `docs/economy.md`.' },
  ];
  assert.deepEqual(unresolvedPaths(documents, resolves), [
    { file: 'CLAUDE.md', path: 'docs/gone.md' },
  ]);
});

test('a declared absence is not a failure', () => {
  const resolves = makeResolver([]);
  const documents = [{ file: 'CLAUDE.md', text: 'A probe for `.github/pull_request_template.md` finds nothing.' }];
  assert.deepEqual(unresolvedPaths(documents, resolves), [
    { file: 'CLAUDE.md', path: '.github/pull_request_template.md' },
  ]);
  const allowed = new Set(['.github/pull_request_template.md']);
  assert.deepEqual(unresolvedPaths(documents, resolves, allowed), []);
});

test('an exemption outliving its sentence is reported', () => {
  // A stale escape reads as a live one and widens the gate silently, which is
  // classifySkills' "listed skill not on disk" check one level down.
  const documents = [{ file: 'CLAUDE.md', text: 'Nothing here names it.' }];
  assert.deepEqual(unusedAllowances(documents, new Set(['docs/old-escape.md'])), [
    'docs/old-escape.md',
  ]);
  const naming = [{ file: 'CLAUDE.md', text: 'It names `docs/old-escape.md` still.' }];
  assert.deepEqual(unusedAllowances(naming, new Set(['docs/old-escape.md'])), []);
});

test('a gitignore query asks for the directory form too', () => {
  // This is the assertion CI bought. `dist/` is a directory-only rule, and git
  // matches a bare path against one only when the directory is on disk to be
  // seen as one — so `packages/shared/dist` read as generated on a machine that
  // had built shared and as missing in CI's docs job, which builds nothing.
  // The trailing slash answers without consulting the filesystem.
  assert.deepEqual(ignoreQueries(['packages/shared/dist']), [
    'packages/shared/dist',
    'packages/shared/dist/',
  ]);
  // The bare form is still asked, because a file rule needs it.
  assert.ok(ignoreQueries(['tools/x.log']).includes('tools/x.log'));
  // A path already carrying a slash is not asked for twice.
  assert.deepEqual(ignoreQueries(['docs/a/', 'docs/a']), ['docs/a', 'docs/a/']);
});
