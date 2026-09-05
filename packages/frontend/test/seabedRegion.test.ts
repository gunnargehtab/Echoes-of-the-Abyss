/**
 * The partial seabed rebake (#434): a shaded rectangle of cells is, pixel for
 * pixel, the same rectangle of a full bake. The view stands on this — a ground
 * delta re-shades the touched cells and a ring onto the canvas the full bake
 * made, and if the two ever disagreed the seam would show.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Biome } from '@echoes/shared';
import {
  SEABED_PX_PER_CELL,
  seabedRange,
  seabedSeed,
  shadeSeabed,
  type CellRect,
} from '../src/game/seabed.ts';
import type { TerrainPayload } from '../src/net/GameClient.ts';

/** A 6×5 map with a plateau, a trench, rock, and two biomes. */
function demoTerrain(): TerrainPayload {
  const cols = 6;
  const rows = 5;
  const biomes = new Array(cols * rows).fill(Biome.OpenWater);
  const floor = new Array(cols * rows).fill(1800);
  const ceiling = new Array(cols * rows).fill(0);
  floor[0] = 500;
  floor[7] = 2400;
  floor[8] = 2600;
  ceiling[15] = 3000; // rock
  floor[15] = 1800;
  ceiling[16] = 3000;
  floor[16] = 1800;
  biomes[20] = Biome.ThermalVein;
  biomes[21] = Biome.ThermalVein;
  biomes[27] = Biome.AbyssalTrench;
  return { cols, rows, cellM: 250, biomes, floor, ceiling };
}

function sliceOf(full: Uint8ClampedArray, fullW: number, rect: CellRect): Uint8ClampedArray {
  const P = SEABED_PX_PER_CELL;
  const x0 = rect.col0 * P;
  const y0 = rect.row0 * P;
  const w = (rect.col1 - rect.col0 + 1) * P;
  const h = (rect.row1 - rect.row0 + 1) * P;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    out.set(full.subarray(((y0 + y) * fullW + x0) * 4, ((y0 + y) * fullW + x0 + w) * 4), y * w * 4);
  }
  return out;
}

describe('seabed region shading', () => {
  const terrain = demoTerrain();
  const seed = seabedSeed(terrain);
  const range = seabedRange(terrain);
  const whole = { col0: 0, row0: 0, col1: terrain.cols - 1, row1: terrain.rows - 1 };
  const full = shadeSeabed(terrain, seed, range, whole);

  it('covers the whole canvas when asked for every cell', () => {
    assert.equal(full.x, 0);
    assert.equal(full.y, 0);
    assert.equal(full.w, terrain.cols * SEABED_PX_PER_CELL);
    assert.equal(full.h, terrain.rows * SEABED_PX_PER_CELL);
    assert.equal(full.data.length, full.w * full.h * 4);
  });

  it('shades an interior rectangle exactly as the full bake does', () => {
    const rect = { col0: 1, row0: 1, col1: 3, row1: 2 };
    const part = shadeSeabed(terrain, seed, range, rect);
    assert.equal(part.x, SEABED_PX_PER_CELL);
    assert.equal(part.y, SEABED_PX_PER_CELL);
    assert.deepEqual(part.data, sliceOf(full.data, full.w, rect));
  });

  it('shades a rectangle on the map edge, rock included, exactly as the full bake does', () => {
    // Rock at cells 15 and 16 (row 2, cols 3–4); the rectangle runs off the
    // east edge, where the clamp has to read the edge pixel as itself.
    const rect = { col0: 3, row0: 2, col1: 5, row1: 4 };
    const part = shadeSeabed(terrain, seed, range, rect);
    assert.deepEqual(part.data, sliceOf(full.data, full.w, rect));
  });

  it('clamps a rectangle that reaches past the map to the map', () => {
    const part = shadeSeabed(terrain, seed, range, { col0: -1, row0: -1, col1: 0, row1: 0 });
    assert.equal(part.x, 0);
    assert.equal(part.y, 0);
    assert.equal(part.w, SEABED_PX_PER_CELL);
    assert.equal(part.h, SEABED_PX_PER_CELL);
    assert.deepEqual(part.data, sliceOf(full.data, full.w, { col0: 0, row0: 0, col1: 0, row1: 0 }));
  });

  it('a delta re-shaded with the join range and seed matches a full bake on the same terms', () => {
    const changed = demoTerrain();
    changed.floor[9] = 2700;
    changed.ceiling[10] = 3000; // a span collapses into rock
    const after = shadeSeabed(changed, seed, range, whole);
    const touched = { col0: 3, row0: 1, col1: 4, row1: 1 };
    const ring = {
      col0: touched.col0 - 1,
      row0: touched.row0 - 1,
      col1: touched.col1 + 1,
      row1: touched.row1 + 1,
    };
    const part = shadeSeabed(changed, seed, range, ring);
    assert.deepEqual(part.data, sliceOf(after.data, after.w, ring));
    // And outside the ring nothing moved, which is why the ring is enough.
    const far = { col0: 0, row0: 3, col1: 5, row1: 4 };
    assert.deepEqual(sliceOf(after.data, after.w, far), sliceOf(full.data, full.w, far));
  });
});
