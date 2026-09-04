/**
 * The Second Seeding 4, read and run — docs/mission-deep-furrow.md.
 *
 * `missions.test.ts` holds every mission to campaign.md §10's conventions;
 * this file holds Deep Furrow to the things only its own document claims, and
 * to the one row the format learned in order to hold it at all.
 *
 * - **The garden rates the hulls standing in it** (§4.1). The headline claim,
 *   and the only one in the document that cannot be checked by reading a
 *   table: three PR-2 tenders in PR-3 water, and whether they crush is a fact
 *   about what happens at 60 Hz to a hull standing in a rectangle. Played,
 *   both ways — inside the furrow and one cell east of it, in the same match.
 * - **The sowing writes both halves on one tick** (§4.3). The water over the
 *   second furrow goes from carrying at 1.6 to absorbing at 0.55, *and* the
 *   rock starts holding a hull that was paying four a second for it — one
 *   `ground` beat, and the second half is what makes §8's last five minutes a
 *   decision rather than a crush ledger.
 * - **The arithmetic is the engine's** (§6, §7, §13). Every ratio in those two
 *   sections is re-derived here from `pathPropagation` **and**
 *   `thermoclineFactor` rather than from a biome constant, exactly as §13 asks
 *   — so a moved layer or a repainted region moves the document's ranges
 *   instead of falsifying them.
 * - **The reveal is the row's whole honesty** (§8). *tended* is an `extract`,
 *   `extract` is not standing, and a Met non-standing row never re-derives —
 *   so the row is revealed at 15:30 and the residual is twenty-four seconds,
 *   which is measured here rather than asserted.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  DEPTH,
  Faction,
  FaunaSpecies,
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
  crushAttritionPerSecond,
  detectionRatio,
  faunaStatsFor,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  thermoclineFactor,
} from '@echoes/shared';
import { defineQuery } from 'bitecs';
import { Owner, Position, Pressure, Unit } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { ANHOLT_FURROW } from '../src/sim/maps/missions/anholtFurrow.ts';
import { mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { SEEDING_DEEP_FURROW } from '../src/sim/missions/deepFurrow.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = SEEDING_DEEP_FURROW.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;
const hulls = defineQuery([Unit, Owner, Position]);

const HARVESTER = statsFor(UnitKind.Harvester);
const SCOUT = statsFor(UnitKind.LightScout);
const SUBMERSIBLE = statsFor(UnitKind.AbyssalSubmersible);
const HOLLOW = faunaStatsFor(FaunaSpecies.Hollow);
const DRAYMAW = faunaStatsFor(FaunaSpecies.Draymaw);

/** §11's places, as points, so the two sections' figures have ends to walk between. */
const FOOT = { x: 2000, y: 250, depthM: 900 };
const MOUTH = { x: 2000, y: 500, depthM: 900 };
/** The mouth again, five seconds into a dive: 900 + 5 × 45 is inside the duct. */
const MOUTH_IN_DUCT = { x: 2000, y: 500, depthM: 1125 };
const THROAT = { x: 2000, y: 1000, depthM: 1750 };
const GARDEN = { x: 1750, y: 2125, depthM: 2200 };
const GARDEN_MID = { x: 2000, y: 2125, depthM: 2200 };
const SOWING = { x: 2625, y: 2125, depthM: 2200 };
const SILL = { x: 2000, y: 2750, depthM: 2400 };
const BELOW = { x: 2000, y: 2950, depthM: 2400 };
const PACK = { x: 500, y: 250, depthM: 900 };
const WEST_WALL_HOLLOW = { x: 1350, y: 1000, depthM: 1700 };

const terrain = terrainFor(ANHOLT_FURROW);

interface Pair {
  x: number;
  y: number;
  depthM: number;
}

/**
 * §7's model, restated from the prose rather than read off the Echo Layer:
 * "each pair's PF the mean `pathPropagation` walks over the 250 m cells
 * between the two ends", times "the thermocline's pair factor applied where
 * the two ends are on opposite sides of the duct".
 *
 * Two functions the document names, composed the way it names them — and
 * neither of them a biome constant, which is exactly §13's ask: a repaint of
 * the furrow or a moved layer moves these numbers instead of falsifying the
 * table that quotes them.
 */
function ratio(sig: number, from: Pair, to: Pair, hyd: number): number {
  const pf = terrain.pathPropagation(from.x, from.y, to.x, to.y);
  const layer = thermoclineFactor(from.depthM, to.depthM);
  return detectionRatio(sig, pf * layer, Math.hypot(to.x - from.x, to.y - from.y), hyd);
}

/** The range at which SIG through a given water reaches HYD at a tier's multiple. */
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

/** Two decimals, because that is the precision §6 and §7 quote their ratios at. */
function near(actual: number, claimed: number, tolerance: number, what: string): void {
  assert.ok(
    Math.abs(actual - claimed) <= tolerance,
    `${what}: the document says ${claimed} and the engine says ${actual.toFixed(2)}`
  );
}

function furrowMatch(seed = 4): Match {
  const map = missionMapById(SEEDING_DEEP_FURROW.mapId)!;
  return new Match(map, { mission: SEEDING_DEEP_FURROW, fauna: false, seed });
}

const player = SEEDING_DEEP_FURROW.parties.find((party) => party.slot === PLAYER)!;
const tenders = player.units.filter((unit) => unit.role === 'tender');
const byId = (id: string) => SEEDING_DEEP_FURROW.objectives.find((o) => o.id === id)!;
const region = (id: string) => SEEDING_DEEP_FURROW.regions.find((r) => r.id === id)!;

describe('the working day, as docs/mission-deep-furrow.md §2 and §3 send it down', () => {
  it('is three unrefit tenders and two refit scouts, and nothing else', () => {
    assert.equal(SEEDING_DEEP_FURROW.mapId, 'anholt-furrow', '§11: the cleft under Anholt');
    assert.equal(SEEDING_DEEP_FURROW.playerFaction, Faction.Pelagia);
    assert.equal(tenders.length, 3, '§3: three tenders, one of them the sower');
    for (const hull of tenders) {
      assert.equal(hull.kind, UnitKind.Harvester);
      assert.equal(
        hull.pressureRating,
        undefined,
        '§2: unrefit — the argument is that an ordinary tender lives at 2,200 m'
      );
      assert.equal(hull.depthM, 900, '§11: seated at the Foot, above the layer');
      assert.equal(hull.armed, undefined, '§3: no weapons — not struck, simply not grown');
    }
    // §3's finding against two built documents, asserted so a "correction" of
    // the constant back to PR-1 fails here rather than in a playthrough: the
    // Harvester is PR-2 on the roster and this whole mission is priced on it.
    assert.equal(HARVESTER.pressureRating, 2, '§3: `units.ts` gives the Harvester PR-2');
    assert.equal(HARVESTER.maxHp, 300);
    assert.equal(HARVESTER.sigIdle, 18, '§3: the roster’s idle, not Tend’s eight');
    assert.equal(HARVESTER.sigCruise, 40);
    assert.equal(HARVESTER.speed, 40);

    const watch = player.units.filter((unit) => unit.role === 'watch');
    assert.equal(watch.length, 2, '§3: the programme’s two proof hulls');
    for (const hull of watch) {
      assert.equal(hull.kind, UnitKind.LightScout);
      assert.equal(hull.pressureRating, 3, '§3: PR-3 by refit, against the roster’s 1');
      assert.equal(SCOUT.pressureRating, 1, 'and the refit is a mission fact, never a roster one');
      assert.equal(SCOUT.hyd, 70, '§3: the only ears the day has under the layer');
    }
    assert.equal(player.structures, undefined, 'no Bastion, no yard, and no bloom-bed');
    assert.equal(player.emitters, undefined);
    assert.equal(SEEDING_DEEP_FURROW.startingNodules, undefined, '§3: the day earns nothing');
  });

  it('carries sixteen aboard the three, by household', () => {
    // §3, §8: the count is read out at the close and is never ranked, so it is
    // authored per hull rather than derived from one.
    assert.deepEqual(
      tenders.map((hull) => hull.souls),
      [5, 7, 4]
    );
    assert.equal(
      tenders.reduce((total, hull) => total + (hull.souls ?? 0), 0),
      16,
      '§3: sixteen, and *the-day*’s met reading says the number'
    );
    assert.match(byId('the-day').reading!.met, /Sixteen aboard, by household/);
  });

  it('locks the five ordnance affordances and the yard, and leaves the button on the panel', () => {
    const locked = new Map(SEEDING_DEEP_FURROW.locks.map((lock) => [lock.ability, lock.reason]));
    for (const ability of [
      'weapons',
      'torpedoes',
      'mines',
      'depthCharges',
      'noisemakers',
    ] as const) {
      assert.ok(locked.has(ability), `§3 does not grow ${ability} and the literal does`);
      assert.match(locked.get(ability)!, /not grown/, '§3: one reason, in register, five times');
    }
    assert.match(locked.get('construction')!, /it is sown/, '§3: nothing is built on a furrow');
    // §3, §4: mission 4, and the button arrived in mission 3. Not locked, and
    // priced instead — a ping is Commit-loud to both walls at once.
    assert.ok(!locked.has('activeSonar'), '§3: the plateaus have never asked the deep anything');
    assert.equal(SEEDING_DEEP_FURROW.sigBudget, 45, '§4: the sowing’s own figure');
    assert.equal(SEEDING_DEEP_FURROW.silenceCeilingSig, 100, '§9: no silence order');
    assert.equal(SEEDING_DEEP_FURROW.debtCapS, 0);
    assert.equal(SEEDING_DEEP_FURROW.arrayTag, undefined, '§9: no array to lend');
    assert.equal(SEEDING_DEEP_FURROW.escortRadiusM, 0, '§9: nothing waits for a gun');
    assert.equal(SEEDING_DEEP_FURROW.fauna, false, '§11: every creature is authored');
  });

  it('prices Silent Running in both directions, as §3 states it', () => {
    // The three sentences §3 spends on the button, each of them a roster
    // figure rather than a claim this document makes: a silent tender reads
    // 4.5 and climbs at 32, a silent scout reads 3.5 and climbs at 96, and a
    // dive floors SIG at 72 whatever the button says.
    const silent = (idle: number) =>
      SILENT_RUNNING.SIG_MIN +
      (SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN) * Math.min(1, Math.max(0, idle / 60));
    assert.equal(silent(HARVESTER.sigIdle), 4.5, '§3: a silent tender reads 4.5');
    assert.equal(silent(SCOUT.sigIdle), 3.5, '§3: a silent scout reads 3.5');
    assert.equal(HARVESTER.speed * SILENT_RUNNING.PELAGIA_SPEED_MULTIPLIER, 32, '§3: 32 m/s');
    assert.equal(SCOUT.speed * SILENT_RUNNING.PELAGIA_SPEED_MULTIPLIER, 96, '§3: 96 m/s');
    assert.equal(DEPTH.DESCENT_SIG, 72, '§3, §4: the descent floors SIG at 72 regardless');
    assert.equal(DEPTH.DESCENT_RATE_MPS, 45);
    assert.equal(DEPTH.ASCENT_RATE_MPS, 15, '§3: ascent is slow and adds no SIG');
  });
});

