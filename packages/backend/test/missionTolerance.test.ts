/**
 * The tolerance — docs/mission-aptitude.md §5, driven through the real runtime.
 *
 * The mirror of Attendance's `attend`, and the first predicate in the union
 * whose `isMet` is bad news: it does not tally what the player resolved, it
 * tallies what was resolved *of* the player. §5 states it in one line —
 * "thirty seconds, cumulative, at Classification or better, across the whole
 * party" — and every claim below is one of the three properties that line
 * carries, plus the arithmetic that gets a wall-clock threshold out of a
 * counter running on the Echo cadence:
 *
 * - **Tier 1 and Tier 2 are free, all mission.** A smudge is weather and a
 *   bearing is a fish. A party held at Bearing for the whole thirty seconds
 *   has spent nothing, which is what keeps this from being a stealth mission
 *   with a binary fail.
 * - **Cumulative, not continuous.** Three ten-second entries reach the
 *   threshold exactly as one thirty-second entry does, "because the
 *   Consortium's procedure is cumulative: the log is added up at the end of a
 *   shift, not watched".
 * - **Track counts, being "or better".** Tier 4 is an entry for the same
 *   reason Tier 3 is, and the comparison is the whole rule.
 * - **The reading is the chapter's.** §12 says "Eleven seconds of thirty are
 *   entered", so the wire carries 11 of 30 while the union stores 660 of 1800,
 *   and it is capped: a party classified for a further minute reads 30 of 30.
 *
 * **No mission literal is added for this and none is needed** — #238, #240 and
 * #241 each landed a mechanism with tests and no mission, and `outer-formations`
 * is its own row of §13. The definition below is a test fixture in the idiom
 * `missionLifts.test.ts` uses: one objective, no parties, nothing in the water.
 * That is deliberate rather than lazy. The tolerance reads `exposure` off the
 * player's own snapshot and nothing else, so a fixture that feeds the snapshot
 * directly exercises the rule at full strength while making the tier the one
 * variable in the file.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  type EchoSnapshot,
  type MissionView,
} from '@echoes/shared';
import { Terrain } from '../src/sim/terrain.ts';
import { createSimWorld } from '../src/sim/world.ts';
import { MissionRuntime, type MissionCommandSink } from '../src/sim/missions/runtime.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import type { MissionDefinition } from '../src/sim/missions/index.ts';

/** §5's threshold, in the unit the union stores and the one the chapter speaks. */
const TOLERANCE_S = 30;
const TOLERANCE_TICKS = TOLERANCE_S * SIM.TICK_HZ;

/** How many sim ticks one mission tick covers — `match.ts` drives it on these. */
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
/** Mission ticks in one second of wall clock. */
const TICKS_PER_S = SIM.ECHO_HZ;

const OBJECTIVE = 'unheard';

/**
 * One objective, one rule, nothing else — the tolerance with §5's own numbers.
 *
 * Every field that would put something in the water is emptied, including
 * `arrayTag` and `sweep`: this fixture is never installed, so a definition that
 * named a hull would have the runtime looking for an entity nobody spawned.
 */
const TOLERANCE_ONLY: MissionDefinition = {
  ...PROLOGUE_SORROWGATE,
  id: 'test-tolerance',
  arrayTag: undefined,
  sweep: undefined,
  lifts: undefined,
  regions: [],
  markers: [],
  parties: [],
  beats: [],
  objectives: [
    {
      id: OBJECTIVE,
      text: 'Two hulls are held. One is classified.',
      initial: ObjectiveStatus.Pending,
      predicate: {
        kind: 'tolerance',
        ticks: TOLERANCE_TICKS,
        tier: ResolutionTier.Classification,
      },
    },
  ],
};

/** A resolved snapshot carrying one fact: how well somebody else is hearing you. */
function heardAs(tick: number, tier: ResolutionTier): EchoSnapshot {
  return {
    tick,
    units: [],
    structures: [],
    ordnance: [],
    contacts: [],
    peakSig: 0,
    nodules: 0,
    crystal: 0,
    biomass: 0,
    exposure: { tier, trackedCount: tier >= ResolutionTier.Bearing ? 1 : 0 },
    selfEvents: [],
    draw: { capacity: 0, demand: 0, satisfaction: 1 },
    driftHealth: [],
    hazards: [],
    marks: [],
  };
}

