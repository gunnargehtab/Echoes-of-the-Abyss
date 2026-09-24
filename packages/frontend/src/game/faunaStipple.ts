/**
 * Public life as stipple — docs/map-visuals.md §8, Phase 3 of §10 (#867).
 *
 * Tetherjelly fields and Lampfry shoals are public chart data
 * (docs/bestiary.md §4), and until this module the chart drew them as a filled
 * disc and five motes lying on the seabed. §8 draws them where they live, in
 * the water column at their public working depth, as clouds of pale dots:
 * bells and trailing tentacles for a field, a mote cloud for a shoal. That is
 * also what a sonar return *is* — a scatter of points where something gave
 * sound back — which is why the game's life is drawn this way at all.
 *
 * **It changes how they look, never what they say.** Everything here is read
 * off `snapshot.jellies` and `snapshot.shoals`, the public layers every player
 * already receives, and nothing else: a field's true 250 m radius, a shoal's
 * formed or scattered state, both at the depth the server published. The
 * outlines the ladder weighs stay on the chart painter (`EchoRenderer`): the
 * field's rim, one of rung 5's four floor outlines, and a scattered shoal's
 * 300 m trigger ring. The dots are not weighed. §5 weighs a mark by its
 * outline and never by its interior, but a field's bells hang at its working
 * depth while its rim lies on the ground, so from an oblique camera the bloom
 * stands above its footprint rather than inside it. Whether that still counts
 * as the rim's interior, and how a formed shoal with no rim is weighed, are
 * the owner's calls (§10).
 *
 * **Pulse in place; never drift sideways.** A bell contracts and relaxes about
 * its own axis and its tentacles trail with it; a shoal breathes and its motes
 * twinkle. Every motion is a scale about a centre that never moves, and every
 * bell's dots are centred on that axis, so nothing travels across the chart:
 * lateral motion states a current, and a current is a real mechanic with an
 * authored bearing (docs/hazards.md). Marine snow is under the same rule and
 * for the same reason (water.ts).
 *
 * **Gate 6's budget, as §8 sets it.** One `Points` draw per kind, a fixed dot
 * count per field, and the pulse in the vertex shader: a frame costs a handful
 * of uniform writes, and the buffers are rewritten only when a public layer
 * changes — a field or shoal is born or dies, or a shoal scatters or reforms.
 *
 * Rung 5, map furniture (docs/map-visuals.md §5): public, and never an agent.
 * The acoustic veil leaves it alone, because the veil touches ground only
 * (docs/ui-ux.md §4.5) and this is life in the water.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { DRIFT } from '@echoes/shared';
import type { JellyCluster, ShoalTell } from '@echoes/shared';
import { FAUNA_COLOR } from './palette.ts';
import { depthToWorldY } from './perspectiveTerrain.ts';

// ------------------------------------------------------------ the field

/** TUNABLE — bells in one Tetherjelly field. Enough that a field reads as a
 * colony rather than an animal, few enough that each one is still a bell at
 * the survey dolly. */
export const JELLY_BELLS_PER_FIELD = 9;
/** TUNABLE — dots in one bell: the dome, its rim, and the tentacles. */
const BELL_DOME_DOTS = 18;
const BELL_RIM_DOTS = 12;
const TENTACLES = 6;
const DOTS_PER_TENTACLE = 3;
const DOTS_PER_BELL = BELL_DOME_DOTS + BELL_RIM_DOTS + TENTACLES * DOTS_PER_TENTACLE;
/** §8's dot cap per field, whatever the field is doing. */
export const JELLY_DOTS_PER_FIELD = JELLY_BELLS_PER_FIELD * DOTS_PER_BELL;

/**
 * TUNABLE — a bell's size, in world units. A figure, not a measurement: like a
 * hull model it is drawn at its own shape rather than squashed by the column's
 * 0.22 (perspectiveTerrain.ts), which is a statement about *where* in depth a
 * thing is, and the bell's position carries that.
 */
