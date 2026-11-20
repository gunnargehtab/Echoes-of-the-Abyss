/**
 * Marine snow in a searchlight, at the High graphics quality
 * (docs/art-direction.md, "Snow in a beam"; #1855).
 *
 * The snow the water draws is its coarse flakes, in the water's own colour
 * and on the canvas at both qualities (water.ts `MarineSnow`). Under them the
 * water is full of finer matter that the Lid's glow is too faint to show. An
 * own hull's beam is not: where one crosses the water the fine snow shows by
 * the beam's light, in the navy's glow, and the cone reads as water with
 * something in it and not as a wedge of haze.
 *
 * The snow is one lattice, fixed in the world. A beam draws the copy of each
 * mote nearest a point a little way down its axis, so a beam that turns or a
 * hull that runs sweeps over motes that hold still, which is the parallax
 * that reads as a medium (water.ts). Every beam reads the one lattice, so a
 * mote in two cones is the same mote drawn twice, and takes both lights.
 *
 * It sinks, at the snow's own rate, and only sinks: a drift would state a
 * current (water.ts, "It sinks, and it only sinks"). Reduced motion holds the
 * sink, so the motes stand where they are and the beam still crosses them.
 *
 * One instanced `Points` in the world pass (highFrame.ts), an instance a
 * beam: scene-referred, so the water takes a mote's light with distance, the
 * bloom spreads the brightest and the grade and the curve reach it. The light
 * on a mote is read at its centre, in the vertex shader, and a mote in no
 * beam is sent off the clip volume: a frame costs its lit motes' pixels.
 *
 * The limits hold as they hold for the beam. A mote reads the searchlights'
 * own uniforms (searchlights.ts), so the only light on it is an own hull's
 * (limit 2), in the navy's glow (limit 3), at the strength the hull's SIG
 * gives its beam: a hull on Silent Running throws none and shows no mote
 * (limit 5). The ground and a hull shadow a mote as they shadow the cone.
 * Where a mote stands is a fixed table and the sink, and answers nothing.
 *
 * TUNABLE until a frame of this step is accepted: `HIGH_GRAPHICS.MOTES` in
 * packages/shared/src/constants.ts.
 */

