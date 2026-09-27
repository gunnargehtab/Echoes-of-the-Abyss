import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { IRoomCache } from '@colyseus/core';

type MatchServer = typeof import('../src/index.ts').server;

let server: MatchServer;
let matchMaker: typeof import('@colyseus/core').matchMaker;
let endpoint: string;

describe('the public match listing', () => {
  before(async () => {
    const previousPort = process.env.PORT;
    const previousCorsOrigin = process.env.CORS_ORIGIN;
    process.env.PORT = '0';
    process.env.CORS_ORIGIN = '*';
    try {
      const [serverModule, colyseus] = await Promise.all([
        import('../src/index.ts'),
        import('@colyseus/core'),
      ]);
      server = serverModule.server;
      matchMaker = colyseus.matchMaker;
    } finally {
      if (previousPort === undefined) delete process.env.PORT;
      else process.env.PORT = previousPort;
      if (previousCorsOrigin === undefined) delete process.env.CORS_ORIGIN;
      else process.env.CORS_ORIGIN = previousCorsOrigin;
    }

    const address = server.transport.server?.address();
    assert.ok(address !== undefined && address !== null && typeof address === 'object');
    endpoint = `http://127.0.0.1:${address.port}/rooms/match`;
  });

  after(async () => {
    await server.gracefullyShutdown(false);
  });

  it('returns only public, unlocked, listed rooms and approved metadata', async () => {
    const metadata = {
      mapId: 'trench',
      mapName: 'Trenches',
      seats: 4,
      filled: 2,
      missionId: 'private-mission',
      internal: 'must-not-leak',
    };
    const listings: Array<IRoomCache> = [
      { roomId: 'public-room', private: false, locked: false, unlisted: false },
      { roomId: 'private-room', private: true, locked: false, unlisted: false },
      { roomId: 'locked-room', private: false, locked: true, unlisted: false },
      { roomId: 'unlisted-room', private: false, locked: false, unlisted: true },
    ].map((room) => ({
      ...room,
      name: 'match',
      processId: 'listing-test',
      clients: 2,
      maxClients: 4,
      metadata,
    }));
    await Promise.all(listings.map((listing) => matchMaker.driver.persist(listing, true)));

    const response = await fetch(endpoint);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), [
      {
        roomId: 'public-room',
        metadata: { mapId: 'trench', mapName: 'Trenches', seats: 4, filled: 2 },
      },
    ]);
  });
});
