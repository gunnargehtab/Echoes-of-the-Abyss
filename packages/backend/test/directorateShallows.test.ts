/**
 * The Directorate's shallow-water penalty (#154) — docs/factions.md
 * "Abyssal Directorate → Weakness", docs/systems-depth.md §3.
 *
 * "Shallow water poisons them. −20% speed and −15% HP above 400 m. The Rift's
 * most feared army can be beaten by refusing to descend."
 *
 * The speed half is a multiplier and behaves like the other four. The hull half
 * is the interesting one, and what most of this file pins is its *shape* rather
 * than its size: it bleeds rather than stepping, it stops at a floor, it never
 * kills, and it is not refunded by leaving. Those four together are what make
 * the Shelf a tax the Directorate can choose to pay, instead of a wall — which
 * is the difference between a weakness and a map edge.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEPTH_BANDS,
  DIRECTORATE_SHALLOW,
  DepthBand,
  Faction,
  SILENT_RUNNING,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Health, Position, Pressure } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const MAP_M = 8000;

/** The Shelf/Mid-Water line the penalty is defined against. Never restated. */
const LINE_M = DEPTH_BANDS[DepthBand.Shelf].max;
const SHALLOW_M = LINE_M - 100;
const DEEP_M = LINE_M + 200;

/** Open water, no regions, no hazards: nothing else may touch these numbers. */
const PLAIN: MapDefinition = { ...VENTFRONT_DIVIDE, id: 'test-shallows', regions: [], hazards: [] };

function match(): Match {
  return new Match(PLAIN, { fauna: false, seed: 154, terrain: new Terrain(MAP_M, MAP_M, 250) });
}

function advance(m: Match, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * SIM.TICK_HZ); i++) m.update(STEP_MS);
}

function seat(
  m: Match,
  faction: Faction,
  depth: number,
  kind: UnitKind = UnitKind.Corvette
): number {
  return spawnUnit(m.world, { kind, slot: 0, faction, x: 1000, y: 4000, depth });
}

/** How far east a hull gets in `seconds`, driving at a target it cannot reach. */
function reach(faction: Faction, depth: number, seconds: number, silent = false): number {
  const m = match();
  const eid = seat(m, faction, depth);
  if (silent) m.setSilentRunning(0, eid, true);
  m.orderMove(0, eid, 1000 + 6000, 4000);
  advance(m, seconds);
  return Position.x[eid]! - 1000;
}

describe('shallow water slows the Directorate', () => {
  it('costs them a fifth of their speed above the Shelf line', () => {
    const theirs = reach(Faction.Directorate, SHALLOW_M, 10);
    const anyone = reach(Faction.Bathyarch, SHALLOW_M, 10);
    assert.ok(anyone > 0, 'the control hull actually moved');
    assert.ok(
      Math.abs(theirs / anyone - DIRECTORATE_SHALLOW.SPEED_MULTIPLIER) < 1e-3,
      `expected ${DIRECTORATE_SHALLOW.SPEED_MULTIPLIER}x, got ${theirs / anyone}`
    );
  });

  it('and nothing at all below it — this is their water', () => {
    const theirs = reach(Faction.Directorate, DEEP_M, 10);
    const anyone = reach(Faction.Bathyarch, DEEP_M, 10);
    assert.ok(Math.abs(theirs - anyone) < 1e-3, 'no faction term applies in Mid-Water');
  });

  it('takes the line from the depth band rather than from a number of its own', () => {
    // 400 m is Mid-Water's first metre, not the Shelf's last. A hull sitting
    // exactly on the boundary is deep enough, and the two facts — where the
    // Shelf ends and where the poison ends — are the same fact.
    const onTheLine = reach(Faction.Directorate, LINE_M, 10);
    const aMetreAbove = reach(Faction.Directorate, LINE_M - 1, 10);
    const control = reach(Faction.Bathyarch, LINE_M, 10);
    assert.ok(Math.abs(onTheLine - control) < 1e-3, 'on the line is not shallow');
    assert.ok(aMetreAbove < onTheLine * 0.9, 'one metre above the line is');
  });

  it('stacks with silent running rather than replacing it', () => {
    // The established rule for every other movement modifier: two reasons to be
    // slow are two multipliers. A Directorate scout creeping through the
    // shallows is paying both prices, not the worse of them.
    const creepingShallow = reach(Faction.Directorate, SHALLOW_M, 10, true);
    const openControl = reach(Faction.Bathyarch, SHALLOW_M, 10);
    const expected = DIRECTORATE_SHALLOW.SPEED_MULTIPLIER * SILENT_RUNNING.SPEED_MULTIPLIER;
    assert.ok(
      Math.abs(creepingShallow / openControl - expected) < 1e-3,
      `expected ${expected}x, got ${creepingShallow / openControl}`
    );
  });
});

