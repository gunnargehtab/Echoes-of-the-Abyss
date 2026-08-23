/**
 * The result screen — docs/tech-stack.md "Match lifecycle".
 *
 * It reports one fact: who won. Not a kill tally, not a resource graph, not a
 * map of where the other commander actually was. A post-match screen that
 * reveals the match is a delayed maphack — the second game on the same map
 * would be played with knowledge the first one refused to give — and this game
 * is hidden information all the way to the end of it.
 *
 * The contact log stays on screen behind this panel, so the player's own
 * record of what they heard is still there to read. That is the honest version
 * of a post-match report: what you knew, not what was true.
 */

import type { LobbyPlayerView } from '@echoes/shared';
import { FACTION_FULL_NAME } from './factions.ts';

export interface MatchResultProps {
  winnerSlot: number;
  players: LobbyPlayerView[];
  sessionId: string | null;
  onRematch(ready: boolean): void;
}

export function MatchResult({ winnerSlot, players, sessionId, onRematch }: MatchResultProps) {
  const self = players.find((player) => player.sessionId === sessionId) ?? null;
  const winner = players.find((player) => player.slot === winnerSlot) ?? null;
  const won = self !== null && self.slot === winnerSlot;
  const others = players.filter(
    (player) => player.connected && player.sessionId !== sessionId && !player.ready
  ).length;

  return (
    <div className="result" role="dialog" aria-label="Match result">
      <div className="result-panel">
        <h2 className={won ? 'result-won' : 'result-lost'}>
          {winner === null ? 'Match ended' : won ? 'The water is yours' : 'Contact lost'}
        </h2>
        <p className="result-line">
          {winner === null
            ? 'No commander was left standing.'
            : `${winner.name} — ${FACTION_FULL_NAME[winner.faction]}`}
        </p>
        <div className="result-actions">
          <button
            type="button"
            className="result-rematch"
            onClick={() => onRematch(!(self?.ready ?? false))}
            disabled={self === null}
          >
            {self?.ready === true ? 'Waiting…' : 'Rematch'}
          </button>
        </div>
        <p className="result-hint">
          {self?.ready === true && others > 0
            ? `Waiting on ${others} ${others === 1 ? 'commander' : 'commanders'}.`
            : 'Same ground, same roster, a new world.'}
        </p>
      </div>
    </div>
  );
}
