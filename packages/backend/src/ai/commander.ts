/**
 * A commander that only knows what it heard.
 *
 * This file imports from `@echoes/shared` and from its two siblings, and from
 * nothing else — no `Match`, no `SimWorld`, no ECS component. That restriction
 * is enforced by ESLint rather than left to discipline (see `.eslintrc.cjs`),
 * because it is the acceptance criterion of the whole feature and a single
 * convenient import would quietly void it.
 *
 * What it may consult, and why each is legitimate:
 *
 * - the **briefing** — terrain, spawns, nodule fields. Map data, handed to
 *   every human client on join. A start position is painted on the ground.
 * - the **snapshot** — its own units and structures in full (they are its
 *   own), and contacts already resolved by the Echo Layer at whatever tier it
 *   earned, under handles that name no entity.
 * - **stat tables** — `statsFor`, `structureStatsFor`, the depth bands. Static
 *   game data, in the client bundle, printed in the HUD.
 *
 * Everything else it has to infer, and it infers the same wrong things a
 * player does: a Tier-1 smudge might be a cruiser or a grazer, and this
 * commander will occasionally march an army at a Draymaw. That is not a bug to
 * be papered over — it is the game.
 */

import {
  ACTIVE_SONAR,
  DEPTH,
  DEPTH_BANDS,
  DepthBand,
  EchoMarkKind,
  PRODUCIBLE,
  ResolutionTier,
  SIM,
  StructureKind,
  THERMOCLINE_DUCT_BOTTOM_M,
  UnitKind,
  effectivePressureRating,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  type Contact,
  type EchoMarkInfo,
  type EchoSnapshot,
  type OwnStructure,
  type OwnUnit,
  type ResourceNodeInfo,
} from '@echoes/shared';
import {
  doctrineFor,
  tuningFor,
  type AiTuning,
  type Doctrine,
  type ExposureResponse,
} from './doctrine.ts';
import type { AiBriefing, AiCommand, AiPlayer } from './types.ts';

/**
 * Ranges the commander reasons with, in metres. TUNABLE throughout — these are
 * a competent opening, not a solved one, and the balance harness exists to
 * argue with them.
 */
const RANGE = {
  /** The watch around the Bastion. A contact inside it is *considered*. */
  DEFEND_M: 2200,
  /**
   * Inside this, nothing is debated: a contact this close to the Bastion
   * recalls the army immediately, whatever it turns out to be. The cost of
   * being wrong about a grazer on your doorstep is a wasted trip; the cost of
   * being wrong about a raid is the match.
   */
  DEFEND_URGENT_M: 900,
  /** How near a waypoint counts as reached. */
  ARRIVE_M: 700,
  /** An unclassified contact this close to the army is worth a ping. */
  PING_CLASSIFY_M: 1600,
  /**
   * How far the army will chase a contact it can hear.
   *
   * An explicit attack order pursues (see the combat system), so this is not
   * a weapons range — it is the leash. Without one, a single enemy scout
   * heard across the map drags the whole army after it, which is the classic
   * way an RTS AI loses a game it was winning.
   */
  PURSUIT_M: 2800,
  /** Where the army waits: this far from home, toward the enemy. */
  RALLY_M: 1200,
  /** A vent this far from home is close enough to tap. */
  TAP_SEARCH_M: 2600,
  /** Structures are placed at least this far out from the Bastion. */
  BUILD_MIN_M: 420,
} as const;

/**
 * The two depths the army has words for.
 *
 * Depth is the axis of commitment (docs/systems-depth.md §5), so the commander
 * gets exactly two: where it lives, and where it goes when it means it. A
 * continuous depth would be a knob; a pair is a decision.
 */
const DEPTH_PLAN = {
  /** Where the force sits when it is not crossing — its own spawn depth. */
  CRUISE_M: 600,
  /**
   * Under the layer. Below THERMOCLINE_DUCT_BOTTOM_M rather than at 1,200 m,
   * because the duct is the one zone that can make you *louder*: a duct-to-duct
   * pair is 1.2×, so a naive "hide at the thermocline" aims at the only water
   * on the axis that is worse than open. The stealth is in crossing past it.
   */
  CROSSING_M: THERMOCLINE_DUCT_BOTTOM_M + 100,
  /**
   * Clearance kept off a band boundary when a hull is clamped to its rating,
   * so a hull parked at its own limit is never ambiguously in the band below.
   */
  BAND_MARGIN_M: 50,
} as const;

/**
 * Telling a raid from a fish, without being told which it is.
 *
 * The Drift is seeded near spawns, and at Tier 1 a grazer and a cruiser are
 * the same smudge — `bestThreat` only skips contacts the Echo Layer has
 * actually *classified* as fauna, which needs Tier 3. So "anything near home
 * recalls the army" meant the army was recalled essentially always: measured
 * over a fifteen-minute Directorate match, 41% of every decision was the
 * defend branch and the push branch was reached **zero** times. With the Drift
 * emptied and nothing else changed, the same commander pushed 920 times.
 *
 * The commander cannot be handed the answer — that is the game. What it can do
 * is what a player does: watch. A grazer wanders and a raid *closes*, so a
 * contact earns the alarm by having got nearer since it was first seen, and by
 * having been watched long enough for that to mean something.
 */
const DEFEND_WATCH = {
  /** Seconds a contact must be under observation before its trend is read. */
  CONFIRM_S: 12,
  /** How much nearer it must have come, in metres, to count as approaching. */
  CLOSED_M: 350,
  /** Forget a contact not seen for this long, so the watch list stays bounded. */
  FORGET_S: 60,
} as const;

