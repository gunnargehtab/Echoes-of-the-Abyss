/**
 * The Attending 3, read and run — docs/mission-the-dome.md.
 *
 * `missions.test.ts` holds every mission to campaign.md §10's conventions; this
 * file holds The Dome to the things only its own document claims, and to the
 * three it claims that reading the table cannot establish:
 *
 * - **The seam** (§5, §11, §13). "Every position, period, hp and tick in §5 and
 *   §9 that *Baffle* authors is `baffle.ts`'s, unchanged, so a reader can hold
 *   the two documents side by side and find no seam." Trusting that is how a
 *   seam appears, so the picket, the convoy, both stations, the plant and the
 *   pack are asserted *against `baffle.ts` itself* rather than against numbers
 *   copied out of it — and the map's rows 2–8 against `fourthTrench.ts`.
 * - **The arithmetic** (§4, §6, §7). Every range and every ratio the document
 *   states, against the shipped propagation model: the picket at 4.8 and the
 *   array at 4.3, the Cruiser's 1,402 m against 4,204, the dome's ×1.16 and
 *   ×1.07, the basin's 14.6 against an Interest of 55, and the ping's 1,012
 *   and 834. The document's numbers are exact and this file is what keeps them
 *   exact.
 * - **The close** (§8, §9). The mission is run twice, with and without
 *   `runsItsLength`, because the flag is a correction to §13 and a correction
 *   nobody can see is a correction nobody keeps: without it both terminal rows
 *   are Met on the pass `the-mouth` is revealed and the runtime closes at
 *   19:00 exactly.
 *
 * Two findings against the document are asserted rather than described, so the
 * day either is corrected this file is what notices:
 *
 * 1. **The gates do not begin where §6, §9 and §13 say they begin.** §13: "the
 *    gate fights begin when the convoy berths at 05:00 and 14:00 rather than as
 *    it passes." §9's own 02:30 leg parks the flagship 112 m from `watch-one`
 *    and leaves it there until 05:00, and its 10:00 leg parks it 856 m from
 *    `watch-three` — inside a Cruiser's 900 m gun — until 13:30. Played
 *    passively, the first watch dies at 02:49 and the second at 10:29, and
 *    neither of the two named gates is where anything happens.
 * 2. **The basin does not hold the depth §7 gives it.** Placed at 2,300 m by
 *    Intake's idiom, it is released on the first pass and homes to its
 *    species' 2,000 m. Nothing acoustic moves — the Echo Layer resolves on
 *    horizontal distance — so §4's and §7's readings all still hold, which is
 *    why the finding is an assertion here and not a change to the literal.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_SONAR,
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
  SILENT_RUNNING,
  SIM,
  STRUCTURE_AURAS,
  StructureKind,
  TIER_THRESHOLD_MULTIPLIER,
  UnitKind,
  crushAttritionPerSecond,
  detectionRatio,
  faunaStatsFor,
  requiredPressureRating,
  statsFor,
} from '@echoes/shared';
import { FOURTH_FOOT, FOURTH_TRENCH, mapById, missionMapById } from '../src/sim/maps/index.ts';
import {
  ATTENDING_THE_DOME,
  LEDGER_BAFFLE,
  type MissionDefinition,
} from '../src/sim/missions/index.ts';
import { Match } from '../src/sim/match.ts';

const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;
const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = ATTENDING_THE_DOME.playerSlot;

const TRENCH_PF = PROPAGATION_FACTOR[Biome.AbyssalTrench];
const SUB = statsFor(UnitKind.AbyssalSubmersible);
const CHORISTER = statsFor(UnitKind.Chorister);
const CRUISER = statsFor(UnitKind.Cruiser);
const CORVETTE = statsFor(UnitKind.Corvette);
const BARGE = statsFor(UnitKind.Harvester);
const SOUNDER = faunaStatsFor(FaunaSpecies.Sounder);
const DOME_HYD = STRUCTURE_AURAS.CANTOR.HYD_CAP;

/** §11 — the two seats the mission's geometry is measured between. */
const BERTH = { x: 1500, y: 4500 };
/** §11 — the array's line, and the dome fifty metres south of it. */
const ARRAY_Y = 5450;

const unitsOf = (mission: MissionDefinition, slot: number) =>
  mission.parties.find((party) => party.slot === slot)!.units;
const byTag = (mission: MissionDefinition, tag: string) =>
  mission.parties.flatMap((p) => p.units).find((u) => u.tag === tag)!;
const structureByTag = (mission: MissionDefinition, tag: string) =>
  mission.parties.flatMap((p) => p.structures ?? []).find((s) => s.tag === tag)!;
const emitterByTag = (mission: MissionDefinition, tag: string) =>
  mission.parties.flatMap((p) => p.emitters ?? []).find((e) => e.tag === tag)!;
const beatsAt = (tick: number) => ATTENDING_THE_DOME.beats.filter((b) => b.atTick === tick);
const objective = (id: string) => ATTENDING_THE_DOME.objectives.find((o) => o.id === id)!;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * A shallow copy with the named keys dropped.
 *
 * The seam tests compare whole authored rows against `baffle.ts`'s and
 * `fourthTrench.ts`'s, and the only fields that are *meant* to differ are the
 * prose ones — a note that says which document is speaking, and the reading
 * this mission adds to an emitter that carried none.
 */
function without<T extends object>(value: T, ...keys: string[]): Record<string, unknown> {
  const copy = { ...value } as Record<string, unknown>;
  for (const key of keys) delete copy[key];
  return copy;
}

/** The range at which SIG through trench water reaches HYD at a tier's multiple. */
function rangeAt(sig: number, hyd: number, multiple: number): number {
  let low = 1;
  let high = 40000;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (detectionRatio(sig, TRENCH_PF, mid, hyd) >= multiple) low = mid;
    else high = mid;
  }
  return Math.round(low);
}

/** Where in the 3-8 band a hull of this idle SIG sits (`acoustics.ts`). */
const silentSigOf = (idleSig: number): number =>
  SILENT_RUNNING.SIG_MIN +
  (SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN) * Math.min(1, Math.max(0, idleSig / 60));

/**
 * The Drift's ladder reads a *ratio*, scaled by §2's modifier table — which is
 * why §7's 14.6 and §4's 1,012 are not perceived loudness (`fauna.ts`, `listen`).
 */
const heardBySounder = (sig: number, distanceM: number, multiplier = 1): number =>
  detectionRatio(sig, TRENCH_PF, distanceM, SOUNDER.hyd) *
  DRIFT.DIRECTORATE_AGGRO_MULTIPLIER *
  multiplier;

function sounderRange(sig: number, want: number, multiplier: number): number {
  let low = 1;
  let high = 40000;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (heardBySounder(sig, mid, multiplier) >= want) low = mid;
    else high = mid;
  }
  return Math.round(low);
}

interface Run {
  outcome: MissionOutcome;
  epilogue: string;
  closedAtTick: number;
  objectives: { id: string; status: ObjectiveStatus }[];
  /** Every tick at which the count of live watch hulls changed. */
  losses: { tick: number; alive: number }[];
}

/**
 * Play the tide out with nobody at the panel, on a variant of the literal.
 *
 * Nothing here gives an order: the picket is seated where §11 seats it, silent
 * from tick zero by the mission's own beats, and everything that happens is the
 * convoy's clock arriving.
 */
function runOut(mission: MissionDefinition): Run {
  const match = new Match(missionMapById(mission.mapId)!, { mission, fauna: false, seed: 3 });
  const losses: Run['losses'] = [];
  let alive = -1;
  for (let tick = 0; tick <= T(21); tick++) {
    const snapshots = match.update(STEP_MS);
    const own = snapshots?.get(PLAYER);
    if (own !== undefined) {
      const watch = own.units.filter((u) => u.kind === UnitKind.AbyssalSubmersible).length;
      if (watch !== alive) {
        alive = watch;
        losses.push({ tick: own.tick, alive: watch });
      }
    }
    if (match.missionOver !== null) break;
  }
  const over = match.missionOver;
  assert.ok(over !== null, 'the tide never closed');
  return {
    outcome: over.outcome,
    epilogue: over.epilogue,
    closedAtTick: match.world.tick,
    objectives: over.objectives,
    losses,
  };
}

