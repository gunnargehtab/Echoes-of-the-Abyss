/**
 * Faction structure auras — the three signature buildings, made mechanical.
 *
 * Each aura is an argument about sound or depth (docs/units.md): the Baffle
 * Barge bends propagation around a loud army, the Cantor lends every ally
 * under its dome the Directorate's ears, the Sounding Spire rents out a
 * band of depth. None of them touch the Echo Layer directly — this system
 * writes *effective* values (Acoustic.pfFactor, Acoustic.hyd,
 * Pressure.bonus) each tick, and the systems that already consume those
 * values pick the auras up for free.
 *
 * Rewriting every tick rather than on enter/leave keeps the auras stateless:
 * a barge that dies stops masking on the next tick because nothing
 * remembers it ever masked.
 */

import { defineQuery, hasComponent } from 'bitecs';
import {
  STRUCTURE_AURAS,
  StructureKind,
  requiredPressureRating,
  statsFor,
  type UnitKind,
} from '@echoes/shared';
import {
  Acoustic,
  Owner,
  Position,
  Pressure,
  Structure,
  UnderConstruction,
  Unit,
} from '../components.ts';
import type { SimWorld } from '../world.ts';

const structures = defineQuery([Structure, Position, Owner]);
const units = defineQuery([Unit, Position, Owner, Acoustic]);
const emitters = defineQuery([Acoustic]);

interface Aura {
  eid: number;
  x: number;
  y: number;
  slot: number;
}

// Scratch lists, reused across ticks. Aura counts are single digits.
const barges: Aura[] = [];
const cantors: Aura[] = [];
const spires: Aura[] = [];

function inRange(unit: number, auras: Aura[], slot: number, radiusM: number): boolean {
  const ux = Position.x[unit]!;
  const uy = Position.y[unit]!;
  for (let i = 0; i < auras.length; i++) {
    const a = auras[i]!;
    if (a.slot !== slot) continue;
    if (Math.hypot(a.x - ux, a.y - uy) <= radiusM) return true;
  }
  return false;
}

export function aurasSystem(world: SimWorld): void {
  barges.length = 0;
  cantors.length = 0;
  spires.length = 0;
  world.spireActive.clear();

  // A construction site projects nothing — the aura arrives with commission.
  const sites = structures(world);
  for (let i = 0; i < sites.length; i++) {
    const eid = sites[i]!;
    if (hasComponent(world, UnderConstruction, eid)) continue;
    const kind = Structure.kind[eid] as StructureKind;
    const list =
      kind === StructureKind.BaffleBarge
        ? barges
        : kind === StructureKind.Cantor
          ? cantors
          : kind === StructureKind.SoundingSpire
            ? spires
            : null;
    if (list === null) continue;
    list.push({ eid, x: Position.x[eid]!, y: Position.y[eid]!, slot: Owner.slot[eid]! });
  }

  // Baseline: everything emits through unmodified terrain PF.
  const all = emitters(world);
  for (let i = 0; i < all.length; i++) Acoustic.pfFactor[all[i]!] = 1;

  const { BAFFLE_BARGE, CANTOR, SOUNDING_SPIRE } = STRUCTURE_AURAS;
  const roster = units(world);
  for (let i = 0; i < roster.length; i++) {
    const eid = roster[i]!;
    const slot = Owner.slot[eid]!;

    if (barges.length > 0 && inRange(eid, barges, slot, BAFFLE_BARGE.RADIUS_M)) {
      Acoustic.pfFactor[eid] = BAFFLE_BARGE.PF_FACTOR;
    }

    // HYD is derived state exactly like SIG: base hull rating, plus the dome.
    const baseHyd = statsFor(Unit.kind[eid] as UnitKind).hyd;
    Acoustic.hyd[eid] =
      cantors.length > 0 && inRange(eid, cantors, slot, CANTOR.RADIUS_M)
        ? Math.min(CANTOR.HYD_CAP, baseHyd + CANTOR.HYD_BONUS)
        : baseHyd;

    if (hasComponent(world, Pressure, eid)) {
      let bonus = 0;
      if (spires.length > 0) {
        const ux = Position.x[eid]!;
        const uy = Position.y[eid]!;
        for (let s = 0; s < spires.length; s++) {
          const spire = spires[s]!;
          if (spire.slot !== slot) continue;
          if (Math.hypot(spire.x - ux, spire.y - uy) > SOUNDING_SPIRE.RADIUS_M) continue;
          bonus = SOUNDING_SPIRE.PR_BONUS;
          // The spire is *projecting* only when its grant is load-bearing —
          // this unit is genuinely below its own rating. That is when the
          // node sings at SIG 80 (docs/units.md: "80 when active").
          if (requiredPressureRating(Position.depth[eid]!) > Pressure.rating[eid]!) {
            world.spireActive.add(spire.eid);
          }
        }
      }
      Pressure.bonus[eid] = bonus;
    }
  }
}
