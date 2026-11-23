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

import { Fragment, useEffect, useId, useRef } from 'react';
import { ResolutionTier } from '@echoes/shared';
import { stamp } from './clock.ts';
import type { ContactLogEntry } from './EchoRenderer.ts';
import { PanelFoldButton, foldedOut, usePanelFold } from './panelFold.tsx';

/**
 * What the player holds, in the words the rest of the screen already uses
 * (docs/ui-ux.md §10): the exposure rows' `you were heard` and `they have you
 * classified`, the strip's `TRACKED ×n`, and every objective gloss that asks
 * for a contact "with a bearing". A tier number is the Echo Layer's word, and
 * no gloss can point a first-time player at `TIER 3` (#1886).
 */
const TIER_LABEL: Record<ResolutionTier, string> = {
  [ResolutionTier.Silent]: '---',
  [ResolutionTier.Contact]: 'HEARD',
  [ResolutionTier.Bearing]: 'BEARING',
  [ResolutionTier.Classification]: 'CLASSIFIED',
  [ResolutionTier.Track]: 'TRACKED',
};

/**
 * The tier column.
 *
 * `MARK` is not a tier and does not sit on the ramp: it is the past rather
 * than the present (docs/ui-ux.md §10, §5's "past and present must never share
 * an ink"). It borrows the `---` row's slot only because both are events that
 * are not detections.
 */
function tierLabel(entry: ContactLogEntry): string {
  return entry.mark === true ? 'MARK' : TIER_LABEL[entry.tier];
}

/**
 * The detail column, as the tokens it is made of: a bearing, then a range or
 * `decaying` where the row has one. Each token is drawn whole, and the row may
 * break between them when the panel is too narrow for both on one line (#1893).
 */
function detail(entry: ContactLogEntry): string[] {
  if (entry.bearingDeg === undefined) {
    // Tier 1 carries the listener's own position, not the emitter's. There is
    // no bearing in the report, so the log says so rather than inventing one.
    return ['bearing unknown'];
  }
  const bearing = `bearing ${String(entry.bearingDeg).padStart(3, '0')}°`;
  // A mark spends the range column on `decaying` instead (§10's sample row).
  // Not a withholding — the stain's position is drawn on both the world layer
  // and the scope — but a judgement about which number is worth the column:
  // how far away residue is says little, while watching it fade is the whole
  // reading, and for the industrial hum that fade is an economy slowing down.
  if (entry.mark === true) return [bearing, 'decaying'];
  // A bearing without a range is the "you were pinged" row (docs/ui-ux.md
  // §10): the server sent a direction and nothing else, and the log shows
  // exactly that much.
  if (entry.rangeM === undefined) return [bearing];
  // Range is approximate at Tier 2 by design (15% blur) and exact at 3+; the
  // tilde is on both because a player should not have to remember which.
  return [bearing, `~${Math.round(entry.rangeM / 100) * 100} m`];
}

/**
 * The tokens with the column's three-space separator between them, as text,
 * so a copied row reads as it always has. The separator is the only break
 * opportunity: each token sits in a span that never wraps.
 */
function DetailParts({ parts }: { parts: string[] }) {
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={part}>
          {i > 0 && '   '}
          <span className="contact-log-detail-part">{part}</span>
        </Fragment>
      ))}
    </>
  );
}

export interface ContactLogProps {
  entries: ContactLogEntry[];
  onFocus(x: number, y: number): void;
}

export function ContactLog({ entries, onFocus }: ContactLogProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  const [folded, toggleFold] = usePanelFold('contactLog');
  const listId = useId();

  // Follow the tail, unless the player has scrolled up to read something —
  // yanking them back to the newest line mid-read would make the log useless
  // for exactly the analysis it exists to support. Opening a fold counts as
  // new content: the rows that come back are above the tail, not below it.
  useEffect(() => {
    const list = listRef.current;
    if (list === null || !pinnedToBottom.current) return;
    list.scrollTop = list.scrollHeight;
  }, [entries, folded]);

  return (
    <section className={folded ? 'contact-log folded' : 'contact-log'} aria-label="Contact log">
      <header className="contact-log-title">
        <PanelFoldButton
          title="CONTACT LOG"
          folded={folded}
          controls={listId}
          onToggle={toggleFold}
        />
      </header>
      <div
        id={listId}
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
        {entries.map((entry, index) => {
          // Folded out of sight, never out of the log: the row stays in this
          // live region, and the newest rows are the ones a fold keeps, so a
          // detection that lands while folded is on screen as it is read.
          const out = foldedOut(folded, index, entries.length);
          return (
            <button
              key={entry.id}
              type="button"
              hidden={out}
              className={`contact-log-row tier-${entry.tier}${entry.mark === true ? ' mark' : ''}${
                entry.fresh ? ' fresh' : ''
              }${out ? ' folded-out' : ''}`}
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
              <span className="contact-log-tier">{tierLabel(entry)}</span>
              <span className="contact-log-label">{entry.label}</span>
              <span className="contact-log-detail">
                <DetailParts parts={detail(entry)} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
