/**
 * The High graphics quality's frame (docs/art-direction.md, "Two layers, two
 * laws"; docs/graphics-standards.md gate 6; #1801).
 *
 * The picture is two layers under two laws, so the frame is two passes of the
 * one scene, told apart by three's layers:
 *
 * 1. **The world pass.** Everything on `WORLD_LAYER` (the lit ground and
 *    stone, the props) is drawn into a linear half-float target with the
 *    canvas's own four samples. Nothing in it is tone-mapped: three never
 *    tone-maps a draw into a target, so light stays scene-referred. The fog
 *    chunk is asked for its other half there (water.ts `installWaterFog`): a
 *    fragment only loses light to the water, and alpha holds what survived.
 * 2. **The scatter pass**, where the ground stands a source of its own: the
 *    light those sources scatter in the water, summed against the world's
 *    depth into a half-resolution target (lightVolumes.ts).
 * 3. **The composite.** One full-screen draw to the canvas adds the water's
 *    own light by what each pixel lost (waterMedium.ts) and the sources'
 *    volumes, runs the chain's curve, and writes the world's depth, so the
 *    pass after it is hidden by the world as it is at Low.
 * 4. **The tactical pass.** Everything else in the scene, drawn to the canvas
 *    exactly as the Low quality draws it: the same materials, the same
 *    per-material tone curve, the same fog. That is the law's "unchanged at
 *    both graphics qualities", kept by construction rather than by matching.
 *
 * The lamp halo and the chromatic split follow on the canvas as they always
 * have (PerspectiveView `renderFrame`).
 *
 * Alpha is why the water is added here and not in each material. Resolved,
 * a pixel's alpha is the mean of what its samples kept, so a frond's edge
 * against open water takes the water's light by its coverage, per sample. A
 * fog applied after the resolve from one depth a pixel would alias exactly
 * that edge.
 */

