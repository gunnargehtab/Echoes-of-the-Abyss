/**
 * Settings, v1 — docs/ui-ux.md §14's table, exactly and only.
 *
 * Every control here wires to behaviour that already exists: the per-bus
 * trims and mono mode in the audio engine, the visual-first timing table in
 * the renderer, the binding table the rebinder edits, and §11's three
 * accessibility controls — the colour-vision palettes, the HUD scale and
 * reduced motion. Nothing is listed until it works — a settings screen
 * offering a control that does nothing is the shell lying, which is the one
 * thing a settings screen must not do.
 *
 * Writes go through the settings store on every change; the match applies
 * them at mount, and live when the esc menu (#187) opens this screen
 * mid-match — same screen, either door, one store.
 */

import { useState } from 'react';
import { CONTACT_BOOST_MAX_DB } from '../audio/engine.ts';
import { PALETTE_LABEL, PALETTE_NAMES, type PaletteName } from '../game/palette.ts';
import {
  loadSettings,
  saveSettings,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  type Settings,
} from '../settings/store.ts';
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

/**
 * What each palette is *for*, in one line.
 *
 * Named by the deficiency rather than by the colours, because a player looking
 * for this control knows which one they have and does not know which hues this
 * game happened to pick. The full tables are in docs/style-neon-noir.md.
 */
const PALETTE_NOTE: Record<PaletteName, string> = {
  standard: 'The palette the art direction specifies',
  deuteranopia: 'Red-green: green becomes sky blue, red becomes amber',
  protanopia: 'Red-green, with reds dimmed: the same axis, every hot colour lifted',
  tritanopia: 'Blue-yellow: amber becomes bone, violet becomes instrument teal',
};

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
          <p className="menu-subtitle">Saved on this device. Whatever is live takes it live.</p>
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

          <fieldset className="menu-choice">
            <legend className="menu-slider-label">Colour vision</legend>
            <p className="menu-choice-note">
              Tiers already differ in size, alpha and shape before they differ in colour. These
              change the ink, never the encoding.
            </p>
            <div className="menu-choice-row">
              {PALETTE_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`menu-choice-option${settings.palette === name ? ' active' : ''}`}
                  aria-pressed={settings.palette === name}
                  onClick={() => patch({ palette: name })}
                >
                  {PALETTE_LABEL[name]}
                </button>
              ))}
            </div>
            <p className="menu-choice-note">{PALETTE_NOTE[settings.palette]}</p>
          </fieldset>

          <label
            className="menu-slider-row"
            title="The interface only — the map keeps its own zoom"
          >
            <span className="menu-slider-label">UI scale</span>
            <input
              type="range"
              min={UI_SCALE_MIN * 100}
              max={UI_SCALE_MAX * 100}
              step={5}
              value={Math.round(settings.uiScale * 100)}
              onChange={(event) => patch({ uiScale: Number(event.target.value) / 100 })}
            />
            <span className="menu-slider-value">{percent(settings.uiScale)}</span>
          </label>

          <label className="menu-toggle-row">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) => patch({ reducedMotion: event.target.checked })}
            />
            <span className="menu-toggle-label">Reduced motion</span>
            <span className="menu-toggle-note">
              The scope sweep, the exposure flash and the crush badge go still — each replaced by a
              mark carrying the same thing it said.
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
