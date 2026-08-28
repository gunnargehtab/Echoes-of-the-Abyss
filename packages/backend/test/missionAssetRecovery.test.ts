/**
 * The Ledger 1, running — docs/mission-asset-recovery.md, against a live match.
 *
 * `missions.test.ts` reads the literal; this file lets the writ run out. The
 * claims worth an eighteen-minute simulation are the ones the table cannot
 * state, and they are the mission's spine:
 *
 * - **The Board reads the count at 18:00 on whatever the player earned** (§8's
 *   Results, §9's close). A column that never lifts a single asset is read
 *   "The number stays" — the keystone's reading, because the chamber did not
 *   come out — and the mission resolves on the beat, not on anything emergent.
 * - **The column is armed and the barges are not** (§3). The first mission in
 *   the campaign with weapons, and exactly three of them.
 * - **The fall's stages land on the document's clock** (§8): part of Face Six
 *   is water at eleven minutes and rock at twelve.
 * - **The writ arms the player with every reading at 00:00** except the haul
 *   home, which appears when the haul does (§12).
 *
 * One idle run, memoised — nobody drives the column, which is itself the §8
 * failure case: eighteen minutes of warning, ignored, and the registry keeps
 * the number.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MissionOutcome, SIM, type MissionView } from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Owner, Unit, Weapon } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { LEDGER_ASSET_RECOVERY } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = LEDGER_ASSET_RECOVERY.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** Inside the fall-stage rectangle the 11:30 beat closes. */
const STAGE = { x: 2125, y: 2625, depthM: 1100 };

const hulls = defineQuery([Unit, Owner]);

interface Run {
  /** Player hulls with live fire control, counted just after install. */
  armedCount: number;
  ownedCount: number;
  /** Whether the stage rectangle admitted water before and after 11:30. */
  stageOpenBefore: boolean;
  stageOpenAfter: boolean;
  /** Objective ids visible in the first view, and in the last. */
  firstViewIds: string[];
  lastViewIds: string[];
  resolvedAtTick: number;
  outcome: MissionOutcome | null;
  epilogue: string | null;
}

let memo: Run | null = null;

function run(): Run {
  if (memo !== null) return memo;
  const map = missionMapById(LEDGER_ASSET_RECOVERY.mapId)!;
  const match = new Match(map, { mission: LEDGER_ASSET_RECOVERY, fauna: false, seed: 23 });

  // A deliberate ECS read, in `missionRuntime.test.ts`'s manner: the armed
  // flag is a spawn-time fact and the wire never carries it, so the component
  // is the only place the claim is checkable.
  let armedCount = 0;
  let ownedCount = 0;
  for (const eid of hulls(match.world)) {
    if (Owner.slot[eid] !== PLAYER) continue;
    ownedCount++;
    if (hasComponent(match.world, Weapon, eid)) armedCount++;
  }

  const stageOpenBefore = match.world.terrain.admits(STAGE.x, STAGE.y, STAGE.depthM);

  let firstView: MissionView | null = null;
  let lastView: MissionView | null = null;
  let stageOpenAfter = stageOpenBefore;
  let resolvedAtTick = 0;

  for (let tick = 0; tick <= T(18, 30); tick++) {
    match.update(STEP_MS);
    const view = match.takeMissionView();
    if (view !== null) {
      if (firstView === null) firstView = view;
      lastView = view;
    }
    if (tick === T(12)) {
      stageOpenAfter = match.world.terrain.admits(STAGE.x, STAGE.y, STAGE.depthM);
    }
    if (match.missionOver !== null) {
      resolvedAtTick = match.world.tick;
      break;
    }
  }

  memo = {
    armedCount,
    ownedCount,
    stageOpenBefore,
    stageOpenAfter,
    firstViewIds: firstView?.objectives.map((o) => o.id) ?? [],
    lastViewIds: lastView?.objectives.map((o) => o.id) ?? [],
    resolvedAtTick,
    outcome: match.missionOver?.outcome ?? null,
    epilogue: match.missionOver?.epilogue ?? null,
  };
  return memo;
}

describe('the writ, run out — docs/mission-asset-recovery.md §8, §9', () => {
  it('closes at eighteen minutes on the reading the player earned', () => {
    assert.equal(
      run().outcome,
      MissionOutcome.Lost,
      'an untouched manifest read as something else'
    );
    assert.match(run().epilogue ?? '', /keeps the number/);
    // On the beat: the ground goes and the Board reads, at 18:00 and not on
    // anything emergent. One Echo interval of slack, because the runtime
    // resolves on its own 5 Hz tick.
    const closeS = run().resolvedAtTick / SIM.TICK_HZ;
    assert.ok(
      Math.abs(closeS - 18 * 60) <= 1,
      `the writ closed at ${closeS.toFixed(1)}s against the authored 1080s`
    );
  });

  it('arms the escorts and nothing else — the first weapons in the campaign', () => {
    assert.equal(run().ownedCount, 6, 'the column is three combat hulls and three barges');
    assert.equal(run().armedCount, 3, 'the writ arms the escorts, and only the escorts');
  });

  it('closes a stage of Face Six at eleven-thirty, on the clock', () => {
    assert.ok(run().stageOpenBefore, 'the stage was rock before the fall shifted');
    assert.ok(!run().stageOpenAfter, 'the fall shifted and the water stayed');
  });

  it('shows every reading at the writ, and the haul home only when it begins', () => {
    // §12 arms the player with the three asset readings from 00:00 — the writ
    // names its whole manifest — while the column's return appears with
    // Vail's beat at 12:30, because a reading shown at the Rail Head would
    // open the mission already met.
    assert.deepEqual(run().firstViewIds, ['asset-114', 'asset-181', 'asset-200']);
    assert.deepEqual(run().lastViewIds, ['asset-114', 'asset-181', 'asset-200', 'column']);
  });
});
