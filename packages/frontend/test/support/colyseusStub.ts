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
 */

import type { LobbyCallbacksFactory } from '../../src/net/GameClient.ts';

/** One message this client would have sent to the server. */
export interface SentMessage {
  type: string;
  payload: unknown;
}

type Listener = (...args: unknown[]) => void;

/** The public fields of one seat, as the room's schema carries them. */
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

/** Registering a listener hands back the call that undoes it, as schema does. */
function subscribe(listeners: Listener[], listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const at = listeners.indexOf(listener);
    if (at >= 0) listeners.splice(at, 1);
  };
}

/**
 * A stand-in `PlayerState`.
 *
 * A seat is a Schema of its own in the real room, which is why it carries its
 * own `onChange`: a commander picking a navy or readying up moves this object
 * and not the map holding it, so the map's own callbacks never fire for it.
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

  constructor(fields: Partial<StubPlayerFields> = {}) {
    Object.assign(this, fields);
  }

  onChange(handler: Listener): () => void {
    return subscribe(this.changeHandlers, handler);
  }

  /** How many listeners are still attached — a leak is visible as a number. */
  get watchers(): number {
    return this.changeHandlers.length;
  }

  /** The server side: move fields on a seat that is already here. */
  set(fields: Partial<StubPlayerFields>): void {
    Object.assign(this, fields);
    for (const handler of [...this.changeHandlers]) handler();
  }
}

/**
 * A stand-in `MapSchema` of seats.
 *
 * Only the three things the client reaches for: iteration, and the two edges
 * of the roster. Each registration hands back its own undo, because that is
 * what the client is expected to hold on to.
 *
 * The callback adapter mirrors the SDK API: `onAdd` replays entries unless it is
 * told not to, `onRemove` never replays, and both return their own
 * de-register.
 */
export class StubPlayers {
  private readonly items = new Map<string, StubPlayer>();
  private readonly addHandlers: Listener[] = [];
  private readonly removeHandlers: Listener[] = [];

  onAdd(handler: Listener, triggerAll = true): () => void {
    const undo = subscribe(this.addHandlers, handler);
    if (triggerAll) this.items.forEach((player, key) => handler(player, key));
    return undo;
  }

  onRemove(handler: Listener): () => void {
    return subscribe(this.removeHandlers, handler);
  }

  forEach(each: (player: StubPlayer, key: string) => void): void {
    this.items.forEach(each);
  }

  get(key: string): StubPlayer | undefined {
    return this.items.get(key);
  }

  get size(): number {
    return this.items.size;
  }

  /** Listeners still attached to the roster itself, for the leak assertions. */
  get watchers(): number {
    return this.addHandlers.length + this.removeHandlers.length;
  }

  // --- the server side of the wire ---------------------------------------

  add(key: string, fields: Partial<StubPlayerFields> = {}): StubPlayer {
    const player = new StubPlayer({ sessionId: key, ...fields });
    this.items.set(key, player);
    for (const handler of [...this.addHandlers]) handler(player, key);
    return player;
  }

  remove(key: string): void {
    const player = this.items.get(key);
    if (player === undefined) return;
    this.items.delete(key);
    for (const handler of [...this.removeHandlers]) handler(player, key);
  }
}

/** The fields of `MatchState` a lobby is a view of, plus the tick under them. */
export interface StubStateFields {
  tick: number;
  phase: number;
  mapId: string;
  winnerSlot: number;
}

/** What one of those fields holds once a patch has decoded it. */
type StubFieldValue = StubStateFields[keyof StubStateFields];

/**
 * A stand-in `MatchState`.
 *
 * One object for the life of the room, the way a decoder's state is: the
 * fields move under it rather than being replaced. That is the whole point of
 * the stub for #489's successor — `tick` moves five times a second beside
 * three fields a lobby cares about, and only a per-field subscription can tell
 * them apart.
 */
export class StubState implements Partial<StubStateFields> {
  // Undefined until a patch decodes them. The real SDK initially returns an
  // empty Schema, including an absent `players` field; `deferInitialState()`
  // models that pre-snapshot window for the client regression test.
  tick?: number;
  phase?: number;
  mapId?: string;
  winnerSlot?: number;
  readonly players = new StubPlayers();

  private readonly fieldHandlers = new Map<string, Listener[]>();

  listen(prop: keyof StubStateFields, handler: Listener, immediate = true): () => void {
    const listeners = this.fieldHandlers.get(prop) ?? [];
    this.fieldHandlers.set(prop, listeners);
    const undo = subscribe(listeners, handler);
    // `immediate` skips a field the decoder has not filled in yet, rather
    // than replaying an undefined — @colyseus/schema 2.x's own condition.
    if (immediate && this[prop] !== undefined) handler(this[prop], undefined);
    return undo;
  }

  /** Listeners still attached to a field, for the leak assertions. */
  watchers(prop: keyof StubStateFields): number {
    return this.fieldHandlers.get(prop)?.length ?? 0;
  }

  // --- the server side of the wire ---------------------------------------

  /** Move fields, firing a listener only for the ones that actually moved. */
  set(fields: Partial<StubStateFields>): void {
    for (const [prop, value] of Object.entries(fields) as Array<
      [keyof StubStateFields, StubFieldValue]
    >) {
      if (this[prop] === value) continue;
      const previous = this[prop];
      (this[prop] as StubFieldValue) = value;
      for (const handler of [...(this.fieldHandlers.get(prop) ?? [])]) handler(value, previous);
    }
  }
}

