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
  | { kind: 'extract'; role: MissionRole; region: string; count: number }
  | { kind: 'survive'; role: MissionRole; count: number }
  | { kind: 'quiet'; role: MissionRole; ceilingSig: number }
  | { kind: 'endure'; ticks: number };

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
  markers: readonly MissionMarker[];
  parties: readonly MissionParty[];
  locks: readonly AbilityLock[];
  objectives: readonly MissionObjective[];
  beats: readonly MissionBeat[];
  /** The mission's reading of each result. Authored, in-register, not a score. */
  epilogue: Record<MissionOutcome, string>;
}
