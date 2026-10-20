/**
 * The cavitation wake behind own hulls (#1508, docs/art-direction.md
 * "Animation Style"). The three.js objects here need no GL — these tests read
 * the buffers and the draw range the render would.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SIG_BANDS, SILENT_RUNNING } from '@echoes/shared';
import {
  HullWake,
  WAKE_FLOOR,
  WAKE_MAX_M,
  WAKE_MIN_SPEED_MPS,
  WAKE_RISE_M,
  WAKE_SEGMENTS,
  wakeStrength,
  type WakeSource,
} from '../src/game/hullWake.ts';

const RUNNING = 8;

const source = (x: number, heading: number, strength: number): WakeSource => ({
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
  it('draws any number of wakes as one object, and none when nothing runs', () => {
    const wake = new HullWake(2);
    const sources = [source(0, 0, 1), source(100, 0, 0.5), source(200, 0, 0.2)];
    wake.sync(sources, 3, 1);
    assert.equal(wake.count, 3, 'grew past its initial capacity');
    assert.equal(wake.vertexCount, 3 * WAKE_SEGMENTS * 2);
    assert.ok(wake.lines.visible);
    wake.sync([source(0, 0, 0)], 1, 1);
    assert.equal(wake.count, 0);
    assert.equal(wake.vertexCount, 0);
    assert.equal(wake.lines.visible, false, 'nothing running draws nothing');
  });

  it('allocates nothing on a frame that fits the fleet it has seen', () => {
    const wake = new HullWake(4);
    const sources = [source(0, 0, 1), source(100, 0, 1)];
    wake.sync(sources, 2, 1);
    const geometry = wake.lines.geometry;
    const positions = geometry.getAttribute('position');
    for (let frame = 0; frame < 5; frame++) {
      sources[0]!.x += 1;
      wake.sync(sources, 2, 1);
    }
    assert.equal(wake.lines.geometry, geometry);
    assert.equal(wake.lines.geometry.getAttribute('position'), positions);
  });

  it('trails astern, climbing, and longer and brighter for a louder hull', () => {
    const wake = new HullWake();
    wake.sync([source(0, 0, 1), source(0, Math.PI / 2, WAKE_FLOOR)], 2, 1);
    const loud = wake.tailOf(0);
    assert.ok(Math.abs(loud.x - -(10 + WAKE_MAX_M)) < 1e-4, 'a bow on +X trails to -X');
    assert.ok(Math.abs(loud.z) < 1e-4, 'and nowhere sideways');
    assert.ok(Math.abs(loud.y - (-300 + WAKE_RISE_M)) < 1e-4, 'bubbles climb');
    const quiet = wake.tailOf(1);
    assert.ok(quiet.z < 0 && Math.abs(quiet.x) < 1e-4, 'a bow on +Z trails to -Z');
    assert.ok(-quiet.z - 10 < WAKE_MAX_M, 'a quiet wake is shorter');
    assert.ok(wake.levelOf(1) < wake.levelOf(0), 'and fainter');
    assert.ok(Math.abs(wake.levelOf(0) - 1) < 1e-6);
  });

  it('scales with the far-zoom draw factor, as the torpedo trail does', () => {
    const wake = new HullWake();
    wake.sync([source(0, 0, 1)], 1, 3);
    assert.ok(Math.abs(wake.tailOf(0).x - -(10 + 3 * WAKE_MAX_M)) < 1e-3);
  });
});