import {
  BufferAttribute,
  CustomBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  OneFactor,
  Points,
  PointsMaterial,
  ZeroFactor,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { SEARCHLIGHT_GLSL, SEARCHLIGHT_UNIFORMS } from './searchlights.ts';
import { SNOW_SINK_WORLD_PER_S } from './water.ts';

const SPEC = HIGH_GRAPHICS.MOTES;
const BEAMS = HIGH_GRAPHICS.SEARCHLIGHT.MAX;

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/** The anchors the patch needs of three's points program, vertex then fragment. */
export const BEAM_MOTE_ANCHORS = {
  vertex: ['#include <common>', '#include <begin_vertex>', 'gl_PointSize = size;'],
  fragment: ['#include <common>', '#include <color_fragment>'],
} as const;

type Point = { x: number; y: number; z: number };

const wrap = (v: number): number => {
  const half = SPEC.CELL_M / 2;
  return ((((v + half) % SPEC.CELL_M) + SPEC.CELL_M) % SPEC.CELL_M) - half;
};

/**
 * Where a beam draws a mote: the shader's own wrap, for the tests that hold
 * the lattice still. `cell` is the mote's place in the unit cell, `sunkM` how
 * far the snow has sunk, and `lamp` and `aim` the beam's. The copy of the
 * mote nearest the point `AHEAD_M` down the beam's axis.
 */
export function moteAt(cell: Point, sunkM: number, lamp: Point, aim: Point): Point {
  const centre = {
    x: lamp.x + aim.x * SPEC.AHEAD_M,
    y: lamp.y + aim.y * SPEC.AHEAD_M,
    z: lamp.z + aim.z * SPEC.AHEAD_M,
  };
  return {
    x: centre.x + wrap(cell.x * SPEC.CELL_M - centre.x),
    y: centre.y + wrap(cell.y * SPEC.CELL_M - sunkM - centre.y),
    z: centre.z + wrap(cell.z * SPEC.CELL_M - centre.z),
  };
}

/** The points program as snow in a beam. Exported for the test that holds the anchors. */
export function patchBeamMotes(shader: { vertexShader: string; fragmentShader: string }): void {
  const [vCommon, vBegin, vSize] = BEAM_MOTE_ANCHORS.vertex;
  const [fCommon, fColor] = BEAM_MOTE_ANCHORS.fragment;
  const half = glsl(SPEC.CELL_M / 2);
  const cell = glsl(SPEC.CELL_M);
  shader.vertexShader = shader.vertexShader
    .replace(
      vCommon,
      [
        vCommon,
        // The beam this instance draws the lattice for.
        'attribute float aMoteBeam;',
        // 0 to 1, a mote's own: its width, and with it how much it sends on.
        'attribute float aMote;',
        'uniform float uMoteSinkM;',
        'varying vec3 vMoteLight;',
        'int moteBeam;',
        'vec3 moteOff;',
        SEARCHLIGHT_GLSL,
      ].join('\n')
    )
    .replace(
      vBegin,
      [
        vBegin,
        'moteBeam = int( aMoteBeam + 0.5 );',
        `vec3 moteCentre = uSearchAt[ moteBeam ].xyz + uSearchAim[ moteBeam ].xyz * ${glsl(SPEC.AHEAD_M)};`,
        // The lattice is the world's: `position` is a place in its unit cell,
        // and the copy drawn is the one nearest the beam's centre. Between
        // wraps a mote holds still while the beam moves over it.
        `vec3 moteCell = position * ${cell};`,
        'moteCell.y -= uMoteSinkM;',
        `moteOff = mod( moteCell - moteCentre + ${half}, ${cell} ) - ${half};`,
        'transformed = moteCentre + moteOff;',
      ].join('\n')
    )
    .replace(
      vSize,
      [
        // A width in the world's metres as pixels at this depth, never under
        // the floor: a mote that would draw narrower is drawn at the floor
        // with its light cut by the area it gained (lifeGlow.ts has the same
        // three lines), so a far cone fades and does not turn to noise.
        `float moteM = mix( ${glsl(SPEC.SIZE_M[0])}, ${glsl(SPEC.SIZE_M[1])}, aMote );`,
        'float motePx = moteM * projectionMatrix[ 1 ][ 1 ] * scale * size / max( 1e-3, - mvPosition.z );',
        `gl_PointSize = max( motePx, ${glsl(SPEC.MIN_PX)} * size );`,
        'float moteShare = ( motePx * motePx ) / ( gl_PointSize * gl_PointSize );',
        // Whole about the beam's centre and gone before the cell's faces, so
        // no mote is lit where it wraps.
        `float moteNear = 1.0 - smoothstep( ${glsl(SPEC.FADE_M[0])}, ${glsl(SPEC.FADE_M[1])}, length( moteOff ) );`,
        // The object stands at the origin, so `transformed` is the world's.
        'vec3 moteToLamp;',
        'vec3 moteBeamLight = echoesSearchBeam( moteBeam, transformed, moteToLamp ) * moteNear;',
        'if ( moteBeamLight.r + moteBeamLight.g + moteBeamLight.b > 0.0 ) {',
        // The beam's light at the mote, less what the ground and a hull hide
        // of it, and the share a mote this size sends on: the coarsest the
        // whole albedo, the finest `FINE_SHARE` of it.
        `  vMoteLight = moteBeamLight * ( echoesSearchShadeCoarse( moteBeam, transformed ) * moteShare * ${glsl(SPEC.ALBEDO)} * mix( ${glsl(SPEC.FINE_SHARE)}, 1.0, aMote ) );`,
        '} else {',
        // In no beam: off the clip volume, and no fragment is paid for it.
        '  vMoteLight = vec3( 0.0 );',
        '  gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );',
        '}',
      ].join('\n')
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(fCommon, `${fCommon}\nvarying vec3 vMoteLight;`)
    .replace(
      fColor,
      [
        fColor,
        // A mote is a soft disc, not the square a mapless point rasterises as.
        'float moteR = length( gl_PointCoord - 0.5 ) * 2.0;',
        'if ( moteR > 1.0 ) discard;',
        'float moteFall = 1.0 - moteR * moteR;',
        'diffuseColor.rgb = vMoteLight * moteFall * moteFall;',
      ].join('\n')
    );
}

export class BeamMotes {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly geometry = new InstancedBufferGeometry();
  private readonly uniforms = { uMoteSinkM: { value: 0 } };
  private reducedMotion = false;
  private lastTickAt: number | null = null;

  constructor() {
    const positions = new Float32Array(SPEC.COUNT * 3);
    const motes = new Float32Array(SPEC.COUNT);
    // A fixed generator, as the snow's is (water.ts): the lattice is the same
    // on every client and in every capture.
    let seed = 0x2545f491;
    const next = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    for (let i = 0; i < SPEC.COUNT; i++) {
      positions[i * 3] = next();
      positions[i * 3 + 1] = next();
      positions[i * 3 + 2] = next();
      // Squared: most of the snow is fine, and a few flakes are not.
      const size = next();
      motes[i] = size * size;
    }
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setAttribute('aMote', new BufferAttribute(motes, 1));
    this.geometry.setAttribute(
      'aMoteBeam',
      new InstancedBufferAttribute(
        Float32Array.from({ length: BEAMS }, (_, i) => i),
        1
      )
    );
    this.geometry.instanceCount = 0;

    this.material = new PointsMaterial({
      color: 0xffffff,
      // The patch sizes a mote in metres (`patchBeamMotes`): 1 leaves the
      // `size` uniform the pixel ratio alone, and three attenuates nothing.
      size: 1,
      sizeAttenuation: false,
      toneMapped: false,
      // Scattered light adds to light, and leaves alpha alone: in the world
      // pass alpha is what the water left of the surface behind (water.ts).
      transparent: true,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendSrcAlpha: ZeroFactor,
      blendDstAlpha: OneFactor,
      depthWrite: false,
      // In the fog chunk, for its High half: the water takes the light a mote
      // sends with distance (water.ts `installWaterFog`).
      fog: true,
    });
    const uniforms = this.uniforms;
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, SEARCHLIGHT_UNIFORMS);
      patchBeamMotes(shader);
    };
    this.material.customProgramCacheKey = () => 'beam-motes-1';
    this.points = new Points(this.geometry, this.material);
    this.points.name = 'beam_motes';
    // The shader places every mote, so the object's own bounds say nothing.
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /**
   * Per frame under High, after the frame's beams are aimed
   * (searchlights.ts `setSearchlights`): how many there are, and the clock.
   * No beam draws nothing. Two uniform writes and no buffer.
   */
  update(nowMs: number, beams: number): void {
    if (this.lastTickAt !== null && !this.reducedMotion) {
      // Clamped as the snow's is, so a hidden tab does not drop the lattice
      // a cell, and wrapped so the uniform keeps a float's precision.
      const dt = Math.min(0.25, Math.max(0, (nowMs - this.lastTickAt) / 1000));
      this.uniforms.uMoteSinkM.value =
        (this.uniforms.uMoteSinkM.value + dt * SNOW_SINK_WORLD_PER_S) % SPEC.CELL_M;
    }
    this.lastTickAt = nowMs;
    this.geometry.instanceCount = Math.min(Math.max(0, beams), BEAMS);
    this.points.visible = this.geometry.instanceCount > 0;
  }

  /** Draw nothing: the view has left the High quality, and no beam is aimed. */
  hide(): void {
    this.geometry.instanceCount = 0;
    this.points.visible = false;
  }

  /** Reduced motion (docs/ui-ux.md §11) holds the sink and keeps the motes. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /** Motes this frame hands the GPU, for the probe and the tests: a cell a beam. */
  get motes(): number {
    return this.points.visible ? this.geometry.instanceCount * SPEC.COUNT : 0;
  }

  /** How far the lattice has sunk, metres, for the tests. */
  get sunkM(): number {
    return this.uniforms.uMoteSinkM.value;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
