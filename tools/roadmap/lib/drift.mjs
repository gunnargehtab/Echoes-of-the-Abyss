/**
 * What the tracker knows that the roadmap does not.
 *
 * The site renders rows, and a row is a claim that the work is tracked — but
 * an issue filed on Tuesday is not a row until somebody adds one, and nothing
 * used to notice the gap. This compares the open issues against the document
 * and names the ones the page cannot show:
 *
 * - **unplaced** — open, real work, and in no phase table or status row.
 *   The page says how many there are, so a reader is never told the roadmap
 *   is the whole of the work when it is not.
 * - **unmentioned** — the subset that `docs/ROADMAP.md` does not refer to at
 *   all, not even in prose. Those are the ones that need a sentence.
 * - **unrecorded** — the same question asked of closed work: done, and on no
 *   row. The history phases are a record, and a record that silently misses
 *   half the work is not one, so the page says how much it misses.
 *
 * An epic's row stands for its sub-issues (the roadmap's own rule: an epic
 * gets a row, its sub-issues do not), so an issue counts as placed when it or
 * any issue above it has a row.
 *
 * Epics are left out on purpose: an epic is the container for rows that are
 * on the page, not a piece of work the page is missing. So are ledgers — a
 * `routine-log` issue says of itself that it is never to be implemented and
 * should stay open, so counting it as a gap in the roadmap would leave the
 * page permanently one short of the truth. So are `standing` issues, for the
 * same arithmetic and a different reason: one is open because a decision went
 * that way and something in the tree cites it by number (#703 is the case —
 * see CONTRIBUTING.md's label section), so it will never acquire a row and
 * would otherwise sit in the unplaced count forever. Pull requests never reach
 * here — the API lists them as issues, and `github.mjs` drops them.
 */

/** Labels that mean "open, but not a piece of work the roadmap is missing". */
const NOT_WORK = ['epic', 'routine-log', 'standing'];

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

/** Closed issues that were never work done: a duplicate, or decided against. */
const NOT_DONE = ['duplicate', 'wontfix', 'invalid'];

/**
 * `{ unplaced, unmentioned, unrecorded }` — arrays of issues. `closedIssues`
 * is optional; without it nothing is unrecorded, because nothing was asked.
 */
export function driftReport({ markdown, roadmap, openIssues, closedIssues = [] }) {
  const placed = placedIssues(roadmap);
  const mentioned = mentionedIssues(markdown);
  const byNumber = new Map([...openIssues, ...closedIssues].map((i) => [i.number, i]));
  // Walk the numbers, not the issue objects: a parent with a row is placed
  // whether or not it was in the list this report was handed.
  const covered = (issue) => {
    const seen = new Set();
    for (let n = issue.number; n !== null && n !== undefined && !seen.has(n);) {
      if (placed.has(n)) return true;
      seen.add(n);
      n = byNumber.get(n)?.parent ?? null;
    }
    return false;
  };
  const isWork = (issue) => !issue.labels.some((label) => NOT_WORK.includes(label));
  const byNumberAsc = (a, b) => a.number - b.number;
  const unplaced = openIssues
    .filter(isWork)
    .filter((issue) => !covered(issue))
    .sort(byNumberAsc);
  const unmentioned = unplaced.filter((issue) => !mentioned.has(issue.number));
  const unrecorded = closedIssues
    .filter(isWork)
    .filter((issue) => !issue.labels.some((label) => NOT_DONE.includes(label)))
    .filter((issue) => issue.stateReason !== 'not_planned')
    .filter((issue) => !covered(issue))
    .sort(byNumberAsc);
  return { unplaced, unmentioned, unrecorded };
}
