/**
 * The Attending 7, read — docs/mission-first-arrival.md.
 *
 * `missions.test.ts` holds every mission to §10's conventions; this file holds
 * First Arrival to the things only its own document claims, and to the four
 * that a reader of the table cannot check by reading it:
 *
 * - **The rim is inherited, to the metre** (§5, §7, §11). The seats, the
 *   periods, the loudness, the bed and the riser are Prospect's and the
 *   Commune's, so they are asserted against `LEDGER_PROSPECT` and
 *   `SEEDING_SECOND_SEEDING` rather than against numbers typed twice. The day
 *   one of those literals moves a coordinate, this is what says so.
 * - **The geometry is the argument** (§1, §3, §4). Every distance §3 and §4
 *   quote is recomputed here from the authored seats: the dome's reach, the
 *   sixty-two metres by which it misses the fifth face, and the walk west in
 *   seconds at forty and at twenty-two.
 * - **The acoustics are the shipped model** (§1, §6, §7). Every range and
 *   ratio the document states through a single biome is recomputed against
 *   `detectionRatio` — including the four tier ranges of the Order's arrival,
 *   which is where the transcription found §7's one mislabelled tier and where
 *   §13 says the corrected reading is held.
 * - **The tide has to run its length** (§9, §13). The trap the flag exists
 *   for, demonstrated against `MissionRuntime` rather than asserted about it:
 *   two terminal rows, one met from the first pass and one revealed late, and
 *   the court's default rule closing on the reveal.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  DEPTH,
  DRIFT,
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
  detectionRatio,
  faunaStatsFor,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';

import { MOUTH_RIM, mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import {
  LEDGER_PROSPECT,
  MissionRuntime,
  PROLOGUE_SORROWGATE,
  SEEDING_SECOND_SEEDING,
  type MissionBeat,
  type MissionCommandSink,
  type MissionDefinition,
} from '../src/sim/missions/index.ts';
import { ATTENDING_FIRST_ARRIVAL } from '../src/sim/missions/firstArrival.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { createSimWorld } from '../src/sim/world.ts';

const M = ATTENDING_FIRST_ARRIVAL;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);

const TRENCH = PROPAGATION_FACTOR[Biome.AbyssalTrench];
const RESONANCE = PROPAGATION_FACTOR[Biome.ResonanceField];
const OPEN = PROPAGATION_FACTOR[Biome.OpenWater];

const CHORISTER = statsFor(UnitKind.Chorister);
const SUBMERSIBLE = statsFor(UnitKind.AbyssalSubmersible);
const CRUISER = statsFor(UnitKind.Cruiser);
const CORVETTE = statsFor(UnitKind.Corvette);
const SCOUT = statsFor(UnitKind.LightScout);
const CANTOR = structureStatsFor(StructureKind.Cantor);
const VEIL = structureStatsFor(StructureKind.SporeVeil);
const SOUNDER = faunaStatsFor(FaunaSpecies.Sounder);

type Move = Extract<MissionBeat, { kind: 'move' }>;
type Say = Extract<MissionBeat, { kind: 'say' }>;
type Creature = Extract<MissionBeat, { kind: 'creature' }>;
type Silent = Extract<MissionBeat, { kind: 'silent' }>;
type Resolve = Extract<MissionBeat, { kind: 'resolve' }>;

const movesOf = (mission: MissionDefinition): Move[] =>
  mission.beats.filter((beat): beat is Move => beat.kind === 'move');
const says = M.beats.filter((beat): beat is Say => beat.kind === 'say');
const creaturesOf = (mission: MissionDefinition): Creature[] =>
  mission.beats.filter((beat): beat is Creature => beat.kind === 'creature');
const silences = M.beats.filter((beat): beat is Silent => beat.kind === 'silent');
const resolveBeat = M.beats.find((beat): beat is Resolve => beat.kind === 'resolve')!;

const player = M.parties.find((party) => party.slot === M.playerSlot)!;
const cohort = player.units.filter((unit) => unit.role === 'cohort');
const watch = player.units.filter((unit) => unit.role === 'watch');
const dome = player.structures!.find((structure) => structure.tag === 'dome')!;
const unitBy = (tag: string) => M.parties.flatMap((p) => p.units).find((u) => u.tag === tag)!;
const emitterBy = (tag: string) =>
  M.parties.flatMap((p) => p.emitters ?? []).find((e) => e.tag === tag)!;
const objectiveBy = (id: string) => M.objectives.find((o) => o.id === id)!;
const moveAt = (tag: string, atTick: number): Move =>
  movesOf(M).find((beat) => beat.tag === tag && beat.atTick === atTick)!;

/** §6, §11 — the concern's own six sounding points, unchanged. */
const FACES = [
  { x: 900, y: 2400 },
  { x: 1700, y: 2650 },
  { x: 2500, y: 2300 },
  { x: 3500, y: 2600 },
  { x: 4300, y: 2350 },
  { x: 5100, y: 2700 },
];

const away = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.round(Math.hypot(a.x - b.x, a.y - b.y));

/** The range at which SIG through one biome reaches HYD at a tier's multiple. */
function rangeAt(sig: number, pf: number, hyd: number, multiple: number): number {
  let low = 1;
  let high = 40000;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (detectionRatio(sig, pf, mid, hyd) >= multiple) low = mid;
    else high = mid;
  }
  return Math.round(low);
}

/** Two decimals, as the document quotes a ratio. */
const ratio = (sig: number, pf: number, distanceM: number, hyd: number): number =>
  Number(detectionRatio(sig, pf, distanceM, hyd).toFixed(2));

/**
 * §13 — `SILENT_RUNNING`'s band, placed by the hull's **own** idle figure.
 * Restated from the prose rather than imported from `acoustics.ts`, so the two
 * arrive at 4.3 by different arithmetic or one of them is wrong.
 */
const silentSig = (sigIdle: number): number =>
  SILENT_RUNNING.SIG_MIN +
  (SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN) * Math.min(1, sigIdle / 60);

/** §6 — the Drift Health cell a point falls in, on this map's 1,500 × 1,000 grid. */
const cellOf = (x: number, y: number): string =>
  `${Math.floor((x / MOUTH_RIM.widthM) * DRIFT.HEALTH_REGIONS)},` +
  `${Math.floor((y / MOUTH_RIM.heightM) * DRIFT.HEALTH_REGIONS)}`;

