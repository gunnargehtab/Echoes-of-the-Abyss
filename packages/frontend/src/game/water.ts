/**
 * The water as a medium — docs/art-direction.md "Reading the Water" (#836).
 *
 * Until this module the conn view had a *distance* fog over geometry and a
 * flat clear colour everywhere else, so the column between the camera and
 * what it was looking at was drawn by nothing at all. Under the old pinned
 * 55° that never showed, because the seabed filled the frame; the free camera
 * (docs/free-camera.md) put open water in most of it and the void became the
 * picture.
 *
 * Three terms, one rule. The rule is the seabed's — **depth is luminance**
 * (docs/art-direction.md "Reading the Sea Floor") — applied to the water
 * rather than to the ground, so the two agree instead of competing:
 *
 * 1. `WATER_RAMP`, depth to colour. One table, read by every term here.
 * 2. The fog over geometry, whose *colour* is that ramp sampled at the water
 *    the ray actually crossed rather than one constant for the whole map.
 * 3. The backdrop, which draws the same water where there is no geometry at
 *    all — and dissolves the horizon, because it samples the ramp by exactly
 *    the rule the fog does and therefore converges to the same colour the far
 *    seabed is fading into.
 *
 * Marine snow rides along as the fourth: the medium you can *feel*, because
 * it is the only one of the four that parallaxes when the camera moves.
 *
 * **Texture, not information** (docs/art-direction.md, the same law the
 * seabed relief is under). The simulation never reads any of this, no
 * gameplay quantity derives from it, and the ramp carries no hue of its own:
 * hue belongs to the biome, and the biome is what the Echo Layer prices sound
 * by. The water is one blue that changes brightness, so it can never be
 * mistaken for a propagation factor.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  ShaderChunk,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { DEPTH, LID, THERMOCLINE } from '@echoes/shared';
import { DEPTH_VISUAL_M_PER_M } from './perspectiveTerrain.ts';

// -------------------------------------------------------------- the ramp

interface WaterStop {
  readonly depthM: number;
  /** Authored in sRGB, like every other colour in the palette. */
  readonly srgb: number;
}

/**
 * The column, top to bottom — SPEC by reference: docs/art-direction.md
 * "Reading the Water" names this table as the ramp it describes, the way it
 * names `seabed.ts` for the biome relief. The stops are TUNABLE; the shape is
 * not.
 *
 * Three of the six depths are the column's own rather than an artist's. The
 * **Lid** (150 m) is where the water turns sour, and is the brightest water a
 * hull can loiter in. The **thermocline** (1,200 m) is the column's one
 * physical boundary — it splits the map acoustically in two — and is where
 * the ramp puts its knee: below it the light story is over. **3,000 m** is the
 * map floor, and its colour is exactly `UI.background`, so the deep end of the
 * new ramp is the flat colour the game already had. Nothing about the abyss
 * changes; the whole change is in the water above it, which is where the void
 * was showing.
 *
 * Reading the two gameplay depths from the constants rather than copying them
 * is deliberate: the water's shape should agree with the column's physics
 * without asserting anything the physics does not (no line is drawn at the
 * thermocline — it is an inflection, not a boundary).
 *
 * The whole ramp is **dark**, and the first cut was not: a brighter top stop
 * put the loudest thing in a low-pitch frame above the horizon, where the
 * water became the picture and the seabed the backdrop. Terrain is already
 * held quieter than contacts (docs/art-direction.md, "Reading the Sea Floor");
 * the water is quieter than terrain, and the gradient rather than the
 * brightness is what does the reading.
 */
const WATER_RAMP: readonly WaterStop[] = [
  { depthM: 0, srgb: 0x0c2a34 },
  { depthM: LID.DEPTH_M, srgb: 0x0a2430 },
  { depthM: 600, srgb: 0x071a25 },
  { depthM: THERMOCLINE.DEPTH_M, srgb: 0x05121b },
  { depthM: 2000, srgb: 0x040c13 },
  { depthM: DEPTH.MAX_M, srgb: 0x03080e },
];

