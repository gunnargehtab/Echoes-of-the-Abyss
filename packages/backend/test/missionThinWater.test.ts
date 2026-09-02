/**
 * The Second Seeding 2, read and run — docs/mission-thin-water.md.
 *
 * `missions.test.ts` holds every mission to §10's conventions; this file holds
 * Thin Water to the things only its own document claims. Five of them are
 * worth the fourteen simulated minutes each:
 *
 * - **The escort hold is the teaching load** (§4). Ten tenders stop when the
 *   escorts leave, and they stop without a beat, a line or a status change —
 *   which is the mission's own argument that leaving is an action with a cost.
 * - **The count is hulls and the reading is people** (§8). The souls are
 *   authored per hull and the terminal predicate does not look at them, so six
 *   home is thirty-one people or fifty and the count is the same in both runs.
 * - **The countdown is made of sounds stopping** (§7). Seven housings, ends
 *   thirty seconds apart from the east, and the last one sixty seconds before
 *   the closure — campaign.md §10 paid by subtraction rather than by an alarm,
 *   which the generic telegraph test cannot see because it measures `loud`
 *   creature beats and this mission has none.
 * - **§8's three results are three results** (§8), including the Partial rung
 *   that a single terminal row could not have produced.
 * - **The challenge is fired by being heard** (§6, §9), and — the row §13 got
 *   wrong and this PR corrects — by the corridor entire rather than by its
 *   escort alone. The frame's turrets listen, and they out-hear the Corvettes
 *   standing off it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  MISSION,
  MissionOutcome,
  PROPAGATION_FACTOR,
  ResolutionTier,
  SIM,
  UnitKind,
  detectionRatio,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { KELL_SHOULDER, mapById, missionMapById } from '../src/sim/maps/index.ts';
import {
  MissionRuntime,
  SEEDING_THIN_WATER,
  type MissionCommandSink,
} from '../src/sim/missions/index.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { createSimWorld } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = SEEDING_THIN_WATER.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** §11 — the extraction region's middle, where the count is taken. */
const THE_GATE = { x: 750, y: 125 };
/**
 * The south road, clear of the frame's guns.
 *
 * §5 stands two Sentinel Turrets on the tension frame at y = 1,500 and a
 * turret reaches 700 m, so a column that runs west along y ≈ 2,100 is inside
 * their envelope for two kilometres and loses most of itself crossing. These
 * two legs hold 900 m and better off the frame, which is the mission being
 * played rather than driven through.
 */
const THE_SOUTH_ROAD = [
  { x: 2100, y: 2400 },
  { x: 800, y: 2100 },
];
/**
 * Rell speaks four times and three of them are procedure on the clock (§5).
 * Only the challenge is on the open channel, so the speaker is what tells the
 * condition-fired beat apart from the scheduled ones.
 */
const CHALLENGER = 'Corridor Warden Anse Rell, on the open channel';

/** Nothing on this mission's conditional list gives an order, so nothing lands here. */
const SINK: MissionCommandSink = {
  applyMove: () => {},
  applyDepth: () => true,
  applySilent: () => {},
  applyPing: () => {},
};

const tenderTags = (): string[] =>
  SEEDING_THIN_WATER.parties
    .filter((party) => party.slot === PLAYER)
    .flatMap((party) => party.units)
    .filter((unit) => unit.role === 'tender')
    .map((unit) => unit.tag);

function thinWaterMatch(seed = 11): Match {
  const map = missionMapById(SEEDING_THIN_WATER.mapId)!;
  return new Match(map, { mission: SEEDING_THIN_WATER, fauna: false, seed });
}

interface Run {
  outcome: MissionOutcome;
  epilogue: string;
  resolvedAtTick: number;
  lines: string[];
  lastSnapshot: EchoSnapshot;
}

/**
 * Run the mission out, letting `drive` give orders on the Echo ticks it wants.
 *
 * Orders go in on Echo ticks rather than every sim tick because that is the
 * cadence the player's own snapshot arrives at, and driving off a snapshot the
 * server has not sent yet would be a test playing a game nobody can play.
 */
