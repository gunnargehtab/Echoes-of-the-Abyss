/**
 * The mission's movement holds, as the shell reads them.
 *
 * A mission may hold one of the player's own hulls still — the court's tenders
 * do not move before they are loaded, and do not move at all without an escort
 * close enough to hear for them (docs/mission-sorrowgate.md §8). The server has
 * always refused those orders; what it did not do was say so, and a hull that
 * silently declines every order does not read as held, it reads as broken
 * (#478).
 *
 * Pure, and its own module for the reason `readability.ts` is: the renderer it
 * serves needs a GL context to instantiate and this does not, so the rule the
 * player actually meets — which hulls of a mixed selection go, and which
 * sentence the hint bar gets — is testable without one.
 */

import { MovementHoldReason, type MovementHold } from '@echoes/shared';

/**
 * The shell's words for each hold, in the `disabled — silent running` form
 * docs/ui-ux.md §7 sets for a withheld affordance.
 *
 * Here and not on the wire: the two rules are the engine's, so the payload
 * carries the code and the terminal says it — the same division that lets
 * `CRUSHING at 2,400m` and `SOUR · 4s of grace` be the shell's sentences about
 * facts the server sent as numbers. A mission's *own* words still come from the
 * literal and are still rendered verbatim (`AbilityLock.reason`).
 */
const HOLD_TEXT: Record<MovementHoldReason, string> = {
  [MovementHoldReason.Unreleased]: 'held — not released yet',
  [MovementHoldReason.Unescorted]: 'held — no ears in range',
};

/** Why the mission will not move this hull, or null while it will. */
export function holdReasonFor(holds: readonly MovementHold[], unitId: number): string | null {
  const hold = holds.find((entry) => entry.unitId === unitId);
  return hold === undefined ? null : HOLD_TEXT[hold.reason];
}

/** What a movement order does with a selection the mission is partly holding. */
export interface MovableSelection {
  /** The hulls the server would actually move. */
  ids: number[];
  /** The first reason it would not move one of the rest, or null when it would. */
  refused: string | null;
}

/**
 * Split a selection into the hulls that will go and the reason the others will
 * not.
 *
 * Filtered rather than refused whole, because a selection is usually mixed: the
 * flight and the tender it is escorting are one right-click, and dropping the
 * escort's order too would punish the player for the hold. The order the
 * reasons are read in is the selection's own, so a repeated press says the same
 * thing rather than cycling through the hulls it refused.
 */
export function movableIn(
  holds: readonly MovementHold[],
  ids: readonly number[]
): MovableSelection {
  if (holds.length === 0) return { ids: [...ids], refused: null };
  const free: number[] = [];
  let refused: string | null = null;
  for (const id of ids) {
    const reason = holdReasonFor(holds, id);
    if (reason === null) free.push(id);
    else refused ??= reason;
  }
  return { ids: free, refused };
}