const BELL_RADIUS_M = 22;
const BELL_HEIGHT_M = 16;
const TENTACLE_M = 44;
/**
 * TUNABLE, render-only — how far a bell's centre may sit above or below the
 * depth the server published, in metres of depth, so the bloom has a body in
 * the column rather than lying in one plane. It is not a band anyone
 * published: a bell may be drawn up to this far past the edge of the band its
 * cluster was seeded across (docs/bestiary.md §4).
 */
const BELL_DEPTH_JITTER_M = 40;
/**
 * Where a bell's axis may stand, in metres from the field's centre on the plan.
 * The outermost dot at rest is a bell radius beyond its axis, and the pulse only
 * ever contracts, so this keeps every dot inside the true 250 m at every phase.
 */
export const BELL_AXIS_REACH_M = DRIFT.JELLY_RADIUS_M - BELL_RADIUS_M - 12;

/** TUNABLE — seconds per contraction. Slow: a field is ground that breathes,
 * not an animal that swims. */
export const JELLY_PULSE_S = 6.5;
/** TUNABLE — how far a contraction draws the bell in (a fraction of its
 * radius), how much taller it stands while it does, and how far the tentacles
 * follow. All three are scales about the bell's own axis. */
const BELL_SQUEEZE = 0.22;
const BELL_STRETCH = 0.12;
const TENTACLE_SQUEEZE = 0.35;
/** TUNABLE — radians of lag from the bell to a tentacle's tip, so the trail
 * visibly follows rather than moving as one rigid figure. */
const TENTACLE_LAG = 1.4;
/** TUNABLE — a field's dot brightness, and how much a contraction lifts it. */
const JELLY_GAIN = 0.5;

// ------------------------------------------------------------ the shoal

/** §8's dot cap per shoal, formed or scattered. */
export const SHOAL_DOTS = 72;
/** TUNABLE — a formed shoal's cloud on the plan, and its height, in world
 * units. The old motes sat within ~40 m; the cloud keeps that footprint. */
export const SHOAL_FORMED_RADIUS_M = 40;
const SHOAL_FORMED_HEIGHT_M = 14;
/** TUNABLE — how far a scattered shoal flings its motes, and how dim they go.
 * The scatter is the tell; the 300 m ring stays on the chart painter, drawn at
 * its true size, because the ring and not the cloud is the disclosure. */
export const SHOAL_SCATTERED_RADIUS_M = 120;
const SHOAL_SCATTERED_HEIGHT_M = 40;
export const SHOAL_FORMED_GAIN = 0.9;
export const SHOAL_SCATTERED_GAIN = 0.6;
/** TUNABLE — a shoal breathes faster than a field, and its motes twinkle
 * three times a breath. */
export const SHOAL_PULSE_S = 4;
export const SHOAL_TWINKLE_S = SHOAL_PULSE_S / 3;
const SHOAL_SQUEEZE = 0.08;
const SHOAL_TWINKLE = 0.5;

/**
 * Where the pulse clock wraps, in seconds: a whole number of every period
 * above (8 field beats, 13 shoal breaths, 39 twinkles), so no dot skips at the
 * wrap. Without one the uniform grows for the whole match and takes the
 * float's precision with it. The stipple test holds the arithmetic.
 */
export const PULSE_WRAP_S = 52;

// ------------------------------------------------------------ the dots

/** TUNABLE — a dot's world size before perspective, and the widest it may
 * rasterise. The cap is what keeps a field one dolly-notch from the lens a
 * stipple rather than a spray of blobs. */
const DOT_M = 3.2;
const DOT_MAX_PX = 2.4;

const f = (value: number): string => {
  const text = value.toFixed(6);
  return text.includes('.') ? text : `${text}.0`;
};

/** A seeded generator per field, from its public id, so every client draws
 * the same colony and a screenshot review has one fewer thing to hold still. */
