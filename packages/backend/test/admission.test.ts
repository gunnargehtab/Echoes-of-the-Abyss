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
import { ADMISSION } from '@echoes/shared';
import { RoomAdmission, roomAdmission } from '../src/rooms/admission.ts';
import { bootRoom, fakeClient, shutdown } from './support/room.ts';

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

describe('a room asking the ledger', () => {
  it('names the address from the context Colyseus built', async () => {
    const room = await bootRoom();
    const client = fakeClient('auth') as unknown as Client;
    const context = { ip: '203.0.113.40', headers: new Headers() };
    assert.deepEqual(room.onAuth(client, {}, context), { address: '203.0.113.40' });
    const bare = { ip: undefined, headers: new Headers() };
    assert.deepEqual(room.onAuth(client, {}, bare), { address: 'unknown' });
    await shutdown(room);
  });

  it('refuses an address at its cap before the seat or the world', async () => {
    const full = '203.0.113.50';
    for (let i = 0; i < ADMISSION.MAX_ROOMS_PER_ADDRESS; i += 1) {
      assert.equal(roomAdmission.admit(`elsewhere-${i}`, `s${i}`, full), null);
    }
    const room = await bootRoom();
    assert.throws(() => room.onJoin(seatFrom('late', full)), /already has/);
    assert.equal(room.state.players.size, 0, 'no seat was taken');
    assert.equal(room.seed, null, 'no world was built for a refused join');
    for (let i = 0; i < ADMISSION.MAX_ROOMS_PER_ADDRESS; i += 1) {
      roomAdmission.releaseRoom(`elsewhere-${i}`);
    }
    await shutdown(room);
  });

  it('gives a seat back when the room releases the player, and all on dispose', async () => {
    const from = '203.0.113.60';
    const room = await bootRoom();
    const first = seatFrom('first', from);
    room.onJoin(first);
    room.onJoin(seatFrom('second', from));
    assert.equal(roomAdmission.roomsHeldBy(from), 1, 'two seats, one room');
    // A drop in the lobby releases the seat.
    room.onDrop(first);
    assert.equal(roomAdmission.roomsHeldBy(from), 1, 'the second seat still holds it');
    await shutdown(room);
    assert.equal(roomAdmission.roomsHeldBy(from), 0, 'a disposed room holds nothing');
  });
});
