/**
 * The sole producer of the mission wire payload.
 *
 * Three data parameters and not one of them can carry another slot's state: the
 * authored mission, the runtime's own bookkeeping, and one resolved
 * `EchoSnapshot` — the player's. Nothing here reads a second snapshot because
 * there is not a second snapshot in scope, and every counter it emits comes
 * back out of `predicates.ts`, which is given the same three things.
 *
 * That is the guarantee, and it is a parameter list rather than a convention.
 * Widening it is how this stops being true, so it is the line to defend.
 */

import { SIM } from '@echoes/shared';
import type {
  AbilityLock,
  CommanderAbilityView,
  EchoSnapshot,
  MissionMarker,
  MissionView,
  ObjectiveStatus,
  ObjectiveView,
} from '@echoes/shared';

import { exposedAtLeast, progressOf } from './predicates.ts';
import type {
  MissionDefinition,
  MissionObjective,
  MissionRegion,
  MissionRole,
  MissionWalkRow,
} from './types.ts';

/**
 * What the runtime remembers between Echo ticks.
 *
 * Deliberately thin: statuses, when each objective's clock started, which of
 * the player's own hulls hold which role, and the silence ledger. No entity
 * positions and no scripted-party state, so there is nothing in here that could
 * reach the wire even by accident.
 */
export interface MissionState {
  statuses: Map<string, ObjectiveStatus>;
  startedAt: Map<string, number>;
  roleIds: Map<MissionRole, Set<number>>;
  /** The player's own hulls carrying a completed lift — see `LoadedIds`. */
  loadedIds: Set<number>;
  /** The same, keyed by lift id, for predicates that name their load. */
  loadedByLift: Map<string, number>;
  /** How many authored arrivals this observer resolved — see `attend`. */
  attended: number;
  /** How many authored soundings this observer's hulls finished — see `sound`. */
  sounded: number;
  /**
   * The walk, when the mission authors one — see `MissionWalk`.
   *
   * Three numbers and a flag, and not one of them is a fact about anybody else.
   * `turned` is how far the plateau's own question has got, `rowIndex` says
   * which authored row is live, and `stalled` says *this row is not turning* —
   * never why, and never who. The cause may be another party's hull inside the
   * radius, and that is precisely the sentence this field is shaped to be
   * unable to carry.
   */
  walk?: { turned: number; rowIndex: number; stalled: boolean };
  /** The commander's one act, when the mission grants one — see `CommanderAbilityView`. */
  ability?: CommanderAbilityView;
  /**
   * Sim ticks this observer's own force stood at each resolution tier in
   * somebody else's ears, indexed by `ResolutionTier` — see `tolerance`.
   *
   * A tally over the player's own `ExposureReport` and nothing else, so it is
   * as safe to hold here as `attended` is: it says how loudly the party has
   * been heard and cannot say by whom.
   */
  exposedByTier: readonly number[];
  debtS: number;
}

const NO_IDS: ReadonlySet<number> = new Set<number>();

export function projectMissionView(
  definition: MissionDefinition,
  state: MissionState,
  own: EchoSnapshot
): MissionView {
  const objectives: ObjectiveView[] = [];
  const named = new Set<string>();
  for (const objective of definition.objectives) {
    if (objective.revealAtTick !== undefined && own.tick < objective.revealAtTick) continue;
    objectives.push(objectiveView(definition, objective, state, own));
    if (objective.markerId !== undefined) named.add(objective.markerId);
  }
  // The live row's marker, and only that one. An objective carries a single
  // `markerId` and the walk *moves*, so the circuit's seven rows cannot be
  // named the way every other marker is — but shipping all seven would put the
  // whole authored circuit on the wire at 01:00, which is the same leak
  // `revealAtTick` exists to prevent one objective at a time. The plateau
  // knows where its own question is; it does not know where it will be.
  const walkRow = liveRow(definition, state);
  if (walkRow?.markerId !== undefined) named.add(walkRow.markerId);
  return {
    missionId: definition.id,
    tick: own.tick,
    objectives,
    // Only the markers a *revealed* objective names, and this is the same
    // withholding as `revealAtTick` rather than a tidiness pass. In the
    // Prologue the sole marker is the Upper Concourse, and the court does not
    // name where the tenders are going until it opens the gate at 11:20
    // (docs/mission-sorrowgate.md §8) — shipping the marker with the first view
    // would put the extraction point on the wire eleven minutes early, and a
    // payload the client holds is a payload some later layer draws.
    //
    // Derived from the objectives rather than given its own reveal time so the
    // two cannot drift apart; `missions.test.ts` asserts every authored marker
    // is named by an objective, so a marker cannot go quietly unshipped.
    //
    // Copied out rather than passed through: the definition's arrays are
    // readonly authored data and the wire types are not, and a payload that
    // aliased the literal would let one bad consumer edit the mission.
    markers: definition.markers
      .filter((marker) => named.has(marker.id))
      .map((marker): MissionMarker => ({ ...marker })),
    locks: definition.locks.map((lock): AbilityLock => ({ ...lock })),
    sigBudget: definition.sigBudget,
    debtS: state.debtS,
    ...(state.ability === undefined ? {} : { ability: state.ability }),
  };
}

