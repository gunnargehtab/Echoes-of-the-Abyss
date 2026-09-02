/**
 * The Ledger 2 — docs/mission-shift-change.md, against the two mechanisms it
 * added and a live match.
 *
 * `missions.test.ts` reads the literal; this file states the claims the table
 * cannot:
 *
 * - **The `deliver` predicate reads the player's own stockpile and nothing
 *   else** — the figure the snapshot already carries, capped, met at the
 *   quota (§8; types.ts). Driven through the real runtime on a fixture, the
 *   `missionTolerance.test.ts` arrangement, so the one variable in the file
 *   is the number.
 * - **The close assembles** — an objective's met or unmet reading is appended
 *   beneath the outcome's own, in authored order, picked by the frozen status
 *   (§8; types.ts, `reading`).
 * - **The map's acoustic claims hold under the real model** (§1, §6): the
 *   faces can run Overburden at the road's ears and stay unheard, and a barge
 *   under way above the layer during a pass is a contact. Stated with the
 *   shared propagation functions, independently of the Echo pass, the
 *   `echo-parity.test.ts` manner.
 * - **An untouched shift is read as a failed one** — the sixteen-minute idle
 *   run, closing on the whistle with both unmet readings and no audit minute,
 *   because an idle field neither delivers, berths, nor crosses the layer.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  detectionRatio,
  thermoclineFactor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { LEDGER_SHIFT_CHANGE, PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import { MissionRuntime, type MissionCommandSink } from '../src/sim/missions/runtime.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { createSimWorld } from '../src/sim/world.ts';
import type {
  EconomyAccount,
  MissionDefinition,
  MissionPredicate,
} from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** §8's quota, as the literal authors it. */
const QUOTA = 3600;

/**
 * A resolved snapshot carrying one fact: what the player's economy holds.
 * The other two accounts are held at a decoy figure rather than zero, so a
 * predicate that read the wrong account would be caught reading it.
 */
function banked(
  tick: number,
  amount: number,
  account: EconomyAccount = 'nodules',
  decoy = 0
): EchoSnapshot {
  return {
    tick,
    units: [],
    structures: [],
    ordnance: [],
    contacts: [],
    peakSig: 0,
    nodules: decoy,
    crystal: decoy,
    biomass: decoy,
    [account]: amount,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 0, demand: 0, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
  };
}

/** The sink is required and never reached: the fixtures author no ordering beats. */
const SINK: MissionCommandSink = {
  applyMove: () => {},
  applyDepth: () => true,
  applySilent: () => {},
  applyPing: () => {},
};

/**
 * One objective, one rule, nothing else — the `deliver` predicate with §8's
 * own figure, in `missionTolerance.test.ts`'s fixture idiom: never installed,
 * nothing in the water, the snapshot fed directly.
 */
const DELIVER_ONLY: MissionDefinition = {
  ...PROLOGUE_SORROWGATE,
  id: 'test-deliver',
  arrayTag: undefined,
  sweep: undefined,
  lifts: undefined,
  regions: [],
  markers: [],
  parties: [],
  beats: [],
  objectives: [
    {
      id: 'the-number',
      text: 'Make the number.',
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'deliver', account: 'nodules', amount: QUOTA },
    },
  ],
};

function driveDeliver(
  stockpiles: readonly number[],
  account: EconomyAccount = 'nodules',
  decoy = 0
): {
  status: ObjectiveStatus;
  progress: { done: number; of: number };
} {
  const definition: MissionDefinition =
    account === 'nodules'
      ? DELIVER_ONLY
      : {
          ...DELIVER_ONLY,
          objectives: [
            {
              ...DELIVER_ONLY.objectives[0],
              predicate: { kind: 'deliver', account, amount: QUOTA },
            },
          ],
        };
  const runtime = new MissionRuntime(definition);
  const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
  let tick = 0;
  for (const amount of stockpiles) {
    tick += ECHO_TICK_INTERVAL;
    world.tick = tick;
    runtime.tick(world, SINK, banked(tick, amount, account, decoy));
  }
  const objective = runtime.currentView?.objectives.find((o) => o.id === 'the-number');
  assert.ok(objective !== undefined, 'the quota objective is not in the view');
  assert.ok(objective.progress !== undefined, 'the quota carries no counter');
  return { status: objective.status, progress: objective.progress };
}

describe('the number — the deliver predicate, §8', () => {
  it('counts the stockpile the snapshot already carries, and caps at the quota', () => {
    const short = driveDeliver([0, 1200, 3599]);
    assert.equal(short.status, ObjectiveStatus.Pending);
    assert.deepEqual(short.progress, { done: 3599, of: QUOTA });

    const over = driveDeliver([0, QUOTA + 500]);
    assert.equal(over.status, ObjectiveStatus.Met);
    assert.deepEqual(over.progress, { done: QUOTA, of: QUOTA }, 'the register does not over-count');
  });

  it('is met from the tick the stockpile reaches the figure', () => {
    assert.equal(driveDeliver([QUOTA]).status, ObjectiveStatus.Met);
  });

  // docs/mission-intake.md §13: the row is generalised over the economy
  // record's three accounts, not grown a `biomass` sibling, so the third
  // account is not a special case either. The decoy holds the other two
  // accounts past the quota the whole time — a counter that advanced would
  // be reading the wrong stockpile.
  it('reads the biomass account when the band is authored in Biomass', () => {
    const short = driveDeliver([0, 120, 244], 'biomass', QUOTA * 2);
    assert.equal(short.status, ObjectiveStatus.Pending, 'the decoy accounts must not count');
    assert.deepEqual(short.progress, { done: 244, of: QUOTA });

    const rendered = driveDeliver([0, QUOTA], 'biomass', 0);
    assert.equal(rendered.status, ObjectiveStatus.Met);
    assert.deepEqual(rendered.progress, { done: QUOTA, of: QUOTA });
  });

  it('reads the crystal stockpile when the figure is authored in Crystal', () => {
    const short = driveDeliver([QUOTA - 1], 'crystal', QUOTA * 2);
    assert.equal(short.status, ObjectiveStatus.Pending, 'the decoy accounts must not count');
    assert.deepEqual(short.progress, { done: QUOTA - 1, of: QUOTA });

    const over = driveDeliver([QUOTA + 500], 'crystal', 0);
    assert.equal(over.status, ObjectiveStatus.Met);
    assert.deepEqual(over.progress, { done: QUOTA, of: QUOTA }, 'the register does not over-count');
  });

  it('rejects an account the economy record does not carry at type-check', () => {
    // @ts-expect-error — the format's standing rule: a mistyped literal fails
    // `npm run type-check`, not half way through a match.
    const mistyped: MissionPredicate = { kind: 'deliver', account: 'biomas', amount: 245 };
    assert.equal(mistyped.kind, 'deliver');
  });
});

