/**
 * The Second Seeding 1, running — docs/mission-tend.md, against a live match.
 *
 * `missions.test.ts` reads the literal; this file lets the tide run. The
 * claims worth sixteen simulated minutes each:
 *
 * - **Tend cannot be failed** (§8). An untouched day resolves at 16:00 as a
 *   conclusion — the turning's reading always lands first — and is read with
 *   Marr's spent-day sentence, never as a loss. And an idle plateau is quiet
 *   enough: the sweep passes twice and files nothing.
 * - **The sweep files a working garden** (§6, §8): a tender parked on the
 *   drop lane during a pass latches *filed*, and the reading arrives with the
 *   tide — both sentences, because filed and unfiled cross with the work
 *   freely.
 * - **Silence stops the work** (§3; systems-echo.md §6): a carrier that goes
 *   silent mid-lift drops out of the authored floor and accrues nothing, and
 *   the cut resumes with the button.
 * - **The ground stands where it stood** (§11, #1148): drawn in shapes, every
 *   seat, marker, row, garden node, creature, order and mission region of
 *   both missions on the map, Tend's and Convocation's, is pinned to the
 *   §11 region under it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  DRIFT,
  FaunaSpecies,
  MARR_PLATEAU_FILED,
  MissionOutcome,
  PROPAGATION_FACTOR,
  SIM,
  TETHERJELLY_KELP_BAND,
  UnitKind,
  faunaStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { SEEDING_CONVOCATION, SEEDING_TEND } from '../src/sim/missions/index.ts';
import type { MissionDefinition } from '../src/sim/missions/index.ts';
import { Pathfinder } from '../src/sim/pathfinding.ts';
import { shapeContains } from '../src/sim/terrain.ts';
import { Fauna, Position } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = SEEDING_TEND.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** On the drop lane, in the first pass's path, at the plateau's own depth. */
const ON_THE_LANE = { x: 2000, y: 2000 };
/** Inside the West Lane, where the jelly re-seat runs. */
const IN_THE_LANE = { x: 750, y: 1400 };

function tendMatch(seed: number): Match {
  const map = missionMapById(SEEDING_TEND.mapId)!;
  return new Match(map, { mission: SEEDING_TEND, fauna: false, seed });
}

const MAP = missionMapById(SEEDING_TEND.mapId)!;
const TERRAIN = terrainFor(MAP);

/**
 * The §11 region that painted the cell under a point: the last whose shape
 * holds the cell's centre. Asked of the cell, never the point, because a
 * point inside a polygon's bounds can stand in a cell the polygon does not
 * claim (terrain.ts, `shapeContains`).
 */
function regionAt(x: number, y: number): string {
  const cx = (Math.floor(x / MAP.cellM) + 0.5) * MAP.cellM;
  const cy = (Math.floor(y / MAP.cellM) + 0.5) * MAP.cellM;
  let name = '';
  for (const region of MAP.regions) {
    if (shapeContains(region, cx, cy)) name = region.note!.split(' — ')[0]!;
  }
  return name;
}

function runOut(
  match: Match,
  drive?: (tick: number, own: EchoSnapshot | undefined) => void
): {
  outcome: MissionOutcome;
  epilogue: string;
  scenes: readonly string[];
  resolvedAtTick: number;
} {
  let last: EchoSnapshot | undefined;
  for (let tick = 0; tick <= T(16, 30); tick++) {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) last = own;
    drive?.(tick, last);
    match.takeMissionView();
    if (match.missionOver !== null) break;
  }
  const over = match.missionOver;
  assert.ok(over !== null, 'the tide never ended');
  return {
    outcome: over.outcome,
    epilogue: over.epilogue,
    scenes: over.scenes,
    resolvedAtTick: match.world.tick,
  };
}

