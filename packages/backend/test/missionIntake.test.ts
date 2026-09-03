/**
 * The Attending 2, read and run — docs/mission-intake.md.
 *
 * `missions.test.ts` holds every mission to §10's conventions; this file holds
 * Intake to the things only its own document claims, and to the three things
 * the format had to learn to hold it at all:
 *
 * - **The map is the doorway** (§11): eight regions cut into a trench, the
 *   overhangs a hundred metres of lift over the bench, the ascent the
 *   shallowest metre and still 1,100 m below mission 4's line.
 * - **The economy's arithmetic is the roster's** (§3, §4): the four ranges
 *   the previous mission taught, a Hollow's thirty-five, the eighth as slack —
 *   and the intake opening 1,601 m from the nearest animal against 1,231 m
 *   of contact.
 * - **The shift runs its length** (§8, §9): the band answered at four minutes
 *   is a mission that still ends at twenty, because the Sounder crosses at
 *   sixteen and the roll is filed in the last minute.
 * - **A muster is a standing count, and a finding is not filed before it is
 *   asked for** (§5, §8, §9) — the other two format rows this mission spent.
 * - **The Sounder, as built** (§6, §13): what the transit does to a year that
 *   goes quiet and stays on the line, what it does to a year that moved, and
 *   what twelve live guns at the muster do to it — which, since #349 settled
 *   §13's finding, is nothing: a driven creature takes no weapon damage.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  DEPTH_BANDS,
  DRIFT,
  DepthBand,
  Faction,
  FaunaSpecies,
  MISSION,
  MissionOutcome,
  ObjectiveStatus,
  PROPAGATION_FACTOR,
  ResolutionTier,
  SIM,
  TIER_THRESHOLD_MULTIPLIER,
  UnitKind,
  detectionRatio,
  faunaStatsFor,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Fauna, Health } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { BANDING_GROUND, mapById, missionMapById } from '../src/sim/maps/index.ts';
import {
  ATTENDING_INTAKE,
  MissionRuntime,
  PROLOGUE_SORROWGATE,
  type MissionCommandSink,
  type MissionDefinition,
} from '../src/sim/missions/index.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { createSimWorld, spawnFauna, spawnUnit } from '../src/sim/world.ts';
import { dropDepthCharge } from '../src/sim/systems/ordnance.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
const PLAYER = ATTENDING_INTAKE.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** §11 — the spawn, and the Sounder's line through it. */
const MUSTER = { x: 2500, y: 750 };
const LINE_X = 2500;
/** §11 — the foot of the ascent: the roll's region, at its middle. */
const THE_ASCENT = { x: 2500, y: 125 };
/** Off the line, and still on the muster (§11: 1750–3250 across). */
const OFF_THE_LINE = { x: 2000, y: 750 };
/** §11 — the nearest coiled Hollow to the muster. */
const NEAREST_HOLLOW = { x: 1250, y: 1750 };
const HOLLOW = faunaStatsFor(FaunaSpecies.Hollow);
const SOUNDER = faunaStatsFor(FaunaSpecies.Sounder);
const SUBMERSIBLE = statsFor(UnitKind.AbyssalSubmersible);
const TRENCH_PF = PROPAGATION_FACTOR[Biome.AbyssalTrench];

/** The sink is required and never reached: nothing on this literal gives an order. */
const SINK: MissionCommandSink = {
  applyMove: () => {},
  applyDepth: () => true,
  applySilent: () => {},
  applyPing: () => {},
};

function intakeMatch(seed = 11): Match {
  const map = missionMapById(ATTENDING_INTAKE.mapId)!;
  return new Match(map, { mission: ATTENDING_INTAKE, fauna: false, seed });
}

interface Run {
  outcome: MissionOutcome;
  epilogue: string;
  resolvedAtTick: number;
  lines: { tick: number; speaker: string; text: string }[];
  objectives: { id: string; status: ObjectiveStatus }[];
  /** The last live view before the close — the counters are only ever here. */
  counters: Map<string, { done: number; of: number }>;
  last: EchoSnapshot;
  match: Match;
}

/**
 * Run the shift out, letting `drive` give orders on the Echo ticks it wants —
 * the cadence the player's own snapshot arrives at, so the test plays a game
 * somebody can play.
 */
function runOut(match: Match, drive?: (own: EchoSnapshot, match: Match) => void): Run {
  let last: EchoSnapshot | undefined;
  const lines: Run['lines'] = [];
  const counters = new Map<string, { done: number; of: number }>();
  for (let tick = 0; tick <= T(20, 30); tick++) {
    const snapshots = match.update(STEP_MS);
    const own = snapshots?.get(PLAYER);
    if (own !== undefined) {
      last = own;
      drive?.(own, match);
    }
    const view = match.takeMissionView();
    for (const objective of view?.objectives ?? []) {
      if (objective.progress !== undefined) counters.set(objective.id, objective.progress);
    }
    for (const line of match.takeMissionLines()) lines.push(line);
    if (match.missionOver !== null) break;
  }
  const over = match.missionOver;
  assert.ok(over !== null, 'the shift never ended');
  assert.ok(last !== undefined, 'the intake never resolved');
  return {
    outcome: over.outcome,
    epilogue: over.epilogue,
    resolvedAtTick: match.world.tick,
    lines,
    objectives: over.objectives,
    counters,
    last,
    match,
  };
}

