/**
 * The work-light and the cutter sparks under the player's own harvesters
 * while they dredge (#1555, the owner's "effects and light"; from #1512's
 * plume).
 *
 * A dredging harvester is the loudest thing the economy does (docs/economy.md
 * §3), and gate 3 says glow encodes loudness: its lamps already brighten with
 * its throttle. What its lamps did not do was reach the ground. Now they do,
 * and the cutters throw sparks into the silt they stir:
 *
 * - **Agent light, not world light.** The ground's five families and their
 *   rules (docs/style-neon-noir.md "World light") bind what the *map* emits.
 *   This light is the hull's own, in its navy's glow, and it answers to gate
 *   3 instead: its strength is the throttle's SIG against Overburden's, the
 *   same reading the plume takes (`plumeStrength`), so a harder dredge is a
 *   brighter one and a Trickle barely shows. Own hulls only, like every
 *   own-fleet effect; nothing unresolved is drawn.
 * - **What it lights.** A three.js point light, so it lands on whatever lit
 *   geometry stands under the keel: the ore beds of the field being worked
 *   (environment.ts `scatterFields`) and the hull itself. The bake's ground
 *   is unlit (`MeshBasicMaterial`, PerspectiveView) and takes none of it,
 *   which is the right reading: the silt is the chart's and the ore is the
 *   world's.
 * - **A fixed pool.** three recompiles every lit material's program when the
 *   count of lights in the scene changes, so the lights are made once, at
 *   zero, and only their intensity moves: a harvester starting work costs
 *   no shader build. `WORK_LIGHT_POOL` is how many harvesters light the
 *   ground at once; the rest dredge in the dark, loudest first.
 * - **Sparks.** A small ring of short-lived, bright motes in the same glow,
 *   stirred under the keel and lifting a little before they die: the cutters'
 *   matter, not the silt's. In place, never sideways (docs/map-visuals.md
 *   §8). Reduced motion (docs/ui-ux.md §11) keeps the light, which does not
 *   move, and draws no sparks, which do.
 */

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  PointLight,
  Points,
  PointsMaterial,
} from 'three';
import type { PlumeSource } from './siltPlume.ts';

/**
 * TUNABLE — the lights: how many harvesters light the ground at once, how
 * far a light reaches in world units (the column is squashed, so this is
 * mostly across the ground) and its intensity at full strength, in three's
 * physical units. A harvester holds at the field's mining range (80 m from
 * the node, `ECONOMY.MINING_RANGE_M`) while the beds lie within 0.8 of its
 * radius, so the reach spans a field: a light that stopped at the keel lit
 * the hull and nothing it was cutting. Set by screenshot so the beds under
 * an Overburden dredge read lit against their neighbours and a Trickle's
 * barely do.
 */
export const WORK_LIGHT_POOL = 3;
export const WORK_LIGHT_RANGE_M = 320;
export const WORK_LIGHT_INTENSITY = 30000;
/**
 * TUNABLE — how long a light holds after its last positive reading. The
 * dredge is read off the snapshot — cargo up between two Echo ticks
 * (`plumeStrength`) — and a tick whose cut rounded to nothing reads as no
 * dredge, so a light that followed the reading alone blinked at the sonar
 * rate (#1555, found by screenshot). The plume never showed it because a
 * mote outlives a tick; this is the light's equivalent: three ticks, so a
 * dredge reads as one steady light and a hull that leaves goes dark within
 * a second.
 */
export const WORK_LIGHT_HOLD_MS = 600;

/**
 * TUNABLE — the sparks: alive at once per hull at full strength, each one's
 * life, the radius under the keel they are struck within and how high one
 * flies. Shorter and tighter than the plume's silt (siltPlume.ts).
 */
export const SPARKS_PER_HULL = 16;
export const SPARK_LIFE_MS = 420;
export const SPARK_RADIUS_M = 10;
export const SPARK_RISE_M = 12;
/** Derived — a full ring for every light in the pool and a margin for hulls past it. */
export const SPARK_POOL = (WORK_LIGHT_POOL + 3) * SPARKS_PER_HULL;
const SPARK_SIZE_PX = 4;

export class WorkLights {
  readonly group = new Group();
  private readonly lights: PointLight[] = [];
  private readonly points: Points;
  private readonly material: PointsMaterial;
  private readonly positions: Float32BufferAttribute;
  private readonly colors: Float32BufferAttribute;
  private readonly birth = new Float32Array(SPARK_POOL * 3);
  private readonly lift = new Float32Array(SPARK_POOL);
  private readonly level = new Float32Array(SPARK_POOL);
  private readonly bornAt = new Float64Array(SPARK_POOL).fill(-Infinity);
  private readonly owed = new Map<number, number>();
  private readonly seen = new Set<number>();
  private head = 0;
  private alive = 0;
  private lastSyncMs: number | null = null;
  private seed = 0x27d4eb2d;
  private reducedMotion = false;
  private readonly glow = new Color(0xffffff);
  /** Scratch for `sync`: the sources with strength, loudest first. */
  private readonly ranked: PlumeSource[] = [];
  /** Each hull's last positive reading, held for `WORK_LIGHT_HOLD_MS` past it. */
  private readonly held = new Map<number, PlumeSource & { untilMs: number }>();

