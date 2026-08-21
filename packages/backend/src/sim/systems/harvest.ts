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
import { ECONOMY, HARVEST_THROTTLE, structureStatsFor, type StructureKind } from '@echoes/shared';
import type { HarvestThrottle } from '@echoes/shared';
import {
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
      if (distanceTo(eid, Position.x[node]!, Position.y[node]!) <= ECONOMY.MINING_RANGE_M) {
        Harvester.mode[eid] = HarvestMode.Mining;
        MoveOrder.active[eid] = 0;
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
      const throttle = HARVEST_THROTTLE[Harvester.throttle[eid] as HarvestThrottle];
      const mined = Math.min(
        ECONOMY.MINING_RATE_PER_S * throttle.yieldMultiplier * dt,
        ECONOMY.CARGO_CAPACITY_NODULES - Harvester.cargo[eid]!,
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
      if (Harvester.cargo[eid]! >= ECONOMY.CARGO_CAPACITY_NODULES) {
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
    const dockRange =
      structureStatsFor(Structure.kind[depot] as StructureKind).radiusM + ECONOMY.DEPOSIT_RANGE_M;
    if (distanceTo(eid, Position.x[depot]!, Position.y[depot]!) <= dockRange) {
      economyFor(world, slot).nodules += Harvester.cargo[eid]!;
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
