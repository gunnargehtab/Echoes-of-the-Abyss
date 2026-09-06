/**
 * The Second Seeding 5, read — docs/mission-in-writing.md.
 *
 * `missions.test.ts` holds every mission to §10's conventions; this file holds
 * In Writing to the things only its own document claims, and to the four its
 * document claims that reading the table cannot establish:
 *
 * - **The 00:00 restatement is acoustics, not decoration** (§11, §13). Before
 *   the `ground` beat, `pathPropagation` prices the dome-to-eastern-bed pair
 *   at 1.25 through the Second Furrow's trench paint; after it, at the
 *   garden's own 0.55. §4's "625 m through the garden's own 0.55" and §7's
 *   whole cross-region table are true only on the far side of that beat, so
 *   every figure below is re-derived from the literal's own grid rather than
 *   from `PROPAGATION_FACTOR` — *The Second Seeding*'s row, on the same engine.
 * - **The line is cold because an armed line would take the beds** (§6, §13).
 *   At 04:30 the line stands at 2,150 m over beds at 1,790, and a 450 m
 *   spherical reach at a 360 m depth difference is 270 m of horizontal reach:
 *   three of the eight seats cover each outer bed and two cover the middle, so
 *   900 hull at 20 a second per gun has every bed down at about 04:55. The
 *   arithmetic is the whole reason no Chorister carries `armed`.
 * - **The doorway is priced by the gun and the door by the ear** (§6, §13).
 *   Detection is horizontal and `engagementRangeM` is not, so a gun at 2,100 m
 *   reaches 571 m across a row at 1,790 — 557 m at the beds' own y, which is
 *   the x ≈ 2,557 §6 names — while a hull crossing the throat's middle at
 *   1,790 is 773 m from either gun and is not shot at all.
 * - **The riser is spawned at the garden's depth and not the sill floor's**
 *   (§6, §13). A driven creature climbs at 12 m/s from wherever it was placed;
 *   from 2,450 m it would pass the dome at 1,990 against a transit reach of
 *   117.5 m, and from 2,200 m it is at 1,750 by y 1,775 and clears by 250.
 *
 * Nothing here steps a match. The mission is data, and the failures worth
 * catching in it are authoring failures the document can be read against.
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
} from '@echoes/shared';
import { ANHOLT_FURROW, mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { SEEDING_IN_WRITING } from '../src/sim/missions/inWriting.ts';
import { inRegion } from '../src/sim/missions/predicates.ts';
import type { MissionBeat, MissionUnit } from '../src/sim/missions/types.ts';

const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;
const M = TIER_THRESHOLD_MULTIPLIER;

const MISSION_DEF = SEEDING_IN_WRITING;
const PLAYER = MISSION_DEF.parties.find((party) => party.slot === MISSION_DEF.playerSlot)!;
const COHORT = MISSION_DEF.parties.find((party) => party.slot !== MISSION_DEF.playerSlot)!;

const unit = (tag: string): MissionUnit =>
  MISSION_DEF.parties.flatMap((party) => party.units).find((u) => u.tag === tag)!;
const structure = (tag: string) =>
  MISSION_DEF.parties.flatMap((party) => party.structures ?? []).find((s) => s.tag === tag)!;
const objective = (id: string) => MISSION_DEF.objectives.find((o) => o.id === id)!;
const region = (id: string) => MISSION_DEF.regions.find((r) => r.id === id)!;
const beatsAt = (tick: number) => MISSION_DEF.beats.filter((beat) => beat.atTick === tick);

/** §3 — the roster's Silent Running band, which is where every SIG in §7 starts. */
const silentSig = (idleSig: number): number =>
  SILENT_RUNNING.SIG_MIN + (SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN) * (idleSig / 60);

const VEIL = STRUCTURE_AURAS.SPORE_VEIL;
const CANTOR = STRUCTURE_AURAS.CANTOR;
const TENDER = statsFor(UnitKind.Harvester);
const SCOUT = statsFor(UnitKind.LightScout);
const GUN = statsFor(UnitKind.Corvette);
const CHORISTER = statsFor(UnitKind.Chorister);
const SUBMERSIBLE = statsFor(UnitKind.AbyssalSubmersible);
const DOME = structureStatsFor(StructureKind.Cantor);
const BED = structureStatsFor(StructureKind.SporeVeil);
const SOUNDER = faunaStatsFor(FaunaSpecies.Sounder);
const HOLLOW = faunaStatsFor(FaunaSpecies.Hollow);

/**
 * The water this mission is actually played in: the map literal with the 00:00
 * `ground` beat applied.
 *
 * Every §7 figure is re-derived over this grid rather than over
 * `PROPAGATION_FACTOR`, which is §13's own instruction — a repaint of the
 * Second Furrow should move this document's ranges instead of falsifying them.
 */
function garden() {
  const terrain = terrainFor(missionMapById(MISSION_DEF.mapId)!);
  for (const beat of MISSION_DEF.beats) {
    if (beat.kind !== 'ground' || beat.biome === undefined) continue;
    const rect = region(beat.region);
    terrain.fillRect(rect.x, rect.y, rect.widthM, rect.heightM, beat.biome);
  }
  return terrain;
}

/** The range at which `sig` through `pf` reaches `hyd` at a tier's multiple. */
function rangeAt(sig: number, pf: number, hyd: number, multiple: number): number {
  let low = 0.001;
  let high = 40000;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (detectionRatio(sig, pf, mid, hyd) >= multiple) low = mid;
    else high = mid;
  }
  return Math.round(low);
}

/** The four tier ranges of one §7 row, in the table's own order. */
function tiers(sig: number, pf: number, hyd: number): number[] {
  return [
    rangeAt(sig, pf, hyd, M.CONTACT),
    rangeAt(sig, pf, hyd, M.BEARING),
    rangeAt(sig, pf, hyd, M.CLASSIFICATION),
    rangeAt(sig, pf, hyd, M.TRACK),
  ];
}

const between = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** §13 — detection is horizontal and `engagementRangeM` is not. */
const horizontalReach = (rangeM: number, depthDeltaM: number): number =>
  Math.sqrt(rangeM * rangeM - depthDeltaM * depthDeltaM);

describe('the Furrow, as docs/mission-in-writing.md §11 reuses it', () => {
  it('is deep-furrow’s literal unchanged, region for region, and adds no geometry', () => {
    // §11: "The same map literal as mission-deep-furrow.md §11, unchanged,
    // region for region." What this mission adds is markers, structures, a
    // ground beat and parties — never geometry, which is campaign.md §2 rule
    // 5's second concrete pair after Marr Plateau under Tend and Convocation.
    assert.equal(MISSION_DEF.mapId, 'anholt-furrow');
    assert.deepEqual(
      ANHOLT_FURROW.regions.map((r) => [r.x, r.y, r.widthM, r.heightM, r.biome, r.floorM]),
      [
        [0, 0, 4000, 3000, Biome.OpenWater, 1100],
        [1500, 0, 1000, 500, Biome.OpenWater, 900],
        [0, 500, 1250, 2500, Biome.OpenWater, 0],
        [2750, 500, 1250, 2500, Biome.OpenWater, 0],
        [1250, 500, 1500, 1250, Biome.AbyssalTrench, 1800],
        [1250, 1750, 1000, 750, Biome.KelpForest, 2200],
        [2250, 1750, 500, 750, Biome.AbyssalTrench, 2200],
        [1250, 2500, 1500, 500, Biome.AbyssalTrench, 2600],
      ],
      '§11: the eight rows of the table, in the document’s painting order'
    );
    assert.equal(ANHOLT_FURROW.widthM, 4000);
    assert.equal(ANHOLT_FURROW.heightM, 3000);
    assert.equal(ANHOLT_FURROW.floorM, 1100, '§11: base floor 1,100 — the duct’s top');
    assert.deepEqual(
      ANHOLT_FURROW.spawns.map((s) => [s.x, s.y]),
      [[2000, 250]],
      '§11: one spawn, at the Foot'
    );
    assert.deepEqual(ANHOLT_FURROW.resources, [], '§11: no resources');
    assert.deepEqual(ANHOLT_FURROW.hazards, [], '§11: no hazard sites');
    assert.equal(MISSION_DEF.fauna, false, '§6: fauna: false — every creature is authored');
  });

  it('restates only the two places a row or a beat addresses', () => {
    // §11: "the garden and the throat are prose here and not regions — the
    // plan's `the-furrows` and `the-throat` are named by no row, no marker and
    // no beat."
    assert.deepEqual(
      MISSION_DEF.regions.map((r) => [r.id, r.x, r.y, r.widthM, r.heightM]),
      [
        ['the-foot', 1500, 0, 1000, 500],
        ['second-furrow', 2250, 1750, 500, 750],
      ],
      '§11: two mission regions, and both are addressed'
    );
    assert.deepEqual(
      MISSION_DEF.markers.map((m) => [m.id, m.x, m.y, m.radiusM]),
      [['the-foot', 2000, 250, 500]],
      '§11: one marker, named by both terminal rows'
    );
    // §13: the region pressure grant exists and is deliberately not leaned on.
    for (const rect of MISSION_DEF.regions) {
      assert.equal(rect.pressureBonus, undefined, '§13: no manufactured water on this map');
    }
  });

  it('is a mission map, and from this tide it is resolved by two ids', () => {
    assert.equal(ANHOLT_FURROW.seats, 1, '§11: one seat, not balanced');
    assert.equal(mapById('anholt-furrow'), undefined, 'the skirmish screen would offer it');
    assert.equal(missionMapById('anholt-furrow'), ANHOLT_FURROW, 'resolved by mission id only');
  });
});

