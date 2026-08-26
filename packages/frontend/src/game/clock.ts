/**
 * The match clock — docs/ui-ux.md §10's T+ axis, shared by the contact log
 * and the top strip so the two can never disagree about what time it is.
 *
 * Simulation ticks over SIM.TICK_HZ, never wall clock: the server's tick is
 * identical for every commander and survives a reconnect, where a local
 * accumulator would drift by exactly the outage.
 */

import { SIM } from '@echoes/shared';

/** `T+mm:ss`, zero-padded so the digit count never shifts (§3's rule). */
export function stamp(tick: number): string {
  const seconds = Math.floor(tick / SIM.TICK_HZ);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `T+${mm}:${ss}`;
}
