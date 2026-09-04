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
  driftCarryFrom,
  validDriftCarry,
  type DriftCarry,
  type EchoSnapshot,
  type MatchListingMetadata,
} from '@echoes/shared';
import { AiSeat, briefingFor } from '../ai/seat.ts';
import { Match } from '../sim/match.ts';
import { DEFAULT_MAP_ID, mapById, missionMapById } from '../sim/maps/index.ts';
import type { MapDefinition } from '../sim/maps/types.ts';
import { missionById } from '../sim/missions/index.ts';
import type { MissionDefinition } from '../sim/missions/types.ts';
import type { MissionResolution } from '../sim/missions/runtime.ts';
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

interface FollowFloorMessage {
  unitIds: number[];
  /** Arm or disarm the standing order (docs/systems-depth.md §2). */
  active: boolean;
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

/** Opaque per-observer contact handle, like AttackMessage — never an entity id. */
interface TorpedoMessage {
  unitIds: number[];
  contactId: number;
}

interface NoisemakerMessage {
  unitIds: number[];
}

interface MineMessage {
  unitIds: number[];
}

interface DepthChargeMessage {
  unitIds: number[];
  depth: number;
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
  /**
   * Run an authored mission instead of a skirmish (docs/campaign.md).
   *
   * Also a `filterBy` key on the room definition, so `joinOrCreate` can never
   * hand a mission player somebody else's running match, or drop a skirmish
   * player into a single-seat scenario.
   */
  missionId?: string;
  /**
   * Create the room unlisted and unmatchable — reachable only by its room id
   * (docs/tech-stack.md, "Finding a match").
   *
   * Ignored for a mission, which is private whatever anyone asks for.
   */
  private?: boolean;
  /**
   * Drift Health this map is already carrying, from the client's progression
   * record — docs/campaign.md §2 rule 5.
   *
   * The one thing a client presents that changes the world it is about to be
   * seated in, so it is the one option that is *validated* rather than
   * defaulted: `validDriftCarry` refuses a grid of the wrong length, a
   * non-finite value, or anything healthier than the ground opens at, and a
   * refused grid falls back to the biome defaults. Ignored outside a mission,
   * because §2 rule 5 is a rule about the campaign and a skirmish has no
   * record to have earned one.
   */
  driftCarry?: readonly number[];
}

export class MatchRoom extends Room<MatchState> {
  maxClients = 4;

  private match!: Match;
  private map!: MapDefinition;
  /** The authored mission this room is running, or null for a skirmish. */
  private mission: MissionDefinition | null = null;
  private readonly slotBySession = new Map<string, number>();
  /** Live AI commanders, by slot. Rebuilt from the roster on every start. */
  private readonly aiSeats = new Map<number, AiSeat>();
  /**
   * How much of the ground's change log every connected client has been told
   * about. Room-wide rather than per-client because the delta is broadcast and
   * a client that joins mid-match gets the whole grid instead.
   */
  private sentGroundRevision = 0;
  /**
   * The Drift Health this room's world opened on — docs/campaign.md §2 rule 5
   * — or null for the biome defaults.
   *
   * Held rather than consumed so a rematch starts on the same ground the first
   * attempt did, and updated at `endMission` so it stays the grid the player's
   * record now holds: the room and the record must not disagree about what
   * this water looks like.
   */
  private driftCarry: number[] | null = null;

  override async onCreate(options?: MatchRoomOptions): Promise<void> {
    const requested = options?.missionId ?? '';
    this.mission = requested === '' ? null : (missionById(requested) ?? null);
    // A mission that does not resolve fails the room, and deliberately does not
    // take the map's fallback below. An unknown *map* can be swapped for the
    // default because the client asked for a skirmish and a skirmish is what it
    // gets — the map it actually got is sent on join. An unknown *mission* has
    // no such substitute: falling through would seat the player in a skirmish
    // on a mission-only map, with a briefing screen behind them, waiting on
    // orders that are never coming. Better a named error the shell can show.
    if (requested !== '' && this.mission === null) {
      throw new Error(`unknown mission: ${requested}`);
    }
    // An unknown id falls back to the default rather than failing the room:
    // a client asking for a map this build does not have should get a game,
    // and the map it actually got is sent on join either way.
    this.map =
      this.mission !== null
        ? missionMapById(this.mission.mapId)!
        : (mapById(options?.mapId ?? DEFAULT_MAP_ID) ?? mapById(DEFAULT_MAP_ID)!);
    // Validated before the world is built, and only for a mission: what
    // arrives here is a number the client chose.
    this.driftCarry = this.mission === null ? null : validDriftCarry(options?.driftCarry);
    this.match = this.newMatch();
    // A map's spawn list is its player count — except a mission's, which has
    // one spawn and authors its other parties itself. A mission is not a lobby.
    this.maxClients = this.mission === null ? Math.min(this.maxClients, this.map.spawns.length) : 1;

    this.setState(new MatchState());
    this.state.mapId = this.map.id;

    // Awaited rather than fired and forgotten, and this is why `onCreate` is
    // async: the matchmaker awaits `onCreate` before marking the room created,
    // so a privacy flag set here lands before anyone can be matched into it.
    // Set from a `void` call it would resolve a tick later, leaving a window in
    // which somebody's `joinOrCreate` could be handed a solo game.
    //
    // A mission is private whatever the client asked for: it seats one
    // commander and writes its own opposition, so it is nobody else's to join.
    if (this.mission !== null || options?.private === true) await this.setPrivate(true);
    await this.publishListing();

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

    this.onMessage('followFloor', (client, message: FollowFloorMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      for (const unitId of message.unitIds) {
        this.match.orderFollowFloor(slot, unitId, Boolean(message.active));
      }
    });

    this.onMessage('ping', (client, message: PingMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Number.isFinite(message?.unitId)) return;
      this.match.activeSonar(slot, message.unitId);
    });