describe('the 00:00 restatement, as §11 and §13 argue for it', () => {
  const ground = MISSION_DEF.beats.filter((beat) => beat.kind === 'ground');

  it('turns the second furrow to kelp at tick zero and writes nothing else', () => {
    assert.equal(ground.length, 1, '§9: one ground beat, and it is a restatement');
    const beat = ground[0]!;
    assert.equal(beat.atTick, 0, '§9: 00:00, with the map');
    assert.equal(beat.kind === 'ground' ? beat.region : '', 'second-furrow');
    assert.equal(beat.kind === 'ground' ? beat.biome : undefined, Biome.KelpForest);
    assert.equal(
      beat.kind === 'ground' ? beat.floorM : undefined,
      undefined,
      '§11: never geometry'
    );
    assert.equal(beat.kind === 'ground' ? beat.ceilingM : undefined, undefined);
    assert.equal(
      beat.kind === 'ground' ? beat.pressureBonus : undefined,
      undefined,
      '§13: the grant is not needed here and is not sown'
    );
  });

  it('is the beat that makes §4’s own arithmetic true', () => {
    // The finding this test exists for. The eastern bed stands in the Second
    // Furrow, which the map literal paints Abyssal Trench; §4 prices the
    // dome-to-eastern-bed pair "through the garden's own 0.55", and that is
    // only true after the restatement. Before it the pair is 1.25 and the
    // dome has the outer beds at Track rather than at Classification.
    const bare = terrainFor(missionMapById(MISSION_DEF.mapId)!);
    const dome = structure('the-dome');
    const east = structure('bed-east');
    const before = bare.pathPropagation(dome.x, dome.y, east.x, east.y);
    const after = garden().pathPropagation(dome.x, dome.y, east.x, east.y);
    assert.equal(Number(before.toFixed(3)), 1.25, 'the trench paint, before the beat');
    assert.equal(
      Number(after.toFixed(3)),
      PROPAGATION_FACTOR[Biome.KelpForest],
      '§4: "625 m through the garden’s own 0.55" — true only after 00:00'
    );
    const hum = structureStatsFor(StructureKind.SporeVeil).sigIdle * VEIL.SIG_FACTOR;
    const range = between(dome, east);
    assert.ok(
      detectionRatio(hum, before, range, DOME.hyd) >= M.TRACK,
      'unrestated, the dome would hold the eastern bed at Track'
    );
    assert.equal(
      Number(detectionRatio(hum, after, range, DOME.hyd).toFixed(2)),
      2.55,
      '§4: the outer pair at Classification, ratio 2.55 at 625 m'
    );
  });
});

describe('the furrow’s people, as §3 seats them', () => {
  it('is sixteen in three tenders, two refit scouts, and three struck guns', () => {
    assert.equal(PLAYER.faction, Faction.Pelagia);
    assert.equal(PLAYER.units.length, 8, '§3: eight hulls under three beds');
    const tenders = PLAYER.units.filter((u) => u.role === 'tender');
    const watch = PLAYER.units.filter((u) => u.role === 'watch');
    const escorts = PLAYER.units.filter((u) => u.role === 'escort');
    assert.equal(tenders.length, 3);
    assert.equal(watch.length, 2);
    assert.equal(escorts.length, 3);
    assert.deepEqual(
      tenders.map((u) => u.souls),
      [5, 7, 4],
      '§3: the households, and 5 + 7 + 4 is the sixteen the briefing asks for'
    );
    assert.equal(
      tenders.reduce((sum, u) => sum + (u.souls ?? 0), 0),
      16,
      '§8: the count is hulls and the reading is people'
    );
    for (const u of tenders) assert.equal(u.kind, UnitKind.Harvester);
    for (const u of watch) {
      assert.equal(u.kind, UnitKind.LightScout);
      assert.equal(u.pressureRating, 3, '§3: PR-3 by the 204 PC refit, a mission fact');
      assert.equal(u.souls, 2);
    }
    for (const u of escorts) {
      assert.equal(u.kind, UnitKind.Corvette);
      assert.equal(u.armed, undefined, '§3: struck — every gun the player owns is cold');
      assert.equal(u.souls, 4);
    }
    // §2: two parties and a court slot, and the court is reserved and empty.
    assert.equal(MISSION_DEF.parties.length, 2, '§2: the Drift is not a party');
    assert.equal(COHORT.faction, Faction.Directorate);
  });

  it('seats every hull at 1,790 m, which the ruleset gives a PR-2 hull for nothing', () => {
    // §3: "requiredPressureRating turns over at the 1,800 m band line, so a
    // PR-2 hull owns 1,790 m for nothing: no refit, no crush, and no zone
    // under it." Ten metres is the whole of the margin, and it is the reason
    // §13 can drop both of Deep Furrow's Spire-kind approximations.
    assert.equal(requiredPressureRating(1790), 2);
    assert.equal(requiredPressureRating(1800), 3, '§3: the band line, ten metres below the seat');
    assert.equal(TENDER.pressureRating, 2, '§3: the roster’s Harvester, no refit');
    assert.equal(GUN.pressureRating, 2);
    for (const u of PLAYER.units) assert.equal(u.depthM, 1790, '§11: one seat for all eight');
    for (const bed of PLAYER.structures ?? []) assert.equal(bed.depthM, 1790);
    // The scouts are the one refit, and they need it: PR-1 on the roster.
    assert.equal(SCOUT.pressureRating, 1, '§3: the refit is not a roster change');
  });

  it('puts every hull inside its own bed’s cloud and outside the dome’s ears', () => {
    // §11's two claims, both measured the way `auras.ts` measures — horizontal
    // distance, `Math.hypot` on x and y, never depth. That is what lets the
    // seat sit at 1,790 m over a garden at 2,200 and be veiled exactly as the
    // floor would be, and it is why a scout cannot leave a cloud by climbing.
    const beds = PLAYER.structures ?? [];
    const dome = structure('the-dome');
    const blindContact = rangeAt(
      DOME.sigIdle,
      PROPAGATION_FACTOR[Biome.KelpForest],
      VEIL.BLIND_HYD,
      M.CONTACT
    );
    assert.equal(blindContact, 499, '§4: nothing past 499 m to ears blinded to 5');
    for (const u of PLAYER.units) {
      const nearest = Math.min(...beds.map((bed) => between(u, bed)));
      assert.ok(
        nearest <= VEIL.RADIUS_M,
        `${u.tag}: ${Math.round(nearest)} m from the nearest bed, outside its 350`
      );
      assert.ok(
        between(u, dome) > blindContact,
        `${u.tag}: inside 499 m of the dome, so it opens the mission able to hear it`
      );
    }
    // §3: three clouds 500 m apart on the x, whose radii overlap into one band
    // across the furrows' 1,500 m.
    const [west, mid, east] = beds;
    assert.equal(mid!.x - west!.x, 500);
    assert.equal(east!.x - mid!.x, 500);
    assert.ok(between(west!, mid!) < 2 * VEIL.RADIUS_M, '§3: the clouds overlap');
    assert.ok(between(mid!, east!) < 2 * VEIL.RADIUS_M);
    assert.equal(
      east!.x + VEIL.RADIUS_M - (west!.x - VEIL.RADIUS_M),
      1700,
      '§3: a band 1,700 m wide across furrows that are 1,500'
    );
    // §6 — the dome stands outside every cloud, so its ears are its own.
    assert.equal(between(dome, mid!), 450, '§6: 450 m from the middle bed');
    assert.equal(Math.round(between(dome, west!)), 625, '§6: 625 from the other two');
    assert.equal(Math.round(between(dome, east!)), 625);
    for (const bed of beds) {
      assert.ok(between(dome, bed) > VEIL.RADIUS_M, '§6: outside every cloud');
    }
  });

  it('leaves two corners in the garden where the watch can have its ears', () => {
    // §11's "two posts the watch can stand at, computed rather than hoped".
    // Not authored data — the mission places no marker on them — so the test
    // is the only place the claim is checked, and it is the claim the whole
    // information economy of the mission rests on.
    const terrain = garden();
    const beds = PLAYER.structures ?? [];
    const dome = structure('the-dome');
    const posts = [
      { x: 1250, y: 1800 },
      { x: 2700, y: 1800 },
    ];
    const offBed = posts.map((post) => Math.min(...beds.map((bed) => between(post, bed))));
    assert.deepEqual(offBed.map(Math.round), [410, 382], '§11: outside every cloud');
    for (const off of offBed) assert.ok(off > VEIL.RADIUS_M);
    assert.deepEqual(
      posts.map((post) => Math.round(between(post, dome))),
      [752, 702]
    );
    // §11: "a silent scout at 3.5 through kelp is nothing to a listener at 80
    // past 670 m", so a scout standing at either corner is out of the dome's
    // reach while the dome is well inside the scout's.
    const scoutSilent = silentSig(SCOUT.sigIdle);
    assert.equal(scoutSilent, 3.5, '§3: 3.5 silent');
    const kelp = PROPAGATION_FACTOR[Biome.KelpForest];
    assert.equal(rangeAt(scoutSilent, kelp, DOME.hyd, M.CONTACT), 670);
    for (const post of posts) {
      assert.ok(between(post, dome) > 670, '§11: the post is unheard where it stands');
      assert.equal(terrain.admits(post.x, post.y, 1790), true, '§11: the garden’s last water');
    }
    // §11: the eastern post is 2700 and not 2750, because the cell whose
    // centre is 2875 belongs to the East Wall and is rock.
    assert.equal(terrain.admits(2875, 1800, 1790), false, '§11: the wall is solid');
    // §7's three ranges from a post, all at the scout's own 70.
    const west = { x: 1500, y: 1000 };
    assert.equal(Math.round(between(posts[0]!, west)), 838, '§7: the near Submersible');
    assert.equal(Math.round(between(posts[1]!, { x: 2500, y: 1000 })), 825);
    assert.ok(
      rangeAt(
        SUBMERSIBLE.sigIdle,
        terrain.pathPropagation(west.x, west.y, 1250, 1800),
        SCOUT.hyd,
        M.CONTACT
      ) === 3787,
      '§7: the doorway idle, 3,787 m to a scout through the cleft’s own 1.60'
    );
  });
});

