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
import { Faction, MissionOutcome, PROLOGUE_SORROWGATE_HEADER } from '@echoes/shared';
import { PALETTES, setActivePalette, type PaletteName } from '../src/game/palette.ts';
import { recordMissionResult } from '../src/progression/store.ts';
import { clearStorage, installStorage, setSearch } from './support/headless.ts';
import { installHeadlessAudio, uninstallHeadlessAudio } from './support/headlessAudio.ts';
import { click, render, type Rendered } from './support/screen.ts';
import App from '../src/App.tsx';
import { reloadForRetry } from '../src/menu/launch.ts';
import { saveSettings } from '../src/settings/store.ts';

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

  it("reopens on the board after a board launch's load-failure Retry, once (§7.6)", async () => {
    // A browser keeps a failed module fetch for the page's life, so Retry
    // reloads; the board launch's note brings it back to the board.
    const g = globalThis as unknown as { window: { location: { reload?: () => void } } };
    let reloads = 0;
    g.window.location.reload = () => void (reloads += 1);
    try {
      reloadForRetry(PROLOGUE_SORROWGATE_HEADER.id);
      assert.equal(reloads, 1, 'Retry reloads the page');
      const view = await shell();
      try {
        assert.ok(view.allByClass('campaign-slot').length > 0, 'on the board, not the title');
      } finally {
        await view.unmount();
      }
      const again = await shell();
      try {
        assert.ok(again.shows(TITLE), 'the note was one-shot: the next load is the title');
      } finally {
        await again.unmount();
      }
      // Any other launch's Retry reloads with no note: a direct link's own
      // address re-enters its match, and a title launch opens on the title.
      reloadForRetry(PROLOGUE_SORROWGATE_HEADER.id);
      reloadForRetry(undefined);
      assert.equal(reloads, 3);
      const plain = await shell();
      try {
        assert.ok(plain.shows(TITLE));
      } finally {
        await plain.unmount();
      }
      reloadForRetry(PROLOGUE_SORROWGATE_HEADER.id);
      const linked = await shell(`?mission=${PROLOGUE_SORROWGATE_HEADER.id}`);
      try {
        assert.equal(linked.shows(TITLE), false, 'a direct link still goes into the water');
        assert.equal(linked.allByClass('campaign-slot').length, 0, 'not the board');
      } finally {
        await linked.unmount();
      }
    } finally {
      delete g.window.location.reload;
    }
  });
});

/**
 * The colour-vision palette is module state (palette.ts), and the board, its
 * chart and the briefing read it at render. A page that has mounted no match
 * yet must still be in the player's palette (docs/ui-ux.md §11, §14).
 */
describe('the shell: the colour-vision palette off the water', () => {
  /** The board's column heads' inks, in board order. */
  const heads = (view: Rendered): string[] =>
    view.allByClass('campaign-head').map((head) => head.props.style['--faction']);
  /** The four columns' glows in one palette, in the same order. */
  const glows = (name: PaletteName): string[] =>
    [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron].map(
      (faction) => `#${PALETTES[name].faction[faction].glow.toString(16).padStart(6, '0')}`
    );

  afterEach(() => setActivePalette('standard'));

  it('inks the board in the stored palette on a fresh page', async () => {
    saveSettings({ palette: 'deuteranopia' });
    // A fresh page: nothing has applied the stored choice yet.
    setActivePalette('standard');
    const view = await shell();
    try {
      await click(view, 'Campaign');
      assert.deepEqual(heads(view), glows('deuteranopia'));
      // The first Ledger slot's briefing, spoken in a navy's register.
      const slot = view.allByClass('campaign-slot').at(1);
      assert.ok(slot !== undefined, 'the board has a Ledger slot');
      await view.act(() => {
        (slot.props as { onClick?: () => void }).onClick?.();
      });
      const speaker = view.byClass('briefing-speaker').props.style['--faction'];
      assert.ok(glows('deuteranopia').includes(speaker), `the briefing's ink ${speaker}`);
    } finally {
      await view.unmount();
    }
  });

  it('inks the board in a palette chosen in Settings, with no match between', async () => {
    const view = await shell();
    try {
      await click(view, 'Campaign');
      assert.deepEqual(heads(view), glows('standard'));
      await click(view, 'Back');
      await click(view, 'Settings');
      await click(view, 'Tritanopia');
      await click(view, 'Back');
      await click(view, 'Campaign');
      assert.deepEqual(heads(view), glows('tritanopia'));
    } finally {
      await view.unmount();
    }
  });
});