describe('the sowing, as docs/mission-deep-furrow.md §4.3 authors it', () => {
  const sowing = SEEDING_DEEP_FURROW.soundings![0]!;

  it('holds sixty seconds at forty-five, inside 250 m, on the sower', () => {
    assert.equal(SEEDING_DEEP_FURROW.soundings!.length, 1, '§8: one authored sounding');
    assert.equal(sowing.tag, 'sower', '§3: the hull carrying the Kell seed');
    assert.deepEqual([sowing.x, sowing.y], [2625, 2125], '§4: the point');
    assert.equal(sowing.radiusM, 250);
    assert.equal(sowing.holdTicks, T(1), '§4: sixty seconds');
    assert.equal(sowing.sig, 45, '§4: the working figure of a Standard cut');
  });

  it('puts the whole hold on ground the standing furrow does not rate', () => {
    // §4's one geometric argument, and the reason the point is at 2,625: the
    // sower stands at x >= 2,375 and the grant ends at x 2,250, so every
    // second of the sowing is paid for on unseeded ground. A point placed even
    // 130 m west would let the sowing be taken from inside the garden, which
    // takes the four a second out of the mission.
    const standing = region('standing-furrow');
    assert.equal(standing.x + standing.widthM, 2250, '§11: the ten-year ground ends here');
    assert.ok(
      sowing.x - sowing.radiusM > standing.x + standing.widthM,
      `§4: the hold's west edge is ${sowing.x - sowing.radiusM} and the grant ends at 2,250`
    );
    // And the same clearance against the Spire aura §3's approximation would
    // have had, which is the figure §4 actually quotes.
    assert.equal(1700 + STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M, 2300, '§4: the bed’s aura edge');
    assert.ok(sowing.x - sowing.radiusM > 2300, '§4: x >= 2,375 against an aura ending at 2,300');
    // The point is bare rock, in the region the ground beat repaints.
    const second = region('second-furrow');
    assert.ok(sowing.x >= second.x && sowing.x <= second.x + second.widthM);
    near(
      terrain.propagationAt(sowing.x, sowing.y),
      PROPAGATION_FACTOR[Biome.AbyssalTrench],
      0.001,
      '§4: the sowing stands on bare rock'
    );
  });

  it('costs the hull §4’s arithmetic, and leaves thirty-five of three hundred', () => {
    // §4's table, re-derived from the crush rule rather than transcribed: a
    // PR-2 hull at 2,200 m pays 4 × deficit² a second, the hold is sixty
    // seconds, and the walk is measured rather than quoted — the grant ends
    // where `standing-furrow` ends and the hold begins at the sounding's west
    // edge, so it is 125 m each way at the roster's 40 m/s.
    //
    // The document said 75 m and this test agreed with it by accident: it
    // reused the 75 it had just derived as *seconds of hull* as though it were
    // metres of ground. Two wrongs that read as one right. The furrow's grant
    // ends at 2,250; only the Sounding Spire approximation §3 has since
    // disowned ended at 2,300, and 2,375 − 2,300 is where the 75 came from.
    const perSecond = crushAttritionPerSecond(HARVESTER.pressureRating, 2200);
    assert.equal(requiredPressureRating(2200), 3, '§4: the water asks PR-3');
    assert.equal(perSecond, 4, '§4: four points a second, unhealable');
    assert.equal(
      HARVESTER.maxHp / perSecond,
      75,
      '§4: three hundred points is seventy-five seconds'
    );
    const standing = region('standing-furrow');
    const walkM = sowing.x - sowing.radiusM - (standing.x + standing.widthM);
    assert.equal(walkM, 125, '§4: the grant ends at 2,250 and the hold begins at 2,375');
    const walkS = walkM / HARVESTER.speed;
    near(walkS, 3.125, 0.001, '§4: the walk out from under the grant');
    const spent = perSecond * (60 + 2 * walkS);
    near(spent, 265, 0.5, '§4: the sowing costs this much hull');
    near(HARVESTER.maxHp - spent, 35, 0.5, '§4: left, of three hundred');
    // §4's last row: a sower that climbs to the Abyssal line instead of
    // walking back west is dead before it gets there.
    const climbS = (2200 - 1800) / DEPTH.ASCENT_RATE_MPS;
    near(climbS, 26.7, 0.1, '§4: 400 m at 15 m/s');
    near(climbS * perSecond, 107, 0.5, '§4: 107, and it is dead at eighteen hundred');
    assert.ok(climbS * perSecond > 35, '§4: “and it is dead at eighteen hundred”');
  });

  it('addresses the sower by its load rather than by a second role', () => {
    // §13's finding against the plan: `MissionUnit.role` is singular, and a
    // `role: 'sower'` would take the sower out of *the-day*'s count of three.
    const lift = SEEDING_DEEP_FURROW.lifts![0]!;
    assert.equal(lift.id, 'kell-seed');
    assert.equal(lift.tag, 'sower');
    assert.equal(lift.region, 'the-foot', '§3: rigged on the first pass, before the day moves');
    assert.equal(lift.cutTicks, 0, '§3: cut time zero — the gift run’s shape');
    assert.equal(lift.cutSig, 0, 'and never loud: a seeding is not a work site');
    const ottilie = SEEDING_DEEP_FURROW.conditionalBeats!.find(
      (beat) => beat.kind === 'say' && beat.speaker.startsWith('Ottilie')
    )!;
    assert.deepEqual(ottilie.when, {
      kind: 'extract',
      role: 'tender',
      region: 'second-furrow',
      count: 1,
      loaded: 'kell-seed',
    });
    assert.equal(tenders.filter((hull) => hull.role === 'tender').length, 3, '§8: still three');
  });
});

