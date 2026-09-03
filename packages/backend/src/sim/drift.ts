/**
 * Drift Health — docs/bestiary.md §6, "The map can be killed."
 *
 * "Every map region carries a Drift Health value, 0-100... It falls with
 * sustained high SIG, fauna kills, over-extraction, and hazard damage, and
 * recovers slowly — far more slowly than a match lasts."
 *
 * The design note that makes this worth implementing is the last paragraph of
 * §6: a dead region is quieter, more legible and worth less to everyone, which
 * means **the Commune loses their concealment, the Directorate loses their
 * income, and the Consortium barely notices.** Environmental collapse here is
 * not a moral event with a lecture attached; it is a strategic act that helps
 * exactly one faction and is available to all four.
 *
 * A coarse region grid rather than per-biome, because health happens to
 * *places*: a player can strip one vent field bare while the trench a
 * kilometre away is untouched.
 */

import { DRIFT } from '@echoes/shared';

export class DriftHealth {
  private readonly health: Float32Array;
  private readonly cols: number;
  private readonly widthM: number;
  private readonly heightM: number;

  constructor(widthM: number, heightM: number) {
    this.cols = DRIFT.HEALTH_REGIONS;
    this.widthM = widthM;
    this.heightM = heightM;
    this.health = new Float32Array(this.cols * this.cols).fill(DRIFT.HEALTH_START);
  }

  private index(x: number, y: number): number {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor((x / this.widthM) * this.cols)));
    const cy = Math.min(this.cols - 1, Math.max(0, Math.floor((y / this.heightM) * this.cols)));
    return cy * this.cols + cx;
  }

  at(x: number, y: number): number {
    return this.health[this.index(x, y)]!;
  }

  /** Row-major copy for the wire. Public: killing a region is a visible act. */
  snapshot(): number[] {
    return Array.from(this.health);
  }

  /** A kill takes a bite out of the region it happened in. */
  recordKill(x: number, y: number): void {
    const i = this.index(x, y);
    this.health[i] = Math.max(0, this.health[i]! - DRIFT.HEALTH_PER_KILL);
  }

  /**
   * Sustained noise wears a region down, and everywhere else recovers slowly.
   *
   * The threshold matters: quiet play costs the map nothing at all, so a
   * player who chooses to be poor and safe is also choosing not to strip the
   * ground they are standing on. Everything that makes you strong makes you
   * loud, and loud is what kills the Drift.
   *
   * **Dead does not recover.** §6's table ends "0 | Dead | ... permanent for
   * the match", and permanence cannot be expressed as a rate however slow —
   * any positive recovery lifts a Dead cell off zero on the next tick and the
   * row becomes a threshold the map crosses twice. So it is a branch rather
   * than a number, and it is the only floor in the ledger that is not
   * `Math.max(0, ...)`: everything above zero is a rate, and zero is a state
   * (#365).
   */
  tick(dt: number, noiseByRegion: Float32Array): void {
    for (let i = 0; i < this.health.length; i++) {
      if (this.health[i]! <= 0) continue;
      const excess = Math.max(0, (noiseByRegion[i] ?? 0) - DRIFT.HEALTH_SIG_THRESHOLD);
      const drain = excess * DRIFT.HEALTH_SIG_DRAIN_PER_S * dt;
      const recovery = DRIFT.HEALTH_RECOVERY_PER_S * dt;
      this.health[i] = Math.min(100, Math.max(0, this.health[i]! - drain + recovery));
    }
  }

  regionIndex(x: number, y: number): number {
    return this.index(x, y);
  }

  get regionCount(): number {
    return this.health.length;
  }

  /**
   * Biomass multiplier for a region, from §6's table.
   *
   * Healthy 1.0, Strained −25%, Failing −25% (no new spawns is the bigger
   * penalty there), Collapsing −75%, Dead nothing at all.
   */
  yieldMultiplier(x: number, y: number): number {
    const health = this.at(x, y);
    if (health <= 0) return 0;
    if (health < DRIFT.HEALTH_COLLAPSING) return 0.25;
    if (health < DRIFT.HEALTH_FAILING) return 0.75;
    if (health < DRIFT.HEALTH_STRAINED) return 0.75;
    return 1;
  }

  /** Whether a region will admit new spawns at all. §6: none below Failing. */
  spawnsAllowed(x: number, y: number): boolean {
    return this.at(x, y) >= DRIFT.HEALTH_FAILING;
  }
}
