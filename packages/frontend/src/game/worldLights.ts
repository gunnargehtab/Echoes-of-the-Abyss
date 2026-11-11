/**
 * The world's own light sources at the High graphics quality
 * (docs/art-direction.md, "Two layers, two laws": "Carry light sources of its
 * own"; #1801).
 *
 * At Low a world light is a point or a seam and lights nothing
 * (docs/style-neon-noir.md "World light", rules 1 and 2). At High those rules
 * are released: the same families pool on the ground and scatter in the water
 * as a visible volume. This module turns what the map already stands (the vent
 * embers, the civic lamps and the props that carry a licensed family) into a
 * list of lights, and that list into the two things that draw them: a plan
 * texture of the light the ground takes (`litGround.ts`), and the instances
 * of the volumes the water shows (`highFrame.ts`).
 *
 * The limits that bind both qualities hold by construction. The list is a
 * pure function of the public ground and the props standing on it, so it is
 * identical for every client and answers no activity, occupancy or proximity
 * (limit 4); nothing of a contact or an enemy is in it (limit 2); and every
 * colour is its family's own token, away from the neons (limit 3).
 *
 * Every number is TUNABLE until the owner accepts a High frame
 * (`HIGH_GRAPHICS.WORLD_LIGHT`, packages/shared/src/constants.ts).
 */

import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  RGBAFormat,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { WORLD_LIGHT, type WorldLightFamily } from './palette.ts';

/** One world-owned source, in the scene's metres, with its family's linear colour. */
export interface WorldLight {
  family: WorldLightFamily;
  x: number;
  y: number;
  z: number;
  /** Linear RGB of the family's token, times the family's power. */
  r: number;
  g: number;
  b: number;
  /** How far its light reaches, metres: the pool's edge and the volume's. */
  radiusM: number;
  /** How high over the ground it stands, metres. */
  heightM: number;
}

/** A place a family's light stands: plan metres, and how many sources it is. */
export interface WorldLightSite {
  family: WorldLightFamily;
  xM: number;
  yM: number;
  /** The prop's scale, or 1: a larger stand is a brighter one. */
  scale?: number;
}

/**
 * The lights of a ground: one a site, standing its family's height over the
 * drawn ground. Sites closer than half a family's radius would draw as one
 * light at twice the cost, so a family's sites are merged on a lattice of
 * that pitch, each cell's light at its sites' centroid with their summed
 * power, capped at `MAX`: deterministic, and the order of the sites does not
 * matter.
 */
export function worldLightsOf(
  sites: readonly WorldLightSite[],
  groundY: (xM: number, yM: number) => number
): WorldLight[] {
  const merged = new Map<string, { family: WorldLightFamily; x: number; z: number; n: number }>();
  for (const site of sites) {
    const spec = HIGH_GRAPHICS.WORLD_LIGHT[site.family];
    const pitch = spec.RADIUS_M / 2;
    const key = `${site.family}:${Math.floor(site.xM / pitch)}:${Math.floor(site.yM / pitch)}`;
    const weight = site.scale ?? 1;
    const cell = merged.get(key);
    if (cell === undefined) {
      merged.set(key, { family: site.family, x: site.xM * weight, z: site.yM * weight, n: weight });
    } else {
      cell.x += site.xM * weight;
      cell.z += site.yM * weight;
      cell.n += weight;
    }
  }
  const color = new Color();
  const lights: WorldLight[] = [];
  for (const key of [...merged.keys()].sort()) {
    const cell = merged.get(key)!;
    const spec = HIGH_GRAPHICS.WORLD_LIGHT[cell.family];
    const x = cell.x / cell.n;
    const z = cell.z / cell.n;
    // Many sources in one cell are one brighter light, short of their sum:
    // a thicket glows more than a stand, not ten times more.
    const power = spec.POWER * Math.sqrt(cell.n);
    color.setHex(WORLD_LIGHT[cell.family]);
    lights.push({
      family: cell.family,
      x,
      y: groundY(x, z) + spec.HEIGHT_M,
      z,
      r: color.r * power,
      g: color.g * power,
      b: color.b * power,
      radiusM: spec.RADIUS_M,
      heightM: spec.HEIGHT_M,
    });
  }
  // Brightest first, so the cap keeps what reads; ties hold the sorted order.
  const energy = (light: WorldLight) => light.r + light.g + light.b;
  return lights
    .map((light, index) => ({ light, index }))
    .sort((a, b) => energy(b.light) - energy(a.light) || a.index - b.index)
    .slice(0, HIGH_GRAPHICS.WORLD_LIGHT.MAX)
    .map(({ light }) => light);
}

