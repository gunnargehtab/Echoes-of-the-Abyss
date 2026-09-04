/**
 * The mission, running — docs/campaign.md, docs/mission-sorrowgate.md.
 *
 * Owned by `Match` and ticked from inside `Match.step()` on the Echo tick,
 * *not* from `MatchRoom.update`. That placement is the whole trick: `stepOnce`
 * drives the step loop, so `playReplay` reproduces every beat with no new
 * replay command types, no new hash inputs and no change to `stateHash.ts`.
 * Driving it from the room would fire zero beats on playback — the exact
 * failure the long comment above `ECHO_TICK_INTERVAL` records for the Echo
 * pass itself, and the reason that comment exists.
 *
 * **What it is allowed to know.** It reads the ECS only for entities it spawned
 * itself, and it reads the player only through the player's own `EchoSnapshot`
 * — the same resolved payload the client is sent on the same tick. That is the
 * second deliberate crossing point in this codebase (docs/tech-stack.md); like
 * `ai/seat.ts` it is kept short enough to audit in one sitting, because the
 * claim "this cannot leak" is only worth what reading it is worth.
 *
 * **Why it cannot diverge.** Beats are keyed on `world.tick` alone, and every
 * objective status is re-derived from world state on every Echo tick. Nothing
 * this object remembers is independent state, so it cannot disagree with a
 * replay unless the world already had.
 *
 * It never calls `world.rng` and never forks it, so installing a mission
 * cannot shift fauna's or hazards' streams. Living under `sim/` it inherits
 * the `Math.random`/`Date` ban.
 */

import { hasComponent } from 'bitecs';
import {
  DRIFT,
  FaunaSpecies,
  FaunaStage,
  MISSION,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  detectionRatio,
  faunaStatsFor,
  thermoclineFactor,
  voiceOf,
  type CommanderAbilityView,
  type EchoSnapshot,
  type MissionAbility,
  type MissionView,
  type MissionVoice,
  type ObjectiveView,
} from '@echoes/shared';
import {
  Acoustic,
  DepthOrder,
  Fauna,
  Heading,
  Health,
  MoveOrder,
  Owner,
  Position,
  Pressure,
  SilentRunning,
  StaticEmitter,
  Structure,
} from '../components.ts';
import {
  economyFor,
  eidOfLocalId,
  localIdOf,
  spawnEmitter,
  spawnFauna,
  spawnStructure,
  spawnUnit,
  type SimWorld,
} from '../world.ts';
import { accrueSounding, soundingHolds } from './sounding.ts';
import { accrueRowHold, accrueStall, insideRow } from './walk.ts';
import { projectMissionView, type MissionState } from './view.ts';
import { directionalFactorFor } from '../directional.ts';
import { dueConditionalBeats } from './conditional.ts';
import { exposedAtLeast, inRegion, isMet, isStanding, peakSigOf } from './predicates.ts';
import type {
  MissionBeatEffect,
  MissionConditionalBeat,
  MissionDefinition,
  MissionEmitter,
  MissionRole,
  MissionSounding,
  MissionTag,
} from './types.ts';

/**
 * What tier the *player's own slot* currently resolves an entity at.
 *
 * Pre-bound to that slot by `Match`, which is the whole of its safety: the
 * runtime cannot ask this about anybody else's hearing because there is no
 * slot argument to ask with — the same shape of guarantee `predicates.ts`
 * makes with its parameter list.
 */
export type HeardTier = (eid: number) => ResolutionTier;

/** Simulation ticks between Echo passes — the cadence this runtime runs at. */
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);

/** A named load nobody is carrying — shared so `loadedFor` allocates nothing for it. */
const NO_CARRIER: ReadonlySet<number> = new Set();

/** Seconds of simulation time one mission tick covers. */
const TICK_DT_S = ECHO_TICK_INTERVAL / SIM.TICK_HZ;

/**
 * How long a creature under an authored commitment is deafened for, in seconds
 * of its own sense timer — see `holdCommitments`.
 *
 * Any figure comfortably above `TICK_DT_S` would do, since it is rewritten on
 * every mission tick. An hour is chosen so that it is unmistakably a pin rather
 * than a tuning number somebody should try to balance.
 */
const SCRIPTED_SENSE_S = 3600;

/**
 * Tags for the sound the walk and the commander's act make.
 *
 * Prefixed with a colon, which no authored tag carries — `missions.test.ts`
 * holds every literal to that — so a bell can never collide with a hull the
 * document named. These entities are the runtime's own: nothing in `docs/`
 * asks an author to place a bell, because a row *has* a bell the way it has a
 * position (habitats.md §2).
 */
const bellTag = (rowId: string): MissionTag => `:bell:${rowId}`;
const ACT_TAG: MissionTag = ':act';

/** Durability for the runtime's own emitters — the ground, not a target. */
const FIXTURE_HP = 1_000_000;

export interface MissionResolution {
  outcome: MissionOutcome;
  epilogue: string;
  objectives: ObjectiveView[];
  /**
   * Scene ids this run witnessed — docs/campaign.md §1, and
   * `MissionResultPayload.scenes` for why carrying them costs nothing.
   *
   * Empty is the normal case: thirteen of the fourteen shipped missions author
   * no scene, and a mission that authored one may still witness nothing.
   */
  scenes: readonly string[];
}

/** One authored line, spoken by a `say` beat. */
export interface MissionLine {
  tick: number;
  speaker: string;
  text: string;
  /**
   * The register it is spoken in — resolved here, never on the client, so a
   * beat that names no voice arrives already in the player's own and the
   * client has nothing to infer. The mix keys its hail on this
   * (docs/audio-direction.md §13); the log ignores it.
   */
  voice: MissionVoice;
}

/**
 * The commands a beat may issue.
 *
 * Declared structurally here rather than by importing `Match`, which would be
 * circular — and the shape is deliberate: every method is the *unrecorded* half
 * of a public command. A beat re-issues itself on playback because this runtime
 * runs inside `step()`, so recording it as well would apply it twice, and none
 * of these is idempotent. The player's own commands are recorded exactly as
 * they always were; the runtime simply has no path to the recorder.
 */
export interface MissionCommandSink {
  applyMove(slot: number, eid: number, x: number, y: number, queued: boolean): void;
  applyDepth(slot: number, eid: number, depthM: number): boolean;
  applySilent(slot: number, eid: number, active: boolean): void;
  applyPing(slot: number, eid: number): void;
}

/** A creature being driven somewhere by a beat, re-asserted until `untilTick`. */
interface Commitment {
  tag: MissionTag;
  x: number;
  y: number;
  /** The depth the transit runs at. Absent is the species' own. */
  depthM?: number;
  untilTick: number;
}

export class MissionRuntime {
  readonly definition: MissionDefinition;

  /**
   * Mission tag to match-local id — never a raw entity id.
   *
   * bitecs recycles entity ids from a process-global counter, and `match.ts`'s
   * teardown comment records what a stale handle does. The round trip through
   * `eidOfLocalId`/`localIdOf` is its own liveness check: `registerEntity`
   * overwrites the mapping when an id is recycled, so a handle to a dead thing
   * fails the identity test rather than pointing at a stranger.
   */
  private readonly tagged = new Map<MissionTag, number>();
  /**
   * Which of the player's own hulls fill each authored role, by mission tag.
   *
   * Tags rather than ids, and resolved fresh every tick, because the two id
   * spaces in play are not the same one: the tag registry is keyed on
   * match-local ids (stable across bitecs recycling) while an `EchoSnapshot`
   * reports each hull by its raw entity id. Holding either one directly would
   * make the role sets silently disagree with the snapshot they are compared
   * against — and a role set that matches nothing fails an objective quietly,
   * which is the worst way for this to break.
   */
  private readonly roleTags = new Map<MissionRole, Set<MissionTag>>();
  /** The live entity ids behind those tags, rebuilt on each tick. */
  private readonly roleIds = new Map<MissionRole, Set<number>>();
  /** Tenders held until their release beat. */
  private readonly heldUntil = new Map<MissionTag, number>();
  /** Every tender tag, so an order can be matched to one without a scan. */
  private readonly tenderTags = new Set<MissionTag>();
  /** Tenders that had an escort in range on the last pass. */
  private readonly lastEscorted = new Set<MissionTag>();
  /**
   * The world, for the order-time hold check.
   *
   * `holdsMovement` is called from a command path rather than from the tick,
   * so it has no world of its own — and resolving a tag needs one. Held from
   * the last pass, which is at most one Echo tick stale.
   */
  private lastWorld: SimWorld | null = null;
  /**
   * Held-presence ticks accrued against each lift's cut, by lift id.
   *
   * Remembered rather than derived, in exactly `debtS`'s shape and under its
   * argument: accrued at `ECHO_TICK_INTERVAL` granularity from world state
   * alone (tick and position), so a replay accrues the identical ledger.
   */
  private readonly liftProgress = new Map<string, number>();
  /** Lifts whose cut has finished. Monotone: a rigged load stays rigged. */
  private readonly loadedLifts = new Set<string>();
  /**
   * Held, bow-on ticks accrued against each sounding, by sounding id.
   *
   * `liftProgress`' shape and, deliberately, not its rule: this ledger is reset
   * by `accrueSounding` the moment the hold breaks, because §4's twenty seconds
   * are twenty seconds of *holding* rather than twenty seconds of work done.
   * Accrued from world state alone at `ECHO_TICK_INTERVAL` granularity, so a
   * replay accrues the identical ledger.
   */
  private readonly soundingProgress = new Map<string, number>();
  /**
   * Soundings whose hold has finished. Monotone, unlike the ledger above: a
   * formation that has been read has been read, and the hull may leave.
   */
  private readonly soundedIds = new Set<string>();
  /**
   * The rows of the walk that have turned, by row id — docs/mission-convocation.md
   * §4.
   *
   * A set rather than a cursor, and **not monotone**, which is the one place
   * this runtime keeps a ledger that can shrink. Ninety seconds of stall and
   * the walk returns altered: this empties, the bells of everything it held
   * ring once, and the circuit starts again at the first row. `soundedIds`
   * above is the same shape and the opposite rule, and the difference is the
   * whole of §13's "the restart is listed separately because it changes what a
   * predicate *means*".
   *
   * Derived from world state at `ECHO_TICK_INTERVAL` granularity like every
   * other ledger here, so a replay accrues the identical circuit.
   */
  private readonly turnedRows = new Set<string>();
  /** Held, quiet ticks accrued against each row, by row id. Reset by `accrueRowHold`. */
  private readonly rowHeld = new Map<string, number>();
  /** Ticks the live row has stood stalled. Continuous — `accrueStall` resets it. */
  private walkStalled = 0;
  /** Whether the live row is stalled right now. The only thing the panel is told. */
  private walkStalling = false;
  /**
   * True once the commander's act has collapsed the circuit — §4's second half:
   * every remaining row turns together rather than in sequence.
   *
   * The walk stops returning altered from this tick on, and that is a decision
   * rather than an omission: the bell has been rung, and a circuit that
   * restarted after an emergency convocation would be the mission taking back
   * the one thing it gave.
   */
  private walkCollapsed = false;
  /** Ticks each row's bell rings until, by row id. Absent is silent. */
  private readonly bellUntil = new Map<string, number>();
  /** Ticks of *continuous* foreign presence accrued against each hold, by id. */
  private readonly holdProgress = new Map<string, number>();
  /** Holds that have completed. A plateau that has been held has been held. */
  private readonly completedHolds = new Set<string>();
  /**
   * The tick the commander's one act was rung on, or -1 while it is unspent.
   *
   * Once per match (docs/characters.md), so this is the whole of the
   * bookkeeping: it is both the "spent" flag and the clock the duration is
   * measured from. A tick rather than a countdown for `deriveObjectives`'
   * reason — nothing this object remembers may be independent state, and a
   * tick stamped from `world.tick` cannot disagree with a replay.
   */
  private abilityFiredAtTick = -1;
  /**
   * The sweep's one latched fact — docs/mission-tend.md §8: the day is filed
   * if a pass resolved a working hull or a fresh mark, on either pass, and a
   * ledger does not un-hear things. Never on the wire: the reading arrives
   * with the tide, and the course bend below is the only feedback in play.
   */
  private filed = false;
  /** Windows whose course has already bent toward something heard. */
  private readonly bentWindows = new Set<number>();
  /**
   * Emitters this observer has resolved at Tier 2 or better while they were
   * sounding — the transcript's entered lines (docs/mission-attendance.md §6).
   *
   * Monotone, because a line entered against a dream is entered: the arrival
   * stops sounding twenty seconds later and the record does not un-hear it.
   */
  private readonly attendedTags = new Set<MissionTag>();
  /**
   * Sim ticks this observer's own force has stood at each resolution tier in
   * somebody else's ears, indexed by `ResolutionTier` — the tolerance's tally
   * (docs/mission-aptitude.md §5), and the mirror of `attendedTags` above.
   *
   * Kept per observed tier rather than as one running total because the
   * predicate authors the tier it enforces, and a single total accrued under
   * one rule could not answer a second objective asking a different one.
   * `exposedAtLeast` sums upward, which is where §5's "or better" lives.
   *
   * Monotone, like the transcript and for the same reason: a second the survey
   * spent listening to you is a second it spent listening to you, and
   * un-spending it would rewrite the player's history. That is also why
   * `isStanding` deliberately does not grow this predicate.
   */
  private readonly exposedByTier: number[] = [];
  /** Live carrier eids of the loaded lifts, rebuilt each tick — see `LoadedIds`. */
  private readonly loadedIds = new Set<number>();
  /** The same, keyed by lift id, for predicates that name their load. */
  private readonly loadedByLift = new Map<string, number>();
  private readonly statuses = new Map<string, ObjectiveStatus>();
  private readonly startedAt = new Map<string, number>();
  private readonly commitments: Commitment[] = [];
  private readonly lines: MissionLine[] = [];

