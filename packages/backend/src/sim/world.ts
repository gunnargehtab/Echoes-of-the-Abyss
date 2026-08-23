/**
 * Simulation world: the bitecs world plus the side tables and terrain that
 * back it.
 */

import { createWorld, addEntity, addComponent, type IWorld } from 'bitecs';
import {
  CONSTRUCTION,
  CRYSTAL,
  ECONOMY,
  SEPARATION,
  Faction,
  HarvestThrottle,
  ResourceKind,
  SelfEventKind,
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
import { EchoMarkLayer } from './echoMarks.ts';
import type { Hazard } from './systems/hazards.ts';
import { Rng } from './rng.ts';
import { SpatialHash } from './spatialHash.ts';
import type { QueuedOrder } from './systems/orderQueue.ts';
import { Terrain } from './terrain.ts';

/** Per-player mutable economy state. Lives outside the ECS: it is per-slot, not per-entity. */
export interface PlayerEconomy {
  nodules: number;
  /** Resonance Crystal — the tech gate, mined only in the Abyssal band. */
  crystal: number;
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
  /**
   * The simulation's only source of randomness. Seeded per match and part of
   * simulation state — see sim/rng.ts. Nothing in sim/ may call Math.random().
   */
  rng: Rng;
  /**
   * Match-local entity ids, and the reverse map.
   *
   * bitecs allocates entity ids from a *process*-global counter, so the same
   * match run twice in one process gets different ids for the same hulls.
   * That is harmless while an id never leaves the process — but a replay is
   * exactly an id leaving the process, and replaying raw ids into a fresh
   * world addresses entities that do not exist there.
   *
   * So every spawned entity also gets an id that counts from zero within this
   * world. Replays speak that language; see sim/replay.ts.
   */
  localOfEid: Map<number, number>;
  eidOfLocal: Map<number, number>;
  nextLocalId: number;
  /**
   * Broadphase for hull separation, rebuilt every tick. Separate from the
   * Echo Layer's: that one is sized for kilometre-scale audibility, this one
   * for hull-scale overlap, and sharing a grid would make both worse.
   */
  unitGrid: SpatialHash;
  /** Reused query buffer, so separation allocates nothing per tick. */
  separationBuffer: number[];
  /**
   * Pending orders per unit — the plan behind the order it is executing.
   * Simulation state, not a client convenience: a reconnecting player must
   * get their plan back (see sim/systems/orderQueue.ts).
   */
  orderQueues: Map<number, QueuedOrder[]>;
  /**
   * Things that happened to a player's own force this tick, drained into the
   * Echo snapshot and cleared.
   *
   * Held on the world rather than passed back through return values because
   * they are raised deep inside systems — a firing spike is raised by combat,
   * a transmission by the command path — and threading a channel through every
   * one of those would be a worse cost than a list the drain empties.
   */
  selfEvents: PendingSelfEvent[];
  /**
   * Acoustic residue. Lives on the world rather than on the terrain because
   * terrain is static map data shipped to clients wholesale, and residue is
   * neither — it is match state, resolved per listener.
   */
  marks: EchoMarkLayer;
  /**
   * Environmental hazards, seeded from the map.
   *
   * Simulation state and not map data: a hazard's *site* comes from the map
   * and never changes, but its phase and timers are part of the match.
   */
  hazards: Hazard[];
}

/** A self-event before it is bucketed by slot. `eid`, not a match-local id. */
export interface PendingSelfEvent {
  kind: SelfEventKind;
  eid: number;
  bearing?: number;
}

/** Raise a self-event. No-op for an entity the world has already destroyed. */
export function raiseSelfEvent(world: SimWorld, event: PendingSelfEvent): void {
  world.selfEvents.push(event);
}

/**
 * Give an entity its match-local id. Called by every spawn path, so an entity
 * that can be commanded always has one.
 */
export function registerEntity(world: SimWorld, eid: number): number {
  const local = world.nextLocalId++;
  world.localOfEid.set(eid, local);
  world.eidOfLocal.set(local, eid);
  return local;
}

/** Match-local id for an entity, or undefined if it was never registered. */
export function localIdOf(world: SimWorld, eid: number): number | undefined {
  return world.localOfEid.get(eid);
}

/** Entity for a match-local id, or 0 — which every command path rejects. */
export function eidOfLocalId(world: SimWorld, local: number): number {
  return world.eidOfLocal.get(local) ?? 0;
}

export function createSimWorld(terrain: Terrain, dt: number, seed: number): SimWorld {
  const world = createWorld() as SimWorld;
  world.terrain = terrain;
  world.tick = 0;
  world.dt = dt;
  world.economies = new Map();
  world.production = new Map();
  world.spireActive = new Set();
  world.rng = new Rng(seed);
  world.localOfEid = new Map();
  world.eidOfLocal = new Map();
  world.nextLocalId = 0;
  world.unitGrid = new SpatialHash(SEPARATION.CELL_M);
  world.separationBuffer = [];
  world.orderQueues = new Map();
  world.selfEvents = [];
  world.marks = new EchoMarkLayer();
  world.hazards = [];
  // Burn entity id 0 so components can use eid 0 as a "none" sentinel
  // (Weapon.orderedTargetEid, Harvester.nodeEid). bitecs hands out dense ids
  // from 0, so without this the first spawned entity would be untargetable.
  addEntity(world);
  return world;
}

export function economyFor(world: SimWorld, slot: number): PlayerEconomy {
  let economy = world.economies.get(slot);
  if (economy === undefined) {
    economy = { nodules: ECONOMY.STARTING_NODULES, crystal: 0 };
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
  registerEntity(world, eid);

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
  registerEntity(world, eid);

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

/**
 * Working depth of a nodule field: Mid-Water, where §7 puts the density and
 * where a PR-2 hull is at home. Named rather than inline so the contrast with
 * CRYSTAL.FIELD_DEPTH_M is legible.
 */
const NODULE_FIELD_DEPTH_M = 600;

export function spawnResourceNode(
  world: SimWorld,
  x: number,
  y: number,
  amount: number = ECONOMY.NODE_STARTING_AMOUNT,
  kind: ResourceKind = ResourceKind.Nodule
): number {
  const eid = addEntity(world);
  registerEntity(world, eid);
  addComponent(world, Position, eid);
  Position.x[eid] = x;
  Position.y[eid] = y;
  // Crystal lies in the Abyssal band, which is the entire point of it: the
  // field cannot be worked without committing to the descent, and the descent
  // is loud and the return is slow (docs/economy.md §7).
  Position.depth[eid] =
    kind === ResourceKind.ResonanceCrystal ? CRYSTAL.FIELD_DEPTH_M : NODULE_FIELD_DEPTH_M;
  addComponent(world, ResourceNode, eid);
  ResourceNode.remaining[eid] = amount;
  ResourceNode.kind[eid] = kind;
  return eid;
}
