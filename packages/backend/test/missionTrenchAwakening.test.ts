/**
 * The Attending 5, read — docs/mission-trench-awakening.md.
 *
 * `missions.test.ts` holds every mission to campaign.md §10's conventions; this
 * file holds Trench Awakening to the things only its own document claims, and
 * to the arithmetic those claims stand on:
 *
 * - **The place is not the band** (§11). `shallow-band` is the Directorate's
 *   name for the First Trench at 1,800 m, which is the *first metre of the
 *   Abyssal*, and the shallowest metre this mission authors is a grown hull's
 *   600 m. Nothing here is Shelf water and mission 4's shallow-water penalty
 *   never fires.
 * - **The floor plan is the pay slip** (§3). The plant, the dome and the grower
 *   stand in three different Drift ledger cells, and §3's four rows are the
 *   shipped ledger's own arithmetic over the seats in §11 — summed SIG, wear
 *   per second, and the second each cell goes Strained and Dead.
 * - **The ladder read as an economy** (§4). Both aggro tables, exact against
 *   the shipped propagation model, the Directorate's ×0.4 and the ping's ×3 —
 *   including the one posture the row can never be heard in at all.
 * - **The two calls, as the runtime will actually run them** (§5, §6, §9, §13).
 *   A driven creature parks forty metres short of where it is sent and grinds
 *   only while it is moving, so the geometry is checked the way `act` and
 *   `transit` will resolve it: the line, the swept metres inside the Foundry's
 *   reach, the second each thing happens on, and the ledger cell each colossus
 *   dies in.
 * - **The band is one colossus** (§8, §12). Six Hollows are 210 against a band
 *   of 260, so *the called thing, rendered* is arithmetic rather than fiat.
 * - **The summons is an approximation, and the file says so** (§13). Trench
 *   Awakening the ability is not built; two `creature` beats and the player's
 *   own ping stand in its place, and this file pins the shape of the thing that
 *   is missing so nobody mistakes the stand-in for the real one.
 *
 * Almost nothing here steps a match: everything this mission claims is either an
 * authoring failure or a piece of arithmetic against the roster, and both are
 * visible by reading the table with the engine's own rules applied to it. The
 * last suite is the exception and earns it — §4's third movement is a claim
 * about what happens to a row that gives no orders at all, and the only honest
 * way to check that is to give none and run the tide out.
 *
 * **Where a figure in the document and a figure the engine produces disagree,
 * the assertion holds the engine and the message names the document's number
 * and why it differs.** §5, §9 and §13 measure the two transits from the point
 * each beat *names*; `act` parks a targetless driven creature forty metres
 * short of it, so the line, the perpendicular and the two tilde-marked seconds
 * all land a little off the prose. Every such row is called out where it is
 * asserted rather than absorbed silently.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_SONAR,
  ATTENDING_TRENCH_AWAKENING_HEADER,
  Biome,
  CONSTRUCTION,
  DEPTH,
  DEPTH_BANDS,
  DRIFT,
  DepthBand,
  Faction,
  FaunaSpecies,
  MISSION,
  MissionOutcome,
  ORDNANCE,
  ObjectiveStatus,
  PROPAGATION_FACTOR,
  SILENT_RUNNING,
  SIM,
  STRUCTURE_AURAS,
  StructureKind,
  THERMAL_DRAW,
  THERMOCLINE,
  THERMOCLINE_DUCT_TOP_M,
  TIER_THRESHOLD_MULTIPLIER,
  UnitKind,
  detectionRatio,
  faunaStatsFor,
  missionHeaderById,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { SHALLOW_BAND, mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { ATTENDING_TRENCH_AWAKENING } from '../src/sim/missions/trenchAwakening.ts';

const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = ATTENDING_TRENCH_AWAKENING.playerSlot;
const player = ATTENDING_TRENCH_AWAKENING.parties.find((party) => party.slot === PLAYER)!;
const stalls = ATTENDING_TRENCH_AWAKENING.parties.find((party) => party.slot !== PLAYER)!;
const byTag = (tag: string) =>
  [...player.units, ...(player.structures ?? [])].find((thing) => thing.tag === tag)!;
const objective = (id: string) => ATTENDING_TRENCH_AWAKENING.objectives.find((o) => o.id === id)!;
const creatures = ATTENDING_TRENCH_AWAKENING.beats.flatMap((beat) =>
  beat.kind === 'creature' ? [beat] : []
);

const HOLLOW = faunaStatsFor(FaunaSpecies.Hollow);
const SOUNDER = faunaStatsFor(FaunaSpecies.Sounder);
const CHORISTER = statsFor(UnitKind.Chorister);
const SUBMERSIBLE = statsFor(UnitKind.AbyssalSubmersible);
const FOUNDRY = structureStatsFor(StructureKind.Foundry);
const BASTION = structureStatsFor(StructureKind.Bastion);
const TRENCH_PF = PROPAGATION_FACTOR[Biome.AbyssalTrench];
const WORKED_PF = PROPAGATION_FACTOR[Biome.CoralRuins];

/** §11 — the points the two colossi are authored between, and the yard. */
const SILL = { x: 2500, y: 3875 };
const AXIS_HEAD = { x: 2500, y: 2000 };
const THROUGH_THE_YARD = { x: 2750, y: 800 };
const SECOND_HOLD = { x: 2500, y: 1750 };
const GROWER = { x: 2750, y: 1000 };

/**
 * The range at which SIG through water of a given PF reaches HYD at a multiple
 * of its threshold — §7's tier ranges, and §4's when the multiple is an aggro
 * figure rather than a tier.
 */
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

/**
 * §4's tables, restated from the prose rather than from `listen`: fauna commit
 * to the loudest thing they hear, the reading is the detection ratio, and the
 * Directorate is heard at ×0.4. A ping multiplies the same reading by three
 * (docs/bestiary.md §2), so it is a factor on the emission rather than a rule
 * of its own — which is exactly why §13 can use it as half a summons.
 */
function aggroRange(sig: number, hyd: number, threshold: number, pinging = false): number {
  const gain =
    DRIFT.DIRECTORATE_AGGRO_MULTIPLIER * (pinging ? ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER : 1);
  return rangeAt(sig, hyd, TRENCH_PF, threshold / gain);
}

/**
 * Where a driven creature actually parks — `act`'s `stopAtM`, which for a
 * commitment is the default forty metres because the runtime clears the
 * creature's target (§13). Every time and every coordinate in §5, §6 and §9
 * falls out of this rather than out of the point the beat names.
 */
const STOP_AT_M = 40;
function park(
  from: { x: number; y: number },
  to: { x: number; y: number }
): { x: number; y: number; travelM: number } {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const t = (length - STOP_AT_M) / length;
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    travelM: length - STOP_AT_M,
  };
}

/** Perpendicular distance from a point to the segment a transit sweeps. */
function offTheLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
  point: { x: number; y: number }
): number {
  const sx = to.x - from.x;
  const sy = to.y - from.y;
  const len2 = sx * sx + sy * sy;
  const px = point.x - from.x;
  const py = point.y - from.y;
  const t = Math.max(0, Math.min(1, (px * sx + py * sy) / len2));
  return Math.hypot(px - sx * t, py - sy * t);
}

/** How far along a segment a point's closest approach lies, in metres. */
function alongTheLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
  point: { x: number; y: number }
): number {
  const sx = to.x - from.x;
  const sy = to.y - from.y;
  return ((point.x - from.x) * sx + (point.y - from.y) * sy) / Math.hypot(sx, sy);
}

/** The Drift ledger cell a coordinate falls in — `DriftHealth.index`, restated. */
function cellOf(x: number, y: number): string {
  const cx = Math.floor((x / SHALLOW_BAND.widthM) * DRIFT.HEALTH_REGIONS);
  const cy = Math.floor((y / SHALLOW_BAND.heightM) * DRIFT.HEALTH_REGIONS);
  return `${cx},${cy}`;
}