/**
 * A stand-in `Room`.
 *
 * The state is a `StubState`: a stable object with per-field listeners and a
 * roster that announces its own edges, because that is the part of the schema
 * the client subscribes to.
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
  private readonly stateHandlers: Listener[] = [];
  private readonly onceStateHandlers = new Set<Listener>();
  private readonly errorHandlers: Listener[] = [];
  private readonly dropHandlers: Listener[] = [];
  private readonly reconnectHandlers: Listener[] = [];
  private readonly leaveHandlers: Listener[] = [];
  private deferredPlayers: StubPlayers | null = null;

  constructor(sessionId = 'seat-1', roomId = 'room-1') {
    this.sessionId = sessionId;
    this.roomId = roomId;
  }

  onMessage(type: string, handler: Listener): void {
    this.messageHandlers.set(type, handler);
  }

  readonly onStateChange = Object.assign(
    (handler: Listener): void => {
      this.stateHandlers.push(handler);
    },
    {
      once: (handler: Listener): void => {
        this.stateHandlers.push(handler);
        this.onceStateHandlers.add(handler);
      },
      remove: (handler: Listener): void => {
        this.removeStateHandler(handler);
      },
    }
  );

  onError(handler: Listener): void {
    this.errorHandlers.push(handler);
  }

  onDrop(handler: Listener): void {
    this.dropHandlers.push(handler);
  }

  onReconnect(handler: Listener): void {
    this.reconnectHandlers.push(handler);
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

  /**
   * Announce a schema change, the way the room's state sync would.
   *
   * Every mutation below ends here, because the real room's whole-state
   * callback fires for anything in the schema — which is exactly the trap
   * `tick` sets for a client that listens there.
   */
  private announceState(): void {
    for (const handler of [...this.stateHandlers]) {
      if (this.onceStateHandlers.delete(handler)) this.removeStateHandler(handler);
      handler();
    }
  }

  private removeStateHandler(handler: Listener): void {
    const index = this.stateHandlers.indexOf(handler);
    if (index !== -1) this.stateHandlers.splice(index, 1);
    this.onceStateHandlers.delete(handler);
  }

  /** Hold the roster back until the initial state snapshot is delivered. */
  deferInitialState(): void {
    this.deferredPlayers = this.state.players;
    Object.defineProperty(this.state, 'players', {
      configurable: true,
      value: undefined,
      writable: true,
    });
  }

  /** Deliver the initial state snapshot after the room has been joined. */
  receiveInitialState(): void {
    if (this.deferredPlayers === null) return;
    Object.defineProperty(this.state, 'players', {
      configurable: true,
      value: this.deferredPlayers,
      writable: true,
    });
    this.deferredPlayers = null;
    this.announceState();
  }

  /**
   * Advance the simulation tick, five times a second for the whole match.
   *
   * A schema field like any other, and the one thing in the state a lobby has
   * no business hearing about.
   */
  tick(to = (this.state.tick ?? 0) + 1): void {
    this.state.set({ tick: to });
    this.announceState();
  }

  /**
   * Move the lobby fields, and reconcile the roster against the one given.
   *
   * Seats are added, moved and removed rather than replaced wholesale, because
   * the decoder never replaces them either: a commander who readies up is the
   * same object with a different field.
   */
  changeState(
    next: Partial<StubStateFields> & { players?: Map<string, Partial<StubPlayerFields>> }
  ): void {
    const { players, ...fields } = next;
    this.state.set(fields);
    if (players !== undefined) {
      const gone: string[] = [];
      this.state.players.forEach((_player, key) => {
        if (!players.has(key)) gone.push(key);
      });
      for (const key of gone) this.state.players.remove(key);
      players.forEach((seatFields, key) => {
        const seated = this.state.players.get(key);
        if (seated === undefined) this.state.players.add(key, seatFields);
        else seated.set(seatFields);
      });
    }
    this.announceState();
  }

  /** Seat a commander, the way a join does. */
  seat(key: string, fields: Partial<StubPlayerFields> = {}): StubPlayer {
    const player = this.state.players.add(key, fields);
    this.announceState();
    return player;
  }

  /** Empty a seat, the way a leave does. */
  unseat(key: string): void {
    this.state.players.remove(key);
    this.announceState();
  }

  /** Move a field on a commander who is already here — a navy, a ready flag. */
  changePlayer(key: string, fields: Partial<StubPlayerFields>): void {
    this.state.players.get(key)?.set(fields);
    this.announceState();
  }

  raiseError(code: number, message: string): void {
    for (const handler of [...this.errorHandlers]) handler(code, message);
  }

  /** Drop the connection, the way a lost socket would. */
  drop(): void {
    for (const handler of [...this.dropHandlers]) handler(1006);
  }

  /** Restore a dropped room, as the SDK's automatic retry does. */
  reconnect(): void {
    for (const handler of [...this.reconnectHandlers]) handler();
  }

  /** Permanently leave after a drop or an intentional disconnect. */
  finishLeave(code = 1000): void {
    for (const handler of [...this.leaveHandlers]) handler(code);
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

  /** The single call of a given method, for the join-door assertions. */
  callOf(method: JoinCall['method']): JoinCall | undefined {
    return this.calls.find((call) => call.method === method);
  }
}

/** State-callback adapter for GameClient's real SDK callback provider seam. */
export const stubCallbacks: LobbyCallbacksFactory = (room) => {
  const state = room.state as unknown as StubState;
  return {
    listen: (property, callback, immediate) => state.listen(property, () => callback(), immediate),
    onChange: (instance, callback) => (instance as unknown as StubPlayer).onChange(callback),
    onAdd: (_property, callback, immediate) =>
      state.players.onAdd((player, key) => callback(player, key), immediate),
    onRemove: (_property, callback) =>
      state.players.onRemove((player, key) => callback(player, key)),
  };
};
