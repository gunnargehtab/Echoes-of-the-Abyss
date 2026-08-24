/**
 * Per-faction combat doctrine, as functions.
 *
 * The tables live in `constants.ts` beside every other tuning number; these are
 * the readers, and they exist so that "what does this faction do differently"
 * is asked in exactly one place. Shared rather than server-only because the
 * client previews its own weapons with them — the same argument that put
 * `withinSeekerCone` in shared: a launch envelope the client drew differently
 * from the one the server enforced would be a lie told in good faith.
 *
 * See docs/systems-combat.md §11.
 */

import { FACTION_COMBAT, ORDNANCE } from './constants.js';
import { Faction } from './types.js';

/**
 * Damage multiplier for a hull of this faction at this live signature.
 *
 * 1 for everybody except a loud Consortium hull. The Klaxon is checked against
 * the signature the acoustics system computed this tick, not against a stat,
 * because the doctrine is "everything that makes you strong makes you loud"
 * read backwards: being loud is the thing that makes them strong.
 */
export function damageMultiplierFor(faction: Faction, sig: number): number {
  if (faction !== FACTION_COMBAT.KLAXON.FACTION) return 1;
  return sig > FACTION_COMBAT.KLAXON.SIG_THRESHOLD ? FACTION_COMBAT.KLAXON.DAMAGE_MULTIPLIER : 1;
}

/**
 * The SIG burst a discharge from this faction produces.
 *
 * The hull's own kinetic figure, unless the faction fights with energy — in
 * which case the class replaces it outright. docs/systems-combat.md §3 lists
 * the two classes as different weapons, not as a discount on one.
 */
export function firingSigFor(faction: Faction, hullFiringSig: number): number {
  return faction === FACTION_COMBAT.ENERGY.FACTION
    ? FACTION_COMBAT.ENERGY.FIRING_SIG
    : hullFiringSig;
}

/** Seeker sensitivity for a torpedo launched by this faction. */
export function seekerHydFor(faction: Faction): number {
  return FACTION_COMBAT.SEEKER_HYD[faction] ?? ORDNANCE.TORPEDO.SEEKER_HYD;
}

/** How many live mines this faction may hold at once. */
export function mineCapFor(faction: Faction): number {
  return FACTION_COMBAT.MINE_CAP[faction] ?? ORDNANCE.MINE.CAP_PER_PLAYER;
}
