/**
 * Ground-lying chart ink cut at the map's rim (#1556).
 *
 * The chart projects a ring vertex by vertex onto the seabed, and the conn
 * view answers a point past the map's edge with the edge cell's depth. So a
 * ring whose radius crosses the edge kept going, over the skirt and into the
 * void beyond it: the fleet's reach ring rose above the rim, a corner storm's
 * ring floated on the horizon. The rim is chart ink and the skirt the water
 * the world ends in (docs/map-visuals.md §5, docs/world-map.md §7.4), so a
 * measurement that runs past both reads as a draw fault, not as water.
 *
 * Both cuts are in world metres, before anything is projected, so the cut
 * lands on the rim exactly rather than at the last vertex short of it — a
 * 2,400 m ring's vertices stand 314 m apart.
 */
import type { PlanRect } from '@echoes/shared';

/**
 * The part of the segment from (x0, y0) to (x1, y1) inside `rect`, edges
 * included (Liang–Barsky), as the two parameters along it, written into
 * `out`. False when no part is inside.
 */
export function clipSegment(
  rect: PlanRect,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  out: [number, number]
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  // Each edge in turn: p the segment's travel against the edge's outward
  // normal, q how far inside the edge the start stands. No array of them:
  // the chart clips every ring vertex every frame (#432's garbage).
  for (let edge = 0; edge < 4; edge++) {
    const p = edge === 0 ? -dx : edge === 1 ? dx : edge === 2 ? -dy : dy;
    const q =
      edge === 0
        ? x0 - rect.x
        : edge === 1
          ? rect.x + rect.widthM - x0
          : edge === 2
            ? y0 - rect.y
            : rect.y + rect.heightM - y0;
    if (p === 0) {
      // Parallel to the edge: wholly outside it or never crossing it.
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  out[0] = t0;
  out[1] = t1;
  return true;
}

/**
 * A polygon, as flat x, y pairs, cut to `rect` (Sutherland–Hodgman). Exact
 * for a convex polygon, which every filled circle is; the result is convex
 * too. Fewer than three corners when nothing of it is inside.
 */
export function clipPolygon(rect: PlanRect, points: readonly number[]): number[] {
  const right = rect.x + rect.widthM;
  const bottom = rect.y + rect.heightM;
  // Each edge as "how far inside" a point stands: inside at zero or more.
  const sides: readonly ((x: number, y: number) => number)[] = [
    (x) => x - rect.x,
    (x) => right - x,
    (_x, y) => y - rect.y,
    (_x, y) => bottom - y,
  ];
  let poly: number[] = points.slice();
  for (const side of sides) {
    if (poly.length < 6) return [];
    const next: number[] = [];
    const n = poly.length / 2;
    for (let i = 0; i < n; i++) {
      const ax = poly[i * 2]!;
      const ay = poly[i * 2 + 1]!;
      const j = (i + 1) % n;
      const bx = poly[j * 2]!;
      const by = poly[j * 2 + 1]!;
      const da = side(ax, ay);
      const db = side(bx, by);
      if (da >= 0) next.push(ax, ay);
      // The edge crosses this side strictly: keep the crossing point.
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        next.push(ax + (bx - ax) * t, ay + (by - ay) * t);
      }
    }
    poly = next;
  }
  return poly.length < 6 ? [] : poly;
}
