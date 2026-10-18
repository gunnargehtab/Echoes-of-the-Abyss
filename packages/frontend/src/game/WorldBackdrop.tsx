/**
 * The world behind the campaign board — docs/world-map.md §7.6 (#1462).
 *
 * The board stays the control and the accessible reading; this draws the
 * atlas behind it, from the page's one world view (worldView.ts), at the
 * board's fixed frame. The shell keeps it mounted across the board, the
 * briefing the board opens and a launch's travel, so the world is one world
 * across them rather than rebuilt per screen.
 *
 * It decides nothing about the board and owns no input: the canvas takes no
 * pointer events and nothing here is focusable. Loaded on demand, as the match
 * is (#442), so the title screen's bundle does not carry three.js; the board is
 * drawn before this arrives, and drawn alone when it cannot (no WebGL).
 *
 * `target` is where the camera should stand. The board's frame is held from
 * mount; a mission's id travels home — the spawn, at the home dolly — over
 * §7.6's 2.5 s, a cut under reduced motion, while the region's public ground
 * and assets are fetched (`prepareRegion`), and `onSettled` says both are done.
 * A travel the device cannot draw has arrived at once, so the launch is never
 * held waiting on a world that is not there.
 *
 * Mounted by a return from a board launch (§7.6 step 4), the board's target
 * travels back from the frame the session left: `worldView.showBoard` keeps
 * it, and the travel waits for the fade to ramp out first — and under reduced
 * motion for the session's ground to give way to its baseline, so the cut and
 * the swap land in one frame.
 */

import { useEffect, useRef } from 'react';
import { PROLOGUE_SORROWGATE_HEADER, WORLD, worldRegionForMission } from '@echoes/shared';
import { loadSettings } from '../settings/store.ts';
import { lookForMission } from './tutorialLook.ts';
import { worldView, type WorldViewDevices } from './worldView.ts';
import { arrivalFrame, boardFrame, prepareRegion, Travel } from './worldTravel.ts';

export type WorldTarget = { kind: 'board' } | { kind: 'mission'; missionId: string };

export interface WorldBackdropProps {
  target: WorldTarget;
  /** Cut the travel under way to its end (§7.6, "skippable at any point"). */
  skip?: boolean;
  /**
   * The camera stands on `target`'s frame and a mission's region is prepared;
   * `drew` is false when there was no world to travel in, so nothing moved.
   */
  onSettled?(drew: boolean): void;
  /**
   * Stand-ins for the headless test, as `GameCanvas`'s harness: the GL
   * device, and the region's loads, which a runner with no models cannot
   * hold open. Absent in production.
   */
  devices?: WorldViewDevices & { prepare?: typeof prepareRegion };
}

/**
 * The camera frame a target names, in the pilot region's metres, and what the
 * world must fetch before it counts as arrived.
 */
function plan(target: WorldTarget, prepare: typeof prepareRegion) {
  if (target.kind === 'board') {
    const board = worldRegionForMission(PROLOGUE_SORROWGATE_HEADER.id)!;
    return { to: boardFrame(board), prepared: Promise.resolve() };
  }
  const region = worldRegionForMission(target.missionId);
  const to = region === undefined ? undefined : arrivalFrame(region);
  if (region === undefined || to === undefined) return null;
  return { to, prepared: prepare(region, lookForMission(target.missionId)) };
}

/** One target's run: its travel, and whether each half of arriving is done. */
interface Run {
  travel: Travel;
  travelled: boolean;
  prepared: boolean;
  announced: boolean;
}

export function WorldBackdrop({ target, skip = false, onSettled, devices }: WorldBackdropProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const claimRef = useRef<symbol | null>(null);
  const runRef = useRef<Run | null>(null);
  // Read through a ref so a parent re-rendering with a new callback does not
  // restart a travel already under way.
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    const claim = worldView.showBoard(host, devices);
    claimRef.current = claim;
    if (claim !== null) worldView.current!.setReducedMotion(loadSettings().reducedMotion);
    return () => {
      claimRef.current = null;
      if (claim !== null) worldView.release(claim);
    };
    // Mounted once for the run of screens it sits behind; `devices` is a
    // property of the run, as `GameCanvas`'s harness is.
  }, []);

  const key = target.kind === 'board' ? 'board' : `mission:${target.missionId}`;
  useEffect(() => {
    const view = claimRef.current === null ? null : worldView.current;
    const planned = plan(target, devices?.prepare ?? prepareRegion);
    if (view === null || planned === null) {
      // Nothing to draw a travel on, or to fetch for: arrived, without a move.
      runRef.current = null;
      settledRef.current?.(false);
      return;
    }
    const reduced = loadSettings().reducedMotion;
    const run: Run = {
      travel: new Travel(view, planned.to, reduced ? 0 : WORLD.TRAVEL_S),
      travelled: false,
      prepared: false,
      announced: false,
    };
    runRef.current = run;
    // Under reduced motion a return's cut waits for its baseline, and lands
    // in the frame the session's ground gives way, before it is drawn: one
    // change rather than a cut and then a swap (§7.6 step 4).
    const holdForGround = reduced && target.kind === 'board' && view.leavingGround;
    if (holdForGround) {
      view.onGroundGone = () => {
        if (runRef.current !== run || run.travelled) return;
        run.travel.skip();
        run.travelled = true;
        announce(run);
      };
    }
    void planned.prepared.then(() => {
      run.prepared = true;
      announce(run);
    });
    let frame = 0;
    // The clock is read here rather than taken from the frame's argument, so
    // the travel runs on the same clock whoever schedules the frame.
    const tick = () => {
      if (runRef.current !== run || run.travelled) return;
      // A return's fade ramps out where the session left the camera before
      // the camera moves (§7.6 step 4); the travel's clock starts after it.
      if (!view.borderSettled || (holdForGround && view.leavingGround)) {
        frame = requestAnimationFrame(tick);
        return;
      }
      if (run.travel.step(performance.now())) {
        run.travelled = true;
        announce(run);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (holdForGround) view.onGroundGone = null;
      if (runRef.current === run) runRef.current = null;
    };
    // The target's identity is its key: a parent passing an equal object
    // anew must not restart the travel.
  }, [key]);

  useEffect(() => {
    const run = runRef.current;
    if (!skip || run === null || run.travelled) return;
    run.travel.skip();
    run.travelled = true;
    announce(run);
  }, [skip]);

  /** Say arrived once, when both halves are done and the run is still current. */
  function announce(run: Run): void {
    if (run.announced || !run.travelled || !run.prepared || runRef.current !== run) return;
    run.announced = true;
    if (target.kind === 'board' && claimRef.current !== null) worldView.endReturn(claimRef.current);
    settledRef.current?.(true);
  }

  return <div ref={hostRef} className="world-backdrop" aria-hidden="true" />;
}
