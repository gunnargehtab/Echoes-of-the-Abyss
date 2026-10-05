/**
 * Silt detail — docs/art-direction.md "Silt detail and seated stones — SPEC" (#1083).
 *
 * The bake (seabed.ts) draws the ground at 7.8 m a pixel; at the home dolly a
 * pixel is about a metre, so the plain between two isobaths is one smooth wash.
 * This layer gives it dunes, ripples, scours and grain in the terrain's own
 * fragment shader: no pass, no draw call, no triangle, and one RGBA8 texel a
 * cell to say how much of each the ground under it carries.
 *
 * The rules are the bake's, restated because a shader makes them easier to
 * forget than a canvas did:
 *
 * - **Render-only.** Nothing in the simulation reads it, and nothing here reads
 *   anything but the public cell grid: biome and rock.
 * - **Centred, capped and hue-preserving** (#1103). Every term is signed, in
 *   [-1, 1], times a strength: positive darkens and negative lifts. Each is
 *   centred so that its mean over its own scale darkens or holds, never lifts,
 *   and the gain is cut at `DETAIL_LIFT`, the silt's share of `TERRAIN_LIFT`.
 *   The three channels scale together, in encoded space as the bake's bytes do
 *   (the survey ink's own transfer). A row's strengths sum to at most
 *   `MAX_SUM`, so the darkest the detail leaves is still lighter than a
 *   full-strength authored face — a property of the table the tests hold, not
 *   of a picture.
 * - **Deterministic.** The shader hashes nothing: its noise is a lattice of
 *   `propHash` bytes in one 128² texture, the same on every client. A shader
 *   hash such as `fract(sin(x) * k)` keeps few bits at map coordinates in
 *   single precision and differs between GPUs; an integer one cost the named
 *   GPU up to 1 ms a frame.
 * - **Quiet at distance.** Each octave fades as its wavelength nears a pixel,
 *   and the whole layer is gone by `FADE_M_PER_PX[1]`, so the survey dolly
 *   reads the bake and the ink and nothing else.
 *
 * In every match since #1103, on the standard surfaces only. A development
 * build can turn it off with `?seabed-detail=0`, for an on/off pair.
 */
import {
  DataTexture,
  LinearFilter,
  type Material,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
} from 'three';
import { Biome, SEABED_DETAIL, TERRAIN_LIFT } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { KEY_LIGHT } from './palette.ts';
import { propHash } from './environment.ts';

/**
 * Whether this page draws the silt detail: always, but for a development build
 * opened with `?seabed-detail=0`, which is the off half of an on/off pair.
 * No shipped build can turn it off (docs/art-direction.md "Silt detail and
 * seated stones — SPEC", #1103).
 */
export function seabedDetailEnabled(dev: boolean, search: string): boolean {
  return !(dev && new URLSearchParams(search).get('seabed-detail') === '0');
}

/** The predicate is the only gate. */
export const SEABED_DETAIL_ON = seabedDetailEnabled(
  import.meta.env?.DEV === true,
  typeof window === 'undefined' ? '' : window.location.search
);

/**
 * The texel's byte range covers strengths up to this. Bytes round down, so a
 * stored row never sums above the table's own.
 */
export const STRENGTH_SCALE = 0.25;

/**
 * The most the detail lifts the bake's pixel, as a gain over 1: what the cap
 * leaves once the bake's own texture has taken its share, so the two together
 * never lift a pixel past `TERRAIN_LIFT.MAX` of its fill.
 */
export const DETAIL_LIFT = (1 + TERRAIN_LIFT.MAX) / (1 + TERRAIN_LIFT.BAKE) - 1;

/**
 * The centres, derived and rounded toward dark; the tests recompute each and
 * hold the mean it promises.
 *
 * A dune's hillshade saturates (`DUNE_CONTRAST`), and its two faces are not
 * the same width: on a stoss 70 % of the cycle, a lift as strong as the lee's
 * shadow would tip the cycle bright. So its lit side is scaled by the most
 * that keeps every cycle's mean at or under the fill, at every heading and
 * strength the meander can give it — 0.447, here 0.44.
 */
export const DUNE_LIT_SCALE = 0.44;
/** A ripple's lee bump, sin over `RIPPLE_LEE` of the cycle, averages this over its 7 m. */
export const RIPPLE_MEAN = (2 * SEABED_DETAIL.RIPPLE_LEE) / Math.PI;
/** The share of hollow the scour's smoothstep takes off the lattice: 0.2001, here 0.199. */
export const SCOUR_MEAN = 0.199;
/**
 * The lattice's mean byte in the grain's two channels, blue and alpha, as the
 * GPU reads it (n / 255): 0.4962 and 0.4991. Value noise over the lattice
 * averages its lattice points, so this is the grain's mean too.
 */
