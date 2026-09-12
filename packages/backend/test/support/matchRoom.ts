/**
 * Standing one `MatchRoom` up without a server.
 *
 * `lifecycle.test.ts` tested the lobby rules as pure functions and said why:
 * a room is a network object, and standing one up would test the transport
 * rather than the decisions. That reasoning still holds for the rules — and it
 * is exactly why the room itself went untested, which is how it reached #489's
 * successor with no exception containment at all and nobody noticing.
 *
 * What this harness exists for is the half of the room that is *not* a rule:
 * what Colyseus does around the room's own code. Colyseus decides, in the
 * `Room` constructor, whether to wrap every message handler and the simulation
 * interval in a try/catch, and it decides it by looking for a method. Nothing
 * short of a real `Room` instance can be asked whether that happened.
 *
 * So a real one is built, with the three things a server would otherwise
 * supply stubbed and nothing else:
 *
 * - **A listing.** The row a matchmaker driver would hand the room, which
 *   `setPrivate` and `setMetadata` write to. Hand-rolled rather than borrowed
 *   from `LocalDriver`: `@colyseus/core` re-exports the drivers through
 *   `export *`, which Node's static CJS export detection cannot see, so
 *   importing one fails at runtime under the unbundled ESM test loader in
 *   exactly the way CLAUDE.md warns the `colyseus` meta-package does.
 * - **A client.** One object implementing Colyseus's `Client`, recording what
 *   the room sent it rather than encoding it onto a socket.
 * - **The clock.** Colyseus starts two real `setInterval`s — the patch rate in
 *   the constructor, the 60 Hz step at the foot of `onCreate`. Both are
 *   captured instead of started, so a test drives the room's own wrapped tick
 *   callback by hand. Asserting on counted steps rather than on elapsed
 *   milliseconds is this repository's standing rule for the budgets
 *   (sim/stepWork.ts) and it applies just as well to a room: a test that slept
 *   for a second to see a tick would be measuring the runner.
 */

import { EventEmitter } from 'node:events';
import {
  ClientState,
  LocalPresence,
  RoomInternalState,
  type Client,
  type RoomListingData,
} from '@colyseus/core';
import { SIM } from '@echoes/shared';
import { MatchRoom, type MatchRoomOptions } from '../../src/rooms/MatchRoom.ts';
import { Match } from '../../src/sim/match.ts';
import type { MapDefinition } from '../../src/sim/maps/types.ts';

/** One message the room sent a client, as the client saw it. */
export interface SentMessage {
  type: string;
  payload: unknown;
}

export interface StubClient extends Client {
  /** Everything the room has sent this client, in order. */
  readonly sent: SentMessage[];
}

/**
 * A client that is a recorder rather than a socket.
 *
 * `ref` is a real `EventEmitter` because `disconnect()` removes listeners off
 * it before it will let a client go.
 */
export function stubClient(sessionId: string): StubClient {
  const sent: SentMessage[] = [];
  return {
    sent,
    id: sessionId,
    sessionId,
    readyState: 1,
    state: ClientState.JOINED,
    ref: new EventEmitter(),
    _reconnectionToken: sessionId,
    _afterNextPatchQueue: [],
    raw: () => {},
    enqueueRaw: () => {},
    send: (type: unknown, payload?: unknown) => {
      sent.push({ type: String(type), payload });
    },
    sendBytes: () => {},
    leave: () => {},
    close: () => {},
    error: () => {},
  };
}

/**
 * The matchmaker row this room advertises itself through.
 *
 * `save`, `remove` and `updateOne` are the whole driver contract the room
 * touches: `setMetadata` and `setPrivate` on create, `lock` on start, and
 * `remove` on the way out.
 */
function stubListing(roomId: string): RoomListingData {
  return {
    clients: 0,
    locked: false,
    private: false,
    maxClients: Infinity,
    metadata: undefined,
    name: 'match',
    processId: 'test',
    roomId,
    unlisted: false,
    save: () => {},
    remove: () => {},
    updateOne: () => {},
  };
}

/**
 * The room's own internals, named once.
 *
 * A cast rather than a production seam: none of this is a thing the room
 * should offer anybody, and inventing five accessors so a test can read them
 * would be a worse trade than one honest cast in one test file.
 */
interface RoomInternals {
  match: Match;
  map: MapDefinition;
  onMessageHandlers: Record<string, (client: Client, payload: unknown) => void>;
  _internalState: RoomInternalState;
  _autoDisposeTimeout?: NodeJS.Timeout;
}

export const internalsOf = (room: MatchRoom): RoomInternals => room as unknown as RoomInternals;

/** Is this room on its way out, in the sense `disconnect()` puts it there? */
export const isDisposing = (room: MatchRoom): boolean =>
  internalsOf(room)._internalState === RoomInternalState.DISPOSING;

export interface RoomHarness {
  readonly room: MatchRoom;
  /** The match this room is driving. */
  readonly match: Match;
  /** Seat a client, as the transport's `_onJoin` would. */
  join(sessionId?: string): StubClient;
  /** Deliver one client message exactly as `Room._onMessage` would. */
  deliver(client: Client, type: string, payload?: unknown): void;
  /** Drive one fixed step through Colyseus's own wrapped tick callback. */
  step(deltaMs?: number): void;
  /** Drive `count` of them. */
  steps(count: number, deltaMs?: number): void;
  /** False once the room has cleared its own simulation interval. */
  readonly stepping: boolean;
}

