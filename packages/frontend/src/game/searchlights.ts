/**
 * The searchlights of the player's own hulls at the High graphics quality
 * (docs/art-direction.md, "An own hull's searchlight"; #1836).
 *
 * The world's own sources are placed by the map and never move
 * (worldLights.ts). A searchlight is the other kind the law licenses: agent
 * light, thrown by an own hull, in its navy's glow. It pools on the ground,
 * lights the cladding of another own hull it crosses, scatters in the water
 * as a cone (searchlightVolumes.ts), and is the first light at High with a
 * direction, so it is the first to cast a shadow.
 *
 * Three limits shape it, and each holds by construction.
 *
 * - **Limit 5, own light never contradicts gate 3.** A beam's strength is the
 *   lamp halo's own gain at the hull's live SIG (glow.ts `haloGain`): nothing
 *   through SIG 15, so a hull on Silent Running, which the server holds to 3
 *   to 8, throws none, and gate 3's curve above that. It is capped lower than
 *   the halo, since a pool is ground a mark stands on (limit 6).
 * - **Limit 2, nothing unresolved is drawn.** `searchlightsOf` is handed own
 *   hulls and nothing else; a contact has no searchlight and occludes none.
 * - **Limit 3, hue.** The colour is the navy's glow token, as the lamps' is.
 *
 * The shadow is read, not rendered. The ground is a height field, so a point
 * asks the ground's own heights whether the line to the lamp clears them, and
 * asks each own hull, as a capsule about its keel line, the same. No light
 * has a camera, a target or a pass of its own, and gate 8's one projection
 * stands. What that costs is a hull's silhouette: a hull shadows as its
 * length and beam, and a prop casts nothing.
 *
 * The uniforms are a view's and a material outlives a view, so every patched
 * material reads the one set here, which a view writes before its world pass
 * draws (hullLight.ts does the same with the pools).
 *
 * Every number is TUNABLE until the owner accepts a frame of it
 * (`HIGH_GRAPHICS.SEARCHLIGHT`, packages/shared/src/constants.ts).
 */

import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RedFormat,
  Vector2,
  Vector4,
  type Texture,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { haloGain } from './glow.ts';

const SPEC = HIGH_GRAPHICS.SEARCHLIGHT;

const glsl = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/** What a view knows of one own hull this frame, in the scene's drawn metres. */
export interface SearchlightHull {
  id: number;
  /** The drawn hull's centre: plan x, world height, plan y. */
  x: number;
  y: number;
  z: number;
  /** Plan heading, radians: 0 looks along +x. */
  heading: number;
  /** Drawn length and beam, the readability scale in them. */
  lengthM: number;
  beamM: number;
  /** Live SIG, 0 to 100, as the snapshot carries it. */
  sig: number;
}

/** One beam: where it leaves the hull, where it looks, and its light. */
export interface Searchlight {
  /** The hull that throws it. */
  hull: number;
  x: number;
  y: number;
  z: number;
  /** Unit direction. */
  dx: number;
  dy: number;
  dz: number;
  /** Linear RGB of the navy's glow, times the beam's power at this SIG. */
  r: number;
  g: number;
  b: number;
}

/** A hull as what stands in a beam's way: its keel line and half its beam. */
export interface SearchlightOccluder {
  hull: number;
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  radiusM: number;
}

/**
 * How much of a searchlight a hull throws at a live SIG: the lamp halo's
 * gain, so the beam and the halo come on together and climb gate 3's curve
 * together, held at `GAIN_SIG_CAP`. 0 through SIG 15.
 */
export function searchlightGain(sig: number): number {
  return haloGain(Math.min(sig, SPEC.GAIN_SIG_CAP));
}

