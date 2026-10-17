/**
 * The mission border in the continuous world — docs/world-map.md §7.3–§7.4
 * (#1461).
 *
 * Inside a placed mission the border is a fade into darkness, not a wall: the
 * ground goes on past the edge, and the exterior falls to the backdrop's
 * darkness over §7.4's W by plan distance alone, whatever the eye is doing.
 * This module is the data half of that, with no three.js in it so it can be
 * tested under node: the exterior ground the fade acts on, and the GLSL that
 * states the fade.
 *
 * **The exterior is an apron of the map's own base ground** until #1457
 * authors the surround (the owner's call on #1461): the region the map paints
 * first, at its base floor — for Sorrowgate the Districts' Coral Ruins at
 * 1,600 m — continued over §7.3's 2,500 m. Nothing is invented: the cells are
 * the map literal's own base, and the mission's cells are pasted in the middle
 * so the apron's relief and skin run continuously into the mission's.
 *
 * Render-only, like every heightfield here. The simulation never reads the
 * apron, nothing out there can be detected, and a click on it is refused
 * (`PerspectiveView.refusesPick`).
 */

import {
  SORROWGATE_GROUND,
  WORLD,
  detailRect,
  type Biome,
  type MapGround,
  type PlanRect,
  type WorldRegion,
} from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import type { HeightGrid } from './perspectiveTerrain.ts';

/** The public ground of each placed map, by map id (`@echoes/shared/ground`). */
const PLACED_GROUND: Readonly<Record<string, MapGround>> = {
  sorrowgate: SORROWGATE_GROUND,
};

/** The ground an apron is made of: the map's first region, at the map's base floor. */
export interface ApronBase {
  biome: Biome;
  floorM: number;
}

export function apronBaseFor(mapId: string): ApronBase | null {
  const ground = PLACED_GROUND[mapId];
  const first = ground?.regions[0];
  if (ground === undefined || first === undefined) return null;
  return { biome: first.biome, floorM: ground.floorM };
}

/** How many cells the surround adds on each side of the mission. */
export interface ApronPads {
  west: number;
  north: number;
  east: number;
  south: number;
}

/**
 * §7.3's detail rectangle in the mission's own metres, and the cells it adds
 * on each side. The rectangle is grown to the overview grid, so the pads can
 * differ side to side; Sorrowgate's are ten cells all round.
 */
export function apronFrame(
  region: WorldRegion,
  cellM: number
): { rect: PlanRect; pads: ApronPads } {
  const detail = detailRect(region);
  const rect = {
    x: detail.x - region.x,
    y: detail.y - region.y,
    widthM: detail.widthM,
    heightM: detail.heightM,
  };
  return {
    rect,
    pads: {
      west: Math.round(-rect.x / cellM),
      north: Math.round(-rect.y / cellM),
      east: Math.round((rect.x + rect.widthM - region.widthM) / cellM),
      south: Math.round((rect.y + rect.heightM - region.heightM) / cellM),
    },
  };
}

/**
 * The mission's cells pasted into a field of base ground, `pads` cells wide on
 * each side. A payload of the shape every ground function already takes, so
 * the apron is lit, relieved and skinned by the same code as the mission.
 */
export function paddedTerrain(
  mission: TerrainPayload,
  pads: ApronPads,
  base: ApronBase
): TerrainPayload {
  const cols = mission.cols + pads.west + pads.east;
  const rows = mission.rows + pads.north + pads.south;
  const biomes = new Array<number>(cols * rows).fill(base.biome);
  const floor = new Array<number>(cols * rows).fill(base.floorM);
  const ceiling = new Array<number>(cols * rows).fill(0);
  for (let row = 0; row < mission.rows; row++) {
    for (let col = 0; col < mission.cols; col++) {
      const from = row * mission.cols + col;
      const to = (row + pads.north) * cols + col + pads.west;
      biomes[to] = mission.biomes[from]!;
      floor[to] = mission.floor[from]!;
      ceiling[to] = mission.ceiling[from]!;
    }
  }
  return { ...mission, cols, rows, biomes, floor, ceiling };
}

/**
 * The apron's mesh: the padded grid's vertices in the mission's metres, with
 * every quad inside the mission left out, since the mission's own mesh draws
 * those. Vertices on the mission's edge take the mission grid's heights, not
 * the padded grid's — the padded grid sees base ground past the edge where the
 * mission grid saw its own edge cells — so the two meshes share that line
 * exactly and the seam cannot crack.
 */
export function apronMesh(
  padded: HeightGrid,
  mission: HeightGrid,
  pads: ApronPads,
  cellM: number
): { positions: Float32Array; uvs: Float32Array; indices: Uint32Array; triangles: number } {
  const { vertsX, vertsZ, stepM } = padded;
  const perCell = Math.round(cellM / stepM);
  const ox = pads.west * perCell;
  const oz = pads.north * perCell;
  const positions = new Float32Array(vertsX * vertsZ * 3);
  const uvs = new Float32Array(vertsX * vertsZ * 2);
  for (let iz = 0; iz < vertsZ; iz++) {
    for (let ix = 0; ix < vertsX; ix++) {
      const i = iz * vertsX + ix;
      const mx = ix - ox;
      const mz = iz - oz;
      const onMission = mx >= 0 && mx < mission.vertsX && mz >= 0 && mz < mission.vertsZ;
      positions[i * 3] = mx * stepM;
      positions[i * 3 + 1] = onMission ? mission.y[mz * mission.vertsX + mx]! : padded.y[i]!;
      positions[i * 3 + 2] = mz * stepM;
      uvs[i * 2] = (ix * stepM) / padded.widthM;
      uvs[i * 2 + 1] = (iz * stepM) / padded.heightM;
    }
  }
  const quads: number[] = [];
  for (let iz = 0; iz < vertsZ - 1; iz++) {
    for (let ix = 0; ix < vertsX - 1; ix++) {
      const mx = ix - ox;
      const mz = iz - oz;
      const inside = mx >= 0 && mx < mission.vertsX - 1 && mz >= 0 && mz < mission.vertsZ - 1;
      if (inside) continue;
      const a = iz * vertsX + ix;
      const b = a + 1;
      const c = a + vertsX;
      const d = c + 1;
      quads.push(a, c, b, b, c, d);
    }
  }
  return {
    positions,
    uvs,
    indices: Uint32Array.from(quads),
    triangles: quads.length / 3,
  };
}

const glslFloat = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);

/**
 * §7.4's curve in GLSL, the shader twin of `exteriorFade` in shared: *d* from
 * the mission rectangle (`uBorderRect` = x, y, width, height in metres), and
 * 1 − smoothstep(0, W, d). GLSL's smoothstep is the same cubic 3t² − 2t³.
 */
export const EXTERIOR_FADE_GLSL = `
uniform vec4 uBorderRect;
float echoesExteriorFade(vec2 p) {
  vec2 lo = uBorderRect.xy;
  vec2 hi = uBorderRect.xy + uBorderRect.zw;
  vec2 outside = max(max(lo - p, p - hi), vec2(0.0));
  return 1.0 - smoothstep(0.0, ${glslFloat(WORLD.FADE_M)}, length(outside));
}
`;
