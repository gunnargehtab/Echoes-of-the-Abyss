/**
 * Grid pathfinding for hulls (#431).
 *
 * Until this landed nothing in the simulation could path around an obstacle:
 * `movementSystem` steered straight at its order and `Terrain.resolveStep`
 * slid the hull along whatever it hit. That is collision response, not
 * navigation, and it fails in exactly one shape — a concave one. A U-shaped
 * ridge, a plateau with a bay, a wall with the gap behind the hull rather than
 * ahead of it: the hull slides into the pocket and sits there for the rest of
 * the match, because every axis-aligned retry is a step deeper in.
 *
 * This is A* over the terrain's own cells, at the depth the hull is at, with
 * `Terrain.admitsCell` as the one passability question — the same question
 * `resolveStep` asks, so a route never disagrees with the step that follows it.
 *
 * Three things about it are load-bearing:
 *
 * - **Integer costs.** Ten a side, fourteen a diagonal, octile heuristic in the
 *   same units. Every g, h and f is an integer, so there is no float sum whose
 *   order could differ between two runs, and the tie-break — lower f, then
 *   lower h, then lower cell index — is total. Replays reproduce routes
 *   bit-for-bit for the same reason they reproduce anything else.
 * - **No corner cutting.** A diagonal step is allowed only when both cells it
 *   brushes admit the hull. A route that cut a corner would hand movement a
 *   leg through rock, and `resolveStep` would spend the whole leg sliding.
 * - **A partial answer is still an answer.** When the goal cell is not
 *   reachable — the player clicked a plateau, or the ground closed behind the
 *   hull — the route ends at the reachable cell closest to the goal, and the
 *   final leg is steered straight, exactly as every leg used to be. The hull
 *   ends up pressed against the ground nearest its order, which is what it did
 *   before, only now it gets there.
 *
 * Every array is sized once per world and reused across calls: a route is
 * planned inside the 60 Hz step and must not be the thing that allocates there.
 */

import type { Terrain } from './terrain.ts';

/** Ten a side, fourteen a diagonal: √2 to two figures, and an integer. */
const STRAIGHT = 10;
const DIAGONAL = 14;

/**
 * How far ahead string-pulling looks for a waypoint the hull can reach
 * directly. Bounded so a long route costs a bounded number of segment tests at
 * planning time; sixteen cells is four kilometres on a 250 m grid.
 */
const PULL_LOOKAHEAD = 16;

/**
 * The route one hull is following toward one order.
 *
 * Held on the world by entity (`SimWorld.paths`) rather than in a component,
 * because a waypoint list is not a fixed-width field. Sim state in the
 * determinism sense — it is derived from position, order and ground, all of
 * which the state hash covers — so it is not hashed itself.
 */
export interface PathPlan {
  /** The order the route was planned for; an order elsewhere invalidates it. */
  targetX: number;
  targetY: number;
  /** The two facts passability depends on, at planning time. */
  revision: number;
  depthM: number;
  /** Tick the plan was made on, for the revalidation cadence. */
  tick: number;
  /**
   * Cell-centre waypoints, x/y interleaved, ending short of the target: the
   * final leg to the order itself is always steered straight. Empty means
   * "straight at the target" — open water, or nothing reachable at all.
   */
  waypoints: number[];
  /**
   * On volumetric ground, one depth per waypoint: the depth to hold while
   * steering at it (`Pathfinder.findPath3d`). Empty on every other map.
   */
  depths: number[];
  /**
   * The depth the route holds the hull at this tick, which `depthSystem`
   * travels to in place of the order's; NaN on the final leg, off a route, and
   * on every map that is not volumetric.
   */
  routeDepthM: number;
  /** Pair index of the waypoint being steered at. */
  index: number;
  /**
   * True when the last search could not reach the goal cell. Such a plan is
   * only revisited when the ground or the hull's depth changes: re-searching
   * a sealed goal on the tick cadence would be the one way this could grow
   * into a per-tick cost.
   */
  exhausted: boolean;
}

/** What a metre of depth costs a volumetric route, against a cell of travel. */
export interface RouteCost {
  /** The hull's speed in the plan, metres a second. */
  speedMps: number;
  descentMps: number;
  ascentMps: number;
}