function rngFor(id: number, salt: number): () => number {
  let seed = (Math.imul(id + 1, 0x9e3779b1) ^ salt) >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * One kind's cloud: a `Points` whose vertices are the dots, and whose buffers
 * carry everything the vertex shader needs to place and pulse them.
 *
 * - `position` — the anchor the dot pulses about: a bell's axis, or a shoal's
 *   centre, in world units. Never moved by time.
 * - `aDot` — xyz, the dot's offset from that anchor at rest; w, 0 for a body
 *   dot, or how far down its tentacle a trailing dot is (0-1].
 * - `aSeed` — x, the anchor's phase in radians; y, the dot's brightness.
 */
class StippleCloud {
  readonly points: Points;
  private capacity = 0;
  readonly uniforms: {
    uTime: { value: number };
    uEye: { value: Vector3 };
    uReachM: { value: number };
    uClearness: { value: number };
    uPixelScale: { value: number };
    uSizePx: { value: Vector2 };
    uColor: { value: Color };
  };

  constructor(
    readonly kind: 'jelly' | 'shoal',
    motion: {
      periodS: number;
      squeeze: number;
      stretch: number;
      trailSqueeze: number;
      trailLag: number;
      twinkle: number;
      twinkleS: number;
      lift: number;
    }
  ) {
    this.uniforms = {
      uTime: { value: 0 },
      uEye: { value: new Vector3() },
      uReachM: { value: 4000 },
      uClearness: { value: 1 },
      uPixelScale: { value: 600 },
      uSizePx: { value: new Vector2(1, DOT_MAX_PX) },
      uColor: { value: new Color(FAUNA_COLOR) },
    };
    const omega = (Math.PI * 2) / motion.periodS;
    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      // Depth-tested, so a field behind a ridge stays behind it; depth-*write*
      // off, so dots never occlude each other or the water behind them.
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: [
        'uniform float uTime;',
        'uniform vec3 uEye;',
        'uniform float uReachM;',
        'uniform float uClearness;',
        'uniform float uPixelScale;',
        'uniform vec2 uSizePx;',
        'attribute vec4 aDot;',
        'attribute vec2 aSeed;',
        'varying float vAlpha;',
        'void main() {',
        // 0 at rest, 1 fully contracted. A cosine from rest, so a bell spends
        // most of its period relaxed and contracts in a beat.
        `  float beat = 0.5 - 0.5 * cos( uTime * ${f(omega)} + aSeed.x );`,
        `  float trail = 0.5 - 0.5 * cos( uTime * ${f(omega)} + aSeed.x - aDot.w * ${f(motion.trailLag)} );`,
        '  float body = step( aDot.w, 0.0 );',
        // Every term is a scale about the anchor, and none exceeds 1 on the
        // plan: a dot never reaches past where it rests, and nothing travels.
        `  float squeeze = mix( 1.0 - ${f(motion.trailSqueeze)} * trail, 1.0 - ${f(motion.squeeze)} * beat, body );`,
        `  float stretch = 1.0 + ${f(motion.stretch)} * mix( trail, beat, body );`,
        '  vec3 world = position + vec3( aDot.x * squeeze, aDot.y * stretch, aDot.z * squeeze );',
        '  float dist = distance( world, uEye );',
        // Extinction without inscatter, as the embers take it (water.ts): an
        // additive dot mixed toward the water colour would brighten with murk.
        // `uClearness` is the player's water setting, which divides the reach,
        // so turning the water down can only reveal a field.
        '  float t = dist * uClearness / max( uReachM, 1.0 );',
        '  float trans = exp( - t * t );',
        `  float twinkle = 1.0 - ${f(motion.twinkle)} * ( 0.5 + 0.5 * sin( uTime * ${f((Math.PI * 2) / motion.twinkleS)} + aSeed.x * 7.0 + aSeed.y * 13.0 ) );`,
        `  vAlpha = aSeed.y * trans * twinkle * ( 1.0 + ${f(motion.lift)} * beat );`,
        '  vec4 mvPosition = modelViewMatrix * vec4( world, 1.0 );',
        '  gl_Position = projectionMatrix * mvPosition;',
        '  gl_PointSize = clamp( uPixelScale / max( dist, 1.0 ), uSizePx.x, uSizePx.y );',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor;',
        'varying float vAlpha;',
        'void main() {',
        '  if ( vAlpha <= 0.002 ) discard;',
        // A point rasterises square; a stipple dot is round, and soft at the
        // rim so a cloud of them reads as dots rather than as pixel dust.
        '  float r = length( gl_PointCoord - vec2( 0.5 ) );',
        '  float sprite = smoothstep( 0.5, 0.1, r );',
        '  gl_FragColor = vec4( uColor * vAlpha * sprite, 1.0 );',
        '  #include <colorspace_fragment>',
        '}',
      ].join('\n'),
    });
    this.points = new Points(this.allocate(0), material);
    // Anchors are real world positions, but a dot is drawn up to a tentacle's
    // length from its own, and the bounds three.js would compute know nothing
    // of that. A field is a few hundred vertices; culling it saves nothing.
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    this.points.visible = false;
  }

  /** Fresh buffers for `dots` vertices, rounded up so a colony that grows by
   * one field does not reallocate for every field. */
  private allocate(dots: number): BufferGeometry {
    this.capacity = Math.max(64, Math.ceil(dots / 64) * 64);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.capacity * 3), 3));
    geometry.setAttribute('aDot', new BufferAttribute(new Float32Array(this.capacity * 4), 4));
    geometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(this.capacity * 2), 2));
    geometry.setDrawRange(0, 0);
    return geometry;
  }

  /**
   * Write `dots` vertices through `fill` and draw exactly those. The buffer is
   * replaced only when the colony outgrows it; otherwise the arrays are
   * rewritten in place and flagged once.
   */
  write(
    dots: number,
    fill: (anchor: Float32Array, dot: Float32Array, seed: Float32Array) => void
  ): void {
    if (dots > this.capacity) {
      this.points.geometry.dispose();
      this.points.geometry = this.allocate(dots);
    }
    const geometry = this.points.geometry;
    const anchor = geometry.getAttribute('position') as BufferAttribute;
    const dot = geometry.getAttribute('aDot') as BufferAttribute;
    const seed = geometry.getAttribute('aSeed') as BufferAttribute;
    fill(anchor.array as Float32Array, dot.array as Float32Array, seed.array as Float32Array);
    anchor.needsUpdate = true;
    dot.needsUpdate = true;
    seed.needsUpdate = true;
    geometry.setDrawRange(0, dots);
    this.points.visible = dots > 0;
  }

  get dotCount(): number {
    return this.points.geometry.drawRange.count;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as ShaderMaterial).dispose();
  }
}

