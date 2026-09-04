/**
 * The Second Seeding 6, read and run — docs/mission-radicals.md.
 *
 * `missions.test.ts` holds every mission to §10's conventions; this file holds
 * Radicals to the things only its own document claims, and to the one thing the
 * format had never been asked for:
 *
 * - **The order stands again** (§4, §13): eighty-eight `move` beats addressed
 *   to the player's own hulls, twenty-two orders to each of four, every one
 *   carrying its leg's depth — and the runtime applying them on whatever slot
 *   owns the tag. The literal spends a row nothing shipped had ever used, so
 *   the test drives it: a column that takes every order is through by 11:10,
 *   and a column the player countermands every pass is read from the Concourse
 *   at 15:00.
 * - **The lane is drawn under everything in the water, by four or five points**
 *   (§6): §6's own table, re-derived from the shipped propagation model, waypoint
 *   by waypoint, against the colossus's Interest of 55 — and the dive at the
 *   tenth waypoint that is one point over it.
 * - **The stack of dives** (§1, §5, §13): 330, 850, 1,475, 2,300 — each into a
 *   hunter's band and out fifty metres or more under the floor of the thing it
 *   passed, in water the ground admits at the depth the order carries.
 * - **The city as the spring left it** (§11): the prologue's map literal
 *   unchanged, and the prologue's two ground beats fired at 00:00 with the same
 *   values — which is what leaves a PR-1 hull no route south by any route.
 * - **The basin** (§6): seven creatures placed and not driven at their species'
 *   own working depths — §9's `creature` x 7, the colossus among them — and one
 *   drive at 12:00 that crosses the lane at the crossing's depth whatever the
 *   register stands at.
 * - **The close** (§8, §12): the count read at the far water or from the
 *   Concourse, with Marr's own last sentence after it and the four objective
 *   readings beneath — which is what the `epilogue` carries, because this
 *   mission's close moves and a `say` beat at T(15) would miss it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  DEPTH,
  DRIFT,
  FaunaSpecies,
  MISSION,
  MissionOutcome,
  ObjectiveStatus,
  PROPAGATION_FACTOR,
  SILENT_RUNNING,
  SIM,
  THERMOCLINE,
  TIER_THRESHOLD_MULTIPLIER,
  UnitKind,
  detectionRatio,
  faunaStatsFor,
  requiredPressureRating,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { SORROWGATE, mapById, missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE, isStanding } from '../src/sim/missions/index.ts';
import { SEEDING_RADICALS } from '../src/sim/missions/radicals.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = SEEDING_RADICALS.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const TRENCH = PROPAGATION_FACTOR[Biome.AbyssalTrench];
const CITY = PROPAGATION_FACTOR[Biome.CoralRuins];
const SOUNDER = faunaStatsFor(FaunaSpecies.Sounder);
const HOLLOW = faunaStatsFor(FaunaSpecies.Hollow);
const DRAYMAW = faunaStatsFor(FaunaSpecies.Draymaw);
const LAMPFRY = faunaStatsFor(FaunaSpecies.Lampfry);
const CRUISER = statsFor(UnitKind.Cruiser);
const HARVESTER = statsFor(UnitKind.Harvester);
const CORVETTE = statsFor(UnitKind.Corvette);
const SCOUT = statsFor(UnitKind.LightScout);

/** §11 — where the mission puts things, so the arithmetic below reads as §6's. */
const COLOSSUS = { x: 1750, y: 3650 };
const HOLLOW_WEST = { x: 1750, y: 3100 };
const HOLLOW_EAST = { x: 3250, y: 3100 };
const PACK = { x: 3375, y: 1375 };
/** §7 — the seat, and the span's edge: the two places the watch listens from. */
const SEAT = { x: 2500, y: 400 };
const SPAN_EDGE = { x: 1500, y: 1950 };

/**
 * §5's eleven legs, as the document tables them: ordered at the minute and
 * again at the half, waypoint and depth.
 */
const LEGS = [
  { at: T(1), x: 2500, y: 700, depthM: 330 },
  { at: T(2), x: 2625, y: 1125, depthM: 850 },
  { at: T(3), x: 2625, y: 1600, depthM: 850 },
  { at: T(4), x: 1875, y: 1625, depthM: 1475 },
  { at: T(5), x: 2000, y: 1875, depthM: 1475 },
  { at: T(6), x: 2000, y: 2375, depthM: 1475 },
  { at: T(7), x: 2375, y: 2625, depthM: 1475 },
  { at: T(8), x: 2625, y: 3000, depthM: 1475 },
  { at: T(9), x: 2500, y: 3350, depthM: 2300 },
  { at: T(10), x: 2500, y: 3650, depthM: 2300 },
  { at: T(11), x: 2500, y: 3900, depthM: 2300 },
];

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** What `sig` reads as, through `pf`, at `d` metres, to ears of `hyd`. */
const ratio = (sig: number, pf: number, d: number, hyd: number): number =>
  detectionRatio(sig, pf, d, hyd);

/** The range at which `sig` through `pf` reaches `hyd` at a multiple of threshold. */
function rangeAt(sig: number, pf: number, hyd: number, multiple: number): number {
  let low = 1;
  let high = 40000;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (ratio(sig, pf, mid, hyd) >= multiple) low = mid;
    else high = mid;
  }
  return Math.round(low);
}

/** §3 — the shipped Silent Running curve, 3 + 5 x idle / 60. */
const silent = (idleSig: number): number =>
  SILENT_RUNNING.SIG_MIN +
  (SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN) * Math.min(1, Math.max(0, idleSig / 60));

const beatsOfKind = <K extends string>(kind: K) =>
  SEEDING_RADICALS.beats.filter((beat) => beat.kind === kind);

const objectiveById = (id: string) =>
  SEEDING_RADICALS.objectives.find((objective) => objective.id === id)!;

function radicalsMatch(seed = 6): Match {
  const map = missionMapById(SEEDING_RADICALS.mapId)!;
  return new Match(map, { mission: SEEDING_RADICALS, fauna: false, seed });
}

interface Run {
  outcome: MissionOutcome;
  epilogue: string;
  resolvedAtTick: number;
  lines: { tick: number; speaker: string; text: string }[];
  objectives: { id: string; status: ObjectiveStatus }[];
  last: EchoSnapshot;
}

/**
 * Play the crossing out, letting `drive` give orders on the Echo ticks it wants
 * — the cadence the player's own snapshot arrives at, which is also the cadence
 * a countermand can be given at. `missionIntake.test.ts`' `runOut`.
 */
function runOut(match: Match, drive?: (own: EchoSnapshot, match: Match) => void): Run {
  let last: EchoSnapshot | undefined;
  const lines: Run['lines'] = [];
  for (let tick = 0; tick <= T(15, 30); tick++) {
    const snapshots = match.update(STEP_MS);
    const own = snapshots?.get(PLAYER);
    if (own !== undefined) {
      last = own;
      drive?.(own, match);
    }
    for (const line of match.takeMissionLines()) lines.push(line);
    if (match.missionOver !== null) break;
  }
  const over = match.missionOver;
  assert.ok(over !== null, 'the crossing never closed');
  assert.ok(last !== undefined, 'the column never resolved');
  return {
    outcome: over.outcome,
    epilogue: over.epilogue,
    resolvedAtTick: match.world.tick,
    lines,
    objectives: over.objectives,
    last,
  };
}

