/**
 * Granting a refit — docs/systems-progression.md §2.
 *
 * Not a per-tick system, and it is here rather than in `world.ts` because it
 * is the one place a purchase reaches *every hull a navy owns at once*, which
 * is a query and not a spawn. `productionSystem` calls it when the line runs
 * out, and `Match.refit` calls it directly for the Knights, whose Pressure
 * Refit has no line to run out.
 *
 * A refit is permanent and bought, so it is written into `Pressure.rating` —
 * the hull's own band — rather than into `Pressure.bonus`, which the auras
 * pass rewrites every tick from whatever grants the hull is standing in. The
 * two therefore add: a refitted hull under a Sounding Spire has bought one
 * band and rented another, which is exactly what §2 means by paying for the
 * end of raiding.
 */

import { defineQuery } from 'bitecs';
import { refittedPressureRating, RefitKind, type Faction } from '@echoes/shared';
import { Health, Owner, Pressure, Unit } from '../components.ts';
import type { SimWorld } from '../world.ts';

// Hulls only. A structure has no Pressure component and fauna belong to no
// navy; ordnance inherits its launcher's rating at release, so a torpedo fired
// by a refitted hull is already refitted without being walked here.
const refittable = defineQuery([Unit, Owner, Pressure, Health]);

/**
 * Record the purchase and apply it to everything already afloat.
 *
 * Idempotent: buying a refit twice is refused at `Match.refit`, and this
 * returns false rather than granting a second band if it ever gets here
 * anyway. That matters more than it looks — the grant is a `Math.min` against
 * the navy's ceiling rather than a flat `+1`, so a second application would be
 * silent rather than obviously wrong.
 */
export function grantRefit(world: SimWorld, slot: number, kind: RefitKind): boolean {
  let owned = world.refits.get(slot);
  if (owned === undefined) {
    owned = new Set();
    world.refits.set(slot, owned);
  }
  if (owned.has(kind)) return false;
  owned.add(kind);

  if (kind !== RefitKind.Pressure) return true;

  const hulls = refittable(world);
  for (let i = 0; i < hulls.length; i++) {
    const eid = hulls[i]!;
    if (Owner.slot[eid] !== slot) continue;
    // A hull the reaper has not got to yet is not a hull. Refitting it would
    // put a rating change into the state hash for an entity that is about to
    // leave the world, which is a divergence with no behaviour behind it.
    if (Health.hp[eid]! <= 0) continue;
    Pressure.rating[eid] = refittedPressureRating(
      Pressure.rating[eid]!,
      Owner.faction[eid] as Faction
    );
  }
  return true;
}
