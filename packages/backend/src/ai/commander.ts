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
  EchoMarkKind,
  PRODUCIBLE,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
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
import { doctrineFor, tuningFor, type AiTuning, type Doctrine } from './doctrine.ts';
import type { AiBriefing, AiCommand, AiPlayer } from './types.ts';

/**
 * Ranges the commander reasons with, in metres. TUNABLE throughout — these are
 * a competent opening, not a solved one, and the balance harness exists to
 * argue with them.
 */
const RANGE = {
  /** A contact this close to the Bastion recalls the army, ready or not. */
  DEFEND_M: 2200,
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

/** Longest a remembered enemy position stays worth walking to, in seconds. */
const MEMORY_S = 90;

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
  /** Sim tick the next active sonar transmission is allowed on. */
  private nextPingTick = 0;
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
    // commander turns it. Exposure is a fact about itself, so acting on it
    // reveals nothing and costs nothing.
    const exposed = this.tuning.managesExposure && snapshot.exposure.tier >= ResolutionTier.Bearing;
    const want = exposed ? this.doctrine.exposedThrottle : this.doctrine.restingThrottle;
    const wrong = harvesters.filter((h) => h.throttle !== want).map((h) => h.id);
    if (wrong.length > 0) out.push({ kind: 'throttle', unitIds: wrong, throttle: want });
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
    const rating = statsFor(harvester.kind).pressureRating;
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
    const wanted = this.doctrine.composition[army.length % this.doctrine.composition.length]!;
    const yard = this.freeYard(snapshot.structures, wanted);
    if (yard !== null && this.affordUnit(wanted, purse)) {
      out.push({ kind: 'produce', structureId: yard.id, unit: wanted });
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
    // for a raid, and losing the Bastion is losing.
    const athome = this.bestThreat(
      snapshot.contacts.filter((c) => distance(c, this.home) < RANGE.DEFEND_M)
    );
    if (athome !== null) {
      this.setSilent(ids, false, out);
      out.push({ kind: 'attack', unitIds: ids, contactId: athome.id });
      return;
    }

    const threshold = Math.ceil(this.doctrine.attackAtArmySize * this.tuning.patience);
    if (army.length < threshold) {
      // Waiting is a position, not a pause: sit between home and the enemy so
      // the push does not start from the back of the map.
      const rally = this.rallyPoint();
      this.setSilent(ids, false, out);
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
      // there is something to shoot.
      this.setSilent(ids, false, out);
      out.push({ kind: 'attack', unitIds: ids, contactId: engaging.id });
      return;
    }

    const target = this.remembered ?? this.enemyStarts[0] ?? this.home;
    this.setSilent(ids, this.doctrine.approachesSilently && this.tuning.usesSilentRunning, out);
    if (nearest(army, target) > RANGE.ARRIVE_M) {
      out.push({ kind: 'move', unitIds: ids, x: target.x, y: target.y });
    }
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
   * The trigger is an unresolved contact — Tier 1 or 2 — near the force. That
   * is the one situation where active sonar buys something a hydrophone will
   * not: the smudge is already known to be there, and the question is whether
   * it is a cruiser or a grazer. Pinging into empty water would be paying the
   * whole cost (2,400 m of self-reveal) for nothing, which is the mistake this
   * condition exists to avoid.
   */
  private commandSonar(snapshot: EchoSnapshot, army: readonly OwnUnit[], out: AiCommand[]): void {
    if (!this.tuning.pingsToClassify) return;
    if (snapshot.tick < this.nextPingTick) return;
    if (army.length === 0) return;

    const centre = centroid(army);
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
