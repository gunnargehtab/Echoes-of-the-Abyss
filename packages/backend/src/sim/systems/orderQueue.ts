/**
 * Order queue — the plan a unit is working through.
 *
 * Queued orders are simulation state rather than a client convenience, for
 * the usual reason: the client is a terminal. If the queue lived in the
 * renderer, a reconnecting player would lose their plan, and a second client
 * watching the same slot would disagree about what the fleet was doing.
 *
 * It matters more here than in most RTS games. A queued route through a kelp
 * bed is a *plan about sound* — the player is buying quiet with travel time —
 * and being able to express that without babysitting each leg is a real part
 * of the skill the design is asking for (docs/ui-ux.md §9).
 *
 * The queue advances only when the unit is genuinely idle. Depth changes and
 * Silent Running deliberately do not count as busy: those are states a hull
 * holds *while* it carries out its orders, not orders themselves, so toggling
 * silent mid-route must not eat the rest of the plan.
 */

import { defineQuery, hasComponent } from 'bitecs';
import {
  Harvester,
  HarvestMode,
  Health,
  MoveOrder,
  Position,
  Posture,
  ResourceNode,
  Unit,
  Weapon,
} from '../components.ts';
import type { SimWorld } from '../world.ts';

// `Position`, so a hull in a hold (systems/carrying.ts) never pops a leg it
// cannot walk; its queue is cleared when it boards, and this is the backstop.
const ordered = defineQuery([Unit, MoveOrder, Position]);

/** One pending order. `x`/`y` are where it pointed when it was issued. */
export type QueuedOrder =
  | { kind: 'move'; x: number; y: number }
  | { kind: 'attackMove'; x: number; y: number }
  | { kind: 'attack'; x: number; y: number; target: number }
  | { kind: 'harvest'; x: number; y: number; node: number };

/**
 * Is this hull still working on something?
 *
 * Anything that would make popping the next order interrupt the current one.
 */
function busy(world: SimWorld, eid: number): boolean {
  if (MoveOrder.active[eid] === 1) return true;
  // An attack-move that has stopped to fight is still on its way.
  if (hasComponent(world, Posture, eid) && Posture.engage[eid] === 1) return true;

  if (hasComponent(world, Weapon, eid)) {
    const target = Weapon.orderedTargetEid[eid]!;
    if (target !== 0 && hasComponent(world, Health, target) && Health.hp[target]! > 0) return true;
  }

  if (hasComponent(world, Harvester, eid) && Harvester.mode[eid] !== HarvestMode.Idle) return true;

  return false;
}

/** Start an order that has reached the front of the queue. */
function begin(world: SimWorld, eid: number, order: QueuedOrder): void {
  switch (order.kind) {
    case 'move':
      MoveOrder.x[eid] = order.x;
      MoveOrder.y[eid] = order.y;
      MoveOrder.active[eid] = 1;
      // A queued move is the player parking the hull, exactly as an immediate
      // one is (Match.applyMove) — so a stalled harvester stops being stalled
      // the moment its leg begins, rather than driving the player's order with
      // an idle marker still breathing on it.
      if (hasComponent(world, Harvester, eid)) {
        Harvester.mode[eid] = HarvestMode.Idle;
        Harvester.idleReason[eid] = 0;
      }
      break;
    case 'attackMove':
      MoveOrder.x[eid] = order.x;
      MoveOrder.y[eid] = order.y;
      MoveOrder.active[eid] = 1;
      Posture.engage[eid] = 1;
      Posture.engageX[eid] = order.x;
      Posture.engageY[eid] = order.y;
      Posture.hold[eid] = 0;
      break;
    case 'attack':
      // The target may have died while the order waited its turn. Dropping it
      // is right: a queue is a plan, and part of a plan becoming moot is
      // ordinary rather than exceptional.
      if (hasComponent(world, Health, order.target) && Health.hp[order.target]! > 0) {
        Weapon.orderedTargetEid[eid] = order.target;
      }
      break;
    case 'harvest':
      if (hasComponent(world, ResourceNode, order.node)) {
        Harvester.nodeEid[eid] = order.node;
        Harvester.mode[eid] = HarvestMode.ToNode;
        Harvester.idleReason[eid] = 0;
      }
      break;
  }
}

export function orderQueueSystem(world: SimWorld): void {
  if (world.orderQueues.size === 0) return;

  const entities = ordered(world);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    const queue = world.orderQueues.get(eid);
    if (queue === undefined || queue.length === 0) continue;
    if (busy(world, eid)) continue;

    // Drain rather than pop-once: an order that is already moot (a dead
    // target, a mined-out field) must not stall the rest of the plan behind
    // it for a tick each.
    while (queue.length > 0) {
      const next = queue.shift()!;
      begin(world, eid, next);
      if (busy(world, eid)) break;
    }
    if (queue.length === 0) world.orderQueues.delete(eid);
  }
}

/** Queue view for the snapshot: the plan, as the player is entitled to see it. */
export function queueView(world: SimWorld, eid: number): QueuedOrder[] | undefined {
  const queue = world.orderQueues.get(eid);
  return queue !== undefined && queue.length > 0 ? queue : undefined;
}

/** Drop everything pending. Any unqueued order replaces the whole plan. */
export function clearQueue(world: SimWorld, eid: number): void {
  world.orderQueues.delete(eid);
}

/** Append to the plan. */
export function enqueue(world: SimWorld, eid: number, order: QueuedOrder): void {
  const queue = world.orderQueues.get(eid);
  if (queue === undefined) world.orderQueues.set(eid, [order]);
  else if (queue.length < MAX_QUEUED_ORDERS) queue.push(order);
}

/** A plan longer than this is a misclick, not an intention. */
export const MAX_QUEUED_ORDERS = 24;

/** Where a queued order pointed, for drawing. */
export function orderAnchor(order: QueuedOrder): { x: number; y: number } {
  return { x: order.x, y: order.y };
}
