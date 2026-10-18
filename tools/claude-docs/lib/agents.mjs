/**
 * Which model each subagent under `.claude/agents/` is pinned to, against the
 * names Claude Code can actually spawn.
 *
 * A pin to a model that does not exist fails only when the agent is spawned,
 * and `dev-loop` spawns `loop-critic` at the end of a round, after the work.
 * One session's critic named `gpt-6-astra` and every round failed to start
 * (#899's session); the author then reviews its own diff or stops, and
 * neither is the gate the critic is. Nothing read the field, so nothing caught
 * it before the run that needed it.
 */

/** The aliases Claude Code resolves to the current model of each family. */
export const MODEL_ALIASES = ['inherit', 'opus', 'sonnet', 'haiku', 'fable'];

/**
 * A full model id: `claude-<family>-<version>`, optionally with the 1M-context
 * suffix. Matched by shape rather than listed, so a release does not redden
 * this gate; a typo in the family or a model from another vendor still does.
 */
const MODEL_ID = /^claude-(opus|sonnet|haiku|fable)-\d+(-\d+)*(\[1m\])?$/;

/**
 * The `model` in an agent's YAML frontmatter: the value, `undefined` when the
 * field is absent (the agent inherits the session's model, which is fine), or
 * null when there is no frontmatter to read.
 */
export function agentModel(text) {
  const front = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
  if (front === null) return null;
  const line = front[1].split('\n').find((l) => l.startsWith('model:'));
  if (line === undefined) return undefined;
  return line
    .slice('model:'.length)
    .trim()
    .replace(/^(["'])(.*)\1$/, '$2');
}

/** Whether `model` names something Claude Code can spawn. */
export function isKnownModel(model) {
  return MODEL_ALIASES.includes(model) || MODEL_ID.test(model);
}

/**
 * The agents among `documents` pinned to a model this cannot recognise, or
 * with no frontmatter at all. Only `.claude/agents/*.md` is read.
 */
export function unknownAgentModels(documents) {
  return documents
    .filter(({ file }) => /^\.claude\/agents\/[^/]+\.md$/.test(file))
    .map(({ file, text }) => ({ file, model: agentModel(text) }))
    .filter(({ model }) => model === null || (model !== undefined && !isKnownModel(model)));
}
