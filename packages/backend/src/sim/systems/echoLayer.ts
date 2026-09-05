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
  THERMOCLINE_PAIR_FACTOR,
  THERMOCLINE_ZONE_MAX,
  thermoclineZone,
  PERSISTENCE,
  PROPAGATION_MODEL,
  ResolutionTier,
  SCATTER,
  SIM,
  TIER_THRESHOLD_MULTIPLIER,
  UNIT_STATS,
  blurBearing,
  detectionThreshold,
  directionalSectorFactor,
  maxAudibleRangeM,
  scatterContact,
  stableUnit,
  tierFromRatio,
  type Contact,
  type EchoMarkInfo,
  type FaunaSpecies,
  type ExposureReport,
  type OrdnanceKind,
  Faction,
  type StructureKind,
  UnitKind,
} from '@echoes/shared';
import {
  Acoustic,
  ActivePing,
  Fauna,
  Heading,
  Health,
  Ordnance,
  Owner,
  Position,
  Structure,
  Unit,
  Velocity,
} from '../components.ts';
import { hasBow } from '../directional.ts';
import { SpatialHash } from '../spatialHash.ts';
import { localIdOf, type SimWorld } from '../world.ts';
import type { Terrain } from '../terrain.ts';

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

/**
 * Salts into `stableUnit` for the dice a phantom is thrown with. Distinct
 * from the two `scatterContact` uses (1 and 2) so a phantom's placement and a
 * real contact's lie for the same pinger never share a draw.
 */
const PHANTOM_SALT_COUNT = 11;
const PHANTOM_SALT_KIND = 13;
const PHANTOM_SALT_BEARING = 14;
const PHANTOM_SALT_RANGE = 15;
const PHANTOM_SALT_HEADING = 16;

/**
 * What a phantom can claim to be: any hull a navy builds. The cohort hull is
 * grown, not built, and only by the Directorate (docs/economy.md §6), so a
 * Chorister return against any other navy would be the one phantom a player
 * could dismiss by reading the roster — which is exactly the tell a phantom
 * exists not to give.
 */
const PHANTOM_HULLS: readonly UnitKind[] = [
  UnitKind.LightScout,
  UnitKind.Corvette,
  UnitKind.Cruiser,
  UnitKind.AbyssalSubmersible,
  UnitKind.Harvester,
];
const PHANTOM_HULLS_DIRECTORATE: readonly UnitKind[] = [...PHANTOM_HULLS, UnitKind.Chorister];

/**
 * The false returns one transmission conjured — docs/systems-echo.md §3,
 * docs/audio-direction.md §5.
 *
 * Held for the life of the transmission so the client sees one contact under
 * one handle for three seconds and then nothing, exactly as it would for a
 * real hull the ping lit and then lost: the ghost-marker decay does the rest.
 * Keyed by pinger, beside `litAlready`, and dropped on the same tick it is.
 */
interface PhantomReturns {
  slot: number;
  contacts: Contact[];
}

interface BestContact {
  tier: ResolutionTier;
  /** Position of the listener that resolved it, for bearing blur. */
  listenerX: number;
  listenerY: number;
  /**
   * The position this pass actually *reported* for the emitter — the ghost at
   * Tier 2, the listener's own position at Tier 1, the truth at Tier 3+.
   *
   * Stored rather than recomputed because a firing solution has to aim at the
   * point the player was shown. `firingSolution` used to re-derive the blur
   * from `Position` at the moment of launch, which is a different point: the
   * target has moved since the pass, so the ghost moves with it. The player
   * clicks a marker and the torpedo is sent somewhere else — nearby, but not
   * where they aimed, and drifting further the faster the target is going.
   *
   * §7 makes shooting on a Tier-2 bearing a real gamble: the ghost lies by up
   * to 15% of range and you take the shot anyway. It has to be *that* lie,
   * though, not a second one the player never saw.
   */
  reportedX: number;
  reportedY: number;
  /**
   * The share of the best listener's path that crossed scattered cells — the
   * input the Fields' lie scales with (docs/systems-echo.md §3). Walked when
   * that listener is recorded rather than when the payload is built, because
   * the pair loop needs to know *while it is still running* whether this
   * contact is one the Fields are lying about, and kept so the payload does
   * not walk the same path a second time. Always 0 on a grid with no crystal.
   */
  fraction: number;
  /**
   * The "two ears" rule — docs/systems-echo.md §3. How many listeners of this
   * slot hold a bearing on the emitter this pass, the bearing the first of
   * them held, and the spread of every later one relative to it. `crossed`
   * latches once that spread reaches `SCATTER.CROSS_BEARING_RAD`, and a
   * crossed contact is reported where it truly is.
   *
   * Min and max of the *relative* bearing, unwrapped to (−π, π], rather than
   * every bearing kept: exact whenever the spread is under 180°, and when it
   * is not, one of the extremes is itself over 90° from the reference, which
   * is a cross by any reading. Two floats per contact, no allocation.
   */
  ears: number;
  refBearing: number;
  minRel: number;
  maxRel: number;
  crossed: boolean;
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
  /**
   * Victim slot -> its own entities already counted into `trackedCount`.
   *
   * The exposure walk is observer-major — it reads each observer's
   * resolutions and turns them round — so a hull two opponents both hold a
   * bearing on is visited twice. `tier` survives that because `max` is
   * idempotent; a counter does not, and `TRACKED x2` for one tracked hull is
   * not the fact `ExposureReport.trackedCount` is documented to carry (#217).
   *
   * A Set rather than a flat marker array because this walk is over *resolved
   * contacts* — dozens — and not over candidate pairs. The hot loop above is
   * the one that cannot afford a hash lookup.
   */
  private readonly countedTracked = new Map<number, Set<number>>();
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
  /**
   * Path integrals the *contact* pass did on the most recent run.
   *
   * The residue read has had this since it went over budget once; the contact
   * pass gets it for the same reason. Its broadphase radius is a product of
   * three ceilings now, and each one that grows multiplies the candidate set —
   * so a widening that looks harmless in a doc becomes measurable here instead
   * of becoming a frame-time report from someone else.
   */
  private contactWalks = 0;