describe('the water a mission made habitable — docs/mission-deep-furrow.md §4.1', () => {
  /**
   * The headline claim, played rather than read: a PR-2 hull at 2,200 m in the
   * standing furrow, and the same hull in the same water one region east.
   *
   * The seat is at the Foot, so the hulls have to be driven down — which is
   * also the only way to assert §4's other half, that the descent is two legs
   * and the second one arrives on ground that holds.
   */
  /** The player's three tenders, by the hull the roster gives them. */
  function tenderEids(match: Match): number[] {
    return hulls(match.world).filter(
      (eid) => Owner.slot[eid] === PLAYER && Unit.kind[eid] === UnitKind.Harvester
    );
  }

  it('crushes a tender on the bare rock and holds the same tender in the furrow', () => {
    // The route is §4's own, and the test plays it rather than teleporting:
    // dive at the mouth where nothing coils (820 m from either wall, ratio
    // 43.3 against a Hollow's Interest of 45), run down the middle at 1,750 m
    // where a tender at cruise reads 34.9, and dive again over the garden.
    // Then two hulls part: one stands on the ten-year ground and one on the
    // bare rock 875 m east of it, at the same depth, in the same band.
    const match = furrowMatch();
    const order = (tick: number, act: (eids: number[]) => void) => {
      if (match.world.tick === tick) act(tenderEids(match));
    };
    for (let tick = 0; tick <= T(3); tick++) {
      order(T(0, 1), (eids) => {
        for (const eid of eids) match.orderMove(PLAYER, eid, MOUTH.x, MOUTH.y, false);
      });
      order(T(0, 12), (eids) => {
        for (const eid of eids) {
          assert.ok(match.orderDepth(PLAYER, eid, 1750), '§4: the first leg of the descent');
        }
      });
      order(T(0, 35), (eids) => {
        for (const eid of eids) match.orderMove(PLAYER, eid, GARDEN_MID.x, GARDEN_MID.y, false);
      });
      order(T(1, 25), (eids) => {
        match.orderMove(PLAYER, eids[0]!, GARDEN.x, GARDEN.y, false);
        match.orderMove(PLAYER, eids[1]!, SOWING.x, SOWING.y, false);
      });
      order(T(1, 50), (eids) => {
        for (const eid of eids) {
          assert.ok(match.orderDepth(PLAYER, eid, 2200), '§4: and the second, over the furrow');
        }
      });
      match.update(STEP_MS);
      match.takeMissionView();
    }

    const standing = region('standing-furrow');
    const inside = (x: number, y: number) =>
      x >= standing.x &&
      x <= standing.x + standing.widthM &&
      y >= standing.y &&
      y <= standing.y + standing.heightM;
    let inGarden = 0;
    let onRock = 0;
    for (const eid of tenderEids(match)) {
      const x = Position.x[eid]!;
      const y = Position.y[eid]!;
      assert.equal(Pressure.rating[eid], HARVESTER.pressureRating, 'unrefit, all the way down');
      if (inside(x, y)) {
        inGarden++;
        assert.equal(Pressure.bonus[eid], 1, '§4: the ground holds a hull standing on it');
        assert.equal(
          (Pressure.rating[eid] ?? 0) + (Pressure.bonus[eid] ?? 0),
          requiredPressureRating(2200),
          '§4: one band is exactly what this water asks for'
        );
        assert.equal(Pressure.unhealable[eid], 0, '§4: "Inside the furrow it pays nothing"');
      } else if (x > standing.x + standing.widthM) {
        onRock++;
        assert.equal(
          Pressure.bonus[eid],
          0,
          '§4: the second furrow is not rated before it is sown'
        );
        assert.ok(
          (Pressure.unhealable[eid] ?? 0) > 0,
          '§4: every second on unseeded ground is paid for at four points of hull'
        );
      }
    }
    assert.ok(inGarden >= 1, 'no tender reached the standing furrow');
    assert.equal(onRock, 1, 'exactly one tender was sent onto the bare rock');
  });

  it('rates the ten-year ground alone, and never both furrows', () => {
    // §11's most consequential region decision, asserted as data because a
    // grant on `the-furrows` would rate the second furrow before it is sown
    // and take the four a second out of the sowing — which is the mission.
    assert.equal(region('standing-furrow').pressureBonus, 1);
    assert.equal(region('the-furrows').pressureBonus, undefined, '§11: deliberately not this one');
    assert.equal(region('second-furrow').pressureBonus, undefined, '§4: not until it is sown');
    assert.equal(region('the-foot').pressureBonus, undefined);
    // One band, never two — and the Spire's is the same one, resolved as a max.
    assert.equal(STRUCTURE_AURAS.SOUNDING_SPIRE.PR_BONUS, 1);
    assert.deepEqual(
      [region('standing-furrow').x, region('standing-furrow').widthM],
      [1250, 1000],
      '§11: the 204 PC ground, and not the 1,500 m of both'
    );
  });

  it('turns the ground and grants it in one beat, on the sowing', () => {
    // §4.3 and §13's headline row: `biome` and `pressureBonus` on one `ground`
    // beat, keyed on the sounding. Either half alone is a different mission —
    // without the paint the water still carries, and without the grant "the
    // night is a crush ledger".
    const ground = SEEDING_DEEP_FURROW.conditionalBeats!.find((beat) => beat.kind === 'ground')!;
    assert.equal(ground.kind === 'ground' ? ground.region : '', 'second-furrow');
    assert.equal(ground.kind === 'ground' ? ground.biome : undefined, Biome.KelpForest);
    assert.equal(ground.kind === 'ground' ? ground.pressureBonus : undefined, 1);
    assert.equal(
      ground.kind === 'ground' ? ground.floorM : 0,
      undefined,
      '§4: the floor does not move'
    );
    assert.deepEqual(ground.when, { kind: 'sound', count: 1 });
    assert.equal(ground.choiceGroup, undefined, '§9: no group — none of the three retires another');
  });

  it('reads twenty-five while the seed goes in and seven once the ground has turned', () => {
    // §4.3's own sentence, and the only place in the document where the same
    // pair is priced through two different waters: "25.5 while the seed goes
    // in, 6.85 on a tender idling where it went in". The repaint is applied to
    // a copy of the terrain rather than to the shipped map, so this test says
    // what the beat does without any mission having run.
    const before = terrain.pathPropagation(SOWING.x, SOWING.y, SILL.x, SILL.y);
    near(before, 1.6, 0.001, '§6: the sowing to the sill, all trench');
    const sown = terrainFor(ANHOLT_FURROW);
    const second = region('second-furrow');
    sown.fillGround(second.x, second.y, second.widthM, second.heightM, {
      biome: Biome.KelpForest,
    });
    const after = sown.pathPropagation(SOWING.x, SOWING.y, SILL.x, SILL.y);
    near(after, 1.08, 0.005, '§6: 1.08 once the ground has turned');
    const distance = Math.hypot(SILL.x - SOWING.x, SILL.y - SOWING.y);
    near(Math.round(distance), 884, 1, '§6: 884 m');
    near(detectionRatio(45, before, distance, SUBMERSIBLE.hyd), 25.5, 0.1, '§6: the sowing');
    near(detectionRatio(18, after, distance, SUBMERSIBLE.hyd), 6.85, 0.1, '§6: the sown furrow');
  });
});

