/**
 * The esc menu — docs/ui-ux.md §9.5 (#187).
 *
 * In-match chrome, and the one piece of it that is about the player rather
 * than the water. DOM for §10's reasons — a dialog, focus moved into it,
 * every entry reachable by keyboard — and glass rather than blackout, because
 * the match is still running behind it and must read as such: there is no
 * pause, and a menu that hid the water would imply one.
 *
 * Settings and Controls are the port's own screens, not copies. Opened here
 * they apply live — the settings subscription in GameCanvas does not care
 * which door a write came through — which is the whole point of having them
 * mid-match: a binding you cannot try is a binding you cannot judge.
 */

import { useEffect, useRef, useState } from 'react';
import { ControlsScreen } from '../menu/ControlsScreen.tsx';
import { SettingsScreen } from '../menu/SettingsScreen.tsx';

export interface EscMenuProps {
  /**
   * True once the match has resolved. A resolved match has already spent
   * everything the leave entry could cost, so its arming drops (§9.5) and the
   * subtitle stops claiming a clock that has stopped is running.
   */
  ended: boolean;
  /** Close the menu and give the water its keyboard back. */
  onResume(): void;
  /**
   * Leave the match for the title screen. The caller's teardown clears the
   * reconnection token — a seat left on purpose is not held (§14, "Resume") —
   * which is why this component arms the entry before it will call this.
   */
  onExit(): void;
}

/** Which face the menu is showing. Esc steps back the way it came (§9.5). */
type View = 'root' | 'settings' | 'controls';

export function EscMenu({ ended, onResume, onExit }: EscMenuProps) {
  const [view, setView] = useState<View>('root');
  /**
   * Return to port is armed, never instant (§1.5, §9.5): the first press
   * names the cost, the second one pays it.
   */
  const [armed, setArmed] = useState(false);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);

  /**
   * One rule for where focus lands on the root face: Stay while the leave
   * entry is armed — so the Enter that armed it cannot also be the Enter
   * that leaves — and the resume entry otherwise, because the cheapest exit
   * is the default one. One effect rather than two so returning from the
   * port screens re-places focus whatever state the entry is in; the port
   * screens place their own.
   */
  useEffect(() => {
    if (view !== 'root') return;
    (armed ? stayRef : resumeRef).current?.focus();
  }, [view, armed]);

  // A match that resolves while the entry is armed disarms it: the cost the
  // arming named no longer exists.
  useEffect(() => {
    if (ended) setArmed(false);
  }, [ended]);

  /**
   * Esc steps back one level: controls to settings, settings to the menu,
   * the menu to the water — and an armed leave entry disarms first, because
   * backing out of a cost must always be the nearest exit.
   *
   * While the rebinder is capturing a key, its own capture-phase handler
   * stops propagation, so an Escape spent cancelling a capture never
   * reaches this listener.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return;
      event.preventDefault();
      if (view === 'controls') {
        setView('settings');
        return;
      }
      if (view === 'settings') {
        setView('root');
        return;
      }
      if (armed) {
        setArmed(false);
        return;
      }
      onResume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, armed, onResume]);

  if (view === 'settings') {
    return (
      <div className="esc-menu">
        <SettingsScreen onBack={() => setView('root')} onControls={() => setView('controls')} />
      </div>
    );
  }
  if (view === 'controls') {
    return (
      <div className="esc-menu">
        <ControlsScreen onBack={() => setView('settings')} />
      </div>
    );
  }

  return (
    <div className="esc-menu">
      <div className="menu-screen" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="menu-panel">
          <header className="menu-head">
            <h2>Holding station</h2>
            <p className="menu-subtitle">
              {ended
                ? 'The water has settled — the match is decided.'
                : 'The water does not wait — the match runs on while you are here.'}
            </p>
          </header>
          <nav className="menu-entries" aria-label="Menu">
            <button type="button" ref={resumeRef} className="menu-entry" onClick={onResume}>
              <span className="menu-entry-label">Return to the water</span>
              <span className="menu-entry-note">Close the menu. Esc does the same</span>
            </button>
            <button type="button" className="menu-entry" onClick={() => setView('settings')}>
              <span className="menu-entry-label">Settings</span>
              <span className="menu-entry-note">Applies live — you are still in the water</span>
            </button>
            <button type="button" className="menu-entry" onClick={() => setView('controls')}>
              <span className="menu-entry-label">Controls</span>
              <span className="menu-entry-note">Rebind and try it without leaving the match</span>
            </button>
            {ended ? (
              // Un-armed, like the result screen's own exit: a resolved match
              // has already spent everything this button could cost (§9.5).
              <button type="button" className="menu-entry" onClick={onExit}>
                <span className="menu-entry-label">Return to port</span>
                <span className="menu-entry-note">The match is decided — nothing left to lose</span>
              </button>
            ) : !armed ? (
              <button type="button" className="menu-entry" onClick={() => setArmed(true)}>
                <span className="menu-entry-label">Return to port</span>
                <span className="menu-entry-note">
                  Gives up your seat — asks once more before it does
                </span>
              </button>
            ) : (
              <div className="esc-menu-confirm" role="group" aria-label="Return to port">
                {/* role="alert" so the cost is *announced* when it appears:
                    focus moves to Stay, which would otherwise read right past
                    the one sentence the arming exists to deliver (§11). */}
                <p className="esc-menu-warning" role="alert">
                  A seat left on purpose is not held. The match goes on without you.
                </p>
                <button
                  type="button"
                  ref={stayRef}
                  className="menu-entry"
                  onClick={() => setArmed(false)}
                >
                  <span className="menu-entry-label">Stay</span>
                </button>
                <button type="button" className="menu-entry esc-menu-abandon" onClick={onExit}>
                  <span className="menu-entry-label">Abandon the water</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
