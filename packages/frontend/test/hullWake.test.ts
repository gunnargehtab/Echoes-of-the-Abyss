/**
 * The cavitation wake behind own hulls (#1508, docs/art-direction.md
 * "Animation Style"). The three.js objects here need no GL — these tests read
 * the bubble ring's buffers the render would.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { BERTHS, SIG_BANDS, SILENT_RUNNING, UnitKind, statsFor } from '@echoes/shared';
import {
  HullWake,
  WAKE_BUBBLES_PER_HULL,
  WAKE_FLOOR,
  WAKE_LIFE_MS,
  WAKE_MIN_SHARE,
  WAKE_MIN_SPEED_MPS,
  WAKE_POOL,
  WAKE_SPACING_M,
  wakeStrength,
  type WakeSource,
} from '../src/game/hullWake.ts';
import { HeadlessWebGLRenderer } from './support/headless.ts';

const RUNNING = 8;

/** A source at a slow cruise, where the near spacing is the one that holds. */
const source = (id: number, x: number, strength: number, heading = 0): WakeSource => ({
  id,
  speedMps: 5,
  x,
  y: -300,
  z: 0,
  heading,
  sternM: 10,
  strength,
});

describe('wakeStrength', () => {
  it('rises with SIG on gate 3’s curve, full at the red stop', () => {
    const quiet = wakeStrength(30, RUNNING, false);
    const loud = wakeStrength(55, RUNNING, false);
    assert.ok(quiet < loud, 'louder is stronger');
    assert.equal(wakeStrength(SIG_BANDS.RED, RUNNING, false), 1);
    assert.equal(wakeStrength(100, RUNNING, false), 1, 'clamped');
  });

  it('leaves a silent hull a faint wake rather than none', () => {
    assert.equal(wakeStrength(SILENT_RUNNING.SIG_MAX, RUNNING, false), WAKE_FLOOR);
  });

  it('is zero with the engine cut, or with the hull holding still', () => {
    assert.equal(wakeStrength(60, RUNNING, true), 0);
    assert.equal(wakeStrength(60, 0, false), 0);
    assert.equal(wakeStrength(60, WAKE_MIN_SPEED_MPS / 2, false), 0);
    assert.ok(wakeStrength(60, WAKE_MIN_SPEED_MPS, false) > 0);
  });
});

