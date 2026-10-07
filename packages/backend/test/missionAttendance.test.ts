/**
 * The Attending 1, running — docs/mission-attendance.md, against a live match.
 *
 * `missions.test.ts` reads the literal; this file attends the watch. The claims
 * worth eighteen simulated minutes are the ones §6 and §8 make about the shape
 * of the shift, and they are the mission:
 *
 * - **A watch that never moves attends seven of the nine** (§6's own spine),
 *   owes nothing, and is read "You were sufficient" — the middle reading, and
 *   the highest praise the register has (§8).
 * - **The whole cycle costs a breach** (§8). One hull sent down the channel
 *   between arrivals takes the two the seated band cannot reach, and the shift
 *   runs a debt doing it, inside the forty-five second cap §5 sets.
 * - **The close assembles rather than chooses** (§13's last ask): nine lines,
 *   one per arrival, entered or gap, under whichever reading the count earned.
 * - **The best ears in the Rift, pointed at the one thing that does not
 *   resolve** (§4). The watch reaches Tier 3 and Tier 4 on the arrivals and
 *   learns nothing by it: there is no kind and no faction to name.
 * - **The ground holds under the shapes** (§11, #1149). Every seat, the dome,
 *   every arrival and both mission regions stand on the ground they stood on
 *   in rectangles, the whole-cycle drive's orders route as they did, and an
 *   idle watch plays the same tracks.
 *
 * Two drives, memoised. Nobody is chasing the player in either, which is the
 * mission.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { defineQuery } from 'bitecs';
import { Biome, MissionOutcome, SIM, type EchoSnapshot, type MissionView } from '@echoes/shared';
import { Health, Position } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import type { MapDefinition, MapRect } from '../src/sim/maps/types.ts';
import { ATTENDING_ATTENDANCE, MISSIONS } from '../src/sim/missions/index.ts';
import { Pathfinder } from '../src/sim/pathfinding.ts';
import { shapeContains } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = ATTENDING_ATTENDANCE.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** Down the axis, where the approach and the sill arrive (§6, rows 6 and 8). */
const APPROACH = { x: 2500, y: 3400 };
const SILL = { x: 2500, y: 3875 };

interface Run {
  outcome: MissionOutcome;
  epilogue: string;
  /** The transcript's lines, under the reading. */
  lines: string[];
  peakDebtS: number;
  resolvedAtTick: number;
  /** Whether any contact the player ever held named a kind or a faction. */
  anythingClassified: boolean;
  /** The best tier the player ever reached on anything. */
  bestTier: number;
}

/**
 * Drive the watch for a whole shift.
 *
 * Orders are issued off a tick rather than off a snapshot, because snapshots
 * land on the Echo tick and an order placed only on those ticks would miss the
 * ones this mission is timed against. The hull ids are taken from the first
 * snapshot and then held: they are the player's own force and it never changes.
 */
function play(drive: (match: Match, tick: number, ids: number[]) => void): Run {
  const map = missionMapById(ATTENDING_ATTENDANCE.mapId)!;
  const match = new Match(map, { mission: ATTENDING_ATTENDANCE, fauna: false, seed: 5 });
  let ids: number[] = [];
  let peakDebtS = 0;
  let anythingClassified = false;
  let bestTier = 0;

  for (let tick = 0; tick <= T(18, 30); tick++) {
    const own = match.update(STEP_MS)?.get(PLAYER) as EchoSnapshot | undefined;
    if (own !== undefined) {
      if (ids.length === 0) ids = own.units.map((u) => u.id).sort((a, b) => a - b);
      for (const contact of own.contacts) {
        if (contact.tier > bestTier) bestTier = contact.tier;
        if (contact.kind !== undefined || contact.faction !== undefined) anythingClassified = true;
      }
    }
    if (ids.length > 0) drive(match, tick, ids);
    const view = match.takeMissionView() as MissionView | null;
    if (view !== null) peakDebtS = Math.max(peakDebtS, view.debtS);
    if (match.missionOver !== null) break;
  }

  const over = match.missionOver;
  assert.ok(over !== null, 'the watch never ended');
  const [reading, ...rest] = over.epilogue.split('\n');
  return {
    outcome: over.outcome,
    epilogue: reading ?? '',
    lines: rest.filter((line) => line.trim().length > 0),
    peakDebtS,
    resolvedAtTick: match.world.tick,
    anythingClassified,
    bestTier,
  };
}

