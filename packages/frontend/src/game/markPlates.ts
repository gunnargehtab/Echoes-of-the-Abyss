/**
 * A mark's plate at the High graphics quality (docs/art-direction.md, "The
 * plate under a mark"; docs/glossary.md, "Mark plate"; #1801).
 *
 * The lit world may stand a pool, a volume or the bloom under a mark, and the
 * loudness ladder's order holds only over ground about as dark as Low draws
 * it (docs/map-visuals.md §5). So a mark carries its own ground: under its
 * plate the world layer is shown no brighter than the palest ground the
 * ladder weighs, hue kept, and a pixel already under that level is left as
 * it is. A plate is a ceiling on the world's light, never a paint.
 *
 * Three parts:
 *
 * - `MarkPlates` is what the marks hand over: a band along each line traced
 *   on the ground and a disc under each agent's mark, in world space. The
 *   chart (EchoRenderer) fills it as it draws, a group to each of its cached
 *   layers, and the conn view adds the lines it draws itself. World space,
 *   because the chart draws after this frame is rendered: the plates one
 *   frame draws were handed over by the frame before, and projected by the
 *   camera as it stands now they still lie under their marks while it moves.
 * - `PlatePass` draws them, and the survey ink's own plate, into a mask of
 *   the frame's size: one pass of the High frame (highFrame.ts), before the
 *   composite.
 * - `PLATE_HOLD_GLSL` is what the composite does with that mask, after its
 *   curve and before the tactical pass draws. So a plate takes nothing from
 *   a lamp, its halo or a mark. A model's cladding is in the world pass
 *   since #1814, and the pass marks it in the mask, so a plate takes nothing
 *   from a model either: only from the water in front of it
 *   (`PLATE_MEDIUM_GLSL`).
 */

