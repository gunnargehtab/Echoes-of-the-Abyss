/**
 * The Echo Layer — server-authoritative acoustic fog of war.
 *
 * This is the system the game is named after, and the one place where a
 * shortcut becomes a cheat: in a game built on hidden information, a client
 * that receives unresolved world state is a maphack regardless of what it
 * chooses to draw. So detection is resolved here, per player, and only the
 * resolved result leaves the server (docs/tech-stack.md, docs/glossary.md
 * "Acoustic Fog of War").
 *
 * Runs at ECHO_HZ (5 Hz), not at the 60 Hz sim rate, against a 2 ms budget.
 */

import { defineQuery, hasComponent } from 'bitecs';
import {
  ACTIVE_SONAR,
  PROPAGATION_MODEL,
  ResolutionTier,
  SIM,
  blurBearing,
  maxAudibleRangeM,
  resolveTier,
  type Contact,
  type Faction,
  type StructureKind,
  type UnitKind,
} from '@echoes/shared';
import {
  Acoustic,
  ActivePing,
  Health,
  Owner,
  Position,
  Structure,
  Unit,
  Velocity,
} from '../components.ts';
import { SpatialHash } from '../spatialHash.ts';
import type { SimWorld } from '../world.ts';

/**
 * Everything that both emits and can be heard — units and structures alike.
 * A base is a broadcast tower (docs/economy.md §1); it is found the same way
 * an army is.
 */
const acousticEntities = defineQuery([Position, Acoustic, Owner, Health]);

interface BestContact {
  tier: ResolutionTier;
  /** Position of the listener that resolved it, for bearing blur. */
  listenerX: number;
  listenerY: number;
}

export interface EchoResult {
  /** Resolved enemy contacts, keyed by player slot. */
  contactsBySlot: Map<number, Contact[]>;
  /** Wall-clock cost of the pass, measured against SIM.ECHO_BUDGET_MS. */
  elapsedMs: number;
}

export class EchoLayer {
  private readonly hash = new SpatialHash(SIM.SPATIAL_CELL_M);
  private readonly queryBuffer: number[] = [];
  /** slot -> emitter eid -> best resolution achieved this tick. */
  private readonly best = new Map<number, Map<number, BestContact>>();
  /**
   * slot -> emitter eid -> opaque contact handle.
   *
   * Contacts are reported under a per-observer handle rather than the raw
   * entity id. Entity ids are global and roughly sequential, so leaking them
   * would let a client infer how many units exist map-wide from contacts it
   * legitimately detected — small, but exactly the kind of inference this
   * system exists to prevent.
   */
  private readonly handles = new Map<number, Map<number, number>>();
  private readonly nextHandle = new Map<number, number>();
  private readonly results = new Map<number, Contact[]>();

  /**
   * Reverse a per-observer contact handle back to the entity it names, for
   * validating attack orders. Only handles this slot was actually issued
   * resolve — a client cannot guess its way to entities it never heard.
   */
  entityForHandle(slot: number, handle: number): number | undefined {
    const slotHandles = this.handles.get(slot);
    if (slotHandles === undefined) return undefined;
    for (const [eid, issued] of slotHandles) {
      if (issued === handle) return eid;
    }
    return undefined;
  }

  private handleFor(slot: number, eid: number): number {
    let slotHandles = this.handles.get(slot);
    if (slotHandles === undefined) {
      slotHandles = new Map();
      this.handles.set(slot, slotHandles);
    }
    let handle = slotHandles.get(eid);
    if (handle === undefined) {
      handle = (this.nextHandle.get(slot) ?? 1) + 1;
      this.nextHandle.set(slot, handle);
      slotHandles.set(eid, handle);
    }
    return handle;
  }

  private record(
    slot: number,
    eid: number,
    tier: ResolutionTier,
    listenerX: number,
    listenerY: number
  ): void {
    let slotBest = this.best.get(slot);
    if (slotBest === undefined) {
      slotBest = new Map();
      this.best.set(slot, slotBest);
    }
    const existing = slotBest.get(eid);
    // Multiple listeners may hear the same emitter; the player learns the most
    // any single one of them resolved.
    if (existing === undefined) {
      slotBest.set(eid, { tier, listenerX, listenerY });
    } else if (tier > existing.tier) {
      existing.tier = tier;
      existing.listenerX = listenerX;
      existing.listenerY = listenerY;
    }
  }