describe('the Shallow Band, as docs/mission-trench-awakening.md §11 paints it', () => {
  it('transcribes §11 row for row, on the cell grid, in the table order', () => {
    // Painting order is load-bearing (`terrainFor` writes later regions over
    // earlier ones): §11 paints the trench first and cuts everything else into
    // it, and the Sill repaints the axis with the axis's own numbers so the
    // door has a name.
    assert.deepEqual(
      SHALLOW_BAND.regions.map((region) => [
        region.x,
        region.y,
        region.widthM,
        region.heightM,
        region.biome,
        region.floorM,
      ]),
      [
        [0, 0, 5000, 4000, Biome.AbyssalTrench, 2400],
        [0, 0, 5000, 750, Biome.CoralRuins, 1750],
        [750, 750, 3000, 500, Biome.CoralRuins, 1850],
        [3750, 750, 1000, 500, Biome.CoralRuins, 1900],
        [0, 1250, 1250, 1500, Biome.AbyssalTrench, 2150],
        [3750, 1250, 1250, 1500, Biome.AbyssalTrench, 2150],
        [1250, 1250, 2500, 2750, Biome.AbyssalTrench, 2400],
        [2000, 3750, 1000, 250, Biome.AbyssalTrench, 2400],
      ]
    );
    for (const region of SHALLOW_BAND.regions) {
      for (const metres of [region.x, region.y, region.widthM, region.heightM]) {
        assert.equal(metres % SHALLOW_BAND.cellM, 0, `${region.note}: off the 250 m cell grid`);
      }
    }
    assert.equal(SHALLOW_BAND.floorM, 2400, '§11: base floor 2,400');
    assert.deepEqual(SHALLOW_BAND.resources, [], '§11: no resources — the band renders');
    assert.deepEqual(SHALLOW_BAND.hazards, [], '§11: no hazard sites');
    assert.equal(TRENCH_PF, 1.6, '§1: the trench carries, and there is nothing but distance');
    assert.equal(WORKED_PF, 0.8, "§11: the worked ground is the chart's only shadow");
  });

  it('is a place name and not a band, so the shallow-water penalty never fires', () => {
    // §11, §10: "the Directorate's *shallow* is 1,800 m and the Rift's is 340".
    // 1,800 is the first metre of the Abyssal band, and the shallowest metre
    // this mission *authors* is a grown hull's 600 m, which is Mid-Water.
    assert.equal(DEPTH_BANDS[DepthBand.Abyssal].min, 1800, '§1: the first metre of the Abyssal');
    assert.equal(requiredPressureRating(1800), 3, '§11: PR-3 required where the row stands');
    const shallowest = Math.min(...SHALLOW_BAND.regions.map((region) => region.floorM ?? 0));
    assert.equal(shallowest, 1750, '§11: the worked rim is the shallowest ground on the chart');
    assert.ok(
      shallowest > DEPTH_BANDS[DepthBand.Shelf].max,
      "§10: no floor on this map is Shelf water, so mission 4's penalty is untouched"
    );
    assert.equal(
      CONSTRUCTION.WORKING_DEPTH_M,
      600,
      '§6, §13: what the yard delivers at, and what a raised site would sit at'
    );
    assert.ok(
      requiredPressureRating(CONSTRUCTION.WORKING_DEPTH_M) <= CHORISTER.pressureRating,
      '§6: a grown Chorister is rated for the 600 m it is born at without the refit'
    );
  });

  it('is a mission map and is not in the public catalogue', () => {
    assert.equal(SHALLOW_BAND.seats, 1, '§11: one seat, no resources, not balanced');
    assert.equal(mapById('shallow-band'), undefined, 'the skirmish screen would offer it');
    assert.equal(missionMapById('shallow-band'), SHALLOW_BAND, 'resolved by mission id only');
  });

  it('admits every hull, structure, emitter and transit the mission seats', () => {
    // The quietest class of authoring bug there is: a hull in rock spawns and
    // then cannot move, and a colossus spawned into ground the terrain refuses
    // never arrives. Checked against this map rather than only in
    // `missions.test.ts`, because §11's table is the thing being transcribed.
    const terrain = terrainFor(SHALLOW_BAND);
    for (const thing of [
      ...player.units,
      ...(player.structures ?? []),
      ...(stalls.emitters ?? []),
    ]) {
      assert.ok(
        terrain.admits(thing.x, thing.y, thing.depthM),
        `${thing.tag} at ${thing.depthM} m over a floor of ${terrain.floorAt(thing.x, thing.y)}`
      );
    }
    for (const beat of creatures) {
      if (beat.spawnAt !== undefined) {
        assert.ok(
          terrain.admits(beat.spawnAt.x, beat.spawnAt.y, beat.spawnAt.depthM),
          `${beat.tag} is spawned into ground that does not admit it`
        );
      }
      if (beat.driveTo.depthM !== undefined) {
        assert.ok(
          terrain.admits(beat.driveTo.x, beat.driveTo.y, beat.driveTo.depthM),
          `${beat.tag} is driven to water the ground refuses`
        );
      }
    }
    // §6 — the apron a grown hull is delivered onto, which is
    // `productionSystem`'s own arithmetic off the grower's footprint biased
    // toward the map centre, and the 600 m `spawnUnit` then seats it at.
    const dx = SHALLOW_BAND.widthM / 2 - GROWER.x;
    const dy = SHALLOW_BAND.heightM / 2 - GROWER.y;
    const length = Math.hypot(dx, dy);
    const apron = {
      x: GROWER.x + (dx / length) * (FOUNDRY.radiusM + 60),
      y: GROWER.y + (dy / length) * (FOUNDRY.radiusM + 60),
    };
    assert.equal(Number(apron.x.toFixed(1)), 2696.6, '§6: the apron, to the metre §6 quotes');
    assert.equal(Number(apron.y.toFixed(1)), 1213.4);
    assert.ok(terrain.admits(apron.x, apron.y, CONSTRUCTION.WORKING_DEPTH_M));
  });
});

describe('the row, as docs/mission-trench-awakening.md §2 and §5 muster it', () => {
  it('is two Abyssal Submersibles and six Choristers, one role, all armed', () => {
    assert.equal(player.units.length, 8, '§5: eight hulls and a yard');
    const heavies = player.units.filter((unit) => unit.kind === UnitKind.AbyssalSubmersible);
    const cohort = player.units.filter((unit) => unit.kind === UnitKind.Chorister);
    assert.equal(heavies.length, 2, "§2: the band's own two heavy hulls");
    assert.equal(cohort.length, 6, '§2: the cohort hull, for the third mission running');
    for (const unit of player.units) {
      assert.equal(unit.role, 'yard', '§2: one role, and the muster counts it');
      assert.equal(unit.armed, true, '§2: weapons, torpedoes and noisemakers are live');
      assert.equal(unit.depthM, 1800, '§11: the row stands at 1,800 m');
    }
    // §2, §13 — the refit is written down rather than derived. The Directorate
    // baseline lifts a Chorister's PR-2 to 3 for free, but `missions.test.ts`
    // reads the hull's own rating, so an unwritten refit is a hull the suite
    // reads as dying of crush where it stands.
    assert.equal(CHORISTER.pressureRating, 2, '§2: PR-2 on the hull');
    for (const unit of cohort) assert.equal(unit.pressureRating, 3, '§2: refit to 3, explicitly');
    for (const unit of heavies) {
      assert.equal(unit.pressureRating, undefined, "§2: PR-3 is the Submersible's own");
      assert.equal(SUBMERSIBLE.pressureRating, requiredPressureRating(unit.depthM));
    }
  });

  it('is the only navy in the water, and keeps no ledger', () => {
    assert.equal(ATTENDING_TRENCH_AWAKENING.playerFaction, Faction.Directorate);
    assert.equal(stalls.faction, Faction.Directorate, '§5: the stalls are Directorate too');
    assert.equal(stalls.units.length, 0, '§5: a sound and nothing else — not a party');
    assert.equal(ATTENDING_TRENCH_AWAKENING.parties.length, 2, "§2: nobody else's navy is here");
    assert.ok(
      ATTENDING_TRENCH_AWAKENING.parties.every(
        (party) => party.slot !== ATTENDING_TRENCH_AWAKENING.courtSlot
      ),
      '§5: slot 1 is reserved and empty, as every literal reserves it'
    );
    // §2 — no silence order, for Intake's reason: this is the mission where the
    // Directorate is strong and is charged for it by the ground.
    assert.equal(ATTENDING_TRENCH_AWAKENING.arrayTag, undefined, '§2: no ledger, no array');
    assert.equal(ATTENDING_TRENCH_AWAKENING.silenceCeilingSig, 100);
    assert.equal(ATTENDING_TRENCH_AWAKENING.debtCapS, 0);
    assert.equal(ATTENDING_TRENCH_AWAKENING.escortRadiusM, 0, '§2: no held freight');
    assert.equal(ATTENDING_TRENCH_AWAKENING.fauna, false, '§11: all eight animals are authored');
    assert.equal(
      ATTENDING_TRENCH_AWAKENING.sigBudget,
      FOUNDRY.sigActive,
      "§4: fifty-five is the grower's own producing figure, the loudest thing the row owns"
    );
    assert.equal(ATTENDING_TRENCH_AWAKENING.startingNodules, 600, "§5, §11: the yard's own stock");
  });

  it('withholds the ordnance a row cannot afford and withholds nothing else', () => {
    // §2 — mines and depth charges keep working after the hull that laid them
    // has gone home, and a row whose income walks onto its own ground is the
    // one navy that cannot afford that.
    const locked = new Set(ATTENDING_TRENCH_AWAKENING.locks.map((lock) => lock.ability));
    assert.deepEqual([...locked].sort(), ['depthCharges', 'mines']);
    for (const lock of ATTENDING_TRENCH_AWAKENING.locks) {
      assert.ok(lock.reason.trim().length > 0, `${lock.ability} is refused without a reason`);
    }
    // The two absences that are the mission. The ping is aboard because
    // mission 3 handed it over and this is where the bill arrives (§2), and
    // construction is open for one engine reason only: `Match.produce` is
    // refused by the same lock as `Match.build` (§2, §10, §13).
    assert.ok(!locked.has('activeSonar'), '§2: aboard, live, and unlocked');
    assert.ok(!locked.has('construction'), '§2: production needs it');
    assert.ok(!locked.has('weapons') && !locked.has('torpedoes') && !locked.has('noisemakers'));
  });

  it('stands the plant, the dome and the grower prebuilt, and pays for the line', () => {
    // §3, §10 — the row raises none of the three: the only economic verb the
    // mission asks for is a production queue, which is what keeps one system
    // one system in the one Attending mission that has an economy.
    assert.deepEqual(
      (player.structures ?? []).map((s) => [s.tag, s.kind, s.x, s.y, s.depthM]),
      [
        ['draw-plant', StructureKind.Bastion, 1000, 1000, 1800],
        ['dome', StructureKind.Cantor, 1500, 1000, 1800],
        ['grower', StructureKind.Foundry, 2750, 1000, 1800],
      ]
    );
    // §3 — "the difference between a ten-second hull and a forty-second one".
    // Six of capacity against a demand of four is satisfaction 1.0 from tick
    // zero, and the floor a row without a plant would run at is 0.25.
    assert.equal(BASTION.drawCapacity, 6, "§3: the band's own plant");
    assert.equal(FOUNDRY.drawDemand, 4, "§3: against the grower's demand of four");
    assert.ok((BASTION.drawCapacity ?? 0) >= (FOUNDRY.drawDemand ?? 0), '§3: satisfaction 1.0');
    assert.equal(THERMAL_DRAW.MIN_SATISFACTION, 0.25, '§3: what a starved line runs at');
    assert.equal(CHORISTER.buildTimeS, 10, '§3: ten seconds');
    assert.equal(CHORISTER.buildTimeS / THERMAL_DRAW.MIN_SATISFACTION, 40, '§3: or forty');
    assert.equal(CHORISTER.cost, 30, '§3: thirty nodules');
    assert.equal(CHORISTER.biomassCost, 20, '§3: and twenty Biomass');
  });

  it('covers six of the eight with the dome, and says nothing about the other two', () => {
    // §3 — "It is not a fence — the row can walk into it — which is the whole
    // of what a dome standing where a dome stands is worth."
    const dome = byTag('dome');
    const inside = player.units.filter(
      (unit) => Math.hypot(unit.x - dome.x, unit.y - dome.y) <= STRUCTURE_AURAS.CANTOR.RADIUS_M
    );
    assert.equal(inside.length, 6, '§3: the dome covers six of the eight');
    const from = (tag: string) =>
      Math.round(Math.hypot(byTag(tag).x - dome.x, byTag(tag).y - dome.y));
    assert.equal(from('row-one'), 510, '§3: `row-one` at 510 m');
    assert.equal(from('row-eight'), 1301, '§3: the easternmost Chorister, outside it');
    assert.equal(from('row-two'), 1703, '§3: `row-two`, outside it');
    // §3 — "HYD 75 to 95 is sixteen per cent more range on a Chorister and
    // nothing at all on a hull east of the grower."
    const bare = rangeAt(HOLLOW.sigActive, CHORISTER.hyd, TRENCH_PF, 1);
    const domed = rangeAt(
      HOLLOW.sigActive,
      Math.min(CHORISTER.hyd + STRUCTURE_AURAS.CANTOR.HYD_BONUS, STRUCTURE_AURAS.CANTOR.HYD_CAP),
      TRENCH_PF,
      1
    );
    assert.equal(Math.round((domed / bare - 1) * 100), 16, '§3: sixteen per cent');
  });

  it('sounds the stalls, which cannot be attended and cannot count', () => {
    // §5 — "carrying **no reading**, so it cannot be attended and cannot
    // count". The eight per cent are here because they are, and nobody
    // remarks on it.
    const emitter = (stalls.emitters ?? [])[0]!;
    assert.equal((stalls.emitters ?? []).length, 1, '§5: one emitter');
    assert.equal(emitter.sig, 12);
    assert.equal(emitter.periodTicks, T(1), '§7: thirty on and thirty off');
    assert.equal(emitter.onTicks, T(0, 30));
    assert.equal(emitter.hp, 5000);
    assert.equal(emitter.reading, undefined, '§5: no reading — it cannot be attended');
    assert.equal(emitter.fromTick, undefined, '§5: sustained, all tide');
    assert.equal(emitter.untilTick, undefined);
    assert.ok(
      !ATTENDING_TRENCH_AWAKENING.objectives.some((o) => o.predicate.kind === 'attend'),
      '§5: nothing counts it'
    );
    // §7 — "Classification from `row-two` at 1,055 m", through the worked
    // ground both of them stand under. In trench water a SIG-12 emitter would
    // be Classification from 1,651 m; the yard's own shadow is what makes the
    // stalls a sound at the edge of being a sound.
    const rowTwo = byTag('row-two');
    const range = Math.hypot(emitter.x - rowTwo.x, emitter.y - rowTwo.y);
    assert.equal(Math.round(range), 1055, '§7: 1,055 m');
    const classification = rangeAt(
      emitter.sig,
      SUBMERSIBLE.hyd,
      WORKED_PF,
      TIER_THRESHOLD_MULTIPLIER.CLASSIFICATION
    );
    assert.equal(classification, 1071, '§7: and Classification reaches 1,071 m through it');
    assert.ok(range <= classification, '§7: sixteen metres of margin, and the doc is right');
  });
});

