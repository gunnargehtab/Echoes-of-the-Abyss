/**
 * Match setup — docs/ui-ux.md §14. One screen for Solo and Multiplayer,
 * because they are the same act: pick water, pick a name, join it.
 *
 * Faction choice and opponents deliberately stay in the in-room lobby.
 * Faction uniqueness is enforced by the room — a pick is a request the room
 * may refuse — and this screen must not promise what the server may deny.
 */

import { useState } from 'react';
import { DEFAULT_MAP_ID, MAP_HEADERS } from '@echoes/shared';
import { loadSettings, saveSettings } from '../settings/store.ts';

export interface SetupScreenProps {
  mode: 'solo' | 'multiplayer';
  onEngage(name: string, mapId: string): void;
  onBack(): void;
}

export function SetupScreen({ mode, onEngage, onBack }: SetupScreenProps) {
  const [name, setName] = useState(() => loadSettings().profileName);
  const [mapId, setMapId] = useState(DEFAULT_MAP_ID);

  const engage = () => {
    // The name is a device preference; remember it for the next dive.
    saveSettings({ profileName: name });
    onEngage(name, mapId);
  };

  return (
    <div className="menu-screen" role="dialog" aria-label="Match setup">
      <div className="menu-panel">
        <header className="menu-head">
          <h2>{mode === 'solo' ? 'Solo game' : 'Multiplayer'}</h2>
          <p className="menu-subtitle">
            {mode === 'solo'
              ? 'Add your opponent in the ready room — it hears exactly what you hear.'
              : 'You will share a ready room with whoever picked the same water.'}
          </p>
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

        <footer className="menu-foot">
          <button type="button" className="menu-commit" onClick={engage} autoFocus>
            {mode === 'solo' ? 'Descend' : 'Join the water'}
          </button>
          <button type="button" className="menu-back" onClick={onBack}>
            Back
          </button>
        </footer>
      </div>
    </div>
  );
}
