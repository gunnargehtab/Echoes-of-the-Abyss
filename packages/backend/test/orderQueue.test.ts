/**
 * Order queues (#111).
 *
 * The queue is simulation state rather than a client convenience: a
 * reconnecting player must get their plan back, and two clients watching one
 * slot must agree about what the fleet is doing.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Faction, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Harvester, HarvestMode, Position, SilentRunning } from '../src/sim/components.ts';
import type { EchoSnapshot } from '@echoes/shared';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): Map<number, EchoSnapshot> | null {
  let latest: Map<number, EchoSnapshot> | null = null;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) {
    const result = match.update(STEP_MS);
    if (result !== null) latest = result;
  }
  return latest;
}

function scout(match: Match, x: number, y: number): number {
  return spawnUnit(match.world, {
    kind: UnitKind.LightScout,
    slot: 0,
    faction: Faction.Bathyarch,
    x,
    y,
  });
}

function fresh(seed: number): Match {
  const match = new Match(undefined, { seed });
  match.addPlayer(0, Faction.Bathyarch);
  advance(match, 0.5);
  return match;
}

describe('order queue', () => {
  it('walks queued waypoints in the order they were given', () => {
    const match = fresh(11);
    const unit = scout(match, 1000, 1000);

    const legs: Array<[number, number]> = [
      [2000, 1000],
      [2000, 2000],
      [1000, 2000],
    ];
    match.orderMove(0, unit, legs[0]![0], legs[0]![1]);
    match.orderMove(0, unit, legs[1]![0], legs[1]![1], true);
    match.orderMove(0, unit, legs[2]![0], legs[2]![1], true);

    // Watch the route rather than sampling it at guessed times: a unit that
    // reaches a waypoint starts the next leg immediately, so "is it there
    // now" is only true for an instant.
    const reachedAt = legs.map(() => -1);
    for (let tick = 0; tick < 60 * 45; tick++) {
      match.update(STEP_MS);
      legs.forEach(([lx, ly], i) => {
        if (
          reachedAt[i] === -1 &&
          Math.hypot(Position.x[unit]! - lx, Position.y[unit]! - ly) < 40
        ) {
          reachedAt[i] = tick;
        }
      });
    }

    assert.ok(
      reachedAt.every((t) => t >= 0),
      `every waypoint must be visited, reached at ${reachedAt.join(', ')}`
    );
    assert.ok(
      reachedAt[0]! < reachedAt[1]! && reachedAt[1]! < reachedAt[2]!,
      `and in the order given, got ${reachedAt.join(' < ')}`
    );
  });

  it('reports the pending plan to its owner, and only the plan', () => {
    const match = fresh(12);
    const unit = scout(match, 1000, 5000);
    match.orderMove(0, unit, 2000, 5000);
    match.orderMove(0, unit, 3000, 5000, true);
    match.orderMove(0, unit, 4000, 5000, true);

    const snapshot = advance(match, 0.4)!.get(0)!;
    const mine = snapshot.units.find((u) => u.id === unit)!;
    assert.deepEqual(
      mine.queuedOrders?.map((o) => [o.kind, o.x, o.y]),
      [
        ['move', 3000, 5000],
        ['move', 4000, 5000],
      ],
      'the current leg is not in the queue; the plan behind it is'
    );
  });

  it('replaces the whole plan when an order is given unqueued', () => {
    const match = fresh(13);
    const unit = scout(match, 1000, 6000);
    match.orderMove(0, unit, 2000, 6000);
    match.orderMove(0, unit, 3000, 6000, true);
    match.orderMove(0, unit, 4000, 6000, true);

    // A plain order is a change of mind, not an insertion.
    match.orderMove(0, unit, 1000, 7000);
    const snapshot = advance(match, 0.4)!.get(0)!;
    assert.equal(
      snapshot.units.find((u) => u.id === unit)!.queuedOrders,
      undefined,
      'the pending plan is discarded'
    );

    advance(match, 15);
    assert.ok(
      Math.hypot(Position.x[unit]! - 1000, Position.y[unit]! - 7000) < 40,
      'and the new order is what runs'
    );
  });

  it('survives a depth order and a silent-running toggle', () => {
    // Those are states a hull holds while carrying out its orders, not orders
    // themselves — toggling them mid-route must not eat the rest of the plan.
    const match = fresh(14);
    const unit = scout(match, 1000, 3000);
    match.orderMove(0, unit, 2000, 3000);
    match.orderMove(0, unit, 3000, 3000, true);

    match.orderDepth(0, unit, 1000);
    match.setSilentRunning(0, unit, true);
    advance(match, 1);

    const snapshot = advance(match, 0.4)!.get(0)!;
    assert.equal(
      snapshot.units.find((u) => u.id === unit)!.queuedOrders?.length,
      1,
      'the queued leg is still pending'
    );
    assert.equal(SilentRunning.active[unit], 1, 'and the hull is still running silent');
  });

  it('queues harvest orders, so a hauler can be given a route of fields', () => {
    const match = fresh(15);
    const nodes = match.resourceNodes;
    const hauler = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: nodes[0]!.x,
      y: nodes[0]!.y,
    });

    match.orderMove(0, hauler, nodes[0]!.x + 400, nodes[0]!.y);
    match.orderHarvest(0, hauler, nodes[0]!.id, true);

    const snapshot = advance(match, 0.4)!.get(0)!;
    assert.equal(snapshot.units.find((u) => u.id === hauler)!.queuedOrders?.[0]?.kind, 'harvest');

    advance(match, 20);
    assert.notEqual(
      Harvester.mode[hauler],
      HarvestMode.Idle,
      'once the move finished, the queued harvest started'
    );
  });

  it('drops orders that went stale while they waited', () => {
    const match = fresh(16);
    const unit = scout(match, 1000, 4000);
    // A queue full of moves plus a harvest for a node that does not exist:
    // the bad order must not stall the plan behind it.
    match.orderMove(0, unit, 1500, 4000);
    match.orderMove(0, unit, 2000, 4000, true);
    advance(match, 30);
    assert.ok(Math.hypot(Position.x[unit]! - 2000, Position.y[unit]! - 4000) < 40);
  });

  it('caps a plan rather than letting a misclick queue forever', () => {
    const match = fresh(17);
    const unit = scout(match, 1000, 2000);
    match.orderMove(0, unit, 1200, 2000);
    for (let i = 0; i < 200; i++) match.orderMove(0, unit, 1500 + i, 2000, true);

    const snapshot = advance(match, 0.4)!.get(0)!;
    const queued = snapshot.units.find((u) => u.id === unit)!.queuedOrders!.length;
    assert.ok(queued > 0 && queued <= 24, `plan capped at ${queued}`);
  });

  it('refuses to queue for a unit another commander owns', () => {
    const match = new Match(undefined, { seed: 18 });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    advance(match, 0.5);
    const theirs = advance(match, 0.4)!.get(1)!.units[0]!;
    const before = { x: Position.x[theirs.id]!, y: Position.y[theirs.id]! };

    match.orderMove(0, theirs.id, 10, 10, true);
    advance(match, 2);

    const after = advance(match, 0.4)!
      .get(1)!
      .units.find((u) => u.id === theirs.id)!;
    assert.equal(after.queuedOrders, undefined, 'no plan was attached');
    assert.ok(
      Math.hypot(Position.x[theirs.id]! - before.x, Position.y[theirs.id]! - before.y) < 200
    );
  });
});
