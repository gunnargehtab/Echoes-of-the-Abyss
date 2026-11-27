/**
 * The room and socket caps, on the live server, as a script meets them (#1961).
 *
 * `admission.test.ts` holds the ledger's rules; this holds that a real socket
 * is held to them. A room is made over HTTP and joined over a raw WebSocket
 * upgrade, as the SDK does, from an address each test names in
 * `X-Forwarded-For`: the server is booted on loopback, which is a trusted
 * proxy, as `matchmakingLive.test.ts` says. A socket that never answers a ping
 * is closed by the transport after a few seconds, so every check here runs
 * well inside that.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { request } from 'node:http';
import type { Socket } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { ADMISSION } from '@echoes/shared';
import { until } from './support/room.ts';

type MatchServer = typeof import('../src/index.ts').server;

const ALLOWED = 'https://play.example.com';

let server: MatchServer;
let port: number;
const opened: Socket[] = [];

interface Reservation {
  sessionId: string;
  roomId: string;
  processId: string;
}

/** Make a private room from `from`, and reserve its first seat. */
async function create(from: string): Promise<Reservation> {
  const response = await fetch(`http://127.0.0.1:${port}/matchmake/create/match`, {
    method: 'POST',
    headers: { Origin: ALLOWED, 'X-Forwarded-For': from, 'Content-Type': 'application/json' },
    body: JSON.stringify({ private: true }),
  });
  assert.equal(response.status, 200);
  const seat = (await response.json()) as {
    sessionId: string;
    roomId: string;
    processId: string;
  };
  return { sessionId: seat.sessionId, roomId: seat.roomId, processId: seat.processId };
}

/**
 * A WebSocket upgrade, by hand: the status it was answered with, and the
 * socket when it was 101. `headers` adds to the upgrade's own.
 */
function upgrade(
  path: string,
  headers: Record<string, string>
): Promise<{ status: number; socket?: Socket; heard?: () => string }> {
  return new Promise((resolve, reject) => {
    const req = request({
      host: '127.0.0.1',
      port,
      path,
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
        ...headers,
      },
    });
    req.on('upgrade', (res, socket, head) => {
      opened.push(socket);
      // Read from the first byte: a room that refuses at once can have spoken
      // before the caller attaches anything.
      let heard = head.toString('latin1');
      socket.on('data', (chunk: Buffer) => (heard += chunk.toString('latin1')));
      resolve({ status: res.statusCode ?? 0, socket, heard: () => heard });
    });
    req.on('response', (res) => {
      res.resume();
      resolve({ status: res.statusCode ?? 0 });
    });
    req.on('error', reject);
    req.end();
  });
}

/** Take the seat `seat` reserved, from `from`. */
const join = (seat: Reservation, from: string, extra: Record<string, string> = {}) =>
  upgrade(`/${seat.processId}/${seat.roomId}?sessionId=${seat.sessionId}`, {
    'X-Forwarded-For': from,
    ...extra,
  });

const colyseus = () => import('@colyseus/core');
const ledger = async () => (await import('../src/rooms/admission.ts')).roomAdmission;

/** The room's world, read without building it. */
async function seedOf(roomId: string): Promise<number | null | undefined> {
  const { MatchRoom } = await import('../src/rooms/MatchRoom.ts');
  const room = (await colyseus()).matchMaker.getLocalRoomById(roomId);
  return room instanceof MatchRoom ? room.seed : undefined;
}

