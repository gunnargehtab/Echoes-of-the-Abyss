/**
 * The perspective viewport's heightfield (docs/three-layer-ocean.md §5).
 *
 * The mesh is render-only by rule, so what these tests hold is not gameplay —
 * it is the promises that make a heightfield safe to stand a view on: it is
 * deterministic, it tracks the authored floors within the detail field's own
 * amplitude, rock rises above the water around it, and the vertical axis is a
 * single presentation-only scale. The three.js geometry that consumes this
 * grid needs a GL context and is reviewed by screenshot, per the
 * graphics-standards checklist.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Biome } from '@echoes/shared';
import { BIOME_RELIEF, detailM, ROCK_RELIEF, seabedSeed } from '../src/game/seabed.ts';
import {
  authoredFloorAtM,
  buildHeightGrid,
  patchHeightGrid,
  DEPTH_VISUAL_M_PER_M,
  depthToWorldY,
  rockTopDepthM,
  ROCK_RISE_ABOVE_SHALLOWEST_M,
  seabedDepthAtM,
  VERTS_PER_CELL,
} from '../src/game/perspectiveTerrain.ts';
import type { TerrainPayload } from '../src/net/GameClient.ts';

/** A 4×4 map: a shallow plateau, deep water, and one rock cell. */
function demoTerrain(): TerrainPayload {
  const cols = 4;
  const rows = 4;
  const biomes = new Array(cols * rows).fill(Biome.OpenWater);
  const floor = new Array(cols * rows).fill(2000);
  const ceiling = new Array(cols * rows).fill(0);
  floor[0] = 400; // plateau corner
  floor[5] = 2600; // trench cell
  ceiling[10] = 3000; // rock: ceiling below floor
  floor[10] = 2000;
  return { cols, rows, cellM: 250, biomes, floor, ceiling };
}

describe('perspective heightfield', () => {
  it('is deterministic: same terrain, same grid', () => {
    const a = buildHeightGrid(demoTerrain());
    const b = buildHeightGrid(demoTerrain());
    assert.deepEqual([...a.y], [...b.y]);
    assert.equal(a.vertsX, 4 * VERTS_PER_CELL + 1);
    assert.equal(a.vertsZ, 4 * VERTS_PER_CELL + 1);
  });

  it('tracks the authored floor within the detail amplitude', () => {
    const terrain = demoTerrain();
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    const amplitude = BIOME_RELIEF[Biome.OpenWater].amplitudeM;
    // Cell centres far from the rock cell and from cell boundaries: the
    // bilinear floor there is the authored floor, so only the detail field
    // separates the sample from the authoring.
    const depth = seabedDepthAtM(terrain, seed, rockTop, 3.5 * 250, 3.5 * 250);
    assert.ok(Math.abs(depth - 2000) <= amplitude + 1e-9);
  });

  it('raises rock above every open floor around it, crag included', () => {
    const terrain = demoTerrain();
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    // Rock cell 10 is at col 2, row 2 — its centre sits at the rock top plus
    // the rock detail crag, which is bounded by the rock amplitude. Because
    // that amplitude is smaller than the rise, even the crag's lowest notch
    // stays shallower (smaller depth) than the shallowest open water.
    const depth = seabedDepthAtM(terrain, seed, rockTop, 2.5 * 250, 2.5 * 250);
    assert.ok(Math.abs(depth - rockTop) <= ROCK_RELIEF.amplitudeM + 1e-9);
    assert.equal(rockTop, Math.max(0, 400 - ROCK_RISE_ABOVE_SHALLOWEST_M));
    assert.ok(ROCK_RELIEF.amplitudeM < ROCK_RISE_ABOVE_SHALLOWEST_M, 'crag taller than the rise');
    assert.ok(depth < 400, 'rock dipped back under the shallowest open floor');
    assert.ok(depth >= 0, 'a spire pierced the surface');
  });

  it('maps depth to world Y through one presentation scale, downward', () => {
    // `===`, not strict-deep-equal: the surface is 0 whether IEEE calls it -0.
    assert.ok(depthToWorldY(0) === 0);
    assert.equal(depthToWorldY(1000), -1000 * DEPTH_VISUAL_M_PER_M);
    // Deeper is lower, monotonically — a view that folded the axis would be
    // drawing depth as something other than depth.
    assert.ok(depthToWorldY(2600) < depthToWorldY(400));
  });

  it('keeps the grid aligned with the map extent', () => {
    const grid = buildHeightGrid(demoTerrain());
    assert.equal(grid.widthM, 1000);
    assert.equal(grid.heightM, 1000);
    assert.equal(grid.stepM * (grid.vertsX - 1), grid.widthM);
    assert.equal(grid.y.length, grid.vertsX * grid.vertsZ);
  });

  it('patches a ground delta into the grid a full build would make (#434)', () => {
    const before = demoTerrain();
    const seed = seabedSeed(before);
    const rockTop = rockTopDepthM(before);
    const grid = buildHeightGrid(before, seed, rockTop);

    const after = demoTerrain();
    after.floor[6] = 2500; // (row 1, col 2) drops
    after.ceiling[9] = 3000; // (row 2, col 1) becomes rock
    const span = patchHeightGrid(grid, after, seed, rockTop, {
      col0: 1,
      row0: 1,
      col1: 2,
      row1: 2,
    });
    const fresh = buildHeightGrid(after, seed, rockTop);
    assert.deepEqual([...grid.y], [...fresh.y]);
    assert.deepEqual([...grid.floor], [...fresh.floor]);
    assert.ok(span.first < span.last, 'the changed span is a real range of vertices');

    // The ring is enough: with the same seed and rock top, nothing outside it
    // moved between the two full builds either.
    const untouched = buildHeightGrid(before, seed, rockTop);
    const ix0 = 0 * VERTS_PER_CELL;
    const ix1 = 3 * VERTS_PER_CELL + VERTS_PER_CELL;
    for (let iz = 0; iz < fresh.vertsZ; iz++) {
      for (let ix = 0; ix < fresh.vertsX; ix++) {
        const inRing = ix >= ix0 && ix <= ix1 && iz >= 0 && iz <= 4 * VERTS_PER_CELL;
        if (inRing) continue;
        assert.equal(fresh.y[iz * fresh.vertsX + ix], untouched.y[iz * fresh.vertsX + ix]);
      }
    }
  });
});