export interface HarnessOptions extends MatchRoomOptions {
  /**
   * Fix the world's seed.
   *
   * The room picks its own — a match is not a replay — so a test that needs
   * two rooms to do identical work has to say so. Skirmish only; a mission
   * room builds its match from authored forces this cannot stand in for.
   */
  seed?: number;
  /**
   * Build the room the way it was built before the containment hook existed.
   *
   * Colyseus reads `onUncaughtException` off the instance in the `Room`
   * constructor and never again, so the only way to get an unwrapped room to
   * compare against is to take the method off the prototype for the length of
   * one `new`. That is what makes the "wrapping costs nothing" assertion a
   * measurement rather than a claim.
   */
  contained?: boolean;
}

type IntervalFn = typeof globalThis.setInterval;

/**
 * An interval the room asked for and did not get.
 *
 * It stands in for the timer handle as well as for the callback, so that a
 * room clearing its own interval — which the containment hook does the moment
 * a step throws — is something a test can see rather than infer.
 */
interface CapturedInterval {
  [CAPTURED]: true;
  fn: (...args: unknown[]) => void;
  delay: number;
  cleared: boolean;
}

const CAPTURED = Symbol('capturedInterval');

const isCaptured = (handle: unknown): handle is CapturedInterval =>
  typeof handle === 'object' && handle !== null && CAPTURED in handle;

// Installed once, for the life of the process, and inert for every timer this
// file did not hand out. `setInterval` is only patched while a room is being
// built, but the clears come later — from `disconnect`, and from the
// containment hook — so this half cannot be scoped the same way.
const realClearInterval = globalThis.clearInterval;
globalThis.clearInterval = ((handle: unknown) => {
  if (isCaptured(handle)) {
    handle.cleared = true;
    return;
  }
  realClearInterval(handle as Parameters<typeof realClearInterval>[0]);
}) as typeof globalThis.clearInterval;

let nextRoomId = 0;

/**
 * Build a room and run its `onCreate`, with every timer it starts captured.
 */
export async function standUpRoom(options: HarnessOptions = {}): Promise<RoomHarness> {
  const { seed, contained = true, ...roomOptions } = options;

  const captured: CapturedInterval[] = [];
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = ((fn: (...args: unknown[]) => void, delay?: number) => {
    const entry: CapturedInterval = { [CAPTURED]: true, fn, delay: delay ?? 0, cleared: false };
    captured.push(entry);
    // The entry is its own handle, so the room's `clearInterval` lands back
    // here. No real timer is started at all, which is also why nothing this
    // harness builds can hold the test runner open.
    return entry as unknown as NodeJS.Timeout;
  }) as IntervalFn;

  const hook = MatchRoom.prototype.onUncaughtException;
  let room: MatchRoom;
  try {
    if (!contained) Reflect.deleteProperty(MatchRoom.prototype, 'onUncaughtException');
    try {
      room = new MatchRoom(new LocalPresence());
    } finally {
      if (!contained) MatchRoom.prototype.onUncaughtException = hook;
    }

    // The seat-reservation timer the constructor arms: fifteen seconds out,
    // and it disposes the room when it fires. Cleared before `onCreate` rather
    // than after, because `onCreate` is allowed to throw — a room that refused
    // an unknown mission would otherwise leave a real timer behind and hold
    // the test runner open for the full fifteen.
    clearTimeout(internalsOf(room)._autoDisposeTimeout);
    internalsOf(room)._autoDisposeTimeout = undefined;

    room.roomId = `test${nextRoomId++}`;
    room.roomName = 'match';
    room.listing = stubListing(room.roomId);

    await room.onCreate(roomOptions);
  } finally {
    globalThis.setInterval = realSetInterval;
  }

  const internals = internalsOf(room);
  // The matchmaker does this once `onCreate` resolves, and `disconnect()`
  // refuses outright until it has.
  internals._internalState = RoomInternalState.CREATED;

  if (seed !== undefined) internals.match = new Match(internals.map, { seed });

  const tick = captured.find((entry) => entry.delay === 1000 / SIM.TICK_HZ);
  if (tick === undefined) throw new Error('the room registered no simulation interval');

  // Colyseus's clock reads wall-clock, which would make every step's delta a
  // property of the runner rather than of the test: the same match stepped
  // twice would take a different number of fixed steps each time, and two
  // rooms driven identically would diverge. It is given a cursor the harness
  // moves instead. `now` is protected on the Clock and assigned per instance,
  // so replacing it touches this room's clock and nothing else.
  let now = Date.now();
  (room.clock as unknown as { now: () => number }).now = () => now;
  room.clock.currentTime = now;

  const step = (deltaMs = 1000 / SIM.TICK_HZ): void => {
    // A cleared interval stops firing, so a step past that point does nothing
    // — the same thing the real timer would do, rather than the harness
    // reaching past a room that has stopped itself.
    if (tick.cleared) return;
    // Colyseus's own arrow — `clock.tick()`, then the wrapped callback with
    // `clock.deltaTime` — so the wrapping under test is exercised rather than
    // stepped around.
    now += deltaMs;
    tick.fn();
  };

  return {
    room,
    get match() {
      return internals.match;
    },
    join(sessionId = `s${room.clients.length}`) {
      const client = stubClient(sessionId);
      room.clients.push(client);
      room.onJoin!(client, { name: sessionId });
      return client;
    },
    deliver(client, type, payload) {
      const handler = internals.onMessageHandlers[type];
      if (handler === undefined) throw new Error(`no handler registered for '${type}'`);
      handler(client, payload);
    },
    step,
    steps(count, deltaMs) {
      for (let i = 0; i < count; i++) step(deltaMs);
    },
    get stepping() {
      return !tick.cleared;
    },
  };
}