import {
  AlwaysDepth,
  Color,
  DataTexture,
  DepthTexture,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedIntType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type FogExp2,
  type Material,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { Biome, HIGH_GRAPHICS } from '@echoes/shared';
import { LightVolumes } from './lightVolumes.ts';
import { WATER_HUE } from './palette.ts';
import { BACKDROP_SPAN_M, HIGH_WORLD_FOG_SIGN, WATER_RAMP_GLSL } from './water.ts';
import { WATER_MEDIUM_GLSL } from './waterMedium.ts';

/** The layer the world pass draws: every renderable the High quality lights. */
export const WORLD_LAYER = 1;

/** `on` while the frame is drawn by this path; `unavailable` says why it is not. */
export type HighFrameState = 'off' | 'on' | `unavailable: ${string}`;

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

const COMPOSITE_VERTEX = [
  'uniform mat4 uInvViewProj;',
  'varying vec2 vUv;',
  'varying vec4 vFarPoint;',
  'void main() {',
  '  vUv = uv;',
  // Before its perspective divide, as the Low backdrop passes it (water.ts).
  '  vFarPoint = uInvViewProj * vec4( position.xy, 1.0, 1.0 );',
  '  gl_Position = vec4( position.xy, 0.0, 1.0 );',
  '}',
].join('\n');

const COMPOSITE_FRAGMENT = [
  'uniform sampler2D tWorld;',
  'uniform sampler2D tDepth;',
  'uniform sampler2D tScatter;',
  'uniform mat4 uInvViewProj;',
  'uniform vec3 uEye;',
  'uniform float uFocusDepthM;',
  'uniform float uReachM;',
  'varying vec2 vUv;',
  'varying vec4 vFarPoint;',
  WATER_RAMP_GLSL,
  WATER_MEDIUM_GLSL,
  'void main() {',
  '  vec4 world = texture2D( tWorld, vUv );',
  '  float depth = texture2D( tDepth, vUv ).r;',
  // The water a pixel looks into: where there is ground, the water the ground
  // stands in, and where there is none, the Low backdrop's reading of the ray
  // from the focus (water.ts `WaterBackdrop`). Its hue is the biome's under
  // the water the light comes from, which is the water along the ray: most of
  // a reach in from where the ray enters, or the ground itself where the ray
  // ends sooner. Far ground and the open water over it then wear one hue.
  '  vec4 at = uInvViewProj * vec4( vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0 );',
  '  vec3 ground = at.xyz / at.w;',
  '  vec3 ray = normalize( vFarPoint.xyz / vFarPoint.w - uEye );',
  `  float openDepthM = uFocusDepthM - ray.y * ${glsl(BACKDROP_SPAN_M)};`,
  '  bool solid = depth < 1.0;',
  '  float depthM = solid ? echoesWaterDepthM( ground.y ) : openDepthM;',
  '  float entry = uEye.y > 0.0 && ray.y < -1e-4 ? uEye.y / - ray.y : 0.0;',
  '  float along = entry + 0.8 * uReachM;',
  '  if ( solid ) along = min( along, distance( ground, uEye ) );',
  '  vec2 under = uEye.xz + ray.xz * along;',
  // The ramp's brightness in the biome's hue, by what the pixel's own light
  // lost to the swim; then what the world's own sources scatter in it.
  '  vec3 water = echoesWaterHue( under ) * echoesWaterLight( depthM );',
  '  vec3 light = world.rgb + ( 1.0 - clamp( world.a, 0.0, 1.0 ) ) * water;',
  '  light += texture2D( tScatter, vUv ).rgb;',
  `  gl_FragColor = vec4( light * ${glsl(HIGH_GRAPHICS.EXPOSURE)}, 1.0 );`,
  '  #include <tonemapping_fragment>',
  '  #include <colorspace_fragment>',
  '  gl_FragDepth = depth;',
  '}',
].join('\n');

/** What the composite reads of the frame beside the world pass's target. */
export interface HighFrameView {
  /** The focus's depth in metres, as the Low backdrop is anchored (water.ts). */
  focusDepthM: number;
  /** How far the water reaches this frame, world units; 0 where it hides nothing. */
  reachM: number;
}

/** One texel of one colour, for a sampler nothing has been handed for yet. */
function texel(r: number, g: number, b: number): DataTexture {
  const texture = new DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

export class HighFrame {
  private current: HighFrameState = 'off';
  private target: WebGLRenderTarget | null = null;
  /** No source, no scattered light; and open water's hue until a ground names its own. */
  private readonly dark = texel(0, 0, 0);
  private readonly openWater = (() => {
    const token = WATER_HUE[Biome.OpenWater];
    return texel((token >> 16) & 0xff, (token >> 8) & 0xff, token & 0xff);
  })();
  private readonly uniforms = {
    tWorld: { value: null as WebGLRenderTarget['texture'] | null },
    tDepth: { value: null as DepthTexture | null },
    tScatter: { value: this.dark as Texture },
    tWaterHue: { value: this.openWater as Texture },
    uWaterMapM: { value: new Vector2(1, 1) },
    uInvViewProj: { value: new Matrix4() },
    uEye: { value: new Vector3() },
    uFocusDepthM: { value: 0 },
    uReachM: { value: 0 },
  };
  /** The light the world's own sources scatter in the water (lightVolumes.ts). */
  private readonly volumes = new LightVolumes();
  private readonly material = new ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: COMPOSITE_VERTEX,
    fragmentShader: COMPOSITE_FRAGMENT,
    // Every pixel takes the world's depth, whatever the canvas held.
    depthTest: true,
    depthFunc: AlwaysDepth,
    depthWrite: true,
  });
  private readonly quad = new Mesh(new PlaneGeometry(2, 2), this.material);
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly clear = new Color();
  private readonly fogColor = new Color();
  /** Called at each pass boundary, so the frame's GPU time splits by pass. */
  marker: ((pass: string) => void) | null = null;

  constructor() {
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  get state(): HighFrameState {
    return this.current;
  }

  get on(): boolean {
    return this.current === 'on';
  }

  /** Bytes the targets hold: the world's samples, resolve and depth, and the scatter's (gate 6). */
  get bytes(): number {
    if (this.target === null) return 0;
    const pixels = this.target.width * this.target.height;
    // Half-float RGBA and 24-bit depth, multisampled, and one resolve of each.
    return pixels * (8 + 4) * (HIGH_GRAPHICS.SAMPLES + 1) + this.volumes.bytes;
  }

  /** Sources whose light the scatter pass draws. */
  get lights(): number {
    return this.volumes.count;
  }

  /**
   * The water this ground stands in: the plan texture of its hue
   * (waterMedium.ts `waterHueTexture`) and the map's size in metres. The
   * texture stays its maker's to dispose.
   */
  setWater(hue: Texture | null, widthM = 1, heightM = 1): void {
    this.uniforms.tWaterHue.value = hue ?? this.openWater;
    this.uniforms.uWaterMapM.value.set(widthM, heightM);
  }

  /** The world's own sources, as `volumeInstances` lays them out (worldLights.ts). */
  setLights(instances: Float32Array): void {
    this.volumes.setLights(instances);
  }

  /**
   * Turn the frame on for this renderer, after its capability check: a
   * half-float target a display cannot render to leaves the frame on Low,
   * with the reason in `state`.
   */
  enable(renderer: WebGLRenderer): void {
    if (this.on) return;
    const reason = this.check(renderer);
    if (reason !== null) {
      this.current = `unavailable: ${reason}`;
      return;
    }
    this.current = 'on';
  }

  /** Back to Low, for any reason: the target goes, and so does a refusal. */
  disable(reason?: string): void {
    this.target?.depthTexture?.dispose();
    this.target?.dispose();
    this.target = null;
    this.volumes.release();
    this.uniforms.tWorld.value = null;
    this.uniforms.tDepth.value = null;
    this.uniforms.tScatter.value = this.dark;
    this.current = reason === undefined ? 'off' : `unavailable: ${reason}`;
  }

  dispose(): void {
    this.disable();
    this.volumes.dispose();
    this.dark.dispose();
    this.openWater.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }

  private check(renderer: WebGLRenderer): string | null {
    if (!renderer.extensions.has('EXT_color_buffer_float')) return 'no EXT_color_buffer_float';
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const samples = gl.getParameter(gl.MAX_SAMPLES) as number;
    return samples < HIGH_GRAPHICS.SAMPLES ? `fewer than ${HIGH_GRAPHICS.SAMPLES} samples` : null;
  }

  private sized(renderer: WebGLRenderer): WebGLRenderTarget {
    const gl = renderer.getContext();
    const width = gl.drawingBufferWidth || 1;
    const height = gl.drawingBufferHeight || 1;
    if (this.target !== null && this.target.width === width && this.target.height === height) {
      return this.target;
    }
    this.target?.depthTexture?.dispose();
    this.target?.dispose();
    const depth = new DepthTexture(width, height, UnsignedIntType);
    depth.minFilter = depth.magFilter = NearestFilter;
    const target = new WebGLRenderTarget(width, height, {
      type: HalfFloatType,
      format: RGBAFormat,
      samples: HIGH_GRAPHICS.SAMPLES,
      depthBuffer: true,
      stencilBuffer: false,
      depthTexture: depth,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: false,
    });
    target.texture.name = 'high-world';
    this.target = target;
    this.uniforms.tWorld.value = target.texture;
    this.uniforms.tDepth.value = depth;
    return target;
  }

  /**
   * Compile the scene's programs as the world pass will draw them, into its
   * target, so the driver links them off the frame (PerspectiveView
   * `precompile`). three keys a program by the target it draws into: one
   * compiled for the canvas is tone-mapped and encoded, and is another
   * program.
   */
  compile(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): Set<Material> {
    const target = this.sized(renderer);
    renderer.setRenderTarget(target);
    try {
      return renderer.compile(scene, camera);
    } finally {
      renderer.setRenderTarget(null);
    }
  }

  /**
   * Draw the frame's passes and name them, in order. The scene, its camera
   * and its fog are handed back as they came.
   */
  render(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    view: HighFrameView
  ): string[] {
    const target = this.sized(renderer);
    const background = scene.background;
    const fog = scene.fog as FogExp2 | null;
    const autoClear = renderer.autoClear;
    const clearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clear);
    const mask = camera.layers.mask;
    if (fog !== null) this.fogColor.copy(fog.color);
    try {
      // 1. The world, scene-referred. Cleared to nothing kept: open water is
      // all in-scatter, which the composite adds.
      scene.background = null;
      if (fog !== null) fog.color.setRGB(HIGH_WORLD_FOG_SIGN, 0, 0);
      camera.layers.set(WORLD_LAYER);
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = true;
      renderer.render(scene, camera);
      if (fog !== null) fog.color.copy(this.fogColor);

      // 2. What the world's own sources scatter in the water, against the
      // depth the world pass just resolved.
      const scattered = this.volumes.count > 0;
      if (scattered) {
        this.marker?.('high-scatter');
        this.uniforms.tScatter.value = this.volumes.render(
          renderer,
          camera,
          target.depthTexture!,
          target.width,
          target.height,
          view.reachM
        );
      } else {
        this.uniforms.tScatter.value = this.dark;
      }

      // 3. The composite, to the canvas, writing the world's depth.
      this.marker?.('high-composite');
      this.uniforms.uInvViewProj.value
        .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        .invert();
      this.uniforms.uEye.value.copy(camera.position);
      this.uniforms.uFocusDepthM.value = view.focusDepthM;
      this.uniforms.uReachM.value = view.reachM;
      renderer.setRenderTarget(null);
      renderer.setClearColor(this.clear, clearAlpha);
      renderer.clear(true, true, true);
      renderer.autoClear = false;
      renderer.render(this.scene, this.camera);

      // 4. The tactical layer, over it, as Low draws it.
      this.marker?.('high-tactical');
      camera.layers.mask = mask;
      renderer.render(scene, camera);
      return scattered
        ? ['high-world', 'high-scatter', 'high-composite', 'high-tactical']
        : ['high-world', 'high-composite', 'high-tactical'];
    } finally {
      scene.background = background;
      if (fog !== null) fog.color.copy(this.fogColor);
      camera.layers.mask = mask;
      renderer.setRenderTarget(null);
      renderer.setClearColor(this.clear, clearAlpha);
      renderer.autoClear = autoClear;
    }
  }
}
