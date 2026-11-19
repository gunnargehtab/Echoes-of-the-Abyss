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
 * Two things that reading got wrong are mended here (#1844), and neither
 * costs a tap:
 *
 * - **A flank has no midrib.** Whatever a pattern draws along `v` 0 came out
 *   along each flank at the hull's axis. A pattern that draws there has a
 *   second image without it (tools/hull-models/surface.mjs `ABEAM`), and the
 *   plane seen from the side reads that one. A surface with no second image
 *   reads its one image on all three planes, as before.
 * - **A blade reads in a frame of its own.** The model's frame puts a fin's
 *   rays square to the keel, so they cross a raked blade. A blade's place and
 *   normal are turned into its own frame before the three reads (`bladeFrame`),
 *   in the vertex stage, by a quaternion each of its vertices carries.
 *
 * Two things read it, and neither is colour:
 *
 * - **The normal leans by the slope.** The three planes' slopes are summed as
 *   one rise in the frame they were read in, its part along the face's own
 *   normal is dropped, and the rest tilts the shading normal. Slopes average
 *   down a mip chain to level, so the relief fades with range and does not
 *   shimmer.
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
import type { BufferGeometry, MeshStandardMaterial, Texture } from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import type { NavySurfaceScale } from './navySurfaces.generated.ts';

/**
 * One material's surface: its image, the image a face that looks abeam reads
 * when its pattern drew one, and the scale the draw wrote beside them.
 */
export interface NavySurface {
  readonly name: string;
  readonly texture: Texture;
  readonly abeam: Texture | null;
  readonly scale: NavySurfaceScale;
}

/** What a navy calls a blade of a material: see `bladeFrame`. */
export type BladeRule = NonNullable<NavySurfaceScale['blade']>;

/** The vertex attribute a blade's frame rides in, on every part of a material that has blades. */
export const NAVY_BLADE_ATTRIBUTE = 'navyBlade';

/** The byte level ground takes in the slope channels (surface.mjs `LEVEL`), as a texel reads it. */
const LEVEL = 128 / 255;
/** A slope channel's reach either side of level, as a texel reads it. */
const REACH = 127 / 255;

const VERTEX_HEAD = `
uniform float uNavyMetres;
varying vec3 vNavyAt;
varying vec3 vNavyNormal;
varying mat3 vNavyFrame;`;

// A quaternion's turn of a vector, for a material some of whose parts are blades.
const VERTEX_HEAD_BLADE = `
attribute vec4 ${NAVY_BLADE_ATTRIBUTE};
vec3 navyTurn( vec4 q, vec3 v ) {
  return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}`;

// The model's frame in view space, for the rise a fragment sums there. An
// instanced hull's frame is its own instance's (rosterBatches.ts).
const VERTEX_BODY = `
vNavyAt = position * uNavyMetres;
vNavyNormal = normal;
vNavyFrame = mat3( modelViewMatrix );
#ifdef USE_INSTANCING
  vNavyFrame = vNavyFrame * mat3( instanceMatrix );
#endif`;

// A blade's quaternion turns the model's frame into its own, and every other
// part of the material carries the turn that changes nothing. A part is
// rigid and shares no vertex with another, so the turned place still runs
// straight across each face, and the fragment stage reads it as it reads the
// model's. The frame handed on is the blade's own in view space.
const VERTEX_BODY_BLADE = `
vNavyAt = navyTurn( ${NAVY_BLADE_ATTRIBUTE}, vNavyAt );
vNavyNormal = navyTurn( ${NAVY_BLADE_ATTRIBUTE}, vNavyNormal );
vec4 navyBack = vec4( -${NAVY_BLADE_ATTRIBUTE}.xyz, ${NAVY_BLADE_ATTRIBUTE}.w );
vNavyFrame = vNavyFrame * mat3( navyTurn( navyBack, vec3( 1.0, 0.0, 0.0 ) ),
                                navyTurn( navyBack, vec3( 0.0, 1.0, 0.0 ) ),
                                navyTurn( navyBack, vec3( 0.0, 0.0, 1.0 ) ) );`;

const FRAGMENT_HEAD = `
uniform sampler2D uNavySurface;
uniform sampler2D uNavyAbeam;
uniform vec4 uNavyScale;
uniform float uNavyAbeamMean;
varying vec3 vNavyAt;
varying vec3 vNavyNormal;
varying mat3 vNavyFrame;
float navyHeight;`;

// uNavyScale: tiles a metre, the slope a channel's full reach stands for
// (relief gain included), the cavity's depth, and the height's mean.
// uNavyAbeam is the image the plane seen from the side reads, and
// uNavyAbeamMean its mean: the surface's one image and mean when its pattern
// drew no second. The height is kept about each image's own mean.
const FRAGMENT_NORMAL = `
{
  vec3 navyFace = normalize( vNavyNormal );
  vec3 navyWeight = pow( abs( navyFace ), vec3( 4.0 ) );
  navyWeight /= navyWeight.x + navyWeight.y + navyWeight.z;
  vec3 navyAt = vNavyAt * uNavyScale.x;
  vec3 navyAcross = texture2D( uNavySurface, navyAt.yz ).rgb;
  vec3 navyAbove = texture2D( uNavySurface, navyAt.xz ).rgb;
  vec3 navyAbeam = texture2D( uNavyAbeam, navyAt.xy ).rgb;
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
  navyHeight = dot( navyWeight, vec3( navyAcross.b, navyAbove.b, navyAbeam.b )
                                - vec3( uNavyScale.w, uNavyScale.w, uNavyAbeamMean ) );
}`;

const FRAGMENT_LIGHT = `
{
  float navyShade = 1.0 + uNavyScale.z * navyHeight;
  reflectedLight.indirectDiffuse *= navyShade;
  reflectedLight.indirectSpecular *= navyShade;
}`;

/** The anchors the patch needs of three's standard program, vertex then fragment. */
export const NAVY_SURFACE_ANCHORS = {
  vertex: ['#include <common>', '#include <begin_vertex>'],
  fragment: ['#include <common>', '#include <normal_fragment_maps>', '#include <aomap_fragment>'],
} as const;

/**
 * The program with the surface read into it. `blades` is whether the
 * material's parts carry `NAVY_BLADE_ATTRIBUTE`. Exported for the test that
 * holds the anchors.
 */
export function patchNavySurface(
  shader: { vertexShader: string; fragmentShader: string },
  blades = false
): void {
  const after = (source: string, anchor: string, text: string): string =>
    source.replace(anchor, `${anchor}${text}`);
  const [vCommon, vBegin] = NAVY_SURFACE_ANCHORS.vertex;
  const [fCommon, fNormal, fLight] = NAVY_SURFACE_ANCHORS.fragment;
  shader.vertexShader = after(
    after(shader.vertexShader, vCommon, VERTEX_HEAD + (blades ? VERTEX_HEAD_BLADE : '')),
    vBegin,
    VERTEX_BODY + (blades ? VERTEX_BODY_BLADE : '')
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
 * two materials that differ only by this patch never share a program. A
 * surface whose scale names a blade reads `NAVY_BLADE_ATTRIBUTE`, so every
 * part of its material must carry one (`bladeFrames`).
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
  const blades = surface.scale.blade !== undefined;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.uNavySurface = { value: surface.texture };
    shader.uniforms.uNavyAbeam = { value: surface.abeam ?? surface.texture };
    shader.uniforms.uNavyAbeamMean = {
      value: surface.abeam === null ? surface.scale.mean : (surface.scale.abeamMean ?? 0),
    };
    shader.uniforms.uNavyScale = { value: scale };
    shader.uniforms.uNavyMetres = { value: metresPerUnit };
    patchNavySurface(shader, blades);
  };
  material.customProgramCacheKey = () => `${key}:navy-surface-2${blades ? '-blades' : ''}`;
  material.userData.navySurface = surface.name;
  material.needsUpdate = true;
  return true;
}

/** The turn that changes nothing, as `NAVY_BLADE_ATTRIBUTE` carries it: x, y, z, w. */
const NO_TURN = [0, 0, 0, 1] as const;

/**
 * A blade's own frame, as the quaternion (x, y, z, w) that turns the model's
 * frame into it, or null when the part is no blade.
 *
 * The part's axes are its surface's own: the principal axes of its
 * triangles, each weighed by its area, so neither a node's frame nor how
 * finely an outline was cut moves them. Its extents along them are its
 * length, its depth and its thickness. A **blade** is at most `rule.thick` of
 * its depth through and at least `rule.long` depths long: a fin, a fluke, a
 * leaf. A part that long is rooted at one end, so its length is root to
 * tip. Anything rounder or squatter keeps the model's frame: a trim vane
 * rooted along its length, where square to the keel is root to tip already,
 * a fluke as wide as it is long, a pod, a ring. The navy's table says where
 * its own roster draws that line (tools/hull-models/factions/).
 *
 * In the blade's frame its length is the axis the model's frame calls the
 * beam, and its normal the one the model calls up. So the blade is read as a
 * back is, on the plane seen from above, with the image's `u` across it and
 * `v` along it: a line the pattern draws at constant `u`, which is square to
 * the keel on a hull, runs root to tip on the blade. Its rim reads the other
 * two planes the same way round, so such a line shows as its own end on the
 * tip and does not tick the leading edge.
 *
 * The geometry is in the model's frame, as a merge bakes it. Each axis is
 * signed so its largest part is positive, which makes the frame the same
 * wherever it is found.
 */
export function bladeFrame(
  geometry: BufferGeometry,
  rule: BladeRule
): [number, number, number, number] | null {
  const position = geometry.getAttribute('position');
  const index = geometry.index;
  const corners = index === null ? position.count : index.count;
  const corner = (i: number): number => (index === null ? i : index.getX(i));
  const read = [
    (i: number): number => position.getX(i),
    (i: number): number => position.getY(i),
    (i: number): number => position.getZ(i),
  ] as const;
  // Area, first and second moments of the surface: for a triangle of area A
  // with corners a, b and c, the integral of x xᵀ is
  // A/12 (a aᵀ + b bᵀ + c cᵀ + (a + b + c)(a + b + c)ᵀ).
  let area = 0;
  const first = [0, 0, 0];
  const second = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const p = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let t = 0; t + 2 < corners; t += 3) {
    for (let k = 0; k < 3; k++) {
      const from = corner(t + k);
      for (let j = 0; j < 3; j++) p[k * 3 + j] = read[j]!(from);
    }
    const ux = p[3]! - p[0]!;
    const uy = p[4]! - p[1]!;
    const uz = p[5]! - p[2]!;
    const vx = p[6]! - p[0]!;
    const vy = p[7]! - p[1]!;
    const vz = p[8]! - p[2]!;
    const a = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    area += a;
    for (let i = 0; i < 3; i++) {
      const si = p[i]! + p[3 + i]! + p[6 + i]!;
      first[i] = first[i]! + (a * si) / 3;
      for (let j = 0; j < 3; j++) {
        const sj = p[j]! + p[3 + j]! + p[6 + j]!;
        second[i * 3 + j] =
          second[i * 3 + j]! +
          (a / 12) * (p[i]! * p[j]! + p[3 + i]! * p[3 + j]! + p[6 + i]! * p[6 + j]! + si * sj);
      }
    }
  }
  if (!(area > 0)) return null;
  const spread: number[][] = [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => second[i * 3 + j]! / area - (first[i]! / area) * (first[j]! / area))
  );
  const axes = principalAxes(spread);
  const extent = axes.map((axis) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < position.count; i++) {
      const along =
        position.getX(i) * axis[0]! + position.getY(i) * axis[1]! + position.getZ(i) * axis[2]!;
      if (along < lo) lo = along;
      if (along > hi) hi = along;
    }
    return hi - lo;
  });
  const [length, depth, thickness] = extent as [number, number, number];
  if (!(thickness <= rule.thick * depth && length >= rule.long * depth)) return null;
  const along = signed(axes[0]!);
  const through = signed(axes[2]!);
  const across = [
    through[1]! * along[2]! - through[2]! * along[1]!,
    through[2]! * along[0]! - through[0]! * along[2]!,
    through[0]! * along[1]! - through[1]! * along[0]!,
  ];
  // The rows of the turn are the blade's axes in the model's frame: across
  // it, through it and along it land on the blade's x, y and z.
  return quaternionOf([across, through, along]);
}

