/**
 * The lobby — docs/tech-stack.md "Match lifecycle", docs/ui-ux.md.
 *
 * DOM rather than Pixi, and deliberately: this is the one screen in the game
 * that is chrome rather than world. Buttons here want focus rings, keyboard
 * traversal and a screen reader, all of which a canvas would have to
 * reimplement badly.
 *
 * Nothing here is authoritative. Picking a navy sends a request; the roster
 * you see is whatever the server broadcast back, so a refused pick simply
 * never appears.
 */

import type { Faction, LobbyPlayerView } from '@echoes/shared';
import { LIFECYCLE } from '@echoes/shared';
import { FACTION_DOCTRINE, FACTION_FULL_NAME, FACTION_SUMMARY } from './factions.ts';
import { FACTION_PALETTE } from './palette.ts';

/** Pick order, and the order the cards are laid out in. docs/factions.md. */
const FACTIONS: Faction[] = [0, 1, 2, 3] as Faction[];

const hex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

export interface LobbyProps {
  mapName: string;
  players: LobbyPlayerView[];
  /** This client's own seat, or null before the room has assigned one. */
  sessionId: string | null;
  onChooseFaction(faction: Faction): void;
  onReady(ready: boolean): void;
}

export function Lobby({ mapName, players, sessionId, onChooseFaction, onReady }: LobbyProps) {
  const self = players.find((player) => player.sessionId === sessionId) ?? null;
  const takenBy = new Map<Faction, LobbyPlayerView>();
  for (const player of players) takenBy.set(player.faction as Faction, player);

  const present = players.filter((player) => player.connected);
  // Split "you have not readied" from "somebody else has not": they are
  // different sentences, and rolling them together produces the memorable
  // absurdity of a solo lobby announcing it is waiting on one commander.
  const others = present.filter((player) => player.sessionId !== sessionId && !player.ready).length;
  const shortHanded = present.length < LIFECYCLE.MIN_PLAYERS;
  const needed = LIFECYCLE.MIN_PLAYERS - present.length;

  return (
    <div className="lobby" role="dialog" aria-label="Match lobby">
      <div className="lobby-panel">
        <header className="lobby-head">
          <h2>Standing by</h2>
          <p className="lobby-map">{mapName}</p>
        </header>

        <ul className="lobby-factions">
          {FACTIONS.map((faction) => {
            const holder = takenBy.get(faction);
            const mine = holder !== undefined && holder.sessionId === sessionId;
            const taken = holder !== undefined && !mine;
            return (
              <li key={faction}>
                <button
                  type="button"
                  className={`lobby-faction${mine ? ' mine' : ''}${taken ? ' taken' : ''}`}
                  style={{ '--faction': hex(FACTION_PALETTE[faction].glow) } as React.CSSProperties}
                  // A navy someone else holds is refused server-side anyway;
                  // disabling it says so before the click rather than after.
                  disabled={taken}
                  aria-pressed={mine}
                  onClick={() => onChooseFaction(faction)}
                >
                  <span className="lobby-faction-name">{FACTION_FULL_NAME[faction]}</span>
                  <span className="lobby-faction-doctrine">{FACTION_DOCTRINE[faction]}</span>
                  <span className="lobby-faction-summary">{FACTION_SUMMARY[faction]}</span>
                  {taken && <span className="lobby-faction-holder">{holder.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <ul className="lobby-roster">
          {players.map((player) => (
            <li
              key={player.sessionId}
              className={`lobby-roster-row${player.ready ? ' ready' : ''}${
                player.connected ? '' : ' dropped'
              }`}
            >
              <span className="lobby-roster-name">
                {player.name}
                {player.sessionId === sessionId ? ' (you)' : ''}
              </span>
              <span className="lobby-roster-faction">{FACTION_FULL_NAME[player.faction]}</span>
              <span className="lobby-roster-state">
                {!player.connected ? 'dropped' : player.ready ? 'ready' : 'choosing'}
              </span>
            </li>
          ))}
        </ul>

        <footer className="lobby-foot">
          <button
            type="button"
            className="lobby-ready"
            onClick={() => onReady(!(self?.ready ?? false))}
            disabled={self === null}
          >
            {self?.ready === true ? 'Stand down' : 'Ready'}
          </button>
          <p className="lobby-hint">
            {shortHanded
              ? `Waiting for ${needed} more ${needed === 1 ? 'commander' : 'commanders'}.`
              : self?.ready !== true
                ? 'Ready when you are.'
                : others > 0
                  ? `Waiting on ${others} ${others === 1 ? 'commander' : 'commanders'}.`
                  : 'Starting…'}
          </p>
        </footer>
      </div>
    </div>
  );
}
