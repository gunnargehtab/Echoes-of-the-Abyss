/**
 * Match setup — docs/ui-ux.md §14. One screen for Solo, hosting and quick
 * match, because they are the same act: pick water, pick a name, go in.
 *
 * Faction choice and opponents deliberately stay in the in-room lobby.
 * Faction uniqueness is enforced by the room — a pick is a request the room
 * may refuse — and this screen must not promise what the server may deny.
 *
 * The one thing the modes do not share is who may find the room. A host is
 * asked; solo is not, because a solo game is always private (a solo game
 * somebody else can be matched into is not a solo game), and quick match is
 * not, because looking for a room and hiding one are opposite requests.
 */

import { useState } from 'react';
import { DEFAULT_MAP_ID, MAP_HEADERS } from '@echoes/shared';
import { loadSettings, saveSettings } from '../settings/store.ts';
import type { SetupMode } from '../net/rooms.ts';

export type { SetupMode };

export interface SetupScreenProps {
  mode: SetupMode;
  /** `listed` is meaningful only when hosting; the other modes fix it. */
  onEngage(name: string, mapId: string, listed: boolean): void;
  onBack(): void;
}

const HEADING: Record<SetupMode, string> = {
  solo: 'Solo game',
  host: 'Host a match',
  quick: 'Quick match',
};

const SUBTITLE: Record<SetupMode, string> = {
  solo: 'Add your opponent in the ready room — it hears exactly what you hear.',
  host: 'Your room, your water. Share the code from the ready room to fill it.',
  quick: 'You will share a ready room with whoever picked the same water.',
};

const COMMIT: Record<SetupMode, string> = {
  solo: 'Descend',
  host: 'Open the room',
  quick: 'Join the water',
};

export function SetupScreen({ mode, onEngage, onBack }: SetupScreenProps) {
  const [name, setName] = useState(() => loadSettings().profileName);
  const [mapId, setMapId] = useState(DEFAULT_MAP_ID);
  /** Hosts default to listed: the common case is wanting to be found. */
  const [listed, setListed] = useState(true);

  const engage = () => {
    // The name is a device preference; remember it for the next dive.
    saveSettings({ profileName: name });
    onEngage(name, mapId, listed);
  };

  return (
    <div className="menu-screen" role="dialog" aria-label="Match setup">
      <div className="menu-panel">
        <header className="menu-head">
          <h2>{HEADING[mode]}</h2>
          <p className="menu-subtitle">{SUBTITLE[mode]}</p>
        </header>

        <label className="menu-field">
          <span className="menu-field-label">Commander</span>
          <input
            className="menu-input"
            type="text"
            value={name}
            maxLength={32}
            placeholder="Leave blank for an assigned name"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <ul className="menu-maps">
          {MAP_HEADERS.map((map) => {
            const mine = map.id === mapId;
            return (
              <li key={map.id}>
                <button
                  type="button"
                  className={`menu-map${mine ? ' mine' : ''}`}
                  aria-pressed={mine}
                  onClick={() => setMapId(map.id)}
                >
                  <span className="menu-map-name">{map.name}</span>
                  <span className="menu-map-meta">
                    {map.seats} commanders · {(map.widthM / 1000).toFixed(0)} ×{' '}
                    {(map.heightM / 1000).toFixed(0)} km
                  </span>
                  <span className="menu-map-use">{map.idealUse}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {mode === 'host' && (
          <label className="menu-toggle-row">
            <input
              type="checkbox"
              checked={listed}
              onChange={(event) => setListed(event.target.checked)}
            />
            <span className="menu-toggle-label">List this room</span>
            <span className="menu-toggle-note">
              Unlisted rooms are reachable only by their code — nobody is matched into one by
              accident.
            </span>
          </label>
        )}

        <footer className="menu-foot">
          <button type="button" className="menu-commit" onClick={engage} autoFocus>
            {COMMIT[mode]}
          </button>
          <button type="button" className="menu-back" onClick={onBack}>
            Back
          </button>
        </footer>
      </div>
    </div>
  );
}
