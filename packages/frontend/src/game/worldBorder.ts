/**
 * The mission border in the continuous world — docs/world-map.md §7.3–§7.4
 * (#1461).
 *
 * Inside a placed mission the border is a fade into darkness, not a wall: the
 * ground goes on past the edge, and the exterior falls to the backdrop's
 * darkness over §7.4's W by plan distance alone, whatever the eye is doing.
 * This module is the data half of that, with no three.js at runtime so it can
 * be tested under node: the exterior ground the fade acts on, and the GLSL that
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
import type { Material } from 'three';
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
 * One step of §7.4's ramp: the fade comes in over `WORLD.FADE_RAMP_S` once a
 * mission's first state arrives and goes out over the same, linearly, and at
 * once under reduced motion (docs/ui-ux.md §11). `strength` 0 is no border at
 * all; 1 is the whole fade.
 */
export function stepBorderStrength(
  strength: number,
  target: 0 | 1,
  dtMs: number,
  reducedMotion: boolean
): number {
  if (reducedMotion) return target;
  const step = Math.max(0, dtMs) / (WORLD.FADE_RAMP_S * 1000);
  return target === 1 ? Math.min(1, strength + step) : Math.max(0, strength - step);
}

/** The fade's inputs, as uniform objects shared with whoever else reads them. */
export interface BorderUniforms {
  /** The mission rectangle in plan metres: x, y, width, height. */
  uBorderRect: { value: number[] };
  /** How far the fade has ramped in (`stepBorderStrength`). */
  uBorderStrength: { value: number };
  /** The backdrop's own anchor (`WaterBackdrop.focusDepthUniform`), the object itself. */
  uFocusDepthM: { value: number };
}

/** The padded grid the apron's cells are read from, and where the mission sits in it. */
export interface ApronCells {
  cells: unknown;
  cols: number;
  rows: number;
  cellM: number;
  padCols: number;
  padRows: number;
}

/**
 * Shade the apron the way the mission's ground is shaded, then fade it.
 *
 * - **What the ground hooks read.** `vSurveyXZ` in the mission's own metres,
 *   so a surface pattern laid by plan position (`installGroundSurface`'s
 *   paving) runs across the seam unbroken, and `surveyCellAt` offset into the
 *   padded grid, so a hook asking for the biome under a point gets the apron's.
 *   No ink: the survey is the mission's instrument, and nothing out here is
 *   surveyed.
 * - **The fade**, after the fog, as §7.4 has it: `f`, ramped by the strength,
 *   mixing toward the colour the backdrop draws behind this fragment — its ray
 *   graded from the backdrop's own anchor by the backdrop's own span — so at W
 *   the ground has become exactly the water behind it, at any pitch, and the
 *   apron's far edge is nothing to see (#1023's ramp, composed as the fog
 *   composes it).
 *
 * Chain `installGroundSurface` after this, as the mission mesh chains it after
 * the ink; its own key wraps this one.
 */
export function installApronShading(
  material: Material,
  border: BorderUniforms,
  grid: ApronCells,
  backdropSpanM: number
): void {
  const uniforms = {
    ...border,
    uSurveyCells: { value: grid.cells },
    uSurveyGrid: { value: [grid.cols, grid.rows, grid.cellM] },
    uApronPad: { value: [grid.padCols, grid.padRows] },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vBorderWorld;\nvarying vec2 vSurveyXZ;'
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vBorderWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
        vSurveyXZ = vBorderWorld.xz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vBorderWorld;
        varying vec2 vSurveyXZ;
        uniform sampler2D uSurveyCells;
        uniform vec3 uSurveyGrid;
        uniform vec2 uApronPad;
        uniform float uBorderStrength;
        uniform float uFocusDepthM;
        ${EXTERIOR_FADE_GLSL}
        float surveyCell( ivec2 c ) { return texelFetch( uSurveyCells, c, 0 ).r; }
        float surveyCellAt( vec2 xz ) {
          ivec2 c = ivec2( floor( xz / uSurveyGrid.z ) ) + ivec2( uApronPad );
          return surveyCell( clamp( c, ivec2( 0 ), ivec2( uSurveyGrid.xy ) - 1 ) );
        }`
      )
      .replace(
        '#include <fog_fragment>',
        `#include <fog_fragment>
        #ifdef USE_FOG
          vec3 borderRay = normalize( vBorderWorld - cameraPosition );
          vec3 borderDark = echoesWaterColor( uFocusDepthM - borderRay.y * ${glslFloat(backdropSpanM)} );
          borderDark = linearToOutputTexel( vec4( borderDark, 1.0 ) ).rgb;
          float borderFade = mix( 1.0, echoesExteriorFade( vBorderWorld.xz ), uBorderStrength );
          gl_FragColor.rgb = mix( borderDark, gl_FragColor.rgb, borderFade );
        #endif`
      );
  };
  material.customProgramCacheKey = () => 'echoes-world-border-2';
  material.needsUpdate = true;
}

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
