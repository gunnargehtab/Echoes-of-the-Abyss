/**
 * The Second Chord 2, running — docs/mission-standing-wave.md, against a live
 * match.
 *
 * `missions.test.ts` reads the literal and holds every mission to the format's
 * own rules; `standingWave.test.ts` holds the corridor to the doc that
 * specifies it in any water. This file holds *this* mission to its document,
 * and five claims are worth the simulated minutes each:
 *
 * - **The economy is a clock the player reads** (§4): 1,530 nodules and three
 *   Spires' worth of crystal at 00:00, and a third node paid for by the stipend.
 * - **A site needs the works beside it, and sits on the floor** (§8, §13) —
 *   the two findings the transcription made about the build path, as rules.
 * - **The odd node is the teaching beat** (§4, §12): one voice reads as one
 *   voice, Kalliso says so once, and the interval reads as held when it is.
 * - **Adze decides by the corridor and not by the clock** (§6, §9): a
 *   standing corridor turns the column for the Seam, and no corridor walks it
 *   into the Gallery by 17:30.
 * - **§8's three results are three results**, and the withdrawal is what
 *   separates the first two — a corridor with the works still in it is "closed
 *   and the works are not clear", read at 18:00 and not before.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Faction,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  STANDING_WAVE,
  StructureKind,
  structureStatsFor,
  type EchoSnapshot,
  type MissionView,
} from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { CHORD_STANDING_WAVE, type MissionLine } from '../src/sim/missions/index.ts';
import { Health, Owner, Position, Unit } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = CHORD_STANDING_WAVE.playerSlot;
const COLUMN = 2;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;
const SPIRE = structureStatsFor(StructureKind.SoundingSpire);

/** §11 — a wall-to-wall line just north of the narrows, inside the buildable band. */
const WEST_NODE = { x: 2050, y: 1500 };
const EAST_NODE = { x: 2950, y: 1500 };
/** Where a corvette stands to site a node: inside 400 m of it, outside the line's cell. */
const WEST_WORKS = { x: 2050, y: 1350 };
const EAST_WORKS = { x: 2950, y: 1350 };
/** §11 — the Gallery, where the six are counted. */
const HOME = { x: 2500, y: 250 };

interface Run {
  outcome: MissionOutcome;
  epilogue: string;
  lines: string[];
  resolvedAtTick: number;
  /** The panel as the player last saw it. */
  view: MissionView | null;
  spoken: MissionLine[];
  /** The column's leading hull, wherever it ended. */
  domeY: number;
  /** Highest y the dome reached — how far south it went back, if it turned. */
  domeYMax: number;
  survivors: number;
}

type Drive = (
  match: Match,
  tick: number,
  byTag: Map<string, number>,
  own: EchoSnapshot | undefined
) => void;

/**
 * Drive the works for as long as it takes, or until the Ninth reads the Fifth.
 *
 * Hulls are matched to their authored tags by seated position, as
 * `missionAptitude.test.ts` does. The column's dome is found by slot, since
 * a scripted party's tags are the runtime's own.
 */
function play(drive: Drive, untilTick = T(18, 10)): Run {
  const map = missionMapById(CHORD_STANDING_WAVE.mapId)!;
  const match = new Match(map, { mission: CHORD_STANDING_WAVE, fauna: false, seed: 7 });
  const party = CHORD_STANDING_WAVE.parties.find((p) => p.slot === PLAYER)!;
  const byTag = new Map<string, number>();
  let dome = 0;
  let domeYMax = 0;
  let survivors = 0;
  let lastView: MissionView | null = null;
  const spoken: MissionLine[] = [];

  for (let tick = 0; tick <= untilTick; tick++) {
    const own = match.update(STEP_MS)?.get(PLAYER) as EchoSnapshot | undefined;
    if (own !== undefined) {
      survivors = own.units.length;
      if (byTag.size === 0) {
        for (const unit of party.units) {
          const seated = own.units.find(
            (u) => Math.hypot(u.x - unit.x, u.y - unit.y) < 1 && !byTag.has(unit.tag)
          );
          if (seated !== undefined) byTag.set(unit.tag, seated.id);
        }
        for (let eid = 0; eid <= match.world.maxEid; eid++) {
          if (!hasComponent(match.world, Unit, eid) || Owner.slot[eid] !== COLUMN) continue;
          // The dome leads the block by a hundred metres (§5's table).
          if (dome === 0 || Position.y[eid]! < Position.y[dome]!) dome = eid;
        }
      }
      if (dome !== 0 && hasComponent(match.world, Position, dome)) {
        domeYMax = Math.max(domeYMax, Position.y[dome]!);
      }
    }
    if (byTag.size === party.units.length) drive(match, tick, byTag, own);
    lastView = match.takeMissionView() ?? lastView;
    spoken.push(...match.takeMissionLines());
    if (match.missionOver !== null) break;
  }

  const over = match.missionOver;
  assert.ok(over !== null, 'the Ninth never read the Fifth');
  const [reading, ...rest] = over.epilogue.split('\n');
  return {
    outcome: over.outcome,
    epilogue: reading ?? '',
    lines: rest.filter((line) => line.trim().length > 0),
    resolvedAtTick: match.world.tick,
    view: lastView,
    spoken,
    domeY: dome !== 0 && hasComponent(match.world, Position, dome) ? Position.y[dome]! : NaN,
    domeYMax,
    survivors,
  };
}

