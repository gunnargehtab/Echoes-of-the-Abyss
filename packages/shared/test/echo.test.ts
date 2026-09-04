/**
 * Tests for the Echo Layer math.
 *
 * These pin the properties the design docs actually promise, rather than the
 * specific numbers our propagation model happens to produce — the model is
 * explicitly tunable, so asserting its exact outputs would make retuning a
 * test-breaking exercise. The one exception is the active sonar calibration,
 * which the docs DO pin to an exact radius.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_SONAR,
  PROPAGATION_FACTOR,
  Biome,
  DepthBand,
  ResolutionTier,
  crushAttritionPerSecond,
  depthBandFor,
  detectionRatio,
  maxAudibleRangeM,
  perceivedLoudness,
  resolveTier,
  requiredPressureRating,
  blurBearing,
  scatterContact,
  scatterLie,
  stableUnit,
  SCATTER,
  SIM,
  PROPAGATION_MODEL,
  MAX_PATH_PROPAGATION_FACTOR,
  MAX_PROPAGATION_FACTOR,
  THERMOCLINE,
  THERMOCLINE_DUCT_BOTTOM_M,
  THERMOCLINE_DUCT_TOP_M,
  THERMOCLINE_ZONE_MAX,
  ThermoclineZone,
  thermoclineFactor,
  thermoclineZone,
} from '../dist/index.js';

describe('perceivedLoudness', () => {
  it('does not attenuate inside the reference distance', () => {
    const near = perceivedLoudness(50, 1, 10);
    const atReference = perceivedLoudness(50, 1, PROPAGATION_MODEL.REFERENCE_DISTANCE_M);
    assert.equal(near, atReference);
  });

  it('falls off monotonically with distance', () => {
    let previous = Infinity;
    for (const d of [100, 200, 400, 800, 1600, 3200]) {
      const loudness = perceivedLoudness(50, 1, d);
      assert.ok(loudness < previous, `expected falloff at ${d}m`);
      previous = loudness;
    }
  });

  it('scales linearly with SIG', () => {
    assert.ok(Math.abs(perceivedLoudness(60, 1, 500) - 2 * perceivedLoudness(30, 1, 500)) < 1e-9);
  });
});

describe('propagation factor by biome', () => {
  it('masks emitters in thermal vents and kelp, and carries them in trenches', () => {
    const distance = 1200;
    const openWater = detectionRatio(40, PROPAGATION_FACTOR[Biome.OpenWater], distance, 50);
    const vent = detectionRatio(40, PROPAGATION_FACTOR[Biome.ThermalVein], distance, 50);
    const kelp = detectionRatio(40, PROPAGATION_FACTOR[Biome.KelpForest], distance, 50);
    const trench = detectionRatio(40, PROPAGATION_FACTOR[Biome.AbyssalTrench], distance, 50);

    assert.ok(vent < openWater, 'vent roar should mask');
    assert.ok(kelp < openWater, 'kelp should muffle');
    assert.ok(trench > openWater, 'trench walls should channel sound further');
  });
});

describe('resolveTier', () => {
  it('degrades through every tier as distance grows', () => {
    // Walk outward from a loud emitter and confirm we pass through each tier.
    const seen = new Set<ResolutionTier>();
    for (let d = 100; d <= 6000; d += 25) {
      seen.add(resolveTier(80, 1, d, 50));
    }
    assert.ok(seen.has(ResolutionTier.Track));
    assert.ok(seen.has(ResolutionTier.Classification));
    assert.ok(seen.has(ResolutionTier.Bearing));
    assert.ok(seen.has(ResolutionTier.Contact));
    assert.ok(seen.has(ResolutionTier.Silent));
  });

  it('never improves resolution with distance', () => {
    let previous = ResolutionTier.Track;
    for (let d = 100; d <= 8000; d += 50) {
      const tier = resolveTier(80, 1, d, 50);
      assert.ok(tier <= previous, `tier rose at ${d}m`);
      previous = tier;
    }
  });

  it('gives sharper-eared listeners at least as much resolution', () => {
    for (let d = 200; d <= 4000; d += 200) {
      const dull = resolveTier(40, 1, d, 30);
      const sharp = resolveTier(40, 1, d, 85);
      assert.ok(sharp >= dull, `HYD advantage inverted at ${d}m`);
    }
  });

  it('a silent-running scout in kelp is much harder to hear than one cruising in the open', () => {
    const silentInKelp = resolveTier(4, PROPAGATION_FACTOR[Biome.KelpForest], 900, 50);
    const cruisingOpen = resolveTier(12, PROPAGATION_FACTOR[Biome.OpenWater], 900, 50);
    assert.ok(silentInKelp < cruisingOpen);
  });
});

describe('active sonar calibration', () => {
  /**
   * The docs pin this exactly: a ping resolves the pinger to Tier 4 for every
   * enemy listener within 2,400 m. The propagation model's free parameter is
   * derived from this, so it must hold to the metre.
   */
  it("reveals the pinger at Tier 4 at exactly the spec'd self-reveal radius", () => {
    const atRadius = resolveTier(
      ACTIVE_SONAR.EMITTER_SIG,
      1,
      ACTIVE_SONAR.SELF_REVEAL_RADIUS_M,
      PROPAGATION_MODEL.BASELINE_HYD
    );
    assert.equal(atRadius, ResolutionTier.Track);
  });

  it('drops below Tier 4 just beyond the self-reveal radius', () => {
    const beyond = resolveTier(
      ACTIVE_SONAR.EMITTER_SIG,
      1,
      ACTIVE_SONAR.SELF_REVEAL_RADIUS_M + 50,
      PROPAGATION_MODEL.BASELINE_HYD
    );
    assert.ok(beyond < ResolutionTier.Track);
  });
});