describe('shallow water bleeds the Directorate', () => {
  const floorOf = (kind: UnitKind): number => statsFor(kind).maxHp * DIRECTORATE_SHALLOW.HULL_FLOOR;

  it('drains hull while they stay above the line', () => {
    const m = match();
    const eid = seat(m, Faction.Directorate, SHALLOW_M);
    const full = Health.hp[eid]!;
    advance(m, 5);
    const bled = Health.hp[eid]!;
    assert.ok(bled < full, 'the water took something');
    assert.ok(bled > floorOf(UnitKind.Corvette), 'and has not finished taking it yet');
  });

  it('and stops at 85% of max, exactly', () => {
    const m = match();
    const eid = seat(m, Faction.Directorate, SHALLOW_M);
    advance(m, DIRECTORATE_SHALLOW.BLEED_S * 1.5);
    assert.ok(
      Math.abs(Health.hp[eid]! - floorOf(UnitKind.Corvette)) < 1e-3,
      `expected the floor, got ${Health.hp[eid]}`
    );
  });

  it('reaches that floor in about the time the constant says', () => {
    const m = match();
    const eid = seat(m, Faction.Directorate, SHALLOW_M);
    const floor = floorOf(UnitKind.Corvette);

    // A second short of the stated time it must still be bleeding; a second
    // over, it must be done. Pins the rate to the constant without pinning it
    // to a tick count.
    advance(m, DIRECTORATE_SHALLOW.BLEED_S - 1);
    assert.ok(Health.hp[eid]! > floor + 1e-6, 'not there yet at 19 s');
    advance(m, 2);
    assert.ok(Math.abs(Health.hp[eid]! - floor) < 1e-3, 'and there at 21 s');
  });

  it('prices it as a fraction of the hull, so it means the same to every unit', () => {
    // A flat DPS would be a rounding error on a Cruiser and a death sentence on
    // a scout. The doc says 15% of HP, and 15% is what both of them lose.
    const m = match();
    const scout = seat(m, Faction.Directorate, SHALLOW_M, UnitKind.LightScout);
    const cruiser = seat(m, Faction.Directorate, SHALLOW_M, UnitKind.Cruiser);
    advance(m, DIRECTORATE_SHALLOW.BLEED_S * 1.5);

    for (const [eid, kind] of [
      [scout, UnitKind.LightScout],
      [cruiser, UnitKind.Cruiser],
    ] as const) {
      const lost = 1 - Health.hp[eid]! / Health.max[eid]!;
      assert.ok(
        Math.abs(lost - (1 - DIRECTORATE_SHALLOW.HULL_FLOOR)) < 1e-3,
        `${UnitKind[kind]} lost ${(lost * 100).toFixed(1)}%`
      );
    }
  });

  it('never kills, however long a fleet loiters', () => {
    // The floor is what separates this from crush attrition, which runs to
    // zero. Refusing to descend beats the Directorate; it does not delete them.
    const m = match();
    const eid = seat(m, Faction.Directorate, SHALLOW_M);
    advance(m, 120);
    assert.ok(Health.hp[eid]! > 0, 'still alive after two minutes in the shallows');
    assert.ok(
      Math.abs(Health.hp[eid]! - floorOf(UnitKind.Corvette)) < 1e-3,
      'and still at the floor'
    );
  });

  it('takes nothing from anyone else in the same water', () => {
    const m = match();
    const theirs = seat(m, Faction.Directorate, SHALLOW_M);
    const others = [Faction.Bathyarch, Faction.Pelagia, Faction.Hadron].map((f) =>
      seat(m, f, SHALLOW_M)
    );
    advance(m, DIRECTORATE_SHALLOW.BLEED_S * 1.5);

    assert.ok(Health.hp[theirs]! < Health.max[theirs]!, 'the control is a real one');
    for (const eid of others) {
      assert.equal(
        Health.hp[eid]!,
        Health.max[eid]!,
        'shallow water is only poison to one faction'
      );
    }
  });

  it('takes nothing from the Directorate below the line', () => {
    const m = match();
    const eid = seat(m, Faction.Directorate, DEEP_M);
    advance(m, DIRECTORATE_SHALLOW.BLEED_S * 1.5);
    assert.equal(Health.hp[eid]!, Health.max[eid]!, 'Mid-Water is where they belong');
  });

  it('records the loss as unhealable rather than as damage', () => {
    // The HUD draws this segment of the bar as gone for good. Crush attrition
    // is the other writer; the number has to mean the same thing either way.
    const m = match();
    const eid = seat(m, Faction.Directorate, SHALLOW_M);
    advance(m, DIRECTORATE_SHALLOW.BLEED_S * 1.5);
    const lost = Health.max[eid]! - Health.hp[eid]!;
    assert.ok(lost > 0);
    // Not exact, and cannot be: hp and the ledger are separate f32 accumulators
    // fed the same bite for over a thousand ticks, so they round apart by a
    // fraction of a hit point. The crush ledger has always had the same
    // property. What matters is that they agree about what happened.
    assert.ok(
      Math.abs(Pressure.unhealable[eid]! - lost) < 0.05,
      `ledger ${Pressure.unhealable[eid]} against ${lost} lost`
    );
  });

  it('stops when they descend, and does not give the hull back', () => {
    const m = match();
    const eid = seat(m, Faction.Directorate, SHALLOW_M);
    advance(m, 5);
    const scarred = Health.hp[eid]!;
    assert.ok(scarred < Health.max[eid]!, 'it bled on the way');

    assert.ok(m.orderDepth(0, eid, DEEP_M), 'the dive is a legal order');
    advance(m, 15);
    assert.ok(Position.depth[eid]! >= LINE_M, 'and it arrived');
    assert.ok(
      Health.hp[eid]! < scarred + 1e-3,
      'going home does not refill what the shallows took'
    );
    const settled = Health.hp[eid]!;
    advance(m, 10);
    assert.equal(Health.hp[eid]!, settled, 'and the bleeding has stopped');
  });

  it('has nothing left to take from a hull already below the floor', () => {
    // The penalty is 15% of the hull once, not 15% every time they come up. A
    // ship that limps into the shallows at half health leaves at half health.
    const m = match();
    const eid = seat(m, Faction.Directorate, SHALLOW_M);
    Health.hp[eid] = Health.max[eid]! * 0.5;
    advance(m, DIRECTORATE_SHALLOW.BLEED_S * 1.5);
    assert.equal(Health.hp[eid]!, Health.max[eid]! * 0.5, 'the water found the same ceiling');
  });

  it('is a fact about hulls, not about everything the Directorate owns', () => {
    // Structures sit at their working depth and cannot rise; a base that bled
    // because the map put it shallow would be a penalty with no counterplay.
    // Forced shallow here because placement would normally refuse the ground.
    const m = match();
    const base = spawnStructure(m.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Directorate,
      x: 2000,
      y: 4000,
      depth: SHALLOW_M,
      prebuilt: true,
    });
    advance(m, DIRECTORATE_SHALLOW.BLEED_S * 1.5);
    assert.equal(Health.hp[base]!, Health.max[base]!, 'the shallows do not eat buildings');
  });
});
