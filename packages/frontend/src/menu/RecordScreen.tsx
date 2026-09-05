/**
 * The record — docs/ui-ux.md §14, "The record".
 *
 * A surface in the fifth register: the setting, read the way the court reads
 * a count, one page per era of docs/timeline.md, entered as the campaign is
 * played. Reached from the board and from a mission's result, and it returns
 * to the board, because the board is where the next mission is chosen and
 * the record is what sits between two of them.
 *
 * Every word on it is authored in `record.ts`; this component renders pages
 * and adds no prose of its own to the court's register. A page not yet
 * entered is on screen with its reason, dimmed and never removed — the shell's
 * rule for a door that does not open, applied to a page that is not yet read.
 */

import type { PlayedLookup } from './campaignBoard.ts';
import { ADMISSION_LINE, countLine, readRecord } from './record.ts';

export interface RecordScreenProps {
  /** Injected for the board's reason: the record reads a history it does not define. */
  hasPlayed: PlayedLookup;
  onBack(): void;
}

export function RecordScreen({ hasPlayed, onBack }: RecordScreenProps) {
  // Read once per mount: the history cannot change while the record is on
  // screen, because changing it means playing a mission.
  const reading = readRecord(hasPlayed);
  return (
    <div className="menu-screen" role="dialog" aria-label="The record">
      <div className="menu-panel menu-panel-record">
        <header className="menu-head">
          <h2>The Record</h2>
          <p className="menu-subtitle">
            Entered by named parties, at stated times. The court does not say who was right.
          </p>
          <p className="record-count">{countLine(reading)}</p>
        </header>

        <div className="record-pages">
          {reading.map(({ page, entered }) => (
            <article
              key={page.id}
              className={`record-page record-page-${entered ? 'entered' : 'withheld'}`}
              aria-labelledby={`record-${page.id}`}
            >
              <header className="record-page-head">
                <h3 className="record-page-era" id={`record-${page.id}`}>
                  {page.era}
                </h3>
                <span className="record-page-span">{page.span}</span>
              </header>
              {entered ? (
                page.entries.map((entry, index) => (
                  // Authored order, and entries are not otherwise identified.
                  <p className="record-entry" key={index}>
                    {entry}
                  </p>
                ))
              ) : (
                <p className="record-condition">{ADMISSION_LINE[page.admission]}</p>
              )}
            </article>
          ))}
        </div>

        <footer className="menu-foot">
          <button type="button" className="menu-back" onClick={onBack} autoFocus>
            Back
          </button>
        </footer>
      </div>
    </div>
  );
}
