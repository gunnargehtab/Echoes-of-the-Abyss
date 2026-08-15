/**
 * Movement system — fixed-step, frame-rate independent.
 *
 * Speed is scaled by Silent Running, which is where the Echo Layer reaches
 * into movement: going quiet costs 45% of your speed (only 20% for Pelagia).
 * docs/systems-echo.md §6, docs/factions.md.
 */

import { defineQuery } from 'bitecs';
import { Faction, SILENT_RUNNING, statsFor, type UnitKind } from '@echoes/shared';
import { MoveOrder, Owner, Position, SilentRunning, Unit, Velocity } from '../components.ts';
import type { SimWorld } from '../world.ts';

const movable = defineQuery([Position, Velocity, MoveOrder, Unit, SilentRunning, Owner]);

/** Close enough to count as arrived, in metres. */
const ARRIVAL_EPSILON_M = 5;

function speedMultiplier(eid: number): number {
  if (!SilentRunning.active[eid]) return 1;
  return Owner.faction[eid] === Faction.Pelagia
    ? SILENT_RUNNING.PELAGIA_SPEED_MULTIPLIER
    : SILENT_RUNNING.SPEED_MULTIPLIER;
}

export function movementSystem(world: SimWorld): void {
  const dt = world.dt;
  const entities = movable(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;

    if (!MoveOrder.active[eid]) {
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      continue;
    }

    const dx = MoveOrder.x[eid]! - Position.x[eid]!;
    const dy = MoveOrder.y[eid]! - Position.y[eid]!;
    const distance = Math.hypot(dx, dy);

    if (distance <= ARRIVAL_EPSILON_M) {
      MoveOrder.active[eid] = 0;
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      continue;
    }

    const stats = statsFor(Unit.kind[eid] as UnitKind);
    const speed = stats.speed * speedMultiplier(eid);
    // Never overshoot the target within a single step.
    const step = Math.min(speed * dt, distance);
    const nx = dx / distance;
    const ny = dy / distance;

    Position.x[eid] = Position.x[eid]! + nx * step;
    Position.y[eid] = Position.y[eid]! + ny * step;
    Velocity.x[eid] = nx * speed;
    Velocity.y[eid] = ny * speed;
  }
}
