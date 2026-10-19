/**
 * bathyarch.mjs `seamSpans`: a flank seam broken where the slab leaves its
 * flank — the Derrick's waist (#1433) — keeps the run's two ends and drops
 * each gap, so a seam never lies inside the slab it is riveted to.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seamSpans } from '../factions/bathyarch.mjs';

test('no gaps is the one span', () => {
  assert.deepEqual(seamSpans(-56, 56, []), [[-56, 56]]);
});

test("the Derrick's waist splits the run in two about it", () => {
  assert.deepEqual(seamSpans(-56, 56, [[-12, 24]]), [
    [-56, -12],
    [24, 56],
  ]);
});

test("the Derrick's end gaps stop each bar at its taper corner (#1481)", () => {
  assert.deepEqual(seamSpans(-56, 56, [[-60, -52.8], [-12, 24], [50.4, 60]]), [
    [-52.8, -12],
    [24, 50.4],
  ]);
});

test('gaps are clipped to the run, merged when they overlap, and sorted', () => {
  assert.deepEqual(seamSpans(0, 10, [[6, 8], [2, 4], [3, 5]]), [
    [0, 2],
    [5, 6],
    [8, 10],
  ]);
  assert.deepEqual(seamSpans(0, 10, [[-5, 2], [8, 20]]), [[2, 8]]);
  assert.deepEqual(seamSpans(0, 10, [[-5, 20]]), []);
});
