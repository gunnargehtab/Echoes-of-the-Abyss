/**
 * The campaign board (#494) — docs/ui-ux.md §14, "The campaign board".
 *
 * `campaignBoard.ts` decides what is on the board and `riftChart.ts` decides
 * where each slot stands; both have suites already, and neither can see the
 * screen wired to them. What is left for this file is everything §14 asks of
 * the *rendering*, and all of it is accessibility rather than looks:
 *
 * - **`aria-disabled`, never `disabled`.** §14 is explicit that `disabled`
 *   would take a slot out of the tab order and out of most of what a screen
 *   reader will let a user do with it, which on a board is a slot that has
 *   vanished rather than one that is dimmed.
 * - **One tab stop for the whole board**, with a roving `tabindex` inside it,
 *   so Tab leaves for the back control rather than walking twenty-nine slots.
 * - **Entering lands on a door that opens**, and mounting does not steal the
 *   focus from the screen the player arrived from.
 * - **The chart is decorative** and loses nothing by it, because every fact on
 *   it is also in a slot's accessible name.
 *
 * None of these is visible in a screenshot, which is why they are here. What a
 * slot looks like in its three treatments is `docs/graphics-standards.md`'s.
 *
 * **The drawing on this screen is deliberately not tested, and the gap is not
 * an oversight.** `RiftChart.tsx` and `FactionGlyph.tsx` — and `MouthMark.tsx`
 * on the title screen, and `main.tsx`, which is four lines of bootstrap — are
 * SVG whose geometry is already pinned where it matters, by `riftChart.test.ts`
 * and `glyph.test.ts`. A test that walked their paths would be a test of
 * markup, and this repository keeps screenshots for how things look. What is
 * checked of the chart here is only what the *board* promises about it: that it
 * is hidden from a screen reader, and that one mark is lit at a time.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { MISSION_HEADERS, PROLOGUE_SORROWGATE_HEADER } from '@echoes/shared';
import './support/headless.ts';
import { click, render, type Rendered } from './support/screen.ts';
import { CampaignScreen } from '../src/menu/CampaignScreen.tsx';
import { groundFor, groundLine } from '../src/menu/riftChart.ts';

/** The prologue's slot title, as docs/campaign.md §3 gives it. */
const PROLOGUE = 'Prologue — Sorrowgate';

interface Doors {
  selected: string[];
  records: number;
  backs: number;
}

/** The board, read against a history of finished missions. */
async function board(played: readonly string[] = []): Promise<{ view: Rendered; doors: Doors }> {
  const doors: Doors = { selected: [], records: 0, backs: 0 };
  const view = await render(
    createElement(CampaignScreen, {
      hasPlayed: (missionId: string) => played.includes(missionId),
      onSelect: (missionId: string) => doors.selected.push(missionId),
      onRecord: () => doors.records++,
      onBack: () => doors.backs++,
    })
  );
  return { view, doors };
}

/** Every slot on the board, in document order. */
function slots(view: Rendered) {
  return view.allByClass('campaign-slot');
}

/** The title of the one slot holding the board's single tab stop. */
function tabStop(view: Rendered): string {
  const current = slots(view).filter((slot) => slot.props.tabIndex === 0);
  assert.equal(current.length, 1, 'exactly one slot is in the tab order');
  return String(current[0]!.findByProps({ className: 'campaign-slot-title' }).props.children);
}

/** Press a key on the grid, as a player traversing the board would. */
async function arrow(view: Rendered, key: string): Promise<void> {
  const grid = view.byClass('campaign-board');
  await view.act(() => {
    (grid.props as { onKeyDown?: (event: unknown) => void }).onKeyDown?.({
      key,
      preventDefault() {},
    });
  });
}

describe('the campaign board: what is on it', () => {
  it('draws campaign.md §1’s count, with the prologue once rather than four times', async () => {
    // §14: "The prologue is one slot spanning the four rather than a first
    // slot repeated in each … drawing it four times would draw a mission that
    // does not exist three times."
    const { view } = await board();
    try {
      assert.equal(slots(view).length, 29, 'one prologue and four columns of seven');
      const prologues = view
        .allByClass('campaign-slot-title')
        .filter((title) => String(title.props.children) === PROLOGUE);
      assert.equal(prologues.length, 1);
      assert.equal(view.allByClass('campaign-cell-lane').length, 1, 'and it spans the four');
    } finally {
      await view.unmount();
    }
  });

  it('names four campaigns whose heads open nothing', async () => {
    // §14, "Keyboard": "A column head is not a stop — it names a campaign, it
    // does not open one." So it carries its commander line and no control.
    const { view } = await board();
    try {
      const heads = view.allByClass('campaign-head');
      assert.equal(heads.length, 4);
      for (const head of heads) {
        assert.equal(head.props.role, 'columnheader');
        assert.equal(head.findAll((node) => node.type === 'button').length, 0);
      }
    } finally {
      await view.unmount();
    }
  });
});

