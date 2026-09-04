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

  /**
   * A fresh grid, or one seeded from what an earlier mission left on this map.
   *
   * `carried` is docs/campaign.md §2 rule 5 — "Drift Health carries between
   * missions on the same map" — and it arrives from the player's own
   * progression record, which means it arrives from the client. It must have
   * been through `validDriftCarry` before it reaches here; a grid of the wrong
   * length is ignored rather than trusted part-way, so the one caller that
   * forgets gets biome defaults instead of a half-seeded map.
   *
   * Two rules shape the seed, both from docs/bestiary.md §6. A region still
   * living heals by `DRIFT.HEALTH_CARRY_RECOVERY` across the gap (zero, and
   * that constant says why at length). A region at 0 does not: §6's table
   * makes Dead permanent, and the campaign is exactly the thing that carries
   * it that way.
   */
  constructor(widthM: number, heightM: number, carried?: readonly number[] | null) {
    this.cols = DRIFT.HEALTH_REGIONS;
    this.widthM = widthM;
    this.heightM = heightM;
    this.health = new Float32Array(this.cols * this.cols).fill(DRIFT.HEALTH_START);
    if (carried == null || carried.length !== this.health.length) return;
    for (let i = 0; i < this.health.length; i++) {
      const value = carried[i]!;
      // Dead stays dead; everything else heals by the gap's allowance and is
      // held under the value the map opens at, so the carry can only ever be
      // a debt (see `validDriftCarry`).
      const healed = value <= 0 ? 0 : value + DRIFT.HEALTH_CARRY_RECOVERY;
      this.health[i] = Math.min(DRIFT.HEALTH_START, healed);
    }
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
   * Sustained noise wears a region down, and quiet ground recovers slowly.
   *
   * The threshold matters: quiet play costs the map nothing at all, so a
   * player who chooses to be poor and safe is also choosing not to strip the
   * ground they are standing on. Everything that makes you strong makes you
   * loud, and loud is what kills the Drift.
   *
   * A cell is either wearing or healing, never both. Applying recovery under
   * the drain (as this did until #365) meant the first three points over the
   * threshold were cancelled, so the effective threshold was 63 while every
   * document said 60 — and a base sitting over the line was being healed by
   * the same tick that wore it.
   *
   * Dead is permanent for the match, as §6's table says: a cell at 0 has no
   * fauna left to recover *from*, and the campaign carries it to the next
   * mission on this map that way.
   */
  tick(dt: number, noiseByRegion: Float32Array): void {
    for (let i = 0; i < this.health.length; i++) {
      const health = this.health[i]!;
      if (health <= 0) continue;
      const excess = (noiseByRegion[i] ?? 0) - DRIFT.HEALTH_SIG_THRESHOLD;
      if (excess > 0) {
        this.health[i] = Math.max(0, health - excess * DRIFT.HEALTH_SIG_DRAIN_PER_S * dt);
      } else {
        this.health[i] = Math.min(100, health + DRIFT.HEALTH_RECOVERY_PER_S * dt);
      }
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
