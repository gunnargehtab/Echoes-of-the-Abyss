/**
 * Settings, v1 — docs/ui-ux.md §14's table, exactly and only.
 *
 * Every control here wires to behaviour that already exists: the per-bus
 * trims and mono mode in the audio engine, the visual-first timing table in
 * the renderer, the binding table the rebinder edits. Nothing is listed until
 * it works — a settings screen offering a control that does nothing is the
 * shell lying, which is the one thing a settings screen must not do.
 *
 * Writes go through the settings store on every change; the match applies
 * them at mount (and live, once the esc menu of #187 exists to open this
 * screen mid-match).
 */

import { useState } from 'react';
import { CONTACT_BOOST_MAX_DB } from '../audio/engine.ts';
import { loadSettings, saveSettings, type Settings } from '../settings/store.ts';
import type { TrimBus } from '../audio/engine.ts';

export interface SettingsScreenProps {
  onBack(): void;
  /** Open the rebinder (#191). Its own screen: §9's table does not fit here. */
  onControls(): void;
}

/** Display order and label per bus — the mix's own vocabulary. */
const BUS_ROWS: Array<{ bus: TrimBus; label: string; note: string }> = [
  { bus: 'contact', label: 'Contacts', note: 'What you hear of them' },
  { bus: 'self', label: 'Own fleet', note: 'What they hear of you, played back to you' },
  { bus: 'world', label: 'World', note: 'Biomes, residue, the past' },
  { bus: 'music', label: 'Music', note: 'Always ducks under contacts' },
  { bus: 'ui', label: 'Interface', note: 'Confirmations and alerts' },
];

export function SettingsScreen({ onBack, onControls }: SettingsScreenProps) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  const patch = (change: Partial<Omit<Settings, 'version'>>) => {
    setSettings(saveSettings(change));
  };

  const percent = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className="menu-screen" role="dialog" aria-label="Settings">
      <div className="menu-panel">
        <header className="menu-head">
          <h2>Settings</h2>
          <p className="menu-subtitle">Saved on this device. Applies from your next dive.</p>
        </header>

        <div className="menu-settings">
          <label className="menu-slider-row">
            <span className="menu-slider-label">Master</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.masterVolume * 100)}
              onChange={(event) => patch({ masterVolume: Number(event.target.value) / 100 })}
            />
            <span className="menu-slider-value">{percent(settings.masterVolume)}</span>
          </label>

          {BUS_ROWS.map(({ bus, label, note }) => (
            <label key={bus} className="menu-slider-row" title={note}>
              <span className="menu-slider-label">{label}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.busVolumes[bus] * 100)}
                onChange={(event) =>
                  patch({
                    busVolumes: {
                      ...settings.busVolumes,
                      [bus]: Number(event.target.value) / 100,
                    },
                  })
                }
              />
              <span className="menu-slider-value">{percent(settings.busVolumes[bus])}</span>
            </label>
          ))}

          <label className="menu-slider-row" title="Information may be boosted above the mix">
            <span className="menu-slider-label">Contact boost</span>
            <input
              type="range"
              min={0}
              max={CONTACT_BOOST_MAX_DB}
              value={settings.contactBoostDb}
              onChange={(event) => patch({ contactBoostDb: Number(event.target.value) })}
            />
            <span className="menu-slider-value">+{settings.contactBoostDb} dB</span>
          </label>

          <label className="menu-toggle-row">
            <input
              type="checkbox"
              checked={settings.mono}
              onChange={(event) => patch({ mono: event.target.checked })}
            />
            <span className="menu-toggle-label">Mono audio</span>
            <span className="menu-toggle-note">
              Bearing stays on the scope and in the log — nothing becomes unknowable.
            </span>
          </label>

          <label className="menu-toggle-row">
            <input
              type="checkbox"
              checked={settings.visualFirst}
              onChange={(event) => patch({ visualFirst: event.target.checked })}
            />
            <span className="menu-toggle-label">Visual-first</span>
            <span className="menu-toggle-note">
              Marks arrive within 30 ms instead of fading in behind the sound.
            </span>
          </label>
        </div>

        <button type="button" className="menu-subscreen" onClick={onControls}>
          Controls
          <span className="menu-subscreen-note">
            Rebind every key, or switch to the one-handed layout
          </span>
        </button>

        <footer className="menu-foot">
          <button type="button" className="menu-back" onClick={onBack} autoFocus>
            Back
          </button>
        </footer>
      </div>
    </div>
  );
}
