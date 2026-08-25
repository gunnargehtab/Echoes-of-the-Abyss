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
  Countermeasure,
  DepthOrder,
  Harvester,
  Health,
  Laying,
  Magazine,
  Ordnance,
  Owner,
  Position,
  Pressure,
  ResourceNode,
  SilentRunning,
  Structure,
  Unit,
} from './components.ts';
import { economyFor, type SimWorld } from './world.ts';

/** Scratch view for reading a double's raw bits without allocating per call. */
const scratch = new Float64Array(1);
const scratchBits = new Uint32Array(scratch.buffer);

const FNV_PRIME = 0x01000193;

function mixU32(hash: number, value: number): number {
  return Math.imul(hash ^ (value >>> 0), FNV_PRIME) >>> 0;
}

function mixFloat(hash: number, value: number): number {
  scratch[0] = value;
  return mixU32(mixU32(hash, scratchBits[0]!), scratchBits[1]!);
}

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
  let h = 0x811c9dc5;
  h = mixU32(h, world.tick);
  h = mixU32(h, world.rng.snapshot());

  // The world's own entities, ascending. Index in this list is the identity
  // the hash uses; see the note above.
  const live: number[] = [];
  for (let eid = 0; eid < Position.x.length; eid++) {
    if (hasComponent(world, Position, eid)) live.push(eid);
  }
  const ordinalOf = new Map<number, number>();
  live.forEach((eid, index) => ordinalOf.set(eid, index));

  for (const eid of live) {
    h = mixU32(h, ordinalOf.get(eid)!);
    h = mixFloat(h, Position.x[eid]!);
    h = mixFloat(h, Position.y[eid]!);
    h = mixFloat(h, Position.depth[eid]!);

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
    if (hasComponent(world, Structure, eid)) h = mixU32(h, Structure.kind[eid]!);
    if (hasComponent(world, SilentRunning, eid)) h = mixU32(h, SilentRunning.active[eid]!);
    if (hasComponent(world, Pressure, eid)) {
      h = mixU32(h, Pressure.rating[eid]!);
      h = mixU32(h, Pressure.bonus[eid]!);
      h = mixFloat(h, Pressure.unhealable[eid]!);
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

  return h >>> 0;
}

/** Hex form, for logs and assertion messages. */
export function hashHex(world: SimWorld): string {
  return hashWorld(world).toString(16).padStart(8, '0');
}