  /** Next unfired beat. Beats are authored sorted; `missions.test.ts` asserts it. */
  private cursor = 0;
  /**
   * Conditional beats already fired, by index into `conditionalBeats`.
   *
   * A set rather than a cursor, and that is the whole difference between the
   * two lists: the schedule is walked in order because it *is* an order, and
   * this one is not — the recall's condition can come true before the coring
   * stops if a party manages thirty seconds of Classification without ever
   * standing at twenty, and a cursor would swallow the beat it skipped.
   *
   * Monotone. A beat is a thing that happened.
   */
  private readonly firedConditions = new Set<number>();
  /**
   * The tick each conditional beat was first evaluated on — `startedAt`'s
   * shape, for `startedAt`'s reason: `endure` is measured from when the rule
   * started running, and a conditional beat's rule starts running on the first
   * mission tick rather than at tick zero, which is a couple of Echo intervals
   * earlier and would quietly shorten every authored clock by them.
   */
  private readonly conditionStartedAt = new Map<number, number>();
  private debtS = 0;
  private view: MissionView | null = null;
  /** The last view built, kept for a client that needs it re-sent. */
  private latest: MissionView | null = null;
  private viewKey = '';
  private resolution: MissionResolution | null = null;
  /** A resolve beat has fired; the mission closes once this tick is derived. */
  private resolveRequested = false;
  private worstMs = 0;

  /**
   * Pressure grants a `ground` beat has switched on, by region id, overriding
   * whatever `MissionRegion.pressureBonus` authored. Beat state rather than
   * world state: it is the mission's memory of its own schedule, re-derived
   * into `world.regionPressureBonus` on every pass by `applyGrants`, and a
   * replay reaches it by re-firing the same beats at the same ticks.
   */
  private readonly grantedRegions = new Map<string, number>();

  constructor(definition: MissionDefinition) {
    this.definition = definition;
    for (const objective of definition.objectives) {
      this.statuses.set(objective.id, objective.initial);
    }
  }

  /**
   * Seat the player and place every authored force. Called once, from the
   * `Match` constructor — not from the room, so replay playback gets it too.
   *
   * **Only the player's slot is seated; the scripted parties are observed.**
   * Seating stays the player's alone so `resolveVictory`'s two-roster rule is
   * untouched (a mission is not a fight somebody wins), the Echo pass builds
   * one snapshot instead of six, and five scripted navies stay out of the
   * lobby's faction-uniqueness check. But an `Owner.slot` alone is not enough
   * either, and believing it was is filed as #323: the Echo Layer's pair loop
   * hears *by* `Owner.slot`, so an unobserved party still emits and still
   * lights the player when it pings — yet exposure is materialised only for
   * observers, so a party the pass never resolves *for* can stand at
   * point-blank Classification without the player's `ExposureReport` ever
   * leaving Silent, and every `tolerance` predicate authored against
   * docs/mission-aptitude.md §5 stays shut for the whole mission. `observe`
   * hands each party to the Echo pass as a listener without a seat.
   */
  install(world: SimWorld, seat: (slot: number) => void, observe: (slot: number) => void): void {
    seat(this.definition.playerSlot);
    for (const party of this.definition.parties) {
      if (party.slot !== this.definition.playerSlot) observe(party.slot);
    }

    // Water a mission authored as habitable is habitable from the first tick,
    // not from the first mission pass. Crush is charged at 60 Hz and this
    // runtime ticks at 5, so a hull seated inside an authored furrow would
    // otherwise pay four points a second for the twelve ticks before
    // `applyGrants` first ran — a mission billing a player for the two hundred
    // milliseconds before it started. Beat-sown grants have no such problem:
    // a beat fires on a mission pass and `applyGrants` runs on the same one.
    this.applyGrants(world);

    // A mission grants no stockpile unless it authors one.
    //
    // `economyFor` hands out the skirmish opening balance to whoever asks
    // first, which for the prologue would be six hundred nodules in a court
    // with no fields, no refinery and nothing to spend them on
    // (docs/mission-sorrowgate.md §11). Zeroed here rather than left to the
    // client to hide, because affordability is the server's answer.
    const economy = economyFor(world, this.definition.playerSlot);
    economy.nodules = this.definition.startingNodules ?? 0;
    economy.crystal = 0;
    economy.biomass = 0;

    for (const party of this.definition.parties) {
      for (const unit of party.units) {
        const eid = spawnUnit(world, {
          kind: unit.kind,
          slot: party.slot,
          faction: party.faction,
          x: unit.x,
          y: unit.y,
          depth: unit.depthM,
          // Weapons-cold unless the literal arms the hull. Cold is the
          // default for Sorrowgate's reason — hostility is ownership and the
          // simulation has no neutrality, so armed parties parked around one
          // exchange would open fire on tick zero (docs/mission-sorrowgate.md
          // §3) — and a mission arms a hull only where its document does
          // (docs/mission-asset-recovery.md §3: the writ's escorts are guns).
          weaponsCold: unit.armed !== true,
        });
        if (eid === 0) continue;
        this.register(world, unit.tag, eid);
        if (unit.pressureRating !== undefined && hasComponent(world, Pressure, eid)) {
          // A court refit, not a roster change: the hull holds Mid-Water and
          // stops there, which is what makes depth a floor in this mission
          // rather than a bleed.
          Pressure.rating[eid] = unit.pressureRating;
        }
        // A role is only ever given to a hull of the player's own party, which
        // is what lets a predicate address a role without being able to name
        // anybody else's force. `missions.test.ts` holds the literal to it.
        if (unit.role !== undefined && party.slot === this.definition.playerSlot) {
          this.tagsFor(unit.role).add(unit.tag);
          if (unit.role === 'tender') this.tenderTags.add(unit.tag);
        }
        if (unit.releaseTick !== undefined) this.heldUntil.set(unit.tag, unit.releaseTick);
      }

      for (const structure of party.structures ?? []) {
        const eid = spawnStructure(world, {
          kind: structure.kind,
          slot: party.slot,
          faction: party.faction,
          x: structure.x,
          y: structure.y,
          depth: structure.depthM,
          prebuilt: true,
        });
        if (eid !== 0) this.register(world, structure.tag, eid);
      }

      for (const emitter of party.emitters ?? []) {
        // Seated on the party's slot so the Echo Layer resolves it per
        // observer like everything audible; classification names nothing
        // because there is nothing there to name (see `MissionEmitter`).
        const eid = spawnEmitter(world, {
          slot: party.slot,
          faction: party.faction,
          x: emitter.x,
          y: emitter.y,
          depth: emitter.depthM,
          sig: emitter.sig,
          periodTicks: emitter.periodTicks,
          onTicks: emitter.onTicks,
          hp: emitter.hp,
        });
        if (eid !== 0) this.register(world, emitter.tag, eid);
      }
    }

    this.placeFixtures(world);
  }

  /**
   * The sound the walk and the commander's act make — one emitter per row, one
   * for the act, all silent until something rings them.
   *
   * Placed here rather than authored on a party for a reason the format is
   * emphatic about elsewhere: a row *has* a bell the way it has a position
   * (habitats.md §2 — "the bell is a loud event at a fixed tick"), so asking an
   * author to place seven of them beside seven rows would be seven chances to
   * place six. Spawned once, at install, rather than at the moment of ringing,
   * so no entity is created mid-match and the id allocation a replay walks is
   * the one the recording walked.
   *
   * **On the player's own slot**, which is the opposite of the rule
   * `MissionEmitter` states and right for the opposite reason. An authored
   * emitter is never on the player's party because the player has to be able to
   * *hear* it; a bell is not something the plateau listens for, it is something
   * the plateau does — and the whole price of ringing one is that everybody
   * else hears it. Ownership here is the fiction: the plateau identifies
   * itself, and it identifies itself.
   *
   * A period of one tick with one tick on means "loud whenever active", so the
   * ring's length is `StaticEmitter.active` and nothing else — the pattern
   * machinery is for struck iron, and a bell is not struck twice.
   */
  private placeFixtures(world: SimWorld): void {
    const slot = this.definition.playerSlot;
    const faction = this.definition.playerFaction;
    const walk = this.definition.walk;
    if (walk !== undefined) {
      for (const row of walk.rows) {
        const eid = spawnEmitter(world, {
          slot,
          faction,
          x: row.x,
          y: row.y,
          depth: walk.bell.depthM,
          sig: walk.bell.sig,
          periodTicks: 1,
          onTicks: 1,
          hp: FIXTURE_HP,
        });
        if (eid === 0) continue;
        StaticEmitter.active[eid] = 0;
        this.register(world, bellTag(row.id), eid);
      }
    }
    const ability = this.definition.commanderAbility;
    if (ability === undefined) return;
    const eid = spawnEmitter(world, {
      slot,
      faction,
      x: ability.x,
      y: ability.y,
      depth: ability.depthM,
      sig: ability.sig,
      periodTicks: 1,
      onTicks: 1,
      hp: FIXTURE_HP,
    });
    if (eid === 0) return;
    StaticEmitter.active[eid] = 0;
    this.register(world, ACT_TAG, eid);
  }

