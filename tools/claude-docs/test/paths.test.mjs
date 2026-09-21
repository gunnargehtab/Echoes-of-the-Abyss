import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  candidatePaths,
  globToRegExp,
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

test('every token of a span is read, not just the first', () => {
  // `tools/gates.mjs --only=docs:lint` is one span, and reading the whole of it
  // looks for a filename with a space in it. Reading only the FIRST token is
  // the opposite error: a command names its path second far more often than
  // first, and that left seven live paths in this repository unchecked.
  assert.deepEqual(candidatePaths('Run `tools/gates.mjs --only=docs:lint` while iterating.'), [
    'tools/gates.mjs',
  ]);
  assert.deepEqual(candidatePaths('Run `node tools/hull-models/parts.mjs` on it.'), [
    'tools/hull-models/parts.mjs',
  ]);
  assert.deepEqual(candidatePaths('`npm -w packages/backend run dev` starts it.'), [
    'packages/backend',
  ]);
});

test('a span may wrap mid-path', () => {
  // These files are authored at 100 columns, so a backticked span wrapping
  // mid-path is routine. A regex stopping at the newline could not match one:
  // it paired that span's closing backtick with the next opening one and read
  // the prose between as code. That hid `packages/frontend` in CLAUDE.md.
  assert.deepEqual(
    candidatePaths('A wrapped `span across\nlines` and then `docs/yes.md` is named.'),
    ['docs/yes.md']
  );
});

test('a stray backtick costs the spans after it nothing', () => {
  // The bound has to terminate the span rather than filter the match. #813
  // filtered, and the discarded match had already consumed its backticks, so
  // one unpaired backtick re-paired every span after it and the extractor read
  // the gaps between spans as code. The assertion here used to be `[]` — the
  // bug, written down as the expectation — and it passed with the filter
  // deleted, so it pinned nothing. #817.
  assert.deepEqual(candidatePaths('stray ` backtick\n\nlater `docs/x.md` here'), ['docs/x.md']);
  assert.deepEqual(
    candidatePaths('stray ` here\n\n`docs/a.md`, then `docs/b.md` and `docs/c.md`.'),
    ['docs/a.md', 'docs/b.md', 'docs/c.md']
  );
  // A line of spaces is still a blank line, so it still ends a span.
  assert.deepEqual(candidatePaths('stray `\n \n`docs/d.md` here'), ['docs/d.md']);
  // The bound itself, unchanged: a span cannot contain a blank line, so the
  // prose across one is not read as code.
  assert.deepEqual(candidatePaths('`docs/no.md is prose\n\nnot a span` here'), []);
});

test('an indented fence is still a fence', () => {
  // The three real indented fences in the gated set sit in a list item at two
  // and three spaces — CONTRIBUTING.md:103 is one. Anchoring the pattern at
  // column zero left all three unseen, so their contents were read as prose.
  //
  // The body here holds NO backtick, and that is what makes the assertion
  // discriminate. An unstripped fence's own delimiters pair around a
  // backticked body and swallow it, so a fence holding `docs/nope.md` answers
  // the same either way and pins nothing — which is what this test did until
  // #817, against a bound that had been right since #813.
  const bare = 'Text:\n\n  ```bash\n  rm docs/nope.md\n  ```\n\nThen `docs/yes.md`.';
  assert.deepEqual(candidatePaths(bare), ['docs/yes.md']);
  // The backticked shape too, since a fence usually does hold one.
  const quoted = 'Text:\n\n  ```bash\n  rm `docs/nope.md`\n  ```\n\nThen `docs/yes.md`.';
  assert.deepEqual(candidatePaths(quoted), ['docs/yes.md']);
});

test('trailing punctuation inside a span is trimmed', () => {
  // The defensive normalisation. No live span needs it — all twenty-three gated
  // documents extract identically with it and without — so it is pinned here
  // rather than left as an untested claim in a comment.
  assert.deepEqual(candidatePaths('Read `docs/a.md, docs/b.md` in order.'), [
    'docs/a.md',
    'docs/b.md',
  ]);
  // Trailing only. A leading bracket is not trimmed, so such a token simply
  // fails the prefix test and is not read as a path — stated here so the
  // asymmetry is a decision on the record rather than a surprise.
  assert.deepEqual(candidatePaths('`(docs/c.md)` is cited.'), []);
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

test('a declared build output resolves, and an absent one does not', () => {
  // packages/shared/dist is real, is the subject of CLAUDE.md's build-order
  // section, and is absent from git by design. It is declared rather than
  // detected: asking git whether a path is ignored is disk-dependent for a
  // directory-only rule, and unbounded besides.
  const resolves = makeResolver(['packages/shared/src/index.ts'], new Set(['packages/shared/dist']));
  assert.ok(resolves('packages/shared/dist'));
  assert.ok(resolves('packages/shared/dist/'));
  assert.ok(!resolves('packages/shared/build'));
});

test('a declared entry answers for both spellings, whichever way it is written', () => {
  // The two live spans naming this build output disagree: run-game writes it
  // bare and steward with a trailing slash. One entry answers for both only if
  // the slash is stripped from the DECLARED side too. It was stripped from the
  // named side alone, so an entry written with a slash answered for neither
  // spelling — failing closed, which is why nothing caught it. #817.
  const declaredWithSlash = makeResolver([], new Set(['packages/shared/dist/']));
  assert.ok(declaredWithSlash('packages/shared/dist'));
  assert.ok(declaredWithSlash('packages/shared/dist/'));

  const documents = [{ file: 'a.md', text: 'It names `docs/gone/` with a slash.' }];
  const resolves = makeResolver([]);
  assert.deepEqual(unresolvedPaths(documents, resolves, new Set(['docs/gone'])), []);
  assert.deepEqual(unresolvedPaths(documents, resolves, new Set(['docs/gone/'])), []);
  // Still fails closed on a path nothing declares.
  assert.deepEqual(unresolvedPaths(documents, resolves, new Set(['docs/other'])), [
    { file: 'a.md', path: 'docs/gone/' },
  ]);
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

test('an exemption is matched without its trailing slash', () => {
  // Two skills name the same build output, one with the slash and one without.
  // A single declared entry answers for both rather than reading as stale.
  const documents = [{ file: 'a.md', text: 'It names `packages/shared/dist/` only.' }];
  assert.deepEqual(unusedAllowances(documents, new Set(['packages/shared/dist'])), []);
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

