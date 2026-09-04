/**
 * The Second Chord 6, read and run — docs/mission-rim-deposits.md.
 *
 * `missions.test.ts` holds every mission to campaign.md §10's conventions; this
 * file holds The Rim Deposits to the things only its own document claims, and
 * to the one system it is the first mission in the bible to spend:
 *
 * - **The map is Prospect's, unchanged** (§11). "The same terrain four times and
 *   never the same mission" is applied literally, so the strongest thing this
 *   file can say about `mouth-rim` is that this mission did not touch it.
 * - **The rented rating, played rather than read** (§4, §13). A Sounding Spire
 *   grants PR+1 inside 600 m to its own commander's hulls, measured
 *   horizontally from the instrument, and sings at eighty for exactly as long
 *   as that grant is load-bearing. All of that is a claim about what happens at
 *   60 Hz to a hull standing in a particular place, which is what reading a
 *   table cannot establish — so one cutter is driven under node-one, held at
 *   the crystal's depth and climbed back out, and a second is stood on §6's own
 *   worked example of a hull outside both grants and left to bleed at 4 HP/s,
 *   and the nodes' own voices are read off `world.spireActive` at each step.
 * - **The correction's geometry** (§6, §9). Twelve authored stops, and eight
 *   distance claims the document makes about them: 180–335 m from node-one,
 *   150–269 m from node-two, 400 m or more from a cutter on the fourth face,
 *   320–461 m from one on the sixth, one stop 150 m off the fourth face's
 *   eastern edge, one 100 m off the sixth's north-western corner, and two
 *   transits of 1,521–1,724 m and 1,185–1,485 m at the Chorister's 40 m/s.
 * - **What is heard** (§7). Every range in §7 recomputed against the shipped
 *   propagation model, because the document states them to the metre and a
 *   mission whose whole subject is an instrument singing at eighty is worth
 *   holding to its own arithmetic.
 * - **The two traps this literal walks past** (§8, §9). Six terminal rows, none
 *   met at tick zero — the mission does not close on its first pass, and it
 *   carries no `runsItsLength` to save it if one ever were. And `the-count`,
 *   which is Met by about 00:30 before the descent has finished, and is
 *   non-terminal for exactly that reason.
 * - **One finding against the runtime**, played out on the mission so the day
 *   it is settled is noticed: `applyLifts` accrues every lift whose carrier is
 *   standing in its region on the same pass, so the two loads §6 puts on one
 *   face rig together at four minutes rather than in the eight §6 and §9
 *   describe, and both of §8's rows for them latch off one hold.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_SONAR,
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
import { CHORD_RIM_DEPOSITS } from '../src/sim/missions/rimDeposits.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
const PLAYER = CHORD_RIM_DEPOSITS.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const hulls = defineQuery([Unit, Owner, Position]);
const structures = defineQuery([Structure, Owner, Position]);

/** §6, §11 — the two nodes, and the three faces they are sited over. */
const NODE_ONE = { x: 3750, y: 2500 };
const NODE_TWO = { x: 4900, y: 2600 };
/** §6 — the concern's own chart of the three faces nearest the lip. */
const FACE_FOUR = { x: 3500, y: 2600 };
const FACE_FIVE = { x: 4300, y: 2350 };
const FACE_SIX = { x: 5100, y: 2700 };
const DOME = { x: 5000, y: 3400 };
const BED = { x: 1250, y: 3250 };

const TERRACES_PF = PROPAGATION_FACTOR[Biome.ResonanceField];
const LIP_PF = PROPAGATION_FACTOR[Biome.AbyssalTrench];
const OPEN_PF = PROPAGATION_FACTOR[Biome.OpenWater];

const CORVETTE = statsFor(UnitKind.Corvette);
const CRUISER = statsFor(UnitKind.Cruiser);
const CHORISTER = statsFor(UnitKind.Chorister);
const SPIRE = structureStatsFor(StructureKind.SoundingSpire);
const CANTOR = structureStatsFor(StructureKind.Cantor);
const VEIL = structureStatsFor(StructureKind.SporeVeil);
const SOUNDER = faunaStatsFor(FaunaSpecies.Sounder);

/** The dome-lifted ear the whole of §7 is priced against: HYD 75 + 25, capped. */
const LIFTED_HYD = STRUCTURE_AURAS.CANTOR.HYD_CAP;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** The range at which SIG through water of this PF reaches HYD at a tier's multiple. */
function rangeAt(sig: number, hyd: number, pf: number, multiple: number): number {
  let low = 1;
  let high = 40000;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (detectionRatio(sig, pf, mid, hyd) >= multiple) low = mid;
    else high = mid;
  }
  return Math.round(low);
}

/** The mission's own party, and the six hulls on it, by tag. */
const raid = CHORD_RIM_DEPOSITS.parties.find((party) => party.slot === PLAYER)!;
const unitByTag = (tag: string) => raid.units.find((unit) => unit.tag === tag)!;
const objectiveById = (id: string) =>
  CHORD_RIM_DEPOSITS.objectives.find((objective) => objective.id === id)!;
const beatsAt = (tick: number) => CHORD_RIM_DEPOSITS.beats.filter((beat) => beat.atTick === tick);

/** Every stop a `move` beat sends a named cohort hull to, at the correction ticks. */
function stopsAt(tick: number): { tag: string; x: number; y: number; depthM?: number }[] {
  return beatsAt(tick)
    .filter((beat) => beat.kind === 'move' && beat.tag.startsWith('cohort-'))
    .map((beat) => {
      if (beat.kind !== 'move') throw new Error('unreachable');
      return { tag: beat.tag, x: beat.x, y: beat.y, depthM: beat.depthM };
    });
}

describe('the Rim, as docs/mission-rim-deposits.md §11 reuses it', () => {
  it('is Prospect’s map, untouched — same rectangles, floors, biomes and spawn', () => {
    // §11: "Reused unchanged — the literal is mouthRim.ts, authored for
    // Prospect §11 and untouched by this mission, as First Arrival left it."
    // campaign.md §8's "the same terrain four times and never the same
    // mission" applied literally, so the strongest claim this mission makes
    // about its own map is that it did not touch it.
    assert.equal(CHORD_RIM_DEPOSITS.mapId, 'mouth-rim');
    assert.equal(missionMapById(CHORD_RIM_DEPOSITS.mapId), MOUTH_RIM);
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
    assert.equal(MOUTH_RIM.widthM, 6000);
    assert.equal(MOUTH_RIM.heightM, 4000);
    assert.equal(MOUTH_RIM.cellM, 250);
    assert.equal(MOUTH_RIM.floorM, 2600, '§11: base floor 2,600');
    for (const region of MOUTH_RIM.regions) {
      for (const metres of [region.x, region.y, region.widthM, region.heightM]) {
        assert.equal(metres % MOUTH_RIM.cellM, 0, `${region.note}: off the 250 m cell grid`);
      }
    }
    assert.deepEqual(
      MOUTH_RIM.spawns.map((spawn) => [spawn.x, spawn.y]),
      [[3000, 500]],
      '§11: one spawn, and it is irrelevant — every party is seated'
    );
    assert.deepEqual(MOUTH_RIM.resources, [], '§11: no resources; the crystal is five loads');
    assert.deepEqual(MOUTH_RIM.hazards, [], '§11: no hazard sites');
    assert.equal(MOUTH_RIM.seats, 1, '§11: one seat, not balanced');
    assert.equal(mapById('mouth-rim'), undefined, '§11: not in the public catalogue');
  });

  it('puts the lip and the crystal bench four hundred metres apart, and 1.60 beside 0.70', () => {
    // §1's third fact about this water, and the reason the mission argues:
    // "PF 1.60 on the whole southern kilometre against PF 0.70 on the crystal
    // bench above it ... and the lip's own hulls stand 400 m below the ground
    // they will walk up onto."
    const terraces = MOUTH_RIM.regions[3]!;
    const lip = MOUTH_RIM.regions[4]!;
    assert.equal(PROPAGATION_FACTOR[terraces.biome], 0.7, '§1: the terraces scatter');
    assert.equal(PROPAGATION_FACTOR[lip.biome], 1.6, '§1: the lip carries like a trench');
    assert.equal(lip.floorM! - terraces.floorM!, 500, '§11: the lip is 500 m under the bench');
    assert.equal(
      lip.floorM! - DEPTH.MAX_M,
      100,
      '§11: no hull is ordered below 3,000 m because none can be, and the lip’s floor is 100 m under that'
    );
  });
});

