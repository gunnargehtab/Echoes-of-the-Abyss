/**
 * The shell — docs/ui-ux.md §14.
 *
 * A plain discriminated union rather than a router, deliberately: the repo
 * carries no routing dependency, browser back mid-match would mean "leave the
 * match" as an accident (§1.5 forbids exactly that class of accident), and
 * the only deep link that exists is `?map=<id>`, which is honoured below.
 *
 * The match screen mounts `GameCanvas` and nothing else does — the renderer,
 * the socket and the AudioContext live exactly as long as the screen that
 * needs them, and the unmount teardown is what makes "Return to port" true.
 */

import { useState } from 'react';
import './App.css';
import { DEFAULT_MAP_ID } from '@echoes/shared';
import { GameCanvas } from './game/GameCanvas.tsx';
import { CreditsScreen } from './menu/CreditsScreen.tsx';
import { SetupScreen } from './menu/SetupScreen.tsx';
import { SettingsScreen } from './menu/SettingsScreen.tsx';
import { TitleScreen } from './menu/TitleScreen.tsx';
import { loadSettings } from './settings/store.ts';

type Screen =
  | { kind: 'title' }
  | { kind: 'setup'; mode: 'solo' | 'multiplayer' }
  | { kind: 'settings' }
  | { kind: 'credits' }
  | { kind: 'match'; name: string; mapId: string; resume: boolean };

/**
 * `?map=<id>` boots straight into a match, skipping the title screen.
 *
 * This is the pre-shell behaviour, kept on purpose: it is what the headless
 * harness (the run-game skill) drives, and what a pasted dev URL expects.
 * Resume stays on for this path — a reload mid-match carries the query
 * string, and reloading must not cost the seat.
 */
function initialScreen(): Screen {
  const mapId = new URLSearchParams(window.location.search).get('map');
  if (mapId !== null) {
    return { kind: 'match', name: loadSettings().profileName, mapId, resume: true };
  }
  return { kind: 'title' };
}

function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const toTitle = () => setScreen({ kind: 'title' });

  return (
    <div className="app">
      {screen.kind === 'title' && (
        <TitleScreen
          onResume={() =>
            // The map id is moot on resume — the token names the room — but a
            // dead token falls back to an ordinary join, and that join should
            // land somewhere sensible.
            setScreen({
              kind: 'match',
              name: loadSettings().profileName,
              mapId: DEFAULT_MAP_ID,
              resume: true,
            })
          }
          onSolo={() => setScreen({ kind: 'setup', mode: 'solo' })}
          onMultiplayer={() => setScreen({ kind: 'setup', mode: 'multiplayer' })}
          onSettings={() => setScreen({ kind: 'settings' })}
          onCredits={() => setScreen({ kind: 'credits' })}
        />
      )}
      {screen.kind === 'setup' && (
        <SetupScreen
          mode={screen.mode}
          onEngage={(name, mapId) => setScreen({ kind: 'match', name, mapId, resume: false })}
          onBack={toTitle}
        />
      )}
      {screen.kind === 'settings' && <SettingsScreen onBack={toTitle} />}
      {screen.kind === 'credits' && <CreditsScreen onBack={toTitle} />}
      {screen.kind === 'match' && (
        <GameCanvas
          playerName={screen.name}
          mapId={screen.mapId}
          resume={screen.resume}
          onExit={toTitle}
        />
      )}
    </div>
  );
}

export default App;
