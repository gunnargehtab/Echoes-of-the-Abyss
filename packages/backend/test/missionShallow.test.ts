/**
 * The Attending 4, read and run — docs/mission-shallow.md.
 *
 * `missions.test.ts` holds every mission to campaign.md §10's conventions;
 * this file holds Shallow to the things only its own document claims, and to
 * the two places the literal had to disagree with it:
 *
 * - **The system is the water** (§4, §13). The Directorate's shallow-water
 *   penalty is built and this is the first mission to fire it: every hull is
 *   seated inside `inDirectorateShallows` at tick zero, the speed table is
 *   ×0.8 composed multiplicatively with Silent Running, and the hull table is
 *   `DIRECTORATE_SHALLOW.HULL_FLOOR` on a roster that adds to 3,840.
 * - **Silent Running's SIG is the hull's, not the band's** (§13, "the one
 *   place a reader is most likely to mis-derive this document"). Re-derived
 *   here from `SILENT_RUNNING` rather than read off `acoustics.ts`, and then
 *   spent on §3's four readings at the seat.
 * - **None of the ten rows at Tier 2 from the slope** (§4, §7, §13). §13 asks
 *   for this "by re-deriving it rather than by copying these numbers", so the
 *   slope is swept against all ten rows through `pathPropagation` and the
 *   assertion is the tier, not the figure.
 * - **The transcript is a walk** (§7, §8): two stations 325 m apart, five rows
 *   each and six between them, and nothing audible from the seat.
 * - **The three askings are ordered by arithmetic** (§9, §13), because
 *   `tolerance` counts ticks at its tier *or better* and `choiceGroup` retires
 *   siblings rather than sequencing them.
 * - **The concern is one slot** (§2, and the literal's header), which this
 *   file justifies by measuring the frame's guns against the escort's seats.
 * - **The escort's eastern leg is x 2,750** (§9's x 2,800, corrected), which
 *   this file justifies by measuring a Consortium Cruiser's gun against the
 *   Chorister seat through the water column — and then by running a column
 *   that never moves out to the tide's turn and finding it whole.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEPTH_BANDS,
  DIRECTORATE_SHALLOW,
  DIRECTORATE_SHALLOW_BLEED_PER_S,
  DepthBand,
  Faction,
  FaunaSpecies,
  MISSION,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SILENT_RUNNING,
  SIM,
  StructureKind,
  TIER_THRESHOLD_MULTIPLIER,
  UnitKind,
  damageMultiplierFor,
  depthBandFor,
  detectionRatio,
  faunaStatsFor,
  inDirectorateShallows,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { KELL_SHOULDER, mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import {
  ATTENDING_SHALLOW,
  MissionRuntime,
  PROLOGUE_SORROWGATE,
  SEEDING_THIN_WATER,
  dueConditionalBeats,
  exposedAtLeast,
  type MissionCommandSink,
  type MissionDefinition,
} from '../src/sim/missions/index.ts';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { createSimWorld } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
const PLAYER = ATTENDING_SHALLOW.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const CHORISTER = statsFor(UnitKind.Chorister);
const SUBMERSIBLE = statsFor(UnitKind.AbyssalSubmersible);
const CRUISER = statsFor(UnitKind.Cruiser);
const CORVETTE = statsFor(UnitKind.Corvette);
const TURRET = structureStatsFor(StructureKind.SentinelTurret);
const DRAYMAW = faunaStatsFor(FaunaSpecies.Draymaw);

/** The map's own terrain, so every ratio below runs the path the mission runs. */
const terrain = terrainFor(KELL_SHOULDER);

interface Point {
  x: number;
  y: number;
}

/** §3, §11 — the westmost Chorister's seat, and the metre §7 measures the corridor from. */
const CHORISTER_SEAT: Point = { x: 3350, y: 2200 };
/** §3 — the western submersible's seat. §7's "a submersible at the seat". */
const EARS_SEAT: Point = { x: 3400, y: 2350 };
/** §3 — the Cruiser hull's, and the loudest thing the column owns. */
const CRUISER_SEAT: Point = { x: 3525, y: 2325 };
/** §7 — the two standings on the strip that each hold five of Marr's six rows. */
const STATION_WEST: Point = { x: 900, y: 1850 };
const STATION_EAST: Point = { x: 1225, y: 1850 };

/**
 * §7's arithmetic, as the document does it: `SIG × PF × HYD ÷ 7.35 × (100/d)^1.6`
 * with PF the path mean over the terrain grid. Nothing here is the Echo
 * Layer's own code path — it is `detectionRatio` over `pathPropagation`, which
 * is what the document measured with.
 */
function ratio(sig: number, from: Point, to: Point, hyd: number): number {
  const pf = terrain.pathPropagation(from.x, from.y, to.x, to.y);
  return detectionRatio(sig, pf, Math.hypot(to.x - from.x, to.y - from.y), hyd);
}

const rangeM = (from: Point, to: Point): number => Math.hypot(to.x - from.x, to.y - from.y);

/**
 * §13's formula, restated from the prose rather than from the implementation:
 * "`3 + 5 x min(1, sigIdle / 60)`", written out of `SILENT_RUNNING`'s own two
 * ends so a retune of the band moves this with it. `acoustics.ts`'
 * `silentRunningSig` is private and deliberately not imported: the two arrive
 * at the same answer by different arithmetic or one of them is wrong.
 */
function silentSig(idleSig: number): number {
  const t = Math.min(1, Math.max(0, idleSig / 60));
  return SILENT_RUNNING.SIG_MIN + (SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN) * t;
}

/** Rounded the way §1, §3, §5 and §7 print their figures. */
const to2 = (value: number): number => Math.round(value * 100) / 100;
const to1 = (value: number): number => Math.round(value * 10) / 10;

const player = ATTENDING_SHALLOW.parties.find((party) => party.slot === PLAYER)!;
const concern = ATTENDING_SHALLOW.parties.find(
  (party) => party.slot !== PLAYER && (party.structures ?? []).length > 0
)!;
const voices = ATTENDING_SHALLOW.parties.find((party) => (party.emitters ?? []).length > 0)!;
const byId = (id: string) => ATTENDING_SHALLOW.objectives.find((o) => o.id === id)!;
const unit = (tag: string) =>
  ATTENDING_SHALLOW.parties.flatMap((party) => party.units).find((u) => u.tag === tag)!;
const emitter = (tag: string) =>
  ATTENDING_SHALLOW.parties.flatMap((party) => party.emitters ?? []).find((e) => e.tag === tag)!;

/** The ten attendable rows and the two bells, in authored order. */
const attendable = (voices.emitters ?? []).filter((e) => e.reading !== undefined);
const bells = (voices.emitters ?? []).filter((e) => e.reading === undefined);

describe('the Kell Shoulder, reused across campaigns — docs/mission-shallow.md §11', () => {
  it('resolves to the same literal Thin Water plays on, unrepainted', () => {
    // §11: "Reused unchanged, literal for literal". The sharp form of that
    // claim is not a table of rectangles — `missionThinWater.test.ts` already
    // holds those — it is that both missions resolve to the *same object*, so
    // a repaint for one is a repaint for the other and neither can drift.
    assert.equal(ATTENDING_SHALLOW.mapId, SEEDING_THIN_WATER.mapId, '§11: the same rock');
    assert.equal(missionMapById(ATTENDING_SHALLOW.mapId), KELL_SHOULDER);
    assert.equal(mapById('kell-shoulder'), undefined, 'the skirmish screen would offer it');
    assert.equal(KELL_SHOULDER.seats, 1, '§11: one seat, not balanced');
    assert.equal(KELL_SHOULDER.floorM, 340, '§11: base floor 340');
  });

  it('puts only the corridor and the slope under the four-hundred-metre line', () => {
    // §1 and §4, as terrain rather than as prose: the Shoulder's floor is
    // 340 m, the Marr Approach's 280 and the Holdfast Gate's 260 — all Shelf,
    // all inside the penalty — and the only water on this map a Directorate
    // hull can stand in without paying is the spur at 420 and the slope at 900.
    const shelfFloors = KELL_SHOULDER.regions
      .map((region) => region.floorM!)
      .filter((floor) => depthBandFor(floor) === DepthBand.Shelf);
    assert.deepEqual(
      shelfFloors.sort((a, b) => a - b),
      [260, 280, 300, 340]
    );
    const under = KELL_SHOULDER.regions
      .filter((region) => depthBandFor(region.floorM!) !== DepthBand.Shelf)
      .map((region) => region.floorM!)
      .sort((a, b) => a - b);
    assert.deepEqual(under, [420, 620, 900], '§11: the spur, the under-run and the slope');
    assert.equal(DEPTH_BANDS[DepthBand.Shelf].max, 400, '§4: the line is at four hundred');
  });

  it('seats the frame, the closure and the pack exactly where Thin Water does', () => {
    // §11's "same rock, same closure, same warden, same turrets, same pack",
    // measured against the other campaign's literal rather than against a
    // number copied out of this one's document. Nothing but a shared literal
    // could make these agree, which is the whole of what the reuse claims.
    const thinFrame = SEEDING_THIN_WATER.parties.flatMap((party) => party.structures ?? []);
    for (const turret of concern.structures ?? []) {
      const twin = thinFrame.find((candidate) => candidate.tag === turret.tag)!;
      assert.deepEqual(
        [turret.x, turret.y, turret.depthM, turret.kind],
        [twin.x, twin.y, twin.depthM, twin.kind],
        `${turret.tag}: the frame moved between campaigns`
      );
    }
    for (const tag of ['element-one', 'element-two']) {
      const mine = unit(tag);
      const theirs = SEEDING_THIN_WATER.parties
        .flatMap((party) => party.units)
        .find((candidate) => candidate.tag === tag)!;
      // The seats are Thin Water's *west-end* coordinates, which that mission
      // reaches by a beat at 13:00 and this one starts from (§5).
      const walk = SEEDING_THIN_WATER.beats.filter(
        (beat) => beat.kind === 'move' && beat.tag === tag
      );
      const last = walk[walk.length - 1]!;
      assert.equal(theirs.kind, mine.kind, `${tag}: a different hull`);
      assert.deepEqual(
        [mine.x, mine.y],
        [last.kind === 'move' ? last.x : NaN, last.kind === 'move' ? last.y : NaN],
        `${tag}: not where Thin Water left it`
      );
    }
    const packHere = ATTENDING_SHALLOW.beats.filter((beat) => beat.kind === 'creature');
    const packThere = SEEDING_THIN_WATER.beats.filter((beat) => beat.kind === 'creature');
    assert.equal(packHere.length, 2, '§9: two Draymaws, and nothing else alive');
    assert.deepEqual(
      packHere.map((beat) => (beat.kind === 'creature' ? [beat.spawnAt!.x, beat.spawnAt!.y] : [])),
      packThere.map((beat) => (beat.kind === 'creature' ? [beat.spawnAt!.x, beat.spawnAt!.y] : [])),
      "§9: Thin Water's own points"
    );
  });
});