describe('the raid, as docs/mission-rim-deposits.md §2 and §3 muster it', () => {
  it('is six hulls in Order colours, PR-2, no refit, armed, thirty-seven souls', () => {
    assert.equal(CHORD_RIM_DEPOSITS.playerFaction, Faction.Hadron);
    assert.equal(raid.units.length, 6, '§3: one Cruiser hull and five Corvettes');
    assert.equal(unitByTag('the-voice').kind, UnitKind.Cruiser);
    for (const unit of raid.units) {
      assert.equal(unit.armed, true, '§3, §13: weapons and torpedoes are live');
      assert.equal(
        unit.pressureRating,
        undefined,
        '§3: PR-2, no refit — every metre below 1,800 m is rented from a structure'
      );
      assert.equal(unit.depthM, 1400, '§11: seated at the Staging over a floor of 1,500');
      assert.equal(
        statsFor(unit.kind).pressureRating,
        2,
        'and PR-2 is what a Knight hull is born with'
      );
    }
    assert.equal(
      raid.units.reduce((total, unit) => total + (unit.souls ?? 0), 0),
      37,
      '§3: thirty-seven souls — twelve on the Voice and five on each Corvette'
    );
    // §3, §8 — three cutters and three of the escort, and the Voice carries the
    // same role, which is how §8's `escort` row counts three.
    const byRole = (role: string) => raid.units.filter((unit) => unit.role === role);
    assert.deepEqual(
      byRole('cutter').map((unit) => unit.tag),
      ['cutter-a', 'cutter-b', 'cutter-c']
    );
    assert.deepEqual(
      byRole('escort').map((unit) => unit.tag),
      ['the-voice', 'escort-a', 'escort-b']
    );
    // §8, §13 — a role is only ever on a player hull, so the count the player
    // is shown can never contain another party.
    for (const party of CHORD_RIM_DEPOSITS.parties) {
      if (party.slot === PLAYER) continue;
      assert.ok(
        party.units.every((unit) => unit.role === undefined),
        `${party.note}: a scripted hull carries a role`
      );
    }
  });

  it('stands two prebuilt nodes on the terraces, 1,154 m apart and not a pair', () => {
    // §3, §11, §13 — the nodes are `MissionStructure`s at the terrace floor,
    // because a player-raised structure sits at CONSTRUCTION.WORKING_DEPTH_M
    // wherever the ground is; construction is locked with a reason instead.
    const nodes = raid.structures ?? [];
    assert.equal(nodes.length, 2);
    for (const node of nodes) {
      assert.equal(node.kind, StructureKind.SoundingSpire);
      assert.equal(node.depthM, 2600, '§11: prebuilt at the terrace floor');
    }
    assert.deepEqual({ x: nodes[0]!.x, y: nodes[0]!.y }, NODE_ONE);
    assert.deepEqual({ x: nodes[1]!.x, y: nodes[1]!.y }, NODE_TWO);
    // §4 — "two nodes are not an interval". They stand well inside the range
    // the pairing rule spends and they do not pair, because that rule fires at
    // the moment a node *completes* and asks for a finished, unpaired node
    // already standing beside it, and these two were raised together. Asserted
    // rather than assumed, because the distance is the thing that makes the
    // sentence worth writing: it is inside the range and nothing happens.
    assert.equal(Math.round(dist(NODE_ONE, NODE_TWO)), 1154, '§3: 1,154 m apart');
    assert.ok(
      dist(NODE_ONE, NODE_TWO) < STANDING_WAVE.PAIR_RANGE_M,
      '§4: inside PAIR_RANGE_M, and the document says so on purpose'
    );
    // And no corridor is authored: nothing in this literal writes the water.
    assert.ok(
      CHORD_RIM_DEPOSITS.beats.every((beat) => beat.kind !== 'ground'),
      '§4: no corridor, no PF 2.00, and no ground beat that could sow one'
    );
  });

  it('locks construction with a reason and fences nothing else', () => {
    // §3, §13 — one authored lock, and the six that are not are the point.
    assert.deepEqual(
      CHORD_RIM_DEPOSITS.locks.map((lock) => lock.ability),
      ['construction']
    );
    assert.match(CHORD_RIM_DEPOSITS.locks[0]!.reason, /one Spire left in it/, '§3, in register');
    assert.equal(
      CHORD_RIM_DEPOSITS.sigBudget,
      SPIRE.sigActive,
      '§4, §9: the budget is the instrument singing'
    );
    assert.equal(CHORD_RIM_DEPOSITS.sigBudget, 80);
    assert.equal(CHORD_RIM_DEPOSITS.silenceCeilingSig, 100, '§4: no silence order');
    assert.equal(CHORD_RIM_DEPOSITS.arrayTag, undefined, '§4: nothing to withdraw');
    assert.equal(CHORD_RIM_DEPOSITS.debtCapS, 0);
    assert.equal(
      CHORD_RIM_DEPOSITS.escortRadiusM,
      0,
      '§3: six hulls that move on their own orders'
    );
    assert.equal(CHORD_RIM_DEPOSITS.fauna, false, '§11: fauna are off; the one creature is a beat');
  });

  it('seats everything Directorate on one slot, and the attendants on a second', () => {
    // §2, §13 — `MissionParty` hostility is `Owner.slot` and every party is an
    // enemy of every other, so twelve armed Choristers on a slot of their own
    // would open fire on the 9th's submersibles and on the dome. The distances
    // that would have been are the argument, so they are the assertion.
    const directorate = CHORD_RIM_DEPOSITS.parties.find(
      (party) => party.faction === Faction.Directorate && party.units.length > 0
    )!;
    assert.equal(directorate.units.length, 18, '§5: twelve Choristers and six submersibles');
    assert.equal(directorate.units.filter((unit) => unit.kind === UnitKind.Chorister).length, 12);
    assert.equal((directorate.structures ?? []).length, 1, '§5: the dome, and nothing else');
    const nearestSeat = Math.min(
      ...directorate.units
        .filter((unit) => unit.kind === UnitKind.AbyssalSubmersible)
        .map((unit) =>
          Math.min(
            ...directorate.units
              .filter((other) => other.kind === UnitKind.Chorister)
              .map((other) => dist(unit, other))
          )
        )
    );
    assert.ok(
      nearestSeat < CHORISTER.attackRangeM,
      `§2: a Chorister's 450 m reaches the 9th at ${Math.round(nearestSeat)} m, which is why they share a slot`
    );
    assert.ok(
      dist(directorate.structures![0]!, { x: 5400, y: 3450 }) < CHORISTER.attackRangeM,
      '§2: and the dome at 403 m, well inside it'
    );
    // The attendants are a *second* Directorate-faction party and are safe
    // there, because `combat.ts` refuses to auto-acquire a StaticEmitter (§13).
    const attendants = CHORD_RIM_DEPOSITS.parties.find(
      (party) => (party.emitters ?? []).length > 0
    )!;
    assert.notEqual(attendants.slot, PLAYER, 'the one slot that could never hear them');
    assert.notEqual(attendants.slot, directorate.slot);
    assert.equal(attendants.units.length, 0, '§5: their only assets in the water are sounds');
    assert.deepEqual(
      (attendants.emitters ?? []).map((emitter) => [
        emitter.x,
        emitter.y,
        emitter.depthM,
        emitter.sig,
        emitter.periodTicks / SIM.TICK_HZ,
        emitter.onTicks / SIM.TICK_HZ,
        emitter.hp,
      ]),
      [
        [2800, 3400, 3050, 24, 7, 1, 5000],
        [4100, 3500, 3050, 24, 11, 2, 5000],
      ],
      '§13: Prospect’s two attendants verbatim — 7 s / 1 s and 11 s / 2 s, SIG 24, 3,050 m, hp 5,000'
    );
    // §8 — the Order's entered-and-gap lines differ from the concern's in one
    // respect, and the document names it: the Order does not keep a gap.
    for (const emitter of attendants.emitters ?? []) {
      assert.match(emitter.reading!.gap, /does not keep a gap/, '§8, §13');
      assert.match(emitter.reading!.entered, /^Entered: the (western|eastern) return/);
    }
  });

  it('inherits First Arrival’s Directorate seats to the metre, and the plateaus’ two', () => {
    // §5, §11: "The Directorate's seats are First Arrival's, inherited to the
    // metre and not re-authored." The twelve at x 5400-5900 in steps of a
    // hundred on y 3,200 and y 3,450; the 9th's four at y 3,650; the rim's own
    // two at Prospect's coordinates; the dome at 5000, 3400.
    const directorate = CHORD_RIM_DEPOSITS.parties.find(
      (party) => party.faction === Faction.Directorate && party.units.length > 0
    )!;
    const choristers = directorate.units.filter((unit) => unit.kind === UnitKind.Chorister);
    assert.deepEqual(
      choristers.map((unit) => [unit.tag, unit.x, unit.y]),
      [
        ['cohort-1', 5400, 3200],
        ['cohort-2', 5500, 3200],
        ['cohort-3', 5600, 3200],
        ['cohort-4', 5700, 3200],
        ['cohort-5', 5800, 3200],
        ['cohort-6', 5900, 3200],
        ['cohort-7', 5400, 3450],
        ['cohort-8', 5500, 3450],
        ['cohort-9', 5600, 3450],
        ['cohort-10', 5700, 3450],
        ['cohort-11', 5800, 3450],
        ['cohort-12', 5900, 3450],
      ]
    );
    // §11, §13 — every one of the twelve carries `pressureRating: 3` in the
    // literal, because `missions.test.ts` reads the authored rating and the
    // Directorate's PR-3 baseline does not rescue a PR-2 Chorister at 3,000 m.
    for (const hull of choristers) {
      assert.equal(hull.pressureRating, 3, `${hull.tag}: the refit is a mission fact`);
      assert.equal(hull.depthM, DEPTH.MAX_M, '§11: the lip, at the bottom of the orderable column');
      assert.equal(hull.armed, true, '§5: the only guns on the rim that are not the player’s');
    }
    assert.equal(
      statsFor(UnitKind.Chorister).pressureRating,
      2,
      '§13: the roster rates the hull PR-2'
    );
    assert.equal(requiredPressureRating(DEPTH.MAX_M), 3, 'and 3,000 m asks for three');
    const subs = directorate.units.filter((unit) => unit.kind === UnitKind.AbyssalSubmersible);
    assert.deepEqual(
      subs.map((unit) => [unit.tag, unit.x, unit.y]),
      [
        ['ninth-one', 5500, 3650],
        ['ninth-two', 5600, 3650],
        ['ninth-three', 5700, 3650],
        ['ninth-four', 5800, 3650],
        ['watch-a', 4600, 3300],
        ['watch-b', 4750, 3350],
      ]
    );
    for (const hull of subs) {
      assert.equal(hull.pressureRating, undefined, '§5: PR-3 on the roster, and no refit authored');
    }
    const plateaus = CHORD_RIM_DEPOSITS.parties.find((party) => party.faction === Faction.Pelagia)!;
    assert.deepEqual(
      plateaus.units.map((unit) => [unit.tag, unit.x, unit.y, unit.depthM, unit.pressureRating]),
      [
        ['chart-a', 1200, 2050, 2100, 3],
        ['chart-b', 1350, 2100, 2100, 3],
      ],
      '§5, §11: the charting pair at the seats First Arrival left them on, PR-3 by refit'
    );
    assert.deepEqual(
      (plateaus.structures ?? []).map((s) => [s.tag, s.kind, s.x, s.y, s.depthM]),
      [['the-bed', StructureKind.SporeVeil, BED.x, BED.y, DEPTH.MAX_M]],
      '§5: the bed stands alone, on the western lip'
    );
    assert.equal(VEIL.maxHp, 900, '§5: 900 HP');
  });
});

