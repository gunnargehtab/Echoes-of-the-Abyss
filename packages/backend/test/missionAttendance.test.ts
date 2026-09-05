/**
 * The Attending 1, running — docs/mission-attendance.md, against a live match.
 *
 * `missions.test.ts` reads the literal; this file attends the watch. The claims
 * worth eighteen simulated minutes are the ones §6 and §8 make about the shape
 * of the shift, and they are the mission:
 *
 * - **A watch that never moves attends seven of the nine** (§6's own spine),
 *   owes nothing, and is read "You were sufficient" — the middle reading, and
 *   the highest praise the register has (§8).
 * - **The whole cycle costs a breach** (§8). One hull sent down the channel
 *   between arrivals takes the two the seated band cannot reach, and the shift
 *   runs a debt doing it, inside the forty-five second cap §5 sets.
 * - **The close assembles rather than chooses** (§13's last ask): nine lines,
 *   one per arrival, entered or gap, under whichever reading the count earned.
 * - **The best ears in the Rift, pointed at the one thing that does not
 *   resolve** (§4). The watch reaches Tier 3 and Tier 4 on the arrivals and
 *   learns nothing by it: there is no kind and no faction to name.
 *
 * Two drives, memoised. Nobody is chasing the player in either, which is the
 * mission.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MissionOutcome, SIM, type EchoSnapshot, type MissionView } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { ATTENDING_ATTENDANCE } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = ATTENDING_ATTENDANCE.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** Down the axis, where the approach and the sill arrive (§6, rows 6 and 8). */
const APPROACH = { x: 2500, y: 3400 };
const SILL = { x: 2500, y: 3875 };

interface Run {
  outcome: MissionOutcome;
  epilogue: string;
  /** The transcript's lines, under the reading. */
  lines: string[];
  peakDebtS: number;
  resolvedAtTick: number;
  /** Whether any contact the player ever held named a kind or a faction. */
  anythingClassified: boolean;
  /** The best tier the player ever reached on anything. */
  bestTier: number;
}

/**
 * Drive the watch for a whole shift.
 *
 * Orders are issued off a tick rather than off a snapshot, because snapshots
 * land on the Echo tick and an order placed only on those ticks would miss the
 * ones this mission is timed against. The hull ids are taken from the first
 * snapshot and then held: they are the player's own force and it never changes.
 */
function play(drive: (match: Match, tick: number, ids: number[]) => void): Run {
  const map = missionMapById(ATTENDING_ATTENDANCE.mapId)!;
  const match = new Match(map, { mission: ATTENDING_ATTENDANCE, fauna: false, seed: 5 });
  let ids: number[] = [];
  let peakDebtS = 0;
  let anythingClassified = false;
  let bestTier = 0;

  for (let tick = 0; tick <= T(18, 30); tick++) {
    const own = match.update(STEP_MS)?.get(PLAYER) as EchoSnapshot | undefined;
    if (own !== undefined) {
      if (ids.length === 0) ids = own.units.map((u) => u.id).sort((a, b) => a - b);
      for (const contact of own.contacts) {
        if (contact.tier > bestTier) bestTier = contact.tier;
        if (contact.kind !== undefined || contact.faction !== undefined) anythingClassified = true;
      }
    }
    if (ids.length > 0) drive(match, tick, ids);
    const view = match.takeMissionView() as MissionView | null;
    if (view !== null) peakDebtS = Math.max(peakDebtS, view.debtS);
    if (match.missionOver !== null) break;
  }

  const over = match.missionOver;
  assert.ok(over !== null, 'the watch never ended');
  const [reading, ...rest] = over.epilogue.split('\n');
  return {
    outcome: over.outcome,
    epilogue: reading ?? '',
    lines: rest.filter((line) => line.trim().length > 0),
    peakDebtS,
    resolvedAtTick: match.world.tick,
    anythingClassified,
    bestTier,
  };
}

let seatedRun: Run | null = null;
function seated(): Run {
  seatedRun ??= play(() => {});
  return seatedRun;
}

