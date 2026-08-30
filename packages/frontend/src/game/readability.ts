/**
 * The far-zoom readability scale — docs/art-direction.md "Far-zoom
 * readability scale — SPEC", and the answer to gate 7's "at every zoom the
 * camera allows" (docs/graphics-standards.md).
 *
 * Hulls are 60–130 m long and the ground is kilometres wide, so a fleet drawn
 * at true metre scale is a scatter of specks at survey distance. WC3's answer,
 * transcribed: as the camera pulls back, the fleet is drawn larger than the
 * ground it stands on — one factor for the whole view, so the roster keeps its
 * proportions and only the fleet-to-ground ratio moves.
 *
 * Its own module rather than a private in PerspectiveView.ts because it is a
 * pure curve with a documented shape, and a curve worth documenting is worth
 * pinning under test without a GL context.
 *
 * Render-only, by rule. The simulation, collision, range rings and aim reach
 * never read it (texture-not-information); only what *draws* a hull, and the
 * instrument ink drawn about that hull, may.
 */

import { UNIT_STATS } from '@echoes/shared';

/**
 * The hull the floor is measured against: the roster's shortest, because the
 * scale has to keep the *smallest* thing on screen readable. Derived from the
 * unit table rather than written down a second time — a new light hull shorter
 * than the Light Scout must move this number, and a copy would not.
 */
export const REFERENCE_HULL_M = Math.min(
  ...Object.values(UNIT_STATS).map((stats) => stats.hullLengthM)
);

/**
 * TUNABLE — the drawn length, in pixels, below which the reference hull stops
 * reading as a silhouette rather than a dot.
 *
 * Held under twice EchoRenderer's 18 px aim floor on purpose. Wherever this
 * scale is active the reference hull is pinned at exactly this length, so 26 px
 * of drawn hull is 13 px of half-hull — inside the aim radius, and inside the
 * 140 m select radius that dominates at close zoom. A hull is therefore never
 * drawn bigger than it can be clicked *without* aim having to know this scale
 * exists; raising this past 36 would break that and make aim read it.
 */
export const HULL_FLOOR_PX = 26;

/**
 * TUNABLE — where exaggeration stops. Past this a fleet stops being a fleet on
 * a map and becomes a row of icons overlapping each other, which trades the
 * survey view's shape-of-the-fight away for the same reason clamping the dolly
 * would have.
 */
export const MAX_HULL_SCALE = 4;

/**
 * Screen pixels per world metre on the ground under the camera target — the
 * one distance in the frame that depends on the dolly alone, which is what
 * makes the factor view-wide rather than per-entity.
 */
export function groundPxPerM(viewHeightPx: number, fovDeg: number, distanceM: number): number {
  const halfFov = Math.tan(((fovDeg / 2) * Math.PI) / 180);
  return viewHeightPx / 2 / (halfFov * Math.max(1, distanceM));
}

/**
 * How much larger than true scale the fleet is drawn at this dolly.
 *
 * Clamped rather than blended at the near end: "1 means true metre scale" is a
 * fact the Phase-2 canonicalisation depends on (docs/three-layer-ocean.md), and
 * a smooth blend would make it merely approximately true everywhere.
 */
export function hullReadabilityScale(pxPerM: number): number {
  const drawnPx = REFERENCE_HULL_M * pxPerM;
  if (!(drawnPx > 0)) return MAX_HULL_SCALE;
  return Math.min(MAX_HULL_SCALE, Math.max(1, HULL_FLOOR_PX / drawnPx));
}
