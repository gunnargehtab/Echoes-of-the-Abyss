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

  it('holds a followed focus exactly once it has reached it, however fast the hull moves', () => {
    const feel = new OrbitFeel(pose());
    const drawn = pose();
    feel.goal.x = 2400;
    feel.step(drawn, FRAME_S, flatSeabed, true);
    assert.ok(drawn.x > 2000 && drawn.x < 2400, 'not yet reached: eased toward, not cut');
    // Reached at its glide's end, then held there at five metres a frame, ten
    // times the reach that once had to be re-measured every frame.
    feel.jump(drawn, flatSeabed());
    feel.goal.x = 2400;
    for (let i = 0; i < Math.ceil(CAMERA_FEEL.GLIDE_S / FRAME_S); i++) {
      feel.step(drawn, FRAME_S, flatSeabed, true);
    }
    assert.equal(drawn.x, 2400);
    for (let i = 1; i <= 30; i++) {
      feel.goal.x = 2400 + 5 * i;
      feel.goal.depthM = 300 + i;
      feel.step(drawn, FRAME_S, flatSeabed, true);
      assert.equal(drawn.x, feel.goal.x, `frame ${i}`);
      assert.equal(drawn.depthM, feel.goal.depthM, `frame ${i}`);
    }
    // Let go: an ease again.
    feel.goal.x = 3000;
    feel.step(drawn, FRAME_S, flatSeabed, false);
    assert.ok(drawn.x < 3000, 'no longer held');
  });

  it('lets a drag take what it moves out of a glide, and the glide carry the rest (rule 5)', () => {
    const feel = new OrbitFeel(pose());
    const drawn = pose();
    feel.jump(drawn, flatSeabed());
    feel.goal.x = 3000;
    feel.goal.yaw = 1.2;
    const frames = Math.ceil(CAMERA_FEEL.GLIDE_S / FRAME_S);
    for (let i = 0; i < frames / 2; i++) feel.step(drawn, FRAME_S, flatSeabed, false);
    // The hand turns the camera mid-glide: the yaw is its from now on.
    drawn.yaw = -0.4;
    feel.take(drawn, ['yaw']);
    assert.equal(feel.goal.yaw, -0.4);
    for (let i = 0; i < frames; i++) feel.step(drawn, FRAME_S, flatSeabed, false);
    assert.equal(drawn.yaw, -0.4, 'the hand kept what it took');
    assert.equal(drawn.x, 3000, 'and the glide still landed the rest');
    assert.equal(feel.gliding, false);
  });

  it('eases a step made mid-glide as it would at rest, rather than landing it by the glide', () => {
    // A notch half way through a glide to a hull: the dolly leaves the glide and
    // eases (rule 3), so its first frame moves it by the ease's share, not by
    // the glide's (#1775 round 1: 54.5 m of a 109 m notch landed in one frame).
    const feel = new OrbitFeel(pose());
    const drawn = pose();
    feel.jump(drawn, flatSeabed());
    feel.goal.x = 3000;
    for (let t = 0; t < CAMERA_FEEL.GLIDE_S / 2; t += FRAME_S) {
      feel.step(drawn, FRAME_S, flatSeabed, true);
    }
    const before = drawn.distance;
    feel.beforeStep(['distance']);
    feel.goal.distance = before - 109;
    feel.step(drawn, FRAME_S, flatSeabed, true);
    assert.ok(
      before - drawn.distance <= easeShare(FRAME_S) * 109 + 1e-9,
      `first frame moved ${before - drawn.distance} m of the notch`
    );
    assert.equal(feel.gliding, true, 'the glide still carries the focus');
    for (let t = 0; t < 2; t += FRAME_S) feel.step(drawn, FRAME_S, flatSeabed, true);
    assert.equal(drawn.x, 3000, 'and lands it');
    assert.equal(drawn.distance, before - 109, 'while the dolly eased home');
  });

  it('keeps a stepped number on its glide and eases only the step on top (rules 3 and 4)', () => {
    // #1775 round 2: a step that turned the rest of a glide into an ease landed
    // 15% of it in one frame, 446 m after a 3 km scope press. Every frame here
    // moves no more than the glide's own largest frame plus the ease's share of
    // the step, and both arrive.
    const frames = Math.ceil((CAMERA_FEEL.GLIDE_S + 1.5) / FRAME_S);
    const notchAt = Math.round(0.1 / FRAME_S);
    const k = easeShare(FRAME_S);
    const press = (shift: number | null) => {
      const feel = new OrbitFeel(pose());
      const drawn = pose();
      feel.jump(drawn, flatSeabed());
      feel.goal.x = 5000;
      const steps: number[] = [];
      for (let i = 0; i < frames; i++) {
        if (shift !== null && i === notchAt) {
          // A wheel notch about a cursor: the dolly and the anchor's shift.
          feel.beforeStep(['distance', 'x', 'z']);
          feel.goal.x += shift;
          feel.goal.distance /= 1.1;
        }
        const was = drawn.x;
        feel.step(drawn, FRAME_S, flatSeabed, false);
        steps.push(Math.abs(drawn.x - was));
      }
      return { steps, drawn };
    };
    const alone = Math.max(...press(null).steps);
    const notched = press(200);
    notched.steps.forEach((step, i) =>
      assert.ok(step <= alone + k * 200 + 1e-6, `frame ${i} moved ${step} m, glide alone ${alone}`)
    );
    assert.equal(notched.drawn.x, 5200, 'the press and the shift both arrive');
    assert.equal(notched.drawn.distance, 1200 / 1.1);

    // A Shift + wheel notch 0.1 s into a deep follow glide, which it ends.
    const deep = () => 2400;
    const follow = (notch: boolean) => {
      const feel = new OrbitFeel(pose());
      const drawn = pose();
      feel.jump(drawn, deep());
      feel.goal.depthM = 1100;
      const steps: number[] = [];
      for (let i = 0; i < frames; i++) {
        if (notch && i === notchAt) {
          feel.beforeStep(['depthM']);
          feel.goal.depthM = 950;
        }
        const was = drawn.depthM!;
        feel.step(drawn, FRAME_S, deep, !notch || i < notchAt);
        steps.push(Math.abs(drawn.depthM! - was));
      }
      return { steps, drawn };
    };
    const glideOnly = Math.max(...follow(false).steps);
    const stepped = follow(true);
    stepped.steps.forEach((step, i) =>
      assert.ok(step <= glideOnly + k * 150 + 1e-6, `frame ${i} moved ${step} m of depth`)
    );
    assert.equal(stepped.drawn.depthM, 950, "the notch's depth arrives");
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
    // Kept by time, not by count: a 1,000 px/s flick reads 1,000 px/s from a
    // mouse polled at 125 Hz and at 4 kHz alike.
    for (const hz of [125, 1000, 4000, 8000]) {
      drag.begin(0, 0, 0);
      const stepMs = 1000 / hz;
      let atMs = 0;
      for (let i = 1; i <= hz / 5; i++) {
        atMs = i * stepMs;
        drag.move(atMs, atMs, 0);
      }
      const read = drag.release(atMs + 1);
      assert.ok(Math.abs(read.x - 1000) < 1e-6, `${hz} Hz read ${read.x} px/s`);
    }
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
