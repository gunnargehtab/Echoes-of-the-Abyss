/**
 * `MatchRoom` — the server half of the wire contract, and what happens when
 * the code behind it throws.
 *
 * Nothing imported this class until now. The lobby *rules* were extracted into
 * `lobby.ts` and are tested there as pure functions, which was the right call
 * and is still the right call; what it left behind was the half of the room
 * that only exists because Colyseus is on the other side of it — how many
 * handlers are registered, and what the framework does around them.
 *
 * The second half turned out to matter. Colyseus gates its entire exception
 * wrapping on `onUncaughtException` merely existing on the room, and this room
 * did not define one. Every message handler, the 60 Hz step and both post-match
 * timers ran unwrapped, so the only thing catching a throw was Colyseus's
 * `registerGracefulShutdown` — `process.on('uncaughtException')`, which ends by
 * disposing every room on the box and exiting. One throw in one match ended
 * every concurrent match on the server.
 *
 * These tests are about containment, so several of them break the room on
 * purpose. Each says which fault it is standing in for.
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { CLIENT_MSG, MatchPhase, SIM } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { internalsOf, isDisposing, standUpRoom } from './support/matchRoom.ts';

/** Whatever the room wrote to stderr while `body` ran. */
async function captureErrors(body: () => void | Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const spy = mock.method(console, 'error', (...args: unknown[]) => {
    lines.push(args.map((arg) => String(arg)).join(' '));
  });
  try {
    await body();
  } finally {
    spy.mock.restore();
  }
  return lines;
}

/**
 * A match that cannot be stepped.
 *
 * Standing in for a step that threw part way through its own mutation — the
 * fault the containment rule is written for — without needing a real one, and
 * carrying a recognisable tick so the log line can be checked for it.
 */
const tornMatch = (tick: number): Match =>
  new Proxy({} as Match, {
    get: (_target, property) => {
      if (property === 'tick') return tick;
      // Every other member is a call that fails, so one stand-in covers the
      // step and all 32 orders without the test having to know which sim
      // method a given message reaches.
      return () => {
        throw new Error('torn world');
      };
    },
  });

/** Seat one commander and ready up, which at MIN_PLAYERS of 1 starts the match. */
async function playingRoom(seed?: number) {
  const harness = await standUpRoom(seed === undefined ? {} : { seed });
  const client = harness.join('commander');
  harness.deliver(client, CLIENT_MSG.ready, { ready: true });
  assert.equal(harness.room.state.phase, MatchPhase.Playing);
  return { harness, client };
}

describe('MatchRoom: the wire contract', () => {
  it('registers a handler for every message a client may send, and for nothing else', async () => {
    const { room } = await standUpRoom();
    const registered = Object.keys(internalsOf(room).onMessageHandlers).sort();
    // Both directions. A missing handler is #489's silent drop — the player
    // presses a key and the water stays quiet — and a handler under a name no
    // client can send is a message that will never arrive.
    assert.deepEqual(registered, [...Object.values(CLIENT_MSG)].sort());
    assert.equal(registered.length, 32);
  });

  it('defines the hook Colyseus gates its wrapping on', async () => {
    const { room } = await standUpRoom();
    // The one property that decides whether all 32 handlers, the simulation
    // interval and both clock timers are wrapped. It is read in the `Room`
    // constructor and never again.
    assert.equal(typeof room.onUncaughtException, 'function');
    // And the mark that it was read. Colyseus replaces the clock's own
    // `setTimeout` and `setInterval` with wrapping ones, per instance, from
    // that same constructor — so an own property here is the post-match
    // timers being covered, which is otherwise only visible twenty minutes
    // into a resolved match.
    assert.ok(Object.hasOwn(room.clock, 'setTimeout'));
    assert.ok(Object.hasOwn(room.clock, 'setInterval'));
  });
});

describe('MatchRoom: a message that throws', () => {
  it('ends the message, not the room', async () => {
    const { harness, client } = await playingRoom();
    const healthy = harness.match;

    const lines = await captureErrors(() => {
      // A real registered handler, reaching a sim call that throws: the shape
      // of every fault this branch is for. Restored immediately, because the
      // point of the test is the tick *after* the throw.
      internalsOf(harness.room).match = tornMatch(0);
      assert.doesNotThrow(() => harness.deliver(client, CLIENT_MSG.stop, { unitIds: [1] }));
      internalsOf(harness.room).match = healthy;
    });

    assert.equal(lines.length, 1);
    assert.match(lines[0], /onMessage 'stop'/);

    // Still a room, still a match, still stepping. One Echo tick's worth of
    // steps is enough for the room to publish a tick it did not have before.
    assert.equal(isDisposing(harness.room), false);
    assert.equal(harness.room.state.phase, MatchPhase.Playing);
    harness.steps(SIM.TICK_HZ);
    assert.ok(
      harness.room.state.tick > 0,
      `expected the room to keep stepping, saw tick ${harness.room.state.tick}`
    );
  });

  it('drops the message rather than ejecting the sender', async () => {
    const { harness, client } = await playingRoom();
    const healthy = harness.match;

    await captureErrors(() => {
      internalsOf(harness.room).match = tornMatch(0);
      harness.deliver(client, CLIENT_MSG.stop, { unitIds: [1] });
      internalsOf(harness.room).match = healthy;
    });

    // The seat survives. Ejecting would kick a legitimate player over a bug in
    // their build, and every other refusal in this room is a quiet drop.
    assert.equal(harness.room.clients.length, 1);
    assert.ok(harness.room.state.players.has(client.sessionId));
    // And the seat still commands: the next order is handled normally.
    assert.doesNotThrow(() => harness.deliver(client, CLIENT_MSG.stop, { unitIds: [1] }));
  });
});