/**
 * Paying to be quiet, and knowing when to stop.
 *
 * The throttle drop used to be a reflex: anything holding a bearing on the
 * force, and every harvester went to Trickle for as long as that stayed true.
 * That was the right shape while the lever did not bite — the load scaled the
 * cut rate, so dropping cost a few per cent — and the wrong shape the moment
 * it did. Trickle is now 46% of Standard's income (docs/economy.md §3), and a
 * reflex that spends 54% of an economy should be a judgement instead.
 *
 * The judgement is the same one `DEFEND_WATCH` makes about a contact near
 * home, for the same reason: the fact on its own does not separate the case
 * worth paying for from the case that is not. A bearing means somebody knows
 * roughly where you are. It does not mean they are close, coming, or capable —
 * so what the commander waits for is not the bearing but the *holding* of it,
 * which is the part a passing sweep does not do. Like the defend watch, it can
 * be wrong in both directions: it will work straight through the scout that
 * was about to fetch an army, and it will still buy quiet against one that was
 * leaving.
 *
 * **Slow in, immediate out**, and the asymmetry is the point. Entering costs
 * the doctrine's whole hold; leaving costs nothing beyond a blink of silence.
 * A draft that guarded both ends alike — a fifteen-second release to match the
 * hold — was measured giving most of the win back: bridging every gap shorter
 * than its own window, it left a Directorate quiet for 66% of a match against
 * this rule's 47%, on the same seed and the same water. Being briefly loud
 * costs SIG. Being needlessly quiet costs half an economy. Those are not the
 * same price and the rules should not treat them as one.
 *
 * The doctrine sets how long the wait is (`ExposureResponse.holdS`), because
 * what a bearing is worth is a faction argument. Everything below is the part
 * that is the same for everyone.
 */
const EXPOSURE_WATCH = {
  /**
   * The tier that skips the deliberation, exactly as DEFEND_URGENT_M does.
   *
   * Track is full resolution — exact unit, health, facing. Nobody holds that
   * by accident and nobody holds it from a distance: it is the one reading
   * that is not ambiguous, so it is the one that does not get waited out.
   */
  URGENT_TIER: ResolutionTier.Track,
  /**
   * How long a bearing may lapse and still count as held, in seconds.
   *
   * Not a release timer — a blink tolerance, and it is one ping's reveal
   * because that is the shortest gap the acoustic model can manufacture.
   * Detection resolves at ECHO_HZ, so a hull between two sweeps drops out of
   * the report for a moment and comes back; the defend watch makes the same
   * allowance for the same reason, and forgetting a contact the instant it
   * went quiet would hand it a fresh baseline every time it ran silent.
   * Derived rather than picked, so a change to what a ping buys moves it too.
   */
  BLINK_S: ACTIVE_SONAR.REVEAL_DURATION_S,
  /**
   * The longest a single spell of quiet may last, in seconds.
   *
   * This is the floor the reflex did not have, and the argument for it is that
   * hiding is a *bet*: the commander gives up half its income to make the
   * bearing go away. Two harvest round trips (docs/economy.md §3 puts one near
   * 45 s) is long enough for the drop to have reached every hauler that was in
   * transit when it was ordered. If the line is still held after that, the bet
   * lost — and it lost for a reason the commander cannot fix by paying more,
   * because exposure is a fact about the whole force. A Bastion, an army at
   * the rally point or a scout on its leg are all resolved by the same
   * hydrophones, and no harvest throttle in the game quiets any of them.
   *
   * So the spell ends, the economy comes back up, and whoever is listening is
   * made to find it again.
   */
  HIDE_MAX_S: 90,
  /**
   * Working seconds it must bank before it will pay for quiet again.
   *
   * One round trip at the resting throttle, and it is what stops the cap above
   * from becoming a flap: without it a commander whose exposure never clears
   * would end a spell and open the next one on the same observation, which is
   * the reflex again with extra steps. Absolute — even a Track-tier reading
   * waits it out, because a commander that has just spent 90 s proving quiet
   * does not break this particular bearing has learned something, and the
   * strength of the reading is not what it learned.
   */
  WORK_MIN_S: 45,
} as const;

/** Longest a remembered enemy position stays worth walking to, in seconds. */
const MEMORY_S = 90;

/**
 * The deepest water this Pressure Rating is actually rated for.
 *
 * The commander clamps every depth order through this. `Match.orderDepth`
 * deliberately does not check ratings — renting depth you cannot survive is
 * the mechanic, and a human may do it — but a PR-1 Light Scout ordered under
 * the layer takes 4 HP/s of unhealable crush for a stealth benefit it will not
 * live to use, and difficulty here is decision quality (see `AiTuning`). So the
 * army splits vertically by what each hull can survive rather than refusing to
 * dive at all: the rated hulls cross, and the scouts stay in the light.
 *
 * That split is not only a safety rule. Contacts resolve per slot, so a
 * shallow scout keeps hearing on behalf of an army that has gone deaf under
 * the layer — which is the one answer this commander has to §3's "hidden from
 * the surface *and deaf to it*, in equal measure".
 */
function ratedDepthCeiling(pressureRating: number): number {
  // requiredPressureRating(d) is depthBandFor(d) + 1, so a rating of r covers
  // every band up to index r - 1. Derived from that rather than restated, so a
  // fourth band could not silently strand this.
  const band = Math.min(Math.max(pressureRating, 1), DepthBand.Abyssal + 1) - 1;
  const max = DEPTH_BANDS[band as DepthBand].max;
  return Number.isFinite(max) ? max - DEPTH_PLAN.BAND_MARGIN_M : DEPTH.MAX_M;
}

/** Sim ticks between Echo snapshots — the commander's clock unit. */
const TICKS_PER_OBSERVATION = SIM.TICK_HZ / SIM.ECHO_HZ;

interface Remembered {
  x: number;
  y: number;
  /** Sim tick this was last confirmed on. */
  tick: number;
}

