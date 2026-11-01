/**
 * What keeps a pull request off the automerge path: `steward` §9's exclusions, as
 * the one copy a check runs (#1722).
 *
 * The steward merges a `routine` pull request labelled `automerge` once its checks
 * are green, with no person in between. §9 keeps three kinds of change a person's,
 * and says why: what the client draws, a balance baseline, and the loop's own
 * rules. Until #1722 the paths were a sentence there, checked by the session doing
 * the merge. A list a model reads is a wish; a list a check runs is a wall.
 *
 * The list is here and nowhere else: §9 keeps the reasons, `work-issue` §6 runs
 * this before it applies the label, and the workflow runs `main`'s copy, so a pull
 * request cannot loosen the list that judges it. This directory is on the list for
 * the same reason, and the list is on `work-issue` §5's bounds.
 */

/** The kinds of change §9 keeps a person's, named as a report names them. */
export const DRAWN = 'what the client draws';
export const BASELINE = 'a balance baseline';
export const RULES = "the loop's own rules";
export const OPEN = 'work the loop left open';

/**
 * A directory prefix, one file, or a file suffix. Each prefix ends in `/`, so
 * `packages/frontend/` never catches a sibling such as `packages/frontend-notes.md`.
 */
export const BLOCKED_PATHS = [
  { prefix: 'packages/frontend/', kind: DRAWN },
  { prefix: 'tools/hull-models/', kind: DRAWN },
  { suffix: '.glb', kind: DRAWN },
  { prefix: 'docs/screenshots/', kind: DRAWN },
  { prefix: 'tools/balance/baselines/', kind: BASELINE },
  { prefix: '.claude/', kind: RULES },
  { prefix: '.github/', kind: RULES },
  { prefix: 'tools/automerge-guard/', kind: RULES },
  // The balance freeze lifts "by a decision written here", and the three rules that
  // bind every session live here too (#1725). A nested CLAUDE.md holds one
  // directory's conventions, not the loop's rules, so the entry is this path alone.
  { file: 'CLAUDE.md', kind: RULES },
];

/** Body headings that hand the merge to a person: findings still open, frames to judge. */
export const BLOCKED_HEADINGS = [
  { name: 'Open findings', kind: OPEN },
  { name: 'Screenshots', kind: DRAWN },
];

/** How an entry reads in a report: its prefix or file, or its suffix as a glob. */
export const pattern = (entry) => entry.prefix ?? entry.file ?? `*${entry.suffix}`;

/** The entry that catches `path`, or undefined. A suffix ignores case: `.GLB` is a model too. */
export function entryFor(path) {
  return BLOCKED_PATHS.find((entry) => {
    if (entry.prefix) return path.startsWith(entry.prefix);
    if (entry.file) return path === entry.file;
    return path.toLowerCase().endsWith(entry.suffix);
  });
}

/** Each path the list catches, with the entry that caught it, in input order. */
export function blockedPaths(paths) {
  return paths.flatMap((path) => {
    const entry = entryFor(path);
    return entry ? [{ path, entry }] : [];
  });
}

const names = BLOCKED_HEADINGS.map(({ name }) => name.toLowerCase());

// An ATX heading of any level whose text starts with a name, singular or plural:
// `### Screenshot (links)` is still the section §9 means. Matched on the raw text,
// fences and comments included. A false match costs one merge by a person; a
// missed one costs the rule. The template's own comment names both headings
// mid-line, so it never matches, and a test holds that.
const HEADING = /^ {0,3}#{1,6}[ \t]+(open findings?|screenshots?)\b/i;

/** Each heading line in `body` that hands the merge to a person, with its entry. */
export function blockedHeadings(body) {
  return String(body ?? '')
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = HEADING.exec(line);
      if (!match) return [];
      const said = match[1].toLowerCase();
      const at = names.findIndex((name) => said.startsWith(name.replace(/s$/, '')));
      return [{ line: line.trim(), entry: BLOCKED_HEADINGS[at] }];
    });
}
