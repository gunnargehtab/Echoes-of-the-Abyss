/**
 * Fail a pull request that `automerge` would land without a person, when it holds
 * something `steward` §9 keeps a person's. lib/rules.mjs says what that is.
 *
 * Paths come on stdin, one per line or NUL-separated, as `git diff -z` writes
 * them. A line `new<TAB>old` is a rename, as the workflow writes one from the
 * files API, and both names count: moving a file out of `.claude/` changes
 * `.claude/`. The body comes from a file, or in a workflow through the
 * environment, where nothing in it can run.
 *
 *   git diff -z --name-only --no-renames origin/main...HEAD \
 *     | node tools/automerge-guard/check.mjs --body=body.md
 *   gh api ... | node tools/automerge-guard/check.mjs --env=PR_BODY --files-expected=12
 *
 * Exit 0: clear. 1: blocked, and the report names each path and heading. 2: it
 * cannot judge: no body, no paths, a path git quoted, or fewer files than the
 * pull request holds. A guard that read nothing must fail, not pass.
 */

import { readFileSync } from 'node:fs';

import { blockedHeadings, blockedPaths, pattern } from './lib/rules.mjs';

const usage =
  'Usage: node tools/automerge-guard/check.mjs (--body=FILE | --env=NAME) ' +
  '[--files-expected=N] < paths';

// The report goes to stdout whatever the verdict, because the workflow tees it
// into the job summary, and "cannot judge" is the reading a person most needs.
function cannotJudge(reason) {
  console.log(`### automerge-guard: cannot judge\n\n${reason}`);
  process.exit(2);
}

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const unknown = args.filter((a) => !/^--(body|env|files-expected)=/.test(a));
if (unknown.length > 0) cannotJudge(`Unrecognised: ${unknown.join(' ')}\n\n${usage}`);

const bodyFile = flag('body');
const envName = flag('env');
if (Boolean(bodyFile) === Boolean(envName)) {
  cannotJudge(`Give the body once, as --body=FILE or --env=NAME.\n\n${usage}`);
}
// An empty body is a body; an unset variable is a workflow that passed none.
if (envName && !(envName in process.env)) cannotJudge(`--env=${envName}: no such variable.`);

// A read that throws would exit 1 with nothing printed, and 1 means blocked.
function read(what, source) {
  try {
    return readFileSync(source, 'utf8');
  } catch (error) {
    return cannotJudge(`${what} cannot be read: ${error.message}`);
  }
}

const body = envName ? process.env[envName] : read(`--body=${bodyFile}`, bodyFile);
const input = read('stdin', 0);
const entries = (input.includes('\0') ? input.split('\0') : input.split(/\r?\n/)).filter(Boolean);
if (entries.length === 0) {
  cannotJudge(
    'Read no paths on stdin. Pipe in the diff: ' +
      '`git diff -z --name-only --no-renames origin/main...HEAD`.'
  );
}

// The files API lists at most 3,000 of a pull request's files, and a page lost in
// transit reads the same as a short diff. The pull request's own count is the
// control: fewer entries than it holds means some path was never judged.
const expected = flag('files-expected');
if (expected !== undefined) {
  const count = Number(expected);
  if (expected === '' || !Number.isInteger(count) || count < 0) {
    cannotJudge(`--files-expected=${expected} is not a count.`);
  }
  if (entries.length < count) {
    cannotJudge(`Read ${entries.length} of the pull request's ${count} files.`);
  }
}

const paths = entries.flatMap((entry) => entry.split('\t'));
// Without -z, git wraps a path holding an unusual byte in quotes and escapes it,
// and a quoted `.claude/` path would not match `.claude/`.
const quoted = paths.find((path) => path.startsWith('"'));
if (quoted) cannotJudge(`git quoted a path, so it cannot be matched: ${quoted}. Use -z.`);

const caught = blockedPaths(paths);
const headings = blockedHeadings(body);

if (caught.length === 0 && headings.length === 0) {
  console.log(
    `### automerge-guard: clear\n\n${paths.length} path(s) and the body hold nothing ` +
      "steward §9 keeps a person's."
  );
  process.exit(0);
}

console.log('### automerge-guard: blocked\n');
for (const { path, entry } of caught) {
  console.log(`- \`${path}\`: ${entry.kind} (\`${pattern(entry)}\`)`);
}
for (const { line, entry } of headings) console.log(`- the body's \`${line}\`: ${entry.kind}`);
console.log('\nA person merges this one: remove `automerge` (steward §9).');
process.exit(1);
