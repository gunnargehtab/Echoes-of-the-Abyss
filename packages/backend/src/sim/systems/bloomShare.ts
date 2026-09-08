/**
 * Bloom-share — docs/systems-flora.md §2, docs/economy.md §6.
 *
 * "Plateau blooms yield continuously, without a harvester loop, provided the
 * plateau is theirs." The tithe's idea anchored to ground
 * (docs/mission-tend.md §13): where `tithe.ts` pays a faction for existing,
 * this pays one for *standing somewhere* — a garden yields while a live
 * Commune hull tends it, and stops the tick it is untended.
 *
 * What changed in wave 6 is what it yields it out of. Bloom-share used to pay
 * a flat rate of nodules out of a position on the map with no supply behind
 * it, which made it the one economy in the game nobody could take away
 * without killing the gardeners. §2 re-founds it in one sentence — **a bloom
 * node is a bed** — and the rule that follows is the one its name always
 * implied:
 *
 *   Bloom-share takes the **interest, never the principal**. A tended bed
 *   pays up to what it regrows and no more, so it never depletes and never
 *   thins its own cover.
 *
 * So this pass touches no crop, records no harvest, and wears no Drift
 * Health — which is the entire difference between it and the two modes that
 * do (`flora.ts`'s reactor and the cutter in `hazards.ts`). The Commune is
 * paid for *holding a living bed*; everyone else is paid for consuming one.
 *
 * The payout is the bed's own regrowth, scaled by the canopy standing. The
 * scaling is the part §2 does not spell out and §2's promise requires: a
 * stripped bed in Healthy water still regrows at the flat 4% a minute, so an
 * unscaled payout would leave a raided plateau earning exactly what an intact
 * one does — and §2 says a raid on a Commune plateau "takes their income and
 * their concealment in the same act". Full canopy pays the full regrowth,
 * half pays half, bare ground pays nothing at all. The regrowth is the
 * ceiling, and only a whole bed reaches it.
 *
 * "Held" is tended, not possessed — docs/mission-tend.md §4's own words. A
 * hull driven off or killed stops the share on the tick; so does Silent
 * Running, because silence stops the work (docs/systems-echo.md §6, and
 * mission-tend §3: "SIG falls to single digits, the share stops accruing").
 * That is the whole counter-play: you do not have to kill the gardeners,
 * only make them leave or make them hide — and the guard-rail
 * (docs/systems-echo.md §10) puts the gardens on the most reachable ground
 * on the map so that somebody can.
 *
 * Units only, deliberately. Tending is work done by hulls — a structure
 * parked on a garden would turn "held" back into "possessed", and the
 * exposure the guard-rail prices is the exposure of things that can be made
 * to leave. A Commune player who wants more than the interest may put a
 * bio-reactor on their own bed like anybody else, and pays for it in cover.
 *
 * On the 60 Hz budget: beds × units distance checks, no path integrals, no
 * allocation. Every skirmish map today authors zero beds, so the early
 * return is the whole cost until one does.
 */

import { defineQuery } from 'bitecs';
import { BLOOM_SHARE, FLORA, Faction } from '@echoes/shared';
import { Health, Owner, Position, SilentRunning, Unit } from '../components.ts';
import { economyFor, type SimWorld } from '../world.ts';
import { regrowthPerS, standingCropOf } from './hazards.ts';

const hulls = defineQuery([Unit, Position, Owner, Health, SilentRunning]);

export function bloomShareSystem(world: SimWorld): void {
  const blooms = world.blooms;
  if (blooms.length === 0) return;
  const candidates = hulls(world);
  if (candidates.length === 0) return;

  const radiusSq = BLOOM_SHARE.TEND_RADIUS_M * BLOOM_SHARE.TEND_RADIUS_M;

  for (let n = 0; n < blooms.length; n++) {
    const bed = blooms[n]!;
    // What this bed regrows, in Biomass a second, scaled by what is standing.
    // Read before the hulls are walked because a bed paying nothing — bare,
    // or in water that has stopped growing anything — is the cheap case and
    // the one a raided plateau is in.
    const share =
      regrowthPerS(world, bed) * FLORA.FULL_CROP_BIOMASS * standingCropOf(bed) * world.dt;
    if (share <= 0) continue;

    for (let i = 0; i < candidates.length; i++) {
      const eid = candidates[i]!;
      if (Owner.faction[eid] !== Faction.Pelagia) continue;
      if (Health.hp[eid]! <= 0) continue;
      // Silence stops the work — docs/systems-echo.md §6.
      if (SilentRunning.active[eid] === 1) continue;
      const dx = Position.x[eid]! - bed.x;
      const dy = Position.y[eid]! - bed.y;
      if (dx * dx + dy * dy > radiusSq) continue;
      economyFor(world, Owner.slot[eid]!).biomass += share;
      // One share per bed per tick: a garden pays for being tended, not per
      // gardener, so massing hulls on one node buys nothing but exposure.
      break;
    }
  }
}
