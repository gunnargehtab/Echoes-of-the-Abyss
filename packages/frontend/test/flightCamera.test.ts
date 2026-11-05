import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { flightInterval, rotateFlight, sweepFlight } from '../src/game/flightCamera.ts';
import { freeWaterControlsEnabled } from '../src/game/freeWaterControls.ts';
import { cannedTerrain } from './support/cannedMatch.ts';
import { buildHeightGrid, DEPTH_VISUAL_M_PER_M } from '../src/game/perspectiveTerrain.ts';
import { seabedSeed } from '../src/game/seabed.ts';
import { terrainFor } from '../../backend/src/sim/maps/index.ts';
import { FREE_WATER_SLICE } from '../../backend/src/sim/maps/freeWaterSlice.ts';

describe('free-water flight boundary', () => {
  it('is opt-in and cannot be enabled in production', () => {
    for (const search of ['?freeWaterControls=1', '?study=free-water']) {
      assert.equal(freeWaterControlsEnabled(true, search), true);
      assert.equal(freeWaterControlsEnabled(false, search), false);
    }
    assert.equal(freeWaterControlsEnabled(true, ''), false);
    assert.equal(freeWaterControlsEnabled(true, '?freeWaterControls=0'), false);
  });

  it('sweeps through a rock cell instead of accepting a legal far endpoint', () => {
    const terrain = cannedTerrain();
    terrain.floor.fill(1000);
    terrain.ceiling.fill(0);
    terrain.ceiling[terrain.cols + 2] = 3000;
    const grid = buildHeightGrid(terrain);
    grid.y.fill(-220);
    const eye = new Vector3(terrain.cellM * 1.5, -110, terrain.cellM * 1.5);
    const delta = new Vector3(terrain.cellM * 4, 0, 0);
    assert.equal(sweepFlight(eye, delta, terrain, grid), false);
    assert.ok(eye.x < terrain.cellM * 2 && eye.x > terrain.cellM * 1.9);
    assert.equal(eye.y, -110);
  });

  it('stops at a roof, surface, rendered floor and map boundary', () => {
    const terrain = cannedTerrain();
    terrain.floor.fill(1000);
    terrain.ceiling.fill(200);
    const grid = buildHeightGrid(terrain);
    grid.y.fill(-220);
    const interval = flightInterval(terrain, grid, 375, 375)!;
    assert.equal(interval.maxY, -49.5);
    assert.equal(interval.minY, -214.5);
    for (const delta of [
      new Vector3(0, 1000, 0),
      new Vector3(0, -1000, 0),
      new Vector3(-1000, 0, 0),
    ]) {
      const eye = new Vector3(375, -110, 375);
      assert.equal(sweepFlight(eye, delta, terrain, grid), false);
      assert.ok(eye.y >= interval.minY && eye.y <= interval.maxY && eye.x >= 0);
    }
    terrain.ceiling.fill(0);
    assert.equal(flightInterval(terrain, grid, 375, 375)!.maxY, -5.5);
  });

  it('does not jump over a thin triangle peak or a diagonal rock corner', () => {
    const terrain = cannedTerrain();
    terrain.floor.fill(1000);
    terrain.ceiling.fill(0);
    const grid = buildHeightGrid(terrain);
    grid.y.fill(-220);
    const i = 6 * grid.vertsX + 8;
    grid.y[i] = -50;
    const eye = new Vector3(375, -110, 375);
    assert.equal(sweepFlight(eye, new Vector3(250, 0, 0), terrain, grid), false);
    assert.ok(eye.x < 500);
  });

  it('clears the eroded ground the study draws, not the authored ramp under it', () => {
    // docs/free-water-slice.md §9, "Crater walls": the flight eye sweeps the
    // drawn triangles, so its clearance follows the override. On the crater
    // the two grids differ most on the southern wall's north face; this
    // takes the vertex where they differ most over open water, and flies
    // an eye straight down onto it with each grid.
    const terrain = terrainFor(FREE_WATER_SLICE).serialize();
    const seed = seabedSeed(terrain);
    const plain = buildHeightGrid(terrain, seed);
    const eroded = buildHeightGrid(terrain, seed, undefined, true);
    let best = -1;
    let gap = 0;
    for (let iz = 1; iz < plain.vertsZ - 1; iz++) {
      for (let ix = 1; ix < plain.vertsX - 1; ix++) {
        const i = iz * plain.vertsX + ix;
        const x = ix * plain.stepM + 1;
        const z = iz * plain.stepM + 1;
        if (flightInterval(terrain, plain, x, z) === null) continue;
        const d = Math.abs(plain.y[i]! - eroded.y[i]!);
        if (d > gap) {
          gap = d;
          best = i;
        }
      }
    }
    assert.ok(gap > 50 * DEPTH_VISUAL_M_PER_M, 'the premise: the grids differ over open water');
    const x = (best % plain.vertsX) * plain.stepM + 1;
    const z = Math.floor(best / plain.vertsX) * plain.stepM + 1;
    const onPlain = flightInterval(terrain, plain, x, z)!;
    const onEroded = flightInterval(terrain, eroded, x, z)!;
    assert.ok(Math.abs(onEroded.minY - onPlain.minY) > 40 * DEPTH_VISUAL_M_PER_M);
    for (const [grid, interval] of [
      [plain, onPlain],
      [eroded, onEroded],
    ] as const) {
      const eye = new Vector3(x, interval.maxY, z);
      assert.equal(sweepFlight(eye, new Vector3(0, -1000, 0), terrain, grid), false);
      assert.ok(Math.abs(eye.y - interval.minY) < 1e-3, 'the eye stops at the drawn floor');
    }
    assert.notEqual(
      Math.round(sweepFlightDepth(plain, terrain, x, z, onPlain.maxY)),
      Math.round(sweepFlightDepth(eroded, terrain, x, z, onEroded.maxY)),
      'the two grids stop the eye at different depths'
    );
  });

  it('composes each rotation through poles and a full revolution without levelling', () => {
    for (const axis of ['pitch', 'yaw', 'roll'] as const) {
      const q = new Quaternion();
      for (let i = 0; i < 360; i++) {
        rotateFlight(
          q,
          axis === 'yaw' ? Math.PI / 180 : 0,
          axis === 'pitch' ? Math.PI / 180 : 0,
          axis === 'roll' ? Math.PI / 180 : 0
        );
        assert.ok(q.toArray().every(Number.isFinite));
        assert.ok(Math.abs(q.length() - 1) < 1e-12);
      }
      assert.ok(q.angleTo(new Quaternion()) < 1e-6);
    }
    const rolled = new Quaternion();
    rotateFlight(rolled, 0, 0, Math.PI);
    rotateFlight(rolled, 0, Math.PI, 0);
    assert.ok(new Vector3(0, 0, -1).applyQuaternion(rolled).z > 0.99);
  });
});

/** Where a dive from `fromY` ends over `grid`, in metres of depth. */
function sweepFlightDepth(
  grid: ReturnType<typeof buildHeightGrid>,
  terrain: ReturnType<typeof cannedTerrain>,
  x: number,
  z: number,
  fromY: number
): number {
  const eye = new Vector3(x, fromY, z);
  sweepFlight(eye, new Vector3(0, -1000, 0), terrain, grid);
  return -eye.y / DEPTH_VISUAL_M_PER_M;
}
