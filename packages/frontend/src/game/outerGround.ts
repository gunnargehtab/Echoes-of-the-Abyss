/**
 * The ground past the map's edge, at the High graphics quality
 * (docs/art-direction.md, "The crater from above"; #1891).
 *
 * A mission drawn alone ends in the skirt: its ground stops on the map's
 * rectangle and a wall falls away under it (PerspectiveView
 * `buildTerrainDressing`). From the free-water study's survey dolly that is a
 * square tile. This module draws the study's ground on past the edge: the
 * same drawn ground the edge has, read past it, falling away into the deep
 * over `OUTER.REACH_M`, where the water over it has taken it (water.ts
 * `waterColumnDensity`) and the map's floor colour is all that is left.
 *
 * **It is the edge's own ground, and nothing else.** Past the edge the cells
 * are the edge's, held: `erodedGroundAtM` reads its field clamped onto the
 * map, so a floor, a scarp or a kind that meets the edge runs straight out
 * from it. The relief is the same field of position the map's ground reads,
 * so it crosses the edge without a seam, and eases out with the fall. No
 * place is invented out there, and no cell.
 *
 * Render-only, like every heightfield here, and more so: the simulation has
 * no cell past the edge, nothing out there can be detected, an order's click
 * is clamped onto the map as it always was (`PerspectiveView.resolveGround`),
 * and the survey draws no ink on it, since the chart ends at the rim. Pure
 * data, no three.js, so it runs under node. Every number is TUNABLE in
 * `HIGH_GRAPHICS.CRATER.OUTER` until a frame of it is accepted.
 */

import { DEPTH, HIGH_GRAPHICS } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { ROCK_FACE } from './palette.ts';
import {
  depthToWorldY,
  rockSurfaceDepthM,
  type EdgePoint,
  type HeightGrid,
} from './perspectiveTerrain.ts';
import {
  benchedDetailM,
  drawnFill,
  erodedGroundAtM,
  mottleFactor,
  ROCK_RELIEF,
  writeLit,
  type ErodedGround,
  type LitBake,
} from './seabed.ts';

const smooth = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** How far a point lies past the map's edge, metres: 0 on the map. */
export function pastEdgeM(terrain: TerrainPayload, xM: number, zM: number): number {
  const widthM = terrain.cols * terrain.cellM;
  const heightM = terrain.rows * terrain.cellM;
  return Math.hypot(Math.max(-xM, 0, xM - widthM), Math.max(-zM, 0, zM - heightM));
}

/**
 * The drawn ground's depth at a point on or past the map's edge, metres.
 *
 * On the edge it is the map's own drawn ground to the bit
 * (perspectiveTerrain.ts `seabedDepthAtM`, eroded), so the two meshes share
 * that line. Past it the step falls from the edge's own depth to the map's
 * floor, level at both ends so neither the edge nor the foot is a crease, and
 * the relief eases out between `RELIEF_M`'s two distances: the far rings are
 * too coarse to carry it, and too deep to show it.
 */
export function outerDepthAtM(
  terrain: TerrainPayload,
  seed: number,
  rockTopM: number,
  xM: number,
  zM: number
): number {
  return fallen(terrain, seed, rockTopM, xM, zM, erodedGroundAtM(terrain, rockTopM, xM, zM));
}

/** `outerDepthAtM` of a drawn ground already read at the point. */
function fallen(
  terrain: TerrainPayload,
  seed: number,
  rockTopM: number,
  xM: number,
  zM: number,
  ground: Pick<ErodedGround, 'stepM' | 'rockWeight' | 'relief'>
): number {
  const { REACH_M, RELIEF_M } = HIGH_GRAPHICS.CRATER.OUTER;
  const { stepM, rockWeight, relief } = ground;
  const past = pastEdgeM(terrain, xM, zM);
  const keep = 1 - smooth((past - RELIEF_M[0]) / (RELIEF_M[1] - RELIEF_M[0]));
  // Past where the relief has eased out, neither field is read.
  let detail = 0;
  if (keep > 0) {
    const open = benchedDetailM(xM, zM, seed, relief);
    const crag = rockSurfaceDepthM(seed, rockTopM, xM, zM) - rockTopM;
    detail = ((1 - rockWeight) * open + rockWeight * crag) * keep;
  }
  const fall = smooth(past / REACH_M);
  return Math.max(0, stepM + detail + (DEPTH.MAX_M - stepM) * fall);
}

