#!/usr/bin/env node
/**
 * The repository's own `.claude/` prose, linted and link-checked.
 *
 * `docs/` has had both gates since the beginning; `.claude/` has had neither,
 * and #748 is what that cost. `AGENTIC-LOOP.md` claimed `docs/invariants.md`
 * held "14 rows over 13 test files" while `npm run check:invariants` printed
 * thirty and sixty-four — and #747 had corrected the same figure further down
 * that same file, without touching the copy in the table. `CLAUDE.md` already states the rule that was broken:
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
 * issue numbers — "#709 has no clause for this" — seven times across five of
 * them (`npx -y markdownlint-cli --config .markdownlint.json $(node
 * tools/claude-docs/check.mjs --list)`), and markdownlint reads every one as a
 * heading missing its space. They
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
import { readdirSync, readFileSync } from 'node:fs';
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
 * Tracked files matching `pathspecs`, or null if git failed.
 *
 * The `:(glob)` magic is load-bearing everywhere it is used below, and is the
 * same trap `tools/gates.mjs` documents: git pathspecs are fnmatch without
 * FNM_PATHNAME, so a bare `.claude/**\/*.md` matches nothing nested and a gate
 * built on it silently checks zero files.
 */
function gitLs(pathspecs) {
  const listed = spawnSync('git', ['ls-files', '-z', ...pathspecs], { cwd: repo, encoding: 'utf8' });
  if (listed.status !== 0) {
    process.stderr.write(listed.stderr ?? '');
    return null;
  }
  return listed.stdout.split('\0').filter(Boolean);
}

/**
 * The repo-authored markdown under `.claude/`, from git rather than from a
 * directory walk, so an untracked scratch file is not linted.
 */
const IN_SCOPE = [
  ':(glob).claude/*.md',
  ':(glob).claude/agents/**/*.md',
  ':(glob).claude/skill-eval/**/*.md',
  ...REPO_AUTHORED_SKILLS.map((name) => `:(glob).claude/skills/${name}/**/*.md`),
];

/**
 * Every tracked document under `.claude/` is either linted or deliberately
 * vendored, and nothing falls between.
 *
 * `classifySkills` makes this argument for the directories under
 * `.claude/skills/`; this makes it for the documents, which is the half that was
 * missing. The pathspecs above name four places — the root, `agents/`,
 * `skill-eval/` and the six skills — so a repo-authored file in a *fifth*
 * top-level directory was matched by neither list and was silently ungated. It
 * lints nothing, reports nothing and exits 0, which is "quietly outside the
 * glob": the exact defect #748 reported, reproduced by the gate written to end
 * it. Found by `loop-critic` on this change's first round.
 */
function unaccountedDocs(inScope) {
  const all = gitLs([':(glob).claude/*.md', ':(glob).claude/**/*.md']);
  const vendored = gitLs(VENDORED_SKILLS.map((name) => `:(glob).claude/skills/${name}/**/*.md`));
  if (all === null || vendored === null) return null;

  const accounted = new Set([...inScope, ...vendored]);
  return all.filter((file) => !accounted.has(file));
}

/**
 * `VENDORED_SKILLS` above says the same thing as the `## What is here` table in
 * `.claude/VENDORED-SKILLS.md`, and this is what stops the two drifting.
 *
 * The array stays the list the gate acts on — prose cannot be trusted to drive a
 * gate, and a list parsed from it would inherit its errors. But a second copy of
 * a table that is already machine-readable is the thing `CLAUDE.md` says belongs
 * in one place, so the copy is checked rather than trusted. If the table is ever
 * reformatted this fails loudly, which is the right direction.
 */
function vendoredTableAgrees() {
  const doc = readFileSync(resolve(repo, '.claude/VENDORED-SKILLS.md'), 'utf8');
  // Bounded at the next heading: a future table under a later section would
  // otherwise be read as vendored skills.
  const section = doc.slice(doc.indexOf('## What is here')).split(/\n## /)[0];
  const rows = [...section.matchAll(/^\|\s*`([^`]+)`[^|]*\|/gm)].map((m) => m[1]);
  const listed = rows.map((cell) => cell.split(' ')[0]).sort();
  const expected = [...VENDORED_SKILLS].sort();

  if (listed.length === 0) {
    return ["Parsed no rows from .claude/VENDORED-SKILLS.md '## What is here' — the table moved."];
  }
  if (listed.join(',') !== expected.join(',')) {
    return [
      "VENDORED_SKILLS and .claude/VENDORED-SKILLS.md '## What is here' disagree.\n" +
        `  table: ${listed.join(', ')}\n` +
        `  array: ${expected.join(', ')}`,
    ];
  }
  return [];
}

const problems = [...classifySkills(), ...vendoredTableAgrees()];
if (problems.length > 0) {
  for (const problem of problems) process.stderr.write(`${problem}\n`);
  process.exit(1);
}

const files = gitLs(IN_SCOPE);
if (files === null) process.exit(1);
if (files.length === 0) {
  process.stderr.write('No documents matched under .claude/ — the pathspecs are wrong.\n');
  process.exit(1);
}

const unaccounted = unaccountedDocs(files);
if (unaccounted === null) process.exit(1);
if (unaccounted.length > 0) {
  process.stderr.write(
    `Tracked under .claude/ but neither linted nor vendored:\n${unaccounted.map((f) => `  ${f}`).join('\n')}\n` +
      'Add the directory to IN_SCOPE in tools/claude-docs/check.mjs, or classify its skill.\n'
  );
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
