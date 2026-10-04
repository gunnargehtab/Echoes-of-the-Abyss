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
 * - **Darken-only and hue-preserving.** Every term is a fraction in [0, 1]
 *   times a strength, and the three channels scale together. A row's strengths
 *   sum to at most half the hillshade's darkest shadow, so the detail can never
 *   out-shade an authored step — a property of the table the tests hold, not of
 *   a picture.
 * - **Deterministic.** An integer hash of world position. `fract(sin(x) * k)`
 *   keeps few bits at map coordinates in single precision and differs between
 *   GPUs, which is why it is not used here.
 * - **Quiet at distance.** Each octave fades as its wavelength nears a pixel,
 *   and the whole layer is gone by `FADE_M_PER_PX[1]`, so the survey dolly
 *   reads the bake and the ink and nothing else.
 *
 * Gated: development only, behind `?seabed-detail=1` or `?dream-loop=1`, and on
 * the standard surfaces only. Promotion to every match is `seabedDetailEnabled`
 * and the decision the SPEC section records.
 */
import { DataTexture, LinearFilter, type Material, RGBAFormat, UnsignedByteType } from 'three';
import { Biome, SEABED_DETAIL } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { KEY_LIGHT } from './palette.ts';

/**
 * Whether this page studies the silt detail. Development builds only, and only
 * on an explicit opt-in: its own flag, or #967's dream loop, which studies it
 * with the rest of the conn scene.
 */
export function seabedDetailEnabled(dev: boolean, search: string): boolean {
  if (!dev) return false;
  const params = new URLSearchParams(search);
  return params.get('seabed-detail') === '1' || params.get('dream-loop') === '1';
}

export const SEABED_DETAIL_ON =
  import.meta.env?.DEV === true &&
  seabedDetailEnabled(true, typeof window === 'undefined' ? '' : window.location.search);

/**
 * The texel's byte range covers strengths up to this. Bytes round down, so a
 * stored row never sums above the table's own.
 */
export const STRENGTH_SCALE = 0.25;

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

/**
 * The GLSL, as text so a test can read what the GPU will run. pcg2d
 * (Jarzynski and Olano, 2020) folded to one word; value noise with its
 * analytic gradient, so a dune's slope costs no second sample.
 */
function fragmentPars(): string {
  return `
uniform sampler2D uGroundDetail;
uniform vec2 uGroundDetailSize;
uint groundHash(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return v.x;
}
float groundLattice(ivec2 c, uint salt) {
  uvec2 at = uvec2(c + 4096) ^ uvec2(salt * 0x9e3779b9u, salt * 0x85ebca6bu);
  return float(groundHash(at) >> 8u) * (1.0 / 16777216.0);
}
vec3 groundNoise(vec2 x, uint salt) {
  vec2 i = floor(x);
  vec2 t = x - i;
  vec2 u = t * t * (3.0 - 2.0 * t);
  vec2 du = 6.0 * t * (1.0 - t);
  ivec2 c = ivec2(i);
  float a = groundLattice(c, salt);
  float b = groundLattice(c + ivec2(1, 0), salt);
  float d = groundLattice(c + ivec2(0, 1), salt);
  float e = groundLattice(c + ivec2(1, 1), salt);
  float k = a - b - d + e;
  return vec3(a + (b - a) * u.x + (d - a) * u.y + k * u.x * u.y,
              du * vec2(b - a + k * u.y, d - a + k * u.x));
}
`;
}