/** The per-frame inputs both clouds share. */
export interface StippleFrame {
  now: number;
  eye: Vector3;
  reachM: number;
  /** The player's water setting, 0-1 (docs/ui-ux.md §11). */
  waterDensity: number;
  /** `drawingBufferHeight / (2 tan(fov/2))`, as marine snow takes it. */
  projectionScalePx: number;
  pixelRatio: number;
}

/**
 * Tetherjelly fields and Lampfry shoals, one `Points` each.
 *
 * `setLife` takes the public layers on the 5 Hz snapshot and rewrites a cloud
 * only when its layer changed; `update` runs on the frame and writes uniforms
 * and nothing else.
 */
export class FaunaStipple {
  readonly group = new Group();
  readonly jellies = new StippleCloud('jelly', {
    periodS: JELLY_PULSE_S,
    squeeze: BELL_SQUEEZE,
    stretch: BELL_STRETCH,
    trailSqueeze: TENTACLE_SQUEEZE,
    trailLag: TENTACLE_LAG,
    twinkle: 0,
    twinkleS: JELLY_PULSE_S,
    lift: 0.3,
  });
  readonly shoals = new StippleCloud('shoal', {
    periodS: SHOAL_PULSE_S,
    squeeze: SHOAL_SQUEEZE,
    stretch: 0,
    trailSqueeze: 0,
    trailLag: 0,
    twinkle: SHOAL_TWINKLE,
    twinkleS: SHOAL_TWINKLE_S,
    lift: 0,
  });
  private jellyKey = '';
  private shoalKey = '';
  private reducedMotion = false;
  /** Seconds of pulse elapsed, held still under reduced motion. */
  private clockS = 0;
  private lastTickAt: number | null = null;

