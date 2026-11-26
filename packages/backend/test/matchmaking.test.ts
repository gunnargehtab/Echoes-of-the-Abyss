/**
 * Which requests the matchmaking limit counts, and whose address it counts
 * them against (#1960), as pure functions. `matchmakingLive.test.ts` holds the
 * limit on a live server.
 */
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { describe, it } from 'node:test';
import { clientAddress, makesRoom } from '../src/http/matchmaking.ts';

/** A request as far as `makesRoom` reads one. */
const call = (
  method: string,
  url: string,
  headers: Record<string, string> = { host: 'play.example.com:3000' }
): IncomingMessage => ({ method, url, headers, socket: {} }) as unknown as IncomingMessage;

describe('the requests that can make a room', () => {
  it('counts a create and a joinOrCreate', () => {
    assert.equal(makesRoom(call('POST', '/matchmake/create/match')), true);
    assert.equal(makesRoom(call('POST', '/matchmake/joinOrCreate/match')), true);
  });

  it('counts the spellings a URL parser reads as the route', () => {
    // A query, a dot segment, an absolute-form target and an escaped method.
    // Not every one reaches the matchmaker, and counting one that does not
    // costs nothing but a window.
    assert.equal(makesRoom(call('POST', '/matchmake/create/match?mapId=x')), true);
    assert.equal(makesRoom(call('POST', '/./matchmake/create/match')), true);
    assert.equal(makesRoom(call('POST', 'http://evil.example/matchmake/create/match')), true);
    assert.equal(makesRoom(call('POST', '/matchmake/%63reate/match')), true);
  });

  it('counts a seat whose Host rewrites the path Colyseus dispatches on', () => {
    // Colyseus finds the route on the raw path and dispatches on
    // `base + req.url`, so a path in `Host` makes this raw `join` a `create`.
    const smuggled = { host: 'x/matchmake/create/match?' };
    assert.equal(makesRoom(call('POST', '/matchmake/join/match', smuggled)), true);
    const proto = {
      host: 'play.example.com',
      'x-forwarded-proto': 'http://x/matchmake/create/match?',
    };
    assert.equal(makesRoom(call('POST', '/matchmake/join/match', proto)), true);
  });

  it('leaves a seat in a room that exists alone', () => {
    // A reconnection is a player getting back to their fleet.
    for (const method of ['join', 'joinById', 'reconnect']) {
      assert.equal(makesRoom(call('POST', `/matchmake/${method}/match`)), false, method);
    }
  });

  it('leaves reads, preflights and other routes alone', () => {
    assert.equal(makesRoom(call('OPTIONS', '/matchmake/create/match')), false);
    assert.equal(makesRoom(call('GET', '/matchmake/create/match')), false);
    assert.equal(makesRoom(call('POST', '/rooms/match')), false);
    assert.equal(makesRoom(call('POST', '/api/report')), false);
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
