/**
 * Game server entry point.
 *
 * See SETUP.md for how to run this, and docs/tech-stack.md for why the
 * simulation is authoritative here rather than shared with the client.
 */

import express from 'express';
import { createServer } from 'http';
// See MatchRoom.ts for why this is @colyseus/core and not `colyseus`.
import { Server } from '@colyseus/core';
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

const app = express();

/**
 * CORS for the matchmaking endpoint. The WebSocket upgrade itself is not
 * subject to CORS, but colyseus.js POSTs to /matchmake/ first.
 *
 * A disallowed origin gets no `Access-Control-Allow-Origin` header rather than
 * an error status: that is what the fetch spec asks for, and it is also the
 * more useful failure, since the browser then reports a CORS violation naming
 * the origin instead of a 403 the client would have to guess the cause of.
 */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsPolicy.kind === 'any') {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (typeof origin === 'string' && isOriginAllowed(corsPolicy, origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    // The allowed origin varies by request, so a shared cache must not reuse
    // one origin's response for another.
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

const httpServer = createServer(app);
// Transport is constructed explicitly: passing `server` straight to Server is
// deprecated in Colyseus 0.15 and removed later.
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Filtered by map, so `joinOrCreate` never drops a player who asked for one
// archetype into a match already running on another. Without it the first
// room created wins every subsequent join regardless of what was requested.
//
// Mission id is the second key for the same reason and a sharper one: a
// mission is a single-seat authored scenario, so a skirmish player landing in
// one — or a commander starting the prologue and being handed somebody else's
// running match — is not a mismatched preference but a broken game. The client
// always sends a string ('' for a skirmish), because two encodings of "no
// mission" would split the skirmish pool in half.
gameServer.define('match', MatchRoom).filterBy(['mapId', 'missionId']);

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

httpServer.listen(PORT, () => {
  console.log(`Echoes of the Abyss server listening on :${PORT}`);
  console.log(`  simulation ${SIM.TICK_HZ} Hz | Echo Layer ${SIM.ECHO_HZ} Hz`);
  console.log(`  origins: ${describeCorsPolicy(corsPolicy)}`);
});
