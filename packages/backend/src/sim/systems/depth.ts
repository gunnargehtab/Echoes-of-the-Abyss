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
 * This system owns the travel, and the one rule that turns a move's depth into
 * an order — follow the floor, or hold a depth (`orderDepthAt`). Two
 * consequences are enforced elsewhere, deliberately:
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
import { DepthOrder, MoveOrder, Position, Pressure, SilentRunning } from '../components.ts';
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
 * The depth half of a move — docs/systems-depth.md §2, "Steering along the
 * ground" (#1132).
 *
 * A move carries a depth, and the one question here is whether that depth is
 * on the ground. Within `FOLLOW_FLOOR.ENGAGE_WITHIN_M` of the floor at the
 * order's point — the floor read no deeper than `DEPTH.MAX_M`, since that is
 * as deep as a click there can order — the move follows the floor. Anywhere
 * else it holds the depth it was given, and following ends.
 *
 * One function for both places a move gets its depth: `Match` as the order is
 * given, and the order queue as a leg begins. So a queued leg is decided by
 * the rule an immediate one is, against the ground as it stands when the leg
 * starts. Validation is the caller's: `depthM` is finite and inside the map.
 */
export function orderDepthAt(
  world: SimWorld,
  eid: number,
  x: number,
  y: number,
  depthM: number
): void {
  if (!hasComponent(world, DepthOrder, eid)) return;
  const reach = Math.min(world.terrain.floorAt(x, y), DEPTH.MAX_M);
  if (depthM < reach - FOLLOW_FLOOR.ENGAGE_WITHIN_M) {
    setDepthTarget(world, eid, depthM);
    return;
  }
  // Already following: the leg in flight is the mode's own, and dropping it
  // would stall the descent for a tick every time a walk is re-given.
  if (DepthOrder.follow[eid] === 1) return;
  DepthOrder.follow[eid] = 1;
  // A leg that is not the mode's is dropped. The mode retargets only past the
  // arrival epsilon, so a dive under way to some other depth would otherwise
  // run on until the hull had drifted that far — a few ticks, but a few ticks
  // descending are a few ticks at a dive's SIG, for a dive nobody now wants.
  DepthOrder.active[eid] = 0;
  DepthOrder.descending[eid] = 0;
}

/**
 * A depth of the hull's own: go to `depthM` and hold it. It ends
 * floor-following, because the newer instruction is the player's current mind
 * (docs/systems-depth.md §2). A dive is not something done quietly, for the
 * reason a ping is not — the descent itself is the noise — so ordering one
 * breaks Silent Running; a climb keeps its silence.
 */
export function setDepthTarget(world: SimWorld, eid: number, depthM: number): void {
  DepthOrder.targetM[eid] = depthM;
  DepthOrder.active[eid] = 1;
  DepthOrder.follow[eid] = 0;
  if (depthM > Position.depth[eid]! && hasComponent(world, SilentRunning, eid)) {
    SilentRunning.active[eid] = 0;
  }
}

/**
 * End floor-following for a task that keeps a depth of its own: an attack,
 * which chases at the depth the hull is on, and a harvest, whose loop orders
 * its own legs (docs/systems-depth.md §2). The leg in flight is kept, so the
 * hull finishes the climb or descent it is on and holds there rather than
 * hanging wherever the order caught it.
 */
export function leaveFloor(world: SimWorld, eid: number): void {
  if (hasComponent(world, DepthOrder, eid)) DepthOrder.follow[eid] = 0;
}