/**
 * `NAVY_BLADE_ATTRIBUTE` for one part: four numbers a vertex, the part's own
 * frame at every one when it is a blade by `rule`, and the turn that changes
 * nothing when it is not. Every part of a material whose surface names a
 * blade takes one, or the parts would not merge.
 */
export function bladeFrames(geometry: BufferGeometry, rule: BladeRule): Float32Array {
  const turn = bladeFrame(geometry, rule) ?? NO_TURN;
  const count = geometry.getAttribute('position').count;
  const out = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) out.set(turn, i * 4);
  return out;
}

/** An axis with its largest part made positive, so one blade has one frame. */
function signed(axis: readonly number[]): number[] {
  let most = 0;
  for (let k = 1; k < 3; k++) if (Math.abs(axis[k]!) > Math.abs(axis[most]!)) most = k;
  return axis[most]! < 0 ? axis.map((x) => -x) : [...axis];
}

/**
 * The unit axes of a symmetric 3 × 3 spread, widest first, by Jacobi's
 * turns: a dozen sweeps settle three numbers to the last bit.
 */
function principalAxes(spread: number[][]): number[][] {
  const a = spread.map((row) => [...row]);
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 32; sweep++) {
    const off = a[0]![1]! ** 2 + a[0]![2]! ** 2 + a[1]![2]! ** 2;
    if (off < 1e-30) break;
    for (let i = 0; i < 2; i++)
      for (let j = i + 1; j < 3; j++) {
        if (a[i]![j] === 0) continue;
        const theta = (a[j]![j]! - a[i]![i]!) / (2 * a[i]![j]!);
        const t = (theta < 0 ? -1 : 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 3; k++) {
          const ki = a[k]![i]!;
          const kj = a[k]![j]!;
          a[k]![i] = c * ki - s * kj;
          a[k]![j] = s * ki + c * kj;
        }
        for (let k = 0; k < 3; k++) {
          const ik = a[i]![k]!;
          const jk = a[j]![k]!;
          a[i]![k] = c * ik - s * jk;
          a[j]![k] = s * ik + c * jk;
        }
        for (let k = 0; k < 3; k++) {
          const ki = v[k]![i]!;
          const kj = v[k]![j]!;
          v[k]![i] = c * ki - s * kj;
          v[k]![j] = s * ki + c * kj;
        }
      }
  }
  return [0, 1, 2]
    .sort((i, j) => a[j]![j]! - a[i]![i]!)
    .map((i) => [v[0]![i]!, v[1]![i]!, v[2]![i]!]);
}

/** The quaternion (x, y, z, w) of a turn given by its three rows. */
function quaternionOf(rows: readonly (readonly number[])[]): [number, number, number, number] {
  const [m00, m01, m02] = rows[0] as [number, number, number];
  const [m10, m11, m12] = rows[1] as [number, number, number];
  const [m20, m21, m22] = rows[2] as [number, number, number];
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1);
    return [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4];
  }
  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    return [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  }
  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    return [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s];
  }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
  return [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s];
}
