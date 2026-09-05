/**
 * The heightfield the perspective viewport stands on — docs/three-layer-ocean.md §5.
 *
 * Pure data: no three.js in here, so the grid is testable under node and the
 * geometry layer stays a dumb consumer. The heights come from the same two
 * ingredients the seabed bake lights (seabed.ts): the authored floor,
 * bilinearly upsampled with rock neighbours clamped, plus the deterministic
 * per-biome detail field. The bake remains the visual truth for *colour*; this
 * grid is the same ground given shape, and the two agree because they read the
 * same functions with the same seed.
 *
 * The hard boundaries are seabed.ts's, restated because a mesh makes them
 * easier to forget than a texture did:
 *
 * - **Render-only.** The simulation never reads these heights. Collision truth
 *   stays the authored cell grid on the server; a visual slope between two
 *   cells never opens a route the grid refuses (docs/three-layer-ocean.md §5).
 * - **Deterministic.** Seeded from the terrain payload, like the bake.
 * - **Vertical scale is presentation.** Depth spans (hundreds to thousands of
 *   metres) sit under a map only a few kilometres across; drawn 1:1 the relief
 *   would wall off the view. The compression factor below is a look, not a
 *   fact, and nothing may ever measure through it.
 */

import type { TerrainPayload } from '../net/GameClient.ts';
import { Biome } from '@echoes/shared';
import { BIOME_RELIEF, detailM, rockDetailM, seabedSeed } from './seabed.ts';

/**
 * TUNABLE — metres of world height per metre of depth. 0.22 keeps a full
 * Shelf-to-Abyssal map (~2,600 m of span) inside ~570 world metres of relief:
 * deep trenches read as deep, and the far wall of one still fits under a
 * 55° camera. Render-only by the rule above.
 */
export const DEPTH_VISUAL_M_PER_M = 0.22;

/**
 * TUNABLE — mesh density. 4 vertex steps across a 250 m cell is one vertex
 * every 62.5 m: enough for the detail field's 140 m octave to read as shape,
 * while a 32×32-cell map stays a 129×129 grid (~16k vertices, one draw call).
 */
export const VERTS_PER_CELL = 4;

/**
 * TUNABLE — how far above the map's shallowest open floor a rock mass tops
 * out, in metres of depth. Rock is solid from ceiling to floor, so it reads
 * as ground risen *above* the water around it — a wall, not a plateau of
 * seabed — without extruding every collapsed span into a skyscraper.
 */
export const ROCK_RISE_ABOVE_SHALLOWEST_M = 150;

/** Depth in metres → world Y (three.js up axis). Presentation arithmetic only. */
export function depthToWorldY(depthM: number): number {
  return -depthM * DEPTH_VISUAL_M_PER_M;
}

const isRock = (terrain: TerrainPayload, index: number) =>
  terrain.ceiling[index]! > terrain.floor[index]!;

/** The map's open-water depth range, rock excluded — the same scan the bake runs. */
export function openFloorRange(terrain: TerrainPayload): { shallowest: number; deepest: number } {
  let shallowest = Number.POSITIVE_INFINITY;
  let deepest = 0;
  for (let i = 0; i < terrain.floor.length; i++) {
    if (isRock(terrain, i)) continue;
    const f = terrain.floor[i]!;
    if (f < shallowest) shallowest = f;
    if (f > deepest) deepest = f;
  }
  // A map with no water is degenerate; keep the arithmetic finite anyway.
  if (!Number.isFinite(shallowest)) return { shallowest: 0, deepest: 0 };
  return { shallowest, deepest };
}

