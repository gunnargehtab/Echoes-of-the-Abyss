import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CLAUDE_MD_LINE_LIMIT,
  SKILL_DESCRIPTION_WORD_LIMIT,
  lineCount,
  overlongClaudeFiles,
  overlongSkillDescriptions,
  skillDescription,
  wordCount,
} from '../lib/length.mjs';

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

const skill = (description, rest = '') =>
  `---\nname: x\ndescription: ${description}\n${rest}---\n\n# Body\n`;
const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

test('a word holds a letter or a digit, so a spaced dash is not one', () => {
  assert.equal(wordCount('Run one change — build it'), 5);
  assert.equal(wordCount('  three  plain words '), 3);
  assert.equal(wordCount(''), 0);
});

test('the description is read plain or quoted, and the rest of the frontmatter is ignored', () => {
  assert.equal(skillDescription(skill('Plain text.')), 'Plain text.');
  assert.equal(
    skillDescription(skill('"Quoted: with a colon."', 'license: MIT\n')),
    'Quoted: with a colon.'
  );
  assert.equal(skillDescription(skill("'Single quoted.'")), 'Single quoted.');
});

test('a description this cannot read as one line is null, never a fragment', () => {
  assert.equal(skillDescription('# No frontmatter\n'), null);
  assert.equal(skillDescription('---\nname: x\n---\n'), null);
  assert.equal(skillDescription(skill('>', '  folded onto\n  two lines\n')), null);
  assert.equal(skillDescription(skill('|-', '  a literal block\n')), null);
  assert.equal(skillDescription(skill('starts here', '  and continues\n')), null);
});

test('the word limit is inclusive: 60 words pass and 61 fail', () => {
  const docs = [
    { file: '.claude/skills/short/SKILL.md', text: skill(words(SKILL_DESCRIPTION_WORD_LIMIT)) },
    { file: '.claude/skills/long/SKILL.md', text: skill(words(SKILL_DESCRIPTION_WORD_LIMIT + 1)) },
  ];
  assert.deepEqual(overlongSkillDescriptions(docs), [
    { file: '.claude/skills/long/SKILL.md', words: SKILL_DESCRIPTION_WORD_LIMIT + 1 },
  ]);
});

test('an unreadable description fails rather than passing as zero words', () => {
  const docs = [{ file: '.claude/skills/folded/SKILL.md', text: skill('>', '  a\n') }];
  assert.deepEqual(overlongSkillDescriptions(docs), [
    { file: '.claude/skills/folded/SKILL.md', words: null },
  ]);
});

test("only a skill's own SKILL.md is measured", () => {
  // A reference file under a skill, an agent and a CLAUDE.md can all carry
  // frontmatter-shaped text; none of them is a skill description.
  const long = skill(words(200));
  const docs = [
    { file: '.claude/skills/dev-loop/references/notes.md', text: long },
    { file: '.claude/agents/loop-critic.md', text: long },
    { file: 'CLAUDE.md', text: long },
  ];
  assert.deepEqual(overlongSkillDescriptions(docs), []);
});
