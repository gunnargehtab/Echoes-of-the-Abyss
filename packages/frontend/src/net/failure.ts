/**
 * Whether a failed join was answered — docs/ui-ux.md §14, "When something
 * fails" (#1613).
 *
 * The player is told one of two different things: a join that was turned away
 * gets a sentence saying so, carrying the room's own reason only when the room
 * wrote one (`refusalSentence`), and a server that never spoke has no reason,
 * only an outage that is not their fault. The SDK reports both as a
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

/** colyseus's `ErrorCode.APPLICATION_ERROR`: what core gives an `onJoin` that threw. */
const ROOM_REFUSED = 526;
/** `ErrorCode.MATCHMAKE_INVALID_ROOM_ID`: no open room has the id asked for. */
const NO_SUCH_ROOM = 522;

function codeOf(error: unknown): unknown {
  return typeof error === 'object' && error !== null
    ? (error as { code?: unknown }).code
    : undefined;
}

export function joinFailure(error: unknown): JoinFailure {
  const code = codeOf(error);
  if (typeof code !== 'number') return 'unanswered';
  if (code < 400 || (code >= 1000 && code < 3000)) return 'unanswered';
  if (GATEWAY_DOWN.has(code)) return 'unanswered';
  return 'refused';
}

/**
 * What the player is told about a refusal, in a sentence.
 *
 * Only a room's own refusal carries a reason worth showing as it is:
 * `MatchRoom.onJoin` throws "This match is full." for the player, and core
 * codes a thrown `onJoin` 526. Everything else numeric is the matchmaker's or
 * the transport's text, written for whoever runs the server — `room "ABCD" not
 * found`, a bare "Internal Server Error" — so the client says it in its own
 * words instead. A wrong or stale room code is the refusal a player meets most,
 * from the code field or a listing that went stale: 522.
 *
 * 526 means the room's `onJoin` threw, not that it threw on purpose: a bug in
 * `onJoin` would show its own text here too. Today its only throws are the two
 * sentences written for the player, so the code is trusted as the room's word;
 * telling the two apart would need the backend to mark its refusals.
 */
export function refusalSentence(error: unknown): string {
  const code = codeOf(error);
  if (code === ROOM_REFUSED && error instanceof Error && error.message !== '') {
    return `The room would not take your seat. ${error.message}`;
  }
  if (code === NO_SUCH_ROOM) {
    return 'That room is not open. Its match may have started, filled or closed.';
  }
  return 'The server would not seat you in this match.';
}
