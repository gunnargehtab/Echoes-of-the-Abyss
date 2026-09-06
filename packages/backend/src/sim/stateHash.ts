/**
 * A fingerprint of the whole simulation, for catching divergence.
 *
 * The point is *when*, not *whether*. A replay that ends in a different state
 * tells you determinism broke; a replay that reports the first tick whose hash
 * differs tells you where to look. So this is cheap enough to run periodically
 * rather than once at the end.
 *
 * Floats are hashed by their exact bits rather than rounded first. Two runs of
 * the same build must agree bit-for-bit — rounding would mask a real
 * divergence of less than the rounding step, which is exactly the kind that
 * compounds over a twenty-minute match.
 */

import { hasComponent } from 'bitecs';
import {
  Acoustic,
  Carried,
  Countermeasure,
  DepthOrder,
  Embarking,
  Harvester,
  Health,
  Hold,
  LandingGrant,
  Laying,
  Magazine,
  Ordnance,
  Owner,
  Position,
  Posture,
  Pressure,
  ResourceNode,
  EngineOff,
  SilentRunning,
  Structure,
  Unit,
} from './components.ts';
import { FNV_OFFSET, mixFloat, mixString, mixU32 } from './fnv.ts';
import { economyFor, type SimWorld } from './world.ts';

/**
 * Hash the simulation's observable state.
 *
 * Entities are mixed in by their **ordinal position within this world**, not
 * by their raw entity id — and that distinction is load-bearing.
 *
 * bitecs allocates entity ids from a counter that is global to the *process*,
 * not to the world: two Matches built in one process get disjoint id ranges
 * (measured: 1-13 and 15-27) holding identical values. Hashing raw ids would
 * therefore make the fingerprint depend on how many matches happened to be
 * constructed earlier — which is not simulation state, and would report a
 * perfectly reproducible match as divergent.
 *
 * The ordinal keeps what the raw id was for: identity and ordering still
 * matter, so two worlds with the same hulls in a different order still hash
 * differently. It just stops the hash caring which process it is running in.
 */
