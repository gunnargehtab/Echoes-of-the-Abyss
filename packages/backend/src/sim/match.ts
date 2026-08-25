/**
 * Match — owns the world and drives the fixed-step simulation.
 *
 * Two clocks run here, deliberately:
 *   - the simulation steps at SIM.TICK_HZ (60 Hz) in fixed increments, so
 *     behaviour does not vary with server load or wall-clock jitter;
 *   - the Echo Layer resolves at SIM.ECHO_HZ (5 Hz), because detection is the
 *     expensive pass and players cannot perceive 60 Hz changes in a sonar
 *     contact anyway.
 *
 * The match itself is the classic RTS loop with the Echo Layer underneath it:
 * mine nodules, build structures, produce units, and destroy the enemy
 * Bastion. Losing your Bastion is elimination; the last commander with a
 * Bastion standing wins.
 */

import { addComponent, defineQuery, hasComponent, removeEntity } from 'bitecs';
import {
  ACTIVE_SONAR,
  CONSTRUCTION,
  CRYSTAL,
  DEPTH,
  Faction,
  HarvestThrottle,
  PRODUCIBLE,
  ResourceKind,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
  Biome,
  DRIFT,
  EchoMarkKind,
  FaunaSpecies,
  faunaStatsFor,
  HAZARDS,
  HazardPhase,
  OrdnanceKind,
  depthBandFor,
  mineCapFor,
  ResolutionTier,
  SelfEventKind,
  type EchoSnapshot,
  type SelfEvent,
  type GameOverPayload,
  type OwnOrdnance,
  type OwnStructure,
  type OwnUnit,
  type ResourceNodeInfo,
} from '@echoes/shared';
import {
  Acoustic,
  ActivePing,
  Countermeasure,
  DepthOrder,
  Harvester,
  HarvestMode,
  Health,
  Magazine,
  MoveOrder,
  Ordnance,
  Owner,
  Fauna,
  Position,
  Pressure,
  ResourceNode,
  SilentRunning,
  Structure,
  UnderConstruction,
  Unit,
  Weapon,
} from './components.ts';
import { EchoLayer } from './systems/echoLayer.ts';
import { acousticsSystem } from './systems/acoustics.ts';
import { aurasSystem } from './systems/auras.ts';
import { combatSystem } from './systems/combat.ts';
import { constructionSystem } from './systems/construction.ts';
import { depthSystem } from './systems/depth.ts';
import { separationSystem } from './systems/separation.ts';
import { clearQueue, enqueue, orderQueueSystem, queueView } from './systems/orderQueue.ts';
import { harvestSystem } from './systems/harvest.ts';
import { movementSystem } from './systems/movement.ts';
import {
  deployNoisemaker,
  dropDepthCharge,
  launchTorpedo,
  layMine,
  ordnanceSystem,
} from './systems/ordnance.ts';
import { pressureSystem } from './systems/pressure.ts';
import { productionSystem } from './systems/production.ts';
import { randomSeed } from './rng.ts';
import { ReplayRecorder, type Replay, type ReplayCommand } from './replay.ts';
import { hashWorld } from './stateHash.ts';
import { Terrain } from './terrain.ts';
import { VENTFRONT_DIVIDE, terrainFor, type MapDefinition } from './maps/index.ts';
import { countFauna, DRIFT_SLOT, faunaSystem } from './systems/fauna.ts';
import { hazardStates, hazardsSystem, isSimulated } from './systems/hazards.ts';
import { drawFor, thermalSystem } from './systems/thermal.ts';
import { titheSystem } from './systems/tithe.ts';
import {
  createSimWorld,
  economyFor,
  localIdOf,
  spawnResourceNode,
  spawnFauna,
  spawnStructure,
  spawnUnit,
  type SimWorld,
  raiseSelfEvent,
} from './world.ts';

/** Construction options for a match. Both default to "a normal live match". */
export interface MatchOptions {
  /** Fixed seed, for reproducing a match. Omitted means pick one and record it. */
  seed?: number;
  /** Capture a replay as the match runs. */
  record?: boolean;
  /**
   * Populate the Drift. On by default — a normal match has fauna.
   *
   * Tests of other subsystems turn it off, for the same reason they pass a
   * flat terrain: a world full of animals is noise when the thing under test
   * is a harvester round trip.
   */
  fauna?: boolean;
  /**
   * Override the terrain the map would paint.
   *
   * For tests only, and specifically for the ones that want a blank or
   * hand-built grid so the thing under test is not also being asked to survive
   * an authored map's biomes. A match started this way still takes its spawns
   * and resource fields from the map.
   */
  terrain?: Terrain;
}

const FIXED_DT = 1 / SIM.TICK_HZ;
/**
 * Simulation ticks between Echo passes.
 *
 * The pass used to be driven by an accumulator of wall-clock `deltaMs`, which
 * made *when* detection happened a function of how the server was being called
 * rather than of simulation time. That is fine for a live match and fatal for a
 * replay: `stepOnce` drives the tick loop directly and never touched the
 * accumulator, so playback resolved the Echo Layer exactly zero times. Every
 * command gated on a contact — a torpedo launch needs Tier 2 (§7) — was
 * therefore refused on playback while having been accepted live, and the replay
 * reported a clean run because the divergence fell between two checkpoints.
 *
 * Tick-driven, both paths resolve on the same ticks. For the common
 * `update(1000 / 60)` call this is exactly the old cadence, one pass every
 * twelve ticks; it only differs where the old code was already wrong.
 */
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
/**
 * Cap on steps per update. Without it, a long stall makes the next update try
 * to catch up in one go, which takes even longer — the classic spiral of death.
 * Past this we accept simulation time slipping behind wall-clock instead.
 */
const MAX_STEPS_PER_UPDATE = 5;

/** Longest production queue a single structure will accept. */
const MAX_QUEUE_LENGTH = 8;

/** Minimum clearance between a new structure's footprint and anything else. */
const PLACEMENT_CLEARANCE_M = 40;

