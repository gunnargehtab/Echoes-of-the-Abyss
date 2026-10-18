/**
 * The Rift at overview detail — docs/world-map.md §7.3 (#1459).
 *
 * The whole atlas, 40 × 90 km at 1,000 m cells, drawn round a placed
 * mission's detail so the world goes on past the surround. Pure data, with no
 * three.js at runtime, like perspectiveTerrain.ts: the vertex grid, its
 * triangles with the detail cut out, the drawn surface's depth at a point,
 * and the seam band where the detail eases into it.
 *
 * - **Atlas metres.** The grid is built in §7.2's frame and never moved. A
 *   view places it with its mesh's transform, so the data is the same for
 *   every region: a session changes where it stands and what it leaves out,
 *   never its ground.
 * - **Smooth relief.** Heights are the authored floor between cell centres and
 *   nothing else, at two vertices a cell (the owner's call on #1459): at
 *   1,000 m cells the detail field is finer than a vertex.
 * - **Render-only**, by perspectiveTerrain.ts's rule. Nothing out here is
 *   simulated, heard or ordered into (§7.1).
 */

import { RIFT_GROUND, WORLD, paintGround, type PlanPoint, type PlanRect } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { authoredFloorAtM, depthToWorldY, type HeightGrid } from './perspectiveTerrain.ts';
import { bakeSeabedInSlices, seabedRange, seabedSeed } from './seabed.ts';
import type { SeamHeight } from './worldBorder.ts';

/**
 * TUNABLE — vertices per overview cell side. Two is a 500 m step and about
 * 29k triangles for the whole atlas (the owner's call on #1459, over one at
 * 7k and four at 115k).
 */
export const OVERVIEW_VERTS_PER_CELL = 2;

/**
 * TUNABLE — the overview skin's density. 16 px across a 1,000 m cell is
 * 62.5 m/px: about a pixel a texel with the whole Rift in a frame, in a
 * 640 × 1,440 bake.
 */
export const OVERVIEW_PX_PER_CELL = 16;

/**
 * §7.3's seam band, derived: the detail's last 500 m hold the overview's own
 * cells, and the surround is 500 m wider than §7.4's fade to make room for
 * them. Across it the detail eases into the overview, and meets it exactly on
 * the seam (the owner's call on #1459).
 */
export const SEAM_BAND_M = WORLD.DETAIL_SURROUND_M - WORLD.FADE_M;

let terrainOnce: TerrainPayload | null = null;
let gridOnce: HeightGrid | null = null;
let skinOnce: Promise<HTMLCanvasElement> | null = null;

/** The atlas's cells as a terrain payload: painted once a page, shared by every view. */
export function overviewTerrain(): TerrainPayload {
  if (terrainOnce === null) {
    const cells = paintGround(RIFT_GROUND);
    terrainOnce = {
      cols: cells.cols,
      rows: cells.rows,
      cellM: cells.cellM,
      biomes: Array.from(cells.biomes),
      floor: Array.from(cells.floor),
      ceiling: Array.from(cells.ceiling),
    };
  }
  return terrainOnce;
}

/**
 * The overview's vertex grid in atlas metres, north to south, as
 * `buildHeightGrid` lays a mission's out. `floor` is the authored floor and
 * `y` the same through `depthToWorldY`, since no detail field is added.
 */
export function buildOverviewGrid(terrain: TerrainPayload): HeightGrid {
  const vertsX = terrain.cols * OVERVIEW_VERTS_PER_CELL + 1;
  const vertsZ = terrain.rows * OVERVIEW_VERTS_PER_CELL + 1;
  const stepM = terrain.cellM / OVERVIEW_VERTS_PER_CELL;
  const y = new Float32Array(vertsX * vertsZ);
  const floor = new Float32Array(vertsX * vertsZ);
  for (let iz = 0; iz < vertsZ; iz++) {
    for (let ix = 0; ix < vertsX; ix++) {
      const depthM = authoredFloorAtM(terrain, ix * stepM, iz * stepM);
      floor[iz * vertsX + ix] = depthM;
      y[iz * vertsX + ix] = depthToWorldY(depthM);
    }
  }
  return {
    vertsX,
    vertsZ,
    stepM,
    y,
    floor,
    widthM: terrain.cols * terrain.cellM,
    heightM: terrain.rows * terrain.cellM,
  };
}

