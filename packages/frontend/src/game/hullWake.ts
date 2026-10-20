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
 * nothing; the enemy is never geometry in the conn view (gate 6), and a track
 * gets no wake for the same reason it gets no model.
 *
 * One `LineSegments` for every hull, the torpedo trail's shape
 * (ordnanceLayer.ts): a fixed run of segments behind the stern, climbing as
 * bubbles do and fading with distance. Its buffers grow by doubling and are
 * never rebuilt per frame, so the fleet's wakes are one draw call however
 * many hulls are moving, and none when nothing is. Unlit, like the trail: it
 * wears the faction glow, which ACES would fade toward white.
 */

import {
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { SIG_BANDS } from '@echoes/shared';
import { SIG_GLOW_EFOLD } from './glow.ts';

/**
 * SPEC — gate 3's curve E(SIG) = 0.45·e^(SIG/14), read as a ratio against the
 * red stop (docs/ui-ux.md §3): a hull in the red band leaves the full wake,
 * and every quieter hull sits below it on the e-folding the hull lamps use.
 */
export const WAKE_REFERENCE_SIG = SIG_BANDS.RED;
/**
 * TUNABLE — the floor keeps a silent hull's wake a faint mark rather than
 * nothing: Silent Running's 3–8 SIG would otherwise be under a hundredth.
 */
export const WAKE_FLOOR = 0.06;
/** TUNABLE — below this horizontal speed a hull is holding, not running. */
export const WAKE_MIN_SPEED_MPS = 0.5;

/** TUNABLE — segments per wake, and its length at full strength, in metres;
 * a wake never draws shorter than WAKE_MIN_SHARE of that. */
export const WAKE_SEGMENTS = 8;
export const WAKE_MAX_M = 90;
export const WAKE_MIN_SHARE = 0.3;
/** TUNABLE — how far the far end climbs, in metres: bubbles rise. */
export const WAKE_RISE_M = 6;

/**
 * A wake's strength, 0–1: zero for a hull with its engine cut or not moving,
 * and otherwise its live SIG on gate 3's curve, floored so silence is faint
 * rather than invisible.
 */
export function wakeStrength(sig: number, speedMps: number, engineOff: boolean): number {
  if (engineOff || !(speedMps >= WAKE_MIN_SPEED_MPS)) return 0;
  return Math.min(1, Math.max(WAKE_FLOOR, Math.exp((sig - WAKE_REFERENCE_SIG) / SIG_GLOW_EFOLD)));
}

/** One hull's wake this frame, in world units. Reused by the caller. */
export interface WakeSource {
  x: number;
  y: number;
  z: number;
  /** The bow's bearing, the conn view's yaw: +X at 0. */
  heading: number;
  /** Distance from the hull's centre to its stern, world units. */
  sternM: number;
  /** `wakeStrength`, 0 for no wake. */
  strength: number;
}

export class HullWake {
  readonly lines: LineSegments;
  private readonly material: LineBasicMaterial;
  private positions!: Float32BufferAttribute;
  private colors!: Float32BufferAttribute;
  private capacity: number;
  private readonly glow = new Color(0xffffff);
  private wakes = 0;

  constructor(capacity = 8) {
    this.capacity = Math.max(1, capacity);
    this.material = new LineBasicMaterial({
      toneMapped: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.lines = new LineSegments(new BufferGeometry(), this.material);
    this.lines.name = 'hull_wakes';
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    this.allocate();
  }

  /** Gate 4: the wake wears the faction glow, as the torpedo trail does. */
  setPalette(glow: number): void {
    this.glow.set(glow);
  }

  /** Hulls with a wake this frame, for the probe and the tests. */
  get count(): number {
    return this.wakes;
  }

  /** The vertices the wake draws this frame. */
  get vertexCount(): number {
    return this.lines.geometry.drawRange.count;
  }

  /** The far end of the i-th drawn wake, for the tests. */
  tailOf(index: number): { x: number; y: number; z: number } {
    const v = (index + 1) * WAKE_SEGMENTS * 2 - 1;
    const p = this.positions;
    return { x: p.getX(v), y: p.getY(v), z: p.getZ(v) };
  }

  /** The brightest vertex of the i-th drawn wake, its stern end, for the tests. */
  levelOf(index: number): number {
    const v = index * WAKE_SEGMENTS * 2;
    const c = this.colors;
    const glow = this.glow.r + this.glow.g + this.glow.b;
    return (c.getX(v) + c.getY(v) + c.getZ(v)) / Math.max(1e-6, glow);
  }

  /**
   * Write the first `n` sources' wakes. Allocates only when the fleet grows
   * past every size it has been, so a frame of gliding hulls costs buffer
   * writes and nothing else.
   */
  sync(sources: readonly WakeSource[], n: number, draw: number): void {
    let live = 0;
    for (let i = 0; i < n; i++) if (sources[i]!.strength > 0) live++;
    if (live > this.capacity) {
      while (this.capacity < live) this.capacity *= 2;
      this.allocate();
    }
    let v = 0;
    for (let i = 0; i < n; i++) {
      const s = sources[i]!;
      if (s.strength <= 0) continue;
      const dx = -Math.cos(s.heading);
      const dz = -Math.sin(s.heading);
      const length = WAKE_MAX_M * (WAKE_MIN_SHARE + (1 - WAKE_MIN_SHARE) * s.strength) * draw;
      for (let seg = 0; seg < WAKE_SEGMENTS; seg++) {
        for (let end = 0; end < 2; end++) {
          const k = (seg + end) / WAKE_SEGMENTS;
          const reach = s.sternM + k * length;
          this.positions.setXYZ(
            v,
            s.x + dx * reach,
            s.y + k * WAKE_RISE_M * draw,
            s.z + dz * reach
          );
          const fade = (1 - k) * s.strength;
          this.colors.setXYZ(v, this.glow.r * fade, this.glow.g * fade, this.glow.b * fade);
          v++;
        }
      }
    }
    this.wakes = live;
    this.lines.geometry.setDrawRange(0, v);
    this.lines.visible = v > 0;
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  dispose(): void {
    this.lines.geometry.dispose();
    this.material.dispose();
  }

  private allocate(): void {
    const vertices = this.capacity * WAKE_SEGMENTS * 2;
    this.positions = new Float32BufferAttribute(new Float32Array(vertices * 3), 3);
    this.colors = new Float32BufferAttribute(new Float32Array(vertices * 3), 3);
    this.positions.setUsage(DynamicDrawUsage);
    this.colors.setUsage(DynamicDrawUsage);
    const geometry = this.lines.geometry;
    // A resized buffer is a new attribute, and a new attribute on a geometry
    // the renderer has seen needs a new geometry, or three keeps the old one.
    geometry.dispose();
    const next = new BufferGeometry();
    next.setAttribute('position', this.positions);
    next.setAttribute('color', this.colors);
    this.lines.geometry = next;
  }
}