describe("the ground's pay slip, as docs/mission-trench-awakening.md §3 keeps it", () => {
  /** Summed own-SIG per Drift ledger cell, at rest and with the line running. */
  function sigByCell(producing: boolean): Map<string, number> {
    const total = new Map<string, number>();
    const add = (x: number, y: number, sig: number) =>
      total.set(cellOf(x, y), (total.get(cellOf(x, y)) ?? 0) + sig);
    for (const unit of player.units) add(unit.x, unit.y, statsFor(unit.kind).sigIdle);
    for (const structure of player.structures ?? []) {
      const stats = structureStatsFor(structure.kind);
      const loud = producing && structure.kind === StructureKind.Foundry;
      add(structure.x, structure.y, loud ? stats.sigActive : stats.sigIdle);
    }
    for (const emitter of stalls.emitters ?? []) add(emitter.x, emitter.y, emitter.sig);
    return total;
  }

  it('stands the three structures in three different cells', () => {
    // §3, §11 — "the yard's floor plan is its own pay slip", and the
    // coordinates in the map literal are what decide it. None of it is
    // authored anywhere else; the ledger's own arithmetic does the rest.
    const cells = (player.structures ?? []).map((s) => cellOf(s.x, s.y));
    assert.equal(new Set(cells).size, 3, '§3: three structures, three cells');
    assert.equal(DRIFT.HEALTH_REGIONS, 4, '§3: a 4 × 4 grid');
    assert.equal(SHALLOW_BAND.widthM / DRIFT.HEALTH_REGIONS, 1250, '§3: 1,250 × 1,000 m cells');
    assert.equal(SHALLOW_BAND.heightM / DRIFT.HEALTH_REGIONS, 1000);
  });

  it("reads §3's four rows off the shipped ledger, and none of it is authored", () => {
    const idle = sigByCell(false);
    const producing = sigByCell(true);
    // The four rows in §3's order: the plant's cell, the dome's, the grower's
    // and the stalls'. Every y is between 1,000 and 1,250, so all four are one
    // row of the grid and the table names them by x alone.
    assert.equal(idle.get('0,1'), 35, '§3: x 0–1,250 — the plant');
    assert.equal(idle.get('1,1'), 105, '§3: x 1,250–2,500 — the dome, row-one, three Choristers');
    assert.equal(idle.get('2,1'), 95, '§3: x 2,500–3,750 — the grower idle, row-two, three more');
    assert.equal(producing.get('2,1'), 125, '§3: and 125 the moment a hull is queued');
    assert.equal(idle.get('3,1'), 12, "§3: x 3,750–5,000 — the stalls' berths");

    const wear = (sig: number) =>
      Math.max(0, sig - DRIFT.HEALTH_SIG_THRESHOLD) * DRIFT.HEALTH_SIG_DRAIN_PER_S;
    assert.equal(wear(35), 0, '§3: under the threshold — it recovers all tide');
    assert.equal(wear(12), 0);
    assert.equal(Number(wear(105).toFixed(2)), 0.9, '§3: wears at 0.90/s');
    assert.equal(Number(wear(95).toFixed(2)), 0.7, '§3: 0.70/s idle');
    assert.equal(Number(wear(125).toFixed(2)), 1.3, '§3: and 1.30/s producing');
    const strainedAt = (sig: number) => (DRIFT.HEALTH_START - DRIFT.HEALTH_STRAINED) / wear(sig);
    const deadAt = (sig: number) => DRIFT.HEALTH_START / wear(sig);
    assert.equal(Math.round(strainedAt(105)), 14, '§3: Strained at 00:14');
    assert.equal(Math.round(deadAt(105)), 98, '§3: Dead at 01:38');
    assert.equal(Math.round(strainedAt(125)), 10, '§3: Strained at 00:10');
    assert.equal(Math.round(deadAt(125)), 68, '§3: Dead at 01:08');
    assert.equal(DRIFT.HEALTH_START, 88);
    assert.equal(DRIFT.HEALTH_SIG_THRESHOLD, 60);
  });

  it('prices a rendering by the cell it happened in, and no predicate reads it', () => {
    // §3, §4 — the mission makes a pay slip of the ledger rather than an
    // objective, which is the whole of its fourth movement.
    assert.equal(HOLLOW.biomass * 0.75, 26.25, '§3: 26.25 over Strained ground');
    assert.equal(HOLLOW.biomass * 0.25, 8.75, '§3: 8.75 over Collapsing');
    assert.equal(SOUNDER.biomass * 0.75, 195, '§3: a colossus pays 195');
    assert.equal(SOUNDER.biomass * 0.25, 65, '§3: or 65');
    assert.equal(DRIFT.HEALTH_STRAINED, 75);
    assert.equal(DRIFT.HEALTH_COLLAPSING, 25);
  });
});

describe('the ladder read as an economy — docs/mission-trench-awakening.md §4', () => {
  it("reads §4.1's six rows exactly, at the Directorate's ×0.4", () => {
    // Against a Hollow's HYD 80 and its 45 / 70, in trench water. The last row
    // is the ping, and it is the half of the faction's own superweapon the
    // engine already has (§2, §13).
    assert.equal(DRIFT.DIRECTORATE_AGGRO_MULTIPLIER, 0.4, '§4: they taste worse');
    assert.equal(ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER, 3, '§2: fauna hear a ping at three times');
    const ladder = (sig: number, pinging = false) => [
      aggroRange(sig, HOLLOW.hyd, HOLLOW.interest, pinging),
      aggroRange(sig, HOLLOW.hyd, HOLLOW.commit, pinging),
    ];
    assert.deepEqual(ladder(CHORISTER.sigIdle), [176, 134], '§4: a Chorister, idle at 16');
    assert.deepEqual(ladder(CHORISTER.sigCruise), [227, 172], '§4: cruising at 24');
    assert.deepEqual(
      ladder(CHORISTER.sigCruise + CHORISTER.sigFiringBurst),
      [308, 233],
      '§4: firing at 39'
    );
    assert.deepEqual(
      ladder(SUBMERSIBLE.sigCruise),
      [250, 190],
      '§4: a Submersible, cruising at 28'
    );
    assert.deepEqual(ladder(DEPTH.DESCENT_SIG), [451, 342], '§4: a hull diving at 72');
    assert.deepEqual(ladder(ACTIVE_SONAR.EMITTER_SIG, true), [1066, 809], '§4: a ping, at 95 × 3');
  });

  it("reads §4.2's six rows exactly, and does not discount the yard", () => {
    // To a Sounder's HYD 90 and its 55 / 75. "×0.4 applies to structures and
    // hulls alike, and it does not save the yard, because the yard is louder
    // than any hull it owns."
    const ladder = (sig: number, pinging = false) => [
      aggroRange(sig, SOUNDER.hyd, SOUNDER.interest, pinging),
      aggroRange(sig, SOUNDER.hyd, SOUNDER.commit, pinging),
    ];
    assert.deepEqual(ladder(FOUNDRY.sigActive), [362, 298], '§4: the grower, producing');
    assert.deepEqual(ladder(BASTION.sigIdle), [273, 225], '§4: the plant or the dome');
    assert.deepEqual(
      ladder(CHORISTER.sigCruise + CHORISTER.sigFiringBurst),
      [292, 241],
      '§4: a Chorister, firing'
    );
    assert.deepEqual(ladder(DEPTH.DESCENT_SIG), [428, 353], '§4: a hull diving at 72');
    assert.deepEqual(ladder(ACTIVE_SONAR.EMITTER_SIG, true), [1012, 834], '§4: a Directorate ping');
    // The one term that adds: a fresh kill within 800 m is +15 flat on
    // whatever a creature is already hearing — the row's own renderings
    // pulling the next animal in, and the only way this yard makes itself
    // louder by being paid.
    assert.equal(DRIFT.WRECK_AGGRO_BONUS, 15);
    assert.equal(DRIFT.WRECK_RADIUS_M, 800);
    const firing = CHORISTER.sigCruise + CHORISTER.sigFiringBurst;
    assert.deepEqual(
      [
        aggroRange(firing, SOUNDER.hyd, SOUNDER.interest - DRIFT.WRECK_AGGRO_BONUS),
        aggroRange(firing, SOUNDER.hyd, SOUNDER.commit - DRIFT.WRECK_AGGRO_BONUS),
      ],
      [356, 277],
      '§4: the same, with a fresh rendering inside 800 m'
    );
  });

  it('leaves the noisemaker as the only lever that moves an animal without a ping', () => {
    // §2 — SIG 70 for eight seconds reads 28 to the Drift, louder than
    // anything the row owns short of a hull under way downward.
    assert.deepEqual(
      [
        aggroRange(ORDNANCE.NOISEMAKER.SIG, SOUNDER.hyd, SOUNDER.interest),
        aggroRange(ORDNANCE.NOISEMAKER.SIG, SOUNDER.hyd, SOUNDER.commit),
      ],
      [421, 347],
      '§2: a noisemaker pulls a released colossus from 421 m and 347 m'
    );
    assert.equal(ORDNANCE.NOISEMAKER.DURATION_S, 8, '§2: for eight seconds');
  });

  it('makes a silent Chorister inaudible to a Hollow at any range at all', () => {
    // §2 — "it is not merely hard to hear, it is inaudible at any range".
    // `perceivedLoudness` stops attenuating at the model's 100 m reference
    // distance, so the loudest a silent Chorister can ever read is its reading
    // at point blank — a ratio of 30 against an Interest of 45. A silent hull
    // also does not shoot, which is what makes it a trade on a row whose whole
    // income is a gun.
    const spread = SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN;
    const silent =
      SILENT_RUNNING.SIG_MIN + spread * Math.min(1, Math.max(0, CHORISTER.sigIdle / 60));
    const loudest =
      detectionRatio(silent, TRENCH_PF, 1, HOLLOW.hyd) * DRIFT.DIRECTORATE_AGGRO_MULTIPLIER;
    assert.equal(Number(silent.toFixed(1)), 4.3, '§2: 4.3 in the 3–8 band');
    assert.equal(Math.round(loudest), 30, '§2: a ratio of 30');
    assert.ok(loudest < HOLLOW.interest, '§2: against an Interest of 45');
  });

  it('prices a rendering by the count that takes it, as §4 does', () => {
    // §4 — "Eight Choristers at 20/s are 160/s and have its 640 HP in 4.0 s;
    // six are 120/s, take 5.33 s, and are bitten for 0.8 s at 55/s — 44 HP off
    // one 200-HP hull." Damage is a sound: the first shell springs the strike
    // from any range and the animal comes at the gun.
    const dps = (hulls: number) => (hulls * CHORISTER.attackDamage) / CHORISTER.attackCooldownS;
    assert.equal(dps(8), 160);
    assert.equal(HOLLOW.maxHp / dps(8), 4, '§4: eight take it in four seconds');
    const six = HOLLOW.maxHp / dps(6);
    assert.equal(Number(six.toFixed(2)), 5.33, '§4: six take 5.33 s');
    const closing = (450 - HOLLOW.attackRangeM) / HOLLOW.speed;
    assert.equal(Number(closing.toFixed(2)), 4.53, '§4: 340 m at 75 m/s');
    assert.equal(Math.round((six - closing) * HOLLOW.damagePerS), 44, '§4: 44 HP off one hull');
    assert.ok(44 < CHORISTER.maxHp / 4, '§4: a fifth of a hull, and the row keeps the hull');
  });
});