  get worstMarkCostMs(): number {
    return this.worstMarkMs;
  }

  /** Path integrals the residue read performed on the most recent pass. */
  get markPathWalksLastPass(): number {
    return this.markWalks;
  }

  /** Path integrals the contact pass performed on the most recent run. */
  get contactPathWalksLastPass(): number {
    return this.contactWalks;
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
  /** Pinger -> the phantoms its current transmission returned. */
  private readonly phantoms = new Map<number, PhantomReturns>();
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
  /**
   * Per slot, for the emitter in hand: is the best resolution so far one the
   * Fields are lying about, with no second ear yet to straighten it? Written
   * by `record`, read by `secondEarPass` — the one place the pass spends a
   * path integral on a listener that cannot improve the tier. Cleared the
   * moment a cross bearing latches or an open-water listener takes the best,
   * so that spend goes only on contacts actually being lied about and stops
   * as soon as the lie is solved.
   */
  private readonly secondEarWanted = new Uint8Array(MAX_SLOTS);
  /**
   * Listeners the pair loop set aside for `secondEarPass`, for the emitter
   * in hand: within Bearing range, and pruned or aborted for not beating the
   * standing tier. Parallel arrays of numbers so the hot loop pushes ints and
   * allocates nothing; `deferredRel` and `order` are that pass's scratch.
   */
  private readonly deferredEid: number[] = [];
  private readonly deferredSlot: number[] = [];
  private readonly deferredRel: number[] = [];
  private readonly order: number[] = [];
  /** Furthest-off-the-reference first — see `secondEarPass` for why. */
  private readonly byRelDescending = (a: number, b: number): number =>
    Math.abs(this.deferredRel[b]!) - Math.abs(this.deferredRel[a]!);
  /** Whether the grid in hand has any scattered water — hoisted per pass. */
  private scatterPass = false;
  private terrain: Terrain | undefined;

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
   * the true position at Tier 3 and above, and at Tier 2 the blurred ghost the
   * contact payload carried.
   *
   * It returns the stored one rather than recomputing it, which is a
   * correction. The first version re-derived the blur here, reasoning that
   * `blurBearing` is deterministic on its inputs so a second call must
   * reproduce the first. It is, and it does — but one of those inputs is the
   * target's position, and that is read live. Between Echo passes the target
   * moves and the ghost moves with it, so a player clicked a marker and the
   * torpedo was aimed somewhere else — measured at 4.5 m for a Cruiser launched
   * on a tenth of a second after the pass, and rising to roughly 24 m for a
   * Light Scout at full speed across a whole 200 ms interval.
   *
   * §7 asks the player to accept that a Tier-2 ghost lies by up to 15% of
   * range. It does not ask them to accept a second lie they were never shown.
   *
   * Reflects the last completed pass, which is correct: a player acts on what
   * they were last told, not on what is true this instant.
   */
  firingSolution(
    slot: number,
    eid: number
  ): { tier: ResolutionTier; x: number; y: number } | undefined {
    const resolved = this.best.get(slot)?.get(eid);
    if (resolved === undefined) return undefined;

    // Exactly the point the player was shown, rather than a fresh blur of
    // wherever the target has got to since — see `BestContact.reportedX`.
    return { tier: resolved.tier, x: resolved.reportedX, y: resolved.reportedY };
  }

  /**
   * The tier one slot currently holds on one emitter — what that observer was
   * last told, and nothing else.
   *
   * The same `best` map `firingSolution` reads, asked the plainest question
   * there is. It exists for the mission runtime's attended tally
   * (docs/mission-attendance.md §6: resolve an arrival at Tier 2 and the
   * arrival is entered), and it is safe there for the reason the whole
   * information-safety wall is safe: the caller must already name the slot,
   * and the runtime is handed this pre-bound to the player's own. It reports
   * the observer's own hearing, never the world's contents.
   *
   * Reflects the last completed pass, like `firingSolution`, and for the same
   * reason: a player acts on what they were last told.
   */
  tierFor(slot: number, eid: number): ResolutionTier {
    return this.best.get(slot)?.get(eid)?.tier ?? ResolutionTier.Silent;
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
    this.phantoms.delete(eid);
  }

  private handleFor(slot: number, eid: number): number {
    let slotHandles = this.handles.get(slot);
    if (slotHandles === undefined) {
      slotHandles = new Map();
      this.handles.set(slot, slotHandles);
    }
    let handle = slotHandles.get(eid);
    if (handle === undefined) {
      handle = this.mintHandle(slot);
      slotHandles.set(eid, handle);
    }
    return handle;
  }

  /**
   * The next handle for a slot, from the one counter real contacts draw on.
   *
   * A phantom's handle comes from here and from nowhere else, so it is
   * indistinguishable from a real one — a client that could sort handles
   * into "issued for an entity" and "issued for nothing" would have the
   * phantom's whole secret. It is never entered in `handles`, which is what
   * makes `entityForHandle` refuse it.
   */
  private mintHandle(slot: number): number {
    const handle = (this.nextHandle.get(slot) ?? 1) + 1;
    this.nextHandle.set(slot, handle);
    return handle;
  }

  /**
   * The "two ears" search — docs/systems-echo.md §3.
   *
   * Runs once per emitter, after the candidate loop, and only on a grid with
   * crystal. For every slot whose best resolution of this emitter is a
   * contact the Fields are lying about, it asks whether one of the listeners
   * the loop set aside would give that slot a bearing at least
   * `SCATTER.CROSS_BEARING_RAD` from one it already holds — and walks the
   * fewest paths that can settle the question.
   *
   * The order is the whole trick. Candidates are sorted by how far their
   * bearing sits from the first confirmed ear's, furthest first, so the one
   * most likely to cross is walked first and a latch ends the search after a
   * single integral. The stop is exact rather than a cap: with `M` the widest
   * confirmed offset and `r` the next candidate's, no cross remains possible
   * once `r + M` is under the bound (nothing left can cross a confirmed ear —
   * the same side is nearer than the opposite one) *and* `2r` is under it
   * (no two remaining candidates can cross each other). Which listener the
   * hash happened to visit first therefore never decides whether a player
   * is told the truth; only where their hulls are does.
   *
   * The loudness arithmetic is the pair loop's, repeated for these few
   * survivors rather than hoisted out of a loop that is on the 2 ms budget.
   * The bar is Bearing, so the walk aborts as soon as a listener cannot hold
   * a bearing at all.
   */
  private secondEarPass(
    emitter: number,
    ex: number,
    ey: number,
    eRow: number,
    sigMasked: number,
    directional: boolean,
    bowX: number,
    bowY: number,
    observers: readonly number[],
    terrain: Terrain
  ): void {
    const { REFERENCE_DISTANCE_M, ATTENUATION_EXPONENT } = PROPAGATION_MODEL;
    const bearingBar = RATIO_TO_BEAT[ResolutionTier.Contact]!;
    for (const slot of observers) {
      if (this.secondEarWanted[slot] !== 1) continue;
      const entry = this.best.get(slot)?.get(emitter);
      if (entry === undefined || entry.ears === 0) continue;

      this.order.length = 0;
      for (let i = 0; i < this.deferredEid.length; i++) {
        if (this.deferredSlot[i] !== slot) continue;
        const listener = this.deferredEid[i]!;
        let rel =
          Math.atan2(ey - Position.y[listener]!, ex - Position.x[listener]!) - entry.refBearing;
        if (rel > Math.PI) rel -= Math.PI * 2;
        else if (rel <= -Math.PI) rel += Math.PI * 2;
        this.deferredRel[i] = rel;
        this.order.push(i);
      }
      if (this.order.length === 0) continue;
      this.order.sort(this.byRelDescending);

      for (const i of this.order) {
        const r = Math.abs(this.deferredRel[i]!);
        const widest = Math.max(entry.maxRel, -entry.minRel);
        if (r + widest < SCATTER.CROSS_BEARING_RAD && 2 * r < SCATTER.CROSS_BEARING_RAD) break;

        const listener = this.deferredEid[i]!;
        const lx = Position.x[listener]!;
        const ly = Position.y[listener]!;
        const dx = ex - lx;
        const dy = ey - ly;
        const distance = Math.hypot(dx, dy);
        const hyd = Acoustic.hyd[listener]! | 0;
        const clamped = hyd > 100 ? 100 : hyd;
        const k = THERMOCLINE_PAIR_FACTOR[eRow + thermoclineZone(Position.depth[listener]!)]!;
        const dirFactor = directional
          ? directionalSectorFactor(bowX * -dx + bowY * -dy, distance)
          : 1;
        const perceivedPerPf =
          k *
          dirFactor *
          sigMasked *
          Math.pow(
            REFERENCE_DISTANCE_M / Math.max(distance, REFERENCE_DISTANCE_M),
            ATTENUATION_EXPONENT
          );
        const threshold = this.thresholdByHyd[clamped]!;
        const pfNeeded = (threshold * bearingBar) / perceivedPerPf;
        this.contactWalks++;
        const pf = terrain.pathPropagation(ex, ey, lx, ly, pfNeeded);
        if (pf < pfNeeded) continue;
        const tier = tierFromRatio((perceivedPerPf * pf) / threshold);
        if (tier < ResolutionTier.Bearing) continue;
        this.record(slot, emitter, tier, lx, ly);
        if (entry.crossed) break;
      }
    }
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
    const ex = Position.x[eid]!;
    const ey = Position.y[eid]!;
    let existing = slotBest.get(eid);
    // Multiple listeners may hear the same emitter; the player learns the most
    // any single one of them resolved.
    if (existing === undefined) {
      // Reported position is filled in when the contact payload is built,
      // which is the only place that knows what each tier discloses. Seeded
      // with the truth so a read before then is never a wild value.
      existing = {
        tier,
        listenerX,
        listenerY,
        reportedX: ex,
        reportedY: ey,
        fraction: 0,
        ears: 0,
        refBearing: 0,
        minRel: 0,
        maxRel: 0,
        crossed: false,
      };
      slotBest.set(eid, existing);
      if (this.scatterPass && tier >= ResolutionTier.Bearing) {
        existing.fraction = this.terrain!.scatteredFraction(listenerX, listenerY, ex, ey);
      }
    } else if (tier > existing.tier) {
      existing.tier = tier;
      existing.listenerX = listenerX;
      existing.listenerY = listenerY;
      if (this.scatterPass) {
        existing.fraction =
          tier >= ResolutionTier.Bearing
            ? this.terrain!.scatteredFraction(listenerX, listenerY, ex, ey)
            : 0;
      }
    }
    if (!this.scatterPass) return;

    // The "two ears" rule — docs/systems-echo.md §3. Only a listener that
    // holds a *bearing* is an ear: a Tier-1 smudge has no direction to cross
    // with. Bearings are taken from the emitter's true position, which is
    // the server's to know; the client is told only the outcome.
    if (tier >= ResolutionTier.Bearing) {
      const bearing = Math.atan2(ey - listenerY, ex - listenerX);
      if (existing.ears === 0) {
        existing.refBearing = bearing;
        existing.minRel = 0;
        existing.maxRel = 0;
      } else if (!existing.crossed) {
        let rel = bearing - existing.refBearing;
        if (rel > Math.PI) rel -= Math.PI * 2;
        else if (rel <= -Math.PI) rel += Math.PI * 2;
        if (rel < existing.minRel) existing.minRel = rel;
        if (rel > existing.maxRel) existing.maxRel = rel;
        if (existing.maxRel - existing.minRel >= SCATTER.CROSS_BEARING_RAD) existing.crossed = true;
      }
      existing.ears++;
    }
    this.secondEarWanted[slot] = existing.fraction > 0 && !existing.crossed ? 1 : 0;
  }

  /**
   * The false returns a ping from scattered water sends back —
   * docs/systems-echo.md §3, docs/audio-direction.md §5 ("one to three of
   * them are false").
   *
   * Each phantom is a Tier-4 contact with everything a Tier-4 contact has —
   * a handle, a position, a depth, a hull kind, a faction, full health and a
   * heading — and no entity behind it. It has to carry all of that: a ping
   * resolves everything it touches to Track, so a return with anything less
   * would be the one marker on the scope that announced itself as false.
   * §9's rule is that a phantom sounds identical to a true one, and the
   * cheapest way to sound identical is to be identical on the wire.
   *
   * Every die here is `stableUnit` off the seed, the pinger's match-local id
   * and the tick the transmission began, so a replay conjures the same
   * phantoms in the same water. Placement is rejection-sampled: plausible
   * bearings and ranges inside the reveal, clear of the pinger, clear of
   * anything real the ping lit, and on the map. A phantom that finds no such
   * place in `PHANTOM_PLACEMENT_TRIES` is not placed — one fewer lie, never
   * a lie on top of a truth.
   *
   * The hull it claims to be is one an *enemy* navy builds. With no enemy
   * left on the map there is no plausible hull to fake, and no phantom.
   */
  private conjurePhantoms(
    world: SimWorld,
    pinger: number,
    slot: number,
    px: number,
    py: number,
    revealed: readonly number[],
    entities: readonly number[]
  ): void {
    // An enemy to impersonate: the faction of any hull or structure that is
    // not the pinger's own side and not the Drift's. Ordnance carries an
    // Owner but no honest faction, and a creature belongs to nobody.
    let faction: Faction | undefined;
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i]!;
      const owner = Owner.slot[eid]!;
      if (owner === slot || owner >= MAX_SLOTS) continue;
      if (!hasComponent(world, Unit, eid) && !hasComponent(world, Structure, eid)) continue;
      faction = Owner.faction[eid] as Faction;
      break;
    }
    if (faction === undefined) return;

