/**
 * The lit ground: the High graphics quality's seabed and stone
 * (docs/art-direction.md, "Two layers, two laws"; #1801).
 *
 * At Low the ground is one unlit material over a bake that has its light
 * shaded in (seabed.ts). At High the same mesh takes light instead: the bake
 * hands over each pixel's albedo, slope and occlusion beside the skin
 * (`BakeOptions.lit`), and this patch lights them with the rig the models
 * already stand under (`MODEL_LIGHTING`: the ambient, the key and the rim),
 * so the ground and the hulls over it are lit from one quarter. The water
 * above the ground takes that light with depth, so depth still darkens.
 *
 * The result is scene-referred: the material draws only in the High world
 * pass, into a linear target, and that pass's composite owns the tone curve
 * (highFrame.ts). The survey ink is not here. It is the tactical layer's, and
 * is drawn over this ground by a pass of its own (surveyInk.ts, `overlay`).
 *
 * Every number is TUNABLE until the owner accepts a High frame
 * (`HIGH_GRAPHICS`, packages/shared/src/constants.ts).
 */

import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  type MeshBasicMaterial,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  Vector3,
} from 'three';
import { HIGH_GRAPHICS, MODEL_LIGHTING } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { MODEL_KEY_FROM, MODEL_RIM_FROM } from './modelLighting.ts';
import { DEPTH_VISUAL_M_PER_M } from './perspectiveTerrain.ts';
import { SEABED_PX_PER_CELL, type LitBake } from './seabed.ts';

/** The lit ground's two textures, and the arrays a bake writes them through. */
export interface LitGroundSurface {
  bake: LitBake;
  albedo: DataTexture;
  relief: DataTexture;
}

/**
 * Allocate the lit ground's pixels for a terrain at the bake's density:
 * 8 bytes a bake pixel, 8 MB for a 32 × 32-cell map before its mips. The
 * arrays are empty until a bake fills them (`BakeOptions.lit`); a ground
 * delta rewrites the touched cells and flags both textures.
 */
export function litGroundSurface(terrain: TerrainPayload, anisotropy: number): LitGroundSurface {
  const width = terrain.cols * SEABED_PX_PER_CELL;
  const height = terrain.rows * SEABED_PX_PER_CELL;
  const bake: LitBake = {
    albedo: new Uint8Array(width * height * 4),
    relief: new Uint8Array(width * height * 4),
    heightPerDepthM: DEPTH_VISUAL_M_PER_M,
  };
  const texture = (data: Uint8Array, name: string, colour: boolean): DataTexture => {
    const made = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
    made.name = name;
    // Row 0 is the map's north edge, as the skin's is: unflipped.
    made.flipY = false;
    made.colorSpace = colour ? SRGBColorSpace : LinearSRGBColorSpace;
    made.magFilter = LinearFilter;
    made.minFilter = LinearMipmapLinearFilter;
    made.generateMipmaps = true;
    made.anisotropy = anisotropy;
    made.needsUpdate = true;
    return made;
  };
  return {
    bake,
    albedo: texture(bake.albedo, 'lit-ground-albedo', true),
    relief: texture(bake.relief, 'lit-ground-relief', false),
  };
}

/** The bytes both textures hold on the GPU, mips included (gate 6's ledger). */
export function litGroundBytes(surface: LitGroundSurface): number {
  return Math.round(((surface.bake.albedo.length + surface.bake.relief.length) * 4) / 3);
}

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

const toLight = (from: readonly [number, number, number]): string => {
  const d = new Vector3(...from).normalize();
  return `vec3( ${glsl(d.x)}, ${glsl(d.y)}, ${glsl(d.z)} )`;
};

const radiance = (hex: number, intensity: number): string => {
  const c = new Color(hex).multiplyScalar(intensity);
  return `vec3( ${glsl(c.r)}, ${glsl(c.g)}, ${glsl(c.b)} )`;
};

/**
 * The rig's light on a surface facing `normal` at world height `worldY`, as
 * three lights a model: Lambert's irradiance, and the water over the surface
 * taking it on the way down. Literals, since the rig is the SPEC's and static.
 */
