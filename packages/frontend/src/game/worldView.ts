/**
 * The persistent world view — docs/world-map.md §7.1 and §7.6 (#1458).
 *
 * A match's conn view used to live and die with its `GameCanvas`: a renderer,
 * a scene, a camera and a baked water environment built at mount and thrown
 * away at unmount. The continuous world cannot work that way — the board, the
 * briefing, the pilot and the return are one world, and rebuilding the world
 * between them is a cut wearing a loading screen.
 *
 * So the world view outlives the session. This host owns one `PerspectiveView`
 * for the page, and a session borrows it: `acquire` hands it to a mounting
 * shell, which attaches its network state, HUD, input and audio to it as
 * before; `release` takes the session's state back off it — its force, its
 * loop, its canvas host — and keeps the renderer, scene, camera and water.
 *
 * Only the missions `worldRegionForMission` names are drawn here. Every other
 * match keeps the view it builds for itself, and destroys it, exactly as it
 * did; and since a page should hold one GL context at a time, a match on that
 * path disposes the world view first rather than running two. The module is
 * imported only by `GameCanvas` and the board's `WorldBackdrop`, both loaded
 * on demand, so three.js still stays out of the title screen's bundle.
 */

import { PROLOGUE_SORROWGATE_HEADER, worldRegionForMission } from '@echoes/shared';
import type { WebGLRenderer } from 'three';
import { PerspectiveView, type CameraFrame } from './PerspectiveView.ts';
import { lookForMission, type WorldLook } from './tutorialLook.ts';
import type { createWaterEnvironment } from './modelLighting.ts';
import { boardFrame } from './worldTravel.ts';

/** The GPU-less boot's stand-ins, as `PerspectiveView.mount` takes them. */
export interface WorldViewDevices {
  glRenderer?: () => WebGLRenderer;
  environment?: typeof createWaterEnvironment;
}

export class WorldViewHost {
  private view: PerspectiveView | null = null;
  private look: WorldLook | null = null;
  /** The session holding the view, so a late release from an earlier one is a no-op. */
  private holder: symbol | null = null;
  /**
   * A session went back to the board (`release(claim, 'return')`) and the
   * board has not taken the view yet: it starts where the session left it.
   */
  private returning = false;
  /**
   * The board's claim on a return it took over, until the camera stands on
   * the board's frame: a board let go before then keeps the return for the
   * next one (`release`).
   */
  private returnClaim: symbol | null = null;

  /** Whether `missionId` is drawn in the persistent world. */
  isWorldMission(missionId: string | undefined): boolean {
    return worldRegionForMission(missionId) !== undefined;
  }

  /**
   * Lend the world view to a session drawing into `host`. Builds it on first
   * use, and moves the one renderer into `host` on every later one. Returns
   * the view and the claim `release` needs, or null when the device has no
   * WebGL — in which case nothing is held.
   *
   * A second acquire while a session holds the view takes it over: the shell
   * mounts one match at a time, so the only way to get here is a session whose
   * teardown has not run yet, and it must not keep drawing into a host the
   * page has moved on from.
   */
  acquire(
    missionId: string | undefined,
    host: HTMLElement,
    devices: WorldViewDevices = {}
  ): { view: PerspectiveView; claim: symbol } | null {
    // A session never inherits a return's ground: a new room sends its own.
    if (this.returning) {
      this.returning = false;
      this.view?.clearTerrain();
    }
    this.returnClaim = null;
    return this.lend(missionId, host, devices, false);
  }

  private lend(
    missionId: string | undefined,
    host: HTMLElement,
    devices: WorldViewDevices,
    keepFrame: boolean
  ): { view: PerspectiveView; claim: symbol } | null {
    const look = lookForMission(missionId);
    if (this.view !== null && this.look !== look) this.dispose();
    // A takeover: the session still holding the view will never let it go
    // (its release is a no-op once the claim moves), so its ground goes now,
    // as a release would take it (#1460).
    if (this.view !== null && this.holder !== null) {
      this.view.resetForNewMatch();
      this.view.clearTerrain();
    }
    if (this.view === null) {
      // Placed in the world, so its border is drawn and faded (#1461).
      this.view = new PerspectiveView(look, worldRegionForMission(missionId) ?? null);
      this.look = look;
    }
    if (!this.view.mount(host, devices.glRenderer, devices.environment)) {
      this.dispose();
      return null;
    }
    // Every session opens on the same frame a fresh view would: north, the
    // home pitch, the focus on the ground. The fit to the map follows when
    // the session's ground arrives. A return keeps the frame it was left on.
    if (!keepFrame) this.view.home();
    const claim = Symbol('world-view-session');
    this.holder = claim;
    return { view: this.view, claim };
  }

