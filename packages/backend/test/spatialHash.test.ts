/**
 * The grid's bucket table is what its own query heuristic reads (#444).
 *
 * `queryRadius` sweeps the occupied buckets instead of walking the query
 * rectangle when the rectangle holds more cells than the table holds
 * buckets. Buckets were never released, so every cell anything had ever
 * stood in stayed in the table for the rest of the match, and on a large map
 * the heuristic kept choosing the rectangle walk long after the sweep had
 * become the cheaper one.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SpatialHash } from '../src/sim/spatialHash.ts';

describe('spatial hash buckets', () => {
  it('releases a bucket that stayed empty for a whole rebuild', () => {
    const grid = new SpatialHash(100);
    grid.insert(1, 50, 50);
    grid.insert(2, 950, 950);
    assert.equal(grid.bucketCount, 2);
    // The rebuild after this one puts nothing in either cell.
    grid.clear();
    assert.equal(grid.bucketCount, 2, 'a bucket used last rebuild is kept for the next');
    grid.clear();
    assert.equal(grid.bucketCount, 0, 'a bucket empty through a whole rebuild is released');
  });

  it('keeps the bucket of a cell that is reused every rebuild', () => {
    const grid = new SpatialHash(100);
    for (let tick = 0; tick < 5; tick++) {
      grid.clear();
      grid.insert(1, 50, 50);
    }
    assert.equal(grid.bucketCount, 1);
    const out: number[] = [];
    assert.deepEqual(grid.queryRadius(50, 50, 10, out), [1]);
  });

  it('still answers queries across a release', () => {
    const grid = new SpatialHash(100);
    grid.insert(1, 50, 50);
    grid.clear();
    grid.clear();
    grid.insert(1, 250, 250);
    const out: number[] = [];
    assert.deepEqual(grid.queryRadius(250, 250, 10, out), [1]);
    assert.deepEqual(grid.queryRadius(50, 50, 10, out), []);
  });
});
