/**
 * Simulation world: the bitecs world plus the side tables and terrain that
 * back it.
 */

import { createWorld, addEntity, addComponent, type IWorld } from 'bitecs';
import {
  CONSTRUCTION,
  CRYSTAL,
  ECONOMY,
  SEPARATION,
  Faction,
  HarvestThrottle,
  ResourceKind,
  SelfEventKind,
  FaunaStage,
  faunaStatsFor,
  ordnanceStatsFor,
  ORDNANCE,
  OrdnanceKind,
  type DrawReport,
  type FaunaSpecies,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
} from '@echoes/shared';
import {
  Acoustic,
  Countermeasure,
  DepthOrder,
  Harvester,
  HarvestMode,
  Fauna,
  Health,
  Magazine,
  MoveOrder,
  Ordnance,
  Owner,
  Position,
  Pressure,
  ResourceNode,
  SilentRunning,
  Structure,
  UnderConstruction,
  Unit,
  Velocity,
  Weapon,
} from './components.ts';
import { DriftHealth } from './drift.ts';
import { DRIFT_SLOT } from './systems/fauna.ts';
import { EchoMarkLayer } from './echoMarks.ts';
import type { Hazard } from './systems/hazards.ts';
import { Rng } from './rng.ts';
import { SpatialHash } from './spatialHash.ts';
import type { QueuedOrder } from './systems/orderQueue.ts';
import { Terrain } from './terrain.ts';

/**
 * How many buckets a seeker's first sense is spread across.
 *
 * Twelve, matching the 60 Hz ticks in one 0.2 s seeker interval, so consecutive
 * ordnance lands on consecutive ticks and a salvo spreads perfectly flat.
 */
const SEEKER_STAGGER_STEPS = 12;

/** Per-player mutable economy state. Lives outside the ECS: it is per-slot, not per-entity. */
export interface PlayerEconomy {
  nodules: number;
  /** Resonance Crystal — the tech gate, mined only in the Abyssal band. */
  crystal: number;
  /**
   * Biomass — rendered fauna (docs/economy.md §2, docs/bestiary.md §5).
   *
   * The Directorate's channel at full rate, everyone else at a fraction via
   * Consortium rendering contracts. The elegant part of the faction design:
   * fauna are drawn to your noise, and the Directorate is paid for what your
   * noise attracts.
   */
  biomass: number;
}

/** One structure's production line: FIFO of unit kinds, head in progress. */
export interface ProductionQueue {
  queue: UnitKind[];
  /** Seconds of build time remaining on queue[0]. */
  remainingS: number;
}