let seatedRun: Run | null = null;
function seated(): Run {
  seatedRun ??= play(() => {});
  return seatedRun;
}

let detachedRun: Run | null = null;
function detached(): Run {
  // One hull down the channel and back to nothing — sent *between* arrivals,
  // which is the whole craft of it: the debt runs while it travels, the dome
  // is withdrawn while the debt stands, and neither window overlaps an arrival
  // the seated three are holding at the band's edge.
  detachedRun ??= play((match, tick, ids) => {
    if (tick === T(8, 20)) match.orderMove(PLAYER, ids[0]!, APPROACH.x, APPROACH.y);
    if (tick === T(10, 30)) match.orderMove(PLAYER, ids[0]!, SILL.x, SILL.y);
  });
  return detachedRun;
}

describe('the watch, seated — docs/mission-attendance.md §6, §8', () => {
  it('attends seven of the nine and owes nothing', () => {
    // §6: "A watch that never moves attends seven of the nine." The
    // seated band reaches every arrival at the head and neither of the two
    // down the channel, and a watch that never travels never shoves.
    const run = seated();
    assert.equal(run.lines.filter((l) => l.startsWith('Entered:')).length, 7);
    assert.equal(run.peakDebtS, 0, 'a watch that never moved ran a silence debt');
  });

  it('is read sufficient, which is the highest praise the register has', () => {
    const run = seated();
    assert.equal(run.outcome, MissionOutcome.Partial);
    assert.match(run.epilogue, /^You were sufficient\./);
  });

  it('enters the approach and the sill as gaps, and nothing else', () => {
    // §6 rows 6 and 8: the two the transcript's last line costs. The gap is
    // entered too, "which is the transcript's own convention and not a
    // punishment invented for a game".
    const gaps = seated()
      .lines.filter((line) => line.startsWith('Not entered:'))
      .join(' ');
    assert.match(gaps, /arrival six/);
    assert.match(gaps, /arrival eight/);
    assert.equal(seated().lines.filter((l) => l.startsWith('Not entered:')).length, 2);
  });

  it('closes at eighteen minutes as a conclusion, not a timer', () => {
    // §8: the cycle does not end, the watch does, and the next trench takes
    // it. One Echo interval of slack, because the runtime resolves at 5 Hz.
    const closeS = seated().resolvedAtTick / SIM.TICK_HZ;
    assert.ok(Math.abs(closeS - 18 * 60) <= 1, `the watch ended at ${closeS.toFixed(1)}s`);
  });
});

describe('the whole cycle costs a breach — §8', () => {
  it('attends nine of nine when a hull goes down the channel for them', () => {
    const run = detached();
    assert.equal(run.lines.filter((l) => l.startsWith('Entered:')).length, 9);
    assert.equal(run.outcome, MissionOutcome.Complete);
    assert.match(run.epilogue, /^Nine of nine\./);
  });

  it('runs a silence debt doing it, inside the cap the rite sets', () => {
    // §5: the ledger's mechanical price is small and deliberately so — its
    // real price is that it is written down. What the test holds is that the
    // price is *paid*: the whole cycle is not available for nothing.
    const run = detached();
    assert.ok(run.peakDebtS > 0, 'the whole cycle came free of any debt at all');
    assert.ok(
      run.peakDebtS <= ATTENDING_ATTENDANCE.debtCapS,
      `debt reached ${run.peakDebtS}s against a cap of ${ATTENDING_ATTENDANCE.debtCapS}s`
    );
  });
});

describe('the transcript, assembled — §12, §13', () => {
  it('reads back every arrival in authored order, entered or gap', () => {
    // The close assembles rather than chooses: one authored line per arrival,
    // and the run picks which of the two it was.
    const run = seated();
    assert.equal(run.lines.length, 9);
    const ordinals = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    for (const [index, line] of run.lines.entries()) {
      assert.match(line, new RegExp(`arrival ${ordinals[index]!}\\b`), `line ${index + 1}`);
    }
  });
});

