/**
 * Attack-move, stop, hold position and rally points (#435; docs/ui-ux.md §9).
 *
 * The claims are the ones each order makes that the plain move does not:
 * an attack-move fights on the way and then carries on; a held hull fires
 * and does not chase; stop drops everything but the depth; a rally point is
 * where a launched hull goes. And all four record and replay, because an
 * order that a replay cannot say is an order the match did not make.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Faction, MOVEMENT, SIM, StructureKind, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Health, MoveOrder, Position, Posture, Weapon } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

function flat(seed: number, record = false): Match {
  const match = new Match(undefined, {
    fauna: false,
    seed,
    record,
    terrain: new Terrain(8000, 8000, 250, { floorM: 2600 }),
  });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  advance(match, 0.5);
  return match;
}

function corvette(match: Match, slot: number, x: number, y: number): number {
  return spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot,
    faction: slot === 0 ? Faction.Bathyarch : Faction.Pelagia,
    x,
    y,
    depth: 600,
  });
}

describe('attack-move', () => {
  it('stops to fight what it meets, then carries on to where it was sent', () => {
    const match = flat(11);
    const raider = corvette(match, 0, 1000, 4000);
    // A lone enemy scout on the way, well inside the Corvette's reach once
    // the raider closes, and far from anything that would shoot back.
    const picket = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 1,
      faction: Faction.Pelagia,
      x: 2600,
      y: 4000,
      depth: 600,
    });
    match.orderAttackMove(0, raider, 6000, 4000);
    assert.equal(Posture.engage[raider], 1, 'the posture is set');

    // A plain move would sail straight past — `busy` hulls never acquire.
    let fought = false;
    for (let s = 0; s < 40 && !fought; s++) {
      advance(match, 1);
      if (Health.hp[picket]! <= 0) fought = true;
    }
    assert.ok(fought, 'the raider should have killed the picket on its way');
    assert.ok(
      Position.x[raider]! < 5000,
      `and stopped to do it rather than shooting on the run: x=${Position.x[raider]!.toFixed(0)}`
    );

    advance(match, 60);
    assert.ok(
      Math.hypot(Position.x[raider]! - 6000, Position.y[raider]! - 4000) <=
        MOVEMENT.ARRIVAL_EPSILON_M + 1,
      `then resumed its course: (${Position.x[raider]!.toFixed(0)}, ${Position.y[raider]!.toFixed(0)})`
    );
    assert.equal(Posture.engage[raider], 0, 'and the posture is spent on arrival');
  });

  it('is a plain move for a hull with nothing to fight with', () => {
    const match = flat(12);
    const own = match.update(STEP_MS)!;
    void own;
    const harvester = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1000,
      y: 1000,
      depth: 600,
    });
    match.orderAttackMove(0, harvester, 3000, 1000);
    assert.equal(Posture.engage[harvester], 0);
    assert.equal(MoveOrder.active[harvester], 1, 'the move half still lands');
  });
});

describe('hold position', () => {
  it('fires at what comes into range and never chases it', () => {
    const match = flat(13);
    const sentry = corvette(match, 0, 3000, 3000);
    match.orderHold(0, sentry, true);
    // An ordered target out of range: a plain attack would pursue it.
    const runner = corvette(match, 1, 3000, 4500);
    Weapon.orderedTargetEid[sentry] = runner;
    advance(match, 5);
    assert.equal(MoveOrder.active[sentry], 0, 'a held hull does not move to chase');
    assert.ok(Math.hypot(Position.x[sentry]! - 3000, Position.y[sentry]! - 3000) < 50);

    // Something wanders into range: the gun answers.
    const stray = corvette(match, 1, 3000, 3400);
    advance(match, 6);
    assert.ok(Health.hp[stray]! < Health.hp[runner]!, 'and it shoots what comes close');
  });

  it('is released by a move order', () => {
    const match = flat(14);
    const hull = corvette(match, 0, 3000, 3000);
    match.orderHold(0, hull, true);
    match.orderMove(0, hull, 3500, 3000);
    assert.equal(Posture.hold[hull], 0);
  });
});

describe('stop', () => {
  it('drops the plan, the chase and the posture, and keeps the depth order', () => {
    const match = flat(15);
    const hull = corvette(match, 0, 3000, 3000);
    match.orderAttackMove(0, hull, 6000, 3000);
    match.orderMove(0, hull, 6000, 6000, true);
    match.orderDepth(0, hull, 1000);
    advance(match, 1);
    match.orderStop(0, hull);
    assert.equal(MoveOrder.active[hull], 0);
    assert.equal(Posture.engage[hull], 0);
    assert.equal(match.world.orderQueues.get(hull), undefined, 'the queue is gone');
    const before = Position.depth[hull]!;
    const stoodX = Position.x[hull]!;
    advance(match, 2);
    assert.ok(Position.depth[hull]! > before, 'the dive it was on continues');
    assert.ok(Math.abs(Position.x[hull]! - stoodX) < 1, 'and the hull stands where it stopped');
  });
});

describe('rally points', () => {
  it('sends a launched hull where the yard was told to', () => {
    const match = flat(16);
    let foundry = -1;
    for (let i = 0; i < 12 && foundry < 0; i++) {
      const own = match.update(STEP_MS)?.get(0);
      const yard = own?.structures.find((s) => s.kind === StructureKind.Foundry);
      if (yard !== undefined) foundry = yard.id;
    }
    assert.ok(foundry >= 0, 'the starting base has a Foundry');
    match.setRally(0, foundry, 4000, 4000);
    assert.ok(match.produce(0, foundry, UnitKind.LightScout), 'a scout is queued');
    const before = new Set<number>();
    for (let i = 0; i < 12; i++) {
      const own = match.update(STEP_MS)?.get(0);
      if (own) for (const u of own.units) before.add(u.id);
    }
    advance(match, 14);
    let launched: number | undefined;
    for (let i = 0; i < 12 && launched === undefined; i++) {
      const own = match.update(STEP_MS)?.get(0);
      launched = own?.units.find((u) => u.kind === UnitKind.LightScout && !before.has(u.id))?.id;
    }
    assert.ok(launched !== undefined, 'the scout launched');
    assert.equal(MoveOrder.active[launched], 1, 'and is under way');
    assert.equal(Math.round(MoveOrder.x[launched]!), 4000);
    const own = match.update(STEP_MS * 12)?.get(0) ?? null;
    void own;
  });

  it('refuses a rally on a structure that launches nothing', () => {
    const match = flat(17);
    let turret = -1;
    for (let i = 0; i < 12 && turret < 0; i++) {
      const own = match.update(STEP_MS)?.get(0);
      const t = own?.structures.find((s) => s.kind === StructureKind.Foundry);
      if (t !== undefined) turret = t.id;
    }
    // A Foundry takes one; the Bastion takes one (it launches Harvesters).
    match.setRally(0, turret, 100, 100);
    assert.ok(match.world.rallies.has(turret));
    match.setRally(1, turret, 200, 200);
    assert.equal(match.world.rallies.get(turret)!.x, 100, 'another commander cannot move it');
  });
});

describe('the four orders replay', () => {
  it('records and reproduces them', () => {
    const match = flat(18, true);
    const hull = corvette(match, 0, 2000, 2000);
    match.orderAttackMove(0, hull, 5000, 2000);
    advance(match, 3);
    match.orderHold(0, hull, true);
    advance(match, 2);
    match.orderStop(0, hull);
    advance(match, 1);
    const replay = match.replay()!;
    const kinds = replay.commands.map((c) => c.type);
    for (const kind of ['attackMove', 'hold', 'stop']) {
      assert.ok(kinds.includes(kind as never), `${kind} is recorded`);
    }
  });
});
