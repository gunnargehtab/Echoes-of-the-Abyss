/**
 * Floor-following — docs/systems-depth.md §2 "Steering along the ground",
 * Phase 3 of docs/three-layer-ocean.md.
 *
 * The standing order's promises: it holds the clearance, it follows the ground
 * down at a dive's rate and loudness (and breaks Silent Running the way a dive
 * order does), it rides the ground back up, it disengages at the hull's PR
 * edge rather than feeding it into crush, and any manual depth order replaces
 * it. Engaging is the commitment; everything after is the ground's shape.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEPTH, Faction, FOLLOW_FLOOR, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { DepthOrder, Position, Pressure, SilentRunning } from '../src/sim/components.ts';
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

describe('floor-following', () => {
  it('settles at the clearance above the ground and station-keeps there', () => {
    const m = match(1000);
    const eid = seat(m, 300);
    assert.equal(m.orderFollowFloor(0, eid, true), true);
    advance(m, 20); // (970 − 300) / 45 ≈ 15 s of descent
    assert.ok(Math.abs(Position.depth[eid]! - (1000 - FOLLOW_FLOOR.CLEARANCE_M)) <= EPS);
    // Settled means settled: no order churn once on station.
    assert.equal(DepthOrder.active[eid], 0);
  });

  it('follows the ground down as a dive — loud, and never silently', () => {
    const m = match(1000);
    const eid = seat(m, 300);
    m.orderFollowFloor(0, eid, true);
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
    m.orderFollowFloor(0, eid, true);
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
    m.orderFollowFloor(0, eid, true);
    advance(m, 5);
    assert.equal(DepthOrder.follow[eid], 0, 'the standing order stood down');
    assert.ok(Math.abs(Position.depth[eid]! - 300) <= EPS, 'and the hull held its depth');
    assert.equal(Pressure.unhealable[eid], 0, 'not one metre of crush was spent for it');
  });

  it('is replaced by a manual depth order — the newer instruction wins', () => {
    const m = match(1000);
    const eid = seat(m, 300);
    m.orderFollowFloor(0, eid, true);
    advance(m, 5);
    m.orderDepth(0, eid, 400);
    assert.equal(DepthOrder.follow[eid], 0);
    advance(m, 15);
    assert.ok(Math.abs(Position.depth[eid]! - 400) <= EPS, 'the manual order is what ran');
  });

  it('disarming holds the hull where it is', () => {
    const m = match(1000);
    const eid = seat(m, 300);
    m.orderFollowFloor(0, eid, true);
    advance(m, 5); // mid-descent
    const midway = Position.depth[eid]!;
    assert.ok(midway > 300 + EPS, 'the descent had begun');
    m.orderFollowFloor(0, eid, false);
    advance(m, 5);
    assert.ok(Math.abs(Position.depth[eid]! - midway) <= EPS, 'held, not carried on');
  });
});