/** The renderer's working space is linear (`outputColorSpace = SRGBColorSpace`
 * converts on the way out), so every authored sRGB stop is decoded once here
 * rather than per fragment. */
function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const LINEAR_STOPS: readonly Rgb[] = WATER_RAMP.map(({ srgb }) => ({
  r: srgbToLinear(((srgb >> 16) & 0xff) / 255),
  g: srgbToLinear(((srgb >> 8) & 0xff) / 255),
  b: srgbToLinear((srgb & 0xff) / 255),
}));

function smoothstepAt(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * The water's colour at a depth, in the renderer's linear working space.
 *
 * Chained `smoothstep` mixes rather than a linear piecewise lerp: the ramp is
 * then C1-continuous, so a camera sinking through a stop sees no crease. The
 * GLSL below is generated from the same table by the same algorithm, which is
 * what keeps the CPU-side callers (the ember fade, the scene's clear colour)
 * and the shaders from ever disagreeing about what colour the water is.
 */
export function waterColorAt(depthM: number): Rgb {
  const d = Math.min(DEPTH.MAX_M, Math.max(0, depthM));
  let { r, g, b } = LINEAR_STOPS[0]!;
  for (let i = 1; i < LINEAR_STOPS.length; i++) {
    const t = smoothstepAt(WATER_RAMP[i - 1]!.depthM, WATER_RAMP[i]!.depthM, d);
    const stop = LINEAR_STOPS[i]!;
    r += (stop.r - r) * t;
    g += (stop.g - g) * t;
    b += (stop.b - b) * t;
  }
  return { r, g, b };
}

/** Relative luminance, the coefficients the palette's contrast work uses. */
export function waterLuminanceAt(depthM: number): number {
  const { r, g, b } = waterColorAt(depthM);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const f = (value: number): string => {
  const text = value.toFixed(6);
  // GLSL has no implicit int-to-float, so every literal keeps its point.
  return text.includes('.') ? text : `${text}.0`;
};

/**
 * `WATER_RAMP` as GLSL, compiled in as literals rather than uploaded as
 * uniforms.
 *
 * The ramp is static — it is the column, not a setting — and a uniform added
 * to a *global* shader chunk is a uniform three.js does not know to bind, so
 * every fogged material in the scene would have to be wired by hand. Baking
 * the one table into the source keeps a single source of truth and adds no
 * binding surface at all.
 */
function rampGlsl(): string {
  const lines = [
    'float echoesWaterDepthM( const in float worldY ) {',
    `  return -worldY / ${f(DEPTH_VISUAL_M_PER_M)};`,
    '}',
    'vec3 echoesWaterColor( const in float depthM ) {',
    `  float d = clamp( depthM, 0.0, ${f(DEPTH.MAX_M)} );`,
    `  vec3 c = vec3( ${f(LINEAR_STOPS[0]!.r)}, ${f(LINEAR_STOPS[0]!.g)}, ${f(LINEAR_STOPS[0]!.b)} );`,
  ];
  for (let i = 1; i < LINEAR_STOPS.length; i++) {
    const stop = LINEAR_STOPS[i]!;
    lines.push(
      `  c = mix( c, vec3( ${f(stop.r)}, ${f(stop.g)}, ${f(stop.b)} ), ` +
        `smoothstep( ${f(WATER_RAMP[i - 1]!.depthM)}, ${f(WATER_RAMP[i]!.depthM)}, d ) );`
    );
  }
  lines.push('  return c;', '}');
  return lines.join('\n');
}

/** Exposed for the test that holds the generated GLSL to the same table the
 * TypeScript ramp reads. */
export const WATER_RAMP_GLSL = rampGlsl();

// ---------------------------------------------------------------- reach

/**
 * How far the water lets you see, in world units, at a given dolly — TUNABLE.
 *
 * **The colour is absolute and the reach is relative**, and the split is the
 * whole of this module's honesty. A metre of depth is always the same colour,
 * at every zoom, so "depth is luminance" is never scaled or lied about. How
 * far the medium reaches *does* follow the frame, because the alternative
 * fails gate 7: a true clear-water visibility of a couple of kilometres makes
 * the strategic dolly — which puts the eye twenty kilometres out — a uniform
 * black wash with the player's own base inside it, and a chart nobody can read
 * is not a view. Readability outranks richness
 * (docs/graphics-standards.md gate 7), so the reach breathes and the ramp does
 * not.
 *
 * `WATER_REACH_DOLLIES` is picked so the thing the camera is *pointed at*
 * stays crisp: with exp² falloff, a subject one dolly away sits at
 * 1 - exp(-(1/3.2)²) ≈ 9% fog, and the frame dissolves from about three
 * dollies out. The floor stops a player who dollies all the way in from
 * losing the hull they dollied in to see.
 */
export const WATER_REACH_DOLLIES = 3.2;
export const WATER_REACH_MIN_M = 900;

export function waterReachM(dollyM: number): number {
  return Math.max(WATER_REACH_MIN_M, dollyM * WATER_REACH_DOLLIES);
}

/**
 * The `FogExp2` density the geometry fog runs at: `1 - exp(-(d/reach)²)`, so
 * density is one over the reach.
 *
 * `waterDensity` is the player's setting (0-1) and is a different quantity
 * from the `FogExp2.density` this returns: it divides into the *reach* rather
 * than scaling the result, so turning the water down makes it **clearer** —
 * the medium stops hiding distance — instead of leaving a uniform half-fog
 * over everything. At 0 there is no distance term at all.
 */
export function fogDensityFor(dollyM: number, waterDensity: number): number {
  if (waterDensity <= 0) return 0;
  return Math.min(1, waterDensity) / waterReachM(dollyM);
}

/**
 * Transmittance through `distanceM` of water — the fraction of an emitter's
 * light that survives the swim.
 *
 * The CPU half of the fog, for the one thing the shader must not do to: an
 * *additive* light. Mixing a vent ember toward the water colour would have a
 * distant vent glowing brighter the murkier the water got, so the embers opt
 * out of the fog chunk and multiply by this instead. Extinction without
 * inscatter is what an emitter seen through water actually does.
 */
export function waterTransmittance(distanceM: number, reachM: number): number {
  const t = distanceM / Math.max(1, reachM);
  return Math.exp(-t * t);
}

// ------------------------------------------------------------- the fog

let fogInstalled = false;

/**
 * Teach three.js's fog that water has a depth.
 *
 * Patched on the global `ShaderChunk` rather than per material, because the
 * fog has to reach everything the scene draws — terrain, roster models,
 * instanced props, ordnance, depth cues, chart lines — and patching each of
 * those is a list that goes stale the first time something is added. It is
 * also why there are no new uniforms here: a global chunk can only use what
 * three.js already binds, which is `fogDensity`, `viewMatrix` and
 * `cameraPosition`.
 *
 * Idempotent, and called before the first material compiles.
 */
export function installWaterFog(): void {
  if (fogInstalled) return;
  fogInstalled = true;

  ShaderChunk.fog_pars_vertex = [
    ShaderChunk.fog_pars_vertex,
    '#ifdef USE_FOG',
    '  varying float vWaterWorldY;',
    '#endif',
  ].join('\n');

  ShaderChunk.fog_vertex = [
    ShaderChunk.fog_vertex,
    '#ifdef USE_FOG',
    // World height with no new uniform and no assumption about how the vertex
    // got where it is — which matters, because `transformed` is pre-instance
    // and half this scene is instanced. The view matrix is rigid, so
    // world = (viewPos - t) * R; in GLSL `v * M` is `transpose(M) * v`, so the
    // y component is one dot against the matrix's second column.
    '  vWaterWorldY = dot( viewMatrix[ 1 ].xyz, mvPosition.xyz - viewMatrix[ 3 ].xyz );',
    '#endif',
  ].join('\n');

  ShaderChunk.fog_pars_fragment = [
    ShaderChunk.fog_pars_fragment,
    '#ifdef USE_FOG',
    '  varying float vWaterWorldY;',
    WATER_RAMP_GLSL,
    '#endif',
  ].join('\n');

  ShaderChunk.fog_fragment = [
    '#ifdef USE_FOG',
    '  #ifdef FOG_EXP2',
    '    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );',
    '  #else',
    '    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );',
    '  #endif',
    // The fragment fades into the water it is *standing in*, which is the one
    // anchor in the frame that is always a real depth. The eye's is not: the
    // column is drawn at 0.22 world-metres per metre, so any dolly past a few
    // hundred units lifts the camera clear of the surface and its world height
    // stops being a depth at all (docs/free-camera.md §9). Reading it as one
    // faded the far seabed toward *surface* colour, which is the brightest
    // thing the ramp has.
    //
    // What this buys, beyond correctness: a trench and the shelf beside it are
    // at the same distance and fade to different darknesses, so "depth is
    // luminance" now governs the air between the camera and the ground as well
    // as the ground itself.
    '  vec3 waterAtFragment = echoesWaterColor( echoesWaterDepthM( vWaterWorldY ) );',
    '  gl_FragColor.rgb = mix( gl_FragColor.rgb, waterAtFragment, fogFactor );',
    '#endif',
  ].join('\n');
}

// --------------------------------------------------------- the backdrop

/**
 * The water where there is no geometry.
 *
 * One screen-filling triangle pair, one draw call, no depth. Every pixel
 * unprojects to a world-space ray and asks the ramp what colour the water is
 * one reach along it — the *same* question `fog_fragment` asks — which is why
 * the horizon stops existing: the far seabed fades toward the colour the sky
 * behind it already is, so there is no edge left to see. Looking down darkens,
 * looking up brightens toward the Lid, and both happen because the ray goes
 * there, not because the screen has a top and a bottom.
 *
 * That last part is the reason this is a world-ray shader rather than a
 * vertical screen gradient, which would have been a third of the code: a
 * screen gradient is an atmosphere pass that rotates with the projection, and
 * docs/free-camera.md §5 keeps that prohibition verbatim — the player may turn
 * the camera, an effect may not.
 */
/**
 * How much depth the backdrop spends over a full quarter-turn of ray — the
 * metres between a ray pointing level and one pointing straight up. TUNABLE.
 *
 * It is a *presentation* rate rather than a distance, and it has to be,
 * because the column is drawn at 0.22 world-metres per metre. Grading the
 * backdrop by the water a ray physically crosses — the first cut here — spends
 * the entire ramp within about a degree of the horizon: over one reach of
 * 8,000 units even a 2° ray climbs 1,300 m of depth, so the frame gets a hard
 * line and a flat wash above it instead of a gradient. Choosing the rate
 * directly spreads the ramp across the frame the pitch band actually shows.
 *
 * It still turns with the world and not with the screen — `ray` is a
 * world-space direction, so looking down darkens at any yaw and the
 * projection is never rotated by an effect (docs/free-camera.md §5).
 */
const BACKDROP_SPAN_M = 2200;

export class WaterBackdrop {
  readonly mesh: Mesh;
  private readonly uniforms = {
    uInvViewProj: { value: new Matrix4() },
    uFocusDepthM: { value: 0 },
  };

  constructor() {
    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader: [
        'uniform mat4 uInvViewProj;',
        'varying vec4 vFarPoint;',
        'void main() {',
        // The quad's corners are already NDC, so no projection is wanted. The
        // unprojected far-plane point is passed *before* its perspective
        // divide: the homogeneous vector is linear in screen space and the
        // divided one is not, so dividing in the fragment is what makes the
        // interpolation exact rather than merely close.
        '  vFarPoint = uInvViewProj * vec4( position.xy, 1.0, 1.0 );',
        '  gl_Position = vec4( position.xy, 1.0, 1.0 );',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform float uFocusDepthM;',
        'varying vec4 vFarPoint;',
        WATER_RAMP_GLSL,
        'void main() {',
        '  vec3 ray = normalize( vFarPoint.xyz / vFarPoint.w - cameraPosition );',
        // Anchored to the focus, and graded by which way the ray points. The
        // focus is the one depth in the frame that is both the player's own
        // statement and always in water (docs/free-camera.md §4 clamps it to
        // the column); the eye is neither, for the reason `fog_fragment`
        // above gives.
        `  float depthM = uFocusDepthM - ray.y * ${f(BACKDROP_SPAN_M)};`,
        '  gl_FragColor = vec4( echoesWaterColor( depthM ), 1.0 );',
        '  #include <colorspace_fragment>',
        '}',
      ].join('\n'),
    });
    this.mesh = new Mesh(new PlaneGeometry(2, 2), material);
    // No bounds to cull against: the quad lives in clip space, so its object
    // space says nothing about where it lands.
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  update(camera: PerspectiveCamera, focusDepthM: number): void {
    this.uniforms.uInvViewProj.value.multiplyMatrices(
      camera.matrixWorld,
      camera.projectionMatrixInverse
    );
    this.uniforms.uFocusDepthM.value = focusDepthM;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
  }
}

// ------------------------------------------------------- marine snow

/** TUNABLE — motes in the cloud. One draw call whatever this says; the cost
 * is a few thousand vertices and about as many pixels. */
export const MARINE_SNOW_COUNT = 7000;
/** TUNABLE — the wrapped slab's side on the plan, as a multiple of the water's
 * reach, so the snow fills the water the player can see through and no more. */
const SNOW_SPREAD_REACHES = 0.6;
const SNOW_SPREAD_MIN_M = 500;
const SNOW_SPREAD_MAX_M = 20_000;
/** The column, in world units: the cloud's height is the ocean's, always. */
const COLUMN_HEIGHT = DEPTH.MAX_M * DEPTH_VISUAL_M_PER_M;
/** TUNABLE — how much brighter than its own water a mote is. A ratio rather
 * than a brightness: the backdrop behind it darkens by the same ramp, so one
 * number keeps the snow equally readable at 200 m and at 2,800 m, and equally
 * quiet. */
const SNOW_GAIN = 3.4;
/** TUNABLE — mote diameter in world units before perspective, and the widest
 * it is allowed to rasterise. The cap is what stops a mote that drifts close
 * to the lens from becoming a blob over the fleet. */
const SNOW_MOTE_M = 2.6;
const SNOW_MAX_PX = 2.6;

/**
 * Where the cloud fades out: metres of the eye *above* the surface — TUNABLE.
 *
 * Marine snow is a near-field cue, and at the home dolly the camera is nine
 * kilometres of drawn column above the water looking down at the seabed. Every
 * mote there lands in front of lit ground and brightens it, which is the
 * failure gate 7 names: terrain may not shout, and the water may not shout
 * over terrain. Fading the cloud out as the camera leaves the column costs the
 * overview nothing and makes descending into the water feel like something,
 * which is the whole argument of docs/free-camera.md §7 — the low shot is the
 * cheapest dread available, and this is part of what it buys.
 */
const SNOW_FADE_FROM_M = 800;
const SNOW_FADE_TO_M = 5000;
/** TUNABLE — the sink, as a fraction of the whole column per second: a mote
 * takes about eight minutes to fall three kilometres. Slow enough to be a
 * suspicion rather than weather, and against the column rather than the dolly
 * so a zoom never changes how fast the water is falling. */
const SNOW_SINK_PER_S = 0.002;

/**
 * Marine snow: detritus in the near column.
 *
 * The term that does what no fog can, because it is the only one with
 * structure to parallax — a camera sliding past motes that hold still is what
 * a brain reads as "inside a medium", and it is most of why the low shot feels
 * like water rather than like a gradient.
 *
 * **It sinks, and it only sinks.** A lateral drift would have been prettier
 * and is not available: a current is a real mechanic with an *authored
 * bearing* published to the client (docs/hazards.md, "How a current works"),
 * so moving particulate sideways states a direction — and would state the
 * wrong one everywhere outside a current site. Falling states nothing, because
 * everything falls. The same reasoning is why the motes take their colour from
 * the water rather than from a biome.
 *
 * Wrapping, sinking, fading and sizing all happen in the vertex shader, so a
 * frame costs three uniform writes rather than three thousand — which is what
 * keeps this off the Termux floor's CPU budget as well as gate 6's.
 */
export class MarineSnow {
  readonly points: Points;
  private readonly uniforms = {
    uEye: { value: new Vector3() },
    /** Plan centre of the slab: the focus, not the eye. */
    uFocus: { value: new Vector2() },
    uSpreadM: { value: 1200 },
    uSinkM: { value: 0 },
    uStrength: { value: 1 },
    uReachM: { value: 4000 },
    uPixelScale: { value: 600 },
    uSizePx: { value: new Vector2(1, 3.5) },
  };
  private reducedMotion = false;
  private sunkM = 0;
  private lastTickAt: number | null = null;

  constructor(count: number = MARINE_SNOW_COUNT) {
    // Positions are the unit cube; the shader scales them to whatever the box
    // is this frame, so a dolly never rebuilds the buffer.
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    // A fixed generator, not Math.random: two clients showing the same water
    // is worth more than a per-session cloud, and a deterministic field is one
    // fewer thing a screenshot review has to hold still.
    let seed = 0x9e3779b9;
    const next = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    for (let i = 0; i < count; i++) {
      positions[i * 3] = next();
      positions[i * 3 + 1] = next();
      positions[i * 3 + 2] = next();
      sizes[i] = 0.55 + next() * 0.9;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('snowSize', new BufferAttribute(sizes, 1));

    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      // Depth-tested so a mote behind the seabed stays behind it, and
      // depth-*write* off so motes never occlude each other.
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: [
        'uniform vec3 uEye;',
        'uniform vec2 uFocus;',
        'uniform float uSpreadM;',
        'uniform float uSinkM;',
        'uniform float uStrength;',
        'uniform float uReachM;',
        'uniform float uPixelScale;',
        'uniform vec2 uSizePx;',
        'attribute float snowSize;',
        'varying vec3 vMote;',
        'varying float vAlpha;',
        WATER_RAMP_GLSL,
        'void main() {',
        // A slab, not a cube. The ocean is 3,000 m deep and drawn at 0.22, so
        // the water is 660 world units thick against a map eight thousand
        // across: a cube big enough to fill the frame would put most of its
        // motes above the surface or under the seabed. Height is the column's,
        // fixed and never wrapped against the camera — the ocean does not move
        // when the eye does.
        `  float yy = mod( position.y * ${f(COLUMN_HEIGHT)} + uSinkM, ${f(COLUMN_HEIGHT)} );`,
        // The plan wraps around the **focus** rather than the eye, for the
        // reason the backdrop anchors there: at a long dolly the eye is out of
        // the water entirely, and the snow belongs in the water the player is
        // looking at. The wrap is in world space, which is the whole point —
        // between wraps a mote holds still while the camera moves past it, and
        // that stillness is the parallax that reads as a medium.
        '  vec2 plan = mod( position.xz * uSpreadM - uFocus + 0.5 * uSpreadM, uSpreadM )',
        '    - 0.5 * uSpreadM;',
        '  vec3 world = vec3( uFocus.x + plan.x, -yy, uFocus.y + plan.y );',
        '  float dist = distance( world, uEye );',
        '  vec3 water = echoesWaterColor( echoesWaterDepthM( world.y ) );',
        '  float trans = exp( - ( dist / uReachM ) * ( dist / uReachM ) );',
        // Two fades, each closing a way the trick could show: the slab's plan
        // edge, so a wrap is never a pop, and the water itself, so the far
        // cloud goes where the far seabed goes.
        '  float edge = 1.0 - smoothstep( 0.34 * uSpreadM, 0.5 * uSpreadM, length( plan ) );',
        // `snowSize` pays twice — diameter and brightness — because the point
        // size clamps within a couple of pixels at any distance a mote is
        // visible at, so on its own it varies nothing a player can see and the
        // cloud reads as a starfield. Brightness is what breaks the rank.
        '  vAlpha = uStrength * edge * trans * snowSize;',
        '  vMote = water;',
        '  vec4 mvPosition = modelViewMatrix * vec4( world, 1.0 );',
        '  gl_Position = projectionMatrix * mvPosition;',
        '  gl_PointSize = clamp( uPixelScale * snowSize / max( dist, 1.0 ), uSizePx.x, uSizePx.y );',
        '}',
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vMote;',
        'varying float vAlpha;',
        'void main() {',
        '  if ( vAlpha <= 0.002 ) discard;',
        // A point rasterises square; a mote is a speck. Soften the rim rather
        // than clipping it, or the cloud reads as pixel dust.
        '  float r = length( gl_PointCoord - vec2( 0.5 ) );',
        `  float sprite = smoothstep( 0.5, 0.08, r );`,
        `  gl_FragColor = vec4( vMote * ${f(SNOW_GAIN)} * vAlpha * sprite, 1.0 );`,
        '  #include <colorspace_fragment>',
        '}',
      ].join('\n'),
    });

    this.points = new Points(geometry, material);
    // The cloud is placed by the shader from a unit cube, so its object-space
    // bounds are a 1 m box at the origin and every cull would be wrong.
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }

  /** Reduced motion (docs/ui-ux.md §11) stops the sink and keeps the cloud:
   * the parallax is the part that reads as water, and it belongs to the
   * camera the player is moving rather than to an animation. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /**
   * Per frame: where the eye is, how far the water reaches, how strong the
   * player asked for it, and the viewport's projection scale —
   * `drawingBufferHeight / (2 tan(fov/2))`, the pixels a world unit spans at
   * one unit out, which is what turns a mote's world size into a point size.
   */
  update(
    now: number,
    eye: Vector3,
    focusX: number,
    focusZ: number,
    reachM: number,
    strength: number,
    projectionScalePx: number,
    pixelRatio: number
  ): void {
    const spreadM = Math.min(
      SNOW_SPREAD_MAX_M,
      Math.max(SNOW_SPREAD_MIN_M, reachM * SNOW_SPREAD_REACHES)
    );
    if (this.lastTickAt !== null && !this.reducedMotion) {
      // Clamped so a tab that was hidden, or a first frame after a stall, does
      // not teleport the whole cloud.
      const dt = Math.min(0.25, Math.max(0, (now - this.lastTickAt) / 1000));
      this.sunkM += dt * COLUMN_HEIGHT * SNOW_SINK_PER_S;
      // Wrapped on the CPU too, or the uniform grows without bound over a long
      // match and takes the float's precision with it.
      this.sunkM %= COLUMN_HEIGHT;
    }
    this.lastTickAt = now;
    this.uniforms.uEye.value.copy(eye);
    this.uniforms.uFocus.value.set(focusX, focusZ);
    this.uniforms.uSpreadM.value = spreadM;
    this.uniforms.uSinkM.value = this.sunkM;
    // The eye's height above the surface, in metres of column, is how far
    // out of the water the camera has climbed — see `SNOW_FADE_FROM_M`.
    const aboveM = Math.max(0, eye.y) / DEPTH_VISUAL_M_PER_M;
    const near = 1 - smoothstepAt(SNOW_FADE_FROM_M, SNOW_FADE_TO_M, aboveM);
    this.uniforms.uStrength.value = near * Math.min(1, Math.max(0, strength));
    this.uniforms.uReachM.value = reachM;
    this.uniforms.uPixelScale.value = SNOW_MOTE_M * projectionScalePx;
    // `gl_PointSize` is device pixels, so the clamp is too — a mote must not
    // shrink to a sub-pixel flicker on a 3× phone screen.
    this.uniforms.uSizePx.value.set(pixelRatio, SNOW_MAX_PX * pixelRatio);
    this.points.visible = strength > 0 && near > 0.002;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as ShaderMaterial).dispose();
  }
}