describe('the Drift, as docs/mission-trench-awakening.md §5 places it', () => {
  const hollows = creatures.filter((beat) => beat.species === FaunaSpecies.Hollow);

  it('places six Hollows at tick zero, three per overhang, none of them driven', () => {
    assert.equal(hollows.length, 6, '§5: six Hollows, and the walls are the income');
    for (const beat of hollows) {
      assert.equal(beat.atTick, 0, '§9: placed with the map');
      assert.equal(beat.spawnAt?.depthM, HOLLOW.workingDepthM, '§5: at 1,700 m');
      // Placed and not driven (§13): committed to its own spawn for no ticks
      // at all, so the first pass hands it back its ears and its hull. No
      // authored depth, because the species' own is the depth §5 wants.
      assert.deepEqual(beat.driveTo, { x: beat.spawnAt!.x, y: beat.spawnAt!.y });
      assert.equal(beat.untilTick, 0);
      assert.equal(beat.loud, false, 'nothing about a coiled animal is a precursor');
    }
    assert.equal(hollows.filter((b) => b.spawnAt!.x < 2500).length, 3, '§5: the west overhang');
    assert.equal(hollows.filter((b) => b.spawnAt!.x > 2500).length, 3, '§5: and the east');
    // §11 — the overhangs stand at 2,150 m and the Hollow works a band of
    // 1,250–2,150, so the animals that pay this row live on its walls.
    assert.equal(HOLLOW.workingDepthM - HOLLOW.depthBandM, 1250);
    assert.equal(HOLLOW.workingDepthM + HOLLOW.depthBandM, 2150);
  });

  it('opens the tide with the row unable to hear a single thing it is there to earn', () => {
    // §5 — "The nearest of the six to the row is `hollow-one` at 1,552 m from
    // `row-one`, against a submersible's 1,231 m of Contact." Intake's opening
    // arithmetic, the same numbers, its second life.
    let nearest = Number.POSITIVE_INFINITY;
    for (const beat of hollows) {
      for (const unit of player.units) {
        nearest = Math.min(nearest, Math.hypot(beat.spawnAt!.x - unit.x, beat.spawnAt!.y - unit.y));
      }
    }
    assert.equal(Math.round(nearest), 1552, '§5: 1,552 m, and it is `hollow-one` to `row-one`');
    const contact = rangeAt(
      HOLLOW.sigIdle,
      SUBMERSIBLE.hyd,
      TRENCH_PF,
      TIER_THRESHOLD_MULTIPLIER.CONTACT
    );
    assert.equal(contact, 1231, "§5: a submersible's 1,231 m of Contact");
    assert.ok(nearest > contact, '§5: the row opens on a walk');
    // §6 — "1,552 m at 40 m/s is 39 s from the row", which is the whole of why
    // §9 prints the first rendering at about 02:00 and does not script one.
    assert.equal(Math.round(nearest / CHORISTER.speed), 39, '§6: 39 s at walking pace');
  });

  it('keeps every rendering nearer to the hull that made it than to the berths', () => {
    // §13, and the finding that moved a coordinate: `payBiomass` attributes a
    // kill to the nearest entity with an `Owner` off the Drift slot, and
    // `spawnEmitter` gives a scripted party's emitters both. The stalls are on
    // slot 2, so a Hollow rendered nearer the berths than the hull that killed
    // it would be banked by the berths and the row would be paid nothing.
    const emitter = (stalls.emitters ?? [])[0]!;
    for (const beat of hollows) {
      const toBerths = Math.hypot(beat.spawnAt!.x - emitter.x, beat.spawnAt!.y - emitter.y);
      assert.ok(
        toBerths > SUBMERSIBLE.attackRangeM,
        `${beat.tag} is ${Math.round(toBerths)} m from the berths, inside a 650 m gun`
      );
    }
    const four = hollows.find((beat) => beat.tag === 'hollow-four')!;
    assert.equal(
      Math.round(Math.hypot(four.spawnAt!.x - emitter.x, four.spawnAt!.y - emitter.y)),
      901,
      '§13: 901 m, which is the coordinate the finding moved'
    );
  });
});

