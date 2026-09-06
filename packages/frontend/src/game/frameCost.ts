/**
 * Frame-cost telemetry for the gate-6 measurement drive.
 *
 * The drive that gate 6 specifies ([docs/graphics-standards.md]) reads avg and
 * worst frame cost *at each of five stations*, which is a different statistic
 * from "since the page loaded" in two ways that used to be silent:
 *
 * - **A worst case must belong to a station.** A maximum that is only ever
 *   raised reports, at station five, whatever the load hitch before station one
 *   cost. `reset()` is the station boundary, and it is the whole reason this is
 *   a class rather than two fields.
 * - **An average must say how many frames it averaged.** A fixed window is
 *   honest only while the observer holds still for a windowful — 4 s at 60 fps,
 *   and considerably longer on the Termux floor, which is exactly where the
 *   window is widest and the temptation to move on is greatest. `frames`
 *   (window) and `count` (station) are both reported so a blended average is
 *   visible rather than inferred.
 *
 * The window is a ring rather than a shifted array because this is an
 * instrument: an O(n) memmove per frame at 60 Hz is cost the measurement would
 * then be measuring.
 */

/** Frames in the rolling average — four seconds at 60 fps. */
const WINDOW = 240;

export class FrameCost {
  private readonly samples = new Float64Array(WINDOW);
  /** Where the next sample lands; the ring wraps and overwrites. */
  private cursor = 0;
  /** Samples held in the ring, saturating at WINDOW. */
  private held = 0;
  /** Samples taken since the last reset, unbounded — the station's frame count. */
  private taken = 0;
  private sum = 0;
  private peak = 0;

  add(ms: number): void {
    if (this.held === WINDOW) this.sum -= this.samples[this.cursor]!;
    else this.held++;
    this.samples[this.cursor] = ms;
    this.cursor = (this.cursor + 1) % WINDOW;
    this.sum += ms;
    this.taken++;
    if (ms > this.peak) this.peak = ms;
  }

  /** Begin a new station: the worst case and the average start over here. */
  reset(): void {
    this.cursor = 0;
    this.held = 0;
    this.taken = 0;
    this.sum = 0;
    this.peak = 0;
  }

  /** Mean over the rolling window, 0 before the first sample. */
  get avg(): number {
    return this.held === 0 ? 0 : this.sum / this.held;
  }

  /** Worst frame of this station — never of a previous one. */
  get worst(): number {
    return this.peak;
  }

  /** Frames the average covers. Below `count`, the average blends nothing. */
  get frames(): number {
    return this.held;
  }

  /** Frames since the station began, which the average may not all cover. */
  get count(): number {
    return this.taken;
  }
}

/** Two decimals is the resolution a frame budget is argued at. */
export function ms(value: number): number {
  return Number(value.toFixed(2));
}
