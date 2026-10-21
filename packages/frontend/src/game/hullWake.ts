/**
 * The cavitation wake behind the player's own hulls in the conn view (#1508,
 * docs/art-direction.md "Animation Style": "Sub movement: slow acceleration,
 * cavitation trails").
 *
 * A wake is the hull's noise made visible, so it reads off the same number
 * the lamps do: live SIG on gate 3's curve. A hull pushing hard leaves a long,
 * bright wake; one running silent leaves a faint short one; one with its
 * engine cut, or standing still, leaves none — nothing is turning a screw.
 * That is the whole design argument: the wake states how loud the hull is,
 * never anything the HUD does not already say.
 *
 * Own hulls only. The server sends them in full, so drawing a wake leaks
 * nothing. A live track's model (#1531) gets none: a Tier-4 payload carries
 * no SIG, and a wake is a statement about loudness.
 *
 * Bubbles, not a line. A hull sheds one at its stern every few metres it
 * travels, and each stays where it was shed, climbing and fading: the wake is
 * left in the water rather than dragged along behind the hull, so a turn
 * leaves a curve. A line redrawn behind the hull each frame read as a rod
 * bolted to the stern, and at one pixel it barely read at all.
 *
 * One `Points` from a fixed ring of WAKE_POOL slots, as the launch burst is
 * drawn (ordnanceLayer.ts): one draw call for the whole fleet, none when no
 * bubble lives, nothing allocated per frame, and a full ring overwrites its
 * oldest bubbles rather than growing. Unlit and additive, like the trail: it
 * wears the faction glow, which ACES would fade toward white, and a spent
 * bubble (colour zero) adds nothing.
 */

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
} from 'three';
import { BERTHS, SIG_BANDS } from '@echoes/shared';
import { SIG_GLOW_EFOLD } from './glow.ts';

/**
 * SPEC — docs/art-direction.md "Rendering Target": the wake is gate 3's curve
 * E(SIG) = 0.45·e^(SIG/14), read as a ratio against the red stop of
 * docs/ui-ux.md §3, so a hull in the red band leaves the full wake and every
 * quieter hull sits below it on the e-folding the hull lamps use.
 */
export const WAKE_REFERENCE_SIG = SIG_BANDS.RED;
/**
 * TUNABLE — the floor keeps a silent hull's wake a faint mark rather than
 * nothing: Silent Running's 3–8 SIG would otherwise be under a hundredth.
 */
export const WAKE_FLOOR = 0.06;
/** TUNABLE — below this horizontal speed a hull is holding, not running. */
export const WAKE_MIN_SPEED_MPS = 0.5;

/**
 * TUNABLE — the wake's shape: each bubble lives WAKE_LIFE_MS at full strength
 * and never less than WAKE_MIN_SHARE of that, so a wake is as long as the
 * hull runs in that time — longer for a louder hull as well as brighter. One
 * is shed every WAKE_SPACING_M of travel, scaled by the far-zoom factor, or
 * further apart if a full-life wake would hold more than
 * WAKE_BUBBLES_PER_HULL: a Light Scout at 120 m/s sheds every 44 m, so a loud
 * one trails a dozen over 480 m and a silent one a handful.
 */
export const WAKE_SPACING_M = 5;
export const WAKE_LIFE_MS = 4000;
export const WAKE_MIN_SHARE = 0.3;
export const WAKE_BUBBLES_PER_HULL = 12;
/**
 * Derived — a dozen live bubbles for every hull the base's grant can float
 * (docs/economy.md §10), so a full berth list running flat out fits the ring
 * and no live wake loses its tail to another's head.
 */
export const WAKE_POOL = BERTHS.CEILING * WAKE_BUBBLES_PER_HULL;
/** TUNABLE — how fast a bubble climbs, metres per second, and its size in pixels. */
export const WAKE_RISE_MPS = 2;
const WAKE_SIZE_PX = 2.5;
/** A hull that covered more than this between two calls jumped; it sheds nothing for it. */
const WAKE_SNAP_M = 200;

/**
 * A wake's strength, 0–1: zero for a hull with its engine cut or not moving,
 * and otherwise its live SIG on gate 3's curve, floored so silence is faint
 * rather than invisible.
 */
export function wakeStrength(sig: number, speedMps: number, engineOff: boolean): number {
  if (engineOff || !(speedMps >= WAKE_MIN_SPEED_MPS)) return 0;
  return Math.min(1, Math.max(WAKE_FLOOR, Math.exp((sig - WAKE_REFERENCE_SIG) / SIG_GLOW_EFOLD)));
}

