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
 * - **Texture is centred; nothing else lifts** (docs/art-direction.md
 *   "Reading the Sea Floor", #1103). Depth and the authored step's hillshade
 *   darken only, through the `depthShade` → `reliefShade` pair the cell pass
 *   used, and so do the cliff shadows and the scours. The detail relief and
 *   the mottle are centred on what those leave, so they average no brighter
 *   than it, and lift no pixel past `TERRAIN_LIFT.BAKE`.
 * - **Off the per-frame path.** Baked on terrain load and ground deltas, the
 *   same rebuild cadence `drawTerrain` already had.
 */

import { Biome, SEABED_DETAIL, TERRAIN_LIFT, WORLD } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import type { StoneSeat } from './environment.ts';
import { BIOME_COLOR, depthShade, reliefTextureGain, ROCK_FACE, scaleRgb } from './palette.ts';
import { ROUNDED_CELLS, roundedCellsOf, roundedDistances } from './roundedCells.ts';

/**
 * Bake density. 32 px across a 250 m cell is 7.8 m/px — enough for a ridge to
 * have a face at combat zoom while a full 32×32-cell map stays one 1024²
 * texture (4 MB RGBA, cheaper to draw than the thousand Graphics rects it
 * replaces).
 */
export const SEABED_PX_PER_CELL = 32;

/**
 * How a bake is taken. A mission's ground takes the defaults. The Rift's
 * overview (worldOverview.ts, #1459) takes fewer pixels a cell and no detail
 * field: at 1,000 m cells the field's octaves are finer than a pixel, and
 * would bake as grain rather than as shape.
 */
export interface BakeOptions {
  /** Pixels across one cell; `SEABED_PX_PER_CELL` unless given. */
  pxPerCell?: number;
  /** Whether the detail field and the mottle shape the bake; true unless given. */
  detail?: boolean;
  /**
   * The free-water study's eroded cell edges (`erodedGroundAtM`), given the
   * rock top the heightfield stands its mesas on; undefined on every shipped
   * map, which bakes the authored step as it always has. `floors`, when
   * given, takes the study's survey floor (`ErodedGround.floorM`) where the
   * bake reads each pixel it shades, the pixel's north-west corner — the
   * whole map's pixels, row-major — for its isobaths (surveyInk.ts
   * `DrawnSurvey`): the bake reads the drawn ground there anyway, so the
   * floor costs no second pass.
   */
  eroded?: { rockTopM: number; floors?: Float32Array };
}

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
   * 0..1: the albedo mottle's whole span — sediment, growth, scatter — half
   * of it above the fill and half below. Luminance only, from an independent
   * noise channel, under the same cap as every texture (docs/art-direction.md,
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

/**
 * TUNABLE — how far either side of a biome coast the fill eases into its
 * neighbour's, in metres: docs/art-direction.md "Reading the Sea Floor". At
 * the cell edge the two fills meet half and half, and a band's width in from
 * it each is its own again. The coast is still drawn exactly on the edge by
 * the survey ink, dashed, which is the PF line; the band only stops the fill
 * from printing the 250 m grid as a staircase of hard colour (#1532).
 */
export const BIOME_BAND_M = 60;

/**
 * The fill at a world position: the home cell's biome fill, eased into each
 * open neighbour of another biome across `BIOME_BAND_M` of its nearest edge
 * (`smooth`, both sides alike, so the two meet in one colour on the line).
 * Rock is no biome and keeps its solid coast; the map's own edge has no
 * neighbour. Reaches less than a cell, as every other term of the bake does.
 */
export function bandedFill(terrain: TerrainPayload, xM: number, yM: number): number {
  const { cols, rows, cellM } = terrain;
  const col = Math.min(cols - 1, Math.max(0, Math.floor(xM / cellM)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(yM / cellM)));
  const index = row * cols + col;
  const own = terrain.biomes[index] as Biome;
  const fillOf = (biome: Biome) => BIOME_COLOR[biome] ?? BIOME_COLOR[Biome.OpenWater];
  const ownFill = fillOf(own);
  const isRock = (i: number) => terrain.ceiling[i]! > terrain.floor[i]!;
  if (isRock(index)) return ownFill;
  /** The neighbour across the nearer of two opposite edges, and its weight. */
  const across = (dLow: number, dHigh: number, low: number | null, high: number | null) => {
    const near = dLow <= dHigh ? low : high;
    const d = Math.min(dLow, dHigh);
    if (near === null || isRock(near) || terrain.biomes[near] === own || d >= BIOME_BAND_M) {
      return null;
    }
    return { fill: fillOf(terrain.biomes[near] as Biome), w: 0.5 * (1 - smooth(d / BIOME_BAND_M)) };
  };
  const x = across(
    xM - col * cellM,
    (col + 1) * cellM - xM,
    col > 0 ? index - 1 : null,
    col < cols - 1 ? index + 1 : null
  );
  const y = across(
    yM - row * cellM,
    (row + 1) * cellM - yM,
    row > 0 ? index - cols : null,
    row < rows - 1 ? index + cols : null
  );
  if (x === null && y === null) return ownFill;
  const wx = x?.w ?? 0;
  const wy = y?.w ?? 0;
  const channel = (shift: number) =>
    Math.round(
      ((ownFill >> shift) & 0xff) * (1 - wx - wy) +
        (((x?.fill ?? 0) >> shift) & 0xff) * wx +
        (((y?.fill ?? 0) >> shift) & 0xff) * wy
    );
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

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
 * itself: same terrain, same bake, on every client. The view takes it once,
 * from the ground the match opened on, and keeps it across ground deltas —
 * a collapse that reseeded the whole detail field would re-texture every
 * cell on the map to change a handful (#434), and a player watching an arch
 * fall should see the arch fall and nothing else move.
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
 * The weight a cell centre's neighbour gets at fraction `t` of the way to it,
 * for everything upsampled from cells: the floor, and the relief parameters
 * over it. Linear, so the upsample is the bilinear one docs/map-visuals.md §4
 * rule 1 names. It was a smoothstep, whose zero slope at every centre made
 * each cell a flat tread and put its whole step in an S between two centres,
 * so an authored ramp or curve climbed as a staircase of 250 m terraces
 * (#1532). Either reaches one cell, which the partial rebuilds stand on.
 */
export const cellBlend = (t: number) => t;

const NO_RELIEF: BiomeRelief = { amplitudeM: 0, roughness: 0, blockiness: 0, mottle: 0 };

/**
 * The relief parameters at a continuous cell coordinate (`x / cellM - 0.5`),
 * interpolated between the four nearest cell centres by `cellBlend`, the same
 * way the floor is — so the *amount* of texture fades across a boundary while
 * the field itself is one continuous function of world position. Rock carries
 * none. The bake and the heightfield both read it, so the colour's slopes and
 * the mesh's shape are the same ground: taken from the nearest cell instead,
 * the mesh tore up to ~155 m of depth within one vertex step along every biome
 * edge whose fields differ, the Coral Ruins grid against its neighbours most.
 */
export function reliefAtCell(terrain: TerrainPayload, cx: number, cy: number): BiomeRelief {
  const { cols, rows } = terrain;
  const c0 = Math.floor(cx);
  const r0 = Math.floor(cy);
  const fx = cellBlend(cx - c0);
  const fy = cellBlend(cy - r0);
  const at = (r: number, c: number): BiomeRelief => {
    const i = Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c));
    if (terrain.ceiling[i]! > terrain.floor[i]!) return NO_RELIEF;
    return BIOME_RELIEF[terrain.biomes[i] as Biome] ?? BIOME_RELIEF[Biome.OpenWater];
  };
  const b00 = at(r0, c0);
  const b10 = at(r0, c0 + 1);
  const b01 = at(r0 + 1, c0);
  const b11 = at(r0 + 1, c0 + 1);
  const lerp2 = (k: keyof BiomeRelief) =>
    b00[k] +
    (b10[k] - b00[k]) * fx +
    (b01[k] + (b11[k] - b01[k]) * fx - b00[k] - (b10[k] - b00[k]) * fx) * fy;
  return {
    amplitudeM: lerp2('amplitudeM'),
    roughness: lerp2('roughness'),
    blockiness: lerp2('blockiness'),
    mottle: lerp2('mottle'),
  };
}

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

/**
 * Value noise in [-1, 1] at a world position, one wavelength. Exported for
 * the roof's brow (passages.ts), which erodes on the same field the ground
 * does, so the two meet along a jamb as one stone.
 */
export function valueNoise(xM: number, yM: number, wavelengthM: number, seed: number): number {
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
 * The albedo mottle at a world position: a luminance gain in
 * [1 - mottle / 2, 1 + mottle / 2].
 *
 * A separate channel from the heightfield on purpose — this is what the
 * surface is *made of*, not what shape it has, so it must not correlate with
 * the relief shadows or the two read as one over-strong pass. Hue-preserving
 * because the caller scales all three channels by this one gain, and centred
 * on the fill because it is texture (#1103): value noise averages to nothing,
 * so the mottle averages to the fill. The caller caps it with the relief.
 */
export function mottleFactor(xM: number, yM: number, seed: number, mottle: number): number {
  const salt = seed ^ 0x5f356495;
  const n =
    0.65 * valueNoise(xM, yM, MOTTLE_WAVELENGTH_M, salt) +
    0.35 * valueNoise(xM, yM, MOTTLE_FAST_WAVELENGTH_M, salt ^ 0x2545f491);
  // n is in [-1, 1] and averages 0: half the span either side of the fill.
  return 1 - 0.5 * mottle * Math.max(-1, Math.min(1, n));
}

/**
 * TUNABLE — the free-water study's drawn ground between cell centres,
 * development-only (docs/free-water-slice.md §9, "Crater walls"). Off on every
 * shipped map.
 *
 * The study rounds its cells (roundedCells.ts) and draws its ground across
 * the rounded edges: a floor that climbs across each, a rock face with a foot
 * in the water and a lip in the stone. Every profile is whole at one centre
 * and nothing at the next, so an open centre keeps its authored floor and a
 * solid cell stays rock at its centre. The study's ink traces the same edges
 * (docs/map-visuals.md §4, the study's clause); the relief and the benches
 * drawn on them stay texture.
 */
export const ERODED_EDGES = {
  /**
   * How much of a ramp's rise gathers into a scarp at its middle; 0 is the
   * linear ramp. A ramp spans twice the reach (`erodedReachM`), so between
   * two edges a cell's centre stands on a flat tread: on a crater's rim a
   * scarp with a tread either side is the aim. A gentle slope authored
   * across many cells would climb as #1532's staircase of treads, and the
   * study authors none.
   */
  SCARP: 0.8,
  /** The face's profile exponent: a gentle foot rising to a steep lip. */
  LIP: 2,
  /**
   * Coral's benches in the study, in place of its 90 m blocks (`BLOCK_M`):
   * the relief cut into steps of this many metres of depth, each riser
   * taking `BENCH_RISER` of its step. The steps follow the relief's own
   * contours, wandered by up to `BENCH_WANDER` of a step over
   * `BENCH_WAVELENGTH_M`, so a bench edge curves with the ground rather
   * than marching on a plan grid (#1774).
   */
  BENCH_M: 18,
  BENCH_RISER: 0.35,
  BENCH_WANDER: 0.5,
  BENCH_WAVELENGTH_M: 260,
} as const;

/** Salt for the benches' wander: a field of its own. */
const BENCH_SALT = 0x510e527f;

/** How many biomes a ground can hold: `Biome`'s values run from 0. */
const BIOME_COUNT = Object.keys(BIOME_RELIEF).length;

/**
 * How far either side of a rounded edge the study's ground ramps, metres:
 * the margin every cell centre keeps from its own rounded edge
 * (roundedCells.ts `CENTRE_MARGIN_M`), so a centre stands at or past the end
 * of every ramp and reads its own floor. One number everywhere, not the
 * moves where a point stands: a reach that followed them would follow the
 * cells' staircase too, which is where the moves fall off, and draw it back
 * in where each ramp begins.
 */
export function erodedReachM(): number {
  return ROUNDED_CELLS.CENTRE_MARGIN_M;
}

/** A ramp's climb at `u` of the reach from its edge: 0 at −1, ½ on the edge, whole at +1. */
function rampClimb(u: number): number {
  const x = Math.min(1, Math.max(0, (u + 1) / 2));
  return x + ERODED_EDGES.SCARP * (smooth(x) - x);
}

/**
 * A kind's weight beside the kind nearest the point, which weighs 1: as
 * much as makes a two-kind ramp climb by `rampClimb`, the edge being where
 * the two are level and `behind` twice the distance from it. Nothing once a
 * kind lies two reaches behind, or two reaches outside its own rounded edge:
 * the second keeps a far kind out of a point where the kinds about it have
 * all drawn back from it, and it is let go only past the reach, so it never
 * bends a two-kind ramp.
 */
function kindWeight(behind: number, own: number, reach: number): number {
  const minority = 1 - rampClimb(behind / (2 * reach));
  if (minority <= 0) return 0;
  const outside = smooth(Math.min(1, Math.max(0, (own + 2 * reach) / reach)));
  return (minority / (1 - minority)) * outside;
}

export interface ErodedGround {
  /**
   * The drawn step, metres of depth: the open floor between the rounded
   * edges, risen to the rock top across each face. The darken-only slope the
   * bake lights, and the surface the heightfield stands on, less its relief.
   */
  stepM: number;
  /** How much of the point is rock, 0–1: whole from a face's lip inward. */
  rockWeight: number;
  /**
   * The open floor under the step, metres, with the rock's rise left out:
   * what the study's isobaths contour (docs/map-visuals.md §4, the study's
   * clause). Inside the stone it reads the nearest open floor, so a face
   * stacks no false scarp of isobaths at its foot.
   */
  floorM: number;
  /** Signed distance to the drawn rock coast, metres, positive in the stone: the solid coastline is its zero. */
  coastM: number;
  /**
   * Per biome, by its enum index, the signed distance to that biome's drawn
   * edge, metres, positive inside it: each dashed coastline is a zero of
   * one. A biome nowhere near reads far outside.
   */
  biomeM: number[];
  /** The relief the open ground carries here, blended across the drawn edges as its floor is. */
  relief: BiomeRelief;
}

let distances = new Float64Array(16);
let shares = new Float64Array(16);

/**
 * The study's ground at a world position (docs/free-water-slice.md §9,
 * "Crater walls"), for the heightfield, the bake and the ink alike.
 *
 * Each kind of ground's rounded signed distance (`roundedDistances`) weighs
 * it against the kind nearest the point:
 * two kinds meeting share it half and half on their rounded edge, and the
 * further one's share falls to nothing a reach inside the nearer
 * (`erodedReachM`), so at a cell centre the centre's own kind is whole and
 * every other kind nothing: the centre reads its authored floor, or rock. A
 * kind whose cells are none of a point's four nearest centres lies the bound
 * outside its own rounded edge there (`erodedBoundM`), so it has no share,
 * and the step stays between those four centres as the bilinear did.
 *
 * Against the stone over a roofed passage the rock keeps a step on the edge:
 * the roof stands a curtain there (passages.ts), and the hold keeps that
 * edge where the cells put it (roundedCells.ts `ROOF_HOLD_CELLS`).
 *
 * Deterministic from the cells alone, with no noise in it: the relief and
 * the benches laid on it are the texture. Render-only like the detail field:
 * the server's cells stay the truth about where a hull fits.
 */
export function erodedGroundAtM(
  terrain: TerrainPayload,
  rockTopM: number,
  xM: number,
  yM: number
): ErodedGround {
  const field = roundedCellsOf(terrain);
  const { cellM } = terrain;
  const { kinds } = field;
  const n = kinds.length;
  if (distances.length < n) {
    distances = new Float64Array(n);
    shares = new Float64Array(n);
  }
  const s = distances.subarray(0, n);
  const w = shares.subarray(0, n);

  roundedDistances(field, xM, yM, s);
  const reach = erodedReachM();

  // Each kind against the nearest: so where three kinds meet and the rounding
  // has drawn all three back from the junction, the nearest still holds the
  // point whole rather than every kind holding a sliver of it.
  let nearest = 0;
  for (let k = 1; k < n; k++) if (s[k]! > s[nearest]!) nearest = k;
  let rockShare = 0;
  let roofShare = 0;
  let rockNear = Number.NEGATIVE_INFINITY;
  let roofNear = Number.NEGATIVE_INFINITY;
  for (let k = 0; k < n; k++) {
    w[k] = k === nearest ? 1 : kindWeight(s[nearest]! - s[k]!, s[k]!, reach);
    if (kinds[k]!.rock) {
      rockShare += w[k]!;
      rockNear = Math.max(rockNear, s[k]!);
    } else if (kinds[k]!.roofed) {
      roofShare += w[k]!;
      roofNear = Math.max(roofNear, s[k]!);
    }
  }
  // A jamb: the rock and the passage under its roof split their shares on
  // the edge between them, a step in no width, the curtain's line. On the
  // edge itself the point's own cell has it, as every reader of the cells
  // gives an edge to the cell east or south of it.
  if (rockShare > 0 && roofShare > 0) {
    const col = Math.min(terrain.cols - 1, Math.max(0, Math.floor(xM / cellM)));
    const row = Math.min(terrain.rows - 1, Math.max(0, Math.floor(yM / cellM)));
    const toRock =
      rockNear > roofNear ||
      (rockNear === roofNear && kinds[field.kindOf[row * terrain.cols + col]!]!.rock);
    const both = rockShare + roofShare;
    for (let k = 0; k < n; k++) {
      if (kinds[k]!.rock) w[k] = toRock ? (w[k]! * both) / rockShare : 0;
      else if (kinds[k]!.roofed) w[k] = toRock ? 0 : (w[k]! * both) / roofShare;
    }
  }

  let total = 0;
  for (let k = 0; k < n; k++) total += w[k]!;
  let rock = 0;
  let open = 0;
  let floor = 0;
  const relief = { amplitudeM: 0, roughness: 0, blockiness: 0, mottle: 0 };
  let nearestOpen = -1;
  // Past every distance the field holds: what a side reads with no kind near.
  const cap = -(ROUNDED_CELLS.SEARCH_CELLS + 1) * cellM;
  let rockSide = cap;
  let openSide = cap;
  const biomeSide = new Array<number>(BIOME_COUNT).fill(cap);
  for (let k = 0; k < n; k++) {
    const kind = kinds[k]!;
    const share = w[k]! / total;
    if (kind.rock) {
      rock += share;
      rockSide = Math.max(rockSide, s[k]!);
      continue;
    }
    openSide = Math.max(openSide, s[k]!);
    biomeSide[kind.biome] = Math.max(biomeSide[kind.biome]!, s[k]!);
    if (nearestOpen === -1 || s[k]! > s[nearestOpen]!) nearestOpen = k;
    if (share === 0) continue;
    const r = BIOME_RELIEF[kind.biome as Biome] ?? BIOME_RELIEF[Biome.OpenWater];
    open += share;
    floor += share * kind.floorM;
    relief.amplitudeM += share * r.amplitudeM;
    relief.roughness += share * r.roughness;
    relief.blockiness += share * r.blockiness;
    relief.mottle += share * r.mottle;
  }
  let floorM: number;
  if (open > 0) {
    floorM = floor / open;
    relief.amplitudeM /= open;
    relief.roughness /= open;
    relief.blockiness /= open;
    relief.mottle /= open;
  } else if (nearestOpen !== -1) {
    // Inside the stone: the nearest open floor, which the ink never draws
    // here but a triangle reaching the coast from here interpolates.
    const kind = kinds[nearestOpen]!;
    floorM = kind.floorM;
    Object.assign(relief, BIOME_RELIEF[kind.biome as Biome] ?? BIOME_RELIEF[Biome.OpenWater]);
  } else {
    floorM = 0;
  }

  // Each biome's side of its own drawn edge: its rounded distance less the
  // nearest other biome's, halved, so two biomes meeting read ±d either side.
  let first = cap;
  let second = cap;
  for (const v of biomeSide) {
    if (v > first) {
      second = first;
      first = v;
    } else if (v > second) second = v;
  }
  const biomeM = biomeSide.map((v) => (v - (v === first ? second : first)) / 2);

  return {
    stepM: rock >= 1 ? rockTopM : floorM + (rockTopM - floorM) * rock ** ERODED_EDGES.LIP,
    rockWeight: rock,
    floorM,
    coastM: (rockSide - openSide) / 2,
    biomeM,
    relief,
  };
}

/**
 * The study's relief at a world position, metres: the detail field, with
 * coral cut into benches instead of sampled on its 90 m blocks (#1774). The
 * benches follow the field's own contours, wandered, so their edges curve
 * with the ground. Bounded by one step of the field it cuts, and centred on
 * it, since texture averages to its fill (docs/art-direction.md, "Reading
 * the Sea Floor"): a tread sits half the tread's share of a step above the
 * floor of its step. Every shipped map keeps `detailM`'s blocks.
 */
export function benchedDetailM(xM: number, yM: number, seed: number, relief: BiomeRelief): number {
  const raw = detailM(xM, yM, seed, relief.amplitudeM, relief.roughness, 0);
  if (relief.blockiness <= 0) return raw;
  const E = ERODED_EDGES;
  const shift =
    E.BENCH_WANDER * E.BENCH_M * valueNoise(xM, yM, E.BENCH_WAVELENGTH_M, seed ^ BENCH_SALT);
  const v = (raw + shift) / E.BENCH_M;
  const step = Math.floor(v);
  const f = v - step;
  const rise = smooth(Math.min(1, Math.max(0, (f - (1 - E.BENCH_RISER)) / E.BENCH_RISER)));
  const benched = (step + rise + (1 - E.BENCH_RISER) / 2) * E.BENCH_M - shift;
  return raw + (benched - raw) * relief.blockiness;
}

/**
 * The fill under the study's drawn edges: each biome's fill eased across
 * `BIOME_BAND_M` of its own drawn edge, as `bandedFill` eases across a cell
 * edge, the two meeting half and half on the line the dashed coast draws.
 */
export function drawnFill(biomeM: readonly number[]): number {
  let total = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let biome = 0; biome < biomeM.length; biome++) {
    const v = smooth(Math.min(1, Math.max(0, (biomeM[biome]! / BIOME_BAND_M + 1) / 2)));
    if (v === 0) continue;
    const fill = BIOME_COLOR[biome as Biome] ?? BIOME_COLOR[Biome.OpenWater];
    total += v;
    r += v * ((fill >> 16) & 0xff);
    g += v * ((fill >> 8) & 0xff);
    b += v * (fill & 0xff);
  }
  if (total === 0) return BIOME_COLOR[Biome.OpenWater];
  return (Math.round(r / total) << 16) | (Math.round(g / total) << 8) | Math.round(b / total);
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

/** TUNABLE. The ember's colour gain over its flicker: an ember at the top of
 * its breath draws `VENT_EMBER` at this level, and every other world light is
 * priced against it (docs/style-neon-noir.md "World light", rule 2). */
export const EMBER_GAIN = 0.55;

/** One civic lamp: a steady point on a built terminus. World metres. */
export interface CivicLamp {
  xM: number;
  yM: number;
}

/** TUNABLE. The floor a Coral Ruins cell must stand above to carry a lamp.
 * 350 m lights the Upper Concourse (340 m) and nothing else on any map: the
 * skirmish dividers at 380 m are ruin a hull rises over, not a terminus, and a
 * lamp on a choke would be the only warm thing on competitive ground (#1533). */
export const CIVIC_LAMP_FLOOR_M = 350;

/** TUNABLE. "Few" (docs/habitats-art-brief.md, Sorrowgate): a hard cap, so a
 * future shelf of shallow ruin cannot become a lit street. */
export const CIVIC_LAMP_CAP = 12;

/** TUNABLE. A lamp's steady colour gain, the number `EMBER_GAIN × flicker` is
 * for an ember. Priced with its hue, it renders at about 70 % of an ember's
 * mean breath and a quarter of its peak — the seabed test holds it under the
 * mean — so every lamp is dimmer than a vent ember: the owner's call on #1533,
 * and rule 2. */
export const CIVIC_LAMP_LEVEL = 0.12;

/**
 * Deterministic civic-lamp sites (docs/style-neon-noir.md "World light", the
 * fourth family): Coral Ruins standing above `CIVIC_LAMP_FLOOR_M`, which is to
 * say the Upper Concourse — the one part of the drowned city built near the
 * surface. Placed from the ground and nothing else, as `ventEmbers` is, so a
 * map supplies no light of its own (docs/map-visuals.md §7). Each lamp sits at
 * its cell's centre, jittered: a lamp is civic furniture, not a field.
 */
export function civicLamps(
  terrain: {
    cols: number;
    rows: number;
    cellM: number;
    biomes: readonly number[];
    floor: readonly number[];
    ceiling: readonly number[];
  },
  seed: number
): CivicLamp[] {
  const lamps: CivicLamp[] = [];
  for (let row = 0; row < terrain.rows; row++) {
    for (let col = 0; col < terrain.cols; col++) {
      const index = row * terrain.cols + col;
      if (terrain.biomes[index] !== Biome.CoralRuins) continue;
      if (terrain.floor[index]! > CIVIC_LAMP_FLOOR_M) continue;
      if (terrain.ceiling[index]! > terrain.floor[index]!) continue;
      // About one cell in three: the Concourse's nineteen cells stand six or
      // so, and a frame of the court's "few, low" lamps holds two or three.
      if (latticeNoise(col, row, seed ^ 0x3c6ef372) <= 0.3) continue;
      if (lamps.length >= CIVIC_LAMP_CAP) return lamps;
      const jx = latticeNoise(col * 2, row, seed ^ 0xa54ff53a);
      const jy = latticeNoise(col, row * 2, seed ^ 0x510e527f);
      lamps.push({
        xM: (col + 0.5 + 0.3 * jx) * terrain.cellM,
        yM: (row + 0.5 + 0.3 * jy) * terrain.cellM,
      });
    }
  }
  return lamps;
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
/** The open floor's depth range, which `depthShade` spreads its ramp across. */
export interface SeabedRange {
  shallowest: number;
  deepest: number;
}

/**
 * The map's own depth range, rock excluded — the same scan drawTerrain ran,
 * for the same reason: one collapsed span must not re-shade the whole seabed.
 * Taken once per map by the view and held across ground deltas, so a
 * mid-match cut deeper than anything authored darkens its own cells rather
 * than re-ramping every other one.
 */
export function seabedRange(terrain: TerrainPayload): SeabedRange {
  let shallowest = Number.POSITIVE_INFINITY;
  let deepest = 0;
  for (let i = 0; i < terrain.floor.length; i++) {
    if (terrain.ceiling[i]! > terrain.floor[i]!) continue;
    const f = terrain.floor[i]!;
    if (f < shallowest) shallowest = f;
    if (f > deepest) deepest = f;
  }
  return { shallowest, deepest };
}

/**
 * A seated stone's scour, as a darken-only gain at a world position
 * (docs/art-direction.md "Silt detail and seated stones — SPEC").
 *
 * Deepest at and under the stone, recovering by `STONE_SCOUR_REACH` radii
 * up-current and across, and `STONE_SCOUR_LEE` times further on the lee,
 * down the seat's `flow`, where the current drops its silt (#1573). It never leaves the stone's
 * own cell — faded to nothing over the last radius before the edge, like an
 * ember's glow — so a ground delta's rebake of the touched cells and their
 * ring redraws every scour the delta moved, and nothing past them.
 */
export function stoneScourGain(
  xM: number,
  yM: number,
  seat: StoneSeat,
  cell: { x0: number; y0: number; x1: number; y1: number }
): number {
  const reach = SEABED_DETAIL.STONE_SCOUR_REACH;
  const dx = (xM - seat.xM) / seat.radiusM;
  const dy = (yM - seat.yM) / seat.radiusM;
  // In the current's frame: down-current positive, so the lee is where it is.
  const [fx, fy] = seat.flow;
  const down = dx * fx + dy * fy;
  const across = dx * fy - dy * fx;
  const d = Math.hypot(across, down > 0 ? down / SEABED_DETAIL.STONE_SCOUR_LEE : down);
  if (d >= reach) return 1;
  const edgeM = Math.min(xM - cell.x0, cell.x1 - xM, yM - cell.y0, cell.y1 - yM);
  if (edgeM <= 0) return 1;
  const keep = smooth(Math.min(1, edgeM / seat.radiusM));
  const hollow = d <= 1 ? 1 : 1 - smooth((d - 1) / (reach - 1));
  return 1 - (1 - SEABED_DETAIL.STONE_SCOUR_GAIN) * hollow * keep;
}

/** A rectangle of cells, inclusive at both ends. */
export interface CellRect {
  col0: number;
  row0: number;
  col1: number;
  row1: number;
}

/** The pixels of a shaded cell rectangle, with where they go on the canvas. */
export interface SeabedPixels {
  x: number;
  y: number;
  w: number;
  h: number;
  /** RGBA, row-major, `w * h * 4` long — `ImageData.data` shaped. */
  data: Uint8ClampedArray;
}

/**
 * Shade one cell rectangle of the seabed, pure and canvas-free.
 *
 * The whole bake is this over every cell; a ground delta is this over the
 * cells it touched plus one ring, because both passes reach into their
 * neighbours — the floor and the relief parameters interpolate across cell
 * centres, and the cliff treatments look one cell out for the other kind of
 * ground — and one cell is as far as either reaches. The result is identical
 * to the same pixels of a full bake, which is the promise the partial rebuild
 * stands on and the tests hold.
 */
export function shadeSeabed(
  terrain: TerrainPayload,
  seed: number,
  range: SeabedRange,
  rect: CellRect,
  stones: readonly StoneSeat[] = [],
  options: BakeOptions = {}
): SeabedPixels {
  const { cols, rows, cellM } = terrain;
  const ppc = options.pxPerCell ?? SEABED_PX_PER_CELL;
  const detail = options.detail ?? true;
  const eroded = options.eroded;
  const w = cols * ppc;
  const h = rows * ppc;
  const { shallowest, deepest } = range;

  const isRock = (i: number) => terrain.ceiling[i]! > terrain.floor[i]!;

  // A scour shades its own cell only, so a pixel asks its own cell's seats.
  const seats = new Map<number, StoneSeat[]>();
  for (const seat of stones) {
    const list = seats.get(seat.cellIndex);
    if (list === undefined) seats.set(seat.cellIndex, [seat]);
    else list.push(seat);
  }

  const clampCol = (c: number) => Math.min(cols - 1, Math.max(0, c));
  const clampRow = (r: number) => Math.min(rows - 1, Math.max(0, r));
  /** Floor at a cell, with rock reading as the asking cell's own floor. */
  const floorAt = (r: number, c: number, homeIndex: number): number => {
    const i = clampRow(r) * cols + clampCol(c);
    return isRock(i) ? terrain.floor[homeIndex]! : terrain.floor[i]!;
  };

  // The pixels asked for, and the one-pixel ring around them that pass 2's
  // gradients read — clamped to the canvas, where the edge pixel reads itself
  // exactly as it always has.
  const x0 = Math.max(0, rect.col0) * ppc;
  const y0 = Math.max(0, rect.row0) * ppc;
  const x1 = Math.min(cols, rect.col1 + 1) * ppc;
  const y1 = Math.min(rows, rect.row1 + 1) * ppc;
  const ex0 = Math.max(0, x0 - 1);
  const ey0 = Math.max(0, y0 - 1);
  const ex1 = Math.min(w, x1 + 1);
  const ey1 = Math.min(h, y1 + 1);
  const ew = ex1 - ex0;

  // Pass 1: the heightfield, so pass 2 can take gradients off it directly, and
  // the authored floor alone beside it, whose slope stays darken-only.
  const height = new Float32Array(ew * (ey1 - ey0));
  const ground = new Float32Array(ew * (ey1 - ey0));
  // Under the study's eroded edges, how much of each pixel is rock: the
  // rim's and the cliff shadow's place, since the face is no longer the edge.
  const share = new Float32Array(ew * (ey1 - ey0));
  // And which side of the drawn rock coast it lies, its fill and its mottle:
  // the study draws stone, water and biome by its rounded edges, not the
  // cells' (docs/map-visuals.md §4, the study's clause).
  const coast = eroded !== undefined ? new Float32Array(ew * (ey1 - ey0)) : null;
  const fills = eroded !== undefined ? new Int32Array(ew * (ey1 - ey0)) : null;
  const mottles = eroded !== undefined ? new Float32Array(ew * (ey1 - ey0)) : null;
  const mPerPx = cellM / ppc;
  for (let py = ey0; py < ey1; py++) {
    // Continuous cell coordinate of this pixel's centre.
    const cy = (py + 0.5) / ppc - 0.5;
    const r0 = Math.floor(cy);
    const fy = cellBlend(cy - r0);
    for (let px = ex0; px < ex1; px++) {
      const cx = (px + 0.5) / ppc - 0.5;
      const c0 = Math.floor(cx);
      const fx = cellBlend(cx - c0);

      const xM = px * mPerPx;
      const yM = py * mPerPx;
      let floor: number;
      // The share of this pixel that is rock, under the study's eroded edges:
      // its detail is the crag's by that share. Rock pixels off the study
      // take the crag alone in pass 2 and read nothing here.
      let rockShare = 0;
      let drawn: ErodedGround | null = null;
      if (eroded !== undefined) {
        drawn = erodedGroundAtM(terrain, eroded.rockTopM, xM, yM);
        floor = drawn.stepM;
        rockShare = drawn.rockWeight;
        const i = (py - ey0) * ew + (px - ex0);
        share[i] = rockShare;
        coast![i] = drawn.coastM;
        fills![i] = drawnFill(drawn.biomeM);
        mottles![i] = drawn.relief.mottle;
        if (eroded.floors !== undefined) eroded.floors[py * w + px] = drawn.floorM;
      } else {
        const homeIndex = clampRow(Math.round(cy)) * cols + clampCol(Math.round(cx));
        const f00 = floorAt(r0, c0, homeIndex);
        const f10 = floorAt(r0, c0 + 1, homeIndex);
        const f01 = floorAt(r0 + 1, c0, homeIndex);
        const f11 = floorAt(r0 + 1, c0 + 1, homeIndex);
        floor = f00 + (f10 - f00) * fx + (f01 + (f11 - f01) * fx - f00 - (f10 - f00) * fx) * fy;
      }

      ground[(py - ey0) * ew + (px - ex0)] = floor;
      if (detail) {
        let open: number;
        if (drawn !== null) open = benchedDetailM(xM, yM, seed, drawn.relief);
        else {
          const relief = reliefAtCell(terrain, cx, cy);
          open = detailM(xM, yM, seed, relief.amplitudeM, relief.roughness, relief.blockiness);
        }
        height[(py - ey0) * ew + (px - ex0)] =
          floor + (1 - rockShare) * open + rockShare * rockDetailM(xM, yM, seed);
      } else {
        height[(py - ey0) * ew + (px - ex0)] = floor;
      }
    }
  }

  // Pass 2: light it. Gradients come off the baked heightfield, converted to
  // metres per 250 m cell so reliefShade's reference scale means what it meant
  // for the vector pass — one tuning, both renderers, and the overview's
  // 1,000 m cells shaded by the same slope as the mission's.
  const outW = x1 - x0;
  const outH = y1 - y0;
  const data = new Uint8ClampedArray(outW * outH * 4);
  const dropScale = (ppc / 2) * (WORLD.DETAIL_CELL_M / cellM);

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
  /**
   * The same two treatments under the study's eroded edges, where the face is
   * no longer on the cell edge but wherever the rock's share runs from 1 to 0:
   * one gain of the share, the rim darkening down the face from its lip and
   * the lee darkening the foot up to the face, darkest where the two meet.
   * The same share gives the same darkening on either side of the cell edge,
   * so the fill is the only thing the edge changes. Both still darken only,
   * and the stone fill stays the cell's, so the coast the ink dashes on the
   * edge is still where the stone begins (docs/art-direction.md "Rock speaks
   * in stone"; docs/map-visuals.md §4).
   */
  const faceGainOf = (rockShare: number) =>
    rockShare >= 0.5
      ? ROCK_EDGE_GAIN + (1 - ROCK_EDGE_GAIN) * smooth(Math.min(1, Math.max(0, 2 * rockShare - 1)))
      : CLIFF_SHADOW_GAIN +
        (1 - CLIFF_SHADOW_GAIN) * smooth(Math.min(1, Math.max(0, 1 - 2 * rockShare)));
  /**
   * Where a rock cell meets the stone over a roofed passage, the share steps
   * from 1 to 0 on the edge (`erodedGroundAtM`), so the face gain has nothing
   * to draw there; the rim keeps its plain treatment against that edge, as
   * the roof's own rim vertices keep theirs (passages.ts), and the two tops
   * meet in one seam. Distance to the nearest roofed cell among the
   * neighbours, in metres, or none.
   */
  const roofedDistM = (xM: number, yM: number, row: number, col: number) => {
    let best = Number.POSITIVE_INFINITY;
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        const i = r * cols + c;
        if (isRock(i) || terrain.ceiling[i]! <= 0) continue;
        const dx = Math.max(c * cellM - xM, 0, xM - (c + 1) * cellM);
        const dy = Math.max(r * cellM - yM, 0, yM - (r + 1) * cellM);
        best = Math.min(best, Math.hypot(dx, dy));
      }
    }
    return best;
  };

  for (let py = y0; py < y1; py++) {
    const row = clampRow(Math.floor(py / ppc));
    for (let px = x0; px < x1; px++) {
      const col = clampCol(Math.floor(px / ppc));
      const index = row * cols + col;
      const j = ((py - y0) * outW + (px - x0)) * 4;
      const xM = px * mPerPx;
      const yM = py * mPerPx;

      let color: number;
      // Under the study the stone is where the drawn coast says, not the cell.
      const stone = coast !== null ? coast[(py - ey0) * ew + (px - ex0)]! >= 0 : isRock(index);
      if (stone) {
        // Rock is not water and is not drawn as any depth of it: no
        // depthShade, no biome hue — the stone ramp under its own hillshade.
        // Gradients come off the rock detail field at bake-pixel step, scaled
        // to metres-per-cell exactly as the water pass scales its own.
        // The crag is all texture: rock has no authored step to keep dark.
        // Under the study's eroded edges the stone has a face as well, set
        // back from the cell edge, and the face's slope is a step that
        // darkens only, as a wall's does across the water.
        let shade: number;
        if (eroded !== undefined) {
          const i = (py - ey0) * ew + (px - ex0);
          shade = reliefTextureGain(
            (ground[i + (px < w - 1 ? 1 : 0)]! - ground[i - (px > 0 ? 1 : 0)]!) * dropScale,
            (ground[i + (py < h - 1 ? ew : 0)]! - ground[i - (py > 0 ? ew : 0)]!) * dropScale,
            (height[i + (px < w - 1 ? 1 : 0)]! - height[i - (px > 0 ? 1 : 0)]!) * dropScale,
            (height[i + (py < h - 1 ? ew : 0)]! - height[i - (py > 0 ? ew : 0)]!) * dropScale
          );
        } else {
          const hL = rockDetailM(xM - mPerPx, yM, seed);
          const hR = rockDetailM(xM + mPerPx, yM, seed);
          const hU = rockDetailM(xM, yM - mPerPx, seed);
          const hD = rockDetailM(xM, yM + mPerPx, seed);
          shade = reliefTextureGain(0, 0, (hR - hL) * dropScale, (hD - hU) * dropScale);
        }
        const texture = Math.min(
          1 + TERRAIN_LIFT.BAKE,
          shade * mottleFactor(xM, yM, seed, ROCK_RELIEF.mottle)
        );
        color = scaleRgb(
          ROCK_FACE,
          texture *
            // The rim: darkened toward ROCK_SHADOW where the mesa meets open
            // water, so a flat top reads as raised ground with an edge.
            (eroded !== undefined
              ? Math.min(
                  faceGainOf(share[(py - ey0) * ew + (px - ex0)]!),
                  edgeGain(roofedDistM(xM, yM, row, col), ROCK_EDGE_M, ROCK_EDGE_GAIN)
                )
              : edgeGain(oppositeDistM(xM, yM, row, col, false), ROCK_EDGE_M, ROCK_EDGE_GAIN))
        );
      } else {
        const i = (py - ey0) * ew + (px - ex0);
        const hL = height[i - (px > 0 ? 1 : 0)]!;
        const hR = height[i + (px < w - 1 ? 1 : 0)]!;
        const hU = height[i - (py > 0 ? ew : 0)]!;
        const hD = height[i + (py < h - 1 ? ew : 0)]!;
        const gL = ground[i - (px > 0 ? 1 : 0)]!;
        const gR = ground[i + (px < w - 1 ? 1 : 0)]!;
        const gU = ground[i - (py > 0 ? ew : 0)]!;
        const gD = ground[i + (py < h - 1 ? ew : 0)]!;
        const biome = terrain.biomes[index] as Biome;
        const base = fills !== null ? fills[i]! : bandedFill(terrain, xM, yM);
        const mottle =
          mottles !== null
            ? mottles[i]!
            : (BIOME_RELIEF[biome] ?? BIOME_RELIEF[Biome.OpenWater]).mottle;
        // The deepest scour wins rather than two stacking, so a cluster's
        // hollow is no darker than one stone's.
        let scour = 1;
        const cellSeats = seats.get(index);
        if (cellSeats !== undefined) {
          const bounds = {
            x0: col * cellM,
            y0: row * cellM,
            x1: (col + 1) * cellM,
            y1: (row + 1) * cellM,
          };
          for (const seat of cellSeats) {
            scour = Math.min(scour, stoneScourGain(xM, yM, seat, bounds));
          }
        }
        // The shape the light finds, then what the surface is made of: both
        // texture, centred on the step, and capped together. Each gain scales
        // all three channels alike, so hue stays the biome's.
        const texture = Math.min(
          1 + TERRAIN_LIFT.BAKE,
          reliefTextureGain(
            (gR - gL) * dropScale,
            (gD - gU) * dropScale,
            (hR - hL) * dropScale,
            (hD - hU) * dropScale
          ) * (detail ? mottleFactor(xM, yM, seed, mottle) : 1)
        );
        color = scaleRgb(
          depthShade(base, height[i]!, shallowest, deepest),
          texture *
            // The wall's lee: open floor darkens where it meets a mesa, so
            // the rock reads as standing on the seabed, not pasted over it.
            (eroded !== undefined
              ? faceGainOf(share[i]!)
              : edgeGain(
                  oppositeDistM(xM, yM, row, col, true),
                  CLIFF_SHADOW_M,
                  CLIFF_SHADOW_GAIN
                )) *
            scour
        );
      }

      data[j] = (color >> 16) & 0xff;
      data[j + 1] = (color >> 8) & 0xff;
      data[j + 2] = color & 0xff;
      data[j + 3] = 255;
    }
  }

  return { x: x0, y: y0, w: outW, h: outH, data };
}

/** Put one shaded rectangle onto the seabed canvas, in place. */
function paintSeabed(canvas: HTMLCanvasElement, pixels: SeabedPixels): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('seabed bake: no 2d context');
  const img = ctx.createImageData(pixels.w, pixels.h);
  img.data.set(pixels.data);
  ctx.putImageData(img, pixels.x, pixels.y);
}

/**
 * Bake the whole seabed to a canvas. `seed` and `range` default to the
 * terrain's own; the view passes the ones it froze at the join so that a
 * later partial rebake shades on exactly the same terms.
 */
export function bakeSeabed(
  terrain: TerrainPayload,
  seed = seabedSeed(terrain),
  range = seabedRange(terrain),
  stones: readonly StoneSeat[] = [],
  options: BakeOptions = {}
): HTMLCanvasElement {
  const ppc = options.pxPerCell ?? SEABED_PX_PER_CELL;
  const canvas = document.createElement('canvas');
  canvas.width = terrain.cols * ppc;
  canvas.height = terrain.rows * ppc;
  paintSeabed(
    canvas,
    shadeSeabed(
      terrain,
      seed,
      range,
      {
        col0: 0,
        row0: 0,
        col1: terrain.cols - 1,
        row1: terrain.rows - 1,
      },
      stones,
      options
    )
  );
  return canvas;
}

/**
 * A rectangle of a skin already baked, copied onto a canvas of its own:
 * `cols` × `rows` cells from `col`, `row` in. A copy, not a shade, so a skin
 * baked once is taken again for the cost of a blit (#1495): the board's
 * baseline detail holds the ground a board launch's session opens on.
 */
export function cutSeabed(
  source: HTMLCanvasElement,
  { col, row, cols, rows }: { col: number; row: number; cols: number; rows: number },
  pxPerCell = SEABED_PX_PER_CELL
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = cols * pxPerCell;
  canvas.height = rows * pxPerCell;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('seabed cut: no 2d context');
  const { width, height } = canvas;
  ctx.drawImage(source, col * pxPerCell, row * pxPerCell, width, height, 0, 0, width, height);
  return canvas;
}

/**
 * TUNABLE — milliseconds of shading a sliced bake spends before it yields:
 * half a 60 Hz frame. It holds a frame for at most that and one slice, and
 * how many slices fit adapts to the machine. A yield after every slice tied
 * the bake to the frame rate instead, since each yield waits out a frame: 360
 * of them, 450 ms each on a software rasteriser, kept the overview's skin off
 * the screen for minutes (#1459).
 */
export const SLICED_BAKE_BUDGET_MS = 8;

/**
 * `bakeSeabed` a slice of `sliceCells` cells of one row at a time, yielding
 * (`yieldTask`) once `SLICED_BAKE_BUDGET_MS` of `now` has passed since the
 * last yield: for a bake too large to hold a frame for, the overview's skin
 * (worldOverview.ts) and a region's detail (`PerspectiveView`, §7.5). A slice
 * shades the pixels a whole bake would, the promise the partial rebake stands
 * on, so the slices add up to exactly it. An aborted `signal` stops it at the
 * next yield, throwing the signal's reason, so a request let go stops shading.
 * `into` paints onto a canvas already baked instead, `col` and `row` cells in
 * from its corner: a mission's skin laid over its region's (#1491).
 */
export async function bakeSeabedInSlices(
  terrain: TerrainPayload,
  seed: number,
  range: SeabedRange,
  options: BakeOptions,
  sliceCells: number,
  yieldTask: () => Promise<void>,
  {
    now = () => performance.now(),
    signal,
    into,
  }: {
    now?: () => number;
    signal?: AbortSignal;
    into?: { canvas: HTMLCanvasElement; col: number; row: number };
  } = {}
): Promise<HTMLCanvasElement> {
  const ppc = options.pxPerCell ?? SEABED_PX_PER_CELL;
  const canvas = into?.canvas ?? document.createElement('canvas');
  if (into === undefined) {
    canvas.width = terrain.cols * ppc;
    canvas.height = terrain.rows * ppc;
  }
  const dx = (into?.col ?? 0) * ppc;
  const dy = (into?.row ?? 0) * ppc;
  signal?.throwIfAborted();
  let since = now();
  for (let row = 0; row < terrain.rows; row++) {
    for (let col0 = 0; col0 < terrain.cols; col0 += sliceCells) {
      const col1 = Math.min(terrain.cols, col0 + sliceCells) - 1;
      const rect = { col0, row0: row, col1, row1: row };
      const pixels = shadeSeabed(terrain, seed, range, rect, [], options);
      paintSeabed(canvas, { ...pixels, x: pixels.x + dx, y: pixels.y + dy });
      if (now() - since < SLICED_BAKE_BUDGET_MS) continue;
      await yieldTask();
      signal?.throwIfAborted();
      since = now();
    }
  }
  return canvas;
}

/**
 * Re-bake the cells a ground delta touched, plus the one-cell ring the
 * shading reaches into, onto the canvas the full bake produced (#434). A
 * collapsed span used to re-bake the whole map — a million pixels for a
 * handful of cells.
 */
export function rebakeSeabedCells(
  canvas: HTMLCanvasElement,
  terrain: TerrainPayload,
  seed: number,
  range: SeabedRange,
  touched: CellRect,
  stones: readonly StoneSeat[] = [],
  options: BakeOptions = {}
): void {
  // The study's rounding reads the cells several away (roundedCells.ts), so
  // under it a delta re-bakes the whole map; its fixture authors none.
  const rect =
    options.eroded !== undefined
      ? { col0: 0, row0: 0, col1: terrain.cols - 1, row1: terrain.rows - 1 }
      : {
          col0: touched.col0 - 1,
          row0: touched.row0 - 1,
          col1: touched.col1 + 1,
          row1: touched.row1 + 1,
        };
  paintSeabed(canvas, shadeSeabed(terrain, seed, range, rect, stones, options));
}