/** The depth rock masses top out at. Shallower than any open floor, never above 0. */
export function rockTopDepthM(terrain: TerrainPayload): number {
  return Math.max(0, openFloorRange(terrain).shallowest - ROCK_RISE_ABOVE_SHALLOWEST_M);
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Seabed depth at a world position, in metres: the authored floor bilinearly
 * upsampled (rock and off-map neighbours reading as the home cell's floor,
 * exactly as the bake's `floorAt` does) plus the biome-weighted detail field.
 * Positions whose nearest cell is rock return the rock top plus the rock
 * detail field — a craggy wall face, not a floor. The crag is bounded by
 * `ROCK_RELIEF.amplitudeM` < `ROCK_RISE_ABOVE_SHALLOWEST_M`, so a mesa's
 * lowest notch still stands above every open floor, and clamped at the
 * surface so no spire ever pierces depth 0.
 */
export function seabedDepthAtM(
  terrain: TerrainPayload,
  seed: number,
  rockTopM: number,
  xM: number,
  yM: number
): number {
  const { cols, rows, cellM } = terrain;
  const clampCol = (c: number) => Math.min(cols - 1, Math.max(0, c));
  const clampRow = (r: number) => Math.min(rows - 1, Math.max(0, r));

  const cx = xM / cellM - 0.5;
  const cy = yM / cellM - 0.5;
  const c0 = Math.floor(cx);
  const r0 = Math.floor(cy);
  const fx = smooth(cx - c0);
  const fy = smooth(cy - r0);

  const homeIndex = clampRow(Math.round(cy)) * cols + clampCol(Math.round(cx));
  if (isRock(terrain, homeIndex)) return Math.max(0, rockTopM + rockDetailM(xM, yM, seed));

  const floorAt = (r: number, c: number): number => {
    const i = clampRow(r) * cols + clampCol(c);
    return isRock(terrain, i) ? terrain.floor[homeIndex]! : terrain.floor[i]!;
  };
  const f00 = floorAt(r0, c0);
  const f10 = floorAt(r0, c0 + 1);
  const f01 = floorAt(r0 + 1, c0);
  const f11 = floorAt(r0 + 1, c0 + 1);
  const floor = f00 + (f10 - f00) * fx + (f01 + (f11 - f01) * fx - f00 - (f10 - f00) * fx) * fy;

  const relief = BIOME_RELIEF[terrain.biomes[homeIndex] as Biome] ?? BIOME_RELIEF[Biome.OpenWater];
  return floor + detailM(xM, yM, seed, relief.amplitudeM, relief.roughness, relief.blockiness);
}

export interface HeightGrid {
  /** Vertices per side: `cols * VERTS_PER_CELL + 1` × `rows * VERTS_PER_CELL + 1`. */
  vertsX: number;
  vertsZ: number;
  /** World-metre step between vertices. */
  stepM: number;
  /** World Y per vertex, row-major, already through `depthToWorldY`. */
  y: Float32Array;
  widthM: number;
  heightM: number;
}

/**
 * The whole map as a vertex grid, ready to become a BufferGeometry. Row-major
 * north to south, matching the seabed bake's canvas rows, so `u = x / widthM`
 * and `v = z / heightM` with an unflipped texture line the two up.
 */
export function buildHeightGrid(
  terrain: TerrainPayload,
  seed = seabedSeed(terrain),
  rockTop = rockTopDepthM(terrain)
): HeightGrid {
  const vertsX = terrain.cols * VERTS_PER_CELL + 1;
  const vertsZ = terrain.rows * VERTS_PER_CELL + 1;
  const stepM = terrain.cellM / VERTS_PER_CELL;
  const y = new Float32Array(vertsX * vertsZ);
  for (let iz = 0; iz < vertsZ; iz++) {
    for (let ix = 0; ix < vertsX; ix++) {
      y[iz * vertsX + ix] = depthToWorldY(
        seabedDepthAtM(terrain, seed, rockTop, ix * stepM, iz * stepM)
      );
    }
  }
  return {
    vertsX,
    vertsZ,
    stepM,
    y,
    widthM: terrain.cols * terrain.cellM,
    heightM: terrain.rows * terrain.cellM,
  };
}

/**
 * Recompute the vertices a ground delta moved, in place (#434).
 *
 * The heightfield interpolates the floor between cell centres and the rock
 * relief reaches one cell past its own edge, so a changed cell moves every
 * vertex within one cell of it and none further: the touched rectangle plus
 * a one-cell ring is recomputed, and the rest of the grid is left exactly as
 * the full build made it. With the same seed and rock top, the result is the
 * grid a full rebuild would produce — which the tests hold — for a fraction
 * of the 16k vertices a whole-map rebuild walks. Returns the vertex index
 * range that changed, for a caller that uploads only that span.
 */
export function patchHeightGrid(
  grid: HeightGrid,
  terrain: TerrainPayload,
  seed: number,
  rockTop: number,
  touched: { col0: number; row0: number; col1: number; row1: number }
): { first: number; last: number } {
  const ix0 = Math.max(0, (touched.col0 - 1) * VERTS_PER_CELL);
  const iz0 = Math.max(0, (touched.row0 - 1) * VERTS_PER_CELL);
  const ix1 = Math.min(grid.vertsX - 1, (touched.col1 + 2) * VERTS_PER_CELL);
  const iz1 = Math.min(grid.vertsZ - 1, (touched.row1 + 2) * VERTS_PER_CELL);
  for (let iz = iz0; iz <= iz1; iz++) {
    for (let ix = ix0; ix <= ix1; ix++) {
      grid.y[iz * grid.vertsX + ix] = depthToWorldY(
        seabedDepthAtM(terrain, seed, rockTop, ix * grid.stepM, iz * grid.stepM)
      );
    }
  }
  return { first: iz0 * grid.vertsX + ix0, last: iz1 * grid.vertsX + ix1 };
}
