/**
 * The chromatic split — docs/art-direction.md, "Atmosphere rides on top";
 * gate 6's allocation in docs/graphics-standards.md, "Chromatic split". Drawn
 * after the canvas render and the lamp halo, inside the same GPU-timer
 * bracket, with no composer and no second camera:
 *
 * 1. Copy: one blit of the canvas colour, its samples resolved, into an 8-bit
 *    target the size of the drawing buffer. The canvas is already tone-mapped
 *    and encoded, so nothing in the canvas pass moves: a composer would have
 *    undone both (packages/frontend/CLAUDE.md).
 * 2. Split: one full-screen draw onto the canvas, reading the copy as two
 *    images, a magenta one pushed out from the frame's centre and a cyan one
 *    pulled in, at most SEPARATION_PX apart at the corners.
 *
 * The copy holds encoded values and is sampled as they are: no colour-space
 * chunk in the draw, so they go back onto the canvas unchanged.
 */
import {
  BufferAttribute,
  BufferGeometry,
  LinearFilter,
  Mesh,
  NoBlending,
  RGBAFormat,
  RGBFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type WebGLRenderer,
} from 'three';

export const CHROMATIC_SPLIT = {
  /** The two images' separation at the corners, in drawing-buffer pixels.
   * style-neon-noir.md bounds it at 1, so it may only fall. TUNABLE. */
  SEPARATION_PX: 1,
  /** Where the split starts, as a share of the way to the corners along an
   * ellipse of the frame's aspect: the vignette's clear stop (App.css), so
   * the two edge effects begin together. TUNABLE. */
  INNER: 0.55,
} as const;

/** Bytes a drawing-buffer pixel of the copy holds: RGBA8, the canvas's format
 * in the browser, since three r169 always asks the context for alpha. */
export const SPLIT_BYTES_PER_PX = 4;

/**
 * The separation at drawing-buffer pixel (x, y) of a width × height frame, px:
 * what the draw below computes, for the tests and the doc's figures. Zero
 * inside INNER, rising linearly to SEPARATION_PX at the corners.
 */
export function splitSeparationPx(x: number, y: number, width: number, height: number): number {
  const hx = width / 2;
  const hy = height / 2;
  const share = Math.hypot((x - hx) / hx, (y - hy) / hy) / Math.SQRT2;
  const ramp = Math.min(
    1,
    Math.max(0, (share - CHROMATIC_SPLIT.INNER) / (1 - CHROMATIC_SPLIT.INNER))
  );
  return CHROMATIC_SPLIT.SEPARATION_PX * ramp;
}

/** Why the split is or is not drawing; the probe reports it. */
export type ChromaticSplitState = 'off' | 'on' | `unavailable: ${string}`;

const VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Sampled at gl_FragCoord, so where the offset is zero the read is a texel
// centre and returns the copy exactly. The magenta image is displaced outward
// by reading inward of the pixel, and the cyan the other way.
const FRAGMENT = /* glsl */ `
uniform sampler2D uFrame;
uniform vec2 uSize;
uniform float uInner;
uniform float uHalf;
void main() {
  vec2 centre = 0.5 * uSize;
  vec2 v = gl_FragCoord.xy - centre;
  float share = length(v / centre) * 0.70710678;
  float ramp = clamp((share - uInner) / (1.0 - uInner), 0.0, 1.0);
  if (ramp <= 0.0) discard;
  vec2 d = normalize(v) * (uHalf * ramp) / uSize;
  vec2 uv = gl_FragCoord.xy / uSize;
  vec3 magenta = texture2D(uFrame, uv - d).rgb;
  vec3 cyan = texture2D(uFrame, uv + d).rgb;
  gl_FragColor = vec4(magenta.r, cyan.g, max(magenta.b, cyan.b), 1.0);
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

export class ChromaticSplit {
  state: ChromaticSplitState = 'off';
  /** Bytes the live copy holds, 0 when off. */
  bytes = 0;
  /** Told each step's name as it starts: the GPU timer's split (gpuTimer.ts). */
  marker: ((pass: string) => void) | null = null;

  private copy: WebGLRenderTarget | null = null;
  private width = 0;
  private height = 0;
  private readonly mesh: Mesh;
  private readonly scene = new Scene();
  private readonly material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uFrame: { value: null },
      uSize: { value: new Vector2() },
      uInner: { value: CHROMATIC_SPLIT.INNER },
      uHalf: { value: CHROMATIC_SPLIT.SEPARATION_PX / 2 },
    },
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });

  constructor() {
    this.mesh = new Mesh(fullscreenTriangle(), this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.scene.matrixWorldAutoUpdate = false;
  }

  /**
   * Turn the split on for this renderer, after its check: a copy target
   * complete, and a blit from the canvas into it that raises no error. On a
   * failure the target goes and the state says why; the frame is then drawn
   * without the split.
   */
  enable(renderer: WebGLRenderer): boolean {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    this.allocate(renderer, gl.drawingBufferWidth, gl.drawingBufferHeight);
    const reason = this.check(renderer, gl);
    if (reason !== null) {
      this.disable();
      this.state = `unavailable: ${reason}`;
      return false;
    }
    this.state = 'on';
    return true;
  }

  disable(): void {
    this.copy?.dispose();
    this.copy = null;
    this.width = 0;
    this.height = 0;
    this.bytes = 0;
    this.state = 'off';
  }

  get on(): boolean {
    return this.copy !== null;
  }

  /** Split the canvas as drawn so far. Returns the passes it ran. */
  render(renderer: WebGLRenderer, camera: Camera): string[] {
    if (this.copy === null) return [];
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (gl.drawingBufferWidth !== this.width || gl.drawingBufferHeight !== this.height) {
      this.allocate(renderer, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    const copy = this.copy!;
    // three clears the canvas on render() while autoClear is on, which would
    // erase the frame the draw is splitting.
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    try {
      this.marker?.('split-copy');
      renderer.setRenderTarget(copy);
      this.blit(renderer, gl, copy);
      this.marker?.('split');
      renderer.setRenderTarget(null);
      // The full-screen triangle writes clip space itself: the camera is
      // three's argument, never read (gate 8 allows no second camera).
      renderer.render(this.scene, camera);
    } finally {
      renderer.setRenderTarget(null);
      renderer.autoClear = autoClear;
    }
    return ['split-copy', 'split'];
  }

  dispose(): void {
    this.disable();
    this.mesh.geometry.dispose();
    this.material.dispose();
  }

  private allocate(renderer: WebGLRenderer, width: number, height: number): void {
    this.copy?.dispose();
    const gl = renderer.getContext() as WebGL2RenderingContext;
    // A resolving blit wants the canvas's own format. three r169 asks every
    // context for alpha (WebGLRenderer.js, `contextAttributes`), whatever its
    // `alpha` option says, so the browser's is RGBA8; a context handed in
    // without alpha would be RGB8.
    const alpha = gl.getContextAttributes()?.alpha ?? false;
    this.copy = new WebGLRenderTarget(width, height, {
      format: alpha ? RGBAFormat : RGBFormat,
      type: UnsignedByteType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false,
    });
    const uniforms = this.material.uniforms;
    uniforms.uFrame!.value = this.copy.texture;
    (uniforms.uSize!.value as Vector2).set(width, height);
    this.width = width;
    this.height = height;
    this.bytes = width * height * SPLIT_BYTES_PER_PX;
  }

  /** Raw GL around three's cache, as the halo's depth copy: a FRAMEBUFFER bind
   * never updates its READ entry, so READ is bound by hand and FRAMEBUFFER
   * rebound after. */
  private blit(renderer: WebGLRenderer, gl: WebGL2RenderingContext, copy: WebGLRenderTarget): void {
    const framebuffer = (renderer.properties.get(copy) as { __webglFramebuffer: WebGLFramebuffer })
      .__webglFramebuffer;
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
      gl.COLOR_BUFFER_BIT,
      gl.NEAREST
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  }

  private check(renderer: WebGLRenderer, gl: WebGL2RenderingContext): string | null {
    const copy = this.copy!;
    renderer.initRenderTarget(copy);
    renderer.setRenderTarget(copy);
    try {
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        return 'the copy target is incomplete';
      }
      gl.getError();
      this.blit(renderer, gl, copy);
      if (gl.getError() !== gl.NO_ERROR) return 'the colour copy failed';
    } finally {
      renderer.setRenderTarget(null);
    }
    return null;
  }
}
