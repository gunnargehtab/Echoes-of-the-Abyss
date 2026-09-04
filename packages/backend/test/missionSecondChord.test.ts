/**
 * The Second Chord 7, read — docs/mission-second-chord.md.
 *
 * `missions.test.ts` holds every mission to §10's conventions; this file holds
 * the campaign's ending to the things only its own document claims, and to the
 * five a reader of the table cannot check by reading it:
 *
 * - **The rim is inherited, to the metre** (§5, §11). The Directorate's seats,
 *   the plateaus' two, the attendants and the basin's line are *The Rim
 *   Deposits*' and Prospect's, so they are asserted against
 *   `CHORD_RIM_DEPOSITS` rather than against numbers typed twice. The day one
 *   of those literals moves a coordinate, this is what says so.
 * - **The arithmetic is the shipped model** (§4, §6, §7). Every range in §7's
 *   two tables, every crush figure in §4, every second in §6 and §9 and every
 *   distance in §1 and §8 is recomputed here from the authored seats against
 *   `detectionRatio`, `crushAttritionPerSecond` and the roster. Not one of them
 *   moved: the document arrived correct to the metre, and the assertions below
 *   are what says so rather than a claim in a comment.
 * - **The rim is weapons-cold, and that is a format finding rather than a
 *   softening** (§4, §5, §13). Played armed, this mission ends in the first
 *   minute — `combat.ts` auto-acquires the nearest hostile thing carrying
 *   `Position`, `Owner` and `Health`, a structure carries all three, and the
 *   watch stands 206 m from a 1,800 HP Sounding Spire with a 650 m gun. The
 *   case below plays the opening out and asserts the node is untouched, and
 *   the one after it asserts why that matters: the keystone's own water is
 *   inside the node's grant, and a PR-2 carrier is rated for 3,000 m only
 *   because the node says so.
 * - **The tide has to run its length, and it is played out twice** (§8, §9).
 *   Once with nobody driving — Lost on the keystone, and every beat still
 *   fired — and once played to Complete with the crystal set under the node,
 *   the lattice spent at sixteen and the tone held for thirty seconds.
 * - **The tone has no depth and the keystone has no depth** (§6, §8, §13). The
 *   played run holds the tone at 1,750 m, twelve hundred and fifty metres above
 *   where §6 asks for it, and latches the keystone from the transit depth with
 *   the node idle at thirty. Both are `depthMaxM?`'s absence, demonstrated
 *   rather than asserted about.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  DEPTH,
  ECHO_MARKS,
  Faction,
  FaunaSpecies,
  MISSION,
  MissionOutcome,
  ObjectiveStatus,
  PERSISTENCE,
  PROPAGATION_FACTOR,
  ResolutionTier,
  SIM,
  STANDING_WAVE,
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
} from '@echoes/shared';

import { defineQuery } from 'bitecs';
import { Health, Owner, Position, Pressure, Structure, Unit } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { MOUTH_RIM, mapById, missionMapById } from '../src/sim/maps/index.ts';
import { CHORD_RIM_DEPOSITS, LEDGER_PROSPECT } from '../src/sim/missions/index.ts';
import type { MissionBeat, MissionUnit } from '../src/sim/missions/index.ts';
import { CHORD_SECOND_CHORD } from '../src/sim/missions/secondChord.ts';

const M = CHORD_SECOND_CHORD;
const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
const PLAYER = M.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const RELEASE = T(15, 30);
const COLLAPSE = T(16);
const CLOSE = T(18);

const hulls = defineQuery([Unit, Owner, Position, Health]);
const structures = defineQuery([Structure, Owner, Position, Health]);

/** §1, §8, §11 — the three points the whole mission is measured from. */
const CHORD = { x: 4800, y: 3150 };
const MOUTH = { x: 4800, y: 3550 };
const DOME = { x: 5000, y: 3400 };
const BED = { x: 1250, y: 3250 };
const STAGING_SEAT = { x: 3000, y: 300 };

const LIP_PF = PROPAGATION_FACTOR[Biome.AbyssalTrench];
const TERRACES_PF = PROPAGATION_FACTOR[Biome.ResonanceField];

const CRUISER = statsFor(UnitKind.Cruiser);
const CORVETTE = statsFor(UnitKind.Corvette);
const CHORISTER = statsFor(UnitKind.Chorister);
const SUBMERSIBLE = statsFor(UnitKind.AbyssalSubmersible);
const SPIRE = structureStatsFor(StructureKind.SoundingSpire);
const CANTOR = structureStatsFor(StructureKind.Cantor);
const SOUNDER = faunaStatsFor(FaunaSpecies.Sounder);

/** The dome lifts every ear inside 1,200 m to the cap, which is 95. */
const LIFTED_HYD = STRUCTURE_AURAS.CANTOR.HYD_CAP;

const away = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.round(Math.hypot(a.x - b.x, a.y - b.y));

/** The range at which SIG through one biome reaches HYD at a tier's multiple. */
function rangeAt(sig: number, pf: number, hyd: number, multiple: number): number {
  let low = 1;
  let high = 60000;
  for (let i = 0; i < 90; i++) {
    const mid = (low + high) / 2;
    if (detectionRatio(sig, pf, mid, hyd) >= multiple) low = mid;
    else high = mid;
  }
  return Math.round(low);
}

type Move = Extract<MissionBeat, { kind: 'move' }>;
type Say = Extract<MissionBeat, { kind: 'say' }>;
type Lose = Extract<MissionBeat, { kind: 'lose' }>;
type Release = Extract<MissionBeat, { kind: 'release' }>;
type Creature = Extract<MissionBeat, { kind: 'creature' }>;
type Resolve = Extract<MissionBeat, { kind: 'resolve' }>;

const moves = M.beats.filter((beat): beat is Move => beat.kind === 'move');
const says = M.beats.filter((beat): beat is Say => beat.kind === 'say');
const loses = M.beats.filter((beat): beat is Lose => beat.kind === 'lose');
const releases = M.beats.filter((beat): beat is Release => beat.kind === 'release');
const creatures = M.beats.filter((beat): beat is Creature => beat.kind === 'creature');
const resolveBeat = M.beats.find((beat): beat is Resolve => beat.kind === 'resolve')!;

const order = M.parties.find((party) => party.slot === PLAYER)!;
const those = M.parties.find(
  (party) => party.faction === Faction.Directorate && party.units.length > 0
)!;
const everyUnit = M.parties.flatMap((party) => party.units);
const unit = (tag: string): MissionUnit => everyUnit.find((u) => u.tag === tag)!;
const structure = (tag: string) =>
  M.parties.flatMap((party) => party.structures ?? []).find((s) => s.tag === tag)!;
const emitter = (tag: string) =>
  M.parties.flatMap((party) => party.emitters ?? []).find((e) => e.tag === tag)!;
const objective = (id: string) => M.objectives.find((o) => o.id === id)!;
const movesFor = (tag: string) => moves.filter((beat) => beat.tag === tag);
const cohortTags = Array.from({ length: 12 }, (_, i) => `cohort-${i + 1}`);