  /**
   * True when the mission is holding this hull still.
   *
   * The escort rule is a *continuous* condition, so the tick pass below clamps
   * it — but clamping alone is porous: the runtime runs at 5 Hz and movement
   * runs at 60, so a re-issued order walks the tender twelve ticks before the
   * next clamp catches it. Refusing the order too closes that, and it is the
   * same shape as the ability locks: the server says no, and the panel has
   * already said why (docs/mission-sorrowgate.md §8).
   */
  holdsMovement(slot: number, eid: number): boolean {
    if (slot !== this.definition.playerSlot) return false;
    if (this.lastWorld === null) return false;

    // `releaseTick` first, and by tag rather than by role. types.ts states the
    // field's contract with no role in it — "held by the runtime until this
    // tick, whatever the player orders" — and the runtime kept it only for
    // hulls that were also tenders, because the only mission that had authored
    // one was Sorrowgate, where every held hull was. Eight shipped literals
    // name no `tender` at all, so a `releaseTick` on any of them was recorded
    // and never enforced.
    //
    // A leading branch and not a wider `tagOfTender`: the escort half below
    // reads `lastEscorted`, which `applyEscortHold` writes for tenders alone,
    // so resolving every player hull through that lookup would hold every hull
    // in those eight missions forever.
    const held = this.tagOfHeld(eid);
    if (held !== null && this.lastWorld.tick < (this.heldUntil.get(held) ?? 0)) return true;

    const tag = this.tagOfTender(eid);
    if (tag === null) return false;
    if (this.lastWorld.tick < (this.heldUntil.get(tag) ?? 0)) return true;
    return this.lastEscorted.has(tag) === false;
  }

  /** The held tag behind this entity, or null when nothing holds it. */
  private tagOfHeld(eid: number): MissionTag | null {
    for (const tag of this.heldUntil.keys()) {
      if (this.lastWorld !== null && this.eidOf(this.lastWorld, tag) === eid) return tag;
    }
    return null;
  }

  /** The tender tag behind this entity, or null when it is not a tender. */
  private tagOfTender(eid: number): MissionTag | null {
    for (const tag of this.tenderTags) {
      if (this.lastWorld !== null && this.eidOf(this.lastWorld, tag) === eid) return tag;
    }
    return null;
  }

  /**
   * True for an ability this mission withholds from this slot.
   *
   * The locks are the player's, and only the player's: a scripted party's ping
   * is the mission happening, not a rule being broken.
   */
  denies(slot: number, ability: MissionAbility): boolean {
    if (slot !== this.definition.playerSlot) return false;
    return this.definition.locks.some((lock) => lock.ability === ability);
  }

  /**
   * One Echo tick: fire due beats, hold the creatures on course, apply the
   * escort hold and the silence ledger, re-derive every objective from the
   * player's own snapshot, and rebuild the view.
   */
  tick(
    world: SimWorld,
    sink: MissionCommandSink,
    own: EchoSnapshot,
    heardTier: HeardTier = () => ResolutionTier.Silent
  ): MissionResolution | null {
    if (this.resolution !== null) return null;
    const started = performance.now();
    this.lastWorld = world;

    this.fireDueBeats(world, sink);
    this.holdCommitments(world);
    this.resolveRoleIds(world);
    this.applyLifts(world);
    this.applySoundings(world);
    this.applyAbility(world);
    this.applyGrants(world);
    this.applyWalk(world, own);
    this.applyHolds(world);
    this.applyEmitters(world);
    this.applyAttendance(world, heardTier);
    this.applyTolerance(own);
    this.applySweep(world, sink);
    this.applyEscortHold(world, own);
    this.applySilenceLedger(world, own);
    this.fireConditionalBeats(world, sink, own);
    this.deriveObjectives(world, own);
    if (this.resolveRequested) this.resolve();
    this.rebuildView(own);

    const cost = performance.now() - started;
    if (cost > this.worstMs) this.worstMs = cost;
    return this.resolution;
  }

  /** The view, or null when nothing changed since the last drain. */
  takeView(): MissionView | null {
    const view = this.view;
    this.view = null;
    return view;
  }

  /**
   * The current view, without draining it — for a client that has just
   * (re)joined and missed every edge so far.
   */
  get currentView(): MissionView | null {
    return this.latest;
  }

  /** Authored lines a `say` beat produced since the last drain. */
  takeLines(): MissionLine[] {
    if (this.lines.length === 0) return [];
    return this.lines.splice(0, this.lines.length);
  }

  get worstMsCost(): number {
    return this.worstMs;
  }

  // --- Beats ---------------------------------------------------------------

  private fireDueBeats(world: SimWorld, sink: MissionCommandSink): void {
    const beats = this.definition.beats;
    while (this.cursor < beats.length && beats[this.cursor]!.atTick <= world.tick) {
      this.fire(world, sink, beats[this.cursor]!);
      this.cursor++;
    }
  }

  /**
   * The other list — docs/mission-aptitude.md §13's row.
   *
   * Evaluated **after** every tally this tick has been updated and immediately
   * before the objectives are derived from the same snapshot, which is the one
   * placement that keeps the panel and the water telling the same story. §5's
   * warning is the survey reacting to a number the player is already looking
   * at, so the tick the reading says twenty has to be the tick the barge stops
   * coring; firing these at the top of the tick beside the schedule would
   * evaluate them against last pass's tolerance and put the coring an Echo
   * interval behind its own cause.
   *
   * On the mission tick's budget, and bounded by authorship the way the
   * emitters and the soundings are: one `isMet` per unfired conditional beat
   * per pass, over a list a mission writes by hand, and each beat leaves the
   * list for good the moment it fires.
   */
  private fireConditionalBeats(world: SimWorld, sink: MissionCommandSink, own: EchoSnapshot): void {
    const beats = this.definition.conditionalBeats;
    if (beats === undefined) return;
    const due = dueConditionalBeats(beats, this.firedConditions, (beat, index) => {
      if (!this.conditionStartedAt.has(index)) this.conditionStartedAt.set(index, world.tick);
      return this.meets(beat.when, own, this.conditionStartedAt.get(index) ?? world.tick);
    });
    for (const index of due) {
      this.firedConditions.add(index);
      this.fire(world, sink, beats[index]!);
    }
    // The choice groups (types.ts, `choiceGroup`): after everything due this
    // pass has fired, retire every unfired beat sharing a fired beat's group.
    // After, not during, so two effects hung on one condition fire together
    // before their group closes behind them.
    if (due.length > 0) {
      const closed = new Set<string>();
      for (const index of due) {
        const group = beats[index]!.choiceGroup;
        if (group !== undefined) closed.add(group);
      }
      if (closed.size > 0) {
        for (let i = 0; i < beats.length; i++) {
          const group = beats[i]!.choiceGroup;
          if (group !== undefined && closed.has(group)) this.firedConditions.add(i);
        }
      }
    }
  }

  /**
   * One predicate, against the snapshot this slot is being sent on this tick.
   *
   * Shared by the objectives and the conditional beats so the number a beat
   * fires on and the number the panel reads out are the same one, computed
   * under the same rule — `peakSigOf`'s argument, applied to the whole
   * predicate vocabulary rather than to one of its cases. It is also the only
   * place the tallies are handed out, which keeps `predicates.ts`' parameter
   * list the single audit point it is documented as being.
   */
  private meets(
    predicate: MissionConditionalBeat['when'],
    own: EchoSnapshot,
    startedTick: number
  ): boolean {
    return isMet(
      predicate,
      own,
      (role) => this.idsFor(role as MissionRole),
      (id) => this.definition.regions.find((region) => region.id === id),
      startedTick,
      (lift) => this.loadedFor(lift),
      this.attendedTags.size,
      (tier) => exposedAtLeast(this.exposedByTier, tier),
      this.soundedIds.size,
      this.turnedRows.size
    );
  }

  private fire(world: SimWorld, sink: MissionCommandSink, beat: MissionBeatEffect): void {
    switch (beat.kind) {
      case 'move': {
        const eid = this.eidOf(world, beat.tag);
        if (eid === 0) return;
        sink.applyMove(Owner.slot[eid]!, eid, beat.x, beat.y, false);
        if (beat.depthM !== undefined) sink.applyDepth(Owner.slot[eid]!, eid, beat.depthM);
        return;
      }
      case 'ping': {
        const eid = this.eidOf(world, beat.tag);
        // The mission's central event, and it goes through the same validated
        // path a player's ping does: SIG 95, a Tier-4 reveal, and the player
        // lit on the far side of it.
        if (eid !== 0) sink.applyPing(Owner.slot[eid]!, eid);
        return;
      }
      case 'silent': {
        const eid = this.eidOf(world, beat.tag);
        if (eid !== 0) sink.applySilent(Owner.slot[eid]!, eid, beat.active);
        return;
      }
      case 'creature': {
        let eid = this.eidOf(world, beat.tag);
        if (eid === 0 && beat.spawnAt !== undefined && beat.species !== undefined) {
          eid = spawnFauna(world, {
            species: beat.species,
            x: beat.spawnAt.x,
            y: beat.spawnAt.y,
            depth: beat.spawnAt.depthM,
          });
          if (eid !== 0) this.register(world, beat.tag, eid);
        }
        if (eid === 0) return;
        // One creature, one commitment: a second beat for the same tag
        // *replaces* the first rather than joining it. Sorrowgate turns the
        // colossus toward the basin at 10:40 while its 09:20 drive to the gate
        // is still live to the tick, and `holdCommitments` walks the list
        // backwards — so without this the older commitment writes last and the
        // transit stutters back toward the chamber on the one tick the player
        // is watching it leave.
        const stale = this.commitments.findIndex((held) => held.tag === beat.tag);
        if (stale !== -1) this.commitments.splice(stale, 1);
        this.commitments.push({
          tag: beat.tag,
          x: beat.driveTo.x,
          y: beat.driveTo.y,
          depthM: beat.driveTo.depthM,
          untilTick: beat.untilTick,
        });
        return;
      }
      case 'lose': {
        const eid = this.eidOf(world, beat.tag);
        // Zero the hull and let `reap` do the rest. Killing an entity from
        // outside a system any other way skips the teardown that keeps a
        // recycled id from inheriting a live contact handle.
        if (eid !== 0 && hasComponent(world, Health, eid)) Health.hp[eid] = 0;
        return;
      }
      case 'release':
        this.heldUntil.delete(beat.tag);
        return;
      case 'ground': {
        const region = this.definition.regions.find((candidate) => candidate.id === beat.region);
        // A beat naming a region that does not exist is an authoring error, and
        // it is one the mission test catches by name. Silently doing nothing
        // here is right at runtime: a mission mid-flight is not the place to
        // throw, and the ground simply stays as the map authored it.
        if (region === undefined) return;
        // Every field is optional and the beat may carry only a grant, so the
        // repaint is skipped when it says nothing about ground or water —
        // `fillGround` with three undefineds would otherwise walk the
        // rectangle to write nothing.
        if (beat.floorM !== undefined || beat.ceilingM !== undefined || beat.biome !== undefined) {
          world.terrain.fillGround(region.x, region.y, region.widthM, region.heightM, {
            floorM: beat.floorM,
            ceilingM: beat.ceilingM,
            biome: beat.biome,
          });
        }
        // The grant is remembered against the region id rather than written
        // into the map, because it is not a property of the ground: it is the
        // mission's, it is rebuilt into `world` on every pass, and it has to
        // survive a reload of the terrain it stands over. Zero is a real value
        // and removes an authored grant, which is what a furrow that fails
        // does — so the test is `undefined`, never falsy.
        if (beat.pressureBonus !== undefined)
          this.grantedRegions.set(region.id, beat.pressureBonus);
        return;
      }
      case 'objective':
        // A beat never fails an objective the player has met —
        // `deriveObjectives`' own invariant, held against beats too: reaching
        // the aperture is a thing that happened, and un-happening it would
        // rewrite the player's history. The case is real, not defensive:
        // docs/mission-tolerance.md §6 fires "the other aperture fails" off
        // each delivery, and a player who sets the casting and then drives
        // the empty barge through the second aperture's water would
        // otherwise trip the mirror conditional and lose the seal they set.
        if (
          beat.status === ObjectiveStatus.Failed &&
          this.statuses.get(beat.id) === ObjectiveStatus.Met
        ) {
          return;
        }
        this.statuses.set(beat.id, beat.status);
        return;
      case 'bell':
        // Every row, at the walk's own figure and for its own length. A
        // convening is not a partial act (habitats.md §2).
        this.ring(world, () => true, this.definition.walk?.bell.ticks ?? 0);
        return;
      case 'say':
        this.lines.push({
          tick: world.tick,
          speaker: beat.speaker,
          text: beat.text,
          voice: beat.voice ?? voiceOf(this.definition.playerFaction),
        });
        return;
      case 'resolve':
        // Deferred, not applied here. Beats fire before objectives are
        // re-derived, so resolving inside the beat would close the mission
        // against last tick's world — and a tender that crossed the line in
        // the final 0.2 s would be counted as behind the gate. The court reads
        // the count it has, not the one it had.
        this.resolveRequested = true;
        return;
    }
  }