    const seed = world.rng.seed;
    const key = localIdOf(world, pinger) ?? pinger;
    const began = world.tick;
    const span = SCATTER.PHANTOMS_MAX - SCATTER.PHANTOMS_MIN + 1;
    const count =
      SCATTER.PHANTOMS_MIN + Math.floor(stableUnit(seed, key, PHANTOM_SALT_COUNT, began) * span);
    const hulls = faction === Faction.Directorate ? PHANTOM_HULLS_DIRECTORATE : PHANTOM_HULLS;
    const terrain = world.terrain;
    const clearance2 = SCATTER.PHANTOM_CLEARANCE_M * SCATTER.PHANTOM_CLEARANCE_M;
    const depth = Position.depth[pinger]!;

    const contacts: Contact[] = [];
    for (let n = 0; n < count; n++) {
      for (let attempt = 0; attempt < SCATTER.PHANTOM_PLACEMENT_TRIES; attempt++) {
        // One step per (phantom, attempt) so a rejected placement re-rolls
        // rather than repeats.
        const step = began + n * SCATTER.PHANTOM_PLACEMENT_TRIES + attempt;
        const bearing = stableUnit(seed, key, PHANTOM_SALT_BEARING, step) * Math.PI * 2;
        const range =
          SCATTER.PHANTOM_MIN_RANGE_M +
          stableUnit(seed, key, PHANTOM_SALT_RANGE, step) *
            (ACTIVE_SONAR.REVEAL_RADIUS_M - SCATTER.PHANTOM_MIN_RANGE_M);
        const x = terrain.clampXM(px + Math.cos(bearing) * range);
        const y = terrain.clampYM(py + Math.sin(bearing) * range);
        // Clamping to the map edge can pull a phantom back onto the pinger.
        if ((x - px) * (x - px) + (y - py) * (y - py) < clearance2) continue;

        let clear = true;
        for (let j = 0; j < revealed.length; j++) {
          const other = revealed[j]!;
          const dx = Position.x[other]! - x;
          const dy = Position.y[other]! - y;
          if (dx * dx + dy * dy < clearance2) {
            clear = false;
            break;
          }
        }
        if (!clear) continue;

        const kind =
          hulls[Math.floor(stableUnit(seed, key, PHANTOM_SALT_KIND, step) * hulls.length)]!;
        contacts.push({
          id: this.mintHandle(slot),
          tier: ResolutionTier.Track,
          x,
          y,
          tick: began,
          kind,
          faction,
          depth,
          hp: UNIT_STATS[kind].maxHp,
          maxHp: UNIT_STATS[kind].maxHp,
          heading: stableUnit(seed, key, PHANTOM_SALT_HEADING, step) * Math.PI * 2,
        });
        break;
      }
    }
    if (contacts.length > 0) this.phantoms.set(pinger, { slot, contacts });
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
          const radius = layer.audibleRadiusM(mark, bestHyd, world.terrain.peakPf);

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
            const ld = Position.depth[listener]!;
            // Cheap rejection before the exact test: the broadphase radius is
            // an upper bound over every listener, so a hull outside it cannot
            // hear this mark however good its ears.
            if ((lx - mark.x) ** 2 + (ly - mark.y) ** 2 > radius * radius) continue;
            if (!layer.audible(world.terrain, mark, lx, ly, ld, Acoustic.hyd[listener]!)) continue;

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