describe('maxAudibleRangeM', () => {
  it('agrees with resolveTier about where detection stops', () => {
    // The broadphase bound must never cull a contact that would have resolved:
    // just inside the range detection holds, just outside it is silent.
    for (const sig of [10, 28, 55, 95]) {
      for (const pf of [0.45, 1.0, 1.6]) {
        const range = maxAudibleRangeM(sig, pf, 50);
        assert.notEqual(
          resolveTier(sig, pf, range * 0.99, 50),
          ResolutionTier.Silent,
          `sig ${sig} pf ${pf}: should still be audible inside range`
        );
        assert.equal(
          resolveTier(sig, pf, range * 1.01, 50),
          ResolutionTier.Silent,
          `sig ${sig} pf ${pf}: should be silent beyond range`
        );
      }
    }
  });

  it('returns zero for a silent emitter', () => {
    assert.equal(maxAudibleRangeM(0, 1, 50), 0);
  });
});

describe('blurBearing', () => {
  it('is stable across calls, so a client cannot average out the error', () => {
    const a = blurBearing(1000, 1000, 0, 0, 42);
    const b = blurBearing(1000, 1000, 0, 0, 42);
    assert.deepEqual(a, b);
  });

  it('displaces the contact but keeps it in the right neighbourhood', () => {
    const trueX = 2000;
    const trueY = 0;
    const blurred = blurBearing(trueX, trueY, 0, 0, 7);
    const error = Math.hypot(blurred.x - trueX, blurred.y - trueY);
    assert.ok(error > 0, 'should actually blur');
    // 15% per axis, so the worst case is the diagonal of two 15% errors.
    assert.ok(error <= 2000 * 0.15 * Math.SQRT2 + 1e-6, `error ${error} too large`);
  });

  it('gives different contacts different error, so blobs do not move in lockstep', () => {
    const a = blurBearing(1000, 1000, 0, 0, 1);
    const b = blurBearing(1000, 1000, 0, 0, 2);
    assert.notDeepEqual(a, b);
  });
});

describe('depth', () => {
  it('maps depths to the bands in systems-depth.md', () => {
    assert.equal(depthBandFor(0), DepthBand.Shelf);
    assert.equal(depthBandFor(399), DepthBand.Shelf);
    assert.equal(depthBandFor(400), DepthBand.MidWater);
    assert.equal(depthBandFor(1799), DepthBand.MidWater);
    assert.equal(depthBandFor(1800), DepthBand.Abyssal);
    assert.equal(depthBandFor(5000), DepthBand.Abyssal);
  });

  it('requires a higher pressure rating the deeper you go', () => {
    assert.equal(requiredPressureRating(100), 1);
    assert.equal(requiredPressureRating(1000), 2);
    assert.equal(requiredPressureRating(3000), 3);
  });

  it('charges no attrition to a unit rated for its depth', () => {
    assert.equal(crushAttritionPerSecond(3, 3000), 0);
    assert.equal(crushAttritionPerSecond(2, 1000), 0);
    assert.equal(crushAttritionPerSecond(1, 200), 0);
  });

  it('charges more the further a unit overreaches', () => {
    const oneBand = crushAttritionPerSecond(2, 3000);
    const twoBands = crushAttritionPerSecond(1, 3000);
    assert.ok(oneBand > 0);
    assert.ok(twoBands > oneBand, 'deeper overreach must hurt more');
  });
});

