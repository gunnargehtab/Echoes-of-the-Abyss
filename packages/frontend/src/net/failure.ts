/**
 * Whether a failed join was answered — docs/ui-ux.md §14, "When something
 * fails" (#1613).
 *
 * The player is told one of two different things: a room that turned them
 * away has a reason the room wrote for them, and a server that never spoke has
 * none, only an outage that is not their fault. The SDK reports both as a
 * thrown error, so the difference has to be read off what was thrown.
 *
 * The rule is the error's numeric `code`, because the SDK copies the answer's
 * code onto the error and has no code to copy when nothing answered:
 *
 * - **No code, or a string one.** A `fetch` that never connected: the SDK
 *   wraps the network error with `err.cause?.code || err.code`, which a browser
 *   leaves undefined and Node fills with `ECONNREFUSED`.
 * - **Under 400.** Not a status a server refuses with: an XHR that never
 *   connected reports status 0.
 * - **1000–2999.** A WebSocket close code: the seat was reserved but the
 *   socket closed before the room spoke (1006 is the usual one).
 * - **502, 503, 504.** A gateway answered, saying the server behind it did
 *   not. The playtest build sits behind one (Caddy, `deploy/compose.playtest.yml`), so this is what "down" looks like
 *   there, and calling it a refusal would blame the room for the outage.
 *
 * Everything else numeric — an HTTP status, colyseus's 52x matchmaking codes,
 * an application code from 4000 up — came from the server, and is a refusal.
 */

export type JoinFailure = 'unanswered' | 'refused';

const GATEWAY_DOWN = new Set([502, 503, 504]);

export function joinFailure(error: unknown): JoinFailure {
  const code =
    typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  if (typeof code !== 'number') return 'unanswered';
  if (code < 400 || (code >= 1000 && code < 3000)) return 'unanswered';
  if (GATEWAY_DOWN.has(code)) return 'unanswered';
  return 'refused';
}
