/**
 * A fixed-window count per address, for the anonymous routes (#1576, #1960).
 *
 * The error-report route and matchmaking each hold one. Fixed rather than
 * rolling, as `MatchRoom`'s message budget is: what is bounded is a script's
 * sustained rate, and the seam at a window edge lets through one extra window
 * at worst, which is cheaper to keep than a queue of timestamps per address.
 */
export class AddressLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs: number,
    private readonly maxTracked: number
  ) {}

  /** Spend one request for `address` at `now`; false when its window is spent. */
  allow(address: string, now: number): boolean {
    const window = this.windows.get(address);
    if (window === undefined || now - window.start >= this.windowMs) {
      if (window === undefined && this.windows.size >= this.maxTracked) this.prune(now);
      this.windows.set(address, { start: now, count: 1 });
      return true;
    }
    if (window.count >= this.maxPerWindow) return false;
    window.count += 1;
    return true;
  }

  /** How many addresses are remembered, for the bound's test. */
  get tracked(): number {
    return this.windows.size;
  }

  // Past the bound, expired windows go; if every one is live the table starts
  // over. A flood from that many addresses is not something a per-address count
  // can stop anyway, and an unbounded table is a second way to fill the box.
  private prune(now: number): void {
    for (const [address, window] of this.windows) {
      if (now - window.start >= this.windowMs) this.windows.delete(address);
    }
    if (this.windows.size >= this.maxTracked) this.windows.clear();
  }
}
