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
  onSettings(): void;
  onCredits(): void;
}

/** Entries that exist before their runtime does, each with its reason. */
const DISABLED_ENTRIES: Array<{ label: string; reason: string }> = [
  { label: 'Campaign', reason: 'Awaits the mission runtime' },
  { label: 'Tutorial', reason: 'Prologue: Sorrowgate — awaits the mission runtime' },
];

export function TitleScreen({
  onResume,
  onSolo,
  onMultiplayer,
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
            <span className="menu-entry-label">{DISABLED_ENTRIES[0]!.label}</span>
            <span className="menu-entry-note">{DISABLED_ENTRIES[0]!.reason}</span>
          </button>
          <button type="button" className="menu-entry" onClick={onSolo} autoFocus={!held}>
            <span className="menu-entry-label">Solo game</span>
            <span className="menu-entry-note">You, and a commander that hears what you hear</span>
          </button>
          <button type="button" className="menu-entry" onClick={onMultiplayer}>
            <span className="menu-entry-label">Multiplayer</span>
            <span className="menu-entry-note">Join whoever is listening on the same water</span>
          </button>
          <button type="button" className="menu-entry" disabled aria-disabled="true">
            <span className="menu-entry-label">{DISABLED_ENTRIES[1]!.label}</span>
            <span className="menu-entry-note">{DISABLED_ENTRIES[1]!.reason}</span>
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
