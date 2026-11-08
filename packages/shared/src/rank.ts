/**
 * Rank — docs/systems-progression.md §3, the readers of `RANK`.
 *
 * Shared rather than server-only for the Echo Layer's sake as much as the
 * client's: the hull a Track contact reads is the listed hull times the rank's
 * factor, and the server computes that in two places that must agree to the
 * bit — the rank-up that writes `Health.max`, and the Track readout that leaves
 * a Plate out of it (`rankedHull`). One function, so one rounding.
 *
 * Nothing here knows about entities. Experience is credited by the server
 * (`sim/systems/rank.ts`), where damage lands.
 */

import { RANK } from './constants.js';

/**
 * The rank this much experience has earned, on a hull of this listed maximum.
 *
 * Against the *listed* figure, never `Health.max` (§3, ruling 3): a Plate
 * Refit is bought and should not slow a hull's ranking, and a rank's own hull
 * should not raise the threshold to the next one. A hull with no hull to speak
 * of earns nothing rather than dividing by it.
 */
export function rankForExperience(experience: number, listedMaxHp: number): number {
  if (!(listedMaxHp > 0)) return 0;
  let rank = 0;
  while (rank < RANK.MAX && experience >= RANK.THRESHOLDS[rank + 1]! * listedMaxHp) rank++;
  return rank;
}

/** What this rank multiplies a hull's maximum by. */
export function rankHullFactor(rank: number): number {
  return RANK.HULL_FACTOR[rank] ?? 1;
}

/** What this rank multiplies a hull's gun damage by. Never its torpedoes'. */
export function rankGunFactor(rank: number): number {
  return RANK.GUN_FACTOR[rank] ?? 1;
}

/**
 * A hull's maximum at this rank, before any refit: what an enemy at Track is
 * told it is, and what an unplated navy's hull is.
 *
 * Rounded to single precision, the precision `Health` keeps, so a plated
 * veteran's readout and an unplated veteran's stored maximum are one number
 * rather than two that differ in the last bit — which would sort the plate it
 * exists to hide (docs/systems-echo.md §4, #1294).
 */
export function rankedHull(listedMaxHp: number, rank: number): number {
  return Math.fround(listedMaxHp * rankHullFactor(rank));
}
