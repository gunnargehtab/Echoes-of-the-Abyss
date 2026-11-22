/**
 * The Lid's glow a wall hides (docs/art-direction.md, "The crater from
 * above"; #1891): the lit ground's shade at the crater's own scale. How it
 * looks is the frames' to judge (docs/screenshots/issue-1891/). What a runner
 * can hold is what the section promises of it: open ground is unshaded, a
 * floor under a wall is shaded by more the taller the wall and the nearer it
 * stands, the free-water crater's three floors come out in that order, and a
 * second write leaves the bytes a first did.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { FREE_WATER_SLICE } from '../../backend/src/sim/maps/freeWaterSlice.ts';
import { terrainFor } from '../../backend/src/sim/maps/index.ts';
import { lidVisibility, writeLidShade } from '../src/game/lidShade.ts';
import {
  buildHeightGrid,
  depthToWorldY,
  rockTopDepthM,
  type HeightGrid,
} from '../src/game/perspectiveTerrain.ts';
import { seabedSeed } from '../src/game/seabed.ts';

/** A square grid of `side` vertices `stepM` apart, at the depths `depthAt` gives. */
function gridOf(
  side: number,
  stepM: number,
  depthAt: (xM: number, zM: number) => number
): HeightGrid {
  const y = new Float32Array(side * side);
  for (let iz = 0; iz < side; iz++) {
    for (let ix = 0; ix < side; ix++) {
      y[iz * side + ix] = depthToWorldY(depthAt(ix * stepM, iz * stepM));
    }
  }
  return {
    vertsX: side,
    vertsZ: side,
    stepM,
    y,
    floor: new Float32Array(side * side),
    widthM: (side - 1) * stepM,
    heightM: (side - 1) * stepM,
  };
}

const STEP_M = 31.25;
const SIDE = 97;
const at = (grid: HeightGrid, xM: number, zM: number) =>
  Math.round(zM / grid.stepM) * grid.vertsX + Math.round(xM / grid.stepM);

describe("the Lid's glow a wall hides (#1891)", () => {
  it('leaves level ground open to the whole water above', () => {
    const visible = lidVisibility(gridOf(SIDE, STEP_M, () => 600));
    for (const share of visible) assert.equal(share, 1);
  });

  it('leaves a crest open and shades the floor under a wall', () => {
    // A wall along x = 1,500 m: ground at 600 m to its west, 900 m lower to
    // its east, the rim over the bowl (docs/free-water-slice.md §3).
    const grid = gridOf(SIDE, STEP_M, (xM) => (xM < 1500 ? 600 : 1500));
    const visible = lidVisibility(grid);
    assert.equal(visible[at(grid, 1000, 1500)], 1, 'the rim looks down on the floor');
    const near = visible[at(grid, 1600, 1500)]!;
    const far = visible[at(grid, 2100, 1500)]!;
    assert.ok(near < far, `the foot keeps ${near}, further out ${far}`);
    assert.ok(near < 0.7, 'the foot of a 900 m wall has lost a third of the glow');
    assert.ok(far < 1, 'and 600 m out the wall still stands over the horizon');
    // Past the reach the wall is not looked for.
    const past = visible[at(grid, 1500 + HIGH_GRAPHICS.CRATER.SHADE_REACH_M + 100, 1500)]!;
    assert.equal(past, 1);
  });

  it('shades by more under a taller wall', () => {
    const under = (dropM: number) => {
      const grid = gridOf(SIDE, STEP_M, (xM) => (xM < 1500 ? 600 : 600 + dropM));
      return lidVisibility(grid)[at(grid, 1700, 1500)]!;
    };
    // The garden's 200 m step against the bowl's 900 m wall.
    assert.ok(under(900) < under(200), `${under(900)} under 900 m, ${under(200)} under 200 m`);
    assert.ok(under(200) < 1);
  });

  it('reads the heights at their true scale, not the drawn one', () => {
    // Light does not know the column is drawn at 0.22: a 900 m wall 200 m
    // off stands 77 degrees up, and hides nearly all of its own bearing.
    const grid = gridOf(SIDE, STEP_M, (xM) => (xM < 1500 ? 600 : 1500));
    const share = lidVisibility(grid)[at(grid, 1700, 1500)]!;
    // Read at the drawn scale the same wall would stand 45 degrees up and
    // hide a quarter of the glow at most.
    assert.ok(share < 0.75, `the floor 200 m off keeps ${share}`);
  });

  it("puts the free-water crater's floors in the order of their walls", () => {
    const terrain = terrainFor(FREE_WATER_SLICE).serialize();
    const grid = buildHeightGrid(terrain, seabedSeed(terrain), rockTopDepthM(terrain), true);
    const visible = lidVisibility(grid);
    const mean = (points: [number, number][]) =>
      points.reduce((sum, [x, z]) => sum + visible[at(grid, x, z)]!, 0) / points.length;
    // Cell centres of docs/free-water-slice.md §3: the outside rim, the
    // bowl's ring under the rim's wall, and the pocket's middle.
    const rim = mean([
      [375, 1875],
      [625, 2875],
      [3625, 625],
    ]);
    const ring = mean([
      [1375, 2125],
      [3125, 2125],
    ]);
    const pocket = mean([[2125, 2125]]);
    assert.ok(rim > 0.9, `the rim keeps ${rim}`);
    assert.ok(ring < rim - 0.2, `the ring keeps ${ring} under the rim's wall`);
    assert.ok(pocket > ring, `the pocket's middle, far from its walls, keeps ${pocket}`);
    for (const share of visible) assert.ok(share > 0 && share <= 1);
    // Deterministic from the grid alone: no clock and no random in it.
    assert.deepEqual(lidVisibility(grid), visible);
  });

  it('writes the shade into the relief’s alpha, whole each time', () => {
    const grid = gridOf(SIDE, STEP_M, (xM) => (xM < 1500 ? 600 : 1500));
    const visible = lidVisibility(grid);
    const [width, height] = [64, 64];
    const relief = new Uint8Array(width * height * 4).fill(7);
    writeLidShade(relief, width, height, grid, visible);
    const alpha = (xM: number) =>
      relief[(32 * width + Math.floor((xM / grid.widthM) * width)) * 4 + 3]!;
    assert.equal(alpha(700), 255, 'the rim is open');
    assert.ok(alpha(1650) < alpha(2300), 'the foot is darker than the floor further out');
    // `SHADE` of what the wall hides is taken, and the rest of the glow kept.
    const share = HIGH_GRAPHICS.CRATER.SHADE;
    const foot = visible[at(grid, 1650, 1500)]!;
    assert.ok(Math.abs(alpha(1650) - 255 * (1 - share + share * foot)) < 12, `${alpha(1650)}`);
    assert.ok(alpha(1650) >= Math.floor(255 * (1 - share)), 'never under what is left untaken');
    // The slope and the occlusion beside it are the bake's, and untouched.
    for (let i = 0; i < relief.length; i += 4) {
      assert.deepEqual([relief[i], relief[i + 1], relief[i + 2]], [7, 7, 7]);
    }
    // A bake that rewrote some pixels to 255 is mended by the same write.
    const first = relief.slice();
    for (let i = 3; i < relief.length; i += 8) relief[i] = 255;
    writeLidShade(relief, width, height, grid, visible);
    assert.deepEqual(relief, first);
  });
});
