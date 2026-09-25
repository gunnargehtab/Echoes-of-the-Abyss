/**
 * The record — docs/ui-ux.md §14, "The record".
 *
 * A surface in the fifth register: the setting, read the way the court reads
 * a count, one page per era of docs/timeline.md, entered as the campaign is
 * played. Reached from the board and from a mission's result, and it returns
 * to the board, because the board is where the next mission is chosen and
 * the record is what sits between two of them.
 *
 * Historical entries are authored in `record.ts`; witnessed conclusions are
 * preserved exactly as received from the mission. A historical page not yet
 * entered is on screen with its reason, dimmed and never removed — the shell's
 * rule for a door that does not open, applied to a page that is not yet read.
 */

import { missionHeaderById } from '@echoes/shared';
import type { WitnessedConclusion } from '../progression/store.ts';
import type { PlayedLookup } from './campaignBoard.ts';
import { ADMISSION_LINE, countLine, readRecord } from './record.ts';

export interface RecordScreenProps {
  /** Injected for the board's reason: the record reads a history it does not define. */
  hasPlayed: PlayedLookup;
  conclusions: readonly WitnessedConclusion[];
  onBack(): void;
}

export function RecordScreen({ hasPlayed, conclusions, onBack }: RecordScreenProps) {
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
          <section className="record-conclusions" aria-labelledby="witnessed-conclusions">
            <h3 id="witnessed-conclusions" className="record-page-era">
              Witnessed conclusions
            </h3>
            <p className="record-conclusion-note">
              Readings kept as received. Different tellings stand beside one another.
            </p>
            {conclusions.length === 0 ? (
              <p className="record-conclusion-note">
                No conclusions have been kept yet. Finish a mission to keep its reading.
              </p>
            ) : (
              conclusions.map(({ missionId, readings }) => (
                <details className="record-conclusion" key={missionId}>
                  <summary>{missionHeaderById(missionId)?.name ?? missionId}</summary>
                  {readings.map((reading, index) => (
                    <p className="record-conclusion-reading" key={index}>
                      {reading}
                    </p>
                  ))}
                </details>
              ))
            )}
          </section>
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