/** A drive that sites the two nodes with two corvettes, then brings everybody home once the line stands. */
function closeTheFifth(options: { thirdVoice?: boolean; stayInIt?: boolean } = {}): Drive {
  let sent = false;
  let sited = 0;
  let third = false;
  let home = false;
  return (match, tick, byTag, own) => {
    if (!sent) {
      sent = true;
      match.orderMove(PLAYER, byTag.get('corvette-one')!, WEST_WORKS.x, WEST_WORKS.y);
      match.orderMove(PLAYER, byTag.get('corvette-two')!, EAST_WORKS.x, EAST_WORKS.y);
      return;
    }
    if (own === undefined) return;
    // Site each node the tick its corvette is close enough to.
    if (sited < 2) {
      if (match.build(PLAYER, StructureKind.SoundingSpire, WEST_NODE.x, WEST_NODE.y)) sited++;
      if (match.build(PLAYER, StructureKind.SoundingSpire, EAST_NODE.x, EAST_NODE.y)) sited++;
      return;
    }
    const nodes = own.structures.filter((s) => s.kind === StructureKind.SoundingSpire);
    const standing = nodes.filter((s) => s.buildProgress >= 1).length;
    if (options.thirdVoice === true && !third && standing >= 2) {
      // §4 — the third costs twelve and a half minutes of stipend. Sited from
      // the west corvette's station, as far south as the band allows.
      if (match.build(PLAYER, StructureKind.SoundingSpire, WEST_NODE.x, WEST_NODE.y + 200)) {
        third = true;
      }
      return;
    }
    const wanted = options.thirdVoice === true ? 3 : 2;
    if (!home && standing >= wanted && options.stayInIt !== true) {
      home = true;
      for (const eid of byTag.values()) match.orderMove(PLAYER, eid, HOME.x, HOME.y);
    }
    void tick;
  };
}

let closedRun: Run | null = null;
const closed = (): Run => (closedRun ??= play(closeTheFifth()));

let openRun: Run | null = null;
const open = (): Run => (openRun ??= play(() => {}));

describe('the economy, as docs/mission-standing-wave.md §4 states it', () => {
  it('opens the works on two nodes and thirty over, and the crystal for three', () => {
    const map = missionMapById(CHORD_STANDING_WAVE.mapId)!;
    const match = new Match(map, { mission: CHORD_STANDING_WAVE, fauna: false, seed: 1 });
    let own: EchoSnapshot | undefined;
    while (own === undefined) own = match.update(STEP_MS)?.get(PLAYER);
    // 1,530 at 00:00 and a nodule a second from the Bastion after it, so the
    // first snapshot — twelve ticks in — carries a fifth of one more.
    assert.equal(Math.floor(own.nodules), 1530, '§4: 1,530 nodules');
    assert.equal(
      own.crystal,
      3 * (SPIRE.crystalCost ?? 0),
      '§3, §13: three Spires of crystal, since nothing here cuts any'
    );
    assert.equal(2 * SPIRE.cost, 1500, '§4: two nodes are paid for at 00:00');
    assert.equal(
      (SPIRE.cost - (1530 - 2 * SPIRE.cost)) / 60,
      12,
      '§4: a third costs twelve minutes of stipend at one a second'
    );
  });
});

