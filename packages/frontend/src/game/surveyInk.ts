/**
 * Survey ink — docs/map-visuals.md §4, and the ladder rung §5 puts it on.
 *
 * The ground's fills sit at 5–10% luminance by rule, so at the survey dolly a
 * plateau and the plain beside it are one dark rectangle next to another. The
 * answer is not brighter ground; it is the lines a survey drew on it, which
 * is Plate VII's language (docs/art-direction.md, "Pressure Cartography"):
 *
 * - **Isobaths** contour the authored floor — a minor line every 100 m and a
 *   major one at each depth-band boundary. A stack of them is a cliff.
 * - **Coastlines** run on the cell edges where the ground changes kind: solid
 *   against rock, dashed between two biomes.
 *
 * Both are drawn inside the terrain's own fragment shader, so the ink costs
 * no draw call and no triangle (gate 6), keeps a constant pixel width at
 * every zoom (rule 4 — which is the whole point at 11 km), and lands before
 * the fog, so it fades into the water exactly as the ground under it does
 * (rule 6). It lands after the vertex colour, which is where the acoustic
 * veil rides: the veil drains what a player hears, and the survey is what
 * both navies own (rule 5).
 *
 * What it reads is public map data and nothing else (rule 2): the authored
 * floor, smoothed (perspectiveTerrain.ts `authoredFloorAtM`), and each cell's
 * biome and rock flag. Never the detail field (rule 1), never a contact,
 * never the veil's field.
 */

import { type Material, DataTexture, NearestFilter, RedFormat, UnsignedByteType } from 'three';
import { DEPTH, DEPTH_BANDS } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';

/**
 * The ink — SPEC by reference (docs/map-visuals.md §4), values TUNABLE. One
 * colour, the `survey-ink` token (docs/style-neon-noir.md "The ink"),
 * hue-neutral by construction — near-grey with the canvas's blue memory, the
 * stone ramp's rule (rule 3) — laid at four strengths.
 *
 * Strengths are alphas, blended in encoded space, which is how the mark
 * layer lays its strokes over the same ground. That is what makes the ladder
 * (§5, `ladder.ts`) a comparison rather than an estimate: a line and a kelp
 * rim over the same pixel lift it by `alpha × (colour − ground)` each, so
 * the tests can hold every ink stroke below the quietest furniture stroke
 * over every ground the map draws. An absolute colour could not promise
 * that: it is loudest over the darkest ground, which is most of an abyssal
 * map.
 */
export const SURVEY_INK_COLOR = 0x7a8c99;

export const SURVEY_ALPHA = {
  /** Every 100 m of floor. The quietest line on the map. */
  minor: 0.08,
  /** A depth-band boundary: the Shelf's foot and the Abyssal's lip. */
  major: 0.13,
  /** A cell edge between two biomes — a propagation-factor boundary. Dashed. */
  border: 0.13,
  /** A cell edge between water and rock. Solid, and the loudest ink. */
  coast: 0.15,
} as const;

/** TUNABLE — line widths in device pixels, constant at every zoom (rule 4). */
export const SURVEY_WIDTH_PX = {
  minor: 1,
  major: 1.5,
  border: 1.5,
  coast: 1.75,
} as const;

/** SPEC — docs/map-visuals.md §4: a minor isobath every 100 m of floor. */
export const MINOR_ISOBATH_M = 100;

/**
 * SPEC — the major isobaths are the ruleset's band boundaries, read from
 * `DEPTH_BANDS` rather than restated: every band's upper edge that lies
 * inside the column, which today is 400 m and 1,800 m. A band added to the
 * shared table draws its own line without this file hearing about it.
 */
export const MAJOR_ISOBATHS_M: readonly number[] = Object.values(DEPTH_BANDS)
  .map((band) => band.min)
  .filter((depth) => depth > 0 && depth < DEPTH.MAX_M)
  .sort((a, b) => a - b);

/**
 * Levels are drawn half a metre below their number. A plain authored exactly
 * on a level — the Kelp Labyrinth is 1,800 m from edge to edge — has no
 * gradient, and an isobath evaluated *at* its depth would ink the whole plain
 * rather than the line where the slope begins. Half a metre is invisible at
 * any zoom and moves every flat plain off every level.
 */
export const LEVEL_OFFSET_M = 0.5;

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

const VERTEX_PARS = [
  'attribute float surveyFloor;',
  'varying float vSurveyFloor;',
  'varying vec2 vSurveyXZ;',
].join('\n');

const VERTEX_MAIN = [
  'vSurveyFloor = surveyFloor;',
  'vSurveyXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;',
].join('\n');