function runOut(match: Match, drive?: (own: EchoSnapshot, match: Match) => void): Run {
  let last: EchoSnapshot | undefined;
  const lines: string[] = [];
  for (let tick = 0; tick <= T(14, 30); tick++) {
    const snapshots = match.update(STEP_MS);
    const own = snapshots?.get(PLAYER);
    if (own !== undefined) {
      last = own;
      drive?.(own, match);
    }
    match.takeMissionView();
    for (const line of match.takeMissionLines()) lines.push(line.speaker);
    if (match.missionOver !== null) break;
  }
  const over = match.missionOver;
  assert.ok(over !== null, 'the count was never read');
  assert.ok(last !== undefined, 'the column never resolved');
  return {
    outcome: over.outcome,
    epilogue: over.epilogue,
    resolvedAtTick: match.world.tick,
    lines,
    lastSnapshot: last,
  };
}

/**
 * A player snapshot holding nothing but the one fact the `tolerance` predicate
 * reads: how well somebody else currently has the force.
 */
function heardAs(tick: number, tier: ResolutionTier): EchoSnapshot {
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
    exposure: { tier, trackedCount: tier >= ResolutionTier.Bearing ? 1 : 0 },
    selfEvents: [],
    draw: { rate: 0, sources: [] },
    driftHealth: [],
    marks: [],
  } as unknown as EchoSnapshot;
}

/** Order every hull the player still holds along a route, once. */
function sendAll(
  own: EchoSnapshot,
  match: Match,
  route: readonly { x: number; y: number }[]
): void {
  for (const unit of own.units) {
    route.forEach((leg, index) => match.orderMove(PLAYER, unit.id, leg.x, leg.y, index > 0));
  }
}

/**
 * Play the mission the way §4 says it has to be played: the escorts keep
 * station on the column instead of outrunning it.
 *
 * A Corvette makes 85 m/s and a loaded Harvester 40, so a single order to a
 * far waypoint separates them inside twenty seconds and the hold strands the
 * freight — which is the previous test, and is also why a drive that wants to
 * reach the gate has to re-order the escorts onto the column every pass.
 * `carry` is which tenders are going; the rest are left where the mission
 * seated them.
 */
function shepherd(
  route: readonly { x: number; y: number }[],
  carry = 10
): (own: EchoSnapshot, match: Match) => void {
  let leg = 0;
  // The carried hulls are chosen once, by id. Re-picking "the first three
  // Harvesters" every pass would silently promote a tender left at the face
  // into the column the moment one of the three died, and the escorts would
  // turn round to keep station on a hull that was never going.
  let carried: Set<number> | null = null;
  return (own, match) => {
    if (carried === null) {
      carried = new Set(
        own.units
          .filter((unit) => unit.kind === UnitKind.Harvester)
          .slice(0, carry)
          .map((unit) => unit.id)
      );
    }
    const tenders = own.units.filter((unit) => carried!.has(unit.id));
    const escorts = own.units.filter((unit) => unit.kind === UnitKind.Corvette);
    if (tenders.length === 0) return;
    const cx = tenders.reduce((a, unit) => a + unit.x, 0) / tenders.length;
    const cy = tenders.reduce((a, unit) => a + unit.y, 0) / tenders.length;
    const here = route[Math.min(leg, route.length - 1)]!;
    if (leg < route.length - 1 && Math.hypot(cx - here.x, cy - here.y) < 250) leg += 1;
    const target = route[Math.min(leg, route.length - 1)]!;
    for (const tender of tenders) match.orderMove(PLAYER, tender.id, target.x, target.y, false);
    // The escorts hold the column's own water. Forward of it is §4's first
    // decision and not a test's to make.
    for (const escort of escorts) match.orderMove(PLAYER, escort.id, cx, cy, false);
  };
}

