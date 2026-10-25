/**
 * Send this page's uncaught errors to the game server's log (#1576).
 *
 * A stranger's broken session is otherwise invisible: the console it printed to
 * is on their machine. So the page hooks `error` and `unhandledrejection` once,
 * at boot, and POSTs each distinct error to `REPORT_PATH` on the server it
 * plays against (`packages/backend/src/http/reports.ts`).
 *
 * A report carries the error, the build and the room id, and nothing else:
 * never world state (`CLAUDE.md`, server-authoritative), and not the seed,
 * which the server looks up from the room because the client is never sent it.
 * Sending never throws and never retries: a report that fails is lost, which is
 * better than an error handler that raises errors of its own.
 */

import { type ClientReport, type ClientReportKind, REPORT_PATH, REPORTS } from '@echoes/shared';
import { defaultEndpoint } from './GameClient.ts';

/**
 * This bundle's build: `ECHOES_BUILD` when the image was built
 * (`packages/frontend/Dockerfile`), or `dev`.
 */
export function clientBuild(): string {
  const build = import.meta.env.VITE_ECHOES_BUILD?.trim() ?? '';
  return build === '' ? 'dev' : build;
}

/** The room this page is seated in, set by `GameClient` as it joins and leaves. */
let seatedRoom: string | null = null;

export function setReportRoom(roomId: string): void {
  seatedRoom = roomId;
}

/**
 * Clear the room, if it is still `roomId`. Conditional because two clients can
 * overlap, as StrictMode's double mount makes them in development, and the one
 * leaving must not untag the one that has just joined.
 */
export function leaveReportRoom(roomId: string): void {
  if (seatedRoom === roomId) seatedRoom = null;
}

/**
 * The HTTP origin of a socket endpoint: `wss://host:3000` → `https://host:3000`.
 * The report goes to `defaultEndpoint`, the server the page dials when nothing
 * names another, which every production `GameClient` does.
 */
export function httpBase(endpoint: string): string {
  return endpoint.replace(/^ws(s?):/, 'http$1:').replace(/\/+$/, '');
}

/** The report for one thrown value, trimmed to the bounds the server keeps. */
export function reportFor(kind: ClientReportKind, thrown: unknown): ClientReport {
  const message =
    thrown instanceof Error ? thrown.message : typeof thrown === 'string' ? thrown : String(thrown);
  const stack = thrown instanceof Error ? (thrown.stack ?? '') : '';
  return {
    kind,
    message: message.slice(0, REPORTS.MAX_MESSAGE_CHARS),
    stack: stack.slice(0, REPORTS.MAX_STACK_CHARS),
    build: clientBuild(),
    roomId: seatedRoom,
  };
}

/** Where a report goes. A seam for the test; the page posts it. */
export type ReportSender = (report: ClientReport) => void;

const post: ReportSender = (report) => {
  // `keepalive` so a report from a page that is closing still leaves.
  // `credentials: 'omit'` because a report needs none.
  fetch(`${httpBase(defaultEndpoint())}${REPORT_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {});
};

/** The two events a page raises for a throw nothing caught. */
interface ErrorTarget {
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  addEventListener(
    type: 'unhandledrejection',
    listener: (event: PromiseRejectionEvent) => void
  ): void;
}

/**
 * Hook `target`'s uncaught errors. Each distinct error is sent once, and at most
 * `REPORTS.MAX_PER_PAGE` in all: a frame loop that throws every frame says so
 * once rather than sixty times a second.
 */
export function installErrorReports(target: ErrorTarget = window, send: ReportSender = post): void {
  const seen = new Set<string>();
  const report = (kind: ClientReportKind, thrown: unknown): void => {
    if (seen.size >= REPORTS.MAX_PER_PAGE) return;
    const body = reportFor(kind, thrown);
    const key = `${body.kind}\n${body.message}\n${body.stack}`;
    if (seen.has(key)) return;
    seen.add(key);
    try {
      send(body);
    } catch {
      // A sender that throws must not become the next uncaught error.
    }
  };
  target.addEventListener('error', (event) => report('error', event.error ?? event.message));
  target.addEventListener('unhandledrejection', (event) => report('rejection', event.reason));
}
