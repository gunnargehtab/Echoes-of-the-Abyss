/**
 * The lamp halo's pass — docs/art-direction.md, "Lamp halo — SPEC"; gate 6's
 * allocation in docs/graphics-standards.md. Drawn after the canvas render,
 * inside the same GPU-timer bracket, with no composer, no OutputPass and no
 * second camera:
 *
 * 1. Depth copy: one blit of the canvas depth, the depth bit only, into a
 *    drawing-buffer-sized DEPTH24_STENCIL8 depth texture (the stencil bit as
 *    well cost 5–7 ms on the named GPU, #1001's readings).
 * 2. Source: one instanced draw of a splat per lamp site into a half-float
 *    target that shares that depth, tested less-or-equal and never written.
 * 3. Spread: a 2 × 2 box downsample and a separable blur at each of 1/2, 1/4
 *    and 1/8 of the drawing buffer, nine draws.
 * 4. Composite: one full-screen draw, screen-blended onto the canvas, skipping
 *    every sample an own lamp marked in the canvas stencil.
 *
 * The full-screen draws write clip-space positions themselves, so the conn
 * camera passed to render() is never used for them (gate 8 allows no second
 * camera). Every halo render runs with autoClear off and a clear alpha of 0,
 * restored afterwards: three clears any target on render() while autoClear is
 * on, and the canvas's alpha-1 clear would leak into the source.
 */