describe('the Kell Shoulder, as docs/mission-thin-water.md §11 paints it', () => {
  it('is thin water, and that is the whole argument', () => {
    // §1's table is arithmetic over a shipped constant rather than a proposal:
    // the shoulder is Open Water, Open Water is PF 1.0, and a loaded tender at
    // 18 therefore reaches a listener as 18 rather than as the 9.9 the
    // Commune's entire economy is quoted at. Asserted against the constant so
    // that a biome re-tune would fail here, where the mission's argument is,
    // rather than silently change what the mission is about.
    const shoulder = KELL_SHOULDER.regions[0]!;
    assert.equal(shoulder.biome, Biome.OpenWater, '§11: the Shoulder is painted first, and bare');
    assert.equal(PROPAGATION_FACTOR[Biome.OpenWater], 1.0, '§1: nothing is taken back');
    assert.equal(PROPAGATION_FACTOR[Biome.KelpForest], 0.55, "§1: the gardens' 45%");
    assert.equal(
      18 * PROPAGATION_FACTOR[Biome.KelpForest],
      9.9,
      '§1: the number home is quoted at'
    );
  });

  it('transcribes §11 row for row, on the cell grid, in the table order', () => {
    // The document's table, verbatim, in the order it reads — painting order is
    // load-bearing (`terrainFor` writes later regions over earlier ones), and
    // §11 says the Shoulder is painted first and everything else is cut into it.
    assert.deepEqual(
      KELL_SHOULDER.regions.map((region) => [
        region.x,
        region.y,
        region.widthM,
        region.heightM,
        region.biome,
        region.floorM,
      ]),
      [
        [0, 0, 5000, 3000, Biome.OpenWater, 340],
        [0, 1250, 5000, 500, Biome.OpenWater, 420],
        [0, 2500, 5000, 500, Biome.AbyssalTrench, 900],
        [1750, 1750, 1000, 750, Biome.ThermalVein, 620],
        [3750, 1750, 1250, 750, Biome.KelpForest, 300],
        [0, 250, 2000, 750, Biome.KelpForest, 280],
        [250, 0, 1000, 250, Biome.KelpForest, 260],
      ]
    );
    for (const region of KELL_SHOULDER.regions) {
      for (const metres of [region.x, region.y, region.widthM, region.heightM]) {
        assert.equal(metres % KELL_SHOULDER.cellM, 0, `${region.note}: off the 250 m cell grid`);
      }
    }
    assert.equal(KELL_SHOULDER.floorM, 340, '§11: base floor 340');
    assert.deepEqual(
      KELL_SHOULDER.spawns.map((s) => [s.x, s.y]),
      [[4375, 2125]],
      '§11: one spawn'
    );
    assert.deepEqual(KELL_SHOULDER.resources, [], '§11: no nodule fields and no crystal');
    assert.deepEqual(KELL_SHOULDER.hazards, [], '§11: the weather is other people');
  });

  it('keeps the quiet way below the corridor rather than beside it', () => {
    // §11's Vent Under-run is the map's one mask and its whole point is that
    // it is a *detour in depth*: 0.45 water, 280 m below the shoulder's own
    // floor, and 200 m below the spur it runs under. A vent painted level with
    // the corridor would be a free route rather than a priced one.
    const spurFloor = KELL_SHOULDER.regions[1]!.floorM!;
    const ventFloor = KELL_SHOULDER.regions[3]!.floorM!;
    assert.equal(KELL_SHOULDER.regions[3]!.biome, Biome.ThermalVein);
    assert.equal(PROPAGATION_FACTOR[Biome.ThermalVein], 0.45, "§1: the map's one mask");
    assert.equal(ventFloor - KELL_SHOULDER.floorM!, 280, '§11: 280 m down off the shoulder');
    assert.ok(ventFloor > spurFloor, '§11: the quiet way is the deep way');
  });

  it('is a mission map and is not in the public catalogue', () => {
    assert.equal(KELL_SHOULDER.seats, 1, '§11: one seat, not balanced');
    assert.equal(mapById('kell-shoulder'), undefined, 'the skirmish screen would offer it');
    assert.equal(missionMapById('kell-shoulder'), KELL_SHOULDER, 'resolved by mission id only');
  });
});

