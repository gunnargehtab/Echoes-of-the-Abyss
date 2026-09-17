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
  borderBoxWidth,
  parseCss,
  resolveBox,
  uaBoxSizing,
  type Element,
} from './support/cssBox.ts';

/** Where an objective row actually sits — see `MissionPanel` and `GameCanvas`. */
const ANCESTORS = [
  { tag: 'div', classes: ['game-root'] },
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
  for (const selector of ['.objectives-row:not(.met)', '.objectives-row:first-child']) {
    it(`throws rather than guessing at \`${selector}\``, () => {
      assert.throws(
        () => widthOf(`${selector} { box-sizing: content-box; }`),
        /cannot read the selector/
      );
    });
  }

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