function fragmentPars(): string {
  const majors = MAJOR_ISOBATHS_M.map(glslFloat).join(', ');
  return [
    'uniform sampler2D uSurveyCells;',
    'uniform vec3 uSurveyGrid;',
    'uniform vec3 uSurveyInk;',
    'varying float vSurveyFloor;',
    'varying vec2 vSurveyXZ;',
    `const int SURVEY_MAJOR_COUNT = ${MAJOR_ISOBATHS_M.length};`,
    `const float SURVEY_MAJORS[${MAJOR_ISOBATHS_M.length}] = float[${MAJOR_ISOBATHS_M.length}](${majors});`,
    '',
    'float surveyCell( ivec2 c ) { return texelFetch( uSurveyCells, c, 0 ).r; }',
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
    // Every multiple of the interval. Where the lines fall closer than the
    // eye can split them, draw their average rather than a moire: at the
    // survey dolly that average is the band of ink that says "scarp".
    'float surveyIsobaths( float d, float perPx ) {',
    `  float interval = ${glslFloat(MINOR_ISOBATH_M)};`,
    `  float x = ( d - ${glslFloat(LEVEL_OFFSET_M)} ) / interval;`,
    '  float distM = abs( fract( x + 0.5 ) - 0.5 ) * interval;',
    '  float spacing = interval / perPx;',
    `  float line = surveyLine( distM / perPx, ${glslFloat(SURVEY_WIDTH_PX.minor)} );`,
    `  float average = min( 1.0, ${glslFloat(SURVEY_WIDTH_PX.minor)} / spacing );`,
    '  return mix( average, line, smoothstep( 2.0, 4.0, spacing ) );',
    '}',
    '',
    'float surveyMajors( float d, float perPx ) {',
    '  float ink = 0.0;',
    '  for ( int i = 0; i < SURVEY_MAJOR_COUNT; i++ ) {',
    `    float distM = abs( d - SURVEY_MAJORS[ i ] - ${glslFloat(LEVEL_OFFSET_M)} );`,
    `    ink = max( ink, surveyLine( distM / perPx, ${glslFloat(SURVEY_WIDTH_PX.major)} ) );`,
    '  }',
    '  return ink;',
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

const FRAGMENT_MAIN = [
  '{',
  // Derivatives first, outside every branch: fwidth in non-uniform control
  // flow is undefined, and the rock test below is non-uniform by nature.
  '  float perPx = max( fwidth( vSurveyFloor ), 1e-4 );',
  '  vec2 mPerPx = max( fwidth( vSurveyXZ ), vec2( 1e-3 ) );',
  '  float cellM = uSurveyGrid.z;',
  '  ivec2 gridMax = ivec2( uSurveyGrid.xy ) - 1;',
  '  vec2 cellF = vSurveyXZ / cellM;',
  '  ivec2 cell = clamp( ivec2( floor( cellF ) ), ivec2( 0 ), gridMax );',
  '  vec2 f = clamp( cellF - vec2( cell ), 0.0, 1.0 );',
  '  float here = surveyCell( cell );',
  '  float minor = 0.0;',
  '  float major = 0.0;',
  // Rock has no floor to measure (rule 7).
  '  if ( here < 0.99 ) {',
  '    minor = surveyIsobaths( vSurveyFloor, perPx );',
  '    major = surveyMajors( vSurveyFloor, perPx );',
  '  }',
  '  float coast = 0.0;',
  '  float border = 0.0;',
  '  surveyEdge( here, cell + ivec2( -1, 0 ), gridMax, f.x * cellM, mPerPx.x, vSurveyXZ.y, coast, border );',
  '  surveyEdge( here, cell + ivec2( 1, 0 ), gridMax, ( 1.0 - f.x ) * cellM, mPerPx.x, vSurveyXZ.y, coast, border );',
  '  surveyEdge( here, cell + ivec2( 0, -1 ), gridMax, f.y * cellM, mPerPx.y, vSurveyXZ.x, coast, border );',
  '  surveyEdge( here, cell + ivec2( 0, 1 ), gridMax, ( 1.0 - f.y ) * cellM, mPerPx.y, vSurveyXZ.x, coast, border );',
  // The strongest stroke at this pixel wins rather than all four stacking:
  // a major isobath running along a coast is one line, not two.
  `  float ink = max( max( minor * ${glslFloat(SURVEY_ALPHA.minor)}, major * ${glslFloat(SURVEY_ALPHA.major)} ),`,
  `                   max( border * ${glslFloat(SURVEY_ALPHA.border)}, coast * ${glslFloat(SURVEY_ALPHA.coast)} ) );`,
  '  if ( ink > 0.0 ) {',
  '    diffuseColor.rgb = surveyDecode( mix( surveyEncode( diffuseColor.rgb ), uSurveyInk, ink ) );',
  '  }',
  '}',
].join('\n');

/**
 * Patch the terrain's material to draw the survey. The geometry must carry a
 * `surveyFloor` attribute — `HeightGrid.floor`, one float per vertex.
 */
export function installSurveyInk(
  material: Material,
  terrain: TerrainPayload,
  cells: DataTexture
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
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${fragmentPars()}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_MAIN}`);
  };
  // Keyed apart from every unpatched MeshBasicMaterial in the scene — three
  // keys compiled programs by material type.
  material.customProgramCacheKey = () => 'survey-ink';
  material.needsUpdate = true;
  return uniforms;
}
