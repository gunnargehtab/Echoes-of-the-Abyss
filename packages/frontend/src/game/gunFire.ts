/**
 * The muzzle effect on the player's own guns in the conn view (#1511,
 * docs/art-direction.md "Animation Style": "Siege subs: heavy recoil
 * animations"; "FX Language": "Pressure weapons: shockwaves, distortion
 * rings").
 *
 * An own gun used to fire with nothing to see. On the server's
 * `SelfEventKind.Fired` a short flash leaves the hull or turret on the bearing
 * it fired, a pressure ring spreads flat from the muzzle, and a siege hull
 * kicks back off the shot and settles. The bearing is the gun's own aim, which
 * the server sends its owner alone; nothing here reads an enemy position.
 *
 * One `Points` from a fixed ring of FIRE_POOL slots, as the hit is drawn
 * (hullHit.ts): one draw call for every shot at once, none when no particle
 * lives, nothing allocated per frame, and a full ring overwrites its oldest
 * particles rather than growing. Unlit and additive: the flash burns from
 * white-hot to the faction glow, the ring wears the glow, and a spent particle
 * adds nothing. The recoil costs no draw: the view places the hull it already
 * draws a little astern of the bearing.
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
import { UnitKind } from '@echoes/shared';
import { hash } from './hullHit.ts';

/** TUNABLE — particles in one shot's flash, and in its pressure ring. */
export const FLASH_PARTICLES = 10;
export const RING_PARTICLES = 24;
/**
 * TUNABLE — a ring sized for a broadside: sixteen shots at once, and a full
 * ring overwrites its oldest particles, which are the faintest.
 */
export const FIRE_POOL = 16 * (FLASH_PARTICLES + RING_PARTICLES);
/** TUNABLE — how long the flash and the ring live. */
export const FLASH_LIFE_MS = 320;
export const RING_LIFE_MS = 750;
/**
 * TUNABLE — the shot's shape, in the firing hull's own drawn radius, as the
 * hit's spray is sized (hullHit.ts): where the muzzle sits out from the
 * centre, how fast the flash leaves it, the cone it leaves in, and how far
 * the ring spreads a second.
 */
const MUZZLE_SHARE = 0.6;
const FLASH_SPEED_PER_S = 5;
const FLASH_CONE_RAD = 0.35;
const RING_SPREAD_PER_S = 6;
const FIRE_SIZE_PX = 6;
/** The flash's first colour, before it cools into the faction glow. */
const WHITE_HOT = new Color(1, 0.95, 0.85);

/**
 * The hulls that kick (docs/units.md, "The siege hulls"). Only the Furnace's
 * cutter and the Tocsin's bell go through the combat system's guns, so only
 * those two ever raise `Fired`; the spore and the song are named so a hull
 * moved onto a gun would kick without a second edit here.
 */
const SIEGE_HULLS: ReadonlySet<UnitKind> = new Set([
  UnitKind.Furnace,
  UnitKind.Blight,
  UnitKind.Lure,
  UnitKind.Tocsin,
]);

export function isSiegeHull(kind: UnitKind): boolean {
  return SIEGE_HULLS.has(kind);
}

/**
 * TUNABLE — the recoil: how far astern of the bearing a siege hull is thrown,
 * in its drawn radius, how fast it gets there, and how long it takes to
 * settle. A sharp kick and a slow return reads as weight.
 */
export const RECOIL_SHARE = 0.12;
export const RECOIL_KICK_MS = 70;
export const RECOIL_SETTLE_MS = 650;

/**
 * How far back a recoil holds its hull, 0–1, `ms` after the shot: a linear
 * kick to full, then the square of what is left of the settle. Zero before
 * the shot and after it has settled.
 */
export function recoilLevel(ms: number): number {
  if (!(ms >= 0)) return 0;
  if (ms < RECOIL_KICK_MS) return ms / RECOIL_KICK_MS;
  const left = 1 - (ms - RECOIL_KICK_MS) / RECOIL_SETTLE_MS;
  return left > 0 ? left * left : 0;
}