describe('what is heard, as §7 prices it over the literal’s own grid', () => {
  const kelp = PROPAGATION_FACTOR[Biome.KelpForest];
  const lent = CANTOR.HYD_CAP;

  it('reads the cohort’s table of the player row for row, at the dome-lent 95', () => {
    // Every pair in §7's second table has both ends inside the garden, so the
    // path mean is the garden's own 0.55 and the distinction the cross-region
    // rows pay for costs nothing here.
    assert.equal(lent, 95, '§6: the dome lifts 75 and 85 to the cap');
    assert.equal(Math.min(CANTOR.HYD_CAP, CHORISTER.hyd + CANTOR.HYD_BONUS), 95);
    assert.equal(Math.min(CANTOR.HYD_CAP, SUBMERSIBLE.hyd + CANTOR.HYD_BONUS), 95);
    const tenderSilent = silentSig(TENDER.sigIdle);
    const gunSilent = silentSig(GUN.sigIdle);
    assert.equal(tenderSilent, 4.5, '§3: 4.5 running silent');
    assert.equal(Number(gunSilent.toFixed(1)), 5.3);
    assert.deepEqual(tiers(tenderSilent * VEIL.SIG_FACTOR, kelp, lent), [492, 382, 277, 207]);
    assert.deepEqual(tiers(TENDER.sigIdle * VEIL.SIG_FACTOR, kelp, lent), [1170, 908, 660, 492]);
    assert.deepEqual(tiers(tenderSilent, kelp, lent), [872, 677, 492, 367]);
    assert.deepEqual(tiers(TENDER.sigIdle, kelp, lent), [2075, 1610, 1170, 872]);
    assert.deepEqual(tiers(TENDER.sigCruise, kelp, lent), [3417, 2652, 1927, 1437]);
    assert.deepEqual(tiers(gunSilent * VEIL.SIG_FACTOR, kelp, lent), [547, 425, 309, 230]);
    assert.deepEqual(tiers(GUN.sigIdle * VEIL.SIG_FACTOR, kelp, lent), [1542, 1197, 870, 648]);
    assert.deepEqual(tiers(silentSig(SCOUT.sigIdle), kelp, lent), [745, 579, 420, 313]);
    assert.deepEqual(tiers(BED.sigIdle * VEIL.SIG_FACTOR, kelp, lent), [1250, 970, 705, 525]);
  });

  it('reads the cloud from the inside, where a silent tender is nothing at all', () => {
    // §4.2 — the one symmetric aura in the game, priced from the deaf side.
    const blind = VEIL.BLIND_HYD;
    assert.equal(blind, 5);
    assert.equal(
      rangeAt(silentSig(TENDER.sigIdle) * VEIL.SIG_FACTOR, kelp, blind, M.CONTACT),
      0,
      '§4: 1.8 is under threshold even at the reference distance'
    );
    assert.equal(rangeAt(TENDER.sigIdle * VEIL.SIG_FACTOR, kelp, blind, M.CONTACT), 186);
    assert.equal(rangeAt(TENDER.sigIdle * VEIL.SIG_FACTOR, kelp, blind, M.BEARING), 144);
    assert.equal(rangeAt(GUN.sigIdle * VEIL.SIG_FACTOR, kelp, blind, M.BEARING), 190);
    assert.equal(rangeAt(BED.sigIdle * VEIL.SIG_FACTOR, kelp, blind, M.BEARING), 154);
    // §7: the line at cruise, veiled by the same cloud it is standing in, to
    // ears the same cloud has blinded — 222 m, and 2,052 outside one.
    assert.equal(rangeAt(CHORISTER.sigCruise * VEIL.SIG_FACTOR, kelp, blind, M.CONTACT), 222);
    assert.equal(rangeAt(CHORISTER.sigCruise, kelp, SCOUT.hyd, M.CONTACT), 2052);
    // §4.1 — the dome, from every metre of the garden a hull is not veiled in.
    assert.equal(rangeAt(DOME.sigIdle, kelp, SCOUT.hyd, M.CONTACT), 2597);
    assert.equal(rangeAt(DOME.sigIdle, kelp, TENDER.hyd, M.CONTACT), 1529);
  });

  it('prices every cross-region row at the mean of the cells between its ends', () => {
    // §13's instruction, and the reason this suite builds its terrain from the
    // literal: `Terrain.pathPropagation` returns the mean PF over the 250 m
    // cells between two ends, so a pair with one end in the garden and one in
    // the cleft is priced between 0.55 and 1.6 and never at either.
    const terrain = garden();
    const pf = (ax: number, ay: number, bx: number, by: number) =>
      Number(terrain.pathPropagation(ax, ay, bx, by).toFixed(3));
    const west = unit('throat-west');
    const east = unit('throat-east');
    const bedWest = structure('bed-west');
    const bedMid = structure('bed-mid');
    const bedEast = structure('bed-east');
    assert.equal(
      pf(west.x, west.y, 1250, 1800),
      1.6,
      '§7: the throat to the posts, every cell cleft'
    );
    assert.equal(pf(east.x, east.y, 2700, 1800), 1.6);
    assert.equal(
      pf(west.x, west.y, bedWest.x, bedWest.y),
      1.18,
      '§7: three cells of cleft, two of kelp'
    );
    assert.equal(pf(east.x, east.y, bedEast.x, bedEast.y), 1.18);
    assert.equal(pf(west.x, west.y, bedMid.x, bedMid.y), 1.25, '§4: the middle bed, 1,300 m off');
    assert.equal(pf(2000, 1000, 2000, 250), 1.4);
    assert.equal(
      pf(west.x, west.y, 2000, 250),
      1.45,
      '§7: three cells of cleft and one of the Foot'
    );
    // §7 calls this pair "two cells of sill and two of kelp", which would be a
    // mean of 1.075. `pathPropagation` samples four cells over its 906 m and
    // finds one of sill and three of kelp — 0.8125, which is the 0.813 §7's
    // own PF column prints. The number is right and the description is not.
    assert.equal(pf(1350, 2700, 1250, 1800), 0.813, '§7: one cell of sill and three of kelp');
    assert.equal(pf(2000, 2900, 2000, 250), 1.259, '§7: the riser at the spawn');
    assert.equal(pf(2000, 1750, 2000, 250), 1.5, '§7: and by the garden’s north edge');
    assert.equal(pf(2000, 2900, 1250, 1800), 0.9, '§7: the riser to the garden’s corner');
    assert.equal(pf(500, 250, 1250, 1800), 1.0, '§7: the lanes, every cell open water');

    const across = 0.3;
    assert.deepEqual(
      [
        rangeAt(SUBMERSIBLE.sigIdle, 1.6, SCOUT.hyd, M.CONTACT),
        rangeAt(SUBMERSIBLE.sigIdle, 1.18, TENDER.hyd, M.CONTACT),
        rangeAt(silentSig(CHORISTER.sigIdle), 0.813, SCOUT.hyd, M.CONTACT),
        rangeAt(silentSig(CHORISTER.sigIdle), 0.55, SCOUT.hyd, M.CONTACT),
        rangeAt(DEPTH.DESCENT_SIG, 1.6, SCOUT.hyd, M.CONTACT),
        rangeAt(DEPTH.DESCENT_SIG, 1.18, TENDER.hyd, M.CONTACT),
        rangeAt(DEPTH.DESCENT_SIG, 1.45 * across, TENDER.hyd, M.CONTACT),
        rangeAt(SOUNDER.sigActive, 0.55, SCOUT.hyd, M.CONTACT),
        rangeAt(SOUNDER.sigActive, 0.55, TENDER.hyd, M.CONTACT),
        rangeAt(SOUNDER.sigActive, 1.259 * across, TENDER.hyd, M.CONTACT),
        rangeAt(SOUNDER.sigActive, 1.5 * across, TENDER.hyd, M.CONTACT),
        rangeAt(faunaStatsFor(FaunaSpecies.Draymaw).sigIdle, 1.0, SCOUT.hyd, M.CONTACT),
      ],
      [3787, 1844, 899, 704, 7946, 3868, 2073, 5006, 2948, 2331, 2600, 3134],
      '§7: the cross-region table, every row'
    );
    // §7's "line rising silent" row reads 894 m and 700 m, computed off a
    // Chorister rounded to 4.3. The band is `SILENT_RUNNING`'s own arithmetic
    // and the figure is 4.333, so the engine answers 899 and 704 — the row's
    // two claims survive it and the document should carry the exact pair, as
    // its own corvette row already does (5.333 x 0.4 = 2.133, not 2.1).
    //
    // Both surviving claims are re-derived from this literal's own seat and
    // this map's own water rather than compared as constants: `899 < 906` is
    // a sentence about two numbers and can never fail, and the claims are
    // about where the mission actually puts the line.
    assert.equal(silentSig(CHORISTER.sigIdle).toFixed(1), '4.3', '§6: the line rises at 4.3');
    const seat = unit('cohort-1');
    const post = { x: 1250, y: 1800 };
    const riseSig = silentSig(CHORISTER.sigIdle);
    const seatOff = between(seat, post);
    assert.equal(Math.round(seatOff), 906, '§7: the seat the rise is priced against');
    assert.ok(
      rangeAt(
        riseSig,
        terrain.pathPropagation(seat.x, seat.y, post.x, post.y),
        SCOUT.hyd,
        M.CONTACT
      ) < seatOff,
      '§7: the watch hears the rise as it arrives, not as it starts'
    );
    // And by 02:30 the line stands on the 02:00 leg's row, 658 m off the post
    // through the garden's own kelp — inside the range that reaches a scout.
    const risen = MISSION_DEF.beats.find(
      (beat) => beat.kind === 'move' && beat.tag === seat.tag && beat.atTick === T(2)
    )!;
    const closed = between(risen.kind === 'move' ? risen : seat, post);
    assert.equal(Math.round(closed), 658, '§7: the 658 m the line has closed to by 02:30');
    assert.equal(
      Number(
        terrain
          .pathPropagation(
            risen.kind === 'move' ? risen.x : 0,
            risen.kind === 'move' ? risen.y : 0,
            post.x,
            post.y
          )
          .toFixed(3)
      ),
      PROPAGATION_FACTOR[Biome.KelpForest],
      '§7: by then the pair is the garden’s own 0.55'
    );
    assert.ok(
      rangeAt(riseSig, PROPAGATION_FACTOR[Biome.KelpForest], SCOUT.hyd, M.CONTACT) > closed,
      '§7: and still hears it at the garden’s own 0.55 by 02:30'
    );
    assert.equal(DEPTH.DESCENT_SIG, 72, '§6: the throat empties at the descent floor');
    // §8: nothing in this mission is lost to a thing that was quiet.
    assert.equal(rangeAt(HOLLOW.sigActive, 1.6, SCOUT.hyd, M.CONTACT), 7090, '§8: a strike at 60');
  });

  it('reads §4 and §6’s ratios, which are what the sentences actually claim', () => {
    const terrain = garden();
    const hum = BED.sigIdle * VEIL.SIG_FACTOR;
    const dome = structure('the-dome');
    const bedMid = structure('bed-mid');
    const bedWest = structure('bed-west');
    const west = unit('throat-west');
    const ratio = (sig: number, pf: number, d: number, hyd: number) =>
      Number(detectionRatio(sig, pf, d, hyd).toFixed(2));
    const kelpMean = terrain.pathPropagation(dome.x, dome.y, bedMid.x, bedMid.y);
    assert.equal(ratio(hum, kelpMean, 450, DOME.hyd), 4.32, '§4: the middle bed at Track');
    assert.equal(ratio(hum, kelpMean, 625, DOME.hyd), 2.55, '§4: the outer pair at Classification');
    assert.equal(
      ratio(hum, terrain.pathPropagation(west.x, west.y, bedWest.x, bedWest.y), 1125, lent),
      2.54,
      '§4: the doorway has the outer pair at Classification, not at nothing'
    );
    assert.equal(
      ratio(hum, terrain.pathPropagation(west.x, west.y, bedMid.x, bedMid.y), 1300, lent),
      2.13,
      '§4: and the middle at Bearing'
    );
    const loudGun = GUN.sigIdle * VEIL.SIG_FACTOR;
    assert.equal(
      ratio(loudGun, 1.18, 1125, lent),
      3.55,
      '§4.3: a corvette that forgets, to the door'
    );
    assert.equal(ratio(loudGun, 0.55, 625, DOME.hyd), 3.57, '§4.3: and to the dome');
    // §7: the throat's middle is Track at ratio 7.1, its walls at 21.5.
    assert.equal(ratio(silentSig(TENDER.sigIdle), 1.6, 500, lent), 7.09);
    assert.equal(ratio(silentSig(TENDER.sigIdle), 1.6, 250, lent), 21.48);
    assert.deepEqual(tiers(silentSig(TENDER.sigIdle), 1.6, lent), [1700, 1320, 959, 715]);
  });
});

