/**
 * The AI's vocabulary — docs/tech-stack.md "The skirmish AI".
 *
 * Two halves, and the split is the whole point of this directory.
 *
 * **In**: an `AiBriefing` once, and an `EchoSnapshot` per Echo tick. Nothing
 * else. The briefing is the map — terrain, spawns, nodule fields — which is
 * exactly what a human client is sent on join and is public by definition,
 * both commanders are standing on it. The snapshot is the same per-slot,
 * already-resolved payload a human receives, with contacts under opaque
 * handles that name no entity.
 *
 * **Out**: `AiCommand`s, one variant per message a client can send. Not a
 * resemblance — the list below and the room's `onMessage` handlers are the
 * same set, because "the AI plays through the interface a player plays
 * through" has to be literally true or it is decoration.
 *
 * A conventional RTS AI reads the world and nobody minds. Here that would not
 * be unfair so much as a *category error*: the game is the act of deciding
 * under partial acoustic information, so an opponent that knows where your
 * hulls are is playing a different game in the same room. It is also the best
 * available test of the information model — if a commander restricted to
 * resolved contacts can play competently, the model carries a game.
 */

import type {
  AiDifficulty,
  EchoSnapshot,
  Faction,
  HarvestThrottle,
  ResourceNodeInfo,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

/**
 * Difficulty is **decision quality and nothing else**.
 *
 * Defined in `@echoes/shared` because it is a lobby-level fact the other
 * commander is entitled to see, and re-exported here so everything about the
 * AI can be imported from one place. There is no vision multiplier and there
 * must never be one — see `AiTuning`, which has no field that could carry one.
 */
export { AiDifficulty } from '@echoes/shared';

/** The biome grid, exactly as `Terrain.serialize()` hands it to a client. */
export interface TerrainView {
  cols: number;
  rows: number;
  cellM: number;
  biomes: number[];
}

/**
 * Everything the commander is told once, at the start.
 *
 * All of it is map data. `spawns` is here because a start position is painted
 * on the map and visible to everyone — a human can see where the other corner
 * is, and withholding it from the AI would model a fog the game does not have.
 */
export interface AiBriefing {
  slot: number;
  faction: Faction;
  difficulty: AiDifficulty;
  widthM: number;
  heightM: number;
  /** Every start on this map, in slot order. */
  spawns: { x: number; y: number }[];
  nodes: ResourceNodeInfo[];
  terrain: TerrainView;
}

/**
 * One command, mirroring one client message.
 *
 * `attack` carries a **contact handle**, never an entity id, for the same
 * reason the client's does: a handle is per-observer and means nothing to
 * anyone who did not earn it, so an AI cannot name a hull it has not heard.
 */
export type AiCommand =
  | { kind: 'move'; unitIds: number[]; x: number; y: number }
  | { kind: 'attack'; unitIds: number[]; contactId: number }
  | { kind: 'harvest'; unitIds: number[]; nodeId: number }
  | { kind: 'throttle'; unitIds: number[]; throttle: HarvestThrottle }
  | { kind: 'silent'; unitIds: number[]; active: boolean }
  | { kind: 'ping'; unitId: number }
  | { kind: 'build'; structure: StructureKind; x: number; y: number }
  | { kind: 'produce'; structureId: number; unit: UnitKind };

/** What a commander is: snapshot in, commands out, and nothing else. */
export interface AiPlayer {
  readonly slot: number;
  observe(snapshot: EchoSnapshot): AiCommand[];
}
