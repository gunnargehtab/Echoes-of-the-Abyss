/**
 * Colyseus connection wrapper.
 *
 * The client is a thin terminal: it sends intents and renders what the server
 * says it is allowed to see. It never simulates, and it never receives world
 * state it has not resolved — see packages/backend/src/rooms/MatchRoom.ts.
 */

import { Client, type Room } from 'colyseus.js';
import type { EchoSnapshot, Faction } from '@echoes/shared';

export interface TerrainPayload {
  cols: number;
  rows: number;
  cellM: number;
  biomes: number[];
}

export interface AssignedPayload {
  slot: number;
  faction: Faction;
}

export interface GameClientHandlers {
  onTerrain(terrain: TerrainPayload): void;
  onAssigned(assigned: AssignedPayload): void;
  onEcho(snapshot: EchoSnapshot): void;
  onStatus(status: ConnectionStatus, detail?: string): void;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'closed';

const DEFAULT_ENDPOINT = import.meta.env.VITE_SERVER_URL ?? `ws://${window.location.hostname}:3000`;

export class GameClient {
  private readonly client: Client;
  private readonly handlers: GameClientHandlers;
  private room: Room | null = null;

  constructor(handlers: GameClientHandlers, endpoint: string = DEFAULT_ENDPOINT) {
    this.client = new Client(endpoint);
    this.handlers = handlers;
  }

  async connect(name?: string): Promise<void> {
    this.handlers.onStatus('connecting');
    try {
      const room = await this.client.joinOrCreate('match', { name });
      this.room = room;

      room.onMessage('terrain', (payload: TerrainPayload) => this.handlers.onTerrain(payload));
      room.onMessage('assigned', (payload: AssignedPayload) => this.handlers.onAssigned(payload));
      room.onMessage('echo', (payload: EchoSnapshot) => this.handlers.onEcho(payload));
      room.onLeave(() => this.handlers.onStatus('closed'));
      room.onError((code, message) => this.handlers.onStatus('error', `${code}: ${message ?? ''}`));

      this.handlers.onStatus('connected');
    } catch (error) {
      this.handlers.onStatus('error', error instanceof Error ? error.message : String(error));
    }
  }

  // --- Intents -------------------------------------------------------------

  moveTo(unitIds: number[], x: number, y: number): void {
    if (unitIds.length === 0) return;
    this.room?.send('move', { unitIds, x, y });
  }

  setSilentRunning(unitIds: number[], active: boolean): void {
    if (unitIds.length === 0) return;
    this.room?.send('silent', { unitIds, active });
  }

  /** The big red button. Cost is previewed in the HUD before this is called. */
  activeSonar(unitId: number): void {
    this.room?.send('ping', { unitId });
  }

  disconnect(): void {
    this.room?.leave();
    this.room = null;
  }
}