  /**
   * Hold committed creatures on their authored course.
   *
   * Re-asserted every Echo tick rather than set once, because the fauna
   * system's own escalate-and-cool bookkeeping would otherwise walk the
   * creature off the beat. With no target and the Committed stage, `pursue`
   * drives toward `homeX`/`homeY` and `Acoustic.sig` sits at the species'
   * active figure — which is what makes the approach the loudest thing on the
   * map, and audible long before it arrives.
   *
   * **A scripted creature is deafened, not merely corrected.** Clearing
   * `targetEid` here is not enough on its own and it is worth being explicit
   * about why: this runs at 5 Hz and `faunaSystem` runs at 60, so between two
   * passes of this method `listen` can acquire a hull and `act` can steer at
   * it, match its depth, and — for a Sounder, which does not stop at weapons
   * range — grind straight through it. Roughly two ticks in five of a five-
   * minute approach, with the flight under a silence order and unable to shoot
   * back. So `senseS` is pinned instead: the creature never listens, so it
   * never has a target to be corrected out of. That is also the fiction
   * exactly — docs/mission-sorrowgate.md §7 has the colossus answering an
   * emission and never noticing the flight at all, and a creature that does
   * not listen is what that sentence describes.
   */
  private holdCommitments(world: SimWorld): void {
    for (let i = this.commitments.length - 1; i >= 0; i--) {
      const commitment = this.commitments[i]!;
      if (world.tick > commitment.untilTick) {
        this.commitments.splice(i, 1);
        // Give the creature its ears back on the way out. `senseS` is pinned
        // below for as long as the commitment holds, and left pinned it would
        // outlast the mission: a released creature would be permanently deaf,
        // drifting home and never hearing a thing. Set to the ordinary
        // interval rather than to zero so it re-acquires on its own cadence
        // instead of on the tick the beat happened to end.
        const released = this.eidOf(world, commitment.tag);
        if (released !== 0 && hasComponent(world, Fauna, released)) {
          Fauna.senseS[released] = DRIFT.SENSE_INTERVAL_S;
          // And its own water back: a transit's depth is the transit's, and a
          // released creature holds the species' band again.
          Fauna.homeDepth[released] = faunaStatsFor(
            Fauna.species[released] as FaunaSpecies
          ).workingDepthM;
          // And its hull: a released creature is the Drift's again, and the
          // Drift can be shot. This is what keeps a placed Hollow — committed
          // to its own spawn for no ticks at all — renderable for the band.
          Fauna.driven[released] = 0;
        }
        continue;
      }
      const eid = this.eidOf(world, commitment.tag);
      if (eid === 0 || !hasComponent(world, Fauna, eid)) {
        this.commitments.splice(i, 1);
        continue;
      }
      // Driven to a place rather than at a hull: `pursue` falls back to
      // `homeX`/`homeY` whenever there is no target, whatever the stage, and
      // it is the *absence* of a target that keeps this authored rather than
      // emergent — the colossus is answering the emission, not hunting the
      // player, and docs/mission-sorrowgate.md §7 turns on it never noticing
      // the flight at all.
      Fauna.homeX[eid] = commitment.x;
      Fauna.homeY[eid] = commitment.y;
      // The depth the document put the line at, or the species' own. Held
      // every pass for `homeX`'s reason: `act` climbs or sinks toward it at
      // the Drift's vertical speed, and nothing else may pull it off.
      Fauna.homeDepth[eid] =
        commitment.depthM ?? faunaStatsFor(Fauna.species[eid] as FaunaSpecies).workingDepthM;
      Fauna.targetEid[eid] = 0;
      Fauna.stage[eid] = FaunaStage.Committed;
      // Deaf for the length of the commitment. `faunaSystem` counts this down
      // by `dt` and only calls `listen` when it reaches zero, so a figure well
      // past any Echo interval means it never reaches zero while the mission
      // is holding this creature. The expiry branch above puts it back.
      Fauna.senseS[eid] = SCRIPTED_SENSE_S;
      // And unkillable by weapons for the same length. The beat is the
      // document's, and a gun that could end it early would be the roster
      // overruling the mission — which is exactly what twelve idle guns at
      // Intake's muster did to its colossus before this was written (#349).
      // The `lose` beat still zeroes a hull directly; the document may kill
      // what it drives, the player may not.
      Fauna.driven[eid] = 1;
      // A targetless Committed creature is moved to Cooling by the ladder on
      // the very next tick. That is fine and deliberate: Cooling still drives
      // toward home and still emits at `sigActive`, so the approach stays the
      // loudest thing on the map. What must not happen is Cooling running out
      // — that would drop it to Ambient, quiet, and drifting away — so the
      // timer is held full and the quiet counter cleared on every pass.
      Fauna.quietS[eid] = 0;
      Fauna.coolingS[eid] = DRIFT.COOLING_S;
    }
  }

  // --- The mission's rules -------------------------------------------------

  /**
   * A tender moves only while an escort is close enough to hear for it.
   *
   * The tenders are deaf, the route out is a drowned district full of hard
   * acoustic shadows, and a deaf hull in one does not move without ears
   * (docs/mission-sorrowgate.md §8). This is the escort, and it is made
   * entirely of listening and position — nothing is shot at. Enforced here,
   * server-side, because a client that decided for itself when a tender may
   * move would be deciding the mission.
   *
   * **Both axes, and the vertical one is not an afterthought.** §9 gives
   * 16:00–19:00 to "the run north *and the climb*", and the climb is 1,150 m
   * of the journey out. Clamping `MoveOrder` alone left a tender that had been
   * given a depth order rising the whole way with no ears, frozen horizontally
   * the entire time — a hull stopped dead and ascending, which reads as a bug
   * whatever the rule says. `Match.orderDepth` refuses the *order*; this is the
   * continuous half, for an order that was legal when it was given and stopped
   * being so when the flight flew off.
   */
  private applyEscortHold(world: SimWorld, own: EchoSnapshot): void {
    // Radius zero is the rule switched off (types.ts, `escortRadiusM`): every
    // tender reads as escorted, which also settles `holdsMovement` through
    // `lastEscorted`, while a `releaseTick` hold keeps its own force — the
    // writ's schedule is not the escort's permission.
    const disabled = this.definition.escortRadiusM <= 0;
    const escorts = this.idsFor('escort');
    for (const party of this.definition.parties) {
      if (party.slot !== this.definition.playerSlot) continue;
      for (const unit of party.units) {
        if (unit.role !== 'tender') continue;
        const eid = this.eidOf(world, unit.tag);
        if (eid === 0 || !hasComponent(world, MoveOrder, eid)) continue;
        const held = world.tick < (this.heldUntil.get(unit.tag) ?? 0);
        const escortedNow = disabled || this.escorted(own, escorts, eid);
        if (escortedNow) this.lastEscorted.add(unit.tag);
        else this.lastEscorted.delete(unit.tag);
        if (held || !escortedNow) {
          MoveOrder.active[eid] = 0;
          if (hasComponent(world, DepthOrder, eid)) DepthOrder.active[eid] = 0;
        }
      }
    }
  }

  /**
   * The loudest hull the silence order actually binds.
   *
   * Not `own.peakSig`, which is the peak across everything the player owns —
   * and that includes the tenders, which the order does not bind: the order is
   * a condition of admission and the court cannot admit itself
   * (docs/mission-sorrowgate.md §4). A Harvester idles at 18 and runs at 40, so
   * measuring the whole force would have the flight in permanent debt for the
   * court's own freight being what it is, and the array would be withdrawn for
   * a rule nobody broke.
   *
   * Shares `peakSigOf` with the `quiet` predicate on purpose: the number the
   * court enforces and the number it reads out to the player have to be the
   * same one, and they were not until a test caught them disagreeing.
   */
  private flightPeakSig(own: EchoSnapshot): number {
    // The set the order actually binds, authored per mission (`silenceRole`):
    // Sorrowgate's flight, Attendance's shift. Defaulted rather than required,
    // because the prologue's word is the one every mission before this had.
    return peakSigOf(own, this.idsFor(this.definition.silenceRole ?? 'escort'));
  }

  /** True when any escort hull is inside the authored radius of this tender. */
  private escorted(own: EchoSnapshot, escorts: ReadonlySet<number>, tenderEid: number): boolean {
    const tx = Position.x[tenderEid]!;
    const ty = Position.y[tenderEid]!;
    const radius = this.definition.escortRadiusM;
    for (const unit of own.units) {
      if (!escorts.has(unit.id)) continue;
      if (Math.hypot(unit.x - tx, unit.y - ty) <= radius) return true;
    }
    return false;
  }

