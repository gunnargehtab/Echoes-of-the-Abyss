/**
 * The board's frame and a launch's travel — docs/world-map.md §7.6 (#1462).
 *
 * The campaign board holds one camera frame over the mid-Rift, and launching
 * the prologue from it moves that camera home — onto the spawn, at the dolly a
 * commander's first sight of their force opens at — before any room is joined.
 * A travelled entry keeps that frame through the join (`holdOpeningFrame`), so
 * the session begins where the travel ended. Each frame is in its region's
 * own metres, and `inView` restates one in the metres the view stands in,
 * which are its latest session's region's (`PerspectiveView.rehome`, #1598).
 *
 * And what the world itself must fetch for the region before the join: §7.6's
 * "public ground and assets" (`prepareRegion`).
 */

import { RIFT_PLACES, WORLD, type PlanPoint, type WorldRegion } from '@echoes/shared';
import { HOME_DOLLY_M, HOME_PITCH_DEG, type CameraFrame } from './PerspectiveView.ts';
import { mapProps, propSpec } from './environment.ts';
import { whenEnvTemplatesReady } from './environmentModels.ts';
import { overviewSkin } from './worldOverview.ts';
import type { WorldLook } from './tutorialLook.ts';

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

/**
 * Each placed region's spawn, as §7.2's derived anchor names it: Sorrowgate's
 * court, the flight's spawn at the arch; the muster, the intake's; the shelf
 * lane, the survey's; the rendering row, the yard's; Face Two's muster, the
 * shift's; Face Six's rail head, the column's; the Fourth's mouth, the
 * picket's; and the Holdfast, the tide's, for both of Marr's missions.
 */
const SPAWN_PLACE: Readonly<Record<string, string>> = {
  sorrowgate: 'sorrowgate',
  'banding-ground': 'the-muster',
  'first-trench-margin': 'the-shelf-lane',
  'shallow-band': 'the-row',
  'ninefold-workings': 'face-two',
  'ninefold-face-six': 'face-six-rail-head',
  'fourth-foot': 'fourths-mouth',
  'marr-plateau': 'the-holdfast',
};

/**
 * §7.6 step 2's destination: home, which is the spawn — §7.2's derived anchor
 * for the region, public as the whole table is — north, at the home pitch and
 * dolly. Undefined for a region the anchor table does not place.
 */
export function arrivalFrame(region: WorldRegion): CameraFrame | undefined {
  const id = SPAWN_PLACE[region.id];
  const spawn = id === undefined ? undefined : RIFT_PLACES.find((place) => place.id === id);
  if (spawn === undefined) return undefined;
  return {
    xM: spawn.x - region.x,
    yM: spawn.y - region.y,
    distanceM: HOME_DOLLY_M,
    yawDeg: 0,
    pitchDeg: HOME_PITCH_DEG,
  };
}

/**
 * A frame in `from`'s metres restated in `view`'s: the same place in the
 * atlas, since a region's metres are the atlas's less its origin (§7.2).
 */
export function inView(frame: CameraFrame, from: PlanPoint, view: PlanPoint): CameraFrame {
  return { ...frame, xM: frame.xM + from.x - view.x, yM: frame.yM + from.y - view.y };
}

/**
 * What the world fetches for a region before its room is joined (§7.6 step
 * 2, "the region's public ground and assets"): the overview's skin, and the
 * models of every prop the region's baseline ground stands, in the mission's
 * look. Public, all of it — the map's ground is the atlas's — and settled
 * either way: a piece that fails is done, so a launch is never held on it.
 */
export function prepareRegion(region: WorldRegion, look: WorldLook): Promise<void> {
  const props: { slug: string; footprintM: number; swayM: number }[] = [];
  for (const slug of new Set(mapProps(region.mapId, look).map((placement) => placement.slug))) {
    const spec = propSpec(slug);
    if (spec !== undefined) props.push({ slug, footprintM: spec.footprintM, swayM: spec.swayM });
  }
  return Promise.allSettled([overviewSkin(), whenEnvTemplatesReady(props, look)]).then(
    () => undefined
  );
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
