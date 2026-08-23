/**
 * Colyseus connection wrapper.
 *
 * The client is a thin terminal: it sends intents and renders what the server
 * says it is allowed to see. It never simulates, and it never receives world
 * state it has not resolved — see packages/backend/src/rooms/MatchRoom.ts.
 */

import { Client, type Room } from 'colyseus.js';
import {
  LIFECYCLE,
  MatchPhase,
  type AiDifficulty,
  type EchoSnapshot,
  type Faction,
  type GameOverPayload,
  type HarvestThrottle,
  type LobbyPlayerView,
  type ResourceNodeInfo,
  type StructureKind,
  type UnitKind,
} from '@echoes/shared';

/**
 * Which map this match is on.
 *
 * Public by definition — both players are standing on it. Hazard sites are
 * included because docs/maps.md makes hazard telegraphing a core principle:
 * "players must see danger before entering."
 */
export interface MapPayload {
  id: string;
  name: string;
  idealUse: string;
  widthM: number;
  heightM: number;
  /** Seats this map has. A map's spawn list is its player count. */
  seats: number;
  hazards: {
    x: number;
    y: number;
    radiusM: number;
    kind: string;
    note?: string;
    /** True when the hazard framework runs this one; false means site only. */
    simulated: boolean;
  }[];
}

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

/**
 * The room's public facts: who is here, what they picked, and what the room is
 * doing. Everything in it is already broadcast in the Colyseus schema — this
 * is a plain-object mirror so React can re-render on it without holding a
 * live reference into the decoder's state.
 */
export interface LobbyView {
  phase: MatchPhase;
  mapId: string;
  /** -1 until a match resolves. */
  winnerSlot: number;
  players: LobbyPlayerView[];
}

