/**
 * The box reader that holds invariant 31 (#752).
 *
 * `test/support/cssBox.ts` exists because neither `react-test-renderer` nor
 * jsdom lays anything out, so it reads the shipped stylesheet and computes a
 * border box instead of measuring one. That makes it the thing standing
 * between `missionPanel.test.ts` and an overflow — and a reader that silently
 * drops a rule, or silently ignores a property, reports a box narrower than
 * the browser's and turns that test into cover rather than a guard.
 *
 * So what this file holds is the reader's own failure behaviour, and it is
 * written as the question "would this catch a row re-boxed by a later rule?"
 * rather than "does the parser parse". Every case below is a shape that a
 * first draft got wrong and that a browser resolves the other way.
 *
 * The rules under test are **appended** to the shipped sheet, because source
 * order is how this reader breaks ties — a rule prepended to `App.css` loses
 * to `.objectives-row`'s own later declaration, exactly as it would in a
 * browser.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APP_CSS,
  BOX_PROPERTIES,
  TRACK_PROPERTIES,
  WRAP_PROPERTIES,
  borderBoxWidth,
  columnFloors,
  columnOf,
  parseCss,
  resolveBox,
  uaBoxSizing,
  wordBreaking,
  type Element,
} from './support/cssBox.ts';

/** Where an objective row actually sits — see `MissionPanel` and `GameCanvas`. */
const ANCESTORS = [
  { tag: 'div', classes: ['game-root'] },
  { tag: 'div', classes: ['game-under'] },
  { tag: 'section', classes: ['objectives'] },
  { tag: 'div', classes: ['objectives-body'] },
];

const ROW: Element = { tag: 'p', classes: ['objectives-row', 'pending'], ancestors: ANCESTORS };
const BODY_WIDTH = 340;

/** One legal value per box property, for the coverage assertion below. */
const SAMPLE: Record<string, string> = {
  'box-sizing': 'border-box',
  width: '100%',
  'min-width': '0',
  'max-width': 'none',
  'inline-size': '100%',
  'min-inline-size': '0',
  'max-inline-size': 'none',
  padding: '5px 8px',
  'padding-left': '8px',
  'padding-right': '8px',
  'padding-inline': '8px',
  'padding-inline-start': '8px',
  'padding-inline-end': '8px',
  border: '0',
  'border-width': '0',
  'border-style': 'solid',
  'border-left': '0',
  'border-right': '0',
  'border-left-width': '0',
  'border-right-width': '0',
  'border-inline': '0',
  'border-inline-start': '0',
  'border-inline-end': '0',
  'border-inline-start-width': '0',
  'border-inline-end-width': '0',
};

/** The shipped sheet with `rule` appended, as the cascade would see it. */
const withRule = (rule: string): string => `${APP_CSS}\n${rule}`;

const boxOf = (rule: string, element: Element = ROW) =>
  resolveBox(parseCss(withRule(rule)), element);

const widthOf = (rule: string, element: Element = ROW): number =>
  borderBoxWidth({ css: withRule(rule), element, containerContentWidth: BODY_WIDTH });

describe('cssBox: the shipped stylesheet as it stands', () => {
  it('boxes both row shapes at the body’s width', () => {
    assert.equal(widthOf(''), BODY_WIDTH);
    assert.equal(widthOf('', { ...ROW, tag: 'button' }), BODY_WIDTH);
  });

  it('reproduces #752 when the one declaration is taken away', () => {
    // The negative control, read-only: the issue's own numbers, and the
    // asymmetry it describes — the `button` fitted all along.
    const stripped = APP_CSS.replace(
      '  box-sizing: border-box;\n  padding: 5px 8px;\n',
      '  padding: 5px 8px;\n'
    );
    const width = (tag: string): number =>
      borderBoxWidth({
        css: stripped,
        element: { ...ROW, tag },
        containerContentWidth: BODY_WIDTH,
      });
    assert.equal(width('p'), 356);
    assert.equal(width('button'), 340);
  });

  it('knows which tags the UA boxes for us', () => {
    assert.equal(uaBoxSizing('p'), 'content-box');
    assert.equal(uaBoxSizing('button'), 'border-box');
  });
});

