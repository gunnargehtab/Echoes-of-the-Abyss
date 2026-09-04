/**
 * The Second Chord 3, read — docs/mission-nineteen.md.
 *
 * `missions.test.ts` holds every mission to campaign.md §10's conventions; this
 * file holds Nineteen to the things only its own document claims, and to the
 * arithmetic that decides whether the mission is the one the document describes:
 *
 * - **The reach is 497 m, and it is a subtraction the map cannot state** (§4).
 *   `DRIFT.HOLLOW_TRIGGER_RANGE_M` is 500 m measured in three dimensions, and a
 *   party working at 1,750 m over coils held at 1,700 spends fifty of it on the
 *   vertical: √(500² − 50²) = 497.5 m across the ground. Nine of the nineteen
 *   points stand inside that and ten do not, the document says which nine, and
 *   nothing but this test re-derives it from the authored coordinates.
 * - **The stand-off is a race between two hearings** (§4). A Corvette
 *   classifies a coil at 498.3 m against a reach of 497.5 — less than a metre —
 *   and the Voice classifies one at 587 and tracks it at 438. Every one of
 *   those is quoted from the shipped propagation model rather than invented,
 *   and re-derived here so §4's table and the roster cannot drift apart.
 * - **A hull is a name and its intervals go down with it** (§4.4, §6). Six
 *   roles, one hull each, six standing `survive` rows; nineteen soundings whose
 *   carriers are fixed at authoring, distributed one, four, four, four, three
 *   and three. The Third's four are all contested and the Fifth's three are all
 *   free, which is the mission's argument stated as a roster.
 * - **The close is a failure, not a conclusion** (§8, §9). Ninety seconds
 *   between a basin that lifts off the Deep End calling at 100 and a `resolve`
 *   that is not marked a conclusion, against §10's sixty.
 *
 * Nothing here steps a match. Everything this document claims that a run would
 * be needed to see — that the sweep files, that a wounded coil closes, that a
 * lost carrier resets its ledger — is a property of systems with their own
 * suites (`hollow.test.ts`, `missionIntake.test.ts`, `missions.test.ts`); what
 * is unique to this mission is a table of coordinates and the arithmetic over
 * it, and that is what is checked.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_SONAR,
  Biome,
  DEPTH,
  DEPTH_BANDS,
  DIRECTIONAL_SIGNATURE,
  DRIFT,
  DepthBand,
  FACTION_COMBAT,
  Faction,
  FaunaSpecies,
  MISSION,
  MissionOutcome,
  ObjectiveStatus,
  PROPAGATION_FACTOR,
  ResolutionTier,
  SILENT_RUNNING,
  SIM,
  TIER_THRESHOLD_MULTIPLIER,
  UnitKind,
  crushAttritionPerSecond,
  detectionRatio,
  faunaStatsFor,
  requiredPressureRating,
  statsFor,
  thermoclineFactor,
} from '@echoes/shared';

import { THE_REST, mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { CHORD_NINETEEN } from '../src/sim/missions/nineteen.ts';
import { isStanding } from '../src/sim/missions/predicates.ts';

const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const HOLLOW = faunaStatsFor(FaunaSpecies.Hollow);
const SOUNDER = faunaStatsFor(FaunaSpecies.Sounder);
const CRUISER = statsFor(UnitKind.Cruiser);
const CORVETTE = statsFor(UnitKind.Corvette);
const SUBMERSIBLE = statsFor(UnitKind.AbyssalSubmersible);
const TRENCH_PF = PROPAGATION_FACTOR[Biome.AbyssalTrench];

/**
 * §6, §12 — the bench. It is a figure of the *briefing* and not of the literal:
 * `MissionSounding` is a point, a radius and a bow and carries no depth (§13),
 * so 1,750 m is where the Order is told to stand rather than where the format
 * keeps it. Every number below that quotes a vertical offset quotes this one.
 */
const BENCH_DEPTH_M = 1750;

/**
 * §4 — the strike's five hundred metres are measured like a bite, in three
 * dimensions, so a party fifty metres above a coil has 497 m of ground left.
 * The whole mission turns on this subtraction and no table states it.
 */
const REACH_M = Math.sqrt(
  DRIFT.HOLLOW_TRIGGER_RANGE_M ** 2 - (BENCH_DEPTH_M - HOLLOW.workingDepthM) ** 2
);

/** The range at which SIG through trench water reaches HYD at a tier's multiple. */
function rangeAt(sig: number, hyd: number, multiple: number): number {
  let low = 1;
  let high = 40000;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (detectionRatio(sig, TRENCH_PF, mid, hyd) >= multiple) low = mid;
    else high = mid;
  }
  return low;
}

/** The player's own six, in the order the literal seats them. */
const party = CHORD_NINETEEN.parties.find((p) => p.slot === CHORD_NINETEEN.playerSlot)!;
const soundings = CHORD_NINETEEN.soundings ?? [];
const coils = CHORD_NINETEEN.beats.filter(
  (beat) => beat.kind === 'creature' && beat.species === FaunaSpecies.Hollow
);
/** Every coil, as a plan position — what §4's arithmetic is measured against. */
const coilPoints = coils.map((beat) =>
  beat.kind === 'creature' ? { x: beat.spawnAt!.x, y: beat.spawnAt!.y } : { x: NaN, y: NaN }
);
const nearestCoilM = (x: number, y: number): number =>
  Math.min(...coilPoints.map((coil) => Math.hypot(coil.x - x, coil.y - y)));

const objective = (id: string) => CHORD_NINETEEN.objectives.find((o) => o.id === id)!;

