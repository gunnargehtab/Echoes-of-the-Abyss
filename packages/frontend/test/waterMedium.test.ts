/**
 * The water as a medium at the High graphics quality
 * (docs/art-direction.md, "Reading the Water": "the ramp's brightness stands
 * and its one blue is released"; docs/style-neon-noir.md "World light", the
 * water hues; #1801).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ShaderChunk } from 'three';
import { Biome, DEPTH, HIGH_GRAPHICS, MODEL_LIGHTING } from '@echoes/shared';
import type { TerrainPayload } from '../src/net/GameClient.ts';
import { BIOME_COLOR, FACTION_PALETTE, UI, WATER_HUE } from '../src/game/palette.ts';
import { WATER_RAMP_DEPTHS_M, waterLuminanceAt } from '../src/game/water.ts';
import {
  highShownGrey,
  highShownGreyInverse,
  repaintWaterHue,
  WATER_CURVE_EXPOSURE,
  WATER_LIGHT_STOPS,
  WATER_MEDIUM_GLSL,
  waterHueTexture,
  waterLightAt,
} from '../src/game/waterMedium.ts';
import { highDisplayLinear } from './support/highDisplay.ts';

const decode = (byte: number): number => {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const linear = (hex: number): [number, number, number] => [
  decode((hex >> 16) & 0xff),
  decode((hex >> 8) & 0xff),
  decode(hex & 0xff),
];
const luminance = ([r, g, b]: readonly number[]): number => 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
const encode = (l: number): number =>
  Math.round(255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055));
/** Hue in degrees, of a linear colour. */
const hue = ([r, g, b]: readonly number[]): number => {
  const max = Math.max(r!, g!, b!);
  const min = Math.min(r!, g!, b!);
  const d = max - min;
  const h = max === r ? ((g! - b!) / d) % 6 : max === g ? (b! - r!) / d + 2 : (r! - g!) / d + 4;
  return (h * 60 + 360) % 360;
};
const BIOMES = Object.keys(BIOME_COLOR).map(Number) as Biome[];

describe('the water’s hue at High (#1801)', () => {
  it('is each biome fill’s own hue, at one luminance, a fifth of its chroma eased out', () => {
    // style-neon-noir.md "World light", the water hues: "the biome fill's own
    // hue at one luminance, linear 0.05, with a fifth of its chroma eased out".
    for (const biome of BIOMES) {
      const fill = linear(BIOME_COLOR[biome]);
      const y = luminance(fill);
      const want = fill.map((c) => encode(0.05 + ((c * 0.05) / y - 0.05) * 0.8));
      const token = WATER_HUE[biome];
      const got = [(token >> 16) & 0xff, (token >> 8) & 0xff, token & 0xff];
      got.forEach((byte, k) =>
        assert.ok(Math.abs(byte - want[k]!) <= 1, `${Biome[biome]}: ${got} for ${want}`)
      );
      assert.ok(
        Math.abs(luminance(linear(token)) - 0.05) < 0.002,
        `${Biome[biome]}: one luminance`
      );
      // Eased toward its own grey, a colour keeps its hue: the token's is the
      // fill's, to within what eight bits a channel leave of a dark fill.
      const turn = Math.abs(hue(linear(token)) - hue(fill));
      assert.ok(Math.min(turn, 360 - turn) < 12, `${Biome[biome]}: hue turned ${turn.toFixed(1)}°`);
    }
  });

  it('is no faction’s hue and no interface hue (limit 3, rule 5)', () => {
    // Not one of the neons: every water token is far less saturated than any
    // faction primary or the interface accent.
    const saturation = (c: readonly number[]) => (Math.max(...c) - Math.min(...c)) / Math.max(...c);
    const neons = [...Object.values(FACTION_PALETTE).map((f) => f.primary), UI.accent];
    const quietest = Math.min(...neons.map((hex) => saturation(linear(hex))));
    for (const biome of BIOMES) {
      assert.ok(
        saturation(linear(WATER_HUE[biome])) < quietest,
        `${Biome[biome]} is quieter than every neon`
      );
    }
  });

  it('paints one texel a cell with its biome’s token, and repaints after a ground delta', () => {
    const terrain: TerrainPayload = {
      cols: 2,
      rows: 1,
      cellM: 250,
      biomes: [Biome.KelpForest, Biome.CoralRuins],
      floor: [1000, 600],
      ceiling: [0, 0],
    };
    const texture = waterHueTexture(terrain);
    const data = texture.image.data as Uint8Array;
    const texel = (i: number) => (data[i * 4]! << 16) | (data[i * 4 + 1]! << 8) | data[i * 4 + 2]!;
    assert.equal(texture.image.width, 2);
    assert.equal(texel(0), WATER_HUE[Biome.KelpForest]);
    assert.equal(texel(1), WATER_HUE[Biome.CoralRuins]);
    assert.equal(texture.flipY, false, 'row 0 is the north edge, as the skin’s is');
    const version = texture.version;
    terrain.biomes[1] = Biome.ThermalVein;
    repaintWaterHue(texture, terrain);
    assert.equal(texel(1), WATER_HUE[Biome.ThermalVein]);
    assert.ok(texture.version > version, 'and is uploaded again');
  });
});