describe('the cohort, as §6 authors it', () => {
  it('lifts every cohort hull to the cap and stands the dome outside every cloud', () => {
    const dome = structure('the-dome');
    assert.equal(dome.kind, StructureKind.Cantor);
    assert.equal(dome.depthM, 2000, '§6: at the first furrow’s north edge, over a floor of 2,200');
    assert.equal(DOME.hyd, 80, '§6: its own ears stay at 80 — the roster loop grants units');
    assert.equal(dome.y - CANTOR.RADIUS_M, 550, '§6: the radius covers y 550–2,950');
    assert.equal(dome.y + CANTOR.RADIUS_M, 2950);
    for (const hull of COHORT.units) {
      assert.ok(
        between(hull, dome) <= CANTOR.RADIUS_M,
        `${hull.tag}: outside the dome’s 1,200 m, so it is not the 95 §7 prices`
      );
    }
  });

  it('walks the line cold, because an armed line would have every bed on the first pass', () => {
    // §6 and §13, and the arithmetic the beat table cannot show. `combat.ts`
    // auto-acquires the nearest live enemy inside weapon range in three
    // dimensions, heard or not, and a structure is a live enemy — so an armed
    // Chorister standing inside a cloud is a gun pointed at the bed hiding it.
    const line = COHORT.units.filter((u) => u.kind === UnitKind.Chorister);
    assert.equal(line.length, 8, '§6: eight Choristers');
    for (const hull of line) {
      assert.equal(hull.armed, undefined, '§6: weapons-cold, and the reason is a finding');
      assert.equal(hull.y, 2700, '§6: the sill, y 2,700');
      assert.equal(hull.depthM, 2400, '§6: at 2,400 m over the sill’s 2,600');
      assert.equal(hull.pressureRating, 3, '§13: the faction baseline, restated on the hull');
      assert.equal(hull.role, undefined, 'a role on a scripted hull is another party in a counter');
    }
    assert.equal(CHORISTER.pressureRating, 2, '§13: PR-2 on the roster, PR-3 in Directorate hands');
    assert.equal(requiredPressureRating(2400), 3, '§13: which is why the literal restates it');
    assert.deepEqual(
      line.map((hull) => hull.x),
      [1350, 1536, 1721, 1907, 2093, 2279, 2464, 2650],
      '§6: x 1,350 to 2,650 — eight seats across 1,300 m'
    );
    assert.equal(Math.round(1300 / 7), 186, '§6: "186 m spacing" is 1300 / 7');

    // The counterfactual, exactly as §6 states it: on the 04:30 leg the line
    // stands at 2,150 m over beds at 1,790 — a 360 m depth difference, and a
    // 450 m sphere leaves 270 m of horizontal reach.
    const rowLeg = MISSION_DEF.beats.filter(
      (beat) => beat.kind === 'move' && beat.atTick === T(4, 30)
    );
    assert.equal(rowLeg.length, 8, '§9: the 04:30 leg puts all eight on the row');
    const depthDelta = 2150 - 1790;
    assert.equal(depthDelta, 360);
    assert.equal(CHORISTER.attackRangeM, 450);
    assert.equal(horizontalReach(CHORISTER.attackRangeM, depthDelta), 270, '§6: 270 m of reach');
    const beds = PLAYER.structures ?? [];
    const gunsOn = beds.map(
      (bed) =>
        rowLeg.filter(
          (beat) => beat.kind === 'move' && Math.hypot(beat.x - bed.x, beat.y - bed.y) <= 270
        ).length
    );
    assert.deepEqual(gunsOn, [3, 2, 3], '§6: two guns cover the middle bed, three each outer');
    const slowest = Math.max(
      ...gunsOn.map(
        (guns) => BED.maxHp / (guns * (CHORISTER.attackDamage / CHORISTER.attackCooldownS))
      )
    );
    assert.equal(BED.maxHp, 900, '§3: 900 HP a bed');
    assert.equal(
      Math.round((CHORISTER.attackDamage / CHORISTER.attackCooldownS) * 10) / 10,
      13.3,
      '§6: 13.3 hull a second'
    );
    assert.equal(slowest, 33.75);
    // §6's "about 05:04": the last bed dies 33.75 s into a leg that begins at
    // 04:30. Bounded on both sides, so a leg moved to another tick or a bed
    // re-priced would have to fail here rather than pass a one-sided bound.
    const lastBedDownS = T(4, 30) / SIM.TICK_HZ + slowest;
    assert.ok(
      lastBedDownS >= 4 * 60 + 55 && lastBedDownS <= 5 * 60 + 10,
      `§6: every bed down at about 05:04, and this run says ${lastBedDownS}s`
    );
  });

  it('holds the doorway at the layer, and prices it by the gun rather than the ear', () => {
    const guns = COHORT.units.filter((u) => u.kind === UnitKind.AbyssalSubmersible);
    assert.equal(guns.length, 2, '§6: two, and every gun in the cohort is at the doorway');
    for (const gun of guns) {
      assert.equal(gun.armed, true, '§6: armed, and the only armed hulls on the map');
      assert.equal(gun.depthM, 1200, '§13: in the duct, not on the floor — a design call');
      assert.equal(gun.y, 1000);
    }
    assert.equal(guns[1]!.x - guns[0]!.x, 1000, '§11: 1,000 m apart across a cleft 1,500 wide');
    assert.equal(SUBMERSIBLE.attackRangeM, 650);
    // §6's four figures, each of them `engagementRangeM`'s three dimensions
    // against detection's two.
    assert.equal(Math.round(horizontalReach(650, 415.331)), 500);
    assert.deepEqual(
      [1200 - horizontalReach(650, 500), 1200 + horizontalReach(650, 500)].map(Math.round),
      [785, 1615],
      '§6: at the throat’s middle, depths 785–1,615'
    );
    assert.deepEqual(
      [1200 - horizontalReach(650, 250), 1200 + horizontalReach(650, 250)].map(Math.round),
      [600, 1800],
      '§6: at a wall, 600–1,800'
    );
    assert.equal(Math.round(horizontalReach(650, 1790 - 1200)), 273, '§6: 273 m across the throat');
    assert.equal(Math.round(horizontalReach(650, 900 - 1200)), 577, '§6: 577 against one at 900');
    assert.equal(
      Math.round(Math.hypot(500, 1790 - 1200)),
      773,
      '§6: down the middle at 1,790 is 773 m from either gun, and is not shot'
    );
    assert.ok(773 > SUBMERSIBLE.attackRangeM, '§6: two guns cannot close a doorway this wide');
  });

  it('fills the dead water at 12:00 and closes it from the floor up at 15:00', () => {
    const down = beatsAt(T(12)).filter((beat) => beat.kind === 'move');
    const up = beatsAt(T(15)).filter((beat) => beat.kind === 'move');
    assert.deepEqual(
      down.map((beat) => (beat.kind === 'move' ? [beat.tag, beat.x, beat.y, beat.depthM] : [])),
      [
        ['throat-west', 1500, 2000, 2100],
        ['throat-east', 2000, 2000, 2100],
      ],
      '§6: under the two beds that have gone dark'
    );
    assert.deepEqual(
      up.map((beat) => (beat.kind === 'move' ? [beat.tag, beat.x, beat.y, beat.depthM] : [])),
      [
        ['throat-west', 1500, 1000, 1200],
        ['throat-east', 2500, 1000, 1200],
      ],
      '§9: back to the duct'
    );
    // §6's arithmetic for the dive, the reach and the seven seconds.
    assert.equal((2100 - 1200) / DEPTH.DESCENT_RATE_MPS, 20, '§6: 900 m at 45 m/s, twenty seconds');
    assert.equal((2100 - 1200) / DEPTH.ASCENT_RATE_MPS, 60, '§6: a silent climb of sixty seconds');
    assert.equal(Math.round(horizontalReach(650, 2100 - 1790)), 571, '§6: 571 m across the row');
    assert.equal(
      Math.round(2000 + horizontalReach(horizontalReach(650, 2100 - 1790), 2125 - 2000)),
      2557,
      '§6: every metre of the furrows west of x ≈ 2,557 at the beds’ row'
    );
    assert.equal(2750 - 2557, 193, '§6: a strip some 200 m wide against the east wall');
    assert.equal(
      Math.ceil(TENDER.maxHp / SUBMERSIBLE.attackDamage) * SUBMERSIBLE.attackCooldownS,
      10.8,
      '§6: a tender at 300 hull against 80 every 2.7 s has eleven seconds'
    );
    // §9: a hull with a live move order holds its fire, so the guns in the
    // dead water fire from about 12:20 and the guns climbing back from 15:17.
    assert.equal(Math.round(1000 / SUBMERSIBLE.speed), 17, '§9: the climb’s move order, 15:17');
  });
});