describe('the Rest, as docs/mission-nineteen.md §11 gives it to the mission', () => {
  it('spreads the public header this literal is offered under', () => {
    assert.equal(CHORD_NINETEEN.id, 'chord-nineteen', '§1: namespaced by campaign');
    assert.equal(CHORD_NINETEEN.campaign, 'chord');
    assert.equal(CHORD_NINETEEN.ordinal, 3, 'campaign.md §7: the third of the Knight campaign');
    assert.equal(CHORD_NINETEEN.mapId, THE_REST.id);
    assert.equal(CHORD_NINETEEN.doc, 'docs/mission-nineteen.md');
    assert.equal(CHORD_NINETEEN.playerFaction, Faction.Hadron);
  });

  it('is a mission map and is not in the public catalogue', () => {
    assert.equal(THE_REST.seats, 1, '§11: one seat, not balanced');
    assert.equal(mapById('the-rest'), undefined, 'the skirmish screen would offer it');
    assert.equal(missionMapById('the-rest'), THE_REST, 'resolved by mission id only');
  });

  it('puts the floor four hundred metres under the bench and six-fifty at the east', () => {
    // §1, §11: "The party can stand over every metre of the trench and enter
    // none of it." The floor under both sounding rows is 2,150 m and 2,400 m
    // where the trench falls into the Deep End, against a party working at
    // 1,750 — so no route, bearing or corner gets it nearer than four hundred
    // metres, and the three easternmost names are six hundred and fifty away.
    const terrain = terrainFor(THE_REST);
    for (const sounding of soundings) {
      const floor = terrain.floorAt(sounding.x, sounding.y);
      const drop = floor - BENCH_DEPTH_M;
      assert.ok(
        drop === 400 || drop === 650,
        `${sounding.id}: the floor is ${drop} m under the bench, and §11 authors 400 or 650`
      );
    }
    const eastern = soundings.filter(
      (sounding) => terrain.floorAt(sounding.x, sounding.y) - BENCH_DEPTH_M === 650
    );
    assert.equal(eastern.length, 3, '§6: the last three, over the Deep End');
  });

  it('seats the party, the watch and the animals in water each of them is rated for', () => {
    // §11's table, row by row, and the one thing `missions.test.ts` checks
    // generically restated against the document's own claims: the bench is
    // the last fifty metres of a PR-2 rating, and the floor is 350 m outside
    // it for eighteen minutes.
    assert.equal(requiredPressureRating(BENCH_DEPTH_M), 2, '§11: the band’s last fifty metres');
    assert.equal(DEPTH_BANDS[DepthBand.MidWater].max, 1800, '§1: Mid-Water ends here');
    for (const unit of party.units) {
      assert.equal(unit.depthM, 1600, '§11: the party is seated at the Head');
      assert.equal(statsFor(unit.kind).pressureRating, 2, '§3: PR-2, and no refit');
      assert.equal(unit.pressureRating, undefined, '§3: the rating is the roster’s');
    }
    const watch = CHORD_NINETEEN.parties.find((p) => p.slot !== CHORD_NINETEEN.playerSlot)!;
    for (const unit of watch.units) {
      assert.equal(unit.depthM, 2100, '§5, §11: the watch works at 2,100 m');
      assert.equal(requiredPressureRating(unit.depthM), 3);
      assert.equal(statsFor(unit.kind).pressureRating, 3, '§5: PR-3');
    }
  });

  it('never crushes anybody, and prices the order it neither asks for nor blocks', () => {
    // §11's third argument: nothing on this map crushes anybody at any depth
    // the mission authors, and a descent order buys 4 HP/s no repair touches.
    for (const unit of [...party.units]) {
      assert.equal(
        crushAttritionPerSecond(2, unit.depthM),
        0,
        `${unit.tag}: crushed where it sits`
      );
    }
    assert.equal(
      crushAttritionPerSecond(2, BENCH_DEPTH_M),
      0,
      '§11: fifty metres inside the rating'
    );
    const belowFloor = crushAttritionPerSecond(2, 2150);
    assert.equal(belowFloor, 4, '§11: 4 HP/s one band under');
    assert.equal(CORVETTE.maxHp / belowFloor, 105, '§11: 105 seconds for a Corvette');
    assert.equal(CRUISER.maxHp / belowFloor, 300, '§11: 300 for the Voice');
  });

  it('keeps every pair Below-to-Below, so the layer says nothing', () => {
    // §7, §11: "the shallowest ground is 1,600 m and the duct ends at 1,300, so
    // every pair on this map is Below-to-Below and the layer's factor is 1
    // throughout" — arranged so the mission's one system is the only system
    // talking. Sampled over every depth the mission authors.
    const depths = [1600, BENCH_DEPTH_M, HOLLOW.workingDepthM, 1800, 2000, 2100];
    for (const a of depths) {
      for (const b of depths) {
        assert.equal(thermoclineFactor(a, b), 1, `${a} m against ${b} m is not one layer`);
      }
    }
  });
});

