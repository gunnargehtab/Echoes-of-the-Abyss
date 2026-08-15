/**
 * Match — owns the world and drives the fixed-step simulation.
 *
 * Two clocks run here, deliberately:
 *   - the simulation steps at SIM.TICK_HZ (60 Hz) in fixed increments, so
 *     behaviour does not vary with server load or wall-clock jitter;
 *   - the Echo Layer resolves at SIM.ECHO_HZ (5 Hz), because detection is the
 *     expensive pass and players cannot perceive 60 Hz changes in a sonar
 *     contact anyway.
 */

import { addComponent, hasComponent } from 'bitecs';
import {
  ACTIVE_SONAR,
  Faction,
  SIM,
  UnitKind,
  statsFor,
  type EchoSnapshot,
  type OwnUnit,
} from '@echoes/shared';
import {
  Acoustic,
  ActivePing,
  Health,
  MoveOrder,
  Owner,
  Position,
  SilentRunning,
  Unit,
} from './components.ts';
import { EchoLayer } from './systems/echoLayer.ts';
import { acousticsSystem } from './systems/acoustics.ts';
import { movementSystem } from './systems/movement.ts';
import { pressureSystem } from './systems/pressure.ts';
import { Terrain } from './terrain.ts';
import { createSimWorld, spawnUnit, type SimWorld } from './world.ts';

const FIXED_DT = 1 / SIM.TICK_HZ;
const ECHO_INTERVAL_S = 1 / SIM.ECHO_HZ;
/**
 * Cap on steps per update. Without it, a long stall makes the next update try
 * to catch up in one go, which takes even longer — the classic spiral of death.
 * Past this we accept simulation time slipping behind wall-clock instead.
 */
const MAX_STEPS_PER_UPDATE = 5;

export class Match {
  readonly world: SimWorld;
  private readonly echo = new EchoLayer();
  private readonly slots: number[] = [];
  private readonly destroyedScratch: number[] = [];
  private accumulator = 0;
  private echoAccumulator = 0;
  /** Rolling worst-case Echo pass cost, for budget checks. */
  private worstEchoMs = 0;

  constructor(terrain: Terrain = Terrain.demo()) {
    this.world = createSimWorld(terrain, FIXED_DT);
  }

  get tick(): number {
    return this.world.tick;
  }

  get worstEchoPassMs(): number {
    return this.worstEchoMs;
  }

  addPlayer(slot: number, faction: Faction): void {
    if (!this.slots.includes(slot)) this.slots.push(slot);
    this.spawnStartingForce(slot, faction);
  }

  removePlayer(slot: number): void {
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }

  /**
   * A token opening force so a fresh room has something to hear.
   * Placeholder for a real build/production system.
   */
  private spawnStartingForce(slot: number, faction: Faction): void {
    const { widthM, heightM } = this.world.terrain;
    // Alternate corners so the two sides start out of earshot of each other.
    const baseX = slot % 2 === 0 ? widthM * 0.15 : widthM * 0.85;
    const baseY = slot < 2 ? heightM * 0.15 : heightM * 0.85;

    const roster: UnitKind[] = [
      UnitKind.Corvette,
      UnitKind.Corvette,
      UnitKind.LightScout,
      UnitKind.Harvester,
      UnitKind.Cruiser,
    ];

    roster.forEach((kind, i) => {
      spawnUnit(this.world, {
        kind,
        slot,
        faction,
        x: baseX + (i % 3) * 180,
        y: baseY + Math.floor(i / 3) * 180,
        depth: 600,
      });
    });
  }

  // --- Commands ------------------------------------------------------------

  /** Commands are validated against ownership here; never trust the client. */
  private owns(slot: number, eid: number): boolean {
    return hasComponent(this.world, Owner, eid) && Owner.slot[eid] === slot;
  }

  orderMove(slot: number, eid: number, x: number, y: number): void {
    if (!this.owns(slot, eid)) return;
    MoveOrder.x[eid] = x;
    MoveOrder.y[eid] = y;
    MoveOrder.active[eid] = 1;
  }

  setSilentRunning(slot: number, eid: number, active: boolean): void {
    if (!this.owns(slot, eid)) return;
    SilentRunning.active[eid] = active ? 1 : 0;
  }

  /** The big red button. docs/systems-echo.md §5. */
  activeSonar(slot: number, eid: number): void {
    if (!this.owns(slot, eid)) return;
    if (!hasComponent(this.world, ActivePing, eid)) {
      addComponent(this.world, ActivePing, eid);
    }
    ActivePing.remainingS[eid] = ACTIVE_SONAR.REVEAL_DURATION_S;
    // Pinging breaks silence by definition.
    SilentRunning.active[eid] = 0;
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
    movementSystem(this.world);
    acousticsSystem(this.world);
    pressureSystem(this.world, this.destroyedScratch);
    this.world.tick++;
  }

  private resolveEcho(): Map<number, EchoSnapshot> {
    const result = this.echo.run(this.world, this.slots);
    if (result.elapsedMs > this.worstEchoMs) this.worstEchoMs = result.elapsedMs;

    const snapshots = new Map<number, EchoSnapshot>();
    for (const slot of this.slots) {
      const units = this.collectOwnUnits(slot);
      let peakSig = 0;
      for (const unit of units) {
        if (unit.sig > peakSig) peakSig = unit.sig;
      }
      snapshots.set(slot, {
        tick: this.world.tick,
        units,
        contacts: result.contactsBySlot.get(slot) ?? [],
        peakSig,
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

      out.push({
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
      });
    }
    return out;
  }
}

/** Re-exported so the room layer does not need to reach into sim internals. */
export { Terrain, statsFor };
