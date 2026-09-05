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
import { OwnMotion } from '../src/game/ownMotion.ts';

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
