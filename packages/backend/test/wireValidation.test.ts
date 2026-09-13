/**
 * The one gate every client message now passes through — #628.
 *
 * `MatchRoom.onClientMessage` reads the shape declared beside the payload in
 * `wire.ts` and refuses anything that fails it, so the thirty-nine
 * `Number.isFinite` and `Array.isArray` lines the handlers used to carry are
 * gone. `wireShapes.test.ts` in `@echoes/shared` holds the table and the
 * validator; what is left for this file is the half that is a property of the
 * *room*: that the refusal actually happens, that it happens for every message
 * rather than for the ones somebody remembered, and that nothing malformed
 * reaches the simulation behind it.
 *
 * So the assertions are counted calls into `Match`, not inspections of world
 * state. A test that checked a hull had not moved would pass just as well if
 * the order had been applied and then ignored; what the gate promises is that
 * the sim is never asked at all. `Match` is replaced by a recording proxy for
 * exactly that reason — it is the narrowest thing that can tell "refused" from
 * "applied and made no difference" apart.
 *
 * The room is booted for real, through the harness in `support/room.ts`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_MSG, LOBBY_MSG, WIRE } from '@echoes/shared';
import type { MatchRoom } from '../src/rooms/MatchRoom.ts';

import { bootRoom, deliver, shutdown, startPlaying, type FakeClient } from './support/room.ts';

/** The private fields these tests reach through, as `matchRoom.test.ts` does. */
interface RoomGuts {
  match: Record<string, unknown>;
  messageBudget: Map<string, { windowStartMs: number; count: number }>;
}

const guts = (room: MatchRoom): RoomGuts => room as unknown as RoomGuts;

/**
 * Replace the room's simulation with one that records what is asked of it.
 *
 * A proxy rather than a stub, so the real `Match` still runs underneath and
 * the room behaves normally — including its 60 Hz interval, which calls
 * `update` and would otherwise be indistinguishable from an order arriving.
 */
