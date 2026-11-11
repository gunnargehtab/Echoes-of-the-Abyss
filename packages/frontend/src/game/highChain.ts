/**
 * The High graphics quality's chain: ambient occlusion and bloom
 * (docs/art-direction.md, "Two layers, two laws": the world layer may "spend
 * full-screen passes: bloom, grading, ambient occlusion"; #1801).
 *
 * Both are passes of the High frame (highFrame.ts), on the world layer's
 * light alone: they run before the tactical pass draws, so no mark, ring or
 * lamp is occluded, spread or graded by them (gate 3: an own lamp's light is
 * its halo's and its collar's to say).
 *
 * - **Ambient occlusion** reads the world's depth at half the frame's size:
 *   how much of the water above a point the ground round it hides. The Lid's
 *   glow comes from the whole water above, so the crease under a scarp and
 *   the foot of a stand take less of it. This is the shadow a light with no
 *   direction casts, and the only one this step draws.
 * - **Bloom** takes what the composite's light holds over a soft threshold,
 *   at half size, and spreads it down four levels and back up. It is the
 *   glow of the world's own sources: a pool, a volume, a stand's lit tips.
 *
 * Neither reads the camera beyond the projection the depth was drawn
 * through, so nothing turns with the screen (docs/graphics-standards.md
 * gate 8). Every number is TUNABLE (`HIGH_GRAPHICS.AO`, `HIGH_GRAPHICS.BLOOM`).
 */

