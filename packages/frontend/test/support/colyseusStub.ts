/**
 * A Colyseus room and client with no socket, for the message-contract test
 * (#487).
 *
 * `GameClient` is 712 lines whose entire job is translation: server messages
 * into handler calls, and player intents into `room.send`. Neither direction
 * had a test, because reaching `attach` meant opening a WebSocket. Nothing
 * about the translation needs one — the room is an event emitter with a `send`
 * — so this is the smallest stub in the harness and the one that buys the most
 * per line.
 *
 * Everything sent is recorded rather than transmitted, which is what makes the
 * contract checkable in both directions: `sent` is what this client would put
 * on the wire, and `emit` is the server putting something on it.
 *
 * The state is the one part that is not a bag of fields. The client subscribes
 * to the schema per field and per player rather than to the whole of it, so
 * the stub has to be able to tell those subscriptions apart — which a single
 * whole-state callback cannot do. `StubState` therefore models what the
 * decoder fires and what it does not: a named field's listeners, a root
 * `onChange` that also fires for `tick`, the roster's add and remove, and each
 * seated player's own change. Every registrar hands back the same detach
 * function the real one does, and `watchers` counts what is still attached.
 */

/** One message this client would have sent to the server. */
export interface SentMessage {
  type: string;
  payload: unknown;
}

type Listener = (...args: unknown[]) => void;

/** Release a subscription, the way every schema callback registrar does. */
type Detach = () => void;

function detachFrom(handlers: Listener[], handler: Listener): Detach {
  return () => {
    const at = handlers.indexOf(handler);
    if (at >= 0) handlers.splice(at, 1);
  };
}

/** The public fields of one seat — what `MatchState`'s PlayerState carries. */
export interface StubPlayerFields {
  sessionId: string;
  name: string;
  slot: number;
  faction: number;
  ready: boolean;
  connected: boolean;
  isAi: boolean;
  difficulty: number;
}

/** What a room announces about itself, as a whole. `tick` included. */
export interface StubStateFields {
  tick?: number;
  phase?: number;
  mapId?: string;
  winnerSlot?: number;
  players?: Map<string, StubPlayerFields>;
}

const ROOM_FIELDS = ['tick', 'phase', 'mapId', 'winnerSlot'] as const;

/**
 * One seat, and the callback the decoder fires when its own fields move.
 *
 * A player readying up is a change on *this* schema and on nothing above it —
 * which is exactly why a client watching only the collection would miss it.
 */
export class StubPlayer implements StubPlayerFields {
  sessionId = '';
  name = '';
  slot = 0;
  faction = 0;
  ready = false;
  connected = true;
  isAi = false;
  difficulty = 0;

  private readonly changeHandlers: Listener[] = [];

  constructor(fields: StubPlayerFields) {
    Object.assign(this, fields);
  }

  onChange(handler: Listener): Detach {
    this.changeHandlers.push(handler);
    return detachFrom(this.changeHandlers, handler);
  }

  /** Decode a patch for this player. Silent unless something actually moved. */
  apply(fields: StubPlayerFields): boolean {
    let moved = false;
    const self = this as unknown as Record<string, unknown>;
    for (const [field, value] of Object.entries(fields)) {
      if (self[field] === value) continue;
      self[field] = value;
      moved = true;
    }
    if (moved) for (const handler of [...this.changeHandlers]) handler();
    return moved;
  }

  /** Every live subscription on this player. */
  get watchers(): number {
    return this.changeHandlers.length;
  }
}

/** The `players` MapSchema: iteration, and the two collection callbacks. */
export class StubRoster {
  private readonly items = new Map<string, StubPlayer>();
  private readonly addHandlers: Listener[] = [];
  private readonly removeHandlers: Listener[] = [];

  onAdd(handler: Listener, triggerAll = true): Detach {
    this.addHandlers.push(handler);
    // The real one replays what is already there, so a client that joins a
    // room mid-roster still sees it.
    if (triggerAll) this.items.forEach((player, key) => handler(player, key));
    return detachFrom(this.addHandlers, handler);
  }

  onRemove(handler: Listener): Detach {
    this.removeHandlers.push(handler);
    return detachFrom(this.removeHandlers, handler);
  }