describe('the Drift and the riser, as §6 places and drives them', () => {
  const creatures = MISSION_DEF.beats.filter((beat) => beat.kind === 'creature');

  it('is Deep Furrow’s water, in Deep Furrow’s places, placed and not driven', () => {
    const placed = creatures.filter((beat) => beat.kind === 'creature' && beat.atTick === 0);
    assert.equal(placed.length, 6, '§9: creature × 6 at 00:00');
    for (const beat of placed) {
      if (beat.kind !== 'creature') continue;
      assert.equal(beat.untilTick, 0, '§11: committed to its own spawn for no ticks at all');
      assert.equal(beat.loud, false);
      assert.deepEqual(beat.driveTo, { x: beat.spawnAt!.x, y: beat.spawnAt!.y });
      // The trap this pins: a placed creature holds its species' working
      // depth, so a spawn depth that disagreed with the roster would be
      // silently overruled the tick the commitment expires.
      assert.equal(
        beat.spawnAt!.depthM,
        faunaStatsFor(beat.species!).workingDepthM,
        `${beat.tag}: spawned off its own working depth`
      );
    }
    assert.deepEqual(
      placed.map((beat) =>
        beat.kind === 'creature' ? [beat.tag, beat.spawnAt!.x, beat.spawnAt!.y] : []
      ),
      [
        ['hollow-west', 1350, 1000],
        ['hollow-east', 2650, 1000],
        ['jelly-west', 1500, 900],
        ['jelly-mid', 2000, 700],
        ['jelly-east', 2500, 900],
        ['lanes-pack', 500, 250],
      ],
      '§6: the two Hollows on the walls, three clusters in the duct, the pack in the lanes'
    );
    // §6's Hollow arithmetic — the reason the middle of the road passes
    // nothing and a wall passes both figures.
    assert.equal(rangeAt(silentSig(TENDER.sigIdle), 1.6, HOLLOW.hyd, HOLLOW.commit), 107);
    assert.equal(rangeAt(silentSig(TENDER.sigIdle), 1.6, HOLLOW.hyd, HOLLOW.interest), 141);
    assert.equal(rangeAt(TENDER.sigIdle, 1.6, HOLLOW.hyd, HOLLOW.commit), 255);
    assert.equal(
      rangeAt(CHORISTER.sigCruise * VEIL.SIG_FACTOR, 1.6, HOLLOW.hyd, HOLLOW.commit),
      172
    );
    assert.equal(DRIFT.HOLLOW_TRIGGER_RANGE_M, 500, '§6: and it strikes only inside 500 m');
  });

  it('spawns the riser at the garden’s depth so that it clears the dome by 250 m', () => {
    // §6 and §13's finding, and the only place it can be checked: `fauna.ts`'s
    // transit reach is a body plus the target's radius, and a driven creature
    // climbs toward `driveTo.depthM` at 12 m/s from wherever it was spawned.
    const riser = creatures.find((beat) => beat.kind === 'creature' && beat.atTick === T(14, 30))!;
    assert.equal(riser.kind === 'creature' ? riser.species : undefined, FaunaSpecies.Sounder);
    assert.deepEqual(
      riser.kind === 'creature' ? riser.spawnAt : undefined,
      { x: 2000, y: 2900, depthM: 2200 },
      '§6: at the garden’s depth, not the sill floor’s 2,450'
    );
    assert.deepEqual(
      riser.kind === 'creature' ? riser.driveTo : undefined,
      { x: 2000, y: 900, depthM: 1750 },
      '§6: up the cleft’s centre, at an authored depth'
    );
    assert.equal(riser.kind === 'creature' ? riser.untilTick : 0, T(16));
    assert.equal(riser.kind === 'creature' ? riser.loud : false, true);

    const reach = SOUNDER.lengthM / 2 + DOME.radiusM;
    assert.equal(reach, 117.5, '§13: a body plus the dome’s radius');
    const dome = structure('the-dome');
    const climb = (fromY: number, toY: number) =>
      (Math.abs(fromY - toY) / SOUNDER.speed) * DRIFT.VERTICAL_SPEED_MPS;
    // Spawned at 2,200: it reaches its authored 1,750 m by y 1,775, so it is
    // level at the dome and clears it by 250.
    assert.equal(2900 - ((2200 - 1750) / DRIFT.VERTICAL_SPEED_MPS) * SOUNDER.speed, 1775);
    assert.equal(dome.depthM - 1750, 250, '§6: clears the dome by 250 m');
    // Spawned at the sill floor's 2,450, as the plan had it: 1,990 m at the
    // dome, inside 117.5 m of a structure with 1,200 HP.
    const wouldBe = 2450 - climb(2900, dome.y);
    assert.equal(Math.round(wouldBe), 1990, '§13: the plan’s spawn passes the dome at 1,990');
    assert.ok(
      Math.abs(dome.depthM - wouldBe) < reach,
      '§13: inside the reach, which is the finding'
    );
    assert.ok(DOME.maxHp / SOUNDER.damagePerS < 7.8, '§13: the kill takes 5.5 s and it has 7.8');

    // §6: it ignores every hull the plateaus own, and clears both guns.
    for (const kind of [UnitKind.Harvester, UnitKind.LightScout, UnitKind.Corvette]) {
      assert.ok(
        statsFor(kind).hullLengthM < DRIFT.TRANSIT_MIN_HULL_M,
        'transit grinds hulls of 95 m and up, and the plateaus’ largest is an 80 m corvette'
      );
    }
    assert.equal(SUBMERSIBLE.hullLengthM, DRIFT.TRANSIT_MIN_HULL_M, '§6: the guns are not ignored');
    const gunReach = SOUNDER.lengthM / 2 + SUBMERSIBLE.hullLengthM / 2;
    assert.equal(gunReach, 85, '§6: against a reach of 85');
    // 14:30–15:00 `throat-east` stands on the line at 2000, 2000 and is clear
    // by depth alone: the riser is at 1,840 m as it passes. Read off the two
    // beats rather than restated as constants — the clearance is the whole of
    // §6's claim that the riser ends nobody's beat, and it is a fact about
    // where this literal parks the gun, not about two numbers.
    const spawn = riser.kind === 'creature' ? riser.spawnAt! : { x: 0, y: 0, depthM: 0 };
    const dead = beatsAt(T(12)).find((beat) => beat.kind === 'move' && beat.tag === 'throat-east')!;
    const deadSeat = dead.kind === 'move' ? dead : { x: 0, y: 0, depthM: 0 };
    assert.deepEqual([deadSeat.x, deadSeat.y, deadSeat.depthM], [2000, 2000, 2100]);
    const atGun = spawn.depthM - climb(spawn.y, deadSeat.y);
    assert.equal(atGun, 1840, '§6: 1,840 m as it passes');
    assert.equal(deadSeat.depthM! - atGun, 260, '§6: 260 m above a gun at 2,100');
    assert.ok(deadSeat.depthM! - atGun > gunReach, '§6: and clear of it by depth alone');
    // From 15:00 both stand 500 m off its line, which is where the beats put
    // them: the riser runs up x 2,000 and the duct seats are 1,500 and 2,500.
    const back = beatsAt(T(15)).filter((beat) => beat.kind === 'move');
    for (const beat of back) {
      const off = Math.abs((beat.kind === 'move' ? beat.x : 0) - spawn.x);
      assert.equal(off, 500, '§6: 500 m off the riser’s line');
      assert.ok(off > gunReach);
    }
  });
});

