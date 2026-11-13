/**
 * What the High frame's composite shows of scene-referred light
 * (highFrame.ts): its grade, three's ACESFilmicToneMapping (the exposure over
 * 0.6, two matrices and a fit), then sRGB. Written out again here rather
 * than imported, so a test of a level holds the source to what the GPU runs
 * and not to itself.
 */

import { HIGH_GRAPHICS, MODEL_LIGHTING } from '@echoes/shared';

/** The linear display colour: what the canvas takes before its sRGB encode. */
export function highDisplayLinear(light: readonly number[]): [number, number, number] {
  const { SLOPE, OFFSET, POWER, SATURATION } = HIGH_GRAPHICS.GRADE;
  const cdl = light.map((c, k) => Math.pow(Math.max(0, c * SLOPE[k]! + OFFSET[k]!), POWER[k]!));
  const luma = 0.2126 * cdl[0]! + 0.7152 * cdl[1]! + 0.0722 * cdl[2]!;
  const k = (HIGH_GRAPHICS.EXPOSURE * MODEL_LIGHTING.EXPOSURE) / 0.6;
  const [x, y, z] = cdl.map((c) => Math.max(0, luma + (c - luma) * SATURATION) * k);
  const fit = (v: number) =>
    (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  const a = [
    fit(0.59719 * x! + 0.35458 * y! + 0.04823 * z!),
    fit(0.076 * x! + 0.90834 * y! + 0.01566 * z!),
    fit(0.0284 * x! + 0.13383 * y! + 0.83777 * z!),
  ];
  const out = [
    1.60475 * a[0]! - 0.53108 * a[1]! - 0.07367 * a[2]!,
    -0.10208 * a[0]! + 1.10813 * a[1]! - 0.00605 * a[2]!,
    -0.00327 * a[0]! - 0.07276 * a[1]! + 1.07602 * a[2]!,
  ].map((c) => Math.min(1, Math.max(0, c)));
  return [out[0]!, out[1]!, out[2]!];
}

/** The same, encoded: the packed sRGB bytes the canvas holds. */
export function highDisplay(light: readonly number[]): number {
  const srgb = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
  const [r, g, b] = highDisplayLinear(light).map((c) => Math.round(255 * srgb(c)));
  return (r! << 16) | (g! << 8) | b!;
}
