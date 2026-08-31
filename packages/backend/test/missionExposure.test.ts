/**
 * The Ledger 4 — docs/mission-exposure.md, and the conditional beat it added
 * (#282's row, docs/mission-aptitude.md §13).
 *
 * The firing rule is stated independently of the runtime's own predicate, the
 * `echo-parity.test.ts` manner: the fixture feeds exposure tick by tick and
 * this file does the twenty-second arithmetic itself, so the runtime and the
 * test arrive at the same tick by different sums or one of them is wrong.
 *
 * - **Fires on the tick the tally crosses, not one late** — the warning at
 *   twenty seconds arrives on the mission tick the twentieth second is
 *   entered.
 * - **Fires once.** A spent tally stays spent; feeding another minute of
 *   Classification produces no second warning.
 * - **The free tiers do not fire it.** A mission of Bearing is a mission of
 *   weather.
 * - **The recall follows the warning in its own time**, and both reach the
 *   log through the ordinary say channel.
 *
 * Plus the literal's own claims: the charter seals the array the campaign
 * just handed over, strikes the guns, and an idle survey is read as unpriced
 * — the keystone — with all six gap lines and the tolerance's unspent line
 * assembled beneath it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { LEDGER_EXPOSURE, PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import { MissionRuntime, type MissionCommandSink } from '../src/sim/missions/runtime.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { createSimWorld } from '../src/sim/world.ts';
import type { MissionDefinition, MissionLine } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
/** Mission ticks in one second of wall clock. */
const TICKS_PER_S = SIM.ECHO_HZ;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const WARNING_S = 20;

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

/**
 * One conditional, one rule, nothing else — the warning at twenty with §4's
 * own figures, in the fixture idiom of `missionTolerance.test.ts`.
 */
const WARNING_ONLY: MissionDefinition = {
  ...PROLOGUE_SORROWGATE,
  id: 'test-conditional',
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
    {
      kind: 'say',
      speaker: 'The Division',
      text: 'Twenty are entered.',
      note: 'the fixture rule',
      when: {
        kind: 'tolerance',
        ticks: WARNING_S * SIM.TICK_HZ,
        tier: ResolutionTier.Classification,
      },
    },
  ],
};

/** Drive one mission tick per entry of `tiers`, collecting spoken lines as they arrive. */
function drive(tiers: readonly ResolutionTier[]): { lines: MissionLine[]; ticksFed: number[] } {
  const runtime = new MissionRuntime(WARNING_ONLY);
  const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
  const lines: MissionLine[] = [];
  const ticksFed: number[] = [];
  let tick = 0;
  for (const tier of tiers) {
    tick += ECHO_TICK_INTERVAL;
    world.tick = tick;
    runtime.tick(world, SINK, heardAs(tick, tier));
    ticksFed.push(tick);
    lines.push(...runtime.takeLines());
  }
  return { lines, ticksFed };
}

const held = (tier: ResolutionTier, seconds: number): ResolutionTier[] =>
  Array<ResolutionTier>(seconds * TICKS_PER_S).fill(tier);

describe('a beat fired by a condition rather than a tick — mission-aptitude.md §13, mission-exposure.md §4', () => {
  it('fires on the mission tick the twentieth second is entered, by independent arithmetic', () => {
    // Twenty seconds at the Echo cadence is exactly 20 × TICKS_PER_S mission
    // ticks of Classification: the tally accrues ECHO_TICK_INTERVAL sim ticks
    // per pass, so the threshold is met on pass number 20 × TICKS_PER_S, and
    // the line must arrive on that pass — not one late.
    const passes = WARNING_S * TICKS_PER_S;
    const { lines, ticksFed } = drive(held(ResolutionTier.Classification, WARNING_S + 5));
    assert.equal(lines.length, 1, 'the warning fired other than once');
    assert.equal(
      lines[0]!.tick,
      ticksFed[passes - 1],
      'the warning did not arrive on the pass that entered the twentieth second'
    );
  });

  it('does not fire for a mission spent at Bearing', () => {
    const { lines } = drive(held(ResolutionTier.Bearing, WARNING_S * 3));
    assert.equal(lines.length, 0, 'a mission of weather fired the warning');
  });

  it('accumulates across entries, exactly as the tolerance it reads does', () => {
    const spent = [
      ...held(ResolutionTier.Classification, 10),
      ...held(ResolutionTier.Silent, 30),
      ...held(ResolutionTier.Classification, 10),
    ];
    const { lines } = drive(spent);
    assert.equal(lines.length, 1, 'two ten-second entries did not sum to the threshold');
  });

  it('fires once, and a spent tally stays spent', () => {
    const { lines } = drive(held(ResolutionTier.Track, WARNING_S * 4));
    assert.equal(lines.length, 1);
  });
});

describe('the charter, run out — docs/mission-exposure.md §3, §8', () => {
  it('seals the array it was just handed, and strikes the guns', () => {
    const locked = new Set(LEDGER_EXPOSURE.locks.map((lock) => lock.ability));
    assert.ok(locked.has('activeSonar'), 'a transmission is a signature');
    assert.ok(locked.has('weapons'), 'a deniable survey is an unarmed one');
  });

  it('authors the warning and the recall as conditionals on one tally, ten seconds apart', () => {
    const conditionals = LEDGER_EXPOSURE.conditionalBeats ?? [];
    const ticksOf = (beat: (typeof conditionals)[number]): number =>
      beat.when.kind === 'tolerance' ? beat.when.ticks : NaN;
    assert.ok(
      conditionals.every((beat) => beat.when.kind === 'tolerance'),
      'one ledger fires everything here'
    );
    // One warning row at twenty; the recall is a say and the watch's turn,
    // three rows on one condition at thirty.
    assert.equal(conditionals.filter((b) => ticksOf(b) === 20 * SIM.TICK_HZ).length, 1);
    assert.equal(conditionals.filter((b) => ticksOf(b) === 30 * SIM.TICK_HZ).length, 3);
  });

  it('reads an idle survey as a gap in the model, with every gap assembled beneath it', () => {
    // A survey that never descends "returns" — the muster is on the shelf
    // lane, so the record comes home holding nothing, which is §8's middle
    // reading exactly: the interval does not close, and the page beneath it
    // is six gaps and an unspent tolerance. Lost is reserved for a record
    // that dies below, which an idle run cannot produce.
    const map = missionMapById(LEDGER_EXPOSURE.mapId)!;
    const match = new Match(map, { mission: LEDGER_EXPOSURE, fauna: false, seed: 41 });
    for (let tick = 0; tick <= T(18, 30); tick++) {
      match.update(STEP_MS);
      if (match.missionOver !== null) break;
    }
    const result = match.missionOver;
    assert.ok(result !== null, 'the watch never changed');
    assert.equal(result.outcome, MissionOutcome.Partial, 'the record came home empty');
    assert.match(result.epilogue, /The interval does not close/);
    // The page assembles: the tolerance's unspent line, and all six gaps, the
    // sixth included — the campaign's turn, missed, and filed as missed.
    assert.match(result.epilogue, /never classified/);
    assert.match(result.epilogue, /rendering row was not read/);
    assert.match(result.epilogue, /Point six was not read/);
  });
});