  forEach(visit: (player: StubPlayer, sessionId: string) => void): void {
    this.items.forEach(visit);
  }

  /**
   * Decode a roster patch: seats taken, seats given up, and seats whose own
   * fields moved. Returns whether anything did.
   */
  apply(next: Map<string, StubPlayerFields>): boolean {
    let moved = false;
    for (const [key, player] of [...this.items]) {
      if (next.has(key)) continue;
      this.items.delete(key);
      moved = true;
      for (const handler of [...this.removeHandlers]) handler(player, key);
    }
    for (const [key, fields] of next) {
      const seated = this.items.get(key);
      if (seated === undefined) {
        const player = new StubPlayer(fields);
        this.items.set(key, player);
        moved = true;
        for (const handler of [...this.addHandlers]) handler(player, key);
      } else if (seated.apply(fields)) {
        moved = true;
      }
    }
    return moved;
  }

  /** Every live subscription on the collection and on the seats in it. */
  get watchers(): number {
    let total = this.addHandlers.length + this.removeHandlers.length;
    this.items.forEach((player) => {
      total += player.watchers;
    });
    return total;
  }
}

/**
 * The room's schema, as far as the client's callbacks are concerned.
 *
 * It models the two things the coarse `onStateChange` this stub used to carry
 * could not distinguish: `listen`, which fires for one named field, and
 * `onChange`, which fires for *any* field of the root — `tick` included. The
 * second one is here precisely because nothing should subscribe to it. Without
 * it, "a tick pushes no lobby view" would be true of any client at all,
 * including one that had gone back to watching the whole state.
 */
export class StubState {
  tick = 0;
  phase = 0;
  mapId = '';
  winnerSlot = -1;
  readonly players = new StubRoster();

  private readonly fieldHandlers = new Map<string, Listener[]>();
  private readonly changeHandlers: Listener[] = [];

  listen(prop: string, handler: Listener, immediate = true): Detach {
    const handlers = this.fieldHandlers.get(prop) ?? [];
    handlers.push(handler);
    this.fieldHandlers.set(prop, handlers);
    const current = (this as unknown as Record<string, unknown>)[prop];
    if (immediate && current !== undefined) handler(current, undefined);
    return detachFrom(handlers, handler);
  }

  onChange(handler: Listener): Detach {
    this.changeHandlers.push(handler);
    return detachFrom(this.changeHandlers, handler);
  }

  /** Decode a patch for the room's own fields, and hand the roster its share. */
  apply(next: StubStateFields): void {
    let moved = false;
    const self = this as unknown as Record<string, unknown>;
    for (const field of ROOM_FIELDS) {
      const value = next[field];
      if (value === undefined || self[field] === value) continue;
      self[field] = value;
      moved = true;
      for (const handler of [...(this.fieldHandlers.get(field) ?? [])]) handler(value, undefined);
    }
    // A change inside the roster is a change on the player's schema or on the
    // collection's, never on the root's — so it does not reach `onChange`.
    if (next.players !== undefined) this.players.apply(next.players);
    if (moved) for (const handler of [...this.changeHandlers]) handler();
  }

  /** Every live subscription anywhere in the state. */
  get watchers(): number {
    let total = this.changeHandlers.length + this.players.watchers;
    this.fieldHandlers.forEach((handlers) => {
      total += handlers.length;
    });
    return total;
  }
}

/**
 * A stand-in `Room`.
 *
 * The state is a `StubState` rather than a plain object: `pushLobby` reads it,
 * but `watchLobby` *subscribes* to it, and a bag with one whole-state callback
 * cannot tell a client that watches the roster apart from one that watches the
 * tick as well.
 */
export class StubRoom {
  readonly sessionId: string;
  readonly roomId: string;
  reconnectionToken = 'token-0';
  readonly state = new StubState();

  /** Every `send` this room received, oldest first. */
  readonly sent: SentMessage[] = [];
  left = false;

  private readonly messageHandlers = new Map<string, Listener>();
  private readonly errorHandlers: Listener[] = [];
  private readonly leaveHandlers: Listener[] = [];

  constructor(sessionId = 'seat-1', roomId = 'room-1') {
    this.sessionId = sessionId;
    this.roomId = roomId;
  }

