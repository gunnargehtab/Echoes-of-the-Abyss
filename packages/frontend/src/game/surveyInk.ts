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
 * - **The thermocline isobath** is a major line at the layer's depth, drawn
 *   as a double rule so it is not read as a band edge.
 * - **Coastlines** run on the cell edges where the ground changes kind: solid
 *   against rock, dashed between two biomes. In the free-water study they run
 *   where its rounded ground changes kind instead (§4, the study's clause),
 *   read from fields its heightfield carries per vertex (`installSurveyInk`'s
 *   `drawn`).
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
 * biome and rock flag — or, in the study, the same cells rounded
 * (seabed.ts `erodedGroundAtM`). Never the detail field (rule 1), never a
 * contact, never the veil's field.
 */

import {
  type DepthTexture,
  type Material,
  DataTexture,
  FloatType,
  NearestFilter,
  RedFormat,
  UnsignedByteType,
  Vector2,
} from 'three';
import { DEPTH, DEPTH_BANDS, THERMOCLINE } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';

/**
 * A floor sampled on a regular grid, row-major north to south: sample `i, j`
 * stands at `originM + i * stepM, originM + j * stepM`.
 */
export interface SurveyFloorSamples {
  nx: number;
  nz: number;
  stepM: number;
  originM: number;
  data: Float32Array<ArrayBuffer>;
}

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
  /** Every 100 m of floor. The quietest ink line. */
  minor: 0.08,
  /** A depth-band boundary: the Shelf's foot and the Abyssal's lip. */
  major: 0.09,
  /** Each stroke of the thermocline's double rule: a major line by another pattern. */
  thermocline: 0.09,
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
  minor: 1,
  major: 1.5,
  /** Each of the two strokes; `THERMOCLINE_RULE_GAP_PX` sets them apart. */
  thermocline: 1,
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
 * SPEC — docs/map-visuals.md §4: the thermocline's major isobath, read from
 * the ruleset's layer rather than restated. It lies inside the Mid-Water
 * band, not on its edge, so it is drawn as a double rule and never joins
 * `MAJOR_ISOBATHS_M`: a third solid major would read as a third band edge.
 */
export const THERMOCLINE_ISOBATH_M = THERMOCLINE.DEPTH_M;

/**
 * TUNABLE — the double rule's two strokes, centre to centre, in device
 * pixels. Wide enough that the gap between two 1 px strokes stays clear at
 * every zoom; the minor line at the same depth is cut out of that gap.
 */
export const THERMOCLINE_RULE_GAP_PX = 4;

/**
 * Derived — where the rule's gap ends: each stroke's inner edge, less the
 * pixel it anti-aliases over. The minor ink is cut from the level out to
 * here and comes back under the strokes, so the gap is clear. It must reach
 * past the minor line's own anti-aliased edge, or that line shows in it.
 */
export const THERMOCLINE_GAP_EDGE_PX =
  THERMOCLINE_RULE_GAP_PX / 2 - SURVEY_WIDTH_PX.thermocline / 2 - 0.5;

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
 * What the `plate` mode reads of the frame it is drawn into (markPlates.ts
 * `PlatePass`): the world pass's depth and one of its texels, so a plate is
 * hidden by the world as its stroke is, and how far past a stroke its plate
 * stands whole and then fades, in the frame's own pixels.
 */
export interface SurveyInkPlateUniforms {
  uPlateDepth: { value: DepthTexture | null };
  uPlateTexel: { value: Vector2 };
  uPlateReach: { value: Vector2 };
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

/**
 * The free-water study's survey floor as a texture its pass reads: one float
 * a sample, nearest, no mipmaps — the bake's own floor at each pixel it reads
 * (seabed.ts `BakeOptions.eroded.floors`). The study's ramps are about 80 m
 * across, under three of its vertex steps, so contoured from the vertices
 * each would step along the vertex grid wherever it crossed it at an angle,
 * the foot of a ramp most, where the floor leaves its plain. The
 * pass blends the four samples round a fragment itself, since a float
 * texture is not filtered on every device. The coastlines need no such grid:
 * their fields are distances, which a triangle carries straight.
 */
export function surveyFloorTexture(samples: SurveyFloorSamples): DataTexture {
  const texture = new DataTexture(samples.data, samples.nx, samples.nz, RedFormat, FloatType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** What the study's pass reads beside the cells: its floor, and the grid it lies on. */
export interface DrawnSurvey {
  floor: DataTexture;
  samples: SurveyFloorSamples;
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

function fragmentPars(plate = false): string {
  const majors = MAJOR_ISOBATHS_M.map(glslFloat).join(', ');
  // A plate's line is its stroke's, whole to `uPlateReach.x` pixels past the
  // stroke's edge and gone `uPlateReach.y` further out.
  const edge = plate ? 'widthPx * 0.5 + uPlateReach.x' : 'widthPx * 0.5 - 0.5';
  const gone = plate ? 'widthPx * 0.5 + uPlateReach.x + uPlateReach.y' : 'widthPx * 0.5 + 0.5';
  const minorPx = plate
    ? `( ${glslFloat(SURVEY_WIDTH_PX.minor)} + 2.0 * uPlateReach.x )`
    : glslFloat(SURVEY_WIDTH_PX.minor);
  return [
    ...(plate
      ? ['uniform sampler2D uPlateDepth;', 'uniform vec2 uPlateTexel;', 'uniform vec2 uPlateReach;']
      : []),
    'uniform sampler2D uSurveyCells;',
    'uniform vec3 uSurveyGrid;',
    'uniform vec3 uSurveyInk;',
    'varying float vSurveyFloor;',
    'varying vec2 vSurveyXZ;',
    `const int SURVEY_MAJOR_COUNT = ${MAJOR_ISOBATHS_M.length};`,
    `const float SURVEY_MAJORS[${MAJOR_ISOBATHS_M.length}] = float[${MAJOR_ISOBATHS_M.length}](${majors});`,
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
    `  return 1.0 - smoothstep( ${edge}, ${gone}, px );`,
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
    `  float average = min( 1.0, ${minorPx} / spacing );`,
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
    // Two strokes either side of the level, each the minor's width. Distance
    // alone, so the rule holds on every curve: a dash would need an arc
    // length the fragment does not have, and a dash already means a biome.
    'float surveyThermoclinePx( float d, float perPx ) {',
    `  return abs( d - ${glslFloat(THERMOCLINE_ISOBATH_M)} - ${glslFloat(LEVEL_OFFSET_M)} ) / perPx;`,
    '}',
    'float surveyThermocline( float px ) {',
    `  return surveyLine( abs( px - ${glslFloat(THERMOCLINE_RULE_GAP_PX / 2)} ), ${glslFloat(SURVEY_WIDTH_PX.thermocline)} );`,
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
  'uniform sampler2D uSurveyFloor;',
  'uniform vec4 uSurveyFloorGrid;',
  'varying float vSurveyCoast;',
  'varying vec3 vSurveyBiomeA;',
  'varying vec3 vSurveyBiomeB;',
  // The study's floor at a plan point, its four samples blended.
  'float surveyFloorAt( vec2 xz ) {',
  '  vec2 g = clamp( ( xz - uSurveyFloorGrid.w ) / uSurveyFloorGrid.z, vec2( 0.0 ), uSurveyFloorGrid.xy - 1.0 );',
  '  ivec2 i = min( ivec2( floor( g ) ), ivec2( uSurveyFloorGrid.xy ) - 2 );',
  '  vec2 f = g - vec2( i );',
  '  float a = texelFetch( uSurveyFloor, i, 0 ).r;',
  '  float b = texelFetch( uSurveyFloor, i + ivec2( 1, 0 ), 0 ).r;',
  '  float c = texelFetch( uSurveyFloor, i + ivec2( 0, 1 ), 0 ).r;',
  '  float d = texelFetch( uSurveyFloor, i + ivec2( 1, 1 ), 0 ).r;',
  '  return mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y );',
  '}',
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

/** The isobaths over water of a floor `d`, shared by both kinds of coast. */
const isobaths = (d: string) =>
  [
    `    float thermoPx = surveyThermoclinePx( ${d}, perPx );`,
    // The minor at the layer's depth would fill the rule's gap and read as one
    // thick line; a scarp's averaged band is cut there too, so the rule still
    // shows as a clear seam across it.
    `    minor = surveyIsobaths( ${d}, perPx ) * smoothstep( ${glslFloat(THERMOCLINE_GAP_EDGE_PX)}, ${glslFloat(THERMOCLINE_RULE_GAP_PX / 2)}, thermoPx );`,
    `    major = surveyMajors( ${d}, perPx );`,
    '    thermocline = surveyThermocline( thermoPx );',
  ].join('\n');

/** The strongest stroke at a pixel, shared by both passes and every mode. */
const INK_COVERAGE = [
  // The strongest stroke at this pixel wins rather than all four stacking:
  // a major isobath running along a coast is one line, not two.
  `  float ink = max( max( minor * ${glslFloat(SURVEY_ALPHA.minor)}, major * ${glslFloat(SURVEY_ALPHA.major)} ),`,
  `                   max( border * ${glslFloat(SURVEY_ALPHA.border)}, coast * ${glslFloat(SURVEY_ALPHA.coast)} ) );`,
  `  ink = max( ink, thermocline * ${glslFloat(SURVEY_ALPHA.thermocline)} );`,
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
 * A stroke's plate (`SurveyInkMode`, `plate`; docs/art-direction.md, "The
 * plate under a mark"): how whole a plate stands at this pixel, whichever
 * stroke it is under. A stroke's alpha is not in it: a faint stroke needs
 * its ground as much as a strong one.
 */
const INK_PLATE = [
  // No discard here: the patch takes a derivative after this, and the mask
  // keeps the greater of what is drawn into it, so nothing is nothing.
  '  float ink = max( max( minor, major ), max( max( border, coast ), thermocline ) );',
  '  diffuseColor = vec4( vec3( 1.0 ), ink );',
].join('\n');

/**
 * What the patch draws. `ground` is the Low graphics quality's and every
 * build's before it: the strokes mixed into the material's own ground.
 * The High quality splits the two (docs/art-direction.md, "Two layers, two
 * laws"): `overlay` draws the strokes alone, over ground the lit world pass
 * drew, fading into the water by coverage rather than by colour; `carrier`
 * draws none, and gives a lit ground the varyings and the encode pair the
 * silt detail reads (seabedDetail.ts); `plate` draws where the strokes'
 * plates stand, into the plate pass's mask (markPlates.ts), and returns the
 * uniforms that pass sets.
 */
export type SurveyInkMode = 'ground' | 'overlay' | 'carrier' | 'plate';

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
  '  float thermocline = 0.0;',
  // Rock has no floor to measure (rule 7).
  '  if ( here < 0.99 ) {',
  isobaths('vSurveyFloor'),
  '  }',
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
 * The study's pass (docs/map-visuals.md §4, the study's clause): the same
 * isobaths, of its rounded floor read from the finer samples
 * (`DrawnSurvey`), and the coastlines on the zeros of its coast fields rather
 * than on the cell edges. Water is the coast field's negative side, so rock
 * still takes no isobaths (rule 7) and a biome's dash stops at the stone.
 */
const DRAWN_FRAGMENT_MAIN = [
  '{',
  // Derivatives first, outside every branch, as the cell pass takes them.
  '  float surveyFloorM = surveyFloorAt( vSurveyXZ );',
  '  float perPx = max( fwidth( surveyFloorM ), 1e-4 );',
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
  '  float minor = 0.0;',
  '  float major = 0.0;',
  '  float thermocline = 0.0;',
  '  bool water = vSurveyCoast < 0.0;',
  // Rock has no floor to measure (rule 7).
  '  if ( water ) {',
  isobaths('surveyFloorM'),
  '  }',
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
 * Patch the terrain's material to draw the survey. The geometry must carry a
 * `surveyFloor` attribute — `HeightGrid.floor`, one float per vertex — and,
 * `drawn`, the free-water study's coast fields too: `surveyCoast` from
 * `HeightGrid.coast`, and `surveyBiomeA` and `surveyBiomeB` from the first
 * and last three of `HeightGrid.biomes`. Drawn, the coastlines run on those
 * fields' zeros rather than the cell edges, and the isobaths contour the
 * floor `drawn` hands over (docs/map-visuals.md §4, the study's clause).
 */
export function installSurveyInk(
  material: Material,
  terrain: TerrainPayload,
  cells: DataTexture,
  drawn: DrawnSurvey | null = null,
  mode: SurveyInkMode = 'ground'
): SurveyInkUniforms & Partial<SurveyInkPlateUniforms> {
  const plate: SurveyInkPlateUniforms | null =
    mode === 'plate'
      ? {
          uPlateDepth: { value: null },
          uPlateTexel: { value: new Vector2(1, 1) },
          uPlateReach: { value: new Vector2(0, 1) },
        }
      : null;
  const uniforms: SurveyInkUniforms & Partial<SurveyInkPlateUniforms> = {
    ...(plate ?? {}),
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
  const vertexPars = drawn ? `${VERTEX_PARS}\n${DRAWN_VERTEX_PARS}` : VERTEX_PARS;
  const vertexMain = drawn ? `${VERTEX_MAIN}\n${DRAWN_VERTEX_MAIN}` : VERTEX_MAIN;
  const strokes = drawn ? DRAWN_FRAGMENT_MAIN : FRAGMENT_MAIN;
  const fragmentMain =
    mode === 'carrier'
      ? ''
      : mode === 'overlay'
        ? strokes.replace(INK, INK_OVERLAY)
        : mode === 'plate'
          ? strokes.replace(INK, INK_PLATE)
          : strokes;
  const drawnUniforms =
    drawn === null
      ? {}
      : {
          uSurveyFloor: { value: drawn.floor },
          uSurveyFloorGrid: {
            value: [drawn.samples.nx, drawn.samples.nz, drawn.samples.stepM, drawn.samples.originM],
          },
        };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, drawnUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexPars}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexMain}`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\n${fragmentPars(mode === 'plate')}${drawn ? `\n${DRAWN_FRAGMENT_PARS}` : ''}`
      )
      .replace('#include <color_fragment>', `#include <color_fragment>\n${fragmentMain}`);
    // The strokes swim out by coverage: mixed toward the water's colour as
    // the ground's fog does, a far stroke would paint that colour over the
    // lit world's own water.
    if (mode === 'overlay') {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <fog_fragment>',
        [
          '#ifdef USE_FOG',
          '  gl_FragColor.a *= exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );',
          '#endif',
        ].join('\n')
      );
    }
    // A plate swims out as its stroke does, and is hidden by the world as its
    // stroke is: the mask has no depth of its own, so the world pass's is
    // read, with the slope's own share of a pixel as the margin. What is left
    // is the plate's coverage, untouched by the curve the material ran.
    if (mode === 'plate') {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <fog_fragment>',
        [
          'float plateCover = diffuseColor.a;',
          '#ifdef USE_FOG',
          '  plateCover *= exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );',
          '#endif',
          'float plateSlope = fwidth( gl_FragCoord.z );',
          'if ( gl_FragCoord.z > texture2D( uPlateDepth, gl_FragCoord.xy * uPlateTexel ).r + 2.0 * plateSlope + 1e-6 ) discard;',
          'gl_FragColor = vec4( vec3( plateCover ), 1.0 );',
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
