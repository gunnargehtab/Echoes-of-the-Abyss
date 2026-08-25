/**
 * Match recording and playback.
 *
 * A replay is the seed, the roster, and the ordered stream of commands with
 * the ticks they arrived on. Everything else is derived, because the
 * simulation is deterministic — which is precisely the property this module
 * exists to record *and* to check.
 *
 * What it buys, in rough order of how soon it pays for itself:
 *   - a bug report becomes a file rather than a description;
 *   - "this build order beats that one" stops being an anecdote, because a
 *     balance run can be repeated exactly (see the balance harness);
 *   - determinism is tested rather than assumed, so the next system that
 *     reaches for `Math.random()` fails CI instead of failing quietly.
 *
 * Commands are recorded as *attempts*, including ones the simulation refused.
 * Replaying a refused command is not a no-op in the way it looks: it
 * re-exercises the validation path, so a regression that starts accepting
 * something it used to reject shows up as a divergence rather than as a
 * subtly different match nobody notices.
 *
 * Entities are named by **match-local id**, not by bitecs entity id. bitecs
 * allocates ids from a process-global counter, so the same match run twice in
 * one process gets different ids for the same hulls — and a replay full of
 * raw ids addresses entities that do not exist in the world it is replayed
 * into. This was not theoretical: the first version of this module recorded
 * raw ids, and every replay silently no-opped its own commands and diverged
 * at the first checkpoint after them.
 */

import { Faction, HarvestThrottle, StructureKind, UnitKind } from '@echoes/shared';
import { Match } from './match.ts';
import { mapById } from './maps/index.ts';
import { hashWorld } from './stateHash.ts';
import { Terrain } from './terrain.ts';
import { eidOfLocalId } from './world.ts';

/** The current replay wire format. Bump when a change breaks old files. */
/**
 * 6: the thermocline is modelled. Detection between a hull above 1,100 m and
 * one below 1,300 m is multiplied by 0.3, and both ends inside the duct by
 * 1.2 (docs/systems-echo.md §3). Echo Marks gained the depth of the event and
 * no longer merge across the layer. The file layout is unchanged — every v5
 * recording is still readable as data — but a v5 match replayed under these
 * rules diverges the moment anything crosses 1,200 m, which on any authored
 * map is early.
 *
 * 5: ground stops hulls. Movement refuses a step into water that does not
 * admit the hull at its depth and slides it along the edge instead, and the
 * seabed holds a hull no deeper than the ground allows. The format is
 * unchanged; the maps are not, and a v4 recording replayed over authored
 * floors diverges the first time anything crosses a plateau.
 *
 * 4: separation resolves every neighbour of a hull rather than only the last,
 * seeds its coincident tie-break from match-local ids rather than process-
 * global entity ids, and positions are clamped to the map. The file layout is
 * unchanged — this bump is about the rules, not the format. A v3 recording
 * replayed under these rules diverges at its first crowded checkpoint, and
 * rejecting it names the real fault instead of reporting a determinism bug.
 *
 * 3: replays carry whether the Drift was populated.
 *
 * 2: replays carry the map they were played on.
 *
 * Version 1 replays cannot be upgraded, because the information is simply not
 * in them — a v1 replay was recorded on whatever `Terrain.demo()` was at the
 * time, and reproducing it on any other ground diverges at the first
 * checkpoint. Rejecting them is honest; silently replaying them on a default
 * map would produce a divergence report about determinism when the real fault
 * was the replay's own age.
 */
export const REPLAY_FORMAT_VERSION = 6;

/** `unit`, `node` and `structure` are match-local ids — see the note above. */
export type ReplayCommand =
  | {
      tick: number;
      type: 'move';
      slot: number;
      unit: number;
      x: number;
      y: number;
      queued: boolean;
    }
  | { tick: number; type: 'depth'; slot: number; unit: number; depth: number }
  | { tick: number; type: 'attack'; slot: number; unit: number; contact: number; queued: boolean }
  | { tick: number; type: 'torpedo'; slot: number; unit: number; contact: number }
  | { tick: number; type: 'noisemaker'; slot: number; unit: number }
  | { tick: number; type: 'mine'; slot: number; unit: number }
  | { tick: number; type: 'depthcharge'; slot: number; unit: number; depth: number }
  | { tick: number; type: 'harvest'; slot: number; unit: number; node: number; queued: boolean }
  | { tick: number; type: 'throttle'; slot: number; unit: number; throttle: HarvestThrottle }
  | { tick: number; type: 'silent'; slot: number; unit: number; active: boolean }
  | { tick: number; type: 'ping'; slot: number; unit: number }
  | { tick: number; type: 'build'; slot: number; kind: StructureKind; x: number; y: number }
  | { tick: number; type: 'produce'; slot: number; structure: number; kind: UnitKind };

export interface ReplayPlayer {
  slot: number;
  faction: Faction;
}

export interface ReplayCheckpoint {
  tick: number;
  hash: number;
}

export interface Replay {
  version: number;
  seed: number;
  /** Id of the authored map, so playback starts from the same ground. */
  mapId: string;
  /** Whether the Drift was populated. Part of the setup, like the map. */
  fauna: boolean;
  players: ReplayPlayer[];
  commands: ReplayCommand[];
  /**
   * Periodic state hashes. Playback compares against these, so a divergence
   * is reported at the tick it happened rather than at the end of the match.
   */
  checkpoints: ReplayCheckpoint[];
  /** Tick the recording stopped on. */
  finalTick: number;
}

/**
 * Collects a replay from a running match.
 *
 * `Match` owns this rather than the room, deliberately. The room is the
 * network boundary and sees requests; the sim sees commands, and knows the
 * tick each one landed on. Recording at the sim boundary means a replay can
 * never disagree with the match it came from about ordering.
 */
