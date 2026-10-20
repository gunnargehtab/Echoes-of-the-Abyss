/**
 * Where the player's own hulls are drawn between Echo ticks (#429).
 *
 * The server publishes positions at SIM.ECHO_HZ and the conn view draws at
 * display rate, so a hull written straight through from the snapshot stands
 * still for twelve frames and then jumps. For a *contact* that is the rule and
 * the point: smoothing a Tier-2 blob invents a velocity the player was never
 * told (docs/ui-ux.md §4, §12). For the player's own force it is only a
 * stutter — their positions are fully known, nothing is invented by drawing
 * the hull where it must have been between two samples — and §12 permits the
 * client to predict its own units and nothing else.
 *
 * This is interpolation, not prediction: each hull is drawn between its last
 * two reported positions, arriving at the newer one as the next tick is due.
 * That puts own hulls one Echo interval behind the server, which is the price
 * of never having to walk one backwards after a stop it did not see coming.
 * The interval is measured from arrivals rather than assumed, so a late tick
 * stretches the glide a little rather than parking the hull for the gap.
 *
 * Pure and untied to any renderer, so the conn view and the chart's ink about
 * a hull read the same answer and a selection ring never drifts off its hull.
 */

import { SIM } from '@echoes/shared';

/**
 * What the interpolator reads — the fields own units and own ordnance share.
 * Own ordnance glides between ticks for the same reason and under the same
 * permission (§12: the client may predict its own force and nothing else); a
 * torpedo at 160 m/s written straight through would jump 32 m a tick.
 */
export interface Tracked {
  id: number;
  x: number;
  y: number;
  depth: number;
  /** Set while a depth change is under way (`OwnUnit.depthOrder`); ordnance has none. */
  depthOrder?: number;
}

export interface DrawnPosition {
  x: number;
  y: number;
  depth: number;
}

/** A sample gap this short or this long is not a tick cadence, it is a hiccup. */
const MIN_INTERVAL_MS = 0.5 * (1000 / SIM.ECHO_HZ);
const MAX_INTERVAL_MS = 2 * (1000 / SIM.ECHO_HZ);
/**
 * A jump no hull can make in one tick under its own power is a respawn or a
 * mission lift, and is drawn as one — snapping rather than sliding across the
 * map.
 */
const SNAP_M = 500;

/**
 * How a hull sits in the water (#1507): banked into a turn, pitched through a
 * dive. Radians. Positive roll lowers the starboard side, which is the side a
 * clockwise (heading-increasing) turn banks toward; positive pitch is nose
 * down, the way depth grows.
 */
export interface Attitude {
  roll: number;
  pitch: number;
}

/**
 * Roll per rad/s of heading rate. Hulls turn on a waypoint rather than at a
 * rated speed, so a corner is a single tick's heading change: at SIM.ECHO_HZ
 * this gain reads a 30-degree corner as 12 degrees of bank, which SETTLE draws
 * at about 6 at its peak, and only a corner past 45 degrees reaches the clamp.
 * TUNABLE, render-only.
 */
const ROLL_PER_RAD_S = 0.08;
const MAX_ROLL_RAD = (18 * Math.PI) / 180;
const MAX_PITCH_RAD = (15 * Math.PI) / 180;
/**
 * The share of the way a hull's attitude moves toward its newest reading each
 * tick. Under 1 so a hull leans into a turn over a few ticks and comes out of
 * it the same way — docs/art-direction.md "Animation Style": slow
 * acceleration — rather than snapping level on the tick its turn ends.
 */
const SETTLE = 0.5;
/** An attitude this close to level is level, so a settled fleet stops redrawing. */
const LEVEL_EPSILON_RAD = 0.002;
/** A step shorter than this has no heading to read, as the conn view's yaw. */
const MIN_STEP_M = 1;

