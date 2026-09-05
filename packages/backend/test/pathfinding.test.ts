/**
 * Routing around ground (#431).
 *
 * Before this, `movementSystem` steered straight at its order and slid along
 * whatever it hit, which is fine against a wall and fatal against a bay: a
 * hull aimed past a concave ridge slid into the pocket and stayed there. The
 * first test below is that regression, and fails against the old movement.
 *
 * The rest hold the properties routing has to keep to be allowed on the
 * 60 Hz path: it is deterministic, it never cuts a corner, it copes with an
 * order the ground will not let it reach, it notices the ground changing
 * under it, and it costs nothing in open water.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Faction, MOVEMENT, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Pathfinder } from '../src/sim/pathfinding.ts';
import { MoveOrder, Position } from '../src/sim/components.ts';
import { hashWorld } from '../src/sim/stateHash.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const MAP_M = 8000;
const CELL_M = 250;
/** Ground that admits nothing below 380 m: a shelf a 900 m hull cannot cross. */
const SHELF = { floorM: 380 };

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

function hullAt(match: Match, x: number, y: number, depth: number): number {
  return spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 0,
    faction: Faction.Bathyarch,
    x,
    y,
    depth,
  });
}

/**
 * A bay opening south: a shelf shaped like a U with its arms pointing at the
 * hull, so a straight course from the south lands inside the pocket. The
 * order is behind the closed end.
 */
function bayTerrain(): Terrain {
  const terrain = new Terrain(MAP_M, MAP_M, CELL_M, { floorM: 2600 });
  terrain.fillGround(2500, 3000, 3000, 250, SHELF); // the closed end, y 3000–3250
  terrain.fillGround(2500, 3000, 250, 2000, SHELF); // west arm, down to y 5000
  terrain.fillGround(5250, 3000, 250, 2000, SHELF); // east arm
  return terrain;
}

function bayMatch(seed: number): { match: Match; hull: number } {
  const match = new Match(undefined, { fauna: false, seed, terrain: bayTerrain() });
  match.addPlayer(0, Faction.Bathyarch);
  advance(match, 0.5);
  const hull = hullAt(match, 4000, 6000, 900);
  return { match, hull };
}