describe('the faces, as docs/mission-rim-deposits.md §6 sites them', () => {
  const region = (id: string) => CHORD_RIM_DEPOSITS.regions.find((r) => r.id === id)!;
  const corners = (id: string) => {
    const r = region(id);
    return [
      { x: r.x, y: r.y },
      { x: r.x + r.widthM, y: r.y },
      { x: r.x, y: r.y + r.heightM },
      { x: r.x + r.widthM, y: r.y + r.heightM },
    ];
  };

  it('puts the fourth face wholly inside node-one’s grant and the fifth partly outside it', () => {
    // §6's table, and the mission's whole geometry: one aura wide.
    assert.equal(STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M, 600);
    assert.equal(STRUCTURE_AURAS.SOUNDING_SPIRE.PR_BONUS, 1);
    assert.equal(Math.round(dist(NODE_ONE, FACE_FOUR)), 269, '§6: 269 m from the fourth face');
    const four = corners('face-four').map((c) => Math.round(dist(NODE_ONE, c)));
    assert.equal(Math.max(...four), 559, '§6: far corners 559 m');
    assert.ok(
      four.every((d) => d < STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M),
      '§6: the whole rectangle is inside six hundred'
    );
    assert.equal(Math.round(dist(NODE_ONE, FACE_FIVE)), 570, '§6: thirty metres inside the grant');
    assert.deepEqual(
      corners('face-five')
        .map((c) => Math.round(dist(NODE_ONE, c)))
        .sort((a, b) => a - b),
      [250, 559, 750, 901],
      '§6: corners at 250, 559, 750 and 901 m from node-one'
    );
    assert.equal(
      Math.round(dist(NODE_TWO, { x: 4500, y: 2000 })),
      721,
      '§6: and the north-eastern corner is 721 m from node-two as well — outside both grants'
    );
    assert.equal(Math.round(dist(NODE_TWO, FACE_SIX)), 224, '§6: 224 m from the sixth face');
    const six = corners('face-six')
      .map((c) => Math.round(dist(NODE_TWO, c)))
      .sort((a, b) => a - b);
    assert.deepEqual([six[0], six[six.length - 1]], [180, 532], '§6: corners 180 to 532 m');
    assert.equal(Math.round(dist(FACE_SIX, DOME)), 707, '§6: 707 m from the dome');
  });

  it('cuts five loads on three cutters, four minutes at sixty-five', () => {
    // §6 — "Three cutters and five loads is deliberate arithmetic: two of the
    // three stand on their face and cut it twice."
    const lifts = CHORD_RIM_DEPOSITS.lifts ?? [];
    assert.deepEqual(
      lifts.map((lift) => [lift.id, lift.tag, lift.region]),
      [
        ['load-one', 'cutter-a', 'face-four'],
        ['load-two', 'cutter-a', 'face-four'],
        ['load-three', 'cutter-b', 'face-five'],
        ['load-four', 'cutter-b', 'face-five'],
        ['load-five', 'cutter-c', 'face-six'],
      ]
    );
    for (const lift of lifts) {
      assert.equal(lift.cutTicks, T(4), '§6: four minutes a load');
      assert.equal(lift.cutSig, 65, '§6: Standard throttle’s 45 plus the crystal premium’s 20');
    }
    // §6's plan-view hole, stated rather than hidden: a `MissionRegion` is a
    // rectangle and `applyLifts` tests x and y only, so no lift here carries a
    // depth and none could. §13 names the field that would close it.
    assert.ok(
      lifts.every((lift) => !('depthMinM' in lift)),
      '§13: a lift with a depth is not built, and this literal does not pretend otherwise'
    );
  });

  it('stands both correction waves where the node is nearer than a cutter', () => {
    // §6's doctrine, as eight distance claims. The whole reason the wave
    // shoots the instrument and not the hulls under it is where it stopped,
    // and where it stopped is authored — so the arithmetic is the assertion.
    const first = stopsAt(T(4));
    const second = stopsAt(T(7));
    assert.equal(first.length, 6, '§9: move x6 — the correction');
    assert.equal(second.length, 6, '§9: move x6 — the second correction');
    for (const stop of [...first, ...second]) {
      assert.equal(stop.depthM, 2600, '§9: onto the terraces at 2,600 m');
    }
    // §11's bounding boxes, exactly.
    const box = (stops: { x: number; y: number }[]) => [
      Math.min(...stops.map((s) => s.x)),
      Math.max(...stops.map((s) => s.x)),
      Math.min(...stops.map((s) => s.y)),
      Math.max(...stops.map((s) => s.y)),
    ];
    assert.deepEqual(box(first), [3900, 4050, 2600, 2750], '§11: 3900–4050 x 2600–2750');
    assert.deepEqual(box(second), [4750, 4950, 2350, 2450], '§11: 4750–4950 x 2350–2450');

    const range = (stops: { x: number; y: number }[], from: { x: number; y: number }) => {
      const ds = stops.map((s) => Math.round(dist(from, s))).sort((a, b) => a - b);
      return [ds[0], ds[ds.length - 1]];
    };
    assert.deepEqual(range(first, NODE_ONE), [180, 335], '§6: 180–335 m from node-one');
    assert.deepEqual(range(second, NODE_TWO), [150, 269], '§6: 150–269 m from node-two');
    assert.equal(
      range(first, FACE_FOUR)[0],
      400,
      '§6: a cutter sitting on the fourth face is 400 m or more away'
    );
    assert.deepEqual(range(second, FACE_SIX), [320, 461], '§6: 320–461 m from the sixth face');
    // And the doctrine itself: for every stop, the node it was sent to correct
    // is nearer than a cutter standing on the face it is over.
    for (const stop of first) {
      assert.ok(
        dist(stop, NODE_ONE) < dist(stop, FACE_FOUR) &&
          dist(stop, NODE_ONE) < CHORISTER.attackRangeM,
        `${stop.tag}: the node must be the nearest live enemy, and inside 450 m`
      );
    }
    for (const stop of second) {
      assert.ok(
        dist(stop, NODE_TWO) < dist(stop, FACE_SIX) &&
          dist(stop, NODE_TWO) < CHORISTER.attackRangeM,
        `${stop.tag}: the node must be the nearest live enemy, and inside 450 m`
      );
    }
    // §6's two volunteers: a cutter that works the fourth face's eastern edge
    // or the sixth's north-western corner has put itself nearer than the node.
    assert.ok(
      first.some((stop) => Math.round(dist(stop, { x: 3750, y: stop.y })) === 150),
      "§6: the fourth face's eastern edge is 150 m from one of the first wave's stops"
    );
    assert.ok(
      second.some((stop) => Math.round(dist(stop, { x: 4750, y: 2500 })) === 100),
      "§6: the sixth face's north-western corner is 100 m from one of the second's"
    );
  });

  it('walks both corrections in the seconds §9 prices them at', () => {
    // §9: "1,521–1,724 m at 40 m/s: they are standing between 04:38 and 04:43"
    // and "1,185–1,485 m: standing between 07:30 and 07:37". The Chorister is
    // the slowest combat hull in the roster and the correction takes forty
    // seconds to arrive and arrives anyway — that is the mission's tempo, and
    // it is arithmetic over authored points rather than a claim.
    assert.equal(CHORISTER.speed, 40, '§9: the cohort walks at forty');
    const musters = new Map(
      beatsAt(T(3))
        .filter((beat) => beat.kind === 'move' && beat.tag.startsWith('cohort-'))
        .map((beat) => {
          if (beat.kind !== 'move') throw new Error('unreachable');
          return [beat.tag, { x: beat.x, y: beat.y }] as const;
        })
    );
    assert.equal(musters.size, 6, '§9: move x6 — the first wave musters in step on the lip');
    for (const beat of beatsAt(T(3))) {
      if (beat.kind !== 'move' || !beat.tag.startsWith('cohort-')) continue;
      assert.equal(beat.depthM, DEPTH.MAX_M, '§9: on the lip, 3,000 m');
    }
    const firstLegs = stopsAt(T(4)).map((stop) => dist(musters.get(stop.tag)!, stop));
    const firstArrivals = firstLegs.map((leg) => Math.round(leg / CHORISTER.speed));
    assert.deepEqual(
      [Math.min(...firstArrivals), Math.max(...firstArrivals)],
      [38, 43],
      '§9: standing between 04:38 and 04:43'
    );
    // The second wave has no muster: it leaves straight off the seats First
    // Arrival left it on (§9's table has one `move x6` at 07:00 and no other).
    const seats = new Map(
      CHORD_RIM_DEPOSITS.parties
        .flatMap((party) => party.units)
        .map((unit) => [unit.tag, { x: unit.x, y: unit.y }] as const)
    );
    const secondLegs = stopsAt(T(7)).map((stop) => dist(seats.get(stop.tag)!, stop));
    const secondArrivals = secondLegs.map((leg) => Math.round(leg / CHORISTER.speed));
    assert.deepEqual(
      [Math.min(...secondArrivals), Math.max(...secondArrivals)],
      [30, 37],
      '§9: standing between 07:30 and 07:37'
    );
    assert.deepEqual(
      [Math.round(Math.min(...secondLegs)), Math.round(Math.max(...secondLegs))],
      [1185, 1485],
      '§9: 1,185–1,485 m'
    );
    // §4 — fifteen seconds of six guns is what 1,800 HP of Sounding Spire is.
    assert.equal((CHORISTER.attackDamage / CHORISTER.attackCooldownS) * 6, 120, '§4: 120 a second');
    assert.equal(SPIRE.maxHp / 120, 15, '§4: fifteen seconds');
  });
});