describe('the column, as docs/mission-shallow.md §2 and §3 seat it', () => {
  it('is eleven hulls in two roles, armed, and already above the line', () => {
    assert.equal(
      player.units.length,
      11,
      '§2: one Cruiser hull, two submersibles, eight Choristers'
    );
    const cohort = player.units.filter((u) => u.role === 'cohort');
    const ears = player.units.filter((u) => u.role === 'ears');
    assert.equal(
      cohort.length,
      8,
      '§3: the cohort hull, fielded above the line for the first time'
    );
    assert.equal(ears.length, 3, '§3: the two submersibles and the Cruiser hull');
    assert.deepEqual(
      ears.map((u) => u.kind).sort(),
      [UnitKind.Cruiser, UnitKind.AbyssalSubmersible, UnitKind.AbyssalSubmersible].sort()
    );
    for (const hull of player.units) {
      assert.equal(hull.armed, true, '§3: all eleven are armed');
      assert.equal(hull.depthM, 340, '§3: seated on the shoulder at 340 m');
      assert.equal(hull.pressureRating, undefined, '§11: the roster’s rating, no refit');
      assert.ok(
        statsFor(hull.kind).pressureRating >= requiredPressureRating(hull.depthM),
        `${hull.tag}: not rated for the water it is seated in`
      );
      // §4's first movement, and the reason the mission needs no beat to
      // deliver its own system: every hull is inside the penalty at tick zero.
      assert.equal(
        inDirectorateShallows(Faction.Directorate, hull.depthM),
        true,
        `${hull.tag}: seated below the line, and the mission is about being above it`
      );
    }
    assert.equal(player.structures, undefined, '§3: no structures, no production, no repair');
    assert.equal(player.emitters, undefined);
  });

  it('stands the eight Choristers in fifty-metre steps between the frame and the Kell face', () => {
    const seats = player.units.filter((u) => u.role === 'cohort').map((u) => [u.x, u.y] as const);
    assert.deepEqual(
      seats,
      [3350, 3400, 3450, 3500, 3550, 3600, 3650, 3700].map((x) => [x, 2200] as const),
      '§3: (3350, 2200) to (3700, 2200) in fifty-metre steps'
    );
    assert.deepEqual(
      player.units.filter((u) => u.kind === UnitKind.AbyssalSubmersible).map((u) => [u.x, u.y]),
      [
        [3400, 2350],
        [3650, 2350],
      ]
    );
    assert.deepEqual([unit('cruiser-hull').x, unit('cruiser-hull').y], [3525, 2325]);
  });

  it('withholds the yard and the ordnance and leaves the ping on the panel', () => {
    // §3: active sonar is carried, live and unlocked — the mission refuses
    // nothing and prices it instead. Construction, mines and depth charges are
    // the three it does strike, each with the column's own reason attached.
    const locked = new Set(ATTENDING_SHALLOW.locks.map((lock) => lock.ability));
    assert.ok(locked.has('construction'), '§3: nothing is built on somebody else’s shoulder');
    assert.ok(locked.has('mines'), '§3: nothing is left in water the plateaus tend');
    assert.ok(locked.has('depthCharges'));
    assert.ok(!locked.has('activeSonar'), '§3: the button buys nothing and is not fenced');
    assert.ok(!locked.has('weapons'), '§3: weapons, torpedoes and noisemakers are live');
    assert.ok(!locked.has('torpedoes'));
    assert.ok(!locked.has('noisemakers'));
    for (const lock of ATTENDING_SHALLOW.locks) {
      assert.ok(lock.reason.trim().length > 0, `${lock.ability} is refused without a reason`);
    }
    // §9: no silence order. The ledger never runs — the plateaus' hush at the
    // watch-edge is courtesy, and enforcing it would price somebody else's
    // manners as the Directorate's law (§2, §13).
    assert.equal(ATTENDING_SHALLOW.silenceCeilingSig, 100);
    assert.equal(ATTENDING_SHALLOW.debtCapS, 0);
    assert.equal(ATTENDING_SHALLOW.arrayTag, undefined, '§2: no lent array');
    assert.equal(ATTENDING_SHALLOW.escortRadiusM, 0, '§3: no held freight');
    assert.equal(ATTENDING_SHALLOW.fauna, false, '§10: the pack is authored, and it is all of it');
  });
});

describe('altitude, as a cost — docs/mission-shallow.md §4', () => {
  it('reads §4’s speed table off the two multipliers, composed', () => {
    // §4's second movement: ×0.8 follows the hull rather than the map and
    // stacks multiplicatively with Silent Running's ×0.55. Derived here so a
    // retune of either constant moves the table rather than breaking it.
    const above = (speed: number) => to1(speed * DIRECTORATE_SHALLOW.SPEED_MULTIPLIER);
    const silent = (speed: number) =>
      to1(speed * DIRECTORATE_SHALLOW.SPEED_MULTIPLIER * SILENT_RUNNING.SPEED_MULTIPLIER);
    assert.equal(CHORISTER.speed, 40, '§3: the slowest combat hull in the game');
    assert.deepEqual([above(CHORISTER.speed), silent(CHORISTER.speed)], [32, 17.6]);
    assert.deepEqual([above(SUBMERSIBLE.speed), silent(SUBMERSIBLE.speed)], [48, 26.4]);
    assert.deepEqual([above(CRUISER.speed), silent(CRUISER.speed)], [36, 19.8]);
    // "A Consortium Corvette crosses the shoulder at eighty-five and pays
    // nothing while a Chorister crosses it at thirty-two."
    assert.equal(CORVETTE.speed, 85);
    assert.equal(inDirectorateShallows(Faction.Bathyarch, 340), false, '§4: the penalty is theirs');
  });

  it('reads §4’s hull table off the floor, and finishes the bleed in twenty seconds', () => {
    const floored = (hp: number) => Math.round(hp * DIRECTORATE_SHALLOW.HULL_FLOOR);
    assert.deepEqual(
      [floored(CHORISTER.maxHp), floored(SUBMERSIBLE.maxHp), floored(CRUISER.maxHp)],
      [170, 442, 1020],
      '§4: fifteen in a hundred, once'
    );
    const whole = 8 * CHORISTER.maxHp + 2 * SUBMERSIBLE.maxHp + CRUISER.maxHp;
    assert.equal(whole, 3840, '§4: the column entire');
    assert.equal(floored(whole), 3264, '§4: and thereafter');
    // §4, §13: 0.75% of maximum hull per second, derived as (1 − 0.85) / 20,
    // so retuning the twenty seconds retunes the rate and nothing else.
    assert.equal(to2(DIRECTORATE_SHALLOW_BLEED_PER_S * 1000) / 10, 0.75);
    assert.equal(
      (1 - DIRECTORATE_SHALLOW.HULL_FLOOR) / DIRECTORATE_SHALLOW_BLEED_PER_S,
      20,
      '§9: the stalls say so at 00:20'
    );
  });

  it('gives the speed back inside the posted closure and refunds nothing else', () => {
    // §4's most uncomfortable single fact: the spur's floor is 420 m, which is
    // Mid-Water, which is not the Shelf — so a Chorister standing in the
    // closure walks at forty again against thirty-two on the rock above it,
    // and the fifteen per cent is already spent and does not come back.
    const spur = KELL_SHOULDER.regions.find((region) => region.floorM === 420)!;
    assert.equal(depthBandFor(spur.floorM!), DepthBand.MidWater);
    assert.equal(inDirectorateShallows(Faction.Directorate, spur.floorM!), false);
    assert.equal(inDirectorateShallows(Faction.Directorate, KELL_SHOULDER.floorM!), true);
    assert.equal(
      to1(CHORISTER.speed) - to1(CHORISTER.speed * DIRECTORATE_SHALLOW.SPEED_MULTIPLIER),
      8,
      '§4: eight metres a second, bought with a descent'
    );
  });

  it('sets the budget at one Chorister under way', () => {
    // §4: "SIG budget: 24 — one Chorister under way, and the figure is the
    // hull's own cruise number", against a Cruiser hull that idles at more
    // than twice it. Metadata, never a live threshold (types.ts, `sigBudget`).
    assert.equal(ATTENDING_SHALLOW.sigBudget, CHORISTER.sigCruise);
    assert.equal(ATTENDING_SHALLOW.sigBudget, 24);
    assert.ok(CRUISER.sigIdle > 2 * ATTENDING_SHALLOW.sigBudget, '§4: the ears travel silent');
  });
});

