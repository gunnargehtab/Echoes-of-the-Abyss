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

import { WIRE } from './constants.js';
import type {
  AiDifficulty,
  Faction,
  GameOverPayload,
  HarvestThrottle,
  MatchPhase,
  RefitKind,
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
  seedSpore: 'seedSpore',
  sing: 'sing',
  sow: 'sow',
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
  refit: 'refit',
  // Lobby. Phase-gated, and declared again as `LOBBY_MSG` below — that tuple
  // is the one a type can read, and these five names must agree with it.
  faction: 'faction',
  ready: 'ready',
  addAi: 'addAi',
  removeAi: 'removeAi',
  aiDifficulty: 'aiDifficulty',
} as const;

export type ClientMessageName = (typeof CLIENT_MSG)[keyof typeof CLIENT_MSG];

/**
 * The five names a room only accepts before the match starts.
 *
 * Declared rather than commented, because two things downstream need the
 * in-match set as a *type* and a `// Lobby.` banner is not one (#621). The
 * room already phase-gates each of these on `MatchPhase.Lobby`; this tuple is
 * the same fact where a compiler can read it.
 */
export const LOBBY_MSG = ['faction', 'ready', 'addAi', 'removeAi', 'aiDifficulty'] as const;

/** A key of `CLIENT_MSG` the room answers only in the lobby. */
export type LobbyClientMessageKey = (typeof LOBBY_MSG)[number];

/**
 * A key of `CLIENT_MSG` a seated commander may send — 27 of the 32.
 *
 * A **key**, deliberately, not a `ClientMessageName`. The two differ in one
 * place: `depthCharge` travels as `depthcharge` (above), so anything keyed on
 * the wire values needs a special case for that one name and anything keyed on
 * the keys does not. The casing oddity stays a fact about this file.
 */
export type InMatchClientMessageKey = Exclude<keyof typeof CLIENT_MSG, LobbyClientMessageKey>;

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

/**
 * Seed a structure with a Deepbloom strain (docs/units.md, the Blight).
 *
 * By opaque handle like a torpedo launch, and for the same reason: the handle
 * is the proof that this slot resolved this structure. A client cannot seed its
 * way to a map of the enemy base by guessing.
 */
export interface SeedSporeMessage {
  unitId: number;
  contactHandle: number;
}

/**
 * Sing (docs/units.md, the Lure). No target and no handle: the song is sung at
 * the hull's own position, so there is nothing to have resolved — you are
 * calling the Drift to where you are standing, which is the decision.
 */
