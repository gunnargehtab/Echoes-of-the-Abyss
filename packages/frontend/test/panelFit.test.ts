/**
 * The orders panel's type yields to its room (docs/ui-ux.md §2 and §11, #1634).
 *
 * What a browser does with the type is a layout fact this runner cannot see,
 * and the drive in `docs/screenshots/issue-1634/` measures it on the real
 * client. What is held here is the search: given a panel that overflows at the
 * type the scale asks for, it lands on a type that fits, never below the 75%
 * floor and never above the type it was given.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PANEL_TYPE_FLOOR, fitPanel, fitPanelType } from '../src/game/panelFit.ts';
import { panelType } from '../src/game/uiScale.ts';
import { StubElement } from './support/headless.ts';

/** A panel whose rows take `height` units at type 1, in `room` units of screen. */
const panel = (height: number, room: number) => {
  const tried: number[] = [];
  return {
    tried,
    overflows: (type: number) => {
      tried.push(type);
      return height * type > room;
    },
  };
};

describe('fitPanelType', () => {
  it('leaves a panel that fits at the type its scale asks for', () => {
    const base = panelType(1.5);
    const { overflows, tried } = panel(300, 400);
    assert.equal(fitPanelType(base, PANEL_TYPE_FLOOR / 1.5, overflows), base);
    assert.deepEqual(tried, [base], 'one layout, at the base, and no search');
  });

  it('steps the type down until every row is in the room', () => {
    const base = panelType(1.5);
    const floor = PANEL_TYPE_FLOOR / 1.5;
    const { overflows } = panel(400, 260);
    const type = fitPanelType(base, floor, overflows);
    assert.ok(type < base && type >= floor, `${type} is inside [${floor}, ${base}]`);
    assert.ok(!overflows(type), 'the type it lands on fits');
    assert.ok(
      overflows(type + (base - floor) / 32),
      'and is within a step of the largest that does'
    );
  });

  it('stops at the floor when not even the floor fits', () => {
    const floor = PANEL_TYPE_FLOOR / 2;
    const { overflows } = panel(400, 100);
    assert.equal(fitPanelType(panelType(2), floor, overflows), floor);
  });

  it('never searches where the floor is not below the base', () => {
    // At 75% the base is 1 and the floor is 1: the setting is already the
    // smallest type there is, so there is nothing to give.
    const { overflows, tried } = panel(400, 100);
    assert.equal(fitPanelType(1, 1, overflows), 1);
    assert.deepEqual(tried, []);
  });
});

/**
 * A mounted panel whose body is `height` units tall at type 1 in `room` units,
 * with its scale and base type set as `.game-root` would hand them down. The
 * stub has no cascade, so they sit on the panel's own style, under the
 * override `fitPanel` writes and clears.
 */
function mounted(scale: number, height: number, room: number) {
  const panel = new StubElement('section');
  const body = new StubElement('div');
  const base = panelType(scale);
  const type = () => Number(panel.style.getPropertyValue('--panel-type') || base);
  Object.defineProperty(body, 'scrollHeight', { get: () => height * type() });
  body.clientHeight = room;
  // `fitPanel` clears its override first; the base must survive that, as the
  // inherited value does in a browser.
  const removeProperty = panel.style.removeProperty.bind(panel.style);
  panel.style.removeProperty = (name: string) => {
    const old = removeProperty(name);
    if (name === '--panel-type') panel.style.setProperty(name, String(base));
    return old;
  };
  panel.style.setProperty('--ui-scale', String(scale));
  panel.style.setProperty('--panel-type', String(base));
  return { panel, body, type, base };
}

describe('fitPanel', () => {
  it('leaves the base in place where the rows fit', () => {
    const { panel, body, type, base } = mounted(1.5, 300, 400);
    fitPanel(panel as unknown as HTMLElement, body as unknown as HTMLElement);
    assert.equal(type(), base);
  });

  it('floors the type at the lowest setting’s size as drawn at this scale', () => {
    const { panel, body, type } = mounted(2, 400, 100);
    fitPanel(panel as unknown as HTMLElement, body as unknown as HTMLElement);
    assert.equal(type(), PANEL_TYPE_FLOOR / 2);
  });

  it('grows back to the base once the room returns', () => {
    const { panel, body, type, base } = mounted(1.5, 400, 260);
    fitPanel(panel as unknown as HTMLElement, body as unknown as HTMLElement);
    assert.ok(type() < base, 'yielded while short');
    body.clientHeight = 600;
    fitPanel(panel as unknown as HTMLElement, body as unknown as HTMLElement);
    assert.equal(type(), base, 'and grew back');
  });
});
