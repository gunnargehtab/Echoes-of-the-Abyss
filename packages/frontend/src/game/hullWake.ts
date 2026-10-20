/**
 * The cavitation wake behind the player's own moving hulls in the conn view
 * (docs/art-direction.md "Rendering Target" and "Animation Style": sub
 * movement leaves cavitation trails). The torpedo's trail is the model
 * (ordnanceLayer.ts), drawn as a flat ribbon rather than a line: a WebGL line
 * is one pixel wide at any zoom, and a 1 px wake behind a hull sixty pixels
 * long did not read in a run-game frame (#1508).
 *
 * Own force only. The server sends own hulls in full, so a wake leaks
 * nothing; an enemy's wake would be an Echo Layer fact the chart has not
 * earned, and is never drawn here.
 *
 * Glow encodes loudness (gate 3): length and brightness read from the hull's
 * live SIG on the gate-3 curve, so a hull at speed trails a long bright
 * ribbon, one running silent a short faint one, and one with its drive cut none at
 * all — an engine-off hull carried by a current is moving without thrust,
 * and thrust is what cavitates. A hull holding station leaves none either.
 *
 * One mesh for every hull (gate 6): one draw whatever the fleet's size, grown by doubling like the ordnance layer's buffers. The wake has no
 * motion of its own — it rides the hull — so reduced motion (docs/ui-ux.md
 * §11) leaves it exactly as drawn.
 */

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { SIG_GLOW_EFOLD } from './glow.ts';

/**
 * TUNABLE — the live SIG at which a wake is drawn at full length and full
 * brightness: a hull pushing hard. Everything quieter sits below it on gate
 * 3's e-folding, so a cruising hull at 25 draws about a third, and a silent
 * one, at 5 or under, sits on the floor.
 */
export const WAKE_REFERENCE_SIG = 40;
/** TUNABLE — the floor keeps a silent hull's wake a faint ribbon rather than
 * nothing: at 0.06 a silent scout's wake did not show in a run-game frame at
 * all (#1508). A hull with its drive cut is zero by rule, not by floor. */
export const WAKE_FLOOR = 0.15;

/** TUNABLE — segments per wake, and the wake's length at full strength in
 * hull lengths, so a scout's wake and a freighter's read alike against the
 * hull that makes them. The shortest share keeps a quiet wake readable as a
 * line rather than a dot behind the stern. */
export const WAKE_SEGMENTS = 6;
export const WAKE_HULL_LENGTHS = 2.5;
const WAKE_MIN_LENGTH_SHARE = 0.35;
/** TUNABLE — the climb over the wake's whole length, as a share of it: bubbles rise. */
const WAKE_RISE_SHARE = 0.1;
/** TUNABLE — the ribbon's half-width at the stern, as a share of the hull's
 * half-length (about a beam), doubling by the tail as a wake spreads. */
export const WAKE_HALF_WIDTH_SHARE = 0.12;
/** TUNABLE — the least a ribbon vertex keeps above the seabed under it, as a
 * share of the hull's half-length. A hull following the floor up a slope
 * would otherwise bury its own wake in the ground behind it. */
const WAKE_CLEARANCE_SHARE = 0.1;
/** Two triangles per segment, three vertices each, unindexed. */
export const WAKE_VERTICES_PER_SEGMENT = 6;
/** TUNABLE — the ribbon's strength over the water, added rather than laid over
 * it, so a wake brightens the water and never darkens it. */
