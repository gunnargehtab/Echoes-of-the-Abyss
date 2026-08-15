/**
 * Uniform-grid spatial hash used as the Echo Layer's broadphase.
 *
 * Detection is inherently all-pairs — every emitter against every listener —
 * which is O(n^2) and blows the 2 ms budget in docs/tech-stack.md well before
 * a real match size. The grid lets each emitter consider only the listeners
 * inside its own maximum audible radius.
 *
 * Rebuilt from scratch each Echo tick (5 Hz) rather than incrementally
 * maintained: at 5 Hz a full rebuild is cheaper than tracking cell transitions,
 * and it cannot drift out of sync with entity positions.
 */

export class SpatialHash {
  private readonly cells = new Map<number, number[]>();
  private readonly cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  /**
   * Pack a cell coordinate pair into one number.
   *
   * Offset by 32768 so negative world coordinates stay non-negative, keeping
   * the key a small integer the Map can hash cheaply.
   */
  private key(cx: number, cy: number): number {
    return (cx + 32768) * 65536 + (cy + 32768);
  }

  private cellCoord(v: number): number {
    return Math.floor(v / this.cellSize);
  }

  /**
   * Drop all entries but keep the bucket arrays allocated — the grid is
   * rebuilt every tick, and reusing the arrays keeps this off the GC's radar.
   */
  clear(): void {
    for (const bucket of this.cells.values()) {
      bucket.length = 0;
    }
  }

  insert(entity: number, x: number, y: number): void {
    const k = this.key(this.cellCoord(x), this.cellCoord(y));
    const bucket = this.cells.get(k);
    if (bucket === undefined) {
      this.cells.set(k, [entity]);
    } else {
      bucket.push(entity);
    }
  }

  /**
   * Collect entities in every cell overlapping the query circle into `out`.
   *
   * This is a broadphase: results are cells-that-overlap, not a precise radius
   * test, so callers must still check true distance. `out` is cleared and
   * returned so callers can reuse one array across queries.
   */
  queryRadius(x: number, y: number, radius: number, out: number[]): number[] {
    out.length = 0;
    const minX = this.cellCoord(x - radius);
    const maxX = this.cellCoord(x + radius);
    const minY = this.cellCoord(y - radius);
    const maxY = this.cellCoord(y + radius);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const bucket = this.cells.get(this.key(cx, cy));
        if (bucket === undefined) continue;
        for (let i = 0; i < bucket.length; i++) {
          out.push(bucket[i]!);
        }
      }
    }
    return out;
  }
}
