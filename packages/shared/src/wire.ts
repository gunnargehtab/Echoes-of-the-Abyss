/**
 * The room's message contract — every name and every payload that crosses the
 * socket between `MatchRoom` and `GameClient` (#489).
 *
 * These belonged here from the start, by this package's own rule: a constant
 * that has to exist in two packages will eventually disagree with itself. Until
 * this file, thirty-five message names were written twice as string literals,
 * one copy per package, and nothing checked the copies matched. The failure
 * that made it worth fixing is a silent one — rename a message on one side and
 * the socket still carries it, the other side has no handler registered, and it
 * is dropped without a type error, a runtime error or a log line. The player
 * presses a key and the water stays quiet.
 *
 * The payloads were in worse shape than the names. The server sent object
 * literals with no type at all; the client declared its own idea of the same
 * bytes and annotated the receiving handler with it, which is an assertion
 * rather than a check. `MissionLine` was declared in full twice, once per
 * package.
 *
 * `echoDelta.ts` is the precedent this follows: `echo` was already the one
 * channel of the thirty-five where a rename or a shape change was a type
 * error, because its wire form lives here. Now they all are.
 *
 * **What this file is not.** It is the *message* contract, not the room's
 * schema. Colyseus state — the lobby roster, the phase, the tick — syncs
 * through `MatchState` and has never been at risk of this problem. Nor does it
 * describe the client's own projections of that state (`LobbyView` and friends
 * stay in `GameClient.ts`, because nothing sends them).
 */

import type {
  AiDifficulty,
  Faction,
  GameOverPayload,
  HarvestThrottle,
  MatchPhase,
  ResourceNodeInfo,
  StructureKind,
  UnitKind,
} from './types.js';
import type { EchoWire } from './echoDelta.js';
import type {
  MissionResultPayload,
  MissionSpeaker,
  MissionView,
  MissionVoice,
} from './missions.js';

// --- Client to server -----------------------------------------------------

/**
 * Every message a client may send.
 *
 * A frozen map rather than a bare union, so the name has one definition and
 * both sides reach it through the same symbol: renaming a value here is a type
 * error at the send site and the handler at once, which is the entire point of
 * the file.
 */
export const CLIENT_MSG = {
  // Orders.
  move: 'move',
  attackMove: 'attackMove',
  stop: 'stop',
  hold: 'hold',
  rally: 'rally',
  embark: 'embark',
  disembark: 'disembark',
  attack: 'attack',
  depth: 'depth',
  followFloor: 'followFloor',
  silent: 'silent',
  engineOff: 'engineOff',
  ping: 'ping',
  ability: 'ability',
  // Ordnance.
  torpedo: 'torpedo',
  noisemaker: 'noisemaker',
  layDecoy: 'layDecoy',
  mine: 'mine',
  // Lower-case on the wire, unlike every other multi-word name here. Kept as
  // it is because the name is the contract: correcting the casing would be a
  // protocol break for no gain, and this map is where the oddity stops being
  // a thing anyone has to remember.
  depthCharge: 'depthcharge',
  // Economy.
  harvest: 'harvest',
  throttle: 'throttle',
  build: 'build',
  produce: 'produce',
  // Lobby.
  faction: 'faction',
  ready: 'ready',
  addAi: 'addAi',
  removeAi: 'removeAi',
  aiDifficulty: 'aiDifficulty',
} as const;

export type ClientMessageName = (typeof CLIENT_MSG)[keyof typeof CLIENT_MSG];

export interface MoveMessage {
  unitIds: number[];
  x: number;
  y: number;
  /** Append to the unit's plan instead of replacing it. */
  queued?: boolean;
}

/** Attack-move: a move that fights whatever it meets on the way (#435). */
export interface AttackMoveMessage {
  unitIds: number[];
  x: number;
  y: number;
  queued?: boolean;
}

export interface StopMessage {
  unitIds: number[];
}

export interface HoldMessage {
  unitIds: number[];
  active: boolean;
}

/** Where a yard sends the hulls it launches. */
export interface RallyMessage {
  structureIds: number[];
  x: number;
  y: number;
}

/**
 * Board a friendly transport (docs/systems-echo.md §3, "A hull in a hold").
 * Given to the hulls, which close on the carrier and board when they reach
 * it; a hull that cannot fit, or cannot be carried, is refused on the server.
 */
export interface EmbarkMessage {
  unitIds: number[];
  /** The carrier's id — an own unit, never a contact handle. */
  carrierId: number;
}

/** Land a transport's whole hold around it, at its depth. Given to the carriers. */
export interface DisembarkMessage {
  unitIds: number[];
}

