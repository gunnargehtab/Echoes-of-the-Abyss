/**
 * Survey ink — docs/map-visuals.md §4, and the ladder rung §5 puts it on.
 *
 * The ground's fills sit at 5–10% luminance by rule, so at the survey dolly a
 * plateau and the plain beside it are one dark rectangle next to another. The
 * answer is not brighter ground; it is the lines a survey drew on it, which
 * is Plate VII's language (docs/art-direction.md, "Pressure Cartography"):
 *
 * - **Coastlines** run on the cell edges where the ground changes kind: solid
 *   against rock, dashed between two biomes. In the free-water study they run
 *   where its rounded ground changes kind instead (§4, the study's clause),
 *   read from fields its heightfield carries per vertex (`installSurveyInk`'s
 *   `drawn`).
 *
 * No line contours the floor's depth. The isobaths that did were taken off
 * at the owner's call (#1988): they marked the terrain without saying what to
 * do about it, and the coastlines are the lines that mark sound.
 *
 * Both kinds are drawn inside the terrain's own fragment shader, so the ink costs
 * no draw call and no triangle (gate 6), keeps a constant pixel width at
 * every zoom (rule 4 — which is the whole point at 11 km), and lands before
 * the fog, so it fades into the water exactly as the ground under it does
 * (rule 6). It lands after the vertex colour, which is where the acoustic
 * veil rides: the veil drains what a player hears, and the survey is what
 * both navies own (rule 5).
 *
 * What it reads is public map data and nothing else (rule 2): each cell's
 * biome and rock flag — or, in the study, the same cells rounded
 * (perspectiveTerrain.ts `HeightGrid.coast`). Never a contact, never the
 * veil's field.
 */

import { type Material, DataTexture, NearestFilter, RedFormat, UnsignedByteType } from 'three';
import type { TerrainPayload } from '../net/GameClient.ts';

/**
 * The ink — SPEC by reference (docs/map-visuals.md §4), values TUNABLE. One
 * colour, the `survey-ink` token (docs/style-neon-noir.md "The ink"),
 * hue-neutral by construction — near-grey with the canvas's blue memory, the
 * stone ramp's rule (rule 3) — told apart by strength, width and pattern.
 *
 * Strengths are alphas, blended in encoded space, which is how the mark
 * layer lays its strokes over the same ground. That is what makes the ladder
 * (§5, `ladder.ts`) a comparison rather than an estimate: a line and a
 * hazard rim over the same pixel lift it by `alpha × (colour − ground)`
 * each, so the tests can hold every ink stroke below the quietest furniture
 * outline over every ground the map draws. An absolute colour could not promise
 * that: it is loudest over the darkest ground, which is most of an abyssal
 * map.
 */
export const SURVEY_INK_COLOR = 0x7a8c99;

export const SURVEY_ALPHA = {
  /** A cell edge between two biomes — a propagation-factor boundary. Dashed. */
  border: 0.09,
  /**
   * A cell edge between water and rock. Solid, and the loudest ink — held
   * under rung 5's floor and the unselected detection ring. Since the ring
   * came up on #866 the floor binds first, at about 0.133 (deuteranopia, the
   * dormant eruption rim, over the kelp fill); the ring binds at about 0.149.
   */
  coast: 0.095,
} as const;

/** TUNABLE — line widths in device pixels, constant at every zoom (rule 4). */
export const SURVEY_WIDTH_PX = {
  border: 1.5,
  coast: 1.75,
} as const;

/** TUNABLE — the border's dash, in world metres so it never crawls under a pan. */
export const BORDER_DASH_M = 80;
export const BORDER_DASH_ON = 0.55;

/** The cell-class value that means rock. Biomes are their enum index, 0–5. */
export const ROCK_CLASS = 255;

/**
 * One byte per cell: its biome, or `ROCK_CLASS`. What the coastline pass
 * compares across each edge. Rock is read from the floor/ceiling pair, the
 * way every other reader in the frontend reads it — not sent as a flag.
 */
export function surveyCellClasses(terrain: TerrainPayload): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(terrain.cols * terrain.rows);
  for (let i = 0; i < out.length; i++) out[i] = cellClass(terrain, i);
  return out;
}

