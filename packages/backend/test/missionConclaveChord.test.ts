/**
 * The Second Chord 4, read and run — docs/mission-conclave-chord.md.
 *
 * `missions.test.ts` holds every mission to the format's own rules; this file
 * holds Conclave to the things only its own document claims, and to the one row
 * §13 says the per-mission test has to hold.
 *
 * - **The fight is lost in figures before it starts** (§4). Every number in
 *   the briefing — 4,500 against 3,300, 342.7 against 268.3, three hundred and
 *   fifty metres of gun — is re-derived here from the roster and the Klaxon
 *   rule rather than copied, because campaign.md §2 rule 4's third mission has
 *   to *be* unwinnable rather than say so. If a tuning pass moves a hull, this
 *   file says so before a player finds out Vrey's arithmetic is wrong.
 * - **The keystone rest is authored a mission pass short of the close** (§8,
 *   §13). An `endure`'s clock is stamped the first time the runtime derives the
 *   objective, which is one Echo interval into the match and not tick zero, so
 *   `T(14, 30)` comes due one pass *after* the tide and reads Lost on a perfect
 *   defence. The offset, and the two tick orders it leans on, are driven
 *   against the real runtime here.
 * - **The lattice is the party's armour, and its own hull points are the
 *   telegraph** (§6, §7, §8). Every column seat is outside its own gun's reach
 *   of a formation, every stop is inside it, and the legs arrive when §5 says.
 * - **The two places §7's own arithmetic decides something, pinned here.** The
 *   Bass stops are held to 3,590 / 3,699 / 3,775 m against the cutters'
 *   3,737 m, because §7 once read the farthest of the three as the nearest and
 *   concluded the opposite of what the water does (§13 records the repair). And
 *   the "Fields ring" paragraph is held to what the column can actually resolve
 *   from its seats: the Bass and the Drone, and not the Alto.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  FACTION_COMBAT,
  Faction,
  MISSION,
  MissionOutcome,
  ObjectiveStatus,
  PROPAGATION_FACTOR,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  damageMultiplierFor,
  detectionRatio,
  firingSigFor,
  statsFor,
  structureStatsFor,
  tierFromRatio,
  type EchoSnapshot,
} from '@echoes/shared';
import { OUTER_FORMATIONS, mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import {
  CHORD_CONCLAVE,
  MissionRuntime,
  PROLOGUE_SORROWGATE,
  type MissionCommandSink,
  type MissionDefinition,
  type MissionObjective,
} from '../src/sim/missions/index.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { createSimWorld } from '../src/sim/world.ts';

const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = CHORD_CONCLAVE.playerSlot;
const PF_FIELDS = PROPAGATION_FACTOR[Biome.ResonanceField];
const PF_SEAM = PROPAGATION_FACTOR[Biome.AbyssalTrench];

const CORVETTE = statsFor(UnitKind.Corvette);
const CRUISER = statsFor(UnitKind.Cruiser);
const HARVESTER = statsFor(UnitKind.Harvester);
const SPIRE = structureStatsFor(StructureKind.SoundingSpire);

/** §11 — the party's seat, and the point every distance in §5 and §6 is from. */
const SEAT = { x: 4500, y: 500 };

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The range at which a listener first reaches `tier` on an emitter of this
 * loudness, in this water — §7's figures, computed rather than remembered.
 *
 * `missionAptitude.test.ts`' bisection, on the same map for the same reason: a
 * reference implementation of the *question* the document asks, which stays
 * meaningful when the tuning legitimately changes because it changes with it.
 */
function rangeForTier(sig: number, pf: number, hyd: number, tier: ResolutionTier): number {
  let inside = 0;
  let outside = 40000;
  for (let i = 0; i < 60; i++) {
    const mid = (inside + outside) / 2;
    if (tierFromRatio(detectionRatio(sig, pf, mid, hyd)) >= tier) inside = mid;
    else outside = mid;
  }
  return Math.round(inside);
}

/** The Voice's own ear — HYD 65, and the party's best listener by a long way. */
const heardBy = (sig: number, hyd: number, tier: ResolutionTier, pf = PF_FIELDS): number =>
  rangeForTier(sig, pf, hyd, tier);

const player = CHORD_CONCLAVE.parties.find((party) => party.slot === PLAYER)!;
const works = CHORD_CONCLAVE.parties.find((party) => party.slot !== PLAYER)!;

/** One authored hull of a party, by tag. */
const hull = (tag: string) => [...player.units, ...works.units].find((unit) => unit.tag === tag)!;

/** One formation, by tag — the six are structures on the player's own party. */
const spire = (tag: string) => player.structures!.find((structure) => structure.tag === tag)!;

const VOICE_IDS = ['descant', 'tenor', 'treble', 'alto', 'bass', 'the-drone'] as const;

/** Every stop a `move` beat sends a tag to, in beat order. */
const stopsFor = (tag: string): { atTick: number; x: number; y: number }[] =>
  CHORD_CONCLAVE.beats.flatMap((beat) =>
    beat.kind === 'move' && beat.tag === tag ? [{ atTick: beat.atTick, x: beat.x, y: beat.y }] : []
  );

describe('the outer formations, reused whole — docs/mission-conclave-chord.md §11', () => {
  it('plays on Aptitude’s map literal, untouched, and adds no geometry', () => {
    // §11's most consequential scoping decision: the lattice Aptitude tuned is
    // the standing Vrey has, and a second map would be a second Third. The
    // literal is shared rather than copied, so this is a check that the two
    // missions resolve the same object and not two that happen to agree.
    assert.equal(CHORD_CONCLAVE.mapId, 'outer-formations');
    assert.equal(missionMapById(CHORD_CONCLAVE.mapId), OUTER_FORMATIONS);
    assert.equal(mapById('outer-formations'), undefined, 'the skirmish screen would offer it');
    assert.equal(OUTER_FORMATIONS.seats, 1, '§11: one seat, not balanced');
    assert.equal(OUTER_FORMATIONS.spawns.length, 1, '§11: no second spawn');
    assert.deepEqual(
      { x: OUTER_FORMATIONS.spawns[0]!.x, y: OUTER_FORMATIONS.spawns[0]!.y },
      SEAT,
      '§11: the same spawn at 4,500, 500'
    );
    assert.equal(
      CHORD_CONCLAVE.beats.some((beat) => beat.kind === 'ground'),
      false,
      '§11: no ground beat — the mission adds regions and markers, not water'
    );
  });

  it('cuts seven regions: the six cells, on the grid, and the Approach', () => {
    // §11: "six 500 m cells around the six voices and a restatement of the
    // Approach". The cell is deliberately larger than the formation — §6 asks
    // for a Corvette clipping a corner at 85 m/s, not a hull parked in a gun's
    // face — so the check is that each cell *contains* its voice rather than
    // that it is centred on one.
    assert.equal(CHORD_CONCLAVE.regions.length, 7);
    const approach = CHORD_CONCLAVE.regions.find((region) => region.id === 'approach')!;
    assert.deepEqual(
      [approach.x, approach.y, approach.widthM, approach.heightM],
      [3750, 0, 1250, 1000],
      '§11: the Approach, restated'
    );
    for (const id of VOICE_IDS) {
      const cell = CHORD_CONCLAVE.regions.find((region) => region.id === id)!;
      const voice = spire(id);
      assert.equal(cell.widthM, 500, `${id}: §6 authors a 500 m cell`);
      assert.equal(cell.heightM, 500);
      for (const metres of [cell.x, cell.y, cell.widthM, cell.heightM]) {
        assert.equal(metres % OUTER_FORMATIONS.cellM, 0, `${id}: off the 250 m cell grid`);
      }
      assert.ok(
        voice.x >= cell.x &&
          voice.x <= cell.x + cell.widthM &&
          voice.y >= cell.y &&
          voice.y <= cell.y + cell.heightM,
        `${id}: the cell does not hold its own formation`
      );
    }
  });

  it('rates nothing and sows nothing: every metre is Mid-Water already', () => {
    // §10 and §11: "every metre is Mid-Water and every hull PR-2, so the grant
    // says nothing", which is why this is the mission that declines the
    // pressure grant rather than the one that forgot it. Asserted over the
    // regions *and* the beats, because a `ground` beat carries the same field.
    for (const region of CHORD_CONCLAVE.regions) {
      assert.equal(region.pressureBonus, undefined, `${region.id}: manufactured water`);
    }
    const terrain = terrainFor(OUTER_FORMATIONS);
    for (const thing of [...player.units, ...player.structures!, ...works.units]) {
      assert.ok(
        terrain.admits(thing.x, thing.y, thing.depthM),
        `${thing.tag}: seated in ground that does not admit it`
      );
    }
  });
});

