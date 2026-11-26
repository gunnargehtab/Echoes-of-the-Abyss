/**
 * Which requests the matchmaking limit counts, and whose address it counts
 * them against (#1960), as pure functions. `matchmakingLive.test.ts` holds the
 * limit on a live server.
 */
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { describe, it } from 'node:test';
import { clientAddress, makesRoom } from '../src/http/matchmaking.ts';

describe('the requests that can make a room', () => {
  it('counts a create and a joinOrCreate', () => {
    assert.equal(makesRoom('POST', '/matchmake/create/match'), true);
    assert.equal(makesRoom('POST', '/matchmake/joinOrCreate/match'), true);
  });

  it('reads the path as Colyseus does, so no spelling slips past', () => {
    // The same `URL` pathname Colyseus's router reads: a query, a dot segment
    // and a full URL all reach the matchmaker, so all are counted.
    assert.equal(makesRoom('POST', '/matchmake/create/match?mapId=x'), true);
    assert.equal(makesRoom('POST', '/./matchmake/create/match'), true);
    assert.equal(makesRoom('POST', 'http://evil.example/matchmake/create/match'), true);
  });

  it('leaves a seat in a room that exists alone', () => {
    // A reconnection is a player getting back to their fleet.
    for (const method of ['join', 'joinById', 'reconnect']) {
      assert.equal(makesRoom('POST', `/matchmake/${method}/match`), false, method);
    }
  });

  it('leaves reads, preflights and other routes alone', () => {
    assert.equal(makesRoom('OPTIONS', '/matchmake/create/match'), false);
    assert.equal(makesRoom('GET', '/matchmake/create/match'), false);
    assert.equal(makesRoom('POST', '/rooms/match'), false);
    assert.equal(makesRoom('POST', '/api/report'), false);
    assert.equal(makesRoom('POST', undefined), false);
  });
});

/** A request as far as `proxy-addr` reads one. */
const request = (peer: string, forwarded?: string): IncomingMessage => {
  const socket = { remoteAddress: peer };
  return {
    socket,
    connection: socket,
    headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
  } as unknown as IncomingMessage;
};

describe('the address a request is counted against', () => {
  it('is the peer when nothing stands in front', () => {
    assert.equal(clientAddress(request('203.0.113.9')), '203.0.113.9');
  });

  it('believes the playtest proxy on a private network', () => {
    // Caddy on the compose network: the client is the address it forwarded.
    assert.equal(clientAddress(request('172.18.0.2', '203.0.113.9')), '203.0.113.9');
  });

  it('does not let a client name its own address', () => {
    // A stranger on the internet forging the header is still its own peer.
    assert.equal(clientAddress(request('203.0.113.9', '198.51.100.1')), '203.0.113.9');
    // Behind the proxy, a forged entry sits left of the one the proxy wrote,
    // and the walk stops at the first address it does not trust.
    assert.equal(clientAddress(request('172.18.0.2', '198.51.100.1, 203.0.113.9')), '203.0.113.9');
  });
});
