/**
 * The sonar scope's sweep and range rings, held inside the scope's frame —
 * docs/ui-ux.md §5 (#1086).
 *
 * Both are centred on the scope's anchor, the player's Bastion, and the
 * Bastion is rarely in the middle of the map. The sweep used to be a line the
 * scope's own width long and the rings whole circles, so from an anchor near a
 * corner the line ran off the scope, across the console and out of the window,
 * and the 2,400 m ring bulged through two of the scope's edges. An instrument
 * that draws past its own glass reads as a broken one, and the scope's camera
 * box already clamps to the square for that reason.
 *
 * Clipped in geometry rather than by a Pixi mask. Pixi 8.19 masks a Graphics
 * with the stencil buffer, which breaks the HUD's batch three times and draws
 * the mask twice on every frame, for a scope whose square is known in closed
 * form.
 *
 * Kept apart from `EchoRenderer` so node:test can hold the geometry without a
 * renderer in the room.
 */
import type { Graphics } from 'pixi.js';

const TAU = Math.PI * 2;

/**
 * SPEC — docs/ui-ux.md §5, the sweep's ink, which transcribes the committed
 * scope mockup (`docs/concept-art/hud-mockups/chrome.mjs`, `scopeFace`). The
 * reduced-motion cross-hair takes the same alpha, because
 * docs/style-neon-noir.md "Reduced motion" says it is drawn at it.
 */
export const SWEEP_LINE_ALPHA = 0.42;

/**
 * SPEC — docs/ui-ux.md §5, the wedge the line trails: 12° of the turn behind
 * it at 9% ink. It is phosphor and not a beam, and nothing under it brightens,
 * because the sweep finds nothing.
 */
export const SWEEP_TRAIL_ALPHA = 0.09;
export const SWEEP_TRAIL_RAD = (12 * Math.PI) / 180;

/**
 * SPEC — docs/ui-ux.md §5, the range rings' ink, from the same mockup: the
 * 900 m ring in the interface cyan at 30%, the 2,400 m ring threat-red at 32%.
 * Red because docs/style-neon-noir.md gives neon-red to the ping's reveal
 * radius, and that ring is the threat: every enemy listener inside it resolves
 * the pinger to Tier 4 (docs/systems-echo.md §5).
 */
export const RING_NEAR_ALPHA = 0.3;
export const RING_FAR_ALPHA = 0.32;

/**
 * SPEC — docs/ui-ux.md §5, the ring labels: text-dim at 7.5 px, 3 px right of
 * where the label marks its ring and 2 px clear of the line, as the mockup
 * sets them.
 */
export const RING_LABEL_FONT_PX = 7.5;
const LABEL_OFFSET_X = 3;
const LABEL_CLEAR_Y = 2;

/** The cross-hair's arm under reduced motion, as a fraction of the scope. */
const CROSS_HAIR_ARM = 0.06;

export interface ScopePoint {
  x: number;
  y: number;
}

/** A bearing folded into `[0, 2π)`. */
function wrap(angle: number): number {
  return ((angle % TAU) + TAU) % TAU;
}

function clampToFrame(value: number, size: number): number {
  return Math.min(size, Math.max(0, value));
}

/**
 * Where a ray from `(cx, cy)` at `angle` leaves the square `[0, size]²`.
 * Screen bearings: 0 points along +x, and a growing angle turns clockwise.
 * The anchor is clamped into the square first, so a ray always has an exit.
 */
export function rayToFrame(cx: number, cy: number, angle: number, size: number): ScopePoint {
  const x0 = clampToFrame(cx, size);
  const y0 = clampToFrame(cy, size);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (size - x0) / dx);
  else if (dx < 0) t = Math.min(t, -x0 / dx);
  if (dy > 0) t = Math.min(t, (size - y0) / dy);
  else if (dy < 0) t = Math.min(t, -y0 / dy);
  if (!Number.isFinite(t)) return { x: x0, y: y0 };
  // Clamped again because a cosine of 6e-17 is not zero, and the exit it
  // finds can sit a rounding error outside the edge it stopped at.
  return { x: clampToFrame(x0 + dx * t, size), y: clampToFrame(y0 + dy * t, size) };
}

/**
 * The part of the square between two bearings, seen from `(cx, cy)`: a fan
 * from the anchor to the two exits, through every corner between them. Exact
 * because the square is convex and the anchor is in it. Flat `[x, y, …]` for
 * `Graphics.poly`; `span` runs clockwise from `from` and is under a full turn.
 */
