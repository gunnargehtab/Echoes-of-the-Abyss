/**
 * The only place in this codebase that turns world state into a number the
 * client is shown, and the only thing standing between an objective counter and
 * a maphack written as arithmetic.
 *
 * **The guarantee: nothing here can report on anything the observer does not
 * own, because nothing here is given anything the observer does not own.** The
 * parameter list is the enforcement. `own` is the resolved `EchoSnapshot` this
 * slot is being sent on this very tick, so every number returned is one the
 * client could have computed for itself; `roleIds` and `loadedIds` name hulls
 * of the player's own party; `attended` counts what this observer's own ears
 * resolved and `sounded` what its own hulls finished; `regionById` and
 * `predicate` are authored map data
 * that shipped with the mission. There is no world, no ECS, no second snapshot and no slot
 * argument, so "three of five hostiles remaining" is not refused here — it
 * cannot be asked for.
 *
 * Its shortness is the argument. If this file ever needs a second page, the
 * thing being added is a leak, and the right answer is to change what the
 * mission asks the player to do.
 */

import type { EchoSnapshot, ResolutionTier } from '@echoes/shared';
import type { MissionPredicate, MissionRegion, MissionRole } from './types.ts';

export interface Progress {
  done: number;
  of: number;
}

/**
 * The player's own hulls in a role, by id exactly as `own.units` reports it.
 *
 * A function rather than a map, so the caller cannot hand this file a table it
 * has not filtered by owner.
 */
export type RoleIds = (role: MissionRole) => ReadonlySet<number>;

export type RegionById = (id: string) => MissionRegion | undefined;

/**
 * The player's own hulls currently carrying a completed lift, by id exactly as
 * `own.units` reports it — all of them for no argument, one named load's
 * carrier for a lift id. A function like `RoleIds`, for its reason: the caller
 * cannot hand this file a table it has not filtered by owner. Own-force
 * information and nothing else: a lift is assigned to a player-party hull by
 * the literal (`missions.test.ts` holds it to that), so no set this returns
 * can name a hull the observer does not own.
 *
 * The named form exists because one hull may carry several loads — Tend's
 * third tender brings a share load home and then carries the gift — and "the
 * gift reached the landing" is a fact about *that* load, not about the hull
 * being loaded at all (docs/mission-tend.md §5).
 */
export type LoadedIds = (lift?: string) => ReadonlySet<number>;

/**
 * Sim ticks the observer's own force has spent resolved at a given tier *or
 * better* by anybody else — the tolerance's tally (docs/mission-aptitude.md §5).
 *
 * A function of the tier for `RoleIds`' reason turned around: the predicate
 * carries the tier it enforces, and asking for it here means the number this
 * file compares is the number the runtime accrued under the same rule, rather
 * than a total accrued under some other one and trusted to match.
 *
 * Own-force information, like everything else in this list. It comes off
 * `EchoSnapshot.exposure`, which reports the best tier anybody holds on this
 * player and deliberately nothing about who holds it — so a tally over it can
 * say how loudly the party has been heard and can never say by whom.
 */
export type ExposedTicks = (tier: ResolutionTier) => number;