export class Match {
  readonly world: SimWorld;
  /** Public for bench/echo-pass.mjs, which times the pass in isolation. */
  readonly echo = new EchoLayer();
  private readonly slots: number[] = [];
  private readonly eliminated = new Set<number>();
  private readonly destroyedScratch: number[] = [];
  /**
   * Every entity that can die, for `reap`'s zero-HP backstop. Held on the
   * instance because a bitecs query caches its result set per world.
   */
  private readonly healthQuery = defineQuery([Health, Owner]);
  private readonly nodes: ResourceNodeInfo[] = [];
  private accumulator = 0;
  /** Snapshots produced by an Echo pass inside `step`, collected by `update`. */
  private pendingSnapshots: Map<number, EchoSnapshot> | null = null;
  /** Rolling worst-case Echo pass cost, for budget checks. */
  private worstEchoMs = 0;
  /**
   * Rolling worst-case cost of a whole simulation step, and of the three
   * systems that move things within it.
   *
   * The Echo pass has had a measured budget since it was written, and the
   * 60 Hz step has had none — so a regression on the tick path was only ever
   * visible as a test that got slower, on a machine somebody happened to be
   * watching. Movement, depth and separation are timed as a group because
   * they are the part of the step that scales with the fleet.
   */
  private worstStepMs = 0;
  private worstPhysicsMs = 0;
  private matchResult: GameOverPayload | null = null;

  /** Non-null while this match is being recorded. */
  private readonly recorder: ReplayRecorder | null;
  readonly seed: number;

  /**
   * The authored map this match is being played on.
   *
   * Everything that used to be arithmetic over `widthM`/`heightM` — spawn
   * corners, resource fields — now reads from here. That arithmetic assumed a
   * square map with four usable corners, which stopped being true the moment
   * a corridor map existed.
   */
  readonly map: MapDefinition;

  constructor(map: MapDefinition = VENTFRONT_DIVIDE, options: MatchOptions = {}) {
    this.map = map;
    this.seed = options.seed ?? randomSeed();
    this.world = createSimWorld(options.terrain ?? terrainFor(map), FIXED_DT, this.seed);
    this.recorder =
      options.record === true
        ? new ReplayRecorder(this.seed, map.id, options.fauna !== false)
        : null;
    this.seedResourceNodes();
    this.seedHazards();
    if (options.fauna !== false) this.seedFauna();
  }

  /**
   * The replay of this match so far, or null when it is not being recorded.
   * Safe to call mid-match; the recording keeps going.
   */
  replay(): Replay | null {
    return this.recorder?.finish(this.world.tick) ?? null;
  }

  /** Skips the work entirely when nothing is recording. */
  private recordCommand(command: ReplayCommand): void {
    this.recorder?.record(command);
  }

  /**
   * Match-local id for an entity, for the replay log.
   *
   * -1 for an entity this world never spawned, which is what a malformed or
   * hostile command carries. It survives the round trip as "no such entity"
   * and gets rejected on replay exactly as it was rejected live.
   */
  private localId(eid: number): number {
    return localIdOf(this.world, eid) ?? -1;
  }

  get tick(): number {
    return this.world.tick;
  }

  get worstEchoPassMs(): number {
    return this.worstEchoMs;
  }

  /** Worst-case cost of a full simulation step, against the 60 Hz budget. */
  get worstStepMsCost(): number {
    return this.worstStepMs;
  }

  /** Worst-case cost of movement + depth + separation within a step. */
  get worstPhysicsMsCost(): number {
    return this.worstPhysicsMs;
  }

  /**
   * Worst-case cost of the residue read, which is a slice of the pass above.
   *
   * Reported separately because it is the newest thing inside the 2 ms budget
   * and therefore the first suspect when that budget starts slipping.
   */
  get worstMarkCostMs(): number {
    return this.echo.worstMarkCostMs;
  }

  /** Path integrals the residue read did on the most recent Echo pass. */
  get markPathWalksLastPass(): number {
    return this.echo.markPathWalksLastPass;
  }

  /** Non-null once a winner exists. Checked by the room after each update. */
  get result(): GameOverPayload | null {
    return this.matchResult;
  }

  /** Public map data: where the nodule fields are. Sent once on join. */
  get resourceNodes(): readonly ResourceNodeInfo[] {
    return this.nodes;
  }

  /**
   * Nodule fields are map data, like terrain: a home field off each starting
   * corner, and two richer contested fields in the middle — the expansion
   * bait every C&C map is built around.
   */
  private seedResourceNodes(): void {
    for (const node of this.map.resources) {
      const amount =
        node.amount ??
        (node.kind === ResourceKind.ResonanceCrystal ? CRYSTAL.FIELD_STARTING_AMOUNT : undefined);
      this.addNode(node.x, node.y, amount, node.kind);
    }
  }

  /**
   * Hazards from the map's authored sites.
   *
   * Staggered so a map's vents do not all erupt on the same beat, which would
   * turn a hazard into a metronome the player tunes out. The offset is derived
   * from the site's own position rather than drawn from the RNG: hazard timing
   * has to be identical across a replay, and position is already identical.
   */
  private seedHazards(): void {
    let id = 1;
    for (const site of this.map.hazards) {
      if (!isSimulated(site.kind)) continue;
      const stagger = (Math.abs(Math.round(site.x * 7 + site.y * 13)) % 97) / 97;
      this.world.hazards.push({
        id: id++,
        kind: site.kind,
        x: site.x,
        y: site.y,
        radiusM: site.radiusM,
        phase: HazardPhase.Dormant,
        elapsedS: stagger * HAZARDS.ERUPTION.DORMANT_S,
        stabilisedS: 0,
      });
    }
  }

  /**
   * Populate the Drift.
   *
   * Placed deterministically from the seeded RNG, and capped hard at
   * `DRIFT.MAX_POPULATION`. Fauna are entities in the Echo pass, which owns a
   * 2 ms budget #90 had to fight for, so the cap is what turns "should be fine"
   * into a guarantee — the PR reports the measured cost at the cap.
   *
   * Species are placed where the doc puts them: Ashgrazers on the vent fields
   * they feed in, Draymaws in open mid-water where they can shadow industry,
   * and a single Sounder, because there is only ever one colossus.
   */
  private seedFauna(): void {
    const { widthM, heightM } = this.world.terrain;
    const rng = this.world.rng.fork('drift');
    const budget = DRIFT.MAX_POPULATION;

    const place = (species: FaunaSpecies, count: number, wantVein: boolean): void => {
      for (let i = 0; i < count; i++) {
        if (countFauna(this.world) >= budget) return;
        // A handful of tries to find ground the species belongs on; if the map
        // has none, the herd simply does not appear there.
        for (let attempt = 0; attempt < 12; attempt++) {
          const x = rng.range(400, widthM - 400);
          const y = rng.range(400, heightM - 400);
          const onVein = this.world.terrain.biomeAt(x, y) === Biome.ThermalVein;
          if (wantVein !== onVein) continue;
          if (!this.world.drift.spawnsAllowed(x, y)) continue;
          // Never on someone's doorstep: see DRIFT.SPAWN_EXCLUSION_M.
          if (this.map.spawns.some((s) => Math.hypot(s.x - x, s.y - y) < DRIFT.SPAWN_EXCLUSION_M)) {
            continue;
          }
          spawnFauna(this.world, { species, x, y });
          break;
        }
      }
    };

    // A herd and a couple of packs, then the colossus.
    place(FaunaSpecies.Ashgrazer, 16, true);
    place(FaunaSpecies.Draymaw, 15, false);
    place(FaunaSpecies.Sounder, 1, false);
  }

