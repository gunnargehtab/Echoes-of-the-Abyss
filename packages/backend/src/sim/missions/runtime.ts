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
  FaunaStage,
  MAX_PROPAGATION_FACTOR,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  detectionRatio,
  thermoclineFactor,
  type EchoSnapshot,
  type MissionAbility,
  type MissionView,
  type ObjectiveView,
} from '@echoes/shared';
import {
  Acoustic,
  DepthOrder,
  Fauna,
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
import { projectMissionView, type MissionState } from './view.ts';
import { directionalFactorFor } from '../directional.ts';
import { inRegion, isMet, isStanding, peakSigOf } from './predicates.ts';
import type { MissionDefinition, MissionEmitter, MissionRole, MissionTag } from './types.ts';

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

export interface MissionResolution {
  outcome: MissionOutcome;
  epilogue: string;
  objectives: ObjectiveView[];
}

/** One authored line, spoken by a `say` beat. */
export interface MissionLine {
  tick: number;
  speaker: string;
  text: string;
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
  private debtS = 0;
  private view: MissionView | null = null;
  /** The last view built, kept for a client that needs it re-sent. */
  private latest: MissionView | null = null;
  private viewKey = '';
  private resolution: MissionResolution | null = null;
  /** A resolve beat has fired; the mission closes once this tick is derived. */
  private resolveRequested = false;
  private worstMs = 0;

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
   * **Only the player's slot is seated.** The scripted parties are given an
   * `Owner.slot` and nothing else, because the Echo Layer resolves listeners
   * and pingers by `Owner.slot` rather than by the seated roster: an unseated
   * party still hears, still emits, and — the beat this whole mission turns on
   * — still lights the player when it pings. Leaving them unseated keeps
   * `resolveVictory`'s two-roster rule untouched (a mission is not a fight
   * somebody wins), keeps the Echo pass building one snapshot instead of six,
   * and keeps five scripted navies out of the lobby's faction-uniqueness
   * check.
   */
  install(world: SimWorld, seat: (slot: number) => void): void {
    seat(this.definition.playerSlot);

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
    const tag = this.tagOfTender(eid);
    if (tag === null) return false;
    if (this.lastWorld === null) return false;
    if (this.lastWorld.tick < (this.heldUntil.get(tag) ?? 0)) return true;
    return this.lastEscorted.has(tag) === false;
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
    this.applyEmitters(world);
    this.applyAttendance(world, heardTier);
    this.applySweep(world, sink);
    this.applyEscortHold(world, own);
    this.applySilenceLedger(world, own);
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

  private fire(
    world: SimWorld,
    sink: MissionCommandSink,
    beat: MissionDefinition['beats'][number]
  ): void {
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
        world.terrain.fillGround(region.x, region.y, region.widthM, region.heightM, {
          floorM: beat.floorM,
          ceilingM: beat.ceilingM,
          biome: beat.biome,
        });
        return;
      }
      case 'objective':
        this.statuses.set(beat.id, beat.status);
        return;
      case 'say':
        this.lines.push({ tick: world.tick, speaker: beat.speaker, text: beat.text });
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
      Fauna.targetEid[eid] = 0;
      Fauna.stage[eid] = FaunaStage.Committed;
      // Deaf for the length of the commitment. `faunaSystem` counts this down
      // by `dt` and only calls `listen` when it reaches zero, so a figure well
      // past any Echo interval means it never reaches zero while the mission
      // is holding this creature. The expiry branch above puts it back.
      Fauna.senseS[eid] = SCRIPTED_SENSE_S;
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
          if (detectionRatio(sig, MAX_PROPAGATION_FACTOR * tf, distance, hyd) < 1) continue;
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
    // The bend: the pair re-aims at the sound. Their next authored move beat
    // restores the chart, which is what "bends a few degrees" costs a transit
    // whose schedule is not the player's business (§6).
    for (const tag of this.definition.sweep?.tags ?? []) {
      const eid = this.eidOf(world, tag);
      if (eid !== 0) sink.applyMove(Owner.slot[eid]!, eid, x, y, false);
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
   * The transcript, assembled — docs/mission-attendance.md §13's last ask.
   *
   * One authored line per attendable emitter, in the order the mission
   * authors them, each of them the emitter's own `entered` or `gap`. Nothing
   * is templated and nothing is counted into a sentence: the close reads back
   * which arrivals were entered because the mission wrote both readings for
   * each of them, and the run picks.
   */
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
      if (!this.startedAt.has(objective.id)) this.startedAt.set(objective.id, world.tick);
      const met = isMet(
        objective.predicate,
        own,
        (role) => this.idsFor(role as MissionRole),
        (id) => this.definition.regions.find((region) => region.id === id),
        this.startedAt.get(objective.id) ?? 0,
        (lift) => this.loadedFor(lift),
        this.attendedTags.size
      );
      if (met) this.statuses.set(objective.id, ObjectiveStatus.Met);
      else if (standing) this.statuses.set(objective.id, ObjectiveStatus.Pending);
    }

    // A terminal objective ends the mission the moment it is met: the court
    // does not keep sitting once everybody is out.
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
    // (docs/mission-attendance.md §12).
    const lines = this.transcript();
    const transcript = lines.length === 0 ? '' : `\n\n${lines.join('\n')}`;
    this.resolution = {
      outcome,
      epilogue: this.definition.epilogue[outcome] + filedReading + transcript,
      objectives,
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
    return {
      statuses: this.statuses,
      startedAt: this.startedAt,
      roleIds: this.roleIds,
      loadedIds: this.loadedIds,
      loadedByLift: this.loadedByLift,
      attended: this.attendedTags.size,
      debtS: this.debtS,
    };
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
