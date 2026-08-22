/**
 * Terrain biome grid.
 *
 * Terrain matters here for one reason above all others: it sets the
 * PropagationFactor, so the same army is a different army in a different biome
 * (docs/systems-echo.md §3). This is the map doing the work.
 *
 * Detection integrates PF along the emitter-to-listener path
 * (pathPropagation, issue #37): a unit gains cover from a kelp bed it is
 * hiding *behind*, and the Abyssal Trench carries sound far down its axis —
 * an along-path route accumulates PF 1.6 the whole way, while a crossing
 * only picks it up for the trench's width. Truly anisotropic biomes (the
 * docs' "0.3 across / 1.2 along" thermocline) would need PF as a function
 * of bearing, which this model does not attempt.
 */

import { Biome, MAX_PROPAGATION_FACTOR, PROPAGATION_FACTOR } from '@echoes/shared';

export class Terrain {
  readonly widthM: number;
  readonly heightM: number;
  readonly cellM: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly biomes: Uint8Array;
  /**
   * PF per cell, maintained alongside `biomes`. The Echo pass walks tens of
   * thousands of path samples per tick; a flat Float32Array read is the
   * difference between that walk fitting the 2 ms budget and not.
   */
  private readonly pf: Float32Array;

  constructor(widthM: number, heightM: number, cellM: number) {
    this.widthM = widthM;
    this.heightM = heightM;
    this.cellM = cellM;
    this.cols = Math.ceil(widthM / cellM);
    this.rows = Math.ceil(heightM / cellM);
    this.biomes = new Uint8Array(this.cols * this.rows).fill(Biome.OpenWater);
    this.pf = new Float32Array(this.cols * this.rows).fill(PROPAGATION_FACTOR[Biome.OpenWater]);
  }

  private index(x: number, y: number): number {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellM)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellM)));
    return cy * this.cols + cx;
  }

  biomeAt(x: number, y: number): Biome {
    return this.biomes[this.index(x, y)] as Biome;
  }

  propagationAt(x: number, y: number): number {
    return PROPAGATION_FACTOR[this.biomeAt(x, y)];
  }

  /**
   * Mean PropagationFactor along the segment from (x0,y0) to (x1,y1) —
   * the path integral the Echo Layer prices sound with (issue #37).
   *
   * Midpoint Riemann sum over sub-segments no longer than a grid cell:
   * every cell the path crosses contributes in proportion to the length
   * crossed, so masking is cumulative (a thin kelp band buys a little
   * cover, a deep one buys a lot) rather than best/worst-case. Degenerate
   * paths (same cell, zero length) reduce exactly to propagationAt.
   *
   * `abortBelow`: when the caller only cares whether the mean reaches a
   * bar (the Echo pass knows the exact PF a pair needs to be audible), the
   * walk stops as soon as even all-trench water for the remaining samples
   * could not lift the mean that high. The return value is then some value
   * below the bar, not the true mean — callers comparing against the bar
   * see the same decision either way.
   */
  pathPropagation(x0: number, y0: number, x1: number, y1: number, abortBelow = 0): number {
    const distance = Math.hypot(x1 - x0, y1 - y0);
    const samples = Math.max(1, Math.ceil(distance / this.cellM));
    // Hoisted to locals: this walk runs tens of thousands of times per Echo
    // tick, and property/record lookups in the loop are what it cannot afford.
    const { cols, rows, cellM, pf } = this;
    const maxCx = cols - 1;
    const maxCy = rows - 1;
    const sx = (x1 - x0) / samples;
    const sy = (y1 - y0) / samples;
    let px = x0 + sx * 0.5;
    let py = y0 + sy * 0.5;
    const abortSum = abortBelow * samples;
    let headroom = MAX_PROPAGATION_FACTOR * samples;
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      let cx = (px / cellM) | 0;
      let cy = (py / cellM) | 0;
      if (cx < 0) cx = 0;
      else if (cx > maxCx) cx = maxCx;
      if (cy < 0) cy = 0;
      else if (cy > maxCy) cy = maxCy;
      sum += pf[cy * cols + cx]!;
      headroom -= MAX_PROPAGATION_FACTOR;
      // Even all-trench water for the rest cannot reach the caller's bar.
      if (sum + headroom < abortSum) return (sum + headroom) / samples;
      px += sx;
      py += sy;
    }
    return sum / samples;
  }

  /** Paint an axis-aligned rectangle of biome, in world metres. */
  fillRect(x: number, y: number, w: number, h: number, biome: Biome): void {
    const x0 = Math.max(0, Math.floor(x / this.cellM));
    const y0 = Math.max(0, Math.floor(y / this.cellM));
    const x1 = Math.min(this.cols - 1, Math.floor((x + w) / this.cellM));
    const y1 = Math.min(this.rows - 1, Math.floor((y + h) / this.cellM));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        this.biomes[cy * this.cols + cx] = biome;
        this.pf[cy * this.cols + cx] = PROPAGATION_FACTOR[biome];
      }
    }
  }

  /** Flat copy of the grid, for shipping to the client. Terrain is public. */
  serialize(): { cols: number; rows: number; cellM: number; biomes: number[] } {
    return {
      cols: this.cols,
      rows: this.rows,
      cellM: this.cellM,
      biomes: Array.from(this.biomes),
    };
  }

  /**
   * A deterministic scratch map for bring-up, loosely after "The Ventfront
   * Divide" in docs/maps.md: a vent line splitting the map, kelp on one flank,
   * a trench running down the middle as an acoustic highway.
   *
   * Deliberately hand-placed rather than generated — an RTS simulation must be
   * reproducible, and a seeded generator is one refactor away from not being.
   */
  static demo(): Terrain {
    const t = new Terrain(8000, 8000, 250);
    // Thermal vents across the middle: ambush terrain, PF 0.45.
    t.fillRect(0, 3600, 8000, 800, Biome.ThermalVein);
    // Kelp on the west flank: the quiet approach, PF 0.55.
    t.fillRect(0, 0, 2200, 3600, Biome.KelpForest);
    // A trench running north-south: PF 1.6, no secrets down here.
    t.fillRect(3800, 0, 500, 8000, Biome.AbyssalTrench);
    // Resonance field east: bearings lie, PF 0.7 scattered.
    t.fillRect(5800, 4600, 2200, 2400, Biome.ResonanceField);
    // Coral ruins south-west: hard acoustic shadows, PF 0.8.
    t.fillRect(800, 5200, 1800, 1600, Biome.CoralRuins);
    return t;
  }
}
