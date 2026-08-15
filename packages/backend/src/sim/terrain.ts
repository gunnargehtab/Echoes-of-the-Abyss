/**
 * Terrain biome grid.
 *
 * Terrain matters here for one reason above all others: it sets the
 * PropagationFactor, so the same army is a different army in a different biome
 * (docs/systems-echo.md §3). This is the map doing the work.
 *
 * SIMPLIFICATION: detection uses the PropagationFactor at the *emitter's*
 * position, not an integral along the emitter-to-listener path. That matches
 * how the docs describe the effect ("Thermal Vein masks you", "Kelp Forest
 * muffles") and is far cheaper, but it means a unit does not gain cover from a
 * kelp bed it is merely hiding behind. Path integration is the obvious upgrade
 * once the Echo pass has headroom against its 2 ms budget.
 */

import { Biome, PROPAGATION_FACTOR } from '@echoes/shared';

export class Terrain {
  readonly widthM: number;
  readonly heightM: number;
  readonly cellM: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly biomes: Uint8Array;

  constructor(widthM: number, heightM: number, cellM: number) {
    this.widthM = widthM;
    this.heightM = heightM;
    this.cellM = cellM;
    this.cols = Math.ceil(widthM / cellM);
    this.rows = Math.ceil(heightM / cellM);
    this.biomes = new Uint8Array(this.cols * this.rows).fill(Biome.OpenWater);
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

  /** Paint an axis-aligned rectangle of biome, in world metres. */
  fillRect(x: number, y: number, w: number, h: number, biome: Biome): void {
    const x0 = Math.max(0, Math.floor(x / this.cellM));
    const y0 = Math.max(0, Math.floor(y / this.cellM));
    const x1 = Math.min(this.cols - 1, Math.floor((x + w) / this.cellM));
    const y1 = Math.min(this.rows - 1, Math.floor((y + h) / this.cellM));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        this.biomes[cy * this.cols + cx] = biome;
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
