/**
 * The Ledger 5 — docs/mission-tolerance.md, and the two rules its choice
 * stands on. (`missionTolerance.test.ts` is the tolerance *predicate*'s
 * suite; this file is the mission named after the same procedure.)
 *
 * - **The roof is the ledger** (§4, §11): the root aperture's water admits
 *   nothing above 1,900 m, so the 2D delivery region is depth-honest — and
 *   the crush arithmetic the writ reads out is the shared model's own figure.
 * - **The ground stands where it stood** (§11, #1145): drawn in shapes, every
 *   seat, sound, marker, pack and mission region is pinned to the region,
 *   floor and ceiling under it, with the throat the works' only door.
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
  Biome,
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
import { Terrain, shapeContains } from '../src/sim/terrain.ts';
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
    berths: { used: 0, granted: 0 },
    refits: [],
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

describe('the ground the writ stands on — §11, drawn in shapes (#1145)', () => {
  // Asked of the cell, never the point: a point inside a polygon's bounds can
  // stand in a cell the polygon does not claim (terrain.ts, `shapeContains`).
  const map = missionMapById(LEDGER_TOLERANCE.mapId)!;
  const terrain = terrainFor(map);
  const cols = map.widthM / map.cellM;
  const rows = map.heightM / map.cellM;
  const centre = (m: number) => (Math.floor(m / map.cellM) + 0.5) * map.cellM;
  const cellKey = (x: number, y: number) =>
    `${Math.floor(x / map.cellM)},${Math.floor(y / map.cellM)}`;
  /** The region that painted the cell under a point: the last whose shape holds its centre. */
  const regionAt = (x: number, y: number): string => {
    let name = '';
    for (const region of map.regions) {
      if (shapeContains(region, centre(x), centre(y))) name = region.note!.split(' — ')[0]!;
    }
    return name;
  };
  const groundAt = (x: number, y: number) => [
    regionAt(x, y),
    terrain.floorAt(x, y),
    terrain.ceilingAt(x, y),
  ];
  const missionRegion = (id: string) => LEDGER_TOLERANCE.regions.find((r) => r.id === id)!;
  /** Every cell centre a mission region holds. */
  const cellsOf = (id: string): [number, number][] => {
    const cells: [number, number][] = [];
    for (let y = map.cellM / 2; y < map.heightM; y += map.cellM) {
      for (let x = map.cellM / 2; x < map.widthM; x += map.cellM) {
        if (shapeContains(missionRegion(id), x, y)) cells.push([x, y]);
      }
    }
    return cells;
  };
  const column = LEDGER_TOLERANCE.parties.find((party) => party.slot === 0)!;
  const holding = LEDGER_TOLERANCE.parties.find((party) => party.slot === 2)!;
  const emitter = (tag: string) => holding.emitters!.find((e) => e.tag === tag)!;
  const marker = (id: string) => LEDGER_TOLERANCE.markers.find((m) => m.id === id)!;
  /** Each pack's authored legs, from where the mission last put it, at its spawn depth. */
  type Point = { x: number; y: number };
  const packLegs: { tag: string; from: Point; to: Point; depthM: number }[] = [];
  {
    const at = new Map<string, Point & { depthM: number }>();
    for (const beat of LEDGER_TOLERANCE.beats) {
      if (beat.kind !== 'creature') continue;
      if (beat.spawnAt) at.set(beat.tag, beat.spawnAt);
      const from = at.get(beat.tag)!;
      packLegs.push({ tag: beat.tag, from, to: beat.driveTo, depthM: from.depthM });
      at.set(beat.tag, { x: beat.driveTo.x, y: beat.driveTo.y, depthM: from.depthM });
    }
  }
  /** Cells reached from a point at one depth, cell by cell through water that admits it. */
  const reach = (x: number, y: number, depth: number): Set<string> => {
    const start = [Math.floor(x / map.cellM), Math.floor(y / map.cellM)] as const;
    const seen = new Set([`${start[0]},${start[1]}`]);
    const queue: (readonly [number, number])[] = [start];
    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      for (const [nx, ny] of [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ] as const) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (seen.has(`${nx},${ny}`) || !terrain.admitsCell(nx, ny, depth)) continue;
        seen.add(`${nx},${ny}`);
        queue.push([nx, ny]);
      }
    }
    return seen;
  };

  it("seats the column, its Foundry and the packs' last press on the Works Yard", () => {
    const spawn = map.spawns[0]!;
    const lastPress = packLegs.filter((leg) => leg.to.y < 1250);
    assert.equal(lastPress.length, 2, 'the last press grew or shrank');
    for (const [what, x, y] of [
      ['the spawn', spawn.x, spawn.y],
      ['its Foundry', spawn.x + spawn.foundryOffsetX, spawn.y + spawn.foundryOffsetY],
      ['the yard marker', marker('yard').x, marker('yard').y],
      ...column.units.map((unit) => [unit.tag, unit.x, unit.y] as const),
      ...lastPress.map((leg) => [`${leg.tag}'s last press`, leg.to.x, leg.to.y] as const),
    ] as const) {
      assert.deepEqual(groundAt(x, y), ['The Works Yard', 1200, 0], `${what} left the yard`);
    }
    for (const unit of column.units) {
      assert.ok(terrain.admits(unit.x, unit.y, unit.depthM), `${unit.tag} is seated in rock`);
    }
  });

  it('pours on exactly the cells the Works Yard paints', () => {
    for (let y = map.cellM / 2; y < map.heightM; y += map.cellM) {
      for (let x = map.cellM / 2; x < map.widthM; x += map.cellM) {
        assert.equal(
          shapeContains(missionRegion('the-yard'), x, y),
          regionAt(x, y) === 'The Works Yard',
          `the cell at ${x},${y} is on one of the two and not the other`
        );
      }
    }
  });

  it("keeps Vayle's alarm and frame on the Upper Berths, above the layer", () => {
    const alarm = emitter('breach-alarm');
    assert.deepEqual(groundAt(alarm.x, alarm.y), ['The Upper Berths', 1050, 0]);
    assert.ok(terrain.admits(alarm.x, alarm.y, alarm.depthM), 'the alarm is in rock');
    const section = marker('section');
    assert.deepEqual(groundAt(section.x, section.y), ['The Upper Berths', 1050, 0]);
    const frame = cellsOf('section-frame');
    assert.equal(frame.length, 6, "the frame's region changed size");
    for (const [x, y] of frame) {
      assert.deepEqual(groundAt(x, y), ['The Upper Berths', 1050, 0], `the frame at ${x},${y}`);
    }
  });

  it('keeps the complaint in the throat and the root aperture under the roof', () => {
    const complaint = emitter('root-complaint');
    assert.deepEqual(groundAt(complaint.x, complaint.y), ['The Throat', 2100, 0]);
    assert.ok(
      terrain.admits(complaint.x, complaint.y, complaint.depthM),
      'the complaint is in rock'
    );
    assert.deepEqual(groundAt(marker('root').x, marker('root').y), ['The Underworks', 2100, 1900]);
    const root = cellsOf('root-aperture');
    assert.equal(root.length, 2, "the aperture's region changed size");
    for (const [x, y] of root) {
      assert.deepEqual(groundAt(x, y), ['The Underworks', 2100, 1900], `the root at ${x},${y}`);
      // Directly under the throat: the aperture is the throat's two columns, a row down.
      assert.deepEqual(groundAt(x, y - map.cellM), ['The Throat', 2100, 0]);
    }
  });

  it('keeps both packs on the open Face, and every leg in Thermal Vein water that admits it', () => {
    assert.equal(packLegs.length, 8, "the packs' authored legs grew or shrank");
    for (const leg of packLegs) {
      if (leg.to.y >= 1250) {
        assert.deepEqual(groundAt(leg.from.x, leg.from.y), ['The Face', 1300, 0], leg.tag);
        assert.deepEqual(groundAt(leg.to.x, leg.to.y), ['The Face', 1300, 0], leg.tag);
      }
      for (let i = 0; i <= 100; i++) {
        const x = leg.from.x + ((leg.to.x - leg.from.x) * i) / 100;
        const y = leg.from.y + ((leg.to.y - leg.from.y) * i) / 100;
        assert.equal(terrain.biomeAt(x, y), Biome.ThermalVein, `${leg.tag} crosses ${x},${y}`);
        assert.ok(terrain.admits(x, y, leg.depthM), `${leg.tag} meets rock at ${x},${y}`);
      }
    }
  });

  it('opens the works only through the throat, and reaches the frame under no roof', () => {
    // §4: reaching the root means the dive, through the throat. A door into
    // the works is a face between a roofed cell and unroofed water deep
    // enough to meet the roofed band; there are exactly two, the throat's.
    const mid = (c: number) => (c + 0.5) * map.cellM;
    const doors: string[] = [];
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        if (terrain.ceilingAt(mid(cx), mid(cy)) === 0) continue;
        for (const [nx, ny] of [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ] as const) {
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          if (terrain.ceilingAt(mid(nx), mid(ny)) > 0) continue;
          if (terrain.floorAt(mid(nx), mid(ny)) < 1900) continue;
          doors.push(`${regionAt(mid(nx), mid(ny))} ${nx},${ny}`);
        }
      }
    }
    assert.deepEqual(doors.sort(), ['The Throat 7,6', 'The Throat 8,6']);
    // The root: reached from the throat at the delivery depth, shut above the roof.
    const deep = reach(2000, 1625, 2000);
    for (const [x, y] of cellsOf('root-aperture')) {
      assert.ok(deep.has(cellKey(x, y)), `the root at ${x},${y} is cut off`);
      assert.ok(!terrain.admits(x, y, 1850), 'the roof stands at nineteen hundred, not the line');
    }
    // §4: Vayle's frame is whole water all the way, reached from the yard at
    // the alarm's depth through no roofed cell.
    const spawn = map.spawns[0]!;
    const shallow = reach(spawn.x, spawn.y, emitter('breach-alarm').depthM);
    for (const [x, y] of cellsOf('section-frame')) {
      assert.ok(shallow.has(cellKey(x, y)), `the frame at ${x},${y} is cut off`);
    }
    for (const at of shallow) {
      const [cx, cy] = at.split(',').map(Number) as [number, number];
      assert.equal(terrain.ceilingAt(mid(cx), mid(cy)), 0, `a roof over the haul at ${at}`);
    }
  });

  it('narrows the open face to two rows under the frame, and leaves four east of the yard', () => {
    const faceRows = (x: number) => {
      let count = 0;
      for (let y = map.cellM / 2; y < map.heightM; y += map.cellM) {
        if (regionAt(x, y) === 'The Face') count++;
      }
      return count;
    };
    const frame = missionRegion('section-frame');
    for (let x = frame.x + map.cellM / 2; x < frame.x + frame.widthM; x += map.cellM) {
      assert.equal(faceRows(x), 2, `the face under the frame at x=${x}`);
    }
    for (let x = 2500 + map.cellM / 2; x < map.widthM; x += map.cellM) {
      assert.equal(faceRows(x), 4, `the face east of the yard at x=${x}`);
    }
  });

  it("keeps the overhang's new lip off every line from the column to what it hears", () => {
    // The lip took five cells of Face at PF 0.45 and made them Coral Ruins at
    // 0.80. No line from where the column is seated, a marker or a mission
    // region's cell to the alarm, the complaint or a pack's authored position
    // crosses Coral Ruins north of the throat's southern edge, at 1,750 m.
    const from: (readonly [number, number])[] = [
      [map.spawns[0]!.x, map.spawns[0]!.y],
      ...column.units.map((unit) => [unit.x, unit.y] as const),
      ...LEDGER_TOLERANCE.markers.map((m) => [m.x, m.y] as const),
      ...['the-yard', 'section-frame', 'root-aperture'].flatMap(cellsOf),
    ];
    const to: (readonly [number, number])[] = [
      ...holding.emitters!.map((e) => [e.x, e.y] as const),
      ...packLegs.flatMap((leg) => [
        [leg.from.x, leg.from.y] as const,
        [leg.to.x, leg.to.y] as const,
      ]),
    ];
    for (const [ax, ay] of from) {
      for (const [bx, by] of to) {
        for (let i = 0; i <= 200; i++) {
          const x = ax + ((bx - ax) * i) / 200;
          const y = ay + ((by - ay) * i) / 200;
          if (y >= 1750) continue;
          assert.notEqual(
            terrain.biomeAt(x, y),
            Biome.CoralRuins,
            `the line ${ax},${ay} to ${bx},${by} crosses the lip at ${x},${y}`
          );
        }
      }
    }
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
          when: { kind: 'deliver', account: 'nodules', amount: 50 },
          choiceGroup: 'the-choice',
        },
        {
          kind: 'say',
          speaker: 'The record',
          text: 'The second entered.',
          note: '',
          when: { kind: 'deliver', account: 'nodules', amount: 50 },
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
          predicate: { kind: 'deliver', account: 'nodules', amount: 50 },
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
