/**
 * The loudness ladder — docs/map-visuals.md §5.
 *
 * Every mark on the map sits on one rung, and each rung is quieter than every
 * rung above it. This module holds the part of that which can be measured
 * without a GPU: every outline rung 5 (map furniture) draws, and rung 6's two
 * detection rings. Four of the rung-5 outlines are its floor, and the lesser
 * of that floor and the unselected ring is the ceiling of rung 4 (survey
 * ink); in three palettes that is the ring. The draw sites import their
 * alphas from here, so the number the tests weigh is the number the mark is
 * drawn at — a rim or ring made quieter moves the ceiling with it, and the
 * ink tests fail until the ink follows it down.
 *
 * Measured the way a screenshot is: Rec. 709 luminance on encoded bytes, and
 * a stroke's weight as how far it lifts the pixel under it. Both the mark
 * layer and the survey ink blend in encoded space, so two strokes over the
 * same ground compare exactly. So do the conn view's lines — the canvas is
 * sRGB and nothing renders through a linear target — except that the water's
 * fog pulls a far one toward the water colour. They are weighed unfogged,
 * which is where they stand out most.
 */

import { ResourceKind } from '@echoes/shared';
import type { Palette } from './palette.ts';

/**
 * The alpha of every outline rung 5 draws, by draw site.
 *
 * The first four are the rung's floor: the quietest outline it draws in each
 * of its three quiet colours — accent, fauna, threat — and the inert hazard
 * site's rim (`furnitureFloorLift`, below). Which of them is quietest depends
 * on the palette — the dormant eruption rim in three of the four, the
 * Tetherjelly rim in protanopia, whose threat red is brighter — so the floor
 * is the least of them. Every other outline here lifts more than that floor
 * in every palette, which ladder.test.ts holds.
 *
 * A mark is weighed by its outline, never by its interior. A field's faint
 * fill, an inert site's hatching, an erupting vent's inner rings, a current's
 * streaks and a nodule field's grains are texture inside a mark whose rim
 * already speaks for it, and a ladder that weighed them would be ranking the
 * grain of a mark rather than the mark (docs/map-visuals.md §5).
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
  /** A kelp field's rim while it grips (EchoRenderer `drawHazards`). */
  kelpRimGripping: 0.3,
  /** A simulated hazard's rim in its warning phase (EchoRenderer `HAZARD_STYLE`). */
  hazardRimWarning: 0.7,
  /** A simulated hazard's rim while it fires (EchoRenderer `HAZARD_STYLE`). */
  hazardRimActive: 0.95,
  /** A simulated hazard's rim as it dies down (EchoRenderer `HAZARD_STYLE`). */
  hazardRimDecay: 0.5,
  /**
   * The warning's countdown ring as it opens (EchoRenderer `drawHazards`). It
   * gains `hazardCountdownGain` as it closes on the rim, so it meets the rim
   * at 0.85, the loudest it gets.
   */
  hazardCountdownStart: 0.35,
  hazardCountdownGain: 0.5,
  /** A resource field's rim, nodule or crystal (EchoRenderer `drawNodes`). */
  resourceRim: 0.3,
  /** The dashed ring that says a crystal field is at depth (EchoRenderer `drawNodes`). */
  crystalDepthRing: 0.55,
  /** A roofed passage's route line (PerspectiveView `buildTerrainDressing`). */
  tunnelRoute: 0.3,
  /** The map's border (PerspectiveView `buildTerrainDressing`). */
  mapRim: 0.5,
  /** A scattered Lampfry shoal's 300 m trigger ring (EchoRenderer `drawShoals`). */
  shoalScatterRing: 0.4,
} as const;

/**
 * Rung 6's weighed outlines: a hull's detection ring (EchoRenderer
 * `drawRings`, docs/ui-ux.md §3.5), unselected and selected.
 *
 * The unselected ring is the rung's quietest outline, half the selected
 * ring's alpha. It is the player's own exposure, so the ink sits under it in
 * both colours it is drawn in (docs/map-visuals.md §5).
 *
 * Rung 6 is not yet held above rung 5. In the standard, protanopia and
 * tritanopia palettes the unselected ring lifts the ground less than rung 5's
 * floor, and in every palette it lifts less than most of rung 5's outlines.
 * ladder.test.ts records both; settling them is the owner's call (#866).
 */
export const INSTRUMENT_OUTLINE_ALPHA = {
  unselectedRing: 0.18,
  selectedRing: 0.35,
} as const;

/**
 * One outline as the ladder weighs it: its alpha at its quietest and at its
 * loudest, and every colour it is drawn in. The floor asks about the quietest
 * alpha in the quietest colour; the rung above asks about the loudest alpha
 * in the loudest.
 */