function fragmentMain(): string {
  const d = SEABED_DETAIL;
  const [lx, lz] = lightHeading();
  const stoss = 1 - d.DUNE_LEE;
  const rippleStoss = 1 - d.RIPPLE_LEE;
  // A lee face as steep as a full-patch dune's steepest darkens by the whole
  // term: the smoothstep profile's peak slope is 1.5 per cycle over the lee.
  const leeNorm = (d.DUNE_M * d.DUNE_LEE) / 1.5;
  return `
{
  vec2 gp = vSurveyXZ;
  vec4 gStrength = texture2D(uGroundDetail, gp / uGroundDetailSize) * ${f(STRENGTH_SCALE)};
  // Derivatives first, outside every branch.
  float gMpp = max(max(length(dFdx(gp)), length(dFdy(gp))), 1e-4);
  float gFade = 1.0 - smoothstep(${f(d.FADE_M_PER_PX[0])}, ${f(d.FADE_M_PER_PX[1])}, gMpp);
  vec2 gLight = vec2(${f(lx)}, ${f(lz)});

  // The meander dunes and ripples share, so their crests stay parallel.
  vec3 gW1 = groundNoise(gp / ${f(d.MEANDER_M)}, 1u);
  vec3 gW2 = groundNoise(gp / ${f(d.MEANDER_FINE_M)}, 2u);
  float gWarp = ${f(d.MEANDER_CYCLES)} * gW1.x + ${f(d.MEANDER_FINE_CYCLES)} * gW2.x;
  vec2 gWarpGrad = ${f(d.MEANDER_CYCLES)} * gW1.yz / ${f(d.MEANDER_M)} +
                   ${f(d.MEANDER_FINE_CYCLES)} * gW2.yz / ${f(d.MEANDER_FINE_M)};

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
  float gPatch = mix(${f(d.PATCH_FLOOR)}, 1.0, groundNoise(gp / ${f(d.PATCH_M)}, 3u).x);
  // A face darkens when the ground rises toward the light: it faces away.
  float gDune = clamp(gPatch * gSlope * dot(gCycleGrad, gLight) * ${f(leeNorm)}, 0.0, 1.0);

  // Ripples: the dunes' meander at their own spacing, lying in the troughs.
  float gRCycle = (gp.y + gWarp * ${f(d.DUNE_M)}) / ${f(d.RIPPLE_M)} +
                  0.6 * groundNoise(gp / 25.0, 4u).x;
  float gR = fract(gRCycle);
  float gRLee = gR >= ${f(rippleStoss)} ? sin(PI * (gR - ${f(rippleStoss)}) / ${f(d.RIPPLE_LEE)}) : 0.0;
  float gAway = clamp(-dot(normalize(gCycleGrad), gLight), 0.0, 1.0);
  float gRipple = gRLee * gAway * (1.0 - gProfile) *
                  smoothstep(${f(d.RIPPLE_PX[0])}, ${f(d.RIPPLE_PX[1])}, ${f(d.RIPPLE_M)} / gMpp);

  // Scours: hollows the current took, on their own field.
  float gScour = smoothstep(0.5, 0.85, groundNoise(gp / ${f(d.SCOUR_M)} + gW1.x * 1.7, 5u).x);

  // Grain, two octaves, each gone before it can alias.
  float gGrain =
      0.6 * groundNoise(gp / ${f(d.GRAIN_M)}, 6u).x *
          smoothstep(3.0, 6.0, ${f(d.GRAIN_M)} / gMpp) +
      0.4 * groundNoise(gp / ${f(d.GRAIN_M * 0.43)}, 7u).x *
          smoothstep(3.0, 6.0, ${f(d.GRAIN_M * 0.43)} / gMpp);

  diffuseColor.rgb *= 1.0 - gFade * dot(gStrength, vec4(gDune, gRipple, gScour, gGrain));
}
`;
}

export interface GroundDetailUniforms {
  uGroundDetail: { value: DataTexture };
  uGroundDetailSize: { value: [number, number] };
}

/**
 * Patch the terrain's material to shade the silt detail. Install after the
 * survey ink: it reads the ink's world position (`vSurveyXZ`), chains the ink's
 * hook and key, and lands right after the bake's colour — before the ink and
 * the fog, after the veil's vertex colour, which three applies inside
 * `<color_fragment>`.
 */
export function installGroundDetail(
  material: Material,
  terrain: TerrainPayload,
  texture: DataTexture
): GroundDetailUniforms {
  const uniforms: GroundDetailUniforms = {
    uGroundDetail: { value: texture },
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
  material.customProgramCacheKey = () => `${key}:seabed-detail-1`;
  material.needsUpdate = true;
  return uniforms;
}
