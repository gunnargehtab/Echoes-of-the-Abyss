/**
 * The cone a searchlight scatters in the water, at the High graphics quality
 * (docs/art-direction.md, "An own hull's searchlight"; #1836).
 *
 * The world's own sources scatter as spheres (lightVolumes.ts). A beam has a
 * direction, so its volume is a cone, and what stands in the beam cuts it:
 * the shaft stops where the ground or another own hull shadows the water
 * (searchlights.ts), which is the one place the shadow shows away from a
 * surface.
 *
 * It is not a pass of its own. It draws into the scatter pass's target, over
 * the sources' volumes, with the same blend and against the same depth: one
 * instanced quad a beam, covering the beam's reach on screen. A fragment
 * finds the part of its sight line that lies inside the cone and in front of
 * the world, exactly, and sums the beam's light along it in a fixed number of
 * steps. Exactly, because a cone is thin where it is brightest, and steps
 * spread over the whole reach would miss it.
 *
 * It reads the camera only as any world draw does, through the projection,
 * and its steps sit at fixed fractions of the line, so nothing here is noise
 * locked to the screen (docs/graphics-standards.md gate 8).
 */

import {
  CustomBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Matrix4,
  Mesh,
  OneFactor,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  type DepthTexture,
  type PerspectiveCamera,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { SEARCHLIGHT_GLSL, SEARCHLIGHT_UNIFORMS, searchlightCount } from './searchlights.ts';

const SPEC = HIGH_GRAPHICS.SEARCHLIGHT;

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

const COS_OUTER = Math.cos((SPEC.OUTER_DEG * Math.PI) / 180);
/**
 * The sphere a cone of this reach and spread lies in, in reaches: centred
 * half way along the axis, out to the rim of the cone's far end.
 */
const BOUND = Math.hypot(0.5, Math.tan((SPEC.OUTER_DEG * Math.PI) / 180));

const VERTEX = [
  SEARCHLIGHT_GLSL,
  'attribute float aBeam;',
  'varying float vBeam;',
  'void main() {',
  '  vBeam = aBeam;',
  '  int i = int( aBeam + 0.5 );',
  `  float radius = ${glsl(SPEC.REACH_M * BOUND)};`,
  `  vec4 centre = viewMatrix * vec4( uSearchAt[ i ].xyz + uSearchAim[ i ].xyz * ${glsl(SPEC.REACH_M * 0.5)}, 1.0 );`,
  // As a source's quad does (lightVolumes.ts): from outside, a quad facing
  // the eye covers the sphere; from nearer the reach may fill the screen.
  '  if ( length( centre.xyz ) > 2.0 * radius ) {',
  '    centre.xy += position.xy * radius * 1.25;',
  '    gl_Position = projectionMatrix * centre;',
  '  } else {',
  '    gl_Position = vec4( position.xy * 2.0, 0.0, 1.0 );',
  '  }',
  '}',
].join('\n');

const FRAGMENT = [
  'uniform sampler2D tDepth;',
  'uniform mat4 uInvViewProj;',
  'uniform vec3 uEye;',
  'uniform vec2 uTexel;',
  'uniform float uReachM;',
  'varying float vBeam;',
  SEARCHLIGHT_GLSL,
  // Whether the point `t` along the sight line is inside the beam's cone.
  'bool echoesInCone( vec3 fromLamp, vec3 ray, vec3 axis, float t ) {',
  '  vec3 p = fromLamp + ray * t;',
  `  return dot( p, axis ) >= ${glsl(COS_OUTER)} * length( p );`,
  '}',
  'void main() {',
  '  int i = int( vBeam + 0.5 );',
  '  vec2 uv = gl_FragCoord.xy * uTexel;',
  '  float depth = texture2D( tDepth, uv ).r;',
  '  vec4 at = uInvViewProj * vec4( uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0 );',
  '  vec3 toWorld = at.xyz / at.w - uEye;',
  '  float tWorld = length( toWorld );',
  '  vec3 ray = toWorld / tWorld;',
  '  vec3 axis = uSearchAim[ i ].xyz;',
  '  vec3 fromLamp = uEye - uSearchAt[ i ].xyz;',
  // The part of the line inside the beam's reach and in front of the world.
  '  float along = dot( fromLamp, ray );',
  '  float lamp2 = dot( fromLamp, fromLamp );',
  `  float inside = along * along - lamp2 + ${glsl(SPEC.REACH_M * SPEC.REACH_M)};`,
  '  if ( inside <= 0.0 ) discard;',
  '  float reach = sqrt( inside );',
  '  float t0 = max( 0.0, - along - reach );',
  '  float t1 = min( tWorld, - along + reach );',
  '  if ( t1 <= t0 ) discard;',
  // And inside the cone. The line meets the cone's surface where a quadratic
  // in t is zero, and a cone is convex, so the part inside it is one stretch:
  // between the two roots, or from one of them on. Each is tried by its
  // middle, which also turns away the cone's mirror image behind the lamp.
  `  float c2 = ${glsl(COS_OUTER * COS_OUTER)};`,
  '  float rayAxis = dot( ray, axis );',
  '  float lampAxis = dot( fromLamp, axis );',
  '  float qa = rayAxis * rayAxis - c2;',
  '  float qb = rayAxis * lampAxis - c2 * along;',
  '  float qc = lampAxis * lampAxis - c2 * lamp2;',
  '  float disc = qb * qb - qa * qc;',
  '  if ( disc > 0.0 && abs( qa ) > 1e-6 ) {',
  '    float root = sqrt( disc );',
  '    float r0 = ( - qb - root ) / qa;',
  '    float r1 = ( - qb + root ) / qa;',
  '    if ( r0 > r1 ) { float swap = r0; r0 = r1; r1 = swap; }',
  '    vec2 between = vec2( max( t0, r0 ), min( t1, r1 ) );',
  '    vec2 beyond = vec2( max( t0, r1 ), t1 );',
  '    vec2 before = vec2( t0, min( t1, r0 ) );',
  '    if ( between.y > between.x && echoesInCone( fromLamp, ray, axis, 0.5 * ( between.x + between.y ) ) ) {',
  '      t0 = between.x; t1 = between.y;',
  '    } else if ( beyond.y > beyond.x && echoesInCone( fromLamp, ray, axis, 0.5 * ( beyond.x + beyond.y ) ) ) {',
  '      t0 = beyond.x; t1 = beyond.y;',
  '    } else if ( before.y > before.x && echoesInCone( fromLamp, ray, axis, 0.5 * ( before.x + before.y ) ) ) {',
  '      t0 = before.x; t1 = before.y;',
  '    } else {',
  '      discard;',
  '    }',
  '  } else if ( ! echoesInCone( fromLamp, ray, axis, 0.5 * ( t0 + t1 ) ) ) {',
  '    discard;',
  '  }',
  // The beam's light along that stretch, less what the ground and the hulls
  // shadow of it: a shaft is cut where a rock stands in it.
  `  float dt = ( t1 - t0 ) / ${glsl(SPEC.VOLUME_STEPS)};`,
  '  vec3 sum = vec3( 0.0 );',
  `  for ( int s = 0; s < ${SPEC.VOLUME_STEPS}; s ++ ) {`,
  '    vec3 p = uEye + ray * ( t0 + ( float( s ) + 0.5 ) * dt );',
  '    vec3 toLamp;',
  '    vec3 beam = echoesSearchBeam( i, p, toLamp );',
  '    if ( beam.r + beam.g + beam.b <= 0.0 ) continue;',
  '    sum += beam * echoesSearchShadeCoarse( i, p );',
  '  }',
  // And the swim back to the eye, as the water takes any light (water.ts).
  '  float mid = 0.5 * ( t0 + t1 );',
  '  float swim = uReachM > 0.0 ? exp( - ( mid * mid ) / ( uReachM * uReachM ) ) : 1.0;',
  `  gl_FragColor = vec4( sum * ( ${glsl(SPEC.VOLUME)} * dt * swim ), 1.0 );`,
  '}',
].join('\n');

export class SearchlightVolumes {
  private readonly uniforms = {
    ...SEARCHLIGHT_UNIFORMS,
    tDepth: { value: null as DepthTexture | null },
    uInvViewProj: { value: new Matrix4() },
    uEye: { value: new Vector3() },
    uTexel: { value: new Vector2(1, 1) },
    uReachM: { value: 0 },
  };
  private readonly material = new ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    // Light adds to light, over the sources' volumes, and the world's depth
    // is read in the fragment (lightVolumes.ts).
    transparent: true,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    depthTest: false,
    depthWrite: false,
  });
  private readonly geometry = new InstancedBufferGeometry();
  private readonly mesh: Mesh;
  private readonly scene = new Scene();

  constructor() {
    this.geometry.copy(new PlaneGeometry(2, 2) as unknown as InstancedBufferGeometry);
    this.geometry.setAttribute(
      'aBeam',
      new InstancedBufferAttribute(
        Float32Array.from({ length: SPEC.MAX }, (_, i) => i),
        1
      )
    );
    this.geometry.instanceCount = 0;
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.layers.enableAll();
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  /** Beams this frame draws: zero draws nothing. */
  get count(): number {
    return searchlightCount();
  }

  /**
   * Add the beams' cones to `target`, the scatter pass's, for a frame whose
   * world has `depth`. Nothing is cleared: the sources' volumes are already
   * there. The renderer's target and clear state are the caller's to restore.
   */
  render(
    renderer: WebGLRenderer,
    camera: PerspectiveCamera,
    depth: DepthTexture,
    target: WebGLRenderTarget,
    reachM: number
  ): void {
    this.geometry.instanceCount = this.count;
    this.uniforms.tDepth.value = depth;
    this.uniforms.uInvViewProj.value
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .invert();
    this.uniforms.uEye.value.copy(camera.position);
    this.uniforms.uTexel.value.set(1 / target.width, 1 / target.height);
    this.uniforms.uReachM.value = reachM;
    renderer.setRenderTarget(target);
    renderer.autoClear = false;
    renderer.render(this.scene, camera);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
