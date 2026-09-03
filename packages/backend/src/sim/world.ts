/**
 * Simulation world: the bitecs world plus the side tables and terrain that
 * back it.
 */

import { createWorld, addEntity, addComponent, hasComponent, type IWorld } from 'bitecs';
import {
  CONSTRUCTION,
  CRYSTAL,
  ECONOMY,
  SEPARATION,
  Faction,
  HarvestThrottle,
  ResourceKind,
  SelfEventKind,
  type HarvestIdleReason,
  FaunaStage,
  faunaStatsFor,
  ordnanceStatsFor,
  ORDNANCE,
  OrdnanceKind,
  type DrawReport,
  type FaunaSpecies,
  type Stockpile,
  StructureKind,
  UnitKind,
  statsFor,
  effectivePressureRating,
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
  Heading,
  Magazine,
  MoveOrder,
  Ordnance,
  Owner,
  Position,
  Pressure,
  ResourceNode,
  SilentRunning,
  StaticEmitter,
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

/**
 * Per-player mutable economy state. Lives outside the ECS: it is per-slot,
 * not per-entity.
 *
 * A `Stockpile` in shared's terms — the same three accounts the snapshot
 * carries to the shell — so the server refuses and debits with the same
 * `affords` and `charge` the command bar greys its buttons with, on the same
 * `priceOf` sum (economy.ts). There is no fourth account: Thermal Draw is a
 * rate and lives in `draw`, below.
 */
export interface PlayerEconomy extends Stockpile {
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
   * Bloom-share nodes, copied from the map at construction — docs/economy.md
   * §6. Plain positions rather than entities: a bloom is ground, not a thing
   * in the water — never mined, never depleted, never a contact — so seating
   * it in the ECS would hand it to queries (targeting, the Echo pass) that
   * have no business seeing it. Read every tick by `bloomShareSystem`.
   */
  blooms: { x: number; y: number }[];
  /**
   * Hulls whose SIG is floored at an authored figure while a mission's
   * hold-and-cut lift runs — eid to the stated loudness. Written by the
   * mission runtime on the Echo tick, read by acoustics at 60 Hz, in the
   * `spireActive` arrangement: cleared and rebuilt whole on every mission
   * pass, so a finished or abandoned cut cannot leave a stale floor on a
   * recycled entity id. Empty in every skirmish.
   */
  liftCutSig: Map<number, number>;
  /**
   * The same, for a mission's sounding — eid to the SIG §4 states a sounding is
   * taken at, held while the twenty seconds run.
   *
   * A second map rather than a second writer into `liftCutSig`, because each is
   * cleared and rebuilt whole by its own mission pass: sharing one map would
   * make the order of `applyLifts` and `applySoundings` load-bearing, and the
   * second one to run would wipe the first one's floors. Two integer compares
   * per emitter in a skirmish, both gated on an empty map.
   */
  soundingSig: Map<number, number>;
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
   * Highest entity id ever handed out by this world.
   *
   * bitecs sizes every component store to the world's capacity (100,000) at
   * creation, so `Owner.slot.length` is that capacity forever, not the number
   * of entities in the match. Several passes walk entity ids ascending rather
   * than through a query — correctly, for small per-slot filtered reads — and
   * bounding those walks by the store length made each one scan 100,000 slots
   * to find the ~200 that exist. `driftTick` does it at 60 Hz.
   *
   * This is the bound they actually want: ids are dense from 0, so every live
   * entity is <= this. Maintained by `registerEntity`, which every spawn path
   * calls; `entityHighWaterCoversAllEntities` in test/world.test.ts fails if a
   * future spawn path forgets, because the alternative failure is silent —
   * an entity the Echo pass and the Drift simply never look at.
   */
  maxEid: number;
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
  /**
   * Entities the *map* killed this tick, cleared at the top of every step.
   *
   * Biomass is rendered fauna — you killed it, you are paid for it
   * (docs/bestiary.md §5). `payBiomass` approximates "you" as the nearest
   * entity with an owner, and defends that with "the same answer in every case
   * that matters", which held while every fauna death was a weapon kill. Once
   * hazards began reporting their kills that stopped being true: an eruption
   * kills a creature with no player involved, and the nearest hull could be
   * kilometres away and asleep. Deaths listed here skip the payout.
   *
   * Drift health is *not* excused: the region really did lose a creature, so
   * `recordKill` still runs.
   */
  environmentalDeaths: Set<number>;
}

/** A self-event before it is bucketed by slot. `eid`, not a match-local id. */
export interface PendingSelfEvent {
  kind: SelfEventKind;
  eid: number;
  /**
   * Who is told, resolved here rather than at the drain.
   *
   * The drain runs at 5 Hz and `reap` runs at 60, so an entity raising an
   * event can be gone — components and all — before anybody reads it. Asking
   * `Owner.slot` at drain time therefore silently dropped exactly the events
   * that matter most: the blow that killed the hull. Ownership is a fact at
   * the moment of the event, so it is captured at the moment of the event.
   */
  slot: number;
  bearing?: number;
  /** `HarvesterIdle` only — why the hull ran out of work. */
  idleReason?: HarvestIdleReason;
}

/**
 * Raise a self-event, addressed to whoever owns the entity right now.
 *
 * No-op for an entity with no owner: nothing to tell, and nobody to tell.
 */
export function raiseSelfEvent(world: SimWorld, event: Omit<PendingSelfEvent, 'slot'>): void {
  if (!hasComponent(world, Owner, event.eid)) return;
  world.selfEvents.push({ ...event, slot: Owner.slot[event.eid]! });
}

/**
 * Give an entity its match-local id. Called by every spawn path, so an entity
 * that can be commanded always has one.
 */
export function registerEntity(world: SimWorld, eid: number): number {
  const local = world.nextLocalId++;
  world.localOfEid.set(eid, local);
  world.eidOfLocal.set(local, eid);
  // Never decreases, so a recycled id after removeEntity stays covered.
  if (eid > world.maxEid) world.maxEid = eid;
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
  // The map is built; from here, a cell write is something that happened in
  // the match. That is the distinction the wire and the state hash both need
  // (#197) — the join payload already carries the constructed ground.
  terrain.markBaseline();
  world.tick = 0;
  world.dt = dt;
  world.economies = new Map();
  world.production = new Map();
  world.spireActive = new Set();
  world.blooms = [];
  world.liftCutSig = new Map();
  world.soundingSig = new Map();
  world.rng = new Rng(seed);
  world.localOfEid = new Map();
  world.eidOfLocal = new Map();
  world.nextLocalId = 0;
  world.maxEid = 0;
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
  world.environmentalDeaths = new Set();
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
  // Where the species lives (docs/bestiary.md §4), capped by the ground under
  // it — a creature cannot sit below the sea floor any more than a hull can.
  // Every creature used to be seeded at a flat 300 m, which made the roster's
  // habitats decoration and put the Sounder on the Shelf.
  //
  // Ambient species are seeded *across* their band rather than at depth
  // (§4's "Seeded across" column): they never pursue, so their vertical
  // extent is entirely a property of this line. The offset walks the band on
  // the golden-ratio sequence keyed by match-local id — evenly spread, no
  // draw from the match RNG (a mission spawning one shoal must not shift
  // every later roll), and deterministic across processes for the reason the
  // sense stagger below gives.
  let restingDepth = stats.workingDepthM;
  if (stats.seedSpreadM > 0) {
    const fraction = (((localIdOf(world, eid) ?? 0) * 0.6180339887498949) % 1) * 2 - 1;
    restingDepth += fraction * stats.seedSpreadM;
  }
  Position.depth[eid] =
    options.depth ?? Math.min(restingDepth, world.terrain.floorAt(options.x, options.y));

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
  Fauna.homeDepth[eid] = stats.workingDepthM;
  // Nothing is born under a beat; the runtime raises this when one takes hold.
  Fauna.driven[eid] = 0;
  // Nor shot before it was born — the recycled-id argument below.
  Fauna.struck[eid] = 0;
  Fauna.struckBy[eid] = 0;
  // Written even for species that never scavenge or scatter — bitecs recycles
  // entity ids, and a creature born on a dead swarm's id must not inherit its
  // wreck, nor a shoal a dead shoal's fright.
  Fauna.scavengeMarkId[eid] = 0;
  Fauna.scatterS[eid] = 0;

  return eid;
}

export interface SpawnEmitterOptions {
  /** A scripted party's slot — never the player's, who could then not hear it. */
  slot: number;
  faction: Faction;
  x: number;
  y: number;
  depth: number;
  /** Loudness through each strike window. */
  sig: number;
  /** Ticks from one strike window's start to the next. */
  periodTicks: number;
  /** Ticks of each period the emitter is loud. */
  onTicks: number;
  /** Authored durability — the chamber can be lost, and §8 prices that. */
  hp: number;
}

/**
 * Place an authored static emitter — the taps (docs/mission-asset-recovery.md
 * §6): a periodic, patterned sound source that is audible and locatable but
 * not a unit.
 *
 * The ordnance shape, for the ordnance reason: Position, Acoustic, Owner and
 * Health and nothing else a hull would have, so movement, combat stats,
 * production and separation never see it — and the Echo Layer's contact
 * assembly, unchanged, classifies it as *nothing*. A Tier-3 resolution carries
 * position and depth and no kind, structure, species or faction: the water
 * says only that something in it is striking iron.
 *
 * `Acoustic.hyd` stays zero for `spawnOrdnance`'s reason — an emitter never
 * adds a contact to anybody's picture. `Acoustic.sig` starts at zero and is
 * derived every tick by acoustics from the authored pattern; the Owner slot is
 * a scripted party's, so every seated player resolves it through the same pair
 * loop, tier maths and opaque handles as any hull. Fauna hear it through their
 * own walk — "the Drift hears exactly what the column hears" — with no new
 * code on either path.
 */
export function spawnEmitter(world: SimWorld, opts: SpawnEmitterOptions): number {
  const eid = addEntity(world);
  registerEntity(world, eid);

  addComponent(world, Position, eid);
  Position.x[eid] = opts.x;
  Position.y[eid] = opts.y;
  Position.depth[eid] = opts.depth;

  addComponent(world, Acoustic, eid);
  Acoustic.sig[eid] = 0;
  Acoustic.hyd[eid] = 0;
  Acoustic.pfFactor[eid] = 1;
  Acoustic.sigFactor[eid] = 1;
  Acoustic.spikeRemainingS[eid] = 0;
  Acoustic.spikeAmount[eid] = 0;

  addComponent(world, Health, eid);
  Health.max[eid] = Math.max(1, opts.hp);
  Health.hp[eid] = Health.max[eid]!;

  addComponent(world, Owner, eid);
  Owner.slot[eid] = opts.slot;
  // Never sent: the contact assembly reads faction only for Units and
  // Structures, which is what keeps the taps belonging to nobody.
  Owner.faction[eid] = opts.faction;

  addComponent(world, StaticEmitter, eid);
  StaticEmitter.sig[eid] = opts.sig;
  // Clamped so an authored zero cannot turn the pattern modulo into NaN;
  // missions.test.ts rejects the literal before it gets here.
  StaticEmitter.periodTicks[eid] = Math.max(1, opts.periodTicks);
  StaticEmitter.onTicks[eid] = opts.onTicks;
  StaticEmitter.active[eid] = 1;

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
  /**
   * Spawn the hull with no Weapon, no Magazine and no Countermeasure.
   *
   * docs/campaign.md §3 — "weapons are disabled for the entire mission" — read
   * as the hull having none rather than the button being hidden, because an
   * order-layer gate cannot reach auto-engagement: `combatSystem` returns fire
   * at anything hostile in range without an order ever being issued, and its
   * query drops a Weapon-less hull entirely. Hostility is `Owner.slot` and the
   * simulation has no notion of neutrality, so a court full of armed parties
   * standing around one exchange opens fire on the first tick.
   *
   * The countermeasure clause is not an oversight either way: a hull stripped
   * of guns but left its decoys could still seed the court's water with
   * ordnance and still shout, which is the opposite of a silence order
   * (docs/mission-sorrowgate.md §3).
   */
  weaponsCold?: boolean;
  /**
   * The hull's initial bow, radians — docs/systems-echo.md §8.
   *
   * Defaults to 0 (due east), which is arbitrary and deterministic, and matters
   * only for a Knight hull that emits before it has ever been given a course:
   * §8's rule is that a stopped hull holds its *last* course, and a hull that
   * has never moved has not got one. Callers that care — a mission seating a
   * force that is meant to be facing somewhere on the first tick — say so here.
   */
  heading?: number;
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
  //
  // Rated *for this navy*, not for the roster. The Directorate's PR-3 baseline
  // (docs/systems-depth.md §3) is what lets their scouts be seated below the
  // Shelf line, and they have to be: since the shallow-water penalty landed,
  // 300 m is inside their own faction's weakness, and a hull that begins the
  // match already bleeding is a stat rather than a trade.
  const rating = effectivePressureRating(opts.kind, opts.faction);
  Position.depth[eid] = opts.depth ?? (rating >= 2 ? 600 : 300);

  addComponent(world, Velocity, eid);
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;

  // A bow that outlives a stop (docs/systems-echo.md §8). Hulls only: a
  // structure has no bow, so `spawnStructure` does not add this and the Echo
  // pass can ask for the component rather than for the entity's kind.
  addComponent(world, Heading, eid);
  Heading.rad[eid] = opts.heading ?? 0;

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
  Pressure.rating[eid] = rating;
  Pressure.bonus[eid] = 0;
  Pressure.unhealable[eid] = 0;

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

  if (stats.attackDamage > 0 && opts.weaponsCold !== true) {
    addComponent(world, Weapon, eid);
    Weapon.cooldownRemainingS[eid] = 0;
    Weapon.orderedTargetEid[eid] = 0;
  }

  if (stats.carriesTorpedoes && opts.weaponsCold !== true) {
    addComponent(world, Magazine, eid);
    Magazine.torpedoes[eid] = ORDNANCE.TORPEDO.MAGAZINE;
    Magazine.rearmRemainingS[eid] = 0;
  }

  // "Any combat hull can deploy one" (docs/systems-combat.md §5) — so the gate
  // is being armed at all, not being a torpedo carrier. A Light Scout has no
  // tubes and still gets a decoy, which is the point: the hull most likely to
  // be caught alone is the one that most needs a way out.
  if (stats.attackDamage > 0 && opts.weaponsCold !== true) {
    addComponent(world, Countermeasure, eid);
    Countermeasure.cooldownRemainingS[eid] = 0;
  }

  if (opts.kind === UnitKind.Harvester) {
    addComponent(world, Harvester, eid);
    Harvester.mode[eid] = HarvestMode.Idle;
    // Fresh, not stalled: a hull awaiting its first order raises no notice.
    Harvester.idleReason[eid] = 0;
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
  Position.depth[eid] = opts.depth ?? CONSTRUCTION.WORKING_DEPTH_M;

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
  // Your own aura, until something deliberately lends it elsewhere. bitecs
  // arrays are recycled, so this must be written rather than left to default:
  // a zeroed grant would hand a recycled structure's aura to slot 0.
  Structure.grantSlot[eid] = opts.slot;

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