export interface SimWorld extends IWorld {
  terrain: Terrain;
  /** Monotonic fixed-step tick counter. */
  tick: number;
  /** Seconds per fixed step. */
  dt: number;
  /** slot -> stockpile. */
  economies: Map<number, PlayerEconomy>;
  /** producing structure eid -> its queue. */
  production: Map<number, ProductionQueue>;
  /**
   * Sounding Spires whose PR grant is load-bearing this tick — an allied
   * unit under the aura is actually below its own rating. Written by the
   * auras system, read by acoustics: a projecting spire sings at SIG 80.
   */
  spireActive: Set<number>;
  /**
   * The simulation's only source of randomness. Seeded per match and part of
   * simulation state — see sim/rng.ts. Nothing in sim/ may call Math.random().
   */
  rng: Rng;
  /**
   * Match-local entity ids, and the reverse map.
   *
   * bitecs allocates entity ids from a *process*-global counter, so the same
   * match run twice in one process gets different ids for the same hulls.
   * That is harmless while an id never leaves the process — but a replay is
   * exactly an id leaving the process, and replaying raw ids into a fresh
   * world addresses entities that do not exist there.
   *
   * So every spawned entity also gets an id that counts from zero within this
   * world. Replays speak that language; see sim/replay.ts.
   */
  localOfEid: Map<number, number>;
  eidOfLocal: Map<number, number>;
  nextLocalId: number;
  /**
   * Broadphase for hull separation, rebuilt every tick. Separate from the
   * Echo Layer's: that one is sized for kilometre-scale audibility, this one
   * for hull-scale overlap, and sharing a grid would make both worse.
   */
  unitGrid: SpatialHash;
  /** Reused query buffer, so separation allocates nothing per tick. */
  separationBuffer: number[];
  /**
   * Broadphase for torpedo fuses, rebuilt each tick a torpedo is in the water.
   *
   * A third grid rather than a reuse of either of the others, for the reason
   * given above: `unitGrid` holds only hulls, and a fuse has to be able to
   * detonate on a Foundry. Sized for the fuse envelope (a few hundred metres at
   * most) rather than for audibility.
   */
  fuseGrid: SpatialHash;
  /** Reused query buffer for the above. */
  fuseBuffer: number[];
  /**
   * Pending orders per unit — the plan behind the order it is executing.
   * Simulation state, not a client convenience: a reconnecting player must
   * get their plan back (see sim/systems/orderQueue.ts).
   */
  orderQueues: Map<number, QueuedOrder[]>;
  /**
   * Things that happened to a player's own force this tick, drained into the
   * Echo snapshot and cleared.
   *
   * Held on the world rather than passed back through return values because
   * they are raised deep inside systems — a firing spike is raised by combat,
   * a transmission by the command path — and threading a channel through every
   * one of those would be a worse cost than a list the drain empties.
   */
  selfEvents: PendingSelfEvent[];
  /**
   * Acoustic residue. Lives on the world rather than on the terrain because
   * terrain is static map data shipped to clients wholesale, and residue is
   * neither — it is match state, resolved per listener.
   */
  marks: EchoMarkLayer;
  /**
   * Environmental hazards, seeded from the map.
   *
   * Simulation state and not map data: a hazard's *site* comes from the map
   * and never changes, but its phase and timers are part of the match.
   */
  hazards: Hazard[];
  /**
   * Thermal Draw per slot. A rate, recomputed every tick and never banked.
   *
   * Kept beside the economies rather than inside them precisely so nobody is
   * tempted to add to it — `PlayerEconomy` holds stockpiles, and this is not
   * one (docs/economy.md §2).
   */
  draw: Map<number, DrawReport>;
  /** Drift Health per region — docs/bestiary.md §6. The map can be killed. */
  drift: DriftHealth;
  /** Scratch: summed SIG per Drift region, rebuilt each tick. */
  driftNoise: Float32Array;
}

/** A self-event before it is bucketed by slot. `eid`, not a match-local id. */
export interface PendingSelfEvent {
  kind: SelfEventKind;
  eid: number;
  bearing?: number;
}

/** Raise a self-event. No-op for an entity the world has already destroyed. */
export function raiseSelfEvent(world: SimWorld, event: PendingSelfEvent): void {
  world.selfEvents.push(event);
}

/**
 * Give an entity its match-local id. Called by every spawn path, so an entity
 * that can be commanded always has one.
 */
export function registerEntity(world: SimWorld, eid: number): number {
  const local = world.nextLocalId++;
  world.localOfEid.set(eid, local);
  world.eidOfLocal.set(local, eid);
  return local;
}

/** Match-local id for an entity, or undefined if it was never registered. */
export function localIdOf(world: SimWorld, eid: number): number | undefined {
  return world.localOfEid.get(eid);
}

/** Entity for a match-local id, or 0 — which every command path rejects. */
export function eidOfLocalId(world: SimWorld, local: number): number {
  return world.eidOfLocal.get(local) ?? 0;
}

export function createSimWorld(terrain: Terrain, dt: number, seed: number): SimWorld {
  const world = createWorld() as SimWorld;
  world.terrain = terrain;
  world.tick = 0;
  world.dt = dt;
  world.economies = new Map();
  world.production = new Map();
  world.spireActive = new Set();
  world.rng = new Rng(seed);
  world.localOfEid = new Map();
  world.eidOfLocal = new Map();
  world.nextLocalId = 0;
  world.unitGrid = new SpatialHash(SEPARATION.CELL_M);
  world.separationBuffer = [];
  world.fuseGrid = new SpatialHash(SEPARATION.CELL_M);
  world.fuseBuffer = [];
  world.orderQueues = new Map();
  world.selfEvents = [];
  world.marks = new EchoMarkLayer();
  world.hazards = [];
  world.draw = new Map();
  world.drift = new DriftHealth(terrain.widthM, terrain.heightM);
  world.driftNoise = new Float32Array(world.drift.regionCount);
  // Burn entity id 0 so components can use eid 0 as a "none" sentinel
  // (Weapon.orderedTargetEid, Harvester.nodeEid). bitecs hands out dense ids
  // from 0, so without this the first spawned entity would be untargetable.
  addEntity(world);
  return world;
}