/**
 * The attitude three consecutive samples imply, written into `out`. Pure, so a
 * test can hold its shape: no heading change is no roll, the roll is clamped,
 * and a hull pitches only while it has a depth order. A hull without two steps
 * of history, or across a jump, sits level.
 */
export function attitudeOf(
  older: Tracked | undefined,
  prior: Tracked | undefined,
  latest: Tracked,
  intervalMs: number,
  out: Attitude
): Attitude {
  out.roll = 0;
  out.pitch = 0;
  if (prior === undefined) return out;
  const dx = latest.x - prior.x;
  const dy = latest.y - prior.y;
  const step = Math.hypot(dx, dy);
  if (step > SNAP_M) return out;
  if (latest.depthOrder !== undefined) {
    const pitch = Math.atan2(latest.depth - prior.depth, step);
    out.pitch = Math.min(MAX_PITCH_RAD, Math.max(-MAX_PITCH_RAD, pitch));
  }
  if (older === undefined || step < MIN_STEP_M) return out;
  const ox = prior.x - older.x;
  const oy = prior.y - older.y;
  const olderStep = Math.hypot(ox, oy);
  if (olderStep < MIN_STEP_M || olderStep > SNAP_M) return out;
  let turn = Math.atan2(dy, dx) - Math.atan2(oy, ox);
  if (turn > Math.PI) turn -= 2 * Math.PI;
  else if (turn < -Math.PI) turn += 2 * Math.PI;
  const roll = (turn / (intervalMs / 1000)) * ROLL_PER_RAD_S;
  out.roll = Math.min(MAX_ROLL_RAD, Math.max(-MAX_ROLL_RAD, roll));
  return out;
}

/** One hull's attitude at its last two ticks, drawn between them as positions are. */
interface AttitudeTrack {
  from: Attitude;
  to: Attitude;
}

function settled(current: number, reading: number): number {
  const next = current + (reading - current) * SETTLE;
  return Math.abs(next) < LEVEL_EPSILON_RAD ? 0 : next;
}

export class OwnMotion {
  private older = new Map<number, Tracked>();
  private previous = new Map<number, Tracked>();
  private current = new Map<number, Tracked>();
  private arrivedAtMs = -1;
  private intervalMs = 1000 / SIM.ECHO_HZ;
  private readonly attitudes = new Map<number, AttitudeTrack>();
  private readonly reading: Attitude = { roll: 0, pitch: 0 };
  /**
   * Reduced motion (docs/ui-ux.md §11) holds every hull level. Bank and pitch
   * are decoration — the heading and depth they echo are drawn anyway — so
   * they are held outright rather than given a static equivalent.
   */
  levelHeld = false;
  /**
   * Only hulls lean. Own ordnance glides on this class too, and a track per
   * shot that nothing draws would be gate-6 work with nothing to show for it.
   */
  private readonly leans: boolean;

  constructor(options: { leans?: boolean } = {}) {
    this.leans = options.leans ?? false;
  }

