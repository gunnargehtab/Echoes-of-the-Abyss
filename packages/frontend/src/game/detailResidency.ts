/**
 * Which regions' detail is drawn, and what holds it — docs/world-map.md §7.5
 * (#1459).
 *
 * Pure, with no three.js at runtime, so the rules can be held under node. A
 * region's detail (§7.3) is one chunk: its mesh and skin, built by a request
 * the view makes and released when the region is let go.
 *
 * - **Selected by projected size.** A region is wanted while the overview is
 *   drawn and the region is in view, and one of its overview cells, at its
 *   nearest point, would project at least `DETAIL_WANT_PX` wide: past that the
 *   overview's 1,000 m cells read as coarse. It stays wanted down to
 *   `DETAIL_KEEP_PX`, held or still being built, so a camera parked at the
 *   threshold neither swaps it nor restarts its request every frame.
 * - **Bounded.** At most `WORLD.DETAIL_RESIDENT` regions resident, the one
 *   arriving and the one left, and at most `WORLD.DETAIL_IN_FLIGHT` requests
 *   in flight. A session's own region is resident by the session and counts
 *   against the first: when a session takes its slot, the residency lets go
 *   of what no longer fits, and of any copy of that region it held.
 * - **Explicit about cancellation and failure.** A request for a region no
 *   longer wanted is aborted, and whatever it built is released when it
 *   settles. A request that fails holds nothing and is not retried until its
 *   region has stopped being wanted and is wanted again.
 */

import { WORLD } from '@echoes/shared';
import { groundPxPerM } from './readability.ts';

/**
 * TUNABLE — the projected width, in pixels, of one 1,000 m overview cell at
 * which a region's detail is wanted: two dozen pixels is where the overview's
 * cells start to read as blocks.
 */
export const DETAIL_WANT_PX = 24;

/** TUNABLE — and the width below which it is let go again: the hysteresis. */
export const DETAIL_KEEP_PX = 16;

/**
 * TUNABLE — cells of one row a region's skin bake shades between looks at its
 * budget (`bakeSeabedInSlices`): three at 32 px a cell is 3,072 px, about a
 * millisecond and a half.
 */
export const DETAIL_SLICE_CELLS = 3;

/** How wide one overview cell projects at a distance, in pixels: the readability factor's scale. */
export function projectedCellPx(
  distanceM: number,
  viewportHeightPx: number,
  fovDeg: number,
  cellM: number = WORLD.ATLAS_CELL_M
): number {
  return cellM * groundPxPerM(viewportHeightPx, fovDeg, distanceM);
}

/** One region the camera could want: its id, how wide its cells project, whether it is in view. */
export interface DetailCandidate {
  id: string;
  px: number;
  visible: boolean;
}

/**
 * The regions to hold this frame, largest first: in view and past the want
 * threshold, or past the keep threshold while already held or being built
 * (`kept`, `DetailResidency.keptIds`). At most `max`, which a session's own
 * region has already taken one of.
 */
export function wantedDetail(
  candidates: readonly DetailCandidate[],
  kept: ReadonlySet<string>,
  max: number
): string[] {
  return candidates
    .filter((c) => c.visible && c.px >= (kept.has(c.id) ? DETAIL_KEEP_PX : DETAIL_WANT_PX))
    .sort((a, b) => b.px - a.px)
    .slice(0, Math.max(0, max))
    .map((c) => c.id);
}

/** What the residency has done, counted: the bounds a test holds. */
export interface ResidencyCounts {
  requests: number;
  admitted: number;
  released: number;
  cancelled: number;
  failed: number;
}

/**
 * The resident regions and the requests in flight. `load` builds a region's
 * detail and should give up when its signal aborts; `release` frees what a
 * load built, whether it was drawn or arrived after its region was let go.
 */
export class DetailResidency<T> {
  private readonly resident = new Map<string, { value: T; usedAt: number }>();
  private readonly inFlight = new Map<string, AbortController>();
  private readonly failedIds = new Set<string>();
  private wanted: readonly string[] = [];
  private reserved = 0;
  private tick = 0;
  private disposed = false;
  readonly counts: ResidencyCounts = {
    requests: 0,
    admitted: 0,
    released: 0,
    cancelled: 0,
    failed: 0,
  };

  constructor(
    private readonly load: (id: string, signal: AbortSignal) => Promise<T>,
    private readonly release: (id: string, value: T) => void,
    readonly maxResident: number = WORLD.DETAIL_RESIDENT,
    readonly maxInFlight: number = WORLD.DETAIL_IN_FLIGHT
  ) {}

