/**
 * The server's structured log lines (#1576).
 *
 * One JSON object per line, so the owner reads a stranger's broken session with
 * `docker compose logs backend` and filters it with `jq`, with no log service
 * and no third-party request. Every line carries the build, because a stack
 * from one build read against another's source is a wrong answer that looks
 * like a right one.
 *
 * Only failures go through here: a client's report, a room's caught throw and a
 * process-level throw. The startup and budget lines stay prose, for whoever
 * reads the terminal.
 */

/**
 * The server's build: `ECHOES_BUILD` from the image (`packages/backend/Dockerfile`),
 * or `dev` for a server run from source. Read per line rather than once, so a
 * test can set it.
 */
export function serverBuild(): string {
  const build = process.env.ECHOES_BUILD?.trim() ?? '';
  return build === '' ? 'dev' : build;
}

/** Where a line came from: a client's report, or the server itself. */
export type LogSource = 'client' | 'server';

/** The fields every failure line carries; anything else rides beside them. */
export interface FailureLine {
  source: LogSource;
  /** What failed: a report's kind, a room method, or a process origin. */
  kind: string;
  /** The room it happened in, or `null` outside one. */
  room: string | null;
  message: string;
  stack: string;
  [field: string]: unknown;
}

/**
 * Write one failure line to stderr. `build` defaults to the server's own; a
 * client report passes the client's, since that is the bundle that threw.
 */
export function logFailure(line: FailureLine & { build?: string }): void {
  console.error(JSON.stringify({ ts: new Date().toISOString(), build: serverBuild(), ...line }));
}

/** The message and stack of anything thrown, for a failure line. */
export function describeThrown(thrown: unknown): { message: string; stack: string } {
  if (thrown instanceof Error) return { message: thrown.message, stack: thrown.stack ?? '' };
  return { message: String(thrown), stack: '' };
}
