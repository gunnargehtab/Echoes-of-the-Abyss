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

/** One message this client would have sent to the server. */
export interface SentMessage {
  type: string;
  payload: unknown;
}

type Listener = (...args: unknown[]) => void;

/** The lobby-relevant fields of one seat, as the room's schema carries them. */
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

/**
 * One player in the roster, with the per-instance `onChange` a decoded
 * `Schema` carries.
 *
 * It is here because the client subscribes to it: a player readying up or
 * taking a navy moves no field of the root state, so a stub whose players were
 * plain objects could not tell that half of the roster's changes happened.
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

  private readonly changeHandlers: Array<() => void> = [];

  constructor(fields: Partial<StubPlayerFields> = {}) {
    Object.assign(this, fields);
  }

  onChange(handler: () => void): () => void {
    this.changeHandlers.push(handler);
    return () => {
      const at = this.changeHandlers.indexOf(handler);
      if (at >= 0) this.changeHandlers.splice(at, 1);
    };
  }

  /** How many callbacks are still wired to this player — leaks are countable. */
  get watchers(): number {
    return this.changeHandlers.length;
  }

  /** Apply a patch, and announce it only if it actually changed something. */
  assign(fields: Partial<StubPlayerFields>): void {
    const self = this as unknown as Record<string, unknown>;
    let moved = false;
    for (const [key, value] of Object.entries(fields)) {
      if (self[key] === value) continue;
      self[key] = value;
      moved = true;
    }
    if (!moved) return;
    for (const handler of [...this.changeHandlers]) handler();
  }
}

/**
 * The roster, with the collection callbacks `MapSchema` has in
 * @colyseus/schema 2.x — `onAdd` replaying the entries already in the map
 * unless it is told not to, and each returning its own de-register.
 */
export class StubRoster {
  private readonly items = new Map<string, StubPlayer>();
  private readonly addHandlers: Array<(player: StubPlayer, key: string) => void> = [];
  private readonly removeHandlers: Array<(player: StubPlayer, key: string) => void> = [];

  onAdd(handler: (player: StubPlayer, key: string) => void, triggerAll = true): () => void {
    this.addHandlers.push(handler);
    if (triggerAll) this.items.forEach((player, key) => handler(player, key));
    return () => {
      const at = this.addHandlers.indexOf(handler);
      if (at >= 0) this.addHandlers.splice(at, 1);
    };
  }

  onRemove(handler: (player: StubPlayer, key: string) => void): () => void {
    this.removeHandlers.push(handler);
    return () => {
      const at = this.removeHandlers.indexOf(handler);
      if (at >= 0) this.removeHandlers.splice(at, 1);
    };
  }

  forEach(callback: (player: StubPlayer, key: string) => void): void {
    this.items.forEach(callback);
  }

  get(key: string): StubPlayer | undefined {
    return this.items.get(key);
  }

  /** How many callbacks the roster itself is still holding. */
  get watchers(): number {
    return this.addHandlers.length + this.removeHandlers.length;
  }

  // --- the server side of the roster -------------------------------------

  /** Add a player, or patch one already seated. */
  set(key: string, fields: Partial<StubPlayerFields>): StubPlayer {
    const existing = this.items.get(key);
    if (existing !== undefined) {
      existing.assign(fields);
      return existing;
    }
    const player = new StubPlayer({ sessionId: key, ...fields });
    this.items.set(key, player);
    for (const handler of [...this.addHandlers]) handler(player, key);
    return player;
  }

  delete(key: string): void {
    const player = this.items.get(key);
    if (player === undefined) return;
    this.items.delete(key);
    for (const handler of [...this.removeHandlers]) handler(player, key);
  }
}

/**
 * The room's schema, with the `listen` a decoded `Schema` carries.
 *
 * `tick` is on it and is what nobody should be listening to: it is the field
 * that moves five times a second for a whole match, so a client subscribed to
 * the state as a whole hears every one of them and a client subscribed per
 * field hears none.
 */
export class StubState {
  tick = 0;
  phase = 0;
  mapId = '';
  winnerSlot = -1;
  readonly players = new StubRoster();

  private readonly fieldHandlers = new Map<string, Array<(value: unknown) => void>>();

  listen(prop: string, handler: (value: unknown) => void, immediate = true): () => void {
    const handlers = this.fieldHandlers.get(prop) ?? [];
    handlers.push(handler);
    this.fieldHandlers.set(prop, handlers);
    if (immediate) handler((this as unknown as Record<string, unknown>)[prop]);
    return () => {
      const at = handlers.indexOf(handler);
      if (at >= 0) handlers.splice(at, 1);
    };
  }

  /** Every callback still wired to this state, fields and roster together. */
  get watchers(): number {
    let total = 0;
    for (const handlers of this.fieldHandlers.values()) total += handlers.length;
    this.players.forEach((player) => {
      total += player.watchers;
    });
    return total + this.players.watchers;
  }

  // --- the server side of the state --------------------------------------

  /**
   * Write one field, and fire its listeners only when the value moved — which
   * is what the decoder does, since a field that did not change is not in the
   * patch at all.
   */
  set<K extends 'tick' | 'phase' | 'mapId' | 'winnerSlot'>(prop: K, value: StubState[K]): void {
    // Through a `StubState`-typed alias rather than `this`, which in a
    // generic write is the subclass a subclass would have.
    const self: StubState = this;
    if (self[prop] === value) return;
    self[prop] = value;
    for (const handler of [...(this.fieldHandlers.get(prop) ?? [])]) handler(value);
  }
}

/**
 * A stand-in `Room`.
 *
 * The state is a `StubState`, which models the decoder's callbacks rather than
 * only its fields: `listen` per field, `onAdd`/`onRemove` on the roster, and
 * `onChange` on each player. The client subscribes to exactly those, so a stub
 * offering only the coarse whole-state callback could not say whether it
 * subscribes to the right ones — nor whether it lets go of them again.
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

  /**
   * Announce a schema change, the way the room's state sync would — every
   * field that moved, every player added, patched or gone, each through the
   * callback the decoder would have fired.
   *
   * A patch rather than a replacement, because the decoder never replaces the
   * state object either: the client holds listeners on it, and swapping it out
   * from under them would be modelling something that cannot happen.
   */
  changeState(patch: {
    tick?: number;
    phase?: number;
    mapId?: string;
    winnerSlot?: number;
    players?: Map<string, Partial<StubPlayerFields>>;
  }): void {
    if (patch.tick !== undefined) this.state.set('tick', patch.tick);
    if (patch.phase !== undefined) this.state.set('phase', patch.phase);
    if (patch.mapId !== undefined) this.state.set('mapId', patch.mapId);
    if (patch.winnerSlot !== undefined) this.state.set('winnerSlot', patch.winnerSlot);
    const wanted = patch.players;
    if (wanted === undefined) return;
    const gone: string[] = [];
    this.state.players.forEach((_player, key) => {
      if (!wanted.has(key)) gone.push(key);
    });
    for (const key of gone) this.state.players.delete(key);
    wanted.forEach((fields, key) => this.state.players.set(key, fields));
  }

  /** One simulation tick and nothing else — the 5 Hz heartbeat of a match. */
  advanceTick(): void {
    this.state.set('tick', this.state.tick + 1);
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
