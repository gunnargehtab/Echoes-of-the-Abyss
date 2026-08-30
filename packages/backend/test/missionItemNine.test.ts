/**
 * The Ledger 7 — docs/mission-item-nine.md, against the shared model and a
 * live match.
 *
 * - **The decision's acoustics hold under the real model** (§4): from the
 *   rail, at the chamber's authored ranges, an idle flight is never
 *   classified by the registry watch and a transmitting one always is — at
 *   both propagation extremes the path can take, so the ending can never be
 *   an accident of terrain.
 * - **The array is pointedly unlocked** (§3): the campaign's last mission
 *   locks the guns and leaves the one button that is the mission.
 * - **The sitting, sat** — the twelve-minute idle run closes Complete, with
 *   the continuance carried, the minutes fully entered from the rail, and no
 *   unsealing anywhere in the record.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MissionOutcome,
  ResolutionTier,
  SIM,
  detectionRatio,
  thermoclineFactor,
  tierFromRatio,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { LEDGER_ITEM_NINE } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

describe("the decision's acoustics — docs/mission-item-nine.md §4", () => {
  // The rail at (2000, 1900, 1250 m); the watch at roughly (750, 500, 1150 m),
  // with a Corvette's ears. Both depths sit in the layer's duct, so the pair
  // factor is the duct's own. The path crosses vein and coral paint, so both
  // claims are asserted at both PF extremes the ground can produce.
  const RANGE_M = Math.hypot(2000 - 750, 1900 - 500);
  const WATCH_HYD = 50;
  const DUCT = thermoclineFactor(1250, 1150);
  const PF_BOUNDS = [0.45, 0.8] as const;

  it('keeps an idle flight under Classification at every propagation the path allows', () => {
    for (const pf of PF_BOUNDS) {
      // The loudest idle hull in the flight is a Corvette at 28.
      const tier = tierFromRatio(detectionRatio(28, pf * DUCT, RANGE_M, WATCH_HYD));
      assert.ok(
        tier < ResolutionTier.Classification,
        `an idle flight reads tier ${tier} at PF ${pf} — the lie would be impossible`
      );
    }
  });

  it('classifies a transmission at every propagation the path allows', () => {
    for (const pf of PF_BOUNDS) {
      // Active sonar: SIG 95, omnidirectional, for three seconds — longer
      // than the two the record needs.
      const tier = tierFromRatio(detectionRatio(95, pf * DUCT, RANGE_M, WATCH_HYD));
      assert.ok(
        tier >= ResolutionTier.Classification,
        `a transmission reads tier ${tier} at PF ${pf} — the unsealing would be impossible`
      );
    }
  });
});

describe('the sitting, sat — docs/mission-item-nine.md §3, §8', () => {
  it('leaves the array unlocked, and the guns struck', () => {
    const locked = new Set(LEDGER_ITEM_NINE.locks.map((lock) => lock.ability));
    assert.ok(!locked.has('activeSonar'), 'the one button that is the mission is fenced');
    assert.ok(locked.has('weapons'), 'a weapon entered the Underway');
  });

  it('closes on the continuance when the chair does nothing, minutes entered', () => {
    const map = missionMapById(LEDGER_ITEM_NINE.mapId)!;
    const match = new Match(map, { mission: LEDGER_ITEM_NINE, fauna: false, seed: 73 });
    for (let tick = 0; tick <= T(13, 30); tick++) {
      match.update(STEP_MS);
      if (match.missionOver !== null) break;
    }
    const result = match.missionOver;
    assert.ok(result !== null, 'the session never closed');
    // A conclusion: the mission cannot be lost, only decided (§7).
    assert.equal(result.outcome, MissionOutcome.Complete);
    // The lie's record, and not the other one.
    assert.match(result.epilogue, /The continuance carried/);
    assert.match(result.epilogue, /first false sentence/);
    assert.doesNotMatch(result.epilogue, /unsealed/);
    // The minutes, assembled from the rail: the flight attends the items by
    // being present, and the ninth is called and heard.
    assert.match(result.epilogue, /Item One is entered/);
    assert.match(result.epilogue, /Item Six: the rim field/);
    assert.match(result.epilogue, /Classified by continuance one hundred and twenty-six years/);
  });
});
