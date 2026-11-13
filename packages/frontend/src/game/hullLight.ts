/**
 * The world's light on a model's cladding at the High graphics quality
 * (docs/art-direction.md, "What is built at High"; #1814).
 *
 * At Low a hull is lit by the shared rig and nothing else. At High its
 * cladding is the world layer's: the world pass draws it (rosterBatches.ts),
 * so the water takes its light as it takes the ground's, and the occlusion,
 * the bloom and the grade reach it. This patch adds the two lights the ground
 * takes and a hull did not:
 *
 * - **The Lid's glow**, the ground's own function of it (litGround.ts): by
 *   how far a face looks up and by the water over it, so a hull that dives
 *   darkens as the ground under it does.
 * - **The pools**, from below. The plan texture the ground reads
 *   (worldLights.ts `poolTexture`) holds the light a source puts on the
 *   ground and the ground's own height beside it, so a hull takes that light
 *   by how far over the ground it hangs and by how far a face looks down. A
 *   keel over a vent field goes amber and its back does not.
 *
 * Both are added to the rig's indirect light, where three sums an ambient,
 * and again as what a face mirrors, so a metalled plate answers them too.
 * Neither is colour of the hull's: `diffuseColor` is never written, so hue
 * stays the faction's ink and the register stays `CLADDING_CEILING`'s
 * (gate 4). A lamp is refused outright and stays on the canvas, so its light
 * stays its SIG's (gate 3). The light is the world's own, placed by the map
 * and the same for every client (limits 2 to 4).
 *
 * The pools are a view's, and a template outlives a view (rosterModels.ts),
 * so the texture is not the material's: every patched material reads the one
 * pair of uniforms here, which a view sets before its world pass draws.
 *
 * Every number is TUNABLE until the owner accepts a High frame
 * (`HIGH_GRAPHICS.HULL_LIGHT`, packages/shared/src/constants.ts).
 */
import { DataTexture, Vector2, type MeshStandardMaterial, type Texture } from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { LIT_IRRADIANCE_GLSL } from './litGround.ts';

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/** No pool anywhere: what a hull reads until a view hands its own over. */
const NO_POOLS = new DataTexture(new Uint8Array(4), 1, 1);
NO_POOLS.needsUpdate = true;

/**
 * The pools a hull reads, and the size in metres of the map they span. One
 * pair for the page: `setHullPools` writes it, each frame, for the view that
 * is about to draw.
 */
const UNIFORMS = {
  uHullPools: { value: NO_POOLS as Texture },
  uHullPoolMap: { value: new Vector2(1, 1) },
};

/** Hand the world pass the pools of the ground it is about to draw over, or none. */
export function setHullPools(pools: Texture | null, widthM = 1, heightM = 1): void {
  UNIFORMS.uHullPools.value = pools ?? NO_POOLS;
  UNIFORMS.uHullPoolMap.value.set(widthM, heightM);
}

/** The texture a hull reads its pools from now, for the test that holds the handover. */
export function hullPools(): Texture {
  return UNIFORMS.uHullPools.value;
}

const VERTEX_HEAD = '\nvarying vec3 vHullWorld;';

// A hull is drawn instanced (rosterBatches.ts), and its place is its own
// instance's.
const VERTEX_BODY = `
{
  vec4 hullAt = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    hullAt = instanceMatrix * hullAt;
  #endif
  vHullWorld = ( modelMatrix * hullAt ).xyz;
}`;

const { LID, POOL, POOL_REACH_M, POOL_HORIZON } = HIGH_GRAPHICS.HULL_LIGHT;

const FRAGMENT_HEAD = `
uniform sampler2D uHullPools;
uniform vec2 uHullPoolMap;
varying vec3 vHullWorld;
${LIT_IRRADIANCE_GLSL}
// The world's light a face looking along \`facing\` takes at \`at\`, both in
// the world's frame.
vec3 echoesHullLight( vec3 facing, vec3 at ) {
  vec3 light = echoesLitIrradiance( facing, at.y ) * ${glsl(LID)};
  // rgb: what the sources put on the ground under this point. a: that
  // ground's height. The light is the ground's whole at the ground, and
  // falls by the square of the height over it.
  vec4 pool = texture2D( uHullPools, at.xz / uHullPoolMap );
  float over = max( 0.0, at.y - pool.a ) / ${glsl(POOL_REACH_M)};
  float below = mix( ${glsl(POOL_HORIZON)}, 1.0, max( 0.0, - facing.y ) );
  return light + pool.rgb * ( ${glsl(POOL)} * below / ( 1.0 + over * over ) );
}`;

// After three has summed the rig's ambient into \`irradiance\` and opened
// \`radiance\` for what a face mirrors.
const FRAGMENT_LIGHT = `
{
  vec3 hullFacing = inverseTransformDirection( geometryNormal, viewMatrix );
  irradiance += echoesHullLight( hullFacing, vHullWorld );
  vec3 hullMirror = inverseTransformDirection(
    reflect( - geometryViewDir, geometryNormal ), viewMatrix );
  // A sky of one radiance lights a face by pi times it.
  radiance += echoesHullLight( hullMirror, vHullWorld ) * RECIPROCAL_PI;
}`;

/** The anchors the patch needs of three's standard program, vertex then fragment. */
export const HULL_LIGHT_ANCHORS = {
  vertex: ['#include <common>', '#include <begin_vertex>'],
  fragment: ['#include <common>', '#include <lights_fragment_begin>'],
} as const;

/** The program with the world's light read into it. Exported for the test that holds the anchors. */
export function patchHullLight(shader: { vertexShader: string; fragmentShader: string }): void {
  const after = (source: string, anchor: string, text: string): string =>
    source.replace(anchor, `${anchor}${text}`);
  const [vCommon, vBegin] = HULL_LIGHT_ANCHORS.vertex;
  const [fCommon, fLight] = HULL_LIGHT_ANCHORS.fragment;
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

const HULL_LIGHT_KEY = ':hull-light-1';

/**
 * Light one cladding material by the world. A lamp is left as it is. Chained
 * onto whatever hook the material already carries, and keyed after it, as a
 * navy's surface is (navySurface.ts), which it follows on a hull that wears
 * one: the surface leans the normal this reads, and shades the light this
 * adds with the rest of the indirect light.
 */
export function installHullLight(material: MeshStandardMaterial): boolean {
  if (material.emissive.getHex() !== 0) return false;
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    Object.assign(shader.uniforms, UNIFORMS);
    patchHullLight(shader);
  };
  material.customProgramCacheKey = () => `${key}${HULL_LIGHT_KEY}`;
  material.needsUpdate = true;
  return true;
}

/** Whether `installHullLight` patched this material, as the key says. */
export function takesHullLight(material: MeshStandardMaterial): boolean {
  return material.customProgramCacheKey().includes(HULL_LIGHT_KEY);
}
