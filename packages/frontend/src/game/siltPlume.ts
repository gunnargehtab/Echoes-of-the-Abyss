/**
 * The silt plume under the player's own harvesters while they dredge (#1512,
 * from #1467's "harvesting animations").
 *
 * A harvester working a node used to look the same as one standing still. The
 * plume says the one thing the HUD already says: the cutters are running, and
 * how hard. It reads off the snapshot alone — `cargo` rising between two own
 * ticks is the dredge biting, and `throttle` is how loud the gear runs — so
 * nothing unresolved is drawn, and own hulls only, as every own-fleet effect.
 *
 * Size follows the throttle's SIG (docs/economy.md §3): a harder dredge is
 * louder, and the plume is that noise's matter. It is the same ratio for the
 * Commune, whose gear is scaled as a whole (`harvestSigFor`), so a Commune
 * Overburden still plumes as fully as anyone's — the plume is the work, and
 * the meter is what says the Commune does it quietly.
 *
 * It rises and settles where it was stirred and never drifts sideways:
 * lateral motion states a current, and a current is a mechanic
 * (docs/map-visuals.md §8). Each mote is stirred at a random spot under the
 * keel, lifts straight up and sinks back on the same line.
 *
 * Silt, not cavitation, so it wears no faction glow: a dim sediment fleck
 * catching the hull's lamps. Unlit and additive like the wake, so a spent mote
 * (colour zero) adds nothing. One `Points` from a fixed ring, as the wake and
 * the hit spray are drawn: one draw call for every plume, none when no mote
 * lives, nothing allocated per frame.
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
import { BERTHS, HARVEST_THROTTLE, HarvestThrottle, type OwnUnit } from '@echoes/shared';
import { dredgeStruck } from './dredge.ts';

/**
 * Derived — the loudest gear any harvester runs, Overburden's SIG: a plume at
 * full size. Every other throttle is its share of that.
 */
const FULL_PLUME_SIG = HARVEST_THROTTLE[HarvestThrottle.Overburden].sig;

/**
 * TUNABLE — a plume's shape at full strength: PLUME_MOTES_PER_HULL motes
 * alive at once, each living PLUME_LIFE_MS, stirred within PLUME_RADIUS_M of
 * the keel and lifting PLUME_RISE_M before it settles. A quieter throttle
 * stirs fewer motes, in a narrower, lower cloud. All scale with the far-zoom
 * factor, as the hull they hang under does.
 */
export const PLUME_MOTES_PER_HULL = 24;
export const PLUME_LIFE_MS = 2400;
export const PLUME_RADIUS_M = 30;
export const PLUME_RISE_M = 40;
/**
 * Derived — twenty-four live motes for every hull the base's grant can float
 * (docs/economy.md §10), so even a berth list of nothing but harvesters, all
 * on Overburden, fits the ring.
 */
export const PLUME_POOL = BERTHS.CEILING * PLUME_MOTES_PER_HULL;
/** The fleck a stirred mote of silt catches the lamps as: dim, warm, no hue of a faction's. */
const SILT_COLOR = new Color(0.78, 0.72, 0.6);
const PLUME_SIZE_PX = 4;

/**
 * A harvester's plume strength, 0–1, from two own readings of it: zero unless
 * its cargo rose between them, and never for a struck dredge, which has no
 * harvest loop to run. Otherwise its throttle's SIG against Overburden's.
 */
export function plumeStrength(cargoBefore: number | undefined, unit: OwnUnit): number {
  if (dredgeStruck(unit) || unit.throttle === undefined) return 0;
  if (cargoBefore === undefined || unit.cargo === undefined) return 0;
  if (!(unit.cargo > cargoBefore)) return 0;
  return Math.min(1, HARVEST_THROTTLE[unit.throttle].sig / FULL_PLUME_SIG);
}

/** One dredging harvester's plume input this frame, in world units. Reused by the caller. */
export interface PlumeSource {
  id: number;
  /** The keel: where the plume is stirred. */
  x: number;
  y: number;
  z: number;
  /** `plumeStrength`, 0 for a hull stirring nothing. */
  strength: number;
}