describe('the close assembles — objective readings, §8', () => {
  it('appends the met and unmet lines in authored order beneath the outcome', () => {
    const fixture: MissionDefinition = {
      ...DELIVER_ONLY,
      id: 'test-readings',
      objectives: [
        {
          id: 'made',
          text: 'Make the number.',
          initial: ObjectiveStatus.Pending,
          terminal: true,
          predicate: { kind: 'deliver', account: 'nodules', amount: 100 },
          reading: { met: 'The number is entered.', unmet: 'The shortfall is entered.' },
        },
        {
          id: 'unmade',
          text: 'Stand the watches down.',
          initial: ObjectiveStatus.Pending,
          terminal: true,
          predicate: { kind: 'endure', ticks: T(60) },
          reading: { met: 'Three barges berthed.', unmet: 'The berthing lists are short.' },
        },
      ],
      beats: [{ atTick: ECHO_TICK_INTERVAL * 3, kind: 'resolve', conclusion: true, note: '' }],
    };
    const runtime = new MissionRuntime(fixture);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    let resolution = null;
    for (let pass = 1; pass <= 4 && resolution === null; pass++) {
      world.tick = pass * ECHO_TICK_INTERVAL;
      resolution = runtime.tick(world, SINK, banked(world.tick, 150));
    }
    assert.ok(resolution !== null, 'the fixture never resolved');
    assert.equal(resolution.outcome, MissionOutcome.Partial, 'one column of two filled');
    // The picked lines, in authored order, on their own lines under the
    // outcome's reading — and each objective's line is the one its frozen
    // status earned.
    assert.match(
      resolution.epilogue,
      /\n\nThe number is entered\.\nThe berthing lists are short\.$/
    );
  });
});

describe("the map's acoustic claims, under the real model — §1, §6", () => {
  // The audit listens with a Corvette's ears from the High Road, above the
  // layer; the faces work below it in vein ground. Figures are the literal's
  // own: road depth 700 m, faces at 1,340 m, vein PF 0.45.
  const HYD = 50;
  const VEIN = 0.45;

  it('cannot resolve a face running Overburden from the road', () => {
    // The far face is authored no closer than 1,500 m to the road's beats.
    const across = thermoclineFactor(1340, 700);
    assert.equal(across, 0.3, 'the faces and the road are on opposite sides of the layer');
    const ratio = detectionRatio(68, VEIN * across, 1500, HYD);
    assert.ok(
      ratio < 1,
      `the loudest throttle on the field reads ${ratio.toFixed(2)} at the road — §4's claim fails`
    );
  });

  it('resolves a barge under way above the layer during a pass', () => {
    // A crossing barge shares the road's side of the layer, in the same vein
    // ground, at pass distance.
    const same = thermoclineFactor(850, 700);
    assert.equal(same, 1, 'the crossing puts the barge in the road’s own water');
    const ratio = detectionRatio(25, VEIN * same, 500, HYD);
    assert.ok(
      ratio >= 1,
      `a barge under way past the road reads ${ratio.toFixed(2)} — the audit could never file`
    );
  });
});

describe('the shift, run out — docs/mission-shift-change.md §8, §9', () => {
  it('reads an untouched shift as failed, with both columns unfilled and no minute', () => {
    const map = missionMapById(LEDGER_SHIFT_CHANGE.mapId)!;
    const match = new Match(map, { mission: LEDGER_SHIFT_CHANGE, fauna: false, seed: 17 });
    for (let tick = 0; tick <= T(16, 30); tick++) {
      match.update(STEP_MS);
      if (match.missionOver !== null) break;
    }
    const result = match.missionOver;
    assert.ok(result !== null, 'the whistle never blew');
    const closeS = match.world.tick / SIM.TICK_HZ;
    assert.ok(
      Math.abs(closeS - 16 * 60) <= 1,
      `the shift closed at ${closeS.toFixed(1)}s against the authored 960s`
    );
    assert.equal(result.outcome, MissionOutcome.Lost, 'an untouched shift read as something else');
    assert.match(result.epilogue, /failed shift/);
    // Both unmet readings, in authored order; and no audit minute, because an
    // idle field neither delivers, berths, nor crosses the layer.
    assert.match(result.epilogue, /The shortfall is entered\./);
    assert.match(result.epilogue, /The berthing lists are short\./);
    assert.doesNotMatch(result.epilogue, /audit's minute/);
  });
});
