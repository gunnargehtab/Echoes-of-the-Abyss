/**
 * The world's light on a decorative body at the High graphics quality
 * (docs/art-direction.md, "Life in the world's light"; #1837).
 *
 * At Low a body of the crater's decorative life is a prop under the shared
 * rig (environmentModels.ts), and through High's first steps it stayed one in
 * the world pass: a fish beside a lit hull stood in none of the light the hull
 * did, and read as a hole in the water. This patch gives a body the three
 * lights an own hull's cladding takes (hullLight.ts), beside the rig:
 *
 * - **The Lid's glow**, the ground's own function of it (litGround.ts).
 * - **The pools**, from below, off the plan texture a hull reads.
 * - **An own hull's searchlight** it swims through (searchlights.ts), as a
 *   light with a direction, glint and all. The ground shadows it and so does
 *   a hull: a body is outside every hull's capsule, where a point on a hull
 *   is inside its own.
 *
 * It answers the light, never the hull: where a body swims is the fixture's
 * authored loop and the shared match time (freeWaterDecoration.ts), so a
 * school crosses a beam or misses it and is not moved by either (limit 4).
 * Nothing of a contact is in the beams it reads (limit 2).
 *
 * A body is a High template's alone (environmentModels.ts `buildTemplate`), so
 * nothing Low draws is built, patched or keyed differently.
 *
 * TUNABLE until a frame of this step is accepted: `HIGH_GRAPHICS.LIFE` in
 * packages/shared/src/constants.ts holds each share.
 */
import type { MeshStandardMaterial } from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { POOL_UNIFORMS } from './hullLight.ts';
import { LIT_IRRADIANCE_GLSL } from './litGround.ts';
import { SEARCHLIGHT_GLSL, SEARCHLIGHT_UNIFORMS } from './searchlights.ts';

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

const { LID, POOL, POOL_REACH_M, BEAM } = HIGH_GRAPHICS.LIFE;

const VERTEX_HEAD = '\nvarying vec3 vLifeWorld;';

// A body is one instance of its batch (environmentLayer.ts), and its place is
// its own instance's.
const VERTEX_BODY = `
{
  vec4 lifeAt = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    lifeAt = instanceMatrix * lifeAt;
  #endif
  vLifeWorld = ( modelMatrix * lifeAt ).xyz;
}`;

const FRAGMENT_HEAD = `
uniform sampler2D uHullPools;
uniform vec2 uHullPoolMap;
varying vec3 vLifeWorld;
${LIT_IRRADIANCE_GLSL}
${SEARCHLIGHT_GLSL}
// The world's light a face looking along \`facing\` takes at \`at\`, both in
// the world's frame: a hull's own two terms (hullLight.ts), at a body's shares.
vec3 echoesLifeLight( vec3 facing, vec3 at ) {
  vec3 light = echoesLitIrradiance( facing, at.y ) * ${glsl(LID)};
  vec4 pool = texture2D( uHullPools, at.xz / uHullPoolMap );
  float over = max( 0.0, at.y - pool.a ) / ${glsl(POOL_REACH_M)};
  float below = 0.5 - 0.5 * facing.y;
  return light + pool.rgb * ( ${glsl(POOL)} * below * below / ( 1.0 + over * over ) );
}`;

// After three has summed the rig's ambient into \`irradiance\` and opened
// \`radiance\` for what a face mirrors.
const FRAGMENT_LIGHT = `
{
  vec3 lifeFacing = inverseTransformDirection( geometryNormal, viewMatrix );
  irradiance += echoesLifeLight( lifeFacing, vLifeWorld );
  vec3 lifeMirror = inverseTransformDirection(
    reflect( - geometryViewDir, geometryNormal ), viewMatrix );
  // A sky of one radiance lights a face by pi times it.
  radiance += echoesLifeLight( lifeMirror, vLifeWorld ) * RECIPROCAL_PI;
  // The beams this body swims through, each as three lights a face directly.
  for ( int i = 0; i < ECHOES_SEARCHLIGHTS; i ++ ) {
    if ( i >= uSearchCount ) break;
    vec3 toLamp;
    vec3 beam = echoesSearchBeam( i, vLifeWorld, toLamp );
    if ( beam.r + beam.g + beam.b <= 0.0 ) continue;
    IncidentLight searchLight;
    searchLight.color = beam * ( ${glsl(BEAM)} * echoesSearchShade( i, vLifeWorld ) );
    searchLight.direction = normalize( ( viewMatrix * vec4( toLamp, 0.0 ) ).xyz );
    searchLight.visible = true;
    RE_Direct( searchLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  }
}`;

/** The anchors the patch needs of three's standard program, vertex then fragment. */
export const LIFE_LIGHT_ANCHORS = {
  vertex: ['#include <common>', '#include <begin_vertex>'],
  fragment: ['#include <common>', '#include <lights_fragment_begin>'],
} as const;

/** The program with the world's light read into it. Exported for the test that holds the anchors. */
export function patchLifeLight(shader: { vertexShader: string; fragmentShader: string }): void {
  const after = (source: string, anchor: string, text: string): string =>
    source.replace(anchor, `${anchor}${text}`);
  const [vCommon, vBegin] = LIFE_LIGHT_ANCHORS.vertex;
  const [fCommon, fLight] = LIFE_LIGHT_ANCHORS.fragment;
  shader.vertexShader = after(
    after(shader.vertexShader, vCommon, VERTEX_HEAD),
    vBegin,
    VERTEX_BODY
  );
  shader.fragmentShader = after(
    after(shader.fragmentShader, fCommon, FRAGMENT_HEAD),
    fLight,
    FRAGMENT_LIGHT
  );
}

const LIFE_LIGHT_KEY = ':life-light-1';

/**
 * Light one body's material by the world. A material that emits is left as it
 * is: a body's own light is not the world's on it. Chained onto whatever hook
 * the material already carries, and keyed after it, so the prop veil goes on
 * last as it always has (veilShading.ts `installPropVeil`).
 */
export function installLifeLight(material: MeshStandardMaterial): boolean {
  if (material.emissive.getHex() !== 0) return false;
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    Object.assign(shader.uniforms, POOL_UNIFORMS, SEARCHLIGHT_UNIFORMS);
    patchLifeLight(shader);
  };
  material.customProgramCacheKey = () => `${key}${LIFE_LIGHT_KEY}`;
  material.needsUpdate = true;
  return true;
}

/** Whether `installLifeLight` patched this material, as the key says. */
export function takesLifeLight(material: MeshStandardMaterial): boolean {
  return material.customProgramCacheKey().includes(LIFE_LIGHT_KEY);
}
