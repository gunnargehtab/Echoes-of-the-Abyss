/**
 * Stereo position on the screen's axis — docs/audio-direction.md §3.
 *
 * §3's Tier-4 row asks for spatialisation "matched to the rendered position",
 * and the camera turns (docs/free-camera.md §4), so the right ear is the
 * screen's right, not world east. Every pan in the mix used to be the cosine of
 * a world bearing, which matched the screen only with the camera facing north:
 * turned to face south, a contact drawn on the left sounded on the right
 * (#1324).
 *
 * World x runs east and world y runs south, and the camera's yaw is radians
 * clockwise from north (`PerspectiveView.headingRad`), so the screen's right is
 * (cos yaw, −sin yaw) in world terms.
 */

/** The pan, -1 to 1, of a sound `dx`, `dy` metres from the ear. */
export function screenPan(dx: number, dy: number, yawRad: number): number {
  const rangeM = Math.hypot(dx, dy);
  if (rangeM === 0) return 0;
  const pan = (dx * Math.cos(yawRad) - dy * Math.sin(yawRad)) / rangeM;
  return Math.max(-1, Math.min(1, pan));
}

/**
 * A world bearing (radians from world +x, toward +y) turned into the camera's
 * frame: its cosine is the pan `screenPan` gives for the same direction.
 */
export function screenBearing(bearing: number, yawRad: number): number {
  return bearing + yawRad;
}
