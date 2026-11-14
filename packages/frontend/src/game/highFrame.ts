/**
 * The High graphics quality's frame (docs/art-direction.md, "Two layers, two
 * laws"; docs/graphics-standards.md gate 6; #1801).
 *
 * The picture is two layers under two laws, so the frame is two passes of the
 * one scene, told apart by three's layers:
 *
 * 0. **The hold pass**, where an own entity's ground shadow is drawn: the
 *    level ground each shadow carries, in plan, for the lit ground to read
 *    (shadowHold.ts). It draws first, since the world pass reads it.
 * 1. **The world pass.** Everything on `WORLD_LAYER` (the lit ground and
 *    stone, the props, the cladding of the player's own models) is drawn
 *    into a linear half-float target with the canvas's own four samples.
 *    Nothing in it is tone-mapped: three never tone-maps a draw into a
 *    target, so light stays scene-referred. The fog chunk is asked for its
 *    other half there (water.ts `installWaterFog`): a fragment only loses
 *    light to the water, and alpha holds what survived.
 * 2. **The scatter pass**, where the ground stands a source of its own: the
 *    light those sources scatter in the water, summed against the world's
 *    depth into a half-resolution target (lightVolumes.ts).
 * 3. **The occlusion pass and the bloom passes** (highChain.ts): how much of
 *    the water above each point the ground round it hides, and the light
 *    over a soft threshold spread down four levels and back.
 * 4. **The plate pass** (markPlates.ts): where the marks stand, as a mask of
 *    the frame's size, and where a model stands in front of one. A mark
 *    carries its own ground at High (limit 6), and a model is not ground.
 * 5. **The composite.** One full-screen draw to the canvas sums the frame's
 *    light: the world's, occluded; the water's own, by what each pixel lost
 *    (waterMedium.ts); the sources' volumes; and the bloom. It grades the
 *    sum, runs the curve, holds the result under the plates, and writes the
 *    world's depth, so the pass after it is hidden by the world as it is at
 *    Low. In front of a model a plate holds the water's part of the sum
 *    alone, before the curve. The first takes nothing Low could draw, and
 *    the second none of the depth ramp's own light.
 * 6. **The tactical pass.** Everything else in the scene, drawn to the canvas
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
import { BLOOM_THRESHOLD_GLSL, LightChain } from './highChain.ts';
import { LightVolumes } from './lightVolumes.ts';
import { PLATE_HOLD_GLSL, PLATE_LEVEL_GLSL, PLATE_MEDIUM_GLSL, PlatePass } from './markPlates.ts';
import { ShadowHold } from './shadowHold.ts';
import { WATER_HUE } from './palette.ts';
import type { SurveyInkPlateUniforms } from './surveyInk.ts';
import { BACKDROP_SPAN_M, HIGH_WORLD_FOG_SIGN, WATER_RAMP_GLSL } from './water.ts';
import { WATER_MEDIUM_GLSL } from './waterMedium.ts';

/** The layer the world pass draws: every renderable the High quality lights. */
export const WORLD_LAYER = 1;

/**
 * The layer a model's world-pass cladding is on as well (rosterBatches.ts),
 * so the plate pass can draw the models alone: a plate never holds a model
 * (markPlates.ts `PlatePass.render`).
 */
export const MODEL_LAYER = 2;

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

const vec3 = (values: readonly number[]): string =>
  `vec3( ${values.map((value) => glsl(value)).join(', ')} )`;