/** The compact window a light's reach is cut by: 1 at the source, 0 at its radius. */
export function lightWindow(distanceM: number, radiusM: number): number {
  const t = distanceM / radiusM;
  return t >= 1 ? 0 : (1 - t * t) ** 2;
}

/**
 * The light level ground takes from one source at plan distance `dM`: a
 * point's irradiance on a plane it stands `heightM` over, cut by its window.
 */
export function poolIrradiance(light: WorldLight, dM: number): number {
  const h = light.heightM;
  return (h / Math.pow(dM * dM + h * h, 1.5)) * h * h * lightWindow(dM, light.radiusM);
}

/**
 * Plan pixels a cell of the pool texture: 15.6 m a pixel on a 250 m cell,
 * under the narrowest family's pool. Half-float RGBA, so 2 MB for a
 * 32 × 32-cell map.
 */
export const POOL_PX_PER_CELL = 16;

/**
 * The light the ground takes from every source, as a plan texture: linear
 * half-float RGB, row 0 the north edge as the skin's is, filtered. Static,
 * as the sources are: a ground delta rebuilds it with the dressing.
 */
export function poolTexture(terrain: TerrainPayload, lights: readonly WorldLight[]): DataTexture {
  const width = terrain.cols * POOL_PX_PER_CELL;
  const height = terrain.rows * POOL_PX_PER_CELL;
  const mPerPx = terrain.cellM / POOL_PX_PER_CELL;
  const sum = new Float32Array(width * height * 3);
  for (const light of lights) {
    const reach = Math.ceil(light.radiusM / mPerPx);
    const cx = Math.floor(light.x / mPerPx);
    const cy = Math.floor(light.z / mPerPx);
    for (let py = Math.max(0, cy - reach); py <= Math.min(height - 1, cy + reach); py++) {
      for (let px = Math.max(0, cx - reach); px <= Math.min(width - 1, cx + reach); px++) {
        const d = Math.hypot((px + 0.5) * mPerPx - light.x, (py + 0.5) * mPerPx - light.z);
        const e = poolIrradiance(light, d);
        if (e <= 0) continue;
        const i = (py * width + px) * 3;
        sum[i] += light.r * e;
        sum[i + 1] += light.g * e;
        sum[i + 2] += light.b * e;
      }
    }
  }
  const data = new Uint16Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = DataUtils.toHalfFloat(sum[i * 3]!);
    data[i * 4 + 1] = DataUtils.toHalfFloat(sum[i * 3 + 1]!);
    data[i * 4 + 2] = DataUtils.toHalfFloat(sum[i * 3 + 2]!);
    data[i * 4 + 3] = DataUtils.toHalfFloat(1);
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, HalfFloatType);
  texture.name = 'world-light-pools';
  texture.flipY = false;
  texture.colorSpace = LinearSRGBColorSpace;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Floats a light is, as the volume pass's instances take it. */
export const VOLUME_STRIDE = 8;

/** The lights as instance data: centre and radius, then colour and a spare. */
export function volumeInstances(lights: readonly WorldLight[]): Float32Array {
  const data = new Float32Array(lights.length * VOLUME_STRIDE);
  lights.forEach((light, i) => {
    data.set(
      [light.x, light.y, light.z, light.radiusM, light.r, light.g, light.b, 0],
      i * VOLUME_STRIDE
    );
  });
  return data;
}
