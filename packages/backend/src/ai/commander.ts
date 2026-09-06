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
  CONSTRUCTION,
  DEPTH,
  DEPTH_BANDS,
  DepthBand,
  EchoMarkKind,
  HARVEST_THROTTLE,
  HULL_EFFECTS,
  ORDNANCE,
  OrdnanceKind,
  PRODUCIBLE,
  ResolutionTier,
  SIM,
  StructureKind,
  THERMOCLINE_DUCT_BOTTOM_M,
  UnitKind,
  effectivePressureRating,
  mineCapFor,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  affords,
  charge,
  priceOf,
  type Contact,
  type EchoMarkInfo,
  type EchoSnapshot,
  type OwnStructure,
  type OwnUnit,
  type ResourceNodeInfo,
  type Stockpile,
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
  /**
   * The leash while the army is committed to a push.
   *
   * The pursuit leash is the right rule for a force with nothing better to do
   * and the wrong one for a force that has decided where it is going: with the
   * Drift in the water there is nearly always *something* within 2,800 m, and
   * an unclassified smudge is a target by construction (see `bestThreat`), so
   * the branch that attacks whatever it can hear pre-empts the branch that
   * walks at a base. Measured over four four-seat matches at the default cap,
   * every commander reached the push branch between **zero and eight** times
   * in twenty-five minutes; the rest was chasing.
   *
   * On the way in, the army shoots what is in its way rather than what it can
   * hear. This is a gun's reach — the longest weapon in the roster is the
   * Cruiser's at 900 m — so anything inside it is a fight already happening
   * and anything outside it is a detour (#262).
   */
  PUSH_ENGAGE_M: 900,
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
 * When massing stops being massing.
 *
 * `doctrine.attackAtArmySize` is a rule about the opening: do not walk at a
 * base with three hulls. It was also, until now, the *only* gate on the push,
 * which made it a rule about the whole match — and after the first few fights
 * the arithmetic changes underneath it. Production and attrition cancel, the
 * force sits a hull or two under the threshold, and the commander waits at its
 * own rally point for the rest of the clock while its economy runs perfectly
 * well. Measured on seed 4002: from minute twelve to the cap, the Consortium's
 * every move order was to its own rally point, against a Directorate it was
 * trading with evenly (#262).
 *
 * Waiting is a position, not a pause — and a position that has stopped
 * improving is not one. So the gate opens on time as well as on size: if the
 * force has not got *bigger than it has ever been since the last push* for
 * STALL_S, then waiting is not massing, it is feeding, and the army it has is
 * the army it is going to get.
 *
 * The high-water mark is what is watched, not the current count. A force
 * oscillating 3-4-3-5 under a threshold of 7 "grows" constantly and is getting
 * nowhere; only a new peak is progress toward the gate.
 *
 * MIN_FRACTION keeps the impatient push from being a suicide: below half the
 * doctrine's number this is not an army going in, it is a hull being posted,
 * and the commander would rather rebuild. Both numbers are TUNABLE — the
 * balance harness is the argument about them.
 */
const MASSING = {
  /** Seconds the high-water mark may stand still before the army goes anyway. */
  STALL_S: 90,
  /** Fraction of the doctrine's massing size below which it waits regardless. */
  MIN_FRACTION: 0.5,
  /**
   * Seconds a push started without the numbers stays a push.
   *
   * Going has to outlast the reason for going, or it is not a decision. The
   * moment the army leaves, it is a force below its own threshold again — and
   * without this it would be sent back to the rally point on the very next
   * observation, walk home, stall, leave, and spend the match oscillating a
   * hundred metres either side of its rally point. Two minutes is a crossing
   * of the map at cruise speed, so the commitment lasts about as long as the
   * thing it is committing to.
   */
  COMMIT_S: 120,
} as const;

/**
 * Crossing a base off the list.
 *
 * With nothing remembered, the push target used to be `enemyStarts[0]` — one
 * fixed spawn, chosen in the constructor and never reconsidered. In a
 * four-seat match the commander holding a dead player's corner as its index 0
 * spends the rest of the match walking to empty water and back; seed 4000 has
 * the Directorate pushing at the Consortium's base eleven minutes after the
 * Consortium left the match (#262).
 *
 * The commander is not told who is dead — that is the game. What it is allowed
 * to notice is silence in a place that should not be silent: a base it has
 * stood on, with nothing resolved anywhere near it, is not where the enemy is.
 * So it crosses that start off and tries the next one, exactly as a player
 * does after walking into an empty corner.
 *
 * Forgettable, in both directions. Hearing anything near a crossed-off start
 * puts it straight back on the list, and when every start has been crossed off
 * the list is rebuilt whole — the commander has run out of places to look,
 * which is a reason to look again rather than to stand still.
 */
const SEARCH = {
  /** A contact this near a crossed-off start puts it back on the list. */
  REOPEN_M: 2200,
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
  /**
   * The most a lost bet may stretch the working spell to, in seconds.
   *
   * Each spell of quiet that runs to HIDE_MAX_S without the bearing going
   * away doubles the next WORK_MIN_S, up to this; a spell that works resets
   * it. Without the backoff a commander tracked for a whole match hid for 90
   * of every 135 seconds — 67% of the time, at 46% of its income — which is
   * what the duel batches read as the quiet navies starving against a loud
   * one (#454): the Directorate and the Commune throttled down for 69–72% of
   * every match and earned half of what the Knights did. A bet that has lost
   * three times running is not a bet any more, and the fourth spell should
   * cost the economy less than the first did.
   */
  WORK_MAX_S: 360,
} as const;

/** Longest a remembered enemy position stays worth walking to, in seconds. */
const MEMORY_S = 90;

/**
 * The wall, and the hull that grows it.
 *
 * docs/systems-combat.md §11 makes the Commune the mine navy and docs/units.md
 * calls the Spinner "the way to reach" its cap of 18. Both sentences described
 * a hull no commander had ever fielded (#467), because ordering one to stand
 * still on purpose is the one thing `commandArmy` has no word for: a Spinner
 * has no weapon, so it is not in the army at all.
 *
 * Where the wall goes is the interesting decision, and the answer is the rally
 * point — the water the commander has already named as the approach, the place
 * the force masses at and the line it comes back through. §6's counter-play is
 * that you cannot see a minefield but you can hear one being built; a grown
 * mine is the exception the doc makes, so the Commune is the one navy that can
 * lay this wall without announcing it. Laying it anywhere the commander had
 * not already decided mattered would be four mines spent on water.
 *
 * TUNABLE throughout. The balance harness is the argument about them.
 */
const MINE_WALL = {
  /**
   * Spinners the commander wants in the water.
   *
   * A gate rather than a cycle position, because an unarmed hull never enters
   * `army` and so never advances the composition index that chose it — left
   * ungated, a navy whose index landed on the Spinner would queue Spinners
   * until the yard backed up, and buy nothing that could hold the wall it had
   * just laid. Two: one laying while the other walks home to regrow.
   */
  SPINNERS: 2,
  /**
   * Metres between spots on the wall.
   *
   * Two trigger radii, so a hull crossing the line passes inside exactly one
   * mine's hearing rather than none or three. §6 makes a minefield kill "in
   * numbers or not at all", and overlapping the triggers would spend the
   * numbers on one passer-by.
   */
  SPACING_M: ORDNANCE.MINE.TRIGGER_RADIUS_M * 2,
  /** Spots across the approach, centred on the rally point. Odd, so one sits on it. */
  SPOTS: 5,
  /** How near a spot counts as standing on it. A mine is dropped, not aimed. */
  ARRIVE_M: 120,
  /**
   * How near the Bastion an empty Spinner has to get to start regrowing.
   *
   * Inside `HULL_EFFECTS.SPINNER.BASTION_RADIUS_M` with room to spare, because
   * the commander is aiming a hull at a point rather than at a radius and a
   * target on the rim is a hull that arrives just outside it.
   */
  NURSERY_M: HULL_EFFECTS.SPINNER.BASTION_RADIUS_M * 0.6,
  /**
   * Echo ticks between re-issuing a walk order to the same place.
   *
   * The scout's rule, for the scout's reason: a hull already under way does
   * not need telling again, and re-issuing every cadence tick would reset its
   * plan forever. A hull that has stopped short does need telling.
   */
  REISSUE_OBSERVATIONS: 25,
} as const;

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
  /**
   * Whether the layer had put a faction or a structure on it — something the
   * commander may cross the map for, as opposed to a smudge or a mark that
   * only says *something* was here.
   */
  classified: boolean;
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
  /** Largest the army has been while massing, and when that last rose. */
  private massingPeak = 0;
  private massingPeakTick = -1;
  /** While set, the army is committed to a push it started without the numbers. */
  private commitUntilTick = -1;
  /**
   * Enemy starts this commander has stood on and heard nothing at, by index
   * into `enemyStarts`. Crossed off until something is heard near one again.
   */
  private readonly clearedStarts = new Set<number>();
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
  /** Working seconds the next lost bet costs; doubles per loss, resets on a win. */
  private workMinS: number = EXPOSURE_WATCH.WORK_MIN_S;
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
  /**
   * What each Spinner is doing: the spot on the wall it is walking to, and the
   * earliest tick it may drop the next mine.
   *
   * The lay clock is local rather than read off the hull, because
   * `Match.layMine` refuses silently while the last mine is still arming and a
   * refusal teaches the commander nothing. `ORDNANCE.MINE.ARMING_S` is the
   * interval the server is enforcing, so the commander waits it out rather
   * than asking ten times and being told nothing ten times.
   */
  private readonly layerPlan = new Map<number, { spot: number; nextLayTick: number }>();
  /** Next spot on the wall to hand out, so two Spinners do not stack. */
  private nextMineSpot = 0;

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
    // All three accounts, because a price can be written in any of them and
    // the commander budgets with the server's own `affords` (economy.ts).
    const purse: Stockpile = {
      nodules: snapshot.nodules,
      crystal: snapshot.crystal,
      biomass: snapshot.biomass,
    };

    // Read once, and before anything acts on it: the defend watch is about the
    // Bastion rather than about the army, so it has to keep running through the
    // minutes a commander has no hulls left — and both the branch that recalls
    // the army and the branch that buys a turret are answering the same
    // question, so they must not answer it differently.
    const raiders = this.approachingHome(snapshot);

    this.commandEconomy(snapshot, harvesters, commands);
    this.commandConstruction(snapshot, harvesters, raiders, purse, commands);
    this.commandProduction(snapshot, harvesters, army, purse, commands);
    this.commandScout(snapshot, scout, commands);
    this.commandLayers(snapshot, commands);
    this.commandArmy(snapshot, army, raiders, commands);
    this.commandSonar(snapshot, army, raiders, commands);

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
      this.remembered = {
        x: best.x,
        y: best.y,
        tick: snapshot.tick,
        classified: best.structure !== undefined || best.faction !== undefined,
      };
      return;
    }

    const mark = this.freshestMark(snapshot.marks);
    if (mark !== null) {
      this.remembered = { x: mark.x, y: mark.y, tick: snapshot.tick, classified: false };
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
   * Anything classified as fauna is skipped, and so — since #440 — is
   * anything not yet classified at all. At Tier 1 there is no marker that
   * distinguishes a grazer from a cruiser; the earlier reading of §3 was that
   * the commander should therefore sometimes commit to a Draymaw, as a player
   * does, and the measurement said it committed to little else.
   *
   * A **Bastion outranks everything**, because losing one is losing the match,
   * and any structure outranks any hull: a hull is somewhere else in thirty
   * seconds and a building never is. That ordering only becomes available at
   * Tier 3 — classification is where a contact acquires a *kind* — so it is
   * information the commander earned rather than a preference it was handed.
   */
  private bestThreat(contacts: readonly Contact[], allowUnclassified = false): Contact | null {
    let best: Contact | null = null;
    for (const contact of contacts) {
      if (contact.fauna !== undefined) continue;
      // Classified or nothing (#440). An explicit attack order chases the
      // *entity* behind the handle, and on seed 4000 every commander spent
      // the match — 1,233 of one commander's 1,976 attack orders, 1,828 of
      // another's 2,181 — chasing Tier-1 smudges inside a gun's reach, which
      // with the Drift in the water are grazers. What is genuinely in range
      // is fought by the hulls themselves (attack-move, auto-acquire), and
      // what is ambiguous is what the ping is for; the commander's own order
      // is reserved for something the layer has told it is somebody's.
      // The one caller allowed past this is home defence, whose watch has
      // already confirmed the contact is *closing* on the Bastion — evidence
      // of intent a grazer rarely supplies, and the alarm is cheap.
      if (!allowUnclassified && contact.tier < ResolutionTier.Classification) continue;
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
   * Five rules, in the order they are allowed to fire (see EXPOSURE_WATCH for
   * why each one exists):
   *
   * 0. **A bet it can win.** Quiet is bought with the haulers' throttle, so it
   *    can only break a bearing the haulers are carrying. Its own SIG is its
   *    own information, and if anything it cannot throttle — a Refinery idles
   *    at 65, a Cruiser cruises at 65, a hull blowing ballast at 72 — is at
   *    least as loud as a hauler working at the resting throttle (45), the
   *    line is not one that Trickle can cut, and it keeps its income. This is
   *    the rule that stopped the quiet navies starving (#454): a Refinery is
   *    the commander's first build and stands beside the field its haulers
   *    work, so before this rule every bearing held on a working base was a
   *    bet the throttle had already lost, and the Commune and the Directorate
   *    paid 46% of an economy for 60–72% of every match to make it go away.
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

    // A bet it can win. The loudest thing the throttle does not govern,
    // against what a hauler sounds like when it is working: if the first is
    // the louder, throttling buys nothing but the loss. A spell already under
    // way keeps its clocks — it still ends when the bearing goes or HIDE_MAX_S
    // runs out — so a Cruiser passing through does not reopen the judgement
    // every five seconds; it only stops the paying while it is the loud one.
    const haulerSig = HARVEST_THROTTLE[this.doctrine.restingThrottle].sig;
    if (this.loudestUnthrottled(snapshot) >= haulerSig) return false;

    if (this.hidingSinceTick !== null) {
      // The quiet worked. Go and earn something before they find it again —
      // and the next bet is worth its full price again.
      if (heardSince === null) {
        this.hidingSinceTick = null;
        this.workMinS = EXPOSURE_WATCH.WORK_MIN_S;
        return false;
      }
      // The quiet did not work, and ninety seconds is long enough to know.
      // Each lost bet doubles the working spell before the next (WORK_MAX_S).
      if (seconds(this.hidingSinceTick) >= EXPOSURE_WATCH.HIDE_MAX_S) {
        this.hidingSinceTick = null;
        this.hideAgainTick = now + this.workMinS * SIM.TICK_HZ;
        this.workMinS = Math.min(EXPOSURE_WATCH.WORK_MAX_S, this.workMinS * 2);
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
   * The live SIG of the loudest thing the harvest throttle has no say over:
   * every structure, and every hull that is not a harvester. Own information
   * — the HUD prints the same numbers — so reading it reveals nothing.
   */
  private loudestUnthrottled(snapshot: EchoSnapshot): number {
    let loudest = 0;
    for (const structure of snapshot.structures) {
      if (structure.sig > loudest) loudest = structure.sig;
    }
    for (const unit of snapshot.units) {
      if (unit.kind !== UnitKind.Harvester && unit.sig > loudest) loudest = unit.sig;
    }
    return loudest;
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
    harvesters: readonly OwnUnit[],
    raiders: readonly Contact[],
    purse: Stockpile,
    out: AiCommand[]
  ): void {
    // Nothing gets built out of an economy that has stopped. With no harvester
    // in the water and none on a line, the bank is all the money there will
    // ever be, and the only thing worth spending it on is the hull that starts
    // the income again — which is the next branch, and which only gets its turn
    // if this one leaves the purse alone.
    //
    // Without it the commander livelocks, and that livelock decided the
    // four-faction baseline (#440). The construction branch runs before the
    // production branch and reserves the site's price out of the same purse, so
    // a build the server keeps refusing spends the whole bank on every
    // observation and hull production never sees a nodule. On seed 4000 the
    // Consortium lost its last harvester at minute seventeen holding 300
    // nodules and three standing structures, then asked for the same
    // unbuildable Vent Tap 1,400 times in seven minutes: never built it, never
    // queued the harvester that would have restarted the economy, and never
    // scuttled either, because `Match.checkConcessions` reads a bank that could
    // buy a harvester as a commander who still has a move. It had no move. Two
    // of the four commanders were dead by minute eight and the match still
    // timed out.
    const queuedHarvesters = snapshot.structures.reduce(
      (total, s) => total + s.queue.filter((q) => q === UnitKind.Harvester).length,
      0
    );
    if (harvesters.length === 0 && queuedHarvesters === 0) return;

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
    if (tight && !has(StructureKind.VentTap)) {
      const vent = this.nearestVent(snapshot.structures);
      if (vent !== null && this.afford(StructureKind.VentTap, purse)) {
        out.push({ kind: 'build', structure: StructureKind.VentTap, x: vent.x, y: vent.y });
        this.buildAttempt++;
        return;
      }
    }

    // A turret only once something has actually been *raiding*, which is a
    // narrower reading than "heard near home" and for the reason DEFEND_WATCH
    // gives at length: the Drift is seeded near spawns, an unclassified smudge
    // is a contact by construction, and so "something near home" is true nearly
    // all the time. Bought on that test, a turret is a hundred nodules aimed at
    // a grazer — and the branch was previously masked by the phantom Vent Tap
    // above it reserving the purse first, so it had never actually been paid
    // for. It buys on the same closing trend the army recalls on.
    if (raiders.length > 0 && !has(StructureKind.SentinelTurret)) {
      if (this.afford(StructureKind.SentinelTurret, purse)) {
        const toward = this.remembered ?? this.enemyStarts[0] ?? this.home;
        out.push({
          kind: 'build',
          structure: StructureKind.SentinelTurret,
          ...this.nearHome(toward),
        });
        this.buildAttempt++;
        return;
      }
    }

    // The rung (docs/units.md, the Slipway; #461): the second yard, last, and
    // only once the crystal is aboard. The commander's crystal arrives the way
    // a player's does — a harvester rated for the field — so a navy that never
    // reached the deep never builds one, which is the doc's point: the crystal
    // is a decision about what to field. Placed away from the enemy, like a
    // yard and unlike a turret.
    if (!has(StructureKind.Slipway) && this.afford(StructureKind.Slipway, purse)) {
      const away = this.enemyStarts[0] ?? this.home;
      const toward = { x: 2 * this.home.x - away.x, y: 2 * this.home.y - away.y };
      out.push({ kind: 'build', structure: StructureKind.Slipway, ...this.nearHome(toward) });
      this.buildAttempt++;
    }
  }

  private afford(kind: StructureKind, purse: Stockpile): boolean {
    const price = priceOf(structureStatsFor(kind));
    if (!affords(purse, price)) return false;
    charge(purse, price);
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

  /**
   * The nearest Thermal Vein cell to home that a tap could actually rise on.
   *
   * "Could actually rise on" is the part that was missing, and it is the one
   * placement in the whole branch the commander cannot nudge: a tap only works
   * on a vent (docs/economy.md §2), so unlike `nearHome` there is no spiral to
   * walk — the same cell comes back every time. Ask for one the server will
   * refuse and the commander asks forever.
   *
   * The server's rule is that a new site must rise within
   * `CONSTRUCTION.BUILD_RADIUS_M` of a structure the commander already owns,
   * so that is the rule applied here, against the same structures — not
   * against `this.home`, because a Refinery placed out toward a field is a
   * legitimate anchor and a player would chain off it. TAP_SEARCH_M stays as
   * the outer bound: a vent further away than that is not worth reaching for
   * even when something of ours happens to stand near it.
   */
  private nearestVent(structures: readonly OwnStructure[]): { x: number; y: number } | null {
    const { cols, rows, cellM, biomes } = this.briefing.terrain;
    let best: { x: number; y: number } | null = null;
    let bestDistance: number = RANGE.TAP_SEARCH_M;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (biomes[row * cols + col] !== BIOME_THERMAL_VEIN) continue;
        const x = (col + 0.5) * cellM;
        const y = (row + 0.5) * cellM;
        const d = distance({ x, y }, this.home);
        if (d >= bestDistance) continue;
        const anchored = structures.some(
          (s) => distance(s, { x, y }) <= CONSTRUCTION.BUILD_RADIUS_M
        );
        if (!anchored) continue;
        bestDistance = d;
        best = { x, y };
      }
    }
    return best;
  }

  // --- Production -----------------------------------------------------------

  private commandProduction(
    snapshot: EchoSnapshot,
    harvesters: readonly OwnUnit[],
    army: readonly OwnUnit[],
    purse: Stockpile,
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

    // Queued hulls that will actually join the army. The Spinner is subtracted
    // because it never will — it has no weapon — and counting a layer toward
    // the army's own target would stop the navy two Corvettes short of it.
    const queuedArmy = snapshot.structures.reduce(
      (total, s) =>
        total + s.queue.filter((q) => q !== UnitKind.Harvester && q !== UnitKind.Spinner).length,
      0
    );

    // The wall next, and **ahead of the army gate on purpose**.
    //
    // A Spinner is not an army hull, so `target` below is not counting it; but
    // a want that sat behind the army's would never be reached at all. The
    // Commune is broke exactly while its army is small — on seed 4000 it holds
    // ten nodules from minute one to minute four, which buys a 50-nodule
    // Light Scout and not a 150-nodule layer — and by the time it is rich its
    // army is at target and this branch has already returned. Measured with
    // the Spinner on the composition and nowhere else: fifteen minutes, 1,490
    // nodules idle from minute ten, and not one layer bought.
    //
    // The composition is still where the hull is declared (see `Doctrine`).
    // This is how a navy that declares it actually gets one.
    if (this.doctrine.composition.includes(UnitKind.Spinner)) {
      const layers =
        snapshot.units.reduce((n, u) => n + (u.kind === UnitKind.Spinner ? 1 : 0), 0) +
        queuedOf(UnitKind.Spinner);
      // Not before the escort. §6 makes a minefield "kill in numbers or not at
      // all", and a wall with nothing holding it is 150 nodules the opening
      // did not spend on the hulls that make the wall matter. Half the
      // doctrine's massing size is the same floor `stillMassing` uses for the
      // same judgement: below it, this is not a navy, it is a hull.
      const escorted =
        army.length + queuedArmy >=
        Math.ceil(this.doctrine.attackAtArmySize * MASSING.MIN_FRACTION);
      if (layers < MINE_WALL.SPINNERS && escorted) {
        const yard = this.freeYard(snapshot.structures, UnitKind.Spinner);
        if (yard !== null && this.affordUnit(UnitKind.Spinner, purse)) {
          out.push({ kind: 'produce', structureId: yard.id, unit: UnitKind.Spinner });
          return;
        }
      }
    }

    const target = Math.ceil(this.doctrine.attackAtArmySize * this.tuning.patience) + 2;
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
    //
    // "Second" is the doctrine's next entry before it is the cheapest one. The
    // rung's roster (#461) put a Slipway hull on every composition, and a
    // Slipway hull with no Slipway standing has no yard — so a cycle index
    // that lands on one must move on to the doctrine's *next* hull, not fall
    // straight through to whatever is cheapest, or the rung would quietly
    // reduce every navy to Corvettes for as long as it went unbuilt. The
    // cheapest-first list stays last, for the deadlock above.
    //
    // The Spinner is skipped here, having been bought above. It must be: the
    // cycle index is `army.length`, a hull with no weapon never joins the
    // army, so a navy whose index landed on the Spinner would select it again
    // on the next observation and the one after — buying layers until the yard
    // backed up and never buying the hulls that hold the wall.
    const { composition } = this.doctrine;
    const start = army.length % composition.length;
    const rotated = composition.map((_, k) => composition[(start + k) % composition.length]!);
    for (const wanted of [...rotated, ...affordableFirst(composition, purse)]) {
      if (wanted === UnitKind.Spinner) continue;
      const yard = this.freeYard(snapshot.structures, wanted);
      if (yard === null) continue;
      if (!this.affordUnit(wanted, purse)) continue;
      out.push({ kind: 'produce', structureId: yard.id, unit: wanted });
      return;
    }
  }

  private affordUnit(kind: UnitKind, purse: Stockpile): boolean {
    const price = priceOf(statsFor(kind));
    if (!affords(purse, price)) return false;
    charge(purse, price);
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

  // --- The wall -------------------------------------------------------------

  /**
   * The Spinners: build a wall on the approach, and go home when the magazine
   * is out.
   *
   * A branch of its own rather than a clause in `commandArmy`, because a
   * Spinner is not in the army — it has no weapon, so the army filter never
   * sees it — and because what it is asked to do is the opposite of what an
   * army is asked to do. An army is told where to go and shoots what it meets.
   * A layer is told where to *stand*, and the standing is the whole order.
   *
   * Three states, in the order they are allowed to fire:
   *
   * 1. **Empty.** Walk home. The magazine regrows one mine every 40 s inside a
   *    Spore Veil or within 300 m of a Bastion (docs/units.md), and the
   *    commander builds no Spore Veils, so home is the nursery. The clock only
   *    runs in range, so a Spinner that leaves mid-growth has lost nothing.
   * 2. **At the cap.** Hold. §6 caps live mines per player and the Commune's
   *    cap is the doctrine's own number; asking past it is a refusal the
   *    server does not explain, and a hull standing on a full wall is a hull
   *    that has finished its job rather than one that is idle.
   * 3. **Laying.** Walk to its spot and drop one, then take the next spot.
   *
   * Nothing here toggles Silent Running. The Spinner cruises at 14 SIG —
   * quieter than a Light Scout idling — and laying a grown mine keeps whatever
   * silence the hull was already running in (docs/units.md), so the toggle
   * buys this hull less than it buys anything else in the roster and costs it
   * the same speed.
   */
  private commandLayers(snapshot: EchoSnapshot, out: AiCommand[]): void {
    const layers = snapshot.units.filter((u) => u.kind === UnitKind.Spinner);
    if (layers.length === 0) {
      // Nothing to plan for, and a plan kept for a dead hull is a spot on the
      // wall nobody will ever walk to.
      if (this.layerPlan.size > 0) this.layerPlan.clear();
      return;
    }

    const alive = new Set(layers.map((u) => u.id));
    for (const id of [...this.layerPlan.keys()]) if (!alive.has(id)) this.layerPlan.delete(id);

    // Own ordnance, counted the way the server counts it: the cap is on live
    // mines, arming ones included, and every one of them is in this list
    // because it is the commander's own.
    const live = snapshot.ordnance.reduce(
      (total, o) => total + (o.kind === OrdnanceKind.Mine ? 1 : 0),
      0
    );
    const atCap = live >= mineCapFor(this.briefing.faction);
    const spots = this.mineWall();

    for (const layer of layers) {
      // A grown magazine is always reported for a hull that carries one, so an
      // absent count is a hull that does not lay — not an empty one.
      const mines = layer.mines ?? 0;

      if (mines <= 0) {
        this.layerPlan.delete(layer.id);
        if (distance(layer, this.home) > MINE_WALL.NURSERY_M) {
          this.walk(layer, this.home, snapshot.tick, out);
        }
        continue;
      }

      if (atCap) continue;

      let plan = this.layerPlan.get(layer.id);
      if (plan === undefined) {
        plan = { spot: this.nextMineSpot++ % spots.length, nextLayTick: 0 };
        this.layerPlan.set(layer.id, plan);
      }
      const spot = spots[plan.spot % spots.length]!;

      if (distance(layer, spot) > MINE_WALL.ARRIVE_M) {
        this.walk(layer, spot, snapshot.tick, out);
        continue;
      }
      if (snapshot.tick < plan.nextLayTick) continue;

      out.push({ kind: 'mine', unitId: layer.id });
      // The server holds the hull for the arming interval whatever the
      // commander asks, so the next drop is paced to that rather than to the
      // decision cadence — and the next drop is somewhere else, because four
      // mines on one spot is one mine with extra steps.
      plan.nextLayTick = snapshot.tick + ORDNANCE.MINE.ARMING_S * SIM.TICK_HZ;
      plan.spot = this.nextMineSpot++ % spots.length;
    }
  }

  /**
   * The wall: a line of spots across the approach, centred on the rally point.
   *
   * Across rather than along, because a minefield is a thing you walk *into*.
   * The rally point is on the line from home to the enemy start the commander
   * is working, so the perpendicular through it is the width of the approach —
   * and the same water the army masses in, which is the second half of §6's
   * argument: the wall covers the ground the force falls back through.
   *
   * Clamped to the map, so a rally point near an edge folds the wall against
   * it rather than putting half of it in water that does not exist.
   */
  private mineWall(): { x: number; y: number }[] {
    const rally = this.rallyPoint();
    const dx = rally.x - this.home.x;
    const dy = rally.y - this.home.y;
    const length = Math.hypot(dx, dy) || 1;
    // The normal to the approach, unit length.
    const nx = -dy / length;
    const ny = dx / length;

    const spots: { x: number; y: number }[] = [];
    const half = (MINE_WALL.SPOTS - 1) / 2;
    for (let i = 0; i < MINE_WALL.SPOTS; i++) {
      const offset = (i - half) * MINE_WALL.SPACING_M;
      spots.push({
        x: clamp(rally.x + nx * offset, 200, this.briefing.widthM - 200),
        y: clamp(rally.y + ny * offset, 200, this.briefing.heightM - 200),
      });
    }
    return spots;
  }

  /**
   * Send a lone hull somewhere, without telling it again every cadence tick.
   *
   * The scout's rule (`commandScout`) generalised, and paced off the same
   * clock: a move order re-issued at 5 Hz resets the hull's plan forever, and
   * a hull that has stopped short of where it was sent needs telling again.
   * Read off the tick rather than off the decision counter so the interval is
   * the same wall-clock five seconds at either difficulty — a Recruit's slower
   * cadence is meant to make its decisions worse, not its walking.
   */
  private walk(unit: OwnUnit, to: { x: number; y: number }, tick: number, out: AiCommand[]): void {
    const window = TICKS_PER_OBSERVATION * MINE_WALL.REISSUE_OBSERVATIONS;
    if (tick % window >= TICKS_PER_OBSERVATION) return;
    out.push({ kind: 'move', unitIds: [unit.id], x: to.x, y: to.y });
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
  private commandArmy(
    snapshot: EchoSnapshot,
    army: readonly OwnUnit[],
    raiders: readonly Contact[],
    out: AiCommand[]
  ): void {
    if (army.length === 0) return;
    const ids = army.map((u) => u.id);

    // Home first. A push that leaves the Bastion undefended trades the match
    // for a raid, and losing the Bastion is losing — but not everything near
    // the Bastion is a raid. See `approachingHome`.
    const athome = this.bestThreat(raiders, true);
    if (athome !== null) {
      this.setSilent(ids, false, out);
      this.setCrossed(army, false, out);
      out.push({ kind: 'attack', unitIds: ids, contactId: athome.id });
      return;
    }

    // What is inside a gun's reach is a fight already happening, massing or
    // not: the longest weapon in the roster is the Cruiser's at 900 m, so
    // anything inside PUSH_ENGAGE_M is shooting or about to be. Checked ahead
    // of the massing branch, which used to win — an army gathering at home
    // walked to its rally point past a contact four hundred metres off.
    const inReach = this.bestThreat(
      snapshot.contacts.filter((c) => nearest(army, c) < RANGE.PUSH_ENGAGE_M)
    );
    if (inReach !== null) {
      this.setSilent(ids, false, out);
      this.setCrossed(army, false, out);
      out.push({ kind: 'attack', unitIds: ids, contactId: inReach.id });
      return;
    }

    const threshold = Math.ceil(this.doctrine.attackAtArmySize * this.tuning.patience);
    if (this.stillMassing(snapshot.tick, army.length, threshold)) {
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

    // Where a push goes, and it is not wherever the last thing it heard was.
    //
    // `remembered` is refreshed from the best current contact on every
    // observation, so using it as the destination made a committed push a
    // chase by another name: the army walked at a smudge in the middle of the
    // map, arrived, found the smudge had moved, and walked at the next one —
    // for twenty-five minutes, in a four-seat match where the seat that needed
    // killing was in a corner nobody visited (#440). A commitment that does
    // not carry an objective is not a commitment.
    //
    // So a committed force walks at a *base*: `searchTarget` is the enemy
    // start it has not yet crossed off, which is the one place a Bastion is
    // certainly known to have been. An uncommitted force keeps the old
    // behaviour and follows the freshest lead it has, because a force with
    // nothing decided has nothing better to do than look.
    //
    // `searchTarget` crosses starts off as a side effect of being asked, so it
    // is asked exactly once here whichever way the answer is used.
    const committed = snapshot.tick < this.commitUntilTick;
    const start = this.searchTarget(snapshot, army);
    const objective =
      (committed ? (start ?? this.remembered) : (this.remembered ?? start)) ?? this.home;

    // An attack order chases and then holds to shoot, so this covers both
    // closing and firing. The leash is what stops one heard scout from towing
    // the whole army off the map — and a committed push has no leash beyond
    // the gun's reach handled above (PUSH_ENGAGE_M): on the way in, the army
    // shoots what is in its way rather than what it can hear.
    const engaging = committed
      ? null
      : this.bestThreat(snapshot.contacts.filter((c) => nearest(army, c) < RANGE.PURSUIT_M));
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
    //
    // Where to: something the layer has *classified* as an enemy's, if the
    // memory holds one — a structure, or a hull with a faction — ahead of the
    // objective above; a mark or a smudge in memory only ever comes after the
    // next uncrossed start (#440).
    const known = this.remembered !== null && this.remembered.classified ? this.remembered : null;
    const target = known ?? objective;
    this.setSilent(ids, this.doctrine.approachesSilently && this.tuning.usesSilentRunning, out);
    this.setCrossed(army, this.doctrine.crossesTheLayer, out);
    // An attack-move, not a move (#435): the army fights what it meets on the
    // way and then carries on, and it walks *into* the base rather than
    // parking a gun's reach short of it — a move order stopped re-issuing at
    // ARRIVE_M and left the force between 550 and 700 m from a Bastion with
    // nothing in range.
    if (nearest(army, target) > RANGE.ARRIVE_M) {
      out.push({ kind: 'attackMove', unitIds: ids, x: target.x, y: target.y });
    }
  }

  /**
   * Whether waiting is still getting the force closer to the gate.
   *
   * True while the army is still growing toward `attackAtArmySize` — a new
   * high-water mark restarts the clock. False once the mark has stood still
   * for MASSING.STALL_S, which is the state a match settles into once losses
   * and production cancel: the commander is not massing an army, it is
   * replacing one, and no amount of further waiting changes the number it will
   * have (#262).
   *
   * Below half the doctrine's number it keeps waiting whatever the clock says.
   * A stalled push is "go with what you have"; with two hulls that is not an
   * army going in, it is a hull being posted.
   *
   * **Reaching the number is a decision too**, and until #440 it was the only
   * way of leaving the rally point that did not come with one. The caller used
   * to ask this only while `size < threshold`, so a force that made its
   * doctrine's number skipped the gate entirely and never opened a commitment
   * — which meant it kept the 2,800 m pursuit leash, and with the Drift in the
   * water there is nearly always something inside 2,800 m for the engage
   * branch to prefer over a base (see RANGE.PUSH_ENGAGE_M). The impatient push
   * got the short leash and the strong one did not: the army that had every
   * reason to walk in was the one still chasing fish. Both ways of opening the
   * gate now commit, so "we are going" means the same thing however the force
   * got there.
   */
  private stillMassing(tick: number, size: number, threshold: number): boolean {
    // Already gone. A push is a decision, and a decision that is reconsidered
    // every 200 ms is a walk to the rally point with extra steps.
    if (this.commitUntilTick >= 0) {
      if (tick < this.commitUntilTick) return false;
      // It came back, or what is left of it did. Mass again, from here.
      this.commitUntilTick = -1;
      this.massingPeak = size;
      this.massingPeakTick = tick;
      return true;
    }

    if (this.massingPeakTick < 0) this.massingPeakTick = tick;

    // The doctrine's own number, met. Nothing left to wait for.
    //
    // Deliberately *after* the expiry above rather than before it, so that a
    // commitment which runs out puts the force through one massing observation
    // before the next one opens. That observation is the regroup, and it is
    // worth more than it looks: hulls come off the line at home while the army
    // is across the map, and without it they walk at the objective one at a
    // time and are killed one at a time. Going, arriving and going again in
    // company is the whole reason the gate has a size in it.
    if (size >= threshold) return this.commit(tick);

    // Not an army yet. Rebuilding from nothing gets the clock in full rather
    // than inheriting whatever was left running when the last force died.
    if (size < Math.ceil(threshold * MASSING.MIN_FRACTION)) {
      this.massingPeak = size;
      this.massingPeakTick = tick;
      return true;
    }

    if (size > this.massingPeak) {
      this.massingPeak = size;
      this.massingPeakTick = tick;
      return true;
    }

    if ((tick - this.massingPeakTick) / SIM.TICK_HZ < MASSING.STALL_S) return true;

    return this.commit(tick);
  }

  /** Open a commitment window, and stop massing. Always returns false. */
  private commit(tick: number): boolean {
    this.commitUntilTick = tick + MASSING.COMMIT_S * SIM.TICK_HZ;
    return false;
  }

  /**
   * Which enemy start to walk at when there is nothing to walk at.
   *
   * The fallback for a commander that has lost the thread: with nothing
   * remembered it goes and looks, and where it looks is the one thing it knows
   * about every opponent — the ground they started on.
   *
   * Standing on one of those with nothing resolved near it crosses it off. It
   * is the honest inference and the only one available: the commander is never
   * told a seat is empty, it notices that a place which should be making noise
   * is not. Anything heard near a crossed-off start puts it back on the list,
   * and running out of places to look rebuilds the list rather than stopping.
   */
  private searchTarget(
    snapshot: EchoSnapshot,
    army: readonly OwnUnit[]
  ): { x: number; y: number } | null {
    // Evidence of *somebody*: a contact the layer has put a faction or a
    // structure on. An unclassified smudge is not — a grazer wanders past a
    // dead base as readily as a live one, and letting one reopen a start put
    // the walk to the empty corner straight back on. The old test here was
    // `fauna === undefined`, which excludes only what is *classified* as
    // fauna and so admitted every smudge on the map (#440); and since the
    // starts are tried in index order, a reopened dead corner outranked the
    // live enemy behind it.
    const heardNear = (place: { x: number; y: number }): boolean =>
      snapshot.contacts.some(
        (c) =>
          (c.faction !== undefined || c.structure !== undefined) &&
          c.fauna === undefined &&
          distance(c, place) < SEARCH.REOPEN_M
      );

    for (let index = 0; index < this.enemyStarts.length; index++) {
      if (!this.clearedStarts.has(index)) continue;
      if (heardNear(this.enemyStarts[index]!)) this.clearedStarts.delete(index);
    }

    for (let index = 0; index < this.enemyStarts.length; index++) {
      const start = this.enemyStarts[index]!;
      if (this.clearedStarts.has(index)) continue;
      // Arrived, and nothing is here. A base is a Bastion that hums, a
      // refinery that hums louder and hulls coming and going; standing on all
      // of that and resolving none of it says this is not the one.
      if (nearest(army, start) <= RANGE.ARRIVE_M && !heardNear(start)) {
        this.clearedStarts.add(index);
        continue;
      }
      return start;
    }

    // Out of places to look. Start the search over rather than stand still.
    this.clearedStarts.clear();
    return this.enemyStarts[0] ?? null;
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
        // Nothing this close to a Bastion's own ears (HYD 60) stays
        // unclassified for long, so a smudge inside the ring is what a
        // grazer looks like on the doorstep, and it used to recall the whole
        // army from wherever it was (#440). A classified contact recalls it
        // at once; a smudge waits for the watch below like anything else.
        if (contact.tier >= ResolutionTier.Classification) {
          out.push(contact);
          continue;
        }
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
   *
   * The second of those has one exception, added by the same method that
   * produced it. A creature on the doorstep is not always one that was never
   * going to matter: the defend branch cannot tell it from a raid, so it recalls
   * the army for it, and a commander forbidden from naming it is a commander
   * that can be pinned at home by a grazer for the length of a match. The
   * exception is narrow on purpose — only the contacts the defend branch is
   * actually reacting to, never everything drifting past. See below.
   */
  private commandSonar(
    snapshot: EchoSnapshot,
    army: readonly OwnUnit[],
    raiders: readonly Contact[],
    out: AiCommand[]
  ): void {
    if (!this.tuning.pingsToClassify) return;
    if (snapshot.tick < this.nextPingTick) return;
    if (army.length === 0) return;

    const centre = centroid(army);
    // Not from the doorstep — **unless the doorstep is what is holding it
    // there**. A force sitting on its own spawn has nothing to gain from naming
    // what is drifting past it, which is why the rule was written; but the one
    // thing that keeps an army on its own spawn is the defend branch, and the
    // defend branch fires on contacts it cannot name. Fauna are drawn to noise
    // and a base is the noisiest thing a commander owns, so the doorstep is
    // exactly where unnameable contacts collect — and the commander was
    // forbidden from pinging precisely the contacts that were pinning it. On
    // seed 4000 the defend branch took between 20% and 40% of every decision
    // (#440). Naming one is how it learns it does not have to go home.
    //
    // Since the urgent ring recalls only for a *classified* contact (#440,
    // `approachingHome`), a smudge on the doorstep is the one thing there the
    // commander must name to act on at all — so it is pinged whether or not
    // the watch has made a raider of it yet.
    const atHome = distance(centre, this.home) < RANGE.RALLY_M;
    const ambiguous = snapshot.contacts.find(
      (c) =>
        c.tier <= ResolutionTier.Bearing &&
        distance(centre, c) < RANGE.PING_CLASSIFY_M &&
        (!atHome ||
          raiders.some((r) => r.id === c.id) ||
          distance(c, this.home) < RANGE.DEFEND_URGENT_M)
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
function affordableFirst(composition: readonly UnitKind[], purse: Stockpile): UnitKind[] {
  // Affordable in every account, ordered by the Nodule price — the bulk
  // account every hull is written in, so "cheapest" means the same thing for
  // a crystal-locked hull and a cohort's.
  return [...new Set(composition)]
    .filter((kind) => affords(purse, priceOf(statsFor(kind))))
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
