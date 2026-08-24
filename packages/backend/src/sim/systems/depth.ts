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

    const wasAtM = Position.depth[eid]!;

    if (!DepthOrder.active[eid]) {
      DepthOrder.descending[eid] = 0;
      holdAgainstGround(world, eid, dt, wasAtM);
      continue;
    }

    const current = wasAtM;
    const remaining = DepthOrder.targetM[eid]! - current;

    if (Math.abs(remaining) <= DEPTH.ARRIVAL_EPSILON_M) {
      // Snap rather than drift: an order that has arrived should leave the hull
      // at exactly the depth asked for, not epsilon short of it forever.
      Position.depth[eid] = DepthOrder.targetM[eid]!;
      DepthOrder.active[eid] = 0;
      DepthOrder.descending[eid] = 0;
      holdAgainstGround(world, eid, dt, wasAtM);
      continue;
    }

    const descending = remaining > 0;
    const rate = descending ? DEPTH.DESCENT_RATE_MPS : DEPTH.ASCENT_RATE_MPS;
    // Never overshoot within a single step.
    const step = Math.min(rate * dt, Math.abs(remaining));

    Position.depth[eid] = current + (descending ? step : -step);
    DepthOrder.descending[eid] = descending ? 1 : 0;
    holdAgainstGround(world, eid, dt, wasAtM);
  }
}

/**
 * The seabed's veto: **terrain may raise a hull, never lower one**
 * (docs/systems-depth.md §2).
 *
 * Runs whether or not the hull is under a depth order, because it is not
 * always the hull that moved — knockback and separation both write positions,
 * and either can put a hull over ground shallower than it is.
 *
 * `DepthOrder.targetM` is deliberately left alone. The order is not cancelled
 * and not rewritten; the ground simply holds the hull above where it asked to
 * be, and lets it carry on down when the ground falls away. That keeps a
 * single author for that field — `harvest.ts` is the other writer — and it is
 * what makes an order across a plateau into a detour rather than a refusal.
 *
 * It lifts and never dives. Ascent is the slow, silent direction, so terrain
 * lifting a hull spends its time and nothing else; a descent is loud and, past
 * a hull's Pressure Rating, fatal — so the ground must never be able to spend
 * that on the player's behalf. A roofed passage is therefore enterable only by
 * someone who chose to dive into it.
 */
function holdAgainstGround(world: SimWorld, eid: number, dt: number, wasAtM: number): void {
  const depth = Position.depth[eid]!;
  const floor = world.terrain.floorAt(Position.x[eid]!, Position.y[eid]!);
  if (depth <= floor) return;

  // A ceiling on this tick's depth, not a correction applied after the fact.
  // Lifting *after* the order had already dived would just be a tug of war the
  // order wins 45 m/s to 15: the hull would sink through the seabed at the
  // difference. So the ground caps where the hull may end up.
  //
  // The cap is the shallower of the floor and one ascent step above where the
  // hull started. For a hull the order is trying to push through the seabed
  // that is the floor itself, which stops it dead. For a hull that was already
  // too deep — knockback and separation both write positions without asking —
  // it is a steady rise at the ascent rate rather than a jump, because a hull
  // teleporting 2 km upward is not something a player can be asked to read.
  const cap = Math.max(floor, wasAtM - DEPTH.ASCENT_RATE_MPS * dt);
  if (depth > cap) Position.depth[eid] = cap;

  // Held is not descending. SIG has exactly one author and it reads this flag;
  // a hull pressed against the seabed is not blowing ballast, and should not
  // sound like it is.
  if (Position.depth[eid]! <= wasAtM) DepthOrder.descending[eid] = 0;
}