/** Rewrite the classes a ground delta touched, in place (#434). */
export function patchSurveyCellClasses(
  classes: Uint8Array,
  terrain: TerrainPayload,
  touched: { col0: number; row0: number; col1: number; row1: number }
): void {
  for (
    let row = Math.max(0, touched.row0);
    row <= Math.min(terrain.rows - 1, touched.row1);
    row++
  ) {
    for (
      let col = Math.max(0, touched.col0);
      col <= Math.min(terrain.cols - 1, touched.col1);
      col++
    ) {
      const i = row * terrain.cols + col;
      classes[i] = cellClass(terrain, i);
    }
  }
}

function cellClass(terrain: TerrainPayload, i: number): number {
  return terrain.ceiling[i]! > terrain.floor[i]! ? ROCK_CLASS : terrain.biomes[i]!;
}

// ------------------------------------------------------------ the shader

const glslFloat = (n: number) => (Number.isInteger(n) ? `${n}.0` : `${n}`);

/** The per-material uniforms, kept so a ground delta can swap the classes. */
export interface SurveyInkUniforms {
  uSurveyCells: { value: DataTexture };
  uSurveyGrid: { value: [number, number, number] };
  /** The ink colour as encoded sRGB, because it is blended in encoded space. */
  uSurveyInk: { value: [number, number, number] };
  /**
   * The density of the water over a floor, per metre of its depth (water.ts
   * `waterColumnDensity`), which only the `overlay` reads: 0 until its view
   * writes one, and 0 takes nothing.
   */
  uSurveyColumn: { value: number };
}

/**
 * The cell classes as a texture the fragment shader can `texelFetch`: one
 * red byte per cell, nearest-sampled, no mipmaps — a class is a label, and
 * a filtered label is a lie. Row 0 is the map's north edge, as in the bake.
 */
