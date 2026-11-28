/**
 * The crater's volumetric ground (docs/free-water-slice.md §9, "Toward a
 * vertical multiplayer match"; #1754). The owner lifted docs/systems-depth.md
 * §2's planar limits there and nowhere else, so every claim here is made twice:
 * once on the crater, once on ground without the flag, where the old rule holds.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Faction,
  SIM,
  StructureKind,
  structureStatsFor,
  UnitKind,
  unitRadiusM,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { FREE_WATER_SLICE } from '../src/sim/maps/freeWaterSlice.ts';
import { Pathfinder } from '../src/sim/pathfinding.ts';
import { terrainFor } from '../src/sim/maps/index.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Position } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/** Over the deep pocket: 2,400 m of open water, nothing to hold a hull up. */
const POCKET_X = 2125;
const POCKET_Y = 2125;

function crater(seed: number): Match {
  return new Match(FREE_WATER_SLICE, { fauna: false, seed });
}

/**
 * The same water as the pocket on a map without the flag: a flat 2,400 m
 * floor. The flag is the map literal's, so the crater's literal would carry it.
 */
function planarGround(seed: number): Match {
  return new Match(undefined, {
    fauna: false,
    seed,
    terrain: new Terrain(4000, 4000, 250, { floorM: 2400 }),
  });
}

function corvette(match: Match, x: number, y: number, depth: number): number {
  return hull(match, UnitKind.Corvette, x, y, depth);
}

function hull(match: Match, kind: UnitKind, x: number, y: number, depth: number): number {
  return spawnUnit(match.world, {
    kind,
    slot: 0,
    faction: Faction.Pelagia,
    x,
    y,
    depth,
  });
}

function planGap(a: number, b: number): number {
  return Math.hypot(Position.x[a]! - Position.x[b]!, Position.y[a]! - Position.y[b]!);
}

function gap3d(a: number, b: number): number {
  return Math.hypot(
    Position.x[a]! - Position.x[b]!,
    Position.y[a]! - Position.y[b]!,
    Position.depth[a]! - Position.depth[b]!
  );
}

describe('volumetric ground: separation in three dimensions', () => {
  const radius = unitRadiusM(UnitKind.Corvette);

  it('is set on the crater and on no ground without the flag', () => {
    assert.equal(crater(1).world.volumetric, true);
    // A test terrain does not make a map volumetric; the map literal does.
    assert.equal(new Match(undefined, { fauna: false, seed: 1 }).world.volumetric, false);
  });

  it('lets a hull hold station directly over another one', () => {
    const match = crater(1754);
    const deep = corvette(match, POCKET_X, POCKET_Y, 900);
    const shallow = corvette(match, POCKET_X, POCKET_Y, 900 - radius * 3);
    advance(match, 3);
    assert.equal(planGap(deep, shallow), 0, 'a pair clear in depth is not pushed in plan');
    assert.equal(Position.depth[deep], 900);
    assert.equal(Position.depth[shallow], 900 - radius * 3);
  });

  it('pushes an overlapping stacked pair apart in plan only, until it clears in 3D', () => {
    const match = crater(1755);
    const dz = radius; // under the 2r the pair needs, so the spheres overlap
    const deep = corvette(match, POCKET_X, POCKET_Y, 900);
    const shallow = corvette(match, POCKET_X, POCKET_Y, 900 - dz);
    advance(match, 6);
    // Depth has one owner, and it is not separation.
    assert.equal(Position.depth[deep], 900);
    assert.equal(Position.depth[shallow], 900 - dz);
    const needed = Math.sqrt((2 * radius) ** 2 - dz ** 2);
    const plan = planGap(deep, shallow);
    assert.ok(plan >= needed * 0.9, `pushed ${plan.toFixed(1)} m in plan, needs ${needed}`);
    // Only as far as the depth difference requires, not the full planar 2r.
    assert.ok(plan < 2 * radius * 0.95, `pushed ${plan.toFixed(1)} m, the planar rule's distance`);
    assert.ok(gap3d(deep, shallow) >= 2 * radius * 0.9);
  });

  it('keeps the planar rule on ground without the flag', () => {
    const match = planarGround(1754);
    const deep = corvette(match, POCKET_X, POCKET_Y, 900);
    const shallow = corvette(match, POCKET_X, POCKET_Y, 900 - radius * 3);
    advance(match, 6);
    const plan = planGap(deep, shallow);
    assert.ok(plan >= 2 * radius * 0.9, `a stack is pushed apart in plan: ${plan.toFixed(1)} m`);
  });
});