describe('the Third’s party, as docs/mission-conclave-chord.md §3 fields it', () => {
  it('is the Voice and five Corvettes, armed, one role, thirty-seven souls', () => {
    assert.equal(player.units.length, 6, '§3: six hulls, and six voices');
    assert.equal(player.faction, Faction.Hadron);
    assert.equal(
      hull('the-voice').kind,
      UnitKind.Cruiser,
      '§3: Kalliso’s hull and the party’s ears'
    );
    // §11's seat table, to the metre, and §3's roster beside it. Every distance
    // §5, §6 and §7 quote is measured off these six points, so they are the one
    // piece of data in the party worth asserting outright.
    assert.deepEqual(
      player.units.map((unit) => [unit.tag, unit.kind, unit.x, unit.y]),
      [
        ['the-voice', UnitKind.Cruiser, 4500, 500],
        ['first', UnitKind.Corvette, 4300, 400],
        ['second', UnitKind.Corvette, 4700, 400],
        ['third', UnitKind.Corvette, 4200, 600],
        ['fourth', UnitKind.Corvette, 4800, 600],
        ['fifth', UnitKind.Corvette, 4500, 700],
      ],
      '§11: the party, seated at the Approach'
    );
    for (const unit of player.units) {
      assert.equal(unit.role, 'party', '§8: one role, and the mission never marks a hull');
      assert.equal(unit.armed, true, '§5: armed, and told not to win');
      assert.equal(unit.depthM, 1450, '§11: the Approach’s floor');
      assert.equal(unit.pressureRating, undefined, '§3: PR-2 is the roster’s, no refit');
    }
    assert.equal(
      player.units.reduce((total, unit) => total + (unit.souls ?? 0), 0),
      37,
      '§3: thirty-seven, twelve on the Voice and five on each Corvette'
    );
    assert.equal(hull('the-voice').souls, 12);
    // §4's fourth movement, as two roster figures: the ceiling is 28, a
    // Corvette at cruise is exactly 28, and the Voice does not clear it at all.
    assert.equal(CHORD_CONCLAVE.sigBudget, 28, '§4: twenty-eight, a flat scalar this time');
    assert.equal(CORVETTE.sigCruise, 28, '§3: the one piece of luck the Third has');
    assert.ok(CRUISER.sigIdle > CHORD_CONCLAVE.sigBudget, '§4: the Voice has to be silenced');
  });

  it('prebuilds the lattice on the player’s own party, at the Spire’s stat line', () => {
    // §3: what a formation takes from the Spire is the stat line and only the
    // stat line — and it is the player's, which is what makes it shootable and
    // what makes it theirs to lose (§2).
    assert.equal(player.structures?.length, 6, '§3: six formations');
    for (const id of VOICE_IDS) {
      assert.equal(spire(id).kind, StructureKind.SoundingSpire);
      assert.equal(spire(id).depthM, 1700, '§11: the Fields’ floor');
    }
    assert.equal(SPIRE.sigIdle, 30, '§3: 30 idle — the Fields ringing, all tide');
    assert.equal(SPIRE.hyd, 45);
    assert.equal(SPIRE.maxHp, 1800, '§4: nine and a half seconds of a works column');
    // §3's price argument: six at the roster's crystal would be 720 against the
    // 600 the Ninth holds in total, so a formation carries the Spire's figures
    // and not its price. Nothing pays for these; they were cut thirty years ago.
    assert.equal(SPIRE.crystalCost, 120, '§3: the roster’s crystal price, per Spire');
    assert.equal(6 * (SPIRE.crystalCost ?? 0), 720, '§3: against the 600 the Ninth holds in total');
  });

  it('keeps the ceiling off the lattice by reading a role and never the slot', () => {
    // §8 and §13, and it is load-bearing exactly here: `quiet` takes the peak
    // over the hulls carrying the role, so six formations humming at 30 do not
    // fail a ceiling of 28 from tick zero — in the one mission where that
    // would be fatal to the subject.
    const quiet = CHORD_CONCLAVE.objectives.find((o) => o.id === 'the-quiet')!;
    assert.deepEqual(quiet.predicate, { kind: 'quiet', role: 'party', ceilingSig: 28 });
    assert.ok(SPIRE.sigIdle > 28, '§8: the Spires would breach a slot-wide ceiling');
    assert.equal(quiet.terminal, undefined, '§13: a reading and not a rung');
  });

  it('strikes the torpedoes and the yard, and leaves the ping in the party’s hands', () => {
    // §3: the torpedo lock is arithmetic and not a mood — twelve shots at 700
    // against 4,500 hull points would make campaign.md §2 rule 4's label false
    // — and active sonar is priced rather than fenced, which §13 says plainly
    // costs the mission a rung it declines to build.
    const locked = new Set(CHORD_CONCLAVE.locks.map((lock) => lock.ability));
    assert.ok(locked.has('torpedoes'), '§3: nothing is launched on the tide of an interval');
    assert.ok(locked.has('construction'), '§3: nothing is raised, either');
    assert.ok(!locked.has('activeSonar'), '§3: handed over in Nineteen and not taken back');
    assert.ok(!locked.has('weapons'), '§4: the fight is available and lost');
    for (const lock of CHORD_CONCLAVE.locks) {
      assert.ok(lock.reason.trim().length > 0, `${lock.ability}: refused without a reason`);
    }
    assert.equal(CHORD_CONCLAVE.arrayTag, undefined, '§4: no silence order, so no ledger');
    assert.equal(CHORD_CONCLAVE.silenceCeilingSig, 100);
    assert.equal(CHORD_CONCLAVE.debtCapS, 0);
    assert.equal(CHORD_CONCLAVE.escortRadiusM, 0);
    assert.equal(CHORD_CONCLAVE.fauna, false, '§2: the Drift is not populated');
    assert.equal(CHORD_CONCLAVE.walk, undefined);
    assert.equal(CHORD_CONCLAVE.holds, undefined);
    assert.equal(CHORD_CONCLAVE.lifts, undefined);
    assert.equal(CHORD_CONCLAVE.sweep, undefined);
    assert.equal(CHORD_CONCLAVE.commanderAbility, undefined, '§13: declines to spend it');
    for (const party of CHORD_CONCLAVE.parties) assert.equal(party.emitters, undefined);
  });

  it('rigs all six tones to the Voice, at Aptitude’s figures, and asks for none of them', () => {
    // §3: 400 m, bow on, twenty seconds at SIG 80, unchanged. What has changed
    // is what a tone *means* — and no objective counts one, because the only
    // row `sound` feeds here is the conditional beat that fails the rest.
    assert.equal(CHORD_CONCLAVE.soundings?.length, 6);
    for (const sounding of CHORD_CONCLAVE.soundings ?? []) {
      assert.equal(sounding.tag, 'the-voice', '§3: on the Voice’s hull');
      assert.equal(sounding.radiusM, 400);
      assert.equal(sounding.holdTicks, 20 * SIM.TICK_HZ);
      assert.equal(sounding.sig, 80);
      const voice = spire(sounding.id);
      assert.deepEqual({ x: sounding.x, y: sounding.y }, { x: voice.x, y: voice.y });
    }
    assert.equal(
      CHORD_CONCLAVE.objectives.some((o) => o.predicate.kind === 'sound'),
      false,
      '§8: the tally is a failure condition here, never a counter'
    );
    assert.deepEqual(
      (CHORD_CONCLAVE.conditionalBeats ?? [])
        .filter((beat) => beat.when.kind === 'sound')
        .map((beat) => beat.kind),
      ['objective', 'say', 'say'],
      '§9: three effects on one condition, in authored order — the rest fails first'
    );
    for (const beat of CHORD_CONCLAVE.conditionalBeats ?? []) {
      assert.equal(beat.choiceGroup, undefined, '§9: nothing here is exclusive with anything');
    }
    // §9's second table, whole: four conditional beats and no fifth — three on
    // the first completed tone and one on the concern's documented reflex. The
    // relief is scheduled rather than conditional because the works order was
    // written before anybody heard the Order.
    assert.equal(CHORD_CONCLAVE.conditionalBeats?.length, 4);
    assert.deepEqual(CHORD_CONCLAVE.conditionalBeats?.[3]?.when, {
      kind: 'tolerance',
      ticks: 30 * SIM.TICK_HZ,
      tier: ResolutionTier.Classification,
    });
    // The one that matters: the tone fails `the-rest`, latched, and no other
    // conditional touches an objective.
    const failures = (CHORD_CONCLAVE.conditionalBeats ?? []).filter(
      (beat) => beat.kind === 'objective'
    );
    assert.equal(failures.length, 1);
    assert.equal(failures[0]!.kind === 'objective' && failures[0]!.id, 'the-rest');
    assert.equal(
      failures[0]!.kind === 'objective' && failures[0]!.status,
      ObjectiveStatus.Failed,
      '§8: the first completed tone fails the rest'
    );
  });
});