  /** The resident regions. */
  residentIds(): ReadonlySet<string> {
    return new Set(this.resident.keys());
  }

  /**
   * The regions held or being built, as `wantedDetail` reads them: either
   * keeps its region down to `DETAIL_KEEP_PX`, so a request is not aborted and
   * restarted as the camera crosses `DETAIL_WANT_PX`.
   */
  keptIds(): ReadonlySet<string> {
    return new Set([...this.resident.keys(), ...this.inFlight.keys()]);
  }

  /** A resident region's detail, or undefined. */
  get(id: string): T | undefined {
    return this.resident.get(id)?.value;
  }

  /** The regions to draw: resident and wanted. */
  drawn(): string[] {
    return this.wanted.filter((id) => this.resident.has(id));
  }

  /** How many requests are in flight. */
  get pending(): number {
    return this.inFlight.size;
  }

  /**
   * Say what the camera wants now, `reserved` slots already held by a
   * session's own region. Requests start in the order given while a slot is
   * free; one for a region no longer wanted is aborted.
   */
  want(ids: readonly string[], reserved = 0): void {
    if (this.disposed) return;
    this.tick++;
    this.wanted = [...ids];
    this.reserved = reserved;
    for (const id of [...this.failedIds]) if (!ids.includes(id)) this.failedIds.delete(id);
    for (const [id, controller] of [...this.inFlight]) {
      if (ids.includes(id)) continue;
      this.inFlight.delete(id);
      controller.abort();
      this.counts.cancelled++;
    }
    for (const id of ids) {
      const held = this.resident.get(id);
      if (held !== undefined) held.usedAt = this.tick;
    }
    // A session taking its slot leaves less room: what no longer fits goes.
    this.shrink(Math.max(0, this.maxResident - reserved));
    for (const id of ids) {
      if (this.inFlight.size >= this.maxInFlight) break;
      if (this.resident.has(id) || this.inFlight.has(id) || this.failedIds.has(id)) continue;
      this.request(id);
    }
  }

  /**
   * Let a region go now, held or being built: a session has taken it, so this
   * residency's copy would be a second one of the same ground.
   */
  drop(id: string): void {
    const controller = this.inFlight.get(id);
    if (controller !== undefined) {
      this.inFlight.delete(id);
      controller.abort();
      this.counts.cancelled++;
    }
    const held = this.resident.get(id);
    if (held === undefined) return;
    this.resident.delete(id);
    this.free(id, held.value);
  }

  /** Abort everything in flight and release everything held. */
  dispose(): void {
    this.disposed = true;
    for (const controller of this.inFlight.values()) controller.abort();
    this.counts.cancelled += this.inFlight.size;
    this.inFlight.clear();
    for (const [id, held] of this.resident) this.free(id, held.value);
    this.resident.clear();
    this.wanted = [];
  }

  private request(id: string): void {
    const controller = new AbortController();
    this.inFlight.set(id, controller);
    this.counts.requests++;
    this.load(id, controller.signal).then(
      (value) => {
        if (this.inFlight.get(id) !== controller) {
          // Let go while it was building: what it built goes straight back.
          this.free(id, value);
          return;
        }
        this.inFlight.delete(id);
        this.admit(id, value);
        this.want(this.wanted, this.reserved);
      },
      () => {
        // An aborted request's rejection is its abort, and it holds nothing.
        if (this.inFlight.get(id) !== controller) return;
        this.inFlight.delete(id);
        this.failedIds.add(id);
        this.counts.failed++;
        this.want(this.wanted, this.reserved);
      }
    );
  }

  /** Hold a region; the `want` that follows lets go of what no longer fits. */
  private admit(id: string, value: T): void {
    this.resident.set(id, { value, usedAt: this.tick });
    this.counts.admitted++;
  }

  /**
   * Let go of regions no longer wanted, least recently wanted first, until at
   * most `bound` are held. A wanted region is never let go: `wantedDetail`
   * asks for no more than the bound leaves room for.
   */
  private shrink(bound: number): void {
    while (this.resident.size > bound) {
      let victim: string | null = null;
      let oldest = Number.POSITIVE_INFINITY;
      for (const [other, held] of this.resident) {
        if (!this.wanted.includes(other) && held.usedAt < oldest) {
          victim = other;
          oldest = held.usedAt;
        }
      }
      if (victim === null) break;
      const held = this.resident.get(victim)!;
      this.resident.delete(victim);
      this.free(victim, held.value);
    }
  }

  private free(id: string, value: T): void {
    this.release(id, value);
    this.counts.released++;
  }
}