  private addNode(x: number, y: number, amount?: number, kind = ResourceKind.Nodule): void {
    const eid = spawnResourceNode(this.world, x, y, amount, kind);
    this.nodes.push({
      id: eid,
      x,
      y,
      kind,
      depth: Position.depth[eid]!,
      initialAmount: ResourceNode.remaining[eid]!,
    });
  }

  addPlayer(slot: number, faction: Faction): void {
    this.recorder?.addPlayer(slot, faction);
    if (!this.slots.includes(slot)) this.slots.push(slot);
    economyFor(this.world, slot);
    this.spawnStartingBase(slot, faction);
  }

  removePlayer(slot: number): void {
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }

  /**
   * The classic opening: a Bastion and a Foundry pre-built, a harvester
   * already rolling toward the home field, and a token escort. Everything
   * else is earned.
   */
  private spawnStartingBase(slot: number, faction: Faction): void {
    // A map's spawn list *is* its player count. A slot past the end has
    // nowhere legal to start, so it gets no base rather than one placed by
    // guesswork somewhere off the authored ground.
    const spawn = this.map.spawns[slot];
    if (spawn === undefined) return;

    const baseX = spawn.x;
    const baseY = spawn.y;

    // The escort deploys *perpendicular* to the Foundry and spreads *along*
    // it — the axis the Foundry occupies is the one with room, and the axis it
    // does not is where a hull can sit clear of both footprints.
    //
    // Derived from the authored offset rather than from which half of the map
    // the slot is in, which is what the old corner arithmetic did and what
    // stops being meaningful on a map that is not a square.
    const length = Math.hypot(spawn.foundryOffsetX, spawn.foundryOffsetY) || 1;
    const alongX = spawn.foundryOffsetX / length;
    const alongY = spawn.foundryOffsetY / length;
    let awayX = -alongY;
    let awayY = alongX;
    // ...and point that perpendicular into the map rather than at the wall.
    if (awayX * (this.map.widthM / 2 - baseX) + awayY * (this.map.heightM / 2 - baseY) < 0) {
      awayX = -awayX;
      awayY = -awayY;
    }

    spawnStructure(this.world, {
      kind: StructureKind.Bastion,
      slot,
      faction,
      x: baseX,
      y: baseY,
      prebuilt: true,
    });
    spawnStructure(this.world, {
      kind: StructureKind.Foundry,
      slot,
      faction,
      x: baseX + spawn.foundryOffsetX,
      y: baseY + spawn.foundryOffsetY,
      prebuilt: true,
    });

    const escort: UnitKind[] = [UnitKind.LightScout, UnitKind.Corvette, UnitKind.Corvette];
    escort.forEach((kind, i) => {
      spawnUnit(this.world, {
        kind,
        slot,
        faction,
        x: baseX + alongX * (i - 1) * 180 + awayX * 350,
        y: baseY + alongY * (i - 1) * 180 + awayY * 350,
      });
    });

    const harvester = spawnUnit(this.world, {
      kind: UnitKind.Harvester,
      slot,
      faction,
      x: baseX + awayX * 250,
      y: baseY + awayY * 250,
    });
    // Income from second zero: the harvester self-assigns the nearest field.
    Harvester.mode[harvester] = HarvestMode.ToNode;
  }

  // --- Commands ------------------------------------------------------------

  /** Commands are validated against ownership here; never trust the client. */
  private owns(slot: number, eid: number): boolean {
    return hasComponent(this.world, Owner, eid) && Owner.slot[eid] === slot;
  }

