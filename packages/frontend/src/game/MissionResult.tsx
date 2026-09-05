/**
 * The mission result — docs/mission-sorrowgate.md §8, docs/campaign.md §2.
 *
 * A sibling of `MatchResult` rather than a mode of it, because it reports a
 * different kind of thing. A match resolves a winner; a mission concludes. No
 * `winnerSlot` is consulted anywhere on this path — nobody was beaten — and
 * the outcome is the mission's own reading of what happened.
 *
 * **Partial is a result, not a failure.** The doc is explicit: a mission that
 * ends with some of it done ends, is read out, and does not ask to be
 * replayed. So the heading for it says "ended" and is drawn in the colour
 * that tells rather than the colour that warns. Calling it a loss on screen
 * would be the UI overruling the fiction about the one thing the fiction is
 * for.
 *
 * `MatchResult`'s rule carries over unchanged: what the player knew, never
 * what was true. The objectives listed below are the ones they were shown
 * while playing, frozen at the close — not a reveal of the water, not a tally
 * of the other five parties, and not a score.
 */

import { MissionOutcome, ObjectiveStatus, type MissionResultPayload } from '@echoes/shared';

/**
 * Chrome, not register. The authored words are the epilogue; this line only
 * names which of the three readings the player got, so a mission's own voice
 * is never competing with a heading written by the client.
 */
const OUTCOME_HEADING: Record<MissionOutcome, string> = {
  [MissionOutcome.Complete]: 'Mission complete',
  [MissionOutcome.Partial]: 'Mission ended',
  [MissionOutcome.Lost]: 'Mission lost',
};

const OUTCOME_CLASS: Record<MissionOutcome, string> = {
  [MissionOutcome.Complete]: 'mission-result-complete',
  [MissionOutcome.Partial]: 'mission-result-partial',
  [MissionOutcome.Lost]: 'mission-result-lost',
};

const STATUS_WORD: Record<ObjectiveStatus, string> = {
  [ObjectiveStatus.Pending]: 'open',
  [ObjectiveStatus.Met]: 'met',
  [ObjectiveStatus.Failed]: 'failed',
};

export interface MissionResultProps {
  result: MissionResultPayload;
  /** Whether this seat has already asked for another run. */
  ready: boolean;
  onAgain(ready: boolean): void;
  /** Leave the room for the shell. Abandons the seat — another run needs it. */
  onExitToMenu(): void;
  /**
   * Leave the room for the record — docs/ui-ux.md §14, "The record". The
   * same leaving as "Return to port" with a different screen at the end of
   * it: the record is what sits between two missions, and this is between.
   */
  onRecord(): void;
}

export function MissionResult({
  result,
  ready,
  onAgain,
  onExitToMenu,
  onRecord,
}: MissionResultProps) {
  return (
    <div className="mission-result" role="dialog" aria-label="Mission result">
      <div className="mission-result-panel">
        <h2 className={OUTCOME_CLASS[result.outcome]}>{OUTCOME_HEADING[result.outcome]}</h2>
        {/* The authored reading, verbatim. It is the whole report. */}
        <p className="mission-result-line">{result.epilogue}</p>

        <ul className="mission-result-objectives">
          {result.objectives.map((objective) => (
            <li
              key={objective.id}
              className={`mission-result-objective ${STATUS_WORD[objective.status]}`}
            >
              <span className="mission-result-status">{STATUS_WORD[objective.status]}</span>
              <span className="mission-result-text">{objective.text}</span>
              {objective.progress !== undefined && (
                <span className="mission-result-progress">
                  {objective.progress.done} of {objective.progress.of}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="mission-result-actions">
          <button type="button" className="mission-result-again" onClick={() => onAgain(!ready)}>
            {ready ? 'Waiting…' : 'Again'}
          </button>
          <button type="button" className="mission-result-exit" onClick={onRecord}>
            The record
          </button>
          <button type="button" className="mission-result-exit" onClick={onExitToMenu}>
            Return to port
          </button>
        </div>
        <p className="mission-result-hint">Same water, from the first tick.</p>
      </div>
    </div>
  );
}