export interface AttackMessage {
  unitIds: number[];
  /** Opaque per-observer contact handle, not an entity id. */
  contactId: number;
  queued?: boolean;
}

export interface DepthMessage {
  unitIds: number[];
  /** Ordered depth in metres. Validated and range-checked in the sim. */
  depth: number;
}

export interface FollowFloorMessage {
  unitIds: number[];
  /** Arm or disarm the standing order (docs/systems-depth.md §2). */
  active: boolean;
}

export interface SilentRunningMessage {
  unitIds: number[];
  active: boolean;
}

/**
 * Cut or restart the drive — the posture below Silent Running
 * (docs/systems-echo.md §6). Its own message rather than a mode field on
 * `SilentRunningMessage`, because the two are separate orders a player gives
 * for separate reasons, and a client that had to send "silent: false" to mean
 * "engine off" would be encoding the server's exclusivity rule on the wrong
 * side of the socket.
 */
export interface EngineOffMessage {
  unitIds: number[];
  active: boolean;
}

/**
 * Lay one decoy from a hull's magazine — the offensive half of the noisemaker
 * (docs/systems-combat.md §5, "A screen, laid").
 *
 * Its own message rather than a flag on `noisemaker`, because the two are
 * different orders with different costs: one spends a suite cooldown to save
 * the hull, the other spends a magazine to tell a lie. A client that had to
 * send the countermeasure's name to mean the weapon would be hiding the second
 * order inside the first.
 */
export interface LayDecoyMessage {
  unitId: number;
}

export interface PingMessage {
  unitId: number;
}

/**
 * The commander ability takes no arguments: which one it is follows from the
 * seat's faction, and the server will not take the client's word for that.
 */
export type AbilityMessage = Record<string, never>;

/** Opaque per-observer contact handle, like AttackMessage — never an entity id. */
export interface TorpedoMessage {
  unitIds: number[];
  contactId: number;
}

export interface NoisemakerMessage {
  unitIds: number[];
}

export interface MineMessage {
  unitIds: number[];
}

export interface DepthChargeMessage {
  unitIds: number[];
  depth: number;
}

export interface HarvestMessage {
  unitIds: number[];
  nodeId: number;
  queued?: boolean;
}

export interface ThrottleMessage {
  unitIds: number[];
  throttle: HarvestThrottle;
}

export interface BuildMessage {
  kind: StructureKind;
  x: number;
  y: number;
}

export interface ProduceMessage {
  structureId: number;
  kind: UnitKind;
}

export interface FactionMessage {
  faction: Faction;
}

export interface ReadyMessage {
  ready?: boolean;
}

export interface AddAiMessage {
  difficulty?: AiDifficulty;
}

export interface AiSeatMessage {
  sessionId: string;
  difficulty?: AiDifficulty;
}

/**
 * Name to payload, for everything a client sends.
 *
 * Keyed by the wire name rather than by the `CLIENT_MSG` key, because the wire
 * name is what `send` and `onMessage` are handed. Exhaustive by construction:
 * a name added to `CLIENT_MSG` without an entry here fails to compile below.
 */
export interface ClientMessages {
  move: MoveMessage;
  attackMove: AttackMoveMessage;
  stop: StopMessage;
  hold: HoldMessage;
  rally: RallyMessage;
  embark: EmbarkMessage;
  disembark: DisembarkMessage;
  attack: AttackMessage;
  depth: DepthMessage;
  followFloor: FollowFloorMessage;
  silent: SilentRunningMessage;
  engineOff: EngineOffMessage;
  ping: PingMessage;
  ability: AbilityMessage;
  torpedo: TorpedoMessage;
  noisemaker: NoisemakerMessage;
  layDecoy: LayDecoyMessage;
  mine: MineMessage;
  depthcharge: DepthChargeMessage;
  harvest: HarvestMessage;
  throttle: ThrottleMessage;
  build: BuildMessage;
  produce: ProduceMessage;
  faction: FactionMessage;
  ready: ReadyMessage;
  addAi: AddAiMessage;
  removeAi: AiSeatMessage;
  aiDifficulty: AiSeatMessage;
}

// --- Server to client -----------------------------------------------------

/** Every message the room sends. */
export const SERVER_MSG = {
  /** The ground, whole. Public information — it is the map. */
  terrain: 'terrain',
  /** Ground that changed after the join payload was sent (#197). */
  ground: 'ground',
  map: 'map',
  nodes: 'nodes',
  /** This client's seat and navy. */
  assigned: 'assigned',
  /** The Echo Layer, per observer: a keyframe or a patch (#433). */
  echo: 'echo',
  /** Edge-triggered phase change, beside the schema's own. */
  phase: 'phase',
  gameOver: 'gameOver',
  mission: 'mission',
  missionLine: 'missionLine',
  missionOver: 'missionOver',
} as const;

