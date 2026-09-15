/**
 * How long a piece of GitHub prose is, in the words a person actually reads.
 *
 * Markdown scaffolding is not reading. A table pipe, a bullet dash, a checkbox
 * and a heading marker cost the reader nothing, and neither does a URL they
 * will click rather than read. So a word here is a whitespace-separated token
 * carrying at least one letter or digit, counted after the parts of a body
 * that are not prose have been taken out.
 *
 * That matters for the two things every body of ours carries and nobody wrote:
 * the pull request template's own `<!-- -->` prompts, and the attribution
 * footer. Counting those would spend a fifth of the budget before the first
 * sentence, and the author could do nothing about either.
 *
 * The budgets are CLAUDE.md's "Write short on GitHub". This file is the only
 * place they are a number rather than a sentence — the same rule
 * `packages/shared/src/constants.ts` follows, for the same reason.
 */

/** Words a reader spends, by surface. */
export const BUDGETS = { pr: 300, issue: 200, comment: 100 };

/** What each budget is called when a run reports on it. */
export const LABELS = {
  pr: 'Pull request body',
  issue: 'Issue body',
  comment: 'Comment',
};

/**
 * A body with everything that is not prose removed.
 *
 * Order is load-bearing: comments and fences go first so a link inside one is
 * never counted, and the attribution lines go before links are flattened,
 * because it is the link text "Claude Code" that identifies them.
 */
export function prose(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^.*generated (with|by).*claude code.*$/gim, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<https?:\/\/[^>]*>|https?:\/\/\S+/g, ' ');
}

/** How many words of prose a body carries. */
export function countWords(text) {
  return prose(text)
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/**
 * A reading for one surface: `{ kind, label, words, budget, over }`.
 * `over` is how far past the budget it went, and 0 when it is within it.
 */
export function measure(kind, text) {
  const budget = BUDGETS[kind];
  if (budget === undefined) throw new Error(`unknown surface: ${kind}`);
  const words = countWords(text);
  return { kind, label: LABELS[kind], words, budget, over: Math.max(0, words - budget) };
}