export class SiltPlume {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly positions: Float32BufferAttribute;
  private readonly colors: Float32BufferAttribute;
  // Per slot: where it was stirred, how bright, how high it lifts, and when.
  private readonly birth = new Float32Array(PLUME_POOL * 3);
  private readonly level = new Float32Array(PLUME_POOL);
  private readonly lift = new Float32Array(PLUME_POOL);
  private readonly bornAt = new Float64Array(PLUME_POOL).fill(-Infinity);
  private head = 0;
  private alive = 0;
  private stirred = 0;
  /** A mote was stirred since the last tick, so a still ring must still draw it. */
  private spawnedSinceTick = false;
  /** Each hull's motes owed but not yet stirred, so the rate holds at any frame rate. */
  private readonly owed = new Map<number, number>();
  private lastSyncMs: number | null = null;
  /** Scratch for `sync`: the hulls stirring this call. */
  private readonly seen = new Set<number>();
  /** A small LCG: where each mote is stirred, the same from one run to the next. */
  private seed = 0x9e3779b9;
  private reducedMotion = false;

  constructor() {
    this.material = new PointsMaterial({
      size: PLUME_SIZE_PX,
      sizeAttenuation: false,
      vertexColors: true,
      toneMapped: false,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.positions = new Float32BufferAttribute(new Float32Array(PLUME_POOL * 3), 3);
    this.colors = new Float32BufferAttribute(new Float32Array(PLUME_POOL * 3), 3);
    this.positions.setUsage(DynamicDrawUsage);
    this.colors.setUsage(DynamicDrawUsage);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('color', this.colors);
    this.points = new Points(geometry, this.material);
    this.points.name = 'silt_plumes';
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /**
   * Reduced motion (docs/ui-ux.md §11) replaces the plume rather than
   * removing it: "same information, no movement". Each dredging harvester
   * holds one fixed cloud at constant brightness, sized as the moving plume
   * is, for as long as it dredges (`syncStill`). Stilling only the lift would
   * still leave motes popping in and fading out, which is movement.
   */
  setReducedMotion(reduced: boolean): void {
    if (reduced === this.reducedMotion) return;
    this.reducedMotion = reduced;
    // Either way the other mode's motes go: the next sync draws this one's.
    this.bornAt.fill(-Infinity);
    this.owed.clear();
    this.lastSyncMs = null;
    this.alive = 0;
    this.colors.array.fill(0);
    this.colors.needsUpdate = true;
    this.points.visible = false;
  }

  /** Motes alive this frame, for the probe and the tests. */
  get count(): number {
    return this.alive;
  }

  /** Motes stirred since the plume was made, for the tests. */
  get stirredCount(): number {
    return this.stirred;
  }

  /** Slots in the ring: fixed, however many harvesters dredge. */
  get poolSize(): number {
    return this.positions.count;
  }

  /** The drawn position of one slot, for the tests. */
  moteAt(slot: number): { x: number; y: number; z: number } {
    const p = this.positions;
    return { x: p.getX(slot), y: p.getY(slot), z: p.getZ(slot) };
  }

  /** One slot's drawn brightness against the silt colour, 0–1, for the tests. */
  levelAt(slot: number): number {
    const c = this.colors;
    return (
      (c.getX(slot) + c.getY(slot) + c.getZ(slot)) / (SILT_COLOR.r + SILT_COLOR.g + SILT_COLOR.b)
    );
  }

  /**
   * Stir each of the first `n` sources' motes for the time since the last
   * call, then draw the frame. A hull with no strength stirs nothing and is
   * forgotten, so it starts fresh when its dredge bites again.
   */
  sync(sources: readonly PlumeSource[], n: number, draw: number, nowMs: number): void {
    if (this.reducedMotion) {
      this.syncStill(sources, n, draw);
      return;
    }
    const dtMs = this.lastSyncMs === null ? 0 : Math.max(0, nowMs - this.lastSyncMs);
    this.lastSyncMs = nowMs;
    const seen = this.seen;
    seen.clear();
    for (let i = 0; i < n; i++) {
      const s = sources[i]!;
      if (s.strength <= 0) continue;
      seen.add(s.id);
      // A full plume keeps PLUME_MOTES_PER_HULL alive: that many per life.
      // Capped at one life's worth, so a stalled frame never dumps a burst.
      const rate = (s.strength * PLUME_MOTES_PER_HULL) / PLUME_LIFE_MS;
      let owed = Math.min(PLUME_MOTES_PER_HULL, (this.owed.get(s.id) ?? 0) + rate * dtMs);
      while (owed >= 1) {
        owed -= 1;
        this.spawn(s, draw, nowMs);
      }
      this.owed.set(s.id, owed);
    }
    for (const id of this.owed.keys()) {
      if (!seen.has(id)) this.owed.delete(id);
    }
    this.tick(nowMs);
  }

  /** Per frame while any mote lives: each lifts and settles where it was stirred. */
  tick(nowMs: number): void {
    if (this.reducedMotion) return;
    if (this.alive === 0 && !this.spawnedSinceTick) return;
    this.spawnedSinceTick = false;
    let alive = 0;
    for (let i = 0; i < PLUME_POOL; i++) {
      const t = (nowMs - this.bornAt[i]!) / PLUME_LIFE_MS;
      if (!(t >= 0 && t < 1)) {
        this.colors.setXYZ(i, 0, 0, 0);
        continue;
      }
      alive++;
      // Up and back down the same line: sin(πt) is zero at both ends, so a
      // mote settles where it was stirred, and fades in and out on the arc.
      const arc = Math.sin(Math.PI * t);
      this.positions.setXYZ(
        i,
        this.birth[i * 3]!,
        this.birth[i * 3 + 1]! + arc * this.lift[i]!,
        this.birth[i * 3 + 2]!
      );
      const fade = arc * this.level[i]!;
      this.colors.setXYZ(i, SILT_COLOR.r * fade, SILT_COLOR.g * fade, SILT_COLOR.b * fade);
    }
    this.alive = alive;
    this.points.visible = alive > 0;
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  /** A new match: every mote and every hull's owed share goes. */
  reset(): void {
    this.bornAt.fill(-Infinity);
    this.owed.clear();
    this.lastSyncMs = null;
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

  /**
   * Reduced motion: each dredging hull's fixed cloud, rewritten in place. A
   * mote's spot is a hash of the hull and its index, so the same hull draws
   * the same cloud every frame; its count, spread and height follow the
   * strength as the moving plume's do.
   */
  private syncStill(sources: readonly PlumeSource[], n: number, draw: number): void {
    let slot = 0;
    for (let i = 0; i < n; i++) {
      const s = sources[i]!;
      if (s.strength <= 0) continue;
      const motes = Math.min(Math.round(s.strength * PLUME_MOTES_PER_HULL), PLUME_POOL - slot);
      for (let k = 0; k < motes; k++, slot++) {
        const r = PLUME_RADIUS_M * draw * s.strength * Math.sqrt(hash01(s.id, k, 1));
        const a = 2 * Math.PI * hash01(s.id, k, 2);
        const h = 0.5 * PLUME_RISE_M * draw * s.strength * hash01(s.id, k, 3);
        this.positions.setXYZ(slot, s.x + r * Math.cos(a), s.y + h, s.z + r * Math.sin(a));
        const level = 0.6 * s.strength;
        this.colors.setXYZ(slot, SILT_COLOR.r * level, SILT_COLOR.g * level, SILT_COLOR.b * level);
      }
    }
    for (let i = slot; i < this.alive; i++) this.colors.setXYZ(i, 0, 0, 0);
    this.alive = slot;
    this.points.visible = slot > 0;
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  /** Write one mote into the next slot of the ring, over the oldest. */
  private spawn(s: PlumeSource, draw: number, nowMs: number): void {
    const i = this.head;
    this.head = (this.head + 1) % PLUME_POOL;
    this.stirred++;
    this.spawnedSinceTick = true;
    // Uniform over a disc whose radius grows with the dredge's strength.
    const r = PLUME_RADIUS_M * draw * s.strength * Math.sqrt(this.random());
    const a = 2 * Math.PI * this.random();
    this.birth[i * 3] = s.x + r * Math.cos(a);
    this.birth[i * 3 + 1] = s.y;
    this.birth[i * 3 + 2] = s.z + r * Math.sin(a);
    this.level[i] = s.strength;
    this.lift[i] = PLUME_RISE_M * draw * s.strength * (0.5 + 0.5 * this.random());
    this.bornAt[i] = nowMs;
  }
}

/** A stable 0–1 from a hull, a mote and a salt: the still cloud's spots. */
function hash01(id: number, k: number, salt: number): number {
  let h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35) ^ salt;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}
