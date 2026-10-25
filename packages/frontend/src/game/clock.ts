/**
 * The match clock — docs/ui-ux.md §10's T+ axis, shared by the contact log
 * and the top strip so the two can never disagree about what time it is.
 *
 * Simulation ticks over SIM.TICK_HZ, never wall clock: the server's tick is
 * identical for every commander and survives a reconnect, where a local
 * accumulator would drift by exactly the outage.
 */

import { SIM } from '@echoes/shared';

/** `mm:ss`, zero-padded so the digit count never shifts (§3's rule). */
function minutes(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** `T+mm:ss`, zero-padded so the digit count never shifts (§3's rule). */
export function stamp(tick: number): string {
  return `T+${minutes(Math.floor(tick / SIM.TICK_HZ))}`;
}

/**
 * The time left on a hold, `mm:ss` — docs/ui-ux.md §10.5's countdown (#1611).
 *
 * Rounded up, the debt's rule: a hold with half a second to run has not run
 * out, so `00:00` is the tick it ends on and never the second before it. Never
 * negative — the row goes met within an Echo pass of its end, and the figure
 * holds at zero across that pass rather than counting on past it.
 */
export function remaining(ticks: number): string {
  return minutes(Math.max(0, Math.ceil(ticks / SIM.TICK_HZ)));
}