export type ServerMessageName = (typeof SERVER_MSG)[keyof typeof SERVER_MSG];

/**
 * The authored ground, as both sides read it.
 *
 * Not the whole `terrain` message — that carries a revision as well (see
 * `TerrainMessage`). This is the ground itself, which is what every consumer
 * on the client actually wants: the seabed bake, the heightfield, the prop
 * scatter and the blocked-ground pass all take one of these and none of them
 * has an opinion about the change log.
 */
export interface TerrainPayload {
  cols: number;
  rows: number;
  cellM: number;
  biomes: number[];
  /**
   * The water column per cell, parallel to `biomes`. `ceiling` is 0 on open
   * water; non-zero is a roofed passage (docs/systems-depth.md §1).
   */
  floor: number[];
  ceiling: number[];
}

/**
 * The ground plus the receiving client's cursor into the change log.
 *
 * The revision was sent from the first version of this message and declared by
 * nobody, which is the kind of thing this file exists to stop.
 */
export interface TerrainMessage extends TerrainPayload {
  revision: number;
}

/** One cell the ground delta changed. */
export interface GroundCell {
  index: number;
  floorM: number;
  ceilingM: number;
  /** Rides along on every cell (#259): the record is the cell, not the rect. */
  biome: number;
}

/**
 * Cells that changed mid-match, and the ground's revision after applying them.
 *
 * Cells rather than the rectangle a mission authored: a rect would make both
 * sides redo the metres-to-cells arithmetic and agree about every `Math.floor`,
 * and cells are what actually changed.
 */
export interface GroundDeltaPayload {
  revision: number;
  cells: GroundCell[];
}

export interface MapPayload {
  id: string;
  name: string;
  idealUse: string;
  widthM: number;
  heightM: number;
  /** Seats this map has. A map's spawn list is its player count. */
  seats: number;
  hazards: {
    x: number;
    y: number;
    radiusM: number;
    kind: string;
    note?: string;
    /** True when the hazard framework runs this one; false means site only. */
    simulated: boolean;
  }[];
}

export interface AssignedPayload {
  slot: number;
  faction: Faction;
}

export interface PhasePayload {
  phase: MatchPhase;
}

/**
 * One authored line of in-mission speech — docs/mission-sorrowgate.md §12.
 *
 * Stamped with the simulation tick it was spoken on, like every other thing
 * the client timestamps: there is no wall-clock anywhere near the match.
 * Carries no position and no entity, so it tells the player nothing about the
 * water it was spoken into.
 *
 * Declared in full in both packages before this file existed, which is the
 * duplication that made the case for it.
 */
export interface MissionLine {
  tick: number;
  speaker: string;
  text: string;
  /**
   * The register the line is spoken in, resolved server-side — the mix keys
   * its hail on it (docs/audio-direction.md §13). Authored data about an
   * authored line, so it discloses nothing the log row did not.
   */
  voice: MissionVoice;
  /**
   * Who — the cast of docs/audio-direction.md §13, resolved server-side from
   * the speaker string. The mix signs the hail with it; the log reads the
   * string. Same provenance as `voice`, same disclosure: none.
   */
  speakerId: MissionSpeaker;
}

/** Name to payload, for everything the room sends. */
export interface ServerMessages {
  terrain: TerrainMessage;
  ground: GroundDeltaPayload;
  map: MapPayload;
  nodes: readonly ResourceNodeInfo[];
  assigned: AssignedPayload;
  echo: EchoWire;
  phase: PhasePayload;
  gameOver: GameOverPayload;
  mission: MissionView;
  missionLine: MissionLine;
  missionOver: MissionResultPayload;
}

// --- The contract holds itself together -----------------------------------
//
// Two compile-time checks, and they are the reason the maps above are worth
// having rather than merely tidy. Each asserts that the name list and the
// payload map describe the same set of messages, in both directions — so a
// message added to one and forgotten in the other is a build failure here
// rather than a silence on the wire.

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

/** Every client name has a payload, and every payload has a name. */
const _clientNamesAreExhaustive: Exact<ClientMessageName, keyof ClientMessages> = true;
/** Every server name has a payload, and every payload has a name. */
const _serverNamesAreExhaustive: Exact<ServerMessageName, keyof ServerMessages> = true;
void _clientNamesAreExhaustive;
void _serverNamesAreExhaustive;
