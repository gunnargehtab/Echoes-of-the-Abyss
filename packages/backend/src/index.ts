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

const PORT = Number(process.env.PORT ?? 3000);

const app = express();

/**
 * Permissive CORS so the Vite dev server on :5173 can reach the matchmaking
 * endpoint. The WebSocket upgrade itself is not subject to CORS, but
 * colyseus.js POSTs to /matchmake/ first.
 *
 * DEV ONLY: lock this to known origins before this is exposed anywhere real.
 */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*');
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

gameServer.define('match', MatchRoom);

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
});