export interface SingMessage {
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

/**
 * Sow the bed a hull is standing in — docs/systems-flora.md §2.
 *
 * No position: a sowing is served where the hull already is, and the server
 * will not take the client's word for which field that is. Whether the hull
 * may sow at all — Commune, alive, not silent, standing in a bed — is the
 * server's question too.
 */
export interface SowMessage {
  unitIds: number[];
}

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

/**
 * Buy a fleet-wide refit (docs/systems-progression.md §2).
 *
 * Carries the yard because a refit is bought *at* one and occupies its line,
 * exactly as a hull does — the Knights' instant Pressure Refit names their
 * Bastion for the same reason, since that is what the purchase sounds.
 */
export interface RefitMessage {
  structureId: number;
  kind: RefitKind;
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
  seedSpore: SeedSporeMessage;
  sow: SowMessage;
  sing: SingMessage;
  mine: MineMessage;
  depthcharge: DepthChargeMessage;
  harvest: HarvestMessage;
  throttle: ThrottleMessage;
  build: BuildMessage;
  produce: ProduceMessage;
  refit: RefitMessage;
  faction: FactionMessage;
  ready: ReadyMessage;
  addAi: AddAiMessage;
  removeAi: AiSeatMessage;
  aiDifficulty: AiSeatMessage;
}

// --- What a payload must look like at runtime -----------------------------
//
// The maps above are the contract's *compile-time* half: a name renamed or a
// payload reshaped on one side of the socket stops compiling on both (#489).
// They say nothing about what arrives. `ClientMessages[K]` describes what a
// well-behaved client sends, and the socket carries whatever it is handed —
// so until #628 the room's only defence was a line written by hand in each of
// its handlers, and nothing checked the line had been written. Thirty-nine
// such checks were scattered across thirty-two handlers, and they were not
// uniform: #609's two holes were the two whose author stopped at
// `Number.isFinite` where the others went further.
//
// This is the same fact one layer down. Each message declares its fields the
// way it declares its payload, in this file, and the room validates from the
// declaration instead of from memory. After it, the answer to "is this field
// checked?" is "read the table" rather than "read the handler".

/** What one field of one message must be, when it is there at all. */
export interface FieldShape {
  /**
   * `number` is finite — `NaN` and both infinities are refused, because every
   * one of them reaches the sim as a position or an id and poisons whatever
   * it touches. `idList` is an array of finite numbers, bounded. `boolean`
   * and `string` are themselves.
   */
  readonly type: 'number' | 'boolean' | 'string' | 'idList';
  /**
   * Absent is allowed, and the handler's own default stands. Present-but-wrong
   * is still a refusal: an optional field is one the client may omit, not one
   * it may fill with anything.
   */
  readonly optional?: true;
  /**
   * `idList` only — the most entries this field may carry, `WIRE.MAX_IDS`
   * unless a message has a reason to be tighter.
   */
  readonly max?: number;
}

/** Every field of every message a client may send. */
export type MessageShape = Readonly<Record<string, FieldShape>>;

/**
 * One shape per field of one payload — every field, optional ones included.
 *
 * `-?` is the load-bearing character. It makes an optional field of the
 * payload a *required* entry of its shape, so `queued` cannot be left out of
 * the table and silently go unchecked; whether the client may omit it is then
 * said once, in `FieldShape.optional`, where the room reads it. The mapped
 * key also means a field name that is not on the payload is a build error
 * rather than a line that validates nothing — which is the failure mode this
 * table would otherwise have, and the one the issue's own argument against
 * exemption lists warns about: a check that cannot be wrong by inspection.
 */
export type ShapeOf<T> = { readonly [F in keyof T]-?: FieldShape };

const NUM: FieldShape = { type: 'number' };
const FLAG: FieldShape = { type: 'boolean' };
/** `queued` and friends: the client may leave it out, and false is the answer. */
const OPTIONAL_FLAG: FieldShape = { type: 'boolean', optional: true };
const OPTIONAL_NUM: FieldShape = { type: 'number', optional: true };
const TEXT: FieldShape = { type: 'string' };
const IDS: FieldShape = { type: 'idList', max: WIRE.MAX_IDS };

/**
 * Name to shape, for everything a client sends.
 *
 * **Keyed as `ClientMessages` is**, which is the whole reason `depthcharge`
 * needs no special case: that one name is lower case on the wire and both
 * maps spell it the way the wire does, so a table keyed here agrees with a
 * table keyed there by construction. #621 measured the other way round and
 * found the spurious name it reports.
 *
 * The annotation is the exhaustiveness check, and it is deliberately an
 * annotation rather than one of the `Exact<>` assertions at the foot of this
 * file. `Exact<>` fails with `Type 'true' is not assignable to type 'never'`
 * and names nothing; a `Record` keyed on `keyof ClientMessages` fails with
 * the *message* in the diagnostic, in both directions — a missing entry and
 * an entry for a name nothing sends. #621 established that the diagnostic is
 * the point, and this is the same lesson applied one map over.
 *
 * A message with no fields declares `{}` rather than being left out: an empty
 * shape says "this payload carries nothing", which is a claim the room checks,
 * and a missing one would say nobody had thought about it.
 */
export const CLIENT_SHAPE: { readonly [K in keyof ClientMessages]: ShapeOf<ClientMessages[K]> } = {
  move: { unitIds: IDS, x: NUM, y: NUM, queued: OPTIONAL_FLAG },
  attackMove: { unitIds: IDS, x: NUM, y: NUM, queued: OPTIONAL_FLAG },
  stop: { unitIds: IDS },
  hold: { unitIds: IDS, active: FLAG },
  rally: { structureIds: IDS, x: NUM, y: NUM },
  embark: { unitIds: IDS, carrierId: NUM },
  disembark: { unitIds: IDS },
  attack: { unitIds: IDS, contactId: NUM, queued: OPTIONAL_FLAG },
  depth: { unitIds: IDS, depth: NUM },
  followFloor: { unitIds: IDS, active: FLAG },
  silent: { unitIds: IDS, active: FLAG },
  engineOff: { unitIds: IDS, active: FLAG },
  ping: { unitId: NUM },
  // The commander's one act carries nothing, and that is the contract rather
  // than an omission: a payload that named a unit would be a client choosing
  // where the plateau's bell hangs.
  ability: {},
  torpedo: { unitIds: IDS, contactId: NUM },
  noisemaker: { unitIds: IDS },
  layDecoy: { unitId: NUM },
  seedSpore: { unitId: NUM, contactHandle: NUM },
  sow: { unitIds: IDS },
  sing: { unitId: NUM },
  mine: { unitIds: IDS },
  depthcharge: { unitIds: IDS, depth: NUM },
  harvest: { unitIds: IDS, nodeId: NUM, queued: OPTIONAL_FLAG },
  throttle: { unitIds: IDS, throttle: NUM },
  build: { kind: NUM, x: NUM, y: NUM },
  produce: { structureId: NUM, kind: NUM },
  refit: { structureId: NUM, kind: NUM },
  faction: { faction: NUM },
  ready: { ready: OPTIONAL_FLAG },
  addAi: { difficulty: OPTIONAL_NUM },
  removeAi: { sessionId: TEXT, difficulty: OPTIONAL_NUM },
  aiDifficulty: { sessionId: TEXT, difficulty: OPTIONAL_NUM },
};

/** One field against its declaration. */
function fieldIsValid(value: unknown, shape: FieldShape): boolean {
  if (value === undefined || value === null) return shape.optional === true;
  switch (shape.type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'string':
      return typeof value === 'string';
    case 'idList': {
      if (!Array.isArray(value)) return false;
      // Length before contents, so a client cannot spend the room's time by
      // sending an array too long to be accepted anyway.
      if (value.length > (shape.max ?? WIRE.MAX_IDS)) return false;
      for (const entry of value) {
        if (typeof entry !== 'number' || !Number.isFinite(entry)) return false;
      }
      return true;
    }
  }
}

/**
 * Is this payload the shape its name declares?
 *
 * The one place a client message is checked. Refusals are silent and whole —
 * silent because every other server-side refusal in this room is (a client
 * that learns *which* of its messages was rejected learns something about the
 * room it was not sent), and whole because a half-applied order is a worse
 * answer than no order.
 *
 * Fields the shape does not declare are ignored rather than refused. The
 * contract is what the room reads, and a client that sends more than that is
 * wasting its own bytes; refusing on them would make adding a field to a
 * payload a protocol break for every client that had not yet been rebuilt.
 */
export function isValidClientMessage<K extends keyof ClientMessages>(
  name: K,
  payload: unknown
): payload is ClientMessages[K] {
  // `undefined` is refused here rather than treated as the empty payload, and
  // the caller normalises it instead (`MatchRoom.onClientMessage`). A
  // predicate that let `undefined` through would be narrowing to a type it is
  // not — every payload in `ClientMessages` is an object, including the two
  // whose every field is optional.
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return false;
  // Widened once, here, because the table is typed per message and this
  // function is written once for all of them. Everything the cast hides has
  // already been checked by the compiler at the declaration above.
  const shape = CLIENT_SHAPE[name] as MessageShape;
  const record = payload as Record<string, unknown>;
  for (const field of Object.keys(shape)) {
    if (!fieldIsValid(record[field], shape[field]!)) return false;
  }
  return true;
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

/**
 * Every name in `LOBBY_MSG` is a real key of `CLIENT_MSG`.
 *
 * Without this a typo there is not a build error but a *widening*: the
 * misspelling excludes nothing, the real name stays in
 * `InMatchClientMessageKey`, and the downstream check fails somewhere else
 * naming a verb that was never the problem.
 */
const _lobbyNamesAreClientKeys: readonly (keyof typeof CLIENT_MSG)[] = LOBBY_MSG;
void _lobbyNamesAreClientKeys;