/** The range at which SIG through trench water reaches HYD at a tier's multiple. */
function rangeAt(sig: number, hyd: number, multiple: number): number {
  let low = 1;
  let high = 20000;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (detectionRatio(sig, TRENCH_PF, mid, hyd) >= multiple) low = mid;
    else high = mid;
  }
  return Math.round(low);
}

/** Every hull the player still holds, ordered somewhere, once per pass. */
function sendAll(own: EchoSnapshot, match: Match, to: { x: number; y: number }): void {
  for (const unit of own.units) match.orderMove(PLAYER, unit.id, to.x, to.y, false);
}

/**
 * Silent Running on every hull. "Silent hulls hold fire" (combat.ts), and the
 * Directorate has spent a whole mission learning the posture — so a year that
 * goes quiet at the call meets the colossus without twelve guns announcing
 * it. Since #349 the guns would change nothing but the noise.
 */
function goQuiet(own: EchoSnapshot, match: Match): void {
  for (const unit of own.units) match.setSilentRunning(PLAYER, unit.id, true);
}

describe('the Banding Ground, as docs/mission-intake.md §11 paints it', () => {
  it('transcribes §11 row for row, on the cell grid, in the table order', () => {
    // Painting order is load-bearing (`terrainFor` writes later regions over
    // earlier ones), and §11 says the trench is painted first and everything
    // else is cut into it.
    assert.deepEqual(
      BANDING_GROUND.regions.map((region) => [
        region.x,
        region.y,
        region.widthM,
        region.heightM,
        region.biome,
        region.floorM,
      ]),
      [
        [0, 0, 5000, 4000, Biome.AbyssalTrench, 2400],
        [1500, 0, 2000, 500, Biome.CoralRuins, 1750],
        [2250, 0, 500, 250, Biome.CoralRuins, 1500],
        [1750, 500, 1500, 500, Biome.CoralRuins, 1900],
        [1500, 1250, 2000, 1500, Biome.AbyssalTrench, 2250],
        [250, 1250, 1250, 1500, Biome.AbyssalTrench, 2150],
        [3500, 1250, 1250, 1500, Biome.AbyssalTrench, 2150],
        [2000, 3250, 1000, 750, Biome.AbyssalTrench, 2400],
      ]
    );
    for (const region of BANDING_GROUND.regions) {
      for (const metres of [region.x, region.y, region.widthM, region.heightM]) {
        assert.equal(metres % BANDING_GROUND.cellM, 0, `${region.note}: off the 250 m cell grid`);
      }
    }
    assert.equal(BANDING_GROUND.floorM, 2400, '§11: base floor 2,400');
    assert.deepEqual(
      BANDING_GROUND.spawns.map((s) => [s.x, s.y]),
      [[MUSTER.x, MUSTER.y]],
      '§11: one spawn, at the muster'
    );
    assert.deepEqual(BANDING_GROUND.resources, [], '§11: no resources');
    assert.deepEqual(BANDING_GROUND.hazards, [], '§11: no hazard sites');
    assert.equal(TRENCH_PF, 1.6, '§3: trench water, and the best water on the map');
  });

  it('lifts the overhangs a hundred metres over the bench, which is nothing', () => {
    // §11: "The overhangs are the map's one piece of gameplay geometry and
    // they are not a fence." Terrain may raise a hull and never lower one, and
    // here it barely raises one — the map is not difficult, it is large.
    const bench = BANDING_GROUND.regions[4]!;
    const west = BANDING_GROUND.regions[5]!;
    const east = BANDING_GROUND.regions[6]!;
    assert.equal(bench.floorM! - west.floorM!, 100);
    assert.equal(bench.floorM! - east.floorM!, 100);
    assert.equal(east.x - (west.x + west.widthM), 2000, '§11: four kilometres, centre to centre');
  });

  it('keeps every metre below the shallow line, the ascent included', () => {
    // §5 and §11: the roll's region is the *foot* of the ascent at 1,500 m,
    // "1,100 m below mission 4's line", so no hull on this map is ever in
    // water the shallow penalty tests, and mission 4's system is untouched.
    const shallowest = Math.min(...BANDING_GROUND.regions.map((region) => region.floorM!));
    assert.equal(shallowest, 1500, "§11: the ascent's foot is the shallowest metre");
    assert.equal(
      shallowest - DEPTH_BANDS[DepthBand.Shelf].max,
      1100,
      "§11: below mission 4's line"
    );
    const ascent = BANDING_GROUND.regions[2]!;
    assert.equal(ascent.floorM, shallowest);
  });

  it('is a mission map and is not in the public catalogue', () => {
    assert.equal(BANDING_GROUND.seats, 1, '§11: one seat, not balanced');
    assert.equal(mapById('banding-ground'), undefined, 'the skirmish screen would offer it');
    assert.equal(missionMapById('banding-ground'), BANDING_GROUND, 'resolved by mission id only');
  });
});