/** The atlas's grid, built once a page. */
export function overviewGrid(): HeightGrid {
  gridOnce ??= buildOverviewGrid(overviewTerrain());
  return gridOnce;
}

/**
 * TUNABLE — cells of one row the skin's bake shades between looks at its
 * budget: ten is 2,560 px, about a millisecond, so a yield comes at most a
 * slice after `SLICED_BAKE_BUDGET_MS` runs out.
 */
export const OVERVIEW_SLICE_CELLS = 10;

/**
 * The atlas's skin, baked once a page: the mission bake's code at
 * `OVERVIEW_PX_PER_CELL` and without the detail field, on the atlas's own
 * seed and depth range. Whole, it is about half a second of shading, so it is
 * taken in slices with a task's yield (`yieldTask`) whenever the bake's
 * budget runs out (`bakeSeabedInSlices`), and a view draws the overview once
 * it lands. A bake that fails is not retried: the page draws no overview, and
 * the apron keeps its own colour, its last 500 m feathered to the backdrop as
 * on #1461 (docs/world-map.md §7.8).
 */
export function overviewSkin(
  yieldTask: () => Promise<void> = () => new Promise((resolve) => setTimeout(resolve, 0))
): Promise<HTMLCanvasElement> {
  if (skinOnce === null) {
    const terrain = overviewTerrain();
    skinOnce = bakeSeabedInSlices(
      terrain,
      seabedSeed(terrain),
      seabedRange(terrain),
      { pxPerCell: OVERVIEW_PX_PER_CELL, detail: false },
      OVERVIEW_SLICE_CELLS,
      yieldTask
    );
  }
  return skinOnce;
}

/** The grid's vertices as a position attribute, with uvs across the atlas. */
export function overviewVertices(grid: HeightGrid): {
  positions: Float32Array;
  uvs: Float32Array;
} {
  const { vertsX, vertsZ, stepM } = grid;
  const positions = new Float32Array(vertsX * vertsZ * 3);
  const uvs = new Float32Array(vertsX * vertsZ * 2);
  for (let iz = 0; iz < vertsZ; iz++) {
    for (let ix = 0; ix < vertsX; ix++) {
      const i = iz * vertsX + ix;
      positions[i * 3] = ix * stepM;
      positions[i * 3 + 1] = grid.y[i]!;
      positions[i * 3 + 2] = iz * stepM;
      uvs[i * 2] = (ix * stepM) / grid.widthM;
      uvs[i * 2 + 1] = (iz * stepM) / grid.heightM;
    }
  }
  return { positions, uvs };
}

const holds = (rect: PlanRect, xM: number, yM: number) =>
  xM > rect.x && xM < rect.x + rect.widthM && yM > rect.y && yM < rect.y + rect.heightM;

/**
 * The overview's triangles, written into `out` from its start: two a quad,
 * split as the mission mesh splits them, with every quad inside a hole left
 * out, since the detail drawn there owns it (§7.3, "Seam"). Holes are in atlas
 * metres and fall on grid lines, so a quad is wholly in or wholly out. Returns
 * how many indices were written; `out` is sized for the whole grid, so the
 * view keeps one index buffer and moves its draw range.
 */
