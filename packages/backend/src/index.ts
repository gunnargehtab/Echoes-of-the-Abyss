/**
 * Game server entry point.
 *
 * See SETUP.md for how to run this, and docs/tech-stack.md for why the
 * simulation is authoritative here rather than shared with the client.
 */

import { defineRoom, defineServer, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { SIM } from '@echoes/shared';
import { MatchRoom } from './rooms/MatchRoom.ts';
import {
  CorsConfigError,
  type CorsPolicy,
  corsHeadersFor,
  describeCorsPolicy,
  guardOrigins,
  resolveCorsPolicy,
} from './http/cors.ts';
import { mountReports } from './http/reports.ts';
import { describeThrown, logFailure } from './log.ts';

const PORT = Number(process.env.PORT ?? 3000);

/**
 * Resolved before anything binds a port, because in production an unset
 * CORS_ORIGIN is fatal — see http/cors.ts for why that is a throw and not a
 * warning. Handling it here rather than letting it escape keeps the reason on
 * one line instead of under a stack trace.
 */
function loadCorsPolicy(): CorsPolicy {
  try {
    return resolveCorsPolicy(process.env);
  } catch (error) {
    if (!(error instanceof CorsConfigError)) throw error;
    console.error(`Refusing to start: ${error.message}`);
    process.exit(1);
  }
}

const corsPolicy = loadCorsPolicy();

// A throw that escapes every room, as a structured line (#1576). The monitor
// rather than a handler: Colyseus's `registerGracefulShutdown` owns the
// `uncaughtException` handler and the exit it makes, and the monitor runs
// before it without changing either. An unhandled rejection arrives here too,
// as Node raises it by default.
process.on('uncaughtExceptionMonitor', (error, origin) => {
  logFailure({ source: 'server', kind: origin, room: null, ...describeThrown(error) });
});

// The one CORS decision. Colyseus prepends a request listener to the HTTP
// server that, on every request and before express sees it, sets
// `DEFAULT_CORS_HEADERS` merged with `controller.getCorsHeaders` and answers
// every preflight itself. Its defaults allow origin `*` with credentials, and
// its `getCorsHeaders` echoed whatever Origin the request carried, so the lock
// the express middleware used to apply never held on any route, `/matchmake`
// included (#1301). The controller asks the policy now, and its defaults
// carry no origin of their own.
const colyseusDefaults = matchMaker.controller.DEFAULT_CORS_HEADERS as Record<string, string>;
delete colyseusDefaults['Access-Control-Allow-Origin'];
delete colyseusDefaults['Access-Control-Allow-Credentials'];
matchMaker.controller.getCorsHeaders = (headers) =>
  corsHeadersFor(corsPolicy, headers.get('origin'));

export const server = defineServer({
  rooms: {
    // Filtered by map and mission so matchmaking cannot put a player in the
    // wrong authored water.
    match: defineRoom(MatchRoom).filterBy(['mapId', 'missionId']),
  },
  transport: new WebSocketTransport(),
  express: (app) => {
    app.get('/', (_req, res) => {
      res.send('Echoes of the Abyss - Server running');
    });

    app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        tickHz: SIM.TICK_HZ,
        echoHz: SIM.ECHO_HZ,
      });
    });

    // Colyseus 0.16 removed getAvailableRooms() because it exposed room data
    // indiscriminately. Return only the metadata needed for public match rows.
    app.get('/rooms/match', async (_req, res) => {
      try {
        const rooms = await matchMaker.query({
          name: 'match',
          locked: false,
          private: false,
          unlisted: false,
        });
        res.setHeader('Cache-Control', 'no-store');
        res.json(
          rooms.map(({ roomId, metadata }) => ({
            roomId,
            metadata: {
              mapId: metadata?.mapId,
              mapName: metadata?.mapName,
              seats: metadata?.seats,
              filled: metadata?.filled,
            },
          }))
        );
      } catch (error) {
        logFailure({
          source: 'server',
          kind: 'GET /rooms/match',
          room: null,
          ...describeThrown(error),
        });
        res.status(500).json({ error: 'Match listings are unavailable.' });
      }
    });

    // A hosted client's uncaught errors (#1576). The seed is looked up here,
    // from the room the report names, because the client is never sent it.
    mountReports(app, (roomId) => {
      const room = matchMaker.getLocalRoomById(roomId);
      return room instanceof MatchRoom ? room.seed : null;
    });
  },
});

await server.listen(PORT);
// The headers above stop a refused page reading an answer; they do not stop
// the server acting on a POST that needed no preflight (#1310). Colyseus binds
// its request listener inside `listen`, so the guard wraps it only now.
const httpServer = server.transport.server;
if (httpServer === undefined) throw new Error('The WebSocket transport has no HTTP server.');
guardOrigins(httpServer, corsPolicy);
console.log(`Echoes of the Abyss server listening on :${PORT}`);
console.log(`  simulation ${SIM.TICK_HZ} Hz | Echo Layer ${SIM.ECHO_HZ} Hz`);
console.log(`  origins: ${describeCorsPolicy(corsPolicy)}`);
