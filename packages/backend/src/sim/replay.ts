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
import { mapById, missionMapById } from './maps/index.ts';
import { missionById } from './missions/index.ts';
import { hashWorld } from './stateHash.ts';
import { Terrain } from './terrain.ts';
import { eidOfLocalId } from './world.ts';

/** The current replay wire format. Bump when a change breaks old files. */
/**
 * 14: four commands a player did not have (#435) — attack-move, stop, hold
 * position and a yard's rally point — and one field a replayed hull carries
 * for them, its posture. None of them appears in a v13 file, so a v13 file
 * replays *identically* under these rules; it is refused anyway, on the
 * grounds every bump before it was: the format now means something a v13
 * recording cannot say, and a reader that accepted both would be guessing
 * which. Replayed hulls also route around ground now (#431), and separation
 * lands its pushes through the same step check — a v13 recording on any map
 * with a plateau in a hull's way diverges at the first refused step.
 *
 * 12: each navy carries the baseline Pressure Rating docs/systems-depth.md §3
 * publishes for it — Consortium 2, Commune 1, Directorate 3, Knights 2 — as a
 * floor on the hull's own rating. Directorate hulls are consequently rated
 * deeper and seated below the Shelf line rather than at 300 m, and the
 * commander no longer recalls its army for any contact near the Bastion, only
 * for one that has closed on it. Both change what happens on the first tick of
 * any match with those seats, so a v11 recording diverges immediately.
 *
 * 11: every hazard is staggered across its own dormancy. The head start each
 * site gets into its wait used to be scaled by the eruption's 55 s whatever
 * the kind, so a 100 s storm could never be seeded past 55 s and every storm
 * on a map began in the back half of its cycle. On `abyssal-rift-corridor` at
 * seed 1 the four storms move from 70 / 73 / 109 / 111 s to 36 / 41 / 106 /
 * 111 s — the stagger finally spanning the whole cycle. A v10 recording on any
 * map carrying a storm or a current diverges at its first hazard;
 * `ventfront-divide` carries only eruptions, whose dormancy *is* the 55 s, so
 * recordings on it are unaffected in substance and still refused, because a
 * replay that quietly means something else is worse than one that is refused.
 *
 * 10: shallow water poisons the Directorate. Their hulls run at 80% speed
 * above the Shelf line and bleed unhealable hull down to 85% of max while they
 * stay there (docs/systems-depth.md §3). A v9 recording of a match with a
 * Directorate seat diverges the first time one of their units is above 400 m,
 * which — because a PR-1 hull is seated at 300 m — is tick zero.
 *
 * 9: the Drift has a depth. Creatures are seeded at their species' working
 * depth rather than a flat 300 m, pursue vertically within a band, and bite in
 * three dimensions; the Sounder ploughs through what it is committed to rather
 * than stopping at weapons range, grinding structures and large hulls along
 * the path it swept (docs/bestiary.md §4). Every v8 recording with fauna in it
 * diverges at the first creature that moves, which is the first tick.
 *
 * 8: kelp entanglement fields grip. A `kelp-entanglement` site is now the
 * first *permanent* hazard — no cycle, Active from the first tick — dragging
 * hulls by faction and hull size, adding SIG to anything moving through, and
 * opening only to a blast or to Bathyarch thermal cutters (docs/hazards.md
 * §4). A v7 recording on the Kelp Labyrinth diverges the first time anything
 * enters the maze core, which is immediately.
 *
 * 7: cold shock currents run. A `cold-shock` site is now a cycling hazard that
 * drifts hulls along an authored bearing, slows everything but the Knights,
 * adds SIG to anything driving against it, and freezes fauna while it flows
 * (docs/hazards.md §8). A v6 recording on the Kelp Labyrinth diverges the
 * first time anything crosses a current site; recordings on the other two maps
 * are unaffected in substance, but the format still moves, because a replay
 * that silently means something different is worse than one that is refused.
 *
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
 * 12: the state hash includes the ground. Terrain became writable mid-match
 * (#197) — a mission beat can collapse a span — so a replay that reproduced
 * every hull perfectly while the arch fell on a different tick used to agree
 * at every checkpoint. It no longer does. The layout is unchanged; this bump
 * is about the rules, and a v11 file replayed under them would report a
 * divergence at its first checkpoint that is really its own age.
 *
 * Still 12 after `spent` (#380): a mission replay may now carry the cadre ids
 * the campaign had spent when it was played, so playback fields the same
 * short party. Optional and absent-is-empty, and that default is *correct*
 * for every v12 file recorded before the field existed — no roster was ever
 * spent then, so none is the party those files were played with. A layout
 * that gains a field whose absence reproduces the old match is not a new
 * format.
 *
 * 11: replays carry the mission they were played as, if any. A mission's
 * authored forces and its beat schedule are installed by the Match
 * constructor, so playback reproduces them from the id alone — but a v10
 * replay of a mission would reconstruct an empty map and diverge on the first
 * tick, and a v10 file cannot say which mission it was. The layout gained a
 * field; the rules gained a second way a match can start.
 *
 * 13: replays carry the Drift Health the map opened on. docs/campaign.md §2
 * rule 5 lets a campaign mission start on ground an earlier mission wore down,
 * and that grid decides which regions admit fauna at all (`spawnsAllowed`), so
 * a v12 replay of a carried mission would seed a different Drift and diverge
 * at the first checkpoint. Null is a first visit, and every skirmish.
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
export const REPLAY_FORMAT_VERSION = 14;

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
  | { tick: number; type: 'followFloor'; slot: number; unit: number; active: boolean }
  | {
      tick: number;
      type: 'attackMove';
      slot: number;
      unit: number;
      x: number;
      y: number;
      queued: boolean;
    }
  | { tick: number; type: 'stop'; slot: number; unit: number }
  | { tick: number; type: 'hold'; slot: number; unit: number; active: boolean }
  | { tick: number; type: 'rally'; slot: number; structure: number; x: number; y: number }
  | { tick: number; type: 'attack'; slot: number; unit: number; contact: number; queued: boolean }
  | { tick: number; type: 'torpedo'; slot: number; unit: number; contact: number }
  | { tick: number; type: 'noisemaker'; slot: number; unit: number }
  | { tick: number; type: 'mine'; slot: number; unit: number }
  | { tick: number; type: 'depthcharge'; slot: number; unit: number; depth: number }
  | { tick: number; type: 'harvest'; slot: number; unit: number; node: number; queued: boolean }
  | { tick: number; type: 'throttle'; slot: number; unit: number; throttle: HarvestThrottle }
  | { tick: number; type: 'silent'; slot: number; unit: number; active: boolean }
  | { tick: number; type: 'ping'; slot: number; unit: number }
  /**
   * The commander's one act — no unit, because an act is the commander's and
   * not a hull's (`MissionCommanderAbility` measures from an authored point).
   */
  | { tick: number; type: 'ability'; slot: number }
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
  /**
   * The authored mission, or null for a skirmish.
   *
   * Part of the setup in the same way the map is: a mission installs its own
   * forces and beats in the Match constructor, so the id is the whole of what
   * playback needs to rebuild them.
   */
  missionId: string | null;
  /**
   * Drift Health the map opened on — docs/campaign.md §2 rule 5 — or null for
   * the biome defaults. Part of the setup like `fauna`: it decides where the
   * Drift may be seeded, so playback needs it before the first tick.
   */
  driftCarry: number[] | null;
  /**
   * Cadre ids the campaign had spent when this mission was played, if any
   * (`MatchOptions.spent`). Part of the setup the way `missionId` is: the
   * Match constructor fields the party through it, so a replay of *Conclave*
   * played with the Third entered at the Rest has to seat five hulls, not
   * six, or it diverges at the first checkpoint. Omitted when empty, so a
   * replay of the same match stays byte-identical with one recorded before
   * the field existed.
   */
  spent?: string[];
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
  private readonly missionId: string | null;
  private readonly driftCarry: number[] | null;
  private readonly spent: readonly string[];
  private readonly checkpointInterval: number;
  /**
   * Negative infinity rather than -1 so the *first* call checkpoints tick 0.
   * A checkpoint at the start is worth having on its own: it proves both runs
   * began from the same world, which turns "the replay diverged" into "the
   * replay diverged somewhere after the opening", a much smaller haystack.
   */
  private lastCheckpointTick = Number.NEGATIVE_INFINITY;

  constructor(
    seed: number,
    mapId: string,
    fauna: boolean,
    missionId: string | null = null,
    driftCarry: readonly number[] | null = null,
    spent: readonly string[] = [],
    checkpointIntervalTicks = 300
  ) {
    this.seed = seed;
    this.mapId = mapId;
    this.fauna = fauna;
    this.missionId = missionId;
    // Copied rather than held: the caller's array is the room's record of what
    // the client presented, and a replay must describe the world that was, not
    // whatever that reference becomes later.
    this.driftCarry = driftCarry === null ? null : [...driftCarry];
    // Sorted for `players`' reason: the set arrived from a client's storage in
    // whatever order it was written, and a replay of the same match should
    // not differ by it.
    this.spent = [...spent].sort();
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
      missionId: this.missionId,
      driftCarry: this.driftCarry === null ? null : [...this.driftCarry],
      ...(this.spent.length === 0 ? {} : { spent: [...this.spent] }),
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

  // A mission resolves its own map, which is deliberately not in the public
  // catalogue `mapById` reads: a single-seat authored scenario is not an
  // archetype anybody can pick.
  const mission = replay.missionId === null ? undefined : missionById(replay.missionId);
  if (replay.missionId !== null && mission === undefined) {
    throw new Error(`replay was recorded on unknown mission "${replay.missionId}"`);
  }
  const map = mission === undefined ? mapById(replay.mapId) : missionMapById(mission.mapId);
  if (map === undefined) {
    throw new Error(`replay was recorded on unknown map "${replay.mapId}"`);
  }

  // `fauna` matters as much as the map: a match with animals in it and the
  // same match without are different matches. So does the spent roster: a
  // mission fielded five hulls is not the mission fielded six.
  const options = {
    seed: replay.seed,
    fauna: replay.fauna,
    mission,
    driftCarry: replay.driftCarry,
    spent: new Set(replay.spent ?? []),
  };
  const match = new Match(map, terrain === undefined ? options : { ...options, terrain });
  // A mission seated itself and placed its own force in the constructor; the
  // recorder never wrote a roster for one, so this loop is simply empty there.
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
    case 'followFloor':
      match.orderFollowFloor(command.slot, eid(command.unit), command.active);
      break;
    case 'attackMove':
      match.orderAttackMove(command.slot, eid(command.unit), command.x, command.y, command.queued);
      break;
    case 'stop':
      match.orderStop(command.slot, eid(command.unit));
      break;
    case 'hold':
      match.orderHold(command.slot, eid(command.unit), command.active);
      break;
    case 'rally':
      match.setRally(command.slot, eid(command.structure), command.x, command.y);
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
    case 'ability':
      match.commanderAbility(command.slot);
      break;
    case 'build':
      match.build(command.slot, command.kind, command.x, command.y);
      break;
    case 'produce':
      match.produce(command.slot, eid(command.structure), command.kind);
      break;
  }
}