describe('Sorrowgate, reused as docs/mission-radicals.md §11 finds it', () => {
  it('is the prologue’s map literal, unchanged, and now carries two mission ids', () => {
    // §11: "This mission adds no geometry and spends no biome." The literal is
    // the prologue's, region for region, and the only map in the repository
    // that pairs a campaign mission with the prologue.
    assert.equal(SEEDING_RADICALS.mapId, 'sorrowgate');
    assert.equal(missionMapById('sorrowgate'), SORROWGATE, 'resolved by mission id only');
    assert.equal(mapById('sorrowgate'), undefined, '§11: not in the public catalogue');
    assert.equal(PROLOGUE_SORROWGATE.mapId, SEEDING_RADICALS.mapId, '§11: one literal, two ids');
    assert.deepEqual(
      SORROWGATE.regions.map((region) => [region.biome, region.floorM, region.ceilingM]),
      [
        [Biome.CoralRuins, 1600, undefined],
        [Biome.CoralRuins, 340, undefined],
        [Biome.CoralRuins, 900, undefined],
        [Biome.ThermalVein, 1600, undefined],
        [Biome.CoralRuins, 1500, 1300],
        [Biome.CoralRuins, 1500, undefined],
        [Biome.AbyssalTrench, 2400, undefined],
      ],
      "§11's table: the Districts, the Concourse, the Descent, the Approach, the Lock, the Gate, the Commit"
    );
  });

  it('names the three places a beat or a predicate addresses, and no others', () => {
    // §11: "a mission restates only the places one does" — the plan's
    // `the-concourse` and `the-crossing` are dropped because nothing addresses
    // either.
    assert.deepEqual(
      SEEDING_RADICALS.regions.map((region) => [
        region.id,
        region.x,
        region.y,
        region.widthM,
        region.heightM,
      ]),
      [
        ['arch-span', 0, 2000, 5000, 250],
        ['service-lock', 1750, 1750, 500, 750],
        ['the-far-water', 1500, 3750, 2000, 250],
      ]
    );
    for (const region of SEEDING_RADICALS.regions) {
      for (const metres of [region.x, region.y, region.widthM, region.heightM]) {
        assert.equal(metres % SORROWGATE.cellM, 0, `${region.id}: off the 250 m cell grid`);
      }
      // §11, §13: the refit is on the hulls and not on the water. Nothing here
      // manufactures habitable water — the Commit is PR-3 and stays PR-3.
      assert.equal(region.pressureBonus, undefined, `${region.id}: grants a band it should not`);
    }
    for (const beat of beatsOfKind('ground')) {
      assert.equal(
        beat.kind === 'ground' ? beat.pressureBonus : undefined,
        undefined,
        'a ground beat sows a pressure grant, and §11 sows none'
      );
      assert.equal(beat.kind === 'ground' ? beat.biome : undefined, undefined, '§11: no biome');
    }
  });

  it('fires the prologue’s two ground beats at 00:00, with the prologue’s values', () => {
    // §11: the arch is a mission fact the map literal cannot carry, so this
    // mission restates it — the same two regions, the same two writes, at
    // 00:00 instead of 10:40.
    const mine = beatsOfKind('ground');
    const prologue = PROLOGUE_SORROWGATE.beats.filter((beat) => beat.kind === 'ground');
    assert.equal(mine.length, 2, '§9: two ground beats and no more');
    assert.deepEqual(
      mine.map((beat) => [
        beat.atTick,
        beat.kind === 'ground' ? beat.region : '',
        beat.kind === 'ground' ? beat.floorM : NaN,
        beat.kind === 'ground' ? beat.ceilingM : NaN,
      ]),
      [
        [0, 'arch-span', 0, 1],
        [0, 'service-lock', 1500, 1300],
      ],
      "§9: the span goes solid, and the lock is cut back through it — SOLID's floor 0 / ceiling 1"
    );
    assert.deepEqual(
      prologue.map((beat) => [
        beat.kind === 'ground' ? beat.region : '',
        beat.kind === 'ground' ? beat.floorM : NaN,
        beat.kind === 'ground' ? beat.ceilingM : NaN,
      ]),
      mine.map((beat) => [
        beat.kind === 'ground' ? beat.region : '',
        beat.kind === 'ground' ? beat.floorM : NaN,
        beat.kind === 'ground' ? beat.ceilingM : NaN,
      ]),
      '§11: copied from the prologue, values and all'
    );
    assert.equal(prologue[0]?.atTick, T(10, 40), 'the prologue fires them at 10:40');
  });

  it('leaves a PR-1 hull no route south, at any depth it owns', () => {
    // §3, §7, §13: the span is rock at every depth except the lock's two cell
    // columns, which the second beat re-cuts as roofed water at 1,300-1,500 m.
    // Between the rock and the roof there is no route south for the watch —
    // which is the whole reason the Shelf is its water and it hears the basin
    // only across the layer.
    const match = radicalsMatch();
    // One pass, so the 00:00 beats have fired against the live terrain.
    for (let tick = 0; tick < SIM.TICK_HZ / SIM.ECHO_HZ; tick++) match.update(STEP_MS);
    const terrain = match.world.terrain;
    const row = 2125;
    for (let x = 125; x < SORROWGATE.widthM; x += 250) {
      assert.equal(
        terrain.admits(x, row, 300),
        false,
        `the arch's row admits a PR-1 hull at x=${x}`
      );
    }
    assert.equal(terrain.admits(2000, row, 1475), true, 'the lock is water at the ordered depth');
    assert.equal(terrain.admits(2000, row, 1250), false, 'the lock is roofed at 1,300 m');
    assert.equal(
      requiredPressureRating(1300),
      2,
      "§3: the roof is Mid-Water, and the watch's PR-1 covers the Shelf"
    );
  });
});

