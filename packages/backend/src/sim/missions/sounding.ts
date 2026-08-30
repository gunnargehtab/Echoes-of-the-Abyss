/**
 * A sounding's geometry — docs/mission-aptitude.md §4, "taken from within 400 m
 * of a formation, bow on it, held for twenty seconds at SIG 80".
 *
 * Pure, and separate from the runtime that spends it, for `peakSigOf`'s reason:
 * the rule the mission enforces and the rule a test can state are the same one,
 * written once. The runtime adds what needs a world — whose hull, whether it is
 * running silent, and the ledger — and nothing else.
 *
 * The facing half delegates to `directionalFactor` rather than restating the
 * sector arithmetic, because docs/mission-aptitude.md §13 asks a sounding to be
 * "that shape with a bearing added" and a second cone test would be a second
 * place for §8's 45° to drift. What it does *not* borrow is `hasBow`'s faction
 * clause: that one answers "is this hull's SIG directional", which is one
 * navy's doctrine, and this one answers "is the hull pointed at the formation",
 * which is a hand on a wheel. A Consortium barge taking a sounding still has to
 * aim it.
 */

import { DIRECTIONAL_SIGNATURE, directionalFactor } from '@echoes/shared';

import type { MissionSounding } from './types.ts';

/**
 * Whether this hull, here, on this bow, is taking the sounding this instant.
 *
 * Both halves of §4's clause: inside the radius **and** with the formation in
 * the hull's own cone — the 45° either side of the bow that `DIRECTIONAL_CONE`
 * covers, so a hull inside the radius pointed away holds nothing. That case is
 * the mechanism rather than an edge of it: a sounding aimed at the survey is
 * heard from most of the map and the same sounding aimed away is heard from six
 * hundred metres, which is only a decision if pointing it the short way fails
 * to take it.
 *
 * A hull sitting exactly on the point is bow-on whatever its heading — the
 * sector arithmetic answers CONE for a zero vector — which is the right answer
 * to a degenerate question and never one an authored 400 m radius asks.
 */
export function soundingHolds(
  sounding: MissionSounding,
  headingRad: number,
  hullX: number,
  hullY: number
): boolean {
  if (Math.hypot(sounding.x - hullX, sounding.y - hullY) > sounding.radiusM) return false;
  return (
    directionalFactor(headingRad, hullX, hullY, sounding.x, sounding.y) ===
    DIRECTIONAL_SIGNATURE.CONE
  );
}

/**
 * One Echo interval of the hold, and the one decision this mechanism makes that
 * `MissionLift` does not: **a broken hold resets.**
 *
 * The lift's ledger is monotone because a cut is work done to rock and leaving
 * does not undo it (`applyLifts`). A sounding is not work done to rock. §4 says
 * it is *held* for twenty seconds, and a held tone assembled out of four broken
 * five-second fragments would teach the opposite of the lesson the mission is
 * built to teach — that the twenty seconds are twenty seconds of standing in
 * somebody's cone, and that what is behind the formation is in that cone for
 * all of them. Pausing instead of resetting would let a player spend the whole
 * exposure in slices small enough that the survey never files a tier, which is
 * exactly the trade §5's tolerance exists to price.
 */
export function accrueSounding(held: number, holding: boolean, intervalTicks: number): number {
  return holding ? held + intervalTicks : 0;
}
