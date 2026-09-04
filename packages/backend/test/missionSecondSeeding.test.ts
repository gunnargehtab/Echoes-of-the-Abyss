/**
 * The Second Seeding 7, read and run — docs/mission-second-seeding.md.
 *
 * `missions.test.ts` holds every mission to §10's conventions; this file holds
 * the campaign's ending to the things only its own document claims, and to the
 * one format row it is the reason for.
 *
 * - **Every cross-biome figure is re-derived from `pathPropagation`**, as §13
 *   asks in as many words: "re-derive every figure in §6 and §7 from
 *   `pathPropagation` over the literal's own grid rather than from
 *   `PROPAGATION_FACTOR` alone, so a repaint of the terraces would move the
 *   document's ranges instead of falsifying them". The reader working face-two
 *   has the bed at 3.35 from its own station through a path mean of 1.300; the
 *   heavy on the terraces has a veiled sowing at 1.76 through 1.150; the
 *   reconnaissance has nothing at 0.54 through 0.925. None of those is the
 *   lip's 1.6, and none of them is written down here as a constant.
 * - **The zone is the mission, and it arrives at a tick** (§4.3, §13). The lip
 *   carries no grant at 00:00 and gains one when the sowing completes, by a
 *   `ground` beat that writes no biome, no floor and no ceiling — so the water
 *   over the sown lip is Abyssal Trench at 1.6 both sides of it. Played twice
 *   against a live match: with the row, Teel's element stands on the lip at
 *   3,000 m and takes nothing; without it, none of her three is alive at the
 *   tide.
 * - **The ledger reads at Track because the bed is a Classification** (§8,
 *   §13). The exposure walk counts the player's structures, so the bed's own 8
 *   accrues exposure all day. Its ceiling on this map is asserted over every
 *   station every scripted ear stands at, and it is 3.35 against Track's 4.0.
 * - **The reveal at 20:30 is the row's honesty, not a tidy-up** (§8). The whole
 *   column is inside `the-rim-furrow` at tick zero and `extract` is not
 *   standing, so a row revealed at 00:00 would latch Met on the first pass. An
 *   idle run reads the residual the document says it should: the furrow met,
 *   the seeding unmet, and the count Lost on the keystone.
 * - **The map is `mouth-rim`, unchanged** (§11). This mission adds one region,
 *   one marker, one structure and four parties, and no geometry: it is the same
 *   literal `prospect.ts` resolves, and nothing here writes ground.
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
  crushAttritionPerSecond,
  detectionRatio,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
} from '@echoes/shared';
import { defineQuery } from 'bitecs';
import { Health, Owner, Position, Pressure, Unit } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { MOUTH_RIM, mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { LEDGER_PROSPECT } from '../src/sim/missions/prospect.ts';
import { SEEDING_SECOND_SEEDING } from '../src/sim/missions/secondSeeding.ts';
import { inRegion } from '../src/sim/missions/predicates.ts';
import type { MissionBeat } from '../src/sim/missions/types.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;
const PLAYER = SEEDING_SECOND_SEEDING.playerSlot;
const RELEASE = T(20, 30);
const CLOSE = T(23);

const terrain = terrainFor(MOUTH_RIM);
const hulls = defineQuery([Unit, Owner, Position]);

const SUBMERSIBLE = statsFor(UnitKind.AbyssalSubmersible);
const CRUISER = statsFor(UnitKind.Cruiser);
const CORVETTE = statsFor(UnitKind.Corvette);
const HARVESTER = statsFor(UnitKind.Harvester);
const SCOUT = statsFor(UnitKind.LightScout);
const VEIL = STRUCTURE_AURAS.SPORE_VEIL;

/** §3, §11 — the bed's centre, the sowing's point, and the marker. */
const BED = { x: 1250, y: 3250 };

/**
 * Every station the document prices a sound from — §6's schedule and §11's
 * list of distances, as coordinates rather than as figures.
 */
const AT = {
  watchHome: { x: 4600, y: 3300 },
  watchFour: { x: 3600, y: 3300 },
  watchWest: { x: 2400, y: 3400 },
  watchWestB: { x: 2550, y: 3450 },
  readerTerrace: { x: 2700, y: 2450 },
  readerFaceOne: { x: 900, y: 2500 },
  readerFaceTwo: { x: 1700, y: 2750 },
  readerFaceThree: { x: 2500, y: 2400 },
  flagshipStaging: { x: 3000, y: 420 },
  flagshipTerrace: { x: 3000, y: 2750 },
  reconInner: { x: 3800, y: 2050 },
  reconOuter: { x: 5200, y: 1600 },
  pairSeat: { x: 900, y: 2100 },
  pairLegOne: { x: 1800, y: 2150 },
  pairLegTwo: { x: 2700, y: 2100 },
  pairHome: { x: 1200, y: 2050 },
  chartBLegTwo: { x: 2850, y: 2150 },
  attendantA: { x: 2800, y: 3400 },
  attendantB: { x: 4100, y: 3500 },
  faceOne: { x: 900, y: 2400 },
  faceTwo: { x: 1700, y: 2650 },
  faceThree: { x: 2500, y: 2300 },
  faceSix: { x: 5100, y: 2700 },
  riser: { x: 3000, y: 3600 },
  midSlopes: { x: 800, y: 1480 },
};

interface Place {
  x: number;
  y: number;
}

const away = (from: Place, to: Place): number => Math.hypot(to.x - from.x, to.y - from.y);

/**
 * §7's model, restated from the prose rather than read off the Echo Layer:
 * "every figure is arithmetic over the shipped model … with the pair's PF taken
 * as `pathPropagation`'s mean over the 250 m cells between the two ends".
 *
 * No thermocline term, and §7 says why: "the whole map lies below the
 * thermocline, so the pair factor is 1.0 everywhere and no figure here carries
 * the layer". `mouth-rim` is the campaign's first map for which that is true,
 * and the assertion below pins it rather than assuming it.
 */
const walk = (from: Place, to: Place): number =>
  terrain.pathPropagation(from.x, from.y, to.x, to.y);

const ratio = (sig: number, from: Place, to: Place, hyd: number): number =>
  detectionRatio(sig, walk(from, to), away(from, to), hyd);

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

/** Two decimals, because that is the precision §4, §6 and §7 quote at. */
function near(actual: number, claimed: number, tolerance: number, what: string): void {
  assert.ok(
    Math.abs(actual - claimed) <= tolerance,
    `${what}: the document says ${claimed} and the engine says ${actual.toFixed(3)}`
  );
}

/** §3 — the veiled figure of anything under the bed: the cloud multiplies last. */
const veiled = (sig: number): number => sig * VEIL.SIG_FACTOR;
/** `acoustics.ts`' own band position, so the silent figures are derived and not typed. */
const silent = (idleSig: number): number =>
  SILENT_RUNNING.SIG_MIN +
  (SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN) * Math.min(1, Math.max(0, idleSig / 60));

const player = SEEDING_SECOND_SEEDING.parties.find((party) => party.slot === PLAYER)!;
const unit = (tag: string) => player.units.find((u) => u.tag === tag)!;
const byId = (id: string) => SEEDING_SECOND_SEEDING.objectives.find((o) => o.id === id)!;
const partyAt = (slot: number) => SEEDING_SECOND_SEEDING.parties.find((p) => p.slot === slot)!;
const emitter = (tag: string) =>
  SEEDING_SECOND_SEEDING.parties.flatMap((p) => p.emitters ?? []).find((e) => e.tag === tag)!;
const beatsOf = (kind: MissionBeat['kind']) =>
  SEEDING_SECOND_SEEDING.beats.filter((beat) => beat.kind === kind);
const moveTo = (tag: string, atTick: number) =>
  SEEDING_SECOND_SEEDING.beats.find(
    (beat) => beat.kind === 'move' && beat.tag === tag && beat.atTick === atTick
  )!;
const furrow = SEEDING_SECOND_SEEDING.regions.find((r) => r.id === 'the-rim-furrow')!;