export interface WeighedOutline {
  readonly quietest: number;
  readonly loudest: number;
  readonly colors: (palette: Palette) => readonly number[];
}

function steady(alpha: number, colors: WeighedOutline['colors']): WeighedOutline {
  return { quietest: alpha, loudest: alpha, colors };
}

const F = FURNITURE_OUTLINE_ALPHA;
/** Red warns and cyan tells: an eruption is drawn in threat, every other hazard in accent. */
const hazardColors = (p: Palette) => [p.ui.threat, p.ui.accent];

/** Every outline rung 5 draws, weighed. */
export const FURNITURE_OUTLINES: Readonly<Record<string, WeighedOutline>> = {
  kelpRimIdle: steady(F.kelpRimIdle, (p) => [p.ui.accent]),
  kelpRimGripping: steady(F.kelpRimGripping, (p) => [p.ui.accent]),
  jellyRim: steady(F.jellyRim, (p) => [p.fauna]),
  hazardRimDormant: steady(F.hazardRimDormant, hazardColors),
  hazardRimWarning: steady(F.hazardRimWarning, hazardColors),
  hazardRimActive: steady(F.hazardRimActive, hazardColors),
  hazardRimDecay: steady(F.hazardRimDecay, hazardColors),
  hazardCountdown: {
    quietest: F.hazardCountdownStart,
    loudest: F.hazardCountdownStart + F.hazardCountdownGain,
    colors: hazardColors,
  },
  inertSiteRim: steady(F.inertSiteRim, (p) => [p.ui.threat]),
  resourceRim: steady(F.resourceRim, (p) => [
    p.resource[ResourceKind.Nodule],
    p.resource[ResourceKind.ResonanceCrystal],
  ]),
  crystalDepthRing: steady(F.crystalDepthRing, (p) => [p.resource[ResourceKind.ResonanceCrystal]]),
  tunnelRoute: steady(F.tunnelRoute, (p) => [p.ui.accent]),
  mapRim: steady(F.mapRim, (p) => [p.ui.glassStroke]),
  shoalScatterRing: steady(F.shoalScatterRing, (p) => [p.fauna]),
};

/**
 * Rung 6's outlines, weighed. §3.5's gate draws an unselected ring only at
 * SIG at or above the amber stop, so it is never in `sigLow`; a selected hull
 * draws its ring at any SIG, so the selected ring can wear all three.
 */
export const INSTRUMENT_OUTLINES: Readonly<Record<string, WeighedOutline>> = {
  unselectedRing: steady(INSTRUMENT_OUTLINE_ALPHA.unselectedRing, (p) => [
    p.ui.sigMid,
    p.ui.sigHigh,
  ]),
  selectedRing: steady(INSTRUMENT_OUTLINE_ALPHA.selectedRing, (p) => [
    p.ui.sigLow,
    p.ui.sigMid,
    p.ui.sigHigh,
  ]),
};

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

/** The least an outline lifts `ground`: its quietest alpha, in its quietest colour. */
export function quietestLift(outline: WeighedOutline, palette: Palette, ground: number): number {
  return Math.min(
    ...outline.colors(palette).map((color) => strokeLift(color, outline.quietest, ground))
  );
}

/** The most an outline lifts `ground`: its loudest alpha, in its loudest colour. */
export function loudestLift(outline: WeighedOutline, palette: Palette, ground: number): number {
  return Math.max(
    ...outline.colors(palette).map((color) => strokeLift(color, outline.loudest, ground))
  );
}

/** The unselected detection ring's least lift over one ground, across the two colours it is drawn in. */
export function unselectedRingLift(palette: Palette, ground: number): number {
  return quietestLift(INSTRUMENT_OUTLINES.unselectedRing!, palette, ground);
}

/** Rung 6's floor over one ground: the least lift any of its weighed outlines gives. */
export function instrumentFloorLift(palette: Palette, ground: number): number {
  return Math.min(
    ...Object.values(INSTRUMENT_OUTLINES).map((outline) => quietestLift(outline, palette, ground))
  );
}

/** Rung 5's floor over one ground: the least lift any of its four quiet outlines gives. */
export function furnitureFloorLift(palette: Palette, ground: number): number {
  return Math.min(
    strokeLift(palette.ui.accent, FURNITURE_OUTLINE_ALPHA.kelpRimIdle, ground),
    strokeLift(palette.fauna, FURNITURE_OUTLINE_ALPHA.jellyRim, ground),
    strokeLift(palette.ui.threat, FURNITURE_OUTLINE_ALPHA.hazardRimDormant, ground),
    strokeLift(palette.ui.threat, FURNITURE_OUTLINE_ALPHA.inertSiteRim, ground)
  );
}
