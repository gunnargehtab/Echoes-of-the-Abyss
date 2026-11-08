/**
 * Earning a rank — docs/systems-progression.md §3.
 *
 * Not a per-tick system. Experience is credited where damage lands, by the
 * systems that land it, through the two functions here, so the combat,
 * ordnance and fauna passes cannot disagree about what counts or about what a
 * rank does to the hull. §3's four rulings (#1785) are the whole of it:
 *
 *   - **dealt** is the hull's own *gun*, in the hull it removes. Only
 *     `combat.ts` calls `creditDealt`: a torpedo, a mine or a depth charge
 *     earns its launcher nothing, because rule 3 prices a shooter's exposure at
 *     its own position when the blow lands, and by then a launcher has moved
 *     on and a layer was never there;
 *   - **taken** is any hit from an enemy weapon or a creature that the hull
 *     lives through, at half. Gun, torpedo, mine, depth charge and bite call
 *     `creditTaken`; crush, hazards, the Lid and the Standing Wave — which
 *     "harms everyone equally" and is owned by nobody — are the water, and
 *     never do;
 *   - thresholds are the **listed** hull's (`rankForExperience`);
 *   - a rank's hull **multiplies** the Plate's (`promote`).
 *
 * Experience is hull points, and only a hull earns it: the `Veterancy`
 * component is on hulls alone, so a turret's kill or a creature's bite on
 * another creature finds nothing to credit and returns.
 */

import { hasComponent } from 'bitecs';
import {
  RANK,
  rankForExperience,
  rankedHull,
  refitHullFactor,
  statsFor,
  type UnitKind,
} from '@echoes/shared';
import { Fauna, Health, Ordnance, Owner, Structure, Unit, Veterancy } from '../components.ts';
import type { SimWorld } from '../world.ts';

/**
 * Hull points a blow actually removed: never more than the target had.
 *
 * Callers read `before` ahead of the subtraction. A last shot into a wreck with
 * 5 hull left removed 5, whatever the gun's number (§3, "in hull points").
 */
export function removedHull(before: number, damage: number): number {
  return Math.max(0, Math.min(damage, before));
}

/**
 * The shooter's gun took `removed` hull off `target`.
 *
 * Hulls, structures and fauna count (§3); ordnance does not — point defence is
 * doing its job — and neither does anything else with hull, such as a
 * mission's struck iron, which is neither a fight nor one of §3's three.
 */
export function creditDealt(
  world: SimWorld,
  shooter: number,
  target: number,
  removed: number
): void {
  if (removed <= 0 || !hasComponent(world, Veterancy, shooter)) return;
  if (hasComponent(world, Ordnance, target)) return;
  if (
    !hasComponent(world, Unit, target) &&
    !hasComponent(world, Structure, target) &&
    !hasComponent(world, Fauna, target)
  ) {
    return;
  }
  gain(world, shooter, removed);
}

/**
 * `eid` took a hit that removed `removed` hull. Credited at half, and only if
 * it is still afloat: "taken and survived". A hull the hit sank earns nothing,
 * and would lose it with the hull if it did.
 */
export function creditTaken(world: SimWorld, eid: number, removed: number): void {
  if (removed <= 0 || !hasComponent(world, Veterancy, eid)) return;
  gain(world, eid, removed * RANK.TAKEN_SHARE);
}

function gain(world: SimWorld, eid: number, experience: number): void {
  // A hull the reaper has not got to yet is not a hull, for refit.ts's reason:
  // a rank-up would put a change into the state hash for an entity that is
  // about to leave the world.
  if (Health.hp[eid]! <= 0) return;
  Veterancy.experience[eid] = Veterancy.experience[eid]! + experience;
  if (Veterancy.rank[eid]! >= RANK.MAX) return;
  const listed = statsFor(Unit.kind[eid] as UnitKind).maxHp;
  const rank = rankForExperience(Veterancy.experience[eid]!, listed);
  if (rank > Veterancy.rank[eid]!) promote(world, eid, rank);
}

/**
 * The rank's hull, arriving as current hull too: "the one heal a hull can earn
 * under fire" (§3).
 *
 * The maximum is computed afresh from the listed hull rather than scaled from
 * the one the hull had, so every hull of a kind at a rank holds one number. A
 * scaled maximum drifts in the last bit with the order things happened in, and
 * an unplated veteran's maximum is what a plated one reads at Track
 * (`rankedHull`), so a drifted one would sort the plate the readout hides.
 *
 * The permanent loss stays where it was. A rank adds new hull rather than
 * mending old, so the share of the bar the deep took is still the deep's.
 */
function promote(world: SimWorld, eid: number, rank: number): void {
  const listed = statsFor(Unit.kind[eid] as UnitKind).maxHp;
  const before = Health.max[eid]!;
  Health.max[eid] = rankedHull(listed, rank) * refitHullFactor(world.refits.get(Owner.slot[eid]!));
  Health.hp[eid] = Health.hp[eid]! + (Health.max[eid]! - before);
  Veterancy.rank[eid] = rank;
}
