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
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  type EchoSnapshot,
  type MissionAbility,
  type MissionView,
  type ObjectiveView,
} from '@echoes/shared';
import { Fauna, Health, MoveOrder, Owner, Position, Pressure } from '../components.ts';
import {
  economyFor,
  eidOfLocalId,
  localIdOf,
  spawnFauna,
  spawnStructure,
  spawnUnit,
  type SimWorld,
} from '../world.ts';
import { projectMissionView, type MissionState } from './view.ts';
import { isMet, peakSigOf } from './predicates.ts';
import type { MissionDefinition, MissionRole, MissionTag } from './types.ts';

/** Simulation ticks between Echo passes — the cadence this runtime runs at. */
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);

/** Seconds of simulation time one mission tick covers. */
const TICK_DT_S = ECHO_TICK_INTERVAL / SIM.TICK_HZ;

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
  private readonly statuses = new Map<string, ObjectiveStatus>();
  private readonly startedAt = new Map<string, number>();
  private readonly commitments: Commitment[] = [];
  private readonly lines: MissionLine[] = [];

  /** Next unfired beat. Beats are authored sorted; `missions.test.ts` asserts it. */
  private cursor = 0;
  private debtS = 0;
  private view: MissionView | null = null;
  private viewKey = '';
  private resolution: MissionResolution | null = null;
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
          // Every hull in the chamber, not only the player's. Hostility is
          // ownership and the simulation has no neutrality, so armed parties
          // parked around one exchange would open fire on tick zero
          // (docs/mission-sorrowgate.md §3).
          weaponsCold: true,
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
  tick(world: SimWorld, sink: MissionCommandSink, own: EchoSnapshot): MissionResolution | null {
    if (this.resolution !== null) return null;
    const started = performance.now();
    this.lastWorld = world;

    this.fireDueBeats(world, sink);
    this.holdCommitments(world);
    this.resolveRoleIds(world);
    this.applyEscortHold(world, own);
    this.applySilenceLedger(world, own);
    this.deriveObjectives(world, own);
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
      case 'objective':
        this.statuses.set(beat.id, beat.status);
        return;
      case 'say':
        this.lines.push({ tick: world.tick, speaker: beat.speaker, text: beat.text });
        return;
      case 'resolve':
        this.resolve();
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
   */
  private holdCommitments(world: SimWorld): void {
    for (let i = this.commitments.length - 1; i >= 0; i--) {
      const commitment = this.commitments[i]!;
      if (world.tick > commitment.untilTick) {
        this.commitments.splice(i, 1);
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
   */
  private applyEscortHold(world: SimWorld, own: EchoSnapshot): void {
    const escorts = this.idsFor('escort');
    for (const party of this.definition.parties) {
      if (party.slot !== this.definition.playerSlot) continue;
      for (const unit of party.units) {
        if (unit.role !== 'tender') continue;
        const eid = this.eidOf(world, unit.tag);
        if (eid === 0 || !hasComponent(world, MoveOrder, eid)) continue;
        const held = world.tick < (this.heldUntil.get(unit.tag) ?? 0);
        const escortedNow = this.escorted(own, escorts, eid);
        if (escortedNow) this.lastEscorted.add(unit.tag);
        else this.lastEscorted.delete(unit.tag);
        if (held || !escortedNow) MoveOrder.active[eid] = 0;
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
    return peakSigOf(own, this.idsFor('escort'));
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
   * The silence ledger — docs/mission-sorrowgate.md §4.
   *
   * Over the ceiling and the flight owes the court a silence; under it, the
   * debt is repaid at the rate it was run up. While anything is owed, the
   * court's array is withdrawn — done by moving the array's `Owner.slot` away
   * from the player, because `aurasSystem` grants an aura only to hulls of the
   * owner's own slot, so the +25 HYD stops on the very next tick and comes
   * back when the ledger clears. The debt caps, so one catastrophic breach
   * cannot black out the rest of the mission: dread, not confusion.
   *
   * It can never fail the mission. That is the point of it being a debt.
   */
  private applySilenceLedger(world: SimWorld, own: EchoSnapshot): void {
    const ceiling = this.definition.silenceCeilingSig;
    this.debtS =
      this.flightPeakSig(own) > ceiling
        ? Math.min(this.definition.debtCapS, this.debtS + TICK_DT_S)
        : Math.max(0, this.debtS - TICK_DT_S);

    const arrayEid = this.eidOf(world, this.definition.arrayTag);
    if (arrayEid === 0 || !hasComponent(world, Owner, arrayEid)) return;
    Owner.slot[arrayEid] = this.debtS > 0 ? this.definition.courtSlot : this.definition.playerSlot;
  }

  /**
   * Re-derive every objective from the player's own snapshot.
   *
   * Monotone by construction: an objective a beat marked failed stays failed,
   * and one that has been met stays met. Everything else is recomputed from
   * world state every tick, which is why nothing here has to be replayed —
   * there is no remembered progress to get out of step.
   */
  private deriveObjectives(world: SimWorld, own: EchoSnapshot): void {
    for (const objective of this.definition.objectives) {
      const status = this.statuses.get(objective.id) ?? objective.initial;
      if (status === ObjectiveStatus.Failed || status === ObjectiveStatus.Met) continue;
      if (!this.startedAt.has(objective.id)) this.startedAt.set(objective.id, world.tick);
      const met = isMet(
        objective.predicate,
        own,
        (role) => this.idsFor(role as MissionRole),
        (id) => this.definition.regions.find((region) => region.id === id),
        this.startedAt.get(objective.id) ?? 0
      );
      if (met) this.statuses.set(objective.id, ObjectiveStatus.Met);
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
    const outcome =
      met === counted.length && counted.length > 0
        ? MissionOutcome.Complete
        : met > 0
          ? MissionOutcome.Partial
          : MissionOutcome.Lost;
    this.resolution = {
      outcome,
      epilogue: this.definition.epilogue[outcome],
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
    const key = JSON.stringify({ ...next, tick: 0, debtS: Math.round(next.debtS) });
    if (key === this.viewKey) return;
    this.viewKey = key;
    this.view = next;
  }

  private state(): MissionState {
    return {
      statuses: this.statuses,
      startedAt: this.startedAt,
      roleIds: this.roleIds,
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