export function hashWorld(world: SimWorld): number {
  let h = FNV_OFFSET;
  h = mixU32(h, world.tick);
  h = mixU32(h, world.rng.snapshot());

  // Every sub-stream too, keyed by name and in key order — the root's position
  // says nothing about where a fork has got to. `seedFauna` forks 'drift', and
  // a fork is exactly the thing a subsystem reaches for when it wants draws
  // that do not shift everybody else's, so the streams multiply where nobody
  // is watching. Hashing the root alone would report a match that had drawn a
  // different number of fauna dice as identical.
  const streamKeys = [...world.rng.streams.keys()].sort();
  for (const key of streamKeys) {
    h = mixString(h, key);
    h = mixU32(h, world.rng.streams.get(key)!.snapshot());
  }

  // The world's own entities, ascending. Index in this list is the identity
  // the hash uses; see the note above.
  const live: number[] = [];
  for (let eid = 0; eid <= world.maxEid; eid++) {
    // A hull in a hold has no Position and is still the world's: its health,
    // its kind and its carrier are state a replay must agree on, or a hold
    // that landed a different force would hash the same as one that did not.
    if (hasComponent(world, Position, eid) || hasComponent(world, Carried, eid)) live.push(eid);
  }
  const ordinalOf = new Map<number, number>();
  live.forEach((eid, index) => ordinalOf.set(eid, index));

  for (const eid of live) {
    h = mixU32(h, ordinalOf.get(eid)!);
    if (hasComponent(world, Carried, eid)) {
      // Where it is, is the carrier — by ordinal, like every entity reference.
      h = mixU32(h, ordinalOf.get(Carried.carrier[eid]!) ?? -1);
    } else {
      h = mixFloat(h, Position.x[eid]!);
      h = mixFloat(h, Position.y[eid]!);
      h = mixFloat(h, Position.depth[eid]!);
    }
    if (hasComponent(world, Hold, eid)) h = mixU32(h, Hold.used[eid]!);
    if (hasComponent(world, Embarking, eid)) {
      h = mixU32(h, ordinalOf.get(Embarking.carrier[eid]!) ?? -1);
    }
    if (hasComponent(world, LandingGrant, eid)) {
      h = mixFloat(h, LandingGrant.remainingS[eid]!);
      h = mixU32(h, LandingGrant.bonus[eid]!);
    }

    if (hasComponent(world, Health, eid)) {
      h = mixFloat(h, Health.hp[eid]!);
    }
    if (hasComponent(world, Acoustic, eid)) {
      h = mixFloat(h, Acoustic.sig[eid]!);
      h = mixFloat(h, Acoustic.hyd[eid]!);
    }
    if (hasComponent(world, Owner, eid)) {
      h = mixU32(h, Owner.slot[eid]!);
      h = mixU32(h, Owner.faction[eid]!);
    }
    if (hasComponent(world, Unit, eid)) h = mixU32(h, Unit.kind[eid]!);
    if (hasComponent(world, Structure, eid)) {
      h = mixU32(h, Structure.kind[eid]!);
      // Hashed because a mission moves it: the Prologue's silence ledger
      // withdraws the court's array by writing this, and a replay that
      // re-derived the debt differently would otherwise diverge in what the
      // player can hear while every hashed field still agreed.
      h = mixU32(h, Structure.grantSlot[eid]!);
    }
    if (hasComponent(world, SilentRunning, eid)) h = mixU32(h, SilentRunning.active[eid]!);
    // The third posture, hashed beside the second: a hull with its drive cut
    // moves and is heard differently, so two runs that disagree about it have
    // diverged (docs/systems-echo.md §6).
    if (hasComponent(world, EngineOff, eid)) h = mixU32(h, EngineOff.active[eid]!);
    if (hasComponent(world, Pressure, eid)) {
      h = mixU32(h, Pressure.rating[eid]!);
      h = mixU32(h, Pressure.bonus[eid]!);
      h = mixFloat(h, Pressure.unhealable[eid]!);
    }
    if (hasComponent(world, Posture, eid)) {
      h = mixU32(h, Posture.hold[eid]!);
      h = mixU32(h, Posture.engage[eid]!);
      h = mixFloat(h, Posture.engageX[eid]!);
      h = mixFloat(h, Posture.engageY[eid]!);
    }
    if (hasComponent(world, DepthOrder, eid)) {
      h = mixU32(h, DepthOrder.active[eid]!);
      h = mixFloat(h, DepthOrder.targetM[eid]!);
    }
    if (hasComponent(world, Harvester, eid)) {
      h = mixU32(h, Harvester.mode[eid]!);
      h = mixFloat(h, Harvester.cargo[eid]!);
      h = mixU32(h, Harvester.cargoKind[eid]!);
      h = mixU32(h, Harvester.throttle[eid]!);
    }
    if (hasComponent(world, ResourceNode, eid)) {
      h = mixFloat(h, ResourceNode.remaining[eid]!);
      h = mixU32(h, ResourceNode.kind[eid]!);
    }
    if (hasComponent(world, Laying, eid)) {
      h = mixFloat(h, Laying.remainingS[eid]!);
    }
    if (hasComponent(world, Ordnance, eid)) {
      h = mixU32(h, Ordnance.kind[eid]!);
      h = mixFloat(h, Ordnance.remainingS[eid]!);
      h = mixFloat(h, Ordnance.armingS[eid]!);
      h = mixFloat(h, Ordnance.detonatingS[eid]!);
      h = mixFloat(h, Ordnance.targetDepthM[eid]!);
      h = mixFloat(h, Ordnance.heading[eid]!);
      // Ordinal, not the raw eid, for the reason the whole function exists:
      // two identical worlds must hash alike whichever process built them.
      h = mixU32(h, ordinalOf.get(Ordnance.targetEid[eid]!) ?? -1);
    }
    if (hasComponent(world, Countermeasure, eid)) {
      h = mixFloat(h, Countermeasure.cooldownRemainingS[eid]!);
    }
    if (hasComponent(world, Magazine, eid)) {
      // A match where one side has spent its torpedoes and the other has not
      // has diverged just as surely as one where a hull moved.
      h = mixU32(h, Magazine.torpedoes[eid]!);
      h = mixFloat(h, Magazine.rearmRemainingS[eid]!);
    }
  }

  // The ground, once a mission has started writing it (#197). Only the
  // mid-match changes are mixed, not the whole grid: the map is chosen by id
  // and built identically on both sides of a replay, so hashing 300-odd
  // constructed cells every checkpoint would cost the walk and prove nothing.
  // What a replay can genuinely diverge on is *when* and *what* a beat wrote,
  // and that is exactly the list — a match whose arch fell on a different tick
  // now reports as divergent instead of quietly playing on different ground.
  //
  // Read as the digest the terrain keeps as it writes, not by walking the
  // list: a checkpoint used to re-hash every change since the baseline, so a
  // long mission that kept collapsing ground paid for its whole history at
  // every checkpoint — quadratic in the beats, for a value the ground could
  // carry along with the list for one mix per write.
  h = mixU32(h, world.terrain.revision);
  h = mixU32(h, world.terrain.historyDigest);

  // Acoustic residue. Not a client convenience and not derived state: a mark
  // is written by the tick a thing died on, decays on its own clock, and is
  // read back by the simulation — a scavenger picks a mark by id and strips
  // it, so two runs whose residue disagrees put their Drift somewhere else a
  // minute later. Unhashed, that divergence stayed invisible until it had
  // moved a hull, which is the whole failure this fingerprint exists to catch
  // early rather than late.
  //
  // Walked in list order, which is the order marks were laid and compacted in
  // (`EchoMarkLayer.tick` keeps a stable write cursor) and so is itself part
  // of what must agree. The id goes in with the rest: a layer that dropped its
  // faintest mark under the cap and one that dropped a different mark can hold
  // the same positions and still not be the same past.
  h = mixU32(h, world.marks.count);
  for (const mark of world.marks.all) {
    h = mixU32(h, mark.id);
    h = mixU32(h, mark.kind);
    h = mixFloat(h, mark.x);
    h = mixFloat(h, mark.y);
    h = mixFloat(h, mark.depth);
    h = mixFloat(h, mark.intensity);
    h = mixFloat(h, mark.remainingS);
  }

  // Economies live outside the ECS, and a match where one side is quietly
  // richer has diverged just as surely as one where a hull moved.
  const slots = [...world.economies.keys()].sort((a, b) => a - b);
  for (const slot of slots) {
    const economy = economyFor(world, slot);
    h = mixU32(h, slot);
    h = mixFloat(h, economy.nodules);
    h = mixFloat(h, economy.crystal);
  }

  // Production queues, likewise: same hulls on the map, different things
  // coming off the line, is a divergence that would otherwise surface minutes
  // later as an army that should not exist.
  const lines = [...world.production.keys()].sort((a, b) => a - b);
  for (const eid of lines) {
    const line = world.production.get(eid)!;
    // Ordinal again, for the same reason: a queue belongs to the nth structure
    // in this world, not to a process-global id.
    h = mixU32(h, ordinalOf.get(eid) ?? -1);
    h = mixFloat(h, line.remainingS);
    for (const kind of line.queue) h = mixU32(h, kind);
  }

  // Rally points, by ordinal like the lines: same yards, different places
  // their hulls walk off to, is an army in a different place a minute later.
  const rallied = [...world.rallies.keys()].sort((a, b) => a - b);
  for (const eid of rallied) {
    const rally = world.rallies.get(eid)!;
    h = mixU32(h, ordinalOf.get(eid) ?? -1);
    h = mixFloat(h, rally.x);
    h = mixFloat(h, rally.y);
  }

  return h >>> 0;
}

/** Hex form, for logs and assertion messages. */
export function hashHex(world: SimWorld): string {
  return hashWorld(world).toString(16).padStart(8, '0');
}
