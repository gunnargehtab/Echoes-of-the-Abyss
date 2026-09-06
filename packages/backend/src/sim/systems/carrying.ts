/**
 * A hull in a hold — docs/systems-echo.md §3, docs/units.md "The transports"
 * (wave 1 of docs/roster-plan.md, #501).
 *
 * A transport carries hulls. A carried hull is not in the water: it has no
 * `Position`, and since every physics, combat, fauna and Echo query in the
 * simulation requires one, losing the component is what takes it out of the
 * world — it cannot move, shoot, be shot, be heard, or hear, as a property of
 * the component signature rather than of a flag every system has to check.
 * It keeps `Unit`, `Owner` and `Health`, so it still counts against the berths
 * (`Match.berthsFor` walks units by owner) and still dies (reap walks health
 * by owner), which is exactly the pair of facts the doc asks for: a hold is
 * transport, not quarters, and the load dies with the carrier.
 *
 * Three things happen here, and nowhere else:
 *
 * - **Boarding.** A hull ordered to embark carries `Embarking` and closes on
 *   its carrier — a move order re-aimed as the carrier moves, and a depth
 *   order to the carrier's depth, because a Freighter loads shallow or not at
 *   all (`HOLD.BOARD_DEPTH_M`). Within `HOLD.BOARD_RANGE_M` and that depth,
 *   with room in the hold, it boards: `Position` off, `Carried` on.
 * - **Landing.** A carrier ordered to disembark lands its whole hold in a
 *   ring around itself at its own depth. What the Antiphon lands carries the
 *   Spire's grant on a clock (`LandingGrant`, HULL_EFFECTS.ANTIPHON).
 * - **The clock.** The landing grant counts down here, before the auras pass
 *   that reads it, so the grant and the crush it postpones are one tick's
 *   answer.
 *
 * What a hold does to the carrier's SIG is acoustics' business
 * (`HOLD.SIG_PER_BERTH`), and what it reveals is nothing: the carried hulls
 * never reach the Echo pass, and `Match.collectOwnUnits` tells the *owner*
 * where they are and nobody else.
 */

import { addComponent, defineQuery, hasComponent, removeComponent } from 'bitecs';
import { HOLD, HULL_EFFECTS, UnitKind, statsFor, unitRadiusM } from '@echoes/shared';
import {
  Acoustic,
  Carried,
  DepthOrder,
  Embarking,
  Harvester,
  HarvestMode,
  Health,
  Hold,
  HullEffect,
  LandingGrant,
  MoveOrder,
  Owner,
  Position,
  Posture,
  SilentRunning,
  Unit,
  Velocity,
  Weapon,
} from '../components.ts';
import { clearQueue } from './orderQueue.ts';
import type { SimWorld } from '../world.ts';

const embarking = defineQuery([Embarking, Position, Unit, Owner, Health]);
const granted = defineQuery([LandingGrant]);

/**
 * How far the carrier may drift from where a boarding hull was last aimed
 * before the hull is re-aimed. Re-aiming every tick would throw the route
 * away every tick (`world.paths`); half the boarding range means the hull is
 * never aimed at water the carrier has left by more than it can board from.
 */
const RETARGET_M = HOLD.BOARD_RANGE_M / 2;

/** May `eid` be ordered aboard `carrier` right now? The order path's test. */
export function canBoard(world: SimWorld, carrier: number, eid: number): boolean {
  if (carrier === eid) return false;
  if (!hasComponent(world, Hold, carrier) || !hasComponent(world, Position, carrier)) return false;
  if (!hasComponent(world, Health, carrier) || Health.hp[carrier]! <= 0) return false;
  // A hull, in the water, that is not itself a hold: a Freighter aboard a
  // Freighter would be a hull the Echo pass never sees carrying six more.
  if (!hasComponent(world, Unit, eid) || !hasComponent(world, MoveOrder, eid)) return false;
  if (!hasComponent(world, Position, eid) || hasComponent(world, Hold, eid)) return false;
  if (hasComponent(world, Carried, eid)) return false;
  if (Owner.slot[eid] !== Owner.slot[carrier]) return false;
  return fits(carrier, eid);
}

function fits(carrier: number, eid: number): boolean {
  const berths = statsFor(Unit.kind[eid] as UnitKind).berths;
  return Hold.used[carrier]! + berths <= Hold.berths[carrier]!;
}

