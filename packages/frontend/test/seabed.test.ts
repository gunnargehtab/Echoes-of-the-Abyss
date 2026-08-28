/**
 * The seabed detail field (docs/art-direction.md, "Reading the Sea Floor"):
 * texture, not information. These are the promises that let a noise field
 * anywhere near a hidden-information game — it changes nothing the simulation
 * reads, it is the same on every client, and it stays quieter than the
 * authored terrain it decorates. The canvas bake itself needs a DOM and is
 * reviewed by screenshot (the graphics-standards checklist); what node:test
 * can hold is the field the bake is a picture of.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Biome } from '@echoes/shared';
import {
  BIOME_RELIEF,
  detailM,
  emberFlicker,
  mottleFactor,
  seabedSeed,
  SEABED_PX_PER_CELL,
  VENT_EMBER_CAP,
  ventEmbers,
} from '../src/game/seabed.ts';
import { RELIEF_REFERENCE_M } from '../src/game/palette.ts';

const SEED = seabedSeed({ cols: 32, rows: 32, floor: new Array(32 * 32).fill(2600) });

describe('seabed detail field', () => {
  it('is deterministic: same ground, same seed, same field', () => {
    const again = seabedSeed({ cols: 32, rows: 32, floor: new Array(32 * 32).fill(2600) });
    assert.equal(SEED, again);
    for (const [x, y] of [
      [0, 0],
      [1234.5, 987.25],
      [7999, 43],
    ] as const) {
      assert.equal(detailM(x, y, SEED, 60, 0.3, 0), detailM(x, y, SEED, 60, 0.3, 0));
    }
    // A different floor is different ground and must reseed — a mid-match
    // collapse genuinely changes what the bake should show.
    const collapsed = seabedSeed({ cols: 32, rows: 32, floor: new Array(32 * 32).fill(2599) });
    assert.notEqual(SEED, collapsed);
  });

  it('never exceeds its amplitude, and zero amplitude is exactly flat', () => {
    for (const { amplitudeM, roughness, blockiness } of Object.values(BIOME_RELIEF)) {
      for (let i = 0; i < 2000; i++) {
        const x = (i * 137.51) % 8000;
        const y = (i * 291.73) % 8000;
        const d = detailM(x, y, SEED, amplitudeM, roughness, blockiness);
        assert.ok(Math.abs(d) <= amplitudeM, `|${d}| > ${amplitudeM}`);
        // == on purpose: 0 * a negative sample is -0, which is still flat.
        assert.ok(detailM(x, y, SEED, 0, roughness, blockiness) === 0);
      }
    }
  });

  it('stays quieter than an authored step — the contrast guard', () => {
    // The field may never out-shade real terrain. reliefShade's reference is
    // RELIEF_REFERENCE_M of drop across one cell for a full-strength face, so
    // the guard is: the detail field's slope, sampled where the bake samples
    // it, must stay comfortably below that in the typical case and below the
    // reference even in the worst sampled case. If a future amplitude or
    // wavelength tune breaks this, the seabed has started shouting.
    const stepM = 250 / SEABED_PX_PER_CELL; // one bake pixel, in metres
    for (const [biome, { amplitudeM, roughness, blockiness }] of Object.entries(BIOME_RELIEF)) {
      const perCell: number[] = [];
      for (let i = 0; i < 4000; i++) {
        const x = (i * 53.17) % 8000;
        const y = (i * 197.41) % 8000;
        const here = detailM(x, y, SEED, amplitudeM, roughness, blockiness);
        const right = detailM(x + stepM, y, SEED, amplitudeM, roughness, blockiness);
        const down = detailM(x, y + stepM, SEED, amplitudeM, roughness, blockiness);
        // Slope per bake pixel, scaled to metres per cell — the exact quantity
        // the bake hands reliefShade.
        perCell.push((Math.hypot(right - here, down - here) / stepM) * (250 / 1));
      }
      perCell.sort((a, b) => a - b);
      const median = perCell[Math.floor(perCell.length / 2)]!;
      const p95 = perCell[Math.floor(perCell.length * 0.95)]!;
      assert.ok(
        median < RELIEF_REFERENCE_M * 0.35,
        `${biome}: median detail slope ${median.toFixed(0)} m/cell is not quiet`
      );
      assert.ok(
        p95 < RELIEF_REFERENCE_M,
        `${biome}: p95 detail slope ${p95.toFixed(0)} m/cell out-shades an authored step`
      );
    }
  });

  it('gives every biome its own amplitude — texture is identity', () => {
    // The table is the argument: a vent field is rougher than the trench
    // floor. If someone flattens it to one number, the biomes stop reading.
    const amps = new Set(Object.values(BIOME_RELIEF).map((b) => b.amplitudeM));
    assert.ok(amps.size >= 3, 'per-biome amplitudes collapsed');
    assert.ok(
      BIOME_RELIEF[Biome.ThermalVein].amplitudeM > BIOME_RELIEF[Biome.AbyssalTrench].amplitudeM,
      'vent ground should be rougher than the pressure-eroded trench'
    );
    assert.equal(BIOME_RELIEF[Biome.CoralRuins].blockiness, 1, 'ruins lost their right angles');
  });
});

describe('albedo mottle', () => {
  it('is a darken-only gain bounded by its biome strength, and deterministic', () => {
    for (const { mottle } of Object.values(BIOME_RELIEF)) {
      for (let i = 0; i < 2000; i++) {
        const x = (i * 173.31) % 8000;
        const y = (i * 89.17) % 8000;
        const f = mottleFactor(x, y, SEED, mottle);
        assert.ok(f <= 1 && f >= 1 - mottle, `${f} outside [${1 - mottle}, 1]`);
        assert.equal(f, mottleFactor(x, y, SEED, mottle));
      }
    }
    // Zero strength is exactly the identity — most of a map must pass through
    // untouched rather than uniformly dimmed.
    assert.equal(mottleFactor(4321, 1234, SEED, 0), 1);
  });

  it('is a different field from the relief, not the same noise twice', () => {
    // If the mottle correlated with the heightfield, dark mottle would pile
    // onto relief shadow and the two quiet passes would sum into a loud one.
    let sameSign = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      const x = (i * 137.51) % 8000;
      const y = (i * 291.73) % 8000;
      const d = detailM(x, y, SEED, 60, 0.3, 0);
      const m = mottleFactor(x, y, SEED, 0.1) - 0.95; // recentre around 0
      if (d > 0 === m > 0) sameSign++;
    }
    const agreement = sameSign / n;
    assert.ok(Math.abs(agreement - 0.5) < 0.08, `fields agree ${agreement} — correlated`);
  });
});

describe('vent embers', () => {
  const terrain = {
    cols: 8,
    rows: 8,
    cellM: 250,
    // A thermal band across the middle, everything else open water.
    biomes: Array.from({ length: 64 }, (_, i) =>
      Math.floor(i / 8) >= 3 && Math.floor(i / 8) <= 4 ? Biome.ThermalVein : Biome.OpenWater
    ),
    floor: new Array(64).fill(1400),
    ceiling: new Array(64).fill(0),
  };

  it('is deterministic and stays inside thermal cells', () => {
    const a = ventEmbers(terrain, SEED);
    const b = ventEmbers(terrain, SEED);
    assert.deepEqual(a, b);
    assert.ok(a.length > 0, 'a thermal band produced no embers at all');
    assert.ok(a.length <= VENT_EMBER_CAP);
    for (const ember of a) {
      const col = Math.floor(ember.xM / 250);
      const row = Math.floor(ember.yM / 250);
      assert.equal(terrain.biomes[row * 8 + col], Biome.ThermalVein, 'ember off the vent field');
      // The whole glow stays inside its cell, so no light leaks onto a
      // neighbouring biome's ground.
      assert.ok(
        ember.xM - ember.radiusM >= col * 250 && ember.xM + ember.radiusM <= (col + 1) * 250
      );
      assert.ok(
        ember.yM - ember.radiusM >= row * 250 && ember.yM + ember.radiusM <= (row + 1) * 250
      );
      assert.ok(ember.radiusM >= 25 && ember.radiusM <= 60);
    }
  });

  it('leaves rock dark, whatever biome label a collapse left on it', () => {
    const sealed = {
      ...terrain,
      // ceiling below floor is how rock is spelled (see isRock in the renderer).
      ceiling: terrain.biomes.map((b) => (b === Biome.ThermalVein ? 2000 : 0)),
    };
    assert.equal(ventEmbers(sealed, SEED).length, 0);
  });

  it('flickers inside [0, 1], holds within a bucket, and moves across them', () => {
    let moved = 0;
    for (let i = 0; i < 50; i++) {
      for (let bucket = 0; bucket < 40; bucket++) {
        const v = emberFlicker(i, bucket, 0.37);
        assert.ok(v >= 0 && v <= 1);
        assert.equal(v, emberFlicker(i, bucket, 0.37));
        if (bucket > 0 && v !== emberFlicker(i, bucket - 1, 0.37)) moved++;
      }
    }
    assert.ok(moved > 0, 'the flicker never changes — a lamp, not an ember');
  });
});
