/**
 * The Attending 6, read and run — docs/mission-conclave-attending.md.
 *
 * `missions.test.ts` holds every mission to campaign.md §10's conventions; this
 * file holds Conclave to the things only its own document claims, and to the
 * four it claims that nothing but a running match can establish:
 *
 * - **The water changes under it** (§11, §13). Two `ground` beats at 11:00 take
 *   both gallery benches to floor 2,900 and Abyssal Trench, and the axis strip
 *   between them is named by neither and is still 3,400 m at the close. The
 *   first shipped mission to spend the repaint, so the assertion is made
 *   against the terrain the match is actually holding rather than against the
 *   beat that asked for it.
 * - **The line both arrivals run is the terrace's own floor** (§11, §13). At
 *   2,800 m a colossus crosses the Cantorate and reaches the head of the
 *   crossing; at the 3,000 m the plan carried and §13 rejects it stalls against
 *   the terrace's northern face at y 3,250 and never arrives — and it stalls
 *   *silently*, because `Terrain.resolveStep` retries a blocked step on the x
 *   axis first and a due-north line has no x to retry. Both are driven here,
 *   because the difference between a mission and a colossus parked at a wall is
 *   two hundred metres of authored depth.
 * - **The dome is taken down by arithmetic rather than by a beat** (§9, §13).
 *   The line is 75 m off it, the reach is a body's 37.5 plus the Cantor's 80,
 *   and 1,327 damage crosses 1,200 hit points a second and a half before the
 *   First Cantor names it. Run, so that moving either coordinate is understood
 *   to move the fall.
 * - **The calling runs its length** (§9, §13). Both terminal rows are met the
 *   moment `the-calling` is revealed over a column already standing in the
 *   axis, and the mission still closes at 20:00 — which is 19:00, Ossary's last
 *   line, and the ending.
 *
 * And one thing the document claims that the engine does not do, asserted here
 * as measured rather than as authored: §4 says the cells "can be entered only
 * by a hull that has crossed more than three quarters of that water", and the
 * dome is not a hull. It is an ear on the player's own slot with HYD 80,
 * standing 527 and 631 m from the second and third rows, and it enters both of
 * them on the first pass with nothing having moved. The literal transcribes §8's
 * count of three anyway — the document owns the number — and this file pins what
 * that count actually costs, so the day either the count or the dome's seat
 * moves, the reason is in a test rather than in a playthrough.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  DRIFT,
  Faction,
  FaunaSpecies,
  FaunaStage,
  MISSION,
  MissionOutcome,
  ObjectiveStatus,
  PROPAGATION_FACTOR,
  SILENT_RUNNING,
  SIM,
  STRUCTURE_AURAS,
  StructureKind,
  TIER_THRESHOLD_MULTIPLIER,
  UnitKind,
  detectionRatio,
  faunaStatsFor,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Fauna, Position } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { UPPER_TERRACES, mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { ATTENDING_CONCLAVE } from '../src/sim/missions/index.ts';
import { spawnFauna } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;
const PLAYER = ATTENDING_CONCLAVE.playerSlot;

const CHORISTER = statsFor(UnitKind.Chorister);
const SUBMERSIBLE = statsFor(UnitKind.AbyssalSubmersible);
const CANTOR = structureStatsFor(StructureKind.Cantor);
const SOUNDER = faunaStatsFor(FaunaSpecies.Sounder);
const TRENCH_PF = PROPAGATION_FACTOR[Biome.AbyssalTrench];
const RUINS_PF = PROPAGATION_FACTOR[Biome.CoralRuins];

/** §11 — the axis, where the column is counted, and the marker's own point. */
const AXIS = { x: 2500, y: 3625 };
/** §3, §11 — the dome, and the line the first arrival runs 75 m to the east of it. */
const DOME = { x: 1950, y: 3400, depthM: 2900 };
/** §9 — the first arrival's line, and §13's rejected one. */
const SILL = { x: 2025, y: 3875 };
/** §11 — the Cantorate terrace's northern face: where a line too deep stops. */
const TERRACE_FACE_Y = 3250;

const player = ATTENDING_CONCLAVE.parties.find((party) => party.slot === PLAYER)!;
const cells = ATTENDING_CONCLAVE.parties.find((party) => party.slot !== PLAYER)!;
const byId = (id: string) => ATTENDING_CONCLAVE.objectives.find((o) => o.id === id)!;

/** Where in the 3–8 band a hull sits while silent — `acoustics.ts`' own line. */
function silentSig(idleSig: number): number {
  const t = Math.min(1, Math.max(0, idleSig / 60));
  return SILENT_RUNNING.SIG_MIN + (SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN) * t;
}

/** The range at which SIG through water of `pf` reaches HYD at a tier's multiple. */
function rangeAt(sig: number, hyd: number, multiple: number, pf = TRENCH_PF): number {
  let low = 1;
  let high = 40000;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (detectionRatio(sig, pf, mid, hyd) >= multiple) low = mid;
    else high = mid;
  }
  return Math.round(low);
}

interface Run {
  outcome: MissionOutcome;
  epilogue: string;
  resolvedAtTick: number;
  lines: { tick: number; speaker: string; text: string }[];
  objectives: { id: string; status: ObjectiveStatus }[];
  counters: Map<string, { done: number; of: number }>;
  /** The tick the player's own snapshot stopped carrying the dome. */
  domeLostAtTick: number | null;
  match: Match;
}

/**
 * Run the calling out, letting `drive` give orders on the Echo ticks it wants —
 * the cadence the player's own snapshot arrives at, so the test plays a game
 * somebody can play.
 */
function runOut(drive?: (own: EchoSnapshot, match: Match) => void): Run {
  const map = missionMapById(ATTENDING_CONCLAVE.mapId)!;
  const match = new Match(map, { mission: ATTENDING_CONCLAVE, fauna: false, seed: 6 });
  const lines: Run['lines'] = [];
  const counters = new Map<string, { done: number; of: number }>();
  let domeLostAtTick: number | null = null;
  for (let tick = 0; tick <= T(20, 30); tick++) {
    const snapshots = match.update(STEP_MS);
    const own = snapshots?.get(PLAYER);
    if (own !== undefined) {
      drive?.(own, match);
      if (domeLostAtTick === null && own.structures.length === 0) domeLostAtTick = match.world.tick;
    }
    const view = match.takeMissionView();
    for (const objective of view?.objectives ?? []) {
      if (objective.progress !== undefined) counters.set(objective.id, objective.progress);
    }
    for (const line of match.takeMissionLines()) lines.push(line);
    if (match.missionOver !== null) break;
  }
  const over = match.missionOver;
  assert.ok(over !== null, 'the calling never closed');
  return {
    outcome: over.outcome,
    epilogue: over.epilogue,
    resolvedAtTick: match.world.tick,
    lines,
    objectives: over.objectives,
    counters,
    domeLostAtTick,
    match,
  };
}

let passive: Run | null = null;
/**
 * The calling played the way the Cantorate plays it: nobody is ordered
 * anywhere and nothing is toggled, so what this run reads is what the mission
 * does on its own. Memoised because two suites below ask the same twenty
 * minutes two different questions, and a second identical match would buy
 * nothing but three seconds.
 */
function passiveRun(): Run {
  passive ??= runOut();
  return passive;
}

/**
 * A colossus driven north up the axis at an authored depth, held the way
 * `holdCommitments` holds one, and reported on after `seconds`.
 *
 * The mission's own beat with the runtime taken out of it, so the two lines
 * §13 compares can be compared without authoring the rejected one.
 */
