/**
 * When a conditional beat fires — docs/mission-aptitude.md §13, "a beat fired
 * by a condition rather than a tick".
 *
 * Pure, and separate from the runtime that spends it, for `soundingHolds`'
 * reason: the rule the mission enforces and the rule a test can state are the
 * same one, written once. The runtime adds what needs a world — the snapshot
 * the predicate is evaluated against, and the sink the effect is applied to —
 * and nothing else.
 *
 * The rule itself is one sentence, and it is short on purpose. A conditional
 * beat fires on the first mission tick its predicate is met and never again.
 * There is no scheduling, no ordering between beats and no interaction between
 * them: two beats whose conditions come true on the same tick both fire, in
 * authored order, exactly as two beats sharing an `atTick` do.
 */

import type { MissionConditionalBeat } from './types.ts';

/**
 * The indices of the beats firing on this pass, in authored order.
 *
 * Indices rather than the beats themselves, because "fired" has to be
 * remembered somewhere and an index is the only handle a beat has: the type is
 * a data literal with no id field, and giving it one would invite an author to
 * write two beats with the same one.
 *
 * `fired` is the caller's ledger and this function never writes it — the caller
 * marks what it actually applied, so a beat cannot be recorded as fired by a
 * pass that then failed to find the hull it names.
 */
export function dueConditionalBeats(
  beats: readonly MissionConditionalBeat[],
  fired: ReadonlySet<number>,
  met: (beat: MissionConditionalBeat, index: number) => boolean
): number[] {
  const due: number[] = [];
  for (let i = 0; i < beats.length; i++) {
    // Asked in this order deliberately: a beat that has already fired is never
    // evaluated again, so a predicate that stops being true cannot re-arm it,
    // and the mission tick does not pay for a condition whose answer can no
    // longer matter.
    if (fired.has(i)) continue;
    if (met(beats[i]!, i)) due.push(i);
  }
  return due;
}
