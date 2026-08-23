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

import { addComponent, hasComponent, removeEntity } from 'bitecs';
import {
  ACTIVE_SONAR,
  CONSTRUCTION,
  DEPTH,
  Faction,
  HarvestThrottle,
  PRODUCIBLE,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
  type GameOverPayload,
  type OwnStructure,
  type OwnUnit,
  type ResourceNodeInfo,
} from '@echoes/shared';
import {
  Acoustic,
  ActivePing,
  DepthOrder,
  Harvester,
  HarvestMode,
  Health,
  MoveOrder,
  Owner,
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
import { harvestSystem } from './systems/harvest.ts';
import { movementSystem } from './systems/movement.ts';
import { pressureSystem } from './systems/pressure.ts';
import { productionSystem } from './systems/production.ts';
import { Terrain } from './terrain.ts';
import {
  createSimWorld,
  economyFor,
  spawnResourceNode,
  spawnStructure,
  spawnUnit,
  type SimWorld,
} from './world.ts';

const FIXED_DT = 1 / SIM.TICK_HZ;
const ECHO_INTERVAL_S = 1 / SIM.ECHO_HZ;
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
  private readonly nodes: ResourceNodeInfo[] = [];
  private accumulator = 0;
  private echoAccumulator = 0;
  /** Rolling worst-case Echo pass cost, for budget checks. */
  private worstEchoMs = 0;
  private matchResult: GameOverPayload | null = null;

  constructor(terrain: Terrain = Terrain.demo()) {
    this.world = createSimWorld(terrain, FIXED_DT);
    this.seedResourceNodes();
  }

  get tick(): number {
    return this.world.tick;
  }

  get worstEchoPassMs(): number {
    return this.worstEchoMs;
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
    const { widthM, heightM } = this.world.terrain;
    const corners: Array<[number, number]> = [
      [0.15, 0.15],
      [0.85, 0.15],
      [0.15, 0.85],
      [0.85, 0.85],
    ];
    for (const [fx, fy] of corners) {
      // Offset toward the centre so the field sits just off the base apron.
      const towardCentreX = fx < 0.5 ? 1 : -1;
      const towardCentreY = fy < 0.5 ? 1 : -1;
      this.addNode(widthM * fx + towardCentreX * 700, heightM * fy + towardCentreY * 250);
    }
    this.addNode(widthM * 0.5, heightM * 0.32, 6000);
    this.addNode(widthM * 0.5, heightM * 0.68, 6000);
  }

  private addNode(x: number, y: number, amount?: number): void {
    const eid = spawnResourceNode(this.world, x, y, amount);
    this.nodes.push({ id: eid, x, y, initialAmount: ResourceNode.remaining[eid]! });
  }

  addPlayer(slot: number, faction: Faction): void {
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
    const { widthM, heightM } = this.world.terrain;
    // Alternate corners so the two sides start out of earshot of each other.
    const baseX = slot % 2 === 0 ? widthM * 0.15 : widthM * 0.85;
    const baseY = slot < 2 ? heightM * 0.15 : heightM * 0.85;

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
      x: baseX + (slot % 2 === 0 ? 450 : -450),
      y: baseY,
      prebuilt: true,
    });

    const escort: UnitKind[] = [UnitKind.LightScout, UnitKind.Corvette, UnitKind.Corvette];
    escort.forEach((kind, i) => {
      spawnUnit(this.world, {
        kind,
        slot,
        faction,
        x: baseX + (i - 1) * 180,
        y: baseY + (slot < 2 ? 350 : -350),
      });
    });

    const harvester = spawnUnit(this.world, {
      kind: UnitKind.Harvester,
      slot,
      faction,
      x: baseX,
      y: baseY + (slot < 2 ? 250 : -250),
    });
    // Income from second zero: the harvester self-assigns the nearest field.
    Harvester.mode[harvester] = HarvestMode.ToNode;
  }

  // --- Commands ------------------------------------------------------------

  /** Commands are validated against ownership here; never trust the client. */
  private owns(slot: number, eid: number): boolean {
    return hasComponent(this.world, Owner, eid) && Owner.slot[eid] === slot;
  }

  orderMove(slot: number, eid: number, x: number, y: number): void {
    if (!this.owns(slot, eid) || !hasComponent(this.world, MoveOrder, eid)) return;
    MoveOrder.x[eid] = x;
    MoveOrder.y[eid] = y;
    MoveOrder.active[eid] = 1;
    // A manual move overrides standing behaviour: stop chasing, stop the loop.
    if (hasComponent(this.world, Weapon, eid)) Weapon.orderedTargetEid[eid] = 0;
    if (hasComponent(this.world, Harvester, eid)) Harvester.mode[eid] = HarvestMode.Idle;
  }

  /** Attack a contact the player has actually heard, by its opaque handle. */
  orderAttackContact(slot: number, eid: number, contactHandle: number): void {
    if (!this.owns(slot, eid) || !hasComponent(this.world, Weapon, eid)) return;
    const target = this.echo.entityForHandle(slot, contactHandle);
    if (target === undefined) return;
    if (!hasComponent(this.world, Owner, target) || Owner.slot[target] === slot) return;
    if (!hasComponent(this.world, Health, target) || Health.hp[target]! <= 0) return;
    Weapon.orderedTargetEid[eid] = target;
  }

  /** Send a harvester to a specific nodule field. */
  orderHarvest(slot: number, eid: number, nodeEid: number): void {
    if (!this.owns(slot, eid) || !hasComponent(this.world, Harvester, eid)) return;
    if (!hasComponent(this.world, ResourceNode, nodeEid)) return;
    Harvester.nodeEid[eid] = nodeEid;
    Harvester.mode[eid] = HarvestMode.ToNode;
  }

  /** docs/economy.md §3 — how loud am I willing to be paid. */
  setThrottle(slot: number, eid: number, throttle: HarvestThrottle): void {
    if (!this.owns(slot, eid) || !hasComponent(this.world, Harvester, eid)) return;
    if (!(throttle in HarvestThrottle)) return;
    Harvester.throttle[eid] = throttle;
  }

  setSilentRunning(slot: number, eid: number, active: boolean): void {
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
    if (!this.owns(slot, eid) || !hasComponent(this.world, Unit, eid)) return;
    if (!hasComponent(this.world, ActivePing, eid)) {
      addComponent(this.world, ActivePing, eid);
    }
    ActivePing.remainingS[eid] = ACTIVE_SONAR.REVEAL_DURATION_S;
    // Pinging breaks silence by definition.
    SilentRunning.active[eid] = 0;
  }

  /**
   * Commission a structure. Placement is C&C base-creep: the site must fall
   * within build radius of something the player already owns, and clear of
   * every existing footprint and nodule field.
   */
  build(slot: number, kind: StructureKind, x: number, y: number): boolean {
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

    const economy = economyFor(this.world, slot);
    if (economy.nodules < stats.cost) return false;

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

    economy.nodules -= stats.cost;
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

    this.echoAccumulator += deltaMs / 1000;
    if (this.echoAccumulator < ECHO_INTERVAL_S) return null;
    this.echoAccumulator = 0;
    return this.resolveEcho();
  }

  private step(): void {
    this.destroyedScratch.length = 0;
    harvestSystem(this.world);
    combatSystem(this.world, this.destroyedScratch);
    movementSystem(this.world);
    // The vertical axis, right beside the horizontal one — and necessarily
    // before acoustics (which prices the descent) and pressure (which bills
    // for where the hull has just arrived).
    depthSystem(this.world);
    constructionSystem(this.world);
    productionSystem(this.world);
    // Auras before acoustics: the spire's SIG-80 "projecting" state and
    // every effective HYD/PF value must be this tick's, not last tick's.
    aurasSystem(this.world);
    acousticsSystem(this.world);
    pressureSystem(this.world, this.destroyedScratch);
    this.reap();
    this.world.tick++;
  }

  /** One place where deaths are made real, so the win condition sees them all. */
  private reap(): void {
    if (this.destroyedScratch.length === 0) return;

    const lostBastions: number[] = [];
    for (const eid of this.destroyedScratch) {
      if (!hasComponent(this.world, Owner, eid)) continue;
      if (
        hasComponent(this.world, Structure, eid) &&
        Structure.kind[eid] === StructureKind.Bastion
      ) {
        lostBastions.push(Owner.slot[eid]!);
      }
      this.world.production.delete(eid);
      removeEntity(this.world, eid);
    }

    // Losing the Bastion is elimination — the C&C short game. The rest of the
    // force scuttles rather than lingering as an unwinnable nuisance.
    for (const slot of lostBastions) {
      this.eliminated.add(slot);
      for (let eid = 0; eid < Owner.slot.length; eid++) {
        if (!hasComponent(this.world, Owner, eid) || Owner.slot[eid] !== slot) continue;
        this.world.production.delete(eid);
        removeEntity(this.world, eid);
      }
    }

    if (this.matchResult === null && this.slots.length >= 2) {
      const standing = this.slots.filter((slot) => !this.eliminated.has(slot));
      if (standing.length === 1) {
        this.matchResult = { winnerSlot: standing[0]! };
      }
    }
  }

  private resolveEcho(): Map<number, EchoSnapshot> {
    const result = this.echo.run(this.world, this.slots);
    if (result.elapsedMs > this.worstEchoMs) this.worstEchoMs = result.elapsedMs;

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
        contacts: result.contactsBySlot.get(slot) ?? [],
        peakSig,
        nodules: economyFor(this.world, slot).nodules,
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
      if (hasComponent(this.world, DepthOrder, eid) && DepthOrder.active[eid] === 1) {
        unit.depthOrder = DepthOrder.targetM[eid]!;
      }
      if (hasComponent(this.world, Harvester, eid)) {
        unit.cargo = Harvester.cargo[eid]!;
        unit.throttle = Harvester.throttle[eid] as HarvestThrottle;
      }
      out.push(unit);
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