export const GRAIN_MEAN: readonly [number, number] = [0.496, 0.499];

/** The strengths a cell's ground carries: dunes, ripples, scours, grain. */
export function detailStrengths(
  terrain: Pick<TerrainPayload, 'biomes' | 'floor' | 'ceiling'>,
  index: number
): readonly [number, number, number, number] {
  if (terrain.ceiling[index]! > terrain.floor[index]!) return SEABED_DETAIL.ROCK_STRENGTH;
  return (
    SEABED_DETAIL.STRENGTH[terrain.biomes[index] as Biome] ??
    SEABED_DETAIL.STRENGTH[Biome.OpenWater]
  );
}

function writeCell(
  out: Uint8Array,
  terrain: Pick<TerrainPayload, 'biomes' | 'floor' | 'ceiling'>,
  index: number
): void {
  const strengths = detailStrengths(terrain, index);
  for (let k = 0; k < 4; k++) {
    out[index * 4 + k] = Math.min(255, Math.floor((strengths[k]! / STRENGTH_SCALE) * 255));
  }
}

/** One RGBA texel a cell, row 0 the map's north edge, as the bake and the survey lay it. */
export function groundDetailCells(terrain: TerrainPayload): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(terrain.cols * terrain.rows * 4);
  for (let i = 0; i < terrain.cols * terrain.rows; i++) writeCell(out, terrain, i);
  return out;
}

/**
 * Rewrite the cells a ground delta touched, in place (#434). A cell's
 * strengths read nothing but the cell itself, so the touched rectangle is all
 * that moves: the filter blends neighbours on the GPU, not here.
 */
export function patchGroundDetailCells(
  cells: Uint8Array,
  terrain: TerrainPayload,
  touched: { col0: number; row0: number; col1: number; row1: number }
): void {
  const col0 = Math.max(0, touched.col0);
  const row0 = Math.max(0, touched.row0);
  const col1 = Math.min(terrain.cols - 1, touched.col1);
  const row1 = Math.min(terrain.rows - 1, touched.row1);
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) writeCell(cells, terrain, row * terrain.cols + col);
  }
}

/**
 * The strengths as a texture. Linear filtering does the bake's `lerp2`: with
 * texel centres on cell centres, a fragment between four cells gets their
 * bilinear blend, so the amount of texture fades across a biome edge while
 * the field itself stays continuous. Linear data, no mipmaps: the layer is
 * gone long before a cell shrinks under a pixel.
 */
export function groundDetailTexture(terrain: TerrainPayload, cells: Uint8Array<ArrayBuffer>) {
  const texture = new DataTexture(cells, terrain.cols, terrain.rows, RGBAFormat, UnsignedByteType);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const f = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);

/** The key light's horizontal heading, map x east and z south: where a face turns from it. */
function lightHeading(): [number, number] {
  const length = Math.hypot(KEY_LIGHT.x, KEY_LIGHT.y);
  return [KEY_LIGHT.x / length, KEY_LIGHT.y / length];
}

/** The noise lattice's side, in lattice points (`SEABED_DETAIL.NOISE_SIZE`). */
export const NOISE_SIZE = SEABED_DETAIL.NOISE_SIZE;

/**
 * Four independent lattices, one byte a point a channel, from `propHash`: the
 * same bytes on every client. The shader interpolates them as value noise, so
 * the GPU never hashes. The first cut hashed in the shader, pcg2d, nine noises
 * of four lattice points a fragment: 32-bit integer multiplies, which the named
 * GPU runs at a fraction of its float rate, cost up to 1 ms a frame at ratio 1.5.
 */
export function groundNoisePixels(): Uint8Array<ArrayBuffer> {
  const pixels = new Uint8Array(NOISE_SIZE * NOISE_SIZE * 4);
  for (let y = 0; y < NOISE_SIZE; y++) {
    for (let x = 0; x < NOISE_SIZE; x++) {
      for (let c = 0; c < 4; c++) {
        pixels[(y * NOISE_SIZE + x) * 4 + c] = Math.floor(propHash([x, y, c, 0x51d7]) * 256);
      }
    }
  }
  return pixels;
}

let noise: DataTexture | null = null;

/**
 * Page-lifetime and shared, like the Sorrowgate surface: 64 KiB, never per
 * match. Linear, repeating, no mipmaps — the shader's smoothstep-shifted
 * coordinates step at every lattice line, which would throw a mip chain's
 * level choice, and the layer is gone before a lattice cell shrinks to a pixel.
 */
