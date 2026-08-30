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
  type MatchListing,
  type MatchListingMetadata,
  type MissionResultPayload,
  type MissionView,
  type ResourceNodeInfo,
  type StructureKind,
  type UnitKind,
} from '@echoes/shared';
import { toListings } from './rooms.ts';

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
  /**
   * The water column per cell, parallel to `biomes`. `ceiling` is 0 on open
   * water; non-zero is a roofed passage (docs/systems-depth.md §1).
   */
  floor: number[];
  ceiling: number[];
}

/**
 * Cells that changed mid-match, and the ground's revision after applying them.
 *
 * Cells rather than the rectangle a mission authored: a rect would make both
 * sides redo the metres-to-cells arithmetic and agree about every `Math.floor`,
 * and cells are what actually changed.
 *
 * `biome` rides along on every cell (#259), because the record is the cell
 * rather than the fields that moved — see `TerrainCellChange` on the server.
 * It carries no hidden information: terrain is public on join by design, and
 * this makes a published fact mutable rather than publishing a new one.
 */
export interface GroundDeltaPayload {
  revision: number;
  cells: { index: number; floorM: number; ceilingM: number; biome: number }[];
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

/**
 * One authored line of in-mission speech — docs/mission-sorrowgate.md §12.
 *
 * Stamped with the simulation tick it was spoken on, like every other thing
 * this client timestamps: there is no wall-clock anywhere near the match.
 * Carries no position and no entity, so it tells the player nothing about the
 * water it was spoken into.
 */
export interface MissionLine {
  tick: number;
  speaker: string;
  text: string;
}

export interface GameClientHandlers {
  onTerrain(terrain: TerrainPayload): void;
  /** Ground the match changed under the client's feet (#197). */
  onGround(cells: GroundDeltaPayload['cells']): void;
  onMap(map: MapPayload): void;
  onNodes(nodes: ResourceNodeInfo[]): void;
  onAssigned(assigned: AssignedPayload): void;
  onEcho(snapshot: EchoSnapshot): void;
  onGameOver(payload: GameOverPayload): void;
  onLobby(view: LobbyView): void;
  /** The objectives, the locks and the debt, resent only when they change. */
  onMission(view: MissionView): void;
  onMissionLine(line: MissionLine): void;
  /** A mission concludes rather than resolving a winner; this is that. */
  onMissionOver(payload: MissionResultPayload): void;
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

/**
 * What the parked token is a seat *in* — a mission id, or `''` for a skirmish.
 *
 * A token names one room and the client cannot tell which by looking at it, so
 * without this a held skirmish token is redeemed on the way into the Prologue
 * and quietly delivers the skirmish instead: a briefing screen, then somebody
 * else's water. Stored beside the token and cleared with it.
 */
const TOKEN_MISSION_KEY = 'echoes.reconnection.mission';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Storage throws in some privacy modes; a missing token is only a re-join. */
function rememberToken(token: string | null, missionId = ''): void {
  try {
    if (token === null) {
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_MISSION_KEY);
    } else {
      window.sessionStorage.setItem(TOKEN_KEY, token);
      window.sessionStorage.setItem(TOKEN_MISSION_KEY, missionId);
    }
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

/**
 * Whether this tab is still holding a seat it could resume. The title screen
 * reads this to decide whether to offer Resume; only `connect` can find out
 * whether the server is in fact still holding the other end.
 */
export function hasStoredSession(): boolean {
  return recallToken() !== null;
}

/**
 * The mission the held seat belongs to — `''` for a skirmish, `null` for no
 * seat at all. The shell reads this so its Resume entry sends the player back
 * to the match they were actually in rather than to a fresh skirmish.
 */
export function storedMissionId(): string | null {
  if (recallToken() === null) return null;
  try {
    return window.sessionStorage.getItem(TOKEN_MISSION_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * The open rooms, for the match browser (docs/tech-stack.md, "Finding a match").
 *
 * A module function rather than a `GameClient` method because it runs *before*
 * there is a match to be a client of, and it must not be the thing that opens a
 * socket: browsing is looking, not joining.
 *
 * The matchmaker's availability query already filters `locked: false` and
 * `private: false`, so a started room and a private one are absent rather than
 * shown-and-refused. A room that has not published its metadata yet is dropped
 * instead of guessed at — a row that could not say which water it was on would
 * be asking the player to click and find out.
 */
export async function listMatches(endpoint: string = DEFAULT_ENDPOINT): Promise<MatchListing[]> {
  try {
    const rooms = await new Client(endpoint).getAvailableRooms<MatchListingMetadata>('match');
    return toListings(rooms);
  } catch {
    // A server that is down is an empty list rather than an error screen: the
    // browser also carries a code field and a host button, and neither of them
    // stops working because the listing endpoint did.
    return [];
  }
}

export interface ConnectOptions {
  /** Commander name, sent on join. The server truncates and defaults. */
  name?: string;
  /** Which archetype to create, if this client ends up creating the room. */
  mapId?: string;
  /**
   * Join this specific room rather than matchmaking into one — the browser's
   * rows and the room-code field both land here.
   *
   * A room id is not a secret in the sense a token is: it is the *whole* of
   * what makes a private room reachable, which is exactly what a code is for.
   * The server still refuses a locked room and a full one.
   */
  roomId?: string;
  /**
   * Create a room rather than joining one, and whether the world may see it.
   *
   * `private` is unlisted and unmatchable, reachable only by its id. Solo uses
   * it because a solo game somebody else can be matched into is not a solo
   * game — which is what the old `joinOrCreate` path quietly allowed.
   */
  create?: 'public' | 'private';
  /**
   * Which authored mission to play, or absent for an ordinary skirmish.
   *
   * A mission room is a different room from a skirmish on the same water, so
   * the server filters on this alongside the map — see `connect`, which is
   * where the encoding of "no mission" is pinned down.
   */
  missionId?: string;
  /**
   * Whether a held seat should be redeemed. Omitted means yes — a reload is a
   * disconnection like any other. Explicitly false abandons the seat first:
   * the shell's "Solo game" must start a new match, not resurrect an old one.
   */
  resume?: boolean;
}

export class GameClient {
  private readonly client: Client;
  private readonly handlers: GameClientHandlers;
  private room: Room | null = null;
  /** Which room kind this client is in, so a parked token can be matched. */
  private missionId = '';
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

  async connect(options: ConnectOptions = {}): Promise<void> {
    this.handlers.onStatus('connecting');
    // Always a string, and `''` for a skirmish. The server filters rooms on
    // this key, and Colyseus matches filter keys by equality — a client
    // sending `undefined` and one sending `''` would be asking for two
    // different rooms, which would quietly split the skirmish matchmaking
    // pool in half and give nobody an error to read.
    const wanted = options.missionId ?? '';
    this.missionId = wanted;
    // A reload is a disconnection like any other, and the server is still
    // holding the seat. Resuming it is tried first, and failing costs one
    // round trip — the ordinary path is the joinOrCreate below. A deliberate
    // new match abandons the seat instead, so a held token cannot hijack it.
    if (options.resume === false) rememberToken(null);
    const stored = recallToken();
    // Only a seat in the room the caller is asking for. A token is opaque, so
    // a mismatch cannot be discovered by redeeming it — the reconnect would
    // simply succeed and hand back the wrong match. Skipped rather than
    // cleared: the caller wants a different room, not the end of that seat,
    // and `attach` overwrites the token with the new room's anyway.
    if (stored !== null && storedMissionId() === wanted) {
      try {
        this.attach(await this.client.reconnect(stored));
        this.handlers.onStatus('connected');
        return;
      } catch {
        rememberToken(null);
      }
    }
    try {
      // Three doors, and the caller has already chosen which one. A room id is
      // the most specific and wins: it names a room, and matchmaking cannot
      // improve on that.
      if (options.roomId !== undefined && options.roomId !== '') {
        const name = options.name === undefined || options.name === '' ? undefined : options.name;
        this.attach(await this.client.joinById(options.roomId.trim(), { name }));
        this.handlers.onStatus('connected');
        return;
      }
      // The shell passes the archetype in; `?map=<id>` stays honoured as the
      // fallback so a pasted URL (and the headless harness) still lands on the
      // right map. Either selects only when this client creates the room;
      // joining an existing room takes the map it is on, and the server sends
      // back which that was either way.
      const mapId =
        options.mapId ??
        (typeof window === 'undefined'
          ? undefined
          : (new URLSearchParams(window.location.search).get('map') ?? undefined));
      const name = options.name === undefined || options.name === '' ? undefined : options.name;
      const joinOptions = {
        name,
        mapId,
        missionId: wanted,
        ...(options.create === undefined ? {} : { private: options.create === 'private' }),
      };
      // `create` makes a room of its own rather than looking for one. Quick
      // match keeps `joinOrCreate` — picking a map is picking a queue, and that
      // is still the fastest way into a game with strangers.
      this.attach(
        options.create === undefined
          ? await this.client.joinOrCreate('match', joinOptions)
          : await this.client.create('match', joinOptions)
      );
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
    rememberToken(room.reconnectionToken, this.missionId);

    room.onMessage('terrain', (payload: TerrainPayload) => this.handlers.onTerrain(payload));
    // Ground that changed after the join payload was sent (#197). A mission
    // beat can collapse a span, and a client still drawing the route that is
    // no longer there is worse than one drawing nothing — the player would be
    // steering into rock they can see is open.
    room.onMessage('ground', (payload: GroundDeltaPayload) =>
      this.handlers.onGround(payload.cells ?? [])
    );
    room.onMessage('map', (payload: MapPayload) => this.handlers.onMap(payload));
    room.onMessage('nodes', (payload: ResourceNodeInfo[]) => this.handlers.onNodes(payload));
    room.onMessage('assigned', (payload: AssignedPayload) => this.handlers.onAssigned(payload));
    room.onMessage('echo', (payload: EchoSnapshot) => this.handlers.onEcho(payload));
    room.onMessage('gameOver', (payload: GameOverPayload) => this.handlers.onGameOver(payload));
    // The mission channel. Per-client rather than schema, because a mission's
    // objectives are resolved for one observer the way a detection is — see
    // packages/backend/src/rooms/MatchRoom.ts. `mission` arrives on change
    // only, so there is nothing here to throttle.
    room.onMessage('mission', (payload: MissionView) => this.handlers.onMission(payload));
    room.onMessage('missionLine', (payload: MissionLine) => this.handlers.onMissionLine(payload));
    room.onMessage('missionOver', (payload: MissionResultPayload) =>
      this.handlers.onMissionOver(payload)
    );
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

  /**
   * The room's id — the code a host hands somebody so they can join a private
   * match (docs/ui-ux.md §14). Null before a room has been joined.
   */
  get roomId(): string | null {
    return this.room?.roomId ?? null;
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

  /**
   * Arm or disarm floor-following — the standing order of
   * docs/systems-depth.md §2. The server owns the retargeting, the PR
   * disengage, and the dive loudness; this only speaks the mode.
   */
  setFollowFloor(unitIds: number[], active: boolean): void {
    if (unitIds.length === 0) return;
    this.room?.send('followFloor', { unitIds, active });
  }

  /** The big red button. Cost is previewed in the HUD before this is called. */
  activeSonar(unitId: number): void {
    this.room?.send('ping', { unitId });
  }

  /**
   * Launch a torpedo at a heard contact — docs/systems-combat.md §5, §7.
   *
   * The same opaque handle an attack order uses, and for the same reason: it is
   * the proof this player resolved this emitter. The server re-checks the
   * resolution tier as well as the provenance, so a handle held on a Tier-1
   * smudge buys nothing.
   */
  launchTorpedo(unitIds: number[], contactId: number): void {
    if (unitIds.length === 0) return;
    this.room?.send('torpedo', { unitIds, contactId });
  }

  /** Drop a noisemaker decoy. Aimed at nothing; heard by everything. */
  deployNoisemaker(unitIds: number[]): void {
    if (unitIds.length === 0) return;
    this.room?.send('noisemaker', { unitIds });
  }

  /** Lay a mine at the hull's own position. Loud to lay, silent once laid. */
  layMine(unitIds: number[]): void {
    if (unitIds.length === 0) return;
    this.room?.send('mine', { unitIds });
  }

  /** Drop a depth charge set to detonate at `depth`. Bombing water, not a contact. */
  dropDepthCharge(unitIds: number[], depth: number): void {
    if (unitIds.length === 0) return;
    this.room?.send('depthcharge', { unitIds, depth });
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
