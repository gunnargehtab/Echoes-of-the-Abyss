/**
 * The world's own light sources at the High graphics quality
 * (docs/art-direction.md, "Two layers, two laws": what the world layer may do
 * at High, and limits 2 to 4; #1801).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Color, DataUtils } from 'three';
import { Biome, HIGH_GRAPHICS } from '@echoes/shared';
import type { TerrainPayload } from '../src/net/GameClient.ts';
import { PALETTES, setActivePalette, WORLD_LIGHT } from '../src/game/palette.ts';
import {
  lightWindow,
  POOL_PX_PER_CELL,
  poolIrradiance,
  poolTexture,
  VOLUME_STRIDE,
  volumeInstances,
  worldLightsOf,
  type WorldLightSite,
} from '../src/game/worldLights.ts';

const flat = () => -100;

describe('the world’s own lights at High (#1801)', () => {
  it('wears each family’s own token: the table’s five in the standard palette', () => {
    // style-neon-noir.md "World light": the five tokens, one a family.
    assert.deepEqual(WORLD_LIGHT, {
      vent: 0xe06a2b,
      flora: 0x2e8c74,
      crystal: 0x5b4a8c,
      ore: 0x7a5634,
      civic: 0xb8875a,
    });
  });

  it('stands its lights in the active palette’s tokens, at the same power (#1854)', () => {
    // style-neon-noir.md "Rule 5 in the colour-vision palettes": what pools
    // on the ground and scatters in the water is the palette's own token.
    const sites: WorldLightSite[] = [
      { family: 'vent', xM: 100, yM: 100 },
      { family: 'flora', xM: 900, yM: 100 },
      { family: 'crystal', xM: 100, yM: 900 },
      { family: 'ore', xM: 900, yM: 900 },
    ];
    const standard = worldLightsOf(sites, flat);
    try {
      setActivePalette('deuteranopia');
      const worn = worldLightsOf(sites, flat);
      assert.equal(worn.length, standard.length);
      for (const light of worn) {
        const spec = HIGH_GRAPHICS.WORLD_LIGHT[light.family];
        const token = new Color(PALETTES.deuteranopia.worldLight[light.family]);
        assert.ok(Math.abs(light.r - token.r * spec.POWER) < 1e-9, `${light.family} red`);
        assert.ok(Math.abs(light.b - token.b * spec.POWER) < 1e-9, `${light.family} blue`);
        const before = standard.find((other) => other.family === light.family)!;
        assert.notDeepEqual([light.r, light.g, light.b], [before.r, before.g, before.b]);
        // Only the hue: the palette's token keeps its luminance, so the light's does.
        const y = (l: { r: number; g: number; b: number }) =>
          0.2126 * l.r + 0.7152 * l.g + 0.0722 * l.b;
        assert.ok(Math.abs(y(light) / y(before) - 1) < 0.02, `${light.family} luminance`);
      }
    } finally {
      setActivePalette('standard');
    }
  });

  it('stands one light a site, its family’s height over the ground, in its token', () => {
    const [light] = worldLightsOf([{ family: 'flora', xM: 400, yM: 900 }], flat);
    assert.ok(light);
    const spec = HIGH_GRAPHICS.WORLD_LIGHT.flora;
    assert.deepEqual([light.x, light.y, light.z], [400, -100 + spec.HEIGHT_M, 900]);
    assert.equal(light.radiusM, spec.RADIUS_M);
    const token = new Color(WORLD_LIGHT.flora).multiplyScalar(spec.POWER);
    assert.ok(Math.abs(light.r - token.r) < 1e-9 && Math.abs(light.g - token.g) < 1e-9);
  });

  it('is a pure function of the sites: the same lights in any order, every time (limit 4)', () => {
    const sites: WorldLightSite[] = [];
    for (let i = 0; i < 40; i++) {
      sites.push({
        family: (['flora', 'vent', 'civic'] as const)[i % 3]!,
        xM: (i * 137) % 2000,
        yM: (i * 251) % 2000,
        scale: 0.8 + (i % 5) * 0.1,
      });
    }
    const forward = worldLightsOf(sites, flat);
    assert.deepEqual(worldLightsOf([...sites].reverse(), flat), forward);
    assert.deepEqual(worldLightsOf(sites, flat), forward);
  });

  it('merges a thicket into one brighter light, short of the sum, and caps the count', () => {
    const spec = HIGH_GRAPHICS.WORLD_LIGHT.flora;
    const near = (n: number): WorldLightSite[] =>
      Array.from({ length: n }, (_, i) => ({ family: 'flora', xM: 10 + i, yM: 10 }));
    const [one] = worldLightsOf(near(1), flat);
    const four = worldLightsOf(near(4), flat);
    assert.equal(four.length, 1, 'four stands inside half a radius are one light');
    assert.ok(Math.abs(four[0]!.g / one!.g - 2) < 1e-9, 'twice as bright, not four times');
    assert.ok(Math.abs(four[0]!.x - 11.5) < 1e-9, 'at their centroid');
    // Far more sites than the cap, a radius apart: the cap holds.
    const spread: WorldLightSite[] = Array.from({ length: 400 }, (_, i) => ({
      family: 'flora',
      xM: (i % 20) * spec.RADIUS_M,
      yM: Math.floor(i / 20) * spec.RADIUS_M,
    }));
    assert.equal(worldLightsOf(spread, flat).length, HIGH_GRAPHICS.WORLD_LIGHT.MAX);
  });

  it('pools on the ground: its power directly under it, nothing at its radius', () => {
    const [light] = worldLightsOf([{ family: 'vent', xM: 0, yM: 0 }], flat);
    assert.equal(poolIrradiance(light!, 0), 1, 'the family’s POWER is the level under the source');
    assert.equal(poolIrradiance(light!, light!.radiusM), 0);
    assert.equal(lightWindow(0, 100), 1);
    assert.equal(lightWindow(150, 100), 0);
    let last = Infinity;
    for (let d = 0; d <= light!.radiusM; d += 5) {
      const e = poolIrradiance(light!, d);
      assert.ok(e <= last, 'and falls the whole way out');
      last = e;
    }
  });

  it('bakes the pools to a plan texture, lit under a source and dark away from it', () => {
    const terrain: TerrainPayload = {
      cols: 4,
      rows: 4,
      cellM: 250,
      biomes: new Array(16).fill(Biome.KelpForest),
      floor: new Array(16).fill(400),
      ceiling: new Array(16).fill(0),
    };
    const lights = worldLightsOf([{ family: 'flora', xM: 500, yM: 500 }], flat);
    const texture = poolTexture(terrain, lights);
    assert.equal(texture.image.width, 4 * POOL_PX_PER_CELL);
    assert.equal(texture.flipY, false);
    const data = texture.image.data as Uint16Array;
    const green = (xM: number, yM: number) => {
      const mPerPx = 250 / POOL_PX_PER_CELL;
      const i = Math.floor(yM / mPerPx) * texture.image.width + Math.floor(xM / mPerPx);
      return DataUtils.fromHalfFloat(data[i * 4 + 1]!);
    };
    assert.ok(green(505, 505) > 0.5 * lights[0]!.g, 'lit under the source');
    assert.equal(green(900, 900), 0, 'dark past its radius');
    assert.ok(green(505, 505) > green(560, 505), 'and falling with distance');
    // No source, no light: the texture is black, not absent.
    const none = poolTexture(terrain, []).image.data as Uint16Array;
    assert.ok(none.every((v, i) => i % 4 === 3 || v === 0));
  });

  it('lays a light out for the volume pass: centre and reach, then colour', () => {
    const lights = worldLightsOf([{ family: 'civic', xM: 30, yM: 40 }], flat);
    const data = volumeInstances(lights);
    assert.equal(data.length, VOLUME_STRIDE);
    const l = lights[0]!;
    assert.deepEqual(
      [...data].map((v) => Number(v.toFixed(4))),
      [l.x, l.y, l.z, l.radiusM, l.r, l.g, l.b, 0].map((v) => Number(Math.fround(v).toFixed(4)))
    );
  });
});
