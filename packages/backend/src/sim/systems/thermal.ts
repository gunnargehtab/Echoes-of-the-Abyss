/**
 * Thermal Draw — docs/economy.md §2.
 *
 * "Heat and pressure differential tapped from vents — the power resource,
 * **consumed continuously rather than stockpiled**."
 *
 * That sentence is the whole design, and it is why this system computes a
 * report rather than maintaining a balance. A stockpile lets a player save up
 * and spend at a moment of their choosing; a rate means capacity is a standing
 * commitment tied to a place on the map — a vent tap you have to hold, that is
 * loud the entire time it is producing.
 *
 * **Nothing accumulates.** Surplus is lost on the tick it exists. Anything
 * that banked it would turn this back into a stockpile with extra steps, and
 * the resource would stop being the only one in the game that is a rate.
 *
 * The consequence of a deficit is deliberately *slow*, not *stopped*: a
 * starved production line still runs, at `MIN_SATISFACTION`. A player whose
 * power fails must be able to trade their way out — a frozen line is a spiral,
 * because you cannot build the tap that would fix it.
 */

import {
  Faction,
  HazardPhase,
  StructureKind,
  THERMAL_DRAW,
  structureStatsFor,
  type DrawReport,
} from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Health, Owner, Position, Structure, UnderConstruction } from '../components.ts';
import type { SimWorld } from '../world.ts';

const structures = defineQuery([Structure, Owner, Health]);
const holders = defineQuery([Position, Owner, Health]);

/**
 * Recompute every player's draw.
 *
 * Cheap and total: it walks the structure list once per tick and writes a
 * fresh report. There is no incremental state to get wrong when a tap is
 * destroyed, which for a rate is the only correct shape — an incremental
 * balance would drift the moment a structure died in a way nobody remembered
 * to subtract.
 */
export function thermalSystem(world: SimWorld): void {
  for (const report of world.draw.values()) {
    report.capacity = 0;
    report.demand = 0;
    report.satisfaction = 1;
  }

  const all = structures(world);
  for (let i = 0; i < all.length; i++) {
    const eid = all[i]!;
    // A half-built tap powers nothing, and a half-built foundry asks for
    // nothing: construction is already paid for in nodules and time.
    if (hasComponent(world, UnderConstruction, eid)) continue;
    // A structure destroyed this tick but not yet reaped powers nothing. The
    // report is recomputed from scratch every tick precisely so a death can
    // never leave capacity behind it.
    if (Health.hp[eid]! <= 0) continue;

    const stats = structureStatsFor(Structure.kind[eid] as StructureKind);
    const report = drawFor(world, Owner.slot[eid]!);
    report.capacity += stats.drawCapacity ?? 0;
    report.demand += stats.drawDemand ?? 0;
  }

  // docs/hazards.md §1: "Bathyarch can stabilize vents for energy boosts."
  // *Energy* — so a stabilised vent pays draw capacity, which is the power
  // resource. The first implementation of that interaction paid nodules,
  // because Thermal Draw did not exist yet.
  for (const hazard of world.hazards) {
    if (hazard.kind !== 'geothermal-eruption') continue;
    if (hazard.phase !== HazardPhase.Dormant || hazard.stabilisedS <= 0) continue;
    const slot = bathyarchHolding(world, hazard.x, hazard.y, hazard.radiusM);
    if (slot === null) continue;
    drawFor(world, slot).capacity += THERMAL_DRAW.STABILISE_CAPACITY;
  }

  for (const report of world.draw.values()) {
    report.satisfaction =
      report.demand <= 0
        ? 1
        : Math.max(THERMAL_DRAW.MIN_SATISFACTION, Math.min(1, report.capacity / report.demand));
  }
}

/** Which slot, if any, has a Consortium hull holding this vent. */
function bathyarchHolding(world: SimWorld, x: number, y: number, radiusM: number): number | null {
  const entities = holders(world);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (Owner.faction[eid] !== Faction.Bathyarch) continue;
    if (Health.hp[eid]! <= 0) continue;
    const dx = Position.x[eid]! - x;
    const dy = Position.y[eid]! - y;
    if (dx * dx + dy * dy <= radiusM * radiusM) return Owner.slot[eid]!;
  }
  return null;
}

export function drawFor(world: SimWorld, slot: number): DrawReport {
  let report = world.draw.get(slot);
  if (report === undefined) {
    report = { capacity: 0, demand: 0, satisfaction: 1 };
    world.draw.set(slot, report);
  }
  return report;
}

/**
 * How fast anything that needs power runs for this player, 0.25-1.
 *
 * The single consequence of a deficit, and the only one: legible, visible on
 * the HUD, and recoverable the instant a tap comes online or a consumer dies.
 */
export function powerRate(world: SimWorld, slot: number): number {
  return drawFor(world, slot).satisfaction;
}