  constructor() {
    this.group.add(this.jellies.points, this.shoals.points);
  }

  /** Reduced motion (docs/ui-ux.md §11) holds the pulse and keeps the dots:
   * the stipple is the chart data, and only its breathing is decoration. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /** The public layers, as the snapshot carries them. */
  setLife(jellies: readonly JellyCluster[], shoals: readonly ShoalTell[]): void {
    const jellyKey = jellies.map((j) => `${j.id}:${j.x}:${j.y}:${j.depth}`).join('|');
    if (jellyKey !== this.jellyKey) {
      this.jellyKey = jellyKey;
      this.jellies.write(jellies.length * JELLY_DOTS_PER_FIELD, (anchor, dot, seed) => {
        jellies.forEach((jelly, i) =>
          writeField(jelly, i * JELLY_DOTS_PER_FIELD, anchor, dot, seed)
        );
      });
    }
    const shoalKey = shoals
      .map((s) => `${s.id}:${s.x}:${s.y}:${s.depth}:${s.scattered ? 1 : 0}`)
      .join('|');
    if (shoalKey !== this.shoalKey) {
      this.shoalKey = shoalKey;
      this.shoals.write(shoals.length * SHOAL_DOTS, (anchor, dot, seed) => {
        shoals.forEach((shoal, i) => writeShoal(shoal, i * SHOAL_DOTS, anchor, dot, seed));
      });
    }
  }

  update(frame: StippleFrame): void {
    if (this.lastTickAt !== null && !this.reducedMotion) {
      // Clamped, so a hidden tab does not jump every bell a beat on its return.
      const dt = Math.min(0.25, Math.max(0, (frame.now - this.lastTickAt) / 1000));
      this.clockS = (this.clockS + dt) % PULSE_WRAP_S;
    }
    this.lastTickAt = frame.now;
    for (const cloud of [this.jellies, this.shoals]) {
      const u = cloud.uniforms;
      u.uTime.value = this.clockS;
      u.uEye.value.copy(frame.eye);
      u.uReachM.value = frame.reachM;
      u.uClearness.value = Math.min(1, Math.max(0, frame.waterDensity));
      u.uPixelScale.value = DOT_M * frame.projectionScalePx;
      // `gl_PointSize` is device pixels: a dot never shrinks below one CSS
      // pixel on a dense screen, or the stipple flickers out at the dolly.
      u.uSizePx.value.set(frame.pixelRatio, DOT_MAX_PX * frame.pixelRatio);
      // Read at draw time, never captured: the palette is a live binding and
      // §8 keeps fauna in `FAUNA_COLOR` in all four (palette.ts).
      u.uColor.value.set(FAUNA_COLOR);
    }
  }

  dispose(): void {
    this.jellies.dispose();
    this.shoals.dispose();
  }
}

// ---------------------------------------------------------- the shapes

/**
 * One field's bells, written at `base`. Bell axes are spread over the field on
 * a sunflower spiral, turned by the field's id, so a colony fills its circle
 * evenly without two fields looking stamped from one plate.
 */