function objectiveView(
  definition: MissionDefinition,
  objective: MissionObjective,
  state: MissionState,
  own: EchoSnapshot
): ObjectiveView {
  const view: ObjectiveView = {
    id: objective.id,
    text: textFor(objective, state),
    status: state.statuses.get(objective.id) ?? objective.initial,
  };
  if (objective.markerId !== undefined) view.markerId = objective.markerId;
  // The walk sends the camera to wherever the question currently is, which is
  // the one marker in this format that is not a constant. An objective carries
  // a single `markerId` and a circuit moves, so the walk's objective takes the
  // live row's — the same substitution `textFor` performs on the reading, one
  // field over. A mission that authors both keeps its own for the rows it
  // named and gains the row's while the walk is running.
  if (objective.predicate.kind === 'walk') {
    const row = liveRow(definition, state);
    if (row?.markerId !== undefined) view.markerId = row.markerId;
  }
  if (counts(objective)) {
    const progress = progressOf(
      objective.predicate,
      own,
      (role) => state.roleIds.get(role) ?? NO_IDS,
      (id) => regionById(definition, id),
      state.startedAt.get(objective.id) ?? 0,
      (lift) => {
        if (lift === undefined) return state.loadedIds;
        const carrier = state.loadedByLift.get(lift);
        return carrier === undefined ? NO_IDS : new Set([carrier]);
      },
      state.attended,
      (tier) => exposedAtLeast(state.exposedByTier, tier),
      state.sounded,
      state.walk?.turned ?? 0
    );
    view.progress = objective.predicate.kind === 'tolerance' ? inSeconds(progress) : progress;
  }
  return view;
}

/**
 * A tick counter, as the chapter speaks it.
 *
 * docs/mission-aptitude.md §12 reads the tolerance out as "Eleven seconds of
 * thirty are entered", and §5 states it in seconds throughout; the union stores
 * ticks because that is what the simulation counts in. The conversion lives
 * here rather than in `progressOf` so that no rounding step sits between the
 * tally and the threshold `isMet` compares it against, and here rather than in
 * an authored `text` because docs/campaign.md §10's rule is that a mission
 * literal states sentences, not arithmetic.
 *
 * Floored on both halves, so the reading only ever claims a second the party
 * has actually spent and the target never grows a second the threshold does not
 * hold. Exact for any tolerance authored in whole seconds, which is every
 * duration this format produces — `T(m, s)` and `30 * SIM.TICK_HZ` both land on
 * a tick boundary.
 */
function inSeconds(progress: { done: number; of: number }): { done: number; of: number } {
  return {
    done: Math.floor(progress.done / SIM.TICK_HZ),
    of: Math.floor(progress.of / SIM.TICK_HZ),
  };
}

/**
 * The court's reading of a rule changes while the flight owes it a silence —
 * docs/mission-sorrowgate.md §12 authors both readings of the same objective.
 */
function textFor(objective: MissionObjective, state: MissionState): string {
  if (objective.debtText !== undefined && state.debtS > 0) return objective.debtText;
  // The plateau's second reading of the same rule, while the walk is stalled —
  // docs/mission-convocation.md §12. `debtText`'s arrangement, and checked
  // after it for the same reason it is checked at all: a mission authors at
  // most one of the two, and no mission authors both.
  if (objective.stallText !== undefined && state.walk?.stalled === true) return objective.stallText;
  return objective.text;
}

/**
 * A counter is for things the player can count. `extract` and `survive` tally
 * hulls, which is a number worth showing beside a sentence; a ceiling and a
 * clock are rules that are simply in force or not, and rendering "1 of 1" or a
 * tick count beside either would be a progress bar over a fact.
 */
function counts(objective: MissionObjective): boolean {
  return (
    objective.predicate.kind === 'extract' ||
    objective.predicate.kind === 'survive' ||
    // The attended count is the one number the Directorate's whole rite is
    // about, and the instrument carries it from the first arrival — which is
    // how docs/mission-attendance.md §8's failure is audible for the whole
    // mission rather than announced at the close.
    objective.predicate.kind === 'attend' ||
    // "Four of six sounded" is the reading docs/mission-aptitude.md §8's
    // results table is counted out of, and a sounding is the most countable
    // thing the mission has: the player chose each formation, aimed at it and
    // waited out its twenty seconds. A counter over it states the objective
    // rather than decorating it.
    objective.predicate.kind === 'sound' ||
    // "Four of seven turned" is the whole of what the plateau knows about its
    // own question, and docs/mission-convocation.md §4's restart is only
    // legible as a *drop* in a number the player was already reading. A
    // counter that appeared at the close would make the mission's central
    // reversal invisible at the moment it happens.
    objective.predicate.kind === 'walk' ||
    // The tolerance is a budget the player spends rather than an objective they
    // complete, and §5 is explicit that nothing about it is hidden: "the
    // exposure readout carries the tier from the first tick". A counter that
    // appeared only once it mattered would be the warning arriving with the
    // consequence.
    objective.predicate.kind === 'tolerance' ||
    // The number is the objective — docs/mission-shift-change.md §8: a quota
    // is the most countable thing a shift has, and the counter beside it is
    // the same figure the player's own stockpile readout carries. Whatever
    // the account: a band of Biomass (docs/mission-intake.md §8) is counted
    // for the same reason a quota of Nodules is.
    objective.predicate.kind === 'deliver'
  );
}

/** The row the walk is standing on, or undefined in a mission without one. */
function liveRow(definition: MissionDefinition, state: MissionState): MissionWalkRow | undefined {
  if (state.walk === undefined) return undefined;
  return definition.walk?.rows[state.walk.rowIndex];
}

function regionById(definition: MissionDefinition, id: string): MissionRegion | undefined {
  return definition.regions.find((region) => region.id === id);
}