function driveNorth(depthM: number, seconds: number): { y: number; depthM: number } {
  const map = missionMapById(ATTENDING_CONCLAVE.mapId)!;
  const match = new Match(map, { fauna: false, seed: 4, terrain: terrainFor(map) });
  const eid = spawnFauna(match.world, {
    species: FaunaSpecies.Sounder,
    x: SILL.x,
    y: SILL.y,
    depth: depthM,
  });
  const hold = (): void => {
    Fauna.homeX[eid] = SILL.x;
    Fauna.homeY[eid] = 2000;
    Fauna.homeDepth[eid] = depthM;
    Fauna.targetEid[eid] = 0;
    Fauna.stage[eid] = FaunaStage.Committed;
    // Deaf and unkillable for the length of the drive, as the runtime pins it.
    Fauna.senseS[eid] = 1e9;
    Fauna.driven[eid] = 1;
    Fauna.quietS[eid] = 0;
    Fauna.coolingS[eid] = DRIFT.COOLING_S;
  };
  hold();
  for (let tick = 0; tick < seconds * SIM.TICK_HZ; tick++) {
    match.update(STEP_MS);
    if (tick % ECHO_TICK_INTERVAL === 0) hold();
  }
  return { y: Position.y[eid]!, depthM: Position.depth[eid]! };
}

