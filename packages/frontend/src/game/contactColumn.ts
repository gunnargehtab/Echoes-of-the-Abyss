/**
 * The honest column glyph — how a contact with no earned depth is drawn.
 *
 * Below Tier 3 the server sends no depth (`Contact.depth` is Tier-3+ only, by
 * the server-authoritative rule in docs/tech-stack.md), so the renderer knows
 * the contact's plan position — blurred at Tier 2, the *listener's* own
 * position at Tier 1 — and nothing at all about where in the water it sits.
 * The flat chart never had to answer that; a 3D projection does, and Phase 1
 * answered it by parking the mark at a fixed 600 m reference. That reference
 * drew a height nobody earned, which is the first law of this renderer broken
 * (docs/art-direction.md, the Asymmetric Fidelity Law): the visual fidelity of
 * a contact must match the informational fidelity the player paid for.
 *
 * So the mark stops being a point at a height and becomes a statement about
 * the **column**: a soft vertical presence spanning the water a hull could
 * actually be standing in at that plan position, from the Lid down to the
 * seabed. The screen says "somewhere in this water", which is exactly what
 * the server said.
 *
 * Three rules shape everything below, and none of them is negotiable:
 *
 * - **Nothing may sharpen the plan position beyond its tier.** No hairline, no
 *   centre stroke, no crisp edge — the column is drawn as nested soft ribbons
 *   whose *widest* one carries the tier's own uncertainty radius. A one-pixel
 *   line down the middle would claim a plan position to the metre, and at
 *   Tier 1 that position is the listener's own.
 * - **The uncertainty is uniform along the column.** One width and one alpha
 *   from end to end, because a bright middle would say "probably around
 *   mid-water" — the same lie as the 600 m reference, told more softly. The
 *   only exception is a short taper *at* the two ends, which is a statement
 *   about the Lid and the seabed rather than about the water between them.
 * - **Quieter than an earned track.** The composite alpha at the column's core
 *   stays under the tier's own flat-blob alpha, which is already far under a
 *   Tier-4 track's.
 *
 * Pure geometry: no Pixi, no three.js, so the layout is testable under node
 * and the painter stays a dumb consumer. The caller projects; this module only
 * decides *what* to project and how to lay the result out.
 */

import { LID } from '@echoes/shared';

/**
 * TUNABLE — samples down the column.
 *
 * Odd, so the middle sample is a real projection the billboard can anchor to
 * rather than an average of two. Nine is enough that a column leaning toward
 * the vertical vanishing point reads as a curve rather than a chord, and cheap
 * enough that a screen full of unresolved contacts costs less than one range
 * ring (48 vertices).
 */
export const COLUMN_SAMPLES = 9;

/**
 * TUNABLE — the shortest column worth drawing, in metres of depth.
 *
 * Water shallower than the Lid would otherwise collapse the span to nothing;
 * the mark keeps a readable extent by hanging off the floor instead.
 */
export const COLUMN_MIN_SPAN_M = 120;

/**
 * TUNABLE — what fraction of the tier's own alpha the column's core carries.
 *
 * Under 1 by construction: the column is a *quieter* statement than the flat
 * blob it replaces, because it is a vaguer one. Everything softer than the
 * core falls out of the ribbon stack below.
 */
export const COLUMN_CORE_INK = 0.7;

/**
 * TUNABLE — how wide the column is at its two ends, as a fraction of its
 * width everywhere else.
 *
 * The one place the shape is allowed to say something about *where in the
 * column*: right at the Lid the water bites (docs/systems-depth.md §2) and
 * right at the seabed there is ground, so neither extreme holds a hull the way
 * the open water between them does. It also stops the mark ending in a cut
 * edge, which is what would make it read as a thing rather than as water —
 * the rule docs/audio-direction.md §6 puts on echo marks, applied to sight.
 */
export const COLUMN_END_TAPER = 0.25;

/**
 * The nested ribbons that make the column soft across the plan without an
 * edge anywhere.
 *
 * `width` is a fraction of the tier's own radius, cosine-spaced so the outer
 * ribbons crowd the edge and the ink piles up toward the middle — a falloff,
 * not a stack of steps. `ink` is the tier's own alpha shared out between them,
 * so the composite (1 − Π(1 − ink·α)) at the core lands a little *under*
 * `COLUMN_CORE_INK`·α — compositing eats the difference, and eating it is the
 * softness. The widest ribbon is exactly the tier's own radius: the mark is
 * never narrower than the plan position is uncertain.
 */
