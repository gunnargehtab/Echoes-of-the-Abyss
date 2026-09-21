/**
 * The repository paths a document names, and whether they still resolve.
 *
 * `CLAUDE.md` names roughly sixty of them in backticks — `packages/shared/src/
 * constants.ts`, `tools/hull-models`, `.github/workflows/ci.yml` — and a path is
 * the part of a prose claim a machine can settle. It is also the part that rots
 * silently: a file moves, the sentence pointing at it keeps rendering, and the
 * reader follows it to nothing. That is `CLAUDE.md`'s own argument for
 * `check:models` and `check:invariants`, applied to the file making it.
 *
 * Split out from `check.mjs` for the reason `tools/prose-budget` splits
 * `lib/count.mjs` from its CLI: the extraction rules below are worth testing on
 * strings rather than only on the tree, because every one of them is a judgement
 * about what counts as a path and each is wrong in a different direction.
 */

/** A span must start with one of these to be read as a repository path. */
export const PATH_PREFIXES = ['packages/', 'tools/', 'docs/', '.claude/', '.github/'];

const PREFIX_RE = new RegExp(`^(${PATH_PREFIXES.map((p) => p.replace('.', '\\.')).join('|')})`);
// CommonMark allows a fence to be indented up to three spaces, which is also
// where a fence inside a single-level list item sits. Anchoring at column zero
// left three real fences unseen (CONTRIBUTING.md:103 among them), so their
// contents were read as prose.
//
// This comment used to call that harmless because none of the three held a
// backtick, which is the wrong test twice over. A fence DELIMITER is itself
// three backticks, so an unstripped fence is paired over as prose whatever it
// contains; and what decides whether that costs anything is whether the BODY
// names a repository path. None of the three does, so the strip buys nothing
// measurable here: anchored and indented stripping both extract 195 mentions
// over the 23 gated documents, 0 of them differing. It is kept for the fence
// that does name one — with a body of `rm docs/nope.md`, anchoring at column
// zero reads docs/nope.md as a live claim about the tree, and the test beside
// this file uses exactly that shape so the bound is pinned rather than argued
// (#817).
//
// Three is CommonMark's own bound: past it a block is an indented code block
// rather than a fence. A fence nested deeper than that, inside a nested list,
// would not be stripped; none exists here.
const FENCE_RE = /^ {0,3}```[\s\S]*?^ {0,3}```/gm;
// A span may cross a newline. These files are authored at 100 columns, so a
// backticked path wrapping mid-span is routine, and a regex that stopped at the
// newline could not match one — it paired that span's CLOSING backtick with the
// next OPENING one and read the prose between them as code, inverting the
// polarity of the rest of the line. Five such sites exist in the gated set, and
// one of them hides `packages/frontend` in `packages/frontend/CLAUDE.md`
// itself — still true, and re-measured here rather than carried.
//
// A blank line ends a span, because an inline code span cannot contain one, and
// the bound has to be part of the PATTERN rather than a filter over its matches.
// #813 filtered, and a discarded match has still consumed its backticks: one
// unpaired backtick in prose re-paired every span after it, so the extractor
// read the gaps between spans as code and the spans themselves as prose. That
// hid paths document-wide, where the pre-#813 regex lost a line (#817). The
// lookahead refuses the newline instead, so the match simply fails and the
// scan resumes at the next backtick — the stray one is skipped and the spans
// after it pair with each other again.
const INLINE_CODE_RE = /`((?:[^`\n]|\n(?![ \t]*\n))+)`/g;
const GLOB_CHARS = /[*?{]/;

/**
 * A path without its trailing slash.
 *
 * Prose names a directory both ways, and this repository's does: `run-game`
 * writes `packages/shared/dist` and `steward` writes `packages/shared/dist/`,
 * for the same directory and the same declared escape. So every comparison
 * between a named path and a declared one strips first, on BOTH sides.
 * `unusedAllowances` did that from the start and the other two did not — they
 * stripped the named side only, so an entry declared WITH a slash answered for
 * neither spelling and read as dead. It failed closed, which is the safe
 * direction and is why nothing caught it: a declared escape quietly stopped
 * working rather than quietly widening (#817).
 */
const stripSlash = (path) => (path.endsWith('/') ? path.slice(0, -1) : path);

/**
 * Inline code spans, with fenced blocks removed first.
 *
 * Fences are dropped rather than scanned because a fenced block is a command
 * someone runs, not a claim the prose is making — `node tools/echo-sim/sim.js
 * [tools/echo-sim/scenarios/<name>.json]` names an argument shape, and a shell
 * line is free to reference a file it is about to create. Prose names a path in
 * an inline span, which is the thing this checks.
 */
function inlineSpans(markdown) {
  const prose = markdown.replace(FENCE_RE, '');
  return [...prose.matchAll(INLINE_CODE_RE)].map((m) => m[1]);
}

/**
 * The repository paths named in `markdown`, unique and in the order they appear.
 *
 * Three normalisations. The first two earn their place against a real span in
 * the tree; the third is defensive, and says so:
 *
 * - **Every whitespace token, not just the first.** A span is often a command,
 *   and the path in it is rarely the verb: `node tools/hull-models/parts.mjs`
 *   names its path second. Reading only the first token left seven live paths
 *   under the five prefixes unchecked, `packages/frontend/src/game/
 *   EchoRenderer.ts` among them. Reading the whole span as one string would be
 *   the opposite error — it looks for a filename with a space in it.
 * - **A `:line` suffix.** `EchoRenderer.ts:279` is how this repository cites a
 *   line, and the line number is not part of the name.
 * - **Trailing punctuation**, which is the defensive one. Re-extracting all
 *   twenty-three gated documents with it and without differs on **0 of 201
 *   spans**, before and after every token started being read. It is kept because a path
 *   followed by a comma inside a span is a sentence somebody will write, and it
 *   is tested rather than trusted — but no live span needs it, and if it ever
 *   costs anything it should go rather than be argued for.
 * - **Angle brackets mean a template, not a path.** `docs/mission-<name>.md` and
 *   `docs/screenshots/issue-<n>/` are shapes an author fills in; there are seven
 *   such spans under `.claude/` and not one of them is meant to exist. A rule
 *   that read them literally would need seven escapes to say what one rule says.
 */
export function candidatePaths(markdown) {
  const found = [];
  for (const span of inlineSpans(markdown)) {
    for (const token of span.trim().split(/\s+/)) {
      const bare = token.replace(/:\d+(-\d+)?$/, '').replace(/[.,;:)\]]+$/, '');
      if (!PREFIX_RE.test(bare)) continue;
      if (bare.includes('<') || bare.includes('>')) continue;
      if (!found.includes(bare)) found.push(bare);
    }
  }
  return found;
}

/**
 * An fnmatch-style pattern as a `RegExp` over a whole path.
 *
 * Written rather than taken from a dependency because three spans in this
 * repository's prose are globs — the Prettier coverage in `CLAUDE.md` § Style,
 * and the container images in `.github/copilot-instructions.md` — and skipping
 * anything with a star in it would let a glob matching nothing pass unread,
 * which is the one thing this file is for. A doubled star crosses separators, a
 * single star and `?` do not, and `{a,b}` alternates.
 */
export function globToRegExp(pattern) {
  let source = '';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        source += '.*';
        i++;
        if (pattern[i + 1] === '/') i++;
      } else {
        source += '[^/]*';
      }
    } else if (char === '?') {
      source += '[^/]';
    } else if (char === '{') {
      const end = pattern.indexOf('}', i);
      if (end === -1) {
        source += '\\{';
        continue;
      }
      const alts = pattern.slice(i + 1, end).split(',').map(escapeLiteral);
      source += `(${alts.join('|')})`;
      i = end;
    } else {
      source += escapeLiteral(char);
    }
  }
  return new RegExp(`^${source}$`);
}

function escapeLiteral(text) {
  return text.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

/**
 * A resolver over a list of tracked files.
 *
 * Resolution is against **git**, not the working tree, for the same reason the
 * rest of this gate lists files with `git ls-files`: whether a scratch file
 * happens to be sitting on this disk says nothing about whether a reader can
 * follow the sentence. Directories resolve because prose names them constantly
 * (`tools/balance`, `packages/frontend`), and a directory is tracked only
 * through the files inside it.
 *
 * `generated` is the third answer, and it is neither tracked nor missing — a
 * build output, named in prose and absent from git by design. `check.mjs` owns
 * that list and the reason beside each entry, for the same reason it owns the
 * declared-absent one: an escape a reviewer cannot see is not an escape, it is
 * a hole.
 */
export function makeResolver(trackedFiles, generated = new Set()) {
  const files = new Set(trackedFiles);
  const directories = new Set();
  for (const file of trackedFiles) {
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) directories.add(parts.slice(0, i).join('/'));
  }

  const generatedBare = new Set([...generated].map(stripSlash));

  return function resolves(path) {
    const bare = stripSlash(path);
    if (generatedBare.has(bare)) return true;
    if (GLOB_CHARS.test(bare)) {
      const re = globToRegExp(bare);
      for (const file of files) if (re.test(file)) return true;
      for (const dir of directories) if (re.test(dir)) return true;
      return false;
    }
    return files.has(bare) || directories.has(bare);
  };
}

/**
 * Every unresolved path in `documents`, as `{ file, path }` rows.
 *
 * `allowed` is the set of spans declared absent on purpose; `check.mjs` owns
 * that list and the reason beside each entry.
 */
export function unresolvedPaths(documents, resolves, allowed = new Set()) {
  const rows = [];
  const allowedBare = new Set([...allowed].map(stripSlash));
  for (const { file, text } of documents) {
    for (const path of candidatePaths(text)) {
      if (allowedBare.has(stripSlash(path))) continue;
      if (!resolves(path)) rows.push({ file, path });
    }
  }
  return rows;
}

/**
 * The declared-absent entries that no document names any more.
 *
 * An escape outlives the sentence it was written for, and a stale one is worse
 * than no escape at all: it reads as a live exemption and quietly widens what
 * the gate will accept. This is `classifySkills`'s "listed skill not on disk"
 * check, one level down.
 */
export function unusedAllowances(documents, allowed) {
  // Both sides are compared without a trailing slash, per `stripSlash` above:
  // two skills name the same build output, one with and one without, and a
  // single declared entry answers for both rather than reading as stale the
  // moment one goes.
  const named = new Set();
  for (const { text } of documents)
    for (const path of candidatePaths(text)) named.add(stripSlash(path));
  return [...allowed].filter((path) => !named.has(stripSlash(path))).sort();
}
