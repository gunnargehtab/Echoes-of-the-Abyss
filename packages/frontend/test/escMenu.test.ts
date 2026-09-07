/**
 * The esc menu (#494) — docs/ui-ux.md §9.5.
 *
 * §9.5's contract is four rules, and three of them are reachable with no DOM:
 * the menu is a modal dialog and says so; Escape steps back the way it came in
 * rather than closing everything at once; and Return to port is **armed, never
 * instant** — the first press names the cost, the second pays it. Each has the
 * same failure mode, which is a player losing a seat they meant to keep.
 *
 * The fourth is focus, and #515 split it in three, because the three parts
 * have different answers and only one of them ever needed a DOM.
 *
 * - **Where the menu *places* focus** is asserted below. It is what the
 *   component controls and it needs no jsdom — only that `createNodeMock`
 *   stop merging the two `menu-entry` buttons into one node, which is what
 *   made this unassertable and is now fixed in `support/screen.ts`.
 * - **That everything under the glass goes `inert`** is a write on the
 *   `.game-under` host, and belongs to the shell that makes it:
 *   `gameCanvas.test.ts`.
 * - **That Tab cannot walk out of the dialog** is a fact about a real engine.
 *   jsdom models neither `inert` nor sequential focus navigation, so it is
 *   asserted in the browser the run-game skill already drives
 *   (`.claude/skills/run-game/scripts/escFocus.mjs`) or nowhere. The foot of
 *   `support/screen.ts` carries the research.
 *
 * So what is still out of reach here is where focus *actually is* — this
 * renderer has no `document.activeElement`. "The menu called focus() on Stay"
 * is what the assertions below claim, and it is the claim with the teeth: if
 * that broke, a player leaves a match they meant to stay in on one keypress.
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

/**
 * The accessible name of the entry the menu last placed focus on.
 *
 * Names rather than nodes, because the two entries in question are siblings
 * with the same class and the same shape — the name is the only thing that
 * tells "the way out" from "the way back in", which is the whole distinction
 * §9.5 is making.
 */
function focusedEntry(view: Rendered): string | null {
  return view.focused()?.name ?? null;
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

describe('the esc menu: where it puts the keyboard', () => {
  it('opens on the cheapest exit', async () => {
    // §9.5: focus is moved into the dialog, and the entry it lands on is the
    // one that costs nothing — a menu opened by mistake closes on one Return.
    const { view } = await escMenu();
    try {
      assert.match(focusedEntry(view) ?? '', /Return to the water/);
    } finally {
      await view.unmount();
    }
  });

  it('arms onto Stay, so the Enter that armed it cannot be the Enter that leaves', async () => {
    // The rule with teeth (§9.5). Arming and leaving are one keypress apart on
    // a keyboard, and the only thing between them is which button holds the
    // focus — land on Abandon and a held Return spends the seat.
    const { view, doors } = await escMenu();
    try {
      await click(view, 'Return to port');
      assert.equal(focusedEntry(view), 'Stay');
      assert.equal(doors.exits, 0, 'and nothing has been spent to find that out');
    } finally {
      await view.unmount();
    }
  });

  it('re-places focus on the way back from the port screens, in either state', async () => {
    // One effect covers both branches, "so returning from the port screens
    // re-places focus whatever state the entry is in". A player who opened
    // Settings and stepped back would otherwise be holding a keyboard the
    // menu no longer answers, on the one screen §9.5 says must answer it.
    for (const armed of [false, true]) {
      const { view } = await escMenu();
      try {
        if (armed) await click(view, 'Return to port');
        const before = view.focuses().length;

        await click(view, 'Settings');
        assert.equal(view.focuses().length, before, 'the port screen places its own');

        await escape(view);
        assert.equal(
          focusedEntry(view),
          armed ? 'Stay' : 'Return to the water Close the menu. Esc does the same',
          `stepping back re-placed focus with the entry ${armed ? 'armed' : 'idle'}`
        );
      } finally {
        await view.unmount();
      }
    }
  });

  it('takes the keyboard back to the cheapest exit when the match resolves', async () => {
    // The arming drops when the match resolves (§9.5), which re-runs the one
    // focus effect. The entry the player was reading no longer exists, so the
    // menu has to say where the keyboard went — and the answer §9.5 gives for
    // an un-armed root face is the entry that costs nothing.
    const { view, doors } = await escMenu(false);
    try {
      await click(view, 'Return to port');
      const armedOn = view.focuses().length;

      await view.update(
        createElement(EscMenu, {
          ended: true,
          onResume: () => doors.resumes++,
          onExit: () => doors.exits++,
        })
      );
      assert.equal(entries(view).includes('Stay'), false, 'the arming dropped');
      assert.ok(view.focuses().length > armedOn, 'and the one focus effect ran again');
      assert.match(focusedEntry(view) ?? '', /Return to the water/, 'onto the cheapest exit');
    } finally {
      await view.unmount();
    }
  });
});