/** The sink is required and never reached: the fixture authors no beats. */
const SINK: MissionCommandSink = {
  applyMove: () => {},
  applyDepth: () => true,
  applySilent: () => {},
  applyPing: () => {},
};

/**
 * Drive the runtime one mission tick per entry of `tiers`, at the cadence
 * `match.ts` drives it on, and read the view out at the end.
 *
 * Ticks advance by `ECHO_TICK_INTERVAL` because that is what a mission tick
 * costs in simulation time — the thing the tally has to convert correctly for
 * §5's thirty seconds to be thirty seconds.
 */
function drive(tiers: readonly ResolutionTier[]): { view: MissionView; status: ObjectiveStatus } {
  const runtime = new MissionRuntime(TOLERANCE_ONLY);
  const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
  let tick = 0;
  for (const tier of tiers) {
    tick += ECHO_TICK_INTERVAL;
    world.tick = tick;
    runtime.tick(world, SINK, heardAs(tick, tier));
  }
  const view = runtime.currentView;
  assert.ok(view !== null, 'the runtime built no view');
  const objective = view.objectives.find((o) => o.id === OBJECTIVE);
  assert.ok(objective !== undefined, 'the tolerance objective is not in the view');
  assert.ok(objective.progress !== undefined, 'the tolerance carries no counter');
  return { view, status: objective.status };
}

/** `seconds` of wall clock spent at one tier, as mission ticks. */
const held = (tier: ResolutionTier, seconds: number): ResolutionTier[] =>
  Array<ResolutionTier>(seconds * TICKS_PER_S).fill(tier);

function reading(view: MissionView): { done: number; of: number } {
  return view.objectives.find((o) => o.id === OBJECTIVE)!.progress!;
}

describe('the free tiers are free, all mission — §5', () => {
  it('spends nothing on a smudge or a bearing', () => {
    // "Tier 1 and Tier 2 are free. A smudge is weather. A bearing is a fish."
    // The whole thirty seconds at Bearing, and the log is empty — which is the
    // sentence that keeps Aptitude from being a stealth mission with a binary
    // fail, and keeps it inside the target emotion.
    for (const tier of [ResolutionTier.Silent, ResolutionTier.Contact, ResolutionTier.Bearing]) {
      const { view, status } = drive(held(tier, TOLERANCE_S));
      assert.deepEqual(reading(view), { done: 0, of: TOLERANCE_S }, `tier ${tier} was charged`);
      assert.equal(status, ObjectiveStatus.Pending, `tier ${tier} exhausted the tolerance`);
    }
  });
});

describe('Tier 3 is an entry — §5', () => {
  it('charges thirty seconds of Classification exactly thirty seconds', () => {
    // The threshold is wall clock, and the tally runs on the Echo cadence — so
    // this is the assertion that the conversion between the two clocks is
    // right. One per mission tick would read two and a half minutes here.
    const { view, status } = drive(held(ResolutionTier.Classification, TOLERANCE_S));
    assert.deepEqual(reading(view), { done: TOLERANCE_S, of: TOLERANCE_S });
    assert.equal(status, ObjectiveStatus.Met, 'thirty seconds classified did not exhaust it');
  });

  it('is one short at twenty-nine', () => {
    const { view, status } = drive(held(ResolutionTier.Classification, TOLERANCE_S - 1));
    assert.deepEqual(reading(view), { done: TOLERANCE_S - 1, of: TOLERANCE_S });
    assert.equal(status, ObjectiveStatus.Pending);
  });
});