describe('the committal party, as docs/mission-nineteen.md §2 and §3 field it', () => {
  it('is six named hulls, thirty-seven souls, and every one of them armed', () => {
    assert.equal(party.units.length, 6, '§3: one Cruiser and five Corvettes');
    assert.equal(party.units[0]!.kind, UnitKind.Cruiser, '§3: the Voice');
    for (const unit of party.units.slice(1)) {
      assert.equal(unit.kind, UnitKind.Corvette, '§3: the working hulls');
    }
    for (const unit of party.units) {
      assert.equal(unit.armed, true, '§3: weapons live — the Order arranged this fight');
    }
    // §3: souls 12 and 5, and thirty-seven aboard. Read out nowhere, because
    // Sull reads hulls and refuses to read people (§13) — the field is the
    // document's, and this is the only place the arithmetic is checked.
    assert.equal(party.units[0]!.souls, 12);
    assert.deepEqual(
      party.units.slice(1).map((unit) => unit.souls),
      [5, 5, 5, 5, 5]
    );
    assert.equal(
      party.units.reduce((total, unit) => total + (unit.souls ?? 0), 0),
      37,
      '§3: thirty-seven aboard the party'
    );
    assert.equal(party.structures, undefined, '§3: no refit and no Spire');
    assert.equal(party.emitters, undefined);
  });

  it('gives every hull its own name, its own row and its own role', () => {
    // §4.1, and the first document in the bible to want `MissionUnit.role`'s
    // singular half six times over. Six roles, one hull each, and the count
    // each row asks for is one.
    const roles = party.units.map((unit) => unit.role);
    assert.deepEqual(roles, ['voice', 'first', 'second', 'third', 'fourth', 'fifth']);
    assert.equal(new Set(roles).size, 6, '§4: a loss is read alone');
    for (const role of roles) {
      const named = CHORD_NINETEEN.objectives.filter(
        (o) => o.predicate.kind === 'survive' && o.predicate.role === role
      );
      assert.equal(named.length, 1, `${role}: one row, and exactly one`);
    }
  });

  it('seats the watch as two weapons-cold hulls with no role and no faction of the player’s', () => {
    // §5: the watch is right, and the mission never lets it become an attack.
    // The roles rule from the other side — a role here would put another party
    // inside a counter the player is shown.
    const watch = CHORD_NINETEEN.parties.find((p) => p.slot !== CHORD_NINETEEN.playerSlot)!;
    assert.equal(CHORD_NINETEEN.parties.length, 2, '§2: three slots, and the court is empty');
    assert.equal(watch.faction, Faction.Directorate);
    assert.equal(watch.units.length, 2, '§5: two Abyssal Submersibles');
    for (const unit of watch.units) {
      assert.equal(unit.armed, undefined, '§5: weapons-cold');
      assert.equal(unit.role, undefined, '§5: it is not in the count');
    }
    assert.equal(SUBMERSIBLE.sigIdle, 22, '§5: 22 idle');
    assert.equal(SUBMERSIBLE.sigCruise, 28, '§5: 28 under way');
    assert.equal(SUBMERSIBLE.hyd, 85, '§5: HYD 85');
  });

  it('hands over the ping, strikes the yard, and orders no silence', () => {
    // §3, §13's "seven locks" row: one is authored and the six that are not
    // are the point. campaign.md §10 withholds the ping until mission 3 of
    // every campaign, and this is mission 3.
    const locked = new Set(CHORD_NINETEEN.locks.map((lock) => lock.ability));
    assert.deepEqual([...locked], ['construction'], '§3: a committal builds nothing');
    for (const ability of [
      'activeSonar',
      'weapons',
      'torpedoes',
      'mines',
      'depthCharges',
      'noisemakers',
    ] as const) {
      assert.ok(!locked.has(ability), `§3 leaves ${ability} unstruck and the literal strikes it`);
    }
    assert.equal(CHORD_NINETEEN.sigBudget, 80, '§4, §9: the interval’s own figure');
    assert.equal(CHORD_NINETEEN.silenceCeilingSig, 100, '§9: no silence order');
    assert.equal(CHORD_NINETEEN.debtCapS, 0);
    assert.equal(CHORD_NINETEEN.escortRadiusM, 0);
    assert.equal(CHORD_NINETEEN.arrayTag, undefined, '§9: no array to lend');
    assert.equal(CHORD_NINETEEN.startingNodules, 0, '§3: nothing to buy and nothing to spend');
    assert.equal(CHORD_NINETEEN.fauna, false, '§2: every animal here is authored');
    assert.deepEqual(CHORD_NINETEEN.regions, [], '§11: this mission authors no regions');
  });

  it('prices Silent Running twice, exactly as §3 does', () => {
    // §3's fifth item, and the reason the button is a bad trade in this water:
    // a hull at 8 is heard by a Hollow at Interest from 203 m and the same
    // hull showing its wake at cruise from 105 — silence is *louder to the
    // walls than facing is*. And a hull that runs quiet to play an interval
    // loses the interval, which `applySoundings` enforces rather than this.
    const wake = CORVETTE.sigCruise * DIRECTIONAL_SIGNATURE.WAKE;
    assert.equal(wake.toFixed(1), '2.8', '§3: the wake at 2.8');
    assert.equal(Math.round(rangeAt(SILENT_RUNNING.SIG_MAX, HOLLOW.hyd, HOLLOW.interest)), 203);
    assert.equal(Math.round(rangeAt(wake, HOLLOW.hyd, HOLLOW.interest)), 105);
    assert.ok(
      rangeAt(SILENT_RUNNING.SIG_MAX, HOLLOW.hyd, HOLLOW.interest) >
        rangeAt(wake, HOLLOW.hyd, HOLLOW.interest),
      '§3: silence is louder to the walls than facing is'
    );
    // §3's one correction against mission 1: the Knight energy term replaces
    // the hull's own burst rather than scaling it, so a Corvette firing shows
    // 38 in the cone and not 53.
    assert.equal(FACTION_COMBAT.ENERGY.FACTION, Faction.Hadron);
    assert.equal(FACTION_COMBAT.ENERGY.FIRING_SIG, 10, '§3: +10 and not +25');
    assert.equal(CORVETTE.sigCruise + FACTION_COMBAT.ENERGY.FIRING_SIG, 38);
  });
});

