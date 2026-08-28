/**
 * Bake the seabed to a single texture: the authored floor grid, upsampled and
 * given within-region shape, lit per pixel by the same model as everything
 * else.
 *
 * The vector terrain pass could only shade whole 250 m cells, so a region
 * authored as one flat rectangle rendered as one flat rectangle — relief
 * landed only at the seams. This bake gives the light something to find
 * *inside* a region: a deterministic detail heightfield layered under the
 * authored floor, with an amplitude that belongs to the biome, because ground
 * texture is a second reading of the same identity the biome's hue and PF
 * already carry (docs/art-direction.md "Environmental Shapes": jagged vent
 * ground, smooth pressure-eroded trench stone, geometric coral ruins).
 *
 * Hard boundaries, in order of importance:
 *
 * - **Render-only.** Nothing in the simulation may ever read this field. The
 *   authored floor stays the floor the server plays on; this is what the
 *   ground *looks* like, never what it *is*. Maps stay hand-authored data
 *   literals precisely so the sim is deterministic by construction — a visual
 *   noise field must not become the exception.
 * - **Deterministic.** Seeded from the terrain payload itself, so every
 *   client, every reload and every screenshot of the same ground bakes the
 *   same pixels.
 * - **Darkens only**, through the same `depthShade` → `reliefShade` pair the
 *   cell pass used: the authored biome fill remains the ceiling of terrain's
 *   brightness, and the seabed stays quieter than any contact.
 * - **Off the per-frame path.** Baked on terrain load and ground deltas, the
 *   same rebuild cadence `drawTerrain` already had.
 */

import { Biome } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { BIOME_COLOR, depthShade, reliefShade, UI } from './palette.ts';

/**
 * Bake density. 32 px across a 250 m cell is 7.8 m/px — enough for a ridge to
 * have a face at combat zoom while a full 32×32-cell map stays one 1024²
 * texture (4 MB RGBA, cheaper to draw than the thousand Graphics rects it
 * replaces).
 */
export const SEABED_PX_PER_CELL = 32;

/**
 * TUNABLE, per biome: how many metres of shape the detail field may add or
 * remove, and how much of it comes from the fast octave. This is where
 * "Environmental Shapes" becomes pixels — vent fields are broken ground, the
 * trench floor is pressure-eroded smooth, ruins step in right angles. Every
 * amplitude is small against the authored depth spans (hundreds to thousands
 * of metres), which is what keeps the noise a texture on the map's luminance
 * reading rather than a second, fake terrain.
 */
interface BiomeRelief {
  /** Peak-to-mean detail amplitude, metres. */
  amplitudeM: number;
  /** 0..1 weight of the high-frequency octave — "how broken". */
  roughness: number;
  /** 0..1: sample the field on a snapped grid — "how geometric". */
  blockiness: number;
}

export const BIOME_RELIEF: Record<Biome, BiomeRelief> = {
  [Biome.OpenWater]: { amplitudeM: 40, roughness: 0.25, blockiness: 0 },
  [Biome.ThermalVein]: { amplitudeM: 95, roughness: 0.5, blockiness: 0 },
  [Biome.KelpForest]: { amplitudeM: 65, roughness: 0.3, blockiness: 0 },
  [Biome.AbyssalTrench]: { amplitudeM: 40, roughness: 0.15, blockiness: 0 },
  [Biome.ResonanceField]: { amplitudeM: 60, roughness: 0.4, blockiness: 0 },
  [Biome.CoralRuins]: { amplitudeM: 60, roughness: 0.25, blockiness: 1 },
};

/** Detail wavelengths, metres. Fixed globally so the *field* is continuous and
 * only its per-biome amplitude changes across a region boundary — varying the
 * frequency instead would print the authoring rectangles back onto the noise. */
const WAVELENGTH_M = 420;
const FAST_WAVELENGTH_M = 140;
/** Coral's sampling grid: ruin-block sized, well above one bake pixel. */
const BLOCK_M = 90;

/**
 * FNV-1a over the payload's dimensions and floor. The seed is the ground
 * itself: same terrain, same bake, on every client — and a mid-match ground
 * delta reseeds only because the ground genuinely changed.
 */
