/**
 * The lamp halo's arithmetic — docs/art-direction.md, "Lamp halo — SPEC", and
 * gate 3 of docs/graphics-standards.md. Held over every input it takes: SIG
 * swept across 0–100 in quarter steps, lamp areas scaled by orders of
 * magnitude. The pass that draws it lands later; these hold what it is fed.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  GLOW_FACTOR_MAX,
  HALO_SIG_FLOOR,
  HALO_SIG_FULL,
  haloGain,
  haloWeight,
} from '../src/game/glow.ts';
import {
  blurWeights,
  capSites,
  entityHaloEnergy,
  LAMP_HALO,
  levelSigmasPx,
  peakField,
  siteShares,
} from '../src/game/lampHalo.ts';
import { lampSiteParts, lampSites } from '../src/game/lampSites.ts';

const SIGS = Array.from({ length: 401 }, (_, i) => i / 4);
const close = (a: number, b: number, eps = 1e-9) =>
  Math.abs(a - b) <= eps * Math.max(1, Math.abs(b));

describe('lamp halo: the SIG gate (gate 3)', () => {
  it('weighs nothing through SIG 15 and rises linearly to full at 35', () => {
    assert.equal(HALO_SIG_FLOOR, 15);
    assert.equal(HALO_SIG_FULL, 35);
    for (const sig of SIGS.filter((s) => s <= 15)) assert.equal(haloWeight(sig), 0, `SIG ${sig}`);
    assert.equal(haloWeight(25), 0.5);
    for (const sig of SIGS.filter((s) => s >= 35)) assert.equal(haloWeight(sig), 1, `SIG ${sig}`);
  });

  it('gives no gain to any live SIG of 15 or under, and never falls as SIG rises', () => {
    let last = -Infinity;
    for (const sig of SIGS) {
      const gain = haloGain(sig);
      if (sig <= 15) assert.equal(gain, 0, `SIG ${sig} spreads no light`);
      assert.ok(gain >= last, `gain fell at SIG ${sig}`);
      last = gain;
    }
    assert.equal(haloGain(-20), 0, 'below the scale is the scale');
    assert.equal(haloGain(150), haloGain(100), 'SIG is taken at most at 100');
  });

  it('rides gate 3 curve above 35, uncapped where the lamp factor stops at 6', () => {
    assert.equal(haloGain(35), 1);
    assert.ok(close(haloGain(95), Math.exp(60 / 14)), 'a ping carries about 73 times SIG 35');
    assert.ok(haloGain(95) > GLOW_FACTOR_MAX);
  });
});

describe('lamp halo: the energy (art-direction, Lamp halo — SPEC)', () => {
  it('orders entities by live SIG alone, at the ratios the SPEC quotes', () => {
    const at = (sig: number) => entityHaloEnergy(sig, 1);
    assert.equal(at(35), LAMP_HALO.ENERGY_M2);
    assert.ok(close(at(64) / at(35), Math.exp(29 / 14)), 'a Caisson carries 7.9 times the Bastion');
    assert.ok(
      Math.abs(at(64) / at(25) - 32.4) < 0.05,
      `and 32 times the Foundry, saw ${at(64) / at(25)}`
    );
    assert.equal(at(6), 0, 'and the resting scout carries none');
  });

  it('stops rising at the cap, so a ping carries 35 times SIG 35 rather than 73', () => {
    const at = (sig: number) => entityHaloEnergy(sig, 1);
    const cap = LAMP_HALO.ENERGY_SIG_CAP;
    assert.equal(at(95), at(cap), 'a ping lights what the cap does');
    assert.ok(Math.abs(at(95) / at(35) - 35.5) < 0.1, `saw ${at(95) / at(35)}`);
    assert.ok(at(cap - 5) < at(cap), 'and below the cap the curve still rises');
    assert.ok(close(at(64) / at(35), haloGain(64)), 'which leaves every resting hull where it was');
  });

  it('grows with the draw scale squared, as its drawn hull does', () => {
    assert.ok(close(entityHaloEnergy(64, 2.5), entityHaloEnergy(64, 1) * 6.25));
  });

  it('shares an entity energy among its sites, so lamp area never changes its total', () => {
    const sites = [
      { area: 2, luminance: 0.5 },
      { area: 6, luminance: 0.5 },
      { area: 4, luminance: 0.25 },
    ];
    const shares = siteShares(sites);
    assert.ok(
      close(
        shares.reduce((a, b) => a + b, 0),
        1
      )
    );
    assert.ok(close(shares[1]! / shares[0]!, 3), 'by area at one luminance');
    assert.ok(close(shares[2]! / shares[0]!, 1), 'and by luminance at one area');
    // A flood bay a hundred times the area carries the same total, split the same way.
    const flood = siteShares(sites.map((s) => ({ ...s, area: s.area * 100 })));
    shares.forEach((share, i) => assert.ok(close(flood[i]!, share)));
    assert.deepEqual(siteShares([{ area: 3, luminance: 0 }]), [0], 'unlit sites share nothing');
  });

  it('keeps the brightest sites under the cap and counts the faintest it drops', () => {
    const sites = Array.from({ length: 10 }, (_, i) => ({ id: i, energy: i }));
    assert.deepEqual(capSites(sites, 20), { kept: sites, dropped: 0 });
    const { kept, dropped } = capSites(sites, 4);
    assert.deepEqual(
      kept.map((s) => s.id),
      [9, 8, 7, 6]
    );
    assert.equal(dropped, 6);
    assert.equal(LAMP_HALO.SITE_CAP, 1024);
  });
});

describe('lamp halo: the spread (art-direction, Lamp halo — SPEC)', () => {
  it('blurs with taps one texel apart out to 2.3σ, weights summing to one', () => {
    for (const [ratio, length] of [
      [1, 5],
      [1.5, 7],
    ] as const) {
      const weights = blurWeights(ratio);
      const sigma = LAMP_HALO.KERNEL_SIGMA_TEXELS * ratio;
      assert.equal(weights.length, length, `ratio ${ratio}`);
      assert.ok(weights.length - 1 >= 2.3 * sigma, 'the last tap reaches 2.3σ');
      assert.ok(weights.length - 2 < 2.3 * sigma, 'and no tap past it');
      // Each tap past the centre is read twice, once either side.
      const total = weights[0]! + 2 * weights.slice(1).reduce((a, b) => a + b, 0);
      assert.ok(close(total, 1), `ratio ${ratio} sums to ${total}`);
      for (let i = 1; i < weights.length; i++) assert.ok(weights[i]! < weights[i - 1]!);
    }
  });

  it('widens each level from the one before, at about 3.4, 7.6 and 15.6 px', () => {
    const sigmas = levelSigmasPx(1);
    [3.4, 7.6, 15.6].forEach((want, k) =>
      assert.ok(Math.abs(sigmas[k]! - want) < 0.1, `level ${k + 1}: ${sigmas[k]}`)
    );
    levelSigmasPx(1.5).forEach((sigma, k) => assert.ok(sigma > sigmas[k]!));
  });

  it('reads the toe exactly where the light crosses it', () => {
    for (const ratio of [1, 1.5]) {
      // The field is linear in light, so one light reads exactly the toe.
      const atToe = LAMP_HALO.TOE / peakField(1, ratio);
      assert.ok(close(peakField(atToe, ratio), LAMP_HALO.TOE));
      assert.ok(peakField(atToe * 0.99, ratio) < LAMP_HALO.TOE);
      assert.ok(peakField(atToe * 1.01, ratio) > LAMP_HALO.TOE);
      assert.equal(peakField(0, ratio), 0);
      const sigmas = levelSigmasPx(ratio);
      const one = LAMP_HALO.LEVEL_WEIGHTS.reduce(
        (sum, w, k) => sum + w / (2 * Math.PI * sigmas[k]! ** 2),
        0
      );
      assert.ok(close(peakField(1, ratio), one), 'each level spreads its share as a Gaussian');
    }
  });
});

describe('lamp sites: the connected lights a lamp mesh holds', () => {
  it('splits a merged mesh into its sites, each with its box and area', () => {
    const left = new PlaneGeometry(1, 1).translate(-3, 0, 0);
    const right = new PlaneGeometry(2, 2).translate(3, 0, 0);
    const geometry = mergeGeometries([left, right])!;
    const sites = [...lampSiteParts(geometry)].sort((a, b) => a.area - b.area);
    assert.equal(sites.length, 2);
    assert.ok(
      close(sites[0]!.area, 1) && close(sites[1]!.area, 4),
      'areas of a 1 m and a 2 m square'
    );
    assert.ok(close(sites[1]!.box.max.x - sites[1]!.box.min.x, 2));
    assert.equal(lampSiteParts(geometry), lampSiteParts(geometry), 'cached per geometry');
    assert.equal(lampSites(geometry).length, 2, 'the spheres agree');
  });
});
