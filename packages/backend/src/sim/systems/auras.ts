/**
 * Faction auras — the signature buildings, and the hulls that carry the same
 * grants, made mechanical.
 *
 * Each aura is an argument about sound or depth (docs/units.md): the Baffle
 * Barge bends propagation around a loud army, the Cantor lends every ally
 * under its dome the Directorate's ears, the Sounding Spire rents out a
 * band of depth. The rung's roster puts three of those on hulls (#461): the
 * Precentor is a Cantor's dome at a third of the radius, moving at the
 * swarm's pace; a singing Cantus and a seeded Sower are the Spire's grant
 * where the hull stands. None of them touch the Echo Layer directly — this
 * system writes *effective* values (Acoustic.pfFactor, Acoustic.hyd,
 * Pressure.bonus) each tick, and the systems that already consume those
 * values pick the auras up for free.
 *
 * Rewriting every tick rather than on enter/leave keeps the auras stateless:
 * a barge that dies stops masking on the next tick because nothing
 * remembers it ever masked, and a Cantus that moves stops granting on the
 * tick `hullEffectsSystem` says it moved.
 */

import { defineQuery, hasComponent } from 'bitecs';
import {
  HULL_EFFECTS,
  STRUCTURE_AURAS,
  StructureKind,
  UnitKind,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
} from '@echoes/shared';
import {
  Acoustic,
  Health,
  HullEffect,
  LandingGrant,
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
// `Position`, so a hull in a hold (systems/carrying.ts) is neither reset nor
// veiled here: the Spore Veil pass reads a position, and a carried hull has
// none to read.
const emitters = defineQuery([Acoustic, Position]);

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
// The hull-borne grants (docs/units.md, the rung's roster). A Precentor's dome
// is always up; a Cantus's and a Sower's grant is up exactly while
// `HullEffect.active` says the hull is singing or seeded.
const precentors: Aura[] = [];
const singers: Aura[] = [];
const seeders: Aura[] = [];

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
  precentors.length = 0;
  singers.length = 0;
  seeders.length = 0;
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
  const { PRECENTOR, CANTUS, SOWER } = HULL_EFFECTS;
  const roster = units(world);

  // The hull-borne sources, gathered before the grant pass for the reason the
  // structures are: a grant is a fact about the source's position this tick,
  // and the pass below must see every source before it hands out anything.
  // A hull is a source only while it is alive — reap runs after this — and
  // the grant key is `Owner.slot`: nothing lends a hull's aura away.
  for (let i = 0; i < roster.length; i++) {
    const eid = roster[i]!;
    if (Health.hp[eid]! <= 0) continue;
    const kind = Unit.kind[eid] as UnitKind;
    const list =
      kind === UnitKind.Precentor
        ? precentors
        : kind === UnitKind.Cantus && HullEffect.active[eid] === 1
          ? singers
          : kind === UnitKind.Sower && HullEffect.active[eid] === 1
            ? seeders
            : null;
    if (list === null) continue;
    list.push({ eid, x: Position.x[eid]!, y: Position.y[eid]!, slot: Owner.slot[eid]! });
  }

  for (let i = 0; i < roster.length; i++) {
    const eid = roster[i]!;
    const slot = Owner.slot[eid]!;

    if (barges.length > 0 && inRange(eid, barges, slot, BAFFLE_BARGE.RADIUS_M)) {
      Acoustic.pfFactor[eid] = BAFFLE_BARGE.PF_FACTOR;
    }

    // HYD is derived state exactly like SIG: base hull rating, plus the dome,
    // plus the Precentor's, plus whatever weather is doing to it. A Resonance
    // Storm is applied here rather than by the hazard system for the same
    // reason auras are — this pass rewrites HYD from scratch every tick, so
    // anything that wrote it earlier in the step would simply be overwritten.
    // The two domes sum and then meet the one cap: under a Cantor as well, a
    // Precentor "adds nothing: the cap is the cap" (docs/units.md).
    const weather = stormModifiers(world, eid);
    let hyd = statsFor(Unit.kind[eid] as UnitKind).hyd + weather.hyd;
    let lent = false;
    if (cantors.length > 0 && inRange(eid, cantors, slot, CANTOR.RADIUS_M)) {
      hyd += CANTOR.HYD_BONUS;
      lent = true;
    }
    if (precentors.length > 0 && inRange(eid, precentors, slot, PRECENTOR.RADIUS_M)) {
      hyd += PRECENTOR.HYD_BONUS;
      lent = true;
    }
    Acoustic.hyd[eid] = lent ? Math.min(CANTOR.HYD_CAP, hyd) : hyd;

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
      // The Spire's grant on a hull — a singing Cantus, a seeded Sower — and
      // resolved against the Spire's as a **max and never a sum**, for the
      // reason the mission grant below gives: "under a Sower and a second
      // Sower it does not go deeper — the grant does not stack, exactly as
      // the Spire's does not" (docs/units.md). Unlike the Spire there is no
      // load-bearing test: the hull sings at 80 or seeds at 45 for as long as
      // it stands there, whoever is underneath.
      if (singers.length > 0 && inRange(eid, singers, slot, CANTUS.RADIUS_M)) {
        if (CANTUS.PR_BONUS > bonus) bonus = CANTUS.PR_BONUS;
      }
      if (seeders.length > 0 && inRange(eid, seeders, slot, SOWER.RADIUS_M)) {
        if (SOWER.PR_BONUS > bonus) bonus = SOWER.PR_BONUS;
      }
      // What an Antiphon landed, for the twenty seconds it landed it with
      // (docs/units.md; systems/carrying.ts runs the clock). Into the same
      // max, for the same reason: a hull landed under a Cantus has rented one
      // band, not two.
      if (hasComponent(world, LandingGrant, eid) && LandingGrant.remainingS[eid]! > 0) {
        if (LandingGrant.bonus[eid]! > bonus) bonus = LandingGrant.bonus[eid]!;
      }
      // A mission's own habitable water — `MissionRegion.pressureBonus`, and
      // the `ground` beat that sows one. Resolved against the Spire's grant as
      // a **max and never a sum**: a hull standing in a sown furrow under a
      // node has rented one band, not two, and the arithmetic deciding whether
      // water crushes is not somewhere two authored features may quietly add
      // up. Empty in every skirmish, and the loop is gated on that.
      if (world.regionPressureBonus.length > 0) {
        const ux = Position.x[eid]!;
        const uy = Position.y[eid]!;
        for (let g = 0; g < world.regionPressureBonus.length; g++) {
          const grant = world.regionPressureBonus[g]!;
          if (ux < grant.x || ux > grant.x + grant.widthM) continue;
          if (uy < grant.y || uy > grant.y + grant.heightM) continue;
          if (grant.bonus > bonus) bonus = grant.bonus;
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