  /**
   * One full Echo pass.
   *
   * `slots` is the seated roster — the commanders snapshots are built for.
   * `observers` is every slot the pass resolves *for*, and it may be wider: a
   * mission's scripted parties listen without being seated (#323). The split
   * matters because exposure is materialised observer-major — each observer's
   * resolutions are turned around onto the owners of what they resolved — so a
   * party missing from this list cannot raise anybody's `ExposureReport`,
   * however close it stands. The pair loop below already records for every
   * listener under MAX_SLOTS; what `observers` governs is whose records are
   * cleared, materialised and turned into exposure each pass.
   *
   * The residue read stays on `slots`: marks feed snapshots and the sweep does
   * its own listening, so resolving them for a scripted party would spend path
   * integrals on data nobody reads.
   */
  run(world: SimWorld, slots: readonly number[], observers: readonly number[] = slots): EchoResult {
    const started = performance.now();
    const terrain = world.terrain;
    const entities = acousticEntities(world);
    this.terrain = terrain;
    this.scatterPass = terrain.hasScatter;

    for (const slot of observers) {
      this.best.get(slot)?.clear();
      const bucket = this.results.get(slot);
      if (bucket === undefined) this.results.set(slot, []);
      else bucket.length = 0;

      const litBucket = this.lit.get(slot);
      if (litBucket === undefined) this.lit.set(slot, []);
      else litBucket.length = 0;

      this.exposure.set(slot, { tier: ResolutionTier.Silent, trackedCount: 0 });
      const counted = this.countedTracked.get(slot);
      if (counted === undefined) this.countedTracked.set(slot, new Set());
      else counted.clear();

      const markBucket = this.markResults.get(slot);
      if (markBucket === undefined) this.markResults.set(slot, []);
      else markBucket.length = 0;
    }

    // --- Broadphase: index every listener once. -----------------------------
    this.contactWalks = 0;
    this.hash.clear();
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i]!;
      this.hash.insert(eid, Position.x[eid]!, Position.y[eid]!);
    }

    // --- Passive listening -------------------------------------------------
    // Hoisted once per pass: the loudest cell on the map cannot change inside
    // it, and the emitter loop is on the 2 ms budget.
    const peakPf = terrain.peakPf;
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
      // Which side of the thermocline this emitter is on (docs/systems-echo.md
      // §3). Hoisted per emitter because it cannot change inside the candidate
      // loop, and the row index saves a multiply per pair.
      const eZone = thermoclineZone(Position.depth[emitter]!);
      const eRow = eZone * 3;

      // Directional signature — docs/systems-echo.md §8. Hoisted per emitter
      // because a bow cannot change inside the candidate loop, leaving the pair
      // loop a dot product and two compares.
      //
      // Three tests, and each is one of §8's three exclusions rather than a
      // performance guard that happens to look like one:
      //
      //   - the faction, because this is one navy's doctrine and not physics;
      //   - the component, because a Bastion has no bow — hulls carry `Heading`
      //     and structures, marks and ordnance do not, so asking for it *is*
      //     asking "does this thing have a front";
      //   - the ping, because §5 fixes active sonar at SIG 95 *omnidirectional*
      //     and `acoustics.ts` writes that 95 straight into `Acoustic.sig`.
      //     Without this line a pinging Knight would broadcast 9.5 astern and
      //     the spec'd 2,400 m self-reveal — the figure `BASE_THRESHOLD` is
      //     solved from — would quietly stop being true from three quarters of
      //     the compass.
      let bowX = 0;
      let bowY = 0;
      const directional = hasBow(world, emitter);
      if (directional) {
        const rad = Heading.rad[emitter]!;
        bowX = Math.cos(rad);
        bowY = Math.sin(rad);
      }

      // Only listeners inside this radius can possibly hear the emitter, even
      // with the sharpest ears in the game. This bound is what keeps the pass
      // off an all-pairs comparison. PF is a path integral (issue #37) and no
      // path has been walked yet, so bound with the loudest water on the map —
      // the grid's live peak rather than the biome table's ceiling, so a
      // Standing Wave corridor at 2.0 is searched for while it stands and
      // costs nothing when none does (#372).
      const range = maxAudibleRangeM(
        sig,
        // ...and the loudest the *layer* can make a path from this emitter's
        // zone, which is 1.0 for everything except a hull sitting in the duct.
        // Omitting it is the quiet way to lose this feature: a duct pair
        // between 89% and 100% of its true audible range would be cut by the
        // exact test below and never walked, and the loss is a clean annulus
        // several hundred metres wide — precisely where the faint long-range
        // contacts this game is built on live.
        peakPf * pfFactor * THERMOCLINE_ZONE_MAX[eZone]!,
        PROPAGATION_MODEL.MAX_EXPECTED_HYD
      );
      // Deliberately *not* narrowed by the directional term. Its largest value
      // is 1.00 (the cone), so a bound computed without it stays an upper bound
      // on every pair — conservative in the only direction that is safe here.
      // Folding a per-pair factor into a per-emitter radius would need the
      // *maximum* over the candidate set anyway, which is 1.00 whenever any
      // listener is anywhere near the bow.
      if (range <= 0) continue;

      const candidates = this.hash.queryRadius(ex, ey, range, this.queryBuffer);

      const sigMasked = sig * pfFactor;
      const { REFERENCE_DISTANCE_M, ATTENUATION_EXPONENT } = PROPAGATION_MODEL;

      this.bestTierThisEmitter.fill(ResolutionTier.Silent);
      if (this.scatterPass) this.secondEarWanted.fill(0);

      const range2 = range * range;

      for (let j = 0; j < candidates.length; j++) {
        {
          const listener = candidates[j]!;
          const listenerSlot = Owner.slot[listener]!;
          if (listenerSlot === emitterSlot) continue;

          // The Drift is not a commander.
          //
          // Fauna carry Owner and real HYD — DRIFT_SLOT and 35-90 — so they
          // arrive here as candidate listeners exactly like a hull, and nothing
          // downstream can serve them: every per-slot structure below is sized
          // or keyed for player slots, and `record` would file the result under
          // a slot `run` never clears. The residue read has always had this
          // test; the pair loop did not.
          //
          // Leaving it out was worse than doing pointless work.
          // `bestTierThisEmitter` is sized MAX_SLOTS, so reading it at slot 200
          // gave `undefined`, and `cutoff2` and `pfNeeded` below both became
          // NaN — every comparison against which is false. So the tier prune
          // rejected nothing, and `pathPropagation` could never abort: each of
          // these pairs paid a *full-length* path integral. Measured at 229 per
          // pass in a default match against 42 with this line, on a 2 ms
          // budget (#215).
          //
          // Fauna hearing is fauna.ts's own walk, over its own thresholds.
          // Nothing here was feeding it.
          if (listenerSlot >= MAX_SLOTS) continue;

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
          if (d2 > cutoff2) {
            // Pruned — but on a grid with crystal, a listener that cannot
            // *beat* the standing tier may still be the second ear that
            // straightens the Fields' lie (docs/systems-echo.md §3, "Two
            // ears"). Set aside, not walked: `secondEarPass` below decides
            // after the candidate loop whether any of them is worth a path
            // integral, and it only asks when this slot's best is actually
            // being lied about. Bearing is the bar, because a Tier-1 smudge
            // has no bearing to cross with.
            if (
              this.scatterPass &&
              d2 <=
                range2 * this.rangeScaleSqByHyd[clamped]! * RATIO_SCALE_SQ[ResolutionTier.Contact]!
            ) {
              this.deferredEid.push(listener);
              this.deferredSlot.push(listenerSlot);
            }
            continue;
          }

          // Survivors — a small minority — pay for the pow.
          const distance = Math.sqrt(d2);
          // The thermocline is folded in *here*, into the loudness, and
          // deliberately nowhere else — the Baffle Barge precedent above, with
          // the one difference that this is a property of the pair and so
          // cannot hoist out of the candidate loop.
          //
          // Doing it here rather than to the walk's result is not a style
          // choice. `pfNeeded` below is derived from this number, so the walk
          // receives its bar in the raw-terrain units it actually returns, and
          // the `pf < pfNeeded` guard keeps quarantining the optimistic value
          // an aborted walk hands back. Multiply that returned value by a
          // factor above 1 instead and the quarantine breaks: an aborted walk
          // returns an upper bound, not a mean, and the tier would be computed
          // from it — a contact the server invents and then believes.
          const k = THERMOCLINE_PAIR_FACTOR[eRow + thermoclineZone(Position.depth[listener]!)]!;
          // ...and the emitter's own bow, folded in beside it and for the same
          // reason: both are properties of the pair, so neither can hoist out
          // of the candidate loop, and both have to reach `pfNeeded` below so
          // the walk is given its bar in the units it returns.
          //
          // The vector runs emitter → listener, which is `(lx - ex, ly - ey)` —
          // the negation of the `dx, dy` computed above for the distance test.
          // Unlike the thermocline this term is *not* symmetric: it is what the
          // Knight emits, never what the Knight hears.
          const dirFactor = directional
            ? directionalSectorFactor(bowX * -dx + bowY * -dy, distance)
            : 1;
          const perceivedPerPf =
            k *
            dirFactor *
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
          this.contactWalks++;
          const pf = terrain.pathPropagation(ex, ey, lx, ly, pfNeeded);
          if (pf < pfNeeded) {
            // An aborted walk hands back an upper bound, not a tier, so a
            // listener that failed to beat Bearing may still *reach* it. Set
            // aside for the same second-ear question as the pruned ones; a
            // bar at or below Contact that was not met is a listener that
            // heard nothing, and is not.
            if (this.scatterPass && bestTier >= ResolutionTier.Bearing) {
              this.deferredEid.push(listener);
              this.deferredSlot.push(listenerSlot);
            }
            continue;
          }

          const tier = tierFromRatio((perceivedPerPf * pf) / threshold);
          if (tier === ResolutionTier.Silent) continue;

          this.bestTierThisEmitter[listenerSlot] = tier;
          this.record(listenerSlot, emitter, tier, lx, ly);
        }
      }

      if (this.deferredEid.length > 0) {
        this.secondEarPass(
          emitter,
          ex,
          ey,
          eRow,
          sigMasked,
          directional,
          bowX,
          bowY,
          observers,
          terrain
        );
        this.deferredEid.length = 0;
        this.deferredSlot.length = 0;
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
      if (!stillPinging) {
        this.litAlready.delete(pinger);
        // The phantoms go with the transmission that conjured them. Nothing
        // re-sends them after this tick, so on the client they fade exactly
        // as a real hull the ping lit and then lost.
        this.phantoms.delete(pinger);
      }
    }

    for (let i = 0; i < entities.length; i++) {
      const pinger = entities[i]!;
      if (!hasComponent(world, ActivePing, pinger)) continue;
      if (ActivePing.remainingS[pinger]! <= 0) continue;

      let alreadyLit = this.litAlready.get(pinger);
      const firstTick = alreadyLit === undefined;
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

      // A ping transmitted from scattered water returns phantoms — the one
      // terrain that punishes the button directly (docs/systems-echo.md §5).
      // Decided on the transmission's first tick and held for its life; the
      // pinger's *own* cell decides, so a corridor cut through the Fields is
      // a place to ping from with a straight answer (mission-standing-wave §7).
      if (firstTick && pingerSlot < MAX_SLOTS && terrain.hasScatter && terrain.scatterAt(px, py)) {
        this.conjurePhantoms(world, pinger, pingerSlot, px, py, revealed, entities);
      }

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
    //
    // Over `observers`, not `slots`: a scripted party's payload is assembled
    // for nobody, but walking its resolutions is what raises `exposure` on the
    // player it resolved (#323). Building the contacts too, rather than a
    // second exposure-only walk, keeps this the one place the union's
    // information-safety argument has to be read.
    // Hoisted once per pass: whether the grid has any scattered water at all
    // gates every walk below, and the seed is the one input to the lie that
    // is a property of the match rather than of the pair.
    const scattered = terrain.hasScatter;
    const seed = world.rng.seed;
    for (const slot of observers) {
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
          if (resolved.tier >= ResolutionTier.Bearing) {
            // Once per hull, however many opponents are holding it. The set is
            // non-null exactly when `victim` is: both are keyed on a slot that
            // `exposure` answered for, which is a slot in the observer list.
            const counted = this.countedTracked.get(Owner.slot[eid]!)!;
            if (!counted.has(eid)) {
              counted.add(eid);
              victim.trackedCount++;
            }
          }
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
        // Scattered water — docs/systems-echo.md §3. Applied to whatever the
        // tier above chose to disclose, the ghost included, and at every tier
        // that carries a bearing: Classification names the hull and the
        // Fields still misplace it. Rotated about the listener that resolved
        // it, which for a ping's returns is the pinger, so the ping's own
        // returns lie exactly as §5 says they do.
        //
        // Priced once per resolved contact per observer, not per candidate
        // pair — dozens of walks against tens of thousands — and only on a
        // grid with crystal on it. The key is the *match-local* id, for the
        // same reason the Tier-2 blur's is.
        //
        // And not at all when the slot holds a cross bearing on it: two ears
        // solve the Fields (§3, "Two ears"), and a solved contact is reported
        // where it truly is. What the client learns from that is only a
        // position it earned twice over. The fraction was walked when the
        // best listener was recorded, so nothing is walked again here.
        if (scattered && resolved.tier >= ResolutionTier.Bearing && !resolved.crossed) {
          const fraction = resolved.fraction;
          if (fraction > 0) {
            const lied = scatterContact(
              contact.x,
              contact.y,
              resolved.listenerX,
              resolved.listenerY,
              fraction,
              seed,
              slot,
              localIdOf(world, eid) ?? eid,
              world.tick
            );
            contact.x = lied.x;
            contact.y = lied.y;
          }
        }
        // What this pass disclosed, for `firingSolution` to aim at.
        resolved.reportedX = contact.x;
        resolved.reportedY = contact.y;

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
          // The bow if the entity keeps one, the course of travel otherwise.
          //
          // Not a new disclosure: §4 already puts facing at Track and this is
          // the same field. It is a *correct* one now for a hull that has
          // stopped, which `atan2(0, 0)` — zero, due east — was not.
          if (hasComponent(world, Heading, eid)) {
            contact.heading = Heading.rad[eid]!;
          } else if (hasComponent(world, Velocity, eid)) {
            contact.heading = Math.atan2(Velocity.y[eid]!, Velocity.x[eid]!);
          }
        }

        out.push(contact);
      }
    }

    // Phantoms, after the real returns and under the same handle space. A
    // slot's phantoms ride in its own payload only: the AI seat reads that
    // payload and is deceived exactly as a player is (docs/systems-echo.md
    // §3 "Symmetric"), and nothing here raises anybody's exposure, because
    // nobody is being heard.
    if (this.phantoms.size > 0) {
      for (const returns of this.phantoms.values()) {
        const out = this.results.get(returns.slot);
        if (out === undefined) continue;
        for (const phantom of returns.contacts) {
          phantom.tick = world.tick;
          out.push(phantom);
        }
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
