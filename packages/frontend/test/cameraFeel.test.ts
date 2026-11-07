import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CAMERA_FEEL } from '@echoes/shared';
import {
  COAST_STOP_PX_S,
  DragSpeed,
  OrbitFeel,
  easeShare,
  glideShare,
  releaseVelocity,
  shortArc,
  type OrbitPose,
} from '../src/game/cameraFeel.ts';

/**
 * docs/free-camera.md §4, "The study's camera feel" (#1775): the six rules as
 * arithmetic, before any renderer is booted. The renderer's own tests hold
 * the same rules through the real class (rendererSmoke.test.ts).
 */

const FRAME_S = 1 / 60;
const flatSeabed = () => 600;

const pose = (over: Partial<OrbitPose> = {}): OrbitPose => ({
  x: 2000,
  z: 2000,
  depthM: 300,
  yaw: 0,
  pitch: 0.5,
  distance: 1200,
  ...over,
});

/** Step a feel until nothing moves, returning how many frames it took. */
function settle(feel: OrbitFeel, drawn: OrbitPose, limit = 600): number {
  for (let frame = 1; frame <= limit; frame++) {
    const before = { ...drawn };
    feel.step(drawn, FRAME_S, flatSeabed, false);
    if (JSON.stringify(before) === JSON.stringify(drawn)) return frame;
  }
  return Number.POSITIVE_INFINITY;
}