  /**
   * The lifts — the hold-and-cut of docs/mission-asset-recovery.md §8, and the
   * gift run of docs/mission-tend.md §13 as its cut-time-zero case.
   *
   * Presence, counted: a carrier inside its lift's region accrues one Echo
   * interval of cut per pass, and the load rigs the pass its ledger reaches
   * the authored figure. Progress pauses while the hull is elsewhere rather
   * than resetting — the cut is work done to rock, and leaving does not undo
   * it — which also keeps the rule legible: the meter tells the player the cut
   * is running, and coming back resumes it where it stood.
   *
   * `world.liftCutSig` is cleared and rebuilt whole every pass, the
   * `spireActive` arrangement, so a floor can never outlive its cut: a barge
   * that leaves mid-cut goes quiet on the next mission tick, a rigged load
   * never hums, and a recycled entity id cannot inherit a stranger's loudness.
   * A cut of zero ticks rigs on arrival and never touches the meter at all —
   * the gift is the strongest social gesture the setting has, not a work site.
   *
   * `loadedIds` is rebuilt from tags each pass for `deriveObjectives`' reason:
   * the snapshot reports raw entity ids, and a held id would silently disagree
   * with it. A carrier that dies simply stops resolving, so the load drops out
   * of every counter — which is what makes "machinery lost" a result the
   * epilogue can read rather than a retry.
   */
  private applyLifts(world: SimWorld): void {
    world.liftCutSig.clear();
    this.loadedIds.clear();
    this.loadedByLift.clear();
    for (const lift of this.definition.lifts ?? []) {
      const eid = this.eidOf(world, lift.tag);
      if (this.loadedLifts.has(lift.id)) {
        if (eid !== 0) {
          this.loadedIds.add(eid);
          this.loadedByLift.set(lift.id, eid);
        }
        continue;
      }
      if (eid === 0) continue;
      const region = this.definition.regions.find((candidate) => candidate.id === lift.region);
      if (region === undefined) continue;
      if (!inRegion(region, Position.x[eid]!, Position.y[eid]!)) continue;
      if ((this.liftProgress.get(lift.id) ?? 0) >= lift.cutTicks) {
        this.loadedLifts.add(lift.id);
        this.loadedIds.add(eid);
        this.loadedByLift.set(lift.id, eid);
        continue;
      }
      // Silence stops the work — docs/systems-echo.md §6's cannot-work price,
      // as docs/mission-tend.md §3 states it: "SIG falls to single digits,
      // the share stops accruing". A silent carrier neither accrues cut nor
      // holds the authored floor, or the stillness could not stop the work
      // and going quiet would cost nothing — the trade the button *is*.
      if (hasComponent(world, SilentRunning, eid) && SilentRunning.active[eid] === 1) {
        continue;
      }
      this.liftProgress.set(lift.id, (this.liftProgress.get(lift.id) ?? 0) + ECHO_TICK_INTERVAL);
      world.liftCutSig.set(eid, lift.cutSig);
    }
  }

  /**
   * The soundings — docs/mission-aptitude.md §4, and the mechanism the mission
   * is named for: a formation read by hand, from within an authored radius,
   * **bow on it**, held for an authored span at an authored SIG.
   *
   * `applyLifts` above with a bearing added (§13), and the three differences
   * are the three things a bearing changes. The hold is against a point and a
   * radius rather than a region, because a facing has to be taken *to*
   * somewhere. The hold *aims* the hull, so a player who points it the short
   * way has spent the SIG budget without meaning to — that is the lesson, and
   * `soundingHolds` is where it is enforced. And a broken hold resets rather
   * than pausing (`accrueSounding` states why), which is the one decision this
   * row makes that the lift's does not.
   *
   * `world.soundingSig` is cleared and rebuilt whole every pass, the
   * `liftCutSig` arrangement and for its reasons: a floor can never outlive its
   * hold, a hull that turns away goes quiet on the next mission tick, and a
   * recycled entity id cannot inherit a stranger's loudness.
   *
   * On the mission tick's budget, and bounded by authorship: one hypot and one
   * dot product per authored sounding, which is a handful per pass at 5 Hz.
   */
  private applySoundings(world: SimWorld): void {
    world.soundingSig.clear();
    for (const sounding of this.definition.soundings ?? []) {
      if (this.soundedIds.has(sounding.id)) continue;
      const eid = this.eidOf(world, sounding.tag);
      const holding = eid !== 0 && this.holdingSounding(world, eid, sounding);
      // Every way of not holding lands here, a hull the mission has lost
      // included: that is the ultimate broken hold, and freezing its ledger
      // instead would leave a half-read formation waiting for a hull that is
      // never coming back.
      const held = accrueSounding(
        this.soundingProgress.get(sounding.id) ?? 0,
        holding,
        ECHO_TICK_INTERVAL
      );
      this.soundingProgress.set(sounding.id, held);
      if (!holding) continue;
      world.soundingSig.set(eid, sounding.sig);
      if (held >= sounding.holdTicks) this.soundedIds.add(sounding.id);
    }
  }

  /**
   * Whether this hull is taking this sounding this instant — the geometry of
   * `soundingHolds`, plus the two things it cannot see.
   *
   * **No bow, no sounding.** `Heading` is added by `spawnUnit` and by nothing
   * else (docs/systems-echo.md §8), so asking for the component is the same
   * question as "is this a hull": a structure cannot be pointed at a formation
   * any more than it can be driven to one.
   *
   * **Silence stops the work**, as it stops a cut and for the same words —
   * docs/systems-echo.md §6's cannot-work price. Here it costs the hold
   * outright rather than pausing it, and that is docs/mission-aptitude.md §4's
   * arithmetic arriving as a rule: a hull that runs silent to take a sounding
   * quietly loses the sounding, and turning around was always the better trade.
   */
  private holdingSounding(world: SimWorld, eid: number, sounding: MissionSounding): boolean {
    if (hasComponent(world, SilentRunning, eid) && SilentRunning.active[eid] === 1) return false;
    if (!hasComponent(world, Heading, eid)) return false;
    return soundingHolds(sounding, Heading.rad[eid]!, Position.x[eid]!, Position.y[eid]!);
  }

  /**
   * The walk — docs/mission-convocation.md §4, and the mechanism the mission is
   * named for: "A row **turns** when a live Commune hull has held inside its
   * 400 m for sixty seconds *and* the row's water has stayed under the ceiling
   * for all of it."
   *
   * `applySoundings` above with the bearing taken out and three things put in,
   * and each of the three is a decision the sounding did not have to make:
   *
   * **The circuit is a sequence.** Only the first unturned row is live, so the
   * plateau's question is somewhere rather than everywhere, and the mission is
   * "a continuous act of moving a small force around a large terrace ahead of a
   * question" (§4.3) rather than a checklist. Until the bell collapses it.
   *
   * **The ceiling is on the row's own water, not on the hull's SIG.** Measured
   * over the player's own hulls standing inside the radius, off the snapshot
   * they are already being sent — so the number the panel could compute and the
   * number the row enforces are the same one, `peakSigOf`'s argument applied to
   * a place instead of to a role. The bells are not in it: a bell ringing on a
   * row is the walk restarting or the plateau convening, and neither is a hull
   * failing to be quiet.
   *
   * **The stall is the one thing in this format that reads another party's
   * position**, and `MissionWalk`'s comment carries the argument in full. The
   * short version: it is authored map data resolved server-side, and what the
   * player is shown is *this row is not turning* — never who, never where.
   * §13 asks the row that adds it to say so, and it says so in three places.
   *
   * On the mission tick's budget and bounded by authorship: one hypot per own
   * hull per live row, and one per scripted hull per live row, over a circuit a
   * document wrote by hand.
   */
  private applyWalk(world: SimWorld, own: EchoSnapshot): void {
    const walk = this.definition.walk;
    if (walk === undefined) return;

    this.expireBells(world);

    // The circuit has closed. The count is the edge's business now (§8), and a
    // closed circuit neither turns nor stalls.
    if (this.turnedRows.size >= walk.rows.length) {
      this.walkStalling = false;
      return;
    }

    // Sequentially, the first unturned row. Collapsed, all of them — §4's
    // second half: "Every row still unwalked completes in one sixty-second turn
    // rather than in sequence, provided each has a hull and each is under the
    // ceiling. The circuit stops being a queue."
    const live = this.walkCollapsed
      ? walk.rows.filter((row) => !this.turnedRows.has(row.id))
      : [walk.rows[this.liveRowIndex()]!];

    let anyStalling = false;
    for (const row of live) {
      let held = false;
      let water = 0;
      for (const unit of own.units) {
        if (!insideRow(row, unit.x, unit.y)) continue;
        held = true;
        if (unit.sig > water) water = unit.sig;
      }
      const foreign = this.foreignPresence(world, (x, y) => insideRow(row, x, y));
      const turning = held && !foreign && water <= walk.ceilingSig;
      // §4.2's two stalls, and only those two. A row with nobody on it is not
      // stalled — it is waiting, which is the mission's ordinary condition:
      // "the walk always arrives at a row before the hull that has to be on it
      // does". Reading an empty row as a stall would restart the circuit for
      // the crime of being short of hulls, which is the arithmetic rather than
      // a failure.
      if (!turning && (foreign || (held && water > walk.ceilingSig))) anyStalling = true;

      const accrued = accrueRowHold(this.rowHeld.get(row.id) ?? 0, turning, ECHO_TICK_INTERVAL);
      this.rowHeld.set(row.id, accrued);
      if (accrued >= walk.holdTicks) {
        this.turnedRows.add(row.id);
        this.rowHeld.set(row.id, 0);
        this.walkStalled = 0;
      }
    }
    this.walkStalling = anyStalling;

    // The walk stops returning altered once the bell has been rung. A circuit
    // that restarted after an emergency convocation would be the mission taking
    // back the one thing it gave, and §4 puts the bell in the last five minutes
    // precisely so that what follows it is the end of the tide.
    if (this.walkCollapsed) return;
    this.walkStalled = accrueStall(this.walkStalled, anyStalling, ECHO_TICK_INTERVAL);
    if (this.walkStalled < walk.stallTicks) return;
    this.returnAltered(world, walk.bell.ticks);
  }

  /**
   * *Still turning* — §4.2: "every row already turned rings once, the circuit
   * restarts at the first row, and everything walked so far is walked again.
   * Nothing is lost but the tide, and the tide is the only thing there is."
   *
   * The bells are the whole of the telegraph and they are the whole of the
   * teaching: five rows in, that is five bells across the terrace, and the
   * player learns what the sound means the first time it costs them six
   * minutes. Which is why this rings *before* it clears the set — the rings
   * are for what was walked, not for what is about to be.
   */
  private returnAltered(world: SimWorld, ticks: number): void {
    this.ring(world, (row) => this.turnedRows.has(row.id), ticks);
    this.turnedRows.clear();
    this.rowHeld.clear();
    this.walkStalled = 0;
  }

  /**
   * Ring the bells of every row this picks, for `ticks` from now.
   *
   * Loud on the tick it is rung rather than on the next mission pass, which is
   * the difference between a bell and a status light: the restart's five bells
   * *are* the telegraph (§4.2), and a telegraph that arrived a fifth of a
   * second after the thing it announces would be announcing the past.
   */
  private ring(world: SimWorld, pick: (row: { id: string }) => boolean, ticks: number): void {
    for (const row of this.definition.walk?.rows ?? []) {
      if (!pick(row)) continue;
      this.bellUntil.set(row.id, world.tick + ticks);
      const eid = this.eidOf(world, bellTag(row.id));
      if (eid !== 0) StaticEmitter.active[eid] = 1;
    }
  }