let detachedRun: Run | null = null;
function detached(): Run {
  // One hull down the channel and back to nothing — sent *between* arrivals,
  // which is the whole craft of it: the debt runs while it travels, the dome
  // is withdrawn while the debt stands, and neither window overlaps an arrival
  // the seated three are holding at the band's edge.
  detachedRun ??= play((match, tick, ids) => {
    if (tick === T(8, 20)) match.orderMove(PLAYER, ids[0]!, APPROACH.x, APPROACH.y);
    if (tick === T(10, 30)) match.orderMove(PLAYER, ids[0]!, SILL.x, SILL.y);
  });
  return detachedRun;
}

describe('the watch, seated — docs/mission-attendance.md §6, §8', () => {
  it('attends seven of the nine and owes nothing', () => {
    // §6: "A watch that never moves attends seven of the nine." The
    // seated band reaches every arrival at the head and neither of the two
    // down the channel, and a watch that never travels never shoves.
    const run = seated();
    assert.equal(run.lines.filter((l) => l.startsWith('Entered:')).length, 7);
    assert.equal(run.peakDebtS, 0, 'a watch that never moved ran a silence debt');
  });

  it('is read sufficient, which is the highest praise the register has', () => {
    const run = seated();
    assert.equal(run.outcome, MissionOutcome.Partial);
    assert.match(run.epilogue, /^You were sufficient\./);
  });

  it('enters the approach and the sill as gaps, and nothing else', () => {
    // §6 rows 6 and 8: the two the transcript's last line costs. The gap is
    // entered too, "which is the transcript's own convention and not a
    // punishment invented for a game".
    const gaps = seated()
      .lines.filter((line) => line.startsWith('Not entered:'))
      .join(' ');
    assert.match(gaps, /arrival six/);
    assert.match(gaps, /arrival eight/);
    assert.equal(seated().lines.filter((l) => l.startsWith('Not entered:')).length, 2);
  });

  it('closes at eighteen minutes as a conclusion, not a timer', () => {
    // §8: the cycle does not end, the watch does, and the next trench takes
    // it. One Echo interval of slack, because the runtime resolves at 5 Hz.
    const closeS = seated().resolvedAtTick / SIM.TICK_HZ;
    assert.ok(Math.abs(closeS - 18 * 60) <= 1, `the watch ended at ${closeS.toFixed(1)}s`);
  });
});

describe('the whole cycle costs a breach — §8', () => {
  it('attends nine of nine when a hull goes down the channel for them', () => {
    const run = detached();
    assert.equal(run.lines.filter((l) => l.startsWith('Entered:')).length, 9);
    assert.equal(run.outcome, MissionOutcome.Complete);
    assert.match(run.epilogue, /^Nine of nine\./);
  });

  it('runs a silence debt doing it, inside the cap the rite sets', () => {
    // §5: the ledger's mechanical price is small and deliberately so — its
    // real price is that it is written down. What the test holds is that the
    // price is *paid*: the whole cycle is not available for nothing.
    const run = detached();
    assert.ok(run.peakDebtS > 0, 'the whole cycle came free of any debt at all');
    assert.ok(
      run.peakDebtS <= ATTENDING_ATTENDANCE.debtCapS,
      `debt reached ${run.peakDebtS}s against a cap of ${ATTENDING_ATTENDANCE.debtCapS}s`
    );
  });
});

describe('the transcript, assembled — §12, §13', () => {
  it('reads back every arrival in authored order, entered or gap', () => {
    // The close assembles rather than chooses: one authored line per arrival,
    // and the run picks which of the two it was.
    const run = seated();
    assert.equal(run.lines.length, 9);
    const ordinals = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    for (const [index, line] of run.lines.entries()) {
      assert.match(line, new RegExp(`arrival ${ordinals[index]!}\\b`), `line ${index + 1}`);
    }
  });
});

describe('the one thing that does not resolve — §4', () => {
  it('reaches classification and learns nothing by it', () => {
    // §4: a listener close enough will reach Tier 3 and Tier 4 on the return
    // and will learn nothing more, because the emitter carries a position and
    // a depth and no kind and no faction. The Directorate's taboo, rendered
    // exactly by the format's emitters rather than by a rule this mission adds.
    const run = seated();
    assert.ok(run.bestTier >= 3, `the watch never reached classification (best ${run.bestTier})`);
    assert.ok(!run.anythingClassified, 'an arrival named a kind or a faction');
  });
});