/** One axis of the outer mesh: the rings out to the reach, the map's own vertices, the rings again. */
function axis(verts: number, stepM: number): number[] {
  const rings = HIGH_GRAPHICS.CRATER.OUTER.RINGS_M;
  const lengthM = (verts - 1) * stepM;
  const at: number[] = [];
  for (let k = rings.length - 1; k >= 0; k--) at.push(-rings[k]!);
  for (let i = 0; i < verts; i++) at.push(i * stepM);
  for (const ring of rings) at.push(lengthM + ring);
  return at;
}

export interface OuterMesh {
  positions: Float32Array;
  /** Over the outer bake's square, `outerFrame`: 0 and 1 at its edges. */
  uvs: Float32Array;
  indices: Uint32Array;
  triangles: number;
  /** The mesh's own outer boundary, walked once round as `edgeRing` walks the map's. */
  rim: EdgePoint[];
}

/** The square the outer bake covers, in the map's metres: the map and the reach round it. */
export function outerFrame(terrain: TerrainPayload): { x0M: number; z0M: number; sideM: number } {
  const { REACH_M } = HIGH_GRAPHICS.CRATER.OUTER;
  const widthM = terrain.cols * terrain.cellM;
  const heightM = terrain.rows * terrain.cellM;
  // One square texture: a map that is not square is centred in it.
  const sideM = Math.max(widthM, heightM) + 2 * REACH_M;
  return { x0M: (widthM - sideM) / 2, z0M: (heightM - sideM) / 2, sideM };
}

/**
 * The outer ground's mesh: a ring of quads round the map, out to the reach.
 *
 * Along the edge it keeps the map's own vertices, at the map grid's own
 * heights, so the two meshes meet on one line with neither a crack nor a
 * T-junction. Outward it steps by `RINGS_M`, close by the edge where the
 * relief still stands and wide where the fall has smoothed it.
 */
export function outerMesh(
  terrain: TerrainPayload,
  grid: HeightGrid,
  seed: number,
  rockTopM: number
): OuterMesh {
  const rings = HIGH_GRAPHICS.CRATER.OUTER.RINGS_M.length;
  const xs = axis(grid.vertsX, grid.stepM);
  const zs = axis(grid.vertsZ, grid.stepM);
  const frame = outerFrame(terrain);
  // A vertex strictly inside the map belongs to the map's mesh alone.
  const inside = (i: number, j: number) =>
    i > rings && i < rings + grid.vertsX - 1 && j > rings && j < rings + grid.vertsZ - 1;
  const onMap = (i: number, j: number) =>
    i >= rings && i <= rings + grid.vertsX - 1 && j >= rings && j <= rings + grid.vertsZ - 1;
  const index = new Int32Array(xs.length * zs.length).fill(-1);
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let j = 0; j < zs.length; j++) {
    for (let i = 0; i < xs.length; i++) {
      if (inside(i, j)) continue;
      const x = xs[i]!;
      const z = zs[j]!;
      const y = onMap(i, j)
        ? grid.y[(j - rings) * grid.vertsX + (i - rings)]!
        : depthToWorldY(outerDepthAtM(terrain, seed, rockTopM, x, z));
      index[j * xs.length + i] = positions.length / 3;
      positions.push(x, y, z);
      uvs.push((x - frame.x0M) / frame.sideM, (z - frame.z0M) / frame.sideM);
    }
  }
  const quads: number[] = [];
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      // A quad with all four corners on the map is the map's.
      if (onMap(i, j) && onMap(i + 1, j + 1)) continue;
      const a = index[j * xs.length + i]!;
      const b = index[j * xs.length + i + 1]!;
      const c = index[(j + 1) * xs.length + i]!;
      const d = index[(j + 1) * xs.length + i + 1]!;
      quads.push(a, c, b, b, c, d);
    }
  }
  const rim: EdgePoint[] = [];
  const at = (i: number, j: number) => {
    const v = index[j * xs.length + i]! * 3;
    rim.push({ x: positions[v]!, y: positions[v + 1]!, z: positions[v + 2]! });
  };
  for (let i = 0; i < xs.length; i++) at(i, 0);
  for (let j = 1; j < zs.length; j++) at(xs.length - 1, j);
  for (let i = xs.length - 2; i >= 0; i--) at(i, zs.length - 1);
  for (let j = zs.length - 2; j >= 1; j--) at(0, j);
  return {
    positions: Float32Array.from(positions),
    uvs: Float32Array.from(uvs),
    indices: Uint32Array.from(quads),
    triangles: quads.length / 3,
    rim,
  };
}