export class ReplayRecorder {
  private readonly commands: ReplayCommand[] = [];
  private readonly checkpoints: ReplayCheckpoint[] = [];
  private readonly players: ReplayPlayer[] = [];
  private readonly seed: number;
  private readonly mapId: string;
  private readonly fauna: boolean;
  private readonly checkpointInterval: number;
  /**
   * Negative infinity rather than -1 so the *first* call checkpoints tick 0.
   * A checkpoint at the start is worth having on its own: it proves both runs
   * began from the same world, which turns "the replay diverged" into "the
   * replay diverged somewhere after the opening", a much smaller haystack.
   */
  private lastCheckpointTick = Number.NEGATIVE_INFINITY;

  constructor(seed: number, mapId: string, fauna: boolean, checkpointIntervalTicks = 300) {
    this.seed = seed;
    this.mapId = mapId;
    this.fauna = fauna;
    this.checkpointInterval = checkpointIntervalTicks;
  }

  addPlayer(slot: number, faction: Faction): void {
    if (this.players.some((p) => p.slot === slot)) return;
    this.players.push({ slot, faction });
  }

  record(command: ReplayCommand): void {
    this.commands.push(command);
  }

  /** Called once per tick by Match; hashes on the interval only. */
  maybeCheckpoint(tick: number, hash: () => number): void {
    if (tick - this.lastCheckpointTick < this.checkpointInterval) return;
    this.lastCheckpointTick = tick;
    this.checkpoints.push({ tick, hash: hash() });
  }

  finish(finalTick: number): Replay {
    return {
      version: REPLAY_FORMAT_VERSION,
      seed: this.seed,
      mapId: this.mapId,
      fauna: this.fauna,
      // Sorted so a replay of the same match is byte-identical regardless of
      // the order players happened to connect in.
      players: [...this.players].sort((a, b) => a.slot - b.slot),
      commands: [...this.commands],
      checkpoints: [...this.checkpoints],
      finalTick,
    };
  }
}

export interface ReplayResult {
  /** Hash of the world at the final tick. */
  finalHash: number;
  /** First checkpoint whose hash disagreed, if any. */
  divergedAtTick: number | null;
  /** The match, so callers can inspect the replayed world. */
  match: Match;
}

/**
 * Re-run a replay and report whether it still produces the match it recorded.
 *
 * `divergedAtTick` is the useful output: null means the replay reproduced,
 * and a tick number means determinism broke, there and not later.
 */
export function playReplay(replay: Replay, terrain?: Terrain): ReplayResult {
  if (replay.version !== REPLAY_FORMAT_VERSION) {
    throw new Error(`replay format ${replay.version} is not this build's ${REPLAY_FORMAT_VERSION}`);
  }

  const map = mapById(replay.mapId);
  if (map === undefined) {
    throw new Error(`replay was recorded on unknown map "${replay.mapId}"`);
  }

  // `fauna` matters as much as the map: a match with animals in it and the
  // same match without are different matches.
  const options = { seed: replay.seed, fauna: replay.fauna };
  const match = new Match(map, terrain === undefined ? options : { ...options, terrain });
  for (const player of replay.players) match.addPlayer(player.slot, player.faction);

  // Commands are keyed by the tick they landed on; a tick may carry several.
  const byTick = new Map<number, ReplayCommand[]>();
  for (const command of replay.commands) {
    const bucket = byTick.get(command.tick);
    if (bucket === undefined) byTick.set(command.tick, [command]);
    else bucket.push(command);
  }

  const expected = new Map(replay.checkpoints.map((c) => [c.tick, c.hash]));
  let divergedAtTick: number | null = null;

  while (match.tick < replay.finalTick) {
    for (const command of byTick.get(match.tick) ?? []) applyCommand(match, command);

    const want = expected.get(match.tick);
    if (want !== undefined && divergedAtTick === null && hashWorld(match.world) !== want) {
      divergedAtTick = match.tick;
    }

    match.stepOnce();
  }

  return { finalHash: hashWorld(match.world), divergedAtTick, match };
}

function applyCommand(match: Match, command: ReplayCommand): void {
  // Translate match-local ids back into this world's entity ids.
  const eid = (local: number) => eidOfLocalId(match.world, local);

  switch (command.type) {
    case 'move':
      match.orderMove(command.slot, eid(command.unit), command.x, command.y, command.queued);
      break;
    case 'depth':
      match.orderDepth(command.slot, eid(command.unit), command.depth);
      break;
    case 'attack':
      match.orderAttackContact(command.slot, eid(command.unit), command.contact, command.queued);
      break;
    case 'torpedo':
      match.orderLaunchTorpedo(command.slot, eid(command.unit), command.contact);
      break;
    case 'noisemaker':
      match.deployNoisemaker(command.slot, eid(command.unit));
      break;
    case 'mine':
      match.layMine(command.slot, eid(command.unit));
      break;
    case 'depthcharge':
      match.orderDepthCharge(command.slot, eid(command.unit), command.depth);
      break;
    case 'harvest':
      match.orderHarvest(command.slot, eid(command.unit), eid(command.node), command.queued);
      break;
    case 'throttle':
      match.setThrottle(command.slot, eid(command.unit), command.throttle);
      break;
    case 'silent':
      match.setSilentRunning(command.slot, eid(command.unit), command.active);
      break;
    case 'ping':
      match.activeSonar(command.slot, eid(command.unit));
      break;
    case 'build':
      match.build(command.slot, command.kind, command.x, command.y);
      break;
    case 'produce':
      match.produce(command.slot, eid(command.structure), command.kind);
      break;
  }
}
