/**
 * A navy material's surface, worn by a hull's cladding at the High graphics
 * quality (#1811; docs/art-direction.md, "What is built at High").
 *
 * The image is one tiling relief a navy material, drawn once by
 * tools/hull-models/surface.mjs: red and green its slope along `u` and `v`,
 * blue its height. No model carries it and none is laid out for it. A
 * fragment reads it by its own place on the model in metres, on the three
 * planes of the model's frame, each weighted by how squarely the face looks
 * down that plane's axis. `u` is the keel's axis on the two planes that hold
 * it, which is what lets the drawn patterns say "square to the keel". `v` is
 * the beam from above and from ahead, and the height from the side, so the
 * image's `v` 0 is the model's centreline on a back, a bow and a stern, and
 * its axis along a flank. Ahead, `u` is the height: the owner's call, taken
 * in session on 13 November 2026, after the first cut read that plane the
 * other way up and drew whatever runs along `v` 0 as a band across every bow.
 *
 * Two things read it, and neither is colour:
 *
 * - **The normal leans by the slope.** The three planes' slopes are summed as
 *   one rise in the model's frame, its part along the face's own normal is
 *   dropped, and the rest tilts the shading normal. Slopes average down a mip
 *   chain to level, so the relief fades with range and does not shimmer.
 * - **Indirect light follows the height**, about the surface's mean, as an
 *   occlusion map touches only the ambient and the environment
 *   (docs/art-direction.md "Bevels and baked occlusion"). A hollow darkens, a
 *   crest lifts, and the material's own brightness stays where the recolour
 *   put it.
 *
 * `diffuseColor` is never written, so hue stays the faction's ink (gate 4),
 * and a lamp is refused outright, so its light stays its SIG's (gate 3).
 *
 * Three-free of everything but a type, and free of the asset glob, so the
 * lit table bundles this file to photograph a hull as High draws it
 * (tools/hull-renders/surface.mjs). navySurfaces.ts owns the textures.
 */
import type { MeshStandardMaterial, Texture } from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import type { NavySurfaceScale } from './navySurfaces.generated.ts';

/** One material's surface: its image, and the scale the draw wrote beside it. */
export interface NavySurface {
  readonly name: string;
  readonly texture: Texture;
  readonly scale: NavySurfaceScale;
}

/** The byte level ground takes in the slope channels (surface.mjs `LEVEL`), as a texel reads it. */
const LEVEL = 128 / 255;
/** A slope channel's reach either side of level, as a texel reads it. */
const REACH = 127 / 255;

const VERTEX_HEAD = `
uniform float uNavyMetres;
varying vec3 vNavyAt;
varying vec3 vNavyNormal;
varying mat3 vNavyFrame;`;

// The model's frame in view space, for the rise a fragment sums there. An
// instanced hull's frame is its own instance's (rosterBatches.ts).
const VERTEX_BODY = `
vNavyAt = position * uNavyMetres;
vNavyNormal = normal;
vNavyFrame = mat3( modelViewMatrix );
#ifdef USE_INSTANCING
  vNavyFrame = vNavyFrame * mat3( instanceMatrix );
#endif`;

const FRAGMENT_HEAD = `
uniform sampler2D uNavySurface;
uniform vec4 uNavyScale;
varying vec3 vNavyAt;
varying vec3 vNavyNormal;
varying mat3 vNavyFrame;
float navyHeight;`;