describe('the campaign board: dimmed is not unreachable', () => {
  it('never puts a slot on a DOM `disabled`, whatever state it is in', async () => {
    // §14: "On the board a slot is `aria-disabled=\"true\"` and never
    // `disabled`" — focusable, announced with its reason, inert on activation.
    //
    // Every one of the twenty-nine has a mission behind it today, so the
    // `aria-disabled` branch itself is unreachable from here and
    // `campaignBoard.test.ts` holds the state that would set it. What stays
    // checkable is the half that would actually regress: a `disabled`
    // appearing on this screen, which is one keystroke away in the JSX and
    // would silently delete twenty-eight slots for a keyboard.
    const { view } = await board();
    try {
      for (const slot of slots(view)) {
        assert.equal(
          (slot.props as { disabled?: boolean }).disabled,
          undefined,
          'every slot stays reachable, dimmed or not'
        );
      }
      assert.equal(
        view.root.findAll((node) => node.type === 'button' && node.props.disabled === true).length,
        0
      );
    } finally {
      await view.unmount();
    }
  });

  it('reads the state and the ground into every slot’s accessible name', async () => {
    // §14, "The chart": "Every fact on it is also in the slot's accessible
    // name, after the state: *Available · The Kell Shoulder · 340 m · the
    // plateaus' water*." That sentence is what lets the chart be `aria-hidden`
    // without costing anybody a fact, so it is checked here rather than
    // assumed.
    const { view } = await board([PROLOGUE_SORROWGATE_HEADER.id]);
    try {
      const ground = groundFor(PROLOGUE_SORROWGATE_HEADER.mapId);
      assert.ok(ground !== undefined, 'the prologue stands on a ground the chart knows');
      const name = String(view.allByClass('campaign-slot-state')[0]!.props.children);
      assert.equal(name, `Played · ${groundLine(ground)}`);

      const states = view
        .allByClass('campaign-slot-state')
        .map((node) => String(node.props.children).split(' · ')[0]);
      assert.equal(states.length, 29, 'every slot says what it is, not only the dimmed ones');
      assert.deepEqual(
        [...new Set(states.slice(1))],
        ['Available'],
        'and one played mission does not change what the others are'
      );
    } finally {
      await view.unmount();
    }
  });

  it('keeps a played mission playable, with the tick added rather than substituted', async () => {
    // §14's state table: "Available's treatment, plus one cyan registration
    // tick in the corner. Cyan tells you; a played mission stays playable, so
    // it keeps the ask as well."
    const { view, doors } = await board([PROLOGUE_SORROWGATE_HEADER.id]);
    try {
      const prologue = slots(view)[0]!;
      assert.match(String(prologue.props.className), /campaign-slot-played/);
      const tick = prologue.findByProps({ className: 'campaign-slot-tick' });
      assert.equal(tick.props['aria-hidden'], 'true', 'the tick is ink, and the word carries it');

      await view.act(() => {
        (prologue.props as { onClick?: () => void }).onClick?.();
      });
      assert.deepEqual(doors.selected, [PROLOGUE_SORROWGATE_HEADER.id], 'and it still opens');
    } finally {
      await view.unmount();
    }
  });
});

