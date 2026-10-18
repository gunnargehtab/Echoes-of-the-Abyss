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
 * **The exterior is the region's authored surround** (#1457): §7.3's detail
 * ground from `@echoes/shared/rift`, the overview's cells under its last
 * 500 m and the surround cut into the rest, with the mission's live cells
 * pasted in the middle so the apron's relief and skin run continuously into
 * the mission's. It was an apron of the map's own base ground until #1457
 * authored it (the owner's call on #1461), and is still called the apron.
 *
 * Render-only, like every heightfield here. The simulation never reads the
 * apron, nothing out there can be detected, and a click on it is refused
 * (`PerspectiveView.refusesPick`).
 *
 * **Past the surround is the overview** (#1459, worldOverview.ts): the
 * apron's last 500 m ease into it, heights on the vertex and colour in the
 * fragment, so the two meet on the seam with neither a crack nor a line, and
 * the overview takes the same fade from the same uniforms.
 */

import {
  WORLD,
  detailRect,
  type GroundCells,
  type PlanRect,
  type WorldRegion,
} from '@echoes/shared';
import type { Material } from 'three';
import type { TerrainPayload } from '../net/GameClient.ts';
import type { HeightGrid } from './perspectiveTerrain.ts';
import { SEAM_WEIGHT_GLSL } from './worldOverview.ts';

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
 * The mission's live cells pasted into the region's detail ground, `pads`
 * cells in from each side. A payload of the shape every ground function
 * already takes, so the apron is lit, relieved and skinned by the same code
 * as the mission. The live cells, not the baseline under them: after the arch
 * falls the session's ground is the one drawn (§7.1), and the surround is
 * never written to. Null when the two grids do not fit, which only a map
 * placed with the wrong size could cause.
 */
export function paddedTerrain(
  mission: TerrainPayload,
  pads: ApronPads,
  surround: GroundCells
): TerrainPayload | null {
  const cols = mission.cols + pads.west + pads.east;
  const rows = mission.rows + pads.north + pads.south;
  if (surround.cellM !== mission.cellM || surround.cols !== cols || surround.rows !== rows) {
    return null;
  }
  const biomes = Array.from(surround.biomes);
  const floor = Array.from(surround.floor);
  const ceiling = Array.from(surround.ceiling);
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
 * Where the seam band puts an apron vertex: from its own world Y toward the
 * overview's drawn surface by `seamWeight`, at a point in the mission's
 * metres. The view builds it from worldOverview.ts.
 */
export type SeamHeight = (xM: number, zM: number, y: number) => number;

/**
 * One apron vertex's world Y. On the mission's edge, the mission grid's — the
 * padded grid sees the surround past the edge where the mission grid saw its
 * own edge cells again — so the two meshes share that line exactly and the
 * seam cannot crack. Everywhere else the padded grid's, eased by the seam.
 */
function apronVertexY(
  padded: HeightGrid,
  mission: HeightGrid,
  ox: number,
  oz: number,
  ix: number,
  iz: number,
  seam: SeamHeight | undefined
): number {
  const mx = ix - ox;
  const mz = iz - oz;
  if (mx >= 0 && mx < mission.vertsX && mz >= 0 && mz < mission.vertsZ) {
    return mission.y[mz * mission.vertsX + mx]!;
  }
  const y = padded.y[iz * padded.vertsX + ix]!;
  return seam === undefined ? y : seam(mx * padded.stepM, mz * padded.stepM, y);
}

/**
 * The apron's mesh: the padded grid's vertices in the mission's metres, with
 * every quad inside the mission left out, since the mission's own mesh draws
 * those. Heights by `apronVertexY`: the mission's on its edge, the seam's
 * toward the overview on the outer one.
 */
export function apronMesh(
  padded: HeightGrid,
  mission: HeightGrid,
  pads: ApronPads,
  cellM: number,
  seam?: SeamHeight
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
      positions[i * 3] = (ix - ox) * stepM;
      positions[i * 3 + 1] = apronVertexY(padded, mission, ox, oz, ix, iz, seam);
      positions[i * 3 + 2] = (iz - oz) * stepM;
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

/**
 * Re-take the apron's heights over a vertex span of the padded grid, into its
 * position array in place, by the rule `apronMesh` built them with. A ground
 * delta patches the mission grid and then the padded one (`patchHeightGrid`
 * on each); this carries both into the apron, so the seam on the mission's
 * edge holds after the delta exactly as a rebuild would draw it, and nothing
 * past the span moves (#1459).
 */
export function patchApronMesh(
  positions: Float32Array,
  padded: HeightGrid,
  mission: HeightGrid,
  pads: ApronPads,
  cellM: number,
  span: { first: number; last: number },
  seam?: SeamHeight
): void {
  const perCell = Math.round(cellM / padded.stepM);
  const ox = pads.west * perCell;
  const oz = pads.north * perCell;
  for (let i = span.first; i <= span.last; i++) {
    const ix = i % padded.vertsX;
    const iz = Math.floor(i / padded.vertsX);
    positions[i * 3 + 1] = apronVertexY(padded, mission, ox, oz, ix, iz, seam);
  }
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

/** What the apron's seam band blends toward: the overview's skin, and where it lies. */
export interface SeamBlend {
  /**
   * The overview's skin, the texture its own mesh is drawn with, and 1 once
   * it has landed: uniform objects the view sets when the bake is done.
   */
  map: { value: unknown };
  on: { value: number };
  /** Mission metres to atlas metres, x then y: the region's origin. */
  originM: [number, number];
  /** The atlas's size in metres, which the skin spans. */
  sizeM: [number, number];
  /** The detail rectangle in mission metres: x, y, width, height. */
  detailRect: [number, number, number, number];
}

/** The world position every exterior fragment is faded by, and the hooks' plan position. */
const borderVertex = (shader: { vertexShader: string }) => {
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
};

/**
 * The fade, after the fog, as §7.4 has it: `f`, ramped by the strength,
 * mixing toward the colour the backdrop draws behind this fragment — its ray
 * graded from the backdrop's own anchor by the backdrop's own span — so at W
 * the ground has become exactly the water behind it, at any pitch (#1023's
 * ramp, composed as the fog composes it). The apron and the overview run this
 * one chunk off one set of uniforms: one boundary term, wherever it is drawn.
 *
 * `feathered` adds #1461's feather, the apron's alone: its last 500 m go to
 * the backdrop at every strength until the overview's skin lands (`uSeamOn`),
 * since until then nothing is drawn past its straight far edge, and a fade
 * part-way in would show where it ends (the owner's call on #1461, kept for
 * that window on #1459).
 */
const borderFadeFragment = (backdropSpanM: number, feathered = false) => `#include <fog_fragment>
        #ifdef USE_FOG
          vec3 borderRay = normalize( vBorderWorld - cameraPosition );
          vec3 borderDark = echoesWaterColor( uFocusDepthM - borderRay.y * ${glslFloat(backdropSpanM)} );
          borderDark = linearToOutputTexel( vec4( borderDark, 1.0 ) ).rgb;
          float borderFade = mix( 1.0, echoesExteriorFade( vBorderWorld.xz ), uBorderStrength );${
            feathered
              ? `
          float borderFeather =
            1.0 - smoothstep( ${glslFloat(WORLD.FADE_M)}, ${glslFloat(WORLD.DETAIL_SURROUND_M)}, echoesExteriorDistance( vBorderWorld.xz ) );
          borderFade *= mix( borderFeather, 1.0, uSeamOn );`
              : ''
          }
          gl_FragColor.rgb = mix( borderDark, gl_FragColor.rgb, borderFade );
        #endif`;

/**
 * Shade the apron the way the mission's ground is shaded, ease it into the
 * overview, then fade it.
 *
 * - **What the ground hooks read.** `vSurveyXZ` in the mission's own metres,
 *   so a surface pattern laid by plan position (`installGroundSurface`'s
 *   paving) runs across the seam unbroken, and `surveyCellAt` offset into the
 *   padded grid, so a hook asking for the biome under a point gets the apron's.
 *   No ink: the survey is the mission's instrument, and nothing out here is
 *   surveyed.
 * - **The seam band.** Over the apron's last 500 m its colour, hooks and all,
 *   goes to the overview's skin at the same point by the vertex blend's
 *   weight, under the same veil, so on the seam the two are one colour; not
 *   before the skin has landed, when the overview is not drawn either.
 * - **The fade**, `borderFadeFragment`, feathered until the skin lands and the
 *   overview is drawn past the apron's edge.
 *
 * Chain `installGroundSurface` after this, as the mission mesh chains it after
 * the ink; its own key wraps this one.
 */
export function installApronShading(
  material: Material,
  border: BorderUniforms,
  grid: ApronCells,
  backdropSpanM: number,
  seam: SeamBlend
): void {
  const uniforms = {
    ...border,
    uSurveyCells: { value: grid.cells },
    uSurveyGrid: { value: [grid.cols, grid.rows, grid.cellM] },
    uApronPad: { value: [grid.padCols, grid.padRows] },
    uOverviewMap: seam.map,
    uSeamOn: seam.on,
    uOverviewFrame: { value: [...seam.originM, ...seam.sizeM] },
    uDetailRect: { value: seam.detailRect },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    borderVertex(shader);
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
        uniform sampler2D uOverviewMap;
        uniform float uSeamOn;
        uniform vec4 uOverviewFrame;
        ${EXTERIOR_FADE_GLSL}
        ${SEAM_WEIGHT_GLSL}
        float surveyCell( ivec2 c ) { return texelFetch( uSurveyCells, c, 0 ).r; }
        float surveyCellAt( vec2 xz ) {
          ivec2 c = ivec2( floor( xz / uSurveyGrid.z ) ) + ivec2( uApronPad );
          return surveyCell( clamp( c, ivec2( 0 ), ivec2( uSurveyGrid.xy ) - 1 ) );
        }`
      )
      .replace(
        '#include <opaque_fragment>',
        `vec2 seamUV = ( vBorderWorld.xz + uOverviewFrame.xy ) / uOverviewFrame.zw;
        vec3 seamOverview = texture2D( uOverviewMap, seamUV ).rgb * diffuse;
        outgoingLight = mix( outgoingLight, seamOverview, echoesSeamWeight( vBorderWorld.xz ) * uSeamOn );
        #include <opaque_fragment>`
      )
      .replace('#include <fog_fragment>', borderFadeFragment(backdropSpanM, true));
  };
  material.customProgramCacheKey = () => 'echoes-world-border-5';
  material.needsUpdate = true;
}

/**
 * Fade the overview (worldOverview.ts) by the apron's own rule: the same
 * chunk off the same uniforms, so the exterior has one boundary term wherever
 * it is drawn. Nothing else: the overview carries no surface hook and no ink,
 * and its colour is its skin under the veil.
 */
export function installOverviewShading(
  material: Material,
  border: BorderUniforms,
  backdropSpanM: number
): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, border);
    borderVertex(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vBorderWorld;
        varying vec2 vSurveyXZ;
        uniform float uBorderStrength;
        uniform float uFocusDepthM;
        ${EXTERIOR_FADE_GLSL}`
      )
      .replace('#include <fog_fragment>', borderFadeFragment(backdropSpanM));
  };
  material.customProgramCacheKey = () => 'echoes-world-overview-1';
  material.needsUpdate = true;
}

/**
 * §7.4's curve in GLSL, the shader twin of `exteriorFade` in shared: *d* from
 * the mission rectangle (`uBorderRect` = x, y, width, height in metres), and
 * 1 − smoothstep(0, W, d). GLSL's smoothstep is the same cubic 3t² − 2t³.
 */
export const EXTERIOR_FADE_GLSL = `
uniform vec4 uBorderRect;
float echoesExteriorDistance(vec2 p) {
  vec2 lo = uBorderRect.xy;
  vec2 hi = uBorderRect.xy + uBorderRect.zw;
  return length(max(max(lo - p, p - hi), vec2(0.0)));
}
float echoesExteriorFade(vec2 p) {
  return 1.0 - smoothstep(0.0, ${glslFloat(WORLD.FADE_M)}, echoesExteriorDistance(p));
}
`;
