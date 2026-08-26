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
import { DEFAULT_MAP_ID, missionHeaderById, PROLOGUE_SORROWGATE_HEADER } from '@echoes/shared';
import { GameCanvas } from './game/GameCanvas.tsx';
import { BriefingScreen } from './menu/BriefingScreen.tsx';
import { CreditsScreen } from './menu/CreditsScreen.tsx';
import { SetupScreen } from './menu/SetupScreen.tsx';
import { SettingsScreen } from './menu/SettingsScreen.tsx';
import { TitleScreen } from './menu/TitleScreen.tsx';
import { storedMissionId } from './net/GameClient.ts';
import { loadSettings } from './settings/store.ts';

type Screen =
  | { kind: 'title' }
  | { kind: 'setup'; mode: 'solo' | 'multiplayer' }
  | { kind: 'briefing'; missionId: string }
  | { kind: 'settings' }
  | { kind: 'credits' }
  | { kind: 'match'; name: string; mapId: string; resume: boolean; missionId?: string };

/**
 * The water a mission is played on. Public either way — the room sends the map
 * on join — so reading it here only keeps the join request self-consistent.
 */
function mapForMission(missionId: string): string {
  return missionHeaderById(missionId)?.mapId ?? DEFAULT_MAP_ID;
}

/**
 * `?map=<id>` and `?mission=<id>` boot straight into a match, skipping the
 * title screen.
 *
 * This is the pre-shell behaviour, kept on purpose: it is what the headless
 * harness (the run-game skill) drives, and what a pasted dev URL expects.
 * `?mission=` deliberately skips the briefing as well as the title — it is a
 * developer's door into the water, not a player's route through the fiction,
 * and a screen that has to be clicked past is exactly what the harness cannot
 * assume. Resume stays on for both — a reload mid-match carries the query
 * string, and reloading must not cost the seat. It is safe to leave on
 * unconditionally because `GameClient` redeems a parked token only for the
 * room kind being asked for: a held skirmish seat cannot answer `?mission=`.
 */
function initialScreen(): Screen {
  const query = new URLSearchParams(window.location.search);
  const missionId = query.get('mission');
  if (missionId !== null) {
    return {
      kind: 'match',
      name: loadSettings().profileName,
      mapId: mapForMission(missionId),
      resume: true,
      missionId,
    };
  }
  const mapId = query.get('map');
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
          onResume={() => {
            // Which room the held seat is in, so Resume returns to the match
            // the player was actually playing. A token is only redeemed for
            // the room kind the client asks for (see `GameClient.connect`), so
            // resuming a mission seat as a skirmish would not merely land on
            // the wrong screen — it would skip the token and abandon the seat.
            const missionId = storedMissionId() ?? '';
            // The map id is moot on resume — the token names the room — but a
            // dead token falls back to an ordinary join, and that join should
            // land somewhere sensible.
            setScreen({
              kind: 'match',
              name: loadSettings().profileName,
              mapId: missionId === '' ? DEFAULT_MAP_ID : mapForMission(missionId),
              resume: true,
              ...(missionId === '' ? {} : { missionId }),
            });
          }}
          onSolo={() => setScreen({ kind: 'setup', mode: 'solo' })}
          onMultiplayer={() => setScreen({ kind: 'setup', mode: 'multiplayer' })}
          // One mission exists, and the Tutorial entry is the door to it
          // (docs/campaign.md §3: the prologue is one mission behind two
          // doors). The campaign entry will be the other, when there is one.
          onTutorial={() =>
            setScreen({ kind: 'briefing', missionId: PROLOGUE_SORROWGATE_HEADER.id })
          }
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
      {screen.kind === 'briefing' && (
        <BriefingScreen
          missionId={screen.missionId}
          onDescend={() =>
            setScreen({
              kind: 'match',
              name: loadSettings().profileName,
              mapId: mapForMission(screen.missionId),
              resume: false,
              missionId: screen.missionId,
            })
          }
          onBack={toTitle}
        />
      )}
      {screen.kind === 'settings' && <SettingsScreen onBack={toTitle} />}
      {screen.kind === 'credits' && <CreditsScreen onBack={toTitle} />}
      {screen.kind === 'match' && (
        <GameCanvas
          playerName={screen.name}
          mapId={screen.mapId}
          missionId={screen.missionId}
          resume={screen.resume}
          onExit={toTitle}
        />
      )}
    </div>
  );
}

export default App;
