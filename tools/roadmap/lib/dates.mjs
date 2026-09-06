/**
 * When each phase actually ran.
 *
 * The dates are derived, never written down: a phase spans from the day its
 * first issue was filed to the day its last one closed, and both of those are
 * facts GitHub already told us for every row on the page. A date typed into
 * the document would be one more number to keep true — and this document has
 * had a hand-maintained count go stale twice.
 *
 * "Filed" rather than "started" on purpose. The tracker knows when the work
 * was written down and when it landed; it does not know when somebody began
 * thinking about it, and the page should not imply otherwise. The section
 * lede says which two days these are.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** An ISO timestamp as `{ y, m, d }` in UTC, or null. */
function parts(iso) {
  if (typeof iso !== 'string' || iso.length < 10) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return { y: date.getUTCFullYear(), m: date.getUTCMonth(), d: date.getUTCDate() };
}

/**
 * `{ start, end, ongoing }` for a set of roadmap items, or null when the
 * tracker told us nothing about any of them (a build without a token).
 * `end` is null while anything in the set is still open.
 */
export function span(items, states) {
  const known = items.map((item) => states.get(item.number)).filter((s) => s !== undefined);
  const created = known
    .map((s) => s.createdAt)
    .filter(Boolean)
    .sort();
  if (created.length === 0) return null;
  const openItems = known.filter((s) => s.state !== 'closed');
  const closed = known
    .map((s) => s.closedAt)
    .filter(Boolean)
    .sort();
  return {
    start: created[0],
    end: openItems.length > 0 || closed.length === 0 ? null : closed[closed.length - 1],
    ongoing: openItems.length > 0,
  };
}

/**
 * A span as one short phrase: "15–24 Aug 2026", "30 Aug – 6 Sep 2026",
 * "23 Aug 2026" for a single day, "since 5 Sep 2026" while work is open.
 *
 * The year is printed once when both ends share it, which they do for every
 * phase so far and will stop doing the moment they don't.
 */
export function formatSpan(value) {
  if (value === null) return null;
  const from = parts(value.start);
  if (from === null) return null;
  if (value.end === null) return `since ${from.d} ${MONTHS[from.m]} ${from.y}`;
  const to = parts(value.end);
  if (to === null) return `since ${from.d} ${MONTHS[from.m]} ${from.y}`;
  if (from.y === to.y && from.m === to.m && from.d === to.d) {
    return `${from.d} ${MONTHS[from.m]} ${from.y}`;
  }
  if (from.y !== to.y) {
    return `${from.d} ${MONTHS[from.m]} ${from.y} – ${to.d} ${MONTHS[to.m]} ${to.y}`;
  }
  // An en dash without spaces inside one month, with them across two, which is
  // how a date range is set: "15–24 Aug 2026" but "30 Aug – 6 Sep 2026".
  return from.m === to.m
    ? `${from.d}–${to.d} ${MONTHS[to.m]} ${to.y}`
    : `${from.d} ${MONTHS[from.m]} – ${to.d} ${MONTHS[to.m]} ${to.y}`;
}

/** The day the first issue on the whole roadmap was filed, formatted. */
export function firstFiled(states) {
  const created = [...states.values()]
    .map((s) => s.createdAt)
    .filter(Boolean)
    .sort();
  const first = parts(created[0]);
  return first === null ? null : `${first.d} ${MONTHS[first.m]} ${first.y}`;
}
