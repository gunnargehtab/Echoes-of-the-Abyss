/**
 * A comb jelly as eight seams of light, at the High graphics quality
 * (docs/art-direction.md, "A comb jelly is eight seams of light"; #1858).
 *
 * The deep body of the free-water crater's decorative life: what lives under
 * the Shelf's 400 m line, where the lanterns live over it
 * (docs/free-water-slice.md §5, "Life by depth band"). It is drawn as the
 * lantern is, as light and not as a lit body (jellyLight.ts), and is its
 * opposite in every line a glance takes: an upright egg where the lantern is
 * a wide bell, nothing hung under it, and in a token of its own,
 * `comb-light` (docs/style-neon-noir.md "World light"), so a hue tells depth.
 *
 * Its file marks eight comb rows as dark ridges and emits nothing. At High
 * the skin is a membrane, a faint one: it adds its light to what is behind
 * it, most where the eye looks along it, so the egg reads by its outline.
 * The rows are the light. Each is the same membrane at a higher level, and a
 * line of points of the world pass (lifeGlow.ts) hung along it, so a row a
 * pixel wide from the Close eye is still a seam of beads. With them goes one
 * soft disc for the glow in the water round the body.
 *
 * One thing moves, on the shared match time and for nothing a match does
 * (limit 4): waves of light run down the rows, pole to pole, as a comb
 * jelly's beating plates catch light. `combWave` is written twice, here for
 * the beads and in the membrane's program for the ridges, from the same
 * constants. Reduced motion holds it: every row at its resting level.
 *
 * TUNABLE until a frame of this step is accepted: `HIGH_GRAPHICS.LIFE.COMB`
 * in packages/shared/src/constants.ts.
 */

import {
  Color,
  CustomBlending,
  DoubleSide,
  type Matrix4,
  MeshBasicMaterial,
  OneFactor,
  Vector2,
  Vector3,
  ZeroFactor,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { COMB_LIGHT } from './palette.ts';

const { SKIN, ROWS, HALO, WAVE, STAGGER_S } = HIGH_GRAPHICS.LIFE.COMB;

/** What a comb jelly's membranes read; one object a template, driven by the layer. */
export interface CombUniforms {
  /** Seconds on the match's clock. */
  uCombTime: { value: number };
  /** 1 while the waves run; 0 under reduced motion. */
  uCombMoves: { value: number };
  /** The upper pole's height over the model's origin, metres. */
  uCombTop: { value: number };
}

/** A template's comb uniforms, from where its upper pole stands. */
export function combUniforms(topM: number): CombUniforms {
  return {
    uCombTime: { value: 0 },
    uCombMoves: { value: 1 },
    uCombTop: { value: topM },
  };
}

/** A comb jelly's own clock: the match's, run ahead by its place in the list. */
const clock = (timeS: number, index: number): number => timeS + index * STAGGER_S;

/**
 * What the waves of light add at `alongM` metres under the upper pole, 0 to
 * 1, before their gain: a train of crests `LENGTH_M` apart, each passing a
 * point once a `PERIOD_S`, running down.
 */
export function combWave(alongM: number, timeS: number, index: number, moves: boolean): number {
  if (!moves) return 0;
  const turn = 2 * Math.PI * (alongM / WAVE.LENGTH_M - clock(timeS, index) / WAVE.PERIOD_S);
  return (0.5 + 0.5 * Math.cos(turn)) ** WAVE.SHARP;
}

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/** The anchors the patch needs of three's basic program, vertex then fragment. */
export const COMB_MEMBRANE_ANCHORS = {
  vertex: ['#include <common>', '#include <begin_vertex>', '#include <project_vertex>'],
  fragment: ['#include <common>', '#include <color_fragment>'],
} as const;

const SHARED = [
  'uniform float uCombTime;',
  'uniform float uCombMoves;',
  'uniform float uCombTop;',
  'varying vec3 vCombN;',
  'varying vec3 vCombV;',
  'varying float vCombAlong;',
  'varying float vCombClock;',
].join('\n');

/** The basic program as a comb jelly's membrane. Exported for the test that holds the anchors. */
export function patchCombMembrane(shader: { vertexShader: string; fragmentShader: string }): void {
  const [vCommon, vBegin, vProject] = COMB_MEMBRANE_ANCHORS.vertex;
  const [fCommon, fColor] = COMB_MEMBRANE_ANCHORS.fragment;
  shader.vertexShader = shader.vertexShader
    .replace(vCommon, `${vCommon}\n${SHARED}`)
    .replace(
      vBegin,
      [
        vBegin,
        // The instance is the body's place in its list, as the beads' is.
        `vCombClock = uCombTime + float( gl_InstanceID ) * ${glsl(STAGGER_S)};`,
        'vCombAlong = uCombTop - position.y;',
        'vec3 combN = normal;',
        '#ifdef USE_INSTANCING',
        '  combN = mat3( instanceMatrix ) * combN;',
        '#endif',
        'vCombN = normalMatrix * combN;',
      ].join('\n')
    )
    .replace(vProject, `${vProject}\nvCombV = - mvPosition.xyz;`);
  shader.fragmentShader = shader.fragmentShader
    .replace(fCommon, `${fCommon}\n${SHARED}\nuniform vec2 uCombSkin;\nuniform float uCombGain;`)
    .replace(
      fColor,
      [
        fColor,
        // A thin lit skin, as the lantern's is: both sides drawn, least where
        // the eye looks through it square and most where it looks along it.
        'float combFacing = abs( dot( normalize( vCombN ), normalize( vCombV ) ) );',
        `float combRim = pow( 1.0 - combFacing, ${glsl(SKIN.RIM_POWER)} );`,
        // The waves of light (`combWave`), by metres under the upper pole.
        `float combTurn = 6.2831853 * ( vCombAlong / ${glsl(WAVE.LENGTH_M)} - vCombClock / ${glsl(WAVE.PERIOD_S)} );`,
        `float combCrest = uCombMoves * pow( 0.5 + 0.5 * cos( combTurn ), ${glsl(WAVE.SHARP)} );`,
        // x: a face square to the eye. y: its edge.
        'diffuseColor.rgb *= ( uCombSkin.x + uCombSkin.y * combRim ) * ( 1.0 + uCombGain * combCrest );',
      ].join('\n')
    );
}

/**
 * The membrane a part of a comb jelly's file is drawn as at High: its `skin`,
 * a faint one that reads by its edge and keeps still, or its `rows`, the
 * ridges of its eight comb rows, which are the light and take the waves.
 */
export function combMembrane(part: 'skin' | 'rows', uniforms: CombUniforms): MeshBasicMaterial {
  const skin = part === 'skin' ? new Vector2(SKIN.LEVEL, SKIN.RIM) : new Vector2(ROWS.LEVEL, 0);
  const gain = part === 'skin' ? 0 : WAVE.GAIN;
  const material = new MeshBasicMaterial({
    color: new Color(COMB_LIGHT),
    // Scene-referred light in the world pass, as the lantern's membrane is
    // (jellyLight.ts): it adds to what is behind it and leaves alpha, which
    // there is what the water left of the surface behind.
    toneMapped: false,
    transparent: true,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
    depthWrite: false,
    side: DoubleSide,
    // Light adds in any order, so both sides go in one draw.
    forceSinglePass: true,
    // The water takes it with distance (water.ts `installWaterFog`).
    fog: true,
  });
  material.name = `comb_${part}`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, {
      uCombSkin: { value: skin },
      uCombGain: { value: gain },
    });
    patchCombMembrane(shader);
  };
  material.customProgramCacheKey = () => 'comb-membrane-1';
  // Blended, and still the world pass's (PerspectiveView `enterWorldLayer`).
  material.userData.worldLayer = true;
  return material;
}