describe('the column, as docs/mission-thin-water.md §3 loads it', () => {
  const player = SEEDING_THIN_WATER.parties.find((party) => party.slot === PLAYER)!;

  it('carries sixty-eight people in ten uneven parcels', () => {
    const souls = player.units
      .filter((unit) => unit.role === 'tender')
      .map((unit) => unit.souls ?? 0);
    assert.deepEqual(souls, [4, 6, 9, 5, 7, 3, 11, 6, 8, 9], '§3, in the document’s order');
    assert.equal(
      souls.reduce((a, b) => a + b, 0),
      68,
      '§9, 01:30: ten hulls, sixty-eight aboard, and you do not round it'
    );
  });

  it('prices six hulls at thirty-one people or at fifty, which is the order of march', () => {
    // §8's argument for the whole arrangement, as arithmetic: the terminal
    // count is six *hulls* and does not read `souls` at all, so the same
    // result is two different evenings. If this ever came out equal, the
    // mission would have become a scoreboard.
    const souls = player.units
      .filter((unit) => unit.role === 'tender')
      .map((unit) => unit.souls ?? 0);
    const ascending = [...souls].sort((a, b) => a - b);
    const worst = ascending.slice(0, 6).reduce((a, b) => a + b, 0);
    const best = ascending.slice(4).reduce((a, b) => a + b, 0);
    assert.equal(worst, 31, '§8: six hulls out is thirty-one people');
    assert.equal(best, 50, '§8: or it is fifty');
  });

  it('grows two hulls that can shoot, and arms nothing else', () => {
    const armed = player.units.filter((unit) => unit.armed === true);
    assert.deepEqual(
      armed.map((unit) => unit.tag),
      ['escort-one', 'escort-two'],
      '§3: two escorts, and the whole of what the Commune fields as armament'
    );
    for (const escort of armed) {
      assert.equal(escort.kind, UnitKind.Corvette, '§3: a Corvette hull, Commune-grown');
      assert.equal(escort.pressureRating, 2, '§3: PR-2');
    }
    for (const tender of player.units.filter((unit) => unit.role === 'tender')) {
      assert.equal(tender.kind, UnitKind.Harvester, '§3: the harvester hull');
      assert.equal(tender.pressureRating, 1, '§3: PR-1, so the vent is a price and not a mask');
    }
  });

  it('gives the watch no role at all, because §8 declines to grade it', () => {
    // Two Light Scouts sent east to be heard is §4's fourth decision and an
    // unhinted one. A role would put them in a counter — `escort` would let
    // them satisfy the hold and delete §4 outright, `tender` would put them in
    // the count — so they carry neither, and no objective names them.
    const watch = player.units.filter((unit) => unit.kind === UnitKind.LightScout);
    assert.equal(watch.length, 2, '§3: two watch scouts');
    for (const scout of watch) assert.equal(scout.role, undefined, '§8: graded in no direction');
  });

  it('leaves Silent Running present and unfenced, and locks the ping', () => {
    // §3: the button works, it works perfectly, and it is simply not what is
    // being asked. Fencing it would make the mission's point for the player.
    const locked = new Set(SEEDING_THIN_WATER.locks.map((lock) => lock.ability));
    assert.ok(locked.has('activeSonar'), 'campaign.md §10 withholds the ping until mission 3');
    assert.ok(locked.has('construction'), '§3: nothing to build with and nothing to build it on');
    assert.ok(!locked.has('weapons'), '§3: the escorts are armed');
    assert.equal(
      SEEDING_THIN_WATER.silenceCeilingSig,
      100,
      '§3: nobody lends this column an order'
    );
    assert.equal(SEEDING_THIN_WATER.arrayTag, undefined, 'no array, so no ledger');
    assert.equal(SEEDING_THIN_WATER.sigBudget, 30, '§4 and §9: thirty, a ceiling');
  });
});

