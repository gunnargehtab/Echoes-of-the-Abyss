import { test } from 'node:test';
import assert from 'node:assert/strict';

import { agentModel, isKnownModel, unknownAgentModels } from '../lib/agents.mjs';

const agent = (front) => `---\nname: x\n${front}---\n\nBody.\n`;

test('reads the model, quoted or bare, and tells absent from unreadable', () => {
  assert.equal(agentModel(agent('model: opus\n')), 'opus');
  assert.equal(agentModel(agent('model: "claude-opus-5-5"\n')), 'claude-opus-5-5');
  assert.equal(agentModel(agent('tools: Read\n')), undefined);
  assert.equal(agentModel('No frontmatter.\n'), null);
});

test('aliases and full ids pass; another vendor or a typo does not', () => {
  for (const model of ['opus', 'fable', 'inherit', 'claude-sonnet-5-5', 'claude-opus-5-5[1m]']) {
    assert.ok(isKnownModel(model), model);
  }
  // The pin that stopped #899's critic from starting.
  for (const model of ['gpt-6-astra', 'claude-opsu-5-5', 'Opus', '']) {
    assert.ok(!isKnownModel(model), model);
  }
});

test('only agent files are read, and an absent model inherits', () => {
  const docs = [
    { file: '.claude/agents/critic.md', text: agent('model: gpt-6-astra\n') },
    { file: '.claude/agents/designer.md', text: agent('model: fable\n') },
    { file: '.claude/agents/plain.md', text: agent('tools: Read\n') },
    { file: '.claude/agents/broken.md', text: 'No frontmatter.\n' },
    { file: '.claude/skills/x/SKILL.md', text: agent('model: gpt-6-astra\n') },
  ];
  assert.deepEqual(unknownAgentModels(docs), [
    { file: '.claude/agents/critic.md', model: 'gpt-6-astra' },
    { file: '.claude/agents/broken.md', model: null },
  ]);
});
