/**
 * Which of the player's own hulls dredge, and which fight, as the shell reads
 * them.
 *
 * The shell used to answer both from one field: a `throttle` meant a
 * harvester, and its absence meant a hull that fights. A mission can now seat a
 * Harvester hull with its dredge struck — *Shift Change*'s crew barges,
 * "Harvester hull, dredge struck, berths rigged" (docs/mission-shift-change.md
 * §3, #1283) — which the server sends with no throttle, so the one field read
 * the unarmed barges into the army: `0` gathered the crew and ENGAGE lit for
 * them. Dredging is still the throttle, because that is what the server takes
 * a harvest order for; fighting is the hull's kind, which a refit cannot change.
 *
 * Pure, and its own module for `movementHolds.ts`'s reason: the renderer needs
 * a GL context to instantiate and this does not.
 */

import { UnitKind, type OwnUnit } from '@echoes/shared';

/** The shell's words for a struck dredge, in docs/ui-ux.md §7's form. */
export const DREDGE_STRUCK_TEXT = 'dredge struck';

/** Takes a harvest order and a throttle: the server sent it a throttle. */
export function dredges(unit: OwnUnit): boolean {
  return unit.throttle !== undefined;
}

/** A Harvester hull the server sent without its harvest loop. */
export function dredgeStruck(unit: OwnUnit): boolean {
  return unit.kind === UnitKind.Harvester && unit.throttle === undefined;
}

/** In `0`'s army and lights ENGAGE (docs/ui-ux.md §9): never a Harvester hull. */
export function fights(unit: OwnUnit): boolean {
  return unit.kind !== UnitKind.Harvester;
}
