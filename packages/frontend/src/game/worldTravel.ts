/**
 * The board's frame and a launch's travel — docs/world-map.md §7.6 (#1462).
 *
 * The campaign board holds one camera frame over the mid-Rift, and launching
 * the prologue from it moves that camera to the mission's opening frame before
 * any room is joined. Both frames are in the placed region's own metres, the
 * view's, so the travel ends exactly where the session's first ground frames
 * the map (`openingFrame`) and the join is not a cut.
 *
 * No three.js here beyond the view's types: the arithmetic is tested alone,
 * and the view is driven through the two members a travel needs.
 */

import { WORLD, type WorldRegion } from '@echoes/shared';
import { HOME_PITCH_DEG, openingFrame, type CameraFrame } from './PerspectiveView.ts';

/**
 * §7.6 step 1: north, the home pitch, `WORLD.BOARD_DOLLY_M` back from the
 * middle of the region's map, so the drowned city is mid-frame.
 */
export function boardFrame(region: WorldRegion): CameraFrame {
  return {
    xM: region.widthM / 2,
    yM: region.heightM / 2,
    distanceM: WORLD.BOARD_DOLLY_M,
    yawDeg: 0,
    pitchDeg: HOME_PITCH_DEG,
  };
}

/** §7.6 step 2's destination: the region's map framed whole, as every entry opens. */
export function arrivalFrame(region: WorldRegion): CameraFrame {
  return openingFrame(region.widthM, region.heightM);
}

/** The cubic ease both ends of a travel settle on, 3t² − 2t³. */
const ease = (t: number): number => t * t * (3 - 2 * t);

/**
 * The frame `t` of the way from `from` to `to`, `t` in 0–1 and eased. The
 * dolly is interpolated in its logarithm, so a fivefold dolly-in reads as an
 * even approach rather than a rush at the start; the yaw takes the shorter
 * way round.
 */
export function travelFrame(from: CameraFrame, to: CameraFrame, t: number): CameraFrame {
  const k = ease(Math.min(1, Math.max(0, t)));
  const lerp = (a: number, b: number) => a + (b - a) * k;
  const turn = ((((to.yawDeg - from.yawDeg) % 360) + 540) % 360) - 180;
  return {
    xM: lerp(from.xM, to.xM),
    yM: lerp(from.yM, to.yM),
    distanceM: Math.exp(lerp(Math.log(from.distanceM), Math.log(to.distanceM))),
    yawDeg: from.yawDeg + turn * k,
    pitchDeg: lerp(from.pitchDeg, to.pitchDeg),
  };
}

/** What a travel moves: the view's camera, read and set whole. */
export interface FramedCamera {
  readonly frame: CameraFrame;
  setFrame(frame: CameraFrame): void;
}

/**
 * One travel, stepped by the caller's clock: from wherever the camera stands
 * to `to` over `durationS`. A duration of 0 — reduced motion — is a cut, and
 * `skip` cuts at any point (§7.6, "skippable at any point").
 */
export class Travel {
  private readonly from: CameraFrame;
  private startedAt: number | null = null;
  private finished = false;

  constructor(
    private readonly camera: FramedCamera,
    private readonly to: CameraFrame,
    private readonly durationS: number
  ) {
    this.from = camera.frame;
  }

  get done(): boolean {
    return this.finished;
  }

  /** Advance to `nowMs`; true once the camera stands on the destination. */
  step(nowMs: number): boolean {
    if (this.finished) return true;
    this.startedAt ??= nowMs;
    const t = this.durationS <= 0 ? 1 : (nowMs - this.startedAt) / (this.durationS * 1000);
    this.camera.setFrame(t >= 1 ? this.to : travelFrame(this.from, this.to, t));
    this.finished = t >= 1;
    return this.finished;
  }

  /** Cut to the destination now. */
  skip(): void {
    if (this.finished) return;
    this.camera.setFrame(this.to);
    this.finished = true;
  }
}
