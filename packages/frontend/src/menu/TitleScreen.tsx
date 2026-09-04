/**
 * The title screen — docs/ui-ux.md §14.
 *
 * DOM, like every chrome screen in this game, and styled from the tokens
 * alone. Two rules from §14 shape it: disabled entries are visible with the
 * reason attached (the shape of the finished game is on screen, dimmed, never
 * hidden), and a held seat is offered back first — autofocused, because the
 * commonest reason to be here with a live seat is a reload mid-match.
 */

import { hasStoredSession } from '../net/GameClient.ts';
import { MouthMark } from './MouthMark.tsx';

export interface TitleScreenProps {
  onResume(): void;
  onSolo(): void;
  onMultiplayer(): void;
  /** The campaign board. Live now that there is a board to open. */
  onCampaign(): void;
  /** The prologue. Live now that a mission runtime exists to run it. */
  onTutorial(): void;
  onSettings(): void;
  onCredits(): void;
}

/**
 * No entry on this screen is disabled any more.
 *
 * Campaign was the last one, and dimming it was always a statement about the
 * build rather than about the game: it waited first on a mission runtime and
 * then on the missions themselves. Neither is what a board waits on. The board
 * exists, it renders twenty-nine slots, and the twenty-eight that do not open
 * say so on their own faces (docs/ui-ux.md §14) — which is the same rule
 * "visible, with the reason attached" was always making, moved one screen in to
 * where the reasons are specific. The line below is docs/campaign.md's own
 * subtitle rather than a promise about what is finished.
 */
const CAMPAIGN_ENTRY = { label: 'Campaign', note: 'Four wars, one question' };

export function TitleScreen({
  onResume,
  onSolo,
  onMultiplayer,
  onCampaign,
  onTutorial,
  onSettings,
  onCredits,
}: TitleScreenProps) {
  const held = hasStoredSession();

  return (
    <div className="menu-screen menu-screen-title" role="dialog" aria-label="Main menu">
      <div className="menu-panel menu-title-panel">
        {/* The vertical lockup from docs/naming.md: mark, wordmark split into
            its two lines, tagline in the data voice. The h1 keeps the full
            name in one element for the accessibility tree; the split is
            presentation. */}
        <header className="menu-masthead">
          <MouthMark width={200} />
          <h1 className="menu-wordmark">
            <span className="menu-wordmark-name">Echoes</span>
            <span className="menu-wordmark-sub">of the Abyss</span>
          </h1>
          <p className="menu-tagline">In the abyss, every echo is a warning.</p>
        </header>

        <nav className="menu-entries" aria-label="Main menu">
          {held && (
            // Autofocused deliberately: a reload mid-match lands here, and
            // getting back should cost one keypress inside the grace window.
            <button type="button" className="menu-entry menu-resume" onClick={onResume} autoFocus>
              <span className="menu-entry-label">Resume match</span>
              <span className="menu-entry-note">Your fleet is still in the water</span>
            </button>
          )}
          <button type="button" className="menu-entry" onClick={onCampaign}>
            <span className="menu-entry-label">{CAMPAIGN_ENTRY.label}</span>
            <span className="menu-entry-note">{CAMPAIGN_ENTRY.note}</span>
          </button>
          <button type="button" className="menu-entry" onClick={onSolo} autoFocus={!held}>
            <span className="menu-entry-label">Solo game</span>
            <span className="menu-entry-note">You, and a commander that hears what you hear</span>
          </button>
          <button type="button" className="menu-entry" onClick={onMultiplayer}>
            <span className="menu-entry-label">Multiplayer</span>
            <span className="menu-entry-note">Join whoever is listening on the same water</span>
          </button>
          <button type="button" className="menu-entry" onClick={onTutorial}>
            <span className="menu-entry-label">Tutorial</span>
            <span className="menu-entry-note">
              Prologue: Sorrowgate — four hulls, no guns, and an order to be quiet
            </span>
          </button>
          <button type="button" className="menu-entry" onClick={onSettings}>
            <span className="menu-entry-label">Settings</span>
            <span className="menu-entry-note">Volumes, mono, visual-first</span>
          </button>
          <button type="button" className="menu-entry" onClick={onCredits}>
            <span className="menu-entry-label">Credits</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