/**
 * The same tide with the concern's guns cold — the harness §8's count needs and
 * the mission does not have.
 *
 * The flag under test is about the *count*, not about the guns: a picket whole
 * and standing in its own seat at 19:00 is the run the document describes as
 * "the mouth is attended", and it is unreachable against an armed convoy in a
 * five-hundred-metre pipe. Disarming the convoy isolates the one question.
 */
function peaceable(runsItsLength: boolean): MissionDefinition {
  const mission = {
    ...ATTENDING_THE_DOME,
    parties: ATTENDING_THE_DOME.parties.map((party) =>
      party.slot === ATTENDING_THE_DOME.playerSlot
        ? party
        : {
            ...party,
            units: party.units.map(
              (unit) => without(unit, 'armed') as unknown as (typeof party.units)[number]
            ),
          }
    ),
  } as MissionDefinition & { runsItsLength?: true };
  if (!runsItsLength) delete mission.runsItsLength;
  return mission;
}

describe("the Fourth's Foot, as docs/mission-the-dome.md §11 paints it", () => {
  it("is `fourth-trench`'s chart a thousand metres longer, row for row", () => {
    // §11: "Rows 2–8 of the table below are `fourth-trench`'s regions to the
    // metre — the same rectangles, biomes and floors — and row 1, the Margin,
    // is the same rectangle run a thousand metres further south."
    const trimmed = (region: object) => without(region, 'note');
    assert.deepEqual(
      FOURTH_FOOT.regions.slice(1, 8).map(trimmed),
      FOURTH_TRENCH.regions.slice(1, 8).map(trimmed),
      '§11: the Staging, both walls, the Trench, both lay-bys and the Deep Yard, to the metre'
    );
    const margin = FOURTH_FOOT.regions[0]!;
    const baffleMargin = FOURTH_TRENCH.regions[0]!;
    assert.equal(margin.x, baffleMargin.x);
    assert.equal(margin.widthM, baffleMargin.widthM);
    assert.equal(margin.biome, baffleMargin.biome);
    assert.equal(margin.floorM, baffleMargin.floorM);
    assert.equal(margin.heightM - baffleMargin.heightM, 1000, '§11: a thousand metres south');
    assert.equal(FOURTH_FOOT.heightM - FOURTH_TRENCH.heightM, 1000);
  });

  it('paints the last three regions the Ledger never had a reason to draw', () => {
    const [fan, foot, galleries] = FOURTH_FOOT.regions.slice(8);
    assert.deepEqual(
      [fan!.x, fan!.y, fan!.widthM, fan!.heightM, fan!.biome, fan!.floorM],
      [0, 4750, 3000, 1250, Biome.AbyssalTrench, 2000],
      '§11: the Fan — where the shortcut meets the deep'
    );
    assert.deepEqual(
      [foot!.x, foot!.y, foot!.widthM, foot!.heightM, foot!.biome, foot!.floorM],
      [750, 5250, 1500, 750, Biome.AbyssalTrench, 2400],
      '§11: the Foot — the last bench'
    );
    assert.deepEqual(
      [
        galleries!.x,
        galleries!.y,
        galleries!.widthM,
        galleries!.heightM,
        galleries!.biome,
        galleries!.floorM,
      ],
      [2250, 5000, 750, 1000, Biome.CoralRuins, 2900],
      "§11: Tessen's water, cut into the fan's east wall"
    );
    // §11: the head of the Fan is where Baffle's chart ran out of paper. Its
    // margin's last 250 m and this map's Fan meet at exactly that line.
    assert.equal(fan!.y, FOURTH_TRENCH.heightM - 250);
  });

  it('lands every rectangle on the cell grid, mines nothing, and seats one spawn at the mouth', () => {
    for (const region of FOURTH_FOOT.regions) {
      for (const metres of [region.x, region.y, region.widthM, region.heightM]) {
        assert.equal(metres % FOURTH_FOOT.cellM, 0, `${region.note}: off the 250 m cell grid`);
      }
    }
    assert.equal(FOURTH_FOOT.cellM, 250);
    assert.equal(FOURTH_FOOT.floorM, 1450, '§11: base floor 1,450');
    assert.deepEqual(
      FOURTH_FOOT.spawns.map((s) => [s.x, s.y]),
      [[1500, 4000]],
      '§11: one spawn, at the mouth'
    );
    assert.deepEqual(FOURTH_FOOT.resources, [], '§11: a closure mines nothing');
    assert.deepEqual(FOURTH_FOOT.hazards, [], '§11: no hazard sites');
    assert.equal(ATTENDING_THE_DOME.fauna, false, '§11: every animal here is a beat');
  });

  it('is a mission map and is not in the public catalogue', () => {
    assert.equal(FOURTH_FOOT.seats, 1, '§11: one seat, not balanced');
    assert.equal(mapById('fourth-foot'), undefined, 'the skirmish screen would offer it');
    assert.equal(missionMapById('fourth-foot'), FOURTH_FOOT, 'resolved by mission id only');
  });

  it('teaches nothing about the shallow line, which is mission 4’s', () => {
    // §10: "The shallowest floor this map authors is the staging's 1,100 m,
    // seven hundred metres under the Shelf line, and no hull the player owns
    // leaves 1,600."
    const floors = FOURTH_FOOT.regions.map((r) => r.floorM).filter((f): f is number => f! > 1);
    assert.equal(Math.min(...floors), 1100, "§10: the staging's floor is the shallowest metre");
    assert.equal(1100 - DEPTH_BANDS[DepthBand.Shelf].max, 700, '§10: seven hundred under the line');
    const player = unitsOf(ATTENDING_THE_DOME, PLAYER);
    assert.equal(
      Math.min(...player.map((u) => u.depthM)),
      1600,
      '§10: nothing of the player’s leaves 1,600'
    );
  });
});

