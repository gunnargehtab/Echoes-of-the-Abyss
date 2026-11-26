/**
 * The matchmaking limit, on the live server (#1960).
 *
 * `matchmaking.test.ts` holds which requests count and whose address they
 * count against; this holds that the limit is what a script meets: past the
 * window's room-making requests one address is answered 429 before the
 * matchmaker makes a room, another address is not, and a room made but never
 * joined has built no world. Booted for real, on a port of its own, from
 * loopback, which is a trusted proxy, so each test names its client's
 * address in `X-Forwarded-For` as the playtest host's proxy does.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { MATCHMAKING } from '@echoes/shared';

type MatchServer = typeof import('../src/index.ts').server;

const ALLOWED = 'https://play.example.com';

let server: MatchServer;
let base: string;

/** A matchmaker call; `target` is the room's name, or its id for `joinById`. */
const post = (method: string, from: string, target = 'match') =>
  fetch(`${base}/matchmake/${method}/${target}`, {
    method: 'POST',
    headers: { Origin: ALLOWED, 'X-Forwarded-For': from, 'Content-Type': 'application/json' },
    body: '{}',
  });

/**
 * A raw request, because `fetch` will not send a `Host` it did not derive.
 * The `Host` names a path, which Colyseus prepends to the one it dispatches.
 */
const smuggle = async (from: string): Promise<number> => {
  const { request } = await import('node:http');
  const { port } = new URL(base);
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method: 'POST',
        path: '/matchmake/join/match',
        headers: {
          Host: 'x/matchmake/create/match?',
          'X-Forwarded-For': from,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      }
    );
    req.on('error', reject);
    req.end('{}');
  });
};

// Imported here, not at the top: Colyseus reads the seat timeout `before()`
// sets when it loads, and a static import would load it first.
const colyseus = () => import('@colyseus/core');
const matchRooms = async () =>
  (await (await colyseus()).matchMaker.query({ name: 'match' })).length;

describe('the matchmaking limit, as a script meets it', () => {
  before(async () => {
    const previous = {
      PORT: process.env.PORT,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      COLYSEUS_SEAT_RESERVATION_TIME: process.env.COLYSEUS_SEAT_RESERVATION_TIME,
    };
    process.env.PORT = '0';
    process.env.CORS_ORIGIN = ALLOWED;
    // Every room below reserves a seat nobody takes; corsLive.test.ts says why
    // its timer must be short.
    process.env.COLYSEUS_SEAT_RESERVATION_TIME = '1';
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
    base = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await server.gracefullyShutdown(false);
  });

  it('builds no world for a room nobody joined', async () => {
    const response = await post('create', '203.0.113.1');
    assert.equal(response.status, 200);
    const { roomId } = (await response.json()) as { roomId: string };
    const { MatchRoom } = await import('../src/rooms/MatchRoom.ts');
    const room = (await colyseus()).matchMaker.getLocalRoomById(roomId);
    assert.ok(room instanceof MatchRoom);
    assert.equal(room.seed, null, 'a seed means a world was built');
  });

  it('refuses one address past its window, before a room is made', async () => {
    const from = '203.0.113.7';
    // Both room-making methods spend the one window.
    for (let i = 0; i < MATCHMAKING.MAX_CREATES_PER_WINDOW; i += 1) {
      const response = await post(i % 2 === 0 ? 'create' : 'joinOrCreate', from);
      assert.equal(response.status, 200, `request ${i + 1} is inside the window`);
      await response.body?.cancel();
    }
    const rooms = await matchRooms();
    for (const method of ['create', 'joinOrCreate']) {
      const refused = await post(method, from);
      assert.equal(refused.status, 429, method);
      // Readable by the allowed page, so the shell shows a refusal rather than
      // a server that never answered.
      assert.equal(refused.headers.get('access-control-allow-origin'), ALLOWED);
      assert.equal(refused.headers.get('retry-after'), String(MATCHMAKING.WINDOW_MS / 1000));
      assert.deepEqual(await refused.json(), { error: 'too many matches made from this address' });
    }
    assert.equal(await matchRooms(), rooms, 'a refused request made no room');
  });

  it('counts a join whose Host makes it a create', async () => {
    // The review's bypass: forty of these made forty rooms, none counted.
    const from = '203.0.113.9';
    for (let i = 0; i < MATCHMAKING.MAX_CREATES_PER_WINDOW; i += 1) {
      assert.equal(await smuggle(from), 200, `request ${i + 1} is inside the window`);
    }
    const rooms = await matchRooms();
    assert.equal(await smuggle(from), 429);
    assert.equal(await matchRooms(), rooms, 'a refused request made no room');
  });

  it('leaves another address, and a seat in an open room, alone', async () => {
    // The positive control: the limit is per address, not a server-wide cap.
    const other = await post('create', '203.0.113.8');
    assert.equal(other.status, 200);
    const { roomId } = (await other.json()) as { roomId: string };
    // The spent address can still take a seat in a room that exists: joining
    // makes no room, and a reconnection must never be refused.
    const join = await post('joinById', '203.0.113.7', roomId);
    assert.equal(join.status, 200);
    await join.body?.cancel();
  });
});