export function economyFor(world: SimWorld, slot: number): PlayerEconomy {
  let economy = world.economies.get(slot);
  if (economy === undefined) {
    economy = { nodules: ECONOMY.STARTING_NODULES, crystal: 0, biomass: 0 };
    world.economies.set(slot, economy);
  }
  return economy;
}

/**
 * Put a creature on the map.
 *
 * Owned by `DRIFT_SLOT`, which is not a player — so the Echo Layer's
 * "different slot" test admits it for everybody, and every player resolves the
 * Drift exactly as they resolve each other. That is the whole trick behind
 * docs/bestiary.md §3: fauna are contacts because nothing marks them out as
 * anything else.
 */
export function spawnFauna(
  world: SimWorld,
  options: { species: FaunaSpecies; x: number; y: number; depth?: number }
): number {
  const stats = faunaStatsFor(options.species);
  const eid = addEntity(world);
  registerEntity(world, eid);

  addComponent(world, Position, eid);
  Position.x[eid] = options.x;
  Position.y[eid] = options.y;
  Position.depth[eid] = options.depth ?? 300;

  addComponent(world, Acoustic, eid);
  Acoustic.sig[eid] = stats.sigIdle;
  Acoustic.hyd[eid] = stats.hyd;
  Acoustic.pfFactor[eid] = 1;
  Acoustic.sigFactor[eid] = 1;

  addComponent(world, Health, eid);
  Health.hp[eid] = stats.maxHp;
  Health.max[eid] = stats.maxHp;

  addComponent(world, Owner, eid);
  Owner.slot[eid] = DRIFT_SLOT;
  // Faction is meaningless for a creature; it is never sent, because the
  // contact assembly only reads it for entities that are Units or Structures.
  Owner.faction[eid] = 0;

  addComponent(world, Fauna, eid);
  Fauna.species[eid] = options.species;
  Fauna.stage[eid] = FaunaStage.Ambient;
  Fauna.interestS[eid] = 0;
  Fauna.quietS[eid] = 0;
  Fauna.interestedS[eid] = 0;
  Fauna.coolingS[eid] = 0;
  Fauna.targetEid[eid] = 0;
  Fauna.heard[eid] = 0;
  // Staggered, so a whole herd does not listen on the same tick.
  //
  // From the *match-local* id, never the entity id. bitecs allocates entity
  // ids from a counter global to the process, so two matches built in one
  // process would stagger their herds differently and diverge — the same trap
  // that bit the state hash and replays.
  Fauna.senseS[eid] = ((localIdOf(world, eid) ?? 0) % 30) / 60;
  Fauna.homeX[eid] = options.x;
  Fauna.homeY[eid] = options.y;

  return eid;
}

export interface SpawnOrdnanceOptions {
  kind: OrdnanceKind;
  slot: number;
  faction: Faction;
  x: number;
  y: number;
  depth: number;
  /** Radians. Where it is pointing at release. */
  heading?: number;
  /** Where the launch believed the target was — the ghost, at Tier 2. */
  aimX?: number;
  aimY?: number;
  /** Seeker sensitivity; 0 for ordnance that does not seek. */
  seekerHyd?: number;
  /** Inherited from the launcher. Below the depth it covers, ordnance implodes. */
  pressureRating: number;
  /** Depth a charge is set to detonate at. Defaults to where it was released. */
  targetDepthM?: number;
}

