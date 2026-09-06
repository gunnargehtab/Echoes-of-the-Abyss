/**
 * The esc menu (#494) — docs/ui-ux.md §9.5.
 *
 * §9.5's contract is four rules, and three of them are reachable with no DOM:
 * the menu is a modal dialog and says so; Escape steps back the way it came in
 * rather than closing everything at once; and Return to port is **armed, never
 * instant** — the first press names the cost, the second pays it. Each has the
 * same failure mode, which is a player losing a seat they meant to keep.
 *
 * The fourth is focus, and it is honestly out of reach here. `EscMenu` places
 * focus on Stay while the leave entry is armed, "so the Enter that armed it
 * cannot also be the Enter that leaves" — but this renderer has no
 * `document.activeElement`, no tab order and no `inert`, and its host nodes are
 * keyed by class name, so the two `menu-entry` buttons that would have to be
 * told apart are one node. **"Focus is actually there" and "Tab cannot walk
 * under the glass onto a live button" are unobservable without jsdom**, which
 * #494 names as a separate decision. What is asserted below is everything that
 * does not depend on where focus is; nothing here should be read as covering
 * it.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import {
  clearStorage,
  dispatchWindow,
  installStorage,
  windowListenerCount,
} from './support/headless.ts';
import { click, render, type Rendered } from './support/screen.ts';
import { EscMenu } from '../src/game/EscMenu.tsx';

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  clearStorage();
});

interface Doors {
  resumes: number;
  exits: number;
}

async function escMenu(ended = false): Promise<{ view: Rendered; doors: Doors }> {
  const doors: Doors = { resumes: 0, exits: 0 };
  const view = await render(
    createElement(EscMenu, {
      ended,
      onResume: () => doors.resumes++,
      onExit: () => doors.exits++,
    })
  );
  return { view, doors };
}

/** Press Escape, as the player who opened this menu would. */
async function escape(view: Rendered): Promise<void> {
  await view.act(() => {
    dispatchWindow('keydown', { code: 'Escape', preventDefault() {} });
  });
}

/** The entry labels on whichever face the menu is showing. */
function entries(view: Rendered): string[] {
  return view.allByClass('menu-entry-label').map((node) => String(node.props.children));
}

describe('the esc menu: what it announces itself as', () => {
  it('is a modal dialog over a match that is still running', async () => {
    // §9.5: glass rather than blackout, "because the match is still running
    // behind it and must read as such: there is no pause". The subtitle is the
    // only place that is said in words, so it is the one string held here.
    const { view } = await escMenu();
    try {
      const dialog = view.byClass('menu-screen');
      assert.equal(dialog.props.role, 'dialog');
      assert.equal(dialog.props['aria-modal'], 'true');
      assert.equal(dialog.props['aria-label'], 'Menu');
      assert.ok(view.shows('The water does not wait — the match runs on while you are here.'));
    } finally {
      await view.unmount();
    }
  });

  it('stops claiming a clock that has stopped is running', async () => {
    const { view } = await escMenu(true);
    try {
      assert.ok(view.shows('The water has settled — the match is decided.'));
    } finally {
      await view.unmount();
    }
  });

  it('gives the water its keyboard back on the way out', async () => {
    // The Escape listener is on `window`, so a menu that left one behind would
    // go on answering the key after it closed, and every reopening would add
    // another answer.
    const idle = windowListenerCount();
    const { view, doors } = await escMenu();
    assert.ok(windowListenerCount() > idle, 'the menu is listening while it is open');

    await view.unmount();
    assert.equal(windowListenerCount(), idle, 'and stops when it goes');
    await escape(view);
    assert.equal(doors.resumes, 0, 'a closed menu resumes nothing');
  });
});

describe('the esc menu: Escape steps back the way it came', () => {
  it('walks controls to settings to the menu, and only then to the water', async () => {
    // §9.5: Esc steps back one level. A menu that closed outright from three
    // screens deep would drop a player into the water mid-rebind.
    const { view, doors } = await escMenu();
    try {
      await click(view, 'Controls');
      assert.equal(view.byClass('menu-screen').props['aria-label'], 'Controls', 'the rebinder');

      await escape(view);
      assert.equal(
        view.byClass('menu-screen').props['aria-label'],
        'Settings',
        'controls stepped back to settings'
      );
      assert.equal(doors.resumes, 0);

      await escape(view);
      assert.ok(entries(view).includes('Return to the water'), 'and settings to the menu');
      assert.equal(doors.resumes, 0, 'still nothing has resumed');

      await escape(view);
      assert.equal(doors.resumes, 1, 'the last step is the water');
    } finally {
      await view.unmount();
    }
  });
});

describe('the esc menu: a seat left on purpose is not held', () => {
  it('arms the leave entry rather than taking it', async () => {
    // §1.5 and §9.5: "the first press names the cost, the second one pays it".
    // The cost is a seat — §14's Resume clears with it — so a single press
    // that left the match would be the shell spending something it cannot
    // give back.
    const { view, doors } = await escMenu();
    try {
      await click(view, 'Return to port');
      assert.equal(doors.exits, 0, 'nothing has been spent yet');
      assert.ok(
        view.shows('A seat left on purpose is not held. The match goes on without you.'),
        'and the cost is named before it is paid'
      );
      assert.equal(
        view.byClass('esc-menu-warning').props.role,
        'alert',
        '§11: announced, because focus moves past it to Stay'
      );

      await click(view, 'Abandon the water');
      assert.equal(doors.exits, 1);
    } finally {
      await view.unmount();
    }
  });

  it('backs out of the cost by the two nearest exits', async () => {
    for (const back of ['Stay', 'escape'] as const) {
      const { view, doors } = await escMenu();
      try {
        await click(view, 'Return to port');
        if (back === 'Stay') await click(view, 'Stay');
        else await escape(view);

        assert.equal(view.allByClass('esc-menu-confirm').length, 0, `${back} disarmed it`);
        assert.deepEqual(
          [doors.exits, doors.resumes],
          [0, 0],
          'backing out of a cost is not leaving, and not resuming either'
        );
      } finally {
        await view.unmount();
      }
    }
  });

  it('drops the arming when the match resolves under it', async () => {
    // §9.5: a resolved match "has already spent everything the leave entry
    // could cost", so the arming is not merely unnecessary — the cost it named
    // no longer exists, and leaving it on screen would be a lie about the seat.
    const { view, doors } = await escMenu(false);
    try {
      await click(view, 'Return to port');
      assert.equal(view.allByClass('esc-menu-confirm').length, 1);

      await view.update(
        createElement(EscMenu, {
          ended: true,
          onResume: () => doors.resumes++,
          onExit: () => doors.exits++,
        })
      );
      assert.equal(view.allByClass('esc-menu-confirm').length, 0);

      await click(view, 'Return to port');
      assert.equal(doors.exits, 1, 'and a decided match leaves on one press');
    } finally {
      await view.unmount();
    }
  });
});