describe('the build path, as §8 and §13 found it', () => {
  it('refuses a site with no hull beside it, and takes one the works have reached', () => {
    const map = missionMapById(CHORD_STANDING_WAVE.mapId)!;
    const match = new Match(map, { mission: CHORD_STANDING_WAVE, fauna: false, seed: 1 });
    let own: EchoSnapshot | undefined;
    while (own === undefined) own = match.update(STEP_MS)?.get(PLAYER);
    // Inside the Bastion's build radius, with every hull a kilometre north of it.
    assert.equal(
      match.build(PLAYER, StructureKind.SoundingSpire, WEST_NODE.x, WEST_NODE.y),
      false,
      '§8: a line laid from a Gallery nobody left is the breach'
    );
    const corvette = own.units.find((u) => Math.hypot(u.x - 2870, u.y - 310) < 1)!;
    match.orderMove(PLAYER, corvette.id, WEST_WORKS.x, WEST_WORKS.y);
    for (let i = 0; i < 20 * SIM.TICK_HZ; i++) match.update(STEP_MS);
    assert.equal(match.build(PLAYER, StructureKind.SoundingSpire, WEST_NODE.x, WEST_NODE.y), true);
    for (let i = 0; i < SIM.TICK_HZ; i++) own = match.update(STEP_MS)?.get(PLAYER) ?? own;
    const node = own!.structures.find((s) => s.kind === StructureKind.SoundingSpire)!;
    assert.equal(node.depth, 1700, "§13: on the defile's floor, not at 600 m above its rim");
  });
});

describe('the Fifth, closed', () => {
  it('reads the odd node as one voice, once, and the pair as the interval held', () => {
    const run = closed();
    const kalliso = run.spoken.filter((line) => line.speaker.startsWith('Voice Ren Kalliso'));
    assert.equal(kalliso.length, 1, '§12: once, on the first node completing');
    const sull = run.spoken.filter((line) => line.speaker.startsWith('Choirmaster Ivane Sull'));
    assert.ok(
      sull.some((line) => line.text.startsWith('There. That is the Fifth')),
      '§12: Sull, at the pairing'
    );
    const interval = run.view?.objectives.find((o) => o.id === 'the-interval');
    assert.equal(interval?.status, ObjectiveStatus.Met);
    assert.equal(interval?.text, 'The interval is held. The Fifth carries at two.');
  });

  it('turns the column for the Seam the tick the corridor stands, and closes when the works are north of it', () => {
    const run = closed();
    assert.ok(
      run.spoken.some((line) => line.text.startsWith('Corridor stands at two')),
      '§12: Adze, reading the corridor'
    );
    assert.equal(run.outcome, MissionOutcome.Complete);
    assert.ok(run.epilogue.startsWith('It is closed.'), '§8: the Fifth is closed');
    assert.ok(run.epilogue.endsWith('Go and be dry.'), '§12: every ending but the last');
    assert.ok(run.resolvedAtTick < T(18), '§9: if the works came home first, she read it then');
    assert.ok(
      run.domeY > 3000,
      `§6: the column went back the way it came (dome at y=${run.domeY.toFixed(0)})`
    );
    assert.ok(
      run.lines.some((line) => line.startsWith('Two was the order')),
      "§8: the third voice's unmet reading, beneath the result"
    );
    assert.ok(
      run.lines.some((line) => line.startsWith('Six went and six are back')),
      '§8: untouched'
    );
    assert.equal(run.survivors, 6);
  });
});

describe('the Fifth, open', () => {
  it('walks the column into the Gallery by 17:30 and reads a canyon at 18:00', () => {
    const run = open();
    assert.equal(run.outcome, MissionOutcome.Lost);
    assert.equal(run.resolvedAtTick, T(18), '§9: the close, on the clock');
    assert.ok(run.epilogue.startsWith('Then it is a canyon'), '§8: the Fifth is open');
    assert.ok(!run.epilogue.endsWith('Go and be dry.'), '§12: withheld from the last');
    assert.ok(
      !run.spoken.some((line) => line.text.startsWith('Corridor stands')),
      'Adze read no corridor, because there was none'
    );
    assert.ok(
      run.spoken.some((line) => line.text.startsWith('Route is filed')),
      '§9, 03:00 — the column states what it heard'
    );
    assert.ok(
      run.domeY < 500 || Number.isNaN(run.domeY),
      `§9, 17:30: the column is at the North Gallery (dome at y=${run.domeY.toFixed(0)})`
    );
    const interval = run.view?.objectives.find((o) => o.id === 'the-interval');
    assert.equal(interval?.text, 'The Fifth is open. No voice stands.');
    assert.equal(interval?.status, ObjectiveStatus.Pending);
  });
});