export class AiCommander implements AiPlayer {
  readonly slot: number;
  private readonly briefing: AiBriefing;
  private readonly doctrine: Doctrine;
  private readonly tuning: AiTuning;
  private readonly home: { x: number; y: number };
  private readonly enemyStarts: { x: number; y: number }[];

  /** Observations seen, which is the commander's only clock for cadence. */
  private observations = -1;
  /**
   * Sim tick the next active sonar transmission is allowed on.
   *
   * Starts at one full doctrine interval rather than at zero, which is a bug
   * the balance harness caught: at zero, every commander of every faction
   * transmitted 0.4 seconds into the match. The Drift puts creatures near a
   * spawn, so there was always an unclassified contact beside the opening
   * force, and the "ping to classify" rule fired on it — announcing the base
   * to everything within 2,400 m before anybody had done anything.
   */
  private nextPingTick: number;
  /** Which field each harvester was sent to. Assigned once; the loop cycles. */
  private readonly nodeByHarvester = new Map<number, number>();
  /** Rotates a rejected build placement, since a refusal is silent. */
  private buildAttempt = 0;
  /** Which leg of the scouting route the scout is on. */
  private scoutLeg = 0;
  /** The last place it had any reason to think an enemy was. */
  private remembered: Remembered | null = null;
  /** Silent Running state it believes the army is in, to avoid re-sending. */
  private armySilent = false;
  /**
   * The exposure watch: four clocks answering one question, which is whether
   * the economy should currently be paying to be quiet (see `wantsQuiet`).
   *
   * Ticks rather than durations, because a snapshot carries a tick and the
   * commander has no other clock.
   */
  /** When the current spell of quiet began, or null while it is working. */
  private hidingSinceTick: number | null = null;
  /** Start of the run of exposure it is timing, blinks bridged, or null. */
  private heardSinceTick: number | null = null;
  /** Last observation on which anything held a bearing, for the blink rule. */
  private lastHeardTick = 0;
  /** Earliest tick it will pay for quiet again, after a spell that did not work. */
  private hideAgainTick = 0;
  /**
   * What it has seen loitering near the Bastion, by contact handle.
   *
   * A handle is minted once per (slot, entity) and kept until that entity
   * dies, so it is stable across ticks and safe to key on — and it still names
   * nothing: the commander learns "that one" without learning what it is.
   */
  private readonly homeWatch = new Map<
    number,
    { seenTick: number; lastTick: number; farthest: number }
  >();

  constructor(briefing: AiBriefing) {
    this.briefing = briefing;
    this.slot = briefing.slot;
    this.doctrine = doctrineFor(briefing.faction);
    this.tuning = tuningFor(briefing.difficulty);
    this.home = briefing.spawns[briefing.slot] ?? {
      x: briefing.widthM / 2,
      y: briefing.heightM / 2,
    };
    this.enemyStarts = briefing.spawns.filter((_, index) => index !== briefing.slot);
    this.nextPingTick = this.doctrine.pingIntervalS * SIM.TICK_HZ;
  }

  observe(snapshot: EchoSnapshot): AiCommand[] {
    this.observations++;
    // Cadence is the difficulty knob that matters most: a Recruit finishes a
    // bad plan before it notices a better one.
    if (this.observations % this.tuning.cadenceTicks !== 0) return [];
    // Eliminated, or not spawned yet. Nothing to command either way.
    if (snapshot.units.length === 0 && snapshot.structures.length === 0) return [];

    const commands: AiCommand[] = [];
    const harvesters = snapshot.units.filter((u) => u.kind === UnitKind.Harvester);
    const scout = this.designateScout(snapshot.units);
    const army = snapshot.units.filter(
      (u) => statsFor(u.kind).attackDamage > 0 && u.id !== scout?.id
    );

    this.remember(snapshot);
    this.forgetDeadHarvesters(harvesters);

    // A running budget, so two decisions in one tick cannot both spend the
    // same nodule. The server would refuse the second anyway; spending it
    // twice here would just make the commander look like it was thinking.
    const purse = { nodules: snapshot.nodules, crystal: snapshot.crystal };

    this.commandEconomy(snapshot, harvesters, commands);
    this.commandConstruction(snapshot, purse, commands);
    this.commandProduction(snapshot, harvesters, army, purse, commands);
    this.commandScout(snapshot, scout, commands);
    this.commandArmy(snapshot, army, commands);
    this.commandSonar(snapshot, army, commands);

    return commands;
  }

  // --- Memory ---------------------------------------------------------------

  /**
   * Where the enemy probably is.
   *
   * Built from what the Echo Layer already resolved for this slot and nothing
   * else: a live contact first, then acoustic residue, which is the past you
   * bought with hydrophones (docs/systems-echo.md §7). A mark says this water
   * was recently violent or recently worked; it never says whose, and this
   * commander does not pretend otherwise — it just walks toward it.
   */
  private remember(snapshot: EchoSnapshot): void {
    const best = this.bestThreat(snapshot.contacts);
    if (best !== null) {
      this.remembered = { x: best.x, y: best.y, tick: snapshot.tick };
      return;
    }

    const mark = this.freshestMark(snapshot.marks);
    if (mark !== null) {
      this.remembered = { x: mark.x, y: mark.y, tick: snapshot.tick };
      return;
    }

    if (this.remembered !== null) {
      const ageS = (snapshot.tick - this.remembered.tick) / SIM.TICK_HZ;
      if (ageS > MEMORY_S) this.remembered = null;
    }
  }

