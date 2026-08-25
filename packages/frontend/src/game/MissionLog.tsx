/**
 * The mission log — the `say` channel (docs/mission-sorrowgate.md §12).
 *
 * Deliberately a *separate* feed from the contact log, and this is the whole
 * design decision. The contact log is the player's record of what they heard,
 * and its value is that every row in it was earned: it is the artefact you
 * read afterwards to answer "when did they hear me". A scripted line is not a
 * detection. Interleaving the two would dilute that record with prose the
 * player's hydrophones had nothing to do with, and the log's one guarantee
 * would stop being true.
 *
 * DOM and a live region for the same reason the contact log is (§10, §11):
 * speech is audio, and the screen owes a mute player every word of it.
 */

import { useEffect, useRef } from 'react';
import { SIM } from '@echoes/shared';
import type { MissionLine } from '../net/GameClient.ts';

/**
 * Match clock from the simulation tick, in the contact log's format on
 * purpose: the two feeds sit on one screen and a player reads across them, so
 * they have to be stamped by the same clock in the same shape. No wall-clock
 * anywhere near either.
 */
function stamp(tick: number): string {
  const seconds = Math.floor(tick / SIM.TICK_HZ);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `T+${mm}:${ss}`;
}

export interface MissionLogProps {
  lines: MissionLine[];
}

export function MissionLog({ lines }: MissionLogProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  // Follow the tail unless the player scrolled up to re-read something. A
  // line spoken at 09:00 is worth going back to at 10:40, and yanking them
  // away from it would be the same failure the contact log guards against.
  useEffect(() => {
    const list = listRef.current;
    if (list === null || !pinnedToBottom.current) return;
    list.scrollTop = list.scrollHeight;
  }, [lines]);

  return (
    <section className="mission-log" aria-label="Mission log">
      <header className="mission-log-title">IN THE WATER</header>
      <div
        className="mission-log-entries"
        ref={listRef}
        role="log"
        aria-live="polite"
        onScroll={(event) => {
          const el = event.currentTarget;
          pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
      >
        {lines.map((line, index) => (
          // Two lines can share a tick and a speaker, and nothing on the wire
          // identifies one, so position in the feed is the identity. The feed
          // is append-only, so that index is stable.
          <p className="mission-log-row" key={`${line.tick}-${index}`}>
            <span className="mission-log-time">{stamp(line.tick)}</span>
            <span className="mission-log-speaker">{line.speaker}</span>
            <span className="mission-log-text">{line.text}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