/** One siege hull's recoil, while it lives. */
interface Recoil {
  bearing: number;
  radiusM: number;
  bornAt: number;
}

export class GunFire {
  readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly positions: Float32BufferAttribute;
  private readonly colors: Float32BufferAttribute;
  // Per slot: where it started, its velocity, how long it lives, when it was
  // thrown, and whether it is the flash (which cools) or the ring.
  private readonly birth = new Float32Array(FIRE_POOL * 3);
  private readonly velocity = new Float32Array(FIRE_POOL * 3);
  private readonly lifeMs = new Float32Array(FIRE_POOL).fill(1);
  private readonly bornAt = new Float64Array(FIRE_POOL).fill(-Infinity);
  private readonly flash = new Uint8Array(FIRE_POOL);
  private head = 0;
  private alive = 0;
  private thrown = 0;
  private shots = 0;
  /** A particle was thrown since the last tick, so a still ring must still draw it. */
  private spawnedSinceTick = false;
  /** Every live recoil, by the hull that fired: one each, a fresh shot restarting it. */
  private readonly recoils = new Map<number, Recoil>();
  private readonly glow = new Color(0xffffff);
  private readonly tint = new Color();
  private reducedMotion = false;

  constructor() {
    this.material = new PointsMaterial({
      size: FIRE_SIZE_PX,
      sizeAttenuation: false,
      vertexColors: true,
      toneMapped: false,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.positions = new Float32BufferAttribute(new Float32Array(FIRE_POOL * 3), 3);
    this.colors = new Float32BufferAttribute(new Float32Array(FIRE_POOL * 3), 3);
    this.positions.setUsage(DynamicDrawUsage);
    this.colors.setUsage(DynamicDrawUsage);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('color', this.colors);
    this.points = new Points(geometry, this.material);
    this.points.name = 'gun_fire';
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /** Gate 4: the flash cools into the faction glow, and the ring wears it. */
  setPalette(glow: number): void {
    this.glow.set(glow);
  }

  /**
   * Reduced motion (docs/ui-ux.md §11) keeps the flash and drops the ring and
   * the recoil: the flash says the gun fired, and the other two are motion.
   * Each recoil in flight is visited once more at zero, so its hull lands.
   */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (!reduced) return;
    for (let i = 0; i < FIRE_POOL; i++) {
      if (this.flash[i] === 0) this.bornAt[i] = -Infinity;
    }
    for (const recoil of this.recoils.values()) recoil.bornAt = -Infinity;
    this.spawnedSinceTick = true;
  }

  /** Shots fired since the effect was made, for the probe and the tests. */
  get shotCount(): number {
    return this.shots;
  }

  /** Particles alive this frame, for the probe and the tests. */
  get particles(): number {
    return this.alive;
  }

  /** Siege hulls still recoiling, for the probe and the tests. */
  get recoiling(): number {
    return this.recoils.size;
  }

  /** Slots in the ring: fixed, however many guns fire. */
  get poolSize(): number {
    return this.positions.count;
  }

  /**
   * One `Fired`: throw the flash and the ring from the muzzle, in world units,
   * and start the hull's recoil if it is a siege hull. `x`/`z` is where the
   * gun is drawn and `bearing` is the server's, radians from world +x toward
   * +y, which the view draws as +z. `radiusM` is the drawn half-length.
   */
  fire(
    id: number,
    x: number,
    y: number,
    z: number,
    bearing: number,
    radiusM: number,
    nowMs: number,
    recoils = false
  ): void {
    this.shots++;
    const r = Math.max(radiusM, 1e-3);
    const bx = Math.cos(bearing);
    const bz = Math.sin(bearing);
    const mx = x + bx * r * MUZZLE_SHARE;
    const mz = z + bz * r * MUZZLE_SHARE;
    for (let k = 0; k < FLASH_PARTICLES; k++) {
      const seed = this.thrown * 4;
      const yaw = bearing + (hash(seed) * 2 - 1) * FLASH_CONE_RAD;
      const speed = r * FLASH_SPEED_PER_S * (0.4 + 0.6 * hash(seed + 1));
      const lift = r * (hash(seed + 2) - 0.5) * 0.6;
      this.spawn(mx, y, mz, Math.cos(yaw) * speed, lift, Math.sin(yaw) * speed, true, nowMs);
    }
    if (this.reducedMotion) return;
    for (let k = 0; k < RING_PARTICLES; k++) {
      // Evenly round, so the ring reads as a ring and not a spray.
      const yaw = (k / RING_PARTICLES) * Math.PI * 2;
      const speed = r * RING_SPREAD_PER_S;
      this.spawn(mx, y, mz, Math.cos(yaw) * speed, 0, Math.sin(yaw) * speed, false, nowMs);
    }
    if (recoils) this.recoils.set(id, { bearing, radiusM: r, bornAt: nowMs });
  }

  /**
   * Visit every live recoil with the offset its hull is drawn at, in world
   * units: astern of the bearing it fired on. One that has settled is visited
   * once more at zero, so the view puts the hull back, and then forgotten.
   */
  eachRecoil(nowMs: number, visit: (id: number, dx: number, dz: number) => void): void {
    for (const [id, recoil] of this.recoils) {
      const back = -recoilLevel(nowMs - recoil.bornAt) * RECOIL_SHARE * recoil.radiusM;
      visit(id, Math.cos(recoil.bearing) * back, Math.sin(recoil.bearing) * back);
      if (!(nowMs - recoil.bornAt < RECOIL_KICK_MS + RECOIL_SETTLE_MS)) {
        this.recoils.delete(id);
      }
    }
  }

  /** Per frame while anything lives: each particle flies and fades. */
  tick(nowMs: number): void {
    if (this.alive === 0 && !this.spawnedSinceTick) return;
    this.spawnedSinceTick = false;
    let alive = 0;
    for (let i = 0; i < FIRE_POOL; i++) {
      const age = nowMs - this.bornAt[i]!;
      const t = age / this.lifeMs[i]!;
      if (!(t >= 0 && t < 1)) {
        this.colors.setXYZ(i, 0, 0, 0);
        continue;
      }
      alive++;
      const s = age / 1000;
      // Drag: the flash bursts and stalls, and the ring slows as it spreads,
      // so both read as a blow into water rather than a stream.
      const travel = s / (1 + 3 * s);
      this.positions.setXYZ(
        i,
        this.birth[i * 3]! + this.velocity[i * 3]! * travel,
        this.birth[i * 3 + 1]! + this.velocity[i * 3 + 1]! * travel,
        this.birth[i * 3 + 2]! + this.velocity[i * 3 + 2]! * travel
      );
      if (this.flash[i] === 1) {
        // White-hot at the muzzle, cooling into the glow as it fades.
        this.tint.copy(WHITE_HOT).lerp(this.glow, Math.min(1, 2 * t));
        const fade = 1 - t;
        this.colors.setXYZ(i, this.tint.r * fade, this.tint.g * fade, this.tint.b * fade);
      } else {
        const fade = 0.7 * (1 - t) * (1 - t);
        this.colors.setXYZ(i, this.glow.r * fade, this.glow.g * fade, this.glow.b * fade);
      }
    }
    this.alive = alive;
    this.points.visible = alive > 0;
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  /** A new match: every particle and every recoil goes. */
  reset(): void {
    this.bornAt.fill(-Infinity);
    this.recoils.clear();
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
    isFlash: boolean,
    nowMs: number
  ): void {
    const i = this.head;
    this.head = (this.head + 1) % FIRE_POOL;
    this.thrown++;
    this.spawnedSinceTick = true;
    this.birth[i * 3] = x;
    this.birth[i * 3 + 1] = y;
    this.birth[i * 3 + 2] = z;
    this.velocity[i * 3] = vx;
    this.velocity[i * 3 + 1] = vy;
    this.velocity[i * 3 + 2] = vz;
    this.flash[i] = isFlash ? 1 : 0;
    this.lifeMs[i] = isFlash ? FLASH_LIFE_MS : RING_LIFE_MS;
    this.bornAt[i] = nowMs;
  }
}