describe('the nineteen, as docs/mission-nineteen.md §6 lays them out', () => {
  it('is nineteen points in two rows, at 400 m, twenty seconds, and the eightieth', () => {
    assert.equal(soundings.length, 19, '§6: nineteen soundings, nineteen names');
    for (const sounding of soundings) {
      assert.equal(sounding.radiusM, 400, '§6: within four hundred metres');
      assert.equal(sounding.holdTicks, 20 * SIM.TICK_HZ, '§6: held twenty seconds');
      assert.equal(sounding.sig, 80, '§6: at SIG 80, Aptitude’s figure unchanged');
    }
    const north = soundings.filter((sounding) => sounding.y === 1750);
    const south = soundings.filter((sounding) => sounding.y === 2250);
    assert.equal(north.length, 10, '§6: ten at y 1,750');
    assert.equal(south.length, 9, '§6: nine at y 2,250');
    assert.deepEqual(
      north.map((sounding) => sounding.x),
      [250, 750, 1250, 1750, 2250, 2750, 3250, 3750, 4250, 4750],
      '§6: from x 250 in steps of 500'
    );
    assert.deepEqual(
      south.map((sounding) => sounding.x),
      [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500],
      '§6: from x 500 in steps of 500'
    );
    // §6: "Neighbours are 500 m apart along a row and 559 m across the rows."
    assert.equal(Math.hypot(250, 500).toFixed(0), '559');
  });

  it('gives the Voice one interval, and the Corvettes four, four, four, three and three', () => {
    // §4.4 — an interval is played by the hull it was given to, and a hull the
    // mission has lost takes its intervals with it. The distribution is the
    // mission's argument stated as a roster rather than as a sentence.
    const byCarrier = new Map<string, number>();
    for (const sounding of soundings) {
      byCarrier.set(sounding.tag, (byCarrier.get(sounding.tag) ?? 0) + 1);
    }
    assert.deepEqual(
      party.units.map((unit) => byCarrier.get(unit.tag) ?? 0),
      [1, 4, 4, 4, 3, 3],
      '§4.4: the Voice one, the Corvettes four, four, four, three and three'
    );
    assert.equal(
      [...byCarrier.values()].reduce((a, b) => a + b, 0),
      19,
      'every interval has a carrier and nobody carries a nineteenth'
    );
  });

  it('puts a coil inside nine of the nineteen metres, and outside ten', () => {
    // §4, §6 — the number the whole mission turns on, re-derived from the
    // authored coordinates rather than read off §6's last column: 500 m in
    // three dimensions, less fifty of vertical, is 497.5 m across the ground.
    assert.equal(REACH_M.toFixed(3), '497.494', '§4: 497 m horizontal');
    assert.equal(DRIFT.HOLLOW_TRIGGER_RANGE_M, 500, '§4: the strike, measured like a bite');
    const inside = soundings.filter((s) => nearestCoilM(s.x, s.y) < REACH_M);
    const free = soundings.filter((s) => nearestCoilM(s.x, s.y) >= REACH_M);
    assert.equal(inside.length, 9, '§4: nine of the nineteen have a coil inside their own metre');
    assert.equal(free.length, 10, '§6: and ten are free at the point');
    assert.deepEqual(
      inside.map((s) => s.id),
      [
        'ilar-orme',
        'wen-brannock',
        'marek-vale',
        'fen-tessaly',
        'ottiline-orme',
        'talin-vale',
        'yorrick-tessaly',
        'aled-orme',
        'roelle-vale',
      ],
      '§6 says which nine, and this is them'
    );
    // §6's own distances, to the metre.
    assert.equal(Math.round(nearestCoilM(750, 1750)), 350, '§6 row 2');
    assert.equal(Math.round(nearestCoilM(1250, 1750)), 372, '§6 row 3');
    assert.equal(Math.round(nearestCoilM(1750, 1750)), 430, '§6 row 4');
    assert.equal(Math.round(nearestCoilM(4750, 1750)), 1134, '§6 row 10: the furthest metre');
    assert.equal(Math.round(nearestCoilM(4500, 2250)), 610, '§6 row 19');
    // §6 row 4: "inside by sixty-seven metres. The widest of the nine."
    assert.equal(Math.round(REACH_M - nearestCoilM(1750, 1750)), 67);
    // §6 row 2, corrected: eighty-three is 433 − 350, the reach the document
    // carried while its coils were at 2,000 m. At 1,700 the coil reaches 147 m
    // beyond the point, and the row's own 350 is unchanged.
    assert.equal(Math.round(REACH_M - nearestCoilM(750, 1750)), 147);
  });

  it('leaves every interval playable from the far edge of its own disc', () => {
    // §4: "Every interval is playable from the far edge of its own 400 m disc,
    // bow at the wall, and every one of the nine is fatal from the point
    // itself." A standing on the far side of the point from the nearest coil
    // is nearest + radius away from it, and that has to clear the reach — or
    // the mission would have authored a name nobody can enter.
    for (const sounding of soundings) {
      const nearest = nearestCoilM(sounding.x, sounding.y);
      assert.ok(
        nearest + sounding.radiusM > REACH_M,
        `${sounding.id}: no standing inside its disc is outside a coil's reach`
      );
    }
    // And the other half: the ten free points are free *at the point* and not
    // in their discs — 610 m off a coil is two hundred and ten metres of drift
    // (§6), which is the mission's whole quiet cruelty.
    const nearestFree = Math.min(
      ...soundings.map((s) => nearestCoilM(s.x, s.y)).filter((d) => d >= REACH_M)
    );
    assert.equal(Math.round(nearestFree), 610);
    assert.equal(Math.round(nearestFree - REACH_M), 113, 'and the drift that spends it is smaller');
  });

  it('shares one coil between two names twice, and one with nobody once', () => {
    // §6's rows 4 and 5, 15 and 16, and 3: "clearing it buys two names", twice,
    // and "the one no other interval shares", once. The count of names whose
    // nearest coil is a given coil is what those sentences are about.
    const buyers = coilPoints.map(
      (coil) =>
        soundings.filter((s) => {
          const nearest = nearestCoilM(s.x, s.y);
          return (
            nearest < REACH_M && Math.abs(Math.hypot(coil.x - s.x, coil.y - s.y) - nearest) < 1
          );
        }).length
    );
    assert.equal(buyers.filter((n) => n === 2).length, 2, '§6: two coils buy two names each');
    assert.equal(
      buyers.filter((n) => n === 1).length,
      5,
      '§6: and the other five contested coils buy one apiece'
    );
    assert.equal(
      buyers.reduce((a, b) => a + b, 0),
      9,
      'nine names, and every one of them accounted to a coil'
    );
  });
});

