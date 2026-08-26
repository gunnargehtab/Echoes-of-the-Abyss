/**
 * React mount point for the Pixi renderer.
 *
 * React owns the DOM node; Pixi owns everything inside it. The component
 * deliberately keeps no game state — re-rendering React 60 times a second to
 * animate a canvas would be the wrong architecture, so game state lives in the
 * renderer and only connection status crosses back into React.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LIFECYCLE,
  MatchPhase,
  type AiDifficulty,
  type EchoSnapshot,
  type Faction,
  type MissionResultPayload,
  type MissionView,
} from '@echoes/shared';
import { EchoRenderer, type ContactLogEntry } from './EchoRenderer.ts';
import { ContactLog } from './ContactLog.tsx';
import { Lobby } from './Lobby.tsx';
import { MatchResult } from './MatchResult.tsx';
import { MissionLog } from './MissionLog.tsx';
import { MissionPanel } from './MissionPanel.tsx';
import { MissionResult } from './MissionResult.tsx';
import { AudioEngine, dbToGain } from '../audio/engine.ts';
import {
  GameClient,
  type ConnectionStatus,
  type LobbyView,
  type MissionLine,
} from '../net/GameClient.ts';
import { loadSettings, subscribeSettings, type Settings } from '../settings/store.ts';

/** Longest log a player will ever scroll back through. */
const MAX_LOG_ENTRIES = 300;

export interface GameCanvasProps {
  /** Commander name from the setup screen; empty lets the server assign one. */
  playerName: string;
  /** Archetype to create, when this client is the one creating the room. */
  mapId: string;
  /**
   * The authored mission to play, or absent for an ordinary skirmish.
   *
   * A mission pins the navy and seats no other commanders, so its presence is
   * also what tells this component there is no ready room to show.
   */
  missionId?: string;
  /** Whether a held seat should be redeemed rather than a new match joined. */
  resume: boolean;
  /**
   * Leave the match and return to the shell. The teardown in the unmount
   * effect is the actual exit — disconnecting clears the reconnection token,
   * so the title screen does not offer to resume a seat left on purpose.
   */
  onExit(): void;
}