export function seabedSeed(terrain: {
  cols: number;
  rows: number;
  floor: readonly number[];
}): number {
  let h = 0x811c9dc5;
  const mix = (v: number) => {
    h ^= v & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 8) & 0xff;
    h = Math.imul(h, 0x01000193);
  };
  mix(terrain.cols);
  mix(terrain.rows);
  for (const f of terrain.floor) mix(f | 0);
  return h >>> 0;
}

/** Integer-lattice hash → [-1, 1]. Cheap, stateless, and identical everywhere. */
function latticeNoise(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x7fffffff - 1;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Quantise a coordinate to the ruin grid, with the step ramped over ~30% of a
 * block instead of arriving inside one bake pixel. A hard snap put the whole
 * step across a single texel, which saturated `reliefShade`'s darkening cap
 * and drew every block edge as a max-dark outline — a wireframe, not ground.
 * The ramp keeps the geometry readable as terraced masonry while its faces
 * shade like every other slope.
 */
function softSnap(vM: number): number {
  const u = vM / BLOCK_M;
  const iu = Math.floor(u);
  const f = u - iu;
  const edge = Math.min(1, Math.max(0, (f - 0.35) / 0.3));
  return (iu + smooth(edge)) * BLOCK_M;
}

/** Value noise in [-1, 1] at a world position, one wavelength. */
function valueNoise(xM: number, yM: number, wavelengthM: number, seed: number): number {
  const x = xM / wavelengthM;
  const y = yM / wavelengthM;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = latticeNoise(ix, iy, seed);
  const b = latticeNoise(ix + 1, iy, seed);
  const c = latticeNoise(ix, iy + 1, seed);
  const d = latticeNoise(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c + (d - c) * fx - a - (b - a) * fx) * fy;
}

/**
 * The detail field at a world position, in metres of extra depth, for a given
 * roughness/blockiness blend. Exported for the contrast tests: this is the
 * whole visual lie, and it has to stay small enough to be a texture.
 */
export function detailM(
  xM: number,
  yM: number,
  seed: number,
  amplitudeM: number,
  roughness: number,
  blockiness: number
): number {
  const px = blockiness > 0 ? xM + (softSnap(xM) - xM) * blockiness : xM;
  const py = blockiness > 0 ? yM + (softSnap(yM) - yM) * blockiness : yM;
  const slow = valueNoise(px, py, WAVELENGTH_M, seed);
  const fast = valueNoise(px, py, FAST_WAVELENGTH_M, seed ^ 0x9e3779b9);
  return amplitudeM * (slow * (1 - roughness) + fast * roughness);
}

/**
 * Bake the seabed into a canvas covering the whole map, `SEABED_PX_PER_CELL`
 * pixels per terrain cell.
 *
 * Hue stays the *nearest* cell's biome — hue belongs to the biome because the
 * biome is what sound is priced by, and a region boundary is a real acoustic
 * boundary that deserves a crisp line. Only the heightfield is smooth: the
 * authored floor bilinearly upsampled (rock and off-map neighbours clamped,
 * the same exclusion `floorDrop` makes and for the same reason), plus the
 * biome-weighted detail field. Rock cells are painted flat `UI.background`
 * and contribute no height of their own, so a collapsed span neither rings
 * itself with a cliff nor reads as ground you could cross.
 */
export function bakeSeabed(terrain: TerrainPayload): HTMLCanvasElement {
  const { cols, rows, cellM } = terrain;
  const w = cols * SEABED_PX_PER_CELL;
  const h = rows * SEABED_PX_PER_CELL;
  const seed = seabedSeed(terrain);

  const isRock = (i: number) => terrain.ceiling[i]! > terrain.floor[i]!;

  // The map's own depth range, rock excluded — same scan drawTerrain ran, for
  // the same reason: one collapsed span must not re-shade the whole seabed.
  let shallowest = Number.POSITIVE_INFINITY;
  let deepest = 0;
  for (let i = 0; i < terrain.floor.length; i++) {
    if (isRock(i)) continue;
    const f = terrain.floor[i]!;
    if (f < shallowest) shallowest = f;
    if (f > deepest) deepest = f;
  }

  const clampCol = (c: number) => Math.min(cols - 1, Math.max(0, c));
  const clampRow = (r: number) => Math.min(rows - 1, Math.max(0, r));
  /** Floor at a cell, with rock reading as the asking cell's own floor. */
  const floorAt = (r: number, c: number, homeIndex: number): number => {
    const i = clampRow(r) * cols + clampCol(c);
    return isRock(i) ? terrain.floor[homeIndex]! : terrain.floor[i]!;
  };

  // Pass 1: the heightfield, so pass 2 can take gradients off it directly.
  const height = new Float32Array(w * h);
  const mPerPx = cellM / SEABED_PX_PER_CELL;
  for (let py = 0; py < h; py++) {
    // Continuous cell coordinate of this pixel's centre.
    const cy = (py + 0.5) / SEABED_PX_PER_CELL - 0.5;
    const r0 = Math.floor(cy);
    const fy = smooth(cy - r0);
    for (let px = 0; px < w; px++) {
      const cx = (px + 0.5) / SEABED_PX_PER_CELL - 0.5;
      const c0 = Math.floor(cx);
      const fx = smooth(cx - c0);

      const homeIndex = clampRow(Math.round(cy)) * cols + clampCol(Math.round(cx));
      const f00 = floorAt(r0, c0, homeIndex);
      const f10 = floorAt(r0, c0 + 1, homeIndex);
      const f01 = floorAt(r0 + 1, c0, homeIndex);
      const f11 = floorAt(r0 + 1, c0 + 1, homeIndex);
      const floor = f00 + (f10 - f00) * fx + (f01 + (f11 - f01) * fx - f00 - (f10 - f00) * fx) * fy;

      // Detail parameters interpolate the same way the floor does, so the
      // *amount* of texture fades smoothly across a boundary while the field
      // itself is one continuous function of world position.
      const reliefOf = (r: number, c: number): BiomeRelief => {
        const i = clampRow(r) * cols + clampCol(c);
        if (isRock(i)) return { amplitudeM: 0, roughness: 0, blockiness: 0 };
        return BIOME_RELIEF[terrain.biomes[i] as Biome] ?? BIOME_RELIEF[Biome.OpenWater];
      };
      const b00 = reliefOf(r0, c0);
      const b10 = reliefOf(r0, c0 + 1);
      const b01 = reliefOf(r0 + 1, c0);
      const b11 = reliefOf(r0 + 1, c0 + 1);
      const lerp2 = (k: keyof BiomeRelief) =>
        b00[k] +
        (b10[k] - b00[k]) * fx +
        (b01[k] + (b11[k] - b01[k]) * fx - b00[k] - (b10[k] - b00[k]) * fx) * fy;

      height[py * w + px] =
        floor +
        detailM(
          px * mPerPx,
          py * mPerPx,
          seed,
          lerp2('amplitudeM'),
          lerp2('roughness'),
          lerp2('blockiness')
        );
    }
  }

  // Pass 2: light it. Gradients come off the baked heightfield, converted to
  // metres-per-cell so reliefShade's reference scale means what it meant for
  // the vector pass — one tuning, both renderers.
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('seabed bake: no 2d context');
  const img = ctx.createImageData(w, h);
  const dropScale = SEABED_PX_PER_CELL / 2;

  for (let py = 0; py < h; py++) {
    const row = clampRow(Math.floor(py / SEABED_PX_PER_CELL));
    for (let px = 0; px < w; px++) {
      const col = clampCol(Math.floor(px / SEABED_PX_PER_CELL));
      const index = row * cols + col;
      const j = (py * w + px) * 4;

      let color: number;
      if (isRock(index)) {
        // Rock is not water and is not drawn as any depth of it.
        color = UI.background;
      } else {
        const i = py * w + px;
        const hL = height[i - (px > 0 ? 1 : 0)]!;
        const hR = height[i + (px < w - 1 ? 1 : 0)]!;
        const hU = height[i - (py > 0 ? w : 0)]!;
        const hD = height[i + (py < h - 1 ? w : 0)]!;
        const base = BIOME_COLOR[terrain.biomes[index] as Biome] ?? BIOME_COLOR[Biome.OpenWater];
        color = reliefShade(
          depthShade(base, height[i]!, shallowest, deepest),
          (hR - hL) * dropScale,
          (hD - hU) * dropScale
        );
      }

      img.data[j] = (color >> 16) & 0xff;
      img.data[j + 1] = (color >> 8) & 0xff;
      img.data[j + 2] = color & 0xff;
      img.data[j + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}
