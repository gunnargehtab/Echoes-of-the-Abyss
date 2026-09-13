/**
 * Booting a real `MatchRoom` in a test, and delivering a message to it.
 *
 * Extracted from `matchRoom.test.ts` when #628 gave a second test a reason to
 * boot the same room. It is here rather than duplicated because a harness that
 * exists twice drifts: the two copies of `bootRoom` would diverge the first
 * time Colyseus changed what a room needs from its matchmaker, and the test
 * that was not being edited that day would be the one that started lying.
 *
 * `test/support/` is deliberately outside the `test/*.test.ts` glob the test
 * script and CI's `--test-shard` both use, so nothing here is collected as a
 * suite of its own.
 *
 * The room is booted for real. Two things the matchmaker normally supplies are
 * stubbed and nothing else — the room's listing row, and the internal state
 * flag a room carries once `onCreate` has resolved.
 */

import assert from 'node:assert/strict';
import type { Client } from '@colyseus/core';
import { CLIENT_MSG, MatchPhase } from '@echoes/shared';

import { MatchRoom } from '../../src/rooms/MatchRoom.ts';

/** A client, as far as anything exercised here is concerned. */
export interface FakeClient {
  sessionId: string;
  sent: { type: string; payload: unknown }[];
  send(type: string, payload: unknown): void;
}

export const fakeClient = (sessionId: string): FakeClient => ({
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
export const stubListing = (): Record<string, unknown> => ({
  metadata: undefined,
  private: false,
  locked: false,
  save: async (): Promise<void> => {},
  remove: (): void => {},
  updateOne: async (): Promise<void> => {},
});

/** The private Colyseus internals these tests have to reach through. */
export interface RoomInternals {
  listing: unknown;
  _internalState: number;
  _simulationInterval: NodeJS.Timeout | undefined;
  onMessageHandlers: Record<string, ((client: Client, payload: unknown) => void) | undefined>;
  /** The room's own simulation. Private, and the only way to tear a step. */
  match: { update: (deltaMs: number) => unknown; tick: number };
}

export const internals = (room: MatchRoom): RoomInternals => room as unknown as RoomInternals;

/** Colyseus's `RoomInternalState.CREATED`. */
export const CREATED = 1;
/** Colyseus's `RoomInternalState.DISPOSING`. */
export const DISPOSING = 2;

/**
 * A booted room on the default map, with its simulation interval live.
 *
 * The patch rate is switched off: it serialises state to clients this room has
 * none of, and leaving it on would put a second timer in the test alongside the
 * one actually under test.
 */
export async function bootRoom(): Promise<MatchRoom> {
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
export function deliver(room: MatchRoom, type: string, client: FakeClient, payload: unknown): void {
  const handler = internals(room).onMessageHandlers[type];
  assert.ok(handler !== undefined, `no handler registered for ${type}`);
  handler(client as unknown as Client, payload);
}

/** Seat two commanders and ready them both, so the room is Playing. */
export function startPlaying(room: MatchRoom): FakeClient[] {
  const clients = [fakeClient('one'), fakeClient('two')];
  for (const client of clients) room.onJoin(client as unknown as Client);
  for (const client of clients) deliver(room, CLIENT_MSG.ready, client, { ready: true });
  assert.equal(room.state.phase, MatchPhase.Playing, 'the room should be playing');
  return clients;
}

/** Poll until `done()` holds. A timeout fails rather than passing slowly. */
export async function until(done: () => boolean, what: string): Promise<void> {
  for (let waited = 0; waited < 2000; waited += 1) {
    if (done()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.fail(`timed out waiting for ${what}`);
}

/** Tear a room down through the path the server uses, without its log line. */
export async function shutdown(room: MatchRoom): Promise<void> {
  const log = console.log;
  console.log = (): void => {};
  try {
    await room.disconnect();
  } finally {
    console.log = log;
  }
}
