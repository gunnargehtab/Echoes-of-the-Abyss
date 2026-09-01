/**
 * The Ledger 5 — docs/mission-tolerance.md, and the two rules its choice
 * stands on. (`missionTolerance.test.ts` is the tolerance *predicate*'s
 * suite; this file is the mission named after the same procedure.)
 *
 * - **The roof is the ledger** (§4, §11): the root aperture's water admits
 *   nothing above 1,900 m, so the 2D delivery region is depth-honest — and
 *   the crush arithmetic the writ reads out is the shared model's own figure.
 * - **A beat never fails an objective the player has met** — the runtime's
 *   monotonicity invariant, held against `objective` beats, which is what
 *   keeps a sealed aperture sealed when the spent barge wanders.
 * - **A fired choice retires its group** (types.ts, `choiceGroup`): rows
 *   sharing one condition fire together, and the mirror's rows are retired on
 *   the same pass, never to fire.
 * - **An idle writ signs nothing** — the seventeen-minute run closes Lost,
 *   with both apertures written down beneath the register's longest entry
 *   since Kell.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  crushAttritionPerSecond,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { LEDGER_TOLERANCE, PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import { MissionRuntime, type MissionCommandSink } from '../src/sim/missions/runtime.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { createSimWorld } from '../src/sim/world.ts';
import type { MissionDefinition, MissionLine } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

function withNodules(tick: number, nodules: number): EchoSnapshot {
  return {
    tick,
    units: [],
    structures: [],
    ordnance: [],
    contacts: [],
    peakSig: 0,
    nodules,
    crystal: 0,
    biomass: 0,
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

const SINK: MissionCommandSink = {
  applyMove: () => {},
  applyDepth: () => true,
  applySilent: () => {},
  applyPing: () => {},
};

describe('the ledger is terrain — docs/mission-tolerance.md §4, §11', () => {
  it('admits nothing to the root aperture that has not crossed the line', () => {
    const terrain = terrainFor(missionMapById(LEDGER_TOLERANCE.mapId)!);
    const root = LEDGER_TOLERANCE.regions.find((region) => region.id === 'root-aperture')!;
    const x = root.x + root.widthM / 2;
    const y = root.y + root.heightM / 2;
    assert.ok(!terrain.admits(x, y, 1000), 'the aperture was reachable above the roof');
    assert.ok(!terrain.admits(x, y, 1850), 'the roof stands at nineteen hundred, not the line');
    assert.ok(terrain.admits(x, y, 2000), 'the delivery water itself does not admit the barge');
  });

  it("states the writ's arithmetic with the model's own figure", () => {
    // §12: "a hull spends four points a second of what does not heal" — a
    // PR-2 hull one band over its rating, per the shared model.
    assert.equal(crushAttritionPerSecond(2, 2000), 4);
    assert.equal(crushAttritionPerSecond(2, 1750), 0, 'above the line the ledger is shut');
  });
});

describe('the choice, as rules — types.ts `choiceGroup`, and the Met guard', () => {
  it('fires co-conditioned rows together, then retires the rest of the group for good', () => {
    const fixture: MissionDefinition = {
      ...PROLOGUE_SORROWGATE,
      id: 'test-choice-group',
      arrayTag: undefined,
      sweep: undefined,
      lifts: undefined,
      regions: [],
      markers: [],
      parties: [],
      beats: [],
      objectives: [
        {
          id: 'stand',
          text: 'Stand the watch.',
          initial: ObjectiveStatus.Pending,
          predicate: { kind: 'endure', ticks: T(60) },
        },
      ],
      conditionalBeats: [
        // Two rows on one condition, sharing the group: both fire, together,
        // before the group closes behind them.
        {
          kind: 'say',
          speaker: 'The record',
          text: 'The first entered.',
          note: '',
          when: { kind: 'deliver', nodules: 50 },
          choiceGroup: 'the-choice',
        },
        {
          kind: 'say',
          speaker: 'The record',
          text: 'The second entered.',
          note: '',
          when: { kind: 'deliver', nodules: 50 },
          choiceGroup: 'the-choice',
        },
        // The mirror: a different condition that will come true two seconds
        // in, retired before it can — never to fire.
        {
          kind: 'say',
          speaker: 'The record',
          text: 'The mirror entered.',
          note: '',
          when: { kind: 'endure', ticks: 2 * SIM.TICK_HZ },
          choiceGroup: 'the-choice',
        },
      ],
    };
    const runtime = new MissionRuntime(fixture);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    const lines: MissionLine[] = [];
    for (let pass = 1; pass <= 4 * SIM.ECHO_HZ; pass++) {
      world.tick = pass * ECHO_TICK_INTERVAL;
      runtime.tick(world, SINK, withNodules(world.tick, 100));
      lines.push(...runtime.takeLines());
    }
    assert.deepEqual(
      lines.map((line) => line.text),
      ['The first entered.', 'The second entered.'],
      'the co-conditioned rows fire together and the retired mirror stays silent'
    );
  });

  it('never fails an objective the player has met', () => {
    const fixture: MissionDefinition = {
      ...PROLOGUE_SORROWGATE,
      id: 'test-met-guard',
      arrayTag: undefined,
      sweep: undefined,
      lifts: undefined,
      regions: [],
      markers: [],
      parties: [],
      beats: [],
      objectives: [
        {
          id: 'sealed',
          text: 'Set the casting.',
          initial: ObjectiveStatus.Pending,
          predicate: { kind: 'deliver', nodules: 50 },
        },
        {
          id: 'stand',
          text: 'Stand the watch.',
          initial: ObjectiveStatus.Pending,
          predicate: { kind: 'endure', ticks: T(60) },
        },
      ],
      conditionalBeats: [
        {
          // Holds two seconds after 'sealed' has already latched Met.
          kind: 'objective',
          id: 'sealed',
          status: ObjectiveStatus.Failed,
          note: '',
          when: { kind: 'endure', ticks: 2 * SIM.TICK_HZ },
        },
      ],
    };
    const runtime = new MissionRuntime(fixture);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    for (let pass = 1; pass <= 4 * SIM.ECHO_HZ; pass++) {
      world.tick = pass * ECHO_TICK_INTERVAL;
      runtime.tick(world, SINK, withNodules(world.tick, 100));
    }
    const sealed = runtime.currentView?.objectives.find((o) => o.id === 'sealed');
    assert.equal(
      sealed?.status,
      ObjectiveStatus.Met,
      'a beat rewrote history the player had already made'
    );
  });
});

describe('the writ, run out — docs/mission-tolerance.md §8', () => {
  it('reads an idle writ as no seal set, both apertures written down', () => {
    const map = missionMapById(LEDGER_TOLERANCE.mapId)!;
    const match = new Match(map, { mission: LEDGER_TOLERANCE, fauna: false, seed: 53 });
    for (let tick = 0; tick <= T(17, 30); tick++) {
      match.update(STEP_MS);
      if (match.missionOver !== null) break;
    }
    const result = match.missionOver;
    assert.ok(result !== null, 'the water never stopped');
    assert.equal(result.outcome, MissionOutcome.Lost, 'an unsigned order read as something else');
    assert.match(result.epilogue, /longest entry since Kell/);
    assert.match(result.epilogue, /The root is written down/);
    assert.match(result.epilogue, /The section is written down/);
  });
});
