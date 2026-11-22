/**
 * A drifting jelly as a lantern, at the High graphics quality
 * (docs/art-direction.md, "A jelly is a lantern"; #1837).
 *
 * The owner's target shows a jelly as light, not as a lit body: a
 * translucent bell glowing from within, over long strands of beads of light
 * (docs/screenshots/issue-1837/target-jelly.jpg). So at High a jelly's file
 * is drawn as a membrane and not as stone. Each face adds its light to what
 * is behind it and hides nothing, both sides drawn, so the bell's far wall
 * shows through its near one and its edge, where the eye looks along the
 * skin, is the brightest of it: what a thin lit skin does. Its radial canals
 * and its lip are brighter lines on it. Nothing of this is in the file,
 * which emits nothing: the light is the renderer's, in `jelly-lantern`
 * (docs/style-neon-noir.md "World light").
 *
 * Its strands are not geometry. They are beads of the same light, hung from
 * the lip and written each frame as points of the world pass (lifeGlow.ts),
 * with the seats its file marks and one soft disc for the glow in the water
 * round the bell.
 *
 * Three things move, all on the shared match time and none for anything a
 * match does (limit 4): the bell's stroke, the strands' sway, and a wave of
 * light that runs from the crown down the bell and out along the strands.
 * `jellyStroke` and `jellyPulse` are each written twice, here for the beads
 * and in the membrane's program for the bell, from the same constants, so a
 * strand's root stays on the lip and the wave leaves the bell where it
 * enters the strands. Reduced motion holds all three.
 *
 * TUNABLE until a frame of this step is accepted: `HIGH_GRAPHICS.LIFE.JELLY`
 * in packages/shared/src/constants.ts.
 */