/**
 * The surface the survey ink contours (docs/map-visuals.md §4). Rule 1 is the
 * one that matters: an isobath is a measurement, so it may read the floor the
 * author wrote and never the render-only detail field over it.
 */
describe('authored floor for the survey ink', () => {
  it('is the heightfield without the detail field, wherever the ground is open', () => {
    const terrain = demoTerrain();
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    const relief = BIOME_RELIEF[Biome.OpenWater];
    // Every open-homed vertex of the demo map: the mesh depth minus the
    // detail field at the same point is the authored floor, exactly.
    const grid = buildHeightGrid(terrain, seed, rockTop);
    let checked = 0;
    for (let iz = 0; iz < grid.vertsZ; iz++) {
      for (let ix = 0; ix < grid.vertsX; ix++) {
        const x = ix * grid.stepM;
        const y = iz * grid.stepM;
        const col = Math.min(3, Math.max(0, Math.round(x / 250 - 0.5)));
        const row = Math.min(3, Math.max(0, Math.round(y / 250 - 0.5)));
        if (terrain.ceiling[row * 4 + col]! > terrain.floor[row * 4 + col]!) continue;
        const detail = detailM(x, y, seed, relief.amplitudeM, relief.roughness, relief.blockiness);
        const mesh = seabedDepthAtM(terrain, seed, rockTop, x, y);
        assert.ok(Math.abs(mesh - detail - grid.floor[iz * grid.vertsX + ix]!) < 1e-6);
        checked++;
      }
    }
    assert.ok(checked > 200, 'the comparison walked the open ground');
  });

  it('reads the authored floor at every open cell centre', () => {
    const terrain = demoTerrain();
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const i = row * 4 + col;
        if (terrain.ceiling[i]! > terrain.floor[i]!) continue;
        assert.equal(
          authoredFloorAtM(terrain, (col + 0.5) * 250, (row + 0.5) * 250),
          terrain.floor[i]
        );
      }
    }
  });

  it('carries the open floor, not a false scarp, onto the edge of a mesa', () => {
    // A strip of rock down column 1 of an otherwise flat 1,500 m plain. The
    // vertices on the rock's west edge are rock-homed, and they feed the
    // open triangles beside it: if they carried anything but 1,500 m, every
    // isobath between that number and the plain's would crowd into the foot
    // of the wall.
    const cols = 4;
    const rows = 4;
    const floor = new Array(cols * rows).fill(1500);
    const ceiling = new Array(cols * rows).fill(0);
    for (let row = 0; row < rows; row++) {
      ceiling[row * cols + 1] = 3000;
      floor[row * cols + 1] = 100; // rock's own number, which must not leak
    }
    const terrain: TerrainPayload = {
      cols,
      rows,
      cellM: 250,
      biomes: new Array(cols * rows).fill(Biome.OpenWater),
      floor,
      ceiling,
    };
    for (const y of [0, 125, 250, 400, 625, 1000]) {
      assert.equal(authoredFloorAtM(terrain, 250, y), 1500, `west edge at y=${y}`);
      assert.equal(authoredFloorAtM(terrain, 500, y), 1500, `east edge at y=${y}`);
    }
  });
});