describe('the one thing that does not resolve — §4', () => {
  it('reaches classification and learns nothing by it', () => {
    // §4: a listener close enough will reach Tier 3 and Tier 4 on the return
    // and will learn nothing more, because the emitter carries a position and
    // a depth and no kind and no faction. The Directorate's taboo, rendered
    // exactly by the format's emitters rather than by a rule this mission adds.
    const run = seated();
    assert.ok(run.bestTier >= 3, `the watch never reached classification (best ${run.bestTier})`);
    assert.ok(!run.anythingClassified, 'an arrival named a kind or a faction');
  });
});

describe('the ground the watch stands on — §11, drawn in shapes (#1149)', () => {
  // The regions as 30fd60c8 drew them, before #1149 redrew the Step and both
  // benches in shapes: written out rather than read from the literal, so the
  // reference cannot move with the map it checks.
  const RECTANGLES: MapRect[] = [
    { x: 0, y: 0, widthM: 5000, heightM: 4000, biome: Biome.AbyssalTrench, floorM: 3400 },
    { x: 0, y: 0, widthM: 5000, heightM: 750, biome: Biome.CoralRuins, floorM: 2750 },
    { x: 1250, y: 750, widthM: 2500, heightM: 500, biome: Biome.CoralRuins, floorM: 3000 },
    { x: 0, y: 1250, widthM: 5000, heightM: 750, biome: Biome.AbyssalTrench, floorM: 3200 },
    { x: 0, y: 2000, widthM: 2000, heightM: 2000, biome: Biome.AbyssalTrench, floorM: 3200 },
    { x: 3000, y: 2000, widthM: 2000, heightM: 2000, biome: Biome.AbyssalTrench, floorM: 3200 },
    { x: 2000, y: 1250, widthM: 1000, heightM: 2500, biome: Biome.AbyssalTrench, floorM: 4100 },
    { x: 2000, y: 3750, widthM: 1000, heightM: 250, biome: Biome.AbyssalTrench, floorM: 4100 },
  ];
  const map = missionMapById(ATTENDING_ATTENDANCE.mapId)!;
  const boxes: MapDefinition = { ...map, regions: RECTANGLES };
  const ground = terrainFor(map);
  const was = terrainFor(boxes);
  // Asked of the cell, never the point: a point inside a polygon can stand in
  // a cell the polygon does not claim (terrain.ts, `shapeContains`).
  const centre = (m: number) => (Math.floor(m / map.cellM) + 0.5) * map.cellM;
  /** The region that painted the cell under a point: the last whose shape holds its centre. */
  const regionAt = (x: number, y: number): string => {
    let name = '';
    for (const region of map.regions) {
      if (shapeContains(region, centre(x), centre(y))) name = region.note!.split(' — ')[0]!;
    }
    return name;
  };
  const groundAt = (x: number, y: number): unknown[] => [
    regionAt(x, y),
    Biome[ground.biomeAt(x, y)],
    ground.floorAt(x, y),
    ground.ceilingAt(x, y),
  ];
  const groundWas = (x: number, y: number): unknown[] => [
    Biome[was.biomeAt(x, y)],
    was.floorAt(x, y),
    was.ceilingAt(x, y),
  ];
  const missions = MISSIONS.filter((mission) => mission.mapId === map.id);

  it('is played by Attendance alone', () => {
    // Every block below reads its points off this one mission; a second
    // mission on this map would need its own points pinned before it shipped.
    assert.deepEqual(
      missions.map((mission) => mission.id),
      [ATTENDING_ATTENDANCE.id]
    );
  });

  it('seats the watch, the dome and every arrival on the ground §11 gives them', () => {
    const GALLERIES = ['The Attending Galleries', 'CoralRuins', 3000, 0];
    const points: [string, number, number, unknown[]][] = [];
    for (const spawn of map.spawns) {
      points.push(['the spawn', spawn.x, spawn.y, GALLERIES]);
      const foundry = [spawn.x + spawn.foundryOffsetX, spawn.y + spawn.foundryOffsetY] as const;
      points.push(['its Foundry', ...foundry, GALLERIES]);
    }
    for (const party of ATTENDING_ATTENDANCE.parties) {
      for (const unit of party.units ?? []) points.push([unit.tag!, unit.x, unit.y, GALLERIES]);
      for (const site of party.structures ?? [])
        points.push([site.tag!, site.x, site.y, GALLERIES]);
      for (const emitter of party.emitters ?? []) {
        // The sill's arrival stands in the Sill; the other eight up the Axis.
        const region = emitter.y >= 3750 ? 'The Sill' : 'The Axis';
        points.push([emitter.tag, emitter.x, emitter.y, [region, 'AbyssalTrench', 4100, 0]]);
      }
    }
    for (const marker of ATTENDING_ATTENDANCE.markers ?? []) {
      const axis = ['The Axis', 'AbyssalTrench', 4100, 0];
      points.push([`the ${marker.id} marker`, marker.x, marker.y, axis]);
    }
    assert.equal(points.length, 17, 'the mission grew or lost a point');
    for (const [what, x, y, expected] of points) {
      assert.deepEqual(groundAt(x, y), expected, `${what} at ${x},${y}`);
      assert.deepEqual(groundAt(x, y).slice(1), groundWas(x, y), `${what} moved off its ground`);
    }
  });

  it('keeps every cell of both mission regions on the ground it had in rectangles', () => {
    // `galleries` is the Galleries' own rectangle and `axis` is the Axis and
    // the Sill together; both are restated by the mission, so both stay boxes.
    let cells = 0;
    for (const region of ATTENDING_ATTENDANCE.regions ?? []) {
      const painted =
        region.id === 'galleries' ? ['The Attending Galleries'] : ['The Axis', 'The Sill'];
      for (let y = map.cellM / 2; y < map.heightM; y += map.cellM) {
        for (let x = map.cellM / 2; x < map.widthM; x += map.cellM) {
          if (!shapeContains(region, x, y)) continue;
          cells++;
          assert.ok(painted.includes(regionAt(x, y)), `${region.id} at ${x},${y}`);
          assert.deepEqual(groundAt(x, y).slice(1), groundWas(x, y), `${region.id} at ${x},${y}`);
        }
      }
    }
    assert.equal(cells, 64, 'the mission regions grew or shrank');
  });

  it('admits a hull at every depth a depth order reaches exactly where the rectangles did', () => {
    // §11: the reshape trades cells between 3,200 and 3,400 m of trench, both
    // below the 3,000 m a depth order reaches, and changes no cell's biome.
    for (let y = map.cellM / 2; y < map.heightM; y += map.cellM) {
      for (let x = map.cellM / 2; x < map.widthM; x += map.cellM) {
        assert.equal(ground.biomeAt(x, y), was.biomeAt(x, y), `${x},${y} changed biome`);
        for (let depthM = 0; depthM <= 3000; depthM += 25) {
          const where = `${x},${y} at ${depthM} m`;
          assert.equal(ground.admits(x, y, depthM), was.admits(x, y, depthM), where);
        }
      }
    }
  });

  it('admits differently below that only on the 22 cells §11 names, between 3,200 and 3,400 m', () => {
    // A hull following the floor holds thirty metres off it, past 3,000 m
    // (systems/depth.ts, `followTheFloor`), so this is the band §11 prices:
    // the Step's wedge beside each end of the galleries, and each bench's
    // cut south corner. Swept to 4,075 m, the deepest a hull follows the Axis.
    const WEDGE = ['125,875', '125,1125', '375,1125', '625,1125', '875,1125'];
    const CORNERS = ['125,3375', '125,3625', '375,3625', '125,3875', '375,3875', '625,3875'];
    const mirror = (cell: string) => {
      const [x, y] = cell.split(',').map(Number) as [number, number];
      return `${map.widthM - x},${y}`;
    };
    const westAndEast = (cells: string[]) => [...new Set([...cells, ...cells.map(mirror)])];
    const named = new Set([...westAndEast(WEDGE), ...westAndEast(CORNERS)]);
    assert.equal(named.size, 22);
    const differ = new Set<string>();
    for (let depthM = 0; depthM <= 4075; depthM += 25) {
      for (let y = map.cellM / 2; y < map.heightM; y += map.cellM) {
        for (let x = map.cellM / 2; x < map.widthM; x += map.cellM) {
          if (ground.admits(x, y, depthM) === was.admits(x, y, depthM)) continue;
          differ.add(`${x},${y}`);
          assert.ok(named.has(`${x},${y}`), `${x},${y} admits differently at ${depthM} m`);
          assert.ok(depthM > 3200 && depthM <= 3400, `${x},${y} differs at ${depthM} m`);
        }
      }
    }
    assert.deepEqual([...differ].sort(), [...named].sort(), 'a named cell admits as it did');
  });

  it('routes the watch down the channel the way it was routed in rectangles', () => {
    // The mission authors no move; the only orders this file gives are the
    // whole-cycle drive's, from the seats to the approach and on to the sill.
    // A partial route ends at the reachable cell nearest the order, so each
    // is asked from every 125 m of its leg at every 25 m of depth to 3,000.
    for (const mission of missions) {
      const scripted = mission.beats.filter((b) => b.kind === 'move' || b.kind === 'creature');
      assert.equal(scripted.length, 0, `${mission.id} grew a scripted move`);
    }
    const watch = ATTENDING_ATTENDANCE.parties.find((party) => party.slot === PLAYER)!.units!;
    const legs = [
      ...watch.map((unit) => ({ what: unit.tag!, from: unit, to: APPROACH })),
      { what: 'the approach', from: APPROACH, to: SILL },
    ];
    const pathfinder = new Pathfinder(ground.cols, ground.rows);
    const route: number[] = [];
    const before: number[] = [];
    for (const { what, from, to } of legs) {
      const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 125));
      for (let depthM = 0; depthM <= 3000; depthM += 25) {
        for (let i = 0; i <= n; i++) {
          const x = from.x + ((to.x - from.x) * i) / n;
          const y = from.y + ((to.y - from.y) * i) / n;
          const where = `${what} from ${Math.round(x)},${Math.round(y)} at ${depthM} m`;
          const straight = ground.segmentAdmits(x, y, to.x, to.y, depthM);
          assert.equal(straight, was.segmentAdmits(x, y, to.x, to.y, depthM), where);
          const reached = pathfinder.findPath(ground, x, y, to.x, to.y, depthM, route);
          const reachedWas = pathfinder.findPath(was, x, y, to.x, to.y, depthM, before);
          assert.equal(reached, reachedWas, where);
          assert.deepEqual(route, before, where);
        }
      }
    }
  });

  it('plays an idle watch on the tracks the rectangles gave it', () => {
    // Every positioned entity every 5 s, with its hit points, and every line
    // the mission speaks, keyed by eid less the run's smallest: bitecs numbers
    // entities across worlds, so the second run's eids start where the first's
    // stopped. The whole eighteen minutes, because it plays in about a second.
    const positioned = defineQuery([Position]);
    const replay = (on: MapDefinition) => {
      const match = new Match(on, { mission: ATTENDING_ATTENDANCE, fauna: false, seed: 77 });
      const tracks: string[][] = [];
      const lines: string[] = [];
      let base = -1;
      for (let tick = 0; tick <= T(18, 30) && match.missionOver === null; tick++) {
        match.update(STEP_MS);
        match.takeMissionView();
        for (const line of match.takeMissionLines()) lines.push(`${tick} ${line.text}`);
        if (tick % (5 * SIM.TICK_HZ) !== 0) continue;
        const eids = [...positioned(match.world)].sort((a, b) => a - b);
        if (base < 0) base = eids[0]!;
        tracks.push(
          eids.map((e) => {
            const at = `${Position.x[e]},${Position.y[e]}@${Position.depth[e]}`;
            return `${e - base} ${at} hp ${Health.hp[e]}`;
          })
        );
      }
      return { tracks, lines, over: match.missionOver };
    };
    const before = replay(boxes);
    const after = replay(map);
    assert.ok(after.over !== null, 'the watch never ended');
    assert.equal(after.tracks[0]!.length, 14, 'four hulls, the dome and nine arrivals');
    assert.equal(after.tracks.length, before.tracks.length, 'the watch ran a different length');
    for (let i = 0; i < before.tracks.length; i++) {
      assert.deepEqual(after.tracks[i], before.tracks[i], `the tracks part at ${i * 5}s`);
    }
    assert.deepEqual(after.lines, before.lines, 'the mission spoke differently');
    assert.deepEqual(after.over, before.over, 'the watch closed differently');
  });
});
