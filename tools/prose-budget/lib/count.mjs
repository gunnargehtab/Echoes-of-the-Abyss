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
 * A pull request body also has a shape: Problem, Options and Solution, each
 * capped in sentences rather than words, because a sentence is one claim and
 * claims are what a reviewer — and `loop-critic` — has to check.
 *
 * The budgets are CLAUDE.md's "Write short on GitHub". This file is the only
 * place they are a number rather than a sentence — the same rule
 * `packages/shared/src/constants.ts` follows, for the same reason.
 */

/** Words a reader spends, by surface. */
export const BUDGETS = { pr: 300, issue: 200, comment: 100 };

/** Sentences a pull request body section may carry; Options is per option. */
export const SENTENCES = { problem: 3, option: 3, solution: 3 };

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

/**
 * How many sentences a piece of prose makes.
 *
 * A sentence ends at `.`, `!` or `?` followed by a space or the end, and a
 * trailing fragment with no stop is one more — so each list item and each
 * paragraph is counted on its own, and a bullet with no full stop is still one
 * claim. Inline code and the common Latin abbreviations are neutralised first,
 * so `a.b` in backticks and "e.g." end nothing; a decimal has no space after
 * its point and never did.
 */
export function countSentences(text) {
  return prose(text)
    .split(/\n(?=\s*(?:[-*+]|\d+[.)])\s)|\n\s*\n/)
    .reduce((sum, unit) => sum + sentencesIn(unit), 0);
}

function sentencesIn(unit) {
  const flat = unit
    .replace(/`[^`]*`/g, 'code')
    .replace(/\b(e\.g|i\.e|etc|vs|cf)\./gi, '$1')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/[\p{L}\p{N}]/u.test(flat)) return 0;
  const stops = flat.match(/[.!?]+(?=\s|$)/g)?.length ?? 0;
  const tail = flat.replace(/^.*[.!?](\s|$)/, '');
  return stops + (/[\p{L}\p{N}]/u.test(tail) ? 1 : 0);
}

/** A line that is bookkeeping, not prose: the closing keyword, or a checkbox. */
const BOOKKEEPING = /^\s*((fixes|closes|resolves|refs|part of)\b.*#\d*|[-*] \[[ x]\] )/i;

/** A top-level list item opens a new option. */
const ITEM = /^[-*+] |^\d+[.)] /;

/**
 * The pull request body's shape against `SENTENCES`: one reading per Problem
 * and Solution section and per option, and the required sections that are
 * missing. Each reading is `{ name, sentences, limit, over }`.
 */
export function shape(body) {
  const sections = new Map();
  let current = null;
  const text = typeof body === 'string' ? body.replace(/<!--[\s\S]*?-->/g, '') : '';
  for (const line of text.split('\n')) {
    const heading = line.match(/^##\s+(.*?)\s*$/);
    if (heading) {
      current = heading[1].toLowerCase();
      sections.set(current, []);
    } else if (current && !BOOKKEEPING.test(line)) sections.get(current).push(line);
  }

  const reading = (name, lines, limit) => {
    const sentences = countSentences(lines.join('\n'));
    return { name, sentences, limit, over: Math.max(0, sentences - limit) };
  };

  const readings = [];
  const missing = [];
  for (const name of ['problem', 'options', 'solution']) {
    const lines = sections.get(name);
    if (!lines) {
      if (name !== 'options') missing.push(name);
      continue;
    }
    if (name !== 'options') {
      readings.push(reading(name, lines, SENTENCES[name]));
      continue;
    }
    const options = [];
    for (const line of lines) {
      if (ITEM.test(line) || (!options.length && line.trim())) options.push([line]);
      else if (options.length) options.at(-1).push(line);
    }
    options.forEach((option, i) =>
      readings.push(reading(`option ${i + 1}`, option, SENTENCES.option))
    );
  }
  return { readings, missing, over: readings.some((r) => r.over > 0) || missing.length > 0 };
}
