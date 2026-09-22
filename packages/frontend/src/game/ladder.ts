/**
 * The loudness ladder — docs/map-visuals.md §5.
 *
 * Every mark on the map sits on one rung, and each rung is quieter than every
 * rung above it. This module holds the part of that which can be measured
 * without a GPU: the floor of rung 5 (map furniture), which is the ceiling of
 * rung 4 (survey ink). The draw sites import their alphas from here, so the
 * number the ink is held under is the number the furniture is drawn at — a
 * rim made quieter moves the ceiling with it, and the ink tests fail until
 * the ink follows it down.
 *
 * Measured the way a screenshot is: Rec. 709 luminance on encoded bytes, and
 * a stroke's weight as how far it lifts the pixel under it. Both the mark
 * layer and the survey ink blend in encoded space, so two strokes over the
 * same ground compare exactly.
 */

import type { Palette } from './palette.ts';

/**
 * The quietest outlines rung 5 draws. Which one is quietest depends on the
 * palette — the dormant eruption rim in three of the four, the Tetherjelly
 * rim in protanopia, whose threat red is brighter — so the ceiling is the
 * least of them.
 *
 * A mark is weighed by its outline, never by its interior. A field's faint
 * fill and an inert site's hatching are texture inside a mark whose rim
 * already speaks for it (an inert site's rim is `UI.threat` at 0.28), and a
 * ladder that weighed them would be ranking the grain of a mark rather than
 * the mark (docs/map-visuals.md §5).
 */
export const FURNITURE_FLOOR_ALPHA = {
  /** A kelp field's rim while it is not gripping (EchoRenderer `drawHazards`). */
  kelpRimIdle: 0.14,
  /** A Tetherjelly field's rim (EchoRenderer `drawJellies`). */
  jellyRim: 0.18,
  /**
   * A simulated hazard's rim while dormant (EchoRenderer `HAZARD_STYLE`).
   * Weighed in `UI.threat`, the eruption's colour, because it is the quieter
   * of the two the rim is drawn in.
   */
  hazardRimDormant: 0.22,
} as const;

/** Rec. 709 on the encoded bytes — how the palette tests and a screenshot measure. */
export function encodedLuminance(color: number): number {
  return (
    (0.2126 * ((color >> 16) & 0xff) + 0.7152 * ((color >> 8) & 0xff) + 0.0722 * (color & 0xff)) /
    255
  );
}

/**
 * How far a stroke of `color` at `alpha` lifts a pixel of `ground`, in
 * encoded luminance. Linear in the ground's luminance, so checking the
 * darkest and the palest ground checks every ground between.
 */
export function strokeLift(color: number, alpha: number, ground: number): number {
  return alpha * (encodedLuminance(color) - encodedLuminance(ground));
}

/** Rung 5's floor over one ground: the least lift any of its quiet outlines gives. */
export function furnitureFloorLift(palette: Palette, ground: number): number {
  return Math.min(
    strokeLift(palette.ui.accent, FURNITURE_FLOOR_ALPHA.kelpRimIdle, ground),
    strokeLift(palette.fauna, FURNITURE_FLOOR_ALPHA.jellyRim, ground),
    strokeLift(palette.ui.threat, FURNITURE_FLOOR_ALPHA.hazardRimDormant, ground)
  );
}