import {
  AddEquation,
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  DepthStencilFormat,
  DepthTexture,
  DynamicDrawUsage,
  HalfFloatType,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  KeepStencilOp,
  LessEqualDepth,
  LinearFilter,
  Mesh,
  NoBlending,
  NotEqualStencilFunc,
  OneFactor,
  OneMinusSrcColorFactor,
  Scene,
  ShaderMaterial,
  UnsignedInt248Type,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { blurWeights, LAMP_HALO } from './lampHalo.ts';

/** One lamp site as the source draws it, in world space. */
export interface HaloSplat {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The site box as a Gaussian's covariance, m²: xx, xy, xz, yy, yz, zz. */
  readonly cov: readonly [number, number, number, number, number, number];
  /** Its ink, brightest channel 1. */
  readonly ink: Color;
  /** Its share of its entity's energy, m² of lamp at full ink. */
  readonly energy: number;
  /** Half its box's diagonal, m: the sphere it is culled by. */
  readonly halfDiagonal: number;
  /**
   * How far in front of its centre its nearest point lies along the view ray,
   * m: the box's extent along that ray. The splat sits there, less the bias,
   * so terrain and hulls hide a halo where they hide its lamp.
   */
  readonly nearOffset: number;
}

/** Why the halo is or is not drawing; the probe reports it. */
export type LampHaloState = 'off' | 'idle' | 'drawn' | `unavailable: ${string}`;

/** Floats per splat: centre 3, covariance 6, ink 3, energy 1, near offset 1, pad 2. */
const STRIDE = 16;
/** The instance buffer the cap bounds: 1,024 × 16 floats, 64 KiB. */
export const INSTANCE_BYTES = LAMP_HALO.SITE_CAP * STRIDE * 4;
const MAX_TAPS = 8;

const SPLAT_VERTEX = /* glsl */ `
attribute vec3 iCenter;
attribute vec3 iCovA;
attribute vec3 iCovB;
attribute vec3 iInk;
attribute vec2 iEnergy;
uniform vec2 uViewport;
uniform float uFogDensity;
uniform float uBias;
uniform float uMinSigma;
varying vec3 vColor;
varying vec2 vOffset;
varying vec3 vConic;
void main() {
  vec4 view = viewMatrix * vec4(iCenter, 1.0);
  float d = -view.z;
  if (d <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  mat3 sw = mat3(iCovA.x, iCovA.y, iCovA.z, iCovA.y, iCovB.x, iCovB.y, iCovA.z, iCovB.y, iCovB.z);
  mat3 v = mat3(viewMatrix);
  mat3 sv = v * sw * transpose(v);
  float fx = projectionMatrix[0][0] * uViewport.x * 0.5;
  float fy = projectionMatrix[1][1] * uViewport.y * 0.5;
  // The projection's Jacobian at the centre, view space to drawing-buffer px.
  mat3 j = mat3(fx / d, 0.0, 0.0, 0.0, fy / d, 0.0, fx * view.x / (d * d), fy * view.y / (d * d), 0.0);
  mat3 ss = j * sv * transpose(j);
  float floor2 = uMinSigma * uMinSigma;
  float a = ss[0][0] + floor2;
  float b = ss[0][1];
  float c = ss[1][1] + floor2;
  float det = a * c - b * b;
  float mid = 0.5 * (a + c);
  float rad = sqrt(max(0.0, mid * mid - det));
  float l1 = mid + rad;
  float l2 = max(mid - rad, 1e-6);
  vec2 e1 = abs(b) > 1e-9 ? normalize(vec2(b, l1 - a)) : (a >= c ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
  vec2 e2 = vec2(-e1.y, e1.x);
  vec2 offset = position.x * 3.0 * sqrt(l1) * e1 + position.y * 3.0 * sqrt(l2) * e2;
  // At the site's nearest point along the view ray, less the bias, so a lamp
  // never hides itself and a lamp behind a ridge stays hidden; never past the
  // near plane.
  float back = iEnergy.y + uBias;
  vec3 near = view.xyz * max(0.0, 1.0 - back / length(view.xyz));
  vec4 clipNear = projectionMatrix * vec4(near, 1.0);
  vec4 clipCentre = projectionMatrix * view;
  vec2 ndc = clipCentre.xy / clipCentre.w + offset * 2.0 / uViewport;
  gl_Position = vec4(ndc * clipNear.w, clamp(clipNear.z, -clipNear.w, clipNear.w), clipNear.w);
  // The lamp's own FOG_EXP2 transmittance, raised to 2.2: the lamp fades in
  // encoded space, after its sRGB encode, and this fades the halo by the same.
  float tau = exp(-pow(uFogDensity * d, 2.0));
  // Energy in px² of full ink, spread over a Gaussian cut at 3σ (0.98889).
  float amplitude = iEnergy.x * (fx * fy / (d * d)) * pow(tau, 2.2) / (6.2831853 * sqrt(det) * 0.98889);
  vColor = iInk * amplitude;
  vOffset = offset;
  vConic = vec3(c, -b, a) / det;
}
`;

const SPLAT_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying vec2 vOffset;
varying vec3 vConic;
void main() {
  float m = vOffset.x * (vConic.x * vOffset.x + vConic.y * vOffset.y)
    + vOffset.y * (vConic.y * vOffset.x + vConic.z * vOffset.y);
  if (m > 9.0) discard;
  gl_FragColor = vec4(vColor * exp(-0.5 * m), 1.0);
}
`;

const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const COPY_FRAGMENT = /* glsl */ `
uniform sampler2D uSource;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(uSource, vUv); }
`;

const BLUR_FRAGMENT = /* glsl */ `
uniform sampler2D uSource;
uniform vec2 uStep;
uniform float uWeights[${MAX_TAPS}];
varying vec2 vUv;
// TAPS is a define, set when the pixel ratio changes, so the loop has a
// constant bound rather than a uniform one.
void main() {
  vec4 sum = texture2D(uSource, vUv) * uWeights[0];
  for (int i = 1; i <= TAPS; i++) {
    vec2 at = uStep * float(i);
    sum += (texture2D(uSource, vUv + at) + texture2D(uSource, vUv - at)) * uWeights[i];
  }
  gl_FragColor = sum;
}
`;

const COMPOSITE_FRAGMENT = /* glsl */ `
uniform sampler2D uLevel1;
uniform sampler2D uLevel2;
uniform sampler2D uLevel3;
uniform vec3 uWeights;
uniform float uToe;
uniform float uCeiling;
varying vec2 vUv;
void main() {
  vec3 field = uWeights.x * texture2D(uLevel1, vUv).rgb
    + uWeights.y * texture2D(uLevel2, vUv).rgb
    + uWeights.z * texture2D(uLevel3, vUv).rgb;
  float m = max(field.r, max(field.g, field.b));
  float shown = m > uToe ? uCeiling * (1.0 - exp(-(m - uToe) / uCeiling)) : 0.0;
  gl_FragColor = vec4(m > 0.0 ? field * (shown / m) : vec3(0.0), 1.0);
  #include <colorspace_fragment>
}
`;

function fullscreenTriangle(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
  );
  return geometry;
}

function colorTarget(width: number, height: number, options = {}): WebGLRenderTarget {
  return new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: false,
    depthBuffer: false,
    stencilBuffer: false,
    ...options,
  });
}

export class LampHaloPass {
  state: LampHaloState = 'off';
  /** Bytes held by the live targets and the instance buffer, 0 when off. */
  bytes = 0;
  sites = 0;
  dropped = 0;

  private source: WebGLRenderTarget | null = null;
  private levels: [WebGLRenderTarget, WebGLRenderTarget][] = [];
  private width = 0;
  private height = 0;
  private weightsRatio = 0;
  private readonly savedClear = new Color();
  private readonly stepH = new Vector2();
  private readonly stepV = new Vector2();

  private readonly instanceData = new Float32Array(LAMP_HALO.SITE_CAP * STRIDE);
  private readonly instances = new InstancedInterleavedBuffer(this.instanceData, STRIDE);
  private readonly splatGeometry = new InstancedBufferGeometry();
  private readonly splatMaterial = new ShaderMaterial({
    vertexShader: SPLAT_VERTEX,
    fragmentShader: SPLAT_FRAGMENT,
    uniforms: {
      uViewport: { value: new Vector2() },
      uFogDensity: { value: 0 },
      uBias: { value: 0 },
      uMinSigma: { value: LAMP_HALO.MIN_SIGMA_PX },
    },
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    depthTest: true,
    depthFunc: LessEqualDepth,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  private readonly splatScene = new Scene();

  private readonly fullscreen = new Mesh(fullscreenTriangle());
  private readonly fullscreenScene = new Scene();
  private readonly copyMaterial = new ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: COPY_FRAGMENT,
    uniforms: { uSource: { value: null } },
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly blurMaterial = new ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: BLUR_FRAGMENT,
    uniforms: {
      uSource: { value: null },
      uStep: { value: new Vector2() },
      uWeights: { value: new Array<number>(MAX_TAPS).fill(0) },
    },
    defines: { TAPS: 1 },
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly compositeMaterial = new ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: COMPOSITE_FRAGMENT,
    uniforms: {
      uLevel1: { value: null },
      uLevel2: { value: null },
      uLevel3: { value: null },
      uWeights: { value: [...LAMP_HALO.LEVEL_WEIGHTS] },
      uToe: { value: LAMP_HALO.TOE },
      uCeiling: { value: LAMP_HALO.CEILING },
    },
    // Screen, in the encoded space every layer here blends in: the plating
    // stays visible under the halo and no channel passes white.
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcColorFactor,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    // Every sample an own lamp marked (stencil 1) is skipped, so a lamp reads
    // the same with the halo on or off; the composite writes no stencil.
    stencilWrite: true,
    stencilWriteMask: 0x00,
    stencilFunc: NotEqualStencilFunc,
    stencilRef: 1,
    stencilFuncMask: 0xff,
    stencilFail: KeepStencilOp,
    stencilZFail: KeepStencilOp,
    stencilZPass: KeepStencilOp,
  });

  constructor() {
    const quad = new BufferGeometry();
    quad.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)
    );
    quad.setIndex([0, 1, 2, 0, 2, 3]);
    this.splatGeometry.index = quad.index;
    this.splatGeometry.setAttribute('position', quad.getAttribute('position'));
    this.instances.setUsage(DynamicDrawUsage);
    this.splatGeometry.setAttribute(
      'iCenter',
      new InterleavedBufferAttribute(this.instances, 3, 0)
    );
    this.splatGeometry.setAttribute('iCovA', new InterleavedBufferAttribute(this.instances, 3, 3));
    this.splatGeometry.setAttribute('iCovB', new InterleavedBufferAttribute(this.instances, 3, 6));
    this.splatGeometry.setAttribute('iInk', new InterleavedBufferAttribute(this.instances, 3, 9));
    this.splatGeometry.setAttribute(
      'iEnergy',
      new InterleavedBufferAttribute(this.instances, 2, 12)
    );
    this.splatGeometry.instanceCount = 0;
    const splats = new Mesh(this.splatGeometry, this.splatMaterial);
    splats.frustumCulled = false;
    this.splatScene.add(splats);
    this.splatScene.matrixWorldAutoUpdate = false;
    this.fullscreen.frustumCulled = false;
    this.fullscreenScene.add(this.fullscreen);
    this.fullscreenScene.matrixWorldAutoUpdate = false;
  }

  /**
   * Turn the halo on for this renderer, after its capability check: a
   * renderable half-float target complete with its depth texture, a canvas
   * stencil, a depth copy that blits without error, and a known clear read
   * back from the half-float target. On a failure the targets go and the
   * state says why; the frame is then the canvas pass alone.
   */
  enable(renderer: WebGLRenderer): boolean {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    this.allocate(gl.drawingBufferWidth, gl.drawingBufferHeight);
    const reason = this.check(renderer, gl);
    if (reason !== null) {
      this.disable();
      this.state = `unavailable: ${reason}`;
      return false;
    }
    this.state = 'idle';
    return true;
  }

  disable(): void {
    this.source?.depthTexture?.dispose();
    this.source?.dispose();
    for (const [a, b] of this.levels) {
      a.dispose();
      b.dispose();
    }
    this.source = null;
    this.levels = [];
    this.width = 0;
    this.height = 0;
    this.bytes = 0;
    this.sites = 0;
    this.dropped = 0;
    this.state = 'off';
  }

  get on(): boolean {
    return this.source !== null;
  }

  /**
   * Draw the halo for this frame's splats, after the canvas render. Returns
   * the passes it ran; none when no site is drawn.
   */
  render(
    renderer: WebGLRenderer,
    camera: Camera,
    splats: readonly HaloSplat[],
    dropped: number,
    fogDensity: number,
    pixelRatio: number,
    biasM: number
  ): string[] {
    if (this.source === null) return [];
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (gl.drawingBufferWidth !== this.width || gl.drawingBufferHeight !== this.height) {
      this.allocate(gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    this.dropped = dropped;
    this.sites = splats.length;
    if (splats.length === 0) {
      this.state = 'idle';
      return [];
    }
    this.state = 'drawn';
    this.pack(splats);
    this.setBlur(pixelRatio);
    const source = this.source!;

    const autoClear = renderer.autoClear;
    const clearColor = renderer.getClearColor(this.savedClear);
    const clearAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
    try {
      renderer.setRenderTarget(source);
      renderer.clear(true, false, false);
      this.copyDepth(renderer, gl, source);

      const splatUniforms = this.splatMaterial.uniforms;
      (splatUniforms.uViewport!.value as Vector2).set(this.width, this.height);
      splatUniforms.uFogDensity!.value = fogDensity;
      splatUniforms.uBias!.value = biasM;
      renderer.render(this.splatScene, camera);

      let from: Texture = source.texture;
      for (const [a, b] of this.levels) {
        this.draw(renderer, camera, this.copyMaterial, a, { uSource: from });
        this.draw(renderer, camera, this.blurMaterial, b, {
          uSource: a.texture,
          uStep: this.stepH.set(1 / a.width, 0),
        });
        this.draw(renderer, camera, this.blurMaterial, a, {
          uSource: b.texture,
          uStep: this.stepV.set(0, 1 / a.height),
        });
        from = a.texture;
      }
      this.draw(renderer, camera, this.compositeMaterial, null, {
        uLevel1: this.levels[0]![0].texture,
        uLevel2: this.levels[1]![0].texture,
        uLevel3: this.levels[2]![0].texture,
      });
    } finally {
      renderer.setRenderTarget(null);
      renderer.autoClear = autoClear;
      renderer.setClearColor(clearColor, clearAlpha);
    }
    return ['depth-copy', 'halo-source', 'halo-spread', 'halo-composite'];
  }

  dispose(): void {
    this.disable();
    this.splatGeometry.dispose();
    this.splatMaterial.dispose();
    this.fullscreen.geometry.dispose();
    this.copyMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
  }

  private allocate(width: number, height: number): void {
    this.source?.depthTexture?.dispose();
    this.source?.dispose();
    for (const [a, b] of this.levels) {
      a.dispose();
      b.dispose();
    }
    const depthTexture = new DepthTexture(width, height, UnsignedInt248Type);
    depthTexture.format = DepthStencilFormat;
    this.source = colorTarget(width, height, {
      depthBuffer: true,
      stencilBuffer: true,
      depthTexture,
    });
    this.levels = [2, 4, 8].map((d) => {
      const w = Math.ceil(width / d);
      const h = Math.ceil(height / d);
      return [colorTarget(w, h), colorTarget(w, h)] as [WebGLRenderTarget, WebGLRenderTarget];
    });
    this.width = width;
    this.height = height;
    this.bytes =
      width * height * 8 +
      width * height * 4 +
      this.levels.reduce((sum, [a, b]) => sum + (a.width * a.height + b.width * b.height) * 8, 0) +
      INSTANCE_BYTES;
  }

  /** Raw GL around three's cache: a FRAMEBUFFER bind never updates its READ
   * entry, so READ is bound by hand and FRAMEBUFFER rebound after. */
  private copyDepth(
    renderer: WebGLRenderer,
    gl: WebGL2RenderingContext,
    source: WebGLRenderTarget
  ): void {
    const framebuffer = (
      renderer.properties.get(source) as { __webglFramebuffer: WebGLFramebuffer }
    ).__webglFramebuffer;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffer);
    gl.blitFramebuffer(
      0,
      0,
      this.width,
      this.height,
      0,
      0,
      this.width,
      this.height,
      gl.DEPTH_BUFFER_BIT,
      gl.NEAREST
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  }

  private check(renderer: WebGLRenderer, gl: WebGL2RenderingContext): string | null {
    if (!renderer.extensions.has('EXT_color_buffer_float')) return 'no EXT_color_buffer_float';
    renderer.setRenderTarget(null);
    if ((gl.getParameter(gl.STENCIL_BITS) as number) < 8) return 'no canvas stencil';
    const source = this.source!;
    renderer.initRenderTarget(source);
    renderer.setRenderTarget(source);
    try {
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        return 'the half-float target is incomplete';
      }
      gl.getError();
      this.copyDepth(renderer, gl, source);
      if (gl.getError() !== gl.NO_ERROR) return 'the depth copy failed';
      // Through three's own clear, so its cached clear state stays true.
      const clearColor = renderer.getClearColor(this.savedClear);
      const clearAlpha = renderer.getClearAlpha();
      renderer.setClearColor(new Color(2.5, 1.25, 0.1), 1);
      renderer.clear(true, false, false);
      const read = new Float32Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, read);
      renderer.setClearColor(clearColor, clearAlpha);
      const want = [2.5, 1.25, 0.1, 1];
      if (want.some((v, i) => Math.abs(read[i]! - v) > 0.01))
        return 'the half-float readback was wrong';
    } finally {
      renderer.setRenderTarget(null);
    }
    return null;
  }

  private pack(splats: readonly HaloSplat[]): void {
    const data = this.instanceData;
    splats.forEach((s, i) => {
      const o = i * STRIDE;
      data[o] = s.x;
      data[o + 1] = s.y;
      data[o + 2] = s.z;
      data.set(s.cov, o + 3);
      data[o + 9] = s.ink.r;
      data[o + 10] = s.ink.g;
      data[o + 11] = s.ink.b;
      data[o + 12] = s.energy;
      data[o + 13] = s.nearOffset;
    });
    this.instances.needsUpdate = true;
    this.instances.clearUpdateRanges();
    this.instances.addUpdateRange(0, splats.length * STRIDE);
    this.splatGeometry.instanceCount = splats.length;
  }

  private setBlur(pixelRatio: number): void {
    if (pixelRatio === this.weightsRatio) return;
    const weights = blurWeights(pixelRatio).slice(0, MAX_TAPS);
    const uniform = this.blurMaterial.uniforms.uWeights!.value as number[];
    uniform.fill(0);
    weights.forEach((w, i) => (uniform[i] = w));
    this.blurMaterial.defines.TAPS = weights.length - 1;
    this.blurMaterial.needsUpdate = true;
    this.weightsRatio = pixelRatio;
  }

  private draw(
    renderer: WebGLRenderer,
    camera: Camera,
    material: ShaderMaterial,
    target: WebGLRenderTarget | null,
    uniforms: Record<string, unknown>
  ): void {
    for (const [name, value] of Object.entries(uniforms)) material.uniforms[name]!.value = value;
    this.fullscreen.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.fullscreenScene, camera);
  }
}