/**
 * The standing half of docs/systems-depth.md §2, "Steering along the ground":
 * hold the hull a fixed clearance above whatever ground is under it — and,
 * under way, the ground one cell ahead toward where it is steering, so it
 * rises before an edge (#1193) — by rewriting its depth order each tick and
 * letting the ordinary travel below do the moving — same rates, same
 * `descending` flag, and therefore exactly a dive's loudness when the ground
 * falls away.
 *
 * Two rules from the doc, enforced here because this is the only writer:
 *
 * - **Ground below the hull's rating disengages the mode.** A standing order
 *   that rode into crush attrition would be the seabed spending the player's
 *   hull on their behalf — the exact thing this file's other half exists to
 *   prevent. The hull holds its depth and the mode switches off; the payload
 *   flag disappearing is how the card says why it stopped.
 * - **A follow descent is a dive.** It breaks Silent Running the way an
 *   ordered dive does (`setDepthTarget`), because the move onto the ground was
 *   the player's commitment and its dives are exactly as loud as dives are.
 *
 * In a roofed passage the clearance may not fit; the hull holds at the
 * ceiling rather than above it, because above it is rock. And it never goes
 * deeper than `DEPTH.MAX_M`, the line a depth order stops at.
 */
function followTheFloor(world: SimWorld, eid: number): void {
  const terrain = world.terrain;
  const x = Position.x[eid]!;
  const y = Position.y[eid]!;
  const ceiling = terrain.ceilingAt(x, y);
  let hold = terrain.floorAt(x, y) - FOLLOW_FLOOR.CLEARANCE_M;

  // Read the ground ahead too (#1193). Movement refuses a step onto ground
  // shallower than the hull, and terrain only lifts a hull already over such
  // ground, so a follower holding the clearance in a pit was stopped at its
  // edge for good — "up for free" never came. Holding the clearance over the
  // shallower of this cell and the next one toward where the hull is steering
  // lets it rise before the edge instead, which is the promise.
  //
  // Toward the steering point, not the order: the next waypoint of a route
  // built at this depth, else the order once the waypoints run out (which is
  // where `steerPoint` aims too, so a route sealed at a pit's edge still looks
  // over the rim). Reading the straight line to the order instead made a hull
  // routed round a ridge rise beside it and dive back, loud, over ground it
  // never crossed. Only water counts, and at its own ceiling: rock ahead is
  // ground no clearance fits over, and a roof ahead is held under, not over.
  if (MoveOrder.active[eid]) {
    let tx = MoveOrder.x[eid]!;
    let ty = MoveOrder.y[eid]!;
    const plan = world.paths.get(eid);
    if (plan !== undefined && plan.index < plan.waypoints.length >> 1) {
      tx = plan.waypoints[2 * plan.index]!;
      ty = plan.waypoints[2 * plan.index + 1]!;
    }
    const dx = tx - x;
    const dy = ty - y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0) {
      const step = Math.min(terrain.cellM, distance);
      const ax = x + (dx / distance) * step;
      const ay = y + (dy / distance) * step;
      const aheadFloor = terrain.floorAt(ax, ay);
      const aheadCeiling = terrain.ceilingAt(ax, ay);
      if (aheadCeiling < aheadFloor) {
        hold = Math.min(hold, Math.max(aheadCeiling, aheadFloor - FOLLOW_FLOOR.CLEARANCE_M));
      }
    }
  }

  // Never deeper than a depth order may go (#1179): the mode follows ground
  // the player could have ordered the hull to, and ground below `DEPTH.MAX_M`
  // is ground no order reaches, so the hull holds there, still following, as
  // a depth order to that line would.
  const target = Math.max(ceiling, Math.min(hold, DEPTH.MAX_M));

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
 * always the hull that moved — hazard knockback writes positions outright and
 * can put a hull over ground shallower than it is (separation used to as well,
 * and now steps through `resolveStep` like movement does).
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
  // too deep — hazard knockback writes positions without asking —
  // it is a steady rise at the ascent rate rather than a jump, because a hull
  // teleporting 2 km upward is not something a player can be asked to read.
  const cap = Math.max(floor, wasAtM - DEPTH.ASCENT_RATE_MPS * dt);
  if (depth > cap) Position.depth[eid] = cap;

  // Held is not descending. SIG has exactly one author and it reads this flag;
  // a hull pressed against the seabed is not blowing ballast, and should not
  // sound like it is.
  if (Position.depth[eid]! <= wasAtM) DepthOrder.descending[eid] = 0;
}
