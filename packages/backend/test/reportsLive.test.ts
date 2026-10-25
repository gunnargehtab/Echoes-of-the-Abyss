/**
 * The error-report route, on the live server (#1576).
 *
 * `reports.test.ts` holds the shape and the limiter as pure functions; this
 * holds the issue's own bar: an error a hosted client reports lands in the
 * server's log as one JSON line, tagged with the build and the room, and with
 * the seed the server looked up for it. Booted for real, on a port of its own.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { REPORT_PATH, REPORTS, type ClientReport } from '@echoes/shared';

type MatchServer = typeof import('../src/index.ts').server;

const ALLOWED = 'https://play.example.com';
const FOREIGN = 'https://evil.example';

let server: MatchServer;
let base: string;

/** Run `body` and return the JSON lines it wrote to stderr. */
async function capturingLines(body: () => Promise<void>): Promise<Record<string, unknown>[]> {
  const lines: Record<string, unknown>[] = [];
  const error = console.error;
  console.error = (...args: unknown[]): void => {
    lines.push(JSON.parse(args.map(String).join(' ')) as Record<string, unknown>);
  };
  try {
    await body();
  } finally {
    console.error = error;
  }
  return lines;
}

const report = (fields: Partial<ClientReport> = {}): ClientReport => ({
  kind: 'error',
  message: 'the conn view went wrong',
  stack: 'Error: the conn view went wrong\n    at draw (index-abc123.js:1:2345)',
  build: '1d57f61',
  roomId: null,
  ...fields,
});

const send = (body: string, origin: string | undefined = ALLOWED) =>
  fetch(`${base}${REPORT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(origin === undefined ? {} : { Origin: origin }),
    },
    body,
  });

describe('the error-report route, as a hosted client meets it', () => {
  before(async () => {
    const previous = {
      PORT: process.env.PORT,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      COLYSEUS_SEAT_RESERVATION_TIME: process.env.COLYSEUS_SEAT_RESERVATION_TIME,
    };
    process.env.PORT = '0';
    process.env.CORS_ORIGIN = ALLOWED;
    // The room below reserves a seat nobody takes; corsLive.test.ts says why
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

  it("logs a client's error with its build, its room and that room's seed", async () => {
    const reservation = (await (
      await fetch(`${base}/matchmake/create/match`, {
        method: 'POST',
        headers: { Origin: ALLOWED },
      })
    ).json()) as { roomId: string };
    const { matchMaker } = await import('@colyseus/core');
    const { MatchRoom } = await import('../src/rooms/MatchRoom.ts');
    const room = matchMaker.getLocalRoomById(reservation.roomId);
    assert.ok(room instanceof MatchRoom);

    let status = 0;
    const lines = await capturingLines(async () => {
      status = (await send(JSON.stringify(report({ roomId: reservation.roomId })))).status;
    });

    assert.equal(status, 204);
    assert.equal(lines.length, 1, 'one report, one line');
    const [line] = lines;
    assert.equal(line?.source, 'client');
    assert.equal(line?.kind, 'error');
    // The client's build, not the server's: that is the bundle that threw.
    assert.equal(line?.build, '1d57f61');
    assert.equal(line?.room, reservation.roomId);
    assert.equal(line?.seed, room.seed);
    assert.equal(typeof line?.seed, 'number');
    assert.equal(line?.message, 'the conn view went wrong');
    assert.match(String(line?.stack), /index-abc123\.js/);
    assert.equal(typeof line?.ts, 'string');
  });

  it('logs a report from outside a room, or from a room that has gone, with no seed', async () => {
    const lines = await capturingLines(async () => {
      assert.equal((await send(JSON.stringify(report()))).status, 204);
      assert.equal((await send(JSON.stringify(report({ roomId: 'gone12345' })))).status, 204);
    });
    assert.deepEqual(
      lines.map((line) => [line.room, line.seed]),
      [
        [null, null],
        ['gone12345', null],
      ]
    );
  });

  it('logs only the fields a report names', async () => {
    const lines = await capturingLines(async () => {
      const body = { ...report(), world: { units: [1, 2, 3] }, seed: 42 };
      assert.equal((await send(JSON.stringify(body))).status, 204);
    });
    assert.equal(lines[0]?.world, undefined);
    // The seed is the server's lookup, never the client's say-so.
    assert.equal(lines[0]?.seed, null);
  });

  it('refuses a malformed report, an oversized one and a foreign page, and logs none', async () => {
    const lines = await capturingLines(async () => {
      assert.equal((await send('{"kind":"error"}')).status, 400);
      assert.equal((await send('not json')).status, 400);
      const huge = JSON.stringify(report({ stack: 'x'.repeat(REPORTS.MAX_BODY_BYTES) }));
      assert.equal((await send(huge)).status, 413);
      assert.equal((await send(JSON.stringify(report()), FOREIGN)).status, 403);
    });
    assert.deepEqual(lines, []);
  });

  it('answers the preflight a JSON report needs, for the allowed origin only', async () => {
    const preflight = (origin: string) =>
      fetch(`${base}${REPORT_PATH}`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });
    const allowed = await preflight(ALLOWED);
    assert.equal(allowed.headers.get('access-control-allow-origin'), ALLOWED);
    assert.match(allowed.headers.get('access-control-allow-headers') ?? '', /Content-Type/);
    assert.equal((await preflight(FOREIGN)).headers.get('access-control-allow-origin'), null);
  });

  it('logs a throw that escapes every room, tagged with the server build', async () => {
    // Emitted rather than thrown: a real one would end the test process, and
    // what is under test is the line, not Colyseus's exit. Node's types leave
    // this event out of `emit`'s overloads, hence the cast.
    const emit = process.emit as (event: string, ...args: unknown[]) => boolean;
    const lines = await capturingLines(async () => {
      emit.call(
        process,
        'uncaughtExceptionMonitor',
        new Error('the box went wrong'),
        'uncaughtException'
      );
    });
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.source, 'server');
    assert.equal(lines[0]?.kind, 'uncaughtException');
    assert.equal(lines[0]?.build, 'dev');
    assert.equal(lines[0]?.room, null);
    assert.equal(lines[0]?.message, 'the box went wrong');
  });
});
