/**
 * Hull separation (#113).
 *
 * The headline requirement is that a fleet under one move order arrives as a
 * formation rather than as a point — but the reason it matters is acoustic: a
 * stack of hulls at one coordinate is one acoustic position, and the Echo
 * Layer would report it as such.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Faction,
  SEPARATION,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
  unitRadiusM,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Position, SilentRunning } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

function spread(eids: number[]): number {
  let worst = 0;
  for (let i = 0; i < eids.length; i++) {
    for (let j = i + 1; j < eids.length; j++) {
      const d = Math.hypot(
        Position.x[eids[i]!]! - Position.x[eids[j]!]!,
        Position.y[eids[i]!]! - Position.y[eids[j]!]!
      );
      if (worst === 0 || d < worst) worst = d;
    }
  }
  return worst;
}

describe('separation', () => {
  it('spreads a fleet given one move order instead of stacking it', () => {
    const match = new Match(undefined, { fauna: false, seed: 4 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const fleet: number[] = [];
    for (let i = 0; i < 6; i++) {
      fleet.push(
        spawnUnit(match.world, {
          kind: UnitKind.Corvette,
          slot: 0,
          faction: Faction.Bathyarch,
          // Deliberately near-coincident: the worst case for a solver.
          x: 3000 + i * 2,
          y: 3000,
        })
      );
    }

    for (const eid of fleet) match.orderMove(0, eid, 3400, 3400);
    advance(match, 12);

    const closest = spread(fleet);
    const minimum = unitRadiusM(UnitKind.Corvette) * 2;
    assert.ok(
      closest >= minimum * 0.9,
      `hulls must keep station, closest pair ${closest.toFixed(1)}m vs ${minimum}m`
    );
  });

  it('separates hulls stacked at exactly the same point', () => {
    const match = new Match(undefined, { fauna: false, seed: 5 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const a = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 2000,
      y: 2000,
    });
    const b = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 2000,
      y: 2000,
    });
    advance(match, 6);

    const d = Math.hypot(Position.x[a]! - Position.x[b]!, Position.y[a]! - Position.y[b]!);
    assert.ok(d > 0, 'exactly-coincident hulls must find an axis to separate along');
    assert.ok(d >= unitRadiusM(UnitKind.Cruiser) * 2 * 0.9, `pushed to ${d.toFixed(1)}m`);
  });

  it('keeps hulls out of structure footprints', () => {
    const match = new Match(undefined, { fauna: false, seed: 6 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const refinery = spawnStructure(match.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5000,
      y: 5000,
      prebuilt: true,
    });
    const intruder = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5000,
      y: 5000,
    });

    // Ordered straight at the middle of the building; it must not get there.
    match.orderMove(0, intruder, 5000, 5000);
    advance(match, 6);

    const d = Math.hypot(
      Position.x[intruder]! - Position.x[refinery]!,
      Position.y[intruder]! - Position.y[refinery]!
    );
    const clear =
      unitRadiusM(UnitKind.LightScout) + structureStatsFor(StructureKind.Refinery).radiusM;
    assert.ok(d > 0, 'the hull left the centre of the footprint');
    assert.ok(
      d >= clear * 0.85,
      `hull sits ${d.toFixed(1)}m out, needs about ${clear.toFixed(0)}m`
    );
  });

  it('does not change what movement was already for', () => {
    // Separation is a correction, not a replacement: a lone unit must still
    // arrive exactly where it was sent, and silent running must still be slow.
    const match = new Match(undefined, { fauna: false, seed: 7 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const lone = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1500,
      y: 6500,
    });
    match.orderMove(0, lone, 2500, 6500);
    advance(match, 20);
    assert.ok(
      Math.hypot(Position.x[lone]! - 2500, Position.y[lone]! - 6500) < 10,
      'an unobstructed hull still arrives where it was sent'
    );

    const quiet = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1500,
      y: 500,
    });
    SilentRunning.active[quiet] = 1;
    match.orderMove(0, quiet, 7000, 500);
    advance(match, 5);
    const travelled = Position.x[quiet]! - 1500;
    const full = statsFor(UnitKind.Corvette).speed * 5;
    assert.ok(travelled < full * 0.7, 'silent running still costs speed');
  });

  it('stays inside the 60 Hz per-tick budget with a crowd', () => {
    const match = new Match(undefined, { fauna: false, seed: 8 });
    for (let slot = 0; slot < 4; slot++) match.addPlayer(slot, slot as Faction);
    // 200 hulls, deliberately clustered so separation has real work to do.
    for (let i = 0; i < 200; i++) {
      spawnUnit(match.world, {
        kind: (i % 5) as UnitKind,
        slot: i % 4,
        faction: (i % 4) as Faction,
        x: 3600 + ((i * 37) % 800),
        y: 3600 + ((i * 53) % 800),
      });
    }
    for (let i = 0; i < 120; i++) match.update(STEP_MS);

    const started = performance.now();
    const steps = 300;
    for (let i = 0; i < steps; i++) match.update(STEP_MS);
    const perTick = (performance.now() - started) / steps;

    // The whole 60 Hz step gets 16.6 ms; this asserts the entire sim stays
    // well inside it with a crowd, which is the number that actually matters.
    assert.ok(perTick < 8, `whole-sim tick averaged ${perTick.toFixed(3)} ms with 200 hulls`);
    console.log(`      separation crowd: whole sim ${perTick.toFixed(3)} ms/tick, 200 hulls`);
  });

  it('is deterministic', () => {
    const run = () => {
      const match = new Match(undefined, { fauna: false, seed: 9 });
      match.addPlayer(0, Faction.Bathyarch);
      advance(match, 0.5);
      const fleet = Array.from({ length: 8 }, (_, i) =>
        spawnUnit(match.world, {
          kind: UnitKind.Corvette,
          slot: 0,
          faction: Faction.Bathyarch,
          x: 4000,
          y: 4000 + i,
        })
      );
      advance(match, 5);
      return fleet.map((e) => `${Position.x[e]!.toFixed(6)},${Position.y[e]!.toFixed(6)}`);
    };
    assert.deepEqual(run(), run(), 'the coincident-hull tie-break must not vary between runs');
  });

  it('leaves SEPARATION.STIFFNESS in a range that settles rather than oscillates', () => {
    assert.ok(SEPARATION.STIFFNESS > 0 && SEPARATION.STIFFNESS < 1);
  });
});