  orderMove(slot: number, eid: number, x: number, y: number, queued = false): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'move',
      slot,
      unit: this.localId(eid),
      x,
      y,
      queued,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, MoveOrder, eid)) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    // Clamped rather than rejected, unlike orderDepth. A click past the edge
    // of the map is a legible instruction — go as far that way as the water
    // goes — where a depth below the sea floor names a place that is not
    // there. Clamping here also keeps a move order from being the one way to
    // walk a hull off the map under its own power.
    // Runs after recordCommand, so a replay re-derives the clamp rather than
    // inheriting it, and the validation path is exercised on playback too.
    x = this.world.terrain.clampXM(x);
    y = this.world.terrain.clampYM(y);

    if (queued) {
      enqueue(this.world, eid, { kind: 'move', x, y });
      return;
    }

    // An unqueued order replaces the whole plan, not just its current leg.
    clearQueue(this.world, eid);
    MoveOrder.x[eid] = x;
    MoveOrder.y[eid] = y;
    MoveOrder.active[eid] = 1;
    // A manual move overrides standing behaviour: stop chasing, stop the loop.
    if (hasComponent(this.world, Weapon, eid)) Weapon.orderedTargetEid[eid] = 0;
    if (hasComponent(this.world, Harvester, eid)) Harvester.mode[eid] = HarvestMode.Idle;
  }

  /** Attack a contact the player has actually heard, by its opaque handle. */
  orderAttackContact(slot: number, eid: number, contactHandle: number, queued = false): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'attack',
      slot,
      unit: this.localId(eid),
      contact: contactHandle,
      queued,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, Weapon, eid)) return;
    const target = this.echo.entityForHandle(slot, contactHandle);
    if (target === undefined) return;
    if (!hasComponent(this.world, Owner, target) || Owner.slot[target] === slot) return;
    if (!hasComponent(this.world, Health, target) || Health.hp[target]! <= 0) return;
    // Deliberately NOT refused here when the target is ordnance with no hull to
    // shoot off. That check lives in combat.ts's `targetAlive`, because
    // refusing at the order leaks: this path returns before the plan is
    // touched, so accepting and refusing leave the player's own hull in
    // visibly different states and `queuedOrders` reports which. That answered
    // "is this a mine or a decoy?" for free, two tiers before the Echo Layer
    // is willing to say. The order is accepted like any other; the gun then
    // finds the target is not one it can engage.

    if (queued) {
      // The anchor is where the contact is *now*, which is what the player
      // just resolved and acted on. It is never refreshed afterwards, so the
      // drawn plan cannot become a live feed of an enemy position.
      enqueue(this.world, eid, {
        kind: 'attack',
        x: Position.x[target]!,
        y: Position.y[target]!,
        target,
      });
      return;
    }
    clearQueue(this.world, eid);
    Weapon.orderedTargetEid[eid] = target;
  }

  /**
   * Launch a torpedo at a contact the player has heard.
   *
   * By opaque handle, exactly like `orderAttackContact`, and for the same
   * reason: the handle is the proof that this slot resolved this emitter. A
   * client cannot guess its way to a firing solution on something it never
   * detected, which is the whole of the acoustic fog of war applied to the
   * weapon that would most reward cheating it.
   *
   * Returns the ordnance entity, or 0 when the shot is refused — the room
   * ignores the result, the tests do not.
   */
  orderLaunchTorpedo(slot: number, eid: number, contactHandle: number): number {
    this.recordCommand({
      tick: this.world.tick,
      type: 'torpedo',
      slot,
      unit: this.localId(eid),
      contact: contactHandle,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, Magazine, eid)) return 0;
    const target = this.echo.entityForHandle(slot, contactHandle);
    if (target === undefined) return 0;
    if (!hasComponent(this.world, Owner, target) || Owner.slot[target] === slot) return 0;
    if (!hasComponent(this.world, Health, target) || Health.hp[target]! <= 0) return 0;

    // docs/systems-combat.md §7 — resolution tier is the firing solution.
    //
    // Below Tier 2 there is no launch: a Tier-1 contact is a directionless
    // smudge reported at the *listener's* own position, so a torpedo aimed at
    // it would be aimed at your own hull. The gate is not a balance choice, it
    // is the only honest reading of what the player was told.
    //
    // At Tier 2 the aim point is the blurred ghost, which lies by up to 15% of
    // range. The torpedo swims at the lie and the seeker has the run to find
    // the truth. At Tier 3 and above the solution is exact.
    const solution = this.echo.firingSolution(slot, target);
    if (solution === undefined || solution.tier < ResolutionTier.Bearing) return 0;

    return launchTorpedo(this.world, eid, solution.x, solution.y);
  }

  /**
   * Drop a noisemaker — docs/systems-combat.md §5.
   *
   * No target and no handle, unlike a launch: a decoy is a reflex, aimed at
   * nothing and thrown behind you. It needs no information gate for the same
   * reason, since it reveals only where you already were.
   *
   * Returns the decoy entity, or 0 when the suite is still cold.
   */
  deployNoisemaker(slot: number, eid: number): number {
    this.recordCommand({
      tick: this.world.tick,
      type: 'noisemaker',
      slot,
      unit: this.localId(eid),
    });
    if (!this.owns(slot, eid)) return 0;
    return deployNoisemaker(this.world, eid);
  }

  /**
   * Lay a mine at the hull's own position — docs/systems-combat.md §6.
   *
   * No target and no handle, like a decoy: a mine is aimed at nobody. What it
   * costs is the ten seconds of construction-grade noise the laying hull pays
   * while it arms, which is the counter-play the doc asks for — you cannot see
   * a minefield, but you can hear one being built.
   *
   * Returns the mine entity, or 0 when the player is at their cap or the hull
   * is still laying the last one.
   */
  layMine(slot: number, eid: number): number {
    this.recordCommand({
      tick: this.world.tick,
      type: 'mine',
      slot,
      unit: this.localId(eid),
    });
    if (!this.owns(slot, eid)) return 0;
    return layMine(this.world, eid, mineCapFor(this.factionOf(slot)));
  }

  /**
   * Drop a depth charge set to detonate at `depthM` — docs/systems-combat.md §8.
   *
   * A depth and no target: you are bombing water, not a contact, so there is
   * nothing to have resolved first. The information gate arrives sideways
   * instead — a contact's depth is only sent at Tier 3 and above, so a
   * commander who has not classified what is under them is guessing at the one
   * number the weapon needs.
   *
   * The depth is refused rather than clamped when it names water that is not
   * there, matching `orderDepth`: a client asking for the impossible is told
   * no, not quietly given something else.
   */
  orderDepthCharge(slot: number, eid: number, depthM: number): number {
    this.recordCommand({
      tick: this.world.tick,
      type: 'depthcharge',
      slot,
      unit: this.localId(eid),
      depth: depthM,
    });
    if (!this.owns(slot, eid)) return 0;
    if (!Number.isFinite(depthM)) return 0;
    if (depthM < DEPTH.MIN_M || depthM > DEPTH.MAX_M) return 0;
    // It must cross a band. §8 calls this "a pattern dropped (or floated) into
    // the band above or below", and the fall is the weapon's entire cost — the
    // defender hears it coming and has that time to move.
    //
    // Without this a charge set to the launcher's own depth arrived on the tick
    // it was dropped: `blast` skips the owner's own slot, so it was a free,
    // instant, uncounterable 200-damage area attack centred on a hull that
    // could not be hurt by it. Refused rather than clamped, matching orderDepth.
    if (depthBandFor(depthM) === depthBandFor(Position.depth[eid]!)) return 0;
    return dropDepthCharge(this.world, eid, depthM);
  }

  /** Send a harvester to a specific nodule field. */
  orderHarvest(slot: number, eid: number, nodeEid: number, queued = false): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'harvest',
      slot,
      unit: this.localId(eid),
      node: this.localId(nodeEid),
      queued,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, Harvester, eid)) return;
    if (!hasComponent(this.world, ResourceNode, nodeEid)) return;

    if (queued) {
      enqueue(this.world, eid, {
        kind: 'harvest',
        x: Position.x[nodeEid]!,
        y: Position.y[nodeEid]!,
        node: nodeEid,
      });
      return;
    }
    clearQueue(this.world, eid);
    Harvester.nodeEid[eid] = nodeEid;
    Harvester.mode[eid] = HarvestMode.ToNode;
  }

  /** docs/economy.md §3 — how loud am I willing to be paid. */
  setThrottle(slot: number, eid: number, throttle: HarvestThrottle): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'throttle',
      slot,
      unit: this.localId(eid),
      throttle,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, Harvester, eid)) return;
    if (!(throttle in HarvestThrottle)) return;
    Harvester.throttle[eid] = throttle;
  }

  setSilentRunning(slot: number, eid: number, active: boolean): void {
    this.recordCommand({
      tick: this.world.tick,
      type: 'silent',
      slot,
      unit: this.localId(eid),
      active,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, SilentRunning, eid)) return;
    SilentRunning.active[eid] = active ? 1 : 0;
  }

  /**
   * Order a depth change. docs/systems-depth.md §2.
   *
   * Deliberately absent: any check that the unit is *rated* for the depth it
   * is being sent to. Renting depth you cannot survive is the mechanic — the
   * pressure system bills for it — so the order is accepted and the hull pays.
   *
   * Returns false when the order is refused, so the caller can tell "rejected"
   * from "accepted"; the room ignores the result, but the tests do not.
   */
  orderDepth(slot: number, eid: number, depthM: number): boolean {
    this.recordCommand({
      tick: this.world.tick,
      type: 'depth',
      slot,
      unit: this.localId(eid),
      depth: depthM,
    });
    if (!this.owns(slot, eid) || !hasComponent(this.world, DepthOrder, eid)) return false;
    if (!Number.isFinite(depthM)) return false;
    // Rejected rather than clamped: a client asking for the impossible is told
    // no, instead of quietly being given something it did not ask for.
    if (depthM < DEPTH.MIN_M || depthM > DEPTH.MAX_M) return false;

    DepthOrder.targetM[eid] = depthM;
    DepthOrder.active[eid] = 1;
    // Diving is not something you do quietly, for the same reason pinging is
    // not: the descent itself is the noise. Ascending keeps its silence.
    if (depthM > Position.depth[eid]!) SilentRunning.active[eid] = 0;
    return true;
  }

  /** The big red button. docs/systems-echo.md §5. */
  activeSonar(slot: number, eid: number): void {
    this.recordCommand({ tick: this.world.tick, type: 'ping', slot, unit: this.localId(eid) });
    if (!this.owns(slot, eid) || !hasComponent(this.world, Unit, eid)) return;
    if (!hasComponent(this.world, ActivePing, eid)) {
      addComponent(this.world, ActivePing, eid);
    }
    ActivePing.remainingS[eid] = ACTIVE_SONAR.REVEAL_DURATION_S;
    raiseSelfEvent(this.world, { kind: SelfEventKind.Ping, eid });
    // Pinging breaks silence by definition.
    SilentRunning.active[eid] = 0;
  }

  /**
   * Commission a structure. Placement is C&C base-creep: the site must fall
   * within build radius of something the player already owns, and clear of
   * every existing footprint and nodule field.
   */
  build(slot: number, kind: StructureKind, x: number, y: number): boolean {
    this.recordCommand({ tick: this.world.tick, type: 'build', slot, kind, x, y });
    const stats = structureStatsFor(kind);
    if (!stats.constructible) return false;
    // Faction signature structures are exactly that — another navy's order
    // for one is rejected server-side no matter what the client asked.
    if (stats.faction !== undefined && stats.faction !== this.factionOf(slot)) return false;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const { widthM, heightM } = this.world.terrain;
    if (
      x < stats.radiusM ||
      y < stats.radiusM ||
      x > widthM - stats.radiusM ||
      y > heightM - stats.radiusM
    ) {
      return false;
    }

    // Terrain requirement, enforced server-side like every other placement
    // rule. A vent tap only works on a vent: docs/economy.md §2 puts Thermal
    // Draw in Thermal Veins, and that constraint is the point — the tap drags
    // players onto the game's best masking terrain and makes them loud there.
    if (
      stats.requiresBiome !== undefined &&
      this.world.terrain.biomeAt(x, y) !== stats.requiresBiome
    ) {
      return false;
    }

    const economy = economyFor(this.world, slot);
    if (economy.nodules < stats.cost) return false;
    // Crystal-locked structures are the faction signatures: the upper tech
    // tier the deep pays for (docs/economy.md §2).
    if (economy.crystal < (stats.crystalCost ?? 0)) return false;

    let anchored = false;
    for (let eid = 0; eid < Structure.kind.length; eid++) {
      if (!hasComponent(this.world, Structure, eid)) continue;
      const d = Math.hypot(Position.x[eid]! - x, Position.y[eid]! - y);
      const otherRadius = structureStatsFor(Structure.kind[eid] as StructureKind).radiusM;
      if (d < stats.radiusM + otherRadius + PLACEMENT_CLEARANCE_M) return false;
      if (Owner.slot[eid] === slot && d <= CONSTRUCTION.BUILD_RADIUS_M) anchored = true;
    }
    if (!anchored) return false;

    for (const node of this.nodes) {
      if (!hasComponent(this.world, ResourceNode, node.id)) continue;
      if (Math.hypot(node.x - x, node.y - y) < stats.radiusM + PLACEMENT_CLEARANCE_M) return false;
    }

    economy.nodules -= stats.cost;
    economy.crystal -= stats.crystalCost ?? 0;
    spawnStructure(this.world, {
      kind,
      slot,
      faction: this.factionOf(slot),
      x,
      y,
    });
    return true;
  }

  /** Queue a unit at a production structure. Cost is paid on enqueue. */
  produce(slot: number, structureEid: number, kind: UnitKind): boolean {
    this.recordCommand({
      tick: this.world.tick,
      type: 'produce',
      slot,
      structure: this.localId(structureEid),
      kind,
    });
    if (!this.owns(slot, structureEid)) return false;
    if (!hasComponent(this.world, Structure, structureEid)) return false;
    if (hasComponent(this.world, UnderConstruction, structureEid)) return false;
    const allowed = PRODUCIBLE[Structure.kind[structureEid] as StructureKind];
    if (allowed === undefined || !allowed.includes(kind)) return false;

    const economy = economyFor(this.world, slot);
    const stats = statsFor(kind);
    let line = this.world.production.get(structureEid);
    if (line === undefined) {
      line = { queue: [], remainingS: 0 };
      this.world.production.set(structureEid, line);
    }
    if (line.queue.length >= MAX_QUEUE_LENGTH) return false;
    if (economy.nodules < stats.cost) return false;
    if (economy.crystal < (stats.crystalCost ?? 0)) return false;

    economy.nodules -= stats.cost;
    economy.crystal -= stats.crystalCost ?? 0;
    line.queue.push(kind);
    if (line.queue.length === 1) line.remainingS = stats.buildTimeS;
    return true;
  }

  private factionOf(slot: number): Faction {
    // Any surviving entity of the slot knows its faction; the Bastion always
    // exists while the player does.
    for (let eid = 0; eid < Owner.slot.length; eid++) {
      if (hasComponent(this.world, Owner, eid) && Owner.slot[eid] === slot) {
        return Owner.faction[eid] as Faction;
      }
    }
    return Faction.Bathyarch;
  }

  // --- Loop ----------------------------------------------------------------

  /**
   * Advance the simulation by `deltaMs` of wall-clock time.
   * Returns per-slot snapshots on ticks where the Echo Layer ran, otherwise null.
   */
  update(deltaMs: number): Map<number, EchoSnapshot> | null {
    this.accumulator += deltaMs / 1000;
    this.pendingSnapshots = null;

    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_UPDATE) {
      this.step();
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_UPDATE) {
      // Drop the backlog rather than trying to make it up later.
      this.accumulator = 0;
    }

    // Whatever the steps resolved on their way past an Echo tick. Null when
    // this update did not cross one, which is what the room uses to decide
    // there is nothing new to send.
    return this.pendingSnapshots;
  }

  /**
   * Advance exactly one fixed step.
   *
   * Public for replay playback, which drives the simulation by tick rather
   * than by wall-clock — feeding it deltaMs would reintroduce the very
   * timing dependence a replay exists to eliminate.
   */
  stepOnce(): void {
    this.step();
  }

  private step(): void {
    // Wall-clock only, and deliberately never mixed into the state hash: the
    // simulation must not be able to notice how long it took to run.
    const stepStarted = performance.now();
    this.recorder?.maybeCheckpoint(this.world.tick, () => hashWorld(this.world));
    this.destroyedScratch.length = 0;
    this.world.environmentalDeaths.clear();
    harvestSystem(this.world);
    combatSystem(this.world, this.destroyedScratch);
    const physicsStarted = performance.now();
    movementSystem(this.world);
    // The vertical axis, right beside the horizontal one — and necessarily
    // before acoustics (which prices the descent) and pressure (which bills
    // for where the hull has just arrived).
    depthSystem(this.world);
    // After movement and depth, before anything reads positions: separation
    // is a correction to where hulls ended up, and detection must see the
    // corrected picture rather than a stack that no longer exists.
    separationSystem(this.world);
    // Ordnance last of the movers, so a fuse checks against where hulls
    // actually finished the tick rather than where they started it. A torpedo
    // that detonated on a position its target had already left would be the
    // one weapon in the game you could outrun by a single frame.
    ordnanceSystem(this.world, this.destroyedScratch);
    const physicsCost = performance.now() - physicsStarted;
    if (physicsCost > this.worstPhysicsMs) this.worstPhysicsMs = physicsCost;
    // After the systems that can finish an order: a unit that arrived this
    // tick starts its next leg on the next one.
    orderQueueSystem(this.world);
    constructionSystem(this.world);
    productionSystem(this.world);
    // Auras before acoustics: the spire's SIG-80 "projecting" state and
    // every effective HYD/PF value must be this tick's, not last tick's.
    aurasSystem(this.world);
    acousticsSystem(this.world);
    pressureSystem(this.world, this.destroyedScratch);
    // Hazards after pressure and before reap: a hull killed by an eruption
    // should die on the tick the eruption killed it, not the next one.
    hazardsSystem(this.world, this.destroyedScratch);
    // After hazards, so a tap destroyed by its own vent stops powering
    // anything on the same tick it dies.
    thermalSystem(this.world);
    // After thermal and before reap: the tithe is income, not production, so
    // it does not care about Draw satisfaction — but a Bastion destroyed this
    // tick should not pay out on the tick it dies.
    titheSystem(this.world);
    faunaSystem(this.world, this.destroyedScratch);
    this.driftTick();
    this.reap();
    // After reap, so a structure destroyed this tick has already left its
    // mark and does not lose a tick of the three minutes it is owed.
    this.world.marks.tick(FIXED_DT);
    this.world.tick++;
    if (this.world.tick % ECHO_TICK_INTERVAL === 0) {
      this.pendingSnapshots = this.resolveEcho();
    }
    const stepCost = performance.now() - stepStarted;
    if (stepCost > this.worstStepMs) this.worstStepMs = stepCost;
  }

  /**
   * Wear the Drift down, and let it recover.
   *
   * Noise is summed per region from live emitters, so a player who chooses to
   * be poor and safe is also choosing not to strip the ground they stand on.
   * Everything that makes you strong makes you loud, and loud is what kills
   * the map (docs/bestiary.md §6).
   */
  private driftTick(): void {
    this.world.driftNoise.fill(0);
    for (let eid = 0; eid < Acoustic.sig.length; eid++) {
      if (!hasComponent(this.world, Acoustic, eid)) continue;
      if (!hasComponent(this.world, Owner, eid)) continue;
      if (Owner.slot[eid] === DRIFT_SLOT) continue;
      const sig = Acoustic.sig[eid]!;
      if (sig <= 0) continue;
      const region = this.world.drift.regionIndex(Position.x[eid]!, Position.y[eid]!);
      this.world.driftNoise[region] = (this.world.driftNoise[region] ?? 0) + sig;
    }
    this.world.drift.tick(FIXED_DT, this.world.driftNoise);
  }

  /** One place where deaths are made real, so the win condition sees them all. */
  private reap(): void {
    // Backstop before the early return: anything sitting at zero HP dies here
    // even if nothing reported it.
    //
    // The convention is that a system dealing damage appends its kills to
    // `destroyed`, and twice now a system has not — `hazardsSystem` and
    // `faunaSystem` both damaged hulls and told nobody. The result was silent
    // and permanent rather than merely wrong: the entity kept every component,
    // so it stayed on the board at hp <= 0, still emitting, a contact every
    // listener could resolve and nothing could ever kill. Ordnance made it
    // vivid (a depth charge caught in an eruption becomes an immortal SIG-30
    // emitter that never detonates and never expires) but any hull did it.
    //
    // Both systems now report, which is what gives a kill its attribution.
    // This sweep is the invariant underneath that convention, so the next
    // system to forget is wrong for one tick instead of forever.
    const alive = this.healthQuery(this.world);
    for (let i = 0; i < alive.length; i++) {
      const eid = alive[i]!;
      if (Health.hp[eid]! <= 0) this.destroyedScratch.push(eid);
    }

    if (this.destroyedScratch.length === 0) return;

    const lostBastions: number[] = [];
    for (const eid of this.destroyedScratch) {
      if (!hasComponent(this.world, Owner, eid)) continue;

      // A dead creature is Biomass and a bite out of the region it died in
      // (docs/bestiary.md §5, §6). Paid to whoever killed it, at the
      // Directorate's full rate or everyone else's rendering-contract share.
      if (hasComponent(this.world, Fauna, eid)) {
        // A creature the map killed pays nobody: biomass is *rendered* fauna,
        // and an eruption renders nothing (see SimWorld.environmentalDeaths).
        // The Drift still loses the creature, so recordKill stays.
        if (!this.world.environmentalDeaths.has(eid)) this.payBiomass(eid);
        this.world.drift.recordKill(Position.x[eid]!, Position.y[eid]!);
        this.echo.forget(eid);
        removeEntity(this.world, eid);
        continue;
      }

      if (hasComponent(this.world, Structure, eid)) {
        // Residue outlives the thing that made it — three minutes for a
        // structure against ninety seconds for a fight (docs/systems-echo.md
        // §7). Recorded here because reap() is the one place a death is made
        // real, so a mark can never disagree with what actually died.
        this.world.marks.add(EchoMarkKind.DestroyedStructure, Position.x[eid]!, Position.y[eid]!);
        if (Structure.kind[eid] === StructureKind.Bastion) {
          lostBastions.push(Owner.slot[eid]!);
        }
      }
      this.world.production.delete(eid);
      // Before the id goes back into bitecs's free list: anything keyed by eid
      // outside the ECS has to be dropped, or it comes back attached to
      // whatever inherits the id. A contact handle would name a hull the player
      // never detected (see EchoLayer.forget); a queued order would be executed
      // — a brand-new unit walking off to finish a dead one's last waypoint.
      this.echo.forget(eid);
      clearQueue(this.world, eid);
      removeEntity(this.world, eid);
    }

    // Losing the Bastion is elimination — the C&C short game. The rest of the
    // force scuttles rather than lingering as an unwinnable nuisance.
    for (const slot of lostBastions) this.eliminate(slot);

    this.resolveVictory();
  }

  /**
   * A slot leaves the match without being beaten: abandoned, or out of grace
   * on a disconnect (docs/tech-stack.md "Match lifecycle").
   *
   * Resolved as elimination rather than as "never here". Quietly dropping the
   * slot from the roster would leave a one-commander match, and the victory
   * check needs two rosters to declare a winner — so the survivor would sit in
   * a game they had already won, waiting for an enemy that no longer exists.
   */
  resign(slot: number): void {
    this.eliminate(slot);
    this.resolveVictory();
  }

  /** Mark a slot out and scuttle everything it owned. */
  private eliminate(slot: number): void {
    if (this.eliminated.has(slot)) return;
    this.eliminated.add(slot);
    for (let eid = 0; eid < Owner.slot.length; eid++) {
      if (!hasComponent(this.world, Owner, eid) || Owner.slot[eid] !== slot) continue;
      this.world.production.delete(eid);
      this.echo.forget(eid);
      clearQueue(this.world, eid);
      removeEntity(this.world, eid);
    }
  }

  private resolveVictory(): void {
    if (this.matchResult !== null || this.slots.length < 2) return;
    const standing = this.slots.filter((slot) => !this.eliminated.has(slot));
    if (standing.length === 1) {
      this.matchResult = { winnerSlot: standing[0]! };
    }
  }

  /**
   * Award Biomass for a kill.
   *
   * §5: only the Directorate processes it at scale; everyone else sells
   * remains through Consortium rendering contracts at a fraction. Yield also
   * scales with the region's Drift Health, which is the guard-rail against a
   * Directorate snowball (docs/economy.md §9) — over-harvesting kills the
   * region that pays them.
   *
   * The killer is whoever was shooting it, which the simulation does not
   * record; attributed instead to the nearest player entity, which is the same
   * answer in every case that matters and needs no new bookkeeping.
   */
  private payBiomass(eid: number): void {
    const stats = faunaStatsFor(Fauna.species[eid] as FaunaSpecies);
    const x = Position.x[eid]!;
    const y = Position.y[eid]!;

    let bestSlot = -1;
    let bestD2 = Infinity;
    let bestFaction = Faction.Bathyarch;
    for (let other = 0; other < Owner.slot.length; other++) {
      if (!hasComponent(this.world, Owner, other)) continue;
      if (Owner.slot[other] === DRIFT_SLOT) continue;
      if (!hasComponent(this.world, Position, other)) continue;
      const d2 = (Position.x[other]! - x) ** 2 + (Position.y[other]! - y) ** 2;
      if (d2 >= bestD2) continue;
      bestD2 = d2;
      bestSlot = Owner.slot[other]!;
      bestFaction = Owner.faction[other] as Faction;
    }
    if (bestSlot < 0) return;

    const rate = bestFaction === Faction.Directorate ? 1 : DRIFT.RENDERING_CONTRACT_RATE;
    const yieldScale = this.world.drift.yieldMultiplier(x, y);
    economyFor(this.world, bestSlot).biomass += stats.biomass * rate * yieldScale;
  }

  private resolveEcho(): Map<number, EchoSnapshot> {
    const result = this.echo.run(this.world, this.slots);
    if (result.elapsedMs > this.worstEchoMs) this.worstEchoMs = result.elapsedMs;

    // Self-events, bucketed by whoever they happened to. Drained here rather
    // than at the end of the tick because the Echo snapshot is the only thing
    // that carries them, and it is built at 5 Hz while events are raised at
    // 60 Hz — so a tick's worth of them accumulates and ships together.
    const eventsBySlot = new Map<number, SelfEvent[]>();
    for (const slot of this.slots) eventsBySlot.set(slot, []);
    for (const pending of this.world.selfEvents) {
      if (!hasComponent(this.world, Owner, pending.eid)) continue;
      const bucket = eventsBySlot.get(Owner.slot[pending.eid]!);
      if (bucket === undefined) continue;
      const event: SelfEvent = { kind: pending.kind, unitId: pending.eid };
      if (pending.bearing !== undefined) event.bearing = pending.bearing;
      bucket.push(event);
    }
    this.world.selfEvents.length = 0;

    // Being lit is raised by the Echo pass itself, so it arrives separately
    // from the 60 Hz channel above and is folded in here.
    for (const [slot, hits] of result.litBySlot) {
      const bucket = eventsBySlot.get(slot);
      if (bucket === undefined) continue;
      for (const hit of hits) {
        bucket.push({
          kind: SelfEventKind.Exposed,
          unitId: hit.unitId,
          bearing: hit.bearing,
        });
      }
    }

    const snapshots = new Map<number, EchoSnapshot>();
    for (const slot of this.slots) {
      const units = this.collectOwnUnits(slot);
      const structures = this.collectOwnStructures(slot);
      let peakSig = 0;
      for (const unit of units) {
        if (unit.sig > peakSig) peakSig = unit.sig;
      }
      for (const structure of structures) {
        if (structure.sig > peakSig) peakSig = structure.sig;
      }
      snapshots.set(slot, {
        tick: this.world.tick,
        units,
        structures,
        ordnance: this.collectOwnOrdnance(slot),
        contacts: result.contactsBySlot.get(slot) ?? [],
        peakSig,
        nodules: economyFor(this.world, slot).nodules,
        crystal: economyFor(this.world, slot).crystal,
        exposure: result.exposureBySlot.get(slot) ?? {
          tier: ResolutionTier.Silent,
          trackedCount: 0,
        },
        selfEvents: eventsBySlot.get(slot) ?? [],
        marks: result.marksBySlot.get(slot) ?? [],
        // Public, unlike everything else here: docs/maps.md requires hazard
        // telegraphing, and a telegraph only one player can read is not one.
        hazards: hazardStates(this.world),
        draw: { ...drawFor(this.world, slot) },
        biomass: economyFor(this.world, slot).biomass,
        driftHealth: this.world.drift.snapshot(),
      });
    }
    return snapshots;
  }

  /** A player always sees their own units in full. */
  private collectOwnUnits(slot: number): OwnUnit[] {
    const out: OwnUnit[] = [];
    // bitecs entity ids are dense from 0; iterating the Owner store directly is
    // cheaper than a query for this small, per-slot filtered read.
    for (let eid = 0; eid < Owner.slot.length; eid++) {
      if (!hasComponent(this.world, Owner, eid)) continue;
      if (Owner.slot[eid] !== slot) continue;
      if (!hasComponent(this.world, Unit, eid)) continue;

      const unit: OwnUnit = {
        id: eid,
        kind: Unit.kind[eid] as UnitKind,
        x: Position.x[eid]!,
        y: Position.y[eid]!,
        depth: Position.depth[eid]!,
        hp: Health.hp[eid]!,
        maxHp: Health.max[eid]!,
        heading: 0,
        sig: Acoustic.sig[eid]!,
        silentRunning: SilentRunning.active[eid] === 1,
        pressureBonus: Pressure.bonus[eid]!,
        crushDamage: Pressure.crushTaken[eid]!,
      };
      const queue = queueView(this.world, eid);
      if (queue !== undefined) {
        unit.queuedOrders = queue.map((order) => ({ kind: order.kind, x: order.x, y: order.y }));
      }
      if (hasComponent(this.world, DepthOrder, eid) && DepthOrder.active[eid] === 1) {
        unit.depthOrder = DepthOrder.targetM[eid]!;
      }
      if (
        hasComponent(this.world, Countermeasure, eid) &&
        Countermeasure.cooldownRemainingS[eid]! > 0
      ) {
        unit.decoyCooldownS = Countermeasure.cooldownRemainingS[eid]!;
      }
      if (hasComponent(this.world, Magazine, eid)) {
        unit.torpedoes = Magazine.torpedoes[eid]!;
        if (Magazine.rearmRemainingS[eid]! > 0) {
          unit.rearmRemainingS = Magazine.rearmRemainingS[eid]!;
        }
      }
      if (hasComponent(this.world, Harvester, eid)) {
        unit.cargo = Harvester.cargo[eid]!;
        unit.cargoKind = Harvester.cargoKind[eid] as ResourceKind;
        unit.throttle = Harvester.throttle[eid] as HarvestThrottle;
      }
      out.push(unit);
    }
    return out;
  }

  /**
   * A player's own ordnance in the water.
   *
   * Sent in full, like their hulls, and for the same reason: it is theirs. The
   * enemy's view of the same torpedo goes through the Echo Layer as an ordinary
   * contact, which is what makes "you always hear it coming" a property of the
   * simulation rather than a favour the renderer does.
   */
  private collectOwnOrdnance(slot: number): OwnOrdnance[] {
    const out: OwnOrdnance[] = [];
    for (let eid = 0; eid < Owner.slot.length; eid++) {
      if (!hasComponent(this.world, Owner, eid)) continue;
      if (Owner.slot[eid] !== slot) continue;
      if (!hasComponent(this.world, Ordnance, eid)) continue;

      out.push({
        id: eid,
        kind: Ordnance.kind[eid] as OrdnanceKind,
        x: Position.x[eid]!,
        y: Position.y[eid]!,
        depth: Position.depth[eid]!,
        heading: Ordnance.heading[eid]!,
        sig: Acoustic.sig[eid]!,
        remainingS: Ordnance.remainingS[eid]!,
      });
    }
    return out;
  }

  private collectOwnStructures(slot: number): OwnStructure[] {
    const out: OwnStructure[] = [];
    for (let eid = 0; eid < Owner.slot.length; eid++) {
      if (!hasComponent(this.world, Owner, eid)) continue;
      if (Owner.slot[eid] !== slot) continue;
      if (!hasComponent(this.world, Structure, eid)) continue;

      let buildProgress = 1;
      if (hasComponent(this.world, UnderConstruction, eid)) {
        const total = UnderConstruction.totalS[eid]!;
        buildProgress = total > 0 ? 1 - UnderConstruction.remainingS[eid]! / total : 1;
      }

      const line = this.world.production.get(eid);
      let queueProgress = 0;
      if (line !== undefined && line.queue.length > 0) {
        const total = statsFor(line.queue[0]!).buildTimeS;
        queueProgress = total > 0 ? 1 - line.remainingS / total : 1;
      }

      out.push({
        id: eid,
        kind: Structure.kind[eid] as StructureKind,
        x: Position.x[eid]!,
        y: Position.y[eid]!,
        depth: Position.depth[eid]!,
        hp: Health.hp[eid]!,
        maxHp: Health.max[eid]!,
        sig: Acoustic.sig[eid]!,
        buildProgress,
        queue: line !== undefined ? [...line.queue] : [],
        queueProgress,
      });
    }
    return out;
  }
}

/** Re-exported so the room layer does not need to reach into sim internals. */
export { Terrain, statsFor };
