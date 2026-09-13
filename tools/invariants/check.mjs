#!/usr/bin/env node
/**
 * Every invariant in docs/invariants.md still has a holder.
 *
 * The document lists what this simulation must hold and names, per row, the file
 * and test that hold it. That list is prose, and prose that repeats what code
 * does drifts — the same argument `tools/gates.mjs` was written on, and the same
 * one `CONTRIBUTING.md` records against its own gate list. A row naming a test
 * somebody renamed is worse than no row at all: it reads as authoritative while
 * describing a suite that has moved on.
 *
 * So this reads the table and asserts each holder resolves. Two checks per
 * holder, both cheap:
 *
 *   1. the file exists, and
 *   2. the quoted test name appears in it.
 *
 * Deliberately a **liveness** check and not a correctness one. It cannot tell
 * you the test still asserts what the row claims — only that something by that
 * name is still there. Verifying the assertion would mean re-implementing the
 * suite here, which is the second source of truth this repository keeps refusing
 * to build. The tests hold the invariants; this holds the list.
 *
 * A name matches only where it appears **immediately after a quote**, against
 * the file with its own comments stripped. Both halves of that are load-bearing
 * and both were learned by watching this gate lie:
 *
 *   - Comments are stripped because the long explanation above a test is exactly
 *     the text that survives a rename, and would keep the gate green on a holder
 *     that no longer exists.
 *   - The quote is required because a bare substring matches an identifier. Row
 *     14's holder is `describe('reliefShade', ...)`, and `reliefShade` is also
 *     the name of the imported function under test — so with plain `includes`
 *     the whole describe block could be deleted and this gate still reported
 *     "all present". A `describe`/`it` title is always a string literal, so the
 *     opening quote is what separates a title from every other mention.
 *
 * Matching a *prefix* of a title stays allowed — row 7 names the readable start
 * of a title that carries backticks of its own — because the quote anchors the
 * start, which is the half that matters.
 *
 *   node tools/invariants/check.mjs [--list]
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOC = 'docs/invariants.md';

/** Inline code spans in one table cell, in order. */
const codeSpans = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

/**
 * Strip line and block comments so a test name cannot match the prose above the
 * test. Crude on purpose — it runs over TypeScript we control, not arbitrary
 * input, and erring toward stripping too much only makes the gate stricter.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

/**
 * Parse the "Held by" column into { file, testName } pairs. A cell may name more
 * than one holder, separated by `;` — row 12 is held in two suites at once.
 */
function holdersOf(cell) {
  return cell
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const spans = codeSpans(part);
      if (spans.length < 2) return { malformed: part };
      // First span is the path, last is the test name; an em dash separates them
      // in the prose and is not part of either.
      return { file: spans[0], testName: spans[spans.length - 1] };
    });
}

function parseRows(markdown) {
  const rows = [];
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 4) continue;
    if (!/^\d+$/.test(cells[0])) continue; // header and separator rows
    rows.push({ n: Number(cells[0]), invariant: cells[1], held: cells[3] });
  }
  return rows;
}

const docPath = resolve(repo, DOC);
if (!existsSync(docPath)) {
  process.stderr.write(`${DOC} does not exist — the gate has nothing to check.\n`);
  process.exit(1);
}

const rows = parseRows(readFileSync(docPath, 'utf8'));

// A gate that checks nothing must fail, not pass — tools/gates.mjs learned this
// the same way, with a pathspec that silently matched zero documents.
if (rows.length === 0) {
  process.stderr.write(`No invariant rows parsed out of ${DOC} — the table shape changed.\n`);
  process.exit(1);
}

if (process.argv.includes('--list')) {
  for (const row of rows) process.stdout.write(`${String(row.n).padStart(2)}  ${row.invariant}\n`);
  process.exit(0);
}

const failures = [];
let checked = 0;

for (const row of rows) {
  const holders = holdersOf(row.held);
  if (holders.length === 0) {
    failures.push(`row ${row.n}: no holder named`);
    continue;
  }

  for (const holder of holders) {
    if (holder.malformed) {
      failures.push(
        `row ${row.n}: cannot read a holder from "${holder.malformed}" — ` +
          'expected `path/to/file.ts` — `test name`'
      );
      continue;
    }

    checked += 1;
    const abs = resolve(repo, holder.file);
    if (!existsSync(abs)) {
      failures.push(`row ${row.n}: ${holder.file} does not exist`);
      continue;
    }

    const source = stripComments(readFileSync(abs, 'utf8'));
    // Anchored to an opening quote: a title is a string literal, an identifier
    // is not. See the header — plain `includes` let a deleted describe pass.
    const named = ["'", '"', '`'].some((quote) => source.includes(quote + holder.testName));
    if (!named) {
      failures.push(
        `row ${row.n}: ${holder.file} has no test named "${holder.testName}" ` +
          '(renamed, or moved to another file?)'
      );
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`\n${DOC} names holders that are gone:\n\n`);
  for (const f of failures) process.stderr.write(`  ${f}\n`);
  process.stderr.write(
    `\nFix the row, or restore the test. A row whose holder is gone is worse than\n` +
      `no row: it reads as authoritative while describing a suite that has moved on.\n`
  );
  process.exit(1);
}

process.stdout.write(`${rows.length} invariant(s), ${checked} holder(s), all present.\n`);
