/**
 * The rank table against the doc that authored it — docs/systems-progression.md
 * §3 and its four rulings (#1785).
 *
 * What is asserted here is the table and its readers. What the simulation does
 * with them — who earns what, and who is told — is
 * `packages/backend/test/rank.test.ts`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  RANK,
  REFIT_STATS,
  RefitKind,
  UNIT_STATS,
  rankForExperience,
  rankGunFactor,
  rankHullFactor,
  rankedHull,
} from '../dist/index.js';

describe('the rank table (§3)', () => {
  it('is three ranks at 1×, 3× and 6× the listed hull, +10% hull and +5% gun each', () => {
    assert.equal(RANK.MAX, 3);
    assert.deepEqual(RANK.THRESHOLDS, [0, 1.0, 3.0, 6.0]);
    assert.deepEqual(RANK.HULL_FACTOR, [1, 1.1, 1.2, 1.3]);
    assert.deepEqual(RANK.GUN_FACTOR, [1, 1.05, 1.1, 1.15]);
    assert.equal(RANK.TAKEN_SHARE, 0.5, 'half the damage taken and survived');
  });

  it('ranks every hull at proportionate effort, a Chorister as a Cruiser', () => {
    for (const stats of Object.values(UNIT_STATS)) {
      const hull = stats.maxHp;
      if (!(hull > 0)) continue;
      assert.equal(rankForExperience(hull * 0.999, hull), 0, `${stats.name}: short of 1×`);
      assert.equal(rankForExperience(hull, hull), 1, `${stats.name}: 1×`);
      assert.equal(rankForExperience(hull * 3, hull), 2, `${stats.name}: 3×`);
      assert.equal(rankForExperience(hull * 6, hull), 3, `${stats.name}: 6×`);
      assert.equal(rankForExperience(hull * 600, hull), 3, `${stats.name}: the ceiling`);
    }
  });

  it('earns nothing on a hull with no hull to divide by', () => {
    assert.equal(rankForExperience(1e9, 0), 0);
  });

  it('reads 1 off the table, never a rank it does not have', () => {
    assert.equal(rankHullFactor(7), 1);
    assert.equal(rankGunFactor(-1), 1);
  });

  it('gives a hull its rank’s maximum at single precision, plated or not', () => {
    // §3, ruling 4: 100 × 1.15 × 1.10 = 126.5 for a plated Corvette-sized hull.
    const plated = Math.fround(rankedHull(100, 1) * REFIT_STATS[RefitKind.Plate].hullFactor);
    assert.ok(Math.abs(plated - 126.5) < 1e-4, `${plated}`);
    assert.equal(rankedHull(420, 2), Math.fround(420 * 1.2));
    assert.equal(Math.fround(rankedHull(420, 2)), rankedHull(420, 2), 'already an f32');
  });
});
