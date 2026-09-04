/**
 * The walk's arithmetic — docs/mission-convocation.md §4.
 *
 * Pure, and separate from the runtime that spends it, for `sounding.ts`' reason:
 * the rule the mission enforces and the rule a test can state are the same one,
 * written once. The runtime adds what needs a world — which hulls are the
 * plateau's, how loud they are, and whether anybody else is standing here — and
 * nothing else.
 *
 * There is no bearing here and there is deliberately none. A sounding is a tone
 * aimed at a formation; a row is a place somebody is standing. §4's whole
 * arithmetic is about *how loud* the thing standing there is, not which way it
 * is pointed, and adding a cone would be a second rule the document does not
 * have.
 */

import type { MissionWalkRow } from './types.ts';

/** Whether this position is inside the row's own water. */
export function insideRow(row: MissionWalkRow, x: number, y: number): boolean {
  return Math.hypot(row.x - x, row.y - y) <= row.radiusM;
}

/**
 * One Echo interval of a row's hold, and the decision it shares with
 * `accrueSounding` rather than with `applyLifts`: **a broken hold resets.**
 *
 * §4 is emphatic in both halves of its sentence — a hull has to have *held*
 * inside the radius for sixty seconds *and* the water has to have stayed under
 * the ceiling **for all of it**. A turn assembled out of four broken fifteen-
 * second fragments would let a player walk a Corvette on and off the row
 * between passes and turn it anyway, which is the exact trade §4's ceiling
 * exists to price. A cut is work done to rock and leaving does not undo it; a
 * question being heard is not work done to rock.
 */
export function accrueRowHold(held: number, holding: boolean, intervalTicks: number): number {
  return holding ? held + intervalTicks : 0;
}

/**
 * One Echo interval of the walk's patience — §4.2: "Ninety seconds of stall and
 * the walk **returns altered**."
 *
 * Continuous, like the hold above and for the same reading of the same
 * sentence: a stall that cleared and came back is two stalls, and the plateau
 * has not been waiting ninety seconds. It is also the merciful reading — a
 * player who clears the row for ten seconds has genuinely bought the tide back,
 * rather than watching a cumulative meter they can never spend down.
 */
export function accrueStall(stalled: number, stalling: boolean, intervalTicks: number): number {
  return stalling ? stalled + intervalTicks : 0;
}
