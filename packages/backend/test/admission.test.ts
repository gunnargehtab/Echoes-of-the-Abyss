/**
 * Which rooms are held, and the room's use of it (#1961).
 *
 * `RoomAdmission` is the ledger: a room is held while a socket holds a seat in
 * it, the process holds at most `MAX_LIVE_ROOMS`, and one address at most
 * `MAX_ROOMS_PER_ADDRESS`. The room half holds that `MatchRoom.onJoin` asks it
 * before anything builds a world, and gives each seat back where it releases
 * a player. `admissionLive.test.ts` holds the same through a real socket.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Client } from '@colyseus/core';
import { ADMISSION, CLIENT_MSG, MatchPhase } from '@echoes/shared';
import { RoomAdmission, roomAdmission } from '../src/rooms/admission.ts';
import type { MatchRoom } from '../src/rooms/MatchRoom.ts';
import {
  bootRoom,
  deliver,
  fakeClient,
  internals,
  shutdown,
  type FakeClient,
} from './support/room.ts';

describe('the room ledger', () => {
  it('holds a room from its first seat until its last is given back', () => {
    const ledger = new RoomAdmission(4, 4);
    assert.equal(ledger.admit('r', 'a', '203.0.113.1'), null);
    assert.equal(ledger.admit('r', 'b', '203.0.113.2'), null);
    assert.equal(ledger.liveRooms, 1);
    ledger.release('r', 'a');
    assert.equal(ledger.liveRooms, 1, 'one seat is still held');
    ledger.release('r', 'b');
    assert.equal(ledger.liveRooms, 0);
    assert.equal(ledger.roomsHeldBy('203.0.113.2'), 0);
  });

  it('refuses a room past the process ceiling, but not a seat in a held room', () => {
    const ledger = new RoomAdmission(2, 2);
    assert.equal(ledger.admit('r1', 'a', '203.0.113.1'), null);
    assert.equal(ledger.admit('r2', 'b', '203.0.113.2'), null);
    assert.match(ledger.admit('r3', 'c', '203.0.113.3') ?? '', /as many matches as it can/);
    assert.equal(ledger.liveRooms, 2, 'a refusal holds nothing');
    assert.equal(ledger.admit('r1', 'c', '203.0.113.3'), null, 'r1 is running already');
    ledger.releaseRoom('r2');
    assert.equal(ledger.admit('r3', 'c2', '203.0.113.3'), null, 'a disposed room frees its place');
  });

  it('refuses an address a third room, and counts a lobby behind one address once', () => {
    const ledger = new RoomAdmission(10, 2);
    const home = '203.0.113.9';
    assert.equal(ledger.admit('r1', 'a', home), null);
    assert.equal(ledger.admit('r1', 'b', home), null, 'a second friend in the same lobby');
    assert.equal(ledger.admit('r2', 'c', home), null);
    assert.equal(ledger.roomsHeldBy(home), 2);
    const refusal = ledger.admit('r3', 'd', home);
    assert.equal(
      refusal,
      `Your connection already has ${ADMISSION.MAX_ROOMS_PER_ADDRESS} matches running. ` +
        'Leave one to start another.'
    );
    assert.equal(ledger.admit('r2', 'e', home), null, 'a room it holds costs nothing new');
    assert.equal(ledger.admit('r3', 'f', '198.51.100.1'), null, 'another address is not bound');
    // Joining a room another address holds is a new room for this one.
    assert.match(ledger.admit('r3', 'g', home) ?? '', /already has/);
  });

  it('gives back a seat it never held without error', () => {
    const ledger = new RoomAdmission(1, 1);
    ledger.release('nowhere', 'nobody');
    ledger.releaseRoom('nowhere');
    assert.equal(ledger.liveRooms, 0);
  });
});

/** A client as `onAuth` leaves it: the address in `client.auth`. */
const seatFrom = (sessionId: string, address: string) =>
  Object.assign(fakeClient(sessionId), { auth: { address } }) as unknown as Client;

