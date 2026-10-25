/**
 * The error report a hosted client sends the game server (#1576).
 *
 * HTTP rather than the socket: an error can come before a room exists, after
 * it has gone, or from the socket itself, so it cannot ride `wire.ts`'s
 * channel. Declared here for `wire.ts`'s reason all the same: the client
 * writes it and the server reads it, and two copies would drift.
 *
 * **What a report may carry** is what the client already holds: the error, the
 * build it was thrown in, and the room it was in. Never world state, per the
 * server-authoritative rule in `CLAUDE.md`. The match seed is the server's: it
 * reproduces the whole match, hidden fauna included, so the server looks it up
 * from the room id rather than the client being sent it to send back.
 */

/** Where the report is POSTed, on the game server's own origin. */
export const REPORT_PATH = '/reports';

/** What threw: an uncaught `error` event, or an `unhandledrejection`. */
export type ClientReportKind = 'error' | 'rejection';

export const CLIENT_REPORT_KINDS: readonly ClientReportKind[] = ['error', 'rejection'];

/** The body of one report, as the client sends it. */
export interface ClientReport {
  kind: ClientReportKind;
  /** The error's message, trimmed to `REPORTS.MAX_MESSAGE_CHARS`. */
  message: string;
  /** The stack, trimmed to `REPORTS.MAX_STACK_CHARS`; `''` when there is none. */
  stack: string;
  /** The client's build, `ECHOES_BUILD` at bundle time, or `dev`. */
  build: string;
  /** The room the client was seated in, or `null` outside one. */
  roomId: string | null;
}
