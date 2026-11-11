/**
 * The light the world's own sources scatter in the water, at the High
 * graphics quality (docs/art-direction.md, "Two layers, two laws": a source
 * "may pool on the ground and scatter in the water as a visible volume";
 * #1801).
 *
 * One pass of the High frame (highFrame.ts), between the world pass and the
 * composite: every source (worldLights.ts) is one instanced quad that covers
 * its reach on screen, and each fragment sums the source's light along the
 * part of its sight line that lies inside that reach and in front of the
 * world, read from the world pass's depth. So a volume stops at the ground
 * and behind a rock instead of drawing through them, with no geometry of its
 * own. The sum goes additively into a half-resolution half-float target the
 * composite adds before the tone curve: a volume is soft, and a quarter of
 * the pixels is a quarter of the cost.
 *
 * It reads the camera only as any world draw does, through the projection,
 * so nothing here turns with the screen (docs/graphics-standards.md gate 8).
 */

import {
  CustomBlending,
  HalfFloatType,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  LinearFilter,
  Matrix4,
  Mesh,
  OneFactor,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type DepthTexture,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { VOLUME_STRIDE } from './worldLights.ts';

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/** Steps a fragment takes along its sight line through one source's reach. */
const STEPS = 6;

const VERTEX = [
  'attribute vec4 aCentre;',
  'attribute vec4 aColour;',
  'varying vec3 vCentre;',
  'varying float vRadius;',
  'varying vec3 vColour;',
  'void main() {',
  '  vCentre = aCentre.xyz;',
  '  vRadius = aCentre.w;',
  '  vColour = aColour.rgb;',
  '  vec4 centre = viewMatrix * vec4( aCentre.xyz, 1.0 );',
  // From outside, a quad facing the eye covers the reach: a sphere seen from
  // twice its radius spreads 1.155 radii, and the quad is cut at 1.25. From
  // nearer, or inside, the reach may fill the screen, so the quad does.
  '  if ( length( centre.xyz ) > 2.0 * aCentre.w ) {',
  '    centre.xy += position.xy * aCentre.w * 1.25;',
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
  'varying vec3 vCentre;',
  'varying float vRadius;',
  'varying vec3 vColour;',
  'void main() {',
  // Where this pixel's sight line ends: on the world, or at the far plane.
  '  vec2 uv = gl_FragCoord.xy * uTexel;',
  '  float depth = texture2D( tDepth, uv ).r;',
  '  vec4 at = uInvViewProj * vec4( uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0 );',
  '  vec3 toWorld = at.xyz / at.w - uEye;',
  '  float tWorld = length( toWorld );',
  '  vec3 ray = toWorld / tWorld;',
  // The part of the line inside the source's reach, and in front of the world.
  '  vec3 fromCentre = uEye - vCentre;',
  '  float along = dot( fromCentre, ray );',
  '  float inside = along * along - dot( fromCentre, fromCentre ) + vRadius * vRadius;',
  '  if ( inside <= 0.0 ) discard;',
  '  float reach = sqrt( inside );',
  '  float t0 = max( 0.0, - along - reach );',
  '  float t1 = min( tWorld, - along + reach );',
  '  if ( t1 <= t0 ) discard;',
  // Bright at the source and gone at the reach's edge, summed along the line.
  `  float dt = ( t1 - t0 ) / ${glsl(STEPS)};`,
  '  float sum = 0.0;',
  `  for ( int i = 0; i < ${STEPS}; i ++ ) {`,
  '    vec3 p = fromCentre + ray * ( t0 + ( float( i ) + 0.5 ) * dt );',
  '    float d2 = dot( p, p ) / ( vRadius * vRadius );',
  '    float window = max( 0.0, 1.0 - d2 );',
  '    sum += window * window / ( 1.0 + 24.0 * d2 );',
  '  }',
  // And the swim back to the eye, as the water takes any light (water.ts).
  '  float mid = 0.5 * ( t0 + t1 );',
  '  float swim = uReachM > 0.0 ? exp( - ( mid * mid ) / ( uReachM * uReachM ) ) : 1.0;',
  `  gl_FragColor = vec4( vColour * ( ${glsl(HIGH_GRAPHICS.WORLD_LIGHT.VOLUME)} * sum * dt / vRadius ) * swim, 1.0 );`,
  '}',
].join('\n');

export class LightVolumes {
  private target: WebGLRenderTarget | null = null;
  private readonly uniforms = {
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
    // Light adds to light, and nothing here is hidden by the pass's own
    // depth: the world's is read in the fragment instead.
    transparent: true,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    depthTest: false,
    depthWrite: false,
  });
  private geometry = new InstancedBufferGeometry();
  private readonly mesh: Mesh;
  private readonly scene = new Scene();
  /** Sources drawn: zero draws no pass. */
  count = 0;

  constructor() {
    this.geometry.copy(new PlaneGeometry(2, 2) as unknown as InstancedBufferGeometry);
    this.geometry.instanceCount = 0;
    this.mesh = new Mesh(this.geometry, this.material);
    // Drawn through the world's camera, whichever layer its pass has it on.
    this.mesh.layers.enableAll();
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  /** The sources to draw, as `volumeInstances` lays them out (worldLights.ts). */
  setLights(instances: Float32Array): void {
    const buffer = new InstancedInterleavedBuffer(instances, VOLUME_STRIDE);
    this.geometry.setAttribute('aCentre', new InterleavedBufferAttribute(buffer, 4, 0));
    this.geometry.setAttribute('aColour', new InterleavedBufferAttribute(buffer, 4, 4));
    this.count = instances.length / VOLUME_STRIDE;
    this.geometry.instanceCount = this.count;
  }

  /** Bytes the target holds: half-float colour at half the frame's size each way. */
  get bytes(): number {
    return this.target === null ? 0 : this.target.width * this.target.height * 8;
  }

  private sized(width: number, height: number): WebGLRenderTarget {
    const w = Math.max(1, Math.ceil(width / 2));
    const h = Math.max(1, Math.ceil(height / 2));
    if (this.target !== null && this.target.width === w && this.target.height === h) {
      return this.target;
    }
    this.target?.dispose();
    this.target = new WebGLRenderTarget(w, h, {
      type: HalfFloatType,
      format: RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: false,
    });
    this.target.texture.name = 'high-scatter';
    return this.target;
  }

  /**
   * Draw the sources' light for a frame whose world is `width` × `height`
   * pixels with `depth`, and hand back the texture the composite adds. The
   * renderer's target and clear state are the caller's to restore.
   */
  render(
    renderer: WebGLRenderer,
    camera: PerspectiveCamera,
    depth: DepthTexture,
    width: number,
    height: number,
    reachM: number
  ): Texture {
    const target = this.sized(width, height);
    this.uniforms.tDepth.value = depth;
    this.uniforms.uInvViewProj.value
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .invert();
    this.uniforms.uEye.value.copy(camera.position);
    this.uniforms.uTexel.value.set(1 / target.width, 1 / target.height);
    this.uniforms.uReachM.value = reachM;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.render(this.scene, camera);
    return target.texture;
  }

  /** Let the target go; the sources are kept for the next frame that draws. */
  release(): void {
    this.target?.dispose();
    this.target = null;
  }

  dispose(): void {
    this.release();
    this.geometry.dispose();
    this.material.dispose();
  }
}