  run(world: SimWorld, slots: readonly number[]): EchoResult {
    const started = performance.now();
    const terrain = world.terrain;
    const entities = acousticEntities(world);

    for (const slot of slots) {
      this.best.get(slot)?.clear();
      const bucket = this.results.get(slot);
      if (bucket === undefined) this.results.set(slot, []);
      else bucket.length = 0;
    }

    // --- Broadphase: index every listener once. -----------------------------
    this.hash.clear();
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i]!;
      this.hash.insert(eid, Position.x[eid]!, Position.y[eid]!);
    }

    // --- Passive listening -------------------------------------------------
    for (let i = 0; i < entities.length; i++) {
      const emitter = entities[i]!;
      const sig = Acoustic.sig[emitter]!;
      if (sig <= 0) continue;

      const ex = Position.x[emitter]!;
      const ey = Position.y[emitter]!;
      const pf = terrain.propagationAt(ex, ey);
      const emitterSlot = Owner.slot[emitter]!;

      // Only listeners inside this radius can possibly hear the emitter, even
      // with the sharpest ears in the game. This bound is what keeps the pass
      // off an all-pairs comparison.
      const range = maxAudibleRangeM(sig, pf, PROPAGATION_MODEL.MAX_EXPECTED_HYD);
      if (range <= 0) continue;

      const candidates = this.hash.queryRadius(ex, ey, range, this.queryBuffer);

      for (let j = 0; j < candidates.length; j++) {
        const listener = candidates[j]!;
        const listenerSlot = Owner.slot[listener]!;
        if (listenerSlot === emitterSlot) continue;

        const lx = Position.x[listener]!;
        const ly = Position.y[listener]!;
        const distance = Math.hypot(ex - lx, ey - ly);
        if (distance > range) continue; // grid is a broadphase; confirm exactly

        const tier = resolveTier(sig, pf, distance, Acoustic.hyd[listener]!);
        if (tier === ResolutionTier.Silent) continue;

        this.record(listenerSlot, emitter, tier, lx, ly);
      }
    }

    // --- Active sonar ------------------------------------------------------
    // A ping is a hard radius, not a propagation result: everything within
    // 900 m resolves to Tier 4 outright, terrain and stealth notwithstanding
    // (docs/systems-echo.md §5). The pinger's own catastrophic exposure is
    // already handled above — SIG 95 is calibrated to reach exactly 2,400 m.
    for (let i = 0; i < entities.length; i++) {
      const pinger = entities[i]!;
      if (!hasComponent(world, ActivePing, pinger)) continue;
      if (ActivePing.remainingS[pinger]! <= 0) continue;

      const px = Position.x[pinger]!;
      const py = Position.y[pinger]!;
      const pingerSlot = Owner.slot[pinger]!;
      const revealed = this.hash.queryRadius(
        px,
        py,
        ACTIVE_SONAR.REVEAL_RADIUS_M,
        this.queryBuffer
      );

      for (let j = 0; j < revealed.length; j++) {
        const target = revealed[j]!;
        if (Owner.slot[target]! === pingerSlot) continue;
        const distance = Math.hypot(px - Position.x[target]!, py - Position.y[target]!);
        if (distance > ACTIVE_SONAR.REVEAL_RADIUS_M) continue;
        this.record(pingerSlot, target, ResolutionTier.Track, px, py);
      }
    }

    // --- Materialise per-player payloads -----------------------------------
    // Fields are attached strictly by tier. A client cannot leak what it was
    // never sent, so lower tiers omit data rather than sending it flagged.
    for (const slot of slots) {
      const slotBest = this.best.get(slot);
      const out = this.results.get(slot)!;
      if (slotBest === undefined) continue;

      for (const [eid, resolved] of slotBest) {
        const trueX = Position.x[eid]!;
        const trueY = Position.y[eid]!;
        const handle = this.handleFor(slot, eid);

        const contact: Contact = {
          id: handle,
          tier: resolved.tier,
          x: trueX,
          y: trueY,
          tick: world.tick,
        };

        if (resolved.tier === ResolutionTier.Contact) {
          // "Something is out there" — no usable position at all. Report the
          // listener's own location so the client can draw a directionless
          // smudge near it without ever learning the true bearing.
          contact.x = resolved.listenerX;
          contact.y = resolved.listenerY;
        } else if (resolved.tier === ResolutionTier.Bearing) {
          const blurred = blurBearing(trueX, trueY, resolved.listenerX, resolved.listenerY, eid);
          contact.x = blurred.x;
          contact.y = blurred.y;
        }

        if (resolved.tier >= ResolutionTier.Classification) {
          if (hasComponent(world, Unit, eid)) {
            contact.kind = Unit.kind[eid] as UnitKind;
          } else if (hasComponent(world, Structure, eid)) {
            contact.structure = Structure.kind[eid] as StructureKind;
          }
          contact.faction = Owner.faction[eid] as Faction;
          contact.depth = Position.depth[eid]!;
        }

        if (resolved.tier >= ResolutionTier.Track) {
          contact.hp = Health.hp[eid]!;
          contact.maxHp = Health.max[eid]!;
          if (hasComponent(world, Velocity, eid)) {
            contact.heading = Math.atan2(Velocity.y[eid]!, Velocity.x[eid]!);
          }
        }

        out.push(contact);
      }
    }

    return {
      contactsBySlot: this.results,
      elapsedMs: performance.now() - started,
    };
  }
}
