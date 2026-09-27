import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CLAUDE_MD_LINE_LIMIT, lineCount, overlongClaudeFiles } from '../lib/length.mjs';

const lines = (n) => 'x\n'.repeat(n);

test('a final newline ends a line rather than starting one', () => {
  assert.equal(lineCount(''), 0);
  assert.equal(lineCount('one'), 1);
  assert.equal(lineCount('one\n'), 1);
  assert.equal(lineCount('one\ntwo'), 2);
  assert.equal(lineCount('one\n\n'), 2);
});

test('the limit is exclusive: 199 lines pass and 200 fail', () => {
  const docs = [
    { file: 'CLAUDE.md', text: lines(CLAUDE_MD_LINE_LIMIT - 1) },
    { file: 'tools/CLAUDE.md', text: lines(CLAUDE_MD_LINE_LIMIT) },
  ];
  assert.deepEqual(overlongClaudeFiles(docs), [
    { file: 'tools/CLAUDE.md', lines: CLAUDE_MD_LINE_LIMIT },
  ]);
});

test('only files named CLAUDE.md are measured', () => {
  // CONTRIBUTING.md and the skills are gated for links and paths too, but a
  // session reads them on demand; only a CLAUDE.md is loaded unasked.
  const docs = [
    { file: 'CONTRIBUTING.md', text: lines(500) },
    { file: '.claude/skills/dev-loop/SKILL.md', text: lines(500) },
    { file: 'docs/NOT-CLAUDE.md', text: lines(500) },
    { file: 'docs/CLAUDE.md', text: lines(500) },
  ];
  assert.deepEqual(
    overlongClaudeFiles(docs).map(({ file }) => file),
    ['docs/CLAUDE.md']
  );
});
