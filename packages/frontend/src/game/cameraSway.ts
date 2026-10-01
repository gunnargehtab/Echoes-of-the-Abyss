/**
 * The conn view's slow sway — docs/art-direction.md, "Atmosphere rides on top".
 *
 * A boat at depth is never quite still: this is the submarine feel
 * docs/style-neon-noir.md asks of the camera. It is mood, so it has to stay
 * honest (graphics-standards gate 8): the view translates the one camera by
 * these offsets *after* aiming it, along its own right and up axes, and never
 * turns it. The overlay projects through that same camera, so a range ring
 * rides with the water it measures instead of bending over it, and a click
 * resolves through the camera the frame was drawn with.
 *
 * Offsets are shares of the frame's height at the focus, not metres, so the
 * sway reads the same on screen at every zoom: 0.3% is under three pixels of
 * a 900 px view. Two sines on periods that share no small multiple, so the
 * path does not visibly repeat. Slow enough that the overlay's ticker, which
 * can read the camera a frame before the conn redraws, lags it by under a
 * tenth of a pixel.
 */

export const SWAY = {
  /** Heave, the rise and fall: peak offset along the camera's up axis, as a
   * share of the frame's height at the focus. TUNABLE. */
  HEAVE: 0.003,
  /** One heave, in ms. TUNABLE. */
  HEAVE_PERIOD_MS: 11_000,
  /** Drift, along the camera's right axis, on the same scale. TUNABLE. */
  DRIFT: 0.002,
  /** One drift, in ms. Not a small multiple of the heave's, so the two do not
   * lock into a loop the eye can learn. TUNABLE. */
  DRIFT_PERIOD_MS: 17_000,
} as const;

/** A sway offset: shares of the frame's height at the focus. */
export interface SwayOffset {
  right: number;
  up: number;
}

/** The sway at `nowMs`, written into `out`: the frame calls it at 60 Hz. */
export function swayAt(nowMs: number, out: SwayOffset): SwayOffset {
  out.up = SWAY.HEAVE * Math.sin((2 * Math.PI * nowMs) / SWAY.HEAVE_PERIOD_MS);
  out.right = SWAY.DRIFT * Math.sin((2 * Math.PI * nowMs) / SWAY.DRIFT_PERIOD_MS);
  return out;
}