  /**
   * Stop every ring that has run out — the `liftCutSig` habit, applied to a
   * sound: a ring can never outlive its cause, and a recycled entity id cannot
   * inherit a stranger's loudness. Run at the top of the walk's pass so a bell
   * rung on the last one gets its full length.
   */
  private expireBells(world: SimWorld): void {
    for (const row of this.definition.walk?.rows ?? []) {
      const until = this.bellUntil.get(row.id);
      if (until === undefined || world.tick <= until) continue;
      this.bellUntil.delete(row.id);
      const eid = this.eidOf(world, bellTag(row.id));
      if (eid !== 0) StaticEmitter.active[eid] = 0;
    }
  }

  /** The row the walk is on: the first that has not turned. */
  private liveRowIndex(): number {
    const rows = this.definition.walk?.rows ?? [];
    const index = rows.findIndex((row) => !this.turnedRows.has(row.id));
    // Past the end of a closed circuit, the last row is the honest answer for
    // a marker: the question is where it finished, not back at the gardens.
    return index === -1 ? Math.max(0, rows.length - 1) : index;
  }

  /**
   * Ground taken by standing on it — docs/mission-convocation.md §8's one
   * failure state, and §13's prediction that it is "the stall condition of the
   * walk row with the sign flipped".
   *
   * It is literally that: `foreignPresence` answers both, so the mission has
   * one way of asking one question. The sign flip is in what the answer means —
   * on a row, somebody else standing there stops the plateau's question; in the
   * Holdfast, it takes the plateau.
   *
   * **Continuous**, per §8's "sixty *continuous* seconds": a hull that left the
   * Holdfast and came back is a hull that left, and the plateau got its minute
   * back. Accrued from world state at `ECHO_TICK_INTERVAL` granularity, so a
   * replay accrues the identical ledger.
   */
  private applyHolds(world: SimWorld): void {
    for (const hold of this.definition.holds ?? []) {
      if (this.completedHolds.has(hold.id)) continue;
      const region = this.definition.regions.find((candidate) => candidate.id === hold.region);
      // A hold naming a region that does not exist is an authoring error the
      // mission test catches by name; at runtime the ground simply stays the
      // player's, which is the safe direction for a rule that ends a mission.
      if (region === undefined) continue;
      const present = this.foreignPresence(world, (x, y) => inRegion(region, x, y));
      const accrued = present ? (this.holdProgress.get(hold.id) ?? 0) + ECHO_TICK_INTERVAL : 0;
      this.holdProgress.set(hold.id, accrued);
      if (accrued < hold.ticks) continue;
      this.completedHolds.add(hold.id);
      // Failed by the same path a beat fails one, and under the same rule: a
      // hold never overturns an objective the player has already met.
      if (this.statuses.get(hold.objectiveId) !== ObjectiveStatus.Met) {
        this.statuses.set(hold.objectiveId, ObjectiveStatus.Failed);
      }
      // Deferred like the `resolve` beat's, for the beat's reason: the close
      // reads the count it has after this tick's objectives are derived, not
      // the one it had before them.
      if (hold.closes === true) this.resolveRequested = true;
    }
  }

  /**
   * Whether any hull of a party that is **not** the player's satisfies this
   * shape — the walk's stall and the Holdfast's hold, answered once.
   *
   * The only place in this runtime that asks where somebody else is, and it is
   * confined to a boolean by construction: the caller hands in a predicate over
   * a position and gets back yes or no, so there is no path from here to a
   * count, a bearing or an identity. What reaches the player is a row that is
   * not turning and a plateau that has been held; `predicates.ts` is not given
   * this, and `view.ts` cannot ask for it.
   *
   * Reads the ECS only for entities this runtime spawned itself, which is the
   * charter stated at the top of this file.
   */
  private foreignPresence(world: SimWorld, inside: (x: number, y: number) => boolean): boolean {
    for (const party of this.definition.parties) {
      if (party.slot === this.definition.playerSlot) continue;
      for (const unit of party.units) {
        const eid = this.eidOf(world, unit.tag);
        if (eid === 0) continue;
        if (inside(Position.x[eid]!, Position.y[eid]!)) return true;
      }
    }
    return false;
  }

  /**
   * The commander's one act, rung — docs/characters.md's *Commander ability*,
   * and the row docs/mission-convocation.md §13 says this is the first document
   * to need at all.
   *
   * Called from `Match.commanderAbility`, which records it like every other
   * order and then calls this; the refusals below are the server's, so a client
   * that shows the button after it is spent buys nothing. Returns whether the
   * act happened, for the command path's own bookkeeping.
   *
   * **Once per match**, and the stamp is the whole of the enforcement: a second
   * call finds `abilityFiredAtTick` set and does nothing.
   */
  fireAbility(slot: number): boolean {
    const ability = this.definition.commanderAbility;
    if (ability === undefined) return false;
    if (slot !== this.definition.playerSlot) return false;
    if (this.abilityFiredAtTick >= 0) return false;
    // Before the first mission tick there is no world to stamp against. A
    // client cannot reach this — the room opens after the match does — but the
    // stamp is the ledger and a ledger keyed on a guess is worse than a refusal.
    if (this.lastWorld === null) return false;
    if (this.resolution !== null) return false;
    this.abilityFiredAtTick = this.lastWorld.tick;
    if (ability.collapsesWalk === true) {
      this.walkCollapsed = true;
      // "Every row's bell rung at once" (§4) — every row, not every row still
      // unwalked. The act is the plateau announcing itself, and a plateau does
      // not announce half of itself.
      this.ring(this.lastWorld, () => true, ability.durationTicks);
    }
    if (ability.line !== undefined) {
      this.lines.push({
        tick: this.lastWorld.tick,
        speaker: ability.line.speaker,
        text: ability.line.text,
        voice: ability.line.voice ?? voiceOf(this.definition.playerFaction),
      });
    }
    return true;
  }

  /**
   * The act, running — the fifteen seconds §4 prices at 0.8 → 1.0 → 1.25.
   *
   * Two world maps rather than a component, in `applyLifts`' arrangement and
   * for its reasons: cleared and rebuilt whole every mission pass, so the
   * bonus can never outlive the act and a recycled entity id cannot inherit a
   * stranger's speed. Read by `movementSystem` at 60 Hz against a runtime that
   * writes at 5, which is the same stale-but-correct interval every SIG floor
   * in this file is already read across.
   *
   * The radius is measured from the authored point rather than from a hull,
   * because §4 measures it from the Holdfast and the Holdfast is a place. Own
   * hulls only: the act is the plateau's, and a convocation that hurried the
   * concern's Cruisers would be a different mission.
   */
  private applyAbility(world: SimWorld): void {
    world.commanderHaste.clear();
    world.commanderSilentImmune.clear();
    const ability = this.definition.commanderAbility;
    if (ability === undefined) return;
    const running =
      this.abilityFiredAtTick >= 0 && world.tick < this.abilityFiredAtTick + ability.durationTicks;

    // The act's own voice, at the authored point, for exactly as long as it
    // runs. The invoice §4 states: "The plateau does not merely become audible.
    // It becomes *identified*, and it identifies itself."
    const actEid = this.eidOf(world, ACT_TAG);
    if (actEid !== 0) StaticEmitter.active[actEid] = running ? 1 : 0;
    if (!running) return;

    for (const party of this.definition.parties) {
      if (party.slot !== this.definition.playerSlot) continue;
      for (const unit of party.units) {
        const eid = this.eidOf(world, unit.tag);
        if (eid === 0) continue;
        const dx = Position.x[eid]! - ability.x;
        const dy = Position.y[eid]! - ability.y;
        if (Math.hypot(dx, dy) > ability.radiusM) continue;
        if (ability.speedMultiplier !== 1) world.commanderHaste.set(eid, ability.speedMultiplier);
        if (ability.silentRunningImmunity === true) world.commanderSilentImmune.add(eid);
      }
    }
  }

  /**
   * The water a mission has made habitable, republished whole each pass —
   * `MissionRegion.pressureBonus` and the `ground` beat that switches one on
   * (docs/mission-deep-furrow.md §4).
   *
   * `applyAbility`'s arrangement with the key changed: rectangles rather than
   * entity ids, so `aurasSystem` tests containment itself at 60 Hz and a hull
   * that leaves a furrow stops being rated for it on the tick it leaves rather
   * than at the next mission pass. Crush is charged per tick and the whole
   * point of the grant is that it decides whether water is lethal, so a
   * 200 ms tail on the wrong side of that line is not a rounding error.
   *
   * Rebuilt from scratch every pass, in `liftCutSig`'s idiom, so a grant
   * cannot outlive the beat that wrote it and a recycled entity id cannot
   * inherit one. The beat's figure wins over the authored one for the same
   * reason the beat exists: a mission that sows a furrow at 09:00 is saying
   * the water was not habitable at 08:59.
   */
  private applyGrants(world: SimWorld): void {
    world.regionPressureBonus.length = 0;
    for (const region of this.definition.regions) {
      const granted = this.grantedRegions.get(region.id);
      const bonus = granted ?? region.pressureBonus;
      if (bonus === undefined || bonus <= 0) continue;
      world.regionPressureBonus.push({
        x: region.x,
        y: region.y,
        widthM: region.widthM,
        heightM: region.heightM,
        bonus,
      });
    }
  }

  /**
   * The act as the panel reads it — `CommanderAbilityView`.
   *
   * Everything here is the player's own state: whether their own commander has
   * spent their own once-per-match act, and how long their own hulls are still
   * carrying it. Seconds are rounded up so a running act never reads zero while
   * it is still running, which is `debtS`' arrangement in the panel.
   */
  private abilityView(): CommanderAbilityView | undefined {
    const ability = this.definition.commanderAbility;
    if (ability === undefined) return undefined;
    const tick = this.lastWorld?.tick ?? 0;
    const spent = this.abilityFiredAtTick >= 0;
    const remainingTicks = spent
      ? Math.max(0, this.abilityFiredAtTick + ability.durationTicks - tick)
      : 0;
    const view: CommanderAbilityView = {
      id: ability.id,
      label: ability.label,
      description: ability.description,
      available: !spent,
      spent,
      remainingS: Math.ceil(remainingTicks / SIM.TICK_HZ),
    };
    // docs/ui-ux.md §7 — a disabled action greys out with a reason attached.
    // In register, and the register is the mission's: a Commune button that
    // read "on cooldown" would be a sentence nobody on the plateau speaks.
    if (spent) view.reason = 'rung — there is one of these, and it has been rung';
    return view;
  }

