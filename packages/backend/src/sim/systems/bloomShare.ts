/**
 * Bloom-share — docs/economy.md §6.
 *
 * "Plateau blooms yield continuously, without a harvester loop, provided the
 * plateau is theirs." The tithe's idea anchored to ground
 * (docs/mission-tend.md §13): where `tithe.ts` pays a faction for existing,
 * this pays one for *standing somewhere* — a node yields while a live Commune
 * hull tends it, and stops the tick it is untended. No trips, no cargo, no
 * throttle, and nothing banks, which is what keeps it a rate rather than a
 * stockpile with extra steps (the Thermal Draw argument, docs/economy.md §8).
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
 * to leave.
 *
 * On the 60 Hz budget: nodes × units distance checks, no path integrals, no
 * allocation. Every skirmish map today authors zero nodes, so the early
 * return is the whole cost until one does.
 */

import { defineQuery } from 'bitecs';
import { BLOOM_SHARE, Faction } from '@echoes/shared';
import { Health, Owner, Position, SilentRunning, Unit } from '../components.ts';
import { economyFor, type SimWorld } from '../world.ts';

const hulls = defineQuery([Unit, Position, Owner, Health, SilentRunning]);

export function bloomShareSystem(world: SimWorld): void {
  const blooms = world.blooms;
  if (blooms.length === 0) return;
  const candidates = hulls(world);
  if (candidates.length === 0) return;

  const radiusSq = BLOOM_SHARE.TEND_RADIUS_M * BLOOM_SHARE.TEND_RADIUS_M;
  const payment = BLOOM_SHARE.PER_NODE_PER_S * world.dt;

  for (let n = 0; n < blooms.length; n++) {
    const bloom = blooms[n]!;
    for (let i = 0; i < candidates.length; i++) {
      const eid = candidates[i]!;
      if (Owner.faction[eid] !== Faction.Pelagia) continue;
      if (Health.hp[eid]! <= 0) continue;
      // Silence stops the work — docs/systems-echo.md §6.
      if (SilentRunning.active[eid] === 1) continue;
      const dx = Position.x[eid]! - bloom.x;
      const dy = Position.y[eid]! - bloom.y;
      if (dx * dx + dy * dy > radiusSq) continue;
      economyFor(world, Owner.slot[eid]!).nodules += payment;
      // One share per node per tick: a garden pays for being tended, not per
      // gardener, so massing hulls on one node buys nothing but exposure.
      break;
    }
  }
}