describe('volumetric ground: structures with a height', () => {
  const radius = unitRadiusM(UnitKind.Corvette);
  const bastion = structureStatsFor(StructureKind.Bastion);
  /** On the bowl's 1,500 m floor, clear of the pocket and the garden. */
  const BOWL_X = 1250;
  const BOWL_Y = 2250;
  const FLOOR_M = 1500;

  function base(match: Match): number {
    return spawnStructure(match.world, {
      kind: StructureKind.Bastion,
      slot: 1,
      faction: Faction.Bathyarch,
      x: BOWL_X,
      y: BOWL_Y,
      depth: FLOOR_M,
      prebuilt: true,
    });
  }

  it('lets a hull whose keel clears the roof hold station over the footprint', () => {
    const match = crater(1756);
    assert.equal(match.world.terrain.floorAt(BOWL_X, BOWL_Y), FLOOR_M);
    base(match);
    const over = corvette(match, BOWL_X + 40, BOWL_Y, FLOOR_M - bastion.heightM - radius - 1);
    advance(match, 1);
    assert.equal(Position.x[over], BOWL_X + 40);
    assert.equal(Position.y[over], BOWL_Y);
  });

  it('still puts out a hull below the roof', () => {
    const match = crater(1757);
    base(match);
    const inside = corvette(match, BOWL_X + 40, BOWL_Y, FLOOR_M - bastion.heightM + radius);
    advance(match, 1);
    const d = Math.hypot(Position.x[inside]! - BOWL_X, Position.y[inside]! - BOWL_Y);
    assert.ok(d >= bastion.radiusM + radius - 0.01, `held ${d.toFixed(1)} m from the centre`);
  });

  it('keeps the column at every depth on ground without the flag', () => {
    const match = planarGround(1756);
    spawnStructure(match.world, {
      kind: StructureKind.Bastion,
      slot: 1,
      faction: Faction.Bathyarch,
      x: BOWL_X,
      y: BOWL_Y,
      depth: 2400,
      prebuilt: true,
    });
    const over = corvette(match, BOWL_X + 40, BOWL_Y, 300);
    advance(match, 1);
    const d = Math.hypot(Position.x[over]! - BOWL_X, Position.y[over]! - BOWL_Y);
    assert.ok(d >= bastion.radiusM + radius - 0.01, `held ${d.toFixed(1)} m from the centre`);
  });
});

