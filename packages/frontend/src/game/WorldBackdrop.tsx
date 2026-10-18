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
 * mount; a mission's id travels to that mission's opening frame over §7.6's
 * 2.5 s, a cut under reduced motion, and `onSettled` says it has arrived. A
 * travel the device cannot draw has arrived at once, so the launch is never
 * held waiting on a world that is not there.
 */

import { useEffect, useRef } from 'react';
import { PROLOGUE_SORROWGATE_HEADER, WORLD, worldRegionForMission } from '@echoes/shared';
import { loadSettings } from '../settings/store.ts';
import { worldView, type WorldViewDevices } from './worldView.ts';
import { arrivalFrame, boardFrame, Travel } from './worldTravel.ts';

export type WorldTarget = { kind: 'board' } | { kind: 'mission'; missionId: string };

export interface WorldBackdropProps {
  target: WorldTarget;
  /** Cut the travel under way to its end (§7.6, "skippable at any point"). */
  skip?: boolean;
  /** The camera stands on `target`'s frame. */
  onSettled?(): void;
  /** Device stand-ins for the headless test, as `GameCanvas`'s harness. Absent in production. */
  devices?: WorldViewDevices;
}

/** The camera frame a target names, in the pilot region's metres. */
function frameFor(target: WorldTarget) {
  const board = worldRegionForMission(PROLOGUE_SORROWGATE_HEADER.id)!;
  if (target.kind === 'board') return boardFrame(board);
  const region = worldRegionForMission(target.missionId);
  return region === undefined ? null : arrivalFrame(region);
}

export function WorldBackdrop({ target, skip = false, onSettled, devices }: WorldBackdropProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const claimRef = useRef<symbol | null>(null);
  const travelRef = useRef<Travel | null>(null);
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
    const to = frameFor(target);
    if (view === null || to === null) {
      // Nothing to draw a travel on: arrived.
      travelRef.current = null;
      settledRef.current?.();
      return;
    }
    const travel = new Travel(view, to, loadSettings().reducedMotion ? 0 : WORLD.TRAVEL_S);
    travelRef.current = travel;
    let frame = 0;
    // The clock is read here rather than taken from the frame's argument, so
    // the travel runs on the same clock whoever schedules the frame.
    const tick = () => {
      if (travelRef.current !== travel) return;
      if (travel.step(performance.now())) {
        settledRef.current?.();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (travelRef.current === travel) travelRef.current = null;
    };
    // The target's identity is its key: a parent passing an equal object
    // anew must not restart the travel.
  }, [key]);

  useEffect(() => {
    const travel = travelRef.current;
    if (!skip || travel === null || travel.done) return;
    travel.skip();
    travelRef.current = null;
    settledRef.current?.();
  }, [skip]);

  return <div ref={hostRef} className="world-backdrop" aria-hidden="true" />;
}