describe('the Rim, as docs/mission-second-chord.md §11 reuses it', () => {
  it('is Prospect’s map, untouched — the fifth mission on one chart', () => {
    // §11: "same rectangles, same floors, same biomes, same spawn", and
    // campaign.md §8's "the same terrain four times and never the same mission"
    // applied literally, one tide past the fourth.
    assert.equal(M.mapId, 'mouth-rim');
    assert.equal(M.mapId, LEDGER_PROSPECT.mapId, '§11: the rim documents share a chart');
    assert.equal(M.mapId, CHORD_RIM_DEPOSITS.mapId);
    assert.equal(missionMapById(M.mapId), MOUTH_RIM);
    assert.equal(mapById('mouth-rim'), undefined, '§11: not in the public catalogue');
    assert.equal(MOUTH_RIM.seats, 1);
    assert.deepEqual(MOUTH_RIM.resources, [], '§11: no resources, for the Order either');
    assert.deepEqual(MOUTH_RIM.hazards, [], '§11: no hazard sites');
    assert.deepEqual(MOUTH_RIM.spawns, [{ x: 3000, y: 500, foundryOffsetX: 0, foundryOffsetY: 0 }]);
    assert.equal(MOUTH_RIM.widthM, 6000);
    assert.equal(MOUTH_RIM.heightM, 4000);
    assert.equal(MOUTH_RIM.cellM, 250);
    assert.equal(MOUTH_RIM.floorM, 2600);
  });

  it('transcribes §11’s five bands, floor for floor', () => {
    assert.deepEqual(
      MOUTH_RIM.regions.map((region) => [
        region.x,
        region.y,
        region.widthM,
        region.heightM,
        region.biome,
        region.floorM,
      ]),
      [
        [0, 0, 6000, 4000, Biome.OpenWater, 2600],
        [0, 0, 6000, 1000, Biome.OpenWater, 1500],
        [0, 1000, 6000, 1000, Biome.OpenWater, 2200],
        [0, 2000, 6000, 1000, Biome.ResonanceField, 2600],
        [0, 3000, 6000, 1000, Biome.AbyssalTrench, 3100],
      ],
      '§11: the Deep Water, the Staging, the Slopes, the Terraces and the Lip'
    );
    assert.equal(LIP_PF, 1.6, '§11: the Lip carries like a trench and points south');
    assert.equal(TERRACES_PF, 0.7, '§11: the crystal came from quieter water');
  });

  it('restates three rectangles of its own and paints no ground', () => {
    assert.deepEqual(
      M.regions.map((region) => [region.id, region.x, region.y, region.widthM, region.heightM]),
      [
        ['staging', 0, 0, 6000, 1000],
        ['the-cache', 2750, 250, 500, 500],
        ['chord-water', 4500, 2900, 500, 500],
      ],
      '§8: the Staging, the cache and the node’s own water'
    );
    for (const region of M.regions) {
      assert.equal(region.pressureBonus, undefined, '§8: the rim is not manufactured water');
    }
    // §8: "every point of it within 391 m of the node, and therefore inside the
    // grant" — the far corners, measured.
    const water = M.regions.find((region) => region.id === 'chord-water')!;
    const corners = [
      { x: water.x, y: water.y },
      { x: water.x + water.widthM, y: water.y },
      { x: water.x, y: water.y + water.heightM },
      { x: water.x + water.widthM, y: water.y + water.heightM },
    ];
    assert.equal(Math.max(...corners.map((corner) => away(corner, CHORD))), 391);
    assert.ok(391 < STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M, '§8: the whole rectangle is covered');
    // §8: it straddles two floors — a hundred metres of Terraces, four of Lip.
    assert.equal(3000 - water.y, 100);
    assert.equal(water.y + water.heightM - 3000, 400);
  });

  it('orders no hull below DEPTH.MAX_M, because none can be', () => {
    // §11, in as many words: "No hull on this map is ordered below 3,000 m,
    // because none can be." Every seated hull and every move beat that carries
    // a depth, against the lip's own floor of 3,100.
    assert.equal(DEPTH.MAX_M, 3000);
    for (const hull of everyUnit) {
      assert.ok(hull.depthM <= DEPTH.MAX_M, `${hull.tag} is seated at ${hull.depthM} m`);
    }
    for (const beat of moves) {
      if (beat.depthM === undefined) continue;
      assert.ok(beat.depthM <= DEPTH.MAX_M, `a move beat orders ${beat.tag} to ${beat.depthM} m`);
    }
    const lip = MOUTH_RIM.regions.find((region) => region.biome === Biome.AbyssalTrench)!;
    assert.equal(lip.floorM! - DEPTH.MAX_M, 100, '§11: a hundred metres of rock nobody touches');
    // And the two depths that are not hulls: an emitter and a creature may sit
    // where a hull the runtime orders may not.
    for (const tag of ['attendant-a', 'attendant-b', 'the-return']) {
      assert.equal(emitter(tag).depthM, 3050, `${tag}: below the orderable column`);
    }
    assert.equal(creatures[0]!.spawnAt!.depthM, 3050);
  });
});

describe('the Order, as docs/mission-second-chord.md §2 and §3 muster it', () => {
  it('is six hulls, three roles, forty-one souls and one unarmed Cruiser', () => {
    assert.equal(order.faction, Faction.Hadron);
    assert.equal(M.playerFaction, Faction.Hadron);
    assert.equal(order.units.length, 6);
    assert.equal(
      order.units.reduce((total, hull) => total + (hull.souls ?? 0), 0),
      41,
      '§3: forty-one souls'
    );
    const byRole = (role: string) => order.units.filter((hull) => hull.role === role);
    assert.equal(byRole('tender').length, 1, '§8: tender, one hull');
    assert.equal(byRole('escort').length, 3, '§8: escort, three');
    assert.equal(byRole('carrier').length, 2, '§8: carrier, two');
    // §3 — the Choirmaster's hull is the only unarmed thing on the party, and
    // the only one the sounding is tagged to.
    assert.equal(unit('the-choirmaster').armed, undefined, '§3: unarmed, and she carries the tone');
    for (const tag of ['the-voice', 'carrier-a', 'carrier-b', 'escort-a', 'escort-b']) {
      assert.equal(unit(tag).armed, true, `${tag}: §3 arms everything else`);
    }
    // §3 — PR-2, no refit, and the Staging's 1,400 m is free for it.
    for (const hull of order.units) {
      assert.equal(hull.pressureRating, undefined, `${hull.tag}: §3, no refit`);
      assert.equal(hull.depthM, 1400, `${hull.tag}: §11's staging seat`);
    }
    assert.equal(CRUISER.pressureRating, 2);
    assert.equal(CORVETTE.pressureRating, 2);
    assert.equal(requiredPressureRating(1400), 2, '§11: Mid-Water, and rated for it');
  });

  it('holds two hulls to 15:30 and releases exactly those two', () => {
    // §2, §3 — "the Choirmaster waits above the fight", and one hull for ears.
    const held = order.units.filter((hull) => hull.releaseTick !== undefined);
    assert.deepEqual(
      held.map((hull) => [hull.tag, hull.releaseTick]),
      [
        ['the-choirmaster', RELEASE],
        ['escort-b', RELEASE],
      ],
      '§9: release on the-choirmaster; release on escort-b'
    );
    assert.deepEqual(
      releases.map((beat) => [beat.atTick, beat.tag]),
      [
        [RELEASE, 'the-choirmaster'],
        [RELEASE, 'escort-b'],
      ]
    );
    // §3 — "a tender with no escort inside 600 m does not move", and both
    // escorts open exactly 335 m from her, one on each side.
    assert.equal(M.escortRadiusM, 600);
    assert.equal(away(unit('escort-a'), unit('the-choirmaster')), 335);
    assert.equal(away(unit('escort-b'), unit('the-choirmaster')), 335);
  });

  it('stands three prebuilt Spires that are three grants and never a pair', () => {
    const nodes = order.structures!.filter((item) => item.kind === StructureKind.SoundingSpire);
    assert.equal(nodes.length, 3, '§3: the lattice');
    assert.deepEqual(
      nodes.map((node) => [node.tag, node.x, node.y, node.depthM]),
      [
        ['node-one', 3750, 2500, 2600],
        ['node-two', 4900, 2600, 2600],
        ['the-chord', CHORD.x, CHORD.y, 3000],
      ],
      '§3, §11: the raid’s two on the terrace floor and the last one on the lip'
    );
    // §4's three distances, to the metre, and all three inside the pairing
    // range that decides nothing here.
    assert.equal(away(structure('node-one'), structure('node-two')), 1154);
    assert.equal(away(structure('node-two'), structure('the-chord')), 559);
    assert.equal(away(structure('node-one'), structure('the-chord')), 1235);
    for (const span of [1154, 559, 1235]) {
      assert.ok(span < STANDING_WAVE.PAIR_RANGE_M, '§4: inside the 1,500 m the rule spends');
    }
    // §4: "no PF 2.00, and no Spire standing at eighty with nothing under it."
    // Nothing in the literal writes a corridor, and nothing paints one.
    assert.equal(STANDING_WAVE.CORRIDOR_PF, 2);
    assert.ok(
      MOUTH_RIM.regions.every(
        (region) => PROPAGATION_FACTOR[region.biome] < STANDING_WAVE.CORRIDOR_PF
      ),
      '§4: no water on this chart carries at the corridor’s figure'
    );
    // §3, §4 — the aura is the mission, and it is the shipped one.
    assert.equal(STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M, 600);
    assert.equal(STRUCTURE_AURAS.SOUNDING_SPIRE.PR_BONUS, 1);
    assert.equal(SPIRE.maxHp, 1800);
    assert.equal(SPIRE.sigIdle, 30);
    assert.equal(SPIRE.sigActive, 80);
  });

  it('raises the Chord inside the Directorate’s hearing, and §1’s two distances say so', () => {
    assert.equal(away(structure('the-chord'), DOME), 320, '§1: 320 m from the listening dome');
    assert.equal(
      Math.min(...cohortTags.map((tag) => away(unit(tag), CHORD))),
      602,
      '§1: 602 m from the nearest Chorister’s seat'
    );
    // §1, §7 — and from tick zero the idle node is a Track in a lifted ear.
    assert.ok(
      320 < STRUCTURE_AURAS.CANTOR.RADIUS_M,
      '§7: the Chord stands inside the dome’s own lift'
    );
    assert.equal(
      rangeAt(SPIRE.sigIdle, LIP_PF, LIFTED_HYD, TIER_THRESHOLD_MULTIPLIER.TRACK),
      2340,
      '§7: 30 through the lip’s 1.60 is Track to a dome-lifted ear inside 2,340 m'
    );
  });

  it('locks construction with a reason and fences nothing else', () => {
    assert.deepEqual(
      M.locks.map((lock) => lock.ability),
      ['construction'],
      '§3, §13: one authored lock, and the six that are not are the point'
    );
    assert.equal(M.locks[0]!.reason, 'three nodes stand; the ledger is empty');
    assert.equal(M.startingNodules, undefined, '§3: the ledger is empty');
    assert.equal(M.arrayTag, undefined, '§4: nothing to lend and nothing to withdraw');
    assert.equal(M.debtCapS, 0);
    assert.equal(M.silenceCeilingSig, 100);
    assert.equal(M.sigBudget, 100, '§4: the first budget in the bible at the scale’s ceiling');
    assert.equal(M.fauna, false, '§11: the one creature is a beat');
    assert.equal(M.courtSlot, 1);
    assert.ok(
      M.parties.every((party) => party.slot !== M.courtSlot),
      '§2: the court slot is reserved and empty'
    );
    assert.equal(M.parties.length, 5, '§2: five parties and a court slot');
  });
});

