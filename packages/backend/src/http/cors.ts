/**
 * Origin policy for the matchmaking endpoint.
 *
 * The WebSocket upgrade itself is not subject to CORS, but colyseus.js POSTs to
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

/** How the server decides whether a browser origin may talk to it. */
export type CorsPolicy =
  /** Explicitly opted out of the lock: every origin is answered with `*`. */
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