describe("Silent Running's SIG is the hull's, not the band's — §13", () => {
  it('sits every hull in the 3–8 band by its own idle figure', () => {
    assert.equal(to1(silentSig(CHORISTER.sigIdle)), 4.3, '§1: a Chorister runs silent at 4.3');
    assert.equal(to1(silentSig(SUBMERSIBLE.sigIdle)), 4.8);
    assert.equal(to1(silentSig(CRUISER.sigIdle)), 7.6);
    assert.equal(to1(silentSig(CORVETTE.sigIdle)), 5.3);
    // "...and only a hull idling at 60 reaches the eight."
    assert.equal(silentSig(60), SILENT_RUNNING.SIG_MAX);
    assert.ok(silentSig(CRUISER.sigIdle) < SILENT_RUNNING.SIG_MAX, '§13: not the ceiling');
    // §13: taking the eight would inflate a Chorister's silent ranges by 1.85
    // and put the seat at Contact when the model says nothing.
    assert.equal(to2(SILENT_RUNNING.SIG_MAX / silentSig(CHORISTER.sigIdle)), 1.85);
  });

  it('reads the seat as nothing in every ear on the map, and the seat awake as a book', () => {
    // §3's four figures, through the real paths. This is the mission's opening
    // position stated as arithmetic: lying quiet is not a posture in the prose,
    // it is four numbers under 1.00.
    const corvette: Point = { x: 2500, y: 1550 };
    const escort: Point = { x: 2400, y: 1500 };
    assert.equal(Math.round(rangeM(CHORISTER_SEAT, corvette)), 1070, '§3: 1,070 m off');
    const quiet = [
      to2(ratio(silentSig(CHORISTER.sigIdle), CHORISTER_SEAT, corvette, CORVETTE.hyd)),
      to2(ratio(silentSig(CHORISTER.sigIdle), CHORISTER_SEAT, escort, CRUISER.hyd)),
      to2(ratio(silentSig(CRUISER.sigIdle), CRUISER_SEAT, corvette, CORVETTE.hyd)),
      to2(ratio(silentSig(CRUISER.sigIdle), CRUISER_SEAT, escort, CRUISER.hyd)),
    ];
    assert.deepEqual(quiet, [0.66, 0.74, 0.87, 0.99], '§3: nothing, in every ear on the map');
    for (const reading of quiet) {
      assert.ok(reading < TIER_THRESHOLD_MULTIPLIER.CONTACT, `${reading} is not nothing`);
    }
    // And the same seat, merely idle: Bearing, Classification, and Track.
    const awake = [
      to2(ratio(CHORISTER.sigIdle, CHORISTER_SEAT, corvette, CORVETTE.hyd)),
      to2(ratio(CHORISTER.sigIdle, CHORISTER_SEAT, escort, CRUISER.hyd)),
      to2(ratio(CRUISER.sigIdle, CRUISER_SEAT, corvette, CORVETTE.hyd)),
      to2(ratio(CRUISER.sigIdle, CRUISER_SEAT, escort, CRUISER.hyd)),
    ];
    assert.deepEqual(awake, [2.45, 2.73, 6.29, 7.17]);
    assert.ok(awake[0]! >= TIER_THRESHOLD_MULTIPLIER.BEARING);
    assert.ok(awake[1]! >= TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION);
    assert.ok(awake[3]! >= TIER_THRESHOLD_MULTIPLIER.TRACK, '§3: exact hull and facing');
  });
});

describe('what is heard — docs/mission-shallow.md §7', () => {
  it('hands the column the corridor from the first tick, and no row at all', () => {
    // §7: the escort idling at the frame is Track to a submersible at the seat
    // before anybody moves, which is why this mission can be about a decision;
    // the frame is Bearing; and the nearest of Marr's six is under Contact, so
    // the transcript has to be walked to.
    const escort: Point = { x: 2400, y: 1500 };
    assert.equal(Math.round(rangeM(EARS_SEAT, escort)), 1312);
    const heard = to2(ratio(CRUISER.sigIdle, escort, EARS_SEAT, SUBMERSIBLE.hyd));
    assert.equal(heard, 10.34, '§7: Track, exact hull and facing');
    const turret: Point = { x: 2150, y: 1500 };
    assert.equal(Math.round(rangeM(EARS_SEAT, turret)), 1512);
    assert.equal(to2(ratio(TURRET.sigIdle, turret, EARS_SEAT, SUBMERSIBLE.hyd)), 1.66);
    const nearestRow = emitter('marr-row-six');
    assert.equal(Math.round(rangeM(EARS_SEAT, nearestRow)), 2398);
    const row = to2(ratio(nearestRow.sig, nearestRow, EARS_SEAT, SUBMERSIBLE.hyd));
    assert.equal(row, 0.82);
    assert.ok(row < TIER_THRESHOLD_MULTIPLIER.CONTACT, '§7: from the seat, nothing');
  });

  it('holds five rows from either station, six from both, and three with a Chorister', () => {
    // §7's argument for bringing the ears up the slope, and §8's "the
    // transcript is a walk, not a vigil" — the two things reading the table
    // cannot establish, because both are a property of the propagation model
    // over this map's own grid.
    const rows = attendable.filter((e) => e.tag.startsWith('marr-row-'));
    assert.equal(rows.length, 6);
    const bearingFrom = (station: Point, hyd: number) =>
      rows.filter((r) => ratio(r.sig, r, station, hyd) >= TIER_THRESHOLD_MULTIPLIER.BEARING);
    const west = bearingFrom(STATION_WEST, SUBMERSIBLE.hyd);
    const east = bearingFrom(STATION_EAST, SUBMERSIBLE.hyd);
    assert.deepEqual(
      west.map((r) => r.tag),
      ['marr-row-one', 'marr-row-two', 'marr-row-three', 'marr-row-four', 'marr-row-five'],
      '§7: rows one to five from (900, 1850)'
    );
    assert.deepEqual(
      east.map((r) => r.tag),
      ['marr-row-two', 'marr-row-three', 'marr-row-four', 'marr-row-five', 'marr-row-six'],
      '§7: rows two to six from (1225, 1850)'
    );
    assert.equal(
      new Set([...west, ...east].map((r) => r.tag)).size,
      6,
      '§7: both stations are six'
    );
    assert.equal(Math.round(rangeM(STATION_WEST, STATION_EAST)), 325, '§7: 325 m apart');
    // "The geometry being symmetric about whichever row it stands under" — the
    // outer two of either five are the same figure at the same range.
    const figures = west.map((r) => to2(ratio(r.sig, r, STATION_WEST, SUBMERSIBLE.hyd)));
    assert.deepEqual(figures, [1.55, 1.75, 1.83, 1.75, 1.55]);
    assert.equal(Math.round(rangeM(STATION_WEST, west[0]!)), 1498);
    assert.equal(Math.round(rangeM(STATION_WEST, west[4]!)), 1498);
    // "A Chorister standing in the same water holds three."
    assert.equal(bearingFrom(STATION_WEST, CHORISTER.hyd).length, 3);
    assert.equal(bearingFrom(STATION_EAST, CHORISTER.hyd).length, 3);
  });

  it('prints the distance on the sixth row, and it is inside a gun', () => {
    // §7: "The mission never says not to. It prints the distance." A Chorister
    // standing directly beneath `marr-row-six` reads it at Bearing and stands
    // 351 m from the western turret, at Classification, inside a 700 m gun
    // that fires at Tier 2 or better.
    const row = emitter('marr-row-six');
    const under: Point = { x: row.x, y: 1850 };
    assert.equal(to2(ratio(row.sig, row, under, CHORISTER.hyd)), 1.62);
    const west = (concern.structures ?? []).find((s) => s.tag === 'frame-turret-west')!;
    assert.equal(Math.round(rangeM(under, west)), 351);
    assert.ok(
      ratio(silentSig(CHORISTER.sigIdle), under, west, TURRET.hyd) >=
        TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION,
      '§7: at Classification even silent'
    );
    assert.equal(TURRET.attackRangeM, 700, '§5: seven hundred metres either side of the frame');
    assert.ok(rangeM(under, west) < TURRET.attackRangeM!, '§7: inside the gun');
  });

  it('masks the under-run at the path mean and not at the biome figure', () => {
    // §7: a silent Chorister at (2250, 2400) reads 0.53 to the Corvette 886 m
    // away at the frame's east — nothing, through a path mean of 0.59 rather
    // than through Thermal Vein's own 0.45, because `pathPropagation` walks
    // the cells between the two and most of them are open water.
    const hull: Point = { x: 2250, y: 2400 };
    const corvette: Point = { x: 2500, y: 1550 };
    assert.equal(Math.round(rangeM(hull, corvette)), 886);
    assert.equal(to2(terrain.pathPropagation(hull.x, hull.y, corvette.x, corvette.y)), 0.59);
    assert.equal(to2(ratio(silentSig(CHORISTER.sigIdle), hull, corvette, CORVETTE.hyd)), 0.53);
  });

  it('measures §7’s strip table to the nearer of the closure’s two Corvettes', () => {
    // The document's finding, re-derived rather than restated. §7's table and
    // its "band that is quiet in both directions runs from x 426 to x 1,244,
    // and it is eight hundred metres wide" are measured to `element-one` at
    // (300, 1400) alone — every figure in the table reproduces exactly against
    // that hull — but §5 seats `element-two` 150 m south at (300, 1550), which
    // is nearer to every metre of y 1,850. The table is therefore optimistic
    // by a whole tier at the western end, and the band is 171 m rather than
    // 818. Asserted here so the correction is a measurement and not a comment.
    const one: Point = { x: 300, y: 1400 };
    const two: Point = { x: 300, y: 1550 };
    const gate = (x: number) =>
      Math.max(
        ratio(silentSig(CHORISTER.sigIdle), { x, y: 1850 }, one, CORVETTE.hyd),
        ratio(silentSig(CHORISTER.sigIdle), { x, y: 1850 }, two, CORVETTE.hyd)
      );
    for (const x of [375, 650, 900, 1225, 1550]) {
      assert.ok(
        rangeM({ x, y: 1850 }, two) < rangeM({ x, y: 1850 }, one),
        `x ${x}: §7 measures to the further Corvette`
      );
    }
    // §7's own five rows, reproduced against `element-one` — the proof that the
    // table was measured to that hull and not mis-derived some other way.
    assert.deepEqual(
      [375, 650, 900, 1225, 1550].map((x) =>
        to2(ratio(silentSig(CHORISTER.sigIdle), { x, y: 1850 }, one, CORVETTE.hyd))
      ),
      [2.6, 1.82, 1.17, 0.71, 0.47],
      '§7: the printed table, against (300, 1400)'
    );
    // And against the nearer hull, which is what the water actually holds.
    assert.ok(
      gate(375) >= TIER_THRESHOLD_MULTIPLIER.TRACK,
      `§7 reads x 375 as Classification; the nearer Corvette holds it at ${gate(375).toFixed(2)}`
    );
    // The corrected band: the gate lets go west of the turret's own reach
    // rather than eight hundred metres short of it.
    const gateEndsAt = (() => {
      for (let x = 300; x <= 2000; x++) if (gate(x) < TIER_THRESHOLD_MULTIPLIER.CONTACT) return x;
      return -1;
    })();
    const turretWest = (concern.structures ?? []).find((s) => s.tag === 'frame-turret-west')!;
    const gunReachesTo = Math.round(
      turretWest.x - Math.sqrt(TURRET.attackRangeM! ** 2 - (1850 - turretWest.y) ** 2)
    );
    assert.equal(gunReachesTo, 1244, '§7: the western turret’s own boundary is right');
    assert.ok(
      gateEndsAt > 1000 && gateEndsAt < gunReachesTo,
      `§7's band is x ${gateEndsAt}–${gunReachesTo}, not x 426–1,244`
    );
    assert.equal(gunReachesTo - gateEndsAt, 171, '§7: 171 m wide, not eight hundred');
    // The design survives the correction, which is why this is a finding and
    // not a move: the eastern five-row station is inside the corrected band,
    // and the western one is at Contact and outside a Corvette's gun — through
    // the water column, which is what `engagementRangeM` measures.
    assert.ok(
      gate(STATION_EAST.x) < TIER_THRESHOLD_MULTIPLIER.CONTACT,
      '§7: (1225, 1850) is quiet'
    );
    assert.ok(
      gate(STATION_WEST.x) >= TIER_THRESHOLD_MULTIPLIER.CONTACT &&
        gate(STATION_WEST.x) < TIER_THRESHOLD_MULTIPLIER.BEARING,
      '§7: (900, 1850) is Contact and nothing more'
    );
    const gunRange = Math.hypot(STATION_WEST.x - two.x, STATION_WEST.y - two.y, 340 - 400);
    assert.ok(
      gunRange > CORVETTE.attackRangeM,
      `(900, 1850) is ${gunRange.toFixed(0)} m off, inside a ${CORVETTE.attackRangeM} m gun`
    );
  });
});