describe('those below, weapons-cold — docs/mission-second-chord.md §4, §5 and §13', () => {
  it('arms nothing but the Order, and the file says why', () => {
    // §13's row: `combatSystem` auto-acquires the nearest live thing carrying
    // Position, Owner and Health that is not on its own slot, and a structure
    // carries all three. There is no target class, so "attending, not policing"
    // is spelled `armed: false` — and the played case below is what proves it
    // matters rather than reads well.
    for (const party of M.parties) {
      if (party.slot === PLAYER) continue;
      for (const hull of party.units) {
        assert.equal(hull.armed, undefined, `${hull.tag} is scripted and carries a live gun`);
      }
    }
    assert.equal(
      everyUnit.filter((hull) => hull.armed === true).length,
      5,
      '§4: the only guns in this water are the Order’s, and there are five of them'
    );
    // §2, §5 — and the eighteen of them are one party, because hostility is
    // `Owner.slot`: twelve Choristers on a slot of their own would open fire on
    // the watch 304 m away and on the dome at 112, which is the finding this
    // literal shares with `rimDeposits.ts`.
    assert.equal(those.units.length, 18, '§5: the watch, the 9th and the twelve, on one slot');
    assert.equal(those.faction, Faction.Directorate);
  });

  it('states the reach that is now only a doctrine, and the seats it applies to', () => {
    // §4 — a Chorister's 450 m, and §9's stops well inside it.
    assert.equal(CHORISTER.attackRangeM, 450);
    assert.equal(SUBMERSIBLE.attackRangeM, 650);
    const stops = movesFor('cohort-1')
      .concat(...cohortTags.slice(1).map((tag) => movesFor(tag)))
      .filter((beat) => beat.atTick === T(3, 30) || beat.atTick === T(9, 30));
    assert.equal(stops.length, 12);
    const fromNode = stops.map((stop) => away(stop, CHORD));
    assert.equal(Math.min(...fromNode), 200, '§9: 200 m, the nearest stop of the twelve');
    assert.equal(Math.max(...fromNode), 412, '§9: 412 m, the furthest');
    assert.ok(
      Math.max(...fromNode) < CHORISTER.attackRangeM,
      '§4: every stop is inside the 450 m the correction is stated at'
    );
    // §13's own measurement, stated as geometry: the watch's inherited station
    // stands inside its gun of the mission's keystone object.
    assert.equal(away(unit('watch-a'), CHORD), 250);
    assert.equal(away(unit('watch-b'), CHORD), 206);
    assert.ok(
      away(unit('watch-b'), CHORD) < SUBMERSIBLE.attackRangeM,
      '§13: which is the whole of why this rim is cold'
    );
    // And the 9th, which is outside it whatever anybody decided.
    for (const tag of ['ninth-one', 'ninth-two', 'ninth-three', 'ninth-four']) {
      assert.ok(away(unit(tag), CHORD) > SUBMERSIBLE.attackRangeM, `${tag} attends and no more`);
    }
  });

  it('refits the twelve and the plateaus’ two, and nothing that is PR-3 already', () => {
    // §13 — `missions.test.ts` reads the authored rating or the hull's own,
    // never `effectivePressureRating`, so a PR-2 Chorister at 3,000 m fails the
    // suite and a PR-3 submersible needs nothing.
    assert.equal(CHORISTER.pressureRating, 2);
    assert.equal(SUBMERSIBLE.pressureRating, 3);
    assert.equal(requiredPressureRating(3000), 3);
    for (const tag of cohortTags) assert.equal(unit(tag).pressureRating, 3, `${tag}: §13's refit`);
    for (const tag of ['watch-a', 'watch-b', 'ninth-one', 'ninth-two', 'ninth-three', 'ninth-four'])
      assert.equal(unit(tag).pressureRating, undefined, `${tag}: PR-3 on the roster`);
    for (const tag of ['chart-a', 'chart-b']) {
      assert.equal(unit(tag).pressureRating, 3, `${tag}: PR-3 by refit, as Prospect authors them`);
      assert.equal(unit(tag).depthM, 2100);
    }
    assert.equal(requiredPressureRating(2100), 3);
  });

  it('inherits every Directorate and plateau seat from the tide before, to the metre', () => {
    // §5, §11 — "the Directorate's seats are *First Arrival*'s, inherited to
    // the metre and not re-authored", and D+2 inherited them first.
    const before = new Map(
      CHORD_RIM_DEPOSITS.parties
        .flatMap((party) => party.units)
        .map((hull) => [hull.tag, { x: hull.x, y: hull.y, depthM: hull.depthM }])
    );
    for (const tag of [
      ...cohortTags,
      'watch-a',
      'watch-b',
      'ninth-one',
      'ninth-two',
      'ninth-three',
      'ninth-four',
      'chart-a',
      'chart-b',
    ]) {
      const seat = before.get(tag);
      assert.ok(seat !== undefined, `${tag}: not a seat the rim already had`);
      assert.deepEqual(
        { x: unit(tag).x, y: unit(tag).y, depthM: unit(tag).depthM },
        seat,
        `${tag}: §5, inherited to the metre`
      );
    }
    for (const tag of ['dome', 'the-bed']) {
      const older = CHORD_RIM_DEPOSITS.parties
        .flatMap((party) => party.structures ?? [])
        .find((item) => item.tag === tag)!;
      assert.deepEqual(
        [structure(tag).x, structure(tag).y, structure(tag).depthM, structure(tag).kind],
        [older.x, older.y, older.depthM, older.kind],
        `${tag}: unchanged on the tide after`
      );
    }
    // §13 — the attendants are Prospect's two, verbatim in place, rhythm and
    // loudness, and the third emitter is the lip's own.
    for (const tag of ['attendant-a', 'attendant-b']) {
      const older = CHORD_RIM_DEPOSITS.parties
        .flatMap((party) => party.emitters ?? [])
        .find((item) => item.tag === tag)!;
      assert.deepEqual(
        [
          emitter(tag).x,
          emitter(tag).y,
          emitter(tag).sig,
          emitter(tag).periodTicks,
          emitter(tag).onTicks,
        ],
        [older.x, older.y, older.sig, older.periodTicks, older.onTicks],
        `${tag}: Prospect's rhythm, twice inherited`
      );
    }
  });

  it('holds the lip’s return to Attendance’s figures and a twenty-second window', () => {
    const ret = emitter('the-return');
    assert.deepEqual(
      [ret.x, ret.y, ret.depthM],
      [4800, 3900, 3050],
      '§11: 350 m south of the point'
    );
    assert.equal(ret.sig, 3, '§6: SIG 3, Attendance’s figure exactly');
    assert.equal(ret.periodTicks, ret.onTicks, '§13: sustained rather than pulsed');
    assert.equal(ret.onTicks, 20 * SIM.TICK_HZ, '§6: twenty seconds');
    assert.equal(ret.fromTick, T(16, 40), '§6: the sixteenth minute and forty seconds');
    assert.equal(ret.untilTick! - ret.fromTick!, 20 * SIM.TICK_HZ);
    assert.equal(away(ret, MOUTH), 350);
    assert.equal(MOUTH_RIM.heightM - ret.y, 100, '§11: a hundred metres north of the map’s edge');
    // §6 — Bearing to the Voice from 808 m and to a Corvette from 686.
    assert.equal(rangeAt(3, LIP_PF, CRUISER.hyd, TIER_THRESHOLD_MULTIPLIER.BEARING), 808);
    assert.equal(rangeAt(3, LIP_PF, CORVETTE.hyd, TIER_THRESHOLD_MULTIPLIER.BEARING), 686);
    // §13 — three attendable emitters, and the row asks for three.
    const attendable = M.parties.flatMap((party) => party.emitters ?? []).filter((e) => e.reading);
    assert.equal(attendable.length, 3);
    const lip = objective('the-lip').predicate;
    assert.ok(lip.kind === 'attend' && lip.count === attendable.length);
  });
});