describe('the tide, run out untouched — docs/mission-tend.md §8', () => {
  it('ends as a conclusion, read as a spent day and never as a loss', () => {
    const { outcome, epilogue, resolvedAtTick } = runOut(tendMatch(29));
    // The turning's terminal reading lands at fifteen-fifty whatever the day
    // did, so the count can never read zero — Tend cannot be failed.
    assert.equal(outcome, MissionOutcome.Partial, 'an untouched day read as something else');
    assert.match(epilogue, /Less came in than the bloom offered/);
    // And the sharp half of §6: a plateau that never pressed the button is
    // *not* still. The tenders idle at eighteen — the figure the hum is —
    // and the sweep's fifty is "enough to read a working garden", so a day
    // that ignored the stillness is filed. The custom is load-bearing, not
    // decorative: the reading arrives with both sentences.
    assert.match(epilogue, /The sweep heard us/, 'a plateau that never went still passed unheard');
    const closeS = resolvedAtTick / SIM.TICK_HZ;
    assert.ok(Math.abs(closeS - 16 * 60) <= 1, `the tide ended at ${closeS.toFixed(1)}s`);
  });

  it('passes unheard when the plateau goes still for both passes', () => {
    // The stillness, practised: every hull silent through each window, work
    // resumed between them — §9's day, minus the work. Unfiled is earnable,
    // or the mission's lesson would be a lie.
    const match = tendMatch(41);
    const silenced = new Set<number>();
    const { epilogue } = runOut(match, (tick, own) => {
      if (own === undefined) return;
      const inWindow =
        (tick >= T(5, 50) && tick <= T(9, 40)) || (tick >= T(11, 20) && tick <= T(14, 10));
      for (const unit of own.units) {
        if (inWindow && !silenced.has(unit.id)) {
          match.setSilentRunning(PLAYER, unit.id, true);
          silenced.add(unit.id);
        }
        if (!inWindow && silenced.has(unit.id)) {
          match.setSilentRunning(PLAYER, unit.id, false);
          silenced.delete(unit.id);
        }
      }
    });
    assert.doesNotMatch(epilogue, /The sweep heard us/, 'a still plateau was filed anyway');
  });
});

describe('the sweep — docs/mission-tend.md §6, §8', () => {
  it('files a garden that forgets itself, and the reading arrives with the tide', () => {
    // One tender is parked on the drop lane just before the first pass and
    // left there — the one sound on a charted lane. The day is read with both
    // sentences: the spent-day reading and the ledger's.
    const match = tendMatch(31);
    let tender = 0;
    const { epilogue } = runOut(match, (tick, own) => {
      if (own === undefined) return;
      if (tender === 0) {
        tender = own.units.find((u) => u.kind === UnitKind.Harvester)?.id ?? 0;
      }
      if (tender !== 0 && tick % (10 * SIM.TICK_HZ) === 0 && tick < T(8)) {
        match.orderMove(PLAYER, tender, ON_THE_LANE.x, ON_THE_LANE.y);
      }
    });
    assert.match(epilogue, /Less came in/, 'the base reading was replaced rather than appended');
    assert.match(epilogue, /The sweep heard us/, 'a working hull on the lane went unfiled');
  });

  it('names the scene it filed, and names it only when the reading is given', () => {
    // docs/campaign.md §1 (#378). The scene id is the machine-readable half of
    // the sentence above it, so the two are latched together or not at all —
    // a resolution that carried the scene without the reading would be the
    // client remembering something the player was never shown, and one that
    // gave the reading without the scene would leave *Thin Water* cold.
    const match = tendMatch(31);
    let tender = 0;
    const filed = runOut(match, (tick, own) => {
      if (own === undefined) return;
      if (tender === 0) {
        tender = own.units.find((u) => u.kind === UnitKind.Harvester)?.id ?? 0;
      }
      if (tender !== 0 && tick % (10 * SIM.TICK_HZ) === 0 && tick < T(8)) {
        match.orderMove(PLAYER, tender, ON_THE_LANE.x, ON_THE_LANE.y);
      }
    });
    assert.match(filed.epilogue, /The sweep heard us/);
    assert.deepEqual(filed.scenes, [MARR_PLATEAU_FILED]);
  });

  it('witnesses nothing on a day the sweep never heard', () => {
    // The stillness practised, as above — and a completed, quiet Tend leaves
    // the pair's later briefings exactly as they were authored. This is the
    // assertion that makes the set scene-keyed rather than mission-keyed.
    const match = tendMatch(41);
    const silenced = new Set<number>();
    const unfiled = runOut(match, (tick, own) => {
      if (own === undefined) return;
      const inWindow =
        (tick >= T(5, 50) && tick <= T(9, 40)) || (tick >= T(11, 20) && tick <= T(14, 10));
      for (const unit of own.units) {
        if (inWindow && !silenced.has(unit.id)) {
          match.setSilentRunning(PLAYER, unit.id, true);
          silenced.add(unit.id);
        }
        if (!inWindow && silenced.has(unit.id)) {
          match.setSilentRunning(PLAYER, unit.id, false);
          silenced.delete(unit.id);
        }
      }
    });
    assert.doesNotMatch(unfiled.epilogue, /The sweep heard us/);
    assert.deepEqual(unfiled.scenes, []);
  });
});

