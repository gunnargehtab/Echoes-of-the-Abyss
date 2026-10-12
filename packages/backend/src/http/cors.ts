/**
 * Origin policy for the matchmaking endpoint.
 *
 * The WebSocket upgrade itself is not subject to CORS, but the Colyseus SDK POSTs to
 * `/matchmake/` first, so the browser will not let a client reach this server at
 * all unless that POST answers with an acceptable `Access-Control-Allow-Origin`.
 * This module decides what "acceptable" means, and is a separate file from
 * index.ts only so the decision can be tested without binding a port.
 *
 * The rule the deployment story turns on: **an unset origin list is a fatal
 * error in production and a localhost default everywhere else.** Wide-open CORS
 * was the previous default, which is fine on a laptop and is a standing
 * invitation once the server is reachable from anywhere real — any page on the
 * internet could drive somebody's matchmaking. Refusing to start is louder than
 * a warning nobody reads, and it fails at deploy time rather than at the first
 * report of a stranger in a lobby.
 */

import type { IncomingMessage, RequestListener, Server, ServerResponse } from 'node:http';
import type { Server as HttpsServer } from 'node:https';

/** How the server decides whether a browser origin may talk to it. */
export type CorsPolicy =
  /** Explicitly opted out of the lock: every origin is answered, its own echoed back. */
  | { kind: 'any' }
  /** The development default: loopback on any port, and nothing else. */
  | { kind: 'loopback' }
  /** An operator-supplied allow-list, matched exactly. */
  | { kind: 'list'; origins: string[] };

/** The subset of `process.env` this module reads. */
export interface CorsEnv {
  CORS_ORIGIN?: string;
  NODE_ENV?: string;
}

export class CorsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorsConfigError';
  }
}

/**
 * Loopback hosts, matched on any port.
 *
 * Any port rather than 5173 because `vite.config.ts` sets `strictPort: false`,
 * so a second dev server — or a Vite instance started while 5173 is still held
 * by a previous one — legitimately lands on 5174 and would otherwise be refused
 * by the default a developer never set.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Read the origin policy out of the environment, or throw if it is unusable.
 *
 * Throwing is the point: `index.ts` calls this before it listens, so a
 * production image started without `CORS_ORIGIN` exits with the reason instead
 * of serving every origin on the internet.
 */
export function resolveCorsPolicy(env: CorsEnv): CorsPolicy {
  const production = env.NODE_ENV === 'production';
  const raw = env.CORS_ORIGIN?.trim() ?? '';

  if (raw === '') {
    if (production) {
      throw new CorsConfigError(
        'CORS_ORIGIN is not set. In production the server refuses to start rather ' +
          'than accept requests from any origin. Set it to the origin the client is ' +
          'served from (e.g. CORS_ORIGIN=https://play.example.com), a comma-separated ' +
          'list of them, or the literal * to opt out of the lock deliberately.'
      );
    }
    return { kind: 'loopback' };
  }

  // `*` stays available because a public playtest server is a real thing to
  // want, and refusing an operator's explicit instruction would only teach them
  // to patch this file. What the lock removes is the *silent* wildcard.
  if (raw === '*') return { kind: 'any' };

  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');

  if (origins.length === 0) {
    throw new CorsConfigError(`CORS_ORIGIN is set but lists no origins: ${JSON.stringify(raw)}`);
  }

  return { kind: 'list', origins };
}

/**
 * Whether `origin` — the value of a request's `Origin` header — is allowed.
 *
 * A request with no `Origin` at all is not a browser cross-origin request (curl,
 * a health probe, a same-origin navigation), so there is nothing to allow or
 * deny; callers simply omit the header in that case.
 */
export function isOriginAllowed(policy: CorsPolicy, origin: string): boolean {
  switch (policy.kind) {
    case 'any':
      return true;
    case 'list':
      return policy.origins.includes(origin);
    case 'loopback':
      return isLoopbackOrigin(origin);
  }
}

function isLoopbackOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return LOOPBACK_HOSTS.has(url.hostname);
}

/**
 * The CORS headers this server decides for one request under `policy` (#1301).
 *
 * The one decision, taken for every request: Colyseus prepends a listener to
 * the HTTP server that asks for it through `matchMaker.controller.getCorsHeaders`
 * (`index.ts`), merges it over its own Allow-Methods, Allow-Headers and
 * Max-Age defaults, sets the lot on every response, express routes included,
 * and answers every preflight itself before express runs. An allowed origin
 * is echoed with credentials, because the SDK fetches with credentials and a
 * browser refuses `*` on such a request; `any` echoes every origin the same
 * way. An origin the policy refuses gets no allow-origin: a browser sends
 * only the preflight of a request that needs one, and withholds the answer to
 * one that does not. Withholding the answer is not refusing the request, so
 * `guardOrigins` turns that one away before anything acts on it (#1310). A
 * request with no `Origin` is not a cross-origin browser request, and gets
 * none either. Every answer depends on the `Origin`, so every answer says so
 * in `Vary`, and a cache never hands one origin's answer to another.
 */
export function corsHeadersFor(
  policy: CorsPolicy,
  origin: string | null | undefined
): Record<string, string> {
  if (typeof origin !== 'string' || !isOriginAllowed(policy, origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

/**
 * Methods that read, and so are left to the browser's read lock. Anything else
 * can act — the matchmaking POST makes a room — and is refused outright.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Whether a request must be refused before the server acts on it (#1310).
 *
 * CORS only stops a page *reading* an answer. A POST that needs no preflight —
 * a form, or one with no body — is still sent from a refused origin, and
 * Colyseus's matchmaking acted on it: three foreign POSTs made three rooms.
 * So a refused `Origin` on a method that can act is answered 403. The
 * test is by method rather than by the `/matchmake` path so a path spelled
 * another way, or a POST route added later, cannot slip past it. A request
 * with no `Origin` is not a browser cross-origin request and carries no
 * authority an anonymous `curl` lacks (`MatchRoom` has no `onAuth`), so it
 * passes, as do reads and preflights, which `corsHeadersFor` already locks.
 */
export function refusesRequest(
  policy: CorsPolicy,
  method: string | undefined,
  origin: string | string[] | undefined
): boolean {
  if (typeof origin !== 'string') return false;
  if (SAFE_METHODS.has((method ?? 'GET').toUpperCase())) return false;
  return !isOriginAllowed(policy, origin);
}

/**
 * Put `refusesRequest` in front of every request listener `server` holds.
 *
 * Not a listener of its own: Node calls every `request` listener in turn, so
 * one more could answer 403 but not stop Colyseus's — prepended in
 * `bindRouterToTransport`, during `listen` — from making the room anyway. The
 * listeners are taken off and called from one wrapper instead, so it must run
 * after `listen` has bound them; `index.ts` calls it once `listen` resolves,
 * in the same turn, before any request event can be delivered.
 */
export function guardOrigins(server: Server | HttpsServer, policy: CorsPolicy): void {
  const listeners = server.listeners('request') as RequestListener[];
  server.removeAllListeners('request');
  server.on('request', (req: IncomingMessage, res: ServerResponse) => {
    if (refusesRequest(policy, req.method, req.headers.origin)) {
      res.writeHead(403, { 'Content-Type': 'application/json', Vary: 'Origin' });
      res.end(JSON.stringify({ error: 'origin not allowed' }));
      return;
    }
    for (const listener of listeners) listener.call(server, req, res);
  });
}

/** One line for the startup log, so an operator can see what was applied. */
export function describeCorsPolicy(policy: CorsPolicy): string {
  switch (policy.kind) {
    case 'any':
      return 'any origin (CORS_ORIGIN=*)';
    case 'loopback':
      return 'loopback origins only (CORS_ORIGIN unset)';
    case 'list':
      return policy.origins.join(', ');
  }
}
