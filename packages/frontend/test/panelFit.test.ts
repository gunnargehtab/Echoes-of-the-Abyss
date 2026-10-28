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
import { PANEL_TYPE_FLOOR, fitPanelType } from '../src/game/panelFit.ts';

/** `GameCanvas`'s rule, restated so this file need not boot the renderer. */
const panelType = (scale: number) => (scale <= 1 ? 1 : Math.sqrt(scale) / scale);

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
