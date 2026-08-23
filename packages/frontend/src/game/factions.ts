/**
 * Faction presentation — docs/factions.md.
 *
 * Names first: a faction's *formal* name is not what anyone calls them. The
 * Bathyarch Consortium is "the Consortium" on a contact log and in a lobby,
 * and writing "Bathyarch" in the interface would be the in-fiction equivalent
 * of a legal filing.
 *
 * The doctrine lines exist because a lobby that offers four navies and says
 * nothing about them is still a coin flip, only slower. Each is the one
 * sentence from that faction's Doctrine section that tells a new commander
 * what they are signing up to — every one of them an argument about sound.
 */

import { Faction } from '@echoes/shared';

export const FACTION_NAME: Record<Faction, string> = {
  [Faction.Bathyarch]: 'Consortium',
  [Faction.Pelagia]: 'Commune',
  [Faction.Directorate]: 'Directorate',
  [Faction.Hadron]: 'Knights',
};

/** Full names, for the one place that has room for them: the lobby card. */
export const FACTION_FULL_NAME: Record<Faction, string> = {
  [Faction.Bathyarch]: 'Bathyarch Consortium',
  [Faction.Pelagia]: 'Pelagia Commune',
  [Faction.Directorate]: 'Abyssal Directorate',
  [Faction.Hadron]: 'Hadron Knights',
};

/** The doctrine name each faction gives its own way of fighting. */
export const FACTION_DOCTRINE: Record<Faction, string> = {
  [Faction.Bathyarch]: 'The Klaxon',
  [Faction.Pelagia]: 'The Veil',
  [Faction.Directorate]: 'The Listening',
  [Faction.Hadron]: 'The Score',
};

export const FACTION_SUMMARY: Record<Faction, string> = {
  [Faction.Bathyarch]:
    'Loudest in the game and built to survive being heard. Heavy economy, armoured pushes, +12% damage above 60 SIG — and audible four minutes before arrival.',
  [Faction.Pelagia]:
    'Lowest SIG in the game. Harvests at 18 where others harvest at 50, and loses any fight it did not choose.',
  [Faction.Directorate]:
    'Hears one resolution tier further than anyone else, and is paid in Biomass for the fauna your noise draws in.',
  [Faction.Hadron]:
    'Sound as a weapon: emissions focus into cones, so Knights are deafening in front and quiet on the flank.',
};