function writeField(
  jelly: JellyCluster,
  base: number,
  anchor: Float32Array,
  dot: Float32Array,
  seed: Float32Array
): void {
  const rng = rngFor(jelly.id, 0x6a656c6c);
  const turn = rng() * Math.PI * 2;
  for (let b = 0; b < JELLY_BELLS_PER_FIELD; b++) {
    // Sunflower: radius by the square root of the index, so area is even.
    const r = BELL_AXIS_REACH_M * Math.sqrt((b + 0.5) / JELLY_BELLS_PER_FIELD);
    const a = turn + b * GOLDEN_ANGLE;
    const ax = jelly.x + Math.cos(a) * r;
    const az = jelly.y + Math.sin(a) * r;
    const ay = depthToWorldY(jelly.depth + (rng() * 2 - 1) * BELL_DEPTH_JITTER_M);
    const phase = rng() * Math.PI * 2;
    const start = base + b * DOTS_PER_BELL;
    const offsets = bellOffsets(rng);
    for (let d = 0; d < DOTS_PER_BELL; d++) {
      const i = start + d;
      anchor[i * 3] = ax;
      anchor[i * 3 + 1] = ay;
      anchor[i * 3 + 2] = az;
      dot[i * 4] = offsets[d * 4]!;
      dot[i * 4 + 1] = offsets[d * 4 + 1]!;
      dot[i * 4 + 2] = offsets[d * 4 + 2]!;
      dot[i * 4 + 3] = offsets[d * 4 + 3]!;
      seed[i * 2] = phase;
      // Tentacles fade toward their tips, so the trail reads as trailing.
      const trail = offsets[d * 4 + 3]!;
      seed[i * 2 + 1] = JELLY_GAIN * (0.7 + rng() * 0.3) * (1 - 0.5 * trail);
    }
  }
}

/**
 * One bell at rest, about its own axis: a dome, a rim, and tentacles hanging
 * from under the rim. Returned as `[x, y, z, trail]` per dot, re-centred on the
 * plan so each group of dots the shader scales together — the body, and each
 * step down the tentacles — averages to the axis. That is what makes every
 * phase of a contraction a scale about a point that does not move.
 */
function bellOffsets(rng: () => number): Float32Array {
  const out = new Float32Array(DOTS_PER_BELL * 4);
  let n = 0;
  const push = (x: number, y: number, z: number, trail: number): void => {
    out[n * 4] = x;
    out[n * 4 + 1] = y;
    out[n * 4 + 2] = z;
    out[n * 4 + 3] = trail;
    n++;
  };
  const spin = rng() * Math.PI * 2;
  // The dome: a spiral from the crown down to just above the rim.
  for (let k = 0; k < BELL_DOME_DOTS; k++) {
    const polar = (Math.PI / 2) * 0.85 * Math.sqrt((k + 0.5) / BELL_DOME_DOTS);
    const around = spin + k * GOLDEN_ANGLE;
    push(
      Math.sin(polar) * Math.cos(around) * BELL_RADIUS_M,
      Math.cos(polar) * BELL_HEIGHT_M,
      Math.sin(polar) * Math.sin(around) * BELL_RADIUS_M,
      0
    );
  }
  // The rim: evenly round the bell's widest point.
  for (let k = 0; k < BELL_RIM_DOTS; k++) {
    const around = spin + (k / BELL_RIM_DOTS) * Math.PI * 2;
    push(Math.cos(around) * BELL_RADIUS_M, 0, Math.sin(around) * BELL_RADIUS_M, 0);
  }
  // Tentacles: evenly round, hanging from inside the rim.
  for (let t = 0; t < TENTACLES; t++) {
    const around = spin + ((t + 0.5) / TENTACLES) * Math.PI * 2;
    for (let d = 1; d <= DOTS_PER_TENTACLE; d++) {
      const trail = d / DOTS_PER_TENTACLE;
      push(
        Math.cos(around) * BELL_RADIUS_M * 0.55,
        -TENTACLE_M * trail * (0.8 + rng() * 0.2),
        Math.sin(around) * BELL_RADIUS_M * 0.55,
        trail
      );
    }
  }
  recentre(out, DOTS_PER_BELL);
  // Re-centring can push a dome dot a hair past the rim's radius; pull the
  // bell back inside it, so `BELL_AXIS_REACH_M`'s arithmetic stays exact.
  let widest = 0;
  for (let k = 0; k < DOTS_PER_BELL; k++) {
    widest = Math.max(widest, Math.hypot(out[k * 4]!, out[k * 4 + 2]!));
  }
  if (widest > BELL_RADIUS_M) {
    const pull = BELL_RADIUS_M / widest;
    for (let k = 0; k < DOTS_PER_BELL; k++) {
      out[k * 4] = out[k * 4]! * pull;
      out[k * 4 + 2] = out[k * 4 + 2]! * pull;
    }
  }
  return out;
}

