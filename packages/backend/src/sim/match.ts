/**
 * Match — owns the world and drives the fixed-step simulation.
 *
 * Two clocks run here, deliberately:
 *   - the simulation steps at SIM.TICK_HZ (60 Hz) in fixed increments, so
 *     behaviour does not vary with server load or wall-clock jitter;
 *   - the Echo Layer resolves at SIM.ECHO_HZ (5 Hz), because detection is the
 *     expensive pass and players cannot perceive 60 Hz changes in a sonar
 *     contact anyway.
 *
 * The match itself is the classic RTS loop with the Echo Layer underneath it:
 * mine nodules, build structures, produce units, and destroy the enemy
 * Bastion. Losing your Bastion is elimination; the last commander with a
 * Bastion standing wins.
 */

import { addComponent, defineQuery, hasComponent, removeEntity } from 'bitecs';
import {
  ACTIVE_SONAR,
  HULL_EFFECTS,
  BERTHS,
  BLOOM_SHARE,
  type BerthReport,
  CONCESSION,
  CONSTRUCTION,
  CRYSTAL,
  DEPTH,
  Faction,
  HarvestThrottle,
  type HarvestIdleReason,
  OPENING_ESCORT,
  PRODUCIBLE,
  REFIT_TERMS,
  RefitKind,
  refitLineTimeS,
  refitOfferedTo,
  refitPriceFor,
  ResourceKind,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
  unitAvailableTo,
  affords,
  charge,
  priceOf,
  Biome,
  DRIFT,
  EchoMarkKind,
  FaunaSpecies,
  faunaStatsFor,
  HazardPhase,
  OrdnanceKind,
  depthBandFor,
  mineCapFor,
  ResolutionTier,
  SelfEventKind,
  type MissionAbility,
  type MissionView,
  type EchoSnapshot,
  type SelfEvent,
  type GameOverPayload,
  type OwnOrdnance,
  type OwnStructure,
  type JellyCluster,
  type OwnUnit,
  type ResourceNodeInfo,
  type ShoalTell,
} from '@echoes/shared';
import {
  Acoustic,
  ActivePing,
  DecoyMagazine,
  EngineOff,
  Carried,
  Countermeasure,
  DepthOrder,
  Embarking,
  Fauna,
  Harvester,
  HarvestMode,
  Health,
  Hold,
  LandingGrant,
  Magazine,
  MineMagazine,
  MoveOrder,
  Ordnance,
  Owner,
  Position,
  Posture,
  Pressure,
  ResourceNode,
  SilentRunning,
  Structure,
  UnderConstruction,
  Unit,
  Weapon,
} from './components.ts';
import { EchoLayer } from './systems/echoLayer.ts';
import { cadencePingSystem } from './systems/cadencePing.ts';
import { seedSpore, siegeSystem, startSong } from './systems/siege.ts';
import { acousticsSystem } from './systems/acoustics.ts';
import { aurasSystem } from './systems/auras.ts';
import { standingWaveSystem } from './systems/standingWave.ts';
import { combatSystem } from './systems/combat.ts';
import { constructionSystem } from './systems/construction.ts';
import { depthSystem } from './systems/depth.ts';
import { separationSystem } from './systems/separation.ts';
import { clearQueue, enqueue, orderQueueSystem, queueView } from './systems/orderQueue.ts';
import {
  canBoard,
  cancelEmbark,
  carryingSystem,
  forgetCarried,
  landHold,
} from './systems/carrying.ts';
import { harvestSystem } from './systems/harvest.ts';
import { hullEffectsSystem } from './systems/hullEffects.ts';
import { movementSystem } from './systems/movement.ts';
import {
  deployNoisemaker,
  layDecoy,
  dropDepthCharge,
  launchTorpedo,
  layMine,
  ordnanceSystem,
} from './systems/ordnance.ts';
import { pressureSystem } from './systems/pressure.ts';
import { productionSystem } from './systems/production.ts';
import { grantRefit } from './systems/refit.ts';
import { randomSeed, type Rng } from './rng.ts';
import { ReplayRecorder, type Replay, type ReplayCommand } from './replay.ts';
import { hashWorld } from './stateHash.ts';
import { accumulateWorst, newStepWork, resetStepWork, type StepWork } from './stepWork.ts';
import { Terrain } from './terrain.ts';
import { VENTFRONT_DIVIDE, terrainFor, type MapDefinition } from './maps/index.ts';
import { MissionRuntime } from './missions/runtime.ts';
import { fieldDefinition } from './missions/roster.ts';
import type { MissionDefinition } from './missions/types.ts';
import type { MissionLine, MissionResolution } from './missions/runtime.ts';
import { countFauna, countFaunaOf, DRIFT_SLOT, faunaSystem } from './systems/fauna.ts';
import {
  dormantSecondsFor,
  hazardStates,
  hazardsSystem,
  isPermanent,
  isSimulated,
  rebuildPropagation,
  type Hazard,
} from './systems/hazards.ts';
import { drawFor, thermalSystem } from './systems/thermal.ts';
import { titheSystem } from './systems/tithe.ts';
import { bloomShareSystem } from './systems/bloomShare.ts';
import { bioReactorSystem, sowingSystem, startSowing } from './systems/flora.ts';
import {
  ambientBandFor,
  createSimWorld,
  economyFor,
  localIdOf,
  spawnResourceNode,
  spawnFauna,
  spawnStructure,
  spawnUnit,
  type SimWorld,
  raiseSelfEvent,
} from './world.ts';

/** Construction options for a match. Both default to "a normal live match". */
export interface MatchOptions {
  /** Fixed seed, for reproducing a match. Omitted means pick one and record it. */
  seed?: number;
  /** Capture a replay as the match runs. */
  record?: boolean;
  /**
   * Populate the Drift. On by default — a normal match has fauna.
   *
   * Tests of other subsystems turn it off, for the same reason they pass a
   * flat terrain: a world full of animals is noise when the thing under test
   * is a harvester round trip.
   */
  fauna?: boolean;
  /**
   * Override the terrain the map would paint.
   *
   * For tests only, and specifically for the ones that want a blank or
   * hand-built grid so the thing under test is not also being asked to survive
   * an authored map's biomes. A match started this way still takes its spawns
   * and resource fields from the map.
   */
  terrain?: Terrain;
  /**
   * Run this match as an authored mission (docs/campaign.md).
   *
   * Installed here rather than by the room, and that placement is the whole
   * trick: `playReplay` rebuilds a match from its seed and its commands by
   * constructing a `Match`, so a mission installed in the constructor is
   * reproduced on playback for free, while one deployed room-side would
   * replay as an empty map.
   */
  mission?: MissionDefinition;
  /**
   * Drift Health this map is already carrying — docs/campaign.md §2 rule 5.
   *
   * A grid the *client* presented, so it is validated (`validDriftCarry`) by
   * the room before it gets here. Constructor-side for `mission`'s reason: a
   * replay rebuilds a `Match` from its options, and a carry installed
   * room-side would replay on a map that opens at the biome defaults.
   */
  driftCarry?: readonly number[] | null;
  /**
   * Cadre ids of the player's hulls the campaign has already spent
   * (docs/campaign.md §7 row 3; `missions/roster.ts`). A mission that fields
   * one of them seats nobody under it, and its counts read over what came.
   *
   * Here beside `mission` for `mission`'s reason: the fielding happens in the
   * constructor, so a replay that records the set (`Replay.spent`) rebuilds
   * the same short party rather than the literal's full one. Already bounded
   * by the room (`validateSpent`) by the time it reaches this option; the
   * constructor trusts it the way it trusts `mission`. Omitted is nothing
   * spent, which is every skirmish and every mission outside the Knights'.
   */
  spent?: ReadonlySet<string>;
}

const FIXED_DT = 1 / SIM.TICK_HZ;
/**
 * Simulation ticks between Echo passes.
 *
 * The pass used to be driven by an accumulator of wall-clock `deltaMs`, which
 * made *when* detection happened a function of how the server was being called
 * rather than of simulation time. That is fine for a live match and fatal for a
 * replay: `stepOnce` drives the tick loop directly and never touched the
 * accumulator, so playback resolved the Echo Layer exactly zero times. Every
 * command gated on a contact — a torpedo launch needs Tier 2 (§7) — was
 * therefore refused on playback while having been accepted live, and the replay
 * reported a clean run because the divergence fell between two checkpoints.
 *
 * Tick-driven, both paths resolve on the same ticks. For the common
 * `update(1000 / 60)` call this is exactly the old cadence, one pass every
 * twelve ticks; it only differs where the old code was already wrong.
 */
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
/**
 * Cap on steps per update. Without it, a long stall makes the next update try
 * to catch up in one go, which takes even longer — the classic spiral of death.
 * Past this we accept simulation time slipping behind wall-clock instead.
 */
const MAX_STEPS_PER_UPDATE = 5;

/** Longest production queue a single structure will accept. */
const MAX_QUEUE_LENGTH = 8;

/** Minimum clearance between a new structure's footprint and anything else. */
const PLACEMENT_CLEARANCE_M = 40;

/**
 * What a full map holds — docs/bestiary.md §4, and the ceiling `seedFauna`
 * fills exactly.
 *
 * A table rather than a run of calls because it is read twice now: once to
 * seed the Drift and once, per species, as the complement `repopulate` refills
 * toward. Two lists would be free to disagree, and the one that disagreed
 * would be the one deciding what the map is worth for the rest of the match.
 */
const FAUNA_ROSTER: readonly { species: FaunaSpecies; count: number }[] = [
  // A herd and a couple of packs, then the colossus.
  { species: FaunaSpecies.Ashgrazer, count: 16 },
  { species: FaunaSpecies.Draymaw, count: 15 },
  { species: FaunaSpecies.Sounder, count: 1 },
  // Swarms, each one entity (docs/bestiary.md §4 — "20-40 individuals treated
  // as one entity"). Scattered anywhere: the Rasp's habitat is a verb, and
  // where things will die is not knowable at seed time.
  { species: FaunaSpecies.Rasp, count: 3 },
  // Shoals, each one entity, spread across the Shelf band by spawnFauna's
  // seeding — §6's Healthy row wants "Lampfry tells everywhere".
  { species: FaunaSpecies.Lampfry, count: 6 },
  // Clusters, each one entity, in the duct band. Their masking is a PF
  // modifier rather than behaviour, so the grid is rebuilt once they exist.
  { species: FaunaSpecies.Tetherjelly, count: 5 },
  // Ambushers, solitary, on ground deep enough to be trench country. Last,
  // because the roster fills the cap exactly and the predator that holds still
  // is the one a thin map misses least.
  { species: FaunaSpecies.Hollow, count: 2 },
];

/**
 * The colossus — docs/bestiary.md §4's Megafauna heading, which holds exactly
 * one row. §6's Strained band closes a region to it entirely.
 */
const MEGAFAUNA: ReadonlySet<FaunaSpecies> = new Set([FaunaSpecies.Sounder]);

/**
 * How finely `placeMegafauna` walks the map looking for ground a colossus may
 * stand on.
 *
 * 50 m because that is the resolution #578 measured the admissible fraction at
 * — 7.4% of the Ventfront Divide — so the search sees the same map the bug
 * report does. Finer would find pockets narrower than the animal is long
 * (60-90 m, docs/bestiary.md §4); coarser could miss a legitimate one.
 */
const MEGAFAUNA_SEARCH_STEP_M = 50;

export class Match {
  readonly world: SimWorld;
  /** Public for bench/echo-pass.mjs, which times the pass in isolation. */
  readonly echo = new EchoLayer();
  private readonly slots: number[] = [];
  /**
   * Slots the Echo pass resolves for beyond the seated commanders — a
   * mission's scripted parties (#323).
   *
   * Kept apart from `slots` deliberately, because that list is not only the
   * Echo Layer's observer roster: `resolveVictory` ends a two-plus-slot match,
   * `checkConcessions` scuttles stalled ones, and `resolveEcho` builds a
   * snapshot per entry. A scripted party must be *heard for* — otherwise the
   * player's `ExposureReport` can never rise and every `tolerance` predicate
   * is inert — without becoming a roster entry any of those rules can see.
   */
  private readonly scriptedObservers: number[] = [];
  /** Scratch for the seated-plus-scripted union handed to `EchoLayer.run`. */
  private readonly observerScratch: number[] = [];
  private readonly eliminated = new Set<number>();
  private readonly destroyedScratch: number[] = [];
  /** Hulls that boarded a carrier this tick, for the Echo Layer to forget. */
  private readonly boardedScratch: number[] = [];
  /**
   * Every entity that can die, for `reap`'s zero-HP backstop. Held on the
   * instance because a bitecs query caches its result set per world.
   */
  private readonly healthQuery = defineQuery([Health, Owner]);
  private readonly nodes: ResourceNodeInfo[] = [];
  /**
   * What the scuttling rule remembers between checks, per slot.
   *
   * `lastRiseTick` is the last time any stockpile of theirs went up — income,
   * from whatever source: mining, the Hadron tithe, a bloom share, rendered
   * remains. Spending is not a fall the rule cares about, so each field is
   * compared against the previous sample rather than accumulated.
   *
   * `stalledSince` is when the position first became one nothing can come out
   * of, or -1 while it is not. It is the streak that has to survive
   * CONCESSION.WINDOW_S, and any single check that fails resets it.
   */
  private readonly concession = new Map<
    number,
    {
      nodules: number;
      crystal: number;
      biomass: number;
      lastRiseTick: number;
      stalledSince: number;
    }
  >();
  private readonly unitOwners = defineQuery([Unit, Owner]);
  private readonly structureOwners = defineQuery([Structure, Owner]);
  /**
   * The rest of the reads that used to walk every entity id from 0 to
   * `maxEid` (#430). That walk never shrinks — `maxEid` only rises — so on a
   * long match with ordnance churn it grew for the whole match, and it ran
   * three times per slot on every Echo pass and once per 60 Hz tick in
   * `driftTick`. A query is proportional to what actually exists.
   *
   * Wire lists are still emitted in ascending entity order (`ascending`):
   * bitecs returns a query in insertion order, which diverges from id order
   * the moment an id is recycled, and the order of a snapshot's `units` is
   * something tests and the client have always been allowed to rely on.
   */
  private readonly owners = defineQuery([Owner]);
  private readonly emitters = defineQuery([Acoustic, Owner, Position]);
  private readonly faunaQuery = defineQuery([Fauna, Health, Position]);
  private readonly ordnanceOwners = defineQuery([Ordnance, Owner]);
  /** Scratch for `ascending`, so an Echo pass sorts into one array it already owns. */
  private readonly ascendingScratch: number[] = [];
  /**
   * Faction per seated slot, recorded at `addPlayer`. `factionOf` used to
   * find it by scanning for any entity the slot owned; the map answers the
   * question a seat already knew the answer to, and the scan stays only as
   * the fallback for a slot seated by a mission runtime rather than a player.
   */
  private readonly factionBySlot = new Map<number, Faction>();
  private accumulator = 0;
  /** Snapshots produced by an Echo pass inside `step`, collected by `update`. */
  private pendingSnapshots: Map<number, EchoSnapshot> | null = null;
  /** Rolling worst-case Echo pass cost, for budget checks. */
  private worstEchoMs = 0;
  /**
   * Rolling worst-case cost of a whole simulation step, and of the three
   * systems that move things within it.
   *
   * The Echo pass has had a measured budget since it was written, and the
   * 60 Hz step has had none — so a regression on the tick path was only ever
   * visible as a test that got slower, on a machine somebody happened to be
   * watching. Movement, depth and separation are timed as a group because
   * they are the part of the step that scales with the fleet.
   */
  private worstStepMs = 0;
  /**
   * What the Drift was seeded to hold, per species — the carrying capacity
   * `repopulate` refills toward and never exceeds (docs/bestiary.md §6).
   *
   * Empty for a match seeded without fauna, which is what makes the whole
   * repopulate path free for every test and every mission that opens with
   * `fauna: false`.
   */
  private readonly complement = new Map<FaunaSpecies, number>();
  /** Seconds of match owed to the Drift, toward its next replacement. */
  private repopulateCreditS = 0;
  private worstPhysicsMs = 0;
  /**
   * The same rolling worst case, counted instead of timed.
   *
   * Both are kept because they answer different questions and only one of them
   * can be asserted on. The milliseconds above say whether this machine kept up
   * and are worth printing; the counts say whether the *algorithm* changed, and
   * are the same on a loaded CI runner as on an idle laptop. sim/stepWork.ts
   * records why the distinction cost a red build to learn.
   */
  private readonly worstWork = newStepWork();
  private matchResult: GameOverPayload | null = null;
  /**
   * The mission, running, or null for a skirmish.
   *
   * Its result is kept apart from `matchResult` on purpose. A mission has no
   * winner — it reaches an authored outcome, and one of those outcomes is
   * "nine of the fourteen" — so folding it into a payload whose only field is
   * `winnerSlot` would make both client consumers, which derive win and loss
   * from slot equality, say something untrue about an evacuation.
   */
  private readonly missionRuntime: MissionRuntime | null;
  private missionResult: MissionResolution | null = null;

