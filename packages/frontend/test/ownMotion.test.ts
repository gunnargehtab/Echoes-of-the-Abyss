/**
 * Own-force interpolation (#429) — docs/ui-ux.md §12.
 *
 * The rule this has to keep is a negative one: it may smooth the player's own
 * hulls, and it may not touch anything else. The tests below hold the shape
 * of the glide (between the last two ticks, arriving as the next is due) and
 * the two places it must *not* glide — a hull with no history, and a jump no
 * hull can make under its own power.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SIM, UnitKind, type OwnUnit } from '@echoes/shared';
import { OwnMotion, attitudeOf } from '../src/game/ownMotion.ts';

const INTERVAL_MS = 1000 / SIM.ECHO_HZ;

function hull(id: number, x: number, y: number, depth = 600): OwnUnit {
  return {
    id,
    kind: UnitKind.Corvette,
    x,
    y,
    depth,
    hp: 100,
    maxHp: 100,
    heading: 0,
    sig: 40,
    silentRunning: false,
    engineOff: false,
    pressureRating: 2,
    pressureBonus: 0,
    unhealableDamage: 0,
  };
}

describe('OwnMotion', () => {
  it('draws a hull between its last two ticks, arriving as the next is due', () => {
    const motion = new OwnMotion();
    motion.record([hull(1, 0, 0)], 0);
    motion.record([hull(1, 100, 40, 700)], INTERVAL_MS);
    const out = { x: 0, y: 0, depth: 0 };

    motion.at(hull(1, 100, 40, 700), INTERVAL_MS, out);
    assert.deepEqual(out, { x: 0, y: 0, depth: 600 }, 'starts at the prior sample');

    motion.at(hull(1, 100, 40, 700), INTERVAL_MS * 1.5, out);
    assert.deepEqual(out, { x: 50, y: 20, depth: 650 }, 'halfway through the interval');

    motion.at(hull(1, 100, 40, 700), INTERVAL_MS * 2, out);
    assert.deepEqual(out, { x: 100, y: 40, depth: 700 }, 'lands on the newest sample');
    assert.equal(motion.animating(INTERVAL_MS * 2), false, 'and is done');
    assert.equal(motion.animating(INTERVAL_MS * 1.5), true);
  });

  it('draws a hull with no history where the server put it', () => {
    const motion = new OwnMotion();
    motion.record([hull(1, 300, 300)], 0);
    const out = { x: 0, y: 0, depth: 0 };
    motion.at(hull(1, 300, 300), 50, out);
    assert.deepEqual(out, { x: 300, y: 300, depth: 600 });
    assert.equal(motion.animating(50), false);
  });

  it('snaps across a jump no hull makes in one tick', () => {
    const motion = new OwnMotion();
    motion.record([hull(1, 0, 0)], 0);
    motion.record([hull(1, 4000, 0)], INTERVAL_MS);
    const out = { x: 0, y: 0, depth: 0 };
    motion.at(hull(1, 4000, 0), INTERVAL_MS + 10, out);
    assert.equal(out.x, 4000, 'a lift is drawn as a lift');
  });

  it('measures the tick cadence from arrivals, within reason', () => {
    const motion = new OwnMotion();
    motion.record([hull(1, 0, 0)], 0);
    motion.record([hull(1, 100, 0)], 300);
    const out = { x: 0, y: 0, depth: 0 };
    motion.at(hull(1, 100, 0), 450, out);
    assert.equal(out.x, 50, 'a late tick stretches the glide over the gap it left');

    motion.record([hull(1, 200, 0)], 300 + 5000);
    motion.at(hull(1, 200, 0), 300 + 5000 + 2 * INTERVAL_MS, out);
    assert.equal(out.x, 200, 'but a stall is not a cadence: the glide is capped');
  });

  it('forgets a hull that left the list', () => {
    const motion = new OwnMotion();
    motion.record([hull(1, 0, 0), hull(2, 0, 0)], 0);
    motion.record([hull(1, 10, 0)], INTERVAL_MS);
    motion.record([hull(1, 20, 0), hull(2, 500, 500)], 2 * INTERVAL_MS);
    const out = { x: 0, y: 0, depth: 0 };
    motion.at(hull(2, 500, 500), 2 * INTERVAL_MS + 10, out);
    assert.equal(out.x, 500, 'a hull that came back has no prior to glide from');
  });
});

/**
 * Bank and pitch (#1507) — docs/art-direction.md "Animation Style", and
 * docs/ui-ux.md §11 for the hold. Read from the same samples as the glide, so
 * a hull leans only on what the player was already told about it.
 */
