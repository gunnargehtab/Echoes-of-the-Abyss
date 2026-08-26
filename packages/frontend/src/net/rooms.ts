/**
 * The two decisions behind the match browser — docs/tech-stack.md, "Finding a
 * match".
 *
 * Both are pure, and both are here rather than inline for the same reason:
 * they are rules rather than plumbing, and each has a failure mode that is
 * silent. A door rule inverted by one keystroke makes solo games joinable by
 * strangers and nothing throws; a listing filter that trusted a room's
 * metadata to exist sends players at rooms that cannot say where they are.
 */

import type { MatchListing, MatchListingMetadata } from '@echoes/shared';

/** What the shell is asking the matchmaker for. */
export interface MatchDoor {
  /** Create a room, and whether the world may see it. Absent means join one. */
  create?: 'public' | 'private';
}

/** The three ways the setup screen is reached. */
export type SetupMode = 'solo' | 'host' | 'quick';

/**
 * Which door a setup screen commits through.
 *
 * - **Solo is always private.** A solo game somebody else can be matched into
 *   is not a solo game, and until private rooms existed the solo entry shared
 *   `joinOrCreate` with multiplayer — so choosing Solo could drop you into a
 *   stranger's lobby on the same water, and a stranger into yours.
 * - **Hosting asks**, and defaults to listed: the common case is wanting to be
 *   found. Unlisted is reachable only by the room's id, which is what a code is.
 * - **Quick match creates nothing.** Looking for a room and opening one are
 *   opposite requests, and `joinOrCreate` already does the first properly.
 */
export function doorFor(mode: SetupMode, listed: boolean): MatchDoor {
  if (mode === 'quick') return {};
  if (mode === 'solo') return { create: 'private' };
  return { create: listed ? 'public' : 'private' };
}

/** The shape `getAvailableRooms` hands back, narrowed to what a listing needs. */
export interface AvailableRoom {
  roomId: string;
  metadata?: Partial<MatchListingMetadata>;
}

/**
 * Turn the matchmaker's answer into rows the browser can draw.
 *
 * A room whose metadata has not landed yet is **dropped, not guessed at**. The
 * room publishes it inside `onCreate`, which the matchmaker awaits, so in
 * practice every listed room has it — but a row that could not say which water
 * it was on would be asking the player to click and find out, and this is a
 * game where finding out costs something.
 */
export function toListings(rooms: readonly AvailableRoom[]): MatchListing[] {
  const listings: MatchListing[] = [];
  for (const room of rooms) {
    const meta = room.metadata;
    if (meta === undefined) continue;
    if (typeof meta.mapId !== 'string' || typeof meta.mapName !== 'string') continue;
    if (typeof meta.seats !== 'number' || typeof meta.filled !== 'number') continue;
    listings.push({
      roomId: room.roomId,
      mapId: meta.mapId,
      mapName: meta.mapName,
      // Clamped rather than trusted. These arrive from another process, and a
      // negative or absurd count would render as "-1 / 4 commanders" — the
      // browser's whole job is to be readable at a glance.
      seats: Math.max(0, Math.trunc(meta.seats)),
      filled: Math.max(0, Math.min(Math.trunc(meta.seats), Math.trunc(meta.filled))),
    });
  }
  return listings;
}
