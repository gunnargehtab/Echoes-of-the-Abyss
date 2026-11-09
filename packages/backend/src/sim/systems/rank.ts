/**
 * Earning a rank — docs/systems-progression.md §3.
 *
 * Experience is credited where damage lands, by the systems that land it,
 * through the two functions here, so the combat, ordnance and fauna passes
 * cannot disagree about what counts or about what a rank does to the hull.
 * The one per-tick part is `rankSystem`, which pays a survivor once its fight
 * is over. §3's four rulings (#1785) are the whole of it:
 *
 *   - **dealt** is the hull's own *gun*, in the hull it removes. Only
 *     `combat.ts` calls `creditDealt`: a torpedo, a mine or a depth charge
 *     earns its launcher nothing, because rule 3 prices a shooter's exposure at
 *     its own position when the blow lands, and by then a launcher has moved
 *     on and a layer was never there;
 *   - **taken** is any hit from an enemy weapon or a creature, at half, once
 *     the hull has *survived the fight*: banked as it lands and paid after
 *     `RANK.QUIET_S` without another hit. Gun, torpedo, mine, depth charge and
 *     bite call `creditTaken`; crush, hazards, the Lid and the Standing Wave —
 *     which "harms everyone equally" and is owned by nobody — are the water,
 *     and never do;
 *   - thresholds are the **listed** hull's (`rankForExperience`);
 *   - a rank's hull **multiplies** the Plate's (`promote`).
 *
 * Experience is hull points, and only a hull earns it: the `Veterancy`
 * component is on hulls alone, so a turret's kill or a creature's bite on
 * another creature finds nothing to credit and returns.
 */

import { hasComponent } from 'bitecs';
import { defineQuery } from '../query.ts';
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

const veterans = defineQuery([Veterancy, Health]);

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
 * `eid` took a hit that removed `removed` hull. Half of it is banked against
 * the fight, and the fight's clock starts again: "taken and survived" is paid
 * when the hull has survived the *fight* (§3's second ruling), which is a hull
 * the guns have stopped finding. A hull the hit sank banks nothing.
 *
 * Banked rather than credited, for docs/systems-combat.md §9: credited as it
 * landed, two fresh Corvettes in a duel each earned 75 an exchange and both
 * ranked on the sixth, so the rank's heal added a cycle to the fight every
 * player has most often. Banked, the winner ranks on its killing shot, from
 * its gun alone, and the loser never does.
 */
export function creditTaken(world: SimWorld, eid: number, removed: number): void {
  if (removed <= 0 || !hasComponent(world, Veterancy, eid)) return;
  if (Health.hp[eid]! <= 0) return;
  Veterancy.banked[eid] = Veterancy.banked[eid]! + removed * RANK.TAKEN_SHARE;
  Veterancy.quietS[eid] = RANK.QUIET_S;
}

/**
 * Pay every hull whose fight is over what it banked surviving it.
 *
 * Every tick, after every pass that lands a hit: a hit this tick restarted its
 * hull's clock before this counts it down. A hull sunk before its clock ran out
 * is paid nothing — `gain` refuses a hull with no hull — and the reaper takes
 * the bank with it. A linear walk of the hulls, one comparison each for a hull
 * with nothing banked, which is nearly all of them.
 */
export function rankSystem(world: SimWorld): void {
  const hulls = veterans(world);
  for (let i = 0; i < hulls.length; i++) {
    const eid = hulls[i]!;
    const banked = Veterancy.banked[eid]!;
    if (banked <= 0) continue;
    const left = Veterancy.quietS[eid]! - world.dt;
    if (left > 0) {
      Veterancy.quietS[eid] = left;
      continue;
    }
    Veterancy.quietS[eid] = 0;
    Veterancy.banked[eid] = 0;
    gain(world, eid, banked);
  }
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
 * The rank's increment is *added* to the maximum the hull has, never written
 * over it, so a maximum something else set stays set. The increment is the
 * difference of two `rankedHull` figures, so on an unplated hull the sum lands
 * on `rankedHull(listed, rank)` exactly — two singles a factor under two apart
 * subtract without error — and that is the number a plated veteran reads at
 * Track (echoLayer.ts). A drifted one would sort the plate the readout hides.
 * A plated hull's own maximum may sit an ulp off its fresh product, which
 * nothing reads: its Track readout is `rankedHull`, not `Health.max`.
 *
 * The permanent loss stays where it was. A rank adds new hull rather than
 * mending old, so the share of the bar the deep took is still the deep's.
 */
function promote(world: SimWorld, eid: number, rank: number): void {
  const listed = statsFor(Unit.kind[eid] as UnitKind).maxHp;
  const plate = refitHullFactor(world.refits.get(Owner.slot[eid]!));
  const added = (rankedHull(listed, rank) - rankedHull(listed, Veterancy.rank[eid]!)) * plate;
  const before = Health.max[eid]!;
  Health.max[eid] = before + added;
  Health.hp[eid] = Health.hp[eid]! + (Health.max[eid]! - before);
  Veterancy.rank[eid] = rank;
}
