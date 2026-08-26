/**
 * The contact log (docs/ui-ux.md §10).
 *
 * DOM rather than Pixi, and that is the whole design decision. §11 makes this
 * "the accessible mirror of the audio channel" and §10 wants entries
 * copy-pasteable, because post-match analysis of *when did they hear me* is a
 * real activity. A canvas-drawn log is neither selectable nor reachable by a
 * screen reader, so it could not be either of those things.
 *
 * It reports what was told, at the fidelity it was told, and never sharpens an
 * old entry when a better resolution of the same contact arrives later. That
 * is not fussiness: a log that improved its own history would let a player
 * reconstruct positions they never earned, and would destroy the thing the log
 * exists for — reasoning about what was knowable at the time.
 */

import { useEffect, useRef } from 'react';
import { ResolutionTier } from '@echoes/shared';
import { stamp } from './clock.ts';
import type { ContactLogEntry } from './EchoRenderer.ts';

const TIER_LABEL: Record<ResolutionTier, string> = {
  [ResolutionTier.Silent]: '---',
  [ResolutionTier.Contact]: 'TIER 1',
  [ResolutionTier.Bearing]: 'TIER 2',
  [ResolutionTier.Classification]: 'TIER 3',
  [ResolutionTier.Track]: 'TIER 4',
};

function detail(entry: ContactLogEntry): string {
  if (entry.bearingDeg === undefined) {
    // Tier 1 carries the listener's own position, not the emitter's. There is
    // no bearing in the report, so the log says so rather than inventing one.
    return 'bearing unknown';
  }
  const bearing = String(entry.bearingDeg).padStart(3, '0');
  // A bearing without a range is the "you were pinged" row (docs/ui-ux.md
  // §10): the server sent a direction and nothing else, and the log shows
  // exactly that much.
  if (entry.rangeM === undefined) return `bearing ${bearing}°`;
  // Range is approximate at Tier 2 by design (15% blur) and exact at 3+; the
  // tilde is on both because a player should not have to remember which.
  return `bearing ${bearing}°   ~${Math.round(entry.rangeM / 100) * 100} m`;
}

export interface ContactLogProps {
  entries: ContactLogEntry[];
  onFocus(x: number, y: number): void;
}

export function ContactLog({ entries, onFocus }: ContactLogProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  // Follow the tail, unless the player has scrolled up to read something —
  // yanking them back to the newest line mid-read would make the log useless
  // for exactly the analysis it exists to support.
  useEffect(() => {
    const list = listRef.current;
    if (list === null || !pinnedToBottom.current) return;
    list.scrollTop = list.scrollHeight;
  }, [entries]);

  return (
    <section className="contact-log" aria-label="Contact log">
      <header className="contact-log-title">CONTACT LOG</header>
      <div
        className="contact-log-entries"
        ref={listRef}
        // A live region: the log is the mute-play information channel, so a
        // screen reader must announce detections as they happen.
        role="log"
        aria-live="polite"
        onScroll={(e) => {
          const el = e.currentTarget;
          pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
      >
        {entries.length === 0 && <p className="contact-log-empty">no contacts</p>}
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`contact-log-row tier-${entry.tier}${entry.fresh ? ' fresh' : ''}`}
            // Focus only where a position was actually reported. A Tier-1 row
            // has nowhere honest to send the camera.
            disabled={entry.focusX === undefined}
            onClick={() => {
              if (entry.focusX !== undefined && entry.focusY !== undefined) {
                onFocus(entry.focusX, entry.focusY);
              }
            }}
          >
            <span className="contact-log-time">{stamp(entry.tick)}</span>
            <span className="contact-log-tier">{TIER_LABEL[entry.tier]}</span>
            <span className="contact-log-label">{entry.label}</span>
            <span className="contact-log-detail">{detail(entry)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
