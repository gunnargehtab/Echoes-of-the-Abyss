/**
 * React mount point for the Pixi renderer.
 *
 * React owns the DOM node; Pixi owns everything inside it. The component
 * deliberately keeps no game state — re-rendering React 60 times a second to
 * animate a canvas would be the wrong architecture, so game state lives in the
 * renderer and only connection status crosses back into React.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EchoSnapshot } from '@echoes/shared';
import { EchoRenderer, type ContactLogEntry } from './EchoRenderer.ts';
import { ContactLog } from './ContactLog.tsx';
import { GameClient, type ConnectionStatus } from '../net/GameClient.ts';

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
  const rendererRef = useRef<EchoRenderer | null>(null);

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
        onNodes: (nodes) => activeRenderer.setNodes(nodes),
        onAssigned: ({ slot, faction }) => activeRenderer.setIdentity(slot, faction),
        onEcho: (snapshot: EchoSnapshot) => activeRenderer.applySnapshot(snapshot),
        onGameOver: (payload) => activeRenderer.setGameOver(payload),
        onStatus: (next, why) => {
          if (cancelled) return;
          setStatus(next);
          setDetail(why ?? '');
          activeRenderer.setStatus(next);
        },
      });

      await client.connect();
    };

    void start();

    return () => {
      cancelled = true;
      client?.disconnect();
      renderer?.destroy();
      rendererRef.current = null;
    };
  }, []);

  const focusOn = useCallback((x: number, y: number) => {
    rendererRef.current?.focusOn(x, y);
  }, []);

  return (
    <div className="game-root">
      <div ref={hostRef} className="game-host" />
      {status === 'connected' && <ContactLog entries={log} onFocus={focusOn} />}
      {status !== 'connected' && (
        <div className="game-overlay">
          <h2>
            {status === 'connecting' && 'Listening…'}
            {status === 'error' && 'No signal'}
            {status === 'closed' && 'Connection closed'}
          </h2>
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
