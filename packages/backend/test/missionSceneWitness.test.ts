import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FOURTH_CLOSURE_CONVOY,
  FOURTH_CLOSURE_PICKET,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  missionBriefing,
  type EchoSnapshot,
} from '@echoes/shared';
import { LEDGER_BAFFLE, ATTENDING_THE_DOME, type MissionLine } from '../src/sim/missions/index.ts';
import { MissionRuntime, type MissionCommandSink } from '../src/sim/missions/runtime.ts';
import type { MissionBeat, MissionDefinition } from '../src/sim/missions/types.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { createSimWorld } from '../src/sim/world.ts';

const ANNOUNCEMENT = 4 * 60 * SIM.TICK_HZ;
const STEP = SIM.TICK_HZ / SIM.ECHO_HZ;
const SINK: MissionCommandSink = {
  applyMove: () => {},
  applyDepth: () => true,
  applySilent: () => {},
  applyPing: () => {},
};
const EMPTY: EchoSnapshot = {
  tick: 0,
  units: [],
  structures: [],
  ordnance: [],
  contacts: [],
  peakSig: 0,
  berths: { used: 0, granted: 0 },
  refits: [],
  nodules: 0,
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

function closure(mission: MissionDefinition) {
  const stamped = mission.beats.filter(
    (beat): beat is MissionBeat & { kind: 'say' } => beat.kind === 'say' && beat.scene !== undefined
  );
  assert.equal(stamped.length, 1, 'only the shared announcement earns a stamp');
  return stamped[0]!;
}

// Isolate the authored line, not a replacement witness condition. The existing
// Baffle/Dome live-match tests exercise the unchanged water and full beat tables.
function play(
  mission: MissionDefinition,
  closeAt: number,
  { complete = false, duplicate = false, conditional = false } = {}
) {
  const line = closure(mission);
  const definition: MissionDefinition = {
    ...mission,
    parties: [],
    regions: [],
    markers: [],
    arrayTag: undefined,
    sweep: undefined,
    runsItsLength: true,
    objectives: [
      {
        id: 'count',
        text: 'The count.',
        initial: ObjectiveStatus.Pending,
        terminal: true,
        predicate: { kind: 'endure', ticks: complete ? 0 : closeAt + STEP },
      },
    ],
    beats: [
      ...(conditional ? [] : [line, ...(duplicate ? [line] : [])]),
      { atTick: closeAt, kind: 'resolve', note: 'Fixture close' },
    ].sort((a, b) => a.atTick - b.atTick) as MissionBeat[],
    conditionalBeats: conditional
      ? [{ ...line, when: { kind: 'endure', ticks: ANNOUNCEMENT } }]
      : [],
  };
  const runtime = new MissionRuntime(definition);
  const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 31);
  const lines: MissionLine[] = [];
  for (let tick = 0; tick <= closeAt; tick += STEP) {
    world.tick = tick;
    const resolution = runtime.tick(world, SINK, { ...EMPTY, tick });
    lines.push(...runtime.takeLines());
    if (resolution) {
      assert.equal(runtime.tick(world, SINK, { ...EMPTY, tick }), null, 'closed once');
      assert.deepEqual(runtime.takeLines(), [], 'closed missions do not speak again');
      return { resolution, lines };
    }
  }
  throw new Error('Fixture did not close');
}

describe('the Fourth closure, heard rather than merely played', () => {
  const pairs = [
    [LEDGER_BAFFLE, ATTENDING_THE_DOME, FOURTH_CLOSURE_CONVOY],
    [ATTENDING_THE_DOME, LEDGER_BAFFLE, FOURTH_CLOSURE_PICKET],
  ] as const;

  it('stamps the same public line at the same authored tick, from different sides', () => {
    assert.equal(closure(LEDGER_BAFFLE).text, closure(ATTENDING_THE_DOME).text);
    for (const [mission, , scene] of pairs) {
      assert.equal(closure(mission).atTick, ANNOUNCEMENT);
      assert.equal(closure(mission).scene, scene);
    }
  });

  for (const [mission, other, scene] of pairs) {
    it(`${mission.id}: abandoning before the announcement produces no record to carry`, () => {
      const match = new Match(missionMapById(mission.mapId)!, {
        mission,
        fauna: false,
        seed: 31,
      });
      const lines: MissionLine[] = [];
      while (match.world.tick < ANNOUNCEMENT - STEP) {
        match.update(1000 / SIM.TICK_HZ);
        lines.push(...match.takeMissionLines());
      }
      assert.equal(match.missionOver, null, 'an abandoned run has no result to persist');
      assert.ok(lines.every((line) => line.text !== closure(mission).text));
      const replay = play(mission, ANNOUNCEMENT - STEP, { complete: true });
      assert.deepEqual(replay.resolution.scenes, [], 'a later completion inherits no witness');
    });

    it(`${mission.id}: an unseen completed run leaves the other briefing unchanged`, () => {
      const { resolution, lines } = play(mission, ANNOUNCEMENT - STEP, { complete: true });
      assert.equal(resolution.outcome, MissionOutcome.Complete);
      assert.deepEqual(lines, []);
      assert.deepEqual(resolution.scenes, []);
      assert.deepEqual(missionBriefing(other, new Set(resolution.scenes)), other.briefing);
    });

    it(`${mission.id}: the fired line earns recognition even on a lost run`, () => {
      const { resolution, lines } = play(mission, ANNOUNCEMENT);
      assert.equal(resolution.outcome, MissionOutcome.Lost);
      assert.deepEqual(
        lines.map((line) => line.text),
        [closure(mission).text]
      );
      assert.equal(lines[0]!.tick, ANNOUNCEMENT);
      assert.deepEqual(resolution.scenes, [scene]);
      assert.notDeepEqual(missionBriefing(other, new Set(resolution.scenes)), other.briefing);
      assert.deepEqual(missionBriefing(mission, new Set(resolution.scenes)), mission.briefing);
    });

    it(`${mission.id}: duplicate stamps and replay never multiply the encounter`, () => {
      const first = play(mission, ANNOUNCEMENT + STEP, { duplicate: true });
      const replay = play(mission, ANNOUNCEMENT + STEP, { duplicate: true });
      assert.equal(first.lines.length, 2, 'two fixture lines actually fired');
      assert.deepEqual(first.resolution.scenes, [scene]);
      assert.deepEqual(replay, first);
      const history = new Set([...first.resolution.scenes, ...replay.resolution.scenes]);
      assert.deepEqual([...history], [scene]);
    });

    it(`${mission.id}: a conditional line stamps only if its condition fires`, () => {
      const unseen = play(mission, ANNOUNCEMENT - STEP, { conditional: true });
      assert.deepEqual(unseen.lines, []);
      assert.deepEqual(unseen.resolution.scenes, []);
      const seen = play(mission, ANNOUNCEMENT + STEP, { conditional: true });
      assert.equal(seen.lines.length, 1);
      assert.deepEqual(seen.resolution.scenes, [scene]);
    });
  }
});