/**
 * Bake the outer ground's lit pixels: the albedo, and the slope and occlusion
 * beside it, as the map's bake writes its own (seabed.ts `BakeOptions.lit`),
 * over `outerFrame`'s square at `sidePx` a side. The fill is the drawn
 * ground's at the point, which past the edge is the edge's; the mottle and
 * the slope are read at the point itself, so they cross the edge as the
 * relief does. No rim and no lee are darkened out here: those are a cliff's,
 * and the wall shade that stands in for them at the crater's scale is the
 * map's (lidShade.ts). A pixel well inside the map is left unwritten, since
 * the outer mesh never draws it.
 */
export function bakeOuterLit(
  terrain: TerrainPayload,
  seed: number,
  rockTopM: number,
  lit: LitBake,
  sidePx: number
): void {
  const frame = outerFrame(terrain);
  const mPerPx = frame.sideM / sidePx;
  const widthM = terrain.cols * terrain.cellM;
  const heightM = terrain.rows * terrain.cellM;
  // Filtering at the map's edge reads a few pixels in from it.
  const marginM = 4 * mPerPx;
  // The mesh draws no pixel well inside the map; one more ring is read for
  // the slopes of the pixels it does.
  const within = (px: number, py: number, padPx: number): boolean => {
    const x = frame.x0M + (px + 0.5) * mPerPx;
    const z = frame.z0M + (py + 0.5) * mPerPx;
    const m = marginM + padPx * mPerPx;
    return !(x > m && x < widthM - m && z > m && z < heightM - m);
  };
  // One read of the drawn ground a pixel: its depth, and its fill and mottle.
  const depth = new Float32Array(sidePx * sidePx);
  const fills = new Int32Array(sidePx * sidePx);
  const mottles = new Float32Array(sidePx * sidePx);
  for (let py = 0; py < sidePx; py++) {
    for (let px = 0; px < sidePx; px++) {
      if (!within(px, py, 1)) continue;
      const x = frame.x0M + (px + 0.5) * mPerPx;
      const z = frame.z0M + (py + 0.5) * mPerPx;
      const ground = erodedGroundAtM(terrain, rockTopM, x, z);
      const stone = ground.coastM >= 0;
      const i = py * sidePx + px;
      fills[i] = stone ? ROCK_FACE : drawnFill(ground.biomeM);
      mottles[i] = mottleFactor(x, z, seed, stone ? ROCK_RELIEF.mottle : ground.relief.mottle);
      depth[i] = fallen(terrain, seed, rockTopM, x, z, ground);
    }
  }
  const depthAt = (px: number, py: number): number =>
    depth[Math.min(sidePx - 1, Math.max(0, py)) * sidePx + Math.min(sidePx - 1, Math.max(0, px))]!;
  for (let py = 0; py < sidePx; py++) {
    for (let px = 0; px < sidePx; px++) {
      if (!within(px, py, 0)) continue;
      const i = py * sidePx + px;
      writeLit(
        lit,
        i * 4,
        fills[i]!,
        mottles[i]!,
        depthAt(px + 1, py) - depthAt(px - 1, py),
        depthAt(px, py + 1) - depthAt(px, py - 1),
        mPerPx,
        1
      );
    }
  }
}
