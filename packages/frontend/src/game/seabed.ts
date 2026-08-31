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
import { BIOME_COLOR, depthShade, reliefShade, ROCK_FACE, scaleRgb } from './palette.ts';

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
  /**
   * 0..1: peak fractional darkening of the albedo mottle — sediment, growth,
   * scatter. Luminance only, from an independent noise channel, under the
   * same darken-only ceiling as everything else (docs/art-direction.md,
   * "Reading the Sea Floor").
   */
  mottle: number;
}

export const BIOME_RELIEF: Record<Biome, BiomeRelief> = {
  [Biome.OpenWater]: { amplitudeM: 40, roughness: 0.25, blockiness: 0, mottle: 0.05 },
  [Biome.ThermalVein]: { amplitudeM: 95, roughness: 0.5, blockiness: 0, mottle: 0.1 },
  [Biome.KelpForest]: { amplitudeM: 65, roughness: 0.3, blockiness: 0, mottle: 0.08 },
  [Biome.AbyssalTrench]: { amplitudeM: 40, roughness: 0.15, blockiness: 0, mottle: 0.04 },
  [Biome.ResonanceField]: { amplitudeM: 60, roughness: 0.4, blockiness: 0, mottle: 0.06 },
  [Biome.CoralRuins]: { amplitudeM: 60, roughness: 0.25, blockiness: 1, mottle: 0.07 },
};

/**
 * TUNABLE. Rock's own relief — "jagged rock formations", the one
 * Environmental Shape that is not a biome (docs/art-direction.md, "Rock
 * speaks in stone"). Rougher than any biome floor because a mesa face is
 * broken stone, and modest in amplitude because rock tops out only
 * `ROCK_RISE_ABOVE_SHALLOWEST_M` above the water and must never dip back
 * under it. Mottle stays low: bare stone, not sediment.
 */
export const ROCK_RELIEF: BiomeRelief = {
  amplitudeM: 45,
  roughness: 0.55,
  blockiness: 0,
  mottle: 0.06,
};

/** Salt for the rock field, so a mesa's shape never correlates with the
 * water detail lapping its base — two different materials, two fields. */
const ROCK_SEED_SALT = 0x7f4a7c15;

/**
 * The rock detail field at a world position, in metres — the mesa-top and
 * cliff-lip crag. Same contract as `detailM`: deterministic, render-only,
 * bounded by its amplitude. Shared by the bake (shading) and the perspective
 * heightfield (shape), so the crag the light draws is the crag the mesh has.
 */
export function rockDetailM(xM: number, yM: number, seed: number): number {
  return detailM(
    xM,
    yM,
    seed ^ ROCK_SEED_SALT,
    ROCK_RELIEF.amplitudeM,
    ROCK_RELIEF.roughness,
    ROCK_RELIEF.blockiness
  );
}

/**
 * TUNABLE — the cliff treatment, both sides of a rock/open boundary, in
 * metres and darken-only gains. The mesa's rim darkens toward `ROCK_SHADOW`
 * (0.55 × `ROCK_FACE` lands on it) so a flat top reads as *raised* ground
 * ringed by its own edge; the open floor darkens in the wall's lee so the
 * mesa reads as standing on the seabed rather than pasted over it.
 */
export const ROCK_EDGE_M = 60;
export const ROCK_EDGE_GAIN = 0.55;
export const CLIFF_SHADOW_M = 90;
export const CLIFF_SHADOW_GAIN = 0.7;

/** Detail wavelengths, metres. Fixed globally so the *field* is continuous and
 * only its per-biome amplitude changes across a region boundary — varying the
 * frequency instead would print the authoring rectangles back onto the noise. */
const WAVELENGTH_M = 420;
const FAST_WAVELENGTH_M = 140;
/** Coral's sampling grid: ruin-block sized, well above one bake pixel. */
const BLOCK_M = 90;
/** Mottle wavelengths, metres — finer than the relief so the variegation
 * reads as surface, not as more shape. Both sit above one bake pixel. */
const MOTTLE_WAVELENGTH_M = 170;
const MOTTLE_FAST_WAVELENGTH_M = 55;

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
 * The albedo mottle at a world position: a luminance gain in [1 - mottle, 1].
 *
 * A separate channel from the heightfield on purpose — this is what the
 * surface is *made of*, not what shape it has, so it must not correlate with
 * the relief shadows or the two read as one over-strong pass. Hue-preserving
 * because the caller scales all three channels by this one gain, and
 * darken-only for the same reason every terrain pass darkens only: the
 * authored biome fill is the ceiling.
 */