  onMessage(type: string, handler: Listener): void {
    this.messageHandlers.set(type, handler);
  }

  onError(handler: Listener): void {
    this.errorHandlers.push(handler);
  }

  onLeave(handler: Listener): void {
    this.leaveHandlers.push(handler);
  }

  send(type: string, payload: unknown): void {
    this.sent.push({ type, payload });
  }

  leave(): void {
    this.left = true;
  }

  // --- the server side of the wire ---------------------------------------

  /** Message types this room has a handler registered for. */
  get handled(): string[] {
    return [...this.messageHandlers.keys()];
  }

  /** Deliver a server message. Returns false when nothing is listening. */
  emit(type: string, payload?: unknown): boolean {
    const handler = this.messageHandlers.get(type);
    if (handler === undefined) return false;
    handler(payload);
    return true;
  }

  /** Announce a schema change, the way the room's state sync would. */
  changeState(state: StubStateFields): void {
    this.state.apply(state);
  }

  /** Step the simulation clock, which the schema carries and the lobby does not. */
  tick(): void {
    this.state.apply({ tick: this.state.tick + 1 });
  }

  /** Everything still subscribed to this room's state. Zero after a leave. */
  get watchers(): number {
    return this.state.watchers;
  }

  raiseError(code: number, message: string): void {
    for (const handler of [...this.errorHandlers]) handler(code, message);
  }

  /** Drop the connection, the way a lost socket would. */
  drop(): void {
    for (const handler of [...this.leaveHandlers]) handler(1006);
  }

  /** Every payload sent under one message type. */
  sentOf(type: string): unknown[] {
    return this.sent.filter((message) => message.type === type).map((message) => message.payload);
  }
}

/** What a `StubClient` was asked to do, so the three join doors are testable. */
export interface JoinCall {
  method: 'joinById' | 'joinOrCreate' | 'create' | 'reconnect';
  /** Room id, room name, or reconnection token, depending on the method. */
  target: string;
  options: unknown;
}

/**
 * A stand-in `Client`.
 *
 * Every entry point hands back the same room unless a test says otherwise, and
 * `fail` makes the next call reject — which is how the resume-then-join
 * fallback and the error status get exercised.
 */
export class StubClient {
  readonly calls: JoinCall[] = [];
  room: StubRoom;
  /** Methods that should reject once, consumed in order. */
  private readonly failures: string[] = [];
  private readonly hangs = new Set<string>();

  constructor(room: StubRoom = new StubRoom()) {
    this.room = room;
  }

  /** Make the next call to `method` reject, as a refused join would. */
  fail(method: JoinCall['method']): void {
    this.failures.push(method);
  }

  /**
   * Make every call to `method` hang for ever — a server that is simply not
   * there. Distinct from `fail`, and worth having: a refusal produces an error
   * status, while silence leaves the client waiting, which is the state the
   * "Listening…" overlay exists for.
   */
  hang(method: JoinCall['method']): void {
    this.hangs.add(method);
  }

  private async answer(call: JoinCall): Promise<StubRoom> {
    this.calls.push(call);
    if (this.hangs.has(call.method)) return new Promise<StubRoom>(() => {});
    const at = this.failures.indexOf(call.method);
    if (at >= 0) {
      this.failures.splice(at, 1);
      throw new Error(`stub: ${call.method} refused`);
    }
    return this.room;
  }

  joinById(roomId: string, options: unknown): Promise<StubRoom> {
    return this.answer({ method: 'joinById', target: roomId, options });
  }

  joinOrCreate(name: string, options: unknown): Promise<StubRoom> {
    return this.answer({ method: 'joinOrCreate', target: name, options });
  }

  create(name: string, options: unknown): Promise<StubRoom> {
    return this.answer({ method: 'create', target: name, options });
  }

  reconnect(token: string): Promise<StubRoom> {
    return this.answer({ method: 'reconnect', target: token, options: undefined });
  }

  async getAvailableRooms(): Promise<unknown[]> {
    return [];
  }

  /** The single call of a given method, for the join-door assertions. */
  callOf(method: JoinCall['method']): JoinCall | undefined {
    return this.calls.find((call) => call.method === method);
  }
}