describe('the thermocline', () => {
  /**
   * Depths named off the constant rather than written as literals, so moving
   * the layer moves the tests with it instead of turning them red.
   */
  const ABOVE = THERMOCLINE_DUCT_TOP_M - 500;
  const BELOW = THERMOCLINE_DUCT_BOTTOM_M + 500;
  const IN_DUCT = THERMOCLINE.DEPTH_M;

  it('puts the duct edges inside the duct', () => {
    // The boundary belongs to the duct on both sides. An off-by-one here is
    // invisible in play and would make the zone table asymmetric.
    assert.equal(thermoclineZone(THERMOCLINE_DUCT_TOP_M), ThermoclineZone.Duct);
    assert.equal(thermoclineZone(THERMOCLINE_DUCT_BOTTOM_M), ThermoclineZone.Duct);
    assert.equal(thermoclineZone(THERMOCLINE_DUCT_TOP_M - 1), ThermoclineZone.Above);
    assert.equal(thermoclineZone(THERMOCLINE_DUCT_BOTTOM_M + 1), ThermoclineZone.Below);
  });

  it('reads the surface and the seabed as opposite sides', () => {
    assert.equal(thermoclineZone(0), ThermoclineZone.Above);
    assert.equal(thermoclineZone(3000), ThermoclineZone.Below);
  });

  it("transcribes §3's table", () => {
    assert.equal(thermoclineFactor(ABOVE, BELOW), THERMOCLINE.ACROSS);
    assert.equal(thermoclineFactor(IN_DUCT, IN_DUCT), THERMOCLINE.ALONG);
    // Everything else is untouched, including a pair with one end in the duct:
    // the duct is a bonus for sound running *along* it, not a toll booth.
    assert.equal(thermoclineFactor(ABOVE, ABOVE), 1);
    assert.equal(thermoclineFactor(BELOW, BELOW), 1);
    assert.equal(thermoclineFactor(ABOVE, IN_DUCT), 1);
    assert.equal(thermoclineFactor(BELOW, IN_DUCT), 1);
  });

  it('hides you exactly as much as it hides them', () => {
    // Symmetry is the property, not an implementation detail: detection is
    // resolved once per ordered pair, so an asymmetric factor would mean a
    // deep hull could hear a shallow one that could not hear it back — a free
    // scouting advantage handed to whoever happened to be deeper.
    for (let a = 0; a <= 3000; a += 50) {
      for (let b = 0; b <= 3000; b += 50) {
        assert.equal(
          thermoclineFactor(a, b),
          thermoclineFactor(b, a),
          `asymmetric between ${a} m and ${b} m`
        );
      }
    }
  });

  it('cuts a crossing well below the detection bar it would otherwise clear', () => {
    // The mechanic, stated as the thing a player would notice: a pair that is
    // a comfortable contact in one layer is silent across two.
    const sig = 60;
    const hyd = 70;
    const range = maxAudibleRangeM(sig, 1, hyd);
    const d = range * 0.75;
    assert.ok(detectionRatio(sig, thermoclineFactor(ABOVE, ABOVE), d, hyd) >= 1);
    assert.ok(detectionRatio(sig, thermoclineFactor(ABOVE, BELOW), d, hyd) < 1);
  });

  it('bounds every pair by MAX_PATH_PROPAGATION_FACTOR', () => {
    // The broadphase sizes itself from this product. If any reachable pair
    // could exceed it, the pass would prune contacts its own exact test would
    // have accepted — a silent hole rather than a visible failure.
    for (let a = 0; a <= 3000; a += 25) {
      for (let b = 0; b <= 3000; b += 25) {
        assert.ok(
          MAX_PROPAGATION_FACTOR * thermoclineFactor(a, b) <= MAX_PATH_PROPAGATION_FACTOR,
          `${a} m to ${b} m exceeds the path ceiling`
        );
      }
    }
  });

  it('bounds every listener a given emitter zone could have', () => {
    // The per-emitter row maximum, which is what the broadphase actually uses:
    // only the emitter's depth is known when the search radius is chosen.
    for (let a = 0; a <= 3000; a += 25) {
      const rowMax = THERMOCLINE_ZONE_MAX[thermoclineZone(a)]!;
      for (let b = 0; b <= 3000; b += 25) {
        assert.ok(thermoclineFactor(a, b) <= rowMax, `${a} m to ${b} m exceeds its row maximum`);
      }
    }
  });
});