const WAKE_OPACITY = 0.6;

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
  private readonly material: MeshBasicMaterial;
  private readonly glow = new Color(0xffffff);
  /** Added to the scene once by the view; its geometry is swapped on growth. */
  readonly mesh: Mesh;
  private drawn = 0;
  /** The seabed's world Y under a point, for this sync's vertices. */
  private groundY: (x: number, z: number) => number = () => -Infinity;

  constructor(capacity = 16) {
    this.capacity = Math.max(1, capacity);
    // Unlit and off the tone curve as glow is, like the torpedo trail.
    // Additive, so a faded vertex (colour zero) adds nothing; double-sided,
    // so the free camera sees it from under the ribbon too.
    this.material = new MeshBasicMaterial({
      toneMapped: false,
      vertexColors: true,
      transparent: true,
      opacity: WAKE_OPACITY,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    this.mesh = new Mesh(this.allocate(), this.material);
    this.mesh.name = 'hull_wakes';
    this.mesh.visible = false;
    // Hulls range the whole map; a bounding sphere from the first frame's
    // positions would cull the ribbon the moment the camera left them.
    this.mesh.frustumCulled = false;
  }

  /** Gate 4: the wake is the faction glow, as the torpedo trail is. */
  setPalette(glow: number): void {
    this.glow.set(glow);
  }

  /** Wakes drawn this frame: a hull at zero strength draws none. */
  get count(): number {
    return this.drawn;
  }

  /** The vertices the ribbon draws this frame. */
  get vertexCount(): number {
    return this.mesh.geometry.drawRange.count;
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
   * `groundY` gives the seabed's world Y under a point; every vertex stays
   * clear of it.
   */
  sync(
    wakes: readonly WakePlacement[],
    count = wakes.length,
    groundY: (x: number, z: number) => number = () => -Infinity
  ): void {
    this.groundY = groundY;
    if (count > this.capacity) {
      while (this.capacity < count) this.capacity *= 2;
      const old = this.mesh.geometry;
      this.mesh.geometry = this.allocate();
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
      // Across the wake, level in the water: the ribbon lies flat as the
      // seabed shadow does, so the conn view's tilt reads its width.
      const half0 = WAKE_HALF_WIDTH_SHARE * wake.sternM;
      for (let s = 0; s < WAKE_SEGMENTS; s++) {
        const a = s / WAKE_SEGMENTS;
        const b = (s + 1) / WAKE_SEGMENTS;
        // Triangles (a-left, a-right, b-left) and (b-left, a-right, b-right).
        vertex = this.corner(vertex, wake, dx, dz, length, half0, a, -1);
        vertex = this.corner(vertex, wake, dx, dz, length, half0, a, 1);
        vertex = this.corner(vertex, wake, dx, dz, length, half0, b, -1);
        vertex = this.corner(vertex, wake, dx, dz, length, half0, b, -1);
        vertex = this.corner(vertex, wake, dx, dz, length, half0, a, 1);
        vertex = this.corner(vertex, wake, dx, dz, length, half0, b, 1);
      }
    }
    this.drawn = drawn;
    this.mesh.geometry.setDrawRange(0, vertex);
    this.mesh.visible = vertex > 0;
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  /** Write one ribbon corner `k` of the way down the wake, on `side` of it. */
  private corner(
    vertex: number,
    wake: WakePlacement,
    dx: number,
    dz: number,
    length: number,
    half0: number,
    k: number,
    side: -1 | 1
  ): number {
    const reach = wake.sternM + k * length;
    const half = side * half0 * (1 + k);
    // (−dz, dx) is the wake's beam in x/z.
    const x = wake.x + dx * reach - dz * half;
    const z = wake.z + dz * reach + dx * half;
    const y = Math.max(
      wake.y + k * WAKE_RISE_SHARE * length,
      this.groundY(x, z) + WAKE_CLEARANCE_SHARE * wake.sternM
    );
    this.positions.setXYZ(vertex, x, y, z);
    const fade = (1 - k) * wake.strength;
    this.colors.setXYZ(vertex, this.glow.r * fade, this.glow.g * fade, this.glow.b * fade);
    return vertex + 1;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }

  private allocate(): BufferGeometry {
    const vertices = this.capacity * WAKE_SEGMENTS * WAKE_VERTICES_PER_SEGMENT;
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
