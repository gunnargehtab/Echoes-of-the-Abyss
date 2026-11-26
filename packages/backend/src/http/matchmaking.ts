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
 * the server's listeners the way `guardOrigins` does.
 *
 * Which path it reads is the hard part (#1960's review). Colyseus binds its
 * router in `bindRouterToTransport` (`router/index.mjs`): it *finds* the route
 * on the raw `req.url`, then *dispatches* on `new Request(base + req.url)`,
 * whose `base` is built from `X-Forwarded-Proto` and `Host`. A `Host` that
 * carries a path rewrites the dispatched one, so a request whose raw path says
 * `join` can be answered as a `create`. Both paths are read here, and the
 * count is the default: only a request both of them name as a seat-only
 * method passes uncounted.
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
 * The matchmaker methods that only seat a player in a room that exists
 * (`controller.exposedMethods`, less `create` and `joinOrCreate`). These pass
 * uncounted: a reconnection in particular must never be refused, as it is a
 * player getting back to their fleet. Anything else is counted, a method that
 * would fail anyway included, so a spelling nobody foresaw costs a window
 * rather than slipping past one.
 */
const SEAT_ONLY = new Set(['join', 'joinById', 'reconnect']);

/** The URL Colyseus dispatches a request on, built as `router/index.mjs` builds it. */
export function routedUrl(req: IncomingMessage): string {
  const encrypted = (req.socket as { encrypted?: boolean } | undefined)?.encrypted === true;
  const protocol = req.headers['x-forwarded-proto'] || (encrypted ? 'https' : 'http');
  const authority = req.headers[':authority'] || req.headers.host;
  return `${String(protocol)}://${String(authority)}${req.url ?? ''}`;
}

/** The method a matchmaking pathname names, decoded; `null` off the route. */
function namedMethod(pathname: string): string | null {
  const route = `/${matchMaker.controller.matchmakeRoute}/`;
  if (!pathname.startsWith(route)) return null;
  const segment = pathname.slice(route.length).split('/')[0] ?? '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** One path, read as a seat-only call (`true`), another call, or off the route. */
function seatOnly(url: string, base?: string): boolean | null {
  let pathname: string;
  try {
    pathname = new URL(url, base).pathname;
  } catch {
    // A URL that does not parse cannot be shown harmless.
    return false;
  }
  const method = namedMethod(pathname);
  return method === null ? null : SEAT_ONLY.has(method);
}

/**
 * Whether a request is counted against its address: a POST that either the
 * raw path or the dispatched one reads as a matchmaking call other than a
 * seat in an existing room.
 */
export function makesRoom(req: IncomingMessage): boolean {
  if (req.method !== 'POST') return false;
  const raw = seatOnly(req.url || '/', 'http://localhost');
  const routed = seatOnly(routedUrl(req));
  return raw === false || routed === false;
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
    if (makesRoom(req) && !limiter.allow(clientAddress(req), now())) {
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
