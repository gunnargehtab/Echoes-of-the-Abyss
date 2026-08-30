/**
 * Who has a bow — docs/systems-echo.md §8.
 *
 * The directional term itself is pure maths and lives in `@echoes/shared`
 * (`directionalSectorFactor`, `directionalFactor`). What lives here is the
 * *eligibility* half, which is the part that has to agree in four places: the
 * Echo pass, the Drift's own hearing, the mission runtime's scripted listener,
 * and any test that reasons about them. Two detection paths disagreeing about
 * how loud the same hull is would be a bug nobody could see, so the predicate
 * is written once.
 */

import { Faction, directionalFactor } from '@echoes/shared';
import { hasComponent } from 'bitecs';

import { ActivePing, Heading, Owner, Position } from './components.ts';
import type { SimWorld } from './world.ts';

/**
 * True when this emitter's SIG is directional — §8's three exclusions, stated
 * as the conditions for inclusion.
 *
 * - **The faction.** One navy's doctrine, not physics.
 * - **A bow.** `Heading` is added by `spawnUnit` and by nothing else, so a
 *   structure, an Echo Mark and a torpedo all fail this test for the reason §8
 *   gives: they have no front. Asking for the component is asking the question.
 * - **Not mid-ping.** §5 fixes active sonar at SIG 95 *omnidirectional*, and
 *   `acoustics.ts` writes that 95 into `Acoustic.sig` for the duration. The
 *   ping is the one emission a Knight owns that has no bow.
 */
export function hasBow(world: SimWorld, eid: number): boolean {
  return (
    Owner.faction[eid] === Faction.Hadron &&
    hasComponent(world, Heading, eid) &&
    !(hasComponent(world, ActivePing, eid) && ActivePing.remainingS[eid]! > 0)
  );
}

/**
 * The directional term for one emitter and one listener position, or 1 when
 * this emitter has no bow.
 *
 * For the detection sites outside the Echo pass's hot loop, which hold two
 * positions rather than a hoisted bow vector. The Echo pass does not use this —
 * it hoists `cos`/`sin` per emitter and calls `directionalSectorFactor`
 * directly — but it shares `hasBow` above, so the two cannot disagree about
 * which hulls the term applies to.
 */
export function directionalFactorFor(
  world: SimWorld,
  emitter: number,
  listenerX: number,
  listenerY: number
): number {
  if (!hasBow(world, emitter)) return 1;
  return directionalFactor(
    Heading.rad[emitter]!,
    Position.x[emitter]!,
    Position.y[emitter]!,
    listenerX,
    listenerY
  );
}