describe('the column and the escort, as docs/mission-radicals.md §2 and §3 field them', () => {
  const party = SEEDING_RADICALS.parties.find((p) => p.slot === PLAYER)!;
  const byTag = (tag: string) => party.units.find((unit) => unit.tag === tag)!;

  it('is nine hulls on one party, and thirty-three aboard the four that are ordered', () => {
    assert.equal(SEEDING_RADICALS.parties.length, 1, '§2: no second navy is in the water');
    assert.equal(party.units.length, 9, '§2: four seed hulls, three corvettes, two scouts');
    assert.equal(party.structures, undefined, '§3: no Bastion, no Foundry, no economy');
    assert.equal(party.emitters, undefined);
    const seed = party.units.filter((unit) => unit.role === 'tender');
    assert.equal(seed.length, 4, '§8: the seed hulls carry the role the rows count');
    assert.deepEqual(
      seed.map((unit) => unit.souls),
      [14, 6, 5, 8],
      '§3: fourteen aboard the barge, and six, five and eight in the tenders'
    );
    assert.equal(
      seed.reduce((sum, unit) => sum + (unit.souls ?? 0), 0),
      33,
      '§3: thirty-three, by household'
    );
    assert.deepEqual(
      party.units.filter((unit) => unit.role === 'escort').map((unit) => unit.souls),
      [4, 4, 4],
      '§3: four aboard each corvette'
    );
    assert.deepEqual(
      party.units.filter((unit) => unit.role === 'watch').map((unit) => unit.souls),
      [2, 2],
      '§3: two aboard each scout'
    );
  });

  it('refits the four seed hulls for the Commit and leaves the roster alone', () => {
    // §3, §13: `requiredPressureRating(2300)` is 3 and the seat test reads the
    // hull, so the refit is authored on the hull. It is a mission fact and
    // never a roster fact — the Cruiser and the Harvester are still PR-2.
    assert.equal(requiredPressureRating(2300), 3, '§11: the basin is PR-3 water');
    for (const unit of party.units.filter((u) => u.role === 'tender')) {
      assert.equal(unit.pressureRating, 3, `${unit.tag}: not rated for the water it is ordered to`);
    }
    assert.equal(CRUISER.pressureRating, 2, '§13: the roster is not a mission');
    assert.equal(HARVESTER.pressureRating, 2);
    for (const unit of party.units.filter((u) => u.role !== 'tender')) {
      assert.equal(unit.pressureRating, undefined, `${unit.tag}: the roster's rating, no refit`);
    }
    // §3: PR-2 stands anywhere to 1,800 m and pays four a second below it —
    // 105 seconds of corvette in the basin, and the one cost that makes no sound.
    assert.equal(requiredPressureRating(1790), 2);
    assert.equal(CORVETTE.maxHp / 4, 105);
  });

  it('grows a hull a Sounder grinds, and three the roster prices unchanged', () => {
    // §3: "the first they have grown that a Sounder grinds" — 130 m against
    // DRIFT.TRANSIT_MIN_HULL_M's 95, with the tenders' 75 under it.
    assert.equal(byTag('the-barge').kind, UnitKind.Cruiser);
    assert.equal(CRUISER.hullLengthM, 130);
    assert.ok(CRUISER.hullLengthM >= DRIFT.TRANSIT_MIN_HULL_M, '§4: the barge is worth its notice');
    assert.ok(HARVESTER.hullLengthM < DRIFT.TRANSIT_MIN_HULL_M, '§3: a tender is not');
    assert.ok(CORVETTE.hullLengthM < DRIFT.TRANSIT_MIN_HULL_M, '§4: nor is a corvette, at 80 m');
    assert.equal(DRIFT.TRANSIT_MIN_HULL_M, 95);
    // §4: a body plus a radius, in three dimensions — 102.5 m against the barge.
    assert.equal(SOUNDER.lengthM / 2 + CRUISER.hullLengthM / 2, 102.5);
    // §3: the tender's figures are the roster's, and the barge's silent figure
    // is 7.6 by the shipped curve and not the round 8 the plan gave it.
    assert.deepEqual([HARVESTER.sigIdle, HARVESTER.sigCruise], [18, 40]);
    assert.equal(silent(HARVESTER.sigIdle), 4.5);
    assert.equal(Number(silent(CRUISER.sigIdle).toFixed(1)), 7.6);
    assert.equal(SILENT_RUNNING.SIG_MAX, 8, '§13: the plan’s 8 is the curve’s ceiling at idle 60');
    assert.equal(Number(silent(CORVETTE.sigIdle).toFixed(1)), 5.3);
    assert.equal(Number(silent(SCOUT.sigIdle).toFixed(1)), 3.5);
  });

  it('arms Juno’s three and nobody else, and locks what was never grown', () => {
    // §3: the escort is live, "and not struck for the first time since the
    // furrow". The barge is unarmed, the tenders have no gun in the roster,
    // and the watch calls what it hears.
    for (const unit of party.units) {
      assert.equal(
        unit.armed,
        unit.role === 'escort' ? true : undefined,
        `${unit.tag}: armed does not match §3`
      );
    }
    const locked: string[] = SEEDING_RADICALS.locks.map((lock) => lock.ability).sort();
    assert.deepEqual(locked, ['construction', 'depthCharges', 'mines'], '§3: what is not grown');
    for (const live of ['weapons', 'torpedoes', 'noisemakers', 'activeSonar']) {
      assert.ok(!locked.includes(live), `§3, §4: ${live} is on the panel`);
    }
    for (const lock of SEEDING_RADICALS.locks) {
      assert.ok(lock.reason.trim().length > 0, `${lock.ability}: greyed out with no reason`);
    }
  });

  it('runs no ledger, holds nothing to an escort, and reserves the court’s empty slot', () => {
    assert.equal(SEEDING_RADICALS.sigBudget, 65, '§4: the barge with its systems live');
    assert.equal(SEEDING_RADICALS.sigBudget, CRUISER.sigCruise, '§4: the momentum’s own figure');
    assert.equal(SEEDING_RADICALS.silenceCeilingSig, 100, '§9: no silence order');
    assert.equal(SEEDING_RADICALS.debtCapS, 0);
    assert.equal(SEEDING_RADICALS.arrayTag, undefined, '§9: the ledger does not run');
    assert.equal(SEEDING_RADICALS.escortRadiusM, 0, '§9: nothing in this column waits for a gun');
    assert.equal(SEEDING_RADICALS.fauna, false, '§11: every creature is authored');
    assert.equal(SEEDING_RADICALS.playerFaction, party.faction, '§2: one faction on one slot');
    assert.notEqual(SEEDING_RADICALS.courtSlot, PLAYER, '§2: the court is not a party');
    assert.ok(
      SEEDING_RADICALS.parties.every((p) => p.slot !== SEEDING_RADICALS.courtSlot),
      '§2: the court’s slot is reserved and empty'
    );
  });
});

