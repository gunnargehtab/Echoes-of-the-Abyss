/**
 * The cavitation wake behind the player's own moving hulls in the conn view
 * (docs/art-direction.md "Rendering Target" and "Animation Style": sub
 * movement leaves cavitation trails). The torpedo's trail is the model
 * (ordnanceLayer.ts); this is the same line drawn behind a hull.
 *
 * Own force only. The server sends own hulls in full, so a wake leaks
 * nothing; an enemy's wake would be an Echo Layer fact the chart has not
 * earned, and is never drawn here.
 *
 * Glow encodes loudness (gate 3): length and brightness read from the hull's
 * live SIG on the gate-3 curve, so a hull at speed trails a long bright line,
 * one running silent a short faint one, and one with its drive cut none at
 * all — an engine-off hull carried by a current is moving without thrust,
 * and thrust is what cavitates. A hull holding station leaves none either.
 *
 * One LineSegments for every hull (gate 6): one draw whatever the fleet's
 * size, grown by doubling like the ordnance layer's buffers. The wake has no
 * motion of its own — it rides the hull — so reduced motion (docs/ui-ux.md
 * §11) leaves it exactly as drawn.
 */

import {
  BufferGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Color,
} from 'three';
import { SIG_GLOW_EFOLD } from './glow.ts';

/**
 * TUNABLE — the live SIG at which a wake is drawn at full length and full
 * brightness: a hull pushing hard. Everything quieter sits below it on gate
 * 3's e-folding, so a cruising hull at 25 draws about a third, and a silent
 * one at 5 under a tenth.
 */
export const WAKE_REFERENCE_SIG = 40;
/** TUNABLE — the floor keeps a silent hull's wake a faint line rather than
 * nothing; a hull with its drive cut is zero by rule, not by floor. */
export const WAKE_FLOOR = 0.06;

/** TUNABLE — segments per wake, and the wake's length at full strength in
 * hull lengths, so a scout's wake and a freighter's read alike against the
 * hull that makes them. The shortest share keeps a quiet wake readable as a
 * line rather than a dot behind the stern. */
export const WAKE_SEGMENTS = 6;
export const WAKE_HULL_LENGTHS = 2.5;
const WAKE_MIN_LENGTH_SHARE = 0.35;
/** TUNABLE — the climb over the wake's whole length, as a share of it: bubbles rise. */
const WAKE_RISE_SHARE = 0.1;

/**
 * A wake's strength, 0–1, for an own hull at this live SIG. Zero with the
 * drive cut or with the hull stopped; otherwise gate 3's curve as a ratio
 * against `WAKE_REFERENCE_SIG`, between the floor and 1.
 */
export function wakeStrength(sig: number, engineOff: boolean, moving: boolean): number {
  if (engineOff || !moving) return 0;
  return Math.min(1, Math.max(WAKE_FLOOR, Math.exp((sig - WAKE_REFERENCE_SIG) / SIG_GLOW_EFOLD)));
}

/** Where one hull's wake starts this frame, in world units. */
export interface WakePlacement {
  x: number;
  y: number;
  z: number;
  /** The hull's drawn heading, radians, bow along (cos, sin) in x/z. */
  yaw: number;
  /** Metres from the hull's centre to its stern, already at the draw scale;
   * the wake's length is measured in hulls from it. */
  sternM: number;
  /** 0–1, from `wakeStrength`. */
  strength: number;
}

export class HullWake {
  private capacity: number;
  private positions!: Float32BufferAttribute;
  private colors!: Float32BufferAttribute;
  private readonly material: LineBasicMaterial;
  private readonly glow = new Color(0xffffff);
  /** Added to the scene once by the view; its geometry is swapped on growth. */
  readonly lines: LineSegments;
  private drawn = 0;

  constructor(capacity = 16) {
    this.capacity = Math.max(1, capacity);
    // The torpedo trail's material: unlit, off the tone curve as glow is, and
    // translucent over the hull it trails.
    this.material = new LineBasicMaterial({
      toneMapped: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.lines = new LineSegments(this.allocate(), this.material);
    this.lines.name = 'hull_wakes';
    this.lines.visible = false;
    // Hulls range the whole map; a bounding sphere from the first frame's
    // positions would cull the line the moment the camera left them.
    this.lines.frustumCulled = false;
  }

  /** Gate 4: the wake is the faction glow, as the torpedo trail is. */
  setPalette(glow: number): void {
    this.glow.set(glow);
  }

  /** Wakes drawn this frame: a hull at zero strength draws none. */
  get count(): number {
    return this.drawn;
  }

  /** The vertices the line draws this frame. */
  get vertexCount(): number {
    return this.lines.geometry.drawRange.count;
  }

  /** The drawn position and colour of one vertex, for the tests. */
  vertexAt(i: number): { x: number; y: number; z: number; level: number } {
    const p = this.positions;
    const c = this.colors;
    const level = Math.max(c.getX(i), c.getY(i), c.getZ(i));
    return { x: p.getX(i), y: p.getY(i), z: p.getZ(i), level };
  }

  /**
   * Draw this frame's wakes. Rewrites every vertex each call, as the trail
   * does — tens of hulls at most — and skips a hull at zero strength. Only
   * the first `count` placements are read, so the caller can keep its array.
   */
  sync(wakes: readonly WakePlacement[], count = wakes.length): void {
    if (count > this.capacity) {
      while (this.capacity < count) this.capacity *= 2;
      const old = this.lines.geometry;
      this.lines.geometry = this.allocate();
      old.dispose();
    }
    let vertex = 0;
    let drawn = 0;
    for (let i = 0; i < count; i++) {
      const wake = wakes[i]!;
      if (wake.strength <= 0) continue;
      drawn++;
      const dx = -Math.cos(wake.yaw);
      const dz = -Math.sin(wake.yaw);
      const length =
        WAKE_HULL_LENGTHS *
        2 *
        wake.sternM *
        (WAKE_MIN_LENGTH_SHARE + (1 - WAKE_MIN_LENGTH_SHARE) * wake.strength);
      for (let s = 0; s < WAKE_SEGMENTS; s++) {
        for (let end = 0; end < 2; end++) {
          const k = (s + end) / WAKE_SEGMENTS;
          const reach = wake.sternM + k * length;
          this.positions.setXYZ(
            vertex,
            wake.x + dx * reach,
            wake.y + k * WAKE_RISE_SHARE * length,
            wake.z + dz * reach
          );
          const fade = (1 - k) * wake.strength;
          this.colors.setXYZ(vertex, this.glow.r * fade, this.glow.g * fade, this.glow.b * fade);
          vertex++;
        }
      }
    }
    this.drawn = drawn;
    this.lines.geometry.setDrawRange(0, vertex);
    this.lines.visible = vertex > 0;
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  dispose(): void {
    this.lines.geometry.dispose();
    this.material.dispose();
  }

  private allocate(): BufferGeometry {
    const vertices = this.capacity * WAKE_SEGMENTS * 2;
    this.positions = new Float32BufferAttribute(new Float32Array(vertices * 3), 3);
    this.colors = new Float32BufferAttribute(new Float32Array(vertices * 3), 3);
    this.positions.setUsage(DynamicDrawUsage);
    this.colors.setUsage(DynamicDrawUsage);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('color', this.colors);
    geometry.setDrawRange(0, 0);
    return geometry;
  }
}