  /** Non-null while this match is being recorded. */
  private readonly recorder: ReplayRecorder | null;
  readonly seed: number;

  /**
   * The authored map this match is being played on.
   *
   * Everything that used to be arithmetic over `widthM`/`heightM` — spawn
   * corners, resource fields — now reads from here. That arithmetic assumed a
   * square map with four usable corners, which stopped being true the moment
   * a corridor map existed.
   */
  readonly map: MapDefinition;

  constructor(map: MapDefinition = VENTFRONT_DIVIDE, options: MatchOptions = {}) {
    this.map = map;
    this.seed = options.seed ?? randomSeed();
    this.world = createSimWorld(
      options.terrain ?? terrainFor(map),
      FIXED_DT,
      this.seed,
      options.driftCarry
    );
    // Before anything is seeded or placed: where an ambient species rests is
    // the map's to say (docs/bestiary.md §4), and the Drift and the mission
    // runtime both read it from the world rather than from the literal.
    this.world.ambientBands = map.ambientBands ?? {};
    this.recorder =
      options.record === true
        ? new ReplayRecorder(
            this.seed,
            map.id,
            options.fauna !== false,
            options.mission?.id ?? null,
            options.driftCarry ?? null,
            [...(options.spent ?? [])]
          )
        : null;
    this.seedResourceNodes();
    this.seedHazards();
    // After the authored sites, so a bed's id continues the map's own run and
    // a garden is the last thing seeded rather than the first.
    this.seedBlooms();
    if (options.fauna !== false) this.seedFauna();
    // Last, so the authored forces are placed into a world whose nodes,
    // hazards and Drift already exist — and after the seeded systems have
    // drawn from `world.rng`, so installing a mission cannot shift anybody
    // else's stream. The runtime never touches the RNG at all.
    //
    // Fielded through the record first: a hull the campaign has spent is not
    // in the party the runtime installs, so nothing downstream — roles,
    // soundings, the six named rows — ever learns it was authored.
    this.missionRuntime =
      options.mission === undefined
        ? null
        : new MissionRuntime(fieldDefinition(options.mission, options.spent ?? new Set()));
    this.missionRuntime?.install(
      this.world,
      (slot) => {
        if (!this.slots.includes(slot)) this.slots.push(slot);
      },
      (slot) => {
        if (!this.scriptedObservers.includes(slot)) this.scriptedObservers.push(slot);
      }
    );
  }

  /**
   * The replay of this match so far, or null when it is not being recorded.
   * Safe to call mid-match; the recording keeps going.
   */
  replay(): Replay | null {
    return this.recorder?.finish(this.world.tick) ?? null;
  }

  /** Skips the work entirely when nothing is recording. */
  private recordCommand(command: ReplayCommand): void {
    this.recorder?.record(command);
  }

  /**
   * Match-local id for an entity, for the replay log.
   *
   * -1 for an entity this world never spawned, which is what a malformed or
   * hostile command carries. It survives the round trip as "no such entity"
   * and gets rejected on replay exactly as it was rejected live.
   */
  private localId(eid: number): number {
    return localIdOf(this.world, eid) ?? -1;
  }

  get tick(): number {
    return this.world.tick;
  }

  get worstEchoPassMs(): number {
    return this.worstEchoMs;
  }

  /** Worst-case cost of a full simulation step, against the 60 Hz budget. */
  get worstStepMsCost(): number {
    return this.worstStepMs;
  }

  /** Worst-case cost of movement + depth + separation within a step. */
  get worstPhysicsMsCost(): number {
    return this.worstPhysicsMs;
  }

  /**
   * Counted work the most recent fixed step did on the paths that scale.
   *
   * The 60 Hz counterpart to `contactPathWalksLastPass`, and asserted the same
   * way — see sim/stepWork.ts for why a count and not a stopwatch.
   */
  get stepWorkLastTick(): Readonly<StepWork> {
    return this.world.stepWork;
  }

  /** The same counters, at their worst over every step of this match so far. */
  get worstStepWork(): Readonly<StepWork> {
    return this.worstWork;
  }

  /**
   * Worst-case cost of the residue read, which is a slice of the pass above.
   *
   * Reported separately because it is the newest thing inside the 2 ms budget
   * and therefore the first suspect when that budget starts slipping.
   */
  get worstMarkCostMs(): number {
    return this.echo.worstMarkCostMs;
  }

  /** Path integrals the residue read did on the most recent Echo pass. */
  get markPathWalksLastPass(): number {
    return this.echo.markPathWalksLastPass;
  }

  /** Path integrals the contact pass did on the most recent Echo pass. */
  get contactPathWalksLastPass(): number {
    return this.echo.contactPathWalksLastPass;
  }

  /** Non-null once a winner exists. Checked by the room after each update. */
  get result(): GameOverPayload | null {
    return this.matchResult;
  }

  /**
   * Non-null once the mission has reached its authored outcome.
   *
   * Separate from `result` because a mission has no winner to name. A
   * skirmish never sets this and a mission never sets `result`: the mission
   * seats one slot, and `resolveVictory` needs two, so the two-roster rule
   * stays exactly as written and simply stops being the only way a match can
   * end.
   */
  get missionOver(): MissionResolution | null {
    return this.missionResult;
  }

  /** The mission view for the player, or null when nothing changed. */
  takeMissionView(): MissionView | null {
    return this.missionRuntime?.takeView() ?? null;
  }

  /** The mission view as it stands, for a client that has just (re)joined. */
  get missionView(): MissionView | null {
    return this.missionRuntime?.currentView ?? null;
  }

  /** Authored lines a `say` beat produced since the last drain. */
  takeMissionLines(): MissionLine[] {
    return this.missionRuntime?.takeLines() ?? [];
  }

  /** Rolling worst-case cost of the mission pass, reported beside the others. */
  get worstMissionMsCost(): number {
    return this.missionRuntime?.worstMsCost ?? 0;
  }

  /**
   * Drive the mission one Echo tick.
   *
   * The runtime is given the *unrecorded* halves of the command methods, so a
   * beat cannot reach the replay recorder: beats re-fire on playback because
   * this runs inside `step`, and recording them too would apply each one
   * twice.
   */
  private tickMission(): void {
    const runtime = this.missionRuntime;
    if (runtime === null || this.missionResult !== null) return;
    const own = this.pendingSnapshots?.get(runtime.definition.playerSlot);
    if (own === undefined) return;
    const resolution = runtime.tick(
      this.world,
      {
        applyMove: (slot, eid, x, y, queued) => this.applyMove(slot, eid, x, y, queued),
        applyDepth: (slot, eid, depthM) => this.applyDepth(slot, eid, depthM),
        applySilent: (slot, eid, active) => this.applySilent(slot, eid, active),
        applyPing: (slot, eid) => this.applyPing(slot, eid),
      },
      own,
      // Pre-bound to the player's own slot: the runtime may ask what *this*
      // observer resolved and has no way to ask about anybody else.
      (eid) => this.echo.tierFor(runtime.definition.playerSlot, eid)
    );
    if (resolution !== null) this.missionResult = resolution;
  }

  /** Public map data: where the nodule fields are. Sent once on join. */
  get resourceNodes(): readonly ResourceNodeInfo[] {
    return this.nodes;
  }

  /**
   * What the roster asked for and what the map actually held, per species.
   *
   * For the balance harness, and it is the measurement #578 was invisible
   * without: the report printed Drift Health but never the complement, so a
   * third of the baseline's matches ran with no colossus and nothing said so.
   * A shortfall here is a statement about the map rather than a fault — a map
   * with no vent ground never seeded an Ashgrazer and should not pretend to —
   * which is precisely why it wants printing rather than asserting.
   */
  get faunaComplement(): readonly { species: FaunaSpecies; asked: number; seeded: number }[] {
    return FAUNA_ROSTER.map(({ species, count }) => ({
      species,
      asked: count,
      seeded: this.complement.get(species) ?? 0,
    }));
  }

  /**
   * Nodule fields are map data, like terrain: a home field off each starting
   * corner, and two richer contested fields in the middle — the expansion
   * bait every C&C map is built around.
   */
  private seedResourceNodes(): void {
    for (const node of this.map.resources) {
      const amount =
        node.amount ??
        (node.kind === ResourceKind.ResonanceCrystal ? CRYSTAL.FIELD_STARTING_AMOUNT : undefined);
      this.addNode(node.x, node.y, amount, node.kind);
    }
  }

  /**
   * Hazards from the map's authored sites.
   *
   * Staggered so a map's vents do not all erupt on the same beat, which would
   * turn a hazard into a metronome the player tunes out. The offset is derived
   * from the site's own position rather than drawn from the RNG: hazard timing
   * has to be identical across a replay, and position is already identical.
   */
  private seedHazards(): void {
    let id = 1;
    for (const site of this.map.hazards) {
      if (!isSimulated(site.kind)) continue;
      const stagger = (Math.abs(Math.round(site.x * 7 + site.y * 13)) % 97) / 97;
      this.world.hazards.push({
        id: id++,
        kind: site.kind,
        x: site.x,
        y: site.y,
        radiusM: site.radiusM,
        // Kelp has no cycle to wait in — it begins the match gripping
        // (docs/hazards.md §4). Everything else telegraphs first.
        phase: isPermanent(site.kind) ? HazardPhase.Active : HazardPhase.Dormant,
        // Every bed starts with its canopy whole (docs/systems-flora.md §1).
        // Full crop is the no-op case throughout — no PF modifier is listed
        // and the grip is the one §4 always specified — so a map nobody
        // harvests behaves exactly as it did before beds had a crop.
        crop: 1,
        // Scaled by *this kind's* dormancy, not the eruption's. `elapsedS` is
        // wait already spent, so a site with a large stagger fires sooner —
        // and a span borrowed from another kind bunches every hazard of the
        // longer-waiting kinds into the back half of their own cycle.
        elapsedS: stagger * dormantSecondsFor(site.kind),
        // Authored in degrees and stored in radians: docs/hazards.md §8 makes a
        // current's direction map data, and the per-tick path should never pay
        // for the conversion. A site that forgets it does not flow at all,
        // which maps.test.ts refuses rather than silently shipping still water.
        flowRad: ((site.flowDeg ?? 0) * Math.PI) / 180,
        stabilisedS: 0,
        suppressedS: 0,
        burnedS: 0,
        sownRemaining: 0,
      });
    }
  }

  /**
   * Bloom-share gardens — docs/systems-flora.md §2.
   *
   * A bloom node **is a bed**: the map authors a position, and what stands
   * there is an ordinary kelp field with a standing crop, seeded here rather
   * than in the map literal so one authored fact stays one fact. That fold is
   * the whole of wave 6 — it is what gives a garden all three readings of a
   * crop at once (it masks, it grips, it pays) instead of a payout with no
   * supply behind it, and it is why a raid on a Commune plateau now takes
   * their income and their concealment in the same act.
   *
   * The bed's radius is the tend radius, because a garden is the ground you
   * stand in: any wider and there would be kelp no hull could earn from, any
   * narrower and the share would be paid from outside the field paying it.
   *
   * `world.blooms` holds the beds themselves, not copies — `bloomShareSystem`
   * has to read the crop the cutter and the reactor write, or "the interest,
   * never the principal" is a rule about a different object.
   */
  private seedBlooms(): void {
    let id = this.world.hazards.length + 1;
    for (const bloom of this.map.blooms ?? []) {
      const bed: Hazard = {
        id: id++,
        kind: 'kelp-entanglement',
        x: bloom.x,
        y: bloom.y,
        radiusM: BLOOM_SHARE.TEND_RADIUS_M,
        // Kelp begins the match gripping, and every bed begins it whole
        // (docs/systems-flora.md §1) — so a garden nobody has cut masks at
        // its biome's own figure and lists no PF modifier at all.
        phase: HazardPhase.Active,
        crop: 1,
        elapsedS: 0,
        flowRad: 0,
        stabilisedS: 0,
        suppressedS: 0,
        burnedS: 0,
        sownRemaining: 0,
      };
      this.world.hazards.push(bed);
      this.world.blooms.push(bed);
    }
  }

  /**
   * Populate the Drift.
   *
   * Placed deterministically from the seeded RNG, and capped hard at
   * `DRIFT.MAX_POPULATION`. Fauna are entities in the Echo pass, which owns a
   * 2 ms budget #90 had to fight for, so the cap is what turns "should be fine"
   * into a guarantee — the PR reports the measured cost at the cap.
   *
   * Species are placed where the doc puts them: Ashgrazers on the vent fields
   * they feed in, Draymaws in open mid-water where they can shadow industry,
   * and a single Sounder, because there is only ever one colossus.
   *
   * That last one is the reason megafauna are placed by search when the draws
   * miss (#578). A herd asks for sixteen placements and a shortfall of one is
   * a herd of fifteen; the colossus asks for one, so a shortfall is the whole
   * animal, and twelve draws against the 7.4% of the Ventfront Divide a
   * Sounder may stand on lost it in a third of matches. The rarest animal had
   * the least robust placement, which is exactly backwards.
   */
  private seedFauna(): void {
    const rng = this.world.rng.fork('drift');
    for (const { species, count } of FAUNA_ROSTER) {
      for (let i = 0; i < count; i++) {
        if (countFauna(this.world) >= DRIFT.MAX_POPULATION) break;
        const placed = MEGAFAUNA.has(species)
          ? this.placeMegafauna(species, rng)
          : this.placeFauna(species, rng);
        if (!placed) continue;
        // What the map proved it can hold, which is what the Drift refills
        // toward. Counted from placements rather than from the roster's ask:
        // a map with no vent ground never seeded an Ashgrazer, and a Drift
        // that spent every later attempt trying to put one there would be
        // refilling a herd this water has never held.
        this.complement.set(species, (this.complement.get(species) ?? 0) + 1);
      }
    }
    rebuildPropagation(this.world);
  }