import {
  BufferGeometry,
  Color,
  CustomBlending,
  DoubleSide,
  type Material,
  type Matrix4,
  MeshBasicMaterial,
  OneFactor,
  Vector3,
  Vector4,
  ZeroFactor,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { JELLY_LANTERN } from './palette.ts';

const { BELL, STRANDS, HALO, SWIM, PULSE, STAGGER_S, FAR } = HIGH_GRAPHICS.LIFE.JELLY;
const { LANTERN } = HIGH_GRAPHICS.LIFE.GLOW;

/** What a membrane's program reads of its jelly; one object a template, driven by the layer. */
export interface JellyUniforms {
  /** Seconds on the match's clock. */
  uJellyTime: { value: number };
  /** 1 while the bell strokes and the wave runs; 0 under reduced motion. */
  uJellyMoves: { value: number };
  /** The lip's height and the crown's over the model's origin, and the lip's radius, metres. */
  uJellyShape: { value: Vector3 };
  /**
   * How many of the template's instances, from the first, are lanterns by
   * the fleet and take the whole wave of light. Every instance after them
   * is a lantern of the far bloom and takes the softer one (#1859).
   */
  uJellyNear: { value: number };
}

/** Where a jelly's lip and crown stand, read off its template: the seats ring the lip. */
export interface JellyShape {
  lipY: number;
  lipR: number;
  crownY: number;
}

export function jellyShape(template: {
  heightM: number;
  photophores?: readonly Vector3[];
}): JellyShape | null {
  const seats = template.photophores ?? [];
  if (seats.length === 0) return null;
  const mean = (of: (seat: Vector3) => number) =>
    seats.reduce((sum, seat) => sum + of(seat), 0) / seats.length;
  return {
    lipY: mean((seat) => seat.y),
    lipR: mean((seat) => Math.hypot(seat.x, seat.z)),
    crownY: template.heightM,
  };
}

/** A jelly's own clock: the match's, run ahead by its place in the list. */
const clock = (timeS: number, index: number): number => timeS + index * STAGGER_S;

/**
 * How far the bell's stroke has drawn the lip in, 0 to 1: a brief squeeze
 * and a longer rest, the same in as out.
 */
export function jellyStroke(timeS: number, index: number, moves: boolean): number {
  if (!moves) return 0;
  const beat = 0.5 - 0.5 * Math.cos((2 * Math.PI * clock(timeS, index)) / SWIM.PERIOD_S);
  return beat * beat;
}

/**
 * What the wave of light adds at `alongM` metres from the crown along the
 * body, 0 to 1, before its gain: the bell first, then each strand from the
 * lip down.
 */
export function jellyPulse(alongM: number, timeS: number, index: number, moves: boolean): number {
  if (!moves) return 0;
  const sinceS = ((clock(timeS, index) % PULSE.PERIOD_S) + PULSE.PERIOD_S) % PULSE.PERIOD_S;
  const headM = PULSE.SPEED_MPS * sinceS - PULSE.LEAD * PULSE.WIDTH_M;
  const off = (alongM - headM) / PULSE.WIDTH_M;
  return Math.exp(-off * off);
}

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/** The anchors the patch needs of three's basic program, vertex then fragment. */
export const JELLY_MEMBRANE_ANCHORS = {
  vertex: ['#include <common>', '#include <begin_vertex>', '#include <project_vertex>'],
  fragment: ['#include <common>', '#include <color_fragment>'],
} as const;

const SHARED = [
  'uniform float uJellyTime;',
  'uniform float uJellyMoves;',
  'uniform vec3 uJellyShape;',
  'varying float vJellyGain;',
  'varying vec3 vJellyN;',
  'varying vec3 vJellyV;',
  'varying vec3 vJellyP;',
  'varying float vJellyClock;',
].join('\n');

/** The basic program as a lit membrane. Exported for the test that holds the anchors. */
export function patchJellyMembrane(shader: { vertexShader: string; fragmentShader: string }): void {
  const [vCommon, vBegin, vProject] = JELLY_MEMBRANE_ANCHORS.vertex;
  const [fCommon, fColor] = JELLY_MEMBRANE_ANCHORS.fragment;
  shader.vertexShader = shader.vertexShader
    .replace(vCommon, `${vCommon}\n${SHARED}\nuniform float uJellyNear;`)
    .replace(
      vBegin,
      [
        vBegin,
        // The instance is the jelly's place in its list, as the beads' is.
        `vJellyClock = uJellyTime + float( gl_InstanceID ) * ${glsl(STAGGER_S)};`,
        // What the wave adds: the whole of it on a lantern by the fleet, and
        // the softer one on a lantern of the far bloom, which follow them in
        // the list (`jellyWaveGain`).
        `vJellyGain = float( gl_InstanceID ) < uJellyNear ? ${glsl(PULSE.GAIN)} : ${glsl(FAR.PULSE_GAIN)};`,
        // The stroke (`jellyStroke`): the lip drawn in, the crown still, and
        // the lobes under the lip carried with it.
        `float jellyBeat = 0.5 - 0.5 * cos( 6.2831853 * vJellyClock / ${glsl(SWIM.PERIOD_S)} );`,
        'float jellyBelow = clamp( ( uJellyShape.y - transformed.y ) / max( 1e-3, uJellyShape.y - uJellyShape.x ), 0.0, 1.0 );',
        `transformed.xz *= 1.0 - ${glsl(SWIM.SQUEEZE)} * uJellyMoves * jellyBeat * jellyBeat * jellyBelow * jellyBelow;`,
        'vJellyP = position;',
        'vec3 jellyN = normal;',
        '#ifdef USE_INSTANCING',
        '  jellyN = mat3( instanceMatrix ) * jellyN;',
        '#endif',
        'vJellyN = normalMatrix * jellyN;',
      ].join('\n')
    )
    .replace(vProject, `${vProject}\nvJellyV = - mvPosition.xyz;`);
  shader.fragmentShader = shader.fragmentShader
    .replace(fCommon, `${fCommon}\n${SHARED}\nuniform vec4 uJellySkin;`)
    .replace(
      fColor,
      [
        fColor,
        // A thin lit skin: least where the eye looks through it square, most
        // where it looks along it. Both sides are drawn, so the sign is nothing.
        'float jellyFacing = abs( dot( normalize( vJellyN ), normalize( vJellyV ) ) );',
        `float jellyRim = pow( 1.0 - jellyFacing, ${glsl(BELL.RIM_POWER)} );`,
        // The radial canals, crown to lip, and the lip's own band.
        `float jellyRib = pow( abs( cos( atan( vJellyP.z, vJellyP.x ) * ${glsl(BELL.RIBS / 2)} ) ), ${glsl(BELL.RIB_POWER)} );`,
        `float jellyLipOff = ( vJellyP.y - uJellyShape.x ) / ${glsl(BELL.LIP_M)};`,
        'float jellyLip = exp( - jellyLipOff * jellyLipOff );',
        // The wave of light (`jellyPulse`), by metres below the crown.
        `float jellySince = mod( vJellyClock, ${glsl(PULSE.PERIOD_S)} );`,
        `float jellyOff = ( ( uJellyShape.y - vJellyP.y ) - ( ${glsl(PULSE.SPEED_MPS)} * jellySince - ${glsl(PULSE.LEAD * PULSE.WIDTH_M)} ) ) / ${glsl(PULSE.WIDTH_M)};`,
        'float jellyWave = uJellyMoves * vJellyGain * exp( - jellyOff * jellyOff );',
        // x: a face square to the eye. y: its edge. z: a canal. w: the lip.
        'diffuseColor.rgb *= ( uJellySkin.x + uJellySkin.y * jellyRim + uJellySkin.z * jellyRib + uJellySkin.w * jellyLip ) * ( 1.0 + jellyWave );',
      ].join('\n')
    );
}

/** A template's jelly uniforms, from where its lip and crown stand. */
export function jellyUniforms(shape: JellyShape): JellyUniforms {
  return {
    uJellyTime: { value: 0 },
    uJellyMoves: { value: 1 },
    uJellyShape: { value: new Vector3(shape.lipY, shape.crownY, shape.lipR) },
    // Every instance, until the layer counts the far bloom's among them.
    uJellyNear: { value: Number.MAX_SAFE_INTEGER },
  };
}

/**
 * The membrane a part of a jelly's file is drawn as at High: its `bell`, or
 * the short lobes of its `core`, which are a steadier and plainer light.
 */
export function jellyMembrane(part: 'bell' | 'core', uniforms: JellyUniforms): MeshBasicMaterial {
  const skin =
    part === 'bell'
      ? new Vector4(BELL.LEVEL, BELL.RIM, BELL.RIB, BELL.MARGIN)
      : new Vector4(BELL.CORE, 0, 0, 0);
  const material = new MeshBasicMaterial({
    color: new Color(JELLY_LANTERN),
    // Scene-referred light in the world pass, as a body's own point is
    // (lifeGlow.ts): it adds to what is behind it and leaves alpha, which
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
    // Light adds in any order, so both sides go in one draw: three would
    // otherwise draw a blended two-sided part twice, back faces then front.
    forceSinglePass: true,
    // The water takes it with distance (water.ts `installWaterFog`).
    fog: true,
  });
  material.name = `jelly_${part}`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { uJellySkin: { value: skin } });
    patchJellyMembrane(shader);
  };
  material.customProgramCacheKey = () => 'jelly-membrane-2';
  // Blended, and still the world pass's (PerspectiveView `enterWorldLayer`).
  material.userData.worldLayer = true;
  return material;
}