describe('the picket and the array, as docs/mission-the-dome.md §2 and §3 seat them', () => {
  const player = ATTENDING_THE_DOME.parties.find((p) => p.slot === PLAYER)!;
  const watch = player.units.filter((u) => u.role === 'watch');
  const array = player.units.filter((u) => u.role === 'array');

  it('is *Baffle*’s picket, seat for seat, and the seam is asserted rather than trusted', () => {
    // §3: "*Baffle*'s four, in *Baffle*'s seats." §13 calls the inheritance "a
    // decision, not a build", so this compares against `baffle.ts` itself: a
    // number changed on either side fails here rather than in a reading.
    const theirs = unitsOf(LEDGER_BAFFLE, 2).map((u) => [u.kind, u.x, u.y, u.depthM, u.armed]);
    const ours = watch.map((u) => [u.kind, u.x, u.y, u.depthM, u.armed]);
    assert.deepEqual(ours, theirs, '§3, §5: the same four hulls in the same four seats');
    assert.equal(watch.length, 4, '§3: four Abyssal Submersibles in two standing watches');
  });

  it('fields six Choristers on the last bench, each carrying the refit §13 requires', () => {
    assert.equal(array.length, 6, '§3: six under the dome — the cohort hull, fielded at last');
    assert.deepEqual(
      array.map((u) => u.x),
      [1300, 1380, 1460, 1540, 1620, 1700],
      '§11: (1300…1700 step 80)'
    );
    for (const hull of array) {
      assert.equal(hull.kind, UnitKind.Chorister);
      assert.equal(hull.y, ARRAY_Y, '§11: one line across the foot');
      assert.equal(hull.depthM, 2300, '§11: 2,300 m over a 2,400 m floor');
      assert.equal(hull.armed, true, '§3: every hull is armed');
      // §13's finding: `missions.test.ts` reads the *hull's* rating, not
      // `effectivePressureRating`, so the Directorate's PR-3 baseline does not
      // rescue a PR-2 Chorister here and the refit must be written on all six.
      assert.equal(hull.pressureRating, 3, '§3, §13: `pressureRating: 3` authored');
    }
    assert.equal(CHORISTER.pressureRating, 2, "§13: the roster's hull is PR-2");
    assert.equal(requiredPressureRating(2300), 3, '§11: the Abyssal band starts at 1,800 m');
    assert.ok(
      crushAttritionPerSecond(CHORISTER.pressureRating, 2300) > 0,
      '§13: without the refit the array takes unhealable crush where it stands'
    );
    assert.equal(crushAttritionPerSecond(3, 2300), 0, 'and with it, none');
  });

  it('seats ten hulls silent at tick zero, at the loudness §13 corrects §6 and §7 to', () => {
    // §3: "Ten `silent` beats at tick zero." §10 calls them the campaign's
    // introduction of the toggle — the tide opens with the button pressed.
    const silent = beatsAt(0).filter((b) => b.kind === 'silent');
    assert.equal(silent.length, 10, '§3: four watch hulls and six Choristers');
    for (const beat of silent) {
      assert.equal(beat.kind === 'silent' ? beat.active : false, true);
    }
    assert.deepEqual(
      silent.map((b) => (b.kind === 'silent' ? b.tag : '')).sort(),
      [...watch, ...array].map((u) => u.tag).sort(),
      '§3: every hull the mission places, and nothing else'
    );
    // §13: "so §6 and §7 price a silent picket at 4.8 rather than 8".
    assert.equal(silentSigOf(SUB.sigIdle).toFixed(2), '4.83', '§3: an Abyssal Submersible at 4.8');
    assert.equal(silentSigOf(CHORISTER.sigIdle).toFixed(2), '4.33', '§3: a Chorister at 4.3');
    assert.ok(
      silentSigOf(SUB.sigIdle) > SILENT_RUNNING.SIG_MIN &&
        silentSigOf(SUB.sigIdle) < SILENT_RUNNING.SIG_MAX,
      '§3: the 3-8 band is entered by idle SIG, not by faction'
    );
    assert.equal(
      Math.round(ATTENDING_THE_DOME.silenceCeilingSig - silentSigOf(SUB.sigIdle)),
      25,
      '§3: under the silence ceiling by twenty-five'
    );
  });

  it('withholds three affordances and hands the ping over, which is the mission', () => {
    const locked = new Set(ATTENDING_THE_DOME.locks.map((l) => l.ability));
    assert.ok(!locked.has('activeSonar'), '§3, §4: campaign.md §10 hands the button over here');
    assert.ok(!locked.has('weapons'), '§3: the first Directorate guns pointed at another navy');
    assert.ok(!locked.has('torpedoes'));
    assert.ok(!locked.has('noisemakers'), '§3: the seekers listen at HYD 70');
    assert.ok(locked.has('construction'), '§3: the inquiry’s water is not re-rigged');
    assert.ok(locked.has('mines'), '§3: nothing is left in closed water');
    assert.ok(locked.has('depthCharges'));
    assert.equal(ATTENDING_THE_DOME.escortRadiusM, 0, '§3: nothing here is freight');
    assert.equal(ATTENDING_THE_DOME.startingNodules, undefined, '§3: no starting nodules');
  });

  it('seats four parties and leaves the court empty, and the Call holds no hulls', () => {
    // §2: "Four parties and a court slot… Slot 1 is the court's, and nothing is
    // ever seated on it."
    assert.deepEqual(
      ATTENDING_THE_DOME.parties.map((p) => p.slot),
      [0, 2, 3, 4],
      '§2: the picket, the convoy, the yard and the Call'
    );
    assert.equal(ATTENDING_THE_DOME.courtSlot, 1, '§2: the ledger’s other end');
    assert.equal(ATTENDING_THE_DOME.playerFaction, Faction.Directorate);
    const call = ATTENDING_THE_DOME.parties.find((p) => p.slot === 4)!;
    assert.equal(
      call.units.length,
      0,
      '§2, §13: hostility is Owner.slot — a friendly hull would be shot'
    );
    assert.equal(call.emitters?.length, 6, '§4: six sounds and nothing else');
    assert.equal(
      call.faction,
      Faction.Directorate,
      '§2: it carries a faction because a party must, so the Drift hears it at ×0.4'
    );
  });
});

