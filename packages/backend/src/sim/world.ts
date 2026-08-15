/**
 * Simulation world: the bitecs world plus the side tables and terrain that
 * back it.
 */

import { createWorld, addEntity, addComponent, type IWorld } from 'bitecs';
import { Faction, UnitKind, statsFor } from '@echoes/shared';
import {
  Acoustic,
  Health,
  MoveOrder,
  Owner,
  Position,
  Pressure,
  SilentRunning,
  Unit,
  Velocity,
} from './components.ts';
import { Terrain } from './terrain.ts';

export interface SimWorld extends IWorld {
  terrain: Terrain;
  /** Monotonic fixed-step tick counter. */
  tick: number;
  /** Seconds per fixed step. */
  dt: number;
}

export function createSimWorld(terrain: Terrain, dt: number): SimWorld {
  const world = createWorld() as SimWorld;
  world.terrain = terrain;
  world.tick = 0;
  world.dt = dt;
  return world;
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
  Position.depth[eid] = opts.depth ?? 600;

  addComponent(world, Velocity, eid);
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;

  addComponent(world, MoveOrder, eid);
  MoveOrder.active[eid] = 0;

  addComponent(world, Acoustic, eid);
  Acoustic.sig[eid] = stats.sigIdle;
  Acoustic.hyd[eid] = stats.hyd;
  Acoustic.spikeRemainingS[eid] = 0;
  Acoustic.spikeAmount[eid] = 0;

  addComponent(world, Pressure, eid);
  Pressure.rating[eid] = stats.pressureRating;

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

  return eid;
}