export function overviewIndices(
  grid: HeightGrid,
  holes: readonly PlanRect[],
  out: Uint32Array = new Uint32Array((grid.vertsX - 1) * (grid.vertsZ - 1) * 6)
): number {
  const { vertsX, vertsZ, stepM } = grid;
  let k = 0;
  for (let iz = 0; iz < vertsZ - 1; iz++) {
    for (let ix = 0; ix < vertsX - 1; ix++) {
      const cx = (ix + 0.5) * stepM;
      const cz = (iz + 0.5) * stepM;
      if (holes.some((hole) => holds(hole, cx, cz))) continue;
      const a = iz * vertsX + ix;
      const b = a + 1;
      const c = a + vertsX;
      const d = c + 1;
      out[k++] = a;
      out[k++] = c;
      out[k++] = b;
      out[k++] = b;
      out[k++] = c;
      out[k++] = d;
    }
  }
  return k;
}

/**
 * The drawn overview's depth at an atlas point, in metres: the triangle under
 * it, interpolated as the mesh draws it, so a ray that meets the mesh and this
 * agree. Clamped onto the atlas. The quad's diagonal runs from its north-east
 * corner to its south-west one, as `overviewIndices` cuts it.
 */
export function overviewDepthAtM(grid: HeightGrid, xM: number, yM: number): number {
  const { vertsX, vertsZ, stepM, floor } = grid;
  const gx = Math.min(vertsX - 1, Math.max(0, xM / stepM));
  const gz = Math.min(vertsZ - 1, Math.max(0, yM / stepM));
  const ix = Math.min(vertsX - 2, Math.floor(gx));
  const iz = Math.min(vertsZ - 2, Math.floor(gz));
  const fx = gx - ix;
  const fz = gz - iz;
  const a = floor[iz * vertsX + ix]!;
  const b = floor[iz * vertsX + ix + 1]!;
  const c = floor[(iz + 1) * vertsX + ix]!;
  const d = floor[(iz + 1) * vertsX + ix + 1]!;
  if (fx + fz <= 1) return a + (b - a) * fx + (c - a) * fz;
  return d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}

/**
 * How far into the seam band a point stands: 1 on the detail rectangle's
 * edge and past it, easing to 0 at `SEAM_BAND_M` inside, by the same cubic as
 * §7.4's fade. A vertex on the edge takes the overview's height outright, so
 * the two meshes meet on that line without a crack.
 */
export function seamWeight(detail: PlanRect, xM: number, yM: number): number {
  const inside = Math.min(
    xM - detail.x,
    detail.x + detail.widthM - xM,
    yM - detail.y,
    detail.y + detail.heightM - yM
  );
  if (inside <= 0) return 1;
  if (inside >= SEAM_BAND_M) return 0;
  const t = inside / SEAM_BAND_M;
  return 1 - t * t * (3 - 2 * t);
}

/**
 * The seam band's heights for one placed region: an apron vertex eased from
 * its own world Y to the overview's drawn surface by how far into the band it
 * stands. `origin` is the region's north-west corner in atlas metres and
 * `detail` its detail rectangle in the mission's; points come in the
 * mission's metres, as the apron's vertices are laid.
 */
export function seamHeightFor(
  origin: PlanPoint,
  detail: PlanRect,
  grid: HeightGrid = overviewGrid()
): SeamHeight {
  return (xM, zM, y) => {
    const w = seamWeight(detail, xM, zM);
    if (w === 0) return y;
    return y + (depthToWorldY(overviewDepthAtM(grid, xM + origin.x, zM + origin.y)) - y) * w;
  };
}

const glslFloat = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);

/**
 * `seamWeight` in GLSL, its shader twin: `uDetailRect` is the detail
 * rectangle as x, y, width, height, in the same metres as the point.
 */
export const SEAM_WEIGHT_GLSL = `
uniform vec4 uDetailRect;
float echoesSeamWeight(vec2 p) {
  vec2 lo = uDetailRect.xy;
  vec2 hi = uDetailRect.xy + uDetailRect.zw;
  float inside = min(min(p.x - lo.x, hi.x - p.x), min(p.y - lo.y, hi.y - p.y));
  return 1.0 - smoothstep(0.0, ${glslFloat(SEAM_BAND_M)}, inside);
}
`;