describe('the room and socket caps, as a script meets them', () => {
  before(async () => {
    const previous = { PORT: process.env.PORT, CORS_ORIGIN: process.env.CORS_ORIGIN };
    process.env.PORT = '0';
    process.env.CORS_ORIGIN = ALLOWED;
    try {
      server = (await import('../src/index.ts')).server;
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
    const address = server.transport.server?.address();
    assert.ok(address !== undefined && address !== null && typeof address === 'object');
    port = address.port;
  });

  after(async () => {
    for (const socket of opened) socket.destroy();
    const log = console.log;
    console.log = (): void => {};
    try {
      await server.gracefullyShutdown(false);
    } finally {
      console.log = log;
    }
  });

  it('holds an address to its rooms, and builds no world for the one refused', async () => {
    const from = '203.0.113.21';
    const rooms = await ledger();
    for (let held = 1; held <= ADMISSION.MAX_ROOMS_PER_ADDRESS; held += 1) {
      const seat = await create(from);
      assert.equal((await join(seat, from)).status, 101);
      await until(() => rooms.roomsHeldBy(from) === held, `room ${held} held`);
      assert.notEqual(await seedOf(seat.roomId), null, 'a seated room built its world');
    }
    const refused = await create(from);
    // A refused room empties, so Colyseus disposes it before its seed could
    // be read; `onDispose` logs a line only for a room that built a world.
    const lines: string[] = [];
    const log = console.log;
    console.log = (...args: unknown[]): void => void lines.push(args.join(' '));
    const { status, socket, heard } = await join(refused, from);
    assert.equal(status, 101, 'the handshake itself is allowed');
    // The room refuses in `onJoin`: its seat is never taken, and Colyseus
    // sends the room's sentence and closes the socket.
    if (!socket!.closed) await new Promise((resolve) => socket!.once('close', resolve));
    assert.match(heard!(), /already has \d matches running/);
    const { matchMaker } = await colyseus();
    try {
      await until(() => matchMaker.getLocalRoomById(refused.roomId) === undefined, 'disposal');
    } finally {
      console.log = log;
    }
    assert.equal(rooms.roomsHeldBy(from), ADMISSION.MAX_ROOMS_PER_ADDRESS);
    assert.ok(
      lines.every((line) => !line.includes(refused.roomId)),
      'no world was built for a refused join'
    );

    const elsewhere = '198.51.100.21';
    const other = await create(elsewhere);
    assert.equal((await join(other, elsewhere)).status, 101);
    await until(() => rooms.roomsHeldBy(elsewhere) === 1, 'another address is not bound');
  });

  it('counts a seat against the address the proxy names, not one the client forges', async () => {
    const from = '203.0.113.22';
    const forged = '192.0.2.99';
    const rooms = await ledger();
    const seat = await create(from);
    const { status } = await join(seat, from, { 'X-Real-IP': forged });
    assert.equal(status, 101);
    await until(() => rooms.roomsHeldBy(from) === 1, 'the seat held from the real address');
    assert.equal(rooms.roomsHeldBy(forged), 0, 'X-Real-IP is not the client’s to choose');
  });

  it('refuses an address a socket past its cap at the upgrade, and frees one on close', async () => {
    const from = '203.0.113.23';
    // A path that names no room is still a socket held open: Colyseus answers
    // it with pings for a second before closing it.
    const sockets: Socket[] = [];
    for (let i = 0; i < ADMISSION.MAX_SOCKETS_PER_ADDRESS; i += 1) {
      const { status, socket } = await upgrade('/', { 'X-Forwarded-For': from });
      assert.equal(status, 101, `socket ${i + 1} is inside the cap`);
      sockets.push(socket!);
    }
    assert.equal((await upgrade('/', { 'X-Forwarded-For': from })).status, 429);
    assert.equal(
      (await upgrade('/', { 'X-Forwarded-For': '198.51.100.23' })).status,
      101,
      'another address keeps its own sockets'
    );
    const closed = new Promise((resolve) => sockets[0]!.once('close', resolve));
    sockets[0]!.destroy();
    await closed;
    // The server sees the close a moment after the client does.
    let status = 0;
    for (let tries = 0; tries < 50 && status !== 101; tries += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      status = (await upgrade('/', { 'X-Forwarded-For': from })).status;
    }
    assert.equal(status, 101, 'a closed socket gives its place back');
  });
});