describe('the fight, lost in figures before it starts — docs/mission-conclave-chord.md §4', () => {
  // The Klaxon and the energy class come off the shipped doctrine rather than
  // out of the document: the escort fires at 85 and is over the threshold, the
  // cutters fire at 53 and are not, and a Knight discharge is 10 rather than
  // 25 because §3 lists the two as different weapons.
  const escortFiringSig = CRUISER.sigIdle + firingSigFor(Faction.Bathyarch, CRUISER.sigFiringBurst);
  const cutterFiringSig =
    CORVETTE.sigCruise + firingSigFor(Faction.Bathyarch, CORVETTE.sigFiringBurst);
  const knightFiringSig =
    CORVETTE.sigCruise + firingSigFor(Faction.Hadron, CORVETTE.sigFiringBurst);
  const cruiserDps = CRUISER.attackDamage / CRUISER.attackCooldownS;
  const corvetteDps = CORVETTE.attackDamage / CORVETTE.attackCooldownS;
  const klaxonCruiserDps = cruiserDps * damageMultiplierFor(Faction.Bathyarch, escortFiringSig);

  it('reads the briefing’s four numbers off the roster', () => {
    assert.equal(escortFiringSig, 85, '§4: the escort emits 85 while it fires');
    assert.equal(cutterFiringSig, 53, '§7: the cutters at 53');
    assert.equal(knightFiringSig, 38, '§13: a Knight Corvette firing at 38');
    assert.ok(
      escortFiringSig > FACTION_COMBAT.KLAXON.SIG_THRESHOLD,
      '§4: the escort is over the Klaxon line and the cutters are not'
    );
    assert.ok(cutterFiringSig <= FACTION_COMBAT.KLAXON.SIG_THRESHOLD);
    assert.equal(Math.round(klaxonCruiserDps * 10) / 10, 67.2, '§4: 67.2 under the Klaxon');
    assert.equal(Math.round(corvetteDps * 10) / 10, 41.7);

    // §4's table, both rows.
    const columnHull = 2 * CRUISER.maxHp + 5 * CORVETTE.maxHp;
    const partyHull = CRUISER.maxHp + 5 * CORVETTE.maxHp;
    const columnDps = 2 * klaxonCruiserDps + 5 * corvetteDps;
    const partyDps = cruiserDps + 5 * corvetteDps;
    assert.equal(columnHull, 4500, '§12: four thousand five hundred of hull');
    assert.equal(partyHull, 3300, '§12: against your three thousand three hundred');
    assert.equal(Math.round(columnDps * 10) / 10, 342.7);
    assert.equal(Math.round(partyDps * 10) / 10, 268.3);
    assert.equal(
      CRUISER.attackRangeM - CORVETTE.attackRangeM,
      350,
      '§12: a gun that reaches three hundred and fifty metres further than yours'
    );

    // "Concentrated in sequence, the party is gone in 9.6 seconds and the
    // column in 16.8." The mission is unwinnable by arithmetic, which is what
    // campaign.md §2 rule 4's third and last mission has to be rather than say.
    assert.equal(Math.round((partyHull / columnDps) * 10) / 10, 9.6);
    assert.equal(Math.round((columnHull / partyDps) * 10) / 10, 16.8);
    assert.ok(partyHull / columnDps < columnHull / partyDps, '§4: the party loses the exchange');
  });

  it('prices a formation at nine and a half seconds, and the two cells at 2.2 and 6.3', () => {
    // §4 and §6. The three cutters are the coring; the escort is the figure a
    // player buys by standing in front of it, because it is ordered half a
    // minute behind three cutters that need 14.4 seconds and arrives after
    // every cut (§7, §13).
    const cutters = 3 * corvetteDps;
    assert.equal(Math.round(cutters), 125, '§4: 125 a second between the three of them');
    assert.equal(Math.round((SPIRE.maxHp / cutters) * 10) / 10, 14.4, '§4: three cutters alone');
    const withEscort = cutters + klaxonCruiserDps;
    assert.equal(Math.round(withEscort * 10) / 10, 192.2);
    assert.equal(Math.round((SPIRE.maxHp / withEscort) * 10) / 10, 9.4, '§4: nine and a half');
    // The Alto, where all three cutters and the escort bear.
    assert.equal(Math.round((CORVETTE.maxHp / withEscort) * 10) / 10, 2.2);
    // The Alto's west corners, where a hull holding the Approach's depth drops
    // one cutter — §6's 2.8, and §4's 150.5 a second.
    const twoCutters = 2 * corvetteDps + klaxonCruiserDps;
    assert.equal(Math.round(twoCutters * 10) / 10, 150.5);
    assert.equal(Math.round((CORVETTE.maxHp / twoCutters) * 10) / 10, 2.8);
    // The Drone's north-west corner: one Cruiser, neither relief Corvette.
    assert.equal(Math.round((CORVETTE.maxHp / klaxonCruiserDps) * 10) / 10, 6.3, '§6: KEYSTONE');
    // §6's opening lesson: a Corvette that interposes at the Bass at 00:43 is
    // then the nearest hostile, and lasts 3.4 seconds.
    assert.equal(Math.round((CORVETTE.maxHp / cutters) * 10) / 10, 3.4);
  });

  it('keeps 250 m of water worth something, in three dimensions', () => {
    // §6: gun range is measured in three dimensions while detection is
    // horizontal, and the column works at 1,700 m over ground the party crosses
    // at the Approach's 1,450. It costs nothing — nothing crushes here — and it
    // is not free to give up, because a dive is loud.
    const lift = 1700 - 1450;
    assert.equal(lift, 250);
    assert.equal(
      Math.round(Math.sqrt(CORVETTE.attackRangeM ** 2 - lift ** 2)),
      490,
      '§6: 490 m of a cutter’s 550'
    );
    assert.equal(
      Math.round(Math.sqrt(CRUISER.attackRangeM ** 2 - lift ** 2)),
      865,
      '§6: 865 m of the escort’s 900'
    );
  });
});