const COMPOSITE_FRAGMENT = [
  'uniform sampler2D tWorld;',
  'uniform sampler2D tDepth;',
  'uniform sampler2D tScatter;',
  'uniform sampler2D tOcclusion;',
  'uniform sampler2D tBloom;',
  'uniform sampler2D tPlates;',
  'uniform vec2 uOcclusionTexel;',
  'uniform mat4 uInvViewProj;',
  'uniform vec3 uEye;',
  'uniform float uFocusDepthM;',
  'uniform float uReachM;',
  'varying vec2 vUv;',
  'varying vec4 vFarPoint;',
  WATER_RAMP_GLSL,
  WATER_MEDIUM_GLSL,
  PLATE_LEVEL_GLSL,
  BLOOM_THRESHOLD_GLSL,
  // The frame's light at this pixel, scene-referred, before the bloom, in two
  // parts: what the world's surfaces send, returned, and `medium`, what the
  // water adds between them and the eye. The prefilter cuts their sum and
  // the composite grades it; a plate under a model holds the second alone.
  // `swim` is what a plate's level reads (markPlates.ts): the share of the
  // pixel the swim gave to the water, and the depth its water is read at.
  'vec3 echoesHighLight( out float depth, out vec3 medium, out vec2 swim ) {',
  '  vec4 world = texture2D( tWorld, vUv );',
  '  depth = texture2D( tDepth, vUv ).r;',
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
  `  float along = entry + ${glsl(HIGH_GRAPHICS.WATER.HUE_REACH)} * uReachM;`,
  '  if ( solid ) along = min( along, distance( ground, uEye ) );',
  '  vec2 under = uEye.xz + ray.xz * along;',
  // The ramp's brightness in the biome's hue, by what the pixel's own light
  // lost to the swim; then what the world's own sources scatter in it.
  '  vec3 water = echoesWaterHue( under ) * echoesWaterLight( depthM );',
  // The world's own light, less what the ground round it hides of the water
  // above: four reads of the half-size pass average its per-pixel turn.
  '  float open = 0.25 * (',
  '    texture2D( tOcclusion, vUv + uOcclusionTexel * vec2( 0.5, 0.5 ) ).r +',
  '    texture2D( tOcclusion, vUv + uOcclusionTexel * vec2( - 0.5, 0.5 ) ).r +',
  '    texture2D( tOcclusion, vUv + uOcclusionTexel * vec2( 0.5, - 0.5 ) ).r +',
  '    texture2D( tOcclusion, vUv + uOcclusionTexel * vec2( - 0.5, - 0.5 ) ).r );',
  '  swim = vec2( 1.0 - clamp( world.a, 0.0, 1.0 ), depthM );',
  '  medium = swim.x * water + texture2D( tScatter, vUv ).rgb;',
  `  return world.rgb * mix( 1.0, open, ${glsl(HIGH_GRAPHICS.AO.STRENGTH)} );`,
  '}',
  'void main() {',
  '  float depth;',
  '  vec3 medium;',
  '  vec2 swim;',
  '  vec3 light = echoesHighLight( depth, medium, swim );',
  '  #ifdef BLOOM_PREFILTER',
  '    gl_FragColor = vec4( echoesBloomCut( light + medium ), 1.0 );',
  '  #else',
  `    medium += texture2D( tBloom, vUv ).rgb * ${glsl(HIGH_GRAPHICS.BLOOM.INTENSITY)};`,
  // Where a model stands in front of a mark's plate, the water's light is
  // held, down to the ramp's own and no further, and the model's is not
  // (markPlates.ts).
  PLATE_MEDIUM_GLSL,
  '    light += medium;',
  // The grade, before the curve: slope, offset and power a channel, then
  // saturation about the luminance.
  `    light = pow( max( light * ${vec3(HIGH_GRAPHICS.GRADE.SLOPE)} + ${vec3(HIGH_GRAPHICS.GRADE.OFFSET)}, 0.0 ), ${vec3(HIGH_GRAPHICS.GRADE.POWER)} );`,
  `    light = mix( vec3( dot( light, vec3( 0.2126, 0.7152, 0.0722 ) ) ), light, ${glsl(HIGH_GRAPHICS.GRADE.SATURATION)} );`,
  '    light = max( light, 0.0 );',
  `    gl_FragColor = vec4( light * ${glsl(HIGH_GRAPHICS.EXPOSURE)}, 1.0 );`,
  '    #include <tonemapping_fragment>',
  '    #include <colorspace_fragment>',
  // A mark's plate, on the colour the canvas is about to take: the world is
  // shown no brighter under it than Low could draw it, the palest ground the
  // ladder weighs or Low's own water.
  PLATE_HOLD_GLSL,
  '    gl_FragDepth = depth;',
  '  #endif',
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
  /** No source, no scattered light; nothing hidden; and open water's hue
   * until a ground names its own. */
  private readonly dark = texel(0, 0, 0);
  private readonly open = texel(255, 255, 255);
  private readonly openWater = (() => {
    const token = WATER_HUE[Biome.OpenWater];
    return texel((token >> 16) & 0xff, (token >> 8) & 0xff, token & 0xff);
  })();
  private readonly uniforms = {
    tWorld: { value: null as WebGLRenderTarget['texture'] | null },
    tDepth: { value: null as DepthTexture | null },
    tScatter: { value: this.dark as Texture },
    tOcclusion: { value: this.open as Texture },
    tBloom: { value: this.dark as Texture },
    tPlates: { value: this.dark as Texture },
    uOcclusionTexel: { value: new Vector2(1, 1) },
    tWaterHue: { value: this.openWater as Texture },
    uWaterMapM: { value: new Vector2(1, 1) },
    uInvViewProj: { value: new Matrix4() },
    uEye: { value: new Vector3() },
    uFocusDepthM: { value: 0 },
    uReachM: { value: 0 },
  };
  /** The light the world's own sources scatter in the water (lightVolumes.ts). */
  private readonly volumes = new LightVolumes();
  /** The level ground each ground shadow carries (shadowHold.ts). */
  private readonly holds = new ShadowHold();
  /**
   * The plan texture of those holds, as the uniform the lit ground reads
   * (litGround.ts `installLitGround`): black, which holds nothing, until a
   * frame draws a shadow.
   */
  readonly hold: { value: Texture } = { value: this.dark };
  private readonly material = new ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: COMPOSITE_VERTEX,
    fragmentShader: COMPOSITE_FRAGMENT,
    // Every pixel takes the world's depth, whatever the canvas held.
    depthTest: true,
    depthFunc: AlwaysDepth,
    depthWrite: true,
  });
  /** The same sum, cut by the bloom's threshold and drawn into its first level. */
  private readonly prefilter = new ShaderMaterial({
    uniforms: this.uniforms,
    defines: { BLOOM_PREFILTER: '' },
    vertexShader: COMPOSITE_VERTEX,
    fragmentShader: COMPOSITE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  /** Ambient occlusion and bloom (highChain.ts). */
  private readonly chain = new LightChain();
  /** Where the marks stand, for the composite to hold the world under (markPlates.ts). */
  private readonly plates = new PlatePass();
  /**
   * Whether the plates are drawn. Off only for a capture's on and off pair
   * (PerspectiveView `__perspectivePlates`): a player has no such setting,
   * since a plate is limit 6 and not a choice.
   */
  platesHeld = true;
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

  /** Bytes the targets hold: the world's samples, resolve and depth, and each later pass's (gate 6). */
  get bytes(): number {
    if (this.target === null) return 0;
    const pixels = this.target.width * this.target.height;
    // Half-float RGBA and 24-bit depth, multisampled, and one resolve of each.
    return (
      pixels * (8 + 4) * (HIGH_GRAPHICS.SAMPLES + 1) +
      this.volumes.bytes +
      this.chain.bytes +
      this.plates.bytes +
      this.holds.bytes
    );
  }

  /**
   * The ground the shadows' holds lie on: its size in metres, and the plan
   * target's in texels (shadowHold.ts `setGround`). No ground is a size of 0.
   */
  setHoldGround(widthM: number, heightM: number, width: number, height: number): void {
    this.holds.setGround(widthM, heightM, width, height);
  }

  /** This frame's ground shadows, as `DepthCues.packShadows` lays them out. */
  setShadows(shadows: Float32Array): void {
    this.holds.setShadows(shadows);
  }

  /** Ground shadows that carry a hold this frame. */
  get holdsDrawn(): number {
    return this.on && this.holds.drawn ? this.holds.count : 0;
  }

  /** The frame's first pass, for whoever times it: the hold's when one draws. */
  get opening(): string {
    return this.on && this.holds.drawn ? 'high-hold' : 'high-world';
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

  /** The marks' plates, as `MarkPlates.pack` lays them out (markPlates.ts). */
  setPlates(instances: Float32Array<ArrayBuffer>): void {
    this.plates.setPlates(instances);
  }

  /** The survey ink's plate for this ground, or none (markPlates.ts `PlatePass.setInk`). */
  setInkPlate(mesh: Mesh | null, uniforms: SurveyInkPlateUniforms | null = null): void {
    this.plates.setInk(mesh, uniforms);
  }

  /** Bands and discs the plate pass draws, the ink's own aside. */
  get platesDrawn(): number {
    return this.plates.count;
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
    this.chain.release();
    this.plates.release();
    this.holds.release();
    this.hold.value = this.dark;
    this.uniforms.tWorld.value = null;
    this.uniforms.tDepth.value = null;
    this.uniforms.tScatter.value = this.dark;
    this.uniforms.tOcclusion.value = this.open;
    this.uniforms.tBloom.value = this.dark;
    this.uniforms.tPlates.value = this.dark;
    this.current = reason === undefined ? 'off' : `unavailable: ${reason}`;
  }

  dispose(): void {
    this.disable();
    this.volumes.dispose();
    this.chain.dispose();
    this.plates.dispose();
    this.holds.dispose();
    this.dark.dispose();
    this.open.dispose();
    this.openWater.dispose();
    this.material.dispose();
    this.prefilter.dispose();
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
    const held = this.holds.drawn;
    try {
      // 0. The level ground each ground shadow carries, which the lit ground
      // reads in the pass after.
      if (held) {
        this.hold.value = this.holds.render(renderer);
        this.marker?.('high-world');
      } else {
        this.hold.value = this.dark;
      }

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

      this.uniforms.uInvViewProj.value
        .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        .invert();
      this.uniforms.uEye.value.copy(camera.position);
      this.uniforms.uFocusDepthM.value = view.focusDepthM;
      this.uniforms.uReachM.value = view.reachM;

      // 3. The chain: what the ground hides of the water above it, then the
      // frame's light over the bloom's threshold, spread.
      this.marker?.('high-occlusion');
      this.uniforms.tOcclusion.value = this.chain.occlude(
        renderer,
        camera,
        target.depthTexture!,
        target.width,
        target.height
      );
      this.uniforms.uOcclusionTexel.value.set(2 / target.width, 2 / target.height);
      this.marker?.('high-bloom');
      this.uniforms.tBloom.value = this.dark;
      this.quad.material = this.prefilter;
      renderer.setRenderTarget(this.chain.bloomSource(target.width, target.height));
      renderer.autoClear = true;
      renderer.render(this.scene, this.camera);
      this.uniforms.tBloom.value = this.chain.bloom(renderer);
      this.quad.material = this.material;

      // 4. Where the marks stand, for the composite to hold the world under.
      const plated = this.platesHeld && this.plates.drawn;
      if (plated) {
        this.marker?.('high-plates');
        this.uniforms.tPlates.value = this.plates.render(
          renderer,
          camera,
          fog,
          target.depthTexture!,
          target.width,
          target.height,
          { scene, layer: MODEL_LAYER }
        );
      } else {
        this.uniforms.tPlates.value = this.dark;
      }

      // 5. The composite, to the canvas, writing the world's depth.
      this.marker?.('high-composite');
      renderer.setRenderTarget(null);
      renderer.setClearColor(this.clear, clearAlpha);
      renderer.clear(true, true, true);
      renderer.autoClear = false;
      renderer.render(this.scene, this.camera);

      // 6. The tactical layer, over it, as Low draws it.
      this.marker?.('high-tactical');
      camera.layers.mask = mask;
      renderer.render(scene, camera);
      return [
        ...(held ? ['high-hold'] : []),
        'high-world',
        ...(scattered ? ['high-scatter'] : []),
        'high-occlusion',
        'high-bloom',
        ...(plated ? ['high-plates'] : []),
        'high-composite',
        'high-tactical',
      ];
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
