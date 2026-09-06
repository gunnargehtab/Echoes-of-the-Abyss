/**
 * The shell's doors (#494).
 *
 * `App.tsx` is a hand-rolled screen machine with no router, and
 * docs/ui-ux.md §14 is explicit about why: "browser back is still not a door".
 * What replaces a router is a `from` field on the one screen reachable by two
 * routes, and the rule it exists for — **Back returns through the door it came
 * in by** — is the thing this file holds. Nothing else was checking it, and a
 * wrong answer is not a crash: the player simply ends up somewhere they did
 * not come from.
 *
 * These are assertions about the doc's rules, not about the markup. Which
 * button says what is a screenshot's business; where pressing it lands is
 * this file's.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { PROLOGUE_SORROWGATE_HEADER } from '@echoes/shared';
import { clearStorage, installStorage, setSearch } from './support/headless.ts';
import { installHeadlessAudio, uninstallHeadlessAudio } from './support/headlessAudio.ts';
import { click, render, type Rendered } from './support/screen.ts';
import App from '../src/App.tsx';

/** Mount the shell on a given query string. */
async function shell(search = ''): Promise<Rendered> {
  setSearch(search);
  return render(createElement(App));
}

/** The heading each screen is recognisable by. */
const TITLE = 'In the abyss, every echo is a warning.';

beforeEach(() => {
  installStorage();
  installHeadlessAudio();
});

afterEach(() => {
  clearStorage();
  uninstallHeadlessAudio();
  setSearch('');
});

describe('the shell: where it opens', () => {
  it('opens on the title screen with no query string', async () => {
    const view = await shell();
    try {
      assert.ok(view.shows(TITLE), 'the title screen is the front door');
    } finally {
      await view.unmount();
    }
  });

  it('goes straight into the water for `?map=` and `?mission=`', async () => {
    // The developer's door and the harness's, deliberately skipping the
    // fiction — App.tsx says so, and the run-game skill depends on it.
    for (const search of ['?map=smoke-basin', `?mission=${PROLOGUE_SORROWGATE_HEADER.id}`]) {
      const view = await shell(search);
      try {
        assert.equal(view.shows(TITLE), false, `${search} skipped the title`);
      } finally {
        await view.unmount();
      }
    }
  });
});

describe('the shell: Back returns through the door it came in by', () => {
  /**
   * The prologue is one mission behind two doors (docs/campaign.md §3): the
   * title's Tutorial entry, and the board's first slot. Both land on the same
   * briefing, and the *only* difference is where Back goes — which is exactly
   * the rule a router would have got wrong for free.
   */
  it('sends the briefing back to the title when the title opened it', async () => {
    const view = await shell();
    try {
      await click(view, 'Tutorial');
      assert.equal(view.shows(TITLE), false, 'the briefing replaced the title');

      await click(view, 'Back');
      assert.ok(view.shows(TITLE), 'and Back returned to the title');
    } finally {
      await view.unmount();
    }
  });

  it('sends the briefing back to the board when the board opened it', async () => {
    const view = await shell();
    try {
      await click(view, 'Campaign');
      assert.equal(view.shows(TITLE), false, 'the board replaced the title');
      const board = view.text().join(' ');

      // The board's first slot is the same prologue the Tutorial entry opens.
      const slot = view.allByClass('campaign-slot').at(0);
      assert.ok(slot !== undefined, 'the board has a first slot');
      await view.act(() => {
        (slot.props as { onClick?: () => void }).onClick?.();
      });

      await click(view, 'Back');
      assert.equal(
        view.text().join(' '),
        board,
        'Back from a board-opened briefing returns to the board, not the title'
      );
      assert.equal(view.shows(TITLE), false, 'and certainly not to the title');
    } finally {
      await view.unmount();
    }
  });

  it('sends the controls screen back to settings, which is where it came from', async () => {
    const view = await shell();
    try {
      await click(view, 'Settings');
      const settings = view.text().join(' ');
      await click(view, 'Controls');
      assert.notEqual(view.text().join(' '), settings, 'the controls screen opened');

      await click(view, 'Back');
      assert.equal(view.text().join(' '), settings, 'and Back returned to settings');
    } finally {
      await view.unmount();
    }
  });

  it('sends the record back to the board, the one door it has', async () => {
    // §14: "No `from` field, because the result screen it may have come from
    // is gone with the room by the time Back is pressed, and the title is not
    // where a player between missions is."
    const view = await shell();
    try {
      await click(view, 'Campaign');
      const board = view.text().join(' ');
      await click(view, 'The record');
      assert.notEqual(view.text().join(' '), board, 'the record opened');

      await click(view, 'Back');
      assert.equal(view.text().join(' '), board, 'and it leads back to the board');
    } finally {
      await view.unmount();
    }
  });

  it('sends every other screen back to the title', async () => {
    for (const entry of ['Multiplayer', 'Credits']) {
      const view = await shell();
      try {
        await click(view, entry);
        assert.equal(view.shows(TITLE), false, `${entry} opened`);
        await click(view, 'Back');
        assert.ok(view.shows(TITLE), `${entry} returns to the title`);
      } finally {
        await view.unmount();
      }
    }
  });
});