/** A membrane in another palette's lantern: the layer calls this each frame. */
export function tintJellyMembrane(material: Material, token: number): void {
  if (material instanceof MeshBasicMaterial && material.userData.worldLayer === true) {
    material.color.setHex(token);
  }
}

/**
 * A part's geometry as a membrane wears it: one normal a vertex, so the skin
 * curves where the file's facets meet. The file is flat-shaded for the kit's
 * stone, and a membrane shaded a facet at a time is a lit polyhedron.
 */
export function smoothMembrane(geometry: BufferGeometry): BufferGeometry {
  const bare = new BufferGeometry();
  bare.setAttribute('position', geometry.getAttribute('position').clone());
  if (geometry.index !== null) bare.setIndex(geometry.index.clone());
  const smooth = mergeVertices(bare, 1e-4);
  smooth.computeVertexNormals();
  smooth.computeBoundingSphere();
  bare.dispose();
  return smooth;
}

const hash = (n: number): number => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** Lights one jelly carries: the glow round its bell, its seats and its strands' beads. */
export function jellyLightCount(seats: number): number {
  return 1 + seats + STRANDS.COUNT * STRANDS.BEADS;
}

/**
 * What the wave of light adds to what it passes: the whole of it on a
 * lantern by the fleet, and the softer one on a lantern of the far bloom,
 * where 120 whole waves out of step would be a river of flashes (#1859).
 */
