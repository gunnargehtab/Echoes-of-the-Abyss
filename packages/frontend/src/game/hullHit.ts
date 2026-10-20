/**
 * The hit effect on the player's own hulls and structures in the conn view
 * (#1510, docs/art-direction.md "UI FX": "cavitation distortion on damage").
 *
 * A hull taking fire used to change only its health bar. On the server's
 * `SelfEventKind.Damaged` the struck hull's lamps flash and a short spray of
 * debris and bubbles leaves it, both scaled by the share of hull the blow
 * took. The hull's lamps already say how loud it is (gate 3), so the flash
 * rides that same factor up, briefly past its ceiling, and back: a hit reads
 * as the hull's own light jolting, not as a new light in the water.
 *
 * Own force only, and every input is resolved: the event names a unit of
 * yours, and the HP it lost is the difference of two own snapshots, which the
 * server sends in full. Hits on enemy tracks are another issue (#1467); the
 * enemy is never geometry in the conn view (gate 6).
 *
 * One `Points` from a fixed ring of HIT_POOL slots, as the wake is drawn
 * (hullWake.ts): one draw call for every hit at once, none when no particle
 * lives, nothing allocated per frame, and a full ring overwrites its oldest
 * particles rather than growing. Unlit and additive: bubbles wear the faction
 * glow, debris a pale hull-metal fleck, and a spent particle adds nothing.
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
import { GLOW_FACTOR_MAX } from './glow.ts';

/**
 * TUNABLE — the share of a hull's maximum HP one blow must take to throw the
 * full effect. A torpedo that takes a fifth of a hull is as big as a hit
 * gets; a gun round taking a few percent is a flicker and a handful.
 */
export const HIT_FULL_SHARE = 0.2;
/**
 * TUNABLE — the least a hit shows, so a scratch still reads. Also what a hit
 * shows when no HP loss can be measured: the hull's first snapshot, or a hit
 * in the same tick as a repair.
 */
export const HIT_FLOOR = 0.15;
/** TUNABLE — how long a hit lives, and the share of it the lamp flash takes. */
export const HIT_LIFE_MS = 1200;
export const HIT_FLASH_MS = 360;
/** TUNABLE — particles one hit throws, from the floor to a full hit. */
export const HIT_PARTICLES_MIN = 4;
export const HIT_PARTICLES_MAX = 24;
/**
 * TUNABLE — a ring sized for a broadside: sixteen full hits at once, and a
 * full ring overwrites its oldest particles, which are the faintest.
 */
export const HIT_POOL = 16 * HIT_PARTICLES_MAX;
/**
 * TUNABLE — the spray's shape, in the struck hull's own drawn radius: where a
 * particle starts out from the centre, how fast it flies out, and how fast a
 * bubble climbs and a fragment sinks, each a second. Sized by the hull, so a
 * spray clears a Caisson's hundred metres of plating as it does a scout's,
 * at any zoom; one sized in metres hid inside the big hulls.
 */
const HIT_START_SHARE = 0.3;
const HIT_SPREAD_PER_S = 1.6;
const HIT_BUBBLE_RISE_PER_S = 1;
const HIT_DEBRIS_SINK_PER_S = 0.6;
/** Debris falls out of the spray sooner than the bubbles climb out of it. */
const HIT_DEBRIS_LIFE_SHARE = 0.6;
const HIT_SIZE_PX = 5;
/** The pale fleck a fragment of hull catches the light as. */
const DEBRIS_COLOR = new Color(0.62, 0.66, 0.7);

/**
 * TUNABLE — the lamp factor a full hit's flash peaks at: twice gate 3's
 * ceiling. A hull under fire is usually loud, with its lamps already at the
 * ceiling, so a flash held under it would never show on the hulls that get
 * hit. The ceiling keeps a *standing* state from white-clipping the hull; a
 * third of a second past it is the jolt.
 */
export const HIT_FLASH_PEAK = 2 * GLOW_FACTOR_MAX;

/**
 * A hit's strength, 0–1, from the HP it took: the share of the hull against
 * HIT_FULL_SHARE, never below the floor. NaN, a repair or no loss at all
 * (nothing measured) reads as the floor, since the server said it was hit.
 */
export function hitStrength(hpLost: number, maxHp: number): number {
  const share = maxHp > 0 ? hpLost / maxHp : 0;
  if (!(share > 0)) return HIT_FLOOR;
  return Math.min(1, Math.max(HIT_FLOOR, share / HIT_FULL_SHARE));
}