describe('none of the ten rows at Tier 2 from the slope — §4, §7, §13', () => {
  it('re-derives the mission’s central claim over the whole withdrawal region', () => {
    // §13 asks for exactly this: "`missionShallow.test.ts` should assert it by
    // re-deriving it rather than by copying these numbers". So the slope is
    // swept metre-band by metre-band against all ten authored rows, through
    // the shipped propagation model, and what is asserted is the *tier* — the
    // column cannot go down and listen, which is why the withdrawal in §8 is
    // a separate objective from the transcript.
    const slope = ATTENDING_SHALLOW.regions.find((region) => region.id === 'kell-slope')!;
    let bestSub = 0;
    let bestChorister = 0;
    let bestGate = 0;
    for (let x = slope.x; x <= slope.x + slope.widthM; x += 50) {
      for (let y = slope.y; y <= slope.y + slope.heightM; y += 50) {
        const standing: Point = { x, y };
        for (const row of attendable) {
          const sub = ratio(row.sig, row, standing, SUBMERSIBLE.hyd);
          const chorister = ratio(row.sig, row, standing, CHORISTER.hyd);
          bestSub = Math.max(bestSub, sub);
          bestChorister = Math.max(bestChorister, chorister);
          if (row.tag.startsWith('gate-row-')) bestGate = Math.max(bestGate, sub);
        }
      }
    }
    assert.ok(
      bestSub < TIER_THRESHOLD_MULTIPLIER.BEARING,
      `§4: the best a submersible on the slope can do is ${bestSub.toFixed(2)}, and Bearing is ` +
        `${TIER_THRESHOLD_MULTIPLIER.BEARING}`
    );
    assert.ok(bestChorister < bestSub, '§7: the ears out-hear the cohort, and both fail');
    assert.ok(bestChorister < TIER_THRESHOLD_MULTIPLIER.CONTACT, '§4: and a Chorister hears none');
    assert.ok(bestGate < bestSub, "§4: the Holdfast's rows are the furthest of the ten");
    // The document's own figures, kept as a description of what the sweep
    // found rather than as the assertion: a retune of the model moves these
    // and the tier claims above are what has to survive it.
    assert.equal(to2(bestSub), 1.03);
    assert.equal(to2(bestChorister), 0.91);
    assert.equal(to2(bestGate), 0.72);
  });
});