describe('the dome and the ledger, as docs/mission-the-dome.md §4 prices them', () => {
  it('is worth most to the hull that costs least, to two decimal places', () => {
    // §4.1: range scales as hearing raised to one over the attenuation
    // exponent of 1.6 — ×1.16 to a Chorister, ×1.07 to an Abyssal Submersible,
    // ×1.29 to a Corvette.
    const gain = (from: number, to: number) => Number(Math.pow(to / from, 1 / 1.6).toFixed(2));
    assert.equal(STRUCTURE_AURAS.CANTOR.HYD_BONUS, 25, '§3: +25 HYD');
    assert.equal(STRUCTURE_AURAS.CANTOR.HYD_CAP, 95, '§3: capped at 95');
    assert.equal(STRUCTURE_AURAS.CANTOR.RADIUS_M, 1200, '§3: within 1,200 m');
    assert.equal(gain(CHORISTER.hyd, DOME_HYD), 1.16, '§4: ×1.16 to a Chorister — 75 → 95');
    assert.equal(gain(SUB.hyd, DOME_HYD), 1.07, '§4: ×1.07 to the hull they paid most for');
    assert.equal(gain(CORVETTE.hyd, 75), 1.29, "§4: ×1.29 to a Corvette — nobody's, here");
    assert.equal(
      rangeAt(CRUISER.sigCruise, DOME_HYD, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      9022,
      '§4, §7: under the dome a Chorister holds a Cruiser from 9,022 m of trench'
    );
    assert.equal(
      rangeAt(35, DOME_HYD, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      6127,
      "§7: and the yard's plant from 6,127"
    );
  });

  it('stands over the array and not over the picket, which is the whole joke', () => {
    // §4.2: the guns that owe the debt are four kilometres from the hulls that
    // lose the ears. That is geometry, so it is measured.
    const dome = structureByTag(ATTENDING_THE_DOME, 'dome');
    assert.equal(dome.kind, StructureKind.Cantor);
    assert.deepEqual([dome.x, dome.y, dome.depthM], [1500, 5500, 2300], '§3: the last bench');
    const player = ATTENDING_THE_DOME.parties.find((p) => p.slot === PLAYER)!;
    for (const hull of player.units.filter((u) => u.role === 'array')) {
      assert.ok(
        dist(dome, hull) < STRUCTURE_AURAS.CANTOR.RADIUS_M,
        `${hull.tag} is outside the dome`
      );
    }
    for (const hull of player.units.filter((u) => u.role === 'watch')) {
      assert.ok(
        dist(dome, hull) > STRUCTURE_AURAS.CANTOR.RADIUS_M,
        `${hull.tag} is inside the dome, and §4.2's joke needs it outside`
      );
    }
    assert.ok(
      dist(dome, byTag(ATTENDING_THE_DOME, 'watch-three')) > 1700,
      '§4.2: four kilometres from the hull that spent it, near enough'
    );
  });

  it('runs the ledger on a role that is not the one being helped', () => {
    assert.equal(ATTENDING_THE_DOME.arrayTag, 'dome', '§4: the instrument the court withdraws');
    assert.equal(
      ATTENDING_THE_DOME.silenceRole,
      'watch',
      '§13: for the first time, not the helped role'
    );
    assert.equal(ATTENDING_THE_DOME.silenceCeilingSig, 30, '§4: thirty per hull');
    assert.equal(ATTENDING_THE_DOME.debtCapS, 30, '§4: thirty seconds of debt');
    assert.equal(ATTENDING_THE_DOME.sigBudget, 28, "§4: an Abyssal Submersible's cruise");
    // §4: "twenty-eight is two below the thirty that costs the array its dome",
    // and it is the first budget in the campaign pitched against a sanction.
    assert.equal(ATTENDING_THE_DOME.silenceCeilingSig - ATTENDING_THE_DOME.sigBudget, 2);
    assert.equal(SUB.sigIdle, 22, '§4: under');
    assert.equal(SUB.sigCruise, 28, '§4: under');
    assert.equal(SUB.sigIdle + SUB.sigFiringBurst, 42, '§4: one that fires is over');
    assert.equal(SUB.sigCruise + SUB.sigFiringBurst, 48, '§4: and over cruising');
    assert.equal(SILENT_RUNNING.BREAK_SILENCE_SIG_SPIKE, 40, '§4: dropping it spikes +40');
    assert.equal(SILENT_RUNNING.BREAK_SILENCE_DURATION_S, 2, '§4: for two seconds');
  });
});

describe('the Call, as docs/mission-the-dome.md §4 sounds it', () => {
  const voices = ATTENDING_THE_DOME.parties.find((p) => p.slot === 4)!.emitters!;

  it('is six voices on six periods, five seconds on, for two minutes', () => {
    assert.equal(voices.length, 6);
    assert.deepEqual(
      voices.map((v) => v.periodTicks / SIM.TICK_HZ),
      [7, 9, 11, 13, 15, 17],
      '§4.3: the periods that beat against each other'
    );
    for (const v of voices) {
      assert.equal(v.sig, CHORISTER.sigIdle, '§4.3: the loudness of a Chorister at rest');
      assert.equal(v.onTicks / SIM.TICK_HZ, 5, '§4.3: five seconds on');
      assert.equal(v.depthM, 1950, '§11: standing in the Fan, over a 2,000 m floor');
      assert.equal(
        v.hp,
        5000,
        '§4.3, §13: eighty-three seconds of a Cruiser against a two-minute window'
      );
      assert.equal(v.fromTick, T(13), '§9: the Call opens at 13:00');
      assert.equal(v.untilTick, T(15), '§9: and closes at 15:00');
    }
    assert.equal((T(15) - T(13)) / SIM.TICK_HZ, 120, '§5: from 13:00 to 15:00');
    // §13: a Cruiser at 60 a second needs 83 s to argue with one of them.
    assert.equal(Math.round(5000 / 60), 83);
  });

  it('spreads as a cohort at rest would, north of and above the six that are real', () => {
    assert.deepEqual(
      voices.map((v) => [v.tag, v.x, v.y]),
      [
        ['call-a', 1300, 5050],
        ['call-b', 1450, 5000],
        ['call-c', 1600, 5100],
        ['call-d', 1750, 5050],
        ['call-e', 1900, 5150],
        ['call-f', 1400, 5150],
      ],
      '§4.3: the spread, verbatim'
    );
    // §6: "Six of the cohort *are* at the foot — three to four hundred metres
    // south of the phantom and three hundred and fifty deeper."
    const array = unitsOf(ATTENDING_THE_DOME, PLAYER).filter((u) => u.role === 'array');
    const southward = voices.map((v) => ARRAY_Y - v.y);
    assert.equal(Math.min(...southward), 300, '§6: three hundred metres at the nearest');
    assert.equal(Math.max(...southward), 450, '§6: and four hundred and fifty at the furthest');
    for (const v of voices) {
      assert.ok(v.y < ARRAY_Y, `${v.tag}: the real six are south of the phantom`);
      assert.equal(2300 - v.depthM, 350, '§6: and three hundred and fifty deeper');
    }
    // The array is close enough to the lie to hear all six of it, which is why
    // §6 says the count is free and the difficulty was never the hearing.
    const gaps = voices.map((v) => Math.min(...array.map((h) => dist(v, h))));
    assert.ok(Math.max(...gaps) < 500, `§6: ${gaps.map((g) => Math.round(g)).join(', ')} m`);
  });

  it('carries one reading, so the count cannot be padded by hearing the same lie six times', () => {
    const attendable = voices.filter((v) => v.reading !== undefined);
    assert.equal(attendable.length, 1, '§6: the other five carry no reading');
    assert.equal(attendable[0]!.tag, 'call-a');
    assert.match(
      attendable[0]!.reading!.entered,
      /^Entered: a cohort at the foot, six/,
      '§6, verbatim'
    );
    assert.match(attendable[0]!.reading!.gap, /heard their own voice as nothing/, '§6, verbatim');
    // §6: at Track from 400 m, which is what "this mission makes it free, on
    // purpose" means — the difficulty was never the hearing.
    const array = unitsOf(ATTENDING_THE_DOME, PLAYER).filter((u) => u.role === 'array');
    assert.equal(
      Math.round(Math.min(...array.map((h) => dist(attendable[0]!, h)))),
      400,
      '§6: 400 m'
    );
    assert.ok(400 < rangeAt(CHORISTER.sigIdle, DOME_HYD, TIER_THRESHOLD_MULTIPLIER.TRACK));
  });
});

describe('what is heard, as docs/mission-the-dome.md §7 measures it', () => {
  it('states the trench’s range table exactly, in both directions', () => {
    const M = TIER_THRESHOLD_MULTIPLIER;
    assert.equal(TRENCH_PF, 1.6, '§1: no secrets down its length, only distances');
    // The picket's ears, pointed down the pipe.
    assert.equal(rangeAt(CRUISER.sigCruise, SUB.hyd, M.CONTACT), 8416);
    assert.equal(rangeAt(CRUISER.sigCruise, SUB.hyd, M.CLASSIFICATION), 4747);
    assert.equal(rangeAt(CRUISER.sigCruise, SUB.hyd, M.TRACK), 3538);
    assert.equal(rangeAt(CRUISER.sigIdle, SUB.hyd, M.CONTACT), 7581);
    assert.equal(rangeAt(CORVETTE.sigCruise, SUB.hyd, M.CONTACT), 4972);
    assert.equal(rangeAt(CORVETTE.sigCruise, SUB.hyd, M.CLASSIFICATION), 2804);
    assert.equal(rangeAt(BARGE.sigCruise, SUB.hyd, M.CONTACT), 6213);
    // The concern's ears, pointed back — and the two and a half kilometres of
    // pipe that silence is worth (§6).
    assert.equal(rangeAt(SUB.sigCruise, CRUISER.hyd, M.CONTACT), 4204);
    assert.equal(rangeAt(SUB.sigCruise, CRUISER.hyd, M.BEARING), 3263);
    assert.equal(rangeAt(SUB.sigCruise, CRUISER.hyd, M.CLASSIFICATION), 2371);
    assert.equal(rangeAt(SUB.sigCruise, CRUISER.hyd, M.TRACK), 1768);
    assert.equal(rangeAt(SUB.sigIdle, CRUISER.hyd, M.CONTACT), 3616);
    assert.equal(rangeAt(silentSigOf(SUB.sigIdle), CRUISER.hyd, M.CONTACT), 1402);
    assert.equal(rangeAt(SUB.sigCruise + SUB.sigFiringBurst, CRUISER.hyd, M.CONTACT), 5888);
    assert.equal(rangeAt(SUB.sigCruise + SUB.sigFiringBurst, CRUISER.hyd, M.TRACK), 2476);
    assert.equal(
      Math.round((4204 - 1402) / 100) * 100,
      2800,
      '§6: silence is worth two and a half kilometres of the pipe, and a little more'
    );
  });

  it('hears the muster through the layer from one end and not from the other', () => {
    // §7: "The path mean from the flagship to `watch-one` is 0.307 over 856 m
    // and the first watch still holds an idling Cruiser at Track (ratio 6.3)."
    const flagship = byTag(ATTENDING_THE_DOME, 'flagship');
    const watchOne = byTag(ATTENDING_THE_DOME, 'watch-one');
    assert.equal(Math.round(dist(flagship, watchOne)), 856, '§7: 856 m');
    const ratio = detectionRatio(CRUISER.sigIdle, 0.307, dist(flagship, watchOne), SUB.hyd);
    assert.ok(Math.abs(ratio - 6.3) < 0.05, `§7: ratio 6.3, got ${ratio.toFixed(2)}`);
    assert.ok(
      ratio >= TIER_THRESHOLD_MULTIPLIER.TRACK,
      '§7: Track — the picket knows it is coming'
    );
    // And the dive at 02:30, which the array reads only because of the dome.
    const dive = beatsAt(T(2, 30)).find((b) => b.kind === 'move' && b.tag === 'flagship')!;
    assert.equal(
      dive.kind === 'move' ? dive.depthM : undefined,
      1600,
      '§13: the move beat carries a depth'
    );
    const array = byTag(ATTENDING_THE_DOME, 'array-four');
    const reach = dist({ x: 1500, y: 1100 }, array);
    assert.equal(Math.round(reach), 4350, '§7: 4,350 m south');
    const withDome = detectionRatio(CRUISER.sigCruise, 1.53, reach, DOME_HYD);
    const without = detectionRatio(CRUISER.sigCruise, 1.53, reach, CHORISTER.hyd);
    assert.ok(
      withDome >= TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION,
      `§7: Classification (${withDome.toFixed(2)})`
    );
    assert.ok(without < TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION, '§7: Bearing without it');
    assert.ok(without >= TIER_THRESHOLD_MULTIPLIER.BEARING, `§7: 2.4 (${without.toFixed(2)})`);
  });

  it('leaves the basin ambient, and says exactly what a ping would cost', () => {
    // §7: "the dome's 35 through 1.6 at 625 m reads 14.6 against an Interest of
    // 55, and six idling Choristers read 4.3 to 9.0". The ladder reads a
    // *ratio* through §2's modifier table, which is why these are not loudness.
    const dome = structureByTag(ATTENDING_THE_DOME, 'dome');
    const basin = { x: 2000, y: 5875 };
    assert.equal(Math.round(dist(dome, basin)), 625, '§7: 625 m off the dome');
    assert.equal(heardBySounder(35, 625).toFixed(1), '14.6', '§7: the loudest silence on the map');
    assert.ok(heardBySounder(35, 625) < SOUNDER.interest, '§7: and it is only silence');
    const array = unitsOf(ATTENDING_THE_DOME, PLAYER).filter((u) => u.role === 'array');
    const reaches = array.map((h) => dist(h, basin)).sort((a, b) => a - b);
    assert.deepEqual(
      [Math.round(reaches[0]!), Math.round(reaches[reaches.length - 1]!)],
      [520, 819],
      "§4: the array's six seats stand 520 to 819 m from it"
    );
    assert.equal(heardBySounder(CHORISTER.sigIdle, 818.9).toFixed(1), '4.3', '§7: 4.3');
    assert.equal(heardBySounder(CHORISTER.sigIdle, 520.2).toFixed(1), '9.0', '§7: to 9.0');
    // §4.4: the ping's ×3 against the Directorate's ×0.4 leaves a net ×1.2.
    const net = ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER * DRIFT.DIRECTORATE_AGGRO_MULTIPLIER;
    assert.ok(Math.abs(net - 1.2) < 1e-9, '§4: a net ×1.2 on the aggro ladder');
    const sig = ACTIVE_SONAR.EMITTER_SIG;
    assert.equal(sig, 95, '§4: SIG 95 for three seconds');
    assert.equal(ACTIVE_SONAR.REVEAL_DURATION_S, 3);
    assert.equal(
      sounderRange(sig, SOUNDER.interest, ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER),
      1012,
      '§4: interested inside 1,012 m'
    );
    assert.equal(
      sounderRange(sig, SOUNDER.commit, ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER),
      834,
      '§4: commits inside 834 m'
    );
    // §4: "A picket that asks at the foot is answered; a picket that asks at
    // the mouth, 2,133 m out, is not."
    assert.ok(reaches[0]! < 834, '§4: the array stands inside the commit');
    assert.ok(2133 > 1012, '§4: and the mouth stands outside the interest');
  });
});

describe('the count, as docs/mission-the-dome.md §6 takes it', () => {
  it('measures the mouth’s geometry, which is the whole objective', () => {
    const region = ATTENDING_THE_DOME.regions.find((r) => r.id === 'the-mouth')!;
    assert.deepEqual(
      [region.x, region.y, region.widthM, region.heightM],
      [1250, 3500, 500, 500],
      "§11: the trench's last half-kilometre above the yard"
    );
    assert.equal(region.pressureBonus, undefined, 'nothing here manufactures habitable water');
    // §11: "a hull at (1500, 3550) is 950 m from the berth and outside a
    // Cruiser's gun, and one on the region's southern edge is 500 m from it".
    assert.equal(dist({ x: 1500, y: 3550 }, BERTH), 950);
    assert.equal(dist({ x: 1500, y: region.y + region.heightM }, BERTH), 500);
    assert.equal(CRUISER.attackRangeM, 900, '§6: the gun the north lip is outside of');
    assert.equal(CORVETTE.attackRangeM, 550);
    const marker = ATTENDING_THE_DOME.markers[0]!;
    assert.deepEqual(
      [marker.id, marker.x, marker.y, marker.radiusM],
      ['mouth', 1500, 3625, 375],
      '§11'
    );
    // §11, §9: the array, 950 m south of the berth, is fifty metres outside it.
    const array = unitsOf(ATTENDING_THE_DOME, PLAYER).filter((u) => u.role === 'array');
    const nearest = Math.min(...array.map((h) => dist(h, BERTH)));
    assert.equal(Math.round(nearest), 951, '§9: the array, 950 m south');
    assert.ok(nearest - CRUISER.attackRangeM > 50, "§1: fifty metres outside a Cruiser's reach");
  });

  it('spends the attend instrument on two sounds that cost nothing to hear', () => {
    // §6: the plant at Track from 757 m and `call-a` from 400 m.
    const plant = emitterByTag(ATTENDING_THE_DOME, 'yard-plant');
    assert.equal(
      Math.round(dist(plant, byTag(ATTENDING_THE_DOME, 'watch-three'))),
      757,
      '§5, §6: 757 m'
    );
    assert.ok(
      757 < rangeAt(plant.sig, SUB.hyd, TIER_THRESHOLD_MULTIPLIER.TRACK),
      '§6: at Track from the first tick'
    );
    const array = unitsOf(ATTENDING_THE_DOME, PLAYER).filter((u) => u.role === 'array');
    assert.equal(
      Math.round(Math.min(...array.map((h) => dist(plant, h)))),
      951,
      '§7: the array at 950 m'
    );
    assert.ok(951 < rangeAt(plant.sig, DOME_HYD, TIER_THRESHOLD_MULTIPLIER.TRACK), '§7: at Track');
    const attendable = ATTENDING_THE_DOME.parties
      .flatMap((p) => p.emitters ?? [])
      .filter((e) => e.reading !== undefined);
    assert.deepEqual(
      attendable.map((e) => e.tag),
      ['yard-plant', 'call-a'],
      '§6: two, in this order'
    );
    assert.deepEqual(objective('the-count').predicate, { kind: 'attend', count: 2 });
  });

  it('is *Baffle*’s plant, made attendable, and *Baffle*’s stations and pack unchanged', () => {
    const theirPlant = LEDGER_BAFFLE.parties.flatMap((p) => p.emitters ?? [])[0]!;
    const ourPlant = emitterByTag(ATTENDING_THE_DOME, 'yard-plant');
    assert.deepEqual(
      without(ourPlant, 'reading', 'note'),
      without(theirPlant, 'reading', 'note'),
      '§5: the plant, literally'
    );
    assert.ok(
      ourPlant.reading !== undefined,
      '§5: and made *attendable* here, which it was not there'
    );
    assert.match(ourPlant.reading!.entered, /Forty-one are on its complement/, '§6, verbatim');

    const theirStations = LEDGER_BAFFLE.parties.flatMap((p) => p.structures ?? []);
    const ourStations = ATTENDING_THE_DOME.parties
      .filter((p) => p.slot === 2)
      .flatMap((p) => p.structures ?? []);
    assert.deepEqual(
      ourStations.map((s) => [s.tag, s.kind, s.x, s.y, s.depthM]),
      theirStations.map((s) => [s.tag, s.kind, s.x, s.y, s.depthM]),
      '§5: both stations, in `baffle.ts`’s moorings'
    );

    const theirPack = LEDGER_BAFFLE.beats.filter((b) => b.kind === 'creature');
    const ourPack = ATTENDING_THE_DOME.beats.filter(
      (b) => b.kind === 'creature' && b.species === FaunaSpecies.Draymaw
    );
    assert.deepEqual(
      ourPack.map((b) => JSON.stringify({ ...b, note: '' })),
      theirPack.map((b) => JSON.stringify({ ...b, note: '' })),
      "§13: *Baffle*'s three beats, inherited whole — `driveTo` with no depth included"
    );
  });

  it('is stood into at 02:30 and 10:00, which §6, §9 and §13 do not say', () => {
    // A finding, asserted so a correction is noticed. §13: "the gate fights
    // begin when the convoy berths at 05:00 and 14:00 rather than as it
    // passes." §9's own 02:30 and 10:00 legs are berths too, and both are
    // inside a Cruiser's gun of a watch that has not been told to move.
    const watchOne = byTag(ATTENDING_THE_DOME, 'watch-one');
    const watchThree = byTag(ATTENDING_THE_DOME, 'watch-three');
    const watchFour = byTag(ATTENDING_THE_DOME, 'watch-four');
    assert.equal(Math.round(dist({ x: 1500, y: 1350 }, watchOne)), 224, '§6: 224 m at 05:00');
    assert.equal(Math.round(dist({ x: 1500, y: 3700 }, watchThree)), 112, '§6: 112 m at 14:00');
    // The two the document does not name.
    assert.equal(
      Math.round(dist({ x: 1500, y: 1100 }, watchOne)),
      112,
      '§7 measures this and §9 does not price it'
    );
    assert.equal(Math.round(dist({ x: 1500, y: 2900 }, watchThree)), 856);
    assert.equal(Math.round(dist({ x: 1500, y: 2900 }, watchFour)), 886);
    for (const d of [856, 886]) {
      assert.ok(
        d < CRUISER.attackRangeM,
        'the 10:00 leg holds both hulls of the second watch under the gun'
      );
    }
    // And what that costs a picket that does what §12 says it may: nothing.
    const run = runOut(ATTENDING_THE_DOME);
    const lost = run.losses.filter((l) => l.alive < 4);
    assert.equal(lost[lost.length - 1]!.alive, 0, 'a seated picket does not last the tide');
    const firstLoss = lost[0]!.tick / SIM.TICK_HZ;
    assert.ok(
      firstLoss > T(2, 30) / SIM.TICK_HZ && firstLoss < T(5) / SIM.TICK_HZ,
      `§9: the first watch dies at ${firstLoss.toFixed(0)}s, inside the 02:30 leg and before the 05:00 gate`
    );
    const secondLoss = lost.find((l) => l.alive === 1)!.tick / SIM.TICK_HZ;
    assert.ok(
      secondLoss > T(10) / SIM.TICK_HZ && secondLoss < T(13, 30) / SIM.TICK_HZ,
      `§9: the second watch dies at ${secondLoss.toFixed(0)}s, inside the 10:00 leg and before the 14:00 gate`
    );
    assert.equal(run.outcome, MissionOutcome.Lost, '§8: and the reading is the convoy was louder');
    assert.match(run.epilogue, /^The mouth was not attended/, '§8, verbatim');
  });
});

describe('the objective, as docs/mission-the-dome.md §8 chooses it', () => {
  it('reads four rows, two of them terminal, and neither of those a keystone', () => {
    assert.deepEqual(
      ATTENDING_THE_DOME.objectives.map((o) => o.id),
      ['the-mouth', 'the-picket', 'the-count', 'the-record'],
      "§8's table, in §8's order"
    );
    const terminal = ATTENDING_THE_DOME.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => o.id),
      ['the-mouth', 'the-picket']
    );
    for (const row of terminal) {
      assert.notEqual(row.keystone, true, '§8: the omission is the argument');
      assert.equal(row.reading, undefined, '§8: only the two read-out rows carry readings');
    }
    assert.deepEqual(objective('the-mouth').predicate, {
      kind: 'extract',
      role: 'watch',
      region: 'the-mouth',
      count: 2,
    });
    assert.deepEqual(objective('the-picket').predicate, {
      kind: 'survive',
      role: 'watch',
      count: 3,
    });
    assert.deepEqual(objective('the-record').predicate, {
      kind: 'tolerance',
      ticks: 180,
      tier: ResolutionTier.Track,
    });
    // §8: 180 sim ticks is "three seconds, the exact length of an active-sonar
    // reveal", and that identity is the reason for the number.
    assert.equal(180 / SIM.TICK_HZ, ACTIVE_SONAR.REVEAL_DURATION_S);
    assert.equal(objective('the-picket').debtText, 'The picket owes the stalls a silence.', '§12');
  });

  it('asks the mouth at the whistle, because an extract latches and never un-latches', () => {
    const mouth = objective('the-mouth');
    assert.equal(mouth.revealAtTick, T(19), '§9: revealed with the stalls’ beat');
    assert.equal(mouth.markerId, 'mouth');
    assert.ok(
      beatsAt(T(19)).some((b) => b.kind === 'say'),
      '§9: the stalls call the count on the same tick'
    );
    // §8's own reason, as geometry: revealed at 00:00 it would be met at 00:00
    // by the second watch sitting in its own seat.
    const region = ATTENDING_THE_DOME.regions.find((r) => r.id === 'the-mouth')!;
    const inside = unitsOf(ATTENDING_THE_DOME, PLAYER).filter(
      (u) =>
        u.role === 'watch' &&
        u.x >= region.x &&
        u.x <= region.x + region.widthM &&
        u.y >= region.y &&
        u.y <= region.y + region.heightM
    );
    assert.deepEqual(
      inside.map((u) => u.tag),
      ['watch-three', 'watch-four'],
      '§8: two hulls, at tick zero, in the region the count is taken over'
    );
  });

  it('runs its length, which §13 says it does not — and this is the minute at stake', () => {
    // The correction the literal makes to its own document, measured. §13's
    // definition row lists "no `runsItsLength`"; both terminal rows can be Met
    // on the pass `the-mouth` is revealed, so without the flag the runtime
    // closes at 19:00 and the last minute of §9's table never happens.
    assert.equal(ATTENDING_THE_DOME.runsItsLength, true);
    const withFlag = runOut(peaceable(true));
    const without = runOut(peaceable(false));
    assert.equal(withFlag.closedAtTick, T(20), '§9: the whistle at 20:00');
    assert.equal(
      without.closedAtTick,
      T(19),
      'without the flag, a minute early, on the reveal itself'
    );
    assert.equal(
      T(20) - T(19),
      MISSION.FAILURE_TELEGRAPH_S * SIM.TICK_HZ,
      'and the minute is the telegraph'
    );
    for (const run of [withFlag, without]) {
      assert.equal(run.outcome, MissionOutcome.Complete, 'both terminal rows Met either way');
      assert.deepEqual(
        run.objectives
          .filter((o) => o.status === ObjectiveStatus.Met)
          .map((o) => o.id)
          .sort(),
        ['the-count', 'the-mouth', 'the-picket', 'the-record'],
        '§8: and the two read-out rows with them'
      );
    }
    // What the missing minute costs: Korrin's last sentence and the resolve
    // that §8 insists is not a conclusion.
    assert.ok(
      ATTENDING_THE_DOME.beats.some((b) => b.kind === 'say' && b.atTick === T(20)),
      '§12: the sentence she should not say aloud'
    );
  });

  it('assembles the close in §8’s order, and reads all three of Korrin’s results', () => {
    const run = runOut(peaceable(true));
    const lines = run.epilogue.split('\n').filter((l) => l.trim().length > 0);
    assert.match(lines[0]!, /^The mouth was attended at the whistle/, '§8: Complete, verbatim');
    assert.match(
      lines[0]!,
      /asset number the picket did not give it\.$/,
      "§8: the sweep's filed line, appended"
    );
    assert.deepEqual(
      lines.slice(1),
      [
        'The count is entered: the plant, and the Call.',
        objective('the-record').reading!.met,
        emitterByTag(ATTENDING_THE_DOME, 'yard-plant').reading!.entered,
        emitterByTag(ATTENDING_THE_DOME, 'call-a').reading!.entered,
      ],
      "§8: the count's, the record's, then the plant's before the Call's"
    );
    assert.match(
      ATTENDING_THE_DOME.epilogue[MissionOutcome.Partial],
      /^Sufficient\./,
      '§8, verbatim'
    );
    assert.match(
      ATTENDING_THE_DOME.epilogue[MissionOutcome.Lost],
      /It is not a failure of yours; it is a convoy against a law, and the convoy was louder\.$/,
      '§8, verbatim'
    );
  });
});

