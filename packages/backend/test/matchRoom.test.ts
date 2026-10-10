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
import { ClientState, CloseCode, type Client } from '@colyseus/core';
import { CLIENT_MSG, MatchPhase, SIM } from '@echoes/shared';

// The boot and delivery harness, shared with `wireValidation.test.ts` since
// #628 rather than written out twice — see the head of that file.
import {
  DISPOSING,
  bootRoom,
  deliver,
  fakeClient,
  internals,
  shutdown,
  startPlaying,
  until,
} from './support/room.ts';

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

/**
 * Run `body` with a listener for unhandled rejections, and return them.
 *
 * node:test already fails a test on an unhandled rejection it caused; the
 * listener and the assertions on what it returns state that intent outright.
 */
async function recordingUnhandled(body: () => Promise<void>): Promise<unknown[]> {
  const unhandled: unknown[] = [];
  const record = (reason: unknown): void => {
    unhandled.push(reason);
  };
  process.on('unhandledRejection', record);
  try {
    await body();
    // A rejection is reported once the microtask queue has drained.
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.off('unhandledRejection', record);
  }
  return unhandled;
}

describe('the containment gate', () => {
  it('defines the hook, which is what wraps all 31 handlers and the interval', async () => {
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
      const registered = internals(room).onMessageEvents.events;
      const names = Object.values(CLIENT_MSG);
      assert.equal(names.length, 31);
      for (const name of names) {
        const handler = registered[name]?.[0];
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
      assert.match(logged[0] ?? '', /setTimestep/);
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

describe('a client that drops before its join completes', () => {
  /**
   * #1218. Colyseus refuses to hold a seat for a client that never acknowledged
   * its join, and says so with a promise that is already rejected. A rejection
   * nobody handles reaches the process's `uncaughtException` hook, which ends
   * every room on the box, so the drop must leave none behind.
   */
  it('leaves no unhandled rejection for the process to die of', async () => {
    const room = await bootRoom();
    try {
      const unhandled = await recordingUnhandled(async () => {
        const [joining] = startPlaying(room);
        // How Colyseus marks a client whose JOIN_ROOM it has not had
        // acknowledged: the queue it holds that client's early messages in.
        Object.assign(joining!, { _enqueuedMessages: [] });
        room.onDrop(joining as unknown as Client);
      });
      assert.deepEqual(unhandled, []);
    } finally {
      await shutdown(room);
    }
  });
});

describe('a leave that throws', () => {
  /**
   * #1244. After a drop's grace runs out, Colyseus calls `onLeave` from
   * `#_onAfterLeave`, outside `_onLeave`'s try/catch and in a promise nobody
   * awaits, and the #627 wrapper re-raises for `onLeave`. So a throw there was
   * an unhandled rejection, and the process's `uncaughtException` hook ends
   * every room on the box. Driven through Colyseus's own leave path, since the
   * fault is in how that path calls the room, not in the room alone.
   */
  it('mid-match, after a drop, ends that room and frees the seat', async () => {
    const room = await bootRoom();
    try {
      const [leaving] = startPlaying(room);
      // A mid-match leave does its work in `resign`, a world mutation, so the
      // throw is put where it would tear the world.
      internals(room).match.resign = (): never => {
        throw new Error('the resignation tore');
      };
      // The seat as Colyseus holds it: in the client list, with a token the
      // grace window is filed under.
      const client = Object.assign(leaving!, {
        reconnectionToken: 'token-one',
        state: ClientState.JOINED,
      }) as unknown as Client;
      room.clients.push(client);

      let logged: string[] = [];
      const unhandled = await recordingUnhandled(async () => {
        logged = await capturingErrors(async () => {
          // A drop, not a consented leave: Colyseus routes it to `onDrop`,
          // which holds the seat open for the grace window.
          await internals(room)._onLeave(client, CloseCode.ABNORMAL_CLOSURE);
          const grace = internals(room)._reconnections['token-one'];
          assert.ok(grace !== undefined, 'the premise: the drop opened a grace window');
          // The window running out, without waiting the 90 s for it.
          clearTimeout(internals(room)._reservedSeatTimeouts[client.sessionId]);
          grace[1].reject(false);
          await until(
            () => internals(room)._internalState === DISPOSING,
            'the room to end after the leave threw'
          );
        });
      });

      assert.deepEqual(unhandled, []);
      assert.equal(room.state.players.has(client.sessionId), false, 'the seat was not freed');
      assert.equal(internals(room)._simulationInterval, undefined);
      assert.equal(logged.length, 1, 'the throw should have been logged once');
      assert.match(logged[0] ?? '', /onLeave/);
      assert.match(logged[0] ?? '', /seat released, ending this room/);
      assert.match(logged[0] ?? '', /the resignation tore/);
    } finally {
      await shutdown(room);
    }
  });

  it('after a result, frees the seat and keeps the room', async () => {
    const room = await bootRoom();
    try {
      const [leaving] = startPlaying(room);
      // A result, as `endMatch` leaves the room. A leave now releases the seat
      // and asks whether everyone left is ready, and that is where it throws:
      // nothing in the world is half-changed, so the room has no reason to end.
      room.state.phase = MatchPhase.Ended;
      Object.assign(room, {
        startIfEveryoneIsReady: (): never => {
          throw new Error('the rematch check went wrong');
        },
      });

      const logged = await capturingErrors(async () => {
        assert.doesNotThrow(() => room.onLeave(leaving as unknown as Client));
      });

      assert.equal(room.state.players.has(leaving!.sessionId), false, 'the seat was not freed');
      assert.notEqual(internals(room)._internalState, DISPOSING);
      assert.equal(logged.length, 1, 'the throw should have been logged once');
      assert.match(logged[0] ?? '', /onLeave/);
      assert.match(logged[0] ?? '', /phase Ended/);
      assert.match(logged[0] ?? '', /seat released:/);
    } finally {
      await shutdown(room);
    }
  });
});

describe('a lock the matchmaker refuses', () => {
  /**
   * #1244. `LocalDriver` cannot reject the listing write `lock()` makes, and a
   * networked driver can. The room's own flag is set before that write, so a
   * refusal costs nothing but the rejection, which must not reach the process.
   */
  it('leaves no unhandled rejection, and the match starts', async () => {
    const room = await bootRoom();
    try {
      Object.assign(room, {
        lock: (): Promise<void> => Promise.reject(new Error('the driver refused')),
      });
      const unhandled = await recordingUnhandled(async () => {
        startPlaying(room);
      });
      assert.deepEqual(unhandled, []);
      assert.equal(room.state.phase, MatchPhase.Playing);
    } finally {
      await shutdown(room);
    }
  });
});

describe('a room giving its world back', () => {
  /**
   * #1278. bitecs holds every world in a module-global list and takes an id
   * back only from a removed entity, so a room that merely dropped its match
   * kept the world and spent its ids for good. A disposed match steps no
   * further, and one the room only dropped still would, which is what this
   * reads: a live one hands back a snapshot within two Echo periods of ticks.
   */
  it('disposes the old match before a rematch, and the last when the room ends', async () => {
    const steps = (match: { update: (deltaMs: number) => unknown }): boolean => {
      for (let tick = 0; tick < 2 * (SIM.TICK_HZ / SIM.ECHO_HZ); tick++) {
        if (match.update(1000 / SIM.TICK_HZ) !== null) return true;
      }
      return false;
    };
    const room = await bootRoom();
    let ended = false;
    try {
      const clients = startPlaying(room);
      const first = internals(room).match;
      // A result, as `endMatch` leaves the room: Ended, and nobody ready.
      room.state.phase = MatchPhase.Ended;
      for (const player of room.state.players.values()) player.ready = false;
      for (const client of clients) deliver(room, CLIENT_MSG.ready, client, { ready: true });
      const second = internals(room).match;
      assert.notEqual(second, first, 'the rematch should build a new world');
      assert.equal(steps(first), false, 'the rematch left the first world standing');

      assert.ok(steps(second), 'the premise: the rematch is live');
      await shutdown(room);
      ended = true;
      assert.equal(steps(second), false, 'the ended room left its world standing');
    } finally {
      if (!ended) await shutdown(room);
    }
  });
});