describe('silence stops the work — docs/mission-tend.md §3; systems-echo.md §6', () => {
  it('pauses a cut and lifts its floor while the carrier runs silent', () => {
    // The jelly lift is the legible case: the watch scout idles at six and
    // cuts at forty-five, so the floor is visible on its own meter — and the
    // button drops it to single digits, which is §3's sentence on the wire.
    const match = tendMatch(37);
    let scout = 0;
    let cuttingSig = 0;
    let silentSig = 100;
    let resumedSig = 0;
    let toggledOn = false;
    let toggledOff = false;

    // Sampled over windows rather than at exact ticks, because the snapshot
    // lands on the Echo cadence and the cut has its own arrival time. The
    // scout is ordered in on the first snapshot; the cut needs ninety held
    // seconds, so every window below sits inside it.
    for (let tick = 0; tick <= T(3); tick++) {
      const own = match.update(STEP_MS)?.get(PLAYER);
      match.takeMissionView();
      if (own === undefined) continue;
      if (scout === 0) {
        scout = own.units.find((u) => u.kind === UnitKind.LightScout)?.id ?? 0;
        if (scout !== 0) match.orderMove(PLAYER, scout, IN_THE_LANE.x, IN_THE_LANE.y);
        continue;
      }
      const unit = own.units.find((u) => u.id === scout);
      if (unit === undefined) continue;
      if (tick >= T(1) && tick <= T(1, 15)) cuttingSig = Math.max(cuttingSig, unit.sig);
      if (tick > T(1, 15) && !toggledOn) {
        toggledOn = true;
        match.setSilentRunning(PLAYER, scout, true);
      }
      if (tick >= T(1, 35) && tick <= T(1, 50)) silentSig = Math.min(silentSig, unit.sig);
      if (tick > T(1, 50) && !toggledOff) {
        toggledOff = true;
        match.setSilentRunning(PLAYER, scout, false);
      }
      if (tick >= T(2, 10) && tick <= T(2, 25)) resumedSig = Math.max(resumedSig, unit.sig);
    }

    assert.ok(cuttingSig >= 45, `mid-cut the scout read ${cuttingSig}, under the authored 45`);
    assert.ok(
      silentSig < 10,
      `silent, the scout still read ${silentSig} — the floor held through the button`
    );
    assert.ok(resumedSig >= 45, `the cut did not resume with the button — ${resumedSig}`);
  });
});

