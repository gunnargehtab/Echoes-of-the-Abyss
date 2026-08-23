/**
 * React mount point for the Pixi renderer.
 *
 * React owns the DOM node; Pixi owns everything inside it. The component
 * deliberately keeps no game state — re-rendering React 60 times a second to
 * animate a canvas would be the wrong architecture, so game state lives in the
 * renderer and only connection status crosses back into React.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { LIFECYCLE, MatchPhase, type EchoSnapshot, type Faction } from '@echoes/shared';
import { EchoRenderer, type ContactLogEntry } from './EchoRenderer.ts';
import { ContactLog } from './ContactLog.tsx';
import { Lobby } from './Lobby.tsx';
import { MatchResult } from './MatchResult.tsx';
import { AudioEngine } from '../audio/engine.ts';
import { GameClient, type ConnectionStatus, type LobbyView } from '../net/GameClient.ts';

/** Longest log a player will ever scroll back through. */
const MAX_LOG_ENTRIES = 300;

export function GameCanvas() {
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
  const [mapName, setMapName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const rendererRef = useRef<EchoRenderer | null>(null);
  const clientRef = useRef<GameClient | null>(null);
  /**
   * The mix. Built once and kept for the session — the AudioContext is a
   * device handle, not per-match state, and browsers limit how many a page
   * may open.
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
        onLobby: (view) => {
          // A rematch reuses the room and the connection, so nothing else
          // would tell the renderer its entity ids just became meaningless.
          setLobby((previous) => {
            if (previous !== null && previous.phase !== view.phase) {
              if (view.phase === MatchPhase.Playing) {
                activeRenderer.resetForNewMatch();
                setLog([]);
              }
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

      clientRef.current = client;
      await client.connect();
      setSessionId(client.sessionId);
    };

    void start();

    return () => {
      cancelled = true;
      client?.disconnect();
      clientRef.current = null;
      renderer?.destroy();
      rendererRef.current = null;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      void audio.destroy();
      audioRef.current = null;
    };
  }, []);

  const focusOn = useCallback((x: number, y: number) => {
    rendererRef.current?.focusOn(x, y);
  }, []);

  const chooseFaction = useCallback((faction: Faction) => {
    clientRef.current?.chooseFaction(faction);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    clientRef.current?.setReady(ready);
  }, []);

  const phase = lobby?.phase ?? MatchPhase.Lobby;
  const live = status === 'connected';

  return (
    <div className="game-root">
      <div ref={hostRef} className="game-host" />
      {live && phase !== MatchPhase.Lobby && <ContactLog entries={log} onFocus={focusOn} />}
      {live && phase === MatchPhase.Lobby && lobby !== null && (
        <Lobby
          mapName={mapName}
          players={lobby.players}
          sessionId={sessionId}
          onChooseFaction={chooseFaction}
          onReady={setReady}
        />
      )}
      {live && phase === MatchPhase.Ended && lobby !== null && (
        <MatchResult
          winnerSlot={lobby.winnerSlot}
          players={lobby.players}
          sessionId={sessionId}
          onRematch={setReady}
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
        </div>
      )}
    </div>
  );
}