describe('the Rim, reused unchanged — docs/mission-first-arrival.md §11', () => {
  it('adds no region and moves no metre of the chart Prospect authored', () => {
    // §11's whole claim: "same rectangles, same floors, same biomes, same
    // spawn", and campaign.md §8's "the same terrain four times and never the
    // same mission" applied literally. The mission's own rectangle is not a
    // new piece of ground — it is the map's Terraces row, restated because a
    // predicate addresses it.
    assert.equal(M.mapId, LEDGER_PROSPECT.mapId, '§11: the rim documents share a chart');
    assert.equal(missionMapById(M.mapId), MOUTH_RIM);
    assert.equal(mapById('mouth-rim'), undefined, '§11: not in the public catalogue');
    assert.equal(MOUTH_RIM.seats, 1);
    assert.deepEqual(MOUTH_RIM.resources, [], '§11: no resources, for the Order either');
    assert.deepEqual(MOUTH_RIM.hazards, [], '§11: no hazard sites');

    assert.equal(M.regions.length, 1, '§11: the literal adds no region');
    const terraces = M.regions[0]!;
    const painted = MOUTH_RIM.regions.find((region) => region.biome === Biome.ResonanceField)!;
    assert.deepEqual(
      [terraces.x, terraces.y, terraces.widthM, terraces.heightM],
      [painted.x, painted.y, painted.widthM, painted.heightM],
      '§8, §11: the hold is the map’s Terraces rectangle to the metre'
    );
    assert.equal(terraces.pressureBonus, undefined, '§11: the rim is not manufactured water');
  });

  it('argues the mission out of three rows of the table and nothing else', () => {
    // §1's three facts are three rows of §11: the lip carries like a trench,
    // the terraces are the only quiet water on the chart, and they stand four
    // hundred metres above the road in.
    const lip = MOUTH_RIM.regions.find((r) => r.biome === Biome.AbyssalTrench)!;
    const terraces = MOUTH_RIM.regions.find((r) => r.biome === Biome.ResonanceField)!;
    assert.equal(PROPAGATION_FACTOR[lip.biome], 1.6, '§1: the lip carries');
    assert.equal(PROPAGATION_FACTOR[terraces.biome], 0.7, '§1: bearings there lie a little');
    // §11: "No hull on this map is ordered below 3,000 m, because none can be."
    // The lip's last hundred metres is water the column hovers over and never
    // touches — which is also why §1's and §4's four hundred metres is a fact
    // about the *hull* and not about the two floors: the rock differs by five
    // hundred, and the climb is from `DEPTH.MAX_M` to the bench.
    assert.equal(lip.floorM! - DEPTH.MAX_M, 100);
    assert.equal(lip.floorM! - terraces.floorM!, 500, 'the two floors, which is not the climb');
    assert.equal(
      DEPTH.MAX_M - terraces.floorM!,
      400,
      '§4: four hundred metres, raised at the ascent rate and free'
    );
  });
});

describe('the column, as §2 and §11 seat it', () => {
  it('is twelve, six and one, in two roles, and nothing is armed', () => {
    assert.equal(cohort.length, 12, '§2: twelve Choristers');
    assert.equal(watch.length, 6, '§2: six Abyssal Submersibles attend the lip');
    assert.equal(player.units.length, 18, '§12: eighteen hulls are given to the rim');
    assert.equal(player.structures!.length, 1, '§3: one dome, placed and never moved');
    for (const unit of M.parties.flatMap((party) => party.units)) {
      assert.equal(unit.armed, undefined, '§2: every navy on this rim is weapons-cold, again');
    }
    for (const unit of cohort) assert.equal(unit.kind, UnitKind.Chorister);
    for (const unit of watch) assert.equal(unit.kind, UnitKind.AbyssalSubmersible);
    assert.equal(dome.kind, StructureKind.Cantor);
    // §2: four parties and a court slot, and the Drift is not a party.
    assert.equal(M.parties.length, 4);
    assert.equal(M.playerFaction, Faction.Directorate);
  });

  it('authors PR-3 on every Chorister, and leaves the roster’s PR-2 alone', () => {
    // §13's row, and the reason it is a row: `missions.test.ts` reads
    // `unit.pressureRating ?? statsFor(kind).pressureRating`, not
    // `effectivePressureRating`, so the Directorate's baseline does not rescue
    // a PR-2 hull authored at 3,000 m. A refit is a mission fact and never a
    // roster one — the Chorister everybody else fields is unchanged.
    assert.equal(CHORISTER.pressureRating, 2, '§13: the roster’s hull is PR-2');
    assert.equal(requiredPressureRating(DEPTH.MAX_M), 3, 'the lip is Abyssal water');
    for (const unit of cohort) {
      assert.equal(unit.depthM, DEPTH.MAX_M, '§11: the column stands at three thousand');
      assert.equal(unit.pressureRating, 3, `${unit.tag}: PR-3 is authored per hull (§13)`);
    }
    assert.equal(SUBMERSIBLE.pressureRating, 3, '§3: PR-3 is the Submersible’s own');
    for (const unit of watch) {
      assert.equal(unit.pressureRating, undefined, '§3: and it needs no refit');
    }
  });

  it('lays the rim’s fixed Directorate geometry out as §11 writes it', () => {
    // §11: "These seats are the rim's fixed Directorate geometry for the rest
    // of the week", and mission 8 and mission 9 copy them.
    assert.deepEqual(
      cohort.map((unit) => [unit.x, unit.y]),
      [
        [5400, 3200],
        [5500, 3200],
        [5600, 3200],
        [5700, 3200],
        [5800, 3200],
        [5900, 3200],
        [5400, 3450],
        [5500, 3450],
        [5600, 3450],
        [5700, 3450],
        [5800, 3450],
        [5900, 3450],
      ],
      '§11: 5,400–5,900 in steps of a hundred, on 3,200 and 3,450'
    );
    assert.deepEqual(
      watch.filter((unit) => unit.tag.startsWith('ninth')).map((unit) => [unit.x, unit.y]),
      [
        [5500, 3650],
        [5600, 3650],
        [5700, 3650],
        [5800, 3650],
      ],
      '§11: the 9th’s four at the sill'
    );
    assert.deepEqual([dome.x, dome.y, dome.depthM], [5000, 3400, DEPTH.MAX_M]);
  });

  it('puts the rim’s own two on Prospect’s seats, to the metre', () => {
    // §5: "the rim's own two submersibles are the pair that have been on the
    // lip since before anyone had ears here". Read off the other literal, not
    // typed twice, so the day Prospect moves its watch this fails.
    const prospectWatch = LEDGER_PROSPECT.parties
      .flatMap((party) => party.units)
      .filter((unit) => unit.kind === UnitKind.AbyssalSubmersible);
    assert.equal(prospectWatch.length, 2, 'Prospect seats the pair and nothing else');
    for (const before of prospectWatch) {
      const now = unitBy(before.tag);
      assert.deepEqual(
        [now.x, now.y, now.depthM],
        [before.x, before.y, before.depthM],
        `${before.tag}: Prospect's coordinates exactly (§11)`
      );
      assert.equal(now.role, 'watch', '§8: the rim’s own pair is counted by the watch');
    }
  });

  it('seats everything in water the ground admits and rates it for the depth', () => {
    // `missions.test.ts` runs both of these over every mission; they are here
    // because this literal seats four parties across four floors and a
    // hundred-metre error anywhere is a hull that dies of crush where it
    // stands or one that cannot move at all.
    const terrain = terrainFor(MOUTH_RIM);
    for (const party of M.parties) {
      const seated = [...party.units, ...(party.structures ?? []), ...(party.emitters ?? [])];
      for (const thing of seated) {
        assert.ok(
          terrain.admits(thing.x, thing.y, thing.depthM),
          `${thing.tag} at ${thing.depthM} m is not admitted by the ground`
        );
      }
      for (const unit of party.units) {
        const rating = unit.pressureRating ?? statsFor(unit.kind).pressureRating;
        assert.ok(
          rating >= requiredPressureRating(unit.depthM),
          `${unit.tag}: PR ${rating} at ${unit.depthM} m`
        );
      }
    }
    // §5, §13 — "nothing of the Order's is ever admitted into Abyssal water in
    // this mission", seated or ordered: PR-2 with no refit and no Spire on
    // this tide, and 1,800 m is where the band turns.
    const order = M.parties.find((party) => party.faction === Faction.Hadron)!;
    const orderTags = new Set(order.units.map((unit) => unit.tag));
    for (const unit of order.units) {
      assert.equal(unit.pressureRating, undefined, '§5: PR-2, no refit');
      assert.ok(unit.depthM < 1800, `${unit.tag} at ${unit.depthM} m is in Abyssal water`);
    }
    for (const beat of movesOf(M)) {
      if (!orderTags.has(beat.tag) || beat.depthM === undefined) continue;
      assert.ok(beat.depthM < 1800, `a beat orders ${beat.tag} to ${beat.depthM} m`);
    }
    // §11 — and nothing of anybody's is ordered below the orderable column.
    for (const party of M.parties) {
      for (const unit of party.units) assert.ok(unit.depthM <= DEPTH.MAX_M);
    }
  });
});

