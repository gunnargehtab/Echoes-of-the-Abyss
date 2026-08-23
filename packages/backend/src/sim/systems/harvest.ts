/**
 * Harvest system — the C&C loop: drive to a field, mine it loudly, haul the
 * cargo home, deposit, repeat.
 *
 * The loop is deliberately audible at every stage but one. Mining emits the
 * throttle's SIG (docs/economy.md §3 — yield and noise are tied by rate);
 * hauling is ordinary cruise noise; the deposit itself is free because the
 * refinery is already the loudest permanent thing its owner has
 * (docs/economy.md §4). Income has a detection cost, paid continuously.
 */

import { defineQuery, hasComponent, removeEntity } from 'bitecs';
import {
  CRYSTAL,
  ECHO_MARKS,
  ECONOMY,
  EchoMarkKind,
  HARVEST_THROTTLE,
  RESOURCE,
  ResourceKind,
  structureStatsFor,
  type StructureKind,
} from '@echoes/shared';
import type { HarvestThrottle } from '@echoes/shared';
import {
  DepthOrder,
  Harvester,
  HarvestMode,
  Health,
  MoveOrder,
  Owner,
  Position,
  ResourceNode,
  Structure,
  UnderConstruction,
} from '../components.ts';
import { economyFor, type SimWorld } from '../world.ts';

const harvesters = defineQuery([Harvester, Position, MoveOrder, Owner]);
const nodes = defineQuery([ResourceNode, Position]);
const structures = defineQuery([Structure, Owner, Position, Health]);

function distanceTo(eid: number, x: number, y: number): number {
  return Math.hypot(Position.x[eid]! - x, Position.y[eid]! - y);
}

function nearestLiveNode(world: SimWorld, x: number, y: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  const all = nodes(world);
  for (let i = 0; i < all.length; i++) {
    const eid = all[i]!;
    if (ResourceNode.remaining[eid]! <= 0) continue;
    const d = distanceTo(eid, x, y);
    if (d < bestDistance) {
      bestDistance = d;
      best = eid;
    }
  }
  return best;
}

/** Nearest completed own structure that accepts deposits (Bastion or Refinery). */
function nearestDepot(world: SimWorld, slot: number, x: number, y: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  const all = structures(world);
  for (let i = 0; i < all.length; i++) {
    const eid = all[i]!;
    if (Owner.slot[eid] !== slot) continue;
    if (hasComponent(world, UnderConstruction, eid)) continue;
    const stats = structureStatsFor(Structure.kind[eid] as StructureKind);
    if (!stats.acceptsDeposits) continue;
    const d = distanceTo(eid, x, y);
    if (d < bestDistance) {
      bestDistance = d;
      best = eid;
    }
  }
  return best;
}

/** How much of a given resource a hold takes. Crystal is dense, awkward cargo. */
function capacityFor(kind: ResourceKind): number {
  return kind === ResourceKind.ResonanceCrystal
    ? CRYSTAL.CARGO_CAPACITY
    : ECONOMY.CARGO_CAPACITY_NODULES;
}

/**
 * Send a hull to a depth, if it is not already going there.
 *
 * The harvest loop is the first system to issue depth orders of its own, and
 * it is what turns a crystal field into docs/economy.md §7's "round trip with
 * a clock on it": the descent to the field is loud, and the climb home with a
 * full hold is slow.
 */
function orderDepth(eid: number, depthM: number): void {
  if (DepthOrder.active[eid] === 1 && Math.abs(DepthOrder.targetM[eid]! - depthM) < 1) return;
  if (Math.abs(Position.depth[eid]! - depthM) <= CRYSTAL.WORKING_DEPTH_TOLERANCE_M) return;
  DepthOrder.targetM[eid] = depthM;
  DepthOrder.active[eid] = 1;
}

function atDepth(eid: number, depthM: number): boolean {
  return Math.abs(Position.depth[eid]! - depthM) <= CRYSTAL.WORKING_DEPTH_TOLERANCE_M;
}

function nodeAlive(world: SimWorld, eid: number): boolean {
  return eid !== 0 && hasComponent(world, ResourceNode, eid) && ResourceNode.remaining[eid]! > 0;
}

function depotAlive(world: SimWorld, slot: number, eid: number): boolean {
  return (
    eid !== 0 &&
    hasComponent(world, Structure, eid) &&
    hasComponent(world, Owner, eid) &&
    Owner.slot[eid] === slot &&
    !hasComponent(world, UnderConstruction, eid)
  );
}