export function progressOf(
  predicate: MissionPredicate,
  own: EchoSnapshot,
  roleIds: RoleIds,
  regionById: RegionById,
  startedTick: number,
  loadedIds: LoadedIds,
  attended: number,
  exposed: ExposedTicks,
  sounded: number
): Progress {
  switch (predicate.kind) {
    case 'extract': {
      const region = regionById(predicate.region);
      if (region === undefined) return { done: 0, of: predicate.count };
      const ids = roleIds(predicate.role);
      const loaded =
        predicate.loaded === undefined
          ? undefined
          : loadedIds(typeof predicate.loaded === 'string' ? predicate.loaded : undefined);
      const inside = own.units.filter(
        (u) =>
          ids.has(u.id) && (loaded === undefined || loaded.has(u.id)) && inRegion(region, u.x, u.y)
      );
      // Capped, so a third hull arriving cannot render "2 of 1". The count
      // is what the court reads out, and a court does not over-count.
      return { done: Math.min(inside.length, predicate.count), of: predicate.count };
    }
    case 'survive': {
      const ids = roleIds(predicate.role);
      // A hull the player has lost is simply absent from their own snapshot,
      // which is why survival needs no death bookkeeping to read correctly.
      return { done: own.units.filter((u) => ids.has(u.id)).length, of: predicate.count };
    }
    case 'quiet': {
      // Measured over the hulls the order actually binds, never `own.peakSig`.
      //
      // That field is the peak across everything the player owns, structures
      // included — and in the prologue the loudest thing on the player's slot
      // is the court's own array, which sits there only so `aurasSystem` will
      // grant it (docs/mission-sorrowgate.md §4). Reading it would have the
      // court telling a faultless flight it was shoving, and then telling it
      // it had complied at the moment the colossus destroyed the array.
      const ids = roleIds(predicate.role);
      const peak = peakSigOf(own, ids);
      return { done: peak <= predicate.ceilingSig ? 1 : 0, of: 1 };
    }
    case 'attend':
      // A count of the observer's own resolutions, handed in as a number for
      // the reason every other parameter here is what it is: this file is
      // given nothing it could turn into somebody else's position. Capped so
      // a tenth arrival could not render "10 of 9".
      return { done: Math.min(attended, predicate.count), of: predicate.count };
    case 'sound':
      // A count of what the observer's own hulls finished, handed in as a
      // number for `attend`'s reason: this file is given nothing it could turn
      // into somebody else's position, and a completed sounding is a fact about
      // a player hull standing at an authored point. Capped, like the rest.
      return { done: Math.min(sounded, predicate.count), of: predicate.count };
    case 'endure':
      return { done: Math.max(0, own.tick - startedTick), of: predicate.ticks };
    case 'tolerance':
      // In ticks, which is what the union stores and what `isMet` has to
      // compare: the seconds of §12's reading are `view.ts`' arithmetic, and
      // doing them here would put a rounding step between the tally and the
      // threshold it is measured against.
      //
      // Capped for `attend` and `extract`'s reason — the reading is what the
      // chapter reads out, and a chapter does not over-count. §5 gives the
      // party thirty seconds and no interest in the thirty-first.
      return { done: Math.min(exposed(predicate.tier), predicate.ticks), of: predicate.ticks };
    case 'deliver':
      // The observer's own stockpile, read off the snapshot the player is
      // being sent this very tick: the named account is the figure their own
      // HUD carries, so the counter and the readout cannot disagree by a
      // delivery. The snapshot carries all three accounts already, which is
      // why Biomass needed a query and not a wire change. Capped, like every
      // counter — the register does not over-count.
      return { done: Math.min(own[predicate.account], predicate.amount), of: predicate.amount };
  }
}

export function isMet(
  predicate: MissionPredicate,
  own: EchoSnapshot,
  roleIds: RoleIds,
  regionById: RegionById,
  startedTick: number,
  loadedIds: LoadedIds,
  attended: number,
  exposed: ExposedTicks,
  sounded: number
): boolean {
  const { done, of } = progressOf(
    predicate,
    own,
    roleIds,
    regionById,
    startedTick,
    loadedIds,
    attended,
    exposed,
    sounded
  );
  return done >= of;
}

/**
 * Whether this predicate states a *standing condition* rather than an
 * achievement — something that is true or false right now, and can stop being
 * true.
 *
 * Objective statuses are monotone by design: reaching the Concourse or running
 * out a clock is a thing that happened, and un-happening it would rewrite the
 * player's history. A silence order is not that. It is in force or it is not,
 * and latching it at the first tick had the court reading "met" beside its own
 * words "The flight owes the court a silence", while it was actively
 * withdrawing the array over the breach — a status pill contradicting the row
 * it labels.
 */
export function isStanding(predicate: MissionPredicate): boolean {
  return predicate.kind === 'quiet';
}

/**
 * The loudest of a named set of the player's own hulls.
 *
 * Shared by the `quiet` predicate and the runtime's silence ledger so the
 * number the court enforces and the number it reads out are the same one. An
 * empty set is silent rather than loud: a rule with nothing left to bind
 * cannot be broken.
 */
export function peakSigOf(own: EchoSnapshot, ids: ReadonlySet<number>): number {
  let peak = 0;
  for (const unit of own.units) {
    if (ids.has(unit.id) && unit.sig > peak) peak = unit.sig;
  }
  return peak;
}

/**
 * Ticks spent at `tier` **or better**, out of a tally kept per observed tier.
 *
 * Shared by the runtime's accumulator and this file's `tolerance` case for
 * `peakSigOf`'s reason: the number the mission enforces and the number it reads
 * out must be the same one, computed once. "Or better" is the whole of §5's
 * rule — Tier 1 and Tier 2 are free all mission, Tier 3 is an entry, and Tier 4
 * is an entry for the same reason Tier 3 is — so it is summed upward rather
 * than read off a single bucket.
 */
export function exposedAtLeast(byTier: readonly number[], tier: ResolutionTier): number {
  let total = 0;
  for (let t = Math.max(0, tier); t < byTier.length; t++) total += byTier[t] ?? 0;
  return total;
}

/** Inclusive of the edges: a hull on the concourse line is on the concourse. */
export function inRegion(region: MissionRegion, x: number, y: number): boolean {
  return (
    x >= region.x &&
    x <= region.x + region.widthM &&
    y >= region.y &&
    y <= region.y + region.heightM
  );
}