describe('the objective, as §8 chooses it', () => {
  it('counts three tenders into the Foot, with one beneath it as the middle rung', () => {
    const terminal = MISSION_DEF.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => o.id),
      ['the-people', 'the-crossing'],
      '§8: two terminal rows, and a three-row Results table needs two'
    );
    assert.deepEqual(objective('the-people').predicate, {
      kind: 'extract',
      role: 'tender',
      region: 'the-foot',
      count: 3,
    });
    assert.deepEqual(objective('the-crossing').predicate, {
      kind: 'extract',
      role: 'tender',
      region: 'the-foot',
      count: 1,
    });
    for (const row of terminal) {
      assert.notEqual(row.keystone, true, '§8: terminal, not keystone');
      assert.equal(row.revealAtTick, undefined, '§8: revealed 00:00, so no late reveal is scored');
      assert.equal(row.markerId, 'the-foot', '§8: both name the same circle');
    }
  });

  it('is an extract nobody has met at tick zero, which is what makes the reveal honest', () => {
    // §13: "both terminal rows are extracts revealed at 00:00, which the
    // judge's rule permits because nobody is in the Foot at tick zero". A met
    // non-standing predicate never re-derives, so an extract whose hulls start
    // inside the region would latch Met on the first pass and — without
    // `runsItsLength` — close the mission on it.
    const foot = region('the-foot');
    for (const hull of PLAYER.units) {
      assert.equal(inRegion(foot, hull.x, hull.y), false, `${hull.tag} opens inside the Foot`);
    }
    assert.equal(MISSION_DEF.runsItsLength, true, '§8: the close is the tide');
    // And the tide is worth the flag on its own: §8's reason is Juno's three
    // read as alive and struck at 13:45 while they were still under a bed.
    const close = MISSION_DEF.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(close.atTick, T(16));
    assert.equal(
      close.kind === 'resolve' ? close.conclusion : true,
      undefined,
      '§9: not a conclusion'
    );
  });

  it('reads the letter as thirty cumulative seconds and the guns as a standing count', () => {
    const letter = objective('the-letter');
    assert.deepEqual(letter.predicate, {
      kind: 'tolerance',
      ticks: 30 * SIM.TICK_HZ,
      tier: ResolutionTier.Classification,
    });
    assert.notEqual(letter.terminal, true, '§8: non-terminal — being entered is not losing');
    const escorts = objective('the-escorts');
    assert.deepEqual(escorts.predicate, { kind: 'survive', role: 'escort', count: 3 });
    assert.notEqual(escorts.terminal, true, '§8: read at the close, never ranked');
    assert.equal(escorts.markerId, undefined, '§8: nothing points at Juno’s three');
    // §8: the met reading cannot say *came home*.
    assert.ok(
      !/home/.test(escorts.reading!.met),
      '§8: `survive` counts hulls alive wherever they are'
    );
    assert.match(escorts.reading!.unmet, /seventeen hundred and ninety metres/, '§12, verbatim');
    assert.match(letter.reading!.met, /^They had us at a name for half a minute/);
    assert.match(letter.reading!.unmet, /They walked two gardens and named nobody/);
    assert.match(objective('the-people').reading!.met, /^Three over the layer/);
    assert.equal(objective('the-crossing').reading, undefined, '§8: the middle rung reads nothing');
  });

  it('reads all three of Marr’s results, and the order of the first two things', () => {
    assert.match(
      MISSION_DEF.epilogue[MissionOutcome.Complete],
      /^Sixteen over the layer and the furrow's theirs/
    );
    assert.match(MISSION_DEF.epilogue[MissionOutcome.Complete], /the order of those two things/);
    assert.match(MISSION_DEF.epilogue[MissionOutcome.Partial], /^Some of them/);
    assert.match(MISSION_DEF.epilogue[MissionOutcome.Lost], /^Nobody came up/);
    // §8: no predicate asks where another party stands, so the furrow is lost
    // by authorship and Marr says so in the first sentence.
    for (const row of MISSION_DEF.objectives) {
      assert.notEqual(
        row.predicate.kind,
        'deliver',
        '§8: nothing accrues and nothing is counted but people'
      );
      assert.equal(
        row.predicate.kind === 'extract' ? row.predicate.loaded : undefined,
        undefined,
        '§8: no `loaded` flag'
      );
    }
    assert.equal(MISSION_DEF.lifts, undefined);
    assert.equal(MISSION_DEF.soundings, undefined);
    assert.equal(MISSION_DEF.walk, undefined);
    assert.equal(MISSION_DEF.sweep, undefined);
    assert.equal(MISSION_DEF.commanderAbility, undefined, '§13: Bloom Surge is not asked for');
    assert.equal(MISSION_DEF.startingNodules, undefined, '§3: no economy');
  });
});

