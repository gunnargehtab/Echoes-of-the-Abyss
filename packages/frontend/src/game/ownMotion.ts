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

import { SIM, type OwnUnit } from '@echoes/shared';

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

export class OwnMotion {
  private previous = new Map<number, OwnUnit>();
  private current = new Map<number, OwnUnit>();
  private arrivedAtMs = -1;
  private intervalMs = 1000 / SIM.ECHO_HZ;

  /** A snapshot's own-unit list, at the moment it arrived. */
  record(units: readonly OwnUnit[], nowMs: number): void {
    if (this.arrivedAtMs >= 0) {
      const gap = nowMs - this.arrivedAtMs;
      this.intervalMs = Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, gap));
    }
    this.arrivedAtMs = nowMs;
    // The snapshot's objects are the samples: nothing is copied, and a hull
    // that left the list leaves both maps.
    const retired = this.previous;
    retired.clear();
    this.previous = this.current;
    this.current = retired;
    for (const unit of units) this.current.set(unit.id, unit);
    for (const id of this.previous.keys()) {
      if (!this.current.has(id)) this.previous.delete(id);
    }
  }

  reset(): void {
    this.previous.clear();
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
    return false;
  }

  /**
   * The drawn position of one of the player's hulls now, written into `out`.
   * A hull without a prior sample — just built, just arrived — is drawn
   * where the server put it.
   */
  at(unit: OwnUnit, nowMs: number, out: DrawnPosition): DrawnPosition {
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
}