describe('what the sill hears — docs/mission-deep-furrow.md §6', () => {
  it('walks four path means over the cells, and the garden is on three of them', () => {
    // §7's central claim about this map, and the reason §13 calls the plan's
    // arithmetic a finding: no cross-region pair here is priced at the water
    // either end stands in, because the furrow lies on the line between the
    // cleft and the sill and takes a third of it down to 0.55.
    const walk = (a: Pair, b: Pair) => terrain.pathPropagation(a.x, a.y, b.x, b.y);
    near(walk(SOWING, FOOT), 1.53, 0.01, '§7: the sowing to home water');
    near(walk(MOUTH, SILL), 1.25, 0.005, '§7: the mouth to the sill');
    near(walk(THROAT, SILL), 1.15, 0.005, '§7: the throat to the sill');
    near(walk(GARDEN, SILL), 0.9, 0.005, '§7: the garden to the sill');
    assert.ok(
      walk(GARDEN, SILL) < PROPAGATION_FACTOR[Biome.AbyssalTrench],
      '§7: "the garden is acoustic cover for the water above it as well as for the hulls in it"'
    );
  });

  it('enters the day at the Foot as nothing, and the dive from its first second', () => {
    assert.equal(SUBMERSIBLE.hyd, 85, '§6: the observer’s ears');
    near(ratio(HARVESTER.sigIdle, FOOT, SILL, SUBMERSIBLE.hyd), 0.44, 0.01, '§6: the Foot, idle');
    assert.ok(
      ratio(HARVESTER.sigIdle, FOOT, SILL, SUBMERSIBLE.hyd) < TIER_THRESHOLD_MULTIPLIER.CONTACT,
      '§6: nothing. The Foot is a layer up and 2,500 m off'
    );
    near(
      rangeAt(
        HARVESTER.sigIdle,
        terrain.pathPropagation(FOOT.x, FOOT.y, SILL.x, SILL.y) * thermoclineFactor(900, 2400),
        SUBMERSIBLE.hyd,
        TIER_THRESHOLD_MULTIPLIER.CONTACT
      ),
      1504,
      1,
      '§6: a Contact at that figure reaches 1,504 m'
    );
    // The dive, twice: through the layer at 2.14, and in the duct at 7.14.
    near(ratio(DEPTH.DESCENT_SIG, MOUTH, SILL, SUBMERSIBLE.hyd), 2.14, 0.01, '§6: a Bearing');
    near(ratio(DEPTH.DESCENT_SIG, MOUTH_IN_DUCT, SILL, SUBMERSIBLE.hyd), 7.14, 0.01, '§6: Track');
    assert.equal(thermoclineFactor(MOUTH.depthM, SILL.depthM), 0.3, '§6: across the layer');
    assert.equal(thermoclineFactor(MOUTH_IN_DUCT.depthM, SILL.depthM), 1, '§6: in the duct');
    // "from its fifth second" — 900 m plus five seconds of descent is inside
    // the duct's top, which is what makes the pair factor 1.0 there.
    assert.ok(900 + 5 * DEPTH.DESCENT_RATE_MPS >= 1100, '§6: in the duct by the fifth second');
    assert.ok(900 + 4 * DEPTH.DESCENT_RATE_MPS < 1100, 'and not by the fourth');
  });

  it('hears the garden, the sowing, the ping and the cleft waking', () => {
    near(ratio(HARVESTER.sigIdle, GARDEN, SILL, SUBMERSIBLE.hyd), 8.87, 0.02, '§6: the garden');
    near(ratio(45, SOWING, SILL, SUBMERSIBLE.hyd), 25.5, 0.05, '§6: it hears the seed go in');
    near(ratio(95, GARDEN_MID, SILL, SUBMERSIBLE.hyd), 52.7, 0.05, '§6: a ping from the furrow');
    near(
      ratio(HOLLOW.sigActive, { x: 1900, y: 900, depthM: 1700 }, SILL, SUBMERSIBLE.hyd),
      7.84,
      0.02,
      '§6: a Hollow striking in the throat, 15:00'
    );
    // §6's last row, and the reason the mission bothers: everything above is
    // Track, and the observer never once closes on any of it.
    for (const claimed of [8.87, 25.5, 52.7, 7.84]) {
      assert.ok(claimed >= TIER_THRESHOLD_MULTIPLIER.TRACK, 'entered as Track');
    }
  });

  it('would hand the sill a Track on the garden if the bloom-bed still stood in it', () => {
    // §6's owned dishonesty, kept as an assertion rather than as a comment,
    // because it is why this literal seats no structure: a Sounding Spire
    // whose grant is load-bearing sings at 80, and at 693 m through 0.90 that
    // is a Track on the one thing the garden is supposed to have made quiet.
    const bed = { x: 1700, y: 2125, depthM: 2200 };
    const spire = structureStatsFor(StructureKind.SoundingSpire);
    assert.equal(spire.sigActive, 80, '§6: a Spire whose grant is load-bearing sings at 80');
    near(
      ratio(spire.sigActive, bed, SILL, SUBMERSIBLE.hyd),
      37.6,
      0.1,
      '§6: the format, not the water'
    );
    assert.ok(
      !player.units.some((unit) => unit.tag === 'bloom-bed'),
      'the bed is not a hull either'
    );
    assert.equal(
      (player.structures ?? []).filter((s) => s.kind === StructureKind.SoundingSpire).length,
      0,
      '§13: the approximation stood “until the row lands”, and the row has landed'
    );
  });
});

