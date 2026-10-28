/**
 * The arch study's light and motion, as shader patches on the landmark's own
 * materials — docs/sorrowgate-arch-study.md §8; docs/style-neon-noir.md "The
 * arch study's licence"; docs/habitats-art-brief.md §5 "The arch study's
 * licence"; docs/graphics-standards.md gate 6's study line (#1637).
 *
 * Four things, each a few instructions on the landmark's own fragments or
 * vertices and never a draw call, a scene light or a render target:
 *
 * - **Lamp levels.** The four lamps are one merged glass part, so each lamp's
 *   guttering reaches the shader as a per-vertex lamp index and a uniform of
 *   four levels (`lampLevels`): steady at 1, dipped to 0.6, never above 1,
 *   stepped on the 5 Hz sonar bucket as every world light is (rule 3).
 * - **Lamp pools.** Rule 1's one exception: each lamp lights the arch's own
 *   masonry, ribs and sediment within 20 m, falling to nothing at 20 m, so no
 *   two pools meet. The patch is installed on the landmark's three stone
 *   materials and nothing else, so nothing else can take the light: not the
 *   seabed, a scattered prop, a hull, the water or the snow. No shadow, no
 *   halo. The pool steps with its lamp.
 * - **The hung fittings' sway.** Six fittings pivot at their tops, each on its
 *   own axis and period, the axes spread over 150° (the licence asks at least
 *   120°) so the set states no current, at most 1.5 m at the free end.
 *   Per-vertex weight, as the kelp's.
 * - **The collapse's debris.** The ruined state's twelve fall pieces start the
 *   height the model records above their rest and come down the wall's face
 *   over at most 4 s, staggered, on one uniform.
 *
 * Reduced motion holds all four: the levels at 1, the sway's clock still, the
 * debris at rest (environmentLayer.ts).
 */
import type { Material } from 'three';
import { SIM } from '@echoes/shared';

/** The sonar bucket every step lands on (rule 3), as the embers and the steam. */
export const LIGHT_BUCKET_MS = 1000 / SIM.ECHO_HZ;

/** SPEC — a pool lights the arch's own stone within this and nothing past it (§8). */
export const POOL_RADIUS_M = 20;
/**
 * TUNABLE — how much of the lamp's hue the stone takes under it, before the
 * pool's falloff and the stone's own albedo. Bounded by §8's reading, not by
 * taste: the brightest lit stone must stay under the lamp glass beside it,
 * under a vent ember's mean breath and under the escorts' brightest lamp
 * pixel. The §9 readings hold it (docs/screenshots/issue-1637/README.md,
 * "The lamp glass, the lit stone and what they must stay under"): the
 * stone is read on the key-lit face with the glass dark, an upper bound on
 * what any pool adds, so a level that keeps that face under every limit
 * keeps the pool under them too.
 */
export const POOL_LEVEL = 0.9;
/** SPEC — a dipped lamp's level (§8): 60 %, never above the steady level. */
export const LAMP_DIP = 0.6;
/** SPEC — at most one dip per lamp in any 2 s: ten buckets. */
export const DIP_WINDOW_BUCKETS = 10;
/** The lamps Block 4b gives the intact state. */
export const LAMP_COUNT = 4;
/** SPEC — a hung fitting's reach at its free end (§8). */
export const HANG_AMPLITUDE_M = 1.5;
/** SPEC — the hung fittings' periods, seconds (§8): the six spread over 9–14. */
export const HANG_PERIOD_S: readonly [number, number] = [9, 14];
/** SPEC — the debris is down within this of the received change (§8). */
export const FALL_SECONDS = 4;
/** The pieces Block 4b gives the ruined state. */
export const FALL_COUNT = 12;

/**
 * Each lamp's level for one sonar bucket: 1, or `LAMP_DIP` for one or two
 * buckets. Lamp `i` owns buckets `2i` and `2i + 1` of every ten, so no two
 * lamps dip in one bucket and a lamp's dips start exactly ten buckets apart —
 * at most once in any 2 s — and whether it dips in a window, and for one
 * bucket or two, is a hash of the lamp and the window, so nothing in the
 * match moves it (rule 4) and every client sees the same guttering.
 */
