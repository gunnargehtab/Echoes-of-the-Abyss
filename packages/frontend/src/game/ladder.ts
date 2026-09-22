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
 * The rung-5 outlines the ladder weighs: the quietest one rung 5 draws in
 * each of its three quiet colours — accent, fauna, threat — and the inert
 * hazard site's rim. Every other rung-5 outline lifts more than the least of
 * these in every palette; that was checked by hand at #865, and #866 turns
 * it into a test. Which of these is quietest depends on the palette — the
 * dormant eruption rim in three of the four, the Tetherjelly rim in
 * protanopia, whose threat red is brighter — so the ceiling is the least of
 * them.
 *
 * A mark is weighed by its outline, never by its interior. A field's faint
 * fill and an inert site's hatching are texture inside a mark whose rim
 * already speaks for it (`inertSiteRim`, below), and a ladder that weighed
 * them would be ranking the grain of a mark rather than the mark
 * (docs/map-visuals.md §5).
 */
export const FURNITURE_OUTLINE_ALPHA = {
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
  /**
   * An inert hazard site's rim (EchoRenderer `drawStaticHazardSites`), the
   * outline around its hatching. Held here because the outline rule leans on
   * it: the hatching goes unweighed only while this rim speaks for the mark.
   */
  inertSiteRim: 0.28,
} as const;

/**
 * Rung 6's quietest outline: a hull's detection ring while the player has not
 * selected it (EchoRenderer `drawRings`, docs/ui-ux.md §3.5), half
 * the selected ring's alpha. It is the player's own exposure, so the ink sits
 * under it in every SIG colour (docs/map-visuals.md §5).
 *
 * Rung 6 is not yet held above rung 5: in the standard and tritanopia
 * palettes this ring lifts the ground less than rung 5's floor. That is the
 * ladder audit's to settle (#866), not the ink's.
 */
export const INSTRUMENT_OUTLINE_ALPHA = {
  unselectedRing: 0.18,
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

/** The unselected detection ring's least lift over one ground, across the SIG colours. */
export function unselectedRingLift(palette: Palette, ground: number): number {
  const { sigLow, sigMid, sigHigh } = palette.ui;
  return Math.min(
    ...[sigLow, sigMid, sigHigh].map((color) =>
      strokeLift(color, INSTRUMENT_OUTLINE_ALPHA.unselectedRing, ground)
    )
  );
}

/** Rung 5's floor over one ground: the least lift any of its quiet outlines gives. */
export function furnitureFloorLift(palette: Palette, ground: number): number {
  return Math.min(
    strokeLift(palette.ui.accent, FURNITURE_OUTLINE_ALPHA.kelpRimIdle, ground),
    strokeLift(palette.fauna, FURNITURE_OUTLINE_ALPHA.jellyRim, ground),
    strokeLift(palette.ui.threat, FURNITURE_OUTLINE_ALPHA.hazardRimDormant, ground),
    strokeLift(palette.ui.threat, FURNITURE_OUTLINE_ALPHA.inertSiteRim, ground)
  );
}
