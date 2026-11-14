/**
 * The water as a medium at the High graphics quality
 * (docs/art-direction.md, "Two layers, two laws" and "Reading the Water";
 * #1801).
 *
 * At Low the water is one blue that changes brightness (water.ts). At High
 * "the ramp's brightness stands and its one blue is released": the water
 * wears the hue of the biome under it, and light scatters in it. Three things
 * here, all read by the High frame's composite (highFrame.ts):
 *
 * 1. **The hue**, a plan texture of each cell's water token
 *    (docs/style-neon-noir.md "World light", the water hues). Hue is biome and
 *    biome is propagation factor, so water in its biome's hue tells the player
 *    what the ground under it does.
 * 2. **The brightness**, the Low ramp's own, carried through the grade and
 *    the tone curve: the composite adds the water's light before both, so
 *    each stop is the scene-referred level the two bring back to the stop's
 *    luminance. Depth still darkens, by the table it always did.
 * 3. **The scattering**, by distance: a pixel takes the water's light by how
 *    much of its own the swim cost it, which the world pass leaves in alpha.
 *
 * Texture, not information, as water.ts holds: the simulation reads none of
 * it, and the hue is the biome's and says nothing the ground does not.
 */

import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three';
import { Biome, HIGH_GRAPHICS, MODEL_LIGHTING } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { WATER_HUE } from './palette.ts';
import { WATER_RAMP_DEPTHS_M, waterLuminanceAt } from './water.ts';

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/** The exposure the composite's curve runs at: the chain's, times the renderer's. */
export const WATER_CURVE_EXPOSURE = HIGH_GRAPHICS.EXPOSURE * MODEL_LIGHTING.EXPOSURE;

/**
 * What the composite shows of scene-referred light, as the linear colour the
 * canvas encodes (highFrame.ts): its grade, a channel at a time and then the
 * saturation, then three's `ACESFilmicToneMapping` whole: the exposure over
 * 0.6, both matrices and the fit.
 */
