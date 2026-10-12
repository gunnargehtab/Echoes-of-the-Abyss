/**
 * The origin lock, on the live server (#1301).
 *
 * `cors.test.ts` holds the decision as a pure function; this holds that the
 * decision is the one a browser actually meets. Colyseus answers every
 * request's CORS itself, ahead of express, from `controller.getCorsHeaders`,
 * and its default echoed whatever Origin a request carried, with credentials:
 * a server started with the production lock answered every page on the
 * internet, `/matchmake` included. And a refused page that cannot read an
 * answer could still make a room with a POST that needs no preflight (#1310).
 * Booted for real, on a port of its own.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { matchMaker } from '@colyseus/core';

type MatchServer = typeof import('../src/index.ts').server;

const ALLOWED = 'https://play.example.com';
const FOREIGN = 'https://evil.example';

let server: MatchServer;
let base: string;

describe('the origin lock, as a browser meets it', () => {
  before(async () => {
    const previousPort = process.env.PORT;
    const previousCorsOrigin = process.env.CORS_ORIGIN;
    const previousSeatS = process.env.COLYSEUS_SEAT_RESERVATION_TIME;
    process.env.PORT = '0';
    process.env.CORS_ORIGIN = ALLOWED;
    // The matchmaking POST below reserves a seat nobody takes, and Colyseus's
    // shutdown leaves that seat's timer running: at the default 15 s it held
    // the file open long after its last test. Read when Colyseus loads.
    process.env.COLYSEUS_SEAT_RESERVATION_TIME = '1';
    try {
      server = (await import('../src/index.ts')).server;
    } finally {
      if (previousPort === undefined) delete process.env.PORT;
      else process.env.PORT = previousPort;
      if (previousCorsOrigin === undefined) delete process.env.CORS_ORIGIN;
      else process.env.CORS_ORIGIN = previousCorsOrigin;
      if (previousSeatS === undefined) delete process.env.COLYSEUS_SEAT_RESERVATION_TIME;
      else process.env.COLYSEUS_SEAT_RESERVATION_TIME = previousSeatS;
    }
    const address = server.transport.server?.address();
    assert.ok(address !== undefined && address !== null && typeof address === 'object');
    base = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await server.gracefullyShutdown(false);
  });

  const preflight = (origin: string) =>
    fetch(`${base}/matchmake/joinOrCreate/match`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
    });

  it('refuses a foreign origin the matchmaking preflight', async () => {
    const response = await preflight(FOREIGN);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
  });

  it('answers the allowed origin, with credentials', async () => {
    const response = await preflight(ALLOWED);
    assert.equal(response.headers.get('access-control-allow-origin'), ALLOWED);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  });

  const post = (origin: string | undefined, init: RequestInit = {}) =>
    fetch(`${base}/matchmake/create/match`, {
      ...init,
      method: 'POST',
      headers: { ...(origin === undefined ? {} : { Origin: origin }), ...init.headers },
    });

  const matchRooms = async () => (await matchMaker.query({ name: 'match' })).length;

  it('refuses a foreign matchmaking POST before it makes a room (#1310)', async () => {
    // A POST needing no preflight is sent whatever the preflight said, so the
    // missing allow-origin only kept the seat from the page: each one still
    // made a room. Bodyless, form and JSON, as the issue measured them.
    const before = await matchRooms();
    for (const init of [
      {},
      {
        body: 'mapId=x',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
      { body: '{}', headers: { 'Content-Type': 'application/json' } },
    ]) {
      const response = await post(FOREIGN, init);
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('access-control-allow-origin'), null);
      assert.equal(response.headers.get('access-control-allow-credentials'), null);
      assert.equal(response.headers.get('vary'), 'Origin');
    }
    assert.equal(await matchRooms(), before, 'no room was made');
  });

  it('still seats the allowed origin, and a request with no Origin', async () => {
    // The positive control: the guard refuses an origin, not matchmaking.
    for (const origin of [ALLOWED, undefined]) {
      const response = await post(origin);
      assert.equal(response.status, 200);
      const reservation = (await response.json()) as { roomId?: string };
      assert.equal(typeof reservation.roomId, 'string');
    }
  });

  it("refuses a foreign origin the server's own routes too", async () => {
    const response = await fetch(`${base}/rooms/match`, { headers: { Origin: FOREIGN } });
    assert.equal(response.status, 200, 'the request itself is answered; the browser withholds it');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});