  /**
   * Put one creature on ground it belongs on, or fail having placed nothing.
   *
   * Shared by the seeding and by `repopulate`, because the rules about where a
   * creature may be are the same whether the match is two seconds or twenty
   * minutes old: habitat, working depth, a living region, and never on
   * somebody's doorstep. A handful of tries; if the map has no such ground,
   * the herd simply does not appear there.
   */
  private placeFauna(
    species: FaunaSpecies,
    rng: Rng,
    admitted?: (x: number, y: number) => boolean
  ): boolean {
    const { widthM, heightM } = this.world.terrain;
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = rng.range(400, widthM - 400);
      const y = rng.range(400, heightM - 400);
      if (!this.faunaGroundAdmits(species, x, y)) continue;
      // Last, and only for ground that has already passed every other test:
      // the caller's rule may spend a draw, and a draw spent on water the
      // species could never have lived in would make how fast a region breeds
      // depend on how much of the map is wrong for it.
      if (admitted !== undefined && !admitted(x, y)) continue;
      spawnFauna(this.world, { species, x, y });
      return true;
    }
    return false;
  }

  /**
   * Whether a point is ground this species may stand on.
   *
   * Split out of `placeFauna` for `placeMegafauna`, which walks these same
   * four tests over the map rather than throwing darts at them. One copy,
   * because a search that admitted ground the sampler rejects would place a
   * colossus somewhere the roster's own rules say it cannot be.
   */
  private faunaGroundAdmits(species: FaunaSpecies, x: number, y: number): boolean {
    const wantVein = species === FaunaSpecies.Ashgrazer;
    const onVein = this.world.terrain.biomeAt(x, y) === Biome.ThermalVein;
    if (wantVein !== onVein) return false;
    if (!this.world.drift.spawnsAllowed(x, y)) return false;
    // Deep enough for the species to live there. A Sounder seeded over a
    // 700 m plateau would be a colossus in a puddle, and the roster's
    // habitats are the reason the depths exist at all (bestiary.md §4).
    // Against the band the species rests in *here*: a map that re-homed
    // its Tetherjelly to the canopy has ground for it at 300 m.
    if (this.world.terrain.floorAt(x, y) < ambientBandFor(this.world, species).workingDepthM) {
      return false;
    }
    // Never on someone's doorstep: see DRIFT.SPAWN_EXCLUSION_M.
    return !this.map.spawns.some((s) => Math.hypot(s.x - x, s.y - y) < DRIFT.SPAWN_EXCLUSION_M);
  }

  /**
   * Place the colossus, and fail only if the map has nowhere to put one.
   *
   * `docs/bestiary.md` §4 holds exactly one Megafauna row, and the roster asks
   * for exactly one placement — so for this species alone, "the draws missed"
   * and "the water cannot hold it" are the same outcome from the outside, and
   * a third of Ventfront Divide matches were played without the map's largest
   * acoustic event because of the difference (#578).
   *
   * The draws come first, so every seed that already lands a Sounder lands it
   * in the same water it did before; the walk is the fallback, and it is what
   * makes "there is only ever one colossus" true by construction rather than
   * by luck. Absence now means the map genuinely admits nowhere, which is a
   * statement about the map that a test can hold it to.
   *
   * Cost is a grid of terrain probes, paid once per match at seed time on the
   * ~30% of seeds that need it, and never on the 60 Hz path — `repopulate`
   * keeps sampling deliberately, because its rate test is *meant* to spend a
   * draw so that Strained water breeds more slowly rather than searching
   * harder inside itself.
   */
  private placeMegafauna(species: FaunaSpecies, rng: Rng): boolean {
    if (this.placeFauna(species, rng)) return true;

    const { widthM, heightM } = this.world.terrain;
    const admissible: { x: number; y: number }[] = [];
    for (let y = 400; y <= heightM - 400; y += MEGAFAUNA_SEARCH_STEP_M) {
      for (let x = 400; x <= widthM - 400; x += MEGAFAUNA_SEARCH_STEP_M) {
        if (this.faunaGroundAdmits(species, x, y)) admissible.push({ x, y });
      }
    }
    if (admissible.length === 0) return false;

    // Its own stream, for the reason `repopulate` gives for having one: the
    // twelve draws above are spent either way, so a search that drew from the
    // shared stream would shift every species placed after it. Off this one,
    // a seed that used to miss keeps every Rasp, shoal and cluster exactly
    // where it had them and gains a colossus, which is the whole delta.
    const pick = admissible[this.world.rng.fork('drift-megafauna').int(admissible.length)]!;
    spawnFauna(this.world, { species, x: pick.x, y: pick.y });
    return true;
  }

  private addNode(x: number, y: number, amount?: number, kind = ResourceKind.Nodule): void {
    const eid = spawnResourceNode(this.world, x, y, amount, kind);
    this.nodes.push({
      id: eid,
      x,
      y,
      kind,
      depth: Position.depth[eid]!,
      initialAmount: ResourceNode.remaining[eid]!,
    });
  }

  addPlayer(slot: number, faction: Faction): void {
    this.recorder?.addPlayer(slot, faction);
    if (!this.slots.includes(slot)) this.slots.push(slot);
    this.factionBySlot.set(slot, faction);
    economyFor(this.world, slot);
    this.spawnStartingBase(slot, faction);
  }

  removePlayer(slot: number): void {
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }

  /**
   * The classic opening: a Bastion and a Foundry pre-built, a harvester
   * already rolling toward the home field, and a token escort. Everything
   * else is earned.
   */
  private spawnStartingBase(slot: number, faction: Faction): void {
    // A map's spawn list *is* its player count. A slot past the end has
    // nowhere legal to start, so it gets no base rather than one placed by
    // guesswork somewhere off the authored ground.
    const spawn = this.map.spawns[slot];
    if (spawn === undefined) return;

    const baseX = spawn.x;
    const baseY = spawn.y;

    // The escort deploys *perpendicular* to the Foundry and spreads *along*
    // it — the axis the Foundry occupies is the one with room, and the axis it
    // does not is where a hull can sit clear of both footprints.
    //
    // Derived from the authored offset rather than from which half of the map
    // the slot is in, which is what the old corner arithmetic did and what
    // stops being meaningful on a map that is not a square.
    const length = Math.hypot(spawn.foundryOffsetX, spawn.foundryOffsetY) || 1;
    const alongX = spawn.foundryOffsetX / length;
    const alongY = spawn.foundryOffsetY / length;
    let awayX = -alongY;
    let awayY = alongX;
    // ...and point that perpendicular into the map rather than at the wall.
    if (awayX * (this.map.widthM / 2 - baseX) + awayY * (this.map.heightM / 2 - baseY) < 0) {
      awayX = -awayX;
      awayY = -awayY;
    }

    spawnStructure(this.world, {
      kind: StructureKind.Bastion,
      slot,
      faction,
      x: baseX,
      y: baseY,
      prebuilt: true,
    });
    spawnStructure(this.world, {
      kind: StructureKind.Foundry,
      slot,
      faction,
      x: baseX + spawn.foundryOffsetX,
      y: baseY + spawn.foundryOffsetY,
      prebuilt: true,
    });

    // The navy's own kit, centred on the perpendicular whatever its length,
    // so a navy that opens with four hulls one day spreads them the same way.
    const escort = OPENING_ESCORT[faction];
    escort.forEach((kind, i) => {
      const along = (i - (escort.length - 1) / 2) * 180;
      spawnUnit(this.world, {
        kind,
        slot,
        faction,
        x: baseX + alongX * along + awayX * 350,
        y: baseY + alongY * along + awayY * 350,
      });
    });

    const harvester = spawnUnit(this.world, {
      kind: UnitKind.Harvester,
      slot,
      faction,
      x: baseX + awayX * 250,
      y: baseY + awayY * 250,
    });
    // Income from second zero: the harvester self-assigns the nearest field.
    Harvester.mode[harvester] = HarvestMode.ToNode;
    Harvester.idleReason[harvester] = 0;
  }

  // --- Commands ------------------------------------------------------------

  /** Commands are validated against ownership here; never trust the client. */
  private owns(slot: number, eid: number): boolean {
    // A hull in a hold is still the player's and still counts against their
    // berths, but it takes no order of its own: it is not in the water, and
    // the one thing that reaches it is its carrier's disembark
    // (docs/systems-echo.md §3; systems/carrying.ts).
    return (
      hasComponent(this.world, Owner, eid) &&
      Owner.slot[eid] === slot &&
      !hasComponent(this.world, Carried, eid)
    );
  }

  /**
   * True when the running mission withholds `ability` from this slot.
   *
   * Always false in a skirmish, so the gates on the order methods cost one
   * null check there. The client is told which abilities are locked, and why,
   * before it can reach for them — a refusal here is the server keeping its
   * word rather than the player's first news of the rule.
   */
  private missionDenies(slot: number, ability: MissionAbility): boolean {
    return this.missionRuntime?.denies(slot, ability) === true;
  }

  orderMove(slot: number, eid: number, x: number, y: number, queued = false): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'move',
      slot,
      unit: this.localId(eid),
      x,
      y,
      queued,
    });
    // A mission may be holding this hull still — the court's tenders do not
    // move before they are loaded, and do not move at all without an escort
    // close enough to hear for them. Refused after the recording, like every
    // other refusal on this path.
    if (this.missionRuntime?.holdsMovement(slot, eid) === true) return;
    this.applyMove(slot, eid, x, y, queued);
  }

  /**
   * Attack-move (#435; docs/ui-ux.md §9): go there, and fight whatever you
   * meet on the way. The order a force advances into unheard water on.
   */
  orderAttackMove(slot: number, eid: number, x: number, y: number, queued = false): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'attackMove',
      slot,
      unit: this.localId(eid),
      x,
      y,
      queued,
    });
    if (this.missionRuntime?.holdsMovement(slot, eid) === true) return;
    if (this.missionDenies(slot, 'weapons')) {
      // Weapons struck: the order falls through to the move it can still be,
      // exactly as a refused attack does at the client (docs/ui-ux.md §7).
      this.applyMove(slot, eid, x, y, queued);
      return;
    }
    if (!this.owns(slot, eid) || !hasComponent(this.world, MoveOrder, eid)) return;
    if (!hasComponent(this.world, Weapon, eid)) {
      // A hull with nothing to fight with can only go there.
      this.applyMove(slot, eid, x, y, queued);
      return;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    x = this.world.terrain.clampXM(x);
    y = this.world.terrain.clampYM(y);

    if (queued) {
      enqueue(this.world, eid, { kind: 'attackMove', x, y });
      return;
    }
    clearQueue(this.world, eid);
    this.world.paths.delete(eid);
    MoveOrder.x[eid] = x;
    MoveOrder.y[eid] = y;
    MoveOrder.active[eid] = 1;
    Posture.engage[eid] = 1;
    Posture.engageX[eid] = x;
    Posture.engageY[eid] = y;
    Posture.hold[eid] = 0;
    Weapon.orderedTargetEid[eid] = 0;
    if (hasComponent(this.world, Harvester, eid)) {
      Harvester.mode[eid] = HarvestMode.Idle;
      Harvester.idleReason[eid] = 0;
    }
    cancelEmbark(this.world, eid);
  }

  /**
   * Stop: drop the plan, the route, the chase and the posture, and stand
   * where you are. Depth is left alone — a depth order is a commitment
   * (docs/systems-depth.md §2), and stopping the hull's course is not the
   * same decision as stopping its climb.
   */
  orderStop(slot: number, eid: number): void {
    this.recordCommand({ tick: this.world.tick, type: 'stop', slot, unit: this.localId(eid) });
    if (!this.owns(slot, eid) || !hasComponent(this.world, MoveOrder, eid)) return;
    clearQueue(this.world, eid);
    this.world.paths.delete(eid);
    MoveOrder.active[eid] = 0;
    Posture.engage[eid] = 0;
    Posture.hold[eid] = 0;
    if (hasComponent(this.world, Weapon, eid)) Weapon.orderedTargetEid[eid] = 0;
    if (hasComponent(this.world, Harvester, eid)) {
      Harvester.mode[eid] = HarvestMode.Idle;
      Harvester.idleReason[eid] = 0;
    }
    cancelEmbark(this.world, eid);
  }

  /**
   * Hold position: fire at what comes into range, chase nothing, go nowhere.
   * Any move order releases it. An ordered target is kept — a held hull told
   * to attack a contact shoots it if it comes close, which is the whole use.
   */
  orderHold(slot: number, eid: number, active: boolean): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'hold',
      slot,
      unit: this.localId(eid),
      active,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, MoveOrder, eid)) return;
    Posture.hold[eid] = active ? 1 : 0;
    if (!active) return;
    clearQueue(this.world, eid);
    this.world.paths.delete(eid);
    MoveOrder.active[eid] = 0;
    Posture.engage[eid] = 0;
    if (hasComponent(this.world, Harvester, eid)) {
      Harvester.mode[eid] = HarvestMode.Idle;
      Harvester.idleReason[eid] = 0;
    }
    cancelEmbark(this.world, eid);
  }

  /**
   * A yard's rally point: where every hull it launches goes first. Only a
   * structure that produces anything takes one; the rest have nothing to
   * send. Recorded by structure, like `produce`.
   */
  setRally(slot: number, structureEid: number, x: number, y: number): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'rally',
      slot,
      structure: this.localId(structureEid),
      x,
      y,
    });
    if (!this.owns(slot, structureEid)) return;
    if (!hasComponent(this.world, Structure, structureEid)) return;
    if (PRODUCIBLE[Structure.kind[structureEid] as StructureKind] === undefined) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.world.rallies.set(structureEid, {
      x: this.world.terrain.clampXM(x),
      y: this.world.terrain.clampYM(y),
    });
  }

  /**
   * The unrecorded half of `orderMove`, for the mission runtime.
   *
   * A mission's beats are re-issued on playback, because the runtime lives
   * inside `step()` rather than beside it — so recording them as commands too
   * would apply every one of them twice, and none of these is idempotent.
   * Splitting the method is what makes that mistake unavailable: the runtime is
   * handed a sink of `apply*` and has no path to the recorder at all.
   */
  private applyMove(slot: number, eid: number, x: number, y: number, queued: boolean): void {
    if (!this.owns(slot, eid) || !hasComponent(this.world, MoveOrder, eid)) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    // Clamped rather than rejected, unlike orderDepth. A click past the edge
    // of the map is a legible instruction — go as far that way as the water
    // goes — where a depth below the sea floor names a place that is not
    // there. Clamping here also keeps a move order from being the one way to
    // walk a hull off the map under its own power.
    // Runs after recordCommand, so a replay re-derives the clamp rather than
    // inheriting it, and the validation path is exercised on playback too.
    x = this.world.terrain.clampXM(x);
    y = this.world.terrain.clampYM(y);

    if (queued) {
      enqueue(this.world, eid, { kind: 'move', x, y });
      return;
    }

    // An unqueued order replaces the whole plan, not just its current leg.
    clearQueue(this.world, eid);
    this.world.paths.delete(eid);
    MoveOrder.x[eid] = x;
    MoveOrder.y[eid] = y;
    MoveOrder.active[eid] = 1;
    // A manual move overrides standing behaviour: stop chasing, stop the
    // loop, and drop the posture — a plain move is neither an attack-move
    // nor a hold.
    Posture.engage[eid] = 0;
    Posture.hold[eid] = 0;
    if (hasComponent(this.world, Weapon, eid)) Weapon.orderedTargetEid[eid] = 0;
    if (hasComponent(this.world, Harvester, eid)) {
      Harvester.mode[eid] = HarvestMode.Idle;
      // Chosen, not stalled: a move order is the player parking the hull.
      Harvester.idleReason[eid] = 0;
    }
    cancelEmbark(this.world, eid);
  }

  /**
   * Board a friendly transport — docs/systems-echo.md §3, "A hull in a hold".
   *
   * Given to the hull, not the carrier: the hull closes on its carrier and
   * boards when it gets there (systems/carrying.ts), so a Freighter can load
   * while it moves and a hull that cannot reach it never pretends to. The
   * carrier is an own entity id, never a contact handle — a player boards
   * their own hulls and nobody else's. Refused for a hull that cannot be
   * carried (a hold, a structure, a hull already aboard) and for a hold
   * with no room *now*; a hold that fills on the way refuses at the door.
   * Recorded before any of that, like every order.
   */
  orderEmbark(slot: number, eid: number, carrierEid: number): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'embark',
      slot,
      unit: this.localId(eid),
      carrier: this.localId(carrierEid),
    });
    if (this.missionRuntime?.holdsMovement(slot, eid) === true) return;
    if (!this.owns(slot, eid) || !this.owns(slot, carrierEid)) return;
    if (!canBoard(this.world, carrierEid, eid)) return;

    // Replaces the plan the way a move does: the harvest loop, the chase,
    // the posture and the queue all end, and the closing begins.
    clearQueue(this.world, eid);
    this.world.paths.delete(eid);
    Posture.engage[eid] = 0;
    Posture.hold[eid] = 0;
    if (hasComponent(this.world, Weapon, eid)) Weapon.orderedTargetEid[eid] = 0;
    if (hasComponent(this.world, Harvester, eid)) {
      Harvester.mode[eid] = HarvestMode.Idle;
      Harvester.idleReason[eid] = 0;
    }
    addComponent(this.world, Embarking, eid);
    Embarking.carrier[eid] = carrierEid;
  }

  /**
   * Land a transport's whole hold around it, at its depth. Given to the
   * carrier. What lands lands with no orders — and, from an Antiphon, with
   * the Spire's grant for twenty seconds (docs/units.md). Not a movement
   * order, so a mission's movement hold does not refuse it: a held carrier
   * may still open its doors.
   */
  orderDisembark(slot: number, carrierEid: number): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'disembark',
      slot,
      unit: this.localId(carrierEid),
    });
    if (!this.owns(slot, carrierEid) || !hasComponent(this.world, Hold, carrierEid)) return;
    if (!hasComponent(this.world, Position, carrierEid)) return;
    landHold(this.world, carrierEid);
  }

  /** Attack a contact the player has actually heard, by its opaque handle. */
  orderAttackContact(slot: number, eid: number, contactHandle: number, queued = false): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'attack',
      slot,
      unit: this.localId(eid),
      contact: contactHandle,
      queued,
    });
    if (this.missionDenies(slot, 'weapons')) return;
    if (!this.owns(slot, eid) || !hasComponent(this.world, Weapon, eid)) return;
    const target = this.echo.entityForHandle(slot, contactHandle);
    if (target === undefined) return;
    if (!hasComponent(this.world, Owner, target) || Owner.slot[target] === slot) return;
    if (!hasComponent(this.world, Health, target) || Health.hp[target]! <= 0) return;
    // Deliberately NOT refused here when the target is ordnance with no hull to
    // shoot off. That check lives in combat.ts's `targetAlive`, because
    // refusing at the order leaks: this path returns before the plan is
    // touched, so accepting and refusing leave the player's own hull in
    // visibly different states and `queuedOrders` reports which. That answered
    // "is this a mine or a decoy?" for free, two tiers before the Echo Layer
    // is willing to say. The order is accepted like any other; the gun then
    // finds the target is not one it can engage.

    if (queued) {
      // The anchor is where the contact was *reported*, which is what the
      // player just resolved and acted on — the ghost at Tier 2, the scattered
      // bearing in the Fields — and never the truth: `queuedOrders` draws this
      // point back to the client, so anchoring at `Position` would hand a
      // player who queued an attack on a lie the one thing the lie withheld.
      // It is never refreshed afterwards, so the drawn plan cannot become a
      // live feed of an enemy position either. A handle can outlive the
      // resolution that issued it (a ghost marker the player attacks after
      // the contact went silent); with nothing reported this pass the anchor
      // falls back to the truth, which is the pre-existing behaviour and a
      // smaller disclosure than it looks — the hull is being ordered there.
      const shown = this.echo.firingSolution(slot, target);
      enqueue(this.world, eid, {
        kind: 'attack',
        x: shown?.x ?? Position.x[target]!,
        y: shown?.y ?? Position.y[target]!,
        target,
      });
      return;
    }
    clearQueue(this.world, eid);
    this.world.paths.delete(eid);
    Weapon.orderedTargetEid[eid] = target;
    cancelEmbark(this.world, eid);
  }

  /**
   * Launch a torpedo at a contact the player has heard.
   *
   * By opaque handle, exactly like `orderAttackContact`, and for the same
   * reason: the handle is the proof that this slot resolved this emitter. A
   * client cannot guess its way to a firing solution on something it never
   * detected, which is the whole of the acoustic fog of war applied to the
   * weapon that would most reward cheating it.
   *
   * Returns the ordnance entity, or 0 when the shot is refused — the room
   * ignores the result, the tests do not.
   */
  orderLaunchTorpedo(slot: number, eid: number, contactHandle: number): number {
    this.recordCommand({
      tick: this.world.tick,
      type: 'torpedo',
      slot,
      unit: this.localId(eid),
      contact: contactHandle,
    });
    if (this.missionDenies(slot, 'torpedoes')) return 0;
    if (!this.owns(slot, eid) || !hasComponent(this.world, Magazine, eid)) return 0;
    const target = this.echo.entityForHandle(slot, contactHandle);
    if (target === undefined) return 0;
    if (!hasComponent(this.world, Owner, target) || Owner.slot[target] === slot) return 0;
    if (!hasComponent(this.world, Health, target) || Health.hp[target]! <= 0) return 0;

    // docs/systems-combat.md §7 — resolution tier is the firing solution.
    //
    // Below Tier 2 there is no launch: a Tier-1 contact is a directionless
    // smudge reported at the *listener's* own position, so a torpedo aimed at
    // it would be aimed at your own hull. The gate is not a balance choice, it
    // is the only honest reading of what the player was told.
    //
    // At Tier 2 the aim point is the blurred ghost, which lies by up to 15% of
    // range. The torpedo swims at the lie and the seeker has the run to find
    // the truth. At Tier 3 and above the solution is exact.
    const solution = this.echo.firingSolution(slot, target);
    if (solution === undefined || solution.tier < ResolutionTier.Bearing) return 0;

    return launchTorpedo(this.world, eid, solution.x, solution.y);
  }

  /**
   * Drop a noisemaker — docs/systems-combat.md §5.
   *
   * No target and no handle, unlike a launch: a decoy is a reflex, aimed at
   * nothing and thrown behind you. It needs no information gate for the same
   * reason, since it reveals only where you already were.
   *
   * Returns the decoy entity, or 0 when the suite is still cold.
   */
  deployNoisemaker(slot: number, eid: number): number {
    this.recordCommand({
      tick: this.world.tick,
      type: 'noisemaker',
      slot,
      unit: this.localId(eid),
    });
    if (this.missionDenies(slot, 'noisemakers')) return 0;
    if (!this.owns(slot, eid)) return 0;
    return deployNoisemaker(this.world, eid);
  }

  /**
   * Lay one decoy from a hull's magazine — the screen, not the countermeasure
   * (docs/systems-combat.md §5, "A screen, laid").
   *
   * Behind the same mission lock as the countermeasure, and deliberately: a
   * mission that has taken a player's decoys away has taken the emitter away,
   * and the second order is the same emitter used differently.
   *
   * Returns the decoy, or 0 when the magazine is empty or the interval is
   * still running.
   */
  layDecoy(slot: number, eid: number): number {
    this.recordCommand({
      tick: this.world.tick,
      type: 'layDecoy',
      slot,
      unit: this.localId(eid),
    });
    if (this.missionDenies(slot, 'noisemakers')) return 0;
    if (!this.owns(slot, eid)) return 0;
    return layDecoy(this.world, eid);
  }

  /**
   * Lay a mine at the hull's own position — docs/systems-combat.md §6.
   *
   * No target and no handle, like a decoy: a mine is aimed at nobody. What it
   * costs is the ten seconds of construction-grade noise the laying hull pays
   * while it arms, which is the counter-play the doc asks for — you cannot see
   * a minefield, but you can hear one being built.
   *
   * Returns the mine entity, or 0 when the player is at their cap or the hull
   * is still laying the last one.
   */
  layMine(slot: number, eid: number): number {
    this.recordCommand({
      tick: this.world.tick,
      type: 'mine',
      slot,
      unit: this.localId(eid),
    });
    if (this.missionDenies(slot, 'mines')) return 0;
    if (!this.owns(slot, eid)) return 0;
    return layMine(this.world, eid, mineCapFor(this.factionOf(slot)));
  }

  /**
   * Drop a depth charge set to detonate at `depthM` — docs/systems-combat.md §8.
   *
   * A depth and no target: you are bombing water, not a contact, so there is
   * nothing to have resolved first. The information gate arrives sideways
   * instead — a contact's depth is only sent at Tier 3 and above, so a
   * commander who has not classified what is under them is guessing at the one
   * number the weapon needs.
   *
   * The depth is refused rather than clamped when it names water that is not
   * there, matching `orderDepth`: a client asking for the impossible is told
   * no, not quietly given something else.
   */
  orderDepthCharge(slot: number, eid: number, depthM: number): number {
    this.recordCommand({
      tick: this.world.tick,
      type: 'depthcharge',
      slot,
      unit: this.localId(eid),
      depth: depthM,
    });
    if (this.missionDenies(slot, 'depthCharges')) return 0;
    if (!this.owns(slot, eid)) return 0;
    if (!Number.isFinite(depthM)) return 0;
    if (depthM < DEPTH.MIN_M || depthM > DEPTH.MAX_M) return 0;
    // It must cross a band. §8 calls this "a pattern dropped (or floated) into
    // the band above or below", and the fall is the weapon's entire cost — the
    // defender hears it coming and has that time to move.
    //
    // Without this a charge set to the launcher's own depth arrived on the tick
    // it was dropped: `blast` skips the owner's own slot, so it was a free,
    // instant, uncounterable 200-damage area attack centred on a hull that
    // could not be hurt by it. Refused rather than clamped, matching orderDepth.
    if (depthBandFor(depthM) === depthBandFor(Position.depth[eid]!)) return 0;
    return dropDepthCharge(this.world, eid, depthM);
  }

  /** Send a harvester to a specific nodule field. */
  orderHarvest(slot: number, eid: number, nodeEid: number, queued = false): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'harvest',
      slot,
      unit: this.localId(eid),
      node: this.localId(nodeEid),
      queued,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, Harvester, eid)) return;
    if (!hasComponent(this.world, ResourceNode, nodeEid)) return;

    if (queued) {
      enqueue(this.world, eid, {
        kind: 'harvest',
        x: Position.x[nodeEid]!,
        y: Position.y[nodeEid]!,
        node: nodeEid,
      });
      return;
    }
    clearQueue(this.world, eid);
    this.world.paths.delete(eid);
    Harvester.nodeEid[eid] = nodeEid;
    Harvester.mode[eid] = HarvestMode.ToNode;
    Harvester.idleReason[eid] = 0;
    cancelEmbark(this.world, eid);
  }

  /** docs/economy.md §3 — how loud am I willing to be paid. */
  setThrottle(slot: number, eid: number, throttle: HarvestThrottle): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'throttle',
      slot,
      unit: this.localId(eid),
      throttle,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, Harvester, eid)) return;
    if (!(throttle in HarvestThrottle)) return;
    Harvester.throttle[eid] = throttle;
  }

  setSilentRunning(slot: number, eid: number, active: boolean): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'silent',
      slot,
      unit: this.localId(eid),
      active,
    });
    this.applySilent(slot, eid, active);
  }

  /** The unrecorded half of `setSilentRunning` — see `applyMove`. */
  private applySilent(slot: number, eid: number, active: boolean): void {
    if (!this.owns(slot, eid) || !hasComponent(this.world, SilentRunning, eid)) return;
    SilentRunning.active[eid] = active ? 1 : 0;
    // Exclusive postures (docs/systems-echo.md §6): a hull told to run silent
    // is being told to run.
    if (active) EngineOff.active[eid] = 0;
  }

  /** Cut or restart the drive. docs/systems-echo.md §6, "Engine off". */
  setEngineOff(slot: number, eid: number, active: boolean): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'engineOff',
      slot,
      unit: this.localId(eid),
      active,
    });
    this.applyEngineOff(slot, eid, active);
  }

  /** The unrecorded half of `setEngineOff` — see `applyMove`. */
  private applyEngineOff(slot: number, eid: number, active: boolean): void {
    if (!this.owns(slot, eid) || !hasComponent(this.world, EngineOff, eid)) return;
    // The third posture displaces the second rather than stacking with it.
    //
    // The move order is deliberately **kept**. Movement multiplies the hull's
    // speed by its `glideSpeedFraction`, which is zero for everything but the
    // Glider, so an ordinary hull stops dead without the order having to be
    // torn up — and restarting its drive resumes the course it was on, which
    // is what a player who cut the engine to listen expects. Dropping the
    // order here would also have left the one hull built to coast with nothing
    // to coast along, which is how it was found.
    EngineOff.active[eid] = active ? 1 : 0;
    if (active) SilentRunning.active[eid] = 0;
  }

  /**
   * Order a depth change. docs/systems-depth.md §2.
   *
   * Deliberately absent: any check that the unit is *rated* for the depth it
   * is being sent to. Renting depth you cannot survive is the mechanic — the
   * pressure system bills for it — so the order is accepted and the hull pays.
   *
   * Returns false when the order is refused, so the caller can tell "rejected"
   * from "accepted"; the room ignores the result, but the tests do not.
   */
  orderDepth(slot: number, eid: number, depthM: number): boolean {
    this.recordCommand({
      tick: this.world.tick,
      type: 'depth',
      slot,
      unit: this.localId(eid),
      depth: depthM,
    });
    // The same hold as `orderMove`. Without it the vertical half of the route
    // is flyable while the tender is still being loaded and with no escort in
    // range — and the run north is a climb, so that is most of the journey.
    if (this.missionRuntime?.holdsMovement(slot, eid) === true) return false;
    return this.applyDepth(slot, eid, depthM);
  }

  /** The unrecorded half of `orderDepth` — see `applyMove`. */
  private applyDepth(slot: number, eid: number, depthM: number): boolean {
    if (!this.owns(slot, eid) || !hasComponent(this.world, DepthOrder, eid)) return false;
    if (!Number.isFinite(depthM)) return false;
    // Rejected rather than clamped: a client asking for the impossible is told
    // no, instead of quietly being given something it did not ask for.
    if (depthM < DEPTH.MIN_M || depthM > DEPTH.MAX_M) return false;

    DepthOrder.targetM[eid] = depthM;
    DepthOrder.active[eid] = 1;
    // A manual depth order replaces the floor-following standing order: the
    // newer instruction is the player's current mind (docs/systems-depth.md §2).
    DepthOrder.follow[eid] = 0;
    // Diving is not something you do quietly, for the same reason pinging is
    // not: the descent itself is the noise. Ascending keeps its silence.
    if (depthM > Position.depth[eid]!) SilentRunning.active[eid] = 0;
    return true;
  }

  /**
   * The standing order — docs/systems-depth.md §2, "Steering along the
   * ground". This only arms or disarms the mode; the depth system owns the
   * per-tick retargeting, the PR disengage, and the dive loudness. Validated
   * like `orderDepth`, recorded like every order, and refused under a mission
   * movement hold for the same reason a dive is: a hold that let a hull
   * *drift* down a slope would not be a hold.
   */
  orderFollowFloor(slot: number, eid: number, active: boolean): boolean {
    this.recordCommand({
      tick: this.world.tick,
      type: 'followFloor',
      slot,
      unit: this.localId(eid),
      active,
    });
    if (this.missionRuntime?.holdsMovement(slot, eid) === true) return false;
    if (!this.owns(slot, eid) || !hasComponent(this.world, DepthOrder, eid)) return false;

    const was = DepthOrder.follow[eid] === 1;
    DepthOrder.follow[eid] = active ? 1 : 0;
    // Disengaging holds the hull where it is — but only cancels a leg the
    // mode itself ordered, never a manual order already in flight.
    if (!active && was) DepthOrder.active[eid] = 0;
    return true;
  }

  /** The big red button. docs/systems-echo.md §5. */
  activeSonar(slot: number, eid: number): void {
    this.recordCommand({ tick: this.world.tick, type: 'ping', slot, unit: this.localId(eid) });
    // A mission may withhold the array entirely (docs/campaign.md §10 withholds
    // active sonar until mission 3). Refused after the recording, like every
    // other refusal on this path, so a build that later stops refusing shows up
    // as a replay divergence rather than as silence.
    if (this.missionDenies(slot, 'activeSonar')) return;
    this.applyPing(slot, eid);
  }

  /**
   * The commander's one authored act — docs/characters.md's *Commander
   * ability*, and the first thing in this file a mission *grants* rather than
   * withholds.
   *
   * Recorded like every other order and before every refusal, on this path's
   * standing rule: a build that later stops refusing shows up as a replay
   * divergence rather than as silence. The refusals themselves are the
   * runtime's — there is one of these per match, and whether it has been spent
   * is mission state, not the room's.
   *
   * Takes no unit, unlike every order above it. An act is the commander's and
   * not a hull's: `MissionCommanderAbility` measures its radius from an
   * authored point, so there is nothing here for a selection to name.
   */
  commanderAbility(slot: number): boolean {
    this.recordCommand({ tick: this.world.tick, type: 'ability', slot });
    return this.missionRuntime?.fireAbility(slot) === true;
  }

  /**
   * Seed a structure with the Blight's strain — docs/units.md, the Blight.
   *
   * By handle, like a torpedo launch: the handle is the proof this slot
   * resolved this structure. Unlike a launch there is no tier floor beyond
   * having a handle at all, because the weapon needs no firing solution — you
   * are touching a wall, not leading a moving target.
   *
   * Returns false when the target is not a structure, is out of reach, already
   * carries a strain, or the seeder is still cold.
   */
  seedSpore(slot: number, eid: number, contactHandle: number): boolean {
    this.recordCommand({
      tick: this.world.tick,
      type: 'seedSpore',
      slot,
      unit: this.localId(eid),
      contact: contactHandle,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, Unit, eid)) return false;
    if (statsFor(Unit.kind[eid] as UnitKind).kind !== UnitKind.Blight) return false;
    if (Countermeasure.cooldownRemainingS[eid]! > 0) return false;

    const target = this.echo.entityForHandle(slot, contactHandle);
    if (target === undefined) return false;
    if (!hasComponent(this.world, Structure, target)) return false;
    if (Owner.slot[target] === slot) return false;
    if (!hasComponent(this.world, Health, target) || Health.hp[target]! <= 0) return false;

    const reach = HULL_EFFECTS.BLIGHT.RANGE_M;
    const dx = Position.x[target]! - Position.x[eid]!;
    const dy = Position.y[target]! - Position.y[eid]!;
    if (dx * dx + dy * dy > reach * reach) return false;

    if (!seedSpore(this.world, target, slot)) return false;
    Countermeasure.cooldownRemainingS[eid] = HULL_EFFECTS.BLIGHT.COOLDOWN_S;
    return true;
  }

  /**
   * Sing — docs/units.md, the Lure. The Drift is called to where the hull is
   * standing, which is why there is nothing to name and nothing to resolve.
   *
   * Returns false while the hull is still cold or already singing.
   */
  sing(slot: number, eid: number): boolean {
    this.recordCommand({ tick: this.world.tick, type: 'sing', slot, unit: this.localId(eid) });
    if (!this.owns(slot, eid)) return false;
    return startSong(this.world, eid);
  }

  /**
   * Sow — docs/systems-flora.md §2. The bed the hull is standing in, which is
   * why there is nothing to name and nothing to resolve.
   *
   * Returns false when the hull is not a live, non-silent Commune hull over a
   * standing bed, or is already sowing. Refusal is silent, like the Lure's:
   * the client learns the answer from the hull's own SIG a tick later.
   */
  sow(slot: number, eid: number): boolean {
    this.recordCommand({ tick: this.world.tick, type: 'sow', slot, unit: this.localId(eid) });
    if (!this.owns(slot, eid)) return false;
    return startSowing(this.world, eid);
  }

  /** The unrecorded half of `activeSonar` — see `applyMove`. */
  private applyPing(slot: number, eid: number): void {
    if (!this.owns(slot, eid) || !hasComponent(this.world, Unit, eid)) return;
    if (!hasComponent(this.world, ActivePing, eid)) {
      addComponent(this.world, ActivePing, eid);
    }
    ActivePing.remainingS[eid] = ACTIVE_SONAR.REVEAL_DURATION_S;
    ActivePing.emitterSig[eid] = ACTIVE_SONAR.EMITTER_SIG;
    ActivePing.revealRadiusM[eid] = ACTIVE_SONAR.REVEAL_RADIUS_M;
    raiseSelfEvent(this.world, { kind: SelfEventKind.Ping, eid });
    // Pinging breaks silence by definition — and a hull cannot ping with its
    // drive cut either: transmitting is the loudest thing a picket does, and
    // the posture below silence is the one where it is doing nothing at all.
    SilentRunning.active[eid] = 0;
    EngineOff.active[eid] = 0;
  }

  /**
   * Commission a structure. Placement is C&C base-creep: the site must fall
   * within build radius of something the player already owns, and clear of
   * every existing footprint and nodule field.
   */
  build(slot: number, kind: StructureKind, x: number, y: number): boolean {
    this.recordCommand({ tick: this.world.tick, type: 'build', slot, kind, x, y });
    // A mission with no economy refuses this outright rather than leaving the
    // cost check to do it by accident. The difference matters: refused-on-cost
    // is a number that could change, and a mission that handed the player a
    // stockpile for some other reason would quietly let them build a refinery
    // in the middle of somebody else's court.
    if (this.missionDenies(slot, 'construction')) return false;
    const stats = structureStatsFor(kind);
    if (!stats.constructible) return false;
    // Faction signature structures are exactly that — another navy's order
    // for one is rejected server-side no matter what the client asked.
    if (stats.faction !== undefined && stats.faction !== this.factionOf(slot)) return false;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const { widthM, heightM } = this.world.terrain;
    if (
      x < stats.radiusM ||
      y < stats.radiusM ||
      x > widthM - stats.radiusM ||
      y > heightM - stats.radiusM
    ) {
      return false;
    }

    // A structure cannot rise the way a hull can, so ground that does not admit
    // it at its working depth is a refusal rather than a detour. Authored maps
    // are held to this by maps.test.ts; this is the same rule for the
    // structures a player puts down mid-match.
    if (!this.world.terrain.admits(x, y, CONSTRUCTION.WORKING_DEPTH_M)) return false;

    // A mission's own rules for the works — `MissionDefinition.works`. Absent
    // in every skirmish, and both halves are gated on that.
    const works = this.missionRuntime?.definition.works;
    // The works party has to be at the works: a site may only be placed
    // within reach of one of the commander's own hulls. docs/mission-standing-wave.md
    // §8 names the breach this closes — a corridor laid from a Gallery no hull
    // ever left is "somewhere no Knight hull ever needed to be", and the
    // withdrawal the mission is about would cost nothing.
    if (works?.hullRadiusM !== undefined) {
      let attended = false;
      const reach2 = works.hullRadiusM * works.hullRadiusM;
      const hulls = this.unitOwners(this.world);
      for (let i = 0; i < hulls.length; i++) {
        const eid = hulls[i]!;
        if (Owner.slot[eid] !== slot) continue;
        if (Health.hp[eid]! <= 0) continue;
        const d2 = (Position.x[eid]! - x) ** 2 + (Position.y[eid]! - y) ** 2;
        if (d2 <= reach2) {
          attended = true;
          break;
        }
      }
      if (!attended) return false;
    }

    // Terrain requirement, enforced server-side like every other placement
    // rule. A vent tap only works on a vent: docs/economy.md §2 puts Thermal
    // Draw in Thermal Veins, and that constraint is the point — the tap drags
    // players onto the game's best masking terrain and makes them loud there.
    if (
      stats.requiresBiome !== undefined &&
      this.world.terrain.biomeAt(x, y) !== stats.requiresBiome
    ) {
      return false;
    }

    const economy = economyFor(this.world, slot);
    // Three accounts, one answer (economy.ts). Crystal-locked structures are
    // the faction signatures — the upper tech tier the deep pays for
    // (docs/economy.md §2) — and one priced in Biomass is refused on that
    // account the same way, by the function the bar greys its button with.
    const price = priceOf(stats);
    if (!affords(economy, price)) return false;

    let anchored = false;
    const placed = this.structureOwners(this.world);
    for (let i = 0; i < placed.length; i++) {
      const eid = placed[i]!;
      const d = Math.hypot(Position.x[eid]! - x, Position.y[eid]! - y);
      const otherRadius = structureStatsFor(Structure.kind[eid] as StructureKind).radiusM;
      if (d < stats.radiusM + otherRadius + PLACEMENT_CLEARANCE_M) return false;
      if (Owner.slot[eid] === slot && d <= CONSTRUCTION.BUILD_RADIUS_M) anchored = true;
    }
    if (!anchored) return false;

    for (const node of this.nodes) {
      if (!hasComponent(this.world, ResourceNode, node.id)) continue;
      if (Math.hypot(node.x - x, node.y - y) < stats.radiusM + PLACEMENT_CLEARANCE_M) return false;
    }

    charge(economy, price);
    spawnStructure(this.world, {
      kind,
      slot,
      faction: this.factionOf(slot),
      x,
      y,
      // On the floor where it is placed, when the mission says so, rather
      // than at the working depth every skirmish structure sits at. Not a
      // global change, and the reason is the thermocline: the three skirmish
      // maps seat every structure at 600 m over floors of 1,400–2,900 m with
      // the layer between, so a structure that sat on its floor there would
      // cross the duct and re-price every pair in every match. A mission whose
      // ground is all below the layer says so and gets ground-seated works.
      ...(works?.onFloor === true ? { depth: this.world.terrain.floorAt(x, y) } : {}),
    });
    return true;
  }

  /** Queue a unit at a production structure. Cost is paid on enqueue. */
  produce(slot: number, structureEid: number, kind: UnitKind): boolean {
    this.recordCommand({
      tick: this.world.tick,
      type: 'produce',
      slot,
      structure: this.localId(structureEid),
      kind,
    });
    // The same lock as `build`: a mission that has taken construction away has
    // taken hull production with it. The Prologue owns no yard to produce from,
    // so this is belt to that brace — and it is the brace that would matter the
    // day a mission lends the player a Foundry it does not want used.
    if (this.missionDenies(slot, 'construction')) return false;
    if (!this.owns(slot, structureEid)) return false;
    if (!hasComponent(this.world, Structure, structureEid)) return false;
    if (hasComponent(this.world, UnderConstruction, structureEid)) return false;
    const allowed = PRODUCIBLE[Structure.kind[structureEid] as StructureKind];
    if (allowed === undefined || !allowed.includes(kind)) return false;
    // ...and the faction half of the same question. A hull that is one navy's
    // is refused to the other three server-side, exactly as a signature
    // structure is above — the command bar greys the button, and this is what
    // makes the greying true rather than decorative.
    if (!unitAvailableTo(kind, this.factionOf(slot))) return false;

    const economy = economyFor(this.world, slot);
    const stats = statsFor(kind);
    let line = this.world.production.get(structureEid);
    if (line === undefined) {
      line = { queue: [], remainingS: 0 };
      this.world.production.set(structureEid, line);
    }
    if (line.queue.length >= MAX_QUEUE_LENGTH) return false;
    // The berths (docs/economy.md §10), before the price: a hull the base has
    // no crew for is refused whatever the stockpile says, and it is refused
    // at the queue, because that is when the crew is called up. Same path as
    // the price so the command bar's greying is true rather than decorative.
    const berths = this.berthsFor(slot);
    if (berths.used + stats.berths > berths.granted) return false;
    // All three accounts on the one path the shell prices from (economy.ts):
    // a hull short in Biomass alone is refused here exactly as one short in
    // Nodules is, and the button that showed it greyed showed the same sum.
    const price = priceOf(stats);
    if (!affords(economy, price)) return false;

    charge(economy, price);
    line.queue.push(kind);
    if (line.queue.length === 1) line.remainingS = stats.buildTimeS;
    return true;
  }

  /**
   * Buy a fleet-wide refit (docs/systems-progression.md §2).
   *
   * The same shape as `produce`, because it is the same yard-time: the price
   * is paid on purchase through the same three accounts, and the line is
   * taken for the duration. What differs is what comes off it — nothing.
   * "A navy refitting is audibly refitting, and a navy refitting is a navy
   * *not* building its second hull."
   *
   * The Knights are the carve-out §2 writes into the table itself: their
   * Pressure Refit has no Nodules and no line time, so it has no line. It is
   * struck at the Bastion instead, and it is *sounded* — an instant refit
   * that emitted nothing would be the quiet tech-up §1's rule 1 forbids.
   */
  refit(slot: number, structureEid: number, kind: RefitKind): boolean {
    this.recordCommand({
      tick: this.world.tick,
      type: 'refit',
      slot,
      structure: this.localId(structureEid),
      kind,
    });
    // A mission that has taken construction away has taken the upgrade with
    // it, for `produce`'s reason: a yard the mission lent the player is not a
    // yard the player may tech on.
    if (this.missionDenies(slot, 'construction')) return false;
    if (!this.owns(slot, structureEid)) return false;
    if (!hasComponent(this.world, Structure, structureEid)) return false;
    if (hasComponent(this.world, UnderConstruction, structureEid)) return false;

    const faction = this.factionOf(slot);
    if (!refitOfferedTo(kind, faction)) return false;
    if (this.world.refits.get(slot)?.has(kind) === true) return false;
    // The yard §2 names for this navy, and no other — the Slipway's line for
    // three of them, the Bastion for the one whose purchase is a chord rather
    // than a shift.
    if (Structure.kind[structureEid] !== REFIT_TERMS[faction].boughtAt) return false;

    const economy = economyFor(this.world, slot);
    const price = refitPriceFor(kind, faction);
    if (!affords(economy, price)) return false;

    const lineS = refitLineTimeS(kind, faction);
    if (lineS <= 0) {
      // Instant, and announced. The strike is written as a spike over the
      // structure's own idle figure so the doc's 80 is what the map actually
      // hears, whatever the Bastion's hum is tuned to.
      charge(economy, price);
      grantRefit(this.world, slot, kind);
      const sounding = REFIT_TERMS[faction].sounding;
      if (sounding !== undefined) {
        const idle = structureStatsFor(Structure.kind[structureEid] as StructureKind).sigIdle;
        Acoustic.spikeAmount[structureEid] = Math.max(0, sounding.sig - idle);
        Acoustic.spikeRemainingS[structureEid] = sounding.seconds;
      }
      return true;
    }

    let line = this.world.production.get(structureEid);
    if (line === undefined) {
      line = { queue: [], remainingS: 0 };
      this.world.production.set(structureEid, line);
    }
    // One refit at a time on one line. A second Slipway buys a second line,
    // not a discount — which is §2's own sentence, and falls out of the state
    // being per structure rather than per navy.
    if (line.refit !== undefined) return false;

    charge(economy, price);
    line.refit = { kind, remainingS: lineS, totalS: lineS };
    return true;
  }

  /**
   * The commander's berths (docs/economy.md §10): what the standing base
   * grants against what is afloat and queued.
   *
   * Recounted from the world every time rather than kept as a running
   * total, so a Foundry that dies takes its grant with it on the tick it
   * dies and a hull that dies frees its berths the same way — the two
   * events that a cached count would have to be told about, and the two a
   * mission beat can cause without going through any command path.
   */
  berthsFor(slot: number): BerthReport {
    let granted = 0;
    const yards = this.structureOwners(this.world);
    for (let i = 0; i < yards.length; i++) {
      const eid = yards[i]!;
      if (Owner.slot[eid] !== slot || Health.hp[eid]! <= 0) continue;
      if (hasComponent(this.world, UnderConstruction, eid)) continue;
      const kind = Structure.kind[eid] as StructureKind;
      if (kind === StructureKind.Bastion) granted += BERTHS.BASTION;
      else if (kind === StructureKind.Foundry) granted += BERTHS.FOUNDRY;
      else if (kind === StructureKind.Slipway) granted += BERTHS.SLIPWAY;
    }
    granted = Math.min(BERTHS.CEILING, granted);

    let used = 0;
    const hulls = this.unitOwners(this.world);
    for (let i = 0; i < hulls.length; i++) {
      const eid = hulls[i]!;
      if (Owner.slot[eid] !== slot || Health.hp[eid]! <= 0) continue;
      used += statsFor(Unit.kind[eid] as UnitKind).berths;
    }
    // Queued hulls count from the moment the keel is laid.
    for (const [eid, line] of this.world.production) {
      if (Owner.slot[eid] !== slot) continue;
      for (const kind of line.queue) used += statsFor(kind).berths;
    }
    return { used, granted };
  }

  private factionOf(slot: number): Faction {
    const seated = this.factionBySlot.get(slot);
    if (seated !== undefined) return seated;
    // A slot the mission runtime seated rather than a player: any surviving
    // entity of the slot knows its faction, and the Bastion always exists
    // while the player does.
    const owned = this.owners(this.world);
    for (let i = 0; i < owned.length; i++) {
      const eid = owned[i]!;
      if (Owner.slot[eid] === slot) return Owner.faction[eid] as Faction;
    }
    return Faction.Bathyarch;
  }

  /**
   * A query's entities in ascending id order, in a scratch array this match
   * owns. Sorting a few hundred ids is microseconds; the `maxEid` walk it
   * replaces touched every id ever allocated, twice, per slot, per pass.
   */
  private ascending(entities: ArrayLike<number>): number[] {
    const out = this.ascendingScratch;
    out.length = entities.length;
    for (let i = 0; i < entities.length; i++) out[i] = entities[i]!;
    out.sort((a, b) => a - b);
    return out;
  }

  // --- Loop ----------------------------------------------------------------

  /**
   * Advance the simulation by `deltaMs` of wall-clock time.
   * Returns per-slot snapshots on ticks where the Echo Layer ran, otherwise null.
   */
  update(deltaMs: number): Map<number, EchoSnapshot> | null {
    this.accumulator += deltaMs / 1000;
    this.pendingSnapshots = null;

    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_UPDATE) {
      this.step();
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_UPDATE) {
      // Drop the backlog rather than trying to make it up later.
      this.accumulator = 0;
    }

    // Whatever the steps resolved on their way past an Echo tick. Null when
    // this update did not cross one, which is what the room uses to decide
    // there is nothing new to send.
    return this.pendingSnapshots;
  }

  /**
   * Advance exactly one fixed step.
   *
   * Public for replay playback, which drives the simulation by tick rather
   * than by wall-clock — feeding it deltaMs would reintroduce the very
   * timing dependence a replay exists to eliminate.
   */
  stepOnce(): void {
    this.step();
  }

  private step(): void {
    // Wall-clock only, and deliberately never mixed into the state hash: the
    // simulation must not be able to notice how long it took to run.
    const stepStarted = performance.now();
    // The counted budget's other half, and unlike the clock it is the same on
    // every machine. Zeroed here so a system may only ever add to it.
    resetStepWork(this.world.stepWork);
    this.recorder?.maybeCheckpoint(this.world.tick, () => hashWorld(this.world));
    this.destroyedScratch.length = 0;
    this.world.environmentalDeaths.clear();
    // The siege floor is rebuilt from scratch every step, like every other
    // derived acoustic state: combat writes it for a hull that is engaged and
    // `siegeSystem` for one that is singing, both before the SIG pass reads it.
    // Cleared *here* rather than after that read, because a hull that stopped
    // cutting must be quiet on the very next tick — a floor that latched would
    // leave a Furnace at 75 for the rest of the match.
    this.world.siegeWorkSig.clear();
    harvestSystem(this.world);
    combatSystem(this.world, this.destroyedScratch);
    const physicsStarted = performance.now();
    movementSystem(this.world);
    // The vertical axis, right beside the horizontal one — and necessarily
    // before acoustics (which prices the descent) and pressure (which bills
    // for where the hull has just arrived).
    depthSystem(this.world);
    // After movement and depth, before anything reads positions: separation
    // is a correction to where hulls ended up, and detection must see the
    // corrected picture rather than a stack that no longer exists.
    separationSystem(this.world);
    // Ordnance last of the movers, so a fuse checks against where hulls
    // actually finished the tick rather than where they started it. A torpedo
    // that detonated on a position its target had already left would be the
    // one weapon in the game you could outrun by a single frame.
    ordnanceSystem(this.world, this.destroyedScratch);
    const physicsCost = performance.now() - physicsStarted;
    if (physicsCost > this.worstPhysicsMs) this.worstPhysicsMs = physicsCost;
    // After the systems that can finish an order: a unit that arrived this
    // tick starts its next leg on the next one.
    orderQueueSystem(this.world);
    constructionSystem(this.world);
    productionSystem(this.world);
    // Boarding and landing after the movement that brings a hull to its
    // carrier and before the effects, auras and acoustics that read what is
    // and is not in the water this tick. A hull that boarded is forgotten by
    // the Echo Layer on the same tick, so it comes back as a new contact.
    this.boardedScratch.length = 0;
    carryingSystem(this.world, this.boardedScratch);
    for (const eid of this.boardedScratch) this.echo.forget(eid);
    // The rung's hull effects before auras: a Cantus that stopped this tick
    // is singing on this tick's grant pass, and a Tender's weld lands before
    // pressure bills for where the patient is standing.
    hullEffectsSystem(this.world);
    // Auras before acoustics: the spire's SIG-80 "projecting" state and
    // every effective HYD/PF value must be this tick's, not last tick's.
    aurasSystem(this.world);
    // Between the two: auras rebuilds `spireActive` from the depth grant and
    // knows nothing of pairs, and acoustics reads it. A corridor closing or
    // falling rewrites the PF grid on this tick rather than at the next storm
    // boundary — the line is heard the tick it closes.
    if (standingWaveSystem(this.world, this.destroyedScratch)) rebuildPropagation(this.world);
    // A picket's clock runs immediately before acoustics, for the reason auras
    // do: a transmission that starts this tick must be heard on this tick's
    // SIG pass, not the next one. The Echo pass runs at 5 Hz and would
    // otherwise read a ping that had already been counted down.
    cadencePingSystem(this.world);
    // Before acoustics for the cadence ping's reason: a spore ticking and a
    // song running are both this tick's facts, and the song writes the working
    // floor that the SIG pass is about to read — after combat has written its
    // half of the same map, and after the step's own clear at the top.
    siegeSystem(this.world, this.destroyedScratch);
    acousticsSystem(this.world);
    pressureSystem(this.world, this.destroyedScratch);
    // Hazards after pressure and before reap: a hull killed by an eruption
    // should die on the tick the eruption killed it, not the next one.
    hazardsSystem(this.world, this.destroyedScratch);
    // After hazards, so a tap destroyed by its own vent stops powering
    // anything on the same tick it dies.
    thermalSystem(this.world);
    // After thermal and before reap: the tithe is income, not production, so
    // it does not care about Draw satisfaction — but a Bastion destroyed this
    // tick should not pay out on the tick it dies.
    titheSystem(this.world);
    bloomShareSystem(this.world);
    // Beside the other two ground-income passes, and before the Drift's own
    // tick: crop rendered this tick wears its region this tick, so the health
    // a player is spending is charged in the same breath as the Biomass they
    // are paid (docs/systems-flora.md §3).
    // Before the reactor, and before acoustics reads either: a sowing served
    // this tick is a hull that stops being loud this tick.
    sowingSystem(this.world);
    bioReactorSystem(this.world);
    faunaSystem(this.world, this.destroyedScratch);
    this.driftTick();
    // After the health tick, so a region restocks against the water as it is
    // this tick rather than as it was before this tick's noise wore it.
    this.repopulate();
    this.reap();
    // Once a second, after reap, so a commander finished on this tick is
    // already out rather than briefly counting as somebody's live rival.
    if (this.world.tick % SIM.TICK_HZ === 0) this.checkConcessions();
    // After reap, so a structure destroyed this tick has already left its
    // mark and does not lose a tick of the three minutes it is owed.
    this.world.marks.tick(FIXED_DT);
    this.world.tick++;
    if (this.world.tick % ECHO_TICK_INTERVAL === 0) {
      this.pendingSnapshots = this.resolveEcho();
      // The mission runs here, inside the fixed step and on the Echo tick,
      // rather than in the room. `stepOnce` drives this path, so playback
      // reproduces every beat with no new command types and no new hash
      // inputs — which is the same lesson the comment on ECHO_TICK_INTERVAL
      // records for the Echo pass itself. It is handed the player's own
      // snapshot and nothing else, so an objective can only ever count what
      // that player already resolved.
      this.tickMission();
    }
    const stepCost = performance.now() - stepStarted;
    if (stepCost > this.worstStepMs) this.worstStepMs = stepCost;
    accumulateWorst(this.worstWork, this.world.stepWork);
  }

  /**
   * Wear the Drift down, and let it recover.
   *
   * Noise is summed per region from live emitters, so a player who chooses to
   * be poor and safe is also choosing not to strip the ground they stand on.
   * Everything that makes you strong makes you loud, and loud is what kills
   * the map (docs/bestiary.md §6).
   */
  private driftTick(): void {
    this.world.driftNoise.fill(0);
    // Query order rather than id order, and that is safe: two runs of one
    // command sequence add and remove the same entities in the same order, so
    // the query walks them in the same order and the per-region float sums
    // land on the same bits. The state hash proves it (test/determinism).
    const loud = this.emitters(this.world);
    for (let i = 0; i < loud.length; i++) {
      const eid = loud[i]!;
      if (Owner.slot[eid] === DRIFT_SLOT) continue;
      const sig = Acoustic.sig[eid]!;
      if (sig <= 0) continue;
      const region = this.world.drift.regionIndex(Position.x[eid]!, Position.y[eid]!);
      this.world.driftNoise[region] = (this.world.driftNoise[region] ?? 0) + sig;
    }
    this.world.drift.tick(FIXED_DT, this.world.driftNoise);
  }

  /**
   * Put back what the Drift has lost — docs/bestiary.md §6, read as the rate
   * its band table is written as.
   *
   * Until #554 `seedFauna` ran once from the constructor and `spawnsAllowed`
   * was read only at seed time, which made a map's fauna a **fixed stock**:
   * one seeding, 48 creatures, about 916 Biomass for four navies for the whole
   * match, and three of §6's four rows saying the same thing because the spawn
   * rate was zero in all of them. This is the tick that makes the account an
   * income and the table a rate.
   *
   * Three rules, all of them the table's own:
   *
   * - **Toward the complement, never past it.** The Drift replaces losses; it
   *   does not breed a map fuller than the ground it stands on can feed.
   * - **The band sets the rate.** Full in Healthy water, `−40%` in Strained,
   *   nothing at Failing and below — and a Strained region is closed to
   *   megafauna outright, which is the same row's second clause.
   * - **The herd eats the crop** (docs/systems-flora.md §4). A region's rate
   *   is scaled by the standing crop of the beds in it, so a plateau stripped
   *   to bare rock feeds fewer animals. Inert until something can cut a bed,
   *   and the reason the Directorate's income is paid by a crop it does not
   *   harvest.
   *
   * Costs an accumulator a tick. The placement burst — at most twelve terrain
   * probes — happens once per `DRIFT.RESPAWN_INTERVAL_S`, and the population
   * cap that protects the Echo pass's 2 ms budget is untouched.
   */
  private repopulate(): void {
    if (this.complement.size === 0) return;
    this.repopulateCreditS += FIXED_DT;
    if (this.repopulateCreditS < DRIFT.RESPAWN_INTERVAL_S) return;
    this.repopulateCreditS -= DRIFT.RESPAWN_INTERVAL_S;
    if (countFauna(this.world) >= DRIFT.MAX_POPULATION) return;

    // Whichever species is furthest below what this map held, ties going to
    // the roster's own order — a deterministic choice, because a replay that
    // restocked a different animal diverges from the tick it did.
    let wanted: FaunaSpecies | null = null;
    let worst = 0;
    for (const { species } of FAUNA_ROSTER) {
      const deficit = (this.complement.get(species) ?? 0) - countFaunaOf(this.world, species);
      if (deficit > worst) {
        worst = deficit;
        wanted = species;
      }
    }
    if (wanted === null) return;

    // Its own stream: the seeding's draws are all spent before the first tick,
    // and a shared one would make how many attempts a restock took shift every
    // later placement the seeder would have made.
    const rng = this.world.rng.fork('drift-repopulate');
    const species = wanted;
    const admitted = (x: number, y: number): boolean => {
      if (MEGAFAUNA.has(species) && !this.world.drift.admitsMegafauna(x, y)) return false;
      const rate = this.world.drift.spawnRate(x, y) * this.cropDensityAt(x, y);
      // A rate below 1 is a thinner region rather than a closed one: the draw
      // spends the attempt, so Strained water breeds more slowly instead of
      // searching harder for a spot inside itself.
      return rate >= 1 || rng.next() < rate;
    };
    if (!this.placeFauna(species, rng, admitted)) return;
    // A cluster masks by writing PF, so the grid has to learn about one the
    // moment it exists — the same rebuild `Match.reap` runs when one dies.
    if (species === FaunaSpecies.Tetherjelly) rebuildPropagation(this.world);
  }

  /**
   * How much of a region's canopy is still standing, as a fraction — 1 where
   * it has no beds at all (docs/systems-flora.md §4).
   *
   * Beds are few and this runs once per replacement, so a walk is the honest
   * answer; a region with no kelp in it is every region on every map that
   * authors no field, which is why this is 1 rather than 0 by default.
   */
  private cropDensityAt(x: number, y: number): number {
    const region = this.world.drift.regionIndex(x, y);
    let total = 0;
    let beds = 0;
    for (const hazard of this.world.hazards) {
      if (hazard.kind !== 'kelp-entanglement') continue;
      if (this.world.drift.regionIndex(hazard.x, hazard.y) !== region) continue;
      total += hazard.crop;
      beds++;
    }
    return beds === 0 ? 1 : total / beds;
  }

  /** One place where deaths are made real, so the win condition sees them all. */
  private reap(): void {
    // Backstop before the early return: anything sitting at zero HP dies here
    // even if nothing reported it.
    //
    // The convention is that a system dealing damage appends its kills to
    // `destroyed`, and twice now a system has not — `hazardsSystem` and
    // `faunaSystem` both damaged hulls and told nobody. The result was silent
    // and permanent rather than merely wrong: the entity kept every component,
    // so it stayed on the board at hp <= 0, still emitting, a contact every
    // listener could resolve and nothing could ever kill. Ordnance made it
    // vivid (a depth charge caught in an eruption becomes an immortal SIG-30
    // emitter that never detonates and never expires) but any hull did it.
    //
    // Both systems now report, which is what gives a kill its attribution.
    // This sweep is the invariant underneath that convention, so the next
    // system to forget is wrong for one tick instead of forever.
    const alive = this.healthQuery(this.world);
    for (let i = 0; i < alive.length; i++) {
      const eid = alive[i]!;
      if (Health.hp[eid]! <= 0) this.destroyedScratch.push(eid);
    }

    if (this.destroyedScratch.length === 0) return;

    // The load dies with the carrier (docs/systems-echo.md §3): every hull
    // aboard a dying carrier is appended, at zero, so the one loop below
    // makes both deaths real on the same tick. By index, because the list
    // grows under the walk, and a carried hull carries no hold of its own.
    for (let i = 0; i < this.destroyedScratch.length; i++) {
      const aboard = this.world.holds.get(this.destroyedScratch[i]!);
      if (aboard === undefined) continue;
      for (const carried of aboard) {
        if (!hasComponent(this.world, Health, carried) || Health.hp[carried]! <= 0) continue;
        Health.hp[carried] = 0;
        this.destroyedScratch.push(carried);
      }
    }

    const lostBastions: number[] = [];
    let jellyDied = false;
    for (const eid of this.destroyedScratch) {
      if (!hasComponent(this.world, Owner, eid)) continue;

      // A dead creature is Biomass and a bite out of the region it died in
      // (docs/bestiary.md §5, §6). Paid to whoever killed it, at the
      // Directorate's full rate or everyone else's rendering-contract share.
      if (hasComponent(this.world, Fauna, eid)) {
        // "Rendered" is now one fact rather than two guesses: somebody was
        // paid for this creature. That needs both halves of §5 — a player
        // dealt the last blow (`Fauna.renderedBySlot`) *and* the map did not
        // finish it (`SimWorld.environmentalDeaths`) — and it is the same
        // answer `payBiomass` acts on, so the payout and the health charge can
        // never disagree about whether a harvest happened.
        //
        // Before the killer was recorded, "rendered" was merely "not a hazard
        // kill", which charged a region the full harvesting rate for a
        // creature another *creature* ate (docs/bestiary.md §6: a death nobody
        // rendered costs a quarter of one somebody did). The Drift still loses
        // the animal either way, which is why recordKill runs regardless.
        const rendered =
          Fauna.renderedBySlot[eid]! >= 0 && !this.world.environmentalDeaths.has(eid);
        if (rendered) this.payBiomass(eid);
        this.world.drift.recordKill(Position.x[eid]!, Position.y[eid]!, rendered);
        // Living terrain stops living: the cluster's −0.10 comes off the PF
        // grid on the tick it dies, and never comes back (docs/bestiary.md
        // §4 — burning a lane through a jelly field is permanent).
        if (Fauna.species[eid] === FaunaSpecies.Tetherjelly) jellyDied = true;
        this.echo.forget(eid);
        removeEntity(this.world, eid);
        continue;
      }

      if (hasComponent(this.world, Structure, eid)) {
        // Residue outlives the thing that made it — three minutes for a
        // structure against ninety seconds for a fight (docs/systems-echo.md
        // §7). Recorded here because reap() is the one place a death is made
        // real, so a mark can never disagree with what actually died.
        this.world.marks.add(
          EchoMarkKind.DestroyedStructure,
          Position.x[eid]!,
          Position.y[eid]!,
          Position.depth[eid]!
        );
        if (Structure.kind[eid] === StructureKind.Bastion) {
          lostBastions.push(Owner.slot[eid]!);
        }
      }
      this.world.production.delete(eid);
      this.world.rallies.delete(eid);
      // A dying hull leaves whatever hold it was in, and a dying carrier's
      // hold goes with it — a hold that outlived its carrier would be a list
      // of ids waiting to come back attached to whatever inherits them.
      forgetCarried(this.world, eid);
      this.world.holds.delete(eid);
      // Before the id goes back into bitecs's free list: anything keyed by eid
      // outside the ECS has to be dropped, or it comes back attached to
      // whatever inherits the id. A contact handle would name a hull the player
      // never detected (see EchoLayer.forget); a queued order would be executed
      // — a brand-new unit walking off to finish a dead one's last waypoint.
      this.echo.forget(eid);
      clearQueue(this.world, eid);
      this.world.paths.delete(eid);
      removeEntity(this.world, eid);
    }

    // One rebuild however many clusters died this tick — the rebuild gathers
    // every survivor, so batching cannot get a stale answer.
    if (jellyDied) rebuildPropagation(this.world);

    // Losing the Bastion is elimination — the C&C short game. The rest of the
    // force scuttles rather than lingering as an unwinnable nuisance.
    for (const slot of lostBastions) this.eliminate(slot);

    this.resolveVictory();
  }

  /**
   * Scuttling — the other way a commander leaves (docs/game-identity.md).
   *
   * A Bastion is the stake and killing one is how a match is meant to end,
   * but a commander can be finished long before their Bastion falls: no
   * harvester left, nothing queued, not the price of a harvester in the bank,
   * and nothing landing in any stockpile. From there attrition is one-way —
   * every hull they hold is the last one they will ever have — and the match
   * has already been decided by everything except the clock. The crew
   * scuttles.
   *
   * Every clause is there to keep the rule from firing on a position that is
   * merely *bad*:
   *
   * - **A live harvester means the loop is only quiet, not gone.** Trickle and
   *   Idle are choices a commander makes to be hard to hear (docs/economy.md
   *   §3), and a rule that read a chosen silence as a defeat would price the
   *   game's central decision at "you lose".
   * - **A queue or a rising site is a hull already paid for.** Without this,
   *   spending your last nodules on the harvester that saves you would start
   *   the clock that kills you.
   * - **The bank is read against a harvester, not against the cheapest hull.**
   *   The question is whether they can mine again. A commander sitting on the
   *   price of one more scout with no way to earn the next one is beaten; one
   *   who can still buy a harvester has a move, and gets to make it.
   * - **Income is income from any source.** The Hadron tithe pays a Knight for
   *   existing (docs/economy.md §6), so a Knight with a Bastion standing never
   *   satisfies this — which is exactly what "the only economy that does not
   *   scale with map control" is supposed to mean.
   * - **Somebody else has to have both the money and the guns.** Four broke
   *   commanders are a stalemate, not four defeats, and mass-scuttling them
   *   would leave nobody standing to be declared the winner. And a commander
   *   who is broke but still fields the strongest fleet on the map has not
   *   lost — they have one attack left in them, and the rule does not get to
   *   decide it would have failed.
   *
   * Read once per simulated second, inside the fixed step, so a replay
   * reproduces it: everything it touches is simulation state, and nothing it
   * touches is wall-clock.
   */
  private checkConcessions(): void {
    const standing = this.slots.filter((slot) => !this.eliminated.has(slot));
    if (standing.length < 2) return;

    const harvesters = new Set<number>();
    const armed = new Map<number, number>();
    const units = this.unitOwners(this.world);
    for (let i = 0; i < units.length; i++) {
      const eid = units[i]!;
      const slot = Owner.slot[eid]!;
      const kind = Unit.kind[eid] as UnitKind;
      if (kind === UnitKind.Harvester) harvesters.add(slot);
      if (statsFor(kind).attackDamage > 0) armed.set(slot, (armed.get(slot) ?? 0) + 1);
    }

    // A structure of theirs that is rising, or that has anything on its line,
    // is a hull already paid for; a finished one that can produce a harvester
    // is a way back into an economy, if they can afford the harvester.
    const pending = new Set<number>();
    const canRebuild = new Set<number>();
    const harvesterPrice = priceOf(statsFor(UnitKind.Harvester));
    const structures = this.structureOwners(this.world);
    for (let i = 0; i < structures.length; i++) {
      const eid = structures[i]!;
      const slot = Owner.slot[eid]!;
      if (hasComponent(this.world, UnderConstruction, eid)) {
        pending.add(slot);
        continue;
      }
      if ((this.world.production.get(eid)?.queue.length ?? 0) > 0) pending.add(slot);
      if (canRebuild.has(slot)) continue;
      const allowed = PRODUCIBLE[Structure.kind[eid] as StructureKind] ?? [];
      if (
        allowed.includes(UnitKind.Harvester) &&
        affords(economyFor(this.world, slot), harvesterPrice)
      ) {
        canRebuild.add(slot);
      }
    }

    const tick = this.world.tick;
    const window = CONCESSION.WINDOW_S * SIM.TICK_HZ;
    const earning = new Set<number>();
    const beaten: number[] = [];

    for (const slot of standing) {
      const economy = economyFor(this.world, slot);
      let watch = this.concession.get(slot);
      if (watch === undefined) {
        watch = {
          nodules: economy.nodules,
          crystal: economy.crystal,
          biomass: economy.biomass,
          lastRiseTick: tick,
          stalledSince: -1,
        };
        this.concession.set(slot, watch);
      }
      if (
        economy.nodules > watch.nodules ||
        economy.crystal > watch.crystal ||
        economy.biomass > watch.biomass
      ) {
        watch.lastRiseTick = tick;
      }
      watch.nodules = economy.nodules;
      watch.crystal = economy.crystal;
      watch.biomass = economy.biomass;

      if (tick - watch.lastRiseTick < window) earning.add(slot);

      const stalled = !harvesters.has(slot) && !pending.has(slot) && !canRebuild.has(slot);
      if (!stalled) {
        watch.stalledSince = -1;
        continue;
      }
      if (watch.stalledSince === -1) watch.stalledSince = tick;
      // One window, not two: the streak is the sixty seconds, and "nothing
      // came in" is asked of that same stretch rather than of its own.
      if (tick - watch.stalledSince >= window && watch.lastRiseTick <= watch.stalledSince) {
        beaten.push(slot);
      }
    }

    let conceded = false;
    for (const slot of beaten) {
      // The other half of "cannot win": somebody who replaces their losses
      // fields at least as many guns. Attrition against them is one-way.
      const overmatched = standing.some(
        (other) =>
          other !== slot && earning.has(other) && (armed.get(other) ?? 0) >= (armed.get(slot) ?? 0)
      );
      if (!overmatched) continue;
      this.eliminate(slot);
      conceded = true;
    }
    if (conceded) this.resolveVictory();
  }

  /**
   * A slot leaves the match without being beaten: abandoned, or out of grace
   * on a disconnect (docs/tech-stack.md "Match lifecycle").
   *
   * Resolved as elimination rather than as "never here". Quietly dropping the
   * slot from the roster would leave a one-commander match, and the victory
   * check needs two rosters to declare a winner — so the survivor would sit in
   * a game they had already won, waiting for an enemy that no longer exists.
   */
  resign(slot: number): void {
    this.eliminate(slot);
    this.resolveVictory();
  }

  /** Mark a slot out and scuttle everything it owned. */
  private eliminate(slot: number): void {
    if (this.eliminated.has(slot)) return;
    this.eliminated.add(slot);
    // Copied before the loop: removing an entity edits the query's own list.
    const owned = this.ascending(this.owners(this.world));
    for (let i = 0; i < owned.length; i++) {
      const eid = owned[i]!;
      if (Owner.slot[eid] !== slot) continue;
      this.world.production.delete(eid);
      this.world.rallies.delete(eid);
      forgetCarried(this.world, eid);
      this.world.holds.delete(eid);
      this.echo.forget(eid);
      clearQueue(this.world, eid);
      this.world.paths.delete(eid);
      removeEntity(this.world, eid);
    }
  }

  private resolveVictory(): void {
    if (this.matchResult !== null || this.slots.length < 2) return;
    const standing = this.slots.filter((slot) => !this.eliminated.has(slot));
    if (standing.length === 1) {
      this.matchResult = { winnerSlot: standing[0]! };
    }
  }

  /**
   * Award Biomass for a kill — docs/systems-flora.md §5.
   *
   * §5: only the Directorate processes it at scale; everyone else sells
   * remains through Consortium rendering contracts at a fraction. Yield also
   * scales with the region's Drift Health, which is the guard-rail against a
   * Directorate snowball (docs/economy.md §9) — over-harvesting kills the
   * region that pays them.
   *
   * **Paid to the killer** (#560). This used to attribute a kill to the
   * nearest player entity and defend that with "the same answer in every case
   * that matters"; #535 measured what that was worth, and it was the opposite
   * of the doctrine it was standing in for. The Consortium — who render
   * nothing, whose hulls are priced in nodules, and who happen to be loud
   * enough to have something nearby — banked roughly three times the creature
   * value the Directorate did, on ground the Directorate had cleared. §5's
   * claim is that *fauna are drawn to your noise and the Directorate is paid
   * for what your noise attracts*, which requires that the payout follow the
   * gun and not the geometry.
   *
   * A creature nobody hurt pays nobody. That is the same answer §5 already
   * gives for a death the map caused (`SimWorld.environmentalDeaths`, checked
   * by the caller) rather than a consolation prize for standing nearby, and it
   * is why the sentinel is -1 instead of a slot.
   */
  private payBiomass(eid: number): void {
    const slot = Fauna.renderedBySlot[eid]!;
    if (slot < 0) return;

    const stats = faunaStatsFor(Fauna.species[eid] as FaunaSpecies);
    // The faction the slot is seated as, which the match holds and the
    // creature does not: a spore knows who seeded it but not what navy they
    // are. `factionOf` rather than the map directly, so a slot the mission
    // runtime seated is read the same way every other path reads it.
    const rate = this.factionOf(slot) === Faction.Directorate ? 1 : DRIFT.RENDERING_CONTRACT_RATE;
    const yieldScale = this.world.drift.yieldMultiplier(Position.x[eid]!, Position.y[eid]!);
    economyFor(this.world, slot).biomass += stats.biomass * rate * yieldScale;
  }

  /**
   * Everybody the Echo pass resolves for: the seated roster plus the mission's
   * scripted parties (#323). Skirmishes take the roster itself — no copy, no
   * cost — and the union is rebuilt into a held scratch array on the mission
   * path because both inputs can change (a seat leaves, and a party's slot may
   * coincide with the player's).
   */
  private echoObservers(): readonly number[] {
    if (this.scriptedObservers.length === 0) return this.slots;
    const out = this.observerScratch;
    out.length = 0;
    for (const slot of this.slots) out.push(slot);
    for (const slot of this.scriptedObservers) {
      if (!out.includes(slot)) out.push(slot);
    }
    return out;
  }

  private resolveEcho(): Map<number, EchoSnapshot> {
    const result = this.echo.run(this.world, this.slots, this.echoObservers());
    if (result.elapsedMs > this.worstEchoMs) this.worstEchoMs = result.elapsedMs;

    // Self-events, bucketed by whoever they happened to. Drained here rather
    // than at the end of the tick because the Echo snapshot is the only thing
    // that carries them, and it is built at 5 Hz while events are raised at
    // 60 Hz — so a tick's worth of them accumulates and ships together.
    const eventsBySlot = new Map<number, SelfEvent[]>();
    for (const slot of this.slots) eventsBySlot.set(slot, []);
    // One event per (kind, entity) per pass. A sustained fauna bite raises
    // Damaged on every one of the twelve sim ticks between snapshots, and all
    // twelve mean one fact: this hull is being hit. The 60 Hz channel is for
    // raising events cheaply; collapsing them is this drain's job.
    const seen = new Set<number>();
    for (const pending of this.world.selfEvents) {
      // `pending.slot`, never a fresh Owner lookup: the entity may have been
      // reaped since the event was raised, and the blow that killed a hull is
      // the one its owner most needs told about.
      const bucket = eventsBySlot.get(pending.slot);
      if (bucket === undefined) continue;
      const key = pending.eid * 8 + pending.kind;
      if (seen.has(key)) continue;
      seen.add(key);
      const event: SelfEvent = { kind: pending.kind, unitId: pending.eid };
      if (pending.bearing !== undefined) event.bearing = pending.bearing;
      if (pending.idleReason !== undefined) event.idleReason = pending.idleReason;
      bucket.push(event);
    }
    this.world.selfEvents.length = 0;

    // Being lit is raised by the Echo pass itself, so it arrives separately
    // from the 60 Hz channel above and is folded in here.
    for (const [slot, hits] of result.litBySlot) {
      const bucket = eventsBySlot.get(slot);
      if (bucket === undefined) continue;
      for (const hit of hits) {
        bucket.push({
          kind: SelfEventKind.Exposed,
          unitId: hit.unitId,
          bearing: hit.bearing,
        });
      }
    }

    // Built once and shared across every snapshot: the shoal and jelly layers
    // are public by design (docs/bestiary.md §4 — the glow is light, not
    // sound, and living terrain is chart data), so every player gets the
    // identical lists.
    const shoals = this.collectShoals();
    const jellies = this.collectJellies();
    // The same argument, and the same two lists were being rebuilt per slot
    // anyway (#430): hazard telegraphing is public (docs/maps.md — a telegraph
    // only one player can read is not one) and Drift Health is chart data.
    // One array each, shared by reference across every snapshot; nothing
    // downstream writes to either.
    const hazards = hazardStates(this.world);
    const driftHealth = this.world.drift.snapshot();

    const snapshots = new Map<number, EchoSnapshot>();
    for (const slot of this.slots) {
      const units = this.collectOwnUnits(slot);
      const structures = this.collectOwnStructures(slot);
      let peakSig = 0;
      for (const unit of units) {
        if (unit.sig > peakSig) peakSig = unit.sig;
      }
      for (const structure of structures) {
        if (structure.sig > peakSig) peakSig = structure.sig;
      }
      snapshots.set(slot, {
        tick: this.world.tick,
        units,
        structures,
        ordnance: this.collectOwnOrdnance(slot),
        contacts: result.contactsBySlot.get(slot) ?? [],
        peakSig,
        nodules: economyFor(this.world, slot).nodules,
        crystal: economyFor(this.world, slot).crystal,
        exposure: result.exposureBySlot.get(slot) ?? {
          tier: ResolutionTier.Silent,
          trackedCount: 0,
        },
        selfEvents: eventsBySlot.get(slot) ?? [],
        marks: result.marksBySlot.get(slot) ?? [],
        // Public, unlike everything else here: docs/maps.md requires hazard
        // telegraphing, and a telegraph only one player can read is not one.
        hazards,
        draw: { ...drawFor(this.world, slot) },
        biomass: economyFor(this.world, slot).biomass,
        berths: this.berthsFor(slot),
        // Own information, and sorted so a snapshot is a value rather than a
        // record of insertion order: the delta compares the whole list.
        refits: [...(this.world.refits.get(slot) ?? [])].sort((a, b) => a - b),
        driftHealth,
        shoals,
        jellies,
      });
    }
    return snapshots;
  }

  /**
   * Every living Lampfry shoal, for the public tell layer.
   *
   * The one place fauna state crosses the wire outside the contact path, and
   * it carries exactly what docs/bestiary.md §4 discloses: where the glow is,
   * and whether it is scattered. Match-local ids, like everything the wire
   * speaks.
   */
  private collectShoals(): ShoalTell[] {
    const out: ShoalTell[] = [];
    const creatures = this.ascending(this.faunaQuery(this.world));
    for (let i = 0; i < creatures.length; i++) {
      const eid = creatures[i]!;
      if (Fauna.species[eid] !== FaunaSpecies.Lampfry) continue;
      if (Health.hp[eid]! <= 0) continue;
      out.push({
        id: localIdOf(this.world, eid) ?? 0,
        x: Position.x[eid]!,
        y: Position.y[eid]!,
        depth: Position.depth[eid]!,
        scattered: Fauna.scatterS[eid]! > 0,
      });
    }
    return out;
  }

  /** Every living Tetherjelly cluster — chart data, same argument as shoals. */
  private collectJellies(): JellyCluster[] {
    const out: JellyCluster[] = [];
    const creatures = this.ascending(this.faunaQuery(this.world));
    for (let i = 0; i < creatures.length; i++) {
      const eid = creatures[i]!;
      if (Fauna.species[eid] !== FaunaSpecies.Tetherjelly) continue;
      if (Health.hp[eid]! <= 0) continue;
      out.push({
        id: localIdOf(this.world, eid) ?? 0,
        x: Position.x[eid]!,
        y: Position.y[eid]!,
        depth: Position.depth[eid]!,
      });
    }
    return out;
  }

  /** A player always sees their own units in full. */
  private collectOwnUnits(slot: number): OwnUnit[] {
    const out: OwnUnit[] = [];
    // This used to walk the Owner store from 0 to `maxEid` on the argument
    // that a query was dearer than a bounded walk. It was, for a dozen hulls
    // in a fresh world; it was not once `maxEid` had climbed through a match's
    // worth of torpedoes and the walk ran fourteen times per Echo pass (#430).
    const hulls = this.ascending(this.unitOwners(this.world));
    for (let i = 0; i < hulls.length; i++) {
      const eid = hulls[i]!;
      if (Owner.slot[eid] !== slot) continue;

      // A hull in a hold has no position of its own; the owner is told the
      // carrier's, which is where it is (docs/systems-echo.md §3). The owner
      // and nobody else: this list is the own-force payload.
      const at = hasComponent(this.world, Carried, eid) ? Carried.carrier[eid]! : eid;
      const unit: OwnUnit = {
        id: eid,
        kind: Unit.kind[eid] as UnitKind,
        x: Position.x[at]!,
        y: Position.y[at]!,
        depth: Position.depth[at]!,
        hp: Health.hp[eid]!,
        maxHp: Health.max[eid]!,
        heading: 0,
        sig: Acoustic.sig[eid]!,
        silentRunning: SilentRunning.active[eid] === 1,
        engineOff: EngineOff.active[eid] === 1,
        pressureBonus: Pressure.bonus[eid]!,
        unhealableDamage: Pressure.unhealable[eid]!,
      };
      const queue = queueView(this.world, eid);
      if (queue !== undefined) {
        unit.queuedOrders = queue.map((order) => ({ kind: order.kind, x: order.x, y: order.y }));
      }
      if (Posture.hold[eid] === 1) unit.holding = true;
      if (Posture.engage[eid] === 1) {
        unit.engaging = { x: Posture.engageX[eid]!, y: Posture.engageY[eid]! };
      }
      if (hasComponent(this.world, DepthOrder, eid) && DepthOrder.active[eid] === 1) {
        unit.depthOrder = DepthOrder.targetM[eid]!;
      }
      if (hasComponent(this.world, DepthOrder, eid) && DepthOrder.follow[eid] === 1) {
        unit.followFloor = true;
      }
      // Own information only: the player's own sour clock on their own hull
      // (docs/systems-depth.md §2). Absent while clean, so the common case
      // costs the payload nothing.
      if (Pressure.sourS[eid]! > 0) {
        unit.sourS = Pressure.sourS[eid]!;
      }
      if (
        hasComponent(this.world, Countermeasure, eid) &&
        Countermeasure.cooldownRemainingS[eid]! > 0
      ) {
        unit.decoyCooldownS = Countermeasure.cooldownRemainingS[eid]!;
      }
      if (hasComponent(this.world, DecoyMagazine, eid)) {
        unit.decoys = DecoyMagazine.decoys[eid]!;
        if (DecoyMagazine.layCooldownS[eid]! > 0) {
          unit.decoyLayCooldownS = DecoyMagazine.layCooldownS[eid]!;
        }
      }
      if (hasComponent(this.world, Magazine, eid)) {
        unit.torpedoes = Magazine.torpedoes[eid]!;
        if (Magazine.rearmRemainingS[eid]! > 0) {
          unit.rearmRemainingS = Magazine.rearmRemainingS[eid]!;
        }
      }
      // The Spinner's grown magazine, on the same terms as the torpedo one: a
      // count that only refills at a nursery is a supply line, and it is the
      // owner's own (docs/units.md, the Spinner).
      if (hasComponent(this.world, MineMagazine, eid)) {
        unit.mines = MineMagazine.mines[eid]!;
      }
      if (at !== eid) unit.aboard = at;
      if (hasComponent(this.world, Embarking, eid)) unit.embarking = Embarking.carrier[eid]!;
      if (hasComponent(this.world, Hold, eid)) {
        unit.hold = { berths: Hold.berths[eid]!, used: Hold.used[eid]! };
      }
      if (hasComponent(this.world, LandingGrant, eid) && LandingGrant.remainingS[eid]! > 0) {
        unit.landingGrantS = LandingGrant.remainingS[eid]!;
      }
      if (hasComponent(this.world, Harvester, eid)) {
        unit.cargo = Harvester.cargo[eid]!;
        unit.cargoKind = Harvester.cargoKind[eid] as ResourceKind;
        unit.throttle = Harvester.throttle[eid] as HarvestThrottle;
        // Stalled-with-reason only: a parked or fresh hull carries no reason,
        // so `idle` stays absent for every quiet the player chose (§5).
        if (Harvester.mode[eid] === HarvestMode.Idle && Harvester.idleReason[eid]! > 0) {
          unit.idle = (Harvester.idleReason[eid]! - 1) as HarvestIdleReason;
        }
      }
      out.push(unit);
    }
    return out;
  }

  /**
   * A player's own ordnance in the water.
   *
   * Sent in full, like their hulls, and for the same reason: it is theirs. The
   * enemy's view of the same torpedo goes through the Echo Layer as an ordinary
   * contact, which is what makes "you always hear it coming" a property of the
   * simulation rather than a favour the renderer does.
   */
  private collectOwnOrdnance(slot: number): OwnOrdnance[] {
    const out: OwnOrdnance[] = [];
    const shots = this.ascending(this.ordnanceOwners(this.world));
    for (let i = 0; i < shots.length; i++) {
      const eid = shots[i]!;
      if (Owner.slot[eid] !== slot) continue;

      out.push({
        id: eid,
        kind: Ordnance.kind[eid] as OrdnanceKind,
        x: Position.x[eid]!,
        y: Position.y[eid]!,
        depth: Position.depth[eid]!,
        heading: Ordnance.heading[eid]!,
        sig: Acoustic.sig[eid]!,
        remainingS: Ordnance.remainingS[eid]!,
      });
    }
    return out;
  }

  private collectOwnStructures(slot: number): OwnStructure[] {
    const out: OwnStructure[] = [];
    const yards = this.ascending(this.structureOwners(this.world));
    for (let i = 0; i < yards.length; i++) {
      const eid = yards[i]!;
      if (Owner.slot[eid] !== slot) continue;

      let buildProgress = 1;
      if (hasComponent(this.world, UnderConstruction, eid)) {
        const total = UnderConstruction.totalS[eid]!;
        buildProgress = total > 0 ? 1 - UnderConstruction.remainingS[eid]! / total : 1;
      }

      const line = this.world.production.get(eid);
      let queueProgress = 0;
      if (line !== undefined && line.queue.length > 0) {
        const total = statsFor(line.queue[0]!).buildTimeS;
        queueProgress = total > 0 ? 1 - line.remainingS / total : 1;
      }

      const structure: OwnStructure = {
        id: eid,
        kind: Structure.kind[eid] as StructureKind,
        x: Position.x[eid]!,
        y: Position.y[eid]!,
        depth: Position.depth[eid]!,
        hp: Health.hp[eid]!,
        maxHp: Health.max[eid]!,
        sig: Acoustic.sig[eid]!,
        buildProgress,
        queue: line !== undefined ? [...line.queue] : [],
        queueProgress,
      };
      if (line?.refit !== undefined) {
        const total = line.refit.totalS;
        structure.refit = {
          kind: line.refit.kind,
          progress: total > 0 ? 1 - line.refit.remainingS / total : 1,
        };
      }
      const rally = this.world.rallies.get(eid);
      if (rally !== undefined) structure.rally = { x: rally.x, y: rally.y };
      out.push(structure);
    }
    return out;
  }
}

/** Re-exported so the room layer does not need to reach into sim internals. */
export { Terrain, statsFor };