describe('the works, as docs/mission-conclave-chord.md §5 seats it', () => {
  const GUN: Record<string, number> = {
    'the-hold': 0,
    escort: CRUISER.attackRangeM,
    'cutter-one': CORVETTE.attackRangeM,
    'cutter-two': CORVETTE.attackRangeM,
    'cutter-three': CORVETTE.attackRangeM,
    'relief-lead': CRUISER.attackRangeM,
    'relief-one': CORVETTE.attackRangeM,
    'relief-two': CORVETTE.attackRangeM,
  };

  it('is one barge, two Cruisers and five Corvettes, and none of them the player’s', () => {
    assert.equal(works.units.length, 8, '§5: the column and the relief');
    assert.equal(works.faction, Faction.Bathyarch);
    assert.equal(hull('the-hold').kind, UnitKind.Harvester);
    assert.equal(hull('the-hold').armed, undefined, '§5: the coring barge is unarmed');
    assert.equal(HARVESTER.attackDamage, 0);
    for (const tag of ['escort', 'relief-lead']) assert.equal(hull(tag).kind, UnitKind.Cruiser);
    for (const tag of ['cutter-one', 'cutter-two', 'cutter-three', 'relief-one', 'relief-two']) {
      assert.equal(hull(tag).kind, UnitKind.Corvette);
      assert.equal(hull(tag).armed, true, '§5: their guns are the cutters');
    }
    for (const unit of works.units) {
      assert.equal(unit.role, undefined, 'a role on a scripted hull is another party in a counter');
      assert.equal(unit.depthM, 1700, '§11: the Fields’ floor');
    }
    // §5's seat table, to the metre. Every arrival time below is walked from
    // these eight points, and §7's whole "what is heard" section is measured
    // against the escort's and the relief's.
    assert.deepEqual(
      works.units.map((unit) => [unit.tag, unit.x, unit.y]),
      [
        ['the-hold', 150, 2000],
        ['escort', 300, 2100],
        ['cutter-one', 250, 1900],
        ['cutter-two', 250, 2100],
        ['cutter-three', 400, 2000],
        ['relief-lead', 100, 2900],
        ['relief-one', 100, 3050],
        ['relief-two', 250, 2950],
      ],
      '§5: seated on the west edge, off the writ’s first stop'
    );
  });

  it('seats every hull outside its own gun’s reach of a formation', () => {
    // §5, and it is a design rather than a courtesy: a gun takes the nearest
    // live hostile in range, so a column seated 600 m from a Spire would core
    // the Bass before the writ was read.
    for (const unit of works.units) {
      const nearest = Math.min(...VOICE_IDS.map((id) => dist(unit, spire(id))));
      assert.ok(
        nearest > GUN[unit.tag]!,
        `${unit.tag}: seated ${nearest.toFixed(0)} m from a formation, against a ${GUN[unit.tag]} m gun`
      );
    }
    assert.equal(Math.round(dist(hull('cutter-three'), spire('bass'))), 1030, '§5: the nearest');
    assert.equal(Math.round(dist(hull('escort'), spire('bass'))), 1166);
    assert.equal(Math.round(dist(hull('relief-lead'), spire('the-drone'))), 1005);
  });

  it('walks three legs whose arrival times are §5’s, at each hull’s own roster speed', () => {
    // §13: the column moves at no formation speed, so one order to four hulls
    // arrives spread. The table below is §5's "Standing by" column, recomputed
    // from the authored beats and the roster rather than transcribed.
    const speed: Record<string, number> = {
      'the-hold': HARVESTER.speed,
      escort: CRUISER.speed,
      'cutter-one': CORVETTE.speed,
      'cutter-two': CORVETTE.speed,
      'cutter-three': CORVETTE.speed,
      'relief-lead': CRUISER.speed,
      'relief-one': CORVETTE.speed,
      'relief-two': CORVETTE.speed,
    };
    /** When `tag` stands at its `leg`-th stop, in seconds, walking every leg. */
    function standsAt(tag: string, leg: number): number {
      let from = { x: hull(tag).x, y: hull(tag).y };
      let seconds = 0;
      for (let i = 0; i <= leg; i++) {
        const stop = stopsFor(tag)[i]!;
        seconds = stop.atTick / SIM.TICK_HZ + dist(from, stop) / speed[tag]!;
        from = { x: stop.x, y: stop.y };
      }
      return seconds;
    }
    // Leg one, onto the Bass: cutters at ~02:40, ~02:43 and ~02:40, the hold at
    // ~02:57, and the escort half a minute behind them at ~03:18.
    assert.equal(Math.round(standsAt('cutter-one', 0)), 160);
    assert.equal(Math.round(standsAt('cutter-two', 0)), 163);
    assert.equal(Math.round(standsAt('cutter-three', 0)), 160);
    assert.equal(Math.round(standsAt('the-hold', 0)), 177);
    assert.equal(Math.round(standsAt('escort', 0)), 198);
    // Leg two, onto the Drone: ~05:18–05:21, the hold ~05:42, the escort ~06:19.
    assert.equal(Math.round(standsAt('cutter-one', 1)), 319);
    assert.equal(Math.round(standsAt('cutter-two', 1)), 318);
    assert.equal(Math.round(standsAt('cutter-three', 1)), 321);
    assert.equal(Math.round(standsAt('the-hold', 1)), 342);
    assert.equal(Math.round(standsAt('escort', 1)), 379);
    // Leg three, onto the Alto: 1,237 m for every cutter, ~10:45, the hold
    // ~11:01, the escort ~11:43. And the relief, which stands at ~09:27 and
    // does not move again.
    for (const tag of ['cutter-one', 'cutter-two', 'cutter-three']) {
      assert.equal(Math.round(standsAt(tag, 2)), 645, `${tag}: §5's third leg`);
    }
    assert.equal(Math.round(standsAt('the-hold', 2)), 661);
    assert.equal(Math.round(standsAt('escort', 2)), 702);
    assert.equal(Math.round(standsAt('relief-lead', 0)), 567);
    for (const tag of ['relief-lead', 'relief-one', 'relief-two']) {
      assert.equal(stopsFor(tag).length, 1, '§5: the relief does not move again');
    }
  });

  it('stands the column over the formation it is cutting, on Fields ground', () => {
    // §6: across the three authored stops a standing formation is 150–250 m
    // from its cutters, which is the whole of why the column shoots the
    // formation and not the hull beside it. And §11: every stop is at 1,700 m
    // on Fields ground — the southernmost, 2,300, 3,450, is 50 m north of the
    // Seam, whose PF would otherwise carry the party's cone twice as far.
    const cutting: [string, number][] = [
      ['bass', 0],
      ['the-drone', 1],
      ['alto', 2],
    ];
    for (const [voice, leg] of cutting) {
      for (const tag of ['cutter-one', 'cutter-two', 'cutter-three']) {
        const range = dist(stopsFor(tag)[leg]!, spire(voice));
        assert.ok(range >= 150 && range <= 250, `${tag} at ${voice}: ${range.toFixed(0)} m`);
        assert.ok(range < CORVETTE.attackRangeM, `${tag} cannot reach ${voice}`);
      }
      assert.ok(dist(stopsFor('escort')[leg]!, spire(voice)) < CRUISER.attackRangeM);
    }
    const seam = OUTER_FORMATIONS.regions.find((region) => region.biome === Biome.AbyssalTrench)!;
    for (const beat of CHORD_CONCLAVE.beats) {
      if (beat.kind !== 'move') continue;
      assert.ok(beat.y < seam.y, `a stop at ${beat.x},${beat.y} is in the Seam`);
    }
    assert.equal(seam.y, 3500, '§11: the Seam begins at y 3,500');
    // Descant, Tenor and Treble are not on the order and nothing goes near them.
    for (const id of ['descant', 'tenor', 'treble'] as const) {
      for (const beat of CHORD_CONCLAVE.beats) {
        if (beat.kind !== 'move') continue;
        assert.ok(dist(beat, spire(id)) > CRUISER.attackRangeM, `${id} is on somebody's order`);
      }
    }
  });
});