// uNavyScale: tiles a metre, the slope a channel's full reach stands for
// (relief gain included), the cavity's depth, and the height's mean.
const FRAGMENT_NORMAL = `
{
  vec3 navyFace = normalize( vNavyNormal );
  vec3 navyWeight = pow( abs( navyFace ), vec3( 4.0 ) );
  navyWeight /= navyWeight.x + navyWeight.y + navyWeight.z;
  vec3 navyAt = vNavyAt * uNavyScale.x;
  vec3 navyAcross = texture2D( uNavySurface, navyAt.yz ).rgb;
  vec3 navyAbove = texture2D( uNavySurface, navyAt.xz ).rgb;
  vec3 navyAbeam = texture2D( uNavySurface, navyAt.xy ).rgb;
  vec2 navySlopeX = ( navyAcross.rg - ${LEVEL} ) * uNavyScale.y;
  vec2 navySlopeY = ( navyAbove.rg - ${LEVEL} ) * uNavyScale.y;
  vec2 navySlopeZ = ( navyAbeam.rg - ${LEVEL} ) * uNavyScale.y;
  vec3 navyRise = navyWeight.x * vec3( 0.0, navySlopeX.x, navySlopeX.y )
                + navyWeight.y * vec3( navySlopeY.x, 0.0, navySlopeY.y )
                + navyWeight.z * vec3( navySlopeZ.x, navySlopeZ.y, 0.0 );
  navyRise -= navyFace * dot( navyRise, navyFace );
  mat3 navyFrame = mat3( normalize( vNavyFrame[ 0 ] ), normalize( vNavyFrame[ 1 ] ),
                         normalize( vNavyFrame[ 2 ] ) );
  // A two-sided membrane seen from behind stands the other way up.
  normal = normalize( normal - faceDirection * ( navyFrame * navyRise ) );
  navyHeight = dot( navyWeight, vec3( navyAcross.b, navyAbove.b, navyAbeam.b ) );
}`;

const FRAGMENT_LIGHT = `
{
  float navyShade = 1.0 + uNavyScale.z * ( navyHeight - uNavyScale.w );
  reflectedLight.indirectDiffuse *= navyShade;
  reflectedLight.indirectSpecular *= navyShade;
}`;

/** The anchors the patch needs of three's standard program, vertex then fragment. */
export const NAVY_SURFACE_ANCHORS = {
  vertex: ['#include <common>', '#include <begin_vertex>'],
  fragment: ['#include <common>', '#include <normal_fragment_maps>', '#include <aomap_fragment>'],
} as const;

/** The program with the surface read into it. Exported for the test that holds the anchors. */
export function patchNavySurface(shader: { vertexShader: string; fragmentShader: string }): void {
  const after = (source: string, anchor: string, text: string): string =>
    source.replace(anchor, `${anchor}${text}`);
  const [vCommon, vBegin] = NAVY_SURFACE_ANCHORS.vertex;
  const [fCommon, fNormal, fLight] = NAVY_SURFACE_ANCHORS.fragment;
  shader.vertexShader = after(
    after(shader.vertexShader, vCommon, VERTEX_HEAD),
    vBegin,
    VERTEX_BODY
  );
  shader.fragmentShader = after(
    after(after(shader.fragmentShader, fCommon, FRAGMENT_HEAD), fNormal, FRAGMENT_NORMAL),
    fLight,
    FRAGMENT_LIGHT
  );
}

/** What `uNavyScale` holds for a surface: see `FRAGMENT_NORMAL`. */
export function navySurfaceUniform(scale: NavySurfaceScale): [number, number, number, number] {
  return [
    1 / scale.tileM,
    (scale.slope * HIGH_GRAPHICS.HULL_SURFACE.RELIEF) / REACH,
    HIGH_GRAPHICS.HULL_SURFACE.CAVITY,
    scale.mean,
  ];
}

/**
 * Put a surface on one cladding material, whose vertices are `metresPerUnit`
 * metres a unit in the model's own frame. A lamp is left as it is. Chained
 * onto whatever hook the material already carries, and keyed after it, so
 * two materials that differ only by this patch never share a program.
 */
export function installNavySurface(
  material: MeshStandardMaterial,
  surface: NavySurface,
  metresPerUnit: number
): boolean {
  if (material.emissive.getHex() !== 0) return false;
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  const scale = navySurfaceUniform(surface.scale);
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.uNavySurface = { value: surface.texture };
    shader.uniforms.uNavyScale = { value: scale };
    shader.uniforms.uNavyMetres = { value: metresPerUnit };
    patchNavySurface(shader);
  };
  material.customProgramCacheKey = () => `${key}:navy-surface-1`;
  material.userData.navySurface = surface.name;
  material.needsUpdate = true;
  return true;
}