describe('the beats, as docs/mission-the-dome.md §9 clocks them', () => {
  it('is *Baffle*’s convoy on *Baffle*’s clock, in formation and carrying a depth', () => {
    // §5: the escorts hold a hundred metres either side and fifty ahead, the
    // barge trails a hundred and fifty astern, and all four carry the
    // flagship's authored depth — except at the two pockets, which are 250 m
    // square against a 300 m formation.
    const convoy = unitsOf(ATTENDING_THE_DOME, 2);
    assert.deepEqual(
      convoy.map((u) => [u.tag, u.kind, u.x, u.y, u.depthM, u.armed ?? false]),
      unitsOf(LEDGER_BAFFLE, 0).map((u) => [u.tag, u.kind, u.x, u.y, u.depthM, u.armed ?? false]),
      '§5: seated where `baffle.ts` seats it'
    );
    assert.equal(
      convoy.every((u) => u.role === undefined),
      true,
      'and none of them carries a role'
    );
    for (const [tick, x, y, depth] of [
      [T(2, 30), 1500, 1100, 1600],
      [T(5), 1500, 1350, 1600],
      [T(10), 1500, 2900, 1600],
      [T(14), 1500, 3700, 1600],
    ] as const) {
      const legs = beatsAt(tick).filter((b) => b.kind === 'move');
      assert.equal(legs.length, 4, `${tick}: the whole formation moves`);
      const seats = legs.map((b) => (b.kind === 'move' ? [b.tag, b.x, b.y, b.depthM] : []));
      assert.deepEqual(seats, [
        ['flagship', x, y, depth],
        ['corvette-1', x - 100, y - 50, depth],
        ['corvette-2', x + 100, y - 50, depth],
        ['plant-barge', x, y + 150, depth],
      ]);
    }
    // §5's two exceptions, seat by seat.
    const layByOne = beatsAt(T(8, 30)).filter((b) => b.kind === 'move');
    assert.deepEqual(
      layByOne.map((b) => (b.kind === 'move' ? [b.tag, b.x, b.y, b.depthM] : [])),
      [
        ['flagship', 1150, 1900, 1650],
        ['corvette-1', 1300, 1850, 1650],
        ['corvette-2', 1300, 1950, 1650],
        ['plant-barge', 1100, 1950, 1650],
      ],
      '§5, §9: into Lay-by One'
    );
    const layByTwo = beatsAt(T(13, 30)).filter((b) => b.kind === 'move');
    assert.deepEqual(
      layByTwo.map((b) => (b.kind === 'move' ? [b.tag, b.x, b.y, b.depthM] : [])),
      [
        ['flagship', 1850, 3150, 1650],
        ['corvette-1', 1700, 3100, 1650],
        ['corvette-2', 1700, 3200, 1650],
        ['plant-barge', 1900, 3200, 1650],
      ],
      '§5: the same seats mirrored about the axis'
    );
    const berth = beatsAt(T(17)).filter((b) => b.kind === 'move');
    assert.deepEqual(
      berth.map((b) => (b.kind === 'move' ? [b.tag, b.x, b.y, b.depthM] : [])),
      [
        ['flagship', 1500, 4500, 1650],
        ['corvette-1', 1400, 4450, 1650],
        ['corvette-2', 1600, 4450, 1650],
        ['plant-barge', 1500, 4550, 1650],
      ],
      '§5: and the barge closes to (1500, 4550) at the berth'
    );
    // §11: the yard's floor is the one place a hull is seated on the bottom.
    const yard = FOURTH_FOOT.regions.find((r) => r.floorM === 1650)!;
    assert.equal(yard.floorM, 1650, '`terrain.admits` is inclusive at the floor');
  });

  it('places the writ’s one transmission, which `baffle.ts` never authors', () => {
    const ping = ATTENDING_THE_DOME.beats.filter((b) => b.kind === 'ping');
    assert.equal(ping.length, 1, '§9: one ping, at 14:30');
    assert.equal(ping[0]!.atTick, T(14, 30));
    assert.equal(ping[0]!.kind === 'ping' ? ping[0]!.tag : '', 'flagship');
    assert.equal(
      LEDGER_BAFFLE.beats.filter((b) => b.kind === 'ping').length,
      0,
      "§13: `baffle.ts` authors no ping at all — this is the writ's own advice, placed"
    );
    // §9: the array reads it from 1,750 m, and anything of the picket inside
    // the Tier-4 window is in the concern's registry.
    const array = byTag(ATTENDING_THE_DOME, 'array-four');
    assert.equal(Math.round(dist({ x: 1500, y: 3700 }, array)), 1750, '§7: 1,750 m');
    assert.equal(ACTIVE_SONAR.REVEAL_RADIUS_M, 900, '§9: Tier-4 inside 900 m');
    assert.equal(
      ACTIVE_SONAR.SELF_REVEAL_RADIUS_M,
      2400,
      '§4: self-revealing at 2,400 m in open water'
    );
  });

  it('corrects the northern mooring at 13:00, from the hand that made it', () => {
    const lose = ATTENDING_THE_DOME.beats.filter((b) => b.kind === 'lose');
    assert.equal(lose.length, 1);
    assert.equal(lose[0]!.atTick, T(13));
    assert.equal(lose[0]!.kind === 'lose' ? lose[0]!.tag : '', 'baffle-north');
    const theirs = LEDGER_BAFFLE.beats.find((b) => b.kind === 'lose')!;
    assert.equal(theirs.atTick, T(13), '§13: *Baffle* §7 at the same tick, from the other side');
    assert.equal(theirs.kind === 'lose' ? theirs.tag : '', 'baffle-north');
    assert.ok(
      beatsAt(T(13)).some((b) => b.kind === 'say' && b.speaker.startsWith('Picket-Speaker')),
      "§12: and the Picket-Speaker's correction"
    );
  });

  it('closes at the whistle with ninety seconds of pack in front of it, and not as a conclusion', () => {
    const resolve = ATTENDING_THE_DOME.beats.find((b) => b.kind === 'resolve')!;
    assert.equal(resolve.atTick, T(20), '§9: twenty minutes, *Baffle*’s to the second');
    assert.notEqual(
      resolve.kind === 'resolve' ? resolve.conclusion : undefined,
      true,
      '§8: a picket can lose this, so it is resolved rather than concluded'
    );
    const loud = ATTENDING_THE_DOME.beats.filter((b) => b.kind === 'creature' && b.loud);
    assert.equal(loud.length, 3, '§9: three Draymaws');
    assert.equal(loud[0]!.atTick, T(18, 30));
    assert.equal(
      (resolve.atTick - loud[0]!.atTick) / SIM.TICK_HZ,
      90,
      '§8: ninety seconds against campaign.md §10’s sixty'
    );
    assert.ok(90 >= MISSION.FAILURE_TELEGRAPH_S);
    const [low, high] = ATTENDING_THE_DOME.lengthBandS;
    assert.deepEqual([low, high], [1140, 1260], '§9: the band [1140, 1260]');
    assert.equal(resolve.atTick / SIM.TICK_HZ, 1200);
  });

  it('speaks §12’s voices at §9’s ticks, and says nothing at the close but Korrin', () => {
    const said = ATTENDING_THE_DOME.beats
      .filter((b) => b.kind === 'say')
      .map((b) => [b.atTick / SIM.TICK_HZ, b.kind === 'say' ? b.speaker : '']);
    assert.deepEqual(said, [
      [0, 'First Cantor Vehl Ossary'],
      [0, 'Undermarshal Setha Korrin'],
      [90, 'Lift Foreman Dessa Vail, on the concern’s open channel'],
      [240, 'Picket-Speaker, Fourth Trench Cohort'],
      [720, 'The stalls'],
      [780, 'First Cantor Vehl Ossary'],
      [780, 'Picket-Speaker, Fourth Trench Cohort'],
      [1050, 'Yardmaster Brann Holt, on the yard channel'],
      [1050, 'Mara Tessen, 4th Trench Cohort, from the freight galleries'],
      [1140, 'The stalls'],
      [1200, 'Undermarshal Setha Korrin'],
    ]);
    // §12: "First Cantor Vehl Ossary, at the close — 20:00. *Nothing.*"
    assert.equal(
      said.filter(([tick, who]) => tick === 1200 && String(who).includes('Ossary')).length,
      0,
      '§12: he is present, he sounded the Call, and he does not speak at the count'
    );
    const close = ATTENDING_THE_DOME.beats.find((b) => b.atTick === T(20) && b.kind === 'say')!;
    assert.equal(
      close.kind === 'say' ? close.text : '',
      'The first thing those below have ever put into the water was a lie. I would have preferred it were a question.',
      '§12, verbatim — one sentence per mission, and the third of them'
    );
  });

  it('hangs one line off the tally, because no predicate reads the picket’s own ping', () => {
    const conditionals = ATTENDING_THE_DOME.conditionalBeats ?? [];
    assert.equal(conditionals.length, 1, '§9: one conditional beat');
    const beat = conditionals[0]!;
    assert.equal(beat.kind, 'say');
    assert.deepEqual(
      beat.when,
      { kind: 'tolerance', ticks: 60, tier: ResolutionTier.Track },
      '§9: one second at Track'
    );
    assert.equal(beat.when.kind === 'tolerance' ? beat.when.ticks / SIM.TICK_HZ : 0, 1);
    assert.equal(beat.choiceGroup, undefined, '§9: it fires at whichever of three came first');
    assert.equal(beat.kind === 'say' ? beat.speaker : '', 'Undermarshal Setha Korrin');
    assert.match(
      beat.kind === 'say' ? beat.text : '',
      /Whether it was asked or shot at is not a distinction the registry keeps/,
      '§12, verbatim — authored to be true of a gate fight and of a transmission alike'
    );
  });

  it('sweeps the concern’s flagship in the two gate windows, and nobody else', () => {
    const sweep = ATTENDING_THE_DOME.sweep!;
    assert.deepEqual(sweep.tags, ['flagship'], '§13: the concern’s flagship');
    assert.deepEqual(
      sweep.windows.map((w) => [w.fromTick / SIM.TICK_HZ, w.untilTick / SIM.TICK_HZ]),
      [
        [300, 480],
        [840, 1020],
      ],
      '§13: 05:00–08:00 and 14:00–17:00'
    );
    assert.match(
      sweep.filedReading,
      /^The concern's flagship classified the picket at a gate/,
      '§8, verbatim'
    );
    // §13: it files at a ratio of 1, so "classified" is prose the geometry has
    // to earn — 18.8 from 224 m and 57 from 112 m against a silent hull.
    const silent = silentSigOf(SUB.sigIdle);
    const first = detectionRatio(silent, TRENCH_PF, 224, CRUISER.hyd);
    const second = detectionRatio(silent, TRENCH_PF, 112, CRUISER.hyd);
    assert.equal(first.toFixed(1), '18.8', '§13: 18.8 at the first gate');
    assert.equal(second.toFixed(0), '57', '§13: 57 at the second');
    assert.ok(
      first >= TIER_THRESHOLD_MULTIPLIER.TRACK && second >= TIER_THRESHOLD_MULTIPLIER.TRACK,
      '§13: both Track'
    );
  });
});