describe('the intake, as docs/mission-intake.md §2 musters it', () => {
  const player = ATTENDING_INTAKE.parties.find((party) => party.slot === PLAYER)!;

  it('is twelve Abyssal Submersibles, one role, all of them armed, and nothing else', () => {
    assert.equal(ATTENDING_INTAKE.parties.length, 1, '§2, §7: no second party in the water');
    assert.equal(player.units.length, 12, '§2: twelve is the year');
    for (const unit of player.units) {
      assert.equal(unit.kind, UnitKind.AbyssalSubmersible, "§2: the faction's deep hull");
      assert.equal(unit.role, 'cohort', '§5: one role, and nothing marks a hull');
      assert.equal(unit.armed, true, '§9: weapons live — the campaign’s first combat');
      assert.equal(unit.pressureRating, undefined, '§2: PR-3 is the roster’s, no refit');
      assert.equal(unit.depthM, 1900, '§9: at the muster, 1,900 m');
    }
    assert.equal(player.structures, undefined, '§2: no Bastion, no Foundry, no dome');
    assert.equal(player.emitters, undefined);
  });

  it('holds nobody to anything, and withholds the ping and the yard', () => {
    // §2: no silence order — Asset Recovery's posture — and no Cantor. The
    // ledger does not run, because this is the mission where the Directorate
    // is strong, and everything that makes you strong makes you loud.
    assert.equal(ATTENDING_INTAKE.silenceCeilingSig, 100, '§2: no silence order');
    assert.equal(ATTENDING_INTAKE.debtCapS, 0);
    assert.equal(
      ATTENDING_INTAKE.arrayTag,
      undefined,
      '§2: no Cantor, and the absence is the point'
    );
    assert.equal(ATTENDING_INTAKE.sigBudget, 50, '§3: fifty, a description rather than a ceiling');
    assert.equal(ATTENDING_INTAKE.fauna, false, '§11: every creature is authored');
    const locked = new Set(ATTENDING_INTAKE.locks.map((lock) => lock.ability));
    assert.ok(locked.has('activeSonar'), '§2: the button that would summon the colossus');
    assert.ok(locked.has('construction'), '§2: nothing to build');
    assert.ok(!locked.has('weapons'), '§2: weapons live');
    assert.equal(ATTENDING_INTAKE.escortRadiusM, 0, 'no held freight');
  });
});

describe('the cohort economy, as docs/mission-intake.md §3 prices it', () => {
  const hollows = ATTENDING_INTAKE.beats.filter(
    (beat) => beat.kind === 'creature' && beat.species === FaunaSpecies.Hollow
  );

  it('places eight Hollows at tick zero, four per overhang, none of them driven', () => {
    assert.equal(hollows.length, 8, '§3: the money is eight animals');
    for (const beat of hollows) {
      if (beat.kind !== 'creature') continue;
      assert.equal(beat.atTick, 0, '§11: placed with the map');
      assert.equal(beat.spawnAt?.depthM, HOLLOW.workingDepthM, '§11: at working depth 1,700 m');
      // Placed and not driven (§13): committed to its own spawn for no ticks
      // at all, which hands it straight back to its trigger model.
      assert.deepEqual(beat.driveTo, { x: beat.spawnAt!.x, y: beat.spawnAt!.y });
      assert.equal(beat.untilTick, 0);
      assert.equal(beat.loud, false, 'a coiled animal is a precursor to nothing');
    }
    const west = hollows.filter((beat) => beat.kind === 'creature' && beat.spawnAt!.x < 2500);
    const east = hollows.filter((beat) => beat.kind === 'creature' && beat.spawnAt!.x > 2500);
    assert.equal(west.length, 4, '§11: half the year’s income');
    assert.equal(east.length, 4, '§11: the other half');
  });

  it('asks for seven of the eight, and the eighth is slack', () => {
    const band = ATTENDING_INTAKE.objectives.find((o) => o.id === 'the-band')!;
    assert.deepEqual(band.predicate, { kind: 'deliver', account: 'biomass', amount: 245 });
    assert.equal(HOLLOW.biomass, 35, '§3: thirty-five a rendering, the roster’s figure');
    assert.equal(7 * HOLLOW.biomass, 245, '§3: the band is seven of eight');
    assert.equal(8 * HOLLOW.biomass, 280, '§3: and the eighth is slack');
  });

  it('opens with the intake unable to hear a single thing it is there to earn', () => {
    // §3's four ranges, exact against the shipped propagation model: SIG 3
    // against HYD 85 through PF 1.60. And the opening: the nearest coiled
    // Hollow is 1,601 m from the muster against 1,231 m of contact.
    assert.equal(rangeAt(HOLLOW.sigIdle, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT), 1231);
    assert.equal(rangeAt(HOLLOW.sigIdle, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.BEARING), 955);
    assert.equal(
      rangeAt(HOLLOW.sigIdle, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      694
    );
    assert.equal(rangeAt(HOLLOW.sigIdle, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.TRACK), 518);
    const opening = Math.hypot(NEAREST_HOLLOW.x - MUSTER.x, NEAREST_HOLLOW.y - MUSTER.y);
    assert.equal(Math.round(opening), 1601, '§3: the nearest animal, from the muster');
    assert.ok(opening > 1231, '§9: nothing is audible for the first two minutes');
    assert.equal(HOLLOW.sigIdle, 3, '§3: the same three the Mouth’s return carries');
  });

  it('says the ground’s line on the first rendering, keyed on the band’s own account', () => {
    const conditionals = ATTENDING_INTAKE.conditionalBeats ?? [];
    assert.equal(conditionals.length, 1, '§12: one line, on the first rendering');
    const first = conditionals[0]!;
    assert.equal(first.kind, 'say');
    assert.deepEqual(first.when, { kind: 'deliver', account: 'biomass', amount: HOLLOW.biomass });
    assert.equal(first.choiceGroup, undefined, 'the file header says why there is no group');
  });
});

describe('the objective, as docs/mission-intake.md §8 chooses it', () => {
  const byId = (id: string) => ATTENDING_INTAKE.objectives.find((o) => o.id === id)!;

  it('decides the count by the band and the muster, and by nothing else', () => {
    const terminal = ATTENDING_INTAKE.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => o.id),
      ['the-band', 'the-muster'],
      '§8: two terminal objectives'
    );
    assert.deepEqual(byId('the-muster').predicate, { kind: 'survive', role: 'cohort', count: 9 });
    for (const objective of terminal) {
      assert.notEqual(objective.keystone, true, '§8: neither terminal objective is a keystone');
      assert.ok(objective.reading !== undefined, `${objective.id}: read out at the close`);
    }
    assert.equal(ATTENDING_INTAKE.runsItsLength, true, '§8, §9: the shift ends at 20:00');
  });

  it('reads the finding out and never ranks it, and asks for it in the last minute', () => {
    const finding = byId('the-finding');
    assert.notEqual(finding.terminal, true, '§5: read out, never ranked');
    assert.deepEqual(finding.predicate, {
      kind: 'extract',
      role: 'cohort',
      region: 'the-ascent',
      count: 1,
    });
    assert.equal(finding.revealAtTick, T(19), '§9: the muster is called at 19:00');
    assert.equal(finding.markerId, 'the-ascent');
    assert.match(finding.reading!.met, /attended to personally/, '§12, verbatim');
    assert.match(finding.reading!.unmet, /None\. That is also entered/, '§12, verbatim');
    // §5's fourth guard: no quota. Eight per cent of twelve is 0.96, and the
    // Undermarshalcy does not round up — so the ask is one, and it is not asked.
    assert.equal(finding.predicate.kind === 'extract' ? finding.predicate.count : NaN, 1);
    // §5's second guard: the entered hull keeps its role and is still counted.
    assert.equal(byId('the-muster').predicate.kind === 'survive' ? 'cohort' : '', 'cohort');
    assert.equal(ATTENDING_INTAKE.markers.length, 1, '§5: nothing points at an animal');
  });

  it('reads all three of Korrin’s results, in the register', () => {
    assert.match(ATTENDING_INTAKE.epilogue[MissionOutcome.Complete], /^The band is answered/);
    assert.match(ATTENDING_INTAKE.epilogue[MissionOutcome.Partial], /^You were sufficient/);
    assert.match(ATTENDING_INTAKE.epilogue[MissionOutcome.Lost], /^No band and no muster/);
    assert.match(ATTENDING_INTAKE.epilogue[MissionOutcome.Lost], /not a failure of yours/);
  });
});

