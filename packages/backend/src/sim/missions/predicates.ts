/**
 * The only place in this codebase that turns world state into a number the
 * client is shown, and the only thing standing between an objective counter and
 * a maphack written as arithmetic.
 *
 * **The guarantee: nothing here can report on anything the observer does not
 * own, because nothing here is given anything the observer does not own.** The
 * parameter list is the enforcement. `own` is the resolved `EchoSnapshot` this
 * slot is being sent on this very tick, so every number returned is one the
 * client could have computed for itself; `roleIds` names hulls of the player's
 * own party; `regionById` and `predicate` are authored map data that shipped
 * with the mission. There is no world, no ECS, no second snapshot and no slot
 * argument, so "three of five hostiles remaining" is not refused here — it
 * cannot be asked for.
 *
 * Its shortness is the argument. If this file ever needs a second page, the
 * thing being added is a leak, and the right answer is to change what the
 * mission asks the player to do.
 */

import type { EchoSnapshot } from '@echoes/shared';
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

export function progressOf(
  predicate: MissionPredicate,
  own: EchoSnapshot,
  roleIds: RoleIds,
  regionById: RegionById,
  startedTick: number
): Progress {
  switch (predicate.kind) {
    case 'extract': {
      const region = regionById(predicate.region);
      if (region === undefined) return { done: 0, of: predicate.count };
      const ids = roleIds(predicate.role);
      const inside = own.units.filter((u) => ids.has(u.id) && inRegion(region, u.x, u.y));
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
    case 'endure':
      return { done: Math.max(0, own.tick - startedTick), of: predicate.ticks };
  }
}

export function isMet(
  predicate: MissionPredicate,
  own: EchoSnapshot,
  roleIds: RoleIds,
  regionById: RegionById,
  startedTick: number
): boolean {
  const { done, of } = progressOf(predicate, own, roleIds, regionById, startedTick);
  return done >= of;
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

/** Inclusive of the edges: a hull on the concourse line is on the concourse. */
export function inRegion(region: MissionRegion, x: number, y: number): boolean {
  return (
    x >= region.x &&
    x <= region.x + region.widthM &&
    y >= region.y &&
    y <= region.y + region.heightM
  );
}
