/**
 * Rank chevrons — docs/systems-progression.md §3, docs/ui-ux.md §4.
 *
 * "Chevrons beside the health bar the world view already carries": one to
 * three, stacked, pointing up, at the bar's right end. Drawn on every own hull
 * that has a rank, whether or not its bar is showing — the bar shows only when
 * the hull is hurt, and a whole veteran is still a veteran — and on an enemy
 * contact only when the server told the rank, which it does at Tier 4 alone.
 * The client never infers a rank from a maximum: it draws the field it was
 * sent, and an absent field is rank 0.
 *
 * Shape rather than hue carries it, so it survives every colour-vision palette
 * (§11), and it is still: a rank is a state, not an event, so reduced motion
 * owes it nothing.
 */

import type { Graphics } from 'pixi.js';

/** Screen pixels: one chevron's width, its rise, the pitch between two, and the gap off the bar. */
export const RANK_CHEVRON_PX = { width: 6, rise: 2.5, pitch: 3, gap: 3, stroke: 1.25 } as const;

/** One chevron, as three points: left foot, peak, right foot. */
export type Chevron = readonly [number, number, number, number, number, number];

/**
 * The chevrons for a rank, in the symbol's local space.
 *
 * `barRightX` and `barCentreY` are the health bar's right end and its centre
 * line, whether the bar is drawn or not; `inverseScale` turns screen pixels
 * into local units, as every instrument in the world view does. A rank outside
 * 1 to 3 draws nothing rather than a guess: the server only ever sends those.
 */
export function rankChevrons(
  rank: number | undefined,
  barRightX: number,
  barCentreY: number,
  inverseScale: number
): Chevron[] {
  if (rank === undefined || !Number.isInteger(rank) || rank < 1 || rank > 3) return [];
  const { width, rise, pitch, gap } = RANK_CHEVRON_PX;
  const left = barRightX + gap * inverseScale;
  const right = left + width * inverseScale;
  const peakX = (left + right) / 2;
  // Centred on the bar's line, so one chevron sits level with it and three
  // straddle it, the top one highest.
  const stack = (rank - 1) * pitch + rise;
  const top = barCentreY - (stack / 2) * inverseScale;
  const out: Chevron[] = [];
  for (let i = 0; i < rank; i++) {
    const peakY = top + i * pitch * inverseScale;
    const footY = peakY + rise * inverseScale;
    out.push([left, footY, peakX, peakY, right, footY]);
  }
  return out;
}

/** How far right of the bar the chevrons reach, in screen pixels, for a footprint. */
export function rankChevronReachPx(rank: number | undefined): number {
  if (rank === undefined || rank < 1) return 0;
  return RANK_CHEVRON_PX.gap + RANK_CHEVRON_PX.width;
}

/** Stroke the chevrons into `g`, in the ink and alpha of the bar they caption. */
export function drawRankChevrons(
  g: Graphics,
  rank: number | undefined,
  barRightX: number,
  barCentreY: number,
  inverseScale: number,
  color: number,
  alpha: number
): void {
  const chevrons = rankChevrons(rank, barRightX, barCentreY, inverseScale);
  if (chevrons.length === 0) return;
  for (const [x0, y0, x1, y1, x2, y2] of chevrons) {
    g.moveTo(x0, y0).lineTo(x1, y1).lineTo(x2, y2);
  }
  g.stroke({ width: RANK_CHEVRON_PX.stroke * inverseScale, color, alpha });
}
