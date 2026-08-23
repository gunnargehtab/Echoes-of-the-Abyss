/**
 * React mount point for the Pixi renderer.
 *
 * React owns the DOM node; Pixi owns everything inside it. The component
 * deliberately keeps no game state — re-rendering React 60 times a second to
 * animate a canvas would be the wrong architecture, so game state lives in the
 * renderer and only connection status crosses back into React.
 */

import { useEffect, useRef, useState } from 'react';
import type { EchoSnapshot } from '@echoes/shared';
import { EchoRenderer } from './EchoRenderer.ts';
import { GameClient, type ConnectionStatus } from '../net/GameClient.ts';

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [detail, setDetail] = useState<string>('');

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
        onMoveOrder: (unitIds, x, y) => client?.moveTo(unitIds, x, y),
        onToggleSilent: (unitIds, active) => client?.setSilentRunning(unitIds, active),
        onPing: (unitId) => client?.activeSonar(unitId),
        onAttackOrder: (unitIds, contactId) => client?.attackContact(unitIds, contactId),
        onHarvestOrder: (unitIds, nodeId) => client?.harvest(unitIds, nodeId),
        onThrottle: (unitIds, throttle) => client?.setThrottle(unitIds, throttle),
        onBuild: (kind, x, y) => client?.build(kind, x, y),
        onProduce: (structureId, kind) => client?.produce(structureId, kind),
        onDepthOrder: (unitIds, depth) => client?.setDepth(unitIds, depth),
      });

      await activeRenderer.init(host);
      if (cancelled) {
        activeRenderer.destroy();
        return;
      }
      renderer = activeRenderer;

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
    };
  }, []);

  return (
    <div className="game-root">
      <div ref={hostRef} className="game-host" />
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