describe('the Bloomwright’s clock, as docs/mission-radicals.md §4 and §5 write it', () => {
  const moves = SEEDING_RADICALS.beats.filter((beat) => beat.kind === 'move');
  const column = ['the-barge', 'seed-one', 'seed-two', 'seed-three'];

  it('orders eleven legs at the minute and again at the half, to four hulls, eighty-eight times', () => {
    // §4, §13: the row nothing shipped had ever used. Twenty-two orders to each
    // of four hulls, and every one addressed to a hull on the player's own slot
    // — which is the mechanic and not a hole.
    assert.equal(moves.length, 88, '§13: eighty-eight move beats');
    const ticks = [...new Set(moves.map((beat) => beat.atTick))].sort((a, b) => a - b);
    assert.equal(ticks.length, 22, '§5: eleven legs, each ordered twice');
    assert.equal(ticks[0], T(1), '§9: the first order lands at 01:00');
    assert.equal(ticks[ticks.length - 1], T(11, 30), '§9: the last order lands at 11:30');
    for (let i = 1; i < ticks.length; i++) {
      assert.equal(
        ticks[i]! - ticks[i - 1]!,
        T(0, 30),
        '§4: a leg a minute, stood again at the half'
      );
    }
    const playerTags = new Set(
      SEEDING_RADICALS.parties
        .filter((party) => party.slot === PLAYER)
        .flatMap((party) => party.units.map((unit) => unit.tag))
    );
    for (const tick of ticks) {
      const here = moves.filter((beat) => beat.atTick === tick);
      assert.deepEqual(
        here.map((beat) => (beat.kind === 'move' ? beat.tag : '')),
        column,
        `${tick}: the order is addressed to the four seed hulls`
      );
      for (const beat of here) {
        assert.ok(
          playerTags.has(beat.kind === 'move' ? beat.tag : ''),
          'ordered on the player’s slot'
        );
      }
    }
  });

  it('sends both orders of a leg to §5’s waypoint, and carries the depth on every one', () => {
    // §4.2 — the mechanic: `applyDepth` clears Silent Running only for an order
    // *deeper* than the hull, so a re-order to a depth already reached costs a
    // silent column nothing and a column the player brought up is dived again
    // at seventy-two. A leg that dropped its depth on the re-order would delete
    // half the system.
    LEGS.forEach((leg, index) => {
      for (const tick of [leg.at, leg.at + T(0, 30)]) {
        const here = moves.filter((beat) => beat.atTick === tick);
        assert.equal(here.length, 4, `leg ${index + 1} at ${tick}: four hulls`);
        for (const beat of here) {
          if (beat.kind !== 'move') continue;
          assert.deepEqual(
            [beat.x, beat.y, beat.depthM],
            [leg.x, leg.y, leg.depthM],
            `leg ${index + 1}: §5's waypoint and depth, on both orders`
          );
        }
      }
    });
  });

  it('dives three times, each into a hunter’s band and out under it', () => {
    // §1, §5: 330, 850, 1,475, 2,300 — "each depth is ordered by somebody else,
    // at forty-five metres a second, at a SIG floor of 72", and every dive ends
    // fifty metres or more under the floor of the thing it passed.
    const dives = LEGS.filter((leg, i) => i > 0 && leg.depthM > LEGS[i - 1]!.depthM);
    assert.equal(dives.length, 3, '§5: three dives on the Bloomwright’s clock');
    assert.equal(DEPTH.DESCENT_RATE_MPS, 45, '§1: forty-five metres a second');
    assert.equal(DEPTH.DESCENT_SIG, 72, '§1: a SIG floor of 72');
    const seconds = (from: number, to: number) => (to - from) / DEPTH.DESCENT_RATE_MPS;
    assert.equal(Number(seconds(330, 850).toFixed(1)), 11.6, '§5: the first dive');
    // §5: held at the Descent's 900 m floor until the hull is over Districts
    // water, so the second dive is measured from the ground and not the order.
    assert.equal(Number(seconds(900, 1475).toFixed(1)), 12.8, '§5: the second dive');
    assert.equal(Number(seconds(1475, 2300).toFixed(1)), 18.3, '§5: the third dive');
    // §13: 1,475 and not the plan's 1,400 — 175 m under the floor of anything a
    // Draymaw will chase, fifteen further than a bite reaches.
    const draymawFloor = DRAYMAW.workingDepthM + DRAYMAW.depthBandM;
    assert.equal(draymawFloor, 1300, '§6: the pack works 500-1,300 m');
    assert.equal(1475 - draymawFloor, 175);
    assert.ok(
      1475 - draymawFloor > DRAYMAW.attackRangeM,
      '§12: a bite reaches a hundred and sixty'
    );
    // §6: 2,300 is 150 below the Hollows' band, and outside a bite of 110.
    const hollowFloor = HOLLOW.workingDepthM + HOLLOW.depthBandM;
    assert.equal(hollowFloor, 2150, '§6: 1,250-2,150 m');
    assert.equal(2300 - hollowFloor, 150);
    assert.ok(2300 - hollowFloor > HOLLOW.attackRangeM, '§6: the bite reaches 110');
  });

  it('orders every leg into water the ground admits at the depth it carries', () => {
    // The lane, as ground rather than as intention: the lock is roofed at
    // 1,300 m, the Districts floor at 1,600, the Commit at 2,400 — and an order
    // into rock is a column that stops (§11, and `terrain.ts`' `admits`).
    const match = radicalsMatch();
    for (let tick = 0; tick < SIM.TICK_HZ / SIM.ECHO_HZ; tick++) match.update(STEP_MS);
    const terrain = match.world.terrain;
    LEGS.forEach((leg, index) => {
      assert.ok(
        terrain.admits(leg.x, leg.y, leg.depthM),
        `leg ${index + 1}: ${leg.depthM} m over a floor of ${terrain.floorAt(leg.x, leg.y)} m ` +
          `and a ceiling of ${terrain.ceilingAt(leg.x, leg.y)} m`
      );
    });
    assert.equal(
      terrain.ceilingAt(LEGS[4]!.x, LEGS[4]!.y),
      1300,
      "§5: leg 5 is under the lock's roof"
    );
    assert.equal(
      terrain.floorAt(LEGS[7]!.x, LEGS[7]!.y),
      2400,
      "§5: the arch's foot is on trench paint"
    );
  });

  it('holds the four seed hulls to 01:00 by tag, and releases them on the same tick', () => {
    // §9, §13: `releaseTick` binds by tag rather than by role, and with
    // `escortRadiusM: 0` the escort half of the hold is off — every tender
    // reads as escorted, and the writ's own schedule keeps its force.
    const held = SEEDING_RADICALS.parties
      .flatMap((party) => party.units)
      .filter((unit) => unit.releaseTick !== undefined);
    assert.deepEqual(held.map((unit) => unit.tag).sort(), [...column].sort(), '§9: the column');
    for (const unit of held) assert.equal(unit.releaseTick, T(1));
    const releases = SEEDING_RADICALS.beats.filter((beat) => beat.kind === 'release');
    assert.equal(releases.length, 4);
    for (const beat of releases) assert.equal(beat.atTick, T(1));
    // Authored before the first `move` of the same tick, so the order lands on
    // a hull the runtime is no longer holding.
    const firstMove = SEEDING_RADICALS.beats.findIndex((beat) => beat.kind === 'move');
    const lastRelease = SEEDING_RADICALS.beats.reduce(
      (index, beat, i) => (beat.kind === 'release' ? i : index),
      -1
    );
    assert.ok(
      lastRelease < firstMove,
      '§11: a release beat on the same tick, before the first move'
    );
  });
});