  /**
   * The contact most worth acting on.
   *
   * Anything classified as fauna is skipped, and anything *not yet* classified
   * is not — which is the honest reading of §3. At Tier 1 there is no marker
   * that distinguishes a grazer from a cruiser, so this commander will
   * sometimes commit to a Draymaw, exactly as a player does.
   *
   * A **Bastion outranks everything**, because losing one is losing the match,
   * and any structure outranks any hull: a hull is somewhere else in thirty
   * seconds and a building never is. That ordering only becomes available at
   * Tier 3 — classification is where a contact acquires a *kind* — so it is
   * information the commander earned rather than a preference it was handed.
   */
  private bestThreat(contacts: readonly Contact[]): Contact | null {
    let best: Contact | null = null;
    for (const contact of contacts) {
      if (contact.fauna !== undefined) continue;
      if (best === null || priority(contact) > priority(best)) best = contact;
    }
    return best;
  }

  private freshestMark(marks: readonly EchoMarkInfo[]): EchoMarkInfo | null {
    let best: EchoMarkInfo | null = null;
    for (const mark of marks) {
      // Industrial hum is the useful one for finding a base; the violent kinds
      // point at where a fight already happened, which is a weaker lead.
      const worth = mark.kind === EchoMarkKind.IndustrialHum ? 2 : 1;
      const bestWorth = best === null ? 0 : best.kind === EchoMarkKind.IndustrialHum ? 2 : 1;
      if (best === null || worth > bestWorth) best = mark;
    }
    return best;
  }

  private forgetDeadHarvesters(harvesters: readonly OwnUnit[]): void {
    const alive = new Set(harvesters.map((h) => h.id));
    for (const id of [...this.nodeByHarvester.keys()]) {
      if (!alive.has(id)) this.nodeByHarvester.delete(id);
    }
  }

  // --- Economy --------------------------------------------------------------

  /**
   * Send every unassigned harvester to a field, once.
   *
   * Once is the operative word: the harvest loop is a state machine that
   * cycles field to depot forever, so a second order would only interrupt a
   * hull that was already mining. The commander cannot see a harvester's mode
   * — a human cannot either — so it remembers the assignment instead.
   */
  private commandEconomy(
    snapshot: EchoSnapshot,
    harvesters: readonly OwnUnit[],
    out: AiCommand[]
  ): void {
    for (const harvester of harvesters) {
      if (this.nodeByHarvester.has(harvester.id)) continue;
      const node = this.pickNode(harvester);
      if (node === null) continue;
      this.nodeByHarvester.set(harvester.id, node.id);
      out.push({ kind: 'harvest', unitIds: [harvester.id], nodeId: node.id });
    }

    // Loudness is a dial on the economy, and this is the only place the
    // commander turns it. Exposure is a fact about *itself*, so reading it
    // reveals nothing — but acting on it is no longer free, which is why the
    // decision is in `wantsQuiet` and not on this line.
    const response = this.doctrine.exposureResponse;
    const want =
      response !== null && this.wantsQuiet(snapshot, response)
        ? response.throttle
        : this.doctrine.restingThrottle;
    const wrong = harvesters.filter((h) => h.throttle !== want).map((h) => h.id);
    if (wrong.length > 0) out.push({ kind: 'throttle', unitIds: wrong, throttle: want });
  }

  /**
   * Whether the economy should be paying for quiet right now.
   *
   * Four rules, in the order they are allowed to fire (see EXPOSURE_WATCH for
   * why each one exists):
   *
   * 1. **The quiet worked.** Already hiding, and the bearing is gone — not
   *    blinking, gone. Back to work immediately; this is the cheap direction.
   * 2. **The quiet did not work.** Already hiding for HIDE_MAX_S and still
   *    held. Back to work, and bank WORK_MIN_S before buying any more.
   * 3. **Urgent.** Somebody has full resolution. That is not a sweep.
   * 4. **The judgement.** A bearing held for the doctrine's own hold, which is
   *    the only rule here that can be mistaken, and is meant to be.
   *
   * Called once per decision and only from `commandEconomy`, because it
   * advances the run clocks — calling it twice in a tick would not be wrong,
   * but calling it on a tick the commander is not deciding on would leave the
   * runs measuring the cadence rather than the water.
   */
  private wantsQuiet(snapshot: EchoSnapshot, response: ExposureResponse): boolean {
    // A Recruit does not manage its loudness at all (docs/tech-stack.md,
    // "difficulty is decision quality"), so it never reaches the watch and its
    // harvesters stay wherever the doctrine rests them.
    if (!this.tuning.managesExposure) return false;

    const now = snapshot.tick;
    const seconds = (fromTick: number): number => (now - fromTick) / SIM.TICK_HZ;

    // One run of exposure, with blinks bridged. `heardSinceTick` is when it
    // started; it survives a lapse shorter than a ping's reveal and dies on
    // anything longer, which is what makes "held" mean held.
    if (snapshot.exposure.tier >= ResolutionTier.Bearing) {
      this.lastHeardTick = now;
      this.heardSinceTick ??= now;
    } else if (
      this.heardSinceTick !== null &&
      seconds(this.lastHeardTick) > EXPOSURE_WATCH.BLINK_S
    ) {
      this.heardSinceTick = null;
    }
    const heardSince = this.heardSinceTick;

    if (this.hidingSinceTick !== null) {
      // The quiet worked. Go and earn something before they find it again.
      if (heardSince === null) {
        this.hidingSinceTick = null;
        return false;
      }
      // The quiet did not work, and ninety seconds is long enough to know.
      if (seconds(this.hidingSinceTick) >= EXPOSURE_WATCH.HIDE_MAX_S) {
        this.hidingSinceTick = null;
        this.hideAgainTick = now + EXPOSURE_WATCH.WORK_MIN_S * SIM.TICK_HZ;
        return false;
      }
      return true;
    }

    if (heardSince === null || now < this.hideAgainTick) return false;

    const urgent = snapshot.exposure.tier >= EXPOSURE_WATCH.URGENT_TIER;
    if (!urgent && seconds(heardSince) < response.holdS) return false;

    this.hidingSinceTick = now;
    return true;
  }