/**
 * Put ordnance in the water.
 *
 * It gets Position, Acoustic, Owner and Health and nothing else a hull would
 * have — no MoveOrder, no DepthOrder, no SilentRunning, no Unit. That is what
 * keeps movement, separation, production and the acoustics system from ever
 * seeing it: each of them queries on components ordnance does not carry, so
 * ordnance drops out of them by construction rather than by a check somebody
 * has to remember to write.
 *
 * `Acoustic.hyd` is left at zero on purpose. It is the field that makes an
 * entity a listener *for its owner* — the Echo pass and the residue read both
 * key off it — so a torpedo never adds a contact to its owner's picture.
 *
 * That closes the direct channel, and it is worth being precise about what it
 * does not close. An earlier version of this comment claimed the seeker
 * "reports to nobody", which was not true, and the imprecision is what let a
 * `locked` flag sit in the snapshot handing over "I have a firm solution on a
 * real hull" with no inference required. That flag is gone. What remains is a
 * *pursuit*, and a pursuit is visible because the commander must be able to see
 * where their own weapon is:
 *
 *   - `heading` is not the leak it looks like, and removing it would close
 *     nothing: `ordnanceSystem` moves the torpedo along its heading, so two
 *     consecutive positions — which the owner must be sent — give it back
 *     exactly. It is published because deriving it client-side is busywork.
 *   - The depth chase is the sharper one, and is also inherent. A torpedo
 *     matches its target's depth, so its own depth readout is roughly the
 *     target's, at a tier where `Contact.depth` would still be withheld.
 *   - A seeker takes the loudest emitter in its cone, which need not be what
 *     the player aimed at, so either channel can concern a hull they hold no
 *     contact on.
 *
 * All three are consequences of showing a player their own asset, so they are
 * documented as intended in docs/systems-combat.md §5 rather than papered over
 * here. What is bounded is the price: each costs a launched torpedo and expires
 * with it — the bargain Echo Marks strike (docs/systems-echo.md §7).
 */
export function spawnOrdnance(world: SimWorld, opts: SpawnOrdnanceOptions): number {
  const stats = ordnanceStatsFor(opts.kind);
  const eid = addEntity(world);
  registerEntity(world, eid);

  addComponent(world, Position, eid);
  Position.x[eid] = opts.x;
  Position.y[eid] = opts.y;
  Position.depth[eid] = opts.depth;

  addComponent(world, Acoustic, eid);
  Acoustic.sig[eid] = stats.sig;
  // Deaf to the Echo Layer by construction — see the note above.
  Acoustic.hyd[eid] = 0;
  Acoustic.pfFactor[eid] = 1;
  Acoustic.sigFactor[eid] = 1;
  Acoustic.spikeRemainingS[eid] = 0;
  Acoustic.spikeAmount[eid] = 0;

  addComponent(world, Health, eid);
  // Ordnance that cannot be shot down still carries Health, because the Echo
  // pass and every targeting query select on it. One hit point rather than
  // zero: it is alive, and nothing points a gun at it (see combat.ts).
  Health.max[eid] = stats.maxHp > 0 ? stats.maxHp : 1;
  Health.hp[eid] = Health.max[eid]!;

  addComponent(world, Owner, eid);
  Owner.slot[eid] = opts.slot;
  Owner.faction[eid] = opts.faction;

  addComponent(world, Ordnance, eid);
  Ordnance.kind[eid] = opts.kind;
  Ordnance.remainingS[eid] = stats.lifetimeS;
  Ordnance.heading[eid] = opts.heading ?? 0;
  Ordnance.seekerHyd[eid] = opts.seekerHyd ?? 0;
  Ordnance.targetEid[eid] = 0;
  Ordnance.aimX[eid] = opts.aimX ?? opts.x;
  Ordnance.aimY[eid] = opts.aimY ?? opts.y;
  Ordnance.pressureRating[eid] = opts.pressureRating;
  // Staggered, so a salvo does not re-acquire in lockstep.
  //
  // Every seeker sensing on the same tick is the difference between a smooth
  // cost and a spike: `acquire` walks the acoustic set and runs a terrain path
  // integral per in-cone candidate, so forty torpedoes launched together did
  // all of that work on one tick in twelve and none on the other eleven.
  // Spreading the first sense over the interval turns the spike into the
  // average without changing how often any individual seeker looks.
  //
  // From the *match-local* id and never the entity id, exactly as the fauna
  // sense stagger above: bitecs allocates entity ids from a process-global
  // counter, so keying on them would make two matches in one process stagger
  // differently and diverge.
  Ordnance.seekerCooldownS[eid] =
    (((localIdOf(world, eid) ?? 0) % SEEKER_STAGGER_STEPS) / SEEKER_STAGGER_STEPS) *
    ORDNANCE.TORPEDO.SEEKER_INTERVAL_S;
  Ordnance.wakeCooldownS[eid] = 0;
  // Every field, every time — bitecs recycles entity ids, so anything left
  // unwritten here is inherited from whatever last held this id. These two
  // were missed when mines were added, and a torpedo born on a detonated
  // mine's id came into the world already ringing: it emitted the mine's
  // detonation SIG, never ran, and expired a fraction of a second later.
  Ordnance.armingS[eid] = 0;
  Ordnance.detonatingS[eid] = 0;
  Ordnance.targetDepthM[eid] = opts.targetDepthM ?? opts.depth;

  return eid;
}