describe('what is heard — docs/mission-conclave-chord.md §7', () => {
  const VOICE_HYD = CRUISER.hyd;
  const ESCORT_HYD = CRUISER.hyd;

  it('opens with the column outside the Voice’s ear by 670 m', () => {
    // §5 and §9: the party's seat is 4,494 m from the escort, and an idle
    // Cruiser at 55 in 0.70 water is a contact from 3,824 m. Deliberate, and
    // not a hole — what the Third has at the top of the tide is a writ on an
    // open channel and Vrey's arithmetic.
    const idle = heardBy(CRUISER.sigIdle, VOICE_HYD, ResolutionTier.Contact);
    assert.equal(idle, 3824);
    assert.equal(Math.round(dist(SEAT, hull('escort'))), 4494);
    assert.equal(Math.round(dist(SEAT, hull('escort'))) - idle, 670, '§9: 670 m outside it');
  });

  it('gives the escort’s walk eleven seconds inside the ear, and nothing else', () => {
    // §7's smudge: a Cruiser under way at 65 is a contact from 4,245 m and is
    // inaudible again the moment it stands, at 3,905 m against an idle
    // Cruiser's 3,824. The second walk ends 4,326 m out, outside both.
    const underWay = heardBy(CRUISER.sigCruise, VOICE_HYD, ResolutionTier.Contact);
    const idle = heardBy(CRUISER.sigIdle, VOICE_HYD, ResolutionTier.Contact);
    assert.equal(underWay, 4245);
    const first = stopsFor('escort')[0]!;
    const second = stopsFor('escort')[1]!;
    assert.equal(Math.round(dist(SEAT, first)), 3905);
    assert.ok(dist(SEAT, first) > idle, '§7: inaudible again the moment it stands');
    assert.ok(dist(SEAT, first) < underWay, '§7: it was audible while it walked');
    // 4,326.7 m, which §7 prints as 4,327 — it read 4,326 until the same pass
    // that repaired the Bass stops, being the one distance in the document
    // truncated where every other figure in §5 and §7 rounds to nearest. The
    // claim it is quoted for is the inequality on the line below, unaffected
    // either way.
    assert.equal(Math.round(dist(SEAT, second)), 4327);
    assert.ok(dist(SEAT, second) > underWay, '§7: the second walk ends outside the ear');
  });

  it('lets the column resolve two of the writ’s three formations before it moves', () => {
    // §7: to the escort at HYD 65 a formation at 30 is a bearing from 2,032 m
    // and a classification from 1,477 m.
    //
    // **A second defect in §7's prose, pinned rather than authored around.**
    // The paragraph reads "the column resolved this lattice from over a
    // kilometre out before it moved, which is why the writ names three
    // formations and not a search". From the seats §5 authors it resolved
    // *two* of the three: the Bass at 1,166 m and the Drone at 1,204 m are
    // inside the escort's classification, and the Alto at 2,332 m is outside
    // even its 2,032 m bearing — as is the nearest relief seat, at 2,236 m.
    // §1's "the concern's survey has filed" already supplies the third, so the
    // sentence is over-claimed rather than load-bearing; nothing in the writ
    // moves. Held by test in both directions so a rewrite of either is felt.
    assert.equal(heardBy(SPIRE.sigIdle, ESCORT_HYD, ResolutionTier.Bearing), 2032);
    const bearing = heardBy(SPIRE.sigIdle, ESCORT_HYD, ResolutionTier.Bearing);
    const classified = heardBy(SPIRE.sigIdle, ESCORT_HYD, ResolutionTier.Classification);
    assert.equal(classified, 1477);
    assert.equal(Math.round(dist(hull('escort'), spire('bass'))), 1166);
    assert.equal(Math.round(dist(hull('escort'), spire('the-drone'))), 1204);
    assert.ok(dist(hull('escort'), spire('bass')) < classified);
    assert.ok(dist(hull('escort'), spire('the-drone')) < classified);
    // The Alto, from every seat the column has, against the escort's own ears —
    // the best on the writ's side of the map.
    assert.equal(Math.round(dist(hull('escort'), spire('alto'))), 2332);
    assert.equal(Math.round(dist(hull('relief-lead'), spire('alto'))), 2236);
    for (const unit of works.units) {
      assert.ok(
        dist(unit, spire('alto')) > bearing,
        `${unit.tag}: §7's "resolved this lattice" would hold for the Alto after all`
      );
    }
  });

  it('reads §7’s three Bass stops the way the water does, nearest first', () => {
    // §7 once called 3,775 m the cutters' *nearest* Bass stop and concluded
    // that a party which has not moved hears nothing at 02:40. It is the
    // *farthest* of §5's three: from the seat they are 3,590 m, 3,699 m and
    // 3,775 m, so two of the three are inside the Voice's 3,737 m and the
    // party does hear the lattice being cut without moving — as a directionless
    // Tier 1 smudge, because a bearing on a cutter at 53 wants 2,900 m and a
    // classification 2,108, and the nearest stop is outside both. §5's stops
    // were the authored fact and the literal transcribes them unchanged; §7 is
    // corrected and §13 records it. Pinned here so it cannot be lost again.
    const cutterSig = CORVETTE.sigCruise + firingSigFor(Faction.Bathyarch, CORVETTE.sigFiringBurst);
    assert.equal(cutterSig, 53);
    const firing = heardBy(cutterSig, CRUISER.hyd, ResolutionTier.Contact);
    assert.equal(firing, 3737, '§7: the cutters firing at 53');
    const bassStops = ['cutter-one', 'cutter-two', 'cutter-three']
      .map((tag) => Math.round(dist(SEAT, stopsFor(tag)[0]!)))
      .sort((a, b) => a - b);
    assert.deepEqual(bassStops, [3590, 3699, 3775]);
    assert.ok(bassStops[0]! < firing, '§7: two of the three are inside the Voice’s ear');
    assert.ok(bassStops[1]! < firing);
    assert.ok(bassStops[2]! > firing, '§7: and only the farthest is outside it');
    // The smudge, and the whole of it: no bearing and no classification.
    assert.equal(
      heardBy(cutterSig, CRUISER.hyd, ResolutionTier.Bearing),
      2900,
      '§7: a bearing on a cutter at 53 wants 2,900 m'
    );
    assert.equal(heardBy(cutterSig, CRUISER.hyd, ResolutionTier.Classification), 2108);
    assert.ok(bassStops[0]! > 2900, '§7: the nearest stop is outside both');
    // And the half of §8's telegraph that needs no ear at all: the lattice is
    // the player's own force, so the Bass's hull points fall on their own panel
    // while they fall, eleven and a half minutes before the close.
    assert.equal(spire('bass').tag, 'bass');
    assert.ok(
      player.structures!.every((structure) => structure.kind === StructureKind.SoundingSpire)
    );
  });

  it('keeps the relief’s Corvettes for a party that has already gone west', () => {
    // §7: the two relief Corvettes at 28 reach a Knight Corvette's HYD 50 from
    // 2,129 m, and the relief-lead crosses the Voice's 4,245 m in the last
    // seconds of its walk.
    assert.equal(heardBy(CORVETTE.sigCruise, CORVETTE.hyd, ResolutionTier.Contact), 2129);
    const stop = stopsFor('relief-lead')[0]!;
    assert.ok(dist(SEAT, hull('relief-lead')) > 4245, '§7: seated outside the ear');
    assert.ok(dist(SEAT, stop) < 4245, '§7: and standing inside it');
  });

  it('makes the Seam a trap for a hull that overshoots the Treble', () => {
    // §6: PF 1.60 classifies a Corvette's cone at 2,371 m, against 1,414 m in
    // the Fields — the one strip of ground on this map that carries, and the
    // only thing on it that is not the mission's own business.
    assert.equal(
      heardBy(CORVETTE.sigCruise, CRUISER.hyd, ResolutionTier.Classification, PF_SEAM),
      2371
    );
    assert.equal(heardBy(CORVETTE.sigCruise, CRUISER.hyd, ResolutionTier.Classification), 1414);
    assert.ok(PF_SEAM / PF_FIELDS > 2, '§11: the Seam carries, and it more than doubles');
  });
});