describe('the schedule, as §9 lays it out', () => {
  it('is sixteen minutes, with the beds three minutes apart and a window of three', () => {
    const lost = MISSION_DEF.beats.filter((beat) => beat.kind === 'lose');
    assert.deepEqual(
      lost.map((beat) => [beat.tag, beat.atTick / SIM.TICK_HZ]),
      [
        ['bed-west', 9 * 60],
        ['bed-mid', 12 * 60],
        ['bed-east', 15 * 60],
      ],
      '§4.4: the west at 09:00, the middle at 12:00, the east at 15:00'
    );
    assert.equal((lost[1]!.atTick - lost[0]!.atTick) / SIM.TICK_HZ, 180);
    assert.equal((lost[2]!.atTick - lost[1]!.atTick) / SIM.TICK_HZ, 180);
    // §6: the doorway is held from 00:00 to 12:00 and from 15:00, and the
    // window between them is the only unentered exit.
    assert.equal((T(15) - T(12)) / SIM.TICK_HZ, 180, '§9: a window of three minutes');
    const close = MISSION_DEF.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal((close.atTick - T(15)) / SIM.TICK_HZ, 60, '§9: one minute for the tide to turn');
    const [low, high] = MISSION_DEF.lengthBandS;
    assert.ok(close.atTick / SIM.TICK_HZ >= low && close.atTick / SIM.TICK_HZ <= high);
  });

  it('pays campaign.md §10 out of the riser, at ninety seconds against sixty', () => {
    const loud = MISSION_DEF.beats.filter((beat) => beat.kind === 'creature' && beat.loud);
    assert.equal(loud.length, 1, '§9: one loud beat, and it is the riser');
    const close = MISSION_DEF.beats.find((beat) => beat.kind === 'resolve')!;
    const leadS = (close.atTick - loud[0]!.atTick) / SIM.TICK_HZ;
    assert.equal(leadS, 90, '§8: ninety seconds before the tide against §10’s sixty');
    assert.ok(leadS >= MISSION.FAILURE_TELEGRAPH_S);
  });

  it('walks the line on §9’s legs, and gives a depth only to the rise', () => {
    const legs = new Map<number, number[]>();
    for (const beat of MISSION_DEF.beats) {
      if (beat.kind !== 'move' || !beat.tag.startsWith('cohort-')) continue;
      const at = beat.atTick / SIM.TICK_HZ;
      if (!legs.has(at)) legs.set(at, []);
      legs.get(at)!.push(beat.y);
    }
    assert.deepEqual(
      [...legs].map(([at, ys]) => [at, ys.length, ys[0]]),
      [
        [120, 8, 2450],
        [180, 8, 2350],
        [270, 8, 2150],
        [360, 8, 1900],
        [450, 8, 2100],
        [540, 8, 2350],
        [630, 8, 2450],
        [810, 8, 2200],
      ],
      '§9: eight legs, eight hulls each, at the document’s own times and rows'
    );
    const withDepth = MISSION_DEF.beats.filter(
      (beat) => beat.kind === 'move' && beat.tag.startsWith('cohort-') && beat.depthM !== undefined
    );
    assert.equal(withDepth.length, 8, '§9: only the 02:00 rise carries a depth');
    assert.equal(withDepth[0]!.atTick, T(2));
    assert.equal(withDepth[0]!.kind === 'move' ? withDepth[0]!.depthM : 0, 2150);
    assert.equal(
      (2400 - 2150) / DEPTH.ASCENT_RATE_MPS,
      16.666666666666668,
      '§9: seventeen seconds'
    );
  });

  it('sends every hull to water the ground admits and its hull is rated for', () => {
    // `missions.test.ts` holds a mission's *seats* to the ground and the band.
    // Nothing holds its beats to either, and this mission is sixty-eight move
    // beats: the line walks eight legs at 2,150 m over a garden floored at
    // 2,200, and the doorway dives 900 m into that same garden and climbs
    // back. A leg authored ten metres deeper, or a hull sent over the walls,
    // would spawn fine and then simply stop — `resolveStep` refuses every step
    // out of ground that does not admit it — and the schedule would go quiet
    // with a green suite, which is the failure this whole file exists to
    // catch. Depth is carried forward per tag, because only the 02:00 rise
    // names one and every later leg inherits it.
    const terrain = garden();
    const depth = new Map<string, number>();
    const rating = new Map<string, number>();
    for (const party of MISSION_DEF.parties) {
      for (const hull of party.units) {
        depth.set(hull.tag, hull.depthM);
        rating.set(hull.tag, hull.pressureRating ?? statsFor(hull.kind).pressureRating);
      }
    }
    let checked = 0;
    for (const beat of MISSION_DEF.beats) {
      if (beat.kind !== 'move') continue;
      if (beat.depthM !== undefined) depth.set(beat.tag, beat.depthM);
      const at = depth.get(beat.tag)!;
      assert.ok(
        terrain.admits(beat.x, beat.y, at),
        `${beat.tag} is sent to ${beat.x},${beat.y} at ${at} m, over a floor of ` +
          `${terrain.floorAt(beat.x, beat.y)} m — it would arrive and stop`
      );
      assert.ok(
        rating.get(beat.tag)! >= requiredPressureRating(at),
        `${beat.tag} is sent to ${at} m, which needs PR ${requiredPressureRating(at)}, ` +
          `and is rated PR ${rating.get(beat.tag)}`
      );
      checked++;
    }
    assert.equal(checked, 8 * 8 + 4, '§9: eight legs of eight, and the doorway’s two pairs');
  });

  it('authors every hull silent at 00:00 and drops the line’s silence at 03:00', () => {
    const silences = MISSION_DEF.beats.filter(
      (beat): beat is MissionBeat & { kind: 'silent' } => beat.kind === 'silent'
    );
    const on = silences.filter((beat) => beat.active);
    const off = silences.filter((beat) => !beat.active);
    assert.equal(on.length, 16, '§9: eight of the player’s and eight of the line’s');
    for (const beat of on) assert.equal(beat.atTick, 0);
    assert.deepEqual(
      new Set(on.filter((beat) => !beat.tag.startsWith('cohort-')).map((beat) => beat.tag)),
      new Set(PLAYER.units.map((u) => u.tag)),
      '§3: every hull is authored silent at 00:00'
    );
    assert.equal(off.length, 8, '§9: the line drops silence at 03:00 and the player never does');
    for (const beat of off) {
      assert.equal(beat.atTick, T(3));
      assert.ok(beat.tag.startsWith('cohort-'));
    }
    // §3: silence costs the Commune the difference between 40 m/s and 32.
    assert.equal(TENDER.speed, 40);
    assert.equal(TENDER.speed * SILENT_RUNNING.PELAGIA_SPEED_MULTIPLIER, 32);
    assert.equal(
      MISSION_DEF.sigBudget,
      SILENT_RUNNING.SIG_MAX,
      '§4: a budget of 8, and 8 is the band'
    );
  });

  it('says §12’s lines at §9’s ticks, and hangs two on the player instead', () => {
    const said = MISSION_DEF.beats.filter((beat) => beat.kind === 'say');
    assert.deepEqual(
      said.map((beat) => beat.atTick / SIM.TICK_HZ),
      [0, 120, 240, 360, 540, 750, 900, 960, 960],
      '§9: 00:00, 02:00, 04:00, 06:00, 09:00, 12:30, 15:00 and the tide’s two'
    );
    assert.match(
      said[1]!.kind === 'say' ? said[1]!.text : '',
      /corrected as a mooring was corrected in closed water/,
      '§12: the law, stated once at 02:00'
    );
    assert.match(said[2]!.kind === 'say' ? said[2]!.text : '', /^I brought the guns down/);
    assert.equal(
      said[2]!.kind === 'say' ? said[2]!.speaker : '',
      'Warden Juno Teel, under the eastern bed'
    );
    assert.match(
      said[7]!.kind === 'say' ? said[7]!.text : '',
      /^We keep nothing/,
      '§12: Marr, at the tide'
    );
    assert.match(
      said[8]!.kind === 'say' ? said[8]!.text : '',
      /^I'll ask tonight/,
      '§12: Anholt, after the count'
    );

    // §9's two conditional beats, and *the-escorts* firing nothing.
    const conditional = MISSION_DEF.conditionalBeats ?? [];
    assert.equal(conditional.length, 2);
    assert.deepEqual(conditional[0]!.when, {
      kind: 'tolerance',
      ticks: 30 * SIM.TICK_HZ,
      tier: ResolutionTier.Classification,
    });
    assert.equal(
      conditional[0]!.kind === 'say' ? conditional[0]!.text : '',
      'Entered: a hull, and a count.'
    );
    assert.deepEqual(conditional[1]!.when, {
      kind: 'extract',
      role: 'tender',
      region: 'the-foot',
      count: 1,
    });
    for (const beat of conditional) {
      assert.equal(beat.kind, 'say');
      assert.equal(beat.choiceGroup, undefined, '§9: in no order, and neither retires the other');
      assert.notEqual(beat.when.kind, 'survive', '§9: the-escorts fires nothing — it is standing');
    }
  });
});

