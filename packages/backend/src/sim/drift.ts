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

/**
 * Bound a grid a client presents before it is allowed to seed a match
 * (docs/campaign.md §2 rule 5; #379).
 *
 * The record lives in the client's storage, so the server cannot know whether
 * a grid is *true* — only whether it is *possible*. What it can hold a grid to
 * is its shape and its ceiling: exactly one number per region, every one of
 * them a finite reading on §6's 0–100 scale. The ceiling is `HEALTH_MAX` and
 * not `HEALTH_START`, because the server's own honest output exceeds the
 * start: `tick` heals a quiet cell toward 100, so a *Tend* played softly
 * closes above 88 and a validator holding the start would refuse precisely the
 * run rule 5 wants to reward. What stops the carry being a lever upward is
 * `seed`'s cap, not this one.
 *
 * Any fault rejects the **whole** grid rather than clamping the bad cell. A
 * clamp would hand a tampered cell the ceiling — which, for a cell the player
 * drove to nothing, is a free heal with a comma in it — and a grid with one
 * impossible reading in it has told the server everything it needs to know
 * about the other fifteen. Rejected is a fresh map, which is what clearing the
 * storage would have given, and what §2 rule 5 permits.
 */
export function validateDriftGrid(grid: unknown, expectedLength: number): number[] | null {
  if (!Array.isArray(grid) || grid.length !== expectedLength) return null;
  const out: number[] = [];
  for (const value of grid) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (value < 0 || value > DRIFT.HEALTH_MAX) return null;
    out.push(value);
  }
  return out;
}

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

  /**
   * Start this match's grid from an earlier mission's close on the same map —
   * docs/campaign.md §2 rule 5, "the map persists" — instead of the biome's
   * defaults (#379). Runs before anything reads the grid: fauna is seeded
   * against `spawnsAllowed`, so a carried Failing cell has to be Failing
   * before the herds are placed, not after.
   *
   * The gap between missions is where the ground gets its one flat recovery,
   * `CARRY_RECOVERY`, and it is applied here rather than by the room so a
   * replay and a test seed through exactly the path a live room does. Two
   * caps on it. A cell never arrives above `HEALTH_START`: a carried map is
   * never healthier than a fresh one, and since a fresh map is always one
   * cleared browser away, that cap is the whole of what keeps a presented grid
   * from being a lever upward — a grid of hundreds seeds as a fresh map, not a
   * better one. And a cell at 0 stays at 0: `tick` says Dead is permanent
   * because there is nothing left in a dead cell to recover *from*, and a gap
   * of days does not change what a dead cell contains.
   *
   * Callers hand this `validateDriftGrid`'s output; a grid of the wrong size
   * is a contract breach and throws rather than half-seeding.
   */
  seed(grid: readonly number[]): void {
    if (grid.length !== this.health.length) {
      throw new Error(`drift grid has ${grid.length} regions, this map has ${this.health.length}`);
    }
    for (let i = 0; i < grid.length; i++) {
      const carried = grid[i]!;
      this.health[i] =
        carried <= 0 ? 0 : Math.min(DRIFT.HEALTH_START, carried + DRIFT.CARRY_RECOVERY);
    }
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
        this.health[i] = Math.min(DRIFT.HEALTH_MAX, health + DRIFT.HEALTH_RECOVERY_PER_S * dt);
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