export function groundNoiseTexture(): DataTexture {
  if (noise !== null) return noise;
  noise = new DataTexture(
    groundNoisePixels(),
    NOISE_SIZE,
    NOISE_SIZE,
    RGBAFormat,
    UnsignedByteType
  );
  noise.name = 'seabed-detail-noise';
  noise.wrapS = noise.wrapT = RepeatWrapping;
  noise.magFilter = LinearFilter;
  noise.minFilter = LinearFilter;
  noise.generateMipmaps = false;
  noise.needsUpdate = true;
  return noise;
}

/**
 * The GLSL, as text so a test can read what the GPU will run. `groundNoise`
 * is value noise in all four channels from one fetch: the lattice is the
 * texture, and shifting the coordinate by the smoothstep of its fraction makes
 * the bilinear filter interpolate it as value noise does.
 */
function fragmentPars(): string {
  return `
uniform sampler2D uGroundDetail;
uniform sampler2D uGroundNoise;
uniform vec2 uGroundDetailSize;
vec4 groundNoise(vec2 x) {
  vec2 i = floor(x);
  vec2 t = x - i;
  return texture2D(uGroundNoise, (i + t * t * (3.0 - 2.0 * t) + 0.5) / ${f(NOISE_SIZE)});
}
`;
}

function fragmentMain(): string {
  const d = SEABED_DETAIL;
  const [lx, lz] = lightHeading();
  const stoss = 1 - d.DUNE_LEE;
  const rippleStoss = 1 - d.RIPPLE_LEE;
  // A lee face as steep as a full-patch dune's steepest reaches the end of
  // the term: the smoothstep profile's peak slope is 1.5 per cycle over the lee.
  const leeNorm = (d.DUNE_M * d.DUNE_LEE) / 1.5;
  return `
{
  vec2 gp = vSurveyXZ;
  vec4 gStrength = texture2D(uGroundDetail, gp / uGroundDetailSize) * ${f(STRENGTH_SCALE)};
  // Derivatives first, outside every branch.
  vec2 gDx = dFdx(gp);
  vec2 gDy = dFdy(gp);
  float gMpp = max(max(length(gDx), length(gDy)), 1e-4);
  float gFade = 1.0 - smoothstep(${f(d.FADE_M_PER_PX[0])}, ${f(d.FADE_M_PER_PX[1])}, gMpp);
  vec2 gLight = vec2(${f(lx)}, ${f(lz)});

  // The meander dunes and ripples share, so their crests stay parallel; the
  // coarse fetch's second channel is the patch field that fades the dunes.
  vec4 gN1 = groundNoise(gp / ${f(d.MEANDER_M)});
  vec4 gN2 = groundNoise(gp / ${f(d.MEANDER_FINE_M)} + 37.0);
  float gWarp = ${f(d.MEANDER_CYCLES)} * gN1.r + ${f(d.MEANDER_FINE_CYCLES)} * gN2.r;
  // Its world gradient from its screen derivatives: the meander is smooth
  // over many pixels, so a quad's difference is its slope, and no fetch is
  // spent on it. Clamped where a silhouette makes the quad a poor witness.
  vec2 gWs = vec2(dFdx(gWarp), dFdy(gWarp));
  float gDet = gDx.x * gDy.y - gDx.y * gDy.x;
  vec2 gWarpGrad = abs(gDet) > 1e-6
      ? vec2(gWs.x * gDy.y - gDx.y * gWs.y, gDx.x * gWs.y - gWs.x * gDy.x) / gDet
      : vec2(0.0);
  float gWarpMax = 3.0 / ${f(d.MEANDER_FINE_M)};
  gWarpGrad *= min(1.0, gWarpMax / max(length(gWarpGrad), 1e-6));

  // Dunes: crests east-west, the lee the south share of each, down-current.
  float gCycle = gp.y / ${f(d.DUNE_M)} + gWarp;
  vec2 gCycleGrad = vec2(0.0, 1.0 / ${f(d.DUNE_M)}) + gWarpGrad;
  float gT = fract(gCycle);
  float gRise = clamp(gT / ${f(stoss)}, 0.0, 1.0);
  float gFall = clamp((gT - ${f(stoss)}) / ${f(d.DUNE_LEE)}, 0.0, 1.0);
  bool gLee = gT >= ${f(stoss)};
  float gProfile = gLee ? 1.0 - gFall * gFall * (3.0 - 2.0 * gFall) : gRise * gRise * (3.0 - 2.0 * gRise);
  float gSlope = gLee ? -6.0 * gFall * (1.0 - gFall) / ${f(d.DUNE_LEE)}
                      : 6.0 * gRise * (1.0 - gRise) / ${f(stoss)};
  float gPatch = mix(${f(d.PATCH_FLOOR)}, 1.0, gN1.g);
  // A hillshade about flat ground: a face turned from the light (the ground
  // rising toward it) runs to 1, one turned to it toward -1. DUNE_CONTRAST
  // saturates it, so most of a lee reads dark and most of a stoss lit, rather
  // than a thin line where the profile is steepest; the lit side is scaled so
  // the wider face cannot tip the cycle bright (DUNE_LIT_SCALE).
  float gDune = clamp(${f(d.DUNE_CONTRAST)} * gPatch * gSlope *
                      dot(gCycleGrad, gLight) * ${f(leeNorm)}, -1.0, 1.0);
  gDune = gDune < 0.0 ? ${f(DUNE_LIT_SCALE)} * gDune : gDune;

  // Scours: hollows the current took, drawn out along it, north-south. The
  // stretch comes first, so the noise stays isotropic in the stretched frame and
  // the hollows lie along z; the turn after it sets the lattice off the map's
  // axes, so no square of it shows. The first fetch's last channel wobbles the
  // ripples.
  vec2 gQ = mat2(0.866, -0.5, 0.5, 0.866) *
            (gp / vec2(${f(d.SCOUR_M)}, ${f(d.SCOUR_M * d.SCOUR_STRETCH)}));
  vec4 gS1 = groundNoise(gQ + gN1.b * 1.7);
  vec4 gS2 = groundNoise(gQ * 2.3 + 11.0);
  float gScour = smoothstep(0.52, 0.78, 0.65 * gS1.r + 0.35 * gS2.g) - ${f(SCOUR_MEAN)};

  // Ripples: the dunes' meander at their own spacing, lying in the troughs.
  float gRCycle = (gp.y + gWarp * ${f(d.DUNE_M)}) / ${f(d.RIPPLE_M)} + 0.6 * gS1.a;
  float gR = fract(gRCycle);
  // Centred over its own cycle: the lee darkens and the rest lifts as much.
  float gRLee = (gR >= ${f(rippleStoss)} ? sin(PI * (gR - ${f(rippleStoss)}) / ${f(d.RIPPLE_LEE)}) : 0.0) -
                ${f(RIPPLE_MEAN)};
  float gAway = clamp(-dot(normalize(gCycleGrad), gLight), 0.0, 1.0);
  float gRipple = gRLee * gAway * (1.0 - gProfile) *
                  smoothstep(${f(d.RIPPLE_PX[0])}, ${f(d.RIPPLE_PX[1])}, ${f(d.RIPPLE_M)} / gMpp);

  // Grain, two octaves, each centred on the lattice's mean and gone before it
  // can alias.
  float gGrain =
      1.2 * (groundNoise(gp / ${f(d.GRAIN_M)} + 71.0).b - ${f(GRAIN_MEAN[0])}) *
          smoothstep(${f(d.GRAIN_PX[0])}, ${f(d.GRAIN_PX[1])}, ${f(d.GRAIN_M)} / gMpp) +
      0.8 * (groundNoise(gp / ${f(d.GRAIN_FINE_M)} + 19.0).a - ${f(GRAIN_MEAN[1])}) *
          smoothstep(${f(d.GRAIN_PX[0])}, ${f(d.GRAIN_PX[1])}, ${f(d.GRAIN_FINE_M)} / gMpp);

  // In encoded space, as the bake scales its bytes: a strength here is the
  // same gain as RELIEF_DEPTH there, so the bound compares like with like. The
  // clamp is what makes the dark bound structural: no term past 1, whatever a
  // later edit does to one. The min is the lift's cap.
  vec4 gTerms = clamp(vec4(gDune, gRipple, gScour, gGrain), -1.0, 1.0);
  float gGain = min(1.0 - gFade * dot(gStrength, gTerms), ${f(1 + DETAIL_LIFT)});
  diffuseColor.rgb = surveyDecode(surveyEncode(diffuseColor.rgb) * gGain);
}
`;
}

export interface GroundDetailUniforms {
  uGroundDetail: { value: DataTexture };
  uGroundNoise: { value: DataTexture };
  uGroundDetailSize: { value: [number, number] };
}

/**
 * Patch the terrain's material to shade the silt detail. Install after the
 * survey ink: it reads the ink's world position (`vSurveyXZ`) and its sRGB
 * transfer, chains the ink's hook and key, and lands right after the bake's
 * colour — before the ink and the fog, after the veil's vertex colour, which
 * three applies inside `<color_fragment>`.
 */
export function installGroundDetail(
  material: Material,
  terrain: TerrainPayload,
  texture: DataTexture
): GroundDetailUniforms {
  const uniforms: GroundDetailUniforms = {
    uGroundDetail: { value: texture },
    uGroundNoise: { value: groundNoiseTexture() },
    uGroundDetailSize: { value: [terrain.cols * terrain.cellM, terrain.rows * terrain.cellM] },
  };
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${fragmentPars()}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${fragmentMain()}`);
  };
  material.customProgramCacheKey = () => `${key}:seabed-detail-3`;
  material.needsUpdate = true;
  return uniforms;
}