describe('the Rim, as docs/mission-second-seeding.md §11 leaves it', () => {
  it('plays the same map literal Prospect surveys, region for region', () => {
    // §11: "The same map literal as mission-prospect.md §11, unchanged, region
    // for region." Asserted as identity rather than by transcribing the table,
    // because the claim is that there is one literal and not two that agree.
    assert.equal(SEEDING_SECOND_SEEDING.mapId, LEDGER_PROSPECT.mapId, '§11: `mouth-rim`');
    assert.equal(missionMapById(SEEDING_SECOND_SEEDING.mapId), MOUTH_RIM);
    assert.equal(mapById('mouth-rim'), undefined, '§11: not in the public catalogue');
    assert.equal(MOUTH_RIM.seats, 1, '§11: one seat, not balanced');
    assert.deepEqual(MOUTH_RIM.resources, [], '§11: no resources');
    assert.deepEqual(MOUTH_RIM.hazards, [], '§11: the hazard is the address');
    assert.equal(SEEDING_SECOND_SEEDING.fauna, false, '§5, §11: the one creature is authored');
    assert.deepEqual(
      MOUTH_RIM.regions.map((region) => [region.y, region.heightM, region.biome, region.floorM]),
      [
        [0, 4000, Biome.OpenWater, 2600],
        [0, 1000, Biome.OpenWater, 1500],
        [1000, 1000, Biome.OpenWater, 2200],
        [2000, 1000, Biome.ResonanceField, 2600],
        [3000, 1000, Biome.AbyssalTrench, 3100],
      ],
      '§11: the deep water, the staging, the slopes, the terraces and the lip'
    );
  });

  it('adds regions, markers, structures and parties, and never geometry', () => {
    // §11: "What this mission adds is regions, markers, structures and parties,
    // never geometry and never a ground beat." The one `ground` effect it
    // authors is conditional and writes only a pressure grant — checked in full
    // below; here it is enough that no scheduled beat touches the ground.
    assert.equal(beatsOf('ground').length, 0, '§11: no ground beat on the clock');
    for (const beat of SEEDING_SECOND_SEEDING.conditionalBeats ?? []) {
      if (beat.kind !== 'ground') continue;
      assert.equal(beat.floorM, undefined, '§4.3: the floor does not move');
      assert.equal(beat.ceilingM, undefined, '§4.3: nothing is roofed');
      assert.equal(beat.biome, undefined, '§4.3: the lip is not repainted');
    }
  });

  it('restates one region and one marker, and the region carries no grant at 00:00', () => {
    // §11: one mission region, because "the format restates only what is
    // addressed" — the plan's second region for the staging is addressed by
    // nothing and is not authored.
    assert.equal(SEEDING_SECOND_SEEDING.regions.length, 1);
    assert.deepEqual(
      [furrow.x, furrow.y, furrow.widthM, furrow.heightM],
      [1000, 3000, 500, 500],
      '§11: `the-rim-furrow`'
    );
    // The whole of §4.3: bare PR-3 rock until it is sown. An authored grant
    // here would rate the lip before the lip was sown, which is the mission's
    // argument the wrong way round (§13).
    assert.equal(furrow.pressureBonus, undefined, '§13: no grant before the sowing');
    assert.equal(SEEDING_SECOND_SEEDING.markers.length, 1, '§11: one marker');
    const marker = SEEDING_SECOND_SEEDING.markers[0]!;
    assert.deepEqual(
      [marker.id, marker.x, marker.y, marker.radiusM],
      ['the-rim-furrow', BED.x, BED.y, 250]
    );
    // The sowing's whole radius lies inside the bed's cloud, which is what
    // makes the sowing veiled rather than merely near a veil (§3, §11).
    assert.ok(
      SEEDING_SECOND_SEEDING.soundings![0]!.radiusM + 0 <= VEIL.RADIUS_M,
      '§11: the hold is inside the cloud in its whole radius'
    );
    // And the rectangle is the marker's own square, on the 250 m cell grid.
    for (const metres of [furrow.x, furrow.y, furrow.widthM, furrow.heightM]) {
      assert.equal(metres % MOUTH_RIM.cellM, 0, '§11: off the 250 m cell grid');
    }
  });
});

describe('the whole of the deep navy, as §2 and §3 field it', () => {
  it('fields six deep-rated hulls and has never had a seventh', () => {
    // §2, §3: two proof scouts refit in 204 PC and four seed hulls refit for
    // the seeding — "this mission fields all six, and the sentence is repeated
    // on purpose, because the count is the argument".
    const refit = player.units.filter((u) => u.pressureRating === 3);
    assert.equal(refit.length, 6, '§3: six deep-rated hulls, and never a seventh');
    assert.deepEqual(
      refit.map((u) => u.tag),
      ['the-barge', 'the-sower', 'seed-two', 'seed-three', 'chart-a', 'chart-b']
    );
    // The refit is a mission fact and never a roster fact.
    assert.equal(statsFor(UnitKind.Cruiser).pressureRating, 2, 'the refit leaked into the roster');
    assert.equal(statsFor(UnitKind.Harvester).pressureRating, 2);
    assert.equal(statsFor(UnitKind.LightScout).pressureRating, 1);
    // §11's seat test, stated for this mission's own water: the column stands
    // at DEPTH.MAX_M over a lip whose floor is 3,100, and PR-3 is what that
    // water asks for.
    assert.equal(requiredPressureRating(DEPTH.MAX_M), 3);
    for (const tag of ['the-barge', 'the-sower', 'seed-two', 'seed-three']) {
      assert.equal(unit(tag).depthM, DEPTH.MAX_M, `${tag}: §3 — 3,000 m and no deeper`);
      assert.ok(terrain.admits(unit(tag).x, unit(tag).y, DEPTH.MAX_M));
    }
    assert.equal(unit('chart-a').depthM, 2100, "§11: Prospect's own seat");
    assert.equal(requiredPressureRating(2100), 3, '§11: the terraces ask the third rating too');
  });

  it("holds Teel's three at the staging, unrefit, struck and released into the riser's minute", () => {
    // §3: "Teel's element is not rated for this water and cannot be: a Corvette
    // is PR-2, the lip is PR-3 ground, and 1,800 m is as far down as a Commune
    // gun goes without the ground's help."
    const escorts = player.units.filter((u) => u.role === 'escort');
    assert.equal(escorts.length, 3);
    for (const hull of escorts) {
      assert.equal(hull.kind, UnitKind.Corvette);
      assert.equal(hull.pressureRating, undefined, '§3: PR-2, and the ground is the whole point');
      assert.equal(hull.depthM, 1450, "§11: the staging's floor is 1,500");
      assert.equal(requiredPressureRating(hull.depthM), CORVETTE.pressureRating);
      assert.equal(hull.releaseTick, RELEASE, '§9: held until the basin wakes');
      assert.equal(hull.souls, 4);
    }
    // The release beats sit on the same tick, which the format requires and
    // which is what makes the hold a rule rather than a note.
    assert.deepEqual(
      beatsOf('release').map((beat) => [beat.kind === 'release' ? beat.tag : '', beat.atTick]),
      [
        ['escort-one', RELEASE],
        ['escort-two', RELEASE],
        ['escort-three', RELEASE],
      ]
    );
    // §11: 2,864-3,044 m from the staging's far west to the furrow, at 85 m/s.
    const runs = escorts.map((hull) => away(hull, BED));
    near(Math.min(...runs), 2864, 1, '§4: the shortest run south');
    near(Math.max(...runs), 3044, 1, '§4: the longest');
    near(Math.min(...runs) / CORVETTE.speed, 33.7, 0.2, '§4: thirty-four seconds');
    near(Math.max(...runs) / CORVETTE.speed, 35.8, 0.2, '§4: thirty-six seconds');
  });

  it('counts thirty-three in the column, four in the pair and twelve in the guns', () => {
    // §3, and the Complete reading's "by household": authored per hull, read at
    // the close, and ranked by nothing in the runtime.
    const souls = (tags: string[]) =>
      tags.reduce((total, tag) => total + (unit(tag).souls ?? 0), 0);
    assert.equal(souls(['the-barge', 'the-sower', 'seed-two', 'seed-three']), 33, '§3: the column');
    assert.deepEqual(
      ['the-barge', 'the-sower', 'seed-two', 'seed-three'].map((tag) => unit(tag).souls),
      [14, 6, 5, 8],
      "§3: Radicals' own four counts, authored whole"
    );
    assert.equal(souls(['chart-a', 'chart-b']), 4, '§3: the pair carries four');
    assert.equal(
      souls(['escort-one', 'escort-two', 'escort-three']),
      12,
      '§3: and the escorts twelve'
    );
  });

  it('gives a role to the seed hulls and the guns, and to nobody else at all', () => {
    // §8's count is hulls and its reading is people, and `MissionUnit.role` is
    // singular — so the pair, which is in no predicate, carries none. Every
    // scripted hull carrying one would put another party inside a counter the
    // player is shown; `missions.test.ts` asserts that over every mission and
    // this asserts which roles this one hands out.
    assert.deepEqual(
      player.units.map((u) => u.role),
      ['seed', 'seed', 'seed', 'seed', undefined, undefined, 'escort', 'escort', 'escort']
    );
    for (const party of SEEDING_SECOND_SEEDING.parties) {
      if (party.slot === PLAYER) continue;
      for (const hull of party.units) assert.equal(hull.role, undefined, `${hull.tag}: scripted`);
    }
  });

  it('grows the bed the tide before last, at its true depth, on the player’s own slot', () => {
    // §3, §13: a prebuilt Spore Veil, because a player-built one would sit at
    // CONSTRUCTION.WORKING_DEPTH_M wherever the floor is.
    assert.equal(player.structures?.length, 1);
    const bed = player.structures![0]!;
    assert.deepEqual(
      [bed.tag, bed.kind, bed.x, bed.y, bed.depthM],
      ['the-rim-bed', StructureKind.SporeVeil, BED.x, BED.y, DEPTH.MAX_M]
    );
    assert.ok(terrain.admits(bed.x, bed.y, bed.depthM), "§11: over the lip's 3,100");
    // §3's own numbers for the cloud, off the roster rather than off the prose.
    const stats = structureStatsFor(StructureKind.SporeVeil);
    assert.equal(stats.sigIdle, 20);
    assert.equal(stats.hyd, 30);
    assert.equal(stats.maxHp, 900);
    assert.deepEqual([VEIL.RADIUS_M, VEIL.SIG_FACTOR, VEIL.BLIND_HYD], [350, 0.4, 5]);
    assert.equal(veiled(stats.sigIdle), 8, "§6: the bed's own hum is 8");
  });

  it('seats five parties, a reserved court and the attendants’ soundless slot', () => {
    // §2: "Five parties and a court slot, exactly as Prospect seats them, with
    // the player's slot changed."
    assert.deepEqual(
      SEEDING_SECOND_SEEDING.parties.map((p) => [p.slot, p.faction]),
      [
        [0, Faction.Pelagia],
        [2, Faction.Bathyarch],
        [3, Faction.Directorate],
        [4, Faction.Hadron],
        [5, Faction.Directorate],
      ]
    );
    assert.equal(SEEDING_SECOND_SEEDING.playerFaction, Faction.Pelagia);
    assert.equal(SEEDING_SECOND_SEEDING.courtSlot, 1, '§2: reserved and empty');
    assert.deepEqual(partyAt(5).units, [], '§2: a party whose only assets are sounds');
    // Prospect's own seats, unchanged, for every navy but the concern's heavy.
    const prospect = (tag: string) =>
      LEDGER_PROSPECT.parties.flatMap((p) => p.units).find((u) => u.tag === tag)!;
    for (const tag of [
      'flagship',
      'reader-west',
      'reader-east',
      'bunkerage',
      'watch-a',
      'watch-b',
      'recon',
    ]) {
      const mine = SEEDING_SECOND_SEEDING.parties
        .flatMap((p) => p.units)
        .find((u) => u.tag === tag)!;
      assert.deepEqual(
        [mine.kind, mine.x, mine.y, mine.depthM, mine.pressureRating],
        [
          prospect(tag).kind,
          prospect(tag).x,
          prospect(tag).y,
          prospect(tag).depthM,
          prospect(tag).pressureRating,
        ],
        `${tag}: Prospect's seat, verbatim`
      );
    }
  });

  it('strikes six affordances and leaves the button on the panel', () => {
    // §3, §13: six locks with a reason in register, and `activeSonar` is
    // deliberately not among them — "the button is on the panel".
    const locked = new Set(SEEDING_SECOND_SEEDING.locks.map((lock) => lock.ability));
    for (const ability of [
      'weapons',
      'torpedoes',
      'mines',
      'depthCharges',
      'noisemakers',
      'construction',
    ] as const) {
      assert.ok(locked.has(ability), `§3 strikes ${ability} and the literal does not`);
    }
    assert.ok(!locked.has('activeSonar'), '§3: the rim answers a ping before it should');
    assert.equal(locked.size, 6, '§13: six locks');
    for (const lock of SEEDING_SECOND_SEEDING.locks) {
      assert.ok(lock.reason.trim().length > 0, `${lock.ability} is refused without a reason`);
    }
    assert.match(
      SEEDING_SECOND_SEEDING.locks.find((lock) => lock.ability === 'weapons')!.reason,
      /nobody strikes first, and not on this water/,
      '§3, verbatim'
    );
  });

  it('runs no silence ledger and no held freight, and states eighteen as the budget', () => {
    // §9: "the literal carries `silenceCeilingSig: 100`, `debtCapS: 0` and no
    // `arrayTag`, Asset Recovery's posture; the ledger does not run.
    // `escortRadiusM: 0` — the hold of Thin Water is absent."
    assert.equal(SEEDING_SECOND_SEEDING.silenceCeilingSig, 100);
    assert.equal(SEEDING_SECOND_SEEDING.debtCapS, 0);
    assert.equal(SEEDING_SECOND_SEEDING.arrayTag, undefined);
    assert.equal(SEEDING_SECOND_SEEDING.escortRadiusM, 0);
    assert.equal(SEEDING_SECOND_SEEDING.silenceRole, undefined);
    // §4's own arithmetic for the budget: the sowing's 45 through the bed's 0.4.
    assert.equal(SEEDING_SECOND_SEEDING.sigBudget, 18);
    assert.equal(
      veiled(SEEDING_SECOND_SEEDING.soundings![0]!.sig),
      SEEDING_SECOND_SEEDING.sigBudget
    );
  });
});