export const LIT_IRRADIANCE_GLSL = [
  'vec3 echoesLitIrradiance( vec3 normal, float worldY ) {',
  `  vec3 irradiance = ${radiance(MODEL_LIGHTING.AMBIENT_COLOR, MODEL_LIGHTING.AMBIENT)}`,
  `    + ${radiance(MODEL_LIGHTING.KEY_COLOR, MODEL_LIGHTING.KEY)} * max( 0.0, dot( normal, ${toLight(MODEL_KEY_FROM)} ) )`,
  `    + ${radiance(MODEL_LIGHTING.RIM_COLOR, MODEL_LIGHTING.RIM)} * max( 0.0, dot( normal, ${toLight(MODEL_RIM_FROM)} ) );`,
  `  float depthM = max( 0.0, - worldY / ${glsl(DEPTH_VISUAL_M_PER_M)} );`,
  `  return irradiance * exp( - depthM / ${glsl(HIGH_GRAPHICS.LIGHT_FALLOFF_M)} );`,
  '}',
].join('\n');

/** The ground's half: the bake's slope and occlusion under that light. */
export const LIT_GROUND_GLSL = [
  'uniform sampler2D uLitRelief;',
  'varying float vLitWorldY;',
  LIT_IRRADIANCE_GLSL,
  // The slope is the bake's, steepened there; the occlusion is the rim, the
  // lee and the scour the Low bake darkens, which no light here casts.
  'vec3 echoesLitGround( vec3 albedo, vec2 uv, float worldY ) {',
  '  vec4 relief = texture2D( uLitRelief, uv );',
  '  vec2 slope = relief.rb * 2.0 - 1.0;',
  '  vec3 normal = vec3( slope.x, sqrt( max( 0.0, 1.0 - dot( slope, slope ) ) ), slope.y );',
  '  return albedo * echoesLitIrradiance( normal, worldY ) * relief.g * 0.3183098861837907;',
  '}',
].join('\n');

const LIT_GROUND_KEY = ':lit-ground-1';
const LIT_ROOF_KEY = ':lit-roof-1';

/** The unlit sum the patch replaces: three's basic material, r187. */
const UNLIT_SUM = 'vec3 outgoingLight = reflectedLight.indirectDiffuse;';

/**
 * Light this ground material. Its `map` is the lit albedo, and its geometry's
 * `uv` spans the map as the skin's does. Install it last, after the ink's
 * carrier, the veil and the silt detail, which all shape the albedo it
 * lights; it chains their hooks and suffixes their key.
 */
export function installLitGround(material: MeshBasicMaterial, relief: DataTexture): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  const uniforms = { uLitRelief: { value: relief } };
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    if (!shader.fragmentShader.includes(UNLIT_SUM)) {
      throw new Error('three moved the basic material’s unlit sum: installLitGround replaces it');
    }
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vLitWorldY;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvLitWorldY = ( modelMatrix * vec4( transformed, 1.0 ) ).y;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${LIT_GROUND_GLSL}`)
      .replace(
        UNLIT_SUM,
        'vec3 outgoingLight = echoesLitGround( diffuseColor.rgb, vMapUv, vLitWorldY );'
      );
  };
  material.customProgramCacheKey = () => `${key}${LIT_GROUND_KEY}`;
  material.needsUpdate = true;
}

/**
 * Light the stone over a roofed passage (passages.ts). A roof has no bake of
 * its own: its vertex colour is the Low stone, lifted here by the ground's
 * one gain, and its normal is the face's, read off the drawn triangle and
 * turned to the eye, since a roof is seen from above and from inside a mouth.
 * Install it after the veil, whose hook and key it chains.
 */
export function installLitRoof(material: MeshBasicMaterial, albedoGain: number): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    if (!shader.fragmentShader.includes(UNLIT_SUM)) {
      throw new Error('three moved the basic material’s unlit sum: installLitRoof replaces it');
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLitWorld;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvLitWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vLitWorld;\n${LIT_IRRADIANCE_GLSL}`
      )
      .replace(
        UNLIT_SUM,
        [
          'vec3 litFace = normalize( cross( dFdx( vLitWorld ), dFdy( vLitWorld ) ) );',
          'litFace *= sign( dot( litFace, cameraPosition - vLitWorld ) );',
          `vec3 outgoingLight = diffuseColor.rgb * ${glsl(albedoGain)}`,
          '  * echoesLitIrradiance( litFace, vLitWorld.y ) * 0.3183098861837907;',
        ].join('\n')
      );
  };
  material.customProgramCacheKey = () => `${key}${LIT_ROOF_KEY}`;
  material.needsUpdate = true;
}