describe('HullWake', () => {
  /** Run one hull `metres` along +X in 1 m steps, a frame each at 16 ms. */
  const run = (wake: HullWake, s: WakeSource, metres: number, t0 = 0): number => {
    let t = t0;
    for (let m = 0; m <= metres; m++) {
      s.x = m;
      wake.sync([s], 1, 1, t);
      t += 16;
    }
    return t;
  };

  it('sheds one bubble per spacing of ground covered, astern, whatever the frame rate', () => {
    const wake = new HullWake();
    run(wake, source(1, 0, 1), 10 * WAKE_SPACING_M);
    assert.equal(wake.shedCount, 10);
    const coarse = new HullWake();
    const s = source(1, 0, 1);
    coarse.sync([s], 1, 1, 0);
    s.x = 10 * WAKE_SPACING_M;
    coarse.sync([s], 1, 1, 16);
    assert.equal(coarse.shedCount, 10, 'one long frame sheds what many short ones do');
    // The stern is 10 m behind a bow on +X: the first bubble is shed there.
    assert.ok(Math.abs(coarse.bubbleAt(0).x - (WAKE_SPACING_M - 10)) < 1e-4);
    assert.ok(Math.abs(coarse.bubbleAt(0).z) < 1e-4, 'and nowhere sideways');
  });

  it('draws every hull from one fixed ring, recycling the oldest', () => {
    const wake = new HullWake();
    const sources = [source(1, 0, 1), source(2, 0, 1), source(3, 0, 1)];
    let t = 0;
    for (let m = 0; m <= 1000; m += 5) {
      for (const s of sources) s.x = m;
      wake.sync(sources, 3, 1, t);
      t += 16;
    }
    assert.ok(wake.shedCount > WAKE_POOL, 'shed more than the ring holds');
    assert.equal(wake.poolSize, WAKE_POOL, 'and the ring never grew');
    assert.equal(wake.points.geometry.getAttribute('position').count, WAKE_POOL);
  });

  it('leaves bubbles where they were shed, climbing straight up, then gone', () => {
    const wake = new HullWake();
    const t = run(wake, source(1, 0, 1), 2 * WAKE_SPACING_M);
    const born = wake.bubbleAt(0);
    wake.tick(t + 1000);
    const later = wake.bubbleAt(0);
    assert.equal(later.x, born.x, 'the hull moved on; the bubble did not');
    assert.equal(later.z, born.z);
    assert.ok(later.y > born.y, 'bubbles climb');
    wake.tick(t + WAKE_LIFE_MS + 100);
    assert.equal(wake.count, 0);
    assert.equal(wake.live, false);
    assert.equal(wake.points.visible, false, 'nothing alive draws nothing');
  });

  it('makes a louder wake brighter and longer-lived', () => {
    const loud = new HullWake();
    const quiet = new HullWake();
    const t = run(loud, source(1, 0, 1), WAKE_SPACING_M);
    run(quiet, source(1, 0, WAKE_FLOOR), WAKE_SPACING_M);
    assert.ok(quiet.levelAt(0) < loud.levelAt(0), 'fainter');
    const quietLife = WAKE_LIFE_MS * (WAKE_MIN_SHARE + (1 - WAKE_MIN_SHARE) * WAKE_FLOOR);
    loud.tick(t + quietLife + 50);
    quiet.tick(t + quietLife + 50);
    assert.equal(quiet.count, 0, 'a quiet wake is gone');
    assert.ok(loud.count > 0, 'a loud one is still there, so it trails further');
  });

  it('sheds nothing for a hull with no strength, or across a jump', () => {
    const wake = new HullWake();
    run(wake, source(1, 0, 0), 10 * WAKE_SPACING_M);
    assert.equal(wake.shedCount, 0, 'engine cut or holding still');
    const s = source(2, 0, 1);
    wake.sync([s], 1, 1, 0);
    s.x = 5000;
    wake.sync([s], 1, 1, 16);
    assert.equal(wake.shedCount, 0, 'a lift is not a run');
  });

  it('fits a full berth list running flat out without losing a live bubble', () => {
    const fastest = statsFor(UnitKind.LightScout).speed;
    const fleet = Array.from({ length: BERTHS.CEILING }, (_, i) => ({
      ...source(i + 1, 0, 1),
      z: i * 100,
      speedMps: fastest,
    }));
    const wake = new HullWake();
    // Six seconds at 60 frames a second: past one full bubble life.
    for (let frame = 0; frame <= 360; frame++) {
      for (const s of fleet) s.x = fastest * (frame / 60);
      wake.sync(fleet, fleet.length, 1, (frame * 1000) / 60);
    }
    assert.equal(wake.overwrites, 0, 'no wake lost its tail to another’s head');
    assert.ok(wake.count <= BERTHS.CEILING * WAKE_BUBBLES_PER_HULL);
    assert.ok(wake.count >= BERTHS.CEILING * (WAKE_BUBBLES_PER_HULL - 2), 'and every hull has one');
    assert.equal(WAKE_POOL, BERTHS.CEILING * WAKE_BUBBLES_PER_HULL);
  });

  it('is one draw for one hull or forty, and none once the wake fades', () => {
    const gl = new HeadlessWebGLRenderer();
    const camera = new PerspectiveCamera();
    const wake = new HullWake();
    const scene = new Scene().add(wake.points);
    let t = 0;
    for (const n of [1, BERTHS.CEILING]) {
      const fleet = Array.from({ length: n }, (_, i) => ({ ...source(i + 1, 0, 1), z: i * 50 }));
      for (let m = 0; m <= 4 * WAKE_SPACING_M; m++) {
        for (const s of fleet) s.x = m;
        wake.sync(fleet, n, 1, t);
        t += 16;
      }
      gl.render(scene, camera);
      assert.equal(gl.ledger.calls, 1, `${n} hulls`);
    }
    wake.tick(t + WAKE_LIFE_MS + 100);
    gl.render(scene, camera);
    assert.equal(gl.ledger.calls, 0, 'a faded wake costs nothing');
  });

  it('keeps the wake but stills it under reduced motion (docs/ui-ux.md §11)', () => {
    const wake = new HullWake();
    wake.setReducedMotion(true);
    const t = run(wake, source(1, 0, 1), WAKE_SPACING_M);
    const born = wake.bubbleAt(0);
    wake.tick(t + 1000);
    assert.ok(wake.count > 0, 'still drawn');
    assert.equal(wake.bubbleAt(0).y, born.y, 'and none climbs');
  });

  it('freezes bubbles already climbing when reduced motion turns on, without a jump', () => {
    const wake = new HullWake();
    const t = run(wake, source(1, 0, 1), WAKE_SPACING_M);
    wake.tick(t + 500);
    const climbing = wake.bubbleAt(0);
    wake.setReducedMotion(true);
    wake.tick(t + 1500);
    assert.ok(wake.count > 0);
    assert.ok(Math.abs(wake.bubbleAt(0).y - climbing.y) < 1e-4, 'held where it was drawn');
  });

  it('clears every bubble for a new match', () => {
    const wake = new HullWake();
    const t = run(wake, source(1, 0, 1), 4 * WAKE_SPACING_M);
    wake.reset();
    wake.tick(t + 16);
    assert.equal(wake.count, 0);
    assert.equal(wake.points.visible, false);
  });
});