export function mottleFactor(xM: number, yM: number, seed: number, mottle: number): number {
  const salt = seed ^ 0x5f356495;
  const n =
    0.65 * valueNoise(xM, yM, MOTTLE_WAVELENGTH_M, salt) +
    0.35 * valueNoise(xM, yM, MOTTLE_FAST_WAVELENGTH_M, salt ^ 0x2545f491);
  // n is in [-1, 1]; map to [0, 1] then down from the ceiling.
  return 1 - mottle * (0.5 + 0.5 * Math.max(-1, Math.min(1, n)));
}

/** One vent ember: a lit point in a thermal field. World metres; phase 0..1. */
export interface VentEmber {
  xM: number;
  yM: number;
  radiusM: number;
  phase: number;
}

/** TUNABLE. Hard cap on embers per map, so a hypothetical all-vent map cannot
 * turn the decoration into a particle system. */
export const VENT_EMBER_CAP = 400;

/**
 * Deterministic ember sites for every ThermalVein cell (docs/art-direction.md
 * "Vent ember light"). Placement is the cell's hash and nothing else: embers
 * carry no state, respond to nothing, and exist identically on every client —
 * decoration for ground the map already declares hot, never a signal.
 */
export function ventEmbers(
  terrain: {
    cols: number;
    rows: number;
    cellM: number;
    biomes: readonly number[];
    floor: readonly number[];
    ceiling: readonly number[];
  },
  seed: number
): VentEmber[] {
  const embers: VentEmber[] = [];
  for (let row = 0; row < terrain.rows; row++) {
    for (let col = 0; col < terrain.cols; col++) {
      const index = row * terrain.cols + col;
      if (terrain.biomes[index] !== Biome.ThermalVein) continue;
      // Rock is not a vent field, whatever biome label a collapse left on it.
      if (terrain.ceiling[index]! > terrain.floor[index]!) continue;

      // Sparse on purpose: roughly a third of vent cells carry one ember and
      // a rare few two — the first cut lit most cells and the band read as a
      // starfield loud enough to compete with contacts, which is the one
      // thing the seabed must never do.
      const h = latticeNoise(col, row, seed ^ 0x1b873593);
      const count = h > 0.9 ? 2 : h > 0.35 ? 1 : 0;
      for (let k = 0; k < count; k++) {
        if (embers.length >= VENT_EMBER_CAP) return embers;
        const jx = 0.5 + 0.5 * latticeNoise(col * 2 + k, row, seed ^ 0x85ebca6b);
        const jy = 0.5 + 0.5 * latticeNoise(col, row * 2 + k, seed ^ 0xc2b2ae35);
        const jr = 0.5 + 0.5 * latticeNoise(col + k, row + k, seed ^ 0x27d4eb2d);
        const radiusM = 25 + 35 * jr;
        // Keep the whole glow inside its own cell, so an ember never leaks
        // light onto a neighbouring biome's ground.
        const margin = radiusM / terrain.cellM;
        const fx = margin + (1 - 2 * margin) * jx;
        const fy = margin + (1 - 2 * margin) * jy;
        embers.push({
          xM: (col + fx) * terrain.cellM,
          yM: (row + fy) * terrain.cellM,
          radiusM,
          phase: 0.5 + 0.5 * latticeNoise(row * 31 + col, k, seed ^ 0x9e3779b9),
        });
      }
    }
  }
  return embers;
}

/**
 * Ember brightness for one 5 Hz bucket, in [0, 1].
 *
 * Stepped on the sonar grid rather than eased (docs/style-neon-noir.md:
 * "sonar cadence is the heartbeat" — and the seabed's one light keeps that
 * register instead of glowing like video). Squared so embers rest dim and
 * only occasionally breathe up; the phase keeps a field from blinking in
 * unison.
 */