export const COLUMN_RIBBONS: readonly { width: number; ink: number }[] = (() => {
  const count = 12;
  return Array.from({ length: count }, (_, i) => ({
    width: Math.cos((i / count) * (Math.PI / 2)),
    ink: COLUMN_CORE_INK / count,
  }));
})();

/** One projected sample, as `PerspectiveView.projectPoint` answers it. */
export interface ColumnPoint {
  x: number;
  y: number;
  pxPerM: number;
  visible: boolean;
}

/** The column laid out in the billboard's own local (world-metre) space. */
export interface ColumnLayout {
  /** Where the symbol Graphics sits, and the scale it draws at. */
  anchor: { x: number; y: number; pxPerM: number };
  /**
   * Each sample relative to the anchor, in local metres, carrying its own
   * scale so a sample further from the camera keeps its width in *metres*
   * rather than inheriting the anchor's pixels, and its own `taper` — 1
   * everywhere but the two ends.
   */
  path: readonly ColumnStep[];
}

/** One sample of the column, laid out in the billboard's local space. */
export interface ColumnStep {
  ox: number;
  oy: number;
  scale: number;
  taper: number;
}

/**
 * The depths a contact with no earned depth could be at, top down.
 *
 * The top is the Lid (docs/systems-depth.md §2): sour water no hull holds
 * station in, so it is the honest ceiling of "where something could be
 * sitting". The bottom is the seabed under the plan position — ground, not
 * water. Null when there is no column to speak of, which is what a missing
 * terrain reads as.
 */
export function columnDepthsM(seabedDepthM: number): number[] | null {
  const bottomM = Math.max(0, seabedDepthM);
  // Shallower than the Lid the span would vanish, so the column hangs off the
  // floor instead of reaching for a ceiling that is below it.
  const topM = Math.min(LID.DEPTH_M, Math.max(0, bottomM - COLUMN_MIN_SPAN_M));
  if (bottomM - topM < 1) return null;
  const out: number[] = [];
  for (let i = 0; i < COLUMN_SAMPLES; i++) {
    out.push(topM + ((bottomM - topM) * i) / (COLUMN_SAMPLES - 1));
  }
  return out;
}

/**
 * Projected samples → a billboard anchor and a local-space path.
 *
 * Null when any sample left the frustum: a partly-projected column would
 * invent an end for itself, the same reason `fillCircle` drops a clipped ring
 * rather than closing it across the screen.
 */
export function columnLayout(points: readonly ColumnPoint[]): ColumnLayout | null {
  if (points.length < 2) return null;
  for (const p of points) if (!p.visible) return null;
  const mid = points[(points.length - 1) >> 1]!;
  if (mid.pxPerM <= 0) return null;
  const last = points.length - 1;
  const path = points.map((p, i) => ({
    ox: (p.x - mid.x) / mid.pxPerM,
    oy: (p.y - mid.y) / mid.pxPerM,
    scale: p.pxPerM / mid.pxPerM,
    // Only the two end samples taper. Everything between them is one width,
    // because the water between the Lid and the floor is one claim.
    taper: i === 0 || i === last ? COLUMN_END_TAPER : 1,
  }));
  return { anchor: { x: mid.x, y: mid.y, pxPerM: mid.pxPerM }, path };
}

/**
 * One ribbon down the column as a closed polygon, in the anchor's local space.
 *
 * The offset is screen-horizontal rather than perpendicular to the path on
 * purpose: this is a *billboarded* haze (gate 8), so its width is a screen
 * fact about how badly the plan position is known, not a world thickness that
 * ought to lean with the column.
 */
export function columnRibbon(path: readonly ColumnStep[], halfWidthM: number): number[] {
  const points: number[] = [];
  for (let i = 0; i < path.length; i++) {
    const s = path[i]!;
    points.push(s.ox - halfWidthM * s.scale * s.taper, s.oy);
  }
  for (let i = path.length - 1; i >= 0; i--) {
    const s = path[i]!;
    points.push(s.ox + halfWidthM * s.scale * s.taper, s.oy);
  }
  return points;
}

/** Screen distance from a point to a segment. */
function segmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/**
 * How far the pointer is from the drawn column, in screen pixels.
 *
 * Aim resolves against what is *drawn* (docs/art-direction.md, "What you click
 * is what the simulation collides"), and what is drawn here is the whole
 * column — so a click anywhere down it is a click on the contact, rather than
 * on the one height the old reference happened to pick.
 */
export function distanceToColumn(px: number, py: number, points: readonly ColumnPoint[]): number {
  if (points.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (!a.visible || !b.visible) continue;
    best = Math.min(best, segmentDistance(px, py, a.x, a.y, b.x, b.y));
  }
  return best;
}