describe('the objective, as docs/mission-thin-water.md §8 chooses it', () => {
  const byId = (id: string) => SEEDING_THIN_WATER.objectives.find((o) => o.id === id)!;

  it('counts hulls at the gate, and counts nothing else', () => {
    const column = byId('column');
    assert.deepEqual(column.predicate, {
      kind: 'extract',
      role: 'tender',
      region: 'holdfast-gate',
      count: 6,
    });
    // §8, three times over: no `loaded` flag, no `deliver` row, and no lift
    // anywhere in the mission. A tender that arrives empty is a tender that
    // arrived, and what the column banked is never a rung on the ladder.
    assert.equal(SEEDING_THIN_WATER.lifts, undefined, '§8: the harvest is not counted at all');
    for (const objective of SEEDING_THIN_WATER.objectives) {
      const predicate = objective.predicate;
      assert.notEqual(predicate.kind, 'deliver', '§8: the nodule predicate is not used');
      if (predicate.kind === 'extract') {
        assert.equal(
          predicate.loaded,
          undefined,
          '§8: no loaded flag, or the harvest is the mission'
        );
      }
    }
  });

  it('authors the middle rung §8 tabulates, which one terminal row cannot reach', () => {
    // `runtime.ts` reads the ladder off how many *terminal* objectives were
    // met: all of them is Complete, none is Lost, and some is Partial. §8's
    // Results table has three rows — six or more, one to five, none — so it
    // needs two terminal rows, exactly as Sorrowgate's count of fourteen needs
    // its two. The ask the player is given is still six.
    const terminal = SEEDING_THIN_WATER.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => (o.predicate.kind === 'extract' ? o.predicate.count : NaN)),
      [6, 1],
      '§8: six is the column, and one is the floor of the middle rung'
    );
    for (const objective of terminal) {
      assert.notEqual(objective.keystone, true, '§8 names no identity: any six will do');
    }
  });

  it('hangs both further readings off their own non-terminal objectives', () => {
    const allTen = byId('all-ten');
    const escorts = byId('escorts');
    assert.notEqual(allTen.terminal, true, '§8: unmet in almost every run, and decides nothing');
    assert.notEqual(escorts.terminal, true, '§8: the escorts exist to be spent');
    assert.deepEqual(escorts.predicate, { kind: 'survive', role: 'escort', count: 2 });
    for (const objective of [allTen, escorts]) {
      assert.ok(
        objective.reading !== undefined,
        `${objective.id}: prints nothing beneath the count`
      );
      assert.ok(objective.reading.met.trim().length > 0);
      assert.ok(objective.reading.unmet.trim().length > 0);
    }
    assert.match(escorts.reading!.unmet, /eleven minutes/, '§8: the line the campaign is about');
  });

  it('reads all three of Marr’s results, and never calls the middle one a failure', () => {
    assert.match(SEEDING_THIN_WATER.epilogue[MissionOutcome.Complete], /^Six was the number/);
    assert.match(SEEDING_THIN_WATER.epilogue[MissionOutcome.Partial], /^Fewer than we agreed/);
    assert.match(SEEDING_THIN_WATER.epilogue[MissionOutcome.Partial], /This is a result/);
    assert.match(SEEDING_THIN_WATER.epilogue[MissionOutcome.Lost], /^The count is nobody/);
  });
});