import {
  CustomBlending,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  LinearFilter,
  MaxEquation,
  Mesh,
  OneFactor,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SrcColorFactor,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  ZeroFactor,
  type DepthTexture,
  type FogExp2,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { HIGH_GRAPHICS, MODEL_LIGHTING, TERRAIN_LIFT } from '@echoes/shared';
import { encodedLuminance } from './ladder.ts';
import { BIOME_COLOR, scaleRgb } from './palette.ts';
import type { SurveyInkPlateUniforms } from './surveyInk.ts';

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/**
 * The palest ground the ladder weighs: the palest biome fill lifted by the
 * terrain cap (test/ladder.test.ts, `LIFTED_GROUND`; docs/art-direction.md
 * "Reading the Sea Floor"). The ladder's comparisons hold from black to it in
 * all four palettes, and are linear in the ground's luminance.
 */
export const PLATE_GROUND = scaleRgb(
  Object.values(BIOME_COLOR).reduce((a, b) => (encodedLuminance(a) >= encodedLuminance(b) ? a : b)),
  1 + TERRAIN_LIFT.MAX
);

/**
 * The encoded luminance the world layer is held to under a plate. Derived,
 * not chosen: it is that ground's, so under a plate a mark stands over
 * nothing paler than Low could have drawn there.
 */
export const PLATE_LEVEL = encodedLuminance(PLATE_GROUND);

/**
 * The composite's hold, on the encoded colour it is about to hand the canvas
 * (highFrame.ts): scaled down to the level by luminance where a plate stands,
 * so the hue is kept, and by the plate's coverage at its soft edge.
 */
export const PLATE_HOLD_GLSL = [
  // Green: the plates, less where a model stands in front (`PlatePass`).
  '    float plate = texture2D( tPlates, vUv ).g;',
  '    float shown = dot( gl_FragColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );',
  `    gl_FragColor.rgb *= mix( 1.0, min( 1.0, ${glsl(PLATE_LEVEL)} / max( shown, 1e-5 ) ), plate );`,
].join('\n');

/** three's sRGB encode, constants as the fragment writes them. */
const encode = (linear: number): number =>
  linear <= 0.0031308 ? linear * 12.92 : Math.pow(linear, 0.41666) * 1.055 - 0.055;

/**
 * What the composite's curve makes of a grey, encoded: three's ACES fit
 * (`ACESFilmicToneMapping`, r187), whose two matrices keep a grey a grey, at
 * the exposure the composite draws at.
 */
export function shownGrey(scene: number): number {
  const v = (scene * HIGH_GRAPHICS.EXPOSURE * MODEL_LIGHTING.EXPOSURE) / 0.6;
  const fit = (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  return encode(Math.min(1, Math.max(0, fit)));
}

/**
 * The scene-referred light that is shown at `PLATE_LEVEL`: the plate's level
 * before the curve, where the composite still holds the water's light apart
 * from a model's. Derived from the level by walking the curve back, which
 * rises all the way. The grade is left out: it moves a grey this dark by
 * under a hundredth of the level.
 */
export const PLATE_SCENE_LEVEL = (() => {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (shownGrey(mid) < PLATE_LEVEL) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
})();

/**
 * What a plate does where a model stands in front of it, on the light the
 * composite is about to sum (highFrame.ts): `medium`, the water's own light,
 * the sources' volumes and the bloom, is scaled down to the plate's level,
 * hue kept, and the model's own light is left as the world lit it. No plate
 * holds a model (docs/art-direction.md, "A model in the world's light"), and
 * the water in front of one is still the world's light under a mark. Red is
 * every plate and green the plates less the models, so their difference is a
 * plate under a model.
 */
export const PLATE_MEDIUM_GLSL = [
  '    vec2 plates = texture2D( tPlates, vUv ).rg;',
  '    float swum = dot( medium, vec3( 0.2126, 0.7152, 0.0722 ) );',
  `    medium *= mix( 1.0, min( 1.0, ${glsl(PLATE_SCENE_LEVEL)} / max( swum, 1e-6 ) ), max( 0.0, plates.r - plates.g ) );`,
].join('\n');

/**
 * Floats a plate: where it starts and how far it stands whole from its
 * centre line, where it ends and how much of a plate it is, and whether it
 * swims out with the water as a line the conn view draws does.
 */
export const PLATE_STRIDE = 9;

/**
 * The plates the marks carry this frame, in the conn view's world space
 * (plan metres across, world height up).
 *
 * Grouped, because the chart caches its layers: a layer that redraws opens
 * its group, which empties it, and one that does not leaves its plates
 * standing with its marks.
 */
export class MarkPlates {
  private readonly groups = new Map<string, number[]>();
  private open: number[] | null = null;
  /** What `pack` hands over, kept and grown: the chart repacks most frames. */
  private packed = new Float32Array(0);
  /** Moves whenever a plate does, so the pass repacks only then. */
  revision = 0;

  /** Empty a group and write to it: its layer is about to redraw. */
  begin(group: string): void {
    let plates = this.groups.get(group);
    if (plates === undefined) {
      plates = [];
      this.groups.set(group, plates);
    }
    if (plates.length > 0) this.revision++;
    plates.length = 0;
    this.open = plates;
  }

  /** Write to a group again without emptying it: the rest of a layer two calls draw. */
  resume(group: string): void {
    this.open = this.groups.get(group) ?? null;
    if (this.open === null) this.begin(group);
  }

  /** Stop writing: a mark drawn outside a group carries no plate. */
  close(): void {
    this.open = null;
  }

  /** Drop every plate: the view stopped drawing them. */
  clear(): void {
    if (this.count > 0) this.revision++;
    this.groups.clear();
    this.open = null;
  }

  /**
   * A band along a line between two world points, whole to `halfPx` CSS
   * pixels either side of it. `fades` is for a line the conn view draws in
   * the water's fog.
   */
  line(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    halfPx: number,
    strength = 1,
    fades = false
  ): void {
    if (this.open === null || strength <= 0) return;
    this.open.push(ax, ay, az, halfPx, bx, by, bz, Math.min(1, strength), fades ? 1 : 0);
    this.revision++;
  }

  /** A disc about a world point, whole to `radiusPx` CSS pixels from it. */
  disc(x: number, y: number, z: number, radiusPx: number, strength = 1): void {
    this.line(x, y, z, x, y, z, radiusPx, strength);
  }

  /** Plates standing in one group: what one of the chart's layers handed over. */
  countOf(group: string): number {
    return (this.groups.get(group)?.length ?? 0) / PLATE_STRIDE;
  }

  /** Plates standing, over every group. */
  get count(): number {
    let floats = 0;
    for (const plates of this.groups.values()) floats += plates.length;
    return floats / PLATE_STRIDE;
  }

  /**
   * Every group's plates as the pass reads them, `PLATE_STRIDE` floats each.
   * A view of one array this keeps, valid until the next call.
   */
  pack(): Float32Array<ArrayBuffer> {
    const floats = this.count * PLATE_STRIDE;
    if (this.packed.length < floats) {
      this.packed = new Float32Array(Math.max(floats, this.packed.length * 2));
    }
    let at = 0;
    for (const plates of this.groups.values()) {
      this.packed.set(plates, at);
      at += plates.length;
    }
    return this.packed.subarray(0, floats);
  }
}

const VERTEX = [
  'attribute vec4 aFrom;',
  'attribute vec4 aTo;',
  'attribute float aFades;',
  'uniform vec2 uViewport;',
  'uniform float uPixelRatio;',
  'uniform float uFogDensity;',
  'varying vec2 vFrom;',
  'varying vec2 vTo;',
  'varying float vWhole;',
  'varying float vStrength;',
  'void main() {',
  '  vec4 from = viewMatrix * vec4( aFrom.xyz, 1.0 );',
  '  vec4 to = viewMatrix * vec4( aTo.xyz, 1.0 );',
  '  vec4 clipFrom = projectionMatrix * from;',
  '  vec4 clipTo = projectionMatrix * to;',
  // A plate with an end behind the eye is not drawn, as its mark is not: the
  // chart ends a run at the frustum (EchoRenderer `penTo`).
  '  if ( clipFrom.w <= 1e-4 || clipTo.w <= 1e-4 ) {',
  '    gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );',
  '    return;',
  '  }',
  '  vFrom = ( clipFrom.xy / clipFrom.w * 0.5 + 0.5 ) * uViewport;',
  '  vTo = ( clipTo.xy / clipTo.w * 0.5 + 0.5 ) * uViewport;',
  '  vWhole = aFrom.w * uPixelRatio;',
  // A line the conn view draws swims out with the water, and its plate with it.
  '  float depth = 0.5 * ( length( from.xyz ) + length( to.xyz ) );',
  '  float swim = aFades > 0.5 ? exp( - uFogDensity * uFogDensity * depth * depth ) : 1.0;',
  '  vStrength = aTo.w * swim;',
  // One quad round the whole capsule, in pixels: `position.x` runs from one
  // end to the other and `position.y` across.
  `  float reach = vWhole + ${glsl(HIGH_GRAPHICS.PLATE.FEATHER_PX)} * uPixelRatio + 1.0;`,
  '  vec2 along = vTo - vFrom;',
  '  float span = length( along );',
  '  vec2 axis = span > 1e-4 ? along / span : vec2( 1.0, 0.0 );',
  '  vec2 across = vec2( - axis.y, axis.x );',
  '  vec2 at = mix( vFrom, vTo, position.x * 0.5 + 0.5 ) + ( axis * position.x + across * position.y ) * reach;',
  '  gl_Position = vec4( at / uViewport * 2.0 - 1.0, 0.0, 1.0 );',
  '}',
].join('\n');

const FRAGMENT = [
  'uniform float uPixelRatio;',
  'varying vec2 vFrom;',
  'varying vec2 vTo;',
  'varying float vWhole;',
  'varying float vStrength;',
  'void main() {',
  '  vec2 along = vTo - vFrom;',
  '  float t = clamp( dot( gl_FragCoord.xy - vFrom, along ) / max( dot( along, along ), 1e-6 ), 0.0, 1.0 );',
  '  float d = distance( gl_FragCoord.xy, vFrom + along * t );',
  `  float cover = 1.0 - smoothstep( vWhole, vWhole + ${glsl(HIGH_GRAPHICS.PLATE.FEATHER_PX)} * uPixelRatio, d );`,
  '  gl_FragColor = vec4( vec3( cover * vStrength ), 1.0 );',
  '}',
].join('\n');

// A model's cladding, drawn over the mask where it is what the world pass
// showed: the world's depth at the pixel is its own. Ground, stone or a prop
// in front of a hull is nearer than this fragment, and keeps its plate. The
// draw multiplies: green goes and red stays, so the composite knows a plate
// under a model from a plate under ground (`PLATE_MEDIUM_GLSL`).
const CUT_VERTEX = [
  '#include <common>',
  'void main() {',
  '  #include <begin_vertex>',
  '  #include <project_vertex>',
  '}',
].join('\n');

const CUT_FRAGMENT = [
  'uniform sampler2D uCutDepth;',
  'uniform vec2 uCutTexel;',
  'void main() {',
  '  float world = texture2D( uCutDepth, gl_FragCoord.xy * uCutTexel ).r;',
  // The resolve keeps one sample's depth, so a face seen edge on is given
  // its own slope's worth of room.
  '  if ( gl_FragCoord.z > world + 3.0 * fwidth( gl_FragCoord.z ) + 1e-6 ) discard;',
  '  gl_FragColor = vec4( 1.0, 0.0, 1.0, 1.0 );',
  '}',
].join('\n');

/** The scene whose models the plate pass cuts from its mask, and the layer they are on. */
export interface PlateModels {
  scene: Scene;
  layer: number;
}

export class PlatePass {
  private target: WebGLRenderTarget | null = null;
  private readonly uniforms = {
    uViewport: { value: new Vector2(1, 1) },
    uPixelRatio: { value: 1 },
    uFogDensity: { value: 0 },
  };
  private readonly material = new ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    // Where two plates cross, the pixel takes the more whole of the two: a
    // sum would end a soft edge early, and a plate is no darker for two marks.
    transparent: true,
    blending: CustomBlending,
    blendEquation: MaxEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    depthTest: false,
    depthWrite: false,
  });
  private readonly cutUniforms = {
    uCutDepth: { value: null as DepthTexture | null },
    uCutTexel: { value: new Vector2(1, 1) },
  };
  /**
   * What a model's cladding is drawn in over the mask: the mask's green
   * taken away, where the model is what the world pass showed
   * (`CUT_FRAGMENT`). Both faces, since a membrane is drawn both ways.
   */
  private readonly cut = new ShaderMaterial({
    uniforms: this.cutUniforms,
    vertexShader: CUT_VERTEX,
    fragmentShader: CUT_FRAGMENT,
    side: DoubleSide,
    transparent: true,
    blending: CustomBlending,
    blendSrc: ZeroFactor,
    blendDst: SrcColorFactor,
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
    depthTest: false,
    depthWrite: false,
  });
  private geometry = new InstancedBufferGeometry();
  /** The plates the geometry draws from, and how many it has room for. */
  private buffer: InstancedInterleavedBuffer | null = null;
  private room = 0;
  private readonly mesh: Mesh;
  private readonly scene = new Scene();
  private ink: Mesh | null = null;
  private inkUniforms: SurveyInkPlateUniforms | null = null;
  /** Bands and discs drawn; the ink's plate is counted by `drawn`. */
  count = 0;

  constructor() {
    this.geometry.copy(new PlaneGeometry(2, 2) as unknown as InstancedBufferGeometry);
    this.geometry.instanceCount = 0;
    this.mesh = new Mesh(this.geometry, this.material);
    // Drawn through the world's camera, whichever layer its pass has it on.
    this.mesh.layers.enableAll();
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.scene.add(this.mesh);
  }

  /**
   * The marks' plates, as `MarkPlates.pack` lays them out. Copied: the chart
   * hands over a new set most frames, so the buffer is kept and written
   * into, and replaced only when it has no room.
   */
  setPlates(instances: Float32Array<ArrayBuffer>): void {
    this.count = instances.length / PLATE_STRIDE;
    if (this.buffer === null || this.count > this.room) {
      // A new geometry for a new buffer: three sizes an instanced buffer once.
      this.room = Math.max(256, 2 * this.count);
      this.geometry.dispose();
      this.geometry = new InstancedBufferGeometry();
      this.geometry.copy(new PlaneGeometry(2, 2) as unknown as InstancedBufferGeometry);
      this.buffer = new InstancedInterleavedBuffer(
        new Float32Array(this.room * PLATE_STRIDE),
        PLATE_STRIDE
      );
      this.buffer.setUsage(DynamicDrawUsage);
      this.geometry.setAttribute('aFrom', new InterleavedBufferAttribute(this.buffer, 4, 0));
      this.geometry.setAttribute('aTo', new InterleavedBufferAttribute(this.buffer, 4, 4));
      this.geometry.setAttribute('aFades', new InterleavedBufferAttribute(this.buffer, 1, 8));
      this.mesh.geometry = this.geometry;
    }
    (this.buffer.array as Float32Array).set(instances);
    this.buffer.needsUpdate = true;
    this.geometry.instanceCount = this.count;
    this.mesh.visible = this.count > 0;
  }

  /**
   * The survey ink's plate: the ground's mesh in the ink's `plate` material
   * (surveyInk.ts), and the uniforms it reads the world's depth by. The mesh
   * and its material stay their maker's to dispose.
   */
  setInk(mesh: Mesh | null, uniforms: SurveyInkPlateUniforms | null = null): void {
    if (this.ink !== null) this.scene.remove(this.ink);
    this.ink = mesh;
    this.inkUniforms = mesh === null ? null : uniforms;
    if (mesh !== null) {
      mesh.layers.enableAll();
      this.scene.add(mesh);
    }
  }

  /** Whether any plate stands: none draws no pass. */
  get drawn(): boolean {
    return this.count > 0 || this.ink !== null;
  }

  /** Bytes the mask holds: one byte a channel at the frame's size. */
  get bytes(): number {
    return this.target === null ? 0 : this.target.width * this.target.height * 4;
  }

  private sized(width: number, height: number): WebGLRenderTarget {
    if (this.target !== null && this.target.width === width && this.target.height === height) {
      return this.target;
    }
    this.target?.dispose();
    this.target = new WebGLRenderTarget(width, height, {
      type: UnsignedByteType,
      format: RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: false,
    });
    this.target.texture.name = 'high-plates';
    return this.target;
  }

  /**
   * Draw the plates for a frame whose world is `width` × `height` pixels with
   * `depth`, and hand back the mask the composite holds the world under.
   *
   * A plate is the ground a mark carries, and a model is not ground: where
   * the cladding on `models.layer` is what the world pass showed, the mask's
   * green is taken away, so no plate holds a model (docs/art-direction.md,
   * "The plate under a mark"; the owner's call on #1814). At Low a mark over
   * a hull reads over whatever the rig lit, and here over what the world did.
   * Red still says a plate stands there, for the water in front of the model
   * (`PLATE_MEDIUM_GLSL`).
   *
   * The renderer's target and clear state, and the camera's layers, are the
   * caller's to restore.
   */
  render(
    renderer: WebGLRenderer,
    camera: PerspectiveCamera,
    fog: FogExp2 | null,
    depth: DepthTexture,
    width: number,
    height: number,
    models: PlateModels | null = null
  ): Texture {
    const target = this.sized(width, height);
    const ratio = renderer.getPixelRatio();
    this.uniforms.uViewport.value.set(width, height);
    this.uniforms.uPixelRatio.value = ratio;
    this.uniforms.uFogDensity.value = fog?.density ?? 0;
    if (this.inkUniforms !== null) {
      this.inkUniforms.uPlateDepth.value = depth;
      this.inkUniforms.uPlateTexel.value.set(1 / width, 1 / height);
      this.inkUniforms.uPlateReach.value.set(
        HIGH_GRAPHICS.PLATE.INK_PX * ratio,
        HIGH_GRAPHICS.PLATE.FEATHER_PX * ratio
      );
    }
    // The ink's plate swims out as its stroke does, by the scene's own fog.
    this.scene.fog = fog;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.render(this.scene, camera);
    if (models !== null) {
      this.cutUniforms.uCutDepth.value = depth;
      this.cutUniforms.uCutTexel.value.set(1 / width, 1 / height);
      const override = models.scene.overrideMaterial;
      models.scene.overrideMaterial = this.cut;
      camera.layers.set(models.layer);
      renderer.autoClear = false;
      try {
        renderer.render(models.scene, camera);
      } finally {
        models.scene.overrideMaterial = override;
      }
    }
    return target.texture;
  }

  /** Let the mask go; the plates are kept for the next frame that draws. */
  release(): void {
    this.target?.dispose();
    this.target = null;
  }

  dispose(): void {
    this.release();
    this.setInk(null);
    this.geometry.dispose();
    this.material.dispose();
    this.cut.dispose();
  }
}
