/**
 * The authored mission format — docs/campaign.md, docs/mission-sorrowgate.md.
 *
 * Authored, never generated, in the idiom `sim/maps/types.ts` argues for: a data
 * literal with no logic, no loader and no schema validator, so a mistyped tag or
 * a beat that names a hull nobody placed fails at `npm run type-check` rather
 * than half way through a match.
 *
 * A table, not a language. Four predicates, nine beat kinds, no expressions, no
 * variables, no conditions. `sim/maps/types.ts` makes this argument about region
 * shapes and it holds harder here: a mission scripting language would be more
 * expressive than anything in `docs/` actually asks for, and the second mission
 * is the right time to find out what the first one was missing.
 */

import type {
  AbilityLock,
  Faction,
  FaunaSpecies,
  MissionHeader,
  MissionMarker,
  MissionOutcome,
  ObjectiveStatus,
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
 */
export type MissionRole = 'escort' | 'tender';

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
   * driven through the gate. Own-force information, like everything else here:
   * a load is a fact about the observer's own carrier.
   */
  | { kind: 'extract'; role: MissionRole; region: string; count: number; loaded?: true }
  | { kind: 'survive'; role: MissionRole; count: number }
  | { kind: 'quiet'; role: MissionRole; ceilingSig: number }
  | { kind: 'endure'; ticks: number };

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
   * Write the ground under a named region (#197).
   *
   * The one beat that changes the map rather than what is on it. Authored as a
   * region so it reads like the map literal it is editing, and applied in beat
   * order at the same tick — which is what lets a span be collapsed whole and
   * a passage through it re-cut immediately after, exactly the way
   * `sim/maps/types.ts` lets a tunnel be laid across a plateau.
   *
   * `SOLID` from `sim/terrain.ts` is how rock is spelled.
   */
  | {
      atTick: number;
      kind: 'ground';
      region: string;
      floorM?: number;
      ceilingM?: number;
      note: string;
    }
  | { atTick: number; kind: 'objective'; id: string; status: ObjectiveStatus; note: string }
  | { atTick: number; kind: 'say'; speaker: string; text: string; note: string }
  | { atTick: number; kind: 'resolve'; note: string };

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
  /** The structure whose grant `courtSlot` withdraws. */
  arrayTag: MissionTag;
  /** SIG ceiling per hull. Breach costs the player their hearing, never the mission. */
  silenceCeilingSig: number;
  /** Debt cap in seconds, so one catastrophic breach cannot black out the rest. */
  debtCapS: number;
  /** A hull with a `tender` role moves only while an `escort` is this close. */
  escortRadiusM: number;
  regions: readonly MissionRegion[];
  /** The loads this mission carries. Omitted is none. */
  lifts?: readonly MissionLift[];
  markers: readonly MissionMarker[];
  parties: readonly MissionParty[];
  locks: readonly AbilityLock[];
  objectives: readonly MissionObjective[];
  beats: readonly MissionBeat[];
  /** The mission's reading of each result. Authored, in-register, not a score. */
  epilogue: Record<MissionOutcome, string>;
}