describe('the basin, as docs/mission-the-dome.md §7 and §13 place it', () => {
  const basin = ATTENDING_THE_DOME.beats.find(
    (b) => b.kind === 'creature' && b.species === FaunaSpecies.Sounder
  )!;

  it('is placed and not driven, by Intake’s idiom, at tick zero', () => {
    assert.equal(basin.atTick, 0, '§9: placed with the map');
    assert.equal(
      basin.kind === 'creature' ? basin.loud : true,
      false,
      'nothing about a sleeping animal is a precursor'
    );
    if (basin.kind !== 'creature') return;
    assert.deepEqual(
      basin.spawnAt,
      { x: 2000, y: 5875, depthM: 2300 },
      '§7, §9: (2000, 5875) at 2,300 m'
    );
    assert.deepEqual(basin.driveTo, { x: 2000, y: 5875 }, '§13: driven to its own spawn');
    assert.equal(basin.untilTick, 0, '§13: so the first pass hands it to its trigger model');
    assert.equal(SOUNDER.depthBandM, 700, '§11: band 1,300–2,700 m');
    assert.equal(SOUNDER.workingDepthM - SOUNDER.depthBandM, 1300);
    assert.equal(SOUNDER.workingDepthM + SOUNDER.depthBandM, 2700);
  });

  it('does not hold the 2,300 m §7 gives it, and no reading in §4 or §7 moves', () => {
    // The second finding. `holdCommitments` restores `homeDepth` to the
    // species' working depth when a commitment expires, and this one expires
    // on the first pass — so the animal climbs from 2,300 to 2,000 at the
    // Drift's vertical speed over the first half-minute.
    if (basin.kind !== 'creature') return;
    assert.equal(SOUNDER.workingDepthM, 2000, '§13: the depth a released Sounder homes to');
    assert.notEqual(
      basin.spawnAt!.depthM,
      SOUNDER.workingDepthM,
      '§7 states 2,300 m and the released animal does not hold it'
    );
    const climbS = (basin.spawnAt!.depthM - SOUNDER.workingDepthM) / DRIFT.VERTICAL_SPEED_MPS;
    assert.equal(climbS, 25, 'twenty-five seconds of it');
    // And why the literal is not corrected for it: the Echo Layer resolves on
    // horizontal distance, so every figure §4 and §7 hang on the basin is a
    // 2D one and none of them moves.
    assert.equal(heardBySounder(35, 625).toFixed(1), '14.6', '§7 still reads 14.6');
    assert.ok(
      basin.spawnAt!.depthM > SOUNDER.workingDepthM - SOUNDER.depthBandM,
      'and both depths are inside the band'
    );
  });
});