export function surveyCellTexture(
  terrain: TerrainPayload,
  classes: Uint8Array<ArrayBuffer>
): DataTexture {
  const texture = new DataTexture(classes, terrain.cols, terrain.rows, RedFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  // One byte per texel: a row of 30 cells is not 4-byte aligned, and the
  // default unpack alignment would shear every row after the first.
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

const VERTEX_PARS = 'varying vec2 vSurveyXZ;';

const VERTEX_MAIN = 'vSurveyXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;';

/**
 * The free-water study's coast fields, per vertex (perspectiveTerrain.ts
 * `HeightGrid.coast` and `.biomes`): the signed distance to the drawn rock
 * coast, and to each of the six biomes' drawn edges, three to an attribute.
 */
const DRAWN_VERTEX_PARS = [
  'attribute float surveyCoast;',
  'attribute vec3 surveyBiomeA;',
  'attribute vec3 surveyBiomeB;',
  'varying float vSurveyCoast;',
  'varying vec3 vSurveyBiomeA;',
  'varying vec3 vSurveyBiomeB;',
].join('\n');

const DRAWN_VERTEX_MAIN = [
  'vSurveyCoast = surveyCoast;',
  'vSurveyBiomeA = surveyBiomeA;',
  'vSurveyBiomeB = surveyBiomeB;',
].join('\n');

function fragmentPars(): string {
  return [
    'uniform sampler2D uSurveyCells;',
    'uniform vec3 uSurveyGrid;',
    'uniform vec3 uSurveyInk;',
    'varying vec2 vSurveyXZ;',
    '',
    'float surveyCell( ivec2 c ) { return texelFetch( uSurveyCells, c, 0 ).r; }',
    // The cell under a plan point, held to the grid: what a later hook asks
    // when it wants a biome rather than a texel (`installGroundSurface`). The
    // apron (worldBorder.ts) defines its own, offset into its padded grid.
    'float surveyCellAt( vec2 xz ) {',
    '  return surveyCell( clamp( ivec2( floor( xz / uSurveyGrid.z ) ), ivec2( 0 ), ivec2( uSurveyGrid.xy ) - 1 ) );',
    '}',
    '',
    // The sRGB transfer both ways, so the ink blends in encoded space — the
    // space the mark layer's strokes blend in, which the ladder is measured in.
    'vec3 surveyEncode( vec3 c ) {',
    '  return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) );',
    '}',
    'vec3 surveyDecode( vec3 c ) {',
    '  return mix( c / 12.92, pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, c ) );',
    '}',
    '',
    // Coverage of a line `px` pixels from its centre, anti-aliased over one pixel.
    'float surveyLine( float px, float widthPx ) {',
    '  return 1.0 - smoothstep( widthPx * 0.5 - 0.5, widthPx * 0.5 + 0.5, px );',
    '}',
    '',
    // One side of one cell edge. Each side draws half the line, so the whole
    // line is centred on the edge itself — the PF boundary, not near it.
    'void surveyEdge( float here, ivec2 n, ivec2 gridMax, float distM, float mPerPx, float along,',
    '                 inout float coast, inout float border ) {',
    '  if ( n.x < 0 || n.y < 0 || n.x > gridMax.x || n.y > gridMax.y ) return;',
    '  float there = surveyCell( n );',
    '  if ( abs( there - here ) < 0.002 ) return;',
    '  float px = distM / mPerPx;',
    '  if ( here > 0.99 || there > 0.99 ) {',
    `    coast = max( coast, surveyLine( px, ${glslFloat(SURVEY_WIDTH_PX.coast)} ) );`,
    '  } else {',
    `    float dash = 1.0 - step( ${glslFloat(BORDER_DASH_ON)}, fract( along / ${glslFloat(BORDER_DASH_M)} ) );`,
    `    border = max( border, surveyLine( px, ${glslFloat(SURVEY_WIDTH_PX.border)} ) * dash );`,
    '  }',
    '}',
  ].join('\n');
}

/**
 * The study's helpers: a line along the zero of a field the vertices carry,
 * its distance in pixels taken off the field's own screen gradient. The
 * field is linear across a triangle, so within one this is the exact pixel
 * distance to the zero, and the line keeps its pixel width at every zoom
 * (rule 4) as the cell edges' does.
 */
const DRAWN_FRAGMENT_PARS = [
  'varying float vSurveyCoast;',
  'varying vec3 vSurveyBiomeA;',
  'varying vec3 vSurveyBiomeB;',
  'float surveyFieldPx( float f, float dx, float dy ) {',
  '  return abs( f ) / max( length( vec2( dx, dy ) ), 1e-6 );',
  '}',
  // Whether a field climbs at least a quarter as fast as a distance does,
  // in the plan: its screen gradient taken back through the inverse of the
  // plan's (`xzDx`, `xzDy`, their determinant `det`), both sides scaled by
  // it. A triangle whose three vertices all lie on its edge — at a corner
  // the roof holds on the cells (roundedCells.ts) — carries a field of
  // nothing there, which no line can be read off, and would otherwise ink
  // the whole triangle; its neighbours still draw their half of the line.
  'bool surveyFieldSound( float dx, float dy, vec2 xzDx, vec2 xzDy, float det ) {',
  '  float gX = dx * xzDy.y - dy * xzDx.y;',
  '  float gZ = dy * xzDx.x - dx * xzDy.x;',
  '  return gX * gX + gZ * gZ > 0.0625 * det * det;',
  '}',
  // The nearest of the six biome edges, with its gradient, for the dash.
  'void surveyNearestBorder( float f, float dx, float dy, inout float px, inout vec2 grad ) {',
  '  float p = surveyFieldPx( f, dx, dy );',
  '  if ( p < px ) { px = p; grad = vec2( dx, dy ); }',
  '}',
].join('\n');

/** The strongest stroke at a pixel, shared by both passes and every mode. */
const INK_COVERAGE = [
  // The strongest stroke at this pixel wins rather than both stacking: a
  // biome edge that meets the rock is one line, not two.
  `  float ink = max( border * ${glslFloat(SURVEY_ALPHA.border)}, coast * ${glslFloat(SURVEY_ALPHA.coast)} );`,
].join('\n');

/** That stroke blended into the material's own ground, in encoded space. */
const INK = [
  INK_COVERAGE,
  '  if ( ink > 0.0 ) {',
  '    diffuseColor.rgb = surveyDecode( mix( surveyEncode( diffuseColor.rgb ), uSurveyInk, ink ) );',
  '  }',
].join('\n');

/**
 * The same stroke as a layer of its own (`SurveyInkMode`, `overlay`): the
 * ink's colour at the stroke's coverage, for a blend over ground another pass
 * drew. The canvas blends encoded, so that blend is `INK`'s mix.
 */
const INK_OVERLAY = [
  INK_COVERAGE,
  '  if ( ink <= 0.0 ) discard;',
  '  diffuseColor = vec4( surveyDecode( uSurveyInk ), ink );',
].join('\n');

/**
 * What the patch draws. `ground` is the Low graphics quality's and every
 * build's before it: the strokes mixed into the material's own ground.
 * The High quality splits the two (docs/art-direction.md, "Two layers, two
 * laws"): `overlay` draws the strokes alone, over ground the lit world pass
 * drew, fading into the water by coverage rather than by colour; `carrier`
 * draws none, and gives a lit ground the varyings and the encode pair the
 * silt detail reads (seabedDetail.ts).
 *
 * The overlay also fades by the water over the ground it lies on
 * (`uSurveyColumn`), as that ground does in the world pass. The owner's call,
 * in session on 22 November 2026 (#1891): rule 6, ink fades into the water
 * like the ground it lies on, holds at High over the rule that the tactical
 * layer is drawn as Low draws it (docs/map-visuals.md §4;
 * docs/art-direction.md, "Two layers, two laws").
 */
export type SurveyInkMode = 'ground' | 'overlay' | 'carrier';

const FRAGMENT_MAIN = [
  '{',
  // Derivatives first, outside every branch: fwidth in non-uniform control
  // flow is undefined, and each edge's test below is non-uniform by nature.
  '  vec2 mPerPx = max( fwidth( vSurveyXZ ), vec2( 1e-3 ) );',
  '  float cellM = uSurveyGrid.z;',
  '  ivec2 gridMax = ivec2( uSurveyGrid.xy ) - 1;',
  '  vec2 cellF = vSurveyXZ / cellM;',
  '  ivec2 cell = clamp( ivec2( floor( cellF ) ), ivec2( 0 ), gridMax );',
  '  vec2 f = clamp( cellF - vec2( cell ), 0.0, 1.0 );',
  '  float here = surveyCell( cell );',
  '  float coast = 0.0;',
  '  float border = 0.0;',
  '  surveyEdge( here, cell + ivec2( -1, 0 ), gridMax, f.x * cellM, mPerPx.x, vSurveyXZ.y, coast, border );',
  '  surveyEdge( here, cell + ivec2( 1, 0 ), gridMax, ( 1.0 - f.x ) * cellM, mPerPx.x, vSurveyXZ.y, coast, border );',
  '  surveyEdge( here, cell + ivec2( 0, -1 ), gridMax, f.y * cellM, mPerPx.y, vSurveyXZ.x, coast, border );',
  '  surveyEdge( here, cell + ivec2( 0, 1 ), gridMax, ( 1.0 - f.y ) * cellM, mPerPx.y, vSurveyXZ.x, coast, border );',
  INK,
  '}',
].join('\n');

/**
 * The study's pass (docs/map-visuals.md §4, the study's clause): the
 * coastlines on the zeros of its coast fields rather than on the cell edges.
 * Water is the coast field's negative side, so a biome's dash stops at the
 * stone.
 */
const DRAWN_FRAGMENT_MAIN = [
  '{',
  // Derivatives first, outside every branch, as the cell pass takes them.
  '  vec2 xzDx = dFdx( vSurveyXZ );',
  '  vec2 xzDy = dFdy( vSurveyXZ );',
  '  float det = xzDx.x * xzDy.y - xzDx.y * xzDy.x;',
  '  float coastDx = dFdx( vSurveyCoast );',
  '  float coastDy = dFdy( vSurveyCoast );',
  '  float coastPx = surveyFieldPx( vSurveyCoast, coastDx, coastDy );',
  '  bool coastSound = surveyFieldSound( coastDx, coastDy, xzDx, xzDy, det );',
  '  vec3 aDx = dFdx( vSurveyBiomeA );',
  '  vec3 aDy = dFdy( vSurveyBiomeA );',
  '  vec3 bDx = dFdx( vSurveyBiomeB );',
  '  vec3 bDy = dFdy( vSurveyBiomeB );',
  '  float borderPx = 1e9;',
  '  vec2 borderGrad = vec2( 0.0 );',
  '  surveyNearestBorder( vSurveyBiomeA.x, aDx.x, aDy.x, borderPx, borderGrad );',
  '  surveyNearestBorder( vSurveyBiomeA.y, aDx.y, aDy.y, borderPx, borderGrad );',
  '  surveyNearestBorder( vSurveyBiomeA.z, aDx.z, aDy.z, borderPx, borderGrad );',
  '  surveyNearestBorder( vSurveyBiomeB.x, bDx.x, bDy.x, borderPx, borderGrad );',
  '  surveyNearestBorder( vSurveyBiomeB.y, bDx.y, bDy.y, borderPx, borderGrad );',
  '  surveyNearestBorder( vSurveyBiomeB.z, bDx.z, bDy.z, borderPx, borderGrad );',
  '  bool water = vSurveyCoast < 0.0;',
  `  float coast = coastSound ? surveyLine( coastPx, ${glslFloat(SURVEY_WIDTH_PX.coast)} ) : 0.0;`,
  '  float border = 0.0;',
  '  if ( water && surveyFieldSound( borderGrad.x, borderGrad.y, xzDx, xzDy, det ) ) {',
  // The dash runs in world metres along whichever world axis the edge runs
  // nearer, as the cell pass's does along its edge, so it never crawls
  // under a pan. The field's gradient in the world, up to its sign and
  // scale, is its screen gradient through the inverse of the plan's.
  '    float gX = borderGrad.x * xzDy.y - borderGrad.y * xzDx.y;',
  '    float gZ = borderGrad.y * xzDx.x - borderGrad.x * xzDy.x;',
  '    float along = abs( gX ) > abs( gZ ) ? vSurveyXZ.y : vSurveyXZ.x;',
  `    float dash = 1.0 - step( ${glslFloat(BORDER_DASH_ON)}, fract( along / ${glslFloat(BORDER_DASH_M)} ) );`,
  `    border = surveyLine( borderPx, ${glslFloat(SURVEY_WIDTH_PX.border)} ) * dash;`,
  '  }',
  INK,
  '}',
].join('\n');

/**
 * Patch the terrain's material to draw the survey. `drawn`, the geometry must
 * carry the free-water study's coast fields: `surveyCoast` from
 * `HeightGrid.coast`, and `surveyBiomeA` and `surveyBiomeB` from the first
 * and last three of `HeightGrid.biomes`. Drawn, the coastlines run on those
 * fields' zeros rather than the cell edges (docs/map-visuals.md §4, the
 * study's clause).
 */
export function installSurveyInk(
  material: Material,
  terrain: TerrainPayload,
  cells: DataTexture,
  drawn = false,
  mode: SurveyInkMode = 'ground'
): SurveyInkUniforms {
  const uniforms: SurveyInkUniforms = {
    uSurveyCells: { value: cells },
    uSurveyGrid: { value: [terrain.cols, terrain.rows, terrain.cellM] },
    uSurveyInk: {
      value: [
        ((SURVEY_INK_COLOR >> 16) & 0xff) / 255,
        ((SURVEY_INK_COLOR >> 8) & 0xff) / 255,
        (SURVEY_INK_COLOR & 0xff) / 255,
      ],
    },
    uSurveyColumn: { value: 0 },
  };
  const vertexPars = drawn ? `${VERTEX_PARS}\n${DRAWN_VERTEX_PARS}` : VERTEX_PARS;
  const vertexMain = drawn ? `${VERTEX_MAIN}\n${DRAWN_VERTEX_MAIN}` : VERTEX_MAIN;
  const strokes = drawn ? DRAWN_FRAGMENT_MAIN : FRAGMENT_MAIN;
  const fragmentMain =
    mode === 'carrier' ? '' : mode === 'overlay' ? strokes.replace(INK, INK_OVERLAY) : strokes;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexPars}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexMain}`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\n${fragmentPars()}${drawn ? `\n${DRAWN_FRAGMENT_PARS}` : ''}`
      )
      .replace('#include <color_fragment>', `#include <color_fragment>\n${fragmentMain}`);
    // The strokes swim out by coverage: mixed toward the water's colour as
    // the ground's fog does, a far stroke would paint that colour over the
    // lit world's own water.
    // And by the column over them, with the ground they lie on (rule 6):
    // the fog chunk's own depth, off the varying its vertex half writes.
    if (mode === 'overlay') {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSurveyColumn;')
        .replace(
          '#include <fog_fragment>',
          [
            '#ifdef USE_FOG',
            '  float surveyColumn = uSurveyColumn * max( 0.0, echoesWaterDepthM( vWaterWorldY ) );',
            '  gl_FragColor.a *= exp( - fogDensity * fogDensity * vFogDepth * vFogDepth',
            '    - surveyColumn * surveyColumn );',
            '#endif',
          ].join('\n')
        );
    }
  };
  // Keyed apart from every unpatched MeshBasicMaterial in the scene — three
  // keys compiled programs by material type — and the study's pass from the
  // cells', which reads attributes the cells' never declares.
  const key = `${drawn ? 'survey-ink-drawn' : 'survey-ink'}${mode === 'ground' ? '' : `-${mode}`}`;
  material.customProgramCacheKey = () => key;
  material.needsUpdate = true;
  return uniforms;
}
