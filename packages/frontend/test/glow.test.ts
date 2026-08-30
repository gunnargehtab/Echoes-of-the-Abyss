/**
 * Gate 3's live half (docs/graphics-standards.md, docs/three-layer-ocean.md §8):
 * a lamp's resting strength is the intake-approved budget, and live SIG swings
 * it along the spec curve's exponent. These are the promises that make the
 * swing a rule of the world rather than a mood: at rest it is exactly 1, it is
 * monotonic in loudness, its ratio is the curve's own, and both clamps hold.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GLOW_FACTOR_MAX, GLOW_FACTOR_MIN, glowFactor, SIG_GLOW_EFOLD } from '../src/game/glow.ts';

describe('live glow modulation', () => {
  it('is exactly 1 at the resting SIG — the approved budget ships untouched', () => {
    for (const rest of [6, 22, 28, 35, 65]) {
      assert.equal(glowFactor(rest, rest), 1);
    }
  });

  it('follows the spec curve: one e-folding per 14 SIG', () => {
    const rest = 28;
    assert.ok(Math.abs(glowFactor(rest + SIG_GLOW_EFOLD, rest) - Math.E) < 1e-12);
    assert.ok(Math.abs(glowFactor(rest - SIG_GLOW_EFOLD, rest) - 1 / Math.E) < 1e-12);
  });

  it('is monotonic: louder is never darker', () => {
    let previous = 0;
    for (let sig = 0; sig <= 100; sig += 5) {
      const factor = glowFactor(sig, 28);
      assert.ok(factor >= previous);
      previous = factor;
    }
  });

  it('clamps both ends: marks never vanish, flares never white-clip', () => {
    assert.equal(glowFactor(0, 100), GLOW_FACTOR_MIN);
    assert.equal(glowFactor(100, 0), GLOW_FACTOR_MAX);
  });
});