describe('the basin, as docs/mission-radicals.md §6 places it', () => {
  const creatures = SEEDING_RADICALS.beats.filter((beat) => beat.kind === 'creature');

  it('places seven creatures at tick zero, none of them driven, at their species’ own depths', () => {
    // §9: `creature` x 7. §6 and `intake.ts`' row: committed to its own spawn
    // for no ticks at all, which hands it back to its trigger model. And every
    // spawn depth is the roster's, because a placed creature holds
    // `workingDepthM` whatever a beat spawns it at.
    const placed = creatures.filter((beat) => beat.atTick === 0);
    assert.equal(placed.length, 7, '§9: three shoals, a pack, two Hollows and the colossus');
    const expected: Record<string, number> = {
      'shoal-west': LAMPFRY.workingDepthM,
      'shoal-middle': LAMPFRY.workingDepthM,
      'shoal-east': LAMPFRY.workingDepthM,
      'the-descent-pack': DRAYMAW.workingDepthM,
      'gate-hollow-west': HOLLOW.workingDepthM,
      'gate-hollow-east': HOLLOW.workingDepthM,
      'the-colossus': SOUNDER.workingDepthM,
    };
    for (const beat of placed) {
      if (beat.kind !== 'creature') continue;
      assert.equal(beat.spawnAt?.depthM, expected[beat.tag], `${beat.tag}: not at working depth`);
      assert.deepEqual(beat.driveTo, { x: beat.spawnAt!.x, y: beat.spawnAt!.y }, 'driven at 00:00');
      assert.equal(beat.untilTick, 0, `${beat.tag}: a commitment that outlives the first pass`);
      assert.equal(beat.loud, false, `${beat.tag}: a placed animal is a precursor to nothing`);
    }
    // §11's figures, and the document's own claim about them.
    assert.deepEqual([LAMPFRY.workingDepthM, DRAYMAW.workingDepthM], [250, 900]);
    assert.deepEqual([HOLLOW.workingDepthM, SOUNDER.workingDepthM], [1700, 2000]);
  });

  it('draws the lane under the colossus’s Interest, by four points at its closest', () => {
    // §6's table, re-derived: what the lane is worth in its ears, through 1.6,
    // horizontally, against HYD 90. Nothing on the Bloomwright's clock is over
    // 55 — and the margin is four points at the tenth waypoint.
    const readings = LEGS.slice(5).map((leg) => ({
      leg,
      d: dist(leg, COLOSSUS),
      live: ratio(CRUISER.sigCruise, TRENCH, dist(leg, COLOSSUS), SOUNDER.hyd),
    }));
    const at = (y: number) => readings.find((row) => row.leg.y === y)!;
    assert.equal(Math.round(at(2375).d), 1299, '§5: the lock, 1,299 m off');
    assert.equal(Math.round(at(3000).d), 1090, "§5: the arch's foot");
    assert.equal(Math.round(at(3350).d), 808, '§5: the crossing');
    assert.equal(at(3650).d, 750, '§5: beside it, and never over it');
    assert.equal(Math.round(at(3900).d), 791, '§5: the far water');
    assert.equal(Number(at(2375).live.toFixed(1)), 21.0);
    assert.equal(Number(at(3000).live.toFixed(1)), 27.9);
    assert.equal(Number(at(3350).live.toFixed(1)), 45.0);
    assert.equal(Number(at(3650).live.toFixed(1)), 50.7, '§6: four under Interest, all mission');
    assert.equal(Number(at(3900).live.toFixed(1)), 46.6);
    assert.equal(SOUNDER.interest, 55);
    for (const row of readings) {
      assert.ok(row.live < SOUNDER.interest, `the lane at y=${row.leg.y} is over Interest`);
      assert.ok(
        ratio(silent(CRUISER.sigIdle), TRENCH, row.d, SOUNDER.hyd) < 6,
        'a silent barge is a margin of fifty rather than of four'
      );
    }
    // §6: the third dive reads 49.9, five under; a dive taken *at* the tenth
    // waypoint reads 56.1, which is one over, and that is the whole of what the
    // player can spend in one hold.
    assert.equal(
      Number(ratio(DEPTH.DESCENT_SIG, TRENCH, at(3350).d, SOUNDER.hyd).toFixed(1)),
      49.9
    );
    const divedBeside = ratio(DEPTH.DESCENT_SIG, TRENCH, 750, SOUNDER.hyd);
    assert.equal(Number(divedBeside.toFixed(1)), 56.1);
    assert.ok(divedBeside > SOUNDER.interest, '§6: one over, and four seconds of it is a call');
  });

  it('coils both Hollows on the third dive and is struck by neither', () => {
    // §6: down the middle of the doorway — 65.5 at the start and 45.9 at the
    // end against a coil at 45 — and the strike also needs 500 m in three
    // dimensions, which the lane never gives it.
    const archFoot = LEGS[7]!;
    const crossing = LEGS[8]!;
    assert.equal(dist(HOLLOW_WEST, HOLLOW_EAST), 1500, '§6: 1,500 m apart across the way in');
    assert.equal((HOLLOW_WEST.x + HOLLOW_EAST.x) / 2, crossing.x, '§9: down the middle');
    const start = dist(archFoot, HOLLOW_EAST);
    const end = dist(crossing, HOLLOW_WEST);
    assert.equal(Math.round(start), 633, '§5: 633 m from the east at the start');
    assert.equal(Math.round(end), 791, '§13: 791 m from the west at the end, not the plan’s 881');
    assert.equal(
      Math.round(dist(archFoot, HOLLOW_WEST)),
      881,
      '§5: the western one, from the foot'
    );
    assert.equal(Number(ratio(DEPTH.DESCENT_SIG, TRENCH, start, HOLLOW.hyd).toFixed(1)), 65.5);
    assert.equal(Number(ratio(DEPTH.DESCENT_SIG, TRENCH, end, HOLLOW.hyd).toFixed(1)), 45.9);
    assert.ok(ratio(DEPTH.DESCENT_SIG, TRENCH, start, HOLLOW.hyd) >= HOLLOW.interest, 'it coils');
    assert.ok(
      ratio(DEPTH.DESCENT_SIG, TRENCH, start, HOLLOW.hyd) < HOLLOW.commit,
      '§6: coiled, and under Commit'
    );
    assert.ok(start > DRIFT.HOLLOW_TRIGGER_RANGE_M, '§6: the strike also needs 500 m');
    assert.equal(DRIFT.HOLLOW_TRIGGER_RANGE_M, 500);
    // §6: 150 m east of the arch's foot is 485 m from the eastern Hollow, and
    // inside its sphere. The lane is drawn where it is for this reason.
    assert.equal(Math.round(dist({ x: archFoot.x + 150, y: archFoot.y }, HOLLOW_EAST)), 485);
  });

  it('passes the pack five points under its Interest, and prices the ping that wakes it', () => {
    // §6: the lane passes 791 m from the pack at the first dive and 783 at the
    // third waypoint, and nothing the column does from the lane is over
    // Interest 22 — by five points for the barge, four for a noisemaker. The
    // exception is the ping, Commit-loud from the whole Descent.
    assert.equal(Math.round(dist(LEGS[1]!, PACK)), 791, '§5: the first dive');
    assert.equal(Math.round(dist(LEGS[2]!, PACK)), 783, '§5: the closest the lane comes');
    assert.equal(DRAYMAW.interest, 22);
    const heard = (sig: number) => ratio(sig, CITY, dist(LEGS[2]!, PACK), DRAYMAW.hyd);
    assert.equal(Number(heard(CRUISER.sigCruise).toFixed(1)), 17.1, '§6: five under');
    assert.equal(Number(heard(DEPTH.DESCENT_SIG).toFixed(1)), 18.9);
    assert.equal(Number(heard(70).toFixed(1)), 18.4, '§6: a noisemaker, four under');
    for (const sig of [CRUISER.sigCruise, DEPTH.DESCENT_SIG, 70, 60, 68, CORVETTE.sigIdle]) {
      assert.ok(heard(sig) < DRAYMAW.interest, `${sig} from the lane wakes the pack`);
    }
    // §4, §6: the ping is tripled for three seconds — Commit-loud from 1,077 m,
    // and three seconds is not four.
    const ping = 95 * 3;
    assert.equal(rangeAt(ping, CITY, DRAYMAW.hyd, DRAYMAW.commit), 1077);
    assert.ok(heard(ping) > DRAYMAW.commit, '§6: the whole Descent, for three seconds');
    assert.equal(DRIFT.INTEREST_DWELL_S, 4, '§4: three seconds of a four-second dwell');
    assert.equal(DRIFT.COMMIT_AFTER_INTERESTED_S, 20, '§13: and twenty seconds later, whatever');
  });

  it('leaves every shoal whole at tick zero, and puts the middle one out on the first metre', () => {
    // §6, §13: the scatter is a three-dimensional proximity test that never
    // touches the Echo Layer, and it is public. The seats are placed so the
    // column's first metre south is the tell rather than tick zero being it.
    const party = SEEDING_RADICALS.parties.find((p) => p.slot === PLAYER)!;
    const shoals = SEEDING_RADICALS.beats.filter(
      (beat) => beat.kind === 'creature' && beat.species === FaunaSpecies.Lampfry
    );
    assert.equal(shoals.length, 3, '§6: three shoals across the Concourse’s southern edge');
    for (const beat of shoals) {
      if (beat.kind !== 'creature') continue;
      for (const unit of party.units) {
        const away = Math.hypot(
          unit.x - beat.spawnAt!.x,
          unit.y - beat.spawnAt!.y,
          unit.depthM - beat.spawnAt!.depthM
        );
        assert.ok(
          away > DRIFT.LAMPFRY_SCATTER_RADIUS_M,
          `${unit.tag} seats ${away.toFixed(0)} m from ${beat.tag}, inside the scatter`
        );
      }
    }
    assert.equal(DRIFT.LAMPFRY_SCATTER_RADIUS_M, 300);
    // The barge is 325 m from the middle shoal horizontally, 335 in three
    // dimensions — and the first leg south takes it inside.
    const barge = party.units.find((unit) => unit.tag === 'the-barge')!;
    assert.equal(Math.hypot(barge.x - 2500, barge.y - 725), 325);
    assert.ok(Math.hypot(LEGS[0]!.x - 2500, LEGS[0]!.y - 725) < DRIFT.LAMPFRY_SCATTER_RADIUS_M);
    assert.equal(LAMPFRY.interest, Number.POSITIVE_INFINITY, '§6: light, not sound');
  });

  it('drives the basin across the lane at 12:00, at the crossing’s depth, and leaves it there', () => {
    // §6, §9, §13: 1,500 m due east along the tenth waypoint's row, fifty
    // seconds at 30 m/s, climbing the 300 m to 2,300 in the first twenty-five —
    // so it is at the lane's depth as it crosses x 2,500 at about 12:25. Driven,
    // it is deaf and unhurt; released at 13:30, `holdCommitments` restores its
    // home depth and not its home position, so it cools where it stopped.
    const drive = creatures.find((beat) => beat.atTick === T(12))!;
    assert.equal(drive.kind, 'creature');
    if (drive.kind !== 'creature') return;
    assert.equal(drive.tag, 'the-colossus');
    assert.deepEqual(
      drive.driveTo,
      { x: 3250, y: 3650, depthM: 2300 },
      '§13: the beat says how deep'
    );
    assert.equal(drive.untilTick, T(13, 30));
    assert.equal(drive.loud, true, '§9: the loud beat the close is measured from');
    assert.equal(
      drive.spawnAt,
      undefined,
      'the colossus was placed at 00:00 and is not re-spawned'
    );
    assert.equal(drive.driveTo.y, LEGS[9]!.y, "§6: along the tenth waypoint's row");
    const run = drive.driveTo.x - COLOSSUS.x;
    assert.equal(run, 1500, '§6: 1,500 m due east');
    assert.equal(run / SOUNDER.speed, 50, '§6: fifty seconds at 30 m/s');
    assert.equal((drive.untilTick - drive.atTick) / SIM.TICK_HZ, 90, '§9: the drive is 90 s long');
    const climb = (2300 - SOUNDER.workingDepthM) / DRIFT.VERTICAL_SPEED_MPS;
    assert.equal(climb, 25, '§6: 300 m at 12 m/s, in the first twenty-five seconds');
    assert.ok(
      COLOSSUS.x + climb * SOUNDER.speed <= LEGS[9]!.x,
      '§6: at the crossing’s depth before it reaches the lane'
    );
    const crossesAt = drive.atTick + ((LEGS[9]!.x - COLOSSUS.x) / SOUNDER.speed) * SIM.TICK_HZ;
    assert.equal(crossesAt, T(12, 25), '§6: at x 2,500 at about 12:25');
    // §13: released where it stands, 783 m from the far water's marker.
    const marker = SEEDING_RADICALS.markers[0]!;
    assert.equal(Math.round(dist({ x: drive.driveTo.x, y: drive.driveTo.y }, marker)), 783);
    assert.equal(
      creatures.filter((beat) => beat.kind === 'creature' && beat.tag === 'the-colossus').length,
      2,
      '§9: no second creature beat is needed at 13:30, and none is authored'
    );
    // §6: a decoy buys target rather than distance — the colossus lies 250 m
    // from the Commit's western edge and 350 from its southern one.
    const commit = SORROWGATE.regions[6]!;
    assert.equal(COLOSSUS.x - commit.x, 250);
    assert.equal(commit.y + commit.heightM - COLOSSUS.y, 350);
  });
});

