/**
 * A contact log row keeps each cell's ink to itself at every width and scale
 * the log is shown at (docs/ui-ux.md §2, "fit what they hold", across §11's
 * 75–200%; #1893).
 *
 * Glyph boxes are a layout fact this runner has no engine for, so the ink is
 * measured in Chromium by `run-game`'s `logFit.mjs`: on the grid this row used
 * to be, the `CLASSIFIED` probe row put 800 px² of its label over its detail
 * at 150% on a 1,440 px window, every row overlapped at 200%, and at 1,000 px
 * the overlap began at 100%. What is held here, against the shipped sheet, is
 * the mechanism that drive found sufficient — so a later edit that undoes it
 * fails `npm test` rather than waiting for someone to run a browser:
 *
 * - the row is a flex row that **wraps**, since a grid row cannot give up a
 *   line, and the detail can only fit by taking one of its own;
 * - **no cell has `min-width: 0`**. A flex item's automatic minimum is its
 *   min-content, and that is what sends the detail to the next line instead of
 *   crushing the label to nothing — the grid's `> * { min-width: 0 }` restored
 *   here is #1893 again;
 * - the label's basis is **0** and it grows, so the line is decided by its
 *   longest word and it takes what is left;
 * - the time and the tier never give, and the detail may break **only between
 *   its tokens**: each token's span is `nowrap`, the detail itself is not. With
 *   the whole detail `nowrap`, a 950 px window at 200% with its 15 px scrollbar
 *   put `bearing 359°   ~11800 m` 9 px past the row. Breaking between tokens
 *   also needs the detail to **shrink**: under `flex: none` its base size is
 *   its whole width and its spans are never asked to wrap.
 *
 * Each of those has a negative control below: the declaration taken away, and
 * the check asserted to bite.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APP_CSS,
  boxRulesFor,
  parseCss,
  resolveBox,
  wordBreaking,
  type Element,
} from './support/cssBox.ts';

/** Where a row sits — `GameCanvas` and `ContactLog`. */
const ANCESTORS: Element[] = [
  { tag: 'div', classes: ['game-root'] },
  { tag: 'div', classes: ['game-under'] },
  { tag: 'section', classes: ['contact-log'] },
  { tag: 'div', classes: ['contact-log-entries'] },
];

const ROW: Element = {
  tag: 'button',
  classes: ['contact-log-row', 'tier-3'],
  ancestors: ANCESTORS,
};
const cell = (name: string): Element => ({
  tag: 'span',
  classes: [`contact-log-${name}`],
  ancestors: [...ANCESTORS, ROW],
});
const TIME = cell('time');
const TIER = cell('tier');
const LABEL = cell('label');
const DETAIL = cell('detail');
const PART: Element = {
  tag: 'span',
  classes: ['contact-log-detail-part'],
  ancestors: [...ANCESTORS, ROW, DETAIL],
};

/**
 * The last value the sheet declares for `property` on `element`, in source
 * order — the tie-break the rest of `cssBox` uses. Properties that could set
 * the same thing behind this one's back (`flex-flow` for `flex-wrap`, the
 * `flex-*` longhands for `flex`) throw rather than being read past, so a later
 * rule written another way fails loudly instead of slipping by.
 */
function declared(css: string, element: Element, property: string): string | undefined {
  const aliases: Record<string, string[]> = {
    'flex-wrap': ['flex-flow'],
    flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
    display: [],
  };
  const watched = new Set([property, ...aliases[property]]);
  let value: string | undefined;
  for (const rule of boxRulesFor(parseCss(css), element, watched)) {
    for (const [name, v] of rule.declarations) {
      if (!watched.has(name)) continue;
      if (name !== property) {
        throw new Error(`this test does not read \`${name}\` (\`${rule.selector}\`)`);
      }
      value = v.trim();
    }
  }
  return value;
}

/** `flex` as its three longhands, for the forms this sheet writes. */
function flexOf(value: string | undefined): { grow: number; shrink: number; basis: string } {
  if (value === undefined) return { grow: 0, shrink: 1, basis: 'auto' };
  if (value === 'none') return { grow: 0, shrink: 0, basis: 'auto' };
  const [grow, shrink, basis] = value.split(/\s+/);
  if (basis === undefined) throw new Error(`this test does not read \`flex: ${value}\``);
  return { grow: Number(grow), shrink: Number(shrink), basis };
}

