/**
 * The hold a ground shadow carries at the High graphics quality
 * (docs/art-direction.md, "What is built at High": "A ground shadow carries a
 * hold"; decided by the owner in session on 13 November 2026, #1801).
 *
 * A hull's height above its own shadow is its depth (the same doc, "Depth is
 * drawn, not implied"), and the shadow is the one dark mark the conn view
 * draws. The lit ground's relief is dark too: a dune's trough stood as dark
 * as a shadow, and a shadow lying across one could not be told from it
 * (docs/screenshots/issue-1801/README.md). So a shadow carries its own level
 * ground, as a mark carries its plate: under it, and a margin round it, the
 * lit ground takes the Lid's glow as ground with no silt relief does.
 *
 * It is drawn in plan, since the relief is the ground's and not the
 * screen's: one small target over the map, a disc a shadow, the greater kept
 * where two cross. The lit ground reads it by the `uv` it reads its pools by
 * (litGround.ts). No camera is in it. A disc's corner is placed straight
 * into the target from its plan metres, so nothing here turns with the view
 * (docs/graphics-standards.md gate 8), and a ridge between the eye and a
 * shadow hides nothing of the hold.
 *
 * It is the mark's, not the map's: it stands where the view draws an own
 * entity's shadow and nowhere else, and a contact has no shadow to carry one
 * (limit 2).
 */

import {
  CustomBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  MaxEquation,
  Mesh,
  OneFactor,
  OrthographicCamera,
  PlaneGeometry,
  RedFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';

/** Floats a shadow is, as the pass takes it: plan x, plan z, drawn radius. */
export const HOLD_STRIDE = 3;

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/**
 * A quad a shadow, out to the hold's reach, set into the target by its plan
 * metres alone: x east across the target, z south up it, so a texel's place
 * is the lit ground's own `uv`.
 */
export const HOLD_VERTEX = [
  'attribute vec3 aShadow;',
  'uniform vec2 uMapM;',
  'varying vec2 vRadii;',
  'void main() {',
  `  vRadii = position.xy * ${glsl(HIGH_GRAPHICS.GROUND.SHADOW_HOLD.REACH)};`,
  '  vec2 plan = aShadow.xy + vRadii * aShadow.z;',
  '  gl_Position = vec4( plan / uMapM * 2.0 - 1.0, 0.0, 1.0 );',
  '}',
].join('\n');

/** Whole out to `FULL` shadow radii, gone by `REACH`. */
export const HOLD_FRAGMENT = [
  'varying vec2 vRadii;',
  'void main() {',
  `  float hold = 1.0 - smoothstep( ${glsl(HIGH_GRAPHICS.GROUND.SHADOW_HOLD.FULL)}, ${glsl(HIGH_GRAPHICS.GROUND.SHADOW_HOLD.REACH)}, length( vRadii ) );`,
  '  gl_FragColor = vec4( hold, 0.0, 0.0, 1.0 );',
  '}',
].join('\n');

export class ShadowHold {
  private target: WebGLRenderTarget | null = null;
  private width = 0;
  private height = 0;
  private shadows: Float32Array = new Float32Array(0);
  private live = 0;
  private attribute = new InstancedBufferAttribute(new Float32Array(HOLD_STRIDE), HOLD_STRIDE);
  private readonly geometry = new InstancedBufferGeometry();
  private readonly uniforms = { uMapM: { value: new Vector2(1, 1) } };
  private readonly material = new ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: HOLD_VERTEX,
    fragmentShader: HOLD_FRAGMENT,
    // The greater of two holds stands where shadows cross.
    blending: CustomBlending,
    blendEquation: MaxEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    depthTest: false,
    depthWrite: false,
  });
  private readonly mesh: Mesh;
  private readonly scene = new Scene();
  /** Read by nothing: the vertex stage places a disc by its plan metres. */
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor() {
    const quad = new PlaneGeometry(2, 2);
    this.geometry.setIndex(quad.getIndex());
    this.geometry.setAttribute('position', quad.getAttribute('position'));
    this.geometry.setAttribute('aShadow', this.attribute);
    this.geometry.instanceCount = 0;
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  /**
   * The ground the holds lie on: its size in metres and the target's in
   * texels. A size of 0 is no ground, and nothing is drawn.
   */
  setGround(widthM: number, heightM: number, width: number, height: number): void {
    this.uniforms.uMapM.value.set(Math.max(1, widthM), Math.max(1, heightM));
    if (width !== this.width || height !== this.height) this.release();
    this.width = width;
    this.height = height;
  }

  /**
   * This frame's shadows, `HOLD_STRIDE` floats each (depthCues.ts
   * `packShadows`). A radius of 0 is a slot nothing holds, and draws nothing.
   */
  setShadows(shadows: Float32Array): void {
    this.shadows = shadows;
    this.live = 0;
    for (let i = 2; i < shadows.length; i += HOLD_STRIDE) if (shadows[i]! > 0) this.live++;
  }

  /** Shadows that carry a hold this frame. */
  get count(): number {
    return this.live;
  }

  /** Whether the pass draws: a ground to lie on, and a shadow on it. */
  get drawn(): boolean {
    return this.live > 0 && this.width > 0 && this.height > 0;
  }

  /** Bytes the target holds: one a texel (gate 6's ledger). */
  get bytes(): number {
    return this.target === null ? 0 : this.target.width * this.target.height;
  }

  /** Draw the holds and hand back the plan texture the lit ground reads. */
  render(renderer: WebGLRenderer): Texture {
    const target = this.sized();
    const slots = this.shadows.length / HOLD_STRIDE;
    if (this.attribute.count < slots) {
      // Doubled, as the cues' own buffers grow: rare, and never per frame.
      this.attribute = new InstancedBufferAttribute(
        new Float32Array(Math.max(slots, this.attribute.count * 2) * HOLD_STRIDE),
        HOLD_STRIDE
      );
      this.geometry.setAttribute('aShadow', this.attribute);
    }
    (this.attribute.array as Float32Array).set(this.shadows);
    this.attribute.needsUpdate = true;
    this.geometry.instanceCount = slots;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.render(this.scene, this.camera);
    return target.texture;
  }

  /** Let the target go; the ground and the shadows are kept. */
  release(): void {
    this.target?.dispose();
    this.target = null;
  }

  dispose(): void {
    this.release();
    this.geometry.dispose();
    this.material.dispose();
  }

  private sized(): WebGLRenderTarget {
    if (this.target !== null) return this.target;
    const target = new WebGLRenderTarget(this.width, this.height, {
      format: RedFormat,
      type: UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: false,
    });
    target.texture.name = 'high-hold';
    this.target = target;
    return target;
  }
}