describe('cssBox: a rule that re-boxes the row is never silently dropped', () => {
  // The door #752 comes back through is a *later* rule putting the row back on
  // `content-box`. A reader that treats every pseudo-class as a state the
  // element is not in would wave these through — and both are more specific
  // than the bare class they qualify, so they win in a browser whatever the
  // source order.
  for (const selector of [
    '.objectives-row:not(.met)',
    '.objectives-row:first-child',
    // A form state is not a state the element is merely *put into*: every
    // marker row is an enabled button at rest, so this one holds and its
    // declarations count. An allow-list that called it a state like `:hover`
    // would drop it in silence.
    'button.objectives-row:enabled',
  ]) {
    it(`throws rather than guessing at \`${selector}\``, () => {
      assert.throws(
        () => widthOf(`${selector} { box-sizing: content-box; }`, { ...ROW, tag: 'button' }),
        /cannot read the selector/
      );
    });
  }

  it('throws on a rule it cannot tell is in force', () => {
    // The reader does not evaluate media conditions, so it cannot say whether
    // this applies — and dropping it would report a box narrower than the
    // browser's at the viewport where it does.
    assert.throws(
      () => widthOf('@media (min-width: 1px) { .objectives-row { min-width: 420px; } }'),
      /does not evaluate/
    );
  });

  it('still ignores a state the row is not in at rest', () => {
    // The other half of the same rule: `:hover` genuinely does not apply, so
    // treating it as unknown would make the reader throw on the sheet it ships
    // with. `button.objectives-row:hover` and `.objectives-row:focus-visible`
    // are both in App.css today.
    assert.equal(widthOf('p.objectives-row:hover { padding-left: 90px; }'), BODY_WIDTH);
  });

  it('handles every property it claims to care about', () => {
    // `BOX_PROPERTIES` and `resolveBox`'s switch are two halves of one list:
    // the set decides which selectors are worth throwing over, the switch
    // decides which declarations are read. A property in the first and missing
    // from the second would be refused loudly in one place and ignored
    // silently in the other, which is the unsafe direction.
    //
    // The sample table is asserted against the set both ways, so adding a
    // property to either without the other fails here.
    assert.deepEqual(
      [...BOX_PROPERTIES].sort(),
      Object.keys(SAMPLE).sort(),
      'every box property has a sample value, and every sample names a box property'
    );
    for (const [property, value] of Object.entries(SAMPLE)) {
      assert.doesNotThrow(
        () => boxOf(`.objectives-row { ${property}: ${value}; }`),
        `\`${property}\` is in BOX_PROPERTIES but resolveBox does not read it`
      );
    }
  });
});

describe('cssBox: the subject of a selector is its rightmost compound', () => {
  // A first draft refused every selector with a combinator, reasoning that
  // such rules style something *inside* the element. In `.a .b` the subject is
  // `.b`, so `.objectives-body .objectives-row` styles the row.
  it('reads a descendant rule whose subject is the row', () => {
    assert.equal(
      boxOf('.objectives-body .objectives-row { padding-left: 40px; }').paddingLeft,
      '40px'
    );
  });

  it('reads a child rule against the row’s real parent', () => {
    assert.equal(
      boxOf('.objectives-body > .objectives-row { padding-left: 41px; }').paddingLeft,
      '41px'
    );
    assert.equal(
      boxOf('.contact-log > .objectives-row { padding-left: 42px; }').paddingLeft,
      '8px'
    );
  });

  it('ignores a rule whose subject is something inside the row', () => {
    assert.equal(
      boxOf('.objectives-row .objectives-progress { padding-left: 40px; }').paddingLeft,
      '8px'
    );
  });

  it('shows the widening as a wider box where the row is content-box', () => {
    // Under `border-box` extra padding eats into the width instead of adding
    // to it, so the box stays 340 and this case would prove nothing. Stripping
    // the fix first is what makes the assertion able to fail.
    const stripped = APP_CSS.replace(
      '  box-sizing: border-box;\n  padding: 5px 8px;\n',
      '  padding: 5px 8px;\n'
    );
    assert.equal(
      borderBoxWidth({
        css: `${stripped}\n.objectives-body .objectives-row { padding-left: 40px; }`,
        element: ROW,
        containerContentWidth: BODY_WIDTH,
      }),
      388
    );
  });
});