describe('the walls, as docs/mission-nineteen.md §4 prices them', () => {
  it('places seven coils on two walls, at the species’ own working depth, undriven', () => {
    assert.equal(coils.length, 7, '§1, §5: seven coil on the two walls');
    for (const beat of coils) {
      if (beat.kind !== 'creature') continue;
      assert.equal(beat.atTick, 0, '§9: placed with the map');
      assert.equal(beat.spawnAt?.depthM, HOLLOW.workingDepthM, '§13: 1,700 m and no other');
      assert.equal(beat.spawnAt?.depthM, 1700);
      // Placed and not driven: committed to its own spawn for no ticks at all,
      // which hands it straight back to its trigger model (§9, §13).
      assert.deepEqual(beat.driveTo, { x: beat.spawnAt!.x, y: beat.spawnAt!.y });
      assert.equal(beat.untilTick, 0);
      assert.equal(beat.loud, false, 'nothing about a coiled animal is a precursor');
    }
    assert.equal(coilPoints.filter((coil) => coil.y === 1400).length, 4, '§11: four on the north');
    assert.equal(coilPoints.filter((coil) => coil.y === 2600).length, 3, '§11: three on the south');
    // §11: fifty metres above the water the party has to work in, which is
    // what makes 497 the number rather than 500.
    assert.equal(BENCH_DEPTH_M - HOLLOW.workingDepthM, 50);
    // §1: the band straddles the Mid-Water line, 1,250-2,150 m.
    assert.equal(HOLLOW.workingDepthM - HOLLOW.depthBandM, 1250);
    assert.equal(HOLLOW.workingDepthM + HOLLOW.depthBandM, 2150);
  });

  it('classifies a coil with less than a metre to spare from a Corvette', () => {
    // §4's second movement, quoted from the shipped model: SIG 3 in PF 1.60.
    // The Corvette's Classification at 498.3 m against a reach of 497.5 is the
    // whole stand-off, and its Track at 371 is a hundred and twenty-six metres
    // too late.
    const T4 = TIER_THRESHOLD_MULTIPLIER;
    assert.equal(HOLLOW.sigIdle, 3, '§4: coiled at three');
    assert.equal(rangeAt(HOLLOW.sigIdle, CORVETTE.hyd, T4.CLASSIFICATION).toFixed(1), '498.3');
    assert.ok(
      rangeAt(HOLLOW.sigIdle, CORVETTE.hyd, T4.CLASSIFICATION) - REACH_M < 1,
      '§4: less than a metre to spare'
    );
    assert.equal(Math.round(rangeAt(HOLLOW.sigIdle, CORVETTE.hyd, T4.TRACK)), 371);
    assert.equal(Math.round(REACH_M - rangeAt(HOLLOW.sigIdle, CORVETTE.hyd, T4.TRACK)), 126);
    assert.equal(Math.round(rangeAt(HOLLOW.sigIdle, CORVETTE.hyd, T4.CONTACT)), 883);
  });

  it('hears one ninety metres earlier from the Voice, which is two seconds', () => {
    const T4 = TIER_THRESHOLD_MULTIPLIER;
    assert.equal(Math.round(rangeAt(HOLLOW.sigIdle, CRUISER.hyd, T4.CONTACT)), 1041);
    assert.equal(Math.round(rangeAt(HOLLOW.sigIdle, CRUISER.hyd, T4.BEARING)), 808);
    assert.equal(Math.round(rangeAt(HOLLOW.sigIdle, CRUISER.hyd, T4.CLASSIFICATION)), 587);
    assert.equal(Math.round(rangeAt(HOLLOW.sigIdle, CRUISER.hyd, T4.TRACK)), 438);
    const earlier =
      rangeAt(HOLLOW.sigIdle, CRUISER.hyd, T4.CLASSIFICATION) -
      rangeAt(HOLLOW.sigIdle, CORVETTE.hyd, T4.CLASSIFICATION);
    assert.equal(Math.round(earlier), 89, '§4’s ninety metres, to the metre it actually is');
    assert.equal(Math.round(earlier / CRUISER.speed), 2, '§4: two seconds at the Voice’s 45 m/s');
    assert.equal(
      Math.round(REACH_M - rangeAt(HOLLOW.sigIdle, CRUISER.hyd, T4.TRACK)),
      60,
      '§4: her Track is sixty metres inside the reach'
    );
  });

  it('costs 640 HP to clear, which is 2.4 seconds under six guns and 15.4 under one', () => {
    // §4: "Clearing one is 640 HP." The guns are the roster's, so the arithmetic
    // moves if the roster does — which is the point of deriving it here.
    assert.equal(HOLLOW.maxHp, 640);
    const cruiserDps = CRUISER.attackDamage / CRUISER.attackCooldownS;
    const corvetteDps = CORVETTE.attackDamage / CORVETTE.attackCooldownS;
    assert.equal(cruiserDps, 60, '§4: 60/s from the Voice');
    assert.equal(corvetteDps.toFixed(1), '41.7', '§4: 41.7/s from each Corvette');
    const array = cruiserDps + 5 * corvetteDps;
    assert.equal(Math.round(array), 268, '§4: 268/s together');
    assert.equal((HOLLOW.maxHp / array).toFixed(1), '2.4', '§4: 2.4 seconds under all six guns');
    assert.equal((HOLLOW.maxHp / corvetteDps).toFixed(1), '15.4', '§4: 15.4 under one Corvette');
    // §4: a wound springs the strike, the lunge covers 400 m in 5.3 seconds,
    // and the strike is 55/s.
    assert.equal(HOLLOW.speed, 75);
    assert.equal((400 / HOLLOW.speed).toFixed(1), '5.3');
    assert.equal(HOLLOW.damagePerS, 55);
    assert.equal((CORVETTE.maxHp / HOLLOW.damagePerS).toFixed(1), '7.6', '§4: a Corvette dies');
    assert.equal((CRUISER.maxHp / HOLLOW.damagePerS).toFixed(1), '21.8', '§4: and the Voice');
  });

  it('is inaudible from anywhere the party has not already nearly reached', () => {
    // §7's inverse of Intake's opening: the player crosses this map hearing a
    // coil only when already inside a Classification of it. The nearest coil
    // to the Head is further than the Voice can hear one.
    const T4 = TIER_THRESHOLD_MULTIPLIER;
    const head = { x: 2500, y: 375 };
    const nearest = nearestCoilM(head.x, head.y);
    assert.ok(
      nearest > rangeAt(HOLLOW.sigIdle, CRUISER.hyd, T4.CONTACT),
      `§7: the walls are ${Math.round(nearest)} m off the spawn against 1,041 m of contact`
    );
    // §7: a strike is heard everywhere. SIG 60 reaches the Voice from 6,769 m
    // against a map whose longest diagonal is 6,403.
    assert.equal(HOLLOW.sigActive, 60);
    assert.equal(Math.round(rangeAt(HOLLOW.sigActive, CRUISER.hyd, T4.CONTACT)), 6769);
    assert.ok(
      rangeAt(HOLLOW.sigActive, CRUISER.hyd, T4.CONTACT) >
        Math.hypot(THE_REST.widthM, THE_REST.heightM)
    );
    assert.equal(Math.round(Math.hypot(THE_REST.widthM, THE_REST.heightM)), 6403);
  });
});