describe('the correction, as docs/mission-second-chord.md §9 walks it', () => {
  const musters = (tick: number) => moves.filter((beat) => beat.atTick === tick);
  const legFor = (from: { x: number; y: number }, to: { x: number; y: number }) =>
    Math.round(Math.hypot(from.x - to.x, from.y - to.y));

  it('musters both rows inside §11’s box, over §9’s two leg ranges', () => {
    const first = musters(T(2, 30));
    const second = musters(T(8, 30));
    assert.equal(first.length, 6);
    assert.equal(second.length, 6);
    const box = [...first, ...second];
    assert.equal(Math.min(...box.map((beat) => beat.x)), 5300, '§11: musters at 5300–5400');
    assert.equal(Math.max(...box.map((beat) => beat.x)), 5400);
    assert.equal(Math.min(...box.map((beat) => beat.y)), 3350, '§11: × 3350–3700');
    assert.equal(Math.max(...box.map((beat) => beat.y)), 3700);

    const firstLegs = first.map((beat) => legFor(unit(beat.tag), beat));
    assert.equal(Math.min(...firstLegs), 180, '§9: 180–559 m');
    assert.equal(Math.max(...firstLegs), 559);
    const secondLegs = second.map((beat) => legFor(unit(beat.tag), beat));
    assert.equal(Math.min(...secondLegs), 141, '§9: 141–539 m');
    assert.equal(Math.max(...secondLegs), 539);
    // §9's seconds, at a Chorister's forty: standing 02:35–02:44 and by 08:44.
    assert.equal(CHORISTER.speed, 40);
    assert.equal(Math.round(180 / CHORISTER.speed), 5);
    assert.equal(Math.round(559 / CHORISTER.speed), 14);
    assert.equal(Math.round(539 / CHORISTER.speed), 13);
  });

  it('corrects onto §11’s stop box, over §9’s legs and to §9’s distances', () => {
    const first = musters(T(3, 30));
    const second = musters(T(9, 30));
    assert.equal(first.length, 6);
    assert.equal(second.length, 6);
    const box = [...first, ...second];
    assert.equal(Math.min(...box.map((beat) => beat.x)), 5000, '§11: stops at 5000–5200');
    assert.equal(Math.max(...box.map((beat) => beat.x)), 5200);
    assert.equal(Math.min(...box.map((beat) => beat.y)), 3050, '§11: × 3050–3350');
    assert.equal(Math.max(...box.map((beat) => beat.y)), 3350);
    for (const beat of box) assert.equal(beat.depthM, DEPTH.MAX_M, '§9: at 3,000 m');

    const legOf = (beat: Move, musterTick: number) =>
      legFor(
        musters(musterTick).find((m) => m.tag === beat.tag)!,
        beat
      );
    const firstLegs = first.map((beat) => legOf(beat, T(2, 30)));
    assert.equal(Math.min(...firstLegs), 224, '§9: 224–430 m');
    assert.equal(Math.max(...firstLegs), 430);
    assert.equal(Math.round(224 / CHORISTER.speed), 6, '§9: standing between 03:36…');
    assert.equal(Math.round(430 / CHORISTER.speed), 11, '§9: …and 03:41');
    const secondLegs = second.map((beat) => legOf(beat, T(8, 30)));
    assert.equal(Math.min(...secondLegs), 538, '§9: 538–640 m');
    assert.equal(Math.max(...secondLegs), 640);
    assert.equal(Math.round(538 / CHORISTER.speed), 13, '§9: standing between 09:43…');
    assert.equal(Math.round(640 / CHORISTER.speed), 16, '§9: …and 09:46');

    assert.equal(Math.min(...first.map((beat) => away(beat, CHORD))), 255, '§9: 255–412 m');
    assert.equal(Math.max(...first.map((beat) => away(beat, CHORD))), 412);
    assert.equal(Math.min(...second.map((beat) => away(beat, CHORD))), 200, '§9: 200–403 m');
    assert.equal(Math.max(...second.map((beat) => away(beat, CHORD))), 403);
    // §9 — the second wave goes to the Chord's *northern* water.
    assert.ok(
      second.every((beat) => beat.y <= CHORD.y),
      '§9: north of the node'
    );
  });

  it('walks all twelve 480 m east at the Collapse and back twelve seconds later', () => {
    const out = musters(COLLAPSE).filter((beat) => beat.tag.startsWith('cohort-'));
    const back = musters(T(16, 15));
    assert.equal(out.length, 12, '§9: move ×12');
    assert.equal(back.length, 12, '§9: move ×12, twelve seconds more');
    const stops = new Map(
      moves
        .filter((beat) => beat.atTick === T(3, 30) || beat.atTick === T(9, 30))
        .map((beat) => [beat.tag, beat])
    );
    for (const beat of out) {
      const stop = stops.get(beat.tag)!;
      assert.equal(beat.x - stop.x, 480, `${beat.tag}: §9's 480 m east`);
      assert.equal(beat.y, stop.y);
      assert.equal(beat.depthM, undefined, 'the walk is ground and nothing else');
      assert.ok(
        away(beat, CHORD) > CHORISTER.attackRangeM,
        `${beat.tag}: §13's twelve seconds put it outside the reach it is stated at`
      );
      assert.ok(beat.x <= MOUTH_RIM.widthM);
    }
    for (const beat of back) {
      const stop = stops.get(beat.tag)!;
      assert.deepEqual([beat.x, beat.y], [stop.x, stop.y], `${beat.tag}: back to the stop it left`);
    }
    // §11 — "the farthest at 5680, 3250".
    const farthest = out.slice().sort((a, b) => away(b, CHORD) - away(a, CHORD))[0]!;
    assert.deepEqual([farthest.x, farthest.y], [5680, 3250]);
    assert.equal(Math.round(480 / CHORISTER.speed), 12, '§9: twelve seconds of walking');
  });

  it('walks the watch and the pair on the legs the tide before walked them', () => {
    assert.deepEqual(
      moves
        .filter((beat) => ['watch-a', 'watch-b', 'chart-a', 'chart-b'].includes(beat.tag))
        .map((beat) => [beat.atTick / SIM.TICK_HZ, beat.tag, beat.x, beat.y]),
      [
        [180, 'chart-a', 1800, 2150],
        [180, 'chart-b', 1950, 2200],
        [240, 'watch-a', 3600, 3300],
        [240, 'watch-b', 3750, 3350],
        [540, 'watch-a', 2400, 3400],
        [540, 'watch-b', 2550, 3450],
        [720, 'chart-a', 1200, 2050],
        [720, 'chart-b', 1350, 2100],
        [840, 'watch-a', 4600, 3300],
        [840, 'watch-b', 4750, 3350],
      ],
      '§9: Prospect’s legs and First Arrival’s, walked again on the tide after'
    );
    for (const tag of ['watch-a', 'watch-b', 'chart-a', 'chart-b']) {
      const home = movesFor(tag).at(-1)!;
      assert.deepEqual([home.x, home.y], [unit(tag).x, unit(tag).y], `${tag} resumes its station`);
    }
  });
});

