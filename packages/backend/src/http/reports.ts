/**
 * The error-report route: a hosted client's uncaught errors, into the server's
 * log (#1576).
 *
 * The owner chose a route on the game server over a hosted service: no
 * third-party request, no new account. The cost is that the route is public and
 * anonymous, so everything here is a bound on what one stranger can write into
 * the owner's log. A report is size-capped before it is parsed, rate-limited per
 * address before that, and read field by field: a key the shape below does not
 * name is never logged, so a report cannot smuggle anything into a line. The
 * origin lock covers it too: `guardOrigins` (cors.ts) refuses a foreign page's
 * POST before this route sees it.
 *
 * Separate from index.ts so the shape and the limiter can be tested without
 * binding a port; `reportsLive.test.ts` holds the route itself.
 */

import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import {
  CLIENT_REPORT_KINDS,
  type ClientReport,
  type ClientReportKind,
  REPORT_PATH,
  REPORTS,
} from '@echoes/shared';
import { logFailure } from '../log.ts';

/**
 * A Colyseus room id: nanoid's alphabet, nine characters by default. Matched
 * rather than trusted because it goes into a log line and a room lookup.
 */
const ROOM_ID = /^[A-Za-z0-9_-]{1,32}$/;

/** A build tag: a commit sha, a version or `dev`. */
const BUILD = /^[A-Za-z0-9._-]{1,64}$/;

const isKind = (value: unknown): value is ClientReportKind =>
  CLIENT_REPORT_KINDS.includes(value as ClientReportKind);

/**
 * Read a parsed body as a report, or return `null` for one the route refuses.
 *
 * Over-long text is cut rather than refused: the client trims to the same
 * bounds, so only a client that is not this one sends more, and the first
 * characters of a stack are still the useful ones.
 */
export function parseClientReport(body: unknown): ClientReport | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const { kind, message, stack, build, roomId } = body as Record<string, unknown>;
  if (!isKind(kind)) return null;
  if (typeof message !== 'string' || typeof stack !== 'string') return null;
  if (typeof build !== 'string' || !BUILD.test(build)) return null;
  if (roomId !== null && (typeof roomId !== 'string' || !ROOM_ID.test(roomId))) return null;
  return {
    kind,
    message: message.slice(0, REPORTS.MAX_MESSAGE_CHARS),
    stack: stack.slice(0, REPORTS.MAX_STACK_CHARS),
    build,
    roomId,
  };
}

/** A fixed-window count per address. */
export class ReportLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly maxPerWindow: number = REPORTS.MAX_PER_WINDOW,
    private readonly windowMs: number = REPORTS.WINDOW_MS
  ) {}

  /** Spend one report for `address` at `now`; false when its window is spent. */
  allow(address: string, now: number): boolean {
    const window = this.windows.get(address);
    if (window === undefined || now - window.start >= this.windowMs) {
      if (window === undefined && this.windows.size >= REPORTS.MAX_TRACKED_ADDRESSES)
        this.prune(now);
      this.windows.set(address, { start: now, count: 1 });
      return true;
    }
    if (window.count >= this.maxPerWindow) return false;
    window.count += 1;
    return true;
  }

  /** How many addresses are remembered, for the bound's test. */
  get tracked(): number {
    return this.windows.size;
  }

  private prune(now: number): void {
    for (const [address, window] of this.windows) {
      if (now - window.start >= this.windowMs) this.windows.delete(address);
    }
    if (this.windows.size >= REPORTS.MAX_TRACKED_ADDRESSES) this.windows.clear();
  }
}

/** The seed of the live room `roomId` names, or `null` once it is gone. */
export type SeedLookup = (roomId: string) => number | null;

/**
 * Mount the route on `app`.
 *
 * `trust proxy` is set to private addresses only, because the playtest host puts
 * a TLS proxy in front (#1597) and every request then arrives from it:
 * without this, every stranger shares one address and one window. A peer on a
 * private network is the proxy, whose `X-Forwarded-For` is believed; a peer on
 * the internet is the client, whose header is not, so it cannot buy itself a
 * fresh window by forging one.
 */
export function mountReports(
  app: Application,
  seedOf: SeedLookup,
  limiter: ReportLimiter = new ReportLimiter(),
  now: () => number = Date.now
): void {
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.post(
    REPORT_PATH,
    // Before the body is read, so a refused address costs no parse.
    (req: Request, res: Response, next: NextFunction) => {
      if (limiter.allow(req.ip ?? 'unknown', now())) {
        next();
        return;
      }
      res.status(429).json({ error: 'too many reports' });
    },
    express.json({ limit: REPORTS.MAX_BODY_BYTES }),
    (req: Request, res: Response) => {
      const report = parseClientReport(req.body);
      if (report === null) {
        res.status(400).json({ error: 'not a report' });
        return;
      }
      logFailure({
        source: 'client',
        kind: report.kind,
        build: report.build,
        room: report.roomId,
        seed: report.roomId === null ? null : seedOf(report.roomId),
        message: report.message,
        stack: report.stack,
      });
      res.status(204).end();
    },
    // body-parser's own refusals — too large, not JSON — answered as this
    // route's other refusals are, rather than by express's HTML error page.
    (error: { status?: number }, _req: Request, res: Response, next: NextFunction) => {
      if (error.status === 413) res.status(413).json({ error: 'report too large' });
      else if (error.status === 400) res.status(400).json({ error: 'not a report' });
      else next(error);
    }
  );
}