describe('the instrument, as docs/mission-nineteen.md §4 prices the ping', () => {
  it('hands over nine hundred metres for three seconds, and triples what hears it', () => {
    assert.equal(
      ACTIVE_SONAR.REVEAL_RADIUS_M,
      900,
      '§4, §12: nine hundred metres of wall, exactly'
    );
    assert.equal(ACTIVE_SONAR.REVEAL_DURATION_S, 3, '§4: for three seconds');
    assert.equal(ACTIVE_SONAR.EMITTER_SIG, 95, 'systems-echo.md §5: SIG 95 omnidirectional');
    assert.equal(ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER, 3, '§4: fauna aggro is tripled');
    assert.equal(ACTIVE_SONAR.EMITTER_SIG * ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER, 285);
  });

  it('makes the pinger Commit-loud to a wall at 1,434 m and to the basin at 1,479', () => {
    // §4's third movement, and the three numbers the briefing quotes. `heard`
    // is a detection ratio scaled by the ping multiplier (`fauna.ts`), so the
    // range is where the unscaled ratio reaches the threshold over three.
    const ping = (hyd: number, threshold: number): number =>
      rangeAt(ACTIVE_SONAR.EMITTER_SIG, hyd, threshold / ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER);
    assert.equal(
      Math.round(ping(HOLLOW.hyd, HOLLOW.commit)),
      1434,
      '§4, §12: fourteen thirty-four'
    );
    assert.equal(Math.round(ping(HOLLOW.hyd, HOLLOW.interest)), 1891);
    assert.equal(Math.round(ping(SOUNDER.hyd, SOUNDER.commit)), 1479, '§4: the basin, from a ping');
    assert.equal(
      Math.round(
        rangeAt(ACTIVE_SONAR.EMITTER_SIG, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.TRACK)
      ),
      4486,
      '§4: the watch resolves the pinger at Track from the whole trench'
    );
  });

  it('does not arm the trench, because Commit-loud is not a state a wall stays in', () => {
    // §4's rule, stated as the geometry it rests on: `hollowStage` reads Commit
    // *and* the 500 m in three dimensions together, so a hull that is
    // Commit-loud from a kilometre away is a hull the wall watches and does
    // not answer. The ping's Commit range is nearly three times the trigger.
    const commitRange = rangeAt(
      ACTIVE_SONAR.EMITTER_SIG,
      HOLLOW.hyd,
      HOLLOW.commit / ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER
    );
    assert.ok(
      commitRange > DRIFT.HOLLOW_TRIGGER_RANGE_M * 2,
      'proximity is the trigger; loudness alone never springs one'
    );
    // And the same rule from the sounding's side (§4): a tone at 80 commits a
    // coil from 648 m and interests it from 855, and a Corvette at cruise
    // commits one from 336 — every one of them outside the 500 m trigger, or
    // well inside it, and none of them a state.
    assert.equal(Math.round(rangeAt(80, HOLLOW.hyd, HOLLOW.commit)), 648);
    assert.equal(Math.round(rangeAt(80, HOLLOW.hyd, HOLLOW.interest)), 855);
    assert.equal(Math.round(rangeAt(CORVETTE.sigCruise, HOLLOW.hyd, HOLLOW.commit)), 336);
  });
});

describe('the objective, as docs/mission-nineteen.md §8 chooses it', () => {
  it('is eight rows, seven terminal, and not one of them a keystone', () => {
    assert.equal(CHORD_NINETEEN.objectives.length, 8, '§8: eight rows');
    const terminal = CHORD_NINETEEN.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => o.id),
      [
        'the-nineteen',
        'the-voice-answers',
        'first-answers',
        'second-answers',
        'third-answers',
        'fourth-answers',
        'fifth-answers',
      ],
      '§8: seven terminal, in the document’s order'
    );
    for (const o of CHORD_NINETEEN.objectives) {
      assert.notEqual(o.keystone, true, '§8: the Order does not rank a rest against a hull');
      assert.ok(o.reading !== undefined, `${o.id}: read out at the close`);
      assert.equal(o.revealAtTick, undefined, '§9: all eight rows are on the panel at 00:00');
    }
    assert.deepEqual(objective('the-nineteen').predicate, { kind: 'sound', count: 19 });
    assert.equal(objective('the-nineteen').markerId, 'the-rest');
    assert.equal(CHORD_NINETEEN.markers.length, 1, '§8: one circle, over the whole trench');
    assert.equal(CHORD_NINETEEN.markers[0]!.radiusM, 2250);
  });

  it('makes the six named rows standing, which is the substitution §8 is about', () => {
    // §8: an `extract` row over a region the party is seated in latches Met on
    // the first pass and is never re-derived, so a hull the walls took at 09:00
    // would read *home* at 18:00 beside a wreck. Only `quiet` and `survive` are
    // standing, so `survive` is the row that can say *is home* and mean *now*.
    for (const id of [
      'the-voice-answers',
      'first-answers',
      'second-answers',
      'third-answers',
      'fourth-answers',
      'fifth-answers',
    ]) {
      const row = objective(id);
      assert.equal(row.predicate.kind, 'survive', '§8: survive and not extract');
      assert.equal(row.predicate.kind === 'survive' ? row.predicate.count : NaN, 1);
      assert.ok(isStanding(row.predicate), '§8: able to go from Met back to Pending');
      // §4.1: the player is shown all six at 00:00, all six reading Met.
      assert.equal(row.initial, ObjectiveStatus.Met);
      assert.match(row.reading!.met, /is home\.$/);
      assert.match(row.reading!.unmet, /Say the name to the house yourself/);
    }
    assert.ok(
      !isStanding(objective('the-nineteen').predicate),
      'the count is a thing that happened'
    );
  });

  it('runs its full eighteen minutes without the flag, because the count is terminal', () => {
    // §9: "The court's rule is in force — `runsItsLength` is omitted." Six
    // standing rows read Met at tick zero, so the only thing between this
    // literal and a mission that closes on its first pass is the count, which
    // is terminal and cannot be met before a twenty-second hold has run.
    assert.equal(CHORD_NINETEEN.runsItsLength, undefined, '§9: the court’s rule is in force');
    const terminalMetAtZero = CHORD_NINETEEN.objectives
      .filter((o) => o.terminal === true)
      .filter((o) => o.initial === ObjectiveStatus.Met);
    assert.equal(terminalMetAtZero.length, 6, 'the six named rows, and only those');
    const count = objective('the-nineteen');
    assert.equal(count.terminal, true);
    assert.equal(count.initial, ObjectiveStatus.Pending, 'so tick zero is not a close');
  });

  it('reads the count out and never ranks it', () => {
    // §8, §9: the tolerance is sixty seconds at Classification, read out at the
    // close and unable to touch Complete, Partial or Lost. Nothing else keys on
    // it — the only mechanism attached to it is a sentence.
    const row = objective('the-count');
    assert.notEqual(row.terminal, true, '§8: read out, never ranked');
    assert.deepEqual(row.predicate, {
      kind: 'tolerance',
      ticks: 60 * SIM.TICK_HZ,
      tier: ResolutionTier.Classification,
    });
    assert.equal(row.predicate.kind === 'tolerance' ? row.predicate.ticks : NaN, 3600);
  });

  it('reads all three of Sull’s results, in the register', () => {
    assert.match(CHORD_NINETEEN.epilogue[MissionOutcome.Complete], /^Nineteen\. Entered, and six/);
    assert.match(CHORD_NINETEEN.epilogue[MissionOutcome.Complete], /Go and be dry\.$/);
    assert.match(CHORD_NINETEEN.epilogue[MissionOutcome.Partial], /^What was played is entered\./);
    assert.match(CHORD_NINETEEN.epilogue[MissionOutcome.Partial], /it is not mine to say\.$/);
    assert.match(
      CHORD_NINETEEN.epilogue[MissionOutcome.Lost],
      /^The trench has kept a count it was not owed\./
    );
    // §8's middle rung is wide on purpose: seven terminal rows and no keystone
    // means Partial covers nineteen names and five hulls home as well as no
    // names and one hull home, and the Order does not grade inside it.
    assert.equal(
      CHORD_NINETEEN.objectives.filter((o) => o.terminal === true).length,
      7,
      'seven rungs and one middle'
    );
  });
});