describe('what the force does not carry, as §3 withholds it', () => {
  it('strikes six affordances with the reason in register and keeps the ping', () => {
    const locked = MISSION_DEF.locks.map((lock) => lock.ability);
    assert.deepEqual(locked, [
      'weapons',
      'torpedoes',
      'mines',
      'depthCharges',
      'noisemakers',
      'construction',
    ]);
    assert.ok(!locked.includes('activeSonar'), '§3: available, and a button with exactly one use');
    for (const lock of MISSION_DEF.locks) assert.ok(lock.reason.trim().length > 0);
    assert.match(MISSION_DEF.locks[0]!.reason, /nothing is struck under a bed/, '§3: the reason');
    // §3: what the ping does is tell the dome which bed the pinger is under —
    // 38 through kelp is Bearing to the dome-lent 95 out to 2,568 m, which
    // reaches every ear on a map 4,000 m wide.
    assert.deepEqual(
      tiers(95 * VEIL.SIG_FACTOR, PROPAGATION_FACTOR[Biome.KelpForest], 95),
      [3309, 2568, 1866, 1391]
    );
  });

  it('runs no ledger, holds no freight and lends no array', () => {
    assert.equal(MISSION_DEF.arrayTag, undefined, '§9: no silence order — the ledger does not run');
    assert.equal(MISSION_DEF.silenceCeilingSig, 100);
    assert.equal(MISSION_DEF.debtCapS, 0);
    assert.equal(MISSION_DEF.silenceRole, undefined);
    assert.equal(MISSION_DEF.escortRadiusM, 0, '§9: here nobody waits for a gun');
    assert.notEqual(MISSION_DEF.playerSlot, MISSION_DEF.courtSlot);
    assert.ok(MISSION_DEF.parties.every((party) => party.slot !== MISSION_DEF.courtSlot));
  });

  it('carries §12’s briefing, letter and all, and quotes it without answering it', () => {
    const briefing = MISSION_DEF.briefing!;
    assert.equal(briefing.length, 5, '§12: five paragraphs');
    assert.match(briefing[0]!, /^We're not going to tell you what to do down there/);
    assert.match(
      briefing[1]!,
      /What was proved at twenty-two hundred metres in the year 204 has been heard/,
      '§12: the Undermarshalcy’s own register, quoted inside the Commune’s'
    );
    assert.match(briefing[1]!, /That's the only answer we ever gave it/, '§12: and not answered');
    assert.match(briefing[3]!, /We'd like sixteen over the layer/);
    assert.match(briefing[4]!, /Nothing is struck under a bed/);
    assert.equal(MISSION_DEF.doc, 'docs/mission-in-writing.md');
    assert.equal(MISSION_DEF.id, 'seeding-in-writing');
    assert.equal(MISSION_DEF.ordinal, 5);
    assert.equal(MISSION_DEF.campaign, 'seeding');
  });
});
