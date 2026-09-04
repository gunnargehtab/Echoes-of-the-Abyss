/**
 * The campaign board's model (#374) — docs/ui-ux.md §14, "The campaign board".
 *
 * Three things here are rules rather than rendering, and each fails silently:
 *
 * - **The count and the shape.** §1's count is 1 + 4×7 and the prologue is one
 *   slot spanning the four, not a first slot repeated in each. A board that
 *   drew it four times would draw a mission that does not exist three times,
 *   and nothing about that looks wrong on screen.
 * - **What decides a slot's state.** `available` and `unbuilt` are properties
 *   of what has shipped, read off the catalogue; a title hard-coded as built
 *   would offer a door onto nothing. And `played` is the only fact about the
 *   player on this screen, so it must come from the record and from nowhere
 *   else.
 * - **The traversal.** One tab stop and a roving tabindex means the arrows are
 *   the only way to reach twenty-eight of the twenty-nine slots. An off-by-one
 *   at an edge does not throw; it makes a mission unreachable by keyboard.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSION_HEADERS } from '@echoes/shared';
import {
  buildBoard,
  initialFocus,
  isOpenable,
  moveFocus,
  slotAt,
  type BoardFocus,
  type CampaignBoard,
} from '../src/menu/campaignBoard.ts';

/** Nothing played — a first boot, or a cleared browser. */
const nothingPlayed = () => false;

const allSlots = (board: CampaignBoard) => [
  board.prologue,
  ...board.columns.flatMap((column) => column.slots),
];

describe('the shape of the board', () => {
  it('renders campaign.md §1s count: one prologue and four columns of seven', () => {
    const board = buildBoard(nothingPlayed);
    assert.equal(board.columns.length, 4);
    for (const column of board.columns) {
      assert.equal(column.slots.length, 7, column.campaign);
      // Slots inside a column carry §4–§7's numbers; the columns carry none
      // against each other, which is why the ordinals restart at 1.
      assert.deepEqual(
        column.slots.map((slot) => slot.ordinal),
        [1, 2, 3, 4, 5, 6, 7]
      );
    }
    assert.equal(allSlots(board).length, 29);
  });

  it('gives the prologue one slot rather than one per column', () => {
    const board = buildBoard(nothingPlayed);
    assert.equal(board.prologue.campaign, 'prologue');
    // No column repeats it. If one did, the board would be asserting four
    // prologues where campaign.md §1 lists one.
    for (const column of board.columns) {
      assert.ok(!column.slots.some((slot) => slot.campaign === 'prologue'));
    }
  });

  it('keys every slot uniquely, because the roving tabindex is held by the key', () => {
    const keys = allSlots(buildBoard(nothingPlayed)).map((slot) => slot.key);
    assert.equal(new Set(keys).size, keys.length);
  });
});

describe('which slots open', () => {
  it('opens exactly the missions the catalogue has shipped', () => {
    const board = buildBoard(nothingPlayed);
    const opened = allSlots(board)
      .filter(isOpenable)
      .map((slot) => slot.missionId);
    assert.deepEqual([...opened].sort(), MISSION_HEADERS.map((header) => header.id).sort());
  });

  it('leaves every other slot unbuilt, with no mission behind it', () => {
    for (const slot of allSlots(buildBoard(nothingPlayed))) {
      if (slot.state !== 'unbuilt') continue;
      assert.equal(slot.missionId, undefined, slot.key);
    }
  });

  it('quotes the mission’s own premise on a door that opens', () => {
    const board = buildBoard(nothingPlayed);
    // §14: the line is quoted from existing material, never written for the
    // board. For a slot that opens, the material is the mission's premise.
    for (const slot of allSlots(board)) {
      if (slot.missionId === undefined) continue;
      const header = MISSION_HEADERS.find((entry) => entry.id === slot.missionId);
      assert.equal(slot.line, header?.premise, slot.key);
    }
  });

  it('says something on every slot, opened or not', () => {
    // On a board where most slots are unbuilt the reason lines are most of the
    // text on screen, and a blank one is the loading-screen failure §14 names.
    for (const slot of allSlots(buildBoard(nothingPlayed))) {
      assert.ok(slot.title.length > 0, slot.key);
      assert.ok(slot.line.length > 0, slot.key);
    }
  });
});