describe('the beat table, as docs/mission-nineteen.md §9 clocks it', () => {
  const beats = CHORD_NINETEEN.beats;
  const moves = beats.filter((beat) => beat.kind === 'move');
  const resolve = beats.find((beat) => beat.kind === 'resolve')!;
  const transit = beats.find(
    (beat) => beat.kind === 'creature' && beat.tag === 'the-basin' && beat.loud
  )!;

  it('walks the watch six legs on the axis, at 60 m/s, both hulls together', () => {
    // §7, §9: six authored legs, 1,300 m in twenty-two seconds, then two and a
    // half minutes of standing. The pair is authored rather than an AI patrol
    // for mission-sorrowgate.md §9's standing reason: the trench is why, and
    // the beats are when.
    assert.equal(moves.length, 12, '§9: six legs, two hulls each');
    const ticks = [...new Set(moves.map((beat) => beat.atTick))];
    assert.deepEqual(ticks, [T(1), T(4), T(7), T(10), T(13), T(15)], '§9: the six leg times');
    const lead = moves.filter((beat) => beat.kind === 'move' && beat.tag === 'watch-one');
    assert.deepEqual(
      lead.map((beat) => (beat.kind === 'move' ? beat.x : NaN)),
      [3500, 2000, 1000, 2000, 3500, 4800],
      '§9: west to a thousand, back east, and station resumed'
    );
    for (const beat of moves) {
      if (beat.kind !== 'move') continue;
      assert.equal(beat.y, beat.tag === 'watch-one' ? 2000 : 2080, '§9: the pair keeps its offset');
      assert.equal(beat.depthM, undefined, '§11: every leg is flown at the seated 2,100 m');
    }
    // §9: 1,300 m in twenty-two seconds at the roster's 60 m/s.
    assert.equal(SUBMERSIBLE.speed, 60);
    assert.equal(Math.round((4800 - 3500) / SUBMERSIBLE.speed), 22);
    // §9: 250 m from the north row in plan and 350 m below it, at the closest.
    assert.equal(2000 - 1750, 250);
    assert.equal(2100 - BENCH_DEPTH_M, 350);
  });

  it('listens in two windows totalling eleven minutes, and files on what it hears', () => {
    const sweep = CHORD_NINETEEN.sweep!;
    assert.deepEqual(sweep.tags, ['watch-one', 'watch-two'], '§5: both hulls listen');
    assert.deepEqual(sweep.windows, [
      { fromTick: T(1), untilTick: T(7) },
      { fromTick: T(10), untilTick: T(15) },
    ]);
    const minutes = sweep.windows.reduce(
      (total, pass) => total + (pass.untilTick - pass.fromTick) / (60 * SIM.TICK_HZ),
      0
    );
    assert.equal(minutes, 11, '§8: two windows totalling eleven minutes');
    assert.equal(sweep.scene, undefined, 'the Order is never shown the record it is entered in');
    assert.match(sweep.filedReading, /^Intervals were heard entered over the axis/, '§8, verbatim');
    // §8: the sweep files on every run and the document says so rather than
    // pretending it is a risk — a working hull at Contact from nine and a half
    // kilometres, on a map 5 km wide.
    assert.equal(Math.round(rangeAt(80, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT)), 9582);
    assert.equal(
      Math.round(rangeAt(80, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION)),
      5404
    );
    assert.ok(rangeAt(80, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT) > THE_REST.widthM);
  });

  it('lifts the basin at 16:30 and closes ninety seconds later, which is not a conclusion', () => {
    // §8, §9: the close is a failure the player can hear coming, so the resolve
    // is *not* marked a conclusion and campaign.md §10's sixty seconds are paid
    // out of the transit rather than waived.
    assert.equal(transit.atTick, T(16, 30), '§9: the basin lifts off the Deep End');
    assert.equal(transit.kind === 'creature' ? transit.loud : false, true);
    assert.equal(resolve.atTick, T(18), '§9: the close');
    assert.equal(resolve.kind === 'resolve' ? resolve.conclusion : true, undefined);
    const leadS = (resolve.atTick - transit.atTick) / SIM.TICK_HZ;
    assert.equal(leadS, 90, '§8: ninety seconds against §10’s sixty');
    assert.ok(leadS >= MISSION.FAILURE_TELEGRAPH_S);
    // §9: driven west along the axis at 1,800 m, fifty metres under the bench,
    // and at x ≈ 2,000 when Sull reads the count — which is under the Head.
    const drive = transit.kind === 'creature' ? transit.driveTo : { x: NaN, y: NaN, depthM: NaN };
    assert.deepEqual(drive, { x: 200, y: 2000, depthM: 1800 });
    assert.equal(1800 - BENCH_DEPTH_M, 50, '§8: fifty metres under the bench');
    assert.equal(SOUNDER.speed, 30);
    assert.equal(4700 - SOUNDER.speed * leadS, 2000, '§9: under the Head at 18:00');
    // §8: it takes the Voice and no Corvette. The footprint is a body plus a
    // hull radius, and the Corvette is under the threshold entirely.
    assert.ok(CRUISER.hullLengthM >= DRIFT.TRANSIT_MIN_HULL_M, '§8: the Voice at 130 m is ground');
    assert.ok(CORVETTE.hullLengthM < DRIFT.TRANSIT_MIN_HULL_M, '§8: and no Corvette is');
    assert.equal(SOUNDER.lengthM / 2 + CRUISER.hullLengthM / 2, 102.5, '§8: 102 m either side');
    // §7: calling at 100, which is the loudest thing in the game.
    assert.equal(SOUNDER.sigActive, 100);
    assert.equal(
      Math.round(rangeAt(SOUNDER.sigActive, CRUISER.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT)),
      9316
    );
    assert.equal(
      Math.round(rangeAt(SOUNDER.sigIdle, CRUISER.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT)),
      5655,
      '§7: and cruising at 45 before that'
    );
  });

  it('places the basin at its own working depth and drives it at an authored one', () => {
    // §13's seam: a *placed* animal holds `workingDepthM` and no other, and the
    // only thing that holds an authored depth is a driven creature. So the
    // basin sits at 2,000 m until 16:30 and runs its transit at 1,800.
    const placed = beats.find(
      (beat) => beat.kind === 'creature' && beat.tag === 'the-basin' && beat.atTick === 0
    )!;
    assert.equal(placed.kind === 'creature' ? placed.spawnAt?.depthM : NaN, SOUNDER.workingDepthM);
    assert.equal(SOUNDER.workingDepthM, 2000);
    assert.equal(placed.kind === 'creature' ? placed.untilTick : NaN, 0, 'placed and not driven');
    assert.equal(placed.kind === 'creature' ? placed.loud : true, false);
    // §11: the Sounder's band reaches the Deep End's floor and the bench alike.
    assert.equal(SOUNDER.workingDepthM - SOUNDER.depthBandM, 1300);
    assert.equal(SOUNDER.workingDepthM + SOUNDER.depthBandM, 2700);
  });

  it('speaks four times on the clock, and three times on a standing rule', () => {
    // §9, §12. Kalliso speaks exactly twice in the whole mission — once on the
    // first interval, whenever the party plays it, and once at 09:00 — and the
    // mission spends its whole middle putting the one distance between them.
    const says = beats.filter((beat) => beat.kind === 'say');
    assert.deepEqual(
      says.map((beat) => beat.atTick),
      [0, T(4), T(9), T(12), T(16, 45)],
      '§9: the committal order, the watch, Kalliso, Sull, and the basin'
    );
    const kalliso = says.filter((beat) => beat.kind === 'say' && beat.speaker.includes('Kalliso'));
    assert.equal(kalliso.length, 1, '§2: she speaks once on the clock');
    assert.match(
      kalliso[0]!.kind === 'say' ? kalliso[0]!.text : '',
      /^Nineteen\. We can replace the hulls in a season and the Knights in never\.$/,
      '§12, verbatim'
    );
    const conditionals = CHORD_NINETEEN.conditionalBeats ?? [];
    assert.equal(conditionals.length, 3, '§9: three conditional beats, in no order');
    for (const beat of conditionals) {
      assert.equal(beat.kind, 'say', '§9: no conditional beat touches the walls');
      assert.equal(beat.choiceGroup, undefined, 'a standing rule retires nothing');
    }
    assert.deepEqual(
      conditionals.map((beat) => beat.when),
      [
        { kind: 'sound', count: 1 },
        { kind: 'sound', count: 19 },
        { kind: 'tolerance', ticks: 60 * SIM.TICK_HZ, tier: ResolutionTier.Classification },
      ],
      '§9: on the first interval, on the nineteenth, and on sixty seconds at Classification'
    );
    const second = conditionals.find(
      (beat) => beat.kind === 'say' && beat.speaker.includes('Kalliso')
    )!;
    assert.match(
      second.kind === 'say' ? second.text : '',
      /^That is one of them\./,
      '§12 — the first interval, on the tally rather than the clock'
    );
  });

  it('arrives on the bench announced and climbs home silent', () => {
    // §7's last row: 1,600 m to 1,750 is 150 m at 45 m/s — three and a third
    // seconds at a SIG floor of 72 — which is a Track to the watch from
    // 3,772 m. The Order arrives announced, every time, and the climb is free.
    assert.equal(DEPTH.DESCENT_RATE_MPS, 45);
    assert.equal(DEPTH.DESCENT_SIG, 72);
    assert.equal(DEPTH.ASCENT_RATE_MPS, 15, '§7: and the climb home is silent');
    assert.equal(((BENCH_DEPTH_M - 1600) / DEPTH.DESCENT_RATE_MPS).toFixed(2), '3.33');
    assert.equal(
      Math.round(rangeAt(DEPTH.DESCENT_SIG, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.TRACK)),
      3772
    );
  });
});
