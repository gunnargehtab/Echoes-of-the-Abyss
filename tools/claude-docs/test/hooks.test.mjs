import { execFileSync, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const settings = JSON.parse(
  readFileSync(new URL('../../../.claude/settings.json', import.meta.url))
);
const readCommand = settings.hooks.PreToolUse[0].hooks[0].command;
const startCommand = settings.hooks.SessionStart[0].hooks[0].command;

function runHook(command, input = {}, cwd = root, projectDir = '') {
  const windows = process.platform === 'win32';
  return spawnSync(
    windows ? 'pwsh' : 'sh',
    windows ? ['-NoProfile', '-Command', command] : ['-c', command],
    {
      cwd,
      env: { ...process.env, CLAUDE_CODE_REMOTE: 'false', CLAUDE_PROJECT_DIR: projectDir },
      input: JSON.stringify(input),
      encoding: 'utf8',
    }
  );
}

test('the configured read hook allows images and text but refuses GLBs', () => {
  for (const path of ['docs/screenshot.png', 'docs/art-direction.md']) {
    const result = runHook(readCommand, { tool_input: { file_path: path } });
    assert.equal(result.status, 0, result.stderr);
  }
  for (const tool_input of [{ file_path: 'docs/model.GLB' }, { path: 'docs/model.glb' }]) {
    const result = runHook(readCommand, { tool_input });
    assert.equal(result.status, 0, result.stderr);
    const decision = JSON.parse(result.stdout);
    assert.equal(decision.permissionDecision, 'deny');
    assert.equal(decision.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(decision.permissionDecisionReason, /binary glTF/);
  }
});

test('the configured session-start hook is a no-op locally', () => {
  const result = runHook(startCommand);
  assert.equal(result.status, 0, result.stderr);
});

// The remote half of the session-start hook, against a scratch repository. `npm`
// is stubbed to append to the lockfile on install, standing in for the image's
// npm 10 dropping the `libc` fields, and `python3` so the Pillow step never
// reaches pip. Bash only: the hook runs in Linux containers, never on Windows.
function runRemoteStart(lockEdit) {
  const dir = mkdtempSync(join(tmpdir(), 'session-start-'));
  const bin = join(dir, 'bin');
  const repo = join(dir, 'repo');
  mkdirSync(bin);
  mkdirSync(repo);
  const stub = (name, body) =>
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\nexit 0\n`, { mode: 0o755 });
  stub('npm', '[ "$1" = install ] && echo churn >> package-lock.json');
  stub('python3', '');
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '-q');
  writeFileSync(join(repo, 'package-lock.json'), '{}\n');
  git('add', 'package-lock.json');
  git(
    '-c',
    'user.name=t',
    '-c',
    'user.email=t@t',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-qm',
    'lock'
  );
  if (lockEdit) appendFileSync(join(repo, 'package-lock.json'), lockEdit);
  try {
    const result = spawnSync('bash', [join(root, '.claude', 'hooks', 'session-start.sh')], {
      env: {
        ...process.env,
        CLAUDE_CODE_REMOTE: 'true',
        CLAUDE_PROJECT_DIR: repo,
        PATH: `${bin}:${process.env.PATH}`,
      },
      input: JSON.stringify({ source: 'compact' }),
      encoding: 'utf8',
    });
    return { result, lock: readFileSync(join(repo, 'package-lock.json'), 'utf8') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const notOnWindows = { skip: process.platform === 'win32' && 'the hook is bash' };

test('the session-start hook puts back a clean lockfile npm churned', notOnWindows, () => {
  const { result, lock } = runRemoteStart('');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(lock, '{}\n');
});

// SessionStart also fires on resume and after compaction, mid-task (#1953).
test('the session-start hook keeps a lockfile edit already in the tree', notOnWindows, () => {
  const { result, lock } = runRemoteStart('"a dependency"\n');
  assert.equal(result.status, 0, result.stderr);
  assert.match(lock, /"a dependency"/);
});

test('hooks resolve the project from a nested working directory', () => {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  for (const projectDir of ['', root]) {
    const read = runHook(readCommand, { tool_input: { path: 'image.png' } }, cwd, projectDir);
    assert.equal(read.status, 0, read.stderr);
    const start = runHook(startCommand, {}, cwd, projectDir);
    assert.equal(start.status, 0, start.stderr);
  }
});