describe('what is heard, as docs/mission-second-chord.md §7 prices it', () => {
  it('recomputes §7’s tone table, all six rows and all three sectors', () => {
    // The loudest sustained thing the bible has ever authored, quartered by the
    // Knight cone: 100 down the axis, 35 across the rim, 10 astern.
    const rows: [string, number, number, number, number, number][] = [
      ['the dome, or anything under it', LIFTED_HYD, LIP_PF, 11809, 6127, 2800],
      ['an Abyssal Submersible', SUBMERSIBLE.hyd, LIP_PF, 11016, 5716, 2612],
      ['a Chorister, undomed', CHORISTER.hyd, LIP_PF, 10187, 5286, 2416],
      ['the Voice', CRUISER.hyd, LIP_PF, 9316, 4833, 2209],
      ['a Corvette', CORVETTE.hyd, LIP_PF, 7907, 4102, 1875],
      ['the dome, across the terraces', LIFTED_HYD, TERRACES_PF, 7044, 3655, 1670],
    ];
    for (const [who, hyd, pf, cone, flank, wake] of rows) {
      const contact = TIER_THRESHOLD_MULTIPLIER.CONTACT;
      assert.equal(rangeAt(100, pf, hyd, contact), cone, `${who}: the cone`);
      assert.equal(rangeAt(35, pf, hyd, contact), flank, `${who}: the flank`);
      assert.equal(rangeAt(10, pf, hyd, contact), wake, `${who}: the wake`);
    }
    // §7's point is the second column against the first: the rim hears the
    // flank and the trenches hear the cone. The map is 7,211 m corner to
    // corner, and the cone clears that for the *deafest* listener in the
    // water — "aimed south, the tone reaches every listener on this map at
    // Contact several times over, and keeps going into water no map authors".
    // The flank does not, which is the whole of why the table has two columns:
    // a Corvette abeam holds it from 4,102 m and the same hull ahead of the
    // bow holds it from 7,907.
    const diagonal = Math.hypot(MOUTH_RIM.widthM, MOUTH_RIM.heightM);
    assert.equal(Math.round(diagonal), 7211);
    assert.ok(
      rangeAt(100, LIP_PF, CORVETTE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT) > diagonal,
      '§7: the cone reaches every listener on this map, the deafest included'
    );
    assert.ok(
      rangeAt(35, LIP_PF, CORVETTE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT) < diagonal,
      '§7: and the flank does not, which is why the tone is aimed'
    );
  });

  it('recomputes §7’s second table — everything the Voice holds all tide', () => {
    const voice = CRUISER.hyd;
    const rows: [string, number, number, number][] = [
      ['the dome, idle', CANTOR.sigIdle, 4833, 2726],
      ['a Chorister, cruising', CHORISTER.sigCruise, 3818, 2153],
      ['the watch and the 9th, idle', SUBMERSIBLE.sigIdle, 3616, 2039],
      ['an attendant, striking', emitter('attendant-a').sig, 3818, 2153],
      ['the lip’s return', emitter('the-return').sig, 1041, 587],
      ['the basin, calling', SOUNDER.sigActive, 9316, 5254],
    ];
    for (const [who, sig, contact, classification] of rows) {
      assert.equal(rangeAt(sig, LIP_PF, voice, TIER_THRESHOLD_MULTIPLIER.CONTACT), contact, who);
      assert.equal(
        rangeAt(sig, LIP_PF, voice, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
        classification,
        who
      );
    }
    // §7 — the bed, heard by nobody who stays east.
    assert.equal(rangeAt(8, LIP_PF, voice, TIER_THRESHOLD_MULTIPLIER.BEARING), 1491);
    assert.equal(away(BED, CHORD), 3551, '§7: and it is 3,551 m from the Chord');
  });

  it('prices the node under load and the marks the Collapse leaves', () => {
    // §7 — 80 through the terraces' 0.70 and along the lip's 1.60.
    assert.equal(
      rangeAt(SPIRE.sigActive, TERRACES_PF, LIFTED_HYD, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      6127
    );
    assert.equal(
      rangeAt(SPIRE.sigActive, TERRACES_PF, LIFTED_HYD, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      3456
    );
    assert.equal(
      rangeAt(SPIRE.sigActive, LIP_PF, LIFTED_HYD, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      5793
    );
    // §7, §13 — two destroyed structures lay marks at 18 for 180 seconds.
    assert.equal(ECHO_MARKS.DESTROYED_STRUCTURE_SIG, 18);
    assert.equal(PERSISTENCE.DESTROYED_STRUCTURE_S, 180);
    assert.equal(
      rangeAt(
        ECHO_MARKS.DESTROYED_STRUCTURE_SIG,
        TERRACES_PF,
        LIFTED_HYD,
        TIER_THRESHOLD_MULTIPLIER.CONTACT
      ),
      2412
    );
    assert.equal(
      rangeAt(
        ECHO_MARKS.DESTROYED_STRUCTURE_SIG,
        LIP_PF,
        CRUISER.hyd,
        TIER_THRESHOLD_MULTIPLIER.CONTACT
      ),
      3190
    );
    assert.equal(away(structure('node-two'), DOME), 806, '§7: and node-two is 806 m from the dome');
  });

  it('prices what the Collapse costs the Order, in points a second', () => {
    // §4 — 4 × 1², unhealable, from 16:00 for every Knight hull at 1,800 m or
    // deeper and outside the Chord's six hundred.
    assert.equal(
      crushAttritionPerSecond(2, 1800),
      4,
      '§4, §13: 1,800 m is the Abyssal band’s first metre'
    );
    assert.equal(crushAttritionPerSecond(2, 1799), 0, '§13: and 1,799 is the free depth');
    assert.equal(crushAttritionPerSecond(2, 1750), 0, '§6: 1,750 m costs a PR-2 hull nothing');
    // §6, §11 — and *free* is the crush reading rather than the ground's. The
    // Staging's own floor is 1,500 m, two hundred and fifty metres shallower
    // than the depth the crossing is priced at, which is why every Order hull
    // is seated at 1,400 and takes 1,750 only once it is over the Slopes. The
    // three bands south of the Staging are the ones §6 enumerates, and they
    // are the ones that admit it.
    const [, staging, slopes, terraces, lip] = MOUTH_RIM.regions;
    assert.ok(staging!.floorM! < 1750, '§11: the Staging does not admit the crossing depth');
    for (const band of [slopes, terraces, lip]) {
      assert.ok(band!.floorM! > 1750, '§6: the Slopes, the Terraces and the Lip all admit it');
    }
    assert.equal(Math.round(CORVETTE.maxHp / 4), 105, '§4: 105 seconds for a Corvette');
    assert.equal(Math.round(CRUISER.maxHp / 4), 300, '§4: 300 for a Cruiser');
    // §4's three ways out, in seconds and in points.
    assert.equal(DEPTH.ASCENT_RATE_MPS, 15);
    assert.equal(
      Number((850 / DEPTH.ASCENT_RATE_MPS).toFixed(1)),
      56.7,
      '§4: 850 m of terrace climb'
    );
    assert.equal(Math.round((850 / DEPTH.ASCENT_RATE_MPS) * 4), 227);
    assert.equal(
      Number((1250 / DEPTH.ASCENT_RATE_MPS).toFixed(1)),
      83.3,
      '§4: 1,250 m from the lip'
    );
    assert.equal(Math.round((1250 / DEPTH.ASCENT_RATE_MPS) * 4), 333);
    assert.equal(
      Number((STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M / CORVETTE.speed).toFixed(1)),
      7.1,
      '§4: or 600 m of walk into the grant, in 7.1 seconds'
    );
    assert.equal(Math.round((600 / CORVETTE.speed) * 4), 28, '§4: and 28 HP for it');
  });

  it('lifts the basin on Prospect’s line and keeps it off the tone’s bearing', () => {
    assert.equal(creatures.length, 1, '§7: no second creature');
    const basin = creatures[0]!;
    assert.equal(basin.species, FaunaSpecies.Sounder);
    assert.equal(basin.atTick, T(16, 30), '§9: 16:30');
    assert.equal(basin.untilTick, CLOSE);
    assert.equal(basin.loud, true);
    assert.deepEqual(basin.spawnAt, { x: 3000, y: 3600, depthM: 3050 });
    assert.deepEqual(basin.driveTo, { x: 3000, y: 2400, depthM: 2000 }, '§9, §13: with a depth');
    assert.equal(basin.driveTo.depthM, SOUNDER.workingDepthM, '§13: the species’ own band');
    assert.equal(CHORD.x - basin.spawnAt!.x, 1800, '§7: it rises 1,800 m west of the Chord');
    assert.equal(away(basin.driveTo, CHORD), 1950, '§7: and stands off it at 1,950 m');
    assert.equal(Math.hypot(1200, 0) / SOUNDER.speed, 40, '§7: 1,200 m at 30 m/s is forty seconds');
    // §7 — and against the tone it would be deaf anyway, but the arithmetic is
    // stated because the player does not know it is driven.
    const heard = (sig: number, level: number) => {
      let low = 1;
      let high = 20000;
      for (let i = 0; i < 90; i++) {
        const mid = (low + high) / 2;
        if (detectionRatio(sig, LIP_PF, mid, SOUNDER.hyd) >= level) low = mid;
        else high = mid;
      }
      return Math.round(low);
    };
    assert.equal(heard(100, SOUNDER.interest), 933, '§7: interested from 933 m');
    assert.equal(heard(100, SOUNDER.commit), 768, '§7: committed from 768');
    assert.equal(heard(35, SOUNDER.interest), 484);
    assert.equal(heard(35, SOUNDER.commit), 399);
    assert.ok(1950 > 933, '§7: and 1,950 m is outside every one of those');
    // §7 — it grinds hulls of 95 m and up, and only two on the party qualify.
    assert.equal(CRUISER.hullLengthM, 130);
    assert.equal(CORVETTE.hullLengthM, 80);
  });
});

describe('the objective, as docs/mission-second-chord.md §8 counts it', () => {
  it('reads seven rows, four terminal, one keystone and one unrankable', () => {
    assert.deepEqual(
      M.objectives.map((row) => [row.id, row.terminal === true, row.keystone === true]),
      [
        ['the-lattice', true, true],
        ['the-choirmaster', true, false],
        ['the-escort', true, false],
        ['the-carriers', true, false],
        ['the-transmission', false, false],
        ['the-lip', false, false],
        ['the-count', false, false],
      ],
      '§8: four terminal rows and one keystone; the transmission is not on the ladder'
    );
    assert.deepEqual(objective('the-lattice').predicate, {
      kind: 'extract',
      role: 'carrier',
      region: 'chord-water',
      count: 2,
      loaded: true,
    });
    assert.deepEqual(objective('the-choirmaster').predicate, {
      kind: 'survive',
      role: 'tender',
      count: 1,
    });
    assert.deepEqual(objective('the-escort').predicate, {
      kind: 'survive',
      role: 'escort',
      count: 3,
    });
    assert.deepEqual(objective('the-carriers').predicate, {
      kind: 'survive',
      role: 'carrier',
      count: 2,
    });
    assert.deepEqual(objective('the-transmission').predicate, { kind: 'sound', count: 1 });
    assert.deepEqual(objective('the-lip').predicate, { kind: 'attend', count: 3 });
    assert.deepEqual(objective('the-count').predicate, {
      kind: 'tolerance',
      ticks: 30 * SIM.TICK_HZ,
      tier: ResolutionTier.Classification,
    });
    for (const row of M.objectives) {
      assert.equal(row.initial, ObjectiveStatus.Pending);
      assert.ok(row.reading !== undefined, `${row.id}: §8 hangs a reading off every row`);
    }
  });

  it('reveals the transmission at the Collapse and nothing else late', () => {
    assert.equal(objective('the-transmission').revealAtTick, COLLAPSE, '§8: revealed 16:00');
    for (const row of M.objectives) {
      if (row.id === 'the-transmission') continue;
      assert.equal(row.revealAtTick, undefined, `${row.id}: §8 reveals it at 00:00`);
    }
    assert.ok(
      M.beats.some((beat) => beat.atTick === COLLAPSE),
      'a reveal needs a beat under it'
    );
    // §8 — the two markers, and the objective each one is shipped with.
    assert.equal(objective('the-lattice').markerId, 'the-chord');
    assert.equal(objective('the-transmission').markerId, 'the-mouth');
    assert.deepEqual(
      M.markers.map((marker) => [marker.id, marker.x, marker.y, marker.radiusM]),
      [
        ['the-chord', 4800, 3150, 500],
        ['the-mouth', 4800, 3550, 400],
      ]
    );
  });

  it('rigs two gift-run loads and one sounding at the scale’s ceiling', () => {
    assert.equal(M.lifts!.length, 2);
    for (const lift of M.lifts!) {
      assert.equal(lift.region, 'the-cache');
      assert.equal(lift.cutTicks, 0, '§3: Tend’s gift-run form — the cut happened yesterday');
      assert.equal(lift.cutSig, 0, '§3: nothing is being cut, so nothing hums');
      const carrier = unit(lift.tag);
      assert.equal(carrier.role, 'carrier');
      const cache = M.regions.find((region) => region.id === 'the-cache')!;
      assert.ok(
        carrier.x >= cache.x &&
          carrier.x <= cache.x + cache.widthM &&
          carrier.y >= cache.y &&
          carrier.y <= cache.y + cache.heightM,
        `${lift.tag} is seated outside the cache, so the load never rigs`
      );
    }
    assert.equal(M.soundings!.length, 1, '§8, §13: `sound` names none, and there is exactly one');
    const tone = M.soundings![0]!;
    assert.deepEqual(
      [tone.id, tone.tag, tone.x, tone.y, tone.radiusM, tone.holdTicks, tone.sig],
      ['the-second-chord', 'the-choirmaster', 4800, 3550, 400, 30 * SIM.TICK_HZ, 100],
      '§3: thirty seconds at the hundredth, tagged to the Choirmaster’s hull'
    );
    assert.equal(tone.sig, M.sigBudget, '§4: the budget is the sentence');
    // §4, §6 — and the two figures the geometry turns on.
    assert.equal(away(STAGING_SEAT, MOUTH), 3715, '§4: 3,715 m from where she is sitting');
    assert.equal(
      away(STAGING_SEAT, { x: 4800, y: 3200 }),
      3413,
      '§6: 3,413 m to the Chord’s water'
    );
    assert.equal(Number((3413 / DEPTH.DESCENT_RATE_MPS).toFixed(1)), 75.8, '§6: 75.8 s at 45 m/s');
    assert.equal(CRUISER.speed, 45);
    // §6 — the arrival bearing against the aim, and the cone's forty-five.
    const arrival = (Math.atan2(3200 - 300, 4800 - 3000) * 180) / Math.PI;
    const aim = (Math.atan2(MOUTH.y - 3200, MOUTH.x - 4800) * 180) / Math.PI;
    assert.equal(Math.round(aim - arrival), 32, '§6: 32° off the bearing she arrived on');
    assert.ok(aim - arrival < 45, '§6: inside the cone, and nobody had to author it');
  });

  it('reads §8’s three results and the seven rows in §8’s own words', () => {
    assert.equal(
      M.epilogue[MissionOutcome.Complete].startsWith('The crystal is set and every hull answers'),
      true
    );
    assert.equal(
      M.epilogue[MissionOutcome.Partial].startsWith('The crystal is set and the Order is short.'),
      true
    );
    assert.equal(M.epilogue[MissionOutcome.Lost].startsWith('Nothing is set.'), true);
    for (const outcome of [MissionOutcome.Complete, MissionOutcome.Partial]) {
      assert.ok(
        M.epilogue[outcome].includes('nothing with which to do it twice') ||
          M.epilogue[outcome].includes('thirty thousand'),
        '§8: the cost of thirty thousand people, stated without a reply'
      );
    }
    assert.ok(
      !M.epilogue[MissionOutcome.Complete].includes('Transmitted'),
      '§8: the Complete reading does not say *Transmitted*'
    );
    assert.equal(
      objective('the-transmission').reading!.met,
      'Transmitted. The reply is not entered here.'
    );
    assert.equal(
      objective('the-transmission').reading!.unmet,
      'The Chord stood, whole, and was not struck. The Voice did not refuse; the interval passed, which is the same thing said courteously.'
    );
    assert.equal(objective('the-lattice').reading!.met, 'The crystal is set. The Chord is whole.');
  });
});

describe('the beats, as docs/mission-second-chord.md §9 schedules them', () => {
  it('closes at 18:00 on a resolve that is not a conclusion, ninety seconds behind the basin', () => {
    assert.equal(resolveBeat.atTick, CLOSE);
    assert.equal(resolveBeat.atTick / SIM.TICK_HZ, 1080, '§9: the resolve lands at 1,080');
    assert.equal(resolveBeat.conclusion, undefined, '§9: this mission can be lost');
    assert.deepEqual(M.lengthBandS, [1020, 1140], '§9: the header’s band');
    assert.ok(
      M.lengthBandS[0] >= MISSION.LENGTH_MIN_S && M.lengthBandS[1] <= MISSION.LENGTH_MAX_S,
      'inside campaign.md §10’s 12–25'
    );
    const loud = creatures.filter((beat) => beat.loud);
    assert.equal(loud.length, 1);
    assert.equal((resolveBeat.atTick - loud[0]!.atTick) / SIM.TICK_HZ, 90, '§9: ninety seconds');
    assert.ok(90 >= MISSION.FAILURE_TELEGRAPH_S, '§9: against §10’s sixty');
    assert.equal(M.runsItsLength, true, '§9: and only the resolve closes it');
    // §1, §6 — the interval Sull appoints is the seventeenth minute, and it
    // begins the tick the lip's return stops: sixty seconds of tide between
    // the window closing and the count being read, with the tone's thirty
    // held fourteen seconds into it.
    assert.equal(
      (resolveBeat.atTick - emitter('the-return').untilTick!) / SIM.TICK_HZ,
      60,
      '§6: the seventeenth minute, which is the whole of what is left'
    );
  });

  it('says §12’s nine voices, at §9’s nine ticks, and none at tick zero', () => {
    assert.deepEqual(
      says.map((beat) => [beat.atTick / SIM.TICK_HZ, beat.speaker]),
      [
        [60, 'Choirmaster Ivane Sull, the order to descend'],
        [270, 'Cohort-Prime Adze, 9th Trench Cohort'],
        [360, 'The charting pair, for the plateaus'],
        [480, 'Watch-Speaker, for those below'],
        [720, 'Voice Ren Kalliso, once, to nobody'],
        [930, 'Choirmaster Ivane Sull, at the release'],
        [960, 'Choirmaster Ivane Sull, at the Collapse'],
        [960, 'Chapter-Master Halden Vrey, on the lattice from the Third'],
        [1020, 'Choirmaster Ivane Sull, on the way down'],
      ],
      '§9, §12: and the 00:00 row is the seating and the briefing, not a line'
    );
    // §12's nine, verbatim and in order. Held here rather than trusted,
    // because the register *is* the mission: a line reworded in the literal
    // and nowhere else would ship a Knight speaking somebody else's language
    // with a green suite. Kalliso's is the only one that counts two kinds of
    // number in one breath, and Vrey's six words are a refusal that only means
    // something where silence is written down and played.
    assert.deepEqual(
      says.map((beat) => beat.text),
      [
        'The interval is at seventeen. The lattice comes down at sixteen; I come down at half past fifteen and I am over the slopes when it goes. Set the crystal and hold the lip. Descend.',
        'Correction is filed against the node on the lip. It was entered when it rose and stood into nothing; it stands into the watch now. What was set into it is counted. What is under it is corrected at what leaves.',
        "We're still here, on the terraces. We'd like it in somebody's record that we asked nothing of the rim and it asked nothing of us. We think you're about to ask it something.",
        'The rim is attended. Three nodes are entered. The third was entered when it was raised and was not corrected, because a node with nothing under it is a silence, and silence is attended too.',
        'Nineteen were the cadre. Twenty-two years are mine, since nine. Thirty seconds are the Order’s. I would like it entered that I counted, and that the numbers are not the same kind of number.',
        'I am coming down, with ears. Half a minute of slopes and the lattice goes under me.',
        'The lattice is spent. Everything below the line and outside the Chord’s six hundred is bleeding from this tick. Hold the lip.',
        'I hear it. Enter that I said nothing else.',
        'The interval.',
      ],
      '§12: the voices in the water, word for word'
    );
  });

  it('spends the lattice at 16:00 and nothing else', () => {
    assert.deepEqual(
      loses.map((beat) => [beat.atTick, beat.tag]),
      [
        [COLLAPSE, 'node-one'],
        [COLLAPSE, 'node-two'],
      ],
      '§4, §9: two grants, and never the Chord'
    );
    assert.ok(
      !loses.some((beat) => beat.tag === 'the-chord'),
      '§4: what the Collapse spends is two grants and not the instrument'
    );
    // §9 — beats ascend, and the ones that matter land where the document says.
    let previous = -1;
    for (const beat of M.beats) {
      assert.ok(beat.atTick >= previous, `a beat at ${beat.atTick} is behind ${previous}`);
      previous = beat.atTick;
    }
  });

  it('hangs three conditional lines off conditions that cannot fire at tick zero', () => {
    const conditions = M.conditionalBeats ?? [];
    assert.equal(conditions.length, 3, '§9: three, printed rather than clocked');
    assert.deepEqual(
      conditions.map((beat) => beat.when),
      [
        { kind: 'extract', role: 'carrier', region: 'chord-water', count: 2, loaded: true },
        { kind: 'sound', count: 1 },
        { kind: 'tolerance', ticks: 30 * SIM.TICK_HZ, tier: ResolutionTier.Classification },
      ]
    );
    for (const beat of conditions) {
      assert.equal(beat.kind, 'say');
      assert.equal(beat.choiceGroup, undefined, '§9: these three are not a choice');
    }
    assert.equal(
      conditions[1]!.kind === 'say' ? conditions[1]!.text : '',
      'Transmitted. — I have nothing to add and the Order has nothing left to add it with.'
    );
  });
});

/**
 * Three tides, played out. Everything above is readable from the table; none of
 * this is — a rim that is cold because the format left no other word for
 * attending, a keystone whose water is only habitable because a structure says
 * so, a tone with no depth in it, and a tender that cannot cross the map
 * without somebody to hear for it.
 */
describe('the tide, run out — docs/mission-second-chord.md §4, §8 and §9', () => {
  interface Run {
    outcome: MissionOutcome;
    epilogue: string;
    statuses: Map<string, ObjectiveStatus>;
    metAt: Map<string, number>;
    closedAtTick: number;
    chordHpFloor: number;
    match: Match;
  }

  function newMatch(): Match {
    return new Match(missionMapById(M.mapId)!, { mission: M, fauna: false, seed: 11 });
  }

  const mine = (match: Match, kind: UnitKind): number[] =>
    hulls(match.world).filter((eid) => Owner.slot[eid] === PLAYER && Unit.kind[eid] === kind);

  /**
   * The player's own hull nearest an authored seat.
   *
   * By seat and not by coordinate, because unit separation moves a hull off its
   * authored metres on the first tick — six of them open inside 600 m of each
   * other over the cache. A test that looked one up by the number in §11's
   * table would find the wrong hull or none.
   */
  const nearest = (match: Match, kind: UnitKind, seat: { x: number; y: number }): number =>
    mine(match, kind).sort(
      (a, b) =>
        Math.hypot(Position.x[a]! - seat.x, Position.y[a]! - seat.y) -
        Math.hypot(Position.x[b]! - seat.x, Position.y[b]! - seat.y)
    )[0]!;

  /** The Chord itself, by the coordinates the literal seats it at. */
  const chordOf = (match: Match): number =>
    structures(match.world).find(
      (eid) =>
        Structure.kind[eid] === StructureKind.SoundingSpire &&
        Math.round(Position.x[eid]!) === CHORD.x
    )!;

  /** Run the tide out, letting `drive` give orders on whatever ticks it wants. */
  function play(drive?: (match: Match, tick: number) => void, until = CLOSE + SIM.TICK_HZ): Run {
    const match = newMatch();
    const statuses = new Map<string, ObjectiveStatus>();
    const metAt = new Map<string, number>();
    let chordHpFloor = SPIRE.maxHp;
    let tick = 0;
    for (; tick <= until; tick++) {
      drive?.(match, tick);
      match.update(STEP_MS);
      const view = match.takeMissionView();
      for (const row of view?.objectives ?? []) {
        statuses.set(row.id, row.status);
        if (row.status === ObjectiveStatus.Met && !metAt.has(row.id)) metAt.set(row.id, tick);
      }
      const chord = chordOf(match);
      if (chord !== undefined) chordHpFloor = Math.min(chordHpFloor, Health.hp[chord] ?? 0);
      if (match.missionOver !== null) break;
    }
    const over = match.missionOver;
    return {
      outcome: over?.outcome ?? MissionOutcome.Lost,
      epilogue: over?.epilogue ?? '',
      statuses,
      metAt,
      closedAtTick: match.world.tick,
      chordHpFloor,
      match,
    };
  }

  it('leaves the Chord untouched through a tide nobody drives — §4, §13', () => {
    // The row §13 exists for, played rather than reasoned. Armed, the watch
    // stands 206 m from an 1,800 HP Spire with a 650 m gun and `combat.ts`
    // auto-acquires it, because a structure carries Position, Owner and Health
    // like anything else; the node was measured at hp −40 at 20.0 s. Cold, it
    // is untouched a full minute in — three times the tick an armed watch
    // would have finished it on — which is §1's sentence, and the only way the
    // format can write it. The case below carries the same reading to 18:00.
    const run = play(undefined, T(1));
    assert.equal(run.chordHpFloor, SPIRE.maxHp, 'something corrected the node');
    const chord = chordOf(run.match);
    assert.equal(Health.hp[chord], SPIRE.maxHp);
    assert.equal(
      run.match.world.spireActive.has(chord),
      false,
      '§7: idle at thirty, nobody under it'
    );
    // And the record the rim keeps of it, which needs no gun at all: three
    // Spires at SIG 30, one of them 320 m from a Cantor.
    // Thirty seconds of tally, accrued one Echo interval per mission pass, and
    // the passes land at 11, 23, 35 … — so the hundred and fiftieth is world
    // tick 1,799, a sixtieth of a second short of the half minute. §8's "about
    // 00:30", to the tick.
    assert.equal(
      run.metAt.get('the-count'),
      150 * ECHO_TICK_INTERVAL - 1,
      '§8: `the-count` is met by about 00:30, and that is the design'
    );
    assert.equal(150 * ECHO_TICK_INTERVAL, 30 * SIM.TICK_HZ);
    assert.equal(
      1800 / ECHO_TICK_INTERVAL,
      150,
      '§8: a hundred and fifty passes of thirty seconds'
    );
  });

  it('runs its length and reads Lost on the keystone when nobody sets the crystal', () => {
    // §9's flag, spent for the opposite reason to Intake's: the three `survive`
    // rows are Met from the first pass, six hulls being six, so without
    // `runsItsLength` the court would still have to wait — but the keystone is
    // what keeps this honest, and unmet it reads Lost whatever else answered.
    const run = play();
    assert.equal(run.closedAtTick, CLOSE, '§9: the resolve at 18:00 and nothing earlier');
    assert.equal(run.outcome, MissionOutcome.Lost, '§8: an unmet keystone is Lost');
    assert.equal(run.statuses.get('the-lattice'), ObjectiveStatus.Pending);
    for (const id of ['the-choirmaster', 'the-escort', 'the-carriers']) {
      assert.equal(run.statuses.get(id), ObjectiveStatus.Met, `${id}: nobody was entered`);
    }
    assert.equal(run.statuses.get('the-transmission'), ObjectiveStatus.Pending);
    assert.ok(run.epilogue.startsWith('Nothing is set.'), '§8: Sull’s third reading');
    assert.ok(
      run.epilogue.includes('The Chord stood, whole, and was not struck.'),
      '§8: the unstruck record, printed beneath a Lost count and ranked by nobody'
    );
    // §13 — the return's own line prints at the close whatever the predicate
    // said, and in a tide where nothing left the Staging it is the *gap*: SIG 3
    // is Bearing to the Voice from 808 m and the return sounds 3,900 m away.
    // "The Order does not keep a gap; it keeps that it was not listening."
    assert.ok(
      run.epilogue.includes('Not entered: the return on the lip.'),
      '§13: the return’s own line prints at the close whatever the predicate said'
    );
    assert.ok(
      !run.epilogue.includes('Entered: the return on the lip, at the sixteenth minute'),
      'and the entered line is not printed beside it'
    );
    assert.equal(run.chordHpFloor, SPIRE.maxHp, '§4: and nothing on the rim ever touched the node');
  });

  it('plays the tide: the crystal set under the node, the lattice spent, the tone held', () => {
    // The mission as §6's clock describes it, driven. The carriers cross at
    // 1,750 m — free on every floor of this chart — dive the last 1,250 m
    // inside the Chord's six hundred, stand in `chord-water` loaded, climb out
    // before the Collapse, and the Choirmaster comes down on her release with
    // one hull for ears and holds thirty seconds at the hundredth.
    let carriers: number[] = [];
    let choirmaster = 0;
    let ears = 0;
    const run = play((match, tick) => {
      if (tick === 24) {
        carriers = [
          nearest(match, UnitKind.Corvette, { x: 2900, y: 600 }),
          nearest(match, UnitKind.Corvette, { x: 3100, y: 600 }),
        ];
        choirmaster = nearest(match, UnitKind.Cruiser, STAGING_SEAT);
        ears = nearest(match, UnitKind.Corvette, { x: 3300, y: 450 });
        match.orderMove(PLAYER, carriers[0]!, 4700, 3250);
        match.orderMove(PLAYER, carriers[1]!, 4900, 3250);
        for (const eid of carriers) match.orderDepth(PLAYER, eid, 1750);
      }
      // 01:00 — the last 1,250 m, taken inside the grant.
      if (tick === T(1)) for (const eid of carriers) match.orderDepth(PLAYER, eid, DEPTH.MAX_M);
      // 13:00 — up out of the Abyssal band before the lattice comes down.
      if (tick === T(13)) for (const eid of carriers) match.orderDepth(PLAYER, eid, 1750);
      if (tick === T(15)) {
        match.orderMove(PLAYER, carriers[0]!, 2900, 600);
        match.orderMove(PLAYER, carriers[1]!, 3100, 600);
      }
      // 15:30 — the release, and the run at the interval.
      if (tick === RELEASE + ECHO_TICK_INTERVAL * 2) {
        match.orderMove(PLAYER, choirmaster, MOUTH.x, MOUTH.y);
        match.orderDepth(PLAYER, choirmaster, 1750);
      }
      // And the escort that lets her move at all: `escortRadiusM` is 600, so
      // the one hull for ears is shepherded rather than sent ahead.
      if (tick > RELEASE + ECHO_TICK_INTERVAL * 2 && tick % 30 === 0) {
        const gap = Math.hypot(
          Position.x[ears]! - Position.x[choirmaster]!,
          Position.y[ears]! - Position.y[choirmaster]!
        );
        if (gap > 250) {
          match.orderMove(PLAYER, ears, Position.x[choirmaster]!, Position.y[choirmaster]!);
        }
      }
    });

    assert.equal(run.closedAtTick, CLOSE, '§9: eighteen minutes, whatever came home early');
    assert.equal(run.outcome, MissionOutcome.Complete, '§8: the Chord whole and the Order whole');
    for (const row of M.objectives) {
      assert.equal(run.statuses.get(row.id), ObjectiveStatus.Met, `${row.id} was not met`);
    }
    assert.ok(run.epilogue.startsWith('The crystal is set and every hull answers the count.'));
    assert.ok(
      run.epilogue.includes('Transmitted. The reply is not entered here.'),
      '§8: printed beneath the count, ranked by nobody'
    );
    assert.ok(
      run.epilogue.includes('Three returns were heard on this lip'),
      '§8: three attendable returns, and all three entered'
    );
    // §4 — the node stood the whole tide, and it sang while the crystal was
    // being set into it, because the grant under the carriers was load-bearing.
    assert.equal(run.chordHpFloor, SPIRE.maxHp);
    // §6 — the tone completes in the seventeenth minute, which is the distance
    // divided by forty-five and not a line in a briefing.
    const tone = run.metAt.get('the-transmission')!;
    assert.ok(tone > RELEASE, 'the tone cannot be taken before the release');
    assert.ok(
      Math.abs(tone - T(17, 14)) <= 5 * SIM.TICK_HZ,
      `§6: the tone lands at about 17:14, and landed at ${(tone / SIM.TICK_HZ).toFixed(0)}s`
    );
    assert.ok(tone < CLOSE, '§9: the tone is held inside the tide, not across its end');
    // §9's "the last forty seconds are the reply not being shown" is the
    // *undived* reading — from 1,750 m she is inside the sounding's radius at
    // about 16:45 and finished by about 17:16, which leaves forty-four. Played
    // as §6's own clock authors it the silence is sixteen seconds, and what
    // the literal actually guarantees is the shape rather than the figure:
    // nothing at all is authored between the tone and the close but the
    // `resolve`, and §13 says that gap must not acquire anything.
    assert.deepEqual(
      M.beats.filter((beat) => beat.atTick > tone).map((beat) => beat.kind),
      ['resolve'],
      '§13: the reply is a gap, and nothing is scheduled inside it'
    );
    // §6, §13 — and she played it from 1,750 m. `soundingHolds` is a hypot and
    // a cone with no depth term, so the tone the document asks for from under
    // the instrument is taken twelve hundred and fifty metres above it.
    assert.equal(Math.round(Position.depth[choirmaster]!), 1750);
    assert.equal(DEPTH.MAX_M - 1750, 1250, '§6: the dive the literal cannot require');
    assert.equal(requiredPressureRating(1750), CRUISER.pressureRating, '§6: and never paid for');
  });

  it('sets the crystal into water a PR-2 hull only holds because the node says so', () => {
    // §8, §13, and the second half of finding 1: `chord-water` is entirely
    // inside the Chord's six hundred, and 3,000 m needs PR-3. The carriers are
    // PR-2 with no refit, so the grant is the whole reason the keystone is
    // reachable at the depth the fiction asks for — which is why a rim that
    // corrected the node would have ended the mission rather than complicated
    // it.
    let carriers: number[] = [];
    const match = newMatch();
    for (let tick = 0; tick <= T(2); tick++) {
      if (tick === 24) {
        carriers = [
          nearest(match, UnitKind.Corvette, { x: 2900, y: 600 }),
          nearest(match, UnitKind.Corvette, { x: 3100, y: 600 }),
        ];
        match.orderMove(PLAYER, carriers[0]!, 4700, 3250);
        match.orderMove(PLAYER, carriers[1]!, 4900, 3250);
        for (const eid of carriers) match.orderDepth(PLAYER, eid, 1750);
      }
      if (tick === T(1)) {
        for (const eid of carriers) {
          assert.equal(match.orderDepth(PLAYER, eid, DEPTH.MAX_M), true, 'the order is accepted');
        }
      }
      match.update(STEP_MS);
      match.takeMissionView();
    }
    const chord = chordOf(match);
    for (const eid of carriers) {
      assert.equal(Math.round(Position.depth[eid]!), DEPTH.MAX_M, 'a carrier is under the node');
      assert.ok(
        Math.hypot(Position.x[eid]! - CHORD.x, Position.y[eid]! - CHORD.y) <
          STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M,
        'and inside its six hundred, measured horizontally'
      );
      assert.equal(Pressure.rating[eid], 2, '§3: PR-2, and the Hadron baseline is the same two');
      assert.equal(Pressure.bonus[eid], 1, '§4: the node grants it the metre it is standing on');
      assert.equal(
        Pressure.rating[eid]! + Pressure.bonus[eid]!,
        requiredPressureRating(DEPTH.MAX_M),
        'which is exactly what this water asks for'
      );
      assert.equal(
        Pressure.unhealable[eid],
        0,
        'so nothing crushes, 1,200 m under its certificate'
      );
    }
    assert.equal(
      match.world.spireActive.has(chord),
      true,
      '§4: and the node sings at eighty for as long as that grant is load-bearing'
    );
    assert.equal(Health.hp[chord], SPIRE.maxHp, 'with nothing on the rim shooting at it');
  });

  it('latches the keystone from the transit depth, with the node idle at thirty', () => {
    // §8's other gap, and §13's: "a rectangle is not a room". `inRegion` tests
    // x and y and nothing else, so a player who never dives sets the crystal
    // with the Chord humming at thirty and the whole rented rating unspent.
    // Driven from the Staging's own 1,400 m rather than §8's 1,750, because
    // the shallower reading is the harder one and the region cannot tell the
    // difference. Stated here rather than discovered, because it is the shape
    // the same `depthMaxM?` would close on both types.
    let carriers: number[] = [];
    const match = newMatch();
    let latched = -1;
    for (let tick = 0; tick <= T(2) && latched < 0; tick++) {
      if (tick === 24) {
        carriers = [
          nearest(match, UnitKind.Corvette, { x: 2900, y: 600 }),
          nearest(match, UnitKind.Corvette, { x: 3100, y: 600 }),
        ];
        match.orderMove(PLAYER, carriers[0]!, 4700, 3250);
        match.orderMove(PLAYER, carriers[1]!, 4900, 3250);
      }
      match.update(STEP_MS);
      const view = match.takeMissionView();
      const row = view?.objectives.find((o) => o.id === 'the-lattice');
      if (row?.status === ObjectiveStatus.Met) latched = tick;
    }
    assert.ok(latched > 0, 'the keystone never latched');
    assert.ok(
      latched < T(1),
      `§13: latched at ${(latched / SIM.TICK_HZ).toFixed(0)}s, before a minute`
    );
    for (const eid of carriers) {
      assert.equal(Math.round(Position.depth[eid]!), 1400, 'never left the Staging’s own depth');
      assert.equal(Pressure.unhealable[eid], 0);
    }
    assert.equal(
      match.world.spireActive.has(chordOf(match)),
      false,
      '§8: the node’s own silence is the tell that nobody is under it'
    );
  });

  it('refuses an order to a held hull, and strands a tender whose ears walked off', () => {
    // §13's row, and the half of it the runtime has since closed: `holdsMovement`
    // resolves `tagOfHeld` before `tagOfTender`, so `releaseTick` binds by tag
    // whatever the role and `escort-b` is genuinely held rather than
    // documentation. Both halves are played here — the refusal before 15:30,
    // and what the escort rule does to a Choirmaster whose one hull for ears
    // was sent to the lip instead.
    const match = newMatch();
    const run = (n: number) => {
      for (let i = 0; i < n; i++) {
        match.update(STEP_MS);
        match.takeMissionView();
      }
    };
    run(ECHO_TICK_INTERVAL * 2);
    const choirmaster = nearest(match, UnitKind.Cruiser, STAGING_SEAT);
    const ears = nearest(match, UnitKind.Corvette, { x: 3300, y: 450 });
    const seats = [
      { eid: choirmaster, x: Position.x[choirmaster]!, y: Position.y[choirmaster]! },
      { eid: ears, x: Position.x[ears]!, y: Position.y[ears]! },
    ];
    for (const held of seats) match.orderMove(PLAYER, held.eid, MOUTH.x, MOUTH.y);
    run(5 * SIM.TICK_HZ);
    for (const held of seats) {
      assert.equal(Math.round(Position.x[held.eid]!), Math.round(held.x), 'a held hull moved');
      assert.equal(Math.round(Position.y[held.eid]!), Math.round(held.y));
    }
    // Past the release, the escort takes an order — and takes it far enough
    // away that the tender cannot follow, which is §4's second playtest and
    // §13's "a legitimate and audible way to reach the unstruck record".
    while (match.world.tick < RELEASE + ECHO_TICK_INTERVAL * 2) run(1);
    match.orderMove(PLAYER, ears, MOUTH.x, MOUTH.y);
    match.orderMove(PLAYER, choirmaster, MOUTH.x, MOUTH.y);
    run(60 * SIM.TICK_HZ);
    assert.ok(
      Math.hypot(Position.x[ears]! - seats[1]!.x, Position.y[ears]! - seats[1]!.y) > 2000,
      'the escort was released and went'
    );
    const stranded = Math.hypot(
      Position.x[choirmaster]! - MOUTH.x,
      Position.y[choirmaster]! - MOUTH.y
    );
    assert.ok(
      stranded > 2000,
      `§13: the Choirmaster is stranded ${stranded.toFixed(0)} m short of the interval`
    );
    assert.ok(
      Math.hypot(Position.x[choirmaster]! - seats[0]!.x, Position.y[choirmaster]! - seats[0]!.y) <
        M.escortRadiusM * 2,
      'and never got far from the Staging at all'
    );
  });
});