describe('cssBox: properties that widen a box', () => {
  it('reads the logical forms, which are the ordinary modern edit', () => {
    assert.equal(boxOf('.objectives-row { padding-inline: 30px; }').paddingLeft, '30px');
    assert.equal(boxOf('.objectives-row { padding-inline-end: 21px; }').paddingRight, '21px');
    assert.equal(boxOf('.objectives-row { inline-size: 500px; }').width, '500px');
  });

  it('lets `min-width` push the box past its container', () => {
    // The unsafe direction is an *under*estimate: the row overflows and the
    // guard stays green. 420 against a 340 body is what that looks like.
    assert.equal(widthOf('.objectives-row { min-width: 420px; }'), 420);
  });

  it('resolves a repo-wide `* { box-sizing: border-box }` rather than refusing it', () => {
    // The idiomatic alternative fix. It should read, not throw — otherwise
    // this file blocks the very change it is arguing for.
    assert.equal(widthOf('* { box-sizing: border-box; }'), BODY_WIDTH);
  });

  it('expands a four-value padding shorthand to the right edges', () => {
    const box = boxOf('.objectives-row { padding: 1px 2px 3px 4px; }');
    assert.equal(box.paddingLeft, '4px');
    assert.equal(box.paddingRight, '2px');
  });

  it('finds a border width wherever the shorthand puts it', () => {
    assert.equal(boxOf('.objectives-row { border: solid 2px red; }').borderLeftWidth, '2px');
    assert.equal(
      boxOf('.objectives-row { border: 2px solid red; border: none; }').borderLeftWidth,
      '0'
    );
  });
});

describe('cssBox: a rule that belongs to another control is settled by its base', () => {
  it('does not throw on the twelve `:disabled` rules this sheet already has', () => {
    // The strictness above is only affordable because the base is matched
    // first. `.contact-log-row:disabled`, `.lobby-ready:disabled` and the rest
    // name controls that are not this row, so they never reach the pseudo
    // test — a reader that checked the pseudo first would refuse the shipped
    // stylesheet outright.
    assert.doesNotThrow(() => widthOf(''));
    assert.doesNotThrow(() => widthOf('', { ...ROW, tag: 'button' }));
    assert.equal(boxOf('.contact-log-row:enabled { padding-left: 70px; }').paddingLeft, '8px');
  });

  it('reads the row’s real ancestry, `.game-under` included', () => {
    // `GameCanvas` wraps the in-match layer in `div.game-under` so one `inert`
    // can silence it. A fixture missing that link answers a rule hung off it
    // wrongly rather than loudly, which spends the ancestry resolution it cost
    // a round to buy.
    assert.equal(boxOf('.game-under .objectives-row { padding-left: 43px; }').paddingLeft, '43px');
    assert.equal(
      boxOf('.game-root > .objectives .objectives-row { padding-left: 44px; }').paddingLeft,
      '8px',
      '`.objectives` is not a child of `.game-root` — `.game-under` sits between them'
    );
  });
});

/**
 * The same reader's other question, added for #760: not how wide the row's box
 * is declared, but whether what sits inside it can push the row past that.
 *
 * It is a separate axis and it failed separately — #752 fitted the row's
 * border box into the panel while the grid inside the row could still overrun
 * it — so these hold the track reader to the same bargain the box reader is
 * held to above. A floor it cannot resolve is a throw, never a quiet
 * `definite`, because a `definite` it has not earned is the answer that reads
 * as cover.
 */
