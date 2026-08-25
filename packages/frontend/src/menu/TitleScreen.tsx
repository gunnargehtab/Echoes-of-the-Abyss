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

export interface TitleScreenProps {
  onResume(): void;
  onSolo(): void;
  onMultiplayer(): void;
  /** The prologue. Live now that a mission runtime exists to run it. */
  onTutorial(): void;
  onSettings(): void;
  onCredits(): void;
}

/**
 * The one entry that still exists before its runtime does.
 *
 * Tutorial used to be the other, and is not any more: the prologue is built,
 * so it is a live button rather than a promise. What Campaign waits on is no
 * longer the runtime — the runtime runs one mission today — but the
 * twenty-eight faction missions that have not been written, and the reason
 * line has to say the true thing or the rule in §14 is doing nothing.
 */
const CAMPAIGN_ENTRY = { label: 'Campaign', reason: 'Awaits the faction campaigns' };

export function TitleScreen({
  onResume,
  onSolo,
  onMultiplayer,
  onTutorial,
  onSettings,
  onCredits,
}: TitleScreenProps) {
  const held = hasStoredSession();

  return (
    <div className="menu-screen" role="dialog" aria-label="Main menu">
      <div className="menu-panel menu-title-panel">
        <header className="menu-masthead">
          <h1 className="menu-wordmark">Echoes of the Abyss</h1>
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
          <button type="button" className="menu-entry" disabled aria-disabled="true">
            <span className="menu-entry-label">{CAMPAIGN_ENTRY.label}</span>
            <span className="menu-entry-note">{CAMPAIGN_ENTRY.reason}</span>
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
