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
import { seabedDepthAtM, type HeightGrid } from './perspectiveTerrain.ts';
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
 * The mission's cells cut back out of a padded ground: `paddedTerrain`'s
 * inverse. Cut from a region's detail ground it is the map's baseline, the
 * ground a session opens on (`detailGround` pastes it whole), so its seed,
 * rock top and depth range are the session's too (#1491).
 */
export function missionCells(padded: TerrainPayload, pads: ApronPads): TerrainPayload {
  const cols = padded.cols - pads.west - pads.east;
  const rows = padded.rows - pads.north - pads.south;
  const biomes: number[] = [];
  const floor: number[] = [];
  const ceiling: number[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const from = (row + pads.north) * padded.cols + col + pads.west;
      biomes.push(padded.biomes[from]!);
      floor.push(padded.floor[from]!);
      ceiling.push(padded.ceiling[from]!);
    }
  }
  return { ...padded, cols, rows, biomes, floor, ceiling };
}

/**
 * Whether two grounds are the same cells, cell for cell. Two padded grounds
 * this calls the same, cut at the same pads, hold the same mission, whose
 * cells give the seed and depth range a skin is baked on — so they bake the
 * same skin (#1495).
 */
export function sameGround(a: TerrainPayload, b: TerrainPayload): boolean {
  if (a.cols !== b.cols || a.rows !== b.rows || a.cellM !== b.cellM) return false;
  if (a.floor.length !== b.floor.length) return false;
  for (let i = 0; i < a.floor.length; i++) {
    if (a.floor[i] !== b.floor[i] || a.ceiling[i] !== b.ceiling[i]) return false;
    if (a.biomes[i] !== b.biomes[i]) return false;
  }
  return true;
}

/**
 * Lay the mission grid's vertices over the padded grid's, in place: a
 * region's baseline detail drawn as a session draws the same ground, the
 * mission mesh inside and the apron round it, which take their relief from
 * different frames (#1491). The vertices `apronVertexY` gives the mission's,
 * edge included, so the two cannot differ anywhere a session draws.
 */
export function pasteMissionGrid(
  padded: HeightGrid,
  mission: HeightGrid,
  pads: ApronPads,
  cellM: number
): void {
  const perCell = Math.round(cellM / padded.stepM);
  const ox = pads.west * perCell;
  const oz = pads.north * perCell;
  for (let mz = 0; mz < mission.vertsZ; mz++) {
    for (let mx = 0; mx < mission.vertsX; mx++) {
      const to = (mz + oz) * padded.vertsX + mx + ox;
      padded.y[to] = mission.y[mz * mission.vertsX + mx]!;
      padded.floor[to] = mission.floor[mz * mission.vertsX + mx]!;
    }
  }
}

/**
 * The seabed depth `pasteMissionGrid`'s ground stands for, at a point in the
 * mission's metres: the mission's own sample on and inside its rectangle, the
 * padded ground's past it, each in its own frame and on one seed — the rule
 * `PerspectiveView.seabedDepthAt` reads a session's by, taken from the same
 * point so the two agree to the last bit.
 */
