/**
 * The Ledger 3 — docs/mission-baffle.md, against a live match.
 *
 * `missions.test.ts` reads the literal; this file lets the writ run out and
 * states the claims the table cannot:
 *
 * - **The ping is finally on the table** (§3): the first mission in the
 *   campaign whose locks do not name `activeSonar`.
 * - **The escort is armed, the barge is not, and the picket is** (§3, §5) —
 *   the campaign's first combat against another navy, seated as authored.
 * - **The northern station goes off the chart at 13:00** (§7): a `lose` beat
 *   on a player structure, the first in the campaign, landing on the clock.
 * - **An idle convoy reads as the yard going dark** — the keystone: twenty
 *   minutes of warning, ignored, and the file opens. The column's reading
 *   reads "at cost", because a column that never stood off the yard was
 *   never out of the corridor.
 * - **The ground, drawn in shapes** (§11, #1143): every seat, leg, pocket and
 *   the berth on the ground §11 gives it, and the trench the only road.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Biome, FOURTH_CLOSURE_CONVOY, MissionOutcome, SIM } from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Owner, Structure, Unit, Weapon } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { LEDGER_BAFFLE } from '../src/sim/missions/index.ts';
import { shapeContains } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const hulls = defineQuery([Unit, Owner]);
const moored = defineQuery([Structure, Owner]);

interface Run {
  playerArmed: number;
  playerHulls: number;
  picketArmed: number;
  stationsBefore: number;
  stationsAfter: number;
  resolvedAtTick: number;
  outcome: MissionOutcome | null;
  epilogue: string | null;
  scenes: readonly string[];
  lines: { tick: number; text: string }[];
}

let memo: Run | null = null;

function run(): Run {
  if (memo !== null) return memo;
  const map = missionMapById(LEDGER_BAFFLE.mapId)!;
  const match = new Match(map, { mission: LEDGER_BAFFLE, fauna: false, seed: 31 });

  let playerArmed = 0;
  let playerHulls = 0;
  let picketArmed = 0;
  for (const eid of hulls(match.world)) {
    const armed = hasComponent(match.world, Weapon, eid);
    if (Owner.slot[eid] === LEDGER_BAFFLE.playerSlot) {
      playerHulls++;
      if (armed) playerArmed++;
    } else if (armed) {
      picketArmed++;
    }
  }

  const stations = (): number => {
    let count = 0;
    for (const eid of moored(match.world)) {
      if (Owner.slot[eid] === LEDGER_BAFFLE.playerSlot) count++;
    }
    return count;
  };

  const stationsBefore = stations();
  let stationsAfter = stationsBefore;
  let resolvedAtTick = 0;
  const lines: Run['lines'] = [];
  for (let tick = 0; tick <= T(20, 30); tick++) {
    match.update(STEP_MS);
    lines.push(...match.takeMissionLines());
    if (tick === T(13, 10)) stationsAfter = stations();
    if (match.missionOver !== null) {
      resolvedAtTick = match.world.tick;
      break;
    }
  }

  memo = {
    playerArmed,
    playerHulls,
    picketArmed,
    stationsBefore,
    stationsAfter,
    resolvedAtTick,
    outcome: match.missionOver?.outcome ?? null,
    epilogue: match.missionOver?.epilogue ?? null,
    scenes: match.missionOver?.scenes ?? [],
    lines,
  };
  return memo;
}

describe('the writ, run out — docs/mission-baffle.md §7, §8, §9', () => {
  it('hands the ping over: the first campaign mission that does not lock it', () => {
    assert.ok(
      LEDGER_BAFFLE.locks.every((lock) => lock.ability !== 'activeSonar'),
      'campaign.md §10 hands the ping over at mission 3, and the locks still withhold it'
    );
  });

  it('arms the escort and the picket, and neither barge nor stations', () => {
    assert.equal(run().playerHulls, 4, 'the convoy is three escorts and the barge');
    assert.equal(run().playerArmed, 3, 'the writ arms the escorts, and only the escorts');
    assert.equal(run().picketArmed, 4, 'two standing watches of two, all armed');
  });

  it('takes the northern station off the chart at thirteen minutes', () => {
    assert.equal(run().stationsBefore, 2, 'two stations moored at the lay-bys');
    assert.equal(run().stationsAfter, 1, 'the correction landed on the clock');
  });

  it('reads an idle convoy as the yard going dark, at the whistle', () => {
    assert.equal(run().outcome, MissionOutcome.Lost, 'the keystone is the plant');
    assert.match(run().epilogue ?? '', /plant fails on schedule/);
    assert.match(run().epilogue ?? '', /entered at cost/);
    const closeS = run().resolvedAtTick / SIM.TICK_HZ;
    assert.ok(
      Math.abs(closeS - 20 * 60) <= 1,
      `the writ closed at ${closeS.toFixed(1)}s against the authored 1200s`
    );
  });

  it('carries the convoy hearing from the spoken closure even when the relief is lost', () => {
    assert.deepEqual(run().scenes, [FOURTH_CLOSURE_CONVOY]);
    const line = run().lines.find((line) => line.text.startsWith('The trench is closed'));
    assert.equal(line?.tick, T(4));
  });
});

describe('the ground the writ stands on — §11, drawn in shapes (#1143)', () => {
  // Asked of the cell, never the point: a point inside a polygon can stand in
  // a cell the polygon does not claim (terrain.ts, `shapeContains`).
  const map = missionMapById(LEDGER_BAFFLE.mapId)!;
  const terrain = terrainFor(map);
  const cellM = map.cellM;
  const centre = (m: number) => (Math.floor(m / cellM) + 0.5) * cellM;
  /** The region that painted the cell under a point: the last whose shape holds its centre. */
  const regionAt = (x: number, y: number): string => {
    let name = '';
    for (const region of map.regions) {
      if (shapeContains(region, centre(x), centre(y))) name = region.note!.split(' — ')[0]!;
    }
    return name;
  };
  const groundAt = (x: number, y: number) => [regionAt(x, y), terrain.floorAt(x, y)];
  const party = (slot: number) => LEDGER_BAFFLE.parties.find((p) => p.slot === slot)!;
  const convoy = party(LEDGER_BAFFLE.playerSlot);
  const picket = LEDGER_BAFFLE.parties.find((p) =>
    p.units.some((u) => u.tag.startsWith('picket'))
  )!;
  const moves = LEDGER_BAFFLE.beats.flatMap((b) => (b.kind === 'move' ? [b] : []));
  const pack = LEDGER_BAFFLE.beats.flatMap((b) => (b.kind === 'creature' ? [b] : []));

  it('musters the convoy on the staging and moors the stations in the pockets', () => {
    const spawn = map.spawns[0]!;
    assert.deepEqual(groundAt(spawn.x, spawn.y), ['The Staging', 1100], 'the spawn');
    for (const unit of convoy.units) {
      assert.deepEqual(groundAt(unit.x, unit.y), ['The Staging', 1100], unit.tag);
    }
    const [north, south] = convoy.structures!;
    assert.deepEqual(groundAt(north!.x, north!.y), ['Lay-by One', 1700], north!.tag);
    assert.deepEqual(groundAt(south!.x, south!.y), ['Lay-by Two', 1700], south!.tag);
    for (const station of [north!, south!]) {
      assert.ok(terrain.admits(station.x, station.y, station.depthM), station.tag);
    }
  });

  it('stands the picket, its legs and the pack in the trench, in both its columns', () => {
    // §11: the trench is a box because every cell of it is the road — both
    // watches' legs and the pack's drive run in both columns.
    const columns = new Set<number>();
    for (const at of [...picket.units, ...moves, ...pack.flatMap((b) => [b.spawnAt!, b.driveTo])]) {
      assert.deepEqual(groundAt(at.x, at.y), ['The Trench', 1700], `${at.x},${at.y}`);
      columns.add(Math.floor(at.x / cellM));
    }
    assert.deepEqual([...columns].sort(), [5, 6], 'the road is two columns wide');
    assert.equal(moves.length, 16, "the watches' filed legs grew or shrank");
    for (const beat of pack) {
      // The pack's drive is a straight line up the axis; every cell of it is
      // trench water at the depth it was given.
      const { spawnAt, driveTo } = beat;
      for (let i = 0; i <= 100; i++) {
        const x = spawnAt!.x + ((driveTo.x - spawnAt!.x) * i) / 100;
        const y = spawnAt!.y + ((driveTo.y - spawnAt!.y) * i) / 100;
        assert.equal(regionAt(x, y), 'The Trench', `${beat.tag} leaves the trench at ${x},${y}`);
        assert.ok(terrain.admits(x, y, spawnAt!.depthM), `${beat.tag} at ${x},${y}`);
      }
    }
  });

  it("delivers to exactly the cells the Deep Yard paints, where the plant's sound is", () => {
    const berth = LEDGER_BAFFLE.regions.find((r) => r.id === 'yard-berth')!;
    for (let y = cellM / 2; y < map.heightM; y += cellM) {
      for (let x = cellM / 2; x < map.widthM; x += cellM) {
        assert.equal(
          shapeContains(berth, x, y),
          regionAt(x, y) === 'The Deep Yard',
          `the cell at ${x},${y} is on one of the two and not the other`
        );
      }
    }
    const plant = LEDGER_BAFFLE.parties.flatMap((p) => p.emitters ?? [])[0]!;
    assert.deepEqual(groundAt(plant.x, plant.y), ['The Deep Yard', 1650], plant.tag);
  });

  it('runs the road from the staging down the trench to the yard, the pockets off it in order', () => {
    // Down either column of the trench the ground is the staging, the trench,
    // the yard and the margin's last row, in that order and nothing between.
    for (const x of [1375, 1625]) {
      const order: string[] = [];
      for (let y = cellM / 2; y < map.heightM; y += cellM) {
        const region = regionAt(x, y);
        if (order.at(-1) !== region) order.push(region);
      }
      assert.deepEqual(
        order,
        ['The Staging', 'The Trench', 'The Deep Yard', 'The Margin'],
        `x=${x}`
      );
    }
    // Lay-by One opens off the west column at y 1,750–2,000, and Lay-by Two
    // off the east at 3,000–3,250.
    assert.deepEqual(groundAt(1125, 1875), ['Lay-by One', 1700]);
    assert.deepEqual(groundAt(1875, 3125), ['Lay-by Two', 1700]);
  });

  it('walls the trench, so it is the only road from the staging south', () => {
    // Rock beside both columns on every row from the apron to the yard but
    // the two pockets, which have rock on their other three sides.
    const solid = (x: number, y: number) =>
      [0, 1000, 1450, 1600, 1700].every((d) => !terrain.admits(x, y, d));
    for (let y = 875; y < 4250; y += cellM) {
      for (const x of [1125, 1875]) {
        const pocket = (x === 1125 && y === 1875) || (x === 1875 && y === 3125);
        assert.equal(solid(x, y), !pocket, `the trench's wall at ${x},${y}`);
      }
    }
    for (const [x, y, out] of [
      [1125, 1875, 875],
      [1875, 3125, 2125],
    ] as const) {
      for (const [nx, ny] of [
        [out, y],
        [x, y - cellM],
        [x, y + cellM],
      ] as const) {
        assert.ok(solid(nx, ny), `the pocket at ${x},${y} opens at ${nx},${ny}`);
      }
    }
    // At every depth, water reached from the staging without entering the
    // trench never leaves the staging's three rows.
    for (let depth = 0; depth <= 3000; depth += 50) {
      const seen = new Set<string>();
      const queue: [number, number][] = [];
      for (let x = cellM / 2; x < map.widthM; x += cellM) {
        if (!terrain.admits(x, cellM / 2, depth)) continue;
        seen.add(`${x},${cellM / 2}`);
        queue.push([x, cellM / 2]);
      }
      while (queue.length > 0) {
        const [x, y] = queue.shift()!;
        assert.ok(y < 750, `the staging leaks south at ${x},${y} at ${depth} m`);
        for (const [nx, ny] of [
          [x + cellM, y],
          [x - cellM, y],
          [x, y + cellM],
          [x, y - cellM],
        ] as const) {
          if (nx < 0 || ny < 0 || nx >= map.widthM || ny >= map.heightM) continue;
          if (seen.has(`${nx},${ny}`) || regionAt(nx, ny) === 'The Trench') continue;
          if (!terrain.admits(nx, ny, depth)) continue;
          seen.add(`${nx},${ny}`);
          queue.push([nx, ny]);
        }
      }
    }
  });

  it("opens the walls' feet to the margin's 1,450 m and no deeper", () => {
    // §11: twelve cells at the walls' seaward ends are the margin's open water
    // at 1,450 m, the same Open Water the rock is painted in, so no cell's PF
    // moved. They admit a hull at 1,450 m and nothing deeper, and they climb
    // no higher up the walls than y 3,500.
    const feet: string[] = [];
    for (let y = 875; y < 4250; y += cellM) {
      for (let x = cellM / 2; x < map.widthM; x += cellM) {
        if (regionAt(x, y) !== 'The Margin') continue;
        feet.push(`${x},${y}`);
        assert.equal(terrain.biomeAt(x, y), Biome.OpenWater);
        assert.ok(terrain.admits(x, y, 1450) && !terrain.admits(x, y, 1451), `${x},${y}`);
        assert.ok(y >= 3500, `the margin climbs the wall to ${x},${y}`);
      }
    }
    assert.equal(feet.length, 12, '§11: six at the foot of each wall');
  });
});
