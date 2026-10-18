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
 *
 * `GameCanvas` is also the only screen loaded on demand (#442). Everything
 * behind it — three.js, Pixi, the conn view, the sprite bakes — is most of
 * the bundle and none of the port, so the title screen ships the menus and
 * the match screen fetches the rest as the player descends. The mix is the
 * one match system that stays in the shell, because the port's music rides
 * its bus (`useMenuAudio` says why). The fallback under the lazy screen is
 * the same "Listening…" glass the canvas itself shows until the room
 * answers, so the download and the join read as one wait, not two.
 */

import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import './App.css';
import { useMenuAudio } from './audio/useMenuAudio.ts';
import { DEFAULT_MAP_ID, missionHeaderById, PROLOGUE_SORROWGATE_HEADER } from '@echoes/shared';
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
import { TravelScreen } from './menu/TravelScreen.tsx';
import { MatchBoundary } from './menu/MatchBoundary.tsx';
import {
  forgetReopen,
  onTravel,
  readyToJoin,
  reloadForRetry,
  reopensBoard,
  startTravel,
  travelsFirst,
  type TravelState,
} from './menu/launch.ts';
import { storedMissionId } from './net/GameClient.ts';
import { hasPlayed, seenScenes, witnessedConclusions } from './progression/store.ts';
import { loadSettings } from './settings/store.ts';

/** The match's code: fetched by the lazy screen, and early by a travel (§7.6). */
const loadGameCanvas = () => import('./game/GameCanvas.tsx');

const GameCanvas = lazy(() => loadGameCanvas().then((module) => ({ default: module.GameCanvas })));

/**
 * The world behind the board (docs/world-map.md §7.6, #1462). Loaded when the
 * board first opens rather than with the title, as the match is, so the port's
 * bundle still carries no three.js.
 */
const WorldBackdrop = lazy(() =>
  import('./game/WorldBackdrop.tsx').then((module) => ({ default: module.WorldBackdrop }))
);

/**
 * Catches a world that failed to load or draw, so the board stands alone
 * rather than the shell falling over: the atlas is behind the board, never
 * in the way of it. `onFail` lets a travel waiting on it go ahead.
 */
class WorldBoundary extends Component<
  { onFail(): void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(): void {
    this.props.onFail();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

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
  /**
   * A launch from the board, travelling to the mission before its room is
   * joined (docs/world-map.md §7.6; the rules are `menu/launch.ts`).
   */
  | TravelState
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
      /** Reached by a launch's travel, so the camera is already home (§7.6). */
      travelled?: true;
      /**
       * Launched from the board, so Return to port goes back to the board
       * rather than the title, by the return travel (§7.6 step 4).
       */
      board?: true;
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
  // A load failure's Retry reloaded the page to reopen the board (§7.6).
  if (reopensBoard()) return { kind: 'campaign' };
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
  /** Set when the world could not load or draw: the board stands alone. */
  const [worldFailed, setWorldFailed] = useState(false);
  // The reopen note has done its work once the shell has opened on it.
  useEffect(forgetReopen, []);

  /**
   * Fetch the match's code for a travel. A failure is said on the travel's
   * bar, with nothing joined (§7.6, "A load or join failure"); its Retry
   * reloads the page (`reloadForRetry`).
   */
  const prepareMatch = (missionId: string) => {
    loadGameCanvas().then(
      () => setScreen((current) => onTravel(current, { prepared: true }, missionId)),
      () => setScreen((current) => onTravel(current, { loadFailed: true }, missionId))
    );
  };

  // The join, once the travel has arrived and the match's code is here: once,
  // because the screen it leaves is the only thing that can call it.
  useEffect(() => {
    if (screen.kind !== 'travel' || !readyToJoin(screen, worldFailed)) return;
    setScreen({
      kind: 'match',
      name: loadSettings().profileName,
      mapId: mapForMission(screen.missionId),
      resume: false,
      missionId: screen.missionId,
      board: true,
      // Only a travel the world drew: with none the camera never moved.
      ...(screen.drew && !worldFailed ? { travelled: true as const } : {}),
    });
  }, [screen, worldFailed]);

  /**
   * Whether the world is drawn behind this screen (§7.6): the board, the
   * briefing the board opened, and a travel. The Tutorial door's briefing is
   * drawn as it is today, off the world.
   */
  const overWorld =
    !worldFailed &&
    (screen.kind === 'campaign' ||
      screen.kind === 'travel' ||
      (screen.kind === 'briefing' && screen.from === 'campaign'));

  return (
    <div className={overWorld ? 'app app-over-world' : 'app'}>
      {overWorld && (
        <WorldBoundary onFail={() => setWorldFailed(true)}>
          {/* No fallback: the board is drawn at once, and the world arrives
              behind it when its code does. */}
          <Suspense fallback={<div className="world-backdrop" aria-hidden="true" />}>
            <WorldBackdrop
              target={
                screen.kind === 'travel'
                  ? { kind: 'mission', missionId: screen.missionId }
                  : { kind: 'board' }
              }
              skip={screen.kind === 'travel' && screen.skipped}
              onSettled={(drew) =>
                setScreen((current) => onTravel(current, { settled: true, drew }))
              }
            />
          </Suspense>
        </WorldBoundary>
      )}
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
      {screen.kind === 'record' && (
        <RecordScreen
          hasPlayed={hasPlayed}
          conclusions={witnessedConclusions()}
          onBack={toCampaign}
        />
      )}
      {screen.kind === 'briefing' && (
        <BriefingScreen
          missionId={screen.missionId}
          // Read at mount rather than held in shell state, so a briefing
          // opened after a mission finished in this same session already
          // knows what that mission witnessed (docs/campaign.md §1).
          seenScenes={seenScenes()}
          onDescend={() => {
            const missionId = screen.missionId;
            // A placed mission launched from the board travels first (§7.6),
            // fetching the match while it does; every other launch, and the
            // Tutorial door's, joins as it always has.
            if (travelsFirst(screen.from, missionId)) {
              setScreen(startTravel(missionId));
              prepareMatch(missionId);
              return;
            }
            setScreen({
              kind: 'match',
              name: loadSettings().profileName,
              mapId: mapForMission(missionId),
              resume: false,
              missionId,
            });
          }}
          onBack={screen.from === 'campaign' ? toCampaign : toTitle}
        />
      )}
      {screen.kind === 'travel' && (
        <TravelScreen
          missionId={screen.missionId}
          skipped={screen.skipped}
          settled={screen.settled}
          loadFailed={screen.loadFailed}
          onRetry={() => reloadForRetry(true)}
          onSkip={() => setScreen((current) => onTravel(current, { skipped: true }))}
          // Back to the board with nothing joined; the camera travels back
          // under it (§7.6, "Cancel").
          onCancel={toCampaign}
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
        <MatchBoundary
          onRetry={() => reloadForRetry(screen.board === true)}
          onBack={screen.board === true ? toCampaign : toTitle}
        >
          <Suspense
            fallback={
              <div className="game-root">
                <div
                  className={
                    screen.travelled === true ? 'game-overlay game-overlay-held' : 'game-overlay'
                  }
                >
                  <h2>Listening…</h2>
                </div>
              </div>
            }
          >
            <GameCanvas
              playerName={screen.name}
              mapId={screen.mapId}
              missionId={screen.missionId}
              roomId={screen.roomId}
              create={screen.create}
              resume={screen.resume}
              travelled={screen.travelled === true}
              // The world travels back only where it can be drawn; without it
              // the board stands alone, as it was left.
              returnsToBoard={screen.board === true && !worldFailed}
              onExit={screen.board === true ? toCampaign : toTitle}
              onRecord={toRecord}
            />
          </Suspense>
        </MatchBoundary>
      )}
    </div>
  );
}

export default App;