describe('the countdown, as docs/mission-thin-water.md §7 builds it', () => {
  const housings = SEEDING_THIN_WATER.parties.flatMap((party) => party.emitters ?? []);

  it('is seven housings going out from the east, one at a time', () => {
    assert.equal(housings.length, 7, '§7: seven pump housings along the corridor');
    // East to west, in authored order, and each one ends thirty seconds after
    // the one before it — §9's "09:00-11:30, at a walking pace".
    const xs = housings.map((emitter) => emitter.x);
    assert.deepEqual(xs, [4800, 4200, 3600, 3000, 2400, 1800, 1200], '§7: east to west');
    assert.deepEqual(
      housings.map((emitter) => emitter.untilTick),
      [T(9), T(9, 30), T(10), T(10, 30), T(11), T(11, 30), T(12)],
      '§9: the first at 09:00 and one every thirty seconds after it'
    );
    for (const emitter of housings) {
      assert.equal(emitter.fromTick, undefined, '§7: from 00:00 the player hears the corridor');
    }
    // §7: "struck on its own schedule". Emitters have no per-emitter phase, so
    // seven housings on one period would sound as one machine, and the rhythm
    // that runs east to west would be a single beat instead.
    assert.ok(
      new Set(housings.map((emitter) => emitter.periodTicks)).size > 1,
      '§7: seven machines on one schedule is one machine'
    );
  });

  it('pays campaign.md §10’s sixty seconds by subtraction rather than by an alarm', () => {
    // The generic telegraph test in `missions.test.ts` measures the gap between
    // the last `loud` creature beat and the close, and this mission closes as a
    // conclusion with no loud beat at all — §8: "the mission is not failed on a
    // timer and does not end on one". The failure it *does* have is the closure
    // at 13:00, and its warning is a machine stopping. So §10 is measured here,
    // where this mission actually spends it.
    const last = SEEDING_THIN_WATER.parties
      .flatMap((party) => party.emitters ?? [])
      .reduce((latest, emitter) => Math.max(latest, emitter.untilTick ?? 0), 0);
    const closure = SEEDING_THIN_WATER.beats.find(
      (beat) =>
        beat.kind === 'say' && beat.speaker.startsWith('Corridor Warden') && beat.atTick === T(13)
    );
    assert.ok(closure !== undefined, '§9: the corridor closes at 13:00');
    assert.equal(last, T(12), '§9: the last housing before the crossing goes quiet at 12:00');
    assert.equal(
      (closure.atTick - last) / SIM.TICK_HZ,
      MISSION.FAILURE_TELEGRAPH_S,
      '§8: sixty seconds, and that is the whole warning'
    );
    // Nothing announces it, which is the other half of §7's claim: no beat
    // fires at the same tick as the last housing's silence.
    assert.ok(
      !SEEDING_THIN_WATER.beats.some((beat) => beat.kind === 'say' && beat.atTick === T(12)),
      '§7: nothing announces it and nothing labels it'
    );
  });

  it('closes as a conclusion, because every one of §8’s results is a reading', () => {
    const resolve = SEEDING_THIN_WATER.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.atTick, T(14), '§9: the count is read at 14:00');
    assert.equal(resolve.conclusion, true, '§8: the mission does not end on a timer');
    for (const beat of SEEDING_THIN_WATER.beats) {
      if (beat.kind !== 'creature') continue;
      assert.equal(
        beat.loud,
        false,
        '§9: the pack arrives after the exchange, not before the close'
      );
    }
  });
});

