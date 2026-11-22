/**
 * The words a row's status is said in — docs/ui-ux.md §10.5, #1883.
 *
 * One table for the orders panel and the mission's close, because the two read
 * the same row and must not disagree about what it means. The server sends a
 * status and two codes (`ObjectiveForm`, `ObjectiveWeight`); the words are the
 * shell's own, as every other line about the player's own hulls is.
 *
 * Why three vocabularies rather than one: *met* meant *done* on a task, *true
 * right now* on a rule, and *spent* on a budget, and the panel said *met* in
 * success teal for all three. Sorrowgate's silence order read *met* at 0:21, and
 * Exposure's classification budget turned *met* at the moment the survey was
 * recalled.
 */

import {
  ObjectiveForm,
  ObjectiveStatus,
  ObjectiveWeight,
  type ObjectiveView,
} from '@echoes/shared';

type Words = Record<ObjectiveStatus, string>;

const TASK: Words = {
  [ObjectiveStatus.Pending]: 'open',
  [ObjectiveStatus.Met]: 'met',
  [ObjectiveStatus.Failed]: 'failed',
};

/** A rule holds now and can stop holding, so *kept*, never *met*. */
const RULE: Words = {
  [ObjectiveStatus.Pending]: 'open',
  [ObjectiveStatus.Met]: 'kept',
  [ObjectiveStatus.Failed]: 'broken',
};

/**
 * A budget is something not to spend. *Open* invited the player to fill it, and
 * *met* in teal congratulated them when they had.
 */
const BUDGET: Words = {
  [ObjectiveStatus.Pending]: 'budget',
  [ObjectiveStatus.Met]: 'spent',
  [ObjectiveStatus.Failed]: 'spent',
};

const formOf = (objective: ObjectiveView): ObjectiveForm => objective.form ?? ObjectiveForm.Task;

/** The status word, lower-case; the panel's type sets the case. */
export function statusWord(objective: ObjectiveView): string {
  switch (formOf(objective)) {
    case ObjectiveForm.Rule:
      return RULE[objective.status];
    case ObjectiveForm.Budget:
      return BUDGET[objective.status];
    case ObjectiveForm.Task:
      return TASK[objective.status];
  }
}

/**
 * The class a row is drawn in. `met` dims the reading, because a finished task
 * can be skimmed past; `kept` does not, because a rule is still in force; and
 * `spent` warns.
 */
export type StatusClass = 'pending' | 'met' | 'kept' | 'failed' | 'budget' | 'spent';

export function statusClass(objective: ObjectiveView): StatusClass {
  const form = formOf(objective);
  if (form === ObjectiveForm.Budget) {
    return objective.status === ObjectiveStatus.Pending ? 'budget' : 'spent';
  }
  if (objective.status === ObjectiveStatus.Pending) return 'pending';
  if (objective.status === ObjectiveStatus.Failed) return 'failed';
  return form === ObjectiveForm.Rule ? 'kept' : 'met';
}

/**
 * Whether the row decides the result. Required rows are the plain case and
 * carry no word; a critical row loses the mission when it is missed, and an
 * optional one is read at the close and counted by nothing.
 */
export function weightWord(objective: ObjectiveView): string | undefined {
  switch (objective.weight) {
    case ObjectiveWeight.Critical:
      return 'critical';
    case ObjectiveWeight.Optional:
      return 'optional';
    default:
      return undefined;
  }
}

/** `3 of 4`, or `12 of 30 s` on a budget, which the server counts in seconds. */
export function progressWords(objective: ObjectiveView): string | undefined {
  if (objective.progress === undefined) return undefined;
  const { done, of } = objective.progress;
  return formOf(objective) === ObjectiveForm.Budget ? `${done} of ${of} s` : `${done} of ${of}`;
}
