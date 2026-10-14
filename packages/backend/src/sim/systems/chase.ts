/**
 * An ordered target, and the point it is chased to — docs/systems-combat.md §7
 * (#1247).
 *
 * `combatSystem` used to chase an ordered target's own `Position`, written
 * into `MoveOrder` every tick at any tier. So a hull ordered onto a Tier-2
 * ghost steered at the truth rather than the ghost, and one ordered onto a
 * handle its slot had stopped hearing kept steering at wherever the target
 * went: a live fix on something the slot no longer located. The hull now
 * chases the point its slot was shown, and that point moves only when the
 * slot is shown the target again (`Match`, after each Echo pass).
 *
 * Set together, and only here, so no writer can give a hull a target without
 * a point to chase it to. `heard` says whether that point is a fix the slot
 * holds now, or one nothing has refreshed since: a chase to the second ends
 * on arrival (`combatSystem`, #1381).
 */
import { Weapon } from '../components.ts';

export function orderTarget(
  eid: number,
  target: number,
  x: number,
  y: number,
  heard: boolean
): void {
  Weapon.orderedTargetEid[eid] = target;
  Weapon.chaseX[eid] = x;
  Weapon.chaseY[eid] = y;
  Weapon.chaseHeard[eid] = heard ? 1 : 0;
}