describe('what is heard, as docs/mission-radicals.md §7 prices it', () => {
  it('hands the column the basin at Track from the lock, and never takes it back', () => {
    // §7: the colossus idles at 45 through 1.6, which is Track to the barge's
    // HYD 65 from 2,378 m and Contact from 5,655 — so from the lock (1,299 m,
    // ratio 10.5) the column has it at a track for the whole crossing.
    const M = TIER_THRESHOLD_MULTIPLIER;
    assert.equal(rangeAt(SOUNDER.sigIdle, TRENCH, CRUISER.hyd, M.CONTACT), 5655);
    assert.equal(rangeAt(SOUNDER.sigIdle, TRENCH, CRUISER.hyd, M.TRACK), 2378);
    assert.equal(rangeAt(SOUNDER.sigIdle, TRENCH, CORVETTE.hyd, M.CONTACT), 4800);
    assert.equal(rangeAt(SOUNDER.sigIdle, TRENCH, CORVETTE.hyd, M.TRACK), 2018);
    const fromLock = dist(LEGS[5]!, COLOSSUS);
    assert.equal(Number(ratio(SOUNDER.sigIdle, TRENCH, fromLock, CRUISER.hyd).toFixed(1)), 10.5);
    for (const leg of LEGS.slice(5)) {
      assert.ok(
        ratio(SOUNDER.sigIdle, TRENCH, dist(leg, COLOSSUS), CRUISER.hyd) >= M.TRACK,
        `the column loses the basin at y=${leg.y}`
      );
    }
    // §7: the calling voice is Contact to the watch's HYD 70 from 9,757 m —
    // every hull under the layer, wherever it is.
    assert.equal(rangeAt(SOUNDER.sigActive, TRENCH, SCOUT.hyd, M.CONTACT), 9757);
    assert.equal(SOUNDER.sigActive, 100);
  });

  it('gives the watch a third of it, and the column nothing of the watch', () => {
    // §7's second table, priced with the thermocline's own pair factor rather
    // than with the biome PF — the span is solid at every depth, so the watch's
    // whole water is above the layer and everything it hears from the basin
    // crosses it.
    const M = TIER_THRESHOLD_MULTIPLIER;
    const across = TRENCH * THERMOCLINE.ACROSS;
    assert.equal(THERMOCLINE.ACROSS, 0.3);
    // The pack is on the watch's own side of the layer: five at a name from the
    // seat, and a bearing from the span's edge.
    assert.equal(Math.round(dist(SEAT, PACK)), 1310);
    assert.equal(Number(ratio(DRAYMAW.sigIdle, CITY, dist(SEAT, PACK), SCOUT.hyd).toFixed(1)), 3.2);
    assert.ok(
      ratio(DRAYMAW.sigIdle, CITY, dist(SEAT, PACK), SCOUT.hyd) >= M.CLASSIFICATION,
      '§7: five, at a name, from tick zero'
    );
    // The basin, at a third: nothing from the seat, a bearing from the edge.
    assert.equal(Math.round(dist(SEAT, COLOSSUS)), 3335);
    assert.equal(Math.round(dist(SPAN_EDGE, COLOSSUS)), 1718);
    assert.equal(rangeAt(SOUNDER.sigIdle, across, SCOUT.hyd, M.CONTACT), 2791);
    assert.ok(
      ratio(SOUNDER.sigIdle, across, dist(SEAT, COLOSSUS), SCOUT.hyd) < M.CONTACT,
      '§7: the seat cannot hear the basin at all'
    );
    assert.equal(
      Number(ratio(SOUNDER.sigIdle, across, dist(SPAN_EDGE, COLOSSUS), SCOUT.hyd).toFixed(1)),
      2.2
    );
    // And calling, from the edge: a track, which nothing on the plateau has
    // ever had (§12).
    assert.ok(
      ratio(SOUNDER.sigActive, across, dist(SPAN_EDGE, COLOSSUS), SCOUT.hyd) >= M.TRACK,
      '§12: we have got it at a track from here'
    );
    // §7: the column cannot hear the watch at all — a scout at 12 across the
    // layer is nothing to HYD 65 past 1,167 m, and the far water is 3,475 off.
    assert.equal(rangeAt(SCOUT.sigCruise, across, CRUISER.hyd, M.CONTACT), 1167);
    assert.equal(dist(SEAT, { x: 2500, y: 3875 }), 3475);
  });
});