/** How long a bubble shed at this strength lives, in milliseconds. */
function lifeOf(strength: number): number {
  return WAKE_LIFE_MS * (WAKE_MIN_SHARE + (1 - WAKE_MIN_SHARE) * strength);
}

/** One hull's wake input this frame, in world units. Reused by the caller. */
export interface WakeSource {
  id: number;
  x: number;
  y: number;
  z: number;
  /** The bow's bearing, the conn view's yaw: +X at 0. */
  heading: number;
  /** Horizontal speed, metres per second: what spreads a fast hull's bubbles. */
  speedMps: number;
  /** Distance from the hull's centre to its stern, world units. */
  sternM: number;
  /** `wakeStrength`, 0 for a hull shedding nothing. */
  strength: number;
}

export class HullWake {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly positions: Float32BufferAttribute;
  private readonly colors: Float32BufferAttribute;
  // Per slot: where it was shed, how bright, how long it lives, how fast it
  // climbs, and when. `tick` lifts each straight up from where it was shed.
  private readonly birth = new Float32Array(WAKE_POOL * 3);
  private readonly level = new Float32Array(WAKE_POOL);
  private readonly lifeMs = new Float32Array(WAKE_POOL).fill(1);
  private readonly rise = new Float32Array(WAKE_POOL);
  private readonly bornAt = new Float64Array(WAKE_POOL).fill(-Infinity);
  private head = 0;
  private alive = 0;
  private shed = 0;
  private overwrote = 0;
  /** The clock of the last tick, so a reduced-motion switch stills bubbles where they are. */
  private lastTickMs = 0;
  /** A bubble was shed since the last tick, so a still ring must still draw it. */
  private spawnedSinceTick = false;
  /** Where each hull last shed a bubble, so the next one is a spacing on. */
  private readonly lastShed = new Map<number, { x: number; z: number }>();
  /** Scratch for `sync`: the hulls shedding this call. */
  private readonly seen = new Set<number>();
  private readonly glow = new Color(0xffffff);
  private reducedMotion = false;