export function sectorInFrame(
  cx: number,
  cy: number,
  from: number,
  span: number,
  size: number
): number[] {
  const x0 = clampToFrame(cx, size);
  const y0 = clampToFrame(cy, size);
  const start = rayToFrame(x0, y0, from, size);
  const points = [x0, y0, start.x, start.y];
  const corners: Array<{ offset: number; x: number; y: number }> = [];
  for (const [x, y] of [
    [size, 0],
    [size, size],
    [0, size],
    [0, 0],
  ] as const) {
    const offset = wrap(Math.atan2(y - y0, x - x0) - from);
    if (offset > 0 && offset < span) corners.push({ offset, x, y });
  }
  corners.sort((a, b) => a.offset - b.offset);
  for (const corner of corners) points.push(corner.x, corner.y);
  const end = rayToFrame(x0, y0, from + span, size);
  points.push(end.x, end.y);
  return points;
}

/**
 * The arcs of the circle about `(cx, cy)` that lie inside the square, as
 * `[start, end]` bearings with `start < end`. The whole turn when the circle
 * is wholly inside, none when it is wholly outside or encloses the square.
 */
export function arcsInFrame(
  cx: number,
  cy: number,
  radius: number,
  size: number
): Array<[number, number]> {
  if (!(radius > 0)) return [];
  if (cx - radius >= 0 && cx + radius <= size && cy - radius >= 0 && cy + radius <= size) {
    return [[0, TAU]];
  }
  const inside = (angle: number): boolean => {
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    return x >= 0 && x <= size && y >= 0 && y <= size;
  };
  // Where the circle crosses each of the square's four edge lines.
  const cuts: number[] = [];
  for (const c of [-cx / radius, (size - cx) / radius]) {
    if (Math.abs(c) <= 1) cuts.push(wrap(Math.acos(c)), wrap(-Math.acos(c)));
  }
  for (const s of [-cy / radius, (size - cy) / radius]) {
    if (Math.abs(s) <= 1) cuts.push(wrap(Math.asin(s)), wrap(Math.PI - Math.asin(s)));
  }
  cuts.sort((a, b) => a - b);
  if (cuts.length === 0) return inside(0) ? [[0, TAU]] : [];
  const arcs: Array<[number, number]> = [];
  for (let i = 0; i < cuts.length; i++) {
    const start = cuts[i]!;
    const end = i + 1 < cuts.length ? cuts[i + 1]! : cuts[0]! + TAU;
    if (end - start < 1e-9) continue;
    if (inside((start + end) / 2)) arcs.push([start, end]);
  }
  return arcs;
}

/** One range ring: its radius on the scope and the stroke it is drawn in. */
export interface ScopeRing {
  radius: number;
  ink: { width: number; color: number; alpha: number };
}

/**
 * The range rings, each cut to the arcs inside the scope. A ring wholly inside
 * is still one circle, so the common case draws exactly what it always did.
 */
export function drawScopeRings(
  g: Graphics,
  cx: number,
  cy: number,
  rings: readonly ScopeRing[],
  size: number
): void {
  for (const { radius, ink } of rings) {
    const arcs = arcsInFrame(cx, cy, radius, size);
    if (arcs.length === 0) continue;
    if (arcs.length === 1 && arcs[0]![1] - arcs[0]![0] >= TAU) {
      g.circle(cx, cy, radius).stroke(ink);
      continue;
    }
    for (const [start, end] of arcs) {
      // A move first, or the arc is joined to the last one by a chord.
      g.moveTo(cx + Math.cos(start) * radius, cy + Math.sin(start) * radius).arc(
        cx,
        cy,
        radius,
        start,
        end
      );
    }
    g.stroke(ink);
  }
}

/** Straight up the scope, in the screen bearings `arcsInFrame` returns. */
const TOP = (3 * Math.PI) / 2;

/** Bearings sampled along a visible arc, looking for room for a label. */
const LABEL_STEPS = 48;

/**
 * The bearings a ring's label may mark it at, best first: the top of the ring
 * when the scope shows it, which is where the mockup sets both, then outward
 * along the visible arcs by how far each bearing is from the top. A ring whose
 * top is cut starts where it comes in through the frame.
 */