describe('the objectives, as docs/mission-radicals.md §8 chooses them', () => {
  it('reads four rows in §12’s order: two terminal, two standing, and no keystone', () => {
    assert.deepEqual(
      SEEDING_RADICALS.objectives.map((objective) => objective.id),
      ['the-column', 'the-seed', 'the-escorts', 'the-households'],
      '§12: four rows, four lines, and no fifth'
    );
    const terminal = SEEDING_RADICALS.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => o.id),
      ['the-column', 'the-seed'],
      '§8: the ladder'
    );
    for (const objective of SEEDING_RADICALS.objectives) {
      assert.notEqual(objective.keystone, true, '§8: the Commune closes nothing');
      assert.ok(objective.reading !== undefined, `${objective.id}: read out at the close`);
      assert.ok(objective.reading!.met.trim().length > 0);
      assert.ok(objective.reading!.unmet.trim().length > 0);
      assert.equal(objective.initial, ObjectiveStatus.Pending);
      assert.equal(objective.revealAtTick, undefined, '§8: revealed at 00:00, all four');
    }
    assert.deepEqual(objectiveById('the-column').predicate, {
      kind: 'extract',
      role: 'tender',
      region: 'the-far-water',
      count: 4,
    });
    assert.deepEqual(objectiveById('the-seed').predicate, {
      kind: 'extract',
      role: 'tender',
      region: 'the-far-water',
      count: 2,
    });
    assert.deepEqual(objectiveById('the-escorts').predicate, {
      kind: 'survive',
      role: 'escort',
      count: 3,
    });
    assert.deepEqual(objectiveById('the-households').predicate, {
      kind: 'survive',
      role: 'tender',
      count: 4,
    });
    // §8: the count is hulls, the reading is people, and the seed is not
    // counted at all — no `loaded` flag and no lift to hang one on.
    assert.equal(SEEDING_RADICALS.lifts, undefined);
    assert.equal(SEEDING_RADICALS.walk, undefined);
    assert.equal(SEEDING_RADICALS.soundings, undefined);
    assert.equal(SEEDING_RADICALS.holds, undefined);
    assert.equal(SEEDING_RADICALS.sweep, undefined);
    assert.equal(SEEDING_RADICALS.commanderAbility, undefined);
    // §8: no tolerance row, and none possible — exposure is read off other
    // parties' listeners and the Drift is not one.
    assert.ok(
      SEEDING_RADICALS.objectives.every((o) => o.predicate.kind !== 'tolerance'),
      '§8: the force stands at Tier 0 in everybody’s ears all mission'
    );
  });

  it('latches the crossing and re-derives what is standing', () => {
    // §13 and `predicates.ts`' `isStanding`: `extract` is a thing that
    // happened — the latch the judge's rule warns of is the fact the row wants,
    // because nobody is in the far water at tick zero and a hull that reaches
    // it has crossed. `survive` is a sentence about now, so a tender the basin
    // took is a household the close reads short beneath a `the-column` that
    // stays met.
    assert.equal(isStanding(objectiveById('the-column').predicate), false);
    assert.equal(isStanding(objectiveById('the-seed').predicate), false);
    assert.equal(isStanding(objectiveById('the-escorts').predicate), true);
    assert.equal(isStanding(objectiveById('the-households').predicate), true);
    // The trap under the latch, checked: no seed hull is in the far water at
    // tick zero, so neither terminal row is met on the first pass — which is
    // why §8 can leave `runsItsLength` unauthored.
    const region = SEEDING_RADICALS.regions.find((r) => r.id === 'the-far-water')!;
    assert.equal(SEEDING_RADICALS.runsItsLength, undefined, '§8: the court’s rule, kept');
    for (const unit of SEEDING_RADICALS.parties.flatMap((party) => party.units)) {
      const inside =
        unit.x >= region.x &&
        unit.x <= region.x + region.widthM &&
        unit.y >= region.y &&
        unit.y <= region.y + region.heightM;
      assert.equal(inside, false, `${unit.tag} is seated in the far water at tick zero`);
    }
  });

  it('closes on a resolve that is not a conclusion, three minutes after the basin moves', () => {
    const resolve = SEEDING_RADICALS.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.atTick, T(15), '§9: fifteen minutes');
    assert.equal(
      resolve.kind === 'resolve' ? resolve.conclusion : true,
      undefined,
      '§8: a failure'
    );
    const [low, high] = SEEDING_RADICALS.lengthBandS;
    assert.deepEqual([low, high], [840, 960], '§9: the header’s band');
    assert.ok(resolve.atTick / SIM.TICK_HZ >= low && resolve.atTick / SIM.TICK_HZ <= high);
    const loud = SEEDING_RADICALS.beats.filter((beat) => beat.kind === 'creature' && beat.loud);
    assert.equal(loud.length, 1, '§9: one loud beat, and it is the basin rising');
    const leadS = (resolve.atTick - loud[0]!.atTick) / SIM.TICK_HZ;
    assert.equal(leadS, 180, '§8: 180 s, against campaign.md §10’s sixty');
    assert.ok(leadS >= MISSION.FAILURE_TELEGRAPH_S);
  });

  it('fires the watch’s line before Anholt’s, so hers is last in the log', () => {
    // §9: both conditions come true on the pass all four arrive, and beats due
    // on one pass fire in authored order — so the watch's tally line is
    // authored first and Anholt's stands last, on the pass the mission closes.
    const conditionals = SEEDING_RADICALS.conditionalBeats ?? [];
    assert.equal(conditionals.length, 2, '§9: two conditional beats');
    assert.deepEqual(
      conditionals.map((beat) => (beat.when.kind === 'extract' ? beat.when.count : NaN)),
      [1, 4],
      '§12: the watch on the first hull, then Anholt on the fourth'
    );
    for (const beat of conditionals) {
      assert.equal(beat.kind, 'say');
      assert.equal(beat.choiceGroup, undefined, 'neither line retires the other');
      assert.deepEqual(beat.when.kind === 'extract' ? [beat.when.role, beat.when.region] : [], [
        'tender',
        'the-far-water',
      ]);
    }
    assert.match(
      conditionals[1]!.kind === 'say' ? conditionals[1]!.text : '',
      /We're through/,
      '§12, verbatim'
    );
  });

  it('reads all three of Marr’s results, in the register', () => {
    assert.match(SEEDING_RADICALS.epilogue[MissionOutcome.Complete], /^We asked you to take them/);
    assert.match(
      SEEDING_RADICALS.epilogue[MissionOutcome.Partial],
      /^Some of the seed's in the basin/
    );
    assert.match(SEEDING_RADICALS.epilogue[MissionOutcome.Lost], /^The basin has the column/);
    // §8: none of the three is a rank, and the middle one is a result.
    assert.match(SEEDING_RADICALS.epilogue[MissionOutcome.Partial], /This is a result/);
    // §12: "the reading of the count, per §8, and then one sentence she should
    // not say aloud and does" — she says it under all three, and the close
    // moves (§9: at the far water by about 11:10, or from the Concourse at
    // 15:00), so it rides the epilogue rather than a `say` beat at T(15) that
    // a column which got through would never hear.
    const marr =
      "Thirty years of not owning any of it, and tonight thirty-three people went where I said they shouldn't, " +
      "with our guns beside them, and I find I'd like to own that. I'm not going to. I'd like it heard that I'd like to.";
    for (const outcome of [MissionOutcome.Complete, MissionOutcome.Partial, MissionOutcome.Lost]) {
      const reading = SEEDING_RADICALS.epilogue[outcome];
      assert.ok(
        reading.endsWith(marr),
        `${MissionOutcome[outcome]}: Marr’s last sentence is not on it`
      );
      // §8, §12: the count's reading is still verbatim, and still first.
      assert.ok(
        reading.slice(0, reading.length - marr.length).trim().length > 0,
        `${MissionOutcome[outcome]}: the sentence replaced the reading rather than following it`
      );
    }
  });
});