  /**
   * The nearest field this hull is rated to work, least crowded first.
   *
   * The pressure check is the interesting one: crystal sits in the Abyssal
   * band, so an ordinary Harvester sent to a crystal field would descend into
   * water that eats it (docs/economy.md §7). Pressure ratings are stat-table
   * data, not world state — the HUD prints them.
   */
  private pickNode(harvester: OwnUnit): ResourceNodeInfo | null {
    const rating = effectivePressureRating(harvester.kind, this.briefing.faction);
    const crowd = new Map<number, number>();
    for (const nodeId of this.nodeByHarvester.values()) {
      crowd.set(nodeId, (crowd.get(nodeId) ?? 0) + 1);
    }

    let best: ResourceNodeInfo | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const node of this.briefing.nodes) {
      if (requiredPressureRating(node.depth) > rating) continue;
      // Crowding costs a notional kilometre per harvester already there, so a
      // second field opens before a first one is stacked four deep.
      const score = distance(node, this.home) + (crowd.get(node.id) ?? 0) * 1000;
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    }
    return best;
  }

  // --- Construction ---------------------------------------------------------

  private commandConstruction(
    snapshot: EchoSnapshot,
    purse: { nodules: number; crystal: number },
    out: AiCommand[]
  ): void {
    const has = (kind: StructureKind): boolean => snapshot.structures.some((s) => s.kind === kind);

    // A Refinery first: it shortens every haul, and the hauls are where the
    // economy actually lives.
    if (!has(StructureKind.Refinery)) {
      const node = this.busiestNode();
      if (node !== null && this.afford(StructureKind.Refinery, purse)) {
        out.push({ kind: 'build', structure: StructureKind.Refinery, ...this.nearHome(node) });
        this.buildAttempt++;
        return;
      }
    }

    // A Vent Tap once the plant is nearly drawing more than it makes. Thermal
    // Draw is a rate, so "nearly" is the whole warning you get.
    const tight = snapshot.draw.demand >= snapshot.draw.capacity - 1;
    if (tight && !has(StructureKind.VentTap) && this.afford(StructureKind.VentTap, purse)) {
      const vent = this.nearestVent();
      if (vent !== null) {
        out.push({ kind: 'build', structure: StructureKind.VentTap, x: vent.x, y: vent.y });
        this.buildAttempt++;
        return;
      }
    }

    // A turret only once something has actually been heard near home. Building
    // one pre-emptively is loud, expensive and aimed at nothing.
    const threatened = snapshot.contacts.some(
      (c) => c.fauna === undefined && distance(c, this.home) < RANGE.DEFEND_M
    );
    if (threatened && !has(StructureKind.SentinelTurret)) {
      if (this.afford(StructureKind.SentinelTurret, purse)) {
        const toward = this.remembered ?? this.enemyStarts[0] ?? this.home;
        out.push({
          kind: 'build',
          structure: StructureKind.SentinelTurret,
          ...this.nearHome(toward),
        });
        this.buildAttempt++;
      }
    }
  }

  private afford(kind: StructureKind, purse: { nodules: number; crystal: number }): boolean {
    const stats = structureStatsFor(kind);
    const crystal = stats.crystalCost ?? 0;
    if (purse.nodules < stats.cost || purse.crystal < crystal) return false;
    purse.nodules -= stats.cost;
    purse.crystal -= crystal;
    return true;
  }

  /**
   * A placement between home and something worth being near.
   *
   * A refused build is silent — the server just does not create it — so the
   * commander cannot be told why. It does what a player does instead: nudges
   * the spot and tries again next time it looks, which the rotating attempt
   * counter turns into a spiral rather than a repeated identical failure.
   */
  private nearHome(toward: { x: number; y: number }): { x: number; y: number } {
    const dx = toward.x - this.home.x;
    const dy = toward.y - this.home.y;
    const spread = (this.buildAttempt % 6) * 0.5;
    const angle = Math.atan2(dy, dx) + spread;
    const reach = RANGE.BUILD_MIN_M + (this.buildAttempt % 4) * 140;
    return {
      x: clamp(this.home.x + Math.cos(angle) * reach, 200, this.briefing.widthM - 200),
      y: clamp(this.home.y + Math.sin(angle) * reach, 200, this.briefing.heightM - 200),
    };
  }

  private busiestNode(): ResourceNodeInfo | null {
    let best: ResourceNodeInfo | null = null;
    let bestCount = 0;
    for (const node of this.briefing.nodes) {
      let count = 0;
      for (const id of this.nodeByHarvester.values()) if (id === node.id) count++;
      if (count > bestCount || best === null) {
        bestCount = count;
        best = node;
      }
    }
    return best;
  }

  /** The nearest Thermal Vein cell to home, read off the biome grid. */
  private nearestVent(): { x: number; y: number } | null {
    const { cols, rows, cellM, biomes } = this.briefing.terrain;
    let best: { x: number; y: number } | null = null;
    let bestDistance: number = RANGE.TAP_SEARCH_M;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (biomes[row * cols + col] !== BIOME_THERMAL_VEIN) continue;
        const x = (col + 0.5) * cellM;
        const y = (row + 0.5) * cellM;
        const d = distance({ x, y }, this.home);
        if (d < bestDistance) {
          bestDistance = d;
          best = { x, y };
        }
      }
    }
    return best;
  }

  // --- Production -----------------------------------------------------------

  private commandProduction(
    snapshot: EchoSnapshot,
    harvesters: readonly OwnUnit[],
    army: readonly OwnUnit[],
    purse: { nodules: number; crystal: number },
    out: AiCommand[]
  ): void {
    const queuedOf = (kind: UnitKind): number =>
      snapshot.structures.reduce((total, s) => total + s.queue.filter((q) => q === kind).length, 0);

    // Harvesters first, always. An army built on four harvesters is a one-shot
    // army, and this game rewards the long economy.
    const wantHarvesters =
      this.doctrine.harvesterTarget - harvesters.length - queuedOf(UnitKind.Harvester);
    if (wantHarvesters > 0) {
      const yard = this.freeYard(snapshot.structures, UnitKind.Harvester);
      if (yard !== null && this.affordUnit(UnitKind.Harvester, purse)) {
        out.push({ kind: 'produce', structureId: yard.id, unit: UnitKind.Harvester });
        return;
      }
    }

    const target = Math.ceil(this.doctrine.attackAtArmySize * this.tuning.patience) + 2;
    const queuedArmy = snapshot.structures.reduce(
      (total, s) => total + s.queue.filter((q) => q !== UnitKind.Harvester).length,
      0
    );
    if (army.length + queuedArmy >= target) return;

    // Composition cycles rather than being solved: it keeps the mix roughly
    // the doctrine's shape without needing a counter-composition model the
    // information available could not support anyway.
    //
    // The *fallback* is the part that matters, and it is there because its
    // absence deadlocked a whole faction. Hadron's composition opens with a
    // 420-nodule Cruiser. A commander that could not afford one queued
    // nothing — so its army never grew, so `army.length` never changed, so the
    // next decision selected the same unaffordable Cruiser, forever. Ten
    // matches, zero production, zero wins, and 2.2 hull losses against a field
    // average of sixteen: they were not losing fights, they were not having
    // them. Every other faction's composition happens to open with something
    // cheap, so nobody else ever hit it.
    //
    // A commander that cannot buy its first choice buys its second, which is
    // what a player does.
    const cycled = this.doctrine.composition[army.length % this.doctrine.composition.length]!;
    for (const wanted of [cycled, ...affordableFirst(this.doctrine.composition, purse.nodules)]) {
      const yard = this.freeYard(snapshot.structures, wanted);
      if (yard === null) continue;
      if (!this.affordUnit(wanted, purse)) continue;
      out.push({ kind: 'produce', structureId: yard.id, unit: wanted });
      return;
    }
  }

  private affordUnit(kind: UnitKind, purse: { nodules: number; crystal: number }): boolean {
    const stats = statsFor(kind);
    const crystal = stats.crystalCost ?? 0;
    if (purse.nodules < stats.cost || purse.crystal < crystal) return false;
    purse.nodules -= stats.cost;
    purse.crystal -= crystal;
    return true;
  }

  /** A structure that can build this hull and is not already backed up. */
  private freeYard(structures: readonly OwnStructure[], kind: UnitKind): OwnStructure | null {
    for (const structure of structures) {
      if (structure.buildProgress < 1) continue;
      if (!PRODUCIBLE[structure.kind]?.includes(kind)) continue;
      // Two deep. A longer queue is capital sitting in a building rather than
      // in the water, and the commander re-decides every few hundred ms anyway.
      if (structure.queue.length >= 2) continue;
      return structure;
    }
    return null;
  }

  // --- Scouting -------------------------------------------------------------

  /** The lowest-id Light Scout, so the choice is stable across observations. */
  private designateScout(units: readonly OwnUnit[]): OwnUnit | null {
    let best: OwnUnit | null = null;
    for (const unit of units) {
      if (unit.kind !== UnitKind.LightScout) continue;
      if (best === null || unit.id < best.id) best = unit;
    }
    return best;
  }

  private commandScout(snapshot: EchoSnapshot, scout: OwnUnit | null, out: AiCommand[]): void {
    if (scout === null) return;
    const route = this.scoutRoute();
    const leg = route[this.scoutLeg % route.length]!;
    if (distance(scout, leg) < RANGE.ARRIVE_M) {
      this.scoutLeg++;
      out.push({ kind: 'move', unitIds: [scout.id], ...route[this.scoutLeg % route.length]! });
      return;
    }
    // A scout that has stopped needs telling again; one that is under way does
    // not, and re-issuing would reset its plan every cadence tick.
    if (!scout.silentRunning && this.tuning.usesSilentRunning) {
      out.push({ kind: 'silent', unitIds: [scout.id], active: true });
    }
    if (snapshot.tick % (TICKS_PER_OBSERVATION * 25) < TICKS_PER_OBSERVATION) {
      out.push({ kind: 'move', unitIds: [scout.id], x: leg.x, y: leg.y });
    }
  }

  /** Enemy starts first — the one place an enemy is guaranteed to have been. */
  private scoutRoute(): { x: number; y: number }[] {
    const centre = { x: this.briefing.widthM / 2, y: this.briefing.heightM / 2 };
    return [...this.enemyStarts, centre, ...this.briefing.nodes.slice(0, 3)].map((p) => ({
      x: p.x,
      y: p.y,
    }));
  }

  // --- The army -------------------------------------------------------------

  /**
   * Where the army goes and what it shoots.
   *
   * The distances here are measured from the **nearest** hull, never from the
   * army's centroid, and that is not a detail. A centroid is dragged backward
   * by every reinforcement that spawns at home, so a force with three hulls at
   * the enemy base and three walking out from the Bastion has its centre of
   * mass somewhere in the middle of the map — and an engagement test against
   * that centre concludes there is nothing in range while its front line is
   * parked on an enemy Bastion doing nothing. Measured, that mistake was worth
   * about 0.8 damage per second against a stationary target.
   */
  private commandArmy(snapshot: EchoSnapshot, army: readonly OwnUnit[], out: AiCommand[]): void {
    if (army.length === 0) return;
    const ids = army.map((u) => u.id);

    // Home first. A push that leaves the Bastion undefended trades the match
    // for a raid, and losing the Bastion is losing — but not everything near
    // the Bastion is a raid. See `approachingHome`.
    const athome = this.bestThreat(this.approachingHome(snapshot));
    if (athome !== null) {
      this.setSilent(ids, false, out);
      this.setCrossed(army, false, out);
      out.push({ kind: 'attack', unitIds: ids, contactId: athome.id });
      return;
    }

    const threshold = Math.ceil(this.doctrine.attackAtArmySize * this.tuning.patience);
    if (army.length < threshold) {
      // Waiting is a position, not a pause: sit between home and the enemy so
      // the push does not start from the back of the map.
      const rally = this.rallyPoint();
      this.setSilent(ids, false, out);
      // Massing happens in the light. A force still gathering has not made the
      // bet yet, and a hull that dove while waiting would spend the climb
      // ascending when the order to go finally came.
      this.setCrossed(army, false, out);
      if (nearest(army, rally) > RANGE.ARRIVE_M) {
        out.push({ kind: 'move', unitIds: ids, x: rally.x, y: rally.y });
      }
      return;
    }

    // An attack order chases and then holds to shoot, so this covers both
    // closing and firing. The leash is what stops one heard scout from towing
    // the whole army off the map.
    const engaging = this.bestThreat(
      snapshot.contacts.filter((c) => nearest(army, c) < RANGE.PURSUIT_M)
    );
    if (engaging !== null) {
      // Silent Running trades weapons for quiet, so it comes off the moment
      // there is something to shoot. The crossing is given back for the same
      // reason and one more: under the layer the army is deaf to the surface
      // in exactly the measure it is hidden from it, and a fight is the one
      // moment it cannot afford to stop hearing.
      this.setSilent(ids, false, out);
      this.setCrossed(army, false, out);
      out.push({ kind: 'attack', unitIds: ids, contactId: engaging.id });
      return;
    }

    // The attack run, and the one place the layer is worth its price. The dive
    // costs 72 SIG for ~16 s and the climb back takes ~47 s, so it is only
    // ever paid by a force that has already decided to go — which is what
    // makes it a commitment rather than a stealth toggle. Deliberately not
    // triggered by being heard: a commander that dove whenever exposure rose
    // would go deaf on the way down, lose the contact that justified the dive,
    // surface, hear it again, and oscillate.
    const target = this.remembered ?? this.enemyStarts[0] ?? this.home;
    this.setSilent(ids, this.doctrine.approachesSilently && this.tuning.usesSilentRunning, out);
    this.setCrossed(army, this.doctrine.crossesTheLayer, out);
    if (nearest(army, target) > RANGE.ARRIVE_M) {
      out.push({ kind: 'move', unitIds: ids, x: target.x, y: target.y });
    }
  }

  /**
   * Put the army under the layer, or bring it back.
   *
   * One command per distinct depth rather than one per hull: every hull is
   * clamped to what its own Pressure Rating covers, so a mixed force splits
   * into a rated group that crosses and an unrated one that stays shallow.
   * Grouping keeps the command count proportional to the number of *depths*
   * the force wants, which is two at worst.
   */
  private setCrossed(army: readonly OwnUnit[], crossed: boolean, out: AiCommand[]): void {
    const wanted = crossed ? DEPTH_PLAN.CROSSING_M : DEPTH_PLAN.CRUISE_M;
    const byDepth = new Map<number, number[]>();

    for (const unit of army) {
      const depthM = Math.min(
        wanted,
        ratedDepthCeiling(effectivePressureRating(unit.kind, this.briefing.faction))
      );
      // Read the hull rather than a remembered intention. `armySilent` can get
      // away with a believed flag because silence is one bit for the whole
      // force; depth cannot, because reinforcements spawn at cruise depth long
      // after the crossing was ordered — a belief would leave every hull built
      // mid-push sitting above a layer the rest of the army is under.
      //
      // depthOrder is the hull's target while a dive is in flight and absent
      // once it arrives, so this reads "where it is going, or where it is",
      // which is exactly the question. A hull the seabed is holding above its
      // target still carries the order, so terrain does not provoke a re-send.
      const heading = unit.depthOrder ?? unit.depth;
      if (Math.abs(heading - depthM) <= DEPTH.ARRIVAL_EPSILON_M) continue;
      // Surfacing may never push a hull *down*. A PR-1 scout is seated at
      // 300 m and its rated ceiling is shallower than cruise depth, so without
      // this the order to come home is a 50 m descent — and a descent breaks
      // Silent Running (see Match.orderDepth), every time a new scout is
      // built. Coming back is an ascent or it is nothing.
      if (!crossed && heading <= depthM) continue;

      const group = byDepth.get(depthM);
      if (group === undefined) byDepth.set(depthM, [unit.id]);
      else group.push(unit.id);
    }

    // Insertion-ordered, and the army arrives in a stable order, so the command
    // stream is identical run to run — which the replay log depends on.
    for (const [depthM, unitIds] of byDepth) {
      out.push({ kind: 'depth', unitIds, depthM });
    }
  }

  /**
   * The contacts near the Bastion that have earned the alarm.
   *
   * Everything inside DEFEND_URGENT_M qualifies outright. Beyond that a
   * contact has to have *closed* — got at least CLOSED_M nearer than the
   * farthest this commander has seen it while watching — and to have been
   * watched for CONFIRM_S first, so a single noisy fix cannot start a recall.
   *
   * Measured against its farthest rather than its first position, because a
   * contact that drifts out and comes back in is approaching on the way back,
   * and a first-sight baseline would have already spent its budget.
   *
   * The watch list is pruned by age rather than by absence: a hull that goes
   * quiet for twenty seconds and reappears nearer is the exact thing this is
   * for, and forgetting it the moment it drops below threshold would hand it
   * a fresh baseline every time it ran silent.
   */
  private approachingHome(snapshot: EchoSnapshot): Contact[] {
    const out: Contact[] = [];

    for (const contact of snapshot.contacts) {
      const range = distance(contact, this.home);
      if (range >= RANGE.DEFEND_M) continue;

      if (range < RANGE.DEFEND_URGENT_M) {
        out.push(contact);
        continue;
      }

      const seen = this.homeWatch.get(contact.id);
      if (seen === undefined) {
        this.homeWatch.set(contact.id, {
          seenTick: snapshot.tick,
          lastTick: snapshot.tick,
          farthest: range,
        });
        continue;
      }
      seen.lastTick = snapshot.tick;
      seen.farthest = Math.max(seen.farthest, range);

      const watchedS = (snapshot.tick - seen.seenTick) / SIM.TICK_HZ;
      if (watchedS < DEFEND_WATCH.CONFIRM_S) continue;
      if (seen.farthest - range >= DEFEND_WATCH.CLOSED_M) out.push(contact);
    }

    for (const [handle, seen] of this.homeWatch) {
      if ((snapshot.tick - seen.lastTick) / SIM.TICK_HZ > DEFEND_WATCH.FORGET_S) {
        this.homeWatch.delete(handle);
      }
    }

    return out;
  }

  private setSilent(ids: number[], active: boolean, out: AiCommand[]): void {
    if (this.armySilent === active) return;
    this.armySilent = active;
    out.push({ kind: 'silent', unitIds: ids, active });
  }

  private rallyPoint(): { x: number; y: number } {
    const toward = this.enemyStarts[0] ?? {
      x: this.briefing.widthM / 2,
      y: this.briefing.heightM / 2,
    };
    const dx = toward.x - this.home.x;
    const dy = toward.y - this.home.y;
    const length = Math.hypot(dx, dy) || 1;
    return {
      x: this.home.x + (dx / length) * RANGE.RALLY_M,
      y: this.home.y + (dy / length) * RANGE.RALLY_M,
    };
  }

  // --- Active sonar ---------------------------------------------------------

  /**
   * Ping to find out *what* something is, never to find out whether it exists.
   *
   * The trigger is an unresolved contact — Tier 1 or 2 — near a force that has
   * actually deployed. That is the one situation where active sonar buys
   * something a hydrophone will not: the smudge is already known to be there,
   * and the question is whether it is a cruiser or a grazer.
   *
   * Two conditions guard it, and both were learned the same way — by measuring.
   * Pinging into empty water pays the whole cost, 2,400 m of self-reveal, for
   * nothing. And pinging from *home* pays it to identify the local wildlife,
   * which is worse: it tells the map exactly where the base is, in exchange for
   * the name of a creature that was never going to matter.
   */
  private commandSonar(snapshot: EchoSnapshot, army: readonly OwnUnit[], out: AiCommand[]): void {
    if (!this.tuning.pingsToClassify) return;
    if (snapshot.tick < this.nextPingTick) return;
    if (army.length === 0) return;

    const centre = centroid(army);
    // Not from the doorstep. A force still sitting on its own spawn has
    // nothing to gain from naming what is drifting past it.
    if (distance(centre, this.home) < RANGE.RALLY_M) return;
    const ambiguous = snapshot.contacts.find(
      (c) => c.tier <= ResolutionTier.Bearing && distance(centre, c) < RANGE.PING_CLASSIFY_M
    );
    if (ambiguous === undefined) return;

    // The nearest hull transmits: the ping resolves by hard radius from the
    // emitter, so the closest one buys the most for the same self-reveal.
    let emitter = army[0]!;
    for (const unit of army) {
      if (distance(unit, ambiguous) < distance(emitter, ambiguous)) emitter = unit;
    }
    this.nextPingTick = snapshot.tick + this.doctrine.pingIntervalS * SIM.TICK_HZ;
    out.push({ kind: 'ping', unitId: emitter.id });
  }
}

