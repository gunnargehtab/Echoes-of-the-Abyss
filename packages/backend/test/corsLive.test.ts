/**
 * The origin lock, on the live server (#1301).
 *
 * `cors.test.ts` holds the decision as a pure function; this holds that the
 * decision is the one a browser actually meets. Colyseus answers every
 * request's CORS itself, ahead of express, from `controller.getCorsHeaders`,
 * and its default echoed whatever Origin a request carried, with credentials:
 * a server started with the production lock answered every page on the
 * internet, `/matchmake` included. Booted for real, on a port of its own.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

type MatchServer = typeof import('../src/index.ts').server;

const ALLOWED = 'https://play.example.com';
const FOREIGN = 'https://evil.example';

let server: MatchServer;
let base: string;

describe('the origin lock, as a browser meets it', () => {
  before(async () => {
    const previousPort = process.env.PORT;
    const previousCorsOrigin = process.env.CORS_ORIGIN;
    process.env.PORT = '0';
    process.env.CORS_ORIGIN = ALLOWED;
    try {
      server = (await import('../src/index.ts')).server;
    } finally {
      if (previousPort === undefined) delete process.env.PORT;
      else process.env.PORT = previousPort;
      if (previousCorsOrigin === undefined) delete process.env.CORS_ORIGIN;
      else process.env.CORS_ORIGIN = previousCorsOrigin;
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

  it("refuses a foreign origin the server's own routes too", async () => {
    const response = await fetch(`${base}/rooms/match`, { headers: { Origin: FOREIGN } });
    assert.equal(response.status, 200, 'the request itself is answered; the browser blocks it');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});