export function baselineDepthAtM(
  padded: TerrainPayload,
  mission: TerrainPayload,
  pads: ApronPads,
  seed: number,
  rockTopM: number,
  xM: number,
  yM: number
): number {
  const inside =
    xM >= 0 && yM >= 0 && xM <= mission.cols * mission.cellM && yM <= mission.rows * mission.cellM;
  return inside
    ? seabedDepthAtM(mission, seed, rockTopM, xM, yM)
    : seabedDepthAtM(
        padded,
        seed,
        rockTopM,
        xM + pads.west * padded.cellM,
        yM + pads.north * padded.cellM
      );
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
 * A whole grid as a mesh, every quad drawn: a region's detail where no
 * session holds it (#1459), eased into the overview by the seam as the
 * apron is. Vertices in the grid's own metres, from its north-west corner.
 */
export function detailMesh(
  grid: HeightGrid,
  seam?: SeamHeight
): { positions: Float32Array; uvs: Float32Array; indices: Uint32Array } {
  const { vertsX, vertsZ, stepM } = grid;
  const positions = new Float32Array(vertsX * vertsZ * 3);
  const uvs = new Float32Array(vertsX * vertsZ * 2);
  for (let iz = 0; iz < vertsZ; iz++) {
    for (let ix = 0; ix < vertsX; ix++) {
      const i = iz * vertsX + ix;
      const y = grid.y[i]!;
      positions[i * 3] = ix * stepM;
      positions[i * 3 + 1] = seam === undefined ? y : seam(ix * stepM, iz * stepM, y);
      positions[i * 3 + 2] = iz * stepM;
      uvs[i * 2] = (ix * stepM) / grid.widthM;
      uvs[i * 2 + 1] = (iz * stepM) / grid.heightM;
    }
  }
  const indices = new Uint32Array((vertsX - 1) * (vertsZ - 1) * 6);
  let k = 0;
  for (let iz = 0; iz < vertsZ - 1; iz++) {
    for (let ix = 0; ix < vertsX - 1; ix++) {
      const a = iz * vertsX + ix;
      const b = a + 1;
      const c = a + vertsX;
      const d = c + 1;
      indices.set([a, c, b, b, c, d], k);
      k += 6;
    }
  }
  return { positions, uvs, indices };
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
  /**
   * The veil's floor, in display terms (`veilShade` at no clarity), that the
   * exterior drains toward as it fades: white while nobody listens.
   */
  uExteriorFloor: { value: number[] };
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
  /** The other drawn detail, whose cells this one does not draw (#1528). */
  rival: DetailRival;
}

/**
 * The one other region whose detail is drawn with this mesh, as the shader
 * reads it (§7.3, #1528): §7.5 holds two resident, so a detail has at most one
 * rival. Rectangles are x, y, width, height in this view's scene metres.
 */
export interface DetailRival {
  /** This mesh's own map rectangle. */
  uOwnMapRect: { value: number[] };
  /** The rival's map rectangle, and its detail rectangle, where it draws. */
  uRivalMapRect: { value: number[] };
  uRivalDetailRect: { value: number[] };
  /** 0 with no rival drawn; 1 drawn and losing a tie; 2 drawn and winning one. */
  uRival: { value: number };
}

/** A rival slot with nobody in it, for a mesh to hold from its first frame. */
export function detailRival(): DetailRival {
  return {
    uOwnMapRect: { value: [0, 0, 0, 0] },
    uRivalMapRect: { value: [0, 0, 0, 0] },
    uRivalDetailRect: { value: [0, 0, 0, 0] },
    uRival: { value: 0 },
  };
}

/** One drawn detail, as `assignRivals` reads it: its region, and the slot its mesh reads. */
export interface DrawnDetail {
  region: WorldRegion;
  rival: DetailRival;
}

/**
 * Point each drawn detail at the other one (#1528), in the order
 * `detailOwner` takes them: the first listed, the session's, wins a tie.
 * `home` is the region whose origin is the scene's. A detail drawn alone, or
 * past the two §7.5 allows, has no rival and draws all of its cells.
 */
export function assignRivals(drawn: readonly DrawnDetail[], home: PlanRect): void {
  const scene = (rect: PlanRect) => [rect.x - home.x, rect.y - home.y, rect.widthM, rect.heightM];
  for (const [i, detail] of drawn.entries()) {
    const other = drawn.length === 2 ? drawn[1 - i]! : undefined;
    detail.rival.uOwnMapRect.value = scene(detail.region);
    detail.rival.uRival.value = other === undefined ? 0 : i === 0 ? 1 : 2;
    if (other === undefined) continue;
    detail.rival.uRivalMapRect.value = scene(other.region);
    detail.rival.uRivalDetailRect.value = scene(detailRect(other.region));
  }
}

/**
 * `detailOwner` in GLSL, from one mesh's side: does the rival own the 250 m
 * cell under `p`? Only where the rival's detail draws, and only when its map
 * rectangle is nearer the cell's centre, or as near and it wins the tie. The
 * scene's origin is a region's, a whole cell (§7.2), so cells in scene metres
 * are the atlas's.
 */
export const DETAIL_OWNER_GLSL = `
uniform vec4 uOwnMapRect;
uniform vec4 uRivalMapRect;
uniform vec4 uRivalDetailRect;
uniform float uRival;
float echoesRectDistance(vec4 r, vec2 p) {
  return length(max(max(r.xy - p, p - (r.xy + r.zw)), vec2(0.0)));
}
bool echoesRivalOwns(vec2 p) {
  if (uRival < 0.5) return false;
  vec2 c = (floor(p / ${glslFloat(WORLD.DETAIL_CELL_M)}) + 0.5) * ${glslFloat(WORLD.DETAIL_CELL_M)};
  if (any(lessThan(c, uRivalDetailRect.xy))) return false;
  if (any(greaterThanEqual(c, uRivalDetailRect.xy + uRivalDetailRect.zw))) return false;
  float own = echoesRectDistance(uOwnMapRect, c);
  float rival = echoesRectDistance(uRivalMapRect, c);
  return rival < own || (rival == own && uRival > 1.5);
}
`;

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
 * The veil's floor rides the same factor (#1532): the exterior is drained
 * toward it as it fades, so it is as clear as the mission's ground at the
 * edge and wholly unheard by W, where it is the backdrop anyway. Multiplied
 * here, after the output transform, so the floor means in the frame what
 * `veilShade` says in display terms. Laid flat on the material's colour from
 * the edge, it multiplied linear texels in the transfer curve's toe, where a
 * third in display terms lands nearer a tenth, and drew the whole surround
 * below the backdrop behind it.
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
          gl_FragColor.rgb *= mix( uExteriorFloor, vec3( 1.0 ), borderFade );
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
    ...seam.rival,
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
        uniform vec3 uExteriorFloor;
        uniform sampler2D uOverviewMap;
        uniform float uSeamOn;
        uniform vec4 uOverviewFrame;
        ${EXTERIOR_FADE_GLSL}
        ${SEAM_WEIGHT_GLSL}
        ${DETAIL_OWNER_GLSL}
        float surveyCell( ivec2 c ) { return texelFetch( uSurveyCells, c, 0 ).r; }
        float surveyCellAt( vec2 xz ) {
          ivec2 c = ivec2( floor( xz / uSurveyGrid.z ) ) + ivec2( uApronPad );
          return surveyCell( clamp( c, ivec2( 0 ), ivec2( uSurveyGrid.xy ) - 1 ) );
        }`
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if ( echoesRivalOwns( vBorderWorld.xz ) ) discard;`
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
  material.customProgramCacheKey = () => 'echoes-world-border-7';
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
        uniform vec3 uExteriorFloor;
        ${EXTERIOR_FADE_GLSL}`
      )
      .replace('#include <fog_fragment>', borderFadeFragment(backdropSpanM));
  };
  material.customProgramCacheKey = () => 'echoes-world-overview-2';
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