describe('the campaign board: one tab stop, and the arrows inside it', () => {
  it('lands on a door that opens without taking focus from the screen behind', async () => {
    // Two rules at once, and they pull against each other: §14 wants the
    // board's first stop to be an openable slot, and mounting must not move
    // the player's focus — the board is a screen they arrived at, not a dialog
    // that interrupted them. The roving tabindex says where, `armed` says
    // whether to pull.
    const { view } = await board();
    try {
      assert.equal(tabStop(view), PROLOGUE, '§14: "the prologue, today"');
      assert.equal(view.focused(), null, 'and nothing was focused by rendering');
    } finally {
      await view.unmount();
    }
  });

  it('moves the stop with the arrows, and pulls focus once a key has been pressed', async () => {
    const { view } = await board();
    try {
      await arrow(view, 'ArrowDown');
      assert.notEqual(tabStop(view), PROLOGUE, 'Down left the lane for the first column');
      assert.notEqual(view.focused(), null, 'and the board now holds the focus it moved');

      const first = tabStop(view);
      await arrow(view, 'ArrowRight');
      assert.notEqual(tabStop(view), first, 'Right crossed to the next campaign');

      await arrow(view, 'Home');
      assert.equal(tabStop(view), PROLOGUE, 'Home is the prologue, the top of every column');
    } finally {
      await view.unmount();
    }
  });

  it('leaves a key the board does not claim to the browser', async () => {
    // `moveFocus` returns null for those, and the handler has to leave the
    // event alone rather than swallow it — Tab is how the player reaches the
    // back control, and a board that preventDefault'd it would trap them.
    const { view } = await board();
    let defaults = 0;
    try {
      const grid = view.byClass('campaign-board');
      await view.act(() => {
        (grid.props as { onKeyDown?: (event: unknown) => void }).onKeyDown?.({
          key: 'Tab',
          preventDefault: () => defaults++,
        });
      });
      assert.equal(defaults, 0);
      assert.equal(tabStop(view), PROLOGUE, 'and the stop did not move');
    } finally {
      await view.unmount();
    }
  });
});

describe('the campaign board: the chart beside it', () => {
  it('is decorative, because the slots already say everything on it', async () => {
    const { view } = await board();
    try {
      assert.equal(view.byClass('campaign-chart').props['aria-hidden'], 'true');
    } finally {
      await view.unmount();
    }
  });

  it('lights the hovered slot, else the focused one', async () => {
    // §14: "One mark is lit at a time — the hovered slot, else the focused one
    // … so the keyboard and the mouse read the same chart and the pointer's
    // last position never pins it."
    const { view } = await board();
    try {
      assert.equal(
        String(view.byClass('campaign-chart-title').props.children),
        PROLOGUE,
        'the focused slot, with nothing hovered'
      );

      const other = slots(view).at(-1)!;
      const title = String(other.findByProps({ className: 'campaign-slot-title' }).props.children);
      await view.act(() => {
        (other.props as { onMouseEnter?: () => void }).onMouseEnter?.();
      });
      assert.equal(String(view.byClass('campaign-chart-title').props.children), title);

      await view.act(() => {
        (other.props as { onMouseLeave?: () => void }).onMouseLeave?.();
      });
      assert.equal(
        String(view.byClass('campaign-chart-title').props.children),
        PROLOGUE,
        'and the pointer leaving gives the chart back to the keyboard'
      );
    } finally {
      await view.unmount();
    }
  });

  it('reads the lit slot’s ground at a reading size, in the chart’s own words', async () => {
    const { view } = await board();
    try {
      const ground = groundFor(PROLOGUE_SORROWGATE_HEADER.mapId)!;
      assert.equal(String(view.byClass('campaign-chart-ground').props.children), ground.name);
      assert.match(
        (view.byClass('campaign-chart-facts').props.children as unknown[]).join(''),
        new RegExp(`m · ${ground.whose}$`),
        'the depth and whose water, as world-map.md §3 gives them'
      );
    } finally {
      await view.unmount();
    }
  });
});

describe('the campaign board: what commits, and what comes back', () => {
  it('opens the briefing rather than a match', async () => {
    // §14, "What commits, and what comes back": activating a slot commits to
    // the briefing, never to a match. The board hands over a mission id and
    // nothing else — no map, no room, no seat.
    const { view, doors } = await board();
    try {
      const ledger = slots(view)[1]!;
      await view.act(() => {
        (ledger.props as { onClick?: () => void }).onClick?.();
      });
      assert.equal(doors.selected.length, 1);
      assert.ok(
        MISSION_HEADERS.some((header) => header.id === doors.selected[0]),
        'and it is a mission the catalogue actually holds'
      );
    } finally {
      await view.unmount();
    }
  });

  it('carries the two doors out: the record between missions, and back', async () => {
    const { view, doors } = await board();
    try {
      await click(view, 'The record');
      assert.deepEqual([doors.records, doors.backs, doors.selected.length], [1, 0, 0]);
      await click(view, 'Back');
      assert.deepEqual([doors.records, doors.backs], [1, 1]);
    } finally {
      await view.unmount();
    }
  });
});