describe('the two calls, as the runtime will run them — §5, §6, §9, §13', () => {
  const first = creatures.filter((beat) => beat.tag === 'the-first');
  const second = creatures.find((beat) => beat.tag === 'the-second')!;

  it('sends both up the axis from the sill, loud, at the ticks §9 authors', () => {
    assert.equal(first.length, 2, '§9: one arrival and one turn, not two animals');
    const arrival = first[0]!;
    const turn = first[1]!;
    assert.equal(arrival.atTick, T(10), '§9: the Call at 10:00');
    assert.deepEqual(arrival.spawnAt, { ...SILL, depthM: 2300 }, '§9: at the sill, at 2,300 m');
    assert.deepEqual(arrival.driveTo, { ...AXIS_HEAD, depthM: 2000 });
    assert.equal(arrival.untilTick, T(13));
    assert.equal(arrival.loud, true, '§9: `loud: true`, and heard by everything');
    assert.equal(turn.atTick, T(13), '§9: the commitment is replaced at 13:00');
    assert.equal(turn.spawnAt, undefined, 'the same animal, turned — not a second one');
    assert.deepEqual(turn.driveTo, { ...THROUGH_THE_YARD, depthM: 1850 });
    assert.equal(turn.untilTick, T(14, 30), '§9: the commitment lapses at 14:30');
    assert.equal(second.atTick, T(16, 30), '§9: nobody said one');
    assert.deepEqual(second.spawnAt, { ...SILL, depthM: 2300 }, '§9: the same sill');
    assert.deepEqual(second.driveTo, { ...SECOND_HOLD, depthM: 1900 });
    assert.equal(second.untilTick, T(18, 30), '§9: released at 18:30');
    assert.equal(second.loud, true, '§8: the telegraph the close is measured from');
    // §5, §13 — every transit carries a depth. A driven creature holds the
    // species' working depth unless the commitment says otherwise, and a
    // Sounder's own 2,000 m can neither hold the axis head at 1,900 nor grind
    // a Foundry two hundred metres above it: a transit's vertical reach is a
    // body, not a column.
    assert.equal(SOUNDER.workingDepthM, 2000);
    for (const beat of [arrival, turn, second]) {
      assert.notEqual(beat.driveTo.depthM, undefined, "§13: the document's line has a depth");
    }
  });

  it('arrives at 11:01 and at 17:40, forty metres short of where it is sent', () => {
    // §5, §9, §13 — `act` holds a targetless driven creature at `stopAtM` 40,
    // so the head of the axis is where the beat *aims*, not where the colossus
    // stands. Both of §9's arrival times fall out of that and the roster's 30
    // m/s, and neither is authored anywhere.
    const leg = park(SILL, AXIS_HEAD);
    assert.equal(leg.travelM, 1835);
    assert.deepEqual([leg.x, leg.y], [2500, 2040], '§5: it holds at 2,040 rather than at 2,000');
    const arrivesAtS = T(10) / SIM.TICK_HZ + leg.travelM / SOUNDER.speed;
    assert.equal(Math.round(arrivesAtS), 661, '§9: 11:01, and it calls there until 13:00');
    const legTwo = park(SILL, SECOND_HOLD);
    assert.equal(legTwo.travelM, 2085);
    const secondAtS = T(16, 30) / SIM.TICK_HZ + legTwo.travelM / SOUNDER.speed;
    assert.equal(Math.round(secondAtS), 1060, '§9: 17:40, the head of the axis');
    // §5 — "the head of the axis, 700 m south of the row". Measured from the
    // cohort's own line rather than from any one hull, and it is the authored
    // point that is 700 m south; the park leaves it forty further.
    const cohortY = byTag('row-three').y;
    assert.equal(SECOND_HOLD.y - cohortY, 700, '§5: 700 m south of the row');
    assert.equal(legTwo.y - cohortY, 740, '§5: and 740 once it has parked');
    // §5 — "Nothing there reads over its Interest of 55 [...] It stands until
    // the row makes it move." Checked in pure trench water, which is the
    // loudest path this map could offer and louder than the one it has: even
    // then the whole row is inaudible to the animal standing in its water.
    const readsAt = (sig: number, x: number, y: number) =>
      detectionRatio(sig, TRENCH_PF, Math.hypot(legTwo.x - x, legTwo.y - y), SOUNDER.hyd) *
      DRIFT.DIRECTORATE_AGGRO_MULTIPLIER;
    for (const unit of player.units) {
      const stats = statsFor(unit.kind);
      const loudest = readsAt(stats.sigCruise + stats.sigFiringBurst, unit.x, unit.y);
      assert.ok(loudest < SOUNDER.interest, `${unit.tag} reads ${loudest.toFixed(1)} to it`);
    }
    for (const structure of player.structures ?? []) {
      const stats = structureStatsFor(structure.kind);
      const loudest = readsAt(stats.sigActive, structure.x, structure.y);
      assert.ok(loudest < SOUNDER.interest, `${structure.tag} reads ${loudest.toFixed(1)} to it`);
    }
    // And the three levers §5 says are the only things that will move it.
    assert.equal(aggroRange(ACTIVE_SONAR.EMITTER_SIG, SOUNDER.hyd, SOUNDER.commit, true), 834);
    assert.equal(aggroRange(ORDNANCE.NOISEMAKER.SIG, SOUNDER.hyd, SOUNDER.commit), 347);
    assert.equal(
      aggroRange(SUBMERSIBLE.sigCruise, SOUNDER.hyd, SOUNDER.commit),
      196,
      '§5: or a hull inside 196 m, which is a Submersible under way'
    );
  });

  it('spends the grower by crossing it, because a parked colossus grinds nothing', () => {
    // §13's finding, authored around rather than requested: `transit()` is
    // called only inside the branch that moves the creature, so a colossus
    // held on the Foundry's apron would do no damage at all. The 13:00 beat
    // therefore drives it *through* the yard, and what kills the grower is the
    // swept segment rather than a stop.
    const from = park(SILL, AXIS_HEAD);
    const to = park(from, THROUGH_THE_YARD);
    const reach = SOUNDER.lengthM / 2 + FOUNDRY.radiusM;
    assert.equal(reach, 197.5, "§5: `lengthM / 2 + radiusM`, and the document's figure");
    const perpendicular = offTheLine(from, THROUGH_THE_YARD, GROWER);
    assert.ok(perpendicular < reach, "§13: the line passes inside the Foundry's footprint");
    // §13 says "41 m off the Foundry's centre" and measures from (2500, 2000),
    // the point the 10:00 beat names. The line the runtime actually draws starts
    // forty metres short of that, at (2500, 2040), which swings the perpendicular
    // to 39.5. The document's conclusion is untouched either way — what it turns
    // on is the swept metres below, and those are 349 from both starts.
    assert.equal(Number(perpendicular.toFixed(1)), 39.5, '§13: 41 m from the point it names');
    // The metres of the swept line inside the reach, against the metres 2,000
    // HP at 220/s needs. §13 quotes 349 against 273, and the travel stops at
    // 40 m short of the far end — which is what takes the exit off the end of
    // the line rather than out through the far side of the footprint.
    const half = Math.sqrt(reach * reach - perpendicular * perpendicular);
    const centre = alongTheLine(from, THROUGH_THE_YARD, GROWER);
    const entryM = centre - half;
    const insideM = Math.min(centre + half, to.travelM) - entryM;
    const neededM = (FOUNDRY.maxHp / SOUNDER.damagePerS) * SOUNDER.speed;
    assert.equal(Math.round(neededM), 273, '§13: 9.09 s at 30 m/s');
    assert.ok(
      insideM > neededM,
      `§13: ${insideM.toFixed(0)} m of line against the ${neededM.toFixed(0)} m the kill needs`
    );
    assert.ok(Math.abs(insideM - 349) < 1, '§13: three hundred and forty-nine metres');
    // §9's two tilde-marked ticks, to the second the engine will produce them.
    // §9 prints ~13:28 and ~13:37 off its own 27.9 s of walk from (2500, 2000);
    // from the parked start it is 29.2 s, so both land 1.3 s later — inside the
    // hedge the tildes are there for, and stated rather than rounded away.
    const entryAtS = T(13) / SIM.TICK_HZ + entryM / SOUNDER.speed;
    const spentAtS = entryAtS + FOUNDRY.maxHp / SOUNDER.damagePerS;
    assert.equal(Number((entryM / SOUNDER.speed).toFixed(1)), 29.2, '§5: 27.9 s from (2500, 2000)');
    assert.equal(Math.round(entryAtS), 809, '§9: ~13:28 authored, 13:29.2 run');
    assert.equal(Math.round(spentAtS), 818, '§9: ~13:37 authored, 13:38.3 run');
    assert.ok(spentAtS * SIM.TICK_HZ < T(14, 30), '§9: spent before the commitment lapses');
    assert.equal(DRIFT.TRANSIT_SIG, 70, '§7: nine seconds of SIG 70 on a 2,000-HP structure');
    // The climb the line depends on, and the quietest way this beat could fail.
    // It crosses out of the Axis (floor 2,400) into the Rendering Row (floor
    // 1,850) at y = 1,250, and `resolveStep` refuses a creature's step into
    // ground that does not admit its depth — so the 1,850 m the beat carries has
    // to be *reached* before the boundary, or the colossus stops on the lip of
    // the row and the yard is never touched. It is, with twice the margin: the
    // climb from the axis head's 2,000 m is 150 m at DRIFT.VERTICAL_SPEED_MPS,
    // against a walk to y = 1,250 that takes 26.9 s.
    const terrain = terrainFor(SHALLOW_BAND);
    assert.equal(terrain.floorAt(2600, 1300), 2400, 'the axis, north of the boundary');
    assert.equal(terrain.floorAt(2600, 1200), 1850, 'the row, south of it');
    const held = creatures.filter((beat) => beat.tag === 'the-first');
    const climbS = (held[0]!.driveTo.depthM! - held[1]!.driveTo.depthM!) / DRIFT.VERTICAL_SPEED_MPS;
    const lineM = Math.hypot(THROUGH_THE_YARD.x - from.x, THROUGH_THE_YARD.y - from.y);
    const toBoundaryS = ((from.y - 1250) * (lineM / (from.y - THROUGH_THE_YARD.y))) / SOUNDER.speed;
    assert.equal(Number(climbS.toFixed(1)), 12.5, '150 m at 12 m/s');
    assert.equal(Number(toBoundaryS.toFixed(1)), 26.9, 'and 26.9 s of walk to reach the lip');
    assert.ok(climbS < toBoundaryS, 'the colossus is in the row’s water before the row’s ground');
  });

  it('leaves every hull of the row off the line, and the plant untouched', () => {
    // §3, §6 — "Nothing here is aimed at it", which is this document's answer
    // to the finding that a Bastion on the player's party *is* the player's
    // stake: `reap` eliminates the slot whose Bastion falls. The colossus is
    // kept off the plant by geometry, because there is no flag to keep it off.
    const from = park(SILL, AXIS_HEAD);
    assert.equal(SUBMERSIBLE.hullLengthM, DRIFT.TRANSIT_MIN_HULL_M, '§2: exactly the threshold');
    assert.ok(CHORISTER.hullLengthM < DRIFT.TRANSIT_MIN_HULL_M, '§2: and a Chorister is under it');
    for (const unit of player.units) {
      if (unit.kind !== UnitKind.AbyssalSubmersible) continue;
      const reach = SOUNDER.lengthM / 2 + SUBMERSIBLE.hullLengthM / 2;
      assert.ok(
        offTheLine(from, THROUGH_THE_YARD, unit) > reach,
        `${unit.tag} stands on the line the colossus draws`
      );
    }
    // §5's two clearances, off the line the runtime draws rather than the one
    // §5 measures: 673 and 502 from (2500, 2000), 676 and 500 from the park.
    // The margin is eight times the reach either way, which is why the shift
    // changes nothing the document concludes.
    assert.equal(Math.round(offTheLine(from, THROUGH_THE_YARD, byTag('row-one'))), 676, '§5: 673');
    assert.equal(Math.round(offTheLine(from, THROUGH_THE_YARD, byTag('row-two'))), 500, '§5: 502');
    for (const structure of player.structures ?? []) {
      if (structure.kind === StructureKind.Foundry) continue;
      const reach = SOUNDER.lengthM / 2 + structureStatsFor(structure.kind).radiusM;
      assert.ok(
        offTheLine(from, THROUGH_THE_YARD, structure) > reach,
        `${structure.tag} is on the line, and the plant is the row`
      );
    }
    // §3 — and even a centre-line pass would not take a Bastion in one: it
    // takes two, which takes a row that spent ninety seconds making noise
    // beside its own plant.
    const throughPlant =
      ((SOUNDER.lengthM / 2 + BASTION.radiusM) * 2 * SOUNDER.damagePerS) / SOUNDER.speed;
    assert.ok(throughPlant < BASTION.maxHp, '§3: one pass does not take the plant');
    assert.ok(throughPlant * 2 > BASTION.maxHp, '§3: two do');
  });

  it('dies in two different ledger cells, which is what decides what each is worth', () => {
    // §6 — "`payBiomass` reads the ledger at the animal's own position, and the
    // two are released in different cells." The first stops north of the row in
    // a cell nothing of the row's stands in at 00:00; the second is released
    // inside the grower's own, the one §3 has Strained at 00:10.
    const from = park(SILL, AXIS_HEAD);
    const firstStop = park(from, THROUGH_THE_YARD);
    assert.deepEqual(
      [Math.round(firstStop.x), Math.round(firstStop.y)],
      [2742, 839],
      '§6: it stops where §6 says it stops'
    );
    assert.equal(
      Math.round(Math.hypot(firstStop.x - GROWER.x, firstStop.y - GROWER.y)),
      161,
      '§5: 161 m north of where the grower stood'
    );
    const secondStop = park(SILL, SECOND_HOLD);
    assert.notEqual(cellOf(firstStop.x, firstStop.y), cellOf(GROWER.x, GROWER.y));
    assert.equal(
      cellOf(secondStop.x, secondStop.y),
      cellOf(GROWER.x, GROWER.y),
      "§6: inside the grower's own cell, the one §3 has Strained at 00:10"
    );
    for (const thing of [...player.units, ...(player.structures ?? [])]) {
      assert.notEqual(
        cellOf(thing.x, thing.y),
        cellOf(firstStop.x, firstStop.y),
        `${thing.tag} stands in the cell the first colossus dies in, which pays 260`
      );
    }
  });
});