export function GameCanvas({ playerName, mapId, missionId, resume, onExit }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [detail, setDetail] = useState<string>('');
  /**
   * The log is the one piece of game state React owns, and it can: it changes
   * only when a detection changes, not every frame, so it does not drag React
   * into the render loop the way animating the canvas would.
   */
  const [log, setLog] = useState<ContactLogEntry[]>([]);
  /**
   * The room's public roster and phase. Like the log, it changes on events
   * rather than on frames — a faction pick, a ready, a result — so React is
   * the right owner for it.
   */
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  /**
   * The mission, as the server resolved it for this seat. Like the log and the
   * roster it moves on events rather than on frames — the server resends it
   * only when the view actually changes — so React owns it comfortably.
   */
  const [mission, setMission] = useState<MissionView | null>(null);
  const [missionLines, setMissionLines] = useState<MissionLine[]>([]);
  /** Non-null once the mission has concluded. Never a winner; an outcome. */
  const [missionOver, setMissionOver] = useState<MissionResultPayload | null>(null);
  const [mapName, setMapName] = useState('');
  /** Seats this map has. A map's spawn list is its player count. */
  const [maxSlots, setMaxSlots] = useState(4);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const rendererRef = useRef<EchoRenderer | null>(null);
  const clientRef = useRef<GameClient | null>(null);
  /**
   * The mix. One engine per mount, closed on unmount — the AudioContext is a
   * device handle and browsers limit how many a page may hold *open*, so the
   * shell mounts this component only while a match is on and the teardown
   * below releases the device before the next one is opened.
   */
  const audioRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    let renderer: EchoRenderer | null = null;
    let client: GameClient | null = null;
    /**
     * StrictMode mounts effects twice in development, and Application.init()
     * is async — without this guard the second mount would race the first and
     * leave an orphaned canvas attached.
     */
    let cancelled = false;

    const audio = new AudioEngine();
    audioRef.current = audio;

    // A read-only window into the mix, for the headless harness. Reports
    // state only; it can neither drive the engine nor reach the simulation.
    (window as unknown as { __audioProbe?: () => unknown }).__audioProbe = () => ({
      state: audio.state,
      contextState: audio.audioContext?.state ?? null,
      buses: audio.graph === null ? [] : Object.keys(audio.graph),
      sampleRate: audio.audioContext?.sampleRate ?? null,
      voiceCapacity: audio.voices.capacity,
      activeVoices: audio.voices.size,
      contactVoices: audio.activeContactVoices,
      spatialisation: audio.spatialisationMode,
      selfRung: audio.activeRung,
      selfCues: audio.selfCuesFired,
      worstTickMs: Number(audio.worstTickCostMs.toFixed(4)),
      lastTickMs: Number(audio.lastTickCostMs.toFixed(4)),
      lastTickBuilt: audio.lastTickVoicesBuilt,
    });

    /**
     * Autoplay policy blocks an AudioContext created without a user gesture,
     * so the mix starts on the first real input rather than at mount. A game
     * whose primary information channel is audio cannot leave the player
     * hunting for a start button that looks like a mute button
     * (docs/audio-direction.md §12).
     */
    const unlock = () => {
      void audio.unlock();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    const start = async () => {
      const activeRenderer = new EchoRenderer({
        onMoveOrder: (unitIds, x, y, queued) => client?.moveTo(unitIds, x, y, queued),
        onToggleSilent: (unitIds, active) => client?.setSilentRunning(unitIds, active),
        onPing: (unitId) => client?.activeSonar(unitId),
        onAttackOrder: (unitIds, contactId, queued) =>
          client?.attackContact(unitIds, contactId, queued),
        onLaunchTorpedo: (unitIds, contactId) => client?.launchTorpedo(unitIds, contactId),
        onDeployNoisemaker: (unitIds) => client?.deployNoisemaker(unitIds),
        onLayMine: (unitIds) => client?.layMine(unitIds),
        onDepthCharge: (unitIds, depth) => client?.dropDepthCharge(unitIds, depth),
        onHarvestOrder: (unitIds, nodeId, queued) => client?.harvest(unitIds, nodeId, queued),
        onThrottle: (unitIds, throttle) => client?.setThrottle(unitIds, throttle),
        onBuild: (kind, x, y) => client?.build(kind, x, y),
        onProduce: (structureId, kind) => client?.produce(structureId, kind),
        onDepthOrder: (unitIds, depth) => client?.setDepth(unitIds, depth),
        // Contacts, reduced to what the mix is allowed to know. Buffered by
        // the engine and applied on the tick, so the cost is measured and the
        // mix never moves between ticks (docs/audio-direction.md §12).
        onContactAudio: (frame) => audio.applyContacts(frame),
        // The other half of the mix: what is true of the player's own force.
        onSelfAudio: (frame) => audio.applySelf(frame),
        onHazards: (hazards) => {
          // Read-only, for the headless harness. Hazards are public anyway.
          (window as unknown as { __hazardProbe?: () => unknown }).__hazardProbe = () =>
            hazards.length === 0
              ? null
              : {
                  phase: hazards[0]!.phase,
                  remainingS: Number(hazards[0]!.remainingS.toFixed(1)),
                  kind: hazards[0]!.kind,
                };
        },
        onMarkAudio: (totals) => {
          audio.applyMarks(totals);
          // Read-only, for the headless harness. Reports counts only, and
          // only what the server already resolved for this player.
          (window as unknown as { __markProbe?: () => unknown }).__markProbe = () => ({
            byKind: Object.fromEntries(totals),
            total: [...totals.values()].reduce((a, b) => a + b, 0),
          });
        },
        onContactEvent: (entry) =>
          // Capped: a long match would otherwise grow an unbounded list, and
          // nobody scrolls back past a few hundred detections.
          setLog((previous) => {
            const next = [...previous, entry];
            return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
          }),
      });

      await activeRenderer.init(host);
      if (cancelled) {
        activeRenderer.destroy();
        return;
      }
      renderer = activeRenderer;
      rendererRef.current = activeRenderer;

      client = new GameClient({
        onTerrain: (terrain) => activeRenderer.setTerrain(terrain),
        onMap: (map) => {
          activeRenderer.setMap(map);
          setMapName(map.name);
          setMaxSlots(map.seats);
        },
        onNodes: (nodes) => activeRenderer.setNodes(nodes),
        onAssigned: ({ slot, faction }) => activeRenderer.setIdentity(slot, faction),
        onEcho: (snapshot: EchoSnapshot) => {
          activeRenderer.applySnapshot(snapshot);
          // Audio work happens on the tick contacts arrive on, never per
          // frame: anything smoother would imply knowledge the server did
          // not send.
          audio.onEchoTick();
        },
        onGameOver: (payload) => activeRenderer.setGameOver(payload),
        onMission: (view) => {
          setMission(view);
          // The renderer needs the locks, not the objectives: they decide
          // which keys still do anything and what the hint bar says when one
          // does not (docs/ui-ux.md §7).
          activeRenderer.setMissionLocks(view.locks);
        },
        onMissionLine: (line) =>
          setMissionLines((previous) => {
            const next = [...previous, line];
            return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
          }),
        onMissionOver: (payload) => {
          setMissionOver(payload);
          activeRenderer.setMissionOver(payload);
        },
        onLobby: (view) => {
          // A rematch reuses the room and the connection, so nothing else
          // would tell the renderer its entity ids just became meaningless.
          setLobby((previous) => {
            // **Ended → Playing, and nothing else.** That transition is a
            // rematch and only a rematch, which is the one case this clears
            // for. It used to be "any phase change into Playing", and that
            // caught a reconnection: a resumed client receives its `mission`
            // payload immediately, then the schema catches up from its own
            // default and reports a Lobby → Playing move that never happened —
            // wiping the orders panel a few milliseconds after it arrived, on
            // a match already ten minutes old. Lobby → Playing is a first
            // start, where there is nothing stale to clear by construction.
            if (
              previous !== null &&
              previous.phase === MatchPhase.Ended &&
              view.phase === MatchPhase.Playing
            ) {
              activeRenderer.resetForNewMatch();
              setLog([]);
              // The mission starts again from nothing too: a stale result
              // would sit over the new run, and stale lines would read as
              // having been spoken in it.
              setMission(null);
              setMissionLines([]);
              setMissionOver(null);
            }
            return view;
          });
          setSessionId(client?.sessionId ?? null);
        },
        onStatus: (next, why) => {
          if (cancelled) return;
          setStatus(next);
          setDetail(why ?? '');
          activeRenderer.setStatus(next);
        },
      });

      // The player's stored preferences, applied to the live handles. Audio
      // values buffer safely before the graph exists; the renderer needs the
      // instance, which is why this lives here rather than at mount.
      const applySettings = (settings: Settings) => {
        audio.setMasterVolume(settings.masterVolume);
        audio.setBusTrim('music', settings.busVolumes.music);
        audio.setBusTrim('world', settings.busVolumes.world);
        audio.setBusTrim('self', settings.busVolumes.self);
        audio.setBusTrim('ui', settings.busVolumes.ui);
        audio.setBusTrim(
          'contact',
          settings.busVolumes.contact * dbToGain(settings.contactBoostDb)
        );
        audio.setSpatialisation(settings.mono ? 'mono' : 'stereo');
        activeRenderer.setPrecedenceMode(settings.visualFirst ? 'visual-first' : 'ear-first');
      };
      applySettings(loadSettings());
      // Nothing writes settings while a match is on screen today, but the
      // esc menu (#187) will; subscribing now is what makes that live-apply.
      unsubscribeSettings = subscribeSettings(applySettings);

      clientRef.current = client;
      await client.connect({ name: playerName, mapId, missionId, resume });
      setSessionId(client.sessionId);
    };

    let unsubscribeSettings: (() => void) | null = null;
    void start();

    return () => {
      cancelled = true;
      unsubscribeSettings?.();
      client?.disconnect();
      clientRef.current = null;
      renderer?.destroy();
      rendererRef.current = null;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      void audio.destroy();
      audioRef.current = null;
    };
    // The identity of a mount is the match it joins: the shell never changes
    // these props on a live canvas, it unmounts and remounts. The mission is
    // part of that identity — the same water under a mission is a different
    // room from the same water without one.
  }, [playerName, mapId, missionId, resume]);

  const focusOn = useCallback((x: number, y: number) => {
    rendererRef.current?.focusOn(x, y);
  }, []);

  const chooseFaction = useCallback((faction: Faction) => {
    clientRef.current?.chooseFaction(faction);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    clientRef.current?.setReady(ready);
  }, []);

  const addAi = useCallback((difficulty: AiDifficulty) => {
    clientRef.current?.addAi(difficulty);
  }, []);

  const removeAi = useCallback((id: string) => {
    clientRef.current?.removeAi(id);
  }, []);

  const setAiDifficulty = useCallback((id: string, difficulty: AiDifficulty) => {
    clientRef.current?.setAiDifficulty(id, difficulty);
  }, []);

  const phase = lobby?.phase ?? MatchPhase.Lobby;
  const live = status === 'connected';
  /** This seat's own readiness — what "Again" and "Rematch" toggle. */
  const selfReady = lobby?.players.find((player) => player.sessionId === sessionId)?.ready ?? false;

  return (
    <div className="game-root">
      <div ref={hostRef} className="game-host" />
      {live && phase !== MatchPhase.Lobby && <ContactLog entries={log} onFocus={focusOn} />}
      {live && phase !== MatchPhase.Lobby && mission !== null && (
        <MissionPanel view={mission} onFocus={focusOn} />
      )}
      {live && phase !== MatchPhase.Lobby && missionLines.length > 0 && (
        <MissionLog lines={missionLines} />
      )}
      {/* A mission has no faction to pick and no readiness to declare — the
          room pins both — so the ready room is not shown at all rather than
          shown empty. */}
      {live && phase === MatchPhase.Lobby && lobby !== null && missionId === undefined && (
        <Lobby
          mapName={mapName}
          players={lobby.players}
          sessionId={sessionId}
          // The server knows the real cap — a map's spawn list is its player
          // count — and refuses a seat past it. This only greys the button.
          canAddAi={lobby.players.length < maxSlots}
          onChooseFaction={chooseFaction}
          onReady={setReady}
          onAddAi={addAi}
          onRemoveAi={removeAi}
          onAiDifficulty={setAiDifficulty}
        />
      )}
      {/* A mission concluded and a match resolved are different endings, and
          only one of them is on screen: `MatchResult` reads `winnerSlot`,
          which a mission never sets, so it would report an evacuation as a
          defeat. */}
      {live && phase === MatchPhase.Ended && missionOver !== null && (
        <MissionResult
          result={missionOver}
          ready={selfReady}
          onAgain={setReady}
          onExitToMenu={onExit}
        />
      )}
      {live && phase === MatchPhase.Ended && missionOver === null && lobby !== null && (
        <MatchResult
          winnerSlot={lobby.winnerSlot}
          players={lobby.players}
          sessionId={sessionId}
          onRematch={setReady}
          onExitToMenu={onExit}
        />
      )}
      {!live && (
        <div className="game-overlay">
          <h2>
            {status === 'connecting' && 'Listening…'}
            {status === 'reconnecting' && 'Signal lost — re-acquiring'}
            {status === 'error' && 'No signal'}
            {status === 'closed' && 'Connection closed'}
          </h2>
          {status === 'reconnecting' && (
            <p>
              Your fleet is still in the water and still making noise. Holding the slot for up to{' '}
              {LIFECYCLE.RECONNECT_GRACE_S} seconds.
            </p>
          )}
          {status === 'error' && (
            <p>
              Could not reach the game server. Start it with{' '}
              <code>npm -w packages/backend run dev</code> and reload.
            </p>
          )}
          {detail !== '' && <p className="game-overlay-detail">{detail}</p>}
          {(status === 'error' || status === 'closed') && (
            <button type="button" className="game-overlay-back" onClick={onExit}>
              Return to port
            </button>
          )}
        </div>
      )}
    </div>
  );
}
