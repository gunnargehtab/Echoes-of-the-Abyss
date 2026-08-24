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
  PERSISTENCE,
  PROPAGATION_MODEL,
  ResolutionTier,
  SIM,
  TIER_THRESHOLD_MULTIPLIER,
  blurBearing,
  detectionThreshold,
  maxAudibleRangeM,
  tierFromRatio,
  type Contact,
  type EchoMarkInfo,
  type FaunaSpecies,
  type ExposureReport,
  type OrdnanceKind,
  type Faction,
  type StructureKind,
  type UnitKind,
} from '@echoes/shared';
import {
  Acoustic,
  ActivePing,
  Fauna,
  Health,
  Ordnance,
  Owner,
  Position,
  Structure,
  Unit,
  Velocity,
} from '../components.ts';
import { SpatialHash } from '../spatialHash.ts';
import { localIdOf, type SimWorld } from '../world.ts';

/** Player slots the room admits. Sized for the flat per-slot scratch arrays. */
const MAX_SLOTS = 8;

/**
 * Echo ticks one full sweep of the residue layer takes.
 *
 * Five, so the whole mark set is re-resolved once a second at SIM.ECHO_HZ. The
 * shortest-lived mark is the industrial hum at 45 s, so a second of latency is
 * about 2% of the fastest thing here — and residue is the past, which is
 * exactly the information that does not need to be current.
 */
