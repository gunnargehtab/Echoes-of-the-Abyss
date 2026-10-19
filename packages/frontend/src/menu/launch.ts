/**
 * Which launches travel, and when a travel joins — docs/world-map.md §7.6
 * (#1462).
 *
 * The shell's rules for the one door that travels, kept out of `App.tsx` so
 * they are tested as rules rather than through a screen whose travel, on a
 * runner with no WebGL, arrives before it can be looked at.
 */

import { worldRegionForMission } from '@echoes/shared';

/**
 * The screen a load failure's Retry reopens after reloading (§7.6, "A load or
 * join failure"). A browser keeps a failed module fetch for the life of the
 * page — Chrome 155 answered a second import of one from its module map, with
 * no request — so Retry reloads, and this one-shot note in `sessionStorage`
 * brings a board launch back to the board.
 */
const REOPEN_KEY = 'echoes.reopen';

/**
 * Reload for a load failure's Retry. A board launch names its mission, so the
 * board reopens on that slot (docs/ui-ux.md §14, "Keyboard"); any other launch
 * names none.
 */
export function reloadForRetry(board: string | undefined): void {
  try {
    if (board !== undefined) window.sessionStorage.setItem(REOPEN_KEY, board);
    else window.sessionStorage.removeItem(REOPEN_KEY);
  } catch {
    // Storage refused: the reload opens on the title, which is still a way back.
  }
  window.location.reload();
}

/**
 * The mission whose slot this page was reloaded to reopen the board on, if
 * any. Read, not taken: development's StrictMode runs the shell's initial state
 * twice, so the note is forgotten after mount (`forgetReopen`).
 */
export function reopenedFrom(): string | null {
  try {
    return window.sessionStorage.getItem(REOPEN_KEY);
  } catch {
    return null;
  }
}

/** Forget the note, once the shell has opened on it. */
export function forgetReopen(): void {
  try {
    window.sessionStorage.removeItem(REOPEN_KEY);
  } catch {
    // Nothing was kept.
  }
}

/** A launch from the board, travelling before its room is joined. */
export interface TravelState {
  kind: 'travel';
  missionId: string;
  /** The player pressed Skip: the camera is cut to the end. */
  skipped: boolean;
  /** The camera is home, and the region's public ground and assets are fetched. */
  settled: boolean;
  /** The world drew the travel: the camera moved, so the session keeps its frame. */
  drew: boolean;
  /** The match's own code has loaded. */
  prepared: boolean;
  /**
   * The match's own code failed to load (§7.6, "A load or join failure"):
   * nothing is joined, and the bar offers Retry and Back.
   */
  loadFailed: boolean;
}

/**
 * Whether Descend from a briefing travels first: a placed mission, launched
 * from the board. The Tutorial door's briefing joins as it always has, and so
 * does every mission not placed in the world (§7.1).
 */
export function travelsFirst(from: 'title' | 'campaign', missionId: string): boolean {
  return from === 'campaign' && worldRegionForMission(missionId) !== undefined;
}

/** A travel just launched: nothing arrived, nothing loaded. */
export function startTravel(missionId: string): TravelState {
  return {
    kind: 'travel',
    missionId,
    skipped: false,
    settled: false,
    drew: false,
    prepared: false,
    loadFailed: false,
  };
}

/**
 * Whether the room may be joined now (§7.6 step 3): the match's code is here,
 * and the world has arrived and fetched its part — or the world could not be
 * drawn at all, so there was no travel and nothing of it to wait on.
 */
export function readyToJoin(travel: TravelState, worldFailed: boolean): boolean {
  // A failed load is never `prepared`, so it joins nothing; its Retry reloads the page.
  return travel.prepared && (travel.settled || worldFailed);
}

/**
 * The match's code has loaded, or failed to (§7.6, "A load or join failure").
 * A failure is never `prepared`, so it joins nothing: the bar says it, and its
 * Retry reloads the page (`reloadForRetry`).
 */
export function onLoad<S extends { kind: string }>(
  screen: S | TravelState,
  loaded: boolean,
  missionId: string
): S | TravelState {
  return onTravel(screen, loaded ? { prepared: true } : { loadFailed: true }, missionId);
}

/**
 * Apply a travel's own news — Skip pressed, the camera arrived, the match
 * loaded — to whatever screen is current, and to a travel only. A screen the
 * player has already left by Cancel is returned as it is, so news that lands
 * after a Cancel joins nothing. `missionId` narrows it to one travel; news
 * from a launch that was cancelled and relaunched elsewhere is dropped.
 */
export function onTravel<S extends { kind: string }>(
  screen: S | TravelState,
  change: Partial<Pick<TravelState, 'skipped' | 'settled' | 'drew' | 'prepared' | 'loadFailed'>>,
  missionId?: string
): S | TravelState {
  if (screen.kind !== 'travel') return screen;
  const travel = screen as TravelState;
  if (missionId !== undefined && travel.missionId !== missionId) return screen;
  return { ...travel, ...change };
}
