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
  structureStatsFor,
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
import { stormModifiers } from './hazards.ts';
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
const veils: Aura[] = [];

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
  veils.length = 0;
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
            : kind === StructureKind.SporeVeil
              ? veils
              : null;
    if (list === null) continue;
    // `grantSlot`, not `Owner.slot`: who the aura is for, which is who owns it
    // unless a mission has lent it away. See the field's comment for why the
    // two had to stop being one number.
    list.push({ eid, x: Position.x[eid]!, y: Position.y[eid]!, slot: Structure.grantSlot[eid]! });
  }

  // Baseline: everything emits through unmodified terrain PF at full SIG,
  // and structures listen at their spawned rating (units get theirs below).
  const all = emitters(world);
  for (let i = 0; i < all.length; i++) {
    const eid = all[i]!;
    Acoustic.pfFactor[eid] = 1;
    Acoustic.sigFactor[eid] = 1;
    if (hasComponent(world, Structure, eid)) {
      Acoustic.hyd[eid] = structureStatsFor(Structure.kind[eid] as StructureKind).hyd;
    }
  }

  const { BAFFLE_BARGE, CANTOR, SOUNDING_SPIRE } = STRUCTURE_AURAS;
  const roster = units(world);
  for (let i = 0; i < roster.length; i++) {
    const eid = roster[i]!;
    const slot = Owner.slot[eid]!;

    if (barges.length > 0 && inRange(eid, barges, slot, BAFFLE_BARGE.RADIUS_M)) {
      Acoustic.pfFactor[eid] = BAFFLE_BARGE.PF_FACTOR;
    }

    // HYD is derived state exactly like SIG: base hull rating, plus the dome,
    // plus whatever weather is doing to it. A Resonance Storm is applied here
    // rather than by the hazard system for the same reason auras are — this
    // pass rewrites HYD from scratch every tick, so anything that wrote it
    // earlier in the step would simply be overwritten.
    const weather = stormModifiers(world, eid);
    const baseHyd = statsFor(Unit.kind[eid] as UnitKind).hyd + weather.hyd;
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

  // Spore Veil — last, and SYMMETRIC: everything inside the cloud, friend or
  // foe, structure or hull, emits muffled and listens blind. Deliberately
  // after the Cantor pass: inside the veil even a Listener's ears are moss.
  if (veils.length > 0) {
    const { RADIUS_M, SIG_FACTOR, BLIND_HYD } = STRUCTURE_AURAS.SPORE_VEIL;
    for (let i = 0; i < all.length; i++) {
      const eid = all[i]!;
      const ex = Position.x[eid]!;
      const ey = Position.y[eid]!;
      for (let v = 0; v < veils.length; v++) {
        const veil = veils[v]!;
        if (Math.hypot(veil.x - ex, veil.y - ey) > RADIUS_M) continue;
        Acoustic.sigFactor[eid] = SIG_FACTOR;
        Acoustic.hyd[eid] = BLIND_HYD;
        break;
      }
    }
  }
}