describe('volumetric ground: routes that climb and dive', () => {
  // From the pocket's south rim to the exit pool, both 300 m, with the
  // southern wall between: around it over the 600 m rim, or under it through
  // the roofed cut, whose water runs from 800 m to 1,500 m. The wall spans
  // x 1,000 to 3,000 m, so the way round passes outside that. The way round
  // is about eleven cells and the cut three, but the cut costs a 500 m dive
  // and the 500 m climb back at a third of the speed, which a hull's own
  // speed prices: from this start a Cruiser is just on the cut's side of it.
  const FROM = { x: 1875, y: 2875 };
  const TO = { x: 2125, y: 3625 };
  const CUT = { x0: 1750, x1: 2250, y0: 3000, y1: 3500 };

  interface Track {
    deepest: number;
    throughCut: boolean;
    roundTheWall: boolean;
    arrived: boolean;
    endDepth: number;
  }

  function sail(kind: UnitKind, depthM: number, seconds: number): Track {
    const match = crater(1760);
    match.addPlayer(0, Faction.Pelagia);
    const eid = hull(match, kind, FROM.x, FROM.y, 300);
    match.orderMove(0, eid, TO.x, TO.y, false, depthM);
    const track: Track = {
      deepest: 0,
      throughCut: false,
      roundTheWall: false,
      arrived: false,
      endDepth: 0,
    };
    const steps = Math.ceil((seconds * 1000) / STEP_MS);
    for (let i = 0; i < steps; i++) {
      match.update(STEP_MS);
      const x = Position.x[eid]!;
      const y = Position.y[eid]!;
      track.deepest = Math.max(track.deepest, Position.depth[eid]!);
      if (x > CUT.x0 && x < CUT.x1 && y > CUT.y0 && y < CUT.y1) track.throughCut = true;
      if (x < 1000 || x > 3000) track.roundTheWall = true;
    }
    track.arrived = Math.hypot(Position.x[eid]! - TO.x, Position.y[eid]! - TO.y) < 30;
    track.endDepth = Position.depth[eid]!;
    return track;
  }

  it('dives a slow hull under the roof when that is faster than the way round', () => {
    // A Cruiser at 45 m/s: the dive to 800 m and the climb back cost it less
    // time than the way round.
    const track = sail(UnitKind.Cruiser, 300, 240);
    assert.ok(track.throughCut, 'the Cruiser goes through the cut');
    assert.ok(!track.roundTheWall);
    assert.ok(track.deepest >= 800 && track.deepest < 1500, `deepest ${track.deepest} m`);
    assert.ok(track.arrived, 'and arrives');
    assert.equal(track.endDepth, 300, 'back at the depth it was ordered to');
  });

  it('sends a fast hull round when the climb back would cost more than the detour', () => {
    // A Corvette at 85 m/s covers the detour in less time than 500 m of climb.
    const track = sail(UnitKind.Corvette, 300, 240);
    assert.ok(!track.throughCut, 'the Corvette does not dive the cut');
    assert.ok(track.roundTheWall, 'it goes round the wall');
    assert.ok(track.deepest <= 300 + 1, `deepest ${track.deepest} m`);
    assert.ok(track.arrived);
  });

  it('dives the same Corvette under the roof when its order is deep anyway', () => {
    const track = sail(UnitKind.Corvette, 1000, 240);
    assert.ok(track.throughCut, 'an order to 1,000 m pays for the dive either way');
    assert.ok(track.arrived);
    assert.equal(track.endDepth, 1000);
  });

  it('never routes a hull below the deepest it is allowed', () => {
    const terrain = terrainFor(FREE_WATER_SLICE);
    const path = new Pathfinder(terrain.cols, terrain.rows);
    const out: number[] = [];
    const depths: number[] = [];
    // A crawl, so the cut would win on time wherever it is open.
    const cost = { speedMps: 5, descentMps: 45, ascentMps: 15 };
    path.findPath3d(terrain, FROM.x, FROM.y, 300, TO.x, TO.y, 300, 1500, cost, out, depths);
    assert.ok(Math.max(...depths) >= 800, 'the cut is the way when it may be taken');
    path.findPath3d(terrain, FROM.x, FROM.y, 300, TO.x, TO.y, 300, 799, cost, out, depths);
    assert.ok(Math.max(...depths) <= 799, `deepest leg ${Math.max(...depths)} m`);
    assert.ok(
      out.some((v, i) => i % 2 === 0 && (v < 1000 || v > 3000)),
      'with the cut out of its depth the route goes round the wall'
    );
  });

  it('keeps planning at the current depth on ground without the flag', () => {
    const match = planarGround(1760);
    match.addPlayer(0, Faction.Pelagia);
    const eid = hull(match, UnitKind.Cruiser, FROM.x, FROM.y, 300);
    match.orderMove(0, eid, TO.x, TO.y, false, 300);
    advance(match, 2);
    const plan = match.world.paths.get(eid);
    assert.ok(plan === undefined || plan.depths.length === 0);
    assert.ok(plan === undefined || Number.isNaN(plan.routeDepthM));
  });
});