import {
  AdditiveBlending,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  Mesh,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type DepthTexture,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

const QUAD_VERTEX = [
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = uv;',
  '  gl_Position = vec4( position.xy, 0.0, 1.0 );',
  '}',
].join('\n');

/** Taps the occlusion takes round a point, on a spiral. */
const AO_TAPS = 8;

const AO_FRAGMENT = [
  'uniform sampler2D tDepth;',
  'uniform mat4 uInvProjection;',
  'uniform mat4 uProjection;',
  'varying vec2 vUv;',
  'vec3 viewAt( vec2 uv ) {',
  '  vec4 p = uInvProjection * vec4( uv * 2.0 - 1.0, texture2D( tDepth, uv ).r * 2.0 - 1.0, 1.0 );',
  '  return p.xyz / p.w;',
  '}',
  'void main() {',
  '  if ( texture2D( tDepth, vUv ).r >= 1.0 ) { gl_FragColor = vec4( 1.0 ); return; }',
  '  vec3 p = viewAt( vUv );',
  // The surface's own facing, off the depth it was drawn with.
  '  vec3 n = normalize( cross( dFdx( p ), dFdy( p ) ) );',
  // The radius is metres in the world, so it is pixels by the distance: a
  // far ridge is occluded over the same ground a near one is, and from the
  // survey dolly it falls under a pixel and occludes nothing.
  `  float reach = ${glsl(HIGH_GRAPHICS.AO.RADIUS_M)};`,
  '  vec2 spread = reach * 0.5 * vec2( uProjection[ 0 ][ 0 ], uProjection[ 1 ][ 1 ] ) / max( 1.0, - p.z );',
  // Interleaved gradient noise turns the spiral a pixel at a time, so eight
  // taps do not band; the composite's four reads of this target average it.
  '  float turn = 6.2831853 * fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );',
  '  float hidden = 0.0;',
  `  for ( int i = 0; i < ${AO_TAPS}; i ++ ) {`,
  `    float along = sqrt( ( float( i ) + 0.5 ) / ${glsl(AO_TAPS)} );`,
  '    float angle = turn + float( i ) * 2.3999632;',
  '    vec3 toTap = viewAt( vUv + vec2( cos( angle ), sin( angle ) ) * along * spread ) - p;',
  '    float d = length( toTap );',
  // How far the tap stands over the surface's own plane, and nothing from a
  // tap past the reach: the far wall of a bowl does not darken its near rim.
  '    float over = max( 0.0, dot( n, toTap ) / max( d, 1e-3 ) - 0.08 );',
  '    hidden += over * ( 1.0 - smoothstep( 0.6 * reach, 1.4 * reach, d ) );',
  '  }',
  `  gl_FragColor = vec4( vec3( clamp( 1.0 - 2.0 * hidden / ${glsl(AO_TAPS)}, 0.0, 1.0 ) ), 1.0 );`,
  '}',
].join('\n');

/** One level down: a tent over the four diagonals and the centre. */
const DOWN_FRAGMENT = [
  'uniform sampler2D tSource;',
  'uniform vec2 uTexel;',
  'varying vec2 vUv;',
  'void main() {',
  '  vec3 sum = texture2D( tSource, vUv ).rgb * 4.0;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( 1.0, 1.0 ) ).rgb;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( - 1.0, 1.0 ) ).rgb;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( 1.0, - 1.0 ) ).rgb;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( - 1.0, - 1.0 ) ).rgb;',
  '  gl_FragColor = vec4( sum / 8.0, 1.0 );',
  '}',
].join('\n');

/** One level up, added to the level it lands on: a tent over eight taps. */
const UP_FRAGMENT = [
  'uniform sampler2D tSource;',
  'uniform vec2 uTexel;',
  'varying vec2 vUv;',
  'void main() {',
  '  vec3 sum = texture2D( tSource, vUv + uTexel * vec2( 2.0, 0.0 ) ).rgb;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( - 2.0, 0.0 ) ).rgb;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( 0.0, 2.0 ) ).rgb;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( 0.0, - 2.0 ) ).rgb;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( 1.0, 1.0 ) ).rgb * 2.0;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( - 1.0, 1.0 ) ).rgb * 2.0;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( 1.0, - 1.0 ) ).rgb * 2.0;',
  '  sum += texture2D( tSource, vUv + uTexel * vec2( - 1.0, - 1.0 ) ).rgb * 2.0;',
  '  gl_FragColor = vec4( sum / 12.0, 1.0 );',
  '}',
].join('\n');

/**
 * The soft threshold the composite's prefilter cuts its light by
 * (highFrame.ts): nothing under the threshold less the knee, all of what is
 * over the threshold plus it, and a quadratic between, so a source eases
 * into its glow instead of switching it on.
 */
export const BLOOM_THRESHOLD_GLSL = [
  'vec3 echoesBloomCut( vec3 light ) {',
  '  float peak = max( light.r, max( light.g, light.b ) );',
  `  float knee = ${glsl(HIGH_GRAPHICS.BLOOM.KNEE)};`,
  `  float soft = clamp( peak - ${glsl(HIGH_GRAPHICS.BLOOM.THRESHOLD)} + knee, 0.0, 2.0 * knee );`,
  '  soft = soft * soft / ( 4.0 * knee + 1e-5 );',
  `  return light * max( soft, peak - ${glsl(HIGH_GRAPHICS.BLOOM.THRESHOLD)} ) / max( peak, 1e-5 );`,
  '}',
].join('\n');

/** Levels the bloom spreads over: a half, a quarter, an eighth, a sixteenth. */
export const BLOOM_LEVELS = 4;

const target = (width: number, height: number, hdr: boolean, name: string): WebGLRenderTarget => {
  const made = new WebGLRenderTarget(Math.max(1, width), Math.max(1, height), {
    type: hdr ? HalfFloatType : UnsignedByteType,
    format: RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: false,
  });
  made.texture.name = name;
  return made;
};

export class LightChain {
  private occlusion: WebGLRenderTarget | null = null;
  private levels: WebGLRenderTarget[] = [];
  private readonly aoUniforms = {
    tDepth: { value: null as DepthTexture | null },
    uInvProjection: { value: new Matrix4() },
    uProjection: { value: new Matrix4() },
  };
  private readonly blurUniforms = {
    tSource: { value: null as Texture | null },
    uTexel: { value: new Vector2() },
  };
  private readonly ao = new ShaderMaterial({
    uniforms: this.aoUniforms,
    vertexShader: QUAD_VERTEX,
    fragmentShader: AO_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
  });
  private readonly down = new ShaderMaterial({
    uniforms: this.blurUniforms,
    vertexShader: QUAD_VERTEX,
    fragmentShader: DOWN_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
  });
  private readonly up = new ShaderMaterial({
    uniforms: this.blurUniforms,
    vertexShader: QUAD_VERTEX,
    fragmentShader: UP_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: AdditiveBlending,
  });
  private readonly quad = new Mesh(new PlaneGeometry(2, 2), this.ao);
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor() {
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Bytes the chain's targets hold (gate 6's ledger). */
  get bytes(): number {
    const ao = this.occlusion === null ? 0 : this.occlusion.width * this.occlusion.height * 4;
    return this.levels.reduce((sum, level) => sum + level.width * level.height * 8, ao);
  }

  private size(width: number, height: number): void {
    const w = Math.ceil(width / 2);
    const h = Math.ceil(height / 2);
    if (this.occlusion !== null && this.occlusion.width === w && this.occlusion.height === h) {
      return;
    }
    this.release();
    this.occlusion = target(w, h, false, 'high-occlusion');
    for (let level = 0; level < BLOOM_LEVELS; level++) {
      this.levels.push(
        target(Math.ceil(w / 2 ** level), Math.ceil(h / 2 ** level), true, `high-bloom-${level}`)
      );
    }
  }

  private draw(
    renderer: WebGLRenderer,
    material: ShaderMaterial,
    into: WebGLRenderTarget,
    clear: boolean
  ): void {
    this.quad.material = material;
    renderer.setRenderTarget(into);
    renderer.autoClear = clear;
    renderer.render(this.scene, this.camera);
  }

  /**
   * How much of the water above each point of the world the ground round it
   * leaves open, 1 for all of it, at half the frame's size.
   */
  occlude(
    renderer: WebGLRenderer,
    camera: PerspectiveCamera,
    depth: DepthTexture,
    width: number,
    height: number
  ): Texture {
    this.size(width, height);
    this.aoUniforms.tDepth.value = depth;
    this.aoUniforms.uProjection.value.copy(camera.projectionMatrix);
    this.aoUniforms.uInvProjection.value.copy(camera.projectionMatrixInverse);
    this.draw(renderer, this.ao, this.occlusion!, true);
    return this.occlusion!.texture;
  }

  /** Where the composite's prefilter draws the light it cut: the first level. */
  bloomSource(width: number, height: number): WebGLRenderTarget {
    this.size(width, height);
    return this.levels[0]!;
  }

  /**
   * Spread the first level's light down the levels and back up, each level
   * added to the one above it, and hand back the first: the bloom the
   * composite adds.
   */
  bloom(renderer: WebGLRenderer): Texture {
    const levels = this.levels;
    for (let i = 1; i < levels.length; i++) {
      const from = levels[i - 1]!;
      this.blurUniforms.tSource.value = from.texture;
      this.blurUniforms.uTexel.value.set(0.5 / from.width, 0.5 / from.height);
      this.draw(renderer, this.down, levels[i]!, true);
    }
    for (let i = levels.length - 1; i > 0; i--) {
      const from = levels[i]!;
      this.blurUniforms.tSource.value = from.texture;
      this.blurUniforms.uTexel.value.set(0.5 / from.width, 0.5 / from.height);
      this.draw(renderer, this.up, levels[i - 1]!, false);
    }
    return levels[0]!.texture;
  }

  /** Let the targets go; a later frame makes them again. */
  release(): void {
    this.occlusion?.dispose();
    this.occlusion = null;
    for (const level of this.levels) level.dispose();
    this.levels = [];
  }

  dispose(): void {
    this.release();
    this.ao.dispose();
    this.down.dispose();
    this.up.dispose();
    this.quad.geometry.dispose();
  }
}
