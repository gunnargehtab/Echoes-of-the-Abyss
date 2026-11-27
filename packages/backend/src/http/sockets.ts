/**
 * Admission to the socket: how many WebSockets one address may hold (#1961).
 *
 * A room costs the thread that steps every match only while a socket sits in
 * it, so the open socket is what an attacker spends (`docs/threat-model.md`,
 * TM-003). `MATCHMAKING` bounds how fast rooms are made; this bounds how many
 * sockets one address keeps open, and `rooms/admission.ts` how many rooms they
 * may hold.
 *
 * Counted at the HTTP upgrade, before Colyseus sees the request, for the reason
 * `guardMatchmaking` wraps the request listeners: a listener added beside
 * Colyseus's could answer 429 but not stop the handshake it runs anyway. The
 * count is freed when the TCP socket closes, which is the WebSocket closing,
 * however it closed.
 *
 * It also settles which address a room sees. Colyseus resolves `context.ip`
 * from `X-Real-IP`, then `X-Forwarded-For`, from anyone, so a script could name
 * a fresh address on every join. The upgrade's `X-Real-IP` is overwritten here
 * with the address `proxy-addr` resolves past the trusted proxies only, the one
 * the matchmaking limit and the report route count, and Colyseus reads that.
 */

import type { IncomingMessage, Server } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import type { Duplex } from 'node:stream';
import { ADMISSION } from '@echoes/shared';
import { clientAddress } from './matchmaking.ts';

type UpgradeListener = (req: IncomingMessage, socket: Duplex, head: Buffer) => void;

/** Open sockets per address; an address leaves the table at zero. */
export class SocketCounter {
  private readonly open = new Map<string, number>();

  constructor(private readonly maxPerAddress: number) {}

  /** Take one socket for `address`; false when it already holds the cap. */
  take(address: string): boolean {
    const held = this.open.get(address) ?? 0;
    if (held >= this.maxPerAddress) return false;
    this.open.set(address, held + 1);
    return true;
  }

  /** Give one back. */
  release(address: string): void {
    const held = this.open.get(address) ?? 0;
    if (held <= 1) this.open.delete(address);
    else this.open.set(address, held - 1);
  }

  /** Sockets `address` holds open. */
  heldBy(address: string): number {
    return this.open.get(address) ?? 0;
  }

  /** Addresses holding any socket, for the bound's test. */
  get tracked(): number {
    return this.open.size;
  }
}

/**
 * Put the cap in front of every upgrade listener `server` holds. A refusal is
 * a bare 429 and a closed socket: the handshake never starts, so nothing in a
 * room runs for it.
 */
export function guardSockets(
  server: Server | HttpsServer,
  counter: SocketCounter = new SocketCounter(ADMISSION.MAX_SOCKETS_PER_ADDRESS)
): void {
  const listeners = server.listeners('upgrade') as UpgradeListener[];
  server.removeAllListeners('upgrade');
  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const address = clientAddress(req);
    if (!counter.take(address)) {
      socket.end(
        'HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'
      );
      return;
    }
    socket.once('close', () => counter.release(address));
    req.headers['x-real-ip'] = address;
    for (const listener of listeners) listener.call(server, req, socket, head);
  });
}
