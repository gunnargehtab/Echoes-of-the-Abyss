/**
 * How long the prose a session loads unasked is, against the ceiling its reader
 * sets: each `CLAUDE.md`, and each repo-authored skill's `description`.
 *
 * A `CLAUDE.md` is context a session pays for before it reads a line of code:
 * the root file at every start, a nested one on entering its directory.
 * Anthropic's guidance puts the file under 200 lines, because a longer one
 * costs more context and is followed less closely. #899 found the root at 252
 * lines, six more than two days before; nothing measured it, so nothing pushed
 * back. The cap makes a new rule pay for its lines with an old one, or move
 * down into the directory it binds — the trade the root file's layering already
 * asks for.
 *
 * Lines rather than words because lines are the unit the guidance states, and
 * every one of these files wraps prose at the same width, so the two move
 * together.
 */

/** A `CLAUDE.md` must stay under this many lines. */
export const CLAUDE_MD_LINE_LIMIT = 200;

/**
 * A repo-authored skill's `description` may run to this many words (#1186).
 *
 * The description is the one part of a skill every session loads; the body
 * loads only when the skill runs. Its job is choosing: what the skill does and
 * when to reach for it. #1186 found six authored descriptions at 65–111 words,
 * most of the excess a closing sentence on why the skill exists, which helps
 * only once the body is open and belongs there. Sixty leaves room for a scope
 * line and a list of trigger phrases: the design skills sit near forty and say
 * both. Words rather than lines because a description is one line.
 *
 * The cap is also why those six stay six (#1187). Merged under `art-direction`
 * they would save about 180 words a session, but one description would then
 * carry six skills' triggers in sixty words, and "audit this map" or "texture
 * budget" would be the first phrases cut.
 */
export const SKILL_DESCRIPTION_WORD_LIMIT = 60;

/** Lines in `text`, where a final newline ends a line rather than starting one. */
export function lineCount(text) {
  if (text === '') return 0;
  const lines = text.split('\n');
  return text.endsWith('\n') ? lines.length - 1 : lines.length;
}

/**
 * Words in `text`: whitespace-separated tokens holding a letter or a digit, so
 * a spaced em dash is punctuation rather than a word. `tools/prose-budget`
 * counts GitHub bodies by the same rule.
 */
export function wordCount(text) {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/**
 * The `description` in a skill's YAML frontmatter, or null when there is none
 * to read.
 *
 * Every skill here writes it as one plain or quoted line, and that is all this
 * reads. A block scalar (`>` or `|`) or a description folded onto a second line
 * returns null rather than a guess, so a reformat fails the gate loudly instead
 * of measuring a fragment and passing.
 */
export function skillDescription(text) {
  const front = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
  if (front === null) return null;
  const lines = front[1].split('\n');
  const at = lines.findIndex((line) => line.startsWith('description:'));
  if (at === -1) return null;
  const value = lines[at].slice('description:'.length).trim();
  if (value === '' || /^[>|][+-]?$/.test(value)) return null;
  if (/^\s/.test(lines[at + 1] ?? '')) return null;
  const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
  return quoted === null ? value : quoted[2];
}

/**
 * The `CLAUDE.md` files among `documents` at or over `limit` lines, with their
 * counts. Every other gated document is left alone: `CONTRIBUTING.md` and the
 * skills' bodies are read on demand, not loaded into every session.
 */
export function overlongClaudeFiles(documents, limit = CLAUDE_MD_LINE_LIMIT) {
  return documents
    .filter(({ file }) => file === 'CLAUDE.md' || file.endsWith('/CLAUDE.md'))
    .map(({ file, text }) => ({ file, lines: lineCount(text) }))
    .filter(({ lines }) => lines >= limit);
}

/**
 * The skills among `documents` whose description runs past `limit` words, or
 * that has none this can read (`words: null`). Only a skill's own `SKILL.md`
 * is measured, and only the ones `documents` carries: check.mjs passes the
 * repo-authored skills, never the vendored copies, which are read-only.
 */
export function overlongSkillDescriptions(documents, limit = SKILL_DESCRIPTION_WORD_LIMIT) {
  return documents
    .filter(({ file }) => /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(file))
    .map(({ file, text }) => {
      const description = skillDescription(text);
      return { file, words: description === null ? null : wordCount(description) };
    })
    .filter(({ words }) => words === null || words > limit);
}
