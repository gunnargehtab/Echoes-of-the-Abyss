import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

test('hooks resolve the project from a nested working directory', () => {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  for (const projectDir of ['', root]) {
    const read = runHook(readCommand, { tool_input: { path: 'image.png' } }, cwd, projectDir);
    assert.equal(read.status, 0, read.stderr);
    const start = runHook(startCommand, {}, cwd, projectDir);
    assert.equal(start.status, 0, start.stderr);
  }
});
