import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CLAUDE_MD_LINE_LIMIT,
  LABEL_DESCRIPTION_CHAR_LIMIT,
  SKILL_DESCRIPTION_WORD_LIMIT,
  labelDescriptions,
  lineCount,
  overlongClaudeFiles,
  overlongLabelDescriptions,
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

const labels = (...entries) => entries.join('\n') + '\n';
const label = (name, description, rest = '') =>
  `- name: ${name}\n  color: ffffff\n  description: ${description}\n${rest}`;

test('each label description is read plain or quoted, with its name', () => {
  const text = labels(
    '# --- Kind ---\n',
    label('bug', "Something isn't working"),
    label('quoted', '"Has: a colon"'),
    '- name: bare\n  color: ffffff\n'
  );
  assert.deepEqual(labelDescriptions(text), [
    { name: 'bug', description: "Something isn't working" },
    { name: 'quoted', description: 'Has: a colon' },
  ]);
});

test('a two-space comment under a description is a sibling, not a continuation', () => {
  const text = label('automerge', 'Merged once green', '  # Never on a drawn change.\n');
  assert.deepEqual(labelDescriptions(text), [
    { name: 'automerge', description: 'Merged once green' },
  ]);
});

test('a label description this cannot read as one line is null, never a fragment', () => {
  const text = labels(
    label('folded', '>-', '    A call a person reserved\n    and more\n'),
    label('continued', 'starts here', '    and continues\n')
  );
  assert.deepEqual(labelDescriptions(text), [
    { name: 'folded', description: null },
    { name: 'continued', description: null },
  ]);
});

test('the character limit is inclusive and counts code points', () => {
  // #1654: fable-5.1's 112-character description never applied. An em dash is
  // one character to GitHub, as automerge's 99 showed.
  const at = 'x'.repeat(LABEL_DESCRIPTION_CHAR_LIMIT - 2) + ' —';
  const over = 'x'.repeat(LABEL_DESCRIPTION_CHAR_LIMIT + 1);
  const text = labels(label('at', at), label('over', over), label('folded', '|'));
  assert.deepEqual(overlongLabelDescriptions(text), [
    { name: 'over', chars: LABEL_DESCRIPTION_CHAR_LIMIT + 1 },
    { name: 'folded', chars: null },
  ]);
});