describe('the challenge, and who is actually listening — §6, §9, §13', () => {
  it('is four minutes of Bearing, cumulative, and closes nothing', () => {
    const conditionals = SEEDING_THIN_WATER.conditionalBeats ?? [];
    assert.equal(conditionals.length, 1, '§9: one beat fired by exposure rather than by the clock');
    const challenge = conditionals[0]!;
    assert.equal(challenge.kind, 'say', '§12: Rell asks a bearing for an asset number');
    assert.deepEqual(challenge.when, {
      kind: 'tolerance',
      ticks: T(4),
      tier: ResolutionTier.Bearing,
    });
    assert.match(
      challenge.kind === 'say' ? challenge.text : '',
      /second time of asking/,
      '§12, verbatim'
    );
  });

  it('is heard by the corridor entire, which is what makes the literal honest', () => {
    // §13 used to say the `tolerance` condition was honest "only because the
    // corridor's escort is the only listener authored on this map". It never
    // was: `spawnStructure` grants `Acoustic`, `echoLayer.ts` queries
    // [Position, Acoustic, Owner, Health], and §5 stands two Sentinel Turrets
    // on the tension frame. What is true — and what §13 now says — is that
    // every listener on this map belongs to the corridor, so "heard" and
    // "heard by the corridor" are the same fact.
    const scripted = SEEDING_THIN_WATER.parties.filter((party) => party.slot !== PLAYER);
    assert.ok(scripted.length > 0);
    for (const party of scripted) {
      assert.equal(
        party.faction,
        SEEDING_THIN_WATER.parties.find((p) => p.slot !== PLAYER)!.faction,
        'a second navy on this map would make the condition mean something else'
      );
      assert.notEqual(party.faction, SEEDING_THIN_WATER.playerFaction);
    }
    const turrets = scripted.flatMap((party) => party.structures ?? []);
    assert.equal(turrets.length, 2, '§5: two Sentinel Turrets on the tension frame');
  });

  it('is answered by the frame before the hulls standing off it', () => {
    // The measurement §13's correction rests on. Through PF 1.0, a loaded
    // tender at SIG 18 stands at Bearing to a turret's HYD 55 further out than
    // to a Corvette's HYD 50 — so the works party's turrets, which sit *on*
    // the corridor rather than off it, are the corridor's first ears.
    const bearingRange = (hyd: number): number => {
      let low = 1;
      let high = 20000;
      for (let i = 0; i < 60; i++) {
        const mid = (low + high) / 2;
        if (detectionRatio(18, 1.0, mid, hyd) >= 1.5) low = mid;
        else high = mid;
      }
      return Math.round(low);
    };
    const turret = bearingRange(55);
    const corvette = bearingRange(50);
    const cruiser = bearingRange(65);
    assert.equal(turret, 1663, 'the frame hears a loaded tender at Bearing to 1,663 m');
    assert.equal(corvette, 1566, 'a Corvette to 1,566 m');
    assert.equal(cruiser, 1846, 'the Cruiser to 1,846 m');
    assert.ok(turret > corvette, '§13: the turrets out-hear the Corvettes standing off the frame');
  });

  it('does not fire on a column that stays out of the corridor’s ears', () => {
    // The condition is the player's own exposure tally and not a trigger
    // volume (§9), so a column that never moves is never challenged — and the
    // literal opens with nothing on the map holding it at Bearing, which is
    // what keeps the beat a fact about how the mission was played.
    const match = thinWaterMatch();
    for (let tick = 0; tick <= T(5); tick++) {
      const own = match.update(STEP_MS)?.get(PLAYER);
      if (own === undefined) continue;
      assert.equal(own.exposure.tier, ResolutionTier.Silent, `heard at rest, on tick ${tick}`);
      match.takeMissionView();
      const spoke = match.takeMissionLines().map((line) => line.speaker);
      assert.ok(!spoke.includes(CHALLENGER), 'Rell challenged a column nobody had heard');
    }
  });

  it('fires on the pass that enters the two hundred and fortieth second', () => {
    // Driven at the runtime, the way `missionExposure.test.ts` drives the same
    // mechanism, and for a reason this mission found the hard way: a live
    // `Match` seats only the player's slot (`MissionRuntime.install` calls
    // `seat` once), so the Echo Layer never resolves *for* a scripted party
    // and `ExposureReport` stays Silent however close the corridor gets. That
    // is a runtime gap and not this literal's — it holds Aptitude's and
    // Tolerance's conditionals shut in exactly the same way, and it is filed
    // as #323 — so what is asserted here is what this mission owns: that
    // Rell's challenge is keyed to
    // four minutes of Bearing and arrives on the pass that spends the last of
    // them, not one pass late.
    const runtime = new MissionRuntime(SEEDING_THIN_WATER);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    const interval = SIM.TICK_HZ / SIM.ECHO_HZ;
    const passes = T(4) / interval;
    const lines: string[] = [];
    let firedOn = -1;
    for (let pass = 1; pass <= passes + 5; pass++) {
      world.tick = pass * interval;
      runtime.tick(world, SINK, heardAs(world.tick, ResolutionTier.Bearing));
      for (const line of runtime.takeLines()) {
        if (line.speaker !== CHALLENGER) continue;
        lines.push(line.text);
        if (firedOn < 0) firedOn = pass;
      }
    }
    assert.equal(lines.length, 1, '§9: the challenge is an event, and it happens once');
    assert.equal(
      firedOn,
      passes,
      'the challenge did not land on the pass that spent the fourth minute'
    );
    assert.match(lines[0]!, /asset number and a charter reference/, '§12, verbatim');
  });

  it('does not fire for a column heard only as a smudge', () => {
    // §6 is precise that the corridor's reading is Tier 2 and that the
    // challenge is what a bearing inside a closure buys. A column the corridor
    // can hear and cannot place is not challenged.
    const runtime = new MissionRuntime(SEEDING_THIN_WATER);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    const interval = SIM.TICK_HZ / SIM.ECHO_HZ;
    for (let pass = 1; pass <= (T(4) / interval) * 2; pass++) {
      world.tick = pass * interval;
      runtime.tick(world, SINK, heardAs(world.tick, ResolutionTier.Contact));
      const spoke = runtime.takeLines().filter((line) => line.speaker === CHALLENGER);
      assert.deepEqual(spoke, [], 'a smudge was challenged');
    }
  });
});

