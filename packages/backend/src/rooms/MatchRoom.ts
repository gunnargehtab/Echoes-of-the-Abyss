/**
 * MatchRoom — the network boundary around one simulation.
 *
 * Responsibilities are kept narrow on purpose: translate client messages into
 * validated commands, drive the simulation clock, and fan resolved snapshots
 * out to the players who earned them. All game rules live in sim/.
 */

// Imported from @colyseus/core rather than the `colyseus` meta-package: the
// latter re-exports via __exportStar, which Node's static CJS export detection
// cannot see, so `import { Room } from 'colyseus'` fails at runtime under an
// unbundled ESM loader (the dev server) while working fine once bundled.
import { Room, type Client } from '@colyseus/core';
import { Faction, SIM, type EchoSnapshot } from '@echoes/shared';
import { Match } from '../sim/match.ts';
import { MatchState, PlayerState } from '../schema/MatchState.ts';

interface MoveMessage {
  unitIds: number[];
  x: number;
  y: number;
}

interface SilentRunningMessage {
  unitIds: number[];
  active: boolean;
}

interface PingMessage {
  unitId: number;
}

const FACTION_BY_SLOT: Faction[] = [
  Faction.Bathyarch,
  Faction.Pelagia,
  Faction.Directorate,
  Faction.Hadron,
];

export class MatchRoom extends Room<MatchState> {
  maxClients = 4;

  private readonly match = new Match();
  private readonly slotBySession = new Map<string, number>();
  private nextSlot = 0;

  override onCreate(): void {
    this.setState(new MatchState());

    this.onMessage('move', (client, message: MoveMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.x) || !Number.isFinite(message.y)) return;
      for (const unitId of message.unitIds) {
        // Ownership is re-checked inside the sim; the client is never trusted
        // to only send units it owns.
        this.match.orderMove(slot, unitId, message.x, message.y);
      }
    });

    this.onMessage('silent', (client, message: SilentRunningMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      for (const unitId of message.unitIds) {
        this.match.setSilentRunning(slot, unitId, Boolean(message.active));
      }
    });

    this.onMessage('ping', (client, message: PingMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Number.isFinite(message?.unitId)) return;
      this.match.activeSonar(slot, message.unitId);
    });

    // Colyseus drives wall-clock; Match converts it into fixed steps itself.
    this.setSimulationInterval((deltaMs) => this.update(deltaMs), 1000 / SIM.TICK_HZ);
  }

  override onJoin(client: Client, options?: { name?: string }): void {
    const slot = this.nextSlot++;
    const faction = FACTION_BY_SLOT[slot % FACTION_BY_SLOT.length]!;
    this.slotBySession.set(client.sessionId, slot);

    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.name = options?.name?.slice(0, 32) || `Commander ${slot + 1}`;
    player.slot = slot;
    player.faction = faction;
    this.state.players.set(client.sessionId, player);

    this.match.addPlayer(slot, faction);

    // Terrain is public information — it is the map. Sent once on join rather
    // than per-tick because it does not change (Coral Ruins aside; see
    // docs/environments.md).
    client.send('terrain', this.match.world.terrain.serialize());
    client.send('assigned', { slot, faction });
  }

  override onLeave(client: Client): void {
    const slot = this.slotBySession.get(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = false;
    if (slot !== undefined) this.match.removePlayer(slot);
    this.slotBySession.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  override onDispose(): void {
    console.log(
      `[MatchRoom ${this.roomId}] disposed at tick ${this.match.tick}; ` +
        `worst Echo pass ${this.match.worstEchoPassMs.toFixed(3)} ms ` +
        `(budget ${SIM.ECHO_BUDGET_MS} ms)`
    );
  }

  private update(deltaMs: number): void {
    const snapshots = this.match.update(deltaMs);
    if (snapshots === null) return;

    this.state.tick = this.match.tick;

    for (const client of this.clients) {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined) continue;
      const snapshot: EchoSnapshot | undefined = snapshots.get(slot);
      if (snapshot === undefined) continue;
      client.send('echo', snapshot);
    }
  }
}
