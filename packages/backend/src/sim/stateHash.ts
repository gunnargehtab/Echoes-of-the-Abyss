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

import { ECONOMY_ACCOUNTS } from '@echoes/shared';
import { hasComponent } from 'bitecs';
import {
  Acoustic,
  Carried,
  Countermeasure,
  DepthOrder,
  Embarking,
  Fauna,
  Harvester,
  Health,
  Hold,
  LandingGrant,
  Laying,
  Magazine,
  MineMagazine,
  MoveOrder,
  Ordnance,
  Owner,
  Position,
  Posture,
  Pressure,
  ResourceNode,
  EngineOff,
  SilentRunning,
  Song,
  Spore,
  Structure,
  Unit,
  Weapon,
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
    // A creature, and what it is *doing* — which is the half the walk used to
    // miss. Position, Health and Acoustic above already said a creature was
    // here and how loud it was; nothing said whether it was grazing or
    // committed, what it was answering, how long it had been interested, or
    // who is owed its Biomass. The Drift is the simulation's only source of
    // dice, so a divergence that lives entirely inside fauna behaviour is the
    // one most likely to exist and was the one certain to be reported as a
    // clean replay (#620).
    //
    // `species` and the home triple are mixed although they never change after
    // the spawn that drew them: repopulation is a fork of the Drift stream, so
    // two runs that repopulated a different creature in a different place
    // disagree here at the tick it happened rather than a minute later when it
    // has swum somewhere.
    if (hasComponent(world, Fauna, eid)) {
      h = mixU32(h, Fauna.species[eid]!);
      h = mixU32(h, Fauna.stage[eid]!);
      h = mixU32(h, Fauna.renderedBySlot[eid]!);
      h = mixFloat(h, Fauna.interestS[eid]!);
      h = mixFloat(h, Fauna.quietS[eid]!);
      h = mixFloat(h, Fauna.interestedS[eid]!);
      h = mixFloat(h, Fauna.coolingS[eid]!);
      h = mixFloat(h, Fauna.heard[eid]!);
      h = mixFloat(h, Fauna.senseS[eid]!);
      h = mixFloat(h, Fauna.scatterS[eid]!);
      h = mixU32(h, Fauna.driven[eid]!);
      h = mixU32(h, Fauna.struck[eid]!);
      h = mixU32(h, Fauna.scavengeMarkId[eid]!);
      h = mixFloat(h, Fauna.homeX[eid]!);
      h = mixFloat(h, Fauna.homeY[eid]!);
      h = mixFloat(h, Fauna.homeDepth[eid]!);
      // Both entity references by ordinal, for the reason the whole function
      // exists. `targetEid` is what it is answering; `struckBy` is consumed by
      // every sense pass and is still state between the hit and the pass that
      // reads it, which is where a retaliation is decided.
      h = mixU32(h, ordinalOf.get(Fauna.targetEid[eid]!) ?? -1);
      h = mixU32(h, ordinalOf.get(Fauna.struckBy[eid]!) ?? -1);
    }
    if (hasComponent(world, Structure, eid)) {
      h = mixU32(h, Structure.kind[eid]!);
      // Hashed because a mission moves it: the Prologue's silence ledger
      // withdraws the court's array by writing this, and a replay that
      // re-derived the debt differently would otherwise diverge in what the
      // player can hear while every hashed field still agreed.
      h = mixU32(h, Structure.grantSlot[eid]!);
      // A strain eating a wall in silence (docs/systems-combat.md §9). Hashed
      // because it is the one thing in the game that changes a structure's hull
      // without changing anything a listener could hear — so if two runs
      // disagreed about it, every other hashed field would still agree.
      if (hasComponent(world, Spore, eid)) {
        h = mixFloat(h, Spore.remainingS[eid]!);
        h = mixFloat(h, Spore.perS[eid]!);
      }
    }
    if (hasComponent(world, SilentRunning, eid)) h = mixU32(h, SilentRunning.active[eid]!);
    // The third posture, hashed beside the second: a hull with its drive cut
    // moves and is heard differently, so two runs that disagree about it have
    // diverged (docs/systems-echo.md §6).
    if (hasComponent(world, EngineOff, eid)) h = mixU32(h, EngineOff.active[eid]!);
    // A song is a clock and a place, and both decide where the Drift goes
    // (docs/systems-combat.md §9), so two runs that disagree have diverged.
    if (hasComponent(world, Song, eid)) {
      h = mixFloat(h, Song.remainingS[eid]!);
      h = mixFloat(h, Song.x[eid]!);
      h = mixFloat(h, Song.y[eid]!);
    }
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
    // The leg a hull is actually walking, beside the plan behind it
    // (`world.orderQueues`, below). Both were outside the fingerprint, and the
    // second one is why the first is worth mixing rather than leaving to the
    // position it will produce: a hull that is *holding* carries a move order
    // it is not executing, so two runs that disagree about where it will go
    // when released agree on every other field until it is released.
    if (hasComponent(world, MoveOrder, eid)) {
      h = mixU32(h, MoveOrder.active[eid]!);
      h = mixFloat(h, MoveOrder.x[eid]!);
      h = mixFloat(h, MoveOrder.y[eid]!);
    }
    // What the player told this hull to shoot, by ordinal like every other
    // entity reference. `Posture.engage` above says a hull is fighting on its
    // way somewhere; this says it was sent at one particular thing, which
    // survives the target passing out of range and is cleared only when the
    // target dies.
    if (hasComponent(world, Weapon, eid)) {
      h = mixFloat(h, Weapon.cooldownRemainingS[eid]!);
      h = mixU32(h, ordinalOf.get(Weapon.orderedTargetEid[eid]!) ?? -1);
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
    if (hasComponent(world, MineMagazine, eid)) {
      // The same argument for the grown magazine, and it became worth making
      // when the nursery learned to move (#509). A mine that has regrown is a
      // mine that will be laid, and until it is laid nothing else the hash
      // reads says it exists — so two runs that disagreed about a regrowth
      // would agree on every other field until the wall appeared. A Spore Veil
      // and a Bastion stand still; a Bower walks its 300 m reach around the
      // map, which is a great many more chances to disagree.
      h = mixU32(h, MineMagazine.mines[eid]!);
      h = mixFloat(h, MineMagazine.regrowRemainingS[eid]!);
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
  //
  // Iterated over `ECONOMY_ACCOUNTS` rather than named one by one, which is
  // the difference between a hash that covers the economy and one that covers
  // the accounts somebody remembered. It named `nodules` and `crystal` and
  // stopped; Biomass was the third and had been banked, priced into seven
  // hulls and spent for a release before anyone noticed it was outside the
  // fingerprint (#620). A fourth account now cannot escape the same way,
  // because there is no line here to forget to add.
  const slots = [...world.economies.keys()].sort((a, b) => a - b);
  for (const slot of slots) {
    const economy = economyFor(world, slot);
    h = mixU32(h, slot);
    for (const account of ECONOMY_ACCOUNTS) h = mixFloat(h, economy[account]);
  }

  // Hazards, in list order — their sites come from the map and never move, but
  // their phase and their timers are the match's (`world.hazards` says so in
  // as many words). Walked rather than folded into a write digest the way
  // terrain is: terrain's objection is that hashing "300-odd constructed
  // cells" would cost the walk and prove nothing, and the default map holds
  // eight hazards. At that size the objection does not reach, and a state walk
  // keeps the hash path-independent. Revisit if a map ever authors hazards by
  // the hundred.
  //
  // Every mutable field, not a chosen few: the phase and its clock, both
  // suspensions, the canopy, the sowing owed on it, and the dormancy a
  // Bathyarch presence has bought. `crop` and `sownRemaining` in particular
  // are what `REPLAY_FORMAT_VERSION` was bumped to 24 for — the sow command
  // writes them, so a replay checker blind to them could not have kept that
  // bump honest. The site fields are mixed too, cheaply, so that two worlds
  // whose beds are in different places cannot agree here.
  for (const hazard of world.hazards) {
    h = mixU32(h, hazard.id);
    h = mixString(h, hazard.kind);
    h = mixFloat(h, hazard.x);
    h = mixFloat(h, hazard.y);
    h = mixFloat(h, hazard.radiusM);
    h = mixU32(h, hazard.phase);
    h = mixFloat(h, hazard.elapsedS);
    h = mixFloat(h, hazard.flowRad);
    h = mixFloat(h, hazard.suppressedS);
    h = mixFloat(h, hazard.burnedS);
    h = mixFloat(h, hazard.crop);
    h = mixFloat(h, hazard.sownRemaining);
    h = mixFloat(h, hazard.stabilisedS);
  }

  // Drift Health, by region index. Sixteen cells on every map
  // (`DRIFT.HEALTH_REGIONS` squared), read-modify-write from four directions —
  // kills, harvest, sustained noise and the slow recovery — and *durable*:
  // `MatchRoom.driftResult()` snapshots exactly these values into the campaign
  // record, where they seed the next mission on this map. So two runs that
  // disagree here disagree about the map the player takes into the next
  // mission, which is the longest-lived divergence the simulation can produce.
  //
  // Through the allocating `snapshot()` rather than a new non-allocating
  // accessor: checkpoints are interval-gated, and sixteen floats out of
  // `Array.from` is noise against the entity walk above it.
  for (const health of world.drift.snapshot()) h = mixFloat(h, health);

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
    // The refit on the line, on the same argument: two worlds whose yards
    // agree about the hulls and disagree about the upgrade diverge a band of
    // depth later, which is minutes after the tick that caused it
    // (docs/systems-progression.md §2). The purchase itself needs no separate
    // mixing — `Pressure.rating` above carries what a granted refit did, and
    // a refit *is* what it did to the hulls.
    if (line.refit !== undefined) {
      h = mixU32(h, line.refit.kind);
      h = mixFloat(h, line.refit.remainingS);
    }
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

  // Queued orders — the plan behind the leg a hull is walking, which
  // `world.orderQueues` calls simulation state in as many words and which
  // docs/tech-stack.md has claimed the hash covered since before it did.
  //
  // In queue order, because a plan *is* its order: two forces holding the same
  // four waypoints in a different sequence are in different places two minutes
  // later and agree on every other field until the first one pops. The
  // owning hull and both entity references inside an order go in by ordinal,
  // for the reason the whole function exists.
  const planned = [...world.orderQueues.keys()].sort((a, b) => a - b);
  for (const eid of planned) {
    const queue = world.orderQueues.get(eid)!;
    h = mixU32(h, ordinalOf.get(eid) ?? -1);
    h = mixU32(h, queue.length);
    for (const order of queue) {
      h = mixString(h, order.kind);
      h = mixFloat(h, order.x);
      h = mixFloat(h, order.y);
      if (order.kind === 'attack') h = mixU32(h, ordinalOf.get(order.target) ?? -1);
      if (order.kind === 'harvest') h = mixU32(h, ordinalOf.get(order.node) ?? -1);
    }
  }

  // The Standing Wave ledger — the corridors that are up, and the two sets
  // that decide which ones can ever form (docs/systems-echo.md §7).
  //
  // Hashed for a reason none of the other blocks has: a corridor is the only
  // thing in the simulation that edits *propagation itself*. Two runs that
  // disagree here disagree about how far every sound in the map carries, and
  // the Echo Layer is resolved per observer and never hashed — so the
  // divergence would surface as two players seeing different water, with every
  // position, hull and economy still in agreement.
  //
  // All three are keyed by match-local id rather than by entity id, so they go
  // in as they are and not through `ordinalOf`. `corridors` walks in list
  // order, which `standingWaveSystem` writes and which is therefore itself
  // state. The two sets are sorted instead: membership is what §4's
  // "decided once" rule is about, and insertion order is not — a hash
  // sensitive to it would report a false divergence, which is worse than a
  // known hole because the whole value of `divergedAtTick` is that it is
  // believed.
  h = mixU32(h, world.corridors.length);
  for (const corridor of world.corridors) {
    h = mixU32(h, corridor.a);
    h = mixU32(h, corridor.b);
  }
  for (const node of [...world.pairedNodes].sort((a, b) => a - b)) h = mixU32(h, node);
  for (const site of [...world.nodeSites].sort((a, b) => a - b)) h = mixU32(h, site);

  return h >>> 0;
}

/** Hex form, for logs and assertion messages. */
export function hashHex(world: SimWorld): string {
  return hashWorld(world).toString(16).padStart(8, '0');
}

// --- Every field of the world is on one of three lists -----------------------
//
// The gaps this file has shipped were never subtle once found — a third
// economy account, the hazards, the Drift grid, fauna behaviour, the order
// queues, the Standing Wave ledger. They were all the same failure: a
// subsystem parked durable state on `SimWorld` and nobody remembered there was
// a second place to add a line. Hand enumeration caught none of them, because
// hand enumeration is exactly what was failing.
//
// So the enumeration is a type. Every key of `SimWorld` belongs to one of the
// three unions below, the `Exact<>` at the foot asserts that the three together
// are `keyof SimWorld`, and a field added to the world with no list fails
// `npm run type-check` naming the field. This is the idiom that polices the
// wire (`packages/shared/src/wire.ts`) and the replay command union
// (`sim/replay.ts`), applied to the third place a name had to be written twice
// (#620).
//
// What it buys and what it does not, stated plainly, because the issue that
// asked for it argued both sides: it forces a *decision*, not a correct one.
// An author in a hurry can put durable state on `DerivedWorldState` and the
// build goes green with the same hole. What it removes is the failure that
// actually happened four times — silence. A wrong entry is a line somebody
// wrote and a reviewer can read; a missing entry was nothing at all.

/**
 * Fields `hashWorld` mixes by name.
 *
 * Simulation state that lives outside the ECS: a match where two runs disagree
 * about any of these has diverged, whatever their entities say.
 */
export type HashedWorldState =
  | 'tick'
  | 'rng'
  | 'terrain'
  | 'marks'
  | 'economies'
  | 'production'
  | 'rallies'
  | 'orderQueues'
  | 'hazards'
  | 'drift'
  | 'corridors'
  | 'pairedNodes'
  | 'nodeSites';

/**
 * State the hash covers through something else it already mixes.
 *
 * The third list exists because the alternative was to lie. These are not
 * derived and not scratch — they are match state a reconnecting player must
 * get back — but mixing them again would be mixing the same fact twice. Each
 * entry names its carrier here, and that naming is the whole obligation: an
 * entry whose carrier stops carrying it belongs above.
 */
export type CoveredWorldState =
  /** Through `Carried.carrier` and `Hold.used` in the entity walk: a hull in a
   * hold is hashed as a hull, with the carrier it is inside. */
  | 'holds'
  /** Through `Pressure.rating` and `Pressure.bonus`. A refit *is* the ratings
   * it wrote, and `world.refits` says so where it is declared — a world that
   * agreed about the purchase and disagreed about the hulls would be the
   * divergence, and that is the half that is mixed. */
  | 'refits'
  /** Through `hazards`. A bloom node *is* a bed, held by reference into that
   * same list rather than copied, precisely so the two cannot drift apart. */
  | 'blooms';

/**
 * Fields that are not simulation state, and why.
 *
 * Three kinds, and the distinction matters to anyone adding a field: map data
 * fixed before the first step, caches and broadphases rebuilt from state that
 * is hashed, and per-pass scratch that is cleared before anything can read it
 * across a tick. A wrongly-*included* derived field is worse than an excluded
 * one — it reports false divergence, and a checker that cries wolf is worse
 * than one with a known hole, because the entire value of `divergedAtTick` is
 * that it is believed.
 */
export type DerivedWorldState =
  // Fixed before the first step: chosen by map id and built identically on
  // both sides of a replay.
  | 'ambientBands'
  | 'dt'
  // Identity bookkeeping. The hash deliberately speaks ordinals instead — see
  // the note at the head of `hashWorld` — so these cannot be state it reads.
  // `maxEid` is a high-water bound for the walk, not a fact about the match.
  | 'localOfEid'
  | 'eidOfLocal'
  | 'nextLocalId'
  | 'maxEid'
  // Caches and broadphases, rebuilt every tick from hashed state.
  | 'unitGrid'
  | 'structureGrid'
  | 'fuseGrid'
  | 'separationBuffer'
  | 'fuseBuffer'
  | 'pathfinder'
  | 'paths'
  | 'draw'
  | 'driftNoise'
  // Per-tick scratch: written and read inside one step, cleared at the top of
  // the next.
  | 'stepWork'
  | 'spireActive'
  | 'reactorActive'
  | 'environmentalDeaths'
  // Per-mission-pass scratch, cleared and rebuilt whole on every pass so an
  // expired grant cannot outlive the beat that wrote it. Empty in every
  // skirmish.
  | 'liftCutSig'
  | 'soundingSig'
  | 'siegeWorkSig'
  | 'regionPressureBonus'
  | 'commanderHaste'
  | 'commanderSilentImmune'
  // An outbound channel, not a store: drained into the Echo snapshot and
  // cleared. Anything that could make two runs raise different self-events has
  // already diverged in something above.
  | 'selfEvents';

/**
 * Every field of the world is classified, and no field is classified twice.
 *
 * Written as four `Exclude<>`s rather than one `Exact<>` — the idiom the wire
 * and the replay union use — for one reason: this check has to be read by
 * whoever tripped it, and `Exact<>` fails with `'true' is not assignable to
 * type 'never'`, which names nothing. Each of these puts the offending key
 * *in the error message*, so the build says which field is unclassified rather
 * than that one is.
 */
type Unclassified = Exclude<
  keyof SimWorld,
  HashedWorldState | CoveredWorldState | DerivedWorldState
>;
type NotAWorldField = Exclude<
  HashedWorldState | CoveredWorldState | DerivedWorldState,
  keyof SimWorld
>;
type DoubleClassified =
  | Extract<HashedWorldState, CoveredWorldState>
  | Extract<HashedWorldState, DerivedWorldState>
  | Extract<CoveredWorldState, DerivedWorldState>;

/** A field on `SimWorld` and on none of the three lists. Decide which it is. */
const _everyWorldFieldIsClassified: [Unclassified] extends [never]
  ? true
  : ['unclassified field on SimWorld — add it to one of the three lists', Unclassified] = true;
/** A name on a list that is no longer a field — a rename or a deletion. */
const _everyClassifiedNameIsAWorldField: [NotAWorldField] extends [never]
  ? true
  : ['classified name is not a field of SimWorld', NotAWorldField] = true;
/**
 * A field on two lists. Checked separately because the first check accepts it,
 * and "hashed and also derived" is the one combination that reads as a
 * decision while being none.
 */
const _worldFieldsAreClassifiedOnce: [DoubleClassified] extends [never]
  ? true
  : ['field classified twice', DoubleClassified] = true;
void _everyWorldFieldIsClassified;
void _everyClassifiedNameIsAWorldField;
void _worldFieldsAreClassifiedOnce;
