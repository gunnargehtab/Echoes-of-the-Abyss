/**
 * The match browser — docs/ui-ux.md §14, docs/tech-stack.md "Finding a match".
 *
 * Three doors into a multiplayer room, because no one of them does the other
 * two's job: a listing of what is open, a field for a room code, and a button
 * to host one. Quick match is still here and still the fastest way into a game
 * with strangers — picking a map is picking a queue — but it is no longer the
 * only way in.
 *
 * **A row says the water and the seat count, and nothing else.** Not who is in
 * there, not which navies they hold, not their names. The ready room
 * negotiates factions among the people already in it; a public listing that
 * named them would let a fourth player counter-pick a match before joining,
 * and one that named commanders would let anyone choose who to avoid or who to
 * hunt. There is no code here that could show more, because the server never
 * sends more.
 *
 * Started rooms are absent rather than greyed out. The matchmaker's
 * availability query filters locked rooms, and a started room is not a thing
 * you can ask to join — offering it and refusing would be the shell promising
 * what the server denies.
 */

import { useCallback, useEffect, useState } from 'react';
import type { MatchListing } from '@echoes/shared';
import { listMatches } from '../net/GameClient.ts';

export interface BrowseScreenProps {
  /** Join a specific room, by id — a listing row or a typed code. */
  onJoin(roomId: string): void;
  /** Go to setup to create a room of your own. */
  onHost(): void;
  /** `joinOrCreate` on whatever water is picked next. Still the fastest way in. */
  onQuickMatch(): void;
  onBack(): void;
  /**
   * How the open rooms are found. Defaults to the real matchmaker query.
   *
   * The fifth of the seams described in CLAUDE.md, and it exists for the same
   * reason as the other four: `listMatches` reaches a server, and a test has
   * none, so every row rule below — a full room refused up front, a row that
   * says the water and the seat count and nothing else — would be unreachable
   * behind the empty list a refused connection returns.
   */
  listRooms?: () => Promise<MatchListing[]>;
}

export function BrowseScreen({
  onJoin,
  onHost,
  onQuickMatch,
  onBack,
  listRooms = listMatches,
}: BrowseScreenProps) {
  const [rooms, setRooms] = useState<MatchListing[] | null>(null);
  const [code, setCode] = useState('');

  const refresh = useCallback(() => {
    let cancelled = false;
    // Null rather than an empty array while in flight: "nobody is playing" and
    // "we have not looked yet" are different sentences, and showing the first
    // one before it is true is the kind of small lie that empties a lobby.
    setRooms(null);
    void listRooms().then((found) => {
      if (!cancelled) setRooms(found);
    });
    return () => {
      cancelled = true;
    };
  }, [listRooms]);

  useEffect(() => refresh(), [refresh]);

  const trimmed = code.trim();

  return (
    <div className="menu-screen" role="dialog" aria-label="Match browser">
      <div className="menu-panel menu-panel-wide">
        <header className="menu-head">
          <h2>Open water</h2>
          <p className="menu-subtitle">
            A room says which water it is on and how many chairs are left. Everything else is for
            the people already in it.
          </p>
        </header>

        <div className="menu-browse-head">
          <span className="menu-field-label">Rooms</span>
          <button type="button" className="menu-chip" onClick={refresh}>
            Refresh
          </button>
        </div>

        {rooms === null && <p className="menu-browse-empty">Listening…</p>}
        {rooms !== null && rooms.length === 0 && (
          <p className="menu-browse-empty">
            No open rooms. Host one, or take a quick match and wait in the water.
          </p>
        )}
        {rooms !== null && rooms.length > 0 && (
          <ul className="menu-browse">
            {rooms.map((room) => {
              const full = room.filled >= room.seats;
              return (
                <li key={room.roomId}>
                  <button
                    type="button"
                    className="menu-browse-row"
                    // A full room would be refused on arrival; saying so here
                    // costs the player a click instead of a round trip.
                    disabled={full}
                    onClick={() => onJoin(room.roomId)}
                  >
                    <span className="menu-browse-map">{room.mapName}</span>
                    <span className="menu-browse-seats">
                      {room.filled} / {room.seats} commanders
                    </span>
                    <span className="menu-browse-action">{full ? 'Full' : 'Join'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="menu-code"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed !== '') onJoin(trimmed);
          }}
        >
          <label className="menu-field">
            <span className="menu-field-label">Room code</span>
            <input
              className="menu-input"
              type="text"
              value={code}
              maxLength={64}
              placeholder="Paste the code a host sent you"
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button type="submit" className="menu-chip" disabled={trimmed === ''}>
            Join
          </button>
        </form>

        <footer className="menu-foot">
          <button type="button" className="menu-commit" onClick={onHost} autoFocus>
            Host a match
          </button>
          <button type="button" className="menu-subscreen-inline" onClick={onQuickMatch}>
            Quick match
            <span className="menu-subscreen-note">Any room on the water you pick</span>
          </button>
          <button type="button" className="menu-back" onClick={onBack}>
            Back
          </button>
        </footer>
      </div>
    </div>
  );
}
