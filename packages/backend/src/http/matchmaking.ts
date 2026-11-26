/**
 * Admission to the matchmaker: a per-address limit on making rooms (#1960).
 *
 * `POST /matchmake/create/match` needs no account, and every room it makes is
 * work on the one thread that steps every match (`docs/threat-model.md`,
 * TM-002). The origin lock (`cors.ts`) refuses a foreign page, but a script
 * sends no `Origin` and passes it, so the bound has to be on the address.
 *
 * Colyseus answers `/matchmake/` from a request listener it prepends ahead of
 * express, so an express middleware never sees these requests. The limit wraps
 * the server's listeners the way `guardOrigins` does, and reads the path the
 * way Colyseus's own router does (`router/node.mjs`): the same `URL` pathname
 * and the same pattern, so no spelling of the path reaches the matchmaker
 * without being counted.
 */

import type { IncomingMessage, RequestListener, Server, ServerResponse } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import { matchMaker } from '@colyseus/core';
import { MATCHMAKING } from '@echoes/shared';
import proxyAddr from 'proxy-addr';
import { AddressLimiter } from './addressLimiter.ts';
import { type CorsPolicy, corsHeadersFor } from './cors.ts';

/**
 * The peers whose `X-Forwarded-For` is believed: the playtest host's TLS proxy
 * on a private network (#1597). The report route gives express the same list
 * as its `trust proxy`, so both limits see a stranger by one address. A peer
 * on the internet is the client itself, and cannot buy a fresh window by
 * forging the header.
 */
export const TRUSTED_PROXIES = ['loopback', 'linklocal', 'uniquelocal'];

const trusted = proxyAddr.compile(TRUSTED_PROXIES);

/** The address a request came from, past any trusted proxy. */
export function clientAddress(req: IncomingMessage): string {
  return proxyAddr(req, trusted);
}

/**
 * The matchmaker methods that can make a room. `join`, `joinById` and
 * `reconnect` only seat a player in a room that exists, and a reconnection in
 * particular must never be refused: it is a player getting back to their fleet.
 */
const ROOM_MAKING = new Set(['create', 'joinOrCreate']);

/** Whether Colyseus would answer this request by possibly making a room. */
export function makesRoom(method: string | undefined, url: string | undefined): boolean {
  if (method !== 'POST') return false;
  const { pathname } = new URL(url || '/', 'http://localhost');
  const route = `/${matchMaker.controller.matchmakeRoute}/`;
  if (!pathname.startsWith(route)) return false;
  const named = pathname.slice(route.length).match(/^(\w+)\/(.+)/);
  return named !== null && ROOM_MAKING.has(named[1]!);
}

/** The matchmaking limit, at the bounds `MATCHMAKING` sets. */
export const matchmakingLimiter = (): AddressLimiter =>
  new AddressLimiter(
    MATCHMAKING.MAX_CREATES_PER_WINDOW,
    MATCHMAKING.WINDOW_MS,
    MATCHMAKING.MAX_TRACKED_ADDRESSES
  );

/**
 * Put the limit in front of every request listener `server` holds, as
 * `guardOrigins` does and for its reason: one more listener could answer 429
 * but not stop Colyseus's from making the room anyway. A refusal carries the
 * CORS headers the policy grants, so the allowed page can read it as a
 * refusal rather than a server that never answered.
 */
export function guardMatchmaking(
  server: Server | HttpsServer,
  policy: CorsPolicy,
  limiter: AddressLimiter = matchmakingLimiter(),
  now: () => number = Date.now
): void {
  const listeners = server.listeners('request') as RequestListener[];
  server.removeAllListeners('request');
  server.on('request', (req: IncomingMessage, res: ServerResponse) => {
    if (makesRoom(req.method, req.url) && !limiter.allow(clientAddress(req), now())) {
      res.writeHead(429, {
        ...corsHeadersFor(policy, req.headers.origin),
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(MATCHMAKING.WINDOW_MS / 1000)),
      });
      res.end(JSON.stringify({ error: 'too many matches made from this address' }));
      return;
    }
    for (const listener of listeners) listener.call(server, req, res);
  });
}