/** Drop a pending embark order, if there is one. Every other order does this. */
export function cancelEmbark(world: SimWorld, eid: number): void {
  if (hasComponent(world, Embarking, eid)) removeComponent(world, Embarking, eid);
}

/**
 * Take a hull out of whatever hold it is in, on its death or its carrier's.
 * Called before the entity is removed, while `Carried.carrier` still reads.
 */
export function forgetCarried(world: SimWorld, eid: number): void {
  if (!hasComponent(world, Carried, eid)) return;
  const carrier = Carried.carrier[eid]!;
  const aboard = world.holds.get(carrier);
  if (aboard !== undefined) {
    const at = aboard.indexOf(eid);
    if (at >= 0) aboard.splice(at, 1);
  }
  if (hasComponent(world, Hold, carrier)) {
    const berths = statsFor(Unit.kind[eid] as UnitKind).berths;
    Hold.used[carrier] = Math.max(0, Hold.used[carrier]! - berths);
  }
}

function board(world: SimWorld, carrier: number, eid: number): void {
  // Out of the water. Everything the hull was doing stops with it: a queued
  // plan, a route, a chase, a posture, a dive, Silent Running, a harvest
  // loop, an effect clock. It comes out of the hold with none of them, which
  // is the honest state for a hull that has just been landed somewhere.
  removeComponent(world, Embarking, eid);
  removeComponent(world, Position, eid);
  addComponent(world, Carried, eid);
  Carried.carrier[eid] = carrier;
  Hold.used[carrier] = Hold.used[carrier]! + statsFor(Unit.kind[eid] as UnitKind).berths;
  let aboard = world.holds.get(carrier);
  if (aboard === undefined) {
    aboard = [];
    world.holds.set(carrier, aboard);
  }
  aboard.push(eid);

  clearQueue(world, eid);
  world.paths.delete(eid);
  MoveOrder.active[eid] = 0;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Posture.engage[eid] = 0;
  Posture.hold[eid] = 0;
  if (hasComponent(world, DepthOrder, eid)) {
    DepthOrder.active[eid] = 0;
    DepthOrder.follow[eid] = 0;
  }
  if (hasComponent(world, Weapon, eid)) Weapon.orderedTargetEid[eid] = 0;
  if (hasComponent(world, SilentRunning, eid)) SilentRunning.active[eid] = 0;
  if (hasComponent(world, Harvester, eid)) {
    Harvester.mode[eid] = HarvestMode.Idle;
    Harvester.idleReason[eid] = 0;
  }
  if (hasComponent(world, HullEffect, eid)) {
    HullEffect.stationaryS[eid] = 0;
    HullEffect.active[eid] = 0;
  }
  // Nothing to hear. Acoustics no longer visits this hull (its emitter query
  // wants a Position), so the last figure it wrote would otherwise stand.
  Acoustic.sig[eid] = 0;
}

/**
 * Land a carrier's whole hold around it, at its depth. Returns what landed.
 *
 * A ring, not a pile: `HOLD.LANDING_RING_RADII` of the carrier's own radius,
 * spread evenly, so separation has nothing to untangle on the tick the hold
 * opens. Each landed hull arrives with no orders and no posture — where it
 * is and how deep it is are the carrier's, and the rest is the player's next
 * order. The Antiphon's landing carries the Spire's grant on a clock, on the
 * hulls it landed and nothing else (docs/units.md).
 */
export function landHold(world: SimWorld, carrier: number): number[] {
  const aboard = world.holds.get(carrier);
  if (aboard === undefined || aboard.length === 0) return [];
  const landed = aboard.slice();
  const cx = Position.x[carrier]!;
  const cy = Position.y[carrier]!;
  const depth = Position.depth[carrier]!;
  const ring = unitRadiusM(Unit.kind[carrier] as UnitKind) * HOLD.LANDING_RING_RADII;
  const grants = Unit.kind[carrier] === UnitKind.Antiphon;

  for (let i = 0; i < landed.length; i++) {
    const eid = landed[i]!;
    const angle = (i / landed.length) * Math.PI * 2;
    removeComponent(world, Carried, eid);
    addComponent(world, Position, eid);
    Position.x[eid] = world.terrain.clampXM(cx + Math.cos(angle) * ring);
    Position.y[eid] = world.terrain.clampYM(cy + Math.sin(angle) * ring);
    Position.depth[eid] = depth;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    MoveOrder.active[eid] = 0;
    if (hasComponent(world, DepthOrder, eid)) {
      DepthOrder.targetM[eid] = depth;
      DepthOrder.active[eid] = 0;
      DepthOrder.descending[eid] = 0;
      DepthOrder.follow[eid] = 0;
    }
    Acoustic.sig[eid] = statsFor(Unit.kind[eid] as UnitKind).sigIdle;
    if (grants) {
      addComponent(world, LandingGrant, eid);
      LandingGrant.remainingS[eid] = HULL_EFFECTS.ANTIPHON.GRANT_S;
      LandingGrant.bonus[eid] = HULL_EFFECTS.ANTIPHON.PR_BONUS;
    }
  }
  aboard.length = 0;
  Hold.used[carrier] = 0;
  return landed;
}