describe('the dome, and the distance the mission is — §3', () => {
  it('reaches everything the Directorate has and misses the fifth face by sixty-two metres', () => {
    // §3's closing sentence: "The cohort spends the mission walking out from
    // under the one instrument it has, which is the mission in one distance."
    // Every figure recomputed from the authored seats.
    const reaches = (p: { x: number; y: number }) => away(dome, p);
    assert.equal(STRUCTURE_AURAS.CANTOR.RADIUS_M, 1200);
    assert.equal(
      Math.min(CHORISTER.hyd + STRUCTURE_AURAS.CANTOR.HYD_BONUS, STRUCTURE_AURAS.CANTOR.HYD_CAP),
      95,
      '§3: HYD 75 becomes 95 under the dome, capped'
    );

    const toCohort = cohort.map(reaches);
    assert.equal(Math.min(...toCohort), 403, '§3: 403 m to the nearest Chorister');
    assert.equal(Math.max(...toCohort), 922, '§3: 922 m to the furthest');
    const toNinth = watch.filter((u) => u.tag.startsWith('ninth')).map(reaches);
    assert.equal(Math.min(...toNinth), 559, '§3: 559 m to the nearest of the 9th’s four');
    assert.equal(Math.max(...toNinth), 838, '§3: 838 m to the furthest');
    assert.deepEqual(
      [reaches(unitBy('watch-a')), reaches(unitBy('watch-b'))],
      [412, 255],
      '§3: 412 and 255 m to the rim’s own pair'
    );
    for (const distance of [...toCohort, ...toNinth, reaches(unitBy('watch-a'))]) {
      assert.ok(distance < STRUCTURE_AURAS.CANTOR.RADIUS_M, 'the dome reaches every hull');
    }

    assert.equal(reaches(FACES[5]!), 707, '§3: it reaches the sixth face');
    assert.equal(reaches(FACES[4]!), 1262, '§3: and it does not reach the fifth');
    assert.equal(
      reaches(FACES[4]!) - STRUCTURE_AURAS.CANTOR.RADIUS_M,
      62,
      '§3: sixty-two metres outside the aura’s radius, which is the mission in one distance'
    );
  });
});

describe('information into tempo — §4’s four movements, in seconds', () => {
  it('walks the lip at the two speeds the document quotes', () => {
    const seat = cohort[0]!;
    assert.equal(away(seat, FACES[5]!), 583, '§4: the eastern seat to the sixth face');
    assert.equal(away(seat, FACES[0]!), 4571, '§4: and to the first');
    assert.equal(CHORISTER.speed, 40, '§3: the slowest combat hull in the game');
    assert.equal(Math.round(583 / CHORISTER.speed), 15, '§4: fifteen seconds');
    assert.equal(Math.round(4571 / CHORISTER.speed), 114, '§4: a hundred and fourteen');
    const silentSpeed = CHORISTER.speed * SILENT_RUNNING.SPEED_MULTIPLIER;
    assert.equal(silentSpeed, 22, '§3: 22 m/s instead of 40');
    assert.equal(Math.round(4571 / silentSpeed), 208, '§4: two hundred and eight under silence');
  });

  it('prices the climb at nothing and the way back down at nine seconds of transmission', () => {
    // §4's fourth movement, and the mission's one shove: ground lifts a hull
    // and never lowers one, so the climb onto the bench is free and silent,
    // and only a player who owns a depth order pays to come off it.
    assert.equal(DEPTH.ASCENT_RATE_MPS, 15);
    assert.equal(DEPTH.DESCENT_RATE_MPS, 45);
    assert.equal(DEPTH.DESCENT_SIG, 72);
    assert.equal(Number((400 / DEPTH.ASCENT_RATE_MPS).toFixed(1)), 26.7, '§4: the free climb');
    assert.equal(Number((400 / DEPTH.DESCENT_RATE_MPS).toFixed(1)), 8.9, '§4: and the loud dive');
    assert.ok(
      DEPTH.DESCENT_SIG > M.silenceCeilingSig,
      '§4: the only seventy-two in the water, against a ceiling of twenty-five'
    );
  });

  it('runs silent at the hull’s own figure and never at the band’s ceiling', () => {
    // §13's most mis-derivable row: the eight would inflate a Chorister's
    // silent ranges by 1.85, halve the time the seat's cell survives, and put
    // the charting pair at Track on the first face where the model says
    // Classification.
    assert.equal(Number(silentSig(CHORISTER.sigIdle).toFixed(1)), 4.3, '§3: a Chorister at 4.3');
    assert.equal(
      Number(silentSig(SUBMERSIBLE.sigIdle).toFixed(1)),
      4.8,
      '§3: a Submersible at 4.8'
    );
    assert.equal(
      silentSig(60),
      SILENT_RUNNING.SIG_MAX,
      '§13: only a hull idling at 60 reads eight'
    );
    assert.equal(
      Number((SILENT_RUNNING.SIG_MAX / silentSig(CHORISTER.sigIdle)).toFixed(2)),
      1.85,
      '§13: the factor the eight would inflate a Chorister’s ranges by'
    );
  });
});