export function jellyWaveGain(far: boolean): number {
  return far ? FAR.PULSE_GAIN : PULSE.GAIN;
}

/**
 * What of a bead depends only on how far down its strand it hangs, the same
 * for every strand of every jelly: drawn once. `t` runs from the lip to the
 * tip. Curve shape, not tuning: a strand bends more toward its tip, holds a
 * wave and a half along its length, and trails as a hanging line does.
 */
const BEAD = Array.from({ length: STRANDS.BEADS }, (_, j) => {
  const t = (j + 1) / STRANDS.BEADS;
  return {
    t,
    // Hung just inside the lip, gathering toward the tip.
    radial: STRANDS.ROOT - STRANDS.GATHER * t,
    bend: STRANDS.SWAY_M * t ** 1.5,
    waveCos: Math.cos(3 * Math.PI * t),
    waveSin: Math.sin(3 * Math.PI * t),
    trailM: STRANDS.TRAIL_M * t * t,
    sizeM: STRANDS.SIZE_M * (1 - STRANDS.TAPER * t),
    level: STRANDS.LEVEL * (1 - t) ** STRANDS.FADE,
  };
});

/**
 * What of a jelly's strands depends only on its place in its list: each
 * strand's bearing, length and phase, and each bead's own share of its
 * level. Drawn once a jelly and kept: the far bloom hangs 120 lanterns, and
 * drawing these again every frame cost ten milliseconds of it (#1859).
 */
interface StrandTable {
  /** Four a strand: the cosine and sine of its bearing, its length in metres, its phase. */
  strands: Float64Array;
  /** One a bead: no two alike, so three tenths of a bead's level is its own. */
  beads: Float64Array;
}
const STRAND_TABLES = new Map<number, StrandTable>();

function strandTable(index: number): StrandTable {
  let table = STRAND_TABLES.get(index);
  if (table !== undefined) return table;
  table = {
    strands: new Float64Array(STRANDS.COUNT * 4),
    beads: new Float64Array(STRANDS.COUNT * STRANDS.BEADS),
  };
  for (let k = 0; k < STRANDS.COUNT; k++) {
    const seed = index * 131 + k;
    const bearing = (2 * Math.PI * (k + 0.6 * hash(seed + 0.5))) / STRANDS.COUNT;
    table.strands[k * 4] = Math.cos(bearing);
    table.strands[k * 4 + 1] = Math.sin(bearing);
    table.strands[k * 4 + 2] =
      STRANDS.LENGTH_M * (STRANDS.SHORTEST + (1 - STRANDS.SHORTEST) * hash(seed + 1.5));
    table.strands[k * 4 + 3] = 2 * Math.PI * hash(seed + 2.5);
    for (let j = 0; j < STRANDS.BEADS; j++) {
      table.beads[k * STRANDS.BEADS + j] = 0.7 + 0.3 * hash(seed * 31 + j);
    }
  }
  STRAND_TABLES.set(index, table);
  return table;
}