export class Pathfinder {
  private readonly cols: number;
  private readonly rows: number;
  /** Cost from the start, valid where `gStamp` matches the current run. */
  private readonly g: Int32Array;
  private readonly gStamp: Uint32Array;
  private readonly closedStamp: Uint32Array;
  private readonly parent: Int32Array;
  private readonly f: Int32Array;
  private readonly h: Int32Array;
  /** The depth a cell was entered at, for `findPath3d`; read where `gStamp` matches. */
  private readonly depth: Float64Array;
  /** Binary heap of cell indices ordered by (f, h, index). */
  private readonly heap: number[] = [];
  private run = 0;
  /** Reconstruction scratch, so a route never allocates on the way out. */
  private readonly trail: number[] = [];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    const n = cols * rows;
    this.g = new Int32Array(n);
    this.gStamp = new Uint32Array(n);
    this.closedStamp = new Uint32Array(n);
    this.parent = new Int32Array(n);
    this.f = new Int32Array(n);
    this.h = new Int32Array(n);
    this.depth = new Float64Array(n);
  }

  /**
   * Route from (fromX, fromY) toward (toX, toY) for a hull at `depthM`.
   *
   * Writes cell-centre waypoints into `out`, x/y interleaved, and returns
   * whether the goal cell itself was reached. `out` is left empty when the
   * two points share a cell, or when nothing beyond the start cell is
   * reachable — both mean "steer straight", and the caller does.
   */
  findPath(
    terrain: Terrain,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    depthM: number,
    out: number[]
  ): boolean {
    out.length = 0;
    const cols = this.cols;
    const start = terrain.cellIndexAt(fromX, fromY);
    const goal = terrain.cellIndexAt(toX, toY);
    if (start === goal) return true;

    const goalCx = goal % cols;
    const goalCy = (goal - goalCx) / cols;
    // The stamp is what makes reuse free: a cell whose stamp is stale has
    // whatever the last search left in it, and is read as unvisited.
    const run = ++this.run;
    const { g, gStamp, closedStamp, parent, f, h, heap } = this;
    heap.length = 0;

    g[start] = 0;
    gStamp[start] = run;
    parent[start] = -1;
    h[start] = this.octile(start % cols, (start - (start % cols)) / cols, goalCx, goalCy);
    f[start] = h[start]!;
    this.push(start);

    let best = start;
    let bestH = h[start]!;
    let found = false;

    while (heap.length > 0) {
      const n = this.pop();
      if (closedStamp[n] === run) continue;
      closedStamp[n] = run;
      if (n === goal) {
        found = true;
        break;
      }
      const hn = h[n]!;
      if (hn < bestH) {
        bestH = hn;
        best = n;
      }

      const cx = n % cols;
      const cy = (n - cx) / cols;
      const gn = g[n]!;
      // Fixed neighbour order, part of the determinism contract: with equal f
      // and h the heap falls through to the cell index, and equal cell index
      // is the same cell.
      for (let dy = -1; dy <= 1; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= this.rows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          if (nx < 0 || nx >= cols) continue;
          if (!terrain.admitsCell(nx, ny, depthM)) continue;
          const diagonal = dx !== 0 && dy !== 0;
          if (
            diagonal &&
            (!terrain.admitsCell(cx + dx, cy, depthM) || !terrain.admitsCell(cx, cy + dy, depthM))
          ) {
            continue;
          }
          const idx = ny * cols + nx;
          if (closedStamp[idx] === run) continue;
          const ng = gn + (diagonal ? DIAGONAL : STRAIGHT);
          if (gStamp[idx] === run && ng >= g[idx]!) continue;
          g[idx] = ng;
          gStamp[idx] = run;
          parent[idx] = n;
          const hi = this.octile(nx, ny, goalCx, goalCy);
          h[idx] = hi;
          f[idx] = ng + hi;
          this.push(idx);
        }
      }
    }

    const end = found ? goal : best;
    if (end === start) return false;

    // Walk the parents back to the start, then emit forward — dropping the
    // start cell, which the hull is already in.
    const trail = this.trail;
    trail.length = 0;
    for (let n = end; n !== start; n = parent[n]!) trail.push(n);
    trail.reverse();

    // String-pulling: from wherever the hull actually is, aim at the farthest
    // waypoint in reach with a clear segment to it, then repeat from there. A
    // cell-by-cell route reads as a hull staggering along a staircase; a
    // pulled one reads as a course. Bounded lookahead keeps planning cost
    // linear in the route.
    let anchorX = fromX;
    let anchorY = fromY;
    let i = 0;
    while (i < trail.length) {
      let pick = i;
      const limit = Math.min(trail.length - 1, i + PULL_LOOKAHEAD);
      for (let j = limit; j > i; j--) {
        const cell = trail[j]!;
        const cxj = cell % cols;
        const cyj = (cell - cxj) / cols;
        if (
          terrain.segmentAdmits(
            anchorX,
            anchorY,
            terrain.cellCentreX(cxj),
            terrain.cellCentreY(cyj),
            depthM
          )
        ) {
          pick = j;
          break;
        }
      }
      const cell = trail[pick]!;
      const pcx = cell % cols;
      const pcy = (cell - pcx) / cols;
      anchorX = terrain.cellCentreX(pcx);
      anchorY = terrain.cellCentreY(pcy);
      out.push(anchorX, anchorY);
      i = pick + 1;
    }
    return found;
  }

  /**
   * Route through three dimensions, for volumetric ground only
   * (docs/free-water-slice.md §9, "Routes that climb and dive"; #1754).
   *
   * The same A* over the same cells, with one more fact per cell: the depth
   * the hull holds in it. A step into a neighbour is open when the two cells'
   * water overlaps (and, on a diagonal, the two cells it brushes too, the
   * no-corner-cutting rule in depth), and the hull takes it at the depth in
   * that overlap nearest the one it holds, so it climbs or dives only as far as
   * the ground asks. Each metre of it is costed at the real rate, a dive at
   * `cost.descentMps` and a climb at `cost.ascentMps`, in the step costs' own
   * integer units of time at `cost.speedMps`: so a slow climb over a sill can
   * lose to a long way round, and a fast dive through a cut can win.
   *
   * `deepestM` is the bottom of every overlap: the caller's Pressure Rating
   * bound, so a route never spends crush on the player's behalf.
   *
   * A cell keeps the depth it was first closed at, so the search is over
   * cells, not cells and depths: one water interval per cell makes the depth
   * a function of the way in, and this keeps the cost and the determinism
   * contract `findPath`'s. Writes waypoints into `out` as `findPath` does, and
   * one depth per waypoint into `outDepths`: the depth to hold while steering
   * at it. String-pulling never spans a change of depth, so a leg is flown at
   * one depth and the change happens where the route says.
   */
  findPath3d(
    terrain: Terrain,
    fromX: number,
    fromY: number,
    fromDepthM: number,
    toX: number,
    toY: number,
    goalDepthM: number,
    deepestM: number,
    cost: RouteCost,
    out: number[],
    outDepths: number[]
  ): boolean {
    out.length = 0;
    outDepths.length = 0;
    const cols = this.cols;
    const start = terrain.cellIndexAt(fromX, fromY);
    const goal = terrain.cellIndexAt(toX, toY);
    if (start === goal) return true;

    const goalCx = goal % cols;
    const goalCy = (goal - goalCx) / cols;
    const run = ++this.run;
    const { g, gStamp, closedStamp, parent, f, h, heap, depth } = this;
    heap.length = 0;
    // Time in step units per metre of depth, each way: a straight step is
    // STRAIGHT units for one cell at the hull's speed.
    const unitsPerS = (STRAIGHT * cost.speedMps) / terrain.cellM;
    const perDiveM = unitsPerS / cost.descentMps;
    const perClimbM = unitsPerS / cost.ascentMps;
    // The depth the goal is reached at: the order's, as far as the goal's
    // water allows. What is left to climb or dive to it is part of every
    // state's estimate (`toGoal`), so a hull under a roof is charged now for
    // the slow climb back to an ordered 300 m. Without it a cell first reached
    // at 800 m, cheaply, would shadow the same cell reached at 300 m by the
    // long way, and every hull would take every cut.
    const goalCeil = terrain.ceilingOfCell(goal);
    const goalFloor = terrain.floorOfCell(goal);
    const goalAtM =
      goalDepthM < goalCeil ? goalCeil : goalDepthM > goalFloor ? goalFloor : goalDepthM;
    const toGoal = (atM: number): number =>
      atM === goalAtM
        ? 0
        : Math.ceil(atM < goalAtM ? (goalAtM - atM) * perDiveM : (atM - goalAtM) * perClimbM);

    g[start] = 0;
    gStamp[start] = run;
    parent[start] = -1;
    depth[start] = fromDepthM;
    // `h` stays the plan distance alone, so a partial route still ends at the
    // cell nearest the goal in the plan; `f` carries the depth still owed.
    h[start] = this.octile(start % cols, (start - (start % cols)) / cols, goalCx, goalCy);
    f[start] = h[start]! + toGoal(fromDepthM);
    this.push(start);

    let best = start;
    let bestH = h[start]!;
    let found = false;

    while (heap.length > 0) {
      const n = this.pop();
      if (closedStamp[n] === run) continue;
      closedStamp[n] = run;
      if (n === goal) {
        found = true;
        break;
      }
      const hn = h[n]!;
      if (hn < bestH) {
        bestH = hn;
        best = n;
      }

      const cx = n % cols;
      const cy = (n - cx) / cols;
      const gn = g[n]!;
      const dn = depth[n]!;
      const ceilN = terrain.ceilingOfCell(n);
      const floorN = terrain.floorOfCell(n);
      for (let dy = -1; dy <= 1; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= this.rows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          if (nx < 0 || nx >= cols) continue;
          const idx = ny * cols + nx;
          if (closedStamp[idx] === run) continue;
          let lo = Math.max(ceilN, terrain.ceilingOfCell(idx));
          let hi = Math.min(floorN, terrain.floorOfCell(idx), deepestM);
          const diagonal = dx !== 0 && dy !== 0;
          if (diagonal) {
            const sideA = cy * cols + nx;
            const sideB = ny * cols + cx;
            lo = Math.max(lo, terrain.ceilingOfCell(sideA), terrain.ceilingOfCell(sideB));
            hi = Math.min(hi, terrain.floorOfCell(sideA), terrain.floorOfCell(sideB));
          }
          if (lo > hi) continue;
          const dm = dn < lo ? lo : dn > hi ? hi : dn;
          const vertical =
            dm === dn ? 0 : Math.ceil(dm > dn ? (dm - dn) * perDiveM : (dn - dm) * perClimbM);
          const ng = gn + (diagonal ? DIAGONAL : STRAIGHT) + vertical;
          const hm = this.octile(nx, ny, goalCx, goalCy);
          const nf = ng + hm + toGoal(dm);
          // One depth per cell, so two ways in are ranked by everything they
          // still owe, depth included, not by the cost so far alone.
          if (gStamp[idx] === run && nf >= f[idx]!) continue;
          g[idx] = ng;
          gStamp[idx] = run;
          parent[idx] = n;
          depth[idx] = dm;
          h[idx] = hm;
          f[idx] = nf;
          this.push(idx);
        }
      }
    }

    const end = found ? goal : best;
    if (end === start) return false;

    const trail = this.trail;
    trail.length = 0;
    for (let n = end; n !== start; n = parent[n]!) trail.push(n);
    trail.reverse();

    // String-pulling as `findPath` does it, inside one run of equal depth: a
    // pulled leg that crossed a change of depth would ask the hull to be at
    // the new depth before the cell that lets it change.
    let anchorX = fromX;
    let anchorY = fromY;
    let i = 0;
    while (i < trail.length) {
      const legDepth = depth[trail[i]!]!;
      let runEnd = i;
      while (runEnd + 1 < trail.length && depth[trail[runEnd + 1]!] === legDepth) runEnd++;
      let pick = i;
      const limit = Math.min(runEnd, i + PULL_LOOKAHEAD);
      for (let j = limit; j > i; j--) {
        const cell = trail[j]!;
        const cxj = cell % cols;
        const cyj = (cell - cxj) / cols;
        if (
          terrain.segmentAdmits(
            anchorX,
            anchorY,
            terrain.cellCentreX(cxj),
            terrain.cellCentreY(cyj),
            legDepth
          )
        ) {
          pick = j;
          break;
        }
      }
      const cell = trail[pick]!;
      const pcx = cell % cols;
      const pcy = (cell - pcx) / cols;
      anchorX = terrain.cellCentreX(pcx);
      anchorY = terrain.cellCentreY(pcy);
      out.push(anchorX, anchorY);
      outDepths.push(legDepth);
      i = pick + 1;
    }
    return found;
  }

  /** Octile distance in the same integer units as the step costs. */
  private octile(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax > bx ? ax - bx : bx - ax;
    const dy = ay > by ? ay - by : by - ay;
    const lo = dx < dy ? dx : dy;
    return STRAIGHT * (dx + dy) + (DIAGONAL - 2 * STRAIGHT) * lo;
  }

  /** Strict total order on open cells: lower f, then lower h, then lower index. */
  private before(a: number, b: number): boolean {
    const fa = this.f[a]!;
    const fb = this.f[b]!;
    if (fa !== fb) return fa < fb;
    const ha = this.h[a]!;
    const hb = this.h[b]!;
    if (ha !== hb) return ha < hb;
    return a < b;
  }

  private push(idx: number): void {
    const heap = this.heap;
    heap.push(idx);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.before(heap[i]!, heap[p]!)) break;
      const t = heap[i]!;
      heap[i] = heap[p]!;
      heap[p] = t;
      i = p;
    }
  }

  private pop(): number {
    const heap = this.heap;
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length === 0) return top;
    heap[0] = last;
    let i = 0;
    const n = heap.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.before(heap[l]!, heap[m]!)) m = l;
      if (r < n && this.before(heap[r]!, heap[m]!)) m = r;
      if (m === i) break;
      const t = heap[i]!;
      heap[i] = heap[m]!;
      heap[m] = t;
      i = m;
    }
    return top;
  }
}