describe('the hold, and the ledger under it — §6', () => {
  it('cannot be breached by any ordinary act of a Chorister', () => {
    // §6, §13: "the ceiling is unbreachable by any ordinary act" — idle 16,
    // cruise 24, silent 4.3, and the +40 break-silence spike is a *firing*
    // spike on a hull whose guns are locked. The ledger runs on one manoeuvre.
    assert.equal(M.silenceCeilingSig, 25, '§6, §12: the order the galleries keep');
    assert.equal(M.silenceRole, 'cohort', '§6: the order binds the twelve, not the watch');
    assert.equal(M.debtCapS, 45, '§6: unchanged from Attendance');
    assert.equal(M.arrayTag, 'dome', '§6: the dome is withdrawn while any debt stands');
    assert.equal(M.escortRadiusM, 0, 'no held freight: eighteen hulls on their own orders');
    for (const sig of [CHORISTER.sigIdle, CHORISTER.sigCruise, silentSig(CHORISTER.sigIdle)]) {
      assert.ok(sig < M.silenceCeilingSig, `${sig} is under the ceiling`);
    }
    assert.equal(SILENT_RUNNING.BREAK_SILENCE_SIG_SPIKE, 40);
    assert.ok(
      new Set(M.locks.map((lock) => lock.ability)).has('weapons'),
      '§6: which is a firing spike, on a hull whose guns are locked'
    );
    // §4: the budget is a description of the walk and one under the order.
    assert.equal(M.sigBudget, CHORISTER.sigCruise, '§4: twenty-four, a Chorister’s cruise');
    assert.equal(M.sigBudget, M.silenceCeilingSig - 1, '§4: one under the silence order');
  });

  it('kills the seat’s Drift cell in seventy-nine seconds and costs the player nothing', () => {
    // §6, §13 — arithmetic over the shipped ledger, stated rather than fenced:
    // the whole column and the dome share one 1,500 × 1,000 m cell.
    assert.equal(MOUTH_RIM.widthM / DRIFT.HEALTH_REGIONS, 1500);
    assert.equal(MOUTH_RIM.heightM / DRIFT.HEALTH_REGIONS, 1000);
    const seatCell = cellOf(cohort[0]!.x, cohort[0]!.y);
    for (const thing of [...player.units, dome]) {
      assert.equal(cellOf(thing.x, thing.y), seatCell, `${thing.tag} shares the seat’s cell`);
    }
    const quiet =
      cohort.length * silentSig(CHORISTER.sigIdle) +
      watch.length * silentSig(SUBMERSIBLE.sigIdle) +
      CANTOR.sigIdle;
    const idle =
      cohort.length * CHORISTER.sigIdle + watch.length * SUBMERSIBLE.sigIdle + CANTOR.sigIdle;
    assert.equal(quiet, 116, '§6: 116 of summed SIG while every one of them is silent');
    assert.equal(idle, 359, '§6: 359 idle');
    assert.equal(DRIFT.HEALTH_SIG_THRESHOLD, 60);
    const drain = (sum: number) =>
      (sum - DRIFT.HEALTH_SIG_THRESHOLD) * DRIFT.HEALTH_SIG_DRAIN_PER_S;
    assert.equal(Number(drain(quiet).toFixed(2)), 1.12, '§6: 1.12 a second');
    assert.equal(Math.round(DRIFT.HEALTH_START / drain(quiet)), 79, '§6: dead in seventy-nine');
    assert.equal(Math.round(DRIFT.HEALTH_START / drain(idle)), 15, '§6: idle, in fifteen');
    // §6's spread, as the ground states it without being told to.
    assert.equal(2 * CHORISTER.sigIdle, 32, '§6: two Choristers on a face wear nothing');
    assert.ok(2 * CHORISTER.sigIdle < DRIFT.HEALTH_SIG_THRESHOLD);
    assert.equal(
      cellOf(FACES[3]!.x, FACES[3]!.y),
      cellOf(FACES[4]!.x, FACES[4]!.y),
      '§6: faces four and five share a cell'
    );
    assert.equal(Number(drain(4 * CHORISTER.sigIdle).toFixed(2)), 0.08, '§6: and wear it at 0.08');
    assert.equal(Number(drain(6 * CHORISTER.sigIdle).toFixed(2)), 0.72, '§6: six on one face');
    // And the reason none of it costs anything: nothing here is paid in Biomass.
    assert.ok(
      M.objectives.every((objective) => objective.predicate.kind !== 'deliver'),
      '§6: nothing in this mission is paid in Biomass'
    );
    assert.equal(M.startingNodules, undefined);
  });

  it('carries the plateaus’ bed at eight, on the seats the Commune authored', () => {
    // §6, §13 — the veil's aura is the engine's and symmetric: it hides them
    // from you and you from them, which is why a Chorister that walks into it
    // goes deaf and the record enters that as the bed's doing and not a fault.
    const bed = M.parties
      .find((party) => party.faction === Faction.Pelagia)!
      .structures!.find((structure) => structure.kind === StructureKind.SporeVeil)!;
    const sown = SEEDING_SECOND_SEEDING.parties
      .flatMap((party) => party.structures ?? [])
      .find((structure) => structure.kind === StructureKind.SporeVeil)!;
    assert.deepEqual([bed.x, bed.y], [sown.x, sown.y], '§6: the Commune’s own sowing point');
    assert.deepEqual([bed.x, bed.y], [1250, 3250]);
    assert.equal(VEIL.sigIdle * STRUCTURE_AURAS.SPORE_VEIL.SIG_FACTOR, 8, '§6: it carries 8');
    assert.equal(STRUCTURE_AURAS.SPORE_VEIL.RADIUS_M, 350);
    assert.equal(STRUCTURE_AURAS.SPORE_VEIL.BLIND_HYD, 5, '§6: and listens at HYD 5 inside it');
    assert.equal(rangeAt(8, TRENCH, CHORISTER.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT), 2101);
    assert.equal(rangeAt(8, TRENCH, CHORISTER.hyd, TIER_THRESHOLD_MULTIPLIER.BEARING), 1631);
    assert.equal(rangeAt(8, TRENCH, 95, TIER_THRESHOLD_MULTIPLIER.CONTACT), 2436);
    assert.equal(rangeAt(8, TRENCH, 95, TIER_THRESHOLD_MULTIPLIER.BEARING), 1891);
    // §6's three faces: the entry that costs the column nothing is the one at
    // the far end of the walk, and there is nothing at all east of the third.
    assert.deepEqual(
      [away(FACES[0]!, bed), away(FACES[1]!, bed), away(FACES[2]!, bed)],
      [919, 750, 1570]
    );
    // And the watch's own classification of it on the concern's day, from the
    // western station Prospect walks it to at 09:00.
    const westernStation = movesOf(LEDGER_PROSPECT).find(
      (beat) => beat.tag === 'watch-a' && beat.y === 3400
    )!;
    assert.equal(away(westernStation, bed), 1160, '§6: 1,160 m, on the concern’s day');
    assert.equal(ratio(8, TRENCH, 1160, SUBMERSIBLE.hyd), 2.93, '§6: and a ratio of 2.93');
  });
});

