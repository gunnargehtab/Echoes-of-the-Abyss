#!/usr/bin/env node
/**
 * The prose this repository wrote about itself, linted, link-checked, and held
 * to the paths it names.
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
 * **It checks relative links only.** The external URLs in these files are a
 * marketplace index, one upstream repository and one of this repository's own
 * issues — `VENDORED-SKILLS.md` records each copy's upstream as a backticked
 * slug rather than a link, so there is barely anything here to resolve. A
 * marketplace that reorganises its paths should not redden a local
 * `npm run gates`, and this repository's own github.com URLs 404 unauthenticated,
 * which `.markdown-link-check.json` already records for `docs/`.
 * What the gate is actually for is the link between two of these files, which
 * goes stale the moment a skill is renamed and which nothing else reads.
 * `.claude/.markdown-link-check.json` is where that scoping is declared.
 *
 * **MD018 is off, and that costs something.** These files open paragraphs with
 * issue numbers — "#709 has no clause for this" — seven times across five of
 * them (`npx -y markdownlint-cli --config .markdownlint.json $(node
 * tools/claude-docs/check.mjs --list | grep '^.claude/')`), and markdownlint
 * reads every one as a heading missing its space. They
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
 * **The root engineering docs are here too, since #795.** `CLAUDE.md`,
 * `CONTRIBUTING.md` and `.github/copilot-instructions.md` are the same kind of
 * file as the ones under `.claude/` — prose this repository wrote about its own
 * tree — and they were outside `docs:lint`, `docs:links` and this gate alike.
 * `CLAUDE.md` passed markdownlint by luck rather than by anything holding it
 * there. They are listed from git by a pathspec that also picks up a nested
 * `CLAUDE.md`, which is why #791's three nested files needed no edit here.
 *
 * They lint under the **root** config rather than `.claude/`'s: none of the
 * three opens a paragraph with an issue number, so none needs MD018 turned off,
 * and a gate should not weaken a rule for files that pass it. The link check is
 * shared, and it is the relative-only one for a reason that now holds twice
 * over — these three name no external URL at all, so checking only what is
 * local costs nothing and keeps the gate offline.
 *
 * **The paths are checked as well as the links**, which is the half a link
 * checker cannot see: prose names a file in backticks far more often than it
 * links one, and `packages/backend/src/sim/match.ts` in a sentence goes stale
 * exactly as a link does while rendering perfectly. `lib/paths.mjs` holds the
 * extraction rules and the reasoning behind each. The check runs over every
 * gated document, `.claude/` included, because the rule is about prose naming
 * the tree and both scopes are that.
 *
 *   node tools/claude-docs/check.mjs [--list]
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { spawn } from '../lib/spawn.mjs';
import { makeResolver, unresolvedPaths, unusedAllowances } from './lib/paths.mjs';

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
 * The root engineering prose, as git pathspecs.
 *
 * A `**` pathspec rather than a literal `CLAUDE.md` so that a nested file is
 * gated the day it lands rather than the day somebody remembers this list —
 * which is how #791's three arrived gated. The `:(glob)` magic is as
 * load-bearing here as it is in `IN_SCOPE` below.
 */
const ROOT_DOCS = [
  ':(glob)**/CLAUDE.md',
  ':(glob)CONTRIBUTING.md',
  ':(glob).github/copilot-instructions.md',
];

/**
 * Backticked paths that are absent on purpose, and why.
 *
 * Each entry is a claim that a sentence means to name something the tree does
 * not have. Both of the current two would otherwise be reported, and neither is
 * a defect — which is exactly why they are declared here, in the gate, where a
 * reviewer sees them, rather than escaped invisibly at the site.
 *
 * An entry no document names any more is an error, per `unusedAllowances`: a
 * stale exemption reads as a live one and widens the gate silently.
 */
const DECLARED_ABSENT = new Map([
  [
    '.github/pull_request_template.md',
    'CLAUDE.md names this spelling in order to say it does NOT exist — a probe for it finds nothing, which is the point of the sentence. The template is .github/PULL_REQUEST_TEMPLATE.md.',
  ],
  [
    'docs/bestiary-drift-health',
    'CONTRIBUTING.md gives this as an example branch name, beside feat/harvest-throttle. The docs/ prefix is a branch prefix here, not a directory.',
  ],
]);

