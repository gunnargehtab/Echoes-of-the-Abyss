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
  MAX_PROPAGATION_FACTOR,
  PROPAGATION_MODEL,
  ResolutionTier,
  SIM,
  TIER_THRESHOLD_MULTIPLIER,
  blurBearing,
  detectionThreshold,
  maxAudibleRangeM,
  tierFromRatio,
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

/** Player slots the room admits. Sized for the flat per-slot scratch arrays. */
const MAX_SLOTS = 8;

/**
 * The threshold multiple a pair must reach to *improve* on a tier already
 * resolved. Indexed by the tier a slot currently holds for this emitter, so
 * index 4 (Track) is unbeatable and index 0 (Silent) just needs Tier 1.
 *
 * This is what lets the pass skip work rather than merely abandon it early:
 * a listener that cannot beat what its own side already heard contributes
 * nothing, because only the best resolution per slot ever ships.
 */
const RATIO_TO_BEAT = [
  TIER_THRESHOLD_MULTIPLIER.CONTACT,
  TIER_THRESHOLD_MULTIPLIER.BEARING,
  TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION,
  TIER_THRESHOLD_MULTIPLIER.TRACK,
  Number.POSITIVE_INFINITY,
];

/**
 * `RATIO_TO_BEAT`, turned into a squared distance scale.
 *
 * Requiring r times the detection threshold shrinks the audible radius by
 * r^(1/exponent); squaring it lets the pair loop stay in squared-distance
 * space and never take a square root to reject a pair. Index 4 is zero, so a
 * slot already holding a Track rejects every remaining listener outright.
 */
const RATIO_SCALE_SQ = RATIO_TO_BEAT.map((ratio) =>
  Number.isFinite(ratio) ? Math.pow(ratio, -2 / PROPAGATION_MODEL.ATTENUATION_EXPONENT) : 0
);

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
   * Per-HYD lookup tables, indexed by the integer rating (HYD is 0-100 and
   * every source of it — stats, auras, the blind floor — is integral).
   *
   * `rangeScale[h]` is (h / MAX_EXPECTED_HYD)^(1/ATTENUATION_EXPONENT): an
   * emitter's broadphase radius is computed once at the sharpest possible
   * ears, and a real listener's audible range is exactly that radius times
   * this factor (both come from the same power law). `threshold[h]` is the
   * listener's detection threshold. Typed arrays rather than Maps because
   * the pair loop reads both tens of thousands of times per pass.
   */
  private readonly rangeScaleByHyd = new Float64Array(101);
  /** rangeScaleByHyd squared, so the distance prune needs no extra multiply. */
  private readonly rangeScaleSqByHyd = new Float64Array(101);
  private readonly thresholdByHyd = new Float64Array(101);
  /**
   * Best tier each slot has resolved for the emitter currently being walked.
   * Reset per emitter; mirrors what `record` holds, but as a flat array read
   * once per candidate pair instead of two Map lookups.
   */
  private readonly bestTierThisEmitter = new Int8Array(MAX_SLOTS);

  constructor() {
    for (let h = 0; h <= 100; h++) {
      this.rangeScaleByHyd[h] = Math.pow(
        Math.max(h, 1) / PROPAGATION_MODEL.MAX_EXPECTED_HYD,
        1 / PROPAGATION_MODEL.ATTENUATION_EXPONENT
      );
      this.rangeScaleSqByHyd[h] = this.rangeScaleByHyd[h]! * this.rangeScaleByHyd[h]!;
      this.thresholdByHyd[h] = detectionThreshold(Math.max(h, 1));
    }
  }

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
      // A Baffle Barge bubble masks at the source, whatever water the sound
      // crosses afterwards (`|| 1` covers the tick before the first aura pass).
      const pfFactor = Acoustic.pfFactor[emitter]! || 1;
      const emitterSlot = Owner.slot[emitter]!;

      // Only listeners inside this radius can possibly hear the emitter, even
      // with the sharpest ears in the game. This bound is what keeps the pass
      // off an all-pairs comparison. PF is a path integral (issue #37) and no
      // path has been walked yet, so bound with the loudest water on the map.
      const range = maxAudibleRangeM(
        sig,
        MAX_PROPAGATION_FACTOR * pfFactor,
        PROPAGATION_MODEL.MAX_EXPECTED_HYD
      );
      if (range <= 0) continue;

      const candidates = this.hash.queryRadius(ex, ey, range, this.queryBuffer);

      const sigMasked = sig * pfFactor;
      const { REFERENCE_DISTANCE_M, ATTENUATION_EXPONENT } = PROPAGATION_MODEL;

      this.bestTierThisEmitter.fill(ResolutionTier.Silent);

      const range2 = range * range;

      for (let j = 0; j < candidates.length; j++) {
        {
          const listener = candidates[j]!;
          const listenerSlot = Owner.slot[listener]!;
          if (listenerSlot === emitterSlot) continue;

          const lx = Position.x[listener]!;
          const ly = Position.y[listener]!;
          const dx = ex - lx;
          const dy = ey - ly;
          const d2 = dx * dx + dy * dy;

          // One squared-distance test does the work of three.
          //
          // It folds together: is this listener in range at all; could the
          // pair be audible even through all-trench water; and — the
          // expensive one to get wrong — could it *improve* on what this
          // slot already resolved for this emitter. Only the best resolution
          // per slot ever ships, so a pair that cannot beat the standing tier
          // contributes nothing and must not cost a path integral, a square
          // root or a pow to discard.
          //
          // The tier bar becomes a distance because the propagation model is
          // invertible: needing `r` times the threshold shrinks the audible
          // radius by r^(1/exponent), which is `ratioScale` below, computed
          // once at construction.
          const hyd = Acoustic.hyd[listener]! | 0;
          const clamped = hyd > 100 ? 100 : hyd;
          const bestTier = this.bestTierThisEmitter[listenerSlot]!;
          const cutoff2 = range2 * this.rangeScaleSqByHyd[clamped]! * RATIO_SCALE_SQ[bestTier]!;
          if (d2 > cutoff2) continue;

          // Survivors — a small minority — pay for the pow.
          const distance = Math.sqrt(d2);
          const perceivedPerPf =
            sigMasked *
            Math.pow(
              REFERENCE_DISTANCE_M / Math.max(distance, REFERENCE_DISTANCE_M),
              ATTENUATION_EXPONENT
            );
          const threshold = this.thresholdByHyd[clamped]!;
          // The PF this path must average to clear the bar. The cutoff above
          // already guarantees this is within reach of all-trench water; it
          // is computed here to tell the walk when to give up.
          const pfNeeded = (threshold * RATIO_TO_BEAT[bestTier]!) / perceivedPerPf;

          // The water between them prices this pair: cover is something you
          // can hide *behind*, and a trench carries sound down its whole
          // axis. The walk aborts once its mean cannot reach that same bar.
          const pf = terrain.pathPropagation(ex, ey, lx, ly, pfNeeded);
          if (pf < pfNeeded) continue;

          const tier = tierFromRatio((perceivedPerPf * pf) / threshold);
          if (tier === ResolutionTier.Silent) continue;

          this.bestTierThisEmitter[listenerSlot] = tier;
          this.record(listenerSlot, emitter, tier, lx, ly);
        }
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
