/**
 * MatchRoom — the network boundary around one simulation.
 *
 * Responsibilities are kept narrow on purpose: translate client messages into
 * validated commands, drive the simulation clock, and fan resolved snapshots
 * out to the players who earned them. All game rules live in sim/.
 *
 * The room also owns the *lifecycle* around a match — lobby, play, result,
 * rematch (docs/tech-stack.md "Match lifecycle"). That is deliberately here rather than in
 * sim/: `Match` knows about hulls and sound, and nothing about sockets.
 */

// Imported from @colyseus/core rather than the `colyseus` meta-package: the
// latter re-exports via __exportStar, which Node's static CJS export detection
// cannot see, so `import { Room } from 'colyseus'` fails at runtime under an
// unbundled ESM loader (the dev server) while working fine once bundled.
import { Room, type Client } from '@colyseus/core';
import {
  AiDifficulty,
  Faction,
  HarvestThrottle,
  LIFECYCLE,
  MatchPhase,
  SIM,
  StructureKind,
  UnitKind,
  type EchoSnapshot,
} from '@echoes/shared';
import { AiSeat, briefingFor } from '../ai/seat.ts';
import { Match } from '../sim/match.ts';
import { DEFAULT_MAP_ID, mapById } from '../sim/maps/index.ts';
import type { MapDefinition } from '../sim/maps/types.ts';
import { isSimulated } from '../sim/systems/hazards.ts';
import { MatchState, PlayerState } from '../schema/MatchState.ts';
import {
  allocateSlot,
  canChooseFaction,
  defaultFaction,
  everyoneIsReady,
  type RosterEntry,
} from './lobby.ts';

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

interface FactionMessage {
  faction: Faction;
}

interface ReadyMessage {
  ready?: boolean;
}

interface AddAiMessage {
  difficulty?: AiDifficulty;
}

interface AiSeatMessage {
  sessionId: string;
  difficulty?: AiDifficulty;
}

/**
 * An AI seat's stand-in session id.
 *
 * Slot-derived rather than random so the same seat keeps the same id across a
 * rematch, and prefixed so nothing can mistake it for a socket: no client ever
 * holds one, so an AI row can never be commanded from the wire.
 */
const aiSessionId = (slot: number): string => `ai:${slot}`;

/** Options a room may be created with. `mapId` selects the authored map. */
export interface MatchRoomOptions {
  mapId?: string;
}

export class MatchRoom extends Room<MatchState> {
  maxClients = 4;

  private match!: Match;
  private map!: MapDefinition;
  private readonly slotBySession = new Map<string, number>();
  /** Live AI commanders, by slot. Rebuilt from the roster on every start. */
  private readonly aiSeats = new Map<number, AiSeat>();

