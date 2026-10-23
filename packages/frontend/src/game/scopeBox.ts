/**
 * The scope's camera box, cut to the map (#1558).
 *
 * The box is the view's true ground footprint and the scope's compass
 * (docs/free-camera.md §5, docs/ui-ux.md §5). Its corners used to be clamped
 * one by one into the frame, and a camera looking past the map's edge put two
 * or three of them on the same side: the trapezoid fell into a triangle, a
 * slash, or the whole scope plus a sliver, saying neither where the camera was
 * nor which way it faced. Cutting the polygon instead keeps every edge where
 * it truly runs, stopped at the frame.
 */
import type { PlanRect } from '@echoes/shared';
import { clipPolygon, clipSegment } from './rimClip.ts';

/** The box in world metres: its outline, and the edge drawn heavier. */
export interface ScopeBox {
  /** Flat x, y pairs, empty when nothing of the view is on the map. */
  outline: number[];
  /** x0, y0, x1, y1, or null when there is no outline. */
  far: [number, number, number, number] | null;
}

/**
 * Cut `quad` — the four ground corners, far edge first, as `groundQuad`
 * returns them — to `map`. The heavy edge is the part of the true far edge on
 * the map. When none of it is, the camera looks off the map and the box ends
 * at the frame, so the heavy edge is the box's side on the rim the view leaves
 * by: still the way the camera faces, and where its ground runs on past the
 * scope.
 */
export function scopeBox(quad: ReadonlyArray<{ x: number; y: number }>, map: PlanRect): ScopeBox {
  const [a, b, c, d] = quad;
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    return { outline: [], far: null };
  }
  const outline = clipPolygon(map, [a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y]);
  if (outline.length === 0) return { outline, far: null };

  const span: [number, number] = [0, 0];
  if (clipSegment(map, a.x, a.y, b.x, b.y, span) && span[1] > span[0]) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return {
      outline,
      far: [a.x + dx * span[0], a.y + dy * span[0], a.x + dx * span[1], a.y + dy * span[1]],
    };
  }

  // The view's centre line, from the near edge's midpoint to the far edge's.
  // It passes through the camera's focus, which the conn view holds on the
  // map, so it always leaves the map by one rim: the first one it crosses
  // outward, as Liang–Barsky's exit parameter finds it.
  const mx = (c.x + d.x) / 2;
  const my = (c.y + d.y) / 2;
  const vx = (a.x + b.x) / 2 - mx;
  const vy = (a.y + b.y) / 2 - my;
  const right = map.x + map.widthM;
  const bottom = map.y + map.heightM;
  let exit = Infinity;
  let rim = -1;
  for (let edge = 0; edge < 4; edge++) {
    const p = edge === 0 ? -vx : edge === 1 ? vx : edge === 2 ? -vy : vy;
    if (p <= 0) continue;
    const q =
      edge === 0 ? mx - map.x : edge === 1 ? right - mx : edge === 2 ? my - map.y : bottom - my;
    if (q / p < exit) {
      exit = q / p;
      rim = edge;
    }
  }
  if (rim < 0) return { outline, far: null };

  // The box is convex, so it meets the rim's line in one segment: the span of
  // its corners on that line. Sutherland–Hodgman's crossings land on the rim
  // only to rounding, hence the tolerance.
  const across = rim < 2;
  const line = rim === 0 ? map.x : rim === 1 ? right : rim === 2 ? map.y : bottom;
  const tolerance = 1e-6 * Math.max(map.widthM, map.heightM);
  let from = Infinity;
  let to = -Infinity;
  for (let i = 0; i < outline.length; i += 2) {
    const onAxis = across ? outline[i]! : outline[i + 1]!;
    if (Math.abs(onAxis - line) > tolerance) continue;
    const along = across ? outline[i + 1]! : outline[i]!;
    from = Math.min(from, along);
    to = Math.max(to, along);
  }
  if (!(to > from)) return { outline, far: null };
  return { outline, far: across ? [line, from, line, to] : [from, line, to, line] };
}
