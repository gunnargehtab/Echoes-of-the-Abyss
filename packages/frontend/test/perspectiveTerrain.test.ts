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
import { BIOME_RELIEF, ROCK_RELIEF, seabedSeed } from '../src/game/seabed.ts';
import {
  buildHeightGrid,
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
});
