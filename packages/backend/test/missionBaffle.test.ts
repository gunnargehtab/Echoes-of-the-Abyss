/**
 * The Ledger 3 — docs/mission-baffle.md, against a live match.
 *
 * `missions.test.ts` reads the literal; this file lets the writ run out and
 * states the claims the table cannot:
 *
 * - **The ping is finally on the table** (§3): the first mission in the
 *   campaign whose locks do not name `activeSonar`.
 * - **The escort is armed, the barge is not, and the picket is** (§3, §5) —
 *   the campaign's first combat against another navy, seated as authored.
 * - **The northern station goes off the chart at 13:00** (§7): a `lose` beat
 *   on a player structure, the first in the campaign, landing on the clock.
 * - **An idle convoy reads as the yard going dark** — the keystone: twenty
 *   minutes of warning, ignored, and the file opens. The column's reading
 *   reads "at cost", because a column that never stood off the yard was
 *   never out of the corridor.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MissionOutcome, SIM } from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Owner, Structure, Unit, Weapon } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { LEDGER_BAFFLE } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const hulls = defineQuery([Unit, Owner]);
const moored = defineQuery([Structure, Owner]);

interface Run {
  playerArmed: number;
  playerHulls: number;
  picketArmed: number;
  stationsBefore: number;
  stationsAfter: number;
  resolvedAtTick: number;
  outcome: MissionOutcome | null;
  epilogue: string | null;
}

let memo: Run | null = null;

function run(): Run {
  if (memo !== null) return memo;
  const map = missionMapById(LEDGER_BAFFLE.mapId)!;
  const match = new Match(map, { mission: LEDGER_BAFFLE, fauna: false, seed: 31 });

  let playerArmed = 0;
  let playerHulls = 0;
  let picketArmed = 0;
  for (const eid of hulls(match.world)) {
    const armed = hasComponent(match.world, Weapon, eid);
    if (Owner.slot[eid] === LEDGER_BAFFLE.playerSlot) {
      playerHulls++;
      if (armed) playerArmed++;
    } else if (armed) {
      picketArmed++;
    }
  }

  const stations = (): number => {
    let count = 0;
    for (const eid of moored(match.world)) {
      if (Owner.slot[eid] === LEDGER_BAFFLE.playerSlot) count++;
    }
    return count;
  };

  const stationsBefore = stations();
  let stationsAfter = stationsBefore;
  let resolvedAtTick = 0;
  for (let tick = 0; tick <= T(20, 30); tick++) {
    match.update(STEP_MS);
    if (tick === T(13, 10)) stationsAfter = stations();
    if (match.missionOver !== null) {
      resolvedAtTick = match.world.tick;
      break;
    }
  }

  memo = {
    playerArmed,
    playerHulls,
    picketArmed,
    stationsBefore,
    stationsAfter,
    resolvedAtTick,
    outcome: match.missionOver?.outcome ?? null,
    epilogue: match.missionOver?.epilogue ?? null,
  };
  return memo;
}

describe('the writ, run out — docs/mission-baffle.md §7, §8, §9', () => {
  it('hands the ping over: the first campaign mission that does not lock it', () => {
    assert.ok(
      LEDGER_BAFFLE.locks.every((lock) => lock.ability !== 'activeSonar'),
      'campaign.md §10 hands the ping over at mission 3, and the locks still withhold it'
    );
  });

  it('arms the escort and the picket, and neither barge nor stations', () => {
    assert.equal(run().playerHulls, 4, 'the convoy is three escorts and the barge');
    assert.equal(run().playerArmed, 3, 'the writ arms the escorts, and only the escorts');
    assert.equal(run().picketArmed, 4, 'two standing watches of two, all armed');
  });

  it('takes the northern station off the chart at thirteen minutes', () => {
    assert.equal(run().stationsBefore, 2, 'two stations moored at the lay-bys');
    assert.equal(run().stationsAfter, 1, 'the correction landed on the clock');
  });

  it('reads an idle convoy as the yard going dark, at the whistle', () => {
    assert.equal(run().outcome, MissionOutcome.Lost, 'the keystone is the plant');
    assert.match(run().epilogue ?? '', /plant fails on schedule/);
    assert.match(run().epilogue ?? '', /entered at cost/);
    const closeS = run().resolvedAtTick / SIM.TICK_HZ;
    assert.ok(
      Math.abs(closeS - 20 * 60) <= 1,
      `the writ closed at ${closeS.toFixed(1)}s against the authored 1200s`
    );
  });
});
