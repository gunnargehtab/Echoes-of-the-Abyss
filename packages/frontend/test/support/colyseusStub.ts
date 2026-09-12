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
 * The state is the one part modelled rather than simplified. The client
 * subscribes to the fields and the roster it reads rather than to the schema as
 * a whole, so which callback a change fires — a root field's `listen`, the
 * map's `onAdd`/`onRemove`, a seat's own `onChange` — is now the thing under
 * test, and a plain object with a whole-state callback could not tell the
 * difference between the roster moving and the simulation clock advancing.
 */

/** One message this client would have sent to the server. */
export interface SentMessage {
  type: string;
  payload: unknown;
}

type Listener = (...args: unknown[]) => void;

/** What a schema callback hands back, so it can be taken off again. */
type Unsubscribe = () => void;

/** Take one listener off a list, the way a schema unsubscribe does. */
function drop<T>(list: T[], item: T): void {
  const at = list.indexOf(item);
  if (at >= 0) list.splice(at, 1);
}

/** The fields one seat carries in the match schema. */
export interface SeatFields {
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
 * One seat.
 *
 * The interesting half is `onChange`: @colyseus/schema puts it on every Schema
 * instance, and for a seat *already in* the roster it is the only announcement
 * there is — the map itself reports an entry whose value was replaced, which
 * is not what a commander picking a navy does.
 */
export class StubSeat implements SeatFields {
  sessionId = '';
  name = '';
  slot = 0;
  faction = 0;
  ready = false;
  connected = true;
  isAi = false;
  difficulty = 0;

  private readonly changeHandlers: Array<() => void> = [];

  constructor(fields: Partial<SeatFields> = {}) {
    Object.assign(this, fields);
  }

  onChange(handler: () => void): Unsubscribe {
    this.changeHandlers.push(handler);
    return () => drop(this.changeHandlers, handler);
  }

  /** Callbacks still registered on this seat. See `StubState.watchers`. */
  get watchers(): number {
    return this.changeHandlers.length;
  }

  /** Write fields the way a decoded patch would, callbacks and all. */
  set(fields: Partial<SeatFields>): void {
    const moved = Object.entries(fields).some(
      ([key, value]) => (this as unknown as Record<string, unknown>)[key] !== value
    );
    Object.assign(this, fields);
    // A write of the value a field already holds is dropped by the encoder, so
    // it never reaches a decoder and fires nothing.
    if (moved) for (const handler of [...this.changeHandlers]) handler();
  }
}

/**
 * The roster — a `MapSchema` stand-in, down to which callbacks exist.
 *
 * `onChange` is deliberately absent, because subscribing to it instead of to
 * each seat is the mistake it would let pass.
 */
export class StubSeats {
  private readonly items = new Map<string, StubSeat>();
  private readonly addHandlers: Array<(seat: StubSeat, key: string) => void> = [];
  private readonly removeHandlers: Array<(seat: StubSeat, key: string) => void> = [];

  onAdd(handler: (seat: StubSeat, key: string) => void, triggerAll = true): Unsubscribe {
    this.addHandlers.push(handler);
    if (triggerAll) this.items.forEach((seat, key) => handler(seat, key));
    return () => drop(this.addHandlers, handler);
  }

  onRemove(handler: (seat: StubSeat, key: string) => void): Unsubscribe {
    this.removeHandlers.push(handler);
    return () => drop(this.removeHandlers, handler);
  }

  forEach(callback: (seat: StubSeat, key: string) => void): void {
    this.items.forEach(callback);
  }

  get size(): number {
    return this.items.size;
  }

  /** Callbacks still registered here and on the seats in it. */
  get watchers(): number {
    let total = this.addHandlers.length + this.removeHandlers.length;
    this.items.forEach((seat) => {
      total += seat.watchers;
    });
    return total;
  }

  /** Seat a commander, the way a decoded ADD would. */
  add(fields: Partial<SeatFields>): StubSeat {
    const seat = new StubSeat(fields);
    this.items.set(seat.sessionId, seat);
    for (const handler of [...this.addHandlers]) handler(seat, seat.sessionId);
    return seat;
  }

  /** Free a seat, the way a decoded DELETE would. */
  remove(sessionId: string): void {
    const seat = this.items.get(sessionId);
    if (seat === undefined) return;
    this.items.delete(sessionId);
    for (const handler of [...this.removeHandlers]) handler(seat, sessionId);
  }

  get(sessionId: string): StubSeat | undefined {
    return this.items.get(sessionId);
  }
}

/** The root fields of the match schema — `tick` among them, on purpose. */
export interface StateFields {
  /** Advances five times a second for the whole match. Nobody should watch it. */
  tick: number;
  phase: number;
  mapId: string;
  winnerSlot: number;
}

/**
 * A stand-in for the room's schema state.
 *
 * Modelled as a schema rather than as a plain object because that is what the
 * client now subscribes to: per-field `listen`, and the roster's own add and
 * remove. `set` is the decoder — it writes the fields and fires exactly the
 * callbacks a real patch would.
 */
export class StubState implements StateFields {
  tick = 0;
  phase = 0;
  mapId = '';
  winnerSlot = -1;
  readonly players = new StubSeats();

  private readonly listeners = new Map<
    string,
    Array<(value: unknown, previous: unknown) => void>
  >();

  listen<K extends keyof StateFields>(
    prop: K,
    handler: (value: StateFields[K], previous: StateFields[K]) => void,
    immediate = true
  ): Unsubscribe {
    const list = this.listeners.get(prop) ?? [];
    list.push(handler as (value: unknown, previous: unknown) => void);
    this.listeners.set(prop, list);
    if (immediate) handler(this[prop], this[prop]);
    return () => drop(list, handler as (value: unknown, previous: unknown) => void);
  }

  /**
   * How many callbacks are registered on this state tree, seats included.
   *
   * A leak is invisible from the outside — a client that has dropped its room
   * pushes nothing either way — so this is what "the listener came off again"
   * can actually be asserted against.
   */
  get watchers(): number {
    let total = this.players.watchers;
    this.listeners.forEach((list) => {
      total += list.length;
    });
    return total;
  }

  /** Write root fields the way a decoded patch would. */
  set(fields: Partial<StateFields>): void {
    for (const [key, value] of Object.entries(fields)) {
      const self = this as unknown as Record<string, unknown>;
      const previous = self[key];
      // An unchanged write is dropped by the encoder and never decoded.
      if (previous === value) continue;
      self[key] = value;
      for (const handler of [...(this.listeners.get(key) ?? [])]) handler(value, previous);
    }
  }
}

/**
 * A stand-in `Room`.
 *
 * The state is a `StubState`, which models the schema's callbacks rather than
 * only its fields: what the client subscribes to is now the thing under test.
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