describe('the water’s brightness at High (#1801)', () => {
  it('stands: through the grade and the curve, each stop shows the Low ramp’s own luminance', () => {
    // art-direction.md "Reading the Water": "At the High graphics quality the
    // ramp's brightness stands". The composite adds the water's light before
    // its grade and the tone curve, so each stop is the level the two bring
    // back to it: held to what the GPU runs (support/highDisplay.ts), on a
    // grey. The hues are the next test's.
    assert.equal(WATER_CURVE_EXPOSURE, HIGH_GRAPHICS.EXPOSURE * MODEL_LIGHTING.EXPOSURE);
    assert.deepEqual(
      WATER_LIGHT_STOPS.map((stop) => stop.depthM),
      [...WATER_RAMP_DEPTHS_M]
    );
    for (const { depthM, light } of WATER_LIGHT_STOPS) {
      const [r, g, b] = highDisplayLinear([light, light, light]);
      const shown = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const ramp = waterLuminanceAt(depthM);
      assert.ok(
        Math.abs(shown - ramp) < 1e-6,
        `${depthM} m shows ${shown.toFixed(5)} for ${ramp.toFixed(5)}`
      );
      assert.ok(Math.abs(waterLightAt(depthM) - light) < 1e-9);
    }
  });

  it('shows each biome’s water within two points of the ramp, whatever its hue', () => {
    // The hue is drawn at unit luminance, and the grade and the curve are not
    // linear, so a hue lands a little off the grey: under two points of 255.
    const encode = (l: number) =>
      l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
    for (const token of Object.values(WATER_HUE)) {
      const hue = linear(token);
      const unit = 0.2126 * hue[0] + 0.7152 * hue[1] + 0.0722 * hue[2];
      for (const { depthM, light } of WATER_LIGHT_STOPS) {
        const [r, g, b] = highDisplayLinear(hue.map((c) => (c / unit) * light));
        const shown = encode(0.2126 * r + 0.7152 * g + 0.0722 * b);
        const ramp = encode(waterLuminanceAt(depthM));
        assert.ok(
          Math.abs(shown - ramp) * 255 < 2,
          `${token.toString(16)} at ${depthM} m: ${(shown * 255).toFixed(1)} for ${(ramp * 255).toFixed(1)}`
        );
      }
    }
  });

  it('still darkens with depth, all the way down', () => {
    let last = Infinity;
    for (let depthM = 0; depthM <= DEPTH.MAX_M; depthM += 50) {
      const light = waterLightAt(depthM);
      assert.ok(light <= last + 1e-12, `${depthM} m is no brighter than the water above it`);
      last = light;
    }
    assert.ok(waterLightAt(0) > waterLightAt(DEPTH.MAX_M) * 2, 'the Lid is the bright end');
  });

  it('inverts the grade and the curve the composite runs on a grey', () => {
    for (const display of [0.001, 0.01, 0.1, 0.5]) {
      assert.ok(Math.abs(highShownGrey(highShownGreyInverse(display)) - display) < 1e-9);
    }
    // The source's own copy of the chain against the one written out for the
    // tests (support/highDisplay.ts): one luminance, at every level.
    for (const light of [0.002, 0.02, 0.18, 1, 4]) {
      const [r, g, b] = highDisplayLinear([light, light, light]);
      assert.ok(Math.abs(highShownGrey(light) - (0.2126 * r + 0.7152 * g + 0.0722 * b)) < 1e-12);
    }
    // three's ACESFilmicToneMapping at exposure 1 scales by 1 / 0.6 first, so
    // with no grade a mid grey of 0.18 lands at 0.2131. The grade's powers
    // take it under that.
    const { POWER } = HIGH_GRAPHICS.GRADE;
    assert.ok(Math.max(...POWER) > 1 && highShownGrey(0.18) < 0.2131, String(highShownGrey(0.18)));
    // Both copies are held to three's own chunk, which is what the GPU runs:
    // the exposure's divisor, the fit and the two matrices, as it writes them.
    const aces = ShaderChunk.tonemapping_pars_fragment.replace(/\s+/g, ' ');
    for (const literal of [
      'color *= toneMappingExposure / 0.6;',
      'vec3 a = v * ( v + 0.0245786 ) - 0.000090537;',
      'vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;',
      'vec3( 0.59719, 0.07600, 0.02840 )',
      'vec3( 0.35458, 0.90834, 0.13383 )',
      'vec3( 0.04823, 0.01566, 0.83777 )',
      'vec3( 1.60475, -0.10208, -0.00327 )',
      'vec3( -0.53108, 1.10813, -0.07276 )',
      'vec3( -0.07367, -0.00605, 1.07602 )',
    ]) {
      assert.ok(aces.includes(literal), `three’s ACES chunk no longer has ${literal}`);
    }
  });

  it('hands the composite those levels and the hue at unit luminance', () => {
    for (const { light } of WATER_LIGHT_STOPS) {
      assert.ok(WATER_MEDIUM_GLSL.includes(light.toFixed(6)));
    }
    assert.ok(WATER_MEDIUM_GLSL.includes('float echoesWaterLight( const in float depthM )'));
    assert.ok(WATER_MEDIUM_GLSL.includes('dot( hue, vec3( 0.2126, 0.7152, 0.0722 ) )'));
  });
});