/**
 * The per-tick pass: run the landing clocks down, and walk every hull that
 * is closing on a carrier — steering it, and boarding it when it arrives.
 *
 * `boarded` receives the hulls that went aboard this tick, so the Match can
 * drop their contact handles: a hull that vanishes from the water and later
 * lands somewhere else must come back as a new contact, not under a handle
 * that would tell an observer it was the same hull.
 */
export function carryingSystem(world: SimWorld, boarded: number[]): void {
  const dt = world.dt;

  const clocks = granted(world);
  for (let i = clocks.length - 1; i >= 0; i--) {
    const eid = clocks[i]!;
    const left = LandingGrant.remainingS[eid]! - dt;
    if (left > 0) {
      LandingGrant.remainingS[eid] = left;
    } else {
      removeComponent(world, LandingGrant, eid);
    }
  }

  // Copied: boarding edits the query's own list.
  const closing = embarking(world).slice();
  for (let i = 0; i < closing.length; i++) {
    const eid = closing[i]!;
    const carrier = Embarking.carrier[eid]!;
    // A carrier that died, sank out of reach of the order path's checks, or
    // changed hands is nothing to board; the hull stands where it got to.
    if (
      !hasComponent(world, Hold, carrier) ||
      !hasComponent(world, Position, carrier) ||
      Health.hp[carrier]! <= 0 ||
      Owner.slot[carrier] !== Owner.slot[eid]
    ) {
      removeComponent(world, Embarking, eid);
      MoveOrder.active[eid] = 0;
      continue;
    }

    const cx = Position.x[carrier]!;
    const cy = Position.y[carrier]!;
    const cd = Position.depth[carrier]!;
    const dx = cx - Position.x[eid]!;
    const dy = cy - Position.y[eid]!;
    const dz = cd - Position.depth[eid]!;
    if (
      dx * dx + dy * dy <= HOLD.BOARD_RANGE_M * HOLD.BOARD_RANGE_M &&
      Math.abs(dz) <= HOLD.BOARD_DEPTH_M
    ) {
      if (fits(carrier, eid)) {
        board(world, carrier, eid);
        boarded.push(eid);
      } else {
        // The hold filled while this hull was on its way. Refused here rather
        // than left circling: an order the simulation cannot honour ends.
        removeComponent(world, Embarking, eid);
        MoveOrder.active[eid] = 0;
      }
      continue;
    }

    // Steer. The carrier is a moving target, so the aim is refreshed when it
    // has moved by more than the boarding range covers — and only then, so
    // the route survives between refreshes.
    const aimedX = MoveOrder.x[eid]!;
    const aimedY = MoveOrder.y[eid]!;
    if (
      MoveOrder.active[eid] === 0 ||
      (aimedX - cx) * (aimedX - cx) + (aimedY - cy) * (aimedY - cy) > RETARGET_M * RETARGET_M
    ) {
      MoveOrder.x[eid] = cx;
      MoveOrder.y[eid] = cy;
      MoveOrder.active[eid] = 1;
      world.paths.delete(eid);
    }
    // And to its depth, when the hull is not already heading there. A dive is
    // as loud here as anywhere: boarding a carrier that sits deep is paid for
    // in the descent (docs/systems-depth.md §2), which is why a transport
    // that wants a quiet load comes up for it.
    if (
      hasComponent(world, DepthOrder, eid) &&
      Math.abs(dz) > HOLD.BOARD_DEPTH_M &&
      (DepthOrder.active[eid] === 0 || Math.abs(DepthOrder.targetM[eid]! - cd) > HOLD.BOARD_DEPTH_M)
    ) {
      DepthOrder.targetM[eid] = cd;
      DepthOrder.active[eid] = 1;
      DepthOrder.follow[eid] = 0;
      if (cd > Position.depth[eid]!) SilentRunning.active[eid] = 0;
    }
  }
}
