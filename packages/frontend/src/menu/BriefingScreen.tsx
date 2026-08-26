/**
 * The briefing — docs/ui-ux.md §14, docs/mission-sorrowgate.md §12.
 *
 * Its own screen rather than an overlay on the match, and that is not a layout
 * preference. `GameCanvas` opens an AudioContext the moment it mounts, and a
 * browser caps how many a page may hold open; a briefing drawn over a live
 * canvas would mean the device handle was already taken while the player was
 * still reading. The shell mounts one screen at a time, so this one has to be
 * finished with before the next one exists.
 *
 * Every word on it is authored. The premise and the paragraphs come from the
 * mission header in `@echoes/shared` — the same compiled-in public catalogue
 * the setup screen reads its maps from — and this component adds no prose of
 * its own to the court's register.
 */

import { missionHeaderById } from '@echoes/shared';

export interface BriefingScreenProps {
  missionId: string;
  /** Commit: join the room and play it. */
  onDescend(): void;
  onBack(): void;
}

/** The length band, as the two minute figures a player reads it as. */
function minutes([lowS, highS]: readonly [number, number]): string {
  return `${Math.round(lowS / 60)}–${Math.round(highS / 60)} min`;
}

export function BriefingScreen({ missionId, onDescend, onBack }: BriefingScreenProps) {
  const mission = missionHeaderById(missionId);

  // A mission id that resolves to nothing is a broken link, not a mission with
  // no briefing: say so and offer the way back, rather than joining a room for
  // something that does not exist.
  if (mission === undefined) {
    return (
      <div className="menu-screen" role="dialog" aria-label="Briefing">
        <div className="menu-panel">
          <header className="menu-head">
            <h2>No such mission</h2>
            <p className="menu-subtitle">No mission answers to “{missionId}”.</p>
          </header>
          <footer className="menu-foot">
            <button type="button" className="menu-back" onClick={onBack} autoFocus>
              Back
            </button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-screen" role="dialog" aria-label="Briefing">
      <div className="menu-panel">
        <header className="menu-head">
          <h2>{mission.name}</h2>
          <p className="menu-subtitle">{mission.premise}</p>
          <p className="briefing-meta">
            mission {mission.ordinal} · {minutes(mission.lengthBandS)}
          </p>
        </header>

        <section className="briefing" aria-label="Briefing">
          <header className="briefing-title">THE RECORD</header>
          {mission.briefing === null ? (
            // A withheld briefing is a per-mission decision, not an omission —
            // for a mission that is only winnable as an evacuation, the
            // briefing can itself be the leak. The room reads it on arrival.
            <p className="briefing-withheld">This briefing is read on arrival.</p>
          ) : (
            mission.briefing.map((paragraph, index) => (
              // Paragraph order is the authored order and paragraphs are not
              // otherwise identified, so the index is genuinely the key here.
              <p className="briefing-line" key={index}>
                {paragraph}
              </p>
            ))
          )}
        </section>

        <footer className="menu-foot">
          <button type="button" className="menu-commit" onClick={onDescend} autoFocus>
            Descend
          </button>
          <button type="button" className="menu-back" onClick={onBack}>
            Back
          </button>
        </footer>
      </div>
    </div>
  );
}
