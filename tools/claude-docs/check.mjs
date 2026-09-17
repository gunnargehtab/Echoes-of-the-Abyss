#!/usr/bin/env node
/**
 * The repository's own `.claude/` prose, linted and link-checked.
 *
 * `docs/` has had both gates since the beginning; `.claude/` has had neither,
 * and #748 is what that cost. `AGENTIC-LOOP.md` claimed `docs/invariants.md`
 * held "14 rows over 13 test files" while `npm run check:invariants` printed
 * thirty and sixty-four — the same figure had been corrected one file away and
 * this copy was missed. `CLAUDE.md` already states the rule that was broken:
 * prose repeating what code does drifts, and a script makes the drift loud. It
 * is the argument `check:models` and `check:invariants` were built on, and
 * these files were simply outside every glob that enforces it.
 *
 * Two things this gate does that the `docs/` pair does not.
 *
 * **It lints only the files this repository wrote.** The eleven vendored skills
 * are upstream copies, read-only by `CLAUDE.md`'s rule, and reformatting them
 * would destroy the one property that makes a re-sync cheap — that the file on
 * disk is the file upstream published. They are also not merely untidy: this
 * version of markdownlint *crashes* on
 * `.claude/skills/colyseus/references/schema.md`, throwing out of MD023 rather
 * than reporting a violation, so a gate that swept all of `.claude/` would fail
 * on an internal error and stay failed until upstream changed.
 *
 * **It checks relative links only.** `VENDORED-SKILLS.md` records each copy's
 * upstream URL and commit, which is history rather than navigation — a
 * marketplace that reorganises its paths should not turn this gate red, and
 * pinging a dozen third parties on every local `npm run gates` buys nothing.
 * What the gate is actually for is the link between two of these files, which
 * goes stale the moment a skill is renamed and which nothing else reads.
 * `.claude/.markdown-link-check.json` is where that scoping is declared.
 *
 * **MD018 is off, and that costs something.** These files open paragraphs with
 * issue numbers — "#709 has no clause for this" — seven times across four of
 * them, and markdownlint reads every one as a heading missing its space. They
 * are false positives: CommonMark needs a space after the hash, so GitHub
 * renders all seven as the paragraphs they are. The price of turning the rule
 * off is measured rather than assumed: a genuinely malformed `##Heading` now
 * passes this gate, where the root config catches it. That was judged the
 * cheaper side. The alternative is an inline disable at each site, which taxes
 * a register these files use constantly and which the next author will not know
 * to add — so the gate would start failing for a reason that is not a defect.
 * A malformed heading also renders visibly wrong; a drifted number does not,
 * and drifted numbers are what this gate is for. MD022, MD023 and MD025 still
 * hold heading structure.
 *
 * Adding a skill means classifying it below. That is deliberate friction: an
 * unclassified directory fails this gate rather than being quietly skipped,
 * because "quietly outside the glob" is the exact defect #748 reported.
 *
 *   node tools/claude-docs/check.mjs [--list]
 */

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { spawn } from '../lib/spawn.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const npx = 'npx';

/**
 * Written here, and linted. `.claude/VENDORED-SKILLS.md` is the prose record of
 * where each vendored copy came from; this is the list the gate acts on.
 */
const REPO_AUTHORED_SKILLS = [
  'balance-run',
  'dev-loop',
  'hull-intake',
  'run-game',
  'steward',
  'work-issue',
];

/**
 * Copied from a public marketplace, listed in `.claude/VENDORED-SKILLS.md`, and
 * out of scope for every rule in this file.
 */
const VENDORED_SKILLS = [
  'accessibility',
  'colyseus',
  'pixijs',
  'pixijs-performance',
  'pixijs-scene-graphics',
  'pixijs-scene-text',
  'pixijs-ticker',
  'threejs-geometry',
  'threejs-loaders',
  'threejs-materials',
  'threejs-postprocessing',
];

/**
 * Every skill on disk is in exactly one of the two lists above.
 *
 * A skill added to `.claude/skills/` and to neither list is the failure this
 * gate exists to prevent, so it is an error and not a warning — silently
 * ungated prose is how #748 happened. A list naming a skill that is gone is an
 * error for the same reason `check:invariants` fails on a holder that moved:
 * a list that describes a tree which no longer exists reads as authoritative.
 */
function classifySkills() {
  const onDisk = readdirSync(resolve(repo, '.claude/skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const known = new Set([...REPO_AUTHORED_SKILLS, ...VENDORED_SKILLS]);
  const unclassified = onDisk.filter((name) => !known.has(name));
  const missing = [...known].filter((name) => !onDisk.includes(name)).sort();

  const problems = [];
  if (unclassified.length > 0) {
    problems.push(
      `Unclassified skill(s) in .claude/skills/: ${unclassified.join(', ')}.\n` +
        'Add each to REPO_AUTHORED_SKILLS or VENDORED_SKILLS in tools/claude-docs/check.mjs.'
    );
  }
  if (missing.length > 0) {
    problems.push(
      `Listed skill(s) not on disk: ${missing.join(', ')}.\n` +
        'Remove each from tools/claude-docs/check.mjs.'
    );
  }
  return problems;
}

/**
 * The repo-authored markdown under `.claude/`, from git rather than from a
 * directory walk, so an untracked scratch file is not linted.
 *
 * The `:(glob)` magic is load-bearing and is the same trap `tools/gates.mjs`
 * documents: git pathspecs are fnmatch without FNM_PATHNAME, so a bare
 * `.claude/**\/*.md` matches nothing nested and the gate silently checks zero
 * files. The count is asserted below for exactly that reason.
 */
function repoAuthoredDocs() {
  const pathspecs = [
    ':(glob).claude/*.md',
    ':(glob).claude/agents/**/*.md',
    ':(glob).claude/skill-eval/**/*.md',
    ...REPO_AUTHORED_SKILLS.map((name) => `:(glob).claude/skills/${name}/**/*.md`),
  ];

  const listed = spawnSync('git', ['ls-files', '-z', ...pathspecs], {
    cwd: repo,
    encoding: 'utf8',
  });
  if (listed.status !== 0) {
    process.stderr.write(listed.stderr ?? '');
    return null;
  }
  return listed.stdout.split('\0').filter(Boolean);
}

const problems = classifySkills();
if (problems.length > 0) {
  for (const problem of problems) process.stderr.write(`${problem}\n`);
  process.exit(1);
}

const files = repoAuthoredDocs();
if (files === null) process.exit(1);
if (files.length === 0) {
  process.stderr.write('No documents matched under .claude/ — the pathspecs are wrong.\n');
  process.exit(1);
}

if (process.argv.includes('--list')) {
  for (const file of files) process.stdout.write(`${file}\n`);
  process.exit(0);
}

process.stdout.write(`${files.length} repo-authored document(s) under .claude/\n`);

const lint = spawn(npx, ['-y', 'markdownlint-cli', '--config', '.claude/.markdownlint.json', ...files], {
  cwd: repo,
});
const links = spawn(
  npx,
  ['-y', 'markdown-link-check', '--config', '.claude/.markdown-link-check.json', ...files],
  { cwd: repo }
);

for (const [name, result] of [
  ['markdownlint', lint],
  ['markdown-link-check', links],
]) {
  if (result.error) process.stderr.write(`${name}: could not run: ${result.error.message}\n`);
}

const failed = [lint, links].some((r) => r.status !== 0);
process.exit(failed ? 1 : 0);