describe('the objective, as docs/mission-trench-awakening.md §8 chooses it', () => {
  it('decides the count by the band and the muster, and by nothing else', () => {
    const terminal = ATTENDING_TRENCH_AWAKENING.objectives.filter((o) => o.terminal === true);
    assert.deepEqual(
      terminal.map((o) => o.id),
      ['the-band', 'the-row'],
      '§8: two terminal rows'
    );
    for (const row of terminal) {
      assert.notEqual(row.keystone, true, '§8: neither terminal objective is a keystone');
      assert.equal(row.revealAtTick, undefined, '§8: no reveal ticks and no markers');
    }
    assert.deepEqual(objective('the-band').predicate, {
      kind: 'deliver',
      account: 'biomass',
      amount: 260,
    });
    assert.deepEqual(objective('the-row').predicate, {
      kind: 'survive',
      role: 'yard',
      count: 6,
    });
    assert.deepEqual(ATTENDING_TRENCH_AWAKENING.regions, [], '§13: no predicate names a rectangle');
    assert.deepEqual(ATTENDING_TRENCH_AWAKENING.markers, []);
  });

  it('makes the band the called thing, rendered, by arithmetic rather than by fiat', () => {
    // §8, §12 — "It is not rendered from the walls alone; the walls are two
    // hundred and ten and the Undermarshalcy can add." Six Hollows at the
    // roster's 35 cannot answer a band of 260, and one colossus answers it
    // exactly.
    const walls = 6 * HOLLOW.biomass;
    assert.equal(walls, 210, '§6, §12: the walls are two hundred and ten');
    assert.equal(SOUNDER.biomass, 260, '§8: and the band is a colossus, exactly');
    const band = objective('the-band').predicate;
    assert.equal(band.kind === 'deliver' ? band.amount : NaN, SOUNDER.biomass);
    assert.ok(walls < SOUNDER.biomass, '§8: the walls alone cannot answer it');
    assert.ok(walls + SOUNDER.biomass >= 260, '§8: and the walls plus one colossus can');
  });

  it('runs its length, because the muster is met at tick zero', () => {
    // §9 — "`the-row` is met at tick zero — eight is at least six — so a row
    // that banks 260 at 14:40 would meet both terminal rows and close the
    // mission before `the-second` spawned." The flag is not a preference here;
    // without it the mission's last four minutes cannot happen.
    assert.equal(ATTENDING_TRENCH_AWAKENING.runsItsLength, true);
    const muster = objective('the-row').predicate;
    const seated = player.units.filter((unit) => unit.role === 'yard').length;
    assert.equal(seated, 8);
    assert.ok(
      muster.kind === 'survive' && seated >= muster.count,
      '§9: met on the first pass, before the row has done anything'
    );
    const secondCall = creatures.find((beat) => beat.tag === 'the-second')!;
    assert.ok(secondCall.atTick > T(14, 40), '§9: and the second colossus arrives after that');
  });

  it('reads `the-second` out and never ranks it, in the words §8 authors', () => {
    // §8, §13 — "*the second colossus was rendered* is not discouraged, it is
    // inexpressible": every predicate is a query over the observer's own force
    // and there is no `party`, `slot` or `group` field in the union. Four
    // hundred banked at once is the closest honest shadow.
    const row = objective('the-second');
    assert.notEqual(row.terminal, true, '§8: read out, never ranked');
    assert.equal(row.revealAtTick, undefined, '§8: shown from 00:00');
    assert.deepEqual(row.predicate, { kind: 'deliver', account: 'biomass', amount: 400 });
    assert.equal(
      SOUNDER.biomass + 4 * HOLLOW.biomass,
      400,
      '§8: one colossus and four animals exactly'
    );
    assert.equal(2 * SOUNDER.biomass - 400, 120, '§8: and a hundred and twenty short of two');
    assert.match(row.reading!.met, /^Four hundred against the band\./, '§8, verbatim');
    assert.match(row.reading!.unmet, /^Four hundred is not against the band\./);
    // §6 — the same four hundred is what six hundred nodules of Choristers
    // would cost in Biomass, which is the sink the ladder pays out into.
    const nodules = ATTENDING_TRENCH_AWAKENING.startingNodules ?? 0;
    assert.equal((nodules / CHORISTER.cost) * (CHORISTER.biomassCost ?? 0), 400);
  });

  it('does not score the grower, which is the one structure the mission is about', () => {
    // §8, §13 — "What the player has built or lost is not a predicate", so the
    // grower is read in the epilogue by hand and touches nothing. Landing that
    // row here would make the grower defensible, and the grower is not.
    for (const row of ATTENDING_TRENCH_AWAKENING.objectives) {
      assert.ok(
        row.predicate.kind === 'deliver' || row.predicate.kind === 'survive',
        `${row.id}: §8 authors two kinds of row and no third`
      );
      assert.equal(row.initial, ObjectiveStatus.Pending, `${row.id}: nothing opens Met`);
    }
    assert.equal(ATTENDING_TRENCH_AWAKENING.holds, undefined, '§8: nothing is held');
    assert.equal(ATTENDING_TRENCH_AWAKENING.lifts, undefined);
    assert.equal(ATTENDING_TRENCH_AWAKENING.soundings, undefined);
    assert.equal(ATTENDING_TRENCH_AWAKENING.walk, undefined);
    assert.equal(ATTENDING_TRENCH_AWAKENING.sweep, undefined);
  });

  it("reads all three of Korrin's results, in the register", () => {
    assert.match(
      ATTENDING_TRENCH_AWAKENING.epilogue[MissionOutcome.Complete],
      /^The band is answered and the row is mustered\./
    );
    assert.match(
      ATTENDING_TRENCH_AWAKENING.epilogue[MissionOutcome.Partial],
      /^You were sufficient\./
    );
    assert.match(
      ATTENDING_TRENCH_AWAKENING.epilogue[MissionOutcome.Lost],
      /^No band and no muster\. The trench was sounded/
    );
    assert.match(
      ATTENDING_TRENCH_AWAKENING.epilogue[MissionOutcome.Lost],
      /not a failure of the row/,
      "§8: a loss is not the row's fault, and the register says so"
    );
  });
});

describe('the beats, as docs/mission-trench-awakening.md §9 times them', () => {
  const says = ATTENDING_TRENCH_AWAKENING.beats.flatMap((beat) =>
    beat.kind === 'say' ? [beat] : []
  );
  const resolve = ATTENDING_TRENCH_AWAKENING.beats.find((beat) => beat.kind === 'resolve')!;

  it('closes at 20:00, and the close is not a conclusion', () => {
    // §8 — "The close at 20:00 is **not** a conclusion: the tide does not end
    // here and the row is not owed the courtesy." So campaign.md §10's
    // telegraph is owed, and it is paid by `the-second` at 16:30.
    assert.equal(resolve.atTick, T(20), '§9: the resolve lands at 1,200 s');
    assert.equal(resolve.kind === 'resolve' ? resolve.conclusion : true, undefined);
    const loud = creatures.filter((beat) => beat.loud);
    assert.equal(loud.length, 2, '§9: two calls, and both are loud');
    const last = loud[loud.length - 1]!;
    assert.equal(last.atTick, T(16, 30));
    const leadS = (resolve.atTick - last.atTick) / SIM.TICK_HZ;
    assert.equal(leadS, 210, '§8: 210 seconds before the close');
    assert.ok(leadS >= MISSION.FAILURE_TELEGRAPH_S, '§10: against a rule of sixty');
    // §8 lists five audible warnings, and the earliest is ten minutes out.
    assert.equal((resolve.atTick - loud[0]!.atTick) / SIM.TICK_HZ, 600, '§8: ten minutes');
  });

  it("says §12's lines at §9's ticks, and in §9's order", () => {
    assert.deepEqual(
      says.map((beat) => [beat.atTick / SIM.TICK_HZ, beat.speaker]),
      [
        [0, 'Undermarshal Setha Korrin'],
        [60, 'The ground'],
        [300, 'The yard'],
        [420, "Undermarshal Setha Korrin, on the stalls' channel"],
        [600, 'Undermarshal Setha Korrin'],
        [720, 'The ground'],
        [870, 'The ground'],
        [1020, 'The stalls'],
        [1140, 'Undermarshal Setha Korrin'],
        [1200, 'Undermarshal Setha Korrin'],
      ],
      '§9, §12 — every voice, at the tick the document gives it'
    );
    for (const beat of says) {
      assert.ok(beat.text.trim().length > 0, `${beat.speaker} says nothing`);
    }
    // §12 — the fifth consecutive Directorate mission to close on one sentence
    // she should not say aloud, and the first in which she claims the act.
    assert.match(says[says.length - 1]!.text, /^I called it\./, '§12, verbatim');
  });

  it('fires the two tally lines by the account they are about, not by the clock', () => {
    // §9's second table, in docs/mission-intake.md §12's idiom: a row that
    // finds the first animal at 01:40 hears the Cohort-Prime at 01:40.
    const conditionals = ATTENDING_TRENCH_AWAKENING.conditionalBeats ?? [];
    assert.equal(conditionals.length, 2, '§9: two condition-fired beats');
    assert.equal(conditionals[0]!.kind, 'say');
    assert.deepEqual(conditionals[0]!.when, {
      kind: 'deliver',
      account: 'biomass',
      amount: HOLLOW.biomass,
    });
    assert.deepEqual(conditionals[1]!.when, {
      kind: 'deliver',
      account: 'biomass',
      amount: SOUNDER.biomass,
    });
    for (const beat of conditionals) {
      assert.equal(beat.choiceGroup, undefined, 'the two are a sequence, not a choice');
    }
    // The second is keyed on the same figure the band's own objective carries,
    // so the line and the counter cannot disagree by a rendering.
    const band = objective('the-band').predicate;
    const when = conditionals[1]!.when;
    assert.equal(
      when.kind === 'deliver' ? when.amount : NaN,
      band.kind === 'deliver' ? band.amount : NaN
    );
  });
});

