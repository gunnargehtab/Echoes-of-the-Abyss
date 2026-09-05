/**
 * Production system — unit build queues, C&C style.
 *
 * Cost is paid up front at enqueue time (Match validates funds); this system
 * only burns the clock down and delivers the hull. A producing structure is
 * audibly producing — acoustics reads the queue to raise its sustained SIG,
 * because construction is loud (docs/systems-echo.md §2).
 */

import { hasComponent } from 'bitecs';
import { statsFor, structureStatsFor, type Faction, type StructureKind } from '@echoes/shared';
import { Health, MoveOrder, Owner, Position, Structure, UnderConstruction } from '../components.ts';
import { spawnUnit, type SimWorld } from '../world.ts';
import { powerRate } from './thermal.ts';

export function productionSystem(world: SimWorld): void {
  const dt = world.dt;

  for (const [eid, line] of world.production) {
    // The factory may have been destroyed since last tick.
    if (!hasComponent(world, Structure, eid) || Health.hp[eid]! <= 0) {
      world.production.delete(eid);
      continue;
    }
    if (line.queue.length === 0) continue;
    // A structure still being commissioned cannot run its line yet.
    if (hasComponent(world, UnderConstruction, eid)) continue;

    // The single consequence of a Thermal Draw deficit: a starved line runs
    // slower. Slower and never stopped — a frozen line is a spiral, because a
    // player cannot build the tap that would fix it (docs/economy.md §2).
    line.remainingS -= dt * powerRate(world, Owner.slot[eid]!);
    if (line.remainingS > 0) continue;

    const kind = line.queue.shift()!;
    // Deliver just off the structure's apron, biased toward the map centre so
    // fresh hulls do not stack on the footprint.
    const radius = structureStatsFor(Structure.kind[eid] as StructureKind).radiusM;
    const dx = world.terrain.widthM / 2 - Position.x[eid]!;
    const dy = world.terrain.heightM / 2 - Position.y[eid]!;
    const length = Math.hypot(dx, dy) || 1;
    const hull = spawnUnit(world, {
      kind,
      slot: Owner.slot[eid]!,
      faction: Owner.faction[eid]! as Faction,
      x: Position.x[eid]! + (dx / length) * (radius + 60),
      y: Position.y[eid]! + (dy / length) * (radius + 60),
      // Depth deliberately omitted: spawnUnit picks a band the hull's
      // pressure rating tolerates, whatever depth the factory sits at.
    });
    // The yard's rally point (#435): a launched hull goes where the yard was
    // told to send it, on the tick it launches, as a plain move — it routes
    // like any other and is loud like any other.
    const rally = world.rallies.get(eid);
    if (rally !== undefined) {
      MoveOrder.x[hull] = rally.x;
      MoveOrder.y[hull] = rally.y;
      MoveOrder.active[hull] = 1;
    }

    line.remainingS = line.queue.length > 0 ? statsFor(line.queue[0]!).buildTimeS : 0;
  }
}