  constructor() {
    this.group.name = 'work_lights';
    for (let i = 0; i < WORK_LIGHT_POOL; i++) {
      const light = new PointLight(0xffffff, 0, WORK_LIGHT_RANGE_M, 2);
      light.visible = true;
      this.lights.push(light);
      this.group.add(light);
    }
    this.material = new PointsMaterial({
      size: SPARK_SIZE_PX,
      sizeAttenuation: false,
      vertexColors: true,
      toneMapped: false,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.positions = new Float32BufferAttribute(new Float32Array(SPARK_POOL * 3), 3);
    this.colors = new Float32BufferAttribute(new Float32Array(SPARK_POOL * 3), 3);
    this.positions.setUsage(DynamicDrawUsage);
    this.colors.setUsage(DynamicDrawUsage);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('color', this.colors);
    this.points = new Points(geometry, this.material);
    this.points.name = 'cutter_sparks';
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.group.add(this.points);
  }

  /** The navy's glow (gate 4): the lights' and the sparks' one colour. */
  setPalette(glow: number): void {
    this.glow.set(glow);
    for (const light of this.lights) light.color.copy(this.glow);
  }

  setReducedMotion(reduced: boolean): void {
    if (reduced === this.reducedMotion) return;
    this.reducedMotion = reduced;
    this.clearSparks();
  }

  /** Lights lit this frame, for the probe and the tests. */
  get lit(): number {
    return this.lights.filter((light) => light.intensity > 0).length;
  }

  /** Lights in the pool: fixed, however many harvesters dredge. */
  get poolSize(): number {
    return this.lights.length;
  }

  /** One light's intensity, for the tests. */
  intensityAt(slot: number): number {
    return this.lights[slot]?.intensity ?? 0;
  }

  /** Sparks alive this frame, for the probe and the tests. */
  get sparks(): number {
    return this.alive;
  }

  /**
   * Light the first `n` sources, loudest first up to the pool, and strike
   * each one's sparks for the time since the last call. A source with no
   * strength lights nothing and is forgotten.
   */
  sync(sources: readonly PlumeSource[], n: number, draw: number, nowMs: number): void {
    const held = this.held;
    for (let i = 0; i < n; i++) {
      const s = sources[i]!;
      if (s.strength <= 0) continue;
      const entry = held.get(s.id);
      if (entry === undefined) {
        held.set(s.id, { ...s, untilMs: nowMs + WORK_LIGHT_HOLD_MS });
      } else {
        entry.x = s.x;
        entry.y = s.y;
        entry.z = s.z;
        entry.strength = s.strength;
        entry.untilMs = nowMs + WORK_LIGHT_HOLD_MS;
      }
    }
    const ranked = this.ranked;
    ranked.length = 0;
    for (const [id, entry] of held) {
      if (entry.untilMs < nowMs) held.delete(id);
      else ranked.push(entry);
    }
    ranked.sort((a, b) => b.strength - a.strength || a.id - b.id);
    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i]!;
      const s = ranked[i];
      if (s === undefined) {
        light.intensity = 0;
        continue;
      }
      light.position.set(s.x, s.y, s.z);
      light.intensity = WORK_LIGHT_INTENSITY * s.strength;
      light.distance = WORK_LIGHT_RANGE_M * draw;
    }
    if (this.reducedMotion) return;
    const dtMs = this.lastSyncMs === null ? 0 : Math.max(0, nowMs - this.lastSyncMs);
    this.lastSyncMs = nowMs;
    const seen = this.seen;
    seen.clear();
    for (const s of ranked) {
      seen.add(s.id);
      const rate = (s.strength * SPARKS_PER_HULL) / SPARK_LIFE_MS;
      let owed = Math.min(SPARKS_PER_HULL, (this.owed.get(s.id) ?? 0) + rate * dtMs);
      while (owed >= 1) {
        owed -= 1;
        this.strike(s, draw, nowMs);
      }
      this.owed.set(s.id, owed);
    }
    for (const id of this.owed.keys()) {
      if (!seen.has(id)) this.owed.delete(id);
    }
    this.tick(nowMs);
  }

  /** Per frame while any spark lives: each flies up its own line and dies. */
  tick(nowMs: number): void {
    let alive = 0;
    for (let i = 0; i < SPARK_POOL; i++) {
      const t = (nowMs - this.bornAt[i]!) / SPARK_LIFE_MS;
      if (!(t >= 0 && t < 1)) {
        this.colors.setXYZ(i, 0, 0, 0);
        continue;
      }
      alive++;
      // Up fast, then gone: a spark is brightest struck and fades as it flies.
      const rise = 1 - (1 - t) * (1 - t);
      this.positions.setXYZ(
        i,
        this.birth[i * 3]!,
        this.birth[i * 3 + 1]! + rise * this.lift[i]!,
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

  /** A new match: every light out, every spark gone. */
  reset(): void {
    for (const light of this.lights) light.intensity = 0;
    this.ranked.length = 0;
    this.clearSparks();
  }

  dispose(): void {
    this.reset();
    this.points.geometry.dispose();
    this.material.dispose();
    for (const light of this.lights) light.dispose();
  }

  private clearSparks(): void {
    this.held.clear();
    this.bornAt.fill(-Infinity);
    this.owed.clear();
    this.lastSyncMs = null;
    this.head = 0;
    this.alive = 0;
    this.colors.array.fill(0);
    this.colors.needsUpdate = true;
    this.points.visible = false;
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  /** Strike one spark into the next slot of the ring, over the oldest. */
  private strike(s: PlumeSource, draw: number, nowMs: number): void {
    const i = this.head;
    this.head = (this.head + 1) % SPARK_POOL;
    const r = SPARK_RADIUS_M * draw * Math.sqrt(this.random());
    const a = 2 * Math.PI * this.random();
    this.birth[i * 3] = s.x + r * Math.cos(a);
    this.birth[i * 3 + 1] = s.y;
    this.birth[i * 3 + 2] = s.z + r * Math.sin(a);
    this.level[i] = 0.6 + 0.4 * s.strength;
    this.lift[i] = SPARK_RISE_M * draw * (0.4 + 0.6 * this.random());
    this.bornAt[i] = nowMs;
  }
}
