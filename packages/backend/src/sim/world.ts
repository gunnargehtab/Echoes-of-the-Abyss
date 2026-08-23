/**
 * Simulation world: the bitecs world plus the side tables and terrain that
 * back it.
 */

import { createWorld, addEntity, addComponent, type IWorld } from 'bitecs';
import {
  CONSTRUCTION,
  ECONOMY,
  Faction,
  HarvestThrottle,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
} from '@echoes/shared';
import {
  Acoustic,
  DepthOrder,
  Harvester,
  HarvestMode,
  Health,
  MoveOrder,
  Owner,
  Position,
  Pressure,
  ResourceNode,
  SilentRunning,
  Structure,
  UnderConstruction,
  Unit,
  Velocity,
  Weapon,
} from './components.ts';
import { Terrain } from './terrain.ts';

/** Per-player mutable economy state. Lives outside the ECS: it is per-slot, not per-entity. */
export interface PlayerEconomy {
  nodules: number;
}

/** One structure's production line: FIFO of unit kinds, head in progress. */
export interface ProductionQueue {
  queue: UnitKind[];
  /** Seconds of build time remaining on queue[0]. */
  remainingS: number;
}

export interface SimWorld extends IWorld {
  terrain: Terrain;
  /** Monotonic fixed-step tick counter. */
  tick: number;
  /** Seconds per fixed step. */
  dt: number;
  /** slot -> stockpile. */
  economies: Map<number, PlayerEconomy>;
  /** producing structure eid -> its queue. */
  production: Map<number, ProductionQueue>;
  /**
   * Sounding Spires whose PR grant is load-bearing this tick — an allied
   * unit under the aura is actually below its own rating. Written by the
   * auras system, read by acoustics: a projecting spire sings at SIG 80.
   */
  spireActive: Set<number>;
}

export function createSimWorld(terrain: Terrain, dt: number): SimWorld {
  const world = createWorld() as SimWorld;
  world.terrain = terrain;
  world.tick = 0;
  world.dt = dt;
  world.economies = new Map();
  world.production = new Map();
  world.spireActive = new Set();
  // Burn entity id 0 so components can use eid 0 as a "none" sentinel
  // (Weapon.orderedTargetEid, Harvester.nodeEid). bitecs hands out dense ids
  // from 0, so without this the first spawned entity would be untargetable.
  addEntity(world);
  return world;
}

export function economyFor(world: SimWorld, slot: number): PlayerEconomy {
  let economy = world.economies.get(slot);
  if (economy === undefined) {
    economy = { nodules: ECONOMY.STARTING_NODULES };
    world.economies.set(slot, economy);
  }
  return economy;
}

export interface SpawnOptions {
  kind: UnitKind;
  slot: number;
  faction: Faction;
  x: number;
  y: number;
  depth?: number;
}

/**
 * Create a unit with every component the simulation systems expect.
 *
 * Systems query by component signature, so a unit missing one silently drops
 * out of that system rather than erroring — spawning goes through this one
 * function so that cannot happen by accident.
 */