describe('the Sounder, as docs/mission-intake.md §6 authors it', () => {
  const transit = ATTENDING_INTAKE.beats.find(
    (beat) => beat.kind === 'creature' && beat.species === FaunaSpecies.Sounder
  )!;
  const call = ATTENDING_INTAKE.beats.find((beat) => beat.kind === 'say' && beat.atTick === T(15))!;
  const resolve = ATTENDING_INTAKE.beats.find((beat) => beat.kind === 'resolve')!;

  it('calls at 15:00, enters from the throat at 16:00, and the shift ends at 20:00', () => {
    assert.equal(call.kind, 'say');
    assert.match(call.kind === 'say' ? call.text : '', /not attending anything/, '§12, verbatim');
    assert.equal(transit.atTick, T(16), '§9: the transit begins at 16:00');
    assert.equal(transit.kind === 'creature' ? transit.loud : false, true, '§6: the loud beat');
    assert.equal(transit.kind === 'creature' ? transit.spawnAt?.x : NaN, LINE_X);
    assert.ok(
      transit.kind === 'creature' && transit.spawnAt!.y >= 3250,
      '§11: the Sounder arrives through the throat'
    );
    assert.equal(
      transit.kind === 'creature' ? transit.driveTo.x : NaN,
      LINE_X,
      '§6: a straight line, across the bench and the muster'
    );
    assert.equal((transit.atTick - call.atTick) / SIM.TICK_HZ, MISSION.FAILURE_TELEGRAPH_S);
    assert.equal(resolve.atTick, T(20), '§9: the shift ends at 20:00');
    assert.equal(resolve.kind === 'resolve' ? resolve.conclusion : undefined, true);
    assert.equal((resolve.atTick - transit.atTick) / SIM.TICK_HZ, 4 * MISSION.FAILURE_TELEGRAPH_S);
    // §6: "sixty times sixty" — the call is SIG 100, and an Abyssal
    // Submersible holds it at contact from three times the width of the map.
    assert.equal(
      rangeAt(SOUNDER.sigActive, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      11016
    );
  });

  it('grinds the Directorate’s only hull by exactly nothing', () => {
    // §6, §13: the transit ignores hulls shorter than the threshold, and the
    // Abyssal Submersible is exactly the threshold — the shortest hull in the
    // game a colossus notices, and the one on this map.
    assert.equal(SUBMERSIBLE.hullLengthM, DRIFT.TRANSIT_MIN_HULL_M);
    assert.equal(SUBMERSIBLE.hullLengthM, 95);
  });
});

describe('the three rows the format learned for this mission', () => {
  /** One objective, one rule, the `missionShiftChange.test.ts` fixture idiom. */
  function fixture(overrides: Partial<MissionDefinition>): MissionDefinition {
    return {
      ...PROLOGUE_SORROWGATE,
      id: 'test-intake-row',
      arrayTag: undefined,
      sweep: undefined,
      lifts: undefined,
      regions: [],
      markers: [],
      parties: [],
      conditionalBeats: undefined,
      beats: [{ atTick: ECHO_TICK_INTERVAL * 6, kind: 'resolve', conclusion: true, note: '' }],
      ...overrides,
    };
  }

  function banked(tick: number, biomass: number): EchoSnapshot {
    return {
      tick,
      units: [],
      structures: [],
      ordnance: [],
      contacts: [],
      peakSig: 0,
      nodules: 0,
      crystal: 0,
      biomass,
      exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
      selfEvents: [],
      draw: { capacity: 0, demand: 0, satisfaction: 1 },
      driftHealth: [],
      shoals: [],
      jellies: [],
      hazards: [],
      marks: [],
    };
  }

  /** Drive `passes` Echo ticks with the band already met, and report when it closed. */
  function closesOn(definition: MissionDefinition, passes: number): number {
    const runtime = new MissionRuntime(definition);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    for (let pass = 1; pass <= passes; pass++) {
      world.tick = pass * ECHO_TICK_INTERVAL;
      if (runtime.tick(world, SINK, banked(world.tick, 1000)) !== null) return pass;
    }
    return -1;
  }

  const band = {
    id: 'the-band',
    text: '',
    initial: ObjectiveStatus.Pending,
    terminal: true as const,
    predicate: { kind: 'deliver' as const, account: 'biomass' as const, amount: 245 },
  };

  it('runs its length: a band answered on the first pass closes on the resolve beat', () => {
    // The court's rule, first, so the row is measured against it: a terminal
    // objective met is a mission over, on that pass.
    assert.equal(closesOn(fixture({ objectives: [band] }), 8), 1, 'the court stops sitting');
    // And the shift's: the same fixture with `runsItsLength` waits for 20:00.
    assert.equal(
      closesOn(fixture({ objectives: [band], runsItsLength: true }), 8),
      6,
      '§9: the shift ends at the whistle, not at the band'
    );
  });

  it('does not score an objective before it is revealed', () => {
    // The band is met from the first pass and the objective is shown on the
    // fourth. Under the court's rule the mission closes when the objective is
    // met — and it is not met, because it is not yet asked for, until the
    // pass that reveals it.
    const late = { ...band, revealAtTick: ECHO_TICK_INTERVAL * 4 };
    assert.equal(closesOn(fixture({ objectives: [late] }), 8), 4, '§9: filed when asked for');
  });

  it('keeps an endure counting from the start under a reveal', () => {
    // Tend's turning: revealed at 15:00, met at 15:50 "whatever the day did".
    // The clock an `endure` counts from is the mission's, not the reveal's.
    const turning = {
      id: 'turning',
      text: '',
      initial: ObjectiveStatus.Pending,
      terminal: true as const,
      revealAtTick: ECHO_TICK_INTERVAL * 3,
      predicate: { kind: 'endure' as const, ticks: ECHO_TICK_INTERVAL * 4 },
    };
    // startedAt is stamped on pass 1 (tick 12), so four intervals of endurance
    // is met on pass 5 — not pass 7, which a clock started at the reveal would
    // read.
    assert.equal(closesOn(fixture({ objectives: [turning] }), 8), 5);
  });
});

describe('a beat the guns cannot end — docs/mission-intake.md §13, settled (#349)', () => {
  const faunaQuery = defineQuery([Fauna]);
  /** A creature the runtime spawned, by species — there is exactly one in these fixtures. */
  function creatureIn(world: ReturnType<typeof createSimWorld>, species: FaunaSpecies): number {
    return faunaQuery(world).find((eid) => Fauna.species[eid] === species) ?? 0;
  }

  it('marks a creature driven for exactly the length of its commitment', () => {
    // The flag the guns read is raised on the first pass a commitment holds
    // and lowered on the pass it expires — which for a placed Hollow,
    // committed to its own spawn until tick zero, is the first. That is what
    // keeps eight ambushers renderable for the band while the colossus driven
    // across the muster is not.
    const untilTick = ECHO_TICK_INTERVAL * 3;
    const definition: MissionDefinition = {
      ...PROLOGUE_SORROWGATE,
      id: 'test-intake-driven',
      arrayTag: undefined,
      sweep: undefined,
      lifts: undefined,
      regions: [],
      markers: [],
      parties: [],
      objectives: [],
      conditionalBeats: undefined,
      beats: [
        {
          atTick: 0,
          kind: 'creature',
          tag: 'colossus',
          species: FaunaSpecies.Sounder,
          spawnAt: { x: 4000, y: 4000, depthM: 600 },
          driveTo: { x: 4000, y: 1000, depthM: 600 },
          untilTick,
          loud: false,
          note: '',
        },
        {
          atTick: 0,
          kind: 'creature',
          tag: 'ambusher',
          species: FaunaSpecies.Hollow,
          spawnAt: { x: 1000, y: 1000, depthM: 600 },
          driveTo: { x: 1000, y: 1000, depthM: 600 },
          untilTick: 0,
          loud: false,
          note: '',
        },
        { atTick: ECHO_TICK_INTERVAL * 8, kind: 'resolve', conclusion: true, note: '' },
      ],
    };
    const runtime = new MissionRuntime(definition);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    const driven: { pass: number; colossus: number; ambusher: number }[] = [];
    for (let pass = 1; pass <= 6; pass++) {
      world.tick = pass * ECHO_TICK_INTERVAL;
      runtime.tick(world, SINK, {
        ...banked(world.tick),
      });
      driven.push({
        pass,
        colossus: Fauna.driven[creatureIn(world, FaunaSpecies.Sounder)]!,
        ambusher: Fauna.driven[creatureIn(world, FaunaSpecies.Hollow)]!,
      });
    }
    // Pass 1 fires both beats. The Hollow's commitment, until tick zero, is
    // already past on a first pass at tick 12, so it is released before it
    // was ever held; the colossus is held through pass 3 and released on
    // pass 4, the first past its `untilTick`.
    assert.deepEqual(
      driven.map((row) => [row.pass, row.colossus, row.ambusher]),
      [
        [1, 1, 0],
        [2, 1, 0],
        [3, 1, 0],
        [4, 0, 0],
        [5, 0, 0],
        [6, 0, 0],
      ]
    );
  });

  /** An intake snapshot with nothing in it — the runtime only reads `tick` here. */
  function banked(tick: number): EchoSnapshot {
    return {
      tick,
      units: [],
      structures: [],
      ordnance: [],
      contacts: [],
      peakSig: 0,
      nodules: 0,
      crystal: 0,
      biomass: 0,
      exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
      selfEvents: [],
      draw: { capacity: 0, demand: 0, satisfaction: 1 },
      driftHealth: [],
      shoals: [],
      jellies: [],
      hazards: [],
      marks: [],
    };
  }

  it('lands a gun and a depth charge on a driven colossus and takes nothing off it', () => {
    // The rule itself, against the live systems and no mission: a Sounder
    // with the flag raised is shot at by an Abyssal Submersible two hundred
    // metres off and shelled by its depth charge, and keeps every point.
    // Lowered, the same gun takes hull off it at the roster's rate — a
    // skirmish colossus, which is never driven, is hunted for its 260 exactly
    // as before.
    // The banding ground with no mission on it: trench water deep enough for
    // a Sounder at its own 2,000 m, and a Directorate hull beside it.
    const match = new Match(missionMapById(ATTENDING_INTAKE.mapId)!, { fauna: false, seed: 3 });
    match.addPlayer(PLAYER, Faction.Directorate);
    const colossus = spawnFauna(match.world, {
      species: FaunaSpecies.Sounder,
      x: 2500,
      y: 2000,
      depth: SOUNDER.workingDepthM,
    });
    const gun = spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: PLAYER,
      faction: Faction.Directorate,
      x: 2650,
      y: 2000,
      depth: SOUNDER.workingDepthM,
    });
    const seconds = (n: number) => {
      for (let i = 0; i < n * SIM.TICK_HZ; i++) match.update(STEP_MS);
    };
    // As the runtime holds it: driven, and deaf for as long as it is.
    Fauna.driven[colossus] = 1;
    Fauna.senseS[colossus] = 3600;
    assert.notEqual(dropDepthCharge(match.world, gun, SOUNDER.workingDepthM), 0, 'the charge');
    seconds(8);
    assert.equal(Health.hp[colossus], SOUNDER.maxHp, 'eight seconds of fire, and every point');
    assert.ok(match.world.marks.count > 0, 'and the shooting still left residue');

    Fauna.driven[colossus] = 0;
    seconds(3);
    assert.ok(
      Health.hp[colossus]! <= SOUNDER.maxHp - SUBMERSIBLE.attackDamage,
      `released, the same gun lands: ${Health.hp[colossus]} of ${SOUNDER.maxHp}`
    );
  });
});

