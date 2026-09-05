/**
 * What the tracker knows that the roadmap does not.
 *
 * The site renders rows, and a row is a claim that the work is tracked — but
 * an issue filed on Tuesday is not a row until somebody adds one, and nothing
 * used to notice the gap. This compares the open issues against the document
 * and names the ones the page cannot show:
 *
 * - **unplaced** — open, not an epic, and in no phase table or status row.
 *   The page says how many there are, so a reader is never told the roadmap
 *   is the whole of the work when it is not.
 * - **unmentioned** — the subset that `docs/ROADMAP.md` does not refer to at
 *   all, not even in prose. Those are the ones that need a sentence.
 *
 * Epics are left out on purpose: an epic is the container for rows that are
 * on the page, not a piece of work the page is missing. Pull requests never
 * reach here — the API lists them as issues, and `github.mjs` drops them.
 */

const MENTION = /(^|[^\w"/>])#(\d+)\b/g;

/** Every `#N` the document refers to, in prose or in a table. */
export function mentionedIssues(markdown) {
  const numbers = new Set();
  for (const match of markdown.matchAll(MENTION)) numbers.add(Number(match[2]));
  return numbers;
}

/** The issue numbers that render as rows: phase items and status questions. */
export function placedIssues(roadmap) {
  return new Set([
    ...roadmap.phases.flatMap((phase) => phase.items.map((item) => item.number)),
    ...roadmap.standing.questions.map((q) => q.number).filter((n) => n !== null),
  ]);
}

/** `{ unplaced, unmentioned }` — arrays of `{number, title, url, labels}`. */
export function driftReport({ markdown, roadmap, openIssues }) {
  const placed = placedIssues(roadmap);
  const mentioned = mentionedIssues(markdown);
  const unplaced = openIssues
    .filter((issue) => !issue.labels.includes('epic'))
    .filter((issue) => !placed.has(issue.number))
    .sort((a, b) => a.number - b.number);
  const unmentioned = unplaced.filter((issue) => !mentioned.has(issue.number));
  return { unplaced, unmentioned };
}