describe('cssBox: what a column track refuses to shrink below', () => {
  const TEXT: Element = {
    tag: 'span',
    classes: ['objectives-text'],
    ancestors: [...ANCESTORS, { tag: 'p', classes: ['objectives-row', 'pending'] }],
  };
  const STATUS: Element = { ...TEXT, classes: ['objectives-status'] };

  it('reads the row’s tracks as they now ship', () => {
    const floors = columnFloors(parseCss(APP_CSS), ROW);
    // The third track is `auto` and is *meant* to be: it holds the progress
    // counter, which is `n of m` under `white-space: nowrap` — a width you can
    // predict, which is the same trade `.contact-log-row` makes for its detail
    // column. The middle one is the track with a mission's own prose in it.
    assert.deepEqual(
      floors.map((floor) => floor.kind),
      ['definite', 'definite', 'content']
    );
  });

  it('reproduces #760 when the two declarations are taken away', () => {
    // The negative control, read-only, and asserted to have bitten: a strip
    // that quietly matched nothing would leave this passing against the fixed
    // sheet and say nothing at all.
    //
    // The anchor is the whole declaration rather than the `minmax(0, 1fr)` in
    // it, and that is not fussiness. `.contact-log-row` carries the identical
    // pair and is written 1,300 lines earlier, so the short anchor strips the
    // *log's* track and leaves this row's fixed — a control aimed at the wrong
    // row, passing against a sheet it never changed. The uniqueness assertions
    // are what turn that into a failure rather than a green tick.
    //
    // The item half is stripped **declaration by declaration** rather than by
    // deleting the rule, because that rule carries `overflow-wrap` as well
    // since #774. Taking the whole rule out would reproduce two faults at once
    // and leave this control unable to say which of them it had caught.
    const TRACK = 'calc(3.2rem * var(--panel-type, 1)) minmax(0, 1fr) auto;';
    const ITEMS = '.objectives-row > * {\n  min-width: 0;\n  overflow-wrap: break-word;\n}\n';
    const ITEMS_WITHOUT_FLOOR = '.objectives-row > * {\n  overflow-wrap: break-word;\n}\n';
    assert.equal(APP_CSS.split(TRACK).length - 1, 1, 'the row’s track declaration is unique');
    assert.equal(APP_CSS.split(ITEMS).length - 1, 1, 'the row’s item rule is unique');

    const stripped = APP_CSS.replace(
      TRACK,
      'calc(3.2rem * var(--panel-type, 1)) 1fr auto;'
    ).replace(ITEMS, ITEMS_WITHOUT_FLOOR);
    assert.ok(!stripped.includes(TRACK), 'the strip reached the track');
    assert.ok(!stripped.includes(ITEMS), 'the strip reached the item rule');
    assert.ok(stripped.includes(ITEMS_WITHOUT_FLOOR), 'the strip left the rule standing');

    const rules = parseCss(stripped);
    assert.deepEqual(
      columnFloors(rules, ROW).map((floor) => floor.kind),
      ['definite', 'content', 'content']
    );
    assert.equal(resolveBox(rules, TEXT).minWidth, undefined);
  });

  /**
   * The same axis on the result card's row, which had neither declaration until
   * #773. It is the same shape holding the same verbatim authored text, so the
   * control is the same one: strip the pair and the middle track goes back to
   * being floored by a mission's own words.
   */
  const RESULT_ANCESTORS = [
    { tag: 'div', classes: ['game-root'] },
    { tag: 'div', classes: ['game-under'] },
    { tag: 'div', classes: ['mission-result'] },
    { tag: 'div', classes: ['mission-result-panel'] },
    { tag: 'ul', classes: ['mission-result-objectives'] },
  ];
  const RESULT_ROW: Element = {
    tag: 'li',
    classes: ['mission-result-objective', 'failed'],
    ancestors: RESULT_ANCESTORS,
  };
  const RESULT_TEXT: Element = {
    tag: 'span',
    classes: ['mission-result-text'],
    ancestors: [...RESULT_ANCESTORS, RESULT_ROW],
  };

  it('reads the result row’s tracks as they now ship', () => {
    // The third track is `auto` for the reason the panel's is: it holds
    // `n of m` under `white-space: nowrap`.
    assert.deepEqual(
      columnFloors(parseCss(APP_CSS), RESULT_ROW).map((floor) => floor.kind),
      ['definite', 'definite', 'content']
    );
    assert.equal(resolveBox(parseCss(APP_CSS), RESULT_TEXT).minWidth, '0');
  });

  it('reproduces #773 when the two declarations are taken away', () => {
    // Anchored on the whole declaration, and asserted unique, for the reason
    // the #760 control gives: three rows in this sheet now carry `minmax(0,
    // 1fr)`, so a short anchor strips somebody else's track and leaves this
    // one's fixed — a control aimed at the wrong row, passing against a sheet
    // it never changed.
    const TRACK = '3.2rem minmax(0, 1fr) auto;';
    const ITEMS = '.mission-result-objective > * {\n  min-width: 0;\n}\n';
    assert.equal(APP_CSS.split(TRACK).length - 1, 1, 'the row’s track declaration is unique');
    assert.equal(APP_CSS.split(ITEMS).length - 1, 1, 'the row’s item rule is unique');

    const stripped = APP_CSS.replace(TRACK, '3.2rem 1fr auto;').replace(ITEMS, '');
    assert.ok(!stripped.includes(TRACK), 'the strip reached the track');
    assert.ok(
      !stripped.includes('.mission-result-objective > *'),
      'the strip reached the item rule'
    );

    const rules = parseCss(stripped);
    assert.deepEqual(
      columnFloors(rules, RESULT_ROW).map((floor) => floor.kind),
      ['definite', 'content', 'content']
    );
    assert.equal(resolveBox(rules, RESULT_TEXT).minWidth, undefined);
  });

  it('throws on a track sizing function it cannot read', () => {
    for (const columns of ['repeat(3, 1fr)', 'minmax(1fr, 2fr)', 'subgrid', 'minmax(0)']) {
      assert.throws(
        () =>
          columnFloors(
            parseCss(withRule(`.objectives-row { grid-template-columns: ${columns} }`)),
            ROW
          ),
        /cannot read the track/,
        `\`${columns}\` was read rather than refused`
      );
    }
  });

  it('throws on a shorthand that could set the columns behind its back', () => {
    for (const property of ['grid-template', 'grid']) {
      assert.throws(
        () =>
          columnFloors(parseCss(withRule(`.objectives-row { ${property}: none / 1fr 1fr }`)), ROW),
        /does not model/
      );
    }
  });

  it('throws rather than answer for something that is not a grid', () => {
    assert.throws(
      () => columnFloors(parseCss(withRule('.objectives-row { display: block }')), ROW),
      /whose display is `block`/
    );
  });

  it('throws on a rule it cannot tell is in force', () => {
    assert.throws(
      () =>
        columnFloors(
          parseCss(
            withRule('@media (max-width: 900px) { .objectives-row { grid-template-columns: 1fr } }')
          ),
          ROW
        ),
      /does not evaluate/
    );
  });

  it('refuses an at-rule it has never heard of rather than reading past it', () => {
    // The hole this closed: anything that was not `@media` or `@supports` used
    // to be skipped whole, block and all, so a rule inside it vanished and the
    // reader answered with the outer sheet's tracks and no throw — a
    // `definite` it had not earned, which is the one direction this file says
    // it will never fail in. `App.css` uses only `@media` today, so the guard
    // is for the sheet that grows one of these, not for the sheet as it is.
    for (const prelude of [
      '@container (max-width: 300px)',
      '@layer ui',
      '@scope (.objectives-body)',
      '@nonsense whatever',
    ]) {
      assert.throws(
        () =>
          columnFloors(
            parseCss(
              withRule(`${prelude} { .objectives-row { grid-template-columns: 1fr auto } }`)
            ),
            ROW
          ),
        /does not evaluate/,
        `\`${prelude}\` was read past rather than refused`
      );
    }
  });

  it('does not let a blockless at-rule eat the rule after it', () => {
    // `@import` ends at a semicolon, so the first `{` after it belongs to the
    // next rule. Walking to a matching brace from there swallows that rule
    // whole — which is the silent drop again, one rule further on.
    const rules = parseCss(
      withRule('@import url("x.css");\n.objectives-row { grid-template-columns: 1fr 1fr }')
    );
    assert.deepEqual(
      columnFloors(rules, ROW).map((floor) => floor.kind),
      ['content', 'content'],
      'the rule after the @import was read'
    );
  });

  it('still skips an at-rule whose block styles nothing', () => {
    // The other half of that change: `@keyframes` and `@font-face` hold no
    // style rules, so recording them as conditions would turn `0%` and `100%`
    // into selectors and throw on a sheet that is perfectly readable.
    const keyframes = '@keyframes nudge { 0% { width: 900px } 100% { width: 900px } }';
    const fontFace = '@font-face { font-family: x; src: url(x.woff2) }';
    assert.deepEqual(
      columnFloors(parseCss(withRule(`${keyframes}\n${fontFace}`)), ROW).map((f) => f.kind),
      ['definite', 'definite', 'content']
    );
    assert.equal(widthOf(`${keyframes}\n${fontFace}`), BODY_WIDTH);
  });

  it('never ignores a property it claims to read', () => {
    // The closed-set assertion `BOX_PROPERTIES` already gets: a property named
    // in the set that never reaches a branch is the silent drop this file
    // refuses, and the two halves cannot drift while this holds.
    const sample: Record<string, string> = {
      display: 'block',
      'grid-template-columns': '1fr 1fr',
      'grid-template': 'none / 1fr',
      grid: 'none / 1fr',
    };
    assert.deepEqual(Object.keys(sample).sort(), [...TRACK_PROPERTIES].sort());

    const shipped = JSON.stringify(columnFloors(parseCss(APP_CSS), ROW));
    for (const [property, value] of Object.entries(sample)) {
      const rules = parseCss(withRule(`.objectives-row { ${property}: ${value} }`));
      let answer: string;
      try {
        answer = JSON.stringify(columnFloors(rules, ROW));
      } catch {
        // Refusing it is the other honest outcome, and the two shorthands take
        // this branch.
        continue;
      }
      assert.notEqual(answer, shipped, `\`${property}\` changed nothing and threw nothing`);
    }
  });

  it('refuses a placement it cannot resolve rather than reporting none', () => {
    // `undefined` means "the stylesheet places this nowhere, so auto-flow
    // decides". A form this reader cannot read is a different fact, and
    // returning `undefined` for it would drop a column from the check above
    // without saying so.
    assert.equal(columnOf(parseCss(APP_CSS), TEXT), 2);
    assert.equal(columnOf(parseCss(APP_CSS), STATUS), undefined);
    for (const placement of ['span 2', 'auto', '2 / 4', 'text-start']) {
      assert.throws(
        () => columnOf(parseCss(withRule(`.objectives-text { grid-column: ${placement} }`)), TEXT),
        /cannot read the placement/,
        `\`${placement}\` was read rather than refused`
      );
    }
    assert.throws(
      () => columnOf(parseCss(withRule('.objectives-text { grid-area: a }')), TEXT),
      /does not model/
    );
  });
});

