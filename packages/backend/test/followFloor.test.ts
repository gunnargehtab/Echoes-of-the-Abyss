/**
 * Floor-following — docs/systems-depth.md §2 "Steering along the ground".
 *
 * Since #1132 there is no order to follow the floor: a move onto the ground is
 * one. A move whose depth is within `FOLLOW_FLOOR.ENGAGE_WITHIN_M` of the floor
 * at its point engages it; a move into open water, a depth alone, an attack and
 * a harvest end it. Once engaged the promises are the old standing order's: it
 * holds the clearance, follows the ground down at a dive's rate and loudness
 * (and breaks Silent Running the way a dive does), rides the ground back up,
 * and disengages at the hull's PR edge rather than feeding it into crush.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEPTH, Faction, FOLLOW_FLOOR, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnResourceNode, spawnUnit } from '../src/sim/world.ts';
import { DepthOrder, MoveOrder, Position, Pressure, SilentRunning } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const MAP_M = 8000;
const EPS = DEPTH.ARRIVAL_EPSILON_M + 1;

const PLAIN: MapDefinition = { ...VENTFRONT_DIVIDE, id: 'test-follow', regions: [], hazards: [] };

function match(floorM: number): Match {
  return new Match(PLAIN, {
    fauna: false,
    seed: 33,
    terrain: new Terrain(MAP_M, MAP_M, 250, { floorM }),
  });
}

function advance(m: Match, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * SIM.TICK_HZ); i++) m.update(STEP_MS);
}

/** A Bathyarch corvette: PR 2 through the faction baseline — Mid-Water is
 * theirs, the Abyssal is not, which is what the disengage test needs. */
function seat(m: Match, depth: number): number {
  return spawnUnit(m.world, {
    kind: UnitKind.Corvette,
    slot: 0,
    faction: Faction.Bathyarch,
    x: 1000,
    y: 4000,
    depth,
  });
}

/** A click on the ground under the hull: a move to where it stands, at the floor. */
function onTheGround(m: Match, eid: number, floorM: number): void {
  m.orderMove(0, eid, Position.x[eid]!, Position.y[eid]!, false, floorM);
}

