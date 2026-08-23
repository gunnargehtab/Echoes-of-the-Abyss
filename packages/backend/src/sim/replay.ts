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
import { hashWorld } from './stateHash.ts';
import { Terrain } from './terrain.ts';
import { eidOfLocalId } from './world.ts';

/** The current replay wire format. Bump when a change breaks old files. */
export const REPLAY_FORMAT_VERSION = 1;

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
  private readonly checkpointInterval: number;
  /**
   * Negative infinity rather than -1 so the *first* call checkpoints tick 0.
   * A checkpoint at the start is worth having on its own: it proves both runs
   * began from the same world, which turns "the replay diverged" into "the
   * replay diverged somewhere after the opening", a much smaller haystack.
   */
  private lastCheckpointTick = Number.NEGATIVE_INFINITY;

  constructor(seed: number, checkpointIntervalTicks = 300) {
    this.seed = seed;
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
export function playReplay(replay: Replay, terrain: Terrain = Terrain.demo()): ReplayResult {
  if (replay.version !== REPLAY_FORMAT_VERSION) {
    throw new Error(`replay format ${replay.version} is not this build's ${REPLAY_FORMAT_VERSION}`);
  }

  const match = new Match(terrain, { seed: replay.seed });
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