/**
 * The lamp factor a flashing hull draws at: its resting gate-3 `glow` lifted
 * toward HIT_FLASH_PEAK by the flash's level, and never below where it rests.
 */
export function flashedGlow(glow: number, level: number): number {
  return Math.max(glow, glow + (HIT_FLASH_PEAK - glow) * level);
}

/** One hit's flash, while it lives. */
interface Flash {
  strength: number;
  bornAt: number;
}

/**
 * A cheap hash on an integer, 0–1, so a spray is the same on every run. A
 * track's spray (trackHit.ts) draws from it too.
 */
export function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export class HullHits {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly positions: Float32BufferAttribute;
  private readonly colors: Float32BufferAttribute;
  // Per slot: where it started, its velocity, how bright, its tint, how long
  // it lives and when it was thrown. `tick` moves each in a straight line.
  private readonly birth = new Float32Array(HIT_POOL * 3);
  private readonly velocity = new Float32Array(HIT_POOL * 3);
  /** The hull's velocity at the hit, horizontal: what the spray is carried by. */
  private readonly carried = new Float32Array(HIT_POOL * 2);
  private readonly level = new Float32Array(HIT_POOL);
  private readonly debris = new Uint8Array(HIT_POOL);
  private readonly lifeMs = new Float32Array(HIT_POOL).fill(1);
  private readonly bornAt = new Float64Array(HIT_POOL).fill(-Infinity);
  private head = 0;
  private alive = 0;
  private thrown = 0;
  /** A particle was thrown since the last tick, so a still ring must still draw it. */
  private spawnedSinceTick = false;
  /** Every live hit, by the entity it struck: one each, a fresh blow restarting it. */
  private readonly flashes = new Map<number, Flash>();
  private readonly glow = new Color(0xffffff);
  private reducedMotion = false;

  constructor() {
    this.material = new PointsMaterial({
      size: HIT_SIZE_PX,
      sizeAttenuation: false,
      vertexColors: true,
      toneMapped: false,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.positions = new Float32BufferAttribute(new Float32Array(HIT_POOL * 3), 3);
    this.colors = new Float32BufferAttribute(new Float32Array(HIT_POOL * 3), 3);
    this.positions.setUsage(DynamicDrawUsage);
    this.colors.setUsage(DynamicDrawUsage);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('color', this.colors);
    this.points = new Points(geometry, this.material);
    this.points.name = 'hull_hits';
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /** Gate 4: the bubbles wear the faction glow, as the wake's do. */
  setPalette(glow: number): void {
    this.glow.set(glow);
  }

  /**
   * Reduced motion (docs/ui-ux.md §11) keeps the flash and drops the spray:
   * the flash says the hull was hit, and the spray is the motion.
   */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (!reduced) return;
    this.bornAt.fill(-Infinity);
    this.spawnedSinceTick = true;
  }

  /** Hits alive this frame — one per struck entity — for the probe and the tests. */
  get count(): number {
    return this.flashes.size;
  }

  /** Particles alive this frame, for the probe and the tests. */
  get particles(): number {
    return this.alive;
  }

  /** Particles thrown since the effect was made, for the tests. */
  get thrownCount(): number {
    return this.thrown;
  }

  /** Slots in the ring: fixed, however many hulls are hit. */
  get poolSize(): number {
    return this.positions.count;
  }

  /**
   * One `Damaged`: start (or restart) the entity's flash and throw its spray
   * from where it is drawn, in world units. `radiusM` is the hull's drawn
   * half-length, and `vx`/`vz` its velocity, which the spray carries with it.
   */
  hit(
    id: number,
    x: number,
    y: number,
    z: number,
    strength: number,
    radiusM: number,
    nowMs: number,
    vx = 0,
    vz = 0
  ): void {
    const flash = this.flashes.get(id);
    if (flash !== undefined && nowMs - flash.bornAt < HIT_FLASH_MS) {
      // Two blows inside one flash are one jolt, as bright as the harder.
      flash.strength = Math.max(flash.strength, strength);
      flash.bornAt = nowMs;
    } else {
      this.flashes.set(id, { strength, bornAt: nowMs });
    }
    if (this.reducedMotion) return;
    const n = Math.round(HIT_PARTICLES_MIN + (HIT_PARTICLES_MAX - HIT_PARTICLES_MIN) * strength);
    const r = Math.max(radiusM, 1e-3);
    for (let k = 0; k < n; k++) {
      const seed = this.thrown * 4;
      const yaw = hash(seed) * Math.PI * 2;
      const dx = Math.cos(yaw);
      const dz = Math.sin(yaw);
      // From the plating, not the centre, where the hull would hide it.
      const start = r * HIT_START_SHARE * (0.8 + 0.4 * hash(seed + 3));
      const out = r * HIT_SPREAD_PER_S * (0.35 + 0.65 * hash(seed + 1)) * (0.5 + strength);
      // Every third particle is debris; the rest are the bubbles the blow
      // shakes out of the hull.
      const isDebris = k % 3 === 0;
      const lift = isDebris
        ? -r * HIT_DEBRIS_SINK_PER_S * (0.5 + hash(seed + 2))
        : r * HIT_BUBBLE_RISE_PER_S * (0.5 + hash(seed + 2));
      this.spawn(
        x + dx * start,
        y,
        z + dz * start,
        dx * out,
        lift,
        dz * out,
        vx,
        vz,
        strength,
        isDebris,
        nowMs
      );
    }
  }

  /**
   * Visit every live flash at its level, 0–1, so the view lifts the hull's
   * lamps. A flash that has run out is visited once more at zero, so the
   * view puts the lamps back, and then forgotten.
   */
  eachFlash(nowMs: number, visit: (id: number, level: number) => void): void {
    for (const [id, flash] of this.flashes) {
      const t = (nowMs - flash.bornAt) / HIT_FLASH_MS;
      // A sharp jolt and a slower fall: the square of what is left.
      const left = t >= 1 ? 0 : 1 - Math.max(0, t);
      visit(id, flash.strength * left * left);
      if (nowMs - flash.bornAt >= HIT_LIFE_MS) this.flashes.delete(id);
    }
  }

  /** Per frame while anything lives: each particle flies and fades. */
  tick(nowMs: number): void {
    if (this.alive === 0 && !this.spawnedSinceTick) return;
    this.spawnedSinceTick = false;
    let alive = 0;
    for (let i = 0; i < HIT_POOL; i++) {
      const age = nowMs - this.bornAt[i]!;
      const t = age / this.lifeMs[i]!;
      if (!(t >= 0 && t < 1)) {
        this.colors.setXYZ(i, 0, 0, 0);
        continue;
      }
      alive++;
      const s = age / 1000;
      // Drag: the spray bursts out and slows, so it reads as a blow rather
      // than a fountain. The hull's own way is lost more slowly, so a hit on
      // a hull at speed stays with it for the moment the flash lasts rather
      // than being left astern at once.
      const travel = s / (1 + 2 * s);
      const carry = s / (1 + 0.5 * s);
      this.positions.setXYZ(
        i,
        this.birth[i * 3]! + this.velocity[i * 3]! * travel + this.carried[i * 2]! * carry,
        this.birth[i * 3 + 1]! + this.velocity[i * 3 + 1]! * s,
        this.birth[i * 3 + 2]! +
          this.velocity[i * 3 + 2]! * travel +
          this.carried[i * 2 + 1]! * carry
      );
      const fade = (1 - t) * this.level[i]!;
      const tint = this.debris[i] === 1 ? DEBRIS_COLOR : this.glow;
      this.colors.setXYZ(i, tint.r * fade, tint.g * fade, tint.b * fade);
    }
    this.alive = alive;
    this.points.visible = alive > 0;
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  /** A new match: every particle and every flash goes. */
  reset(): void {
    this.bornAt.fill(-Infinity);
    this.flashes.clear();
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

  /** Write one particle into the next slot of the ring, over the oldest. */
  private spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    carryX: number,
    carryZ: number,
    strength: number,
    isDebris: boolean,
    nowMs: number
  ): void {
    const i = this.head;
    this.head = (this.head + 1) % HIT_POOL;
    this.thrown++;
    this.spawnedSinceTick = true;
    this.birth[i * 3] = x;
    this.birth[i * 3 + 1] = y;
    this.birth[i * 3 + 2] = z;
    this.velocity[i * 3] = vx;
    this.velocity[i * 3 + 1] = vy;
    this.velocity[i * 3 + 2] = vz;
    this.carried[i * 2] = carryX;
    this.carried[i * 2 + 1] = carryZ;
    this.level[i] = 0.4 + 0.6 * strength;
    this.debris[i] = isDebris ? 1 : 0;
    this.lifeMs[i] = HIT_LIFE_MS * (isDebris ? HIT_DEBRIS_LIFE_SHARE : 1);
    this.bornAt[i] = nowMs;
  }
}