describe('scattered water — docs/systems-echo.md §3', () => {
  const listener = { x: 1000, y: 1000 };
  const truth = { x: 1000 + 600, y: 1000 };
  const told = (fraction: number, seed = 31, tick = 0, observer = 1, key = 7) =>
    scatterContact(truth.x, truth.y, listener.x, listener.y, fraction, seed, observer, key, tick);
  const polar = (p: { x: number; y: number }) => ({
    bearing: Math.atan2(p.y - listener.y, p.x - listener.x),
    range: Math.hypot(p.x - listener.x, p.y - listener.y),
  });

  it('is the identity in open water', () => {
    assert.deepEqual(told(0), truth);
    assert.deepEqual(scatterContact(5, 5, 5, 5, 1, 31, 1, 7, 0), { x: 5, y: 5 });
  });

  it('lies by at most ±30° and reads at most 15% long, never short', () => {
    for (let tick = 0; tick < 600; tick += 13) {
      for (let seed = 1; seed < 40; seed++) {
        const p = polar(told(1, seed, tick));
        assert.ok(Math.abs(p.bearing) <= SCATTER.MAX_BEARING_ERROR_RAD + 1e-9);
        assert.ok(p.range >= 600 - 1e-9, `${p.range} is short`);
        assert.ok(p.range <= 600 * (1 + SCATTER.MAX_RANGE_STRETCH) + 1e-9);
      }
    }
  });

  it('scales both lies with the scattered fraction of the path', () => {
    const full = polar(told(1));
    const half = polar(told(0.5));
    assert.ok(Math.abs(half.bearing) < Math.abs(full.bearing) || full.bearing === 0);
    assert.ok(half.range - 600 <= full.range - 600 + 1e-9);
  });

  it('is deterministic on its inputs, and differs by seed, pair and time', () => {
    assert.deepEqual(told(1), told(1));
    assert.notDeepEqual(told(1, 31), told(1, 32), 'seed');
    assert.notDeepEqual(told(1, 31, 0, 1, 7), told(1, 31, 0, 2, 7), 'observer');
    assert.notDeepEqual(told(1, 31, 0, 1, 7), told(1, 31, 0, 1, 8), 'emitter');
    const period = SCATTER.DRIFT_PERIOD_S * SIM.TICK_HZ;
    assert.notDeepEqual(told(1, 31, 0), told(1, 31, period), 'a drift period on');
  });

  it('keeps the lie inside [-1, 1] and continuous across a lattice point', () => {
    const period = SCATTER.DRIFT_PERIOD_S * SIM.TICK_HZ;
    let previous = scatterLie(31, 7, 1, 0, period);
    for (let tick = 1; tick <= period * 3; tick++) {
      const now = scatterLie(31, 7, 1, tick, period);
      assert.ok(now >= -1 && now <= 1);
      assert.ok(Math.abs(now - previous) < 0.05, `jump of ${now - previous} at ${tick}`);
      previous = now;
    }
  });

  it('hashes onto [0, 1) and is identical for identical inputs', () => {
    for (let i = 0; i < 1000; i++) {
      const u = stableUnit(31, i, 3, i * 7);
      assert.ok(u >= 0 && u < 1);
      assert.equal(u, stableUnit(31, i, 3, i * 7));
    }
    assert.notEqual(
      stableUnit(31, 1, 3, 0),
      stableUnit(31, 1, 3, -1),
      'the standing step is its own'
    );
  });
});
