/**
 * What the shell does with a selection the mission is partly holding
 * (`movementHolds.ts`, #478).
 *
 * The rule is the server's and the tests that hold it are the backend's; what
 * is left over on this side is the half a player actually meets. A right-click
 * on a tender and the flight escorting it is one gesture, and three things have
 * to come out of it: the flight goes, the tender does not, and the player is
 * told which sentence the server refused on — never a fourth thing, a route
 * line painted for a hull that is not going anywhere.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MovementHoldReason, type MovementHold } from '@echoes/shared';
import { holdReasonFor, movableIn } from '../src/game/movementHolds.ts';

const UNESCORTED = 'held — no ears in range';
const UNRELEASED = 'held — not released yet';

/** Tender 7 has no ears; tender 9 is still on the clock; 1 and 2 are the flight. */
const HOLDS: readonly MovementHold[] = [
  { unitId: 7, reason: MovementHoldReason.Unescorted },
  { unitId: 9, reason: MovementHoldReason.Unreleased },
];

describe('movement holds, as the shell reads them', () => {
  it('names the hold on a held hull and nothing on a free one', () => {
    assert.equal(holdReasonFor(HOLDS, 7), UNESCORTED);
    assert.equal(holdReasonFor(HOLDS, 9), UNRELEASED);
    assert.equal(holdReasonFor(HOLDS, 1), null);
  });

  it('moves the rest of a mixed selection rather than refusing it whole', () => {
    const { ids, refused } = movableIn(HOLDS, [1, 7, 2]);
    assert.deepEqual(ids, [1, 2], 'the flight still goes where it was sent');
    assert.equal(refused, UNESCORTED);
  });

  it('keeps the selection order, so a repeated press says the same thing', () => {
    // The first refusal in the selection's own order, not the holds' order:
    // a hint bar that cycled through the reasons on every press would read as
    // flicker rather than as an answer.
    assert.equal(movableIn(HOLDS, [9, 7]).refused, UNRELEASED);
    assert.equal(movableIn(HOLDS, [7, 9]).refused, UNESCORTED);
  });

  it('refuses a selection made entirely of held hulls, and moves nobody', () => {
    const { ids, refused } = movableIn(HOLDS, [7, 9]);
    assert.deepEqual(ids, []);
    assert.equal(refused, UNESCORTED);
  });

  it('costs a skirmish nothing — no holds, every hull moves, no reason', () => {
    const { ids, refused } = movableIn([], [1, 7, 9]);
    assert.deepEqual(ids, [1, 7, 9]);
    assert.equal(refused, null);
  });

  it('hands back a copy, so the caller cannot edit the selection it was given', () => {
    const selection = [1, 2];
    const { ids } = movableIn([], selection);
    ids.push(3);
    assert.deepEqual(selection, [1, 2]);
  });
});