describe('the rows and the bells — docs/mission-shallow.md §6', () => {
  it('authors ten attendable sounds and two that cannot be counted', () => {
    assert.equal((voices.emitters ?? []).length, 12);
    assert.equal(attendable.length, 10, '§6: ten sounds are attendable');
    assert.equal(bells.length, 2, '§6: and two are not, and which is which is the whole design');
    assert.deepEqual(
      bells.map((b) => b.tag),
      ['bell-kell', 'bell-teel']
    );
    assert.notEqual(voices.slot, PLAYER, 'the one slot that could never hear them');
    assert.equal(voices.faction, Faction.Pelagia, '§2: the Shelf’s voices');
    assert.equal(voices.units.length, 0, '§5: sounds and no hulls');
    for (const row of attendable) {
      assert.equal(row.sig, 12, '§6: all at twelve');
      assert.equal(row.periodTicks, row.onTicks, '§6: all sustained');
      assert.equal(row.periodTicks, 20 * SIM.TICK_HZ, '§6: twenty seconds');
      assert.equal(row.hp, 5000);
    }
  });

  it('windows Marr’s six against the tide and the Holdfast’s four against the corridor', () => {
    for (const row of attendable.filter((e) => e.tag.startsWith('marr-row-'))) {
      assert.deepEqual([row.fromTick, row.untilTick], [T(1), T(16)], '§9: 01:00 → 16:00');
      assert.equal(row.depthM, 260);
      assert.equal(row.y, 500);
    }
    for (const row of attendable.filter((e) => e.tag.startsWith('gate-row-'))) {
      assert.deepEqual([row.fromTick, row.untilTick], [T(10), T(13)], '§9: 10:00 → 13:00');
      assert.equal(row.depthM, 250);
      assert.equal(row.y, 125);
    }
    assert.deepEqual(
      [emitter('bell-kell').fromTick, emitter('bell-kell').untilTick],
      [T(6), T(6, 20)]
    );
    assert.deepEqual(
      [emitter('bell-teel').fromTick, emitter('bell-teel').untilTick],
      [T(11), T(11, 20)]
    );
  });

  it('words every reading to survive all three of Convocation’s outcomes', () => {
    // §6: "a plateau that closed its count is turning a neighbour's question,
    // a plateau still turning is turning its own, and a plateau that was held
    // is being asked again. The sound does not say which, and neither does the
    // record." The clause that does that work is asserted here, because it is
    // the continuity and not the prose.
    for (const row of attendable.filter((e) => e.tag.startsWith('marr-row-'))) {
      assert.match(row.reading!.entered, /at the pace of a turning/);
      assert.match(row.reading!.entered, /because the sound does not say/);
    }
    // §6 numbers the readings and §12 prints two of them verbatim, so the
    // ordinal is the assertion and not a `\w+`. The tag counts — `marr-row-one`
    // … `marr-row-six` — and deriving the sentence from the tag's own word is
    // the economy that produces "Marr's three outer row", which is a sentence
    // no register speaks and which a loose pattern would pass.
    assert.deepEqual(
      attendable.filter((e) => e.tag.startsWith('marr-row-')).map((e) => e.reading!.gap),
      [
        'Not entered: the first row.',
        'Not entered: the second row.',
        'Not entered: the third row.',
        'Not entered: the fourth row.',
        'Not entered: the fifth row.',
        'Not entered: the sixth row.',
      ],
      '§6: "Not entered: the [ordinal] row."'
    );
    assert.equal(
      emitter('marr-row-five').reading!.gap,
      'Not entered: the fifth row.',
      '§12, "Objective readings, in play", verbatim'
    );
    assert.ok(
      emitter('marr-row-three').reading!.entered.startsWith(
        "Entered: Marr's third outer row, at twelve, at the pace of a turning."
      ),
      '§12, "Objective readings, in play", verbatim'
    );
    assert.deepEqual(
      attendable
        .filter((e) => e.tag.startsWith('marr-row-'))
        .map((e) => e.reading!.entered.slice("Entered: Marr's ".length).split(' ')[0]),
      ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'],
      '§6: "Entered: Marr\'s [first…sixth] outer row"'
    );
    for (const row of attendable.filter((e) => e.tag.startsWith('gate-row-'))) {
      assert.match(row.reading!.entered, /the stalls had to stand in the concern's corridor/);
      assert.match(row.reading!.gap, /The corridor was not stood in, or not long enough/);
    }
  });

  it('rings the two loudest things on the map for exactly nothing', () => {
    // §6's mechanism, as the missing field it is: an emitter with no `reading`
    // cannot be counted by `attend` (`runtime.ts`, `applyAttendance`), so a
    // transcript that could be filled by standing still under a bell is not
    // reachable. Both bells are Tier 2 or better from ground the mission sends
    // the player to, which is what makes the withholding cost something.
    for (const one of bells) {
      assert.equal(one.reading, undefined, `${one.tag}: a bell does not need entering`);
      assert.equal(one.sig, 70, '§6: the loudest sound on the map');
      assert.ok(one.sig > Math.max(...attendable.map((row) => row.sig)) * 5);
    }
    const kell = emitter('bell-kell');
    assert.ok(
      ratio(kell.sig, kell, STATION_WEST, CHORISTER.hyd) >= TIER_THRESHOLD_MULTIPLIER.BEARING,
      '§6: Bearing to a Chorister on the strip, and worth nothing'
    );
    const slopeMiddle: Point = { x: 2500, y: 2750 };
    assert.ok(
      ratio(kell.sig, kell, slopeMiddle, SUBMERSIBLE.hyd) >= TIER_THRESHOLD_MULTIPLIER.TRACK,
      "§6: Track over the slope's middle — heard everywhere, entered nowhere"
    );
    const teel = emitter('bell-teel');
    assert.ok(
      ratio(teel.sig, teel, STATION_WEST, CHORISTER.hyd) >= TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION
    );
    // And the count's bound is the ten and never the twelve: `attend.count` is
    // held to the emitters that carry a reading (`missions.test.ts`), so §8's
    // eight of ten is reachable and a run that stood under both bells all tide
    // has banked nothing.
    const whole = byId('the-whole').predicate;
    assert.ok(whole.kind === 'attend' && whole.count <= attendable.length);
    assert.ok(
      whole.kind === 'attend' && whole.count > (voices.emitters ?? []).length - bells.length - 3
    );
  });
});

describe('the objective, as docs/mission-shallow.md §8 chooses it', () => {
  it('decides the count by the transcript, the slope and the ears, and by nothing else', () => {
    assert.deepEqual(
      ATTENDING_SHALLOW.objectives.map((o) => o.id),
      ['the-transcript', 'the-slope', 'the-ears', 'the-record', 'the-whole'],
      '§8: five rows, in the document’s order'
    );
    const terminal = ATTENDING_SHALLOW.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => o.id),
      ['the-transcript', 'the-slope', 'the-ears'],
      '§8: three of them terminal'
    );
    assert.deepEqual(byId('the-transcript').predicate, { kind: 'attend', count: 5 });
    assert.deepEqual(byId('the-slope').predicate, {
      kind: 'extract',
      role: 'cohort',
      region: 'kell-slope',
      count: 6,
    });
    assert.deepEqual(byId('the-ears').predicate, {
      kind: 'extract',
      role: 'ears',
      region: 'kell-slope',
      count: 2,
    });
    assert.deepEqual(byId('the-record').predicate, {
      kind: 'tolerance',
      ticks: 60 * SIM.TICK_HZ,
      tier: ResolutionTier.Classification,
    });
    assert.deepEqual(byId('the-whole').predicate, { kind: 'attend', count: 8 });
    // §8: "No keystone, and the omission is the argument." A column that
    // entered ten rows and left three hulls on the shoulder and a column that
    // came down whole with four rows read as the same sentence.
    for (const objective of ATTENDING_SHALLOW.objectives) {
      assert.notEqual(objective.keystone, true, `${objective.id}: the Directorate does not rank`);
    }
    // §8: read out and never ranked, and in the order the close prints them.
    assert.deepEqual(
      ATTENDING_SHALLOW.objectives.filter((o) => o.reading !== undefined).map((o) => o.id),
      ['the-record', 'the-whole'],
      '§8: the-record’s pair first, then the-whole’s'
    );
  });

  it('splits the withdrawal into two rows because a role is one string', () => {
    // §8, §13: `MissionUnit.role` is singular, so "the column came down" over
    // eleven hulls of two kinds is two predicates and not one — and the
    // document wants the counts separately anyway. Six of eight and two of
    // three, against the roster this mission actually places.
    const cohort = player.units.filter((u) => u.role === 'cohort').length;
    const ears = player.units.filter((u) => u.role === 'ears').length;
    assert.deepEqual([6, cohort], [6, 8], '§8: six of eight on the slope is a column');
    assert.deepEqual([2, ears], [2, 3], '§8: two of three ears on the slope');
    assert.equal(
      new Set(player.units.map((u) => u.role)).size,
      2,
      '§13: two roles for one withdrawal count'
    );
  });

  it('reveals the slope and the ears at 18:00, on the beat that calls it', () => {
    // §8: the late reveal is load-bearing. An `extract` latches Met the first
    // pass it is true and never un-latches, so revealed at 00:00 a column that
    // dipped three hundred metres south at 05:00 would have satisfied *under
    // the line at the tide's turn* at five minutes past the hour.
    for (const id of ['the-slope', 'the-ears']) {
      assert.equal(byId(id).revealAtTick, T(18), '§9: the stalls call the slope at 18:00');
      assert.equal(byId(id).markerId, 'slope');
    }
    assert.equal(byId('the-transcript').revealAtTick, undefined, '§8: revealed from 00:00');
    assert.ok(
      ATTENDING_SHALLOW.beats.some((beat) => beat.atTick === T(18) && beat.kind === 'say'),
      'the reveal shares its tick with the line that hands it over'
    );
    assert.equal(
      ATTENDING_SHALLOW.markers.length,
      1,
      '§11: one marker, and it points at the slope'
    );
    assert.deepEqual(
      [ATTENDING_SHALLOW.markers[0]!.x, ATTENDING_SHALLOW.markers[0]!.y],
      [2500, 2750]
    );
    assert.equal(ATTENDING_SHALLOW.markers[0]!.radiusM, 1000);
  });

  it('reads all three of Korrin’s results, in the register', () => {
    assert.match(ATTENDING_SHALLOW.epilogue[MissionOutcome.Complete], /^The Shelf was listened to/);
    assert.match(ATTENDING_SHALLOW.epilogue[MissionOutcome.Partial], /^You were sufficient/);
    assert.match(ATTENDING_SHALLOW.epilogue[MissionOutcome.Lost], /^The Shelf was not entered/);
    assert.match(
      ATTENDING_SHALLOW.epilogue[MissionOutcome.Complete],
      /it does not come back/,
      '§8: the fifteen is entered against the shoulder, which does not keep accounts'
    );
    assert.match(byId('the-record').reading!.met, /the book has a third page/);
    assert.match(
      byId('the-whole').reading!.unmet,
      /^Fewer than eight\. Gaps are entered as gaps\.$/
    );
  });
});