describe('floor-following', () => {
  it('is engaged by a move onto the ground, and settles at the clearance', () => {
    const m = match(1000);
    const eid = seat(m, 300);
    onTheGround(m, eid, 1000);
    assert.equal(DepthOrder.follow[eid], 1, 'the move is the engagement');
    advance(m, 20); // (970 − 300) / 45 ≈ 15 s of descent
    assert.ok(Math.abs(Position.depth[eid]! - (1000 - FOLLOW_FLOOR.CLEARANCE_M)) <= EPS);
    // Settled means settled: no order churn once on station.
    assert.equal(DepthOrder.active[eid], 0);
  });

  it('counts a move within ENGAGE_WITHIN_M of the floor as the ground, and no further', () => {
    const m = match(1000);
    const near = seat(m, 300);
    const far = seat(m, 300);
    m.orderMove(0, near, 1000, 4000, false, 1000 - FOLLOW_FLOOR.ENGAGE_WITHIN_M + 1);
    m.orderMove(0, far, 1000, 4000, false, 1000 - FOLLOW_FLOOR.ENGAGE_WITHIN_M - 1);
    assert.equal(DepthOrder.follow[near], 1, 'just inside the band follows the floor');
    assert.equal(DepthOrder.follow[far], 0, 'just outside it is open water');
    assert.equal(DepthOrder.targetM[far], 1000 - FOLLOW_FLOOR.ENGAGE_WITHIN_M - 1);
  });

  it('is ended by a move into open water, which holds that move’s depth', () => {
    const m = match(1000);
    const eid = seat(m, 300);
    onTheGround(m, eid, 1000);
    advance(m, 20);
    m.orderMove(0, eid, 3000, 4000, false, 600);
    assert.equal(DepthOrder.follow[eid], 0, 'the newer instruction wins');
    advance(m, 60);
    assert.ok(Math.abs(Position.x[eid]! - 3000) <= 5, `reached the order, at x ${Position.x[eid]}`);
    assert.ok(Math.abs(Position.depth[eid]! - 600) <= EPS, 'and held the depth it was given');
  });

  it('keeps following under a move that is a place alone', () => {
    // The commander's walks and a mission's beats name no depth; the mode the
    // hull is in is not theirs to end.
    const m = match(1000);
    const eid = seat(m, 970);
    onTheGround(m, eid, 1000);
    m.orderMove(0, eid, 3000, 4000);
    assert.equal(DepthOrder.follow[eid], 1);
  });

  it('follows the ground down as a dive — loud, and never silently', () => {
    const m = match(1000);
    const eid = seat(m, 300);
    onTheGround(m, eid, 1000);
    advance(m, 20);
    m.setSilentRunning(0, eid, true);
    advance(m, 1);
    assert.equal(SilentRunning.active[eid], 1, 'silent while on station');

    // The ground falls away beneath the hull — a mission collapse does this.
    m.world.terrain.fillGround(0, 0, MAP_M, MAP_M, { floorM: 1600 });
    advance(m, 2);
    assert.equal(DepthOrder.descending[eid], 1, 'mid-dive, and the flag says so');
    assert.equal(SilentRunning.active[eid], 0, 'a follow dive breaks silence like any dive');
    advance(m, 18);
    assert.ok(Math.abs(Position.depth[eid]! - (1600 - FOLLOW_FLOOR.CLEARANCE_M)) <= EPS);
  });

  it('rides the ground back up, at the ascent rate', () => {
    const m = match(1600);
    const eid = seat(m, 300);
    onTheGround(m, eid, 1600);
    advance(m, 35);
    assert.ok(Math.abs(Position.depth[eid]! - (1600 - FOLLOW_FLOOR.CLEARANCE_M)) <= EPS);

    m.world.terrain.fillGround(0, 0, MAP_M, MAP_M, { floorM: 1000 });
    // (1570 − 970) / 15 = 40 s of ascent.
    advance(m, 45);
    assert.ok(Math.abs(Position.depth[eid]! - (1000 - FOLLOW_FLOOR.CLEARANCE_M)) <= EPS);
  });

  it('disengages at the PR edge instead of riding into crush', () => {
    const m = match(2600); // Abyssal ground; a PR-2 hull is not rated for it
    const eid = seat(m, 300);
    onTheGround(m, eid, 2600);
    advance(m, 5);
    assert.equal(DepthOrder.follow[eid], 0, 'the mode stood down');
    assert.ok(Math.abs(Position.depth[eid]! - 300) <= EPS, 'and the hull held its depth');
    assert.equal(Pressure.unhealable[eid], 0, 'not one metre of crush was spent for it');
  });

  it('stops where a depth order stops: DEPTH.MAX_M, still engaged (#1179)', () => {
    // Ground deeper than the deepest orderable depth. A click on it orders
    // DEPTH.MAX_M, which is on the ground there by the rule's own reading, and
    // a hull rated for the Abyssal band follows it down to 3,000 m and holds,
    // as a depth order to 3,000 m would — rather than riding on to the floor
    // less the clearance, the water every mission map below 3,000 m says
    // nothing reaches.
    const m = match(4000);
    const eid = spawnUnit(m.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1000,
      y: 4000,
      depth: 2600,
    });
    onTheGround(m, eid, DEPTH.MAX_M);
    assert.equal(DepthOrder.follow[eid], 1, 'MAX_M over deeper ground is the ground');
    advance(m, 30); // (3000 − 2600) / 45 ≈ 9 s of descent, then station
    assert.ok(Math.abs(Position.depth[eid]! - DEPTH.MAX_M) <= EPS, 'held at DEPTH.MAX_M');
    assert.equal(DepthOrder.follow[eid], 1, 'and still following, not disengaged');
    assert.equal(Pressure.unhealable[eid], 0, 'with no crush spent on the way');
  });

  it('refuses a move whose depth is outside the column, place and all', () => {
    const m = match(1000);
    const eid = seat(m, 300);
    m.orderMove(0, eid, 3000, 4000, false, DEPTH.MAX_M + 1);
    m.orderMove(0, eid, 3000, 4000, false, Number.NaN);
    assert.equal(MoveOrder.active[eid], 0, 'no half of the order ran');
    assert.equal(DepthOrder.active[eid], 0);
    assert.equal(DepthOrder.follow[eid], 0);
  });

  it('decides a queued leg’s depth as the leg begins', () => {
    const m = match(1000);
    const eid = seat(m, 300);
    m.orderMove(0, eid, 1500, 4000, false, 600);
    m.orderMove(0, eid, 2000, 4000, true, 1000);
    assert.equal(DepthOrder.follow[eid], 0, 'the queued leg has not begun');
    advance(m, 60);
    assert.ok(Math.abs(Position.x[eid]! - 2000) <= 5, `walked both legs, at x ${Position.x[eid]}`);
    assert.equal(DepthOrder.follow[eid], 1, 'and the second, on the ground, follows it');
    assert.ok(Math.abs(Position.depth[eid]! - (1000 - FOLLOW_FLOOR.CLEARANCE_M)) <= EPS);
  });

  it('drops a leg in flight that is not its own when it engages', () => {
    // A dive to the seabed has just been ordered when a click lands on the
    // ground under a hull still at the clearance. The mode retargets only past
    // the arrival epsilon and the hull has not moved, so without the drop the
    // dive runs on — loud — until the hull has sunk that far into the
    // clearance. With it, nothing runs at all.
    const m = match(1000);
    const eid = seat(m, 1000 - FOLLOW_FLOOR.CLEARANCE_M);
    m.orderDepth(0, eid, 1000);
    onTheGround(m, eid, 1000);
    let descended = false;
    for (let tick = 0; tick < 12; tick++) {
      m.update(STEP_MS);
      if (DepthOrder.descending[eid] === 1) descended = true;
    }
    assert.equal(descended, false, 'not one tick at a dive’s SIG');
    assert.equal(Position.depth[eid], 1000 - FOLLOW_FLOOR.CLEARANCE_M, 'held where it stood');
    assert.equal(DepthOrder.follow[eid], 1);
  });

  it('climbs out of a pit it followed into, toward where it is ordered (#1193)', () => {
    // Ground at 1,700 m with a 1,750 m pit. A follower in the pit holds
    // 1,720 m, which the ground beside it refuses; ordered out, it reads the
    // ground ahead, rises to that ground's clearance before the edge, and
    // crosses — "up for free" (docs/systems-depth.md §2). Before #1193 it
    // was stopped at the pit's edge, holding 1,720 m.
    const m = match(1700);
    m.world.terrain.fillGround(1000, 3750, 500, 500, { floorM: 1750 });
    const eid = seat(m, 1720);
    Position.x[eid] = 1250;
    Position.y[eid] = 4000;
    onTheGround(m, eid, 1750);
    advance(m, 5);
    assert.ok(Math.abs(Position.depth[eid]! - (1750 - FOLLOW_FLOOR.CLEARANCE_M)) <= EPS);
    m.orderMove(0, eid, 2250, 4000, false, 1700);
    advance(m, 120);
    assert.ok(Math.abs(Position.x[eid]! - 2250) <= 5, `reached the order, at x ${Position.x[eid]}`);
    assert.ok(Math.abs(Position.depth[eid]! - (1700 - FOLLOW_FLOOR.CLEARANCE_M)) <= EPS);
    assert.equal(DepthOrder.follow[eid], 1, 'still following');
  });

  it('reads the ground on its route, not on the line to the order, and stays silent (#1193)', () => {
    // A 1,000 m ridge across 1,700 m ground, between the hull and its order.
    // The route at 1,670 m goes round the ridge's end, over 1,700 m ground the
    // whole way, so a follower holds 1,670 m and never dives. Reading the
    // straight line to the order instead lifted it beside the ridge and dived
    // it back, breaking Silent Running over ground it never crossed.
    const m = match(1700);
    m.world.terrain.fillGround(2750, 2500, 500, 3000, { floorM: 1000 });
    const eid = seat(m, 1670);
    onTheGround(m, eid, 1700);
    m.setSilentRunning(0, eid, true);
    advance(m, 1);
    m.orderMove(0, eid, 5000, 4000, false, 1700);
    let shallowest = Position.depth[eid]!;
    for (let s = 0; s < 600 && Math.abs(Position.x[eid]! - 5000) > 5; s++) {
      advance(m, 1);
      shallowest = Math.min(shallowest, Position.depth[eid]!);
    }
    assert.ok(Math.abs(Position.x[eid]! - 5000) <= 5, `reached the order, at x ${Position.x[eid]}`);
    assert.ok(shallowest >= 1670 - EPS, `held 1,670 m round the ridge, rose to ${shallowest}`);
    assert.equal(SilentRunning.active[eid], 1, 'and never dived, so never broke silence');
  });

  it('holds under a roof ahead, not over it (#1193)', () => {
    // A corridor of 1,700 m ground walled with rock north and south, with
    // one roofed cell across it (ceiling 1,665 m, floor 1,690 m): the only way
    // east. A follower at 1,670 m fits under that roof. Reading the roofed
    // cell's floor alone would lift it to 1,660 m before the cell, above the
    // roof, where the cell refuses it for good; it holds at the roof instead,
    // passes under it, and reaches the order.
    const m = match(1700);
    for (const y of [2500, 3500]) {
      m.world.terrain.fillGround(0, y, MAP_M, 500, { floorM: 100, ceilingM: 200 });
    }
    m.world.terrain.fillGround(3000, 3000, 250, 500, { floorM: 1690, ceilingM: 1665 });
    const eid = seat(m, 1670);
    Position.x[eid] = 2125;
    Position.y[eid] = 3250;
    onTheGround(m, eid, 1700);
    advance(m, 2);
    m.orderMove(0, eid, 4125, 3250, false, 1700);
    advance(m, 240);
    assert.ok(Math.abs(Position.x[eid]! - 4125) <= 5, `reached the order, at x ${Position.x[eid]}`);
    assert.ok(Math.abs(Position.depth[eid]! - (1700 - FOLLOW_FLOOR.CLEARANCE_M)) <= EPS);
  });

  it('is replaced by a depth alone — the newer instruction wins', () => {
    const m = match(1000);
    const eid = seat(m, 300);
    onTheGround(m, eid, 1000);
    advance(m, 5);
    m.orderDepth(0, eid, 400);
    assert.equal(DepthOrder.follow[eid], 0);
    advance(m, 15);
    assert.ok(Math.abs(Position.depth[eid]! - 400) <= EPS, 'the depth order is what ran');
  });

  it('is ended by an attack, whatever its handle names, and the leg in flight is finished', () => {
    // A handle no contact answers to: the attack is refused further in, and
    // the floor is let go of before that, so whether a hull stops following
    // says nothing about what the handle named.
    const m = match(1000);
    const eid = seat(m, 300);
    onTheGround(m, eid, 1000);
    advance(m, 5); // mid-descent, on the mode's own leg to 970 m
    assert.ok(Position.depth[eid]! > 300 + EPS, 'the descent had begun');
    m.orderAttackContact(0, eid, 987_654);
    assert.equal(DepthOrder.follow[eid], 0, 'an attack keeps a depth of its own');
    advance(m, 20);
    assert.ok(
      Math.abs(Position.depth[eid]! - (1000 - FOLLOW_FLOOR.CLEARANCE_M)) <= EPS,
      'the descent it was on is finished, and held'
    );
  });

  it('is ended by a harvest, whose loop orders its own depth', () => {
    const m = match(1000);
    const node = spawnResourceNode(m.world, 1200, 4000);
    const eid = spawnUnit(m.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1000,
      y: 4000,
      depth: 300,
    });
    onTheGround(m, eid, 1000);
    assert.equal(DepthOrder.follow[eid], 1);
    m.orderHarvest(0, eid, node);
    assert.equal(DepthOrder.follow[eid], 0);
  });

  it('is left standing by stop and by hold position', () => {
    const m = match(1000);
    const eid = seat(m, 970);
    onTheGround(m, eid, 1000);
    m.orderStop(0, eid);
    assert.equal(DepthOrder.follow[eid], 1, 'stop halts the course, not the station');
    m.orderHold(0, eid, true);
    assert.equal(DepthOrder.follow[eid], 1, 'and so does hold position');
  });
});