  override onCreate(options?: MatchRoomOptions): void {
    // An unknown id falls back to the default rather than failing the room:
    // a client asking for a map this build does not have should get a game,
    // and the map it actually got is sent on join either way.
    this.map = mapById(options?.mapId ?? DEFAULT_MAP_ID) ?? mapById(DEFAULT_MAP_ID)!;
    this.match = new Match(this.map);
    // A map's spawn list is its player count.
    this.maxClients = Math.min(this.maxClients, this.map.spawns.length);

    this.setState(new MatchState());
    this.state.mapId = this.map.id;

    this.onMessage('move', (client, message: MoveMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.x) || !Number.isFinite(message.y)) return;
      for (const unitId of message.unitIds) {
        // Ownership is re-checked inside the sim; the client is never trusted
        // to only send units it owns.
        this.match.orderMove(slot, unitId, message.x, message.y, message.queued === true);
      }
    });

    this.onMessage('silent', (client, message: SilentRunningMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      for (const unitId of message.unitIds) {
        this.match.setSilentRunning(slot, unitId, Boolean(message.active));
      }
    });

    this.onMessage('depth', (client, message: DepthMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.depth)) return;
      for (const unitId of message.unitIds) {
        // Range and ownership are both re-checked inside the sim; an
        // out-of-range depth is refused there rather than clamped here.
        this.match.orderDepth(slot, unitId, message.depth);
      }
    });

    this.onMessage('ping', (client, message: PingMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Number.isFinite(message?.unitId)) return;
      this.match.activeSonar(slot, message.unitId);
    });

    this.onMessage('attack', (client, message: AttackMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.contactId)) return;
      for (const unitId of message.unitIds) {
        this.match.orderAttackContact(slot, unitId, message.contactId, message.queued === true);
      }
    });

    this.onMessage('harvest', (client, message: HarvestMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.nodeId)) return;
      for (const unitId of message.unitIds) {
        this.match.orderHarvest(slot, unitId, message.nodeId, message.queued === true);
      }
    });

    this.onMessage('throttle', (client, message: ThrottleMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.throttle)) return;
      for (const unitId of message.unitIds) {
        this.match.setThrottle(slot, unitId, message.throttle);
      }
    });

    this.onMessage('build', (client, message: BuildMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Number.isFinite(message?.kind)) return;
      if (!Number.isFinite(message.x) || !Number.isFinite(message.y)) return;
      this.match.build(slot, message.kind, message.x, message.y);
    });

    this.onMessage('produce', (client, message: ProduceMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Number.isFinite(message?.structureId)) return;
      if (!Number.isFinite(message.kind)) return;
      this.match.produce(slot, message.structureId, message.kind);
    });

    // --- Lifecycle messages ------------------------------------------------

    this.onMessage('faction', (client, message: FactionMessage) => {
      if (this.state.phase !== MatchPhase.Lobby) return;
      const player = this.state.players.get(client.sessionId);
      if (player === undefined || !Number.isFinite(message?.faction)) return;
      const faction = Math.trunc(message.faction);
      // Uniqueness is enforced here and nowhere else — see lobby.ts.
      if (!canChooseFaction(this.roster(), client.sessionId, faction)) return;

      player.faction = faction;
      // Changing your pick un-readies you. Otherwise "everyone is ready" could
      // be true of a roster nobody has looked at since it last changed.
      player.ready = false;
      client.send('assigned', { slot: player.slot, faction: player.faction });
    });

    this.onMessage('ready', (client, message: ReadyMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (player === undefined) return;
      // Ready means "start" in the lobby and "rematch" after a result. Same
      // question, same flag, one code path — see PlayerState.ready.
      if (this.state.phase === MatchPhase.Playing) return;
      player.ready = message?.ready !== false;
      this.startIfEveryoneIsReady();
    });

    this.onMessage('addAi', (client, message: AddAiMessage) => {
      if (this.state.phase !== MatchPhase.Lobby) return;
      if (!this.state.players.has(client.sessionId)) return;
      this.addAiSeat(message?.difficulty);
    });

    this.onMessage('removeAi', (client, message: AiSeatMessage) => {
      if (this.state.phase !== MatchPhase.Lobby) return;
      if (!this.state.players.has(client.sessionId)) return;
      const seat = this.state.players.get(message?.sessionId ?? '');
      // Only an AI row: this must never become a kick button for a person.
      if (seat === undefined || !seat.isAi) return;
      this.releasePlayer(seat.sessionId);
      this.startIfEveryoneIsReady();
    });

    this.onMessage('aiDifficulty', (client, message: AiSeatMessage) => {
      if (this.state.phase !== MatchPhase.Lobby) return;
      if (!this.state.players.has(client.sessionId)) return;
      const seat = this.state.players.get(message?.sessionId ?? '');
      if (seat === undefined || !seat.isAi) return;
      const difficulty = Math.trunc(message?.difficulty ?? AiDifficulty.Recruit);
      if (difficulty !== AiDifficulty.Recruit && difficulty !== AiDifficulty.Veteran) return;
      seat.difficulty = difficulty;
    });

    // Colyseus drives wall-clock; Match converts it into fixed steps itself.
    this.setSimulationInterval((deltaMs) => this.update(deltaMs), 1000 / SIM.TICK_HZ);
  }

  /**
   * The slot allowed to issue a game command right now.
   *
   * Undefined outside a running match, which is the only reason this is not
   * just a map lookup: a queued-up "produce" fired during the lobby would
   * otherwise reach a `Match` that has not spawned anybody's base yet.
   */
  private commandSlot(client: Client): number | undefined {
    if (this.state.phase !== MatchPhase.Playing) return undefined;
    return this.slotBySession.get(client.sessionId);
  }

  /** The roster, as the plain rows lobby.ts reasons over. */
  private roster(): RosterEntry[] {
    const rows: RosterEntry[] = [];
    this.state.players.forEach((player) => {
      rows.push({
        sessionId: player.sessionId,
        slot: player.slot,
        faction: player.faction as Faction,
        ready: player.ready,
        connected: player.connected,
        isAi: player.isAi,
      });
    });
    return rows;
  }

  /**
   * Seat a commander.
   *
   * It takes a slot and a navy exactly as a person does, and is marked ready
   * on arrival because there is nothing for it to wait for. Everything else
   * about it — what it can see, what it can order — is identical to a human
   * seat; see packages/backend/src/ai/types.ts.
   */
  private addAiSeat(difficulty?: AiDifficulty): void {
    const slot = allocateSlot(this.roster(), this.maxClients);
    if (slot === undefined) return;

    const seat = new PlayerState();
    seat.sessionId = aiSessionId(slot);
    seat.slot = slot;
    seat.faction = defaultFaction(this.roster());
    seat.isAi = true;
    seat.connected = true;
    seat.ready = true;
    seat.difficulty =
      difficulty === AiDifficulty.Veteran ? AiDifficulty.Veteran : AiDifficulty.Recruit;
    seat.name = `${seat.difficulty === AiDifficulty.Veteran ? 'Veteran' : 'Recruit'} ${slot + 1}`;
    this.state.players.set(seat.sessionId, seat);
    this.startIfEveryoneIsReady();
  }

  override onJoin(client: Client, options?: { name?: string }): void {
    // A running room is locked, so joinOrCreate routes a late arrival to a
    // fresh one. This is the belt to that braces: a direct joinById to a room
    // mid-match is refused rather than dropped into a game already in progress.
    if (this.state.phase !== MatchPhase.Lobby) {
      throw new Error('This match has already started.');
    }
    const slot = allocateSlot(this.roster(), this.maxClients);
    if (slot === undefined) throw new Error('This match is full.');

    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.name = options?.name?.slice(0, 32) || `Commander ${slot + 1}`;
    player.slot = slot;
    player.faction = defaultFaction(this.roster());
    this.state.players.set(client.sessionId, player);
    this.slotBySession.set(client.sessionId, slot);

    this.sendMapData(client);
    client.send('assigned', { slot, faction: player.faction });
  }

  /**
   * Everything about the ground, which is public by definition — both
   * commanders are standing on it — and true before a match starts, so the
   * lobby can name and preview the map it is about to be played on.
   */
  private sendMapData(client: Client): void {
    // Terrain is public information — it is the map. Sent once rather than
    // per-tick because it does not change (Coral Ruins aside; see
    // docs/environments.md).
    client.send('terrain', this.match.world.terrain.serialize());
    client.send('map', {
      id: this.map.id,
      name: this.map.name,
      idealUse: this.map.idealUse,
      widthM: this.map.widthM,
      heightM: this.map.heightM,
      // A map's spawn list is its player count, so this is how many seats the
      // room has — the number the lobby needs to grey out "add opponent".
      seats: this.map.spawns.length,
      // Marked so the client can draw an inert site as ground and leave the
      // simulated ones to the live hazard layer, rather than drawing both.
      hazards: this.map.hazards.map((site) => ({
        ...site,
        simulated: isSimulated(site.kind),
      })),
    });
  }

  /**
   * Per-match data: which entity ids the nodule fields have in *this* match,
   * and which slot and navy the client ended up commanding.
   *
   * Re-sent on every start and on every reconnection, because a rematch
   * rebuilds the world and the ids do not survive it.
   */
  private sendMatchData(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (player === undefined) return;
    // Nodule fields are map data too — every commander has the same survey
    // charts. Depletion is never broadcast; see docs/economy.md.
    client.send('nodes', this.match.resourceNodes);
    client.send('assigned', { slot: player.slot, faction: player.faction });
  }

  /**
   * Start once nobody is being waited on.
   *
   * Disconnected players are not counted: a lobby whose fourth member closed
   * their tab should still be startable by the three who did not.
   */
  private startIfEveryoneIsReady(): void {
    if (!everyoneIsReady(this.roster(), LIFECYCLE.MIN_PLAYERS)) return;

    if (this.state.phase === MatchPhase.Ended) {
      // A rematch is a new world on the same ground with the same roster —
      // rebuilt rather than reset, because a Match owns an ECS world and
      // unwinding one in place is how stale entities survive into game two.
      this.match = new Match(this.map);
    }
    this.startMatch();
  }

  private startMatch(): void {
    const players = [...this.state.players.values()].sort((a, b) => a.slot - b.slot);
    // A rematch is a new world, so last match's commanders are holding entity
    // ids that no longer mean anything. They are rebuilt, never reused.
    this.aiSeats.clear();
    for (const player of players) {
      this.slotBySession.set(player.sessionId, player.slot);
      this.match.addPlayer(player.slot, player.faction as Faction);
      player.ready = false;
      if (player.isAi) {
        this.aiSeats.set(
          player.slot,
          new AiSeat(
            this.match,
            briefingFor(
              this.match,
              player.slot,
              player.faction as Faction,
              player.difficulty as AiDifficulty
            )
          )
        );
      }
    }

    this.state.phase = MatchPhase.Playing;
    this.state.winnerSlot = -1;
    this.state.tick = 0;
    this.gameOverSent = false;
    this.postMatchTimeout?.clear();
    this.postMatchTimeout = null;
    // Nobody joins a match in progress. Unlocked again only if the room
    // returns to a lobby, which today it does not — a rematch keeps its roster.
    this.lock();

    for (const client of this.clients) this.sendMatchData(client);
    this.broadcast('phase', { phase: MatchPhase.Playing });
  }

  /**
   * A client dropped.
   *
   * In the lobby, that is simply a departure: the slot is freed and someone
   * else can take it. Mid-match it is not, because the fleet is still in the
   * water — see the grace window below.
   */
  override async onLeave(client: Client, consented?: boolean): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (player === undefined) return;
    player.connected = false;

    if (this.state.phase !== MatchPhase.Playing) {
      this.releasePlayer(client.sessionId);
      // Someone leaving may be the last thing a ready lobby was waiting on.
      this.startIfEveryoneIsReady();
      return;
    }

    if (consented === true) {
      // Walking out of a live match is a resignation, not a disconnection.
      // Without this the survivor's opponent is gone from the roster but not
      // beaten, and the victory check — which needs two rosters — never fires,
      // so the winner sits in a won game waiting for nobody.
      this.forfeit(client.sessionId);
      return;
    }

    try {
      // The grace window. The player's units are NOT frozen, hidden, or lifted
      // out of the world while it runs: they hold station and keep emitting,
      // and an opponent listening in the right place hears an unpiloted fleet
      // exactly as it hears a piloted one (docs/tech-stack.md "Match lifecycle"). Anything
      // gentler would make dropping out the cheapest stealth in the game.
      await this.allowReconnection(client, LIFECYCLE.RECONNECT_GRACE_S);
      const returning = this.state.players.get(client.sessionId);
      if (returning !== undefined) {
        returning.connected = true;
        this.sendMatchData(client);
        client.send('phase', { phase: this.state.phase });
      }
    } catch {
      // Out of grace. Same answer as walking out: abandoning is losing.
      this.forfeit(client.sessionId);
    }
  }

  /** Give up a slot's match and clear its seat. */
  private forfeit(sessionId: string): void {
    const slot = this.slotBySession.get(sessionId);
    if (slot !== undefined) this.match.resign(slot);
    this.releasePlayer(sessionId);
  }

  private releasePlayer(sessionId: string): void {
    this.slotBySession.delete(sessionId);
    this.state.players.delete(sessionId);
  }

  override onDispose(): void {
    console.log(
      `[MatchRoom ${this.roomId}] disposed at tick ${this.match.tick}; ` +
        `worst Echo pass ${this.match.worstEchoPassMs.toFixed(3)} ms ` +
        `(budget ${SIM.ECHO_BUDGET_MS} ms); ` +
        `worst sim step ${this.match.worstStepMsCost.toFixed(3)} ms, ` +
        `of which physics ${this.match.worstPhysicsMsCost.toFixed(3)} ms ` +
        `(budget ${(1000 / SIM.TICK_HZ).toFixed(1)} ms)`
    );
  }

  /** Broadcast the result exactly once. */
  private gameOverSent = false;
  /** Live while a resolved match waits for a rematch that may never come. */
  private postMatchTimeout: { clear(): void } | null = null;

  private update(deltaMs: number): void {
    // The lobby and the result screen are not the match. Stepping through
    // either would give whoever loaded first a head start measured in however
    // long their opponent took to pick a navy.
    if (this.state.phase !== MatchPhase.Playing) return;

    const snapshots = this.match.update(deltaMs);

    if (!this.gameOverSent && this.match.result !== null) {
      this.gameOverSent = true;
      this.endMatch(this.match.result.winnerSlot);
    }

    if (snapshots === null) return;

    this.state.tick = this.match.tick;

    // Commanders observe on the same Echo tick a player's client does, from
    // the same per-slot snapshot. They get no extra pass and no extra data.
    for (const [slot, seat] of this.aiSeats) {
      const snapshot = snapshots.get(slot);
      if (snapshot !== undefined) seat.observe(snapshot);
    }

    for (const client of this.clients) {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined) continue;
      const snapshot: EchoSnapshot | undefined = snapshots.get(slot);
      if (snapshot === undefined) continue;
      client.send('echo', snapshot);
    }
  }

  private endMatch(winnerSlot: number): void {
    this.aiSeats.clear();
    this.state.phase = MatchPhase.Ended;
    this.state.winnerSlot = winnerSlot;
    for (const player of this.state.players.values()) player.ready = false;
    this.broadcast('gameOver', { winnerSlot });

    // A room whose match is over holds a slot on the server and answers no
    // useful question. It gets long enough for a rematch to be called, then
    // closes itself rather than lingering until the process restarts.
    this.postMatchTimeout = this.clock.setTimeout(() => {
      if (this.state.phase === MatchPhase.Ended) this.disconnect();
    }, LIFECYCLE.POST_MATCH_S * 1000);
  }
}
