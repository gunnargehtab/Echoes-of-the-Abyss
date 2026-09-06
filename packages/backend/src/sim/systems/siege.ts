/**
 * The two siege effects with clocks — docs/systems-combat.md §9, "A weapon that
 * is not a weapon".
 *
 * A system of its own rather than two more branches in `hullEffects.ts`,
 * because neither of these is a hull effect in that file's sense. Everything
 * there is a hull doing something to itself or to its neighbours while it
 * stands still, keyed on `HullEffect.active`. These two outlive the hull: a
 * spore is carried by the *structure* and keeps eating after the Blight has
 * gone home or gone down, and a song is a thing that happened to a *place*.
 * That difference is the design, not an implementation detail — it is why one
 * Blight can seed three walls and why killing the singer does not stop the
 * Drift arriving.
 */

import { addComponent, defineQuery, hasComponent, removeComponent } from 'bitecs';
import {
  HULL_EFFECTS,
  statsFor,
  structureStatsFor,
  type StructureKind,
  type UnitKind,
} from '@echoes/shared';
import { Health, Position, Song, Spore, Structure, Unit } from '../components.ts';
import type { SimWorld } from '../world.ts';

const spored = defineQuery([Spore, Structure, Health]);
const singers = defineQuery([Song, Position, Unit]);

/**
 * Seed a structure. Returns false when the target already carries a strain.
 *
 * One strain at a time per structure, and it does not refresh: two Blights on
 * one Refinery would otherwise stack to 2% a second and take the wall outright,
 * which is exactly what §9 says a spore does not do. The second hull's answer
 * is a second wall.
 */
export function seedSpore(world: SimWorld, structure: number, slot: number): boolean {
  if (hasComponent(world, Spore, structure) && Spore.remainingS[structure]! > 0) return false;
  const stats = structureStatsFor(Structure.kind[structure] as StructureKind);
  // Added before it is written, or the query never sees it and the strain sits
  // in a store nothing walks — the spore would be silent in the wrong sense.
  if (!hasComponent(world, Spore, structure)) addComponent(world, Spore, structure);
  Spore.remainingS[structure] = HULL_EFFECTS.BLIGHT.DURATION_S;
  // Resolved once, at seeding, from the target's *maximum* hull. A percentage
  // re-read each tick against current hull would decay asymptotically and never
  // finish — the same sentence, a different weapon.
  Spore.perS[structure] = stats.maxHp * HULL_EFFECTS.BLIGHT.PER_S;
  Spore.slot[structure] = slot;
  return true;
}

/** Start a song at the hull's own position. Returns false while it is cold. */
export function startSong(world: SimWorld, hull: number): boolean {
  if (!hasComponent(world, Song, hull)) return false;
  if (Song.remainingS[hull]! > 0 || Song.cooldownS[hull]! > 0) return false;
  Song.remainingS[hull] = HULL_EFFECTS.LURE.SONG_S;
  Song.cooldownS[hull] = HULL_EFFECTS.LURE.COOLDOWN_S + HULL_EFFECTS.LURE.SONG_S;
  Song.x[hull] = Position.x[hull]!;
  Song.y[hull] = Position.y[hull]!;
  return true;
}

/**
 * Is this position inside a song a *different* slot is singing?
 *
 * Read by the fauna aggro ladder. The owner's own hulls are weighted too — a
 * Lure that made the Drift ignore the navy that called it would be a free
 * area-denial ability rather than a siege, and "the Directorate does not knock
 * the wall down, it invites the Drift to" is a sentence about a place, not
 * about a flag.
 */
export function songWeightAt(world: SimWorld, x: number, y: number): number {
  const hulls = singers(world);
  const { RADIUS_M, AGGRO_MULTIPLIER } = HULL_EFFECTS.LURE;
  for (let i = 0; i < hulls.length; i++) {
    const eid = hulls[i]!;
    if (Song.remainingS[eid]! <= 0) continue;
    const dx = Song.x[eid]! - x;
    const dy = Song.y[eid]! - y;
    if (dx * dx + dy * dy <= RADIUS_M * RADIUS_M) return AGGRO_MULTIPLIER;
  }
  return 1;
}

/** Does anything have a song running? The gate that keeps the read free. */
export function anySongRunning(world: SimWorld): boolean {
  const hulls = singers(world);
  for (let i = 0; i < hulls.length; i++) {
    if (Song.remainingS[hulls[i]!]! > 0) return true;
  }
  return false;
}

export function siegeSystem(world: SimWorld, destroyed: number[]): void {
  const dt = world.dt;

  const walls = spored(world);
  for (let i = 0; i < walls.length; i++) {
    const eid = walls[i]!;
    if (Spore.remainingS[eid]! <= 0) continue;
    if (Health.hp[eid]! <= 0) {
      removeComponent(world, Spore, eid);
      continue;
    }

    Spore.remainingS[eid] = Math.max(0, Spore.remainingS[eid]! - dt);
    Health.hp[eid] = Health.hp[eid]! - Spore.perS[eid]! * dt;

    // And nothing touches `Acoustic.sig`. Stated as a line rather than left as
    // an absence, because the silence *is* the weapon (§9) and the next person
    // to add a tell here should have to delete this comment to do it.

    if (Health.hp[eid]! <= 0) {
      Health.hp[eid] = 0;
      destroyed.push(eid);
    }
  }

  const hulls = singers(world);
  for (let i = 0; i < hulls.length; i++) {
    const eid = hulls[i]!;
    if (Song.remainingS[eid]! > 0) {
      Song.remainingS[eid] = Math.max(0, Song.remainingS[eid]! - dt);
      // A singing hull is loud for as long as it sings, written into the same
      // floor a cutter and a bell use — combat cannot write this one, because
      // a Lure is unarmed and never reaches that loop.
      const working = statsFor(Unit.kind[eid] as UnitKind).sigWorking;
      if (working !== undefined) world.siegeWorkSig.set(eid, working);
    }
    if (Song.cooldownS[eid]! > 0) Song.cooldownS[eid] = Math.max(0, Song.cooldownS[eid]! - dt);
  }
}

/** Exported for the acoustics pass: is this hull singing right now? */
export function isSinging(world: SimWorld, eid: number): boolean {
  return hasComponent(world, Song, eid) && Song.remainingS[eid]! > 0;
}
