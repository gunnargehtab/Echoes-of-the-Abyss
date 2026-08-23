/**
 * Lobby rules, as pure functions over a roster.
 *
 * They live outside MatchRoom because a Colyseus room is a network object —
 * transports, timers, a matchmaker listing — and none of that is what these
 * decisions are about. Pulled out, "who gets which slot" and "is this navy
 * free" are four-line functions with a truth table, and the truth table is
 * what the tests check. The room is then only responsible for calling them.
 *
 * docs/tech-stack.md "Match lifecycle".
 */

import { Faction } from '@echoes/shared';

/**
 * Default pick order, and the order a lobby lays its cards out in.
 *
 * Only a *default*: a joining player is handed the first navy nobody has
 * taken, and may then choose any other free one. Arrival order used to be the
 * whole answer, which in a game with four asymmetric factions made the single
 * most consequential decision a coin flip.
 */
export const FACTION_ORDER: readonly Faction[] = [
  Faction.Bathyarch,
  Faction.Pelagia,
  Faction.Directorate,
  Faction.Hadron,
];

/** The subset of a player the lobby rules actually need. */
export interface RosterEntry {
  sessionId: string;
  slot: number;
  faction: Faction;
  ready: boolean;
  connected: boolean;
}

/**
 * Lowest free slot, not the next one ever issued.
 *
 * A counter that only increments is why reconnection could not work: a player
 * who dropped and came back was handed a fresh, empty slot while their fleet
 * sat in the water under the old one. Undefined means the room is full.
 */
export function allocateSlot(
  roster: readonly RosterEntry[],
  maxClients: number
): number | undefined {
  const taken = new Set(roster.map((entry) => entry.slot));
  for (let slot = 0; slot < maxClients; slot++) {
    if (!taken.has(slot)) return slot;
  }
  return undefined;
}

/** Whether a navy is spoken for by somebody other than `exceptSession`. */
export function isFactionTaken(
  roster: readonly RosterEntry[],
  faction: Faction,
  exceptSession = ''
): boolean {
  return roster.some((entry) => entry.sessionId !== exceptSession && entry.faction === faction);
}

/** The navy a new arrival is handed: the first one nobody else holds. */
export function defaultFaction(roster: readonly RosterEntry[]): Faction {
  return FACTION_ORDER.find((faction) => !isFactionTaken(roster, faction)) ?? FACTION_ORDER[0]!;
}

/**
 * Whether a pick is allowed.
 *
 * Refused rather than corrected: silently handing a client a different navy is
 * how you end up commanding a fleet you did not pick and cannot explain.
 */
export function canChooseFaction(
  roster: readonly RosterEntry[],
  sessionId: string,
  faction: number
): boolean {
  if (!Number.isInteger(faction)) return false;
  if (!FACTION_ORDER.includes(faction as Faction)) return false;
  return !isFactionTaken(roster, faction as Faction, sessionId);
}

/**
 * Whether the match may begin.
 *
 * Disconnected players are not counted: a lobby whose fourth member closed
 * their tab should still be startable by the three who did not. An empty
 * lobby never starts, whatever `minPlayers` is set to.
 */
export function everyoneIsReady(roster: readonly RosterEntry[], minPlayers: number): boolean {
  const present = roster.filter((entry) => entry.connected);
  if (present.length === 0 || present.length < minPlayers) return false;
  return present.every((entry) => entry.ready);
}