  /**
   * The sweep — docs/mission-tend.md §6 and §8: a scripted listener whose
   * hearing is a fact the mission counts, quietly, without interrupting
   * anything.
   *
   * Resolved here rather than by the Echo Layer because the Echo pass builds
   * snapshots for seated slots only, and the sweep is authored: its hearing
   * uses the same propagation model — perceived loudness through the terrain's
   * path integral against the listener's threshold — applied at the Echo
   * cadence, inside the authored windows, over the player's own hulls and the
   * residue layer. Nothing here reaches the wire: *filed* latches, the pair's
   * course bends once per window toward what it heard (the only feedback the
   * fiction permits), and the reading arrives with the tide.
   *
   * On the mission tick's budget, and bounded by authorship: tags × hulls
   * path integrals, only inside a window, with the cheap best-water rejection
   * ahead of every walk — the same shape as the fauna listen.
   */
  private applySweep(world: SimWorld, sink: MissionCommandSink): void {
    const sweep = this.definition.sweep;
    if (sweep === undefined) return;
    const windowIndex = sweep.windows.findIndex(
      (pass) => world.tick >= pass.fromTick && world.tick <= pass.untilTick
    );
    if (windowIndex === -1) return;
    // Filed is monotone and each window bends at most once, so a pass that
    // has already heard and turned has nothing left to compute.
    if (this.filed && this.bentWindows.has(windowIndex)) return;

    for (const tag of sweep.tags) {
      const listener = this.eidOf(world, tag);
      if (listener === 0) continue;
      const hyd = Acoustic.hyd[listener]!;
      if (hyd <= 0) continue;
      const lx = Position.x[listener]!;
      const ly = Position.y[listener]!;
      const ld = Position.depth[listener]!;

      for (const party of this.definition.parties) {
        if (party.slot !== this.definition.playerSlot) continue;
        for (const unit of party.units) {
          const hull = this.eidOf(world, unit.tag);
          if (hull === 0) continue;
          // The bow, on the same argument as the Drift's hearing
          // (docs/systems-echo.md §8): the sweep is a listener resolving a
          // player hull, which is the one question this term answers.
          const sig = Acoustic.sig[hull]! * directionalFactorFor(world, hull, lx, ly);
          if (sig <= 0) continue;
          const distance = Math.hypot(Position.x[hull]! - lx, Position.y[hull]! - ly);
          const tf = thermoclineFactor(Position.depth[hull]!, ld);
          // The cheap rejection bounds from the grid's live peak, the same
          // ceiling the Echo pass sizes its broadphase from (#372).
          if (detectionRatio(sig, world.terrain.peakPf * tf, distance, hyd) < 1) continue;
          const pf = world.terrain.pathPropagation(Position.x[hull]!, Position.y[hull]!, lx, ly);
          if (detectionRatio(sig, pf * tf, distance, hyd) < 1) continue;
          this.file(world, sink, windowIndex, Position.x[hull]!, Position.y[hull]!);
          return;
        }
      }

      // "…and enough to read yesterday's hum off the seabed if the stillness
      // starts late" (§6): fresh residue is heard exactly as the Echo Layer
      // hears it, through the layer's own audibility test.
      for (const mark of world.marks.all) {
        if (!world.marks.audible(world.terrain, mark, lx, ly, ld, hyd)) continue;
        this.file(world, sink, windowIndex, mark.x, mark.y);
        return;
      }
    }
  }

  /** Latch the day filed, and bend this window's course toward what was heard. */
  private file(
    world: SimWorld,
    sink: MissionCommandSink,
    windowIndex: number,
    x: number,
    y: number
  ): void {
    this.filed = true;
    if (this.bentWindows.has(windowIndex)) return;
    this.bentWindows.add(windowIndex);
    // The bend: the pair's course turns `MISSION.SWEEP_BEND_DEG` toward the
    // sound and keeps its range. Their next authored move beat restores the
    // chart, which is what "bends a few degrees" costs a transit whose
    // schedule is not the player's business (docs/mission-tend.md §6).
    //
    // It used to order them *to* the sound, which is a different mechanic
    // wearing the same word — and on `the-rest` it flew the watch off its
    // chart into the player's guns and left docs/mission-nineteen.md with no
    // observer to meet its count. A sweep reports; it does not intercept.
    const bend = (MISSION.SWEEP_BEND_DEG * Math.PI) / 180;
    for (const tag of this.definition.sweep?.tags ?? []) {
      const eid = this.eidOf(world, tag);
      if (eid === 0) continue;
      const px = Position.x[eid]!;
      const py = Position.y[eid]!;
      // The leg it is flying, or the bow it is holding if it is not flying one.
      const running = MoveOrder.active[eid] === 1;
      const legX = running ? MoveOrder.x[eid]! - px : Math.cos(Heading.rad[eid] ?? 0);
      const legY = running ? MoveOrder.y[eid]! - py : Math.sin(Heading.rad[eid] ?? 0);
      const range = Math.hypot(legX, legY);
      if (range < 1) continue;
      const course = Math.atan2(legY, legX);
      // Signed shortest turn from the course to the sound, clamped to the bend.
      let delta = Math.atan2(y - py, x - px) - course;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      const turn = course + Math.max(-bend, Math.min(bend, delta));
      sink.applyMove(
        Owner.slot[eid]!,
        eid,
        px + Math.cos(turn) * range,
        py + Math.sin(turn) * range,
        false
      );
    }
  }

  /**
   * docs/mission-asset-recovery.md §6: "When Lift Three rigs the chamber, the
   * taps stop." The coupling is the spec's own, so it is a field on the
   * emitter rather than a beat — the rig moment is earned, not scheduled, and
   * a tick-keyed beat could not know when it comes.
   *
   * Re-asserted every pass rather than fired once, the `holdCommitments`
   * habit: it is one flag write per silenced emitter, and idempotence is what
   * makes it replay-proof for free.
   */
  private applyEmitters(world: SimWorld): void {
    for (const party of this.definition.parties) {
      for (const emitter of party.emitters ?? []) {
        const eid = this.eidOf(world, emitter.tag);
        if (eid === 0) continue;
        StaticEmitter.active[eid] = this.sounding(world, emitter) ? 1 : 0;
      }
    }
  }

  /**
   * Whether an authored emitter is sounding at all this tick — its window is
   * open and nothing diegetic has silenced it. The *pattern* inside that is
   * acoustics' (`StaticEmitter`); this is the switch.
   */
  private sounding(world: SimWorld, emitter: MissionEmitter): boolean {
    if (emitter.silencedByLift !== undefined && this.loadedLifts.has(emitter.silencedByLift)) {
      return false;
    }
    if (emitter.fromTick !== undefined && world.tick < emitter.fromTick) return false;
    if (emitter.untilTick !== undefined && world.tick > emitter.untilTick) return false;
    return true;
  }

  /**
   * The attended count — docs/mission-attendance.md §6: "Resolve one at Tier 2
   * or better from any watch hull and the arrival is attended."
   *
   * `heardTier` is the Echo Layer's own answer for the player's own slot,
   * pre-bound by `Match` — the tier this observer holds, which is a fact about
   * their hearing rather than about the water. That is why this can be counted
   * at all: everything the tally reads, the player was already sent.
   *
   * Only while the arrival is sounding, and only once. Tier 3 and Tier 4 are
   * reachable and buy nothing, which is §4's point rather than an omission
   * here: the emitter carries a position and a depth and no kind, so there is
   * nothing for classification to name.
   */
  private applyAttendance(world: SimWorld, heardTier: HeardTier): void {
    for (const party of this.definition.parties) {
      for (const emitter of party.emitters ?? []) {
        if (emitter.reading === undefined) continue;
        if (this.attendedTags.has(emitter.tag)) continue;
        if (!this.sounding(world, emitter)) continue;
        const eid = this.eidOf(world, emitter.tag);
        if (eid === 0) continue;
        if (heardTier(eid) >= ResolutionTier.Bearing) this.attendedTags.add(emitter.tag);
      }
    }
  }

  /**
   * The tolerance's tally — docs/mission-aptitude.md §5: "thirty seconds,
   * cumulative, at Classification or better, across the whole party".
   *
   * Read off the player's own `ExposureReport`, which is the *only* reason this
   * can be counted at all: docs/systems-echo.md §9 puts `exposure` on the
   * snapshot precisely because it is resolved information about the player's
   * own hulls, so everything the tally reads, the player was already sent.
   * `applyAttendance` above has the same shape with the argument pointed the
   * other way.
   *
   * **Accrued in sim ticks, on the Echo cadence, and the arithmetic between
   * those two is deliberate.** `exposure` is recomputed at `SIM.ECHO_HZ`, so
   * the tier read here is the tier that stands until the next reading —
   * `ECHO_TICK_INTERVAL` sim ticks away, because that is the interval
   * `match.ts` calls this on. A stale-but-correct tier held across twelve ticks
   * is twelve ticks of exposure: the tolerance is thirty seconds of wall clock,
   * not a count of the times somebody happened to look. Adding one per call
   * would measure §5's thirty seconds as two and a half minutes, and adding one
   * per 60 Hz tick is not available here because this is not called on them.
   * Both halves derive from the same `SIM` constants the cadence does, so
   * `ECHO_HZ` can move without the threshold drifting.
   */
  private applyTolerance(own: EchoSnapshot): void {
    const tier = own.exposure.tier;
    // Silent is not a tier anybody is holding, and bucketing it would make
    // `exposedAtLeast(Silent)` read "the whole mission" rather than "every tick
    // somebody could hear you" — a number no predicate should be able to ask
    // for by accident.
    if (tier <= ResolutionTier.Silent) return;
    this.exposedByTier[tier] = (this.exposedByTier[tier] ?? 0) + ECHO_TICK_INTERVAL;
  }

  /**
   * The transcript, assembled — docs/mission-attendance.md §13's last ask.
   *
   * One authored line per attendable emitter, in the order the mission
   * authors them, each of them the emitter's own `entered` or `gap`. Nothing
   * is templated and nothing is counted into a sentence: the close reads back
   * which arrivals were entered because the mission wrote both readings for
   * each of them, and the run picks.
   */
  /**
   * The readings the objectives themselves earned — types.ts, `reading`: an
   * objective may author a met and an unmet line, and the close appends the
   * one its frozen status picked, in authored order. `transcript`'s shape,
   * with the argument moved from what was heard to what was done.
   */
  private objectiveReadings(): string[] {
    const lines: string[] = [];
    for (const objective of this.definition.objectives) {
      if (objective.reading === undefined) continue;
      const met = this.statuses.get(objective.id) === ObjectiveStatus.Met;
      lines.push(met ? objective.reading.met : objective.reading.unmet);
    }
    return lines;
  }

  private transcript(): string[] {
    const lines: string[] = [];
    for (const party of this.definition.parties) {
      for (const emitter of party.emitters ?? []) {
        if (emitter.reading === undefined) continue;
        lines.push(
          this.attendedTags.has(emitter.tag) ? emitter.reading.entered : emitter.reading.gap
        );
      }
    }
    return lines;
  }