describe('the study camera feel, as arithmetic (#1775)', () => {
  it('eases a step by e every EASE_S, and arrives exactly rather than chasing for ever', () => {
    assert.equal(easeShare(0), 0);
    assert.ok(Math.abs(easeShare(CAMERA_FEEL.EASE_S) - (1 - 1 / Math.E)) < 1e-12);
    const feel = new OrbitFeel(pose());
    const drawn = pose();
    feel.goal.distance = 600;
    feel.step(drawn, FRAME_S, flatSeabed, false);
    assert.ok(
      drawn.distance < 1200 && drawn.distance > 600,
      'neither still nor arrived in one frame'
    );
    // About 0.3 s to settle (rule 3): within 5% after three time constants.
    for (let t = FRAME_S; t < 3 * CAMERA_FEEL.EASE_S; t += FRAME_S) {
      feel.step(drawn, FRAME_S, flatSeabed, false);
    }
    assert.ok(Math.abs(drawn.distance - 600) < 0.05 * 600, `settling: ${drawn.distance}`);
    // And it stops: an ease that never quite arrived would repaint every frame (#1032).
    assert.ok(Number.isFinite(settle(feel, drawn)));
    assert.equal(drawn.distance, 600);
  });

  it('turns the short way round, through north, not back across it', () => {
    assert.ok(Math.abs(shortArc(0.1, Math.PI * 2 - 0.1) + 0.2) < 1e-12);
    assert.ok(Math.abs(shortArc(-0.3, 0.3) - 0.6) < 1e-12);
    const feel = new OrbitFeel(pose({ yaw: -0.2 }));
    const drawn = pose({ yaw: -0.2 });
    feel.goal.yaw = Math.PI * 2 + 0.2;
    feel.step(drawn, FRAME_S, flatSeabed, false);
    assert.ok(drawn.yaw > -0.2 && drawn.yaw < 0.2, 'toward north, the near side');
  });

  it('glides a jump rest to rest, arriving at the goal at GLIDE_S', () => {
    assert.equal(glideShare(0), 0);
    assert.equal(glideShare(1), 1);
    // No speed at either end (rule 4): the first and last hundredth move ~3e-4.
    assert.ok(glideShare(0.01) < 1e-3 && 1 - glideShare(0.99) < 1e-3);
    const feel = new OrbitFeel(pose());
    const drawn = pose();
    feel.jump(drawn, flatSeabed());
    feel.goal.x = 3000;
    feel.goal.pitch = 1.0;
    const steps: number[] = [];
    let last = drawn.x;
    const frames = Math.ceil(CAMERA_FEEL.GLIDE_S / FRAME_S);
    for (let i = 0; i < frames; i++) {
      feel.step(drawn, FRAME_S, flatSeabed, false);
      steps.push(drawn.x - last);
      last = drawn.x;
    }
    assert.equal(drawn.x, 3000);
    assert.equal(drawn.pitch, 1.0);
    assert.equal(feel.gliding, false);
    const peak = Math.max(...steps);
    assert.ok(steps[0]! < peak / 10 && steps.at(-1)! < peak / 10, 'slow at both ends');
    assert.ok(
      steps.every((step) => step >= 0),
      'never overshoots or doubles back'
    );
  });

  it('lands a focus easing onto the seabed, and lifts one off it from the ground', () => {
    const feel = new OrbitFeel(pose({ depthM: 300 }));
    const drawn = pose({ depthM: 300 });
    feel.goal.depthM = null;
    assert.ok(Number.isFinite(settle(feel, drawn)));
    assert.equal(drawn.depthM, null, 'landed: on the seabed, following it');
    feel.goal.depthM = 450;
    feel.step(drawn, FRAME_S, flatSeabed, false);
    assert.ok(
      drawn.depthM !== null && drawn.depthM > 450 && drawn.depthM < 600,
      'up from the ground'
    );
  });

  it('holds a followed focus exactly once it is on it, and eases to it when it is not', () => {
    const feel = new OrbitFeel(pose());
    const drawn = pose();
    feel.goal.x = 2000.2;
    feel.step(drawn, FRAME_S, flatSeabed, true);
    assert.equal(drawn.x, 2000.2, 'within reach: held');
    feel.goal.x = 2400;
    feel.step(drawn, FRAME_S, flatSeabed, true);
    assert.ok(drawn.x > 2000.2 && drawn.x < 2400, 'a jump away: eased, not cut');
  });

  it('coasts the same distance at every frame rate, and stops', () => {
    const coastAt = (frameS: number): number => {
      const feel = new OrbitFeel(pose());
      feel.panCoast.x = 1000;
      let travelled = 0;
      for (let t = 0; t < 5; t += frameS) travelled += feel.takeCoast(frameS).pan.x;
      assert.equal(feel.coasting, false, 'the water stops it');
      return travelled;
    };
    const expected = 1000 * CAMERA_FEEL.COAST_S;
    for (const rate of [30, 60, 144]) {
      const travelled = coastAt(1 / rate);
      // The stop below COAST_STOP_PX_S forfeits under COAST_STOP_PX_S × COAST_S.
      assert.ok(
        Math.abs(travelled - expected) < COAST_STOP_PX_S * CAMERA_FEEL.COAST_S + 1e-6,
        `${rate} Hz coasted ${travelled} px of ${expected}`
      );
    }
  });

  it('measures the release speed over the last moves, not a still pointer, and caps it', () => {
    assert.deepEqual(releaseVelocity([], 0), { x: 0, y: 0 });
    const moving = [
      { atMs: 0, x: 0, y: 0 },
      { atMs: 16, x: 8, y: 0 },
      { atMs: 32, x: 16, y: 4 },
    ];
    const speed = releaseVelocity(moving, 40);
    assert.ok(Math.abs(speed.x - 500) < 1e-9 && Math.abs(speed.y - 125) < 1e-9);
    // Held still for COAST_STILL_MS before the release: no coast (rule 2).
    assert.deepEqual(releaseVelocity(moving, 32 + CAMERA_FEEL.COAST_STILL_MS + 1), { x: 0, y: 0 });
    const flick = releaseVelocity(
      [
        { atMs: 0, x: 0, y: 0 },
        { atMs: 10, x: 100, y: 0 },
      ],
      10
    );
    assert.ok(Math.abs(Math.hypot(flick.x, flick.y) - CAMERA_FEEL.COAST_MAX_PX_S) < 1e-9);
    const drag = new DragSpeed();
    drag.begin(0, 0, 0);
    drag.move(16, 8, 0);
    drag.move(32, 16, 0);
    assert.ok(Math.abs(drag.release(40).x - 500) < 1e-9);
    assert.deepEqual(drag.release(40), { x: 0, y: 0 }, 'a release forgets the drag');
  });

  it('starts a jump from where the camera is drawn and stops what was carrying it (rule 5)', () => {
    const feel = new OrbitFeel(pose());
    const drawn = pose();
    feel.goal.distance = 400;
    feel.orbitCoast.x = 600;
    feel.step(drawn, FRAME_S, flatSeabed, false);
    feel.jump(drawn, flatSeabed());
    assert.equal(feel.coasting, false);
    assert.equal(feel.goal.distance, drawn.distance, 'the old destination is dropped');
    feel.settle(drawn);
    assert.equal(feel.gliding, false);
  });
});