export function lampLevels(bucket: number, count = LAMP_COUNT, out?: Float32Array): Float32Array {
  const levels = out ?? new Float32Array(count);
  const window = Math.floor(bucket / DIP_WINDOW_BUCKETS);
  const at = bucket - window * DIP_WINDOW_BUCKETS;
  for (let i = 0; i < count; i++) {
    const dips = lampHash(i, window, 1) < DIP_CHANCE;
    const length = lampHash(i, window, 2) < 0.5 ? 1 : 2;
    const start = 2 * i;
    levels[i] = dips && at >= start && at < start + length ? LAMP_DIP : 1;
  }
  return levels;
}

/** TUNABLE — how often a lamp's window carries a dip at all. */
const DIP_CHANCE = 0.35;

function lampHash(lamp: number, window: number, salt: number): number {
  let h = Math.imul((window + 1) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul(lamp + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(salt + 1, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 0x100000000;
}

/** Attribute names the template lays on the landmark's vertices (landmarkModels.ts). */
export const LAMP_INDEX_ATTRIBUTE = 'lampIndex';
export const HANG_ATTRIBUTE = 'aHang';
export const HANG_PHASE_ATTRIBUTE = 'aHangPhase';
export const FALL_ATTRIBUTE = 'aFall';

/** The uniforms one landmark template's materials share; the layer writes them. */
export interface LandmarkUniforms {
  /** Four lamp levels, this bucket's (`lampLevels`). */
  uLampLevel: { value: Float32Array };
  /** The lamps in model metres, xyz, and each one's level in w. */
  uPool: { value: Float32Array };
  uPoolCount: { value: number };
  /** The lamp hue the stone takes, linear RGB, already at `POOL_LEVEL`. */
  uPoolColor: { value: Float32Array };
  /** The sway's clock, seconds; held under reduced motion. */
  uHangTime: { value: number };
  /** The collapse's progress, 0 to 1 over `FALL_SECONDS`; 1 is at rest. */
  uFallT: { value: number };
}

export function landmarkUniforms(poolColor: readonly [number, number, number]): LandmarkUniforms {
  return {
    uLampLevel: { value: new Float32Array(LAMP_COUNT).fill(1) },
    uPool: { value: new Float32Array(LAMP_COUNT * 4) },
    uPoolCount: { value: 0 },
    uPoolColor: {
      value: Float32Array.from([
        poolColor[0] * POOL_LEVEL,
        poolColor[1] * POOL_LEVEL,
        poolColor[2] * POOL_LEVEL,
      ]),
    },
    uHangTime: { value: 0 },
    uFallT: { value: 1 },
  };
}

type Shader = { uniforms: Record<string, unknown>; vertexShader: string; fragmentShader: string };

function chain(material: Material, key: string, patch: (shader: Shader) => void): void {
  const before = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    patch(shader as Shader);
  };
  material.customProgramCacheKey = () => `${previousKey}:${key}`;
  material.needsUpdate = true;
}

/**
 * The glass: each lamp's emission scaled by its level before the glow is
 * added back after the tone curve (modelLighting.ts), so a dip is a dip of
 * the lamp and not of the stone beside it.
 */
export function installLampLevels(material: Material, uniforms: LandmarkUniforms): void {
  chain(material, 'arch-lamp-levels-1', (shader) => {
    shader.uniforms.uLampLevel = uniforms.uLampLevel;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nattribute float ${LAMP_INDEX_ATTRIBUTE};\nvarying float vLampIndex;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvLampIndex = ${LAMP_INDEX_ATTRIBUTE};`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform float uLampLevel[${LAMP_COUNT}];\nvarying float vLampIndex;`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\ntotalEmissiveRadiance *= uLampLevel[int(vLampIndex + 0.5)];`
      );
  });
}

/**
 * The stone: each lamp's pool on the fragment, from the lamp's model-space
 * position and the fragment's, with a wrapped Lambert term so the underside
 * of a ledge takes a little and a face turned away takes none. The varying is
 * taken after every displacement (the sway's, the debris's), so a swung
 * fitting is lit where it swings.
 */
export function installLampPools(material: Material, uniforms: LandmarkUniforms): void {
  chain(material, 'arch-lamp-pools-1', (shader) => {
    shader.uniforms.uPool = uniforms.uPool;
    shader.uniforms.uPoolCount = uniforms.uPoolCount;
    shader.uniforms.uPoolColor = uniforms.uPoolColor;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vPoolPos;\nvarying vec3 vPoolNormal;'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvPoolPos = transformed;\nvPoolNormal = objectNormal;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec4 uPool[${LAMP_COUNT}];
uniform int uPoolCount;
uniform vec3 uPoolColor;
varying vec3 vPoolPos;
varying vec3 vPoolNormal;`
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
{
	vec3 poolN = normalize( vPoolNormal );
	for ( int i = 0; i < ${LAMP_COUNT}; i ++ ) {
		if ( i >= uPoolCount ) break;
		vec3 toLamp = uPool[ i ].xyz - vPoolPos;
		float dist = length( toLamp );
		float fall = max( 0.0, 1.0 - dist / ${POOL_RADIUS_M.toFixed(1)} );
		float wrap = max( 0.0, dot( poolN, toLamp / max( dist, 0.01 ) ) * 0.7 + 0.3 );
		reflectedLight.directDiffuse += diffuseColor.rgb * uPoolColor * uPool[ i ].w * fall * fall * wrap;
	}
}`
      );
  });
}

/**
 * The hung fittings: a pendulum about the pivot in the vertex shader. The
 * attribute carries each fitting's own axis in the plan, its period and the
 * vertex's weight below the pivot; the phase is its own too. A vertex that
 * hangs from nothing carries a zero period and never moves.
 */
export function installHangSway(material: Material, uniforms: LandmarkUniforms): void {
  chain(material, 'arch-hang-sway-1', (shader) => {
    shader.uniforms.uHangTime = uniforms.uHangTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec4 ${HANG_ATTRIBUTE};
attribute float ${HANG_PHASE_ATTRIBUTE};
uniform float uHangTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
if ( ${HANG_ATTRIBUTE}.z > 0.0 ) {
	float swing = ${HANG_AMPLITUDE_M.toFixed(2)} * ${HANG_ATTRIBUTE}.w * sin( 6.2831853 * uHangTime / ${HANG_ATTRIBUTE}.z + ${HANG_PHASE_ATTRIBUTE} );
	transformed.xz += ${HANG_ATTRIBUTE}.xy * swing;
}`
      );
  });
}

/**
 * The debris: a piece starts its recorded height above its rest and falls
 * under gravity's shape, each piece a little after the last, all down by
 * `FALL_SECONDS`. At `uFallT` 1, which is every frame but the sequence's,
 * nothing is displaced and the ruin is the file's.
 */
export function installFallDrop(material: Material, uniforms: LandmarkUniforms): void {
  chain(material, 'arch-fall-drop-1', (shader) => {
    shader.uniforms.uFallT = uniforms.uFallT;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nattribute vec2 ${FALL_ATTRIBUTE};\nuniform float uFallT;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
if ( ${FALL_ATTRIBUTE}.x > 0.0 ) {
	// Piece k starts at k / ${FALL_COUNT} of the first half and falls over the second.
	float fallStart = ${FALL_ATTRIBUTE}.y / ${FALL_COUNT.toFixed(1)} * 0.5;
	float fallU = clamp( ( uFallT - fallStart ) / 0.5, 0.0, 1.0 );
	transformed.y += ${FALL_ATTRIBUTE}.x * ( 1.0 - fallU * fallU );
}`
      );
  });
}

/** The axis, period and phase each hung fitting swings on: its own, spread across the set. */
export function hangMotion(
  index: number,
  count: number
): { axis: [number, number]; periodS: number; phase: number } {
  // Bearings at i/count of a half turn: 0° to 150° over six, so no two share
  // a bearing and the set states no current (habitats §5 asks at least 120°).
  const bearing = (index / Math.max(1, count)) * Math.PI;
  const [lo, hi] = HANG_PERIOD_S;
  const periodS = count > 1 ? lo + ((hi - lo) * index) / (count - 1) : lo;
  return { axis: [Math.cos(bearing), Math.sin(bearing)], periodS, phase: index * 1.7 };
}