export function emberFlicker(index: number, bucket: number, phase: number): number {
  const v = 0.5 + 0.5 * latticeNoise(index, bucket + Math.floor(phase * 7919), 0x6a09e667);
  return v * v;
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
 * biome-weighted detail field. Rock cells contribute no height to the *water*
 * field — a collapsed span must not ring the floor around it with a false
 * cliff — and are shaded on their own terms instead: the stone ramp
 * (`ROCK_FACE`, docs/style-neon-noir.md "The stone") under the rock detail
 * field's hillshade, rims darkened at the open-water boundary so a mesa reads
 * as raised stone rather than as a hole in the map, with a matching shadow
 * lapping the open floor at its base.
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
        if (isRock(i)) return { amplitudeM: 0, roughness: 0, blockiness: 0, mottle: 0 };
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

  /**
   * Distance from a world position to the nearest cell of the *other* ground
   * kind among the home cell's neighbours, in metres. Both cliff treatments
   * reach at most `CLIFF_SHADOW_M` < one cell, so a 3×3 neighbourhood is the
   * whole search; off-map neighbours count as neither kind — a map-edge mesa
   * is cut by the survey, not standing over open water.
   */
  const oppositeDistM = (xM: number, yM: number, row: number, col: number, wantRock: boolean) => {
    let best = Number.POSITIVE_INFINITY;
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        if (isRock(r * cols + c) !== wantRock) continue;
        const dx = Math.max(c * cellM - xM, 0, xM - (c + 1) * cellM);
        const dy = Math.max(r * cellM - yM, 0, yM - (r + 1) * cellM);
        const d = Math.hypot(dx, dy);
        if (d < best) best = d;
      }
    }
    return best;
  };
  /** Darken-only gain ramping from `gain` at the boundary to 1 at `reachM`. */
  const edgeGain = (distM: number, reachM: number, gain: number) =>
    distM >= reachM ? 1 : gain + (1 - gain) * smooth(distM / reachM);

  for (let py = 0; py < h; py++) {
    const row = clampRow(Math.floor(py / SEABED_PX_PER_CELL));
    for (let px = 0; px < w; px++) {
      const col = clampCol(Math.floor(px / SEABED_PX_PER_CELL));
      const index = row * cols + col;
      const j = (py * w + px) * 4;
      const xM = px * mPerPx;
      const yM = py * mPerPx;

      let color: number;
      if (isRock(index)) {
        // Rock is not water and is not drawn as any depth of it: no
        // depthShade, no biome hue — the stone ramp under its own hillshade.
        // Gradients come off the rock detail field at bake-pixel step, scaled
        // to metres-per-cell exactly as the water pass scales its own.
        const hL = rockDetailM(xM - mPerPx, yM, seed);
        const hR = rockDetailM(xM + mPerPx, yM, seed);
        const hU = rockDetailM(xM, yM - mPerPx, seed);
        const hD = rockDetailM(xM, yM + mPerPx, seed);
        color = scaleRgb(
          reliefShade(ROCK_FACE, (hR - hL) * dropScale, (hD - hU) * dropScale),
          mottleFactor(xM, yM, seed, ROCK_RELIEF.mottle) *
            // The rim: darkened toward ROCK_SHADOW where the mesa meets open
            // water, so a flat top reads as raised ground with an edge.
            edgeGain(oppositeDistM(xM, yM, row, col, false), ROCK_EDGE_M, ROCK_EDGE_GAIN)
        );
      } else {
        const i = py * w + px;
        const hL = height[i - (px > 0 ? 1 : 0)]!;
        const hR = height[i + (px < w - 1 ? 1 : 0)]!;
        const hU = height[i - (py > 0 ? w : 0)]!;
        const hD = height[i + (py < h - 1 ? w : 0)]!;
        const biome = terrain.biomes[index] as Biome;
        const base = BIOME_COLOR[biome] ?? BIOME_COLOR[Biome.OpenWater];
        const relief = BIOME_RELIEF[biome] ?? BIOME_RELIEF[Biome.OpenWater];
        color = scaleRgb(
          reliefShade(
            depthShade(base, height[i]!, shallowest, deepest),
            (hR - hL) * dropScale,
            (hD - hU) * dropScale
          ),
          // What the surface is made of, after what shape it has — the mottle
          // gain scales all three channels alike, so hue stays the biome's.
          mottleFactor(xM, yM, seed, relief.mottle) *
            // The wall's lee: open floor darkens where it meets a mesa, so
            // the rock reads as standing on the seabed, not pasted over it.
            edgeGain(oppositeDistM(xM, yM, row, col, true), CLIFF_SHADOW_M, CLIFF_SHADOW_GAIN)
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