  /**
   * The silence ledger — docs/mission-sorrowgate.md §4.
   *
   * Over the ceiling and the flight owes the court a silence; under it, the
   * debt is repaid at the rate it was run up. While anything is owed, the
   * court's array is withdrawn — done by pointing the array's `grantSlot` at
   * the court, because `aurasSystem` grants an aura only to hulls of the slot
   * it is granted to, so the +25 HYD stops on the very next tick and comes back
   * when the ledger clears. The debt caps, so one catastrophic breach cannot
   * black out the rest of the mission: dread, not confusion.
   *
   * **`grantSlot` and not `Owner.slot`, and this is the whole reason that field
   * exists.** Ownership is read by three unrelated things — the aura grant, the
   * Echo Layer's friend/foe test, and the filter that sorts a hull into your own
   * force or into your contact list. Withdrawing the array by moving ownership
   * moved all three: measured, the moment the flight went over the ceiling the
   * player's own Cantor dropped out of `own.structures` and appeared in the same
   * payload as a Tier-4 foreign structure at chamber centre with hp and faction,
   * while their SIG readout jumped 35 → 72 → 18 for a reason they had not
   * caused. The mission's two teaching instruments, both lying, at the exact
   * moment it is teaching. A grant is not a change of hands.
   *
   * It can never fail the mission. That is the point of it being a debt.
   */
  private applySilenceLedger(world: SimWorld, own: EchoSnapshot): void {
    // No array, no ledger (types.ts, `arrayTag`): a mission with no silence
    // order keeps no debt, and the guard sits above the accrual so `debtS`
    // stays zero rather than silently accounting for a rule not in force.
    if (this.definition.arrayTag === undefined) return;
    const ceiling = this.definition.silenceCeilingSig;
    this.debtS =
      this.flightPeakSig(own) > ceiling
        ? Math.min(this.definition.debtCapS, this.debtS + TICK_DT_S)
        : Math.max(0, this.debtS - TICK_DT_S);

    const arrayEid = this.eidOf(world, this.definition.arrayTag);
    if (arrayEid === 0 || !hasComponent(world, Structure, arrayEid)) return;
    Structure.grantSlot[arrayEid] =
      this.debtS > 0 ? this.definition.courtSlot : this.definition.playerSlot;
  }

  /**
   * Re-derive every objective from the player's own snapshot.
   *
   * Monotone by construction, with one deliberate exception: an objective a
   * beat marked failed stays failed, and one that has been met stays met,
   * because reaching the Concourse or running out a clock is a thing that
   * happened and un-happening it would rewrite the player's history.
   *
   * A *standing* predicate (`isStanding`) is exempt, because it does not
   * describe something that happened — it describes something that is true
   * now. The silence order latched Met on the first tick, when a flight idling
   * at SIG 6 is trivially under a ceiling of 20, and then stayed Met through
   * every breach: the panel read "met" beside the court's own words "The
   * flight owes the court a silence", while the array was being withdrawn over
   * that very breach.
   *
   * Everything else is recomputed from world state every tick, which is why
   * nothing here has to be replayed — there is no remembered progress to get
   * out of step.
   */
  private deriveObjectives(world: SimWorld, own: EchoSnapshot): void {
    for (const objective of this.definition.objectives) {
      const status = this.statuses.get(objective.id) ?? objective.initial;
      const standing = isStanding(objective.predicate);
      if (status === ObjectiveStatus.Failed) continue;
      if (status === ObjectiveStatus.Met && !standing) continue;
      // The clock an `endure` counts from is the mission's start whether or
      // not the objective is showing yet — Tend's turning is revealed at
      // 15:00 and met at 15:50 "whatever the day did" — so the start is
      // stamped before the reveal is consulted.
      if (!this.startedAt.has(objective.id)) this.startedAt.set(objective.id, world.tick);
      // An objective the player has not been given yet is an absence rather
      // than a status (types.ts, `revealAtTick`), and an absence is not
      // scored: the court has said nothing about Tender Two before Tender Two
      // is loaded, and a hull standing at the foot of the ascent at 05:00
      // has not filed a finding the ground does not ask for until 19:00
      // (docs/mission-intake.md §9). Deriving it early would latch a Met the
      // player could never have read, on a rule they had never been shown.
      if (objective.revealAtTick !== undefined && world.tick < objective.revealAtTick) continue;
      const met = this.meets(objective.predicate, own, this.startedAt.get(objective.id) ?? 0);
      if (met) this.statuses.set(objective.id, ObjectiveStatus.Met);
      else if (standing) this.statuses.set(objective.id, ObjectiveStatus.Pending);
    }

    // A terminal objective ends the mission the moment it is met: the court
    // does not keep sitting once everybody is out. Unless the document says
    // the shift runs its length (types.ts, `runsItsLength`), in which case
    // only the `resolve` beat closes it.
    if (this.definition.runsItsLength === true) return;
    const terminal = this.definition.objectives.filter((o) => o.terminal === true);
    if (
      terminal.length > 0 &&
      terminal.every((o) => this.statuses.get(o.id) === ObjectiveStatus.Met)
    ) {
      this.resolve();
    }
  }

  /**
   * Close the mission on whatever the player earned.
   *
   * Counted rather than scored. A partial is a result and is read out as one
   * (docs/mission-sorrowgate.md §8) — it is not a soft failure and the player
   * is not asked to replay it.
   */
  private resolve(): void {
    if (this.resolution !== null) return;
    const objectives = this.viewObjectives();
    const counted = this.definition.objectives.filter((o) => o.terminal === true);
    const met = counted.filter((o) => this.statuses.get(o.id) === ObjectiveStatus.Met).length;
    // An unmet keystone reads the whole count as Lost, whatever else came
    // home (types.ts, `keystone`): docs/mission-asset-recovery.md §8's Results
    // hang on one asset, and a run that recovered the machinery while the
    // chamber stayed behind is "The number stays" — an epilogue that read it
    // as a write-down would state a recovery that did not happen.
    const keystoneLost = counted.some(
      (o) => o.keystone === true && this.statuses.get(o.id) !== ObjectiveStatus.Met
    );
    const outcome = keystoneLost
      ? MissionOutcome.Lost
      : met === counted.length && counted.length > 0
        ? MissionOutcome.Complete
        : met > 0
          ? MissionOutcome.Partial
          : MissionOutcome.Lost;
    // §8: "a filed day with the share in is read with both sentences" — the
    // filed reading is appended to whatever the count earned, never a
    // replacement for it. The Commune closes nothing.
    const filedReading =
      this.filed && this.definition.sweep !== undefined
        ? ` ${this.definition.sweep.filedReading}`
        : '';
    // The transcript, if the mission authored one, on its own lines under the
    // reading: nine entries are a document rather than a sentence, and the
    // close reads them back the way the stalls read a record
    // (docs/mission-attendance.md §12). Objective readings come first, in
    // authored order — the columns of the shift's report before the record of
    // what was heard (docs/mission-shift-change.md §8; types.ts, `reading`).
    const lines = [...this.objectiveReadings(), ...this.transcript()];
    const transcript = lines.length === 0 ? '' : `\n\n${lines.join('\n')}`;
    this.resolution = {
      outcome,
      epilogue: this.definition.epilogue[outcome] + filedReading + transcript,
      objectives,
      // Latched off the same condition as the reading above, and never off a
      // separate one: the scene the client remembers is exactly the sentence
      // the player was just shown (docs/campaign.md §1).
      scenes:
        this.filed && this.definition.sweep?.scene !== undefined
          ? [this.definition.sweep.scene]
          : [],
    };
  }

  // --- The wire ------------------------------------------------------------

  /**
   * Rebuild the view, and hand it on only when it changed.
   *
   * A mission view moves perhaps twenty times in twenty minutes, so sending it
   * on every Echo tick would be six thousand messages to say nothing. The key
   * is the serialised view itself, which is the same trick `GameClient` uses to
   * keep a 5 Hz schema from re-rendering a lobby.
   */
  private rebuildView(own: EchoSnapshot): void {
    const next = projectMissionView(this.definition, this.state(), own);
    // Keyed on everything *except* the tick it was resolved beside. The tick
    // is stamped on the payload so a client can place it against the rest of
    // the match, but it moves five times a second on its own — including it
    // here would defeat the whole mechanism and send six thousand messages to
    // say nothing changed. Debt is rounded for the same reason: it decays
    // continuously and the panel shows whole seconds.
    // Kept whether or not it changed, and never drained. `view` is the *edge*
    // — what to send because something moved — and a client that was not
    // connected for that edge has no way to ask for it again. A player who
    // reloads mid-mission has exactly that problem, and would otherwise sit in
    // front of an orders panel that stays empty until the next objective
    // happens to move, which can be minutes.
    this.latest = next;
    const key = JSON.stringify({ ...next, tick: 0, debtS: Math.round(next.debtS) });
    if (key === this.viewKey) return;
    this.viewKey = key;
    this.view = next;
  }

  /** All loaded carriers, or the one carrying a named lift — see `LoadedIds`. */
  private loadedFor(lift?: string): ReadonlySet<number> {
    if (lift === undefined) return this.loadedIds;
    const carrier = this.loadedByLift.get(lift);
    return carrier === undefined ? NO_CARRIER : new Set([carrier]);
  }

  private state(): MissionState {
    const state: MissionState = {
      statuses: this.statuses,
      startedAt: this.startedAt,
      roleIds: this.roleIds,
      loadedIds: this.loadedIds,
      loadedByLift: this.loadedByLift,
      attended: this.attendedTags.size,
      exposedByTier: this.exposedByTier,
      sounded: this.soundedIds.size,
      debtS: this.debtS,
    };
    if (this.definition.walk !== undefined) {
      state.walk = {
        turned: this.turnedRows.size,
        rowIndex: this.liveRowIndex(),
        stalled: this.walkStalling,
      };
    }
    const ability = this.abilityView();
    if (ability !== undefined) state.ability = ability;
    return state;
  }

  private viewObjectives(): ObjectiveView[] {
    return this.definition.objectives.map((objective) => ({
      id: objective.id,
      text: objective.text,
      status: this.statuses.get(objective.id) ?? objective.initial,
      ...(objective.markerId === undefined ? {} : { markerId: objective.markerId }),
    }));
  }

  // --- Entity bookkeeping --------------------------------------------------

  private register(world: SimWorld, tag: MissionTag, eid: number): void {
    const local = localIdOf(world, eid);
    if (local !== undefined) this.tagged.set(tag, local);
  }

  private tagsFor(role: MissionRole): Set<MissionTag> {
    let tags = this.roleTags.get(role);
    if (tags === undefined) {
      tags = new Set();
      this.roleTags.set(role, tags);
    }
    return tags;
  }

  private idsFor(role: MissionRole): Set<number> {
    let ids = this.roleIds.get(role);
    if (ids === undefined) {
      ids = new Set();
      this.roleIds.set(role, ids);
    }
    return ids;
  }

  /**
   * Rebuild each role's live entity ids from its tags.
   *
   * In the same id space an `EchoSnapshot` reports — raw entity ids — because
   * that is what these sets are compared against. A hull that has died simply
   * drops out, which is what makes `survive` count and `extract` stop counting
   * a tender that is no longer there.
   */
  private resolveRoleIds(world: SimWorld): void {
    for (const [role, tags] of this.roleTags) {
      const ids = this.idsFor(role);
      ids.clear();
      for (const tag of tags) {
        const eid = this.eidOf(world, tag);
        if (eid !== 0) ids.add(eid);
      }
    }
  }

  /**
   * The entity behind a tag, or 0 for one that is gone.
   *
   * The round trip is the liveness check and it needs no teardown hook of its
   * own: `registerEntity` overwrites the mapping when bitecs recycles an id, so
   * a stale handle fails the identity test and a dead one fails the component
   * test. 0 is what every command path already rejects.
   */
  private eidOf(world: SimWorld, tag: MissionTag): number {
    const local = this.tagged.get(tag);
    if (local === undefined) return 0;
    const eid = eidOfLocalId(world, local);
    if (eid === 0 || !hasComponent(world, Owner, eid)) return 0;
    return localIdOf(world, eid) === local ? eid : 0;
  }
}