  constructor() {
    this.material = new PointsMaterial({
      size: WAKE_SIZE_PX,
      sizeAttenuation: false,
      vertexColors: true,
      toneMapped: false,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.positions = new Float32BufferAttribute(new Float32Array(WAKE_POOL * 3), 3);
    this.colors = new Float32BufferAttribute(new Float32Array(WAKE_POOL * 3), 3);
    this.positions.setUsage(DynamicDrawUsage);
    this.colors.setUsage(DynamicDrawUsage);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('color', this.colors);
    this.points = new Points(geometry, this.material);
    this.points.name = 'hull_wakes';
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /** Gate 4: the wake wears the faction glow, as the torpedo trail does. */
  setPalette(glow: number): void {
    this.glow.set(glow);
  }

  /**
   * Reduced motion (docs/ui-ux.md §11) keeps the wake and stills it: bubbles
   * are still shed and still fade, because the wake says how loud the hull
   * is, but none climbs.
   */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (!reduced) return;
    // The bubbles already climbing stop where they are drawn now, so the
    // switch is a freeze rather than a jump.
    for (let i = 0; i < WAKE_POOL; i++) {
      const age = this.lastTickMs - this.bornAt[i]!;
      if (age > 0) this.birth[i * 3 + 1]! += (age / 1000) * this.rise[i]!;
      this.rise[i] = 0;
    }
  }

  /** Bubbles alive this frame, for the probe and the tests. */
  get count(): number {
    return this.alive;
  }

  /** Bubbles shed since the wake was made, for the tests. */
  get shedCount(): number {
    return this.shed;
  }

  /** Live bubbles a shed wrote over, for the tests: zero while the ring is big enough. */
  get overwrites(): number {
    return this.overwrote;
  }

  /** Slots in the ring: fixed, however many hulls run. */
  get poolSize(): number {
    return this.positions.count;
  }

  /** Whether any bubble is still alive, so the view keeps ticking. */
  get live(): boolean {
    return this.alive > 0;
  }

  /** The drawn position of one slot, for the tests. */
  bubbleAt(slot: number): { x: number; y: number; z: number } {
    const p = this.positions;
    return { x: p.getX(slot), y: p.getY(slot), z: p.getZ(slot) };
  }

  /** One slot's drawn brightness against the glow, 0–1, for the tests. */
  levelAt(slot: number): number {
    const c = this.colors;
    const glow = this.glow.r + this.glow.g + this.glow.b;
    return (c.getX(slot) + c.getY(slot) + c.getZ(slot)) / Math.max(1e-6, glow);
  }

  /**
   * Shed each of the first `n` sources' bubbles for the ground it covered
   * since the last call, then draw the frame. A hull with no strength sheds
   * nothing and is forgotten, so it starts fresh when it moves again.
   */
  sync(sources: readonly WakeSource[], n: number, draw: number, nowMs: number): void {
    const near = WAKE_SPACING_M * Math.max(draw, 1e-3);
    const seen = this.seen;
    seen.clear();
    for (let i = 0; i < n; i++) {
      const s = sources[i]!;
      if (s.strength <= 0) continue;
      seen.add(s.id);
      // Spaced by the longest life any bubble has, not by this one's: a hull
      // then sheds at most eleven per WAKE_LIFE_MS at any speed, and no bubble
      // outlives that, so the cap holds while SIG or speed changes under it —
      // a fleet going silent keeps its loud tails. One fewer than the cap, so
      // rounding never puts a thirteenth alive.
      const spacing = Math.max(
        near,
        (s.speedMps * WAKE_LIFE_MS) / 1000 / (WAKE_BUBBLES_PER_HULL - 1)
      );
      const sx = s.x - Math.cos(s.heading) * s.sternM;
      const sz = s.z - Math.sin(s.heading) * s.sternM;
      const last = this.lastShed.get(s.id);
      if (last === undefined) {
        this.lastShed.set(s.id, { x: sx, z: sz });
        continue;
      }
      let dx = sx - last.x;
      let dz = sz - last.z;
      let d = Math.hypot(dx, dz);
      if (d > WAKE_SNAP_M * Math.max(draw, 1)) {
        last.x = sx;
        last.z = sz;
        continue;
      }
      if (d < spacing) continue;
      dx /= d;
      dz /= d;
      // Shed along the ground covered, a spacing apart, so the wake's density
      // is the same at any frame rate.
      while (d >= spacing) {
        last.x += dx * spacing;
        last.z += dz * spacing;
        d -= spacing;
        this.spawn(last.x, s.y, last.z, s.strength, draw, nowMs);
      }
    }
    for (const id of this.lastShed.keys()) {
      if (!seen.has(id)) this.lastShed.delete(id);
    }
    this.tick(nowMs);
  }

  /** Per frame while any bubble lives: each climbs and fades where it was shed. */
  tick(nowMs: number): void {
    this.lastTickMs = nowMs;
    if (this.alive === 0 && !this.spawnedSinceTick) return;
    this.spawnedSinceTick = false;
    let alive = 0;
    for (let i = 0; i < WAKE_POOL; i++) {
      const age = nowMs - this.bornAt[i]!;
      const t = age / this.lifeMs[i]!;
      if (!(t >= 0 && t < 1)) {
        this.colors.setXYZ(i, 0, 0, 0);
        continue;
      }
      alive++;
      this.positions.setXYZ(
        i,
        this.birth[i * 3]!,
        this.birth[i * 3 + 1]! + (age / 1000) * this.rise[i]!,
        this.birth[i * 3 + 2]!
      );
      const fade = (1 - t) * this.level[i]!;
      this.colors.setXYZ(i, this.glow.r * fade, this.glow.g * fade, this.glow.b * fade);
    }
    this.alive = alive;
    this.points.visible = alive > 0;
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  /** A new match: every bubble and every hull's last shed point goes. */
  reset(): void {
    this.bornAt.fill(-Infinity);
    this.lastShed.clear();
    this.head = 0;
    this.alive = 0;
    this.spawnedSinceTick = false;
    this.colors.array.fill(0);
    this.colors.needsUpdate = true;
    this.points.visible = false;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }

  /** Write one bubble into the next slot of the ring, over the oldest. */
  private spawn(x: number, y: number, z: number, strength: number, draw: number, nowMs: number) {
    const i = this.head;
    this.head = (this.head + 1) % WAKE_POOL;
    if (nowMs - this.bornAt[i]! < this.lifeMs[i]!) this.overwrote++;
    this.shed++;
    this.spawnedSinceTick = true;
    this.birth[i * 3] = x;
    this.birth[i * 3 + 1] = y;
    this.birth[i * 3 + 2] = z;
    this.level[i] = strength;
    this.lifeMs[i] = lifeOf(strength);
    this.rise[i] = this.reducedMotion ? 0 : WAKE_RISE_MPS * draw;
    this.bornAt[i] = nowMs;
  }
}