describe('the shift, run out — docs/mission-intake.md §4, §6, §8, §9', () => {
  /**
   * The year's search, as a route: a stand-off point four hundred metres off
   * each Hollow, nearest first, with a dwell at each — guns hold while a hull
   * is travelling, so the team has to *arrive* to be paid. Each hull is sent
   * to its own point beside the stand-off, or three hulls ordered to one
   * metre push each other off it and never stop travelling.
   */
  function search(): (own: EchoSnapshot, match: Match) => void {
    const hollows = ATTENDING_INTAKE.beats
      .filter((beat) => beat.kind === 'creature' && beat.species === FaunaSpecies.Hollow)
      .map((beat) => (beat.kind === 'creature' ? beat.spawnAt! : { x: 0, y: 0, depthM: 0 }));
    let from = MUSTER;
    const route: { x: number; y: number }[] = [];
    const left = [...hollows];
    while (left.length > 0) {
      left.sort(
        (a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y)
      );
      const next = left.shift()!;
      const standOff = next.x < 2500 ? 400 : -400;
      from = { x: next.x + standOff, y: next.y };
      route.push(from);
    }
    let leg = 0;
    let arrivedAt = -1;
    let paidAtArrival = 0;
    let lastOrder = -1;
    return (own, match) => {
      if (leg >= route.length || own.tick < SIM.TICK_HZ) return;
      const team = own.units.slice(0, 3);
      if (team.length === 0) return;
      const cx = team.reduce((a, unit) => a + unit.x, 0) / team.length;
      const cy = team.reduce((a, unit) => a + unit.y, 0) / team.length;
      const here = route[leg]!;
      if (arrivedAt === -1) {
        if (Math.hypot(cx - here.x, cy - here.y) < 150) {
          arrivedAt = own.tick;
          paidAtArrival = own.biomass;
        } else if (own.tick - lastOrder > T(0, 10)) {
          lastOrder = own.tick;
          team.forEach((unit, index) =>
            match.orderMove(PLAYER, unit.id, here.x, here.y + (index - 1) * 120, false)
          );
        }
      } else if (own.biomass > paidAtArrival || own.tick - arrivedAt > T(0, 45)) {
        leg++;
        arrivedAt = -1;
        lastOrder = -1;
      }
    };
  }

  /**
   * Take one hull to the foot of the ascent: a climb first, because the halls
   * and the ascent are floored above the muster and a hull too deep for the
   * water ahead does not drive into it (docs/systems-depth.md §2). Ascent is
   * slow and silent, and that is the whole cost of filing.
   */
  function file(match: Match, unit: { id: number }): void {
    assert.ok(match.orderDepth(PLAYER, unit.id, 1500), 'the climb was refused');
    match.orderMove(PLAYER, unit.id, THE_ASCENT.x, THE_ASCENT.y, false);
  }

  it('renders what it finds, is paid the roster’s figure, and the shift still runs to 20:00', () => {
    // §3, §4, §9: three hulls through the eight stand-offs, standing off,
    // which §4 prices at nothing. The ground says its line on the first
    // rendering. §8, §9: the band is answered inside five minutes and the
    // shift still ends at 20:00, because it runs its length. And §9's
    // finding row: a hull that stands at the foot of the ascent at 05:00 and
    // leaves has filed nothing, because the ground does not ask until 19:00.
    const drive = search();
    let paid = 0;
    const payments: number[] = [];
    let filedEarly = false;
    const run = runOut(intakeMatch(), (own, match) => {
      if (own.biomass > paid) {
        payments.push(own.biomass - paid);
        paid = own.biomass;
      }
      const filer = own.units[own.units.length - 1];
      if (filer !== undefined && own.tick >= T(5) && !filedEarly) {
        filedEarly = true;
        file(match, filer);
      }
      if (filer !== undefined && own.tick === T(6, 30)) {
        match.orderMove(PLAYER, filer.id, OFF_THE_LINE.x, OFF_THE_LINE.y, false);
      }
      drive(own, match);
    });
    assert.ok(payments.length >= 7, `§3: seven renderings, got ${payments.length}`);
    // Every rendering is the roster's thirty-five, or the region ledger's
    // discount of it — §3 and §13 (#350): three hulls cruising together are 84
    // of SIG against a threshold of 60, so a column wears the cell it works
    // and a rendering in a worn cell pays three quarters. The mission does not
    // read the ledger out and is priced by it anyway, and the document says
    // so rather than moving the band: seven of eight is slack only spread,
    // and this column is the measurement it quotes. Each figure is stated
    // here so a retune of the ledger is noticed rather than discovered.
    for (const payment of payments) {
      assert.ok(
        payment === HOLLOW.biomass || payment === HOLLOW.biomass * 0.75,
        `a rendering paid ${payment}`
      );
    }
    assert.ok(payments.includes(HOLLOW.biomass), '§3: thirty-five, the roster’s figure');
    assert.ok(
      payments.includes(HOLLOW.biomass * 0.75),
      '§13 (#350): a column that works a wall together is paid the ledger’s discount'
    );
    const seven = payments.slice(0, 7).reduce((sum, payment) => sum + payment, 0);
    assert.ok(seven < 245, `§3: seven of eight is slack only spread — a column banked ${seven}`);
    assert.ok(
      paid >= 245,
      `§3: the band, from the walls — ${paid} banked, as ${payments.join(', ')}`
    );
    // The ground's line, once, on the first rendering and not on the second.
    const rendered = run.lines.filter((line) => line.text.startsWith('Rendered.'));
    assert.equal(rendered.length, 1, '§12: said on the first rendering, and once');
    assert.equal(run.resolvedAtTick, T(20), '§9: the band met early does not end the shift');
    const band = run.objectives.find((o) => o.id === 'the-band')!;
    assert.equal(band.status, ObjectiveStatus.Met, '§8: the band is answered');
    assert.equal(run.counters.get('the-band')?.of, 245, 'the counter is the band');
    const finding = run.objectives.find((o) => o.id === 'the-finding')!;
    assert.equal(finding.status, ObjectiveStatus.Pending, '§9: not filed before it is asked for');
    assert.match(run.epilogue, /None\. That is also entered/);
  });

  it('grinds a year that went quiet and stayed on the line, and reads the muster short', () => {
    // §6 and §9, as the document describes them: the year hears the call,
    // goes quiet — the posture the previous mission taught — and does not
    // move. Everything on the line is ground through. Six of the twelve seats
    // stand within a hull's width of x = 2,500, so the muster reads short and
    // the count is Lost: no band, no muster.
    const run = runOut(intakeMatch(), (own, match) => {
      if (own.tick === T(15)) goQuiet(own, match);
    });
    const alive = run.last.units.length;
    assert.equal(alive, 6, `§9: everything on the line is ground through — ${alive} left`);
    for (const unit of run.last.units) {
      assert.ok(
        Math.abs(unit.x - LINE_X) > 85,
        `a hull at x=${unit.x.toFixed(0)} survived the line`
      );
    }
    const muster = run.objectives.find((o) => o.id === 'the-muster')!;
    assert.equal(muster.status, ObjectiveStatus.Pending, '§8: a standing count reads what stands');
    assert.equal(run.counters.get('the-muster')?.done, alive, 'the counter is the muster');
    assert.equal(run.outcome, MissionOutcome.Lost, '§8: no band and no muster');
    assert.match(run.epilogue, /^No band and no muster/);
    assert.match(run.epilogue, /The muster is short/);
    assert.equal(run.resolvedAtTick, T(20));
  });

  it('loses nothing a player moved, and files the finding in the last minute', () => {
    // §6: "a hull that is somewhere else is a hull that is fine". The year
    // goes quiet at the call, steps off the line at 15:30, and at 19:05 —
    // after the muster is called — one hull climbs to the foot of the
    // ascent. Twelve mustered, no band: sufficient, and the finding entered.
    const run = runOut(intakeMatch(), (own, match) => {
      if (own.tick === T(15)) goQuiet(own, match);
      if (own.tick === T(15, 30)) sendAll(own, match, OFF_THE_LINE);
      if (own.tick === T(19, 5)) file(match, own.units[0]!);
    });
    assert.equal(run.last.units.length, 12, '§6: everything that moved is not');
    assert.equal(run.outcome, MissionOutcome.Partial, '§8: one of the two');
    assert.match(run.epilogue, /^You were sufficient/);
    assert.match(run.epilogue, /The band is short/);
    assert.match(run.epilogue, /Nine are mustered\. The muster is met/);
    const finding = run.objectives.find((o) => o.id === 'the-finding')!;
    assert.equal(finding.status, ObjectiveStatus.Met, '§5: entered, at the close');
    assert.match(run.epilogue, /attended to personally/);
    // §5's second guard: the entered hull is still counted. Twelve.
    assert.equal(run.counters.get('the-muster')?.done, 12);
    // The lines, in §9's order and no other.
    // Rounded to the minute: a 00:00 beat fires on the first Echo tick.
    const speakers = run.lines.map((line) => `${Math.round(line.tick / T(1))}:${line.speaker}`);
    assert.deepEqual(speakers, [
      '0:Undermarshal Setha Korrin',
      '7:Cohort-Prime of Intake 11, on the halls’ channel',
      '15:The ground',
      '19:The ground',
      '20:Undermarshal Setha Korrin',
    ]);
  });

  it('shrugs off twelve live guns at the muster, and grinds the line — §13, settled', () => {
    // The finding this test used to state (#349): the bestiary rates a
    // Sounder at 9,000 HP and says it "cannot be reliably killed by any
    // single player before the twenty-minute mark", §6 says "it cannot be
    // killed" — and twelve idle guns at 44.4/s each brought it down in
    // seventeen seconds, before it reached the line, and were paid the band
    // for an intake that did nothing. Settled as §13 now records it: the
    // transit is a beat, a beat happens when the document says, and a driven
    // creature takes no weapon damage. The guns still fire — the intake never
    // went quiet, so the auto-acquire is real and loud — and the colossus
    // crosses the muster at every point it arrived with, grinding the six
    // seats on the line exactly as it does for a year that went quiet.
    //
    // And what that intake did to the ground it stood on, which is the
    // region ledger's row in §13 (#350): the twelve seats stand six either
    // side of x = 2,500, so twelve hulls idling at 22 are 132 of SIG in each
    // of the muster's two cells against a threshold of 60 — 72 over, 1.44 a
    // second — and an intake that never moved has stripped both to nothing
    // inside the first minute. While the colossus could still be killed,
    // that dead ground was what kept the kill from paying the band; now it
    // is stated for its own sake, so a retune of the ledger is noticed.
    let lowest = Number.POSITIVE_INFINITY;
    let loudest = 0;
    const run = runOut(intakeMatch(), (own, match) => {
      if (own.tick === T(1, 10)) {
        for (const x of [LINE_X - 100, LINE_X + 100]) {
          assert.equal(
            match.world.drift.at(x, MUSTER.y),
            0,
            `#350: the muster's cell at x=${x} is stripped inside the first minute`
          );
        }
      }
      if (own.tick < T(16) || own.tick > T(18)) return;
      for (let eid = 0; eid <= match.world.maxEid; eid++) {
        if (!hasComponent(match.world, Fauna, eid)) continue;
        if (Fauna.species[eid] !== FaunaSpecies.Sounder) continue;
        lowest = Math.min(lowest, Health.hp[eid]!);
      }
      loudest = Math.max(loudest, own.peakSig);
    });
    assert.ok(loudest > SUBMERSIBLE.sigIdle, `the guns fired: peak SIG ${loudest} over the idle`);
    assert.equal(lowest, SOUNDER.maxHp, '§6: "it cannot be killed" — and it was not touched');
    assert.equal(run.last.biomass, 0, 'nothing rendered, nothing paid');
    const alive = run.last.units.length;
    assert.equal(alive, 6, `§9: everything on the line is ground through — ${alive} left`);
    assert.equal(run.outcome, MissionOutcome.Lost, '§8: no band and no muster');
  });
});