describe('MatchRoom: a simulation step that throws', () => {
  it('ends that room and no other', async () => {
    const doomed = await playingRoom();
    const bystander = await playingRoom();

    await captureErrors(() => {
      internalsOf(doomed.harness.room).match = tornMatch(0);
      assert.doesNotThrow(() => doomed.harness.step());
    });

    // A torn world is worse to limp on than to stop: the state hash no longer
    // means anything, so the room ends.
    assert.equal(isDisposing(doomed.harness.room), true);
    // And the other match on the box is untouched, which is the whole point.
    assert.equal(isDisposing(bystander.harness.room), false);
    bystander.harness.steps(SIM.TICK_HZ);
    assert.ok(bystander.harness.room.state.tick > 0);
  });

  it('stops stepping the torn world instead of throwing again every 16 ms', async () => {
    const { harness } = await playingRoom();

    const lines = await captureErrors(() => {
      internalsOf(harness.room).match = tornMatch(0);
      // Ten more wall-clock ticks' worth. The interval was cleared, so the
      // room's own callback is all that is left to fire, and it must find
      // nothing to step.
      harness.steps(11);
    });

    // One throw, one line. Without clearing the interval this would be eleven.
    assert.equal(lines.length, 1);
    assert.equal(harness.stepping, false);
  });

  it('ends the room without announcing anything', async () => {
    const { harness, client } = await playingRoom();
    const before = client.sent.length;

    await captureErrors(() => {
      internalsOf(harness.room).match = tornMatch(0);
      harness.step();
    });

    // Deliberate, and settled: a message saying "this match ended because the
    // server threw" would be a twelfth SERVER_MSG and a new way a match can
    // end, which is a design change rather than a patch.
    assert.equal(client.sent.length, before);
  });
});

describe('MatchRoom: what the contained line says', () => {
  it('names the room, the tick, the phase and the method Colyseus passed', async () => {
    const { harness, client } = await playingRoom();
    const healthy = harness.match;

    const lines = await captureErrors(() => {
      internalsOf(harness.room).match = tornMatch(4242);
      harness.deliver(client, CLIENT_MSG.ping, { unitId: 1 });
      internalsOf(harness.room).match = healthy;
    });

    assert.equal(lines.length, 1);
    const line = lines[0];
    // Everything needed to find the throw from a server log alone: which room,
    // how far in, what it was doing, which entry point, and the original stack
    // — the wrapper's own stack points at Colyseus's catch, not at the throw.
    assert.match(line, new RegExp(`\\[MatchRoom ${harness.room.roomId}\\]`));
    assert.match(line, /tick 4242/);
    assert.match(line, /phase Playing/);
    assert.match(line, /onMessage 'ping'/);
    assert.match(line, /torn world/);
  });

  it('reports a room that never got a match, rather than throwing over the error', async () => {
    const lines = await captureErrors(async () => {
      // `onCreate` refuses an unknown mission, which is this room's own
      // behaviour and is rethrown to the matchmaker afterwards. The hook runs
      // first, on a room with no Match and no state — and a TypeError raised
      // in there would be the uncaught exception the hook exists to prevent.
      await assert.rejects(() => standUpRoom({ missionId: 'no-such-mission' }));
    });

    assert.equal(lines.length, 1);
    assert.match(lines[0], /onCreate/);
    assert.match(lines[0], /tick -1/);
    assert.match(lines[0], /phase uncreated/);
    assert.match(lines[0], /unknown mission: no-such-mission/);
  });
});

describe('MatchRoom: what the hook costs', () => {
  it('moves neither budget’s counted work', async () => {
    // The same seed, the same map, the same orders on the same steps: the only
    // difference between the arms is whether Colyseus wrapped the handlers and
    // the step. Both budgets are asserted on counted work rather than on a
    // stopwatch (sim/stepWork.ts), so "unchanged" here is an equality and not
    // a tolerance.
    const script = async (contained: boolean) => {
      const harness = await standUpRoom({ seed: 20260912, contained });
      const client = harness.join('commander');
      harness.deliver(client, CLIENT_MSG.ready, { ready: true });
      for (let i = 0; i < 300; i++) {
        if (i % 50 === 0) {
          harness.deliver(client, CLIENT_MSG.move, { unitIds: [1, 2], x: 900 + i, y: 700 });
        }
        harness.step();
      }
      return {
        work: harness.match.worstStepWork,
        walks: harness.match.contactPathWalksLastPass,
        tick: harness.room.state.tick,
      };
    };

    const wrapped = await script(true);
    const bare = await script(false);

    // A guard on the comparison itself: two arms that did no work would agree
    // about nothing in particular.
    assert.ok(wrapped.tick > 0);
    assert.equal(wrapped.tick, bare.tick);
    assert.deepEqual(wrapped.work, bare.work);
    assert.equal(wrapped.walks, bare.walks);
  });
});