describe('what is heard — §1, §4, §7', () => {
  it('reads the two returns from the seat before an order is given', () => {
    // §4's second movement, and the reason `the-attending` is met on the first
    // pass: both attendants are inside Bearing from where the column stands,
    // and both are sounding at tick zero.
    const a = emitterBy('attendant-a');
    const b = emitterBy('attendant-b');
    const nearest = cohort.reduce((best, unit) => (away(unit, b) < away(best, b) ? unit : best));
    assert.equal(away(nearest, b), 1301, '§4: attendant-b at 1,301 m');
    assert.equal(away(nearest, a), 2600, '§4: attendant-a at 2,600 m');
    assert.equal(ratio(b.sig, TRENCH, 1301, CHORISTER.hyd), 6.46, '§4: a track from the seat');
    assert.equal(ratio(a.sig, TRENCH, 2600, CHORISTER.hyd), 2.13, '§4: and a bearing');
    assert.equal(ratio(a.sig, TRENCH, 2600, 95), 2.7, '§4: which the dome lifts to 2.70');
    for (const reading of [6.46, 2.13]) {
      assert.ok(
        reading >= TIER_THRESHOLD_MULTIPLIER.BEARING,
        '§4: Bearing or better, from the seat'
      );
    }
    // Sounding at tick zero, both of them, so the row is satisfied on the very
    // first mission pass — which is one Echo interval in, not tick zero.
    for (const emitter of [a, b]) {
      assert.ok(
        ECHO_TICK_INTERVAL % emitter.periodTicks < emitter.onTicks,
        `${emitter.tag} is not sounding on the first pass`
      );
      assert.equal(emitter.fromTick, undefined, '§7: since before anyone had ears here');
      assert.equal(emitter.untilTick, undefined);
    }
  });

  it('keeps the attendants at Prospect’s place, loudness and rhythm', () => {
    // §7: "unchanged in place, loudness and rhythm". Read off the other
    // literal rather than typed twice.
    const before = LEDGER_PROSPECT.parties.flatMap((party) => party.emitters ?? []);
    assert.equal(before.length, 2);
    for (const was of before) {
      const now = emitterBy(was.tag);
      assert.deepEqual(
        [now.x, now.y, now.depthM, now.sig, now.periodTicks, now.onTicks],
        [was.x, was.y, was.depthM, was.sig, was.periodTicks, was.onTicks],
        `${was.tag}: Prospect's return, on the tide after`
      );
    }
    assert.equal(emitterBy('attendant-a').periodTicks, 7 * SIM.TICK_HZ, '§7: one second in seven');
    assert.equal(emitterBy('attendant-a').onTicks, 1 * SIM.TICK_HZ);
    assert.equal(emitterBy('attendant-b').periodTicks, 11 * SIM.TICK_HZ, '§7: two in eleven');
    assert.equal(emitterBy('attendant-b').onTicks, 2 * SIM.TICK_HZ);
    // §1's four figures for what the lip's own sounds are worth from anywhere.
    assert.equal(rangeAt(24, TRENCH, CHORISTER.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT), 4175);
    assert.equal(rangeAt(24, TRENCH, CHORISTER.hyd, TIER_THRESHOLD_MULTIPLIER.BEARING), 3241);
    assert.equal(rangeAt(24, TRENCH, 95, TIER_THRESHOLD_MULTIPLIER.CONTACT), 4840);
    assert.equal(rangeAt(24, TRENCH, 95, TIER_THRESHOLD_MULTIPLIER.BEARING), 3757);
  });

  it('hears the charting pair, and is heard by them, at §7’s figures', () => {
    const pair = M.parties.find((party) => party.faction === Faction.Pelagia)!.units;
    assert.equal(rangeAt(12, RESONANCE, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT), 1746);
    assert.equal(rangeAt(12, RESONANCE, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.BEARING), 1355);
    const quiet = silentSig(CHORISTER.sigIdle);
    assert.equal(away(FACES[0]!, pair[0]!), 461, '§7: a Chorister on the first face');
    assert.equal(
      ratio(quiet, RESONANCE, 461, SCOUT.hyd),
      TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION,
      '§7: a classification, on the nose — and a track only if you mis-derive the silence'
    );
    assert.equal(away(FACES[1]!, pair[0]!), 781, '§7: no more than a contact on the second');
    const second = detectionRatio(quiet, RESONANCE, 781, SCOUT.hyd);
    assert.ok(
      second >= TIER_THRESHOLD_MULTIPLIER.CONTACT && second < TIER_THRESHOLD_MULTIPLIER.BEARING
    );
  });

  it('is heard arriving by the Order, at the two stations §7 quotes', () => {
    // §7's last paragraph, and what the fourth objective enters: "The column
    // is heard arriving. Everything is."
    const quiet = silentSig(CHORISTER.sigIdle);
    const first = moveAt('party-lead', T(16));
    const over = moveAt('party-lead', T(17, 30));
    assert.equal(away(FACES[5]!, first), 671, '§7: the party at 16:00');
    assert.equal(away(FACES[5]!, over), 255, '§7: and standing over the face at 17:30');
    const contact = detectionRatio(quiet, RESONANCE, 671, CRUISER.hyd);
    assert.ok(
      contact >= TIER_THRESHOLD_MULTIPLIER.CONTACT && contact < TIER_THRESHOLD_MULTIPLIER.BEARING,
      '§7: silence is a contact at 671 m'
    );
    assert.ok(
      detectionRatio(CHORISTER.sigIdle, RESONANCE, 671, CRUISER.hyd) >=
        TIER_THRESHOLD_MULTIPLIER.TRACK,
      '§7: and an idle one is a track'
    );
    assert.equal(ratio(quiet, RESONANCE, 255, CRUISER.hyd), 6, '§7: silence reads 6.00');
  });

  it("pins the four tier ranges of the Order's arrival, where §7 mislabelled one", () => {
    // §7 read the Cruiser's arrival as "contact to a submersible from 6,274 m
    // and Track from 3,538". The distance was right and the tier was not: 3,538
    // is where the *Classification* multiple falls, and Track — the 4× — stands
    // at 2,638. Nothing in the literal moved either way, and §7 now reads both
    // figures; this is where §13 says the four ranges are checked.
    assert.equal(CRUISER.sigCruise, 65, '§7: a Cruiser hull at 65, cone-on');
    assert.equal(rangeAt(65, OPEN, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT), 6274);
    assert.equal(rangeAt(65, OPEN, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.BEARING), 4869);
    assert.equal(
      rangeAt(65, OPEN, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      3538,
      '§7: the 3,538 the document once called Track'
    );
    assert.equal(
      rangeAt(65, OPEN, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.TRACK),
      2638,
      '§7: and Track is here'
    );
    // The rest of §7's Order figures, which are right.
    assert.equal(CORVETTE.sigCruise, 28, '§7: the reconnaissance, cone-on');
    assert.equal(
      rangeAt(28 * 0.35, OPEN, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      1923
    );
    assert.equal(rangeAt(28 * 0.1, OPEN, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT), 879);
    assert.equal(away(unitBy('recon'), cohort[0]!), 1612, '§7: 1,612 m to the nearest seat');
  });
});

describe('the sounding the count cannot bank — §8, §13', () => {
  it('authors the Order’s twenty seconds as a sound, and gives it no reading', () => {
    // §13: `MissionSounding` is player-party only, so a scripted hull's read
    // cannot be authored as the act — it is authored as the sound the act
    // makes. And `attend` counts only emitters carrying a `reading`, so the
    // loudest thing on the rim this tide is audible and uncountable.
    const sounding = emitterBy('the-sounding');
    assert.equal(sounding.sig, 80, '§7: eighty');
    assert.equal(sounding.fromTick, T(18), '§9: the window opens at 18:00');
    assert.equal(sounding.untilTick! - sounding.fromTick!, T(0, 20), '§7: twenty seconds');
    assert.equal(sounding.periodTicks, sounding.onTicks, '§13: sustained, not periodic');
    assert.equal(sounding.reading, undefined, '§8: it carries none, and that is the mechanism');
    const over = moveAt('party-lead', T(17, 30));
    assert.deepEqual(
      [sounding.x, sounding.y],
      [over.x, over.y],
      '§13: at the party’s own position'
    );
    assert.equal(M.soundings, undefined, '§13: no MissionSounding, and none is asked for');

    const attendable = M.parties
      .flatMap((party) => party.emitters ?? [])
      .filter((emitter) => emitter.reading !== undefined);
    assert.deepEqual(
      attendable.map((emitter) => emitter.tag),
      ['attendant-a', 'attendant-b'],
      '§8: the two attendants are the only attendable sounds in the water'
    );
    // §7's own figures for it, recomputed.
    assert.equal(rangeAt(80, OPEN, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT), 7143);
    assert.equal(away(sounding, dome), 962, '§7: 962 m to the dome');
    assert.equal(away(sounding, unitBy('watch-a')), 1012, '§7: 1,012 to the western watch hull');
    assert.equal(
      Math.min(...cohort.map((unit) => away(sounding, unit))),
      791,
      '§7: 791 to the nearest cohort seat, which is under the dome'
    );
    assert.ok(
      away(sounding, FACES[5]!) === 255 && away(cohort[0]!, dome) < STRUCTURE_AURAS.CANTOR.RADIUS_M
    );
  });
});

describe('the objective — §8’s four rows', () => {
  it('decides the count by the rim and the watch, ranks neither, and reads two out', () => {
    assert.deepEqual(
      M.objectives.map((objective) => objective.id),
      ['the-rim', 'the-watch', 'the-attending', 'the-record'],
      '§8: four rows, and the close reads their readings in this order'
    );
    const terminal = M.objectives.filter((objective) => objective.terminal === true);
    assert.deepEqual(
      terminal.map((objective) => objective.id),
      ['the-rim', 'the-watch'],
      '§8: two decide the count'
    );
    for (const objective of terminal) {
      assert.notEqual(objective.keystone, true, '§8: no keystone, deliberately');
      assert.equal(objective.reading, undefined, '§8: their met and unmet are the ladder');
    }
    assert.deepEqual(objectiveBy('the-rim').predicate, {
      kind: 'extract',
      role: 'cohort',
      region: 'the-terraces',
      count: 8,
    });
    assert.deepEqual(objectiveBy('the-watch').predicate, {
      kind: 'survive',
      role: 'watch',
      count: 4,
    });
    assert.match(objectiveBy('the-rim').text, /Eight of twelve on the terraces is a hold/);
    assert.equal(objectiveBy('the-watch').text, 'Six attend the lip. Four is a watch.');
    assert.equal(objectiveBy('the-rim').debtText, undefined, '§8: no second reading is authored');
  });

  it('reveals the hold at the tick the close asks the question, and not before', () => {
    // §8, §13: `extract` latches Met the first pass it is satisfied and is
    // never re-derived, so a hold read "at the tide's turn" must be revealed
    // by a beat at the tick the tide turns on the count. The stalls' line and
    // the reveal share 19:00 because a reveal needs a beat under it.
    const rim = objectiveBy('the-rim');
    assert.equal(rim.revealAtTick, T(19), '§9: the reveal tick');
    assert.equal(rim.markerId, 'terraces');
    assert.ok(
      says.some((beat) => beat.atTick === T(19)),
      '§9: the stalls, at the count, on the same tick'
    );
    assert.equal(M.markers.length, 1, 'nothing points at a return, a bed or the riser');
    assert.deepEqual(
      [M.markers[0]!.id, M.markers[0]!.x, M.markers[0]!.y, M.markers[0]!.radiusM],
      ['terraces', 3000, 2500, 2500],
      '§8: Prospect’s own marker, over the same six faces'
    );
    for (const face of FACES) {
      assert.ok(
        Math.hypot(face.x - M.markers[0]!.x, face.y - M.markers[0]!.y) <= M.markers[0]!.radiusM,
        'the marker covers every charted face'
      );
    }
    // §8: "Nothing on this map can kill a Chorister" — the riser is the one
    // lethal thing and a 50 m hull is beneath its notice entirely, so the only
    // way to be short of eight is to be somewhere else.
    assert.ok(CHORISTER.hullLengthM < DRIFT.TRANSIT_MIN_HULL_M);
    assert.equal(SUBMERSIBLE.hullLengthM, DRIFT.TRANSIT_MIN_HULL_M, '§8: the half it can take');
  });

  it('makes the attending unloseable and refuses to let it grade anything', () => {
    // §8, §13: "a row that cannot be failed must not be allowed to grade
    // anything", and the only mission in the bible that says the attending is
    // a condition of the water by making a row unloseable.
    const attending = objectiveBy('the-attending');
    assert.notEqual(attending.terminal, true, '§8: non-terminal, and that is the design');
    assert.deepEqual(attending.predicate, { kind: 'attend', count: 2 });
    assert.equal(attending.reading!.met, 'Entered: both returns. The attending continues.');
    assert.match(attending.reading!.unmet, /The attending continues from the lip regardless/);
    const record = objectiveBy('the-record');
    assert.notEqual(record.terminal, true, '§8: read out, never ranked');
    assert.deepEqual(record.predicate, {
      kind: 'tolerance',
      ticks: 3600,
      tier: ResolutionTier.Classification,
    });
    assert.equal(3600 / SIM.TICK_HZ, 60, '§8: sixty seconds, cumulative');
    assert.match(record.reading!.met, /three navies/);
    assert.match(record.reading!.unmet, /which is what tempo is/);
  });

  it('reads the attendants’ own entries, in authored order, one pair each', () => {
    // §8: beneath the count, `the-attending` and `the-record`, "and then the
    // attendants' own entered-and-gap lines, in authored order". §12 supplies
    // the western *entered* and the eastern *gap*; the other halves are the
    // same two forms and no others, because a return is never said to be
    // anything.
    const a = emitterBy('attendant-a');
    const b = emitterBy('attendant-b');
    assert.equal(
      a.reading!.entered,
      'Entered: the western return, bearing and period. It is not said what it is.',
      '§12, verbatim'
    );
    assert.equal(
      b.reading!.gap,
      'Not entered: the eastern return. The gap is entered too.',
      '§12, verbatim'
    );
    assert.match(b.reading!.entered, /^Entered: the eastern return, bearing and period\./);
    assert.match(a.reading!.gap, /^Not entered: the western return\./);
    for (const line of [a.reading!.entered, a.reading!.gap, b.reading!.entered, b.reading!.gap]) {
      assert.doesNotMatch(line, /Mouth|creature|machine/i, '§10: it is not said what they are');
    }
  });

  it('reads all three of Korrin’s results, and all three clauses under each', () => {
    // §8: campaign.md §9's Directorate row is one sentence and all three of
    // its clauses appear under every outcome. One conclusion in three
    // readings, and no fork, because the button that made the Ledger's fork is
    // locked here by rule.
    assert.match(M.epilogue[MissionOutcome.Complete], /^The rim is held and the ears are whole/);
    assert.match(M.epilogue[MissionOutcome.Partial], /^You were sufficient/);
    assert.match(M.epilogue[MissionOutcome.Lost], /^The rim is not held and the watch is short/);
    assert.match(M.epilogue[MissionOutcome.Lost], /not a failure of the cohorts/);
    for (const outcome of [MissionOutcome.Complete, MissionOutcome.Partial, MissionOutcome.Lost]) {
      assert.match(M.epilogue[outcome], /attend/, '§8: the attending continues, under every count');
      assert.match(M.epilogue[outcome], /rim/, '§8: and the rim is in all three');
    }
  });
});

describe('the locks, as §3 reads them', () => {
  it('withholds all seven affordances, each with the reason written on it', () => {
    // §3's five numbered prohibitions, and §13's argument for the seventh: a
    // decoy is a transmission that lies, and the ending's whole claim is that
    // this faction does neither of the two things a transmission can be.
    const byAbility = new Map(M.locks.map((lock) => [lock.ability, lock.reason]));
    for (const ability of [
      'weapons',
      'torpedoes',
      'mines',
      'depthCharges',
      'noisemakers',
      'activeSonar',
      'construction',
    ] as const) {
      assert.ok(byAbility.has(ability), `§3 strikes ${ability} and the literal does not`);
      assert.ok(
        byAbility.get(ability)!.trim().length > 0,
        `${ability} is refused without a reason`
      );
    }
    assert.match(byAbility.get('weapons')!, /nothing has stood into the watch/);
    assert.match(byAbility.get('mines')!, /nothing is left in water that is attended/);
    assert.match(byAbility.get('noisemakers')!, /the rim is not lied to/);
    assert.equal(
      byAbility.get('activeSonar'),
      'aboard, live, and not used — the rim is attended, not asked',
      '§3, §10: the lock is the ending, and the reason is written on it'
    );
    assert.match(byAbility.get('construction')!, /the rim is not built on/);
  });
});

describe('the beats — §9’s table', () => {
  it('opens the column quiet on eighteen beats and hands nobody the toggle', () => {
    assert.equal(silences.length, 18, '§3, §9: eighteen `silent` beats at tick zero');
    for (const beat of silences) {
      assert.equal(beat.atTick, 0, '§9: at tick zero');
      assert.equal(beat.active, true, '§3: active, every one');
    }
    assert.deepEqual(
      new Set(silences.map((beat) => beat.tag)),
      new Set(player.units.map((unit) => unit.tag)),
      '§3: one per hull, and no hull twice'
    );
  });

  it('runs Korrin, Adze, the pair, the Order and Ossary at §9’s minutes', () => {
    assert.deepEqual(
      says.map((beat) => [beat.atTick / SIM.TICK_HZ, beat.speaker]),
      [
        [0, 'Undermarshal Setha Korrin'],
        [30, 'Cohort-Prime Adze, on the lip'],
        [300, 'The charting pair, for the plateaus'],
        [480, 'The stalls'],
        [600, 'Voice of the reconnaissance, for the Order'],
        [930, 'The charting pair, for the plateaus'],
        [990, 'The stalls'],
        [1080, 'The stalls'],
        [1080, "Cohort-Prime Adze, on the Order's sounding"],
        [1125, 'Cohort-Prime Adze, at the riser'],
        [1140, 'The stalls'],
        [1230, 'Undermarshal Setha Korrin'],
        [1230, 'First Cantor Vehl Ossary'],
      ],
      '§9: the beat table, in its order'
    );
    // §12, verbatim in the three places the campaign has been walking toward.
    const adze = says.find(
      (beat) => beat.atTick === T(18) && beat.speaker.startsWith('Cohort-Prime')
    )!;
    assert.match(
      adze.text,
      /The watch is not asked to answer it this tide/,
      '§6, §12: the order held rather than crossed, at the tick it arrives'
    );
    assert.equal(
      says.at(-1)!.text,
      'Nothing. The record notes that the First Cantor was present.',
      '§8, §12: thirty seconds ahead of every close and unchanged by all three'
    );
    assert.equal(
      says.at(-2)!.text,
      'The record notes that the Undermarshal was present.',
      '§12: she reads the count and stops, and the record enters a presence'
    );
    assert.equal(says.at(-1)!.atTick, says.at(-2)!.atTick, '§9: Ossary, immediately after');
    assert.equal((resolveBeat.atTick - says.at(-1)!.atTick) / SIM.TICK_HZ, 30);
  });

  it('walks the visitors on the legs §9 authors and nowhere else', () => {
    // The pair walks Prospect's own first eastern leg and turns for home; the
    // reconnaissance takes its measure and resumes its station; the party
    // descends, stands over the face and climbs back. Nothing else moves.
    assert.deepEqual(
      movesOf(M).map((beat) => [beat.atTick / SIM.TICK_HZ, beat.tag, beat.x, beat.y, beat.depthM]),
      [
        [180, 'chart-a', 1800, 2150, undefined],
        [180, 'chart-b', 1950, 2200, undefined],
        [660, 'recon', 4600, 2100, undefined],
        [720, 'chart-a', 1200, 2050, undefined],
        [720, 'chart-b', 1350, 2100, undefined],
        [840, 'recon', 5200, 1600, undefined],
        [960, 'party-lead', 5400, 2100, 1750],
        [960, 'party-two', 5450, 2250, 1750],
        [960, 'party-three', 5350, 1950, 1750],
        [1050, 'party-lead', 5150, 2450, undefined],
        [1050, 'party-two', 5200, 2550, undefined],
        [1050, 'party-three', 5100, 2350, undefined],
        [1170, 'party-lead', 5875, 450, 1400],
        [1170, 'party-two', 5900, 600, 1400],
        [1170, 'party-three', 5850, 300, 1400],
      ],
      '§9: the visitors’ transits are authored, not AI'
    );
    // §7: 350 m of descent at 72 for 7.8 seconds, and the way home is an
    // ascent, and silent.
    const seatDepth = unitBy('party-lead').depthM;
    assert.equal(1750 - seatDepth, 350, '§7: three hundred and fifty metres of descent');
    assert.equal(Number((350 / DEPTH.DESCENT_RATE_MPS).toFixed(1)), 7.8);
    assert.equal(moveAt('party-lead', T(19, 30)).depthM, seatDepth, '§9: back to the staging');
    // The pair goes home to the seats it opened on.
    for (const tag of ['chart-a', 'chart-b']) {
      const home = moveAt(tag, T(12));
      assert.deepEqual([home.x, home.y], [unitBy(tag).x, unitBy(tag).y], `${tag} turns for home`);
    }
    const station = moveAt('recon', T(14));
    assert.deepEqual([station.x, station.y], [unitBy('recon').x, unitBy('recon').y]);
  });

  it('lifts the riser off Prospect’s line, verbatim, and lets it climb on its own', () => {
    // §13: with no `depthM` on the `driveTo` the runtime holds the species'
    // own working depth as home, so the transit climbs as it travels — which
    // is what "rising toward the terraces" is, mechanically, and is inherited
    // rather than corrected.
    const risers = creaturesOf(M);
    assert.equal(risers.length, 1, '§7: one animal on a line, and nothing else is alive');
    const riser = risers[0]!;
    const before = creaturesOf(LEDGER_PROSPECT)[0]!;
    assert.equal(riser.species, FaunaSpecies.Sounder);
    assert.deepEqual(riser.spawnAt, before.spawnAt, '§7: Prospect’s own line');
    assert.deepEqual(riser.driveTo, before.driveTo);
    assert.equal(riser.driveTo.depthM, undefined, '§13: no depth, and that is the inheritance');
    assert.equal(riser.loud, true);
    assert.equal(riser.atTick, T(18, 30), '§9: 18:30');
    assert.equal(riser.untilTick, T(19, 30), '§7: driven until 19:30');
    assert.equal(M.fauna, false, '§11: fauna are off');

    const travelM = Math.hypot(
      riser.driveTo.x - riser.spawnAt!.x,
      riser.driveTo.y - riser.spawnAt!.y
    );
    assert.equal(travelM, 1200, '§7: it covers 1,200 m');
    const seconds = travelM / SOUNDER.speed;
    assert.equal(seconds, 40, '§7: at 30 m/s, in forty seconds');
    assert.equal(DRIFT.VERTICAL_SPEED_MPS, 12, '§7: climbing at twelve as it goes');
    assert.equal(
      Math.round(riser.spawnAt!.depthM - seconds * DRIFT.VERTICAL_SPEED_MPS),
      2570,
      '§7: so it arrives over the terraces at about 2,570 m'
    );
    assert.equal(
      SOUNDER.workingDepthM,
      2000,
      '§13: which is where it is heading, and not stopping'
    );
    assert.equal(
      rangeAt(SOUNDER.sigActive, TRENCH, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      11016,
      '§7: the loudest authored sound in the bible'
    );
    const toSeat = Math.min(...cohort.map((unit) => away(unit, riser.spawnAt!)));
    assert.equal(toSeat, 2405, '§7: 2,405 m to the seat');
    assert.ok(
      detectionRatio(SOUNDER.sigActive, TRENCH, toSeat, CHORISTER.hyd) >=
        TIER_THRESHOLD_MULTIPLIER.TRACK,
      '§7: and a track from it'
    );
    // §8: ground at 220 a second, and gone in 2.4.
    assert.equal(SOUNDER.damagePerS, 220);
    assert.equal(Number((SUBMERSIBLE.maxHp / SOUNDER.damagePerS).toFixed(1)), 2.4);
  });

  it('closes at 21:00 without calling it a conclusion, and pays the telegraph 2.5 times', () => {
    // §9: "The close at 21:00 is the tide's turn and is **not** marked a
    // conclusion, so the sixty-second telegraph applies and is answered by a
    // hundred and fifty."
    assert.equal(resolveBeat.atTick, T(21));
    assert.equal(resolveBeat.conclusion, undefined, '§9: not a conclusion, deliberately');
    const loud = creaturesOf(M).filter((beat) => beat.loud);
    assert.equal(loud.length, 1);
    assert.equal(
      (resolveBeat.atTick - loud[0]!.atTick) / SIM.TICK_HZ,
      150,
      '§9: a hundred and fifty seconds against §10’s sixty'
    );
    assert.equal(150 / MISSION.FAILURE_TELEGRAPH_S, 2.5);
    // And the two sounds in front of it, which §8 counts as the column behind
    // the rule.
    assert.equal((resolveBeat.atTick - T(18)) / SIM.TICK_HZ, 180, '§8: the sounding at 18:00');
    assert.equal((resolveBeat.atTick - T(16)) / SIM.TICK_HZ, 300, '§8: the descent at 16:00');
    assert.deepEqual(M.lengthBandS, [1200, 1320], '§9: the header’s band');
    assert.equal(resolveBeat.atTick / SIM.TICK_HZ, 1260, '§9: and the resolve lands at 1,260');
  });

  it('says the two conditional lines off the two rows the count never grades', () => {
    const conditionals = M.conditionalBeats ?? [];
    assert.equal(conditionals.length, 2, '§9: two, printed rather than clocked');
    assert.deepEqual(conditionals[0]!.when, { kind: 'attend', count: 2 });
    assert.deepEqual(conditionals[1]!.when, {
      kind: 'tolerance',
      ticks: 3600,
      tier: ResolutionTier.Classification,
    });
    for (const beat of conditionals) {
      assert.equal(beat.kind, 'say');
      assert.equal(beat.choiceGroup, undefined, 'neither retires the other; both are entries');
    }
    assert.equal(
      conditionals[0]!.kind === 'say' ? conditionals[0]!.text : '',
      'Entered: both returns, bearing and period. The attending continues.',
      '§9: fired on the first pass, from the seat, before the column has moved'
    );
  });
});

describe('the tide has to run its length — §9, §13', () => {
  /** One rule, one fixture — `missionIntake.test.ts`'s idiom. */
  function fixture(overrides: Partial<MissionDefinition>): MissionDefinition {
    return {
      ...PROLOGUE_SORROWGATE,
      id: 'test-first-arrival-row',
      arrayTag: undefined,
      sweep: undefined,
      lifts: undefined,
      regions: [],
      markers: [],
      parties: [],
      conditionalBeats: undefined,
      beats: [{ atTick: ECHO_TICK_INTERVAL * 6, kind: 'resolve', note: '' }],
      ...overrides,
    };
  }

  function snapshot(tick: number): EchoSnapshot {
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

  const SINK: MissionCommandSink = {
    applyMove: () => {},
    applyDepth: () => true,
    applySilent: () => {},
    applyPing: () => {},
  };

  /** Drive the fixture and report the pass it closed on, or -1. */
  function closesOn(definition: MissionDefinition, passes: number): number {
    const runtime = new MissionRuntime(definition);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    for (let pass = 1; pass <= passes; pass++) {
      world.tick = pass * ECHO_TICK_INTERVAL;
      if (runtime.tick(world, SINK, snapshot(world.tick)) !== null) return pass;
    }
    return -1;
  }

  /**
   * `the-watch`'s shape: a terminal row true from the first pass — six being
   * at least four — standing in for a `survive` this fixture seats no hulls
   * for.
   */
  const met = {
    id: 'the-watch',
    text: '',
    initial: ObjectiveStatus.Pending,
    terminal: true as const,
    predicate: { kind: 'endure' as const, ticks: 0 },
  };
  /** `the-rim`'s shape: a terminal row nobody is shown until the count. */
  const late = { ...met, id: 'the-rim', revealAtTick: ECHO_TICK_INTERVAL * 4 };

  it('would close on the reveal without the flag, and does not with it', () => {
    // §9, §13, with the arithmetic: `the-watch` is met at tick zero and
    // `the-rim` is revealed at 19:00, so both terminal rows land on one pass
    // and the court's default rule resolves there — costing the withdrawal at
    // 19:30, Korrin's count at 20:30 and the silence the whole campaign has
    // been walking toward.
    assert.equal(
      closesOn(fixture({ objectives: [met, late] }), 8),
      4,
      'the court stops sitting on the pass that reveals the second row'
    );
    assert.equal(
      closesOn(fixture({ objectives: [met, late], runsItsLength: true }), 8),
      6,
      '§9: only the resolve beat closes the tide'
    );
    assert.equal(M.runsItsLength, true, '§9, §13: authored, and this ending needs it');
  });

  it('states the same thing about the literal’s own rows, by reading them', () => {
    // The fixture proves the runtime rule; this proves the rule bites here.
    // `the-watch` counts four of six placed, so it is Met from tick zero;
    // `the-rim` is the other terminal row and is revealed at 19:00; and there
    // are six beats after that reveal which the close would otherwise eat.
    const watchRow = objectiveBy('the-watch').predicate;
    assert.equal(watchRow.kind, 'survive');
    assert.ok(
      watchRow.kind === 'survive' && watchRow.count < watch.length,
      `${watch.length} placed against a count the mission opens above`
    );
    assert.equal(objectiveBy('the-rim').revealAtTick, T(19));
    assert.equal(
      M.beats.filter((beat) => beat.atTick > T(19)).length,
      6,
      '§9: the withdrawal, the count, Ossary and the turn all sit after the reveal'
    );
  });
});
