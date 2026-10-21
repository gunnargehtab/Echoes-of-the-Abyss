/**
 * The silt plume under own harvesters while they dredge (#1512, from #1467).
 * The three.js objects here need no GL — these tests read the mote ring's
 * buffers the render would.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { BERTHS, HarvestThrottle, ResourceKind, UnitKind, type OwnUnit } from '@echoes/shared';
import {
  PLUME_LIFE_MS,
  PLUME_MOTES_PER_HULL,
  PLUME_POOL,
  PLUME_RADIUS_M,
  SiltPlume,
  plumeStrength,
  type PlumeSource,
} from '../src/game/siltPlume.ts';
import { HeadlessWebGLRenderer } from './support/headless.ts';

const harvester = (cargo: number, throttle?: HarvestThrottle): OwnUnit => ({
  id: 13,
  kind: UnitKind.Harvester,
  x: 760,
  y: 640,
  depth: 1400,
  hp: 140,
  maxHp: 140,
  heading: 0,
  sig: 45,
  silentRunning: false,
  engineOff: false,
  pressureRating: 2,
  pressureBonus: 0,
  unhealableDamage: 0,
  cargo,
  cargoKind: ResourceKind.Nodule,
  ...(throttle === undefined ? {} : { throttle }),
});

const source = (id: number, x: number, strength: number): PlumeSource => ({
  id,
  x,
  y: -300,
  z: 0,
  strength,
});

/** Hold one plume for `ms` at 16 ms a frame, from `t0`; returns the clock. */
const dredge = (plume: SiltPlume, sources: PlumeSource[], ms: number, t0 = 0): number => {
  let t = t0;
  for (; t <= t0 + ms; t += 16) plume.sync(sources, sources.length, 1, t);
  return t;
};

describe('plumeStrength', () => {
  it('plumes while cargo rises, and not while it holds', () => {
    assert.ok(plumeStrength(100, harvester(104, HarvestThrottle.Standard)) > 0);
    assert.equal(plumeStrength(104, harvester(104, HarvestThrottle.Standard)), 0, 'flat');
    assert.equal(plumeStrength(220, harvester(0, HarvestThrottle.Standard)), 0, 'delivered');
    assert.equal(plumeStrength(undefined, harvester(104, HarvestThrottle.Standard)), 0, 'first');
  });

  it('never plumes for a struck dredge', () => {
    assert.equal(plumeStrength(100, harvester(104)), 0);
  });

  it('never plumes for a hull that is not a harvester', () => {
    const scout = { ...harvester(104, HarvestThrottle.Standard), kind: UnitKind.LightScout };
    assert.equal(plumeStrength(100, { ...scout, throttle: undefined, cargo: undefined }), 0);
  });

  it('grows with the throttle, full at Overburden', () => {
    const at = (t: HarvestThrottle) => plumeStrength(100, harvester(104, t));
    assert.ok(at(HarvestThrottle.Trickle) < at(HarvestThrottle.Standard));
    assert.ok(at(HarvestThrottle.Standard) < at(HarvestThrottle.Overburden));
    assert.equal(at(HarvestThrottle.Overburden), 1);
  });
});