/**
 * Boot a room, run `body`, and tear the room down however `body` ended: a
 * failed assertion must fail the test, not leave a live room holding the
 * runner open.
 */
async function withRoom(body: (room: MatchRoom) => void | Promise<void>): Promise<void> {
  const room = await bootRoom();
  try {
    await body(room);
  } finally {
    await shutdown(room);
  }
}

describe('a room asking the ledger', () => {
  it('names the address from the context Colyseus built', async () => {
    await withRoom((room) => {
      const client = fakeClient('auth') as unknown as Client;
      const context = { ip: '203.0.113.40', headers: new Headers() };
      assert.deepEqual(room.onAuth(client, {}, context), { address: '203.0.113.40' });
      const bare = { ip: undefined, headers: new Headers() };
      assert.deepEqual(room.onAuth(client, {}, bare), { address: 'unknown' });
    });
  });

  it('refuses an address at its cap before the seat or the world', async () => {
    const full = '203.0.113.50';
    for (let i = 0; i < ADMISSION.MAX_ROOMS_PER_ADDRESS; i += 1) {
      assert.equal(roomAdmission.admit(`elsewhere-${i}`, `s${i}`, full), null);
    }
    try {
      await withRoom((room) => {
        assert.throws(() => room.onJoin(seatFrom('late', full)), /already has/);
        assert.equal(room.state.players.size, 0, 'no seat was taken');
        assert.equal(room.seed, null, 'no world was built for a refused join');
      });
    } finally {
      for (let i = 0; i < ADMISSION.MAX_ROOMS_PER_ADDRESS; i += 1) {
        roomAdmission.releaseRoom(`elsewhere-${i}`);
      }
    }
  });

  it('gives a seat back when the lobby releases the player, and all on dispose', async () => {
    const leaver = '203.0.113.60';
    const stayer = '203.0.113.61';
    await withRoom((room) => {
      const first = seatFrom('first', leaver);
      room.onJoin(first);
      room.onJoin(seatFrom('second', stayer));
      assert.equal(roomAdmission.roomsHeldBy(leaver), 1);
      // A drop in the lobby frees the seat, and with it the leaver's hold.
      room.onDrop(first);
      assert.equal(roomAdmission.roomsHeldBy(leaver), 0, 'a released seat holds nothing');
      assert.equal(roomAdmission.roomsHeldBy(stayer), 1, 'the other seat still holds the room');
    });
    assert.equal(roomAdmission.roomsHeldBy(stayer), 0, 'a disposed room holds nothing');
  });

  it('keeps a hold through a mid-match drop, and gives it back on a forfeit', async () => {
    const dropper = '203.0.113.62';
    const resigner = '203.0.113.63';
    await withRoom((room) => {
      const dropped = seatFrom('dropped', dropper);
      const resigning = seatFrom('resigning', resigner);
      for (const client of [dropped, resigning]) room.onJoin(client);
      for (const client of [dropped, resigning]) {
        deliver(room, CLIENT_MSG.ready, client as unknown as FakeClient, { ready: true });
      }
      assert.equal(room.state.phase, MatchPhase.Playing, 'the premise: the match is running');
      // The fleet is still in the water through the reconnect grace.
      room.onDrop(dropped);
      // The grace's real timer would hold the runner open past the test.
      for (const timer of Object.values(internals(room)._reservedSeatTimeouts)) clearTimeout(timer);
      assert.equal(roomAdmission.roomsHeldBy(dropper), 1, 'a dropped seat holds through its grace');
      // A consented leave mid-match forfeits, and the room runs on without it.
      room.onLeave(resigning);
      assert.equal(roomAdmission.roomsHeldBy(resigner), 0, 'a forfeited seat holds nothing');
      assert.equal(roomAdmission.roomsHeldBy(dropper), 1, 'the room is still held');
    });
  });
});
