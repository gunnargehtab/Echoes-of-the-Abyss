/**
 * The Lid and the floor-following clearance (docs/systems-depth.md §2): the
 * promises that make the top of the column a rule rather than a mood. The
 * boundary is a depth compare and not a band test; the bleed is a fraction of
 * max hull with no floor, because sour water is allowed to kill; recovery is
 * slower than spending, so bobbing on the boundary loses; and the standing
 * order's clearance stands clear of the arrival snap.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEPTH,
  FOLLOW_FLOOR,
  inLid,
  LID,
  LID_GRACE_RECOVERY_PER_S,
  lidBleedPerSecond,
} from '../dist/index.js';

describe('the Lid', () => {
  it('is a depth boundary, exclusive at its own line', () => {
    assert.equal(inLid(0), true);
    assert.equal(inLid(LID.DEPTH_M - 1), true);
    assert.equal(inLid(LID.DEPTH_M), false);
    assert.equal(inLid(2600), false);
  });

  it('bleeds as a fraction of max hull, with no floor', () => {
    assert.equal(lidBleedPerSecond(1000), 1000 * LID.BLEED_FRACTION_PER_S);
    // A scout and a cruiser lose the same *fraction* per second.
    assert.equal(lidBleedPerSecond(200) / 200, lidBleedPerSecond(4000) / 4000);
  });

  it('recovers grace slower than it spends it', () => {
    // One second up costs one second of grace; one second down buys back
    // less than one. Equal rates would make the boundary free to straddle.
    assert.ok(LID_GRACE_RECOVERY_PER_S < 1);
    assert.ok(LID_GRACE_RECOVERY_PER_S > 0);
    // Full recovery takes exactly RECOVERY_S of clean water.
    assert.ok(Math.abs(LID.GRACE_S / LID_GRACE_RECOVERY_PER_S - LID.RECOVERY_S) < 1e-9);
  });

  it('keeps the follow clearance clear of the arrival snap', () => {
    // Station keeping retargets against ground that moves under the hull; a
    // clearance inside the snap epsilon would chatter between snap and
    // retarget every tick.
    assert.ok(FOLLOW_FLOOR.CLEARANCE_M > 4 * DEPTH.ARRIVAL_EPSILON_M);
  });
});
