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
 * The shell holds an AudioContext of its own for the menu bed, on the same
 * terms and never at the same time: see `useMenuAudio`.
 */

import { useState } from 'react';
import './App.css';
import { useMenuAudio } from './audio/useMenuAudio.ts';
import { DEFAULT_MAP_ID, missionHeaderById, PROLOGUE_SORROWGATE_HEADER } from '@echoes/shared';
import { GameCanvas } from './game/GameCanvas.tsx';
import { BriefingScreen } from './menu/BriefingScreen.tsx';
import { CampaignScreen } from './menu/CampaignScreen.tsx';
import { CreditsScreen } from './menu/CreditsScreen.tsx';
import { RecordScreen } from './menu/RecordScreen.tsx';
import { BrowseScreen } from './menu/BrowseScreen.tsx';
import { SetupScreen } from './menu/SetupScreen.tsx';
import { doorFor, type SetupMode } from './net/rooms.ts';
import { ControlsScreen } from './menu/ControlsScreen.tsx';
import { SettingsScreen } from './menu/SettingsScreen.tsx';
import { TitleScreen } from './menu/TitleScreen.tsx';
import { storedMissionId } from './net/GameClient.ts';
import { hasPlayed, seenScenes } from './progression/store.ts';
import { loadSettings } from './settings/store.ts';

type Screen =
  | { kind: 'title' }
  | { kind: 'setup'; mode: SetupMode }
  | { kind: 'browse' }
  | { kind: 'campaign' }
  | {
      kind: 'briefing';
      missionId: string;
      /**
       * Which door opened this briefing, so Back returns through it
       * (docs/ui-ux.md §14, "What commits, and what comes back"). One field
       * rather than history: the no-router rule holds, and browser back is
       * still not a door.
       */
      from: 'title' | 'campaign';
    }
  | { kind: 'settings' }
  | { kind: 'controls' }
  | { kind: 'credits' }
  /**
   * The record between missions (docs/ui-ux.md §14, "The record"). Two doors
   * in — the board and a mission's result — and one door out, to the board,
   * which is where the next mission is chosen. No `from` field, because the
   * result screen it may have come from is gone with the room by the time
   * Back is pressed, and the title is not where a player between missions is.
   */
  | { kind: 'record' }
  | {
      kind: 'match';
      name: string;
      mapId: string;
      resume: boolean;
      missionId?: string;
      /**
       * How this room is reached — the three doors of docs/tech-stack.md,
       * "Finding a match". Absent means quick match, which is `joinOrCreate`.
       */
      roomId?: string;
      create?: 'public' | 'private';
    };

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
  const toCampaign = () => setScreen({ kind: 'campaign' });
  const toRecord = () => setScreen({ kind: 'record' });
  // The port has music; the ocean has its own mix (#194). Held for exactly as
  // long as the shell is on screen, so the shell's AudioContext is closed
  // before the match opens one — a device handle, not a singleton.
  useMenuAudio(screen.kind !== 'match');

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
          onMultiplayer={() => setScreen({ kind: 'browse' })}
          onCampaign={() => setScreen({ kind: 'campaign' })}
          // The prologue is one mission behind two doors (docs/campaign.md §3):
          // this one, and the board's first slot. Both land on the same
          // briefing; only the door it came through differs, because that is
          // where Back has to go.
          onTutorial={() =>
            setScreen({
              kind: 'briefing',
              missionId: PROLOGUE_SORROWGATE_HEADER.id,
              from: 'title',
            })
          }
          onSettings={() => setScreen({ kind: 'settings' })}
          onCredits={() => setScreen({ kind: 'credits' })}
        />
      )}
      {screen.kind === 'setup' && (
        <SetupScreen
          mode={screen.mode}
          onEngage={(name, mapId, listed) =>
            setScreen({
              kind: 'match',
              name,
              mapId,
              resume: false,
              // Which door: solo and an unlisted host create a private room,
              // a listed host creates a public one, quick match matchmakes.
              // The rule is in net/rooms.ts, where it can be tested.
              ...doorFor(screen.mode, listed),
            })
          }
          onBack={screen.mode === 'solo' ? toTitle : () => setScreen({ kind: 'browse' })}
        />
      )}
      {screen.kind === 'browse' && (
        <BrowseScreen
          onJoin={(roomId) =>
            setScreen({
              kind: 'match',
              name: loadSettings().profileName,
              // Moot on a join: the room is already on its water and sends it
              // back. Kept honest rather than blank so a failed join falls back
              // somewhere sensible.
              mapId: DEFAULT_MAP_ID,
              resume: false,
              roomId,
            })
          }
          onHost={() => setScreen({ kind: 'setup', mode: 'host' })}
          onQuickMatch={() => setScreen({ kind: 'setup', mode: 'quick' })}
          onBack={toTitle}
        />
      )}
      {screen.kind === 'campaign' && (
        <CampaignScreen
          // The record answers one question and the board asks no other
          // (docs/ui-ux.md §14). Passed in rather than imported inside the
          // screen so what it reads is visible from the shell.
          hasPlayed={hasPlayed}
          onSelect={(missionId) => setScreen({ kind: 'briefing', missionId, from: 'campaign' })}
          onRecord={toRecord}
          onBack={toTitle}
        />
      )}
      {screen.kind === 'record' && <RecordScreen hasPlayed={hasPlayed} onBack={toCampaign} />}
      {screen.kind === 'briefing' && (
        <BriefingScreen
          missionId={screen.missionId}
          // Read at mount rather than held in shell state, so a briefing
          // opened after a mission finished in this same session already
          // knows what that mission witnessed (docs/campaign.md §1).
          seenScenes={seenScenes()}
          onDescend={() =>
            setScreen({
              kind: 'match',
              name: loadSettings().profileName,
              mapId: mapForMission(screen.missionId),
              resume: false,
              missionId: screen.missionId,
            })
          }
          onBack={screen.from === 'campaign' ? toCampaign : toTitle}
        />
      )}
      {screen.kind === 'settings' && (
        <SettingsScreen onBack={toTitle} onControls={() => setScreen({ kind: 'controls' })} />
      )}
      {screen.kind === 'controls' && (
        <ControlsScreen onBack={() => setScreen({ kind: 'settings' })} />
      )}
      {screen.kind === 'credits' && <CreditsScreen onBack={toTitle} />}
      {screen.kind === 'match' && (
        <GameCanvas
          playerName={screen.name}
          mapId={screen.mapId}
          missionId={screen.missionId}
          roomId={screen.roomId}
          create={screen.create}
          resume={screen.resume}
          onExit={toTitle}
          onRecord={toRecord}
        />
      )}
    </div>
  );
}

export default App;
