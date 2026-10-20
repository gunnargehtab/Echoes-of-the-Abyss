/**
 * The cavitation wake behind own hulls (docs/art-direction.md "Animation
 * Style", docs/graphics-standards.md gates 3 and 6). Like the ordnance
 * trail's tests, these read the buffers and draw range the render would; no
 * GL is needed.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { OwnUnit } from '@echoes/shared';
import {
  HullWake,
  WAKE_FLOOR,
  WAKE_HULL_LENGTHS,
  WAKE_HALF_WIDTH_SHARE,
  WAKE_SEGMENTS,
  WAKE_VERTICES_PER_SEGMENT,
  wakeStrength,
  type WakePlacement,
} from '../src/game/hullWake.ts';
import { OwnMotion } from '../src/game/ownMotion.ts';

const placed = (x: number, strength: number, yaw = 0): WakePlacement => ({
  x,
  y: -300,
  z: 0,
  yaw,
  sternM: 20,
  strength,
});

const PER_WAKE = WAKE_SEGMENTS * WAKE_VERTICES_PER_SEGMENT;

/** The middle of the ribbon at its head (the stern) or its tail, read off the
 * first and last segments' corners. */
function spine(wake: HullWake, index: number, end: 'head' | 'tail') {
  const base = index * PER_WAKE;
  const [l, r] = end === 'head' ? [base, base + 1] : [base + PER_WAKE - 4, base + PER_WAKE - 1];
  const a = wake.vertexAt(l);
  const b = wake.vertexAt(r);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, level: a.level };
}

describe('hull wake', () => {
  it('rises with live SIG on the gate-3 curve', () => {
    const silent = wakeStrength(5, false, true);
    const cruising = wakeStrength(25, false, true);
    const loud = wakeStrength(40, false, true);
    assert.ok(silent < cruising && cruising < loud, `${silent} < ${cruising} < ${loud}`);
    assert.equal(silent, WAKE_FLOOR, 'a silent hull still leaves a faint wake');
    assert.equal(loud, 1);
    assert.equal(wakeStrength(90, false, true), 1, 'capped at full');
    // The curve's own ratio: 14 SIG apart is one e-folding.
    assert.ok(
      Math.abs(wakeStrength(30, false, true) / wakeStrength(16, false, true) - Math.E) < 1e-9
    );
  });

  it('is zero with the drive cut or the hull stopped', () => {
    assert.equal(wakeStrength(60, true, true), 0, 'engine off, carried by a current');
    assert.equal(wakeStrength(60, false, false), 0, 'holding station');
  });

  it('draws any fleet with one mesh, and a zero-strength hull with no vertices', () => {
    const wake = new HullWake(2);
    const mesh = wake.mesh;
    wake.sync([placed(0, 1), placed(100, 0.3), placed(200, 0), placed(300, 0.06)]);
    assert.equal(wake.mesh, mesh, 'one object, grown in place past its capacity');
    assert.equal(wake.count, 3);
    assert.equal(wake.vertexCount, 3 * PER_WAKE);
    assert.equal(mesh.visible, true);
    wake.sync([placed(0, 0)]);
    assert.equal(wake.vertexCount, 0);
    assert.equal(mesh.visible, false, 'a still fleet draws nothing');
  });

  it('reads only the placements the caller counts', () => {
    const wake = new HullWake();
    wake.sync([placed(0, 1), placed(100, 1)], 1);
    assert.equal(wake.count, 1);
  });

  it('trails astern from the stern, longer and brighter when louder', () => {
    const wake = new HullWake();
    wake.sync([placed(0, 1), placed(1000, 0.1)]);
    const loudStart = spine(wake, 0, 'head');
    const loudEnd = spine(wake, 0, 'tail');
    const quietStart = spine(wake, 1, 'head');
    const quietEnd = spine(wake, 1, 'tail');
    assert.ok(Math.abs(loudStart.x + 20) < 1e-6, 'starts at the stern, behind a bow on +x');
    assert.ok(loudEnd.x < loudStart.x, 'runs astern');
    assert.ok(loudEnd.y > loudStart.y, 'bubbles climb');
    assert.equal(loudEnd.level, 0, 'fades out at its tail');
    assert.ok(
      loudStart.x - loudEnd.x > quietStart.x - 1000 - (quietEnd.x - 1000),
      'louder is longer'
    );
    assert.ok(loudStart.level > quietStart.level, 'louder is brighter');
  });

  it('lies flat across the wake, a beam wide at the stern and spreading to the tail', () => {
    const wake = new HullWake();
    wake.sync([placed(0, 1)]);
    const left = wake.vertexAt(0);
    const right = wake.vertexAt(1);
    assert.equal(left.y, right.y, 'level in the water');
    assert.ok(
      Math.abs(Math.abs(left.z - right.z) - 2 * WAKE_HALF_WIDTH_SHARE * 20) < 1e-6,
      'a beam wide'
    );
    const tailLeft = wake.vertexAt(PER_WAKE - 4);
    const tailRight = wake.vertexAt(PER_WAKE - 1);
    assert.ok(
      Math.abs(Math.abs(tailLeft.z - tailRight.z) - 2 * Math.abs(left.z - right.z)) < 1e-6,
      'twice as wide at the tail'
    );
  });

  it('keeps clear of a seabed rising behind the hull', () => {
    const wake = new HullWake();
    // Ground climbing astern (toward −x): level with the hull 40 m back.
    const ground = (x: number) => -300 + (-x - 60);
    wake.sync([placed(0, 1)], 1, ground);
    for (let i = 0; i < PER_WAKE; i++) {
      const v = wake.vertexAt(i);
      assert.ok(
        v.y > ground(v.x),
        `vertex ${i} at ${v.y} stays above the ground at ${ground(v.x)}`
      );
    }
    wake.sync([placed(0, 1)]);
    assert.ok(
      wake.vertexAt(PER_WAKE - 1).y < ground(wake.vertexAt(PER_WAKE - 1).x),
      'the control: without the ground it would be buried'
    );
  });

  it('measures its length in hulls, so it scales with the hull and the draw factor', () => {
    const wake = new HullWake();
    wake.sync([placed(0, 1)]);
    const tail = spine(wake, 0, 'tail').x;
    assert.ok(
      Math.abs(-20 - tail - WAKE_HULL_LENGTHS * 40) < 1e-6,
      'full strength: the full length'
    );
    wake.sync([{ ...placed(0, 1), sternM: 80 }]);
    const bigger = spine(wake, 0, 'tail').x;
    assert.ok(Math.abs(-80 - bigger - WAKE_HULL_LENGTHS * 160) < 1e-6, 'a hull 4× as long');
  });
});

describe('own motion: moving', () => {
  const hull = (x: number): Pick<OwnUnit, 'id' | 'x' | 'y' | 'depth'> => ({
    id: 1,
    x,
    y: 0,
    depth: 300,
  });

  it('is true only between two ticks that moved the hull across the ground', () => {
    const motion = new OwnMotion();
    motion.record([hull(0)], 0);
    assert.equal(motion.moving(1), false, 'one sample');
    motion.record([hull(10)], 200);
    assert.equal(motion.moving(1), true);
    motion.record([hull(10)], 400);
    assert.equal(motion.moving(1), false, 'holding station');
    motion.record([hull(5000)], 600);
    assert.equal(motion.moving(1), false, 'a snap is a lift, not a passage');
    assert.equal(motion.moving(2), false, 'an unknown hull');
  });
});