export interface SpawnOptions {
  kind: UnitKind;
  slot: number;
  faction: Faction;
  x: number;
  y: number;
  depth?: number;
}

/**
 * Create a unit with every component the simulation systems expect.
 *
 * Systems query by component signature, so a unit missing one silently drops
 * out of that system rather than erroring — spawning goes through this one
 * function so that cannot happen by accident.
 */
export function spawnUnit(world: SimWorld, opts: SpawnOptions): number {
  const stats = statsFor(opts.kind);
  const eid = addEntity(world);
  registerEntity(world, eid);

  addComponent(world, Position, eid);
  Position.x[eid] = opts.x;
  Position.y[eid] = opts.y;
  // Default to the deepest band the hull is rated for (capped at Mid-Water):
  // a PR-1 scout delivered at 600 m would take crush attrition from birth.
  Position.depth[eid] = opts.depth ?? (stats.pressureRating >= 2 ? 600 : 300);

  addComponent(world, Velocity, eid);
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;

  addComponent(world, MoveOrder, eid);
  MoveOrder.active[eid] = 0;

  // Units carry a depth order from birth; structures never get one. The
  // component is what makes a hull orderable vertically at all, so the
  // ownership check in Match.orderDepth rejects structures for free.
  addComponent(world, DepthOrder, eid);
  DepthOrder.active[eid] = 0;
  DepthOrder.descending[eid] = 0;
  DepthOrder.targetM[eid] = Position.depth[eid]!;

  addComponent(world, Acoustic, eid);
  Acoustic.sig[eid] = stats.sigIdle;
  Acoustic.hyd[eid] = stats.hyd;
  Acoustic.pfFactor[eid] = 1;
  Acoustic.sigFactor[eid] = 1;
  Acoustic.spikeRemainingS[eid] = 0;
  Acoustic.spikeAmount[eid] = 0;

  addComponent(world, Pressure, eid);
  Pressure.rating[eid] = stats.pressureRating;
  Pressure.bonus[eid] = 0;
  Pressure.crushTaken[eid] = 0;

  addComponent(world, Health, eid);
  Health.hp[eid] = stats.maxHp;
  Health.max[eid] = stats.maxHp;

  addComponent(world, Owner, eid);
  Owner.slot[eid] = opts.slot;
  Owner.faction[eid] = opts.faction;

  addComponent(world, Unit, eid);
  Unit.kind[eid] = opts.kind;

  addComponent(world, SilentRunning, eid);
  SilentRunning.active[eid] = 0;

  if (stats.attackDamage > 0) {
    addComponent(world, Weapon, eid);
    Weapon.cooldownRemainingS[eid] = 0;
    Weapon.orderedTargetEid[eid] = 0;
  }

  if (stats.carriesTorpedoes) {
    addComponent(world, Magazine, eid);
    Magazine.torpedoes[eid] = ORDNANCE.TORPEDO.MAGAZINE;
    Magazine.rearmRemainingS[eid] = 0;
  }

  // "Any combat hull can deploy one" (docs/systems-combat.md §5) — so the gate
  // is being armed at all, not being a torpedo carrier. A Light Scout has no
  // tubes and still gets a decoy, which is the point: the hull most likely to
  // be caught alone is the one that most needs a way out.
  if (stats.attackDamage > 0) {
    addComponent(world, Countermeasure, eid);
    Countermeasure.cooldownRemainingS[eid] = 0;
  }

  if (opts.kind === UnitKind.Harvester) {
    addComponent(world, Harvester, eid);
    Harvester.mode[eid] = HarvestMode.Idle;
    Harvester.cargo[eid] = 0;
    Harvester.nodeEid[eid] = 0;
    Harvester.depotEid[eid] = 0;
    Harvester.throttle[eid] = HarvestThrottle.Standard;
  }

  return eid;
}