describe('the crossing, played', () => {
  it('takes every order, is through by about 11:10, and closes there', () => {
    // §9: "a column that takes every order is in the far water by about 11:10
    // and the mission closes there" — the count is read at the far water. The
    // player gives no order at all: every metre of this run is the beat table
    // moving hulls on the player's own slot, which is the row §13 spends.
    const run = runOut(radicalsMatch());
    assert.equal(run.outcome, MissionOutcome.Complete, `closed as ${run.outcome}`);
    assert.ok(
      run.resolvedAtTick >= T(11) && run.resolvedAtTick <= T(11, 45),
      `§9: through by about 11:10 — closed at ${(run.resolvedAtTick / SIM.TICK_HZ).toFixed(1)} s`
    );
    assert.ok(run.resolvedAtTick < T(12), '§9: closed before the basin ever moved');
    for (const id of ['the-column', 'the-seed', 'the-escorts', 'the-households']) {
      assert.equal(
        run.objectives.find((objective) => objective.id === id)?.status,
        ObjectiveStatus.Met,
        `${id}: not met by a column that took every order`
      );
    }
    assert.match(run.epilogue, /We're going to call it a tide/, '§8: the Complete reading');
    // §12, in the close the player actually gets: the count, then Marr's own
    // last sentence, then the four objective readings beneath, in authored
    // order and all four of them (§8).
    const [read, ...beneath] = run.epilogue.split('\n\n');
    assert.match(read!, /I'd like it heard that I'd like to\.$/, '§12: her sentence, last of hers');
    assert.deepEqual(
      beneath.join('\n\n').split('\n'),
      SEEDING_RADICALS.objectives.map((objective) => objective.reading!.met),
      '§8: all four readings, in authored order, beneath the row the run earned'
    );
    // §9: Anholt's line fires on the pass the-column is met, and stands last.
    const last = run.lines[run.lines.length - 1]!;
    assert.match(last.text, /We're through/, '§9: the last line in the log');
    assert.match(last.speaker, /Anholt/);
    const watch = run.lines.filter((line) => line.text.startsWith("One's in the far water"));
    assert.equal(watch.length, 1, '§12: the tally line, once');
    assert.ok(watch[0]!.tick <= last.tick, '§12: the watch calls the first hull before Anholt');
    // The voices of §12, in the water, on the ticks §9 gives them.
    const spoken = run.lines.map((line) => line.tick);
    assert.deepEqual(
      spoken.slice(0, 4),
      [T(0, 0) + SIM.TICK_HZ / SIM.ECHO_HZ, T(0, 30), T(2, 30), T(4, 30)],
      '§9: the watch at 00:00 (on the first pass), Anholt at 00:30, Teel at 02:30, the watch at 04:30'
    );
  });

  it('is held against the Bloomwright, and is read from the Concourse at 15:00', () => {
    // §4: the order is an ordinary order and the player may countermand it —
    // "for thirty seconds at a time, by hand". Here the countermand never
    // stops: the column is ordered back to the seat on every Echo pass, which
    // is the only way to beat a table that re-orders it twice a minute. §9's
    // third sentence: a column that never went is read from the Concourse at
    // 15:00, through the basin rising at 12:00.
    const run = runOut(radicalsMatch(), (own, match) => {
      if (own.tick < T(1)) return;
      for (const unit of own.units) {
        if (unit.kind !== UnitKind.Cruiser && unit.kind !== UnitKind.Harvester) continue;
        match.orderMove(PLAYER, unit.id, SEAT.x, SEAT.y, false);
        match.orderDepth(PLAYER, unit.id, 330);
      }
    });
    assert.equal(run.resolvedAtTick, T(15), '§9: the close does not move because the player held');
    assert.equal(run.outcome, MissionOutcome.Lost, '§8: fewer than two in the far water');
    assert.match(run.epilogue, /^The basin has the column/);
    assert.equal(
      run.objectives.find((objective) => objective.id === 'the-column')?.status,
      ObjectiveStatus.Pending
    );
    // §8: the two standing rows are read beneath it and rank nothing — nobody
    // was lost, because a column that never went was never in anybody's water.
    assert.equal(
      run.objectives.find((objective) => objective.id === 'the-households')?.status,
      ObjectiveStatus.Met,
      '§8: four hulls, thirty-three, and a result that is still Lost'
    );
    assert.equal(
      run.objectives.find((objective) => objective.id === 'the-escorts')?.status,
      ObjectiveStatus.Met
    );
    // §9, §12: the basin rises at 12:00 and the watch says so at 12:15 and
    // again at 13:30 — three minutes of the loudest thing on the map before
    // anything closes.
    assert.ok(
      run.lines.some((line) => line.tick === T(12, 15) && line.text.startsWith("It's up.")),
      '§12: the watch, at the span’s edge'
    );
    assert.ok(
      run.lines.some((line) => line.tick === T(13, 30) && line.text.startsWith("It's stopped")),
      '§12: the watch, at 13:30'
    );
    assert.ok(
      !run.lines.some((line) => line.text.startsWith("One's in the far water")),
      '§12: nothing arrived, so the tally says nothing'
    );
  });
});