const AT = new Vector3();

/**
 * One jelly's points of light, each handed to `light` with its width in
 * metres and its level: the glow in the water round the bell, a point on
 * each seat, and the beads of its strands from the lip down. `matrix` is the
 * jelly's own, model to scene; a model swims along +X, so a strand trails
 * toward -X. `gain` is what the wave of light adds as it passes
 * (`jellyWaveGain`).
 *
 * The beads are the inner loop of the frame's own work, 324 a jelly, so
 * nothing in it is drawn twice: a strand's wave is one sine and one cosine
 * for the strand, turned along it by each bead's own, and a bead the wave is
 * nowhere near takes no exponential. Past five of its widths the wave adds
 * under a hundred-billionth, which is counted as nothing.
 */
export function writeJellyLights(
  shape: JellyShape,
  seats: readonly Vector3[],
  matrix: Matrix4,
  index: number,
  timeS: number,
  moves: boolean,
  light: (at: Vector3, sizeM: number, level: number) => void,
  gain: number = PULSE.GAIN
): void {
  const { lipY, lipR, crownY } = shape;
  const bellM = crownY - lipY;
  light(AT.set(0, lipY + bellM / 2, 0).applyMatrix4(matrix), HALO.SIZE_M, HALO.LEVEL);
  const draw = 1 - SWIM.SQUEEZE * jellyStroke(timeS, index, moves);
  const atLip = 1 + gain * jellyPulse(bellM, timeS, index, moves);
  for (const seat of seats) {
    light(
      AT.set(seat.x * draw, seat.y, seat.z * draw).applyMatrix4(matrix),
      LANTERN.SIZE_M,
      LANTERN.LEVEL * atLip
    );
  }
  const { strands, beads } = strandTable(index);
  const swayAt = moves ? (2 * Math.PI * clock(timeS, index)) / STRANDS.SWAY_PERIOD_S : 0;
  // Where the wave's head stands along the body now (`jellyPulse`).
  const sinceS = ((clock(timeS, index) % PULSE.PERIOD_S) + PULSE.PERIOD_S) % PULSE.PERIOD_S;
  const headM = PULSE.SPEED_MPS * sinceS - PULSE.LEAD * PULSE.WIDTH_M;
  const e = matrix.elements;
  const hungR = lipR * draw;
  for (let k = 0; k < STRANDS.COUNT; k++) {
    const cos = strands[k * 4]!;
    const sin = strands[k * 4 + 1]!;
    const lengthM = strands[k * 4 + 2]!;
    const waveAt = swayAt + strands[k * 4 + 3]!;
    const waveSin = Math.sin(waveAt);
    const waveCos = Math.cos(waveAt);
    for (let j = 0; j < STRANDS.BEADS; j++) {
      const bead = BEAD[j]!;
      const downM = lengthM * bead.t;
      const radiusM = hungR * bead.radial;
      // Waving across its own bearing more the further down, and trailing aft.
      const waveM = bead.bend * (waveSin * bead.waveCos - waveCos * bead.waveSin);
      const x = cos * radiusM - sin * waveM - bead.trailM;
      const y = lipY - downM;
      const z = sin * radiusM + cos * waveM;
      let passes = 0;
      if (moves) {
        const off = (bellM + downM - headM) / PULSE.WIDTH_M;
        if (off > -5 && off < 5) passes = Math.exp(-off * off);
      }
      light(
        AT.set(
          e[0]! * x + e[4]! * y + e[8]! * z + e[12]!,
          e[1]! * x + e[5]! * y + e[9]! * z + e[13]!,
          e[2]! * x + e[6]! * y + e[10]! * z + e[14]!
        ),
        bead.sizeM,
        bead.level * beads[k * STRANDS.BEADS + j]! * (1 + gain * passes)
      );
    }
  }
}
