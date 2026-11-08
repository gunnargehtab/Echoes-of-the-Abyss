/**
 * The move preview's clocks against the server's rates — docs/systems-depth.md
 * §2, and the Drive Refit of docs/systems-progression.md §2 (#1785).
 *
 * The preview prices a leg before it is ordered: how long the selection will
 * spend diving, loud, and climbing, slow. The server moves a hull at its navy's
 * own rates, a Drive Refit's tenth included, so a clock read off the roster's
 * figures alone would overstate every leg a refitted navy sails.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEPTH, RefitKind, type OwnUnit, type TerrainPayload } from '@echoes/shared';
import { readMovePreview, type MovePreview } from '../src/game/movePreview.ts';

/** One cell of open water, roofed at the surface and floored at 3,000 m. */
const OPEN: TerrainPayload = {
  cols: 1,
  rows: 1,
  cellM: 2000,
  biomes: [0],
  floor: [3000],
  ceiling: [0],
};

/** The fields `readMovePreview` reads off a hull, at 600 m. */
const HULL = {
  id: 7,
  depth: 600,
  pressureRating: 3,
  pressureBonus: 0,
  silentRunning: false,
} as OwnUnit;

function leg(depthM: number): MovePreview {
  return {
    unitIds: [HULL.id],
    planeDepthM: depthM,
    point: { x: 1000, y: 1000 },
    depthM,
    pinned: true,
    queued: false,
  };
}

describe('the move preview’s clocks', () => {
  it('prices a dive and a climb at the roster’s rates for a navy with no Drive Refit', () => {
    const down = readMovePreview(leg(1050), OPEN, [HULL]);
    assert.equal(down.reason, null, 'the leg is water');
    assert.equal(down.diveSeconds, 450 / DEPTH.DESCENT_RATE_MPS);
    const up = readMovePreview(leg(300), OPEN, [HULL], []);
    assert.equal(up.riseSeconds, 300 / DEPTH.ASCENT_RATE_MPS, 'and owning nothing is the same');
  });

  it('prices both a tenth faster once the navy owns the Drive Refit', () => {
    const refits = [RefitKind.Drive];
    const down = readMovePreview(leg(1050), OPEN, [HULL], refits);
    assert.ok(Math.abs(down.diveSeconds - 450 / (DEPTH.DESCENT_RATE_MPS * 1.1)) < 1e-9);
    const up = readMovePreview(leg(300), OPEN, [HULL], refits);
    assert.ok(Math.abs(up.riseSeconds - 300 / (DEPTH.ASCENT_RATE_MPS * 1.1)) < 1e-9);
    // Only the Drive moves a clock: the other four buy something else.
    const others = [RefitKind.Pressure, RefitKind.Plate, RefitKind.Magazine, RefitKind.Hold];
    assert.equal(
      readMovePreview(leg(1050), OPEN, [HULL], others).diveSeconds,
      450 / DEPTH.DESCENT_RATE_MPS
    );
  });
});