function labelBearings(arcs: ReadonlyArray<[number, number]>): number[] {
  const bearings: number[] = [];
  for (const [start, end] of arcs) {
    if (wrap(TOP - start) <= end - start) bearings.push(start + wrap(TOP - start));
    for (let n = 0; n <= LABEL_STEPS; n++) bearings.push(start + ((end - start) * n) / LABEL_STEPS);
  }
  const gap = (at: number): number => {
    const off = wrap(at - TOP);
    return Math.min(off, TAU - off);
  };
  return bearings.sort((a, b) => gap(a) - gap(b));
}

/**
 * Where each ring's label goes, as the top-left of a `width` × `height` box in
 * scope pixels, or null for a ring the scope does not show — docs/ui-ux.md §5
 * (#1096).
 *
 * A label sits 3 px right of a point on its ring and 2 px above the line, as
 * the mockup sets the 900 m one; failing that below it, as the mockup tucks the
 * 2,400 m one under a ring whose top is at the frame; failing that on the
 * point's left. Every label is held inside the frame, because the scope is the
 * instrument's glass (#1086) and a number printed off it reads as one belonging
 * to the console. Rings are placed in order, and a later label moves along its
 * ring rather than print over an earlier one: on a 12 km map the two rings are
 * 17 px apart, and from a corner both come in through the same edge.
 */
export function ringLabelsInFrame(
  cx: number,
  cy: number,
  labels: ReadonlyArray<{ radius: number; width: number; height: number }>,
  size: number
): Array<ScopePoint | null> {
  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  const fits = (x: number, y: number, w: number, h: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x + w <= size &&
    y + h <= size &&
    placed.every((o) => x + w <= o.x || o.x + o.w <= x || y + h <= o.y || o.y + o.h <= y);
  return labels.map(({ radius, width, height }) => {
    const arcs = arcsInFrame(cx, cy, radius, size);
    if (arcs.length === 0) return null;
    const bearings = labelBearings(arcs);
    let spot: ScopePoint | null = null;
    for (const bearing of bearings) {
      const px = cx + Math.cos(bearing) * radius;
      const py = cy + Math.sin(bearing) * radius;
      for (const x of [px + LABEL_OFFSET_X, px - LABEL_OFFSET_X - width]) {
        for (const y of [py - LABEL_CLEAR_Y - height, py + LABEL_CLEAR_Y]) {
          if (fits(x, y, width, height)) spot = { x, y };
          if (spot !== null) break;
        }
        if (spot !== null) break;
      }
      if (spot !== null) break;
    }
    // Nowhere fits: a scope too small for its own labels. Clamped beside the
    // best bearing rather than dropped, because a ring without its number is
    // the bug this fixes.
    if (spot === null) {
      const px = cx + Math.cos(bearings[0]!) * radius;
      const py = cy + Math.sin(bearings[0]!) * radius;
      spot = {
        x: Math.max(0, Math.min(size - width, px + LABEL_OFFSET_X)),
        y: Math.max(0, Math.min(size - height, py - LABEL_CLEAR_Y - height)),
      };
    }
    placed.push({ x: spot.x, y: spot.y, w: width, h: height });
    return spot;
  });
}

/**
 * The sweep at `angle`, or its reduced-motion cross-hair when `angle` is null
 * — docs/ui-ux.md §5 and §11.
 *
 * The line runs from the anchor to the scope's edge, which is where a sweep on
 * a square scope ends; the trail is the same fan cut by the same edge. Under
 * reduced motion the trail goes with the rotation: it said only which way the
 * line was turning, and a still cross-hair turns no way.
 */
export function drawScopeSweep(
  g: Graphics,
  cx: number,
  cy: number,
  angle: number | null,
  size: number,
  color: number
): void {
  const ink = { width: 1, color, alpha: SWEEP_LINE_ALPHA };
  if (angle === null) {
    const arm = size * CROSS_HAIR_ARM;
    g.moveTo(clampToFrame(cx - arm, size), cy)
      .lineTo(clampToFrame(cx + arm, size), cy)
      .stroke(ink);
    g.moveTo(cx, clampToFrame(cy - arm, size))
      .lineTo(cx, clampToFrame(cy + arm, size))
      .stroke(ink);
    return;
  }
  g.poly(sectorInFrame(cx, cy, angle - SWEEP_TRAIL_RAD, SWEEP_TRAIL_RAD, size)).fill({
    color,
    alpha: SWEEP_TRAIL_ALPHA,
  });
  const end = rayToFrame(cx, cy, angle, size);
  g.moveTo(clampToFrame(cx, size), clampToFrame(cy, size)).lineTo(end.x, end.y).stroke(ink);
}
