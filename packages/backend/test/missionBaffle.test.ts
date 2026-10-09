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
 * - **The pack runs the axis at 1,600 m** (§5, #1212): held there for its
 *   drive, under the layer to the whistle, and fighting nothing on the way in
 *   an idle run. Released at that depth, it bites an escort waiting there.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  FaunaSpecies,
  FOURTH_CLOSURE_CONVOY,
  MissionOutcome,
  SIM,
  THERMOCLINE,
  faunaStatsFor,
} from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Fauna, Health, Owner, Position, Structure, Unit, Weapon } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { LEDGER_BAFFLE } from '../src/sim/missions/index.ts';
import { shapeContains } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const hulls = defineQuery([Unit, Owner]);
const moored = defineQuery([Structure, Owner]);
const hounds = defineQuery([Fauna, Position, Health]);
const whole = defineQuery([Owner, Health]);

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
  /** Every hound, read every five seconds from the pack's arrival to the close. */
  pack: { tick: number; depths: number[]; driven: boolean[]; hp: number[] }[];
  /** Every hull, structure and emitter that lost hull, or was lost, from the pack's arrival on. */
  hurt: string[];
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
  const pack: Run['pack'] = [];
  const arrival = new Map<number, number>();
  const hurt: string[] = [];
  for (let tick = 0; tick <= T(20, 30); tick++) {
    match.update(STEP_MS);
    lines.push(...match.takeMissionLines());
    if (tick === T(13, 10)) stationsAfter = stations();
    const now = match.world.tick;
    if (now === T(18, 30)) {
      for (const eid of whole(match.world)) {
        if (!hasComponent(match.world, Fauna, eid)) arrival.set(eid, Health.hp[eid]!);
      }
    }
    if (now >= T(18, 30) && (now - T(18, 30)) % (5 * SIM.TICK_HZ) === 0) {
      const alive = [...hounds(match.world)];
      pack.push({
        tick: now,
        depths: alive.map((eid) => Position.depth[eid]!),
        driven: alive.map((eid) => Fauna.driven[eid] === 1),
        hp: alive.map((eid) => Health.hp[eid]!),
      });
    }
    if (match.missionOver !== null) {
      resolvedAtTick = now;
      break;
    }
  }
  for (const [eid, hp] of arrival) {
    // A lost hull is reaped, so it is counted by its absence.
    const left = hasComponent(match.world, Health, eid) ? Health.hp[eid]! : 0;
    if (left < hp) hurt.push(`slot ${Owner.slot[eid]}'s ${eid}: ${hp} to ${left}`);
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
    pack,
    hurt,
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

describe('the pack, as docs/mission-baffle.md §5 drives it (#1212)', () => {
  const pack = LEDGER_BAFFLE.beats.flatMap((beat) => (beat.kind === 'creature' ? [beat] : []));

  it("drives every hound at 1,600 m rather than at the species' own, to 19:30", () => {
    // The trap `types.ts` names: a drive without a depth holds the species'
    // working depth, and a Draymaw's is 900 m, above the layer.
    assert.equal(faunaStatsFor(FaunaSpecies.Draymaw).workingDepthM, 900);
    assert.equal(pack.length, 3, '§5: one pack');
    for (const beat of pack) {
      assert.equal(beat.species, FaunaSpecies.Draymaw);
      assert.equal(beat.atTick, T(18, 30), '§9: the pack arrives at 18:30');
      assert.equal(beat.spawnAt?.depthM, 1600, `${beat.tag}, spawned on the axis`);
      assert.equal(beat.driveTo.depthM, 1600, `${beat.tag}, and held there`);
      // Released before the whistle, because §9's pack commits to the loudest
      // hull in reach, and a driven creature never listens (`runtime.ts`).
      assert.equal(beat.untilTick, T(19, 30), `${beat.tag}, released at 19:30`);
      assert.equal(beat.loud, true, '§8: the telegraph');
    }
  });

  it('holds the axis under the layer to the whistle, and fights nothing on the way', () => {
    // An idle convoy, read every five seconds. Before #1212 the pack climbed
    // toward 900 m from the moment it was driven, and crossed the layer at 19:03.
    const { pack: samples, hurt } = run();
    assert.equal(samples.at(0)?.tick, T(18, 30), 'the premise: read from the arrival');
    assert.equal(samples.at(-1)?.tick, T(20), 'the premise: read to the whistle');
    for (const { tick, depths, driven, hp } of samples) {
      const s = tick / SIM.TICK_HZ;
      const at = `at ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      assert.equal(depths.length, 3, `every hound alive ${at}`);
      assert.ok(
        hp.every((left) => left === faunaStatsFor(FaunaSpecies.Draymaw).maxHp),
        `a hound took hull ${at}`
      );
      if (tick <= T(19, 30)) {
        assert.deepEqual(depths, [1600, 1600, 1600], `the pack's depth ${at}`);
      } else {
        // Released: the rider's climb home, still under the layer.
        assert.ok(
          driven.every((held) => !held),
          `the pack is still driven ${at}`
        );
        for (const depth of depths) {
          assert.ok(depth < 1600 && depth > THERMOCLINE.DEPTH_M, `a hound at ${depth} m ${at}`);
        }
      }
    }
    assert.deepEqual(hurt, [], 'a hull lost hull between the pack arriving and the whistle');
  });

  it('bites an escort waiting where it is released, and only once it is released', () => {
    // The price of releasing it at depth. Driven, the pack never listens;
    // released at 1,600 m beside hulls at 1,650 m, it bites them until its
    // climb home carries it out of a Draymaw's 160 m reach, about ten seconds.
    // Climbing toward 900 m, as before #1212, it could not reach them at all.
    const seats = new Map([
      ['flagship', { x: 1500, y: 2620 }],
      ['corvette-1', { x: 1450, y: 2600 }],
      ['corvette-2', { x: 1550, y: 2600 }],
    ]);
    const mission = {
      ...LEDGER_BAFFLE,
      parties: LEDGER_BAFFLE.parties.map((party) => ({
        ...party,
        units: party.units.map((unit) => {
          const seat = seats.get(unit.tag);
          return seat === undefined ? unit : { ...unit, ...seat, depthM: 1650 };
        }),
      })),
    };
    const map = missionMapById(mission.mapId)!;
    const match = new Match(map, { mission, fauna: false, seed: 31 });
    const escort = () =>
      [...hulls(match.world)]
        .filter(
          (eid) => Owner.slot[eid] === mission.playerSlot && hasComponent(match.world, Weapon, eid)
        )
        .reduce((sum, eid) => sum + Health.hp[eid]!, 0);
    const full = escort();
    let released = 0;
    while (match.missionOver === null) {
      match.update(STEP_MS);
      match.takeMissionView();
      if (match.world.tick === T(19, 30)) released = escort();
    }
    assert.equal(released, full, 'the driven pack, or the picket, took hull before 19:30');
    assert.ok(escort() < released, 'the released pack never bit the escort beside it');
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
        assert.ok(terrain.admits(x, y, driveTo.depthM!), `${beat.tag} at ${x},${y}`);
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