describe('the shell: Back returns through the door it came in by', () => {
  it('opens saved conclusions from the board without starting another mission', async () => {
    const epilogue = 'The continuance carried.\n\nThe record has a gap.';
    recordMissionResult({
      missionId: 'ledger-item-nine',
      outcome: MissionOutcome.Complete,
      epilogue,
      objectives: [],
    });
    const view = await shell();
    try {
      await click(view, 'Campaign');
      await click(view, 'The record');
      assert.equal(view.byClass('record-conclusion-reading').props.children, epilogue);
      await click(view, 'Back');
      await click(view, 'The record');
      assert.equal(view.byClass('record-conclusion-reading').props.children, epilogue);
    } finally {
      await view.unmount();
    }
  });

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

/**
 * A launch from the board (docs/world-map.md §7.6, #1462), by its end states.
 * No WebGL here, so the world is not drawn and a travel arrives at once: the
 * order of a travel is `launch.ts`'s and worldTravel.test.ts's to hold. What
 * this holds is that every door still reaches the water, and which screens
 * the world is drawn behind.
 */
describe('the shell: the world behind the board', () => {
  /** Wait, a few milliseconds at a time, for the shell to reach a state. */
  async function until(view: Rendered, done: () => boolean, what: string): Promise<void> {
    for (let waited = 0; waited < 5_000; waited += 20) {
      if (done()) return;
      await view.act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    }
    assert.fail(`timed out waiting for ${what}`);
  }
  /** The match screen, as a runner with no WebGL draws it. */
  const inMatch = (view: Rendered) =>
    view.shows('Listening…') || view.shows('No light in the water');

  async function boardBriefing(view: Rendered): Promise<void> {
    await click(view, 'Campaign');
    const slot = view.allByClass('campaign-slot').at(0)!;
    await view.act(() => {
      (slot.props as { onClick?: () => void }).onClick?.();
    });
  }

  it("reaches the water from the board's prologue, by way of its travel", async () => {
    const view = await shell();
    try {
      await boardBriefing(view);
      await click(view, 'Descend');
      await until(view, () => inMatch(view), 'the join');
      assert.equal(view.allByClass('travel-bar').length, 0, 'the travel is over');
    } finally {
      await view.unmount();
    }
  });

  it("reaches the water from the Tutorial door's briefing, with no travel", async () => {
    const view = await shell();
    try {
      await click(view, 'Tutorial');
      await click(view, 'Descend');
      assert.equal(view.allByClass('travel-bar').length, 0, 'no travel from the title');
      await until(view, () => inMatch(view), 'the join');
    } finally {
      await view.unmount();
    }
  });

  it('returns to the board from a board launch, and to the title from the Tutorial door', async () => {
    // §7.6 step 4: Return to port goes back where the mission was launched.
    // On this runner the match has no WebGL, and its Return to port is the
    // same exit the result's and the menu's are.
    const view = await shell();
    try {
      await boardBriefing(view);
      await click(view, 'Descend');
      await until(view, () => inMatch(view), 'the join');
      await click(view, 'Return to port');
      assert.ok(view.allByClass('campaign-slot').length > 0, 'back on the board');
      assert.ok(view.allByClass('app-over-world').length > 0, 'over the world');

      await click(view, 'Back');
      await click(view, 'Tutorial');
      await click(view, 'Descend');
      await until(view, () => inMatch(view), 'the join');
      await click(view, 'Return to port');
      assert.ok(view.shows('Campaign'), 'the title, as before');
      assert.equal(view.allByClass('campaign-slot').length, 0);
    } finally {
      await view.unmount();
    }
  });

  it('reopens the board on the slot left from, with focus, by every way back', async () => {
    // docs/ui-ux.md §14, "Keyboard": an entry lands on the first slot that
    // opens and takes no focus; a return lands on its slot, lit, and takes it.
    const lit = () => view.byClass('campaign-chart-title').props.children as string;
    const focused = () => view.focused()?.name ?? '';
    // The first Ledger slot, which the board titles without its campaign's name.
    const ledger = { id: 'ledger-asset-recovery', name: 'Asset Recovery' };
    const prologue = PROLOGUE_SORROWGATE_HEADER.name;
    const view = await shell();
    try {
      await click(view, 'Campaign');
      assert.equal(lit(), prologue, 'an entry lands on the first slot that opens');
      assert.equal(focused().includes(prologue), false, 'and takes no focus');

      // The record is not a slot: its Back lands as an entry does, and gives
      // focus back to the door that opened it.
      await click(view, 'The record');
      await click(view, 'Back');
      assert.equal(lit(), prologue, "the record's Back lands as an entry does");
      assert.equal(focused(), 'The record', "and focuses the record's door");

      // A briefing's Back, from the first Ledger slot.
      const slot = view.allByClass('campaign-slot').at(1)!;
      await view.act(() => {
        (slot.props as { onClick?: () => void }).onClick?.();
      });
      await click(view, 'Back');
      assert.equal(lit(), ledger.name, "the briefing's Back lands on its slot");
      assert.ok(focused().includes(ledger.name), `focus on it, not ${focused()}`);

      // Return to port, from the prologue's board launch. A travel's Cancel
      // and a failure's Back call the same way back; the shell's travel ends
      // before either can be pressed here, so the GPU drive presses them.
      await click(view, 'Back');
      await boardBriefing(view);
      await click(view, 'Descend');
      await until(view, () => inMatch(view), 'the join');
      await click(view, 'Return to port');
      assert.equal(lit(), prologue);
      assert.ok(focused().includes(prologue), `Return to port focuses it, not ${focused()}`);
    } finally {
      await view.unmount();
    }

    // A load failure's Retry reloads onto the slot its launch left from.
    const g = globalThis as unknown as { window: { location: { reload?: () => void } } };
    g.window.location.reload = () => undefined;
    try {
      reloadForRetry(ledger.id);
      const reopened = await shell();
      try {
        assert.equal(reopened.byClass('campaign-chart-title').props.children, ledger.name);
        assert.ok((reopened.focused()?.name ?? '').includes(ledger.name));
      } finally {
        await reopened.unmount();
      }
    } finally {
      delete g.window.location.reload;
    }
  });

  it('draws the world behind the board and its briefing only', async () => {
    const view = await shell();
    try {
      const overWorld = () => view.allByClass('app-over-world').length > 0;
      assert.equal(overWorld(), false, 'not behind the title');
      await click(view, 'Tutorial');
      assert.equal(overWorld(), false, "not behind the Tutorial door's briefing");
      await click(view, 'Back');
      await boardBriefing(view);
      assert.ok(overWorld(), "behind the board's briefing");
      await click(view, 'Back');
      assert.ok(overWorld(), 'behind the board');
      await click(view, 'The record');
      assert.equal(overWorld(), false, 'not behind the record');
    } finally {
      await view.unmount();
    }
  });
});