describe('the six voices, stood — docs/mission-conclave-chord.md §6 and §8', () => {
  const voiceRows = VOICE_IDS.map((id) =>
    CHORD_CONCLAVE.objectives.find((o) => o.id === `${id}-stood`)!
  );

  it('asks one hull of the party into each cell, revealed at thirteen-thirty', () => {
    // §8: `revealAtTick` withholds an objective from the panel *and* from
    // derivation, which is the latch the whole row depends on — an `extract`
    // latches Met and is never re-derived, so a hull that happened to be at the
    // Bass at 04:00 must not have stood the Bass at the interval.
    for (const row of voiceRows) {
      assert.equal(row.terminal, true);
      assert.equal(row.revealAtTick, T(13, 30), `${row.id}: not scored before it is asked for`);
      assert.deepEqual(row.predicate, {
        kind: 'extract',
        role: 'party',
        region: row.id.replace(/-stood$/, ''),
        count: 1,
      });
      assert.ok(row.reading !== undefined, `${row.id}: the close cannot read it`);
      assert.equal(row.markerId, row.id.replace(/-stood$/, ''));
    }
    // §8 and §9: the reveal needs a beat on its own tick (`missions.test.ts`
    // holds every mission to that), and this mission's is Vrey handing the six
    // voices over — not any beat that happens to share the tick.
    const handover = CHORD_CONCLAVE.beats.find((beat) => beat.atTick === T(13, 30))!;
    assert.equal(handover.kind, 'say');
    assert.equal(
      handover.kind === 'say' && handover.speaker,
      'Chapter-Master Halden Vrey',
      '§12: the thirty-seconds line'
    );
    assert.match(
      handover.kind === 'say' ? handover.text : '',
      /^Thirty seconds\. Six voices, and the ceiling is twenty-eight\./
    );
  });

  it('starts the party in none of the six cells, so nothing latches at tick zero', () => {
    // The trap an `extract` sets for a mission that seats hulls inside its own
    // region: the row would read Met on the first pass and never be re-derived.
    // Here the reveal already stops it, and the geometry stops it twice.
    for (const id of VOICE_IDS) {
      const cell = CHORD_CONCLAVE.regions.find((region) => region.id === id)!;
      for (const unit of player.units) {
        const inside =
          unit.x >= cell.x &&
          unit.x <= cell.x + cell.widthM &&
          unit.y >= cell.y &&
          unit.y <= cell.y + cell.heightM;
        assert.equal(inside, false, `${unit.tag} starts inside ${id}`);
      }
    }
  });

  it('keeps §6’s six points to the metre, and Aptitude’s reach from the seat', () => {
    // §6: "the same six formations, and a document that moved them would be
    // describing a different house." The seconds are the roster's — a Corvette
    // at 85 m/s, the Voice at 45 — and they are why Descant is the Cruiser's.
    const reach: Record<string, [number, number]> = {
      descant: [1020, 23],
      tenor: [1304, 15],
      treble: [2751, 32],
      alto: [3561, 42],
      bass: [3650, 43],
      'the-drone': [4220, 50],
    };
    for (const id of VOICE_IDS) {
      const [metres, seconds] = reach[id]!;
      const range = dist(SEAT, spire(id));
      assert.equal(Math.round(range), metres, `${id}: §6's distance from the seat`);
      const speed = id === 'descant' ? CRUISER.speed : CORVETTE.speed;
      assert.equal(Math.round(range / speed), seconds, `${id}: §6's transit`);
    }
    // §9's unannounced clock: 4,220 m at 85 m/s is fifty seconds, so a Corvette
    // that has not left the Approach by about 12:40 does not stand the Drone
    // when the row is revealed.
    assert.equal(Math.round(dist(SEAT, spire('the-drone')) / CORVETTE.speed), 50);
  });

  it('leaves the lattice unpaired, which is why the cells are standable at all', () => {
    // §3: three voices are inside docs/mission-standing-wave.md §4's 1,500 m,
    // and a lattice that paired would lay corridors of sonic damage and PF 2.00
    // across the exact cells §6 asks six hulls to stand in. Nothing pairs,
    // because pairing happens at the moment a node *completes* and these six
    // are prebuilt — so the ranges are asserted as the hazard they are not.
    assert.equal(Math.round(dist(spire('tenor'), spire('descant'))), 1421);
    assert.equal(Math.round(dist(spire('treble'), spire('alto'))), 1315);
    assert.equal(Math.round(dist(spire('alto'), spire('the-drone'))), 1237);
    for (const structure of player.structures ?? []) {
      assert.equal(structure.kind, StructureKind.SoundingSpire);
    }
  });

  it('makes the Alto the whole column’s water and the Drone one Cruiser’s', () => {
    // §6's last two rows, computed over the cells rather than quoted. The Alto:
    // every metre inside the escort's 900 and at least one cutter's 550. The
    // Drone: its north-west corner is 652 m from relief-lead — inside a
    // Cruiser's 900 and outside both relief Corvettes' 550 — which is the
    // cheapest metre on the keystone and still costs 67.2 a second.
    const alto = CHORD_CONCLAVE.regions.find((region) => region.id === 'alto')!;
    const escortStop = stopsFor('escort')[2]!;
    const cutterStops = ['cutter-one', 'cutter-two', 'cutter-three'].map(
      (tag) => stopsFor(tag)[2]!
    );
    for (let x = alto.x; x <= alto.x + alto.widthM; x += 25) {
      for (let y = alto.y; y <= alto.y + alto.heightM; y += 25) {
        const here = { x, y };
        assert.ok(dist(here, escortStop) <= CRUISER.attackRangeM, `${x},${y} is outside the 900`);
        assert.ok(
          Math.min(...cutterStops.map((stop) => dist(here, stop))) <= CORVETTE.attackRangeM,
          `${x},${y} is outside every cutter`
        );
      }
    }
    const drone = CHORD_CONCLAVE.regions.find((region) => region.id === 'the-drone')!;
    const northWest = { x: drone.x, y: drone.y };
    assert.equal(Math.round(dist(northWest, stopsFor('relief-lead')[0]!)), 652);
    assert.ok(dist(northWest, stopsFor('relief-lead')[0]!) < CRUISER.attackRangeM);
    for (const tag of ['relief-one', 'relief-two']) {
      assert.ok(
        dist(northWest, stopsFor(tag)[0]!) > CORVETTE.attackRangeM,
        `${tag} bears on the cheapest metre of the keystone`
      );
    }
  });
});