describe('what the day hears — docs/mission-deep-furrow.md §7', () => {
  it('hears nothing of the sill from home, and the sill from the throat', () => {
    assert.equal(SCOUT.hyd, 70);
    near(ratio(SUBMERSIBLE.sigIdle, SILL, FOOT, SCOUT.hyd), 0.45, 0.01, '§7: nothing, from home');
    near(ratio(SUBMERSIBLE.sigIdle, SILL, THROAT, SCOUT.hyd), 2.47, 0.01, '§7: a Bearing');
    near(ratio(SUBMERSIBLE.sigIdle, SILL, GARDEN_MID, SCOUT.hyd), 10.0, 0.05, '§7: Track');
    near(
      ratio(SUBMERSIBLE.sigIdle, SILL, GARDEN_MID, HARVESTER.hyd),
      4.31,
      0.02,
      '§7: even a tender has it named from the garden'
    );
    // §7's all-trench counterfactual, which is what the garden buys the water
    // above it: Contact, Classification and Track, in the document's order.
    const trench = PROPAGATION_FACTOR[Biome.AbyssalTrench];
    assert.deepEqual(
      [
        rangeAt(SUBMERSIBLE.sigIdle, trench, SCOUT.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
        rangeAt(SUBMERSIBLE.sigIdle, trench, SCOUT.hyd, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
        rangeAt(SUBMERSIBLE.sigIdle, trench, SCOUT.hyd, TIER_THRESHOLD_MULTIPLIER.TRACK),
      ],
      [3787, 2136, 1592],
      '§7: all-trench the tiers would stand here, and the garden is why they do not'
    );
    // 13:00, going below: the watch hears it leave.
    near(
      ratio(SUBMERSIBLE.sigCruise, BELOW, GARDEN_MID, SCOUT.hyd),
      9.8,
      0.05,
      '§7: it goes below'
    );
  });

  it('completes §7’s home-water table — the sowing heard up the cleft, and the cleft waking', () => {
    // The two rows of §7's first table that are not the sill's and not the
    // Drift's, and §13 asks for every figure in §6 and §7 re-derived rather
    // than most of them: what home hears of the work, and what home hears of
    // the doorway closing behind the hulls that stayed.
    //
    // The sowing, from home water: a Bearing and no more. "The plateau hears
    // that the seed is going in and cannot hear whether it takes" — the whole
    // of §4.4 in one ratio, and it is the layer that does it.
    near(terrain.pathPropagation(SOWING.x, SOWING.y, FOOT.x, FOOT.y), 1.53, 0.01, '§7: the walk');
    assert.equal(thermoclineFactor(SOWING.depthM, FOOT.depthM), 0.3, '§7: across the layer');
    near(Math.round(Math.hypot(FOOT.x - SOWING.x, FOOT.y - SOWING.y)), 1976, 1, '§7: 1,976 m');
    const sowingHeard = ratio(45, SOWING, FOOT, SCOUT.hyd);
    near(sowingHeard, 1.66, 0.01, '§7: a Bearing, and the plateau cannot hear whether it takes');
    assert.ok(
      sowingHeard >= TIER_THRESHOLD_MULTIPLIER.BEARING &&
        sowingHeard < TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION,
      '§7: a Bearing — no more, and not nothing'
    );
    // A Hollow striking at the throat's centre at 15:00, heard from home
    // water: Track, across the layer, at 650 m. "A watch that went home hears
    // the doorway close behind the ones that stayed."
    const centre = { x: 2000, y: 900, depthM: HOLLOW.workingDepthM };
    near(terrain.pathPropagation(centre.x, centre.y, FOOT.x, FOOT.y), 1.4, 0.01, '§7: the walk');
    const waking = ratio(HOLLOW.sigActive, centre, FOOT, SCOUT.hyd);
    near(waking, 12.0, 0.05, '§7: the cleft waking is heard from home water');
    assert.ok(waking >= TIER_THRESHOLD_MULTIPLIER.TRACK, '§7: Track');
  });

  it('gives the watch a bearing on each wall from the middle of the road', () => {
    // §7's "the Drift's own Silent Running, priced at three, and exactly
    // enough to know where not to dive" — and the tender's deafness beside it,
    // which is why the watch is the day's only ears.
    assert.equal(HOLLOW.sigIdle, 3);
    near(
      ratio(HOLLOW.sigIdle, WEST_WALL_HOLLOW, THROAT, SCOUT.hyd),
      2.29,
      0.01,
      '§7: a bearing from the throat’s middle'
    );
    const trench = PROPAGATION_FACTOR[Biome.AbyssalTrench];
    assert.deepEqual(
      [
        rangeAt(HOLLOW.sigIdle, trench, SCOUT.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
        rangeAt(HOLLOW.sigIdle, trench, SCOUT.hyd, TIER_THRESHOLD_MULTIPLIER.BEARING),
        rangeAt(HOLLOW.sigIdle, trench, SCOUT.hyd, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      ],
      [1090, 846, 615],
      '§7: Tier 1 1,090 m · Bearing 846 · Classification 615'
    );
    assert.equal(
      rangeAt(HOLLOW.sigIdle, trench, HARVESTER.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      642,
      '§7: a tender in the middle hears nothing of either'
    );
    assert.equal(
      rangeAt(HOLLOW.sigActive, trench, SCOUT.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      7090,
      '§7: a strike is everywhere on the map'
    );
    assert.equal(rangeAt(45, trench, SCOUT.hyd, TIER_THRESHOLD_MULTIPLIER.TRACK), 2491, '§7');
    assert.equal(rangeAt(45, trench, HARVESTER.hyd, TIER_THRESHOLD_MULTIPLIER.TRACK), 1467, '§7');
  });

  it('stops home’s own sound in the duct', () => {
    // §7's last row, and the layer's whole argument said from the other side:
    // the pack is Classification at the Foot all day and a bare Contact at the
    // throat, and the garden never hears it at all.
    near(ratio(DRAYMAW.sigIdle, PACK, FOOT, SCOUT.hyd), 3.25, 0.01, '§7: the sound of home');
    near(ratio(DRAYMAW.sigIdle, PACK, THROAT, SCOUT.hyd), 1.03, 0.01, '§7: a bare Contact');
    near(ratio(DRAYMAW.sigIdle, PACK, GARDEN_MID, SCOUT.hyd), 0.5, 0.01, '§7: and nothing here');
    assert.ok(
      ratio(DRAYMAW.sigIdle, PACK, GARDEN_MID, SCOUT.hyd) < TIER_THRESHOLD_MULTIPLIER.CONTACT
    );
  });

  it('prices the walls’ schedule the way §4 and §7 price it', () => {
    // The Drift's half of the same table: where a dive coils a Hollow, where
    // it is struck, and why the mouth and the middle are the two answers.
    const trench = PROPAGATION_FACTOR[Biome.AbyssalTrench];
    const at = (sig: number, threshold: number) => rangeAt(sig, trench, HOLLOW.hyd, threshold);
    assert.equal(at(DEPTH.DESCENT_SIG, HOLLOW.interest), 800, '§7: a dive coils from 800 m');
    assert.equal(at(DEPTH.DESCENT_SIG, HOLLOW.commit), 607, '§7: Commit-loud from 607 m');
    assert.equal(at(HARVESTER.sigCruise, HOLLOW.interest), 554);
    assert.equal(at(HARVESTER.sigIdle, HOLLOW.interest), 336);
    assert.equal(at(95 * 3, HOLLOW.commit), 1434, '§3: a ping is Commit-loud from 1,434 m');
    // §3: and the two walls stand 1,300 m apart, so a ping between them is
    // Commit-loud to both at once.
    assert.equal(2650 - 1350, 1300, '§11: the walls');
    assert.ok(at(95 * 3, HOLLOW.commit) > 1300 / 2 + 650);
    // §4's three standings: the mouth coils nothing, the middle coils both and
    // is struck by neither, and a wall is a bite.
    const fromWall = Math.hypot(MOUTH.x - 1350, MOUTH.y - 1000);
    near(fromWall, 820, 1, '§4: the mouth’s edge, 820 m from either');
    assert.ok(
      detectionRatio(DEPTH.DESCENT_SIG, trench, fromWall, HOLLOW.hyd) < HOLLOW.interest,
      '§4: a dive at the mouth is not even coiled'
    );
    near(detectionRatio(DEPTH.DESCENT_SIG, trench, fromWall, HOLLOW.hyd), 43.3, 0.1, '§4');
    assert.ok(
      detectionRatio(HARVESTER.sigCruise, trench, 650, HOLLOW.hyd) < HOLLOW.interest,
      '§7: a tender crossing the middle at 40 reads 34.9, under Interest'
    );
    near(detectionRatio(HARVESTER.sigCruise, trench, 650, HOLLOW.hyd), 34.9, 0.05, '§7');
    // §7: the sowing itself is below Interest to the nearer wall, 1,125 m off.
    const fromEast = Math.hypot(SOWING.x - 2650, SOWING.y - 1000);
    near(fromEast, 1125, 1, '§7: 1,125 m from the eastern wall');
    near(detectionRatio(45, trench, fromEast, HOLLOW.hyd), 16.3, 0.05, '§7: below Interest');
    // §7: under kelp a silent tender cannot spring a Hollow at any range.
    const kelp = PROPAGATION_FACTOR[Biome.KelpForest];
    assert.ok(
      detectionRatio(4.5, kelp, 1, HOLLOW.hyd) < HOLLOW.interest,
      '§7: 26.9 at point blank'
    );
    assert.equal(rangeAt(HARVESTER.sigIdle, kelp, HOLLOW.hyd, HOLLOW.commit), 131, '§7');
    assert.equal(rangeAt(HARVESTER.sigCruise, kelp, HOLLOW.hyd, HOLLOW.commit), 216, '§7');
    // And the fact that makes those three numbers moot: the garden is fifty
    // metres under the floor of the band that hunts.
    assert.equal(HOLLOW.workingDepthM + HOLLOW.depthBandM, 2150, '§1: the Hollow’s band ends here');
    assert.equal(2200 - 2150, 50, '§1: fifty metres under the floor of the last band that hunts');
  });
});

describe('the objective, as docs/mission-deep-furrow.md §8 chooses it', () => {
  it('decides the count by the sowing and the night, and reads the people out beneath', () => {
    const terminal = SEEDING_DEEP_FURROW.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => o.id),
      ['sown', 'tended'],
      '§8: two terminal rows'
    );
    for (const objective of terminal) {
      assert.notEqual(objective.keystone, true, '§8: no keystone, deliberately');
      assert.ok(objective.reading !== undefined);
    }
    assert.deepEqual(byId('sown').predicate, { kind: 'sound', count: 1 });
    assert.deepEqual(byId('tended').predicate, {
      kind: 'extract',
      role: 'tender',
      region: 'the-furrows',
      count: 2,
    });
    assert.deepEqual(byId('the-day').predicate, { kind: 'survive', role: 'tender', count: 3 });
    for (const objective of SEEDING_DEEP_FURROW.objectives) {
      assert.equal(objective.initial, ObjectiveStatus.Pending, `${objective.id}: opens answered`);
    }
    assert.notEqual(byId('the-day').terminal, true, '§8: read out, never ranked');
    assert.equal(byId('the-day').markerId, undefined, '§8: no marker');
    assert.match(byId('sown').reading!.met, /^Two furrows\./);
    assert.match(byId('tended').reading!.unmet, /^Nobody slept below\./);
  });

  it('runs its length, because both terminal rows can be met on the 15:30 pass', () => {
    // §8's own argument for the flag, restated as arithmetic: *tended* is
    // revealed at 15:30 and a day that sowed by 09:00 meets both rows on that
    // pass. Without the flag the court's rule closes the tide there — before
    // the Hollows have gone quiet, and three minutes early.
    assert.equal(SEEDING_DEEP_FURROW.runsItsLength, true);
    assert.equal(byId('tended').revealAtTick, T(15, 30));
    const resolve = SEEDING_DEEP_FURROW.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.atTick, T(18), '§9: the tide turns at 18:00');
    assert.equal((resolve.atTick - T(15, 30)) / SIM.TICK_HZ, 150, '§8: two and a half minutes');
  });

  it('reveals *tended* on the beat that releases the Hollows, and not before', () => {
    // §8's roll idiom. `extract` is not standing and a Met non-standing row
    // never re-derives, so a *tended* revealed at 00:00 would latch Met at
    // about 02:00 and read "it's a garden" over a day that went home.
    assert.ok(
      SEEDING_DEEP_FURROW.beats.some((beat) => beat.atTick === T(15, 30) && beat.kind === 'say'),
      '§9: the watch says there is room on the tick the row appears'
    );
    assert.equal(byId('sown').revealAtTick, undefined, '§8: sown is shown from 00:00');
    assert.equal(byId('the-day').revealAtTick, undefined);
    // §8's residual, re-derived leg by leg from the document's own three
    // figures rather than from a route of the test's choosing: "thirty seconds
    // to the top of the garden's water, thirty-nine up the throat silent,
    // fifty-seven to the Foot". The legs are sequential because the floors
    // step — a hull at 2,200 m is below the cleft's 1,800 and cannot move
    // north until it has climbed, and it cannot enter the Foot's 900 m water
    // until it has climbed again.
    const cleft = ANHOLT_FURROW.regions.find((r) => r.floorM === 1800)!;
    assert.equal(cleft.heightM, 1250, '§11: the throat is the cleft’s own height');
    const climbGarden = (2200 - 1750) / DEPTH.ASCENT_RATE_MPS;
    const throatRun = cleft.heightM / (HARVESTER.speed * SILENT_RUNNING.PELAGIA_SPEED_MULTIPLIER);
    const climbThroat = (1750 - 900) / DEPTH.ASCENT_RATE_MPS;
    near(climbGarden, 30, 0.1, '§8: thirty seconds to the top of the garden’s water');
    near(throatRun, 39, 0.1, '§8: thirty-nine up the throat silent — the cleft’s own 1,250 m');
    near(climbThroat, 57, 0.5, '§8: fifty-seven to the Foot');
    // And the figure the whole row hangs on: the window between the reveal and
    // the tide, less the trip home, is the number §8 prints. A residual that
    // quietly grew would mean a plateau could be read as having stayed with
    // minutes to spare, which is the reading §8 argues is worse than this one.
    const home = climbGarden + throatRun + climbThroat;
    near(home, 125.7, 0.5, '§8: a day that leaves the garden at 15:54 is home by 18:00');
    near(
      (T(18) - T(15, 30)) / SIM.TICK_HZ - home,
      24,
      0.5,
      '§8: a twenty-four-second window in which a plateau can read as having stayed and be gone'
    );
  });

  it('scores nothing of *tended* before 15:30, with two tenders standing in the furrows', () => {
    // The trap the reveal exists for, played rather than reasoned about.
    // `extract` is not standing, so a row that latched Met at 02:00 would still
    // read Met at the tide over a day that went home at 15:30 — and the only
    // thing between the literal and that reading is `revealAtTick`. So the
    // assertion is that the row is not on the wire at all before its beat, and
    // that its marker is not either (`projectMissionView` ships a marker only
    // while an objective naming it is revealed).
    const match = furrowMatch();
    const tenderEids = () =>
      hulls(match.world).filter(
        (eid) => Owner.slot[eid] === PLAYER && Unit.kind[eid] === UnitKind.Harvester
      );
    let sawTendedEarly = false;
    let sawMarkerEarly = false;
    let revealedAtTick = -1;
    for (let tick = 0; tick <= T(15, 30); tick++) {
      const now = match.world.tick;
      const eids = tenderEids();
      if (now === T(0, 1)) for (const eid of eids) match.orderMove(PLAYER, eid, MOUTH.x, MOUTH.y);
      if (now === T(0, 12)) for (const eid of eids) match.orderDepth(PLAYER, eid, 1750);
      if (now === T(0, 40)) {
        for (const eid of eids) match.orderMove(PLAYER, eid, GARDEN.x, GARDEN.y);
      }
      if (now === T(1, 30)) for (const eid of eids) match.orderDepth(PLAYER, eid, 2200);
      match.update(STEP_MS);
      const view = match.takeMissionView();
      if (view === null) continue;
      const tended = view.objectives.find((o) => o.id === 'tended');
      if (tended !== undefined) {
        if (view.tick < T(15, 30)) sawTendedEarly = true;
        else if (revealedAtTick < 0) revealedAtTick = view.tick;
      }
      if (view.tick < T(15, 30) && view.markers.some((marker) => marker.id === 'the-furrows')) {
        sawMarkerEarly = true;
      }
    }
    // The premise of the trap: the hulls really are in the region the row
    // counts, and have been since about 02:00.
    const both = region('the-furrows');
    const inside = tenderEids().filter(
      (eid) =>
        Position.x[eid]! >= both.x &&
        Position.x[eid]! <= both.x + both.widthM &&
        Position.y[eid]! >= both.y &&
        Position.y[eid]! <= both.y + both.heightM
    );
    assert.ok(inside.length >= 2, '§8: two tenders are standing in the furrows well before 15:30');
    assert.equal(sawTendedEarly, false, '§8: not scored, and not shown, before the roll');
    assert.equal(sawMarkerEarly, false, '§8: and the marker it names stays off the wire with it');
    assert.equal(revealedAtTick, T(15, 30), '§8: revealed on the beat, and on that beat');
  });

  it('reads all three of Marr’s results, and lets a plateau that planted nothing be a result', () => {
    assert.match(SEEDING_DEEP_FURROW.epilogue[MissionOutcome.Complete], /^It's two furrows/);
    assert.match(SEEDING_DEEP_FURROW.epilogue[MissionOutcome.Partial], /^One of the two\./);
    assert.match(SEEDING_DEEP_FURROW.epilogue[MissionOutcome.Lost], /^The rock's still bare/);
    assert.match(
      SEEDING_DEEP_FURROW.epilogue[MissionOutcome.Lost],
      /the ledger that doesn't heal/,
      '§8: the one cost in this mission that makes no sound at all'
    );
    // §8: a plateau that plants nothing and sleeps in the garden it has is a
    // Partial rather than a Lost, and that is what "no keystone" buys.
    assert.ok(
      SEEDING_DEEP_FURROW.objectives.every((o) => o.keystone !== true),
      '§8: a keystone on *sown* would tell the player what a garden is for'
    );
  });
});

describe('the beats, as docs/mission-deep-furrow.md §9 times them', () => {
  const beats = SEEDING_DEEP_FURROW.beats;
  const says = beats.filter((beat) => beat.kind === 'say');

  it('places the walls, the crop and the lanes at 00:00, driven nowhere', () => {
    const creatures = beats.filter((beat) => beat.kind === 'creature' && beat.atTick === 0);
    assert.equal(creatures.length, 6, '§5: two Hollows, three clusters and a pack');
    for (const beat of creatures) {
      if (beat.kind !== 'creature') continue;
      assert.equal(beat.loud, false, 'a coiled animal is a precursor to nothing');
      assert.equal(beat.untilTick, 0, '§9: driven nowhere');
      assert.deepEqual(beat.driveTo, { x: beat.spawnAt!.x, y: beat.spawnAt!.y });
      // §13, and the trap the format survey names: a placed creature holds its
      // species' working depth, not its authored spawn depth — so the two have
      // to be the same number or the animals are not where §4 prices them.
      assert.equal(
        beat.spawnAt!.depthM,
        faunaStatsFor(beat.species!).workingDepthM,
        `${beat.tag}: authored at ${beat.spawnAt!.depthM} m and held at its species’ own`
      );
    }
    const species = creatures.map((beat) => (beat.kind === 'creature' ? beat.species : undefined));
    assert.equal(species.filter((s) => s === FaunaSpecies.Hollow).length, 2);
    assert.equal(species.filter((s) => s === FaunaSpecies.Tetherjelly).length, 3);
    assert.equal(species.filter((s) => s === FaunaSpecies.Draymaw).length, 1);
    assert.equal(HOLLOW.workingDepthM, 1700, '§11: over the cleft’s 1,800');
    assert.equal(faunaStatsFor(FaunaSpecies.Tetherjelly).workingDepthM, 1200, '§11: the duct');
    assert.equal(DRAYMAW.workingDepthM, 900, '§11: the Foot’s side of the layer');
  });

  it('wakes the cleft at 15:00 and releases it at 15:30, with the depth on the beat', () => {
    const drive = beats.filter((beat) => beat.kind === 'creature' && beat.atTick === T(15));
    assert.equal(drive.length, 2, '§9: both Hollows off the walls');
    for (const beat of drive) {
      if (beat.kind !== 'creature') continue;
      assert.equal(beat.loud, true, '§9: the loud beat the close is measured from');
      assert.equal(beat.untilTick, T(15, 30), '§9: thirty seconds, and no beat releases them');
      // §13 (#349): a driven creature holds the commitment's depth, so the
      // beat says how deep it runs rather than leaving it to the species.
      assert.equal(beat.driveTo.depthM, HOLLOW.workingDepthM, '§9: 1,700 m, on the beat');
      assert.equal(beat.driveTo.y, 900, '§9: the throat’s centre');
      assert.equal(beat.spawnAt, undefined, 'the same animals, not two more');
    }
    assert.deepEqual(
      drive.map((beat) => (beat.kind === 'creature' ? beat.driveTo.x : 0)).sort(),
      [1900, 2100],
      '§9: a hundred metres either side of the road’s centre'
    );
    // §8: the telegraph is not owed to a conclusion and is paid anyway.
    const resolve = beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.kind === 'resolve' ? resolve.conclusion : undefined, true);
    assert.equal(
      (resolve.atTick - T(15)) / SIM.TICK_HZ,
      3 * MISSION.FAILURE_TELEGRAPH_S,
      '§8: three minutes ahead of the tide, against §10’s sixty seconds'
    );
  });

  it('sends the observer down the sill at 13:00, and never up it', () => {
    const move = beats.find((beat) => beat.kind === 'move')!;
    assert.equal(move.atTick, T(13), '§6: at 13:00 it moves');
    assert.equal(move.kind === 'move' ? move.tag : '', 'observer');
    assert.deepEqual(
      move.kind === 'move' ? [move.x, move.y, move.depthM] : [],
      [2000, 2950, 2400],
      '§6: from 2000, 2750 to 2000, 2950, at 2,400 m'
    );
    // §6's whole point about the transit, as geometry: it ends further from
    // every hull the player owns than it started. Nothing scripted on this map
    // ever approaches the day.
    const before = Math.hypot(SILL.x - GARDEN_MID.x, SILL.y - GARDEN_MID.y);
    const after = Math.hypot(BELOW.x - GARDEN_MID.x, BELOW.y - GARDEN_MID.y);
    assert.ok(after > before, '§6: down the sill, not up it');
    assert.equal(beats.filter((beat) => beat.kind === 'move').length, 1, '§6: one transit');
  });

  it('speaks §12’s voices, at §9’s ticks, in §9’s order', () => {
    assert.deepEqual(
      says.map((beat) => `${beat.atTick / SIM.TICK_HZ}:${beat.kind === 'say' ? beat.speaker : ''}`),
      [
        '0:The watch',
        '30:Tidespeaker Ysolde Marr',
        '180:Bloomwright Sefa Anholt',
        '300:The observer, for those below',
        '780:The watch',
        '930:The watch',
        '1080:Tidespeaker Ysolde Marr',
      ],
      '§9: the clock, and §12: the voices'
    );
    // §12, verbatim on the sentences the document argues about by name.
    const text = (tick: number) => {
      const beat = says.find((b) => b.atTick === tick)!;
      return beat.kind === 'say' ? beat.text : '';
    };
    assert.match(text(0), /Home can't hear it and it can't hear home/, '§12: the two maps');
    assert.match(
      text(T(0, 30)),
      /We're saying \*like\*\.$/,
      '§12: the coda refuses the imperative'
    );
    assert.match(text(T(3)), /Hear it a minute before anybody says anything about it/, '§12');
    assert.match(text(T(5)), /It has been heard since 205/, '§12: the passive doing the work');
    assert.match(text(T(15, 30)), /We're saying both are room\.$/, '§12: the hardest sentence');
    assert.match(text(T(18)), /^I opposed it\./, '§12: said aloud, and she should not');
  });

  it('hangs three beats on the sowing and one on the seed, in authored order', () => {
    const conditionals = SEEDING_DEEP_FURROW.conditionalBeats!;
    assert.equal(conditionals.length, 4, '§9: four beats fire on a condition');
    assert.deepEqual(
      conditionals.map((beat) => beat.kind),
      ['say', 'ground', 'say', 'say'],
      '§9: the seed’s step, the repaint, and two lines — one event heard three ways'
    );
    for (const beat of conditionals.slice(1)) {
      assert.deepEqual(beat.when, { kind: 'sound', count: 1 });
      assert.equal(beat.choiceGroup, undefined, '§9: no group — none of them retires another');
    }
    // Neither condition is true on the first pass, which is the trap a
    // conditional beat sets: `sound` is zero at tick zero, and the sower is at
    // the Foot rather than on the rock.
    assert.equal(tenders[0]!.tag, 'sower');
    assert.equal(tenders[0]!.x, 2000);
    assert.equal(tenders[0]!.y, 250);
    const second = region('second-furrow');
    assert.ok(tenders[0]!.y < second.y, 'the sower does not open standing in the second furrow');
  });
});

describe('the Furrow, as docs/mission-deep-furrow.md §11 paints it', () => {
  it('is a mission map, one seat, and not in the public catalogue', () => {
    assert.equal(ANHOLT_FURROW.seats, 1);
    assert.equal(mapById('anholt-furrow'), undefined, 'the skirmish screen would offer it');
    assert.equal(missionMapById('anholt-furrow'), ANHOLT_FURROW);
    assert.deepEqual(ANHOLT_FURROW.resources, [], '§11: the day earns nothing');
    assert.deepEqual(ANHOLT_FURROW.hazards, [], '§11: the weather is the walls');
    assert.equal(ANHOLT_FURROW.floorM, 1100, '§11: the base floor is the duct’s top');
  });

  it('restates the mission’s four regions on the map’s own rectangles', () => {
    // The mission regions are a second table and can drift from the map's; a
    // grant or a repaint on a rectangle that is not the ground it names would
    // rate or repaint water the document never described.
    const mapRegion = (index: number) => ANHOLT_FURROW.regions[index]!;
    for (const [id, index] of [
      ['the-foot', 1],
      ['standing-furrow', 5],
      ['second-furrow', 6],
    ] as const) {
      const mine = region(id);
      const theirs = mapRegion(index);
      assert.deepEqual(
        [mine.x, mine.y, mine.widthM, mine.heightM],
        [theirs.x, theirs.y, theirs.widthM, theirs.heightM],
        `${id}: the mission names a rectangle the map does not paint`
      );
    }
    // `the-furrows` is the only one that is not a map region: it is both
    // furrows together, so a day that slept in either reads the same.
    const both = region('the-furrows');
    assert.deepEqual(
      [both.x, both.y, both.widthM, both.heightM],
      [1250, 1750, 1500, 750],
      '§8, §11: both furrows, one answer'
    );
    assert.equal(both.widthM, region('standing-furrow').widthM + region('second-furrow').widthM);
    for (const r of SEEDING_DEEP_FURROW.regions) {
      for (const metres of [r.x, r.y, r.widthM, r.heightM]) {
        assert.equal(metres % ANHOLT_FURROW.cellM, 0, `${r.id}: off the 250 m cell grid`);
      }
    }
  });

  it('paints kelp on a trench floor and rock where the walls are', () => {
    near(
      terrain.propagationAt(GARDEN.x, GARDEN.y),
      PROPAGATION_FACTOR[Biome.KelpForest],
      0.001,
      '§11: a trench floor painted kelp, because seeded ground absorbs'
    );
    assert.equal(terrain.floorAt(GARDEN.x, GARDEN.y), 2200, '§11: a trench floor painted kelp');
    near(
      terrain.propagationAt(SOWING.x, SOWING.y),
      PROPAGATION_FACTOR[Biome.AbyssalTrench],
      0.001,
      '§11: bare rock at 00:00, and it carries like a trench'
    );
    assert.equal(terrain.floorAt(THROAT.x, THROAT.y), 1800, '§11: the cleft’s floor');
    assert.equal(terrain.floorAt(FOOT.x, FOOT.y), 900, '§11: the Foot’s');
    assert.equal(terrain.floorAt(SILL.x, SILL.y), 2600, '§11: the sill’s');
    // The walls, in the Fourth Trench's spelling: no depth is admitted at all.
    for (const x of [600, 3400]) {
      assert.equal(terrain.admits(x, 1500, 1700), false, '§11: solid — the cleft is the only road');
      assert.equal(terrain.admits(x, 1500, 100), false);
    }
    // §4: the descent is two legs because terrain never lowers a hull, and the
    // second leg is the one that arrives on ground that holds.
    assert.equal(requiredPressureRating(1750), 2, '§4: not 1,800 — the line is the Abyssal line');
    assert.equal(requiredPressureRating(1800), 3, '§4: and the cleft’s floor is exactly it');
    near((1750 - 900) / DEPTH.DESCENT_RATE_MPS, 18.9, 0.05, '§4: 18.9 s of loud at the mouth');
    assert.equal((2200 - 1750) / DEPTH.DESCENT_RATE_MPS, 10, '§4: and ten over the garden');
  });

  it('seats every hull in water its own rating admits, before any grant', () => {
    // `missions.test.ts` reads the hull alone, so the seating has to be legal
    // without the furrow's help — and the whole point of the mission is that
    // it stops being legal the moment the day dives.
    for (const party of SEEDING_DEEP_FURROW.parties) {
      for (const unit of party.units) {
        const rating = unit.pressureRating ?? statsFor(unit.kind).pressureRating;
        assert.ok(
          rating >= requiredPressureRating(unit.depthM),
          `${unit.tag}: crushes on the seat`
        );
        assert.ok(terrain.admits(unit.x, unit.y, unit.depthM), `${unit.tag}: seated in rock`);
      }
    }
    // And the claim that makes the mission: the same tenders, at the furrow's
    // depth, are one band short without the grant.
    for (const hull of tenders) {
      assert.equal(
        requiredPressureRating(2200) - HARVESTER.pressureRating,
        1,
        `${hull.tag}: one band short at 2,200 m, and the ground is the only thing that covers it`
      );
    }
    assert.ok(terrain.admits(2000, 2950, 2400), '§6: the observer’s 13:00 station');
    assert.ok(terrain.admits(1900, 900, 1700), '§9: where the Hollows are driven');
    assert.ok(terrain.admits(2100, 900, 1700));
  });
});

describe('the day, run out — docs/mission-deep-furrow.md §4, §8, §9', () => {
  /**
   * §5's three tasks, played: the dive, the sowing, and the night.
   *
   * The route is the document's own — down at the mouth, quiet down the
   * middle, down again over the garden — and the schedule is §4's clock: in
   * the garden by about two minutes, at the rock by about three, and standing
   * in the furrows from there to the tide.
   */
  function tenderEids(match: Match): number[] {
    return hulls(match.world).filter(
      (eid) => Owner.slot[eid] === PLAYER && Unit.kind[eid] === UnitKind.Harvester
    );
  }

  it('sows the second furrow, turns its water, rates its rock, and reads Complete', () => {
    const match = furrowMatch();
    const lines: { tick: number; speaker: string; text: string }[] = [];
    let sownAtTick = -1;
    let crushedAtSowing = 0;
    for (let tick = 0; tick <= T(18, 30); tick++) {
      const now = match.world.tick;
      const eids = tenderEids(match);
      if (now === T(0, 1)) for (const eid of eids) match.orderMove(PLAYER, eid, MOUTH.x, MOUTH.y);
      if (now === T(0, 12)) for (const eid of eids) match.orderDepth(PLAYER, eid, 1750);
      if (now === T(0, 40)) {
        for (const eid of eids) match.orderMove(PLAYER, eid, GARDEN_MID.x, GARDEN_MID.y);
      }
      // The second leg of the descent, taken inside the garden — which is the
      // only reason three PR-2 hulls survive it. The grant covers the whole
      // dive to 2,200 m, and the sower walks east from there.
      if (now === T(1, 30)) for (const eid of eids) match.orderDepth(PLAYER, eid, 2200);
      if (now === T(1, 50)) {
        // §4's walk: out from under the grant to the hold's near edge and no
        // further, because every metre east of x 2,250 is charged at four a
        // second. `tenderEids` is in spawn order, which is the order the
        // literal declares them in, so the first is the sower — and if it were
        // not, the sounding below would never complete.
        match.orderMove(PLAYER, eids[0]!, SOWING.x - 225, SOWING.y);
        match.orderMove(PLAYER, eids[1]!, 1700, 2125);
        match.orderMove(PLAYER, eids[2]!, 1900, 2050);
      }
      match.update(STEP_MS);
      const view = match.takeMissionView();
      for (const line of match.takeMissionLines()) {
        lines.push({ tick: line.tick, speaker: line.speaker, text: line.text });
      }
      const sown = view?.objectives.find((o) => o.id === 'sown');
      if (sownAtTick < 0 && sown?.status === ObjectiveStatus.Met) {
        sownAtTick = match.world.tick;
        crushedAtSowing = Pressure.unhealable[tenderEids(match)[0]!] ?? 0;
      }
      if (match.missionOver !== null) break;
    }

    const over = match.missionOver;
    assert.ok(over !== null, 'the tide never turned');
    assert.equal(match.world.tick, T(18), '§9: the tide turns at 18:00, however early the sowing');
    assert.ok(sownAtTick > 0, '§4: the sowing never completed');
    assert.ok(
      sownAtTick < T(5),
      `§9: the rock is reachable inside five minutes; took ${sownAtTick}`
    );

    // §4.3 — the ground beat, both halves, on the tick the hold completed.
    near(
      match.world.terrain.propagationAt(SOWING.x, SOWING.y),
      PROPAGATION_FACTOR[Biome.KelpForest],
      0.001,
      '§4: the water over the sown ground goes from carrying to absorbing'
    );
    const sower = tenderEids(match)[0]!;
    assert.equal(Pressure.bonus[sower], 1, '§4: and the rock now holds the hull standing on it');
    // The ledger stops when the grant lands and never heals. "On one tick" is
    // §4's phrase for the ground beat and it is true of the beat; the crush it
    // stops is charged at 60 Hz against a mission that passes at 5, so the
    // last thing the sower pays for is the fifth of a second between the hold
    // completing and the water being sown — 0.8 of a hull point, named here
    // rather than rounded away.
    const tail = (Pressure.unhealable[sower] ?? 0) - crushedAtSowing;
    const onePass =
      (crushAttritionPerSecond(HARVESTER.pressureRating, 2200) * (SIM.TICK_HZ / SIM.ECHO_HZ)) /
      SIM.TICK_HZ;
    assert.ok(
      tail >= 0 && tail <= onePass + 1e-3,
      `§4: the ledger stops with the sowing — it ran on for ${tail.toFixed(2)} against ${onePass}`
    );
    assert.ok(
      crushedAtSowing >= 4 * 55 && crushedAtSowing < HARVESTER.maxHp,
      `§4: the sowing is paid for in hull — the sower spent ${crushedAtSowing} of 300`
    );

    // §8 — both terminal rows met, and the count read at the tide.
    assert.equal(over!.outcome, MissionOutcome.Complete, '§8: two furrows, and people in both');
    const status = new Map(over!.objectives.map((o) => [o.id, o.status]));
    assert.equal(status.get('sown'), ObjectiveStatus.Met);
    assert.equal(status.get('tended'), ObjectiveStatus.Met, '§8: scored from 15:30 to the tide');
    assert.equal(status.get('the-day'), ObjectiveStatus.Met, '§8: three read, and sixteen aboard');
    assert.match(over!.epilogue, /^It's two furrows and there are people in both\./);
    assert.match(over!.epilogue, /Two furrows\. The second one sounds like the first one now/);
    assert.match(over!.epilogue, /Three\. Sixteen aboard, by household\./);

    // §9 and §12 — the clock's seven voices plus the four the day fired, and
    // Ottilie speaking before the sowing rather than after it.
    const spoken = lines.map((line) => line.speaker);
    assert.equal(spoken.filter((s) => s === 'The watch').length, 3, '§12: the watch, three times');
    assert.equal(spoken.filter((s) => s.startsWith('Bloomwright')).length, 2, '§5: Anholt, twice');
    assert.equal(
      spoken.filter((s) => s.startsWith('The observer')).length,
      2,
      '§6: twice, passive'
    );
    // The seed steps onto the rock before the sowing completes, and says so:
    // fired by the seed rather than by the clock, and by the load rather than
    // by a role the mission cannot spare (§9, §13).
    const ottilie = lines.find((line) => line.speaker.startsWith('Ottilie'));
    assert.ok(ottilie !== undefined, '§9: the seed stepped onto the rock and nobody said so');
    assert.ok(ottilie!.tick < sownAtTick, '§9: fired by the seed, not by the sowing');
    // And the three beats hung on the sowing itself: the repaint and two
    // lines, on one pass, in authored order. Matched by their own sentences
    // rather than by position, because Anholt also speaks at 03:00.
    const turnedAnholt = lines.find((line) => line.text.startsWith('There. The water'));
    const turnedObserver = lines.find((line) => line.text.startsWith('It is entered.'));
    assert.ok(turnedAnholt !== undefined && turnedObserver !== undefined, '§12: the furrow turned');
    assert.equal(turnedAnholt!.tick, turnedObserver!.tick, '§9: one event, heard three ways');
    assert.equal(turnedAnholt!.tick, sownAtTick, '§9: on the pass the hold completed');
  });

  it('reads the rock still bare when nobody goes down, and never as a failure', () => {
    // §8's Lost: no sowing and nobody below. The day is read where it stands
    // and the mission closes as a conclusion — Deep Furrow cannot be failed on
    // a clock, and the reading says the ledger rather than the loss.
    const match = furrowMatch();
    for (let tick = 0; tick <= T(18, 30); tick++) {
      match.update(STEP_MS);
      match.takeMissionView();
      if (match.missionOver !== null) break;
    }
    const over = match.missionOver!;
    assert.equal(match.world.tick, T(18));
    assert.equal(over.outcome, MissionOutcome.Lost, '§8: neither row');
    assert.match(over.epilogue, /^The rock's still bare and the garden's empty tonight\./);
    // And the neutrality guard: three hulls came home, and the count of people
    // prints beneath the Lost without touching it (§8).
    assert.match(over.epilogue, /Three\. Sixteen aboard, by household\./);
    const status = new Map(over.objectives.map((o) => [o.id, o.status]));
    assert.equal(status.get('the-day'), ObjectiveStatus.Met);
    assert.equal(status.get('tended'), ObjectiveStatus.Pending, '§8: nobody slept below');
  });
});