describe('the third voice, and the works left standing in it', () => {
  it('reads the stipend spent when a third node stands at the close', () => {
    const run = play(closeTheFifth({ thirdVoice: true }));
    assert.equal(run.outcome, MissionOutcome.Complete);
    assert.ok(
      run.lines.some((line) => line.startsWith('You waited for the stipend')),
      '§8: the third voice'
    );
    assert.ok(
      run.resolvedAtTick > T(12, 30),
      '§9: nothing marks 12:30, and the third could not be sited before it'
    );
  });

  it('reads closed and not clear when the corridor stands and the six do not come north', () => {
    const run = play(closeTheFifth({ stayInIt: true }));
    assert.equal(run.outcome, MissionOutcome.Partial);
    assert.equal(run.resolvedAtTick, T(18), '§8: read at the close, and not before');
    assert.ok(run.epilogue.startsWith('You built it and then you stood in it'), '§8');
    const withdrawal = run.view?.objectives.find((o) => o.id === 'the-withdrawal');
    assert.notEqual(
      withdrawal?.status,
      ObjectiveStatus.Met,
      'the withdrawal is a sentence about now'
    );
  });
});

describe('the interval, sour', () => {
  it('reads sour while a paired node is under forty per cent of its hull', () => {
    const map = missionMapById(CHORD_STANDING_WAVE.mapId)!;
    const match = new Match(map, { mission: CHORD_STANDING_WAVE, fauna: false, seed: 1 });
    const drive = closeTheFifth({ stayInIt: true });
    const party = CHORD_STANDING_WAVE.parties.find((p) => p.slot === PLAYER)!;
    const byTag = new Map<string, number>();
    let view: MissionView | null = null;
    let own: EchoSnapshot | undefined;
    for (let tick = 0; tick <= T(4); tick++) {
      own = match.update(STEP_MS)?.get(PLAYER) ?? own;
      if (own !== undefined && byTag.size === 0) {
        for (const unit of party.units) {
          const seated = own.units.find((u) => Math.hypot(u.x - unit.x, u.y - unit.y) < 1);
          if (seated !== undefined) byTag.set(unit.tag, seated.id);
        }
      }
      if (byTag.size === party.units.length) drive(match, tick, byTag, own);
      view = match.takeMissionView() ?? view;
    }
    const interval = view?.objectives.find((o) => o.id === 'the-interval');
    assert.equal(interval?.text, 'The interval is held. The Fifth carries at two.');
    const node = own!.structures.find((s) => s.kind === StructureKind.SoundingSpire)!;
    Health.hp[node.id] = node.maxHp * (STANDING_WAVE.DETUNE_HP_FRACTION - 0.05);
    for (let i = 0; i < SIM.TICK_HZ; i++) {
      match.update(STEP_MS);
      view = match.takeMissionView() ?? view;
    }
    const sour = view?.objectives.find((o) => o.id === 'the-interval');
    assert.equal(
      sour?.text,
      'The interval is sour.',
      '§8: told by hearing it go flat, not by a bar'
    );
    assert.equal(sour?.status, ObjectiveStatus.Met, 'sour is still held');
  });
});

describe('the party, as §3 fields it', () => {
  it('is six Knight hulls, a Bastion, and a column of seven that never hears a Cantor', () => {
    const works = CHORD_STANDING_WAVE.parties.find((p) => p.slot === PLAYER)!;
    assert.equal(works.faction, Faction.Hadron);
    assert.equal(works.units.length, 6);
    assert.equal(works.structures?.length, 1);
    assert.equal(works.structures?.[0]?.kind, StructureKind.Bastion);
    const column = CHORD_STANDING_WAVE.parties.find((p) => p.slot === COLUMN)!;
    assert.equal(column.faction, Faction.Directorate);
    assert.equal(column.units.length, 7, '§5: 1 Cantor, 4 Abyssal Submersibles, 2 Cruisers');
    assert.ok(!CHORD_STANDING_WAVE.locks.some((lock) => lock.ability === 'construction'));
    assert.ok(CHORD_STANDING_WAVE.locks.some((lock) => lock.ability === 'activeSonar'));
    assert.equal(CHORD_STANDING_WAVE.sigBudget, 70, '§4: the construction site');
  });
});
