/**
 * Every blocking gate, in one command, in one pass.
 *
 * The gates themselves are not new — they are the jobs in
 * `.github/workflows/ci.yml`, and CONTRIBUTING.md has always listed the local
 * sequence. What was missing is a single exit code for "this branch would pass
 * CI", and the cost of not having one is drift: the list in CONTRIBUTING.md was
 * missing `check:models`, which CI has run since #540, so anyone following the
 * documented sequence was one gate short of the truth. A list of commands in
 * prose cannot be wrong loudly. A script can.
 *
 * Two decisions worth knowing:
 *
 * Failures do not stop the run. Fail-fast is right for CI, where four jobs run
 * in parallel and the first red one has already told you where to look; it is
 * wrong here, where the steps are sequential and a fail-fast run makes you pay
 * for lint twice to discover that the tests were also red. One pass reports
 * everything. `--bail` restores the other behaviour when you are iterating on a
 * single gate.
 *
 * Each step shells out to the same root script CI calls rather than to the
 * underlying workspace commands. That rebuilds `packages/shared` a few times
 * over (type-check, test and build each do it themselves), which costs seconds
 * and buys the thing this file exists for: there is no second description of
 * what a gate is, so there is nothing here to drift from CI.
 *
 *   node tools/gates.mjs [--only=a,b] [--skip=a,b] [--bail] [--list]
 */

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { spawn as spawnAt } from './lib/spawn.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = 'npm';
const npx = 'npx';

/**
 * Every gate runs from the repository root. `tools/lib/spawn.mjs` carries the
 * Windows reasoning — `npm` and `npx` are batch files there, and a batch file
 * spawned without a shell fails in a way spawnSync reports as `error` rather
 * than throwing, which used to make every gate FAIL in 0.0s with nothing
 * printed.
 */
const spawn = (command, commandArgs, options = {}) =>
  spawnAt(command, commandArgs, { cwd: repo, ...options });

/** An npm script, named for the step that runs it. */
const run = (script) => ({ command: npm, args: ['run', script] });

/**
 * The doc gates come from `npx -y`, not from node_modules, so they are the three
 * steps that need the network — `docs:claude` reaches the same two tools the
 * same way. They are also what CI runs in a job with no
 * install at all, which is why they are last here: everything before them is
 * answerable offline.
 */
const docsLint = {
  command: npx,
  args: ['-y', 'markdownlint-cli', 'docs/**/*.md', 'docs/*.md', '--ignore', 'node_modules'],
};

/**
 * CI spells this as `git ls-files -z | xargs -0 npx`. Here the file list is
 * gathered in-process and passed as arguments instead — same files, same single
 * invocation over all of them, without depending on a shell or on xargs. The
 * `:(glob)` pathspec is load-bearing: git pathspecs are fnmatch without
 * FNM_PATHNAME, so a bare docs/ double-star pattern matches nothing nested and
 * the gate silently checks zero files. The count is asserted below for exactly
 * that reason — a gate that checks nothing must fail, not pass.
 */
function docsLinks() {
  const listed = spawnSync('git', ['ls-files', '-z', ':(glob)docs/**/*.md'], {
    cwd: repo,
    encoding: 'utf8',
  });
  if (listed.status !== 0) {
    process.stderr.write(listed.stderr ?? '');
    return { status: listed.status ?? 1 };
  }

  const files = listed.stdout.split('\0').filter(Boolean);
  if (files.length === 0) {
    process.stderr.write('No documents matched docs/**/*.md — the pathspec is wrong.\n');
    return { status: 1 };
  }

  return spawn(npx, [
    '-y',
    'markdown-link-check',
    '--config',
    '.markdown-link-check.json',
    ...files,
  ]);
}

const STEPS = [
  { name: 'preflight', what: 'the install is current', ...run('preflight') },
  { name: 'build:shared', what: 'the package both sides import', ...run('build:shared') },
  { name: 'type-check', what: 'all three packages', ...run('type-check') },
  { name: 'lint', what: 'ESLint', ...run('lint') },
  { name: 'format:check', what: 'Prettier over packages/ and tools/', ...run('format:check') },
  { name: 'check:models', what: 'hull scripts, GLBs and outlines agree', ...run('check:models') },
  {
    name: 'check:invariants',
    what: 'docs/invariants.md still names live tests',
    ...run('check:invariants'),
  },
  { name: 'test', what: 'shared, frontend, backend, and the tools suites', ...run('test') },
  { name: 'build', what: 'the production bundles', ...run('build') },
  { name: 'docs:lint', what: 'markdownlint over docs/', ...docsLint },
  { name: 'docs:links', what: 'every link in docs/', exec: docsLinks },
  {
    name: 'docs:claude',
    what: "lint, links and named paths over .claude/ and the root engineering docs",
    ...run('docs:claude'),
  },
];

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const list = (name) => {
  const found = flag(name);
  if (!found) return null;
  const value = found.includes('=') ? found.slice(found.indexOf('=') + 1) : '';
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const usage = 'Usage: node tools/gates.mjs [--only=a,b] [--skip=a,b] [--bail] [--list]';
const unknown = args.filter((a) => !/^--(only|skip|bail|list|help)(=|$)/.test(a));
if (unknown.length > 0) {
  process.stderr.write(`Unrecognised: ${unknown.join(' ')}\n${usage}\n`);
  process.exit(2);
}
if (flag('help')) {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}

if (flag('list')) {
  for (const step of STEPS) process.stdout.write(`${step.name.padEnd(16)} ${step.what}\n`);
  process.exit(0);
}

const only = list('only');
const skip = list('skip') ?? [];
const misnamed = [...(only ?? []), ...skip].filter((n) => !STEPS.some((s) => s.name === n));
if (misnamed.length > 0) {
  process.stderr.write(`No such gate: ${misnamed.join(', ')}\nRun with --list to see them.\n`);
  process.exit(2);
}

const selected = STEPS.filter(
  (step) => (only === null || only.includes(step.name)) && !skip.includes(step.name)
);
if (selected.length === 0) {
  process.stderr.write('That selection leaves no gates to run.\n');
  process.exit(2);
}

const bail = Boolean(flag('bail'));
const results = [];

for (const step of selected) {
  process.stdout.write(`\n== ${step.name} == ${step.what}\n`);
  const started = Date.now();
  const result = step.exec ? step.exec() : spawn(step.command, step.args);
  const seconds = (Date.now() - started) / 1000;

  // A step that never started — the command missing, a batch file refused —
  // comes back with `error` set and nothing on stdio. Say why, or the summary
  // line is the only evidence and it reads like a gate that ran and failed.
  if (result.error) process.stderr.write(`${step.name}: could not run: ${result.error.message}\n`);

  // A step killed by a signal reports status null; that is a failure, not a pass.
  const ok = result.status === 0;
  results.push({ name: step.name, ok, seconds });
  if (!ok && bail) break;
}

const failed = results.filter((r) => !r.ok);
const notRun = selected.length - results.length;

process.stdout.write('\n== summary ==\n');
for (const r of results) {
  process.stdout.write(
    `${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(16)} ${r.seconds.toFixed(1)}s\n`
  );
}
if (notRun > 0) process.stdout.write(`      ${notRun} gate(s) not run (--bail)\n`);

if (failed.length === 0) {
  process.stdout.write(`\n${results.length} gate(s) passed.\n`);
  process.exit(0);
}

const names = failed.map((r) => r.name).join(', ');
process.stdout.write(`\n${failed.length} of ${results.length} gate(s) failed: ${names}\n`);
process.exit(1);
