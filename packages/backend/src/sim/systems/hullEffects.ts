/**
 * Hull effects — the work of the rung's roster that is neither moving nor
 * shooting (docs/units.md, "The rung, and two hulls a navy"; #461).
 *
 * Three clocks and one weld, all on hulls rather than on structures, and each
 * the mechanism a signature structure already had:
 *
 *   - the **Cantus** sings and the **Sower** seeds after a stationary interval
 *     — the Spire's grant, on a hull. This system keeps the clock and writes
 *     `HullEffect.active`; the auras system reads it and grants, and acoustics
 *     reads it and prices the noise. One writer, so the grant and the SIG that
 *     announces it cannot disagree by a tick;
 *   - the **Tender** welds one allied hull within reach, nearest first, and is
 *     loud exactly while it does — the one mechanism the simulation did not
 *     have. Repair never touches unhealable hull: crush and sour stay crushed
 *     and sour (docs/systems-depth.md §2), which is what keeps depth a
 *     commitment even for the navy with the tenders;
 *   - the **Spinner** regrows a mine at a nursery — inside a Spore Veil or by
 *     a Bastion — and nowhere else.
 *
 * Runs after movement and before auras: a hull's "stationary" is this tick's
 * velocity, and the grants that depend on it must be this tick's too.
 */

import { defineQuery, hasComponent } from 'bitecs';
import { HULL_EFFECTS, STRUCTURE_AURAS, StructureKind, UnitKind, statsFor } from '@echoes/shared';
import {
  Health,
  HullEffect,
  MineMagazine,
  Owner,
  Position,
  Pressure,
  SilentRunning,
  Structure,
  UnderConstruction,
  Unit,
  Velocity,
} from '../components.ts';
import type { SimWorld } from '../world.ts';

const effectHulls = defineQuery([HullEffect, Unit, Position, Owner, Velocity, Health]);
const magazines = defineQuery([MineMagazine, Position, Owner, Health]);
const hulls = defineQuery([Unit, Position, Owner, Health]);
const structures = defineQuery([Structure, Position, Owner, Health]);

/** Below this speed the hull counts as stationary — acoustics' own figure. */
const MOVING_EPSILON = 0.01;

/** Seconds a hull of this kind must stand still before its effect runs, or 0. */
function stationaryNeededS(kind: UnitKind): number {
  switch (kind) {
    case UnitKind.Cantus:
      return HULL_EFFECTS.CANTUS.STATIONARY_S;
    case UnitKind.Sower:
      return HULL_EFFECTS.SOWER.STATIONARY_S;
    default:
      return 0;
  }
}

export function hullEffectsSystem(world: SimWorld): void {
  const dt = world.dt;

  const effects = effectHulls(world);
  if (effects.length > 0) {
    const roster = hulls(world);
    for (let i = 0; i < effects.length; i++) {
      const eid = effects[i]!;
      if (Health.hp[eid]! <= 0) {
        HullEffect.active[eid] = 0;
        continue;
      }
      const kind = Unit.kind[eid] as UnitKind;

      const moving = Math.hypot(Velocity.x[eid]!, Velocity.y[eid]!) > MOVING_EPSILON;
      HullEffect.stationaryS[eid] = moving ? 0 : HullEffect.stationaryS[eid]! + dt;

      // Silent Running is the off switch, for every effect. A hull that has
      // been told to be quiet is not singing, seeding or welding: the Cantus
      // "moving, is silent and grants nothing", and going silent is the same
      // decision made standing still — so the player can stop the song
      // without giving up the ground, and a Tender cannot weld quietly.
      if (SilentRunning.active[eid] === 1) {
        HullEffect.active[eid] = 0;
        continue;
      }

      if (kind === UnitKind.Tender) {
        HullEffect.active[eid] = weld(world, eid, roster) ? 1 : 0;
        continue;
      }

      HullEffect.active[eid] = HullEffect.stationaryS[eid]! >= stationaryNeededS(kind) ? 1 : 0;
    }
  }

  const growers = magazines(world);
  if (growers.length > 0) regrow(world, growers, dt);
}

/**
 * One tick of the Tender's weld: the nearest damaged allied hull within reach,
 * healed at the doc's rate and never past the hull it has left to heal.
 * Returns whether it worked at all, which is what the noise hangs on.
 */
