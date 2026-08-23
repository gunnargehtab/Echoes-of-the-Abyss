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
import {
  Faction,
  HarvestThrottle,
  SIM,
  StructureKind,
  UnitKind,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../sim/match.ts';
import { DEFAULT_MAP_ID, mapById } from '../sim/maps/index.ts';
import { MatchState, PlayerState } from '../schema/MatchState.ts';

interface MoveMessage {
  unitIds: number[];
  x: number;
  y: number;
  /** Append to the unit's plan instead of replacing it. */
  queued?: boolean;
}

interface SilentRunningMessage {
  unitIds: number[];
  active: boolean;
}

interface DepthMessage {
  unitIds: number[];
  /** Ordered depth in metres. Validated and range-checked in the sim. */
  depth: number;
}

interface PingMessage {
  unitId: number;
}

interface AttackMessage {
  unitIds: number[];
  /** Opaque per-observer contact handle, not an entity id. */
  contactId: number;
  queued?: boolean;
}

interface HarvestMessage {
  unitIds: number[];
  nodeId: number;
  queued?: boolean;
}

interface ThrottleMessage {
  unitIds: number[];
  throttle: HarvestThrottle;
}

interface BuildMessage {
  kind: StructureKind;
  x: number;
  y: number;
}

interface ProduceMessage {
  structureId: number;
  kind: UnitKind;
}

const FACTION_BY_SLOT: Faction[] = [
  Faction.Bathyarch,
  Faction.Pelagia,
  Faction.Directorate,
  Faction.Hadron,
];

/** Options a room may be created with. `mapId` selects the authored map. */
export interface MatchRoomOptions {
  mapId?: string;
}

export class MatchRoom extends Room<MatchState> {
  maxClients = 4;

  private match!: Match;
  private readonly slotBySession = new Map<string, number>();
  private nextSlot = 0;

  override onCreate(options?: MatchRoomOptions): void {
    // An unknown id falls back to the default rather than failing the room:
    // a client asking for a map this build does not have should get a game,
    // and the map it actually got is sent on join either way.
    const map = mapById(options?.mapId ?? DEFAULT_MAP_ID) ?? mapById(DEFAULT_MAP_ID)!;
    this.match = new Match(map);
    // A map's spawn list is its player count.
    this.maxClients = Math.min(this.maxClients, map.spawns.length);

    this.setState(new MatchState());

    this.onMessage('move', (client, message: MoveMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.x) || !Number.isFinite(message.y)) return;
      for (const unitId of message.unitIds) {
        // Ownership is re-checked inside the sim; the client is never trusted
        // to only send units it owns.
        this.match.orderMove(slot, unitId, message.x, message.y, message.queued === true);
      }
    });

    this.onMessage('silent', (client, message: SilentRunningMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      for (const unitId of message.unitIds) {
        this.match.setSilentRunning(slot, unitId, Boolean(message.active));
      }
    });

    this.onMessage('depth', (client, message: DepthMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.depth)) return;
      for (const unitId of message.unitIds) {
        // Range and ownership are both re-checked inside the sim; an
        // out-of-range depth is refused there rather than clamped here.
        this.match.orderDepth(slot, unitId, message.depth);
      }
    });

    this.onMessage('ping', (client, message: PingMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Number.isFinite(message?.unitId)) return;
      this.match.activeSonar(slot, message.unitId);
    });

    this.onMessage('attack', (client, message: AttackMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.contactId)) return;
      for (const unitId of message.unitIds) {
        this.match.orderAttackContact(slot, unitId, message.contactId, message.queued === true);
      }
    });

    this.onMessage('harvest', (client, message: HarvestMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.nodeId)) return;
      for (const unitId of message.unitIds) {
        this.match.orderHarvest(slot, unitId, message.nodeId, message.queued === true);
      }
    });

    this.onMessage('throttle', (client, message: ThrottleMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.throttle)) return;
      for (const unitId of message.unitIds) {
        this.match.setThrottle(slot, unitId, message.throttle);
      }
    });

    this.onMessage('build', (client, message: BuildMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Number.isFinite(message?.kind)) return;
      if (!Number.isFinite(message.x) || !Number.isFinite(message.y)) return;
      this.match.build(slot, message.kind, message.x, message.y);
    });

    this.onMessage('produce', (client, message: ProduceMessage) => {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined || !Number.isFinite(message?.structureId)) return;
      if (!Number.isFinite(message.kind)) return;
      this.match.produce(slot, message.structureId, message.kind);
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
    // Which map this is. Public by definition — both players are standing on
    // it — and the client needs it to name the ground in the HUD.
    client.send('map', {
      id: this.match.map.id,
      name: this.match.map.name,
      idealUse: this.match.map.idealUse,
      widthM: this.match.map.widthM,
      heightM: this.match.map.heightM,
      hazards: this.match.map.hazards,
    });
    // Nodule fields are map data too — every commander has the same survey
    // charts. Depletion is never broadcast; see docs/economy.md.
    client.send('nodes', this.match.resourceNodes);
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

  /** Broadcast the result exactly once. */
  private gameOverSent = false;

  private update(deltaMs: number): void {
    const snapshots = this.match.update(deltaMs);

    if (!this.gameOverSent && this.match.result !== null) {
      this.gameOverSent = true;
      this.broadcast('gameOver', this.match.result);
    }

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