/** Biome.ThermalVein, as it appears in a serialised grid. */
const BIOME_THERMAL_VEIN = 1;

/**
 * How much a resolved contact is worth walking to.
 *
 * Tier is the tie-breaker, not the ranking: a Tier-4 corvette is a better
 * *picture* than a Tier-3 Bastion and a far worse *target*. Below Tier 3 no
 * contact has a kind at all, so everything unclassified sorts on tier alone —
 * which is the right answer, since at that point the commander genuinely does
 * not know what it is looking at.
 */
function priority(contact: Contact): number {
  if (contact.structure === StructureKind.Bastion) return 100;
  if (contact.structure !== undefined) return 50;
  return contact.tier;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * The doctrine's hulls it could actually pay for, cheapest first.
 *
 * Cheapest rather than "the most expensive it can afford", deliberately: a
 * commander that has been priced out of its first choice is having a bad
 * economy, and the answer to a bad economy is *something in the water now*,
 * not the grandest thing that happens to fit.
 */
function affordableFirst(composition: readonly UnitKind[], nodules: number): UnitKind[] {
  return [...new Set(composition)]
    .filter((kind) => statsFor(kind).cost <= nodules)
    .sort((a, b) => statsFor(a).cost - statsFor(b).cost);
}

/** Distance from the closest of these hulls to a point. */
function nearest(units: readonly OwnUnit[], point: { x: number; y: number }): number {
  let best = Number.POSITIVE_INFINITY;
  for (const unit of units) best = Math.min(best, distance(unit, point));
  return best;
}

function centroid(units: readonly OwnUnit[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const unit of units) {
    x += unit.x;
    y += unit.y;
  }
  return { x: x / units.length, y: y / units.length };
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
