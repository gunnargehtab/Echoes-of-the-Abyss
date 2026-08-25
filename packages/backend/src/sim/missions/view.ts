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

import type {
  AbilityLock,
  EchoSnapshot,
  MissionMarker,
  MissionView,
  ObjectiveStatus,
  ObjectiveView,
} from '@echoes/shared';

import { progressOf } from './predicates.ts';
import type { MissionDefinition, MissionObjective, MissionRegion, MissionRole } from './types.ts';

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
  debtS: number;
}

const NO_IDS: ReadonlySet<number> = new Set<number>();

export function projectMissionView(
  definition: MissionDefinition,
  state: MissionState,
  own: EchoSnapshot
): MissionView {
  const objectives: ObjectiveView[] = [];
  for (const objective of definition.objectives) {
    if (objective.revealAtTick !== undefined && own.tick < objective.revealAtTick) continue;
    objectives.push(objectiveView(definition, objective, state, own));
  }
  return {
    missionId: definition.id,
    tick: own.tick,
    objectives,
    // Copied out rather than passed through: the definition's arrays are
    // readonly authored data and the wire types are not, and a payload that
    // aliased the literal would let one bad consumer edit the mission.
    markers: definition.markers.map((marker): MissionMarker => ({ ...marker })),
    locks: definition.locks.map((lock): AbilityLock => ({ ...lock })),
    sigBudget: definition.sigBudget,
    debtS: state.debtS,
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
  if (counts(objective)) {
    view.progress = progressOf(
      objective.predicate,
      own,
      (role) => state.roleIds.get(role) ?? NO_IDS,
      (id) => regionById(definition, id),
      state.startedAt.get(objective.id) ?? 0
    );
  }
  return view;
}

/**
 * The court's reading of a rule changes while the flight owes it a silence —
 * docs/mission-sorrowgate.md §12 authors both readings of the same objective.
 */
function textFor(objective: MissionObjective, state: MissionState): string {
  if (objective.debtText !== undefined && state.debtS > 0) return objective.debtText;
  return objective.text;
}

/**
 * A counter is for things the player can count. `extract` and `survive` tally
 * hulls, which is a number worth showing beside a sentence; a ceiling and a
 * clock are rules that are simply in force or not, and rendering "1 of 1" or a
 * tick count beside either would be a progress bar over a fact.
 */
function counts(objective: MissionObjective): boolean {
  return objective.predicate.kind === 'extract' || objective.predicate.kind === 'survive';
}

function regionById(definition: MissionDefinition, id: string): MissionRegion | undefined {
  return definition.regions.find((region) => region.id === id);
}
