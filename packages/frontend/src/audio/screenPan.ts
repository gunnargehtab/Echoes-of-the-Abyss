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
 * World x runs east and world y runs south. The camera's yaw
 * (`PerspectiveView.headingRad`) turns anticlockwise from north, seen from
 * above: at yaw 0 the eye is south of the focus, and in general at
 * (sin yaw, cos yaw) from it, looking back along that line. So the screen's
 * right is (cos yaw, −sin yaw) in world terms, and its down, toward the eye,
 * is (sin yaw, cos yaw).
 */

/** The pan, -1 to 1, of a sound `dx`, `dy` metres from the ear. */
export interface ScreenRight {
  x: number;
  y: number;
  z: number;
}

export function screenPan(
  dx: number,
  dy: number,
  yawRad: number | ScreenRight,
  height = 0
): number {
  const rangeM = Math.hypot(dx, dy, height);
  if (rangeM === 0) return 0;
  const pan =
    typeof yawRad === 'number'
      ? (dx * Math.cos(yawRad) - dy * Math.sin(yawRad)) / rangeM
      : (dx * yawRad.x + height * yawRad.y + dy * yawRad.z) / rangeM;
  return Math.max(-1, Math.min(1, pan));
}

/**
 * A world bearing (radians from world +x, toward +y) turned into the camera's
 * frame: its cosine is the pan `screenPan` gives for the same direction.
 */
export function screenBearing(bearing: number, yawRad: number | ScreenRight): number {
  return typeof yawRad === 'number'
    ? bearing + yawRad
    : Math.acos(screenPan(Math.cos(bearing), Math.sin(bearing), yawRad));
}
