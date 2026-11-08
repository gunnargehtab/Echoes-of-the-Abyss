/**
 * Granting a refit — docs/systems-progression.md §2.
 *
 * Not a per-tick system, and it is here rather than in `world.ts` because it
 * is the one place a purchase reaches *every hull a navy owns at once*, which
 * is a query and not a spawn. `productionSystem` calls it when the line runs
 * out, and `Match.refit` calls it directly for the Knights, whose Pressure
 * Refit has no line to run out.
 *
 * Two of the five write the hulls, because each moves a number the hull
 * carries: the Pressure Refit its rating, the Plate its hull. The other three
 * write nothing here. Speed and the depth rates, a full magazine and a full
 * hold are read live from `world.refits` by the systems that own them
 * (movement, depth, the rearm, the harvest), so a hull already afloat has them
 * from the next tick without being walked.
 *
 * A Pressure Refit is permanent and bought, so it is written into
 * `Pressure.rating` — the hull's own band — rather than into `Pressure.bonus`,
 * which the auras pass rewrites every tick from whatever grants the hull is
 * standing in. The two therefore add: a refitted hull under a Sounding Spire
 * has bought one band and rented another, which is exactly what §2 means by
 * paying for the end of raiding.
 */

import { defineQuery } from '../query.ts';
import { REFIT_STATS, refittedPressureRating, RefitKind, type Faction } from '@echoes/shared';
import { Health, Owner, Pressure, Unit } from '../components.ts';
import type { SimWorld } from '../world.ts';

// Hulls only. A structure has no Pressure component and fauna belong to no
// navy; ordnance inherits its launcher's rating at release, so a torpedo fired
// by a refitted hull is already refitted without being walked here. A hull in
// a transport's hold is walked like any other: it has no Position while it is
// carried, and needs none to be refitted.
const refittable = defineQuery([Unit, Owner, Pressure, Health]);

/**
 * Record the purchase and apply it to everything already afloat.
 *
 * Idempotent: buying a refit twice is refused at `Match.refit`, and this
 * returns false rather than granting it again if it ever gets here anyway.
 * That matters more than it looks — the Pressure Refit's grant is a
 * `Math.min` against the navy's ceiling and the Plate's a multiplication, so a
 * second application would be silent for one and compound for the other.
 */
export function grantRefit(world: SimWorld, slot: number, kind: RefitKind): boolean {
  let owned = world.refits.get(slot);
  if (owned === undefined) {
    owned = new Set();
    world.refits.set(slot, owned);
  }
  if (owned.has(kind)) return false;
  owned.add(kind);

  if (kind !== RefitKind.Pressure && kind !== RefitKind.Plate) return true;

  const hulls = refittable(world);
  for (let i = 0; i < hulls.length; i++) {
    const eid = hulls[i]!;
    if (Owner.slot[eid] !== slot) continue;
    // A hull the reaper has not got to yet is not a hull. Refitting it would
    // put a change into the state hash for an entity that is about to leave
    // the world, which is a divergence with no behaviour behind it.
    if (Health.hp[eid]! <= 0) continue;
    if (kind === RefitKind.Pressure) {
      Pressure.rating[eid] = refittedPressureRating(
        Pressure.rating[eid]!,
        Owner.faction[eid] as Faction
      );
    } else {
      plate(eid, REFIT_STATS[RefitKind.Plate].hullFactor);
    }
  }
  return true;
}

/**
 * More hull on a hull already afloat, at the condition it was in.
 *
 * The whole bar scales — current hull, maximum, and the share of it the deep
 * has taken for good — so a full hull stays full and a half-sunk one stays
 * half-sunk (docs/systems-progression.md §2). The alternative was to add the
 * new plate as current hull, which is what rank does, and §3 calls that "the
 * one heal a hull can earn under fire"; a refit is bought, and a fleet-wide
 * heal for money would make the sentence false. Scaling the permanent loss
 * too is the same ruling for the part of the bar a repair may never touch: a
 * new plate does not un-crush a hull, and a Tender finds the same share of the
 * bar to weld as it did before.
 */
function plate(eid: number, factor: number): void {
  Health.max[eid] = Health.max[eid]! * factor;
  Health.hp[eid] = Health.hp[eid]! * factor;
  Pressure.unhealable[eid] = Pressure.unhealable[eid]! * factor;
}