describe('OwnMotion.speedOf', () => {
  it('reads metres per second over the last tick, and nothing without one or across a jump', () => {
    const motion = new OwnMotion();
    motion.record([hull(1, 0, 0)], 0);
    assert.equal(motion.speedOf(1), 0, 'one sample is no speed');
    motion.record([hull(1, 3, 4)], INTERVAL_MS);
    assert.ok(Math.abs(motion.speedOf(1) - 5 / (INTERVAL_MS / 1000)) < 1e-9);
    motion.record([hull(1, 3, 4)], 2 * INTERVAL_MS);
    assert.equal(motion.speedOf(1), 0, 'a hull that held still');
    motion.record([hull(1, 3000, 4)], 3 * INTERVAL_MS);
    assert.equal(motion.speedOf(1), 0, 'a jump is a lift, not a speed');
    assert.equal(motion.speedOf(2), 0, 'a hull it never saw');
  });
});

describe('attitudeOf', () => {
  const level = () => ({ roll: 0, pitch: 0 });
  const MAX_ROLL = (18 * Math.PI) / 180;

  it('gives no roll to a hull holding its heading', () => {
    const out = attitudeOf(hull(1, 0, 0), hull(1, 100, 0), hull(1, 200, 0), INTERVAL_MS, level());
    assert.equal(out.roll, 0);
    assert.equal(out.pitch, 0, 'and no pitch without a depth order');
  });

  it('banks toward a clockwise turn, and clamps a hard one', () => {
    const gentle = attitudeOf(
      hull(1, 0, 0),
      hull(1, 100, 0),
      hull(1, 199, 10),
      INTERVAL_MS,
      level()
    );
    assert.ok(gentle.roll > 0 && gentle.roll < MAX_ROLL, `a gentle turn banks: ${gentle.roll}`);
    const mirrored = attitudeOf(
      hull(1, 0, 0),
      hull(1, 100, 0),
      hull(1, 199, -10),
      INTERVAL_MS,
      level()
    );
    assert.ok(Math.abs(mirrored.roll + gentle.roll) < 1e-12, 'the other way banks the other way');
    const hard = attitudeOf(
      hull(1, 0, 0),
      hull(1, 100, 0),
      hull(1, 100, 100),
      INTERVAL_MS,
      level()
    );
    assert.equal(hard.roll, MAX_ROLL, 'a right-angle corner hits the clamp');
    const reversal = attitudeOf(
      hull(1, 0, 0),
      hull(1, 100, 0),
      hull(1, 0, 1),
      INTERVAL_MS,
      level()
    );
    assert.equal(Math.abs(reversal.roll), MAX_ROLL, 'a reversal wraps and still clamps');
  });

  it('pitches only while a depth change is ordered, nose down into a dive', () => {
    const diving = { ...hull(1, 100, 0, 620), depthOrder: 900 };
    const dive = attitudeOf(undefined, hull(1, 0, 0, 600), diving, INTERVAL_MS, level());
    assert.ok(Math.abs(dive.pitch - Math.atan2(20, 100)) < 1e-12, 'along the path it took');
    const rising = { ...hull(1, 100, 0, 550), depthOrder: 300 };
    assert.ok(attitudeOf(undefined, hull(1, 0, 0, 600), rising, INTERVAL_MS, level()).pitch < 0);
    const drifting = hull(1, 100, 0, 650);
    assert.equal(
      attitudeOf(undefined, hull(1, 0, 0, 600), drifting, INTERVAL_MS, level()).pitch,
      0
    );
    const sinkingInPlace = { ...hull(1, 0, 0, 650), depthOrder: 900 };
    const steep = attitudeOf(undefined, hull(1, 0, 0, 600), sinkingInPlace, INTERVAL_MS, level());
    assert.equal(steep.pitch, (15 * Math.PI) / 180, 'a dive in place is clamped');
  });

  it('sits level across a jump, or without history', () => {
    assert.deepEqual(
      attitudeOf(undefined, undefined, hull(1, 0, 0), INTERVAL_MS, level()),
      level()
    );
    const lift = attitudeOf(
      hull(1, 0, 0),
      hull(1, 100, 0),
      hull(1, 100, 4000),
      INTERVAL_MS,
      level()
    );
    assert.deepEqual(lift, level());
  });
});