describe("the plateau's own Drift — docs/mission-tend.md §11; docs/bestiary.md §4", () => {
  /** Convocation's row 3 — the head's cluster sits on it to the metre. */
  const LANE_HEAD = { x: 500, y: 1125 };
  /** Convocation's row 4 — the lane's foot, outside every cluster's reach. */
  const LANE_FOOT = { x: 1125, y: 1625 };

  function drift(match: Match): { species: FaunaSpecies; eid: number }[] {
    const out: { species: FaunaSpecies; eid: number }[] = [];
    for (let eid = 0; eid <= match.world.maxEid; eid++) {
      if (!hasComponent(match.world, Fauna, eid)) continue;
      out.push({ species: Fauna.species[eid] as FaunaSpecies, eid });
    }
    return out;
  }

  it('seeds shoals through the Gardens and clusters along the West Lane, each in its band', () => {
    const match = tendMatch(41);
    // The 00:00 beats fire on the first step; a second is more than enough.
    for (let tick = 0; tick < SIM.TICK_HZ; tick++) match.update(STEP_MS);

    const shoals = drift(match).filter((c) => c.species === FaunaSpecies.Lampfry);
    const clusters = drift(match).filter((c) => c.species === FaunaSpecies.Tetherjelly);
    assert.equal(shoals.length, 4, '§11: four shoals on the farm rows');
    assert.equal(clusters.length, 3, "§11: three clusters along the lane's head");

    const shelf = faunaStatsFor(FaunaSpecies.Lampfry);
    for (const { eid } of shoals) {
      assert.equal(
        regionAt(Position.x[eid]!, Position.y[eid]!),
        'The Gardens',
        'a shoal outside the Gardens'
      );
      assert.ok(
        Math.abs(Position.depth[eid]! - shelf.workingDepthM) <= shelf.seedSpreadM,
        `§4: a shoal at ${Position.depth[eid]} m is outside the Shelf band`
      );
    }
    // The clusters rest in the *Kelp Forest* band, the one this map names —
    // 250 m ±50 m — and never the duct's 1,200 m, which this plateau does not
    // have. `homeDepth` is what the runtime holds a released animal at, so it
    // is the number that decides where a cluster actually lives.
    for (const { eid } of clusters) {
      assert.equal(
        regionAt(Position.x[eid]!, Position.y[eid]!),
        'The West Lane',
        'a cluster off the lane'
      );
      assert.ok(
        Math.abs(Position.depth[eid]! - TETHERJELLY_KELP_BAND.workingDepthM) <=
          TETHERJELLY_KELP_BAND.seedSpreadM,
        `§4: a cluster at ${Position.depth[eid]} m is outside the Kelp Forest band`
      );
      assert.equal(
        Fauna.homeDepth[eid],
        TETHERJELLY_KELP_BAND.workingDepthM,
        'a cluster whose home is the duct, on a map with no duct'
      );
    }
  });

  it("lowers the lane's PF by exactly one cluster at the head, and none at the foot", () => {
    const match = tendMatch(43);
    const kelp = PROPAGATION_FACTOR[Biome.KelpForest];
    for (let tick = 0; tick < SIM.TICK_HZ; tick++) match.update(STEP_MS);

    // Measurable, which the doc's "the lane is quieter for every day after"
    // requires and which a placed cluster used not to be: nothing rebuilt the
    // PF grid for a birth, so a mission's clusters masked nothing until an
    // unrelated rebuild happened along.
    const head = match.world.terrain.propagationAt(LANE_HEAD.x, LANE_HEAD.y);
    assert.ok(
      Math.abs(kelp - head - DRIFT.JELLY_PF_DELTA) < 1e-6,
      `§4: the head reads ${head} against a kelp baseline of ${kelp}; expected one −0.10`
    );
    // Convocation's row 4 is "the row the concern holds longest" because no
    // cluster reaches it: row 3 is the one row that is quiet on its own.
    const foot = match.world.terrain.propagationAt(LANE_FOOT.x, LANE_FOOT.y);
    assert.ok(Math.abs(foot - kelp) < 1e-6, `the foot reads ${foot}: a cluster reaches row 4`);
  });

  it('holds a released cluster in its Kelp Forest band rather than sending it to the duct', () => {
    const match = tendMatch(47);
    for (let tick = 0; tick < 10 * SIM.TICK_HZ; tick++) match.update(STEP_MS);
    for (const { eid } of drift(match).filter((c) => c.species === FaunaSpecies.Tetherjelly)) {
      // Ten seconds is 120 m of vertical travel at the Drift's speed: a
      // cluster homing on 1,200 m would already be on the lane's 300 m floor.
      assert.equal(
        Position.depth[eid],
        TETHERJELLY_KELP_BAND.workingDepthM,
        `a cluster drifted to ${Position.depth[eid]} m after release`
      );
    }
  });
});