describe('the briefing, as docs/mission-trench-awakening.md §12 speaks it', () => {
  it('extends the public header it is listed under, field for field', () => {
    // The literal spreads `ATTENDING_TRENCH_AWAKENING_HEADER`, so the shell's
    // entry and the room's mission cannot be two different missions — but the
    // spread is one line and a later hand-edit to either side would part them
    // silently. `missions.test.ts` checks only that *a* header resolves.
    const header = missionHeaderById('attending-trench-awakening');
    assert.equal(header, ATTENDING_TRENCH_AWAKENING_HEADER, 'the catalogue lists this header');
    for (const [key, value] of Object.entries(ATTENDING_TRENCH_AWAKENING_HEADER)) {
      assert.deepEqual(
        (ATTENDING_TRENCH_AWAKENING as unknown as Record<string, unknown>)[key],
        value,
        `${key}: the definition and the header disagree`
      );
    }
    assert.equal(ATTENDING_TRENCH_AWAKENING.campaign, 'attending');
    assert.equal(ATTENDING_TRENCH_AWAKENING.ordinal, 5, 'campaign.md §6 row 5');
    assert.equal(ATTENDING_TRENCH_AWAKENING.mapId, SHALLOW_BAND.id, '§11: the Shallow Band');
    assert.equal(ATTENDING_TRENCH_AWAKENING.doc, 'docs/mission-trench-awakening.md');
    // §9 — "the advertised band is 1,140–1,260 s and the `resolve` lands at
    // 1,200". The band is public and the beat is not, so nothing but this holds
    // the two together.
    assert.deepEqual(ATTENDING_TRENCH_AWAKENING.lengthBandS, [1140, 1260], '§9');
    const resolve = ATTENDING_TRENCH_AWAKENING.beats.find((beat) => beat.kind === 'resolve')!;
    const [low, high] = ATTENDING_TRENCH_AWAKENING.lengthBandS;
    const closesAtS = resolve.atTick / SIM.TICK_HZ;
    assert.ok(closesAtS >= low && closesAtS <= high, `§9: closes at ${closesAtS}s`);
  });

  it("carries §12's four paragraphs and the one line the entry screen shows", () => {
    // §12 — "The one line the entry screen carries, which is never the win
    // condition". The shared suite refuses a premise naming an objective; this
    // one holds it to the sentence the document actually authors.
    assert.equal(
      ATTENDING_TRENCH_AWAKENING.premise,
      "The shallow band renders what the trench brings. This tide the trench is sounded, and what answers is the Drift's to decide."
    );
    // §12, verbatim, in the document's order: the assignment, the arithmetic
    // that makes the band unanswerable from the walls alone, the muster, and
    // the one thing the Directorate withholds — what the trench answers with.
    const briefing = ATTENDING_TRENCH_AWAKENING.briefing;
    assert.ok(briefing !== null && briefing !== undefined, '§12: public, not withheld');
    assert.equal(briefing.length, 4, '§12: four paragraphs');
    assert.match(briefing[0]!, /^The shallow band is at work\. The First is sounded on this tide/);
    assert.match(briefing[1]!, /^Eight hulls are given to the row, and a plant, and a dome/);
    assert.match(briefing[1]!, /the walls are two hundred and ten and the Undermarshalcy can add/);
    assert.equal(briefing[2], 'Six of eight muster. The Undermarshalcy does not round up.');
    assert.equal(briefing[3], 'What answers a sounding is not chosen. It is entered as what came.');
    assert.equal(
      briefing.some((paragraph) => /Ossary|Cantorate|First Cantor/.test(paragraph)),
      false,
      '§12: no Cantorate formula — the Cantorate does not attend a rendering row'
    );
    // §12's muster paragraph is the objective's own text, so the entry screen
    // and the counter cannot state two different musters.
    assert.equal(briefing[2], objective('the-row').text);
  });

  it('reads the assignment into the water as the part the briefing shortens to', () => {
    // §9's 00:00 row — "Korrin assigns the band, at the band (§12)" — in
    // docs/mission-intake.md's idiom: the whole assignment is the header's
    // briefing and the `say` beat is the part the water is told. Held as an
    // identity rather than as a second copy of the prose, so a briefing edited
    // without the beat fails here instead of shipping two Korrins.
    const briefing = ATTENDING_TRENCH_AWAKENING.briefing!;
    const opening = ATTENDING_TRENCH_AWAKENING.beats.find((beat) => beat.kind === 'say')!;
    assert.equal(opening.atTick, 0, '§9: at 00:00, with the row');
    assert.equal(opening.speaker, 'Undermarshal Setha Korrin');
    const firstSentence = `${briefing[0]!.split('. ')[0]}.`;
    assert.equal(
      opening.text,
      `${firstSentence} ${briefing[1]}`,
      '§12: shortened, never rewritten'
    );
  });
});

describe('what is heard — docs/mission-trench-awakening.md §7', () => {
  it('carries the yard the length of the trench, and half of it through worked ground', () => {
    // §7 — the row's own strip of quiet is exactly the shape of the row, which
    // is why the grower producing reads 7,011 m in trench water and 4,546 m in
    // its own cut ground. Being paid is audible from outside the map.
    const contact = TIER_THRESHOLD_MULTIPLIER.CONTACT;
    assert.equal(
      rangeAt(BASTION.sigIdle, CHORISTER.hyd, TRENCH_PF, contact),
      5286,
      '§7: the plant'
    );
    // §7 rounds this one up: the range is 3,427.30 m and the document prints
    // 3,428. Everything else in §7 and §1 is exact to the metre.
    assert.equal(rangeAt(BASTION.sigIdle, CHORISTER.hyd, WORKED_PF, contact), 3427, '§7: 3,428');
    assert.equal(
      rangeAt(FOUNDRY.sigActive, CHORISTER.hyd, TRENCH_PF, contact),
      7011,
      '§7: producing'
    );
    assert.equal(rangeAt(FOUNDRY.sigActive, CHORISTER.hyd, WORKED_PF, contact), 4546);
    assert.equal(
      rangeAt(HOLLOW.sigActive, CHORISTER.hyd, TRENCH_PF, contact),
      7403,
      '§7: a strike'
    );
    assert.equal(
      rangeAt(SOUNDER.sigActive, CHORISTER.hyd, TRENCH_PF, contact),
      10187,
      '§1: a call'
    );
    assert.equal(
      rangeAt(SOUNDER.sigActive, SUBMERSIBLE.hyd, TRENCH_PF, contact),
      11016,
      '§1: twice the map'
    );
    for (const range of [5286, 7011, 7403, 10187, 11016]) {
      assert.ok(range > SHALLOW_BAND.widthM, '§1: every rendering announces itself across the map');
    }
  });

  it('makes a hull the yard grows announce itself for twenty-seven seconds', () => {
    // §6, §7 — a hull is born at 600 m and must dive 1,200 m to reach the band
    // it was grown for, at a SIG floor of 72. The layer pays for the top of it;
    // the last seven hundred metres are the loud part, and by then the hull is
    // over the row.
    assert.equal(DEPTH.DESCENT_SIG, 72, '§6: seventy-two');
    assert.equal(DEPTH.DESCENT_RATE_MPS, 45);
    const dive = 1800 - CONSTRUCTION.WORKING_DEPTH_M;
    assert.equal(dive, 1200, '§6: a kilometre and two hundred');
    assert.equal(Number((dive / DEPTH.DESCENT_RATE_MPS).toFixed(1)), 26.7, '§6: 26.7 s');
    assert.ok(
      DEPTH.ASCENT_RATE_MPS < DEPTH.DESCENT_RATE_MPS,
      'descent is fast and loud, and nothing on this map climbs'
    );
    // §6 — "the layer pays for the top of it". Across the thermocline the pair
    // factor is 0.3, which is 0.471 on range, so a Hollow's Commit against a
    // diving hull shrinks from 342 m to 161 and a Sounder's from 353 to 166.
    const across = PROPAGATION_FACTOR[Biome.AbyssalTrench] * THERMOCLINE.ACROSS;
    const commitAt = (species: typeof HOLLOW, pf: number) =>
      rangeAt(
        DEPTH.DESCENT_SIG,
        species.hyd,
        pf,
        species.commit / DRIFT.DIRECTORATE_AGGRO_MULTIPLIER
      );
    assert.deepEqual([commitAt(HOLLOW, TRENCH_PF), commitAt(HOLLOW, across)], [342, 161], '§6');
    assert.deepEqual([commitAt(SOUNDER, TRENCH_PF), commitAt(SOUNDER, across)], [353, 166], '§6');
    // §6 — "Duct to outside is 1.0, not 0.3, so the discount stops [...] above
    // the layer rather than at it", and "the last seven hundred metres of the
    // dive are the loud part". Both fall out of the duct's top, which is one
    // hundred metres above the layer and not the two hundred §6 prints; the
    // seven hundred is what pins it, since 1,800 − 1,100 is the loud part.
    assert.equal(THERMOCLINE_DUCT_TOP_M, THERMOCLINE.DEPTH_M - 100, '§6: one hundred, not two');
    assert.equal(1800 - THERMOCLINE_DUCT_TOP_M, 700, '§6: the last seven hundred metres');
    // §6 — "The nearest Hollow to the spawn point is 2,122 m off and hears
    // nothing at all", which is why the loud part is over the row and not over
    // the wall that pays for it. 2,122 m is `hollow-four`; the nearest of the
    // six is `hollow-five` at 1,867, and §6's conclusion is untouched by the
    // correction, because a hull diving at 72 is Interest to a Hollow from
    // 451 m and the apron is four times that off the closest of them.
    const dx = SHALLOW_BAND.widthM / 2 - GROWER.x;
    const dy = SHALLOW_BAND.heightM / 2 - GROWER.y;
    const length = Math.hypot(dx, dy);
    const apron = {
      x: GROWER.x + (dx / length) * (FOUNDRY.radiusM + 60),
      y: GROWER.y + (dy / length) * (FOUNDRY.radiusM + 60),
    };
    const toApron = (tag: string) => {
      const beat = creatures.find((candidate) => candidate.tag === tag)!;
      return Math.hypot(beat.spawnAt!.x - apron.x, beat.spawnAt!.y - apron.y);
    };
    const hollowTags = creatures
      .filter((beat) => beat.species === FaunaSpecies.Hollow)
      .map((beat) => beat.tag);
    assert.equal(Math.round(toApron('hollow-four')), 2122, "§6: 2,122 m is `hollow-four`'s");
    const nearest = Math.min(...hollowTags.map(toApron));
    assert.equal(Math.round(nearest), 1867, '§6: and `hollow-five` is nearer than that');
    assert.ok(
      nearest > aggroRange(DEPTH.DESCENT_SIG, HOLLOW.hyd, HOLLOW.interest),
      '§6: the nearest Hollow hears nothing at all'
    );
  });
});

