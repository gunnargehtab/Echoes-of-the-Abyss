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
   *
   * A bucket that is *already* empty here was not used in the whole rebuild
   * since the last clear, and is released. Buckets were never released at
   * all, and on a large map every cell a hull had ever crossed stayed in the
   * table for the rest of the match — which is not a leak worth the name,
   * but `queryRadius` reads `cells.size` as "how many cells are occupied" to
   * decide when sweeping the buckets beats walking the rectangle, and a
   * table padded with the ghosts of every past position made that heuristic
   * choose the rectangle walk long after the sweep had become cheaper. One
   * empty cycle is the right grace: a hull that leaves a cell and comes back
   * next tick keeps its array, and everything else goes.
   */
  clear(): void {
    for (const [k, bucket] of this.cells) {
      if (bucket.length === 0) this.cells.delete(k);
      else bucket.length = 0;
    }
  }

  /** How many cells hold a bucket — the number `queryRadius` weighs its sweep by. */
  get bucketCount(): number {
    return this.cells.size;
  }

  /**
   * Cells examined by `queryRadius` since the counter was last zeroed.
   *
   * Owned by the caller, exactly as `EchoMarkLayer.pathWalks` is: the grid has
   * no idea what a tick or a pass is, and a counter it reset itself would only
   * ever report the last query. Counted rather than timed for the reason
   * sim/stepWork.ts records — a probe count is a property of the algorithm, and
   * the same on every machine.
   */
  cellsVisited = 0;

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

    // A loud emitter's radius can span most of the map, and walking every
    // cell of that rectangle is mostly Map misses on empty water. When the
    // rectangle holds more cells than the hash holds buckets, invert: sweep
    // the occupied buckets and test their coordinates against the rectangle.
    const rectCells = (maxX - minX + 1) * (maxY - minY + 1);
    if (rectCells > this.cells.size) {
      this.cellsVisited += this.cells.size;
      for (const [k, bucket] of this.cells) {
        if (bucket.length === 0) continue;
        const cx = Math.floor(k / 65536) - 32768;
        const cy = (k % 65536) - 32768;
        if (cx < minX || cx > maxX || cy < minY || cy > maxY) continue;
        for (let i = 0; i < bucket.length; i++) {
          out.push(bucket[i]!);
        }
      }
      return out;
    }

    this.cellsVisited += rectCells;
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