  /**
   * Lend the view to the campaign board (docs/world-map.md §7.6 step 1): no
   * session, the pilot's region at the board's fixed frame, its loop running.
   * The board, the briefing it opens and a launch's travel all draw here, and
   * hand the view on with `release` or by a session's `acquire`. Null when the
   * device has no WebGL, and the board is drawn alone.
   *
   * After a return (§7.6 step 4) the camera is left where the session left
   * it, the fade still ramping out and the session's ground still drawn
   * (`PerspectiveView.releaseGround`): the board travels it back from there.
   */
  showBoard(host: HTMLElement, devices: WorldViewDevices = {}): symbol | null {
    const returning = this.returning;
    this.returning = false;
    const lent = this.lend(PROLOGUE_SORROWGATE_HEADER.id, host, devices, returning);
    if (lent === null) return null;
    if (returning) this.returnClaim = lent.claim;
    else lent.view.setFrame(boardFrame(worldRegionForMission(PROLOGUE_SORROWGATE_HEADER.id)!));
    lent.view.setActive(true);
    return lent.claim;
  }

  /**
   * Take a session's state off the view and keep the world. A claim that no
   * longer holds the view — a teardown landing after a newer session took it
   * over — releases nothing.
   *
   * The session's ground goes too (#1460, docs/world-map.md §7.3): it was the
   * session's overlay on the region, never the atlas, so a span its mission
   * dropped is not left standing in the world after the run. The region is
   * drawn from its public baseline again until the next room sends its own.
   *
   * `'return'` is Return to port from a board launch (§7.6 step 4): the
   * session's force and loop still go, but its ground stays until the
   * baseline is built and the ramp-out is not landed, so the board's
   * `showBoard` picks both up mid-way and travels back from the frame the
   * session was left on.
   *
   * A board let go before its return has reached the board's frame keeps the
   * return the same way, and the next board resumes it from where the camera
   * stands. Development's StrictMode mounts the board, lets it go and mounts
   * it again at once, and a plain release there would cut the return to the
   * board's frame; a player leaving the board mid-return draws nothing, so
   * the ground kept meanwhile is never seen.
   */
  release(claim: symbol, how: 'leave' | 'return' = 'leave'): void {
    if (this.holder !== claim || this.view === null) return;
    this.holder = null;
    const midReturn =
      claim === this.returnClaim &&
      !sameFrame(
        this.view.frame,
        boardFrame(worldRegionForMission(PROLOGUE_SORROWGATE_HEADER.id)!)
      );
    this.returnClaim = null;
    this.view.resetForNewMatch();
    if (how === 'return' || midReturn) {
      this.view.releaseGround();
      this.view.detach(false);
      this.returning = true;
      return;
    }
    this.returning = false;
    this.view.clearTerrain();
    this.view.detach();
  }

  /**
   * End the world view: a match that builds its own is about to take the GPU,
   * or the page is going. Safe to call with nothing held.
   */
  dispose(): void {
    this.view?.destroy();
    this.view = null;
    this.look = null;
    this.holder = null;
    this.returning = false;
    this.returnClaim = null;
  }

  /** The view itself, for the headless tests' identity checks. Null when none exists. */
  get current(): PerspectiveView | null {
    return this.view;
  }
}

/** Whether two frames are one camera, to a metre and a hundredth of a degree. */
function sameFrame(a: CameraFrame, b: CameraFrame): boolean {
  return (
    Math.abs(a.xM - b.xM) < 1 &&
    Math.abs(a.yM - b.yM) < 1 &&
    Math.abs(a.distanceM - b.distanceM) < 1 &&
    Math.abs(a.yawDeg - b.yawDeg) < 0.01 &&
    Math.abs(a.pitchDeg - b.pitchDeg) < 0.01
  );
}

/** The page's one world view. */
export const worldView = new WorldViewHost();