/**
 * A comb row's line as the runtime lights it: `ROWS.BEADS` points evenly
 * along the ridge its file marks, upper pole first, in the template's frame.
 *
 * `vertices` are the row node's own, in that frame. The ridge hugs one
 * meridian, so its line is read by height: the vertices are gathered in
 * bands of height, each band's middle is a point of the line, and the beads
 * stand at even steps of length along it, half a step in from each end. A
 * row with under two bands of vertices has no line and takes no bead.
 */
export function combRowLine(vertices: readonly Vector3[]): Vector3[] {
  if (vertices.length === 0) return [];
  let low = Infinity;
  let high = -Infinity;
  for (const v of vertices) {
    low = Math.min(low, v.y);
    high = Math.max(high, v.y);
  }
  const BANDS = ROWS.BEADS * 2;
  const sums = Array.from({ length: BANDS }, () => ({ at: new Vector3(), count: 0 }));
  for (const v of vertices) {
    const band = Math.min(BANDS - 1, Math.floor(((high - v.y) / (high - low || 1)) * BANDS));
    sums[band]!.at.add(v);
    sums[band]!.count++;
  }
  const line = sums.filter((s) => s.count > 0).map((s) => s.at.divideScalar(s.count));
  if (line.length < 2) return [];
  const lengths = [0];
  for (let i = 1; i < line.length; i++) {
    lengths.push(lengths[i - 1]! + line[i]!.distanceTo(line[i - 1]!));
  }
  const total = lengths[lengths.length - 1]!;
  const beads: Vector3[] = [];
  let segment = 1;
  for (let j = 0; j < ROWS.BEADS; j++) {
    const along = ((j + 0.5) / ROWS.BEADS) * total;
    while (segment < line.length - 1 && lengths[segment]! < along) segment++;
    const span = lengths[segment]! - lengths[segment - 1]!;
    const t = span > 0 ? (along - lengths[segment - 1]!) / span : 0;
    beads.push(line[segment - 1]!.clone().lerp(line[segment]!, t));
  }
  return beads;
}

/** Lights one comb jelly carries: the glow round its body, and its rows' beads. */
export function combLightCount(rows: readonly (readonly Vector3[])[]): number {
  return 1 + rows.reduce((sum, row) => sum + row.length, 0);
}

const AT = new Vector3();

/**
 * One comb jelly's points of light, each handed to `light` with its width in
 * metres and its level: the glow in the water round the body, at its
 * mid-height, and the beads of its rows from the upper pole down. `matrix`
 * is the body's own, model to scene, and `topM` its upper pole's height over
 * its origin.
 */
export function writeCombLights(
  rows: readonly (readonly Vector3[])[],
  topM: number,
  matrix: Matrix4,
  index: number,
  timeS: number,
  moves: boolean,
  light: (at: Vector3, sizeM: number, level: number) => void
): void {
  light(AT.set(0, topM / 2, 0).applyMatrix4(matrix), HALO.SIZE_M, HALO.LEVEL);
  for (const row of rows) {
    for (const bead of row) {
      const crest = combWave(topM - bead.y, timeS, index, moves);
      light(AT.copy(bead).applyMatrix4(matrix), ROWS.SIZE_M, ROWS.BEAD * (1 + WAVE.GAIN * crest));
    }
  }
}
