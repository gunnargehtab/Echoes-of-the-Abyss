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
 * just handed over, strikes the guns, and an idle survey reads as a gap in
 * the model, with all six gap lines and the tolerance's unspent line
 * assembled beneath it. A survey that stays below reads as unpriced — the
 * keystone — and two hulls on the lane are the record home, whichever of the
 * three heard the points (#1198).
 *
 * The rim pack holds §5's 1,700 m for all seventy-five seconds of the
 * telegraph, under the layer, and is neither holed nor bites on the way. The
 * watch's guns open on it at 17:03, but a driven creature's hull does not give
 * to a shell (`isDriven`, #349), and the drive leaves it no target to bite
 * (`runtime.ts`, `holdCommitments`; #1199).
 *
 * §12's four voices are the literal's own lines, character for character: the
 * doc is the source, and point six's entry drifted from it unread (#1200).
 *
 * And the ground §11 draws in shapes since #1144: every authored point, leg
 * and shelf-lane cell on the ground it stood on in rectangles, read off the
 * painted cells rather than off a region's outline.
 */

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defineQuery } from 'bitecs';

import {
  Biome,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  faunaStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Fauna, Health, Owner, Position } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { FIRST_TRENCH_MARGIN, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { LEDGER_EXPOSURE, PROLOGUE_SORROWGATE, inRegion } from '../src/sim/missions/index.ts';
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
    berths: { used: 0, granted: 0 },
    refits: [],
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

  it('reads a survey that stays below as unpriced, however many points it entered (#1198)', () => {
    // §8: the return is read where the hulls are. The issue's descent: every
    // hull ordered under the layer at 00:00 enters four points in twelve
    // seconds, and a latched return closed that Complete at 00:12 with the
    // whole survey still below.
    const run = survey('below');
    assert.ok(run.enteredAtTick !== null, 'the survey never entered four points');
    assert.equal(run.outcome, MissionOutcome.Lost, 'a record that stayed below came home');
    assert.ok(run.closedAtTick >= T(18), 'the mission closed before the change');
    assert.equal(run.statusAtClose('the-readings'), ObjectiveStatus.Met);
    assert.equal(run.statusAtClose('the-return'), ObjectiveStatus.Pending);
    assert.match(run.epilogue, /No record returns/);
  });

  it('closes Complete on the pass a survey that entered four points is home in duplicate', () => {
    // The positive control: the same descent, sent home once the fourth
    // point is entered. It cannot close on that pass, with the hulls below,
    // and it closes the first pass two of them are back on the lane.
    const run = survey('home');
    assert.ok(run.enteredAtTick !== null, 'the survey never entered four points');
    assert.equal(run.outcome, MissionOutcome.Complete, 'the record came home and was not read');
    assert.ok(run.closedAtTick > run.enteredAtTick, 'it closed with the survey below');
    assert.ok(run.closedAtTick < T(18), 'the record home did not close the interval');
    assert.equal(run.statusAtClose('the-return'), ObjectiveStatus.Met);
    assert.ok(run.onLaneAtClose >= 2, 'it closed with fewer than two hulls home');
  });

  it('counts any two hulls on the lane as the record home, whichever heard the points', () => {
    // §8 and §12 count hulls home, and §6 counts the readings for the whole
    // survey, so two hulls held at the muster are the duplicate while one
    // reads below. The interval closes on that hull's fourth entry, with it
    // still off the lane — the call #1198 took, pinned so a change argues with it.
    const run = survey('scout');
    assert.equal(run.outcome, MissionOutcome.Complete, 'two hulls home were not the record home');
    assert.equal(run.closedAtTick, run.enteredAtTick, 'the interval waited for the scout');
    assert.equal(run.statusAtClose('the-readings'), ObjectiveStatus.Met);
    assert.equal(run.onLaneAtClose, 2, 'the scout came home, or a held hull left');
  });
});

/**
 * §8's return, played over the issue's run (#1198): hulls ordered to y 2,000
 * at 1,500 m on the first snapshot. `below` sends all three and leaves them,
 * `home` sends them back to the lane on the pass the fourth point is entered,
 * and `scout` sends one and holds two at the muster.
 */
function survey(plan: 'below' | 'home' | 'scout') {
  const map = missionMapById(LEDGER_EXPOSURE.mapId)!;
  const match = new Match(map, { mission: LEDGER_EXPOSURE, fauna: false, seed: 77 });
  const player = LEDGER_EXPOSURE.playerSlot;
  const lane = LEDGER_EXPOSURE.regions.find((region) => region.id === 'shelf-lane')!;
  const send = (ids: number[], y: number, depthM: number) =>
    ids.forEach((id, i) => {
      match.orderMove(player, id, 2400 + i * 100, y);
      match.orderDepth(player, id, depthM);
    });
  let ids: number[] = [];
  let last: EchoSnapshot | undefined;
  let enteredAtTick: number | null = null;
  for (let tick = 0; tick <= T(18, 30); tick++) {
    const own = match.update(STEP_MS)?.get(player) as EchoSnapshot | undefined;
    last = own ?? last;
    if (own !== undefined && ids.length === 0) {
      ids = own.units.map((u) => u.id).sort((a, b) => a - b);
      send(plan === 'scout' ? ids.slice(0, 1) : ids, 2000, 1500);
    }
    const view = match.takeMissionView();
    const readings = view?.objectives.find((o) => o.id === 'the-readings');
    if (enteredAtTick === null && readings?.status === ObjectiveStatus.Met) {
      enteredAtTick = match.world.tick;
      // Home to the muster's own water: the shelf lane, above the layer.
      if (plan === 'home') send(ids, 375, 900);
    }
    if (match.missionOver !== null) break;
  }
  const over = match.missionOver;
  assert.ok(over !== null, 'the watch never changed');
  return {
    outcome: over.outcome,
    epilogue: over.epilogue,
    enteredAtTick,
    closedAtTick: match.world.tick,
    onLaneAtClose: (last?.units ?? []).filter((u) => inRegion(lane, u.x, u.y)).length,
    statusAtClose: (id: string) => over.objectives.find((o) => o.id === id)?.status,
  };
}

describe('the voices, as docs/mission-exposure.md §12 writes them (#1200)', () => {
  it('is §12’s text, and not a paraphrase of it', () => {
    // Point six's entry lost §12's "at us" in the commit that wrote both, and
    // no test held Exposure's §12 to the literal, as one holds Sorrowgate's.
    // The Sorrowgate idiom (missionRuntime.test.ts): pull the subsection's
    // block quotes in order and hold each to the line the literal speaks.
    const doc = readFileSync(new URL('../../../docs/mission-exposure.md', import.meta.url), 'utf8');
    // Bounded at the rule before §13, so a block quote there cannot drift in.
    const section = doc.split('### The voices on the channel')[1]?.split('\n---')[0];
    assert.ok(section !== undefined, '§12 no longer has the subsection this reads');
    const quoted = [...section.matchAll(/(?:^> .*\n)+/gm)].map((match) =>
      match[0]
        .split('\n')
        .filter((line) => line.startsWith('> '))
        .map((line) => line.slice(2).trim())
        .join(' ')
    );
    const opening = LEDGER_EXPOSURE.beats.find((beat) => beat.kind === 'say');
    assert.ok(opening?.kind === 'say', 'Tull no longer speaks at 01:00');
    const pointSix = LEDGER_EXPOSURE.parties
      .flatMap((party) => party.emitters ?? [])
      .find((emitter) => emitter.tag === 'point-six');
    assert.ok(pointSix?.reading !== undefined, 'point six no longer carries a reading');
    const [warning, recall] = (LEDGER_EXPOSURE.conditionalBeats ?? []).filter(
      (beat) => beat.kind === 'say'
    );
    assert.ok(warning?.kind === 'say' && recall?.kind === 'say', 'the tally no longer speaks');
    // §12's order: Tull at 01:00, the sixth point, the guidance at twenty
    // seconds, the recall at thirty. No slice, so a fifth quote with no line
    // behind it fails as loudly as a drifted one.
    assert.deepEqual(
      quoted,
      [opening.text, pointSix.reading.entered, warning.text, recall.text],
      '§12 and the literal have drifted — the doc is the source, so the literal is wrong'
    );
  });
});

describe('the rim pack, as docs/mission-exposure.md §5 drives it (#1199)', () => {
  const pack = LEDGER_EXPOSURE.beats.flatMap((beat) => (beat.kind === 'creature' ? [beat] : []));
  const change = LEDGER_EXPOSURE.beats.find((beat) => beat.kind === 'resolve')!.atTick;

  it("drives every hound at 1,700 m rather than at the species' own, to the change", () => {
    // The trap `types.ts` names: a drive without a depth holds the species'
    // working depth, and a Draymaw's is 900 m, above the layer.
    assert.equal(faunaStatsFor(FaunaSpecies.Draymaw).workingDepthM, 900);
    assert.equal(pack.length, 3, '§5: one pack');
    for (const beat of pack) {
      assert.equal(beat.species, FaunaSpecies.Draymaw);
      assert.equal(beat.spawnAt?.depthM, 1700, `${beat.tag}, spawned on the rim`);
      assert.equal(beat.driveTo.depthM, 1700, `${beat.tag}, and held there`);
      assert.equal(change - beat.atTick, 75 * SIM.TICK_HZ, '§8: seventy-five seconds of warning');
      assert.equal(beat.untilTick, change, `${beat.tag}, driven to the change`);
      assert.equal(beat.loud, true, '§8: the telegraph');
    }
  });

  it('holds the rim under the layer to the whistle, and is neither holed nor bites', () => {
    // An idle run, read every five seconds of the seventy-five. Before #1199
    // the pack climbed to 900 m and cleared the layer's duct at 17:35; held at
    // 1,700 m but released at 17:45, it fought the watch to the change. The
    // watch fires on the driven pack either way, so hull is what is asked.
    const map = missionMapById(LEDGER_EXPOSURE.mapId)!;
    const match = new Match(map, { mission: LEDGER_EXPOSURE, fauna: false, seed: 77 });
    const hounds = defineQuery([Fauna, Position, Health]);
    const watch = defineQuery([Owner, Health]);
    const hpOf = (eids: Iterable<number>) => [...eids].map((eid) => Health.hp[eid]!);
    const watchHulls = () => [...watch(match.world)].filter((eid) => Owner.slot[eid] === 2);
    let samples = 0;
    let houndHp: number[] = [];
    let watchHp: number[] = [];
    for (let tick = 0; tick <= T(18, 30) && match.missionOver === null; tick++) {
      match.update(STEP_MS);
      match.takeMissionView();
      const since = match.world.tick - T(16, 45);
      if (since <= 0 || since % (5 * SIM.TICK_HZ) !== 0) continue;
      const alive = [...hounds(match.world)];
      const at = `${(since / SIM.TICK_HZ).toFixed(0)} s into the telegraph`;
      assert.equal(alive.length, 3, `every hound alive ${at}`);
      for (const eid of alive) assert.equal(Position.depth[eid], 1700, `a hound's depth ${at}`);
      if (samples++ === 0) {
        houndHp = hpOf(alive);
        watchHp = hpOf(watchHulls());
      }
    }
    assert.equal(match.world.tick, change, 'the change closed the mission');
    assert.equal(samples, 15, 'from 16:50 to the change');
    assert.equal(watchHp.length, 2, '§5: the watch is two hulls');
    assert.deepEqual(hpOf(hounds(match.world)), houndHp, 'the watch holed a hound');
    assert.deepEqual(hpOf(watchHulls()), watchHp, 'the pack bit the watch');
  });
});

describe('The Western Margin, as docs/mission-exposure.md §11 draws it (#1144)', () => {
  // The map is drawn in shapes since #1144, and a reshape is new content,
  // never a lever: every place the mission seats, sounds or drives a hull
  // stands on the ground it stood on in rectangles. Asked of the painted
  // cells, because the cell is what a hull's floor and PF are read from.
  const ground = terrainFor(FIRST_TRENCH_MARGIN);
  const cellM = FIRST_TRENCH_MARGIN.cellM;
  const at = (x: number, y: number) => [
    ground.biomeAt(x, y),
    ground.floorAt(x, y),
    ground.ceilingAt(x, y),
  ];
  const REGIONS = {
    shelf: [Biome.OpenWater, 1050, 0],
    listening: [Biome.OpenWater, 1600, 0],
    worked: [Biome.AbyssalTrench, 1750, 0],
  } as const;
  const watch = LEDGER_EXPOSURE.parties.find((party) =>
    party.units.some((unit) => unit.tag === 'watch-a')
  )!;
  const pathOf = (tag: string): { x: number; y: number }[] => {
    const start = watch.units.find((unit) => unit.tag === tag)!;
    return [
      { x: start.x, y: start.y },
      ...LEDGER_EXPOSURE.beats.flatMap((beat) =>
        beat.kind === 'move' && beat.tag === tag ? [{ x: beat.x, y: beat.y }] : []
      ),
    ];
  };
  const turnOf = (tag: string): { x: number; y: number } => {
    const turn = (LEDGER_EXPOSURE.conditionalBeats ?? []).find(
      (beat) => beat.kind === 'move' && beat.tag === tag
    );
    assert.ok(turn !== undefined && turn.kind === 'move', `${tag} turns at the recall`);
    return { x: turn.x, y: turn.y };
  };
  /** Every point of a leg, `stepM` apart, ends included. */
  const along = (a: { x: number; y: number }, b: { x: number; y: number }, stepM: number) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / stepM));
    return Array.from({ length: n + 1 }, (_, i) => ({
      x: a.x + ((b.x - a.x) * i) / n,
      y: a.y + ((b.y - a.y) * i) / n,
    }));
  };

  it('stands every authored point on the ground §11 names for it', () => {
    // Read off the literal, so a point exposure.ts moves is asked of the
    // ground it moved to; the counts keep a point from dropping out unasked.
    const stands: [string, number, number, keyof typeof REGIONS][] = [];
    for (const spawn of FIRST_TRENCH_MARGIN.spawns) {
      stands.push(['the spawn, on the shelf lane', spawn.x, spawn.y, 'shelf']);
    }
    const survey = LEDGER_EXPOSURE.parties.find(
      (party) => party.slot === LEDGER_EXPOSURE.playerSlot
    )!;
    for (const unit of survey.units)
      stands.push([`${unit.tag}, at the muster`, unit.x, unit.y, 'shelf']);
    for (const unit of watch.units)
      stands.push([`${unit.tag}, on its beat`, unit.x, unit.y, 'worked']);
    const emitters = LEDGER_EXPOSURE.parties.flatMap((party) => party.emitters ?? []);
    for (const point of emitters) stands.push([point.tag, point.x, point.y, 'worked']);
    // §7: the watch turns onto the listening ground, the only water the
    // survey can have been classified in.
    for (const beat of LEDGER_EXPOSURE.conditionalBeats ?? []) {
      if (beat.kind === 'move')
        stands.push([`${beat.tag}, turned at the recall`, beat.x, beat.y, 'listening']);
    }
    // §5: the rim pack, risen and driven along the rim.
    for (const beat of LEDGER_EXPOSURE.beats) {
      if (beat.kind !== 'creature') continue;
      if (beat.spawnAt !== undefined) {
        stands.push([`${beat.tag}, rising`, beat.spawnAt.x, beat.spawnAt.y, 'worked']);
      }
      stands.push([`${beat.tag}, driven to`, beat.driveTo.x, beat.driveTo.y, 'worked']);
    }
    // One spawn, three survey hulls, two watch hulls, six points, two turns,
    // and three hounds risen and driven: §11, §2, §5, §6, §7.
    assert.equal(stands.length, 1 + 3 + 2 + 6 + 2 + 6, 'every authored point is asked');
    for (const [what, x, y, region] of stands) {
      assert.deepEqual(at(x, y), REGIONS[region], `${what} at ${x},${y} stands in ${region}`);
    }
    // §7: the watch walks the worked ground's length, every waypoint on it.
    for (const tag of ['watch-a', 'watch-b']) {
      for (const { x, y } of pathOf(tag)) {
        assert.deepEqual(at(x, y), REGIONS.worked, `${tag}'s beat at ${x},${y} is on the rim`);
      }
    }
  });

  it('keeps every cell of the shelf lane the return is counted in on the shelf', () => {
    const lane = LEDGER_EXPOSURE.regions.find((region) => region.id === 'shelf-lane')!;
    let cells = 0;
    for (let y = lane.y + cellM / 2; y < lane.y + lane.heightM; y += cellM) {
      for (let x = lane.x + cellM / 2; x < lane.x + lane.widthM; x += cellM) {
        assert.deepEqual(at(x, y), REGIONS.shelf, `the shelf lane's cell at ${x},${y}`);
        cells++;
      }
    }
    assert.equal(cells, 60, 'the whole lane, every cell centre');
  });

  it('walks the beat, the turn from anywhere along it, and the pack over the ground they crossed in rectangles', () => {
    // Below the rim's edge is the worked ground and above it the listening
    // ground, which is where every one of these legs ran when the regions
    // were bands. The turn fires wherever the tally finds the watch, so it is
    // walked from every 25 m of the beat.
    const rim = 2250;
    const expect = (what: string, p: { x: number; y: number }) =>
      assert.deepEqual(
        at(p.x, p.y),
        p.y >= rim ? REGIONS.worked : REGIONS.listening,
        `${what} at ${Math.round(p.x)},${Math.round(p.y)}`
      );
    for (const tag of ['watch-a', 'watch-b']) {
      const path = pathOf(tag);
      const turn = turnOf(tag);
      for (let i = 1; i < path.length; i++) {
        for (const p of along(path[i - 1]!, path[i]!, 10)) expect(`${tag}'s beat`, p);
        for (const from of along(path[i - 1]!, path[i]!, 25)) {
          for (const p of along(from, turn, 10)) expect(`${tag}'s turn`, p);
        }
      }
    }
    let packLegs = 0;
    for (const beat of LEDGER_EXPOSURE.beats) {
      if (beat.kind !== 'creature' || beat.spawnAt === undefined) continue;
      for (const p of along(beat.spawnAt, beat.driveTo, 10)) expect(beat.tag, p);
      packLegs++;
    }
    assert.equal(packLegs, 3, 'every hound of the rim pack, risen and driven');
  });

  it('steps the floor down every column from the shelf lane through the slope to the rim', () => {
    // §11: the shelf lane above the layer, the slope through it, the
    // listening ground below it and the rim at 1,750 m, fifty metres above
    // the crush ledger. The slope's top row runs the map's whole width, so
    // every way down from the shelf lane crosses it.
    const rows = FIRST_TRENCH_MARGIN.heightM / cellM;
    for (let x = cellM / 2; x < FIRST_TRENCH_MARGIN.widthM; x += cellM) {
      const floors = Array.from({ length: rows }, (_, r) => ground.floorAt(x, (r + 0.5) * cellM));
      assert.equal(floors[2], 1050, `the shelf lane's last row at x ${x}`);
      assert.equal(floors[3], 1450, `the slope's top row at x ${x}`);
      assert.equal(floors[8], 1600, `the listening ground along the rim at x ${x}`);
      for (let r = 9; r < rows; r++) {
        assert.deepEqual(at(x, (r + 0.5) * cellM), REGIONS.worked, `the worked ground at x ${x}`);
      }
      for (let r = 1; r < rows; r++) {
        assert.ok(floors[r]! >= floors[r - 1]!, `the floor rises southward at ${x}, row ${r}`);
      }
    }
  });

  it("keeps the Hollow the only masked water, on the listening ground's edge", () => {
    const veins: string[] = [];
    for (let y = cellM / 2; y < FIRST_TRENCH_MARGIN.heightM; y += cellM) {
      for (let x = cellM / 2; x < FIRST_TRENCH_MARGIN.widthM; x += cellM) {
        if (ground.biomeAt(x, y) === Biome.ThermalVein) veins.push(`${x},${y}`);
      }
    }
    assert.deepEqual(veins, ['875,1625'], 'one vent pocket, and nothing else masked');
    assert.deepEqual(at(875, 1625), [Biome.ThermalVein, 1600, 0]);
    const neighbours = [
      [875, 1625 - cellM],
      [875, 1625 + cellM],
      [875 - cellM, 1625],
      [875 + cellM, 1625],
    ].map(([x, y]) => at(x!, y!));
    const listening = neighbours.filter((cell) => cell[1] === 1600).length;
    assert.ok(listening > 0 && listening < 4, "the Hollow sits on the listening ground's edge");
  });
});
