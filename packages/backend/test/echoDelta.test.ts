/**
 * What the delta channel (#433) saves on a real match, and that it never
 * loses anything: every reconstructed snapshot equals the one the server
 * assembled, over a match with hulls moving, fauna in the water, hazards
 * cycling and shots fired.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Faction, SIM, UnitKind, applyEchoWire, encodeEcho, wireEqual } from '@echoes/shared';
import type { EchoSnapshot } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

describe('the Echo delta on a live match', () => {
  it('reconstructs every snapshot exactly and sends a fraction of the bytes', () => {
    const match = new Match(undefined, { fauna: true, seed: 8 });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Directorate);
    // Two forces sent at each other, so contacts, shots and marks all happen.
    const raiders: number[] = [];
    for (let i = 0; i < 12; i++) {
      raiders.push(
        spawnUnit(match.world, {
          kind: i % 3 === 0 ? UnitKind.Cruiser : UnitKind.Corvette,
          slot: 0,
          faction: Faction.Bathyarch,
          x: 1500 + (i % 4) * 150,
          y: 1500 + Math.floor(i / 4) * 150,
          depth: 600,
        })
      );
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction: Faction.Directorate,
        x: 6000 + (i % 4) * 150,
        y: 6000 + Math.floor(i / 4) * 150,
        depth: 600,
      });
    }
    for (const eid of raiders) match.orderAttackMove(0, eid, 6200, 6200);

    let seq = 0;
    let last: { seq: number; snapshot: EchoSnapshot } | null = null;
    let fullBytes = 0;
    let wireBytes = 0;
    let passes = 0;
    for (let tick = 0; tick < 90 * SIM.TICK_HZ; tick++) {
      const snapshots = match.update(STEP_MS);
      if (snapshots === null) continue;
      const next = snapshots.get(0)!;
      seq++;
      const wire = encodeEcho(last?.snapshot ?? null, next, seq);
      const got = applyEchoWire(last, wire);
      assert.ok(got !== null, `pass ${seq} applied`);
      assert.ok(wireEqual(got, next), `pass ${seq} reconstructs the snapshot exactly`);
      fullBytes += JSON.stringify(next).length;
      wireBytes += JSON.stringify(wire).length;
      // The client keeps what it reconstructed, never the server's object.
      last = { seq, snapshot: got };
      passes++;
    }
    assert.ok(passes > 400, `the match ran ${passes} Echo passes`);
    const ratio = wireBytes / fullBytes;
    console.log(
      `echo delta over ${passes} passes: ${(fullBytes / passes).toFixed(0)} B full, ` +
        `${(wireBytes / passes).toFixed(0)} B on the wire — ${(ratio * 100).toFixed(0)}%`
    );
    assert.ok(
      ratio < 0.5,
      `the wire should carry under half the bytes, got ${(ratio * 100).toFixed(0)}%`
    );
  });
});