describe('what the bed buys, as §4 prices it', () => {
  it('sits every silent hull where `silentRunningSig` puts it, and never at three', () => {
    // §13's finding against the plan: "`silentRunningSig` sits a hull in the
    // 3-8 band by its idle … the plan priced every silent hull at 3".
    near(silent(SCOUT.sigIdle), 3.5, 0.01, '§3: a Light Scout');
    near(silent(HARVESTER.sigIdle), 4.5, 0.01, '§3: a Harvester');
    near(silent(CORVETTE.sigIdle), 5.3, 0.04, '§3: a Corvette');
    near(silent(CRUISER.sigIdle), 7.6, 0.02, '§3: a Cruiser');
    // And the veil multiplies the derived figure last, which is what makes a
    // sounding floored at 45 read 18 under the bed.
    near(veiled(silent(CRUISER.sigIdle)), 3.03, 0.01, '§4: the barge, silent');
    near(veiled(silent(HARVESTER.sigIdle)), 1.8, 0.01, '§4: a tender, silent');
    near(veiled(HARVESTER.sigIdle), 7.2, 0.01, '§4: a tender, idle');
    near(veiled(CRUISER.sigIdle), 22, 0.01, '§4: the barge, idle');
  });

  it('reproduces §4’s table of ranges against the best ears on the rim', () => {
    // The lip is all-trench, so this one table is priced at the biome's own
    // figure — and the walk agrees, which is the assertion.
    const lip = PROPAGATION_FACTOR[Biome.AbyssalTrench];
    assert.equal(lip, 1.6, '§1: the loudest water in the Rift');
    near(walk(BED, AT.watchWest), lip, 0.001, '§6: the watch’s figures are all-lip');
    const row = (sig: number) => [
      rangeAt(sig, lip, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      rangeAt(sig, lip, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.BEARING),
      rangeAt(sig, lip, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION),
      rangeAt(sig, lip, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.TRACK),
    ];
    assert.deepEqual(
      row(veiled(silent(HARVESTER.sigIdle))),
      [894, 694, 504, 376],
      'a tender, silent'
    );
    assert.deepEqual(
      row(veiled(silent(CRUISER.sigIdle))),
      [1239, 962, 699, 521],
      'the barge, silent'
    );
    assert.deepEqual(row(veiled(HARVESTER.sigIdle)), [2127, 1651, 1200, 894], 'a tender, idle');
    assert.deepEqual(row(veiled(CRUISER.sigIdle)), [4276, 3319, 2412, 1798], 'the barge, idle');
    assert.deepEqual(row(8), [2272, 1764, 1282, 955], "the bed's own hum");
    assert.deepEqual(row(18), [3772, 2928, 2127, 1586], 'the sowing');
  });

  it('costs the sower a tier and never a spike, because breaking silence is not firing', () => {
    // §3, §13: "`BREAK_SILENCE_SIG_SPIKE` is applied by `applyFiringSpike`
    // alone … the sower goes 1.8 → 7.2 → 18 and nothing louder." Stated as the
    // three figures the document names, in order.
    const sowing = SEEDING_SECOND_SEEDING.soundings![0]!;
    assert.equal(sowing.sig, 45, '§4: the working figure');
    assert.deepEqual(
      [veiled(silent(HARVESTER.sigIdle)), veiled(HARVESTER.sigIdle), veiled(sowing.sig)],
      [1.8, 7.2, 18]
    );
    // And the hold itself: sixty seconds inside 250 m of the point, bow on.
    assert.equal(sowing.holdTicks, T(1), '§4: sixty seconds');
    assert.equal(sowing.radiusM, 250);
    assert.deepEqual([sowing.x, sowing.y], [BED.x, BED.y]);
    assert.equal(sowing.tag, 'the-sower');
    // §13's own note: the sower is seated 112 m from the point, inside the bed.
    near(away(unit('the-sower'), BED), 112, 1, '§13: 112 m, and nothing fences the clock');
  });

  it('prices the ping, and the one thing it does not do', () => {
    // §3's fourth row. The button is available; every figure it buys is a cost.
    const ping = veiled(95);
    assert.equal(ping, 38, '§3: 95 × 0.4');
    near(ratio(ping, BED, AT.watchWest, SUBMERSIBLE.hyd), 13.9, 0.05, '§3: a Track to the watch');
    near(ratio(ping, BED, AT.watchHome, SUBMERSIBLE.hyd), 2.55, 0.02, '§3: from its home station');
    near(ratio(ping, BED, AT.flagshipTerrace, CRUISER.hyd), 3.72, 0.02, '§3: and to the heavy');
    // "it interests the riser not at all": 19 against a Sounder's Interest of 55.
    assert.equal(DRIFT.VERTICAL_SPEED_MPS, 12, '§9: the riser climbs at twelve');
  });
});

describe('the week, as §6 schedules it — every figure off the path walk', () => {
  it('walks a different water to every ear, and never the lip’s to all of them', () => {
    // §4's second finding, and §13's ask: "a lip-to-terraces pair is priced
    // between 1.6 and 0.7 and never at the lip's figure". The path means are
    // the assertion; the ratios below all hang off them.
    near(walk(BED, AT.watchWest), 1.6, 0.001, "§6: the watch's western station, all lip");
    near(walk(BED, AT.readerFaceOne), 0.925, 0.002, '§6: the face-one station');
    near(walk(BED, AT.readerFaceTwo), 1.3, 0.002, '§6: the face-two station');
    near(walk(BED, AT.readerFaceThree), 0.957, 0.002, '§6: the face-three station');
    near(walk(BED, AT.flagshipTerrace), 1.15, 0.002, '§6: the heavy');
    near(walk(BED, AT.reconInner), 0.925, 0.002, '§6: the Order');
    near(walk(BED, AT.pairSeat), 0.88, 0.002, "§7: the pair's own seat");
    for (const to of [AT.readerFaceThree, AT.flagshipTerrace, AT.reconInner, AT.pairSeat]) {
      assert.ok(
        walk(BED, to) < PROPAGATION_FACTOR[Biome.AbyssalTrench],
        '§4: the concern’s figures are means over lip and terrace cells'
      );
    }
  });

  it('stands every ear where §11 says it stands, to the metre', () => {
    // §11's list of distances from the bed's centre — the schedule, as
    // geometry. Every one of them decides a tier in §6.
    const off = (place: Place) => Math.round(away(BED, place));
    assert.equal(off(AT.faceOne), 919, '§11: face-one');
    assert.equal(off(AT.readerFaceOne), 828, '§11: and its station');
    assert.equal(off(AT.faceTwo), 750, '§11: face-two');
    assert.equal(off(AT.readerFaceTwo), 673, '§11: and its station');
    assert.equal(off(AT.faceThree), 1570, '§11: face-three');
    assert.equal(off(AT.readerFaceThree), 1512, '§11: and its station');
    assert.equal(off(AT.watchWest), 1160, "§11: the watch's western station");
    assert.equal(off(AT.watchWestB), 1315, '§11: watch-b');
    assert.equal(off(AT.watchWestB) - off(AT.watchWest), 155, '§6: 155 m further');
    assert.equal(off(AT.watchFour), 2351, '§11: the 04:00 station');
    assert.equal(off(AT.watchHome), 3350, '§11: home');
    assert.equal(off(AT.reconInner), 2818, "§11: the reconnaissance's inner station");
    assert.equal(off(AT.attendantA), 1557, '§11: attendant-a');
    assert.equal(off(AT.flagshipStaging), 3327, "§11: the flagship's staging seat");
    assert.equal(off(AT.flagshipTerrace), 1820, '§11: and its terrace station');
    assert.equal(off(AT.pairSeat), 1202, "§11: the pair's seat");
    assert.equal(off(AT.pairHome), 1201, '§11: and its home water');
    assert.equal(Math.round(AT.riser.x - BED.x), 1750, "§11: the riser's line");
  });

  it('reads the watch’s account, tier for tier, from its western station', () => {
    // §6's table, and the fact D+1 and D+2 inherit: the bed at a name, for four
    // minutes and forty seconds of the concern's day.
    const heard = (sig: number) => ratio(sig, BED, AT.watchWest, SUBMERSIBLE.hyd);
    near(heard(8), 2.93, 0.01, "§6: the bed's own hum, a Classification");
    near(heard(veiled(silent(CRUISER.sigIdle))), 1.11, 0.01, '§6: the barge, silent — a Contact');
    near(heard(veiled(silent(HARVESTER.sigIdle))), 0.66, 0.01, '§6: a tender, silent — nothing');
    near(heard(veiled(HARVESTER.sigIdle)), 2.64, 0.01, '§6: a tender that forgot itself');
    near(heard(veiled(CRUISER.sigIdle)), 8.06, 0.02, '§6: a Cruiser, named, with its heading');
    near(heard(18), 6.6, 0.01, '§6: the seeding, for every second of its sixty');
    assert.equal(
      Math.floor(heard(8) / TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION) >= 1,
      true,
      '§6: entered'
    );
    // watch-b, 155 m further east.
    near(ratio(8, BED, AT.watchWestB, SUBMERSIBLE.hyd), 2.4, 0.02, '§6: a Bearing');
    near(ratio(18, BED, AT.watchWestB, SUBMERSIBLE.hyd), 5.4, 0.02, '§6: and the sowing, a Track');
    // The other two stations, and the two quiet windows they open.
    near(ratio(8, BED, AT.watchFour, SUBMERSIBLE.hyd), 0.95, 0.02, '§6: the bed, nothing');
    near(ratio(18, BED, AT.watchFour, SUBMERSIBLE.hyd), 2.13, 0.02, '§6: a sowing, a Bearing');
    near(ratio(18, BED, AT.watchHome, SUBMERSIBLE.hyd), 1.21, 0.02, '§6: from home, a Contact');
  });

  it('reads the concern’s ear where the reader stands, not at the face it reads', () => {
    // §13's finding against the plan's arithmetic, in one assertion: "the
    // reader working face-two has the bed at a Classification (3.35) from its
    // own station rather than the plan's 3.47 from the face".
    const reader = (sig: number, place: Place) => ratio(sig, BED, place, CORVETTE.hyd);
    near(reader(8, AT.readerFaceOne), 1.71, 0.02, '§6: the bed at Bearing');
    near(reader(18, AT.readerFaceOne), 3.85, 0.02, '§6: a sowing at Classification');
    near(reader(8, AT.readerFaceTwo), 3.35, 0.02, '§6: the closest a Consortium ear comes');
    near(reader(18, AT.readerFaceTwo), 7.54, 0.02, '§6: and a sowing at Track');
    near(reader(8, AT.readerFaceThree), 0.68, 0.02, '§6: the bed, nothing');
    near(reader(18, AT.readerFaceThree), 1.52, 0.02, '§6: a sowing at Bearing');
    // The heavy and the Order, where §6's windows put them.
    near(ratio(18, BED, AT.flagshipTerrace, CRUISER.hyd), 1.76, 0.02, '§6: Bearing, not 2.28');
    near(ratio(18, BED, AT.reconInner, CORVETTE.hyd), 0.54, 0.02, '§6: nothing, not a Contact');
    near(
      ratio(18, BED, AT.flagshipStaging, CRUISER.hyd),
      0.55,
      0.02,
      '§6: at the staging, nothing'
    );
  });

  it('walks the legs in the seconds §6 says they take', () => {
    // §6: the watch at 60 m/s, seventeen seconds, twenty more, thirty-seven
    // home; the reader twenty-one seconds to the first face and ten to the
    // second, which is what puts its station 828 m off from 05:21 and 673 m
    // off from 08:40.
    near(away(AT.watchHome, AT.watchFour) / SUBMERSIBLE.speed, 16.7, 0.4, '§6: seventeen seconds');
    near(away(AT.watchFour, AT.watchWest) / SUBMERSIBLE.speed, 20.1, 0.4, '§6: twenty more');
    near(away(AT.watchWest, AT.watchHome) / SUBMERSIBLE.speed, 36.7, 0.4, '§6: thirty-seven home');
    near(
      away(AT.readerTerrace, AT.readerFaceOne) / CORVETTE.speed,
      21.2,
      0.4,
      '§6: twenty-one seconds to the first face'
    );
    near(
      away(AT.readerFaceOne, AT.readerFaceTwo) / CORVETTE.speed,
      9.9,
      0.4,
      '§9: ten seconds to the second'
    );
  });
});

describe('what is heard, as §7 tables it', () => {
  it('carries no layer anywhere, because the whole map is below it', () => {
    // §7: "The whole map lies below the thermocline, so the pair factor is 1.0
    // everywhere and no figure here carries the layer." The shallowest water on
    // the map is the staging's 1,450 m seat, and the duct's top is above it.
    const shallowest = Math.min(
      ...SEEDING_SECOND_SEEDING.parties.flatMap((p) => p.units.map((u) => u.depthM))
    );
    assert.equal(shallowest, 1400, '§11: the concern’s staging seats are the shallowest metre');
  });

  it('reads the pair’s own table, seat, leg and home water', () => {
    const pair = (sig: number, from: Place, to: Place) => ratio(sig, from, to, SCOUT.hyd);
    // The reads at eighty, through the terraces.
    near(pair(80, AT.faceOne, AT.pairSeat), 92, 0.5, '§7: 300 m, Track 92');
    near(pair(80, AT.faceOne, AT.pairLegOne), 14.9, 0.1, '§9: 934 m from the first leg');
    near(pair(80, AT.faceOne, AT.pairHome), 46.3, 0.2, '§7: 461 m from home water');
    near(pair(80, AT.faceThree, AT.pairLegTwo), 101, 0.5, '§7: 283 m, the nearest all day');
    near(pair(80, AT.faceThree, AT.pairSeat), 6.2, 0.1, '§7: 1,612 m from the seat');
    near(pair(80, AT.faceThree, AT.pairHome), 8.55, 0.05, '§7: 1,324 m from home water');
    near(
      pair(80, AT.faceSix, AT.pairHome),
      1.49,
      0.05,
      '§7: a Contact, and the only read it misses'
    );
    assert.ok(
      pair(80, AT.faceSix, AT.pairHome) < TIER_THRESHOLD_MULTIPLIER.BEARING,
      '§7: the pair does not hold face-six exactly'
    );
    // The concern's heavy, and the watch, from the three stations the legs put
    // the pair at.
    near(pair(CRUISER.sigIdle, AT.flagshipTerrace, AT.pairSeat), 2.61, 0.02, '§7: 2,198 m');
    near(pair(CRUISER.sigIdle, AT.flagshipTerrace, AT.pairLegTwo), 15.7, 0.1, '§7: 716 m');
    near(pair(CRUISER.sigIdle, AT.flagshipTerrace, AT.pairHome), 3.21, 0.02, '§7: 1,931 m');
    near(pair(SUBMERSIBLE.sigIdle, AT.watchWest, AT.pairSeat), 1.63, 0.02, '§7: the walk west');
    near(pair(SUBMERSIBLE.sigIdle, AT.watchWest, AT.pairLegTwo), 3.32, 0.02, '§7: 1,334 m');
    near(pair(SUBMERSIBLE.sigIdle, AT.watchWest, AT.pairHome), 1.89, 0.02, '§7: from home water');
    near(pair(SUBMERSIBLE.sigIdle, AT.watchHome, AT.pairSeat), 0.55, 0.02, '§7: nothing');
    near(
      pair(CORVETTE.sigCruise, AT.reconInner, AT.pairLegTwo),
      4.02,
      0.02,
      '§7: the Order, in cone'
    );
    // §7's own ranges for the chart: the walk west is audible to any scout not
    // under a cloud, and the reads are Track from two kilometres.
    assert.equal(
      rangeAt(
        SUBMERSIBLE.sigIdle,
        PROPAGATION_FACTOR[Biome.AbyssalTrench],
        SCOUT.hyd,
        TIER_THRESHOLD_MULTIPLIER.CONTACT
      ),
      3787
    );
    assert.equal(
      rangeAt(
        SUBMERSIBLE.sigIdle,
        PROPAGATION_FACTOR[Biome.AbyssalTrench],
        SCOUT.hyd,
        TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION
      ),
      2136
    );
    assert.equal(
      rangeAt(
        80,
        PROPAGATION_FACTOR[Biome.ResonanceField],
        SCOUT.hyd,
        TIER_THRESHOLD_MULTIPLIER.TRACK
      ),
      2129
    );
  });

  it('leaves the column deaf under the bed, with two exceptions and no more', () => {
    // §7: "The column, HYD 5, under the bed … Two things reach it all day."
    const deaf = (sig: number, from: Place) => ratio(sig, from, BED, VEIL.BLIND_HYD);
    near(deaf(DEPTH.DESCENT_SIG, AT.flagshipTerrace), 0.54, 0.02, "§7: the concern's descent");
    near(
      deaf(SUBMERSIBLE.sigIdle, AT.watchWest),
      0.47,
      0.02,
      '§7: the watch at its western station'
    );
    near(deaf(CRUISER.sigIdle, AT.flagshipTerrace), 0.41, 0.02, '§7: the flagship');
    near(deaf(24, AT.attendantA), 0.32, 0.02, '§7: attendant-a');
    // The read at face-two, 750 m off, and the riser at a hundred.
    near(deaf(80, AT.faceTwo), 2.17, 0.02, '§7: the column hears the concern working the face');
    near(deaf(100, AT.riser), 1.08, 0.02, '§7: and the basin waking, at a Contact');
    assert.ok(deaf(80, AT.faceTwo) >= TIER_THRESHOLD_MULTIPLIER.BEARING, '§6: a Bearing at HYD 5');
    assert.ok(deaf(100, AT.riser) >= TIER_THRESHOLD_MULTIPLIER.CONTACT, '§7: a Contact');
  });

  it('reads the riser and the descent as §4 and §7 price them', () => {
    near(ratio(100, AT.riser, AT.pairHome, SCOUT.hyd), 6.35, 0.05, '§7: a Track from 2,375 m');
    assert.equal(
      rangeAt(
        100,
        PROPAGATION_FACTOR[Biome.AbyssalTrench],
        SCOUT.hyd,
        TIER_THRESHOLD_MULTIPLIER.CONTACT
      ),
      9757,
      '§7: a Contact from 9,757 m'
    );
    assert.equal(
      rangeAt(
        100,
        PROPAGATION_FACTOR[Biome.AbyssalTrench],
        SCOUT.hyd,
        TIER_THRESHOLD_MULTIPLIER.TRACK
      ),
      4102,
      '§8: a Track to the pair from 4,102 m'
    );
    // §4 — the descent at 72, from the middle of the slopes, to every stationary
    // ear the document names. Each of these is an ear that does not move while
    // the escorts are falling, which is why the figures are exact.
    near(
      ratio(DEPTH.DESCENT_SIG, AT.midSlopes, AT.readerFaceThree, CORVETTE.hyd),
      3.8,
      0.02,
      '§4: the reader on the third face'
    );
    near(
      ratio(DEPTH.DESCENT_SIG, AT.midSlopes, AT.watchHome, SUBMERSIBLE.hyd),
      1.98,
      0.02,
      '§4: the watch at home'
    );
    near(
      ratio(DEPTH.DESCENT_SIG, AT.midSlopes, AT.reconOuter, CORVETTE.hyd),
      1.15,
      0.02,
      '§4: the Order, at 4,402 m'
    );
    near(
      ratio(DEPTH.DESCENT_SIG, AT.midSlopes, AT.reconInner, CORVETTE.hyd),
      2.01,
      0.02,
      '§4: from the station it left'
    );
    near(
      ratio(DEPTH.DESCENT_SIG, AT.midSlopes, AT.pairHome, SCOUT.hyd),
      30.7,
      0.2,
      '§4: the pair, 696 m off'
    );
    assert.equal(
      rangeAt(DEPTH.DESCENT_SIG, 1, CRUISER.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      5655,
      '§4: a Contact to a Cruiser from 5,655 m'
    );
    assert.equal(
      rangeAt(DEPTH.DESCENT_SIG, 1, SUBMERSIBLE.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      6688,
      '§4: and to a submersible from 6,688'
    );
    assert.equal(
      rangeAt(DEPTH.DESCENT_SIG, 1, SCOUT.hyd, TIER_THRESHOLD_MULTIPLIER.CONTACT),
      5924,
      '§6: the concern’s own arrival, 5,924 m'
    );
  });

  it('keeps the heavy 618 m off the pair’s second leg, which is why §5 moved it', () => {
    // §5, §13 — the one seat this document authors rather than inherits, and
    // the whole reason it does: at the plan's 3000, 2500 the fixed 07:00 leg
    // idles `chart-b` at a Track to a Cruiser's 65 for six minutes, and the
    // ledger would read the chart instead of the sowing.
    const plan = { x: 3000, y: 2500 };
    near(away(AT.chartBLegTwo, plan), 381, 1, '§5: 381 m from the plan’s seat');
    near(
      ratio(SCOUT.sigIdle, AT.chartBLegTwo, plan, CRUISER.hyd),
      4.37,
      0.05,
      '§5: a Track at idle — the ledger, latched by the table’s own order'
    );
    near(away(AT.chartBLegTwo, AT.flagshipTerrace), 618, 1, '§5: 618 m from the authored seat');
    const idle = ratio(SCOUT.sigIdle, AT.chartBLegTwo, AT.flagshipTerrace, CRUISER.hyd);
    near(idle, 2.01, 0.02, '§5: a Bearing');
    assert.ok(idle < TIER_THRESHOLD_MULTIPLIER.TRACK, '§5: and not a Track');
    assert.equal(
      rangeAt(
        SCOUT.sigCruise,
        PROPAGATION_FACTOR[Biome.ResonanceField],
        CRUISER.hyd,
        TIER_THRESHOLD_MULTIPLIER.TRACK
      ),
      621,
      '§5: a Track only at cruise inside 621 m'
    );
    // The beat that puts it there is Prospect's own, and this literal does not
    // move it — only the hull it is measured against.
    const leg = moveTo('chart-b', T(7));
    assert.deepEqual(
      [leg.kind === 'move' ? leg.x : 0, leg.kind === 'move' ? leg.y : 0],
      [AT.chartBLegTwo.x, AT.chartBLegTwo.y]
    );
  });
});

describe('the objective, as §8 chooses it', () => {
  it('asks five things and decides the count by two of them', () => {
    assert.deepEqual(
      SEEDING_SECOND_SEEDING.objectives.map((o) => o.id),
      ['the-seeding', 'the-furrow', 'the-ledger', 'the-returns', 'the-escorts'],
      "§8's table, in §8's order"
    );
    const terminal = SEEDING_SECOND_SEEDING.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => o.id),
      ['the-seeding', 'the-furrow']
    );
    assert.equal(byId('the-seeding').keystone, true, '§8: unmet, the count reads Lost');
    assert.equal(byId('the-furrow').keystone, undefined, '§8: one keystone, and it is the sowing');
    assert.deepEqual(byId('the-seeding').predicate, { kind: 'sound', count: 1 });
    assert.deepEqual(byId('the-furrow').predicate, {
      kind: 'extract',
      role: 'seed',
      region: 'the-rim-furrow',
      count: 3,
    });
    assert.deepEqual(byId('the-escorts').predicate, {
      kind: 'extract',
      role: 'escort',
      region: 'the-rim-furrow',
      count: 3,
    });
    assert.deepEqual(byId('the-returns').predicate, { kind: 'attend', count: 1 });
    // §8: three of the four seed hulls, and the mission places four.
    assert.equal(player.units.filter((u) => u.role === 'seed').length, 4);
  });

  it('reveals the furrow on the riser’s beat, because at 00:00 it would latch', () => {
    // §8, in full: "The whole column is seated inside `the-rim-furrow` at tick
    // zero, `extract` is not a standing predicate … and the runtime never
    // re-derives a Met non-standing row." Both halves asserted: the column is
    // inside, and the reveal is the riser's tick.
    for (const tag of ['the-barge', 'the-sower', 'seed-two', 'seed-three']) {
      assert.ok(inRegion(furrow, unit(tag).x, unit(tag).y), `${tag}: inside at tick zero`);
    }
    assert.equal(byId('the-furrow').revealAtTick, RELEASE, '§8: revealed at 20:30');
    assert.ok(
      SEEDING_SECOND_SEEDING.beats.some((beat) => beat.atTick === RELEASE),
      'a reveal with no beat behind it is a rule the court states before the thing it is about'
    );
    // The escorts need no reveal for the same reason: they are held at the
    // staging until 20:30 and cannot be in the furrow before it.
    assert.equal(byId('the-escorts').revealAtTick, undefined, '§8: the hold is the reveal');
    for (const tag of ['escort-one', 'escort-two', 'escort-three']) {
      assert.equal(inRegion(furrow, unit(tag).x, unit(tag).y), false, `${tag}: at the staging`);
    }
  });

  it('reads the ledger at Track, and proves the bed can never reach it', () => {
    // §8 and §13's finding, as arithmetic rather than as a claim: the bed's
    // ceiling over every station any scripted ear stands at on this map.
    const ledger = byId('the-ledger');
    assert.deepEqual(ledger.predicate, {
      kind: 'tolerance',
      ticks: T(1),
      tier: ResolutionTier.Track,
    });
    const ears: [Place, number, string][] = [
      [AT.watchHome, SUBMERSIBLE.hyd, 'the watch at home'],
      [AT.watchFour, SUBMERSIBLE.hyd, 'the watch at 04:00'],
      [AT.watchWest, SUBMERSIBLE.hyd, 'the watch west'],
      [AT.watchWestB, SUBMERSIBLE.hyd, 'watch-b'],
      [AT.readerTerrace, CORVETTE.hyd, 'a reader on the terraces'],
      [AT.readerFaceOne, CORVETTE.hyd, 'the reader at face-one'],
      [AT.readerFaceTwo, CORVETTE.hyd, 'the reader at face-two'],
      [AT.readerFaceThree, CORVETTE.hyd, 'the reader at face-three'],
      [AT.flagshipStaging, CRUISER.hyd, 'the heavy at the staging'],
      [AT.flagshipTerrace, CRUISER.hyd, 'the heavy on the terraces'],
      [AT.reconInner, CORVETTE.hyd, 'the Order, inner'],
      [AT.reconOuter, CORVETTE.hyd, 'the Order, withdrawn'],
    ];
    const ceiling = Math.max(...ears.map(([place, hyd]) => ratio(8, BED, place, hyd)));
    near(ceiling, 3.35, 0.02, "§13: the bed's ceiling on this map");
    assert.ok(
      ceiling < TIER_THRESHOLD_MULTIPLIER.TRACK,
      '§8: at Track the bed never enters, which is the whole reason the row is at Track'
    );
    assert.ok(
      ceiling >= TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION,
      '§13: and at Classification it would be met in every run by a structure the player cannot move'
    );
    near(
      TIER_THRESHOLD_MULTIPLIER.TRACK - ceiling,
      0.65,
      0.02,
      '§8: the margin the player never spends'
    );
  });

  it('reads out four rows and lets the returns speak in the attendants’ own voice', () => {
    // §8: "Beneath whichever row the run earned, in authored order: the
    // readings of the-seeding, the-furrow, the-ledger and the-escorts, met or
    // unmet, and then the attendants' entered or gap lines." So four objectives
    // carry a reading and the fifth deliberately does not.
    assert.deepEqual(
      SEEDING_SECOND_SEEDING.objectives.filter((o) => o.reading !== undefined).map((o) => o.id),
      ['the-seeding', 'the-furrow', 'the-ledger', 'the-escorts']
    );
    assert.equal(byId('the-returns').reading, undefined, '§8: the attendants read themselves');
    assert.match(byId('the-seeding').text, /^The lip wants sowing\./, '§12, verbatim');
    assert.match(byId('the-seeding').reading!.unmet, /There isn't a record\.$/);
    assert.match(byId('the-furrow').text, /A garden with nobody in it is a claim/);
    assert.match(byId('the-ledger').text, /three accounts we'll never read/);
    assert.match(byId('the-returns').text, /isn't ours and isn't theirs/);
    assert.match(byId('the-escorts').text, /they're not coming until the basin's awake/);
    // The attendants' own readings, in the Commune's grammar: the first faction
    // in the campaign whose entry declines to file.
    assert.match(emitter('attendant-a').reading!.entered, /we're not going to say what it was/);
    assert.match(emitter('attendant-b').reading!.entered, /We don't file\.$/);
    assert.equal(emitter('face-one').reading, undefined, '§8: a face is not attendable');
  });

  it('counts one return of two, and bounds it with the pair’s own legs', () => {
    // §8: "a return resolved at Bearing or better by the player's own hulls
    // while it sounds, once … A pair that walks the table's legs meets it; a
    // pair held at its seat all day does not." Both halves, in ratios.
    const attendable = SEEDING_SECOND_SEEDING.parties
      .flatMap((p) => p.emitters ?? [])
      .filter((e) => e.reading !== undefined);
    assert.equal(attendable.length, 2, '§13: the attend count is one, bounded by two');
    const fromSeat = (place: Place) => ratio(24, place, AT.pairSeat, SCOUT.hyd);
    near(fromSeat(AT.attendantA), 1.47, 0.02, '§8: under a Bearing from the seat');
    near(fromSeat(AT.attendantB), 0.79, 0.02, '§8: and the far one at nothing');
    assert.ok(fromSeat(AT.attendantA) < TIER_THRESHOLD_MULTIPLIER.BEARING);
    near(ratio(24, AT.attendantA, AT.pairLegTwo, SCOUT.hyd), 3.76, 0.02, '§8: a Classification');
    near(ratio(24, AT.attendantB, AT.pairLegTwo, SCOUT.hyd), 2.0, 0.02, '§8: and a Bearing');
    near(ratio(24, AT.attendantA, AT.pairHome, SCOUT.hyd), 1.76, 0.02, '§8: a Bearing from home');
  });

  it('runs its length, and says so because both rows can be met on one tick', () => {
    // §8: "A column that sowed at 15:00 and is under the bed at 20:30 meets
    // both terminal rows on the riser's tick, and the court's rule would close
    // the tide there — before Teel's element has left the staging, before the
    // watch has said the basin is up, and two and a half minutes before the
    // tide."
    assert.equal(SEEDING_SECOND_SEEDING.runsItsLength, true);
    assert.equal((CLOSE - RELEASE) / SIM.TICK_HZ, 150, '§8: two and a half minutes');
    assert.ok(
      SEEDING_SECOND_SEEDING.beats.some(
        (beat) => beat.kind === 'say' && beat.atTick > RELEASE && beat.atTick < CLOSE
      ),
      '§9: the watch says the basin is up after the tide would otherwise have closed'
    );
  });

  it('reads all three of Marr’s results, and ranks none of them', () => {
    assert.match(SEEDING_SECOND_SEEDING.epilogue[MissionOutcome.Complete], /^The deep's seeded\./);
    assert.match(
      SEEDING_SECOND_SEEDING.epilogue[MissionOutcome.Complete],
      /I opposed it\. I ordered nobody\./,
      '§12: the sentence she should not say aloud, inside the reading it costs the most in'
    );
    assert.match(
      SEEDING_SECOND_SEEDING.epilogue[MissionOutcome.Partial],
      /^It's planted and it's empty\./
    );
    assert.match(SEEDING_SECOND_SEEDING.epilogue[MissionOutcome.Lost], /^Nothing was planted\./);
    for (const reading of Object.values(SEEDING_SECOND_SEEDING.epilogue)) {
      assert.ok(
        !/failure|failed/i.test(reading),
        '§8: the Commune closes nothing and ranks nothing'
      );
    }
  });
});

describe('the beats, as §9 schedules them', () => {
  it('opens with the column and the guns silent, and nothing else', () => {
    const silences = beatsOf('silent');
    assert.deepEqual(
      silences.map((beat) => (beat.kind === 'silent' ? beat.tag : '')),
      [
        'the-barge',
        'the-sower',
        'seed-two',
        'seed-three',
        'escort-one',
        'escort-two',
        'escort-three',
      ]
    );
    for (const beat of silences) {
      assert.equal(beat.atTick, 0, '§9: at 00:00');
      assert.equal(beat.kind === 'silent' ? beat.active : false, true);
    }
    // The pair is not among them: it is the column's ears, and §7 is a table of
    // what it hears rather than of what it says.
    assert.ok(!silences.some((beat) => beat.kind === 'silent' && beat.tag.startsWith('chart')));
  });

  it('sounds the six faces in §6’s order, twenty seconds each, on the concern’s party', () => {
    // §13: "periodTicks === onTicks of twenty seconds — a sustained sound — and
    // a fromTick/untilTick window of the same length."
    const schedule: [string, number][] = [
      ['face-one', T(6)],
      ['face-four', T(7)],
      ['face-two', T(9)],
      ['face-five', T(10, 30)],
      ['face-three', T(12)],
      ['face-six', T(14)],
    ];
    for (const [tag, from] of schedule) {
      const sounds = emitter(tag);
      assert.equal(sounds.sig, 80, '§6: the trade standard both sides quote');
      assert.equal(sounds.fromTick, from, `${tag}: §6's hour`);
      assert.equal(sounds.untilTick, from + T(0, 20), `${tag}: twenty seconds`);
      assert.equal(sounds.periodTicks, sounds.onTicks, `${tag}: sustained, not a rhythm`);
      assert.equal(sounds.periodTicks, T(0, 20));
      assert.equal(sounds.depthM, 2600, "§11: the terraces' own floor");
      assert.ok(terrain.admits(sounds.x, sounds.y, sounds.depthM));
    }
    // The faces stand where Prospect charted them, to the metre.
    for (const sounding of LEDGER_PROSPECT.soundings ?? []) {
      const mine = emitter(sounding.id);
      assert.deepEqual(
        [mine.x, mine.y],
        [sounding.x, sounding.y],
        `${sounding.id}: Prospect's face`
      );
    }
    assert.equal(partyAt(2).emitters?.length, 6, '§6: six faces are charted, and six sound');
  });

  it('lifts the riser at 20:30, as Prospect’s own beat, verbatim', () => {
    const mine = SEEDING_SECOND_SEEDING.beats.find(
      (beat) => beat.kind === 'creature' && beat.species === FaunaSpecies.Sounder
    )!;
    const theirs = LEDGER_PROSPECT.beats.find(
      (beat) => beat.kind === 'creature' && beat.species === FaunaSpecies.Sounder
    )!;
    assert.ok(mine.kind === 'creature' && theirs.kind === 'creature');
    assert.equal(mine.atTick, theirs.atTick, '§9: 20:30, on the same tide');
    assert.deepEqual(mine.spawnAt, theirs.spawnAt, '§13: 3000, 3600 at 3,050 m');
    assert.deepEqual(mine.driveTo, theirs.driveTo, '§13: driven to 3000, 2400');
    assert.equal(mine.untilTick, theirs.untilTick, '§13: sixty seconds');
    assert.equal(mine.loud, true, '§8: the telegraph, paid to a conclusion that is not owed one');
    // §9: the drive carries no depth, so the animal climbs at 12 m/s from where
    // it was placed and the commitment expires about 2,330 m down, still
    // climbing toward its species' own 2,000.
    assert.equal(mine.driveTo.depthM, undefined, '§13: the species’ climb, not an authored depth');
    const climbed =
      mine.spawnAt!.depthM -
      ((mine.untilTick - mine.atTick) / SIM.TICK_HZ) * DRIFT.VERTICAL_SPEED_MPS;
    near(climbed, 2330, 1, '§9: about 2,330 m down when the drive expires');
    // And it grinds nothing the plateaus own: the barge is the one hull long
    // enough for a transit to notice, and it is 1,750 m off the line.
    assert.equal(statsFor(UnitKind.Cruiser).hullLengthM, 130);
    assert.ok(statsFor(UnitKind.Cruiser).hullLengthM >= DRIFT.TRANSIT_MIN_HULL_M);
    assert.ok(
      away(BED, { x: mine.driveTo.x, y: BED.y }) >= 1750,
      '§13: it holds them, and that is arithmetic'
    );
  });

  it('closes at 23:00 as a conclusion, inside the band the header advertises', () => {
    const resolve = SEEDING_SECOND_SEEDING.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.atTick, CLOSE, '§9: twenty-three minutes');
    assert.equal(
      resolve.kind === 'resolve' ? resolve.conclusion : undefined,
      true,
      '§8: a tide, not a timer'
    );
    const [low, high] = SEEDING_SECOND_SEEDING.lengthBandS;
    assert.deepEqual([low, high], [1320, 1440], "§9: the header's band");
    assert.ok(CLOSE / SIM.TICK_HZ >= low && CLOSE / SIM.TICK_HZ <= high);
    // The telegraph is not owed to a conclusion and is paid anyway.
    const loud = SEEDING_SECOND_SEEDING.beats.filter(
      (beat) => beat.kind === 'creature' && beat.loud
    );
    assert.equal(loud.length, 1);
    assert.ok(
      (CLOSE - loud[0]!.atTick) / SIM.TICK_HZ >= MISSION.FAILURE_TELEGRAPH_S,
      '§8: one hundred and fifty seconds against sixty'
    );
  });

  it('hangs four beats on a condition and gives none of them a group', () => {
    // §9's second table, plus the row that is not in it: the grant, fired by
    // the sowing rather than by the clock.
    const conditionals = SEEDING_SECOND_SEEDING.conditionalBeats ?? [];
    assert.equal(conditionals.length, 4);
    assert.deepEqual(
      conditionals.map((beat) => beat.kind),
      ['ground', 'say', 'say', 'say']
    );
    for (const beat of conditionals) {
      assert.equal(beat.choiceGroup, undefined, '§9: none shares a group; none retires another');
    }
    assert.deepEqual(conditionals[0]!.when, { kind: 'sound', count: 1 });
    assert.deepEqual(conditionals[1]!.when, { kind: 'sound', count: 1 });
    assert.deepEqual(conditionals[2]!.when, {
      kind: 'extract',
      role: 'escort',
      region: 'the-rim-furrow',
      count: 1,
    });
    assert.deepEqual(conditionals[3]!.when, {
      kind: 'tolerance',
      ticks: T(1),
      tier: ResolutionTier.Track,
    });
    // The two on the sowing are one event heard twice, and fire in authored
    // order on the same pass.
    assert.equal(conditionals[0]!.kind === 'ground' ? conditionals[0]!.pressureBonus : 0, 1);
    assert.match(
      conditionals[1]!.kind === 'say' ? conditionals[1]!.text : '',
      /That's the second one/,
      '§12, verbatim'
    );
  });

  it('walks the concern, the watch, the readers, the Order and the pair on §9’s clock', () => {
    const at = (tag: string, tick: number): [number, number] => {
      const beat = moveTo(tag, tick);
      return beat.kind === 'move' ? [beat.x, beat.y] : [-1, -1];
    };
    assert.deepEqual(at('flagship', T(2)), [3000, 2750], '§9: the descent');
    assert.deepEqual(at('reader-west', T(2)), [2700, 2450]);
    assert.deepEqual(at('reader-east', T(2)), [3300, 2450]);
    assert.deepEqual(at('bunkerage', T(2)), [3000, 2850]);
    assert.deepEqual(at('chart-a', T(3)), [1800, 2150], "§9: Prospect's first leg");
    assert.deepEqual(at('watch-a', T(4)), [3600, 3300], '§9: the watch walks the lip');
    assert.deepEqual(at('recon', T(4, 30)), [4600, 2100]);
    assert.deepEqual(at('reader-west', T(5)), [900, 2500], '§9: to the first face');
    assert.deepEqual(at('reader-east', T(6, 30)), [3500, 2700]);
    assert.deepEqual(at('chart-a', T(7)), [2700, 2100], "§9: Prospect's second leg");
    assert.deepEqual(at('reader-west', T(8, 30)), [1700, 2750], '§9: to the second face');
    assert.deepEqual(at('watch-a', T(9)), [2400, 3400], '§9: the watch walks west');
    assert.deepEqual(at('recon', T(10)), [3800, 2050]);
    assert.deepEqual(at('reader-east', T(10)), [4300, 2450]);
    assert.deepEqual(at('reader-west', T(11, 30)), [2500, 2400], '§9: to the third face');
    assert.deepEqual(at('chart-a', T(13)), [1200, 2050], '§9: the pair turns for home water');
    assert.deepEqual(at('reader-east', T(13, 30)), [5100, 2800]);
    assert.deepEqual(at('watch-a', T(14)), [4600, 3300], '§9: the watch resumes its station');
    assert.deepEqual(at('recon', T(17)), [5200, 1600], '§9: the reconnaissance withdraws');
    assert.deepEqual(at('flagship', RELEASE), [3000, 420], '§9: the ascent');
    // The descent and the ascent are depth orders, so §4's 72 and the ascent's
    // silence are the depth system's own rather than this literal's.
    const depthOf = (tag: string, tick: number): number | undefined => {
      const beat = moveTo(tag, tick);
      return beat.kind === 'move' ? beat.depthM : undefined;
    };
    for (const tag of ['flagship', 'reader-west', 'reader-east', 'bunkerage']) {
      assert.equal(depthOf(tag, T(2)), 2500, `${tag}: §9 — the descent's depth order`);
      assert.equal(depthOf(tag, RELEASE), 1400, `${tag}: §9 — the ascent's`);
    }
    assert.equal(
      (2500 - 1400) / DEPTH.ASCENT_RATE_MPS,
      73.33333333333333,
      '§6: seventy-three seconds'
    );
  });

  it('says every line §12 authors, in the voices §12 gives them', () => {
    const said = beatsOf('say').map((beat) => (beat.kind === 'say' ? beat : null)!);
    assert.deepEqual(
      said.map((beat) => beat.atTick),
      [0, T(0, 30), T(2, 30), T(5, 30), T(8), T(11), T(14), T(20, 35), T(21)],
      "§9's nine spoken beats"
    );
    assert.match(said[0]!.text, /which is the bed working/, '§12: the watch, on the terraces');
    assert.match(said[1]!.text, /We'd like you to notice we said \*planting\*/, '§12: the coda');
    assert.match(said[2]!.text, /They've never once come any other way/, '§12: the descent');
    assert.match(said[3]!.text, /We'd ask you to notice the \*yet\*/, "§12: Prospect's line");
    assert.equal(said[3]!.speaker, 'The charting pair, for the plateaus');
    assert.match(said[4]!.text, /against a debt that is not stated/, '§12: the Watch-Speaker');
    assert.match(said[5]!.text, /discourteous to the crystal/, '§12: the Order');
    assert.match(said[6]!.text, /whatever we do next/, '§12: the quiet window');
    assert.match(said[7]!.text, /we're coming down struck/, '§12: Teel at the release');
    assert.match(said[8]!.text, /we're not going anywhere/, '§12: the watch, on the riser');
    // Prospect's two shared lines, verbatim across both documents.
    for (const speaker of [
      'The charting pair, for the plateaus',
      'Watch-Speaker, for those below',
    ]) {
      const mine = said.find((beat) => beat.speaker === speaker)!;
      const theirs = LEDGER_PROSPECT.beats.find(
        (beat) => beat.kind === 'say' && beat.speaker === speaker
      )!;
      assert.equal(mine.text, theirs.kind === 'say' ? theirs.text : '', `${speaker}: verbatim`);
    }
  });
});

describe('the zone, as §4.3 and §13 build it', () => {
  it('states the crush the lip charges and the band the furrow rents', () => {
    // §4: "Between 1,800 m and the furrow's edge a Corvette pays 4 HP/s of what
    // does not heal — seventeen and a half seconds, seventy points of 420 — and
    // inside the furrow, once the row is built, it pays nothing. Without the row
    // it has 105 seconds from 1,800 m."
    assert.equal(requiredPressureRating(1800), 3, '§4: the band line');
    assert.equal(crushAttritionPerSecond(CORVETTE.pressureRating, DEPTH.MAX_M), 4);
    assert.equal(
      crushAttritionPerSecond(CORVETTE.pressureRating + 1, DEPTH.MAX_M),
      0,
      '§4.3: one band'
    );
    assert.equal(17.5 * 4, 70, '§4: seventy points of hull between the band line and the edge');
    assert.equal(CORVETTE.maxHp / 4, 105, '§4: a hundred and five to zero without the row');
    // 20:30 plus fifteen seconds to the band line plus a hundred and five is
    // 22:30 — before the tide, which is why the row is the mission (§4, §13).
    const deadAt = RELEASE + T(0, 15) + 105 * SIM.TICK_HZ;
    near(deadAt / SIM.TICK_HZ, 22 * 60 + 30, 1, '§4: dead at about 22:30');
    assert.ok(deadAt < CLOSE, '§13: before the tide');
  });

  it('grants exactly one band, and never a second one', () => {
    const grant = (SEEDING_SECOND_SEEDING.conditionalBeats ?? []).find(
      (beat) => beat.kind === 'ground'
    )!;
    assert.equal(grant.kind === 'ground' ? grant.pressureBonus : 0, 1, '§4.3: PR + 1');
    assert.equal(grant.kind === 'ground' ? grant.region : '', 'the-rim-furrow');
    assert.equal(STRUCTURE_AURAS.SOUNDING_SPIRE.PR_BONUS, 1, 'and the Spire grants the same one');
  });
});

/**
 * Three tides, played out. Everything above is readable from the table; none of
 * this is — a mission that runs its length, a keystone that reads a whole
 * ending, a rectangle that stops a crush ledger on the tick a hold completes,
 * and a bed that never once reaches Track.
 */
describe('the tide, run out', () => {
  interface Run {
    outcome: MissionOutcome;
    epilogue: string;
    lines: string[];
    objectives: { id: string; status: ObjectiveStatus }[];
    closedAtTick: number;
    match: Match;
  }

  const mine = (match: Match, kind: UnitKind): number[] =>
    hulls(match.world).filter((eid) => Owner.slot[eid] === PLAYER && Unit.kind[eid] === kind);

  /**
   * The player's own hull nearest an authored seat.
   *
   * By seat and not by coordinate, because separation moves three of the four
   * column hulls off their authored metres on the first tick — see the case
   * below on what the bed does to the barge. A test that looked a hull up by
   * the number in §11's table would find nothing.
   */
  const nearest = (match: Match, kind: UnitKind, seat: Place): number =>
    mine(match, kind).sort(
      (a, b) =>
        Math.hypot(Position.x[a]! - seat.x, Position.y[a]! - seat.y) -
        Math.hypot(Position.x[b]! - seat.x, Position.y[b]! - seat.y)
    )[0]!;

  /** Run the day out, letting `drive` give orders on whatever ticks it wants. */
  function play(drive?: (match: Match, tick: number) => void): Run {
    const map = missionMapById(SEEDING_SECOND_SEEDING.mapId)!;
    const match = new Match(map, { mission: SEEDING_SECOND_SEEDING, fauna: false, seed: 77 });
    const lines: string[] = [];
    let tick = 0;
    for (; tick <= CLOSE + SIM.TICK_HZ; tick++) {
      match.update(STEP_MS);
      drive?.(match, tick);
      match.takeMissionView();
      for (const line of match.takeMissionLines()) lines.push(line.text);
      if (match.missionOver !== null) break;
    }
    const over = match.missionOver;
    assert.ok(over !== null, 'the tide never turned');
    return {
      outcome: over.outcome,
      epilogue: over.epilogue,
      lines,
      objectives: over.objectives.map((o) => ({ id: o.id, status: o.status })),
      closedAtTick: match.world.tick,
      match,
    };
  }

  const status = (run: Run, id: string) => run.objectives.find((o) => o.id === id)?.status;

  /**
   * Drop the sower's silence, which is the whole of what starting a sowing is.
   *
   * §3: "a sounding needs a hull that is not silent (`holdingSounding`), and
   * the sower drops silence to plant". Nothing else is ordered — the hull is
   * seated 112 m from the point with its bow inside the cone, so the sixty
   * seconds are bought with one button and paid for in ears.
   */
  function sowFrom(tick: number) {
    return (match: Match, at: number): void => {
      if (at !== tick) return;
      match.setSilentRunning(PLAYER, nearest(match, UnitKind.Harvester, unit('the-sower')), false);
    };
  }

  /** Send Teel's three south into the furrow on their release, and down. */
  function sendTeel(match: Match, at: number): void {
    if (at !== RELEASE + 1) return;
    for (const eid of mine(match, UnitKind.Corvette)) {
      match.orderMove(PLAYER, eid, BED.x, BED.y);
      match.orderDepth(PLAYER, eid, DEPTH.MAX_M);
    }
  }

  it('settles the column off its authored metres, and three of four stay in the furrow', () => {
    // The one thing in this literal that reading §11's table cannot tell you.
    // The bed is a structure with an 85 m body and the barge is a 130 m hull
    // seated 50 m from its centre, so separation pushes the barge to 1250,
    // 3400 on the first tick — and the barge in turn pushes `seed-three` from
    // 1250, 3400 to about 1250, 3502, which is two metres outside
    // `the-rim-furrow`. §8 says "the whole column is seated inside
    // `the-rim-furrow` at tick zero", and of the authored coordinates that is
    // true; of the settled ones, three of the four are, which is exactly the
    // count *the-furrow* asks for and not one hull more.
    const map = missionMapById(SEEDING_SECOND_SEEDING.mapId)!;
    const match = new Match(map, { mission: SEEDING_SECOND_SEEDING, fauna: false, seed: 77 });
    for (let tick = 0; tick < SIM.TICK_HZ * 5; tick++) match.update(STEP_MS);
    const column = [...mine(match, UnitKind.Cruiser), ...mine(match, UnitKind.Harvester)];
    assert.equal(column.length, 4, '§3: the barge and three tenders');
    const inside = column.filter((eid) => inRegion(furrow, Position.x[eid]!, Position.y[eid]!));
    assert.equal(inside.length, 3, 'three of four, and the row wants three');
    // Nothing about §4's arithmetic moves, because every one of them is still
    // well inside the bed's 350 m cloud and still at 3,000 m.
    for (const eid of column) {
      assert.ok(
        Math.hypot(Position.x[eid]! - BED.x, Position.y[eid]! - BED.y) < VEIL.RADIUS_M,
        'a hull settled outside the cloud, which would change every figure in §6'
      );
      assert.equal(Position.depth[eid], DEPTH.MAX_M);
    }
  });

  it('reads an idle day as the rim exactly as it was, and closes on the keystone', () => {
    // §8's Lost row: "the-seeding unmet — whatever else came home". The column
    // never moved, so the furrow reads met on the reveal and the count still
    // reads Lost, which is the keystone doing the one thing it is for.
    const run = play();
    assert.equal(run.closedAtTick, CLOSE, '§9: the tide turns at 23:00 and not before');
    assert.equal(run.outcome, MissionOutcome.Lost);
    assert.match(run.epilogue, /^Nothing was planted\./);
    assert.equal(status(run, 'the-seeding'), ObjectiveStatus.Pending);
    assert.equal(status(run, 'the-furrow'), ObjectiveStatus.Met, '§8: the residual, stated');
    assert.equal(status(run, 'the-escorts'), ObjectiveStatus.Pending, 'nobody was asked down');
    // §8, §13: the bed is a Classification all day and the ledger is at Track,
    // so a day in which the player did nothing careless is a day nobody had
    // the column exact. This is the finding, run.
    assert.equal(status(run, 'the-ledger'), ObjectiveStatus.Pending);
    assert.match(run.epilogue, /Nobody had the column exact/);
    // And §8's other half: a pair that walks the table's own legs hears the lip
    // breathing, from the second leg, without the player giving an order.
    assert.equal(status(run, 'the-returns'), ObjectiveStatus.Met);
    assert.match(run.epilogue, /we're not going to say what it was/);
  });

  it('sows the lip, rates it, brings the guns down into it, and the deep is seeded', () => {
    // §4.3 and §8's Complete row, end to end: sixty seconds under the bed in
    // the first quiet window, the grant on the tick the hold completes, and
    // Teel's element standing at 3,000 m on ground that holds it.
    const run = play((match, at) => {
      sowFrom(T(2))(match, at);
      sendTeel(match, at);
    });
    assert.equal(run.closedAtTick, CLOSE, '§8: both terminal rows met, and the tide still runs');
    assert.equal(run.outcome, MissionOutcome.Complete);
    assert.match(run.epilogue, /^The deep's seeded\./);
    assert.equal(status(run, 'the-seeding'), ObjectiveStatus.Met);
    assert.equal(status(run, 'the-furrow'), ObjectiveStatus.Met);
    assert.equal(status(run, 'the-escorts'), ObjectiveStatus.Met);
    // Both conditional lines that hang off the two events.
    assert.ok(
      run.lines.some((line) => /That's the second one/.test(line)),
      '§12: Anholt'
    );
    assert.ok(
      run.lines.some((line) => /we didn't strike anybody/.test(line)),
      '§12: Teel'
    );
    // The row itself: every player hull standing in the rectangle carries the
    // band, and the ones outside it carry nothing.
    for (const eid of hulls(run.match.world)) {
      if (Owner.slot[eid] !== PLAYER) continue;
      const inside = inRegion(furrow, Position.x[eid]!, Position.y[eid]!);
      assert.equal(
        Pressure.bonus[eid],
        inside ? 1 : 0,
        `a hull ${inside ? 'inside' : 'outside'} the furrow carries ${Pressure.bonus[eid]}`
      );
    }
    // And what the band is for: three PR-2 Corvettes at 3,000 m, unhurt past
    // the seventy points the run south costs before the edge.
    const teel = mine(run.match, UnitKind.Corvette);
    assert.equal(teel.length, 3, "§4: Teel's element is on the lip and alive");
    for (const eid of teel) {
      assert.equal(Pressure.rating[eid], 2, '§3: PR-2, unrefit');
      assert.equal(Pressure.bonus[eid], 1, '§4.3: and the ground rents the band');
      near(Position.depth[eid]!, DEPTH.MAX_M, 3, '§4: on its floor');
      assert.ok(Health.hp[eid]! > CORVETTE.maxHp - 100, 'it paid the run south and nothing after');
      assert.ok(Pressure.unhealable[eid]! > 0, '§4: seventy points between the line and the edge');
      assert.ok(Pressure.unhealable[eid]! < 150, '§4: and nothing once it is inside');
    }
    // §6: a sowing in the first quiet window is in nobody's account — the watch
    // is at home until 04:00 and the readers are still on the terraces.
    assert.equal(status(run, 'the-ledger'), ObjectiveStatus.Pending, '§13’s open question, run');
  });

  it('kills the same three guns on an unsown lip, and enters a forgotten barge', () => {
    // The control, and it is the sentence §13 leads with: "Until it lands
    // Teel's element crosses 1,800 m about fifteen seconds after release and is
    // dead at about 22:30, before the tide." Nothing here is sown.
    //
    // And the ledger's other half, from §8: "a barge left idling under the bed
    // while the watch is west, a Track at 8.06 for as long as it is forgotten".
    const run = play((match, at) => {
      sendTeel(match, at);
      if (at === T(9, 30)) {
        for (const eid of mine(match, UnitKind.Cruiser)) match.setSilentRunning(PLAYER, eid, false);
      }
    });
    assert.equal(run.outcome, MissionOutcome.Lost, '§8: the rim is what it was');
    assert.equal(mine(run.match, UnitKind.Corvette).length, 0, '§13: dead before the tide');
    // And the row still reads met, because §8 counts an arrival and not a
    // survival: "Three guns came down at seventy-two into the basin's noise."
    // They did. Nothing in this mission counts what it lost, and the count is
    // Lost anyway, on the keystone.
    assert.equal(status(run, 'the-escorts'), ObjectiveStatus.Met);
    assert.equal(status(run, 'the-ledger'), ObjectiveStatus.Met, '§8: somebody had us exact');
    assert.match(run.epilogue, /Somebody had us exact for a minute/);
    assert.ok(
      run.lines.some((line) => /We'd like to know whose ears, and we never will/.test(line)),
      '§9, §12: the watch, on the ledger'
    );
  });
});