describe('routing around ground', () => {
  it('reaches an order behind a bay instead of sliding into the pocket', () => {
    const { match, hull } = bayMatch(31);
    match.orderMove(0, hull, 4000, 2000);
    // Around either arm is roughly 1,500 m west or east, 4,000 m north and
    // back: comfortably inside a minute at Corvette speed, and nowhere near
    // it for a hull pinned at the closed end.
    advance(match, 90);

    const dx = Position.x[hull]! - 4000;
    const dy = Position.y[hull]! - 2000;
    assert.ok(
      Math.hypot(dx, dy) <= MOVEMENT.ARRIVAL_EPSILON_M + 1,
      `the hull should be at its order, not in the bay: ` +
        `(${Position.x[hull]!.toFixed(0)}, ${Position.y[hull]!.toFixed(0)})`
    );
    assert.equal(MoveOrder.active[hull], 0, 'and the order should be spent');
  });

  it('routes the same way twice', () => {
    const a = bayMatch(7);
    const b = bayMatch(7);
    a.match.orderMove(0, a.hull, 4000, 2000);
    b.match.orderMove(0, b.hull, 4000, 2000);
    for (let i = 0; i < 60 * 30; i++) {
      a.match.update(STEP_MS);
      b.match.update(STEP_MS);
      if (i % 300 === 299) {
        assert.equal(hashWorld(a.match.world), hashWorld(b.match.world), `diverged by tick ${i}`);
      }
    }
  });

  it('holds a route to an order the ground will not let it reach', () => {
    // A closed box with the order inside it: the goal cell is not reachable.
    const terrain = new Terrain(MAP_M, MAP_M, CELL_M, { floorM: 2600 });
    terrain.fillGround(3000, 3000, 2000, 250, SHELF);
    terrain.fillGround(3000, 4750, 2000, 250, SHELF);
    terrain.fillGround(3000, 3000, 250, 2000, SHELF);
    terrain.fillGround(4750, 3000, 250, 2000, SHELF);
    const match = new Match(undefined, { fauna: false, seed: 3, terrain });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);
    const hull = hullAt(match, 1000, 4000, 900);
    match.orderMove(0, hull, 4000, 4000);
    advance(match, 60);

    // Pressed against the box from outside, at the reachable cell nearest
    // the order — which is under the south wall, not the west one the hull
    // started facing — and without the search running every tick: an
    // exhausted plan waits for the ground or the depth.
    const x = Position.x[hull]!;
    const y = Position.y[hull]!;
    const inside = x > 3250 && x < 4750 && y > 3250 && y < 4750;
    assert.ok(!inside, `the box must hold: (${x.toFixed(0)}, ${y.toFixed(0)})`);
    assert.ok(
      Math.hypot(x - 4000, y - 4000) < 1100,
      `and the hull should be pressed against it near the order: (${x.toFixed(0)}, ${y.toFixed(0)})`
    );
    const plan = match.world.paths.get(hull);
    assert.ok(plan !== undefined && plan.exhausted, 'the plan should know its goal is sealed');
    const planned = plan.tick;
    advance(match, 5);
    assert.equal(match.world.paths.get(hull)!.tick, planned, 'and not re-search on the cadence');
  });

  it('re-routes when the ground changes under the route', () => {
    const terrain = new Terrain(MAP_M, MAP_M, CELL_M, { floorM: 2600 });
    // A bar with a gap in the middle, then the gap closes once the hull has
    // committed to it.
    terrain.fillGround(0, 4000, 3500, 250, SHELF);
    terrain.fillGround(4500, 4000, 3500, 250, SHELF);
    const match = new Match(undefined, { fauna: false, seed: 5, terrain });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);
    const hull = hullAt(match, 1000, 6000, 900);
    match.orderMove(0, hull, 1000, 2000);
    advance(match, 10);
    const before = match.world.paths.get(hull)!;
    assert.ok(before.waypoints.length > 0, 'a bar between hull and order should route');

    // Seal the gap, open the far west end.
    terrain.fillGround(3500, 4000, 1000, 250, SHELF);
    terrain.fillGround(0, 4000, 500, 250, { floorM: 2600 });
    advance(match, 90);
    const dx = Position.x[hull]! - 1000;
    const dy = Position.y[hull]! - 2000;
    assert.ok(
      Math.hypot(dx, dy) <= MOVEMENT.ARRIVAL_EPSILON_M + 1,
      `should arrive through the new gap: (${Position.x[hull]!.toFixed(0)}, ${Position.y[hull]!.toFixed(0)})`
    );
  });

  it('steers straight in open water and holds no waypoints', () => {
    const match = new Match(undefined, {
      fauna: false,
      seed: 9,
      terrain: new Terrain(MAP_M, MAP_M, CELL_M, { floorM: 2600 }),
    });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);
    const hull = hullAt(match, 1000, 1000, 900);
    match.orderMove(0, hull, 6000, 6000);
    advance(match, 2);
    const plan = match.world.paths.get(hull);
    assert.ok(plan !== undefined, 'a moving hull holds a plan');
    assert.equal(plan.waypoints.length, 0, 'open water is a straight course');
    // On the line from start to order, not staggering along cells.
    const off = Math.abs(Position.x[hull]! - Position.y[hull]!);
    assert.ok(off < 1, `should be on the diagonal, off by ${off.toFixed(2)} m`);
  });
});

describe('Pathfinder', () => {
  it('never cuts a corner', () => {
    // Two shelves touching at a corner: the diagonal between them is the
    // short way and must not be taken, because the hull would clip both.
    const terrain = new Terrain(2000, 2000, CELL_M, { floorM: 2600 });
    terrain.fillGround(0, 0, 1000, 1000, SHELF); // NW block
    terrain.fillGround(1000, 1000, 1000, 1000, SHELF); // SE block
    const finder = new Pathfinder(terrain.cols, terrain.rows);
    const route: number[] = [];
    const found = finder.findPath(terrain, 1125, 125, 875, 1875, 900, route);
    // The open quadrants meet only at that corner, so refusing the diagonal
    // means refusing the goal: a partial route that stays on its own side.
    assert.equal(found, false, 'a corner is not a passage');
    for (let i = 0; i < route.length; i += 2) {
      assert.ok(route[i]! >= 1000 && route[i + 1]! < 1000, `waypoint ${i / 2} left the quadrant`);
    }
  });

  it('answers a walled goal with the nearest reachable cell', () => {
    const terrain = new Terrain(2000, 2000, CELL_M, { floorM: 2600 });
    terrain.fillGround(1000, 0, 1000, 2000, SHELF); // the east half is rock
    const finder = new Pathfinder(terrain.cols, terrain.rows);
    const route: number[] = [];
    const found = finder.findPath(terrain, 125, 1000, 1875, 1000, 900, route);
    assert.equal(found, false);
    assert.ok(route.length >= 2, 'a partial route is still a route');
    const lastX = route[route.length - 2]!;
    assert.equal(lastX, terrain.cellCentreX(3), 'ending at the last open column');
  });

  it('is empty for two points in one cell', () => {
    const terrain = new Terrain(2000, 2000, CELL_M, { floorM: 2600 });
    const finder = new Pathfinder(terrain.cols, terrain.rows);
    const route: number[] = [1, 2];
    assert.equal(finder.findPath(terrain, 100, 100, 200, 200, 900, route), true);
    assert.equal(route.length, 0);
  });
});