describe('what §13 says is missing, and what stands in its place', () => {
  it('approximates the summons and does not claim to have built it', () => {
    // §13 — "Trench Awakening, the ability: **Not built**. [...] nothing
    // *summons*, and a mission may not claim otherwise. The cheapest honest
    // approximation, used here: the summons is two authored `creature` beats
    // [...] plus the player's own ping, which the ladder already answers at
    // ×3." The difference is the whole difference: a ping summons to the
    // pinger and the ability summons to a point.
    assert.equal(
      ATTENDING_TRENCH_AWAKENING.commanderAbility,
      undefined,
      "§13: the shape a real one would take is mission-convocation.md §13's, and this is not it"
    );
    assert.equal(
      creatures.filter((beat) => beat.species === FaunaSpecies.Sounder).length,
      2,
      '§13: two authored arrivals, which is the whole of the summons the engine has'
    );
    assert.equal(
      creatures.filter((beat) => beat.species === undefined).length,
      1,
      '§13: and one beat that turns the first rather than spawning a third'
    );
    assert.equal(
      creatures.filter((beat) => beat.spawnAt !== undefined).length,
      8,
      '§5: eight animals, every one of them authored'
    );
    // The half the engine does have, and the price of using it: a Directorate
    // ping reads 114 to the Drift and commits a colossus from 834 m — toward
    // the emitter, which is the row.
    assert.equal(
      Math.round(
        ACTIVE_SONAR.EMITTER_SIG *
          ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER *
          DRIFT.DIRECTORATE_AGGRO_MULTIPLIER
      ),
      114,
      "§2: against the Directorate's ×0.4 that reads 114"
    );
    assert.equal(
      aggroRange(ACTIVE_SONAR.EMITTER_SIG, SOUNDER.hyd, SOUNDER.commit, true),
      834,
      '§2: and commits from 834 m, toward the emitter'
    );
  });

  it('leaves the grown cohort uncounted, and says so in the muster instead', () => {
    // §13 — "Roles are recorded at install and only for player-party hulls, so
    // *the cohort you grew* is not countable by `survive` or `extract`: §8's
    // muster is over the eight authored hulls and the document says so instead
    // of letting a player discover it at the close."
    const muster = objective('the-row').predicate;
    assert.ok(muster.kind === 'survive' && muster.count < 8, '§8: six of the eight seated');
    assert.ok(
      player.units.every((unit) => unit.role === 'yard'),
      '§8: one role, and the mission never marks a hull'
    );
    for (const party of ATTENDING_TRENCH_AWAKENING.parties) {
      if (party.slot === PLAYER) continue;
      for (const unit of party.units) {
        assert.equal(unit.role, undefined, 'a role on a scripted hull is another party in a count');
      }
    }
  });
});

describe('the tide, run out — docs/mission-trench-awakening.md §4, §6, §8, §9', () => {
  /**
   * The row, seated and given no orders at all.
   *
   * That is not a lazy fixture, it is §4's third movement played straight:
   * "the colossus takes the yard apart, the cohort renders the colossus for
   * nothing". The mission delivers the band into the middle of the row and
   * releases it there, so a row that never leaves its seats still finds out
   * what the trench answered with — and finds out what it cost, because the
   * thing that answered went to the loudest thing in the water on the way in.
   *
   * Deterministic: no orders, and the same reading on every seed.
   */
  function tide(seed: number) {
    const match = new Match(missionMapById(ATTENDING_TRENCH_AWAKENING.mapId)!, {
      mission: ATTENDING_TRENCH_AWAKENING,
      fauna: false,
      seed,
    });
    const lines: { tick: number; speaker: string; text: string }[] = [];
    let install: EchoSnapshot | undefined;
    let last: EchoSnapshot | undefined;
    for (let tick = 0; tick <= T(20, 30); tick++) {
      const own = match.update(1000 / SIM.TICK_HZ)?.get(PLAYER);
      if (own !== undefined) {
        install ??= own;
        last = own;
      }
      for (const line of match.takeMissionLines()) lines.push(line);
      if (match.missionOver !== null) break;
    }
    const over = match.missionOver;
    assert.ok(over !== null && install !== undefined && last !== undefined, 'the tide never ended');
    return { over, install, last, lines, resolvedAtTick: match.world.tick };
  }

  const run = tide(5);

  it('installs the row, the yard and the stock §5 gives it', () => {
    assert.equal(run.install.units.length, 8, '§5: eight hulls');
    assert.equal(run.install.structures.length, 3, '§5: a plant, a dome and a grower');
    assert.equal(run.install.nodules, 600, '§5: six hundred nodules');
    assert.equal(run.install.biomass, 0, '§6: and no Biomass, because nothing has been rendered');
    // §3 — six of capacity against a demand of four, so the line runs at full
    // rate from tick zero and the player never meets Thermal Draw as a
    // decision, only as the speed the line already runs at (§10).
    assert.deepEqual(run.install.draw, { capacity: 6, demand: 4, satisfaction: 1 });
  });

  it('spends the grower on the thing the yard called, and keeps the plant', () => {
    // §4, §9 — "the colossus takes the yard apart". The 13:00 line crosses the
    // Foundry and nothing else: the plant and the dome are still standing at
    // the close, which is what keeps `reap` from ending the row (§3, §13).
    assert.equal(run.last.structures.length, 2, '§9: the yard stops at about 13:38');
    assert.deepEqual(
      run.last.structures.map((structure) => structure.kind).sort(),
      [StructureKind.Bastion, StructureKind.Cantor].sort(),
      '§3: the plant and the dome, and no grower'
    );
    assert.equal(run.last.units.length, 8, '§6: every Chorister is invisible to it');
  });

  it('is paid the full two hundred and sixty, in the cell §6 says it dies in', () => {
    // §6 — "`the-first`, rendered after 14:30: **260**", and "`payBiomass`
    // reads the ledger at the animal's own position". It stops north of the
    // row in a cell nothing of the row's stands in, so the ledger has not
    // touched that cell and the rendering pays the roster's whole figure.
    assert.equal(run.last.biomass, SOUNDER.biomass, '§6: 260, and not the ledger’s discount of it');
    const from = park(SILL, AXIS_HEAD);
    const stop = park(from, THROUGH_THE_YARD);
    const cellIndex = (x: number, y: number) =>
      Math.floor((y / SHALLOW_BAND.heightM) * DRIFT.HEALTH_REGIONS) * DRIFT.HEALTH_REGIONS +
      Math.floor((x / SHALLOW_BAND.widthM) * DRIFT.HEALTH_REGIONS);
    assert.equal(
      run.last.driftHealth[cellIndex(stop.x, stop.y)],
      100,
      '§6: healthy ground, and a colossus over healthy ground pays 260'
    );
    // §3's own two rows, at the close: the dome's cell and the grower's cell
    // are dead, and the row was never told. "The mission never says so in
    // text. It says it in the pay slip."
    for (const structure of player.structures ?? []) {
      if (structure.kind === StructureKind.Bastion) continue;
      assert.equal(
        run.last.driftHealth[cellIndex(structure.x, structure.y)],
        0,
        `§3: the cell ${structure.tag} stands in is dead by 01:38 at the latest`
      );
    }
    assert.equal(
      run.last.driftHealth[cellIndex(1000, 1000)],
      100,
      '§3: and the plant’s own cell is under the threshold and recovers all tide'
    );
  });

  it('leaves the second standing, because nothing the row owns will move it', () => {
    // §5 — "It stands until the row makes it move, and the only things that
    // will are a ping at 834 m, a noisemaker at 347 m, or a hull inside
    // 196 m." A row that gave no orders offered it none of the three, so the
    // band is answered and `the-second` is not.
    assert.ok(run.last.biomass < 400, '§8: four hundred is not against the band');
    const second = run.over.objectives.find((o) => o.id === 'the-second')!;
    assert.equal(second.status, ObjectiveStatus.Pending, '§8: read out, and unmet');
    assert.match(run.over.epilogue, /Four hundred is not against the band\./, '§8, verbatim');
  });

  it('closes at 20:00 whatever the band did, and reads it as it stands', () => {
    // §8, §9 — `runsItsLength`. The band is answered at about 15:43 here and
    // the tide still ends at 20:00, because the second colossus arrives at
    // 16:30 whatever the register stands at.
    assert.equal(
      run.resolvedAtTick,
      T(20),
      '§9: the close does not move because the row was quick'
    );
    assert.equal(run.over.outcome, MissionOutcome.Complete, '§8: the band and the muster');
    assert.match(run.over.epilogue, /^The band is answered and the row is mustered\./);
    // §9's beat table and §12's two tally lines, in the order they land. Both
    // conditionals fire on the pass the colossus dies, because the stockpile
    // goes from nothing to 260 in one payment.
    const scheduled = run.lines.filter((line) => !line.text.startsWith('Rendered.'));
    assert.equal(scheduled.length, 11, '§9: ten scheduled lines and the ground’s band line');
    const tally = run.lines.filter(
      (line) => line.text.startsWith('Rendered.') || line.text.startsWith('The band is answered.')
    );
    assert.equal(tally.length, 2, '§9: the Cohort-Prime and the ground, once each');
    for (const line of tally) {
      assert.ok(line.tick > T(14, 30), '§9: nothing is rendered before the commitment lapses');
    }
  });

  it('reads the same tide on every seed, because nothing here is random', () => {
    // The Drift is authored and the row gives no orders, so the only thing a
    // seed could move is the skirmish fauna roster this mission switches off.
    for (const seed of [1, 11]) {
      const other = tide(seed);
      assert.equal(other.over.outcome, run.over.outcome, `seed ${seed}`);
      assert.equal(other.last.biomass, run.last.biomass);
      assert.equal(other.resolvedAtTick, run.resolvedAtTick);
      assert.deepEqual(other.last.driftHealth, run.last.driftHealth);
    }
  });
});
