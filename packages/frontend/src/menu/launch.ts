/**
 * Which launches travel, and when a travel joins — docs/world-map.md §7.6
 * (#1462).
 *
 * The shell's rules for the one door that travels, kept out of `App.tsx` so
 * they are tested as rules rather than through a screen whose travel, on a
 * runner with no WebGL, arrives before it can be looked at.
 */

import { worldRegionForMission } from '@echoes/shared';

/** A launch from the board, travelling before its room is joined. */
export interface TravelState {
  kind: 'travel';
  missionId: string;
  /** The player pressed Skip: the camera is cut to the end. */
  skipped: boolean;
  /** The camera stands on the mission's opening frame. */
  settled: boolean;
  /** The match's own code has loaded. */
  prepared: boolean;
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
  return { kind: 'travel', missionId, skipped: false, settled: false, prepared: false };
}

/**
 * Whether the room may be joined now (§7.6 step 3): the match's code is here
 * and the camera has arrived — or the world could not be drawn at all, so
 * there was no travel to wait on.
 */
export function readyToJoin(travel: TravelState, worldFailed: boolean): boolean {
  return travel.prepared && (travel.settled || worldFailed);
}
