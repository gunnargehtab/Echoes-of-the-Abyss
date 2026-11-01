import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../check.mjs', import.meta.url));

/** Run the CLI as the workflow does: paths on stdin, the body in PR_BODY (null: unset). */
function guard(paths, { body = 'A short body.', args = ['--env=PR_BODY'] } = {}) {
  const env = { ...process.env };
  if (body === null) delete env.PR_BODY;
  else env.PR_BODY = body;
  const run = spawnSync(process.execPath, [script, ...args], {
    input: paths,
    env,
    encoding: 'utf8',
  });
  return { status: run.status, out: run.stdout };
}

test('a clear diff and body pass', () => {
  const { status, out } = guard('docs/ROADMAP.md\n');
  assert.equal(status, 0);
  assert.match(out, /automerge-guard: clear/);
});

test('a blocked path fails, and the report names it and its kind', () => {
  const { status, out } = guard('docs/ROADMAP.md\n.claude/skills/steward/SKILL.md\n');
  assert.equal(status, 1);
  assert.match(
    out,
    /`\.claude\/skills\/steward\/SKILL\.md`: the loop's own rules \(`\.claude\/`\)/
  );
  assert.doesNotMatch(out, /ROADMAP/);
});

test('a blocked heading fails', () => {
  const { status, out } = guard('docs/ROADMAP.md\n', {
    body: '## Solution\nDone.\n## Screenshots\n',
  });
  assert.equal(status, 1);
  assert.match(out, /the body's `## Screenshots`: what the client draws/);
});

test('a rename counts both names: moving a file out of .claude/ changes .claude/', () => {
  const { status, out } = guard('docs/notes.md\t.claude/notes.md\n');
  assert.equal(status, 1);
  assert.match(out, /`\.claude\/notes\.md`/);
});

test('NUL-separated paths from git diff -z are read', () => {
  assert.equal(guard('docs/ROADMAP.md\0tools/hull-models/kit.mjs\0').status, 1);
  assert.equal(guard('docs/ROADMAP.md\0docs/world-atlas.md\0').status, 0);
});

test('a path git quoted cannot be judged', () => {
  const { status, out } = guard('".claude/caf\\303\\251.md"\n');
  assert.equal(status, 2);
  assert.match(out, /cannot judge/);
});

test('no paths cannot be judged: a guard that read nothing must not pass', () => {
  assert.equal(guard('').status, 2);
  assert.equal(guard('\n\n').status, 2);
});

test('fewer entries than the pull request holds cannot be judged', () => {
  const args = ['--env=PR_BODY', '--files-expected=3'];
  assert.equal(guard('docs/a.md\ndocs/b.md\n', { args }).status, 2);
  assert.equal(guard('docs/a.md\ndocs/b.md\tdocs/old.md\ndocs/c.md\n', { args }).status, 0);
  assert.equal(guard('docs/a.md\n', { args: ['--env=PR_BODY', '--files-expected=two'] }).status, 2);
});

test('the body must be given once, and an unset variable is not an empty body', () => {
  assert.equal(guard('docs/a.md\n', { args: [] }).status, 2);
  assert.equal(guard('docs/a.md\n', { args: ['--env=PR_BODY', '--body=x.md'] }).status, 2);
  assert.equal(guard('docs/a.md\n', { body: null }).status, 2);
  assert.equal(guard('docs/a.md\n', { body: '' }).status, 0);
});

test('a body file that cannot be read cannot be judged, and says so', () => {
  const missing = join(tmpdir(), 'automerge-guard-no-such-body.md');
  const { status, out } = guard('docs/a.md\n', { args: [`--body=${missing}`] });
  assert.equal(status, 2);
  assert.match(out, /cannot judge[\s\S]*cannot be read: ENOENT/);
});

test('an unknown flag cannot be judged', () => {
  assert.equal(guard('docs/a.md\n', { args: ['--env=PR_BODY', '--strict'] }).status, 2);
});

test('the body can come from a file, as work-issue §6 passes it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'automerge-guard-'));
  try {
    const file = join(dir, 'body.md');
    writeFileSync(file, '## Problem\nX.\n\n## Open findings\n- one\n');
    const { status, out } = guard('docs/a.md\n', { args: [`--body=${file}`] });
    assert.equal(status, 1);
    assert.match(out, /work the loop left open/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
