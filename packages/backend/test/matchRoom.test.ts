/**
 * Per-room exception containment — the first test `MatchRoom` has ever had.
 *
 * What is under test is not a function but a *gate*. Colyseus wraps every
 * message handler, the simulation interval and both clock timers if and only if
 * a room defines `onUncaughtException`, and wires none of it if the hook is
 * absent. So the thing worth asserting is the behaviour on the other side of
 * that gate: a throw reaches the hook instead of the process, one room's throw
 * does not end another room's match, and the line it logs is enough to find.
 *
 * The room is booted for real rather than mocked. Two things the matchmaker
 * normally supplies are stubbed and nothing else — the room's listing row, and
 * the internal state flag a room carries once `onCreate` has resolved — because
 * a room with a fake simulation behind it would prove nothing about a torn
 * world, which is the whole reason the two halves of the hook differ.
 *
 * Waiting is done by polling a condition with a hard cap, never by sleeping a
 * chosen number of milliseconds: what these tests assert is *what happened*,
 * and a timeout here is a failure rather than a slow pass.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Client } from '@colyseus/core';
import { CLIENT_MSG, MatchPhase } from '@echoes/shared';

import { MatchRoom } from '../src/rooms/MatchRoom.ts';

/** A client, as far as anything exercised here is concerned. */
interface FakeClient {
  sessionId: string;
  sent: { type: string; payload: unknown }[];
  send(type: string, payload: unknown): void;
}

const fakeClient = (sessionId: string): FakeClient => ({
  sessionId,
  sent: [],
  send(type: string, payload: unknown): void {
    this.sent.push({ type, payload });
  },
});

/**
 * The room's row in the matchmaker's cache.
 *
 * `lock()`, `setPrivate()` and `setMetadata()` all write to it, and `_dispose`
 * removes it, so a room cannot be booted without one.
 */
const stubListing = (): Record<string, unknown> => ({
  metadata: undefined,
  private: false,
  locked: false,
  save: async (): Promise<void> => {},
  remove: (): void => {},
  updateOne: async (): Promise<void> => {},
});

/** The private Colyseus internals these tests have to reach through. */
interface RoomInternals {
  listing: unknown;
  _internalState: number;
  _simulationInterval: NodeJS.Timeout | undefined;
  onMessageHandlers: Record<string, ((client: Client, payload: unknown) => void) | undefined>;
  /** The room's own simulation. Private, and the only way to tear a step. */
  match: { update: (deltaMs: number) => unknown; tick: number };
}

const internals = (room: MatchRoom): RoomInternals => room as unknown as RoomInternals;

/** Colyseus's `RoomInternalState.CREATED`. */
const CREATED = 1;
/** Colyseus's `RoomInternalState.DISPOSING`. */
const DISPOSING = 2;

/**
 * A booted room on the default map, with its simulation interval live.
 *
 * The patch rate is switched off: it serialises state to clients this room has
 * none of, and leaving it on would put a second timer in the test alongside the
 * one actually under test.
 */
async function bootRoom(): Promise<MatchRoom> {
  const room = new MatchRoom();
  internals(room).listing = stubListing();
  await room.onCreate({});
  // The matchmaker flips this once `onCreate` resolves, and `disconnect()`
  // refuses to run while a room still reads as CREATING. A room that never
  // left that state could not be ended by the hook under test.
  internals(room)._internalState = CREATED;
  room.setPatchRate(null);
  return room;
}

/** Deliver one message through the handler Colyseus actually registered. */
function deliver(room: MatchRoom, type: string, client: FakeClient, payload: unknown): void {
  const handler = internals(room).onMessageHandlers[type];
  assert.ok(handler !== undefined, `no handler registered for ${type}`);
  handler(client as unknown as Client, payload);
}

/** Seat two commanders and ready them both, so the room is Playing. */
function startPlaying(room: MatchRoom): FakeClient[] {
  const clients = [fakeClient('one'), fakeClient('two')];
  for (const client of clients) room.onJoin(client as unknown as Client);
  for (const client of clients) deliver(room, CLIENT_MSG.ready, client, { ready: true });
  assert.equal(room.state.phase, MatchPhase.Playing, 'the room should be playing');
  return clients;
}

