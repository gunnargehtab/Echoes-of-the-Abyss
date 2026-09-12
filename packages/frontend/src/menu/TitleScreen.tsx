/**
 * The title screen — docs/ui-ux.md §14, "The listening room".
 *
 * Two halves. The left is a hydrophone display on an empty channel, which is
 * decoration and is marked as such; the right is the logo lockup, the doors,
 * and a readable statement of what the port's state actually is. The entries
 * drop the plate VI card on purpose — that card is the in-match voice, and this
 * screen is not the instrument it belongs to — so an entry here is a rule with
 * a name on it and a port square at the near end.
 *
 * Two rules from §14 still shape the list itself: disabled entries would be
 * visible with the reason attached (none are, any more), and a held seat is
 * offered back first, autofocused, because the commonest reason to be here with
 * a live seat is a reload mid-match.
 */

import { useEffect, useRef, useState } from 'react';
import { hasStoredSession } from '../net/GameClient.ts';
import { loadSettings, subscribeSettings } from '../settings/store.ts';
import { Hydrophone } from './Hydrophone.tsx';
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

interface Entry {
  id: string;
  label: string;
  note?: string;
  open(): void;
  /** A held seat asks, so it takes the ink that asks. */
  resume?: boolean;
}

/**
 * Where an entry drops its mark on the fall.
 *
 * Spread across the array rather than crowded, and bounded by construction:
 * seven entries land on bins 5 to 47 of 54. The mark is not a bearing and does
 * not claim to be one — §14 is explicit that it is your hand on the console.
 */
function markFor(index: number): number {
  return 5 + index * 7;
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
  const mark = useRef<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => loadSettings().reducedMotion);

  // The settings screen replaces this one rather than floating over it, so a
  // remount would carry the change anyway. Subscribing costs nothing and means
  // the fall never disagrees with the setting that governs it.
  useEffect(() => subscribeSettings((next) => setReducedMotion(next.reducedMotion)), []);

  const entries: Entry[] = [
    ...(held
      ? [
          {
            id: 'resume',
            label: 'Resume match',
            note: 'Your fleet is still in the water',
            open: onResume,
            resume: true,
          },
        ]
      : []),
    { id: 'campaign', label: CAMPAIGN_ENTRY.label, note: CAMPAIGN_ENTRY.note, open: onCampaign },
    {
      id: 'solo',
      label: 'Solo game',
      note: 'You, and a commander that hears what you hear',
      open: onSolo,
    },
    {
      id: 'multiplayer',
      label: 'Multiplayer',
      note: 'Join whoever is listening on the same water',
      open: onMultiplayer,
    },
    {
      id: 'tutorial',
      label: 'Tutorial',
      note: 'Prologue: Sorrowgate — four hulls, no guns, and an order to be quiet',
      open: onTutorial,
    },
    { id: 'settings', label: 'Settings', note: 'Volumes, mono, visual-first', open: onSettings },
    { id: 'credits', label: 'Credits', open: onCredits },
  ];

  return (
    <div className="menu-screen menu-screen-title" role="dialog" aria-label="Main menu">
      <Hydrophone mark={mark} reducedMotion={reducedMotion} />

      <div className="title-side">
        {/* The vertical lockup from docs/naming.md: mark, wordmark split into
            its two lines, tagline in the data voice. The h1 keeps the full
            name in one element for the accessibility tree; the split is
            presentation. */}
        <header className="menu-masthead title-masthead">
          <MouthMark width={132} />
          <h1 className="menu-wordmark">
            <span className="menu-wordmark-name">Echoes</span>
            <span className="menu-wordmark-sub">of the Abyss</span>
          </h1>
          <p className="menu-tagline">In the abyss, every echo is a warning.</p>
        </header>

        <nav className="title-entries" aria-label="Main menu">
          {entries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              className={`title-entry${entry.resume === true ? ' menu-resume' : ''}`}
              // Autofocus goes to the held seat when there is one, because a
              // reload mid-match lands here and getting back should cost one
              // keypress inside the grace window.
              autoFocus={entry.resume === true || (!held && entry.id === 'solo')}
              onClick={entry.open}
              onPointerEnter={() => (mark.current = markFor(index))}
              onPointerLeave={() => (mark.current = null)}
              onFocus={() => (mark.current = markFor(index))}
              onBlur={() => (mark.current = null)}
            >
              <span className="title-entry-port" aria-hidden="true" />
              <span className="menu-entry-label">{entry.label}</span>
              {entry.note !== undefined && <span className="menu-entry-note">{entry.note}</span>}
            </button>
          ))}
        </nav>

        {/* The readable half of the instrument. The fall is hidden from
            assistive technology, so what it is saying has to be said here in
            words — and what it is saying is that there is nothing out there. */}
        <dl className="title-state">
          <dt>Channel</dt>
          <dd>Open</dd>
          <dt>Contacts</dt>
          <dd>None</dd>
          <dt>Room</dt>
          <dd>None joined</dd>
        </dl>
      </div>
    </div>
  );
}