/**
 * One shoal's motes, written at `base`: a flattened cloud about the shoal's
 * centre, tight while formed and flung wide and dim while scattered. The
 * scatter lands on the tick the server says so, because it is the tell.
 */
function writeShoal(
  shoal: ShoalTell,
  base: number,
  anchor: Float32Array,
  dot: Float32Array,
  seed: Float32Array
): void {
  const rng = rngFor(shoal.id, 0x6c616d70);
  const radius = shoal.scattered ? SHOAL_SCATTERED_RADIUS_M : SHOAL_FORMED_RADIUS_M;
  const height = shoal.scattered ? SHOAL_SCATTERED_HEIGHT_M : SHOAL_FORMED_HEIGHT_M;
  const gain = shoal.scattered ? SHOAL_SCATTERED_GAIN : SHOAL_FORMED_GAIN;
  const offsets = new Float32Array(SHOAL_DOTS * 4);
  for (let m = 0; m < SHOAL_DOTS; m++) {
    // Denser at the heart: a shoal is one glow with a ragged edge, not a disc.
    const r = radius * Math.pow(rng(), 0.75);
    const a = rng() * Math.PI * 2;
    offsets[m * 4] = Math.cos(a) * r;
    offsets[m * 4 + 1] = (rng() * 2 - 1) * height * 0.5;
    offsets[m * 4 + 2] = Math.sin(a) * r;
    offsets[m * 4 + 3] = 0;
  }
  recentre(offsets, SHOAL_DOTS);
  const ax = shoal.x;
  const ay = depthToWorldY(shoal.depth);
  const az = shoal.y;
  for (let m = 0; m < SHOAL_DOTS; m++) {
    const i = base + m;
    anchor[i * 3] = ax;
    anchor[i * 3 + 1] = ay;
    anchor[i * 3 + 2] = az;
    dot.set(offsets.subarray(m * 4, m * 4 + 4), i * 4);
    // Each mote its own phase, so the twinkle is a shimmer rather than a
    // blink the whole shoal makes at once.
    seed[i * 2] = rng() * Math.PI * 2;
    seed[i * 2 + 1] = gain * (0.6 + rng() * 0.4);
  }
}

/**
 * Shift a set of `[x, y, z, w]` offsets so that the dots sharing each `w` have
 * a mean of zero on the plan. The shader scales dots by their `w`, so one
 * mean over the whole set would still let the centre wander mid-pulse.
 */
function recentre(offsets: Float32Array, count: number): void {
  const groups = new Map<number, { x: number; z: number; n: number }>();
  for (let k = 0; k < count; k++) {
    const w = offsets[k * 4 + 3]!;
    const g = groups.get(w) ?? { x: 0, z: 0, n: 0 };
    g.x += offsets[k * 4]!;
    g.z += offsets[k * 4 + 2]!;
    g.n++;
    groups.set(w, g);
  }
  for (let k = 0; k < count; k++) {
    const g = groups.get(offsets[k * 4 + 3]!)!;
    offsets[k * 4] = offsets[k * 4]! - g.x / g.n;
    offsets[k * 4 + 2] = offsets[k * 4 + 2]! - g.z / g.n;
  }
}
