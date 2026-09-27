/**
 * How long each `CLAUDE.md` is, against the ceiling its reader sets.
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

/** Lines in `text`, where a final newline ends a line rather than starting one. */
export function lineCount(text) {
  if (text === '') return 0;
  const lines = text.split('\n');
  return text.endsWith('\n') ? lines.length - 1 : lines.length;
}

/**
 * The `CLAUDE.md` files among `documents` at or over `limit` lines, with their
 * counts. Every other gated document is left alone: `CONTRIBUTING.md` and the
 * skills are read on demand, not loaded into every session.
 */
export function overlongClaudeFiles(documents, limit = CLAUDE_MD_LINE_LIMIT) {
  return documents
    .filter(({ file }) => file === 'CLAUDE.md' || file.endsWith('/CLAUDE.md'))
    .map(({ file, text }) => ({ file, lines: lineCount(text) }))
    .filter(({ lines }) => lines >= limit);
}