describe('what is heard, as docs/mission-rim-deposits.md §7 prices it', () => {
  it('holds both nodes in the dome-lifted ears from tick zero', () => {
    // §7's first bullet, and the reason `the-count` is met before the party is
    // at working depth: two structures at SIG 30 standing in ears the dome has
    // lifted to the 95 cap, one at Track and one at Classification with eighty
    // metres to spare.
    assert.equal(CANTOR.maxHp, 1200, '§8: 1,200 HP, and two torpedoes would take it');
    assert.equal(LIFTED_HYD, 95);
    assert.equal(SPIRE.sigIdle, 30);
    assert.equal(SPIRE.sigActive, 80, '§4: 80 when active');
    const classification = rangeAt(
      30,
      LIFTED_HYD,
      TERRACES_PF,
      TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION
    );
    const track = rangeAt(30, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.TRACK);
    assert.deepEqual(
      [classification, track],
      [1872, 1396],
      '§7: Classification 1,872, Track 1,396'
    );
    const nearestSeat = { x: 5400, y: 3200 };
    assert.equal(Math.round(dist(NODE_TWO, nearestSeat)), 781, '§7: node-two at Track from 781 m');
    assert.equal(Math.round(dist(NODE_ONE, nearestSeat)), 1792, '§7: node-one at 1,792 m');
    assert.equal(classification - 1792, 80, '§7: Classification with eighty metres to spare');
    // §8's arithmetic for silencing the count, which is not a raid: dropping
    // the cohort's ears from 95 to 75 moves node-two's Classification radius
    // from 1,872 m to 1,615 and leaves it standing 781 m from a seat.
    assert.equal(
      rangeAt(30, 75, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      1615,
      '§8: and the node is still inside it'
    );
  });

  it('prices the node under load, the descent and the cut to the metre', () => {
    // §7's second and third bullets. The node under load is the loudest thing
    // on the rim and it is the party's own instrument.
    assert.deepEqual(
      [
        rangeAt(80, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CONTACT),
        rangeAt(80, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
        rangeAt(80, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.TRACK),
      ],
      [6127, 3456, 2576],
      '§7: Contact 6,127, Classification 3,456, Track 2,576'
    );
    assert.equal(
      rangeAt(80, LIFTED_HYD, LIP_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      5793,
      "§7: along the lip's 1.60 the Classification figure is most of the map"
    );
    assert.equal(DEPTH.DESCENT_SIG, 72, '§4: the descent’s own floor');
    assert.equal(DEPTH.DESCENT_RATE_MPS, 45);
    assert.equal(Math.round((1200 / DEPTH.DESCENT_RATE_MPS) * 10) / 10, 26.7, '§4: 26.7 seconds');
    assert.equal(
      rangeAt(72, LIFTED_HYD, OPEN_PF, TIER_THRESHOLD_MULTIPLIER.TRACK),
      3014,
      '§4: Track to the dome-lifted ear from 3,014 m through open water'
    );
    assert.equal(
      rangeAt(65, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      3035,
      '§4: and the cut is Classification from 3,035 m'
    );
  });

  it('quarters the raid’s own circle, and prices the ping it never fences', () => {
    // §7's fourth bullet. Facing still works — and it works underneath a
    // structure that is broadcasting at eighty, which is the joke.
    assert.equal(CORVETTE.sigCruise, 28);
    assert.equal(CRUISER.sigIdle, 55);
    assert.deepEqual(
      [
        rangeAt(28, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
        rangeAt(9.8, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
        rangeAt(2.8, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      ],
      [1793, 930, 425],
      '§7: a Knight Corvette bow-on, on the flank and in the wake'
    );
    assert.deepEqual(
      [
        rangeAt(55, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
        rangeAt(5.5, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      ],
      [2734, 648],
      '§7: the Voice is 2,734 m bow-on and 648 m astern'
    );
    assert.equal(
      rangeAt(28, 75, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      1547,
      "§7: against a Chorister outside the dome's 1,200 m, the bow figure is 1,547 m"
    );
    assert.equal(
      rangeAt(38, LIFTED_HYD, TERRACES_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      2170,
      '§6: a Knight Corvette firing in the cone is Classification from 2,170 m'
    );
    // §3 — the ping is priced and never struck, and the price is the two
    // numbers the document quotes: 4,808 m to a dome-lifted ear down the lip's
    // water, and Commit-loud to a Sounder from 1,479 m through the same water.
    assert.ok(
      CHORD_RIM_DEPOSITS.locks.every((lock) => lock.ability !== 'activeSonar'),
      "§3: active sonar has been in the Order's hands since mission 3"
    );
    assert.equal(rangeAt(95, LIFTED_HYD, LIP_PF, TIER_THRESHOLD_MULTIPLIER.TRACK), 4808);
    assert.equal(
      rangeAt(95, SOUNDER.hyd, LIP_PF, SOUNDER.commit / ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER),
      1479,
      '§3: Commit-loud to a Sounder from 1,479 m, by the ×3 that is all that ships'
    );
  });

  it('hears the garden once, at Bearing, and never again', () => {
    // §7 — "the bed is held at Bearing once, and never above it". The reading
    // is taken on the descent's western limb, at 2,400, 2,500 and 1,750 m, and
    // then the party goes east and does not hear it again.
    assert.equal(VEIL.sigIdle, 20);
    assert.equal(
      Math.round(VEIL.sigIdle * STRUCTURE_AURAS.SPORE_VEIL.SIG_FACTOR),
      8,
      '§5: 8 inside its own cloud'
    );
    const limb = { x: 2400, y: 2500 };
    assert.equal(Math.round(dist(limb, BED)), 1373, '§7: 1,373 m from the bed');
    const ratio = detectionRatio(8, LIP_PF, 1373, CRUISER.hyd);
    assert.ok(
      ratio >= TIER_THRESHOLD_MULTIPLIER.BEARING &&
        ratio < TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION,
      `§7: a ratio of 1.71 is a Bearing — a direction and a rough distance, no kind and no name (got ${ratio.toFixed(2)})`
    );
    assert.deepEqual(
      [
        rangeAt(8, CRUISER.hyd, LIP_PF, TIER_THRESHOLD_MULTIPLIER.BEARING),
        rangeAt(8, CRUISER.hyd, LIP_PF, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      ],
      [1491, 1084],
      '§7: Bearing inside 1,491 m and Classification inside 1,084'
    );
    assert.ok(
      dist(BED, FACE_FOUR) > rangeAt(8, CRUISER.hyd, LIP_PF, TIER_THRESHOLD_MULTIPLIER.BEARING),
      '§7: the fourth face is further off than the 8 carries, so nothing done on the eastern terraces resolves the garden at all'
    );
    assert.equal(Math.round(dist(BED, FACE_FOUR)), 2342);
    assert.ok(
      dist(limb, NODE_ONE) > STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M &&
        dist(limb, NODE_TWO) > STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M,
      '§7: outside both grants'
    );
    // §7, §13 — and above the crush at 1,750, because 1,800 m is the Abyssal
    // band's first metre and not Mid-Water's last: the free depth is 1,799.
    assert.equal(requiredPressureRating(1750), 2);
    assert.equal(requiredPressureRating(1800), 3, '§13: the free depth is 1,799');
  });
});

describe('the objective, as docs/mission-rim-deposits.md §8 counts it', () => {
  it('reads nine rows, of which six are terminal and one is the keystone', () => {
    assert.deepEqual(
      CHORD_RIM_DEPOSITS.objectives.map((objective) => objective.id),
      [
        'the-chord',
        'load-one-home',
        'load-two-home',
        'load-three-home',
        'load-four-home',
        'load-five-home',
        'the-cutters',
        'the-escort',
        'the-count',
      ],
      '§8: the keystone, the five loads, the two counts of hulls, and the record'
    );
    const terminal = CHORD_RIM_DEPOSITS.objectives.filter((o) => o.terminal === true);
    assert.equal(terminal.length, 6, '§8: six terminal rows');
    assert.deepEqual(
      CHORD_RIM_DEPOSITS.objectives.filter((o) => o.keystone === true).map((o) => o.id),
      ['the-chord'],
      '§8: one keystone, and an unmet keystone is Lost whatever else came home'
    );
    assert.deepEqual(objectiveById('the-chord').predicate, {
      kind: 'extract',
      role: 'cutter',
      region: 'staging',
      count: 2,
      loaded: true,
    });
    // §8, §13 — `extract ... loaded: true` counts carriers, not loads: a cutter
    // home with two cuts aboard reads as one. The row is worded in cutters for
    // that reason, and the wording is the assertion.
    assert.match(objectiveById('the-chord').text, /^Two cutters above the line/);
    for (const [id, lift] of [
      ['load-one-home', 'load-one'],
      ['load-two-home', 'load-two'],
      ['load-three-home', 'load-three'],
      ['load-four-home', 'load-four'],
      ['load-five-home', 'load-five'],
    ] as const) {
      assert.deepEqual(objectiveById(id).predicate, {
        kind: 'extract',
        role: 'cutter',
        region: 'staging',
        count: 1,
        loaded: lift,
      });
    }
    // §8 — the two `survive` rows are deliberately not terminal: the Order
    // reads its people out at the close and refuses to rank them against
    // crystal, which is why two loads home and two cutters lost is Partial.
    for (const id of ['the-cutters', 'the-escort', 'the-count'] as const) {
      assert.notEqual(objectiveById(id).terminal, true, `${id}: read out, never ranked`);
    }
    assert.deepEqual(objectiveById('the-cutters').predicate, {
      kind: 'survive',
      role: 'cutter',
      count: 3,
    });
    assert.deepEqual(objectiveById('the-escort').predicate, {
      kind: 'survive',
      role: 'escort',
      count: 3,
    });
    assert.deepEqual(objectiveById('the-count').predicate, {
      kind: 'tolerance',
      ticks: 1800,
      tier: ResolutionTier.Classification,
    });
    assert.equal(1800 / SIM.TICK_HZ, 30, '§8: thirty cumulative seconds');
    // §8 — every row is revealed at 00:00; the raid hides nothing from itself.
    for (const objective of CHORD_RIM_DEPOSITS.objectives) {
      assert.equal(objective.revealAtTick, undefined, `${objective.id}: revealed at 00:00`);
      assert.ok(objective.reading !== undefined, `${objective.id}: read out at the close`);
    }
    assert.deepEqual(
      CHORD_RIM_DEPOSITS.markers.map((marker) => [marker.id, marker.x, marker.y, marker.radiusM]),
      [
        ['the-faces', 4300, 2500, 1200],
        ['the-line', 3000, 500, 1000],
      ],
      '§8: the-faces at 4300, 2500, r 1,200 and the-line at 3000, 500, r 1,000'
    );
    assert.equal(objectiveById('the-chord').markerId, 'the-line');
    assert.equal(objectiveById('load-one-home').markerId, 'the-faces');
  });

  it('reads Sull’s three results and the nine rows in §8’s own words', () => {
    assert.match(
      CHORD_RIM_DEPOSITS.epilogue[MissionOutcome.Complete],
      /^Five\. The Chord has its crystal/
    );
    assert.match(
      CHORD_RIM_DEPOSITS.epilogue[MissionOutcome.Partial],
      /^Two at least\. The Chord exists\./
    );
    assert.match(CHORD_RIM_DEPOSITS.epilogue[MissionOutcome.Lost], /^Fewer than two\./);
    assert.match(CHORD_RIM_DEPOSITS.epilogue[MissionOutcome.Lost], /Enter that it was mine\.$/);
    assert.match(
      objectiveById('the-chord').reading!.unmet,
      /raised two nodes on attended ground to learn that/,
      '§8, verbatim'
    );
    // §8's refusal, borrowed from Aptitude and Nineteen and said twice here.
    assert.equal(
      objectiveById('the-cutters').reading!.unmet,
      'A cutter is entered. Say the name to the house yourself.'
    );
    assert.equal(
      objectiveById('the-escort').reading!.unmet,
      'A hull of the escort is entered. Say the name to the house yourself.'
    );
    assert.match(objectiveById('the-count').reading!.met, /the nodes were there first/);
    assert.match(objectiveById('the-count').reading!.unmet, /the Order is the reason/);
  });

  it('cannot latch a single terminal row at tick zero, and carries no runsItsLength', () => {
    // Trap two, walked deliberately (§8, §9). The three cutters are seated in
    // the `staging` rectangle at tick zero carrying nothing, so no `loaded`
    // form can be met on the first pass — which is the only reason this
    // mission can omit `runsItsLength` and still open. If a load were ever
    // rigged at seating, every terminal row would be met on the first pass and
    // the raid would close before Sull finished the first sentence.
    assert.equal(CHORD_RIM_DEPOSITS.runsItsLength, undefined, "§9: the court's rule applies");
    const staging = CHORD_RIM_DEPOSITS.regions.find((region) => region.id === 'staging')!;
    for (const tag of ['cutter-a', 'cutter-b', 'cutter-c']) {
      const hull = unitByTag(tag);
      assert.ok(
        hull.x >= staging.x &&
          hull.x <= staging.x + staging.widthM &&
          hull.y >= staging.y &&
          hull.y <= staging.y + staging.heightM,
        `${tag} is seated inside the staging rectangle at tick zero`
      );
    }
    for (const objective of CHORD_RIM_DEPOSITS.objectives) {
      if (objective.terminal !== true) continue;
      assert.equal(objective.predicate.kind, 'extract');
      assert.ok(
        objective.predicate.kind === 'extract' && objective.predicate.loaded !== undefined,
        `${objective.id}: every terminal row is gated on a load that does not exist yet`
      );
    }
  });
});

describe('the beats, as docs/mission-rim-deposits.md §9 schedules them', () => {
  it('closes at 16:00 on a resolve that is not a conclusion, ninety seconds behind the basin', () => {
    const resolve = CHORD_RIM_DEPOSITS.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.atTick, T(16), '§9: the count is taken at 16:00');
    assert.equal(
      resolve.kind === 'resolve' ? resolve.conclusion : true,
      undefined,
      '§8: the close is not a conclusion — a raid can fail'
    );
    const [low, high] = CHORD_RIM_DEPOSITS.lengthBandS;
    assert.deepEqual([low, high], [900, 1020], '§9: the header’s band is 900–1,020 s');
    assert.ok(resolve.atTick / SIM.TICK_HZ === 960 && 960 >= low && 960 <= high);
    const loud = CHORD_RIM_DEPOSITS.beats.filter((beat) => beat.kind === 'creature' && beat.loud);
    assert.equal(loud.length, 1, '§9: one loud beat, and it is the basin');
    assert.equal(loud[0]!.atTick, T(14, 30));
    const telegraphS = (resolve.atTick - loud[0]!.atTick) / SIM.TICK_HZ;
    assert.equal(telegraphS, 90, '§9: ninety seconds between the basin and the close');
    assert.ok(
      telegraphS >= MISSION.FAILURE_TELEGRAPH_S,
      `§9: against campaign.md §10's ${MISSION.FAILURE_TELEGRAPH_S}, paid half as much again`
    );
    // §9's table, in its order, as the ticks the schedule is walked with.
    assert.deepEqual(
      CHORD_RIM_DEPOSITS.beats
        .filter((beat) => beat.kind === 'say')
        .map((beat) => beat.atTick / SIM.TICK_HZ),
      [0, 60, 270, 330, 360, 480, 660, 885],
      '§9: 00:00, 01:00, 04:30, 05:30, 06:00, 08:00, 11:00 and 14:45'
    );
    const speakers = CHORD_RIM_DEPOSITS.beats
      .filter((beat) => beat.kind === 'say')
      .map((beat) => (beat.kind === 'say' ? beat.speaker : ''));
    assert.ok(speakers[1]!.includes('Sull'));
    assert.equal(
      CHORD_RIM_DEPOSITS.beats.find((beat) => beat.atTick === T(1) && beat.kind === 'say')?.kind ===
        'say'
        ? (
            CHORD_RIM_DEPOSITS.beats.find(
              (beat) => beat.atTick === T(1) && beat.kind === 'say'
            ) as { text: string }
          ).text
        : '',
      'Descend.',
      "§12: one word, and it is Osk's"
    );
    assert.ok(
      speakers.some((s) => s.includes('Adze')),
      '§12: the correction, filed'
    );
    assert.ok(
      speakers.some((s) => s.includes('Kalliso')),
      '§12: the one question, said to nobody'
    );
    assert.ok(
      speakers.some((s) => s.includes('Watch-Speaker')),
      '§12: for those below'
    );
  });

  it('lifts the basin at 14:30 on Prospect’s literal, and lets it arrive where it actually is', () => {
    // §7, §11 — "It arrives at the depth it is actually at, which is not the
    // depth it is going to." No `depthM` on the `driveTo`, which is Prospect's
    // literal to the metre: the runtime holds the species' own working depth
    // and the creature climbs toward it at twelve metres a second.
    const basin = CHORD_RIM_DEPOSITS.beats.find((beat) => beat.kind === 'creature')!;
    assert.equal(basin.kind, 'creature');
    if (basin.kind !== 'creature') return;
    assert.equal(basin.species, FaunaSpecies.Sounder);
    assert.deepEqual(basin.spawnAt, { x: 3000, y: 3600, depthM: 3050 });
    assert.deepEqual(
      basin.driveTo,
      { x: 3000, y: 2400 },
      '§11: Prospect’s literal, on Prospect’s point'
    );
    assert.equal(basin.untilTick, T(16), '§9: driven until the close');
    assert.equal(basin.loud, true);
    assert.equal(SOUNDER.workingDepthM, 2000, '§7: its species’ own two thousand');
    assert.equal(DRIFT.VERTICAL_SPEED_MPS, 12);
    assert.equal(SOUNDER.speed, 30);
    const transitS = 1200 / SOUNDER.speed;
    assert.equal(transitS, 40, '§7: forty seconds to cover the 1,200 m');
    assert.equal(
      3050 - transitS * DRIFT.VERTICAL_SPEED_MPS,
      2570,
      '§7: so it stands over the terraces at about 2,570 m and goes on rising'
    );
    const climbS = (3050 - SOUNDER.workingDepthM) / DRIFT.VERTICAL_SPEED_MPS;
    assert.equal(
      Math.round(climbS * 10) / 10,
      87.5,
      '§7: and does not reach 2,000 m until about eighty-eight seconds in'
    );
    assert.ok(
      climbS < (T(16) - basin.atTick) / SIM.TICK_HZ,
      '§7: which is the last two or three seconds before the close'
    );
    // §7 — the transit's reach is a body plus the target's own radius, so it
    // grinds nothing on the terraces: 750 m west of node-one, and the only
    // hull on this party it could take is the Voice.
    assert.equal(Math.abs(NODE_ONE.x - 3000), 750, '§7: 750 m west of node-one');
    assert.equal(
      SOUNDER.lengthM / 2 + SPIRE.radiusM,
      107.5,
      'a Spire is taken only inside 107.5 m'
    );
    assert.equal(
      SOUNDER.lengthM / 2 + CRUISER.hullLengthM / 2,
      102.5,
      '§7: and the Voice inside 102.5'
    );
    assert.ok(
      CRUISER.hullLengthM >= DRIFT.TRANSIT_MIN_HULL_M,
      '§7: exactly one such hull on this party'
    );
    assert.ok(
      CORVETTE.hullLengthM < DRIFT.TRANSIT_MIN_HULL_M,
      '§7: and it ignores a Corvette outright'
    );
    assert.equal(SOUNDER.damagePerS, 220, '§7: at 220 a second');
  });

  it('hangs three conditional beats off conditions that cannot fire at tick zero', () => {
    // §9's conditional beats, "printed here rather than on the clock because a
    // condition has no tick". A conditional beat fires on the first mission
    // pass its predicate is met and never again, so a condition true at
    // seating is a line said before the mission has started.
    const conditionals = CHORD_RIM_DEPOSITS.conditionalBeats ?? [];
    assert.equal(conditionals.length, 3);
    assert.deepEqual(conditionals[0]!.when, {
      kind: 'tolerance',
      ticks: 1800,
      tier: ResolutionTier.Classification,
    });
    assert.match(
      conditionals[0]!.kind === 'say' ? conditionals[0]!.text : '',
      /it is not begun again/,
      '§9, verbatim'
    );
    assert.deepEqual(conditionals[1]!.when, {
      kind: 'extract',
      role: 'cutter',
      region: 'staging',
      count: 1,
      loaded: true,
    });
    assert.deepEqual(conditionals[2]!.when, {
      kind: 'extract',
      role: 'cutter',
      region: 'staging',
      count: 2,
      loaded: true,
    });
    for (const beat of conditionals) {
      assert.equal(beat.choiceGroup, undefined, '§9: three separate facts, not a choice');
    }
    assert.match(
      conditionals[2]!.kind === 'say' ? conditionals[2]!.text : '',
      /the Order has never had margin/,
      '§9, verbatim'
    );
  });
});

/** The mission itself, on its own map, with nothing else in the water. */
function rimMatch(): Match {
  return new Match(missionMapById(CHORD_RIM_DEPOSITS.mapId)!, {
    mission: CHORD_RIM_DEPOSITS,
    fauna: false,
    seed: 6,
  });
}

/** Ticks, draining the view the way a room would so nothing queues up. */
const run = (match: Match, ticks: number) => {
  for (let i = 0; i < ticks; i++) {
    match.update(STEP_MS);
    match.takeMissionView();
  }
};

/**
 * The player's own Corvette nearest an authored seat.
 *
 * By seat and never by coordinate: unit separation moves the raid's six hulls
 * off their authored metres on the first tick, so a lookup that matched
 * §11's numbers exactly would find nothing (missionSecondSeeding.test.ts's
 * `nearest`, and the same trap).
 */
function corvetteAt(match: Match, seat: { x: number; y: number }): number {
  return (
    hulls(match.world)
      .filter((eid) => Owner.slot[eid] === PLAYER && Unit.kind[eid] === UnitKind.Corvette)
      .sort(
        (a, b) =>
          Math.hypot(Position.x[a]! - seat.x, Position.y[a]! - seat.y) -
          Math.hypot(Position.x[b]! - seat.x, Position.y[b]! - seat.y)
      )[0] ?? 0
  );
}

/** A node, by the coordinates the literal seats it at. Structures do not drift. */
function spireAt(match: Match, seat: { x: number; y: number }): number {
  return (
    structures(match.world).find(
      (eid) =>
        Structure.kind[eid] === StructureKind.SoundingSpire &&
        Math.round(Position.x[eid]!) === seat.x &&
        Math.round(Position.y[eid]!) === seat.y
    ) ?? 0
  );
}

describe('the rented rating, played — docs/mission-rim-deposits.md §4', () => {
  /**
   * The one system this mission teaches, and the one thing about it a table
   * cannot show: the node is *active* — and therefore singing at eighty rather
   * than humming at thirty — for exactly as long as some allied hull inside its
   * six hundred metres is genuinely below its own rating. So a cutter is driven
   * under node-one, held at the crystal's depth, and then climbed back above
   * the Abyssal line, and the node's own voice is read at each step.
   */
  it('rents a band to a hull under the node, and sings at eighty while it is doing it', () => {
    const match = rimMatch();
    match.update(STEP_MS);
    const cutter = corvetteAt(match, { x: 2850, y: 350 });
    const node = spireAt(match, NODE_ONE);
    assert.notEqual(cutter, 0, 'cutter-a was not seated');
    assert.notEqual(node, 0, 'node-one was not placed');
    assert.equal(Pressure.rating[cutter], 2, '§3: PR-2, and the Hadron baseline is the same two');
    assert.equal(
      match.world.spireActive.has(node),
      false,
      '§4: idle at thirty with nobody under it'
    );

    // §11's route, and the reason it is authored the way it is: "the raid
    // crosses south at 1,750 m for nothing and takes the last 850 m of the dive
    // only over Terraces ground and only inside a node's six hundred." So the
    // crossing comes first, at the Staging's own depth, where a PR-2 hull holds
    // any metre on this chart for free.
    match.orderMove(PLAYER, cutter, FACE_FOUR.x, FACE_FOUR.y - 100);
    run(match, T(1));
    const stand = { x: Position.x[cutter]!, y: Position.y[cutter]! };
    assert.ok(
      dist(stand, NODE_ONE) < STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M,
      'the cutter is inside node-one’s six hundred, measured horizontally'
    );
    assert.equal(Pressure.bonus[cutter], 1, '§4: and the node grants it one rating already');
    assert.equal(
      match.world.spireActive.has(node),
      false,
      '§4: but the grant is not load-bearing at 1,400 m, so the node is still humming at thirty'
    );
    assert.equal(
      Pressure.unhealable[cutter],
      0,
      'and nothing above 1,800 m costs the Order anything'
    );

    // Now the last 1,200 m, taken inside the aura. 26.7 seconds at a SIG floor
    // of 72 — and the correction does not walk until 04:00.
    assert.equal(match.orderDepth(PLAYER, cutter, 2600), true, '§4: the order is accepted');
    run(match, T(1));

    assert.equal(Math.round(Position.depth[cutter]!), 2600, 'the cutter is on the bench');
    assert.equal(Pressure.bonus[cutter], 1, '§4: the node grants one rating');
    assert.equal(
      Pressure.rating[cutter]! + Pressure.bonus[cutter]!,
      requiredPressureRating(2600),
      'which is exactly what this water asks for'
    );
    assert.equal(
      Pressure.unhealable[cutter],
      0,
      'so the hull takes no crush at all, 800 m under its own certificate'
    );
    assert.equal(
      match.world.spireActive.has(node),
      true,
      '§4: and the node sings at eighty for as long as that grant is load-bearing'
    );
    assert.equal(Health.hp[cutter], CORVETTE.maxHp, 'nothing has touched it yet');

    // §4's tell: it goes quiet the instant the last hull climbs out. 1,750 m,
    // because 1,800 is the Abyssal band's first metre and not Mid-Water's last
    // (§13) — 850 m of climb at 15 m/s is 56.7 seconds.
    assert.equal(match.orderDepth(PLAYER, cutter, 1750), true);
    run(match, T(1, 30));
    assert.equal(Math.round(Position.depth[cutter]!), 1750);
    assert.equal(Pressure.unhealable[cutter], 0, 'the bleeding never started');
    assert.equal(
      match.world.spireActive.has(node),
      false,
      '§4: the instrument stops the instant the grant stops being load-bearing — the tell the mission ends on'
    );
    assert.equal(DEPTH.ASCENT_RATE_MPS, 15, '§4: the climb is a third of the dive, and silent');
    assert.equal(
      Math.round((850 / DEPTH.ASCENT_RATE_MPS) * 10) / 10,
      56.7,
      '§13: the honest orderable figure'
    );
  });

  it('refuses the grant outside the six hundred, and stays quiet for the hull that bleeds', () => {
    // The other half of the same rule, and §6's own worked example: the fifth
    // face's north-eastern corner, "outside both grants and taking 4 HP/s".
    // `aurasSystem` measures the grant as a plain hypot over x and y from the
    // instrument, so this is the assertion that the six hundred is a radius
    // and not a mood — a hull at the same 2,600 m as the one above, 901 m from
    // node-one and 721 m from node-two, is rated for none of it.
    const match = rimMatch();
    match.update(STEP_MS);
    const cutter = corvetteAt(match, { x: 3150, y: 350 });
    const corner = { x: 4500, y: 2000 };
    assert.equal(Math.round(dist(corner, NODE_ONE)), 901, '§6: 901 m from node-one');
    assert.equal(Math.round(dist(corner, NODE_TWO)), 721, '§6: and 721 m from node-two');

    // A hundred metres inside that corner, because the corner itself is the
    // seam between the Slopes' 2,200 floor and the Terraces' 2,600 (§11) and a
    // hull that stops a metre short of it is ordered to a floor that is not
    // the bench's. Same quarter of the same face, and the point of the case is
    // the radius rather than the metre.
    const stood = { x: 4400, y: 2100 };
    match.orderMove(PLAYER, cutter, stood.x, stood.y);
    run(match, T(1));
    const stand = { x: Position.x[cutter]!, y: Position.y[cutter]! };
    assert.ok(
      dist(stand, stood) < 25,
      'the cutter is standing on the face’s north-eastern quarter'
    );
    assert.ok(
      dist(stand, NODE_ONE) > STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M &&
        dist(stand, NODE_TWO) > STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M,
      '§6: outside both grants'
    );
    assert.equal(Pressure.bonus[cutter], 0, '§4: and outside is outside — no rating is rented');

    assert.equal(match.orderDepth(PLAYER, cutter, 2600), true);
    run(match, 40 * SIM.TICK_HZ);
    assert.equal(Math.round(Position.depth[cutter]!), 2600, 'on the bench, uncertificated');
    assert.equal(
      Pressure.bonus[cutter],
      0,
      '§4: six hundred metres, horizontal, measured from the instrument and not from you'
    );
    assert.equal(
      crushAttritionPerSecond(Pressure.rating[cutter]!, 2600),
      4,
      '§4: one band under its rating is 4 × 1² = 4 HP/s, unhealable'
    );
    const bled = Pressure.unhealable[cutter]!;
    assert.ok(bled > 0, '§6: a cutter that works the north-east is bleeding');
    assert.equal(
      Math.round(Health.hp[cutter]! + bled),
      CORVETTE.maxHp,
      'and every point of it is off the hull for good'
    );
    run(match, 10 * SIM.TICK_HZ);
    assert.ok(
      Math.abs(Pressure.unhealable[cutter]! - bled - 40) < 0.5,
      `§4: ten seconds of it is forty hull (took ${(Pressure.unhealable[cutter]! - bled).toFixed(1)})`
    );

    // §4's other half, and the tell the mission ends on read from the far
    // side: a hull genuinely below its rating makes a node sing only if that
    // node is the one carrying it. This one is carried by neither, and both
    // stand at thirty while it bleeds.
    assert.equal(
      match.world.spireActive.has(spireAt(match, NODE_ONE)),
      false,
      '§4: node-one is not singing for a hull it is not holding up'
    );
    assert.equal(match.world.spireActive.has(spireAt(match, NODE_TWO)), false, '§4: nor node-two');
  });

  it('does not close the raid on its first pass, and enters the count at 00:30', () => {
    // Trap two, played rather than reasoned: every terminal row is an
    // `extract` gated on a load, no load exists at seating, and the mission
    // carries no `runsItsLength` to save it if one did.
    //
    // And §8's other design: `the-count` is Met before the descent finishes,
    // because `ExposureReport.tier` is the best tier anybody holds on any
    // entity of the player's — structures included — and two nodes at SIG 30
    // stand in dome-lifted ears from the first tick. Thirty cumulative seconds
    // accrue an Echo interval per pass, so the row fills in 1,800 sim ticks.
    const match = rimMatch();
    let atZero: { id: string; status: ObjectiveStatus }[] = [];
    let countMetAt = -1;
    for (let tick = 0; tick <= T(1); tick++) {
      match.update(STEP_MS);
      const view = match.takeMissionView();
      for (const objective of view?.objectives ?? []) {
        if (objective.id !== 'the-count') continue;
        if (objective.status === ObjectiveStatus.Met && countMetAt < 0) {
          countMetAt = match.world.tick;
        }
      }
      if (tick === 0) {
        atZero = (view?.objectives ?? []).map((o) => ({ id: o.id, status: o.status }));
      }
      assert.equal(match.missionOver, null, `the raid closed at tick ${tick}`);
    }
    for (const row of atZero) {
      if (CHORD_RIM_DEPOSITS.objectives.find((o) => o.id === row.id)?.terminal !== true) continue;
      assert.equal(row.status, ObjectiveStatus.Pending, `${row.id} was met at tick zero`);
    }
    // §8: "`the-count` is met by 00:30 and that is the design." To the second,
    // and the arithmetic is exactly the one §8 states — an Echo interval of
    // ticks accrued per pass, a hundred and fifty passes, and the party still
    // descending when it fills.
    assert.equal(countMetAt, 1800, '§8: met at 00:30, before the descent has finished');
    assert.equal(1800 / ECHO_TICK_INTERVAL, 150, '§8: a hundred and fifty passes');
  });
});

describe('one finding against the runtime — docs/mission-rim-deposits.md §6 and §9', () => {
  /**
   * §6 puts two loads on one hull in one region, twice over — `load-one` and
   * `load-two` on `cutter-a`'s fourth face, `load-three` and `load-four` on
   * `cutter-b`'s fifth — and both §6 and §9 describe the pair as *sequential*:
   * "Eight minutes on one face, the second four of them under the first
   * correction", with the second cuts running "from about 05:30 to about
   * 09:30".
   *
   * `MissionRuntime.applyLifts` walks the lift table and accrues **every** lift
   * whose carrier is standing inside its region on that pass, independently,
   * and nothing in the format serialises two loads on one hull. So one
   * four-minute hold rigs both, and the eight minutes are the side that is
   * wrong. Played on the mission itself rather than on a fixture, because the
   * claim is about these five authored lifts and not about lift tables in
   * general: `cutter-a` is walked onto the fourth face, held there, and brought
   * home, and §8's two rows for the two cuts both latch off the one hold.
   */
  it('rigs both of cutter-a’s loads off one four-minute hold, where §6 and §9 read eight', () => {
    const match = rimMatch();
    match.update(STEP_MS);
    const cutter = corvetteAt(match, { x: 2850, y: 350 });
    assert.notEqual(cutter, 0, 'cutter-a was not seated');

    // §6's plan-view hole, walked deliberately: `applyLifts` tests `Position.x`
    // and `Position.y` and nothing else, so the hold runs at the Staging's own
    // 1,400 m with both nodes idle at thirty. That keeps this case about the
    // lift table rather than about the correction that stands at 04:38 or the
    // crush that starts when it takes node-one down.
    match.orderMove(PLAYER, cutter, FACE_FOUR.x, FACE_FOUR.y);
    let opened = 0;
    let closed = 0;
    for (let tick = 1; tick <= T(9, 30) && closed === 0; tick++) {
      match.update(STEP_MS);
      match.takeMissionView();
      // A carrier holds the authored cut floor for exactly as long as it has
      // an unfinished lift accruing in its region, so `world.liftCutSig` is
      // the runtime's own answer to "is this hull still cutting?".
      const cutting = match.world.liftCutSig.has(cutter);
      if (cutting && opened === 0) opened = match.world.tick;
      if (!cutting && opened !== 0) closed = match.world.tick;
    }
    assert.notEqual(opened, 0, 'cutter-a never reached the fourth face');
    assert.notEqual(closed, 0, 'cutter-a was still cutting at 09:30');
    assert.equal(
      match.world.liftCutSig.get(cutter),
      undefined,
      'and it is not holding a cut floor for a third load it does not have'
    );
    const heldS = (closed - opened) / SIM.TICK_HZ;
    assert.ok(
      closed - opened >= T(4) && closed - opened <= T(4) + ECHO_TICK_INTERVAL,
      `both of the fourth face's cuts came off ${heldS.toFixed(1)} s of hold, against §6's four minutes a cut, accrued an Echo pass at a time`
    );
    assert.ok(
      closed - opened < 2 * T(4),
      '§6 and §9 read eight minutes on one face; the runtime charges four, and the prose is the side that is wrong'
    );

    // And the two loads are real and named: §8's two rows for the fourth
    // face's two cuts latch on the same pass, off the one hold.
    match.orderMove(PLAYER, cutter, 2850, 350);
    const met = new Map<string, number>();
    for (let tick = 0; tick < T(2); tick++) {
      match.update(STEP_MS);
      for (const objective of match.takeMissionView()?.objectives ?? []) {
        if (objective.status === ObjectiveStatus.Met && !met.has(objective.id)) {
          met.set(objective.id, match.world.tick);
        }
      }
      if (met.has('load-one-home') && met.has('load-two-home')) break;
    }
    assert.notEqual(met.get('load-one-home'), undefined, 'the first cut never came home');
    assert.equal(
      met.get('load-one-home'),
      met.get('load-two-home'),
      '§8: two rows, one hold — the fourth face’s cuts are above the line on the same pass'
    );
    assert.ok(
      met.get('load-two-home')! < T(9, 30),
      '§9 puts the second cut of a face at about 09:30; this one is above the line well before it'
    );
    // §8, §13, played: `extract ... loaded: true` counts carriers and not
    // loads, so one cutter home with two cuts aboard is not the Chord.
    assert.equal(
      met.has('the-chord'),
      false,
      '§8: a cutter home with both of the fourth face’s cuts reads as one, and the keystone wants two'
    );
    assert.equal(match.missionOver, null, '§8: four terminal rows are still on the rim');

    // Anchored to the literal the finding is about: two of the five lifts sit
    // on one hull in one region, twice over.
    const doubled = (CHORD_RIM_DEPOSITS.lifts ?? []).filter(
      (lift, _index, all) =>
        all.filter((other) => other.tag === lift.tag && other.region === lift.region).length > 1
    );
    assert.equal(doubled.length, 4, '§6: two faces are cut twice, by one hull each');
  });
});