export interface GameClientHandlers {
  onTerrain(terrain: TerrainPayload): void;
  onMap(map: MapPayload): void;
  onNodes(nodes: ResourceNodeInfo[]): void;
  onAssigned(assigned: AssignedPayload): void;
  onEcho(snapshot: EchoSnapshot): void;
  onGameOver(payload: GameOverPayload): void;
  onLobby(view: LobbyView): void;
  onStatus(status: ConnectionStatus, detail?: string): void;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed';

const DEFAULT_ENDPOINT = import.meta.env.VITE_SERVER_URL ?? `ws://${window.location.hostname}:3000`;

/** Reconnection backoff: first retry is quick, then it backs off to this. */
const RECONNECT_MIN_DELAY_MS = 400;
const RECONNECT_MAX_DELAY_MS = 4000;

/**
 * Where a reconnection token is parked across a page reload.
 *
 * sessionStorage rather than localStorage, and deliberately: the token is a
 * bearer credential for one seat in one match. Per-tab and dying with the tab
 * is exactly its lifetime — a second tab must not be able to pick up the
 * first tab's fleet, and a token surviving until next week would only ever
 * resolve to a match that no longer exists.
 */
const TOKEN_KEY = 'echoes.reconnection';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Storage throws in some privacy modes; a missing token is only a re-join. */
function rememberToken(token: string | null): void {
  try {
    if (token === null) window.sessionStorage.removeItem(TOKEN_KEY);
    else window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Nothing to do: the player re-joins instead of resuming.
  }
}

function recallToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export class GameClient {
  private readonly client: Client;
  private readonly handlers: GameClientHandlers;
  private room: Room | null = null;
  /** True once the player has deliberately left; suppresses reconnection. */
  private leaving = false;
  /**
   * Last lobby view pushed upward, serialised.
   *
   * The room's schema also carries `tick`, which changes five times a second,
   * so an unfiltered onStateChange would re-render the lobby at 5 Hz forever.
   */
  private lastLobbyKey = '';

  constructor(handlers: GameClientHandlers, endpoint: string = DEFAULT_ENDPOINT) {
    this.client = new Client(endpoint);
    this.handlers = handlers;
  }

  async connect(name?: string): Promise<void> {
    this.handlers.onStatus('connecting');
    // A reload is a disconnection like any other, and the server is still
    // holding the seat. Resuming it is tried first, and failing costs one
    // round trip — the ordinary path is the joinOrCreate below.
    const stored = recallToken();
    if (stored !== null) {
      try {
        this.attach(await this.client.reconnect(stored));
        this.handlers.onStatus('connected');
        return;
      } catch {
        rememberToken(null);
      }
    }
    try {
      // `?map=<id>` selects the archetype when this client is the one that
      // creates the room; joining an existing room takes the map it is on, and
      // the server sends back which that was either way.
      const mapId =
        typeof window === 'undefined'
          ? undefined
          : (new URLSearchParams(window.location.search).get('map') ?? undefined);
      this.attach(await this.client.joinOrCreate('match', { name, mapId }));
      this.handlers.onStatus('connected');
    } catch (error) {
      this.handlers.onStatus('error', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Wire a room's messages up. Separate from connect() because a reconnection
   * produces a *different* Room object for the same seat, and it needs exactly
   * the same wiring.
   */
  private attach(room: Room): void {
    this.room = room;
    this.lastLobbyKey = '';
    rememberToken(room.reconnectionToken);

    room.onMessage('terrain', (payload: TerrainPayload) => this.handlers.onTerrain(payload));
    room.onMessage('map', (payload: MapPayload) => this.handlers.onMap(payload));
    room.onMessage('nodes', (payload: ResourceNodeInfo[]) => this.handlers.onNodes(payload));
    room.onMessage('assigned', (payload: AssignedPayload) => this.handlers.onAssigned(payload));
    room.onMessage('echo', (payload: EchoSnapshot) => this.handlers.onEcho(payload));
    room.onMessage('gameOver', (payload: GameOverPayload) => this.handlers.onGameOver(payload));
    // Sent on start and on reconnection. The schema carries the phase too;
    // this is the edge-triggered version, for anything that must happen once.
    room.onMessage('phase', () => this.pushLobby());
    room.onStateChange(() => this.pushLobby());
    room.onError((code, message) => this.handlers.onStatus('error', `${code}: ${message ?? ''}`));

    // A reconnection token is only useful while the seat still exists on the
    // server, so it is read at drop time rather than cached here.
    room.onLeave(() => {
      if (this.leaving || room !== this.room) return;
      void this.reconnect(room.reconnectionToken);
    });

    this.pushLobby();
  }

  /**
   * Re-take the seat we just lost, for as long as the server holds it open.
   *
   * The grace window is the server's, not ours: retrying past it only produces
   * a join error, so the loop stops when the window does.
   */
  private async reconnect(token: string): Promise<void> {
    this.room = null;
    this.handlers.onStatus('reconnecting');
    const deadline = Date.now() + LIFECYCLE.RECONNECT_GRACE_S * 1000;
    let delay = RECONNECT_MIN_DELAY_MS;

    while (!this.leaving && Date.now() < deadline) {
      await sleep(delay);
      if (this.leaving) return;
      try {
        this.attach(await this.client.reconnect(token));
        this.handlers.onStatus('connected');
        return;
      } catch {
        delay = Math.min(delay * 2, RECONNECT_MAX_DELAY_MS);
      }
    }
    if (!this.leaving) {
      rememberToken(null);
      this.handlers.onStatus('closed');
    }
  }

  /** Mirror the room schema into a plain object, when it has actually moved. */
  private pushLobby(): void {
    const state = this.room?.state as
      | {
          phase?: number;
          mapId?: string;
          winnerSlot?: number;
          players?: Map<string, LobbyPlayerView>;
        }
      | undefined;
    if (state === undefined) return;

    const players: LobbyPlayerView[] = [];
    // MapSchema iterates like a Map, and this is the whole roster — four
    // entries at most, so rebuilding it per change costs nothing.
    state.players?.forEach((player) => {
      players.push({
        sessionId: player.sessionId,
        name: player.name,
        slot: player.slot,
        faction: player.faction,
        ready: player.ready,
        connected: player.connected,
        isAi: player.isAi,
        difficulty: player.difficulty,
      });
    });
    players.sort((a, b) => a.slot - b.slot);

    const view: LobbyView = {
      phase: (state.phase ?? MatchPhase.Lobby) as MatchPhase,
      mapId: state.mapId ?? '',
      winnerSlot: state.winnerSlot ?? -1,
      players,
    };
    const key = JSON.stringify(view);
    if (key === this.lastLobbyKey) return;
    this.lastLobbyKey = key;
    this.handlers.onLobby(view);
  }

  /** This client's own seat, or null before the room has assigned one. */
  get sessionId(): string | null {
    return this.room?.sessionId ?? null;
  }

  // --- Lobby intents ---------------------------------------------------------

  /** Ask for a navy. Refused server-side if someone else already has it. */
  chooseFaction(faction: Faction): void {
    this.room?.send('faction', { faction });
  }

  /** Ready up, or call a rematch — the server reads it as whichever applies. */
  setReady(ready: boolean): void {
    this.room?.send('ready', { ready });
  }

  /** Seat a commander. It takes a slot and a navy exactly as a person does. */
  addAi(difficulty: AiDifficulty): void {
    this.room?.send('addAi', { difficulty });
  }

  removeAi(sessionId: string): void {
    this.room?.send('removeAi', { sessionId });
  }

  setAiDifficulty(sessionId: string, difficulty: AiDifficulty): void {
    this.room?.send('aiDifficulty', { sessionId, difficulty });
  }

  // --- Intents -------------------------------------------------------------

  moveTo(unitIds: number[], x: number, y: number, queued = false): void {
    if (unitIds.length === 0) return;
    this.room?.send('move', { unitIds, x, y, queued });
  }

  setSilentRunning(unitIds: number[], active: boolean): void {
    if (unitIds.length === 0) return;
    this.room?.send('silent', { unitIds, active });
  }

  /**
   * Order a depth change. Descent is fast and loud, ascent slow and silent —
   * the server owns both rates and refuses a depth outside the map's range.
   */
  setDepth(unitIds: number[], depth: number): void {
    if (unitIds.length === 0) return;
    this.room?.send('depth', { unitIds, depth });
  }

  /** The big red button. Cost is previewed in the HUD before this is called. */
  activeSonar(unitId: number): void {
    this.room?.send('ping', { unitId });
  }

  /** Attack a heard contact, by its opaque per-observer handle. */
  attackContact(unitIds: number[], contactId: number, queued = false): void {
    if (unitIds.length === 0) return;
    this.room?.send('attack', { unitIds, contactId, queued });
  }

  harvest(unitIds: number[], nodeId: number, queued = false): void {
    if (unitIds.length === 0) return;
    this.room?.send('harvest', { unitIds, nodeId, queued });
  }

  setThrottle(unitIds: number[], throttle: HarvestThrottle): void {
    if (unitIds.length === 0) return;
    this.room?.send('throttle', { unitIds, throttle });
  }

  build(kind: StructureKind, x: number, y: number): void {
    this.room?.send('build', { kind, x, y });
  }

  produce(structureId: number, kind: UnitKind): void {
    this.room?.send('produce', { structureId, kind });
  }

  disconnect(): void {
    this.leaving = true;
    // Leaving on purpose is not something to resume from — and StrictMode's
    // double-mount in development would otherwise leave a stale token behind
    // that the next mount tries, and fails, to redeem.
    rememberToken(null);
    this.room?.leave();
    this.room = null;
  }
}
