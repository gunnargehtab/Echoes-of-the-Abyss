/**
 * The light a decorative body carries of its own, at the High graphics
 * quality (docs/art-direction.md, "Life in the world's light"; #1837).
 *
 * The law gives the world layer "the modelled bodies of public life with
 * their light", each source "in its own token" (limits 3 and 4). A fry of the
 * crater's schools carries one point of it on its flank, in `fry-glint`
 * (docs/style-neon-noir.md "World light"), so a school in unlit water reads as
 * a drift of faint lights and not as holes in it.
 *
 * It is world light, not a mark, and it is drawn where world light is: one
 * `Points` in the world pass (highFrame.ts), scene-referred, so the water
 * takes it with distance, the bloom spreads it and the grade and the curve
 * reach it. Nothing draws it at Low, and nothing of it is on the canvas at
 * either quality: rung 5's stipple is another thing, in another colour, and
 * is still the tactical layer's (faunaStipple.ts).
 *
 * World-owned, so it tells nothing (limit 4): a light stands where its body
 * swims, on the fixture's authored loop and the shared match time
 * (freeWaterDecoration.ts), at one level for every body and every client. It
 * never brightens, scatters or gathers for a hull, a shot or the camera.
 *
 * A point is a soft disc `SIZE_M` across, and never narrower than `MIN_PX`
 * on the screen: a far light that would draw under a pixel is drawn at the
 * floor with its level cut by the area it gained, so a school a kilometre off
 * fades instead of turning into a cloud of full-bright pixels.
 *
 * TUNABLE until a frame of this step is accepted: `HIGH_GRAPHICS.LIFE.GLOW`
 * in packages/shared/src/constants.ts.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  DynamicDrawUsage,
  OneFactor,
  Points,
  PointsMaterial,
  ZeroFactor,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { FRY_GLINT } from './palette.ts';

const { LEVEL, SIZE_M, MIN_PX, LIFT_M } = HIGH_GRAPHICS.LIFE.GLOW;

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/** The anchors the patch needs of three's points program, vertex then fragment. */
export const LIFE_GLOW_ANCHORS = {
  vertex: ['#include <common>', '#include <project_vertex>', 'gl_PointSize = size;'],
  fragment: ['#include <common>', '#include <color_fragment>'],
} as const;

/** The points program as a light of a size in metres. Exported for the test that holds the anchors. */
export function patchLifeGlow(shader: { vertexShader: string; fragmentShader: string }): void {
  const [vCommon, vProject, vSize] = LIFE_GLOW_ANCHORS.vertex;
  const [fCommon, fColor] = LIFE_GLOW_ANCHORS.fragment;
  shader.vertexShader = shader.vertexShader
    .replace(vCommon, `${vCommon}\nvarying float vGlowLevel;`)
    .replace(
      vProject,
      // A light stands on its body's axis, inside the body: drawn there, the
      // body's own near flank would cut the disc in two. It is drawn `LIFT_M`
      // nearer the eye along its own sight line, which moves it nowhere on
      // the screen and clear of a body that thin.
      [
        vProject,
        `mvPosition.xyz *= max( 0.0, 1.0 - ${glsl(LIFT_M)} / max( 1e-3, length( mvPosition.xyz ) ) );`,
        'gl_Position = projectionMatrix * mvPosition;',
      ].join('\n')
    )
    .replace(
      vSize,
      // `scale` is half the view's height and `size` the material's own 1
      // times the pixel ratio, so their product is half the drawn height in
      // pixels; the projection's second diagonal is the cotangent of half the
      // field of view. Together: a length in the world's metres as pixels at
      // this depth. three's own attenuation leaves the field of view out, so
      // the material asks for none and this line is the whole of the size.
      [
        `float glowPx = ${glsl(SIZE_M)} * projectionMatrix[ 1 ][ 1 ] * scale * size / max( 1e-3, - mvPosition.z );`,
        `gl_PointSize = max( glowPx, ${glsl(MIN_PX)} * size );`,
        'vGlowLevel = ( glowPx * glowPx ) / ( gl_PointSize * gl_PointSize );',
      ].join('\n')
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(fCommon, `${fCommon}\nvarying float vGlowLevel;`)
    .replace(
      fColor,
      [
        fColor,
        // A soft disc, not the square a mapless point rasterises as.
        'float glowR = length( gl_PointCoord - 0.5 ) * 2.0;',
        'if ( glowR > 1.0 ) discard;',
        'float glowFall = 1.0 - glowR * glowR;',
        'diffuseColor.rgb *= glowFall * glowFall * vGlowLevel;',
      ].join('\n')
    );
}

export class LifeGlow {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private capacity = 0;
  private drawn = 0;

  constructor() {
    this.material = new PointsMaterial({
      color: new Color(FRY_GLINT).multiplyScalar(LEVEL),
      // The patch sizes a point in metres (`patchLifeGlow`): 1 leaves the
      // `size` uniform the pixel ratio alone, and three attenuates nothing.
      size: 1,
      sizeAttenuation: false,
      toneMapped: false,
      // Light adds to light, and leaves alpha alone: in the world pass alpha
      // is what the water left of the surface behind (water.ts).
      transparent: true,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendSrcAlpha: ZeroFactor,
      blendDstAlpha: OneFactor,
      depthWrite: false,
      // In the fog chunk, for its High half: the water takes a light with
      // distance and gives none back (water.ts `installWaterFog`).
      fog: true,
    });
    this.material.onBeforeCompile = (shader) => patchLifeGlow(shader);
    this.material.customProgramCacheKey = () => 'life-glow-1';
    this.points = new Points(new BufferGeometry(), this.material);
    this.points.name = 'life_glow';
    // The world pass's, and never the canvas's (PerspectiveView `enterWorldLayer`).
    this.points.userData.worldLayer = true;
    // One cloud spans the map: per-object culling would hide it whole.
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /**
   * Stand `count` lights where `fill` writes them, three floats a light, in
   * the scene's metres. Called each frame the bodies move; the buffer is
   * kept, and grown only when a rebuild stands more bodies.
   */
  write(count: number, fill: (positions: Float32Array) => void): void {
    if (count > this.capacity) {
      this.points.geometry.dispose();
      const geometry = new BufferGeometry();
      const attribute = new BufferAttribute(new Float32Array(count * 3), 3);
      attribute.setUsage(DynamicDrawUsage);
      geometry.setAttribute('position', attribute);
      this.points.geometry = geometry;
      this.capacity = count;
    }
    this.drawn = count;
    this.points.visible = count > 0;
    if (count === 0) return;
    const attribute = this.points.geometry.getAttribute('position') as BufferAttribute;
    fill(attribute.array as Float32Array);
    attribute.needsUpdate = true;
    this.points.geometry.setDrawRange(0, count);
  }

  /** Lights standing, for the probe and the tests. */
  get count(): number {
    return this.drawn;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
