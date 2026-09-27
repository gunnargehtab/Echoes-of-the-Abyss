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
  describeCorsPolicy,
  isOriginAllowed,
  resolveCorsPolicy,
} from './http/cors.ts';

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

export const server = defineServer({
  rooms: {
    // Filtered by map and mission so matchmaking cannot put a player in the
    // wrong authored water.
    match: defineRoom(MatchRoom).filterBy(['mapId', 'missionId']),
  },
  transport: new WebSocketTransport(),
  express: (app) => {
    /**
     * CORS for HTTP matchmaking and listing requests. A disallowed origin gets
     * no allow-origin header, so the browser reports the blocked origin.
     */
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (corsPolicy.kind === 'any') {
        res.header('Access-Control-Allow-Origin', '*');
      } else if (typeof origin === 'string' && isOriginAllowed(corsPolicy, origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
      }
      res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });

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
        console.error('Failed to list public matches:', error);
        res.status(500).json({ error: 'Match listings are unavailable.' });
      }
    });
  },
});

await server.listen(PORT);
console.log(`Echoes of the Abyss server listening on :${PORT}`);
console.log(`  simulation ${SIM.TICK_HZ} Hz | Echo Layer ${SIM.ECHO_HZ} Hz`);
console.log(`  origins: ${describeCorsPolicy(corsPolicy)}`);