export function harvestSystem(world: SimWorld): void {
  const dt = world.dt;
  const entities = harvesters(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    const mode = Harvester.mode[eid]!;
    if (mode === HarvestMode.Idle) continue;

    const x = Position.x[eid]!;
    const y = Position.y[eid]!;
    const slot = Owner.slot[eid]!;

    if (mode === HarvestMode.ToNode) {
      let node = Harvester.nodeEid[eid]!;
      if (!nodeAlive(world, node)) {
        node = nearestLiveNode(world, x, y);
        Harvester.nodeEid[eid] = node;
        if (node === 0) {
          // The map is mined out; whatever is aboard is still worth banking.
          Harvester.mode[eid] = Harvester.cargo[eid]! > 0 ? HarvestMode.ToDepot : HarvestMode.Idle;
          continue;
        }
      }
      const fieldDepth = Position.depth[node]!;
      const inRange =
        distanceTo(eid, Position.x[node]!, Position.y[node]!) <= ECONOMY.MINING_RANGE_M;
      if (inRange) {
        MoveOrder.active[eid] = 0;
        // Over the field but not yet down to it: dive, and only start cutting
        // once actually there. A crystal field is Abyssal, so this is where
        // the hull starts paying — in noise on the way down, and in crush if
        // it is not rated for where it is going.
        orderDepth(eid, fieldDepth);
        if (atDepth(eid, fieldDepth)) Harvester.mode[eid] = HarvestMode.Mining;
      } else {
        MoveOrder.x[eid] = Position.x[node]!;
        MoveOrder.y[eid] = Position.y[node]!;
        MoveOrder.active[eid] = 1;
      }
      continue;
    }

    if (mode === HarvestMode.Mining) {
      const node = Harvester.nodeEid[eid]!;
      if (!nodeAlive(world, node)) {
        // Field exhausted under us: bank a partial load, or walk to the next field.
        Harvester.mode[eid] = Harvester.cargo[eid]! > 0 ? HarvestMode.ToDepot : HarvestMode.ToNode;
        continue;
      }
      const kind = ResourceNode.kind[node] as ResourceKind;
      // Switching fields mid-hold would mix cargo the deposit cannot split;
      // bank what is aboard first.
      if (Harvester.cargo[eid]! > 0 && Harvester.cargoKind[eid] !== kind) {
        Harvester.mode[eid] = HarvestMode.ToDepot;
        continue;
      }
      Harvester.cargoKind[eid] = kind;
      const throttle = HARVEST_THROTTLE[Harvester.throttle[eid] as HarvestThrottle];
      const capacity = capacityFor(kind);
      const mined = Math.min(
        ECONOMY.MINING_RATE_PER_S * RESOURCE[kind].rateMultiplier * throttle.yieldMultiplier * dt,
        capacity - Harvester.cargo[eid]!,
        ResourceNode.remaining[node]!
      );
      Harvester.cargo[eid] = Harvester.cargo[eid]! + mined;
      ResourceNode.remaining[node] = ResourceNode.remaining[node]! - mined;
      if (ResourceNode.remaining[node]! <= 0) {
        // Depleted fields leave the sim. Clients keep drawing their survey
        // charts — learning a field is empty is information you earn by
        // sending a harvester, not something the server announces.
        removeEntity(world, node);
      }
      if (Harvester.cargo[eid]! >= capacity) {
        Harvester.mode[eid] = HarvestMode.ToDepot;
      }
      continue;
    }

    // HarvestMode.ToDepot
    let depot = Harvester.depotEid[eid]!;
    if (!depotAlive(world, slot, depot)) {
      depot = nearestDepot(world, slot, x, y);
      Harvester.depotEid[eid] = depot;
      if (depot === 0) {
        // Nowhere to unload — no Bastion means we are being eliminated anyway.
        Harvester.mode[eid] = HarvestMode.Idle;
        continue;
      }
    }
    // The climb home starts the moment the hold is full, not on arrival: the
    // ascent is the slow half of the round trip (docs/economy.md §7), and a
    // hauler that waited until it was over the depot to start rising would be
    // hiding the cost the design wants the player to feel.
    orderDepth(eid, Position.depth[depot]!);

    const dockRange =
      structureStatsFor(Structure.kind[depot] as StructureKind).radiusM + ECONOMY.DEPOSIT_RANGE_M;
    if (
      distanceTo(eid, Position.x[depot]!, Position.y[depot]!) <= dockRange &&
      atDepth(eid, Position.depth[depot]!)
    ) {
      const economy = economyFor(world, slot);
      if ((Harvester.cargoKind[eid] as ResourceKind) === ResourceKind.ResonanceCrystal) {
        economy.crystal += Harvester.cargo[eid]!;
      } else {
        economy.nodules += Harvester.cargo[eid]!;
      }
      // Industrial hum, at the depot and scaled by what actually arrived.
      //
      // Hooked to the *delivery* rather than to the building, which is what
      // makes docs/economy.md §5's counter-play real: a refinery nobody hauls
      // to is quiet, and throttling to Trickle collapses the hum within
      // seconds because the deposits stop coming. A hum keyed to the structure
      // would just be a second way of drawing the structure.
      world.marks.add(
        EchoMarkKind.IndustrialHum,
        Position.x[depot]!,
        Position.y[depot]!,
        (Harvester.cargo[eid]! / capacityFor(Harvester.cargoKind[eid] as ResourceKind)) *
          ECHO_MARKS.HUM_PER_DELIVERY
      );

      Harvester.cargo[eid] = 0;
      MoveOrder.active[eid] = 0;
      Harvester.mode[eid] = nodeAlive(world, Harvester.nodeEid[eid]!)
        ? HarvestMode.ToNode
        : HarvestMode.Idle;
      if (Harvester.mode[eid] === HarvestMode.Idle && nearestLiveNode(world, x, y) !== 0) {
        // The assigned field died mid-haul but others remain: keep working.
        Harvester.nodeEid[eid] = 0;
        Harvester.mode[eid] = HarvestMode.ToNode;
      }
    } else {
      MoveOrder.x[eid] = Position.x[depot]!;
      MoveOrder.y[eid] = Position.y[depot]!;
      MoveOrder.active[eid] = 1;
    }
  }
}