const squared = (ax: number, az: number, bx: number, bz: number): number =>
  (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

/**
 * The beams a frame draws and the hulls that stand in their way, from the
 * player's own hulls alone. A hull throws one beam from its bow, along its
 * heading and `DEPRESSION_DEG` under the level. Hulls that throw none are
 * left out, and of the rest the `MAX` nearest the camera's focus are kept,
 * ties by id, so the choice is the same on every frame of a still camera.
 * Every hull near the focus may occlude, lit or not.
 */
export function searchlightsOf(
  hulls: readonly SearchlightHull[],
  glow: number,
  focus: { x: number; z: number }
): { lights: Searchlight[]; occluders: SearchlightOccluder[] } {
  const nearest = [...hulls].sort(
    (a, b) =>
      squared(a.x, a.z, focus.x, focus.z) - squared(b.x, b.z, focus.x, focus.z) || a.id - b.id
  );
  const color = new Color(glow);
  const pitch = (SPEC.DEPRESSION_DEG * Math.PI) / 180;
  const lights: Searchlight[] = [];
  for (const hull of nearest) {
    if (lights.length === SPEC.MAX) break;
    const gain = searchlightGain(hull.sig);
    if (gain <= 0) continue;
    const fx = Math.cos(hull.heading);
    const fz = Math.sin(hull.heading);
    // Off the bow and under the keel line, clear of the hull's own capsule.
    const ahead = hull.lengthM / 2 + SPEC.CLEAR_M;
    const power = SPEC.POWER * gain;
    lights.push({
      hull: hull.id,
      x: hull.x + fx * ahead,
      y: hull.y - hull.beamM * SPEC.KEEL,
      z: hull.z + fz * ahead,
      dx: fx * Math.cos(pitch),
      dy: -Math.sin(pitch),
      dz: fz * Math.cos(pitch),
      r: color.r * power,
      g: color.g * power,
      b: color.b * power,
    });
  }
  const occluders = nearest.slice(0, SPEC.OCCLUDERS).map((hull): SearchlightOccluder => {
    const radiusM = hull.beamM / 2;
    // The capsule's ends are its radius in from the bow and the stern.
    const half = Math.max(0, hull.lengthM / 2 - radiusM);
    const fx = Math.cos(hull.heading) * half;
    const fz = Math.sin(hull.heading) * half;
    return {
      hull: hull.id,
      ax: hull.x - fx,
      ay: hull.y,
      az: hull.z - fz,
      bx: hull.x + fx,
      by: hull.y,
      bz: hull.z + fz,
      radiusM,
    };
  });
  return { lights, occluders };
}

/**
 * Plan pixels a cell of the ground's heights: 15.6 m a pixel on a 250 m cell,
 * finer than the drawn mesh's 31 m, so a shadow's edge is the mesh's own.
 */
export const GROUND_HEIGHT_PX_PER_CELL = 16;

/**
 * The drawn ground's height as a plan texture, for a beam to ask what stands
 * between a point and its lamp: one half-float a pixel, row 0 the north edge,
 * filtered. Static as the ground is; a ground delta rebuilds it.
 */
export function groundHeightTexture(
  terrain: TerrainPayload,
  groundY: (xM: number, yM: number) => number
): DataTexture {
  const width = terrain.cols * GROUND_HEIGHT_PX_PER_CELL;
  const height = terrain.rows * GROUND_HEIGHT_PX_PER_CELL;
  const mPerPx = terrain.cellM / GROUND_HEIGHT_PX_PER_CELL;
  const data = new Uint16Array(width * height);
  for (let i = 0; i < width * height; i++) {
    data[i] = DataUtils.toHalfFloat(
      groundY(((i % width) + 0.5) * mPerPx, (Math.floor(i / width) + 0.5) * mPerPx)
    );
  }
  const texture = new DataTexture(data, width, height, RedFormat, HalfFloatType);
  texture.name = 'searchlight-ground';
  texture.flipY = false;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** No ground anywhere, far below any beam: what a material reads until a view hands its own over. */
const NO_GROUND = new DataTexture(
  new Uint16Array([DataUtils.toHalfFloat(-60000)]),
  1,
  1,
  RedFormat,
  HalfFloatType
);
NO_GROUND.needsUpdate = true;

const vectors = (count: number): Vector4[] => Array.from({ length: count }, () => new Vector4());

/**
 * What every searchlit material and the cone pass read. One set for the
 * page: `setSearchlights` writes it, each frame, for the view about to draw.
 */
export const SEARCHLIGHT_UNIFORMS = {
  uSearchCount: { value: 0 },
  /** xyz where the beam leaves the hull; w unused. */
  uSearchAt: { value: vectors(SPEC.MAX) },
  /** xyz the beam's direction; w its own hull's slot among the occluders, or -1. */
  uSearchAim: { value: vectors(SPEC.MAX) },
  /** rgb the navy's glow times the beam's power; w unused. */
  uSearchGlow: { value: vectors(SPEC.MAX) },
  uSearchHullCount: { value: 0 },
  /** xyz the stern end of a hull's keel line; w the capsule's radius. */
  uSearchHullA: { value: vectors(SPEC.OCCLUDERS) },
  /** xyz the bow end. */
  uSearchHullB: { value: vectors(SPEC.OCCLUDERS) },
  tSearchGround: { value: NO_GROUND as Texture },
  uSearchMap: { value: new Vector2(1, 1) },
};

/**
 * Hand the world pass this frame's beams and occluders, and the heights of
 * the ground it is about to draw over. No beams, or no ground, lights
 * nothing.
 */
export function setSearchlights(
  lights: readonly Searchlight[],
  occluders: readonly SearchlightOccluder[],
  ground: Texture | null,
  widthM = 1,
  heightM = 1
): void {
  const u = SEARCHLIGHT_UNIFORMS;
  const count = ground === null ? 0 : Math.min(lights.length, SPEC.MAX);
  const hulls = Math.min(occluders.length, SPEC.OCCLUDERS);
  u.uSearchCount.value = count;
  for (let i = 0; i < count; i++) {
    const light = lights[i]!;
    const own = occluders.findIndex((o, slot) => slot < hulls && o.hull === light.hull);
    u.uSearchAt.value[i]!.set(light.x, light.y, light.z, 0);
    u.uSearchAim.value[i]!.set(light.dx, light.dy, light.dz, own);
    u.uSearchGlow.value[i]!.set(light.r, light.g, light.b, 0);
  }
  u.uSearchHullCount.value = hulls;
  for (let i = 0; i < hulls; i++) {
    const o = occluders[i]!;
    u.uSearchHullA.value[i]!.set(o.ax, o.ay, o.az, o.radiusM);
    u.uSearchHullB.value[i]!.set(o.bx, o.by, o.bz, 0);
  }
  u.tSearchGround.value = ground ?? NO_GROUND;
  u.uSearchMap.value.set(widthM, heightM);
}

/** Beams the uniforms hold now: what the cone pass draws, and what a probe reports. */
export function searchlightCount(): number {
  return SEARCHLIGHT_UNIFORMS.uSearchCount.value;
}

const COS_INNER = Math.cos((SPEC.INNER_DEG * Math.PI) / 180);
const COS_OUTER = Math.cos((SPEC.OUTER_DEG * Math.PI) / 180);

/**
 * The light of one beam on a face square to it at `distanceM` along its axis,
 * in the renderer's linear units at gain 1: `POWER` at `REF_M`, falling by
 * the square of the distance, softened inside `CORE_M` so the lamp itself is
 * finite, and cut by a compact window at `REACH_M`. The shader's own
 * function, for the tests that hold a pool's level.
 */
export function beamIrradiance(distanceM: number): number {
  const reach = distanceM / SPEC.REACH_M;
  if (reach >= 1) return 0;
  const window = (1 - reach * reach) ** 2;
  return (
    (SPEC.POWER * window * SPEC.REF_M * SPEC.REF_M) /
    (distanceM * distanceM + SPEC.CORE_M * SPEC.CORE_M)
  );
}

type Point = { x: number; y: number; z: number };

/**
 * What the ground leaves of a beam at `at`: the shader's own walk, for the
 * tests that hold a shadow. `steps` reads of `groundY` along the line to the
 * lamp, each asking how far the line clears the ground against how far it
 * has come, so a shadow's edge widens with the distance from what casts it.
 */
export function groundShade(
  groundY: (x: number, z: number) => number,
  at: Point,
  lamp: Point,
  steps: number = SPEC.SHADOW.STEPS
): number {
  const reach = Math.hypot(lamp.x - at.x, lamp.y - at.y, lamp.z - at.z);
  let open = 1;
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const y = at.y + (lamp.y - at.y) * t;
    const ground = groundY(at.x + (lamp.x - at.x) * t, at.z + (lamp.z - at.z) * t);
    open = Math.min(
      open,
      ((y - ground + SPEC.SHADOW.LIFT_M) * SPEC.SHADOW.SHARPNESS) / (t * reach)
    );
  }
  return Math.min(1, Math.max(0, open));
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * What the hulls leave of a beam at `at`: the shader's own test. How near
 * the line from the point to the lamp passes each hull's keel line, against
 * half its beam. `own` is the hull that throws the beam, which is behind its
 * lamp and is passed over.
 */
export function hullShade(
  occluders: readonly SearchlightOccluder[],
  own: number,
  at: Point,
  lamp: Point
): number {
  const d1 = { x: lamp.x - at.x, y: lamp.y - at.y, z: lamp.z - at.z };
  const dot = (p: Point, q: Point): number => p.x * q.x + p.y * q.y + p.z * q.z;
  const clamp = (v: number): number => Math.min(1, Math.max(0, v));
  const a = dot(d1, d1);
  let open = 1;
  for (const hull of occluders) {
    if (hull.hull === own) continue;
    const d2 = { x: hull.bx - hull.ax, y: hull.by - hull.ay, z: hull.bz - hull.az };
    const r = { x: at.x - hull.ax, y: at.y - hull.ay, z: at.z - hull.az };
    const e = dot(d2, d2);
    const f = dot(d2, r);
    const c = dot(d1, r);
    const b = dot(d1, d2);
    const denom = a * e - b * b;
    let s = denom > 1e-4 ? clamp((b * f - c * e) / denom) : 0;
    const t = clamp((b * s + f) / Math.max(e, 1e-4));
    s = clamp((b * t - c) / Math.max(a, 1e-4));
    const gap = Math.hypot(
      at.x + d1.x * s - (hull.ax + d2.x * t),
      at.y + d1.y * s - (hull.ay + d2.y * t),
      at.z + d1.z * s - (hull.az + d2.z * t)
    );
    const [whole, gone] = SPEC.SHADOW.HULL_EDGE;
    open = Math.min(open, smoothstep(hull.radiusM * whole, hull.radiusM * gone, gap));
  }
  return open;
}

/** The ground's shadow on the line from `at` to a lamp, in `steps` reads of its heights. */
const groundShadowGlsl = (name: string, steps: number): string =>
  [
    `float ${name}( vec3 at, vec3 lamp ) {`,
    '  vec3 span = lamp - at;',
    '  float reach = length( span );',
    '  float open = 1.0;',
    `  for ( int i = 1; i <= ${steps}; i ++ ) {`,
    // Never at the point itself, nor at the lamp, which hangs in open water.
    `    float t = float( i ) / ${glsl(steps + 1)};`,
    '    vec3 p = at + span * t;',
    '    float ground = textureLod( tSearchGround, p.xz / uSearchMap, 0.0 ).r;',
    // How far the line clears the ground, against how far it has come: a
    // shadow's edge widens with the distance from what casts it.
    `    open = min( open, ( p.y - ground + ${glsl(SPEC.SHADOW.LIFT_M)} ) * ${glsl(SPEC.SHADOW.SHARPNESS)} / ( t * reach ) );`,
    '  }',
    '  return clamp( open, 0.0, 1.0 );',
    '}',
  ].join('\n');

/**
 * The beams, as GLSL for any program that knows a point in the world's
 * frame. `echoesSearchBeam` is one beam's light square to itself at a point,
 * unshadowed; `echoesSearchShade` and `echoesSearchShadeCoarse` are what the
 * ground and the hulls leave of it, the second in fewer reads for the cone
 * pass's many; `echoesSearchlight` is their sum on a face.
 */
export const SEARCHLIGHT_GLSL = [
  `#define ECHOES_SEARCHLIGHTS ${SPEC.MAX}`,
  `#define ECHOES_SEARCH_HULLS ${SPEC.OCCLUDERS}`,
  'uniform int uSearchCount;',
  'uniform vec4 uSearchAt[ ECHOES_SEARCHLIGHTS ];',
  'uniform vec4 uSearchAim[ ECHOES_SEARCHLIGHTS ];',
  'uniform vec4 uSearchGlow[ ECHOES_SEARCHLIGHTS ];',
  'uniform int uSearchHullCount;',
  'uniform vec4 uSearchHullA[ ECHOES_SEARCH_HULLS ];',
  'uniform vec4 uSearchHullB[ ECHOES_SEARCH_HULLS ];',
  'uniform sampler2D tSearchGround;',
  'uniform vec2 uSearchMap;',
  'vec3 echoesSearchBeam( int i, vec3 at, out vec3 toLamp ) {',
  '  vec3 span = uSearchAt[ i ].xyz - at;',
  '  float d2 = dot( span, span );',
  '  toLamp = span * inversesqrt( max( d2, 1e-6 ) );',
  `  float cone = smoothstep( ${glsl(COS_OUTER)}, ${glsl(COS_INNER)}, dot( - toLamp, uSearchAim[ i ].xyz ) );`,
  `  float window = max( 0.0, 1.0 - d2 / ${glsl(SPEC.REACH_M * SPEC.REACH_M)} );`,
  `  return uSearchGlow[ i ].rgb * ( cone * window * window * ${glsl(SPEC.REF_M * SPEC.REF_M)} / ( d2 + ${glsl(SPEC.CORE_M * SPEC.CORE_M)} ) );`,
  '}',
  groundShadowGlsl('echoesSearchGround', SPEC.SHADOW.STEPS),
  groundShadowGlsl('echoesSearchGroundCoarse', SPEC.SHADOW.VOLUME_STEPS),
  // A hull in the way: how near the line from the point to the lamp passes
  // its keel line, against half its beam. The beam's own hull is behind its
  // lamp and is passed over.
  'float echoesSearchHulls( int i, vec3 at ) {',
  '  vec3 lamp = uSearchAt[ i ].xyz;',
  '  int own = int( uSearchAim[ i ].w );',
  '  vec3 d1 = lamp - at;',
  '  float a = dot( d1, d1 );',
  '  float open = 1.0;',
  '  for ( int h = 0; h < ECHOES_SEARCH_HULLS; h ++ ) {',
  '    if ( h >= uSearchHullCount ) break;',
  '    if ( h == own ) continue;',
  '    vec3 stern = uSearchHullA[ h ].xyz;',
  '    vec3 d2 = uSearchHullB[ h ].xyz - stern;',
  '    vec3 r = at - stern;',
  '    float e = dot( d2, d2 );',
  '    float f = dot( d2, r );',
  '    float c = dot( d1, r );',
  '    float b = dot( d1, d2 );',
  '    float denom = a * e - b * b;',
  '    float s = denom > 1e-4 ? clamp( ( b * f - c * e ) / denom, 0.0, 1.0 ) : 0.0;',
  '    float t = clamp( ( b * s + f ) / max( e, 1e-4 ), 0.0, 1.0 );',
  '    s = clamp( ( b * t - c ) / max( a, 1e-4 ), 0.0, 1.0 );',
  '    float gap = distance( at + d1 * s, stern + d2 * t );',
  '    float radius = uSearchHullA[ h ].w;',
  `    open = min( open, smoothstep( radius * ${glsl(SPEC.SHADOW.HULL_EDGE[0])}, radius * ${glsl(SPEC.SHADOW.HULL_EDGE[1])}, gap ) );`,
  '  }',
  '  return open;',
  '}',
  'float echoesSearchShade( int i, vec3 at ) {',
  '  return echoesSearchGround( at, uSearchAt[ i ].xyz ) * echoesSearchHulls( i, at );',
  '}',
  'float echoesSearchShadeCoarse( int i, vec3 at ) {',
  '  return echoesSearchGroundCoarse( at, uSearchAt[ i ].xyz ) * echoesSearchHulls( i, at );',
  '}',
  // Every beam's light on a face at `at` looking along `normal`, both in the
  // world's frame. A face in no beam reads nothing past the cone's test.
  'vec3 echoesSearchlight( vec3 at, vec3 normal ) {',
  '  vec3 sum = vec3( 0.0 );',
  '  for ( int i = 0; i < ECHOES_SEARCHLIGHTS; i ++ ) {',
  '    if ( i >= uSearchCount ) break;',
  '    vec3 toLamp;',
  '    vec3 beam = echoesSearchBeam( i, at, toLamp ) * max( 0.0, dot( normal, toLamp ) );',
  '    if ( beam.r + beam.g + beam.b <= 0.0 ) continue;',
  '    sum += beam * echoesSearchShade( i, at );',
  '  }',
  '  return sum;',
  '}',
].join('\n');