describe('The Upper Terraces, as docs/mission-conclave-attending.md §11 paints it', () => {
  it('transcribes §11 row for row, on the cell grid, in the table order', () => {
    // Painting order is load-bearing (`terrainFor` writes later regions over
    // earlier ones): the head first, and the axis last, which is what makes
    // the galleries two benches for the ground beats to name.
    assert.deepEqual(
      UPPER_TERRACES.regions.map((region) => [
        region.x,
        region.y,
        region.widthM,
        region.heightM,
        region.biome,
        region.floorM,
      ]),
      [
        [0, 0, 5000, 4000, Biome.AbyssalTrench, 3400],
        [1000, 0, 3000, 750, Biome.CoralRuins, 2750],
        [1000, 750, 3000, 1750, Biome.AbyssalTrench, 3400],
        [1000, 2500, 3000, 750, Biome.CoralRuins, 2800],
        [1250, 3250, 2500, 500, Biome.CoralRuins, 3000],
        [2000, 3250, 1000, 750, Biome.AbyssalTrench, 3400],
      ]
    );
    for (const region of UPPER_TERRACES.regions) {
      for (const metres of [region.x, region.y, region.widthM, region.heightM]) {
        assert.equal(metres % UPPER_TERRACES.cellM, 0, `${region.note}: off the 250 m cell grid`);
      }
    }
    assert.equal(UPPER_TERRACES.floorM, 3400, '§11: base floor 3,400');
    assert.deepEqual(
      UPPER_TERRACES.spawns.map((spawn) => [spawn.x, spawn.y]),
      [[2500, 375]],
      '§11: one spawn, on the Undermarshalcy'
    );
    assert.deepEqual(UPPER_TERRACES.resources, [], '§11: no resources');
    assert.deepEqual(UPPER_TERRACES.hazards, [], '§11: no hazard sites');
    assert.equal(ATTENDING_CONCLAVE.fauna, false, '§11: both colossi are authored');
  });

  it('makes the crossing carry and the terraces not, which is the whole mission', () => {
    // §1: the terraces are cut structure at 0.80 and the water between them is
    // trench at 1.60, so during a conclave a cohort under way is the only sound
    // there is — and the map is 4,000 m from the Undermarshalcy's back wall to
    // the sill against 4,515 m of contact on a cruising Chorister.
    assert.equal(RUINS_PF, 0.8, '§1: cut structure');
    assert.equal(TRENCH_PF, 1.6, '§1: the crossing');
    assert.equal(
      rangeAt(CHORISTER.sigCruise, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      4515
    );
    assert.equal(
      rangeAt(CHORISTER.sigCruise, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.BEARING),
      3504
    );
    assert.ok(
      4515 > UPPER_TERRACES.heightM,
      '§1: there is no station on this chart from which a crossing is inaudible'
    );
    // §7: a colossus calling at 100 is heard at more than twice the map's width
    // by both hulls, which is why neither arrival needs a beat to announce it.
    assert.equal(
      rangeAt(SOUNDER.sigActive, CHORISTER.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      10187
    );
    assert.equal(
      rangeAt(SOUNDER.sigActive, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      11016
    );
  });

  it('admits the terrace floor exactly, which is what lets a colossus cross it', () => {
    // §11, §13: 2,800 m is the deepest line that gets from the sill to the
    // crossing, and it gets there because `admits` is inclusive of the floor.
    // One metre deeper is a wall.
    const terrain = terrainFor(UPPER_TERRACES);
    assert.equal(terrain.floorAt(SILL.x, 3000), 2800, '§11: the Cantorate spans the chart');
    assert.equal(terrain.admits(SILL.x, 3000, 2800), true, 'the line the document authors');
    assert.equal(terrain.admits(SILL.x, 3000, 2801), false, 'and one metre under it');
    assert.equal(terrain.floorAt(AXIS.x, AXIS.y), 3400, "§11: the Ninth's channel");
  });

  it('is a mission map and is not in the public catalogue', () => {
    assert.equal(UPPER_TERRACES.seats, 1, '§11: one seat, not balanced');
    assert.equal(mapById('upper-terraces'), undefined, 'the skirmish screen would offer it');
    assert.equal(missionMapById('upper-terraces'), UPPER_TERRACES, 'resolved by mission id only');
  });
});

describe('the called, as docs/mission-conclave-attending.md §2 and §3 seat them', () => {
  const choristers = player.units.filter((unit) => unit.kind === UnitKind.Chorister);
  const standing = player.units.filter((unit) => unit.kind === UnitKind.AbyssalSubmersible);

  it('is twelve and four, one role, all sixteen armed, and one lent dome', () => {
    assert.equal(player.units.length, 16, '§2: sixteen hulls');
    assert.equal(choristers.length, 12, '§2: twelve of them the cheapest bodies the faction owns');
    assert.equal(standing.length, 4, '§2: and the heavy half');
    for (const unit of player.units) {
      assert.equal(unit.role, 'called', '§2: all sixteen carry one role');
      assert.equal(unit.armed, true, '§2: weapons and torpedoes are live');
      assert.equal(unit.depthM, 2700, '§3: seated at 2,700 m over a floor of 2,750');
    }
    assert.equal(player.structures?.length, 1, '§3: the dome, and nothing else');
    assert.equal(player.emitters, undefined, '§5: the cells are not the player’s');
  });

  it('refits the cheap hull to the band it is seated in and leaves the roster alone', () => {
    // §3, §11: "the literal test reads `statsFor(kind).pressureRating` and not
    // the Directorate's baseline", so the refit is authored per hull. The
    // Chorister everybody else fields is still PR-2.
    assert.equal(CHORISTER.pressureRating, 2, '§2: PR-2 on the roster');
    for (const unit of choristers) assert.equal(unit.pressureRating, 3, '§3: refit to 3');
    assert.equal(SUBMERSIBLE.pressureRating, 3, '§2: PR-3 on the roster');
    for (const unit of standing) {
      assert.equal(unit.pressureRating, undefined, '§3: needing no refit');
    }
  });

  it('seats the cohort row and the standing cohort where §3 puts them', () => {
    assert.deepEqual(
      choristers.map((unit) => [unit.x, unit.y]),
      [1500, 1700, 1900, 2100, 2300, 2500, 2700, 2900, 3100, 3300, 3500, 3700].map((x) => [x, 375])
    );
    assert.deepEqual(
      standing.map((unit) => [unit.x, unit.y]),
      [1800, 2266, 2732, 3198].map((x) => [x, 525])
    );
  });

  it('stands the dome where the galleries stand, and out of reach of the called', () => {
    const dome = player.structures![0]!;
    assert.equal(dome.tag, ATTENDING_CONCLAVE.arrayTag, '§3: the array is the dome');
    assert.equal(dome.kind, StructureKind.Cantor);
    assert.deepEqual([dome.x, dome.y, dome.depthM], [DOME.x, DOME.y, DOME.depthM]);
    // §3: the aura is a 1,200 m disc measured horizontally, so the called —
    // seated 2,875 and 3,025 m off — get nothing at all, and the instrument is
    // worth something only to a hull that has already crossed.
    const nearest = Math.min(
      ...player.units.map((unit) => Math.hypot(unit.x - DOME.x, unit.y - DOME.y))
    );
    assert.ok(nearest > STRUCTURE_AURAS.CANTOR.RADIUS_M, '§3: nothing seated is inside the disc');
    assert.equal(Math.round(nearest), 2879, '§3: the standing cohort, 2,875 m up the chart');
    assert.equal(STRUCTURE_AURAS.CANTOR.RADIUS_M, 1200);
    // §3's arithmetic read the other way: +25 on a Chorister's 75 buys sixteen
    // per cent of range and on a Submersible's 85 it buys seven, because the
    // bonus runs into its own cap.
    const capped = (hyd: number): number =>
      Math.min(hyd + STRUCTURE_AURAS.CANTOR.HYD_BONUS, STRUCTURE_AURAS.CANTOR.HYD_CAP);
    const gain = (hyd: number): number =>
      rangeAt(3, capped(hyd), TIER_THRESHOLD_MULTIPLIER.CONTACT) /
        rangeAt(3, hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT) -
      1;
    assert.equal(
      Math.round(gain(CHORISTER.hyd) * 100),
      16,
      '§3: sixteen per cent to the cheap hull'
    );
    assert.equal(Math.round(gain(SUBMERSIBLE.hyd) * 100), 7, '§3: seven to the expensive one');
  });

  it('withholds the ping, the yard and everything left in the water', () => {
    const locked = new Set(ATTENDING_CONCLAVE.locks.map((lock) => lock.ability));
    assert.ok(locked.has('activeSonar'), '§2: aboard, live, and not used');
    assert.ok(locked.has('construction'), '§2: nothing is built during a calling');
    assert.ok(locked.has('mines'), '§2: nothing is left in the water the cohorts sleep over');
    assert.ok(locked.has('depthCharges'), '§2: the same reason, said once');
    assert.ok(!locked.has('weapons'), '§2: weapons are live');
    assert.ok(!locked.has('torpedoes'), '§2: and torpedoes with them');
    assert.ok(!locked.has('noisemakers'), '§2: the noisemaker is priced, not locked');
    for (const lock of ATTENDING_CONCLAVE.locks) {
      assert.ok(lock.reason.trim().length > 0, `${lock.ability} is refused without a reason`);
    }
    // §2: a ping would reach the thing in the trench at ninety-five times three
    // for the emission and four tenths for the faction — nobody says so, and
    // the lock's reason is the older one, but the number is why §2 mentions it.
    const ping = 95 * 3 * DRIFT.DIRECTORATE_AGGRO_MULTIPLIER;
    assert.equal(ping, 114, '§2: an effective 114');
    assert.equal(rangeAt(ping, SOUNDER.hyd, SOUNDER.interest), 1012, '§2: Interest inside 1,012 m');
    assert.equal(rangeAt(ping, SOUNDER.hyd, SOUNDER.commit), 834, '§2: and Commit inside 834');
  });
});

describe('the order, as docs/mission-conclave-attending.md §4 and §6 price it', () => {
  it('makes the budget and the silence order the same number, for the second time in the bible', () => {
    // §4, §9: twenty-five, and the same figure as the galleries' own order.
    // Sorrowgate is the only mission before this one where the two agree, and
    // §4 says the coincidence is the design rather than a tuning accident.
    assert.equal(ATTENDING_CONCLAVE.sigBudget, 25);
    assert.equal(ATTENDING_CONCLAVE.silenceCeilingSig, 25);
    assert.equal(ATTENDING_CONCLAVE.sigBudget, ATTENDING_CONCLAVE.silenceCeilingSig);
    assert.equal(ATTENDING_CONCLAVE.silenceRole, 'called', '§4: the ledger measures the roster');
    assert.equal(ATTENDING_CONCLAVE.debtCapS, 45, '§5: unchanged from Attendance');
    assert.equal(ATTENDING_CONCLAVE.arrayTag, 'dome', '§5: the dome is what is withdrawn');
    assert.equal(ATTENDING_CONCLAVE.escortRadiusM, 0, 'no held freight');
  });

  it('sorts the roster into twelve that can cross and four that cannot, by SIG alone', () => {
    // §4, §6: the whole mission, as four numbers against one ceiling.
    const ceiling = ATTENDING_CONCLAVE.silenceCeilingSig;
    assert.equal(CHORISTER.sigCruise, 24, '§6: under, by one');
    assert.ok(CHORISTER.sigCruise < ceiling);
    assert.equal(SUBMERSIBLE.sigCruise, 28, '§6: three over');
    assert.ok(SUBMERSIBLE.sigCruise > ceiling);
    assert.equal(CHORISTER.sigCruise + CHORISTER.sigFiringBurst, 39, '§4: firing puts it at 39');
    assert.equal(SUBMERSIBLE.sigCruise + SUBMERSIBLE.sigFiringBurst, 48, '§4: and the heavy at 48');
    assert.equal(SILENT_RUNNING.BREAK_SILENCE_SIG_SPIKE, 40, '§4: forty for two seconds on top');
    // §2, §4: a silent hull is far under, and the band is scaled by idle SIG.
    assert.equal(Number(silentSig(CHORISTER.sigIdle).toFixed(1)), 4.3);
    assert.equal(Number(silentSig(SUBMERSIBLE.sigIdle).toFixed(1)), 4.8);
  });

  it('prices the crossing in seconds, and the bite in metres', () => {
    // §4, §6: 1,750 m of the loudest water in the bible, four ways.
    const crossing = UPPER_TERRACES.regions[2]!;
    assert.equal(crossing.heightM, 1750, '§11: the crossing, y 750 to y 2,500');
    const seconds = (speed: number): number => Math.round(crossing.heightM! / speed);
    assert.equal(seconds(CHORISTER.speed), 44, '§4: forty-four seconds at cruise');
    assert.equal(
      seconds(CHORISTER.speed * SILENT_RUNNING.SPEED_MULTIPLIER),
      80,
      '§4: eighty silent'
    );
    assert.equal(seconds(SUBMERSIBLE.speed), 29, '§4: twenty-nine for a Submersible');
    assert.equal(
      seconds(SUBMERSIBLE.speed * SILENT_RUNNING.SPEED_MULTIPLIER),
      53,
      '§4: fifty-three'
    );
    // §4, §6: the half that can cross is the half a colossus cannot bite.
    assert.equal(CHORISTER.hullLengthM, 50);
    assert.ok(
      CHORISTER.hullLengthM < DRIFT.TRANSIT_MIN_HULL_M,
      '§4: forty-five short of the grind'
    );
    assert.equal(SUBMERSIBLE.hullLengthM, DRIFT.TRANSIT_MIN_HULL_M, '§6: ninety-five exactly');
    // §6: 520 HP against 220 a second inside 85 m of the line — 2.4 s of a
    // 5.7-second pass.
    const reach = SOUNDER.lengthM / 2 + SUBMERSIBLE.hullLengthM / 2;
    assert.equal(reach, 85);
    assert.equal(Number((SUBMERSIBLE.maxHp / SOUNDER.damagePerS).toFixed(1)), 2.4);
    assert.equal(Number(((2 * reach) / SOUNDER.speed).toFixed(1)), 5.7);
  });

  it('leaves a firing Chorister beneath the colossus’ notice, and twelve of them lethal', () => {
    // §6: at its own full reach a Chorister firing reads 27.5 against an
    // Interest of 55 and does not register at all — so the half that can cross
    // is also the half that can render the thing in the crossing.
    const heard = detectionRatio(
      (CHORISTER.sigCruise + CHORISTER.sigFiringBurst) * DRIFT.DIRECTORATE_AGGRO_MULTIPLIER,
      TRENCH_PF,
      CHORISTER.attackRangeM,
      SOUNDER.hyd
    );
    assert.equal(Number(heard.toFixed(1)), 27.5);
    assert.ok(heard < SOUNDER.interest, '§6: it does not register at all');
    // Damage a second, not damage a shell: the cohort's cycle is 1.5 s, so
    // dividing by `attackDamage` alone silently assumed a one-second gun and
    // read the same until #463 stretched every cycle by half.
    const cohortDps = (hulls: number) =>
      (hulls * CHORISTER.attackDamage) / CHORISTER.attackCooldownS;
    assert.equal(SOUNDER.maxHp / cohortDps(12), 56.25, '§6: twelve, in 56.25 seconds');
    assert.equal(
      Number((SOUNDER.maxHp / cohortDps(8)).toFixed(2)),
      84.38,
      '§6: and eight in eighty-four'
    );
    // §6: what it does grow interested in is the half that cannot cross.
    assert.equal(
      rangeAt(
        SUBMERSIBLE.sigCruise * DRIFT.DIRECTORATE_AGGRO_MULTIPLIER,
        SOUNDER.hyd,
        SOUNDER.interest
      ),
      237
    );
    assert.equal(
      rangeAt(
        SUBMERSIBLE.sigIdle * DRIFT.DIRECTORATE_AGGRO_MULTIPLIER,
        SOUNDER.hyd,
        SOUNDER.interest
      ),
      204
    );
  });

  it('wears the terrace’s two Drift cells at the rate §11 prices, and never pays for it', () => {
    // §11's arithmetic, from the roster: seated silent the two cells sum 31 and
    // 40 against a threshold of 60 and wear nothing; sitting idle-loud they sum
    // 124 and 156, and both are dead inside seventy seconds. Nothing on this
    // map pays Biomass, so what a loud terrace kills is owed to nobody — but a
    // reader is entitled to check it.
    const cellWidth = UPPER_TERRACES.widthM / DRIFT.HEALTH_REGIONS;
    assert.equal(cellWidth, 1250);
    assert.equal(UPPER_TERRACES.heightM / DRIFT.HEALTH_REGIONS, 1000);
    const sums = (sig: (unit: (typeof player.units)[number]) => number): number[] => {
      const totals = [0, 0];
      for (const unit of player.units) {
        totals[Math.floor(unit.x / cellWidth) - 1] =
          (totals[Math.floor(unit.x / cellWidth) - 1] ?? 0) + sig(unit);
      }
      return totals.map((total) => Math.round(total));
    };
    assert.deepEqual(
      sums((unit) => silentSig(statsFor(unit.kind).sigIdle)),
      [31, 40]
    );
    assert.deepEqual(
      sums((unit) => statsFor(unit.kind).sigIdle),
      [124, 156]
    );
    const wear = (sum: number): number =>
      (sum - DRIFT.HEALTH_SIG_THRESHOLD) * DRIFT.HEALTH_SIG_DRAIN_PER_S;
    assert.equal(wear(124), 1.28);
    assert.equal(Number(wear(156).toFixed(2)), 1.92);
    assert.equal(Math.round(DRIFT.HEALTH_START / wear(124)), 69);
    assert.equal(Math.round(DRIFT.HEALTH_START / wear(156)), 46);
    assert.ok(
      sums((unit) => silentSig(statsFor(unit.kind).sigIdle)).every(
        (sum) => sum < DRIFT.HEALTH_SIG_THRESHOLD
      )
    );
  });
});

describe('the cells, as docs/mission-conclave-attending.md §5 authors them', () => {
  const emitters = cells.emitters ?? [];

  it('is six sounds and no hulls, on a slot the called can hear', () => {
    // §5: a friendly scripted party carrying hulls is auto-acquired by the
    // player's own guns, so the half of the army the player does not have is a
    // sound in a room. And it is not on the player's own slot, which is the one
    // slot that could never hear it.
    assert.equal(cells.units.length, 0, '§5: no hulls');
    assert.equal(cells.faction, Faction.Directorate, '§5: called, and not assigned');
    assert.notEqual(cells.slot, PLAYER);
    assert.notEqual(cells.slot, ATTENDING_CONCLAVE.courtSlot, '§2: the court stays empty');
    // §2, in as many words: "the called on slot 0, the cells on slot 2 … and
    // nothing on slot 1, which is the court's".
    assert.deepEqual(
      [ATTENDING_CONCLAVE.playerSlot, ATTENDING_CONCLAVE.courtSlot, cells.slot],
      [0, 1, 2]
    );
    assert.equal(ATTENDING_CONCLAVE.parties.length, 2, '§2: two parties in the water');
    assert.equal(emitters.length, 6, '§5: six rows');
    assert.deepEqual(
      emitters.map((emitter) => [emitter.x, emitter.y, emitter.depthM]),
      [1500, 1900, 2300, 2700, 3100, 3500].map((x) => [x, 2875, 2800])
    );
    for (const emitter of emitters) {
      assert.equal(emitter.sig, 3, '§4, §5: the return’s own figure, spent on breathing');
      assert.equal(emitter.periodTicks, 20 * SIM.TICK_HZ, '§5: period 20 s');
      assert.equal(emitter.onTicks, emitter.periodTicks, '§5: sustained — on for all of it');
      assert.equal(emitter.hp, 5000, '§5, §13: an ordered shot at a resolved contact does land');
      assert.equal(emitter.fromTick, undefined, 'sounding from the first tick to the last');
      assert.equal(emitter.untilTick, undefined);
    }
  });

  it('gives every row its own two sentences, so the count is a count', () => {
    // §5: six emitters sharing one string would append the same pair up to six
    // times and read as one row heard three times. The ordinal is what makes
    // three rows three rows.
    const entered = emitters.map((emitter) => emitter.reading!.entered);
    const gaps = emitters.map((emitter) => emitter.reading!.gap);
    assert.equal(new Set(entered).size, 6, '§5: six distinguishable entered lines');
    assert.equal(new Set(gaps).size, 6, '§5: and six gap lines');
    for (const [index, ordinal] of [
      'first',
      'second',
      'third',
      'fourth',
      'fifth',
      'sixth',
    ].entries()) {
      assert.equal(
        entered[index],
        `Entered: the ${ordinal} row of the second cohort, in its cells. Called; not assigned; breathing.`,
        '§5, verbatim'
      );
      assert.equal(
        gaps[index],
        `Not entered: the ${ordinal} row. The record notes that the First Cantor was present.`,
        '§5, verbatim — the Cantorate’s sentence riding on every row that did not answer'
      );
    }
  });

  it('is inaudible from anywhere the column starts, and read only from across the water', () => {
    // §4, exactly: through the real paths — the terrace's 0.80 and the
    // crossing's 1.60 — a Chorister holds one cell at Bearing only from
    // y ≥ 2,200, and from the north terrace's own edge the ratio is 0.33.
    const terrain = terrainFor(UPPER_TERRACES);
    const ratioFrom = (y: number, hyd: number): number =>
      detectionRatio(3, terrain.pathPropagation(1950, 2875, 1950, y), 2875 - y, hyd);
    assert.equal(Number(ratioFrom(2200, CHORISTER.hyd).toFixed(2)), 1.54, '§4: 675 m off');
    assert.ok(ratioFrom(2200, CHORISTER.hyd) >= TIER_THRESHOLD_MULTIPLIER.BEARING);
    assert.ok(ratioFrom(2325, CHORISTER.hyd) >= TIER_THRESHOLD_MULTIPLIER.BEARING);
    assert.ok(ratioFrom(2100, SUBMERSIBLE.hyd) >= TIER_THRESHOLD_MULTIPLIER.BEARING, '§4: y 2,100');
    assert.ok(ratioFrom(2100, CHORISTER.hyd) < TIER_THRESHOLD_MULTIPLIER.BEARING);
    assert.equal(
      Number(ratioFrom(750, CHORISTER.hyd).toFixed(2)),
      0.33,
      '§4: 2,125 m out, nothing'
    );
    // §4: what the dome's +25 buys on that one line is the third row at y 2,200
    // instead of at y 2,325 — and the disc reaches the crossing only that far.
    assert.equal(DOME.y - STRUCTURE_AURAS.CANTOR.RADIUS_M, 2200, '§3: 300 m north of the terrace');
    assert.ok(ratioFrom(2200, STRUCTURE_AURAS.CANTOR.HYD_CAP) > ratioFrom(2200, CHORISTER.hyd));
  });

  it('is entered twice over by the dome before anybody moves — §4’s one wrong sentence', () => {
    // A finding against the document rather than against the engine, and the
    // reason it is here rather than in the literal: §4 argues that the cells
    // "can be entered only by a hull that has crossed more than three quarters
    // of that water", and `attend` counts what the observer's *slot* resolved.
    // The dome is on that slot. It is an ear with HYD 80 standing 527 and 631 m
    // from the second and third rows through cut structure, so two of the six
    // are entered on the first pass with nothing having moved, and the count of
    // three costs one row rather than three.
    //
    // The literal transcribes §8's three anyway — the document owns the number
    // — and this pins what it actually asks for, so the day the count or the
    // dome's seat moves, the reason is here rather than in a playthrough.
    const terrain = terrainFor(UPPER_TERRACES);
    const heardByDome = (emitter: { x: number; y: number }): number => {
      const range = Math.hypot(emitter.x - DOME.x, emitter.y - DOME.y);
      return detectionRatio(
        3,
        terrain.pathPropagation(emitter.x, emitter.y, DOME.x, DOME.y),
        range,
        CANTOR.hyd
      );
    };
    const bearing = emitters.filter(
      (emitter) => heardByDome(emitter) >= TIER_THRESHOLD_MULTIPLIER.BEARING
    );
    assert.deepEqual(
      bearing.map((emitter) => emitter.tag),
      ['cell-two', 'cell-three'],
      'the second and third rows, from a structure that cannot cross anything'
    );
    assert.equal(CANTOR.hyd, 80, 'the dome hears, and §4 reasons only about hulls');

    // And measured rather than modelled, because the arithmetic above is only
    // the reason: played out with nobody ordered anywhere, the tally is two of
    // three from the first mission pass, and §9's condition-fired line — "the
    // first moment a hull has gone far enough to hear who did not answer" —
    // lands on that same pass, with no hull having gone anywhere.
    const run = passiveRun();
    assert.deepEqual(
      run.counters.get('the-cells'),
      { done: 2, of: 3 },
      '§4: two of the six rows are entered by the lent instrument, not by a crossing'
    );
    const entered = run.lines.find((line) =>
      line.text.startsWith('Entered: the cells, breathing')
    )!;
    assert.equal(
      entered.tick,
      ECHO_TICK_INTERVAL,
      '§9: the conditional fires on the first pass, not on the first crossing'
    );
    // The count is still not met from the terrace, which is what keeps §8's
    // three an objective rather than a formality: the third row costs a hull.
    assert.equal(
      run.objectives.find((objective) => objective.id === 'the-cells')?.status,
      ObjectiveStatus.Pending,
      '§8: three rows are not entered by standing still'
    );
  });
});

describe('the arrivals, as docs/mission-conclave-attending.md §9 drives them', () => {
  const arrivals = ATTENDING_CONCLAVE.beats.filter((beat) => beat.kind === 'creature');
  const call = ATTENDING_CONCLAVE.beats.find(
    (beat) => beat.kind === 'say' && beat.atTick === T(9, 40) && beat.speaker === 'The stalls'
  )!;
  const resolve = ATTENDING_CONCLAVE.beats.find((beat) => beat.kind === 'resolve')!;

  it('arrives twice, at 10:40 and 16:00, and the sill calls the first sixty seconds out', () => {
    assert.equal(arrivals.length, 2, '§5: two Sounders, and no second navy');
    assert.deepEqual(
      arrivals.map((beat) => beat.atTick),
      [T(10, 40), T(16)]
    );
    for (const beat of arrivals) {
      if (beat.kind !== 'creature') continue;
      assert.equal(beat.species, FaunaSpecies.Sounder);
      assert.equal(beat.loud, true, '§9: the loudest sound in the bible');
      assert.equal(beat.spawnAt?.y, SILL.y, '§9: the same sill, twice');
      assert.equal(beat.spawnAt?.depthM, 2800, '§11: spawned at the terrace’s own floor');
      assert.equal(
        beat.driveTo.depthM,
        2800,
        '§13: driven at 2,800 rather than at the species’ own'
      );
      assert.equal(beat.driveTo.x, beat.spawnAt?.x, '§9: due north, up the axis');
      assert.ok(beat.driveTo.y < beat.spawnAt!.y);
    }
    // §9's two lines, to the metre. The first is what puts the dome 75 m off
    // the transit and therefore what brings it down, and the second is what
    // stops the column's door being blocked by something standing in it — so
    // these four coordinates are the mission and not decoration.
    assert.deepEqual(
      arrivals.map((beat) =>
        beat.kind === 'creature'
          ? [
              beat.spawnAt!.x,
              beat.spawnAt!.y,
              beat.spawnAt!.depthM,
              beat.driveTo.x,
              beat.driveTo.y,
              beat.driveTo.depthM,
            ]
          : []
      ),
      [
        [2025, 3875, 2800, 2025, 2000, 2800],
        [2500, 3875, 2800, 2500, 2250, 2800],
      ],
      "§9: the sill's western side to the head of the crossing, and its middle to the southern edge"
    );
    assert.match(
      call.kind === 'say' ? call.text : '',
      /It is not the return\./,
      '§12: named by what it is not'
    );
    assert.equal(
      (arrivals[0]!.atTick - call.atTick) / SIM.TICK_HZ,
      MISSION.FAILURE_TELEGRAPH_S,
      '§8: the rite’s own sixty seconds, spent on something that is not the return'
    );
    // §9: the telegraph is 240 seconds — the second arrival against the close,
    // four times §10's sixty, and the close is a conclusion besides.
    assert.equal((resolve.atTick - arrivals[1]!.atTick) / SIM.TICK_HZ, 240);
    assert.equal(resolve.kind === 'resolve' ? resolve.conclusion : undefined, true);
    // §9, §12: the second gets no line, from anybody.
    assert.equal(
      ATTENDING_CONCLAVE.beats.filter((beat) => beat.kind === 'say' && beat.atTick === T(16))
        .length,
      0
    );
  });

  it('spawns both a hundred metres below the band the bestiary gives the species', () => {
    // §11, §13: a finding, authored on purpose. The band is a species stat and
    // not a placement rule, and the document pays for the liberty by never
    // explaining either arrival.
    assert.equal(SOUNDER.workingDepthM, 2000);
    assert.equal(SOUNDER.workingDepthM + SOUNDER.depthBandM, 2700, 'bestiary.md §4’s floor');
    for (const beat of arrivals) {
      if (beat.kind !== 'creature') continue;
      assert.equal(beat.spawnAt!.depthM - (SOUNDER.workingDepthM + SOUNDER.depthBandM), 100);
    }
    // §6: and when the commitment lapses the runtime hands back the species'
    // own working depth, so each arrival rises eight hundred metres out of the
    // cohorts' band and comes back down only to 2,700 — the seat, to the metre.
    assert.equal(2800 - SOUNDER.workingDepthM, 800);
    assert.equal(DRIFT.VERTICAL_SPEED_MPS, 12, '§6: at 12 m/s');
    assert.equal(SOUNDER.workingDepthM + SOUNDER.depthBandM, player.units[0]!.depthM);
  });

  it('crosses the Cantorate at 2,800 and stalls against it at the 3,000 §13 rejects', () => {
    // §13's row, run rather than reasoned about: `faunaSystem` moves every
    // creature through `Terrain.resolveStep`, and a step into water the mover's
    // depth does not fit is not taken. Both lines run due north, so there is no
    // x component for the slide to use and a refused step is a stall rather
    // than a detour — which is why the two hundred metres between these two
    // numbers is the difference between a transit and a colossus at a wall.
    const crossed = driveNorth(2800, 40);
    assert.equal(crossed.y, SILL.y - 40 * SOUNDER.speed, '§9: full speed, the whole way');
    assert.ok(crossed.y < TERRACE_FACE_Y, 'and through the terrace');
    const stalled = driveNorth(3000, 40);
    assert.equal(stalled.y, TERRACE_FACE_Y, '§13: stopped against the terrace’s northern face');
    assert.equal(stalled.depthM, 3000, 'and never lifted, because ground does not lift a creature');
  });

  it('reaches the head of the crossing at 11:41.2 and the southern edge at 16:52.8', () => {
    // §9's two no-beat rows, which are facts about arithmetic rather than about
    // the schedule: 30 m/s from the sill, stopping 40 m short of the point the
    // beat named (`pursue`'s own hold). **§9 rounds both up by about a second**
    // — it writes 11:42 and 16:54 — so the assertions below are the arithmetic
    // and the title is the arithmetic, not the table. Nothing downstream turns
    // on the difference: §8's dependent sentence, that the second holds before
    // Korrin closes the calling, is true by 7.2 s rather than by six.
    const first = arrivals[0]!;
    const second = arrivals[1]!;
    assert.ok(first.kind === 'creature' && second.kind === 'creature', 'both are transits');
    const seconds = (beat: typeof first): number =>
      beat.kind === 'creature'
        ? (Math.abs(beat.spawnAt!.y - beat.driveTo.y) - 40) / SOUNDER.speed
        : NaN;
    const arrivesAtS = (beat: typeof first): number =>
      Number((beat.atTick / SIM.TICK_HZ + seconds(beat)).toFixed(1));
    assert.equal(arrivesAtS(first), T(11, 41.2) / SIM.TICK_HZ, '11:41.2, which §9 writes 11:42');
    assert.equal(arrivesAtS(second), T(16, 52.8) / SIM.TICK_HZ, '16:52.8, which §9 writes 16:54');
    // §9, §8: both hold before they are needed — the first for its commitment's
    // last eighteen seconds, the second six before Korrin closes the calling —
    // seven, in fact, which is the same rounding read forward.
    assert.equal(first.untilTick, T(12), '§9: the commitment lapses at 12:00');
    assert.equal(second.untilTick, T(18), '§9: and the second’s at 18:00, where it stands');
    assert.equal(
      Number((T(17) / SIM.TICK_HZ - arrivesAtS(second)).toFixed(1)),
      7.2,
      '§8: it is standing in the crossing before Korrin closes the calling'
    );
  });
});

describe('the water changes under it — §11 and §13, the repaint’s first spend', () => {
  it('names the two benches and never the strip between them', () => {
    const ground = ATTENDING_CONCLAVE.beats.filter((beat) => beat.kind === 'ground');
    assert.equal(ground.length, 2, '§11: one beat per bench, at one tick');
    for (const beat of ground) {
      if (beat.kind !== 'ground') continue;
      assert.equal(beat.atTick, T(11), '§9: 11:00');
      assert.equal(beat.floorM, 2900, '§11: a hundred metres of rubble');
      assert.equal(beat.biome, Biome.AbyssalTrench, '§11: 0.80 becomes 1.60');
      assert.equal(beat.ceilingM, undefined, 'nothing is roofed');
      assert.equal(beat.pressureBonus, undefined, 'and nothing is rated: this is not a furrow');
    }
    assert.deepEqual(
      ground.map((beat) => (beat.kind === 'ground' ? beat.region : '')),
      ['galleries-west', 'galleries-east']
    );
    assert.ok(
      ATTENDING_CONCLAVE.regions.every((region) => region.pressureBonus === undefined),
      '§11: no manufactured habitable water on this chart'
    );
    // §11: the benches are drawn either side of the axis strip, and the strip
    // is the door the column leaves by.
    const west = ATTENDING_CONCLAVE.regions.find((region) => region.id === 'galleries-west')!;
    const east = ATTENDING_CONCLAVE.regions.find((region) => region.id === 'galleries-east')!;
    const axis = ATTENDING_CONCLAVE.regions.find((region) => region.id === 'the-axis')!;
    assert.equal(west.x + west.widthM, axis.x, 'the strip starts where the western bench ends');
    assert.equal(axis.x + axis.widthM, east.x, 'and ends where the eastern one begins');
  });

  it('brings the dome down at about 10:58, and repaints both benches at 11:00', () => {
    // The two halves of §9's middle, run: the fall is geometry — a 181 m chord
    // at 30 m/s and 220 a second against 1,200 hit points — and the ground is a
    // beat. The dome is gone before the beat lands, which is why §11 says the
    // repaint "finds the bench with nothing on it but rubble to raise".
    const offset = Math.abs(SILL.x - DOME.x);
    const reach = SOUNDER.lengthM / 2 + CANTOR.radiusM;
    assert.equal(offset, 75, '§9: the line runs 75 m off the dome');
    assert.equal(reach, 117.5, '§13: a body’s 37.5 plus the target’s radius');
    assert.ok(Math.abs(DOME.depthM - 2800) < reach, '§11: and the reach is vertical too');
    const chord = 2 * Math.sqrt(reach * reach - offset * offset);
    assert.equal(Math.round(chord), 181, '§13: a 181 m chord');
    assert.equal(Number((chord / SOUNDER.speed).toFixed(1)), 6.0, '§13: six seconds at 30 m/s');
    assert.equal(CANTOR.maxHp, 1200, '§13: what a Cantor has to lose');
    assert.equal(
      Math.round((chord / SOUNDER.speed) * SOUNDER.damagePerS),
      1327,
      '§13: 1,327 against 1,200 — the margin is 127, and moving the line spends it'
    );
    assert.ok((chord / SOUNDER.speed) * SOUNDER.damagePerS > CANTOR.maxHp);

    const run = passiveRun();
    assert.ok(run.domeLostAtTick !== null, 'the dome survived the transit');
    const lostAtS = run.domeLostAtTick! / SIM.TICK_HZ;
    assert.ok(
      lostAtS > T(10, 50) / SIM.TICK_HZ && lostAtS < T(11) / SIM.TICK_HZ,
      `dome at ${lostAtS}s`
    );
    assert.ok(
      T(11) / SIM.TICK_HZ - lostAtS < 2,
      '§9: as close as authored geometry and an authored beat can be made to stand'
    );
    // §11, and the row campaign.md §10 has been carrying: the benches are
    // trench now and the strip between them is not.
    const terrain = run.match.world.terrain;
    assert.equal(terrain.floorAt(1500, 3400), 2900, 'the western bench');
    assert.equal(terrain.floorAt(3400, 3400), 2900, 'the eastern bench');
    assert.equal(terrain.floorAt(AXIS.x, 3400), 3400, '§11: the strip keeps its floor');
    // The grid stores propagation as float32, so the comparison is to a
    // tolerance rather than to the constant: what is being asserted is that the
    // benches are trench water now, not that a Float32Array can hold 1.6.
    assert.ok(
      Math.abs(terrain.propagationAt(1500, 3400) - TRENCH_PF) < 1e-6,
      '§11: the shadows go'
    );
    assert.ok(Math.abs(terrain.propagationAt(3400, 3400) - TRENCH_PF) < 1e-6);
    assert.ok(
      Math.abs(terrain.propagationAt(AXIS.x, 3400) - TRENCH_PF) < 1e-6,
      'the strip always was'
    );
    // And the calling runs its length: seated and silent, the muster is met
    // from tick zero and the mission still closes on the resolve beat.
    assert.equal(run.resolvedAtTick, T(20), '§9: the cycle ends at 20:00');
    assert.equal(run.outcome, MissionOutcome.Partial, '§8: the muster, and no column');
  });
});

describe('the objective, as docs/mission-conclave-attending.md §8 counts it', () => {
  it('counts the column and the muster, and reads the cells and the crossing out', () => {
    assert.deepEqual(
      ATTENDING_CONCLAVE.objectives.map((objective) => objective.id),
      ['the-calling', 'the-muster', 'the-cells', 'the-crossing'],
      '§8’s table order, which is also the order the close reads the readings in'
    );
    // §8's own text column. Shown verbatim and never templated
    // (docs/campaign.md §10), so the sentence the player reads is the
    // document's and an edit to either has to move both.
    assert.deepEqual(
      ATTENDING_CONCLAVE.objectives.map((objective) => objective.text),
      [
        'The calling closes at the cycle. What is assigned descends. Eight of sixteen is a column, and the Undermarshalcy does not round up.',
        'Twelve of sixteen. The Undermarshalcy does not round up.',
        'The calling is put. Who attends it is entered, and who does not.',
        'The stalls are under the terraces. A hull under way between them is the only sound there is.',
      ],
      '§8, verbatim'
    );
    const terminal = ATTENDING_CONCLAVE.objectives.filter(
      (objective) => objective.terminal === true
    );
    assert.deepEqual(
      terminal.map((objective) => objective.id),
      ['the-calling', 'the-muster'],
      '§8: two terminal rows and no keystone'
    );
    for (const objective of terminal) {
      assert.notEqual(objective.keystone, true, '§8: a short column and a whole muster read alike');
      assert.equal(
        objective.reading,
        undefined,
        '§8: Korrin’s three Results are the whole reading'
      );
    }
    assert.deepEqual(byId('the-calling').predicate, {
      kind: 'extract',
      role: 'called',
      region: 'the-axis',
      count: 8,
    });
    assert.deepEqual(byId('the-muster').predicate, { kind: 'survive', role: 'called', count: 12 });
    assert.deepEqual(byId('the-cells').predicate, { kind: 'attend', count: 3 });
    assert.deepEqual(byId('the-crossing').predicate, {
      kind: 'quiet',
      role: 'called',
      ceilingSig: 25,
    });
    for (const id of ['the-cells', 'the-crossing']) {
      assert.notEqual(byId(id).terminal, true, '§8: read out, never ranked');
      assert.ok(byId(id).reading !== undefined, '§8: and both pairs are authored');
    }
    // §8's two bullets, verbatim — the four sentences the close appends under
    // whichever of Korrin's three Results the count earned.
    assert.deepEqual(byId('the-cells').reading, {
      met: 'Entered: the second cohort, in its cells, three rows or more, breathing. Not assigned. The First Cantor was present.',
      unmet:
        'Not entered: the cells. The calling was put and the north terrace did not go far enough across to hear who did not answer it.',
    });
    assert.deepEqual(byId('the-crossing').reading, {
      met: 'The crossing was made under the order.',
      unmet: 'The crossing was heard the length of the trench, and the debt is written.',
    });
    assert.equal(
      byId('the-crossing').debtText,
      'The called owe the stalls a silence.',
      '§8, §12 — it replaces the objective’s own line while the debt stands'
    );
    assert.equal(byId('the-cells').debtText, undefined, 'one rule reads twice; the others do not');
  });

  it('reveals the calling on Korrin’s own beat and points at the axis with it', () => {
    // §8, §9: an `extract` is not standing, so it latches Met the first pass it
    // is true — and a column that stood in the axis at 05:00 and left would
    // otherwise have met a calling that had not yet closed. Revealing it with
    // the beat that closes the calling makes the count what the count is.
    const calling = byId('the-calling');
    assert.equal(calling.revealAtTick, T(17), '§9: Korrin closes the calling at 17:00');
    assert.equal(calling.markerId, 'axis');
    const beat = ATTENDING_CONCLAVE.beats.find((candidate) => candidate.atTick === T(17))!;
    assert.equal(beat.kind, 'say');
    assert.match(beat.kind === 'say' ? beat.text : '', /Eight of sixteen is a column\./, '§12');
    assert.equal(ATTENDING_CONCLAVE.markers.length, 1, '§8: no keystone, and one marker');
    assert.deepEqual(
      [
        ATTENDING_CONCLAVE.markers[0]!.x,
        ATTENDING_CONCLAVE.markers[0]!.y,
        ATTENDING_CONCLAVE.markers[0]!.radiusM,
      ],
      [AXIS.x, AXIS.y, 500],
      '§8: the marker `axis` at 2500, 3625, radius 500'
    );
    for (const id of ['the-muster', 'the-cells', 'the-crossing']) {
      assert.equal(
        byId(id).revealAtTick,
        undefined,
        '§8: the other three stand from the first tick'
      );
      assert.equal(byId(id).markerId, undefined, '§8: and carry no marker');
    }
  });

  it('says the cells’ line on the first row entered, and asks for three', () => {
    // §9's one conditional beat, fired by the tally rather than by the clock.
    const conditionals = ATTENDING_CONCLAVE.conditionalBeats ?? [];
    assert.equal(conditionals.length, 1, '§9: one condition-fired line');
    assert.deepEqual(conditionals[0]!.when, { kind: 'attend', count: 1 });
    assert.equal(conditionals[0]!.kind, 'say');
    assert.equal(conditionals[0]!.choiceGroup, undefined, 'nothing retires it');
  });

  it('runs its length over a column that is already standing in the axis', () => {
    // §9, §13, and the row this mission spends for the second time in the
    // campaign: `the-muster` is met from tick zero — sixteen being at least
    // twelve — so the moment `the-calling` is revealed at 17:00 over a column
    // in the axis, both terminal rows are met on one pass and the court's
    // default rule would resolve there, costing 19:00 and Ossary at 20:00.
    assert.equal(ATTENDING_CONCLAVE.runsItsLength, true);
    let sent = false;
    const run = runOut((own, match) => {
      if (sent || match.world.tick < T(1)) return;
      for (const unit of own.units) {
        match.setSilentRunning(PLAYER, unit.id, false);
        match.orderMove(PLAYER, unit.id, AXIS.x + (unit.id % 5) * 50 - 100, AXIS.y, false);
      }
      sent = true;
    });
    assert.equal(run.resolvedAtTick, T(20), '§9: the calling closes when the cycle closes');
    assert.equal(run.counters.get('the-calling')?.done, 8, '§8: eight of sixteen is a column');
    assert.equal(run.outcome, MissionOutcome.Complete);
    assert.deepEqual(
      run.objectives
        .filter((objective) => objective.status === ObjectiveStatus.Met)
        .map((o) => o.id),
      ['the-calling', 'the-muster', 'the-cells', 'the-crossing']
    );
    // §8's second named row: `quiet` is standing and reads the water at the
    // tick it is asked, so a column that shoved on the way across and is quiet
    // at the close reads met. What carries the history is the debt, and the
    // document would rather it were not fixed.
    assert.equal(
      run.objectives.find((objective) => objective.id === 'the-crossing')?.status,
      ObjectiveStatus.Met,
      '§8: a breach that happened is not a predicate this union has'
    );
    // §8: Ossary's last line is not part of the epilogue string — it is the
    // `say` beat at 20:00, one beat before the resolve on the same tick.
    const last = run.lines[run.lines.length - 1]!;
    assert.equal(last.tick, T(20));
    assert.equal(last.speaker, 'First Cantor Vehl Ossary');
    assert.match(last.text, /^Nothing\. The record notes that the First Cantor was present\.$/);
    // Searched on the whole line and not on its second sentence, which every
    // gap reading carries too: a substring the cells already print would pass
    // this whether Ossary's line were in the count or not.
    assert.ok(!run.epilogue.includes(last.text), '§8: it is in the log, not in the count');
    // §8's stated order for the close: Korrin's Result, then `the-cells`'
    // reading, then `the-crossing`'s, then the six cells' own lines beneath —
    // `objectiveReadings` walks the authored objective list and `transcript`
    // the authored emitter list, so the order is the literal's table order.
    const [result, appended, ...rest] = run.epilogue.split('\n\n');
    assert.equal(result, ATTENDING_CONCLAVE.epilogue[MissionOutcome.Complete]);
    assert.deepEqual(rest, [], 'one reading and one block, and nothing after it');
    const beneath = appended!.split('\n');
    assert.deepEqual(
      beneath.slice(0, 2),
      [byId('the-cells').reading!.met, byId('the-crossing').reading!.met],
      '§8: the cells’ line before the crossing’s'
    );
    assert.equal(beneath.length, 2 + 6, '§8: and the six cells’ own lines under both');
    for (const [index, emitter] of (cells.emitters ?? []).entries()) {
      const line = beneath[2 + index]!;
      assert.ok(
        line === emitter.reading!.entered || line === emitter.reading!.gap,
        `${emitter.tag}: the close entered a line that row does not own`
      );
    }
  });

  it('reads all three of Korrin’s results, in the register, with the readings beneath', () => {
    assert.match(
      ATTENDING_CONCLAVE.epilogue[MissionOutcome.Complete],
      /^The column is at the axis/
    );
    assert.match(ATTENDING_CONCLAVE.epilogue[MissionOutcome.Partial], /^You were sufficient/);
    assert.match(ATTENDING_CONCLAVE.epilogue[MissionOutcome.Lost], /^No column and no muster/);
    assert.match(
      ATTENDING_CONCLAVE.epilogue[MissionOutcome.Lost],
      /not a failure of the called/,
      '§8: it is a calling put at the wrong cycle'
    );
  });
});

describe('what is heard, as docs/mission-conclave-attending.md §7 mixes it', () => {
  it('says nothing crosses three times, in sentences that get shorter', () => {
    const stalls = ATTENDING_CONCLAVE.beats.filter(
      (beat) => beat.kind === 'say' && beat.speaker === 'The stalls' && beat.atTick <= T(14)
    );
    const nothing = stalls.filter(
      (beat) => beat.kind === 'say' && /Nothing (crosses|has crossed)/.test(beat.text)
    );
    assert.deepEqual(
      nothing.map((beat) => beat.atTick),
      [T(2), T(5), T(14)],
      '§7, §9: at 02:00, at 05:00 and at 14:00'
    );
    const lengths = nothing.map((beat) => (beat.kind === 'say' ? beat.text.length : 0));
    assert.ok(lengths[0]! > lengths[1]!, 'the second is shorter than the first');
    assert.equal(
      nothing[2]!.kind === 'say' ? nothing[2]!.text : '',
      'Nothing has crossed from the south terrace. The record notes it.',
      '§12, verbatim — the third, and the mission’s actual thesis'
    );
  });

  it('opens on the formula and closes on a silence entered as a presence', () => {
    // §12: the watch's formula, unchanged and unabridged, spoken over a
    // calling; and Ossary answering a building coming down on his own
    // congregation with the same formula and one substituted noun.
    const ossary = ATTENDING_CONCLAVE.beats.filter(
      (beat) => beat.kind === 'say' && beat.speaker === 'First Cantor Vehl Ossary'
    );
    assert.deepEqual(
      ossary.map((beat) => beat.atTick),
      [0, T(11), T(20)],
      '§9: three times, and the third says nothing'
    );
    assert.equal(
      ossary[0]!.kind === 'say' ? ossary[0]!.text : '',
      'The stalls are open. The cohorts are seated. Nothing is expected of the watch but sufficiency, and sufficiency is not a small thing to be expected of.'
    );
    assert.equal(
      ossary[1]!.kind === 'say' ? ossary[1]!.text : '',
      'The dome is down. The stalls are seated. Nothing is expected of the stalls but sufficiency.',
      '§12: the formula with one noun substituted, for a congregation under rubble'
    );
    // §12: Korrin's one permitted lapse, and it stops one clause short.
    const lapse = ATTENDING_CONCLAVE.beats.find(
      (beat) => beat.kind === 'say' && beat.atTick === T(9, 40) && beat.speaker.includes('Korrin')
    )!;
    assert.match(
      lapse.kind === 'say' ? lapse.text : '',
      /It is not asked what it thinks the thing is\. Nobody is\.$/
    );
  });

  it('sets the sixteen silent at 00:30, one beat per hull and none for the dome', () => {
    const silent = ATTENDING_CONCLAVE.beats.filter((beat) => beat.kind === 'silent');
    assert.equal(silent.length, 16, '§9: one per hull');
    for (const beat of silent) {
      if (beat.kind !== 'silent') continue;
      assert.equal(beat.atTick, T(0, 30), '§9: when the calling is put');
      assert.equal(beat.active, true, '§2: seated under Silent Running');
    }
    assert.deepEqual(
      silent.map((beat) => (beat.kind === 'silent' ? beat.tag : '')).sort(),
      player.units.map((unit) => unit.tag).sort(),
      'every hull and nothing else — a structure has no posture to set'
    );
  });
});