describe('Track counts, being "or better" — §5', () => {
  it('charges Tier 4 exactly as it charges Tier 3', () => {
    // Full resolution is not a lesser reading than classification, and the
    // comparison is the whole rule — so it is worth an explicit test rather
    // than an inference from the enum's ordering.
    const { view, status } = drive(held(ResolutionTier.Track, TOLERANCE_S));
    assert.deepEqual(reading(view), { done: TOLERANCE_S, of: TOLERANCE_S });
    assert.equal(status, ObjectiveStatus.Met);
  });

  it('adds a mixed shift up across both charged tiers', () => {
    // Fifteen classified and fifteen tracked is thirty spent. The tally is
    // kept per observed tier, so this is the one case where summing upward is
    // doing visible work.
    const { view, status } = drive([
      ...held(ResolutionTier.Classification, 15),
      ...held(ResolutionTier.Track, 15),
    ]);
    assert.deepEqual(reading(view), { done: TOLERANCE_S, of: TOLERANCE_S });
    assert.equal(status, ObjectiveStatus.Met);
  });
});

describe('cumulative, not continuous — §5', () => {
  it('reaches the threshold in three entries exactly as it does in one', () => {
    // "The log is added up at the end of a shift, not watched." Ten seconds
    // heard, twenty in the clear, three times over: eighteen simulated minutes
    // of nothing between the entries would not change the total either.
    const broken: ResolutionTier[] = [];
    for (let entry = 0; entry < 3; entry++) {
      broken.push(...held(ResolutionTier.Classification, 10));
      broken.push(...held(ResolutionTier.Bearing, 20));
    }
    const { view, status } = drive(broken);
    assert.deepEqual(reading(view), { done: TOLERANCE_S, of: TOLERANCE_S });
    assert.equal(status, ObjectiveStatus.Met);
  });

  it('does not give a second back when the party goes quiet again', () => {
    // Monotone, which is why `isStanding` does not grow this predicate: a
    // second the survey spent listening to you is spent, and un-spending it
    // would rewrite the player's history.
    const { view } = drive([
      ...held(ResolutionTier.Classification, 11),
      ...held(ResolutionTier.Silent, 60),
    ]);
    // §12's own reading, in play: "Eleven seconds of thirty are entered."
    assert.deepEqual(reading(view), { done: 11, of: TOLERANCE_S });
  });
});

describe('the reading is the chapter’s — §12', () => {
  it('speaks seconds while the union stores ticks', () => {
    // "Twenty-two of thirty. The coring has stopped." The literal authors
    // 1,800 ticks and the panel says thirty, so no mission text has to do
    // arithmetic in a sentence (docs/campaign.md §10).
    const predicate = TOLERANCE_ONLY.objectives[0]!.predicate;
    assert.equal(predicate.kind, 'tolerance');
    assert.equal(predicate.kind === 'tolerance' ? predicate.ticks : 0, 1800);

    const { view } = drive(held(ResolutionTier.Classification, 22));
    assert.deepEqual(reading(view), { done: 22, of: TOLERANCE_S });
  });

  it('caps, so a further minute still reads thirty of thirty', () => {
    // The reading is what the chapter reads out, and a chapter does not
    // over-count — `attend` and `extract` are capped for the same reason.
    const { view, status } = drive(held(ResolutionTier.Classification, 90));
    assert.deepEqual(reading(view), { done: TOLERANCE_S, of: TOLERANCE_S });
    assert.equal(status, ObjectiveStatus.Met);
  });
});

describe('it is a budget, not an objective — §5', () => {
  it('resolves no mission and fails nothing when it is exhausted', () => {
    // "It is not a mission failure and the epilogue does not treat it as one."
    // Exhausting the tolerance marks the reading Met and does nothing else:
    // the barge falling silent, the recall and the column are all beats fired
    // by a condition, which is §13's own separate row and its own issue.
    const runtime = new MissionRuntime(TOLERANCE_ONLY);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    let resolution = null;
    let tick = 0;
    for (const tier of held(ResolutionTier.Track, 60)) {
      tick += ECHO_TICK_INTERVAL;
      world.tick = tick;
      resolution = runtime.tick(world, SINK, heardAs(tick, tier)) ?? resolution;
    }
    assert.equal(resolution, null, 'the tolerance ended the mission');
    // Met, and nothing else happened: sixty seconds tracked is twice the
    // tolerance, and the mission is still running.
    const objective = runtime.currentView!.objectives.find((o) => o.id === OBJECTIVE)!;
    assert.equal(objective.status, ObjectiveStatus.Met);
  });
});