describe('SiltPlume', () => {
  it('stirs a full plume’s motes per life, and a quieter one fewer', () => {
    const full = new SiltPlume();
    dredge(full, [source(1, 0, 1)], PLUME_LIFE_MS);
    assert.ok(Math.abs(full.stirredCount - PLUME_MOTES_PER_HULL) <= 1, `${full.stirredCount}`);
    const quiet = new SiltPlume();
    dredge(quiet, [source(1, 0, 0.4)], PLUME_LIFE_MS);
    assert.ok(quiet.stirredCount < full.stirredCount);
    assert.ok(quiet.stirredCount > 0);
  });

  it('stirs within its radius of the keel, wider for a harder dredge', () => {
    const spread = (strength: number): number => {
      const plume = new SiltPlume();
      dredge(plume, [source(1, 0, strength)], PLUME_LIFE_MS / 2);
      let far = 0;
      for (let i = 0; i < plume.stirredCount; i++) {
        const m = plume.moteAt(i);
        far = Math.max(far, Math.hypot(m.x, m.z));
      }
      return far;
    };
    const hard = spread(1);
    assert.ok(hard <= PLUME_RADIUS_M + 1e-4);
    assert.ok(spread(0.35) < hard);
  });

  it('rises and settles on one line, never sideways (docs/map-visuals.md §8)', () => {
    const plume = new SiltPlume();
    const s = source(1, 0, 1);
    // One frame's worth of motes, then stop stirring and watch them.
    const t = dredge(plume, [s], PLUME_LIFE_MS / PLUME_MOTES_PER_HULL + 16);
    s.strength = 0;
    plume.sync([s], 1, 1, t);
    const born = plume.moteAt(0);
    plume.tick(t + PLUME_LIFE_MS / 2 - 100);
    const mid = plume.moteAt(0);
    assert.equal(mid.x, born.x, 'no drift');
    assert.equal(mid.z, born.z);
    assert.ok(mid.y > born.y, 'it lifts');
    plume.tick(t + PLUME_LIFE_MS - 50);
    const late = plume.moteAt(0);
    assert.ok(late.y < mid.y, 'and settles');
    assert.equal(late.x, born.x);
    plume.tick(t + PLUME_LIFE_MS + 100);
    assert.equal(plume.count, 0);
    assert.equal(plume.points.visible, false, 'nothing alive draws nothing');
  });

  it('stops stirring the moment the dredge stops biting', () => {
    const plume = new SiltPlume();
    const s = source(1, 0, 1);
    const t = dredge(plume, [s], PLUME_LIFE_MS);
    const stirred = plume.stirredCount;
    dredge(plume, [], PLUME_LIFE_MS, t);
    assert.equal(plume.stirredCount, stirred);
    assert.equal(plume.count, 0);
  });

  it('does not dump a burst after a stalled frame', () => {
    const plume = new SiltPlume();
    const s = source(1, 0, 1);
    plume.sync([s], 1, 1, 0);
    plume.sync([s], 1, 1, 60_000);
    assert.ok(plume.stirredCount <= PLUME_MOTES_PER_HULL);
  });

  it('fits a berth list of harvesters on Overburden in its fixed ring', () => {
    const plume = new SiltPlume();
    const fleet = Array.from({ length: BERTHS.CEILING }, (_, i) => source(i + 1, i * 100, 1));
    dredge(plume, fleet, 3 * PLUME_LIFE_MS);
    assert.equal(plume.poolSize, PLUME_POOL, 'the ring never grew');
    assert.ok(plume.count <= PLUME_POOL);
    assert.ok(plume.count >= BERTHS.CEILING * (PLUME_MOTES_PER_HULL - 2));
  });

  it('is one draw for one harvester or forty, and none once it settles', () => {
    const gl = new HeadlessWebGLRenderer();
    const camera = new PerspectiveCamera();
    const plume = new SiltPlume();
    const scene = new Scene().add(plume.points);
    let t = 0;
    for (const n of [1, BERTHS.CEILING]) {
      const fleet = Array.from({ length: n }, (_, i) => source(i + 1, i * 100, 1));
      t = dredge(plume, fleet, PLUME_LIFE_MS / 2, t);
      assert.ok(plume.count >= n, `${n} plumes are in the draw`);
      gl.render(scene, camera);
      assert.equal(gl.ledger.calls, 1, `${n} harvesters`);
    }
    plume.sync([], 0, 1, t + PLUME_LIFE_MS + 100);
    gl.render(scene, camera);
    assert.equal(gl.ledger.calls, 0, 'a settled plume costs nothing');
  });

  it('keeps a static plume under reduced motion (docs/ui-ux.md §11)', () => {
    const plume = new SiltPlume();
    plume.setReducedMotion(true);
    const s = source(1, 0, 1);
    const t = dredge(plume, [s], PLUME_LIFE_MS / 4);
    const born = plume.moteAt(0);
    plume.tick(t + 200);
    assert.ok(plume.count > 0, 'still drawn');
    assert.equal(plume.moteAt(0).y, born.y, 'and none lifts');
  });

  it('freezes motes already lifting when reduced motion turns on, without a drop', () => {
    const plume = new SiltPlume();
    const t = dredge(plume, [source(1, 0, 1)], PLUME_LIFE_MS / 4);
    const lifting = plume.moteAt(0);
    plume.setReducedMotion(true);
    plume.tick(t + 400);
    assert.ok(Math.abs(plume.moteAt(0).y - lifting.y) < 1e-4, 'held where it was drawn');
  });

  it('clears every mote for a new match', () => {
    const plume = new SiltPlume();
    const t = dredge(plume, [source(1, 0, 1)], PLUME_LIFE_MS);
    plume.reset();
    plume.tick(t + 16);
    assert.equal(plume.count, 0);
    assert.equal(plume.points.visible, false);
  });
});