export function spawnUnit(world: SimWorld, opts: SpawnOptions): number {
  const stats = statsFor(opts.kind);
  const eid = addEntity(world);

  addComponent(world, Position, eid);
  Position.x[eid] = opts.x;
  Position.y[eid] = opts.y;
  // Default to the deepest band the hull is rated for (capped at Mid-Water):
  // a PR-1 scout delivered at 600 m would take crush attrition from birth.
  Position.depth[eid] = opts.depth ?? (stats.pressureRating >= 2 ? 600 : 300);

  addComponent(world, Velocity, eid);
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;

  addComponent(world, MoveOrder, eid);
  MoveOrder.active[eid] = 0;

  // Units carry a depth order from birth; structures never get one. The
  // component is what makes a hull orderable vertically at all, so the
  // ownership check in Match.orderDepth rejects structures for free.
  addComponent(world, DepthOrder, eid);
  DepthOrder.active[eid] = 0;
  DepthOrder.descending[eid] = 0;
  DepthOrder.targetM[eid] = Position.depth[eid]!;

  addComponent(world, Acoustic, eid);
  Acoustic.sig[eid] = stats.sigIdle;
  Acoustic.hyd[eid] = stats.hyd;
  Acoustic.pfFactor[eid] = 1;
  Acoustic.sigFactor[eid] = 1;
  Acoustic.spikeRemainingS[eid] = 0;
  Acoustic.spikeAmount[eid] = 0;

  addComponent(world, Pressure, eid);
  Pressure.rating[eid] = stats.pressureRating;
  Pressure.bonus[eid] = 0;
  Pressure.crushTaken[eid] = 0;

  addComponent(world, Health, eid);
  Health.hp[eid] = stats.maxHp;
  Health.max[eid] = stats.maxHp;

  addComponent(world, Owner, eid);
  Owner.slot[eid] = opts.slot;
  Owner.faction[eid] = opts.faction;

  addComponent(world, Unit, eid);
  Unit.kind[eid] = opts.kind;

  addComponent(world, SilentRunning, eid);
  SilentRunning.active[eid] = 0;

  if (stats.attackDamage > 0) {
    addComponent(world, Weapon, eid);
    Weapon.cooldownRemainingS[eid] = 0;
    Weapon.orderedTargetEid[eid] = 0;
  }

  if (opts.kind === UnitKind.Harvester) {
    addComponent(world, Harvester, eid);
    Harvester.mode[eid] = HarvestMode.Idle;
    Harvester.cargo[eid] = 0;
    Harvester.nodeEid[eid] = 0;
    Harvester.depotEid[eid] = 0;
    Harvester.throttle[eid] = HarvestThrottle.Standard;
  }

  return eid;
}

export interface SpawnStructureOptions {
  kind: StructureKind;
  slot: number;
  faction: Faction;
  x: number;
  y: number;
  depth?: number;
  /**
   * Pre-built structures (the starting base) skip the construction phase;
   * everything commissioned mid-match rises loudly over its build time.
   */
  prebuilt?: boolean;
}

export function spawnStructure(world: SimWorld, opts: SpawnStructureOptions): number {
  const stats = structureStatsFor(opts.kind);
  const eid = addEntity(world);

  addComponent(world, Position, eid);
  Position.x[eid] = opts.x;
  Position.y[eid] = opts.y;
  Position.depth[eid] = opts.depth ?? 600;

  addComponent(world, Acoustic, eid);
  Acoustic.sig[eid] = opts.prebuilt ? stats.sigIdle : CONSTRUCTION.SITE_SIG;
  Acoustic.hyd[eid] = stats.hyd;
  Acoustic.pfFactor[eid] = 1;
  Acoustic.sigFactor[eid] = 1;
  Acoustic.spikeRemainingS[eid] = 0;
  Acoustic.spikeAmount[eid] = 0;

  addComponent(world, Health, eid);
  Health.max[eid] = stats.maxHp;
  Health.hp[eid] = opts.prebuilt ? stats.maxHp : stats.maxHp * CONSTRUCTION.INITIAL_HP_FRACTION;

  addComponent(world, Owner, eid);
  Owner.slot[eid] = opts.slot;
  Owner.faction[eid] = opts.faction;

  addComponent(world, Structure, eid);
  Structure.kind[eid] = opts.kind;

  if (!opts.prebuilt) {
    addComponent(world, UnderConstruction, eid);
    UnderConstruction.remainingS[eid] = stats.buildTimeS;
    UnderConstruction.totalS[eid] = stats.buildTimeS;
  }

  if (stats.attackDamage !== undefined) {
    addComponent(world, Weapon, eid);
    Weapon.cooldownRemainingS[eid] = 0;
    Weapon.orderedTargetEid[eid] = 0;
  }

  return eid;
}

export function spawnResourceNode(
  world: SimWorld,
  x: number,
  y: number,
  amount: number = ECONOMY.NODE_STARTING_AMOUNT
): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Position.depth[eid] = 600;
  addComponent(world, ResourceNode, eid);
  ResourceNode.remaining[eid] = amount;
  return eid;
}