describe('withdrawal under contact, run out — docs/mission-thin-water.md §4, §8', () => {
  it('stops the tenders the moment the escorts are out of radius', () => {
    // §4, and the lesson lands as a UI event rather than as a line of
    // dialogue: the tenders are ordered to the same place as everybody else,
    // the escorts outrun them at 85 m/s against 40, and ten hulls quietly stop.
    const match = thinWaterMatch();
    let sent = false;
    let frozen: { x: number; y: number }[] = [];
    let moved = 0;
    for (let tick = 0; tick <= T(3); tick++) {
      const own = match.update(STEP_MS)?.get(PLAYER);
      if (own === undefined) continue;
      if (!sent && own.tick > SIM.TICK_HZ) {
        sendAll(own, match, [THE_GATE]);
        sent = true;
      }
      match.takeMissionView();
      const tenders = own.units.filter((unit) => unit.kind === UnitKind.Harvester);
      const escorts = own.units.filter((unit) => unit.kind === UnitKind.Corvette);
      if (escorts.length === 0 && tenders.length > 0) {
        const here = tenders.map((unit) => ({ x: unit.x, y: unit.y }));
        if (frozen.length === tenders.length) {
          moved += here.filter(
            (position, index) =>
              Math.hypot(position.x - frozen[index]!.x, position.y - frozen[index]!.y) > 1
          ).length;
        }
        frozen = here;
      }
    }
    assert.ok(frozen.length > 0, 'the escorts never left the column behind');
    assert.equal(moved, 0, '§4: a tender moves only while an escort is within the radius');
  });

  it('reads six home as the column, and closes the moment it is', () => {
    const run = runOut(thinWaterMatch(), shepherd([...THE_SOUTH_ROAD, THE_GATE]));
    assert.equal(run.outcome, MissionOutcome.Complete, '§8: six or more through the gate');
    assert.match(run.epilogue, /^Six was the number/);
    assert.ok(
      run.resolvedAtTick < T(14),
      '§8: terminal at six — the count does not wait for 14:00'
    );
  });

  it('reads a short count as a result, on the Partial rung §8 names', () => {
    // Five tenders and both escorts go; the other five cannot follow, because
    // §4's rule is what strands them — five is one short of the column, so the
    // run reaches 14:00 and Marr reads the
    // middle row: a result, and the mission says so out loud.
    const going = tenderTags().slice(0, 5);
    assert.equal(going.length, 5, 'five of ten go, and §4 is what strands the rest');
    const run = runOut(thinWaterMatch(), shepherd([...THE_SOUTH_ROAD, THE_GATE], 5));
    assert.equal(run.outcome, MissionOutcome.Partial, '§8: one to five is some of the column');
    assert.match(run.epilogue, /This is a result/);
    assert.equal(run.resolvedAtTick, T(14), '§9: the count is read at 14:00');
  });

  it('reads a column that never left as nobody, and still reads it aloud', () => {
    const run = runOut(thinWaterMatch());
    assert.equal(run.outcome, MissionOutcome.Lost, '§8: no tender at the gate');
    assert.match(run.epilogue, /^The count is nobody/);
    assert.equal(run.resolvedAtTick, T(14));
    // Even the empty count is a reading rather than a fail screen — the whole
    // reason the close is authored as a conclusion.
    assert.match(run.epilogue, /sit with the names until morning/);
  });
});
