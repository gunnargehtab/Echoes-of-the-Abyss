/**
 * The Echo snapshot delta (#433).
 *
 * One property carries the whole feature: applying the patch the server made
 * from (prev, next) to prev yields next, exactly — every field, every entry,
 * in order, with fresh objects. Everything else is the edges of that: a
 * field that disappears, an entry that leaves, an order that changes, a
 * patch that arrives out of sequence.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KEYFRAME_EVERY,
  ResolutionTier,
  UnitKind,
  applyEchoWire,
  encodeEcho,
  wireEqual,
} from '../dist/index.js';
import type { EchoSnapshot, OwnUnit } from '../dist/index.js';

function hull(id: number, x: number, y: number, extra: Partial<OwnUnit> = {}): OwnUnit {
  return {
    id,
    kind: UnitKind.Corvette,
    x,
    y,
    depth: 600,
    hp: 420,
    maxHp: 420,
    heading: 0,
    sig: 28,
    silentRunning: false,
    engineOff: false,
    pressureBonus: 0,
    unhealableDamage: 0,
    ...extra,
  };
}

function snapshot(tick: number, units: OwnUnit[], extra: Partial<EchoSnapshot> = {}): EchoSnapshot {
  return {
    tick,
    units,
    structures: [],
    ordnance: [],
    contacts: [],
    peakSig: 28,
    nodules: 100,
    crystal: 0,
    biomass: 0,
    berths: { used: 2, granted: 24 },
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 4, demand: 2, satisfaction: 1 },
    driftHealth: [80, 80, 80, 80],
    hazards: [],
    marks: [],
    shoals: [],
    jellies: [],
    ...extra,
  };
}

function roundTrip(prev: EchoSnapshot, next: EchoSnapshot, seq = 7): EchoSnapshot {
  const wire = encodeEcho(prev, next, seq);
  const got = applyEchoWire({ seq: seq - 1, snapshot: prev }, wire);
  assert.ok(got !== null, 'a patch in sequence applies');
  return got;
}

describe('the Echo delta', () => {
  it('reconstructs the next snapshot exactly, field by field', () => {
    const prev = snapshot(60, [hull(1, 0, 0), hull(2, 100, 100, { depthOrder: 900 })], {
      contacts: [{ id: 40, tier: ResolutionTier.Bearing, x: 500, y: 500, tick: 60 }],
    });
    const next = snapshot(72, [hull(1, 5, 2, { sig: 31 }), hull(2, 100, 100)], {
      nodules: 130,
      driftHealth: [80, 79, 80, 80],
      contacts: [
        { id: 40, tier: ResolutionTier.Classification, x: 510, y: 500, tick: 72, depth: 600 },
      ],
      selfEvents: [],
    });
    const wire = encodeEcho(prev, next, 7);
    assert.equal(wire.kind, 'patch');
    const got = roundTrip(prev, next);
    assert.deepEqual(got, next);
    assert.ok(wireEqual(got, next));
    // A changed hull is sent as its changed fields, not whole.
    const patched = (wire as { units?: { set?: object[] } }).units?.set ?? [];
    assert.deepEqual(patched, [
      { id: 1, x: 5, y: 2, sig: 31 },
      { id: 2, depthOrder: null },
    ]);
    // And the drift grid as the one region that moved.
    assert.deepEqual((wire as { driftHealth?: number[] }).driftHealth, [1, 79]);
  });

  it('never hands back the previous snapshot’s objects', () => {
    const prev = snapshot(60, [hull(1, 0, 0), hull(2, 100, 100)]);
    const next = snapshot(72, [hull(1, 5, 2), hull(2, 100, 100)]);
    const got = roundTrip(prev, next);
    assert.notEqual(got.units, prev.units);
    assert.notEqual(got.units[0], prev.units[0], 'a changed entry is a new object');
    assert.equal(prev.units[0]!.x, 0, 'and the previous one was not moved');
  });

  it('carries entries that come and go, and the order they come in', () => {
    const prev = snapshot(60, [hull(1, 0, 0), hull(2, 100, 100), hull(3, 200, 200)]);
    const next = snapshot(72, [hull(4, 9, 9), hull(1, 0, 0), hull(3, 200, 200)]);
    const wire = encodeEcho(prev, next, 3) as { units?: { del?: number[]; order?: number[] } };
    assert.deepEqual(wire.units?.del, [2]);
    assert.deepEqual(wire.units?.order, [4, 1, 3]);
    assert.deepEqual(roundTrip(prev, next, 3), next);
  });

  it('sends nothing for what did not change', () => {
    const prev = snapshot(60, [hull(1, 0, 0)]);
    const next = { ...snapshot(72, [hull(1, 0, 0)]) };
    const wire = encodeEcho(prev, next, 3);
    assert.deepEqual(wire, { kind: 'patch', seq: 3, tick: 72, selfEvents: [] });
    assert.deepEqual(roundTrip(prev, next, 3), next);
  });

  it('is whole for a first send and on the keyframe cadence', () => {
    const next = snapshot(72, [hull(1, 0, 0)]);
    assert.equal(encodeEcho(null, next, 1).kind, 'full');
    assert.equal(encodeEcho(next, next, KEYFRAME_EVERY).kind, 'full');
    assert.equal(encodeEcho(next, next, KEYFRAME_EVERY + 1).kind, 'patch');
  });

  it('refuses a patch out of sequence, and takes a keyframe from nothing', () => {
    const prev = snapshot(60, [hull(1, 0, 0)]);
    const next = snapshot(72, [hull(1, 5, 5)]);
    const wire = encodeEcho(prev, next, 9);
    assert.equal(applyEchoWire({ seq: 7, snapshot: prev }, wire), null, 'a gap is refused');
    assert.equal(applyEchoWire(null, wire), null, 'and so is a patch onto nothing');
    const key = encodeEcho(null, next, 10);
    assert.deepEqual(applyEchoWire(null, key), next);
  });
});