export interface SpawnStructureOptions {
  kind: StructureKind;
  slot: number;
  faction: Faction;
  x: number;
  y: number;
  depth?: number;
  /**
   * Pre-built structures (the starting base) skip the construction phase;
   * everything commissioned mid-match rises loudly over its build time.
   */
  prebuilt?: boolean;
}

export function spawnStructure(world: SimWorld, opts: SpawnStructureOptions): number {
  const stats = structureStatsFor(opts.kind);
  const eid = addEntity(world);
  registerEntity(world, eid);

  addComponent(world, Position, eid);
  Position.x[eid] = opts.x;
  Position.y[eid] = opts.y;
  Position.depth[eid] = opts.depth ?? 600;

  addComponent(world, Acoustic, eid);
  Acoustic.sig[eid] = opts.prebuilt ? stats.sigIdle : CONSTRUCTION.SITE_SIG;
  Acoustic.hyd[eid] = stats.hyd;
  Acoustic.pfFactor[eid] = 1;
  Acoustic.sigFactor[eid] = 1;
  Acoustic.spikeRemainingS[eid] = 0;
  Acoustic.spikeAmount[eid] = 0;

  addComponent(world, Health, eid);
  Health.max[eid] = stats.maxHp;
  Health.hp[eid] = opts.prebuilt ? stats.maxHp : stats.maxHp * CONSTRUCTION.INITIAL_HP_FRACTION;

  addComponent(world, Owner, eid);
  Owner.slot[eid] = opts.slot;
  Owner.faction[eid] = opts.faction;

  addComponent(world, Structure, eid);
  Structure.kind[eid] = opts.kind;

  if (!opts.prebuilt) {
    addComponent(world, UnderConstruction, eid);
    UnderConstruction.remainingS[eid] = stats.buildTimeS;
    UnderConstruction.totalS[eid] = stats.buildTimeS;
  }

  if (stats.attackDamage !== undefined) {
    addComponent(world, Weapon, eid);
    Weapon.cooldownRemainingS[eid] = 0;
    Weapon.orderedTargetEid[eid] = 0;
  }

  return eid;
}

/**
 * Working depth of a nodule field: Mid-Water, where §7 puts the density and
 * where a PR-2 hull is at home. Named rather than inline so the contrast with
 * CRYSTAL.FIELD_DEPTH_M is legible.
 */
const NODULE_FIELD_DEPTH_M = 600;

export function spawnResourceNode(
  world: SimWorld,
  x: number,
  y: number,
  amount: number = ECONOMY.NODE_STARTING_AMOUNT,
  kind: ResourceKind = ResourceKind.Nodule
): number {
  const eid = addEntity(world);
  registerEntity(world, eid);
  addComponent(world, Position, eid);
  Position.x[eid] = x;
  Position.y[eid] = y;
  // Crystal lies in the Abyssal band, which is the entire point of it: the
  // field cannot be worked without committing to the descent, and the descent
  // is loud and the return is slow (docs/economy.md §7).
  Position.depth[eid] =
    kind === ResourceKind.ResonanceCrystal ? CRYSTAL.FIELD_DEPTH_M : NODULE_FIELD_DEPTH_M;
  addComponent(world, ResourceNode, eid);
  ResourceNode.remaining[eid] = amount;
  ResourceNode.kind[eid] = kind;
  return eid;
}