/**
 * Backticked paths that exist only after a build, and why.
 *
 * The second escape hatch, declared for the same reason as the first. This was
 * `git check-ignore` at first — ask git whether a path is ignored, and treat
 * ignored as generated — and that was wrong twice over. It is disk-dependent:
 * `.gitignore` line 10 is `dist/`, a directory-only rule, and git matches a
 * bare path against one only when the directory is there to be seen as a
 * directory, so `packages/shared/dist` read as generated on a machine that had
 * built shared and as missing in CI's `docs` job, which builds nothing. That
 * turned #813 red on its first push. And it was unbounded: every ignore rule in
 * this repository is unanchored, so `docs/build/anything.md` or
 * `packages/backend/node_modules/anything` would have resolved too — prose
 * naming a build output the build does not emit would have passed unread.
 *
 * Two live spans need it and they are spelled differently — `run-game` writes
 * it bare, `steward` with a trailing slash — so ONE entry answers for both,
 * because every comparison against this map strips the slash from both sides
 * (`stripSlash` in lib/paths.mjs). One entry, declared, reviewed, and expiring
 * itself through `unusedAllowances` exactly as `DECLARED_ABSENT` does. This
 * comment said "two entries" against a map that has had one since it was
 * written (#817).
 */
const DECLARED_GENERATED = new Map([
  [
    'packages/shared/dist',
    'The build output @echoes/shared is imported by, and the subject of CLAUDE.md § Build order. Named by run-game and steward. Real, and absent from git by design.',
  ],
]);

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

const rootFiles = gitLs(ROOT_DOCS);
if (rootFiles === null) process.exit(1);
// A pathspec set that matches nothing lints nothing and exits 0, which is the
// silent pass this gate exists to refuse. Membership rather than a count: the
// `**` pathspec brought #791's nested files in, so a count of three no longer
// distinguishes "all three present" from "CONTRIBUTING.md gone, a nested file
// in its place".
const REQUIRED_ROOT_DOCS = ['CLAUDE.md', 'CONTRIBUTING.md', '.github/copilot-instructions.md'];
const missingRoot = REQUIRED_ROOT_DOCS.filter((file) => !rootFiles.includes(file));
if (missingRoot.length > 0) {
  process.stderr.write(
    `Root engineering document(s) not matched: ${missingRoot.join(', ')}.\n` +
      'One was renamed or removed — fix ROOT_DOCS in tools/claude-docs/check.mjs.\n'
  );
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

const gated = [...rootFiles, ...files];

if (process.argv.includes('--list')) {
  for (const file of gated) process.stdout.write(`${file}\n`);
  process.exit(0);
}

process.stdout.write(
  `${rootFiles.length} root document(s), ${files.length} repo-authored document(s) under .claude/\n`
);

const tracked = gitLs([]);
if (tracked === null) process.exit(1);
const documents = gated.map((file) => ({
  file,
  text: readFileSync(resolve(repo, file), 'utf8'),
}));

const allowed = new Set(DECLARED_ABSENT.keys());
const generated = new Set(DECLARED_GENERATED.keys());
const pathProblems = [];
const dead = unresolvedPaths(documents, makeResolver(tracked, generated), allowed);
if (dead.length > 0) {
  pathProblems.push(
    `Backticked repository path(s) that do not resolve:\n${dead
      .map(({ file, path }) => `  ${file}: ${path}`)
      .join('\n')}\n` +
      'Fix the sentence, or declare it in DECLARED_ABSENT in tools/claude-docs/check.mjs with the reason.'
  );
}
for (const [name, set] of [
  ['DECLARED_ABSENT', allowed],
  ['DECLARED_GENERATED', generated],
]) {
  const unused = unusedAllowances(documents, set);
  if (unused.length > 0) {
    pathProblems.push(
      `${name} entr(ies) no document names any more:\n${unused.map((p) => `  ${p}`).join('\n')}\n` +
        'Remove each from tools/claude-docs/check.mjs — a stale exemption widens the gate silently.'
    );
  }
}
if (pathProblems.length > 0) {
  for (const problem of pathProblems) process.stderr.write(`${problem}\n`);
  process.exit(1);
}

process.stdout.write('paths named in backticks: all resolve\n');

// Two lint runs, two configs: .claude/'s turns MD018 off for the register those
// files use, and the root three neither need that nor should get it.
const lintClaude = spawn(
  npx,
  ['-y', 'markdownlint-cli', '--config', '.claude/.markdownlint.json', ...files],
  { cwd: repo }
);
const lintRoot = spawn(
  npx,
  ['-y', 'markdownlint-cli', '--config', '.markdownlint.json', ...rootFiles],
  { cwd: repo }
);
const links = spawn(
  npx,
  ['-y', 'markdown-link-check', '--config', '.claude/.markdown-link-check.json', ...gated],
  { cwd: repo }
);

for (const [name, result] of [
  ['markdownlint (.claude/)', lintClaude],
  ['markdownlint (root)', lintRoot],
  ['markdown-link-check', links],
]) {
  if (result.error) process.stderr.write(`${name}: could not run: ${result.error.message}\n`);
}

const failed = [lintClaude, lintRoot, links].some((r) => r.status !== 0);
process.exit(failed ? 1 : 0);
