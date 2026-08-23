/**
 * Depth system — the vertical half of movement, and the game's commitment clock.
 *
 * docs/systems-depth.md §2 states the rule this system exists to enforce:
 * **descent is fast and deafening, ascent is slow and silent.** That asymmetry
 * is not flavour. It is what makes a deep push a bet rather than a manoeuvre —
 * you announce yourself on the way down and cannot leave in a hurry, so the
 * question "is what's down there worth what it costs to get back" is always on
 * the table (§5).
 *
 * This system owns only the travel. Two consequences are enforced elsewhere,
 * deliberately:
 *   - the *noise* of a descent is applied by the acoustics system, which reads
 *     the `descending` flag written here — SIG is derived state and has exactly
 *     one author;
 *   - the *cost* of arriving below your Pressure Rating is applied by the
 *     pressure system, which was until now unreachable in a normal match:
 *     nothing ever changed a unit's depth after spawn, and spawning is careful
 *     never to place a hull below its rating.
 *
 * Note what is *not* checked here: a unit may be ordered below its Pressure
 * Rating, and the order is accepted. Renting depth you are not rated for is the
 * mechanic, not a mistake to be prevented.
 */

import { defineQuery } from 'bitecs';
import { DEPTH } from '@echoes/shared';
import { DepthOrder, Position } from '../components.ts';
import type { SimWorld } from '../world.ts';

const diving = defineQuery([Position, DepthOrder]);

export function depthSystem(world: SimWorld): void {
  const dt = world.dt;
  const entities = diving(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;

    if (!DepthOrder.active[eid]) {
      DepthOrder.descending[eid] = 0;
      continue;
    }

    const current = Position.depth[eid]!;
    const remaining = DepthOrder.targetM[eid]! - current;

    if (Math.abs(remaining) <= DEPTH.ARRIVAL_EPSILON_M) {
      // Snap rather than drift: an order that has arrived should leave the hull
      // at exactly the depth asked for, not epsilon short of it forever.
      Position.depth[eid] = DepthOrder.targetM[eid]!;
      DepthOrder.active[eid] = 0;
      DepthOrder.descending[eid] = 0;
      continue;
    }

    const descending = remaining > 0;
    const rate = descending ? DEPTH.DESCENT_RATE_MPS : DEPTH.ASCENT_RATE_MPS;
    // Never overshoot within a single step.
    const step = Math.min(rate * dt, Math.abs(remaining));

    Position.depth[eid] = current + (descending ? step : -step);
    DepthOrder.descending[eid] = descending ? 1 : 0;
  }
}
