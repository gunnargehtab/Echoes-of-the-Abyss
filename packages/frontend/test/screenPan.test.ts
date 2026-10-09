/**
 * The screen's axis — `src/audio/screenPan.ts` (#1324).
 *
 * Every pan in the mix goes through these two: contact voices by bearing, and
 * the ping's returns and the tuned bed's corridor by offset. What they must
 * agree with is where the conn view draws a thing, measured with the camera
 * at four turns: a point east of the focus renders right at 0°, below the
 * focus at a quarter turn, left at a half turn and above it at three quarters,
 * and a point south of the focus renders left at a quarter turn.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { screenBearing, screenPan } from '../src/audio/screenPan.ts';

const QUARTER = Math.PI / 2;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('the screen’s axis', () => {
  it('pans where the conn view draws, at every turn of the camera', () => {
    assert.ok(close(screenPan(300, 0, 0), 1), 'east, facing the top of the map: right');
    assert.ok(close(screenPan(300, 0, QUARTER), 0), 'east, a quarter turn: below, centre');
    assert.ok(close(screenPan(300, 0, 2 * QUARTER), -1), 'east, a half turn: left');
    assert.ok(close(screenPan(300, 0, 3 * QUARTER), 0), 'east, three quarters: above, centre');
    assert.ok(close(screenPan(0, 300, QUARTER), -1), 'south, a quarter turn: left');
  });

  it('gives a bearing the same pan as the offset it points along', () => {
    for (const yaw of [0, 0.4, QUARTER, 2.5, Math.PI, 5]) {
      for (const [dx, dy] of [
        [300, 0],
        [0, 300],
        [-120, 80],
        [45, -260],
      ] as const) {
        const viaBearing = Math.cos(screenBearing(Math.atan2(dy, dx), yaw));
        assert.ok(close(viaBearing, screenPan(dx, dy, yaw)), `yaw ${yaw}, (${dx}, ${dy})`);
      }
    }
  });

  it('puts a sound at the ear dead centre', () => {
    assert.equal(screenPan(0, 0, 1), 0);
  });
});