const lineBreakingOff = (css: string, element: Element): boolean => {
  const verdict = wordBreaking(parseCss(css), element);
  return verdict.kind === 'refuses' && verdict.because.startsWith('line breaking is off');
};

/** What is wrong with a row under `css`, one line each; empty when it holds. */
function rowFaults(css: string): string[] {
  const faults: string[] = [];
  if (declared(css, ROW, 'display') !== 'flex') faults.push('the row is not a flex row');
  if (declared(css, ROW, 'flex-wrap') !== 'wrap') faults.push('the row does not wrap');
  const rules = parseCss(css);
  for (const [name, element] of [
    ['time', TIME],
    ['tier', TIER],
    ['label', LABEL],
    ['detail', DETAIL],
  ] as const) {
    const min = resolveBox(rules, element).minWidth;
    if (min !== undefined && min !== 'auto') faults.push(`the ${name} has min-width ${min}`);
  }
  const label = flexOf(declared(css, LABEL, 'flex'));
  if (!/^0(px|%)?$/.test(label.basis) || label.grow <= 0) {
    faults.push(`the label is not basis 0 and growing (${declared(css, LABEL, 'flex')})`);
  }
  for (const [name, element] of [
    ['time', TIME],
    ['tier', TIER],
  ] as const) {
    if (flexOf(declared(css, element, 'flex')).shrink !== 0) faults.push(`the ${name} shrinks`);
  }
  if (flexOf(declared(css, DETAIL, 'flex')).shrink <= 0) faults.push('the detail cannot shrink');
  if (lineBreakingOff(css, DETAIL)) faults.push('the detail cannot break between its tokens');
  if (!lineBreakingOff(css, PART)) faults.push('a detail token can break inside itself');
  return faults;
}

/** The shipped sheet with one exact piece of text replaced, asserted to exist once. */
function without(find: string, replace = ''): string {
  assert.equal(APP_CSS.split(find).length - 1, 1, `\`${find.trim()}\` is unique in App.css`);
  return APP_CSS.replace(find, replace);
}

describe('a contact log row gives up a line rather than print one cell over another (#1893)', () => {
  it('holds against the shipped stylesheet', () => {
    assert.deepEqual(rowFaults(APP_CSS), []);
  });

  it('reproduces #1893 when the grid’s item floor comes back', () => {
    const faults = rowFaults(`${APP_CSS}\n.contact-log-row > * {\n  min-width: 0;\n}\n`);
    assert.ok(faults.includes('the label has min-width 0'), faults.join('; '));
  });

  it('fails when the row stops wrapping', () => {
    const faults = rowFaults(without('  flex-wrap: wrap;\n  align-items: baseline;\n'));
    assert.ok(faults.includes('the row does not wrap'), faults.join('; '));
  });

  it('fails when the label sizes the line by its whole name', () => {
    const faults = rowFaults(without('.contact-log-label {\n  flex: 1 1 0;\n}'));
    assert.ok(
      faults.some((f) => f.startsWith('the label is not basis 0')),
      faults.join('; ')
    );
  });

  it('fails when the whole detail is one unbreakable run again', () => {
    const faults = rowFaults(
      without(
        '  margin-left: auto;\n  opacity: 0.7;\n',
        '  margin-left: auto;\n  opacity: 0.7;\n  white-space: nowrap;\n'
      )
    );
    assert.ok(faults.includes('the detail cannot break between its tokens'), faults.join('; '));
  });

  it('fails when the detail may not shrink to its widest token', () => {
    const faults = rowFaults(
      without('  flex: 0 1 auto;\n  margin-left: auto;\n', '  flex: none;\n  margin-left: auto;\n')
    );
    assert.ok(faults.includes('the detail cannot shrink'), faults.join('; '));
  });

  it('fails when a token may break inside itself', () => {
    const faults = rowFaults(without('.contact-log-detail-part {\n  white-space: nowrap;\n}'));
    assert.ok(faults.includes('a detail token can break inside itself'), faults.join('; '));
  });
});