  /** A snapshot's own-unit list, at the moment it arrived. */
  record(units: readonly Tracked[], nowMs: number): void {
    if (this.arrivedAtMs >= 0) {
      const gap = nowMs - this.arrivedAtMs;
      this.intervalMs = Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, gap));
    }
    this.arrivedAtMs = nowMs;
    // The snapshot's objects are the samples: nothing is copied, and a hull
    // that left the list leaves every map.
    const retired = this.older;
    retired.clear();
    this.older = this.previous;
    this.previous = this.current;
    this.current = retired;
    for (const unit of units) {
      this.current.set(unit.id, unit);
      if (!this.leans) continue;
      const reading = attitudeOf(
        this.older.get(unit.id),
        this.previous.get(unit.id),
        unit,
        this.intervalMs,
        this.reading
      );
      let track = this.attitudes.get(unit.id);
      if (track === undefined) {
        track = { from: { roll: 0, pitch: 0 }, to: { roll: 0, pitch: 0 } };
        this.attitudes.set(unit.id, track);
      }
      track.from.roll = track.to.roll;
      track.from.pitch = track.to.pitch;
      track.to.roll = settled(track.to.roll, reading.roll);
      track.to.pitch = settled(track.to.pitch, reading.pitch);
    }
    for (const id of this.previous.keys()) {
      if (!this.current.has(id)) this.previous.delete(id);
    }
    for (const id of this.older.keys()) {
      if (!this.current.has(id)) this.older.delete(id);
    }
    for (const id of this.attitudes.keys()) {
      if (!this.current.has(id)) this.attitudes.delete(id);
    }
  }

  reset(): void {
    this.older.clear();
    this.previous.clear();
    this.attitudes.clear();
    this.current.clear();
    this.arrivedAtMs = -1;
    this.intervalMs = 1000 / SIM.ECHO_HZ;
  }

  /** 0 at the newest tick's arrival, 1 when the next is due. */
  progress(nowMs: number): number {
    if (this.arrivedAtMs < 0) return 1;
    const t = (nowMs - this.arrivedAtMs) / this.intervalMs;
    return t < 0 ? 0 : t > 1 ? 1 : t;
  }

  /** True while any hull still has ground to cover before the next tick. */
  animating(nowMs: number): boolean {
    if (this.progress(nowMs) >= 1) return false;
    for (const [id, unit] of this.current) {
      const prior = this.previous.get(id);
      if (prior === undefined) continue;
      if (prior.x !== unit.x || prior.y !== unit.y || prior.depth !== unit.depth) return true;
    }
    // A hull that stopped still levels out over the tick.
    if (this.levelHeld) return false;
    for (const track of this.attitudes.values()) {
      if (track.from.roll !== track.to.roll || track.from.pitch !== track.to.pitch) return true;
    }
    return false;
  }

  /**
   * The drawn position of one of the player's hulls now, written into `out`.
   * A hull without a prior sample — just built, just arrived — is drawn
   * where the server put it.
   */
  at(unit: Tracked, nowMs: number, out: DrawnPosition): DrawnPosition {
    const prior = this.previous.get(unit.id);
    const latest = this.current.get(unit.id) ?? unit;
    if (prior === undefined) {
      out.x = latest.x;
      out.y = latest.y;
      out.depth = latest.depth;
      return out;
    }
    const dx = latest.x - prior.x;
    const dy = latest.y - prior.y;
    if (dx * dx + dy * dy > SNAP_M * SNAP_M) {
      out.x = latest.x;
      out.y = latest.y;
      out.depth = latest.depth;
      return out;
    }
    const t = this.progress(nowMs);
    out.x = prior.x + dx * t;
    out.y = prior.y + dy * t;
    out.depth = prior.depth + (latest.depth - prior.depth) * t;
    return out;
  }

  /**
   * A hull's horizontal speed over its last tick, metres per second: zero
   * without two samples, and across a jump, which is no speed at all. What
   * the wake reads (hullWake.ts) to tell a hull running from one holding.
   */
  speedOf(id: number): number {
    const prior = this.previous.get(id);
    const latest = this.current.get(id);
    if (prior === undefined || latest === undefined) return 0;
    const step = Math.hypot(latest.x - prior.x, latest.y - prior.y);
    return step > SNAP_M ? 0 : step / (this.intervalMs / 1000);
  }

  /**
   * The attitude one of the player's hulls is drawn at now, written into
   * `out`: between its last two ticks' readings, on the same clock as `at`.
   */
  attitude(id: number, nowMs: number, out: Attitude): Attitude {
    const track = this.levelHeld ? undefined : this.attitudes.get(id);
    if (track === undefined) {
      out.roll = 0;
      out.pitch = 0;
      return out;
    }
    const t = this.progress(nowMs);
    out.roll = track.from.roll + (track.to.roll - track.from.roll) * t;
    out.pitch = track.from.pitch + (track.to.pitch - track.from.pitch) * t;
    return out;
  }
}