export function highShown(light: readonly number[]): [number, number, number] {
  const { SLOPE, OFFSET, POWER, SATURATION } = HIGH_GRAPHICS.GRADE;
  const cdl = light.map((c, k) => Math.pow(Math.max(0, c * SLOPE[k]! + OFFSET[k]!), POWER[k]!));
  const luma = 0.2126 * cdl[0]! + 0.7152 * cdl[1]! + 0.0722 * cdl[2]!;
  const scale = WATER_CURVE_EXPOSURE / 0.6;
  const [r, g, b] = cdl.map((c) => Math.max(0, luma + (c - luma) * SATURATION) * scale);
  const fit = (v: number) =>
    (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  // ACESInputMat, the RRT and ODT fit, ACESOutputMat, as three's chunk has them.
  const x = fit(0.59719 * r! + 0.35458 * g! + 0.04823 * b!);
  const y = fit(0.076 * r! + 0.90834 * g! + 0.01566 * b!);
  const z = fit(0.0284 * r! + 0.13383 * g! + 0.83777 * b!);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [
    clamp(1.60475 * x - 0.53108 * y - 0.07367 * z),
    clamp(-0.10208 * x + 1.10813 * y - 0.00605 * z),
    clamp(-0.00327 * x - 0.07276 * y + 1.07602 * z),
  ];
}

/**
 * The luminance the composite shows of a scene-referred grey. The grade is
 * in it because its powers take a tenth of the ramp's brightness on the way
 * to the curve: a level solved against the curve alone showed that tenth
 * dark (#1816).
 */
export function highShownGrey(linear: number): number {
  const [r, g, b] = highShown([linear, linear, linear]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The scene-referred grey the grade and the curve bring back to `display`, by bisection. */
export function highShownGreyInverse(display: number): number {
  let low = 0;
  let high = 64;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (highShownGrey(mid) < display) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * The water's light at each of the Low ramp's stops: the level that, through
 * the composite's grade and curve, shows the stop's own luminance. So the
 * ramp's brightness stands on the screen, and the stops stay water.ts's to
 * tune.
 */
export const WATER_LIGHT_STOPS: readonly { depthM: number; light: number }[] =
  WATER_RAMP_DEPTHS_M.map((depthM) => ({
    depthM,
    light: highShownGreyInverse(waterLuminanceAt(depthM)),
  }));

/** The same chained smoothstep the ramp runs (water.ts `waterColorAt`), on those levels. */
export function waterLightAt(depthM: number): number {
  const last = WATER_LIGHT_STOPS[WATER_LIGHT_STOPS.length - 1]!;
  const d = Math.min(last.depthM, Math.max(0, depthM));
  let light = WATER_LIGHT_STOPS[0]!.light;
  for (let i = 1; i < WATER_LIGHT_STOPS.length; i++) {
    const a = WATER_LIGHT_STOPS[i - 1]!;
    const b = WATER_LIGHT_STOPS[i]!;
    const t = Math.min(1, Math.max(0, (d - a.depthM) / (b.depthM - a.depthM)));
    light += (b.light - light) * t * t * (3 - 2 * t);
  }
  return light;
}

/**
 * The medium as the composite reads it: the water's light at a depth, and
 * the hue of the biome under a plan position, at unit luminance.
 */
export const WATER_MEDIUM_GLSL = (() => {
  const last = WATER_LIGHT_STOPS[WATER_LIGHT_STOPS.length - 1]!;
  const lines = [
    'uniform sampler2D tWaterHue;',
    'uniform vec2 uWaterMapM;',
    'float echoesWaterLight( const in float depthM ) {',
    `  float d = clamp( depthM, 0.0, ${glsl(last.depthM)} );`,
    `  float light = ${glsl(WATER_LIGHT_STOPS[0]!.light)};`,
  ];
  for (let i = 1; i < WATER_LIGHT_STOPS.length; i++) {
    const a = WATER_LIGHT_STOPS[i - 1]!;
    const b = WATER_LIGHT_STOPS[i]!;
    lines.push(
      `  light = mix( light, ${glsl(b.light)}, smoothstep( ${glsl(a.depthM)}, ${glsl(b.depthM)}, d ) );`
    );
  }
  lines.push(
    '  return light;',
    '}',
    // The token's chromaticity alone: its brightness is the ramp's to say.
    'vec3 echoesWaterHue( const in vec2 xz ) {',
    '  vec3 hue = texture2D( tWaterHue, clamp( xz / uWaterMapM, 0.0, 1.0 ) ).rgb;',
    '  return hue / max( 1e-4, dot( hue, vec3( 0.2126, 0.7152, 0.0722 ) ) );',
    '}'
  );
  return lines.join('\n');
})();

/** Write each cell's water token into `data`, RGBA, row 0 the north edge. */
function paintWaterHue(data: Uint8Array, terrain: TerrainPayload): void {
  for (let i = 0; i < terrain.cols * terrain.rows; i++) {
    const token = WATER_HUE[terrain.biomes[i] as Biome] ?? WATER_HUE[Biome.OpenWater];
    data[i * 4] = (token >> 16) & 0xff;
    data[i * 4 + 1] = (token >> 8) & 0xff;
    data[i * 4 + 2] = token & 0xff;
    data[i * 4 + 3] = 255;
  }
}

/**
 * The plan texture of the water's hue: one texel a cell, its biome's token,
 * filtered, so the hue eases across a biome's edge over a cell. Rock carries
 * the biome the map gave it, which is the water's beside it.
 */
export function waterHueTexture(terrain: TerrainPayload): DataTexture {
  const data = new Uint8Array(terrain.cols * terrain.rows * 4);
  paintWaterHue(data, terrain);
  const texture = new DataTexture(data, terrain.cols, terrain.rows, RGBAFormat, UnsignedByteType);
  texture.name = 'water-hue';
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** A ground delta can change a cell's biome: repaint the texture it was made for. */
export function repaintWaterHue(texture: DataTexture, terrain: TerrainPayload): void {
  paintWaterHue(texture.image.data as Uint8Array, terrain);
  texture.needsUpdate = true;
}
