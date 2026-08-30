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

import { defineQuery, hasComponent } from 'bitecs';
import { crushAttritionPerSecond, DEPTH, FOLLOW_FLOOR } from '@echoes/shared';
import { DepthOrder, Position, Pressure, SilentRunning } from '../components.ts';
import type { SimWorld } from '../world.ts';

const diving = defineQuery([Position, DepthOrder]);

export function depthSystem(world: SimWorld): void {
  const dt = world.dt;
  const entities = diving(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;

    // The standing order retargets before the travel below reads the order,
    // so a follow leg moves on the same tick the ground changed under it.
    if (DepthOrder.follow[eid] === 1) followTheFloor(world, eid);

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
 * The standing half of docs/systems-depth.md §2, "Steering along the ground":
 * hold the hull a fixed clearance above whatever ground is under it, by
 * rewriting its depth order from the local floor each tick and letting the
 * ordinary travel below do the moving — same rates, same `descending` flag,
 * and therefore exactly a dive's loudness when the ground falls away.
 *
 * Two rules from the doc, enforced here because this is the only writer:
 *
 * - **Ground below the hull's rating disengages the mode.** A standing order
 *   that rode into crush attrition would be the seabed spending the player's
 *   hull on their behalf — the exact thing this file's other half exists to
 *   prevent. The hull holds its depth and the mode switches off; the payload
 *   flag disappearing is how the card says why it stopped.
 * - **A follow descent is a dive.** It breaks Silent Running the way a manual
 *   dive order does (`Match.applyDepth`), because entering the mode was the
 *   player's commitment and its dives are exactly as loud as dives are.
 *
 * In a roofed passage the clearance may not fit; the hull holds at the
 * ceiling rather than above it, because above it is rock.
 */
function followTheFloor(world: SimWorld, eid: number): void {
  const x = Position.x[eid]!;
  const y = Position.y[eid]!;
  const floor = world.terrain.floorAt(x, y);
  const ceiling = world.terrain.ceilingAt(x, y);
  const target = Math.max(ceiling, floor - FOLLOW_FLOOR.CLEARANCE_M);

  if (hasComponent(world, Pressure, eid)) {
    const rating = Pressure.rating[eid]! + Pressure.bonus[eid]!;
    if (crushAttritionPerSecond(rating, target) > 0) {
      DepthOrder.follow[eid] = 0;
      DepthOrder.active[eid] = 0;
      return;
    }
  }

  // Retarget only past the arrival epsilon: the travel below snaps and clears
  // `active` on arrival, and re-arming it every tick for a station the hull
  // already keeps would flicker the order in the player's own payload.
  if (Math.abs(target - Position.depth[eid]!) <= DEPTH.ARRIVAL_EPSILON_M) return;

  DepthOrder.targetM[eid] = target;
  DepthOrder.active[eid] = 1;
  if (target > Position.depth[eid]! && hasComponent(world, SilentRunning, eid)) {
    SilentRunning.active[eid] = 0;
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
