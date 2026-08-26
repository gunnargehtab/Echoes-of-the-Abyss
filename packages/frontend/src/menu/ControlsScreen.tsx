/**
 * The rebinder — docs/ui-ux.md §9 and §11 (#191).
 *
 * §11 owes "full rebinding, including a one-handed layout, and no
 * timing-critical chords". The chord half is settled by the data model: a
 * binding is one code (`input/bindings.ts`), so there is no chord to be too
 * slow for and none to author here.
 *
 * **Capture rather than type.** A player rebinding a key presses the key, and
 * the screen reads `event.code` — the physical position — so a binding survives
 * a keyboard layout change. That is also why the labels are derived from the
 * code (`keyLabel`) rather than from `event.key`: on an AZERTY keyboard the
 * key in QWERTY's `A` position still reports `KeyA`, and rebinding by
 * character would silently move the whole layout.
 *
 * **Conflicts are shown, not prevented.** A player halfway through a rebind
 * has a table that clashes with itself, and refusing to save would strand
 * them. Reserved codes are the exception and *are* refused: §9 settled two
 * binding conflicts on purpose, and taking `Shift` or a digit would reinstate
 * one silently, with the loser being a mouse interaction that just stops
 * behaving.
 */

import { useEffect, useState } from 'react';
import {
  ACTIONS,
  conflictsIn,
  FIXED_CONTROLS,
  GROUP_LABEL,
  isBindable,
  keyLabel,
  LAYOUTS,
  RESERVED_CODES,
  resolveBindings,
  type ActionSpec,
  type BindableAction,
  type Bindings,
} from '../input/bindings.ts';
import { loadSettings, saveSettings, type Settings } from '../settings/store.ts';

export interface ControlsScreenProps {
  onBack(): void;
}

const GROUP_ORDER: ActionSpec['group'][] = ['fleet', 'depth', 'ordnance', 'build'];

export function ControlsScreen({ onBack }: ControlsScreenProps) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  /** The action currently listening for a key, or null. */
  const [capturing, setCapturing] = useState<BindableAction | null>(null);
  /** Why the last capture was refused, shown until the next one starts. */
  const [refusal, setRefusal] = useState<string>('');

  const bindings = resolveBindings(settings.bindingLayout, settings.bindings);
  const conflicts = conflictsIn(bindings);
  const conflicted = new Set(conflicts.flatMap((conflict) => conflict.actions));

  const write = (next: Bindings, layout: Settings['bindingLayout']) => {
    setSettings(saveSettings({ bindings: next, bindingLayout: layout }));
  };

  /**
   * The capture itself, on the window rather than on the button.
   *
   * A `keydown` handler on the focused button would never see `Tab` or the
   * arrow keys — the browser spends them on focus first — and those are keys a
   * player may legitimately want. Capture phase, for the same reason.
   */
  useEffect(() => {
    if (capturing === null) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === 'Escape') {
        setCapturing(null);
        setRefusal('');
        return;
      }
      if (!isBindable(event.code)) {
        setRefusal(
          `${keyLabel(event.code)} is reserved — it ${RESERVED_CODES.get(event.code) ?? 'cannot be bound'}.`
        );
        setCapturing(null);
        return;
      }
      write({ ...bindings, [capturing]: event.code }, 'custom');
      setCapturing(null);
      setRefusal('');
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [capturing, bindings]);

  return (
    <div className="menu-screen" role="dialog" aria-label="Controls">
      <div className="menu-panel menu-panel-wide">
        <header className="menu-head">
          <h2>Controls</h2>
          <p className="menu-subtitle">
            Click a binding and press a key. Every binding is a single key — nothing here is a chord
            you can be too slow for.
          </p>
        </header>

        <div className="menu-layouts" role="group" aria-label="Layouts">
          <button
            type="button"
            className={`menu-layout${settings.bindingLayout === 'default' ? ' active' : ''}`}
            onClick={() => write({ ...LAYOUTS.default }, 'default')}
          >
            Standard
            <span className="menu-layout-note">Two hands, mouse on the right</span>
          </button>
          <button
            type="button"
            className={`menu-layout${settings.bindingLayout === 'oneHanded' ? ' active' : ''}`}
            onClick={() => write({ ...LAYOUTS.oneHanded }, 'oneHanded')}
          >
            One-handed
            <span className="menu-layout-note">Everything within a left hand’s reach</span>
          </button>
        </div>

        {refusal !== '' && (
          <p className="menu-refusal" role="alert">
            {refusal}
          </p>
        )}
        {conflicts.length > 0 && (
          <p className="menu-refusal" role="status">
            {conflicts.length === 1 ? 'One key is' : `${conflicts.length} keys are`} bound twice.
            The first action in the list wins; the other will not fire.
          </p>
        )}

        <div className="menu-bindings">
          {GROUP_ORDER.map((group) => (
            <section key={group} className="menu-binding-group">
              <h3>{GROUP_LABEL[group]}</h3>
              {ACTIONS.filter((spec) => spec.group === group).map((spec) => (
                <div
                  key={spec.action}
                  className={`menu-binding-row${conflicted.has(spec.action) ? ' clash' : ''}`}
                >
                  <span className="menu-binding-label">
                    {spec.label}
                    {spec.hold === true && <span className="menu-binding-hold">hold</span>}
                  </span>
                  <span className="menu-binding-hint">{spec.hint}</span>
                  <button
                    type="button"
                    className={`menu-binding-key${capturing === spec.action ? ' capturing' : ''}`}
                    aria-label={`${spec.label}: ${keyLabel(bindings[spec.action])}. Click to rebind.`}
                    onClick={() => {
                      setRefusal('');
                      setCapturing(capturing === spec.action ? null : spec.action);
                    }}
                  >
                    {capturing === spec.action ? 'press a key…' : keyLabel(bindings[spec.action])}
                  </button>
                </div>
              ))}
            </section>
          ))}

          <section className="menu-binding-group">
            <h3>Fixed</h3>
            {/* Shown rather than hidden: a player looking for the queue
                modifier should find it here and learn it is not movable,
                rather than conclude the rebinder forgot it. */}
            {FIXED_CONTROLS.map((fixed) => (
              <div key={fixed.label} className="menu-binding-row fixed">
                <span className="menu-binding-label">{fixed.label}</span>
                <span className="menu-binding-hint">{fixed.why}</span>
                <span className="menu-binding-key static">{fixed.keys}</span>
              </div>
            ))}
          </section>
        </div>

        <footer className="menu-foot">
          <button
            type="button"
            className="menu-back"
            onClick={() => write({ ...LAYOUTS.default }, 'default')}
          >
            Reset to standard
          </button>
          <button type="button" className="menu-back" onClick={onBack} autoFocus>
            Back
          </button>
        </footer>
      </div>
    </div>
  );
}