function weld(world: SimWorld, tender: number, roster: readonly number[]): boolean {
  const { REPAIR_HP_PER_S, RADIUS_M } = HULL_EFFECTS.TENDER;
  const slot = Owner.slot[tender]!;
  const tx = Position.x[tender]!;
  const ty = Position.y[tender]!;

  let patient = 0;
  let nearest: number = RADIUS_M;
  for (let i = 0; i < roster.length; i++) {
    const eid = roster[i]!;
    // A workshop welds other hulls. Its own plate is somebody else's job, or
    // the hull would be a self-healing 900 HP line-holder and read as the
    // wrong entry.
    if (eid === tender) continue;
    if (Owner.slot[eid] !== slot || Health.hp[eid]! <= 0) continue;
    if (Health.hp[eid]! >= healableMax(world, eid)) continue;
    const d = Math.hypot(Position.x[eid]! - tx, Position.y[eid]! - ty);
    if (d > nearest) continue;
    nearest = d;
    patient = eid;
  }
  if (patient === 0) return false;

  Health.hp[patient] = Math.min(
    healableMax(world, patient),
    Health.hp[patient]! + REPAIR_HP_PER_S * world.dt
  );
  return true;
}

/**
 * The most hull a repair may ever put back: everything the deep has not
 * taken. `Pressure.unhealable` is exactly the ledger the pressure system
 * keeps so that a repair system, when it arrived, would not undo it.
 */
function healableMax(world: SimWorld, eid: number): number {
  const lost = hasComponent(world, Pressure, eid) ? Pressure.unhealable[eid]! : 0;
  return Math.max(0, Health.max[eid]! - lost);
}

/**
 * The Spinner's regrowth, one mine per interval, at a nursery only — inside
 * an allied Spore Veil, or within reach of an own Bastion. A clock that only
 * runs in range, like the torpedo rearm: leaving mid-growth has cost nothing,
 * it simply has not finished.
 */
function regrow(world: SimWorld, growers: readonly number[], dt: number): void {
  const { MAGAZINE, REGROW_S, BASTION_RADIUS_M } = HULL_EFFECTS.SPINNER;
  const sites = structures(world);

  for (let i = 0; i < growers.length; i++) {
    const eid = growers[i]!;
    if (Health.hp[eid]! <= 0) continue;
    const stats = statsFor(Unit.kind[eid] as UnitKind);
    const full = stats.mineMagazine ?? MAGAZINE;
    if (MineMagazine.mines[eid]! >= full) {
      MineMagazine.regrowRemainingS[eid] = 0;
      continue;
    }

    const slot = Owner.slot[eid]!;
    const x = Position.x[eid]!;
    const y = Position.y[eid]!;
    let nursed = false;
    for (let j = 0; j < sites.length; j++) {
      const site = sites[j]!;
      if (Health.hp[site]! <= 0) continue;
      if (hasComponent(world, UnderConstruction, site)) continue;
      const kind = Structure.kind[site] as StructureKind;
      let reach: number;
      if (kind === StructureKind.Bastion) {
        if (Owner.slot[site] !== slot) continue;
        reach = BASTION_RADIUS_M;
      } else if (kind === StructureKind.SporeVeil) {
        // The veil's grant, not its ownership — the same key the auras use.
        if (Structure.grantSlot[site] !== slot) continue;
        reach = STRUCTURE_AURAS.SPORE_VEIL.RADIUS_M;
      } else {
        continue;
      }
      if (Math.hypot(Position.x[site]! - x, Position.y[site]! - y) <= reach) {
        nursed = true;
        break;
      }
    }
    if (!nursed) continue;

    if (MineMagazine.regrowRemainingS[eid]! <= 0) MineMagazine.regrowRemainingS[eid] = REGROW_S;
    MineMagazine.regrowRemainingS[eid] = MineMagazine.regrowRemainingS[eid]! - dt;
    if (MineMagazine.regrowRemainingS[eid]! <= 0) {
      MineMagazine.mines[eid] = MineMagazine.mines[eid]! + 1;
      MineMagazine.regrowRemainingS[eid] = 0;
    }
  }
}