function recordCalls(room: MatchRoom): string[] {
  const calls: string[] = [];
  const real = guts(room).match;
  guts(room).match = new Proxy(real, {
    get(target, property, receiver): unknown {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function' || typeof property !== 'string') return value;
      // `update` is the simulation interval, not an order, and it fires on its
      // own clock throughout every test in this file.
      return (...args: unknown[]): unknown => {
        if (property !== 'update') calls.push(property);
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  }) as unknown as Record<string, unknown>;
  return calls;
}

/** One malformed payload per in-match message, each wrong in its own way. */
const MALFORMED: Record<string, unknown> = {
  move: { unitIds: [1], x: Number.NaN, y: 0 },
  attackMove: { unitIds: [1], x: 0, y: Infinity },
  stop: { unitIds: 'all' },
  hold: { unitIds: [1] },
  rally: { structureIds: [1], x: 0 },
  embark: { unitIds: [1], carrierId: '2' },
  disembark: { unitIds: { length: 1 } },
  attack: { unitIds: [1], contactId: null },
  depth: { unitIds: [1], depth: Number.NaN },
  followFloor: { unitIds: [1], active: 1 },
  silent: { unitIds: [1], active: 'on' },
  engineOff: { unitIds: [1] },
  ping: { unitId: 'three' },
  ability: 'now',
  torpedo: { unitIds: [1], contactId: Infinity },
  noisemaker: { unitIds: [Number.NaN] },
  layDecoy: { unitId: null },
  seedSpore: { unitId: 1, contactHandle: 'x' },
  sow: { unitIds: [1, '2'] },
  sing: {},
  mine: { unitIds: 4 },
  depthcharge: { unitIds: [1], depth: '300' },
  harvest: { unitIds: [1], nodeId: Number.NaN },
  throttle: { unitIds: [1], throttle: 'full' },
  build: { kind: 0, x: 0, y: Number.NaN },
  produce: { structureId: 1, kind: Infinity },
  refit: { structureId: '1', kind: 0 },
};

/** A payload that should be applied, for the messages a well-formed one is easy to give. */
const WELL_FORMED: Record<string, unknown> = {
  move: { unitIds: [1], x: 100, y: 100 },
  stop: { unitIds: [1] },
  ping: { unitId: 1 },
  depth: { unitIds: [1], depth: 300 },
  silent: { unitIds: [1], active: true },
};

const inMatchNames = Object.entries(CLIENT_MSG)
  .filter(([key]) => !(LOBBY_MSG as readonly string[]).includes(key))
  .map(([, wire]) => wire);

describe('the room refuses a malformed payload before the simulation sees it', () => {
  it('covers every in-match message, not the ones somebody remembered', async () => {
    // The point of the loop. Before #628 this was twenty-seven independent
    // decisions by twenty-seven authors, and #609 is what that cost; the whole
    // claim of the change is that it is now one decision, so the test that
    // holds it has to be one assertion over all twenty-seven.
    assert.equal(inMatchNames.length, 27, 'the orders a seated commander may send');
    const room = await bootRoom();
    try {
      const [client] = startPlaying(room);
      const calls = recordCalls(room);
      for (const name of inMatchNames) {
        const before = calls.length;
        deliver(room, name, client as FakeClient, MALFORMED[name]);
        assert.equal(calls.length, before, `${name} reached the simulation malformed`);
      }
    } finally {
      await shutdown(room);
    }
  });

  it('still applies the same messages when they are well formed', async () => {
    // Without this the test above passes on a room that refuses everything,
    // which is the failure mode a validator has.
    const room = await bootRoom();
    try {
      const [client] = startPlaying(room);
      const calls = recordCalls(room);
      for (const [name, payload] of Object.entries(WELL_FORMED)) {
        const before = calls.length;
        deliver(room, name, client as FakeClient, payload);
        assert.ok(calls.length > before, `${name} was refused when it should not have been`);
      }
    } finally {
      await shutdown(room);
    }
  });

  it('reads a missing payload as the empty one, so a no-field message still works', async () => {
    // `ability` carries nothing, and a client that sends nothing at all is
    // sending exactly that. The validator refuses `undefined` itself — see
    // `wireShapes.test.ts` — so this asserts the room's normalisation, which
    // is the only reason the two can differ.
    const room = await bootRoom();
    try {
      const [client] = startPlaying(room);
      const calls = recordCalls(room);
      deliver(room, CLIENT_MSG.ability, client as FakeClient, undefined);
      assert.deepEqual(calls, ['commanderAbility']);
    } finally {
      await shutdown(room);
    }
  });
});

describe('the declared bounds', () => {
  it('refuses an over-long id array whole, and applies one at the limit', async () => {
    // The property that used to scale with what a client chose to send: every
    // `unitIds` handler loops the array synchronously on the thread that runs
    // the 60 Hz step. The assertion is the *count* of calls rather than a
    // boolean, because "refused whole" and "truncated" both look like a
    // refusal from the outside if you only ask whether anything happened.
    const room = await bootRoom();
    try {
      const [client] = startPlaying(room);
      const calls = recordCalls(room);
      const atTheLimit = Array.from({ length: WIRE.MAX_IDS }, (_, i) => i + 1);

      deliver(room, CLIENT_MSG.stop, client as FakeClient, { unitIds: [...atTheLimit, 1] });
      assert.equal(calls.length, 0, 'an over-long order was partly applied');

      deliver(room, CLIENT_MSG.stop, client as FakeClient, { unitIds: atTheLimit });
      assert.equal(calls.length, WIRE.MAX_IDS, 'an order at the limit is applied in full');
    } finally {
      await shutdown(room);
    }
  });

  it('spends a per-client budget, and spends it on malformed messages too', async () => {
    // A budget that only counted well-formed messages would bound nothing —
    // the cheapest flood to write is the malformed one. So the flood here is
    // deliberately garbage, and the assertion is that it still runs out.
    const room = await bootRoom();
    try {
      const [client] = startPlaying(room);
      const calls = recordCalls(room);
      for (let sent = 0; sent < WIRE.MAX_MESSAGES_PER_WINDOW; sent += 1) {
        deliver(room, CLIENT_MSG.ping, client as FakeClient, { unitId: 'nonsense' });
      }
      assert.equal(calls.length, 0, 'nothing malformed was applied');

      // The budget is spent, so a well-formed order is now refused too.
      deliver(room, CLIENT_MSG.ping, client as FakeClient, { unitId: 1 });
      assert.equal(calls.length, 0, 'the budget did not bind');

      // And it comes back. The window is wall clock, so it is moved rather
      // than waited out: a test that slept a second to watch a counter reset
      // would be asserting the clock.
      const spent = guts(room).messageBudget.get(client.sessionId);
      assert.ok(spent !== undefined, 'the client has a budget entry');
      spent.windowStartMs -= WIRE.BUDGET_WINDOW_MS;
      deliver(room, CLIENT_MSG.ping, client as FakeClient, { unitId: 1 });
      assert.equal(calls.length, 1, 'the window did not reopen');
    } finally {
      await shutdown(room);
    }
  });

  it('budgets each client separately', async () => {
    // Otherwise one player's noise is a denial of service on the other three,
    // which would be a worse bug than the one being fixed.
    const room = await bootRoom();
    try {
      const [one, two] = startPlaying(room);
      const calls = recordCalls(room);
      for (let sent = 0; sent <= WIRE.MAX_MESSAGES_PER_WINDOW; sent += 1) {
        deliver(room, CLIENT_MSG.ping, one as FakeClient, { unitId: 'nonsense' });
      }
      deliver(room, CLIENT_MSG.ping, two as FakeClient, { unitId: 1 });
      assert.equal(calls.length, 1, "one client's flood spent another client's budget");
    } finally {
      await shutdown(room);
    }
  });

  it('forgets a client that leaves', async () => {
    // The map is keyed by session and a room can outlive many of them. An
    // entry per client it has ever seen is a slow leak in a long-running
    // process, which is what a match server is.
    const room = await bootRoom();
    try {
      const [one, two] = startPlaying(room);
      deliver(room, CLIENT_MSG.ping, one as FakeClient, { unitId: 1 });
      // Both clients already have an entry: `startPlaying` readies each of
      // them, and a `ready` is a message like any other.
      assert.equal(guts(room).messageBudget.size, 2);
      await room.onLeave(one as unknown as Parameters<MatchRoom['onLeave']>[0], true);
      assert.equal(guts(room).messageBudget.has(one.sessionId), false, 'the entry outlived them');
      assert.equal(
        guts(room).messageBudget.has(two.sessionId),
        true,
        'and took a stranger with it'
      );
    } finally {
      await shutdown(room);
    }
  });
});
