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

import type { CSSProperties } from 'react';
import {
  Faction,
  missionBriefing,
  missionHeaderById,
  registerName,
  registerOf,
  type MissionVoice,
} from '@echoes/shared';
import { FACTION_PALETTE } from '../game/palette.ts';
import { FactionGlyph } from './FactionGlyph.tsx';

export interface BriefingScreenProps {
  missionId: string;
  /**
   * The scenes this player has already witnessed — docs/campaign.md §1.
   *
   * Passed in rather than read from the store inside this component, for the
   * reason the campaign board's `hasPlayed` is passed in: what a screen reads
   * of the player's history should be visible from the shell that mounts it.
   * An empty set is the honest default and the only one a caller with no
   * record can give, and it selects the authored briefing.
   */
  seenScenes: ReadonlySet<string>;
  /** Commit: join the room and play it. */
  onDescend(): void;
  onBack(): void;
}

/** The length band, as the two minute figures a player reads it as. */
function minutes([lowS, highS]: readonly [number, number]): string {
  return `${Math.round(lowS / 60)}–${Math.round(highS / 60)} min`;
}

/**
 * The navy a register belongs to, for its ink and glyph — §12.5's licensed
 * dress on a screen that is not the instrument. The court has none: it is the
 * one voice in the Rift that is not heard through water, and it takes chrome.
 */
function navyOf(voice: MissionVoice): Faction | null {
  switch (voice) {
    case 'concern':
      return Faction.Bathyarch;
    case 'plateaus':
      return Faction.Pelagia;
    case 'cohorts':
      return Faction.Directorate;
    case 'order':
      return Faction.Hadron;
    case 'court':
      return null;
  }
}

const hex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

export function BriefingScreen({ missionId, seenScenes, onDescend, onBack }: BriefingScreenProps) {
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

  // The variant, if this player has already seen the scene one is written for
  // (docs/campaign.md §1). The screen does not say which it is showing and
  // there is no marking on it: a briefing the player has earned a different
  // reading of should read as the briefing, not as an unlockable.
  const briefing = missionBriefing(mission, seenScenes);

  // Who is speaking, and in which register — docs/ui-ux.md §14, "Who is
  // speaking". On the header, so a player is told whose voice this is before
  // the first paragraph; the same attribution for a variant, because the
  // reader does not change with what the player has already seen.
  const voice = registerOf(mission.speaker);
  const navy = navyOf(voice);

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
          <header
            className="briefing-speaker"
            style={
              (navy === null
                ? {}
                : { '--faction': hex(FACTION_PALETTE[navy].glow) }) as CSSProperties
            }
          >
            <span className="briefing-register">
              {navy !== null && <FactionGlyph faction={navy} size={16} />}
              {registerName(voice)}
            </span>
            <span className="briefing-speaker-line">{mission.spokenBy}</span>
          </header>
          {briefing === null ? (
            // A withheld briefing is a per-mission decision, not an omission —
            // for a mission that is only winnable as an evacuation, the
            // briefing can itself be the leak. The room reads it on arrival.
            <p className="briefing-withheld">This briefing is read on arrival.</p>
          ) : (
            briefing.map((paragraph, index) => (
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