describe('OwnMotion.attitude', () => {
  /** Straight, then a right-angle corner, then straight on. */
  function cornering(motion: OwnMotion): void {
    motion.record([hull(1, 0, 0)], 0);
    motion.record([hull(1, 100, 0)], INTERVAL_MS);
    motion.record([hull(1, 200, 0)], 2 * INTERVAL_MS);
    motion.record([hull(1, 200, 100)], 3 * INTERVAL_MS);
  }

  it('leans into a corner between ticks, and eases back out', () => {
    const motion = new OwnMotion({ leans: true });
    cornering(motion);
    const out = { roll: 0, pitch: 0 };
    assert.equal(motion.attitude(1, 3 * INTERVAL_MS, out).roll, 0, 'level as the tick lands');
    const leaned = motion.attitude(1, 4 * INTERVAL_MS, out).roll;
    assert.ok(leaned > 0, 'banked by the time the next is due');
    motion.record([hull(1, 200, 200)], 4 * INTERVAL_MS);
    const after = motion.attitude(1, 5 * INTERVAL_MS, out).roll;
    assert.ok(after > 0 && after < leaned, 'straight again, it eases out rather than snapping');
    assert.equal(motion.animating(4.5 * INTERVAL_MS), true);
  });

  it('settles level and stops asking for frames', () => {
    const motion = new OwnMotion({ leans: true });
    cornering(motion);
    for (let tick = 4; tick < 20; tick++) motion.record([hull(1, 200, 100)], tick * INTERVAL_MS);
    const out = { roll: 0, pitch: 0 };
    assert.equal(motion.attitude(1, 20 * INTERVAL_MS, out).roll, 0);
    assert.equal(motion.animating(19.5 * INTERVAL_MS), false);
  });

  it('keeps no attitude for a track that does not lean, such as ordnance', () => {
    const motion = new OwnMotion();
    cornering(motion);
    assert.equal(motion.attitude(1, 4 * INTERVAL_MS, { roll: 1, pitch: 1 }).roll, 0);
    motion.record([hull(1, 200, 100)], 4 * INTERVAL_MS);
    assert.equal(motion.animating(4.5 * INTERVAL_MS), false, 'a stopped shot asks for no frames');
  });

  it('holds every hull level under reduced motion (docs/ui-ux.md §11)', () => {
    const motion = new OwnMotion({ leans: true });
    cornering(motion);
    motion.levelHeld = true;
    assert.deepEqual(motion.attitude(1, 4 * INTERVAL_MS, { roll: 1, pitch: 1 }), {
      roll: 0,
      pitch: 0,
    });
    motion.levelHeld = false;
    assert.ok(motion.attitude(1, 4 * INTERVAL_MS, { roll: 0, pitch: 0 }).roll > 0);
  });
});
