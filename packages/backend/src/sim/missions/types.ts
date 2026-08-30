/**
 * The authored mission format — docs/campaign.md, docs/mission-sorrowgate.md.
 *
 * Authored, never generated, in the idiom `sim/maps/types.ts` argues for: a data
 * literal with no logic, no loader and no schema validator, so a mistyped tag or
 * a beat that names a hull nobody placed fails at `npm run type-check` rather
 * than half way through a match.
 *
 * A table, not a language. Six predicates, nine beat kinds, no expressions, no
 * variables, no conditions. `sim/maps/types.ts` makes this argument about region
 * shapes and it holds harder here: a mission scripting language would be more
 * expressive than anything in `docs/` actually asks for, and the second mission
 * is the right time to find out what the first one was missing.
 */

import type {
  AbilityLock,
  Biome,
  Faction,
  FaunaSpecies,
  MissionHeader,
  MissionMarker,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

/**
 * A mission-local name for a hull, a structure or a creature.
 *
 * Never an entity id. bitecs ids come from a process-global counter and are
 * recycled, so a literal that named one would address a different entity on the
 * second match in the same process — see `match.ts`'s note on stale eid handles.
 */
export type MissionTag = string;

/**
 * What one of the player's own hulls is *for*, in this mission.
 *
 * Roles exist so an objective can count hulls without naming them: predicates
 * address a role, and a role is only ever assigned to a unit of the player's
 * own party. That is the whole information-safety story, and it is a property
 * of the type rather than of anybody's discipline.
 *
 * **Authored per mission, not enumerated here** — the finding all three
 * campaign documents reach from their own directions, and the one
 * docs/mission-attendance.md §13 states outright: `MissionRole` was
 * Sorrowgate's two words, the Ledger's column needed a third for the hull its
 * outcome ladder is keyed on, and a *shift* of listeners is none of them. A
 * fixed union would have every future mission widening a type in shared to say
 * what its own people are called.
 *
 * What the union used to buy — a typo failing the build — is bought instead by
 * `missions.test.ts`, which holds every role a mission *names* to being a role
 * that mission *assigns*. That is the stronger check: the union never noticed a
 * mission counting tenders it had not placed, and this does.
 *
 * Two roles are load-bearing beyond counting, and both are authored rather than
 * assumed: `tender` is what the escort hold binds (see `escortRadiusM`), and
 * `silenceRole` names the set the silence ledger measures.
 */
export type MissionRole = string;

/**
 * A named rectangle. Rectangles only, for `sim/maps/types.ts`'s reason: every
 * place a mission needs to name is a chamber, a concourse or a lane.
 */
export interface MissionRegion {
  id: string;
  x: number;
  y: number;
  widthM: number;
  heightM: number;
  note: string;
}

export interface MissionUnit {
  tag: MissionTag;
  kind: UnitKind;
  x: number;
  y: number;
  depthM: number;
  /**
   * Player-owned hulls only. Objective predicates address roles, never tags,
   * so giving a scripted hull a role would put another party inside a counter
   * the player is shown.
   */
  role?: MissionRole;
  /**
   * Spawned with live fire control. Absent is Sorrowgate's default — every
   * hull weapons-cold — because hostility is `Owner.slot` and a mission that
   * parks parties around one exchange cannot have them opening fire on tick
   * zero. A mission arms a hull only where its document arms it: the writ of
   * docs/mission-asset-recovery.md §3 fields "enough gun to finish what
   * commits", and that is the first sentence in the campaign that needs this
   * flag to be true.
   */
  armed?: true;
  /**
   * Pressure Rating after refit, overriding the roster's.
   *
   * A refit is a mission fact and never a roster fact: the hull in `units.ts`
   * is what everybody else fields, and a court that re-rated four scouts has
   * not changed the Light Scout (docs/mission-sorrowgate.md §3).
   */
  pressureRating?: number;
  /** Held by the runtime until this tick, whatever the player orders. */
  releaseTick?: number;
  /** Authored, and read out at the close. "Nine are out." */
  souls?: number;
  note: string;
}

export interface MissionStructure {
  tag: MissionTag;
  kind: StructureKind;
  x: number;
  y: number;
  depthM: number;
  note: string;
}

/**
 * A placed, unowned periodic sound source — the taps of
 * docs/mission-asset-recovery.md §6: audible, locatable, not a unit.
 *
 * Authored on a party for its slot, which is what routes it through the Echo
 * Layer's per-observer resolution like everything else — and *never* on the
 * player's party, whose own slot could then not hear it (`missions.test.ts`
 * holds the literal to that). Its classification names nothing: a Tier-3
 * contact on the taps carries position and depth, no kind and no faction,
 * because the entity behind it is none of the things classification can name.
 *
 * The pattern is ticks, like every beat time: `sig` for `onTicks` at the top
 * of every `periodTicks`, forever — until silenced, or until the authored hp
 * runs out, because the chamber can be lost and §8 prices exactly that.
 */
export interface MissionEmitter {
  tag: MissionTag;
  x: number;
  y: number;
  depthM: number;
  /** Loudness through each strike window. */
  sig: number;
  /** Ticks from one strike window's start to the next. */
  periodTicks: number;
  /** Ticks of each period the emitter is loud. */
  onTicks: number;
  /** Authored durability. */
  hp: number;
  /**
   * The lift whose rigging stops this emitter, by lift id — §6's own coupling:
   * "When Lift Three rigs the chamber, the taps stop." Absent means nothing
   * diegetic ever silences it.
   */
  silencedByLift?: string;
  /**
   * The window this emitter sounds in, in ticks. Absent at either end is
   * unbounded, which is the taps: periodic from tick zero forever.
   *
   * docs/mission-attendance.md §13 names the gap this closes — an emitter that
   * is periodic from tick zero is right for struck iron and wrong for nine
   * one-shot arrivals, which would otherwise all sound at 00:00. A window and
   * a pattern compose: the pattern says what the sound does while it is
   * sounding, the window says when that is. An arrival is the degenerate case
   * where they are the same length, so it is simply on for its twenty seconds.
   */
  fromTick?: number;
  untilTick?: number;
  /**
   * The two readings the close may enter for this emitter, when it is one the
   * mission asks the player to attend (`attend`).
   *
   * Authored per emitter rather than templated, because docs/campaign.md §10's
   * rule about objective text holds for a transcript too: a line assembled
   * from a number and a noun is a sentence no faction speaks. §13 asks for
   * "an epilogue that assembles rather than one that is chosen", and this is
   * what it assembles from — nine authored pairs, of which the close picks
   * one each, in authored order.
   */
  reading?: { entered: string; gap: string };
  note: string;
}

export interface MissionParty {
  /**
   * `Owner.slot`. The player's is `MissionDefinition.playerSlot`; the rest are
   * scripted and are never seated in `Match.slots`, because the Echo Layer
   * resolves listeners and pingers by `Owner.slot` rather than by the seated
   * list. Always below `MAX_SLOTS` and never `DRIFT_SLOT`, which belongs to the
   * Drift and would hand a delegation to the fauna system.
   */
  slot: number;
  faction: Faction;
  units: readonly MissionUnit[];
  structures?: readonly MissionStructure[];
  /** Placed periodic sound sources — see `MissionEmitter`. Omitted is none. */
  emitters?: readonly MissionEmitter[];
  note: string;
}

/**
 * Every predicate is a query over the OBSERVER'S OWN force.
 *
 * There is no `party`, `slot` or `group` field anywhere in this union, and
 * there is no second snapshot in scope where one is evaluated. "Three of five
 * hostiles remaining" is therefore not merely discouraged — it is not
 * expressible, and the leak audit is a property of the type rather than a
 * review habit somebody has to keep.
 */
export type MissionPredicate =
  /**
   * `loaded` counts only hulls carrying a completed lift (see `MissionLift`),
   * so "three lifts reach the Rail Head" cannot be met by three empty barges
   * driven through the gate. A lift id instead of `true` counts only the hull
   * carrying *that* load — Tend's third tender brings a share load home and
   * then carries the gift, and "the gift reached the landing" is a fact about
   * the load, not about the hull being loaded at all. Own-force information
   * either way: a lift id is authored mission data naming an authored load on
   * a player-party hull, never an identity the wall protects.
   */
  | { kind: 'extract'; role: MissionRole; region: string; count: number; loaded?: true | string }
  | { kind: 'survive'; role: MissionRole; count: number }
  /**
   * How many authored emitters this observer has resolved at Tier 2 or
   * better while they were sounding — the attended count of
   * docs/mission-attendance.md §6.
   *
   * The easy half of Tend's ask, and it is easy for a stated reason: Tend's
   * *filed* is a fact about what a scripted party heard, and this is a fact
   * about what the observer's own force heard. It reports the player's own
   * hearing back to them, so it stays inside the wall the union already
   * enforces — there is still no way here to name a party, and none to ask
   * what anybody else resolved.
   */
  | { kind: 'attend'; count: number }
  | { kind: 'quiet'; role: MissionRole; ceilingSig: number }
  | { kind: 'endure'; ticks: number }
  /**
   * Ticks the observer's own force has stood at `tier` or better in somebody
   * else's ears — the tolerance of docs/mission-aptitude.md §5, and the exact
   * mirror of `attend`: that one tallies what the player resolved, this one
   * tallies what was resolved *of* the player.
   *
   * Read off `EchoSnapshot.exposure`, which docs/systems-echo.md §9 argues at
   * length is safe to send because it is resolved information about the
   * player's own hulls and says nothing about who holds the resolution or
   * where they are. So this stays inside the wall the union already enforces —
   * there is still no way here to name the listener, and none to ask what it
   * can see.
   *
   * **Cumulative, not continuous.** Six seconds heard five times is the same
   * thirty as thirty seconds heard once, "because the Consortium's procedure
   * is cumulative: the log is added up at the end of a shift, not watched".
   *
   * **`isMet` here means the party has been heard**, which is the one place in
   * this union where meeting a predicate is not good news. §5 is emphatic that
   * exhausting the tolerance is *not* a mission failure — a partial outcome is
   * an outcome — so what an author hangs off it is a reading, and the beat that
   * fires on it is its own row of §13.
   *
   * The tier is authored rather than fixed at Classification so the union
   * states §5's rule instead of assuming it, the same way `quiet` carries its
   * own `ceilingSig`. Stored in ticks, spoken in seconds: §12's chapter says
   * "Eleven seconds of thirty are entered", and `view.ts` does that arithmetic
   * so no mission literal has to do it in its `text`.
   */
  | { kind: 'tolerance'; ticks: number; tier: ResolutionTier };

/**
 * A load — the hold-and-cut lift of docs/mission-asset-recovery.md §8, and, with
 * the cut time at zero, the gift run of docs/mission-tend.md §13. One mechanism,
 * two missions, which is why it is a table row rather than anything richer.
 *
 * The assigned hull rigs the load by holding inside `region` while the cut runs:
 * `cutTicks` of presence, at `cutSig` — the barge's SIG floored at the authored
 * figure the whole time, because a cut is Overburden's work at Overburden's
 * loudness (docs/economy.md §3) and there is no quiet way to do a salvage.
 * Progress pauses while the hull is elsewhere and resumes when it returns; a
 * cut is work done to rock, and leaving does not undo it. Once rigged, the load
 * rides its hull — delivery is the `extract` predicate's `loaded` flag — and a
 * carrier that dies takes its load down with it, which is what makes "machinery
 * lost" a result rather than a retry.
 *
 * Deliberately not the harvest loop: that knows the loudness but is welded to
 * resource fields these maps do not carry (docs/mission-asset-recovery.md §13).
 */
export interface MissionLift {
  id: string;
  /**
   * The hull that rigs and carries it. Player-party hulls only, for the roles'
   * reason: the loaded set feeds a predicate the player is shown, so a lift on
   * a scripted hull would put another party inside a counter. `missions.test.ts`
   * holds the literal to it.
   */
  tag: MissionTag;
  /** Where the cut runs — and, at cut time zero, simply where the load waits. */
  region: string;
  /** Ticks of held presence before the load is rigged. 0 loads on arrival. */
  cutTicks: number;
  /** The stated loudness while the cut runs. A floor, never a replacement. */
  cutSig: number;
  note: string;
}

export interface MissionObjective {
  id: string;
  /**
   * In-register, authored per mission, shown verbatim. Never templated:
   * docs/campaign.md §10 — "Escort the convoy" is a sentence no faction in this
   * setting speaks.
   */
  text: string;
  /**
   * The same rule as the court states it while the flight is in silence-debt.
   *
   * Two readings of one rule, not two objectives: docs/mission-sorrowgate.md
   * §12 lists both under "Objective readings, in play", and the second one is
   * marked *while in debt*. Absent means the reading does not change.
   */
  debtText?: string;
  initial: ObjectiveStatus;
  predicate: MissionPredicate;
  /**
   * Not shown until this tick.
   *
   * An objective the player has not been given yet is an absence rather than a
   * status, which is why `ObjectiveStatus` has no hidden member: a status is
   * what the court says about a rule, and the court has not said anything about
   * Tender Two before Tender Two is loaded.
   */
  revealAtTick?: number;
  markerId?: string;
  /** Met means the mission is complete outright, not merely progressed. */
  terminal?: boolean;
  /**
   * The terminal objective the outcome ladder is keyed on: unmet, the count
   * reads Lost whatever else came home.
   *
   * docs/mission-asset-recovery.md §8 authors exactly this shape — the Board's
   * three readings hang on Asset 9-06-200, and a run that returned every piece
   * of machinery while the chamber stayed behind is "The number stays", not a
   * partial. Without the flag the runtime's count would read that run as a
   * write-down and the epilogue would state a recovery that did not happen.
   * Sorrowgate authors none: either tender may be the one that gets through,
   * and its count ladder deliberately names no identity.
   */
  keystone?: true;
}

/**
 * A beat. Keyed on simulation tick, never on wall-clock.
 *
 * Beats are authored in ascending `atTick` order and the runtime walks them
 * with a cursor, so the schedule reads down the page as docs/campaign.md's
 * `| Time | Beat |` table reads down its own.
 */
export type MissionBeat =
  | {
      atTick: number;
      kind: 'move';
      tag: MissionTag;
      x: number;
      y: number;
      depthM?: number;
      note: string;
    }
  | { atTick: number; kind: 'ping'; tag: MissionTag; note: string }
  | { atTick: number; kind: 'silent'; tag: MissionTag; active: boolean; note: string }
  | {
      atTick: number;
      kind: 'creature';
      tag: MissionTag;
      species?: FaunaSpecies;
      spawnAt?: { x: number; y: number; depthM: number };
      /**
       * Drive the creature here until `untilTick`, re-asserted every Echo tick
       * so the Drift's own escalate/cool bookkeeping cannot quietly undo an
       * authored approach.
       */
      driveTo: { x: number; y: number };
      untilTick: number;
      /**
       * True when this beat is the audible precursor a `resolve` beat needs.
       *
       * docs/campaign.md §10: no mission fails on a timer alone, and every
       * failure is something the player can hear coming for at least sixty
       * seconds. The test measures the gap between the last loud beat and the
       * resolve, which is the only way a prose rule of this shape is enforced
       * rather than remembered.
       */
      loud: boolean;
      note: string;
    }
  | { atTick: number; kind: 'lose'; tag: MissionTag; note: string }
  | { atTick: number; kind: 'release'; tag: MissionTag; note: string }
  /**
   * Write the ground under a named region (#197), and what the water over it
   * sounds like (#259).
   *
   * The one beat that changes the map rather than what is on it. Authored as a
   * region so it reads like the map literal it is editing, and applied in beat
   * order at the same tick — which is what lets a span be collapsed whole and
   * a passage through it re-cut immediately after, exactly the way
   * `sim/maps/types.ts` lets a tunnel be laid across a plateau.
   *
   * `biome` is the acoustic half of the same beat: a Coral Ruins dome coming
   * down is a change to the water as much as to the geometry
   * (docs/environments.md, *Coral Ruins*), and one beat writes both at one tick
   * rather than two beats racing to the same cells. Every field is optional, so
   * a beat may still collapse a span and say nothing about the water, or turn
   * the water and leave the ground standing.
   *
   * `SOLID` from `sim/terrain.ts` is how rock is spelled.
   */
  | {
      atTick: number;
      kind: 'ground';
      region: string;
      floorM?: number;
      ceilingM?: number;
      biome?: Biome;
      note: string;
    }
  | { atTick: number; kind: 'objective'; id: string; status: ObjectiveStatus; note: string }
  | { atTick: number; kind: 'say'; speaker: string; text: string; note: string }
  /**
   * `conclusion` marks a close that is not a failure state: the tide ending,
   * not a timer running out (docs/glossary.md, *Mission Outcome*;
   * docs/mission-tend.md §8 — "Tend cannot be failed"). campaign.md §10's
   * sixty-second telegraph is a rule about failure being audible, and a
   * mission whose only threat is a ledger has no failure to make audible —
   * so `missions.test.ts` exempts a conclusion from the telegraph, and from
   * nothing else.
   */
  | { atTick: number; kind: 'resolve'; conclusion?: true; note: string };

/**
 * A scripted listener whose hearing is an outcome — the sweep of
 * docs/mission-tend.md §6 and §8, and the row its §13 added to the format.
 *
 * A table, not a query the player could be sent: the tags name authored hulls
 * of a scripted party, the windows are the authored passes, and the runtime
 * resolves their hearing server-side at the Echo cadence over the same
 * propagation model as everything else. What it produces is one latched fact —
 * *filed* — plus the only feedback the fiction permits: the pair's course
 * bends toward what it heard. The player is never told; the ledger is patient,
 * and the reading arrives with the tide.
 *
 * §8: "Filed and unfiled cross with the work freely — a filed day with the
 * share in is read with both sentences." So `filedReading` is *appended* to
 * whatever reading the count earned, never a replacement for it.
 */
export interface MissionSweep {
  /** The listening hulls, by tag. Scripted-party hulls only, never the player's. */
  tags: readonly MissionTag[];
  /** When their hearing counts — the authored passes, in ticks. */
  windows: readonly { fromTick: number; untilTick: number }[];
  /** Appended to the count's reading when the day is filed. Authored, in-register. */
  filedReading: string;
  note: string;
}

/**
 * One mission, whole.
 *
 * Extends the public `MissionHeader`, spread into the literal so the shell's
 * catalogue and the authored mission cannot drift apart — the same arrangement
 * `MapDefinition` has with `MapHeader`, for the same reason. Everything added
 * below the header is hidden information.
 */
export interface MissionDefinition extends MissionHeader {
  /** The doc section this transcribes, cited so drift is findable. */
  doc: string;
  /** Which slot and which navy the human commands. */
  playerSlot: number;
  playerFaction: Faction;
  /**
   * The slot that owns what the player is only lent.
   *
   * A mission may hand the player a structure whose grant is conditional — the
   * court's array is on while the flight is quiet and withdrawn while it is
   * not. `aurasSystem` grants by `Owner.slot`, so withdrawing is one write:
   * move the structure to this slot and the aura stops on the next tick. It is
   * therefore a slot with no party, no faction and nothing in the water.
   */
  courtSlot: number;
  /** Populate the Drift. False when a mission's only creature is authored. */
  fauna: boolean;
  /**
   * Nodules the player opens with. Omitted is none.
   *
   * A skirmish opens on `ECONOMY.STARTING_NODULES`, which is the right answer
   * for a match with fields to work and a refinery to build. A mission says
   * what it wants, and most of them want nothing.
   */
  startingNodules?: number;
  /**
   * docs/campaign.md §10 — the loudness the mission is tuned for.
   *
   * Metadata, shown as a ceiling. Never a live threshold: a predicate that
   * derived its own number from this would turn a note in the margin into a
   * rule, and §10 is explicit that the budget never fails a mission.
   */
  sigBudget: number;
  /**
   * The structure whose grant `courtSlot` withdraws — the silence ledger's
   * instrument. Absent, the ledger never runs: a mission with no silence
   * order has no array to lend and no debt to keep, which is Asset Recovery's
   * whole posture (docs/mission-asset-recovery.md §3 — Silent Running is
   * present, unfenced, and wrong).
   */
  arrayTag?: MissionTag;
  /** SIG ceiling per hull. Breach costs the player their hearing, never the mission. */
  silenceCeilingSig: number;
  /**
   * The role the silence ledger measures, defaulting to `escort`.
   *
   * Sorrowgate's order binds the flight and not the court's own freight
   * (§4), which is why the ledger has always measured one named set rather
   * than the whole force. Which set is a mission's own word: Attendance holds
   * a `shift` of listeners to twenty-five (docs/mission-attendance.md §5).
   */
  silenceRole?: MissionRole;
  /** Debt cap in seconds, so one catastrophic breach cannot black out the rest. */
  debtCapS: number;
  /**
   * A hull with a `tender` role moves only while an `escort` is this close.
   *
   * Zero disables the rule outright. Sorrowgate's hold is for deaf freight in
   * a drowned district — a hull that does not move without ears — and
   * docs/mission-asset-recovery.md §3 prices the same deafness differently
   * ("at the Scar it does not matter"): a column under writ moves on its own
   * orders, and its escort is made of guns rather than of permission.
   */
  escortRadiusM: number;
  regions: readonly MissionRegion[];
  /** The loads this mission carries. Omitted is none. */
  lifts?: readonly MissionLift[];
  /** The scripted listener whose hearing is an outcome — see `MissionSweep`. */
  sweep?: MissionSweep;
  markers: readonly MissionMarker[];
  parties: readonly MissionParty[];
  locks: readonly AbilityLock[];
  objectives: readonly MissionObjective[];
  beats: readonly MissionBeat[];
  /** The mission's reading of each result. Authored, in-register, not a score. */
  epilogue: Record<MissionOutcome, string>;
}