describe('the ground both missions stand on — §11, drawn in shapes (#1148)', () => {
  // Marr Plateau is played by Tend and by Convocation, so this block pins both
  // missions' authored ground to §11's regions. Every point is read off the
  // mission literals and the map rather than retyped; what is stated here is
  // only the region each kind of point stands on.
  const MISSIONS_ON_MARR = [SEEDING_TEND, SEEDING_CONVOCATION];
  /** §11's floor under each region. No region on the plateau has a ceiling. */
  const FLOOR: Record<string, number> = {
    'The Terrace': 320,
    'The Gardens': 250,
    'The Holdfast': 280,
    'The West Lane': 300,
    'The Drop': 900,
    'The Face': 600,
    "Teel's Landing": 400,
  };
  const groundAt = (x: number, y: number) => [
    regionAt(x, y),
    TERRAIN.floorAt(x, y),
    TERRAIN.ceilingAt(x, y),
  ];
  const on = (region: string) => [region, FLOOR[region], 0];
  /**
   * Where each mission's markers, rows and regions stand: Tend's §11 prose and
   * regions, and Convocation's §11 row table, which puts the watch's edge in
   * the Face's north row, trench like the Drop around it.
   */
  const MARKED: Record<string, Record<string, string>> = {
    [SEEDING_TEND.id]: {
      holdfast: 'The Holdfast',
      'west-lane': 'The West Lane',
      landing: "Teel's Landing",
      gardens: 'The Gardens',
      ovens: 'The Holdfast',
    },
    [SEEDING_CONVOCATION.id]: {
      'row-one': 'The Gardens',
      'row-two': 'The Gardens',
      'row-three': 'The West Lane',
      'row-four': 'The West Lane',
      'row-five': 'The Terrace',
      'row-six': 'The Holdfast',
      'row-seven': 'The Terrace',
      'watch-edge': 'The Face',
      holdfast: 'The Holdfast',
    },
  };
  /** The Drift's three species, each in the water §11 places it. */
  const HOME: Partial<Record<FaunaSpecies, string>> = {
    [FaunaSpecies.Draymaw]: 'The Drop',
    [FaunaSpecies.Lampfry]: 'The Gardens',
    [FaunaSpecies.Tetherjelly]: 'The West Lane',
  };

  type Place = { what: string; x: number; y: number; depthM?: number; region: string };
  type Leg = { what: string; from: Place; to: Place; depthM?: number };
  /** Every authored point of a mission and every leg its beats drive, in order. */
  function authored(mission: MissionDefinition): {
    places: Place[];
    player: Place[];
    others: Place[];
    legs: Leg[];
  } {
    const marked = MARKED[mission.id]!;
    const player: Place[] = [];
    const others: Place[] = [];
    const legs: Leg[] = [];
    const last = new Map<string, Place>();
    for (const party of mission.parties) {
      const mine = party.slot === mission.playerSlot;
      for (const unit of party.units) {
        // The player's hulls seat at the Holdfast, Teel's guns east of it on the
        // open terrace; every other party waits on the drop.
        const region = !mine ? 'The Drop' : unit.role === 'guns' ? 'The Terrace' : 'The Holdfast';
        const place = { what: unit.tag, x: unit.x, y: unit.y, depthM: unit.depthM, region };
        (mine ? player : others).push(place);
        last.set(unit.tag, place);
      }
    }
    for (const marker of mission.markers) {
      player.push({
        what: `marker ${marker.id}`,
        x: marker.x,
        y: marker.y,
        region: marked[marker.id]!,
      });
    }
    for (const row of mission.walk?.rows ?? []) {
      player.push({ what: row.id, x: row.x, y: row.y, region: marked[row.id]! });
    }
    const ability = mission.commanderAbility;
    if (ability !== undefined) {
      player.push({
        what: ability.id,
        x: ability.x,
        y: ability.y,
        depthM: ability.depthM,
        region: 'The Holdfast',
      });
    }
    for (const beat of mission.beats) {
      if (beat.kind !== 'creature' && beat.kind !== 'move') continue;
      const when = `${beat.tag}@${beat.atTick / SIM.TICK_HZ / 60}`;
      if (beat.kind === 'creature') {
        const region = HOME[beat.species!]!;
        if (beat.spawnAt !== undefined) {
          const spawn = { what: `${when} spawn`, ...beat.spawnAt, region };
          others.push(spawn);
          last.set(beat.tag, spawn);
        }
        const from = last.get(beat.tag)!;
        const to = { what: `${when} drive`, x: beat.driveTo.x, y: beat.driveTo.y, region };
        others.push(to);
        legs.push({ what: when, from, to, depthM: from.depthM });
        last.set(beat.tag, { ...to, depthM: from.depthM });
      } else {
        // Convocation's orders all end on a row or on the Holdfast (§9); Tend's
        // are the sweep's two passes along the drop lane (§6).
        const ends = [...mission.markers, ...(mission.walk?.rows ?? [])].find(
          (at) => at.x === beat.x && at.y === beat.y
        );
        const from = last.get(beat.tag)!;
        const depthM = beat.depthM ?? from.depthM;
        const to = {
          what: `${when} order`,
          x: beat.x,
          y: beat.y,
          depthM,
          region: ends === undefined ? 'The Drop' : marked[ends.id]!,
        };
        others.push(to);
        legs.push({ what: when, from, to, depthM: from.depthM === depthM ? depthM : undefined });
        last.set(beat.tag, to);
      }
    }
    const spawn = MAP.spawns[0]!;
    player.push(
      { what: 'the spawn', x: spawn.x, y: spawn.y, region: 'The Holdfast' },
      {
        what: 'its Foundry',
        x: spawn.x + spawn.foundryOffsetX,
        y: spawn.y + spawn.foundryOffsetY,
        region: 'The Holdfast',
      },
      ...(MAP.blooms ?? []).map((bloom) => ({
        what: `the garden node at ${bloom.x},${bloom.y}`,
        x: bloom.x,
        y: bloom.y,
        region: 'The Gardens',
      }))
    );
    return { places: [...player, ...others], player, others, legs };
  }
  /** Every cell centre a mission region holds. */
  function cellsOf(mission: MissionDefinition, id: string): [number, number][] {
    const region = mission.regions.find((r) => r.id === id)!;
    const cells: [number, number][] = [];
    for (let y = MAP.cellM / 2; y < MAP.heightM; y += MAP.cellM) {
      for (let x = MAP.cellM / 2; x < MAP.widthM; x += MAP.cellM) {
        if (shapeContains(region, x, y)) cells.push([x, y]);
      }
    }
    return cells;
  }
  const along = (ax: number, ay: number, bx: number, by: number, n = 200): [number, number][] =>
    Array.from({ length: n + 1 }, (_, i) => [ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n]);

  it('stands every authored point of both missions on the §11 ground it stood on', () => {
    // 32 of Tend's own, 47 of Convocation's, and the spawn, its Foundry and the
    // three garden nodes under each.
    const counts = MISSIONS_ON_MARR.map((mission) => authored(mission).places.length);
    assert.deepEqual(counts, [37, 52], 'an authored point appeared or dropped out');
    for (const mission of MISSIONS_ON_MARR) {
      for (const place of authored(mission).places) {
        assert.deepEqual(
          groundAt(place.x, place.y),
          on(place.region),
          `${mission.id}: ${place.what} at ${place.x},${place.y}`
        );
        if (place.depthM !== undefined) {
          assert.ok(
            TERRAIN.admits(place.x, place.y, place.depthM),
            `${mission.id}: ${place.what} is in rock at ${place.depthM} m`
          );
        }
      }
    }
  });

  it('keeps every cell of every mission region on the region §11 paints under it', () => {
    const sizes: number[] = [];
    for (const mission of MISSIONS_ON_MARR) {
      let cells = 0;
      for (const region of mission.regions) {
        for (const [x, y] of cellsOf(mission, region.id)) {
          cells++;
          const expected = MARKED[mission.id]![region.id]!;
          assert.deepEqual(
            groundAt(x, y),
            on(expected),
            `${mission.id}: ${region.id} at ${x},${y}`
          );
        }
      }
      sizes.push(cells);
    }
    assert.deepEqual(sizes, [36, 8], "a mission region's cells grew or shrank");
  });

  it('drives every authored leg over the grounds it crossed in rectangles', () => {
    // The order of grounds along each leg that goes anywhere. A leg at one
    // depth also admits that depth all the way: the sweep at 550 m, the pack
    // at 890 m.
    const CROSSES: Record<string, string> = {
      'pack-a@0': 'The Drop',
      'pack-b@0': 'The Drop',
      'sweep-one@6': 'The Drop > The Face > The Drop',
      'sweep-two@6': 'The Drop',
      'sweep-one@11.5': 'The Drop > The Face > The Drop',
      'sweep-two@11.5': 'The Drop',
      'assert-one@3.5': 'The Drop > The West Lane > The Gardens',
      'assert-two@3.5': 'The Drop > The West Lane',
      'assert-one@6': 'The Gardens > The West Lane',
      'assert-two@7.5': 'The West Lane > The Terrace',
      'assert-heavy@9': 'The Drop > The Face > The Drop > The Terrace > The West Lane',
      'assert-one@11': 'The West Lane > The Terrace',
      'assert-two@11': 'The Terrace',
      'assert-heavy@13': 'The West Lane > The Terrace > The Holdfast',
    };
    const seen: string[] = [];
    for (const mission of MISSIONS_ON_MARR) {
      for (const leg of authored(mission).legs) {
        if (leg.from.x === leg.to.x && leg.from.y === leg.to.y) continue;
        seen.push(leg.what);
        const grounds: string[] = [];
        for (const [x, y] of along(leg.from.x, leg.from.y, leg.to.x, leg.to.y)) {
          if (grounds[grounds.length - 1] !== regionAt(x, y)) grounds.push(regionAt(x, y));
          if (leg.depthM !== undefined) {
            assert.ok(TERRAIN.admits(x, y, leg.depthM), `${leg.what} meets rock at ${x},${y}`);
          }
        }
        assert.equal(grounds.join(' > '), CROSSES[leg.what], `${mission.id}: ${leg.what}`);
      }
    }
    assert.equal(seen.length, 16, "the missions' authored legs grew or shrank");
    assert.deepEqual(new Set(seen), new Set(Object.keys(CROSSES)));
  });

  /** The three cells the reshape moved, with the region each is painted now. */
  const MOVED = [
    [125, 1875, 'The Terrace'],
    [125, 2125, 'The Terrace'],
    [2375, 1875, 'The Drop'],
  ] as const;
  const key = (x: number, y: number) => `${Math.floor(x / MAP.cellM)},${Math.floor(y / MAP.cellM)}`;
  const movedCells = new Set(MOVED.map(([x, y]) => key(x, y)));

  it('keeps the cells whose biome moved off every line from the player to another party', () => {
    // Two cells went from drop to terrace: the west edge column, the two rows
    // below the West Lane's foot. No line from a place either mission seats,
    // sends or holds the player to another party's authored position crosses
    // them. The Face's old corner is trench either way, and lines do cross it.
    for (const [x, y, region] of MOVED) assert.deepEqual(groundAt(x, y), on(region), `${x},${y}`);
    const kelpNow = new Set(
      MOVED.filter(([, , r]) => r === 'The Terrace').map(([x, y]) => key(x, y))
    );
    for (const mission of MISSIONS_ON_MARR) {
      const { player, others } = authored(mission);
      const from: (readonly [number, number])[] = [
        ...player.map((p) => [p.x, p.y] as const),
        ...mission.regions.flatMap((region) => cellsOf(mission, region.id)),
      ];
      for (const [ax, ay] of from) {
        for (const to of others) {
          for (const [x, y] of along(ax, ay, to.x, to.y, 400)) {
            assert.ok(
              !kelpNow.has(key(x, y)),
              `${mission.id}: ${ax},${ay} to ${to.what} crosses ${key(x, y)}`
            );
          }
        }
      }
    }
    // §11's biome budget: two cells of trench became kelp, and nothing else
    // changed biome.
    let kelp = 0;
    for (let y = MAP.cellM / 2; y < MAP.heightM; y += MAP.cellM) {
      for (let x = MAP.cellM / 2; x < MAP.widthM; x += MAP.cellM) {
        if (TERRAIN.biomeAt(x, y) === Biome.KelpForest) kelp++;
      }
    }
    assert.equal(kelp, 118, "the plateau's Kelp Forest grew or shrank");
  });

  it('keeps every scripted leg’s pathfinder route out of the cells that moved', () => {
    // A leg whose straight segment the ground refuses is played as a
    // `Pathfinder` route, which ends at the reachable cell closest to the goal
    // when the goal is out of reach, so a reshape can move a route whose
    // segment it never touched. Probed from points along each leg, every
    // 25 m down from the shallower of its two depths, and at the deeper one.
    //
    // One probe enters a moved cell, and it is listed rather than excused:
    // Convocation's 03:30 order to row two, probed at 315 m, where the West
    // Lane's 300 m floor refuses it and the terrace's 320 m admits it, routes
    // up the west edge through 0,7. That cell admitted 315 m as drop and
    // admits it as terrace, so the route is the one it was in rectangles; only
    // the water it crosses there changed, and in play no hull reaches it.
    const ENTERS = ['seeding-convocation assert-one@3.5 315 m 0,7'];
    const entered = new Set<string>();
    const pathfinder = new Pathfinder(MAP.widthM / MAP.cellM, MAP.heightM / MAP.cellM);
    const route: number[] = [];
    let probes = 0;
    for (const mission of MISSIONS_ON_MARR) {
      for (const leg of authored(mission).legs) {
        const a = leg.from.depthM!;
        const b = leg.to.depthM ?? a;
        const depths: number[] = [];
        for (let depth = Math.min(a, b); depth < Math.max(a, b); depth += 25) depths.push(depth);
        depths.push(Math.max(a, b));
        for (const depth of depths) {
          for (const [x, y] of along(leg.from.x, leg.from.y, leg.to.x, leg.to.y, 16)) {
            probes++;
            const points: [number, number][] = [[x, y]];
            if (!TERRAIN.segmentAdmits(x, y, leg.to.x, leg.to.y, depth)) {
              pathfinder.findPath(TERRAIN, x, y, leg.to.x, leg.to.y, depth, route);
              for (let i = 0; i < route.length; i += 2) points.push([route[i]!, route[i + 1]!]);
            }
            points.push([leg.to.x, leg.to.y]);
            for (let i = 1; i < points.length; i++) {
              const [px, py] = points[i - 1]!;
              const [qx, qy] = points[i]!;
              for (const [sx, sy] of along(px, py, qx, qy, 64)) {
                if (movedCells.has(key(sx, sy))) {
                  entered.add(`${mission.id} ${leg.what} ${depth} m ${key(sx, sy)}`);
                }
              }
            }
          }
        }
      }
    }
    assert.ok(probes > 1000, `only ${probes} probes`);
    assert.deepEqual([...entered], ENTERS, 'a scripted route enters a cell the reshape moved');
  });
});