describe('what the record is allowed to change', () => {
  it('ticks a played mission and leaves it playable', () => {
    const prologueId = buildBoard(nothingPlayed).prologue.missionId;
    assert.ok(prologueId !== undefined);
    const board = buildBoard((id) => id === prologueId);
    assert.equal(board.prologue.state, 'played');
    // Played is available's treatment plus a tick, so the door still opens.
    assert.ok(isOpenable(board.prologue));
  });

  it('never turns an unbuilt slot into a door, however much has been played', () => {
    // The record answers "has this been finished", never "does this exist".
    // A record claiming a mission this build does not have — which the store
    // deliberately keeps — must not manufacture a slot to open.
    const everything = buildBoard(() => true);
    const nothing = buildBoard(nothingPlayed);
    assert.deepEqual(
      allSlots(everything)
        .filter((slot) => slot.state === 'unbuilt')
        .map((slot) => slot.key),
      allSlots(nothing)
        .filter((slot) => slot.state === 'unbuilt')
        .map((slot) => slot.key)
    );
  });
});

describe('the keyboard', () => {
  const board = buildBoard(nothingPlayed);

  it('lands on a door that opens', () => {
    // §14: the first thing a keyboard reaches should be a door that opens.
    const focus = initialFocus(board);
    assert.ok(isOpenable(slotAt(board, focus)), 'entry lands on an unbuilt slot');
  });

  it('moves between columns and within them', () => {
    const start: BoardFocus = { column: 1, row: 3 };
    assert.deepEqual(moveFocus(start, 'ArrowLeft'), { column: 0, row: 3 });
    assert.deepEqual(moveFocus(start, 'ArrowRight'), { column: 2, row: 3 });
    assert.deepEqual(moveFocus(start, 'ArrowUp'), { column: 1, row: 2 });
    assert.deepEqual(moveFocus(start, 'ArrowDown'), { column: 1, row: 4 });
    assert.deepEqual(moveFocus(start, 'Home'), { column: 1, row: 0 });
    assert.deepEqual(moveFocus(start, 'End'), { column: 1, row: 7 });
  });

  it('treats the prologue as the top of every column', () => {
    // Up from slot 1 reaches it and Down goes back into the column it was
    // reached from, so the lane needs no way in or out of its own.
    assert.deepEqual(moveFocus({ column: 2, row: 1 }, 'ArrowUp'), { column: 2, row: 0 });
    assert.deepEqual(moveFocus({ column: 2, row: 0 }, 'ArrowDown'), { column: 2, row: 1 });
    // It spans the four, so there is nothing beside it.
    assert.deepEqual(moveFocus({ column: 2, row: 0 }, 'ArrowLeft'), { column: 2, row: 0 });
    assert.deepEqual(moveFocus({ column: 2, row: 0 }, 'ArrowRight'), { column: 2, row: 0 });
  });

  it('clamps at every edge rather than wrapping', () => {
    assert.deepEqual(moveFocus({ column: 0, row: 4 }, 'ArrowLeft'), { column: 0, row: 4 });
    assert.deepEqual(moveFocus({ column: 3, row: 4 }, 'ArrowRight'), { column: 3, row: 4 });
    assert.deepEqual(moveFocus({ column: 0, row: 0 }, 'ArrowUp'), { column: 0, row: 0 });
    assert.deepEqual(moveFocus({ column: 0, row: 7 }, 'ArrowDown'), { column: 0, row: 7 });
  });

  it('reaches all twenty-nine slots with the arrows alone', () => {
    // The board is one tab stop, so anything the arrows cannot reach cannot be
    // reached by a keyboard at all.
    const seen = new Set<string>();
    for (let column = 0; column <= 3; column++) {
      let focus: BoardFocus = { column, row: 0 };
      seen.add(slotAt(board, focus).key);
      for (let step = 0; step < 7; step++) {
        focus = moveFocus(focus, 'ArrowDown') ?? focus;
        seen.add(slotAt(board, focus).key);
      }
    }
    assert.equal(seen.size, 29);
  });

  it('leaves keys it does not claim alone', () => {
    // The caller only calls preventDefault on a move, so Tab still leaves the
    // board for the back control rather than being swallowed by it.
    for (const key of ['Tab', 'Enter', ' ', 'Escape', 'a']) {
      assert.equal(moveFocus({ column: 0, row: 0 }, key), null, key);
    }
  });
});