describe('the mission runs its length — docs/mission-shallow.md §9, §13', () => {
  /** The sink is required and never reached in these fixtures. */
  const SINK: MissionCommandSink = {
    applyMove: () => {},
    applyDepth: () => true,
    applySilent: () => {},
    applyPing: () => {},
  };

  /** One rule, the `missionIntake.test.ts` fixture idiom. */
  function fixture(overrides: Partial<MissionDefinition>): MissionDefinition {
    return {
      ...PROLOGUE_SORROWGATE,
      id: 'test-shallow-row',
      arrayTag: undefined,
      sweep: undefined,
      lifts: undefined,
      regions: [],
      markers: [],
      parties: [],
      conditionalBeats: undefined,
      beats: [{ atTick: ECHO_TICK_INTERVAL * 8, kind: 'resolve', note: '' }],
      ...overrides,
    };
  }

  function empty(tick: number): EchoSnapshot {
    return {
      tick,
      units: [],
      structures: [],
      ordnance: [],
      contacts: [],
      peakSig: 0,
      berths: { used: 0, granted: 0 },
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

  function closesOn(definition: MissionDefinition, passes: number): number {
    const runtime = new MissionRuntime(definition);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    for (let pass = 1; pass <= passes; pass++) {
      world.tick = pass * ECHO_TICK_INTERVAL;
      if (runtime.tick(world, SINK, empty(world.tick)) !== null) return pass;
    }
    return -1;
  }

  it('would close ninety seconds early on the reveal’s own pass without the flag', () => {
    // §13's row, in the terms this mission needs it: all three terminal rows
    // can be true on the pass that reveals two of them, and a close there
    // would delete the pack's whole purpose. `endure` at zero ticks stands in
    // for "already true when shown" — the shape `the-slope` has when six
    // Choristers are on the slope at 18:00 with five rows banked.
    const revealed = [0, 1, 2].map((n) => ({
      id: `row-${n}`,
      text: '',
      initial: ObjectiveStatus.Pending,
      terminal: true as const,
      revealAtTick: ECHO_TICK_INTERVAL * 4,
      predicate: { kind: 'endure' as const, ticks: 0 },
    }));
    assert.equal(closesOn(fixture({ objectives: revealed }), 8), 4, 'the court stops sitting');
    assert.equal(
      closesOn(fixture({ objectives: revealed, runsItsLength: true }), 8),
      8,
      '§9: the tide turns at 19:00 whatever the count stands at'
    );
    assert.equal(ATTENDING_SHALLOW.runsItsLength, true);
  });

  it('spends the ninety seconds the flag buys on the telegraph', () => {
    // §8, §9: the close is a resolve and not a conclusion, because this
    // mission can be lost — so campaign.md §10's sixty seconds are measured,
    // and what pays them is the pack at 17:30 rather than a `say`.
    const resolve = ATTENDING_SHALLOW.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.atTick, T(19), '§9: the tide turns');
    assert.equal(
      resolve.kind === 'resolve' ? resolve.conclusion : true,
      undefined,
      '§8: not a conclusion'
    );
    const loud = ATTENDING_SHALLOW.beats.filter((beat) => beat.kind === 'creature' && beat.loud);
    assert.equal(loud.length, 2, '§9: the pack, and it is the telegraph');
    assert.equal(loud[0]!.atTick, T(17, 30));
    const leadS = (resolve.atTick - loud[0]!.atTick) / SIM.TICK_HZ;
    assert.equal(leadS, 90);
    assert.ok(leadS >= MISSION.FAILURE_TELEGRAPH_S, '§10, and half again');
    assert.equal((resolve.atTick - T(18)) / SIM.TICK_HZ, 60, '§9: the slope is called at 18:00');
  });
});

describe('the three askings, ordered by arithmetic — docs/mission-shallow.md §9, §13', () => {
  const conditionals = ATTENDING_SHALLOW.conditionalBeats ?? [];
  const first = conditionals.filter((beat) => beat.choiceGroup === 'first');
  const third = conditionals.filter((beat) => beat.choiceGroup === 'third');
  const second = conditionals.filter((beat) => beat.choiceGroup === undefined);

  it('authors three ways into the first asking, one second, and twelve effects on the third', () => {
    assert.equal(first.length, 3, '§9: two `extract` forms and the tally');
    assert.equal(second.length, 1, '§9: the second asking retires nothing');
    assert.equal(third.length, 12, '§13: a say, the escort, and five silents and five moves');
    for (const beat of first) {
      assert.equal(beat.kind, 'say');
      assert.match(beat.kind === 'say' ? beat.text : '', /This is the first time of asking/);
    }
    assert.deepEqual(first.map((beat) => beat.when.kind).sort(), [
      'extract',
      'extract',
      'tolerance',
    ]);
    assert.deepEqual(
      first
        .filter((beat) => beat.when.kind === 'extract')
        .map((beat) => (beat.when.kind === 'extract' ? [beat.when.role, beat.when.region] : [])),
      [
        ['cohort', 'grid-spur'],
        ['ears', 'grid-spur'],
      ],
      '§9: the two forms literally inside the closure'
    );
    // §13: the third asking is the first time a mission un-silences and moves
    // a scripted party by a condition. Five hulls, five silents, five moves.
    const unsilenced = third.filter((beat) => beat.kind === 'silent');
    const moved = third.filter((beat) => beat.kind === 'move' && beat.tag.startsWith('holding-'));
    assert.equal(unsilenced.length, 5);
    assert.equal(moved.length, 5);
    for (const beat of unsilenced) assert.equal(beat.kind === 'silent' ? beat.active : true, false);
    for (const beat of moved) {
      assert.deepEqual(
        beat.kind === 'move' ? [beat.x, beat.y] : [],
        [2500, 1100],
        '§9: east along y 1,100'
      );
    }
    // And every effect on the third shares one condition, which is what makes
    // the group legal (types.ts, `choiceGroup`).
    assert.equal(new Set(third.map((beat) => JSON.stringify(beat.when))).size, 1);
  });

  it('buys the order in the numbers, because the tier counts upward', () => {
    // §13's finding, restated from the prose: `tolerance` counts ticks at its
    // tier *or better*, so a force's Bearing tally is always at least its
    // Classification tally, and a first asking authored above the second's
    // threshold could fire after it. Twenty sits under thirty by ten.
    const byTier: number[] = [];
    byTier[ResolutionTier.Classification] = 30 * SIM.TICK_HZ;
    assert.equal(
      exposedAtLeast(byTier, ResolutionTier.Bearing),
      exposedAtLeast(byTier, ResolutionTier.Classification),
      '§9: thirty seconds of Classification is thirty seconds of Bearing as well'
    );
    const tolerances = conditionals
      .filter((beat) => beat.when.kind === 'tolerance')
      .map((beat) => (beat.when.kind === 'tolerance' ? beat.when : null)!);
    assert.deepEqual(
      tolerances.map((when) => [when.ticks / SIM.TICK_HZ, when.tier]),
      [
        [20, ResolutionTier.Bearing],
        [30, ResolutionTier.Classification],
        ...Array.from({ length: 12 }, () => [90, ResolutionTier.Classification]),
      ],
      '§9: twenty at Bearing, thirty at Classification, ninety at Classification'
    );
  });

  it('fires them in order over a column standing at Classification, and retires the siblings', () => {
    // The mechanism, driven: a party held at Classification accrues one Echo
    // interval of sim ticks per mission pass (`applyTolerance`), so the pass a
    // threshold falls on is its tick count divided by that interval. The two
    // unfired `extract` forms of the first asking leave the list on the pass
    // the tally form fires, which is why Rell asks once.
    const fired = new Set<number>();
    const firedOnPass = new Map<number, number>();
    for (let pass = 1; pass * ECHO_TICK_INTERVAL <= 120 * SIM.TICK_HZ; pass++) {
      const exposed = pass * ECHO_TICK_INTERVAL;
      const due = dueConditionalBeats(
        conditionals,
        fired,
        (beat) => beat.when.kind === 'tolerance' && exposed >= beat.when.ticks
      );
      for (const index of due) {
        fired.add(index);
        firedOnPass.set(index, pass);
      }
      // The choice-group sweep is the runtime's, and this reference drive does
      // not have it — so it is applied here the way `fireConditionalBeats`
      // applies it: after everything due on the pass has fired.
      if (due.length > 0) {
        const closed = new Set(
          due.map((index) => conditionals[index]!.choiceGroup).filter((g) => g !== undefined)
        );
        conditionals.forEach((beat, index) => {
          if (beat.choiceGroup !== undefined && closed.has(beat.choiceGroup)) fired.add(index);
        });
      }
    }
    const passOf = (predicate: (beat: (typeof conditionals)[number]) => boolean) =>
      firedOnPass.get(conditionals.findIndex(predicate));
    const firstPass = passOf(
      (beat) => beat.choiceGroup === 'first' && beat.when.kind === 'tolerance'
    );
    const secondPass = passOf((beat) => beat.choiceGroup === undefined);
    const thirdPass = passOf((beat) => beat.choiceGroup === 'third');
    assert.equal(
      firstPass,
      Math.ceil((20 * SIM.TICK_HZ) / ECHO_TICK_INTERVAL),
      '§9: twenty seconds'
    );
    assert.equal(secondPass, Math.ceil((30 * SIM.TICK_HZ) / ECHO_TICK_INTERVAL));
    assert.equal(thirdPass, Math.ceil((90 * SIM.TICK_HZ) / ECHO_TICK_INTERVAL));
    assert.ok(firstPass! < secondPass! && secondPass! < thirdPass!, '§13: bought in the numbers');
    // The two `extract` forms never fired — the group retired them — and every
    // effect of the third asking fired on one pass.
    for (const beat of first) {
      if (beat.when.kind !== 'extract') continue;
      assert.equal(firedOnPass.get(conditionals.indexOf(beat)), undefined, '§9: asked once');
    }
    assert.equal(
      new Set(third.map((beat) => firedOnPass.get(conditionals.indexOf(beat)))).size,
      1,
      '§9: twelve effects, one condition, one pass'
    );
  });
});

describe('the concern — docs/mission-shallow.md §5, and why it is one slot', () => {
  it('seats the frame inside its own gun of the escort it is posted with', () => {
    // The literal's first authoring decision, measured. Hostility here is
    // `Owner.slot` (`combat.ts`) and a prebuilt Sentinel Turret is spawned
    // armed (`world.ts`), so §2's four separately owned Consortium parties
    // would have the closure open fire on Rell's escort at tick zero. Every
    // hull of the escort is inside `frame-turret-east`'s 700 m.
    const east = (concern.structures ?? []).find((s) => s.tag === 'frame-turret-east')!;
    const escort = ['corridor-cruiser', 'corridor-corvette-one', 'corridor-corvette-two'].map(unit);
    for (const hull of escort) {
      const d = Math.hypot(hull.x - east.x, hull.y - east.y, hull.depthM - east.depthM);
      assert.ok(
        d < TURRET.attackRangeM!,
        `${hull.tag} stands ${d.toFixed(0)} m from the frame, inside its ${TURRET.attackRangeM} m gun`
      );
    }
    // So they are one party, and the format's own rules are still paid: one
    // slot, no role on it, and not the court's.
    const scripted = ATTENDING_SHALLOW.parties.filter((party) => party.slot !== PLAYER);
    assert.deepEqual(
      scripted.map((party) => party.slot).sort((a, b) => a - b),
      [2, 6],
      '§2: the concern, and the Shelf’s voices'
    );
    assert.equal(concern.units.length, 10, '§8: three Cruisers and seven Corvettes');
    assert.equal((concern.structures ?? []).length, 2, '§5: two turret mounts');
    for (const party of scripted) {
      assert.notEqual(party.slot, ATTENDING_SHALLOW.courtSlot, 'the court is not a party');
      for (const hull of party.units) assert.equal(hull.role, undefined);
    }
    assert.equal(ATTENDING_SHALLOW.courtSlot, 1, '§2: slot 1, reserved and empty');
  });

  it('never takes the escort below the closure’s southern edge', () => {
    // §5: "Rell discharges a closure at the closure's edge and does not hunt
    // anybody down a slope", which is the restraint Thin Water gave him and
    // the reason §8's withdrawal is survivable. Every authored leg, clocked
    // and conditional alike.
    const escortTags = new Set([
      'corridor-cruiser',
      'corridor-corvette-one',
      'corridor-corvette-two',
    ]);
    const legs = [
      ...ATTENDING_SHALLOW.beats.filter((beat) => beat.kind === 'move' && escortTags.has(beat.tag)),
      ...(ATTENDING_SHALLOW.conditionalBeats ?? []).filter(
        (beat) => beat.kind === 'move' && escortTags.has(beat.tag)
      ),
    ];
    assert.ok(legs.length > 0);
    for (const leg of legs) {
      if (leg.kind !== 'move') continue;
      assert.ok(leg.y < 1750, `the escort walks to y ${leg.y}, below the closure's southern edge`);
    }
  });

  it('stands the eastern leg off outside a Consortium Cruiser’s gun', () => {
    // The literal's second authoring decision, measured — and pinned, so a
    // later "correction" back to §9's x 2,800 fails here rather than in a
    // playthrough. `engagementRangeM` measures through the water column, so
    // the depth between a corridor at 400 m and a seat at 340 is in it.
    const legs = ATTENDING_SHALLOW.beats.filter(
      (beat) => beat.kind === 'move' && beat.tag === 'corridor-cruiser'
    );
    const east = legs.find((beat) => beat.kind === 'move' && beat.x > 2400)!;
    assert.equal(east.atTick, T(13), '§9: the escort walks east at 13:00');
    assert.equal(east.kind === 'move' ? east.x : NaN, 2750);
    const gunRangeTo = (x: number) =>
      Math.min(
        ...player.units
          .filter((u) => u.role === 'cohort')
          .map((u) => Math.hypot(u.x - x, u.y - 1500, u.depthM - 400))
      );
    assert.ok(
      gunRangeTo(2750) > CRUISER.attackRangeM,
      `§3: at x 2,750 the seat is ${gunRangeTo(2750).toFixed(0)} m off, outside a ${CRUISER.attackRangeM} m gun`
    );
    assert.ok(
      gunRangeTo(2800) < CRUISER.attackRangeM,
      "§9's x 2,800 is inside the gun, which is the finding this file reports"
    );
    // And both of §9's acoustic readings survive the fifty metres.
    const station: Point = { x: 2750, y: 1500 };
    assert.ok(
      ratio(silentSig(CHORISTER.sigIdle), CHORISTER_SEAT, station, CRUISER.hyd) >=
        TIER_THRESHOLD_MULTIPLIER.CONTACT,
      '§9: Contact to a silent hull still sitting in it'
    );
    assert.ok(
      ratio(CHORISTER.sigIdle, CHORISTER_SEAT, station, CRUISER.hyd) >=
        TIER_THRESHOLD_MULTIPLIER.TRACK,
      '§9: and Track to a loud one'
    );
  });
});

describe('the fight, priced and not asked — docs/mission-shallow.md §8', () => {
  it('reads §8’s table off the roster and off the Klaxon', () => {
    const dps = (damage: number, cooldown: number) => damage / cooldown;
    assert.equal(to1(dps(CRUISER.attackDamage, CRUISER.attackCooldownS)), 40);
    assert.equal(
      to1(
        dps(
          CRUISER.attackDamage * damageMultiplierFor(Faction.Bathyarch, CRUISER.sigCruise + 10),
          CRUISER.attackCooldownS
        )
      ),
      44.8,
      '§8: 45 in the Klaxon band'
    );
    assert.equal(to1(dps(CORVETTE.attackDamage, CORVETTE.attackCooldownS)), 27.8);
    assert.equal(to1(dps(TURRET.attackDamage!, TURRET.attackCooldownS!)), 22.2);
    // The column's eleven together, which is the other half of §8's table.
    const column =
      8 * dps(CHORISTER.attackDamage, CHORISTER.attackCooldownS) +
      2 * dps(SUBMERSIBLE.attackDamage, SUBMERSIBLE.attackCooldownS) +
      dps(CRUISER.attackDamage, CRUISER.attackCooldownS);
    assert.equal(Math.round(column), 206, '§8: the column’s eleven together');
    // And the sentence the pricing exists for: a Chorister at 170 dies to one
    // Corvette in 6.1 s instead of 7.2, because the shallows took the thirty.
    const bled = CHORISTER.maxHp * DIRECTORATE_SHALLOW.HULL_FLOOR;
    assert.equal(to1(bled / dps(CORVETTE.attackDamage, CORVETTE.attackCooldownS)), 6.1);
    assert.equal(to1(CHORISTER.maxHp / dps(CORVETTE.attackDamage, CORVETTE.attackCooldownS)), 7.2);
  });

  it('drives the pack at the depth §11 authors rather than at the species’ own', () => {
    // The trap `types.ts` names: a driven creature holds its species'
    // `workingDepthM` unless the commitment carries a depth, and a Draymaw's
    // is 900 — the slope's floor — against §11's authored 880.
    assert.equal(DRAYMAW.workingDepthM, 900);
    const pack = ATTENDING_SHALLOW.beats.filter((beat) => beat.kind === 'creature');
    for (const beat of pack) {
      if (beat.kind !== 'creature') continue;
      assert.equal(beat.species, FaunaSpecies.Draymaw);
      assert.equal(beat.spawnAt!.depthM, 880, '§11: the pack, spawned');
      assert.equal(beat.driveTo.depthM, 880, "and held there rather than at the species' 900");
      assert.equal(beat.untilTick, T(18, 30));
      assert.equal(beat.loud, true, '§9: the telegraph');
    }
    // §8: the order that gets a hull under the line fastest is the order that
    // calls the animals — a descending hull is heard at the dive's SIG floor.
    assert.ok(DRAYMAW.workingDepthM <= 900, "the slope's floor admits the pack");
  });
});

describe('the beats, as docs/mission-shallow.md §9 tables them', () => {
  it('seats sixteen hulls quiet at tick zero and says so once', () => {
    const silent = ATTENDING_SHALLOW.beats.filter((beat) => beat.kind === 'silent');
    assert.equal(silent.length, 16, '§9: the column’s eleven and the Holding’s five');
    for (const beat of silent) {
      assert.equal(beat.atTick, 0);
      assert.equal(beat.kind === 'silent' ? beat.active : false, true);
    }
    const quieted = new Set(silent.map((beat) => (beat.kind === 'silent' ? beat.tag : '')));
    for (const hull of player.units) assert.ok(quieted.has(hull.tag), `${hull.tag} wakes up loud`);
    for (const hull of concern.units.filter((u) => u.tag.startsWith('holding-'))) {
      assert.ok(quieted.has(hull.tag), `${hull.tag}: the Holding is a smudge all tide`);
    }
    for (const hull of concern.units.filter((u) => !u.tag.startsWith('holding-'))) {
      assert.ok(
        !quieted.has(hull.tag),
        `${hull.tag}: the corridor is audible, and that is the point`
      );
    }
  });

  it('runs §9’s spoken table in its order', () => {
    const said = ATTENDING_SHALLOW.beats
      .filter((beat) => beat.kind === 'say')
      .map((beat) => [beat.atTick / SIM.TICK_HZ, beat.kind === 'say' ? beat.speaker : '']);
    assert.deepEqual(said, [
      [0, 'Undermarshal Setha Korrin'],
      [20, 'The stalls'],
      [60, 'Mara Tessen, 4th Trench Cohort'],
      [180, 'The stalls'],
      [360, 'The stalls'],
      [390, "The watch at Kell's edge"],
      [600, 'The stalls'],
      [660, 'The stalls'],
      [1080, 'The stalls'],
      [1140, 'Undermarshal Setha Korrin'],
    ]);
    // §12: Korrin closes on one sentence she should not say aloud, for the
    // fourth consecutive Directorate mission, and nobody responds to it.
    const last = ATTENDING_SHALLOW.beats.filter((beat) => beat.kind === 'say').pop()!;
    assert.match(
      last.kind === 'say' ? last.text : '',
      /It was written by people who had never lost the fifteen/
    );
  });

  it('opens on §12’s first paragraph, which is the briefing’s own first paragraph', () => {
    // §9's 00:00 row names the speaker and the section — "Korrin assigns, from
    // Sufficiency (§12)" — and does not quote a line, so the beat carries
    // §12's opening paragraph and the public header carries all five. Intake's
    // idiom, and the assertion is that the two do not drift: a briefing edited
    // in shared and a beat left behind would have Korrin open a mission with a
    // sentence the entry screen no longer says.
    const opening = ATTENDING_SHALLOW.beats.find(
      (beat) => beat.atTick === 0 && beat.kind === 'say'
    );
    assert.ok(opening?.kind === 'say');
    assert.equal(opening.speaker, 'Undermarshal Setha Korrin', '§12: she assigns and is not there');
    const briefing = ATTENDING_SHALLOW.briefing;
    assert.ok(briefing !== null && briefing !== undefined, '§12: the briefing is not withheld');
    assert.equal(briefing.length, 5, '§12: five paragraphs');
    assert.equal(opening.text, briefing[0], '§12: the in-water line is the briefing’s own');
    assert.match(briefing[1]!, /^The shallows take a fifth of the way a hull moves/, '§4, §12');
    assert.match(
      briefing[3]!,
      /Five of ten is sufficiency\. The Undermarshalcy does not round up\.$/
    );
    assert.match(
      briefing[4]!,
      /^The column is asked to be under the line at the tide's turn\./,
      '§12: and it is not asked to be anywhere else'
    );
    // §2, §12: no formula at the opening, for the second time in the campaign —
    // the Cantorate does not attend a shoulder, so Ossary is never in the water.
    for (const beat of ATTENDING_SHALLOW.beats) {
      if (beat.kind !== 'say') continue;
      assert.ok(!beat.speaker.includes('Ossary'), '§2: the Cantorate does not attend a shoulder');
    }
  });

  it('walks the corridor and the closure on §9’s clock', () => {
    const legs = (tag: string) =>
      ATTENDING_SHALLOW.beats
        .filter((beat) => beat.kind === 'move' && beat.tag === tag)
        .map((beat) => [beat.atTick / SIM.TICK_HZ, beat.kind === 'move' ? beat.x : NaN]);
    assert.deepEqual(legs('corridor-cruiser'), [
      [300, 1200],
      [540, 2400],
      [780, 2750],
      [960, 2400],
    ]);
    assert.deepEqual(legs('element-one'), [
      [840, 2500],
      [990, 4500],
    ]);
    assert.deepEqual(legs('element-two'), [
      [840, 2500],
      [990, 4500],
    ]);
    // The corvettes keep the station they were seated in relative to the
    // Cruiser, so the formation the player heard at 00:00 is the one that
    // arrives (§5).
    const cruiserSeat = unit('corridor-cruiser');
    for (const tag of ['corridor-corvette-one', 'corridor-corvette-two']) {
      const seat = unit(tag);
      const offset = seat.x - cruiserSeat.x;
      for (const [tick, x] of legs(tag)) {
        const at = legs('corridor-cruiser').find(([t]) => t === tick)!;
        assert.equal(x, at[1]! + offset, `${tag}: broke station at ${tick}s`);
      }
    }
  });
});

describe('the tide, run out — docs/mission-shallow.md §3, §8', () => {
  it('leaves a column that never moves whole, and reads the count as Nobody’s', () => {
    // §3: "while the column holds still the corridor does not have it at all",
    // and §8: the fight "is not compulsory. It is a consequence." Both are
    // claims about nineteen minutes of simulation rather than about the table,
    // so they are run. Nothing is ordered: the eleven sit where they were
    // seated, silent from the sixteen beats at tick zero, and the corridor
    // walks its whole authored round beside them — including §9's 16:30 leg,
    // which crosses the seat the column started in.
    const match = new Match(missionMapById(ATTENDING_SHALLOW.mapId)!, {
      mission: ATTENDING_SHALLOW,
      fauna: false,
      seed: 4,
    });
    let last: EchoSnapshot | undefined;
    let first: EchoSnapshot | undefined;
    let loudest = 0;
    let worstAfterTheSeam = ResolutionTier.Silent;
    let bearingTicks = 0;
    const lines: string[] = [];
    for (let tick = 0; tick <= T(19, 30); tick++) {
      const snapshots = match.update(STEP_MS);
      const own = snapshots?.get(PLAYER);
      if (own !== undefined) {
        if (first === undefined) first = own;
        else {
          last = own;
          loudest = Math.max(loudest, own.peakSig);
          worstAfterTheSeam = Math.max(worstAfterTheSeam, own.exposure.tier);
        }
        if (own.exposure.tier >= ResolutionTier.Bearing) bearingTicks += ECHO_TICK_INTERVAL;
      }
      for (const line of match.takeMissionLines()) lines.push(line.speaker);
      if (match.missionOver !== null) break;
    }
    const over = match.missionOver;
    assert.ok(over !== null && last !== undefined && first !== undefined, 'the tide never turned');
    assert.equal(match.world.tick, T(19), '§9: the tide turns at 19:00');

    // The format's own seam, stated rather than papered over: a beat authored
    // at tick zero fires on the first *mission* pass, which is one Echo
    // interval in, so the column stands at its idle figures for a fifth of a
    // second before the sixteen `silent` beats land — and at idle the seat is
    // Track to the escort's Cruiser (§3's 7.17). One interval, against the
    // first asking's twenty seconds.
    assert.equal(first!.tick, ECHO_TICK_INTERVAL);
    assert.equal(first!.peakSig, CRUISER.sigIdle, '§3: the loudest thing the column owns');
    assert.equal(first!.exposure.tier, ResolutionTier.Track);
    assert.ok(ECHO_TICK_INTERVAL * 50 <= 20 * SIM.TICK_HZ, 'a fiftieth of the first asking');

    // And from the pass after it, for the whole of the rest of the tide, the
    // column is the Cruiser hull's own silent figure and nothing louder.
    assert.equal(to2(loudest), to2(silentSig(CRUISER.sigIdle)), `the column peaked at ${loudest}`);
    // §9's 16:30 leg is the only thing all tide that reads the seat above
    // Contact, and it is the closure passing over it: about eleven seconds of
    // Bearing, six hundred and forty-eight ticks against the first asking's
    // twelve hundred, so Rell never opens his book on a column that sat still.
    assert.equal(worstAfterTheSeam, ResolutionTier.Bearing, '§9: the closure, going over');
    assert.ok(
      bearingTicks < 20 * SIM.TICK_HZ,
      `§9: ${(bearingTicks / SIM.TICK_HZ).toFixed(1)}s at Bearing, against the first asking's twenty`
    );
    assert.ok(!lines.includes('Corridor Warden Anse Rell'), '§8: the askings are a consequence');

    // Whole. Every hull that went up is at the floor and no lower: nothing on
    // this map fired at a column that did nothing, which is what §8 prices and
    // what the escort's eastern leg is stood off to keep true.
    assert.equal(last!.units.length, 11, '§3: the corridor does not have it at all');
    for (const hull of last!.units) {
      assert.equal(
        Math.round(hull.hp),
        Math.round(hull.maxHp * DIRECTORATE_SHALLOW.HULL_FLOOR),
        '§4: fifteen in a hundred, and not a point more'
      );
    }

    // §8's third reading: none of the three, and the register says so without
    // calling it a failure of the column.
    assert.equal(over!.outcome, MissionOutcome.Lost);
    assert.match(over!.epilogue, /^The Shelf was not entered and the column did not come down\./);
    assert.match(over!.epilogue, /The column was heard and not held/, '§8: the-record, unmet');
    assert.ok(over!.epilogue.includes('Fewer than eight. Gaps are entered as gaps.'));
    // The transcript's ten gap lines, in authored order, beneath the reading.
    for (const row of attendable) {
      assert.ok(over!.epilogue.includes(row.reading!.gap), `${row.tag}: no gap entered`);
    }
    assert.deepEqual(
      over!.objectives.filter((o) => o.status === ObjectiveStatus.Met).map((o) => o.id),
      [],
      '§8: nothing was entered and nothing came down'
    );
  });
});