describe('the rest, and the twelve ticks that make it read — §8 and §13', () => {
  /** The sink is required and never reached: nothing in these fixtures orders. */
  const SINK: MissionCommandSink = {
    applyMove: () => {},
    applyDepth: () => true,
    applySilent: () => {},
    applyPing: () => {},
  };

  /** One objective, one rule — `missionIntake.test.ts`' fixture idiom. */
  function fixture(overrides: Partial<MissionDefinition>): MissionDefinition {
    return {
      ...PROLOGUE_SORROWGATE,
      id: 'test-conclave-rest',
      arrayTag: undefined,
      sweep: undefined,
      lifts: undefined,
      regions: [],
      markers: [],
      parties: [],
      conditionalBeats: undefined,
      beats: [],
      ...overrides,
    };
  }

  function still(tick: number): EchoSnapshot {
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

  /** Drive an empty tide and report the pass it closed on, and how. */
  function run(definition: MissionDefinition, passes: number) {
    const runtime = new MissionRuntime(definition);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    for (let pass = 1; pass <= passes; pass++) {
      world.tick = pass * ECHO_TICK_INTERVAL;
      const resolution = runtime.tick(world, SINK, still(world.tick));
      if (resolution !== null) return { pass, ...resolution };
    }
    return null;
  }

  const rest = (ticks: number): MissionObjective => ({
    id: 'the-rest',
    text: '',
    initial: ObjectiveStatus.Pending,
    terminal: true,
    keystone: true,
    predicate: { kind: 'endure', ticks },
  });

  it('authors the rest one mission pass short of the close, and the twelve is load-bearing', () => {
    // §8, and §13's row: an `endure`'s clock is stamped the first time the
    // runtime derives the objective, which is one Echo interval into the match
    // rather than tick zero. So the row comes due on the close's own pass only
    // if it is authored `T(14, 30) − 12`, and the round figure comes due one
    // pass *after* the tide the mission can have — a Lost reading on a perfect
    // defence, in the mission whose subject is a refusal that was kept.
    const row = CHORD_CONCLAVE.objectives.find((o) => o.id === 'the-rest')!;
    assert.deepEqual(row.predicate, { kind: 'endure', ticks: T(14, 30) - ECHO_TICK_INTERVAL });
    assert.equal(ECHO_TICK_INTERVAL, 12, 'SIM.TICK_HZ / SIM.ECHO_HZ');

    const closesOn = (ticks: number) => run(fixture({ objectives: [rest(ticks)] }), 4400)?.pass;
    // As authored: due on the pass the close falls on, which is 14:30 exactly.
    assert.equal(closesOn(T(14, 30) - ECHO_TICK_INTERVAL), T(14, 30) / ECHO_TICK_INTERVAL);
    // At the round figure: one pass late, and the mission's own resolve beat
    // has already fired by then.
    assert.equal(closesOn(T(14, 30)), T(14, 30) / ECHO_TICK_INTERVAL + 1);
  });

  it('fails the rest before derivation could read it Met, on the same pass', () => {
    // §8's tick order, driven: conditional beats fire after every tally and
    // immediately before the objectives are derived, and derivation skips a
    // `Failed` row for good. So a tone completed on the closing pass fails the
    // keystone even though the endure comes due on that very pass — and an
    // unmet keystone reads the whole count as Lost.
    const due = ECHO_TICK_INTERVAL * 4;
    const struck = fixture({
      objectives: [rest(due)],
      conditionalBeats: [
        {
          kind: 'objective',
          id: 'the-rest',
          status: ObjectiveStatus.Failed,
          note: 'the lattice, struck',
          // The conditional's own clock is stamped on the first pass too, so
          // this comes due on exactly the pass the endure does.
          when: { kind: 'endure', ticks: due },
        },
      ],
      beats: [{ atTick: ECHO_TICK_INTERVAL * 8, kind: 'resolve', conclusion: true, note: '' }],
    });
    const lost = run(struck, 12);
    assert.equal(lost?.pass, 8, 'the tide ran its length: the rest never closed it');
    assert.equal(lost?.outcome, MissionOutcome.Lost, '§8: either keystone unmet is Lost');
    assert.equal(lost?.objectives.find((o) => o.id === 'the-rest')?.status, ObjectiveStatus.Failed);
    // The mirror: the same tide with nothing struck closes on the endure.
    assert.equal(run(fixture({ objectives: [rest(due)] }), 12)?.outcome, MissionOutcome.Complete);
  });

  it('refuses to fail a rest that is already met', () => {
    // §8's other direction, and the guard `deriveObjectives` holds against
    // beats too: a row that has been met is a thing that happened. A tone one
    // pass *after* the rest came due cannot un-play it — which is why the
    // document is careful that the failure is due on the same pass and not the
    // one after.
    const kept = fixture({
      runsItsLength: true,
      objectives: [rest(ECHO_TICK_INTERVAL * 4)],
      conditionalBeats: [
        {
          kind: 'objective',
          id: 'the-rest',
          status: ObjectiveStatus.Failed,
          note: 'a tone taken after the interval has passed',
          when: { kind: 'endure', ticks: ECHO_TICK_INTERVAL * 5 },
        },
      ],
      beats: [{ atTick: ECHO_TICK_INTERVAL * 8, kind: 'resolve', conclusion: true, note: '' }],
    });
    const run8 = run(kept, 12);
    assert.equal(run8?.pass, 8);
    assert.equal(run8?.outcome, MissionOutcome.Complete);
  });
});

describe('the close, as docs/mission-conclave-chord.md §8 and §9 read it', () => {
  it('runs seven terminal rows on two keystones, and two readings that rank nothing', () => {
    const terminal = CHORD_CONCLAVE.objectives.filter((o) => o.terminal === true);
    assert.equal(terminal.length, 7, '§8: six voices and the rest');
    assert.deepEqual(
      terminal.filter((o) => o.keystone === true).map((o) => o.id),
      ['the-drone-stood', 'the-rest'],
      '§8: the chord does not certify without the Drone, and a rest is not an absence'
    );
    for (const id of ['the-quiet', 'the-count']) {
      const row = CHORD_CONCLAVE.objectives.find((o) => o.id === id)!;
      assert.equal(row.terminal, undefined, `${id}: §8 reads it out rather than ranking it`);
      assert.ok(row.reading !== undefined);
    }
    // §8's readings print in authored order beneath whichever epilogue the
    // count earned, and the document fixes that order: the voices, the rest,
    // the quiet, the count.
    assert.deepEqual(
      CHORD_CONCLAVE.objectives.map((o) => o.id),
      [
        'descant-stood',
        'tenor-stood',
        'treble-stood',
        'alto-stood',
        'bass-stood',
        'the-drone-stood',
        'the-rest',
        'the-quiet',
        'the-count',
      ]
    );
    // The tolerance is the concern's, cumulative, and meeting it is not bad
    // news — docs/mission-aptitude.md §5's thirty seconds, a year later.
    assert.deepEqual(CHORD_CONCLAVE.objectives.find((o) => o.id === 'the-count')!.predicate, {
      kind: 'tolerance',
      ticks: 30 * SIM.TICK_HZ,
      tier: ResolutionTier.Classification,
    });
    // §8's "Text, in register" column, verbatim. The panel is the only place
    // the player is told what the interval asks, and campaign.md §10 forbids
    // assembling one — so the nine strings are the document's or they are
    // wrong, and a paraphrase is not a smaller failure than a missing row.
    assert.deepEqual(
      CHORD_CONCLAVE.objectives.map((o) => o.text),
      [
        'Descant is stood. A hull at the voice, under the ceiling, for the interval.',
        'Tenor is stood.',
        'Treble is stood.',
        'Alto is stood.',
        'Bass is stood.',
        'The Drone is stood. The chord does not certify without it.',
        "The interval is the Third's. Nothing is struck. A rest is written down, it is played, and it is not an absence.",
        'The Third is quiet at its own interval. Twenty-eight, and the Voice under silence.',
        'A concern is coring under a writ. What is classified of the party is filed, and the escort defines obstruction.',
      ]
    );
    // §8's readings, in the document's own template: the voice rows carry the
    // placeholder filled with the name, and the Drone's marker is the one §8
    // quotes outright.
    assert.deepEqual(
      ['descant-stood', 'the-drone-stood']
        .map((id) => CHORD_CONCLAVE.objectives.find((o) => o.id === id)!)
        .map((row) => [row.reading!.met, row.reading!.unmet]),
      [
        ['Descant was stood.', 'Descant was not stood. The interval passed it as drift.'],
        ['The Drone was stood.', 'The Drone was not stood. The interval passed it as drift.'],
      ]
    );
    assert.equal(
      CHORD_CONCLAVE.markers.find((marker) => marker.id === 'the-drone')!.label,
      'The Drone. The chord does not certify without it.',
      '§8: the Drone’s marker, verbatim'
    );
  });

  it('runs the mission to its own resolve, with nothing that could close it early', () => {
    // Trap two, as data: a terminal row met at tick zero would close the
    // mission on its first pass unless `runsItsLength` says otherwise, and this
    // literal authors neither the flag nor the need for it. Six of the seven
    // terminal rows are withheld from derivation until 13:30 and the seventh is
    // an `endure` that cannot read Met before 14:30, so `terminal.every(Met)`
    // is false on every pass before the close's own. Driven at the runtime in
    // the suite above; asserted here as the two authored facts it rests on.
    assert.equal(CHORD_CONCLAVE.runsItsLength, undefined, '§8: nothing needs the flag');
    for (const row of CHORD_CONCLAVE.objectives) {
      if (row.terminal !== true) continue;
      const withheld = row.revealAtTick === T(13, 30);
      const endures = row.predicate.kind === 'endure';
      assert.ok(withheld || endures, `${row.id}: terminal, derived from tick zero, and latching`);
      assert.equal(row.initial, ObjectiveStatus.Pending);
    }
  });

  it('closes at fourteen-thirty as a conclusion, and clears §10 anyway', () => {
    // §8: the interval passes at its appointed time whatever is standing, so
    // the close is a conclusion and campaign.md §10's telegraph exempts it. It
    // clears the rule by eleven and a half minutes regardless — the writ is
    // read out at 00:30 naming how many formations the column intends to core.
    const resolve = CHORD_CONCLAVE.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.atTick, T(14, 30));
    assert.equal(resolve.kind === 'resolve' && resolve.conclusion, true);
    const writ = CHORD_CONCLAVE.beats.find(
      (beat) => beat.kind === 'say' && beat.speaker.startsWith('Surveyor Ade Bramm')
    )!;
    assert.equal(writ.atTick, T(0, 30));
    assert.ok(
      (resolve.atTick - writ.atTick) / SIM.TICK_HZ >= MISSION.FAILURE_TELEGRAPH_S,
      '§8: eleven and a half minutes against §10’s sixty seconds'
    );
    // §9's length: 870 s, inside the header's own advertised band.
    const [low, high] = CHORD_CONCLAVE.lengthBandS;
    assert.equal(resolve.atTick / SIM.TICK_HZ, 870);
    assert.ok(870 >= low && 870 <= high);
    assert.deepEqual([low, high], [840, 900], '§9: the document’s own band');
  });

  it('speaks the world’s clock and nothing of the player’s', () => {
    // §9: the column's legs and the chapter channel are scheduled; where the
    // party is at any tick is the player's business. Four spoken beats on the
    // clock, in the document's order, and the interval itself.
    const said = CHORD_CONCLAVE.beats
      .filter((beat) => beat.kind === 'say')
      .map((beat) => beat.atTick);
    assert.deepEqual(said, [0, T(0, 30), T(8), T(9, 30), T(13, 30), T(14), T(14, 30)]);
    // §13: twenty-six beats — eighteen `move`, seven `say`, one `resolve`, and
    // nothing else. The breakdown is the assertion that catches a beat added or
    // dropped, and it is where the absent kinds are held: no `creature`, so
    // nothing in this mission carries a species' working depth (§2), and no
    // `ping`, `silent`, `lose`, `release`, `ground`, `bell` or `objective`.
    assert.equal(CHORD_CONCLAVE.beats.length, 26);
    const kinds = new Map<string, number>();
    for (const beat of CHORD_CONCLAVE.beats) kinds.set(beat.kind, (kinds.get(beat.kind) ?? 0) + 1);
    assert.deepEqual([...kinds].sort(), [
      ['move', 18],
      ['resolve', 1],
      ['say', 7],
    ]);
    // §5's three legs, in the order the writ names them: the Bass, the Drone,
    // the Alto, with the escort ordered half a minute behind each.
    assert.deepEqual(
      CHORD_CONCLAVE.beats.filter((beat) => beat.kind === 'move').map((beat) => beat.atTick),
      [
        ...Array<number>(4).fill(T(2, 30)),
        T(3),
        ...Array<number>(4).fill(T(5)),
        T(5, 45),
        ...Array<number>(3).fill(T(9)),
        ...Array<number>(4).fill(T(10, 30)),
        T(11, 15),
      ]
    );
    for (let i = 1; i < CHORD_CONCLAVE.beats.length; i++) {
      assert.ok(
        CHORD_CONCLAVE.beats[i]!.atTick >= CHORD_CONCLAVE.beats[i - 1]!.atTick,
        'the runtime walks the beats with a cursor'
      );
    }
    // §13: "the column has lost a cutter" is inexpressible, so Kalliso's line
    // is on the clock and is written to be true either way.
    const kalliso = CHORD_CONCLAVE.beats.find(
      (beat) => beat.kind === 'say' && beat.speaker.startsWith('Voice Ren Kalliso')
    )!;
    assert.equal(kalliso.atTick, T(9, 30));
    // Sull says one word at fourteen whatever is standing, and one sentence at
    // the close in every ending.
    const sull = CHORD_CONCLAVE.beats.filter(
      (beat) => beat.kind === 'say' && beat.speaker.includes('Ivane Sull')
    );
    assert.equal(sull.length, 2);
    assert.equal(sull[0]!.kind === 'say' && sull[0]!.text, 'Heard.');
  });

  it('reads three rungs for four results, and says so in register', () => {
    // §8 and §13: `epilogue` is three strings, so the difference between
    // *Drift* (the Drone not stood) and *Called* (the lattice struck) is
    // carried by the two keystones' own unmet readings printing beneath a Lost
    // line true of both. Asserted by their opening words, so a rewrite in the
    // document is felt here rather than absorbed silently.
    assert.match(CHORD_CONCLAVE.epilogue[MissionOutcome.Complete], /^Six stood, nothing struck\./);
    assert.match(
      CHORD_CONCLAVE.epilogue[MissionOutcome.Partial],
      /^The interval passed with the Third short a voice\./
    );
    assert.match(
      CHORD_CONCLAVE.epilogue[MissionOutcome.Lost],
      /^The interval passed and there was nothing in it to hear\./
    );
    const drone = CHORD_CONCLAVE.objectives.find((o) => o.id === 'the-drone-stood')!;
    const rest = CHORD_CONCLAVE.objectives.find((o) => o.id === 'the-rest')!;
    assert.match(drone.reading!.unmet, /passed it as drift/, '§8: Drift');
    assert.match(rest.reading!.unmet, /^The Third called\./, '§8: Called');
  });
});