/** Poll until `done()` holds. A timeout fails rather than passing slowly. */
async function until(done: () => boolean, what: string): Promise<void> {
  for (let waited = 0; waited < 2000; waited += 1) {
    if (done()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.fail(`timed out waiting for ${what}`);
}

/** Tear a room down through the path the server uses, without its log line. */
async function shutdown(room: MatchRoom): Promise<void> {
  const log = console.log;
  console.log = (): void => {};
  try {
    await room.disconnect();
  } finally {
    console.log = log;
  }
}

/**
 * Run `body` and return what the hook logged.
 *
 * `console.log` is swallowed as well as captured, because a room that ends
 * inside `body` runs `onDispose`, which prints its own budget line — true, and
 * not what any assertion here is about.
 */
async function capturingErrors(body: () => Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const error = console.error;
  const log = console.log;
  console.error = (...args: unknown[]): void => {
    lines.push(args.map(String).join(' '));
  };
  console.log = (): void => {};
  try {
    await body();
  } finally {
    console.error = error;
    console.log = log;
  }
  return lines;
}

describe('the containment gate', () => {
  it('defines the hook, which is what wraps all 32 handlers and the interval', async () => {
    const room = await bootRoom();
    try {
      // The gate itself. Colyseus reads this once, in its constructor, and
      // registers every wrapper only if it is defined — so its presence is
      // not a detail of this room, it is the feature.
      assert.equal(typeof room.onUncaughtException, 'function');

      // Every name the wire declares has a handler, and every handler is a
      // wrapper rather than the callback the room passed in. The wrappers are
      // `(...args) => { try { … } }`, so they declare no parameters, while
      // every handler in `MatchRoom` is written `(client, message)` or
      // `(client)`. A name that escaped the wrap would still have its own
      // arity, which is what this counts.
      const registered = internals(room).onMessageHandlers;
      const names = Object.values(CLIENT_MSG);
      assert.equal(names.length, 32);
      for (const name of names) {
        const handler = registered[name];
        assert.ok(handler !== undefined, `${name} has no handler`);
        assert.equal(handler.length, 0, `${name} is registered unwrapped`);
      }

      assert.notEqual(internals(room)._simulationInterval, undefined);
    } finally {
      await shutdown(room);
    }
  });
});

describe('a handler that throws', () => {
  it('ends the message, not the room, and the room keeps stepping', async () => {
    const room = await bootRoom();
    try {
      startPlaying(room);
      const client = fakeClient('one');

      // Registered after boot for the same reason the issue asks for it: no
      // handler in `MatchRoom` throws today, and the point is what happens to
      // the *next* one that does.
      room.onMessage('boom', () => {
        throw new Error('a handler went wrong');
      });

      const logged = await capturingErrors(async () => {
        deliver(room, 'boom', client, { unitIds: [1] });
      });

      assert.equal(logged.length, 1, 'the throw should have been logged once');
      assert.notEqual(internals(room)._internalState, DISPOSING);
      assert.notEqual(internals(room)._simulationInterval, undefined);

      // Still stepping, observed rather than assumed: the room's own tick has
      // to advance after the contained throw.
      const before = room.state.tick;
      await until(() => room.state.tick > before, 'the room to step after a contained throw');
      assert.equal(room.state.phase, MatchPhase.Playing);
    } finally {
      await shutdown(room);
    }
  });

  it('logs the room, the tick, the phase, the method and the message name', async () => {
    const room = await bootRoom();
    try {
      startPlaying(room);
      room.onMessage('boom', () => {
        throw new Error('a handler went wrong');
      });

      const logged = await capturingErrors(async () => {
        deliver(room, 'boom', fakeClient('one'), {});
      });

      const line = logged[0] ?? '';
      assert.match(line, new RegExp(`MatchRoom ${room.roomId}`));
      assert.match(line, /tick \d+/);
      assert.match(line, /phase Playing/);
      assert.match(line, /onMessage boom/);
      // The line says what became of the throw, not only that one happened.
      assert.match(line, /message dropped/);
      // The cause, not just the wrapper Colyseus built around it. Without it
      // the line says a throw happened and nothing about where.
      assert.match(line, /a handler went wrong/);
    } finally {
      await shutdown(room);
    }
  });

  it('is silent through a match that does not throw', async () => {
    const room = await bootRoom();
    try {
      startPlaying(room);
      const logged = await capturingErrors(async () => {
        const before = room.state.tick;
        await until(() => room.state.tick > before + 2, 'three clean steps');
      });
      assert.deepEqual(logged, []);
    } finally {
      await shutdown(room);
    }
  });
});

describe('a clock timer that throws', () => {
  it('is dropped, and the room survives it', async () => {
    const room = await bootRoom();
    try {
      startPlaying(room);

      // The room's own two `clock.setTimeout` calls are the post-match ones
      // that close a room nobody called a rematch in, so they only exist after
      // a result. This asserts the same wrapping the gate installs over them,
      // on a timer a test can actually reach. The clock is ticked by the live
      // simulation interval, so a zero delay fires on the next step.
      const logged = await capturingErrors(async () => {
        let fired = false;
        room.clock.setTimeout(() => {
          fired = true;
          throw new Error('the timer went wrong');
        }, 0);
        await until(() => fired, 'the clock timer to fire');
        // One more step, so a throw that escaped the wrapper would have taken
        // the interval with it by the time the assertions below run.
        const before = room.state.tick;
        await until(() => room.state.tick > before, 'the room to step after the timer threw');
      });

      assert.equal(logged.length, 1, 'the timer throw should have been logged once');
      assert.match(logged[0] ?? '', /setTimeout/);
      assert.match(logged[0] ?? '', /dropped/);
      assert.notEqual(internals(room)._internalState, DISPOSING);
      assert.equal(room.state.phase, MatchPhase.Playing);
    } finally {
      await shutdown(room);
    }
  });
});

describe('a simulation step that throws', () => {
  it('ends that room and leaves another room stepping', async () => {
    const [torn, bystander] = await Promise.all([bootRoom(), bootRoom()]);
    try {
      startPlaying(torn);
      startPlaying(bystander);

      // A step is the one place a throw cannot be dropped: it has already
      // half-mutated the world by the time it lands. Broken here rather than
      // at the room, because what the hook has to react to is `Match` failing
      // mid-step, not a room method missing.
      internals(torn).match.update = (): never => {
        throw new Error('the step tore');
      };

      const logged = await capturingErrors(async () => {
        await until(
          () => internals(torn)._internalState === DISPOSING,
          'the torn room to end itself'
        );
      });

      assert.equal(logged.length, 1, 'the torn step should have been logged once');
      assert.match(logged[0] ?? '', /setSimulationInterval/);
      assert.match(logged[0] ?? '', /ending this room/);
      // Stopped, and stopped *now*: a torn world must not be stepped again
      // while the disconnect settles.
      assert.equal(internals(torn)._simulationInterval, undefined);

      // The whole point. The other match is untouched and still running.
      assert.notEqual(internals(bystander)._internalState, DISPOSING);
      assert.equal(bystander.state.phase, MatchPhase.Playing);
      const before = bystander.state.tick;
      await until(() => bystander.state.tick > before, 'the bystander room to keep stepping');
    } finally {
      await shutdown(torn);
      await shutdown(bystander);
    }
  });
});