    // The commander's one act (docs/characters.md). No payload at all — the
    // act carries no unit, and a message that named one would be a client
    // choosing where the plateau's bell hangs.
    this.onMessage('ability', (client) => {
      const slot = this.commandSlot(client);
      if (slot === undefined) return;
      this.match.commanderAbility(slot);
    });

    this.onMessage('attack', (client, message: AttackMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.contactId)) return;
      for (const unitId of message.unitIds) {
        this.match.orderAttackContact(slot, unitId, message.contactId, message.queued === true);
      }
    });

    this.onMessage('torpedo', (client, message: TorpedoMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.contactId)) return;
      for (const unitId of message.unitIds) {
        // The handle is re-resolved per hull inside the sim: a contact one of
        // this player's units heard is a firing solution for all of them, and
        // a handle they were never issued resolves to nothing.
        this.match.orderLaunchTorpedo(slot, unitId, message.contactId);
      }
    });

    this.onMessage('noisemaker', (client, message: NoisemakerMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      for (const unitId of message.unitIds) {
        this.match.deployNoisemaker(slot, unitId);
      }
    });

    this.onMessage('mine', (client, message: MineMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      for (const unitId of message.unitIds) {
        // The per-player cap and the arming occupancy are both enforced in the
        // sim; a client spamming this gets one mine and a lot of noise.
        this.match.layMine(slot, unitId);
      }
    });

    this.onMessage('depthcharge', (client, message: DepthChargeMessage) => {
      const slot = this.commandSlot(client);
      if (slot === undefined || !Array.isArray(message?.unitIds)) return;
      if (!Number.isFinite(message.depth)) return;
      for (const unitId of message.unitIds) {
        // Depth range and ownership are both re-checked inside the sim; an
        // out-of-range depth is refused there rather than clamped here.
        this.match.orderDepthCharge(slot, unitId, message.depth);
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
      // A mission pins the navy and seats no commanders: there is nothing here
      // to choose. Refused rather than quietly ignored, because the screen that
      // would send it never renders in a mission room.
      if (this.mission !== null) return;
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
      if (this.mission !== null) return;
      if (!this.state.players.has(client.sessionId)) return;
      this.addAiSeat(message?.difficulty);
    });

    this.onMessage('removeAi', (client, message: AiSeatMessage) => {
      if (this.state.phase !== MatchPhase.Lobby) return;
      if (this.mission !== null) return;
      if (!this.state.players.has(client.sessionId)) return;
      const seat = this.state.players.get(message?.sessionId ?? '');
      // Only an AI row: this must never become a kick button for a person.
      if (seat === undefined || !seat.isAi) return;
      this.releasePlayer(seat.sessionId);
      this.startIfEveryoneIsReady();
    });

    this.onMessage('aiDifficulty', (client, message: AiSeatMessage) => {
      if (this.state.phase !== MatchPhase.Lobby) return;
      if (this.mission !== null) return;
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

  /**
   * Republish what this room tells the world. Called wherever the roster
   * changes, because "two of four seats taken" stops being true the moment it
   * does — a listing that went stale would send players at rooms that are full.
   */
  private publishListing(): Promise<void> {
    const metadata: MatchListingMetadata = {
      mapId: this.map.id,
      mapName: this.map.name,
      seats: this.maxClients,
      filled: this.state.players.size,
    };
    // Never allowed to fail a join or a leave: a listing is a convenience, and
    // a room that could not advertise itself is still a room people can play.
    return this.setMetadata(metadata).catch(() => {});
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
    void this.publishListing();
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
    void this.publishListing();

    if (this.mission !== null) {
      // A mission pins the navy and seats no commanders, so there is nothing
      // to negotiate and no readiness question worth asking. The faction cards
      // never appear; this room goes straight from joined to playing.
      player.faction = this.mission.playerFaction;
      player.ready = true;
    }

    this.sendMapData(client);
    client.send('assigned', { slot, faction: player.faction });
    if (this.mission !== null) this.startIfEveryoneIsReady();
  }

  /**
   * A fresh match on this room's ground.
   *
   * A mission is installed by the `Match` constructor rather than here, so
   * that replay playback — which rebuilds a match the same way — gets the
   * authored forces and beats without the room being involved at all.
   */
  private newMatch(): Match {
    return this.mission === null
      ? new Match(this.map)
      : new Match(this.map, {
          mission: this.mission,
          fauna: this.mission.fauna,
          driftCarry: this.driftCarry,
        });
  }

  /**
   * Everything about the ground, which is public by definition — both
   * commanders are standing on it — and true before a match starts, so the
   * lobby can name and preview the map it is about to be played on.
   */
  private sendMapData(client: Client): void {
    // Terrain is public information — it is the map. Serialised from the live
    // arrays, so a client joining after a mission has written the ground gets
    // the ground as it *is* rather than as it was authored — which is what
    // makes a reconnection at 15:00 land on a map with the arch already down.
    // The revision it carries is that client's cursor into the change log.
    client.send('terrain', {
      ...this.match.world.terrain.serialize(),
      revision: this.match.world.terrain.revision,
    });
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
    // The mission's standing orders, if there are any.
    //
    // `takeMissionView` is an *edge* — it fires when something moves — and a
    // client that was not connected for that edge cannot ask for it again. A
    // player who reloads mid-mission would otherwise be looking at an empty
    // orders panel until the next objective happened to change, which in the
    // Prologue's quiet first ten minutes is most of the mission. Gated on the
    // slot for the same reason the live send is: a mission view is resolved
    // for one observer and is not broadcast material.
    if (this.mission !== null && player.slot === this.mission.playerSlot) {
      const view = this.match.missionView;
      if (view !== null) client.send('mission', view);
      // And the court's reading, if it has already been given.
      //
      // `endMission` announces once, to whoever is connected at the tick the
      // court adjourns. A player inside the reconnection grace window at that
      // moment is not one of them — they dropped at 19:50, the mission closed
      // at 20:00 without them, and they come back to a phase of Ended with
      // nothing to show for twenty minutes of escorting. The result is held on
      // the match rather than only broadcast, so it can simply be re-sent.
      const resolution = this.match.missionOver;
      if (resolution !== null) {
        client.send('missionOver', {
          missionId: this.mission.id,
          outcome: resolution.outcome,
          epilogue: resolution.epilogue,
          objectives: resolution.objectives,
          scenes: resolution.scenes,
          driftCarry: this.driftResult(),
        });
      }
    }
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
      // The new world builds fresh terrain, so the ground's change log starts
      // over too and every client is re-sent the whole grid below.
      this.match = this.newMatch();
      this.sentGroundRevision = 0;
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
      // A mission seated itself in the Match constructor, with its authored
      // force: `addPlayer` would hand the flight a Bastion, a Foundry and a
      // harvester it has no economy for.
      if (this.mission === null) this.match.addPlayer(player.slot, player.faction as Faction);
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

    for (const client of this.clients) {
      // The whole grid, not a delta: a rematch is new ground, and a client
      // still holding the last match's collapsed arch would draw rock across a
      // map that no longer has any.
      this.sendMapData(client);
      this.sendMatchData(client);
    }
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
        // The ground first. A reconnection is a *fresh* client on an old seat —
        // the page reloaded, so the renderer has no terrain, no map bounds and
        // therefore no minimap. Only `onJoin` used to send these, and a
        // reconnection does not go through `onJoin`, so a resumed player was
        // looking at their fleet floating over blank water.
        this.sendMapData(client);
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
    void this.publishListing();
  }

  override onDispose(): void {
    // A room whose `onCreate` refused an unknown mission never built a match,
    // and reading one here would throw a TypeError on top of the real error —
    // burying the one line that says what the client actually asked for.
    if (this.match === undefined) return;
    console.log(
      `[MatchRoom ${this.roomId}] disposed at tick ${this.match.tick}; ` +
        `worst Echo pass ${this.match.worstEchoPassMs.toFixed(3)} ms ` +
        `(budget ${SIM.ECHO_BUDGET_MS} ms); ` +
        `worst sim step ${this.match.worstStepMsCost.toFixed(3)} ms, ` +
        `of which physics ${this.match.worstPhysicsMsCost.toFixed(3)} ms ` +
        `(budget ${(1000 / SIM.TICK_HZ).toFixed(1)} ms)` +
        (this.mission === null
          ? ''
          : `; worst mission pass ${this.match.worstMissionMsCost.toFixed(3)} ms`)
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

    // A mission concludes on its own authored terms rather than resolving a
    // winner, so it is a separate question with a separate answer.
    if (!this.gameOverSent && this.match.missionOver !== null) {
      this.gameOverSent = true;
      this.endMission(this.match.missionOver);
    }

    if (snapshots === null) return;

    this.state.tick = this.match.tick;

    // Ground that changed on this tick (#197). A mission beat can collapse a
    // span, and a client still drawing the route that is no longer there is
    // worse than one drawing nothing: the player would be steering into rock
    // they can see is open. Broadcast rather than per-client because terrain
    // is public — both commanders are standing on it.
    const groundRevision = this.match.world.terrain.revision;
    if (groundRevision > this.sentGroundRevision) {
      this.broadcast('ground', {
        revision: groundRevision,
        cells: this.match.world.terrain.changesSince(this.sentGroundRevision),
      });
      this.sentGroundRevision = groundRevision;
    }

    // Commanders observe on the same Echo tick a player's client does, from
    // the same per-slot snapshot. They get no extra pass and no extra data.
    for (const [slot, seat] of this.aiSeats) {
      const snapshot = snapshots.get(slot);
      if (snapshot !== undefined) seat.observe(snapshot);
    }

    // Drained once per tick, not once per client: a mission room seats one
    // player, but draining inside the loop would swallow the view for
    // everyone after the first if that ever stopped being true.
    const missionView = this.match.takeMissionView();
    const missionLines = this.match.takeMissionLines();

    for (const client of this.clients) {
      const slot = this.slotBySession.get(client.sessionId);
      if (slot === undefined) continue;
      const snapshot: EchoSnapshot | undefined = snapshots.get(slot);
      if (snapshot !== undefined) client.send('echo', snapshot);
      // Per-client rather than broadcast, even though a mission room seats one
      // player: "it is safe because of a config line" is not a guarantee, and
      // this is the channel carrying the only numbers the mission computes.
      if (missionView !== null && slot === this.mission?.playerSlot) {
        client.send('mission', missionView);
      }
      for (const line of missionLines) client.send('missionLine', line);
    }
  }

  /**
   * A mission ends without a winner, and says so.
   *
   * `winnerSlot` stays -1, because nobody was beaten: the count is whatever the
   * player earned. Both existing consumers of that field derive victory from
   * slot equality, so overloading it here would have the renderer announce an
   * evacuation as a conquest.
   */
  private endMission(resolution: MissionResolution): void {
    // Read before the room is told the match is over, and adopted as this
    // room's own carry: a rematch then opens on the ground this attempt left,
    // which is what the player's record now says about this water.
    const carried = this.driftResult();
    this.driftCarry = carried === undefined ? this.driftCarry : [...carried.health];
    this.aiSeats.clear();
    this.state.phase = MatchPhase.Ended;
    this.state.winnerSlot = -1;
    for (const player of this.state.players.values()) player.ready = false;
    for (const client of this.clients) {
      client.send('missionOver', {
        missionId: this.mission!.id,
        outcome: resolution.outcome,
        epilogue: resolution.epilogue,
        objectives: resolution.objectives,
        // Sent on both paths, so a player who reconnected into an ended room
        // records the same scenes as one who never dropped.
        scenes: resolution.scenes,
        driftCarry: carried,
      });
    }

    this.postMatchTimeout = this.clock.setTimeout(() => {
      if (this.state.phase === MatchPhase.Ended) this.disconnect();
    }, LIFECYCLE.POST_MATCH_S * 1000);
  }

  /**
   * The ground as this mission is leaving it — docs/campaign.md §2 rule 5.
   *
   * Public, and no new disclosure: the same grid is in every resolved snapshot
   * already (docs/bestiary.md §5 — the Drift's tell is light, not sound), so
   * what crosses here is a fact the player has been looking at all match, in a
   * form the record can keep. Undefined outside a mission, because a skirmish
   * has nowhere to carry it to.
   */
  private driftResult(): DriftCarry | undefined {
    if (this.mission === null) return undefined;
    // `driftCarryFrom`, not the raw snapshot: a region that recovered past the
    // opening value inside this match carries forward at the opening value,
    // because §2 rule 5 carries damage and never a surplus.
    return { mapId: this.map.id, health: driftCarryFrom(this.match.world.drift.snapshot()) };
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