const MARK_SWEEP_TICKS = 5;

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
  /**
   * What each slot's opponents have resolved about *them*, keyed by slot.
   *
   * Falls out of the same `best` map the contact payloads are built from: the
   * pass already knows, for every listener, the best tier it holds on every
   * emitter. Reading it the other way round costs one extra walk of data
   * already in cache, and saves the client from guessing (see `ExposureReport`).
   */
  exposureBySlot: Map<number, ExposureReport>;
  /**
   * Slot -> the entities of theirs an enemy ping lit this tick, each with the
   * bearing toward the emitter that lit it.
   */
  litBySlot: Map<number, { unitId: number; bearing: number }[]>;
  /**
   * Acoustic residue each slot can currently read, keyed by slot.
   *
   * Resolved here rather than shipped wholesale for the same reason contacts
   * are: a client that holds marks its units could not hear knows where the
   * fighting has been without having scouted for it.
   */
  marksBySlot: Map<number, EchoMarkInfo[]>;
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
  private readonly exposure = new Map<number, ExposureReport>();
  private readonly markResults = new Map<number, EchoMarkInfo[]>();
  /** Listeners that clear the HYD wall this pass. */
  private readonly markListeners: number[] = [];
  /**
   * Those listeners only, spatially indexed.
   *
   */
  /** What each slot currently holds, by mark id. Persists between sweeps. */
  private readonly markState = new Map<number, Map<number, EchoMarkInfo>>();
  /**
   * Mark id to its index in the layer, rebuilt each pass.
   *
   * An index and not a copy: holding `{x, y, intensity}` per mark allocated
   * 256 short-lived objects every pass and cost more than the entire read it
   * was serving.
   */
  private readonly liveMarkIds = new Map<number, number>();
  /** Where the next sweep slice starts. */
  private markCursor = 0;
  /** Which slots have already been told about the mark in hand. */
  private readonly markHeard = new Uint8Array(MAX_SLOTS);
  /** Rolling worst-case cost of the residue read, against the 2 ms budget. */
  private worstMarkMs = 0;
  /** Path integrals the residue read did on the most recent pass. */
  private markWalks = 0;

  get worstMarkCostMs(): number {
    return this.worstMarkMs;
  }

  /** Path integrals the residue read performed on the most recent pass. */
  get markPathWalksLastPass(): number {
    return this.markWalks;
  }
  private readonly lit = new Map<number, { unitId: number; bearing: number }[]>();
  /**
   * Pinger -> the entities its current transmission has already lit.
   *
   * A ping reveals for three seconds, which is fifteen Echo ticks, but being
   * lit is an *event* and not a state: docs/audio-direction.md §5 makes it "a
   * hard, close, panned strike", and a strike that repeats fifteen times is a
   * drone. Without this the loudest cue in the game fires once per lit hull
   * per tick — measured at 42 strikes for a single ping in the headless
   * client, which is what led to this map existing.
   *
   * A hull that enters the radius part-way through is still new to the set, so
   * it is still told, which is correct: it was just lit.
   */
  private readonly litAlready = new Map<number, Set<number>>();
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

  /**
   * The firing solution a slot currently holds on an emitter, or undefined.
   *
   * This is the single place docs/systems-combat.md §7 is enforced, and the
   * position it returns is **exactly the position that slot was last told** —
   * the true position at Tier 3 and above, and at Tier 2 the same blurred ghost
   * the contact payload carried, from the same seed and the same listener.
   *
   * Recomputing the blur here rather than storing it is what guarantees they
   * agree: a launch that aimed anywhere other than where the player was told
   * the target was would either be the server quietly correcting them, or the
   * server quietly lying twice. `blurBearing` is deterministic on those three
   * inputs, so one call reproduces the other exactly.
   *
   * Reflects the last completed pass, which is correct: a player acts on what
   * they were last told, not on what is true this instant.
   */
  firingSolution(
    world: SimWorld,
    slot: number,
    eid: number
  ): { tier: ResolutionTier; x: number; y: number } | undefined {
    const resolved = this.best.get(slot)?.get(eid);
    if (resolved === undefined) return undefined;

    const trueX = Position.x[eid]!;
    const trueY = Position.y[eid]!;
    if (resolved.tier !== ResolutionTier.Bearing) {
      return { tier: resolved.tier, x: trueX, y: trueY };
    }
    // Seeded from the match-local id, exactly as the contact payload is — see
    // the note there about process-global entity ids.
    const blurred = blurBearing(
      trueX,
      trueY,
      resolved.listenerX,
      resolved.listenerY,
      localIdOf(world, eid) ?? eid
    );
    return { tier: resolved.tier, x: blurred.x, y: blurred.y };
  }

  /**
   * Forget everything this pass knows about an entity that has died.
   *
   * Handles were never pruned, and that was a real hole rather than a leak of
   * memory. `entityForHandle` scans a permanent map, bitecs reissues entity ids
   * once a thousand have been freed, and the short-lived ordnance this epic
   * added makes crossing that threshold routine — so a handle minted for a
   * torpedo that died minutes ago could come to name a *live hull the player
   * had never detected*. `orderAttackContact` would accept it, and combat.ts
   * republishes an ordered target's position into MoveOrder every tick, which
   * turns a stale handle into a permanent tracker.
   *
   * Called from `Match.reap` for every death, which is the one place the
   * simulation makes a death real.
   */
  forget(eid: number): void {
    for (const slotHandles of this.handles.values()) slotHandles.delete(eid);
    for (const slotBest of this.best.values()) slotBest.delete(eid);
    this.litAlready.delete(eid);
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

  /**
   * Which residue each slot can read — docs/systems-echo.md §7.
   *
   * **Swept, not recomputed.** The whole mark set is re-resolved across
   * `MARK_SWEEP_TICKS` Echo ticks rather than every tick, and each slot's
   * results persist in between. That is not only a budget trick, it is the
   * right behaviour: residue is *the past*, and a second of latency on a
   * ninety-second echo is undetectable. Contacts get resolved every tick
   * because they are the present.
   *
   * Getting here took three attempts and two wrong guesses, all measured:
   *
   * - Listener-major ("which marks can I hear") re-walked every mark once per
   *   hull: **1.37 ms**, 68% of the whole 2 ms pass.
   * - Mark-major with an early exit once every slot has heard it: **0.92 ms**.
   *   The exit rarely fires, because most marks are heard by nobody.
   * - A dedicated index of listeners above the HYD wall: **1.20 ms** — worse,
   *   because most hulls clear the wall anyway and rebuilding the index cost
   *   more than it saved.
   *
   * The measurement that mattered: the broadphase radius and the cheap prune
   * are computed from the *same* bound, so the prune rejected almost nothing
   * and nearly every candidate paid for a path integral (0.20 us each). The
   * same shape of mistake as the `pfNeeded` prune in #90. Volume was the
   * problem, so the fix had to reduce volume rather than filter it.
   */
  private resolveMarks(world: SimWorld, slots: readonly number[], entities: number[]): void {
    const started = performance.now();
    const layer = world.marks;
    layer.pathWalks = 0;

    // Drop anything whose mark has decayed away, whatever the sweep is doing.
    // A slot must never keep reporting residue that no longer exists.
    this.liveMarkIds.clear();
    const marks = layer.all;
    for (let i = 0; i < marks.length; i++) this.liveMarkIds.set(marks[i]!.id, i);

    for (const slot of slots) {
      let held = this.markState.get(slot);
      if (held === undefined) {
        held = new Map();
        this.markState.set(slot, held);
      }
      for (const id of held.keys()) {
        if (!this.liveMarkIds.has(id)) held.delete(id);
      }
    }

    if (marks.length > 0) {
      // Listeners that clear the HYD wall. Most of a force does not — a
      // Harvester at HYD 30 can never read residue — and the wall is free to
      // check, so it is checked before any geometry.
      let bestHyd = 0;
      this.markListeners.length = 0;
      for (let i = 0; i < entities.length; i++) {
        const eid = entities[i]!;
        const hyd = Acoustic.hyd[eid]!;
        if (hyd < PERSISTENCE.ECHO_MARK_MIN_HYD) continue;
        this.markListeners.push(eid);
        if (hyd > bestHyd) bestHyd = hyd;
      }

      if (this.markListeners.length > 0) {
        const slice = Math.ceil(marks.length / MARK_SWEEP_TICKS);
        for (let n = 0; n < slice; n++) {
          const mark = marks[(this.markCursor + n) % marks.length];
          if (mark === undefined) continue;
          const radius = layer.audibleRadiusM(mark, bestHyd);

          this.markHeard.fill(0);
          let remaining = slots.length;
          for (let i = 0; i < this.markListeners.length && remaining > 0; i++) {
            const listener = this.markListeners[i]!;
            const slot = Owner.slot[listener]!;
            if (slot >= MAX_SLOTS || this.markHeard[slot] === 1) continue;
            const held = this.markState.get(slot);
            if (held === undefined) continue;

            const lx = Position.x[listener]!;
            const ly = Position.y[listener]!;
            // Cheap rejection before the exact test: the broadphase radius is
            // an upper bound over every listener, so a hull outside it cannot
            // hear this mark however good its ears.
            if ((lx - mark.x) ** 2 + (ly - mark.y) ** 2 > radius * radius) continue;
            if (!layer.audible(world.terrain, mark, lx, ly, Acoustic.hyd[listener]!)) continue;

            this.markHeard[slot] = 1;
            remaining--;
            held.set(mark.id, {
              id: mark.id,
              x: mark.x,
              y: mark.y,
              kind: mark.kind,
              intensity: mark.intensity,
            });
          }

          // A mark this slot used to hear and no longer can — the scout moved
          // on, or it faded below the threshold. Dropped on the same sweep, so
          // a stale reading never outlives the sweep that would refresh it.
          for (const slot of slots) {
            if (this.markHeard[slot] === 1) continue;
            this.markState.get(slot)?.delete(mark.id);
          }
        }
        this.markCursor = marks.length === 0 ? 0 : (this.markCursor + slice) % marks.length;
      }
    }

    for (const slot of slots) {
      const out = this.markResults.get(slot)!;
      const held = this.markState.get(slot);
      if (held === undefined) continue;
      for (const info of held.values()) {
        // Refreshed from the live mark rather than emitted as stored, so a
        // held reading *fades* with the thing it describes instead of freezing
        // at whatever it was when the sweep last touched it. Position too: a
        // reinforced battle site drifts, and a client watching one mark should
        // see it drift.
        const index = this.liveMarkIds.get(info.id);
        if (index === undefined) continue;
        const live = marks[index]!;
        info.x = live.x;
        info.y = live.y;
        info.intensity = live.intensity;
        out.push(info);
      }
    }

    this.markWalks = layer.pathWalks;
    const cost = performance.now() - started;
    if (cost > this.worstMarkMs) this.worstMarkMs = cost;
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

      const litBucket = this.lit.get(slot);
      if (litBucket === undefined) this.lit.set(slot, []);
      else litBucket.length = 0;

      this.exposure.set(slot, { tier: ResolutionTier.Silent, trackedCount: 0 });

      const markBucket = this.markResults.get(slot);
      if (markBucket === undefined) this.markResults.set(slot, []);
      else markBucket.length = 0;
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

          // Deaf things do not listen.
          //
          // HYD 0 means "no ears", not "poor ears" — the per-HYD tables above
          // clamp to 1 only to keep their lookups in range, and that clamp used
          // to make ordnance a listener. Ordnance carries Acoustic so the Echo
          // pass can hear *it*; `spawnOrdnance` sets its HYD to zero so it
          // cannot hear back. Without this line a torpedo resolved contacts out
          // to ~235 m and reported them to the player who fired it — measured —
          // and a twelve-mine field became a permanent passive sonar picket.
          // Neither is authorised: docs/systems-combat.md §6 has a mine wait to
          // hear you, not tell anyone about it.
          //
          // It is also a strict prune, so it costs the pair loop nothing.
          if (Acoustic.hyd[listener]! <= 0) continue;

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
    // Drop the bookkeeping for transmissions that have finished, so the next
    // ping from the same hull is a new event rather than a suppressed one.
    for (const pinger of this.litAlready.keys()) {
      const stillPinging =
        hasComponent(world, ActivePing, pinger) && ActivePing.remainingS[pinger]! > 0;
      if (!stillPinging) this.litAlready.delete(pinger);
    }

    for (let i = 0; i < entities.length; i++) {
      const pinger = entities[i]!;
      if (!hasComponent(world, ActivePing, pinger)) continue;
      if (ActivePing.remainingS[pinger]! <= 0) continue;

      let alreadyLit = this.litAlready.get(pinger);
      if (alreadyLit === undefined) {
        alreadyLit = new Set();
        this.litAlready.set(pinger, alreadyLit);
      }

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
        const targetSlot = Owner.slot[target]!;
        if (targetSlot === pingerSlot) continue;
        const tx = Position.x[target]!;
        const ty = Position.y[target]!;
        const distance = Math.hypot(px - tx, py - ty);
        if (distance > ACTIVE_SONAR.REVEAL_RADIUS_M) continue;
        this.record(pingerSlot, target, ResolutionTier.Track, px, py);

        // The victim's side of the same event. Bearing only, from their hull
        // toward the emitter — see SelfEvent.bearing for why not a position.
        const litForSlot = this.lit.get(targetSlot);
        if (litForSlot !== undefined && !alreadyLit.has(target)) {
          alreadyLit.add(target);
          litForSlot.push({ unitId: target, bearing: Math.atan2(py - ty, px - tx) });
        }
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
        // The mirror image of this contact, from the point of view of whoever
        // owns it: they are being seen this well, by someone. Accumulated
        // here rather than in a second pass because `slotBest` is already the
        // exact set of "who has resolved what", just indexed the other way.
        // Exposure is a report about the player's *force*, not about the
        // things their weapons left in the water. An enemy resolving your
        // minefield used to raise your own exposure to Tier 3 — telling you an
        // opponent was near a mine you laid, which is reconnaissance you never
        // earned, and simultaneously lying about how well your hulls are seen.
        // Ordnance is skipped here for the same reason fauna are: it is not
        // somebody's fleet (docs/systems-combat.md §6).
        const victim = hasComponent(world, Ordnance, eid)
          ? undefined
          : this.exposure.get(Owner.slot[eid]!);
        if (victim !== undefined) {
          if (resolved.tier > victim.tier) victim.tier = resolved.tier;
          if (resolved.tier >= ResolutionTier.Bearing) victim.trackedCount++;
        }

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
          // Seeded with the *match-local* id, not the entity id.
          //
          // Third instance of the trap docs/tech-stack.md already records
          // twice: bitecs allocates entity ids from a counter global to the
          // process, so the same match run twice in one process holds
          // identical values under different ids — and a blur keyed on the raw
          // id therefore lands somewhere else on the second run.
          //
          // It went unnoticed while only humans read this field, because a
          // blurred position is drawn and never acted on by the simulation.
          // The skirmish AI reads it and walks an army to it, which turns a
          // cosmetic difference into a divergent match: the balance harness
          // caught two runs of one seed ending thirty-nine ticks apart.
          const blurred = blurBearing(
            trueX,
            trueY,
            resolved.listenerX,
            resolved.listenerY,
            localIdOf(world, eid) ?? eid
          );
          contact.x = blurred.x;
          contact.y = blurred.y;
        }

        if (resolved.tier >= ResolutionTier.Classification) {
          if (hasComponent(world, Unit, eid)) {
            contact.kind = Unit.kind[eid] as UnitKind;
            contact.faction = Owner.faction[eid] as Faction;
          } else if (hasComponent(world, Structure, eid)) {
            contact.structure = Structure.kind[eid] as StructureKind;
            contact.faction = Owner.faction[eid] as Faction;
          } else if (hasComponent(world, Fauna, eid)) {
            // docs/bestiary.md §3: "Classification at Tier 3 is the moment you
            // find out, and it is a genuine relief or a genuine problem."
            //
            // This is the *only* place in the pass that knows fauna exist, and
            // it sits below the tier where a unit gets named. Everything above
            // — the broadphase, the pair loop, the tier maths — treats a
            // creature exactly as it treats a cruiser, which is what makes a
            // Tier-1 smudge genuinely ambiguous rather than ambiguous-looking.
            //
            // No faction: a creature belongs to nobody, and sending a
            // meaningless slot would let a client infer that this is fauna one
            // tier earlier than it earned.
            contact.fauna = Fauna.species[eid] as FaunaSpecies;
          } else if (hasComponent(world, Ordnance, eid)) {
            // docs/systems-combat.md §1: a torpedo must be *audible* its whole
            // run, not identifiable for it. Below Tier 3 a closing contact
            // could be ordnance or a scout, and the seconds a player spends
            // deciding which are the mechanic — so the kind sits behind the
            // same wall that names a hull, exactly like a creature's species.
            contact.ordnance = Ordnance.kind[eid] as OrdnanceKind;
          }
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

    this.resolveMarks(world, slots, entities);

    return {
      contactsBySlot: this.results,
      exposureBySlot: this.exposure,
      marksBySlot: this.markResults,
      litBySlot: this.lit,
      elapsedMs: performance.now() - started,
    };
  }
}
