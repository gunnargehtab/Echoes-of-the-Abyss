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
const FENCE_RE = /^```[\s\S]*?^```/gm;
const INLINE_CODE_RE = /`([^`\n]+)`/g;
const GLOB_CHARS = /[*?{]/;

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
 * Three normalisations, each earning its place against a real span in the tree:
 *
 * - **First whitespace token.** A span can be a command whose first word is a
 *   path — `tools/gates.mjs --only=docs:lint`. Taking the whole span would look
 *   for a file with a space in it and report a miss that is not one.
 * - **Trailing punctuation and a `:line` suffix.** `EchoRenderer.ts:279` is how
 *   this repository cites a line, and the line number is not part of the name.
 * - **Angle brackets mean a template, not a path.** `docs/mission-<name>.md` and
 *   `docs/screenshots/issue-<n>/` are shapes an author fills in; there are six
 *   such spans under `.claude/` and not one of them is meant to exist. A rule
 *   that read them literally would need six escapes to say what one rule says.
 */
export function candidatePaths(markdown) {
  const found = [];
  for (const span of inlineSpans(markdown)) {
    const first = span.trim().split(/\s/)[0];
    const bare = first.replace(/:\d+(-\d+)?$/, '').replace(/[.,;:)\]]+$/, '');
    if (!PREFIX_RE.test(bare)) continue;
    if (bare.includes('<') || bare.includes('>')) continue;
    if (!found.includes(bare)) found.push(bare);
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
 * `generated` is the third answer, and it is neither tracked nor missing.
 * Two skills name `packages/shared/dist`, which is real, is the thing
 * `CLAUDE.md` § Build order is *about*, and is gitignored — so tracking cannot
 * see it, and `existsSync` would answer differently before and after a build,
 * which in CI means the `docs` job (no install, no build) disagreeing with
 * every developer's machine. A gitignore rule is static, so asking git whether
 * a path is ignored is the one test that gives the same answer everywhere.
 */
export function makeResolver(trackedFiles, generated = new Set()) {
  const files = new Set(trackedFiles);
  const directories = new Set();
  for (const file of trackedFiles) {
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) directories.add(parts.slice(0, i).join('/'));
  }

  return function resolves(path) {
    const bare = path.endsWith('/') ? path.slice(0, -1) : path;
    if (generated.has(bare) || generated.has(path)) return true;
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
  for (const { file, text } of documents) {
    for (const path of candidatePaths(text)) {
      if (allowed.has(path)) continue;
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
  const named = new Set();
  for (const { text } of documents) for (const path of candidatePaths(text)) named.add(path);
  return [...allowed].filter((path) => !named.has(path)).sort();
}