/**
 * The reader's third question, added for #774: not how wide a box is, but
 * whether the ink inside it may be broken to fit.
 *
 * Rows 33 and 34 floored two rows' middle tracks and both left the same
 * residual behind, which is the whole argument for a separate reader here: a
 * box is not ink. An unbreakable word is laid out on one line whatever its box
 * measures, so flooring the track stops the counter being *carried* out of the
 * panel and does nothing about its being *covered* where it sits.
 *
 * Held to the same bargain as the two readers above — a value it cannot read
 * is a throw, never a quiet `refuses` and never a quiet `permits`. The second
 * is the one that would read as cover.
 */
describe('cssBox: whether a word too long for its box may be broken', () => {
  const CELL_ANCESTORS = [...ANCESTORS, { tag: 'p', classes: ['objectives-row', 'pending'] }];
  const cell = (className: string): Element => ({
    tag: 'span',
    classes: [className],
    ancestors: CELL_ANCESTORS,
  });

  /** One legal value per wrap property, for the coverage assertion below. */
  const WRAP_SAMPLE: Record<string, string> = {
    'overflow-wrap': 'break-word',
    'word-wrap': 'break-word',
    'word-break': 'break-all',
    'white-space': 'normal',
    'white-space-collapse': 'collapse',
    'text-wrap': 'wrap',
    'text-wrap-mode': 'wrap',
  };

  it('reads the row’s cells as they now ship', () => {
    const rules = parseCss(APP_CSS);
    // The two cells a mission authors into. Both are unbounded prose, so both
    // are what #774 is about.
    for (const authored of ['objectives-text', 'objectives-gloss']) {
      const verdict = wordBreaking(rules, cell(authored));
      assert.equal(verdict.kind, 'permits', `.${authored} cannot break a token it cannot fit`);
    }
    // And the counter is the one cell that must *not* break: `4 of 3` split
    // over three lines is the same unreadable one column along, which is why
    // `white-space: nowrap` sits on it and why the third track can be `auto`.
    const counter = wordBreaking(rules, cell('objectives-progress'));
    assert.equal(counter.kind, 'refuses');
    assert.match(
      (counter as { because: string }).because,
      /line breaking is off/,
      'the counter holds its line by `white-space`, not by accident'
    );
  });

  it('reproduces #774 when the declaration is taken away', () => {
    // The negative control, read-only, and asserted to have bitten. Anchored
    // on the whole rule body rather than on `overflow-wrap: break-word`, for
    // the reason the #760 and #773 controls give: a short anchor strips
    // whichever row happens to be written first and leaves this one's intact,
    // which is a control aimed at the wrong row passing against a sheet it
    // never changed.
    const ITEMS = '.objectives-row > * {\n  min-width: 0;\n  overflow-wrap: break-word;\n}\n';
    assert.equal(APP_CSS.split(ITEMS).length - 1, 1, 'the row’s item rule is unique');

    const stripped = APP_CSS.replace(ITEMS, '.objectives-row > * {\n  min-width: 0;\n}\n');
    assert.ok(!stripped.includes(ITEMS), 'the strip reached the item rule');
    assert.ok(stripped.includes('.objectives-row > *'), 'the strip left the rest of the rule');

    const rules = parseCss(stripped);
    for (const authored of ['objectives-text', 'objectives-gloss']) {
      assert.deepEqual(wordBreaking(rules, cell(authored)), {
        kind: 'refuses',
        because: 'nothing sets `overflow-wrap` or `word-break`',
      });
    }
    // The floors are untouched by the strip, which is what says this axis is
    // genuinely the third one and not row 33 restated.
    assert.deepEqual(
      columnFloors(rules, ROW).map((floor) => floor.kind),
      ['definite', 'definite', 'content']
    );
  });

  it('refuses a break that something else switches line breaking off over', () => {
    // The false pass this reader exists to refuse: `overflow-wrap: anywhere`
    // under `white-space: nowrap` breaks nothing, because there are no lines
    // to break onto. Either order, because these are two properties rather
    // than two values of one.
    for (const rule of [
      '.objectives-text { white-space: nowrap; }',
      '.objectives-text { white-space: nowrap; overflow-wrap: anywhere; }',
      '.objectives-text { overflow-wrap: anywhere; white-space: nowrap; }',
      '.objectives-text { text-wrap: nowrap; }',
    ]) {
      const verdict = wordBreaking(parseCss(withRule(rule)), cell('objectives-text'));
      assert.equal(verdict.kind, 'refuses', `\`${rule}\` was read as a break`);
    }
  });

  it('lets a later declaration undo an earlier one, as the cascade does', () => {
    const verdict = wordBreaking(
      parseCss(withRule('.objectives-text { overflow-wrap: normal; }')),
      cell('objectives-text')
    );
    assert.equal(verdict.kind, 'refuses', 'a later `normal` did not undo the shipped break');
  });

  it('throws on a wrap value it cannot read, rather than reading it as inert', () => {
    for (const value of ['anywhere !important', 'inherit', 'initial', 'unset', 'break-spaces']) {
      assert.throws(
        () =>
          wordBreaking(
            parseCss(withRule(`.objectives-text { overflow-wrap: ${value} }`)),
            cell('objectives-text')
          ),
        /does not model|cannot read/,
        `\`overflow-wrap: ${value}\` was read rather than refused`
      );
    }
  });

  it('covers every property in its own set', () => {
    assert.deepEqual(
      [...WRAP_PROPERTIES].sort(),
      Object.keys(WRAP_SAMPLE).sort(),
      'every wrap property has a sample value, and every sample names a wrap property'
    );
    for (const [property, value] of Object.entries(WRAP_SAMPLE)) {
      assert.doesNotThrow(
        () =>
          wordBreaking(
            parseCss(withRule(`.objectives-text { ${property}: ${value}; }`)),
            cell('objectives-text')
          ),
        `\`${property}\` is in WRAP_PROPERTIES but wordBreaking does not read it`
      );
    }
  });
});
